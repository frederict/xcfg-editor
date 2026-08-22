import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { deviceFor } from '../../src/catalog/devices'
import { parseJson } from '../../src/core/parseJson'
import { createLibrary } from '../../src/library/library'
import { createMemoryStore } from '../../src/library/memoryStore'
import { readLayout } from '../../src/model/layout'
import {
  choosePreviewPage,
  makeLibraryPreview,
  readPreviewScene,
  redactedRanks,
  PREVIEW_MEDIA_TYPE
} from '../../src/ui/libraryPreview'
import { BACKUP_2026 } from '../fixtures/paths'

const AIR3 = deviceFor('AIR3 AIR3-7.2 8.1.0')
const bytesOf = (text: string): Uint8Array => new TextEncoder().encode(text)

/**
 * Un document synthétique fait pour les deux questions de ce module, et pour elles seules :
 *
 * - **quelle page** — la première page paysage porte `navigations: "none"`, c'est-à-dire
 *   celle que l'appareil ne montre jamais (relevé au pilote, voir `libraryPreview.ts`).
 *   La vignette doit prendre la deuxième ;
 * - **quels gadgets masquer** — cette deuxième page porte trois gadgets : un sans un mot
 *   du pilote, un `WFreeText` qui porte son texte, un `WButtonPhone` qui porte le nom et
 *   le numéro d'un proche. Un quatrième porte un `titletext` **vide**, qui n'est pas un
 *   texte du pilote et ne doit donc rien masquer.
 */
const SOURCE = JSON.stringify({
  info: {
    device: 'AIR3 AIR3-7.2 8.1.0',
    exportType: 'backup',
    versionCode: 100030,
    versionName: '1.0.3-beta'
  },
  layout: {
    landscape: [
      {
        CLASS: 'org.xcontest.XCTrack.widget.wp.WPCompetition',
        navigations: 'none',
        widgets: [
          { CLASS: 'org.xcontest.XCTrack.widget.w.WAltitude', X1: 0, Y1: 0, X2: 10000, Y2: 10000 }
        ]
      },
      {
        CLASS: 'org.xcontest.XCTrack.widget.wp.WPEmpty',
        navigations: 'all',
        widgets: [
          { CLASS: 'org.xcontest.XCTrack.widget.w.WAltitude', X1: 0, Y1: 0, X2: 5000, Y2: 5000 },
          {
            CLASS: 'org.xcontest.XCTrack.widget.w.WFreeText',
            X1: 5000, Y1: 0, X2: 10000, Y2: 5000,
            text: 'Rendez-vous au décollage de La Bourgade'
          },
          {
            CLASS: 'org.xcontest.XCTrack.widget.w.WButtonPhone',
            X1: 0, Y1: 5000, X2: 5000, Y2: 10000,
            contact: { fullName: 'Jean Dupont', phoneNumber: '+32 470 00 00 00' }
          },
          {
            CLASS: 'org.xcontest.XCTrack.widget.w.WSpeed',
            X1: 5000, Y1: 5000, X2: 10000, Y2: 10000,
            titletext: ''
          }
        ]
      }
    ],
    portrait: [
      {
        CLASS: 'org.xcontest.XCTrack.widget.wp.WPEmpty',
        navigations: 'all',
        widgets: [
          { CLASS: 'org.xcontest.XCTrack.widget.w.WAltitude', X1: 0, Y1: 0, X2: 10000, Y2: 2000 }
        ]
      }
    ]
  }
}, null, 2)

/** Le même, sans une seule page paysage : le repli doit prendre le portrait. */
const PORTRAIT_ONLY = JSON.stringify({
  info: { device: 'AIR3 AIR3-7.2 8.1.0', exportType: 'backup' },
  layout: {
    landscape: [],
    portrait: [
      {
        CLASS: 'org.xcontest.XCTrack.widget.wp.WPEmpty',
        navigations: 'none',
        widgets: [
          { CLASS: 'org.xcontest.XCTrack.widget.w.WAltitude', X1: 0, Y1: 0, X2: 10000, Y2: 2000 }
        ]
      },
      {
        CLASS: 'org.xcontest.XCTrack.widget.wp.WPEmpty',
        navigations: 'all',
        widgets: [
          { CLASS: 'org.xcontest.XCTrack.widget.w.WVario', X1: 0, Y1: 0, X2: 10000, Y2: 3000 }
        ]
      }
    ]
  }
}, null, 2)

