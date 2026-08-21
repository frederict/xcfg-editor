import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { decode, getMember } from '../../src/core/access'
import { parseJson } from '../../src/core/parseJson'
import { serializeJson } from '../../src/core/serializeJson'
import type { JsonNode } from '../../src/core/jsonDocument'
import {
  loadPreferenceCatalog,
  type PreferenceCatalog
} from '../../src/catalog/preferenceCatalog'
import {
  applyPattern,
  buildPreferenceInventory,
  editRefusal,
  isPresentable,
  openPreferencesPage,
  renderPreferencesPage,
  sameAsDefault,
  stateLabel,
  tallyText,
  writePreference,
  writesString,
  type PreferenceEdit,
  type PreferenceRow
} from '../../src/ui/preferencesPage'
import {
  BACKUP_2025, BACKUP_2026, FORMES_PRESERVEES, GSON_2022, PAGES_2026
} from '../fixtures/paths'

/**
 * Tout se joue sur les trois fichiers réels du dépôt : la sauvegarde de la version
 * courante, celle d'une version d'il y a un an — 27 clés que le catalogue ne connaît
 * pas — et un export `pages`, qui ne porte aucune préférence. Une page de consultation
 * ne se juge pas sur des données inventées : ce qu'on veut vérifier, c'est qu'elle dit
 * juste sur les octets que l'appareil a écrits.
 */
let catalog: PreferenceCatalog

beforeAll(async () => {
  catalog = await loadPreferenceCatalog('fr')
})

function documentOf(path: string): JsonNode {
  return parseJson(readFileSync(path, 'utf8'))
}

function inventoryOf(path: string) {
  return buildPreferenceInventory(documentOf(path), catalog)
}

function allRows(path: string): PreferenceRow[] {
  const inventory = inventoryOf(path)
  const rows: PreferenceRow[] = []
  for (const entry of inventory.menu) {
    for (const screen of entry.screens) {
      for (const block of screen.blocks) rows.push(...block.rows)
    }
  }
  return [...rows, ...inventory.leftovers]
}

function rowFor(path: string, key: string): PreferenceRow {
  const row = allRows(path).find((one) => one.key === key)
  if (row === undefined) throw new Error(`ligne absente : ${key}`)
  return row
}

/* ------------------------------------------------- la structure vient de l'appareil */

describe('la page reprend le menu de réglages de l’appareil', () => {
  it('suit l’ordre du menu racine, sans en perdre une ligne', () => {
    const root = catalog.screen('preferences')
    expect(root).toBeDefined()
    const menu = inventoryOf(BACKUP_2026).menu
    expect(menu).toHaveLength(root!.rows.length)
    expect(menu.map((entry) => entry.menuKey)).toEqual(root!.rows.map((row) => row.key ?? ''))
  })

  it('nomme les entrées du menu dans la langue demandée', () => {
    const menu = inventoryOf(BACKUP_2026).menu
    const titles = new Map(menu.map((entry) => [entry.menuKey, entry.title]))
    expect(titles.get('_display')).toBe('Affichage')
    expect(titles.get('_airspaces')).toBe('Espaces aériens et obstacles')
    expect(titles.get('_pilot')).toBe('Pilote et comptes')
  })

  /**
   * Le lien d'une ligne du menu vers l'écran qu'elle ouvre est **déduit du nom de la
   * ressource** : il n'est écrit nulle part dans l'APK. Ce test est le garde-fou de cette
   * déduction. Une version de XCTrack qui ajouterait un écran de réglages le ferait
   * échouer ici, plutôt que de laisser cet écran disparaître de la page sans bruit.
   */
  it('rattache chaque écran du catalogue à une entrée du menu, une fois et une seule', () => {
    const attached = inventoryOf(BACKUP_2026).menu.flatMap((entry) => entry.screens.map((s) => s.id))
    // Les écrans qu'aucun réglage exportable ne remplit ne sont pas construits : on
    // compare donc sur l'ensemble des identifiants connus, pas sur ceux qui s'affichent.
    const known = catalog.screens.map((screen) => screen.id).filter((id) => id !== 'preferences')
    for (const id of attached) expect(known).toContain(id)
    expect(new Set(attached).size).toBe(attached.length)
  })

  it('donne à un sous-écran son propre titre, et non celui de l’entrée qui le coiffe', () => {
    const display = inventoryOf(BACKUP_2026).menu.find((entry) => entry.menuKey === '_display')
    expect(display?.screens.map((screen) => screen.title)).toEqual(['Affichage', 'Unités'])
    const sound = inventoryOf(BACKUP_2026).menu.find((entry) => entry.menuKey === '_sound')
    expect(sound?.screens.map((screen) => screen.title)).toEqual(['Son et alertes', 'Vario sonore'])
  })

  it('conserve les catégories de l’écran, dans leur ordre', () => {
    const live = inventoryOf(BACKUP_2026).menu.find((entry) => entry.menuKey === '_livetracking')
    const titles = live?.screens[0]?.blocks.map((block) => block.title)
    expect(titles).toEqual(['XContest Livetracking', 'Conspicuité électronique'])
  })
})

/* --------------------------------------------------- absente n'est pas « au défaut » */

