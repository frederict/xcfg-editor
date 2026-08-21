#!/usr/bin/env python3
"""Agrège des relevés de version en la base `src/catalog/preferenceVersions/`.

    python3 tools/build-preference-database.py --surveys <dossier_de_relevés> \
        [--corpus <dossier de .xcfg réels>...]

C'est le **pendant exact** de `tools/build-version-database.py` du côté des
préférences générales. Là où celui-là répond « ce couple *(widget, clé d'option)*
existe-t-il ? », celui-ci répond :

> Pour une **clé de préférence**, dans quelles versions de XCTrack existe-t-elle ?

Même matière (les relevés de `tools/extract-version-schema.py`), même unité de choix
(le **palier**), mêmes trois natures d'attestation (`gap`, `legacy`, `blind`), et
aucune lecture d'APK ni du réseau : ce script assemble, compare et confronte.

## Le palier est défini par les clés, et par elles seules

Cinquante-cinq relevés, quarante-sept schémas distincts, **vingt-deux paliers**. Deux
versions consécutives qui lisent exactement les mêmes clés sont indiscernables pour un
outil de nettoyage : les distinguer dans un menu laisserait croire à un choix qui n'en
est pas un.

**La portée (`PUBLIC`/`INTERNAL`/`SECURE`) n'entre pas dans la signature d'un palier,
et c'est mesuré, pas décrété.** Dix relevés — de `0.9.9.1-beta-1` à `0.9.10.3-15` —
n'ont pas su identifier l'énumération de portée (`preferenceMeta.scopeEnum` y est
vide) et rendent alors **tout** en `PUBLIC` : 212 clés sur 212 pour `0.9.10-beta`, là
où ses voisines en comptent 142 à 158. Bâtir les paliers sur la portée fabriquerait
donc deux ruptures massives — 52 clés qui passent `INTERNAL` → `PUBLIC` en `0.9.9.1`,
56 qui repassent `PUBLIC` → `INTERNAL` en `0.9.11.1` — dont aucune n'a eu lieu dans
XCTrack. Les versions concernées portent `scopeRead: false` dans `index.json` ; rien
en aval n'a le droit de croire leur portée.

Vérification faite, les paliers sont les mêmes avec ou sans la portée : les vraies
ruptures de clés tombent aux mêmes endroits.

## Une version qu'on n'a pas su lire n'a pas un schéma vide

Elle n'a **pas de schéma connu**. La compter comme un ensemble vide fabriquerait deux
paliers qui n'existent pas — une rupture à l'entrée, une à la sortie. Elle est listée
dans `failures`, et rien d'autre.

Un relevé est rejeté si sa section `preferences` n'a pas abouti (`sections` la déclare
autrement que `ok`), si elle est vide, ou si son `versionCode` est illisible. **Le
script s'arrête alors sans rien écrire** dès qu'un relevé est refusé pour une raison
qui ressemble à un accident d'outillage plutôt qu'à une version rétive : voir
`--tolerate-failures`. La règle vient d'un vrai dégât : un extracteur qui reconnaissait
une énumération par égalité stricte a perdu 67 clés sans rien dire le jour où
`0.9.6.2` a ajouté une quatrième constante. Un résultat amputé qui se tait est pire
qu'une erreur bruyante.

## « Absente de mon relevé » n'est pas « retirée de XCTrack »

Trois tables séparées, comme pour les widgets :

- `preferences` — ce que l'extraction a **lu**, par intervalles de paliers. Une
  observation, pas une preuve d'absence.
- `attested` — ce que des fichiers `.xcfg` réels portent là où le relevé n'a rien vu,
  **avec la raison** : trou du relevé (`gap`), ou reliquat qu'un XCTrack plus récent a
  recopié sans le connaître (`legacy`).
- `blind` — attestées quelque part, retrouvées dans aucun palier : l'extraction est
  aveugle de bout en bout, son silence ne dit rien.

Le corpus le prouve en deux points, et ce sont deux cas opposés :

- `Sensors.ExtTypes` est lue jusqu'à `0.9.8.7` (palier 5) et plus jamais après. Un
  fichier de `0.9.9.1` (palier 6) la porte encore : **c'est un reliquat**, et c'est
  exactement ce qu'un nettoyage doit ôter.
- `Sound.AcousticVario.CustomProfile` n'est lue qu'à partir de `1.0.0` (palier 18),
  et pourtant deux fichiers de 2023 et 2024 la portent : **c'est notre relevé qui a un
  trou**, la clé existait. À ne jamais supprimer.

Une base qui traiterait ces deux cas de la même façon serait inutile dans les deux
sens : elle protégerait le reliquat, ou supprimerait la clé valide.

## Le contrôle croisé, et pourquoi il vaut preuve

Le corpus de `.xcfg` réels est **indépendant** des relevés : il vient de l'appareil,
pas du bytecode. Toute clé qu'un fichier porte a existé dans XCTrack. Pas forcément
dans la version qui a écrit ce fichier — c'est la place de l'attestation dans
l'histoire de la clé qui départage.

Les exports de **pages** (`layout` sans `preferences`) ne portent aucune préférence :
ils sont comptés à part (`corpusSkipped`) et non tus, pour qu'on ne prenne pas leur
silence pour un accord.

## Ce qui ne sort pas d'ici

La base est destinée au dépôt public ; le corpus, non. **Aucun nom de fichier du
corpus n'entre dans la sortie** — seulement leur nombre. Ce n'est pas de la pudeur
mal placée : les fichiers d'un corpus réel s'appellent `2022-02-08_marie_ok.xcfg` ou
`2022-09-24_00_luc.xcfg`, et publier ces noms publie le prénom du pilote et celui
d'un tiers. Le décompte porte toute l'information utile — combien de fichiers
appuient la confrontation — sans porter personne.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]


# --------------------------------------------------------------------------
# Intervalles de paliers — même écriture que la base des widgets
# --------------------------------------------------------------------------

def ranges(indices: list[int]) -> str:
    """`[0,1,2,5,6]` -> `"0-2,5-6"`. Un palier isolé s'écrit `"3"`."""
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
# Chargement des relevés
# --------------------------------------------------------------------------

