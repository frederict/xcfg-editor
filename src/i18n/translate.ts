import { formatters, type Formatters } from './format'
import type { UiLanguage } from './languages'
import { pluralForm, type PluralForms } from './plural'
import { loadMessages, type MessageArgs, type MessageCatalog, type MessageKey } from './catalog'

/**
 * # La lecture d'un message
 *
 * ```ts
 * const tr = await loadTranslator('de')
 *
 * tr.t('action.redo')                                    // « Wiederholen »
 * tr.t('action.redoNamed', { what: 'Seite 3' })          // « Wiederholen: Seite 3 »
 * tr.t('preferences.settingCount', { count: 0 })         // « 0 Einstellungen »
 * tr.format.byteSize(80486)                              // « 78,6 kB »
 * ```
 *
 * ## Ce que le compilateur refuse
 *
 * - une clé qui n'existe pas ;
 * - `t('action.redoNamed')` sans `{ what }` — le repère est extrait du texte par le type ;
 * - `t('action.redo', { what: 'x' })` — la phrase n'attend rien, l'argument est interdit ;
 * - `t('preferences.settingCount')` sans `count`, ou avec un `count` qui n'est pas un
 *   nombre : c'est lui qui choisit la forme du pluriel.
 *
 * ## Nombre ou identifiant : c'est le type qui tranche
 *
 * Une valeur passée en `number` est mise en forme dans la langue — « 1 059 » en français,
 * « 1,059 » en anglais. Une valeur passée en `string` est recopiée **telle quelle**.
 *
 * C'est la règle qui protège les identifiants : `versionCode 100030`, un rang lu dans une
 * clé du fichier, `1.0.3-beta`. « 100 030 » ne se retrouve dans aucun fichier XCTrack ;
 * ces valeurs-là se passent donc en `string`, et le type de l'appelant le dit.
 *
 * ## Un repère non fourni reste visible
 *
 * Le typage rend le cas impossible depuis TypeScript, mais un catalogue peut dériver
 * autrement — un fichier de langue édité à la main, une traduction reprise d'une version
 * antérieure. Le repère est alors laissé **tel quel** dans le texte : « Rétablir :
 * {what} ». C'est laid, c'est visible, ça se corrige. Le remplacer par du vide donnerait
 * une phrase amputée que personne ne remarquerait.
 */
export interface Translator {
  /** La langue de **notre prose**, jamais celle des libellés — voir `src/i18n/axes.ts`. */
  readonly language: UiLanguage
  readonly format: Formatters
  t<K extends MessageKey>(key: K, ...args: MessageArgs<K>): string
}

/** Un repère nommé : `{count}`, `{total}`, `{name}`. Jamais positionnel — voir `catalog.ts`. */
const MARKER = /\{([A-Za-z][A-Za-z0-9]*)\}/g

function interpolate(
  text: string,
  values: Readonly<Record<string, string | number>> | undefined,
  format: Formatters
): string {
  if (values === undefined) return text
  return text.replace(MARKER, (whole, name: string) => {
    const value = values[name]
    if (value === undefined) return whole
    return typeof value === 'number' ? format.number(value) : value
  })
}

export function makeTranslator(language: UiLanguage, messages: MessageCatalog): Translator {
  const format = formatters(language)

  return {
    language,
    format,
    t: <K extends MessageKey>(key: K, ...args: MessageArgs<K>): string => {
      // Le type de `messages[key]` est conditionnel sur `K`, encore générique ici : le
      // compilateur ne peut pas le réduire, alors que l'union des deux formes possibles
      // est exacte et suffit à l'exécution.
      const entry = messages[key] as string | PluralForms
      const values = args[0] as Readonly<Record<string, string | number>> | undefined
      if (typeof entry === 'string') return interpolate(entry, values, format)
      const count = typeof values?.count === 'number' ? values.count : 0
      return interpolate(pluralForm(entry, count, language), values, format)
    }
  }
}

/**
 * Mémorisé par langue : `loadMessages` partage déjà la requête, on partage ici l'objet.
 * Deux écrans qui demandent le même traducteur obtiennent la même identité, ce qui permet
 * de le comparer sans le reconstruire.
 */
const built = new Map<UiLanguage, Promise<Translator>>()

/** Charge le catalogue de la langue — un seul des cinq — et en fait un traducteur. */
export function loadTranslator(language: UiLanguage): Promise<Translator> {
  const pending = built.get(language)
  if (pending !== undefined) return pending
  const started = loadMessages(language)
    .then((messages) => makeTranslator(language, messages))
    .catch((error: unknown) => {
      built.delete(language)
      throw error
    })
  built.set(language, started)
  return started
}
