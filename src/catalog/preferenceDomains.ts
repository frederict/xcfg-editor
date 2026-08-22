/**
 * Les **domaines de valeurs** que les écrans de réglages ne portent pas.
 *
 * `preferenceCatalog.ts` tire les valeurs permises de l'écran XML (`entryValues`) ou
 * d'une énumération du bytecode. Deux familles y échappent, et l'éditeur les laisse
 * alors en saisie libre — où le pilote peut écrire ce que XCTrack refusera :
 *
 * - les huit `Unit.*`, dont XCTrack remplit la liste **en code** au moment de
 *   l'afficher ;
 * - les quinze `Keys.*`, qui portent un **code de touche Android** nu.
 *
 * Produit par `tools/build-preference-domains.py`. Voir son en-tête pour la méthode.
 *
 * ## Trois natures de savoir, et elles ne se mélangent pas
 *
 * - **extrait de l'APK** : le vocabulaire des unités, la table des codes de touche ;
 * - **observé** dans des `.xcfg` réels : ce qu'un fichier porte pour chaque réglage ;
 * - **relevé à la main sur l'appareil** : le domaine des huit `Unit.*`, le sens du bit
 *   d'appui long, les touches physiques du boîtier. Ce dernier ne se régénère pas et
 *   ne vaut que pour l'appareil et la version où il a été fait.
 *
 * ## `Unit.*` : un vocabulaire **et**, désormais, un domaine relevé
 *
 * L'alphabet des codes d'unité est lu dans l'énumération du bytecode — `m`, `km/h`,
 * `FL`, `100ft/min`… dix-huit codes, exactement les chaînes qu'un fichier écrit.
 *
 * Quel sous-ensemble chaque réglage accepte ne se lit nulle part : aucun des
 * cinquante-cinq relevés ne le dit, dans aucune langue. Ce domaine a donc été **relevé
 * à l'écran natif**, liste par liste, chaque choix vérifié par un export. C'est ce que
 * `unitDomain()` rend maintenant — et non plus `null`.
 *
 * ⚠️ **Ce que le fichier porte n'est pas ce que l'écran affiche.** L'appareil affiche
 * « m, km » et écrit `"m,km"` : `value` va dans le fichier, `label` à l'écran, et les
 * confondre produirait une valeur que XCTrack refuse.
 *
 * ⚠️ Le relevé vient d'**un seul modèle et d'une seule version**. `domainSource` le dit,
 * et une interface qui ferme la liste sur ces valeurs doit garder la porte ouverte à
 * une valeur du fichier qui n'y serait pas.
 *
 * ## `Keys.*` : une table publique, un bit mesuré, et un boîtier
 *
 * La table `KEYCODE_*` d'Android est publique et stable ; elle est lue dans
 * l'`android.jar` du SDK installé, à un niveau d'API que le fichier consigne. Un code
 * que cette API ne connaît pas rend `null` — jamais un nom inventé.
 *
 * Le bit `0x01000000` vaut **appui long**. Ce fut longtemps une déduction ; l'écran
 * natif de XCTrack la confirme désormais en toutes lettres — la ligne portant
 * `16777240` (= 24 | 0x1000000) y affiche « Appui long : Augmenter le volume ».
 * `LONG_PRESS_BIT_BASIS` vaut donc `'measured'`, et `decodeKeyBinding()` rend
 * `longPress`, non plus `modified`.
 *
 * ## Un code de touche n'est pas une touche — et il y a **trois** crans, pas deux
 *
 * `Keys.PrevWaypoint = 266` est une ligne valide ; encore faut-il que le boîtier porte
 * une touche qui émette 266. Ce que nous en savons se range sur trois crans, et les
 * confondre est la faute que ce module existe pour éviter :
 *
 * 1. **Touche pressée à la main, code lu à l'arrivée** — `hardwareKeys[].keys`,
 *    `basis: 'measured'`. Le seul cran qui prouve qu'un bouton existe. Trois touches
 *    sur l'AIR³ 7.2 ;
 * 2. **Code déclaré par le noyau du boîtier** — `hardwareKeys[].kernelDeclaration`,
 *    relevé par `getevent -pl` et le fichier de disposition qu'Android applique
 *    réellement à chaque périphérique. Il prouve que le code est **possible sur ce
 *    matériel** ; il ne prouve pas qu'un bouton l'émette, un contrôleur de clavier
 *    déclarant souvent plus de codes que le boîtier n'a de boutons ;
 * 3. **Rien** — le code n'est déclaré nulle part sur ce modèle.
 *
 * `keyCodeEvidence()` répond lequel des trois s'applique, et une interface qui parle
 * du matériel **doit** passer par lui : un code déclaré et jamais pressé ne se dit pas
 * comme un code inconnu du matériel. Le 2026-08-22, l'écran disait des deux « aucune
 * touche mesurée n'émet le code X » — et le disait de 27, que `sn7326-key` déclare.
 *
 * ⚠️ **Ces relevés ne valent que pour ce modèle-là**, et le parc n'est pas homogène :
 * les AIR³ plus récents portent davantage de touches, et un réglage sans effet sur l'un
 * peut être parfaitement vivant sur l'autre. Une interface ne doit donc **jamais**
 * écrire « cette touche n'existe pas » ni « ce réglage est inerte » ; au plus, que le
 * code n'a été pressé sur aucune touche **du modèle où le relevé a été fait**. Le
 * `.xcfg` déclarant son appareil, `hardwareKeysFor()` conditionne le propos au modèle
 * et rend `null` dès qu'il ne le reconnaît pas.
 *
 * ## Le nom d'une touche n'est pas une mesure
 *
 * Ce module dit **quels codes** un boîtier émet ; il ne dit pas comment ils s'appellent.
 * Jusqu'au 2026-08-22 il portait trois noms français — « volume haut », « volume bas »,
 * « marche/arrêt » — qu'un `basis: 'measured'` faisait passer pour des données relevées.
 * Ils n'en étaient pas : ce qui a été mesuré, c'est qu'une touche pressée émet le code
 * 24, et ces trois mots étaient notre façon de le dire. Ils sont partis, et le nom d'une
 * touche se lit désormais dans `hardwareKeyLabels.ts` — les ressources de XCTrack, en 32
 * langues, celles que le pilote voit sur l'écran natif de réglage des touches.
 *
 * ## Ce qu'aucun des deux crans n'explique
 *
 * `unexplainedCodes` range les codes du corpus que ni l'appui ni le noyau ne rendent
 * possibles — 266 en est un, et c'est celui que le pilote presse le plus en
 * compétition. Chacun porte une **hypothèse**, jamais une explication : `hypothesis`
 * la nomme, `evidence` dit ce qui la rend plausible et ce qui manquerait pour la
 * vérifier. Un texte qui la présenterait autrement que comme une hypothèse ferait
 * perdre au projet ce qui le distingue.
 */

