#!/usr/bin/env python3
"""Extrait les libellés officiels des widgets XCTrack depuis resources.arsc.

Régénère `src/catalog/widgetLabels.json` à partir d'un APK décompressé XCTrack
(dossier contenant `resources.arsc` et `classes*.dex`). Aucune dépendance
tierce : parseur maison de la table de ressources Android (format binaire
ARSC) et lecteur minimal de fichiers .dex (juste assez pour retrouver le nom
des classes de widgets, `Lorg/xcontest/XCTrack/widget/w/...;`).

Usage :
    python3 tools/extract-widget-labels.py [chemin_du_dossier_apk_decompile]

Par défaut, cherche le dossier `XCTrack-*` à côté de `xcfg-editor/` (frère du
projet), c'est-à-dire `../XCTrack-<version>/`.

## Ce que fait ce script, dans l'ordre

1. Parse la table de ressources (`resources.arsc`) :
   pool de chaînes global -> paquet -> pool des noms de types -> pool des
   noms de clés -> chunks `ResTable_type` (un par (type, locale)) -> entrées.
2. Parse les `classes*.dex` pour retrouver la liste des classes de widgets
   réellement présentes dans l'APK (`Lorg/xcontest/XCTrack/widget/w/*;` et
   `.../widget/wp/*;`), qui sert de vérité terrain pour la couverture.
3. Pour chaque classe, retrouve la clé de ressource qui porte son libellé :
   - table d'exceptions KEY_OVERRIDES pour les classes où la convention ne
     suffit pas (voir le rapport joint à la livraison pour la justification
     de chaque entrée, notamment la vérification par recoupement dans le
     bytecode .dex) ;
   - règle mécanique déduite empiriquement : `w<Stem>Title` (`WAltitude` ->
     `wAltitudeTitle`), `wp<Stem>Title` pour le paquet `wp` ;
   - en dernier recours, **le registre de l'écran d'ajout**, lu par
     `extract-widget-catalog.py` : le `<init>` du `Companion` d'un widget
     passe la ressource de son titre à son constructeur. Rien n'y est
     deviné. C'est ce qui lève les six widgets dont la clé n'obéit à aucune
     convention (`WButtonVario` -> `widgetSettingsButtonSensVario2`) ;
   - sinon, la classe est listée comme non résolue plutôt que de deviner.
4. Écrit `src/catalog/widgetLabels.json` : `{ "WAltitude": {"en": "...",
   "fr": "...", ...}, ... }`.

Le format ARSC ci-dessous est documenté à partir de AOSP
`frameworks/base/libs/androidfw/include/androidfw/ResourceTypes.h` ; seuls
les champs utiles à notre usage sont décodés.
"""
from __future__ import annotations

import importlib.util
import json
import re
import struct
import sys
from pathlib import Path

# L'import par chemin de `extract-widget-catalog.py` (voir `_registry_titles`)
# laisserait sinon un `tools/__pycache__/` dans le dépôt.
sys.dont_write_bytecode = True

# --------------------------------------------------------------------------
# Pool de chaînes (ResStringPool) — commun au pool global et aux pools de
# types/clés des paquets.
# --------------------------------------------------------------------------

