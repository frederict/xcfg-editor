import { parseJson } from '../core/parseJson'
import { buildVersionPanel, type VersionPanel } from './versionDiagnostic'

/**
 * Page d'essai du sélecteur de version — le module n'étant branché nulle part, c'est
 * ici qu'on l'éprouve sur des fichiers réels.
 *
 * Servie par `npm run dev` à /src/ui/versionDiagnostic.demo.html, sur un port libre :
 * `npx vite --port 5178`. Elle n'entre pas dans `dist/` — `vite build` ne construit que
 * ce que l'`index.html` référence.
 *
 * Les trois fichiers sont ceux que le chantier devait éprouver : la sauvegarde courante,
 * celle écrite par 0.9.12.3 (dont le `versionCode` n'est dans aucune archive), et un
 * fichier de 2022 dont l'`info` ne porte même pas d'`exportType`.
 */
const FILES = [
  ['Sauvegarde 1.0.3 (2026)', '/tests/fixtures/exports/2026-08-20_backup-00.xcfg'],
  ['Sauvegarde 0.9.12.3 (2025)', '/tests/fixtures/exports/2025-07-07_backup-00.xcfg'],
  ['Fichier Gson (2022)', '/tests/fixtures/formes/gson-2022.xcfg']
] as const

const host = document.getElementById('host')
const files = document.getElementById('files')
if (host === null || files === null) throw new Error('page d’essai incomplète')

let panel: VersionPanel | undefined

async function show(path: string): Promise<void> {
  const response = await fetch(path)
  const source = await response.text()
  const parsed = parseJson(source)
  if (panel === undefined) {
    panel = await buildVersionPanel({ document: parsed })
    host?.append(panel.element)
  } else {
    panel.setDocument(parsed)
  }
  for (const button of files?.querySelectorAll('button') ?? []) {
    button.setAttribute('aria-pressed', String(button.dataset.path === path))
  }
}

for (const [label, path] of FILES) {
  const button = document.createElement('button')
  button.type = 'button'
  button.textContent = label
  button.dataset.path = path
  button.setAttribute('aria-pressed', 'false')
  button.addEventListener('click', () => { void show(path) })
  files.append(button)
}

void show(FILES[0][1])
