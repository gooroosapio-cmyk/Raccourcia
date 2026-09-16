/**
 * Le moteur d'une commande, tel que la fiche le lit.
 *
 * Le catalogue decrit chaque entree par sept champs de texte : ce qu'elle
 * fait, ce qu'elle rend, ce qu'elle demande d'abord, a quoi se voit la
 * reussite, ce qu'elle refuse, comment on l'arrete. Ces champs existaient
 * deja en base pour construire le prompt ; ils n'etaient montres nulle part.
 *
 * Or c'est exactement ce qui manque devant un Mode IA ou un Parcours. Une
 * commande image se juge sur son visuel : on voit le resultat avant de
 * copier. Un mode ne montre rien — il conditionne la conversation qui suit —
 * et un parcours rend cinq fichiers a la file. Sans ces champs, leur fiche
 * disait « Donnez un role a votre IA » et s'arretait la.
 *
 * Ce module ne fait que lire. Il ne reformule rien, n'ajoute rien et ne
 * devine aucun chiffre : quand un texte ne se laisse pas decouper, la fonction
 * rend `null` et l'ecran affiche la phrase telle qu'elle est ecrite.
 */

/** Les sept champs, tels que le catalogue les ecrit. */
export type Moteur = {
  /** La nature de l'accompagnement, puis dans quelles conditions s'en servir. */
  contexte: string | null;
  /** Comment la commande procede, etape par etape. */
  specification: string | null;
  /** Ce qu'elle rend : une phrase pour un mode, une liste pour un parcours. */
  livrables: string | null;
  /** Par quoi elle commence, et ce qu'elle demandera ensuite. */
  questionsCadrage: string | null;
  /** A quoi se verifie un resultat correct. */
  criteresReussite: string | null;
  /** Ce qu'elle s'interdit de faire. */
  erreurs: string | null;
  /** Comment la mettre en pause, la reprendre, en sortir. */
  regleSortie: string | null;
};

const vide = (texte: string | null | undefined): string | null => {
  const propre = (texte ?? '').trim();
  return propre.length > 0 ? propre : null;
};

/**
 * Assemble les sept champs, ou rend `null` quand aucun n'est renseigne.
 *
 * Une entree d'un import anterieur n'a aucun de ces champs : la fiche retombe
 * alors sur son affichage precedent plutot que d'ouvrir des sections vides.
 */
export function lireLeMoteur(champs: {
  contexte: string | null;
  specification: string | null;
  livrables: string | null;
  questions_cadrage: string | null;
  criteres_reussite: string | null;
  erreurs: string | null;
  regle_sortie: string | null;
}): Moteur | null {
  const moteur: Moteur = {
    contexte: vide(champs.contexte),
    specification: vide(champs.specification),
    livrables: vide(champs.livrables),
    questionsCadrage: vide(champs.questions_cadrage),
    criteresReussite: vide(champs.criteres_reussite),
    erreurs: vide(champs.erreurs),
    regleSortie: vide(champs.regle_sortie),
  };

  return Object.values(moteur).some((valeur) => valeur !== null) ? moteur : null;
}

/**
 * La premiere question que l'IA posera, isolee du reste.
 *
 * Le champ en contient deux choses : la question d'ouverture, puis la regle
 * que la commande suit pour la suite (« Ensuite, questionner uniquement les
 * inconnues qui changent le livrable »). La seconde s'adresse a l'IA, pas a
 * la personne qui lit la fiche ; la premiere est precisement ce qu'elle veut
 * savoir avant de coller quoi que ce soit.
 *
 * Le decoupage s'arrete au premier point d'interrogation. Sans point
 * d'interrogation, il n'y a pas de question a annoncer et la fonction rend
 * `null` plutot qu'une phrase coupee au hasard.
 */
export function premiereDemande(questionsCadrage: string | null): string | null {
  const texte = vide(questionsCadrage);
  if (!texte) return null;

  const fin = texte.indexOf('?');
  if (fin === -1) return null;

  return texte.slice(0, fin + 1).trim();
}

/** Un livrable d'un parcours : ce qu'on obtient, et sous quelle forme. */
export type Livrable = {
  nom: string;
  /** Le format annonce entre crochets : « 4:5 », « texte », « tableau ». */
  format: string | null;
};

