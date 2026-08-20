#!/usr/bin/env python3
"""Extrait le catalogue des options de widgets XCTrack depuis un APK décompressé.

Régénère `src/catalog/widgetOptions/` : pour chaque type de widget, la liste de ses
options réglables, avec la clé du fichier `.xcfg`, le libellé traduit, les valeurs
permises et le texte d'aide. Aucune dépendance tierce.

**Deux sortes de fichiers**, et c'est tout le sujet du découpage (voir « La partition
par langue » plus bas) : `base.json` porte ce qui ne dépend d'aucune langue — les
options, les widgets, les non-résolues — et `<langue>.json` ne porte que les textes
d'une langue. La liste des langues disponibles sort à part, dans
`src/catalog/widgetOptionsLanguages.json`.

Usage :
    python3 tools/extract-widget-options.py [chemin_du_dossier_apk_decompile]

Le parseur de `resources.arsc` n'est pas réécrit ici : il est importé de
`tools/extract-widget-labels.py`, qui l'a établi pour les libellés de widgets.

## La méthode, et pourquoi celle-là

L'appariement « clé de ressource ↔ clé de configuration » ne peut PAS se déduire du
nom des ressources. La convention supposée — préfixe `widgetSettings` puis nom de
widget abrégé puis nom d'option — est fausse en général : `widgetSettingsRotation`,
`widgetSettingsShowTitle` ou `widgetSettingsNavigationLabel` sont partagées par
plusieurs widgets, et `_theme` porte deux libellés différents (`wsThemeDisplayTheme`
pour un widget ordinaire, `wsMapOverlayTheme` pour un widget cartographique). Les
noms de ressources sont thématiques, pas hiérarchiques.

L'appariement se lit en revanche **directement dans le bytecode**. XCTrack construit
ses réglages dans le constructeur du widget, sous la forme

    new WSettingsCheckbox("showHeading", R.string.widgetSettingsCompassShowHeadingArrow, 0, false)
    new WSettingsEnum("windStyle", R.string.widgetSettingsCompassWindStyle,
                      R.string.widgetSettingsCompassWindStyleHelp,
                      new int[]{ …None, …Arrow, …Arc, …Sock }, WindStyle.NONE, 64)

Le littéral de chaîne (la clé du `.xcfg`) et l'identifiant de ressource (le libellé)
sont donc **arguments du même appel de constructeur**. Il suffit de simuler les
registres du flux d'instructions pour reconstituer chaque liste d'arguments : c'est un
appariement lu, pas deviné.

## Les passes

1. `resources.arsc` : identifiant numérique de ressource -> nom de clé, et
   nom de clé -> {langue: texte}.
2. `classes*.dex` : hiérarchie des classes, et table des énumérations
   (`<clinit>` d'une classe enum : `const-string "NONE"` … `sput C.a`), qui donne le
   nom des constantes dans l'ordre des ordinaux — c'est-à-dire les valeurs telles
   qu'elles sont écrites dans le `.xcfg`.
3. Simulation de registres sur toutes les méthodes de toutes les classes, pour
   recenser les appels `invoke-direct <T>.<init>`, avec leurs arguments résolus.
4. Reconnaissance des classes de réglage. On repère d'abord celles qui sont
   manifestement des réglages (un constructeur portant à la fois une chaîne et une
   ressource `widgetSettings*`), on remonte leur ancêtre commun — c'est la classe
   racine des réglages, obfusquée en `sy9` dans cette version — et on retient
   **toutes ses descendantes**. Chaque construction de l'une d'elles, par une classe
   qui n'en est pas une, est une option.
5. Trois recours quand le constructeur ne porte pas d'identifiant de ressource,
   parce que la classe de réglage résout son libellé elle-même :
   - la ressource référencée par ce constructeur précis (`mt9` pour `rotation`) ;
   - la table de saut de la classe, décodée, quand une même classe sert plusieurs
     options et choisit son libellé par un `switch` sur un code passé en argument
     (`at9` couvre `postponedFloorLimit`, `postponedDisplayDistance`, `vertical_step`) ;
   - le suivi de branche : certaines classes choisissent l'option elle-même par un
     `switch` en tête de constructeur (`qs9(0)` déclare `_units`, `qs9(1)` déclare
     `time_format`) ; on n'exécute alors que la branche prise.
6. Attribution : une option appartient au widget qui la construit, à ses sous-classes
   (chaîne d'héritage) et aux widgets qui construisent la classe porteuse
   (composition — `WThermalAssistant` instancie le porteur des réglages `nav_*`).
7. Confrontation au corpus `.xcfg` : on compte les couples (widget, clé) retrouvés.

## Ce que la méthode ne donne pas

Les dépendances entre options (grisage, apparition, indentation) ne sont décrites
nulle part dans les ressources : elles sont codées dans l'application. Voir
`docs/reference/edition-native-exploration.md` § 4.4. Ce catalogue ne les invente pas.

De même, une clé composite (`rotation = {value, showCompass}`) produit plusieurs
contrôles ; le catalogue le signale et livre tous les libellés attachés à la clé,
mais **n'affirme pas** quel libellé va à quel sous-champ : le bytecode ne le dit pas
de façon exploitable. Une option dont le libellé n'a pas pu être relié est listée
dans `unresolved` plutôt que devinée.

## La partition par langue

Le catalogue d'un seul tenant pesait 380 Ko minifiés, dont **326 Ko de traductions**
— 78 % du poids — qu'un pilote donné ne lira jamais : il n'affiche qu'une langue à la
fois. Il est donc coupé en deux sortes de fichiers.

`base.json` — 65 Ko compacts — porte les 225 descriptions d'options, les 84 listes
ordonnées de widgets, les options non résolues et les clés du corpus non appariées.
Rien de tout cela ne dépend de la langue, et **rien n'en est recopié** dans les
fichiers de langue : c'est l'inverse de ce que fait `extract-widget-catalog.py`, dont
la part invariante (5 Ko) était assez petite pour être dupliquée 33 fois en échange
d'une requête au lieu de deux. Ici la part invariante est treize fois plus grosse que
la part traduite : la dupliquer coûterait 2,2 Mo sur le serveur et ferait retélécharger
65 Ko à chaque changement de langue. Elle reste donc en un seul morceau, que la palette
d'ajout (`src/ui/widgetPalette.ts`) charge d'ailleurs de toute façon, pour sa liste des
84 types.

`<langue>.json` ne porte que `strings` : clé de ressource -> texte, dans une seule
langue, **repli anglais fusionné** là où la langue ne traduit pas. Le repli n'est pas
décoratif : sur les 248 ressources du catalogue, l'anglais est la seule langue
complète — `hi` n'en traduit que 4, `hr` 40, `da` 45. Le résoudre à la génération
plutôt qu'à l'exécution évite de charger un second fichier de 20 Ko pour retrouver les
textes manquants, et rend exactement ce que rendait l'ancien
`texts[langue] ?? texts.en`. Seuls `nativeStringCount` et `fallbackStringCount` gardent
trace de l'emprunt, pour l'audit.
"""
from __future__ import annotations

import importlib.util
import json
import re
import struct
import sys
from collections import Counter, defaultdict
from pathlib import Path

# L'import de `extract-widget-labels.py` par chemin laisserait un `tools/__pycache__/`
# dans le dépôt : on s'en passe, le script tourne une fois par version de XCTrack.
sys.dont_write_bytecode = True

PROJECT_ROOT = Path(__file__).resolve().parents[1]