/**
 * Une option d'une liste d'unités, telle qu'elle a été relevée sur l'appareil.
 *
 * ⚠️ `value` et `label` diffèrent bel et bien : l'écran affiche « m, km », le fichier
 * porte `"m,km"`. C'est `value` qui s'écrit.
 */
export interface UnitChoice {
  /** Ce que le fichier porte. */
  value: string
  /** Ce que l'écran de l'appareil affiche. */
  label: string
}

/** D'où vient le domaine des huit `Unit.*` — un relevé fait à la main, pas une lecture. */
export interface UnitDomainSource {
  basis: 'measured'
  /** `info.device` de l'appareil du relevé. */
  device: string
  deviceLabel: string
  versionName: string
  /** Comment le relevé a été fait, en une phrase. */
  method: string
  /** Ce que le relevé ne dit pas, et qu'aucun texte ne doit gommer. */
  caveats: string[]
}

/** Ce que le bytecode livre sur les unités, et ce que les fichiers réels en montrent. */
export interface UnitDomains {
  /** L'alphabet des codes d'unité, dans l'ordre des ordinaux de l'énumération. */
  vocabulary: string[]
  vocabularySource: {
    /** Nom obfusqué de l'énumération — il change à chaque compilation. */
    enum: string
    versionName: string
    versionCode: number
    /** Les autres versions qui portent le même vocabulaire. */
    alsoIn: string[]
    /** Les vocabulaires différents relevés ailleurs, s'il y en a. */
    otherVocabularies: Array<{ codes: string[], versionNames: string[] }>
    /** Relevés où l'énumération n'a pas été retrouvée. Leur silence ne dit rien. */
    surveysWithout: number
  }
  /** D'où vient le domaine ci-dessous. Il voyage avec les valeurs qu'il justifie. */
  domainSource: UnitDomainSource
  keys: Record<string, {
    /** Ce que des fichiers réels portent. Un seul appareil : c'est peu. */
    observed: string[]
    /** La liste que l'écran natif propose, dans son ordre. Relevée, pas lue. */
    domain: UnitChoice[]
  }>
}