def parse_string_pool(data: bytes, offset: int) -> dict:
    ptype, _header_size, psize = struct.unpack_from("<HHI", data, offset)
    assert ptype == 0x0001, f"chunk attendu ResStringPool (0x0001), trouvé {hex(ptype)}"
    string_count, _style_count, flags, strings_start, _styles_start = struct.unpack_from(
        "<IIIII", data, offset + 8
    )
    is_utf8 = bool(flags & 0x100)
    idx_offsets_off = offset + 28  # 8 (ResChunk_header) + 20 (champs ci-dessus)
    strings = []
    for i in range(string_count):
        rel = struct.unpack_from("<I", data, idx_offsets_off + i * 4)[0]
        base = offset + strings_start + rel
        if is_utf8:
            pos = base

            def read_len8(pos):
                b0 = data[pos]
                if b0 & 0x80:
                    b1 = data[pos + 1]
                    return ((b0 & 0x7F) << 8) | b1, pos + 2
                return b0, pos + 1

            _char_len, pos = read_len8(pos)
            byte_len, pos = read_len8(pos)
            strings.append(data[pos:pos + byte_len].decode("utf-8", errors="replace"))
        else:
            pos = base

            def read_len16(pos):
                v0 = struct.unpack_from("<H", data, pos)[0]
                if v0 & 0x8000:
                    v1 = struct.unpack_from("<H", data, pos + 2)[0]
                    return ((v0 & 0x7FFF) << 16) | v1, pos + 4
                return v0, pos + 2

            char_len, pos = read_len16(pos)
            strings.append(data[pos:pos + char_len * 2].decode("utf-16-le", errors="replace"))
    return {"count": string_count, "is_utf8": is_utf8, "size": psize, "strings": strings}


# --------------------------------------------------------------------------
# ResTable_config : on n'a besoin que de language[2]/country[2], avec
# décompactage de la représentation "packée" utilisée pour les codes ISO à
# 3 lettres (bit 0x80 du premier octet armé).
# --------------------------------------------------------------------------

def _unpack_lang_or_region(b0: int, b1: int, base_char: str) -> str:
    if b0 & 0x80:
        first = b1 & 0x1F
        second = ((b1 & 0xE0) >> 5) + ((b0 & 0x03) << 3)
        third = (b0 & 0x7C) >> 2
        return "".join(chr(x + ord(base_char)) for x in (first, second, third))
    chars = bytes([b0, b1]).rstrip(b"\x00")
    return chars.decode("ascii", errors="replace")


def parse_config_locale(cfg_bytes: bytes) -> str:
    lang_b0, lang_b1, ctry_b0, ctry_b1 = cfg_bytes[8], cfg_bytes[9], cfg_bytes[10], cfg_bytes[11]
    lang = _unpack_lang_or_region(lang_b0, lang_b1, "a") if (lang_b0 or lang_b1) else ""
    ctry = _unpack_lang_or_region(ctry_b0, ctry_b1, "0") if (ctry_b0 or ctry_b1) else ""
    if not lang:
        return ""  # config "par défaut", sans qualification de langue
    return lang + (f"-{ctry}" if ctry else "")


# --------------------------------------------------------------------------
# Table de ressources complète
# --------------------------------------------------------------------------

TYPE_STRING = 0x03  # Res_value::dataType pour une chaîne (index dans le pool global)


