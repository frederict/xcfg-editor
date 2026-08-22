import './preferences.css'
import {
  decode, encode, getMember, insertLiteral, insertString, removeMember, setLiteral, setString
} from '../core/access'
import { releaseName } from '../catalog/versionName'
import type { JsonNode } from '../core/jsonDocument'
import { serializeJson } from '../core/serializeJson'
import { androidColorToHex } from '../model/preferences'
import {
  loadPreferenceCatalog,
  preferenceLanguage,
  type PersonalData,
  type PreferenceCatalog,
  type PreferenceControl,
  type PreferenceEntry,
  type PreferenceScope
} from '../catalog/preferenceCatalog'
import {
  declaringDevices,
  keyCodeEvidence,
  loadPreferenceDomains,
  type DeclaredInputDevice,
  type HardwareKeySurvey,
  type KeyBinding,
  type PreferenceDomainCatalog
} from '../catalog/preferenceDomains'
import { hardwareKeyLabel } from '../catalog/hardwareKeyLabels'
import {
  collectPersonalData,
  personalProse,
  SECURE_PERSONAL_KEYS,
  type PersonalCounts,
  type PersonalProse
} from '../model/personalData'
// `import type` seulement : le traducteur est **passé** dans les options de la page, il
// n'est jamais lu ici. Voir `src/i18n/CLAUDE.md` § « Comment le traducteur arrive ».
import type { MessageKey, Translator } from '../i18n'

/**
 * La page des **réglages généraux** de XCTrack : tout ce qui se règle hors des pages de
 * gadgets — unités, touches, capteurs, son, espaces aériens.
 *
 * ## Deux modes, et le second ne se devine pas
 *
 * Sans `onEdit`, la page est en **lecture seule, et pas en grisage** : elle ne construit
 * alors aucun contrôle de formulaire — pas d'`<input>`, pas de `<select>`, pas de case
 * désactivée. Les valeurs sont du texte, et le document ne peut pas bouger d'un octet.
 * C'est la leçon de `properties.ts` (`renderProperties({ readOnly: true })`) : un
 * contrôle désactivé se réactive depuis la console, ce qui n'existe pas ne se réactive
 * pas. `data-mode="lecture"` le dit de l'extérieur.
 *
 * Avec `onEdit`, la page devient **modifiable** (`data-mode="edition"`), et l'assembleur
 * reçoit chaque écriture pour l'enregistrer dans l'historique et marquer le document.
 *
 * ## Ce qui est modifiable, et pourquoi le reste ne l'est pas
 *
 * Trois filtres, du plus large au plus étroit :
 *
 * 1. **Ce qui n'est pas présentable n'est pas modifiable.** Une clé sans libellé, une
 *    clé d'une autre version, une ligne que l'application a mémorisée : la page les montre
 *    en fin de page,
 *    en texte, exactement comme avant. On ne propose pas de régler ce qu'on ne sait pas
 *    nommer.
 * 2. **Une valeur structurée ne se réécrit jamais.** `Sounds`, `Navigation.State`,
 *    `Sensors.Configuration`, `Maverick.Layout`, `Sensors.AcousticVario.CustomProfile`
 *    (une table de 16 entrées) sont des valeurs composées que la page montre telles
 *    quelles, sans les ouvrir. Elle ne les ouvrira pas davantage pour les écrire.
 * 3. **Seuls six types de contrôle sont offerts** — voir `EDITABLE_CONTROLS`. Les
 *    dix-huit lignes de contrôle `action` ouvrent, sur l'appareil, une boîte que rien ne
 *    remplace ici : `Keys.*` attend une **touche pressée sur l'instrument**, qu'un
 *    navigateur posé devant un autre appareil ne peut pas capturer ;
 *    `Sensors.AcousticVario.CustomProfileEnabled` commande la table de 16 entrées qu'on
 *    ne réécrit pas. La ligne reste affichée, avec sa valeur, et dit pourquoi elle ne se
 *    règle pas — mais elle est désormais **lisible** : voir « Les touches » plus bas.
 *
 * ## Écrire sans dégrader
 *
 * Une écriture passe par `writePreference`, qui ne touche **que** le nœud de la clé
 * visée, par `setString` / `setLiteral` de `core/access` — jamais par `JSON.stringify` du
 * document. Deux conséquences mesurées :
 *
 * - une valeur reposée à l'identique n'est **pas** réécrite (`'unchanged'`), et le texte
 *   source d'origine reste en place : `3.0` ne devient pas `3` en passant ;
 * - la comparaison des littéraux se fait d'abord sur le texte, puis sur le nombre, ce qui
 *   fait qu'un aller-retour par un champ numérique — où le navigateur normalise ce qu'il
 *   affiche — ne réécrit rien non plus.
 *
 * ## La structure de la page est celle de l'appareil
 *
 * Le catalogue porte l'arborescence des 20 écrans de réglages de XCTrack. L'écran racine
 * (`preferences`) **est** le menu de l'appareil, dans son ordre : « Pilote et comptes »,
 * « Aéronef », « Livetracking »… La page le reprend tel quel plutôt que d'inventer un
 * classement. Un pilote qui cherche un réglage le cherche là où il l'a réglé.
 *
 * Le lien d'une ligne du menu vers l'écran qu'elle ouvre n'est **pas** dans les
 * ressources : la ligne dit seulement qu'elle ouvre un fragment ou une activité. Il est
 * donc rétabli ici par `MENU_SCREENS`, **déduit du nom de la ressource** et vérifié par
 * un test (chaque écran du catalogue est cité une fois et une seule). C'est une
 * déduction, pas un relevé : elle est dite comme telle.
 *
 * ## Ce que le fichier porte et que la page ne sait pas présenter
 *
 * 86 réglages sur 217 n'ont aucun libellé, et un fichier réel en porte 49. (Le compte
 * de 217 est celui du catalogue extrait de 1.0.3-beta ; la base des versions en
 * annonce 216 à son dernier palier, parce qu'elle ne compte pas la même chose — un
 * inventaire de schéma n'est pas une liste de réglages relevés.) Les faire
 * disparaître serait mentir sur le contenu du fichier. Elles sont donc rassemblées en
 * fin de page, en trois groupes qui disent chacun **pourquoi** :
 *
 * - *sans libellé* — de vrais réglages, mais XCTrack les configure dans des écrans
 *   construits en code (espaces aériens, cartes, thermiques). La valeur et la comparaison
 *   au défaut restent affichées : le catalogue les connaît, c'est le nom qui manque ;
 * - *ce que l'application a mémorisé* — ce ne sont pas des réglages du tout, mais l'état
 *   de l'application (`Navigation.State`, `Sounds`, `Sensors.Configuration`…). On n'en
 *   montre que la taille, jamais le contenu ;
 * - *inconnue de ce catalogue* — une clé d'une autre version de XCTrack. Le fichier de
 *   2025 en porte 27. La page dit « je ne sais pas » : jamais « supprimable », jamais
 *   « inconnue donc ignorée ».
 *
 * ## Les unités et les touches, deux domaines qui ne venaient d'aucune lecture
 *
 * `preferenceDomains.ts` porte ce que les écrans de réglages ne déclarent pas, et cette
 * page s'en sert à deux endroits — **seulement si `domains` est fourni** ; sans lui, elle
 * retombe exactement sur ce qu'elle faisait avant, champ libre compris.
 *
 * - **Les huit `Unit.*`** reçoivent la liste fermée **relevée sur l'appareil**, à la
 *   place du champ de saisie libre où le pilote pouvait écrire une valeur que son
 *   instrument refuserait. La valeur du fichier qui n'y serait pas reste offerte, comme
 *   pour toute autre liste : fermer ne veut pas dire effacer.
 * - **Les quinze `Keys.*`** cessent d'afficher l'entier du fichier. « 16777240 » mêle
 *   deux choses ; la ligne les sépare : la **touche** d'un côté (avec son nom Android
 *   quand la table le donne), l'**appui long** de l'autre.
 *
 * ## Ce que la page peut dire du matériel, et ce qu'elle ne dira jamais
 *
 * Un code de touche n'est pas une touche. `Keys.PrevWaypoint = 266` est une ligne
 * parfaitement valide ; encore faut-il que le boîtier porte une touche qui émette 266.
 * Les relevés ne couvrent **qu'un modèle**, l'AIR³ 7.2, et le parc n'est pas homogène —
 * les AIR³ plus récents portent davantage de touches.
 *
 * La page ne doit donc **jamais** écrire « cette touche n'existe pas » ni « ce réglage
 * est inerte ». Elle dit au plus ce qu'elle a relevé, en nommant le modèle du relevé, et
 * laisse le pilote conclure. Trois choses le lui permettent :
 *
 * - le fichier **déclare son appareil** (`info.device`), ce qui conditionne le propos au
 *   modèle : `hardwareKeysFor()` rend `null` dès qu'il ne le reconnaît pas, et la page se
 *   contente alors de dire qu'elle ne sait pas ;
 * - ⚠️ **trois crans, et non deux** : une touche pressée à la main, un code que le noyau
 *   du boîtier déclare, rien du tout. `keyCodeEvidence()` répond lequel, et chacun a ses
 *   propres mots. Le 2026-08-22, la page disait des deux derniers « aucune touche mesurée
 *   n'émet ce code » — et le disait du code 27, que `sn7326-key` déclare ;
 * - ⚠️ le fichier de disposition **ne fait pas relevé pour autant** : il décrit ce que la
 *   puce sait faire, pas ce que le fabricant a soudé. Un code déclaré est possible sur ce
 *   matériel, jamais prouvé — seul un appui le prouverait.
 *
 * ## Une clé absente ne dit rien — et surtout pas « valeur d'usine »
 *
 * Une clé absente du fichier n'est pas une clé réglée à la valeur d'usine. Les deux ont
 * leur état, et le compte les sépare. Voir `PreferenceState` et `ABSENT_KEY_ON_IMPORT`.
 *
 * **Décision de cette page : une clé absente le reste tant que le pilote ne demande pas
 * explicitement le contraire.** Elle ne reçoit aucun contrôle — un champ prérempli à la
 * valeur d'usine inviterait à « confirmer » une valeur, et le premier geste maladroit
 * écrirait une ligne de plus dans le fichier. À la place, la ligne montre **la valeur
 * d'usine de XCTrack**, en retrait, et un bouton « Définir cette valeur » qui l'écrit
 * telle quelle. Une fois la clé écrite, la ligne devient une ligne comme les autres.
 *
 * Ce bouton n'apparaît que si le catalogue relève une valeur d'usine **inscriptible** :
 * les huit `Unit.*` et les autres valeurs calculées au démarrage
 * (`defaultSource: 'runtime'`) n'en ont pas, et la ligne le dit plutôt que d'inventer.
 *
 * ## Implicite, explicite, et ce que ça change vraiment
 *
 * Cette page a longtemps affirmé qu'écrire ou retirer une clé ne changeait **rien** au
 * comportement de l'appareil. C'était une supposition, et la mesure l'a réfutée :
 * l'import fusionne le bloc `preferences` et **ne touche jamais une clé absente**
 * (`ABSENT_KEY_ON_IMPORT`). Sur un appareil déjà réglé, écrire une clé que le fichier ne
 * portait pas **change** ce que l'appareil applique, et la retirer ne le ramène **pas**
 * à sa valeur d'usine.
 *
 * Ce que les deux gestes font vraiment :
 *
 * - **« Définir cette valeur »** écrit la valeur d'usine dans le fichier. Sur une
 *   installation neuve, elle s'appliquerait de toute façon et l'écrire ne change rien
 *   d'immédiat — cela met le réglage à l'abri d'une mise à jour de XCTrack qui changerait
 *   sa valeur d'usine. Sur un appareil déjà réglé, elle **remplacera** le réglage en
 *   place ;
 * - **« Retirer »** fait taire le fichier sur ce réglage. L'appareil gardera le sien.
 *
 * « Retirer » n'est offert que sur l'état `default` — une valeur écrite égale à la valeur
 * d'usine relevée. Sur une valeur réglée, faire taire le fichier priverait la sauvegarde
 * d'un réglage délibéré, et ce n'est pas ce qu'un bouton discret doit faire d'un clic.
 *
 * ## Le troisième geste, qui n'est neutre ni pour l'appareil ni pour l'écran
 *
 * Les deux précédents ne changent **rien** à ce que l'appareil fait aujourd'hui. Le
 * troisième — « Rétablir la valeur d'usine », sur une valeur réglée qui diffère du relevé
 * (état `custom`) — remplace un choix du pilote. L'appareil ne se comportera plus pareil
 * en vol.
 *
 * Il ne peut donc pas se présenter comme les deux autres : il prend sa propre ligne sous
 * le réglage, à pleine opacité, et affiche les deux valeurs en présence avant le clic. Il
 * ne s'offre que là où la valeur d'usine est connue **sans ambiguïté** — ni calculée au
 * démarrage, ni contradictoire — et, quand le fichier ne vient pas de la version du
 * catalogue, il le dit dans sa phrase et non dans son infobulle. Voir `restorable` et
 * `buildRestoreParts`.
 *
 * Il **écrit** la valeur d'usine, il ne retire pas la clé : la ligne passe à l'état
 * `default`, d'où « Retirer » devient offert. Le pilote qui veut aller jusqu'à l'implicite
 * y va d'un second clic, et voit les deux effets séparément.
 *
 * ## Ce que cette page dit, et dans quelle langue
 *
 * Toute sa prose est versée au catalogue — `src/i18n/messages/<langue>/preferences.ts`,
 * cinq langues — et lue par le traducteur que l'assembleur passe dans `options.tr`. Ce
 * module ne va **jamais** chercher la langue courante : il la reçoit, comme
 * `src/model/personalData.ts` reçoit la sienne.
 *
 * ⚠️ **Deux axes de langue se croisent ici, et les confondre casserait la promesse de
 * l'outil** (voir `src/i18n/axes.ts`) :
 *
 * - `options.tr` porte **notre prose**, dans la langue que le pilote a choisie ;
 * - `options.catalog` porte **les libellés de XCTrack** — noms de réglages, valeurs des
 *   listes —, dans la langue du fichier ouvert. Ils ne se traduisent pas : un libellé
 *   « traduit » serait un mot que le pilote ne trouverait nulle part sur son appareil.
 *
 * Deux textes affichés ne viennent **ni de l'un ni de l'autre** et restent en français
 * dans les cinq langues, parce qu'ils sont portés en clair par
 * `catalog/preferenceDomains.json` : la méthode du relevé des unités et ses réserves. La
 * parade est connue — le fichier extrait porte une **clé** au lieu d'une phrase, comme
 * l'a fait le champ `reason` des 44 clés personnelles (voir `DECLARED_PERSONAL` dans
 * `tools/extract-preferences.py`) — mais elle appartient au lot qui reprendra
 * `build-preference-domains.py`.
 *
 * ⚠️ **Le nom des touches physiques était le troisième, et il ne l'est plus.** « volume
 * haut », « marche/arrêt » se donnaient pour des données de mesure : ils n'en étaient
 * pas. Ce qui est mesuré, c'est qu'une touche pressée émet le code 24 ; le mot pour la
 * nommer est celui de XCTrack, il vient de l'APK en 32 langues et suit l'axe `labels` —
 * voir `catalog/hardwareKeyLabels.ts`. Ce que le noyau déclare (« la prise casque ») est
 * l'inverse : notre glose, elle passe par le catalogue et suit l'axe `ui`.
 *
 * Le module portait deux fautes de mécanique, corrigées avec cette extraction : un
 * `plural()` local codant `count > 1` — la règle française, fausse dans les quatre autres
 * langues où zéro prend le pluriel — et un `formatCount()` figé à `toLocaleString('fr-FR')`.
 * Les deux passent maintenant par le socle ; la sortie française est identique au
 * caractère près, espace fine insécable des milliers comprise.
 */

/**
 * Ce qu'un import fait d'une clé absente — **mesuré sur l'AIR³**, et non plus supposé.
 *
 * Toute cette page a d'abord été écrite sur la supposition inverse : « une clé absente,
 * c'est XCTrack qui applique sa valeur d'usine ». C'est faux.
 *
 * Protocole de la mesure : `Display.Theme` retirée d'une sauvegarde, sauvegarde importée
 * en **« Remplacer tout »**, configuration réexportée. La clé revient à la valeur que
 * l'appareil portait déjà (`WhiteHCTheme`), et non à la valeur d'usine de l'APK
 * (`WhiteTheme`). Un témoin de contrôle dans la même manche — `Display.WidgetTitleSize`,
 * 140 → 200 — prouve que l'import a bien écrit les autres préférences : sans lui, la
 * manche n'aurait rien démontré.
 *
 * L'import est donc une **fusion** sur le bloc `preferences`, pas un remplacement. Une
 * clé absente du fichier n'est jamais touchée.
 *
 * Deux limites, que les textes ne doivent pas gommer :
 *
 * - la mesure porte sur le mode **« Remplacer tout »** ; les deux autres modes d'import
 *   ne touchent que les pages ;
 * - le cas de l'**installation neuve** n'a pas été testé. La valeur d'usine s'y applique
 *   nécessairement, aucune valeur antérieure n'existant — mais c'est une déduction, et
 *   elle se dit comme telle : « un appareil qui n'y a jamais touché ».
 *
 * **Cette constante est désormais la clé du message**, pas la phrase : celle-ci vit dans
 * `src/i18n/messages/<langue>/preferences.ts`, dans les cinq langues. Les quatre textes
 * qui la reprennent la reçoivent par le repère `{absent}` — un repère nommé qui reçoit une
 * **phrase entière**, de sorte que le fait et ses deux limites restent identiques partout
 * où ils se disent, et dans toutes les langues.
 */
export const ABSENT_KEY_ON_IMPORT = 'preferences.absentKeyOnImport' satisfies MessageKey

/* ------------------------------------------------------------------ le modèle de page */

/**
 * Ce que vaut une préférence dans ce fichier-ci. Six états, parce que six situations
 * distinctes se présentent réellement et qu'aucune ne se déduit d'une autre.
 */
export type PreferenceState =
  /** Présente, et différente du défaut relevé : le pilote l'a réglée. */
  | 'custom'
  /** Présente, et égale au défaut relevé. */
  | 'default'
  /**
   * Présente, mais rien à comparer : `Unit.*` dont XCTrack calcule le défaut selon la
   * locale, ou clé dont le catalogue ne relève aucun défaut.
   */
  | 'undecidable'
  /**
   * Présente, et XCTrack publie **deux défauts contradictoires** — le bytecode et
   * l'écran ne disent pas la même chose. On ne choisit pas : on montre les deux.
   */
  | 'conflict'
  /**
   * Absente du fichier : il ne dit rien de ce réglage. Ce n'est PAS « réglée à la valeur
   * d'usine » — à l'import, l'appareil garde le sien (`ABSENT_KEY_ON_IMPORT`).
   */
  | 'absent'
  /**
   * Absente, et Android ne l'écrit qu'une fois réglée au moins une fois sur l'appareil
   * (les clés que la classe de configuration ne déclare pas). Son absence ne dit donc
   * rien du tout : ni ce que l'appareil applique, ni ce qu'il appliquerait neuf.
   */
  | 'unwritten'

/** Pourquoi une clé du fichier n'apparaît pas dans un écran de la page. */
export type LeftoverReason =
  /** De vrais réglages, mais aucun libellé dans l'APK. */
  | 'unlabelled'
  /** Ce que l'application a mémorisé, pas un réglage. */
  | 'state'
  /** Le catalogue ne connaît pas cette clé — une autre version de XCTrack l'a écrite. */
  | 'unknown'

/** Une ligne de la page : une clé, ce qu'elle vaut, et ce que ça vaut de le savoir. */
export interface PreferenceRow {
  key: string
  /** Le libellé traduit, ou la clé elle-même quand l'APK n'en porte aucun. */
  label: string
  /** Vrai si `label` est un vrai libellé et non la clé faute de mieux. */
  labelled: boolean
  help?: string
  /**
   * **Notre** phrase sous un libellé de XCTrack qui emploie un mot que le pilote n'a aucun
   * moyen de connaître. Voir `GLOSSED_KEYS`.
   */
  gloss?: string
  control: PreferenceControl | null
  scope: PreferenceScope | null
  state: PreferenceState
  /** La valeur en toutes lettres. `undefined` quand la clé est absente du fichier. */
  value?: string
  /** Le texte source de la valeur, tel qu'il est écrit dans le fichier. */
  raw?: string
  /** Le défaut, dit comme la valeur l'est juste à côté. */
  defaultText?: string
  /** Le second défaut, quand XCTrack se contredit — voir `conflict`. */
  otherDefaultText?: string
  /** Pourquoi il n'y a rien à comparer, quand l'état vaut `undecidable`. */
  undecidableReason?: string
  personal?: PersonalData
  /**
   * La liaison de touche relue — la touche d'un côté, l'appui long de l'autre. Définie
   * pour les quinze `Keys.*` quand les domaines sont chargés, absente sinon.
   */
  binding?: KeyBinding
  /**
   * Ce que nos relevés attestent de ce code-là, quand ils couvrent le modèle de ce
   * fichier : `'declared'` — le noyau du boîtier le déclare, personne ne l'a pressé —,
   * `'unattested'` — ni l'un ni l'autre —, ou `undefined` quand la touche a été pressée
   * ou qu'il n'y a aucun relevé pour ce modèle.
   *
   * ⚠️ `'unattested'` n'est **pas** « cette touche n'existe pas » : les relevés ne
   * couvrent qu'un modèle et le parc n'est pas homogène. C'est la marque qui renvoie à
   * la note du bloc, laquelle dit ce que chaque relevé vaut — voir `hardwareNote`.
   */
  keyEvidence?: 'declared' | 'unattested'
  /** Vrai si la valeur est un objet ou un tableau : on n'en montre que la taille. */
  structured: boolean
  /** Défini pour une ligne du bloc de fin — voir `LeftoverReason`. */
  reason?: LeftoverReason
  /** Ce qui précède le premier point (`Airspace`), pour grouper le bloc de fin. */
  family: string
}

