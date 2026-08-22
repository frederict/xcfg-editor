import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { decode, getMember } from '../../src/core/access'
import { parseJson } from '../../src/core/parseJson'
import { createHistory } from '../../src/model/history'
import { serializeJson } from '../../src/core/serializeJson'
import type { JsonNode } from '../../src/core/jsonDocument'
import {
  loadPreferenceCatalog,
  type PreferenceCatalog
} from '../../src/catalog/preferenceCatalog'
import {
  loadPreferenceDomains,
  type PreferenceDomainCatalog
} from '../../src/catalog/preferenceDomains'
import { DEFAULTS_VERSION_NAME } from '../../src/catalog/widgetDefaults'
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
  removePreference,
  writePreference,
  RESTORE_LABEL,
  writesString,
  type PreferenceEdit,
  type PreferenceRow
} from '../../src/ui/preferencesPage'
import {
  BACKUP_2025, BACKUP_2026, FORMES_PRESERVEES, GSON_2022, PAGES_2026
} from '../fixtures/paths'
import { loadTranslator, type Translator } from '../../src/i18n'
import frenchMessages from '../../src/i18n/messages/fr'
// Le panneau des gadgets garde son intitulé en constante française, et son propre message
// le double par un test d'égalité (`tests/ui/properties.test.ts`). En rattachant le nôtre
// à la même constante, les trois sont tenus ensemble — voir le test tout en bas.

/**
 * Tout se joue sur les trois fichiers réels du dépôt : la sauvegarde de la version
 * courante, celle d'une version d'il y a un an — 27 clés que le catalogue ne connaît
 * pas — et un export `pages`, qui ne porte aucune préférence. Une page de consultation
 * ne se juge pas sur des données inventées : ce qu'on veut vérifier, c'est qu'elle dit
 * juste sur les octets que l'appareil a écrits.
 */
let catalog: PreferenceCatalog
/**
 * Les domaines relevés — unités et touches — sont passés **partout** dans ces tests,
 * parce que `openPreferencesPage` les passe toujours : les éprouver sans eux
 * n'éprouverait que le repli. Ce repli a son propre test, et un seul.
 */
let domains: PreferenceDomainCatalog
/**
 * Le traducteur de **notre prose**, en français : ces tests vérifient ce que la page dit,
 * et la langue d'écriture du dépôt est le français. Il est **passé** à la page comme
 * l'assembleur le passe, jamais lu par elle — voir `src/i18n/axes.ts` : ce n'est pas le
 * même axe que le `'fr'` de `loadPreferenceCatalog`, qui est celui des libellés de
 * XCTrack.
 */
let tr: Translator

beforeAll(async () => {
  [catalog, domains, tr] = await Promise.all([
    loadPreferenceCatalog('fr'), loadPreferenceDomains(), loadTranslator('fr')
  ])
})

function documentOf(path: string): JsonNode {
  return parseJson(readFileSync(path, 'utf8'))
}

function inventoryOf(path: string) {
  return buildPreferenceInventory(documentOf(path), catalog, tr, domains)
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
    expect(stateLabel(absent!, tr)).toBe('absente du fichier')
    expect(absent!.value).toBeUndefined()
  })

  it('distingue « jamais réglée » d’« absente » pour les clés qu’Android n’écrit qu’une fois réglées', () => {
    // `_ttsSpeed` n'est pas déclarée par la classe de configuration : son absence ne dit
    // même pas quel défaut s'appliquera.
    const row = rowFor(BACKUP_2026, '_ttsSpeed')
    expect(row.state).toBe('unwritten')
    expect(stateLabel(row, tr)).toBe('jamais réglée')
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
      expect(row.undecidableReason).toContain('ne connaît pas ce réglage')
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
    expect(tallyText(airspaces!.tally!, tr)).toContain('une seule porte un libellé')
  })
})

/* -------------------------- ce que l'application a mémorisé : la taille, pas le contenu */