class ResourceTable:
    def __init__(self, arsc_path: Path):
        self.data = data = arsc_path.read_bytes()
        rtype, _hsz, _rsize = struct.unpack_from("<HHI", data, 0)
        assert rtype == 0x0002, f"chunk racine attendu 0x0002, trouvé {hex(rtype)}"

        self.global_pool = parse_string_pool(data, 12)
        pkg_offset = 12 + self.global_pool["size"]
        ptype, _hsz, psize = struct.unpack_from("<HHI", data, pkg_offset)
        assert ptype == 0x0200, f"chunk paquet attendu 0x0200, trouvé {hex(ptype)}"
        type_strings_off, _last_pub_type, key_strings_off, _last_pub_key = struct.unpack_from(
            "<IIII", data, pkg_offset + 268
        )
        self.pkg_offset = pkg_offset
        self.pkg_size = psize
        self.type_pool = parse_string_pool(data, pkg_offset + type_strings_off)
        self.key_pool = parse_string_pool(data, pkg_offset + key_strings_off)

        # Zone des types (ResTable_typeSpec 0x0202 / ResTable_type 0x0201),
        # juste après le pool des clés.
        cursor = pkg_offset + key_strings_off + self.key_pool["size"]
        pkg_end = pkg_offset + psize
        self.type_chunks = []
        while cursor < pkg_end:
            ctype, _hsz, csize = struct.unpack_from("<HHI", data, cursor)
            if csize == 0:
                break
            if ctype == 0x0201:
                self.type_chunks.append(cursor)
            cursor += csize

        self.string_type_id = self.type_pool["strings"].index("string") + 1

    # -- décodage d'un chunk ResTable_type ---------------------------------
    def _parse_type_chunk(self, off: int):
        data = self.data
        type_id = data[off + 8]
        flags = data[off + 9]
        entry_count = struct.unpack_from("<I", data, off + 12)[0]
        entries_start = struct.unpack_from("<I", data, off + 16)[0]
        cfg_off = off + 20
        cfg_size = struct.unpack_from("<I", data, cfg_off)[0]
        locale = parse_config_locale(data[cfg_off:cfg_off + cfg_size])
        offsets_start = cfg_off + cfg_size
        entries_base = off + entries_start
        sparse = bool(flags & 0x01)
        offset16 = bool(flags & 0x02)

        entries = {}  # entry_index -> (key_index, value_string | None)
        if sparse:
            for i in range(entry_count):
                idx, eoff = struct.unpack_from("<HH", data, offsets_start + i * 4)
                entries[idx] = self._read_entry(entries_base + eoff * 4)
        else:
            for i in range(entry_count):
                if offset16:
                    eoff = struct.unpack_from("<H", data, offsets_start + i * 2)[0]
                    if eoff == 0xFFFF:
                        continue
                    eoff *= 4
                else:
                    eoff = struct.unpack_from("<I", data, offsets_start + i * 4)[0]
                    if eoff == 0xFFFFFFFF:
                        continue
                entries[i] = self._read_entry(entries_base + eoff)
        return type_id, locale, entries

    def _read_entry(self, entry_off: int):
        data = self.data
        esize, eflags = struct.unpack_from("<HH", data, entry_off)
        key_index = struct.unpack_from("<I", data, entry_off + 4)[0]
        if eflags & 0x0001:  # FLAG_COMPLEX -> map/array/style, pas une chaîne simple
            return key_index, None
        val_off = entry_off + esize
        _vsize, _vres0, vdtype = struct.unpack_from("<HBB", data, val_off)
        vdata = struct.unpack_from("<I", data, val_off + 4)[0]
        if vdtype != TYPE_STRING:
            return key_index, None
        return key_index, self.global_pool["strings"][vdata]

    def string_entries_by_locale(self) -> dict:
        """{ locale: { key_name: value } } pour le type de ressource "string"."""
        out: dict[str, dict[str, str]] = {}
        for off in self.type_chunks:
            type_id, locale, entries = self._parse_type_chunk(off)
            if type_id != self.string_type_id:
                continue
            bucket = out.setdefault(locale, {})
            for _idx, (key_index, value) in entries.items():
                if value is None:
                    continue
                bucket[self.key_pool["strings"][key_index]] = value
        return out


# --------------------------------------------------------------------------
# .dex — juste de quoi lister les classes de widgets présentes dans l'APK.
# On ne décode que string_ids/type_ids/class_defs ; pas besoin du bytecode
# pour cette étape (la vérification par bytecode a été faite manuellement,
# voir le rapport de livraison — elle n'est pas reconduite ici pour garder
# ce script simple et robuste aux futures versions).
# --------------------------------------------------------------------------

WIDGET_CLASS_RE = re.compile(rb"Lorg/xcontest/XCTrack/widget/(w|wp)/([A-Za-z0-9]+);")


