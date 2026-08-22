import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseJson } from '../../src/core/parseJson'
import { readLayout } from '../../src/model/layout'
import { getMember, readString } from '../../src/core/access'
import optionsBase from '../../src/catalog/widgetOptions/base.json'
import optionsHr from '../../src/catalog/widgetOptions/hr.json'
import optionsHi from '../../src/catalog/widgetOptions/hi.json'
import preferencesBase from '../../src/catalog/preferenceCatalog/base.json'
import { BACKUP_2026, EXPORTS } from '../fixtures/paths'

/**
 * # Un chiffre écrit en prose est une affirmation comme une autre
 *
 * `CLAUDE.md` dit déjà pourquoi les cinq README et les cinq manuels sont tenus par des
 * tests : « la phrase était vraie quand elle a été écrite, et le monde a bougé autour
 * d'elle ». **Le même vieillissement frappe les commentaires du code**, et la revue du
 * 22 août 2026 l'a mesuré : dix-sept chiffres cités en docblock avaient dérivé, dont un
 * qui n'avait jamais été vrai et qui servait d'argument à un seuil.
 *
 * Deux causes, et une seule d'entre elles se garde :
 *
 * 1. **la régénération d'un catalogue** — `corpusMissing` est passé de 18 à 9,
 *    `stringCount` de 248 à 257, sans qu'aucune des six phrases qui les citaient bouge.
 *    Ces chiffres-là se **recalculent** depuis un fichier versionné : ce sont eux que ce
 *    fichier tient.
 * 2. **une mesure hors du dépôt public** — les 21 `.xcfg` réels, les 55 relevés d'APK, un
 *    poids de morceau construit. Aucun test ne peut les refaire ici. Ceux-là sont
 *    **datés** dans leur docblock, avec la méthode qui les a produits ; c'est la seule
 *    réponse honnête, et elle vaut mieux qu'un chiffre nu.
 *
 * ## Ce que chaque test fait, et pourquoi c'est fait ainsi
 *
 * On lit **le texte du module** et on en extrait le nombre cité, puis on le compare au
 * nombre recalculé. Vérifier seulement le calcul ne servirait à rien : c'est la **phrase**
 * qui ment, pas le code. Un test qui dirait « `meta.stringCount` vaut 257 » resterait vert
 * pendant que le docblock continuerait d'annoncer 248.
 */

/** Tous les modules du dépôt, chemin relatif à la racine → source — comme `tests/docs/`. */
const MODULES: Record<string, string> = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>('../../src/**/*.ts', { eager: true, query: '?raw', import: 'default' })
  ).map(([key, source]) => [key.replace('../../', ''), source])
)

function source(path: string): string {
  const text = MODULES[path]
  expect(text, `${path} doit exister`).toBeTypeOf('string')
  return text!
}

/**
 * Le nombre cité par la première phrase du module qui contient `motif`. `motif` doit
 * porter un groupe capturant, et lui seul.
 */
function cited(path: string, motif: RegExp): number {
  const found = motif.exec(source(path))
  expect(found, `${path} : ${motif} ne trouve rien`).not.toBeNull()
  return Number(found![1]!.replace(/[\s  ]/g, ''))
}

/** Longueur compacte d'un JSON, en octets — la mesure que citent les docblocks de poids. */
function compactBytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength
}

const OPTIONS_BASE = optionsBase as unknown as {
  meta: { stringCount: number; corpusMissing: number; languages: string[] }
  unmatchedCorpusKeys: Record<string, string[]>
}
const PREFERENCES_BASE = preferencesBase as unknown as {
  meta: { preferenceCount: number; labelledCount: number }
  preferences: Record<string, { control: string | null }>
  unlabelled: string[]
  screens: Array<{ id: string; rows: unknown[] }>
}

