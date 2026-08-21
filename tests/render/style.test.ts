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
    const rule = css.slice(css.indexOf('.xc-num__title {'), css.indexOf('.xc-num__title {') + 600)
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

  it('les titres de widget ont tous la même taille : --xc-title, et non la hauteur du widget', () => {
    // La correction centrale de ce rendu — dix-sept titres mesurés sur deux captures
    // d'AIR³, des widgets hauts de 75 à 199 px, une seule hauteur de casse
    // (textMetrics.ts). Les trois familles de titre partagent la formule.
    for (const selecteur of ['.xc-num__title', '.xc-generic__title', '.xc-wind-dir__title']) {
      const rule = css.slice(css.indexOf(`${selecteur} {`), css.indexOf(`${selecteur} {`) + 400)
      expect(rule).toContain('var(--xc-title, 15)')
      // Le garde-fou de largeur, qui ne mord que si le libellé déborderait vraiment.
      expect(rule).toContain('var(--xc-title-em, 6)')
      expect(rule).not.toContain('var(--xc-h')
    }
  })

  it('la barre d’état colle ses indicateurs à gauche, la batterie à droite', () => {
    // Écart 4 de la revue des 75 widgets. Mesuré page 9 de la planche, barre de
    // 1280 × 100 : l'encre de l'appareil va de x = 5 à x = 1271, la nôtre tenait dans
    // 492 px centrés. Le `center` d'avant venait d'une capture où la barre ne fait que
    // 507 px de large — les éléments y remplissent la largeur, ce qui s'y confond avec
    // un groupe centré.
    const rule = css.slice(css.indexOf('.xc-status {'), css.indexOf('.xc-status {') + 1400)
    expect(rule).toContain('justify-content: flex-start;')
    expect(rule).not.toContain('justify-content: center;')
    // La taille du texte suit le MINIMUM de la hauteur et de la LARGEUR de la barre —
    // c'est la largeur qui manquait au modèle, et elle réconcilie les deux captures qui
    // se contredisaient (507 × 99 → 39 px d'encre, 1280 × 100 → 70).
    expect(rule).toContain('calc(var(--xc-h, 100) * 0.959px)')
    expect(rule).toContain('calc(var(--xc-w, 200) * 0.1055px)')
    expect(rule).not.toContain('var(--xc-page-min, 720)')
    const batterie = css.slice(css.indexOf('.xc-status__battery {'), css.indexOf('.xc-status__battery {') + 200)
    expect(batterie).toContain('margin-left: auto;')
  })

  it('le titre de la direction du vent est collé en haut, comme celui des widgets numériques', () => {
    // Base mesurée à 13,0 % de la hauteur de cellule contre 8,5 % sur l'appareil : la
    // colonne entière était centrée, donc le titre descendait avec la lettre.
    const rule = css.slice(css.indexOf('.xc-wind-dir {'), css.indexOf('.xc-wind-dir {') + 260)
    expect(rule).toContain('justify-content: flex-start;')
    const valeur = css.slice(css.indexOf('.xc-wind-dir__value {'), css.indexOf('.xc-wind-dir__value {') + 200)
    expect(valeur).toContain('margin: auto 0;')
  })
  // Écart 1.1 de la revue des 75 widgets — la valeur numérique tranchée. Le calcul est
  // en CSS et n'a donc aucune trace dans le DOM : ces garde-fous sont le seul moyen de
  // constater qu'il n'est pas revenu à l'ancienne règle.
  describe('budget de largeur de la valeur numérique', () => {
    const regle = css.slice(css.indexOf('.xc-num {'), css.indexOf('.xc-num__title {'))

    it('la réduction se calcule sur la taille RÉELLE du widget, pas sur un rapport de page supposé', () => {
      // `--xc-w` et `--xc-h` sont posées par canvas.ts dans le repère de rendu ;
      // `--xc-value-size` est la police de la valeur. Les trois dans la même unité, donc
      // valables sur une page portrait comme sur une page 16/9, à 100 % de titre comme à
      // 140 %.
      expect(regle).toContain('--xc-value-fit: clamp(')
      expect(regle).toContain('var(--xc-w, 200)')
      expect(regle).toContain('var(--xc-value-em, 2) * var(--xc-value-size)')
      // La pastille XContest entre dans le même budget que l'unité : elle occupe une
      // fraction FIXE de la hauteur et ne rétrécit pas avec la valeur (badge.ts).
      expect(regle).toContain('(var(--xc-unit-h, 0) + var(--xc-badge-h, 0)) * var(--xc-h, 100)')
    })

    it('le plancher reste bas : réduire vaut toujours mieux que trancher', () => {
      // 0,45 (le plancher du 21/08) tranchait à lui seul toute page à cinq colonnes.
      expect(regle).toContain('0.15,')
      expect(regle).not.toContain('0.45,')
    })

    it('l’écart entre la valeur et l’unité se réduit avec elles', () => {
      // Fixe, il n'était pas réductible alors que le budget le comptait comme tel :
      // 1,6 % de débordement résiduel mesuré sur une cellule de 135 px.
      const ligne = css.slice(css.indexOf('.xc-num__row {'), css.indexOf('.xc-num__row {') + 900)
      expect(ligne).toContain('gap: calc(var(--xc-h, 100) * 0.0255 * var(--xc-value-fit, 1) * 1px);')
      expect(ligne).not.toContain('gap: 0.15em;')
    })
  })
  // Écarts 2.1 et 2.2 de la revue des 75 widgets — l'opacité délavait la couleur.
  describe('couleurs de titre et d’unité : des aplats, pas une opacité', () => {
    it('aucun titre de widget, ni l’unité, ne porte plus d’opacité', () => {
      // `0,8 × #f44336 + 0,2 × blanc = #f6685e` au pixel près, et `0,8 × #101010`
      // donne #3f3f3f là où l'appareil dessine #505050. Relevé sur
      // `2026-08-21_planche-sol-1-systeme-et-vol-a.png` : 7 107 px de #f44336 et
      // 8 662 px de #505050.
      for (const selecteur of ['.xc-num__title', '.xc-generic__title', '.xc-wind-dir__title', '.xc-num__unit']) {
        const rule = css.slice(css.indexOf(`${selecteur} {`), css.indexOf(`${selecteur} {`) + 500)
        expect(rule).not.toContain('opacity: 0.8')
      }
    })

    it('l’unité a sa propre encre mesurée, indépendante de celle des chiffres', () => {
      expect(css).toContain('--xc-unit-ink: #505050;')
      const rule = css.slice(css.indexOf('.xc-num__unit {'), css.indexOf('.xc-num__unit {') + 300)
      expect(rule).toContain('color: var(--xc-unit-ink);')
    })
  })
  // § 5 de la revue des 75 widgets — les épaisseurs de trait de la boussole.
  describe('boussole : des traits en pixels, pas à l’échelle du dessin', () => {
    it('les quatre épaisseurs passent par --xc-compass-px', () => {
      // L'appareil dessine la couronne à 9 px et les graduations à 7 px quelle que soit
      // la taille du cadran (mesuré à 208, 348 et 355 px de rayon). Les nôtres suivaient
      // l'échelle du `viewBox` : justes sur le cadran de 426 px de la planche, sur lequel
      // elles avaient été calées, fausses partout ailleurs.
      expect(css).toContain('--xc-compass-px: calc(200 / min(var(--xc-w, 200), var(--xc-h, 200)));')
      for (const declaration of [
        'stroke-width: calc(9 * var(--xc-compass-px))',
        'stroke-width: calc(6.4 * var(--xc-compass-px))',
        'stroke-width: calc(9.6 * var(--xc-compass-px))',
        'stroke-width: calc(1.9 * var(--xc-compass-px))'
      ]) {
        expect(css).toContain(declaration)
      }
    })

    it('aucune épaisseur de boussole ne reste un nombre nu du repère du viewBox', () => {
      const bloc = css.slice(css.indexOf('.xc-compass {'), css.indexOf('.xc-compass__arrow'))
      expect(bloc).not.toMatch(/stroke-width:\s*[\d.]+;/)
    })
  })
})
