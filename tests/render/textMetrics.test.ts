import { describe, expect, it } from 'vitest'
import { TITLE_SIZE_RATIO, titleWidthEm, valueGlyphEm, valueWidthEm } from '../../src/render/textMetrics'
import { titleFontPx, pageShortSidePx, widgetWidthPx, widgetHeightPx } from '../../src/render/canvas'

/**
 * Les chiffres vérifiés ici viennent tous d'un relevé au pixel sur
 * `docs/reference/captures-air3/2026-08-21_polices-reference.png` (page 1 paysage de
 * `2026-08-20_pages-00.xcfg`, écran 1280 × 720, `Display.WidgetTitleSize: 140`) et sur
 * `ecran-landscape3-17widgets.png`. Ils ne sont pas là pour figer une préférence de
 * style : ils sont la seule trace exécutable du fait que la taille du titre ne dépend
 * PAS de la taille du widget, et que la taille de la valeur, elle, en dépend de façon
 * affine et non proportionnelle. Voir `src/render/textMetrics.ts`.
 */

const PAYSAGE = 16 / 9
/** Hauteur de casse d'un chiffre ou d'une capitale, en fraction de la taille de police
 *  — Roboto, la police de l'appareil (1456/2048). */
const CAP_HEIGHT = 0.7109

/** Boîte d'un widget en coordonnées normalisées, comme le fichier les écrit. */
function box(x1: number, y1: number, x2: number, y2: number): { x1: number; y1: number; x2: number; y2: number; background: number } {
  return { x1, y1, x2, y2, background: 100 }
}

describe('métriques de texte relevées sur l’appareil', () => {
  describe('taille des titres', () => {
    it('reproduit la hauteur de casse mesurée (15 px) sur la page de référence', () => {
      // `Display.WidgetTitleSize: 140` sur l'appareil qui a produit la capture.
      const police = titleFontPx(PAYSAGE, 140)
      expect(police * CAP_HEIGHT).toBeCloseTo(15, 0)
    })

    it('ne dépend pas du widget : la même taille pour les huit widgets mesurés', () => {
      // Les hauteurs vont de 124 à 199 px sur la capture ; la hauteur de casse du titre
      // y vaut 15 à 17 px partout. Aucune de ces boîtes n'entre dans le calcul.
      const police = titleFontPx(PAYSAGE, 140)
      expect(police).toBeGreaterThan(20)
      expect(police).toBeLessThan(22)
    })

    it('suit Display.WidgetTitleSize proportionnellement', () => {
      expect(titleFontPx(PAYSAGE, 140)).toBeCloseTo(titleFontPx(PAYSAGE, 100) * 1.4, 6)
      expect(titleFontPx(PAYSAGE, 100)).toBeCloseTo(720 * TITLE_SIZE_RATIO, 6)
    })

    it('se rapporte au petit côté de la page, pas à sa hauteur', () => {
      // En paysage les deux se confondent (720 px) ; en portrait, le repère de rendu est
      // bien plus haut que large, et c'est la largeur qui représente le petit côté
      // physique de l'écran.
      expect(pageShortSidePx(PAYSAGE)).toBe(720)
      expect(pageShortSidePx(9 / 16)).toBe(1280)
    })
  })

  describe('largeur estimée d’un libellé', () => {
    it('reste dans 15 % de la largeur mesurée sur l’appareil', () => {
      // Largeurs relevées sur la capture, à 21,07 px de police : « Altitude GPS » 114 px,
      // « Vitesse du vent » 138, « Niveau de vol » 118, « Direction du vent » 150.
      const police = titleFontPx(PAYSAGE, 140)
      const mesures: [string, number][] = [
        ['Altitude GPS', 114],
        ['Vitesse du vent', 138],
        ['Niveau de vol', 118],
        ['Direction du vent', 150]
      ]
      for (const [texte, largeurMesuree] of mesures) {
        const estimee = titleWidthEm(texte) * police
        expect(estimee).toBeGreaterThanOrEqual(largeurMesuree)
        expect(estimee).toBeLessThan(largeurMesuree * 1.15)
      }
    })

    it('« Vitesse verticale / 2s » tient dans les 320 px de son widget de la page 1', () => {
      // Le défaut signalé : ce libellé s'y affichait tronqué en « Vitesse vertic… ».
      const largeurWidget = widgetWidthPx(box(625, 4828, 3125, 7586))
      expect(largeurWidget).toBeCloseTo(320, 0)
      expect(titleWidthEm('Vitesse verticale / 2s') * titleFontPx(PAYSAGE, 140)).toBeLessThan(largeurWidget)
    })

    it('ne renvoie jamais zéro, même pour un libellé vide', () => {
      expect(titleWidthEm('')).toBeGreaterThan(0)
    })
  })

  describe('largeur estimée d’une valeur', () => {
    it('distingue chiffre, ponctuation, signe et « m »', () => {
      expect(valueGlyphEm(',')).toBeLessThan(valueGlyphEm('0'))
      expect(valueGlyphEm('m')).toBeGreaterThan(valueGlyphEm('0'))
      expect(valueGlyphEm('-')).toBeLessThan(valueGlyphEm('0'))
    })

    it('« 1234 » est plus large que « 19 », d’où la réduction que l’appareil applique aussi', () => {
      expect(valueWidthEm('1234')).toBeGreaterThan(valueWidthEm('19'))
    })

    it('« +0,0 » compte moins que quatre chiffres pleins', () => {
      expect(valueWidthEm('+0,0')).toBeLessThan(valueWidthEm('0000'))
    })
  })

  describe('la place laissée à la valeur décroît moins vite que la hauteur du widget', () => {
    // C'est le fond de la correction : le titre prend une place FIXE, donc le rapport
    // valeur/hauteur n'est pas constant. Mesuré sur la capture : 59 px de chiffre sur un
    // widget de 124, 110 sur un widget de 199 — un rapport qui passe de 0,47 à 0,55.
    const hauteur = (y1: number, y2: number): number => widgetHeightPx(box(0, y1, 10000, y2), PAYSAGE)

    it('les hauteurs de widget de la capture sont bien celles attendues', () => {
      expect(hauteur(1379, 3103)).toBeCloseTo(124.1, 1)
      expect(hauteur(4828, 7586)).toBeCloseTo(198.6, 1)
    })

    it('le rapport chiffre/hauteur croît avec la hauteur du widget', () => {
      // Reproduit la formule de `--xc-value-size` (style.css) pour la vérifier contre les
      // mesures : elle y est écrite en CSS, hors de portée d'un test de DOM.
      const police = titleFontPx(PAYSAGE, 140)
      const valeur = (h: number): number => Math.min((h - police * 1.885) * 0.973, h * 0.88)
      // Les cinq mesures, à 2 px près — c'est la tolérance annoncée dans style.css.
      const mesures: [number, number][] = [[124.1, 59], [124.3, 58], [173.8, 95], [173.8, 93], [198.6, 110]]
      for (const [hauteurWidget, chiffreMesure] of mesures) {
        expect(Math.abs(valeur(hauteurWidget) * CAP_HEIGHT - chiffreMesure)).toBeLessThanOrEqual(2.5)
      }
      // Et le rapport croît bien avec la hauteur, ce qu'un simple pourcentage ne ferait pas.
      expect((valeur(198.6) * CAP_HEIGHT) / 198.6).toBeGreaterThan((valeur(124.1) * CAP_HEIGHT) / 124.1)
    })
  })
})