# Langue de repli du catalogue : celle des ressources par défaut de l'APK, et la seule
# des 34 qui traduise les 248 ressources. Voir la partition par langue, en tête.
FALLBACK_LANGUAGE = "en"

# --------------------------------------------------------------------------
# Réutilisation du parseur ARSC déjà écrit pour les libellés de widgets.
# Le nom de fichier contient des tirets : import par chemin, pas par nom de module.
# --------------------------------------------------------------------------

def _load_labels_module():
    path = PROJECT_ROOT / "tools" / "extract-widget-labels.py"
    spec = importlib.util.spec_from_file_location("extract_widget_labels", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


LABELS = _load_labels_module()
ResourceTable = LABELS.ResourceTable
discover_widget_classes = LABELS.discover_widget_classes


# --------------------------------------------------------------------------
# Lecteur .dex
# --------------------------------------------------------------------------

def uleb128(data: bytes, off: int) -> tuple[int, int]:
    result = 0
    shift = 0
    while True:
        b = data[off]
        off += 1
        result |= (b & 0x7F) << shift
        if not (b & 0x80):
            return result, off
        shift += 7


def _instruction_sizes() -> list[int]:
    """Taille de chaque instruction Dalvik, en unités de 16 bits, par opcode.

    Table établie d'après la documentation du format d'instructions Dalvik
    (`docs/instruction-formats` d'AOSP) ; les opcodes inutilisés valent 1.
    """
    s = [1] * 256

    def setr(a, b, n):
        for i in range(a, b + 1):
            s[i] = n

    s[0x02] = 2; s[0x03] = 3; s[0x05] = 2; s[0x06] = 3; s[0x08] = 2; s[0x09] = 3
    s[0x13] = 2; s[0x14] = 3; s[0x15] = 2; s[0x16] = 2; s[0x17] = 3; s[0x18] = 5
    s[0x19] = 2; s[0x1A] = 2; s[0x1B] = 3; s[0x1C] = 2; s[0x1F] = 2; s[0x20] = 2
    s[0x22] = 2; s[0x23] = 2; s[0x24] = 3; s[0x25] = 3; s[0x26] = 3
    s[0x29] = 2; s[0x2A] = 3; s[0x2B] = 3; s[0x2C] = 3
    setr(0x2D, 0x31, 2); setr(0x32, 0x3D, 2)
    setr(0x44, 0x51, 2); setr(0x52, 0x6D, 2); setr(0x6E, 0x72, 3); setr(0x74, 0x78, 3)
    setr(0x90, 0xAF, 2); setr(0xD0, 0xE2, 2)
    s[0xFA] = 4; s[0xFB] = 4; s[0xFC] = 3; s[0xFD] = 3; s[0xFE] = 2; s[0xFF] = 2
    return s


INSN_SIZE = _instruction_sizes()


class Dex:
    """Lecture des tables d'un .dex : chaînes, types, champs, méthodes, classes."""

    def __init__(self, path: Path):
        self.path = path
        self.data = data = path.read_bytes()
        assert data[:4] == b"dex\n", f"{path} n'est pas un fichier .dex"
        (self.string_ids_size, self.string_ids_off,
         self.type_ids_size, self.type_ids_off,
         _proto_size, _proto_off,
         self.field_ids_size, self.field_ids_off,
         self.method_ids_size, self.method_ids_off,
         self.class_defs_size, self.class_defs_off) = struct.unpack_from("<IIIIIIIIIIII", data, 56)
        self._strings: dict[int, str] = {}

    def string(self, idx: int) -> str:
        s = self._strings.get(idx)
        if s is None:
            off = struct.unpack_from("<I", self.data, self.string_ids_off + idx * 4)[0]
            _char_count, off = uleb128(self.data, off)
            end = self.data.index(b"\x00", off)
            s = self.data[off:end].decode("utf-8", errors="replace")
            self._strings[idx] = s
        return s

    def type_name(self, idx: int) -> str:
        return self.string(struct.unpack_from("<I", self.data, self.type_ids_off + idx * 4)[0])

    def field_ref(self, idx: int) -> tuple[str, str]:
        cls_idx, _type_idx, name_idx = struct.unpack_from("<HHI", self.data,
                                                          self.field_ids_off + idx * 8)
        return self.type_name(cls_idx), self.string(name_idx)

    def method_ref(self, idx: int) -> tuple[str, str]:
        cls_idx, _proto_idx, name_idx = struct.unpack_from("<HHI", self.data,
                                                           self.method_ids_off + idx * 8)
        return self.type_name(cls_idx), self.string(name_idx)

    def class_defs(self):
        """Rend (descripteur, descripteur_du_parent | None, offset_class_data)."""
        for i in range(self.class_defs_size):
            base = self.class_defs_off + i * 32
            cls_idx, _acc, sup_idx, _if, _src, _anno, cdata_off, _sv = struct.unpack_from(
                "<IIIIIIII", self.data, base)
            parent = self.type_name(sup_idx) if sup_idx != 0xFFFFFFFF else None
            yield self.type_name(cls_idx), parent, cdata_off

    def methods(self, class_data_off: int):
        """Rend (index, nom_de_méthode, offset_du_code) pour chaque méthode d'une classe."""
        if class_data_off == 0:
            return
        data = self.data
        off = class_data_off
        static_fields, off = uleb128(data, off)
        instance_fields, off = uleb128(data, off)
        direct_methods, off = uleb128(data, off)
        virtual_methods, off = uleb128(data, off)
        for _ in range(static_fields + instance_fields):
            _d, off = uleb128(data, off)
            _a, off = uleb128(data, off)
        for count in (direct_methods, virtual_methods):
            idx = 0
            for _ in range(count):
                diff, off = uleb128(data, off)
                idx += diff
                _acc, off = uleb128(data, off)
                code_off, off = uleb128(data, off)
                yield idx, self.method_ref(idx)[1], code_off


# --------------------------------------------------------------------------
# Simulation de registres
# --------------------------------------------------------------------------
#
# Les valeurs manipulées sont des n-uplets étiquetés :
#   ("int", v) | ("str", s) | ("sfield", classe, nom) | ("arr", [valeurs])
#   ("new", type)
# Une valeur inconnue (venant d'un paramètre, d'un champ d'instance, d'un appel)
# vaut None : on ne cherche pas à la deviner.

def _regs_35c(data: bytes, o: int) -> list[int]:
    count = data[o + 1] >> 4
    g = data[o + 1] & 0xF
    w = struct.unpack_from("<H", data, o + 4)[0]
    return [w & 0xF, (w >> 4) & 0xF, (w >> 8) & 0xF, (w >> 12) & 0xF, g][:count]


def _regs_3rc(data: bytes, o: int) -> list[int]:
    count = data[o + 1]
    first = struct.unpack_from("<H", data, o + 4)[0]
    return list(range(first, first + count))


def _pseudo_insn_size(data: bytes, o: int) -> int:
    """Taille des pseudo-instructions (tables de switch, données de tableau)."""
    ident = data[o + 1]
    if ident == 0x01:  # packed-switch-payload
        return struct.unpack_from("<H", data, o + 2)[0] * 2 + 4
    if ident == 0x02:  # sparse-switch-payload
        return struct.unpack_from("<H", data, o + 2)[0] * 4 + 2
    if ident == 0x03:  # fill-array-data-payload
        width = struct.unpack_from("<H", data, o + 2)[0]
        count = struct.unpack_from("<I", data, o + 4)[0]
        return (count * width + 1) // 2 + 4
    return 1


def walk(dex: Dex, code_off: int):
    """Parcourt un code_item et rend (pc, opcode, offset_octet) instruction par
    instruction. Sert de socle commun à la simulation et au relevé des ressources."""
    if code_off == 0:
        return
    data = dex.data
    insns_size = struct.unpack_from("<I", data, code_off + 12)[0]
    base = code_off + 16
    pc = 0
    while pc < insns_size:
        o = base + pc * 2
        op = data[o]
        if op == 0x00:
            pc += _pseudo_insn_size(data, o)
            continue
        yield pc, op, o
        pc += INSN_SIZE[op]


def simulate(dex: Dex, code_off: int, on_new_instance, start_pc: int = 0,
             stop_at_return: bool = False):
    """Simule les registres d'une méthode ; appelle
    `on_new_instance(type, index_de_méthode, args)` sur chaque
    `invoke-direct <T>.<init>`. `args` exclut le receveur."""
    data = dex.data
    regs: dict[int, object] = {}
    pending = None
    for _pc, op, o in walk(dex, code_off):
        if _pc < start_pc:
            continue  # branche non prise : on ne l'exécute pas
        if stop_at_return and 0x0E <= op <= 0x11:
            return
        if op == 0x12:
            v = data[o + 1] >> 4
            regs[data[o + 1] & 0xF] = ("int", v if v < 8 else v - 16)
        elif op == 0x13:
            regs[data[o + 1]] = ("int", struct.unpack_from("<h", data, o + 2)[0])
        elif op == 0x14:
            regs[data[o + 1]] = ("int", struct.unpack_from("<i", data, o + 2)[0])
        elif op == 0x15:
            regs[data[o + 1]] = ("int", struct.unpack_from("<h", data, o + 2)[0] << 16)
        elif op == 0x1A:
            regs[data[o + 1]] = ("str", dex.string(struct.unpack_from("<H", data, o + 2)[0]))
        elif op == 0x1B:
            regs[data[o + 1]] = ("str", dex.string(struct.unpack_from("<I", data, o + 2)[0]))
        elif op in (0x01, 0x04, 0x07):
            regs[data[o + 1] & 0xF] = regs.get(data[o + 1] >> 4)
        elif op in (0x02, 0x05, 0x08):
            regs[data[o + 1]] = regs.get(struct.unpack_from("<H", data, o + 2)[0])
        elif 0x60 <= op <= 0x66:  # sget*
            cls, name = dex.field_ref(struct.unpack_from("<H", data, o + 2)[0])
            regs[data[o + 1]] = ("sfield", cls, name)
        elif op == 0x22:  # new-instance
            regs[data[o + 1] & 0xF] = ("new", dex.type_name(struct.unpack_from("<H", data, o + 2)[0]))
        elif op == 0x23:  # new-array
            size = regs.get(data[o + 1] >> 4)
            n = size[1] if size and size[0] == "int" else 0
            regs[data[o + 1] & 0xF] = ("arr", [None] * max(0, min(n, 64)))
        elif op in (0x24, 0x25):  # filled-new-array
            rs = _regs_35c(data, o) if op == 0x24 else _regs_3rc(data, o)
            pending = ("arr", [regs.get(r) for r in rs])
        elif 0x4B <= op <= 0x51:  # aput*
            src, arr, idx = regs.get(data[o + 1]), regs.get(data[o + 2]), regs.get(data[o + 3])
            if arr and arr[0] == "arr" and idx and idx[0] == "int" and 0 <= idx[1] < len(arr[1]):
                arr[1][idx[1]] = src
        elif op in (0x0A, 0x0B, 0x0C):  # move-result*
            regs[data[o + 1]] = pending
            pending = None
        elif 0x6E <= op <= 0x78 and op != 0x73:
            rs = _regs_35c(data, o) if op <= 0x72 else _regs_3rc(data, o)
            method_idx = struct.unpack_from("<H", data, o + 2)[0]
            cls, name = dex.method_ref(method_idx)
            if name == "<init>" and op in (0x70, 0x76):
                on_new_instance(cls, method_idx, [regs.get(r) for r in rs[1:]])
            pending = None


# --------------------------------------------------------------------------
# Corpus : la vérité terrain
# --------------------------------------------------------------------------

UNIVERSAL_GEOMETRY = {"CLASS", "X1", "Y1", "X2", "Y2"}


def read_corpus(corpus_dir: Path) -> dict[str, dict[str, object]]:
    """Rend {classe de widget: {clé: valeur observée}} sur les fichiers .xcfg.

    C'est la vérité terrain : une option qui ne retombe sur aucune clé réelle est
    suspecte, et la *valeur* observée renseigne sur la forme du contrôle (booléen,
    entier, chaîne, objet JSON pour une clé composite)."""
    per_widget: dict[str, dict[str, object]] = defaultdict(dict)

    def visit(node):
        if isinstance(node, dict):
            klass = node.get("CLASS")
            if isinstance(klass, str) and ".XCTrack.widget." in klass:
                short = klass.rsplit(".", 1)[-1]
                for k, v in node.items():
                    if k not in UNIVERSAL_GEOMETRY:
                        per_widget[short].setdefault(k, v)
            for v in node.values():
                visit(v)
        elif isinstance(node, list):
            for v in node:
                visit(v)

    for path in sorted(corpus_dir.glob("*.xcfg")):
        try:
            visit(json.loads(path.read_text(encoding="utf-8")))
        except (ValueError, UnicodeDecodeError):
            continue

    return dict(per_widget)


# --------------------------------------------------------------------------
# Extraction
# --------------------------------------------------------------------------
# Extraction
# --------------------------------------------------------------------------

RES_PREFIXES = ("widgetSettings", "ws")
# Une ressource de libellé d'option ne porte pas toujours le préfixe `widgetSettings` :
# certaines options sont libellées par une ressource propre au widget
# (`wThermalAssistantTrackInterval` pour `interval`,
# `wAirspaceProximityPostponeFloorLimit` pour `postponedFloorLimit`).
LABEL_RE = re.compile(r"^(widgetSettings|ws[A-Z]|w[A-Z]|debug_w)")
# `…Help`, mais aussi `…Help2` : XCTrack numérote ses textes d'aide révisés.
HELP_RE = re.compile(r"Help\d*$")
# Un sélecteur de couleur se reconnaît à son libellé : « Color of the tracklog »,
# « Border color »… (cf. edition-native-exploration.md § 4.6).
COLOR_RE = re.compile(r"(?i)\bcolou?r\b")
CONFIG_KEY_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]{1,49}$")
ENUM_NAME_RE = re.compile(r"^[A-Z][A-Z0-9_]*$")
XCTRACK_PKG = "Lorg/xcontest/XCTrack/"
FRAMEWORK_PREFIXES = ("Ljava/", "Landroid/", "Lkotlin/", "Landroidx/")