/** Un bloc de lignes coiffé d'une catégorie, tel que l'écran de XCTrack l'affiche. */
export interface PreferenceCategoryBlock {
  /** Le titre de la catégorie, ou `undefined` pour les lignes de tête d'un écran. */
  title?: string
  rows: PreferenceRow[]
}

/** Un écran de réglages de XCTrack, rendu dans l'ordre de ses lignes. */
export interface PreferenceScreenBlock {
  id: string
  title: string
  blocks: PreferenceCategoryBlock[]
  /** Combien de réglages de cet écran ne quittent jamais l'appareil (INTERNAL, SECURE). */
  neverExported: number
}

/** Une entrée du menu de l'appareil, avec les écrans qu'elle ouvre. */
export interface PreferenceMenuEntry {
  /** La clé de la ligne du menu racine (`_display`), ou `''` pour une ligne sans clé. */
  menuKey: string
  title: string
  screens: PreferenceScreenBlock[]
  /** Ce qu'il faut dire quand la page n'a rien à montrer sous cette entrée. */
  note?: string
  /**
   * Ce que ce fichier-ci porte sous une entrée que la page ne sait pas déplier :
   * combien de clés, et combien d'entre elles portent un libellé. Sans ce compte, une
   * entrée muette ne se distinguerait pas d'une entrée vide.
   */
  tally?: { total: number; labelled: number }
}

export interface PreferencesSummary {
  /** Vrai si le fichier ne porte aucune préférence — un export `pages`, par exemple. */
  empty: boolean
  /** Combien de clés la section `preferences` du fichier porte. */
  fileKeyCount: number
  /** Combien de lignes la page présente dans un écran. */
  presentedCount: number
  customCount: number
  defaultCount: number
  undecidableCount: number
  conflictCount: number
  absentCount: number
  unwrittenCount: number
  unlabelledCount: number
  stateCount: number
  unknownCount: number
  /** Combien de clés du fichier portent une donnée personnelle. */
  personalCount: number
  /**
   * L'inventaire **entier** du fichier, préférences et disposition, tel que
   * `model/personalData.ts` l'établit pour les quatre écrans.
   *
   * Cette page ne montre que les préférences — un écran de réglages n'a pas à montrer ce
   * qu'une boîte de partage montre — mais elle doit **dire** qu'elle ne compte pas tout :
   * les textes écrits dans les gadgets sont les seuls qui partent avec un export
   * « pages », et un pilote qui lit « 16 » ici puis « 5 » dans la boîte de partage doit
   * comprendre que ce ne sont pas deux mesures du même objet.
   *
   * `personalCounts.preferences` et `personalCount` comptent la même chose par deux
   * chemins — le relevé embarqué et le catalogue chargé — et un test exige qu'ils soient
   * égaux sur tous les fichiers du corpus. C'est ce qui rend les deux écrans
   * démontrablement d'accord plutôt que vraisemblablement d'accord.
   */
  personalCounts: PersonalCounts
  /** Combien de réglages connus ne quittent jamais l'appareil. */
  neverExportedCount: number
}

export interface PreferenceInventory {
  summary: PreferencesSummary
  menu: PreferenceMenuEntry[]
  /** Les lignes du bloc de fin, dans l'ordre du fichier. */
  leftovers: PreferenceRow[]
  /** Les clés personnelles présentes dans ce fichier, dans l'ordre du fichier. */
  personal: PreferenceRow[]
}

/* --------------------------------------------------- le menu de l'appareil, rétabli */

/**
 * Quel écran chaque ligne du menu racine ouvre.
 *
 * ⚠️ **Déduit, non relevé.** Les ressources disent qu'une ligne ouvre « un fragment » ou
 * « une activité », jamais lequel : la cible vit dans le code, sous un nom obfusqué. Le
 * rapprochement se fait donc ici sur le nom (`_display` → `preferences_display`), et il
 * est vérifié par un test qui exige que les 19 écrans non racines soient cités une fois
 * et une seule. Une version de XCTrack qui ajouterait un écran ferait donc échouer le
 * test plutôt que de le laisser tomber silencieusement de la page.
 *
 * Deux écrans ne sont pas ouverts depuis le menu racine mais depuis un autre écran :
 * `preferences_units` depuis « Affichage », `preferences_acoustic_vario` depuis « Son et
 * alertes ». Ils sont rattachés à leur parent, comme sur l'appareil.
 */
interface ScreenLink {
  id: string
  /**
   * La clé de la ligne qui ouvre cet écran depuis un **autre** écran que le menu racine.
   * Cette ligne-là porte le titre que l'appareil affiche en haut de l'écran ouvert
   * (« Unités », « Vario sonore ») ; sans elle, deux écrans d'une même entrée de menu
   * s'afficheraient tous deux sous le titre de l'entrée.
   */
  via?: string
}

const MENU_SCREENS: Record<string, readonly ScreenLink[]> = {
  _pilot: [{ id: 'preferences_pilot' }],
  _glider: [{ id: 'preferences_glider' }],
  _livetracking: [{ id: 'preferences_live' }],
  _contest: [{ id: 'preferences_contest' }],
  _sensorsQnh: [{ id: 'preferences_atmosphere' }],
  _sound: [
    { id: 'preferences_sound' },
    { id: 'preferences_acoustic_vario', via: '_sensorsAcousticVario' }
  ],
  _display: [
    { id: 'preferences_display' },
    { id: 'preferences_units', via: '_units' }
  ],
  _activelook: [{ id: 'preferences_activelook' }],
  _maverick: [{ id: 'preferences_maverick' }],
  _keyBindings: [{ id: 'preferences_keybindings' }],
  _sensors: [{ id: 'preferences_sensors' }],
  _shareconfig: [{ id: 'preferences_shareconfig' }],
  _tweaks: [{ id: 'preferences_tweaks' }],
  _testing: [{ id: 'preferences_testing_debug' }],
  _about: [{ id: 'preferences_about' }],
  _extra: [{ id: 'preferences_extra' }],
  _devel: [{ id: 'preferences_devel' }]
}

/**
 * Ce qu'il faut dire des lignes du menu que la page ne peut pas déplier — celles qui
 * ouvrent une activité écrite en code plutôt qu'un écran décrit en XML.
 *
 * Un menu amputé de six lignes se lirait comme un menu complet, et le pilote chercherait
 * en vain « Espaces aériens » : la ligne reste, avec la raison.
 */
/**
 * Les familles de clés qu'une entrée du menu écrit, quand la page ne peut pas déplier
 * son écran.
 *
 * Cela sert à mesurer l'écart plutôt qu'à le taire : « Espaces aériens et obstacles »
 * est la famille la plus fournie d'un fichier réel (18 clés) et la moins libellée (1 sur
 * 18). Sans ce compte, la ligne dirait « écran construit en code » sans que le pilote
 * sache que c'est là que sont ses dix-huit réglages.
 *
 * Le rapprochement est **déduit du préfixe de la clé**, comme `MENU_SCREENS` l'est du
 * nom de la ressource.
 */
const MENU_FAMILIES: Record<string, readonly string[]> = {
  _airspaces: ['Airspace', 'Obstacles'],
  _maps: ['Mapsforge']
}

/**
 * Une **fonction** par note et non une clé : `t()` extrait les repères d'un message *par
 * le type*, ce qu'il ne peut pas faire quand la clé lui arrive sous la forme de l'union
 * entière. Refermer la clé dans une petite fonction rend l'appel exact et se lit aussi
 * bien — c'est le prix, une ligne, de la vérification par le compilateur.
 */
const MENU_NOTES: Readonly<Record<string, (tr: Translator) => string>> = {
  _airspaces: (tr) => tr.t('preferences.menuNoteAirspaces'),
  _maps: (tr) => tr.t('preferences.menuNoteMaps'),
  _editPageSet: (tr) => tr.t('preferences.menuNoteEditPageSet'),
  _eventMapping: (tr) => tr.t('preferences.menuNoteEventMapping'),
  _pro: (tr) => tr.t('preferences.menuNotePro'),
  _sensors: (tr) => tr.t('preferences.menuNoteSensors'),
  _shareconfig: (tr) => tr.t('preferences.menuNoteShareConfig'),
  _about: (tr) => tr.t('preferences.menuNoteAbout'),
  '': (tr) => tr.t('preferences.menuNoteInfoOnly')
}

/* ------------------------------------------------------------------ lecture du fichier */

/** Les clés de la section `preferences`, dans l'ordre du fichier, avec leur nœud. */
function readFilePreferences(document: JsonNode): Map<string, JsonNode> {
  const found = new Map<string, JsonNode>()
  const section = getMember(document, 'preferences')
  if (section === undefined || section.kind !== 'object') return found
  // Sur clé dupliquée, la dernière l'emporte — comme `getMember`, comme XCTrack.
  for (const [rawKey, value] of section.entries) found.set(decode(rawKey), value)
  return found
}

/**
 * L'appareil que le fichier déclare (`info.device`), ou `undefined`.
 *
 * C'est ce qui autorise la page à parler du **matériel** : sans lui, elle ne sait pas de
 * quel boîtier ce fichier vient et ne peut donc rien en dire.
 */
export function fileDevice(document: JsonNode): string | undefined {
  const info = getMember(document, 'info')
  if (info === undefined || info.kind !== 'object') return undefined
  const device = getMember(info, 'device')
  return device?.kind === 'string' ? decode(device.raw) : undefined
}

/** Vrai si le fichier porte bien une section `preferences`, fût-elle vide. */
function hasPreferencesSection(document: JsonNode): boolean {
  const section = getMember(document, 'preferences')
  return section !== undefined && section.kind === 'object'
}

/* ----------------------------------------------------------- la valeur, en toutes lettres */

/** Le texte scalaire d'un nœud : la chaîne décodée, ou le littéral tel qu'il est écrit. */
function scalarText(node: JsonNode): string | undefined {
  if (node.kind === 'string') return decode(node.raw)
  if (node.kind === 'literal') return node.raw
  return undefined
}

/**
 * L'indentation à laquelle une valeur de préférence est écrite : la section
 * `preferences` est au premier niveau du document, ses clés au deuxième, donc leurs
 * valeurs se sérialisent avec quatre espaces de marge.
 */
const PREFERENCE_INDENT = '    '

/**
 * La taille d'une valeur structurée, dite en caractères.
 *
 * `serializeJson` réécrit le nœud **tel que le fichier le porte** — c'est la propriété
 * centrale du projet — et à l'indentation du contexte, le compte est donc exactement
 * celui des caractères que le fichier consacre à cette valeur.
 */
function structuredSize(node: JsonNode): number {
  return serializeJson(node, PREFERENCE_INDENT).length
}

/*
 * `formatCount` a disparu : il posait `toLocaleString('fr-FR')`, donc la typographie
 * française sur les cinq langues. `tr.format.number` la rend **identique au caractère
 * près** en français — espace fine insécable comprise — et juste ailleurs : « 1,059 » en
 * anglais, « 1.059 » en allemand. Voir `src/i18n/format.ts`.
 */

/* ------------------------------------------------------- une liaison de touche, lisible */

/**
 * Ce dont la page a besoin pour relire une liaison de touche : la table des codes, et le
 * relevé matériel du modèle que **ce fichier-ci** déclare.
 */
export interface BindingContext {
  domains?: PreferenceDomainCatalog
  hardware?: HardwareKeySurvey | null
  /**
   * La langue des **libellés de XCTrack** — celle du catalogue chargé, donc celle du
   * fichier ouvert. C'est elle qui nomme les touches physiques : « Augmenter le volume »
   * pour un fichier français, « Volume Up » pour un fichier anglais.
   *
   * ⚠️ Ce n'est **jamais** `tr.language`. Un pilote belge dont l'AIR³ est réglé en anglais
   * lit cet écran en français et ses touches en anglais, parce que c'est ce que son
   * appareil affiche. Voir `src/i18n/axes.ts`.
   */
  labels: string
}

/**
 * Une liaison de touche en trois morceaux, parce qu'elle en porte trois et que l'entier
 * du fichier les mêle : « 16777240 » est la touche 24 **et** l'appui long.
 */
export interface BindingParts {
  /**
   * Ce que la touche est, dit du mieux qu'on sache : son nom sur le boîtier quand notre
   * relevé couvre ce modèle, son nom Android sinon, son code seul en dernier recours.
   */
  key: string
  /** Le code, et le nom Android s'il n'est pas déjà dans `key`. Le détail technique. */
  detail?: string
  /**
   * « appui long » ou « appui simple ».
   *
   * Le bit `0x01000000` vaut appui long, et c'est **mesuré** — l'écran natif de XCTrack
   * l'affiche en toutes lettres. « appui simple » est son complément : le bit n'y est pas.
   */
  press: string
}

/**
 * Découpe une liaison relue en ce qui s'affiche. Ne dit **rien** du matériel : c'est
 * `bindingNote` qui s'en charge, et lui seul, parce que c'est le propos qui demande de la
 * prudence.
 */
export function bindingParts(
  binding: KeyBinding, keys: BindingContext | undefined, tr: Translator
): BindingParts {
  const press = tr.t(binding.longPress ? 'preferences.longPress' : 'preferences.shortPress')
  // `code` part en **`string`** : c'est un code Android, pas un compte. « 16 777 240 » ne
  // se retrouve dans aucun fichier XCTrack — voir `src/i18n/format.ts`.
  const code = String(binding.code)
  // ⚠️ Le nom d'une touche est un **libellé de XCTrack**, dans la langue du fichier
  // ouvert : « Augmenter le volume », jamais un mot de nous. Il ne s'affiche que sur une
  // touche que nous avons pressée à la main sur ce modèle — un nom qui manque reste une
  // mesure qui manque, et le catalogue rend `null` plutôt qu'un mot deviné.
  const physical = keys?.hardware?.keys.find((one) => one.code === binding.code)
  const named = physical === undefined || keys === undefined
    ? null
    : hardwareKeyLabel(physical.code, keys.labels)
  if (named !== null && physical !== undefined) {
    return {
      key: named,
      detail: tr.t('preferences.codeAndName', { code, name: physical.name }),
      press
    }
  }
  if (binding.name !== null) {
    return { key: binding.name, detail: tr.t('preferences.rawCode', { code }), press }
  }
  // Ni touche relevée ni nom Android : le code brut, et pas un mot de plus. Inventer un
  // nom pour un code que la table ne connaît pas serait le pire des services.
  return { key: tr.t('preferences.rawCode', { code }), press }
}

/**
 * Ce qu'un périphérique d'entrée **est**, dans la langue du pilote : « le clavier du
 * boîtier », « la prise casque ».
 *
 * ⚠️ **Notre glose, et non le relevé.** Le noyau déclare `mtk-kpd`, `ACCDET` et des codes ;
 * dire de l'un qu'il est la prise casque est notre lecture. Elle a vécu en français dans
 * `preferenceDomains.json` jusqu'au 2026-08-22, et s'affichait telle quelle dans les cinq
 * langues — au milieu d'une infobulle allemande. Le relevé porte maintenant une clé, et le
 * mot vient du catalogue.
 *
 * Le contrôleur de clavier garde son nom de noyau (`sn7326-key`) dans la phrase : c'est
 * une mesure, elle ne se traduit pas, et c'est elle qui permet de refaire le relevé.
 *
 * Le `switch` est exhaustif à la compilation : une famille de périphériques ajoutée au
 * relevé sans un mot pour la nommer ne passera pas `tsc`.
 */
function inputDeviceWord(device: DeclaredInputDevice, tr: Translator): string {
  switch (device.whatKey) {
    case 'keypad': return tr.t('inputDevice.keypad')
    case 'keyboardController':
      return tr.t('inputDevice.keyboardController', { name: device.name })
    case 'touchPanel': return tr.t('inputDevice.touchPanel')
    case 'headsetJack': return tr.t('inputDevice.headsetJack')
  }
}

/**
 * **D'où vient le nom affiché** sur cette ligne-là, en une phrase — et **lequel des trois
 * crans** de connaissance s'applique à ce code.
 *
 * ## Pourquoi cette phrase existe
 *
 * L'écran des touches met côte à côte des provenances qui ne se ressemblent pas :
 *
 * - « Augmenter le volume », « Mise en route » — le nom que **XCTrack** donne à la touche,
 *   extrait de l'APK et rangé dans `hardwareKeyLabels.json`. Il suit la langue du fichier
 *   ouvert, comme tous les libellés de XCTrack, et ne s'affiche que pour les touches que
 *   nous avons **pressées à la main** sur le modèle du fichier — trois sur l'AIR³ 7.2 ;
 * - `KEYCODE_STEM_2` — le nom que la **table des touches d'Android** donne au code, lue
 *   dans l'`android.jar` du SDK (`keyCodes.source`, `keyCodes.androidApiLevel`). Elle
 *   nomme un code, pas un bouton.
 *
 * ⚠️ **Le premier a été notre prose, et c'était une faute.** Jusqu'au 2026-08-22, l'écran
 * affichait « volume haut » — un mot de nous, français dans les cinq langues, et
 * introuvable sur l'appareil du pilote. Ce qui était mesuré, c'est qu'une touche pressée
 * émet le code 24 ; le nommer en français n'était pas une mesure. La correction n'a pas
 * été de traduire ces trois mots mais de les remplacer par ceux que XCTrack porte déjà —
 * voir `src/catalog/hardwareKeyLabels.ts`, et le même geste sur les cinq navigations.
 *
 * Rien ne le disait, et le pilote-testeur du 2026-08-22 a posé la seule question qui
 * suit : « pourquoi les touches de volume sont traduites et pas les autres ? » — sur la
 * touche qu'il presse le plus en compétition. La réponse n'est pas une traduction
 * manquante : c'est une mesure manquante.
 *
 * ## ⚠️ Trois crans, et non deux
 *
 * Le même jour, `getevent -pl` a montré que la phrase écrasait deux situations très
 * différentes. Entre « pressée à la main » et « rien », il y a **le code que le noyau du
 * boîtier déclare** : `sn7326-key` déclare `CAMERA` en 27, et 27 est justement ce que
 * `Keys.PrevWaypoint` porte dans le corpus du propriétaire. Dire de 27 « aucune touche
 * mesurée ne l'émet » contredisait l'appareil.
 *
 * Un code déclaré est **possible sur ce matériel** ; il n'est pas prouvé. Un contrôleur
 * de clavier déclare souvent plus de codes que le boîtier n'a de boutons, et seul un
 * appui ferait foi. Les trois crans se disent donc chacun dans leurs propres mots — voir
 * `keyCodeEvidence()` dans `src/catalog/preferenceDomains.ts`.
 *
 * ⚠️ **Aucune de ces phrases ne nomme une touche que nous n'ayons pas relevée**, et
 * aucune ne dit qu'une touche n'existe pas : le parc n'est pas homogène, et un code sans
 * écho sur l'AIR³ 7.2 peut commander un vrai bouton sur un modèle plus récent.
 */