/**
 * Une touche physique d'un boîtier, appuyée et son code lu à l'arrivée.
 *
 * ⚠️ **Pas de nom ici, et c'est le sujet du 2026-08-22.** Ce relevé a porté jusque-là un
 * `label` français — « volume haut », « marche/arrêt » — tenu pour une donnée de mesure.
 * Il n'en était pas une : ce qui a été mesuré, c'est qu'une touche pressée émet le code
 * 24 ; « volume haut » était **notre** façon de le dire, et rien n'a été mesuré en
 * français. Le nom de la touche est celui que XCTrack lui donne, il vient de l'APK et
 * suit l'axe `labels` — voir `hardwareKeyLabels.ts`.
 */
export interface HardwareKey {
  code: number
  /** Le nom Android du code, ajouté par l'outil depuis la table lue. */
  name: string
}

/**
 * Ce qu'un périphérique d'entrée **est**, en un mot d'identifiant : le clavier du
 * boîtier, le contrôleur de clavier, la dalle tactile, la prise casque.
 *
 * ⚠️ **C'est une clé, pas un texte.** Ce champ a porté une phrase française jusqu'au
 * 2026-08-22 — « la prise casque » —, qui s'affichait telle quelle dans les cinq langues.
 * Ce n'est pas une mesure : le noyau déclare `ACCDET`, pas « la prise casque ». La mesure
 * est le nom du périphérique et les codes qu'il déclare ; le reste est notre glose, elle
 * passe par le catalogue et suit l'axe `ui`.
 */
export type InputDeviceKind = 'keypad' | 'keyboardController' | 'touchPanel' | 'headsetJack'

/**
 * Un périphérique d'entrée déclaré par le noyau, et les codes Android qu'il peut
 * produire une fois sa disposition appliquée.
 *
 * ⚠️ **Peut produire**, jamais **produit**. Le contrôleur `sn7326-key` de l'AIR³ 7.2
 * déclare huit codes Linux quand le boîtier n'a que trois boutons sous le doigt.
 */
export interface DeclaredInputDevice {
  /** Le nom que le noyau lui donne : « sn7326-key », « mtk-kpd ». */
  name: string
  /** Ce qu'il est, en une clé — l'écran en dit le mot dans la langue du pilote. */
  whatKey: InputDeviceKind
  /** Le fichier de disposition qu'Android lui applique, lu dans `dumpsys input`. */
  keyLayoutFile: string
  /**
   * Vrai quand le fichier propre au périphérique **n'existe pas** et que `Generic.kl`
   * supplée. C'est le cas de `sn7326-key`, et ce détail compte : sans lui, personne ne
   * peut refaire la traduction 212 → 27.
   */
  keyLayoutIsFallback: boolean
  /** Les codes **Linux** déclarés, tels que `getevent -pl` les nomme. */
  linuxCodes: number[]
  /** Les codes **Android** correspondants, une fois la disposition appliquée. */
  codes: number[]
  /** Les codes Linux déclarés qu'aucune ligne de la disposition ne traduit. */
  unmappedLinuxCodes: number[]
  /** Les mêmes codes Android, nommés par la table. */
  keys: Array<{ code: number, name: string }>
}

