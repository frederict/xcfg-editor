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
 * - `LIVE` et la disposition de la barre d'état, refaits sur
 *   `docs/reference/captures-air3/2026-08-21_barre-etat-reelle.png`.
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

  it('LIVE se dessine en noir : la forme neutre, sans trait ni couleur d’état', () => {
    // Trois états observés successivement (statusLine.ts) : noir barré au sol, vert
    // barré en rejeu, noir non barré appareil connecté (2026-08-21_barre-etat-reelle.png).
    // Le noir non barré est la seule forme qui n'affirme aucun état d'exécution — et
    // aucune clé du fichier ne porterait les autres.
    expect(css).toMatch(/\.xc-status__live\s*{[^}]*color:\s*var\(--xc-ink\)/)
    expect(css).not.toContain('--xc-status-live')
    expect(css).not.toContain('.xc-status__live::after')
  })

  it('la barre d’état groupe ses éléments au centre et tire sa police du petit côté de la page', () => {
    const rule = css.slice(css.indexOf('.xc-status {'), css.indexOf('.xc-status {') + 700)
    expect(rule).toContain('justify-content: center;')
    expect(rule).not.toContain('justify-content: flex-end;')
    expect(rule).toContain('var(--xc-page-min, 720)')
  })
})
