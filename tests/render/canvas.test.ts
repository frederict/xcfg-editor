import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseJson } from '../../src/core/parseJson'
import { readLayout } from '../../src/model/layout'
import { readRenderSettings } from '../../src/model/preferences'
import { renderPage, widgetStyle } from '../../src/render/canvas'

describe('positionnement', () => {
  it('convertit les coordonnées 0-10000 en pourcentages', () => {
    const style = widgetStyle({ x1: 0, y1: 3226, x2: 10000, y2: 10000, background: 100 })
    expect(style.left).toBe('0%')
    expect(style.top).toBe('32.26%')
    expect(style.width).toBe('100%')
    expect(style.height).toBe('67.74%')
  })

  it('traduit _bg en opacité de fond', () => {
    expect(widgetStyle({ x1: 0, y1: 0, x2: 1, y2: 1, background: 40 }).backgroundOpacity).toBe(0.4)
    expect(widgetStyle({ x1: 0, y1: 0, x2: 1, y2: 1, background: 0 }).backgroundOpacity).toBe(0)
  })
})

describe('empilement', () => {
  const doc = parseJson(readFileSync('/Users/fred/DEV/XCTrack/Exemples/2026-08-20_backup-00.xcfg', 'utf8'))
  const settings = readRenderSettings(doc)
  const page = readLayout(doc).landscape[4]!

  it('émet les widgets dans l’ordre du tableau', () => {
    const element = renderPage(page, 16 / 9, settings)
    const children = [...element.querySelectorAll('.xc-widget')]
    expect(children).toHaveLength(21)
    // Le grand widget cartographique est au fond : il est émis en premier.
    expect((children[0] as HTMLElement).style.width).toBe('75%')
    // Le dernier émis est au-dessus de tous les autres.
    expect(children[children.length - 1]).toBe(element.lastElementChild)
  })

  it('reporte l’opacité de _bg sur chaque widget', () => {
    const element = renderPage(page, 16 / 9, settings)
    const third = element.querySelectorAll('.xc-widget')[2] as HTMLElement
    expect(third.style.getPropertyValue('--xc-bg-opacity')).toBe('0.2')
  })
})
