/**
 * Bouton WhatsApp flottant.
 *
 * Il se pose au-dessus de la barre d'achat, jamais dessus : deux pastilles
 * superposees au coin de l'ecran font rater les deux. Sur telephone il
 * remonte donc de la hauteur de cette barre ; sur grand ecran, ou la barre
 * n'existe pas, il redescend.
 *
 * Le numero est celui de l'editeur, ecrit au format international sans
 * espaces : c'est ce qu'attend `wa.me`.
 */
export function BoutonWhatsApp({ numero }: { numero: string }) {
  const lisible = numero.replace(
    /^(\d{3})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/,
    '+$1 $2 $3 $4 $5 $6',
  );

  return (
    <a
      href={`https://wa.me/${numero}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Écrire sur WhatsApp au ${lisible}`}
      className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] shadow-[0_6px_20px_rgb(11_22_63_/_0.25)] transition-transform duration-[var(--duration-fast)] hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-brand)] active:scale-95 sm:bottom-6"
    >
      <svg width="28" height="28" viewBox="0 0 24 24" fill="white" aria-hidden="true">
        <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.08-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.03-.53-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.38-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.18-1.42-.07-.13-.27-.2-.57-.35Z" />
        <path d="M12.04 2.5c-5.23 0-9.48 4.25-9.49 9.48 0 1.67.44 3.3 1.27 4.74L2.5 21.5l4.9-1.28a9.45 9.45 0 0 0 4.63 1.18h.01c5.23 0 9.48-4.25 9.48-9.48a9.42 9.42 0 0 0-2.77-6.71 9.42 9.42 0 0 0-6.71-2.78Zm0 17.35h-.01a7.87 7.87 0 0 1-4-1.1l-.29-.17-2.98.78.8-2.9-.19-.3a7.86 7.86 0 0 1-1.2-4.19c0-4.35 3.53-7.88 7.88-7.88 2.1 0 4.08.82 5.57 2.31a7.83 7.83 0 0 1 2.3 5.58c0 4.35-3.53 7.87-7.88 7.87Z" />
      </svg>
    </a>
  );
}