# `0.9.11.11-464-g2c43a2932` : 464 commits après l'étiquette `0.9.11.11`. Le numéro
# ordonne les constructions d'une même version — l'étiquette nue vient en premier.
BUILD_RE = re.compile(r"-(\d+)-g[0-9a-f]{6,}$")


def build_number(version_name: str | None) -> int:
    match = BUILD_RE.search(version_name or "")
    return int(match.group(1)) if match else 0


def load_surveys(directory: Path) -> tuple[list[dict], list[dict]]:
    """Rend les relevés exploitables et la liste motivée des autres.

    Un relevé n'est écarté que pour une raison **écrite** : le `versionCode` illisible,
    la section `preferences` en échec, ou une table de préférences vide. Un fichier de
    textes (`*.textes.json.gz`) n'est pas un relevé et n'est pas compté comme un échec.
    """
    surveys: list[dict] = []
    failures: list[dict] = []
    for path in sorted(directory.glob("*.json")):
        if path.name.endswith(".textes.json"):
            continue
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (ValueError, UnicodeDecodeError) as error:
            failures.append({"source": path.name, "reason": f"illisible : {error}"})
            continue
        source = payload.get("source", path.stem)
        sections = payload.get("sections") or {}
        state = sections.get("preferences")
        preferences = payload.get("preferences")
        if payload.get("versionCode") is None:
            failures.append({"source": source,
                             "reason": "versionCode illisible dans AndroidManifest.xml"})
        elif state is not None and state != "ok":
            failures.append({"source": source,
                             "reason": f"section preferences en échec : {state}"})
        elif not isinstance(preferences, dict) or not preferences:
            failures.append({"source": source,
                             "reason": "aucune préférence relevée"})
        else:
            surveys.append(payload)
    surveys.sort(key=lambda s: (s["versionCode"], build_number(s.get("versionName")),
                                s["source"]))
    return surveys, failures


