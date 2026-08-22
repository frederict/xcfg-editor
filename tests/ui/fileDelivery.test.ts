import { createHash } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  deliverBytes, handOverToBrowser, type Delivery, type DeliveryEnvironment, type SaveFilePicker
} from '../../src/ui/fileDelivery'
import { buildExportFileName } from '../../src/model/sharing'

/**
 * # Le seul geste que cet outil ne maîtrise pas
 *
 * ## Ce que le chemin classique ne peut pas dire
 *
 * Un `<a download>` fabriqué puis cliqué ne rend **aucun compte**. Mesuré trois fois le
 * 22 août 2026 : trois enregistrements arrivés dans un onglet et **zéro sur trois** dans un
 * autre, à quatre minutes d'écart, même code et même fichier ; quatre enregistrements d'un
 * pilote d'essai, **aucun arrivé**, tous restés en fichiers temporaires jamais finalisés ;
 * et aucune exception, aucun événement, rien que la page puisse lire.
 *
 * ## Ce que le nouveau chemin prouve, et comment on le sait
 *
 * Mesuré le 22 août 2026 au soir, **Chrome 151 sur macOS**, `http://localhost` — contexte
 * sécurisé, hors de tout cadre : une sonde de douze octets choisis difficiles (BOM, CRLF,
 * octet nul, `0xFF`, les deux octets d'un `é` en UTF-8) écrite par
 * `showSaveFilePicker` → `createWritable()` → `write()` → `close()`.
 *
 * - après `write()`, le fichier cible pèse **0 octet** ;
 * - après `close()`, il pèse **12 octets** ;
 * - ces douze octets, relus **hors du navigateur** par `xxd` puis `shasum -a 256`, sont
 *   exactement ceux qui ont été écrits.
 *
 * `close()` qui rend la main sans rejeter prouve donc que le navigateur a écrit **ces
 * octets-là** dans le fichier que le pilote a désigné. C'est strictement plus qu'une boîte
 * validée. Ce n'est toujours **rien** sur ce que le fichier devient ensuite.
 *
 * ## Ce qui n'est pas mesuré, et qu'on ne prétend donc pas tenir
 *
 * L'écriture qui **rejette en cours** — disque plein, permission retirée, volume démonté.
 * Décision explicite du propriétaire le 22 août 2026 : on la couvrira le jour où le cas se
 * présente. Le code la traite comme l'absence d'API, sans rien affirmer de particulier, et
 * c'est ce que le dernier contrôle de ce fichier garde.
 */

/**
 * Douze octets qu'un encodage approximatif abîmerait : marque d'ordre d'octets, retour
 * chariot suivi d'un saut de ligne, octet nul, `0xFF` — qui n'est un caractère UTF-8
 * valide dans aucune position —, et les deux octets d'un `é`. Ce sont ceux de la sonde
 * réelle du 22 août : les tests d'ici et la mesure du navigateur portent sur le même
 * contenu.
 */
const HARD_BYTES = new Uint8Array([0xef, 0xbb, 0xbf, 0x7b, 0x0d, 0x0a, 0x00, 0xff, 0xc3, 0xa9, 0x7d, 0x0a])

