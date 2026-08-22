import { readableName } from '../catalog/widgetNames'
import type { VersionDatabase } from '../catalog/widgetVersions'
import { getMember } from '../core/access'
import {
  applyCleanup,
  planCleanup,
  revertCleanup,
  type CleanupEntry,
  type CleanupOutcome,
  type CleanupPlan
} from '../model/cleanup'
import type { Translator } from '../i18n'
import type { Layout } from '../model/layout'
import './cleanupPanel.css'

/**
 * L'interface de nettoyage : ce qui partirait, décochable un à un, un geste explicite
 * pour agir, et le retour en arrière juste après.
 *
 * Elle se pose sous le diagnostic de version (`versionDiagnostic.ts`), qui l'appelle. Le
 * calcul et le retrait sont ailleurs (`src/model/cleanup.ts`) : ce module ne décide de
 * rien, il fait décider.
 *
 * ## Cinq décisions, et leurs raisons
 *
 * 1. **Rien ne s'affiche quand il n'y a rien à enlever.** Pas de « aucun réglage périmé »,
 *    pas de coche verte : un pilote dont la configuration va bien n'a pas à lire un
 *    message sur l'état de sa configuration. Le diagnostic, lui, dit déjà ce qu'il sait.
 *
 * 2. **Le ton n'alarme pas, parce qu'il n'y a pas lieu.** Laisser un réglage périmé ne
 *    casse rien : l'instrument le consommera de lui-même. Écrire « votre fichier contient
 *    des erreurs » serait faux, et ferait cliquer par peur quelqu'un qui n'a aucune raison
 *    de cliquer.
 *
 *    ⚠️ **Mais le contraire a été écrit ici, et il était faux.** Cet écran a affirmé que
 *    « XCTrack les transporte sans les lire » et que « les enlever allège le fichier,
 *    c'est tout ». Mesuré le 22 août 2026 sur un AIR³ 7.2 : enlever `showWind: true` fait
 *    passer le compas de `windStyle: ARROW` à `NONE`, et la flèche de vent disparaît.
 *    Rassurer sans avoir mesuré est la faute que ce module ne doit plus commettre : la
 *    phrase d'apaisement ne porte désormais que sur les réglages dont
 *    `catalog/legacyMigrations.ts` atteste, avec et sans, que l'appareil en tire la même
 *    chose.
 *
 * 2 bis. **Ce qui n'est pas proposé est quand même montré.** Un réglage périmé dont le
 *    retrait changerait l'instrument — ou dont personne ne sait dire ce qu'il changerait —
 *    n'est pas escamoté : il paraît sous « … trouvés, et laissés en place », sans case à
 *    cocher, avec la raison. Le taire donnerait à croire que le fichier est propre, et
 *    priverait le pilote du seul renseignement utile : il n'a rien à faire.
 *
 * 3. **Le nom technique du réglage est montré tel quel** — `mapWidget_showTerrain`, et
 *    non un libellé français. Ce n'est pas un défaut de traduction : le catalogue de
 *    libellés vient de la version courante de XCTrack, et **elle ne décrit plus ces
 *    réglages-là**. C'est précisément ce qui en fait des reliquats. Inventer un libellé
 *    donnerait au pilote l'illusion d'un réglage qu'il pourrait retrouver dans son
 *    appareil ; il n'y est plus.
 *
 * 4. **La valeur n'est montrée que si c'est un nombre, un oui/non ou `null`.** Jamais une
 *    chaîne, jamais le contenu d'une structure : un texte peut porter un nom, un numéro
 *    de téléphone, le nom d'une compétition (voir `src/model/personalData.ts`). Un
 *    interrupteur oublié se lit très bien sans cela.
 *
 * 5. **Une raison se dit deux fois : ce que ça ferait, puis ce qu'on a relevé.** La
 *    phrase française passe devant — « la flèche de vent disparaîtrait de ce compas » —,
 *    et la mesure suit à la ligne, dans les mots que l'appareil a écrits :
 *    « sans lui, `windStyle` passe de `ARROW` à `NONE` ».
 *
 *    ⚠️ **Ni l'une sans l'autre.** L'écran n'a longtemps porté que la seconde, et un
 *    pilote-testeur a dit le 22 août 2026 cliquer « par confiance, pas par compréhension » :
 *    la phrase humaine n'existait que dans le manuel, c'est-à-dire là où l'on ne décide
 *    rien. Mais la retirer *elle* au profit de la phrase française serait la faute
 *    symétrique, et c'est celle que ce module a déjà commise : parler de l'appareil sans
 *    montrer ce qu'on en a lu. La mesure est la preuve, et c'est par elle que le pilote
 *    retrouve la ligne dans son fichier.
 *
 * ## La prose est au catalogue, la ligne de repérage aussi
 *
 * Les phrases de cet écran vivent dans `src/i18n/messages/<langue>/versions.ts`, sous le
 * préfixe `cleanup.` — le même domaine que le diagnostic, puisque c'est le même lot de
 * travail. La **ligne qui situe un gadget** (« Portrait · page 2 · rang 1 · … ») y est
 * aussi, sous `versions.placePortrait` et `versions.placeLandscape` : les deux écrans la
 * lisent maintenant au même endroit, là où ils l'écrivaient chacun de son côté. Ce module
 * continue de ne rien importer de celui qui l'appelle.
 *
 * ## Pourquoi `onChange` est obligatoire
 *
 * Ce module modifie le document **en place**. L'écran qui l'héberge doit donc pouvoir
 * enregistrer un pas d'annulation et redessiner les pages : sans quoi le pilote verrait
 * un dessin qui ne correspond plus au fichier, et son « annuler » général sauterait
 * par-dessus le nettoyage sans le dire. Un hôte qui ne peut pas faire cela ne doit pas
 * proposer le geste — d'où le rappel qui suit, à l'usage de qui branche ce module.
 */

