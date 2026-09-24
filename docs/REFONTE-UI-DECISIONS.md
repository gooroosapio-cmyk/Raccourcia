# Refonte UI/UX — décisions de cadrage (23 septembre 2026)

Réponses au questionnaire de cadrage, à relire avant chaque lot. Elles
priment sur le rapport et la trame lorsqu'elles les précisent.

| #   | Sujet                             | Décision                                                                                                                                                                                                                                                                                |
| --- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Préproduction                     | Fonctionnement actuel : branche de travail, tests, répétition sur base jetable, lots appliqués par les workflows Catalogue et Visuels. Pas de second projet Supabase.                                                                                                                   |
| 2   | Visuels                           | Les visuels déposés **avant le 18 septembre 2026** sont effacés d'office — lignes et fichiers : ce sont les visuels injectés par script (360 px de large en médiane, formats hétérogènes). Ceux déposés depuis sont conservés ; ceux qui ne sont pas en 4:5 sont signalés, pas effacés. |
| 3   | Sélection gratuite                | Proposer 3 commandes gratuites en Rédaction et 3 en Assistants, soumises à validation avant publication. Les 21 gratuites Visuels restent.                                                                                                                                              |
| 4   | « J'aime »                        | Suppression de la table et du compteur, après sauvegarde.                                                                                                                                                                                                                               |
| 5   | Favoris de tags et de collections | Fonction retirée ; les favoris existants sont sauvegardés puis supprimés. Le cœur ne porte que sur les commandes.                                                                                                                                                                       |
| 6   | Payload canonique                 | Une variante unique et neutre dans la structure existante ; historique des versions conservé ; variantes redondantes archivées puis retirées après validation.                                                                                                                          |
| 7   | Cartes archivées                  | Pas de réconciliation des payloads maintenant ; elle se fera à la restauration éventuelle d'une carte.                                                                                                                                                                                  |
| 8   | Paiement                          | Pas d'environnement de test Chariow : l'écran d'offre est rhabillé, le flux de paiement n'est pas touché ; protocole de test manuel fourni.                                                                                                                                             |
| 9   | Icônes                            | Harmonisation du système d'icônes existant (trait uniforme, grille 24 × 24).                                                                                                                                                                                                            |
| 10  | Rythme                            | Cinq lots, chacun en pull request avec captures et tests, fusionné après accord.                                                                                                                                                                                                        |

## Effacement des visuels (décision 2) — état

Inventaire du 23 septembre : 1064 lignes. 690 datées du 7 au 13 septembre,
374 du 20 au 22 ; aucune entre les deux. La date en base et l'horodatage du
nom de fichier concordent sur les 1064.

Impact : 101 cartes publiées et 244 brouillons perdent tous leurs visuels ;
186 cartes publiées gardent leur avant/après.

Signalés sans être effacés (`data/visuels/signalements-2026-09-23.json`) :
l'« avant » de `/1920sportrait`, dont la ligne existe sans fichier, et deux
« après » récents hors 4:5 (`/cutoutreality`, `/satireline`).

Déroulé, chaque étape vérifiant la précédente :

1. workflow Visuels, `purge-apercu` — lit et compte ;
2. workflow Visuels, `purge-sauvegarde` — copie dans le compartiment privé
   `prompt-media-sauvegarde` ;
3. workflow Catalogue, `supabase/seed/purge-visuels-avant-18` — efface les
   lignes du manifeste ;
4. workflow Visuels, `purge-fichiers` — efface les fichiers, refuse si une
   ligne les référence encore ou si la sauvegarde est incomplète.

Retour arrière : `purge-restauration`, puis le lot
`supabase/seed/purge-visuels-avant-18-restauration`. Répété sur base jetable
par `tests/db/repetition-purge-visuels.sh`.

### Exécuté le 23 septembre 2026

| Étape                        | Run           | Résultat                                                               |
| ---------------------------- | ------------- | ---------------------------------------------------------------------- |
| `purge-apercu`               | Visuels #13   | 690 fichiers présents, 690 référencés, 0 en sauvegarde                 |
| `purge-sauvegarde`           | Visuels #14   | 690 fichiers copiés et vérifiés dans `prompt-media-sauvegarde` (privé) |
| lot `purge-visuels-avant-18` | Catalogue #42 | 374 lignes restantes, 0 antérieure au seuil                            |
| `purge-fichiers`             | Visuels #15   | 378 fichiers publics restants                                          |

Après coup : 188 cartes publiées portent un visuel, 112 sont « sans visuel »
(101 issues de l'effacement, 11 qui n'en avaient déjà pas). L'écart de 4
entre fichiers (378) et lignes (374) préexistait : 5 fichiers orphelins et
l'« avant » manquant de `/1920sportrait`.

La sauvegarde reste en place tant que la refonte n'est pas validée ; la
supprimer est une décision à part.

## Payload canonique (décision 6) — état

Préparé dans le lot 1, **pas encore appliqué en production** : la migration
et le lot partent à la fusion de la pull request du lot 1, avec le code de
la console qui édite la variante universelle.

- Migration `20260924090000_payload_unique.sql` : `variante_servie` sert la
  variante « universel » quand elle existe, quelle que soit l'IA demandée ;
  sinon l'ancien chemin par IA (cartes archivées, jamais réconciliées —
  décision 7). L'IA demandée reste inscrite au journal des copies.
- Lot `supabase/seed/payload-unique` : crée le fournisseur « universel »
  (inactif, absent de toute liste d'IA) et pose une variante universelle sur
  les 642 cartes V5. Il lève si une carte portait deux textes différents
  selon l'IA ; relevé en production le 24 septembre : aucune.
- Répétition `tests/db/repetition-payload-unique.sh` : 642 cartes, deux
  passes sans doublon, et pour chacune des trois IA le texte servi est
  identique à celui qu'elle recevait avant.
- Les variantes par IA restent publiées jusqu'au retrait du sélecteur
  (lot 2), puis s'archivent ; leur suppression suit la validation.

Ordre d'application : fusion → migration (workflow Catalogue ou console
Supabase) → lot `supabase/seed/payload-unique` (workflow Catalogue).

## Commandes offertes (décision 3A) — appliqué le 24 septembre 2026

Six commandes offertes, validées : `/message`, `/reecrire`, `/synthese`
(Rédaction) ; `/mode-organisation`, `/mode-socrate`, `/mode-entretien`
(Assistants). Lot `supabase/seed/offerts-redaction-assistants`, visé par
`card_id`, appliqué par le workflow Catalogue et vérifié en base.

## « J'aime » et rayons épinglés (décisions 4B et 5A) — état

Le cœur devient le favori privé d'une commande ; le « j'aime » public, son
compteur et les épingles de tags et de collections disparaissent de
l'interface. **Pas encore appliqué en base** : la migration
`20260924100000_retrait_jaime_et_rayons_epingles.sql` part après le
déploiement du code, qui ne lit plus ces tables.

| Donnée               | Lignes en production (24/09) | Devenir                                     |
| -------------------- | ---------------------------- | ------------------------------------------- |
| `prompt_likes`       | 29 (un membre)               | sauvegardée dans `sauvegarde`, puis retirée |
| `prompts.like_count` | 29 commandes à 1             | sauvegardé, puis colonne retirée            |
| `tag_favorites`      | 2 (un membre)                | sauvegardée, puis retirée                   |
| `category_favorites` | 0                            | retirée                                     |
| `favorites`          | 23 (deux membres)            | **conservée** : c'est le cœur               |

Le schéma `sauvegarde` n'est lisible ni par `anon` ni par `authenticated`.
Répétition : `tests/db/repetition-retrait-jaime.sh`.
