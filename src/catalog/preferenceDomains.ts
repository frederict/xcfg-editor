/**
 * Les **domaines de valeurs** que les écrans de réglages ne portent pas.
 *
 * `preferenceCatalog.ts` tire les valeurs permises de l'écran XML (`entryValues`) ou
 * d'une énumération du bytecode. Deux familles y échappent, et l'éditeur les laisse
 * alors en saisie libre — où le pilote peut écrire ce que XCTrack refusera :
 *
 * - les huit `Unit.*`, dont XCTrack remplit la liste **en code** au moment de
 *   l'afficher ;
 * - les quinze `Keys.*`, qui portent un **code de touche Android** nu.
 *
 * Produit par `tools/build-preference-domains.py`. Voir son en-tête pour la méthode.
 *
 * ## `Unit.*` : un vocabulaire, pas un domaine
 *
 * Ce qui est **su** : l'alphabet des codes d'unité, lu dans l'énumération d'unités du
 * bytecode — `m`, `km/h`, `FL`, `100ft/min`… dix-huit codes, et ce sont exactement les
 * chaînes qu'un fichier écrit.
 *
 * Ce qui n'est **pas su** : quel sous-ensemble chaque clé accepte. Rien dans les
 * cinquante-cinq relevés ne le dit, dans aucune langue. Et la question n'est même pas
 * un simple sous-ensemble : `Unit.Distance` vaut `m,km` dans le corpus — deux codes
 * séparés par une virgule, une *échelle* et non une unité — quand `Unit.Altitude`
 * vaut `m`. `unitDomain()` rend donc toujours `null`.
 *
 * Une interface a le choix entre se taire et **proposer sans imposer** : le
 * vocabulaire et les valeurs observées font de bonnes suggestions à côté d'un champ
 * qui reste libre. Ce qu'elle ne doit pas faire, c'est présenter une liste fermée :
 * la première voile réglée en pieds écrirait une valeur que nous n'avons jamais vue.
 *
 * ## `Keys.*` : une table publique, et un bit qu'on déduit
 *
 * La table `KEYCODE_*` d'Android est publique et stable ; elle est lue dans
 * l'`android.jar` du SDK installé, à un niveau d'API que le fichier consigne. Un code
 * que cette API ne connaît pas rend `null` — jamais un nom inventé.
 *
 * Reste le bit `0x01000000`, posé sur quatre valeurs du corpus. Ôté, il laisse à
 * chaque fois un code Android valide, et le **même** code qu'une autre liaison du
 * même fichier porte sans le bit : `KEYCODE_VOLUME_UP` zoome en appui simple et
 * change de page avec le bit. Deux textes de XCTrack vont dans le même sens
 * (« Long press: », « External key - long press »).
 *
 * **Ce n'est pas lu dans le bytecode.** `decodeKeyBinding()` rend donc `modified`, pas
 * `longPress`, et `LONG_PRESS_BIT_BASIS` vaut `'inferred'` : à l'interface de dire
 * « appui long (déduit) » plutôt que de présenter la lecture comme un constat. Le
 * corpus ne vient que d'un seul appareil, et quatre paires ne font pas une preuve.
 */

/** Ce que le bytecode livre sur les unités, et ce que les fichiers réels en montrent. */
export interface UnitDomains {
  /** L'alphabet des codes d'unité, dans l'ordre des ordinaux de l'énumération. */
  vocabulary: string[]
  vocabularySource: {
    /** Nom obfusqué de l'énumération — il change à chaque compilation. */
    enum: string
    versionName: string
    versionCode: number
    /** Les autres versions qui portent le même vocabulaire. */
    alsoIn: string[]
    /** Les vocabulaires différents relevés ailleurs, s'il y en a. */
    otherVocabularies: Array<{ codes: string[], versionNames: string[] }>
    /** Relevés où l'énumération n'a pas été retrouvée. Leur silence ne dit rien. */
    surveysWithout: number
  }
  keys: Record<string, {
    /** Ce que des fichiers réels portent. Un seul appareil : c'est peu. */
    observed: string[]
    /** Toujours `null` : aucune source lisible ne donne le domaine par clé. */
    domain: string[] | null
  }>
}

/** La table des codes de touche Android, et ce que les fichiers réels y montrent. */
export interface KeyCodeDomains {
  /** Niveau d'API de la plateforme lue. Un code ajouté plus tard restera inconnu. */
  androidApiLevel: number | null
  source: string
  /** `{code: "KEYCODE_..."}`, les clés étant des entiers écrits en chaîne. */
  codes: Record<string, string>
  longPressBit: number
  /** `'inferred'` : déduit du corpus et des textes, jamais lu dans le bytecode. */
  longPressBitBasis: 'inferred'
  longPressBitEvidence: string[]
  /** Valeur d'une liaison sans touche affectée : le défaut déclaré des quinze. */
  unsetValue: number
  keys: Record<string, { observed: number[] }>
}

