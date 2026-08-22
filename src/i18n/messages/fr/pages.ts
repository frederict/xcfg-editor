/** `pageManager.ts`, `deviceSelector.ts` — les pages, et le gabarit qui les dessine. */
const pages = {
  /**
   * Trois repères nommés dans une phrase : c'est ce qui permet au traducteur de déplacer
   * les mots. L'allemand renvoie son verbe à la fin, le néerlandais aussi.
   *
   * ⚠️ **Cette phrase est fausse, et aucun écran ne l'emploie.** Elle traduisait le compte
   * « au sol, l'appareil n'en montre que 3 sur 5 » que la vue d'ensemble tirait de la
   * CLASSE des pages ; mesuré sur un AIR³ le 22 août 2026, ce critère est faux — voir
   * `PAGE_KINDS` dans `src/ui/views.ts` et
   * `docs/reference/2026-08-22-essai-pilote.md` § 2. Elle n'est gardée que parce que
   * `tests/i18n/translate.test.ts` s'en sert d'exemple canonique de phrase à trois
   * repères, dans les cinq langues. **Ne la rebranchez sur aucun écran** : à retirer, ou
   * à réécrire sur la clé `navigations`, le jour où le test aura un autre exemple.
   */
  'pages.hiddenOffFlight': {
    one: '{count} page est masquée hors contexte de vol : au sol, l’appareil n’en montre que {shown} sur {total}.',
    other: '{count} pages sont masquées hors contexte de vol : au sol, l’appareil n’en montre que {shown} sur {total}.'
  },

  /** Les chiffres changent de langue, le reste non : « 48,3 × 27,2 mm » ou « 48.3 × 27.2 mm ». */
  'device.screenSize': '{width} × {height}'
} as const

export default pages

export type FrenchPages = typeof pages