def discover_widget_classes(dex_paths: list[Path]) -> dict:
    """{'w': {...classes...}, 'wp': {...classes...}}, dédupliquées entre dex."""
    found = {"w": set(), "wp": set()}
    for p in dex_paths:
        data = p.read_bytes()
        for m in WIDGET_CLASS_RE.finditer(data):
            pkg = m.group(1).decode()
            name = m.group(2).decode()
            found[pkg].add(name)
    # "a" est la classe de base obfusquée partagée par plusieurs widgets
    # (WCompass, WButtonBrightness, WButtonNavig...), pas un widget en soi.
    found["w"].discard("a")
    # WidgetPageDefinition est une classe de données (mise en page), pas un widget.
    found["wp"].discard("WidgetPageDefinition")
    return {pkg: sorted(names) for pkg, names in found.items()}


# --------------------------------------------------------------------------
# Résolution classe -> clé de ressource du libellé
# --------------------------------------------------------------------------

# Exceptions à la règle mécanique "w<Stem>Title" / "wp<Stem>Title", établies
# en croisant les candidats du pool de clés avec le contenu réel des libellés
# et confirmées par une recherche du littéral d'identifiant de ressource
# correspondant dans le bytecode .dex. Pour la plupart, le littéral vit dans
# les méthodes de la classe du widget elle-même ; pour WCompass et
# WXCAssistant, il fallait chercher dans la classe interne `$Companion`
# (`WCompass$Companion.<init>` référence exactement deux littéraux de type
# "string" — `wCompassDescription` et `wCompassTitleWind` — confirmant que le
# titre est `wCompassTitleWind`, pas `wCompassDigitTitle` qui appartient à la
# classe sœur WCompassDigital). Voir le rapport de livraison pour le détail
# classe par classe.
KEY_OVERRIDES = {
    "WButtonBrightness": "wButtonBrightness",
    "WButtonNavig": "wButtonNavig",
    "WButtonPhone": "wButtonPhone",
    "WButtonVolume": "wButtonVolume",
    "WButtonVolumeReminder": "wButtonVolumeReminder",
    "WButtonZoom": "wButtonZoom",
    "WCompGlideToESS": "wCompGlideToEssTitle",
    "WCompass": "wCompassTitleWind",
    "WCompassDigital": "wCompassDigitTitle",
    "WDebug": "debug_wDebugTitle",
    "WDebugActivelook": "debug_wActiveLookTitle",
    "WDebugDetectedActivity": "debug_wDebugDetectedActivity",
    "WDebugFPS": "debug_wDebugFps",
    "WDebugFont": "debug_wDebugFont",
    "WDebugHwAccTestMap": "debug_wDebugHwAccTestMap",
    "WDebugSystemInfo": "debug_wDebugSystemInfo",
    "WVTM": "debug_wVTM",
    "WEmitTestEvent": "wTestingEmitEventTitle",
    "WLastKey": "wTestingLastKeyTitle",
    "WLogPeek": "wTestingLogPeekTitle",
    "WNextTurnpointAlt": "wNextTurnpointAltOfArrivalTitle",
    "WXCAssistant": "wXCAssistantTitle2",
    "WAltitudeDataGraph": "wAltitudeDataGraphName",
}

# ANOMALIE CONNUE, VOLONTAIREMENT NON CORRIGÉE — ne pas "réparer" ceci un jour de bonne
# foi. Dans les ressources XCTrack elles-mêmes, les libellés français de ces deux clés
# semblent inversés par rapport à leur sémantique anglaise :
#   wCompTimeToStartTitle (= "Time to start")  -> fr "Heure du départ"
#   wCompTimeAtStartTitle (= "Time at start")  -> fr "Temps au départ"
# Vérifié deux fois directement dans le pool de chaînes (locale 'fr' ET locale par
# défaut/'en'), ce n'est pas un artefact de ce script. L'objectif de ce catalogue est de
# reproduire XCTrack tel qu'il est, pas de corriger sa traduction : la valeur est prise
# telle quelle, sans permutation.

