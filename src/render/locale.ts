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
 *
 * ## ⚠️ Pourquoi `.replace('.', ',')` ici, alors que le dépôt l'interdit
 *
 * `src/i18n/CLAUDE.md` § 4 dit « jamais de `.replace('.', ',')` » et il a raison **pour
 * notre prose** : un nombre que nous affichons se met en forme par `Intl`, dans la langue
 * du pilote. Ce module ne met pas en forme un nombre à nous. **Il imite le séparateur
 * décimal de l'instrument**, sur un texte recopié du fichier ou d'un relevé, à la langue
 * de l'appareil — l'axe `labels`, jamais l'axe `ui`.
 *
 * Passer par `Intl.NumberFormat` serait ici une régression : il faudrait analyser le texte
 * en nombre, donc perdre `3.0`, `1.0E7` et les entiers au-delà de 2^53 que tout le reste
 * du dépôt s'échine à préserver — et il grouperait les milliers, ce que l'appareil ne fait
 * pas. L'exception est donc **assumée**, et c'est la seule de `src/render/` : partout
 * ailleurs, une phrase de nous passe par le catalogue et un nombre de nous par
 * `tr.format`.
 */
export function formatDecimal(text: string, language: string): string {
  if (!language.toLowerCase().startsWith('fr')) return text
  return text.replace('.', ',')
}
