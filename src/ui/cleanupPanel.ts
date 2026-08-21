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
import type { PluralForms } from '../i18n'
import type { Layout } from '../model/layout'
import { plural, proseFormat } from './prose'
import './cleanupPanel.css'

/**
 * L'interface de nettoyage : ce qui partirait, décochable un à un, un geste explicite
 * pour agir, et le retour en arrière juste après.
 *
 * Elle se pose sous le diagnostic de version (`versionDiagnostic.ts`), qui l'appelle. Le
 * calcul et le retrait sont ailleurs (`src/model/cleanup.ts`) : ce module ne décide de
 * rien, il fait décider.
 *
 * ## Quatre décisions, et leurs raisons
 *
 * 1. **Rien ne s'affiche quand il n'y a rien à enlever.** Pas de « aucun réglage périmé »,
 *    pas de coche verte : un pilote dont la configuration va bien n'a pas à lire un
 *    message sur l'état de sa configuration. Le diagnostic, lui, dit déjà ce qu'il sait.
 *
 * 2. **Le ton n'alarme pas, parce qu'il n'y a pas lieu.** XCTrack conserve les réglages
 *    qu'il ne connaît plus et ne s'en sert pas : les laisser ne casse rien. Écrire
 *    « votre fichier contient des erreurs » serait faux, et ferait cliquer par peur
 *    quelqu'un qui n'a aucune raison de cliquer.
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
  /** La disposition du document **vivant** : ses nœuds seront modifiés en place. */
  layout: Layout
  /** Le palier visé. Sans palier retenu, l'hôte n'appelle pas ce module. */
  tier: number
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

const ORIENTATION_LABELS: Record<'portrait' | 'landscape', string> = {
  portrait: 'Portrait',
  landscape: 'Paysage'
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K, className?: string, text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className !== undefined) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

/** « 9 réglages » et « 3 gadgets », dits à plusieurs endroits de cet écran. */
const SETTING_COUNT: PluralForms = { one: '{count} réglage', other: '{count} réglages' }
const GADGET_COUNT: PluralForms = { one: '{count} gadget', other: '{count} gadgets' }

/**
 * « ce réglage » / « ces 9 réglages ».
 *
 * Le cas qu'aucun `s` collé n'aurait su rendre : le nombre se glisse **entre** le
 * déterminant et le nom, et il disparaît au singulier — le français ne dit ni « 9 ces
 * réglages » ni « ce 1 réglage ». C'est précisément ce que le repère nommé du socle
 * permet : chaque forme est une phrase entière, libre de placer le nombre où sa langue
 * l'exige, ou de ne pas le porter du tout.
 */
function theseSettings(count: number): string {
  return plural({ one: 'ce réglage', other: 'ces {count} réglages' }, count)
}

/**
 * « Portrait · page 2 · rang 1 · Carte de compétition ». Même forme que `placeLabel` du
 * diagnostic — écrite ici plutôt qu'importée pour que ce module ne dépende pas de celui
 * qui l'appelle.
 */
