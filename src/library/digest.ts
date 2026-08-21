/**
 * L'empreinte SHA-256, et pourquoi elle est le pivot de ce dossier.
 *
 * La promesse du projet est qu'un fichier ouvert puis réexporté sans modification ressort
 * avec **la même empreinte**. Une bibliothèque qui range ce fichier s'insère au milieu de
 * ce cycle : ranger puis ressortir doit être aussi neutre qu'ouvrir puis exporter.
 *
 * L'empreinte est donc calculée **sur les octets rangés, au moment où on les range**, et
 * recalculée **à la relecture**. Ce n'est pas une décoration : c'est ce qui transforme
 * « les octets sont probablement intacts » en une vérification. Un enregistrement dont les
 * octets ont été tronqués par une écriture interrompue est alors détecté à la lecture,
 * plutôt que rendu au pilote comme s'il était sa configuration.
 *
 * `crypto.subtle` est disponible partout où IndexedDB l'est, et sous Vitest/happy-dom
 * (vérifié : `SHA-256` de « abc » vaut bien `ba7816bf…`). Aucune dépendance ajoutée.
 */

const HEX = Array.from({ length: 256 }, (_, index) => index.toString(16).padStart(2, '0'))

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  // `as BufferSource` : depuis que `Uint8Array` est générique dans lib.dom, un
  // `Uint8Array` nu n'est plus assignable à `BufferSource`. Même contournement que
  // `src/core/zip.ts` — le code s'exécute sans, TypeScript le refuse.
  const digest = await crypto.subtle.digest('SHA-256', bytes as BufferSource)
  let out = ''
  for (const byte of new Uint8Array(digest)) out += HEX[byte]
  return out
}

/**
 * Égalité stricte de deux empreintes. Existe pour nommer l'intention : **aucune
 * normalisation** — ni casse, ni espaces rognés. Une comparaison tolérante accepterait un
 * jour une empreinte réécrite à la main et rendrait le contrôle décoratif.
 *
 * Il ne s'agit pas de sécurité : il n'y a pas d'attaquant dans une bibliothèque locale,
 * et cette comparaison n'est pas à temps constant.
 */
export function sameDigest(a: string, b: string): boolean {
  return a === b
}