export function bindingOrigin(
  binding: KeyBinding, keys: BindingContext | undefined, tr: Translator
): string | undefined {
  if (binding.unset) return undefined
  const hardware = keys?.hardware
  // `code` et `name` partent en **`string`** : ce sont des identifiants, pas des comptes.
  const code = String(binding.code)
  const evidence = keyCodeEvidence(hardware, binding.code)
  const physical = hardware?.keys.find((one) => one.code === binding.code)
  const named = physical === undefined || keys === undefined
    ? null
    : hardwareKeyLabel(physical.code, keys.labels)
  if (evidence === 'pressed' && physical !== undefined && named !== null && hardware != null) {
    // Deux choses, et la phrase les tient séparées : le **mot** est celui de XCTrack, la
    // **mesure** est qu'une touche pressée sur ce modèle émet ce code.
    return tr.t('preferences.keyFromSurvey', {
      label: named, model: hardware.label, name: physical.name, code
    })
  }
  // Sans nom Android, il n'y a rien à dire de plus que le code : les trois crans parlent
  // du matériel, et nommer le code est le préalable de chacun.
  if (binding.name === null) return tr.t('preferences.keyFromNowhere', { code })
  // Deuxième cran : le noyau déclare le code, personne ne l'a pressé. Ce que le
  // périphérique **est** — « la prise casque » — est notre glose et passe par le
  // catalogue ; ce que le noyau déclare, lui, c'est `ACCDET` et des codes.
  if (evidence === 'declared' && hardware != null) {
    const devices = declaringDevices(hardware, binding.code)
      .map((one) => inputDeviceWord(one, tr)).join(', ')
    return tr.t('preferences.keyFromKernel', {
      name: binding.name, code, model: hardware.label, devices
    })
  }
  // Troisième cran, mais seulement quand nous avons lu **ce** boîtier : sans relevé, nous
  // ne savons rien de son matériel, et le dire autrement serait mentir par omission.
  if (evidence === 'unattested' && hardware != null && hardware.kernelDeclaration !== undefined) {
    return tr.t('preferences.keyFromNeither', {
      name: binding.name, code, model: hardware.label
    })
  }
  return tr.t('preferences.keyFromAndroid', { name: binding.name, code })
}

/**
 * L'infobulle entière d'une liaison : d'où vient le nom, puis le renvoi à la note du
 * bloc quand notre relevé n'a pas pressé ce code-là.
 *
 * Une seule infobulle, sur l'élément entier, plutôt qu'une par morceau : deux `title`
 * imbriqués ne se lisent jamais tous les deux, et le survol ne dirait alors qu'une moitié
 * de ce qu'il y a à savoir.
 *
 * ⚠️ **Elle ne porte plus l'hypothèse.** Celle-ci s'écrit en clair sous le bloc — voir
 * `hypothesisNotes` — parce qu'un statut d'interprétation ne peut pas dépendre d'un
 * survol : au doigt, il n'y a pas de survol du tout. Ce qui reste ici est une glose sur
 * ce que la ligne montre déjà, et la ligne porte désormais la marque qui l'annonce.
 */
export function bindingTitle(
  binding: KeyBinding, keys: BindingContext | undefined, tr: Translator
): string | undefined {
  const parts = [bindingOrigin(binding, keys, tr)]
  const hardware = keys?.hardware
  if (!binding.unset && hardware != null && keyCodeEvidence(hardware, binding.code) !== 'pressed') {
    parts.push(tr.t('preferences.keyNoteBelow'))
  }
  const said = parts.filter((one): one is string => one !== undefined).join(' ')
  return said === '' ? undefined : said
}

/**
 * Les hypothèses que portent les codes que **ni** l'appui **ni** le noyau n'expliquent —
 * une phrase par code, **en clair sous le bloc**, jamais en infobulle.
 *
 * ⚠️ **C'est une hypothèse, et la phrase le dit avant toute chose.** 266 est le code que
 * le pilote presse le plus en compétition : le laisser nu serait pire que de le dire mal,
 * mais l'expliquer serait pire encore. Ce qu'on sait tient en un fait — aucun périphérique
 * d'entrée du boîtier ne peut le produire — et une piste : une application installée peut
 * injecter un événement sans qu'aucune touche l'émette.
 *
 * ## Pourquoi elle a quitté l'infobulle
 *
 * Elle n'a vécu qu'un jour dans un `title`, et le pilote-testeur du 2026-08-22 l'a dit
 * en une phrase : « inatteignable au tactile ». Rien ne signalait qu'il y avait quelque
 * chose à survoler, et sur une tablette — l'appareil de travail de ce projet — il n'y a
 * pas de survol du tout. Sans elle, `KEYCODE_STEM_2` se lit avec exactement la même
 * autorité que `KEYCODE_VOLUME_UP` : c'est précisément la distinction mesuré/supposé que
 * ce dépôt existe pour tenir.
 *
 * Elle nomme donc le code, puisqu'elle est écrite une fois par bloc et non sur la ligne —
 * même parti pris que `hardwareNote` et que la phrase de refus.
 *
 * Elle ne s'écrit que sur le modèle où le constat a été fait : d'un autre boîtier, nous ne
 * savons pas quelles applications y sont posées.
 */
export function hypothesisNotes(
  bindings: readonly KeyBinding[], keys: BindingContext | undefined, tr: Translator
): string[] {
  const hardware = keys?.hardware
  const domains = keys?.domains
  if (hardware == null || domains === undefined) return []
  // Une phrase par **code**, pas par ligne : deux lignes portent 266 sur l'écran des
  // touches, et la même phrase deux fois de suite se lit zéro fois.
  const said = new Map<number, string>()
  for (const binding of bindings) {
    if (binding.unset || said.has(binding.code)) continue
    if (keyCodeEvidence(hardware, binding.code) !== 'unattested') continue
    const unexplained = domains.unexplainedCode(binding.code)
    if (unexplained === null || unexplained.deviceId !== hardware.deviceId) continue
    if (unexplained.suspectPackage === undefined) continue
    // `code` part en **`string`** : c'est un code Android, pas un compte.
    said.set(binding.code, tr.t('preferences.keyInjectionHypothesis', {
      code: String(binding.code), addon: unexplained.suspectPackage
    }))
  }
  return [...said.values()]
}

/** Les trois morceaux en une phrase, pour le texte de la ligne et pour le filtre. */
export function bindingText(parts: BindingParts): string {
  const named = parts.detail === undefined ? parts.key : `${parts.key} (${parts.detail})`
  return `${named}, ${parts.press}`
}

/**
 * Lequel des trois crans s'applique à cette liaison, ou `undefined` quand il n'y a rien
 * à marquer — pas de touche affectée, ou pas de relevé pour ce modèle.
 *
 * ⚠️ `'pressed'` ne se marque pas : c'est le cas ordinaire. Ce que la ligne signale, ce
 * sont les deux autres — et elle les distingue, parce qu'un code que le noyau déclare
 * n'est pas un code inconnu du matériel.
 */
export function bindingEvidence(
  binding: KeyBinding | undefined, hardware: HardwareKeySurvey | null | undefined
): 'declared' | 'unattested' | undefined {
  if (binding === undefined || binding.unset) return undefined
  if (hardware === undefined || hardware === null) return undefined
  const evidence = keyCodeEvidence(hardware, binding.code)
  return evidence === 'pressed' ? undefined : evidence
}

/**
 * Ce que notre relevé de touches physiques dit des liaisons d'un bloc, ou `undefined`
 * s'il n'en dit rien.
 *
 * ⚠️ **C'est la phrase la plus délicate de cette page.** Elle parle de matériel, et le
 * relevé ne couvre qu'un modèle quand le parc n'est pas homogène : sur un AIR³ plus
 * récent, un code sans écho ici peut commander une vraie touche. Elle ne dira donc
 * jamais qu'une touche n'existe pas ni qu'un réglage est sans effet — elle nomme le
 * modèle du relevé, énumère ce qu'il porte, et s'arrête là. Le pilote conclut.
 *
 * Elle est écrite **une fois par bloc**, comme la phrase de refus juste à côté et pour
 * la même raison : deux lignes de suite portant le même paragraphe le font lire zéro
 * fois. Chaque ligne concernée garde sa marque et son infobulle.
 *
 * Deux propos, et un silence :
 *
 * - le modèle du fichier **est** celui du relevé, et un code n'est aucune des touches
 *   relevées : on énumère ce qu'on a relevé, et on s'arrête ;
 * - le modèle du fichier **n'a pas** été relevé : on dit qu'on ne sait pas, parce que le
 *   silence se lirait sinon comme un acquiescement ;
 * - aucune touche n'est affectée, ou rien n'a été relevé du tout : rien à dire.
 */
export function hardwareNote(
  bindings: readonly KeyBinding[], hardware: HardwareKeySurvey | null | undefined,
  surveys: readonly HardwareKeySurvey[], device: string | undefined, tr: Translator,
  labels: string
): string | undefined {
  const assigned = bindings.filter((one) => !one.unset)
  if (assigned.length === 0) return undefined

  if (hardware === undefined || hardware === null) {
    if (surveys.length === 0) return undefined
    // Une colonne de données — des noms de modèles — se joint par `', '` : `format.list`
    // en ferait « l'AIR³ 7.2 et le … », une prose là où il y a une liste.
    const models = surveys.map((one) => one.label).join(', ')
    // Deux phrases entières et non un fragment interchangeable : l'origine du fichier est
    // au milieu de la phrase, et rien ne garantit qu'elle y reste dans les cinq langues.
    return device === undefined
      ? tr.t('preferences.hardwareUnsurveyedUnknownDevice', { models })
      : tr.t('preferences.hardwareUnsurveyedOtherDevice', { models, device })
  }

  const codesOf = (evidence: 'declared' | 'unattested'): number[] =>
    [...new Set(assigned
      .filter((one) => keyCodeEvidence(hardware, one.code) === evidence)
      .map((one) => one.code))].sort((a, b) => a - b)
  const declared = codesOf('declared')
  const unattested = codesOf('unattested')
  if (declared.length === 0 && unattested.length === 0) return undefined

  // ⚠️ Le nom d'une touche est un **libellé de XCTrack**, dans la langue du fichier
  // ouvert. Une touche que XCTrack ne nomme pas garde son nom Android : la note énumère
  // ce que le boîtier porte, elle n'invente pas de mot pour le dire.
  const listed = hardware.keys
    .map((one) => `${hardwareKeyLabel(one.code, labels) ?? one.name} (${String(one.code)})`)
    .join(', ')
  // Deux phrases séparées, et non une seule qui mélangerait les deux crans : un code que
  // le noyau déclare est possible sur ce matériel, un code qu'il ignore ne l'est pas —
  // et rien de ce qu'on peut dire du second ne vaut pour le premier.
  const missing = [
    declared.length === 0
      ? undefined
      : tr.t(declared.length === 1
        ? 'preferences.hardwareDeclaredOne'
        : 'preferences.hardwareDeclaredMany', { codes: declared.join(', ') }),
    unattested.length === 0
      ? undefined
      : tr.t(unattested.length === 1
        ? 'preferences.hardwareStrangerOne'
        : 'preferences.hardwareStrangerMany', { codes: unattested.join(', ') })
  ].filter((one): one is string => one !== undefined).join(' ')
  return tr.t('preferences.hardwareSurveyed', {
    model: hardware.label,
    keys: tr.t('preferences.physicalKeyCount', { count: hardware.keys.length }),
    listed,
    missing
  })
}

/**
 * Pourquoi certaines touches de ce bloc portent un nom en toutes lettres et d'autres un
 * `KEYCODE_*`. Écrite **en clair sous le bloc**, pas seulement en infobulle.
 *
 * Le pilote-testeur du 2026-08-22 a lu « volume haut » deux lignes au-dessus de
 * `KEYCODE_STEM_2` et en a conclu à une traduction oubliée. Ce n'en est pas une : c'est
 * une mesure qui manque, et le dire vaut mieux que laisser croire à une négligence.
 *
 * ⚠️ Elle dit **trois** crans depuis le 2026-08-22 et non deux : pressée à la main,
 * déclarée par le noyau du boîtier, attestée nulle part. Le cran du milieu existe parce
 * que `getevent -pl` a montré que `sn7326-key` déclare 27 — le code que
 * `Keys.PrevWaypoint` porte dans le corpus.
 *
 * Elle ne s'écrit que quand les deux provenances sont **effectivement** à l'écran, ou
 * qu'un `KEYCODE_*` y est seul : sur un bloc où tout est nommé par le relevé, elle
 * expliquerait une asymétrie qui n'apparaît pas.
 */
export function keyNamingNote(
  bindings: readonly KeyBinding[], hardware: HardwareKeySurvey | null | undefined,
  tr: Translator
): string | undefined {
  const assigned = bindings.filter((one) => !one.unset)
  if (assigned.length === 0) return undefined
  const named = (one: KeyBinding): boolean =>
    hardware?.keys.some((key) => key.code === one.code) === true
  if (assigned.every(named)) return undefined
  return tr.t('preferences.keyNamingOrigin')
}

/** Au-delà, une valeur scalaire est abrégée à l'affichage. */
const LONG_VALUE = 80

/**
 * La valeur telle qu'on la lit, et non telle qu'elle s'écrit.
 *
 * Une valeur structurée n'est **jamais** dépliée : `Navigation.State` porte la tâche en
 * cours avec ses coordonnées, `Sounds` la table des sons. On en dit la nature et la
 * taille, ce qui suffit à savoir qu'elle est là et ce qu'elle pèse.
 */
export function readableValue(
  node: JsonNode, entry: PreferenceEntry | undefined, catalog: PreferenceCatalog,
  key: string, tr: Translator, keys?: BindingContext
): string {
  const size = (count: number): string => tr.t('preferences.characterCount', { count })

  if (node.kind === 'object') {
    // « objet JSON » est le mot du format, pas celui du pilote : ce qu'il voit, c'est une
    // valeur qui en contient d'autres, et dont on lui dit la taille faute de la déplier.
    return tr.t('preferences.structuredValue', { size: size(structuredSize(node)) })
  }
  if (node.kind === 'array') {
    const count = node.items.length
    return count === 0
      ? tr.t('preferences.emptyList')
      : tr.t('preferences.listValue', { count, size: size(structuredSize(node)) })
  }

  const text = scalarText(node) ?? node.raw

  if (entry?.control === 'color') {
    const value = Number(text)
    return Number.isFinite(value) ? androidColorToHex(value) : text
  }
  if (entry?.valueKind === 'boolean' || entry?.control === 'checkbox') {
    if (text === 'true') return tr.t('preferences.yes')
    if (text === 'false') return tr.t('preferences.no')
  }
  // Une touche non attribuée vaut -1 : « -1 » ne dit rien, « aucune touche » dit tout.
  if (entry?.family === 'Keys' && entry.control === 'action') {
    if (text === '-1') return tr.t('preferences.noKeyAssigned')
    // Sans les domaines, on en reste au code brut : mieux vaut un entier nu qu'un nom
    // deviné. Avec eux, la touche et l'appui long se disent séparément.
    const raw = Number(text)
    const binding = keys?.domains === undefined || !Number.isInteger(raw)
      ? undefined
      : keys.domains.decodeKeyBinding(raw)
    return binding === undefined
      ? tr.t('preferences.rawCode', { code: text })
      : bindingText(bindingParts(binding, keys, tr))
  }

  const choices = entry === undefined ? [] : catalog.values(key)
  const choice = choices.find((one) => one.value === text)
  if (choice !== undefined) return choice.label
  if (choices.length > 0 && node.kind === 'string') {
    // Une valeur hors du domaine que l'écran propose : dite comme telle, jamais masquée.
    return text === ''
      ? tr.t('preferences.emptyValue')
      : tr.t('preferences.offCatalogue', { value: text })
  }

  if (node.kind === 'string' && text === '') return tr.t('preferences.emptyValue')
  // Une chaîne très longue — `EventMapping` d'une vieille version en fait 140 — mettrait
  // cinq lignes dans une colonne de valeurs. On en montre le début et la longueur ; le
  // texte entier reste dans `raw`, donc dans le document, intact.
  if (text.length > LONG_VALUE) {
    return tr.t('preferences.truncatedValue', {
      start: text.slice(0, LONG_VALUE - 20), size: size(text.length)
    })
  }
  // `unit` vaut parfois la chaîne vide dans les ressources (`ActiveLook.Luma`) : coller
  // une unité vide laisserait une espace en fin de valeur, visible et fausse.
  //
  // La valeur et son unité se posent côte à côte sans passer par le catalogue : ce sont
  // deux **données** — l'une du fichier, l'autre du catalogue de XCTrack —, pas une
  // phrase, et aucune langue ne les sépare autrement que par une espace.
  const unit = entry?.unit === undefined ? '' : entry.unit.trim()
  return unit === '' ? text : `${text} ${unit}`
}

/** Le défaut du catalogue, dit exactement comme la valeur du fichier l'est. */
function readableDefault(
  value: boolean | number | string, entry: PreferenceEntry, catalog: PreferenceCatalog,
  key: string, tr: Translator
): string {
  const node: JsonNode = typeof value === 'string'
    ? { kind: 'string', raw: JSON.stringify(value) }
    : { kind: 'literal', raw: String(value) }
  return readableValue(node, entry, catalog, key, tr)
}

/** La forme canonique d'un défaut, pour la comparaison au texte du fichier. */
function defaultAsText(value: boolean | number | string): string {
  return typeof value === 'string' ? value : String(value)
}

/**
 * Vrai si la valeur du fichier est celle du relevé.
 *
 * La comparaison se fait sur le texte, puis sur le nombre : XCTrack écrit tantôt `100`,
 * tantôt `"100"` pour la même préférence (`Display.WidgetTitleSize` est une liste de
 * chaînes dont le défaut est déclaré en chaîne), et `1013` vaut `1013.0`.
 */
export function sameAsDefault(fileText: string, defaultValue: boolean | number | string): boolean {
  const expected = defaultAsText(defaultValue)
  if (fileText === expected) return true
  const a = Number(fileText)
  const b = Number(expected)
  return fileText.trim() !== '' && expected.trim() !== '' &&
    Number.isFinite(a) && Number.isFinite(b) && a === b
}

/* ---------------------------------------------------------------- construction des lignes */

interface RowContext {
  catalog: PreferenceCatalog
  /** Le traducteur de **notre prose** — jamais celui des libellés de XCTrack. */
  tr: Translator
  /** La langue des **libellés de XCTrack**, celle du catalogue chargé. L'autre axe. */
  labels: string
  file: Map<string, JsonNode>
  /** Les clés que XCTrack se contredit lui-même à défaillir — voir `meta.defaultConflicts`. */
  conflicts: Set<string>
  /** Les domaines relevés, s'ils ont été chargés. Sans eux, la page reste ce qu'elle était. */
  domains?: PreferenceDomainCatalog
  /**
   * Le relevé de touches physiques du modèle que **ce fichier-ci** déclare.
   *
   * `null` est la réponse normale — un seul modèle a été relevé — et veut dire « nous ne
   * savons pas ce que porte cet appareil-là », jamais « il ne porte rien ».
   */
  hardware?: HardwareKeySurvey | null
}

/**
 * Les réglages dont le **libellé de XCTrack** emploie un mot qu'un pilote ne peut pas
 * connaître, et pour lesquels l'APK ne donne aucune légende.
 *
 * ⚠️ **Le libellé ne se réécrit pas.** « Lance une intention Android » est la chrome
 * française de XCTrack, extraite de l'APK : c'est le mot que le pilote lira sur son
 * appareil, et le traduire autrement lui donnerait un terme introuvable là-bas. Ce que
 * nous pouvons faire — ce que le pilote-testeur du 2026-08-22 demandait, « en français ça
 * ne veut rien dire du tout » — c'est **l'expliquer à côté**, dans notre voix et dans la
 * langue de l'interface.
 *
 * La table reste minuscule à dessein : un mot n'y entre que si un pilote a buté dessus.
 */
const GLOSSED_KEYS: Readonly<Record<string, 'preferences.intentGloss' | undefined>> = {
  'Keys.IntentLaunch': 'preferences.intentGloss'
}

function buildRow(key: string, ctx: RowContext): PreferenceRow {
  const { catalog, file, tr } = ctx
  const entry = catalog.preference(key)
  const node = file.get(key)
  const labelled = catalog.hasLabel(key)

  const row: PreferenceRow = {
    key,
    label: catalog.label(key),
    labelled,
    control: entry?.control ?? null,
    scope: entry?.scope ?? null,
    state: 'undecidable',
    structured: node !== undefined && (node.kind === 'object' || node.kind === 'array'),
    family: entry?.family ?? (key.includes('.') ? key.slice(0, key.indexOf('.')) : '')
  }

  const help = catalog.help(key)
  const gloss = GLOSSED_KEYS[key]
  if (gloss !== undefined) row.gloss = tr.t(gloss)
  if (entry?.personal !== undefined) row.personal = entry.personal

  if (node === undefined) {
    if (help !== undefined) row.help = applyPattern(help, undefined)
    // Une clé absente n'est pas une clé réglée au défaut : c'est l'information même que
    // cette page doit rendre, et elle a son propre état.
    row.state = entry !== undefined && entry.declared ? 'absent' : 'unwritten'
    if (entry?.default !== undefined && entry.defaultSource !== 'runtime') {
      row.defaultText = readableDefault(entry.default, entry, catalog, key, tr)
    }
    if (entry?.defaultSource === 'runtime') {
      row.undecidableReason = tr.t(RUNTIME_DEFAULT_REASON)
    }
    return row
  }

  row.value = readableValue(node, entry, catalog, key, tr, ctx)
  if (entry?.family === 'Keys' && entry.control === 'action' && ctx.domains !== undefined) {
    const raw = Number(scalarText(node) ?? '')
    if (Number.isInteger(raw)) {
      row.binding = ctx.domains.decodeKeyBinding(raw)
      row.keyEvidence = bindingEvidence(row.binding, ctx.hardware)
    }
  }
  if (help !== undefined) row.help = applyPattern(help, row.value)
  row.raw = node.kind === 'object' || node.kind === 'array'
    ? serializeJson(node, PREFERENCE_INDENT)
    : node.raw

  if (entry === undefined) {
    row.undecidableReason = tr.t('preferences.unknownSettingReason')
    return row
  }

  if (ctx.conflicts.has(key) && entry.default !== undefined && entry.xmlDefault !== undefined) {
    row.state = 'conflict'
    row.defaultText = readableDefault(entry.default, entry, catalog, key, tr)
    row.otherDefaultText = readableDefault(entry.xmlDefault, entry, catalog, key, tr)
    return row
  }

  if (entry.defaultSource === 'runtime') {
    row.undecidableReason = tr.t(RUNTIME_DEFAULT_REASON)
    return row
  }
  if (entry.default === undefined) {
    row.undecidableReason = tr.t('preferences.noFactoryValueInCatalogue')
    return row
  }

  row.defaultText = readableDefault(entry.default, entry, catalog, key, tr)
  const text = scalarText(node)
  if (text === undefined) {
    // Une valeur structurée face à un défaut scalaire : on ne compare pas des formes
    // différentes, on le dit.
    row.undecidableReason = tr.t('preferences.structuredVsScalar')
    return row
  }
  row.state = sameAsDefault(text, entry.default) ? 'default' : 'custom'
  return row
}