/**
 * Ce que le **noyau** d'un boîtier déclare : le deuxième cran, entre l'appui sous le
 * doigt et le silence complet.
 *
 * ⚠️ Il prouve qu'un code est **possible** sur ce matériel. Il ne prouve pas qu'un
 * bouton l'émette — seul un appui le ferait.
 */
export interface KernelKeyDeclaration {
  basis: 'kernelDeclared'
  /** `info.device` de l'appareil du relevé. */
  device: string
  /** Quand le relevé a été fait, `AAAA-MM-JJ`. Un noyau change avec une mise à jour. */
  surveyedOn: string
  /** Comment il a été fait, en une phrase — pour qu'on puisse le refaire. */
  method: string
  /** Ce que le relevé ne dit pas, et qu'aucun texte ne doit gommer. */
  caveats: string[]
  devices: DeclaredInputDevice[]
}

/**
 * Les touches physiques d'**un modèle** d'appareil, et ce que son noyau déclare.
 *
 * ⚠️ Rien ici ne vaut pour un autre modèle. Voir l'en-tête : le parc n'est pas homogène.
 */
export interface HardwareKeySurvey {
  /** L'identifiant de modèle, tel que `catalog/devices.ts` le nomme. */
  deviceId: string
  /** `info.device` de l'appareil du relevé. */
  device: string
  label: string
  basis: 'measured'
  /** Le premier cran : pressées à la main, code lu à l'arrivée. */
  keys: HardwareKey[]
  caveats: string[]
  /**
   * Le deuxième cran, s'il a été relevé. Absent n'est pas « le noyau ne déclare
   * rien » : c'est « nous n'avons pas lu ce noyau ».
   */
  kernelDeclaration?: KernelKeyDeclaration
}

/**
 * Un code que le corpus porte et que **ni** l'appui **ni** le noyau n'expliquent.
 *
 * ⚠️ `hypothesis` est une hypothèse. Elle se dit comme telle partout, et jamais comme
 * une explication.
 */
export interface UnexplainedKeyCode {
  code: number
  /** Le nom Android du code, ajouté par l'outil. */
  name: string
  /** La piste, nommée : `'injectedByApp'` — une application injecte l'événement. */
  hypothesis: 'injectedByApp'
  /** Le paquet Android soupçonné, quand il y en a un. Soupçonné, pas convaincu. */
  suspectPackage?: string
  /** Le modèle où le code a été rencontré sans explication. */
  deviceId: string
  surveyedOn: string
  /** Ce qui rend l'hypothèse plausible, et ce qui manquerait pour la vérifier. */
  evidence: string[]
}

/** Lequel des trois crans s'applique à un code, sur le modèle d'un relevé. */
export type KeyCodeEvidence =
  /** Une touche a été pressée, et elle émet ce code. Le seul cran qui prouve. */
  | 'pressed'
  /** Le noyau du boîtier déclare ce code. Possible sur ce matériel, non prouvé. */
  | 'declared'
  /** Ni l'un ni l'autre. Ce n'est pas « la touche n'existe pas » : c'est « on ne sait pas ». */
  | 'unattested'

/**
 * Lequel des trois crans s'applique à ce code-là, sur ce relevé-là.
 *
 * ⚠️ `'unattested'` ne dit **pas** qu'une touche n'existe pas. Il dit que ni l'appui ni
 * le noyau de ce modèle-ci ne l'attestent — sur un AIR³ plus récent, le même code peut
 * commander un vrai bouton.
 */
export function keyCodeEvidence(
  survey: HardwareKeySurvey | null | undefined, code: number
): KeyCodeEvidence {
  if (survey === null || survey === undefined) return 'unattested'
  if (survey.keys.some((one) => one.code === code)) return 'pressed'
  return declaringDevices(survey, code).length > 0 ? 'declared' : 'unattested'
}

/**
 * Les périphériques d'entrée dont le noyau déclare ce code. Vide quand aucun ne le
 * déclare — ou quand le noyau de ce modèle n'a pas été lu, ce qui n'est pas la même
 * chose et se lit sur `survey.kernelDeclaration`.
 */
