# RaccourcIA — base finale, contrat 7.0

1 109 cartes : 349 déjà publiées et 760 nouvelles cartes visuelles, dont 120 ajoutées dans cette révision. Le catalogue contient 1 058 visuels, 19 cartes de rédaction et 32 assistants. Les visuels d’illustration seront joints depuis la console d’administration, comme demandé.

## Quel fichier utiliser ?

| Fichier | Usage |
|---|---|
| `cartes.csv` | Base complète canonique : 1 109 lignes, 65 colonnes. |
| `nouvelles_cartes.csv` | Ensemble des 760 ajouts depuis le PDF publié. |
| `ajouts_revision_finale.csv` | Seulement les 120 cartes ajoutées dans cette dernière révision. |
| `identifiants.csv` | Registre immuable et correspondance avec les anciens identifiants. |
| `commandes.csv` | 310 familles ; plusieurs cartes peuvent partager une commande. |
| `taxonomie.csv` | 3 univers, 12 catégories et 37 collections, avec leurs parents. |
| `tags.csv`, `carte_tags.csv` | 72 tags contrôlés et 3 121 associations ; de 1 à 4 tags par carte. |
| `champs.csv`, `relations.csv` | Champs facultatifs et recommandations par UUID. |
| `ajustements_publies.csv` | Modifications éditoriales des cartes publiées, avant/après. |
| `recyclage.csv`, `archives_decisions.csv` | Traçabilité du lot précédent ; aucune archive supprimée ou restaurée automatiquement. |
| `schema.json`, `dictionnaire_colonnes.csv` | Contrat précis des colonnes et types. |
| `RaccourcIA.sqlite` | Base autonome déjà importée et vérifiée. |
| `controle.json` | Résultats des vérifications, avec leur périmètre. |

Les trois CSV de cartes sont des vues du même catalogue. Ne pas les concaténer : leurs lignes se recouvrent. Un import fait un upsert par `card_id`. Le statut cible est `published` ; cela exprime la demande éditoriale, sans prétendre qu’une publication sur le site a été exécutée.

## Logique des identifiants

- `card_id` : UUID canonique, immuable. Les 883 UUID valides de la livraison précédente restent identiques. Les 40 chaînes historiques et les 66 valeurs absentes reçoivent un UUID ; leurs origines restent dans le registre.
- `card_code` : code lisible `RCIA-C-000001` à `RCIA-C-001109`. Le prochain code libre est `RCIA-C-001110`. Il ne faut jamais renuméroter les cartes après un tri ou une suppression.
- `record_key` : `card:` suivi du UUID. Les relations ne dépendent plus des slugs.
- `command_id` : UUID d’une famille, distinct du UUID de chacune de ses cartes. Une commande peut avoir plusieurs déclinaisons contextuelles.
- `legacy_card_id` et `previous_record_key` : correspondance historique ; ce ne sont pas de nouvelles clés primaires.
- `production_card_id` : réservé au véritable identifiant du site, actuellement inconnu. Un UUID du catalogue n’est pas automatiquement un UUID de sa base.

Allocation initiale : UUIDv5, espace de noms `71c52d40-0442-4d1d-bd16-f841ba755440`, avec des graines séparées pour les cartes, les sources historiques et les commandes. Le registre livré est ensuite la source d’autorité. **Ne jamais recalculer un identifiant existant à partir d’un titre, d’un slug ou d’une catégorie modifiés.** Une nouvelle création reçoit un nouvel identifiant et le prochain code libre ; une carte supprimée ne libère pas son code.

Pour le premier rapprochement avec un site déjà rempli : rechercher l’identifiant historique exact s’il est présent, sinon le slug publié exact ; un seul résultat autorise l’association. En cas de zéro ou plusieurs résultats sur une carte dite publiée, suspendre cette ligne plutôt que créer un doublon. Enregistrer ensuite la correspondance catalogue → production ; conserver les références, favoris et médias de la ligne de production.

## Comportement des prompts

Chaque carte possède un prompt unique, un scénario autonome, des champs facultatifs et des questions conditionnelles. Les textes de formulaire sont des exemples, jamais des faits implicitement fournis.