def keys_of(survey: dict) -> frozenset[str]:
    return frozenset(survey["preferences"])


def scope_read(survey: dict) -> bool:
    """La portée de cette version a-t-elle vraiment été lue ?

    `preferenceMeta.scopeEnum` nomme l'énumération de portée trouvée dans le bytecode.
    Vide, l'extraction n'a rien trouvé et rend `PUBLIC` par défaut pour tout le monde —
    ce qui est faux, et se voit : 212 clés `PUBLIC` sur 212 pour `0.9.10-beta`."""
    return bool((survey.get("preferenceMeta") or {}).get("scopeEnum"))


# --------------------------------------------------------------------------
# Corpus : la vérité terrain
# --------------------------------------------------------------------------

def corpus_by_version(directories: list[Path]) -> tuple[dict[int, set[str]],
                                                        dict[int, int],
                                                        list[dict]]:
    """Rend `{versionCode: {clés observées}}`, un **décompte** de fichiers, et les écartés.

    Le `versionCode` est celui qu'`info` porte **dans le fichier** : c'est lui qui dit
    quelle version l'a produit. Les noms de fichiers restent dans le message d'erreur
    et n'entrent jamais dans la sortie — voir l'en-tête."""
    observed: dict[int, set[str]] = defaultdict(set)
    counts: dict[int, int] = defaultdict(int)
    skipped: list[dict] = []
    for directory in directories:
        for path in sorted(directory.glob("*.xcfg")):
            try:
                document = json.loads(path.read_text(encoding="utf-8"))
            except (ValueError, UnicodeDecodeError):
                skipped.append({"reason": "illisible"})
                continue
            if not isinstance(document, dict):
                skipped.append({"reason": "racine non objet"})
                continue
            code = (document.get("info") or {}).get("versionCode")
            preferences = document.get("preferences")
            if not isinstance(code, int):
                skipped.append({"reason": "versionCode absent d'info"})
                continue
            if not isinstance(preferences, dict):
                # Un export de **pages** ne porte aucune préférence : ce n'est pas un
                # accord, c'est un silence. On le dit plutôt que de le compter.
                skipped.append({"reason": "export sans section preferences (export de pages)"})
                continue
            observed[code] |= set(preferences)
            counts[code] += 1
    return dict(observed), dict(counts), skipped


# --------------------------------------------------------------------------
# Construction
# --------------------------------------------------------------------------

# Ce que la base retient d'une clé qui a disparu du dernier palier : le catalogue
# courant (`preferenceCatalog/base.json`) ne la décrit plus, et c'est pourtant celle
# qu'un nettoyage rencontrera.
RETIRED_FIELDS = ("scope", "valueKind", "control", "label", "family", "personal")


