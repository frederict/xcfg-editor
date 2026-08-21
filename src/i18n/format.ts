import type { UiLanguage } from './languages'

/**
 * # Nombres, tailles, dates : tout passe par `Intl`
 *
 * Sept formateurs du dépôt sont figés en français, dont deux qui **cassent dans les
 * quatre autres langues** :
 *
 * | Où | Ce qui est figé |
 * |---|---|
 * | `views.ts` `formatMm`, `deviceSelector.ts` `formatInches`, `sharingDialog.ts` et `libraryPanel.ts` `formatByteSize` | `.replace('.', ',')` — la virgule décimale |
 * | `preferencesPage.ts` `formatCount`, `versionDiagnostic.ts` `french()` | `toLocaleString('fr-FR')` |
 * | `sharingDialog.ts`, `libraryPanel.ts` `formatByteSize` | les unités **`o` / `ko` / `Mo`**, qui s'écrivent `B` / `kB` / `MB` en anglais |
 * | `libraryPanel.ts` `formatStamp` | douze **noms de mois français en dur** |
 *
 * La virgule décimale ne casse que pour l'anglais : le néerlandais, l'allemand et
 * l'espagnol l'emploient comme le français. Les octets et les mois, eux, cassent dans les
 * quatre.
 *
 * ## Ce que `Intl` rend, mesuré (Node 22, ICU complet)
 *
 * | | `fr` | `en` | `nl` | `de` | `es` |
 * |---|---|---|---|---|---|
 * | `number(1059)` | `1 059` | `1,059` | `1.059` | `1.059` | `1059` |
 * | `byteSize(512)` | `512 o` | `512 byte` | `512 byte` | `512 Byte` | `512 B` |
 * | `byteSize(80486)` | `78,6 ko` | `78.6 kB` | `78,6 kB` | `78,6 kB` | `78,6 kB` |
 * | `percent(0.32)` | `32 %` | `32%` | `32%` | `32 %` | `32 %` |
 * | `dateTime(...)` | `3 août 2026 à 14:32` | `August 3, 2026 at 2:32 PM` | `3 augustus 2026 om 14:32` | `3. August 2026 um 14:32` | `3 de agosto de 2026 a las 14:32` |
 *
 * ## Deux écarts avec ce que le français affiche aujourd'hui, tous deux assumés
 *
 * **1. L'espace avant l'unité.** `Intl` pose en français une **espace fine insécable**
 * (U+202F) entre le nombre et son unité — « 512 o », « 78,6 ko », « 48,3 mm » — et une
 * espace insécable (U+00A0) devant le signe pour-cent. Le dépôt écrivait une espace
 * ordinaire, qui laisse le navigateur couper la ligne entre « 512 » et « o ». L'écart est
 * d'un caractère et c'est un progrès ; il se voit en revanche dans un test écrit à la
 * main, d'où les échappements explicites dans `tests/i18n/format.test.ts`.
 *
 * `preferencesPage.formatCount` et `versionDiagnostic.french()` passaient déjà par
 * `toLocaleString('fr-FR')` : pour eux, la sortie est **identique au caractère près**,
 * espace fine comprise.
 *
 * **2. L'heure.** Le dépôt écrit « 14 h 32 », CLDR écrit « 14:32 ». C'est la forme que le
 * système d'exploitation du pilote emploie partout ailleurs ; le typographique
 * « 14 h 32 » était un choix maison, et il ne se transpose pas.
 *
 * Pour le reste — séparateurs de milliers, virgule décimale, signe des pouces — la sortie
 * française est celle d'aujourd'hui.
 *
 * ## Ce qui ne passe PAS par ici
 *
 * Les identifiants : `versionCode 100030`, `1.0.3-beta`, `info.exportType`, un rang lu
 * dans une clé du fichier. Les mettre en forme les rendrait faux — « 100 030 » ne se
 * retrouve dans aucun fichier. La règle est portée par le type de l'appelant, dans
 * `translate.ts` : **un `number` est mis en forme, une `string` est recopiée telle
 * quelle.** Un identifiant se passe donc en `string`.
 */

export interface Formatters {
  readonly language: UiLanguage
  /** Un compte, avec les séparateurs de milliers de la langue : « 1 059 », « 1,059 ». */
  number(value: number): string
  /** Un nombre décimal à un nombre de décimales fixé : millimètres, mètres par seconde. */
  decimal(value: number, fractionDigits: number): string
  /** Une part, donnée en fraction de 1 : `percent(0.32)` rend « 32 % ». */
  percent(fraction: number): string
  /** Des millimètres avec leur unité : « 48,3 mm ». */
  millimeters(value: number, fractionDigits?: number): string
  /** Des pouces : « 7,25″ » — « 7,25 in » en allemand, qui n'emploie pas le signe. */
  inches(value: number): string
  /** Une taille de fichier : « 78,6 ko », « 78.6 kB ». Voir `BYTE_TIERS`. */
  byteSize(byteLength: number): string
  /**
   * Une date et une heure, à la minute. Rend `undefined` — et non un texte — quand la
   * date est absente ou illisible : le mot à afficher alors est de la prose, il vient du
   * catalogue (`common.unknownDate`), pas d'un formateur.
   */
  dateTime(value: Date | string): string | undefined
  /** La même chose sans l'heure. */
  date(value: Date | string): string | undefined
}

