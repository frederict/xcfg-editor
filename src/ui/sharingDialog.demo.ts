import './style.css'
import './app.css'
import { openContainer } from '../core/container'
import { renderSharingDialog, sharingBytes, type SharingSource } from './sharingDialog'

/**
 * Banc d'essai de `ui/sharingDialog.ts`, qui n'est branché nulle part : le module se
 * suffit à lui-même, cette page le prouve et sert à refaire les captures.
 *
 *     npm run dev -- --port 5176
 *     http://localhost:5176/src/ui/sharingDialog.demo.html
 *
 * Rien n'est téléchargé : le choix du pilote est écrit dans la page, octets compris quand
 * il y en a. Un export ordinaire n'en produit aucun — c'est précisément ce qu'on veut
 * voir, puisque c'est ce qui tient la fidélité à l'octet près.
 */

const FIXTURES: Array<{ label: string; path: string }> = [
  { label: 'backup complet', path: '/tests/fixtures/exports/2026-08-20_backup-00.xcfg' },
  { label: 'formes préservées (téléphone + contact)', path: '/tests/fixtures/formes/formes-preservees.xcfg' },
  { label: 'archive .xczfg', path: '/tests/fixtures/exports/2026-08-20_backupwithmedia-00.xczfg' },
  { label: 'export « pages »', path: '/tests/fixtures/exports/2026-08-20_pages-00.xcfg' }
]

/** Des annexes fabriquées : l'archive du corpus n'en porte aucune, et le cas doit se voir. */
const FAKE_EXTRAS = [
  { name: 'media/decollage.jpg', byteLength: 1_482_112 },
  { name: 'media/logo.png', byteLength: 3_204 }
]

const out = document.getElementById('out') as HTMLPreElement
const buttons = document.getElementById('buttons') as HTMLDivElement

function say(text: string): void {
  out.textContent = text
}

async function openOn(path: string, withExtras: boolean): Promise<void> {
  const response = await fetch(path)
  const bytes = new Uint8Array(await response.arrayBuffer())
  const fileName = path.slice(path.lastIndexOf('/') + 1)
  const container = await openContainer(bytes, fileName)

  const source: SharingSource = {
    document: container.document,
    fileName: container.fileName,
    kind: container.kind,
    // Le banc ouvre un fichier et n'y touche pas : la garantie forte s'applique, et la
    // boîte doit l'annoncer. Voir `SharingSource.modified`.
    modified: container.modified,
    extras: withExtras
      ? FAKE_EXTRAS
      : container.extras.map((e) => ({ name: e.name, byteLength: e.data.byteLength }))
  }

  renderSharingDialog({
    source,
    onCancel: () => say('Annulé : rien n’est produit, le document est intact.'),
    onConfirm: (result) => {
      const produced = sharingBytes(result)
      say([
        `anonymisé   : ${result.anonymized}`,
        `nom         : ${result.fileName}`,
        `conteneur   : ${result.kind}`,
        `annexes     : ${result.droppedExtras.map((e) => e.name).join(', ') || '(aucune)'}`,
        `octets      : ${produced === undefined
          ? '(aucun — l’appelant réémet la source, à l’octet près)'
          : `${produced.byteLength} octets écrits par le sérialiseur`}`
      ].join('\n'))
    }
  }).open()
}

for (const fixture of FIXTURES) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'btn'
  button.textContent = fixture.label
  button.addEventListener('click', () => { void openOn(fixture.path, false) })
  buttons.append(button)
}

const withMedia = document.createElement('button')
withMedia.type = 'button'
withMedia.className = 'btn'
withMedia.textContent = 'archive + annexes fabriquées'
withMedia.addEventListener('click', () => {
  void openOn('/tests/fixtures/exports/2026-08-20_backupwithmedia-00.xczfg', true)
})
buttons.append(withMedia)
