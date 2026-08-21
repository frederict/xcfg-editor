import type { UiLanguage } from './languages'

/**
 * # Le pluriel, une fois pour les cinq langues
 *
 * Le dépôt portait **huit copies** de cette fonction, redéfinies à l'identique dans
 * `views.ts`, `warnings.ts`, `pageManager.ts`, `widgetList.ts`, `libraryPanel.ts`,
 * `sharingDialog.ts`, `preferencesPage.ts` et `versionDiagnostic.ts` :
 *
 * ```ts
 * function plural(count: number, singular: string, pluralForm: string): string {
 *   return `${count} ${count > 1 ? pluralForm : singular}`
 * }
 * ```
 *
 * `count > 1` est **la règle française et elle seule**. Le français met zéro au
 * singulier — « 0 réglage » — ; l'anglais, le néerlandais, l'allemand et l'espagnol le
 * mettent au pluriel — « 0 settings », « 0 instellingen », « 0 Einstellungen »,
 * « 0 ajustes ». Traduire sans toucher à cette fonction produirait « 0 setting » partout,
 * dans les quatre langues.
 *
 * Mesuré ici (Node 22, ICU complet) :
 *
 * | | 0 | 1 | 2 | 1 000 000 |
 * |---|---|---|---|---|
 * | `fr` | `one` | `one` | `other` | `many` |
 * | `en` `nl` `de` | `other` | `one` | `other` | `other` |
 * | `es` | `other` | `one` | `other` | `many` |
 *
 * ## Pourquoi `many` existe et pourquoi il n'a pas de forme à lui
 *
 * Le français et l'espagnol classent le million en `many` (CLDR 42+, pour les écritures
 * compactes du type « 1,2 million »). Aucune de nos deux formes ne change pour autant :
 * « 1 000 000 réglages » s'écrit comme « 2 réglages ». `pluralForm` replie donc les
 * catégories non fournies sur `other`, ce qui est **juste** dans les cinq langues et
 * laisse la porte ouverte à une sixième qui, elle, en aurait besoin.
 *
 * Les cinq langues visées ont toutes exactement deux formes utiles. C'est la bonne
 * nouvelle du lot : aucune n'exige le duel ni les cinq formes slaves.
 */

/**
 * Les formes d'un message qui porte un nombre. `one` et `other` sont obligatoires — les
 * cinq langues les emploient toutes. Les quatre autres catégories CLDR sont ouvertes
 * pour une langue future, jamais requises.
 *
 * **C'est aussi la construction qui remplace les 23 accords écrits en ternaire** :
 *
 * ```ts
 * // avant — intraduisible : l'allemand accorde selon le cas et le genre,
 * // et l'article se contracte
 * `${n} absente${n > 1 ? 's' : ''} du fichier`
 *
 * // après — deux phrases complètes, que le traducteur peut réécrire entièrement
 * { one: '{count} ligne est absente du fichier',
 *   other: '{count} lignes sont absentes du fichier' }
 * ```
 *
 * Chaque forme est une **phrase entière**, jamais un fragment auquel on colle un `s` :
 * c'est la seule façon pour un traducteur de déplacer le verbe, de contracter un article
 * ou de changer l'ordre des mots.
 */
export interface PluralForms {
  one: string
  other: string
  zero?: string
  two?: string
  few?: string
  many?: string
}

/** Les instances `Intl.PluralRules` sont chères à construire ; il en faut cinq en tout. */
const rules = new Map<UiLanguage, Intl.PluralRules>()

function rulesFor(language: UiLanguage): Intl.PluralRules {
  const known = rules.get(language)
  if (known !== undefined) return known
  const made = new Intl.PluralRules(language)
  rules.set(language, made)
  return made
}

/**
 * La catégorie CLDR d'un nombre dans une langue. Exposée pour les tests et pour un
 * appelant qui voudrait vérifier ce que sa langue attend ; le code d'affichage passe par
 * `pluralForm`.
 */
export function pluralCategory(count: number, language: UiLanguage): Intl.LDMLPluralRule {
  return rulesFor(language).select(count)
}

/**
 * La forme à employer pour ce nombre dans cette langue. Une catégorie que le message ne
 * fournit pas retombe sur `other` — voir l'en-tête pour `many`.
 */
export function pluralForm(forms: PluralForms, count: number, language: UiLanguage): string {
  return forms[pluralCategory(count, language)] ?? forms.other
}
