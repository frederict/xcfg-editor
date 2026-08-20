#!/usr/bin/env python3
"""Extrait le catalogue de la palette d'ajout de widgets XCTrack depuis un APK décompressé.

Régénère `src/catalog/widgetCatalog/<langue>.json` : pour chaque widget proposé à
l'ajout, sa **famille**, sa **position dans cette famille**, son indicateur **Pro** et
sa **description**. Plus les libellés des familles elles-mêmes. Aucune dépendance
tierce.

**Un fichier par langue**, et non un catalogue unique portant les 33 : l'éditeur n'en
affiche jamais qu'une à la fois. Voir « La partition par langue » plus bas. La liste
des langues disponibles sort à part, dans `src/catalog/widgetCatalogLanguages.json`.

Usage :
    python3 tools/extract-widget-catalog.py [chemin_du_dossier_apk_decompile]

Par défaut, cherche le dossier `XCTrack-*` frère de `xcfg-editor/`.

Les briques de bas niveau ne sont pas réécrites : le parseur `resources.arsc` vient de
`tools/extract-widget-labels.py`, le lecteur `.dex` et le simulateur de registres
Dalvik de `tools/extract-widget-options.py`.

## Pourquoi un troisième script plutôt que l'extension d'un des deux autres

Chacun des scripts existants possède exactement un fichier de sortie et un contrat :
`widgetLabels.json` (les noms) et `widgetOptions.json` (les réglages). Ce qu'on
extrait ici — l'ordre et le groupement de l'écran d'ajout — est une troisième source,
lue à un tout autre endroit du binaire (un registre statique, pas les constructeurs de
widgets). L'ajouter à `extract-widget-labels.py` changerait le contrat de
`widgetLabels.json`, dont les tests existants dépendent. Séparé, il se régénère seul.

## Où vit l'information, et comment on la lit

**L'appartenance à une famille n'est PAS dans les ressources** : aucune clé ne relie
`wgFlying` à `WAltitude`. Elle est dans le bytecode, sous la forme d'un **registre
statique unique** — une classe obfusquée (`fo7` dans la 1.0.3-beta5) dont le
`<clinit>` construit **un seul tableau plat**, dans l'ordre exact de l'écran :

    new oy9[94] { new ny9(R.string.wgSystem, false),   // en-tête de famille
                  WStatusLine.Companion,               // widget
                  WBrightnessInfo.Companion,
                  …
                  new ny9(R.string.wgFlying, false),   // famille suivante
                  … }

Un en-tête de famille est une instance de `ny9(int labelRes, boolean hidden)` ; un
widget est le champ statique `Companion` de sa classe. La famille d'un widget est donc
le dernier en-tête rencontré avant lui, et son rang la distance qui les sépare. Rien
n'est deviné : l'ordre du tableau EST l'ordre de l'écran.

Le titre, la description et l'indicateur Pro vivent un cran plus loin, dans le
`<init>` de chaque `Companion`, qui appelle son parent commun `jy9` :

    WStatusLine$Companion.<init>()  ->  jy9.<init>(R.string.wStatusLineTitle,
                                                   R.string.wStatusLineDescription, 12)

`jy9` a deux constructeurs :

- `jy9(int title, int description, int flags)` — le cas général. Son corps fait
  `flags & 4` puis stocke la **négation** du résultat dans le champ booléen lu par
  l'écran : `flags = 12` (bit armé) donne `false`, `flags = 8` donne `true`. Le
  booléen ainsi calculé est donc **`pro`** : les 13 widgets qui reçoivent `8` sont
  exactement ceux que l'appareil badge « Pro ».
- `jy9(int title, int description, boolean pro, String[] urls)` — la variante des
  widgets dont la description porte un lien (`WOptiUnfinishedFAIPotential` et son
  `https://xctrack.org/fpw.html`). Le booléen y est passé en clair.

On distingue les deux par la **signature courte** (`shorty`) du constructeur appelé,
pas par le nombre d'arguments simulés : `VIII` contre `VIIZL`.

## Ce que la méthode donne, et ce qu'elle ne donne pas

Elle donne les 11 familles (dont une masquée, `debug_wgDebug`), les 83 widgets du
registre, leur ordre, leur clé de ressource de titre et de description. Confrontation
faite avec le relevé d'écran de `docs/reference/edition-native-exploration.md` § 3.2 :
75 entrées visibles réparties en 10 familles, mêmes effectifs, même ordre.

Elle ne donne pas la **taille par défaut** d'un widget neuf (§ 3.4 : relevée sur
l'appareil, pas trouvée dans le registre), ni la raison pour laquelle un widget est
Pro. Une description absente est déclarée absente ; elle n'est jamais fabriquée.

## La partition par langue

Le catalogue complet pèse 204 Ko minifiés, dont 95 % de traductions qu'un pilote donné
ne lira jamais. Chaque fichier de langue est donc **autonome** : il porte la part
invariante (familles, widgets, ordre, Pro) et les seuls textes de sa langue.

Le repli anglais est **fusionné à la génération**, clé par clé, là où la langue ne
traduit pas. C'est structurellement nécessaire : des 33 langues, **l'anglais est la
seule complète** sur les 172 ressources du catalogue, `hr` n'en traduit que 16. Les
deux stratégies possibles ont été chiffrées avant de trancher (minifié, JSON) :

- **anglais fusionné** — un seul fichier à charger : `fr` 24 276 o (5 775 o gzip),
  `hr` 23 394 o (5 444 o gzip) ;
- **deux chargements**, la langue puis l'anglais entier : `fr` 46 651 o
  (10 780 o gzip), `hr` 37 420 o (8 027 o gzip).

La fusion transfère donc environ **deux fois moins d'octets** pour une langue bien
traduite, et une requête au lieu de deux. Elle coûte en contrepartie de la place sur le
serveur : 800 Ko pour les 33 fichiers, contre 713 Ko sans fusion — de la place qui
n'est jamais transférée. La fusion l'emporte.

Le texte anglais emprunté est indiscernable d'une traduction dans le fichier produit,
à dessein : l'ancien `catalogText()` rendait déjà `texts[langue] ?? texts.en`, la
partition rend exactement le même texte. Seuls `nativeStringCount` et
`fallbackStringCount` gardent trace de l'emprunt, pour l'audit.
"""
from __future__ import annotations

