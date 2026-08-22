import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { fileNameParts } from '../../src/ui/fileNameParts'

/**
 * Le défaut mesuré le 2026-08-22 : `2026-08-20_backup-00.xcfg` et
 * `2026-08-20_backupwithmedia-00.xczfg` s'affichaient **tous deux**
 * « 2026-08-20_backu… » dans la barre de tête. La troncature mangeait précisément ce qui
 * distingue les deux fichiers, et laissait la date, commune aux deux.
 *
 * ⚠️ **Et la coupe en deux n'a pas suffi**, remesuré le même jour : `.xcfg` devenait
 * « .xc… » à 1 024 px en édition, `.xczfg` était coupé même à 1 280 px. La tête s'effaçait
 * pourtant entièrement — 0 px de large au navigateur : c'est la queue seule qui était trop
 * longue. Elle se coupe donc à son tour, et le rang et l'extension ne cèdent jamais.
 */
describe('couper un nom de fichier là où la fin compte', () => {
  it('laisse en queue tout ce qui distingue deux exports du même jour', () => {
    expect(fileNameParts('2026-08-20_backup-00.xcfg'))
      .toEqual({ head: '2026-08-20', body: '_backup', tail: '-00.xcfg' })
    expect(fileNameParts('2026-08-20_backupwithmedia-00.xczfg'))
      .toEqual({ head: '2026-08-20', body: '_backupwithmedia', tail: '-00.xczfg' })
    // Les deux queues diffèrent dès le quatrième caractère : c'est tout l'objet.
    expect(fileNameParts('2026-08-20_backup-00.xcfg').tail)
      .not.toBe(fileNameParts('2026-08-20_backupwithmedia-00.xczfg').tail)
  })

  /**
   * ⚠️ **Ce que le pilote-testeur ne pouvait pas lire.** L'extension est la seule chose
   * qui dise si le fichier emporte les médias ; le rang, la seule qui sépare deux exports
   * du même jour et du même genre. Ni l'un ni l'autre ne quitte la queue.
   */
  it('garde le rang et l’extension du même côté, celui qui ne cède pas', () => {
    for (const [name, tail] of [
      ['2026-08-20_backup-00.xcfg', '-00.xcfg'],
      ['2026-08-20_backup-01.xcfg', '-01.xcfg'],
      ['2026-08-20_backupwithmedia-00.xczfg', '-00.xczfg'],
      ['2026-08-20_pages-00.xcfg', '-00.xcfg'],
      ['xctrack_2026-08-22-130205_backup.xcfg', '.xcfg']
    ] as const) {
      expect(fileNameParts(name).tail, name).toBe(tail)
    }
  })

  it('coupe au DERNIER souligné, pas au premier', () => {
    // Le nom que cet outil produit lui-même : le premier `_` laisserait l'horodatage
    // entier en queue et « xctrack » en tête, c'est-à-dire l'inverse de ce qu'on veut.
    expect(fileNameParts('xctrack_2026-08-22-130205_backup.xcfg'))
      .toEqual({ head: 'xctrack_2026-08-22-130205', body: '_backup', tail: '.xcfg' })
  })

  it('se rabat sur le tiret, puis sur l’extension, puis sur rien', () => {
    expect(fileNameParts('backup-00.xcfg'))
      .toEqual({ head: 'backup', body: '', tail: '-00.xcfg' })
    expect(fileNameParts('backup.xcfg'))
      .toEqual({ head: 'backup', body: '', tail: '.xcfg' })
    // Aucun séparateur : rien à sacrifier, le nom entier est la queue.
    expect(fileNameParts('backup')).toEqual({ head: '', body: '', tail: 'backup' })
    expect(fileNameParts('')).toEqual({ head: '', body: '', tail: '' })
  })

  it('ne laisse jamais l’extension du côté qui s’efface', () => {
    // Un tiret APRÈS le point — une copie renommée à la main. Couper au dernier tiret
    // mettrait `.xcfg` dans le corps, c'est-à-dire du côté qui cède.
    const parts = fileNameParts('2026-08-20_backup.xcfg-copie')
    expect(parts.tail.startsWith('.xcfg')).toBe(true)
    expect(parts.body).not.toContain('.xcfg')
  })

  it('rend exactement le nom reçu une fois recollé', () => {
    for (const name of [
      '2026-08-20_backup-00.xcfg', '2026-08-20_backupwithmedia-00.xczfg',
      'xctrack_2026-08-22-130205_backup.xcfg', 'formes-preservees.xcfg',
      '2026-08-20_backup.xcfg-copie', '.xcfg', '_', '-', 'a', ''
    ]) {
      const { head, body, tail } = fileNameParts(name)
      expect(head + body + tail, name).toBe(name)
    }
  })
})

