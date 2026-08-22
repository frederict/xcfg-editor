/**
 * `properties.ts`, `widgetPalette.ts`, `widgetList.ts` — le panneau de propriétés, la
 * palette, la liste des gadgets d'une page.
 *
 * **Encore vide** : ce domaine attend son lot d'extraction. Les cinq fichiers existent
 * déjà — un par langue — pour que le lot qui s'en saisira n'ait à créer aucun fichier ni à
 * toucher `src/i18n/domains.ts`, et donc à croiser personne.
 *
 * Le mot « gadget » se lit dans `common.ts` : il est mesuré dans les cinq langues et il
 * sert à plusieurs domaines.
 */
const widgets = {} as const

export default widgets

export type FrenchWidgets = typeof widgets
