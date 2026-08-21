#!/usr/bin/env python3
"""Agrège des relevés de structure en la base versionnée `src/catalog/widgetVersions/`.

    python3 tools/build-version-database.py --surveys <dossier_de_relevés>

Chaque relevé est produit par `tools/extract-version-schema.py` à partir d'un APK
décompressé. Ce script-ci ne lit aucun APK et ne va rien chercher sur le réseau : il
assemble, compare et confronte.

## La question à laquelle la base répond

> Pour un couple *(widget, clé d'option)*, dans quelles versions de XCTrack
> existe-t-il ?

C'est le préalable à un outil de nettoyage : sans elle, on ne peut pas distinguer un
réglage devenu caduc d'un réglage parfaitement valide.

## Le palier de schéma, unité de choix

Cinquante-quatre versions, mais **bien moins de schémas distincts** : deux
constructions successives de `0.9.11.1-beta` ont le même ensemble
(widgets × clés) et sont, pour cet outil, **indiscernables**. Les proposer toutes
deux dans un menu laisserait croire à un choix qui n'en est pas un.

On regroupe donc les versions consécutives de schéma identique en **paliers**. Chaque
palier porte la version qui l'ouvre, celle qui le ferme, les versions qu'il couvre, et
le delta qui le sépare du précédent — c'est ce delta qui justifie son existence.

**Une version dont l'extraction a échoué n'entre pas dans ce calcul.** Elle n'a pas un
schéma vide : elle n'a *pas de schéma connu*. La traiter comme un ensemble vide
fabriquerait deux ruptures — une à l'entrée, une à la sortie — et donc deux paliers
qui n'existent pas. Elle est listée dans `failures`, et son entrée de version porte
`tier: null`.

## « Absente de mon extraction » n'est pas « retirée de XCTrack »

C'est la distinction dont tout dépend, et la base la matérialise par **trois** tables
séparées dans `schema.json` :

- `widgets` — ce que l'extraction a **lu** dans le bytecode, par intervalles de
  paliers. C'est une observation, pas une preuve d'absence.
- `attested` — ce que des fichiers `.xcfg` **réels** portent, là où l'extraction n'a
  rien vu, **avec la raison de l'écart** : trou du relevé (`gap`), ou reliquat qu'un
  XCTrack plus récent a conservé sans le connaître (`legacy`).
- `blind` — les clés attestées qu'**aucun** relevé, d'aucune version, n'a jamais
  retrouvées : l'extraction est aveugle de bout en bout, son silence ne dit rien.

Les deux erreurs symétriques sont aussi graves l'une que l'autre. Ne lire que
`widgets` supprimerait des réglages valides. Mais prendre toute clé observée pour une
clé existante protégerait les reliquats — et **XCTrack en conserve** : dans une même
sauvegarde de 1.0.3, sur cinq widgets cartographiques, deux portent
`mapWidget_showTerrain` et trois portent `mapWidget_panningTimeout`, jamais les deux.

## Le contrôle croisé, et pourquoi il vaut preuve

Le corpus de fichiers réels est **indépendant de l'extraction** : il vient de
l'appareil, pas du bytecode. Toute clé qu'un fichier porte a existé dans XCTrack — le
fichier en est la preuve matérielle. Pas forcément *dans la version qui l'a écrit*,
puisque XCTrack recopie ce qu'il ne comprend plus ; c'est la place de l'attestation
dans l'histoire de la clé qui départage. Chaque écart est consigné et daté, jamais
corrigé en douce.

Le corpus d'appui passé à `extract-version-schema.py` doit rester **disjoint** de
celui donné ici, sans quoi la confrontation devient circulaire.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]

# Clés techniques écrites par XCTrack sur chaque widget : ce ne sont pas des réglages.
# `UUID` identifie l'instance, les quatre autres portent sa géométrie.
NON_OPTION_KEYS = {"CLASS", "X1", "Y1", "X2", "Y2", "UUID"}
# Conteneurs d'un widget composite : ce sont des enfants, pas des options.
CONTAINER_KEYS = {"widgets", "navigations"}


# --------------------------------------------------------------------------
# Intervalles de paliers
# --------------------------------------------------------------------------

def ranges(indices: list[int]) -> str:
    """`[0,1,2,5,6]` -> `"0-2,5-6"`. Un palier isolé s'écrit `"3"`.

    Un intervalle plutôt qu'une liste : une clé présente depuis toujours coûte
    quatre caractères au lieu de cinquante."""
    if not indices:
        return ""
    parts: list[str] = []
    start = previous = indices[0]
    for index in indices[1:]:
        if index == previous + 1:
            previous = index
            continue
        parts.append(f"{start}-{previous}" if start != previous else f"{start}")
        start = previous = index
    parts.append(f"{start}-{previous}" if start != previous else f"{start}")
    return ",".join(parts)


# --------------------------------------------------------------------------
# Corpus : la vérité terrain, groupée par versionCode
# --------------------------------------------------------------------------

def corpus_by_version(directories: list[Path]) -> tuple[dict[int, dict[str, set[str]]],
                                                        dict[int, list[str]]]:
    """Rend `{versionCode: {widget: {clés observées}}}` et les fichiers de chaque version.

    Le `versionCode` est celui que XCTrack a écrit **dans le fichier** : c'est lui qui
    dit quelle version l'a produit."""
    observed: dict[int, dict[str, set[str]]] = defaultdict(lambda: defaultdict(set))
    files: dict[int, list[str]] = defaultdict(list)
    for directory in directories:
        for path in sorted(directory.glob("*.xcfg")):
            try:
                document = json.loads(path.read_text(encoding="utf-8"))
            except (ValueError, UnicodeDecodeError):
                continue
            code = _version_code(document)
            if code is None:
                continue
            files[code].append(path.name)
            _collect(document, observed[code])
    return ({code: {w: set(keys) for w, keys in widgets.items()}
             for code, widgets in observed.items()},
            dict(files))