export function declaringDevices(
  survey: HardwareKeySurvey | null | undefined, code: number
): readonly DeclaredInputDevice[] {
  return survey?.kernelDeclaration?.devices.filter((one) => one.codes.includes(code)) ?? []
}

/** La table des codes de touche Android, et ce que les fichiers réels y montrent. */
export interface KeyCodeDomains {
  /** Niveau d'API de la plateforme lue. Un code ajouté plus tard restera inconnu. */
  androidApiLevel: number | null
  source: string
  /** `{code: "KEYCODE_..."}`, les clés étant des entiers écrits en chaîne. */
  codes: Record<string, string>
  longPressBit: number
  /** `'measured'` : l'écran natif de XCTrack l'affiche en toutes lettres. */
  longPressBitBasis: 'measured'
  longPressBitEvidence: string[]
  /** Valeur d'une liaison sans touche affectée : la valeur d'usine des quinze. */
  unsetValue: number
  /** Les touches physiques relevées, par modèle. Vide n'est pas « aucune touche ». */
  hardwareKeys: HardwareKeySurvey[]
  /** Les codes que ni l'appui ni le noyau n'expliquent, avec leur hypothèse. */
  unexplainedCodes: UnexplainedKeyCode[]
  keys: Record<string, { observed: number[] }>
}

export interface PreferenceDomains {
  meta: {
    generatedBy: string
    surveyCount: number
    newestVersion: string
    corpusFileCount: number
  }
  units: UnitDomains
  keyCodes: KeyCodeDomains
}

/** Une liaison de touche, telle qu'un fichier l'écrit, une fois relue. */
export interface KeyBinding {
  /** L'entier tel qu'il est écrit dans le fichier. */
  raw: number
  /** Vrai quand aucune touche n'est affectée (`-1`). */
  unset: boolean
  /** Le code de touche Android, une fois le bit de modificateur ôté. */
  code: number
  /** Nom `KEYCODE_*`, ou `null` si l'API relevée ne connaît pas ce code. */
  name: string | null
  /**
   * Le bit `0x01000000` est posé : la liaison se déclenche sur un **appui long**.
   *
   * Le champ s'appelait `modified` tant que le sens du bit n'était que déduit. Il est
   * mesuré — voir `LONG_PRESS_BIT_BASIS` — et porte donc maintenant le mot juste.
   */
  longPress: boolean
}

/**
 * Sur quelle base nous lisons le bit `0x01000000` comme un appui long : `'measured'`,
 * l'écran natif de XCTrack l'affichant en toutes lettres.
 *
 * La constante reste — c'est elle qui autorise l'interface à écrire « appui long » sans
 * réserve, et elle changerait de valeur si une mesure la contredisait.
 */
export const LONG_PRESS_BIT_BASIS = 'measured' as const

/** Les domaines chargés, avec de quoi les interroger. */
export class PreferenceDomainCatalog {
  constructor(readonly domains: PreferenceDomains) {}

  /** L'alphabet des codes d'unité. Ce n'est pas le domaine d'une clé donnée. */
  unitVocabulary(): readonly string[] {
    return this.domains.units.vocabulary
  }

  /**
   * La liste fermée que l'écran natif propose pour ce réglage d'unité, dans son ordre,
   * ou `null` pour tout autre réglage.
   *
   * `null` et non un tableau vide : un tableau vide se lirait « aucune valeur permise »,
   * ce qui n'est jamais ce qu'on veut dire.
   */
  unitDomain(key: string): readonly UnitChoice[] | null {
    return this.domains.units.keys[key]?.domain ?? null
  }

  /** D'où vient ce domaine : sur quel appareil, quelle version, et à quelles réserves. */
  unitDomainSource(): UnitDomainSource {
    return this.domains.units.domainSource
  }

  /** Les valeurs qu'un fichier réel porte pour cette clé d'unité. Peut être vide. */
  unitObserved(key: string): readonly string[] {
    return this.domains.units.keys[key]?.observed ?? []
  }

  /** Vrai si cette clé est l'une des `Unit.*` que le relevé le plus récent déclare. */
  isUnitKey(key: string): boolean {
    return key in this.domains.units.keys
  }