/**
 * La liste des livrables d'un parcours, et leur nombre.
 *
 * Le catalogue les ecrit sur une ligne : « 3 livrables : Vue globale [4:5];
 * Detail reel [1:1]; Etat et usure [4:5]. » Un parcours annonce ainsi de deux
 * a sept fichiers, et c'est le seul endroit ou ce nombre existe — aucune
 * colonne ne le porte.
 *
 * Le nombre affiche est celui de la liste reellement lue, et il n'est rendu
 * que s'il concorde avec le nombre annonce. Deux chiffres qui se contredisent
 * dans la meme phrase valent mieux tus : la fiche montre alors les livrables
 * sans en annoncer le compte.
 *
 * Rend `null` pour un mode, dont le champ est une phrase et non une liste.
 */
export function lireLesLivrables(
  livrables: string | null,
): { compte: number | null; etapes: Livrable[] } | null {
  const texte = vide(livrables);
  if (!texte) return null;

  const entete = texte.match(/^(\d+)\s+livrables?\s*:\s*([\s\S]+)$/i);
  const [, annonce, liste] = entete ?? [];
  if (!annonce || !liste) return null;

  const etapes = liste
    .replace(/\.\s*$/, '')
    .split(';')
    .map((morceau) => morceau.trim())
    .filter((morceau) => morceau.length > 0)
    .map((morceau): Livrable => {
      const [, nom, format] = morceau.match(/^([\s\S]+?)\s*\[([^\]]+)\]$/) ?? [];
      return nom && format
        ? { nom: nom.trim(), format: format.trim() }
        : { nom: morceau, format: null };
    });

  if (etapes.length === 0) return null;

  return { compte: etapes.length === Number(annonce) ? etapes.length : null, etapes };
}

/**
 * Les criteres, prives de ce que la fiche dit deja ailleurs.
 *
 * Les quatre-vingt-deux modes du catalogue ouvrent leurs criteres de reussite
 * par la liste de leurs interdits, mot pour mot. La fiche montre les deux,
 * dans deux sections differentes : sans ce retrait, la meme phrase se lisait
 * deux fois a trois lignes d'intervalle.
 */
export function sansRedite(criteres: string | null, erreurs: string | null): string | null {
  const texte = vide(criteres);
  const interdits = vide(erreurs);
  if (!texte || !interdits) return texte;
  if (!texte.startsWith(interdits)) return texte;

  return vide(texte.slice(interdits.length));
}

/** Un moment de sortie : ce qu'on dit a l'IA, et ce qu'elle fait alors. */
export type Jalon = { moment: string; effet: string };

/**
 * Comment mettre la commande en pause, la reprendre, en sortir.
 *
 * Un mode se colle une fois pour dix echanges : la question suivante est
 * toujours « comment j'en sors ? ». Le catalogue y repond sur une ligne —
 * « Pause : point de reprise. Bilan : synthese. Arreter : quitter le
 * conditionnement. » — qui se lit bien mieux en liste.
 *
 * Rend `null` des qu'un morceau ne suit pas la forme « mot : effet » : la
 * fiche affiche alors la ligne entiere, qui reste comprehensible.
 */
export function lireLesJalons(regleSortie: string | null): Jalon[] | null {
  const texte = vide(regleSortie);
  if (!texte) return null;

  const morceaux = texte
    .split(/\.(?:\s+|$)/)
    .map((morceau) => morceau.trim())
    .filter((morceau) => morceau.length > 0);

  if (morceaux.length < 2) return null;

  const jalons: Jalon[] = [];
  for (const morceau of morceaux) {
    const [, moment, effet] = morceau.match(/^([^:]{2,60}?)\s*:\s*(.+)$/) ?? [];
    if (!moment || !effet) return null;
    jalons.push({ moment: moment.trim(), effet: effet.trim() });
  }

  return jalons;
}

/**
 * Ce que le contexte apprend en plus du titre.
 *
 * Il s'ecrit « Accompagnement interactif : Atelier communique. A utiliser sur
 * un cas concret, avec les documents disponibles. » : une nature, un nom deja
 * porte par le titre de la fiche, puis les conditions d'emploi. Seules ces
 * dernieres valent d'etre affichees.
 */
export function conditionsDEmploi(contexte: string | null): string | null {
  const texte = vide(contexte);
  if (!texte) return null;

  const separateur = texte.indexOf(':');
  if (separateur === -1) return texte;

  const [, conditions] = texte.slice(separateur + 1).match(/^[^.]*\.\s*([\s\S]+)$/) ?? [];
  return vide(conditions);
}