def short(descriptor: str) -> str:
    """`Lorg/xcontest/XCTrack/widget/w/WCompass;` -> `WCompass` ; `Lgs9;` -> `gs9`."""
    return descriptor.strip("L;").rsplit("/", 1)[-1]


class Extractor:
    """Charge l'APK et le corpus, puis reconstitue les options depuis le bytecode."""

    def __init__(self, apk_dir: Path, corpus_dir: Path):
        self.apk_dir = apk_dir
        self.table = ResourceTable(apk_dir / "resources.arsc")
        self.by_locale = self.table.string_entries_by_locale()
        self.res_by_id = self._resource_ids()
        self.corpus = read_corpus(corpus_dir)
        self.corpus_keys = {k for v in self.corpus.values() for k in v}

        self.dexes = [Dex(p) for p in sorted(apk_dir.glob("classes*.dex"))]
        self.owner: dict[str, tuple[Dex, int]] = {}
        self.parent: dict[str, str | None] = {}
        self.method_code: dict[int, tuple[Dex, int]] = {}
        self.class_methods: dict[str, list[tuple[int, str, int]]] = {}
        for dex in self.dexes:
            for name, parent, cdata_off in dex.class_defs():
                self.owner[name] = (dex, cdata_off)
                self.parent[name] = parent
                methods = list(dex.methods(cdata_off))
                self.class_methods[name] = methods
                for method_idx, _name, code_off in methods:
                    if code_off:
                        self.method_code[(id(dex), method_idx)] = (dex, code_off)

        self.enums = self._enum_tables()
        self.constructions = self._collect_constructions()
        self.method_resources = self._method_resources()
        self.setting_classes = self._setting_classes()
        self.switch_tables = self._switch_tables()

    # -- ressources --------------------------------------------------------
    def _resource_ids(self) -> dict[int, str]:
        out = {}
        for off in self.table.type_chunks:
            type_id, _locale, entries = self.table._parse_type_chunk(off)
            if type_id != self.table.string_type_id:
                continue
            for index, (key_index, _value) in entries.items():
                out[0x7F000000 | (type_id << 16) | index] = self.table.key_pool["strings"][key_index]
        return out

    def translations(self, res_key: str) -> dict[str, str]:
        out = {}
        for locale, entries in self.by_locale.items():
            if res_key in entries:
                out["en" if locale == "" else locale] = entries[res_key]
        return out

    # -- énumérations ------------------------------------------------------
    def _enum_tables(self) -> dict[str, dict]:
        """{classe: {"order": [NOM, …], "fields": {champ: NOM}}}.

        Le `<clinit>` d'une enum construit ses constantes dans l'ordre des ordinaux :
        `new-instance C` / `const-string "NONE"` / `invoke Enum.<init>` / `sput C.a`.
        C'est cet ordre-là qui compte : c'est celui du tableau de libellés passé au
        constructeur du réglage, et le nom de la constante est exactement ce que le
        fichier `.xcfg` écrit comme valeur.
        """
        tables: dict[str, dict] = {}
        for name, methods in self.class_methods.items():
            dex, _cdata = self.owner[name]
            for _idx, method_name, code_off in methods:
                if method_name != "<clinit>" or code_off == 0:
                    continue
                order: list[str] = []
                fields: dict[str, str] = {}
                last_string = None
                last_built = None
                for _pc, op, o in walk(dex, code_off):
                    if op == 0x1A:
                        last_string = dex.string(struct.unpack_from("<H", dex.data, o + 2)[0])
                    elif op == 0x1B:
                        last_string = dex.string(struct.unpack_from("<I", dex.data, o + 2)[0])
                    elif op == 0x70:  # invoke-direct : construction de la constante
                        cls, method = dex.method_ref(struct.unpack_from("<H", dex.data, o + 2)[0])
                        if method == "<init>" and last_string and last_string not in order:
                            order.append(last_string)
                            last_built = last_string
                        last_string = None
                    elif 0x67 <= op <= 0x6D:  # sput* : le champ qui porte la constante
                        cls, field = dex.field_ref(struct.unpack_from("<H", dex.data, o + 2)[0])
                        if cls == name and last_built and last_built not in fields.values():
                            fields[field] = last_built
                            last_built = None
                if order and all(ENUM_NAME_RE.match(n) for n in order):
                    tables[name] = {"order": order, "fields": fields}
                break
        return tables

    # -- constructions -----------------------------------------------------
    def _collect_constructions(self) -> dict[str, list[tuple[str, int, list]]]:
        """{classe_appelante: [(type_construit, index_du_constructeur, arguments), …]}"""
        out: dict[str, list[tuple[str, int, list]]] = defaultdict(list)
        for name, methods in self.class_methods.items():
            dex, _cdata = self.owner[name]
            sink = out[name]

            def on_new(cls, method_idx, args, sink=sink, dex=dex):
                if not cls.startswith(FRAMEWORK_PREFIXES):
                    sink.append((cls, (id(dex), method_idx), args))

            for _idx, _method_name, code_off in methods:
                if code_off == 0:
                    continue
                try:
                    simulate(dex, code_off, on_new)
                except (struct.error, IndexError, KeyError):
                    continue
        return {k: v for k, v in out.items() if v}

    def _method_resources(self) -> dict[tuple[int, int], list[str]]:
        """Ressources `widgetSettings*` / `ws*` référencées, méthode par méthode.

        Sert de repli quand le constructeur ne porte pas d'identifiant de ressource :
        la classe de réglage résout alors son libellé elle-même (`mt9` pour
        `rotation`, `tt9` pour `interval`, `bt9` pour `line_thickness`…).
        """
        out: dict[tuple[int, int], list[str]] = {}
        for name, methods in self.class_methods.items():
            dex, _cdata = self.owner[name]
            for method_idx, _method_name, code_off in methods:
                if code_off == 0:
                    continue
                seen: list[str] = []
                for _pc, op, o in walk(dex, code_off):
                    value = None
                    if op == 0x14:
                        value = struct.unpack_from("<I", dex.data, o + 2)[0]
                    elif op == 0x15:
                        value = struct.unpack_from("<H", dex.data, o + 2)[0] << 16
                    if value is not None:
                        key = self.res_by_id.get(value)
                        if key and LABEL_RE.match(key) and key not in seen:
                            seen.append(key)
                if seen:
                    out[(id(dex), method_idx)] = seen
        return out

    def class_resources(self, cls: str, exclude: tuple = ()) -> list[str]:
        dex, _cdata = self.owner[cls]
        out: list[str] = []
        for method_idx, method_name, _code in self.class_methods.get(cls, []):
            if method_name in exclude:
                continue
            for key in self.method_resources.get((id(dex), method_idx), []):
                if key not in out:
                    out.append(key)
        return out

    # -- reconnaissance des classes de réglage -----------------------------
    def _setting_classes(self) -> set[str]:
        """Toutes les classes de réglage, c'est-à-dire les descendantes de la classe
        racine des réglages.

        La racine n'est pas nommée en dur — le nom est obfusqué et change à chaque
        build. On repère d'abord les classes *manifestement* de réglage (un appel de
        constructeur portant à la fois une chaîne et une ressource `widgetSettings*`),
        puis on remonte leur ancêtre commun : c'est la racine. Sur XCTrack 1.0.3-beta5
        c'est `Lsy9;`, dont descendent la case à cocher, la liste, le curseur, le
        sélecteur de couleur, etc.
        """
        seeds = set()
        for calls in self.constructions.values():
            for cls, _method, args in calls:
                if cls in self.enums:
                    continue  # une enum qui porte ses libellés n'est pas un réglage
                strings = [a[1] for a in args if a and a[0] == "str"]
                labels = [self.res_by_id[a[1]] for a in args
                          if a and a[0] == "int" and a[1] in self.res_by_id]
                if strings and any(r.startswith(RES_PREFIXES) for r in labels):
                    seeds.add(cls)
        if not seeds:
            return set()

        def ancestors(name):
            chain = []
            while name and name in self.parent:
                chain.append(name)
                name = self.parent[name]
            return chain

        # L'ancêtre qui couvre le plus de germes ; à égalité, le plus profond.
        coverage: Counter = Counter()
        for seed in seeds:
            for ancestor in set(ancestors(seed)) - {seed}:
                coverage[ancestor] += 1
        if not coverage:
            return seeds
        root = max(coverage, key=lambda c: (coverage[c], len(ancestors(c))))
        if coverage[root] < len(seeds) // 2:
            return seeds
        self.setting_root = root
        return {name for name in self.parent if root in ancestors(name)}

    # -- tables de switch --------------------------------------------------
    def _switch_tables(self) -> dict[str, dict[int | None, str]]:
        """{classe: {discriminant: clé_de_ressource}}.

        Certaines classes de réglage servent plusieurs options et choisissent leur
        libellé dans un `switch` sur un code passé au constructeur (`at9` couvre
        `postponedFloorLimit`, `postponedDisplayDistance`, `vertical_step`…). On
        décode la table de saut et on relève la ressource atteinte par chaque branche.
        """
        tables: dict[str, dict[int | None, str]] = {}
        for cls in self.setting_classes:
            dex, _cdata = self.owner[cls]
            mapping: dict[int | None, str] = {}
            for _idx, _name, code_off in self.class_methods.get(cls, []):
                if code_off == 0:
                    continue
                mapping.update(self._decode_switch(dex, code_off))
            if mapping:
                tables[cls] = mapping
        return tables

    def _decode_switch(self, dex: Dex, code_off: int) -> dict[int | None, str]:
        data = dex.data
        insns_size = struct.unpack_from("<I", data, code_off + 12)[0]
        base = code_off + 16
        consts: dict[int, str] = {}           # pc -> clé de ressource
        stops: set[int] = set()               # pc des return / goto : fin d'une branche
        switches: list[tuple[int, int, int]] = []  # (pc, pc de la charge, pc suivant)
        for pc, op, o in walk(dex, code_off):
            if op == 0x14:
                key = self.res_by_id.get(struct.unpack_from("<I", data, o + 2)[0])
                if key and LABEL_RE.match(key):
                    consts[pc] = key
            elif 0x0E <= op <= 0x11 or 0x28 <= op <= 0x2A:
                stops.add(pc)
            if op in (0x2B, 0x2C):
                switches.append((pc, pc + struct.unpack_from("<i", data, o + 2)[0],
                                 pc + INSN_SIZE[op]))

        def first_resource_after(start: int) -> str | None:
            """Première ressource rencontrée à partir de `start`, sans franchir la
            fin de la branche (un `return` ou un `goto` la termine)."""
            for pc in sorted(set(consts) | stops):
                if pc < start:
                    continue
                if pc in consts:
                    return consts[pc]
                return None
            return None

        out: dict[int | None, str] = {}
        for pc, payload_pc, next_pc in switches:
            if not (0 <= payload_pc < insns_size):
                continue
            o = base + payload_pc * 2
            ident = data[o + 1]
            size = struct.unpack_from("<H", data, o + 2)[0]
            if ident == 0x01:
                first = struct.unpack_from("<i", data, o + 4)[0]
                keys: list[int] = list(range(first, first + size))
                targets_off = o + 8
            elif ident == 0x02:
                keys = [struct.unpack_from("<i", data, o + 4 + i * 4)[0] for i in range(size)]
                targets_off = o + 4 + size * 4
            else:
                continue
            for i, switch_key in enumerate(keys):
                target = pc + struct.unpack_from("<i", data, targets_off + i * 4)[0]
                found = first_resource_after(target)
                if found:
                    out[switch_key] = found
            # La branche par défaut tombe juste après l'instruction de switch.
            default = first_resource_after(next_pc)
            if default and None not in out:
                out[None] = default
        return out

    # -- une option --------------------------------------------------------
    def option_from_call(self, cls: str, method: tuple, args: list, depth: int = 0) -> dict:
        """Reconstitue une option depuis un appel de constructeur de classe de réglage.

        Rend toujours un dictionnaire ; s'il porte `unresolved`, l'option a été
        identifiée mais son libellé n'a pas pu être relié à une ressource.
        """
        strings = [a[1] for a in args if a and a[0] == "str"]
        res_keys = [self.res_by_id[a[1]] for a in args
                    if a and a[0] == "int" and a[1] in self.res_by_id]
        ints = [a[1] for a in args if a and a[0] == "int" and a[1] not in self.res_by_id]
        arrays = [a[1] for a in args if a and a[0] == "arr"]
        sfields = [(a[1], a[2]) for a in args if a and a[0] == "sfield"]

        # Classe de réglage paramétrée : le constructeur choisit son option par un
        # `switch` en tête. On suit la branche correspondant à l'entier passé.
        if not strings and not res_keys and depth < 3:
            branch_key, inner = self.follow_parameterised(cls, method, ints)
            if len(inner) == 1:
                inner_option = self.option_from_call(*inner[0], depth=depth + 1)
                if inner_option and "unresolved" not in inner_option:
                    return dict(inner_option, impl=short(cls), labelFrom="branch")
                if inner_option and "key" in inner_option:
                    table = self.switch_tables.get(cls, {})
                    hit = table.get(branch_key) or table.get(None)
                    if hit and not HELP_RE.search(hit):
                        resolved = dict(inner_option, impl=short(cls), label=hit,
                                        labelFrom="branch+switch")
                        resolved.pop("unresolved", None)
                        return resolved
                    return inner_option

        key = next((s for s in strings if s in self.corpus_keys), None)
        if key is None:
            key = self._internal_key(cls, method)
        if key is None:
            key = next((s for s in strings if CONFIG_KEY_RE.match(s) and s), None)
        if key is None or not CONFIG_KEY_RE.match(key):
            return {}

        # Une ressource passée en argument au constructeur d'un réglage est un
        # libellé par construction : aucun filtre de préfixe ici. Les identifiants
        # de ressource valent au moins 0x7F000000, les autres entiers d'un
        # constructeur (bornes, valeur par défaut) sont petits : pas de collision.
        help_keys = [r for r in res_keys if HELP_RE.search(r)]
        label_keys = [r for r in res_keys if not HELP_RE.search(r)]
        origin = "args"

        if not label_keys:
            # 1. la ressource référencée par ce constructeur précis
            own = [r for r in self.method_resources.get(method, []) if not HELP_RE.search(r)]
            if len(own) == 1:
                label_keys, origin = own, "ctor"
            else:
                # 2. la table de switch de la classe. Le discriminant est le dernier
                #    argument entier du constructeur (`at9(clé, min, max, défaut, code)`) ;
                #    s'il ne figure pas dans la table, la branche par défaut s'applique.
                table = self.switch_tables.get(cls, {})
                hit = None
                if table and ints:
                    discriminant = ints[-1]
                    hit = table.get(discriminant)
                    if hit is None and None in table and abs(discriminant) < 64:
                        hit = table[None]
                if hit and not HELP_RE.search(hit):
                    label_keys, origin = [hit], "switch"
                else:
                    # 3. à défaut, une ressource unique dans le reste de la classe
                    rest = [r for r in self.class_resources(cls, exclude=("<clinit>",))
                            if not HELP_RE.search(r)]
                    if len(rest) == 1:
                        label_keys, origin = rest, "class"
                    elif rest and self.is_composite(key):
                        # Une clé composite donne PLUSIEURS contrôles (`mapScale` =
                        # un curseur et deux cases, cf. edition-native-exploration.md
                        # § 4.4). Le libellé principal est le plus court : les
                        # sous-options portent des phrases, l'option porte un nom.
                        rest.sort(key=lambda r: len(self.translations(r).get("en", "")))
                        label_keys, origin = rest[:1], "composite"
        if not label_keys:
            return {"key": key, "impl": short(cls),
                    "unresolved": "aucune ressource de libellé identifiable "
                                  f"(ni argument, ni constructeur, ni switch de {short(cls)})"}
        if not help_keys:
            help_keys = [r for r in self.method_resources.get(method, []) if HELP_RE.search(r)]

        option: dict = {"key": key, "impl": short(cls), "label": label_keys[0],
                        "labelFrom": origin}
        if help_keys:
            option["help"] = help_keys[0]

        if self.is_composite(key):
            # Les autres libellés attachés à la même clé : ce sont les sous-contrôles.
            # Quel libellé va à quel sous-champ n'est PAS établi — le bytecode ne le
            # dit pas de façon exploitable ; on les livre en vrac plutôt que d'inventer.
            others = [r for r in (label_keys[1:] + self.class_resources(cls, ("<clinit>",)))
                      if r != label_keys[0] and not HELP_RE.search(r)]
            if others:
                option["otherLabels"] = list(dict.fromkeys(others))
            fields = self.composite_fields(key)
            if fields:
                option["fields"] = fields

        # Valeurs permises : tableau de ressources passé au constructeur, sinon
        # tableau bâti dans le `<clinit>` de la classe (cas de la rotation des
        # widgets cartographiques, dont les six libellés vivent dans `lt9`).
        value_labels = None
        for array in arrays:
            keys = [self.res_by_id.get(x[1]) for x in array if x and x[0] == "int"]
            if keys and all(k and k.startswith(RES_PREFIXES) for k in keys):
                value_labels = keys
                break

        enum_cls = next((c for c, _f in sfields if c in self.enums), None)
        if value_labels is None and enum_cls:
            from_enum = self._values_from_enum_class(enum_cls)
            if from_enum:
                value_labels = from_enum
        if value_labels is None and enum_cls:
            value_labels = self._values_by_suffix(cls, enum_cls)
        if enum_cls and value_labels and len(self.enums[enum_cls]["order"]) == len(value_labels):
            option["values"] = [{"value": name, "label": res}
                                for name, res in zip(self.enums[enum_cls]["order"], value_labels)]
        elif value_labels:
            option["values"] = [{"label": res} for res in value_labels]
        elif enum_cls:
            option["values"] = [{"value": name} for name in self.enums[enum_cls]["order"]]

        default = next(((c, f) for c, f in sfields if c in self.enums), None)
        if default is not None:
            name = self.enums[default[0]]["fields"].get(default[1])
            if name:
                option["default"] = name
        return option

    def is_composite(self, key: str) -> bool:
        """Une clé est composite si le corpus la montre porteuse d'un objet JSON."""
        return any(isinstance(v.get(key), dict) for v in self.corpus.values())

    def composite_fields(self, key: str) -> list[str]:
        fields: list[str] = []
        for values in self.corpus.values():
            value = values.get(key)
            if isinstance(value, dict):
                for name in value:
                    if name not in fields:
                        fields.append(name)
        return fields

    def _values_by_suffix(self, cls: str, enum_cls: str) -> list[str] | None:
        """Apparie les constantes d'une énumération aux ressources d'une classe de
        réglage par le suffixe du nom.

        `jt9` charge ses quatre libellés dans un tableau interne, dans un ordre qui
        n'est pas celui des ordinaux : on ne peut pas les zipper. Mais
        `widgetSettingsNavigationTargetOptimized` se termine par `Optimized`, comme la
        constante `OPTIMIZED`. On n'accepte l'appariement que s'il est **total et sans
        ambiguïté** — sinon on n'apparie rien.
        """
        candidates = [r for r in self.class_resources(cls) if not HELP_RE.search(r)]
        if not candidates:
            return None
        out: list[str] = []
        for name in self.enums[enum_cls]["order"]:
            wanted = name.replace("_", "").lower()
            hits = [r for r in candidates if r.lower().endswith(wanted)]
            if len(hits) != 1:
                return None
            out.append(hits[0])
        return out if len(set(out)) == len(out) else None

    def _values_from_enum_class(self, enum_cls: str) -> list[str] | None:
        """Certaines énumérations portent elles-mêmes leurs libellés (un identifiant
        de ressource par constante, chargé dans le `<clinit>`)."""
        dex, _cdata = self.owner.get(enum_cls, (None, None))
        if dex is None:
            return None
        for method_idx, method_name, _code in self.class_methods.get(enum_cls, []):
            if method_name != "<clinit>":
                continue
            keys = self.method_resources.get((id(dex), method_idx), [])
            if len(keys) == len(self.enums[enum_cls]["order"]) and len(keys) > 1:
                return keys
        return None

    def follow_parameterised(self, cls: str, method: tuple, ints: list[int]):
        """Suit la branche prise dans le constructeur d'une classe de réglage
        paramétrée.

        Plusieurs classes servent plusieurs options et choisissent laquelle par un
        `switch` en tête de constructeur : `qs9(0)` déclare `_units`, `qs9(1)`
        déclare `time_format`. On décode la table de saut, on prend la branche
        correspondant à l'entier passé à l'appel, et on n'exécute que celle-là.

        Rend `(clé_de_branche, [(classe, méthode, arguments), …])`, ou `(None, [])`.
        """
        entry = self.method_code.get(method)
        if entry is None or not ints:
            return None, []
        dex, code_off = entry
        head = next(iter(walk(dex, code_off)), None)
        if head is None:
            return None, []
        pc, op, o = head
        if op not in (0x2B, 0x2C):
            return None, []
        data = dex.data
        payload_pc = pc + struct.unpack_from("<i", data, o + 2)[0]
        base = code_off + 16
        po = base + payload_pc * 2
        ident = data[po + 1]
        size = struct.unpack_from("<H", data, po + 2)[0]
        if ident == 0x01:
            first = struct.unpack_from("<i", data, po + 4)[0]
            keys: list[int] = list(range(first, first + size))
            targets_off = po + 8
        elif ident == 0x02:
            keys = [struct.unpack_from("<i", data, po + 4 + i * 4)[0] for i in range(size)]
            targets_off = po + 4 + size * 4
        else:
            return None, []
        wanted = ints[-1]
        if wanted in keys:
            index = keys.index(wanted)
            target = pc + struct.unpack_from("<i", data, targets_off + index * 4)[0]
        else:
            target = pc + INSN_SIZE[op]  # branche par défaut
        found: list[tuple] = []

        def on_new(inner_cls, method_idx, args):
            if inner_cls in self.setting_classes:
                found.append((inner_cls, (id(dex), method_idx), args))

        simulate(dex, code_off, on_new, start_pc=target, stop_at_return=True)
        return wanted, found

    def _internal_key(self, cls: str, method: tuple) -> str | None:
        """Clé codée en dur dans la classe de réglage (`titletext` dans `ws9`,
        `_units` dans `qs9`, `rotation` dans `mt9`…).

        On lit le constructeur *exact* qui a été appelé — plusieurs surcharges d'une
        même classe servent des options différentes (`zb5` en porte quatre).
        """
        entry = self.method_code.get(method)
        if entry is None:
            return None
        dex, code_off = entry
        candidates = []
        for _pc, op, o in walk(dex, code_off):
            if op in (0x1A, 0x1B):
                idx = (struct.unpack_from("<H", dex.data, o + 2)[0] if op == 0x1A
                       else struct.unpack_from("<I", dex.data, o + 2)[0])
                candidates.append(dex.string(idx))
        for s in candidates:
            if s in self.corpus_keys:
                return s
        for s in candidates:
            if CONFIG_KEY_RE.match(s) and not s.startswith(("widgetSettings", "ws")):
                return s
        return None