/** Ce qui vient de se passer, à charge de l'hôte d'en tirer un pas d'historique. */
export interface CleanupEvent {
  kind: 'applied' | 'reverted'
  /** Réglages retirés, ou remis. */
  keyCount: number
  /** Gadgets touchés. */
  widgetCount: number
  /** Le libellé du pas — « Enlever 9 réglages d'une ancienne version ». */
  description: string
}

export interface CleanupSectionOptions {
  db: VersionDatabase
  /** Le traducteur de **notre prose**, passé par l'écran qui héberge cette section. */
  tr: Translator
  /** La disposition du document **vivant** : ses nœuds seront modifiés en place. */
  layout: Layout
  /** Le palier visé. Sans palier retenu, l'hôte n'appelle pas ce module. */
  tier: number
  /** La langue des **libellés de XCTrack**, l'autre axe : elle suit le fichier ouvert. */
  language?: string
  /** Appelé après chaque geste — retrait comme remise. Voir l'en-tête. */
  onChange: (event: CleanupEvent) => void
}

export interface CleanupSection {
  element: HTMLElement
  /** Le plan courant. `entries` vide : la section ne montre rien. */
  plan: () => CleanupPlan
  /**
   * Refait le plan sur cette disposition et ce palier. **Laisse en place** le retour en
   * arrière d'un retrait qui vient d'avoir lieu : après un nettoyage le plan est vide, et
   * tout rebâtir escamoterait le bouton de remise au moment précis où il sert.
   */
  refresh: (layout: Layout, tier: number) => void
  /**
   * Refait le plan **et** referme le retour en arrière. Pour un autre fichier ou un autre
   * choix de version : ce qui a été enlevé ne concerne plus ce qu'on regarde.
   */
  reset: (layout: Layout, tier: number) => void
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, className?: string, text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className !== undefined) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

