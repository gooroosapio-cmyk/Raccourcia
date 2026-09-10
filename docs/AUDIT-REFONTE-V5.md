# Audit de fonctionnement — refonte V5

Etat au terme des lots 2 a 7 et du lot 9. Le lot 8 (passe systematique
d'accessibilite et de performance) a ete saute a la demande ; les constats
d'accessibilite ci-dessous viennent de l'audit, pas de ce lot.

## 1. Ce qui est en production, ce qui ne l'est pas

| Lot | Contenu                                               | Applique en production  |
| --- | ----------------------------------------------------- | ----------------------- |
| 2   | Socle V5 : niveaux, presets, alias, 14 familles       | **Oui**                 |
| 3   | Import du catalogue V5 (433 commandes, 1299 payloads) | Non                     |
| 4   | Recherche par ancien nom, redirection des liens       | Non                     |
| 5   | Niveau d'execution sur la fiche et la carte           | Non (code deploye seul) |
| 6   | Choix de l'IA au moment de copier, fiche 2 colonnes   | Non (code deploye seul) |
| 7   | Modes d'une commande                                  | Non (code deploye seul) |

Les lots 5, 6 et 7 sont du code : deploye sans les donnees du lot 3, il ne
casse rien et n'affiche simplement rien de neuf (`level` nul, aucun alias).
Les lots 3 et 4 sont indissociables : le lot 4 rattrape les noms que le lot 3
fait disparaitre. **Les appliquer separement laisserait 146 raccourcis
introuvables entre les deux.**

## 2. Le point d'exploitation le plus important

L'import du lot 3 **ne deplace aucune commande dans les familles V5**. Il
depose le texte, les payloads, les questions et les alias, et s'arrete la.
L'etat qui en resulte est coherent et livrable : le contenu V5 servi dans la
taxonomie V2, treize familles visibles comme aujourd'hui.

La bascule de taxonomie — publier les quatorze familles V5, y ranger les 433
commandes, archiver les treize anciennes — **n'est pas ecrite**. Elle est
volontairement separee : y ranger une commande publiee avant de publier sa
famille la ferait disparaitre du catalogue a la seconde ou le lot passe. La
cible de rangement attend dans `data/catalogue/v5/rangement.json`, et
`tests/integration/17_catalogue_v5.sql` refuse deja tout etat ou une commande
publiee se retrouverait dans une famille invisible.

## 3. Securite

### Ce qui tient

- `prompt_versions` reste sans aucun droit pour `anon` et `authenticated` :
  verifie par quatre fichiers de tests distincts, dont le nouveau
  `19_non_regression_refonte.sql`.
- Le contenu complet ne sort que par `resolve_prompt` (membre) ou
  `resolve_free_prompt` (visiteur), tous deux avec leurs controles en base.
- Aucun secret dans le depot. Trois variables `NEXT_PUBLIC_*` seulement :
  l'URL du site, l'URL Supabase et la cle anonyme. La cle `service_role`
  n'est lue que par `lib/supabase/admin.ts`, marque `server-only`, importe
  par quatre modules serveur et aucun composant client.
- Les deux fonctions ajoutees par la refonte sont etroites :
  `alias_recherche` ne fait que normaliser du texte, et `resoudre_alias` ne
  rend qu'un slug et un mode, uniquement si la commande d'arrivee est publiee
  dans une famille visible.

### A traiter, par ordre d'importance

1. **`has_active_entitlement(uuid)` est appelable par `anon`.** La fonction
   est `SECURITY DEFINER` et accepte un identifiant arbitraire : qui connait
   l'identifiant d'un compte peut savoir s'il a un acces actif. La portee est
   faible — les identifiants ne sont pas exposes cote client — mais le
   correctif l'est aussi : refuser un `p_user_id` different de `auth.uid()`
   pour un appelant non administrateur. Anterieur a la refonte.
2. **Protection des mots de passe compromis desactivee** (Supabase Auth,
   verification HaveIBeenPwned). Un reglage de tableau de bord, pas de code.
3. `rls_auto_enable()` apparait dans les alertes comme appelable par `anon`.
   C'est un faux positif : la fonction rend un `event_trigger`, que PostgREST
   ne peut pas invoquer. Revoquer `execute` reste une hygiene sans risque.
4. `rate_limit_counters` a la RLS active sans aucune policy. C'est le
   comportement voulu — aucun acces client — mais il merite un commentaire en
   base pour qu'une relecture future ne le prenne pas pour un oubli.

## 4. Fonctionnement verifie

Suite complete : **56 tests unitaires**, **20 fichiers d'integration**, les
lots de donnees appliques deux fois pour prouver leur idempotence.

Verifie au navigateur, sur les pages publiques et le catalogue, aux largeurs
360, 390, 768, 1024 et 1440 px :

- **aucun debordement horizontal**, sur aucune page ni aucune largeur ;
- la fiche passe a deux colonnes a partir de 1024 px et reste a une colonne
  en dessous ;
- le choix de l'IA change bien le libelle du bouton de copie ;
- l'embed PostgREST des modes fonctionne contre la base reelle — une relation
  mal nommee aurait fait tomber tout le catalogue, pas seulement les modes.

Ce qui n'a **pas** pu etre verifie de bout en bout : la copie reelle depuis
cet environnement. La cle `service_role` n'y est pas configuree, donc la
route `/api/resolve-prompt` echoue avant d'atteindre la base. Le chemin est
couvert en base par `15_copie_offerte.sql` et par le nouveau controle qui
copie, en visiteur, une commande offerte prise dans le catalogue.

Observation qui en decoule : si cette cle venait a manquer en production, la
premiere copie echouerait avec le message generique, sans qu'aucun demarrage
ne l'ait signale. Une verification au demarrage rendrait la panne lisible.

## 5. Accessibilite

Corrige dans ce lot :

- **`/app` et `/offre` n'avaient aucun titre de niveau 1.** Un lecteur
  d'ecran annoncait « Que voulez-vous creer ? » comme premier repere du
  catalogue, sans jamais dire ou l'on se trouve.
- **Les liens du pied de page legal mesuraient 18 px de haut**, sous le
  minimum de 24 px de la regle AA, et le logo de l'en-tete 28 px. Les deux
  atteignent maintenant 30 et 44 px sans que la mise en page bouge d'un
  pixel : la marge negative rend la place que la marge interieure prend.

Constat corrige en cours d'audit : une premiere sonde signalait le champ de
recherche du catalogue et les champs de connexion comme depourvus de nom
accessible. C'etait la sonde qui avait tort — elle ne reconnaissait pas
l'etiquette implicite d'un `<input>` place dans un `<label>`. Ces champs sont
correctement etiquetes.

Restent, non traites faute du lot 8 : le contraste n'a pas ete mesure, et la
navigation au clavier n'a pas ete parcourue ecran par ecran.

## 6. Performance

Rien d'alarmant a l'echelle actuelle : 21 a 32 requetes par page, contenu
transfere de l'ordre de la dizaine de kilo-octets une fois le cache chaud,
DOM pret entre 30 et 580 ms en local.

Les alertes de la base sont toutes de niveau informatif : vingt-trois cles
etrangeres sans index couvrant — presque toutes sur des colonnes d'audit
(`created_by`, `updated_by`) jamais utilisees en filtre — et sept index
jamais servis, dont trois que la refonte vient d'ajouter et qui ne seront
utiles qu'une fois le catalogue V5 en ligne. Aucun n'appelle d'action
maintenant.

## 7. Les controles fragiles trouves en chemin

La refonte a revele quatre instructions qui traitaient « tout ce que je ne
connais pas » comme « a supprimer ou a publier ». Toutes sont corrigees, et
elles meritent d'etre citees ensemble parce qu'elles se ressemblent :

- `bascule-navigation-v2.sql` publiait **toute** categorie portant une
  reference externe : rejouee apres le socle V5, elle mettait en ligne
  quatorze rayons vides ;
- `supabase/seed/catalogue.sql` archivait **toute** categorie hors de sa
  liste v1 : rejouee apres le socle, elle archivait les quatorze familles
  neuves ;
- deux controles de completude comptaient les categories a reference externe
  et echouaient des qu'une famille etait ajoutee ailleurs.

Le generateur de lots V3 a ete realigne sur le controle corrige : sans cela,
la prochaine regeneration aurait remis la version fragile en place.

## 8. Ce qui reste a faire

1. Ouvrir la fenetre d'application des lots 3 et 4 en production, ensemble.
2. Ecrire la bascule de taxonomie V5, avec ses controles de sortie.
3. Reprendre le lot 8 : contraste, parcours clavier, mesure de performance
   sur reseau contraint.
4. Traiter les deux points de securite du chapitre 3.
