// Stub de test pour le package `server-only`.
//
// Ce package n'a d'effet qu'a travers la resolution de conditions specifique
// au bundler de Next.js (webpack) : il empeche un module serveur d'etre
// inclus dans le bundle client. Sous Vitest (Vite, resolution Node normale),
// son implementation reelle leve toujours une erreur, quel que soit le
// contexte. Ce stub neutralise l'import pour les tests, qui executent
// deliberement du code serveur en Node : la garantie de production, elle,
// reste entierement portee par le build Next.js.
export {};
