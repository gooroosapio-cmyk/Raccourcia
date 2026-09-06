'use client';

/**
 * Dernier filet : une erreur qui echappe a toutes les autres couches.
 * Il remplace le document entier, il porte donc ses propres balises.
 */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          padding: '1.25rem',
          background: '#F7F9FC',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          color: '#111827',
        }}
      >
        <div style={{ maxWidth: 360, textAlign: 'center' }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#0B163F' }}>
            Une erreur est survenue.
          </p>
          <p style={{ marginTop: 4, fontSize: 13, color: '#667085' }}>
            Réessayez dans un instant, vos données sont intactes.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 16,
              height: 44,
              padding: '0 16px',
              borderRadius: 10,
              border: 'none',
              background: '#1463FF',
              color: '#fff',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