const preview = (text: string): ReturnType<typeof makeLibraryPreview> =>
  makeLibraryPreview({ bytes: bytesOf(text), fileName: 'essai.xcfg', device: AIR3, language: 'fr' })

describe('choix de la page représentée', () => {
  it('prend la première page paysage que l’appareil montre', () => {
    const chosen = choosePreviewPage(readLayout(parseJson(SOURCE)))
    expect(chosen).toMatchObject({ orientation: 'landscape', pageRank: 2 })
  })

  it('se rabat sur le portrait quand la configuration n’a aucune page paysage', () => {
    const chosen = choosePreviewPage(readLayout(parseJson(PORTRAIT_ONLY)))
    expect(chosen).toMatchObject({ orientation: 'portrait', pageRank: 2 })
  })

  it('rend quand même la première page quand l’appareil n’en montre aucune', () => {
    // Une vignette imparfaite vaut mieux qu'un trou : le pilote reconnaît sa
    // configuration à sa composition, même sur une page que l'instrument saute.
    const layout = readLayout(parseJson(SOURCE))
    layout.landscape[1]!.navigations = { kind: 'none' }
    expect(choosePreviewPage(layout)).toMatchObject({ orientation: 'landscape', pageRank: 1 })
  })

  it('ne rend rien quand il n’y a aucune page', () => {
    expect(choosePreviewPage({ landscape: [], portrait: [] })).toBeUndefined()
  })
})