# --------------------------------------------------------------------------
# Attribution des options aux widgets
# --------------------------------------------------------------------------

def attribute(extractor: Extractor, definers: dict[str, list[dict]],
              widget_classes: dict[str, list[str]]) -> dict[str, list[dict]]:
    """Une option appartient au widget qui la déclare, à ses sous-classes (héritage)
    et aux widgets qui instancient la classe porteuse (composition : par exemple
    `WThermalAssistant` instancie le porteur des réglages `nav_*`)."""
    holders = set(definers)

    composed: dict[str, set[str]] = defaultdict(set)
    for definer, calls in extractor.constructions.items():
        for cls, _method, _args in calls:
            if cls in holders and cls != definer and cls not in extractor.setting_classes:
                composed[definer].add(cls)

    def closure(name: str, seen: set[str]) -> list[str]:
        if name in seen:
            return []
        seen.add(name)
        chain: list[str] = []
        parent = extractor.parent.get(name)
        if parent and parent.startswith(XCTRACK_PKG):
            chain += closure(parent, seen)
        chain.append(name)
        for holder in sorted(composed.get(name, ())):
            chain += closure(holder, seen)
        return chain

    out: dict[str, list[dict]] = {}
    for package in ("w", "wp"):
        prefix = f"{XCTRACK_PKG}widget/{package}/"
        for class_name in widget_classes[package]:
            descriptor = f"{prefix}{class_name};"
            if descriptor not in extractor.owner:
                continue
            merged: dict[str, dict] = {}
            for source in closure(descriptor, set()):
                for option in definers.get(source, []):
                    merged[option["key"]] = dict(option, definedIn=short(source))
            if merged:
                out[class_name] = list(merged.values())
    return out


