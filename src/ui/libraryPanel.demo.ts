import './style.css'
import './app.css'
import { openContainer, exportContainer } from '../core/container'
import { createLibrary, type Library } from '../library/library'
import { createMemoryStore } from '../library/memoryStore'
import {
  estimateStorage, openIndexedDbStore, requestPersistence
} from '../library/indexedDbStore'
import { blobKey, type LibraryStore } from '../library/store'
import { renderLibraryPanel, type CurrentDocument, type LibraryPanelHandle } from './libraryPanel'

/**
 * Banc d'essai de `ui/libraryPanel.ts`, qui n'est branché nulle part : le module se suffit
 * à lui-même, cette page le prouve et sert à refaire les captures.
 *
 *     npm run dev -- --port 5182
 *     http://localhost:5182/src/ui/libraryPanel.demo.html
 *
 * N'importe quel port libre convient — 5182 est celui sur lequel les mesures ci-dessous
 * ont été prises. Le port 5175 appartient au propriétaire : ne pas s'en servir.
 *
 * ## Ce que cette page permet de vérifier, et que les tests ne peuvent PAS vérifier
 *
 * Sous `happy-dom` il n'y a pas d'IndexedDB : toute la suite tourne sur le magasin en
 * mémoire. **Ici, dans un vrai navigateur, IndexedDB est réel.** C'est le seul endroit où
 * s'éprouvent : l'ouverture et la migration du schéma, la persistance effective d'un
 * rechargement à l'autre, `navigator.storage.estimate()`, et la diffusion entre deux
 * onglets par `BroadcastChannel`.
 *
 * Le bouton « repli en mémoire » bascule sur `createMemoryStore()` — c'est ainsi qu'on voit
 * le bandeau « rangement non durable » sans avoir à désactiver le stockage du navigateur.
 *
 * Le bouton « abîmer un octet » réécrit les octets d'une entrée sans toucher à son
 * empreinte : c'est la démonstration que la vérification n'est pas décorative.
 *
 * ## Ce qui a été mesuré ici, le 21 août 2026 (Chrome, pilote CDP)
 *
 * - **Les octets ressortent intacts.** Les quatre fixtures rangées, relues **directement
 *   dans IndexedDB** sans passer par ce code, rendent la même empreinte SHA-256 que les
 *   fichiers d'origine — l'archive `.xczfg` comprise. Elles y sont rangées en `Uint8Array`,
 *   sans encodage.
 * - **L'aller-retour complet tient** : export ZIP (24 327 octets pour quatre entrées),
 *   bibliothèque vidée, archive réimportée par le sélecteur de fichiers, quatre entrées
 *   rétablies, empreintes inchangées.
 * - **Le rangement survit au rechargement** de la page, et à plusieurs.
 * - **Deux onglets se synchronisent** : une entrée rangée dans l'onglet B apparaît dans
 *   l'onglet A sans aucune action de sa part (`BroadcastChannel`).
 * - **Les octets altérés ne ressortent pas** : rien n'est téléchargé, le message le dit, et
 *   le niveau d'empreinte s'ouvre quand même pour montrer laquelle manque.
 * - `navigator.storage.estimate()` a rendu 10,0 Go de quota — d'où le palier « Go » de
 *   `formatByteSize`.
 *
 * Refaire les captures : ouvrir cette page, ranger les quatre fixtures, puis
 * « injecter une entrée illisible ». Thème clair et sombre par l'émulation du navigateur.
 */

const FIXTURES: Array<{ label: string; path: string }> = [
  { label: 'backup complet', path: '/tests/fixtures/exports/2026-08-20_backup-00.xcfg' },
  { label: 'export « pages »', path: '/tests/fixtures/exports/2026-08-20_pages-00.xcfg' },
  { label: 'formes préservées (téléphone dans le layout)', path: '/tests/fixtures/formes/formes-preservees.xcfg' },
  { label: 'archive .xczfg', path: '/tests/fixtures/exports/2026-08-20_backupwithmedia-00.xczfg' }
]

const host = document.getElementById('host')
const buttons = document.getElementById('buttons')
const out = document.getElementById('out')
if (host === null || buttons === null || out === null) throw new Error('page d’essai incomplète')

function say(text: string): void {
  out!.textContent = `${new Date().toLocaleTimeString('fr-FR')} — ${text}`
}

/* --------------------------------------------------- le document « ouvert » simulé */

let current: CurrentDocument | undefined
let panel: LibraryPanelHandle | undefined
let library: Library | undefined
let store: LibraryStore | undefined
let memoryFallback = false

