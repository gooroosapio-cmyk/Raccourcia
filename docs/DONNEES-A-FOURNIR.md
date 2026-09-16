# Ce qu'il me faut pour finir la refonte

Tout ce qui est listé ici manque **réellement** en base — je l'ai vérifié, pas
supposé. Rien n'est demandé deux fois : ce que le catalogue contient déjà
n'y figure pas.

Les deux premiers points bloquent des écrans décrits dans le brief. Le reste
améliore sans bloquer.

---

## 1. Modes IA — bloquant

**Fichier : `docs/a-fournir/modes-ia.csv`** (82 lignes, déjà pré-remplies).

Le brief demande que la carte et la fiche d'un mode montrent ses capacités et
un exemple de première demande. **Ces deux champs n'existent nulle part** :
0 sur 82. Je ne les invente pas.

| Colonne                     | Ce que c'est                      | Exemple                                                                         |
| --------------------------- | --------------------------------- | ------------------------------------------------------------------------------- |
| `A_REMPLIR_capacites`       | 2 à 4 capacités, séparées par `;` | `structurer un plan; repérer les dépendances; clarifier les prochaines actions` |
| `A_REMPLIR_exemple_demande` | une phrase à la première personne | `Je prépare le lancement de ma boutique en ligne.`                              |
| `facultatif_situations`     | 2 ou 3 situations adaptées        | `lancement produit; refonte d'offre`                                            |

Déjà en base et **non redemandé** : titre, description, entrée attendue,
sortie, étiquettes, mots-clés, SEO.

Si tu n'en remplis qu'un : **`capacites`**. C'est lui qui distingue deux modes
voisins sur une carte.

---

## 2. Parcours guidés — bloquant pour 8 sur 28

**Fichier : `docs/a-fournir/parcours-guides.csv`**.

20 parcours portent déjà leur liste de livrables dans leur description : le
nombre d'étapes se calcule, je n'ai rien à demander. **8 n'en ont pas** — la
colonne `livrables_deja_connus` est vide pour eux.

| Colonne                       | Ce que c'est                                        |
| ----------------------------- | --------------------------------------------------- |
| `A_REMPLIR_livrables_si_vide` | les livrables, séparés par `;`, dans l'ordre        |
| `facultatif_public_vise`      | à qui le parcours s'adresse                         |
| `facultatif_a_preparer`       | ce qu'il faut avoir sous la main avant de commencer |

Sans livrables, une fiche n'affichera pas de nombre d'étapes plutôt qu'un
chiffre faux.

---

## 3. L'offre — 4 réponses

Elles ne sont pas dans un fichier : ce sont des décisions, pas des données.

1. **Le prix courant et la devise.** La valeur de repli est `0`, ce qui
   n'affiche aucun prix. Si le prix est déjà dans la configuration, dis-le et
   je vérifie ; sinon donne-le.
2. **Un prix de référence barré existe-t-il vraiment ?** Le brief interdit
   d'en montrer un sans justification commerciale réelle. Si la réponse est
   non, je retire la mécanique.
3. **Les nouveautés futures sont-elles incluses dans l'accès à vie ?**
   Oui ou non. Je ne l'écrirai pas sans réponse.
4. **La limite d'appareils.** La valeur de repli est 3. Confirme ou corrige.

Et le texte exact de ce qui se passe **après le paiement** : ce que la
personne reçoit, où elle active son accès, en combien de temps.

---

## 4. Mentions légales — 20 champs vides en production

La page `/legal/mentions` affiche « à compléter » **vingt fois**. Je
n'inventerai ni raison sociale, ni adresse, ni hébergeur.

Raison sociale · forme juridique · capital · immatriculation · adresse ·
représentant légal · directeur de publication · hébergeur · adresse de
l'hébergeur · contact de l'hébergeur · e-mail de contact · e-mail
confidentialité · e-mail support · prestataire de paiement · politique de
remboursement · durée de conservation du compte · du support · des journaux ·
date de mise à jour.

---

## 5. Arbitrages produit — 4 décisions

Aucune donnée à fournir, seulement un choix.

1. **« Pack » ou « Parcours guidé » ?** Les deux désignent aujourd'hui la même
   chose. Le brief demande un seul terme public. Je garde les identifiants
   internes intacts quoi qu'il arrive.
2. **« Style et identité »** : le brief proposait « Looks & styles », que j'ai
   écarté parce que sa plus grosse collection est « Portrait pro » (36 photos
   d'identité professionnelle). Je garde, ou tu proposes un autre titre.
3. **Commandes de personnages** (Style Batman, Style Yoda…) : aucune commande
   du catalogue ne vise une franchise nommée aujourd'hui. Les créer est une
   décision éditoriale et juridique. Go ou pas.
4. **Ordre de la refonte du panneau d'administration** : c'est le plus gros
   chantier restant et il touche les écrans que tu utilises. Par quoi
   commencer.

---

## 6. Ce que je ne demande pas, et pourquoi

- **Les visuels.** Le brief l'interdit pendant cette phase. 517 commandes
  publiées attendent leur aperçu ; l'interface les accueille déjà sans
  dépendre d'eux.
- **Les payloads.** Le brief interdit d'y toucher. 615 cartes sur 692 n'en ont
  pas — c'est le plus gros chantier de contenu, mais il vient après.
- **Les rôles de médias** (couverture, témoin, résultat, avant/après,
  exemples). Je poserai la structure ; les associations viendront avec les
  visuels.