describe('ce que l’application a mémorisé se dit sans se déplier', () => {
  it('classe comme mémorisé ce que le fichier écrit en objet ou en tableau', () => {
    const row = rowFor(BACKUP_2026, 'Sounds')
    expect(row.reason).toBe('state')
    expect(row.structured).toBe(true)
    // « objet JSON » est le mot du format, pas celui du pilote.
    expect(row.value).toMatch(/^valeur structurée, [\d\u202f\u00a0 ]+ caractères$/)
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

describe('la comparaison à la valeur d’usine dit ce qu’elle vaut', () => {
  it('compare le texte, puis le nombre', () => {
    expect(sameAsDefault('true', true)).toBe(true)
    expect(sameAsDefault('1013.0', 1013)).toBe(true)
    expect(sameAsDefault('140', '100')).toBe(false)
    expect(sameAsDefault('500', '500')).toBe(true)
    expect(sameAsDefault('', '')).toBe(true)
    // Deux chaînes vides restent égales sans passer par `Number('')`, qui vaut 0.
    expect(sameAsDefault('', 0)).toBe(false)
  })

  it('ne choisit pas entre deux valeurs d’usine que XCTrack publie contradictoires', () => {
    expect(catalog.meta.defaultConflicts).toContain('Sensors.ManualQnh')
    const row = rowFor(BACKUP_2026, 'Sensors.ManualQnh')
    expect(row.state).toBe('conflict')
    expect(row.defaultText).toBe('1013 HPa')
    expect(row.otherDefaultText).toBe('1013.25 HPa')
    // La marque ne porte plus les deux valeurs : en capitales et collées à la valeur du
    // pilote, elles se lisaient comme une alerte sur son QNH. L'infobulle les dit toutes
    // les deux, et dit à qui appartient laquelle.
    expect(stateLabel(row, tr)).toBe('valeur d’usine incertaine')
  })

  it('suspend la comparaison quand la valeur d’usine dépend de la locale', () => {
    const row = rowFor(BACKUP_2026, 'Unit.Altitude')
    expect(row.state).toBe('undecidable')
    expect(row.value).toBe('m')
    expect(row.undecidableReason).toContain('la langue et du pays de l’appareil')
    expect(row.defaultText).toBeUndefined()
  })

  it('dit la valeur dans la langue du pilote, et la valeur d’usine de la même façon', () => {
    const theme = rowFor(BACKUP_2026, 'Display.Theme')
    expect(theme.value).toBe('Haut contraste blanc')
    expect(theme.defaultText).toBe('Blanc')
    expect(stateLabel(theme, tr)).toBe('réglé par vous')

    const bool = rowFor(BACKUP_2026, 'Display.Fullscreen')
    expect(bool.value).toBe('Oui')

    const color = rowFor(BACKUP_2026, 'Display.WidgetTitleColor')
    expect(color.value).toBe('#f44336')

    // Une touche non attribuée : « -1 » ne dit rien, « aucune touche » dit tout.
    expect(rowFor(BACKUP_2026, 'Keys.EnterPan').value).toBe('aucune touche')
    // Et une touche attribuée ne se dit plus « code 24 » : la touche telle qu'elle est
    // sur le boîtier relevé, son code et son nom Android pour le rapport de panne, et
    // l'appui — trois choses que l'entier du fichier mêlait en une.
    expect(rowFor(BACKUP_2026, 'Keys.ZoomIn').value)
      .toBe('volume haut (code 24, KEYCODE_VOLUME_UP), appui simple')
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
    const page = renderPreferencesPage({ document: documentOf(PAGES_2026), catalog, tr })
    expect(page.element.textContent).toContain('ne porte aucune préférence générale')
    expect(page.element.querySelectorAll('.prefs__row')).toHaveLength(0)
  })
})

/* ------------------------------------------------------------ lecture seule, vraiment */

describe('le vocabulaire de la page est celui du pilote', () => {
  it('ne dit jamais « clé » ni « palier » : ce sont nos mots, pas les siens', () => {
    // « le fichier porte 136 clés », « 49 clés du fichier ne sont pas présentées »,
    // « Cette clé n'est pas dans le fichier » : un pilote n'a jamais vu de clé dans
    // XCTrack. Ce que le fichier porte, ce sont des lignes ; ce qu'il règle, des réglages.
    for (const path of [BACKUP_2026, BACKUP_2025, FORMES_PRESERVEES]) {
      const { page } = editable(path)
      const said = [
        page.element.textContent ?? '',
        ...[...page.element.querySelectorAll<HTMLElement>('[title]')].map((one) => one.title)
      ].join('\n')
      for (const word of ['clé', 'clés', 'Clé', 'Clés', 'palier', 'paliers']) {
        expect(said, `${path} — ${word}`).not.toContain(word)
      }
    }
  })

  it('ne dit ni « objet JSON » ni « état sérialisé » : ce sont les mots du format', () => {
    // Le pilote n'a jamais vu de JSON. Ce qu'il voit, c'est une valeur qui en contient
    // d'autres, et des lignes que l'application a mémorisées sans qu'elles règlent rien.
    for (const path of [BACKUP_2026, BACKUP_2025, FORMES_PRESERVEES]) {
      const { page } = editable(path)
      const said = [
        page.element.textContent ?? '',
        ...[...page.element.querySelectorAll<HTMLElement>('[title]')].map((one) => one.title)
      ].join('\n')
      for (const word of ['JSON', 'sérialisé', 'sérialisée', 'déballer', 'imbriquée']) {
        expect(said, `${path} — ${word}`).not.toContain(word)
      }
    }
  })

  it('emploie le même mot dans le bandeau et dans le bloc de fin de page', () => {
    // Le bandeau disait « 14 d'état sérialisé » et le bloc « État sérialisé » : les deux
    // devaient bouger ensemble, sinon l'écran se contredit d'un bloc à l'autre.
    const { page } = editable(BACKUP_2026)
    const said = page.element.textContent ?? ''
    expect(said).toContain('mémorisées par l’application')
    expect(said).toContain('Ce que l’application a mémorisé (pas des réglages)')
  })

  it('dit « vous » de ce que le pilote a réglé, et non « le pilote »', () => {
    const { page } = editable(BACKUP_2026)
    const said = page.element.textContent ?? ''
    expect(said).toContain('Vous avez réglé')
    expect(said).toContain('Seulement ce que j’ai réglé')
    // Le bandeau disait « 30 réglages réglés par le pilote » — la troisième personne, et
    // le même mot deux fois. (« le nom du pilote » subsiste où il désigne la donnée
    // elle-même, pas son propriétaire : c'est le libellé d'un champ, pas une adresse.)
    expect(said).not.toContain('réglés par le pilote')
    expect(said).not.toContain('ce que le pilote a réglé')
  })
})

describe('la page est en lecture seule, et pas seulement grisée', () => {
  it('ne construit aucun contrôle de formulaire lié à une préférence', () => {
    const page = renderPreferencesPage({ document: documentOf(BACKUP_2026), catalog, tr })
    expect(page.element.querySelectorAll('select')).toHaveLength(0)
    expect(page.element.querySelectorAll('textarea')).toHaveLength(0)
    // Le seul `input` admis est le champ de filtrage, qui ne touche pas au document.
    const inputs = [...page.element.querySelectorAll('input')]
    expect(inputs).toHaveLength(1)
    expect(inputs[0]?.type).toBe('search')
    // Les seuls boutons sont des commandes d'affichage.
    for (const button of page.element.querySelectorAll('button')) {
      expect(['Seulement ce que j’ai réglé', 'Masquer les valeurs personnelles'])
        .toContain(button.textContent)
    }
    expect(page.element.dataset.mode).toBe('lecture')
  })

  it('masque les valeurs personnelles à l’écran sans les retirer de nulle part', () => {
    const page = renderPreferencesPage({ document: documentOf(BACKUP_2026), catalog, tr })
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
    const page = renderPreferencesPage({ document, catalog, tr })
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
      tr,
      fileName: 'essai.xcfg',
      fileVersionCode: 100030,
      fileVersionName: '1.0.3-beta'
    })
    expect(page.element.textContent).toContain('essai.xcfg')
    expect(page.summary.fileKeyCount).toBe(136)
  })

  it('ne construit un bouton de fermeture que si l’appelant en veut un', () => {
    const plain = renderPreferencesPage({ document: documentOf(BACKUP_2026), catalog, tr })
    expect(plain.element.querySelector('.prefs__close')).toBeNull()

    let closed = 0
    const page = renderPreferencesPage({
      document: documentOf(BACKUP_2026), catalog, tr, onClose: () => { closed += 1 }
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
    const page = renderPreferencesPage({ document: documentOf(BACKUP_2026), catalog, tr })
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
      document: documentOf(BACKUP_2026), catalog, tr, fileVersionCode: 100030
    })
    expect(same.element.textContent).toContain('la version même de ce fichier')

    const older = renderPreferencesPage({
      document: documentOf(BACKUP_2025), catalog, tr,
      fileVersionCode: 91230, fileVersionName: '0.9.12.3'
    })
    expect(older.element.textContent).toContain('la lecture est donc indicative')

    const unstated = renderPreferencesPage({ document: documentOf(BACKUP_2025), catalog, tr })
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
    document, catalog, tr, domains, onEdit: (edit) => { edits.push(edit) }
  })
  return { source, document, page, edits }
}

/**
 * Le fichier du corpus, avec un autre code sur `Keys.PrevWaypoint`.
 *
 * ⚠️ Le corpus du propriétaire porte 27 **et** 266 sur cette liaison, mais les fixtures
 * anonymisées n'ont gardé que 266. 27 est justement le code que le noyau du boîtier
 * déclare — c'est donc le seul moyen d'éprouver le cran du milieu sans inventer un
 * fichier de toutes pièces.
 */
function withPrevWaypoint(code: number): JsonNode {
  const source = readFileSync(BACKUP_2026, 'utf8')
    .replace('"Keys.PrevWaypoint": 266', `"Keys.PrevWaypoint": ${String(code)}`)
  return parseJson(source)
}

function pageOf(document: JsonNode): ReturnType<typeof renderPreferencesPage> {
  return renderPreferencesPage({ document, catalog, tr, domains, onEdit: () => {} })
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
    const page = renderPreferencesPage({ document: documentOf(BACKUP_2026), catalog, tr })
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
    const settable = rows.filter((row) => editRefusal(row, tr) === undefined)
    expect(rows).toHaveLength(93)
    expect(settable).toHaveLength(77)
  })

  it('refuse les seize lignes qui ouvrent une boîte sur l’appareil, et le dit', () => {
    const refused = screenRows(BACKUP_2026).filter((row) => editRefusal(row, tr) !== undefined)
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

  /**
   * Les huit unités n'ont aucune liste dans les ressources — XCTrack la remplit en code
   * — et la page les laissait donc en saisie libre, où un pilote pouvait écrire une
   * valeur que son instrument refuserait. Le domaine est désormais **relevé sur
   * l'appareil**, et la liste se ferme dessus.
   */
  it('ferme les huit unités sur le domaine relevé, à la place du champ libre', () => {
    const { page } = editable(BACKUP_2026)
    const unites = catalog.keys().filter((key) => key.startsWith('Unit.'))
      .filter((key) => catalog.values(key).length === 0)
    expect(unites).toHaveLength(8)
    for (const key of unites) {
      // Plus aucun champ libre sur ces huit-là.
      expect(rowElement(page, key).querySelector('input.prefs__text'), key).toBeNull()
      const select = controlOf<HTMLSelectElement>(page, key, 'select')
      expect(select.options.length, key).toBeGreaterThan(1)
      // La provenance voyage avec la liste : ce n'est pas une propriété de XCTrack,
      // c'est un relevé, sur un appareil et une version.
      expect(select.title, key).toContain('mesurée sur AIR³ 7.2')
    }
  })

  it('propose l’ordre de l’appareil, et écrit ce que le fichier porte', () => {
    const { page } = editable(BACKUP_2026)
    const distance = controlOf<HTMLSelectElement>(page, 'Unit.Distance', 'select')
    // L'ordre est celui de l'écran natif : ni alphabétique, ni trié.
    expect([...distance.options].map((one) => one.value))
      .toEqual(['m,km', 'mi', 'yd,mi', 'nm'])
    // ⚠️ Le piège mesuré : l'écran affiche « m, km », le fichier porte « m,km ».
    expect(distance.options[0]?.textContent).toBe('m, km')
    expect(distance.value).toBe('m,km')

    const vertical = controlOf<HTMLSelectElement>(page, 'Unit.VerticalSpeed', 'select')
    expect([...vertical.options].map((one) => one.value))
      .toEqual(['m/s', 'ft/min', '100ft/min'])
  })

  it('écrit dans le fichier le code, jamais le libellé de l’écran', () => {
    const { document, page, edits } = editable(BACKUP_2026)
    const select = controlOf<HTMLSelectElement>(page, 'Unit.Distance', 'select')
    select.value = 'yd,mi'
    select.dispatchEvent(new Event('change'))
    expect(edits.at(-1)?.text).toBe('yd,mi')
    // Le libellé « yd, mi » de l'écran n'entre jamais dans le document : XCTrack
    // refuserait l'espace.
    expect(serializeJson(document, '')).toContain('"Unit.Distance": "yd,mi"')
  })

  it('sans domaines chargés, retombe sur le champ libre plutôt que sur une liste vide', () => {
    // Le repli : les domaines sont facultatifs, et une page qui s'effondrerait faute
    // d'un fichier de données annexe serait moins utile qu'une page qui en sait moins.
    const page = renderPreferencesPage({
      document: documentOf(BACKUP_2026), catalog, tr, onEdit: () => {}
    })
    for (const key of ['Unit.Altitude', 'Unit.Speed']) {
      expect(rowElement(page, key).querySelector('select'), key).toBeNull()
      const field = controlOf<HTMLInputElement>(page, key, 'input.prefs__text')
      expect(field.type).toBe('text')
      expect(field.title).toContain('XCTrack remplit cette liste en code')
    }
    // Et les touches y restent des entiers nus : mieux qu'un nom deviné.
    expect(rowElement(page, 'Keys.ZoomIn').querySelector('.prefs__value')?.textContent)
      .toBe('code 24')
  })

  it('propose la liste de l’écran quand le catalogue en relève une', () => {
    const { page } = editable(BACKUP_2026)
    const select = controlOf<HTMLSelectElement>(page, 'Display.Theme', 'select')
    expect(select.value).toBe('WhiteHCTheme')
    expect([...select.options].map((option) => option.value))
      .toEqual(catalog.values('Display.Theme').map((choice) => choice.value))
  })
})

/* ------------------------------------------------------- les liaisons de touches */

/**
 * ⚠️ **Le plus délicat de cette page.** Une liaison de touche mêle deux choses dans un
 * entier — la touche et l'appui long — et ce qu'on peut en dire touche au **matériel**,
 * qui n'est pas le même d'un AIR³ à l'autre. Ces tests épinglent les deux : ce que la
 * page montre, et surtout ce qu'elle se refuse à affirmer.
 */
describe('une liaison de touche se lit, et en trois morceaux', () => {
  it('sépare la touche de l’appui long, avec le nom Android', () => {
    const { page } = editable(BACKUP_2026)
    // `Keys.PreviousPage` vaut 16777240 = 24 | 0x1000000.
    const row = rowElement(page, 'Keys.PreviousPage')
    expect(row.querySelector('.prefs__binding-key')?.textContent).toBe('volume haut')
    expect(row.querySelector('.prefs__binding-detail')?.textContent)
      .toBe('code 24, KEYCODE_VOLUME_UP')
    expect(row.querySelector('.prefs__binding-press')?.textContent).toBe('appui long')

    // La même touche sans le bit : même touche, autre appui. C'est exactement ce que
    // l'entier du fichier ne laissait pas voir.
    const zoom = rowElement(page, 'Keys.ZoomIn')
    expect(zoom.querySelector('.prefs__binding-key')?.textContent).toBe('volume haut')
    expect(zoom.querySelector('.prefs__binding-press')?.textContent).toBe('appui simple')
  })

  it('nomme un code que le boîtier relevé ne porte pas, sans rien inventer', () => {
    const { page } = editable(BACKUP_2026)
    // 266 : Android le nomme, notre relevé matériel ne le porte pas. Le nom Android
    // reste le meilleur qu'on sache dire — jamais un libellé inventé.
    const row = rowElement(page, 'Keys.PrevWaypoint')
    expect(row.querySelector('.prefs__binding-key')?.textContent).toBe('KEYCODE_STEM_2')
    expect(row.querySelector('.prefs__binding-detail')?.textContent).toBe('code 266')
    expect(row.querySelector('.prefs__binding-press')?.textContent).toBe('appui simple')
  })

  it('dit d’où vient le nom qu’il affiche, touche par touche', () => {
    const { page } = editable(BACKUP_2026)
    // Le pilote-testeur du 2026-08-22 a lu « volume haut » deux lignes au-dessus de
    // `KEYCODE_STEM_2` et en a conclu à une traduction oubliée : « pourquoi les touches
    // de volume sont traduites et pas les autres ? ». Ce n'est pas une traduction qui
    // manque, c'est une mesure — et chaque ligne le dit maintenant d'elle-même.
    const measured = rowElement(page, 'Keys.ZoomIn')
      .querySelector<HTMLElement>('.prefs__binding')?.title ?? ''
    expect(measured).toContain('relevé à la main sur AIR³ 7.2')
    expect(measured).toContain('KEYCODE_VOLUME_UP')

    // 266 : ni pressé, ni déclaré par le noyau. Le troisième cran, et il se dit comme
    // une ignorance, jamais comme l'absence d'une touche.
    const android = rowElement(page, 'Keys.PrevWaypoint')
      .querySelector<HTMLElement>('.prefs__binding')?.title ?? ''
    expect(android).toContain('table des touches d’Android')
    expect(android).toContain('Nous n’avons pressé aucune touche qui l’émette sur AIR³ 7.2')
    expect(android).toContain('ne le déclare sur aucun de ses périphériques d’entrée')
    expect(android).toContain('nous ne savons pas d’où il vient')
    // Et la note de matériel n'a pas disparu de l'infobulle : les deux s'y suivent.
    expect(android).toContain('La note sous ce bloc')
  })

  /**
   * ⚠️ **Le cran du milieu**, celui que l'écran ne connaissait pas avant le 2026-08-22.
   * `getevent -pl` a montré que `sn7326-key` déclare `CAMERA` en 27 — le code que
   * `Keys.PrevWaypoint` porte dans le corpus du propriétaire. L'écran en disait
   * « aucune touche mesurée n'émet le code 27 », d'un code que le noyau déclare.
   *
   * Ce qu'il en dit maintenant ne va pas plus loin que la mesure : le code est
   * **possible** sur ce matériel, et rien ne prouve qu'un bouton l'émette.
   */
  it('distingue un code que le noyau déclare d’un code attesté par rien', () => {
    const page = pageOf(withPrevWaypoint(27))
    const row = rowElement(page, 'Keys.PrevWaypoint')
    // Le nom Android reste le meilleur qu'on sache dire : le noyau déclare un code, il
    // ne nomme pas un bouton.
    expect(row.querySelector('.prefs__binding-key')?.textContent).toBe('KEYCODE_CAMERA')
    const title = row.querySelector<HTMLElement>('.prefs__binding')?.title ?? ''
    expect(title).toContain('Nous n’avons pressé aucune touche qui l’émette sur AIR³ 7.2')
    expect(title).toContain('le noyau du boîtier le déclare sur le contrôleur de clavier sn7326')
    expect(title).toContain('ne prouve pas qu’un bouton lui soit soudé')
    // Et surtout pas la phrase du troisième cran, qui vaut pour 266 et non pour 27.
    expect(title).not.toContain('nous ne savons pas d’où il vient')
    // La marque de la ligne distingue les deux crans, elle aussi.
    expect(row.dataset.hardware).toBe('declared')
  })

  /**
   * 266 est le code que le pilote presse le plus en compétition, et aucun des quatre
   * périphériques d'entrée du boîtier ne peut le produire. Le laisser nu serait pire que
   * de le dire mal ; l'expliquer serait pire encore.
   */
  it('dit l’hypothèse sur 266 comme une hypothèse, jamais comme une explication', () => {
    const { page } = editable(BACKUP_2026)
    const title = rowElement(page, 'Keys.PrevWaypoint')
      .querySelector<HTMLElement>('.prefs__binding')?.title ?? ''
    expect(title).toContain('Hypothèse, non vérifiée')
    expect(title).toContain('air3.air3xctaddon')
    // Ce qui manquerait pour trancher voyage avec elle.
    expect(title).toContain('Rien ne le prouve')
    // Et elle ne s'écrit pas sur un code que le noyau explique.
    const declared = rowElement(pageOf(withPrevWaypoint(27)), 'Keys.PrevWaypoint')
      .querySelector<HTMLElement>('.prefs__binding')?.title ?? ''
    expect(declared).not.toContain('Hypothèse')
  })

  it('explique sous le bloc pourquoi une touche est nommée et l’autre non', () => {
    const { page } = editable(BACKUP_2026)
    const bloc = page.element
      .querySelector('.prefs__screen[data-screen="preferences_keybindings"]')
    const origin = bloc?.querySelectorAll('.prefs__hardware--origin') ?? []
    // Une fois sous le bloc, comme les autres phrases de portée — pas quinze fois.
    expect(origin).toHaveLength(1)
    const said = origin[0]?.textContent ?? ''
    // Les trois crans, et dans cet ordre : pressé à la main, nommé par Android, déclaré
    // par le noyau du boîtier. Deux n'y suffisaient pas — voir `keyCodeEvidence`.
    expect(said).toContain('en la pressant à la main')
    expect(said).toContain('KEYCODE_')
    expect(said).toContain('le noyau du boîtier déclare des codes que nous n’avons jamais pressés')
    expect(said).toContain('possible sur ce matériel')
    // Ce que la phrase ne doit jamais laisser croire : le parc n'est pas homogène.
    expect(said).toContain('jamais une touche qui n’existerait pas')
  })

  it('explique « intention » sous le libellé de XCTrack, sans le réécrire', () => {
    // « Lance une intention Android » est la chrome française de XCTrack, extraite de
    // l'APK : c'est ce que le pilote lira sur son appareil, et le réécrire lui donnerait
    // un terme introuvable là-bas. Un pilote-testeur, le 2026-08-22 : « en français ça ne
    // veut rien dire du tout ». La glose se pose à côté.
    const { page } = editable(BACKUP_2026)
    const row = rowElement(page, 'Keys.IntentLaunch')
    expect(row.querySelector('.prefs__label')?.textContent)
      .toContain('Lance une intention Android')
    const gloss = row.querySelector('.prefs__gloss')?.textContent ?? ''
    expect(gloss).toContain('une application Android en fait réagir une autre')
    // Et nulle part ailleurs : la table ne grossit que là où un pilote a buté.
    expect(rowElement(page, 'Keys.Menu').querySelector('.prefs__gloss')).toBeNull()
  })

  it('laisse « aucune touche » tel quel, sans le découper en trois', () => {
    const { page } = editable(BACKUP_2026)
    const row = rowElement(page, 'Keys.Menu')
    expect(row.querySelector('.prefs__binding')).toBeNull()
    expect(row.querySelector('.prefs__value')?.textContent).toBe('aucune touche')
  })
})

describe('ce que la page dit du matériel, et ce qu’elle ne dira jamais', () => {
  it('dit ce que le relevé porte, en nommant le modèle du relevé', () => {
    const { page } = editable(BACKUP_2026)
    // Ce fichier déclare un AIR³ 7.2 : c'est le modèle relevé, la page peut donc parler.
    // Une fois sous le bloc, comme la phrase de refus — pas deux fois entre deux lignes.
    const bloc = page.element
      .querySelector('.prefs__screen[data-screen="preferences_keybindings"]')
    // `:not(--origin)` : la phrase qui dit d'où viennent les NOMS de touches partage
    // l'habillage de celle-ci, elle n'en est pas un second exemplaire.
    const notes = bloc?.querySelectorAll('.prefs__hardware:not(.prefs__hardware--origin)') ?? []
    expect(notes).toHaveLength(1)
    const said = notes[0]?.textContent ?? ''
    expect(said).toContain('AIR³ 7.2')
    expect(said).toContain('le modèle que ce fichier déclare')
    expect(said).toContain('volume haut (24)')
    expect(said).toContain('Le code 266 n’est aucune d’elles')
    expect(said).toContain('ne le déclare sur aucun de ses périphériques d’entrée')
    // Et la réserve part avec l'affirmation, pas ailleurs.
    expect(said).toContain('un seul boîtier')
    expect(said).toContain('modèles plus récents en portent davantage')
  })

  /**
   * ⚠️ **Deux crans, deux phrases.** Un code que le noyau déclare est possible sur ce
   * matériel ; un code qu'il ne déclare nulle part n'est attesté par rien. Les mélanger
   * dans une seule phrase, c'est ce que faisait l'écran avant le 2026-08-22 — et il le
   * faisait du code 27, que `sn7326-key` déclare.
   */
  it('sépare, sous le bloc, ce que le noyau déclare de ce qu’il ignore', () => {
    // 27 déclaré par le contrôleur, 266 par personne : les deux à l'écran en même temps.
    const page = pageOf(withPrevWaypoint(27))
    const bloc = page.element
      .querySelector('.prefs__screen[data-screen="preferences_keybindings"]')
    const notes = bloc?.querySelectorAll('.prefs__hardware:not(.prefs__hardware--origin)') ?? []
    expect(notes).toHaveLength(1)
    const said = notes[0]?.textContent ?? ''
    expect(said).toContain('Le code 27 n’est aucune d’elles')
    expect(said).toContain('le noyau du boîtier le déclare tout de même')
    expect(said).toContain('sans qu’un appui l’ait prouvé')
    // Et le 266 de `Keys.NextWaypoint` garde sa propre phrase, celle de l'ignorance.
    expect(said).toContain('Le code 266 n’est aucune d’elles')
    expect(said).toContain('nous ne savons pas quelle touche l’émet')
  })

  it('marque les lignes concernées, et elles seules', () => {
    const { page } = editable(BACKUP_2026)
    for (const key of ['Keys.PrevWaypoint', 'Keys.NextWaypoint']) {
      expect(rowElement(page, key).dataset.hardware, key).toBe('unattested')
      // L'infobulle renvoie à la note du bloc ; elle ne la remplace pas.
      const title = rowElement(page, key).querySelector<HTMLElement>('.prefs__binding')?.title
      expect(title, key).toContain('La note sous ce bloc')
    }
    for (const key of ['Keys.ZoomIn', 'Keys.ZoomOut', 'Keys.PreviousPage', 'Keys.Menu']) {
      expect(rowElement(page, key).dataset.hardware, key).toBeUndefined()
    }
  })

  it('n’affirme jamais qu’une touche n’existe pas ni qu’un réglage est sans effet', () => {
    // Le propriétaire l'a signalé : son 7.2 n'a que trois touches, mais le parc n'est
    // pas homogène. Sur un modèle plus récent, `Keys.PrevWaypoint` peut être vivant.
    // Une page qui trancherait ferait retirer un réglage qui marche.
    // ⚠️ Les documents à 27 sont là pour que le **nouveau** texte, celui du cran du
    // milieu, passe le même contrôle : « le noyau le déclare » ne doit pas devenir
    // « la touche existe », et son complément ne doit pas devenir « elle n'existe pas ».
    const documents: Array<[string, JsonNode]> = [
      [BACKUP_2026, documentOf(BACKUP_2026)],
      [BACKUP_2025, documentOf(BACKUP_2025)],
      ['code 27 déclaré par le noyau', withPrevWaypoint(27)],
      ['code 3 déclaré par la dalle', withPrevWaypoint(3)]
    ]
    for (const [path, document] of documents) {
      const page = pageOf(document)
      const said = [
        page.element.textContent ?? '',
        ...[...page.element.querySelectorAll<HTMLElement>('[title]')].map((one) => one.title)
      ].join('\n')
      for (const forbidden of [
        'n’existe pas', 'inerte', 'sans effet', 'ne fait rien', 'ne sert à rien',
        'ne répond à rien', 'inutile',
        // Le revers du cran du milieu : une capacité déclarée n'est pas un bouton.
        'cette touche existe', 'votre boîtier porte'
      ]) {
        expect(said, `${path} — ${forbidden}`).not.toContain(forbidden)
      }
    }
  })

  it('se tait sur un appareil qu’il n’a pas relevé, et dit qu’il se tait', () => {
    // Le fichier déclare un AIR³ 7.3 : `hardwareKeysFor` rend `null`, et se rabattre
    // sur le 7.2 ferait dire d'un boîtier ce qui a été relevé sur un autre.
    const source = readFileSync(BACKUP_2026, 'utf8')
      .replace('AIR3 AIR3-7.2 8.1.0', 'AIR3 AIR3-7.3 11')
    const page = renderPreferencesPage({
      document: parseJson(source), catalog, tr, domains, onEdit: () => {}
    })
    // Plus une seule phrase sur une ligne : nous ne savons rien de ce boîtier-là.
    expect(page.element.querySelectorAll('.prefs__row .prefs__hardware')).toHaveLength(0)
    // Mais le bloc dit qu'il ne sait pas, sans quoi le silence se lirait « tout va ».
    const bloc = page.element.querySelector('.prefs__screen[data-screen="preferences_keybindings"]')
    const scope = bloc?.querySelector(':scope > .prefs__hardware')?.textContent ?? ''
    expect(scope).toContain('que sur AIR³ 7.2')
    expect(scope).toContain('AIR3 AIR3-7.3 11')
    // Le mot du diagnostic de version, employé ici pour la même chose : un trou dans ce
    // que nous savons, jamais un défaut du fichier.
    expect(scope).toContain('angle mort')
    expect(scope).toContain('nous ne savons pas quelle touche l’émet')
    // Les touches restent lues et nommées : ne pas savoir d'où vient le boîtier
    // n'empêche pas de lire le code.
    expect(rowElement(page, 'Keys.ZoomIn').querySelector('.prefs__binding-key')?.textContent)
      .toBe('KEYCODE_VOLUME_UP')
  })

  it('ne parle pas du boîtier là où le fichier n’a aucune touche affectée', () => {
    // `formes-preservees.xcfg` ne porte aucune ligne `Keys.*` : rien à dire.
    const { page } = editable(FORMES_PRESERVEES)
    expect(page.element.querySelectorAll('.prefs__hardware')).toHaveLength(0)
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

    // La valeur d'usine est écrite à la place de la valeur, en retrait — et la marque
    // d'état continue de dire que la clé n'est pas dans le fichier.
    const implicite = row.querySelector<HTMLElement>('.prefs__implicit')
    expect(implicite?.textContent).toBe('Oui')
    expect(implicite?.title).toContain('est la valeur d’usine de XCTrack, pas une valeur réglée')
    expect(implicite?.title).toContain('votre appareil garde le réglage qu’il a déjà')
    expect(row.querySelector('.prefs__state')?.textContent).toBe('absente du fichier')

    const button = controlOf<HTMLButtonElement>(page, 'Tweak.VolumeUp', 'button.prefs__adopt')
    expect(button.textContent).toBe('Définir cette valeur')
    // L'infobulle sépare les deux appareils, parce que la mesure les sépare : celui qui
    // n'a jamais réglé cela, et celui qui l'a réglé et que l'import ne ramène pas à
    // l'usine.
    expect(button.title).toContain('l’écrire ne change alors rien d’immédiat')
    expect(button.title).toContain('l’import écrira cette valeur à la place de la sienne')
    expect(button.title).toContain('mesuré sur l’AIR³')
  })

  it('n’affirme nulle part qu’une clé absente rende le réglage à l’usine', () => {
    // Mesuré sur l'AIR³ : `Display.Theme` retirée d'une sauvegarde, sauvegarde importée
    // en « Remplacer tout », configuration réexportée — la clé revient à la valeur que
    // l'appareil portait déjà (`WhiteHCTheme`), pas à celle de l'APK (`WhiteTheme`). Le
    // témoin de la même manche (`Display.WidgetTitleSize`, 140 → 200) prouve que l'import
    // a bien écrit le reste. L'import fusionne le bloc « preferences ».
    //
    // Cette page a été écrite sur la supposition inverse ; rien n'en doit rester.
    const { page } = editable(FORMES_PRESERVEES)
    const said = [
      ...[...page.element.querySelectorAll<HTMLElement>('[title]')].map((node) => node.title),
      page.element.textContent ?? ''
    ]
    for (const text of said) {
      expect(text).not.toMatch(/appliquera son défaut|appliquera sa valeur d’usine/)
      expect(text).not.toMatch(/la même valeur qu’aujourd’hui/)
    }

    // Et ce qui est mesuré est dit, sur la ligne même d'une clé absente.
    const implicite = rowElement(page, 'Tweak.VolumeUp')
      .querySelector<HTMLElement>('.prefs__implicit')!
    expect(implicite.title).toContain('votre appareil garde le réglage qu’il a déjà')
    expect(implicite.title).toContain('Mesuré sur l’AIR³')
    // Les deux limites de la mesure, jamais gommées.
    expect(implicite.title).toContain('« Remplacer tout »')
    expect(implicite.title).toContain('Sur un appareil qui n’y a jamais touché')
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

  it('ne propose rien à écrire quand le catalogue n’a pas de valeur d’usine', () => {
    const { page } = editable(FORMES_PRESERVEES)
    // Valeur d'usine calculée au démarrage selon la langue de l'appareil : rien à poser.
    for (const key of ['Unit.CompetitionDistance', '_ttsSpeed']) {
      const row = rowElement(page, key)
      expect(row.querySelector('button.prefs__adopt'), key).toBeNull()
      expect(row.textContent, key).toContain('valeur d’usine inconnue')
    }
  })

  it('les 60 lignes absentes du fichier de formes restent affichées et comptées', () => {
    const inventory = inventoryOf(FORMES_PRESERVEES)
    const rows = screenRows(FORMES_PRESERVEES)
    const absent = rows.filter((row) => row.state === 'absent' || row.state === 'unwritten')
    expect(absent).toHaveLength(76)
    expect(inventory.summary.absentCount + inventory.summary.unwrittenCount).toBe(76)
    // Sur ces 76, 60 portent un contrôle offrable et 52 une valeur de départ écrivable.
    expect(absent.filter((row) => editRefusal(row, tr) === undefined)).toHaveLength(60)
  })
})

describe('les valeurs d’usine contradictoires ne sont pas tranchées par l’écriture', () => {
  it('garde les deux valeurs d’usine sous les yeux après une modification', () => {
    const { page } = editable(BACKUP_2026)
    const row = rowElement(page, 'Sensors.ManualQnh')
    expect(row.dataset.state).toBe('conflict')

    const field = controlOf<HTMLInputElement>(page, 'Sensors.ManualQnh', 'input')
    field.value = '1015'
    field.dispatchEvent(new Event('input'))

    // La comparaison reste suspendue : cet éditeur ne choisit pas entre 1013 et 1013,25.
    // Les deux valeurs sont dans l'infobulle et non plus en capitales sur la ligne — un
    // pilote y lisait une alerte sur son QNH, c'est-à-dire sur son altitude.
    expect(row.dataset.state).toBe('conflict')
    const state = row.querySelector<HTMLElement>('.prefs__state')!
    expect(state.textContent).toBe('valeur d’usine incertaine')
    expect(state.title).toContain('1013')
    expect(state.title).toContain('1013.25')
    expect(state.title).toContain('Votre valeur, elle, est celle du fichier.')
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
      '.prefs__checkbox', '.prefs__adopt', '.prefs__drop', '.prefs__aside',
      '.prefs__implicit', '.prefs__refusal', '.prefs__filled',
      '.prefs__restore', '.prefs__restore-btn', '.prefs__restore-note',
      '.prefs__binding', '.prefs__binding-key', '.prefs__binding-detail',
      '.prefs__binding-press', '.prefs__hardware']) {
      expect(css, rule).toContain(rule)
    }
    const rules = css.replace(/\/\*[\s\S]*?\*\//g, '')
    expect(rules).not.toMatch(/^\s*--app-[a-z-]+:/m)
    expect(rules).not.toContain('prefers-color-scheme')
  })

  it('ne réserve plus une largeur écrite, mais celle de l’intitulé', () => {
    // Une largeur en dur ne peut pas suivre un intitulé qui change ni une langue qui
    // s'allonge : c'est ce qui a laissé « Retirer du fichier » passer sous la marque
    // d'état dans les cinq langues. La réservation se prend désormais au fantôme.
    const aside = /\.prefs__aside \{[^}]*\}/.exec(css)?.[0] ?? ''
    expect(aside).not.toMatch(/\bwidth:/)
    expect(css).toContain('content: attr(data-label)')
    // Et l'emplacement est une colonne de la grille en mode édition — la cinquième, qui
    // se dimensionne sur son contenu pendant que la première, élastique, cède la place.
    const edition = /\.prefs\[data-mode='edition'\] \.prefs__row \{[^}]*\}/.exec(css)?.[0] ?? ''
    expect(edition).toMatch(/grid-template-columns:.*\bauto\b.*;/)
  })

  it('donne un filet tireté à ce qui ne se clique pas', () => {
    // Un pilote d'essai a cliqué sur la marque d'état : elle portait le filet plein et la
    // pastille des deux boutons voisins (« Définir cette valeur », « Rétablir la valeur
    // d'usine ») sans rien faire au clic. La forme arrondie reste partagée — c'est la
    // décision d'`app.css` —, le trait ne l'est plus : plein pour ce qui agit, tireté
    // pour ce qui renseigne, comme `.prefs__empty` et `.hint-note` le font déjà.
    for (const rule of ['.prefs__state', '.prefs__personal']) {
      const body = new RegExp(`\\${rule} \\{[^}]*\\}`).exec(css)?.[0] ?? ''
      expect(body, rule).not.toBe('')
      expect(body, rule).toMatch(/border: 1px dashed/)
    }
    // Les trois gestes de la page gardent, eux, le filet plein de `.btn` : aucun ne se
    // met à ressembler à une marque en échange.
    for (const rule of ['.prefs__adopt', '.prefs__drop', '.prefs__restore-btn']) {
      const body = new RegExp(`\\${rule}[,\\s][^}]*\\}`).exec(css)?.[0] ?? ''
      expect(body, rule).not.toBe('')
      expect(body, rule).not.toMatch(/dashed/)
    }
  })

  it('empile les trois morceaux d’une liaison au lieu de les aligner', () => {
    // Trois morceaux côte à côte pousseraient la valeur hors de sa colonne dès le
    // premier libellé un peu long : la colonne de cette page existe pour tenir.
    const binding = /\.prefs__binding \{[^}]*\}/.exec(css)?.[0] ?? ''
    expect(binding).toContain('flex-direction: column')
    // La phrase sur le matériel prend la ligne entière, comme l'aide juste au-dessus.
    const hardware = /\.prefs__hardware \{[^}]*\}/.exec(css)?.[0] ?? ''
    expect(hardware).toContain('grid-column: 1 / -1')
  })
})

