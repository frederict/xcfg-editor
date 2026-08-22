/**
 * La prose des couches **sous** l'interface : `src/model/`, `src/library/`,
 * `src/catalog/`.
 *
 * Ces couches ne dépendent pas de `src/i18n/` : elles **reçoivent un traducteur en
 * argument** et n'importent de lui que son type, effacé à la compilation. C'est le motif
 * arrêté pour tout le dépôt — voir `docs/reference/extraction-des-messages.md` § « La
 * prose hors interface » — et `src/model/personalData.ts` en est l'exemple appliqué.
 *
 * **Encore vide** : ce domaine attend son lot d'extraction. Voir `widgets.ts` pour
 * pourquoi le fichier existe quand même.
 */
const model = {} as const

export default model

export type FrenchModel = typeof model