describe('« absente » et « réglée au défaut » sont deux choses différentes', () => {
  it('sépare les deux dans le compte', () => {
    const { summary } = inventoryOf(BACKUP_2026)
    expect(summary.defaultCount).toBeGreaterThan(0)
    // Le fichier de 2026 vient de la version même du catalogue : il porte tout ce que
    // XCTrack y écrit, et ne laisse « absente » que les clés des écrans cachés.
    expect(summary.absentCount).toBe(0)
    expect(summary.unwrittenCount).toBeGreaterThan(0)
  })

  it('marque « absente » une clé que ce fichier-là ne porte pas', () => {
    // `Sensor.AcousticVario.DynamicFreq` est apparue après 0.9.12.3 : la sauvegarde de
    // 2025 ne la porte pas, celle de 2026 si.
    const { summary } = inventoryOf(BACKUP_2025)
    expect(summary.absentCount).toBeGreaterThan(0)
    const absent = allRows(BACKUP_2025).filter((row) => row.state === 'absent')
    for (const row of absent) expect(row.value).toBeUndefined()
  })

  it('dit ce que XCTrack appliquera à la place, sans le confondre avec une valeur', () => {
    const absent = allRows(BACKUP_2025).find((row) => row.state === 'absent')
    expect(absent).toBeDefined()
    expect(stateLabel(absent!)).toBe('absente du fichier')
    expect(absent!.value).toBeUndefined()
  })

  it('distingue « jamais écrite » d’« absente » pour les clés qu’Android n’écrit qu’une fois réglées', () => {
    // `_ttsSpeed` n'est pas déclarée par la classe de configuration : son absence ne dit
    // même pas quel défaut s'appliquera.
    const row = rowFor(BACKUP_2026, '_ttsSpeed')
    expect(row.state).toBe('unwritten')
    expect(stateLabel(row)).toBe('jamais écrite')
  })

  it('ne compte jamais comme manquante une clé que l’export ne porte jamais', () => {
    // Les identifiants sont chiffrés : leur absence est la règle, pas un manque.
    const rows = allRows(BACKUP_2026).map((row) => row.key)
    expect(rows).not.toContain('XContest.Password')
    expect(inventoryOf(BACKUP_2026).summary.neverExportedCount).toBeGreaterThan(0)
  })
})

/* --------------------------------------------- ce que la page ne sait pas présenter */

describe('les clés que la page ne sait pas présenter restent visibles', () => {
  it('ne perd aucune clé du fichier', () => {
    for (const path of [BACKUP_2026, BACKUP_2025]) {
      const document = documentOf(path)
      const section = (document as { entries: Array<[string, JsonNode]> }).entries
        .find(([key]) => key === '"preferences"')?.[1]
      const fileKeys = section?.kind === 'object'
        ? section.entries.map(([key]) => JSON.parse(key) as string)
        : []
      const shown = new Set(allRows(path).map((row) => row.key))
      for (const key of fileKeys) expect(shown.has(key), `${key} disparue`).toBe(true)
    }
  })

  it('range chaque reliquat sous une raison, et jamais sous « supprimable »', () => {
    const leftovers = inventoryOf(BACKUP_2025).leftovers
    expect(leftovers.length).toBeGreaterThan(0)
    for (const row of leftovers) {
      expect(['unlabelled', 'state', 'unknown']).toContain(row.reason)
    }
  })

  it('reconnaît les 27 clés d’une autre version comme inconnues, non comme négligeables', () => {
    const { summary } = inventoryOf(BACKUP_2025)
    expect(summary.unknownCount).toBe(27)
    const unknown = inventoryOf(BACKUP_2025).leftovers.filter((row) => row.reason === 'unknown')
    for (const row of unknown) {
      expect(row.labelled).toBe(false)
      expect(row.undecidableReason).toContain('ne connaît pas cette clé')
    }
    // Le fichier de la version courante n'en porte aucune : la mesure n'est pas un biais
    // de l'analyse, c'est bien l'écart entre deux versions.
    expect(inventoryOf(BACKUP_2026).summary.unknownCount).toBe(0)
  })

  it('garde la valeur et la comparaison au défaut pour un réglage sans libellé', () => {
    // `Airspace.LabelsZoom` : le catalogue en connaît le défaut (21) mais aucun écran ne
    // la nomme. Elle vaut 31 dans le fichier ; la comparaison reste juste.
    const row = rowFor(BACKUP_2026, 'Airspace.LabelsZoom')
    expect(row.reason).toBe('unlabelled')
    expect(row.labelled).toBe(false)
    expect(row.label).toBe('Airspace.LabelsZoom')
    expect(row.value).toBe('31')
    expect(row.state).toBe('custom')
    expect(row.defaultText).toBe('21')
  })

  it('mesure ce que porte l’écran des espaces aériens plutôt que de le taire', () => {
    const airspaces = inventoryOf(BACKUP_2026).menu.find((entry) => entry.menuKey === '_airspaces')
    expect(airspaces?.screens).toHaveLength(0)
    expect(airspaces?.note).toContain('construit cet écran en code')
    // 18 clés `Airspace.*` et 3 `Obstacles.*`, dont une seule porte un libellé.
    expect(airspaces?.tally).toEqual({ total: 21, labelled: 1 })
    expect(tallyText(airspaces!.tally!)).toContain('une seule porte un libellé')
  })
})

/* ------------------------------------------ l'état sérialisé : la taille, pas le contenu */

describe('l’état sérialisé se dit sans se déplier', () => {
  it('classe comme état ce que le fichier écrit en objet ou en tableau', () => {
    const row = rowFor(BACKUP_2026, 'Sounds')
    expect(row.reason).toBe('state')
    expect(row.structured).toBe(true)
    expect(row.value).toMatch(/^objet JSON, [\d\u202f\u00a0 ]+ caractères$/)
  })

  it('ne montre jamais le contenu de Navigation.State, seulement son poids', () => {
    const row = rowFor(BACKUP_2026, 'Navigation.State')
    expect(row.reason).toBe('state')
    expect(row.value).not.toContain('TaskBackToTakeoff')
    // Le compte est celui des caractères que le fichier consacre à cette valeur, à
    // l'indentation de la section `preferences`.
    const document = documentOf(BACKUP_2026)
    const preferences = (document as { entries: Array<[string, JsonNode]> }).entries
      .find(([key]) => key === '"preferences"')?.[1]
    const node = preferences?.kind === 'object'
      ? preferences.entries.find(([key]) => key === '"Navigation.State"')?.[1]
      : undefined
    expect(row.value).toContain(serializeJson(node!, '    ').length.toLocaleString('fr-FR'))
  })

  it('laisse en réglage une clé déclarée « json » qui porte en fait un scalaire', () => {
    // `Mapsforge.Terrain` est déclarée `json` dans le bytecode et vaut `"None"` dans les
    // deux fichiers du corpus : c'est le type du fichier qui tranche.
    const row = rowFor(BACKUP_2026, 'Mapsforge.Terrain')
    expect(row.reason).toBe('unlabelled')
    expect(row.structured).toBe(false)
    expect(row.value).toBe('None')
  })
})

