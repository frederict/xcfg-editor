/** Un document JSON dont chaque littéral conserve son texte source. */
export type JsonNode =
  | { kind: 'object'; entries: Array<[key: string, value: JsonNode]> }
  | { kind: 'array'; items: JsonNode[] }
  | { kind: 'string'; raw: string }
  | { kind: 'literal'; raw: string }

/**
 * Les clés d'objet et les chaînes sont stockées avec leurs guillemets et leurs
 * échappements d'origine. Les nombres, booléens et null sont des `literal` dont
 * `raw` porte le texte exact écrit par XCTrack — c'est ce qui distingue `3.0` de `3`.
 */