function digestOf(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

/** Ce qu'une poignée de fichier fait, réduit à ce que ce module en attend. */
interface FakeFile {
  /** Ce que le fichier porte réellement — rempli par `close()`, et par lui seul. */
  written: Uint8Array | undefined
  /** Ce qui a été poussé dans le flux mais n'est pas encore engagé. */
  buffered: Uint8Array | undefined
  closed: boolean
}

function fakeHandle(name: string, file: FakeFile, failOn?: 'createWritable' | 'write' | 'close') {
  return {
    name,
    kind: 'file',
    createWritable: async () => {
      if (failOn === 'createWritable') throw new DOMException('non', 'NotAllowedError')
      return {
        write: async (data: ArrayBuffer) => {
          if (failOn === 'write') throw new DOMException('non', 'NotAllowedError')
          file.buffered = new Uint8Array(data)
        },
        close: async () => {
          if (failOn === 'close') throw new DOMException('non', 'NotAllowedError')
          // C'est ici, et nulle part avant, que la cible reçoit les octets — c'est ce que
          // la mesure du 22 août a établi, et ce faux le reproduit.
          file.written = file.buffered
          file.closed = true
        }
      }
    }
  } as unknown as FileSystemFileHandle
}

/** Le monde extérieur, en morceaux qu'on peut interroger. */
function bench(options: {
  picker?: SaveFilePicker | undefined
  bytes?: Uint8Array
} = {}) {
  const handedOver: Array<{ bytes: Uint8Array; fileName: string }> = []
  const produced = options.bytes ?? HARD_BYTES
  let bytesCalls = 0
  const environment: DeliveryEnvironment = {
    picker: options.picker,
    handOver: (bytes, fileName) => { handedOver.push({ bytes, fileName }) }
  }
  const request = {
    fileName: 'xctrack_2026-08-22-195407_backup.xcfg',
    bytes: async (): Promise<Uint8Array> => { bytesCalls += 1; return produced }
  }
  return {
    environment,
    request,
    handedOver,
    produced,
    calls: () => bytesCalls,
    run: (): Promise<Delivery> => deliverBytes(request, environment)
  }
}

afterEach(() => { vi.restoreAllMocks() })

describe('remettre un fichier — les cinq issues, et une seule qui parle d’écriture', () => {
  it('sans l’API, le chemin classique reprend la main, inchangé', async () => {
    // Firefox, Safari, et TOUS les navigateurs mobiles. C'est le chemin d'une part des
    // pilotes, et il ne doit jamais empirer.
    const t = bench({ picker: undefined })
    const delivery = await t.run()
    expect(delivery).toEqual({
      kind: 'handedOver',
      fileName: 'xctrack_2026-08-22-195407_backup.xcfg',
      byteLength: 12
    })
    expect(t.handedOver).toHaveLength(1)
    expect(t.handedOver[0]?.bytes).toEqual(HARD_BYTES)
  })

  it('l’écriture confirmée se dit, et porte le nom que le fichier a REÇU', async () => {
    // Le pilote peut renommer dans la boîte. Redire le nom proposé plutôt que celui de la
    // poignée ferait chercher un fichier qui n'existe pas.
    const file: FakeFile = { written: undefined, buffered: undefined, closed: false }
    const picker: SaveFilePicker = async () => fakeHandle('renomme-par-le-pilote.xcfg', file)
    const t = bench({ picker })
    const delivery = await t.run()
    expect(delivery).toEqual({
      kind: 'written',
      fileName: 'renomme-par-le-pilote.xcfg',
      byteLength: 12
    })
    expect(file.closed).toBe(true)
    expect(file.written).toEqual(HARD_BYTES)
    // Rien n'est passé par le chemin classique : un fichier écrit ET téléchargé en
    // laisserait deux, et le pilote ne saurait pas lequel est le bon.
    expect(t.handedOver).toHaveLength(0)
  })

  it('sans `close()`, rien n’est écrit — c’est lui qui engage les octets', async () => {
    const file: FakeFile = { written: undefined, buffered: undefined, closed: false }
    const picker: SaveFilePicker = async () => fakeHandle('a.xcfg', file, 'close')
    const t = bench({ picker })
    const delivery = await t.run()
    // Le fichier cible n'a rien reçu : `close()` a rejeté avant d'engager quoi que ce soit.
    expect(file.written).toBeUndefined()
    // Et le pilote n'est pas laissé sans rien.
    expect(delivery.kind).toBe('handedOver')
  })

  it('une boîte refermée est une annulation, et ne fabrique RIEN', async () => {
    // ⚠ Le point le plus important du module : `bytes()` n'est pas appelée. Un pilote qui
    // renonce ne fait ni sérialiser un document, ni recompresser une archive.
    const picker: SaveFilePicker = async () => { throw new DOMException('non', 'AbortError') }
    const t = bench({ picker })
    expect(await t.run()).toEqual({ kind: 'cancelled' })
    expect(t.calls(), 'aucun octet ne doit avoir été fabriqué').toBe(0)
    expect(t.handedOver, 'une annulation ne télécharge rien non plus').toHaveLength(0)
  })

  it('un refus qui n’est PAS du pilote retombe sur le chemin classique', async () => {
    // Activation transitoire perdue, appel bloqué, page hors contexte sécurisé : le pilote
    // n'a rien refusé, et il doit avoir son fichier.
    const picker: SaveFilePicker = async () => { throw new DOMException('non', 'SecurityError') }
    const t = bench({ picker })
    expect((await t.run()).kind).toBe('handedOver')
    expect(t.handedOver).toHaveLength(1)
    expect(t.handedOver[0]?.bytes).toEqual(HARD_BYTES)
  })

  it.each(['createWritable', 'write'] as const)(
    'une écriture qui rejette en « %s » ne laisse pas le pilote sans fichier',
    async (failOn) => {
      // ⚠ Issue NON MESURÉE — décision explicite du propriétaire le 22 août 2026. Le code
      // ne prétend rien de particulier : il retombe sur le chemin classique, dont la phrase
      // est vraie dans tous les cas.
      const file: FakeFile = { written: undefined, buffered: undefined, closed: false }
      const picker: SaveFilePicker = async () => fakeHandle('a.xcfg', file, failOn)
      const t = bench({ picker })
      const delivery = await t.run()
      expect(delivery.kind).toBe('handedOver')
      expect(t.handedOver[0]?.bytes).toEqual(HARD_BYTES)
    }
  )
})

describe('remettre un fichier — l’ordre des gestes', () => {
  it('ouvre la boîte AVANT de fabriquer quoi que ce soit', async () => {
    /*
     * Deux raisons, et les deux comptent :
     *
     * 1. `showSaveFilePicker` exige une **activation transitoire**. Une sérialisation ou
     *    une recompression d'archive glissée avant l'appel la mangerait, et l'API lèverait
     *    `SecurityError` — le pilote retomberait silencieusement sur le chemin classique
     *    sans jamais voir la boîte.
     * 2. Un pilote qui renonce n'a fait travailler personne.
     */
    const order: string[] = []
    const file: FakeFile = { written: undefined, buffered: undefined, closed: false }
    const picker: SaveFilePicker = async () => { order.push('boîte'); return fakeHandle('a.xcfg', file) }
    await deliverBytes(
      { fileName: 'a.xcfg', bytes: async () => { order.push('octets'); return HARD_BYTES } },
      { picker, handOver: () => { order.push('repli') } }
    )
    expect(order).toEqual(['boîte', 'octets'])
  })

  it('propose à la boîte le nom que l’appelant a calculé', async () => {
    const file: FakeFile = { written: undefined, buffered: undefined, closed: false }
    const seen: Array<string | undefined> = []
    const picker: SaveFilePicker = async (options) => {
      seen.push(options?.suggestedName)
      return fakeHandle('a.xcfg', file)
    }
    const t = bench({ picker })
    await t.run()
    expect(seen).toEqual(['xctrack_2026-08-22-195407_backup.xcfg'])
  })
})

/**
 * ⚠️ **La fidélité à l'octet près est la promesse centrale du projet.** Ce qui sort par le
 * nouveau chemin doit être **exactement** ce qui sortait par l'ancien — pas « du même
 * contenu », les mêmes octets, la même empreinte.
 */
describe('remettre un fichier — la fidélité à l’octet près', () => {
  it('les deux chemins rendent les mêmes octets, et la même empreinte SHA-256', async () => {
    const file: FakeFile = { written: undefined, buffered: undefined, closed: false }
    const picker: SaveFilePicker = async () => fakeHandle('a.xcfg', file)

    const byPicker = bench({ picker })
    expect((await byPicker.run()).kind).toBe('written')
    const classic = bench({ picker: undefined })
    expect((await classic.run()).kind).toBe('handedOver')

    const written = file.written
    const handed = classic.handedOver[0]?.bytes
    expect(written).toBeDefined()
    expect(handed).toBeDefined()
    expect([...written ?? []]).toEqual([...HARD_BYTES])
    expect(digestOf(written as Uint8Array)).toBe(digestOf(HARD_BYTES))
    expect(digestOf(handed as Uint8Array)).toBe(digestOf(HARD_BYTES))
    expect(digestOf(written as Uint8Array)).toBe(digestOf(handed as Uint8Array))
  })

  it('la copie de tampon du chemin classique ne change pas un octet non plus', async () => {
    // `handOverToBrowser` recopie les octets dans un `ArrayBuffer` qui n'appartient qu'à
    // eux — `Blob` n'accepte pas une vue dont le tampon pourrait être partagé. On relit le
    // `Blob` remis au navigateur pour vérifier que la copie n'a rien touché.
    const blobs: Blob[] = []
    vi.spyOn(URL, 'createObjectURL').mockImplementation((source: Blob | MediaSource) => {
      blobs.push(source as Blob)
      return 'blob:essai'
    })
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

    handOverToBrowser(HARD_BYTES, 'xctrack_2026-08-22-195407_backup.xcfg')
    expect(blobs).toHaveLength(1)
    const relu = new Uint8Array(await (blobs[0] as Blob).arrayBuffer())
    expect([...relu]).toEqual([...HARD_BYTES])
    expect(digestOf(relu)).toBe(digestOf(HARD_BYTES))
  })

  it('n’altère pas la vue qu’on lui a confiée', async () => {
    // Le conteneur garde ses octets d'origine pour les réémettre : les toucher casserait
    // la réémission suivante.
    const source = HARD_BYTES.slice()
    const file: FakeFile = { written: undefined, buffered: undefined, closed: false }
    await deliverBytes(
      { fileName: 'a.xcfg', bytes: async () => source },
      { picker: async () => fakeHandle('a.xcfg', file), handOver: () => undefined }
    )
    expect([...source]).toEqual([...HARD_BYTES])
  })
})

/**
 * ⚠️ **Le nom proposé ne reprend jamais le nom d'origine**, et le nouveau chemin ne doit
 * pas rouvrir cette porte : `showSaveFilePicker` **affiche** le nom proposé au pilote,
 * dans une boîte du système, souvent devant témoin. `2022-02-08_marie_ok.xcfg` existe dans
 * le corpus ; un outil qui promet d'anonymiser un fichier et en recopie le nom n'a rien
 * anonymisé.
 */
describe('le nom proposé à la boîte du système', () => {
  const when = new Date(Date.UTC(2026, 7, 22, 19, 54, 7))

  it('est horodaté et ne reprend rien du prénom qui était dans le nom d’origine', async () => {
    const proposed = buildExportFileName({
      originalFileName: '2022-02-08_marie_ok.xcfg',
      when,
      exportType: 'backup'
    })
    expect(proposed.toLowerCase()).not.toContain('marie')
    expect(proposed).not.toContain('2022-02-08')
    expect(proposed).toContain('2026-08-22')

    const file: FakeFile = { written: undefined, buffered: undefined, closed: false }
    const seen: Array<string | undefined> = []
    await deliverBytes(
      { fileName: proposed, bytes: async () => HARD_BYTES },
      {
        picker: async (options) => { seen.push(options?.suggestedName); return fakeHandle(proposed, file) },
        handOver: () => undefined
      }
    )
    // Le module passe ce nom-là et n'en fabrique aucun autre : rien ne peut réintroduire
    // le nom d'origine entre le calcul et la boîte.
    expect(seen).toEqual([proposed])
  })

  it('vaut pour les deux issues anonymisantes comme pour l’ordinaire', () => {
    for (const anonymized of [true, false]) {
      const proposed = buildExportFileName({
        originalFileName: '2022-02-08_marie_ok.xcfg',
        when,
        exportType: 'pages',
        anonymized
      })
      expect(proposed.toLowerCase(), `anonymisé=${String(anonymized)}`).not.toContain('marie')
    }
  })
})
