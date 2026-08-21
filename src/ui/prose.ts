import { formatters, pluralForm, UI_FALLBACK_LANGUAGE, type PluralForms } from '../i18n'

/**
 * # Le raccord entre les écrans et le socle multilingue
 *
 * Les écrans de `src/ui/` portent encore leur prose **écrite en dur, en français** : les
 * 627 unités de message du dépôt n'ont pas été versées au catalogue, et les verser était
 * hors de ce lot — ce sont des décisions de vocabulaire, pas de mécanique.
 *
 * Ce qui **a** été versé, c'est la mécanique : le pluriel et les formateurs. Le dépôt en
 * portait huit copies de l'un et sept versions figées des autres, toutes fausses hors du
 * français. Elles passent désormais par `src/i18n/`, à une langue près — celle dans
 * laquelle cette prose-là est écrite, et qui est donnée ici.
 *
 * ## Ce module est un chantier, pas une couche
 *
 * Il n'a pas vocation à durer. Chaque fois qu'un écran versera ses messages au catalogue,
 * il cessera de l'importer pour lire son traducteur ; le jour où le dernier l'aura fait,
 * ce fichier disparaîtra. `grep -rl "from './prose'" src/ui/` donne donc, à tout moment,
 * **la liste de ce qui reste à traduire** — et cette liste est tenue par le compilateur,
 * pas par une note.
 *
 * ## Pourquoi la langue est le français et non celle du pilote
 *
 * Parce que c'est celle du **texte que ce module met en forme**. Appliquer la règle de
 * pluriel anglaise à « {count} réglage » donnerait « 0 réglages », et l'espagnole à
 * « {count} page masquée » n'irait pas mieux : la forme suit la langue de la phrase, pas
 * celle de l'interface. Tant que la phrase est française, sa règle l'est aussi.
 *
 * `UI_FALLBACK_LANGUAGE` **est** cette langue d'écriture — voir `src/i18n/languages.ts`,
 * qui explique pourquoi le repli du projet est le français et non l'anglais : notre prose
 * est écrite en français d'abord, le reste est traduction.
 */
export const PROSE_LANGUAGE = UI_FALLBACK_LANGUAGE

/**
 * Les formateurs de la langue d'écriture. Mémorisés par le socle : cette constante est le
 * même objet que `formatters('fr')` obtenu ailleurs.
 */
export const proseFormat = formatters(PROSE_LANGUAGE)

/**
 * Une phrase qui porte un nombre, dans la forme que `Intl.PluralRules` choisit — et non
 * dans celle que `count > 1` choisissait.
 *
 * ```ts
 * plural({ one: '{count} gadget', other: '{count} gadgets' }, page.widgets.length)
 * ```
 *
 * **Chaque forme est une phrase entière**, `{count}` compris. C'est ce qui distingue
 * cette construction des accords écrits en ternaire qu'elle remplace : un `s` collé à un
 * mot ne se traduit pas, une phrase se réécrit. Le repère nommé permet en outre au nombre
 * de ne pas être en tête — « ces {count} réglages » — ou de ne pas y être du tout, quand
 * l'appelant l'écrit lui-même.
 *
 * Le nombre est mis en forme par la langue, séparateur de milliers compris : « 1 059
 * lignes ». C'est la règle du socle — un `number` se met en forme — et elle vaut ici
 * comme ailleurs.
 */
export function plural(forms: PluralForms, count: number): string {
  return pluralForm(forms, count, PROSE_LANGUAGE)
    .replaceAll('{count}', proseFormat.number(count))
}