def _version_code(node) -> int | None:
    if isinstance(node, dict):
        if isinstance(node.get("versionCode"), int):
            return node["versionCode"]
        for value in node.values():
            found = _version_code(value)
            if found is not None:
                return found
    elif isinstance(node, list):
        for value in node:
            found = _version_code(value)
            if found is not None:
                return found
    return None


def _collect(node, accumulator: dict[str, set[str]]) -> None:
    if isinstance(node, dict):
        klass = node.get("CLASS")
        if isinstance(klass, str) and ".XCTrack.widget." in klass:
            short = klass.rsplit(".", 1)[-1]
            accumulator[short].update(
                key for key in node
                if key not in NON_OPTION_KEYS and key not in CONTAINER_KEYS)
        for value in node.values():
            _collect(value, accumulator)
    elif isinstance(node, list):
        for value in node:
            _collect(value, accumulator)


# --------------------------------------------------------------------------
# Chargement des relevés
# --------------------------------------------------------------------------

# `0.9.11.11-464-g2c43a2932` : 464 commits après l'étiquette `0.9.11.11`. Le numéro
# ordonne les constructions d'une même version — l'étiquette nue vient en premier.
BUILD_RE = re.compile(r"-(\d+)-g[0-9a-f]{6,}$")


def build_number(version_name: str | None) -> int:
    match = BUILD_RE.search(version_name or "")
    return int(match.group(1)) if match else 0


def load_surveys(directory: Path) -> tuple[list[dict], list[dict]]:
    surveys: list[dict] = []
    failures: list[dict] = []
    for path in sorted(directory.glob("*.json")):
        payload = json.loads(path.read_text(encoding="utf-8"))
        if path.name.endswith(".echec.json") or "widgets" not in payload:
            failures.append({"source": payload.get("source", path.stem),
                             "reason": payload.get("error", "relevé incomplet")})
            continue
        if payload.get("versionCode") is None:
            failures.append({"source": payload.get("source", path.stem),
                             "reason": "versionCode illisible dans AndroidManifest.xml"})
            continue
        surveys.append(payload)
    # Ordre chronologique : le versionCode d'abord, puis le numéro de construction
    # quand plusieurs APK le partagent — et ils sont plusieurs à le faire.
    surveys.sort(key=lambda s: (s["versionCode"], build_number(s.get("versionName")),
                                s["source"]))
    return surveys, failures


def pairs_of(survey: dict) -> frozenset[tuple[str, str]]:
    return frozenset((widget, key)
                     for widget, keys in survey["widgets"].items()
                     for key in keys)


