import { getLegalInfo } from '@/lib/catalog/queries';
import { LegalPage, LegalSection, LegalValue } from '@/components/legal/legal-page';

export const metadata = { title: 'Mentions légales' };

export default async function MentionsPage() {
  const info = await getLegalInfo();

  return (
    <LegalPage
      titre="Mentions légales"
      intro="Ces mentions encadrent l acces au site et au service RaccourcIA."
      miseAJour={info.legal_updated_at}
    >
      <LegalSection titre="Éditeur du service">
        <p>
          Le site RaccourcIA est edite par{' '}
          <LegalValue info={info} cle="legal_editor" fallback="raison sociale" />,{' '}
          <LegalValue info={info} cle="legal_editor_form" fallback="forme juridique" />, au capital
          de <LegalValue info={info} cle="legal_capital" fallback="montant du capital" />,
          immatricule au{' '}
          <LegalValue info={info} cle="legal_registration" fallback="RCCM ou immatriculation" />,
          dont le siege est situe{' '}
          <LegalValue info={info} cle="legal_address" fallback="adresse du siege" />.
        </p>
        <p>
          Representant legal :{' '}
          <LegalValue info={info} cle="legal_representative" fallback="nom et qualite" />. Contact :{' '}
          <LegalValue info={info} cle="legal_contact_email" fallback="email de contact" />.
        </p>
      </LegalSection>

      <LegalSection titre="Directeur de la publication">
        <p>
          Le directeur de la publication est{' '}
          <LegalValue info={info} cle="legal_publication_director" fallback="nom et fonction" />.
        </p>
      </LegalSection>

      <LegalSection titre="Hébergement">
        <p>
          Le service est heberge par{' '}
          <LegalValue info={info} cle="legal_host" fallback="nom de l hebergeur" />, situe{' '}
          <LegalValue info={info} cle="legal_host_address" fallback="adresse de l hebergeur" />.
          Contact : <LegalValue info={info} cle="legal_host_contact" fallback="contact" />.
        </p>
      </LegalSection>

      <LegalSection titre="Propriété intellectuelle">
        <p>
          La structure du site, ses textes, visuels, marques, logos, bases de données et elements
          graphiques sont proteges. Sauf autorisation ecrite prealable, toute reproduction,
          representation, extraction ou exploitation, totale ou partielle, est interdite.
        </p>
        <p>
          Les droits sur les contenus produits par des services tiers d’intelligence artificielle
          restent soumis aux conditions de ces services et aux droits éventuels de tiers.
        </p>
      </LegalSection>

      <LegalSection titre="Responsabilité">
        <p>
          RaccourcIA s efforce de maintenir des informations exactes et un service disponible, sans
          garantir l absence d erreur, d interruption ou l adequation a un besoin particulier.
        </p>
        <p>
          L’utilisateur reste seul responsable de l’usage des commandes, des résultats générés, des
          données qu’il fournit aux outils d’IA et du respect des droits de tiers.
        </p>
      </LegalSection>

      <LegalSection titre="Droit applicable et contact">
        <p>
          Sous reserve des regles imperatives applicables, les presentes mentions sont soumises au
          droit ivoirien. Pour toute demande :{' '}
          <LegalValue info={info} cle="legal_support_email" fallback="email de contact" />.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