def build(surveys: list[dict], failures: list[dict],
          corpus: dict[int, set[str]], corpus_files: dict[int, int],
          corpus_skipped: list[dict]) -> tuple[dict, dict]:
    # -- un même versionCode livré par plusieurs archives -------------------
    by_code: dict[int, list[dict]] = defaultdict(list)
    for survey in surveys:
        by_code[survey["versionCode"]].append(survey)

    versions: list[dict] = []
    conflicts: list[dict] = []
    for code in sorted(by_code):
        group = by_code[code]
        distinct: dict[frozenset[str], list[dict]] = defaultdict(list)
        for survey in group:
            distinct[keys_of(survey)].append(survey)
        if len(distinct) > 1:
            conflicts.append({
                "code": code,
                "sources": [s["source"] for s in group],
                "note": "même versionCode, inventaires de clés différents : le "
                        "versionCode n'identifie pas le schéma pour cette version",
                "keyCounts": sorted(len(keys) for keys in distinct),
            })
        for keys, members in distinct.items():
            versions.append({
                "code": code,
                "name": members[0]["versionName"],
                "names": [m["versionName"] for m in members],
                "sources": [m["source"] for m in members],
                "keys": keys,
                "scopeRead": all(scope_read(m) for m in members),
                "entries": members[0]["preferences"],
            })

    # -- paliers : versions consécutives de même inventaire -----------------
    tiers: list[dict] = []
    for version in versions:
        if tiers and tiers[-1]["keys"] == version["keys"]:
            tiers[-1]["versions"].append(version)
            continue
        tiers.append({"keys": version["keys"], "versions": [version]})
    for index, tier in enumerate(tiers):
        for version in tier["versions"]:
            version["tier"] = index

    # -- table clé -> intervalles de paliers --------------------------------
    tier_indices: dict[str, list[int]] = defaultdict(list)
    for index, tier in enumerate(tiers):
        for key in tier["keys"]:
            tier_indices[key].append(index)

    # Groupement par intervalle : la plupart des clés partagent le même — les écrire
    # une fois par clé les répéterait pour rien.
    grouped: dict[str, list[str]] = defaultdict(list)
    for key, indices in tier_indices.items():
        grouped[ranges(indices)].append(key)
    schema_preferences = {span: sorted(keys) for span, keys in sorted(grouped.items())}

    # -- confrontation au corpus -------------------------------------------
    tiers_of_code: dict[int, list[int]] = defaultdict(list)
    for version in versions:
        tiers_of_code[version["code"]].append(version["tier"])

    attested_indices: dict[str, list[int]] = defaultdict(list)
    corpus_report: list[dict] = []
    surveyed_codes = sorted(tiers_of_code)
    for code in sorted(corpus):
        candidates = tiers_of_code.get(code, [])
        approximate = None
        if not candidates and surveyed_codes:
            # `0.9.12.3` (91230) n'est dans aucune archive, mais `0.9.12.3-48` (91231)
            # y est : la même livraison à quelques commits près. Confronter au plus
            # proche vaut mieux que de laisser croire, par silence, que ces 148 clés
            # n'existent nulle part.
            approximate = min(surveyed_codes, key=lambda c: (abs(c - code), -c))
            candidates = tiers_of_code[approximate]
        known: set[str] = set()
        for candidate in candidates:
            known |= tiers[candidate]["keys"]
        matched = 0
        unmatched: list[str] = []
        for key in sorted(corpus[code]):
            if candidates and key in known:
                matched += 1
            else:
                unmatched.append(key)
                for candidate in candidates:
                    attested_indices[key].append(candidate)
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
            "approximatedBy": approximate,
            # Un décompte, jamais des noms : voir l'en-tête.
            "fileCount": corpus_files.get(code, 0),
            "keys": len(corpus[code]),
            "matched": matched,
            "unmatched": unmatched,
            "note": note,
        })

    # -- nature de chaque attestation --------------------------------------
    # `legacy` — attestée **après** le dernier palier qui la lit : la clé a été
    #   retirée de XCTrack et le fichier en traîne une copie. Nettoyable.
    # `gap`    — attestée **avant** le premier palier qui la lit, ou dans un trou au
    #   milieu : la clé existait, c'est le relevé qui l'a manquée. Jamais supprimable.
    # `blind`  — aucun palier ne la lit : rien à conclure de notre silence.
    attested: dict[str, dict[str, str]] = {}
    blind: list[str] = []
    for key, indices in sorted(attested_indices.items()):
        extracted = sorted(tier_indices.get(key, []))
        by_kind: dict[str, list[int]] = defaultdict(list)
        for tier in sorted(set(indices)):
            if not extracted:
                by_kind["blind"].append(tier)
            elif tier > extracted[-1]:
                by_kind["legacy"].append(tier)
            else:
                by_kind["gap"].append(tier)
        attested[key] = {kind: ranges(t) for kind, t in sorted(by_kind.items())}
        if not extracted:
            blind.append(key)

    # -- ce que le catalogue courant ne décrit plus ------------------------
    last_tier = len(tiers) - 1
    retired: dict[str, dict] = {}
    for key, indices in sorted(tier_indices.items()):
        if last_tier in indices:
            continue
        for index in reversed(indices):
            entry = tiers[index]["versions"][0]["entries"].get(key)
            if entry is None:
                continue
            kept = {field: entry[field] for field in RETIRED_FIELDS
                    if entry.get(field) is not None}
            # La portée d'une version dont l'énumération n'a pas été lue ne vaut rien.
            if not tiers[index]["versions"][0]["scopeRead"]:
                kept.pop("scope", None)
            kept["lastTier"] = index
            retired[key] = kept
            break

    # -- deltas entre paliers ----------------------------------------------
    tier_entries: list[dict] = []
    for index, tier in enumerate(tiers):
        previous = tiers[index - 1]["keys"] if index else frozenset()
        scoped = [v for v in tier["versions"] if v["scopeRead"]]
        tier_entries.append({
            "tier": index,
            "firstCode": tier["versions"][0]["code"],
            "firstName": tier["versions"][0]["name"],
            "lastCode": tier["versions"][-1]["code"],
            "lastName": tier["versions"][-1]["name"],
            "versionCodes": [v["code"] for v in tier["versions"]],
            "releaseNames": [v["name"] for v in tier["versions"]
                             if build_number(v["name"]) == 0],
            "keyCount": len(tier["keys"]),
            # Combien de clés le relevé déclare `PUBLIC` — `null` quand aucune version
            # du palier n'a livré de portée lisible. C'est un **minorant** du nombre de
            # clés qu'un export `backup` porte : le relevé ne voit pas les préférences
            # dont la clé est posée par leur constructeur, et il en manque une au
            # dernier palier (`SafeSky.Interval`, 135 relevées pour 136 dans le fichier
            # de référence de 1.0.3).
            "publicCount": (
                sum(1 for entry in scoped[0]["entries"].values()
                    if entry.get("scope") == "PUBLIC") if scoped else None),
            # Le premier palier est l'origine : tout y est « apparu », et le dire
            # recopierait l'inventaire que `schema.json` porte déjà.
            "keysAdded": sorted(tier["keys"] - previous) if index else [],
            "keysRemoved": sorted(previous - tier["keys"]) if index else [],
        })

    version_entries = [{"code": v["code"], "name": v["name"], "names": v["names"],
                        "sources": v["sources"], "tier": v["tier"],
                        "release": build_number(v["name"]) == 0,
                        "scopeRead": v["scopeRead"]}
                       for v in versions]

    index_payload = {
        "meta": {
            "generatedBy": "tools/build-preference-database.py",
            "versionCount": len(version_entries),
            "tierCount": len(tiers),
            "failureCount": len(failures),
            "keyCount": len(tier_indices),
            "oldest": version_entries[0]["name"] if version_entries else None,
            "newest": version_entries[-1]["name"] if version_entries else None,
        },
        "versions": version_entries,
        "tiers": tier_entries,
        "failures": sorted(failures, key=lambda f: f["source"]),
        "versionCodeConflicts": conflicts,
        "corpus": corpus_report,
        # Les fichiers du corpus qui ne portent pas de préférences : un export de
        # pages n'est pas un accord, c'est un silence. Un décompte par raison.
        "corpusSkipped": [{"reason": reason, "fileCount": count} for reason, count
                          in sorted(Counter(s["reason"] for s in corpus_skipped).items())],
    }

    schema_payload = {
        "tierCount": len(tiers),
        # Ce que l'extraction a lu, par intervalles de paliers.
        "preferences": schema_preferences,
        # Ce que des fichiers réels prouvent, là où l'extraction n'a rien vu.
        "attested": attested,
        # Attestées, extraites nulle part : l'absence ne prouve rien.
        "blind": sorted(blind),
        # Ce que le catalogue courant ne décrit plus, faute d'exister encore.
        "retired": retired,
    }
    return index_payload, schema_payload


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--surveys", type=Path, required=True,
                        help="dossier des relevés produits par extract-version-schema.py")
    parser.add_argument("--corpus", type=Path, nargs="*", default=None,
                        help="dossiers de fichiers .xcfg réels, pour le contrôle croisé")
    parser.add_argument("--out", type=Path,
                        default=PROJECT_ROOT / "src" / "catalog" / "preferenceVersions",
                        help="dossier de sortie de la base")
    parser.add_argument("--tolerate-failures", type=int, default=0,
                        help="nombre de relevés refusés qu'on accepte sans s'arrêter ; "
                             "au-delà, rien n'est écrit")
    args = parser.parse_args()

    surveys, failures = load_surveys(args.surveys)
    if not surveys:
        sys.exit(f"Aucun relevé exploitable dans {args.surveys}")
    if len(failures) > args.tolerate_failures:
        for failure in failures:
            print(f"  - {failure['source']} : {failure['reason']}", file=sys.stderr)
        sys.exit(f"{len(failures)} relevé(s) refusé(s) pour au plus "
                 f"{args.tolerate_failures} toléré(s) : rien n'a été écrit. "
                 "Un résultat amputé qui se tait vaut moins qu'une erreur bruyante.")

    corpus, corpus_files, corpus_skipped = corpus_by_version(args.corpus or [])
    index_payload, schema_payload = build(surveys, failures, corpus, corpus_files,
                                          corpus_skipped)

    args.out.mkdir(parents=True, exist_ok=True)
    index_path = args.out / "index.json"
    schema_path = args.out / "schema.json"
    index_path.write_text(json.dumps(index_payload, ensure_ascii=False,
                                     separators=(",", ":")) + "\n", encoding="utf-8")
    schema_path.write_text(json.dumps(schema_payload, ensure_ascii=False,
                                      separators=(",", ":")) + "\n", encoding="utf-8")

    print(f"Relevés    : {len(surveys)} ; refusés : {len(failures)}")
    print(f"Versions   : {index_payload['meta']['versionCount']} "
          f"({index_payload['meta']['oldest']} -> {index_payload['meta']['newest']})")
    print(f"Paliers    : {index_payload['meta']['tierCount']} ; "
          f"clés distinctes : {index_payload['meta']['keyCount']}")
    unread = [v["name"] for v in index_payload["versions"] if not v["scopeRead"]]
    if unread:
        print(f"Portée non lue pour {len(unread)} version(s) : "
              f"{unread[0]} -> {unread[-1]}")
    print(f"index.json : {index_path.stat().st_size:,} octets")
    print(f"schema.json: {schema_path.stat().st_size:,} octets")
    for report in index_payload["corpus"]:
        gap = len(report["unmatched"])
        print(f"  corpus {report['code']} (paliers {report['tiers']}) : "
              f"{report['matched']}/{report['keys']}"
              + (f" — {gap} non retrouvée(s) : {', '.join(report['unmatched'][:4])}"
                 if gap else " — accord complet"))
    for kind, keys in (("legacy", [k for k, v in schema_payload["attested"].items()
                                   if "legacy" in v]),
                       ("gap", [k for k, v in schema_payload["attested"].items()
                                if "gap" in v]),
                       ("blind", schema_payload["blind"])):
        print(f"  {kind:6s} : {len(keys)} {keys}")
    for skipped in index_payload["corpusSkipped"]:
        print(f"  corpus écarté : {skipped['fileCount']} fichier(s) — "
              f"{skipped['reason']}")
    if index_payload["versionCodeConflicts"]:
        print("\nversionCode partagés par des inventaires différents :")
        for conflict in index_payload["versionCodeConflicts"]:
            print(f"  - {conflict['code']} : {conflict['sources']} "
                  f"{conflict['keyCounts']}")


if __name__ == "__main__":
    main()