export interface PreferenceDomains {
  meta: {
    generatedBy: string
    surveyCount: number
    newestVersion: string
    corpusFileCount: number
  }
  units: UnitDomains
  keyCodes: KeyCodeDomains
}

/** Une liaison de touche, telle qu'un fichier l'écrit, une fois relue. */
export interface KeyBinding {
  /** L'entier tel qu'il est écrit dans le fichier. */
  raw: number
  /** Vrai quand aucune touche n'est affectée (`-1`). */
  unset: boolean
  /** Le code de touche Android, une fois le bit de modificateur ôté. */
  code: number
  /** Nom `KEYCODE_*`, ou `null` si l'API relevée ne connaît pas ce code. */
  name: string | null
  /**
   * Le bit `0x01000000` est posé. Nous le lisons comme un **appui long** — voir
   * `LONG_PRESS_BIT_BASIS` : c'est une déduction, pas une lecture du bytecode.
   */
  modified: boolean
}

/**
 * Sur quelle base nous lisons le bit `0x01000000` comme un appui long. `'inferred'`,
 * et il n'y a pas d'autre valeur : le jour où le bytecode le dira, ce sera une
 * constante différente.
 */
export const LONG_PRESS_BIT_BASIS = 'inferred' as const

/** Les domaines chargés, avec de quoi les interroger. */
export class PreferenceDomainCatalog {
  constructor(readonly domains: PreferenceDomains) {}

  /** L'alphabet des codes d'unité. Ce n'est pas le domaine d'une clé donnée. */
  unitVocabulary(): readonly string[] {
    return this.domains.units.vocabulary
  }

  /**
   * Le domaine de valeurs de cette clé d'unité — **toujours `null`**, y compris pour
   * une clé connue. La méthode existe pour que l'appelant se pose la question et
   * reçoive une réponse honnête, plutôt que de trouver un tableau vide et le prendre
   * pour un domaine sans valeur permise.
   */
  unitDomain(key: string): string[] | null {
    return this.domains.units.keys[key]?.domain ?? null
  }

  /** Les valeurs qu'un fichier réel porte pour cette clé d'unité. Peut être vide. */
  unitObserved(key: string): readonly string[] {
    return this.domains.units.keys[key]?.observed ?? []
  }

  /** Vrai si cette clé est l'une des `Unit.*` que le relevé le plus récent déclare. */
  isUnitKey(key: string): boolean {
    return key in this.domains.units.keys
  }

  /** Vrai si cette clé est l'une des liaisons de touche (`control: action`). */
  isKeyBindingKey(key: string): boolean {
    return key in this.domains.keyCodes.keys
  }

  /** Le nom `KEYCODE_*` d'un code, ou `null` si l'API relevée ne le connaît pas. */
  keyCodeName(code: number): string | null {
    return this.domains.keyCodes.codes[String(code)] ?? null
  }

  /**
   * Relit la valeur d'une liaison de touche. Voir `KeyBinding` : le bit de
   * modificateur est **déduit**, et l'interface doit le dire.
   */
  decodeKeyBinding(raw: number): KeyBinding {
    const { longPressBit, unsetValue } = this.domains.keyCodes
    if (raw === unsetValue) {
      return { raw, unset: true, code: raw, name: null, modified: false }
    }
    const modified = raw >= 0 && (raw & longPressBit) !== 0
    const code = modified ? raw & ~longPressBit : raw
    return { raw, unset: false, code, name: this.keyCodeName(code), modified }
  }

  /**
   * Toutes les touches connues, du code le plus petit au plus grand. Une interface qui
   * en fait une liste doit se souvenir que XCTrack accepte ce que l'appareil émet :
   * cette liste **nomme** les codes, elle ne borne pas ce qui est permis.
   */
  keyCodes(): Array<{ code: number, name: string }> {
    return Object.entries(this.domains.keyCodes.codes)
      .map(([code, name]) => ({ code: Number(code), name }))
      .sort((a, b) => a.code - b.code)
  }
}

/**
 * Charge les domaines. Un `import()` au chemin littéral : Vite en tire un morceau
 * séparé, qui ne rejoint pas le morceau principal. Deux appels partagent la même
 * requête — et l'échec est oublié pour qu'un appel ultérieur puisse retenter.
 */
let loading: Promise<PreferenceDomainCatalog> | undefined

export function loadPreferenceDomains(): Promise<PreferenceDomainCatalog> {
  if (loading !== undefined) return loading
  const started = import('./preferenceDomains.json')
    .then((module) => new PreferenceDomainCatalog(
      module.default as unknown as PreferenceDomains,
    ))
    .catch((error: unknown) => {
      loading = undefined
      throw error
    })
  loading = started
  return started
}
