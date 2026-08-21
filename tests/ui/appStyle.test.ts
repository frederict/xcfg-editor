import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Garde-fou textuel sur `app.css`, sur le modèle de `tests/render/style.test.ts` : ni
 * happy-dom ni jsdom ne calculent la cascade d'une feuille externe, et aucune sortie DOM
 * ne distingue une tête de modale collante d'une tête qui défile. Le seul contrôle
 * automatisable est donc la relecture de la règle.
 *
 * Ce qui est vérifié tient à un défaut d'usage mesuré au pilote CDP (fenêtre 1500 × 1000,
 * fixture `2026-08-20_pages-00.xcfg`) : la boîte de la palette défile sur 7810 px pour
 * 860 px de cadre. Sans `sticky`, le bouton « Fermer » se retrouvait à 6847 px AU-DESSUS
 * de la fenêtre une fois la liste défilée à fond — hors de portée du clic. La boîte de
 * gestion des pages souffrait du même défaut (643 px au-dessus).
 */
const here = path.dirname(fileURLToPath(import.meta.url))
const css = readFileSync(path.join(here, '../../src/ui/app.css'), 'utf8')

/** Le corps de la règle nommée, accolades comprises. */
function rule(selector: string): string {
  const start = css.indexOf(`${selector} {`)
  expect(start, `règle absente : ${selector}`).toBeGreaterThan(-1)
  return css.slice(start, css.indexOf('}', start) + 1)
}

describe('app.css — la fermeture d’une modale reste atteignable', () => {
  it('la tête de modale se colle au haut du cadre qui défile', () => {
    const head = rule('.modal__head')
    expect(head).toContain('position: sticky;')
    expect(head).toContain('top: 0;')
  })

  it('la tête est opaque et passe devant le contenu qui glisse dessous', () => {
    const head = rule('.modal__head')
    // Sans fond opaque, la liste se lirait à travers le titre et le bouton.
    expect(head).toContain('background: var(--app-bg);')
    // 10 est le rang de `.pages__choice`, la liste des classes déployée par le « + ».
    expect(head).toMatch(/z-index:\s*1[1-9]\s*;/)
  })

  it('le rembourrage du haut appartient à la tête, non à la boîte', () => {
    // Sinon la tête colle au bord du CONTENU et non au bord du cadre : une bande de liste
    // défilante reste visible au-dessus d'elle.
    expect(css).toMatch(
      /\.modal--palette \.modal__box,\s*\n\.modal--pages \.modal__box \{ padding-top: 0; \}/
    )
    expect(rule('.modal__head')).toContain('margin: 0 -1.4rem;')
  })

  it('les deux boîtes qui débordent partagent cette tête', () => {
    // La palette (75 lignes) et le carrousel des pages : le correctif vaut pour les deux.
    expect(rule('.modal--palette .modal__box')).toContain('overflow: auto;')
    expect(rule('.modal--pages .modal__box')).toContain('overflow: auto;')
  })
})