/**
 * « Portrait · page 2 · rang 1 · Carte de compétition ». Même ligne que `placeLabel` du
 * diagnostic, et désormais **le même message** : elle est au catalogue, ce module la lit
 * sans rien importer de celui qui l'appelle.
 */
function placeOf(tr: Translator, entry: CleanupEntry, language: string): string {
  const where = {
    page: entry.pageRank,
    rank: entry.widgetRank,
    name: readableName(entry.shortName, language)
  }
  return entry.orientation === 'portrait'
    ? tr.t('versions.placePortrait', where)
    : tr.t('versions.placeLandscape', where)
}

/**
 * La dernière version **publiée** qui lisait encore ce réglage.
 *
 * Le palier n'est pas un mot du pilote, et le palier suivant n'est parfois qu'une
 * construction intermédiaire que personne n'a installée. On remonte donc jusqu'à une
 * version qu'il a pu avoir dans les mains, et on ne dit rien si l'on n'en trouve pas.
 */
function lastReadingRelease(db: VersionDatabase, tier: number): string | null {
  for (let index = tier; index >= 0; index -= 1) {
    const names = db.tier(index)?.releaseNames ?? []
    const last = names[names.length - 1]
    if (last !== undefined) return last
  }
  return null
}

/**
 * Ce que porte le réglage, quand le dire est sans risque. `null` sinon — voir la
 * quatrième décision de l'en-tête.
 */
function safeValue(tr: Translator, entry: CleanupEntry): string | null {
  const node = getMember(entry.node, entry.key)
  if (node?.kind !== 'literal') return null
  if (node.raw === 'true') return tr.t('cleanup.valueYes')
  if (node.raw === 'false') return tr.t('cleanup.valueNo')
  // Un nombre écrit par XCTrack : il ressort **tel quel**, jamais mis en forme — « 1000 »
  // est ce que le fichier porte, « 1 000 » ne s'y trouve nulle part.
  return node.raw
}

/** Le détail d'un réglage : depuis quand il ne sert plus, et ce qu'il porte. */
function noteOf(tr: Translator, db: VersionDatabase, entry: CleanupEntry): string {
  const release = lastReadingRelease(db, entry.lastReadTier)
  const since = release === null
    ? tr.t('cleanup.noLongerRead')
    : tr.t('cleanup.usedUntil', { release })
  const value = safeValue(tr, entry)
  const note = value === null ? since : tr.t('cleanup.noteWithValue', { value, since })
  return entry.occurrences > 1
    ? tr.t('cleanup.noteRepeated', { note, count: entry.occurrences })
    : note
}

/** « Carte de compétition (3), Boussole (2) » — sur quels gadgets cela porte. */
function gadgetSummary(tr: Translator, entries: CleanupEntry[], language: string): string {
  const counts = new Map<string, number>()
  for (const entry of entries) {
    const name = readableName(entry.shortName, language)
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1])
    // `count > 1` est ici une condition d'affichage et non un accord : le compte n'est
    // écrit que s'il y en a plusieurs, « Boussole » se suffisant à lui-même. Rien à
    // reverser sur le pluriel du socle, qui choisit une forme et ne décide pas d'omettre.
    //
    // La parenthèse est écrite ici et non au catalogue : elle ne porte aucun mot, les cinq
    // langues l'écrivent à l'identique, et une clé qui ne serait faite que de ponctuation
    // serait indiscernable d'une traduction oubliée. C'est une colonne de données — le
    // nombre, lui, est bien mis en forme par la langue.
    .map(([name, count]) => (count > 1 ? `${name} (${tr.format.number(count)})` : name))
    .join(', ')
}

/**
 * Les conséquences mesurées, de l'identifiant que porte le relevé à la clé du catalogue.
 *
 * Deux tables auraient pu s'en charger — un troisième segment de clé, ou une
 * concaténation — et aucune n'aurait été vérifiable : `t()` refuse une clé calculée, et
 * c'est ce refus qu'on veut ici. Une mesure « vivante » qui arriverait de l'appareil sans
 * sa phrase se verrait donc au premier essai, jamais à l'écran d'un pilote.
 * `cleanupPanel.test.ts` compare cette table à `legacyMigrations.json`.
 */
