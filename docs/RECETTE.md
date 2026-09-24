# Recette et mise en ligne de la refonte UI (lot 5)

Pull request : #58, lots 1 à 4. Ce document dit dans quel ordre mettre en
ligne, comment revenir en arrière, et ce qu’il faut vérifier à la main — ce
que ni les tests ni la répétition ne peuvent prouver sans un vrai téléphone
et de vrais comptes.

## 1. Ce qui est déjà prouvé

| Contrôle                                                                                                                                                | Résultat                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `npm run verify` (format, lint, typecheck, 218 tests unitaires)                                                                                         | OK                                  |
| `./tests/db/run.sh` (49 tests d’intégration : droits, copie, favoris, payload)                                                                          | OK                                  |
| `./tests/db/repetition-mise-en-ligne.sh` : séquence complète puis retour arrière, sur l’état reconstitué de la production, chaque étape jouée deux fois | OK                                  |
| `next build`                                                                                                                                            | OK                                  |
| Parcours visiteur à 320, 360, 390, 768 et 1440 px (build de production, base réelle)                                                                    | aucun débordement, aucune marque IA |
| `/admin` sans compte                                                                                                                                    | redirection vers la connexion (307) |

Ce que la répétition établit, avec les données de production reconstituées
(642 cartes V5, 29 « j’aime », 23 favoris, 2 tags épinglés) :

- après les migrations d’avant déploiement, **l’ancien code sert le même
  texte** et lit toujours les « j’aime » ;
- après les lots, **les 349 cartes publiées servent leur texte**, identique
  à celui que chaque IA recevait, et la copie s’inscrit ;
- après le retrait, **les favoris sont intacts**, les « j’aime » sauvegardés ;
- après le retour arrière, **tout est rendu à l’identique** : 29 « j’aime »
  et leurs compteurs, 2 tags épinglés, 1 926 variantes par IA republiées,
  et l’ancien code sert le même texte pour chaque IA.

## 2. État de la production au 24 septembre (lecture seule)

Rien des lots 1 à 4 n’est appliqué en base, sauf les six commandes
offertes. `lire_prompt`, `variante_servie`, le fournisseur « universel » et
le schéma `sauvegarde` n’existent pas encore ; les tables des « j’aime » et
des épingles sont en place (29 et 2 lignes). Les préconditions des
migrations sont réunies.

### Étape 1 appliquée le 24 septembre 2026

Les migrations `20260924090000_payload_unique` et
`20260924110000_copie_en_deux_temps` sont en production (appliquées par
Claude, avec votre accord ; corps de fonctions identiques au dépôt,
commentaires d’en-tête omis). Contrôles faits juste après :

- les 1 047 couples (carte publiée, IA) servent **exactement la même
  variante** qu’avant : 0 écart ;
- droits : `lire_prompt` réservé aux comptes, `lire_prompt_offert` et
  `enregistrer_copie` ouverts aux visiteurs, `variante_servie` fermée aux
  clients ;
- en visiteur, `lire_prompt_offert` rend pour `/message` le texte que
  l’ancien code sert (même empreinte, même version) et refuse une commande
  réservée (`NOT_AVAILABLE`).

### Étapes 2 à 5 appliquées le 24 septembre 2026

- **Étape 2** : pull request #58 fusionnée (`228c1f4`), déployée sur
  www.raccourcia.com. La copie d’une commande offerte en visiteur rend le
  texte complet, sans aucun `{{…}}`.
- **Étape 3** (workflow **Catalogue**, lot `payload-unique`) : 642 cartes V5
  portent leur texte unique et sa version courante ; les 1 047 couples
  (carte publiée, IA) servent toujours le même texte : 0 écart.
- **Étape 4** (workflow **Catalogue**, lot `archiver-variantes-par-ia`) :
  1 926 variantes par IA archivées, leurs identifiants gardés dans
  `sauvegarde.variantes_archivees_20260924` (1 926 lignes). Aucune carte V5
  ne garde de variante par IA publiée ; chaque carte V5 sert son texte
  unique, quelle que soit l’IA indiquée ; aucune commande publiée sans
  texte.
- **Étape 5** (migration `20260924120000_retrait_jaime_et_rayons_epingles`,
  appliquée par Claude) : bilan relevé juste avant, 29 « j’aime » (29
  compteurs), 2 tags épinglés, 0 rayon épinglé. Après : les trois tables et
  la colonne `like_count` ont disparu ; `sauvegarde` en garde 29, 2, 0 et 29
  lignes, sans accès pour `anon` ni `authenticated` ; les 23 favoris sont
  intacts ; les sommaires de collections répondent. Aucune fonction ni vue
  ne dépendait d’autre chose que ce que la migration redéfinit.
