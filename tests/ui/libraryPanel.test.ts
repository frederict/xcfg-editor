import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createLibrary, type Library, type LibraryEntry } from '../../src/library/library'
import { createMemoryStore, type MemoryStore } from '../../src/library/memoryStore'
import { blobKey } from '../../src/library/store'
import { sha256Hex } from '../../src/library/digest'
import { importLibrary } from '../../src/library/transfer'
import { openContainer } from '../../src/core/container'
import { describeContainer } from '../../src/library/identity'
import {
  exportTypeChip,
  exportTypeLabel,
  formatStamp,
  identityCard,
  personalDataCount,
  personalDatumWhere,
  openLibraryDialog,
  renderLibraryPanel,
  stemOf,
  type CurrentDocument,
  type LibraryPanelHandle,
  type LibraryPanelOptions
} from '../../src/ui/libraryPanel'
import { makeTranslator } from '../../src/i18n/translate'
import fr from '../../src/i18n/messages/fr'
import { ARCHIVE, BACKUP_2026, FORMES_PRESERVEES, PAGES_2026 } from '../fixtures/paths'

/**
 * L'interface de la bibliothèque, éprouvée sur les fichiers réels du corpus.
 *
 * ## ⚠️ Ce que ces tests NE prouvent PAS — à lire avant de croire le vert
 *
 * `happy-dom` ne fournit **pas** d'IndexedDB (mesuré : `typeof indexedDB === 'undefined'`
 * sous Vitest 4.1.11 / happy-dom 20.11.6) et la consigne interdit d'ajouter
 * `fake-indexeddb`. Tout ce fichier tourne donc sur `createMemoryStore()`, et il faut en
 * tirer les conséquences honnêtement :
 *
 * - **Rien sur le quota réel.** `capacityBytes` simule un plafond pour éprouver *le chemin
 *   de code* qui traduit un refus en `LibraryError` `quota` et le montre au pilote avec son
 *   issue. Il n'éprouve ni le moment où un vrai navigateur refuse, ni son message.
 * - **Rien sur la persistance.** Le bandeau « rangement non durable » est vérifié sur
 *   `store.durable`, pas sur un navigateur qui refuse vraiment de conserver quoi que ce
 *   soit. Ce qu'un onglet fermé emporte ne se mesure qu'en navigateur.
 * - **Rien sur la concurrence de deux onglets.** Le conflit est simulé par deux instances
 *   de `Library` sur le même magasin, dans le même processus : cela éprouve le contrôle de
 *   révision et ce que l'interface en fait, pas l'atomicité de la transaction IndexedDB.
 * - **Rien sur le rendu visuel.** happy-dom ne calcule pas la cascade d'une feuille
 *   externe : la tête collante des modales est contrôlée textuellement, comme dans
 *   `tests/ui/appStyle.test.ts`.
 *
 * Ce qui *est* prouvé ici : le geste du pilote — ranger, retrouver, ressortir à l'octet
 * près, revenir en arrière — la séparation du lu et du supposé, et le fait qu'aucune
 * défaillance ne soit passée sous silence.
 */

/**
 * Le traducteur que l'assembleur passe au panneau. Français : c'est la langue dans
 * laquelle ce fichier lit ce qu'il vérifie, et le catalogue français est la source de
 * vérité du jeu de clés. Les quatre autres langues sont éprouvées par
 * `tests/i18n/catalog.test.ts`, qui les compare toutes au français.
 */
const tr = makeTranslator('fr', fr)

const PAGES = new Uint8Array(readFileSync(PAGES_2026))
const BACKUP = new Uint8Array(readFileSync(BACKUP_2026))
const FORMES = new Uint8Array(readFileSync(FORMES_PRESERVEES))
const ARCHIVE_BYTES = new Uint8Array(readFileSync(ARCHIVE))

/* ============================================================== outillage de manipulation */

