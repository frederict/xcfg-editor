import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Garde-fous sur les corrections purement CSS (aucune sortie DOM ne les distingue,
 * jsdom/happy-dom ne calcule pas le rendu en cascade d'une feuille de style externe) :
 * relecture du texte de `style.css`, comme un test de non-régression textuel plutôt
 * qu'un test de comportement. Trois corrections du rapport de tâche, aucune couverte
 * ailleurs :
 * - le cerne du vario, trop fin ;
 * - le titre numérique qui débordait sur deux lignes ;
 * - `LIVE`, vert et non barré par défaut (rendu-en-vol.md § 5).
 */
const here = path.dirname(fileURLToPath(import.meta.url))
const css = readFileSync(path.join(here, '../../src/ui/style.css'), 'utf8')

describe('style.css — corrections sans trace dans le DOM', () => {
  it('le cerne du vario est net (0.07em), pas le filet quasi invisible d’origine (0.035em)', () => {
    expect(css).toContain('-webkit-text-stroke: 0.07em var(--xc-value-stroke);')
    expect(css).not.toContain('-webkit-text-stroke: 0.035em')
  })

  it('--xc-value-positive reste inchangée (#a0ffa0, mesurée au pixel) — seule l’épaisseur était en cause', () => {
    expect(css).toContain('--xc-value-positive: #a0ffa0;')
  })

  it('le titre numérique ne retourne jamais à la ligne et se tronque plutôt que de chevaucher la valeur', () => {
    const rule = css.slice(css.indexOf('.xc-num__title {'), css.indexOf('.xc-num__title {') + 300)
    expect(rule).toContain('white-space: nowrap;')
    expect(rule).toContain('text-overflow: ellipsis;')
  })

  it('LIVE est vert par défaut, sans trait rouge inconditionnel', () => {
    expect(css).toContain('--xc-status-live: #1c8e1e;')
    expect(css).toMatch(/\.xc-status__live\s*{[^}]*color:\s*var\(--xc-status-live\)/)
    // L'ancien ::after inconditionnel (trait rouge) a disparu : plus aucune règle
    // .xc-status__live::after ne doit rester dans la feuille.
    expect(css).not.toContain('.xc-status__live::after')
  })
})
