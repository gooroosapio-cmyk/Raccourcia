import { NextResponse, type NextRequest } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';
import { fingerprintLicense } from '@/lib/access/license';
import { chariowLicenseEvent, chariowSaleEvent } from '@/lib/validation/chariow-schemas';
import {
  CHARIOW_SIGNATURE_HEADER,
  deriveExternalEventId,
  scrubChariowPayload,
  verifyChariowSignature,
} from '@/lib/webhooks/chariow';
import type { Json } from '@/lib/supabase/database.types';

/**
 * Point d'entree unique des evenements Chariow.
 *
 * La vente (successful.sale) et la licence (license.issued) arrivent comme
 * deux notifications independantes, sans ordre garanti : le traitement est
 * commutatif dans les deux sens, porte par process_chariow_sale et
 * process_chariow_license (migration 20260905070000). Cette route ne fait
 * que verifier la signature, journaliser le brut de facon idempotente, puis
 * appeler la fonction adaptee.
 *
 * Idempotence : chaque evenement est insere dans webhook_events avant tout
 * traitement, avec un identifiant stable (deriveExternalEventId). Un rejeu
 * exact ne retraite jamais rien, il rencontre juste la contrainte unique.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  if (!verifyChariowSignature(rawBody, request.headers.get(CHARIOW_SIGNATURE_HEADER))) {
    return NextResponse.json({ error: 'signature_invalide' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'json_invalide' }, { status: 400 });
  }

  if (typeof payload !== 'object' || payload === null || !('event' in payload)) {
    return NextResponse.json({ error: 'evenement_invalide' }, { status: 400 });
  }

  const record = payload as Record<string, unknown>;
  const admin = createAdminClient();

  const { data: eventRow, error: insertError } = await admin
    .from('webhook_events')
    .insert({
      source: 'chariow',
      external_event_id: deriveExternalEventId(record, rawBody),
      event_type: typeof record.event === 'string' ? record.event : null,
      signature_valid: true,
      payload: scrubChariowPayload(record) as Json,
    })
    .select('id')
    .single();

  if (insertError) {
    // 23505 : deja recu et journalise. On repond 200 sans retraiter : c'est
    // l'idempotence garantie par la contrainte unique (source, external_event_id).
    if (insertError.code === '23505') {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: 'journalisation_impossible' }, { status: 500 });
  }

  try {
    if (record.event === 'successful.sale') {
      const parsed = chariowSaleEvent.safeParse(record);
      if (!parsed.success) throw new Error(`vente_invalide: ${parsed.error.message}`);
      await admin.rpc('process_chariow_sale', {
        p_payload: parsed.data as unknown as Json,
        p_source_event_id: eventRow.id,
      });
    } else if (record.event === 'license.issued') {
      const parsed = chariowLicenseEvent.safeParse(record);
      if (!parsed.success) throw new Error(`licence_invalide: ${parsed.error.message}`);
      await admin.rpc('process_chariow_license', {
        p_payload: parsed.data as unknown as Json,
        p_source_event_id: eventRow.id,
        p_license_fingerprint: fingerprintLicense(parsed.data.license.key),
      });
    }
    // Un type d'evenement non gere aujourd'hui est journalise puis marque
    // traite : rien a en faire pour l'instant, mais rien n'est perdu.

    await admin
      .from('webhook_events')
      .update({ processed_at: new Date().toISOString() })
      .eq('id', eventRow.id);
  } catch (error) {
    await admin
      .from('webhook_events')
      .update({ processing_error: error instanceof Error ? error.message : 'erreur inconnue' })
      .eq('id', eventRow.id);
    // 500 : Chariow doit retenter la livraison.
    return NextResponse.json({ error: 'traitement_impossible' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
