/**
 * XCTrack suit la langue de l'appareil pour le **séparateur décimal** : virgule en
 * français (« +3,5 », « +2,2 m/s », « / 0,1s » — `captures-air3/2026-08-21_planche-sol-2`,
 * `vol-numeriques-boussole-variocolumn.png`), point ailleurs.
 *
 * `language` peut être un code de langue système complet (`navigator.language`, ex.
 * `fr-FR`) et pas seulement le code court du fichier (`fr`) — voir `resolveLanguage`
 * dans `src/model/preferences.ts` — d'où `startsWith` plutôt qu'une égalité stricte.
 *
 * Rien ici ne recalcule quoi que ce soit : seule la présentation change, jamais la
 * donnée.
 */
export function formatDecimal(text: string, language: string): string {
  if (!language.toLowerCase().startsWith('fr')) return text
  return text.replace('.', ',')
}
