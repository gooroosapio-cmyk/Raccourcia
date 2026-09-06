import { getLegalInfo, getPublicConfig } from '@/lib/catalog/queries';
import { LegalPage, LegalSection, LegalValue } from '@/components/legal/legal-page';

export const metadata = { title: 'Conditions générales' };

export default async function ConditionsPage() {
  const [info, config] = await Promise.all([getLegalInfo(), getPublicConfig()]);
  const prix =
    config.price.current > 0
      ? `${new Intl.NumberFormat('fr-FR').format(config.price.current)} ${config.price.currency}`
      : null;

  return (
    <LegalPage
      titre="Conditions générales d’utilisation et de vente"
      intro="Ces conditions regissent l acces au service RaccourcIA et, le cas echeant, l achat d un acces."
      miseAJour={info.legal_updated_at}
    >
      <LegalSection titre="Objet et acceptation">
        <p>
          RaccourcIA met a disposition une bibliotheque de commandes, descriptions, conseils d usage
          et ressources associees pour des outils d intelligence artificielle.
        </p>
        <p>
          En creant un compte, en utilisant le service ou en passant commande, l’utilisateur accepte
          les presentes conditions. En cas de desaccord, il ne doit pas utiliser le service.
        </p>
      </LegalSection>

      <LegalSection titre="Accès au service">
        <p>
          L acces requiert un equipement compatible, une connexion Internet et un compte. RaccourcIA
          peut faire evoluer, maintenir, suspendre temporairement ou securiser le service. Les
          fonctionnalites, limites et tarifs applicables sont ceux affiches au moment de la
          commande.
        </p>
      </LegalSection>

      <LegalSection titre="Compte utilisateur">
        <p>
          L utilisateur fournit des informations exactes, protege ses identifiants et est
          responsable des activites realisees depuis son compte. Il ne peut partager, ceder, louer,
          revendre ou donner acces a son compte, sauf autorisation ecrite de RaccourcIA.
        </p>
        <p>
          Un meme compte peut etre utilise sur un nombre limite d appareils, indique dans l espace
          Compte. RaccourcIA peut suspendre un compte en cas de fraude, d atteinte a la securite ou
          de non-respect des presentes conditions.
        </p>
      </LegalSection>

      <LegalSection titre="Règles d’usage">
        <p>
          Il est interdit de copier massivement le catalogue, de contourner les limitations
          techniques, d’extraire la base de données, de redistribuer les commandes comme produit
          concurrent, de porter atteinte aux droits de tiers, de tenter d’acceder a des comptes ou
          systemes non autorises, ou d’utiliser le service a des fins illicites.
        </p>
      </LegalSection>

      <LegalSection titre="Outils d’intelligence artificielle tiers">
        <p>
          Les commandes peuvent etre utilisees avec des services tiers tels que ChatGPT, Claude ou
          Gemini. RaccourcIA n est ni affilie, ni responsable de leurs disponibilites, politiques,
          tarifs, resultats ou traitements de donnees.
        </p>
        <p>
          L’utilisateur doit respecter leurs conditions et ne fournir que les données qu’il est
          autorise a partager. Les résultats générés doivent être verifies avant tout usage
          professionnel, juridique, medical, financier, publicitaire ou de publication.
        </p>
      </LegalSection>

      <LegalSection titre="Prix, commande et paiement">
        <p>
          {prix
            ? `L’accès à vie est propose au prix de ${prix}, en un paiement unique. Ce prix, la devise, les taxes éventuelles, le contenu et les modalités de paiement sont affichés avant validation.`
            : 'Lorsque des offres payantes sont proposées, leur prix, devise, taxes éventuelles, durée d’accès, contenu et modalités de paiement sont affichés avant validation.'}
        </p>
        <p>
          La commande devient ferme apres confirmation du paiement par{' '}
          <LegalValue info={info} cle="legal_payment_provider" fallback="prestataire de paiement" />
          . Une confirmation est adressée à l’adresse indiquée lors de l’achat.
        </p>
        <p>
          Les accès à vie sont personnels, non transférables et ne donnent pas le droit de partager
          l’accès où le contenu du service.
        </p>
      </LegalSection>

      <LegalSection titre="Retractation, remboursements et accès numérique">
        <p>
          Lorsque la loi accordé un droit de rétractation, ses conditions d’exercice sont precisees
          avant commande. Si l’utilisateur demande l’exécution immediate d’un contenu ou service
          numérique, il reconnait, lorsque la loi le prevoit, perdre son droit de rétractation des
          le debut de l’exécution.
        </p>
        <p>
          Hors obligation legale ou erreur imputable a RaccourcIA, les remboursements sont regis par
          la politique suivante :{' '}
          <LegalValue info={info} cle="legal_refund_policy" fallback="regles de remboursement" />.
        </p>
      </LegalSection>

      <LegalSection titre="Propriete intellectuelle et licence">
        <p>
          Sous reserve du paiement integral des sommes dues, RaccourcIA accorde a l utilisateur une
          licence personnelle, non exclusive, non cessible et non sous-licenciable d utilisation des
          contenus du service pour ses besoins propres, pendant la duree de son acces.
        </p>
        <p>
          Cette licence n’autorise pas la revente, la publication en bibliothèque concurrente, la
          diffusion massive où la création d’un service dérivé à partir du catalogue.
        </p>
      </LegalSection>

      <LegalSection titre="Responsabilite">
        <p>
          Les contenus sont fournis a titre d assistance creative et informationnelle. RaccourcIA ne
          garantit pas un resultat precis, l originalite, l exactitude ou la conformite des contenus
          generes par une IA tierce.
        </p>
        <p>
          Dans la mesure autorisee par la loi, RaccourcIA ne repond pas des dommages indirects,
          perte de donnees, perte de chiffre d affaires ou prejudice resultant de l usage d un outil
          tiers. Rien ne limite les responsabilites qui ne peuvent legalement etre exclues.
        </p>
      </LegalSection>

      <LegalSection titre="Duree, résiliation et modifications">
        <p>
          Les conditions s’appliquent pendant toute l’utilisation du service. L’utilisateur peut
          cesser d’utiliser le service ou demander la suppression de son compte selon les modalités
          indiquees.
        </p>
        <p>
          RaccourcIA peut modifier les presentes conditions ; la version en vigueur est publiee sur
          le site. En cas de modification importante, les utilisateurs concernes seront informes par
          un moyen approprie.
        </p>
      </LegalSection>

      <LegalSection titre="Droit applicable et règlement des litiges">
        <p>
          Les presentes sont regies par le droit ivoirien, sous reserve des protections imperatives
          applicables au consommateur. Les parties chercheront d abord une solution amiable via{' '}
          <LegalValue info={info} cle="legal_support_email" fallback="email support" />. A defaut,
          le litige relevé des juridictions compétentes selon les règles applicables.
        </p>
        <p className="text-[13px] text-[color:var(--color-muted)]">
          References reglementaires indicatives : loi ivoirienne n 2013-450 du 19 juin 2013 relative
          a la protection des donnees a caractere personnel ; loi n 2013-546 du 30 juillet 2013
          relative aux transactions electroniques.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