/* ================================================ implicite ↔ explicite, dans les deux sens */

/**
 * Une clé absente vaut son défaut de façon **implicite** ; l'écrire la rend explicite, et
 * la fige. Le geste inverse rend une valeur explicite égale au défaut à l'implicite.
 *
 * Ce qui compte ici — et qui n'a rien d'évident — c'est que les deux gestes ne changent
 * **rien** au comportement de l'appareil aujourd'hui : ils ne décident que de ce qui
 * arrivera si une mise à jour de XCTrack change le défaut. C'est la seule justification
 * du couple, et les deux infobulles doivent la porter.
 */
describe('rendre un défaut explicite, et le rendre à l’implicite', () => {
  it('n’offre « Définir » que là où un défaut est réellement relevé', () => {
    const { page } = editable(FORMES_PRESERVEES)
    const rows = screenRows(FORMES_PRESERVEES)
      .filter((row) => row.state === 'absent' || row.state === 'unwritten')

    for (const row of rows) {
      const entry = catalog.preference(row.key)
      const relevé = entry?.default !== undefined && entry.defaultSource !== 'runtime'
      const bouton = rowElement(page, row.key).querySelector('button.prefs__adopt')
      // Un bouton qui écrirait une valeur devinée serait pire que pas de bouton.
      expect(bouton !== null, row.key).toBe(relevé && editRefusal(row, tr) === undefined)
    }

    expect(page.element.querySelectorAll('button.prefs__adopt')).toHaveLength(52)
  })

  it('écrit exactement le défaut relevé, sans le transformer au passage', () => {
    const { document, page } = editable(FORMES_PRESERVEES)
    // Un flottant, une chaîne d'énumération et un booléen : trois formes différentes,
    // toutes trois écrites telles que le catalogue les relève.
    for (const [key, attendu] of [
      ['Keys.MapPanStepSize', '"Keys.MapPanStepSize": 33.3'],
      ['Tweak.HWAccel', '"Tweak.HWAccel": "ENABLED"'],
      ['Tweak.VolumeUp', '"Tweak.VolumeUp": true']
    ] as const) {
      controlOf<HTMLButtonElement>(page, key, 'button.prefs__adopt').click()
      expect(serializeJson(document), key).toContain(attendu)
      expect(rowElement(page, key).dataset.state, key).toBe('default')
    }
  })

  it('propose « Retirer » sur une valeur écrite qui vaut le défaut, et pas ailleurs', () => {
    const { page } = editable(BACKUP_2026)
    // Écrite, égale au défaut relevé : le retrait a un sens et ne change rien.
    expect(rowElement(page, 'Display.Fullscreen').dataset.state).toBe('default')
    expect(rowElement(page, 'Display.Fullscreen').querySelector('.prefs__drop')).not.toBeNull()

    // Réglée par le pilote : retirer la clé changerait le comportement de l'appareil.
    // Ce n'est pas ce qu'un bouton discret doit faire d'un clic.
    expect(rowElement(page, 'Display.Theme').dataset.state).toBe('custom')
    expect(rowElement(page, 'Display.Theme').querySelector('.prefs__drop')).toBeNull()

    // Défauts contradictoires : on ne peut pas dire que la valeur vaut « le » défaut.
    expect(rowElement(page, 'Sensors.ManualQnh').dataset.state).toBe('conflict')
    expect(rowElement(page, 'Sensors.ManualQnh').querySelector('.prefs__drop')).toBeNull()

    // Aucun défaut connu : rien à quoi rendre la clé.
    expect(rowElement(page, 'Unit.Altitude').dataset.state).toBe('undecidable')
    expect(rowElement(page, 'Unit.Altitude').querySelector('.prefs__drop')).toBeNull()
  })

  it('retire la clé du fichier, et rien d’autre', () => {
    const { source, document, page, edits } = editable(BACKUP_2026)
    controlOf<HTMLButtonElement>(page, 'Display.Fullscreen', '.prefs__drop').click()

    const after = serializeJson(document)
    // La ligne entière disparaît, et rien d'autre : la plage qui diverge pèse exactement
    // ce que pesait la ligne, virgule et retour compris. (`singleDifference` la cadre sur
    // le préfixe commun, d'où une plage décalée mais de même longueur.)
    const difference = singleDifference(source, after)
    expect(difference.after).toBe('')
    expect(difference.before).toHaveLength(32)
    expect(source.length - after.length).toBe(32)
    expect(after).not.toContain('"Display.Fullscreen"')
    expect(after.split('\n')).toHaveLength(source.split('\n').length - 1)
    expect(edits[0]?.outcome).toBe('removed')
    expect(edits[0]?.description).toBe('Retirer Plein écran du fichier')

    const row = rowElement(page, 'Display.Fullscreen')
    expect(row.dataset.state).toBe('absent')
    expect(row.querySelector('input')).toBeNull()
    expect(row.querySelector('.prefs__implicit')?.textContent).toBe('Oui')
  })

  it('les deux gestes se défont l’un l’autre, à l’octet près', () => {
    // Le contrôle croisé du couple : retirer puis redéfinir doit rendre le fichier
    // d'origine. Ce n'est vrai que parce que l'insertion se fait en fin de section et
    // que `Display.Fullscreen` en est la dernière clé une fois retirée… ce qui n'est PAS
    // le cas : on vérifie donc l'égalité des empreintes après l'aller-retour inverse,
    // celui qui commence par écrire.
    const source = readFileSync(FORMES_PRESERVEES, 'utf8')
    const document = parseJson(source)
    const page = renderPreferencesPage({ document, catalog, tr, onEdit: () => {} })

    controlOf<HTMLButtonElement>(page, 'Tweak.VolumeUp', 'button.prefs__adopt').click()
    expect(serializeJson(document)).not.toBe(source)

    controlOf<HTMLButtonElement>(page, 'Tweak.VolumeUp', '.prefs__drop').click()
    expect(serializeJson(document)).toBe(source)
    expect(sha256(serializeJson(document))).toBe(sha256(source))
  })

  /**
   * L'intitulé visible **nomme son objet**. Il a dit « Retirer » seul jusqu'au
   * 2026-08-22 ; un pilote-testeur a failli arrêter l'essai devant, croyant qu'il allait
   * perdre son réglage — « le manuel l'explique très bien, mais le bouton est sous mes
   * yeux et le manuel est ailleurs ».
   *
   * ⚠️ Ce test ne peut pas être remplacé par `tests/docs/intitules.test.ts` : celui-ci
   * retrouve « Retirer » dans la valeur voisine `preferences.removeFromFile` et passerait
   * au vert quel que soit l'intitulé du bouton. La forme complète ne tient donc qu'ici.
   */
  it('nomme ce qu’il retire, comme ses deux voisins nomment le leur', () => {
    const { page } = editable(BACKUP_2026)
    const retirer = controlOf<HTMLButtonElement>(page, 'Display.Fullscreen', '.prefs__drop')
    expect(retirer.textContent).toBe('Retirer du fichier')
    // Le nom accessible dit la même chose, avec le réglage nommé : les deux ne se
    // contredisent plus, l'un est l'autre en plus précis.
    expect(retirer.getAttribute('aria-label')).toBe('Retirer Plein écran du fichier')
    // Les trois gestes de cet écran nomment tous leur objet ; aucun n'est un verbe nu.
    const definir = controlOf<HTMLButtonElement>(
      editable(FORMES_PRESERVEES).page, 'Tweak.VolumeUp', '.prefs__adopt'
    )
    for (const label of [retirer.textContent ?? '', definir.textContent ?? '',
      tr.t(RESTORE_LABEL)]) {
      expect(label.split(' ').length, label).toBeGreaterThan(1)
    }
  })

  it('dit à l’écran ce que l’un et l’autre changent, et ce qu’ils ne changent pas', () => {
    const { page } = editable(BACKUP_2026)
    const retirer = controlOf<HTMLButtonElement>(page, 'Display.Fullscreen', '.prefs__drop')
    expect(retirer.getAttribute('aria-label')).toBe('Retirer Plein écran du fichier')
    // Ce que l'infobulle ne dit plus, parce que la mesure l'a réfuté : que l'appareil
    // reviendrait à sa valeur d'usine. Il garde le réglage qu'il a déjà.
    expect(retirer.title).toContain('il ne dira plus rien de ce réglage')
    expect(retirer.title).toContain('votre appareil garde le réglage qu’il a déjà')
    expect(retirer.title).not.toContain('la même valeur qu’aujourd’hui')
    expect(retirer.title).toContain('suivra les mises à jour de XCTrack')

    const { page: neuve } = editable(FORMES_PRESERVEES)
    const definir = controlOf<HTMLButtonElement>(neuve, 'Tweak.VolumeUp', '.prefs__adopt')
    expect(definir.title).toContain('met le réglage à l’abri d’une mise à jour de XCTrack')
    expect(definir.title).toContain('l’import écrira cette valeur à la place de la sienne')
  })

  it('remet les comptes d’accord après un retrait', () => {
    const { page } = editable(BACKUP_2026)
    const avant = { ...page.summary }
    controlOf<HTMLButtonElement>(page, 'Display.Fullscreen', '.prefs__drop').click()

    expect(page.summary.defaultCount).toBe(avant.defaultCount - 1)
    expect(page.summary.absentCount).toBe(avant.absentCount + 1)
    expect(page.summary.fileKeyCount).toBe(avant.fileKeyCount - 1)
    // Le compte des lignes du fichier a quitté la première phrase — qui répond
    // maintenant à la question du pilote, « qu'ai-je réglé ? » — pour la troisième, qui
    // décrit le fichier. Il reste juste, et il bouge toujours à l'écriture.
    const lignes = [...page.element.querySelectorAll('.prefs__summary-detail')]
      .map((node) => node.textContent ?? '')
    expect(lignes.some((text) => text.includes('Ce fichier contient 135 lignes'))).toBe(true)
  })

  it('réserve l’emplacement du bouton même là où il n’y en a pas', () => {
    // Sans emplacement réservé, les lignes qui portent « Retirer » décalent leur contrôle
    // de soixante pixels et la colonne cesse de s'aligner — mesuré au navigateur : les
    // dix listes de l'écran « Affichage » partagent le même bord droit avec, pas sans.
    //
    // L'emplacement est désormais une **colonne de la grille**, et non plus un bout de la
    // cellule : il doit donc exister sur TOUTES les lignes de la page modifiable, faute
    // de quoi les lignes qui en manqueraient décaleraient leur colonne de valeurs.
    const { page } = editable(BACKUP_2026)
    const lignes = [...page.element.querySelectorAll('.prefs__row')]
    expect(lignes.length).toBeGreaterThan(100)
    for (const row of lignes) {
      expect(row.querySelectorAll('.prefs__aside'), row.getAttribute('data-key') ?? '')
        .toHaveLength(1)
    }
    // Et il reste hors de toute cellule : dans la cellule, sa largeur se prendrait sur le
    // contrôle au lieu de se prendre sur le nom du réglage.
    expect(page.element.querySelectorAll('.prefs__cell .prefs__aside')).toHaveLength(0)
  })

  it('donne à l’emplacement la largeur de l’intitulé, dans les cinq langues', async () => {
    // La régression à ne jamais refaire : la réservation était écrite en dur (4,6 rem,
    // 73,6 px), taillée pour « Retirer ». Le jour où le bouton a dit « Retirer du
    // fichier » — 109 px —, l'intitulé est passé sous la marque d'état : 24 px de
    // recouvrement en français, 82 px en néerlandais, où « verwijderen » devenait
    // illisible. Mesuré au navigateur dans les cinq langues, à 1400, 1600 et 1920 points.
    //
    // La largeur est maintenant prise à l'intitulé lui-même : la feuille en fait un
    // fantôme invisible de la même boîte (`.prefs__aside::before`, `attr(data-label)`).
    // Ce test tient l'attache — l'emplacement dit EXACTEMENT ce que le bouton dit.
    for (const langue of ['fr', 'en', 'de', 'es', 'nl'] as const) {
      const traducteur = await loadTranslator(langue)
      const document = documentOf(BACKUP_2026)
      const page = renderPreferencesPage({
        document, catalog, tr: traducteur, domains, onEdit: () => {}
      })
      const asides = [...page.element.querySelectorAll<HTMLElement>('.prefs__aside')]
      expect(asides.length, langue).toBeGreaterThan(100)
      const intitule = traducteur.t('preferences.dropLabel')
      for (const aside of asides) expect(aside.dataset.label, langue).toBe(intitule)
      // Le fantôme et le bouton portent le même mot : c'est toute la garantie.
      const bouton = page.element.querySelector('.prefs__drop')
      expect(bouton?.textContent, langue).toBe(intitule)
    }
  })

  it('ne retire jamais une clé dans une page en lecture seule', () => {
    const page = renderPreferencesPage({ document: documentOf(BACKUP_2026), catalog, tr })
    expect(page.element.querySelectorAll('.prefs__drop')).toHaveLength(0)
    expect(page.element.querySelectorAll('.prefs__implicit')).toHaveLength(0)
  })

  it('retire toutes les occurrences d’une clé dupliquée, jamais une seule', () => {
    // `removeMember` le garantit, et c'est la seule postcondition prévisible après un
    // geste de suppression : n'en retirer qu'une laisserait le réglage en place.
    const document = parseJson(
      '{\n  "preferences": {\n    "Display.Fullscreen": true,\n    "Display.Fullscreen": false\n  }\n}'
    )
    expect(removePreference(document, 'Display.Fullscreen')).toBe(2)
    expect(serializeJson(document)).toBe('{\n  "preferences": {}\n}')
  })

  it('rend 0 sans lever sur une clé qui n’est pas là', () => {
    const source = readFileSync(BACKUP_2026, 'utf8')
    const document = parseJson(source)
    // `_ttsSpeed` n'est dans aucun fichier du corpus : Android ne l'écrit qu'une fois
    // le réglage touché sur l'appareil.
    expect(removePreference(document, '_ttsSpeed')).toBe(0)
    expect(serializeJson(document)).toBe(source)
  })
})