# Classes pour lesquelles aucune clé fiable n'a été trouvée : ni la règle
# mécanique, ni une correspondance non ambiguë dans le pool de clés, ni le
# registre de l'écran d'ajout. Documentées explicitement plutôt que devinées.
#
# Elles étaient huit avant que le registre ne soit lu (voir `_registry_titles`) :
# WAltitudeMaximum, WButtonCamera, WButtonVario, WCompPercentage, WExternalData et
# WWebView portaient bien un titre, mais sous une clé qu'aucune convention ne pouvait
# deviner (`wAltitudeMaxInFlight`, `widgetSettingsButtonSensVario2`…). Le registre la
# donne telle que le constructeur la passe. Restent les deux que l'écran ne propose
# pas — et donc que le registre ne connaît pas non plus.
KNOWN_UNRESOLVED = {
    "WProFallback": "absent du registre de l'écran d'ajout : XCTrack le fabrique "
                    "lui-même en remplacement d'un widget Pro sans licence (§ 3.3). "
                    "Son Companion porte bien un titre, mais c'est `wProLabel`, le "
                    "texte du badge « Pro » — pas un nom de widget",
    "WPMissing": "aucune clé candidate dans le pool de clés, et absent du registre : "
                 "classe de page de secours, affichée quand une classe est "
                 "introuvable (§ 3.3)",
}


