#!/usr/bin/env python3
"""Relève la **structure de configuration** d'une version de XCTrack, depuis un APK
décompressé passé en argument.

    python3 tools/extract-version-schema.py <dossier_apk_decompresse> [-o relevé.json]

Un « relevé » répond à une seule question : *quels widgets existent dans cette
version, et quelles clés d'option chacun accepte-t-il ?* Rien d'autre — ni libellés,
ni traductions, ni valeurs permises. C'est `tools/extract-widget-options.py` qui
porte tout cela, pour la seule version courante ; le multiplier par cinquante
versions et trente-trois langues pèserait des dizaines de mégaoctets sans rien
apprendre à personne.

Les relevés produits ici alimentent `tools/build-version-database.py`, qui les
agrège en la base versionnée de `src/catalog/widgetVersions/`.

## Comment obtenir un dossier d'APK décompressé

    unzip -o mon-xctrack.apk AndroidManifest.xml resources.arsc 'classes*.dex' -d /tmp/xct

Seuls ces trois sortes de fichiers servent : le manifeste pour le `versionCode`, la
table de ressources et le bytecode pour la structure. Ce script ne va **rien
chercher sur le réseau** : il lit ce qu'on lui donne. À chacun de fournir l'APK de
la version qu'il veut vérifier.

## Ce qui est réutilisé, et ce qui est ajouté

Toute la lecture du bytecode vient de `tools/extract-widget-options.py`, importé tel
quel : parseur `resources.arsc`, lecteur `.dex`, simulation des registres Dalvik,
reconnaissance des classes de réglage, attribution aux widgets par héritage et par
composition. Voir son en-tête pour la méthode ; elle n'est pas redite ici.

Deux différences, toutes deux nécessaires au relevé versionné :

1. **Les options dont le libellé n'a pas pu être résolu sont conservées.** Le
   catalogue courant les écarte, et il a raison : une option sans libellé ne
   s'affiche pas. Mais sa *clé* existe bel et bien dans le fichier de
   configuration, et c'est tout ce qui compte ici. Les écarter fabriquerait des
   trous : sur `0.9.11.11`, `titletext` tombe dans les non-résolues pour les
   quarante widgets de valeur — les garder fait passer la concordance avec les
   fichiers réels de 329/370 à 370/370.

2. **Le `versionCode` est lu dans `AndroidManifest.xml`**, au format binaire
   Android. C'est lui qui fait autorité : les noms de fichiers d'APK sont
   inconsistants et parfois trompeurs.

## Ce que le relevé ne prouve pas

L'absence d'une clé dans un relevé ne prouve **pas** son absence de XCTrack : elle
peut aussi signaler une limite de l'extraction. Et sa présence dans un fichier réel ne
prouve pas davantage qu'elle existait dans la version qui a écrit ce fichier —
**XCTrack conserve les clés qu'il ne connaît plus**. C'est `build-version-database.py`
qui tranche, en confrontant les relevés aux fichiers `.xcfg` réels et en datant chaque
écart ; ce script-ci se contente de rapporter ce qu'il a lu.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import struct
import sys
from collections import defaultdict
from pathlib import Path

sys.dont_write_bytecode = True

PROJECT_ROOT = Path(__file__).resolve().parents[1]


def _load_options_module():
    """`extract-widget-options.py` porte des tirets : import par chemin."""
    path = PROJECT_ROOT / "tools" / "extract-widget-options.py"
    spec = importlib.util.spec_from_file_location("extract_widget_options", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


# --------------------------------------------------------------------------
# AndroidManifest.xml binaire : le versionCode fait autorité
# --------------------------------------------------------------------------
# Format « AXML » : une suite de morceaux typés, dont un vivier de chaînes et une
# table qui associe chaque nom d'attribut à son identifiant de ressource système.
# Le nom textuel d'un attribut est souvent absent d'un APK optimisé ; l'identifiant,
# lui, ne l'est jamais.

ATTR_VERSION_CODE = 0x0101021B
ATTR_VERSION_NAME = 0x0101021C
CHUNK_STRING_POOL = 0x0001
CHUNK_RESOURCE_MAP = 0x0180
CHUNK_START_ELEMENT = 0x0102
TYPE_STRING = 0x03


def _utf8_length(data: bytes, offset: int) -> tuple[int, int]:
    value = data[offset]
    offset += 1
    if value & 0x80:
        value = ((value & 0x7F) << 8) | data[offset]
        offset += 1
    return value, offset


def _string_pool(data: bytes, offset: int) -> list[str]:
    count, _styles, flags, strings_start, _styles_start = struct.unpack_from(
        "<IIIII", data, offset + 8)
    utf8 = bool(flags & (1 << 8))
    offsets = struct.unpack_from(f"<{count}I", data, offset + 28)
    base = offset + strings_start
    pool: list[str] = []
    for entry in offsets:
        cursor = base + entry
        if utf8:
            _chars, cursor = _utf8_length(data, cursor)
            length, cursor = _utf8_length(data, cursor)
            pool.append(data[cursor:cursor + length].decode("utf-8", "replace"))
        else:
            length = struct.unpack_from("<H", data, cursor)[0]
            cursor += 2
            if length & 0x8000:  # chaîne longue : deux mots
                length = ((length & 0x7FFF) << 16) | struct.unpack_from("<H", data, cursor)[0]
                cursor += 2
            pool.append(data[cursor:cursor + length * 2].decode("utf-16-le", "replace"))
    return pool


def manifest_version(path: Path) -> tuple[int | None, str | None, str | None]:
    """Rend `(versionCode, versionName, package)` lus dans le manifeste binaire."""
    data = path.read_bytes()
    chunk_type, header_size, _total = struct.unpack_from("<HHI", data, 0)
    if chunk_type != 0x0003:
        raise ValueError(f"{path} n'est pas un AndroidManifest.xml binaire")
    offset = header_size
    pool: list[str] = []
    resource_map: list[int] = []
    code = name = package = None
    while offset + 8 <= len(data):
        chunk_type, chunk_header, chunk_size = struct.unpack_from("<HHI", data, offset)
        if chunk_size <= 0:
            break
        if chunk_type == CHUNK_STRING_POOL:
            pool = _string_pool(data, offset)
        elif chunk_type == CHUNK_RESOURCE_MAP:
            entries = (chunk_size - chunk_header) // 4
            resource_map = list(struct.unpack_from(f"<{entries}I", data, offset + chunk_header))
        elif chunk_type == CHUNK_START_ELEMENT:
            element = pool[struct.unpack_from("<I", data, offset + 20)[0]]
            attr_start, attr_size, attr_count = struct.unpack_from("<HHH", data, offset + 24)
            if element != "manifest":
                offset += chunk_size
                continue
            for index in range(attr_count):
                at = offset + 16 + attr_start + index * attr_size
                name_index = struct.unpack_from("<I", data, at + 4)[0]
                value_type = data[at + 15]
                value = struct.unpack_from("<I", data, at + 16)[0]
                resource_id = resource_map[name_index] if name_index < len(resource_map) else 0
                label = pool[name_index] if name_index < len(pool) else ""
                if resource_id == ATTR_VERSION_CODE or label == "versionCode":
                    code = value
                elif resource_id == ATTR_VERSION_NAME or label == "versionName":
                    name = pool[value] if value_type == TYPE_STRING else str(value)
                elif label == "package":
                    package = pool[value] if value_type == TYPE_STRING else None
            break
        offset += chunk_size
    return code, name, package


# --------------------------------------------------------------------------
# Relevé de structure
# --------------------------------------------------------------------------

def survey(apk_dir: Path, corpus_dir: Path) -> dict:
    """Rend `{widget: {clé: type de contrôle}}` et de quoi juger de la qualité du relevé.

    `corpus_dir` sert d'appui à l'extraction, pas de vérité : `extract-widget-options.py`
    s'en sert pour départager deux littéraux de chaîne dans un même constructeur.
    C'est `build-version-database.py` qui confronte le résultat aux fichiers réels.
    """
    options = _load_options_module()
    extractor = options.Extractor(apk_dir, corpus_dir)

    definers: dict[str, list[dict]] = defaultdict(list)
    unresolved: list[dict] = []
    for definer, calls in extractor.constructions.items():
        if definer in extractor.setting_classes:
            continue  # une classe de réglage n'est pas un déclarant : elle EST le réglage
        seen: set[str] = set()
        for cls, method, args in calls:
            if cls not in extractor.setting_classes:
                continue
            option = extractor.option_from_call(cls, method, args)
            if not option or option["key"] in seen:
                continue
            seen.add(option["key"])
            if "unresolved" in option:
                # Libellé introuvable, mais la clé, elle, est lue dans le bytecode :
                # elle a sa place dans un relevé de structure. Voir l'en-tête, point 1.
                unresolved.append({"key": option["key"], "definedIn": options.short(definer)})
            definers[definer].append(option)

    widget_classes = options.discover_widget_classes(sorted(apk_dir.glob("classes*.dex")))
    per_widget = options.attribute(extractor, definers, widget_classes)

    # `infer_controls` lit le libellé anglais : on ne lui donne que les options
    # résolues. Les autres reçoivent `unknown`, ce qu'elles sont.
    labelled = {widget: [o for o in opts if "unresolved" not in o]
                for widget, opts in per_widget.items()}
    kinds = options.infer_controls(extractor, labelled)

    schema = {
        widget: {option["key"]: ("unknown" if "unresolved" in option
                                 else kinds.get(option["impl"], "unknown"))
                 for option in opts}
        for widget, opts in sorted(per_widget.items())
    }
    return {
        "widgets": schema,
        "widgetClasses": {group: sorted(names) for group, names in widget_classes.items()},
        "settingRoot": options.short(getattr(extractor, "setting_root", "")),
        "settingClassCount": len(extractor.setting_classes),
        "unresolvedCount": len(unresolved),
        "unresolved": sorted(unresolved, key=lambda u: (u["definedIn"], u["key"])),
        "resourceStringCount": len(extractor.res_by_id),
        "dexClassCount": len(extractor.owner),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("apk_dir", type=Path,
                        help="dossier d'un APK décompressé (AndroidManifest.xml, "
                             "resources.arsc, classes*.dex)")
    parser.add_argument("-o", "--out", type=Path, default=None,
                        help="fichier de sortie ; sinon, résumé sur la sortie standard")
    parser.add_argument("--corpus", type=Path,
                        default=PROJECT_ROOT.parent / "Exemples",
                        help="dossier de fichiers .xcfg servant d'appui à l'extraction")
    parser.add_argument("--label", default=None,
                        help="étiquette de provenance conservée dans le relevé "
                             "(nom du fichier APK d'origine, par exemple)")
    args = parser.parse_args()

    manifest = args.apk_dir / "AndroidManifest.xml"
    if not manifest.is_file():
        parser.error(f"{manifest} est introuvable — l'APK est-il décompressé ?")
    code, name, package = manifest_version(manifest)
    if package and package != "org.xcontest.XCTrack":
        print(f"Attention : le paquet est « {package} », pas org.xcontest.XCTrack.",
              file=sys.stderr)

    result = survey(args.apk_dir, args.corpus)
    result = {
        "versionCode": code,
        "versionName": name,
        "package": package,
        "source": args.label or args.apk_dir.name,
        "generatedBy": "tools/extract-version-schema.py",
        **result,
    }

    pairs = sum(len(keys) for keys in result["widgets"].values())
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(json.dumps(result, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"{code} ({name}) : {len(result['widgets'])} widgets, {pairs} couples "
              f"(widget, clé) -> {args.out}")
    else:
        print(f"versionCode  : {code}")
        print(f"versionName  : {name}")
        print(f"widgets      : {len(result['widgets'])}")
        print(f"couples      : {pairs}")
        print(f"non résolues : {result['unresolvedCount']} (clé lue, libellé introuvable)")
        print(f"racine des réglages : {result['settingRoot']} "
              f"({result['settingClassCount']} classes)")


if __name__ == "__main__":
    main()
