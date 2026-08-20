/**
 * Nom du fichier exporté. Ce module minuscule existe séparément de `main.ts` parce que
 * `main.ts` n'est pas testé : une fonction qui décide du nom d'un fichier destiné à une
 * carte SD n'a rien à faire dans une zone non testée.
 *
 * Le nom **diffère toujours** de l'original — c'est la seule règle qui compte. La veille
 * d'une manche, deux fichiers homonymes sur une carte SD sont une erreur d'import qui se
 * découvre en vol.
 */

/** Extension conservée telle quelle : `.xcfg` comme `.xczfg`. */
function splitExtension(fileName: string): { base: string; extension: string } {
  const dot = fileName.lastIndexOf('.')
  // Un point en tête n'est pas une extension mais un fichier caché.
  if (dot <= 0) return { base: fileName, extension: '' }
  return { base: fileName.slice(0, dot), extension: fileName.slice(dot) }
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** Horodatage local, à la minute : `2026-08-20-1432`. */
function stamp(when: Date): string {
  return `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}-` +
    `${pad(when.getHours())}${pad(when.getMinutes())}`
}

export function exportFileName(original: string, when: Date): string {
  const { base, extension } = splitExtension(original)
  const stem = base.length > 0 ? base : 'configuration'
  const name = `${stem}-modifie-${stamp(when)}${extension}`

  // Garde-fou : le suffixe rend déjà toute collision impossible, mais la promesse « le
  // nom diffère toujours de l'original » ne doit dépendre d'aucun raisonnement.
  if (name === original) return `${stem}-modifie-${stamp(when)}-${pad(when.getSeconds())}${extension}`
  return name
}
