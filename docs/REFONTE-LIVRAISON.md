# Refonte UX/UI — ce qui est livré

Périmètre : la forme et le fonctionnement. **Aucun visuel produit, remplacé ou
supprimé. Aucun payload modifié. Aucune commande supprimée. Aucun identifiant,
alias ou relation touché.**

---

## 1. Changements réalisés

### Le défaut de conception corrigé

« Personnes / Objets / Modes IA » posait deux questions dans une seule liste :
les deux premiers sont des **sujets**, le troisième un **format**. Choisir
« Modes IA » répondait à une autre question que celle posée, et demander « les
modes qui portent sur une personne » était impossible.

Deux dimensions séparées désormais — Format et Sujet — plus l'accès derrière
« Plus d'options », avec le nombre de filtres actifs et « Tout effacer ».

Le sujet vient de `witness_type`, ce que le catalogue demande de fournir :
235 commandes attendent une personne, 194 un objet. Donnée du classeur, pas
règle inventée. Ce qui n'entre dans aucun sujet — un brief, un lieu — reste
visible et ne disparaît que si un sujet est demandé.

### Aperçus manquants

517 commandes publiées attendent leur visuel. Le cadre gris à icône barrée
donnait l'impression d'un chargement échoué. Il devient une composition :
teinte du rayon, deux arcs discrets, « Aperçu bientôt disponible ». Rien n'y
ressemble à une photographie, donc rien ne promet un résultat que la commande
ne rend pas.

**Le cadre garde le ratio du futur média** : le jour où l'image est déposée,
elle prend exactement sa place et la grille ne bouge pas d'un pixel. Le
chargement des visuels ne demandera pas de refaire l'interface.

### Découverte

« À découvrir » tourne d'un rayon à l'autre au lieu de prendre les cartes dans
l'ordre du catalogue — le rayon le plus fourni occupait presque toute la
rangée. Modes IA et Parcours comptent chacun pour un rayon : on les rencontre
au troisième geste au lieu d'être relégués en fin de rangée.

### Responsive

Une colonne sous 360 px : à 320 px, deux colonnes donnaient des cartes de
136 px où le titre se coupait au deuxième mot. La marge de page passe de 20 à
16 px sous ce seuil.

Les Modes IA et les Parcours prennent la rangée entière — leur promesse se lit,
elle ne se devine pas, et sur une demi-largeur l'aperçu se coupait au troisième
mot.

### Vocabulaire

| Avant                                      | Après                                                                                             |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| « Conditionnez la conversation »           | « Donnez un rôle à votre IA »                                                                     |
| « Prompt copié. Collez-le dans votre IA. » | « Prompt copié. » / mode : « Mode copié. Collez-le dans votre IA, puis décrivez votre objectif. » |
| « Aucune idée de ce genre »                | « Aucun résultat. Essayez un autre mot ou retirez un filtre. »                                    |
| « Membres » (filtre)                       | « Accès à vie »                                                                                   |

---

## 2. Fichiers modifiés — 27 fichiers, +1053 / −107

**Écrans** : accueil, favoris, page d'une famille, coquille membre.
**Cartes** : image, texte, grille, vignette, bouton de copie.
**Fiche** : panneau de détail, choix du moteur.
**Découverte** : accueil éditorial, console, icône de rayon, galerie, filtres.
**Bibliothèque** : rayons dépliables, façons d'utiliser.
**Logique** : `feed.ts`, `queries.ts`, `sujets.ts`, `types.ts`.
**Nouveaux** : `components/feed/filtres-galerie.tsx`, `lib/catalog/sujets.ts`.

---

## 3. Migrations

**Aucune dans cette vague.** La dernière en date — `20260916140000`, colonne
`univers` et recherche élargie — est déjà appliquée en production et portée
dans le workflow de déploiement.

---

## 4. Tests effectués

| Suite                                  | Résultat                                       |
| -------------------------------------- | ---------------------------------------------- |
| `npm run verify`                       | 86 tests unitaires, format, lint, types — vert |
| `./tests/db/run.sh`                    | 29 fichiers d'intégration — vert               |
| `npm ci` depuis zéro + `npm run build` | 26 routes, aucune erreur                       |
| Revue de sécurité du diff              | aucune vulnérabilité HIGH ou MEDIUM            |

12 tests nouveaux : séparation format/sujet, rotation de la vitrine.

Deux tests d'intégration ont été **vérifiés en les faisant volontairement
échouer**, pour s'assurer qu'ils ne passent pas en silence.

---

## 5. Sécurité — vérifié, pas supposé