- Pages vérifiées en ligne après l’étape 5 : accueil, Bibliothèque et une
  collection, Découvrir, Favoris, Profil, Offre, deux fiches : toutes
  répondent.

Reste l’étape 6, la recette manuelle ci-dessous.

## 3. Mise en ligne, dans cet ordre

| Étape                                     | Quoi                                                                                  | Comment                                                                    | Effet visible                                              |
| ----------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 1. Avant déploiement                      | migrations `20260924090000_payload_unique`, puis `20260924110000_copie_en_deux_temps` | éditeur SQL Supabase, ou Claude sur votre accord                           | aucun : l’ancien code fonctionne à l’identique             |
| 2. Fusion et déploiement                  | pull request #58                                                                      | GitHub puis votre hébergeur                                                | la nouvelle interface ; la copie passe par `lire_prompt`   |
| 3. Texte unique                           | lot `supabase/seed/payload-unique`                                                    | workflow **Catalogue**, dossier correspondant, confirmation « raccourcia » | aucun à l’écran : chaque carte sert le même texte qu’avant |
| 4. Archivage des variantes par IA         | lot `supabase/seed/archiver-variantes-par-ia`                                         | workflow **Catalogue**                                                     | aucun à l’écran                                            |
| 5. Retrait des « j’aime » et des épingles | migration `20260924120000_retrait_jaime_et_rayons_epingles`                           | éditeur SQL Supabase, ou Claude sur votre accord                           | aucun : le code déployé ne les lit plus                    |
| 6. Recette                                | la matrice ci-dessous                                                                 | vous, sur téléphone et ordinateur                                          | —                                                          |

**L’étape 1 doit précéder l’étape 2** : sans elle, « Copier le prompt » et
« Voir le prompt final » échouent. **L’étape 5 doit suivre l’étape 2** :
avant, l’interface en ligne lirait des tables supprimées.

Contrôle rapide après l’étape 4 (lecture seule) :

```sql
select count(*) as cartes_avec_texte_unique
from public.prompt_variants v
join public.ai_providers a on a.id = v.provider_id and a.key = 'universel'
where v.status = 'published';          -- attendu : 642
```

## 4. Retour arrière

1. Redéployer le code précédent. Les fonctions `resolve_prompt` et
   `resolve_free_prompt` sont restées en place ; elles servent le même texte.
2. **Les données ne se restaurent plus.** Le ménage des archives du
   24 septembre 2026 (lot `supabase/seed/menage-archives`) a supprimé les
   variantes par IA non citées au journal et les tables de sauvegarde : le
   lot `retour-arriere-refonte` n’a plus rien à rendre et n’est plus proposé
   par le workflow. L’ancien code redéployé servirait encore le texte
   unique, via `variante_servie`.
3. Les migrations des étapes 1 n’ont pas à être défaites : elles sont
   compatibles avec l’ancien code (répétition, étape 1).

## 5. Recette manuelle

Cochez chaque ligne. « Attendu » est la preuve à observer, pas une
impression.

### 5.1 Copie (iPhone Safari et Android Chrome)

| #   | Geste                                                                     | Attendu                                                                                |
| --- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| C1  | Visiteur : ouvrir `/r/email-e-mail-professionnel` (`/message`), copier    | « Prompt copié. Collez-le dans votre outil d’IA. » ; le collage donne le texte complet |
| C2  | Toucher deux fois très vite                                               | un seul message ; une seule ligne ajoutée dans `copy_events`                           |
| C3  | Remplir un champ, ouvrir « Voir le prompt final », copier, coller         | le texte collé est identique à l’aperçu, avec la valeur saisie ; aucun `{{…}}`         |
| C4  | Champ obligatoire vide, toucher « Copier le prompt »                      | message sous le champ, curseur dans le champ, rien n’est copié                         |
| C5  | Membre sans accès : commande réservée                                     | « Débloquer pour copier » ouvre l’offre ; aucun texte réservé ne s’affiche             |
| C6  | Membre avec accès : copier une commande Visuels, puis Profil › Historique | la commande apparaît dans l’historique                                                 |

### 5.2 Rôles