const EFFECT_KEYS = {
  windArrowGone: 'removalEffect.windArrowGone',
  terrainShadingGone: 'removalEffect.terrainShadingGone'
} as const

/**
 * **Ce que le retrait ferait, dit au pilote** — puis la mesure qui le prouve, à la ligne.
 *
 * L'ordre n'est pas décoratif. Cet écran n'a longtemps montré que la seconde ligne
 * (« sans lui, windStyle passe de ARROW à NONE ») et un pilote-testeur a dit, le 22 août
 * 2026, cliquer « par confiance, pas par compréhension » : `windStyle`, `ARROW` et `NONE`
 * ne sont des mots ni de son instrument ni de sa langue. La phrase française passe donc
 * devant.
 *
 * ⚠️ **Elle ne remplace pas la mesure, elle la porte.** Les noms et valeurs de XCTrack
 * sont ce que l'appareil a relu : c'est la preuve, et c'est par elle que le pilote
 * retrouve la ligne dans son fichier. Les escamoter referait, à l'envers, la faute que ce
 * module vient de corriger — parler de l'appareil sans montrer ce qu'on en a lu.
 */
function heldReason(tr: Translator, entry: CleanupEntry): readonly string[] {
  const { verdict, successor, present, absent, effect } = entry.removal
  if (verdict === 'live' && successor !== undefined
    && present !== undefined && absent !== undefined) {
    const key = effect !== undefined && effect in EFFECT_KEYS
      ? EFFECT_KEYS[effect as keyof typeof EFFECT_KEYS]
      : 'removalEffect.unnamed'
    return [
      tr.t('cleanup.heldLive', { effect: tr.t(key) }),
      tr.t('cleanup.heldMeasure', { successor, present, absent })
    ]
  }
  return [tr.t('cleanup.heldUnmeasured')]
}

/**
 * La mesure d'un réglage **proposé** : avec ou sans lui, l'appareil en tire la même chose.
 *
 * C'est la contrepartie exacte de `cleanup.heldMeasure`, et elle existe pour une raison
 * précise : sur le même compas, `newWindArrow` est proposé et `showWind` ne l'est pas.
 * Rien à l'écran ne disait pourquoi, et le pilote-testeur a « parié que l'outil s'était
 * trompé de sens ». Les deux mesures côte à côte le disent sans commentaire.
 *
 * `null` quand le relevé ne porte pas les deux colonnes : on n'écrit pas une preuve qu'on
 * n'a pas.
 */
function inertMeasure(tr: Translator, entry: CleanupEntry): string | null {
  const { successor, absent } = entry.removal
  if (successor === undefined || absent === undefined) return null
  return tr.t('cleanup.inertMeasure', { successor, value: absent })
}

/**
 * Construit la section. Elle est vide — sans un mot — tant qu'il n'y a **rien à dire** :
 * ni réglage à enlever, ni réglage trouvé et laissé en place.
 */