def _registry_titles(apk_dir: Path) -> dict:
    """Clé de titre lue dans le bytecode, pour les widgets de l'écran d'ajout.

    Import **tardif**, à dessein : `extract-widget-catalog.py` importe ce module-ci
    dès son chargement — il lui emprunte le parseur `resources.arsc`. L'importer ici
    au niveau du module ferait un cycle à l'import ; l'appeler depuis une fonction
    n'en fait pas. On ne duplique donc pas la lecture du registre, qui est longue à
    écrire et n'a qu'un seul endroit légitime.
    """
    path = Path(__file__).resolve().parent / "extract-widget-catalog.py"
    spec = importlib.util.spec_from_file_location("extract_widget_catalog", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.registry_titles(apk_dir)


def resolve_key(
    class_name: str, package: str, all_keys: set, registry: dict | None = None
) -> str | None:
    """Clé de ressource du libellé d'une classe de widget, ou None.

    Trois règles, dans l'ordre :

    1. `KEY_OVERRIDES`, les exceptions établies à la main et vérifiées une à une ;
    2. la convention de nommage `w<Stem>Title` / `wp<Stem>Title` ;
    3. **le registre de l'écran d'ajout** — la clé que le `<init>` du `Companion`
       passe à son constructeur. Lue, pas devinée.

    Le registre vient en dernier alors qu'il est la source la plus sûre : il ne sert
    qu'à combler ce que les deux autres laissent vide, ce qui garde le catalogue
    stable là où il l'était déjà. Ce n'est pas une concession — sur les 77 classes que
    le registre et les deux premières règles résolvent toutes les deux, elles sont
    **d'accord partout** (`main` le vérifie à chaque exécution et le signale). Cet
    accord total est précisément ce qui autorise à faire confiance au registre sur les
    six qu'il est seul à résoudre.
    """
    if class_name in KEY_OVERRIDES:
        return KEY_OVERRIDES[class_name]
    stem = class_name[2:] if package == "wp" and class_name.startswith("WP") else class_name[1:]
    prefix = "wp" if package == "wp" else "w"
    candidate = f"{prefix}{stem}Title"
    if candidate in all_keys:
        return candidate
    if registry is not None:
        from_registry = registry.get(class_name)
        # Une clé que le registre cite mais que les ressources ne portent pas serait
        # le signe d'une lecture fautive : on préfère ne rien rendre.
        if from_registry is not None and from_registry in all_keys:
            return from_registry
    return None


# --------------------------------------------------------------------------
# Programme principal
# --------------------------------------------------------------------------

def main():
    if len(sys.argv) > 1:
        apk_dir = Path(sys.argv[1])
    else:
        # Cherche un dossier frère XCTrack-* à côté de xcfg-editor/.
        project_root = Path(__file__).resolve().parents[1]
        # `is_dir()` n'est pas facultatif : à côté du dossier `XCTrack-<version>/`
        # traîne le `XCTrack-<version>.apk` dont il est extrait, et il trie *après*.
        candidates = [c for c in sorted(project_root.parent.glob("XCTrack-*")) if c.is_dir()]
        if not candidates:
            print("Aucun dossier XCTrack-* trouvé à côté de xcfg-editor/. "
                  "Précise le chemin en argument.", file=sys.stderr)
            sys.exit(1)
        apk_dir = candidates[-1]

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
    all_keys = {k for entries in by_locale.values() for k in entries}

    print(f"Lecture de {len(dex_paths)} fichier(s) .dex : {[p.name for p in dex_paths]}")
    widget_classes = discover_widget_classes(dex_paths)
    total_classes = len(widget_classes["w"]) + len(widget_classes["wp"])
    print(f"Classes de widgets trouvées : {len(widget_classes['w'])} (paquet w) "
          f"+ {len(widget_classes['wp'])} (paquet wp) = {total_classes}")

    registry = _registry_titles(apk_dir)
    print(f"Titres lus dans le registre de l'écran d'ajout : {len(registry)}")

    # Contrôle croisé, refait à chaque exécution : là où le registre et les deux
    # premières règles répondent tous les deux, ils doivent dire la même chose. Un
    # désaccord signalerait que la convention a dérivé, ou que la lecture du registre
    # s'est décalée — dans les deux cas il faut regarder avant de livrer.
    agreed = 0
    for package in ("w", "wp"):
        for class_name in widget_classes[package]:
            without = resolve_key(class_name, package, all_keys)
            from_registry = registry.get(class_name)
            if without is None or from_registry is None:
                continue
            if without == from_registry:
                agreed += 1
            else:
                print(f"  DÉSACCORD {class_name} : règles={without} registre={from_registry}")
    print(f"Accord règles/registre : {agreed} classes vérifiées")

    catalog: dict[str, dict[str, str]] = {}
    unresolved: list[str] = []
    resolved_by_registry: list[str] = []
    for package in ("w", "wp"):
        for class_name in widget_classes[package]:
            key = resolve_key(class_name, package, all_keys, registry)
            if key is not None and resolve_key(class_name, package, all_keys) is None:
                resolved_by_registry.append(class_name)
            if key is None:
                unresolved.append(class_name)
                continue
            labels = {}
            for locale, entries in by_locale.items():
                if key in entries:
                    tag = "en" if locale == "" else locale
                    labels[tag] = entries[key]
            if labels:
                catalog[class_name] = labels
            else:
                unresolved.append(class_name)

    # locales présentes sur au moins un libellé de widget
    locales_used = sorted({loc for labels in catalog.values() for loc in labels})

    out_path = Path(__file__).resolve().parents[1] / "src" / "catalog" / "widgetLabels.json"
    out_path.write_text(
        json.dumps(catalog, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )

    print()
    print(f"Catalogue écrit : {out_path}")
    print(f"Widgets résolus : {len(catalog)} / {total_classes}")
    print(f"Locales trouvées : {len(locales_used)} -> {locales_used}")
    if resolved_by_registry:
        print(f"\nRésolues par le registre seul ({len(resolved_by_registry)}) :")
        for class_name in sorted(resolved_by_registry):
            print(f"  - {class_name} : {registry[class_name]} "
                  f"-> fr={catalog[class_name].get('fr')!r}")
    if unresolved:
        print(f"\nClasses NON résolues ({len(unresolved)}) :")
        for c in sorted(unresolved):
            reason = KNOWN_UNRESOLVED.get(c, "raison non documentée — à investiguer")
            print(f"  - {c} : {reason}")


if __name__ == "__main__":
    main()
