import { getLegalInfo } from '@/lib/catalog/queries';
import { LegalPage, LegalSection, LegalValue } from '@/components/legal/legal-page';

export const metadata = { title: 'Politique de confidentialite' };

export default async function ConfidentialitePage() {
  const info = await getLegalInfo();

  return (
    <LegalPage
      titre="Politique de confidentialité"
      intro="Cette politique explique comment RaccourcIA traite les donnees personnelles de ses utilisateurs. Reference : loi ivoirienne n 2013-450 du 19 juin 2013 relative a la protection des donnees a caractere personnel."
      miseAJour={info.legal_updated_at}
    >
      <LegalSection titre="Responsable du traitement">
        <p>
          Le responsable du traitement est{' '}
          <LegalValue info={info} cle="legal_editor" fallback="raison sociale" />, joignable a{' '}
          <LegalValue info={info} cle="legal_privacy_email" fallback="email confidentialite" />, à l
          adresse <LegalValue info={info} cle="legal_address" fallback="adresse" />.
        </p>
      </LegalSection>

      <LegalSection titre="Données collectées">
        <p>
          Selon l usage du service, RaccourcIA peut traiter : identite et coordonnees (nom, email) ;
          donnees de compte ; donnees de facturation et de paiement, traitees le cas echeant par le
          prestataire de paiement ; historique d acces et preferences ; demandes adressees au
          support ; donnees techniques (adresse IP, navigateur, journaux de securite).
        </p>
        <p>
          RaccourcIA ne demande pas de donnees sensibles. Ne renseignez pas de donnees
          confidentielles, de sante, de carte bancaire ou de tiers dans les commandes que vous
          utilisez.
        </p>
      </LegalSection>

      <LegalSection titre="Finalités et fondements">
        <p>
          Les données sont utilisees pour créer et gerer le compte, fournir l’accès au catalogue,
          securiser le service, repondre au support, gerer la facturation, produire des statistiques
          d’usage agregees, et envoyer des communications lorsque l’utilisateur y a consenti.
        </p>
        <p>
          Les traitements reposent, selon le cas, sur l’exécution du contrat, le respect d
          obligations légales, l’interet legitime de sécurité et de gestion du service, où le
          consentement.
        </p>
      </LegalSection>

      <LegalSection titre="Destinataires et sous-traitants">
        <p>
          Les donnees sont accessibles aux personnes habilitees de RaccourcIA et aux prestataires
          necessaires au fonctionnement du service (hebergement, authentification, paiement), dans
          la limite de leurs missions. Les donnees ne sont pas vendues.
        </p>
      </LegalSection>

      <LegalSection titre="Transferts internationaux">
        <p>
          Certains prestataires peuvent traiter des donnees hors de Cote d Ivoire. Dans ce cas,
          RaccourcIA met en place les garanties appropriees prevues par la reglementation applicable
          et informe l utilisateur lorsque cela est requis.
        </p>
      </LegalSection>

      <LegalSection titre="Durées de conservation">
        <p>
          Donnees de compte : pendant la duree du compte, puis{' '}
          <LegalValue info={info} cle="legal_retention_account" fallback="duree" />. Pieces et
          donnees de facturation : pendant la duree legale applicable. Demandes de support :{' '}
          <LegalValue info={info} cle="legal_retention_support" fallback="duree" />. Journaux de
          sécurité : <LegalValue info={info} cle="legal_retention_logs" fallback="duree" />.
        </p>
      </LegalSection>

      <LegalSection titre="Vos droits">
        <p>
          Vous pouvez demander l acces, la rectification, la mise a jour, l opposition, l effacement
          ou la limitation du traitement de vos donnees, dans les limites prevues par la loi.
          Adressez votre demande a{' '}
          <LegalValue info={info} cle="legal_privacy_email" fallback="email confidentialite" /> avec
          un justificatif d’identité si nécessaire.
        </p>
        <p>
          Vous pouvez également saisir l’Autorite de Protection des Données a Caractere Personnel
          compétente.
        </p>
      </LegalSection>

      <LegalSection titre="Sécurité">
        <p>
          RaccourcIA applique des mesures organisationnelles et techniques raisonnables : controle
          des acces, chiffrement en transit, limitation des habilitations, sauvegardes et
          surveillance de securite.
        </p>
        <p>
          Aucun système n’etant totalement sur, l’utilisateur doit également proteger ses
          identifiants et signaler toute utilisation suspecte.
        </p>
      </LegalSection>

      <LegalSection titre="Cookies">
        <p>
          RaccourcIA ne depose que les cookies strictement necessaires au fonctionnement du service
          : ceux qui maintiennent votre session connectee. Aucun cookie publicitaire ni de mesure d
          audience tierce n est utilise, et aucune banniere de consentement n est donc necessaire.
        </p>
        <p>
          Si cette situation evoluait, un bandeau de préférences serait mis en place avant tout
          dépôt de cookie soumis a consentement.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