describe('la vie privée — ce qu’une image emporte et que le JSON ne dit pas', () => {
  /**
   * **La propriété qui compte.** L'anonymisation du projet travaille sur le document ;
   * une vignette est une image, elle passe donc à côté. Les deux gadgets qui portent les
   * mots du pilote sont désignés par `findFreeTexts` — la même liste que la carte
   * d'identité affiche et que la boîte de partage remplace — et par elle seule.
   */
  it('désigne les gadgets porteurs d’un texte du pilote, et eux seuls', () => {
    const layout = readLayout(parseJson(SOURCE))
    const chosen = choosePreviewPage(layout)!
    // Rangs 2 (`WFreeText`) et 3 (`WButtonPhone`). Le rang 4 porte un `titletext` VIDE :
    // un emplacement vide n'est pas un texte du pilote.
    expect([...redactedRanks(layout, chosen)].sort()).toEqual([2, 3])
  })

  it('ne laisse ni le texte libre, ni le nom, ni le numéro dans les octets rangés', async () => {
    const made = (await preview(SOURCE))!
    const svg = new TextDecoder().decode(made.bytes)
    expect(svg).not.toContain('La Bourgade')
    expect(svg).not.toContain('Jean Dupont')
    expect(svg).not.toContain('470 00 00 00')
    // Ce n'est pas un blanc : la place du gadget est tenue par une barre grise.
    expect(svg).toContain('#9a9a9a')
  })

  it('garde la composition de la page — cadres, places et gadgets muets', async () => {
    const made = (await preview(SOURCE))!
    const svg = new TextDecoder().decode(made.bytes)
    // Les quatre gadgets sont là, à leur place, et deux seulement portent une barre.
    expect(svg.match(/class="xc-widget"/g)?.length).toBe(4)
    expect(svg.match(/#9a9a9a/g)?.length).toBe(2)
    // Les deux autres gardent leur dessin et leur titre, lu dans le catalogue de XCTrack.
    expect(svg).toContain('Altitude GPS')
    expect(svg).toContain('Vitesse')
  })
})

describe('la fiche de la vignette', () => {
  it('déclare son type de média, sa taille et la page qu’elle montre', async () => {
    const made = (await preview(SOURCE))!
    expect(made.ref).toEqual({
      mediaType: PREVIEW_MEDIA_TYPE,
      widthPx: 1280,
      heightPx: 720,
      orientation: 'landscape',
      pageRank: 2
    })
  })

  it('suit les proportions de la page — une portrait n’a pas la forme d’une paysage', async () => {
    const made = (await preview(PORTRAIT_ONLY))!
    expect(made.ref.orientation).toBe('portrait')
    expect(made.ref.heightPx).toBeGreaterThan(made.ref.widthPx)
  })

  it('ne rend rien plutôt que de lever, quand il n’y a rien à dessiner', async () => {
    expect(await preview('{"info":{}}')).toBeUndefined()
    expect(await preview('ceci n’est pas du JSON')).toBeUndefined()
  })
})

/**
 * Le poids, **mesuré et non supposé** — c'est le chiffre qui décide si une bibliothèque de
 * plusieurs dizaines d'entrées tient.
 *
 * Relevé dans Chrome, sur l'IndexedDB réelle de la page d'essai (22 août 2026) :
 *
 * | Entrée | Ses octets | Sa vignette | Rapport |
 * |---|---|---|---|
 * | `2026-08-20_backup-00.xcfg` | 78 642 | **14 218** | 18 % |
 * | `2026-08-20_pages-00.xcfg` | 57 982 | **14 218** | 25 % |
 * | `formes-preservees.xcfg` (4 gadgets) | 3 154 | **1 608** | 51 % |
 * | `2026-08-20_backupwithmedia-00.xczfg` | 7 794 | **14 218** | 182 % |
 *
 * La dernière ligne est le cas qui surprend et qu'il faut dire : une archive `.xczfg` est
 * un flux **compressé**, sa vignette pèse donc plus que l'entrée. Ce n'est pas une
 * anomalie, et cela ne change pas l'ordre de grandeur : à 14 ko la vignette, une
 * bibliothèque de trente entrées ajoute ~430 ko — devant les 10,0 Go de quota que le même
 * navigateur a annoncés au même moment.
 *
 * La borne ci-dessous n'est pas un objectif, c'est un garde-fou : elle tombe le jour où
 * une vignette se met à peser comme un fichier de configuration.
 */
describe('le poids', () => {
  it('reste de l’ordre de la dizaine de kilo-octets, pas de la centaine', async () => {
    const bytes = new Uint8Array(readFileSync(BACKUP_2026))
    const made = (await makeLibraryPreview({
      bytes, fileName: 'backup.xcfg', device: AIR3, language: 'fr'
    }))!
    expect(made.bytes.byteLength).toBeLessThan(32_000)
  })
})

describe('fidélité à l’octet près', () => {
  /**
   * **La promesse centrale du projet, appliquée à la vignette** : elle est *dérivée* des
   * octets rangés, elle ne les touche pas. `bytesOf` recalcule l'empreinte à chaque
   * lecture — un seul octet déplacé la ferait échouer.
   */
  it('ranger une vignette ne change rien aux octets de la configuration', async () => {
    const original = new Uint8Array(readFileSync(BACKUP_2026))
    const library = createLibrary({ store: createMemoryStore(), channel: null })
    const entry = await library.add({
      name: 'Comp Annecy', bytes: original, fileName: 'backup.xcfg'
    })
    const avant = await library.bytesOf(entry.id)

    const made = (await makeLibraryPreview({
      bytes: avant, fileName: entry.fileName, device: AIR3, language: 'fr'
    }))!
    const posee = await library.setPreview(entry.id, made.bytes, made.ref, entry.revision)

    const apres = await library.bytesOf(entry.id)
    expect(Buffer.from(apres).equals(Buffer.from(original))).toBe(true)
    expect(posee.sha256).toBe(entry.sha256)
    expect(posee.byteLength).toBe(entry.byteLength)
    // Poser une vignette n'est pas une écriture du pilote : le compte d'enregistrements
    // et la date de dernière écriture ne bougent pas.
    expect(posee.revision).toBe(entry.revision)
    expect(posee.updatedAt).toBe(entry.updatedAt)
  })
})

describe('relire une vignette rangée', () => {
  it('rend une scène posable dans le document', async () => {
    const made = (await preview(SOURCE))!
    const scene = readPreviewScene(made.bytes)
    expect(scene?.tagName.toLowerCase()).toBe('svg')
    expect(scene?.getAttribute('class')).toBe('xc-page-scene')
  })

  /**
   * IndexedDB est écrit par tout ce qui tourne sur cette origine, et l'archive de
   * bibliothèque n'y entre plus (`transfer.ts`). Reste la prudence par défaut : ce qu'on
   * pose dans le document ne porte ni script, ni gestionnaire d'événement, ni lien.
   */
  it('retire ce qu’un SVG ne devrait jamais porter dans une vignette', () => {
    const hostile = '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)">' +
      '<script>alert(2)</script><a href="javascript:alert(3)"><rect onclick="alert(4)"/></a></svg>'
    const scene = readPreviewScene(bytesOf(hostile))!
    const html = scene.outerHTML
    expect(html).not.toContain('onload')
    expect(html).not.toContain('onclick')
    expect(html).not.toContain('script')
    expect(html).not.toContain('javascript:')
  })

  it('ne rend rien plutôt qu’une scène douteuse quand les octets ne sont pas du SVG', () => {
    expect(readPreviewScene(bytesOf('<html><body>bonjour</body></html>'))).toBeUndefined()
  })
})