# Un vrai type de widget s'appelle `WCompass`, `WFL`, `WPEmpty` : un `W` puis une
# majuscule. Le reste de ce qui traîne dans les paquets `widget/w` et `widget/wp` —
# `a0`, `h`, `u0` — sont des classes auxiliaires que l'obfuscation y a rangées, et
# leur nombre varie d'une compilation à l'autre sans que rien ne change pour le
# pilote : `0.9.9.1` en compte 46, `1.0.3` aucune. Les compter fabriquerait des
# paliers entiers sur du bruit de compilateur. Le filtre est sûr : un type de widget
# ne peut pas être obfusqué, son nom est écrit en clair dans le champ `CLASS` de tout
# fichier `.xcfg` qui l'emploie.
WIDGET_CLASS_RE = re.compile(r"^W[A-Z]")


def classes_of(survey: dict) -> frozenset[str]:
    """Les types de widgets de la version, y compris ceux sans aucune option.

    `WPEmpty` et `WPMissing` n'ont rien à régler mais apparaissent dans des fichiers
    réels : une base qui ne connaîtrait que les widgets *réglables* les déclarerait
    inconnus, et un outil de nettoyage les prendrait pour des reliquats."""
    return frozenset(name
                     for group in survey.get("widgetClasses", {}).values()
                     for name in group
                     if WIDGET_CLASS_RE.match(name))


# --------------------------------------------------------------------------
# Construction
# --------------------------------------------------------------------------