/**
 * Substitue la valeur dans un gabarit de ressource Android — `%d`, `%s`, `%f` — et
 * réduit `%%` au signe pour cent qu'il représente.
 *
 * Un seul texte du catalogue en porte (`_ttsSpeed` : « Régler la vitesse de lecture
 * (50 à 200%%): %d%% »), mais l'afficher tel quel montrerait au pilote le gabarit et non
 * la phrase. Même règle que `applyLabelPattern` dans `properties.ts` : c'est ce que
 * XCTrack fait lui-même à l'affichage.
 *
 * Sans valeur — la clé est absente du fichier — le trou est marqué par des points de
 * suspension plutôt que rempli : on ne devine pas ce qui n'est pas écrit.
 */
export function applyPattern(text: string, value: string | undefined): string {
  return text.replace(/%(\d+\$)?(\.\d+)?[dsf]/g, value ?? '…').replace(/%%/g, '%')
}

/** La clé du message, pas la phrase : celle-ci vit dans le catalogue, en cinq langues. */
const RUNTIME_DEFAULT_REASON = 'preferences.runtimeDefaultReason' satisfies MessageKey

/**
 * Vrai si la page sait présenter cette clé sous son libellé, dans son écran.
 *
 * `control !== null` écarte les 86 clés qu'aucun écran de réglages ne montre — de l'état
 * sérialisé pour une part, des réglages d'écrans construits en code pour le reste. Le
 * libellé écarte le peu qui resterait sans nom.
 *
 * `declared` n'entre **pas** dans ce filtre, contrairement à ce qu'on ferait pour bâtir
 * une page de réglages depuis le catalogue seul : `SafeSky.Interval`, `_ttsSpeed` et
 * `_ttsPitch` ne sont pas déclarées par la classe de configuration mais portent un
 * libellé, une liste de valeurs, et figurent bel et bien dans un fichier réel. Les
 * écarter les ferait disparaître d'une page qui, elle, part du fichier. `declared` sert
 * ailleurs : à distinguer « absente » de « jamais écrite ».
 */
export function isPresentable(catalog: PreferenceCatalog, key: string): boolean {
  const entry = catalog.preference(key)
  return entry !== undefined && entry.control !== null && catalog.hasLabel(key)
}

/* -------------------------------------------------------------------------- l'écriture */

/**
 * Les contrôles que la page sait offrir honnêtement.
 *
 * `action` en est absent, et c'est la décision qui écarte le plus de lignes (18) : sur
 * l'appareil, ces lignes ouvrent une boîte — capturer une touche, choisir une adresse,
 * bâtir une table de sons — dont ni le domaine ni l'effet de bord ne sont relevés ici.
 * `button` et `screen` ne portent pas de valeur du tout.
 */
export const EDITABLE_CONTROLS: ReadonlySet<PreferenceControl> =
  new Set<PreferenceControl>(['checkbox', 'list', 'slider', 'number', 'text', 'color'])

/**
 * Pourquoi cette ligne-là ne se règle pas, ou `undefined` si elle se règle.
 *
 * Rendre la **raison** plutôt qu'un booléen : la ligne reste affichée, et une ligne qui
 * ne se règle pas doit dire pourquoi — sans quoi le pilote croit à une panne.
 */
export function editRefusal(row: PreferenceRow, tr: Translator): string | undefined {
  if (row.reason !== undefined) {
    if (row.reason === 'unknown') return tr.t('preferences.refusalUnknown')
    if (row.reason === 'state') return tr.t('preferences.refusalState')
    return tr.t('preferences.refusalUnlabelled')
  }
  if (row.structured) return tr.t('preferences.refusalStructured')
  if (row.control === null || !EDITABLE_CONTROLS.has(row.control)) {
    // `preferences.refusalAction` est formulé **sans nombre** : la même phrase sert
    // d'infobulle sur une ligne et de note sous un bloc de quinze.
    //
    // Elle disait « dont cet éditeur ne relève pas le domaine ». Ce n'est plus vrai des
    // touches : leur codage est relevé, et la ligne se lit. Ce qui manque est ailleurs,
    // et c'est du matériel — une touche se règle en la pressant sur l'instrument, ce
    // qu'un navigateur posé devant un autre appareil ne peut pas faire.
    if (row.control === 'action') return tr.t('preferences.refusalAction')
    return tr.t('preferences.refusalNoValue')
  }
  return undefined
}

/**
 * Vrai si la valeur de cette clé s'écrit entre guillemets.
 *
 * Le témoin le plus sûr est **ce que le fichier porte déjà** : XCTrack écrit tantôt `100`,
 * tantôt `"100"` pour des réglages voisins, et rien dans le catalogue ne le prédit
 * mieux que le fichier lui-même. Pour une clé absente, c'est le type du défaut relevé qui
 * tranche — c'est lui que XCTrack écrira le jour où il l'écrira.
 */
export function writesString(
  entry: PreferenceEntry | undefined, current: JsonNode | undefined
): boolean {
  if (current?.kind === 'string') return true
  if (current?.kind === 'literal') return false
  if (typeof entry?.default === 'string') return true
  if (entry?.default !== undefined) return false
  return entry?.valueKind === 'string' || entry?.valueKind === 'enum'
}

/** Ce qu'une écriture a réellement fait au document. */
export type WriteOutcome = 'set' | 'inserted' | 'unchanged'

/**
 * Écrit une valeur de préférence, et **rien d'autre**.
 *
 * `text` est la valeur telle qu'on la lit : le contenu d'une chaîne sans ses guillemets,
 * le texte source exact d'un littéral. Ce n'est jamais un nombre JavaScript — c'est
 * précisément ce qui interdit à `JSON.stringify` de réécrire `3.0` en `3`.
 *
 * Rend `'unchanged'` sans rien écrire quand la valeur demandée est déjà celle du fichier.
 * Deux comparaisons, dans cet ordre :
 *
 * 1. **le texte source**, qui suffit dans l'immense majorité des cas et préserve la forme
 *    exacte du fichier (`1.0E7`, `-0.0`, un entier au-delà de 2^53) ;
 * 2. **le nombre**, pour les littéraux seulement, parce qu'un champ numérique de
 *    navigateur normalise ce qu'il affiche : reposer `3.0` par un `<input type="number">`
 *    revient avec `3`, et réécrire serait dégrader une valeur que le pilote n'a pas
 *    changée. `===` et non `Object.is` : `-0.0` face à `0` est traité comme inchangé,
 *    donc préservé, ce qui est le sens conservateur.
 *
 * ⚠️ Cette seconde comparaison passe par `Number`, qui perd la précision au-delà de
 * 2^53 : deux entiers énormes distincts peuvent s'y égaler, et l'écriture serait alors
 * refusée. Refuser une écriture est sans conséquence ; en accepter une qui dégrade ne
 * l'est pas. Aucune préférence présentable ne porte de tel entier.
 *
 * Une clé absente est **insérée en fin de section** : voir `insertRaw` dans
 * `core/access` — c'est la seule position qui ne déplace, ne réécrit et ne réindente
 * aucune clé existante.
 */
export function writePreference(
  document: JsonNode, key: string, text: string, asString: boolean
): WriteOutcome {
  const section = getMember(document, 'preferences')
  if (section === undefined || section.kind !== 'object') {
    throw new Error('writePreference : ce document n’a pas de section « preferences »')
  }
  const current = getMember(section, key)

  if (asString) {
    if (current === undefined) {
      insertString(section, key, encode(text))
      return 'inserted'
    }
    if (current.kind === 'string' && decode(current.raw) === text) return 'unchanged'
    setString(section, key, encode(text))
    return 'set'
  }

  if (current === undefined) {
    insertLiteral(section, key, text)
    return 'inserted'
  }
  if (current.kind === 'literal') {
    if (current.raw === text) return 'unchanged'
    const before = Number(current.raw)
    const after = Number(text)
    if (Number.isFinite(before) && Number.isFinite(after) && before === after) return 'unchanged'
  }
  setLiteral(section, key, text)
  return 'set'
}

/**
 * Retire une préférence du fichier, et rend combien d'occurrences ont disparu.
 *
 * C'est l'exact inverse de l'insertion : la clé cesse d'être écrite, et le fichier ne dit
 * plus rien de ce réglage — à l'import, l'appareil gardera le sien
 * (`ABSENT_KEY_ON_IMPORT`). **Toutes** les occurrences partent — `removeMember` le fait, et
 * c'est la seule postcondition prévisible après un geste de suppression ; n'en retirer
 * qu'une laisserait le réglage en place avec la valeur du doublon, sans signal.
 *
 * Rend `0` sur une clé absente, sans lever : le résultat demandé est déjà là.
 */
export function removePreference(document: JsonNode, key: string): number {
  const section = getMember(document, 'preferences')
  if (section === undefined || section.kind !== 'object') {
    throw new Error('removePreference : ce document n’a pas de section « preferences »')
  }
  return removeMember(section, key)
}

/** Ce qu'une écriture vient de faire, tel que l'assembleur a besoin de le savoir. */
export interface PreferenceEdit {
  key: string
  /** Le libellé du réglage, celui que la ligne affiche. */
  label: string
  /**
   * `set` : une valeur remplacée. `inserted` : une clé que le fichier ne portait pas,
   * désormais écrite. `removed` : l'inverse, une clé retirée du fichier, qui fait taire
   * la sauvegarde sur ce réglage.
   */
  outcome: 'set' | 'inserted' | 'removed'
  /** La valeur désormais écrite, telle qu'on la lit. Vide pour un retrait. */
  text: string
  /** Une phrase pour l'historique : « Régler Thème ». */
  description: string
  /**
   * Vrai pour un contrôle qui émet en continu — curseur, champ numérique. L'assembleur
   * regroupe alors les pas d'historique, comme il le fait pour le panneau des gadgets.
   */
  continuous: boolean
  /**
   * Défini quand l'écriture vient de **renseigner** une donnée personnelle : la clé en
   * porte une, et la valeur écrite n'est pas vide. Une clé personnelle vidée ne le
   * déclenche pas — c'est le contraire d'un risque.
   */
  personal?: PersonalData
}

/* ------------------------------------------------------------------------- l'inventaire */

/**
 * Tout ce que la page a besoin de savoir, calculé sans toucher au DOM.
 *
 * Séparé du rendu pour deux raisons : les comptes se testent sans navigateur, et un
 * appelant qui voudrait seulement le résumé (un bandeau, un avertissement) n'a pas à
 * construire la page.
 */
export function buildPreferenceInventory(
  document: JsonNode, catalog: PreferenceCatalog, tr: Translator,
  domains?: PreferenceDomainCatalog
): PreferenceInventory {
  const file = readFilePreferences(document)
  const ctx: RowContext = {
    catalog,
    tr,
    // La langue **réellement** chargée, pas celle qui a été demandée : c'est celle que
    // l'écran montre, et donc celle dans laquelle il doit nommer les touches.
    labels: catalog.language,
    file,
    conflicts: new Set(catalog.meta.defaultConflicts),
    domains,
    // Résolu une fois pour tout le fichier : c'est l'appareil du fichier, pas celui
    // d'une ligne. `null` quand le modèle n'a pas été relevé — le cas ordinaire.
    hardware: domains?.hardwareKeysFor(fileDevice(document)) ?? null
  }

  const inventory = collectPersonalData(document)

  const summary: PreferencesSummary = {
    empty: !hasPreferencesSection(document) || file.size === 0,
    fileKeyCount: file.size,
    presentedCount: 0,
    customCount: 0,
    defaultCount: 0,
    undecidableCount: 0,
    conflictCount: 0,
    absentCount: 0,
    unwrittenCount: 0,
    unlabelledCount: 0,
    stateCount: 0,
    unknownCount: 0,
    personalCount: 0,
    personalCounts: inventory.counts,
    neverExportedCount: 0
  }

  // Un fichier sans préférence ne se décrit pas par 93 lignes « absente » : il se dit en
  // une phrase. Compter des manques dans un export qui n'a jamais prétendu les porter
  // serait un reproche adressé au fichier, pas un renseignement.
  if (summary.empty) return { summary, menu: [], leftovers: [], personal: [] }

  const presented = new Set<string>()
  const menu = buildMenu(ctx, presented, summary)
  const leftovers = buildLeftovers(ctx, presented, summary)

  const personal: PreferenceRow[] = []
  for (const key of file.keys()) {
    if (catalog.preference(key)?.personal === undefined) continue
    summary.personalCount += 1
    personal.push(buildRow(key, ctx))
  }

  return { summary, menu, leftovers, personal }
}

function countState(summary: PreferencesSummary, state: PreferenceState): void {
  if (state === 'custom') summary.customCount += 1
  else if (state === 'default') summary.defaultCount += 1
  else if (state === 'undecidable') summary.undecidableCount += 1
  else if (state === 'conflict') summary.conflictCount += 1
  else if (state === 'absent') summary.absentCount += 1
  else summary.unwrittenCount += 1
}

function buildMenu(
  ctx: RowContext, presented: Set<string>, summary: PreferencesSummary
): PreferenceMenuEntry[] {
  const { catalog } = ctx
  const root = catalog.screen('preferences')
  if (root === undefined) return []

  const entries: PreferenceMenuEntry[] = []
  for (const menuRow of root.rows) {
    const menuKey = menuRow.key ?? ''
    const title = (menuRow.title === undefined ? undefined : catalog.text(menuRow.title))
      ?? menuRow.titleText ?? menuKey
    const screens: PreferenceScreenBlock[] = []
    for (const link of MENU_SCREENS[menuKey] ?? []) {
      const block = buildScreen(link, title, ctx, presented, summary)
      if (block !== undefined) screens.push(block)
    }
    const entry: PreferenceMenuEntry = { menuKey, title, screens }
    if (screens.length === 0) {
      const note = MENU_NOTES[menuKey]
      if (note !== undefined) entry.note = note(ctx.tr)
      const tally = tallyFamilies(ctx, MENU_FAMILIES[menuKey])
      if (tally !== undefined) entry.tally = tally
    }
    entries.push(entry)
  }
  return entries
}

/** Combien de clés de ces familles ce fichier porte, et combien d'entre elles sont nommées. */
function tallyFamilies(
  ctx: RowContext, families: readonly string[] | undefined
): { total: number; labelled: number } | undefined {
  if (families === undefined) return undefined
  let total = 0
  let labelled = 0
  for (const key of ctx.file.keys()) {
    const family = ctx.catalog.preference(key)?.family
    if (family === undefined || !families.includes(family)) continue
    total += 1
    if (isPresentable(ctx.catalog, key)) labelled += 1
  }
  return total === 0 ? undefined : { total, labelled }
}

/** Le titre de la ligne qui ouvre un écran, cherchée dans tous les écrans du catalogue. */
function openerTitle(catalog: PreferenceCatalog, key: string | undefined): string | undefined {
  if (key === undefined) return undefined
  for (const screen of catalog.screens) {
    for (const row of screen.rows) {
      if (row.key !== key) continue
      const translated = row.title === undefined ? undefined : catalog.text(row.title)
      const found = translated ?? row.titleText
      if (found !== undefined) return found
    }
  }
  return undefined
}

function buildScreen(
  link: ScreenLink, menuTitle: string, ctx: RowContext,
  presented: Set<string>, summary: PreferencesSummary
): PreferenceScreenBlock | undefined {
  const { catalog } = ctx
  const screenId = link.id
  const screen = catalog.screen(screenId)
  if (screen === undefined) return undefined

  const title = (screen.title === null ? undefined : catalog.text(screen.title))
    ?? openerTitle(catalog, link.via) ?? menuTitle
  const blocks: PreferenceCategoryBlock[] = [{ rows: [] }]
  let neverExported = 0

  for (const line of screen.rows) {
    if (line.tag === 'PreferenceCategory') {
      const heading = (line.title === undefined ? undefined : catalog.text(line.title))
        ?? line.titleText
      blocks.push(heading === undefined ? { rows: [] } : { title: heading, rows: [] })
      continue
    }
    const key = line.key
    if (key === undefined || !isPresentable(catalog, key)) continue
    if (presented.has(key)) continue
    presented.add(key)

    // Une clé que l'export ne porte jamais ne s'affiche pas comme « absente » : elle
    // n'a aucune raison d'être là, et la compter parmi les manques serait faux.
    if (!catalog.isExported(key) && !ctx.file.has(key)) {
      neverExported += 1
      summary.neverExportedCount += 1
      continue
    }

    const row = buildRow(key, ctx)
    const block = blocks[blocks.length - 1]
    if (block !== undefined) block.rows.push(row)
    summary.presentedCount += 1
    countState(summary, row.state)
  }

  const kept = blocks.filter((block) => block.rows.length > 0)
  if (kept.length === 0 && neverExported === 0) return undefined
  return { id: screenId, title, blocks: kept, neverExported }
}

/**
 * Ce que le fichier porte et qu'aucun écran n'a montré. Dans l'ordre du fichier, parce
 * que c'est le seul ordre dont on soit sûr pour des clés que le catalogue ne classe pas.
 */
function buildLeftovers(
  ctx: RowContext, presented: Set<string>, summary: PreferencesSummary
): PreferenceRow[] {
  const rows: PreferenceRow[] = []
  for (const [key, node] of ctx.file) {
    if (presented.has(key)) continue
    const row = buildRow(key, ctx)
    row.reason = leftoverReason(ctx.catalog, key, node)
    if (row.reason === 'unknown') summary.unknownCount += 1
    else if (row.reason === 'state') summary.stateCount += 1
    else summary.unlabelledCount += 1
    rows.push(row)
  }
  return rows
}

/**
 * Pourquoi cette clé-là n'a pas trouvé sa place dans un écran.
 *
 * L'ordre des questions n'est pas indifférent. « Le catalogue ne la connaît pas » est le
 * fait le plus important — c'est un fichier d'une autre version — et il passe avant la
 * forme de la valeur. Ensuite c'est **le type JSON du fichier qui tranche**, et non le
 * catalogue : `Mapsforge.Terrain` est déclarée `json` mais porte la chaîne `"None"` dans
 * les deux fichiers du corpus, et l'afficher comme une ligne mémorisée serait faux.
 */
function leftoverReason(
  catalog: PreferenceCatalog, key: string, node: JsonNode
): LeftoverReason {
  if (!catalog.knows(key)) return 'unknown'
  if (node.kind === 'object' || node.kind === 'array') return 'state'
  return 'unlabelled'
}

/* ------------------------------------------------------------------------------ le rendu */