export function buildCleanupSection(options: CleanupSectionOptions): CleanupSection {
  const { db, tr, onChange } = options
  const language = options.language ?? 'fr'

  let layout = options.layout
  let tier = options.tier
  let plan = planCleanup(db, layout, tier)
  /** Le dernier retrait, tant qu'il peut être défait. */
  let undoable: CleanupOutcome | null = null
  /** Les chemins encore cochés. Décocher garde le réglage. */
  let selected = new Set(plan.entries.map((entry) => entry.path))

  const root = el('section', 'vclean')

  function apply(): void {
    if (selected.size === 0) return
    const outcome = applyCleanup(plan, selected)
    if (outcome.keyCount === 0) return
    undoable = outcome
    plan = planCleanup(db, layout, tier)
    selected = new Set(plan.entries.map((entry) => entry.path))
    render()
    onChange({
      kind: 'applied',
      keyCount: outcome.keyCount,
      widgetCount: outcome.widgetCount,
      description: tr.t('cleanup.removeStep', { count: outcome.keyCount })
    })
  }

  function revert(): void {
    const outcome = undoable
    if (outcome === null) return
    undoable = null
    const count = revertCleanup(outcome)
    plan = planCleanup(db, layout, tier)
    selected = new Set(plan.entries.map((entry) => entry.path))
    render()
    onChange({
      kind: 'reverted',
      keyCount: count,
      widgetCount: outcome.widgetCount,
      description: tr.t('cleanup.restoreStep', { count })
    })
  }

  /* ------------------------------------------------------------------- le dessin */

  function renderDone(outcome: CleanupOutcome): void {
    root.classList.add('vclean--done')
    const done = el('p', 'vclean__done')
    done.setAttribute('role', 'status')
    done.textContent = tr.t('cleanup.removedTally', {
      count: outcome.keyCount,
      instances: tr.t('common.widgetCount', { count: outcome.widgetCount })
    })
    root.append(done)

    const undo = el('button', 'vclean__undo',
      tr.t('cleanup.undoButton', { count: outcome.keyCount }))
    undo.type = 'button'
    undo.addEventListener('click', () => { revert() })
    root.append(undo)
    // Le geste vient d'avoir lieu : c'est là que doit être le clavier, et pas ailleurs.
    undo.focus()
    // Ce qui n'a pas été proposé reste sous les yeux : le fichier n'est pas « propre »
    // pour autant, et le pilote doit pouvoir le lire sans rouvrir la boîte.
    if (plan.held.length > 0) root.append(renderHeld())
  }

  function renderList(): HTMLElement {
    const details = el('details', 'vclean__details')
    details.append(el('summary', undefined,
      tr.t('cleanup.seeList', { count: plan.entries.length })))

    const body = el('div', 'vclean__details-body')
    body.append(el('p', 'vclean__caveat', tr.t('cleanup.caveat')))

    const groups = new Map<string, CleanupEntry[]>()
    for (const entry of plan.entries) {
      const id = `${entry.orientation}/${entry.pageRank}/${entry.widgetRank}`
      const bucket = groups.get(id)
      if (bucket === undefined) groups.set(id, [entry])
      else bucket.push(entry)
    }

    const list = el('ul', 'vclean__list')
    for (const entries of groups.values()) {
      const item = el('li', 'vclean__group')
      const first = entries[0]
      if (first !== undefined) {
        item.append(el('p', 'vclean__place', placeOf(tr, first, language)))
      }
      const keys = el('ul', 'vclean__keys')
      for (const entry of entries) keys.append(keyItem(entry))
      item.append(keys)
      list.append(item)
    }
    body.append(list)
    details.append(body)
    return details
  }

  function keyItem(entry: CleanupEntry): HTMLElement {
    const item = el('li')
    const label = el('label', 'vclean__choice')
    const box = el('input', 'vclean__box')
    box.type = 'checkbox'
    box.checked = selected.has(entry.path)
    box.addEventListener('change', () => {
      if (box.checked) selected.add(entry.path)
      else selected.delete(entry.path)
      renderAction()
    })
    label.append(box)
    label.append(el('span', 'vclean__key', entry.key))
    label.append(el('span', 'vclean__note', noteOf(tr, db, entry)))
    // La preuve, à la ligne : ce que l'appareil a relu avec ce réglage et sans lui. Elle
    // répond à la question que la liste posait sans y répondre — pourquoi celui-ci part
    // et pas son voisin du même gadget.
    const measure = inertMeasure(tr, entry)
    if (measure !== null) label.append(el('span', 'vclean__measure', measure))
    item.append(label)
    return item
  }

  /** Le compte des cochés et le bouton : réécrits à chaque coche, sans tout redessiner. */
  const action = el('div', 'vclean__act')
  const tally = el('p', 'vclean__tally')
  tally.setAttribute('role', 'status')
  const go = el('button', 'vclean__go')
  go.type = 'button'
  go.addEventListener('click', () => { apply() })

  function renderAction(): void {
    const count = selected.size
    const total = plan.entries.length
    tally.textContent = count === total
      ? tr.t('cleanup.allSelected', { count: total })
      : tr.t('cleanup.someSelected', {
        count,
        total,
        left: tr.t('cleanup.remaining', { count: total - count })
      })
    go.textContent = count === 0
      ? tr.t('cleanup.noneSelected')
      : tr.t('cleanup.removeButton', { count })
    go.disabled = count === 0
  }

  /** Ce qui a été trouvé et n'est pas proposé : nommé, expliqué, sans case à cocher. */
  function renderHeld(): HTMLElement {
    const block = el('section', 'vclean__held')
    block.append(el('h4', 'vclean__held-title',
      tr.t('cleanup.heldTitle', { count: plan.held.length })))
    block.append(el('p', 'vclean__held-lead', tr.t('cleanup.heldLead')))

    const list = el('ul', 'vclean__held-list')
    for (const entry of plan.held) {
      const item = el('li', 'vclean__held-item')
      item.append(el('p', 'vclean__place', placeOf(tr, entry, language)))
      item.append(el('span', 'vclean__key', entry.key))
      const [said, measured] = heldReason(tr, entry)
      if (said !== undefined) item.append(el('span', 'vclean__note', said))
      if (measured !== undefined) {
        item.append(el('span', 'vclean__measure', measured))
      }
      list.append(item)
    }
    block.append(list)
    return block
  }

  function render(): void {
    root.textContent = ''
    root.classList.remove('vclean--done')

    if (undoable !== null) {
      renderDone(undoable)
      return
    }
    if (plan.entries.length === 0 && plan.held.length === 0) return

    root.append(el('h3', 'vclean__title',
      plan.entries.length === 0 ? tr.t('cleanup.foundTitle') : tr.t('cleanup.title')))

    if (plan.entries.length > 0) {
      const lead = el('p', 'vclean__lead')
      lead.textContent = tr.t('cleanup.lead', {
        count: plan.entries.length,
        instances: tr.t('common.widgetCount', { count: plan.widgetCount }),
        list: gadgetSummary(tr, plan.entries, language)
      })
      root.append(lead)

      root.append(el('p', 'vclean__calm', tr.t('cleanup.calm')))

      // Le diagnostic vient d'annoncer neuf réglages périmés et cet écran en propose six :
      // sans cette ligne, c'est au pilote de faire la soustraction et de retrouver les
      // trois autres deux blocs plus bas. Elle ne paraît que s'il y en a — et elle vient
      // APRÈS la phrase d'apaisement, dont le « Ceux-ci ont été mesurés » désigne les
      // réglages proposés : s'intercaler la ferait porter sur les autres.
      if (plan.held.length > 0) {
        root.append(el('p', 'vclean__bridge',
          tr.t('cleanup.leadHeld', { count: plan.held.length })))
      }

      root.append(renderList())
      action.append(go, tally)
      root.append(action)
      renderAction()
    }

    if (plan.held.length > 0) root.append(renderHeld())
  }

  function rebuild(next: Layout, nextTier: number, forget: boolean): void {
    layout = next
    tier = nextTier
    if (forget) undoable = null
    plan = planCleanup(db, layout, tier)
    selected = new Set(plan.entries.map((entry) => entry.path))
    render()
  }

  render()

  return {
    element: root,
    plan: () => plan,
    refresh: (next, nextTier) => { rebuild(next, nextTier, false) },
    reset: (next, nextTier) => { rebuild(next, nextTier, true) }
  }
}