def build(surveys: list[dict], failures: list[dict],
          corpus: dict[int, dict[str, set[str]]],
          corpus_files: dict[int, list[str]]) -> tuple[dict, dict]:
    # -- un même versionCode livré par plusieurs fichiers d'archive --------
    # Deux constructions du même numéro : si leur schéma est identique, elles ne font
    # qu'une version. S'il diffère, le `versionCode` n'identifie plus un schéma — et
    # c'est une information en soi, qu'on ne tait pas.
    by_code: dict[int, list[dict]] = defaultdict(list)
    for survey in surveys:
        by_code[survey["versionCode"]].append(survey)

    versions: list[dict] = []
    conflicts: list[dict] = []
    for code in sorted(by_code):
        group = by_code[code]
        # Deux versions ont le même schéma si elles acceptent les mêmes clés **et**
        # connaissent les mêmes types de widgets : une version qui n'ajoute qu'un
        # widget sans réglage change tout de même ce qu'un fichier peut contenir.
        distinct: dict[tuple, list[dict]] = defaultdict(list)
        for survey in group:
            distinct[(pairs_of(survey), classes_of(survey))].append(survey)
        if len(distinct) > 1:
            conflicts.append({
                "code": code,
                "sources": [s["source"] for s in group],
                "note": "même versionCode, schémas différents : le versionCode "
                        "n'identifie pas le schéma pour cette version",
                "pairCounts": [len(pairs) for pairs, _classes in distinct],
            })
        for (schema_pairs, schema_classes), members in distinct.items():
            versions.append({
                "code": code,
                "name": members[0]["versionName"],
                "names": [m["versionName"] for m in members],
                "sources": [m["source"] for m in members],
                "widgets": members[0]["widgets"],
                "pairs": schema_pairs,
                "classes": schema_classes,
            })

    # -- paliers : versions consécutives de schéma identique ---------------
    tiers: list[dict] = []
    for version in versions:
        if (tiers and tiers[-1]["pairs"] == version["pairs"]
                and tiers[-1]["classes"] == version["classes"]):
            tiers[-1]["versions"].append(version)
            continue
        tiers.append({"pairs": version["pairs"], "classes": version["classes"],
                      "versions": [version]})

    for index, tier in enumerate(tiers):
        for version in tier["versions"]:
            version["tier"] = index

    # -- table (widget, clé) -> intervalles de paliers ----------------------
    tier_indices: dict[tuple[str, str], list[int]] = defaultdict(list)
    widget_tiers: dict[str, list[int]] = defaultdict(list)
    for index, tier in enumerate(tiers):
        for widget, key in tier["pairs"]:
            tier_indices[(widget, key)].append(index)
        for widget in tier["classes"]:
            widget_tiers[widget].append(index)

    # Groupement par intervalle : dans un widget, la plupart des clés partagent le
    # même intervalle — les écrire une fois par clé les répéterait pour rien.
    grouped: dict[str, dict[str, list[str]]] = defaultdict(lambda: defaultdict(list))
    for (widget, key), indices in tier_indices.items():
        grouped[widget][ranges(indices)].append(key)
    schema_widgets = {
        widget: {span: sorted(keys) for span, keys in sorted(spans.items())}
        for widget, spans in sorted(grouped.items())
    }

    # -- confrontation au corpus -------------------------------------------
    # Un `versionCode` ne désigne pas toujours **un** schéma : quatre APK portent
    # 91192 avec quatre inventaires de clés différents. Un fichier `.xcfg` estampillé
    # 91192 peut donc venir de n'importe lequel — on confronte à leur réunion, et on
    # le dit. Une clé qu'aucun d'eux ne porte est attestée dans tous, par prudence :
    # mieux vaut protéger un réglage de trop qu'en supprimer un valide.
    tiers_of_code: dict[int, list[int]] = defaultdict(list)
    for version in versions:
        tiers_of_code[version["code"]].append(version["tier"])

    attested_indices: dict[tuple[str, str], list[int]] = defaultdict(list)
    corpus_report: list[dict] = []
    surveyed_codes = sorted(tiers_of_code)
    for code in sorted(corpus):
        candidates = tiers_of_code.get(code, [])
        approximate = None
        if not candidates and surveyed_codes:
            # `0.9.12.3` (91230) n'est pas dans l'archive, mais `0.9.12.3-48` (91231)
            # y est : c'est la même livraison, à quelques commits près. Confronter au
            # versionCode le plus proche vaut mieux que de ne rien confronter — et que
            # de laisser croire, par silence, que ces clés n'existent nulle part.
            approximate = min(surveyed_codes, key=lambda c: (abs(c - code), -c))
            candidates = tiers_of_code[approximate]
        known: set[tuple[str, str]] = set()
        for candidate in candidates:
            known |= tiers[candidate]["pairs"]
        classes: set[str] = set()
        for candidate in candidates:
            classes |= tiers[candidate]["classes"]
        matched = total = 0
        unmatched: dict[str, list[str]] = defaultdict(list)
        unknown_widgets: list[str] = []
        for widget, keys in sorted(corpus[code].items()):
            if candidates and widget not in classes:
                # Un type de widget qu'un fichier réel emploie et qu'aucun relevé de
                # cette version ne connaît : c'est l'extraction qui a un trou.
                unknown_widgets.append(widget)
            for key in sorted(keys):
                total += 1
                if candidates and (widget, key) in known:
                    matched += 1
                else:
                    unmatched[widget].append(key)
                    for candidate in candidates:
                        attested_indices[(widget, key)].append(candidate)
        note = None
        if not candidates:
            note = "aucun relevé pour cette version : rien à confronter"
        elif approximate is not None:
            note = (f"aucun APK ne porte le versionCode {code} : confronté au plus "
                    f"proche, {approximate}")
        elif len(candidates) > 1:
            note = (f"{len(candidates)} paliers portent ce versionCode : "
                    "la confrontation vaut pour leur réunion")
        corpus_report.append({
            "code": code,
            "tier": candidates[0] if len(candidates) == 1 else None,
            "tiers": candidates,
            # Le versionCode réellement confronté, quand ce n'est pas celui du fichier.
            "approximatedBy": approximate,
            # Le **nombre** de fichiers confrontés, jamais leurs noms : ils viennent
            # du dossier de sauvegardes d'un pilote et en portent les habitudes de
            # nommage — un prénom, celui d'un compagnon de vol. Cette base est
            # publique ; le compte suffit à dire la solidité de la confrontation.
            "fileCount": len(corpus_files.get(code, [])),
            "pairs": total,
            "matched": matched,
            "unmatched": {w: keys for w, keys in sorted(unmatched.items())},
            "unknownWidgets": sorted(unknown_widgets),
            "note": note,
        })

    # Une clé qu'un fichier porte n'existait pas forcément dans la version qui a écrit
    # ce fichier : **XCTrack conserve les clés qu'il ne connaît plus**. Le fichier de
    # sauvegarde de 1.0.3 le montre en un seul endroit — sur ses cinq widgets
    # cartographiques, deux portent `mapWidget_showTerrain` et trois portent
    # `mapWidget_panningTimeout`, jamais les deux : les deux réglages qui ont remplacé
    # l'ancien, sur les widgets refaits depuis. Confondre les deux cas rendrait la base
    # inutile — elle protégerait précisément les reliquats qu'un nettoyage doit ôter.
    #
    # On tranche par la place de l'attestation dans l'histoire de la clé :
    #
    # - `legacy` — attestée **après** le dernier palier qui la porte : c'est un
    #   reliquat, la clé a bel et bien été retirée de XCTrack. Elle est nettoyable.
    # - `gap` — attestée **avant** le premier palier qui la porte, ou dans un trou au
    #   milieu : la clé existait, l'extraction ne l'a pas vue. À ne jamais supprimer.
    # - `blind` — attestée alors qu'aucun palier ne la porte : l'extraction est
    #   aveugle de bout en bout, son silence ne dit rien. À ne jamais supprimer.
    attested: dict[str, dict[str, dict[str, str]]] = defaultdict(dict)
    blind: dict[str, list[str]] = defaultdict(list)
    for (widget, key), indices in sorted(attested_indices.items()):
        extracted = sorted(tier_indices.get((widget, key), []))
        by_kind: dict[str, list[int]] = defaultdict(list)
        for tier in sorted(set(indices)):
            if not extracted:
                by_kind["blind"].append(tier)
            elif tier > extracted[-1]:
                by_kind["legacy"].append(tier)
            else:
                by_kind["gap"].append(tier)
        attested[widget][key] = {kind: ranges(t) for kind, t in sorted(by_kind.items())}
        if not extracted:
            blind[widget].append(key)

    # -- types de contrôle des clés disparues ------------------------------
    # Le catalogue courant (`widgetOptions/base.json`) décrit les options de la
    # dernière version. Il ne dit rien de celles qui n'y sont plus : ce sont
    # justement celles qu'un outil de nettoyage rencontrera. On ne conserve donc ici
    # que celles-là, avec le type de contrôle du dernier palier qui les portait.
    last_tier = len(tiers) - 1
    controls: dict[str, dict[str, str]] = defaultdict(dict)
    for (widget, key), indices in tier_indices.items():
        if last_tier in indices:
            continue
        for index in reversed(indices):
            kind = tiers[index]["versions"][0]["widgets"].get(widget, {}).get(key)
            if kind and kind != "unknown":
                controls[widget][key] = kind
                break

    # -- deltas entre paliers ----------------------------------------------
    tier_entries: list[dict] = []
    for index, tier in enumerate(tiers):
        previous = tiers[index - 1]["pairs"] if index else frozenset()
        added = tier["pairs"] - previous
        removed = previous - tier["pairs"]
        widgets_now = tier["classes"]
        widgets_before = tiers[index - 1]["classes"] if index else frozenset()
        entry = {
            "tier": index,
            "firstCode": tier["versions"][0]["code"],
            "firstName": tier["versions"][0]["name"],
            "lastCode": tier["versions"][-1]["code"],
            "lastName": tier["versions"][-1]["name"],
            "versionCodes": [v["code"] for v in tier["versions"]],
            "releaseNames": [v["name"] for v in tier["versions"]
                             if build_number(v["name"]) == 0],
            "widgetCount": len(widgets_now),
            "pairCount": len(tier["pairs"]),
            # Le premier palier est l'origine : tout y est « apparu », et le dire
            # recopierait l'inventaire complet — quinze kilooctets pour rien, alors
            # que `schema.json` le porte déjà. Ses deltas sont donc vides, à dessein.
            "widgetsAdded": sorted(widgets_now - widgets_before) if index else [],
            "widgetsRemoved": sorted(widgets_before - widgets_now) if index else [],
            "keysAdded": _group(added) if index else {},
            "keysRemoved": _group(removed) if index else {},
        }
        tier_entries.append(entry)

    # `0.9.11.11` est une version publiée ; `0.9.11.11-326-g5df67c585` est une
    # construction intermédiaire, 326 commits plus loin. Les deux sont dans l'archive,
    # les deux ont un schéma, mais un pilote n'a jamais installé la seconde : un
    # sélecteur de version a tout intérêt à ne proposer que les premières.
    version_entries = [{"code": v["code"], "name": v["name"], "names": v["names"],
                        "sources": v["sources"], "tier": v["tier"],
                        "release": build_number(v["name"]) == 0}
                       for v in versions]

    index_payload = {
        "meta": {
            "generatedBy": "tools/build-version-database.py",
            "versionCount": len(version_entries),
            "tierCount": len(tiers),
            "failureCount": len(failures),
            "oldest": version_entries[0]["name"] if version_entries else None,
            "newest": version_entries[-1]["name"] if version_entries else None,
        },
        "versions": version_entries,
        "tiers": tier_entries,
        # Une version qu'on n'a pas su lire n'a pas un schéma vide : elle n'a pas de
        # schéma connu. Elle est exclue des paliers et déclarée ici.
        "failures": sorted(failures, key=lambda f: f["source"]),
        "versionCodeConflicts": conflicts,
        "corpus": corpus_report,
    }

    schema_payload = {
        "tierCount": len(tiers),
        # Ce que l'extraction a lu, par intervalles de paliers.
        "widgets": schema_widgets,
        "widgetTiers": {w: ranges(sorted(i)) for w, i in sorted(widget_tiers.items())},
        # Ce que des fichiers réels prouvent, là où l'extraction n'a rien vu.
        "attested": {w: dict(sorted(k.items())) for w, k in sorted(attested.items())},
        # Attestées, jamais extraites nulle part : l'extraction est aveugle sur elles.
        "blind": {w: sorted(k) for w, k in sorted(blind.items())},
        # Type de contrôle des clés absentes du dernier palier, que le catalogue
        # courant ne décrit plus.
        "controls": {w: dict(sorted(k.items())) for w, k in sorted(controls.items())},
    }
    return index_payload, schema_payload