/**
 * Les paliers de `byteSize`, du plus grand au plus petit.
 *
 * **Le diviseur est 1024, et c'est délibéré** : c'est ce que le dépôt affiche depuis le
 * début, et passer à 1000 ferait sauter la même bibliothèque de « 78,6 ko » à « 80,5 ko »
 * sans que rien n'ait bougé. Strictement, `Intl` écrit alors un préfixe SI (`ko`, `kB`)
 * pour une quantité binaire (kibi) — l'écart est de 2,4 % au premier palier. On préfère
 * cet écart, connu et écrit ici, à un chiffre qui change sous les yeux du pilote. Les
 * unités, elles, viennent bien de la langue.
 *
 * Le palier des gigaoctets ne sert pas aux configurations — 79 ko pour la plus grosse du
 * corpus — mais au quota que le navigateur annonce, où « 10240,0 Mo » se lit mal.
 */
const BYTE_TIERS: ReadonlyArray<readonly [threshold: number, unit: string]> = [
  [1024 * 1024 * 1024, 'gigabyte'],
  [1024 * 1024, 'megabyte'],
  [1024, 'kilobyte']
]

function toDate(value: Date | string): Date | undefined {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value
  if (value === '') return undefined
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

/**
 * Construire un `Intl.NumberFormat` coûte plus cher que de s'en servir, et l'affichage
 * d'une bibliothèque en demande des centaines. On mémorise par langue **et** par jeu
 * d'options, la clé étant le JSON des options : court, stable, et sans collision possible
 * entre deux jeux différents.
 */
const numberFormats = new Map<string, Intl.NumberFormat>()

function numberFormat(language: UiLanguage, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${language} ${JSON.stringify(options)}`
  const known = numberFormats.get(key)
  if (known !== undefined) return known
  const made = new Intl.NumberFormat(language, options)
  numberFormats.set(key, made)
  return made
}

const dateFormats = new Map<string, Intl.DateTimeFormat>()

function dateFormat(language: UiLanguage, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${language} ${JSON.stringify(options)}`
  const known = dateFormats.get(key)
  if (known !== undefined) return known
  const made = new Intl.DateTimeFormat(language, options)
  dateFormats.set(key, made)
  return made
}

const built = new Map<UiLanguage, Formatters>()

/**
 * Les formateurs d'une langue. Mémorisés : deux appels pour la même langue rendent le
 * même objet, ce qui permet de le comparer par identité et de le garder dans un état
 * d'interface sans craindre de le reconstruire à chaque rendu.
 */
export function formatters(language: UiLanguage): Formatters {
  const known = built.get(language)
  if (known !== undefined) return known

  const made: Formatters = {
    language,

    number: (value) => numberFormat(language, {}).format(value),

    decimal: (value, fractionDigits) => numberFormat(language, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits
    }).format(value),

    percent: (fraction) => numberFormat(language, {
      style: 'percent',
      maximumFractionDigits: 0
    }).format(fraction),

    millimeters: (value, fractionDigits = 1) => numberFormat(language, {
      style: 'unit',
      unit: 'millimeter',
      unitDisplay: 'short',
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits
    }).format(value),

    // `narrow` et non `short` : `short` écrit « 7,25 po » en français, une abréviation que
    // personne n'emploie pour une diagonale d'écran. `narrow` rend le signe partout où la
    // langue le connaît, et « in » en allemand, qui ne le connaît pas.
    inches: (value) => numberFormat(language, {
      style: 'unit',
      unit: 'inch',
      unitDisplay: 'narrow',
      maximumFractionDigits: 2
    }).format(value),

    byteSize: (byteLength) => {
      for (const tier of BYTE_TIERS) {
        const [threshold, unit] = tier
        if (byteLength >= threshold) {
          return numberFormat(language, {
            style: 'unit',
            unit,
            unitDisplay: 'short',
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
          }).format(byteLength / threshold)
        }
      }
      // En dessous de 1 ko, l'octet s'écrit entier : « 512 o », jamais « 512,0 o ».
      return numberFormat(language, {
        style: 'unit',
        unit: 'byte',
        unitDisplay: 'short',
        maximumFractionDigits: 0
      }).format(byteLength)
    },

    dateTime: (value) => {
      const when = toDate(value)
      if (when === undefined) return undefined
      return dateFormat(language, { dateStyle: 'long', timeStyle: 'short' }).format(when)
    },

    date: (value) => {
      const when = toDate(value)
      if (when === undefined) return undefined
      return dateFormat(language, { dateStyle: 'long' }).format(when)
    }
  }

  built.set(language, made)
  return made
}