# --------------------------------------------------------------------------
# Type de contrôle
# --------------------------------------------------------------------------

def infer_controls(extractor: Extractor, per_widget: dict[str, list[dict]]) -> dict[str, str]:
    """Type de contrôle par classe de réglage, déduit des options qu'elle porte.

    Les noms de classes sont obfusqués (`gs9`, `ys9`…) et changent d'un build à
    l'autre : on ne peut pas les câbler. On les classe donc par ce qu'on observe —
    présence d'une liste de valeurs, `%d` dans le libellé (curseur dont la valeur
    s'affiche dans l'intitulé, cf. `edition-native-exploration.md` § 4.1), type de
    la valeur dans le corpus — puis on tranche à la majorité, pour que toutes les
    options d'une même classe reçoivent le même type.
    """
    by_impl: dict[str, list[tuple[str, dict]]] = defaultdict(list)
    for widget, options in per_widget.items():
        for option in options:
            by_impl[option["impl"]].append((widget, option))

    kinds: dict[str, str] = {}
    for impl, entries in by_impl.items():
        votes: Counter = Counter()
        for widget, option in entries:
            english = extractor.translations(option["label"]).get("en", "")
            observed = extractor.corpus.get(widget, {}).get(option["key"])
            if isinstance(observed, dict):
                votes["composite"] += 1
            elif option.get("values"):
                votes["enum"] += 1
            elif COLOR_RE.search(english):
                votes["color"] += 1
            elif "%" in english:
                votes["slider"] += 1
            elif isinstance(observed, bool):
                votes["checkbox"] += 1
            elif isinstance(observed, str):
                votes["text"] += 1
            elif isinstance(observed, (int, float)):
                votes["slider"] += 1
        kinds[impl] = votes.most_common(1)[0][0] if votes else "unknown"
    return kinds


