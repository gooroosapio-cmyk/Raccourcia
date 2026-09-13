# Audit — refonte des familles Image (V6)

Six rayons image deviennent quatre. Etat verifie sur une replique complete du
catalogue, migrations et lots rejoues depuis zero, bascules appliquees deux
fois. Les vingt-cinq fichiers d'integration passent.

## Le nouveau decoupage

| Ordre | Famille                     | Reference   | Vient de                                                                        |
| ----- | --------------------------- | ----------- | ------------------------------------------------------------------------------- |
| 1     | Portraits et effets visuels | `IMG-V6-01` | `IMG-V5-03` Portrait, mode et identite · `IMG-V5-05` Creation, styles et effets |
| 2     | Publicite et marques        | `IMG-V6-02` | `IMG-V5-02` Publicite et contenu commercial · `IMG-V5-01` Produit et marque     |
| 3     | Technique et information    | `IMG-V6-03` | `IMG-V5-06` Technique, information et visualisation                             |
| 4     | Architecture et lieux       | `IMG-V6-04` | `IMG-V5-04` Lieux, architecture et interieur                                    |

L'ordre porte une intention : on entre dans le domaine image par le portrait,
pas par la vue technique. Il est verifie par un test, pas seulement pose dans
un `sort_order` — un ordre recopie de travers ne se voit pas en base, il se
voit a l'ecran, trop tard.

Le decoupage s'est fait en deux temps. Six rayons sont d'abord devenus trois ;
« Techniques et lieux » melangeait alors deux intentions qui ne se cherchent
pas ensemble — expliquer une structure en image, projeter l'amenagement d'un
lieu — et s'est dedoublee. Quatre rayons tiennent aussi en deux colonnes, et
aucun ne reste seul sur sa ligne.

La seconde bascule sait d'ou vient chaque commande grace a la sauvegarde
posee par la premiere : ce sont celles qui etaient rangees dans `IMG-V5-04`,
ou dans la famille V3 equivalente, qui rejoignent le rayon architecture.

Les six familles de la V3 (`IMG-01` a `IMG-06`), que la bascule V5 avait
laissees derriere elle avec quelques commandes encore publiees, rejoignent le
meme decoupage : `IMG-03`, `IMG-04` et `IMG-06` vont aux portraits et effets,
`IMG-02` a la publicite, `IMG-01` a la technique, `IMG-05` a l'architecture.

## Ce qui est archive, et ce qui ne l'est pas

Rien n'est supprime. Les anciennes familles image passent en archive une fois
videes et gardent le rangement d'origine de centaines de commandes :
republier l'une d'elles est la seule facon de defaire un regroupement qui
deplairait.

Les commandes, elles, **ne sont pas archivees quand elles peuvent etre
rangees**. C'est un ecart assume avec la demande initiale : archiver une
commande publiee la retire du catalogue que des membres ont achete. Seule une
commande image active rangee dans une famille du catalogue que le nouveau
decoupage ne reprend pas part en archive — et le controle de sortie refuse la
transaction si le compte d'avant ne se retrouve pas entierement dans le
compte d'apres.

Le statut ne bouge pas au deplacement : une commande en brouillon le reste,
elle change seulement de rayon.

## La sauvegarde

`prompts_avant_image_v6` garde, pour chaque commande image, son identifiant,
sa commande, sa famille et son statut d'avant. Elle sert deux fois : aux
controles, et au dedoublement de la famille technique, qui s'en sert pour
retrouver les commandes de lieux. Trois controles s'appuient dessus :

- aucune ligne n'a disparu de `prompts` ;
- aucune commande publiee avant la bascule ne s'est retrouvee retiree ;
- actives + archivees retrouvent exactement le compte d'avant.

## Ce que l'ecran montre

- **Le choix du domaine image ouvre quatre familles**, en grand, sur
  l'Accueil nu — « Que voulez-vous creer ? ». Elles tombent en deux colonnes
  pleines ; quand un domaine en compte un nombre impair, le dernier bouton
  prend toute la ligne plutot que de rester a moitie large.
- **La puce « Toutes » disparait.** Les familles d'un domaine tiennent a
  l'ecran : une puce de plus qui ne filtre rien ajoutait une decision sans en
  resoudre aucune. Retoucher la famille choisie la deselectionne — c'est le
  geste qu'on tente naturellement pour revenir a tout le domaine.
- **Aucune famille n'est ecrite dans le frontend.** Les puces et les
  propositions viennent des familles publiees : la refonte ne demande aucun
  redeploiement pour etre visible.

## Ce que l'administration montre

- **Les anciennes familles quittent la liste principale** : desactivees et
  vides, elles sont repliees dans « Anciennes categories », avec le rappel
  que rien n'est supprime et que les reactiver les remet dans la liste. Une
  categorie desactivee qui porte encore un raccourci reste en pleine vue —
  c'est par elle qu'on le retrouve.
- **Les listes deroulantes ne proposent plus un rayon mort** : le filtre de
  la liste des raccourcis, le formulaire de creation et celui d'identite
  passent tous par `categoriesDeRangement`.

## Les visuels ne passent plus par l'optimiseur de l'hebergeur

Les vignettes des commandes deposees en dernier ne s'affichaient pas. La
cause n'etait ni le depot ni le stockage — le fichier repond en 200, c'est un
JPEG valide de 182 ko — mais l'optimiseur d'images de l'hebergeur, qui
s'interposait : son quota mensuel epuise, il repond
`OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED` a toute taille qu'il n'avait pas
deja en cache. Les visuels anciens, deja optimises, continuaient de
s'afficher ; les nouveaux, jamais.

Le stockage sait redimensionner lui-meme, sans quota et derriere son propre
cache. Les adresses des visuels passent donc par `render/image/public` avec
la largeur utile (`lib/media/url.ts`), et les images du catalogue sont
marquees `unoptimized` : l'optimiseur de l'hebergeur n'est plus sur le
chemin.

Effet mesure sur une vignette : **182 ko a 34 ko**. `resize=contain` est
indispensable — sans lui le stockage recadre en remplissant, et une largeur
seule ecrase l'image au lieu de la reduire.

## Application en production

Workflow **Catalogue**, dossier `refonte-image-v6`, avec `raccourcia` en
confirmation et `basculer` dans le second champ. Il applique les deux
migrations puis les deux bascules, et refuse de se terminer en succes si le
second mot manque.

Les migrations sont idempotentes, les bascules rejouables : au second passage
tout est deja en place et plus rien ne bouge.