export interface PreferencesPageOptions {
  /**
   * Le document ouvert, tel que `openContainer` le rend.
   *
   * Sans `onEdit`, il n'est que **lu**. Avec, la page y écrit — par `writePreference`,
   * donc en ne touchant que le nœud de la clé réglée.
   */
  document: JsonNode
  /** Le catalogue déjà chargé, dans la langue voulue. Voir `openPreferencesPage`. */
  catalog: PreferenceCatalog
  /**
   * Le traducteur de **notre prose**, dans la langue que le pilote a choisie.
   *
   * ⚠️ Ce n'est **pas** l'axe de `catalog` : celui-ci porte les libellés de XCTrack, qui
   * suivent le fichier ouvert. Les deux se règlent séparément et ne se confondent jamais
   * — voir `src/i18n/axes.ts`. C'est l'assembleur qui détient le traducteur et le passe
   * ici, comme à chaque écran ; ce module ne va jamais le chercher.
   */
  tr: Translator
  /**
   * Les domaines relevés (unités, touches), s'ils ont pu être chargés.
   *
   * **Facultatif, et c'est délibéré** : sans eux la page reste exactement ce qu'elle
   * était — champ libre pour les huit `Unit.*`, code brut pour les quinze `Keys.*`. Une
   * page qui s'effondrerait faute d'un fichier de données annexe serait moins utile
   * qu'une page qui en sait moins.
   */
  domains?: PreferenceDomainCatalog
  /** Le nom du fichier, pour la tête de page. */
  fileName?: string
  /**
   * La langue dans laquelle les **libellés de XCTrack** s'affichent ici — celle du
   * catalogue chargé, donc celle que l'écran montre réellement.
   *
   * ⚠️ Ce n'est **pas** `tr.language`, qui est la langue de notre prose. Les deux axes ne
   * se confondent jamais — voir `src/i18n/axes.ts`.
   */
  labelLanguage?: string
  /**
   * Vrai quand cette langue-là vient du **fichier ouvert** (`Display.Language`), et non
   * du navigateur ni du sélecteur.
   *
   * ## Pourquoi la page a besoin de le savoir
   *
   * Un pilote-testeur a regardé les captures allemande, néerlandaise et espagnole de cet
   * écran et y a vu un défaut : « un écran presque entièrement en français ». Il n'y en
   * avait pas — notre prose suivait bien le globe, et les libellés suivaient le fichier,
   * qui déclare `Display.Language: fr`. C'est le comportement voulu.
   *
   * Mais sur les 8 800 px de cet écran, le mot « langue » n'apparaissait **pas une seule
   * fois** : la mention de l'axe vit dans le bandeau de faits de la vue d'ensemble
   * (`metaStrip`) et dans la boîte des langues, jamais ici. Le pilote a cherché
   * l'explication sur l'écran qu'il avait sous les yeux, ne l'y a pas trouvée, et en a
   * conclu à un bug. L'écran dit donc d'où viennent ses noms.
   *
   * ⚠️ **C'est un renseignement, pas un avertissement** : rien n'est en défaut.
   */
  labelsFromFile?: boolean
  /** `info.versionName` du fichier, pour dire d'où il vient. */
  fileVersionName?: string
  /** `info.versionCode` du fichier — il ne sert qu'à situer, jamais à filtrer. */
  fileVersionCode?: number
  /**
   * Branché sur le bouton « Fermer ». Sans lui, aucun bouton n'est construit : c'est
   * l'assembleur qui décide si la page se ferme, et comment.
   */
  onClose?: () => void
  /**
   * **Branché : la page devient modifiable.** Absent : elle reste ce qu'elle était, une
   * lecture sans le moindre contrôle de formulaire.
   *
   * Appelé après chaque écriture effective — jamais pour une valeur reposée à
   * l'identique. L'assembleur y enregistre le pas d'historique et marque le document ;
   * la page, elle, a déjà écrit et remis ses comptes à jour.
   */
  onEdit?: (edit: PreferenceEdit) => void
}