function placeOf(entry: CleanupEntry, language: string): string {
  return `${ORIENTATION_LABELS[entry.orientation]} · page ${entry.pageRank}` +
    ` · rang ${entry.widgetRank} · ${readableName(entry.shortName, language)}`
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
function safeValue(entry: CleanupEntry): string | null {
  const node = getMember(entry.node, entry.key)
  if (node?.kind !== 'literal') return null
  if (node.raw === 'true') return 'oui'
  if (node.raw === 'false') return 'non'
  return node.raw
}

/** Le détail d'un réglage : depuis quand il ne sert plus, et ce qu'il porte. */
function noteOf(db: VersionDatabase, entry: CleanupEntry): string {
  const release = lastReadingRelease(db, entry.lastReadTier)
  const since = release === null
    ? 'plus lu par la version visée'
    : `utilisé jusqu’à XCTrack ${release}`
  const value = safeValue(entry)
  const doubled = entry.occurrences > 1
    ? `, écrit ${plural({ one: '{count} fois', other: '{count} fois' }, entry.occurrences)} dans ce gadget`
    : ''
  return value === null ? `${since}${doubled}` : `réglé sur ${value}, ${since}${doubled}`
}

/** « Carte de compétition (3), Boussole (2) » — sur quels gadgets cela porte. */
function gadgetSummary(entries: CleanupEntry[], language: string): string {
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
    .map(([name, count]) => (count > 1 ? `${name} (${proseFormat.number(count)})` : name))
    .join(', ')
}

/**
 * Construit la section. Elle est vide — sans un mot — tant qu'il n'y a rien à enlever.
 */
export function buildCleanupSection(options: CleanupSectionOptions): CleanupSection {
  const { db, onChange } = options
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
      description: `Enlever ${plural(SETTING_COUNT, outcome.keyCount)} d’une ` +
        'ancienne version'
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
      description: `Remettre ${plural(SETTING_COUNT, count)} d’une ancienne version`
    })
  }

  /* ------------------------------------------------------------------- le dessin */

  function renderDone(outcome: CleanupOutcome): void {
    root.classList.add('vclean--done')
    const done = el('p', 'vclean__done')
    done.setAttribute('role', 'status')
    done.textContent =
      `${plural({
        one: '{count} réglage enlevé',
        other: '{count} réglages enlevés'
      }, outcome.keyCount)} sur ` +
      `${plural(GADGET_COUNT, outcome.widgetCount)}. Votre appareil n’en sait ` +
      'encore rien : le fichier ne change que lorsque vous l’enregistrez.'
    root.append(done)

    const undo = el('button', 'vclean__undo',
      `Remettre ${theseSettings(outcome.keyCount)}`)
    undo.type = 'button'
    undo.addEventListener('click', () => { revert() })
    root.append(undo)
    // Le geste vient d'avoir lieu : c'est là que doit être le clavier, et pas ailleurs.
    undo.focus()
  }

  function renderList(): HTMLElement {
    const details = el('details', 'vclean__details')
    details.append(el('summary', undefined,
      `Voir ${theseSettings(plan.entries.length)}, et décocher ce ` +
      'que vous préférez garder'))

    const body = el('div', 'vclean__details-body')
    body.append(el('p', 'vclean__caveat',
      'Les noms ci-dessous sont ceux qu’écrit XCTrack. L’application ne les montre plus ' +
      'dans ses menus : c’est justement ce qui indique qu’elle ne s’en sert plus.'))

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
        item.append(el('p', 'vclean__place', placeOf(first, language)))
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
    label.append(el('span', 'vclean__note', noteOf(db, entry)))
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
      ? `${plural({ one: '{count} réglage retenu', other: '{count} réglages retenus' }, total)}.`
      : `${plural({ one: '{count} retenu', other: '{count} retenus' }, count)} ` +
        `sur ${proseFormat.number(total)} — ` +
        `${plural({
          one: '{count} réglage restera',
          other: '{count} réglages resteront'
        }, total - count)} en place.`
    go.textContent = count === 0
      ? 'Aucun réglage retenu'
      : `Enlever ${theseSettings(count)}`
    go.disabled = count === 0
  }

  function render(): void {
    root.textContent = ''
    root.classList.remove('vclean--done')

    if (undoable !== null) {
      renderDone(undoable)
      return
    }
    if (plan.entries.length === 0) return

    root.append(el('h3', 'vclean__title', 'Enlever ce qu’une ancienne version a laissé'))

    const lead = el('p', 'vclean__lead')
    lead.textContent =
      `${plural({
        one: '{count} réglage de ce fichier n’est plus utilisé',
        other: '{count} réglages de ce fichier ne sont plus utilisés'
      }, plan.entries.length)} par la version visée, sur ` +
      `${plural(GADGET_COUNT, plan.widgetCount)} : ` +
      `${gadgetSummary(plan.entries, language)}.`
    root.append(lead)

    root.append(el('p', 'vclean__calm',
      'Rien ne presse et rien n’est cassé : XCTrack les transporte sans les lire, et les ' +
      'laisser là ne change rien à vos pages. Les enlever allège le fichier, c’est tout.'))

    root.append(renderList())
    action.append(go, tally)
    root.append(action)
    renderAction()
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