/* --------------------------------------------------- les défauts, y compris douteux */

describe('la comparaison au défaut dit ce qu’elle vaut', () => {
  it('compare le texte, puis le nombre', () => {
    expect(sameAsDefault('true', true)).toBe(true)
    expect(sameAsDefault('1013.0', 1013)).toBe(true)
    expect(sameAsDefault('140', '100')).toBe(false)
    expect(sameAsDefault('500', '500')).toBe(true)
    expect(sameAsDefault('', '')).toBe(true)
    // Deux chaînes vides restent égales sans passer par `Number('')`, qui vaut 0.
    expect(sameAsDefault('', 0)).toBe(false)
  })

  it('ne choisit pas entre deux défauts que XCTrack publie contradictoires', () => {
    expect(catalog.meta.defaultConflicts).toContain('Sensors.ManualQnh')
    const row = rowFor(BACKUP_2026, 'Sensors.ManualQnh')
    expect(row.state).toBe('conflict')
    expect(row.defaultText).toBe('1013 HPa')
    expect(row.otherDefaultText).toBe('1013.25 HPa')
    expect(stateLabel(row)).toBe('défauts contradictoires 1013 HPa / 1013.25 HPa')
  })

  it('suspend la comparaison quand le défaut dépend de la locale', () => {
    const row = rowFor(BACKUP_2026, 'Unit.Altitude')
    expect(row.state).toBe('undecidable')
    expect(row.value).toBe('m')
    expect(row.undecidableReason).toContain('la langue et du pays de l’appareil')
    expect(row.defaultText).toBeUndefined()
  })

  it('dit la valeur dans la langue du pilote, et le défaut de la même façon', () => {
    const theme = rowFor(BACKUP_2026, 'Display.Theme')
    expect(theme.value).toBe('Haut contraste blanc')
    expect(theme.defaultText).toBe('Blanc')
    expect(stateLabel(theme)).toBe('≠ défaut Blanc')

    const bool = rowFor(BACKUP_2026, 'Display.Fullscreen')
    expect(bool.value).toBe('Oui')

    const color = rowFor(BACKUP_2026, 'Display.WidgetTitleColor')
    expect(color.value).toBe('#f44336')

    // Une touche non attribuée : « -1 » ne dit rien, « aucune touche » dit tout.
    expect(rowFor(BACKUP_2026, 'Keys.EnterPan').value).toBe('aucune touche')
    expect(rowFor(BACKUP_2026, 'Keys.ZoomIn').value).toBe('code 24')
  })

  it('substitue la valeur dans les gabarits de ressource Android', () => {
    expect(applyPattern('(50 à 200%%): %d%%', '120')).toBe('(50 à 200%): 120%')
    expect(applyPattern('tonalité (0,5 – 2,0) : %.1f', undefined)).toBe('tonalité (0,5 – 2,0) : …')
  })
})

/* --------------------------------------------------------- les données personnelles */

describe('la page signale ce qui est sensible', () => {
  it('relève les clés personnelles du fichier, avec leur nature', () => {
    const inventory = inventoryOf(BACKUP_2026)
    expect(inventory.summary.personalCount).toBe(16)
    const keys = inventory.personal.map((row) => row.key)
    expect(keys).toContain('Pilot.Name')
    expect(keys).toContain('Navigation.State')
    for (const row of inventory.personal) expect(row.personal).toBeDefined()
  })

  it('ne compte comme personnel que ce que le fichier porte vraiment', () => {
    // `App.GuessLatitude` est interne à l'appareil : aucun export ne la porte.
    const keys = inventoryOf(BACKUP_2026).personal.map((row) => row.key)
    expect(keys).not.toContain('App.GuessLatitude')
    expect(catalog.preference('App.GuessLatitude')?.scope).toBe('INTERNAL')
  })
})

/* --------------------------------------------------------------- le fichier sans rien */

describe('un fichier sans préférence le dit', () => {
  it('ne présente ni écran ni manque pour un export « pages »', () => {
    const inventory = inventoryOf(PAGES_2026)
    expect(inventory.summary.empty).toBe(true)
    expect(inventory.summary.fileKeyCount).toBe(0)
    expect(inventory.summary.absentCount).toBe(0)
    expect(inventory.menu).toHaveLength(0)
    expect(inventory.leftovers).toHaveLength(0)
  })

  it('affiche une explication et non un écran vide', () => {
    const page = renderPreferencesPage({ document: documentOf(PAGES_2026), catalog })
    expect(page.element.textContent).toContain('ne porte aucune préférence générale')
    expect(page.element.querySelectorAll('.prefs__row')).toHaveLength(0)
  })
})

/* ------------------------------------------------------------ lecture seule, vraiment */

describe('la page est en lecture seule, et pas seulement grisée', () => {
  it('ne construit aucun contrôle de formulaire lié à une préférence', () => {
    const page = renderPreferencesPage({ document: documentOf(BACKUP_2026), catalog })
    expect(page.element.querySelectorAll('select')).toHaveLength(0)
    expect(page.element.querySelectorAll('textarea')).toHaveLength(0)
    // Le seul `input` admis est le champ de filtrage, qui ne touche pas au document.
    const inputs = [...page.element.querySelectorAll('input')]
    expect(inputs).toHaveLength(1)
    expect(inputs[0]?.type).toBe('search')
    // Les seuls boutons sont des commandes d'affichage.
    for (const button of page.element.querySelectorAll('button')) {
      expect(['Seulement ce que le pilote a réglé', 'Masquer les valeurs personnelles'])
        .toContain(button.textContent)
    }
    expect(page.element.dataset.mode).toBe('lecture')
  })

  it('masque les valeurs personnelles à l’écran sans les retirer de nulle part', () => {
    const page = renderPreferencesPage({ document: documentOf(BACKUP_2026), catalog })
    const mask = page.element.querySelector<HTMLButtonElement>('.prefs__mask')
    expect(mask).not.toBeNull()

    const secret = page.element.querySelector<HTMLElement>('.prefs__value--secret')
    expect(secret).not.toBeNull()
    expect(secret!.dataset.clear).toBe(secret!.textContent)

    mask!.click()
    expect(page.element.classList.contains('prefs--masked')).toBe(true)
    expect(mask!.getAttribute('aria-pressed')).toBe('true')
    // Le masquage est une règle de style : la valeur reste dans le DOM, donc dans le
    // presse-papier et dans le fichier. Rien n'est effacé, seulement couvert.
    expect(secret!.textContent).toBe(secret!.dataset.clear)

    mask!.click()
    expect(page.element.classList.contains('prefs--masked')).toBe(false)
  })

  it('laisse le document intact, à l’octet près', () => {
    const source = readFileSync(BACKUP_2026, 'utf8')
    const document = parseJson(source)
    const page = renderPreferencesPage({ document, catalog })
    page.filter('thème')
    page.close()
    expect(serializeJson(document)).toBe(source)
  })
})