const currentLine = document.createElement('p')
currentLine.className = 'demo__current'
buttons.after(currentLine)

function drawCurrent(): void {
  currentLine.textContent = current === undefined
    ? 'Aucun document « ouvert ». Choisissez une fixture ci-dessus.'
    : `Document ouvert : ${current.fileName}${current.modified ? ' — MODIFIÉ (non enregistré)' : ''}`
}

async function openFixture(path: string, modified: boolean): Promise<void> {
  const response = await fetch(path)
  const bytes = new Uint8Array(await response.arrayBuffer())
  const fileName = path.slice(path.lastIndexOf('/') + 1)
  const container = await openContainer(bytes, fileName)
  container.modified = modified
  current = {
    fileName,
    modified,
    // Exactement ce que l'assembleur ferait : les octets d'un conteneur non modifié
    // ressortent tels quels, à l'octet près.
    bytes: () => exportContainer(container)
  }
  drawCurrent()
  say(`« ${fileName} » ouvert${modified ? ' et marqué modifié' : ''} — ${bytes.byteLength} octets.`)
}

/* ------------------------------------------------------------------ le panneau */

async function build(): Promise<void> {
  panel?.close()
  library?.close()
  host!.textContent = ''

  if (memoryFallback) {
    store = createMemoryStore()
    say('Repli en mémoire : rien ne survivra à cet onglet — c’est ce que le bandeau dit.')
  } else {
    try {
      store = await openIndexedDbStore()
      say('IndexedDB ouvert : le rangement est réel et survit au rechargement.')
    } catch (error) {
      store = createMemoryStore()
      memoryFallback = true
      say(`IndexedDB refusé (${String(error)}) : repli en mémoire.`)
    }
  }

  library = createLibrary({ store })
  panel = renderLibraryPanel({
    library,
    current: () => current,
    onLoad: (entry, bytes) => {
      current = {
        fileName: entry.fileName === '' ? `${entry.name}.xcfg` : entry.fileName,
        modified: false,
        bytes: async () => bytes
      }
      drawCurrent()
      say(`Chargé : « ${entry.name} », ${bytes.byteLength} octets vérifiés.`)
    },
    estimateStorage,
    requestPersistence
  })
  host!.append(panel.element)
}

/* -------------------------------------------------------------- les commandes d'essai */

function command(label: string, run: () => void | Promise<void>): void {
  const node = document.createElement('button')
  node.type = 'button'
  node.className = 'btn'
  node.textContent = label
  node.addEventListener('click', () => { void run() })
  buttons!.append(node)
}

for (const fixture of FIXTURES) {
  command(fixture.label, () => openFixture(fixture.path, false))
}
command('rouvrir « pages » en MODIFIÉ', () =>
  openFixture('/tests/fixtures/exports/2026-08-20_pages-00.xcfg', true))

command('basculer sur le repli en mémoire', async () => {
  memoryFallback = !memoryFallback
  await build()
})

command('abîmer un octet de la première entrée', async () => {
  if (library === undefined || store === undefined) return
  const snapshot = await library.read()
  const entry = snapshot.entries[0]
  if (entry === undefined) { say('Rien à abîmer : rangez d’abord une configuration.'); return }
  const bytes = await store.readBlob(blobKey(entry.id))
  if (bytes === undefined) return
  const abime = bytes.slice()
  abime[1000] = (abime[1000] ?? 0) ^ 0x01
  // On écrit directement dans le magasin, sans passer par la bibliothèque : c'est ce que
  // ferait une écriture interrompue ou un disque abîmé.
  await store.put(
    { ...entry } as unknown as Parameters<LibraryStore['put']>[0],
    [{ key: blobKey(entry.id), bytes: abime }],
    { kind: 'revision', value: entry.revision }
  )
  say(`Un octet de « ${entry.name} » a été retourné, l’empreinte n’a pas bougé. ` +
    'Essayez « Ressortir le fichier » et « Vérifier l’empreinte ».')
})

command('injecter une entrée illisible', async () => {
  if (store === undefined) return
  await store.put(
    { id: `cassee-${Date.now()}`, revision: 1, name: 'Sans empreinte' },
    [], { kind: 'absent' }
  )
  say('Une entrée sans empreinte a été écrite : rechargez la liste pour la voir apparaître.')
  await panel?.refresh()
})

command('vider la bibliothèque', async () => {
  await library?.clear()
  say('Bibliothèque vidée.')
})

drawCurrent()
void build()
