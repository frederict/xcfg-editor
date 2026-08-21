import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
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
  isPresentable,
  openPreferencesPage,
  renderPreferencesPage,
  sameAsDefault,
  stateLabel,
  tallyText,
  type PreferenceRow
} from '../../src/ui/preferencesPage'
import { BACKUP_2025, BACKUP_2026, PAGES_2026 } from '../fixtures/paths'

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
