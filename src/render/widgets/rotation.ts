import type { JsonNode } from '../../core/jsonDocument'
import { decode, getMember, readBoolean, readString } from '../../core/access'

/**
 * Lecture normalisée de la clé `rotation` **des trois cartes** — `WCompMap`,
 * `WXCAssistant`, `WThermalAssistant`. Elles portent un objet
 * `{ "value": "NORTH_AT_TOP" | "TRAVEL_DIRECTION_AT_TOP", "showCompass": bool }`
 * (relevé sur le corpus, `Exemples/*.xcfg`).
 *
 * ## `WCompass` ne passe PAS par ici, et ce module l'affirmait à tort
 *
 * Ce commentaire donnait `"NORTH_AT_TOP"` en exemple de la chaîne nue de `WCompass`.
 * **C'est faux** : `NORTH_AT_TOP` appartient à la forme OBJET ci-dessus et à elle seule.
 * Les deux clés portent le même nom et deux vocabulaires disjoints — le catalogue extrait
 * de l'APK (`src/catalog/widgetOptions/base.json`) donne pour `rotation@WCompass`
 * `NORTH`, `HEADING`, `BEARING`, `TRAVEL_DIRECTION`, et pour `rotation@MapWidget` une
 * composite `{value, showCompass}`. Aucune valeur n'est commune aux deux listes.
 *
 * La confusion coûtait un dessin faux : `readRotation` retombant sur `NORTH_AT_TOP`, une
 * boussole sans clé `rotation` gardait le nord en haut alors que son défaut d'usine est
 * `HEADING` — voir `compass.ts`, qui lit désormais la clé par `widgetString`, c'est-à-dire
 * avec le défaut du relevé des 75 gadgets.
 *
 * `showCompass` n'existe que dans la forme objet : une carte peut afficher ou non une
 * rose des vents de coin, la question ne se pose pas pour la boussole elle-même.
 */
export interface Rotation {
  value: string
  showCompass: boolean
}

const DEFAULT_ROTATION: Rotation = { value: 'NORTH_AT_TOP', showCompass: false }

export function readRotation(node: JsonNode): Rotation {
  const member = getMember(node, 'rotation')
  if (member === undefined) return DEFAULT_ROTATION

  // Une chaîne nue là où le corpus donne un objet : aucune carte connue n'en porte, mais
  // le format change à chaque version. On rend la valeur telle quelle plutôt que de
  // l'ignorer, sans `showCompass` — il n'y en a pas à lire.
  if (member.kind === 'string') {
    return { value: decode(member.raw), showCompass: false }
  }

  if (member.kind === 'object') {
    return {
      value: readString(member, 'value') ?? DEFAULT_ROTATION.value,
      showCompass: readBoolean(member, 'showCompass') ?? false
    }
  }

  return DEFAULT_ROTATION
}