/**
 * La coupe ne sert à rien si la feuille de style laisse la queue céder la première : ni
 * happy-dom ni jsdom ne calculent une cascade externe, et le seul contrôle automatisable
 * est la relecture de la règle — même parti pris que `tests/ui/appStyle.test.ts`.
 */
describe('app.css — c’est la tête qui s’efface, jamais la queue', () => {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const css = readFileSync(path.join(here, '../../src/ui/app.css'), 'utf8')

  /** Le corps de la règle nommée, accolades comprises. */
  function rule(selector: string): string {
    const start = css.indexOf(`${selector} {`)
    expect(start, `règle absente : ${selector}`).toBeGreaterThan(-1)
    return css.slice(start, css.indexOf('}', start) + 1)
  }

  it('donne à la tête un coefficient de rétrécissement écrasant', () => {
    // ⚠️ 99999 et non 999, et l'écart est mesuré : le rétrécissement se répartit au
    // prorata de `flex-shrink × base`, et à 999 contre 1 le corps perdait encore 0,05 px
    // du manque — assez pour que `text-overflow` coupe. `2026-08-20_backup-00.xcfg`
    // s'affichait « 20…_back…-00.xcfg » à 1 100 px ; il s'affiche « 2…_backup-00.xcfg ».
    expect(rule('.app-bar__fileHead')).toContain('flex: 0 99999 auto;')
    expect(rule('.app-bar__fileBody')).toContain('flex: 0 1 auto;')
    for (const selector of ['.app-bar__fileHead', '.app-bar__fileBody']) {
      expect(rule(selector), selector).toContain('min-width: 0;')
      expect(rule(selector), selector).toContain('text-overflow: ellipsis;')
    }
    // Trois morceaux côte à côte, et non l'un sous l'autre.
    expect(rule('.app-bar__file')).toContain('display: flex;')
  })

  /**
   * ⚠️ **Le correctif du second relevé.** La tête s'effaçait bien entièrement, et
   * l'extension tombait quand même : c'est la queue qui manquait de place. Elle ne cède
   * donc plus du tout — `flex-shrink: 0` —, et le corps cède à sa place.
   */
  it('interdit à la queue de céder, quel que soit le manque', () => {
    const tail = rule('.app-bar__fileTail')
    expect(tail).toContain('flex: 0 0 auto;')
    // `max-width: 100%` : le seul cas où la queue peut céder est celui où elle est tout
    // le nom. Sans lui, elle serait coupée net par l'`overflow` du parent, sans ellipse.
    expect(tail).toContain('max-width: 100%;')
    expect(tail).toContain('text-overflow: ellipsis;')
  })

  it('garde les deux plafonds mesurés de la barre', () => {
    // Ils ne sont pas en cause : à 1 280 px la barre avait 220 px de vide, et à 1 024 px
    // en édition elle passe sur deux lignes au-delà de 20ch. Les changer sans remesurer
    // ferait replier la barre sur l'écran le plus étroit qu'on vise.
    expect(rule('.app-bar__file')).toContain('max-width: 24ch;')
    expect(css).toContain('.app-bar__file { max-width: 18ch; }')
  })
})
