import type { JsonNode } from '../../core/jsonDocument'
import { decode, getMember, readBoolean, readString } from '../../core/access'

/**
 * Lecture normalisée de la clé `rotation`, dont la forme change selon le type de widget
 * — le piège déjà payé sur ce projet (voir la consigne de la tâche 19). Relevé sur le
 * corpus (`Exemples/*.xcfg`) :
 * - `WCompMap`, `WXCAssistant`, `WThermalAssistant` : un objet
 *   `{ "value": "NORTH_AT_TOP" | "TRAVEL_DIRECTION_AT_TOP", "showCompass": bool }`.
 * - `WCompass` (hors périmètre de cette tâche, mais cette lecture doit déjà l'accepter
 *   pour la tâche suivante) : une chaîne nue, ex. `"NORTH_AT_TOP"`.
 *
 * La chaîne nue n'a pas de `showCompass` propre — `WCompass` EST la boussole, la
 * question ne se pose pas pour lui. On normalise donc à `false` dans ce cas, plutôt que
 * de laisser `showCompass` optionnel : un objet uniforme est plus simple à consommer
 * pour tout appelant, ici et dans la tâche suivante.
 */
export interface Rotation {
  value: string
  showCompass: boolean
}

const DEFAULT_ROTATION: Rotation = { value: 'NORTH_AT_TOP', showCompass: false }

export function readRotation(node: JsonNode): Rotation {
  const member = getMember(node, 'rotation')
  if (member === undefined) return DEFAULT_ROTATION

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