export interface PreferencesPage {
  element: HTMLElement
  summary: PreferencesSummary
  inventory: PreferenceInventory
  /** Vrai si la page construit des contrôles — c'est-à-dire si `onEdit` était branché. */
  editable: boolean
  /** Filtre les lignes affichées, sur le libellé et sur la clé. Chaîne vide : tout. */
  filter: (query: string) => void
  /** Retire la page du document et appelle `onClose`. Sans effet si déjà fermée. */
  close: () => void
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, className?: string, text?: string
): HTMLElementTagNameMap[K] {
  const node = window.document.createElement(tag)
  if (className !== undefined) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

/** Minuscules sans accents : « unité » doit trouver « Unités ». */
function normalize(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/*
 * `plural(count, singulier, pluriel)` a disparu, avec sa règle `count > 1` : c'est celle
 * du français, et elle seule. À zéro, l'anglais, le néerlandais, l'allemand et l'espagnol
 * mettent le pluriel. Chaque compte passe désormais par un message à deux formes, dont
 * chacune est une **phrase entière** — voir `src/i18n/plural.ts`.
 */

/** Ce que la marque d'état dit, en toutes lettres. */
export function stateLabel(row: PreferenceRow, tr: Translator): string {
  // Ni le mot « défaut », ni les signes = et ≠. Le premier se lit *anomalie* : « 46 au
  // défaut » annonçait 46 pannes, et « ≠ DÉFAUT (VIDE) » en capitales à côté du nom du
  // pilote lui désignait le sien. Les seconds sont des signes de mathématiques posés sur
  // ce nom. La valeur d'usine elle-même n'est pas perdue : `stateTitle` la dit en toutes
  // lettres, et l'infobulle a la place d'une phrase là où la marque n'a que trois mots.
  //
  // ⚠️ La collision de « défaut » est **française** : elle n'existe pas dans les quatre
  // autres langues, qui disent *factory value*, *Werkswert*, *fabriekswaarde*, *valor de
  // fábrica* sans avoir à trancher quoi que ce soit.
  if (row.state === 'custom') return tr.t('preferences.stateCustom')
  if (row.state === 'default') return tr.t('preferences.stateDefault')
  if (row.state === 'conflict') return tr.t('preferences.stateConflict')
  if (row.state === 'absent') return tr.t('preferences.stateAbsent')
  if (row.state === 'unwritten') return tr.t('preferences.stateUnwritten')
  return tr.t('preferences.stateUndecidable')
}

/** L'infobulle de la marque d'état : la phrase entière, pas l'abrégé. */
function stateTitle(row: PreferenceRow, tr: Translator): string {
  if (row.state === 'custom') {
    return row.defaultText === undefined
      ? tr.t('preferences.stateTitleCustomUnknown')
      : tr.t('preferences.stateTitleCustom', { factory: row.defaultText })
  }
  if (row.state === 'default') return tr.t('preferences.stateTitleDefault')
  if (row.state === 'conflict') {
    // Les deux valeurs restent dites, mais ici et non plus en capitales sur la ligne : ce
    // qui est incertain, c'est ce que XCTrack pose d'usine, jamais la valeur du pilote.
    return tr.t('preferences.stateTitleConflict', {
      code: row.defaultText ?? '?', screen: row.otherDefaultText ?? '?'
    })
  }
  if (row.state === 'absent') {
    // Le fait mesuré arrive **entier**, par un repère nommé : `ABSENT_KEY_ON_IMPORT`.
    const absent = tr.t(ABSENT_KEY_ON_IMPORT)
    return row.defaultText === undefined
      ? tr.t('preferences.stateTitleAbsent', { absent })
      : tr.t('preferences.stateTitleAbsentWithValue', { absent, factory: row.defaultText })
  }
  if (row.state === 'unwritten') return tr.t('preferences.stateTitleUnwritten')
  return row.undecidableReason ?? tr.t('preferences.stateTitleNoFactoryValue')
}

/*
 * Le vocabulaire — les mots de chaque nature, ceux de chaque base — vient de
 * `model/personalData.ts`, comme pour la bibliothèque, la boîte de partage et
 * l'avertissement d'export. Il était écrit ici ; le recopier ailleurs aurait fait dire
 * « identité » à un écran et « pilote » à un autre pour la même clé.
 */

/** La marque discrète qui signale une donnée personnelle. Sobre : le pilote décide. */
function personalMark(personal: PersonalData, ctx: PageContext): HTMLElement {
  const mark = el('span', 'prefs__personal', ctx.personal.kind(personal.kind))
  // `personal.reasonKey` vient du catalogue extrait de l'APK, qui porte une **clé** et
  // non une phrase : la raison se dit donc dans la langue du pilote comme le reste.
  mark.title = ctx.tr.t('preferences.personalMarkTitle', {
    reason: ctx.tr.t(personal.reasonKey), basis: ctx.personal.basis(personal.basis)
  })
  return mark
}

interface RenderedRow {
  element: HTMLElement
  haystack: string
  row: PreferenceRow
}

/**
 * Ce que le rendu d'une ligne a besoin de savoir. `edit` absent : la page est en lecture
 * seule et aucun contrôle n'est construit — voir l'en-tête de ce module.
 */
interface PageContext {
  collected: RenderedRow[]
  tr: Translator
  /** La langue des **libellés de XCTrack**, celle du catalogue chargé. L'autre axe. */
  labels: string
  /**
   * Les mots de l'inventaire des données personnelles, construits **une fois** pour la
   * page entière : un écran qui affiche cinquante lignes n'a pas à repasser le traducteur
   * cinquante fois. Voir `personalProse` dans `src/model/personalData.ts`.
   */
  personal: PersonalProse
  edit?: EditContext
  /**
   * Le relevé matériel du modèle de ce fichier, ou `null` s'il n'a pas été relevé.
   *
   * Il est ici et non seulement dans `edit` : lire une liaison de touche n'a rien à voir
   * avec le fait de pouvoir la changer, et la page en lecture seule la lit tout autant.
   */
  hardware?: HardwareKeySurvey | null
  /** Les domaines relevés, pour ce que le rendu doit en dire. */
  domains?: PreferenceDomainCatalog
  /** L'appareil que le fichier déclare (`info.device`), tel quel. */
  device?: string
}

/** Ce qu'il faut pour écrire, et pour dire à la page ce qui vient d'être écrit. */
interface EditContext {
  document: JsonNode
  catalog: PreferenceCatalog
  /** Le traducteur de notre prose, le même que celui de la page. */
  tr: Translator
  /** La langue des **libellés de XCTrack**, celle du catalogue chargé. L'autre axe. */
  labels: string
  conflicts: Set<string>
  /** Les domaines relevés, s'ils ont été chargés — voir l'en-tête. */
  domains?: PreferenceDomainCatalog
  /** Le relevé matériel du modèle de ce fichier, ou `null` s'il n'a pas été relevé. */
  hardware?: HardwareKeySurvey | null
  /**
   * Ce que vaut la comparaison au catalogue pour ce fichier — voir `catalogTrust`.
   *
   * Elle ne sert qu'au troisième geste, « Rétablir la valeur d'usine » : c'est le seul
   * qui écrive une valeur **relevée ailleurs** par-dessus une valeur que le pilote a
   * réglée lui-même. Les deux autres n'ont rien à avertir — ils ne changent pas le
   * comportement de l'appareil.
   */
  trust: CatalogTrust
  onEdit: (edit: PreferenceEdit) => void
  /** Rappelé après chaque écriture effective : bandeau, confidentialité, entrées masquées. */
  wrote: (row: PreferenceRow, previous: PreferenceState, edit: PreferenceEdit) => void
  /** Les champs de saisie qui portent une donnée personnelle, pour le masquage. */
  secrets: HTMLInputElement[]
}

/** Un identifiant unique par contrôle : `label.htmlFor` doit désigner quelque chose. */
let controlSeq = 0

/** La valeur en texte, telle que la page en lecture seule la montre. */
function readOnlyValue(row: PreferenceRow): HTMLElement {
  const value = el('span', 'prefs__value', row.value ?? '—')
  if (row.value === undefined) value.classList.add('prefs__value--none')
  if (row.structured) value.classList.add('prefs__value--structured')
  if (row.personal !== undefined && row.value !== undefined && !row.structured) {
    // Le masquage ne retire jamais l'information : il la remplace à l'écran, et la
    // valeur reste dans l'attribut, donc dans le presse-papier et dans les tests.
    value.classList.add('prefs__value--secret')
    value.dataset.clear = row.value
  }
  return value
}

/**
 * Une liaison de touche à l'écran : la touche, le détail technique, l'appui — **trois
 * éléments**, et non une phrase.
 *
 * Séparés parce qu'ils sont de nature différente : ce que le pilote cherche est la
 * touche ; le code et son nom Android sont ce qu'il recopiera pour signaler un problème ;
 * l'appui long est une **seconde** information sur la même touche, et la noyer dans la
 * première est précisément ce que l'entier du fichier faisait.
 */
function bindingValue(
  binding: KeyBinding, keys: BindingContext, tr: Translator
): HTMLElement {
  const parts = bindingParts(binding, keys, tr)
  const wrap = el('span', 'prefs__binding')
  // L'infobulle dit **d'où vient le nom affiché**, et lequel des trois crans s'applique —
  // pressé à la main, déclaré par le noyau du boîtier, attesté nulle part —, puis renvoie
  // à la note du bloc. Elle ne la remplace pas : un propos sur le matériel doit rester
  // lisible sans survol, et il l'est — trois lignes plus bas.
  const title = bindingTitle(binding, keys, tr)
  if (title !== undefined) wrap.title = title
  const named = el('span', 'prefs__binding-key', parts.key)
  // ⚠️ **La marque que le code promettait et que la feuille de style ne dessinait pas.**
  // `data-hardware` était posé sur la ligne depuis le 2026-08-22 et aucune règle ne le
  // lisait : mesuré au navigateur, une ligne « unattested » était pixel pour pixel
  // identique à une ligne ordinaire. Le pilote-testeur l'a dit autrement — « rien ne
  // signale qu'il y a quelque chose à survoler ».
  //
  // Elle ne se pose **que** là où le nom n'a pas été relevé à la main : sur une ligne où
  // le boîtier a répondu, l'infobulle ne fait que redire ce que la ligne montre déjà, et
  // quinze filets pointillés d'affilée ne signaleraient plus rien.
  if (bindingEvidence(binding, keys.hardware) !== undefined) named.classList.add('glossed')
  wrap.append(named)
  if (parts.detail !== undefined) {
    wrap.append(el('span', 'prefs__binding-detail', parts.detail))
  }
  wrap.append(el('span', 'prefs__binding-press', parts.press))
  return wrap
}

/** Le nœud que la section `preferences` porte aujourd'hui pour cette clé. */
function currentNode(document: JsonNode, key: string): JsonNode | undefined {
  const section = getMember(document, 'preferences')
  if (section === undefined || section.kind !== 'object') return undefined
  return getMember(section, key)
}

/**
 * Remet la ligne d'accord avec ce qui vient d'être écrit : la valeur en toutes lettres,
 * son texte source, et l'état — les six états d'origine, recalculés par le même chemin
 * que `buildRow`, jamais par un raccourci qui divergerait.
 */
function restate(
  row: PreferenceRow, text: string, asString: boolean,
  entry: PreferenceEntry, ctx: EditContext
): void {
  const node: JsonNode = asString
    ? { kind: 'string', raw: encode(text) }
    : { kind: 'literal', raw: text }
  row.value = readableValue(node, entry, ctx.catalog, row.key, ctx.tr, ctx)
  row.raw = node.raw
  if (ctx.conflicts.has(row.key) && entry.default !== undefined && entry.xmlDefault !== undefined) {
    row.state = 'conflict'
    return
  }
  if (entry.defaultSource === 'runtime' || entry.default === undefined) {
    row.state = 'undecidable'
    return
  }
  row.state = sameAsDefault(text, entry.default) ? 'default' : 'custom'
}

function buildRowElement(row: PreferenceRow, ctx: PageContext): HTMLElement {
  const element = el('div', 'prefs__row')
  element.dataset.key = row.key
  element.dataset.state = row.state
  if (row.control !== null) element.dataset.control = row.control
  if (!row.labelled) element.dataset.unlabelled = 'true'
  if (row.personal !== undefined) element.dataset.personal = row.personal.kind

  const tr = ctx.tr
  const entry = ctx.edit?.catalog.preference(row.key)
  const refusal = editRefusal(row, tr)
  const settable = ctx.edit !== undefined && refusal === undefined && entry !== undefined
  const id = `prefs-field-${String(++controlSeq)}`

  const label = el(settable ? 'label' : 'span', 'prefs__label', row.label)
  label.title = row.key
  if (settable) (label as HTMLLabelElement).htmlFor = id
  element.append(label)

  const cell = el('span', 'prefs__cell')
  element.append(cell)

  // L'emplacement du bouton de retrait — sa **propre colonne**, et non plus un bout de la
  // cellule. Il existe sur toutes les lignes d'une page modifiable, occupé ou non : c'est
  // ce qui aligne les contrôles entre eux, et c'est la raison d'être de cette grille.
  //
  // L'intitulé est recopié en `data-label` pour la feuille de style : elle en fait un
  // fantôme invisible, de la même boîte que le bouton, qui donne à la colonne la largeur
  // exacte de l'intitulé dans la langue courante. Une largeur écrite en dur avait été
  // taillée pour « Retirer » et n'a pas suivi « Retirer du fichier » — voir `.prefs__aside`.
  const aside = ctx.edit !== undefined ? el('span', 'prefs__aside') : undefined
  if (aside !== undefined) {
    aside.dataset.label = tr.t('preferences.dropLabel')
    element.append(aside)
  }

  // Sur une clé d'une autre version ou sur une ligne mémorisée, « rien à comparer » se
  // répéterait à chaque ligne pour redire ce que le titre du bloc dit déjà une fois. La
  // colonne reste, vide : l'alignement des lignes voisines ne bouge pas.
  const mute = row.reason === 'unknown' || row.reason === 'state'
  const state = el('span', `prefs__state prefs__state--${row.state}`,
    mute ? '' : stateLabel(row, tr))
  if (!mute) state.title = stateTitle(row, tr)
  element.append(state)

  // L'emplacement du troisième geste — voir `fillRestore`. Il n'existe que dans une page
  // modifiable : rien à réserver là où rien ne s'écrit.
  const restoreSlot = settable ? el('div', 'prefs__restore') : undefined

  const rendered: RenderedRow = {
    element,
    haystack: normalize(`${row.label} ${row.key} ${row.value ?? ''}`),
    row
  }

  function refreshState(): void {
    element.dataset.state = row.state
    state.className = `prefs__state prefs__state--${row.state}`
    state.textContent = stateLabel(row, tr)
    state.title = stateTitle(row, tr)
    rendered.haystack = normalize(`${row.label} ${row.key} ${row.value ?? ''}`)
    fillRestore()
  }

  /**
   * Une écriture demandée par un contrôle. Rend `false` quand rien n'a bougé — reposer
   * une valeur à l'identique n'est pas une modification et ne doit pas en avoir l'air.
   *
   * `description` remplace la phrase d'historique quand l'appelant sait mieux ce qu'il
   * vient de faire : « Rétablir X à sa valeur d'usine » n'est pas « Régler X », et
   * l'annulation doit se lire dans les mots du geste.
   */
  function commit(text: string, continuous: boolean, description?: string): boolean {
    const context = ctx.edit
    if (context === undefined || entry === undefined) return false
    const asString = writesString(entry, currentNode(context.document, row.key))
    const outcome = writePreference(context.document, row.key, text, asString)
    if (outcome === 'unchanged') return false

    const previous = row.state
    restate(row, text, asString, entry, context)
    refreshState()

    const edit: PreferenceEdit = {
      key: row.key,
      label: row.label,
      outcome,
      text,
      description: description ?? tr.t(outcome === 'inserted'
        ? 'preferences.editInsertDescription'
        : 'preferences.editSetDescription', { label: row.label }),
      continuous
    }
    if (row.personal !== undefined && text.trim() !== '') edit.personal = row.personal
    context.onEdit(edit)
    context.wrote(row, previous, edit)
    return true
  }

  /**
   * Le retrait d'une valeur explicite égale au défaut : l'exact inverse de l'adoption.
   * La clé quitte le fichier, et XCTrack appliquera de nouveau son défaut — la même
   * valeur qu'aujourd'hui, mais qui suivra désormais les mises à jour de l'application.
   */
  function drop(): boolean {
    const context = ctx.edit
    if (context === undefined || entry === undefined) return false
    if (removePreference(context.document, row.key) === 0) return false

    const previous = row.state
    // Exactement l'état que `buildRow` donnerait à cette clé maintenant qu'elle n'est
    // plus dans le fichier : « absente » si la classe de configuration la déclare,
    // « jamais écrite » sinon. On ne code pas un second chemin qui pourrait diverger.
    row.state = entry.declared ? 'absent' : 'unwritten'
    delete row.value
    delete row.raw
    refreshState()

    const edit: PreferenceEdit = {
      key: row.key,
      label: row.label,
      outcome: 'removed',
      text: '',
      description: tr.t('preferences.removeFromFile', { label: row.label }),
      continuous: false
    }
    context.onEdit(edit)
    context.wrote(row, previous, edit)
    return true
  }

  /**
   * Le troisième geste : remplacer une valeur réglée par la valeur d'usine.
   *
   * Il **écrit**, il ne retire pas. Retirer la clé rendrait aussi le comportement
   * d'usine, mais ce n'est pas le même geste : la valeur cesserait d'être figée. Écrire
   * la valeur d'usine amène la ligne à l'état `default`, d'où « Retirer » devient
   * offert — le pilote qui veut aller jusqu'à l'implicite y va d'un second clic,
   * délibéré, et voit chacun des deux effets séparément.
   */
  function restore(): boolean {
    const context = ctx.edit
    if (context === undefined || entry?.default === undefined) return false
    return commit(defaultAsText(entry.default), false,
      tr.t('preferences.restoreToFactoryValue', { label: row.label }))
  }

  /**
   * La ligne du troisième geste, refaite à chaque changement d'état.
   *
   * Elle n'existe pas dans une page en lecture seule : `settable` la conditionne comme
   * il conditionne les contrôles.
   */
  function fillRestore(): void {
    if (restoreSlot === undefined) return
    restoreSlot.textContent = ''
    const context = ctx.edit
    const offer = settable && context !== undefined && entry !== undefined &&
      restorable(row, entry, context)
    restoreSlot.hidden = !offer
    if (!offer || context === undefined || entry === undefined) return
    restoreSlot.dataset.trust = context.trust
    restoreSlot.append(...buildRestoreParts(row, context, () => {
      // L'état a changé sous le bouton : le contrôle doit montrer la valeur rétablie, et
      // la ligne gagne « Retirer » puisqu'elle vaut désormais la valeur d'usine.
      fillCell()
      cell.querySelector<HTMLElement>('input, select')?.focus()
    }, restore))
  }

  /**
   * Le bouton de retrait, refait avec la cellule : l'emplacement, lui, ne bouge jamais.
   *
   * Une valeur écrite qui vaut le défaut peut repartir — c'est le geste inverse, et il
   * n'a de sens que là. Sur une valeur réglée, retirer la clé changerait le comportement
   * de l'appareil, ce que ce bouton ne doit jamais faire en un clic.
   */
  function fillAside(): void {
    if (aside === undefined) return
    aside.textContent = ''
    if (!settable || row.state !== 'default') return
    aside.append(buildDropButton(row, tr, () => {
      // La ligne vient de quitter le fichier : la cellule porte maintenant le geste
      // inverse (« Définir cette valeur »), et c'est lui qui prend le foyer — le bouton
      // qu'on vient de cliquer, lui, n'existe plus.
      fillCell()
      cell.querySelector<HTMLElement>('button')?.focus()
    }, drop))
  }

  function fillCell(): void {
    cell.textContent = ''
    fillAside()
    const context = ctx.edit
    if (!settable || context === undefined || entry === undefined) {
      // Une liaison de touche ne se règle pas ici — il y faudrait la touche pressée sur
      // l'instrument — mais elle se **lit**, et en trois morceaux plutôt qu'en un entier.
      // Sans touche affectée, rien à découper : « aucune touche » se dit comme une valeur.
      cell.append(row.binding === undefined || row.binding.unset
        ? readOnlyValue(row)
        : bindingValue(
        row.binding, { domains: ctx.domains, hardware: ctx.hardware, labels: ctx.labels }, tr
      ))
      return
    }
    if (row.state === 'absent' || row.state === 'unwritten') {
      cell.append(...buildImplicitCell(row, entry, tr, () => {
        // La clé vient d'entrer dans le fichier : la ligne devient une ligne comme les
        // autres, contrôle compris.
        fillCell()
        cell.querySelector<HTMLElement>('input, select')?.focus()
      }, commit))
      return
    }
    cell.append(buildField(row, entry, id, context, commit))
  }

  fillCell()

  if (row.personal !== undefined) element.append(personalMark(row.personal, ctx))
  // Sa place est **sous** la ligne, sur toute la largeur, et après la marque de donnée
  // personnelle : un élément qui occupe la grille entière renverrait à la ligne suivante
  // tout ce qui le suit. Masqué (`hidden`) il ne prend aucune place du tout — c'est
  // pourquoi il est réservé plutôt que créé et détruit.
  if (restoreSlot !== undefined) element.append(restoreSlot)
  fillRestore()
  if (row.help !== undefined) element.append(el('p', 'prefs__help', row.help))
  // Notre glose, **après** l'aide de XCTrack et jamais à sa place : le libellé reste ce
  // que l'appareil affiche, et la phrase qui l'éclaire se voit être de nous.
  if (row.gloss !== undefined) element.append(el('p', 'prefs__help prefs__gloss', row.gloss))
  // Ce que notre relevé de touches physiques dit de ce code-là. Sous la ligne, en toutes
  // lettres et non en infobulle : un propos sur le matériel se découvre avant le vol, pas
  // au survol. Il n'existe que là où le modèle du fichier a été relevé — voir `bindingNote`.
  // ⚠️ La **marque** seulement, jamais la phrase : celle-ci s’écrit une fois par bloc
  // (`hardwareNote`), comme la phrase de refus juste à côté. Deux lignes de suite portant
  // le même paragraphe le font lire zéro fois.
  if (row.keyEvidence !== undefined) element.dataset.hardware = row.keyEvidence

  // Une ligne qui ne se règle pas dans une page qui se règle doit dire pourquoi — mais
  // **une fois par bloc**, pas quinze fois de suite : l'écran des touches en compte
  // quinze d'affilée, et la même phrase répétée quinze fois chasse les réglages de
  // l'écran sans rien apprendre de plus. Le bloc porte la phrase (voir `refusalNote`),
  // la ligne porte la marque et l'infobulle.
  if (refusal !== undefined && ctx.edit !== undefined) {
    element.dataset.settable = 'false'
    cell.title = refusal
  }

  ctx.collected.push(rendered)
  return element
}

/**
 * Ce qu'une clé absente montre : **la valeur d'usine de XCTrack**, et le bouton qui
 * l'écrit.
 *
 * ## Pourquoi montrer la valeur d'usine ici
 *
 * Elle était dans l'infobulle de la marque d'état, donc derrière un survol, donc nulle
 * part. Elle est maintenant écrite à la place de la valeur, en retrait et en italique,
 * pour qu'on ne la lise jamais comme une valeur réglée : c'est la distinction que toute
 * cette page défend.
 *
 * Ce qu'elle **n'est pas** : ce que l'appareil du pilote applique. L'import ne touche
 * pas une clé absente (`ABSENT_KEY_ON_IMPORT`) ; sur un appareil déjà réglé, c'est le
 * réglage de l'appareil qui vaut, et cet outil ne le connaît pas.
 *
 * ## Ce que le bouton fait, et ce qu'il ne fait pas
 *
 * Il écrit la valeur d'usine dans le fichier. Sur une installation neuve, elle
 * s'appliquerait de toute façon : l'écrire met alors le réglage à l'abri d'une mise à
 * jour de XCTrack qui changerait cette valeur d'usine. Sur un appareil déjà réglé, elle
 * **remplacera** ce qui s'y trouve — c'est le seul des trois gestes de cette page dont
 * l'effet dépend de l'appareil, et l'infobulle le dit avant le clic.
 *
 * Sans valeur d'usine relevée, **pas de bouton** : écrire une valeur devinée serait pire
 * que ne rien proposer. Les huit `Unit.*` (valeur calculée selon la langue de l'appareil)
 * et les clés qu'aucune source ne documente sont dans ce cas, et la ligne le dit.
 */
function buildImplicitCell(
  row: PreferenceRow, entry: PreferenceEntry, tr: Translator,
  done: () => void, commit: (text: string, continuous: boolean) => boolean
): HTMLElement[] {
  const seed = entry.defaultSource === 'runtime' ? undefined : entry.default
  if (seed === undefined || row.defaultText === undefined) {
    const note = el('span', 'prefs__value prefs__value--none',
      tr.t('preferences.factoryValueUnknown'))
    note.title = row.undecidableReason ?? tr.t('preferences.factoryValueUnknownTitle')
    return [note]
  }

  const implicit = el('span', 'prefs__implicit', row.defaultText)
  implicit.title = tr.t('preferences.implicitTitle', {
    factory: row.defaultText, absent: tr.t(ABSENT_KEY_ON_IMPORT)
  })

  const button = el('button', 'btn prefs__adopt', tr.t('preferences.adoptLabel'))
  button.type = 'button'
  button.title = tr.t('preferences.adoptTitle', {
    key: row.key, factory: row.defaultText
  })
  button.addEventListener('click', () => {
    if (commit(typeof seed === 'string' ? seed : String(seed), false)) done()
  })
  return [implicit, button]
}

/**
 * Le geste inverse : retirer du fichier une valeur qui vaut déjà la valeur d'usine.
 *
 * Il n'est offert que sur l'état `default` — une valeur écrite, égale à la valeur d'usine
 * relevée. Sur une valeur réglée, faire taire le fichier priverait la sauvegarde d'un
 * choix délibéré, et ce n'est pas ce qu'un bouton discret doit pouvoir faire d'un clic ;
 * le pilote passe alors par le contrôle, qui dit ce qu'il écrit.
 *
 * Le sens est le symétrique exact de « Définir cette valeur » : le fichier cesse de dire
 * quoi que ce soit de ce réglage. Ce que l'infobulle ne dit plus, parce que c'est faux :
 * que l'appareil reviendrait à sa valeur d'usine (`ABSENT_KEY_ON_IMPORT`).
 */
function buildDropButton(
  row: PreferenceRow, tr: Translator, done: () => void, drop: () => boolean
): HTMLElement {
  const button = el('button', 'btn btn--ghost prefs__drop', tr.t('preferences.dropLabel'))
  button.type = 'button'
  button.setAttribute('aria-label', tr.t('preferences.removeFromFile', { label: row.label }))
  button.title = tr.t('preferences.dropTitle', {
    key: row.key, absent: tr.t(ABSENT_KEY_ON_IMPORT)
  })
  button.addEventListener('click', () => { if (drop()) done() })
  return button
}

/* ------------------------------------------------- le troisième geste : rétablir l'usine */

/**
 * L'intitulé du troisième geste — **la clé du message**, depuis que la prose de cet écran
 * est versée au catalogue ; le texte lui-même vit dans
 * `src/i18n/messages/<langue>/preferences.ts`.
 *
 * **Le même mot à mot dans le panneau des gadgets** (`ui/properties.ts`) : deux
 * formulations pour un même geste, sur deux écrans du même outil, seraient un défaut à
 * elles seules — c'est déjà la règle des deux premiers. Le jour où ce panneau-là versera
 * sa prose, il devra pointer sur ce même message.
 */
export const RESTORE_LABEL = 'preferences.restoreLabel' satisfies MessageKey

/**
 * Vrai si « Rétablir la valeur d'usine » peut être offert sur cette ligne.
 *
 * Trois refus, et aucun n'est un repli poli :
 *
 * - **la valeur n'est pas réglée** — l'état n'est `custom` que pour une valeur écrite qui
 *   diffère de la valeur d'usine relevée. Sur les cinq autres états, le geste n'a pas
 *   d'objet ;
 * - **la valeur d'usine n'est pas connue**, ou XCTrack la calcule au démarrage
 *   (`defaultSource: 'runtime'`, les huit `Unit.*`) : on ne rétablit pas une valeur qu'on
 *   inventerait ;
 * - **XCTrack en publie deux et elles se contredisent** (`Sensors.ManualQnh` : 1013 et
 *   1013.25). On ne peut pas proposer de revenir à « la » valeur d'usine quand il y en a
 *   deux — c'est déjà la raison pour laquelle « Retirer » n'y est pas offert. L'état
 *   `conflict` écarte ces clés avant d'arriver ici ; la garde est écrite quand même,
 *   pour que ce refus-là ne dépende pas d'un calcul d'état qui pourrait changer.
 */
function restorable(row: PreferenceRow, entry: PreferenceEntry, ctx: EditContext): boolean {
  if (row.state !== 'custom' || row.defaultText === undefined) return false
  if (entry.default === undefined || entry.defaultSource === 'runtime') return false
  return !(ctx.conflicts.has(row.key) && entry.xmlDefault !== undefined)
}

/**
 * Le bouton du troisième geste, et la phrase qui dit ce qu'il change.
 *
 * ## Pourquoi il ne ressemble ni à l'un ni à l'autre des deux premiers
 *
 * « Définir cette valeur » et « Retirer » ne touchent qu'une ligne dont le pilote n'a
 * jamais rien décidé : l'une écrit la valeur d'usine, l'autre fait taire le fichier. Sur
 * un appareil qui n'y a jamais touché, ni l'une ni l'autre ne change son comportement.
 * C'est ce qui autorise « Retirer » à être discret, révélé au survol.
 *
 * Celui-ci remplace une valeur que le pilote **a** réglée, et il la remplace partout.
 * **L'appareil ne se comportera plus pareil en vol.** Un bouton révélé au survol serait ici un piège : il se découvre après
 * le geste et non avant. Il prend donc sa propre ligne, sous le réglage, à pleine
 * opacité, et il porte à côté de lui les deux valeurs en présence — celle du fichier et
 * celle d'usine — pour qu'on lise l'échange avant de cliquer, pas après.
 *
 * ## Pourquoi la version pèse, et se dit à l'écran
 *
 * Le relevé vient d'**une seule** version de XCTrack. Sur un fichier venu d'ailleurs, la
 * valeur d'usine affichée n'est peut-être pas celle que l'appareil du pilote appliquerait
 * — et là où les deux premiers gestes ne risquent rien, celui-ci écrirait une valeur
 * relevée ailleurs par-dessus un réglage délibéré. L'avertissement est donc **visible**,
 * dans la phrase, et pas seulement dans l'infobulle : « avant le clic » exclut le survol.
 */
function buildRestoreParts(
  row: PreferenceRow, ctx: EditContext, done: () => void, restore: () => boolean
): HTMLElement[] {
  const tr = ctx.tr
  const factory = row.defaultText ?? '?'
  const current = row.value ?? '?'
  const caveat = restoreCaveat(ctx)

  const button = el('button', 'btn prefs__restore-btn', tr.t(RESTORE_LABEL))
  button.type = 'button'
  button.setAttribute('aria-label',
    tr.t('preferences.restoreToFactoryValue', { label: row.label }))
  button.title = tr.t('preferences.restoreTitle', {
    key: row.key, factory, current, caveat
  })
  button.addEventListener('click', () => { if (restore()) done() })

  const note = el('span', 'prefs__restore-note',
    tr.t('preferences.restoreNote', { factory, current, caveat }))
  return [button, note]
}

/**
 * Ce qu'il faut ajouter quand le fichier ne vient pas de la version du catalogue.
 *
 * Rien à dire quand elle coïncide : une phrase de prudence servie à tort apprend au
 * lecteur à ne plus lire les phrases de prudence.
 */
function restoreCaveat(ctx: EditContext): string {
  if (ctx.trust === 'exact') return ''
  // `version` part en `string` : c'est un nom de version — « 1.0.3-beta » —, pas un
  // nombre à mettre en forme.
  const version = catalogVersionText(ctx.catalog)
  return ctx.tr.t(ctx.trust === 'indicative'
    ? 'preferences.restoreCaveatIndicative'
    : 'preferences.restoreCaveatUnstated', { version })
}

/** Le contrôle d'une ligne qui se règle, choisi sur le type que XCTrack affiche. */
function buildField(
  row: PreferenceRow, entry: PreferenceEntry, id: string, ctx: EditContext,
  commit: (text: string, continuous: boolean) => boolean
): HTMLElement {
  const text = row.raw === undefined
    ? ''
    : (row.raw.startsWith('"') ? decode(row.raw) : row.raw)

  if (entry.control === 'checkbox') return buildCheckbox(id, text, commit)
  if (entry.control === 'color') return buildColorField(id, text, commit)
  if (entry.control === 'slider' || entry.control === 'number') {
    return buildNumberField(id, text, entry, commit)
  }
  if (entry.control === 'list') {
    const choices = ctx.catalog.values(row.key)
    if (choices.length === 0) {
      // Les huit `Unit.*` : XCTrack remplit leur liste en code, aucune ressource ne la
      // déclare, et elle a donc été **relevée à l'écran de l'appareil**. Fermer la liste
      // n'est légitime que là — voir `unitDomainSource` pour ce que vaut ce relevé.
      const measured = ctx.domains?.unitDomain(row.key)
      if (measured != null && measured.length > 0) {
        return buildSelect(id, text, measured.map((one) => ({
          // ⚠️ `value` va dans le fichier, `label` à l'écran : l'appareil affiche
          // « m, km » et écrit « m,km ». Les confondre écrirait une valeur refusée.
          value: one.value, label: one.label
        })), ctx.tr, commit, unitListNote(ctx))
      }
      // Les deux listes de voile n'ont ni ressource ni relevé : un champ libre reste la
      // seule chose honnête. Une liste vide serait un piège, une liste inventée pire.
      return buildTextField(id, text, row, ctx, commit, true)
    }
    return buildSelect(id, text, choices, ctx.tr, commit)
  }
  return buildTextField(id, text, row, ctx, commit, false)
}

/**
 * D'où vient la liste d'unités qu'on vient de fermer, dite au survol du contrôle.
 *
 * Elle n'est ni dans l'APK ni dans un fichier : elle a été relevée à la main, sur un
 * appareil et une version. Le pilote qui règle son vario mérite de savoir que la liste
 * qu'on lui présente n'est pas une propriété de XCTrack mais un relevé — et lequel.
 */
function unitListNote(ctx: EditContext): string | undefined {
  const source = ctx.domains?.unitDomainSource()
  if (source === undefined) return undefined
  // Les réserves sont des fragments de phrase dans la donnée : elles s'enchaînent après
  // deux points plutôt que collées bout à bout, où la première commencerait en minuscule
  // juste après un point.
  //
  // ⚠️ `method` et `caveats` viennent de `preferenceDomains.json` — un relevé fait à la
  // main, **écrit en français à la source**. Ils traversent donc les cinq langues tels
  // quels : ce sont des données, pas de la prose de code. Les traduire demanderait de
  // faire porter au fichier extrait une colonne par langue, décision qui appartient au lot
  // qui reprendra l'extraction.
  return ctx.tr.t('preferences.unitListNote', {
    device: source.deviceLabel,
    version: source.versionName,
    method: source.method,
    caveats: source.caveats.join(' ; ')
  })
}

function buildCheckbox(
  id: string, text: string, commit: (text: string, continuous: boolean) => boolean
): HTMLElement {
  const box = el('input', 'prefs__checkbox')
  box.type = 'checkbox'
  box.id = id
  box.checked = text === 'true'
  box.addEventListener('change', () => { commit(box.checked ? 'true' : 'false', false) })
  return box
}

function buildSelect(
  id: string, text: string, choices: readonly { value: string; label: string }[],
  tr: Translator, commit: (text: string, continuous: boolean) => boolean, note?: string
): HTMLElement {
  const select = el('select', 'prefs__select')
  select.id = id
  if (note !== undefined) select.title = note
  for (const choice of choices) {
    const option = el('option', undefined, choice.label)
    option.value = choice.value
    select.append(option)
  }
  // Une valeur que le catalogue ne propose pas — vestige, ou version plus récente que
  // l'extraction — s'ajoute à la liste plutôt que de se faire remplacer en silence.
  if (!choices.some((choice) => choice.value === text)) {
    const extra = el('option', undefined, tr.t('preferences.offCatalogue', { value: text }))
    extra.value = text
    select.prepend(extra)
  }
  select.value = text
  select.addEventListener('change', () => { commit(select.value, false) })
  return select
}

/**
 * Un nombre. Curseur quand les bornes sont relevées, champ numérique sinon.
 *
 * Le texte envoyé à l'écriture est celui du contrôle, jamais un `Number` reformaté :
 * c'est lui qui ira dans le fichier.
 */
function buildNumberField(
  id: string, text: string, entry: PreferenceEntry,
  commit: (text: string, continuous: boolean) => boolean
): HTMLElement {
  const bounded = entry.control === 'slider' && entry.min !== undefined && entry.max !== undefined
  const wrap = el('span', 'prefs__number-wrap')
  const input = el('input', bounded ? 'prefs__slider' : 'prefs__number')
  input.type = bounded ? 'range' : 'number'
  input.id = id
  if (entry.min !== undefined) input.min = String(entry.min)
  if (entry.max !== undefined) input.max = String(entry.max)
  // Un pas déduit du nombre de décimales relevé : `Sensors.ManualQnh` se règle au
  // dixième d'hectopascal sur l'appareil, et un pas entier interdirait 1018,8.
  input.step = entry.decimals === undefined || entry.decimals === 0
    ? '1'
    : String(1 / 10 ** entry.decimals)
  input.value = text

  const readout = el('output', 'prefs__readout')
  readout.htmlFor = id
  const unit = entry.unit === undefined ? '' : entry.unit.trim()
  const show = (): void => { readout.textContent = unit === '' ? input.value : `${input.value} ${unit}` }
  show()

  input.addEventListener('input', () => {
    const next = input.value.trim()
    if (next === '' || !Number.isFinite(Number(next))) return
    commit(next, true)
    show()
  })
  wrap.append(input)
  if (bounded) wrap.append(readout)
  return wrap
}

function buildTextField(
  id: string, text: string, row: PreferenceRow, ctx: EditContext,
  commit: (text: string, continuous: boolean) => boolean, freeList: boolean
): HTMLElement {
  const input = el('input', 'prefs__text')
  input.type = 'text'
  input.id = id
  input.value = text
  input.spellcheck = false
  if (freeList) input.title = ctx.tr.t('preferences.freeListTitle')
  input.addEventListener('change', () => { commit(input.value, false) })
  if (row.personal !== undefined) {
    input.classList.add('prefs__text--secret')
    ctx.secrets.push(input)
  }
  return input
}

/**
 * Le champ `#AARRGGBB`, comme le panneau des gadgets. Pas d'`<input type="color">` : il
 * ignore la composante alpha, que XCTrack utilise.
 *
 * ⚠️ Les deux conversions sont recopiées de `properties.ts` plutôt qu'importées : ce
 * module-là ouvre le catalogue d'options des gadgets par un `await` de premier niveau, et
 * l'importer ici ferait télécharger quatre cents kilo-octets à qui n'ouvre que les
 * réglages. Elles tiennent en quatre lignes et ont leurs tests des deux côtés.
 */
export function colorTextToHex(raw: string): string | undefined {
  const value = Number(raw)
  if (!Number.isInteger(value) || value < -0x80000000 || value > 0xffffffff) return undefined
  return `#${(value >>> 0).toString(16).padStart(8, '0').toUpperCase()}`
}

/** Inverse de `colorTextToHex`. Accepte `#AARRGGBB` et `#RRGGBB` (alpha implicite `FF`). */
export function hexToColorText(hex: string): string | undefined {
  const digits = hex.replace(/^#/, '').toUpperCase()
  if (!/^[0-9A-F]{6}$|^[0-9A-F]{8}$/.test(digits)) return undefined
  const full = digits.length === 6 ? `FF${digits}` : digits
  return String(parseInt(full, 16) | 0)
}

function buildColorField(
  id: string, text: string, commit: (text: string, continuous: boolean) => boolean
): HTMLElement {
  const wrap = el('span', 'prefs__color')
  const input = el('input', 'prefs__hex')
  input.type = 'text'
  input.id = id
  input.spellcheck = false
  const swatch = el('span', 'prefs__swatch')
  swatch.setAttribute('aria-hidden', 'true')

  let source = text
  function show(): void {
    const hex = colorTextToHex(source)
    input.value = hex ?? source
    if (hex === undefined) return
    swatch.style.backgroundColor = `#${hex.slice(-6)}`
    swatch.style.opacity = String(parseInt(hex.slice(1, 3), 16) / 255)
  }
  show()

  input.addEventListener('change', () => {
    const literal = hexToColorText(input.value)
    // Saisie invalide : on remet ce que le fichier contient, sans rien écrire.
    if (literal === undefined) { show(); return }
    if (commit(literal, false)) source = literal
    show()
  })

  wrap.append(input, swatch)
  return wrap
}

/**
 * Le bandeau de tête : ce que le fichier porte, et ce que la page en fait.
 *
 * C'est le seul endroit qui donne le sens de la lecture. Il dit trois choses que rien
 * d'autre ne dit : combien de réglages le pilote a changés, combien de clés la page ne
 * sait pas présenter, et de quelle version le catalogue parle face à celle du fichier.
 */
function buildSummaryBox(
  inventory: PreferenceInventory, options: PreferencesPageOptions
): HTMLElement {
  const box = el('div', 'prefs__summary')
  fillSummaryBox(box, inventory, options)
  return box
}

/**
 * Réécrit le bandeau depuis les comptes courants. Séparé de sa construction parce qu'une
 * écriture change les comptes : un réglage qui passe de « au défaut » à « réglé » doit
 * bouger la première ligne de la page, sinon le bandeau ment dès la première modification.
 */
function fillSummaryBox(
  box: HTMLElement, inventory: PreferenceInventory, options: PreferencesPageOptions
): void {
  const { summary } = inventory
  const tr = options.tr
  box.textContent = ''
  box.dataset.custom = String(summary.customCount)
  box.dataset.presented = String(summary.presentedCount)

  // Trois nombres justes et différents, et c'est tout l'intérêt de cet écran. Ce qui
  // change ici est la façon de les dire : « 30 réglages réglés par le pilote » parlait du
  // pilote à la troisième personne — il consultait le dossier de quelqu'un d'autre — et
  // répétait le même mot deux fois. « 136 clés » est notre mot, pas le sien : ce que le
  // fichier porte, ce sont des lignes, dont 49 ne règlent rien.
  box.append(el('p', 'prefs__summary-count', tr.t('preferences.summaryCount', {
    custom: summary.customCount,
    settings: tr.t('preferences.settingCount', { count: summary.presentedCount })
  })))

  // Une colonne de comptes, jointe par `', '` : `format.list` en ferait « a, b et c »,
  // une prose là où il y a un relevé.
  const parts: string[] = []
  if (summary.defaultCount > 0) {
    parts.push(tr.t('preferences.detailDefault', { count: summary.defaultCount }))
  }
  if (summary.absentCount > 0) {
    parts.push(tr.t('preferences.detailAbsent', { count: summary.absentCount }))
  }
  if (summary.unwrittenCount > 0) {
    parts.push(tr.t('preferences.detailUnwritten', { count: summary.unwrittenCount }))
  }
  if (summary.undecidableCount > 0) {
    parts.push(tr.t('preferences.detailUndecidable', { count: summary.undecidableCount }))
  }
  if (summary.conflictCount > 0) {
    parts.push(tr.t('preferences.detailConflict', { count: summary.conflictCount }))
  }
  if (parts.length > 0) box.append(el('p', 'prefs__summary-detail', `${parts.join(', ')}.`))

  const rest: string[] = []
  if (summary.unlabelledCount > 0) {
    rest.push(tr.t('preferences.restUnlabelled', { count: summary.unlabelledCount }))
  }
  // Le même mot que le bloc de fin de page, faute de quoi l'écran se contredirait d'un
  // bloc à l'autre : ici « mémorisées par l'application », là « Ce que l'application a
  // mémorisé ».
  if (summary.stateCount > 0) {
    rest.push(tr.t('preferences.restState', { count: summary.stateCount }))
  }
  if (summary.unknownCount > 0) {
    rest.push(tr.t('preferences.restUnknown', { count: summary.unknownCount }))
  }
  const unpresented = summary.unlabelledCount + summary.stateCount + summary.unknownCount
  const lines = tr.t('preferences.lineCount', { count: summary.fileKeyCount })
  box.append(el('p', 'prefs__summary-detail', rest.length === 0
    ? tr.t('preferences.fileCarries', { lines })
    : tr.t('preferences.fileCarriesWithRest', {
      lines, count: unpresented, rest: rest.join(', ')
    })))

  box.append(el('p', 'prefs__summary-note', catalogNote(options)))
}

/**
 * D'où vient ce que la page affirme, et ce que ça vaut face à ce fichier-ci.
 *
 * On ne masque jamais la comparaison quand les versions divergent — la plupart des clés
 * ne bougent pas d'une version à l'autre. On ne la donne pas non plus pour une preuve.
 */
function catalogNote(options: PreferencesPageOptions): string {
  const { catalog, tr } = options
  // `version` part en `string` : un nom de version est un identifiant, il ne se met pas en
  // forme. Le `versionCode` du relevé n'est plus cité — il ouvrait une parenthèse au milieu
  // de la phrase sur un numéro que XCTrack ne montre nulle part au pilote.
  const reference = tr.t('preferences.catalogReference', {
    version: catalogVersionText(catalog)
  })
  const fallback = catalog.fallbackStringCount === 0
    ? ''
    : tr.t('preferences.catalogFallback', { count: catalog.fallbackStringCount })

  const trust = catalogTrust(options)
  if (trust === 'unstated') {
    return tr.t('preferences.catalogNoteUnstated', { reference, fallback })
  }
  if (trust === 'exact') {
    return tr.t('preferences.catalogNoteExact', { reference, fallback })
  }
  return tr.t('preferences.catalogNoteIndicative', {
    reference, file: fileVersionText(options), fallback
  })
}

/**
 * Ce que vaut la comparaison au catalogue, pour ce fichier-ci.
 *
 * Les trois mêmes valeurs, les mêmes mots et le même arbitrage que `defaultsTrust` du
 * relevé des gadgets (`catalog/widgetDefaults.ts`) — deux relevés distincts, une seule
 * façon de dire ce qu'ils valent :
 *
 * - `exact` — le fichier vient de la version du catalogue ;
 * - `indicative` — une autre version : les valeurs d'usine ont pu changer entre les deux ;
 * - `unstated` — le fichier ne dit pas d'où il vient (`info.versionCode` absent).
 *
 * Ce n'est jamais un motif de **masquer** une comparaison — la plupart des clés ne
 * bougent pas d'une version à l'autre. C'est un motif de le **dire**, et de le dire avant
 * un geste qui écrit.
 */
export type CatalogTrust = 'exact' | 'indicative' | 'unstated'

export function catalogTrust(options: PreferencesPageOptions): CatalogTrust {
  if (options.fileVersionCode === undefined) return 'unstated'
  return options.fileVersionCode === options.catalog.meta.versionCode ? 'exact' : 'indicative'
}

/**
 * La version du fichier, nommée quand elle a un nom, chiffrée sinon.
 *
 * ⚠️ Le `versionCode` ne DOUBLE plus le nom. « la version 0.9.12.3 (versionCode 91230) »
 * ouvrait une parenthèse au milieu de la phrase sur un numéro que XCTrack ne montre nulle
 * part au pilote ; c'est l'un des trois exemples qu'un pilote-testeur a cités le 2026-08-22
 * pour dire qu'il saute ces lignes. Il reste, seul, quand le fichier ne donne pas de nom —
 * et dans « Version et compatibilité », l'écran dont c'est le sujet.
 */
function fileVersionText(options: PreferencesPageOptions): string {
  const name = options.fileVersionName
  return name === undefined
    ? options.tr.t('preferences.fileVersionNumber', { code: String(options.fileVersionCode) })
    : options.tr.t('preferences.fileVersionNamed', { name: releaseName(name) })
}

/**
 * Le nom de la version dont ce catalogue est extrait, **sans son suffixe de
 * construction**.
 *
 * Le fichier de préférences porte `1.0.3-beta-5-gc036d8f2c`, le relevé des gadgets
 * `1.0.3-beta` : deux écrans du même outil nommaient donc la même version de deux
 * façons, et l'appareil, lui, n'en affiche qu'une — la seconde. Un pilote qui lit deux
 * noms en conclut qu'il y a deux versions, et cherche laquelle est la sienne.
 * `catalog/versionName.ts` tranche pour toute l'application.
 */
function catalogVersionText(catalog: PreferenceCatalog): string {
  const name = catalog.meta.versionName
  return name === undefined || name === null
    ? String(catalog.meta.versionCode ?? 0)
    : releaseName(name)
}

/**
 * Ce que le pilote a besoin de savoir avant de transmettre ce fichier.
 *
 * Sobrement, sans alarmisme : il décide, il a seulement besoin de savoir. Trois faits que
 * rien d'autre ne dit, et dont deux ne se voient pas dans le fichier — ce qui est
 * précisément pourquoi il faut les écrire.
 */
function buildPrivacyBox(
  inventory: PreferenceInventory, catalog: PreferenceCatalog, ctx: PageContext
): HTMLElement {
  const tr = ctx.tr
  const box = el('details', 'prefs__privacy')
  box.dataset.count = String(inventory.summary.personalCount)

  const counts = inventory.summary.personalCounts

  const head = el('summary', 'prefs__privacy-head')
  const filled = counts.filled - counts.layout
  head.textContent = counts.preferences === 0
    ? tr.t('preferences.privacyNone')
    : tr.t('preferences.privacyHead', {
      count: counts.preferences, filled, empty: counts.preferences - filled
    })
  box.append(head)

  const body = el('div', 'prefs__privacy-body')

  // **Ce que cette page ne compte pas, dit ici.** Un écran de réglages n'a pas à montrer
  // ce qu'une boîte de partage montre — mais taire l'existence de l'autre moitié fait
  // lire « 16 » comme « tout ». Les textes des gadgets sont les seuls qui survivent à un
  // export « pages » : c'est le chiffre qui décide de ce qu'on peut envoyer.
  body.append(el('p', 'prefs__privacy-note',
    counts.layout === 0
      ? tr.t('preferences.privacyLayoutNone')
      : tr.t('preferences.privacyLayoutSome', { count: counts.layout })))

  if (counts.preferences > 0) {
    const list = el('ul', 'prefs__privacy-list')
    for (const row of inventory.personal) {
      const item = el('li', 'prefs__privacy-item')
      item.append(el('span', 'prefs__privacy-key', row.key))
      item.append(el('span', 'prefs__privacy-why', tr.t('preferences.privacyItemWhy', {
        kind: ctx.personal.kind(row.personal?.kind ?? 'identity'),
        reason: row.personal === undefined ? '' : tr.t(row.personal.reasonKey)
      })))
      list.append(item)
    }
    body.append(list)
  }

  const navigation = inventory.personal.find((row) => row.key === 'Navigation.State')
  if (navigation !== undefined) {
    body.append(el('p', 'prefs__privacy-note', tr.t('preferences.privacyNavigationState', {
      value: navigation.value ?? tr.t('preferences.someStructure')
    })))
  }

  // Deux faits sur des clés qu'aucun fichier ne porte : leur absence est justement ce
  // qui mérite d'être dit, puisque rien à l'écran ne peut la faire deviner.
  if (catalog.knows('App.GuessLatitude')) {
    body.append(el('p', 'prefs__privacy-note', tr.t('preferences.privacyGuessPosition')))
  }
  if (SECURE_PERSONAL_KEYS.length > 0) {
    body.append(el('p', 'prefs__privacy-note', tr.t('preferences.privacySecureKeys', {
      count: SECURE_PERSONAL_KEYS.length
    })))
  }

  // La conséquence, qui n'est pas une évidence : les seules clés dont XCTrack déclare
  // lui-même le caractère sensible sont celles qui ne sortent jamais. Tout ce qu'un
  // fichier réel porte de personnel relève donc d'un jugement de cet éditeur — et chaque
  // ligne ci-dessus porte le sien.
  if (counts.judged > 0 && counts.read === 0) {
    body.append(el('p', 'prefs__privacy-note',
      tr.t('preferences.privacyJudged', { count: counts.total })))
  }

  body.append(el('p', 'prefs__privacy-note', ctx.personal.caveat()))

  box.append(body)
  return box
}

/**
 * ⚠️ Ces trois titres sont **cités mot à mot** par `preferences.menuNoteAirspaces` et par
 * le bandeau de tête (`preferences.restState`) : une traduction qui s'en écarterait ferait
 * se contredire l'écran d'un bloc à l'autre.
 */
const LEFTOVER_TITLES: Record<LeftoverReason, (tr: Translator) => string> = {
  unlabelled: (tr) => tr.t('preferences.leftoverTitleUnlabelled'),
  state: (tr) => tr.t('preferences.leftoverTitleState'),
  unknown: (tr) => tr.t('preferences.leftoverTitleUnknown')
}

const LEFTOVER_LEADS: Record<LeftoverReason, (tr: Translator) => string> = {
  unlabelled: (tr) => tr.t('preferences.leftoverLeadUnlabelled'),
  state: (tr) => tr.t('preferences.leftoverLeadState'),
  unknown: (tr) => tr.t('preferences.leftoverLeadUnknown')
}

function buildLeftoverSection(
  reason: LeftoverReason, rows: PreferenceRow[], ctx: PageContext
): HTMLElement {
  const section = el('section', 'prefs__leftover')
  section.dataset.reason = reason

  const tr = ctx.tr
  const heading = el('h3', 'prefs__screen-title')
  heading.append(
    el('span', 'prefs__screen-name', LEFTOVER_TITLES[reason](tr)),
    el('span', 'prefs__screen-count', tr.t('preferences.lineCount', { count: rows.length }))
  )
  section.append(heading, el('p', 'prefs__lead', LEFTOVER_LEADS[reason](tr)))

  // Les familles, comptées : c'est ce qui rend visible qu'un fichier réel porte
  // 18 clés d'espaces aériens dont une seule est nommée.
  const families = new Map<string, number>()
  for (const row of rows) families.set(row.family, (families.get(row.family) ?? 0) + 1)
  const ranked = [...families].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
  if (ranked.length > 1 || (ranked[0]?.[1] ?? 0) > 3) {
    // Une colonne de données : un nom de famille de clés — `Airspace`, `Mapsforge` — et
    // son compte. Rien à traduire hors du repli « (sans famille) ».
    section.append(el('p', 'prefs__families',
      ranked.map(([family, count]) =>
        `${family === '' ? tr.t('preferences.noFamily') : family} : ` +
        `${tr.format.number(count)}`).join(' · ')))
  }

  const list = el('div', 'prefs__list')
  for (const row of rows) list.append(buildRowElement(row, ctx))
  section.append(list)
  return section
}

/**
 * Ce qu'il faut dire d'un fichier qui ne porte aucune préférence — la moitié du corpus,
 * et tous les exports `pages`. Un écran vide se lirait comme une panne.
 */
function buildEmptyNote(
  options: PreferencesPageOptions, counts: PersonalCounts
): HTMLElement {
  const tr = options.tr
  const box = el('div', 'prefs__empty')
  box.append(el('p', 'prefs__empty-title', tr.t('preferences.emptyTitle')))
  box.append(el('p', 'prefs__empty-text', tr.t('preferences.emptyText')))
  box.append(el('p', 'prefs__empty-text', tr.t('preferences.emptyIntact')))
  // ⚠️ « Pas de préférences » ne veut pas dire « rien de personnel ». Le nom et le numéro
  // d'un bouton d'appel vivent dans la disposition, et un export « pages » les emporte.
  // Laisser la page muette ici, c'est laisser croire le contraire.
  if (counts.layout > 0) {
    box.append(el('p', 'prefs__empty-text prefs__empty-text--warn',
      tr.t('preferences.emptyPersonalWarning', { count: counts.layout })))
  }
  if (options.fileVersionName !== undefined) {
    box.append(el('p', 'prefs__summary-note', catalogNote(options)))
  }
  return box
}

/**
 * D'où viennent les **noms de réglages** de cet écran, ou `undefined` quand le dire
 * n'apprendrait rien.
 *
 * ## Le grief, et le vrai remède
 *
 * Un pilote-testeur a lu les captures allemande, néerlandaise et espagnole de cet écran
 * comme « un écran presque entièrement en français ». Aucun défaut de fabrication : notre
 * prose suit bien le globe (`Uit het bestand verwijderen`, `Diesen Wert schreiben`), et
 * les libellés suivent le fichier, qui déclare `Display.Language: fr`. C'est voulu, et
 * c'est même l'une des choses que ce projet tient à montrer.
 *
 * Ce qui manquait est ailleurs : sur les 8 800 px de l'écran, le mot « langue » n'apparaît
 * pas une seule fois. Le pilote a cherché l'explication là où il était, ne l'a pas
 * trouvée, et a conclu à un bug.
 *
 * ## Les deux silences
 *
 * Elle ne s'écrit pas quand elle n'apprendrait rien — même règle que la mention de l'axe
 * dans `metaStrip`, dont elle est le prolongement :
 *
 * - **le fichier ne déclare aucune langue** : les libellés suivent le navigateur ou le
 *   sélecteur, et il n'y a pas de désaccord à expliquer ;
 * - **la langue du fichier est celle du globe** : les deux axes disent la même chose, et
 *   la phrase serait du bruit sur un écran qui en a déjà beaucoup.
 *
 * ⚠️ Elle nomme la langue **réellement affichée**, celle du catalogue chargé : XCTrack ne
 * livre ses libellés que dans 35 langues, et une déclaration hors de cette liste retombe
 * sur l'anglais (`preferenceLanguage`). Dire « la langue que le fichier déclare » serait
 * alors faux ; « ils suivent le fichier ouvert » reste vrai dans les deux cas.
 */
function labelsNote(options: PreferencesPageOptions): string | undefined {
  if (options.labelsFromFile !== true || options.labelLanguage === undefined) return undefined
  // `language` est un code de langue, donc un identifiant : il se passe en `string`.
  const language = preferenceLanguage(options.labelLanguage)
  if (language === options.tr.language) return undefined
  return options.tr.t('preferences.labelsFromFile', { language })
}

/**
 * Construit la page. Synchrone : le catalogue est déjà là — c'est `openPreferencesPage`
 * qui l'a chargé, ou l'appelant qui le fournit.
 */
export function renderPreferencesPage(options: PreferencesPageOptions): PreferencesPage {
  const tr = options.tr
  const inventory = buildPreferenceInventory(
    options.document, options.catalog, tr, options.domains
  )
  const hardware = options.domains?.hardwareKeysFor(fileDevice(options.document)) ?? null
  const root = el('section', 'prefs')
  // Un fichier sans préférence n'a rien à régler : la page y reste ce qu'elle est, une
  // explication. `onEdit` branché n'y change rien.
  const onEdit = inventory.summary.empty ? undefined : options.onEdit
  const editable = onEdit !== undefined
  // Lisible d'un test ou d'un harnais sans dépendre du style : le mode de la page est une
  // promesse, et une promesse doit se vérifier de l'extérieur.
  root.dataset.mode = editable ? 'edition' : 'lecture'

  const head = el('header', 'prefs__head')
  const titles = el('div', 'prefs__titles')
  // Le menu « Fichier » nomme cette page « Réglages généraux » : un écran et la commande
  // qui l'ouvre doivent porter le même nom, sans quoi le pilote doute d'être au bon endroit.
  titles.append(el('h2', 'prefs__title', tr.t('preferences.pageTitle')))
  const subtitle = options.fileName === undefined
    ? tr.t('preferences.pageSubtitle')
    : tr.t('preferences.pageSubtitleNamed', { file: options.fileName })
  titles.append(el('p', 'prefs__subtitle', subtitle))
  // D'où viennent les noms de réglages de cet écran — en tête, avant les 8 800 px de
  // lignes, parce que c'est là qu'on les rencontre. Voir `labelsNote`.
  const labels = labelsNote(options)
  if (labels !== undefined) titles.append(el('p', 'prefs__labels', labels))
  head.append(titles)

  const actions = el('div', 'prefs__actions')
  head.append(actions)
  root.append(head)

  const ctx: PageContext = {
    collected: [], tr, labels: options.catalog.language, personal: personalProse(tr),
    hardware, domains: options.domains, device: fileDevice(options.document)
  }

  if (inventory.summary.empty) {
    root.append(buildEmptyNote(options, inventory.summary.personalCounts))
    return finish(root, inventory, ctx, options, actions, editable)
  }

  const summaryBox = buildSummaryBox(inventory, options)
  root.append(summaryBox)
  let privacyBox = buildPrivacyBox(inventory, options.catalog, ctx)
  root.append(privacyBox)

  if (onEdit !== undefined) {
    // Ce que le pilote vient de renseigner de personnel, listé au fur et à mesure : une
    // clé qu'on remplit devient quelque chose qui voyage, et c'est le moment de le dire,
    // pas au moment d'envoyer le fichier.
    const filled = el('p', 'prefs__filled')
    filled.hidden = true
    root.insertBefore(filled, privacyBox.nextSibling)
    const written: string[] = []

    ctx.edit = {
      document: options.document,
      catalog: options.catalog,
      tr,
      labels: options.catalog.language,
      conflicts: new Set(options.catalog.meta.defaultConflicts),
      domains: options.domains,
      hardware,
      trust: catalogTrust(options),
      onEdit,
      secrets: [],
      wrote: (row, previous, edit) => {
        recount(inventory.summary, previous, row.state)
        // Le fichier a gagné ou perdu une clé : on le relit plutôt que de tenir un
        // compte à la main, qui dériverait au premier cas oublié.
        if (edit.outcome !== 'set') {
          inventory.summary.fileKeyCount = readFilePreferences(options.document).size
        }
        fillSummaryBox(summaryBox, inventory, options)
        if (edit.personal !== undefined || edit.outcome !== 'set') {
          const open = privacyBox instanceof HTMLDetailsElement && privacyBox.open
          refreshPersonal(inventory, options.document, options.catalog, tr)
          const fresh = buildPrivacyBox(inventory, options.catalog, ctx)
          if (open && fresh instanceof HTMLDetailsElement) fresh.open = true
          privacyBox.replaceWith(fresh)
          privacyBox = fresh
        }
        if (edit.personal !== undefined && !written.includes(edit.key)) {
          written.push(edit.key)
          filled.hidden = false
          // `keys` est une colonne de noms de réglages, jointe par `', '` : `format.list`
          // en ferait une énumération de prose là où il y a une liste.
          filled.textContent = tr.t('preferences.filledPersonal', {
            count: written.length, keys: written.join(', ')
          })
        }
      }
    }
  }

  const menuSection = el('section', 'prefs__menu')
  menuSection.append(el('p', 'prefs__lead',
    tr.t(editable ? 'preferences.menuLeadEditable' : 'preferences.menuLead')))
  for (const entry of inventory.menu) menuSection.append(buildMenuElement(entry, ctx))
  root.append(menuSection)

  const reasons: LeftoverReason[] = ['unlabelled', 'state', 'unknown']
  for (const reason of reasons) {
    const rows = inventory.leftovers.filter((row) => row.reason === reason)
    if (rows.length === 0) continue
    root.append(buildLeftoverSection(reason, rows, ctx))
  }

  return finish(root, inventory, ctx, options, actions, editable)
}

/** Un état qui en remplace un autre : le compte suit, sinon le bandeau ment. */
function recount(
  summary: PreferencesSummary, previous: PreferenceState, next: PreferenceState
): void {
  if (previous === next) return
  const field = {
    custom: 'customCount', default: 'defaultCount', undecidable: 'undecidableCount',
    conflict: 'conflictCount', absent: 'absentCount', unwritten: 'unwrittenCount'
  } as const
  summary[field[previous]] -= 1
  summary[field[next]] += 1
}

/** Refait le relevé des données personnelles depuis le document tel qu'il est maintenant. */
function refreshPersonal(
  inventory: PreferenceInventory, document: JsonNode, catalog: PreferenceCatalog,
  tr: Translator
): void {
  const file = readFilePreferences(document)
  const ctx: RowContext = {
    catalog, tr, labels: catalog.language, file,
    conflicts: new Set(catalog.meta.defaultConflicts)
  }
  inventory.personal = []
  inventory.summary.personalCount = 0
  for (const key of file.keys()) {
    if (catalog.preference(key)?.personal === undefined) continue
    inventory.summary.personalCount += 1
    inventory.personal.push(buildRow(key, ctx))
  }
  inventory.summary.personalCounts = collectPersonalData(document).counts
}

function buildMenuElement(entry: PreferenceMenuEntry, ctx: PageContext): HTMLElement {
  const tr = ctx.tr
  const section = el('section', 'prefs__entry')
  section.dataset.menu = entry.menuKey

  if (entry.screens.length === 0) {
    const line = el('div', 'prefs__entry-quiet')
    line.append(el('span', 'prefs__entry-name', entry.title))
    const note = el('span', 'prefs__entry-note')
    note.append(el('span', 'prefs__entry-why',
      entry.note ?? tr.t('preferences.entryNothing')))
    if (entry.tally !== undefined) {
      note.append(el('span', 'prefs__entry-tally', tallyText(entry.tally, tr)))
    }
    line.append(note)
    section.append(line)
    return section
  }


  for (const screen of entry.screens) {
    const block = el('section', 'prefs__screen')
    block.dataset.screen = screen.id

    const count = screen.blocks.reduce((total, one) => total + one.rows.length, 0)
    const heading = el('h3', 'prefs__screen-title')
    heading.append(
      el('span', 'prefs__screen-name', screen.title),
      el('span', 'prefs__screen-count', tr.t('preferences.settingCount', { count }))
    )
    block.append(heading)

    for (const group of screen.blocks) {
      if (group.title !== undefined) block.append(el('h4', 'prefs__category', group.title))
      const list = el('div', 'prefs__list')
      for (const row of group.rows) list.append(buildRowElement(row, ctx))
      block.append(list)
      if (ctx.edit !== undefined) {
        for (const note of refusalNotes(group.rows, tr)) block.append(note)
      }
    }

    const scope = hardwareScopeNote(screen, ctx)
    if (scope !== undefined) block.append(el('p', 'prefs__hardware', scope))
    // Pourquoi une touche porte un nom et l'autre un `KEYCODE_*`. Après la note de
    // matériel, parce qu'elle explique ce que celle-ci vient de montrer.
    const naming = keyNamingScopeNote(screen, ctx)
    // Même habillage que la note de matériel — c'est une phrase de portée, pas une
    // alarme —, et un modificateur pour que le compte de l'une ne prenne pas l'autre.
    if (naming !== undefined) {
      block.append(el('p', 'prefs__hardware prefs__hardware--origin', naming))
    }
    // L'hypothèse — le seul propos de cet écran qui soit **supposé** et non mesuré. En
    // clair, après les deux notes qui expliquent comment lire les lignes : elle a vécu un
    // jour en infobulle et le pilote-testeur du 2026-08-22 l'a jugée inatteignable au
    // doigt. Un statut d'interprétation ne dépend pas d'un survol.
    for (const said of hypothesisScopeNotes(screen, ctx)) {
      block.append(el('p', 'prefs__hardware prefs__hardware--hypothesis', said))
    }

    if (screen.neverExported > 0) {
      block.append(el('p', 'prefs__never',
        tr.t('preferences.neverExported', { count: screen.neverExported })))
    }
    section.append(block)
  }
  return section
}

/**
 * Ce que notre relevé dit — ou ne dit pas — du **boîtier** dont vient ce fichier, une
 * fois sous le bloc. Tout le propos est dans `hardwareNote` : ici on ne fait que
 * rassembler les liaisons de l'écran.
 */
function hardwareScopeNote(
  screen: PreferenceScreenBlock, ctx: PageContext
): string | undefined {
  if (ctx.domains === undefined) return undefined
  return hardwareNote(
    screenBindings(screen), ctx.hardware, ctx.domains.hardwareKeySurveys(),
    ctx.device, ctx.tr, ctx.labels
  )
}

/** D'où viennent les noms de touches de ce bloc. Rassemble les liaisons, rien de plus. */
function keyNamingScopeNote(
  screen: PreferenceScreenBlock, ctx: PageContext
): string | undefined {
  if (ctx.domains === undefined) return undefined
  return keyNamingNote(screenBindings(screen), ctx.hardware, ctx.tr)
}

/**
 * Les hypothèses de ce bloc. Tout le propos est dans `hypothesisNotes` : ici on ne fait
 * que rassembler les liaisons de l'écran.
 */
function hypothesisScopeNotes(screen: PreferenceScreenBlock, ctx: PageContext): string[] {
  if (ctx.domains === undefined) return []
  return hypothesisNotes(
    screenBindings(screen),
    { domains: ctx.domains, hardware: ctx.hardware, labels: ctx.labels }, ctx.tr
  )
}

/** Toutes les liaisons de touche d'un écran, dans l'ordre où elles s'y lisent. */
function screenBindings(screen: PreferenceScreenBlock): KeyBinding[] {
  return screen.blocks
    .flatMap((group) => group.rows)
    .map((row) => row.binding)
    .filter((one): one is KeyBinding => one !== undefined)
}

/**
 * Ce qui, dans ce bloc, ne se règle pas — une phrase par raison, avec son compte.
 *
 * Sur l'écran des touches, quinze lignes de suite portent la même raison : la phrase
 * s'écrit une fois, sous le bloc, comme le fait déjà la note « ne quittent jamais
 * l'appareil ». Chaque ligne garde sa marque (`data-settable="false"`) et son infobulle.
 */
function refusalNotes(rows: readonly PreferenceRow[], tr: Translator): HTMLElement[] {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const refusal = editRefusal(row, tr)
    if (refusal === undefined) continue
    counts.set(refusal, (counts.get(refusal) ?? 0) + 1)
  }
  return [...counts].map(([reason, count]) =>
    el('p', 'prefs__refusal', tr.t('preferences.refusalNote', { count, reason })))
}

/**
 * Le compte qui donne sa mesure au manque : combien de clés ce fichier porte sous cette
 * entrée, et combien d'entre elles la page sait nommer.
 */
export function tallyText(
  tally: { total: number; labelled: number }, tr: Translator
): string {
  const lines = tr.t('preferences.lineCount', { count: tally.total })
  if (tally.labelled === 0) return tr.t('preferences.tallyNone', { lines })
  return tr.t('preferences.tallySome', {
    lines,
    named: tr.t('preferences.tallyNamed', { count: tally.labelled }),
    listed: tr.t('preferences.tallyListed', { count: tally.total - tally.labelled })
  })
}

/** Le seuil au-delà duquel un champ de filtrage rend service plutôt que d'encombrer. */
export const FILTER_THRESHOLD = 12

function finish(
  root: HTMLElement, inventory: PreferenceInventory, ctx: PageContext,
  options: PreferencesPageOptions, actions: HTMLElement, editable: boolean
): PreferencesPage {
  const tr = options.tr
  const collected = ctx.collected
  let query = ''
  let onlyCustom = false

  function apply(): void {
    const needle = normalize(query.trim())
    for (const row of collected) {
      const missed = needle !== '' && !row.haystack.includes(needle)
      row.element.hidden = missed || (onlyCustom && row.row.state !== 'custom')
    }
  }

  function filter(next: string): void {
    query = next
    apply()
  }

  if (collected.length > FILTER_THRESHOLD) {
    const tools = el('div', 'prefs__tools')

    const search = el('input', 'prefs__filter')
    search.type = 'search'
    // Le même mot pour le texte indicatif et pour le nom accessible : deux formulations
    // pour un même champ se liraient comme deux champs.
    search.placeholder = tr.t('preferences.filterPlaceholder')
    search.setAttribute('aria-label', tr.t('preferences.filterPlaceholder'))
    search.addEventListener('input', () => { filter(search.value) })
    tools.append(search)

    if (inventory.summary.customCount > 0) {
      // Le pilote, c'est lui. Un bouton qui s'appelle « Seulement ce que le pilote a
      // réglé » donne l'impression de consulter le dossier de quelqu'un d'autre — et le
      // bandeau, juste au-dessus, lui dit déjà « Vous avez réglé… ».
      const only = el('button', 'btn prefs__only', tr.t('preferences.onlyMine'))
      only.type = 'button'
      only.setAttribute('aria-pressed', 'false')
      only.addEventListener('click', () => {
        onlyCustom = only.getAttribute('aria-pressed') !== 'true'
        only.setAttribute('aria-pressed', String(onlyCustom))
        only.textContent = tr.t(onlyCustom ? 'preferences.showAll' : 'preferences.onlyMine')
        apply()
      })
      tools.append(only)
    }

    if (inventory.summary.personalCount > 0) {
      // Utile avant une capture d'écran ou un partage : la page se montre sans les
      // valeurs qui désignent quelqu'un. Rien n'est retiré du fichier, évidemment.
      const mask = el('button', 'btn prefs__mask', tr.t('preferences.maskPersonal'))
      mask.type = 'button'
      mask.setAttribute('aria-pressed', 'false')
      mask.addEventListener('click', () => {
        const next = mask.getAttribute('aria-pressed') !== 'true'
        mask.setAttribute('aria-pressed', String(next))
        mask.textContent = tr.t(next
          ? 'preferences.showPersonal'
          : 'preferences.maskPersonal')
        root.classList.toggle('prefs--masked', next)
        // Une règle de style ne couvre pas le contenu d'un champ de saisie : on bascule
        // le type, ce qui laisse la valeur intacte dans le DOM — comme le fait le
        // masquage du texte, qui la garde dans `data-clear`.
        for (const input of ctx.edit?.secrets ?? []) input.type = next ? 'password' : 'text'
      })
      tools.append(mask)
    }

    root.insertBefore(tools, root.children[1] ?? null)
  }

  let closed = false
  function close(): void {
    if (closed) return
    closed = true
    root.remove()
    options.onClose?.()
  }

  if (options.onClose !== undefined) {
    const button = el('button', 'btn prefs__close', tr.t('preferences.close'))
    button.type = 'button'
    button.addEventListener('click', close)
    actions.append(button)
  }

  return { element: root, summary: inventory.summary, inventory, editable, filter, close }
}

/* ------------------------------------------------------------- ouverture à la demande */

export interface OpenPreferencesOptions extends Omit<PreferencesPageOptions, 'catalog'> {
  /** La langue de la session, déjà résolue par l'appelant — voir `resolveLanguage`. */
  language: string
}

/**
 * Charge le catalogue puis construit la page.
 *
 * **C'est l'entrée que l'assembleur doit employer**, et il doit l'atteindre par un
 * `import('./preferencesPage')` : ce module importe le catalogue des préférences, dont
 * Vite tire deux morceaux séparés (une part invariante et un fichier par langue) qui ne
 * doivent jamais rejoindre le morceau principal. Un pilote qui n'ouvre jamais cette page
 * ne télécharge ni le module, ni le catalogue.
 *
 * Le poids exact est publié par `PREFERENCES_PAGE_WEIGHT`.
 */
export async function openPreferencesPage(
  options: OpenPreferencesOptions
): Promise<PreferencesPage> {
  // Les deux chargements partent ensemble : ils ne se conditionnent pas l'un l'autre, et
  // les enchaîner ajouterait un aller-retour à l'ouverture de la page.
  //
  // Les domaines sont **facultatifs** — sans eux la page perd les listes d'unités et la
  // lecture des touches, elle ne perd rien d'autre. Leur échec ne doit donc pas empêcher
  // le pilote d'ouvrir ses réglages : il est avalé ici, et la page se construit sans.
  const [catalog, domains] = await Promise.all([
    loadPreferenceCatalog(options.language),
    loadPreferenceDomains().catch(() => undefined)
  ])
  // `labelLanguage` : la langue demandée pour les LIBELLÉS, que `labelsNote` ramènera à
  // celle que le catalogue porte vraiment. L'assembleur n'a pas à la répéter.
  return renderPreferencesPage({
    ...options, catalog, domains, labelLanguage: options.language
  })
}

/**
 * Ce que cette page coûte au réseau — **mesuré** sur `vite build`, pas estimé — pour que
 * l'assembleur sache ce qu'il déclenche et le dise au pilote s'il le juge utile.
 *
 * ⚠️ **Ce tableau est un instantané, et il ne peut pas être autre chose** : chaque octet
 * dépend de la construction du jour, et le moindre commit le fait bouger de quelques
 * dixièmes. Il est donc **daté**, et aucun test ne le tient — le tenir voudrait dire
 * reconstruire le site à chaque essai. Ce qui compte et qui, lui, ne bouge pas, est en
 * dessous du tableau : cinq morceaux, tous à la demande, aucun dans le morceau principal.
 *
 * **Relevé le 22 août 2026**, `npm run build` puis `ls -l dist/assets` et `gzip -9`.
 * L'écart avec le relevé précédent était de 1 à 3 % sur deux lignes — `preferencesPage-*.css`
 * annoncé 9,6 Ko pour 9,9 mesurés, `preferenceCatalog/base` 98,9 pour 97,9 :
 *
 * Cinq morceaux, tous chargés à la demande, aucun dans le morceau principal :
 *
 * | morceau                   |  émis   |  gzip   |
 * |---------------------------|---------|---------|
 * | `preferencesPage-*.js`    | 37,9 Ko | 11,5 Ko |
 * | `preferencesPage-*.css`   |  9,9 Ko |  2,3 Ko |
 * | `preferenceDomains-*.js`  | 12,7 Ko |  4,3 Ko |
 * | `preferenceCatalog/base`  | 97,9 Ko | 14,6 Ko |
 * | `preferenceCatalog/<lg>`  | 17,0 Ko |  6,3 Ko |
 *
 * Soit **176 Ko émis, environ 39 Ko transférés** à la première ouverture, puis 17 Ko de
 * plus par langue supplémentaire — la part invariante ne se retélécharge pas.
 *
 * Le module a pris 11,2 Ko en devenant modifiable : les contrôles, l'écriture, le couple
 * implicite / explicite et le recalcul des comptes. Puis 6,4 Ko de plus, et un cinquième
 * morceau de 12,7 Ko, en fermant les listes d'unités et en rendant les touches lisibles.
 * Il en a **rendu 7,1** en versant sa prose au catalogue : ces octets-là ne sont pas
 * économisés, ils ont changé de morceau. Ils vivent maintenant dans le catalogue de la
 * langue du pilote (`src/i18n/`), qui est **chargé au démarrage** et qui grossit de 1,5 Ko
 * compressés en français à 2,2 Ko en néerlandais. Le bilan tient en une phrase : la page
 * coûte moins cher à ouvrir, et l'amorçage un peu plus — mais d'une seule langue, jamais
 * de cinq.
 *
 * Tout le reste part à la demande — un pilote qui n'ouvre jamais cette page ne télécharge
 * rien de tout cela.
 *
 * ⚠️ Le chiffre du module est un **majorant** : il a été relevé sur un point d'entrée qui
 * n'importe rien d'autre, donc il emporte `core/access`, `core/serializeJson` et
 * `model/preferences`, que le morceau principal de l'éditeur porte déjà.
 */
export const PREFERENCES_PAGE_WEIGHT = {
  /** Le module de page, une fois construit. */
  moduleKb: 37.9,
  /** Sa feuille de style, émise à part par Vite. */
  styleKb: 9.6,
  /**
   * Les domaines relevés — vocabulaire des unités, 338 codes de touche, les huit listes
   * relevées à l'écran et les touches physiques d'un boîtier.
   */
  domainsKb: 12.7,
  /** La part invariante du catalogue : préférences, écrans, valeurs, défauts, portées. */
  catalogBaseKb: 98.9,
  /** Le fichier de textes d'une langue, repli anglais déjà fusionné. */
  catalogLanguageKb: 17,
  /** Ce que le réseau transporte réellement à la première ouverture, en gzip. */
  transferredKb: 39
} as const