1. **Avec références** : reprendre exactement les personnes, objets, logos, textes et faits utiles. Les choix secondaires restent à la charge de l’IA.
2. **Sans référence** : créer immédiatement un exemple fictif complet adapté à la commande. Définir le contexte, le sujet, les noms et les informations nécessaires ; ne pas exiger un formulaire préalable.
3. **Référence essentielle manquante pour une demande réelle** : poser seulement la question utile et proposer immédiatement une démonstration fictive. Si l’utilisateur refuse explicitement une simulation et exige l’exactitude, attendre la référence requise.
4. **Faits inventés** : les présenter comme fictifs. Les contacts utilisent `.example`, sans téléphone ni QR actif. Les chiffres de démonstration ne deviennent pas des preuves commerciales ; les cotes de concept ne deviennent pas des mesures réelles.

Les schémas techniques restent des images conceptuelles, sauf contenu documenté fourni ; ils ne sont pas des fichiers de fabrication. Une retouche sans photographie utilise un exemple synthétique clairement annoncé. Une identité réelle ne peut pas être reconstituée fidèlement sans référence. Les cartes de texte et d’assistant utilisent un cas fictif explicite lorsqu’une source manque, sans simuler une analyse réelle.

`compiler_prompt.py` effectue une substitution littérale en une passe. Les valeurs vides deviennent une instruction de choix selon le scénario de la carte. Une valeur contenant des accolades ou une barre oblique n’est jamais réinterprétée comme du code ou un second token.

## Taxonomie et conservation

Chaque carte a un seul univers, une seule catégorie et une seule collection principale. Les rapprochements transversaux passent par les tags et les relations. Cette révision ajoute deux collections : **Matières & conception** dans Produits et **Présentations professionnelles** dans Marketing & édition. Les 349 titres, slugs, commandes, classements, résumés publics, accès et états des médias publiés restent conservés. Les prompts et informations d’entrée sont harmonisés pour répondre à la nouvelle demande de fonctionnement autonome ; les intentions sont précisées lorsque nécessaire.

Les cartes publiées ont `media_action=preserve`. Les ajouts ont `attach_via_admin`. Une URL vide signifie « aucune nouvelle URL fournie » ; elle ne signifie jamais supprimer un média existant. L’absence de miniature n’empêche pas la présence de la carte dans le catalogue autonome. Le comportement réel de l’interface du site doit respecter ce choix.

## Import vérifié sans édition des CSV

CSV UTF-8 avec BOM, séparateur virgule, toutes les cellules entre guillemets, fins de ligne CRLF et retours internes conservés. Les nombres, booléens et JSON sont documentés dans le schéma. Lire avec un véritable parseur CSV ; ne pas découper les lignes à la main. Dans un tableur, importer les identifiants et slugs comme du texte.

L’importeur fourni utilise uniquement Python 3 et SQLite, sans paquet à installer. Depuis ce dossier :

```bash
python3 importer_catalogue.py --validate-only
python3 importer_catalogue.py --db raccourcia.sqlite
python3 compiler_prompt.py RCIA-C-000990
```

Le premier appel vérifie les types, identifiants, relations, champs, tokens et taxonomies. Le second crée ou met à jour la base autonome, dans une transaction ; un second passage ne crée aucun doublon. Une collision de clé annule la transaction. Les URL de médias et identifiants de production déjà renseignés restent conservés lorsque les cellules entrantes sont vides. Aucun enregistrement de carte absent du lot n’est supprimé.

## Limite précise concernant le site

Les fichiers V5 retrouvés décrivent un projet d’import à 44 colonnes, avec notamment `cle_carte` et `playloads`. Ils ne fournissent ni le code ni le schéma de l’importeur réellement installé. Le présent contrat 7.0 explicite `card_id` et les nouvelles métadonnées ; **il ne prétend pas être directement interchangeable avec ce contrat V5 ni avec un importeur inconnu**.

Les CSV s’importent sans retouche avec l’importeur autonome livré, et la base SQLite jointe en apporte un résultat vérifié. La certification d’un import direct sur le site demande encore son modèle CSV accepté ou son code d’import. Il faudra alors adapter automatiquement les noms de colonnes et le rapprochement des identifiants, en conservant les fichiers sources ; aucune édition manuelle des 1 109 cartes n’est nécessaire. Aucune connexion, importation ou publication sur le site n’a été effectuée pendant cette révision.

Les contrôles garantissent la structure des données, la compilation des prompts et le fonctionnement de l’importeur fourni. Les 1 058 rendus visuels n’ont pas été générés : leur qualité graphique devra être contrôlée lors de l’ajout des témoins.