/** Laisse tourner la boucle : le panneau redessine sur des promesses. */
async function settle(times = 8): Promise<void> {
  for (let index = 0; index < times; index++) {
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
}

function bibliotheque(store: MemoryStore = createMemoryStore()): { library: Library; store: MemoryStore } {
  let tick = 0
  let count = 0
  const library = createLibrary({
    store,
    // Aucun canal : deux onglets ne sont pas ce qu'on éprouve ici, et `BroadcastChannel`
    // livrerait de façon asynchrone au milieu des assertions.
    channel: null,
    now: () => new Date(Date.UTC(2026, 7, 20, 10, 0, tick++)),
    newId: () => `id-${++count}`
  })
  return { library, store }
}

/**
 * Attend qu'une condition devienne vraie. L'export d'une bibliothèque compresse ses
 * membres : le nombre de tours de boucle nécessaires dépend de la machine, et un compte
 * fixe rend le test intermittent — mesuré, il passait seul et échouait dans la suite
 * complète.
 */
async function waitFor(condition: () => boolean, label: string): Promise<void> {
  for (let index = 0; index < 200; index++) {
    if (condition()) return
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  expect.fail(`condition jamais atteinte : ${label}`)
}

/**
 * Les niveaux ouverts dans le panneau. Il n'y en a **jamais plus d'un à l'écran** : c'est
 * la propriété que ce fichier surveille, et `layers()` la mesure au lieu de la supposer.
 */
const openViews = (): HTMLElement[] =>
  [...document.querySelectorAll('.library__viewFrame')] as HTMLElement[]

/** Le niveau ouvert. Échoue s'il n'y en a aucun — ou s'il y en a deux. */
function currentView(): HTMLElement {
  const frames = openViews()
  expect(frames, 'aucun niveau ouvert dans le panneau').toHaveLength(1)
  return frames[0]!
}

/** Le titre du niveau ouvert : c'est lui qui dit au pilote où il est. */
const viewTitle = (): string =>
  text(currentView().querySelector('.library__viewTitle')).trim()

/**
 * Les couches empilées à l'écran : les `<dialog>` ouvertes, plus le niveau du panneau
 * s'il y en a un. C'est le chiffre de l'audit — il valait 2, puis 3 au moment de
 * supprimer.
 */
const layers = (): number =>
  [...document.querySelectorAll('dialog')].filter((node) => node.hasAttribute('open')).length

const text = (node: ParentNode | null): string => (node as HTMLElement | null)?.textContent ?? ''

function findButton(root: ParentNode, label: string): HTMLButtonElement {
  const found = [...root.querySelectorAll('button')]
    .find((node) => (node.textContent ?? '').trim() === label)
  expect(found, `bouton absent : « ${label} » parmi ` +
    [...root.querySelectorAll('button')].map((n) => n.textContent).join(' | ')).toBeDefined()
  return found as HTMLButtonElement
}

function click(root: ParentNode, label: string): void {
  findButton(root, label).click()
}

const flashText = (panel: HTMLElement): string =>
  text(panel.querySelector('.library__flash'))

/** Le panneau monté dans le document, avec les octets téléchargés capturés. */
interface Harness {
  handle: LibraryPanelHandle
  panel: HTMLElement
  downloads: Array<{ bytes: Uint8Array; fileName: string }>
  loaded: Array<{ entry: LibraryEntry; bytes: Uint8Array }>
}

async function mount(options: Partial<LibraryPanelOptions> & { library: Library }): Promise<Harness> {
  const downloads: Harness['downloads'] = []
  const loaded: Harness['loaded'] = []
  const handle = renderLibraryPanel({
    tr,
    now: () => new Date(2026, 7, 21, 15, 32, 7),
    download: (bytes, fileName) => downloads.push({ bytes, fileName }),
    onLoad: (entry, bytes) => { loaded.push({ entry, bytes }) },
    ...options
  })
  document.body.append(handle.element)
  await settle()
  return { handle, panel: handle.element, downloads, loaded }
}

/** Le document ouvert, tel que l'assembleur le décrirait. */
function ouvert(bytes: Uint8Array, modified: boolean, fileName = 'comp-annecy.xcfg'): CurrentDocument {
  return { fileName, modified, bytes: async () => bytes }
}

/** Remplit un champ du niveau ouvert, par son intitulé. */
function fill(label: string, value: string): void {
  const field = [...currentView().querySelectorAll('.library__field')]
    .find((node) => text(node.querySelector('.library__fieldLabel')).startsWith(label))
  expect(field, `champ absent : ${label}`).toBeDefined()
  const input = field!.querySelector('input, textarea') as HTMLInputElement | HTMLTextAreaElement
  input.value = value
}

afterEach(() => {
  document.body.textContent = ''
})

/* ========================================================= les fonctions pures, hors DOM */

describe('libraryPanel — la mise en français', () => {
  it('les sélecteurs de fichiers cachés restent hors de l’arbre d’accessibilité', () => {
    const { library } = bibliotheque()
    const handle = renderLibraryPanel({ tr, library })
    const pickers = [...handle.element.querySelectorAll('input[type="file"]')]
    expect(pickers).toHaveLength(2)
    for (const picker of pickers) {
      expect(picker.getAttribute('aria-hidden')).toBe('true')
      expect((picker as HTMLInputElement).tabIndex).toBe(-1)
    }
    handle.close()
  })

  it('une date absente ou illisible se dit, elle ne se devine pas', () => {
    expect(formatStamp(tr, '')).toBe('date inconnue')
    expect(formatStamp(tr, 'pas une date')).toBe('date inconnue')
    const iso = '2026-08-20T10:00:00.000Z'
    // L'heure est locale : on ne compare que ce qui ne dépend pas du fuseau.
    expect(formatStamp(tr, iso)).toContain(String(new Date(iso).getFullYear()))
    // « 3 août 2026 à 14:32 ». L'heure s'écrit à la mode de CLDR, celle que le système
    // d'exploitation du pilote emploie partout ailleurs ; le « 14 h 32 » typographique
    // était un choix maison, et il ne se transpose dans aucune des quatre autres langues.
    expect(formatStamp(tr, iso)).toMatch(/\d{1,2} \p{L}+ \d{4} à \d{2}:\d{2}/u)
  })

  it('un format d’export absent est dit non déclaré, jamais deviné', () => {
    expect(exportTypeLabel(tr, 'backup')).toContain('Sauvegarde complète')
    expect(exportTypeLabel(tr, 'pages')).toContain('Pages seules')
    expect(exportTypeLabel(tr, undefined)).toBe('Non déclaré par le fichier')
    expect(exportTypeChip(tr, undefined)).toBe('Type non déclaré')
  })

  it('le radical d’un nom de fichier sert de nom proposé', () => {
    expect(stemOf('comp-annecy.xcfg')).toBe('comp-annecy')
    expect(stemOf('archive.xczfg')).toBe('archive')
    expect(stemOf('.cache')).toBe('.cache')
    expect(stemOf('')).toBe('Configuration')
  })

  it('l’emplacement d’une donnée personnelle dit si elle voyage', () => {
    const datum = {
      key: 'a', kind: 'freeText', basis: 'declared', filled: true, value: 'b',
      reasonKey: 'personalReason.text'
    } as const
    expect(personalDatumWhere(tr, { ...datum, home: 'layout' }))
      .toContain('part avec les pages')
    expect(personalDatumWhere(tr, { ...datum, home: 'preferences' }))
      .toContain('reste chez vous')
  })
})

/* =============================================== la carte d'identité : lu contre supposé */

async function identityOf(bytes: Uint8Array, fileName: string, pro?: (shortName: string) => boolean) {
  const container = await openContainer(bytes, fileName)
  return describeContainer(container, {
    ...(pro === undefined ? {} : { isProWidget: pro }),
    referenceVersionCode: 100030
  })
}

describe('libraryPanel — la carte d’identité ne mélange pas le lu et le supposé', () => {
  it('la résolution n’apparaît que du côté supposé — le fichier n’en porte aucune', async () => {
    const identity = await identityOf(BACKUP, 'backup.xcfg')
    const card = identityCard(tr, identity)

    const lu = card.read.map((fact) => `${fact.label} ${fact.value} ${fact.note ?? ''}`).join('\n')
    const suppose = card.assumed.map((fact) => `${fact.label} ${fact.value} ${fact.note ?? ''}`).join('\n')

    // La chaîne d'appareil est LUE ; la résolution qu'on lui associe ne l'est pas.
    expect(lu).toContain('AIR3-7.2')
    expect(lu).not.toMatch(/1280 × 720/)
    expect(suppose).toMatch(/1280 × 720/)
    expect(suppose).toContain('table d’appareils de cet éditeur')
  })

  it('le versionCode lu et la comparaison supposée ne sont pas dans la même moitié', async () => {
    const identity = await identityOf(BACKUP, 'backup.xcfg')
    const card = identityCard(tr, identity)
    const version = card.read.find((fact) => fact.label === 'Version de XCTrack déclarée')
    expect(version?.value).toContain(String(identity.read.versionCode))

    const gap = card.assumed.find((fact) => fact.label === 'Situation de la version')
    // Le repère est nommé dans la phrase : « la version de référence de cet éditeur »
    // ne désignait rien pour un pilote.
    expect(gap?.value).toBe('Celle sur laquelle cet éditeur dessine')
    expect(gap?.note).toContain('règle son dessin')
  })

  it('sans catalogue, le drapeau Pro est dit inconnu — jamais « aucun »', async () => {
    const sansCatalogue = identityCard(tr, await identityOf(BACKUP, 'backup.xcfg'))
    const pro = sansCatalogue.assumed.find((fact) => fact.label === 'Gadgets « Pro »')
    expect(pro?.value).toContain('Inconnu')
    expect(pro?.note).toContain('On ne devine pas')

    const avecCatalogue = identityCard(tr,
      await identityOf(BACKUP, 'backup.xcfg', (shortName) => shortName === 'WCompMap')
    )
    const dit = avecCatalogue.assumed.find((fact) => fact.label === 'Gadgets « Pro »')
    expect(dit?.value).toContain('Carte de la manche')
    expect(dit?.note).toContain('APK')
  })

  it('un « pages » dit qu’il ne porte aucune préférence, et l’archive dit ses annexes', async () => {
    const pages = identityCard(tr, await identityOf(PAGES, 'pages.xcfg'))
    const reglages = pages.read.find((fact) => fact.label === 'Réglages enregistrés')
    expect(reglages?.value).toContain('aucune')

    const archive = identityCard(tr, await identityOf(ARCHIVE_BYTES, 'media.xczfg'))
    const conteneur = archive.read.find((fact) => fact.label === 'Conteneur')
    expect(conteneur?.value).toContain('Archive .xczfg')
  })

  it('le fichier au téléphone est signalé comme voyageant avec les pages', async () => {
    const identity = await identityOf(FORMES, 'formes-preservees.xcfg')
    const compte = personalDataCount(identity)
    expect(compte.inLayout).toBeGreaterThan(0)

    const card = identityCard(tr, identity)
    const voyage = card.assumed.find((fact) => fact.label.startsWith('Données personnelles'))
    expect(voyage?.value).toContain('Oui')
    expect(voyage?.note).toContain('n’est donc pas anonyme')
  })
})

/* ================================================================ ranger, retrouver, revenir */

describe('libraryPanel — le geste du pilote', () => {
  it('ranger la configuration ouverte la fait apparaître sous son nom', async () => {
    const { library } = bibliotheque()
    const harness = await mount({ library, current: () => ouvert(PAGES, false) })

    click(harness.panel, 'Ranger la configuration ouverte')
    // Le nom proposé est le radical du fichier ouvert : le pilote n'a rien à taper.
    const input = currentView().querySelector('.library__input') as HTMLInputElement
    expect(input.value).toBe('comp-annecy')
    fill('Nom', 'Comp Annecy')
    fill('Note', 'Réglée pour la manche de samedi')
    click(currentView(), 'Ranger')
    await settle()

    expect(text(harness.panel.querySelector('.library__entryName'))).toBe('Comp Annecy')
    expect(text(harness.panel.querySelector('.library__entryNote')))
      .toBe('Réglée pour la manche de samedi')
    expect(flashText(harness.panel)).toContain('est rangée')
    expect(text(harness.panel.querySelector('.library__meta'))).toContain('Pages seules')
  })

  it('trois configurations coexistent — ce que XCTrack ne sait pas faire', async () => {
    const { library } = bibliotheque()
    for (const name of ['Comp Annecy', 'Vol-biv Alpes', 'École']) {
      await library.add({ name, bytes: PAGES, fileName: `${name}.xcfg` })
    }
    const harness = await mount({ library })
    const names = [...harness.panel.querySelectorAll('.library__entryName')].map((n) => n.textContent)
    expect(names).toEqual(['École', 'Vol-biv Alpes', 'Comp Annecy'])
    expect(text(harness.panel.querySelector('.library__foot'))).toContain('3 configurations rangées')
  })

  it('ressortir une entrée rend les octets d’origine, empreinte identique', async () => {
    const { library } = bibliotheque()
    await library.add({ name: 'Comp Annecy', bytes: BACKUP, fileName: 'backup.xcfg' })
    const harness = await mount({ library })

    click(harness.panel, 'Ressortir le fichier')
    await settle()

    expect(harness.downloads).toHaveLength(1)
    const sorti = harness.downloads[0]!
    expect(sorti.fileName).toBe('backup-2026-08-21-1532.xcfg')
    expect(Buffer.from(sorti.bytes).equals(Buffer.from(BACKUP))).toBe(true)
    expect(await sha256Hex(sorti.bytes)).toBe(await sha256Hex(BACKUP))
    expect(flashText(harness.panel)).toContain('telle qu’elle est entrée')
  })

  it('une archive .xczfg ressort en .xczfg, sans être reconstruite', async () => {
    const { library } = bibliotheque()
    await library.add({ name: 'Avec photos', bytes: ARCHIVE_BYTES, fileName: 'media.xczfg' })
    const harness = await mount({ library })

    click(harness.panel, 'Ressortir le fichier')
    await settle()
    expect(harness.downloads[0]!.fileName.endsWith('.xczfg')).toBe(true)
    expect(Buffer.from(harness.downloads[0]!.bytes).equals(Buffer.from(ARCHIVE_BYTES))).toBe(true)
  })

  it('la vérification d’empreinte montre les deux valeurs, celle rangée et celle recalculée', async () => {
    const { library } = bibliotheque()
    await library.add({ name: 'Comp Annecy', bytes: PAGES, fileName: 'p.xcfg' })
    const harness = await mount({ library })

    click(harness.panel, 'Vérifier l’empreinte')
    await settle()

    const dialog = currentView()
    const digests = [...dialog.querySelectorAll('.library__digest')].map((n) => n.textContent)
    expect(digests).toHaveLength(2)
    expect(digests[0]).toBe(await sha256Hex(PAGES))
    expect(digests[1]).toBe(digests[0])
    expect(text(dialog.querySelector('.library__verdict'))).toContain('Identiques')
  })

  it('la carte d’identité s’ouvre en deux moitiés titrées', async () => {
    const { library } = bibliotheque()
    await library.add({ name: 'Comp Annecy', bytes: BACKUP, fileName: 'b.xcfg' })
    const harness = await mount({ library })

    click(harness.panel, 'Carte d’identité')
    await settle()

    const dialog = currentView()
    const titres = [...dialog.querySelectorAll('.library__heading')].map((n) => n.textContent)
    expect(titres).toContain('Ce que le fichier déclare')
    expect(titres).toContain('Ce que cet éditeur suppose')
    // La vignette est là, et elle porte une page dessinée — pas un cadre en pointillés.
    const vignette = dialog.querySelector('.library__preview')
    expect(vignette).not.toBeNull()
    expect(vignette!.querySelector('svg.xc-page-scene')).not.toBeNull()
    // Elle dit quelle page elle montre, ce qu'elle masque, et qu'elle ne voyage pas.
    expect(text(dialog)).toContain('Page 1 en paysage')
    expect(text(dialog)).toContain('barres grises')
    expect(text(dialog)).toContain('n’emporte aucun aperçu')
  })

  it('un niveau sans action s’ouvre sur son début, pas sur son dernier paragraphe', async () => {
    // Le focus au bouton de fin faisait défiler la carte jusqu'en bas à l'ouverture
    // (mesuré au pilote CDP). Il va donc au retour, en tête du niveau.
    const { library } = bibliotheque()
    await library.add({ name: 'Comp Annecy', bytes: BACKUP, fileName: 'b.xcfg' })
    const harness = await mount({ library })

    click(harness.panel, 'Carte d’identité')
    await settle()
    const head = currentView().querySelector('.library__viewHead') as HTMLElement
    expect(head.contains(document.activeElement)).toBe(true)
  })

  it('renommer passe par la révision lue, et l’entrée garde ses octets', async () => {
    const { library } = bibliotheque()
    const entry = await library.add({ name: 'Sans titre', bytes: PAGES, fileName: 'p.xcfg' })
    const harness = await mount({ library })

    click(harness.panel, 'Renommer')
    fill('Nom', 'École')
    click(currentView(), 'Enregistrer')
    await settle()

    expect(text(harness.panel.querySelector('.library__entryName'))).toBe('École')
    expect(Buffer.from(await library.bytesOf(entry.id)).equals(Buffer.from(PAGES))).toBe(true)
  })
})

/* ========================================== revenir en arrière avec un document modifié */

describe('libraryPanel — charger une autre configuration', () => {
  it('sans modification en cours, le chargement part directement', async () => {
    const { library } = bibliotheque()
    await library.add({ name: 'École', bytes: PAGES, fileName: 'p.xcfg' })
    const harness = await mount({ library, current: () => ouvert(BACKUP, false) })

    click(harness.panel, 'Charger')
    await settle()

    expect(harness.loaded).toHaveLength(1)
    expect(harness.loaded[0]!.entry.name).toBe('École')
    expect(Buffer.from(harness.loaded[0]!.bytes).equals(Buffer.from(PAGES))).toBe(true)
    expect(openViews()).toHaveLength(0)
  })

  it('avec des modifications non enregistrées, on s’arrête et on demande', async () => {
    const { library } = bibliotheque()
    await library.add({ name: 'École', bytes: PAGES, fileName: 'p.xcfg' })
    const harness = await mount({ library, current: () => ouvert(BACKUP, true) })

    click(harness.panel, 'Charger')
    await settle()

    expect(harness.loaded).toHaveLength(0)
    const dialog = currentView()
    expect(viewTitle()).toBe('Des modifications ne sont pas enregistrées')
    // Trois issues, dont la première ne perd rien.
    expect(findButton(dialog, 'Ranger d’abord, puis charger')).toBeDefined()
    expect(findButton(dialog, 'Charger sans ranger')).toBeDefined()
    expect(findButton(dialog, 'Annuler')).toBeDefined()
  })

  it('« Annuler » ne charge rien et ne range rien', async () => {
    const { library } = bibliotheque()
    await library.add({ name: 'École', bytes: PAGES, fileName: 'p.xcfg' })
    const harness = await mount({ library, current: () => ouvert(BACKUP, true) })

    click(harness.panel, 'Charger')
    click(currentView(), 'Annuler')
    await settle()

    expect(harness.loaded).toHaveLength(0)
    expect((await library.read()).entries).toHaveLength(1)
  })

  it('« Ranger d’abord » range la configuration ouverte, puis charge l’autre', async () => {
    const { library } = bibliotheque()
    await library.add({ name: 'École', bytes: PAGES, fileName: 'p.xcfg' })
    const harness = await mount({
      library,
      current: () => ouvert(BACKUP, true, 'travail-en-cours.xcfg')
    })

    click(harness.panel, 'Charger')
    click(currentView(), 'Ranger d’abord, puis charger')
    await settle()
    fill('Nom', 'Travail en cours')
    click(currentView(), 'Ranger')
    await settle()

    const snapshot = await library.read()
    expect(snapshot.entries.map((e) => e.name)).toEqual(['Travail en cours', 'École'])
    // Les octets du document ouvert sont rangés tels quels, puis l'autre est chargée.
    const range = snapshot.entries[0]!
    expect(Buffer.from(await library.bytesOf(range.id)).equals(Buffer.from(BACKUP))).toBe(true)
    expect(harness.loaded.map((l) => l.entry.name)).toEqual(['École'])
  })

  it('« Charger sans ranger » charge, et ne range rien', async () => {
    const { library } = bibliotheque()
    await library.add({ name: 'École', bytes: PAGES, fileName: 'p.xcfg' })
    const harness = await mount({ library, current: () => ouvert(BACKUP, true) })

    click(harness.panel, 'Charger')
    click(currentView(), 'Charger sans ranger')
    await settle()

    expect(harness.loaded.map((l) => l.entry.name)).toEqual(['École'])
    expect((await library.read()).entries).toHaveLength(1)
  })

  it('sans rappel de chargement, le bouton n’existe pas — le panneau reste utile', async () => {
    const { library } = bibliotheque()
    await library.add({ name: 'École', bytes: PAGES, fileName: 'p.xcfg' })
    const handle = renderLibraryPanel({ tr, library, download: () => {} })
    document.body.append(handle.element)
    await settle()

    const labels = [...handle.element.querySelectorAll('.library__entryActions button')]
      .map((n) => n.textContent)
    expect(labels).not.toContain('Charger')
    expect(labels).toContain('Ressortir le fichier')
  })
})

/* ============================================================ ce qu'on refuse de taire */

describe('libraryPanel — une entrée illisible', () => {
  it('est montrée avec sa raison, sans empêcher les autres de s’afficher', async () => {
    const { library, store } = bibliotheque()
    await library.add({ name: 'Saine', bytes: PAGES, fileName: 'p.xcfg' })
    store.injectRaw('cassee', { id: 'cassee', name: 'Sans empreinte', revision: 1 })
    const harness = await mount({ library })

    expect(text(harness.panel.querySelector('.library__entryName'))).toBe('Saine')
    const broken = harness.panel.querySelector('.library__entry--broken')
    expect(text(broken)).toContain('cassee')
    expect(text(broken)).toContain('champs illisibles')
    expect(text(harness.panel.querySelector('.library__foot'))).toContain('1 entrée illisible')
  })

  it('reste supprimable — sans quoi la bibliothèque serait bloquée', async () => {
    const { library, store } = bibliotheque()
    store.injectRaw('cassee', { id: 'cassee' })
    const harness = await mount({ library })

    const broken = harness.panel.querySelector('.library__entry--broken') as HTMLElement
    click(broken, 'Supprimer')
    click(currentView(), 'Supprimer')
    await settle()

    expect((await library.read()).broken).toEqual([])
    expect(harness.panel.querySelector('.library__entry--broken')).toBeNull()
  })

  it('des octets altérés ne ressortent pas : l’échec est dit, rien n’est téléchargé', async () => {
    const { library, store } = bibliotheque()
    const entry = await library.add({ name: 'Comp Annecy', bytes: PAGES, fileName: 'p.xcfg' })
    const abime = PAGES.slice()
    abime[1000] = abime[1000]! ^ 0x01
    store.injectBlob(blobKey(entry.id), abime)

    const harness = await mount({ library })
    click(harness.panel, 'Ressortir le fichier')
    await settle()

    expect(harness.downloads).toHaveLength(0)
    expect(flashText(harness.panel)).toContain('ne rend plus son empreinte d’origine')
  })

  it('la vérification s’affiche même quand elle échoue — sinon elle ne vérifie rien', async () => {
    const { library, store } = bibliotheque()
    const entry = await library.add({ name: 'Comp Annecy', bytes: PAGES, fileName: 'p.xcfg' })
    const abime = PAGES.slice()
    abime[1000] = abime[1000]! ^ 0x01
    store.injectBlob(blobKey(entry.id), abime)

    const harness = await mount({ library })
    click(harness.panel, 'Vérifier l’empreinte')
    await settle()

    const dialog = currentView()
    expect(viewTitle()).toContain('Empreinte')
    expect(text(dialog.querySelector('.library__digest'))).toBe(entry.sha256)
    expect(text(dialog)).toContain('aucune — les octets n’ont pas été rendus')
    expect(text(dialog.querySelector('.library__verdict'))).toContain('Différentes')
    expect(text(dialog.querySelector('.library__caveat'))).toContain('altérés')
  })
})

describe('libraryPanel — le quota, le conflit, la durabilité', () => {
  it('un quota atteint est dit, avec l’export comme issue', async () => {
    // ⚠️ Plafond simulé : cela éprouve le chemin de code, pas un vrai navigateur plein.
    const { library } = bibliotheque(createMemoryStore({ capacityBytes: 1024 }))
    const harness = await mount({ library, current: () => ouvert(PAGES, false) })

    click(harness.panel, 'Ranger la configuration ouverte')
    click(currentView(), 'Ranger')
    await settle()

    const flash = harness.panel.querySelector('.library__flash') as HTMLElement
    expect(flash.className).toContain('library__flash--trouble')
    expect(text(flash)).toContain('l’espace accordé à ce site est plein')
    expect(findButton(flash, 'Exporter la bibliothèque maintenant')).toBeDefined()
    expect((await library.read()).entries).toEqual([])
  })

  it('un conflit entre onglets propose un rechargement, jamais un écrasement', async () => {
    const { library, store } = bibliotheque()
    const entry = await library.add({ name: 'Comp Annecy', bytes: PAGES, fileName: 'p.xcfg' })
    const harness = await mount({ library })

    // L'autre onglet renomme pendant que le panneau tient la révision 1.
    const autre = createLibrary({ store, channel: null })
    await autre.rename(entry.id, 'Renommée ailleurs', entry.revision)

    click(harness.panel, 'Renommer')
    fill('Nom', 'Ce que je tape ici')
    click(currentView(), 'Enregistrer')
    await settle()

    const flash = harness.panel.querySelector('.library__flash') as HTMLElement
    expect(text(flash)).toContain('un autre onglet l’a modifiée')
    expect(text(flash)).toContain('Rien n’a été écrit')
    expect(findButton(flash, 'Recharger la bibliothèque')).toBeDefined()
    // Le nom de l'autre onglet a survécu : rien n'a été écrasé.
    expect((await library.read()).entries[0]!.name).toBe('Renommée ailleurs')
  })

  it('un rangement non durable est annoncé avant tout le reste', async () => {
    const { library } = bibliotheque(createMemoryStore({ durable: false }))
    const harness = await mount({ library })

    const banner = harness.panel.querySelector('.library__banner') as HTMLElement
    expect(banner.hidden).toBe(false)
    expect(text(banner)).toContain('Rangement non durable')
    expect(text(banner)).toContain('ce n’est pas une sauvegarde')
    expect(findButton(banner, 'Exporter la bibliothèque maintenant')).toBeDefined()
    // Le bandeau vient avant la liste dans l'ordre du document.
    const body = harness.panel.querySelector('.library__body') as HTMLElement
    expect(banner.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('un rangement durable n’affiche aucun bandeau', async () => {
    const { library } = bibliotheque(createMemoryStore({ durable: true }))
    const harness = await mount({ library })
    expect((harness.panel.querySelector('.library__banner') as HTMLElement).hidden).toBe(true)
  })

  it('l’espace non renseigné par le navigateur ne devient pas une jauge inventée', async () => {
    const { library } = bibliotheque(createMemoryStore({ durable: true }))
    const harness = await mount({ library, estimateStorage: async () => undefined })
    expect(text(harness.panel.querySelector('.library__foot')))
      .toContain('ne dit rien de l’espace disponible')
  })
})

/* ================================================== données personnelles, avant partage */

describe('libraryPanel — ce qui est personnel est signalé', () => {
  it('la liste porte le compte, et dit ce qui part avec les pages', async () => {
    const { library } = bibliotheque()
    await library.add({ name: 'Avec téléphone', bytes: FORMES, fileName: 'formes.xcfg' })
    const harness = await mount({ library })

    const flag = text(harness.panel.querySelector('.library__meta .flag'))
    expect(flag).toContain('donnée')
    expect(flag).toContain('avec les pages')
  })

  it('la carte montre chaque valeur, son emplacement, et ne retire rien', async () => {
    const { library } = bibliotheque()
    await library.add({ name: 'Avec téléphone', bytes: FORMES, fileName: 'formes.xcfg' })
    const harness = await mount({ library })

    click(harness.panel, 'Carte d’identité')
    await settle()

    const dialog = currentView()
    const data = [...dialog.querySelectorAll('.library__datum')]
    expect(data.length).toBeGreaterThan(0)
    // Au moins une donnée est marquée comme voyageant avec les pages.
    expect(dialog.querySelector('.library__datum--travels')).not.toBeNull()
    expect(text(dialog)).toContain('jamais retirées')
    expect(text(dialog)).toContain('ce n’est pas un nettoyage')
  })

  it('sans donnée repérée, on ne conclut pas à une absence', async () => {
    const { library } = bibliotheque()
    await library.add({ name: 'Pages nues', bytes: PAGES, fileName: 'p.xcfg' })
    const harness = await mount({ library })

    click(harness.panel, 'Carte d’identité')
    await settle()
    const dialog = currentView()
    if (dialog.querySelector('.library__datum') === null) {
      // La mise en garde est celle du modèle, la même sur les quatre écrans.
      expect(text(dialog)).toContain('un inventaire vide ne prouve donc pas une absence')
    }
  })
})

/* ============================================ sortir la bibliothèque, et la remettre */

describe('libraryPanel — l’export et la réimportation de la bibliothèque entière', () => {
  it('l’archive produite se réimporte entrée par entrée, octets intacts', async () => {
    const { library } = bibliotheque()
    await library.add({ name: 'Comp Annecy', bytes: PAGES, fileName: 'comp.xcfg' })
    await library.add({ name: 'Vol-biv Alpes', bytes: BACKUP, fileName: 'biv.xcfg' })
    const harness = await mount({ library })

    click(harness.panel, 'Exporter la bibliothèque')
    await waitFor(() => harness.downloads.length === 1, 'archive produite')

    expect(harness.downloads).toHaveLength(1)
    expect(harness.downloads[0]!.fileName).toBe('xctrack-bibliotheque-2026-08-21-1532.zip')
    expect(flashText(harness.panel)).toContain('2 configurations exportées')

    // Une bibliothèque neuve, sur une autre machine : l'archive y rétablit tout.
    const { library: ailleurs } = bibliotheque()
    const report = await importLibrary(ailleurs, harness.downloads[0]!.bytes)
    expect(report.results.map((r) => r.outcome)).toEqual(['imported', 'imported'])

    const snapshot = await ailleurs.read()
    expect(snapshot.entries.map((e) => e.name)).toEqual(['Vol-biv Alpes', 'Comp Annecy'])
    const comp = snapshot.entries.find((e) => e.name === 'Comp Annecy')!
    expect(Buffer.from(await ailleurs.bytesOf(comp.id)).equals(Buffer.from(PAGES))).toBe(true)
  })

  it('une entrée illisible n’est pas exportée en silence : le compte le dit', async () => {
    const { library, store } = bibliotheque()
    await library.add({ name: 'Saine', bytes: PAGES, fileName: 'p.xcfg' })
    store.injectRaw('cassee', { id: 'cassee' })
    const harness = await mount({ library })

    click(harness.panel, 'Exporter la bibliothèque')
    await waitFor(() => harness.downloads.length === 1, 'archive produite')
    expect(flashText(harness.panel)).toContain('la sauvegarde est incomplète')
  })
})

/* ===================================================== l'assembleur et le cycle de vie */

describe('libraryPanel — ce que l’assembleur reçoit', () => {
  it('l’élément rendu n’est posé nulle part par le module lui-même', () => {
    const { library } = bibliotheque()
    const handle = renderLibraryPanel({ tr, library })
    expect(handle.element.isConnected).toBe(false)
    expect(handle.element.getAttribute('aria-label')).toBe('Bibliothèque de configurations')
    handle.close()
  })

  it('un changement de la bibliothèque redessine sans que l’appelant y pense', async () => {
    const { library } = bibliotheque()
    const harness = await mount({ library })
    expect(text(harness.panel.querySelector('.library__empty'))).toContain('Rien de rangé')

    await library.add({ name: 'Ajoutée ailleurs', bytes: PAGES, fileName: 'p.xcfg' })
    await settle()
    expect(text(harness.panel.querySelector('.library__entryName'))).toBe('Ajoutée ailleurs')
  })

  it('fermer le panneau le désabonne : plus rien ne le redessine', async () => {
    const { library } = bibliotheque()
    const harness = await mount({ library })
    harness.handle.close()

    await library.add({ name: 'Après fermeture', bytes: PAGES, fileName: 'p.xcfg' })
    await settle()
    expect(harness.panel.querySelector('.library__entryName')).toBeNull()
    // La bibliothèque, elle, n'est pas fermée : elle appartient à l'assembleur.
    expect((await library.read()).entries).toHaveLength(1)
  })

  it('sans document ouvert, ranger la configuration courante le dit plutôt que d’échouer', async () => {
    const { library } = bibliotheque()
    const harness = await mount({ library, current: () => undefined })

    click(harness.panel, 'Ranger la configuration ouverte')
    await settle()
    expect(flashText(harness.panel)).toContain('Aucun fichier n’est ouvert')
    expect(openViews()).toHaveLength(0)
  })
})

/* ============================================ une seule couche, et un seul « Fermer » */

/*
 * Le défaut mesuré par l'audit du 21 août 2026 (§ B.4) : « Ranger la configuration
 * ouverte » ouvrait une seconde `<dialog>` par-dessus celle de la bibliothèque, et les
 * deux boutons « Fermer » se retrouvaient à la même hauteur, 128 px l'un de l'autre.
 * « Supprimer » ajoutait une troisième couche.
 *
 * ⚠️ Ce que ces tests ne mesurent PAS : les pixels. happy-dom ne fait aucune mise en page —
 * `getBoundingClientRect()` y rend des zéros. La collision des deux « Fermer » se mesure au
 * navigateur, et elle l'a été (voir le rapport de ce travail). Ce qui est prouvé ici est ce
 * dont la collision découlait : **le nombre de couches**, et le fait qu'il n'y ait jamais
 * deux façons de fermer quelque chose de différent à l'écran en même temps.
 */

describe('libraryPanel — les niveaux ne s’empilent pas', () => {
  it('ranger n’ouvre aucune boîte : le niveau remplace la liste', async () => {
    const { library } = bibliotheque()
    const harness = await mount({ library, current: () => ouvert(PAGES, false) })

    expect(layers()).toBe(0)
    click(harness.panel, 'Ranger la configuration ouverte')
    await settle()

    // Une seule chose à l'écran : le niveau. Aucune `<dialog>` n'a été créée.
    expect(document.querySelectorAll('dialog')).toHaveLength(0)
    expect(openViews()).toHaveLength(1)
    expect(viewTitle()).toBe('Ranger la configuration ouverte')

    // Et la liste n'est plus là : ni à l'œil, ni à la tabulation, ni pour un lecteur d'écran.
    const main = harness.panel.querySelector('.library__main') as HTMLElement
    expect(main.hidden).toBe(true)
    expect(findButton(currentView(), '← Retour à la liste')).toBeDefined()
  })

  it('au plus profond — supprimer — il n’y a toujours qu’un niveau', async () => {
    const { library } = bibliotheque()
    await library.add({ name: 'Essai audit', bytes: PAGES, fileName: 'p.xcfg' })
    const harness = await mount({ library, current: () => ouvert(BACKUP, true) })

    // Le chemin le plus profond de l'audit : bibliothèque → charger (document modifié)
    // → ranger d'abord → puis, depuis la liste, supprimer.
    click(harness.panel, 'Charger')
    await settle()
    expect(openViews()).toHaveLength(1)

    click(currentView(), 'Ranger d’abord, puis charger')
    await settle()
    // Le niveau suivant REMPLACE le précédent : il ne s'ajoute pas.
    expect(openViews()).toHaveLength(1)
    expect(viewTitle()).toBe('Ranger la configuration ouverte')

    click(currentView(), 'Ranger')
    await settle()
    expect(openViews()).toHaveLength(0)

    click(harness.panel, 'Supprimer')
    await settle()
    expect(openViews()).toHaveLength(1)
    expect(document.querySelectorAll('dialog')).toHaveLength(0)
  })

  it('un seul bouton de fermeture existe à la fois, et il n’en ferme qu’un', async () => {
    const { library } = bibliotheque()
    await library.add({ name: 'Essai audit', bytes: PAGES, fileName: 'p.xcfg' })
    const harness = await mount({ library })

    click(harness.panel, 'Carte d’identité')
    await settle()

    // Aucun « Fermer » dans le panneau : le panneau ne se ferme pas lui-même, et le seul
    // « Fermer » de l'écran est celui de la bibliothèque, posé par l'assembleur.
    const labels = [...harness.panel.querySelectorAll('button')]
      .filter((node) => !(node.closest('[hidden]') !== null))
      .map((node) => (node.textContent ?? '').trim())
    expect(labels.filter((label) => label === 'Fermer')).toHaveLength(0)
    // Le retour est nommé pour ce qu'il fait, et il est unique.
    expect(labels.filter((label) => label.includes('Retour à la liste'))).toHaveLength(2)
  })

  it('le retour rend la liste, et le focus au bouton qui a ouvert le niveau', async () => {
    const { library } = bibliotheque()
    await library.add({ name: 'Essai audit', bytes: PAGES, fileName: 'p.xcfg' })
    const harness = await mount({ library })

    const opener = findButton(harness.panel, 'Carte d’identité')
    opener.focus()
    opener.click()
    await settle()
    expect(currentView().contains(document.activeElement)).toBe(true)

    click(currentView(), '← Retour à la liste')
    await settle()

    expect(openViews()).toHaveLength(0)
    expect((harness.panel.querySelector('.library__main') as HTMLElement).hidden).toBe(false)
    expect(document.activeElement).toBe(opener)
  })

  it('un formulaire ouvre son premier champ, une carte ouvre son retour', async () => {
    const { library } = bibliotheque()
    await library.add({ name: 'Essai audit', bytes: PAGES, fileName: 'p.xcfg' })
    const harness = await mount({ library, current: () => ouvert(PAGES, false) })

    click(harness.panel, 'Ranger la configuration ouverte')
    await settle()
    expect((document.activeElement as HTMLElement).className).toContain('library__input')

    click(currentView(), 'Annuler')
    click(harness.panel, 'Vérifier l’empreinte')
    await settle()
    expect((document.activeElement as HTMLElement).className).toContain('library__back')
  })

  it('le niveau ouvert est annoncé, et le retour aussi', async () => {
    const { library } = bibliotheque()
    await library.add({ name: 'Essai audit', bytes: PAGES, fileName: 'p.xcfg' })
    const harness = await mount({ library })

    // L'annonceur vit HORS du contenu masqué : masqué avec lui, il n'annoncerait rien.
    const announcer = harness.panel.querySelector('[role="status"].sr-only') as HTMLElement
    expect(announcer.closest('.library__main')).toBeNull()

    click(harness.panel, 'Carte d’identité')
    await settle()
    expect(announcer.textContent).toContain('Carte d’identité')

    click(currentView(), 'Retour à la liste')
    await settle()
    expect(announcer.textContent).toContain('Retour à la liste')
  })

  it('« back » dit s’il restait un niveau — c’est ce qui arbitre Échap', async () => {
    const { library } = bibliotheque()
    await library.add({ name: 'Essai audit', bytes: PAGES, fileName: 'p.xcfg' })
    const harness = await mount({ library })

    expect(harness.handle.back()).toBe(false)
    expect(harness.handle.viewTitle()).toBeUndefined()

    click(harness.panel, 'Carte d’identité')
    await settle()
    expect(harness.handle.viewTitle()).toContain('Carte d’identité')
    expect(harness.handle.back()).toBe(true)
    expect(harness.handle.back()).toBe(false)
  })

  it('hors modale, Échap recule d’un niveau et ne fait rien de plus', async () => {
    const { library } = bibliotheque()
    await library.add({ name: 'Essai audit', bytes: PAGES, fileName: 'p.xcfg' })
    const harness = await mount({ library })

    click(harness.panel, 'Renommer')
    await settle()
    expect(openViews()).toHaveLength(1)

    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    ;(document.activeElement as HTMLElement).dispatchEvent(escape)
    await settle()

    expect(openViews()).toHaveLength(0)
    expect(escape.defaultPrevented).toBe(true)
    // Rien n'a été écrit : reculer n'est pas valider.
    expect((await library.read()).entries[0]!.name).toBe('Essai audit')

    // Depuis la liste, Échap n'a rien à annuler : l'événement repart intact vers l'hôte.
    const again = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    harness.panel.dispatchEvent(again)
    expect(again.defaultPrevented).toBe(false)
  })

  it('fermer le panneau referme le niveau ouvert avec lui', async () => {
    const { library } = bibliotheque()
    await library.add({ name: 'Essai audit', bytes: PAGES, fileName: 'p.xcfg' })
    const harness = await mount({ library })

    click(harness.panel, 'Carte d’identité')
    await settle()
    harness.handle.close()

    expect(openViews()).toHaveLength(0)
    expect((harness.panel.querySelector('.library__main') as HTMLElement).hidden).toBe(false)
  })
})

/* ================================== la confirmation de suppression garde sa qualité */

describe('libraryPanel — supprimer nomme ce qui va être perdu', () => {
  it('l’entrée est nommée, sa taille dite, l’absence de corbeille aussi, et l’issue donnée', async () => {
    const { library } = bibliotheque()
    await library.add({ name: 'Essai audit', bytes: PAGES, fileName: 'p.xcfg' })
    const harness = await mount({ library })

    click(harness.panel, 'Supprimer')
    await settle()

    const view = currentView()
    // Le titre nomme désormais l'entrée : en cessant d'être une modale, la confirmation a
    // gagné le nom dans son titre plutôt que de le laisser au seul corps du texte.
    expect(viewTitle()).toBe('Supprimer « Essai audit » ?')
    expect(text(view)).toContain('Essai audit')
    expect(text(view)).toContain(tr.format.byteSize(PAGES.byteLength))
    expect(text(view)).toContain('n’a pas de corbeille')
    // L'issue pour qui doute : ressortir le fichier, ou exporter la bibliothèque.
    expect(text(view.querySelector('.library__caveat'))).toContain('ressortez d’abord le fichier')
    // Et le geste reste explicite : rien n'est supprimé tant qu'on n'a pas dit « Supprimer ».
    expect(findButton(view, 'Supprimer')).toBeDefined()
    expect(findButton(view, 'Annuler')).toBeDefined()
    expect((await library.read()).entries).toHaveLength(1)
  })

  it('ce qui ne se rattrape pas est cadré — le filet remplace l’interruption de la modale', async () => {
    const { library } = bibliotheque()
    await library.add({ name: 'Essai audit', bytes: PAGES, fileName: 'p.xcfg' })
    const harness = await mount({ library })

    click(harness.panel, 'Supprimer')
    await settle()
    expect(currentView().className).toContain('library__viewFrame--grave')
    // Le niveau s'ouvre sur sa SORTIE, pas sur la suppression : le geste le plus
    // destructeur ne doit pas être celui qui demande le moins d'intention.
    expect((document.activeElement as HTMLElement).className).toContain('library__back')

    click(currentView(), 'Annuler')
    await settle()
    expect((await library.read()).entries).toHaveLength(1)

    click(harness.panel, 'Supprimer')
    click(currentView(), 'Supprimer')
    await settle()
    expect((await library.read()).entries).toHaveLength(0)
  })
})

/* ================================================== effacer toute la bibliothèque */

/**
 * La commande la plus destructrice de l'application : elle emporte les octets, et il n'y a
 * ni corbeille ni copie ailleurs. Ce bloc surveille les quatre garde-fous que le panneau
 * s'impose — le chiffre plutôt que le « êtes-vous sûr », l'archive offerte avant la porte,
 * le focus qui ne se pose jamais sur l'effacement, et l'absence du bouton quand il n'y a
 * rien à effacer — plus celui qu'on ne voit pas : un export en échec n'efface rien.
 */
describe('libraryPanel — effacer toute la bibliothèque', () => {
  const CLEAR_ALL = 'Effacer toute la bibliothèque'

  it('n’est pas proposé quand il n’y a rien à effacer', async () => {
    const { library } = bibliotheque()
    const harness = await mount({ library })

    const labels = [...harness.panel.querySelectorAll('button')].map((b) => b.textContent)
    expect(labels).not.toContain(CLEAR_ALL)

    // Et il apparaît dès qu'il y a quelque chose : le pied se redessine tout seul.
    await library.add({ name: 'Comp Annecy', bytes: PAGES, fileName: 'comp.xcfg' })
    await settle()
    expect(findButton(harness.panel, CLEAR_ALL)).toBeDefined()
  })

  it('une entrée illisible seule suffit à le proposer', async () => {
    const { library, store } = bibliotheque()
    store.injectRaw('cassee', { id: 'cassee' })
    const harness = await mount({ library })

    expect(findButton(harness.panel, CLEAR_ALL)).toBeDefined()
  })

  it('chiffre ce qui part — compte, place, entrées illisibles — et dit son étendue', async () => {
    const { library, store } = bibliotheque()
    await library.add({ name: 'Comp Annecy', bytes: PAGES, fileName: 'comp.xcfg' })
    await library.add({ name: 'Vol-biv Alpes', bytes: BACKUP, fileName: 'biv.xcfg' })
    store.injectRaw('cassee', { id: 'cassee' })
    const harness = await mount({ library })

    click(harness.panel, CLEAR_ALL)
    await settle()

    const view = currentView()
    expect(viewTitle()).toBe('Effacer toute la bibliothèque ?')
    // Des chiffres, pas un « êtes-vous sûr » : combien, quelle place, et le reste illisible.
    expect(text(view)).toContain('2 configurations rangées quittent ce navigateur')
    expect(text(view)).toContain(tr.format.byteSize(PAGES.byteLength + BACKUP.byteLength))
    expect(text(view)).toContain('1 entrée illisible')
    // Les octets partent avec, et rien n'a jamais été envoyé ailleurs : aucune copie.
    expect(text(view)).toContain('n’a pas de corbeille')
    expect(text(view)).toContain('aucune copie à récupérer')
    // L'étendue est nommée à l'écran, pas seulement dans le code.
    expect(text(view)).toContain('efface la bibliothèque, et elle seule')
    expect(text(view)).toContain('la langue de l’interface')
    expect(text(view)).toContain('videz les données de ce site')
    // Rien n'est parti tant que rien n'a été choisi.
    expect((await library.read()).entries).toHaveLength(2)
  })

  it('s’ouvre sur la sortie : le focus ne se pose jamais sur l’effacement', async () => {
    const { library } = bibliotheque()
    await library.add({ name: 'Comp Annecy', bytes: PAGES, fileName: 'comp.xcfg' })
    const harness = await mount({ library })

    click(harness.panel, CLEAR_ALL)
    await settle()

    expect(currentView().className).toContain('library__viewFrame--grave')
    // La doctrine du panneau, à l'endroit où elle coûte le plus cher : la barre d'espace
    // au mauvais moment ne doit pas vider la bibliothèque.
    expect((document.activeElement as HTMLElement).className).toContain('library__back')
  })

  it('« Annuler » ne touche à rien', async () => {
    const { library } = bibliotheque()
    await library.add({ name: 'Comp Annecy', bytes: PAGES, fileName: 'comp.xcfg' })
    const harness = await mount({ library })

    click(harness.panel, CLEAR_ALL)
    await settle()
    click(currentView(), 'Annuler')
    await settle()

    expect(openViews()).toHaveLength(0)
    expect((await library.read()).entries).toHaveLength(1)
    expect(harness.downloads).toHaveLength(0)
  })

  it('offre l’archive d’abord, et cette archive rétablit tout ailleurs', async () => {
    const { library } = bibliotheque()
    await library.add({ name: 'Comp Annecy', bytes: PAGES, fileName: 'comp.xcfg' })
    await library.add({ name: 'Vol-biv Alpes', bytes: BACKUP, fileName: 'biv.xcfg' })
    const harness = await mount({ library })

    click(harness.panel, CLEAR_ALL)
    await settle()
    // Le premier choix est celui qui ne perd rien — même forme que « Ranger d'abord ».
    click(currentView(), 'Exporter l’archive d’abord, puis tout effacer')
    await waitFor(() => harness.downloads.length === 1, 'archive produite')
    await settle()

    expect((await library.read()).entries).toHaveLength(0)
    expect(flashText(harness.panel)).toContain('L’archive est téléchargée')
    expect(flashText(harness.panel)).toContain('2 configurations effacées')

    // La sortie tient vraiment : l'archive remonte les deux entrées, octets identiques.
    const { library: ailleurs } = bibliotheque()
    const report = await importLibrary(ailleurs, harness.downloads[0]!.bytes)
    expect(report.results.map((r) => r.outcome)).toEqual(['imported', 'imported'])
    const snapshot = await ailleurs.read()
    const comp = snapshot.entries.find((e) => e.name === 'Comp Annecy')!
    expect(Buffer.from(await ailleurs.bytesOf(comp.id)).equals(Buffer.from(PAGES))).toBe(true)
  })

  it('un export qui échoue n’efface rien', async () => {
    const { library } = bibliotheque()
    await library.add({ name: 'Comp Annecy', bytes: PAGES, fileName: 'comp.xcfg' })
    const harness = await mount({
      library,
      // Le navigateur refuse la livraison. C'est exactement le cas où effacer derrière
      // ferait tout perdre à quelqu'un qui croit avoir sauvegardé.
      download: () => { throw new Error('téléchargement refusé') }
    })

    click(harness.panel, CLEAR_ALL)
    await settle()
    click(currentView(), 'Exporter l’archive d’abord, puis tout effacer')
    await waitFor(() => flashText(harness.panel).includes('Export de la bibliothèque'), 'échec dit')
    await settle()

    expect((await library.read()).entries).toHaveLength(1)
    expect(flashText(harness.panel)).toContain('téléchargement refusé')
  })

  it('« Tout effacer sans exporter » vide, et le dit avec ses chiffres', async () => {
    const { library, store } = bibliotheque()
    await library.add({ name: 'Comp Annecy', bytes: PAGES, fileName: 'comp.xcfg' })
    store.injectRaw('cassee', { id: 'cassee' })
    const harness = await mount({ library })

    click(harness.panel, CLEAR_ALL)
    await settle()
    click(currentView(), 'Tout effacer sans exporter')
    await settle()

    const snapshot = await library.read()
    expect(snapshot.entries).toEqual([])
    expect(snapshot.broken).toEqual([])
    expect(harness.downloads).toHaveLength(0)
    expect(flashText(harness.panel)).toContain('La bibliothèque est vide')
    expect(flashText(harness.panel)).toContain('1 configuration effacée')
    // Le bouton disparaît avec ce qu'il effaçait.
    const labels = [...harness.panel.querySelectorAll('button')].map((b) => b.textContent)
    expect(labels).not.toContain(CLEAR_ALL)
  })
})

/* ============================================== le panneau dans la modale de l'assembleur */

describe('openLibraryDialog — une couche, et Échap qui fait ce qu’on attend', () => {
  it('la bibliothèque ouvre une seule `<dialog>`, et le niveau ne s’y ajoute pas', async () => {
    const { library } = bibliotheque()
    await library.add({ name: 'Essai audit', bytes: PAGES, fileName: 'p.xcfg' })
    const handle = openLibraryDialog({ tr, library, download: () => {} })
    handle.open()
    await settle()

    expect(layers()).toBe(1)
    click(handle.element, 'Carte d’identité')
    await settle()

    // Le niveau vit DANS la boîte : le compte de couches ne bouge pas.
    expect(layers()).toBe(1)
    expect(openViews()).toHaveLength(1)
    expect(currentView().closest('dialog')).toBe(handle.element)

    // Un seul « Fermer » à l'écran, celui de la boîte, et il est hors du niveau.
    const closers = [...handle.element.querySelectorAll('button')]
      .filter((node) => (node.textContent ?? '').trim() === 'Fermer')
    expect(closers).toHaveLength(1)
    expect(currentView().contains(closers[0]!)).toBe(false)

    handle.close()
  })

  it('Échap recule d’abord, et ne ferme la bibliothèque que depuis la liste', async () => {
    const { library } = bibliotheque()
    await library.add({ name: 'Essai audit', bytes: PAGES, fileName: 'p.xcfg' })
    let closed = false
    const handle = openLibraryDialog({
      tr,
      library, download: () => {}, onClose: () => { closed = true }
    })
    handle.open()
    await settle()

    click(handle.element, 'Supprimer')
    await settle()
    expect(openViews()).toHaveLength(1)

    // La touche Échap sur une `<dialog>` lève `cancel` : c'est ce que le navigateur fait.
    handle.element.dispatchEvent(new Event('cancel', { cancelable: true }))
    await settle()
    // Elle a reculé — et surtout, elle n'a pas fermé la bibliothèque sous le pilote.
    expect(openViews()).toHaveLength(0)
    expect(closed).toBe(false)
    expect(handle.element.isConnected).toBe(true)
    // Rien n'a été supprimé au passage.
    expect((await library.read()).entries).toHaveLength(1)

    handle.element.dispatchEvent(new Event('cancel', { cancelable: true }))
    await settle()
    expect(closed).toBe(true)
    expect(handle.element.isConnected).toBe(false)
  })
})

/* ================================================ la tête collante, contrôlée au texte */

describe('libraryPanel.css — la fermeture d’une modale reste atteignable', () => {
  /*
   * Même garde-fou que `tests/ui/appStyle.test.ts`, et pour la même raison : ni happy-dom
   * ni jsdom ne calculent la cascade d'une feuille externe, et aucune sortie DOM ne
   * distingue une tête collante d'une tête qui défile. La carte d'identité d'une
   * sauvegarde complète tient sur plusieurs écrans : c'est exactement le cas où le bouton
   * « Fermer » se retrouverait hors de portée.
   */
  // `fileURLToPath` sur une CHAÎNE : happy-dom remplace le `URL` global par le sien, que
  // `node:url` ne reconnaît pas — même piège que `tests/fixtures/paths.ts`.
  const css = readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), '../../src/ui/libraryPanel.css'),
    'utf8'
  )

  it('le rembourrage du haut appartient à la tête, non à la boîte', () => {
    expect(css).toContain('.modal--library .modal__box {')
    expect(css).toMatch(/\.modal--library \.modal__box \{[^}]*padding-top: 0;/)
  })

  it('la boîte défile, et rien d’autre', () => {
    expect(css).toMatch(/\.modal--library \.modal__box \{[^}]*overflow: auto;/)
    expect(css).toMatch(/\.modal--library \.modal__box \{[^}]*overscroll-behavior: contain;/)
  })

  it('aucune couleur n’est introduite : tout passe par les variables du cadre', () => {
    // Une valeur en dur casserait le thème sombre sans qu'aucun test ne le voie.
    const colors = css.match(/#[0-9a-f]{3,8}\b/gi) ?? []
    expect(colors).toEqual([])
  })
})
