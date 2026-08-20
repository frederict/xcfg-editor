import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { parseJson } from '../../../src/core/parseJson'
import { readLayout } from '../../../src/model/layout'
import { isRegistered } from '../../../src/render/registry'
// Effet de bord : enregistre les dessins connus auprès de l'annuaire (registry.ts).
import '../../../src/render/widgets'

const EXAMPLES = '/Users/fred/DEV/XCTrack/Exemples/'

/**
 * Contrôle de couverture prévu par le plan à la tâche 18 (`docs/plans/
 * 2026-08-20-jalon-1-visionneuse.md`) : plutôt que de grep-er le texte de
 * `widgets/index.ts` — qui ne prouve rien sur ce qui est réellement enregistré une fois
 * les imports exécutés, et se désynchronise silencieusement d'un corpus qui change —
 * ce test relève lui-même les types présents dans `/Users/fred/DEV/XCTrack/Exemples/`
 * et interroge `isRegistered` à l'exécution pour chacun.
 *
 * Écrit ici, à la tâche 17, sur consigne explicite reçue pour cette tâche — avant que la
 * tâche 18 (`WAirspaceProximity`, `WLiveMessage`, `WCompTaskSummary`) ne soit faite. Ce
 * test échoue donc sciemment sur ces trois types tant que la tâche 18 n'est pas passée :
 * c'est le but du test, pas un défaut des cinq dessins de la tâche 17 — voir le rapport
 * de tâche pour le détail.
 */
function corpusShortNames(): Set<string> {
  const names = new Set<string>()
  const files = readdirSync(EXAMPLES).filter((f) => f.endsWith('.xcfg'))
  for (const file of files) {
    const document = parseJson(readFileSync(EXAMPLES + file, 'utf8'))
    const layout = readLayout(document)
    for (const page of [...layout.portrait, ...layout.landscape]) {
      for (const widget of page.widgets) names.add(widget.shortName)
    }
  }
  return names
}

describe('couverture des dessins de widgets', () => {
  const names = corpusShortNames()

  it('le corpus contient bien les 37 types attendus', () => {
    expect(names.size).toBe(37)
  })

  it.each(Array.from(names).sort())('%s a un dessin enregistré', (shortName) => {
    expect(isRegistered(shortName)).toBe(true)
  })
})