# --------------------------------------------------------------------------
# Programme principal
# --------------------------------------------------------------------------

def main():
    apk_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    if apk_dir is None:
        candidates = sorted(d for d in PROJECT_ROOT.parent.glob("XCTrack-*")
                            if (d / "resources.arsc").is_file())
        if not candidates:
            print("Aucun dossier XCTrack-* décompressé trouvé à côté de xcfg-editor/. "
                  "Précise le chemin en argument.", file=sys.stderr)
            sys.exit(1)
        apk_dir = candidates[-1]
    corpus_dir = Path(sys.argv[2]) if len(sys.argv) > 2 else PROJECT_ROOT.parent / "Exemples"

    print(f"APK    : {apk_dir}")
    print(f"Corpus : {corpus_dir}")
    extractor = Extractor(apk_dir, corpus_dir)
    print(f"Ressources chaîne : {len(extractor.res_by_id)} ; "
          f"locales : {len(extractor.by_locale)}")
    print(f"Classes .dex : {len(extractor.owner)} ; énumérations : {len(extractor.enums)}")
    print(f"Corpus : {len(extractor.corpus)} types de widgets, "
          f"{len(extractor.corpus_keys)} clés distinctes")
    print(f"Racine des réglages : {short(getattr(extractor, 'setting_root', '?'))} ; "
          f"{len(extractor.setting_classes)} classes de réglage ; "
          f"{len(extractor.switch_tables)} tables de switch décodées")

    definers: dict[str, list[dict]] = defaultdict(list)
    unresolved: list[dict] = []
    for definer, calls in extractor.constructions.items():
        if definer in extractor.setting_classes:
            continue  # une classe de réglage n'est pas un déclarant : elle EST le réglage
        seen_keys: set[str] = set()
        for cls, method, args in calls:
            if cls not in extractor.setting_classes:
                continue
            option = extractor.option_from_call(cls, method, args)
            if not option or option["key"] in seen_keys:
                continue
            seen_keys.add(option["key"])
            if "unresolved" in option:
                unresolved.append({"key": option["key"], "definedIn": short(definer),
                                   "impl": option["impl"], "reason": option["unresolved"]})
            else:
                definers[definer].append(option)

    widget_classes = discover_widget_classes(sorted(apk_dir.glob("classes*.dex")))
    per_widget = attribute(extractor, definers, widget_classes)

    # La classe de base de tous les widgets est obfusquée en `a` : on lui rend son
    # nom, sans le câbler — c'est le parent commun du plus grand nombre de widgets.
    def top_ancestor(descriptor: str) -> str | None:
        current = descriptor
        while True:
            parent = extractor.parent.get(current)
            if not parent or not parent.startswith(XCTRACK_PKG):
                return current if current != descriptor else None
            current = parent

    roots = Counter(filter(None, (top_ancestor(f"{XCTRACK_PKG}widget/w/{name};")
                                  for name in widget_classes["w"])))
    base_class = roots.most_common(1)[0][0] if roots else None
    if base_class:
        for options in per_widget.values():
            for option in options:
                if option["definedIn"] == short(base_class):
                    option["definedIn"] = "Widget"

    # `rotation` est composite sur les widgets cartographiques et une simple liste
    # sur la boussole : la forme dépend du widget, pas de la clé. On retire donc les
    # marques de composition là où le corpus montre une valeur scalaire.
    for widget, options in per_widget.items():
        observed = extractor.corpus.get(widget, {})
        for option in options:
            if option["key"] in observed and not isinstance(observed[option["key"]], dict):
                option.pop("fields", None)
                option.pop("otherLabels", None)

    kinds = infer_controls(extractor, per_widget)
    for options in per_widget.values():
        for option in options:
            option["control"] = kinds.get(option["impl"], "unknown")

    # -- pool de chaînes réellement référencées ----------------------------
    used: set[str] = set()
    for options in per_widget.values():
        for option in options:
            used.add(option["label"])
            if "help" in option:
                used.add(option["help"])
            for value in option.get("values", []):
                if "label" in value:
                    used.add(value["label"])
    strings = {key: extractor.translations(key) for key in sorted(used)}
    languages = sorted({lang for tr in strings.values() for lang in tr})

    # -- confrontation au corpus : la vérité terrain -----------------------
    matched = missing = extra = 0
    gaps: list[tuple[str, list[str]]] = []
    for widget, expected in sorted(extractor.corpus.items()):
        expected_keys = {k for k in expected if k not in ("widgets", "navigations")}
        got = {o["key"] for o in per_widget.get(widget, [])}
        hit = expected_keys & got
        miss = expected_keys - got
        matched += len(hit)
        missing += len(miss)
        extra += len(got - expected_keys)
        if miss:
            gaps.append((widget, sorted(miss)))

    corpus_pairs = sum(len({k for k in v if k not in ("widgets", "navigations")})
                       for v in extractor.corpus.values())
    option_count = sum(len(v) for v in per_widget.values())
    distinct_keys = {o["key"] for v in per_widget.values() for o in v}

    # -- mise en commun : une même option est partagée par des dizaines de widgets
    # (les cinq réglages de `ValueWidget`, les quarante de `MapWidget`). On la
    # décrit une fois, sous l'identifiant `<classe déclarante>.<clé>`, et chaque
    # widget ne porte que la liste ordonnée de ses identifiants.
    records: dict[tuple, dict] = {}
    for widget in sorted(per_widget):
        for option in per_widget[widget]:
            records.setdefault((option["definedIn"], option["key"],
                                json.dumps(option, sort_keys=True, ensure_ascii=False)), option)
    ambiguous = Counter(key for _definer, key, _blob in records)

    pool: dict[str, dict] = {}
    widget_index: dict[str, list[str]] = {}
    for widget in sorted(per_widget):
        ids: list[str] = []
        for option in per_widget[widget]:
            # Identifiant lisible : la clé seule quand elle ne décrit qu'une option
            # dans tout le catalogue, sinon la clé qualifiée par la classe déclarante
            # (`_theme` de `Widget` n'a pas le même libellé que celui de `MapWidget`).
            option_id = option["key"]
            if ambiguous[option["key"]] > 1:
                option_id = f"{option['key']}@{option['definedIn']}"
            existing = pool.get(option_id)
            if existing is not None and existing != option:
                option_id = f"{option_id}#{widget}"
            pool.setdefault(option_id, option)
            ids.append(option_id)
        widget_index[widget] = ids

    # -- la part invariante -------------------------------------------------
    # Tout ce qui ne dépend d'aucune langue, en un seul morceau : c'est ce que
    # `widgetOptions.ts` importe statiquement, et ce que la palette d'ajout charge
    # pour dresser sa liste des 84 types. Voir « La partition par langue » en tête.
    base = {
        "meta": {
            "source": apk_dir.name,
            "generatedBy": "tools/extract-widget-options.py",
            "languages": languages,
            "widgetCount": len(per_widget),
            "optionCount": option_count,
            "distinctKeyCount": len(distinct_keys),
            "pooledOptionCount": len(pool),
            "stringCount": len(strings),
            "corpusPairs": corpus_pairs,
            "corpusMatched": matched,
            "corpusMissing": missing,
            "unresolvedCount": len(unresolved),
        },
        "options": pool,
        "widgets": widget_index,
        "unresolved": sorted(unresolved, key=lambda u: (u["definedIn"], u["key"])),
        # Clés bel et bien présentes dans des fichiers réels que l'extraction n'a pas
        # su rattacher à une option. Listées pour que l'éditeur sache qu'il les
        # rencontrera : il doit les préserver à l'écriture même sans savoir les régler.
        "unmatchedCorpusKeys": {widget: keys for widget, keys in gaps},
    }

    out_dir = PROJECT_ROOT / "src" / "catalog" / "widgetOptions"
    out_dir.mkdir(parents=True, exist_ok=True)
    for stale in out_dir.glob("*.json"):
        stale.unlink()  # une langue retirée de l'APK ne doit pas survivre au fichier
    # Le catalogue d'un seul tenant, d'avant la partition. Supprimé s'il traîne encore :
    # 418 Ko que plus personne ne lit, et qui masqueraient le découpage à un lecteur
    # pressé.
    legacy = PROJECT_ROOT / "src" / "catalog" / "widgetOptions.json"
    if legacy.exists():
        legacy.unlink()

    base_path = out_dir / "base.json"
    base_path.write_text(json.dumps(base, ensure_ascii=False, indent=1) + "\n",
                         encoding="utf-8")

    # -- un fichier de textes par langue --------------------------------------
    # Le repli anglais est fusionné ici, clé par clé, plutôt que chargé à l'exécution :
    # l'anglais est la seule des 34 langues à traduire les 248 ressources, et charger
    # un second fichier entier pour compléter la première coûterait le double.
    #
    # Le texte anglais emprunté est indiscernable d'une traduction dans le fichier
    # produit, à dessein : l'ancien `resourceText()` rendait déjà
    # `texts[langue] ?? texts.en`, la partition rend exactement le même texte.
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
            "strings": texts,
        }
        path = out_dir / f"{language}.json"
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=1) + "\n",
                        encoding="utf-8")
        written.append((language, len(texts) - borrowed, borrowed, path.stat().st_size))

    # La liste des langues doit être connue **avant** de choisir quel fichier charger :
    # elle ne peut pas vivre dans les fichiers de langue eux-mêmes. Elle sort donc à
    # part, et reste écrite par ce script comme tout le reste.
    index_path = PROJECT_ROOT / "src" / "catalog" / "widgetOptionsLanguages.json"
    index_path.write_text(json.dumps(languages, ensure_ascii=False, indent=1) + "\n",
                          encoding="utf-8")

    print()
    print(f"Part invariante : {base_path} ({base_path.stat().st_size:,} octets)")
    total_bytes = sum(size for _l, _n, _b, size in written)
    print(f"Textes : {out_dir}/ — {len(written)} fichiers de langue, "
          f"{total_bytes:,} octets au total")
    print(f"Liste des langues : {index_path} ({index_path.stat().st_size:,} octets)")
    print(f"Descriptions mutualisées : {len(pool)}")
    print(f"Widgets couverts : {len(per_widget)}")
    print(f"Options : {option_count} ({len(distinct_keys)} clés distinctes), "
          f"{len(languages)} langues")
    print(f"Corpus : {matched}/{corpus_pairs} couples (widget, clé) retrouvés, "
          f"{missing} manquants ; {extra} options non attestées dans le corpus")
    if gaps:
        print("\nClés du corpus non retrouvées :")
        for widget, miss in gaps:
            print(f"  - {widget} : {', '.join(miss)}")
    if unresolved:
        print(f"\nOptions repérées mais non résolues ({len(unresolved)}) :")
        for u in base["unresolved"]:
            print(f"  - {u['definedIn']}.{u['key']} ({u['impl']}) : {u['reason']}")

    # Taille de chaque fichier de langue, et part empruntée à l'anglais. C'est le
    # chiffre qui compte pour le transfert : un pilote n'en charge jamais qu'un, et
    # il y ajoute la part invariante, une fois.
    print("\nFichiers de langue (octets indentés / textes propres / empruntés à l'anglais) :")
    for language, native, borrowed, size in written:
        print(f"  {language:<6} {size:>8,}  {native:>4} propres  {borrowed:>4} empruntés")


if __name__ == "__main__":
    main()