- Les 14 actions serveur d'administration appellent `assertAdmin()` — 14 sur 14.
- `app/admin/layout.tsx` appelle `requireAdmin()`.
- Seules `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL` et
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` atteignent le navigateur. Aucune clé
  `service_role`, aucun secret de paiement.
- Le contenu premium ne sort que par `/api/resolve-prompt`, qui réauthentifie,
  limite le débit, puis délègue à `resolve_prompt`.
- `toggleFavorite` valide par Zod, exige une session, écrit `user_id: user.id`.
- Modèle de droits vérifié en base de test : RLS sur les lignes, `anon` détient
  le SELECT de table. `prompt_versions` reste inaccessible.
- Les filtres déplacés côté client ne portent **aucune** décision
  d'autorisation : ils masquent des données déjà envoyées.

Aucune modification du système d'authentification ou de paiement.

---

## 6. Accessibilité

- Fenêtres : `role="dialog"`, `aria-modal`, `aria-labelledby`, piégeage du
  focus, fermeture par Échap, focus rendu à l'ouvrant.
- `:focus-visible` global, contour de 2 px sur la couleur de marque.
- 32 usages de `touch-target` (44 × 44 px).
- Aucune action réservée au survol : les seuls effets de survol sont des
  changements de couleur décoratifs, et le zoom de vignette est sous
  `motion-safe:`.
- `prefers-reduced-motion` neutralise animations et transitions globalement.
- Six cadres à ratio fixe : aucun saut de mise en page à l'arrivée des images.
- Un rayon replié **sort du DOM** plutôt que d'être masqué : ses tuiles ne
  chargent pas d'images et ne sont pas atteintes par la tabulation.

---

## 7. Performance — mesure avant / après

Total du JavaScript client, tous fragments confondus :

|                 | Poids                   |
| --------------- | ----------------------- |
| Avant (`main`)  | 1 513 Ko                |
| Après (branche) | 1 527 Ko                |
| Écart           | **+14 Ko, soit +0,9 %** |

Aucune dépendance ajoutée. Les filtres utilisent des `<select>` natifs plutôt
qu'une bibliothèque. Les animations portent sur l'opacité et la transformation.
Images hors écran en `lazy`, quatre premières vignettes prioritaires.

---

## 8. Limites restantes

- ~~Capacités et exemple de première demande des Modes IA~~ : **levé.** Le lot
  Moteur V3 les a apportés pour les 82 modes ; ils sont affichés (§10 ci-dessous).
- ~~Livrables de 8 parcours sur 28~~ : **levé.** Les 28 parcours annoncent
  désormais une liste de livrables vérifiable.
- **20 mentions légales** affichent « à compléter » en production.
- **Offre** : prix, prix de référence, inclusion des nouveautés et limite
  d'appareils restent à confirmer.
- **Panneau d'administration** (§14) : non commencé. C'est le plus gros
  chantier restant.
- **Système de design formalisé** (§4) : variables partiellement en place, pas
  encore une échelle complète.

---

## 9. Volontairement reporté à la phase visuelle

- L'association des médias aux commandes.
- Les rôles de médias — couverture, image témoin, résultat, avant/après,
  exemples — avec texte alternatif, point focal et ordre. La structure sera
  posée sans qu'aucune donnée ne soit inventée.
- Les payloads : ~~615 cartes sur 692 n'en ont pas~~ — **levé** par le lot
  Moteur V3, les 692 commandes ont leur texte.

---

## 10. Fiches des Modes IA et des Parcours guidés

Le lot Moteur V3 a mis en base sept champs de texte par commande — ce qu'elle
fait, ce qu'elle rend, par quoi elle commence, ce qu'elle refuse, comment on
l'arrête. Ils servaient à construire le prompt et n'étaient affichés nulle
part. Les fiches de Mode IA et de Parcours les lisent maintenant.

**Ce qui change.** Les trois genres avaient la même fiche : un mode affichait
une section « À fournir » vide, puisqu'il ne demande aucune photo, et un
parcours annonçait « plusieurs étapes » sans jamais dire combien.

- **Mode IA** — ce qu'il sait faire, quand l'activer, _la question qu'il posera
  en premier, mot pour mot_, ce qu'il rendra, ce qu'il ne fera pas, et comment
  le mettre en pause ou en sortir.
- **Parcours guidé** — la **liste numérotée des livrables avec leur format**
  (« 1. Vue globale nettoyée · 4:5 »), ce qu'il faut préparer, sa méthode, ce
  qu'il refuse, les mêmes jalons de sortie.
- **Cartes de parcours** — le nombre de livrables s'affiche sous le titre, sur
  la carte pleine largeur. « 2 livrables » ou « 7 livrables » décide seul si
  l'on commence maintenant ou plus tard.
- **Bouton de copie** — « Copier le parcours », et « Parcours copié. Collez-le
  dans votre IA, puis suivez les étapes. »
- **Page publique partagée** — même corps de fiche : un lien vers un parcours
  ne montrait presque rien.

**Aucun chiffre n'est estimé.** Le nombre de livrables vient de la liste
réellement lue et n'est affiché que s'il concorde avec le nombre annoncé dans
la même phrase du catalogue. Quand un texte ne se laisse pas découper, la fiche
affiche la phrase telle qu'elle est écrite. Vérifié sur les 110 modes et
parcours du catalogue : 28 parcours sur 28 annoncent un compte vérifiable, 110
sur 110 annoncent leur première question et leurs jalons de sortie.

**Poids.** Les sept champs ne voyagent que pour les modes et les parcours : les
embarquer pour les 582 commandes image, qui ne les affichent pas, aurait ajouté
25 Ko à chaque palier de galerie. JS client 1 563 833 → 1 570 553 octets
(+ 6 720, + 0,43 %), aucune dépendance ajoutée.
