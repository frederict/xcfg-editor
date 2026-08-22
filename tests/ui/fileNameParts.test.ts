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
 */
describe('couper un nom de fichier là où la fin compte', () => {
  it('laisse en queue tout ce qui distingue deux exports du même jour', () => {
    expect(fileNameParts('2026-08-20_backup-00.xcfg'))
      .toEqual({ head: '2026-08-20', tail: '_backup-00.xcfg' })
    expect(fileNameParts('2026-08-20_backupwithmedia-00.xczfg'))
      .toEqual({ head: '2026-08-20', tail: '_backupwithmedia-00.xczfg' })
    // Les deux queues diffèrent dès le septième caractère : c'est tout l'objet.
    expect(fileNameParts('2026-08-20_backup-00.xcfg').tail)
      .not.toBe(fileNameParts('2026-08-20_backupwithmedia-00.xczfg').tail)
  })

  it('coupe au DERNIER souligné, pas au premier', () => {
    // Le nom que cet outil produit lui-même : le premier `_` laisserait l'horodatage
    // entier en queue et « xctrack » en tête, c'est-à-dire l'inverse de ce qu'on veut.
    expect(fileNameParts('xctrack_2026-08-22-130205_backup.xcfg'))
      .toEqual({ head: 'xctrack_2026-08-22-130205', tail: '_backup.xcfg' })
  })

  it('se rabat sur le tiret, puis sur l’extension, puis sur rien', () => {
    expect(fileNameParts('backup-00.xcfg')).toEqual({ head: 'backup', tail: '-00.xcfg' })
    expect(fileNameParts('backup.xcfg')).toEqual({ head: 'backup', tail: '.xcfg' })
    // Aucun séparateur : rien à sacrifier, le nom entier est la queue.
    expect(fileNameParts('backup')).toEqual({ head: '', tail: 'backup' })
    expect(fileNameParts('')).toEqual({ head: '', tail: '' })
  })

  it('rend exactement le nom reçu une fois recollé', () => {
    for (const name of [
      '2026-08-20_backup-00.xcfg', '2026-08-20_backupwithmedia-00.xczfg',
      'xctrack_2026-08-22-130205_backup.xcfg', '.xcfg', '_', '-', 'a', ''
    ]) {
      const { head, tail } = fileNameParts(name)
      expect(head + tail, name).toBe(name)
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
    // 999 contre 1 : la tête absorbe la quasi-totalité du manque avant que la queue —
    // « _backup-00.xcfg », qui porte le format et l'extension — ne cède le moindre signe.
    expect(rule('.app-bar__fileHead')).toContain('flex: 0 999 auto;')
    expect(rule('.app-bar__fileTail')).toContain('flex: 0 1 auto;')
    for (const selector of ['.app-bar__fileHead', '.app-bar__fileTail']) {
      expect(rule(selector), selector).toContain('min-width: 0;')
      expect(rule(selector), selector).toContain('text-overflow: ellipsis;')
    }
    // Deux morceaux côte à côte, et non l'un sous l'autre.
    expect(rule('.app-bar__file')).toContain('display: flex;')
  })
})
