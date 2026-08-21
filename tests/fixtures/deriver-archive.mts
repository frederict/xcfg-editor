/**
 * Reconstruit l'archive `tests/fixtures/exports/2026-08-20_backupwithmedia-00.xczfg`
 * depuis l'archive réelle du propriétaire — script à **usage unique et local**, pendant
 * de `deriver-exemples.py` pour le conteneur ZIP.
 *
 *     node --experimental-strip-types tests/fixtures/deriver-archive.mts <archive réelle>
 *
 * L'archive réelle n'enferme qu'un fichier, `backup.xcfg`. On la relit avec `readZip`,
 * on remplace ce contenu par la version anonymisée déjà produite dans `exports/`, et on
 * la réécrit avec `writeZip` — **le code du produit, pas une réimplémentation**. C'est ce
 * qui garantit la propriété que `tests/core/zip.test.ts` éprouve ensuite : l'archive
 * fixture se relit et se réécrit à l'octet près, parce qu'elle a été écrite par le même
 * sérialiseur que celui qui la réécrira.
 *
 * L'horodatage DOS de l'entrée est repris tel quel : c'est lui que le test compare, et
 * l'inventer ferait passer un test qui ne prouverait plus la restitution.
 *
 * `src/core/zip.ts` n'importe rien : c'est ce qui permet à Node de le charger directement
 * par simple effacement des types, sans passer par un bundler.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { readZip, writeZip } from '../../src/core/zip.ts'

const ici = fileURLToPath(new URL('.', import.meta.url))
// L'archive réelle est passée en argument, jamais écrite ici : ce dépôt est public, et
// le chemin d'un poste n'a rien à y faire.
const SOURCE = process.argv[2]
if (SOURCE === undefined) {
  throw new Error('usage : deriver-archive.mts <archive .xczfg réelle>')
}
const CIBLE = ici + 'exports/2026-08-20_backupwithmedia-00.xczfg'

const entries = await readZip(new Uint8Array(readFileSync(SOURCE)))
if (entries.length !== 1 || entries[0]!.name !== 'backup.xcfg') {
  throw new Error(`archive inattendue : ${entries.map((e) => e.name).join(', ')}`)
}

entries[0]!.data = new Uint8Array(readFileSync(ici + 'exports/backup.xcfg'))

const archive = await writeZip(entries)
writeFileSync(CIBLE, archive)

// Contrôle immédiat : ce que le test vérifiera, vérifié ici avant de livrer le fichier.
const relu = await readZip(new Uint8Array(readFileSync(CIBLE)))
const reecrit = await writeZip(relu)
if (!Buffer.from(reecrit).equals(Buffer.from(archive))) {
  throw new Error('l’archive produite ne se réécrit pas à l’octet près')
}
console.log(`archive : ${archive.byteLength} octets, backup.xcfg : ${relu[0]!.data.byteLength} octets`)