def _group(pairs) -> dict[str, list[str]]:
    out: dict[str, list[str]] = defaultdict(list)
    for widget, key in sorted(pairs):
        out[widget].append(key)
    return dict(out)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--surveys", type=Path, required=True,
                        help="dossier des relevés produits par extract-version-schema.py")
    parser.add_argument("--corpus", type=Path, nargs="*", default=None,
                        help="dossiers de fichiers .xcfg réels, pour le contrôle croisé")
    parser.add_argument("--out", type=Path,
                        default=PROJECT_ROOT / "src" / "catalog" / "widgetVersions",
                        help="dossier de sortie de la base")
    args = parser.parse_args()

    surveys, failures = load_surveys(args.surveys)
    if not surveys:
        sys.exit(f"Aucun relevé exploitable dans {args.surveys}")
    corpus, corpus_files = corpus_by_version(args.corpus or [])

    index_payload, schema_payload = build(surveys, failures, corpus, corpus_files)

    args.out.mkdir(parents=True, exist_ok=True)
    index_path = args.out / "index.json"
    schema_path = args.out / "schema.json"
    index_path.write_text(json.dumps(index_payload, ensure_ascii=False,
                                     separators=(",", ":")) + "\n", encoding="utf-8")
    schema_path.write_text(json.dumps(schema_payload, ensure_ascii=False,
                                      separators=(",", ":")) + "\n", encoding="utf-8")

    print(f"Relevés    : {len(surveys)} ; échecs : {len(failures)}")
    print(f"Versions   : {index_payload['meta']['versionCount']} "
          f"({index_payload['meta']['oldest']} -> {index_payload['meta']['newest']})")
    print(f"Paliers    : {index_payload['meta']['tierCount']}")
    print(f"index.json : {index_path.stat().st_size:,} octets")
    print(f"schema.json: {schema_path.stat().st_size:,} octets")
    for report in index_payload["corpus"]:
        gap = sum(len(v) for v in report["unmatched"].values())
        print(f"  corpus {report['code']} (paliers {report['tiers']}) : "
              f"{report['matched']}/{report['pairs']}"
              + (f" — {gap} non retrouvées" if gap else " — accord complet"))
    if index_payload["failures"]:
        print("\nÉchecs :")
        for failure in index_payload["failures"]:
            print(f"  - {failure['source']} : {failure['reason']}")
    if index_payload["versionCodeConflicts"]:
        print("\nversionCode partagés par des schémas différents :")
        for conflict in index_payload["versionCodeConflicts"]:
            print(f"  - {conflict['code']} : {conflict['sources']} {conflict['pairCounts']}")


if __name__ == "__main__":
    main()
