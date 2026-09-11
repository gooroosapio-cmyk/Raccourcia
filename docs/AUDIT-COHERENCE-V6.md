# Audit de coherence — refonte V6

Etat verifie sur une replique complete du catalogue, migrations et lots
rejoues depuis zero, refonte appliquee deux fois.

## Ce que la refonte a change

|                                           |                                                          |
| ----------------------------------------- | -------------------------------------------------------- |
| Commandes refondues                       | 533 — le socle V5 (433) et les deux extensions (50 + 50) |
| Textes remplaces                          | 1 599, trois par commande, un par IA                     |
| Etiquette de la nouvelle version courante | `v6-payloads`                                            |
| Versions conservees en historique         | 3 063, dont les 1 599 remplacees                         |
| Empreintes sha256 verifiees               | 1 599 au classeur, 1 599 en base, aucune divergence      |

Aucune version n'est effacee. La precedente passe en `retired` et reste
lisible : un retour arriere est une mise a jour de deux colonnes, pas une
reimportation.

## Ce que la refonte n'a pas touche

Les lots ecrivent dans **une seule table**, `prompt_versions` : un `insert`
et un `update`, rien d'autre. Ils ne nomment ni `prompt_media`, ni
`prompt_questions`, ni `prompts`. La consigne du classeur — « ne pas
modifier les champs ni relations medias » — n'est donc pas seulement
respectee, elle est structurellement impossible a enfreindre.

Verifie par ailleurs :

- **872 questions sur 574 commandes**, identique avant et apres. Elles
  pendent a la commande et non a la version : creer une version ne les
  emporte pas.
- **Statuts inchangés** : les 100 commandes d'extension restent en
  brouillon, la refonte ne publie rien.
- **`prompt_versions` reste ferme au client** : aucun droit `SELECT` pour
  `anon` ni `authenticated`.

## Le bon texte a la bonne place

Trois controles independants, du plus fin au plus large :

1. Chaque lot recalcule le sha256 de chaque texte pose et le compare a celui
   du classeur. 1 599 sur 1 599.
2. Les 1 599 payloads portent en en-tete **leur propre** commande. Aucun ne
   cite la commande d'une autre fiche.
3. Une empreinte d'ensemble `md5(commande|moteur|sha256, triee)` vaut
   `1a1c0ac3fe243f3e5fe4685594686418`, la meme que celle calculee sur le
   classeur. Elle ne passerait pas si le texte de ChatGPT etait servi a
   Gemini.

L'empreinte du catalogue V5 (`5bb9c0ad…`) est conservee et porte desormais
sur les versions retirees : elle prouve que les anciens textes sont toujours
la, intacts, apres avoir ete remplaces.

## Ce que les cartes vont afficher

Les cartes portent le titre et non plus la commande.

- **252 commandes publiees et visibles**, 252 titres **distincts** : deux
  cartes ne peuvent pas porter la meme etiquette.
- Aucun titre vide, aucun qui ressemble a une commande, aucun sans
  majuscule.
- Longueurs : mediane 22 caracteres, p90 37, maximum 51.
- Les 533 titres du classeur correspondent **exactement** au `name` deja en
  base : le classeur confirme les donnees, il ne les change pas.
- Les 252 titres sont dans le champ de recherche : chercher « Rayon X »
  trouve la commande.

Le reglage typographique suit ces longueurs. A 15 px sur deux lignes, la
moitie des titres etait coupee — verifie en rendu reel a 360 px. A 14 px sur
trois lignes, ils tiennent entiers.

## Points restants, anterieurs a cette refonte

- **Onze commandes V2.1 encore publiees** hors refonte : `/adsocial`,
  `/storybrand`, `/manifesto`, `/storyad`, `/userstories`, `/featurebrief`,
  `/acceptancecriteria`, `/prdreview`, `/salesobjections`,
  `/discoverycall`, `/churnhypothesis`, `/invoicecheck`. La bascule ne peut
  pas les retirer tant que leur commande canonique n'est pas publiee. Elles
  gardent leurs textes V2.1 : coherent, mais elles ne beneficient pas de la
  refonte.
- Les trois tables de sauvegarde (`prompts_avant_v5`,
  `prompt_questions_avant_v5`, `prompts_avant_bascule_v5`) restent en place
  en attendant la recette.