import importlib.util
import json
import struct
import sys
from pathlib import Path

sys.dont_write_bytecode = True

PROJECT_ROOT = Path(__file__).resolve().parents[1]


def _load(name: str, filename: str):
    spec = importlib.util.spec_from_file_location(name, PROJECT_ROOT / "tools" / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


LABELS = _load("extract_widget_labels", "extract-widget-labels.py")
OPTIONS = _load("extract_widget_options", "extract-widget-options.py")

ResourceTable = LABELS.ResourceTable
discover_widget_classes = LABELS.discover_widget_classes
Dex = OPTIONS.Dex
walk = OPTIONS.walk
simulate = OPTIONS.simulate

WIDGET_PKG = "Lorg/xcontest/XCTrack/widget/w/"


def class_short(descriptor: str) -> str:
    """`Lorg/xcontest/XCTrack/widget/w/WAMSL;` -> `WAMSL`.

    Surtout pas `descriptor.strip("L;")` : `strip` retire **tous** les caractères de
    l'ensemble, donc aussi le `L` final de `WAMSL` et de `WFL`."""
    if descriptor.startswith("L") and descriptor.endswith(";"):
        descriptor = descriptor[1:-1]
    return descriptor.rsplit("/", 1)[-1]


# `jy9.<init>(int, int, int)` fait `flags & 4` et stocke la négation : bit armé ->
# widget gratuit, bit désarmé -> widget Pro. Constante nommée ici pour qu'un lecteur
# n'ait pas à redécouvrir d'où sort le 4.
FREE_FLAG_BIT = 4

# Langue de repli du catalogue : celle des ressources par défaut de l'APK, et la seule
# qui traduise les 172 ressources. Voir la partition par langue, plus bas.
FALLBACK_LANGUAGE = "en"


def proto_shorty(dex: Dex, method_idx: int) -> str:
    """Signature courte d'une méthode : `VIII` pour `void <init>(int, int, int)`.

    Le lecteur `.dex` de `extract-widget-options.py` ignore la table des prototypes —
    il n'en avait pas besoin. On la relit ici depuis l'en-tête (`proto_ids_off` est le
    sixième couple taille/offset, à l'octet 76)."""
    _cls_idx, proto_idx, _name_idx = struct.unpack_from(
        "<HHI", dex.data, dex.method_ids_off + method_idx * 8
    )
    proto_ids_off = struct.unpack_from("<I", dex.data, 76)[0]
    shorty_idx = struct.unpack_from("<I", dex.data, proto_ids_off + proto_idx * 12)[0]
    return dex.string(shorty_idx)


# --------------------------------------------------------------------------
# 1. Le registre : quelle classe, et que contient son tableau
# --------------------------------------------------------------------------

def find_registry(dexes: list[Dex], family_res_ids: set[int]) -> tuple[Dex, int, str]:
    """Localise le `<clinit>` qui référence les identifiants de ressource des familles.

    On ne code pas en dur le nom obfusqué (`fo7`) : il changera à la prochaine version.
    On cherche la méthode qui cite au moins la moitié des ressources `wg*` — dans la
    1.0.3-beta5, une seule les cite, et elle les cite toutes."""
    best: tuple[int, Dex, int, str] | None = None
    for dex in dexes:
        for class_name, _parent, cdata_off in dex.class_defs():
            for _method_idx, method_name, code_off in dex.methods(cdata_off):
                if code_off == 0:
                    continue
                cited = set()
                for _pc, op, offset in walk(dex, code_off):
                    if op == 0x14:
                        value = struct.unpack_from("<I", dex.data, offset + 2)[0]
                    elif op == 0x15:
                        value = struct.unpack_from("<h", dex.data, offset + 2)[0] << 16
                    else:
                        continue
                    if value in family_res_ids:
                        cited.add(value)
                if len(cited) * 2 >= len(family_res_ids) and (best is None or len(cited) > best[0]):
                    best = (len(cited), dex, code_off, f"{class_name}.{method_name}")
    if best is None:
        raise SystemExit("Registre des widgets introuvable : aucune méthode ne cite les "
                         "ressources de famille wg*. Le format a changé.")
    return best[1], best[2], best[3]


def read_registry_array(dex: Dex, code_off: int) -> list[tuple]:
    """Rejoue le `<clinit>` du registre et rend le tableau plat, entrée par entrée.

    Les valeurs rendues sont soit `("family", label_res_id, hidden)`, soit
    `("widget", descripteur_de_classe)`. Le simulateur de `extract-widget-options.py`
    ne suit ni `new-array` ni `aput` **avec conservation du tableau construit** (il ne
    s'en sert que pour les tableaux d'arguments) : on refait ici une passe minimale,
    du même modèle, mais qui retient l'objet tableau."""
    data = dex.data
    regs: dict[int, object] = {}
    arrays: list[list] = []
    for _pc, op, o in walk(dex, code_off):
        if op == 0x12:
            v = data[o + 1] >> 4
            regs[data[o + 1] & 0xF] = ("int", v if v < 8 else v - 16)
        elif op == 0x13:
            regs[data[o + 1]] = ("int", struct.unpack_from("<h", data, o + 2)[0])
        elif op == 0x14:
            regs[data[o + 1]] = ("int", struct.unpack_from("<I", data, o + 2)[0])
        elif op == 0x15:
            regs[data[o + 1]] = ("int", struct.unpack_from("<h", data, o + 2)[0] << 16)
        elif op in (0x01, 0x04, 0x07):
            regs[data[o + 1] & 0xF] = regs.get(data[o + 1] >> 4)
        elif op in (0x02, 0x05, 0x08):
            regs[data[o + 1]] = regs.get(struct.unpack_from("<H", data, o + 2)[0])
        elif op == 0x22:
            regs[data[o + 1] & 0xF] = ("new", dex.type_name(
                struct.unpack_from("<H", data, o + 2)[0]))
        elif 0x60 <= op <= 0x66:  # sget* : le champ statique `Companion` d'un widget
            cls, field = dex.field_ref(struct.unpack_from("<H", data, o + 2)[0])
            regs[data[o + 1]] = ("sfield", cls, field)
        elif op == 0x23:  # new-array
            size = regs.get(data[o + 1] >> 4)
            count = size[1] if size and size[0] == "int" else 0
            array: list = [None] * max(0, count)
            arrays.append(array)
            regs[data[o + 1] & 0xF] = ("arr", array)
        elif 0x4B <= op <= 0x51:  # aput*
            src, arr, idx = regs.get(data[o + 1]), regs.get(data[o + 2]), regs.get(data[o + 3])
            if arr and arr[0] == "arr" and idx and idx[0] == "int" and 0 <= idx[1] < len(arr[1]):
                arr[1][idx[1]] = src
        elif op == 0x70:  # invoke-direct : construction d'un en-tête de famille
            registers = OPTIONS._regs_35c(data, o)
            _cls, method_name = dex.method_ref(struct.unpack_from("<H", data, o + 2)[0])
            if method_name == "<init>" and registers:
                args = [regs.get(r) for r in registers[1:]]
                regs[registers[0]] = ("obj", args)

    if not arrays:
        raise SystemExit("Le registre ne construit aucun tableau : le format a changé.")
    flat = max(arrays, key=len)
    entries: list[tuple] = []
    for slot in flat:
        if slot is None:
            entries.append(("unknown",))
        elif slot[0] == "obj":
            args = slot[1]
            label = args[0][1] if len(args) > 0 and args[0] and args[0][0] == "int" else None
            hidden = bool(args[1][1]) if len(args) > 1 and args[1] and args[1][0] == "int" else False
            entries.append(("family", label, hidden))
        elif slot[0] == "sfield":
            entries.append(("widget", slot[1]))
        else:
            entries.append(("unknown",))
    return entries


# --------------------------------------------------------------------------
# 2. Les Companions : titre, description, Pro
# --------------------------------------------------------------------------

def read_companions(dexes: list[Dex], res_by_id: dict[int, str]) -> dict[str, dict]:
    """{descripteur de la classe widget: {title, description, pro, ctor}}.

    Le `Companion` d'un widget appelle `super(titleRes, descRes, …)` dans son `<init>`
    sans argument. C'est le seul appel de constructeur qu'il fait."""
    out: dict[str, dict] = {}
    for dex in dexes:
        for class_name, _parent, cdata_off in dex.class_defs():
            if not (class_name.startswith(WIDGET_PKG) and class_name.endswith("$Companion;")):
                continue
            owner = class_name[: -len("$Companion;")] + ";"
            for _method_idx, method_name, code_off in dex.methods(cdata_off):
                if method_name != "<init>" or code_off == 0:
                    continue
                calls: list = []
                simulate(dex, code_off, lambda cls, mi, args: calls.append((cls, mi, args)))
                if not calls:
                    continue
                cls, method_idx, args = calls[0]
                shorty = proto_shorty(dex, method_idx)
                params = shorty[1:]
                title = args[0][1] if len(args) > 0 and args[0] and args[0][0] == "int" else None
                desc = args[1][1] if len(args) > 1 and args[1] and args[1][0] == "int" else None
                third = args[2][1] if len(args) > 2 and args[2] and args[2][0] == "int" else None
                # La surcharge à quatre arguments passe un `String[]` : ce sont les
                # valeurs que la description substitue à ses `%s` (un lien, en
                # pratique). Sans elles, le texte s'afficherait « … sur %s ».
                urls: list[str] = []
                if len(args) > 3 and args[3] and args[3][0] == "arr":
                    for cell in args[3][1]:
                        if cell and cell[0] == "str":
                            urls.append(cell[1])
                if third is None:
                    pro = None
                elif len(params) > 2 and params[2] == "Z":
                    pro = bool(third)  # surcharge à booléen explicite
                else:
                    pro = (third & FREE_FLAG_BIT) == 0  # `flags & 4` armé = gratuit
                out[owner] = {
                    "title": res_by_id.get(title),
                    "description": res_by_id.get(desc),
                    "pro": pro,
                    "urls": urls,
                    "impl": class_short(cls),
                    "shorty": shorty,
                }
                break
    return out


# --------------------------------------------------------------------------
# 3. Service rendu à `extract-widget-labels.py`
# --------------------------------------------------------------------------

def registry_titles(apk_dir: Path) -> dict[str, str]:
    """{nom court du widget: clé de ressource de son titre}, lue dans le bytecode.

    `extract-widget-labels.py` devine la clé du libellé par convention de nommage
    (`WAltitude` -> `wAltitudeTitle`). Six widgets n'obéissent pas à la convention et
    y restaient sans nom. Le registre, lui, ne devine pas : le `<init>` du `Companion`
    **passe** la ressource du titre à son constructeur. C'est cette lecture qu'on
    expose ici, pour que le script des libellés s'en serve en dernier recours.

    Restreint aux widgets **du tableau du registre**, c'est-à-dire à ceux que l'écran
    d'ajout propose. La restriction n'est pas cosmétique : `WProFallback` possède un
    `Companion` dont le titre est `wProLabel` — le texte du badge, « Pro », et non un
    nom de widget. XCTrack le fabrique lui-même à la lecture d'un fichier et ne le
    propose jamais à l'ajout (§ 3.3 du relevé d'écran) ; il n'est donc pas au registre,
    et ce filtre l'écarte sans avoir à le nommer.
    """
    table = ResourceTable(apk_dir / "resources.arsc")
    res_by_id: dict[int, str] = {}
    for off in table.type_chunks:
        type_id, _locale, entries = table._parse_type_chunk(off)
        if type_id != table.string_type_id:
            continue
        for index, (key_index, _value) in entries.items():
            res_by_id[0x7F000000 | (type_id << 16) | index] = table.key_pool["strings"][key_index]

    family_res_ids = {
        rid for rid, name in res_by_id.items() if name.startswith(("wg", "debug_wg"))
    }
    dexes = [Dex(path) for path in sorted(apk_dir.glob("classes*.dex"))]
    dex, code_off, _where = find_registry(dexes, family_res_ids)
    registered = {
        class_short(slot[1]) for slot in read_registry_array(dex, code_off) if slot[0] == "widget"
    }
    companions = read_companions(dexes, res_by_id)
    return {
        class_short(descriptor): info["title"]
        for descriptor, info in companions.items()
        if info["title"] is not None and class_short(descriptor) in registered
    }


# --------------------------------------------------------------------------
# Programme principal
# --------------------------------------------------------------------------

def resolve_apk_dir(argv: list[str]) -> Path:
    if len(argv) > 1:
        return Path(argv[1])
    candidates = sorted(PROJECT_ROOT.parent.glob("XCTrack-*"))
    candidates = [c for c in candidates if c.is_dir()]
    if not candidates:
        print("Aucun dossier XCTrack-* trouvé à côté de xcfg-editor/. "
              "Précise le chemin en argument.", file=sys.stderr)
        sys.exit(1)
    return candidates[-1]


def main() -> None:
    apk_dir = resolve_apk_dir(sys.argv)
    arsc_path = apk_dir / "resources.arsc"
    dex_paths = sorted(apk_dir.glob("classes*.dex"))
    if not arsc_path.exists():
        print(f"resources.arsc introuvable dans {apk_dir}", file=sys.stderr)
        sys.exit(1)
    if not dex_paths:
        print(f"Aucun classes*.dex trouvé dans {apk_dir}", file=sys.stderr)
        sys.exit(1)

    print(f"Lecture de {arsc_path} ({arsc_path.stat().st_size:,} octets)")
    table = ResourceTable(arsc_path)
    by_locale = table.string_entries_by_locale()

    res_by_id: dict[int, str] = {}
    for off in table.type_chunks:
        type_id, _locale, entries = table._parse_type_chunk(off)
        if type_id != table.string_type_id:
            continue
        for index, (key_index, _value) in entries.items():
            res_by_id[0x7F000000 | (type_id << 16) | index] = table.key_pool["strings"][key_index]
    id_by_res = {name: rid for rid, name in res_by_id.items()}

    def translations(res_key: str) -> dict[str, str]:
        return {
            ("en" if locale == "" else locale): entries[res_key]
            for locale, entries in by_locale.items()
            if res_key in entries
        }

    family_res_ids = {rid for name, rid in id_by_res.items() if name.startswith(("wg", "debug_wg"))}
    print(f"Ressources de famille candidates : {len(family_res_ids)}")

    print(f"Lecture de {len(dex_paths)} fichier(s) .dex : {[p.name for p in dex_paths]}")
    dexes = [Dex(p) for p in dex_paths]

    dex, code_off, where = find_registry(dexes, family_res_ids)
    print(f"Registre trouvé : {where}")
    entries = read_registry_array(dex, code_off)
    print(f"Tableau du registre : {len(entries)} entrées")

    companions = read_companions(dexes, res_by_id)
    print(f"Companions de widgets lus : {len(companions)}")

    # -- assemblage ---------------------------------------------------------
    families: list[dict] = []
    widgets: dict[str, dict] = {}
    current: dict | None = None
    rank = 0
    orphans: list[str] = []
    for slot in entries:
        if slot[0] == "family":
            key = res_by_id.get(slot[1])
            if key is None:
                raise SystemExit(f"En-tête de famille sans ressource résoluble : {slot!r}")
            current = {"id": key, "hidden": bool(slot[2]), "widgets": []}
            families.append(current)
            rank = 0
        elif slot[0] == "widget":
            descriptor = slot[1]
            short_name = class_short(descriptor)
            if current is None:
                orphans.append(short_name)
                continue
            info = companions.get(descriptor, {})
            widgets[short_name] = {
                "family": current["id"],
                "order": rank,
                "pro": bool(info.get("pro")),
                "title": info.get("title"),
                "description": info.get("description"),
            }
            if info.get("urls"):
                widgets[short_name]["descriptionArgs"] = info["urls"]
            current["widgets"].append(short_name)
            rank += 1
        else:
            orphans.append("(entrée non résolue)")

    # -- pool de chaînes ----------------------------------------------------
    # Un même texte sert parfois deux fois (les widgets de debug réemploient leur
    # titre comme description) : on le stocke une fois, sous sa clé de ressource.
    strings: dict[str, dict[str, str]] = {}
    for family in families:
        strings[family["id"]] = translations(family["id"])
    for entry in widgets.values():
        for key in (entry["title"], entry["description"]):
            if key is not None and key not in strings:
                strings[key] = translations(key)
    strings = {key: value for key, value in strings.items() if value}

    described = [n for n, e in widgets.items() if e["description"] and strings.get(e["description"])]
    undescribed = sorted(n for n in widgets if n not in described)
    same_as_title = sorted(n for n, e in widgets.items() if e["description"] == e["title"])
    languages = sorted({lang for texts in strings.values() for lang in texts})
    visible = [f for f in families if not f["hidden"]]
    visible_widgets = [n for f in visible for n in f["widgets"]]

    # La part du catalogue qui ne dépend d'aucune langue : elle est recopiée telle
    # quelle dans chacun des fichiers de langue (voir la partition ci-dessous).
    common = {
        "meta": {
            "source": apk_dir.name,
            "generatedBy": "tools/extract-widget-catalog.py",
            "registry": where,
            "languages": languages,
            "familyCount": len(families),
            "visibleFamilyCount": len(visible),
            "widgetCount": len(widgets),
            "visibleWidgetCount": len(visible_widgets),
            "proCount": sum(1 for e in widgets.values() if e["pro"]),
            "describedCount": len(described),
            "descriptionSameAsTitleCount": len(same_as_title),
            "undescribed": undescribed,
        },
        "families": [
            {"id": f["id"], "hidden": f["hidden"], "widgets": f["widgets"]} for f in families
        ],
        "widgets": dict(sorted(widgets.items())),
    }

    # -- partition par langue -----------------------------------------------
    # Un fichier autonome par langue, au lieu d'un catalogue unique portant les 33.
    # L'éditeur n'en affiche jamais qu'une : lui en transférer 33 coûtait 204 Ko
    # minifiés là où le français en demande 24.
    #
    # Chaque fichier porte **sa** langue ET l'anglais **là où sa langue manque**.
    # Ce n'est pas décoratif : sur les 172 ressources du catalogue, l'anglais est la
    # seule langue complète — `hr` n'en traduit que 16. Le repli doit donc être
    # disponible à chaque chargement. Le fusionner à la génération coûte, pour une
    # langue presque complète comme le français, 12 textes anglais soit ~1 Ko ; le
    # charger à part coûterait un second fichier de ~23 Ko. Le repli est donc résolu
    # ici, une fois pour toutes, plutôt qu'à l'exécution.
    #
    # Le texte anglais emprunté est indiscernable d'une traduction, à dessein :
    # `catalogText()` rendait déjà `texts[langue] ?? texts.en`, la partition rend
    # exactement le même texte. Seuls les compteurs `nativeStringCount` /
    # `fallbackStringCount` gardent trace de l'emprunt, pour l'audit.
    out_dir = PROJECT_ROOT / "src" / "catalog" / "widgetCatalog"
    out_dir.mkdir(parents=True, exist_ok=True)
    for stale in out_dir.glob("*.json"):
        stale.unlink()  # une langue retirée de l'APK ne doit pas survivre au fichier
    # Le catalogue monolithique d'avant la partition. Supprimé s'il traîne encore :
    # 247 Ko qui ne sont plus lus par personne, et qui masqueraient la partition à un
    # lecteur pressé.
    legacy = PROJECT_ROOT / "src" / "catalog" / "widgetCatalog.json"
    if legacy.exists():
        legacy.unlink()

    written: list[tuple[str, int, int, int]] = []
    for language in languages:
        texts: dict[str, str] = {}
        borrowed = 0
        for key, by_language in strings.items():
            own = by_language.get(language)
            if own is not None:
                texts[key] = own
            elif (fallback := by_language.get(FALLBACK_LANGUAGE)) is not None:
                texts[key] = fallback
                borrowed += 1
        payload = {
            "language": language,
            "fallbackLanguage": FALLBACK_LANGUAGE,
            "nativeStringCount": len(texts) - borrowed,
            "fallbackStringCount": borrowed,
            **common,
            "strings": texts,
        }
        path = out_dir / f"{language}.json"
        path.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        written.append((language, len(texts) - borrowed, borrowed, path.stat().st_size))

    # La liste des langues disponibles doit être connue **avant** de choisir quel
    # fichier charger : elle ne peut pas vivre dans les fichiers de langue eux-mêmes.
    # Elle est donc émise à part, et reste écrite par ce script comme tout le reste.
    index_path = PROJECT_ROOT / "src" / "catalog" / "widgetCatalogLanguages.json"
    index_path.write_text(
        json.dumps(languages, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    # -- rapport ------------------------------------------------------------
    print()
    total_bytes = sum(size for _l, _n, _b, size in written)
    print(f"Catalogue écrit : {out_dir}/ — {len(written)} fichiers de langue, "
          f"{total_bytes:,} octets au total")
    print(f"Liste des langues : {index_path} ({index_path.stat().st_size:,} octets)")
    print(f"Familles : {len(families)} dont {len(visible)} visibles")
    for family in families:
        label = strings.get(family["id"], {})
        marker = " (masquée)" if family["hidden"] else ""
        print(f"  {family['id']:<16} {len(family['widgets']):>2} widgets{marker} "
              f"— en={label.get('en')!r} fr={label.get('fr')!r}")
    print(f"Widgets au registre : {len(widgets)} dont {len(visible_widgets)} visibles")
    print(f"Widgets Pro : {common['meta']['proCount']}")
    print(f"Avec description : {len(described)} / {len(widgets)} "
          f"(dont {len(same_as_title)} identiques au titre)")
    if undescribed:
        print(f"SANS description ({len(undescribed)}) : {', '.join(undescribed)}")
    print(f"Langues : {len(languages)} -> {languages}")

    # Couverture par langue, pour les seules descriptions des widgets visibles :
    # c'est le chiffre qui compte pour la palette.
    print("\nCouverture des descriptions, par langue (widgets visibles) :")
    per_language = {lang: 0 for lang in languages}
    for name in visible_widgets:
        key = widgets[name]["description"]
        for lang in strings.get(key, {}):
            per_language[lang] += 1
    total = len(visible_widgets)
    complete = [l for l, n in per_language.items() if n == total]
    partial = {l: n for l, n in per_language.items() if n < total}
    print(f"  complètes ({len(complete)}/{len(languages)}) : {complete}")
    if partial:
        print(f"  partielles : " + ", ".join(f"{l} {n}/{total}" for l, n in sorted(partial.items())))

    # Taille de chaque fichier de langue, et part empruntée à l'anglais. C'est le
    # chiffre qui compte pour le transfert : un pilote n'en charge jamais qu'un.
    print("\nFichiers de langue (octets indentés / textes propres / empruntés à l'anglais) :")
    for language, native, borrowed, size in written:
        print(f"  {language:<6} {size:>8,}  {native:>4} propres  {borrowed:>4} empruntés")

    # Confrontation avec la liste des classes de widgets réellement présentes.
    classes = discover_widget_classes(dex_paths)
    absent = sorted(set(classes["w"]) - set(widgets))
    if absent:
        print(f"\nClasses de widget/w présentes dans l'APK mais absentes du registre "
              f"({len(absent)}) : {', '.join(absent)}")
    if orphans:
        print(f"Entrées du registre sans famille ({len(orphans)}) : {orphans}")


if __name__ == "__main__":
    main()
