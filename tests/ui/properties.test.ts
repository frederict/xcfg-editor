import { beforeAll, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { parseJson } from '../../src/core/parseJson'
import { serializeJson } from '../../src/core/serializeJson'
import { getMember, removeMember } from '../../src/core/access'
import type { JsonNode } from '../../src/core/jsonDocument'
import { readLayout } from '../../src/model/layout'
import { createHistory } from '../../src/model/history'
import type { Widget } from '../../src/model/widget'
import {
  buildPropertyForm,
  colorToHex,
  colorToLiteral,
  loadOptionTexts,
  renderProperties,
  setFieldValue,
  writeMissingDefault,
  type PropertyField,
  type PropertyForm
} from '../../src/ui/properties'
import { makeTranslator } from '../../src/i18n'
import frenchMessages from '../../src/i18n/messages/fr'
import germanMessages from '../../src/i18n/messages/de'
import { BACKUP_2025, BACKUP_2026 } from '../fixtures/paths'

/**
 * Les deux axes : `FRENCH` / `GERMAN` portent **notre prose**, le second argument de
 * `buildPropertyForm` porte les **libellés de XCTrack**. Ils divergent exprès plus bas.
 */
const FRENCH = makeTranslator('fr', frenchMessages)
const GERMAN = makeTranslator('de', germanMessages)
import { DEFAULTS_VERSION_CODE, DEFAULTS_VERSION_NAME } from '../../src/catalog/widgetDefaults'

/**
 * Tout se joue sur des widgets réels. Un panneau de réglages engendré ne se juge pas sur
 * des données inventées : ce qu'on veut vérifier, c'est qu'il retrouve les libellés
 * relevés sur l'appareil à partir des octets que l'appareil a écrits.
 */
const source = readFileSync(BACKUP_2026, 'utf8')

/**
 * Le catalogue est désormais partitionné par langue et chargé par `import()` : le module
 * ne précharge de lui-même que la langue du navigateur — `en` sous happy-dom. Les langues
 * dont ces tests vérifient les libellés doivent donc être demandées d'abord, exactement
 * comme le panneau le fait quand un fichier déclare `Display.Language`.
 */
beforeAll(async () => {
  await Promise.all([loadOptionTexts('fr'), loadOptionTexts('de')])
})

/** Espace insécable : la typographie française du catalogue, à l'octet près. */
const NBSP = ' '

function document(): JsonNode {
  return parseJson(source)
}

function widgetAt(doc: JsonNode, orientation: 'portrait' | 'landscape', page: number, index: number): Widget {
  const widget = readLayout(doc)[orientation][page]?.widgets[index]
  if (widget === undefined) throw new Error(`pas de widget ${orientation}[${page}][${index}]`)
  return widget
}

/** La boussole de la première page paysage : la seule du corpus qui porte `windStyle`. */
function compass(doc: JsonNode): Widget {
  const widget = widgetAt(doc, 'landscape', 0, 12)
  expect(widget.shortName).toBe('WCompass')
  return widget
}

/** La boussole portrait : celle qui porte encore les vestiges `showWind` et `newWindArrow`. */
function oldCompass(doc: JsonNode): Widget {
  const widget = widgetAt(doc, 'portrait', 2, 6)
  expect(widget.shortName).toBe('WCompass')
  return widget
}

function map(doc: JsonNode): Widget {
  const widgets = readLayout(doc).landscape.flatMap((page) => page.widgets)
  const widget = widgets.find((candidate) => candidate.shortName === 'WCompMap')
  if (widget === undefined) throw new Error('pas de WCompMap')
  return widget
}

/** Le premier gadget du corpus qui porte un menu d'unités — celui du § A.6 du relevé. */
function withUnits(doc: JsonNode): Widget {
  const widget = readLayout(doc).landscape.flatMap((page) => page.widgets)
    .find((one) => getMember(one.node, '_units') !== undefined)
  if (widget === undefined) throw new Error('aucun gadget ne porte « _units »')
  return widget
}

function fieldAt(form: PropertyForm, path: string): PropertyField {
  const field = form.fields.find((candidate) => candidate.path === path)
  if (field === undefined) throw new Error(`pas de champ ${path} dans ${form.shortName}`)
  return field
}

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

/**
 * La seule plage de texte qui diverge entre deux sérialisations — même mesure que dans
 * `preferencesPage.test.ts` : elle dit ce qui a été touché, et rien d'autre ne l'a été.
 */
function singleDifference(a: string, b: string): { before: string; after: string } {
  let start = 0
  while (start < a.length && start < b.length && a[start] === b[start]) start++
  let end = 0
  while (end < a.length - start && end < b.length - start
    && a[a.length - 1 - end] === b[b.length - 1 - end]) end++
  return { before: a.slice(start, a.length - end), after: b.slice(start, b.length - end) }
}

/** Les lignes du document sérialisé qui diffèrent entre deux états. */
function diffLines(before: string, after: string): string[] {
  const olds = before.split('\n')
  const news = after.split('\n')
  expect(news).toHaveLength(olds.length)
  return news.filter((line, index) => line !== olds[index])
}

describe('description du formulaire', () => {
  it('donne à la boussole ses neuf contrôles, dans l’ordre et avec les libellés du relevé', () => {
    const form = buildPropertyForm(compass(document()))

    expect(form.fields.map((field) => field.key)).toEqual([
      '_border', '_bg', '_theme', 'rotation', 'navigation_target',
      'windStyle', 'showHeading', 'showBearing', 'showBackground'
    ])
    expect(form.fields.map((field) => field.label)).toEqual([
      'Tracer frontière',
      `Transparence d'arrière-plan${NBSP}: 100%`,
      'Affichage du thème',
      'Rotation du compas',
      'Afficher la flèche',
      "Style d'indicateur de vent",
      'Montrer la flèche de cap',
      'Montrer la flèche de trajectoire',
      'Afficher le cadran d’arrière-plan'.replace('’', "'")
    ])
  })

  it('déduit le contrôle de chaque option de la boussole', () => {
    const form = buildPropertyForm(compass(document()))
    expect(Object.fromEntries(form.fields.map((f) => [f.key, f.control]))).toEqual({
      _border: 'checkbox',
      _bg: 'slider',
      _theme: 'text',
      rotation: 'enum',
      navigation_target: 'enum',
      windStyle: 'enum',
      showHeading: 'checkbox',
      showBearing: 'checkbox',
      showBackground: 'checkbox'
    })
  })

  it('expose les quatre valeurs de windStyle, dans l’ordre du menu natif', () => {
    const windStyle = fieldAt(buildPropertyForm(compass(document())), 'windStyle')
    expect(windStyle.choices).toEqual([
      { value: 'NONE', label: 'Aucun' },
      { value: 'ARROW', label: 'Flèche' },
      { value: 'ARC', label: 'Arc' },
      { value: 'WINDSOCK', label: 'Manche à air' }
    ])
    expect(windStyle.text).toBe('ARC')
    // Seule option de la boussole à porter un `?` sur l'appareil.
    expect(windStyle.help).toMatch(/Manche à air/)
    expect(buildPropertyForm(compass(document())).fields.filter((f) => f.help !== undefined))
      .toHaveLength(1)
  })

  it('fait de _bg un curseur dont le libellé porte la valeur', () => {
    const doc = document()
    const bg = fieldAt(buildPropertyForm(compass(doc)), '_bg')
    expect(bg.control).toBe('slider')
    expect(bg.label).toBe(`Transparence d'arrière-plan${NBSP}: 100%`)
    // Un pourcentage est le seul curseur dont les bornes se lisent dans les données.
    expect(bg.range).toEqual({ min: 0, max: 100 })

    setFieldValue(bg, '40')
    expect(bg.label).toBe(`Transparence d'arrière-plan${NBSP}: 40%`)
  })

  it('laisse un curseur sans bornes connues devenir un champ numérique libre', () => {
    const form = buildPropertyForm(map(document()))
    const thermals = fieldAt(form, 'thermals')
    expect(thermals.control).toBe('slider')
    // « Ne pas montrer les thermiques détectés » : aucune borne lisible, donc aucune
    // inventée — écrêter une valeur légitime au premier glissement serait pire.
    expect(thermals.range).toBeUndefined()
  })

  it('range les trois clés universelles en tête, comme le panneau natif', () => {
    const form = buildPropertyForm(compass(document()))
    expect(form.headCount).toBe(3)
    expect(form.fields.slice(0, 3).map((f) => f.key)).toEqual(['_border', '_bg', '_theme'])
  })

  it('titre le panneau du nom lisible du widget', () => {
    // Le formulaire ne porte que le **libellé de XCTrack** : « Gadget : » est notre
    // phrase, elle suit la langue de l'interface et ne se compose qu'au rendu.
    const form = buildPropertyForm(compass(document()))
    expect(form.label).not.toMatch(/WCompass/)
    expect(form.label.length).toBeGreaterThan(0)
    const panel = renderProperties({ form })
    expect(panel.element.querySelector('.props__title')?.textContent)
      .toBe(`Gadget : ${form.label}`)
  })

  it('suit la langue demandée, et retombe sur l’anglais', () => {
    const form = buildPropertyForm(compass(document()), 'de')
    expect(fieldAt(form, '_border').label).toBe('Zeichne Rahmen')
    expect(fieldAt(form, 'windStyle').choices.map((c) => c.label))
      .not.toEqual(['Aucun', 'Flèche', 'Arc', 'Manche à air'])
  })
})

describe('la langue du panneau suit le fichier, pas seulement le navigateur', () => {
  /** L'intitulé affiché d'une ligne du panneau rendu. */
  function rowLabel(element: HTMLElement, key: string): string | undefined {
    return element.querySelector<HTMLElement>(`[data-key="${key}"] .props__label`)?.textContent
      ?? undefined
  }

  it('bâtit dans la langue chargée, le dit, puis répare le panneau', async () => {
    // Le cas réel : `complète.xcfg` du corpus déclare `Display.Language: fr`. Ouvert
    // sur un navigateur d'une autre langue, `main.ts` demande une langue que le
    // préchargement n'avait pas devinée. Ici c'est l'italien, qu'aucun autre test ne
    // charge, et le navigateur de happy-dom est anglophone.
    const form = buildPropertyForm(compass(document()), 'it')
    expect(form.language).toBe('it')
    // Le formulaire ne ment pas sur ce qu'il a servi.
    expect(form.textLanguage).toBe('en')
    expect(fieldAt(form, '_border').label).toBe('Draw border')

    const panel = renderProperties({ form })
    // Premier rendu : la langue disponible, pas de panneau vide ni de clé brute.
    expect(rowLabel(panel.element, '_border')).toBe('Draw border')

    // Puis le morceau italien arrive et le panneau se refait, dans la section que
    // l'appelant a déjà insérée dans le document — `main.ts` n'a rien à rebrancher.
    await vi.waitFor(() => {
      expect(rowLabel(panel.element, '_border')).toBe('Disegna bordi')
    })
    expect(panel.form.textLanguage).toBe('it')
    expect(panel.element.querySelectorAll('.props__row')).toHaveLength(9)
  })

  it('ne refait rien quand la langue demandée est celle qui a servi', async () => {
    const form = buildPropertyForm(compass(document()), 'fr')
    expect(form.textLanguage).toBe('fr')
    const panel = renderProperties({ form })
    const row = panel.element.querySelector('[data-key="_border"]')
    await Promise.resolve()
    // Le même nœud, pas un remplaçant : aucun rendu superflu.
    expect(panel.element.querySelector('[data-key="_border"]')).toBe(row)
    expect(rowLabel(panel.element, '_border')).toBe('Tracer frontière')
  })

  it('sert l’anglais, jamais une clé de ressource, pour une langue inconnue', () => {
    // `optionsLanguage` ramène `xx` sur l'anglais : le panneau est donc déjà servi et
    // n'a rien à réparer.
    const form = buildPropertyForm(compass(document()), 'xx')
    expect(form.textLanguage).toBe('en')
    expect(fieldAt(form, '_border').label).toBe('Draw border')
  })
})

describe('la règle d’or : rien n’est masqué', () => {
  it('produit un contrôle pour une clé que le catalogue ignore, sous son nom brut', () => {
    const form = buildPropertyForm(oldCompass(document()))

    // Deux vestiges d'une version antérieure de XCTrack, que l'application n'expose plus.
    expect(form.unknownKeys).toEqual(['showWind', 'newWindArrow'])

    const showWind = fieldAt(form, 'showWind')
    expect(showWind.known).toBe(false)
    expect(showWind.label).toBe('showWind')
    expect(showWind.control).toBe('checkbox') // déduit du type JSON, faute de catalogue
    expect(showWind.text).toBe('true')

    // Et ils restent à leur place dans l'ordre du fichier, pas relégués en fin de liste.
    expect(form.fields.map((f) => f.key)).toEqual([
      '_border', '_bg', '_theme', 'rotation', 'navigation_target',
      'showWind', 'newWindArrow', 'showHeading', 'showBearing', 'showBackground'
    ])
  })

  it('ajoute à une liste une valeur courante que le catalogue ne connaît pas', () => {
    const doc = document()
    const widget = compass(doc)
    const form = buildPropertyForm(widget)
    const windStyle = fieldAt(form, 'windStyle')
    setFieldValue(windStyle, 'PENNANT') // valeur d'une version future, ou d'un fichier bricolé

    const panel = renderProperties({ form: buildPropertyForm(widget) })
    const select = panel.element.querySelector<HTMLSelectElement>('[data-key="windStyle"] select')
    expect(select).not.toBeNull()
    expect(select?.value).toBe('PENNANT')
    expect([...select!.options].map((o) => o.value))
      .toEqual(['PENNANT', 'NONE', 'ARROW', 'ARC', 'WINDSOCK'])
  })

  it('montre sans la réécrire une valeur qui n’est ni chaîne ni littéral', () => {
    const doc = document()
    const widget = compass(doc)
    // Une clé dont la valeur est un tableau : XCTrack peut en introduire à tout moment.
    if (widget.node.kind !== 'object') throw new Error('objet attendu')
    widget.node.entries.push(['"futureList"', { kind: 'array', items: [{ kind: 'literal', raw: '1' }] }])

    const field = fieldAt(buildPropertyForm(widget), 'futureList')
    expect(field.control).toBe('unknown')
    expect(setFieldValue(field, '[2]')).toBe(false)
    expect(serializeJson(widget.node)).toContain('"futureList"')
  })
})

describe('les clés composites', () => {
  it('éclate rotation en deux contrôles, le second en retrait', () => {
    const form = buildPropertyForm(map(document()))

    const value = fieldAt(form, 'rotation.value')
    const showCompass = fieldAt(form, 'rotation.showCompass')
    expect(form.fields.indexOf(showCompass)).toBe(form.fields.indexOf(value) + 1)

    // Le sous-champ principal porte le libellé traduit de l'option…
    expect(value.label).toBe('Rotation')
    expect(value.depth).toBe(0)
    expect(value.text).toBe('NORTH_AT_TOP')

    // …le subordonné porte SON libellé, et s'affiche en retrait sous lui. Le catalogue
    // sait maintenant lequel : `widgetSettingsRotationShowCompass` est le texte que
    // `mt9` pose sur la case à cocher qu'il dessine pour `showCompass`. Même texte que
    // sur l'AIR³, sous la liste « Rotation ».
    expect(showCompass.label).toBe('Affiche la direction du nord')
    expect(showCompass.hint).toBe('Rotation')
    expect(showCompass.control).toBe('checkbox')
    expect(showCompass.depth).toBe(1)
  })

  it('donne à chaque sous-champ de l’échelle le texte de sa case, relevé sur l’AIR³', () => {
    // Les trois contrôles de « Echelle Carte » tels que l'écran de réglages de la carte
    // les montre : un curseur intitulé « Echelle Carte: … » et deux cases sous lui.
    // C'est `it9` qui les dessine, et le bytecode dit quel texte va sur quelle case —
    // le libellé du constructeur habille « auto », jamais le titre.
    const form = buildPropertyForm(map(document()))
    expect(fieldAt(form, 'mapWidget_scale.value').label).toBe('Echelle Carte')
    expect(fieldAt(form, 'mapWidget_scale.auto').label)
      .toBe("Mise à l'échelle automatique pour s'adapter à l'ensemble de la trace.")
    expect(fieldAt(form, 'mapWidget_scale.resetZoomPanExit').label)
      .toBe("Réinitialise l'échelle de la carte à sa valeur par défaut "
        + 'après avoir quitté le mode panoramique')

    // Le même contrôle pour le zoom d'urgence : seule la case « auto » change de texte.
    expect(fieldAt(form, 'mapWidget_emergencyZoom.value').label).toBe('Echelle Carte')
    expect(fieldAt(form, 'mapWidget_emergencyZoom.auto').label)
      .toBe("Zoom automatique en mode d'urgence-obstacles")
  })

  it('titre l’apparence de la carte de son intitulé, et range l’avertissement dans le ?', () => {
    // `mapWidget_mapAppearance` portait `widgetSettingsShowOpenStreetNotice` comme
    // libellé — une phrase d'avertissement, pas un titre. Sur l'appareil, ce texte est
    // l'infobulle « ? » ; l'intitulé du champ est « Carte routière et style de terrain ».
    const form = buildPropertyForm(map(document()))
    const theme = fieldAt(form, 'mapWidget_mapAppearance.theme')
    const terrain = fieldAt(form, 'mapWidget_mapAppearance.terrain')

    // XCTrack n'en fait qu'UNE liste déroulante : aucun des deux sous-champs n'a de
    // titre à lui, donc aucun ne s'en voit inventer un.
    expect(theme.label).toBe('Carte routière et style de terrain · theme')
    expect(terrain.label).toBe('Carte routière et style de terrain · terrain')
    expect(theme.help).toMatch(/^Il est possible de n'avoir qu'un widjet/)
    expect(terrain.help).toBeUndefined()
  })

  it('appareille les curseurs que zb5 déclare par un switch', () => {
    // Quatre curseurs, une seule classe : `zb5` choisit lequel par un entier passé au
    // constructeur. L'extraction lisait la bonne ressource mais la collait à la mauvaise
    // clé — d'où trois clés brutes et un libellé faux. Valeurs et textes confrontés à
    // l'écran de réglages de la carte de l'AIR³.
    const form = buildPropertyForm(map(document()))
    expect(fieldAt(form, 'mapWidget_panningTimeout').label)
      .toBe('Quitte automatiquement le mode panoramique après 60 secondes.')
    expect(fieldAt(form, 'mapWidget_pilotEdgeDistance').label).toBe('Distance du bord: 20%')
    expect(fieldAt(form, 'mapWidget_heading_arrow_sizecoef').label)
      .toBe('Coefficient de taille de la flèche pilote: 100%')
    // Celui-ci portait le libellé de `mapWidget_panningTimeout` : un texte juste, sur la
    // mauvaise ligne.
    expect(fieldAt(form, 'mapWidget_panningAirspaceListCycleSpeed').label)
      .toMatch(/^Met en surbrillance l'espace aérien pendant le panoramique/)
  })

  it('ne devine pas un contrôle qu’il ne sait pas régler', () => {
    const form = buildPropertyForm(map(document()))
    // Le panneau natif présente la rotation d'une carte en liste déroulante, mais le
    // catalogue ne donne les valeurs permises que pour la rotation de la boussole, et
    // ce ne sont pas les mêmes constantes (`NORTH` contre `NORTH_AT_TOP`). Un champ
    // texte plutôt qu'une liste tronquée qui perdrait la valeur courante.
    expect(fieldAt(form, 'rotation.value').control).toBe('text')
    expect(fieldAt(form, 'rotation.value').choices).toEqual([])
  })

  it('éclate aussi une composite à trois sous-champs', () => {
    const form = buildPropertyForm(map(document()))
    const paths = form.fields.filter((f) => f.key === 'mapWidget_scale').map((f) => f.path)
    expect(paths).toEqual([
      'mapWidget_scale.value', 'mapWidget_scale.auto', 'mapWidget_scale.resetZoomPanExit'
    ])
    expect(fieldAt(form, 'mapWidget_scale.value').control).toBe('number')
    expect(fieldAt(form, 'mapWidget_scale.auto').depth).toBe(1)
  })

  it('écrit dans le sous-objet, pas dans le widget', () => {
    const doc = document()
    const widget = map(doc)
    const field = fieldAt(buildPropertyForm(widget), 'rotation.showCompass')

    expect(setFieldValue(field, 'true')).toBe(true)
    const rotation = getMember(widget.node, 'rotation')
    expect(rotation).toBeDefined()
    expect(getMember(rotation!, 'showCompass')).toEqual({ kind: 'literal', raw: 'true' })
  })
})

describe('les couleurs', () => {
  it('lit un entier signé 32 bits ARGB et le rend en #AARRGGBB', () => {
    // Vérification chiffrée du relevé : tracklog_color vaut -27091, affiché FFFF962D.
    expect(colorToHex('-27091')).toBe('#FFFF962D')
    expect(colorToLiteral('#FFFF962D')).toBe('-27091')
    expect(colorToLiteral('FF962D')).toBe('-27091') // alpha implicite
    expect(colorToLiteral('pas une couleur')).toBeUndefined()
  })

  it('présente tracklog_color comme une couleur', () => {
    const field = fieldAt(buildPropertyForm(map(document())), 'tracklog_color')
    expect(field.control).toBe('color')
    expect(field.text).toBe('-27091')
  })
})

describe('une modification ne change que ce qu’on a demandé', () => {
  it('ne touche qu’une ligne du document sérialisé', () => {
    const doc = document()
    const before = serializeJson(doc)

    const field = fieldAt(buildPropertyForm(compass(doc)), 'windStyle')
    expect(setFieldValue(field, 'WINDSOCK')).toBe(true)

    const changed = diffLines(before, serializeJson(doc))
    expect(changed).toHaveLength(1)
    expect(changed[0]).toContain('"windStyle": "WINDSOCK"')
  })

  it('ne touche qu’une ligne en modifiant un sous-champ composite', () => {
    const doc = document()
    const before = serializeJson(doc)

    const field = fieldAt(buildPropertyForm(map(doc)), 'mapWidget_scale.auto')
    expect(setFieldValue(field, 'false')).toBe(true)

    const changed = diffLines(before, serializeJson(doc))
    expect(changed).toHaveLength(1)
    expect(changed[0]).toContain('"auto": false')
  })

  it('n’écrit rien quand la valeur ne change pas — le texte source est préservé', () => {
    const doc = document()
    const before = serializeJson(doc)

    const form = buildPropertyForm(compass(doc))
    expect(setFieldValue(fieldAt(form, 'windStyle'), 'ARC')).toBe(false)
    expect(setFieldValue(fieldAt(form, '_bg'), '100')).toBe(false)
    expect(setFieldValue(fieldAt(form, '_border'), 'true')).toBe(false)

    expect(serializeJson(doc)).toBe(before)
  })

  it('produit le texte du nombre lui-même, sans passer par un number', () => {
    const doc = document()
    const field = fieldAt(buildPropertyForm(map(doc)), 'mapWidget_KK7opacity')
    // Un `40.0` saisi tel quel doit rester `40.0` : `setLiteral` ne prend qu'un texte.
    setFieldValue(field, '40.0')
    expect(serializeJson(map(doc).node)).toContain('"mapWidget_KK7opacity": 40.0')
  })
})

describe('le menu des unités ne parle pas en constantes de programme', () => {
  it('nomme les unités que le catalogue laisse nues', () => {
    // Mesuré à l'écran, gadget « Altitude GPS » : le menu proposait « SYS_UNIT »,
    // « METER », « FOOT », « YARD ». Un pilote devait choisir entre METER et FOOT pour
    // une unité que son instrument lui montre en « m » et en « ft ».
    const form = buildPropertyForm(withUnits(document()))
    const units = fieldAt(form, '_units')
    expect(units.control).toBe('enum')
    const labels = units.choices.map((one) => one.label)
    for (const label of labels) expect(label).not.toMatch(/^[A-Z_]+$/)
    expect(labels).toContain('comme les réglages généraux')
    expect(units.choices.map((one) => one.value)).toContain('SYS_UNIT')
  })

  it('ne renomme jamais ce que XCTrack a déjà traduit', () => {
    // La parole de XCTrack passe avant la nôtre : une valeur que le catalogue nomme
    // garde son nom, même si notre table connaît la constante.
    const form = buildPropertyForm(compass(document()))
    for (const choice of fieldAt(form, 'windStyle').choices) {
      expect(choice.label).not.toBe(choice.value)
    }
  })
})

describe('rendu du panneau', () => {
  it('rend un contrôle par champ, dans l’ordre, avec sa clé en attribut', () => {
    const form = buildPropertyForm(compass(document()))
    const panel = renderProperties({ form })

    const rows = [...panel.element.querySelectorAll<HTMLElement>('.props__row')]
    expect(rows).toHaveLength(9)
    expect(rows.map((row) => row.dataset.key)).toEqual(form.fields.map((f) => f.path))
    // Le trait qui ferme le bloc universel de tête — le seul séparateur attesté.
    expect(panel.element.querySelectorAll('.props__rule')).toHaveLength(1)
  })

  it('applique une case à cocher au document', () => {
    const doc = document()
    const widget = compass(doc)
    const before = serializeJson(doc)
    const seen: string[] = []
    const panel = renderProperties({
      form: buildPropertyForm(widget),
      onChange: (field) => seen.push(field.path)
    })

    const box = panel.element.querySelector<HTMLInputElement>('[data-key="showHeading"] input')
    expect(box?.checked).toBe(false)
    box!.checked = true
    box!.dispatchEvent(new Event('change'))

    expect(seen).toEqual(['showHeading'])
    const changed = diffLines(before, serializeJson(doc))
    expect(changed).toHaveLength(1)
    expect(changed[0]).toContain('"showHeading": true')
  })

  it('réécrit l’intitulé d’un curseur quand sa valeur bouge', () => {
    const doc = document()
    const panel = renderProperties({ form: buildPropertyForm(compass(doc)) })
    const row = panel.element.querySelector<HTMLElement>('[data-key="_bg"]')!
    const slider = row.querySelector<HTMLInputElement>('input')!

    expect(slider.type).toBe('range')
    expect(slider.max).toBe('100')
    expect(row.querySelector('label')?.textContent).toBe(`Transparence d'arrière-plan${NBSP}: 100%`)

    slider.value = '30'
    slider.dispatchEvent(new Event('input'))
    expect(row.querySelector('label')?.textContent).toBe(`Transparence d'arrière-plan${NBSP}: 30%`)
    expect(serializeJson(compass(doc).node)).toContain('"_bg": 30')
  })

  it('déplie l’aide sous le bouton `?`', () => {
    const panel = renderProperties({ form: buildPropertyForm(compass(document())) })
    const buttons = panel.element.querySelectorAll<HTMLButtonElement>('.props__help')
    expect(buttons).toHaveLength(1)

    const help = panel.element.querySelector<HTMLElement>('.props__help-text')!
    expect(help.hidden).toBe(true)
    buttons[0]!.click()
    expect(help.hidden).toBe(false)
    expect(buttons[0]!.getAttribute('aria-expanded')).toBe('true')
  })

  it('signale une clé hors catalogue sans la cacher', () => {
    const panel = renderProperties({ form: buildPropertyForm(oldCompass(document())) })
    const row = panel.element.querySelector<HTMLElement>('[data-key="showWind"]')!
    expect(row.dataset.unknown).toBe('true')
    expect(row.querySelector('.props__badge')?.textContent).toBe('réglage hors catalogue')
    expect(row.querySelector('label')?.textContent).toBe('showWind')
  })

  it('montre une pastille de la bonne couleur', () => {
    const panel = renderProperties({ form: buildPropertyForm(map(document())) })
    const row = panel.element.querySelector<HTMLElement>('[data-key="tracklog_color"]')!
    const hex = row.querySelector<HTMLInputElement>('input')!
    expect(hex.value).toBe('#FFFF962D')

    // happy-dom ne normalise pas les couleurs : on relit la notation qu'on a posée.
    const swatch = row.querySelector<HTMLElement>('.props__swatch')!
    expect(swatch.style.backgroundColor).toBe('#FF962D')

    hex.value = '#800000FF'
    hex.dispatchEvent(new Event('change'))
    expect(swatch.style.backgroundColor).toBe('#0000FF')
    expect(fieldAt(panel.form, 'tracklog_color').text).toBe(colorToLiteral('#800000FF'))
  })

  it('remet la valeur du fichier quand la couleur saisie est invalide', () => {
    const doc = document()
    const before = serializeJson(doc)
    const panel = renderProperties({ form: buildPropertyForm(map(doc)) })
    const hex = panel.element.querySelector<HTMLInputElement>('[data-key="tracklog_color"] input')!

    hex.value = 'rouge'
    hex.dispatchEvent(new Event('change'))
    expect(hex.value).toBe('#FFFF962D')
    expect(serializeJson(doc)).toBe(before)
  })
})

describe('un widget cartographique reste exploitable', () => {
  it('produit un formulaire complet, clés composites éclatées', () => {
    const form = buildPropertyForm(map(document()))

    // 43 clés de réglage dans le fichier, dont quatre composites : elles donnent
    // 2 + 2 + 3 + 3 contrôles au lieu de quatre.
    expect(form.fields).toHaveLength(49)
    expect(form.fields.filter((f) => f.field !== undefined)).toHaveLength(10)
    expect(new Set(form.fields.map((f) => f.path)).size).toBe(form.fields.length)

    // Plus une seule clé sans option : les trois réglages de curseur que `zb5` déclare
    // par un `switch` — distance du bord, délai du panoramique, taille de la flèche —
    // sont désormais appariés.
    expect(form.unknownKeys).toEqual([])
    // Et tout porte un libellé, pas un nom de clé nu.
    const plain = form.fields.filter((f) => f.field === undefined)
    expect(plain.filter((f) => f.label === f.key)).toEqual([])
  })

  it('tient sur le panneau le plus fourni du corpus', () => {
    const doc = document()
    const widgets = [...readLayout(doc).portrait, ...readLayout(doc).landscape]
      .flatMap((page) => page.widgets)
    const forms = widgets.map((widget) => buildPropertyForm(widget))

    // Tous les widgets du fichier, 105 exemplaires de 37 types, produisent un formulaire
    // cohérent : chemins uniques, libellés non vides, valeur lisible.
    for (const form of forms) {
      expect(new Set(form.fields.map((f) => f.path)).size).toBe(form.fields.length)
      expect(form.fields.every((f) => f.label.length > 0)).toBe(true)
    }

    const widest = forms.reduce((a, b) => (b.fields.length > a.fields.length ? b : a))
    expect(widest.shortName).toBe('WXCAssistant')
    expect(widest.fields).toHaveLength(63)
    // Rien n'est perdu en route : autant de contrôles que de sous-valeurs réglables,
    // et plus aucune clé hors catalogue.
    expect(widest.unknownKeys.length).toBe(0)
  })

  it('offre un filtre au-delà d’une douzaine de contrôles, et pas en deçà', () => {
    const wide = renderProperties({ form: buildPropertyForm(map(document())) })
    expect(wide.element.querySelector('.props__filter')).not.toBeNull()

    const narrow = renderProperties({ form: buildPropertyForm(compass(document())) })
    expect(narrow.element.querySelector('.props__filter')).toBeNull()
  })

  it('filtre sur le libellé comme sur la clé, accents compris', () => {
    const panel = renderProperties({ form: buildPropertyForm(map(document())) })
    const visible = (): string[] => [...panel.element.querySelectorAll<HTMLElement>('.props__row')]
      .filter((row) => !row.hidden)
      .map((row) => row.dataset.key!)

    expect(visible()).toHaveLength(49)

    panel.filter('KK7')
    expect(visible()).toEqual([
      'mapWidget_showKK7', 'mapWidget_KK7opacity', 'mapWidget_KK7timed', 'mapWidget_KK7timedOpacity'
    ])

    panel.filter('epaisseur')
    expect(visible()).toEqual(['line_thickness'])

    panel.filter('')
    expect(visible()).toHaveLength(49)
  })
})

/* ================================================================================== */
/*                     consultation : lire des réglages sans les toucher              */
/* ================================================================================== */

/**
 * Le fichier de référence vient de la version même du relevé des défauts (versionCode
 * 100030) : sa comparaison est exacte. `BACKUP_2025`, lui, vient de 0.9.12.3 — c'est le
 * cas où l'interface doit dire que la comparaison n'est qu'indicative.
 */
const OLD_SOURCE = readFileSync(BACKUP_2025, 'utf8')

function oldDocument(): JsonNode {
  return parseJson(OLD_SOURCE)
}

function readOnlyPanel(widget: Widget, options: Record<string, unknown> = {}) {
  return renderProperties({ form: buildPropertyForm(widget), readOnly: true, ...options })
}

function rowsOf(panel: { element: HTMLElement }): HTMLElement[] {
  return [...panel.element.querySelectorAll<HTMLElement>('.props__row')]
}

function visibleKeys(panel: { element: HTMLElement }): string[] {
  return rowsOf(panel).filter((row) => !row.hidden).map((row) => row.dataset.key!)
}

describe('le panneau de consultation ne peut pas modifier le document', () => {
  it('ne construit aucun contrôle de formulaire — rien à désactiver, rien à réactiver', () => {
    const panel = readOnlyPanel(map(document()))
    expect(panel.readOnly).toBe(true)
    expect(panel.element.dataset.mode).toBe('lecture')

    // Le champ de filtrage est le seul `input` admis : il ne touche pas au document, il
    // masque des lignes. Tout le reste — cases, listes, curseurs, champs texte — est
    // absent, et non désactivé : un contrôle grisé se réactive, une absence non.
    const inputs = [...panel.element.querySelectorAll<HTMLInputElement>('input')]
    expect(inputs.map((input) => input.type)).toEqual(['search'])
    expect(inputs[0]!.className).toBe('props__filter')

    expect(panel.element.querySelectorAll('select')).toHaveLength(0)
    expect(panel.element.querySelectorAll('textarea')).toHaveLength(0)
    expect(panel.element.querySelectorAll('[contenteditable]')).toHaveLength(0)
    expect(panel.element.querySelectorAll('form')).toHaveLength(0)
  })

  it('ne comporte que des boutons inoffensifs : l’aide, et le filtre des différences', () => {
    const panel = readOnlyPanel(map(document()))
    const classes = new Set(
      [...panel.element.querySelectorAll<HTMLButtonElement>('button')]
        .flatMap((button) => [...button.classList])
    )
    // Aucun bouton qui écrirait : `props__help` déplie une aide, `props__defaults-only`
    // masque des lignes.
    expect([...classes].every((name) => /^(btn|props__help|props__defaults-only)$/.test(name)))
      .toBe(true)
  })

  it('résiste à une tentative de modification par tous les moyens du DOM', () => {
    const doc = oldDocument()
    const widget = readLayout(doc).landscape.flatMap((page) => page.widgets)
      .find((one) => one.shortName === 'WCompMap')!
    const before = serializeJson(doc)

    let called = 0
    // `onChange` est fourni **exprès** : le contrat n'est pas « l'appelant s'abstient »,
    // c'est « le panneau ne le rappelle jamais ».
    const panel = readOnlyPanel(widget, { onChange: () => { called += 1 } })

    const events = ['input', 'change', 'click', 'keydown', 'keyup', 'blur', 'focus', 'pointerdown']
    for (const node of panel.element.querySelectorAll<HTMLElement>('*')) {
      // On force une valeur là où il pourrait y en avoir une — la seule cible réelle est
      // le champ de filtre, et il ne mène nulle part.
      if ('value' in node) (node as unknown as { value: string }).value = 'XXX'
      if ('checked' in node) (node as unknown as { checked: boolean }).checked = true
      node.setAttribute('contenteditable', 'true')
      node.textContent = node.textContent === '' ? node.textContent : node.textContent
      for (const type of events) node.dispatchEvent(new Event(type, { bubbles: true }))
    }

    expect(called).toBe(0)
    // La preuve : le document sérialisé, octet pour octet.
    expect(serializeJson(doc)).toBe(before)
  })

  it('le panneau d’édition, lui, garde ses contrôles : la lecture seule est un mode, pas une régression', () => {
    const panel = renderProperties({ form: buildPropertyForm(compass(document())) })
    expect(panel.readOnly).toBe(false)
    expect(panel.element.dataset.mode).toBe('edition')
    expect(panel.element.querySelectorAll('input').length).toBeGreaterThan(0)
    expect(panel.element.querySelectorAll('.props__value')).toHaveLength(0)
  })
})

describe('la consultation sépare ce que le pilote a réglé de ce que XCTrack a posé', () => {
  it('marque chaque ligne d’un des trois états, et de rien d’autre', () => {
    const panel = readOnlyPanel(compass(document()))
    const states = rowsOf(panel).map((row) => row.dataset.default)
    expect(states).toHaveLength(9)
    expect(states.every((state) => ['custom', 'default', 'unknown'].includes(state!))).toBe(true)
  })

  it('les trois clés universelles sont sans valeur d’usine : le relevé les a écrites lui-même', () => {
    const panel = readOnlyPanel(compass(document()))
    for (const key of ['_border', '_bg', '_theme']) {
      const row = panel.element.querySelector<HTMLElement>(`[data-key="${key}"]`)!
      expect(row.dataset.default).toBe('unknown')
      expect(row.querySelector('.props__origin')?.textContent).toBe('valeur d’usine inconnue')
    }
  })

  it('la boussole du corpus : quatre réglages du pilote sur six comparables', () => {
    const form = buildPropertyForm(compass(document()))
    expect(form.defaultsKnown).toBe(true)
    // Neuf contrôles ; les trois clés universelles ne se comparent pas.
    expect(form.fields).toHaveLength(9)
    expect(form.comparableCount).toBe(6)
    expect(form.customizedCount).toBe(4)

    expect(form.fields.map((field) => `${field.path}:${field.defaultState}`)).toEqual([
      '_border:unknown', '_bg:unknown', '_theme:unknown',
      'rotation:custom', 'navigation_target:custom', 'windStyle:custom',
      'showHeading:default', 'showBearing:custom', 'showBackground:default'
    ])
  })

  it('affiche la valeur d’usine sur la ligne qui s’en écarte', () => {
    // La boussole du corpus dessine le vent en arc ; XCTrack n'en dessine aucun par défaut.
    const panel = readOnlyPanel(compass(document()))
    const row = panel.element.querySelector<HTMLElement>('[data-key="windStyle"]')!
    expect(row.dataset.default).toBe('custom')
    const mark = row.querySelector<HTMLElement>('.props__origin')!
    // La valeur d'usine se dit dans la langue du panneau, comme la valeur juste à côté :
    // la constante du fichier reste dans l'infobulle, pour qui compare deux sauvegardes.
    const none = fieldAt(panel.form, 'windStyle').choices.find((one) => one.value === 'NONE')!
    expect(mark.textContent).toBe(`réglé par vous · d’usine : ${none.label}`)
    expect(mark.title).toContain('XCTrack écrit « NONE »')

    const bool = panel.element.querySelector<HTMLElement>('[data-key="showBearing"] .props__origin')!
    expect(bool.textContent).toBe('réglé par vous · d’usine : Non')

    const same = panel.element.querySelector<HTMLElement>('[data-key="showBackground"]')!
    expect(same.dataset.default).toBe('default')
    expect(same.querySelector('.props__origin')?.textContent).toBe('valeur d’usine')
  })

  it('c’est sur un widget chargé que la distinction paie : 63 réglages, 17 du pilote', () => {
    const doc = document()
    const widget = readLayout(doc).landscape.flatMap((page) => page.widgets)
      .find((one) => one.shortName === 'WXCAssistant')!
    const form = buildPropertyForm(widget)

    // Le cas que la fonction doit servir : aligner 63 lignes sans hiérarchie ne dit rien,
    // en désigner 17 répond à la question qu'on se pose devant la page d'un autre pilote.
    expect(form.fields).toHaveLength(63)
    expect(form.comparableCount).toBe(60)
    expect(form.customizedCount).toBe(17)

    const panel = renderProperties({ form, readOnly: true })
    expect(panel.element.querySelector('.props__defaults-count')?.textContent)
      .toBe('17 réglages personnalisés sur 60 comparés.')
  })

  it('compte les personnalisés sur les contrôles comparables, jamais sur le total', () => {
    const form = buildPropertyForm(map(document()))
    expect(form.fields).toHaveLength(49)
    expect(form.comparableCount).toBe(46)
    expect(form.customizedCount).toBe(4)

    const comparable = form.fields.filter((field) => field.defaultState !== 'unknown')
    expect(comparable).toHaveLength(form.comparableCount)
    expect(comparable.filter((field) => field.defaultState === 'custom'))
      .toHaveLength(form.customizedCount)
  })

  it('un type que le relevé ignore ne devient pas « tout personnalisé »', () => {
    const doc = document()
    const widget = readLayout(doc).landscape.flatMap((page) => page.widgets)
      .find((one) => one.shortName === 'WCompass')!
    // On force un type inconnu du relevé en interrogeant le formulaire sous un autre nom.
    const form = buildPropertyForm({ node: widget.node, shortName: 'WPasDansLeReleve' })
    expect(form.defaultsKnown).toBe(false)
    expect(form.comparableCount).toBe(0)
    expect(form.customizedCount).toBe(0)
    expect(form.fields.every((field) => field.defaultState === 'unknown')).toBe(true)

    const panel = renderProperties({ form, readOnly: true })
    expect(panel.element.querySelector('.props__defaults-count')?.textContent)
      .toContain('ne décrit pas ce type de gadget')
    // Pas de filtre « seulement ce qui diffère » : il ne laisserait rien à l'écran.
    expect(panel.element.querySelector('.props__defaults-only')).toBeNull()
  })

  it('le filtre des différences ne laisse que les personnalisés, et se compose avec la recherche', () => {
    const form = buildPropertyForm(map(document()))
    const panel = renderProperties({ form, readOnly: true })
    const custom = form.fields.filter((field) => field.defaultState === 'custom').map((f) => f.path)
    expect(custom.length).toBeGreaterThan(0)

    expect(visibleKeys(panel)).toHaveLength(form.fields.length)

    const only = panel.element.querySelector<HTMLButtonElement>('.props__defaults-only')!
    only.click()
    expect(only.getAttribute('aria-pressed')).toBe('true')
    expect(only.textContent).toBe('Tout afficher')
    expect(visibleKeys(panel)).toEqual(custom)

    // Les deux filtres se composent : chercher DANS ce qui diffère, et non à la place.
    panel.filter('KK7')
    expect(visibleKeys(panel).every((key) => custom.includes(key))).toBe(true)
    expect(visibleKeys(panel).every((key) => /KK7/i.test(key))).toBe(true)

    panel.filter('')
    only.click()
    expect(only.getAttribute('aria-pressed')).toBe('false')
    expect(visibleKeys(panel)).toHaveLength(form.fields.length)
  })

  it('rend les valeurs en toutes lettres plutôt qu’en texte source', () => {
    const panel = readOnlyPanel(compass(document()))
    const value = (key: string): string =>
      panel.element.querySelector<HTMLElement>(`[data-key="${key}"] .props__value`)!.textContent!

    // Un booléen se lit, il ne se coche pas.
    expect(['Oui', 'Non']).toContain(value('showHeading'))
    // Une énumération montre son libellé traduit, pas la constante du fichier.
    expect(value('windStyle')).not.toBe('')
    expect(fieldAt(panel.form, 'windStyle').choices.map((c) => c.label))
      .toContain(value('windStyle'))
  })

  it('montre la pastille d’une couleur sans champ de saisie', () => {
    const panel = readOnlyPanel(map(document()))
    const row = panel.element.querySelector<HTMLElement>('[data-key="tracklog_color"]')!
    expect(row.querySelector('input')).toBeNull()
    expect(row.querySelector('.props__hexText')?.textContent).toBe('#FFFF962D')
    expect(row.querySelector<HTMLElement>('.props__swatch')!.style.backgroundColor).toBe('#FF962D')
  })
})

describe('ce que la consultation dit quand le fichier vient d’une autre version', () => {
  it('annonce une comparaison exacte pour un fichier de la version du relevé', () => {
    const panel = readOnlyPanel(compass(document()), { fileVersionCode: DEFAULTS_VERSION_CODE })
    const box = panel.element.querySelector<HTMLElement>('.props__defaults')!
    expect(box.dataset.trust).toBe('exact')
    const note = box.querySelector('.props__defaults-note')!.textContent!
    expect(note).toContain(DEFAULTS_VERSION_NAME)
    expect(note).toContain('la version même de ce fichier')
    expect(note).not.toContain('indicative')
  })

  it('avertit que la comparaison n’est qu’indicative pour une autre version', () => {
    const doc = oldDocument()
    const widget = readLayout(doc).landscape.flatMap((page) => page.widgets)
      .find((one) => one.shortName === 'WCompass')!
    const panel = readOnlyPanel(widget, { fileVersionCode: 91230, fileVersionName: '0.9.12.3' })

    const box = panel.element.querySelector<HTMLElement>('.props__defaults')!
    expect(box.dataset.trust).toBe('indicative')
    const note = box.querySelector('.props__defaults-note')!.textContent!
    expect(note).toContain('0.9.12.3')
    expect(note).toContain('indicative')
    /*
     * Le NOM de la version, pas son numéro interne. « la version 0.9.12.3 (versionCode
     * 91230) » ouvrait une parenthèse au milieu de la phrase sur un nombre que XCTrack ne
     * montre nulle part au pilote : c'est l'un des trois exemples qu'un pilote-testeur a
     * cités le 2026-08-22 pour dire qu'il saute ces lignes. Le nom, lui, est celui qu'il
     * lit sur son instrument. Le numéro reste dans « Version et compatibilité », l'écran
     * dont c'est le sujet.
     */
    expect(note).not.toContain('91230')
    expect(note).not.toContain('versionCode')
    // La comparaison n'est pas supprimée pour autant : elle reste faite, et dite.
    expect(box.dataset.comparable).not.toBe('0')
  })

  it('avertit aussi quand le fichier ne dit pas d’où il vient', () => {
    const panel = readOnlyPanel(compass(document()))
    const box = panel.element.querySelector<HTMLElement>('.props__defaults')!
    expect(box.dataset.trust).toBe('unstated')
    expect(box.querySelector('.props__defaults-note')!.textContent)
      .toContain('ne dit pas de quelle version il vient')
  })

  it('signale les réglages du relevé que le widget ne porte pas', () => {
    const doc = oldDocument()
    const widget = readLayout(doc).landscape.flatMap((page) => page.widgets)
      .find((one) => one.shortName === 'WCompass')!
    const form = buildPropertyForm(widget)

    // `windStyle` n'existait pas en 0.9.12.3 ; en regard, `showWind` et `newWindArrow` y
    // vivent encore et sont deux vestiges que le relevé de 1.0.3-beta ne connaît plus.
    expect(form.missingDefaults.map((one) => one.key)).toEqual(['windStyle'])
    expect(form.fields.map((field) => field.path)).toContain('showWind')
    expect(fieldAt(form, 'showWind').defaultState).toBe('unknown')

    const panel = renderProperties({ form, readOnly: true, fileVersionCode: 91230 })
    const note = panel.element.querySelector('.props__defaults-note')!.textContent!
    expect(note).toContain('1 réglage du relevé ne figure pas dans ce gadget (windStyle)')
    expect(note).toContain('indicative')
  })
})

/**
 * Ce que le fichier n'écrit pas.
 *
 * Un gadget ne porte pas toujours toutes les clés que le relevé lui connaît, et ce n'est
 * pas une anomalie : XCTrack applique alors la valeur de son code sans l'écrire. Le
 * panneau les montre en fin de liste et, en édition seulement, offre de les figer.
 */
describe('les clés que le gadget n’écrit pas', () => {
  /**
   * La carte de la deuxième page portrait du fichier de 2026 : sept clés du relevé lui
   * manquent, dont une composite.
   *
   * Elle vient pourtant de **la version même du relevé** (versionCode 100030) : une clé
   * absente n'est donc pas la marque d'une autre version, seulement d'un réglage que ce
   * gadget-là n'a jamais reçu. La carte paysage du même fichier, elle, les porte toutes.
   */
  function portraitMap(doc: JsonNode): Widget {
    const widget = widgetAt(doc, 'portrait', 1, 0)
    expect(widget.shortName).toBe('WCompMap')
    return widget
  }

  function mapForm(doc: JsonNode): PropertyForm {
    return buildPropertyForm(portraitMap(doc))
  }

  /** La boussole de 2025 : `windStyle` lui manque, et c'est une chaîne — donc écrivable. */
  function oldCompassWidget(doc: JsonNode): Widget {
    const widget = readLayout(doc).landscape.flatMap((page) => page.widgets)
      .find((one) => one.shortName === 'WCompass')
    if (widget === undefined) throw new Error('pas de WCompass dans le fichier de 2025')
    return widget
  }

  function absentRows(panel: { element: HTMLElement }): HTMLElement[] {
    return [...panel.element.querySelectorAll<HTMLElement>('.props__absent-row')]
  }

  it('décrit chaque clé absente : libellé, valeur appliquée, et de quoi l’écrire', () => {
    const form = mapForm(document())
    expect(form.missingDefaults.map((one) => one.key)).toEqual([
      'mapWidget_mapAppearance', 'mapWidget_osmLanguage', 'mapWidget_panningTimeout',
      'mapWidget_panningAirspaceList', 'mapWidget_panningAirspaceListCycleSpeed',
      'nav_label', 'thermals_labels'
    ])

    const labels = new Map(form.missingDefaults.map((one) => [one.key, one]))
    // Une chaîne : elle s'écrira entre guillemets, et le texte source est celui-là.
    expect(labels.get('nav_label')).toMatchObject({
      valueKind: 'string', defaultText: 'DISTANCE_BRACKETS', raw: '"DISTANCE_BRACKETS"',
      writable: true, known: true
    })
    // Un booléen : un littéral, écrit tel quel.
    expect(labels.get('thermals_labels')).toMatchObject({
      valueKind: 'literal', defaultText: 'false', raw: 'false', control: 'checkbox'
    })
    // Tout porte un libellé traduit, jamais un nom de clé nu.
    expect(form.missingDefaults.every((one) => one.label !== one.key)).toBe(true)
  })

  it('ne propose pas d’écrire une valeur composée : elle n’a pas de forme sûre', () => {
    const form = mapForm(document())
    const composite = form.missingDefaults.find((one) => one.key === 'mapWidget_mapAppearance')!
    // `{"theme":"None","terrain":"None"}` : montrée, jamais reconstruite de mémoire.
    expect(composite.writable).toBe(false)
    expect(composite.raw).toBeUndefined()
    expect(composite.control).toBe('unknown')
    expect(composite.defaultText).toBe('{"theme":"None","terrain":"None"}')

    // Et la primitive d'écriture le refuse elle-même, quel que soit l'appelant.
    const doc = document()
    const before = serializeJson(doc)
    expect(writeMissingDefault(portraitMap(doc).node, composite)).toBe(false)
    expect(serializeJson(doc)).toBe(before)
  })

  it('montre le bloc en édition, avec un bouton par clé écrivable et pas un de plus', () => {
    const panel = renderProperties({ form: mapForm(document()) })
    const rows = absentRows(panel)
    expect(rows).toHaveLength(7)
    expect(rows.map((row) => row.dataset.key)).toEqual(
      panel.form.missingDefaults.map((one) => one.key)
    )

    const buttons = [...panel.element.querySelectorAll<HTMLButtonElement>('.props__adopt')]
    expect(buttons).toHaveLength(6)
    expect(new Set(buttons.map((button) => button.textContent))).toEqual(
      new Set(['Définir cette valeur'])
    )
    // La composite porte la phrase qui dit pourquoi il n'y a rien à cliquer.
    const composite = rows.find((row) => row.dataset.key === 'mapWidget_mapAppearance')!
    expect(composite.dataset.writable).toBe('false')
    expect(composite.querySelector('.props__adopt')).toBeNull()
    expect(composite.querySelector('.props__absent-none')!.textContent)
      .toBe('valeur d’usine composée')
  })

  it('dit la valeur dans la langue du pilote, la chaîne vide comprise', () => {
    const panel = renderProperties({ form: mapForm(document()) })
    const valueOf = (key: string): string => absentRows(panel)
      .find((row) => row.dataset.key === key)!
      .querySelector('.props__absent-default')!.textContent!

    expect(valueOf('thermals_labels')).toBe('Non')
    expect(valueOf('mapWidget_osmLanguage')).toBe('(vide)')
    expect(valueOf('mapWidget_panningTimeout')).toBe('60')
  })

  it('écrit la clé en fin de gadget, sans déplacer ni réindenter le reste', () => {
    const doc = oldDocument()
    const widget = oldCompassWidget(doc)
    const before = serializeJson(doc)
    const panel = renderProperties({ form: buildPropertyForm(widget) })

    const button = panel.element
      .querySelector<HTMLButtonElement>('.props__absent-row[data-key="windStyle"] .props__adopt')!
    expect(button.textContent).toBe('Définir cette valeur')
    // Mêmes mots que l'écran des préférences, pour le même geste.
    expect(button.title).toContain('Une fois écrite, la valeur est figée')
    expect(button.title).toContain('rien à ce qu’il fait maintenant')
    // Panneau d'édition : la version du fichier ne lui est pas donnée, il ne la suppose pas.
    expect(button.title).toContain('n’est pas connue ici')
    button.click()

    const after = serializeJson(doc)
    // Une seule plage diverge, et elle ne fait qu'ajouter : rien n'a été réécrit.
    const difference = singleDifference(before, after)
    expect(difference.before).toBe('')
    expect(difference.after).toMatch(/^,\n +"windStyle": "NONE"$/)
    expect(after.length - before.length).toBe(difference.after.length)
  })

  it('écrire puis retirer la clé rend le fichier à l’octet près', () => {
    const doc = oldDocument()
    const widget = oldCompassWidget(doc)
    const before = serializeJson(doc)
    const missing = buildPropertyForm(widget).missingDefaults[0]!

    expect(writeMissingDefault(widget.node, missing)).toBe(true)
    expect(serializeJson(doc)).not.toBe(before)
    // Insérer deux fois créerait le doublon que l'outil reproche aux fichiers.
    expect(writeMissingDefault(widget.node, missing)).toBe(false)

    expect(removeMember(widget.node, 'windStyle')).toBe(1)
    expect(serializeJson(doc)).toBe(before)
    expect(sha256(serializeJson(doc))).toBe(sha256(OLD_SOURCE))
  })

  it('l’annulation défait l’écriture, empreinte comprise', () => {
    const history = createHistory(oldDocument())
    const doc = history.current()
    const widget = oldCompassWidget(doc)
    const panel = renderProperties({
      form: buildPropertyForm(widget),
      // Ce que `main.ts` branche : chaque écriture effective devient un pas d'historique.
      onChange: (field) => { history.record(`Régler ${field.label}`) }
    })

    panel.element
      .querySelector<HTMLButtonElement>('.props__absent-row[data-key="windStyle"] .props__adopt')!
      .click()

    expect(history.canUndo()).toBe(true)
    expect(history.undoDescription()).toBe('Régler Style d’indicateur de vent'
      .replace('’', "'"))
    expect(serializeJson(history.current())).not.toBe(OLD_SOURCE)
    expect(sha256(serializeJson(history.undo()))).toBe(sha256(OLD_SOURCE))
    expect(history.isDirty()).toBe(false)
  })

  it('la clé écrite devient une ligne comme les autres, et le bloc perd la sienne', () => {
    const doc = oldDocument()
    const panel = renderProperties({ form: buildPropertyForm(oldCompassWidget(doc)) })
    expect(absentRows(panel)).toHaveLength(1)
    expect(rowsOf(panel).map((row) => row.dataset.key)).not.toContain('windStyle')

    panel.element.querySelector<HTMLButtonElement>('.props__adopt')!.click()

    // Le bloc a disparu avec sa dernière ligne, et le réglage est désormais éditable.
    expect(panel.element.querySelector('.props__absent')).toBeNull()
    expect(rowsOf(panel).map((row) => row.dataset.key)).toContain('windStyle')
    const select = panel.element
      .querySelector<HTMLSelectElement>('[data-key="windStyle"] select')!
    expect(select.value).toBe('NONE')
    expect(panel.form.missingDefaults).toEqual([])
  })

  it('la consultation montre le bloc et n’offre rien : aucun bouton, aucun champ', () => {
    const doc = document()
    const before = serializeJson(doc)
    const panel = readOnlyPanel(portraitMap(doc))
    const rows = absentRows(panel)
    expect(rows).toHaveLength(7)
    expect(panel.element.querySelectorAll('.props__adopt')).toHaveLength(0)
    for (const row of rows) {
      expect(row.querySelector('input, select, button')).toBeNull()
    }

    // Le contrat du panneau de consultation tient : rien n'atteint le document.
    for (const node of panel.element.querySelectorAll<HTMLElement>('*')) {
      node.dispatchEvent(new Event('click', { bubbles: true }))
    }
    expect(serializeJson(doc)).toBe(before)
  })

  it('dit ce que vaut le relevé avant de proposer de l’écrire, jamais après', () => {
    const note = (options: Record<string, unknown>): string => {
      const doc = oldDocument()
      const panel = renderProperties({ form: buildPropertyForm(oldCompassWidget(doc)), ...options })
      const box = panel.element.querySelector<HTMLElement>('.props__absent')!
      const text = box.querySelector('.props__absent-note')!.textContent!
      // La note précède les lignes : l'avertissement se lit avant le bouton.
      expect([...box.children].indexOf(box.querySelector('.props__absent-note')!))
        .toBeLessThan([...box.children].indexOf(box.querySelector('.props__absent-row')!))
      return `${box.dataset.trust!}|${text}`
    }

    // Le fichier de 2025 vient d'une autre version que le relevé : c'est dit en toutes
    // lettres, dans le bloc, avant le bouton.
    const other = note({ fileVersionCode: 91230, fileVersionName: '0.9.12.3' })
    expect(other).toContain('indicative|')
    expect(other).toContain('0.9.12.3')
    expect(other).toContain('peut différer')
    expect(other).toContain(DEFAULTS_VERSION_NAME)

    // Sans version connue — le cas du panneau d'édition — on ne prétend pas savoir.
    const unknown = note({})
    expect(unknown).toContain('unstated|')
    expect(unknown).toContain('n’est pas connue ici')
    expect(unknown).toContain('changent d’une version à l’autre')

    // Et le geste est expliqué pour ce qu'il est : sans effet aujourd'hui, utile demain.
    expect(unknown).toContain('ne change rien à ce que fait l’appareil aujourd’hui')
    expect(unknown).toContain('fige la valeur')
  })

  it('annonce une comparaison exacte quand le fichier est de la version du relevé', () => {
    const panel = readOnlyPanel(portraitMap(document()), { fileVersionCode: DEFAULTS_VERSION_CODE })
    const box = panel.element.querySelector<HTMLElement>('.props__absent')!
    expect(box.dataset.trust).toBe('exact')
    expect(box.dataset.count).toBe('7')
    const note = box.querySelector('.props__absent-note')!.textContent!
    expect(note).toContain('la version même de ce fichier')
    // En consultation, on ne promet pas un geste qu'on n'offre pas.
    expect(note).not.toContain('fige la valeur')
  })

  it('un gadget qui porte tout ce que le relevé décrit n’a pas de bloc du tout', () => {
    const panel = renderProperties({ form: buildPropertyForm(compass(document())) })
    expect(panel.form.missingDefaults).toEqual([])
    expect(panel.element.querySelector('.props__absent')).toBeNull()
  })

  it('le filtre porte sur les clés absentes, et le bloc s’efface avec sa dernière ligne', () => {
    const panel = renderProperties({ form: mapForm(document()) })
    const box = panel.element.querySelector<HTMLElement>('.props__absent')!
    const shown = (): string[] => absentRows(panel)
      .filter((row) => !row.hidden).map((row) => row.dataset.key!)

    panel.filter('nav_label')
    expect(shown()).toEqual(['nav_label'])
    expect(box.hidden).toBe(false)

    panel.filter('épaisseur')
    expect(shown()).toEqual([])
    expect(box.hidden).toBe(true)

    panel.filter('')
    expect(shown()).toHaveLength(7)
  })

  it('« seulement ce qui diffère » les masque : une clé absente ne s’écarte de rien', () => {
    const panel = readOnlyPanel(portraitMap(document()))
    const box = panel.element.querySelector<HTMLElement>('.props__absent')!
    const only = panel.element.querySelector<HTMLButtonElement>('.props__defaults-only')!

    only.click()
    expect(box.hidden).toBe(true)
    only.click()
    expect(box.hidden).toBe(false)
  })

  it('garde le filtre en cours quand une écriture refait le panneau', () => {
    const doc = document()
    const panel = renderProperties({ form: mapForm(doc) })
    const search = panel.element.querySelector<HTMLInputElement>('.props__filter')!
    search.value = 'nav_label'
    search.dispatchEvent(new Event('input'))

    panel.element
      .querySelector<HTMLButtonElement>('.props__absent-row[data-key="nav_label"] .props__adopt')!
      .click()

    // Le panneau est refait de fond en comble : le filtre, lui, ne se refait pas tout seul.
    const again = panel.element.querySelector<HTMLInputElement>('.props__filter')!
    expect(again.value).toBe('nav_label')
    expect(visibleKeys(panel)).toEqual(['nav_label'])
  })
})

/* =========================================== le troisième geste : rétablir la valeur d'usine */

/**
 * Les deux premiers gestes du panneau sont **neutres pour l'appareil** : écrire une clé
 * absente pose la valeur que XCTrack applique déjà, la retirer la lui rend. Celui-ci
 * remplace un réglage que le pilote a choisi — l'appareil ne se comportera plus pareil en
 * vol.
 *
 * Tout ce bloc en vérifie les trois conséquences : il se voit (il ne se révèle pas au
 * survol), il ne s'offre que là où la valeur d'usine est connue **avec certitude**, et il
 * dit d'où elle vient quand le fichier ne vient pas de la version du relevé.
 */
describe('rétablir la valeur d’usine d’un réglage que le pilote a changé', () => {
  function restoreLine(panel: { element: HTMLElement }, key: string): HTMLElement | null {
    return panel.element.querySelector<HTMLElement>(`[data-key="${key}"] .props__restore`)
  }

  function restoreButton(panel: { element: HTMLElement }, key: string): HTMLButtonElement {
    const button = panel.element
      .querySelector<HTMLButtonElement>(`[data-key="${key}"] .props__restore-btn`)
    if (button === null) throw new Error(`pas de bouton de rétablissement pour ${key}`)
    return button
  }

  it('ne l’offre que sur ce que le relevé a su comparer, et qui s’en écarte', () => {
    const panel = renderProperties({ form: buildPropertyForm(compass(document())) })

    // Les quatre réglages du pilote : la comparaison a conclu, la valeur est simple.
    for (const key of ['rotation', 'navigation_target', 'windStyle', 'showBearing']) {
      expect(restoreLine(panel, key), key).not.toBeNull()
    }
    // Déjà à la valeur d'usine : il n'y a rien à rétablir.
    for (const key of ['showHeading', 'showBackground']) {
      expect(restoreLine(panel, key), key).toBeNull()
    }
    // « hors relevé » — le troisième état de `compareToDefault` est un refus de conclure,
    // pas un repli poli : on ne rétablit pas ce qu'on n'a pas su comparer.
    for (const key of ['_border', '_bg', '_theme']) {
      expect(fieldAt(panel.form, key).defaultState, key).toBe('unknown')
      expect(restoreLine(panel, key), key).toBeNull()
    }
    expect(panel.element.querySelectorAll('.props__restore')).toHaveLength(4)
  })

  it('ne l’offre jamais sur une valeur composée : elle ne se reconstruit pas de mémoire', () => {
    const doc = document()
    const panel = renderProperties({ form: buildPropertyForm(map(doc)) })
    for (const field of panel.form.fields) {
      if (field.valueKind !== 'object' && field.valueKind !== 'array') continue
      expect(restoreLine(panel, field.path), field.path).toBeNull()
    }
  })

  it('ne l’offre pas du tout en consultation : rien ne s’écrit là', () => {
    const doc = document()
    const before = serializeJson(doc)
    const panel = readOnlyPanel(compass(doc))
    expect(panel.element.querySelectorAll('.props__restore')).toHaveLength(0)
    expect(panel.element.querySelectorAll('.props__restore-btn')).toHaveLength(0)
    expect(serializeJson(doc)).toBe(before)
  })

  it('se voit sans survol, et dit ce qu’il échange avant le clic', () => {
    const panel = renderProperties({ form: buildPropertyForm(compass(document())) })
    const line = restoreLine(panel, 'windStyle')!
    const button = restoreButton(panel, 'windStyle')

    // Il ne se déguise pas : un vrai bouton, pas un fantôme révélé au survol comme
    // « Retirer » de l'écran des préférences — celui-ci change le vol.
    expect(button.textContent).toBe('Rétablir la valeur d’usine')
    expect(button.className).not.toContain('btn--ghost')
    expect(button.getAttribute('aria-label'))
      .toBe(`Rétablir ${fieldAt(panel.form, 'windStyle').label} à sa valeur d’usine`)

    // Les deux valeurs en présence, à l'écran et dans la langue du pilote.
    const note = line.querySelector('.props__restore-note')!.textContent!
    expect(note).toContain('« Aucun » d’usine')
    expect(note).toContain('« Arc » dans ce fichier')
    expect(note).toContain('change ce que fait l’appareil en vol')
  })

  it('écrit exactement la valeur du relevé, sans toucher à un autre octet', () => {
    const doc = document()
    const before = serializeJson(doc)
    const panel = renderProperties({ form: buildPropertyForm(compass(doc)) })
    restoreButton(panel, 'windStyle').click()

    const after = serializeJson(doc)
    // Une seule plage diverge, et c'est la valeur : rien n'a été réécrit ni réindenté.
    // C'est la preuve que l'écriture passe par le noyau préservant de `core/`, et non
    // par un `JSON.parse` / `JSON.stringify` qui normaliserait tout le fichier.
    expect(singleDifference(before, after)).toEqual({ before: 'ARC', after: 'NONE' })
    expect(diffLines(before, after)).toEqual(['            "windStyle": "NONE",'])
  })

  it('rend le fichier à l’octet près quand on repose la valeur qu’il portait', () => {
    const doc = document()
    const panel = renderProperties({ form: buildPropertyForm(compass(doc)) })
    restoreButton(panel, 'showBearing').click()
    expect(serializeJson(doc)).not.toBe(source)

    // Le panneau a été refait : c'est le champ frais qu'il faut reposer.
    expect(setFieldValue(fieldAt(panel.form, 'showBearing'), 'true')).toBe(true)
    expect(serializeJson(doc)).toBe(source)
    expect(sha256(serializeJson(doc))).toBe(sha256(source))
  })

  it('l’annulation le défait, empreinte comprise', () => {
    const history = createHistory(document())
    const doc = history.current()
    const panel = renderProperties({
      form: buildPropertyForm(compass(doc)),
      // Ce que `main.ts` branche : chaque écriture effective devient un pas d'historique.
      onChange: (field) => { history.record(`Régler ${field.label}`) }
    })

    restoreButton(panel, 'windStyle').click()
    expect(history.canUndo()).toBe(true)
    expect(serializeJson(history.current())).not.toBe(source)
    expect(sha256(serializeJson(history.undo()))).toBe(sha256(source))
    expect(history.isDirty()).toBe(false)
  })

  it('le geste disparaît une fois accompli, et la ligne se dit au relevé', () => {
    const doc = document()
    const panel = renderProperties({ form: buildPropertyForm(compass(doc)) })
    restoreButton(panel, 'windStyle').click()

    expect(restoreLine(panel, 'windStyle')).toBeNull()
    expect(fieldAt(panel.form, 'windStyle').defaultState).toBe('default')
    expect(panel.form.customizedCount).toBe(3)
    // Le contrôle montre la valeur rétablie : le panneau est refait depuis le document.
    const select = panel.element.querySelector<HTMLSelectElement>('[data-key="windStyle"] select')!
    expect(select.value).toBe('NONE')
  })

  it('dit d’où vient la valeur d’usine dès que le fichier ne vient pas de cette version', () => {
    const trustOf = (options: Record<string, unknown>): { trust: string; note: string } => {
      const panel = renderProperties({
        form: buildPropertyForm(compass(document())), ...options
      })
      const line = restoreLine(panel, 'windStyle')!
      return { trust: line.dataset.trust!, note: line.querySelector('.props__restore-note')!.textContent! }
    }

    // La version même du relevé : rien à ajouter. Une phrase de prudence servie à tort
    // apprend au lecteur à ne plus lire les phrases de prudence.
    const exact = trustOf({ fileVersionCode: DEFAULTS_VERSION_CODE })
    expect(exact.trust).toBe('exact')
    expect(exact.note).not.toContain('vérifiez')

    // Une autre version : l'avertissement est **dans la phrase**, pas dans l'infobulle —
    // « avant le clic » exclut le survol.
    const other = trustOf({ fileVersionCode: 91230, fileVersionName: '0.9.12.3' })
    expect(other.trust).toBe('indicative')
    expect(other.note).toContain(DEFAULTS_VERSION_NAME)
    expect(other.note).toContain('vérifiez que c’est bien celle à rétablir')

    // Version inconnue : on ne prétend pas savoir, et on le dit pareillement.
    const unstated = trustOf({})
    expect(unstated.trust).toBe('unstated')
    expect(unstated.note).toContain('n’est pas connue ici')
    expect(unstated.note).toContain('vérifiez que c’est bien celle à rétablir')
  })

  it('l’infobulle dit ce qui sépare ce geste de « Définir cette valeur »', () => {
    const panel = renderProperties({ form: buildPropertyForm(compass(document())) })
    const title = restoreButton(panel, 'windStyle').title
    expect(title).toContain('Écrit « windStyle » : Aucun dans le fichier, à la place de Arc.')
    expect(title).toContain('celui-là laisse l’appareil se comporter exactement comme aujourd’hui, celui-ci non')
  })
})

/* ================================================== les deux axes de langue */

describe('les deux axes de langue', () => {
  it('traduit notre prose sans toucher aux libellés du panneau', () => {
    // Le cas qui décide : le fichier est en français, l'interface en allemand. Les deux
    // se croisent sur chaque ligne, et aucun ne déteint sur l'autre.
    const form = buildPropertyForm(compass(document()), 'fr', GERMAN)
    const panel = renderProperties({ form, tr: GERMAN, readOnly: true })

    expect(panel.element.querySelector('.props__title')?.textContent)
      .toBe(`Widget: ${form.label}`)
    expect(form.label).toBe('Boussole et vent')
    expect(panel.element.querySelector('.props__count')?.textContent)
      .toMatch(/Einstellungen$/)

    // Les intitulés de réglages viennent de l'APK : ils restent français.
    const labels = [...panel.element.querySelectorAll('.props__label')]
      .map((node) => node.textContent ?? '')
    expect(labels).toContain('Rotation du compas')
    expect(labels.join(' ')).not.toMatch(/Kompass|Drehung/)
  })

  it('nomme les unités nues dans la langue de l’interface, jamais dans celle du fichier', () => {
    // `UNIT_VALUE_KEYS` est le seul endroit où NOTRE mot remplace une valeur du fichier :
    // il suit donc le pilote, pas l'appareil. Le fichier reste en français dans les deux
    // cas — seul le traducteur change.
    const choicesOf = (tr: typeof FRENCH): string[] =>
      fieldAt(buildPropertyForm(withUnits(document()), 'fr', tr), '_units')
        .choices.map((choice) => choice.label)

    expect(choicesOf(FRENCH)).toContain('comme les réglages généraux')
    expect(choicesOf(GERMAN)).toContain('wie die allgemeinen Einstellungen')
    // Et la valeur écrite dans le fichier, elle, ne bouge pas d'un octet.
    const values = fieldAt(buildPropertyForm(withUnits(document()), 'fr', GERMAN), '_units')
      .choices.map((choice) => choice.value)
    expect(values).toContain('SYS_UNIT')
  })

  it('« Rétablir la valeur d’usine » dit le même mot que l’écran des réglages', () => {
    // La constante française héritée a disparu avec le dernier écran qui l'employait :
    // l'accord entre les deux écrans tient maintenant aux deux clés du catalogue, et à ce
    // test-ci — que `tests/ui/preferencesPage.test.ts` double depuis l'autre bord.
    expect(frenchMessages['properties.restoreFactoryValue']).toBe('Rétablir la valeur d’usine')
    expect(frenchMessages['preferences.restoreLabel'])
      .toBe(frenchMessages['properties.restoreFactoryValue'])
  })

  it('sans traducteur, dit mot pour mot ce que le catalogue français dit', () => {
    // Le repli hérité est là tant que `main.ts` ne passe pas `tr` : il doit être
    // rigoureusement le catalogue français, sans quoi la bascule changerait des phrases.
    const inherited = renderProperties({
      form: buildPropertyForm(oldCompass(document())), readOnly: true
    })
    const french = renderProperties({
      form: buildPropertyForm(oldCompass(document()), 'fr', FRENCH), tr: FRENCH, readOnly: true
    })
    // Le texte, et non le HTML : les identifiants de contrôles portent un compteur de
    // panneau, qui diffère forcément entre deux rendus.
    expect(inherited.element.textContent).toBe(french.element.textContent)
  })
})