/* =========================================== le troisième geste : rétablir la valeur d'usine */

/**
 * Les deux gestes du couple implicite ↔ explicite sont **neutres pour l'appareil** :
 * écrire une valeur déjà appliquée ne change rien, la retirer non plus. Celui-ci remplace
 * un réglage que le pilote a choisi — l'appareil ne se comportera plus pareil en vol.
 *
 * Il ne peut donc être ni discret ni présenté comme une commodité. Ce bloc en vérifie les
 * trois conséquences : il se voit (jamais révélé au survol), il ne s'offre que là où la
 * valeur d'usine est connue **sans ambiguïté**, et il dit d'où elle vient quand le fichier
 * ne vient pas de la version du catalogue.
 */
describe('rétablir la valeur d’usine d’un réglage que le pilote a changé', () => {
  function restoreLine(
    page: ReturnType<typeof renderPreferencesPage>, key: string
  ): HTMLElement | null {
    const line = rowElement(page, key).querySelector<HTMLElement>('.prefs__restore')
    return line === null || line.hidden ? null : line
  }

  function restoreButton(
    page: ReturnType<typeof renderPreferencesPage>, key: string
  ): HTMLButtonElement {
    const line = restoreLine(page, key)
    const button = line?.querySelector<HTMLButtonElement>('.prefs__restore-btn')
    if (button === undefined || button === null) {
      throw new Error(`pas de bouton de rétablissement pour ${key}`)
    }
    return button
  }

  it('ne l’offre que sur une valeur réglée dont la valeur d’usine est sûre', () => {
    const { page } = editable(BACKUP_2026)

    // Réglée par le pilote, valeur d'usine relevée : c'est le seul cas qui a un objet.
    for (const key of ['Display.Theme', 'Display.Orientation', 'Sensors.AcousticVario.AvgLift']) {
      expect(rowElement(page, key).dataset.state, key).toBe('custom')
      expect(restoreLine(page, key), key).not.toBeNull()
    }

    // Déjà à la valeur d'usine : rien à rétablir — c'est « Retirer » qui a un sens là.
    expect(restoreLine(page, 'Display.Fullscreen')).toBeNull()

    // Deux valeurs d'usine contradictoires (1013 et 1013.25) : on ne peut pas proposer de
    // revenir à « la » valeur d'usine quand il y en a deux. Même refus que « Retirer ».
    expect(rowElement(page, 'Sensors.ManualQnh').dataset.state).toBe('conflict')
    expect(restoreLine(page, 'Sensors.ManualQnh')).toBeNull()

    // Valeur d'usine calculée au démarrage selon la langue de l'appareil : il n'y a rien
    // à rétablir qu'on n'inventerait pas.
    expect(rowElement(page, 'Unit.Altitude').dataset.state).toBe('undecidable')
    expect(restoreLine(page, 'Unit.Altitude')).toBeNull()

    // Absente du fichier : c'est « Définir cette valeur » qui s'y offre, pas celui-ci.
    const { page: neuve } = editable(FORMES_PRESERVEES)
    expect(rowElement(neuve, 'Tweak.VolumeUp').dataset.state).toBe('absent')
    expect(restoreLine(neuve, 'Tweak.VolumeUp')).toBeNull()
  })

  it('l’offre sur toutes les lignes réglées, et sur celles-là seulement', () => {
    const { page } = editable(BACKUP_2026)
    for (const row of screenRows(BACKUP_2026)) {
      const offered = row.state === 'custom' && editRefusal(row, tr) === undefined
      expect(restoreLine(page, row.key) !== null, row.key).toBe(offered)
    }
    // Trente réglages du pilote dans ce fichier, dont six touches (`Keys.*`) que cette
    // page ne propose pas de régler : sur l'appareil, elles se capturent dans une boîte
    // de dialogue dont le domaine n'est pas relevé. Restent vingt-quatre.
    expect(page.element.querySelectorAll('.prefs__restore:not([hidden])')).toHaveLength(24)
  })

  it('ne l’offre pas du tout dans une page en lecture seule', () => {
    const page = renderPreferencesPage({ document: documentOf(BACKUP_2026), catalog, tr })
    expect(page.element.querySelectorAll('.prefs__restore')).toHaveLength(0)
    expect(page.element.querySelectorAll('.prefs__restore-btn')).toHaveLength(0)
  })

  it('se voit sans survol, et dit ce qu’il échange avant le clic', () => {
    const { page } = editable(BACKUP_2026)
    const button = restoreButton(page, 'Display.Theme')

    // Un vrai bouton bordé, pas le fantôme de « Retirer » : ce geste-là change le vol.
    expect(button.textContent).toBe('Rétablir la valeur d’usine')
    expect(button.className).not.toContain('btn--ghost')
    expect(button.getAttribute('aria-label')).toBe('Rétablir Thème à sa valeur d’usine')

    const note = restoreLine(page, 'Display.Theme')!
      .querySelector('.prefs__restore-note')!.textContent!
    expect(note).toContain('« Blanc » d’usine')
    expect(note).toContain('« Haut contraste blanc » dans ce fichier')
    expect(note).toContain('change ce que fait l’appareil en vol')
  })

  it('écrit la valeur d’usine, et pas un octet de plus', () => {
    const { source, document, page, edits } = editable(BACKUP_2026)
    restoreButton(page, 'Display.Theme').click()

    const after = serializeJson(document)
    // Une seule plage diverge, et c'est la valeur : rien n'a été réécrit ni réindenté.
    // C'est la preuve que l'écriture passe par le noyau préservant de `core/`, jamais par
    // un `JSON.parse` / `JSON.stringify` qui normaliserait tout le fichier.
    // `singleDifference` cadre la plage sur le préfixe et le suffixe communs : de
    // « WhiteHCTheme » à « WhiteTheme », seul « HC » disparaît.
    expect(singleDifference(source, after)).toEqual({ before: 'HC', after: '' })
    expect(after).toContain('"Display.Theme": "WhiteTheme"')
    expect(after.split('\n')).toHaveLength(source.split('\n').length)
    expect(edits).toHaveLength(1)
    expect(edits[0]?.outcome).toBe('set')
    expect(edits[0]?.description).toBe('Rétablir Thème à sa valeur d’usine')
    expect(edits[0]?.continuous).toBe(false)
  })

  it('laisse intactes les écritures voisines que JSON.stringify dégraderait', () => {
    // Le fichier de formes porte `1.0E7`, `-0.0`, un entier au-delà de 2^53 et une clé
    // doublée. Rétablir un flottant voisin ne doit toucher à aucun des quatre.
    const source = readFileSync(FORMES_PRESERVEES, 'utf8')
    const document = parseJson(source)
    const page = renderPreferencesPage({ document, catalog, tr, onEdit: () => {} })

    restoreButton(page, 'Sensors.AcousticVario.BueeLimit').click()
    const after = serializeJson(document)

    expect(singleDifference(source, after)).toEqual({ before: '3.0', after: '2' })
    for (const shape of ['1.0E7', '-0.0', '9007199254740993', '"_clef_doublee": 1']) {
      expect(after, shape).toContain(shape)
    }
  })

  it('mène la ligne à l’état d’usine, d’où « Retirer » devient offert', () => {
    const { page } = editable(BACKUP_2026)
    const row = rowElement(page, 'Display.Theme')
    expect(row.querySelector('.prefs__drop')).toBeNull()

    restoreButton(page, 'Display.Theme').click()

    expect(row.dataset.state).toBe('default')
    expect(restoreLine(page, 'Display.Theme')).toBeNull()
    // Le contrôle montre la valeur rétablie, et le second geste — celui qui rend la clé à
    // l'implicite — devient accessible. Deux clics délibérés, deux effets séparés.
    expect(row.querySelector<HTMLSelectElement>('select')?.value).toBe('WhiteTheme')
    expect(row.querySelector('.prefs__drop')).not.toBeNull()
  })

  it('remet les comptes d’accord, et le geste s’efface une fois accompli', () => {
    const { page } = editable(BACKUP_2026)
    const avant = { ...page.summary }
    restoreButton(page, 'Display.Theme').click()

    expect(page.summary.customCount).toBe(avant.customCount - 1)
    expect(page.summary.defaultCount).toBe(avant.defaultCount + 1)
    expect(page.summary.fileKeyCount).toBe(avant.fileKeyCount)
    expect(page.element.querySelectorAll('.prefs__restore:not([hidden])')).toHaveLength(23)
  })

  it('l’annulation le défait, empreinte comprise', () => {
    const source = readFileSync(BACKUP_2026, 'utf8')
    const document = parseJson(source)
    const history = createHistory(document)
    const page = renderPreferencesPage({
      document: history.current(), catalog, tr,
      // Ce que `main.ts` branche : chaque écriture effective devient un pas d'historique.
      onEdit: (edit) => { history.record(edit.description) }
    })

    restoreButton(page, 'Display.Theme').click()
    expect(history.canUndo()).toBe(true)
    expect(history.undoDescription()).toBe('Rétablir Thème à sa valeur d’usine')
    expect(serializeJson(history.current())).not.toBe(source)
    expect(sha256(serializeJson(history.undo()))).toBe(sha256(source))
    expect(history.isDirty()).toBe(false)
  })

  it('apparaît dès qu’un réglage s’écarte de la valeur d’usine, sans recharger la page', () => {
    const { page } = editable(BACKUP_2026)
    expect(restoreLine(page, 'Display.Fullscreen')).toBeNull()

    const box = controlOf<HTMLInputElement>(page, 'Display.Fullscreen', '.prefs__checkbox')
    box.checked = false
    box.dispatchEvent(new Event('change'))

    expect(rowElement(page, 'Display.Fullscreen').dataset.state).toBe('custom')
    expect(restoreLine(page, 'Display.Fullscreen')).not.toBeNull()
  })

  it('dit d’où vient la valeur d’usine dès que le fichier ne vient pas de cette version', () => {
    const trustOf = (options: Record<string, unknown>): { trust: string; note: string } => {
      const page = renderPreferencesPage({
        document: documentOf(BACKUP_2026), catalog, tr, onEdit: () => {}, ...options
      })
      const line = restoreLine(page, 'Display.Theme')!
      return {
        trust: line.dataset.trust!,
        note: line.querySelector('.prefs__restore-note')!.textContent!
      }
    }

    // La version même du catalogue : rien à ajouter. Une phrase de prudence servie à tort
    // apprend au lecteur à ne plus lire les phrases de prudence.
    const exact = trustOf({ fileVersionCode: catalog.meta.versionCode })
    expect(exact.trust).toBe('exact')
    expect(exact.note).not.toContain('vérifiez')

    // Une autre version : l'avertissement est **dans la phrase**, pas dans l'infobulle —
    // « avant le clic » exclut le survol, et exclut le clavier.
    const other = trustOf({ fileVersionCode: 91230, fileVersionName: '0.9.12.3' })
    expect(other.trust).toBe('indicative')
    // Le nom que l'appareil affiche, sans le suffixe de construction : le catalogue des
    // préférences enregistre « 1.0.3-beta-5-gc036d8f2c », le relevé des gadgets
    // « 1.0.3-beta », et deux écrans du même outil ne doivent pas nommer la même version
    // de deux façons.
    expect(other.note).toContain(DEFAULTS_VERSION_NAME)
    expect(other.note).not.toContain(catalog.meta.versionName!)
    expect(other.note).toContain('vérifiez que c’est bien celle à rétablir')

    // Version inconnue : on ne prétend pas savoir, et on le dit pareillement.
    const unstated = trustOf({})
    expect(unstated.trust).toBe('unstated')
    expect(unstated.note).toContain('n’est pas connue ici')
    expect(unstated.note).toContain('vérifiez que c’est bien celle à rétablir')
  })

  it('l’infobulle dit ce qui sépare ce geste des deux autres', () => {
    const { page } = editable(BACKUP_2026)
    const title = restoreButton(page, 'Display.Theme').title
    expect(title).toContain('Écrit « Display.Theme » : Blanc dans le fichier, à la place de Haut contraste blanc.')
    expect(title).toContain('ils ne touchent qu’un réglage que vous n’avez jamais choisi, celui-ci remplace le vôtre')
  })

  it('emploie le même intitulé que le panneau des gadgets, mot pour mot', () => {
    // Deux formulations pour un même geste, sur deux écrans du même outil, seraient un
    // défaut à elles seules. C'est déjà la règle des deux premiers gestes.
    //
    // Depuis que la prose est versée au catalogue, l'accord ne tient plus à ce que deux
    // constantes portent la même chaîne : il tient à **ce test**, que
    // `tests/ui/properties.test.ts` double depuis l'autre bord. La constante française du
    // panneau des gadgets a disparu avec le dernier écran qui l'employait.
    //
    // ⚠️ Volontairement **pas** dans `common.ts` : ce geste n'est partagé qu'entre deux
    // domaines, et y monter une clé ferait de ce fichier-là un point de conflit permanent
    // pour économiser trois lignes.
    expect(RESTORE_LABEL).toBe('preferences.restoreLabel')
    expect(frenchMessages['preferences.restoreLabel'])
      .toBe(frenchMessages['properties.restoreFactoryValue'])
    expect(tr.t(RESTORE_LABEL)).toBe('Rétablir la valeur d’usine')
    const { page } = editable(BACKUP_2026)
    expect(restoreButton(page, 'Display.Theme').textContent).toBe(tr.t(RESTORE_LABEL))
  })
})