  /** Vrai si cette clé est l'une des liaisons de touche (`control: action`). */
  isKeyBindingKey(key: string): boolean {
    return key in this.domains.keyCodes.keys
  }

  /** Le nom `KEYCODE_*` d'un code, ou `null` si l'API relevée ne le connaît pas. */
  keyCodeName(code: number): string | null {
    return this.domains.keyCodes.codes[String(code)] ?? null
  }

  /**
   * Relit la valeur d'une liaison de touche : la touche d'un côté, l'appui long de
   * l'autre. Les deux sont dans le même entier, ils ne se disent pas ensemble.
   */
  decodeKeyBinding(raw: number): KeyBinding {
    const { longPressBit, unsetValue } = this.domains.keyCodes
    if (raw === unsetValue) {
      return { raw, unset: true, code: raw, name: null, longPress: false }
    }
    const longPress = raw >= 0 && (raw & longPressBit) !== 0
    const code = longPress ? raw & ~longPressBit : raw
    return { raw, unset: false, code, name: this.keyCodeName(code), longPress }
  }

  /**
   * Le relevé de touches physiques du modèle que ce fichier déclare, ou `null`.
   *
   * ⚠️ `null` est la réponse **normale** : un seul modèle a été relevé. Il veut dire
   * « nous ne savons pas ce que porte cet appareil-là », jamais « il ne porte rien ».
   * L'appariement est strict — `AIR3-7.2` et rien d'approchant : se rabattre sur un
   * modèle voisin ferait dire d'un boîtier ce qui a été relevé sur un autre.
   */
  /**
   * Tous les relevés matériels, quel que soit l'appareil. Ce qu'une interface en dit doit
   * rester au passé et au singulier de ce qui a été relevé : ce n'est pas une liste des
   * appareils qui existent, c'est la liste de ceux qu'on a eus entre les mains.
   */
  hardwareKeySurveys(): readonly HardwareKeySurvey[] {
    return this.domains.keyCodes.hardwareKeys
  }

  hardwareKeysFor(infoDevice: string | undefined): HardwareKeySurvey | null {
    const match = /AIR3-(\d+\.\d+)/i.exec(infoDevice ?? '')
    if (match === null) return null
    const id = `air3-${match[1] ?? ''}`
    return this.domains.keyCodes.hardwareKeys.find((one) => one.deviceId === id) ?? null
  }

  /**
   * Ce qu'on sait d'un code que ni l'appui ni le noyau n'expliquent, ou `null`.
   *
   * ⚠️ Ce que cela porte est une **hypothèse**. Une interface qui s'en sert doit le
   * dire au pilote dans les mêmes termes.
   */
  unexplainedCode(code: number): UnexplainedKeyCode | null {
    return this.domains.keyCodes.unexplainedCodes.find((one) => one.code === code) ?? null
  }

  /**
   * Toutes les touches connues, du code le plus petit au plus grand. Une interface qui
   * en fait une liste doit se souvenir que XCTrack accepte ce que l'appareil émet :
   * cette liste **nomme** les codes, elle ne borne pas ce qui est permis.
   */
  keyCodes(): Array<{ code: number, name: string }> {
    return Object.entries(this.domains.keyCodes.codes)
      .map(([code, name]) => ({ code: Number(code), name }))
      .sort((a, b) => a.code - b.code)
  }
}

/**
 * Charge les domaines. Un `import()` au chemin littéral : Vite en tire un morceau
 * séparé, qui ne rejoint pas le morceau principal. Deux appels partagent la même
 * requête — et l'échec est oublié pour qu'un appel ultérieur puisse retenter.
 */
let loading: Promise<PreferenceDomainCatalog> | undefined

export function loadPreferenceDomains(): Promise<PreferenceDomainCatalog> {
  if (loading !== undefined) return loading
  const started = import('./preferenceDomains.json')
    .then((module) => new PreferenceDomainCatalog(
      module.default as unknown as PreferenceDomains,
    ))
    .catch((error: unknown) => {
      loading = undefined
      throw error
    })
  loading = started
  return started
}
