# Audit — refonte des familles Image (V6)

Six rayons image deviennent trois. Etat verifie sur une replique complete du
catalogue, migrations et lots rejoues depuis zero, refonte appliquee deux
fois. Les vingt-cinq fichiers d'integration passent.

## Le nouveau decoupage

| Ordre | Famille                     | Reference   | Vient de                                                                              |
| ----- | --------------------------- | ----------- | ------------------------------------------------------------------------------------- |
| 1     | Portraits et effets visuels | `IMG-V6-01` | `IMG-V5-03` Portrait, mode et identite · `IMG-V5-05` Creation, styles et effets       |
| 2     | Publicite et marques        | `IMG-V6-02` | `IMG-V5-02` Publicite et contenu commercial · `IMG-V5-01` Produit et marque           |
| 3     | Techniques et lieux         | `IMG-V6-03` | `IMG-V5-06` Technique, information et visualisation · `IMG-V5-04` Lieux, architecture |

L'ordre porte une intention : on entre dans le domaine image par le portrait,
pas par la vue technique. Il est verifie par un test, pas seulement pose dans
un `sort_order` — un ordre recopie de travers ne se voit pas en base, il se
voit a l'ecran, trop tard.

Les six familles de la V3 (`IMG-01` a `IMG-06`), que la bascule V5 avait
laissees derriere elle avec quelques commandes encore publiees, rejoignent le
meme decoupage : `IMG-03`, `IMG-04` et `IMG-06` vont aux portraits et effets,
`IMG-02` a la publicite, `IMG-01` et `IMG-05` aux techniques et lieux.

## Ce qui est archive, et ce qui ne l'est pas

Rien n'est supprime. Les douze anciennes familles image passent en archive
une fois videes et gardent le rangement d'origine de centaines de commandes :
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
sa commande, sa famille et son statut d'avant. Trois controles s'appuient
dessus :

- aucune ligne n'a disparu de `prompts` ;
- aucune commande publiee avant la bascule ne s'est retrouvee retiree ;
- actives + archivees retrouvent exactement le compte d'avant.

## Ce que l'ecran montre

- **Le choix du domaine image ouvre trois familles**, en grand, sur l'Accueil
  nu — « Que voulez-vous creer ? ». Un nombre impair de familles ne laisse
  plus un dernier bouton demi-large en bas de grille.
- **La puce « Toutes » disparait.** Trois familles tiennent a l'ecran : une
  quatrieme puce qui ne filtre rien ajoutait une decision sans en resoudre
  aucune. Retoucher la famille choisie la deselectionne — c'est le geste
  qu'on tente naturellement pour revenir a tout le domaine.
- **Aucune famille n'est ecrite dans le frontend.** Les puces et les
  propositions viennent des familles publiees : la refonte ne demande aucun
  redeploiement pour etre visible.

## Ce que l'administration montre

- **Les anciennes familles quittent la liste principale** : desactivees et
  vides, elles sont repliees dans « Anciennes categories », avec le rappel
  que rien n'est supprime et que les reactiver les remet en place. Une
  categorie desactivee qui porte encore un raccourci reste en pleine vue —
  c'est par elle qu'on le retrouve.
- **Les listes deroulantes ne proposent plus un rayon mort** : le filtre de
  la liste des raccourcis, le formulaire de creation et celui d'identite
  passent tous par `categoriesDeRangement`.

## Application en production

Workflow **Catalogue**, dossier `refonte-image-v6`, avec `raccourcia` en
confirmation et `basculer` dans le second champ. Il applique la migration
puis la bascule, et refuse de se terminer en succes si le second mot manque.

La migration est idempotente, la bascule rejouable : au second passage tout
est deja en place et plus rien ne bouge.