/* ------------------------------------------------------- ce dont l'assembleur dispose */

describe('l’interface offerte à l’assembleur', () => {
  it('ouvre la page en chargeant le catalogue lui-même', async () => {
    const page = await openPreferencesPage({
      document: documentOf(BACKUP_2026),
      language: 'fr',
      fileName: 'essai.xcfg',
      fileVersionCode: 100030,
      fileVersionName: '1.0.3-beta'
    })
    expect(page.element.textContent).toContain('essai.xcfg')
    expect(page.summary.fileKeyCount).toBe(136)
  })

  it('ne construit un bouton de fermeture que si l’appelant en veut un', () => {
    const plain = renderPreferencesPage({ document: documentOf(BACKUP_2026), catalog })
    expect(plain.element.querySelector('.prefs__close')).toBeNull()

    let closed = 0
    const page = renderPreferencesPage({
      document: documentOf(BACKUP_2026), catalog, onClose: () => { closed += 1 }
    })
    const button = page.element.querySelector<HTMLButtonElement>('.prefs__close')
    expect(button).not.toBeNull()
    document.body.append(page.element)
    button!.click()
    expect(closed).toBe(1)
    expect(page.element.isConnected).toBe(false)
    // Fermer deux fois ne prévient qu'une fois : l'appelant n'a pas à s'en garder.
    page.close()
    expect(closed).toBe(1)
  })

  it('filtre sur le libellé comme sur la clé, accents compris', () => {
    const page = renderPreferencesPage({ document: documentOf(BACKUP_2026), catalog })
    const visible = (): number =>
      [...page.element.querySelectorAll<HTMLElement>('.prefs__row')].filter((row) => !row.hidden).length
    const total = visible()
    expect(total).toBeGreaterThan(100)

    page.filter('theme')
    const byLabel = visible()
    expect(byLabel).toBeGreaterThan(0)
    expect(byLabel).toBeLessThan(total)

    page.filter('Airspace.')
    expect(visible()).toBeGreaterThan(10)

    page.filter('')
    expect(visible()).toBe(total)
  })

  it('situe le catalogue par rapport à la version du fichier', () => {
    const same = renderPreferencesPage({
      document: documentOf(BACKUP_2026), catalog, fileVersionCode: 100030
    })
    expect(same.element.textContent).toContain('la version même de ce fichier')

    const older = renderPreferencesPage({
      document: documentOf(BACKUP_2025), catalog,
      fileVersionCode: 91230, fileVersionName: '0.9.12.3'
    })
    expect(older.element.textContent).toContain('la lecture est donc indicative')

    const unstated = renderPreferencesPage({ document: documentOf(BACKUP_2025), catalog })
    expect(unstated.element.textContent).toContain('ne dit pas de quelle version il vient')
  })
})

/* ---------------------------------------------------------------------- la feuille de style */

/**
 * Garde-fou textuel sur `preferences.css`, sur le modèle de `tests/ui/appStyle.test.ts` :
 * happy-dom ne calcule pas la cascade d'une feuille externe, et le seul contrôle
 * automatisable est la relecture de la règle.
 */