| #   | Rôle              | Vérifier                                                                                                     |
| --- | ----------------- | ------------------------------------------------------------------------------------------------------------ |
| R1  | Visiteur          | accueil, Bibliothèque, Découvrir, fiches offertes ; cœur → « Connectez-vous… » ; Favoris → invitation        |
| R2  | Compte sans accès | copie des 27 offertes ; cœur sur une offerte ; Favoris la retrouve ; « Historique » absent du Profil         |
| R3  | Accès à vie actif | toutes les commandes se copient ; Favoris, Historique ; pas d’invitation à acheter                           |
| R4  | Accès expiré      | sans objet aujourd’hui : l’offre est un accès à vie. Si une date d’expiration était posée, se comporte en R2 |
| R5  | Administrateur    | lien « Ouvrir l’administration » dans Profil ; console accessible ; URL `/admin` refusée à R1-R3             |

### 5.3 Contenus et parcours

| #   | Écran            | Vérifier                                                                                                                  |
| --- | ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| P1  | Accueil          | Visuels à la première visite ; choisir Rédaction, fermer, revenir : Rédaction ; recherche + « trois bibliothèques »       |
| P2  | Bibliothèque     | onglets d’univers ; collections avec nombre ; collection : « Gratuits », « Récentes »                                     |
| P3  | Fiche Visuels    | avant/après agrandissable ; consigne photo seulement si la commande part d’une image ; avertissement « modèles d’images » |
| P4  | Fiche Assistants | bulle dans la carte ; « À compléter » ; avertissement « Relisez avant utilisation »                                       |
| P5  | Découvrir        | titre → fiche ; #tag → résultats Visuels filtrés ; cœur et partage ; retour à la même image                               |
| P6  | Favoris          | cœur sur carte → présent dans Favoris ; retirer dans la fiche → retiré partout                                            |
| P7  | Profil           | univers d’accueil fixé : l’accueil s’ouvre dessus ; déconnexion effective (Favoris redemande la connexion)                |
| P8  | Offre            | prix et période configurés ; « J’ai déjà un accès » → activation ; « Continuer avec les commandes offertes »              |

### 5.4 Administration (R5)

| #   | Vérifier                                                                                                        |
| --- | --------------------------------------------------------------------------------------------------------------- |
| A1  | Mobile : menu compact, sept sections ; ordinateur : barre latérale                                              |
| A2  | Vue d’ensemble › Qualité › « Visuels sans visuel » ouvre la liste filtrée, même nombre                          |
| A3  | Cocher deux commandes : la barre apparaît, portée « 2 sélectionnés » ; « Sélectionner les N résultats filtrés » |
| A4  | Éditeur : quatre onglets ; modifier un champ puis cliquer « Catalogue » : confirmation demandée                 |
| A5  | Prompt unique : enregistrer une nouvelle version ; la fiche publique copie le nouveau texte                     |
| A6  | Médias : chiffres affichés ; un visuel déposé depuis l’éditeur apparaît « console » dans les derniers visuels   |

### 5.5 Paiement (décision 8B : pas d’environnement d’essai)

Le parcours de paiement n’a pas été modifié. Vérifier seulement qu’il est
toujours atteint et que rien ne s’active sans le serveur :

| #   | Geste                                                         | Attendu                                                                    |
| --- | ------------------------------------------------------------- | -------------------------------------------------------------------------- |
| $1  | Offre › « Accéder au catalogue complet »                      | la page d’achat Chariow habituelle, au prix configuré                      |
| $2  | Revenir sur l’URL de retour sans avoir payé                   | aucun accès n’est activé                                                   |
| $3  | Achat réel (si vous en faites un) puis « J’ai déjà un accès » | activation par la licence reçue ; Profil affiche « Votre accès est actif » |

### 5.6 Formats

Refaire C1, P1, P3 à 320 px, en paysage, avec le zoom du navigateur à 200 %
et le clavier ouvert dans « À compléter » : rien ne déborde, la barre
« Copier le prompt » reste visible au-dessus du clavier.

## 6. Défauts résiduels connus

- Favoris d’un visiteur non mémorisés sur l’appareil (le rapport les
  voudrait synchronisés à la connexion).
- Page de présentation non refaite : son illustration montre encore des
  marques IA.
- Import de médias en lot, réessai des seuls éléments en échec d’un geste
  groupé, alertes « champ introuvable » et « tags hors référentiel » : non
  livrés.
- Certaines images ne se chargent pas dans le navigateur du bac à sable de
  test (réseau) ; à confirmer sur un vrai téléphone (P3, P5).
