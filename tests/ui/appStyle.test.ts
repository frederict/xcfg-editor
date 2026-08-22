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

/**
 * L'entrée directe des réglages généraux. Elle a coûté 40 px à une barre qui repliait
 * déjà : le seuil de sa forme compacte est une mesure, et un changement de valeur doit
 * faire échouer ce test plutôt que de laisser la barre repasser sur deux lignes à
 * 1 024 px sans que personne s'en aperçoive.
 */
describe('app.css — le bouton des réglages tient dans la barre', () => {
  it('bascule en forme compacte au seuil mesuré', () => {
    expect(css).toContain('.app-bar__prefs { flex: none; gap: 0.4rem; }')
    expect(css).toMatch(/@media \(max-width: 1120px\) \{\s*\.app-bar__prefs \{[^}]*width: 30px/)
  })

  it('masque le mot sans le retirer du nom accessible', () => {
    // `clip-path: inset(50%)` cache à l'œil et laisse au lecteur d'écran — `display: none`
    // priverait le bouton de son nom.
    const compact = css.slice(css.indexOf('.app-bar__prefs-name'))
    expect(compact).toContain('clip-path: inset(50%)')
    expect(compact.slice(0, 300)).not.toContain('display: none')
  })
})

/**
 * Le globe des langues, et les 40 px qu'il prend à la barre.
 *
 * Mesuré sur la fixture `2026-08-20_backup-00.xcfg` en édition, document modifié, page
 * ouverte : la barre repassait sur deux lignes sous 1 023 px en français, 1 020 en
 * allemand et 1 028 en néerlandais — au-dessus des 1 024 px de l'écran le plus étroit
 * qu'on vise. Les deux réductions du bloc compact les rendent, et davantage : 957, 954 et
 * 962 px, soit mieux que les 983 / 980 / 988 px d'avant le globe.
 *
 * Ce test garde les deux règles. Les retirer ferait revenir la barre à 95 px de haut sur
 * un écran de 1 024 px, et personne ne le verrait avant un pilote.
 */
describe('app.css — le globe des langues ne repousse pas le repli de la barre', () => {
  const compact = css.slice(
    css.indexOf('@media (max-width: 1120px)'),
    css.indexOf('/* ------------------------------------------------- menu des commandes secondaires')
  )

  it('l’écart des commandes se resserre sous le seuil', () => {
    expect(compact).toContain('.app-bar__actions { gap: 0.4rem; }')
  })

  it('le nom du fichier cède le premier, comme la règle le promet depuis toujours', () => {
    expect(compact).toContain('.app-bar__file { max-width: 18ch; }')
    // Il cède de la PLACE, pas du contenu : l'ellipse et l'infobulle gardent le nom entier.
    expect(rule('.app-bar__file')).toContain('text-overflow: ellipsis;')
  })
})

/**
 * La boîte des langues. Le sélecteur n'en est presque qu'un prétexte : ce qu'elle porte
 * d'irremplaçable, c'est la mise **côte à côte** des deux axes — celui qui se règle et
 * celui qui ne se règle pas. Voir `src/i18n/axes.ts`.
 */
describe('app.css — les deux axes de langue se distinguent avant d’être lus', () => {
  it('l’axe des libellés se peint comme un constat, pas comme une commande', () => {
    // Le liséré et l'aplat le rangent avec ce qui renseigne. Rien dedans n'a l'air
    // cliquable, parce que rien ne l'est.
    const box = rule('.lang-axis--labels')
    expect(box).toContain('border-left: 3px solid var(--app-line-strong);')
    expect(box).toContain('background: var(--app-panel);')
  })

  it('la langue courante est marquée deux fois, dont une qui n’est pas une couleur', () => {
    // Le pilote qui ouvre cette boîte est, par hypothèse, celui qui ne lit pas ce qui
    // l'entoure : l'aplat inversé ne suffit pas, la coche le double.
    expect(rule('.lang-choice--current')).toContain('background: var(--app-ink);')
    expect(css).toContain('.lang-choice__check {')
  })

  it('les cinq entrées s’alignent en pairs', () => {
    // Cinq boutons de largeurs différentes se liraient comme cinq commandes différentes.
    expect(rule('.lang-choice')).toContain('min-width: 8.5rem;')
  })
})