describe('preferences.css reste dans le cadre du projet', () => {
  // `fileURLToPath` sur une chaîne, jamais sur un `new URL(...)` : happy-dom remplace
  // le `URL` global par le sien, que `node:url` refuse. Même piège que `fixtures/paths.ts`.
  const here = dirname(fileURLToPath(import.meta.url))
  const css = readFileSync(join(here, '../../src/ui/preferences.css'), 'utf8')
  /** Les règles seules : les commentaires citent les jetons pour dire qu'on n'y touche pas. */
  const rules = css.replace(/\/\*[\s\S]*?\*\//g, '')

  it('ne redéfinit aucun jeton du cadre ni du rendu d’instrument', () => {
    // Les `--app-*` sont posés par `app.css` et suivent `prefers-color-scheme` ; les
    // `--xc-*` appartiennent à l'écran de l'instrument, qui reste clair en toute
    // circonstance. Cette feuille les consomme, elle n'en écrit aucun.
    expect(rules).not.toMatch(/^\s*--app-[a-z-]+:/m)
    expect(rules).not.toMatch(/--xc-/)
    // Elle ne pose pas non plus sa propre règle de thème sombre : la couleur vient des
    // jetons, donc une seule source décide du thème.
    expect(rules).not.toContain('prefers-color-scheme')
  })

  it('couvre la valeur personnelle au lieu de la retirer', () => {
    expect(css).toContain('.prefs--masked .prefs__value--secret')
    expect(css).toContain("content: '••••••'")
  })
})

/* ------------------------------------------------------------------- le filtre du présentable */

describe('ce que la page accepte de présenter sous un libellé', () => {
  it('exige un libellé et un contrôle', () => {
    expect(isPresentable(catalog, 'Display.Theme')).toBe(true)
    expect(isPresentable(catalog, 'Airspace.LabelsZoom')).toBe(false)
    expect(isPresentable(catalog, 'Navigation.State')).toBe(false)
    expect(isPresentable(catalog, 'CleQuiNExistePas')).toBe(false)
  })

  /**
   * `declared` n'entre pas dans le filtre : une clé qu'Android persiste seul porte un
   * libellé, un contrôle et parfois une liste de valeurs. L'écarter la ferait
   * disparaître d'une page qui part du fichier.
   *
   * ⚠️ `SafeSky.Interval` a longtemps servi d'exemple ici : on la croyait persistée par
   * Android depuis l'écran. L'extraction a depuis appris à lire les préférences dont la
   * clé est posée par leur constructeur, et celle-là est bien déclarée, bien `PUBLIC`.
   * Elle reste dans ce test — c'est elle qui est dans le fichier réel — mais comme le
   * cas *déclaré*, aux côtés de deux clés qui, elles, ne le sont pas.
   */
  it('garde les réglages qu’Android persiste seul', () => {
    for (const key of ['_ttsSpeed', '_ttsPitch']) {
      expect(catalog.preference(key)?.declared, key).toBe(false)
      expect(isPresentable(catalog, key), key).toBe(true)
    }
    expect(catalog.preference('SafeSky.Interval')?.declared).toBe(true)
    expect(isPresentable(catalog, 'SafeSky.Interval')).toBe(true)
    const row = rowFor(BACKUP_2026, 'SafeSky.Interval')
    expect(row.labelled).toBe(true)
    expect(row.value).toBe('5 secondes')
  })
})

/* ============================================================== l'écriture des réglages */

/**
 * Tout ce bloc part des mêmes octets que le reste du fichier : les trois exports réels
 * et les deux fichiers de formes. **La fidélité ne se démontre pas sur des données
 * inventées** — c'est la promesse centrale du projet, et c'est ce qu'un pilote demande
 * avant de confier sa configuration.
 */
function editable(path: string): {
  source: string
  document: JsonNode
  page: ReturnType<typeof renderPreferencesPage>
  edits: PreferenceEdit[]
} {
  const source = readFileSync(path, 'utf8')
  const document = parseJson(source)
  const edits: PreferenceEdit[] = []
  const page = renderPreferencesPage({
    document, catalog, onEdit: (edit) => { edits.push(edit) }
  })
  return { source, document, page, edits }
}

function rowElement(page: ReturnType<typeof renderPreferencesPage>, key: string): HTMLElement {
  const found = page.element.querySelector<HTMLElement>(`.prefs__row[data-key="${key}"]`)
  if (found === null) throw new Error(`ligne absente de la page : ${key}`)
  return found
}

function controlOf<T extends HTMLElement>(
  page: ReturnType<typeof renderPreferencesPage>, key: string, selector: string
): T {
  const found = rowElement(page, key).querySelector<T>(selector)
  if (found === null) throw new Error(`contrôle « ${selector} » absent pour ${key}`)
  return found
}

/** La seule plage de texte qui diverge entre deux sérialisations — voir `mutations.test.ts`. */
function singleDifference(a: string, b: string): { before: string; after: string } {
  let start = 0
  while (start < a.length && start < b.length && a[start] === b[start]) start++
  let end = 0
  while (end < a.length - start && end < b.length - start
    && a[a.length - 1 - end] === b[b.length - 1 - end]) end++
  return { before: a.slice(start, a.length - end), after: b.slice(start, b.length - end) }
}

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

/** Toutes les lignes présentées dans un écran, tous menus confondus. */
function screenRows(path: string): PreferenceRow[] {
  const rows: PreferenceRow[] = []
  for (const entry of inventoryOf(path).menu) {
    for (const screen of entry.screens) {
      for (const block of screen.blocks) rows.push(...block.rows)
    }
  }
  return rows
}

describe('la page ne se modifie que si on le lui demande', () => {
  it('reste sans le moindre contrôle quand l’assembleur ne branche pas d’écriture', () => {
    const page = renderPreferencesPage({ document: documentOf(BACKUP_2026), catalog })
    expect(page.editable).toBe(false)
    expect(page.element.dataset.mode).toBe('lecture')
    expect(page.element.querySelectorAll('select')).toHaveLength(0)
    expect(page.element.querySelectorAll('.prefs__adopt')).toHaveLength(0)
  })

  it('construit les contrôles dès qu’une écriture est branchée', () => {
    const { page } = editable(BACKUP_2026)
    expect(page.editable).toBe(true)
    expect(page.element.dataset.mode).toBe('edition')
    expect(page.element.querySelectorAll('select').length).toBeGreaterThan(0)
  })

  it('ne rend pas modifiable un fichier qui ne porte aucune préférence', () => {
    // Un export « pages » n'a pas de section `preferences` : y écrire la créerait, et
    // fabriquer une section qu'un export « pages » ne porte jamais serait inventer.
    const { page } = editable(PAGES_2026)
    expect(page.editable).toBe(false)
    expect(page.element.dataset.mode).toBe('lecture')
  })
})

describe('ce qui se règle, et ce qui ne se règle pas', () => {
  it('offre un contrôle aux 77 lignes présentables du fichier de référence', () => {
    const rows = screenRows(BACKUP_2026)
    const settable = rows.filter((row) => editRefusal(row) === undefined)
    expect(rows).toHaveLength(93)
    expect(settable).toHaveLength(77)
  })

  it('refuse les seize lignes qui ouvrent une boîte sur l’appareil, et le dit', () => {
    const refused = screenRows(BACKUP_2026).filter((row) => editRefusal(row) !== undefined)
    expect(refused).toHaveLength(16)
    // Toutes de contrôle `action` : quinze touches et la table du vario sonore.
    expect(new Set(refused.map((row) => row.control))).toEqual(new Set(['action']))

    const { page } = editable(BACKUP_2026)
    const row = rowElement(page, 'Keys.Menu')
    expect(row.querySelector('input, select')).toBeNull()
    expect(row.dataset.settable).toBe('false')
    expect(row.querySelector<HTMLElement>('.prefs__cell')?.title).toContain('boîte de dialogue')
    // La phrase est écrite une fois par bloc, pas quinze fois de suite.
    const ecran = page.element.querySelector('.prefs__screen[data-screen="preferences_keybindings"]')
    const notes = ecran?.querySelectorAll('.prefs__refusal') ?? []
    expect(notes).toHaveLength(1)
    expect(notes[0]?.textContent).toContain('15 réglages de ce bloc ne se règlent pas ici')
    // La valeur reste lue, comme avant : ne pas pouvoir la changer n'est pas la cacher.
    expect(row.querySelector('.prefs__value')?.textContent).toBe('aucune touche')
  })

  it('ne construit aucun contrôle pour une valeur JSON imbriquée', () => {
    const { page } = editable(BACKUP_2026)
    for (const key of ['Sounds', 'Navigation.State', 'Sound.AcousticVario.CustomProfile']) {
      const row = rowElement(page, key)
      expect(row.querySelector('input, select'), key).toBeNull()
    }
  })

  it('ne construit aucun contrôle pour les reliquats de fin de page', () => {
    const { page } = editable(BACKUP_2026)
    for (const section of page.element.querySelectorAll('.prefs__leftover')) {
      expect(section.querySelectorAll('input, select, button')).toHaveLength(0)
    }
    // Elles restent toutes affichées : l'écriture ne fait rien disparaître.
    expect(page.element.querySelectorAll('.prefs__leftover .prefs__row')).toHaveLength(49)
  })

  it('donne un champ texte, jamais une liste, aux huit unités sans domaine relevé', () => {
    const { page } = editable(BACKUP_2026)
    const unites = catalog.keys().filter((key) => key.startsWith('Unit.'))
      .filter((key) => catalog.values(key).length === 0)
    expect(unites).toHaveLength(8)
    for (const key of ['Unit.Altitude', 'Unit.Speed', 'Unit.VerticalSpeed']) {
      expect(rowElement(page, key).querySelector('select'), key).toBeNull()
      const field = controlOf<HTMLInputElement>(page, key, 'input.prefs__text')
      expect(field.type).toBe('text')
      expect(field.title).toContain('XCTrack remplit cette liste en code')
    }
  })

  it('propose la liste de l’écran quand le catalogue en relève une', () => {
    const { page } = editable(BACKUP_2026)
    const select = controlOf<HTMLSelectElement>(page, 'Display.Theme', 'select')
    expect(select.value).toBe('WhiteHCTheme')
    expect([...select.options].map((option) => option.value))
      .toEqual(catalog.values('Display.Theme').map((choice) => choice.value))
  })
})

describe('les quatre preuves de fidélité', () => {
  it('1. une préférence modifiée ne change que sa propre valeur', () => {
    const { source, document, page } = editable(BACKUP_2026)
    const select = controlOf<HTMLSelectElement>(page, 'Display.Theme', 'select')
    select.value = 'BlackTheme'
    select.dispatchEvent(new Event('change'))

    const after = serializeJson(document)
    // Une seule plage diverge, et elle tient dans la valeur : « WhiteHCTheme » devient
    // « BlackTheme », le suffixe commun « Theme » n'est même pas réécrit.
    const difference = singleDifference(source, after)
    expect(difference).toEqual({ before: 'WhiteHC', after: 'Black' })
    // 12 caractères touchés sur les 78 639 du fichier, dont 2 de moins à l'arrivée.
    expect(difference.before.length + difference.after.length).toBe(12)
    expect(source.length).toBe(78639)
    expect(source.length - after.length).toBe(2)
  })

  it('2. remettre la valeur d’origine rend la même empreinte SHA-256', () => {
    const { source, document, page, edits } = editable(BACKUP_2026)
    const select = controlOf<HTMLSelectElement>(page, 'Display.Theme', 'select')

    select.value = 'BlackTheme'
    select.dispatchEvent(new Event('change'))
    expect(serializeJson(document)).not.toBe(source)

    select.value = 'WhiteHCTheme'
    select.dispatchEvent(new Event('change'))

    expect(serializeJson(document)).toBe(source)
    expect(sha256(serializeJson(document))).toBe(sha256(source))
    expect(edits.map((edit) => edit.text)).toEqual(['BlackTheme', 'WhiteHCTheme'])
  })

  it('3. les valeurs imbriquées ressortent caractère pour caractère', () => {
    const { source, document, page } = editable(BACKUP_2026)
    const box = controlOf<HTMLInputElement>(page, 'SafeSky.Enabled', 'input[type="checkbox"]')
    box.checked = !box.checked
    box.dispatchEvent(new Event('change'))

    const after = serializeJson(document)
    for (const key of ['Sounds', 'Navigation.State', 'Sound.AcousticVario.CustomProfile',
      'Sensors.Configuration', 'Maverick.Layout']) {
      const cut = (text: string): string => {
        const start = text.indexOf(`"${key}": `)
        expect(start, key).toBeGreaterThan(0)
        // Jusqu'à la clé suivante du même niveau : quatre espaces de marge.
        const end = text.indexOf('\n    "', start + 1)
        return text.slice(start, end === -1 ? undefined : end)
      }
      expect(cut(after), key).toBe(cut(source))
    }
  })

  it('4. les formes délicates survivent à une modification voisine', () => {
    const { source, document, page } = editable(FORMES_PRESERVEES)
    // `Sensors.AcousticVario.BueeLimit` vaut `3.0` dans ce fichier : on règle la clé
    // d'à côté et on vérifie que le zéro décimal est toujours là.
    const field = controlOf<HTMLInputElement>(page, 'Sensors.ManualQnh', 'input')
    field.value = '1020'
    field.dispatchEvent(new Event('input'))

    const after = serializeJson(document)
    expect(after).toContain('"Sensors.AcousticVario.BueeLimit": 3.0')
    // « 1018.8 » devient « 1020 » : le préfixe commun « 10 » n'est pas réécrit, et la
    // plage qui diverge tient en dix caractères sur les 2 083 du fichier.
    expect(singleDifference(source, after)).toEqual({ before: '18.8', after: '20' })
    // Le reste du fichier — l'exposant, le zéro négatif, l'entier au-delà de 2^53, les
    // deux clés de même nom — n'a pas bougé d'un caractère.
    for (const forme of ['1.0E7', '-0.0', '9007199254740993',
      '"_clef_doublee": 1', '"_clef_doublee": 2']) {
      expect(after, forme).toContain(forme)
    }
  })

  it('4 bis. les échappements de Gson traversent une modification', () => {
    const { source, document, page } = editable(GSON_2022)
    const select = controlOf<HTMLSelectElement>(page, 'Display.Theme', 'select')
    select.value = 'BlackTheme'
    select.dispatchEvent(new Event('change'))

    const after = serializeJson(document)
    expect(after).toContain('where are you? I can\\u0027t find you.')
    expect(after).toContain('I\\u0027m coming')
    expect(singleDifference(source, after)).toEqual({ before: 'White', after: 'Black' })

    select.value = 'WhiteTheme'
    select.dispatchEvent(new Event('change'))
    expect(sha256(serializeJson(document))).toBe(sha256(source))
  })
})

describe('écrire sans dégrader — la primitive', () => {
  function section(document: JsonNode): JsonNode {
    const found = getMember(document, 'preferences')
    if (found === undefined) throw new Error('pas de section preferences')
    return found
  }

  it('ne réécrit rien quand la valeur demandée est déjà celle du fichier', () => {
    const source = readFileSync(BACKUP_2026, 'utf8')
    const document = parseJson(source)
    expect(writePreference(document, 'Display.Theme', 'WhiteHCTheme', true)).toBe('unchanged')
    expect(writePreference(document, 'Tweak.VolumePct', '100', false)).toBe('unchanged')
    expect(serializeJson(document)).toBe(source)
  })

  it('préserve `3.0` quand un champ numérique le repose sous la forme `3`', () => {
    const source = readFileSync(FORMES_PRESERVEES, 'utf8')
    const document = parseJson(source)
    // C'est exactement ce qu'un `<input type="number">` rend au clavier : le navigateur
    // normalise son affichage, et écrire ce qu'il rend dégraderait le fichier.
    expect(writePreference(document, 'Sensors.AcousticVario.BueeLimit', '3', false))
      .toBe('unchanged')
    expect(serializeJson(document)).toBe(source)
    expect(sha256(serializeJson(document))).toBe(sha256(source))
  })

  it('insère une clé absente en fin de section, sans réindenter le reste', () => {
    const source = readFileSync(FORMES_PRESERVEES, 'utf8')
    const document = parseJson(source)
    expect(writePreference(document, 'Tweak.VolumeUp', 'true', false)).toBe('inserted')

    const after = serializeJson(document)
    const difference = singleDifference(source, after)
    expect(difference.before).toBe('')
    expect(difference.after).toBe(',\n    "Tweak.VolumeUp": true')
    // La dernière entrée d'origine reste la dernière d'origine : rien n'a été déplacé.
    const entries = section(document)
    expect(entries.kind).toBe('object')
    if (entries.kind === 'object') {
      expect(decode(entries.entries[entries.entries.length - 1]![0])).toBe('Tweak.VolumeUp')
    }
  })

  it('écrit une chaîne ou un littéral selon ce que le fichier porte déjà', () => {
    const document = documentOf(BACKUP_2026)
    // `Display.WidgetTitleSize` est une liste de chaînes : `"140"`, jamais `140`.
    expect(writesString(catalog.preference('Display.WidgetTitleSize'),
      currentOf(document, 'Display.WidgetTitleSize'))).toBe(true)
    expect(writesString(catalog.preference('Tweak.VolumePct'),
      currentOf(document, 'Tweak.VolumePct'))).toBe(false)
    // Clé absente : c'est le type du défaut relevé qui tranche.
    expect(writesString(catalog.preference('Tweak.HWAccel'), undefined)).toBe(true)
    expect(writesString(catalog.preference('Tweak.VolumeUp'), undefined)).toBe(false)
  })

  it('refuse d’écrire dans un document qui n’a pas de section « preferences »', () => {
    const document = documentOf(PAGES_2026)
    expect(() => writePreference(document, 'Display.Theme', 'BlackTheme', true)).toThrow()
  })
})

function currentOf(document: JsonNode, key: string): JsonNode | undefined {
  const found = getMember(document, 'preferences')
  return found === undefined ? undefined : getMember(found, key)
}

describe('une clé absente reste absente tant qu’on ne l’a pas demandée', () => {
  it('ne préremplit aucun contrôle : elle porte un bouton, et il dit ce qu’il fait', () => {
    const { page } = editable(FORMES_PRESERVEES)
    const row = rowElement(page, 'Tweak.VolumeUp')
    expect(row.dataset.state).toBe('absent')
    expect(row.querySelector('input, select')).toBeNull()

    const button = controlOf<HTMLButtonElement>(page, 'Tweak.VolumeUp', 'button.prefs__adopt')
    expect(button.textContent).toBe('Écrire cette clé')
    expect(button.title).toContain('sans changer le comportement de l’appareil')
  })

  it('l’écrit au défaut relevé, puis la ligne devient une ligne comme les autres', () => {
    const { source, document, page, edits } = editable(FORMES_PRESERVEES)
    controlOf<HTMLButtonElement>(page, 'Tweak.VolumeUp', 'button.prefs__adopt').click()

    expect(edits).toHaveLength(1)
    expect(edits[0]?.outcome).toBe('inserted')
    expect(edits[0]?.description).toContain('dans le fichier')
    expect(serializeJson(document)).toBe(
      source.replace('"Comp.AlertBeforeSSS": []', '"Comp.AlertBeforeSSS": [],\n    "Tweak.VolumeUp": true')
    )

    const row = rowElement(page, 'Tweak.VolumeUp')
    expect(row.dataset.state).toBe('default')
    expect(row.querySelector('button.prefs__adopt')).toBeNull()
    expect(row.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(true)
  })

  it('ne propose rien à écrire quand le catalogue n’a pas de valeur de départ', () => {
    const { page } = editable(FORMES_PRESERVEES)
    // Défaut calculé au démarrage selon la langue de l'appareil : il n'y a rien à poser.
    for (const key of ['Unit.CompetitionDistance', '_ttsSpeed']) {
      const row = rowElement(page, key)
      expect(row.querySelector('button.prefs__adopt'), key).toBeNull()
      expect(row.textContent, key).toContain('pas de valeur de départ')
    }
  })

  it('les 60 lignes absentes du fichier de formes restent affichées et comptées', () => {
    const inventory = inventoryOf(FORMES_PRESERVEES)
    const rows = screenRows(FORMES_PRESERVEES)
    const absent = rows.filter((row) => row.state === 'absent' || row.state === 'unwritten')
    expect(absent).toHaveLength(76)
    expect(inventory.summary.absentCount + inventory.summary.unwrittenCount).toBe(76)
    // Sur ces 76, 60 portent un contrôle offrable et 52 une valeur de départ écrivable.
    expect(absent.filter((row) => editRefusal(row) === undefined)).toHaveLength(60)
  })
})

describe('les défauts contradictoires ne sont pas tranchés par l’écriture', () => {
  it('garde les deux défauts à l’écran après une modification', () => {
    const { page } = editable(BACKUP_2026)
    const row = rowElement(page, 'Sensors.ManualQnh')
    expect(row.dataset.state).toBe('conflict')

    const field = controlOf<HTMLInputElement>(page, 'Sensors.ManualQnh', 'input')
    field.value = '1015'
    field.dispatchEvent(new Event('input'))

    // La comparaison reste suspendue : cet éditeur ne choisit pas entre 1013 et 1013,25.
    expect(row.dataset.state).toBe('conflict')
    const mark = row.querySelector('.prefs__state')?.textContent ?? ''
    expect(mark).toContain('1013')
    expect(mark).toContain('1013.25')
  })

  it('le champ suit le pas relevé, au dixième d’hectopascal', () => {
    const { page } = editable(BACKUP_2026)
    const field = controlOf<HTMLInputElement>(page, 'Sensors.ManualQnh', 'input')
    expect(field.step).toBe('0.1')
    expect(field.min).toBe('900')
    expect(field.max).toBe('1100')
  })
})

describe('l’état et les comptes suivent la modification', () => {
  it('fait passer une ligne de « au défaut » à « réglé », bandeau compris', () => {
    const { page } = editable(BACKUP_2026)
    const before = Number(page.element.querySelector<HTMLElement>('.prefs__summary')?.dataset.custom)

    const row = rowElement(page, 'Display.Fullscreen')
    expect(row.dataset.state).toBe('default')
    const box = controlOf<HTMLInputElement>(page, 'Display.Fullscreen', 'input[type="checkbox"]')
    box.checked = !box.checked
    box.dispatchEvent(new Event('change'))

    expect(row.dataset.state).toBe('custom')
    expect(page.summary.customCount).toBe(before + 1)
    expect(page.element.querySelector<HTMLElement>('.prefs__summary')?.dataset.custom)
      .toBe(String(before + 1))
  })

  it('ne signale rien quand la valeur reposée est celle du fichier', () => {
    const { source, document, page, edits } = editable(BACKUP_2026)
    const select = controlOf<HTMLSelectElement>(page, 'Display.Theme', 'select')
    select.dispatchEvent(new Event('change'))
    expect(edits).toHaveLength(0)
    expect(serializeJson(document)).toBe(source)
  })

  it('regroupe les pas d’un curseur et pas ceux d’une case', () => {
    const { page, edits } = editable(BACKUP_2026)
    const field = controlOf<HTMLInputElement>(page, 'Sensors.ManualQnh', 'input')
    field.value = '1015'
    field.dispatchEvent(new Event('input'))
    const box = controlOf<HTMLInputElement>(page, 'SafeSky.Enabled', 'input[type="checkbox"]')
    box.checked = !box.checked
    box.dispatchEvent(new Event('change'))

    expect(edits.map((edit) => edit.continuous)).toEqual([true, false])
  })
})

describe('écrire une préférence peut créer une donnée personnelle', () => {
  it('le signale à l’assembleur et le dit à l’écran', () => {
    const { page, edits } = editable(BACKUP_2026)
    const field = controlOf<HTMLInputElement>(page, 'Pilot.Name', 'input')
    field.value = 'Amélie Exemple-Deux'
    field.dispatchEvent(new Event('change'))

    expect(edits[0]?.personal?.kind).toBe('identity')
    const note = page.element.querySelector<HTMLElement>('.prefs__filled')
    expect(note?.hidden).toBe(false)
    expect(note?.textContent).toContain('Pilot.Name')
    expect(note?.textContent).toContain('voyagera avec ce fichier')
  })

  it('ne le signale pas quand on vide une valeur personnelle', () => {
    // Vider n'est pas renseigner : c'est le contraire d'un risque, et l'annoncer comme
    // un risque apprendrait au pilote à ignorer l'avertissement.
    const { page, edits } = editable(BACKUP_2026)
    const field = controlOf<HTMLInputElement>(page, 'Pilot.Name', 'input')
    field.value = ''
    field.dispatchEvent(new Event('change'))

    expect(edits).toHaveLength(1)
    expect(edits[0]?.personal).toBeUndefined()
    expect(page.element.querySelector<HTMLElement>('.prefs__filled')?.hidden).toBe(true)
  })

  it('masque aussi ce qui est dans un champ de saisie, sans le retirer', () => {
    const { page } = editable(BACKUP_2026)
    const field = controlOf<HTMLInputElement>(page, 'Pilot.Name', 'input')
    expect(field.type).toBe('text')
    const mask = page.element.querySelector<HTMLButtonElement>('.prefs__mask')
    mask?.click()
    expect(field.type).toBe('password')
    // La valeur n'a pas bougé : elle est couverte, pas effacée.
    expect(field.value).toBe('Amélie Exemple')
    mask?.click()
    expect(field.type).toBe('text')
  })
})

describe('preferences.css habille les contrôles sans sortir du cadre', () => {
  const here = dirname(fileURLToPath(import.meta.url))
  const css = readFileSync(join(here, '../../src/ui/preferences.css'), 'utf8')

  it('pose les contrôles sur les jetons du cadre, jamais sur une couleur en dur', () => {
    for (const rule of ['.prefs__select', '.prefs__text', '.prefs__number', '.prefs__slider',
      '.prefs__checkbox', '.prefs__adopt', '.prefs__refusal', '.prefs__filled']) {
      expect(css, rule).toContain(rule)
    }
    const rules = css.replace(/\/\*[\s\S]*?\*\//g, '')
    expect(rules).not.toMatch(/^\s*--app-[a-z-]+:/m)
    expect(rules).not.toContain('prefers-color-scheme')
  })
})