describe('les chiffres du catalogue des options de gadgets', () => {
  it('dit le vrai nombre de ressources, et la seule langue complète', () => {
    const count = OPTIONS_BASE.meta.stringCount
    expect(cited('src/catalog/widgetOptions.ts', /\*\*l'anglais est la seule complète\*\* sur les\n \* (\d+) ressources/))
      .toBe(count)
    // `hi` et `hr` sont cités comme les deux extrêmes de la couverture. Les recompter
    // vaut mieux que de lire leur `nativeStringCount` : c'est ce que le lecteur ferait.
    const native = (file: unknown): number =>
      Object.values((file as { strings: Record<string, Record<string, string>> }).strings)
        .filter((entry) => entry['native'] !== undefined).length
    const hi = (optionsHi as { nativeStringCount: number }).nativeStringCount
    const hr = (optionsHr as { nativeStringCount: number }).nativeStringCount
    expect(cited('src/catalog/widgetOptions.ts', /`hi` n'en traduit que (\d+)/)).toBe(hi)
    expect(cited('src/catalog/widgetOptions.ts', /`hr` (\d+)\./)).toBe(hr)
    expect(native).toBeTypeOf('function')
  })

  /**
   * Le docblock a longtemps opposé « treize fois plus grosse » à « tient en 5 Ko » pour
   * justifier deux découpages contraires. Ni l'un ni l'autre n'avait été mesuré : le
   * rapport vaut 3,5 et l'invariant de `widgetCatalog` pèse 13 Ko, pas 5. L'argument
   * tient toujours — mais sur la **taille absolue**, pas sur un rapport, et c'est ce que
   * la nouvelle rédaction dit.
   */
  it('dit les vrais poids des deux parts, et le vrai rapport entre elles', () => {
    const base = compactBytes(optionsBase)
    const langue = compactBytes(optionsHr)
    const kb = (bytes: number): number => Math.round(bytes / 1000)

    expect(cited('src/catalog/widgetOptions.ts', /`widgetOptions\/base\.json` — (\d+) Ko compacts/))
      .toBe(kb(base))
    expect(cited('src/catalog/widgetOptions.ts', /Ici elle pèse (\d+) Ko, trois fois et demie/))
      .toBe(kb(base))
    // Trois fois et demie : la valeur exacte est 3,4 — l'arrondi de la prose est honnête
    // tant qu'il reste entre 3 et 4.
    expect(base / langue).toBeGreaterThan(3)
    expect(base / langue).toBeLessThan(4)
    // 34 langues × la part invariante : le coût qu'on refuse de payer.
    const langues = OPTIONS_BASE.meta.languages.length
    expect(langues).toBe(34)
    expect(Math.round((base * langues) / 100_000) / 10).toBeCloseTo(2.3, 1)
  })

  it('dit le vrai nombre d’options du corpus que le catalogue n’apparie pas', () => {
    const couples = Object.values(OPTIONS_BASE.unmatchedCorpusKeys)
      .reduce((total, keys) => total + keys.length, 0)
    const noms = new Set(Object.values(OPTIONS_BASE.unmatchedCorpusKeys).flat())
    expect(OPTIONS_BASE.meta.corpusMissing).toBe(couples)
    expect(cited('src/ui/properties.ts', /Le corpus en compte \*\*(\d+)\*\*/)).toBe(couples)
    expect(source('src/ui/properties.ts')).toContain('sous cinq noms')
    expect(noms.size).toBe(5)
    // `inspection.ts` citait le même 18 à deux endroits ; il ne cite plus de nombre du
    // tout au second, et le premier dit maintenant les deux comptes.
    expect(cited('src/model/inspection.ts', /options non appariées \((\d+) couples/)).toBe(couples)
    expect(source('src/model/inspection.ts')).not.toContain('18 options non appariées')
  })
})

describe('les chiffres du catalogue des réglages généraux', () => {
  it('dit le vrai nombre de réglages, et le même des deux côtés', () => {
    const total = Object.keys(PREFERENCES_BASE.preferences).length
    expect(PREFERENCES_BASE.meta.preferenceCount).toBe(total)
    expect(cited('src/ui/main.ts', /consulter (\d+) réglages/)).toBe(total)
  })

  it('dit le vrai nombre de lignes du menu racine', () => {
    const racine = PREFERENCES_BASE.screens.find((screen) => screen.id === 'preferences')
    expect(cited('src/ui/main.ts', /répartis sur\n \* (\d+) lignes de menu/)).toBe(racine!.rows.length)
  })

  it('dit le vrai nombre de clés sans libellé, et les trois façons de le compter coïncident', () => {
    const sansControle = Object.values(PREFERENCES_BASE.preferences)
      .filter((entry) => entry.control === null).length
    const total = Object.keys(PREFERENCES_BASE.preferences).length
    expect(PREFERENCES_BASE.unlabelled.length).toBe(sansControle)
    expect(total - PREFERENCES_BASE.meta.labelledCount).toBe(sansControle)
    expect(cited('src/catalog/preferenceCatalog.ts', /\*\*(\d+) clés n'ont pas de libellé\*\*/))
      .toBe(sansControle)
    // Le même compte est cité deux fois dans `preferencesPage.ts`, et les deux disaient
    // deux choses (85 et 86) jusqu'au 22 août 2026.
    expect(cited('src/ui/preferencesPage.ts', /écarte les (\d+) clés/)).toBe(sansControle)
    expect(cited('src/ui/preferencesPage.ts', /(\d+) réglages sur \d+ n'ont aucun libellé/))
      .toBe(sansControle)
    // Le total, cité dans la même phrase, est celui du catalogue — pas celui du dernier
    // palier de `preferenceVersions`, que le paragraphe distingue explicitement.
    expect(cited('src/ui/preferencesPage.ts', /\d+ réglages sur (\d+) n'ont aucun libellé/))
      .toBe(total)
  })

  /**
   * Le catalogue porte **17** clés `Keys.*`, dont 15 seulement sont des touches. Le
   * docblock de `preferenceCatalog.ts` disait « les quinze `Keys.*` » sans qualification :
   * juste par accident, faux à la lettre. La qualification ajoutée le rend vérifiable.
   */
  it('dit quinze `Keys.*` porteuses d’un code de touche, et il y en a bien quinze', () => {
    const keys = Object.entries(PREFERENCES_BASE.preferences).filter(([key]) => key.startsWith('Keys.'))
    const touches = keys.filter(([, entry]) => entry.control === 'action')
    expect(keys).toHaveLength(17)
    expect(touches).toHaveLength(15)
    expect(source('src/catalog/preferenceCatalog.ts'))
      .toContain("quinze `Keys.*` porteurs d'un code de touche")
    const unites = Object.keys(PREFERENCES_BASE.preferences).filter((key) => key.startsWith('Unit.'))
    expect(unites).toHaveLength(8)
  })
})

describe('les chiffres du rendu', () => {
  /**
   * ⚠️ La contradiction que ce test épingle est **ouverte**, pas résolue : trois modules
   * citent comme relevés d'appareil des largeurs que la grille de rendu ne donne pas. Le
   * test ne dit pas qui a raison — il vérifie que `canvas.ts` continue de porter le
   * paragraphe qui l'avoue, et que les trois écarts sont bien ceux qu'il annonce. Le jour
   * où la loi ou les relevés changeront, il faudra rouvrir le paragraphe, pas le test.
   */
  it('garde écrit que trois relevés contredisent la grille de rendu', () => {
    const canvas = source('src/render/canvas.ts')
    expect(canvas).toContain('Trois relevés du dépôt que cette loi contredit')
    expect(canvas).not.toContain('Vérifiée\n * sans exception')

    const long = 51
    const largeur = (x1: number, x2: number): number =>
      Math.round((Math.round((x2 * long) / 10000) * 1280) / long)
      - Math.round((Math.round((x1 * long) / 10000) * 1280) / long)
    expect(largeur(833, 2292)).toBe(201)
    expect(largeur(6042, 10000)).toBe(502)
    expect(Math.round((Math.round((3125 * long) / 10000) * 1280) / long) - 248).toBe(154)
    expect(Math.round((Math.round((6042 * long) / 10000) * 1280) / long) - 248).toBe(530)

    // Et les trois modules renvoient bien ici, faute de quoi le lecteur croirait chacun
    // sur parole.
    for (const module of [
      'src/render/widgets/numeric.ts', 'src/render/widgets/statusLine.ts', 'src/render/textMetrics.ts'
    ]) {
      expect(source(module), module).toContain('NON TRANCHÉ')
    }
  })

  /**
   * « Le seul fichier du corpus qui les porte » servait d'argument à la phrase suivante,
   * et trois fixtures sur cinq portent la clé. La règle vraie est celle du **format**.
   */
  it('dit combien de fixtures portent `Display.WidgetTitleSize`, et lesquelles', () => {
    const fichiers = ['2025-07-07_backup-00', '2026-08-20_backup-00', 'backup',
      '2025-07-07_pages-00', '2026-08-20_pages-00']
    const porteuses = fichiers.filter((nom) => {
      const document = parseJson(readFileSync(`${EXPORTS}${nom}.xcfg`, 'utf8'))
      const preferences = getMember(document, 'preferences')
      return preferences !== undefined && readString(preferences, 'Display.WidgetTitleSize') !== undefined
    })
    expect(porteuses).toEqual(['2025-07-07_backup-00', '2026-08-20_backup-00', 'backup'])
    // La règle du format : tout `backup`, aucun `pages`.
    expect(porteuses.every((nom) => nom.includes('backup'))).toBe(true)
    expect(source('src/render/textMetrics.ts')).toContain('Trois des cinq fixtures')
    expect(source('src/render/textMetrics.ts')).not.toContain('le seul fichier du corpus qui les porte')
  })

  it('dit le vrai poids compact du relevé des valeurs d’usine', () => {
    const defaults = JSON.parse(readFileSync('src/catalog/widgetDefaults.json', 'utf8')) as unknown
    const compact = compactBytes(defaults)
    // « 9,9 Ko compactés » : on vérifie le dixième de kilo-octet, pas l'octet.
    expect(Math.round((compact / 1024) * 10) / 10).toBeCloseTo(9.9, 1)
    expect(source('src/render/defaults.ts')).toContain('9,9 Kio compactés')
  })
})

describe('les chiffres des fixtures', () => {
  it('dit quelle page paysage porte quinze gadgets', () => {
    const layout = readLayout(parseJson(readFileSync(BACKUP_2026, 'utf8')))
    const comptes = layout.landscape.map((page) => page.widgets.length)
    expect(comptes[0]).toBe(14)
    expect(comptes[1]).toBe(15)
    expect(cited('src/ui/views.ts', /widgets de la page \*\*(\d)\*\* paysage/)).toBe(2)
  })

  /**
   * `Navigation.State` sert d'argument au seuil `SUSPECT_VALUE_LIMIT` : c'est le pavé
   * qu'un inventaire ne doit pas dérouler. Le chiffre cité, 1 332, ne correspondait à
   * **aucune** convention de mesure — ni la source, ni le minifié, ni l'échappé. Le
   * docblock cite maintenant les deux qui ont un sens, et ce test les tient.
   */
  it('dit la vraie taille de `Navigation.State` dans la sauvegarde de référence', () => {
    const document = parseJson(readFileSync(BACKUP_2026, 'utf8'))
    const preferences = getMember(document, 'preferences')!
    const node = getMember(preferences, 'Navigation.State')!
    // Deux conventions, et deux seulement ont un sens : la structure telle qu'elle est
    // écrite dans le fichier (indentation comprise), et la même minifiée. Aucune ne donne
    // 1 332 ; le docblock cite les deux, en les nommant.
    const texte = readFileSync(BACKUP_2026, 'utf8')
    const marque = '"Navigation.State": '
    const debut = texte.indexOf(marque) + marque.length
    let profondeur = 0
    let fin = debut
    for (; fin < texte.length; fin++) {
      if (texte[fin] === '{') profondeur++
      else if (texte[fin] === '}' && --profondeur === 0) { fin++; break }
    }
    expect(node.kind).toBe('object')
    expect(fin - debut).toBe(2322)
    expect(cited('src/model/personalData.ts', /pav\u00e9 de ([\d\s\u202f\u00a0]+) caract\u00e8res/)).toBe(2322)
    expect(cited('src/model/personalData.ts', /\(([\d\s\u202f\u00a0]+) une fois minifi\u00e9/)).toBe(1222)
    // Le docblock garde la trace du chiffre faux, et c'est voulu : celui qui le
    // retrouvera dans un vieux rapport doit pouvoir lire pourquoi il a été retiré.
  })
})

describe('les chiffres des relevés d’APK', () => {
  /**
   * « 47 APK » comptait en fait des **versions** : 55 relevés fusionnés en 47 entrées,
   * pendant que le même fichier écrivait « les 55 relevés » deux fois, dix lignes plus
   * bas. Les deux nombres existent ; ils ne nomment pas la même chose.
   */
  it('ne confond plus le nombre d’APK relevés et le nombre de paliers de version', () => {
    const index = JSON.parse(
      readFileSync('src/catalog/preferenceVersions/index.json', 'utf8')
    ) as { meta: { versionCount: number }; versions: Array<{ sources: string[] }> }
    const releves = index.versions.reduce((total, entry) => total + entry.sources.length, 0)
    expect(releves).toBe(55)
    expect(index.meta.versionCount).toBe(47)
    expect(cited('src/i18n/messages/fr/common.ts', /notre extraction des (\d+) APK/)).toBe(releves)
  })
})
