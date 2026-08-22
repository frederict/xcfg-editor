import type { DomainCatalog } from '../../domains'

/**
 * Les versions relevées et le nettoyage — voir `fr/versions.ts`.
 *
 * Les trois statuts : *veraltet*, *blinder Fleck*, *unbekannt*. « angle mort » se dit
 * **blinder Fleck** quand il s'agit de ce qu'on ne perçoit pas — c'est le cas ici : le
 * trou est dans notre lecture. *Toter Winkel*, l'angle mort du rétroviseur, est spatial
 * et ne convient pas.
 */
const versions: DomainCatalog<'versions'> = {
  'versions.publishedCount': {
    one: '{count} veröffentlichte Version',
    other: '{count} veröffentlichte Versionen'
  },

  /* ------------------------------------------------- les statuts : le mot du bandeau */

  'versions.badgeOutdated': 'veraltet',
  'versions.badgeReadBefore': 'nur früher gelesen',
  'versions.badgeAppearedLater': 'später erschienen',
  'versions.badgeBlindSpot': 'blinder Fleck',
  'versions.badgeUnknown': 'unbekannt',
  'versions.badgeUnknownWidget': 'unbekanntes Widget',
  'versions.badgeRecognized': 'erkannt',

  /* ----------------------------------------- les huit cas : titre, constat, et verdict */

  /** ⚠️ Voir le commentaire du français : « liest sie nicht mehr » était faux. */
  'versions.titleLegacy': 'Veraltete Einstellungen: die angepeilte Version schreibt sie nicht mehr',
  'versions.evidenceLegacy': 'Wir lesen diese Einstellungen in älteren Versionen, in dieser nicht mehr — und echte Dateien, die von eben dieser Version geschrieben wurden, tragen sie trotzdem. XCTrack behält den Text einer Seite, solange es sie nicht angezeigt hat: hier haben wir es geschehen sehen, wir vermuten es nicht.',
  'versions.verdictLegacy': 'Das ist die einzige Feststellung dieser Diagnose, die eine echte Datei bestätigt, und die einzige, bei der sich ein Entfernen vertreten lässt. Jede Einstellung wird danach einzeln abgewogen: die, deren Entfernen ändern würde, was Ihr Gerät anzeigt, bleiben bestehen.',

  'versions.titlePastOnly': 'Nur von älteren Versionen gelesen',
  'versions.evidencePastOnly': 'Wir lesen diese Einstellungen in älteren Versionen, in der angepeilten nicht mehr. Aber keine echte Datei bestätigt es: wir haben hier nur unsere Lesung der Versionen, ohne das Beispiel, das sie prüft.',
  'versions.verdictPastOnly': 'Allein unsere Lesung würde sie veraltet nennen, und keine echte Datei bestätigt das: das Werkzeug bietet hier also nichts an. Nichts sagt, dass XCTrack sie entfernt hätte — wir lesen sie dort bloß nicht mehr.',

  'versions.titleFutureOnly': 'Nach der angepeilten Version erschienen',
  'versions.evidenceFutureOnly': 'Wir lesen diese Einstellungen nur in Versionen, die neuer sind als die angepeilte. Diese Datei stammt also aus einer neueren Version als der hier gewählten.',
  'versions.verdictFutureOnly': 'Nicht entfernen. Die angepeilte Version übergeht sie; eine neuere findet sie unversehrt wieder.',

  'versions.titleStraddled': 'Davor und danach gelesen, aber nicht von der angepeilten Version',
  'versions.evidenceStraddled': 'Wir lesen diese Einstellungen in den Versionen davor und in denen danach, und genau hier entgehen sie uns. Eine Einstellung, die verschwände, um unverändert zurückzukehren, wäre eine Merkwürdigkeit; am einfachsten ist, dass unsere Lesung an dieser Stelle eine Lücke hat.',
  'versions.verdictStraddled': 'Nicht entfernen. Die Lücke liegt bei uns, nicht in Ihrer Datei.',

  'versions.titleNeverRead': 'Unbekannt: keine Version, die wir gelesen haben, liest sie',
  'versions.evidenceNeverRead': 'Keine der XCTrack-Versionen, die wir lesen konnten, trägt diese Einstellung auf diesem Widget, und keine echte Datei zeigt sie dort. Wir wissen nicht, woher sie kommt.',
  'versions.verdictNeverRead': 'Wir wissen es nicht. Das ist kein Beweis, dass die Einstellung veraltet wäre — nur dafür, dass wir sie nicht kennen.',

  'versions.titleGap': 'Unsere Lesung hat eine Lücke: die Einstellung gab es sehr wohl',
  'versions.evidenceGap': 'Wir haben diese Einstellungen in jener Version nicht gesehen, aber wir lesen sie in neueren, und eine echte Datei, die von ihr geschrieben wurde, trägt sie. Die Einstellung gab es: wir sind es, die sie übersehen haben.',
  'versions.verdictGap': 'Niemals entfernen. Das sind gültige Einstellungen, und sie für veraltete zu halten würde Ihre löschen.',

  'versions.titleBlind': 'Einstellungen, die wir nirgends sehen',
  'versions.evidenceBlind': 'Echte Dateien tragen sie, und keine Version, die wir lesen konnten, führt sie auf. Wir sehen sie nirgends, und unser Schweigen sagt nichts über sie.',
  'versions.verdictBlind': 'Nichts zu schließen. Auf dieser Grundlage nicht entfernen.',

  'versions.titleUnknownWidget': 'Widgets, welche die angepeilte Version nicht kennt',
  'versions.evidenceUnknownWidget': 'Diese Art von Widget kommt in dem, was wir von dieser Version gelesen haben, nicht vor. Wir wissen also nichts über seine Einstellungen: ein Widget, das wir nie gesehen haben, ist kein entferntes Widget.',
  'versions.verdictUnknownWidget': 'Nichts über seine Einstellungen zu schließen.',

  /* ------------------------------------------------------ où le gadget se trouve */

  'versions.placePortrait': 'Hochformat · Seite {page} · Rang {rank} · {name}',
  'versions.placeLandscape': 'Querformat · Seite {page} · Rang {rank} · {name}',

  /* -------------------------------------------------------------- le choix de version */

  'versions.panelLabel': 'Angepeilte Version und Verträglichkeit',
  'versions.targetLabel': 'Die XCTrack-Version, die Sie anpeilen',
  'versions.noVersionOption': '— keine Version gewählt —',
  'versions.groupWriter': 'Die Version, die diese Datei geschrieben hat',
  'versions.groupCandidates': 'Die Versionen, die diese Datei meinen kann',
  'versions.groupNearestOne': 'Die Version, die der dieser Datei am nächsten kommt',
  'versions.groupNearestSeveral': 'Die Versionen, die der dieser Datei am nächsten kommen',
  'versions.groupPublished': 'Veröffentlichte Versionen, von der neuesten zur ältesten',
  'versions.groupDevelopment': 'Entwicklungsversionen, nie veröffentlicht',

  'versions.unknownVersion': 'unbekannte Version',
  'versions.buildLabel': '{release} (Build {build})',

  /* ------------------------------------------------- d'où vient la version proposée */

  'versions.declaredByCode': 'Version {code}',
  'versions.declaredByName': 'XCTrack {release} (Nummer {code})',

  'versions.messageUndeclared': 'Diese Datei sagt nicht, aus welcher XCTrack-Version sie stammt: sie trägt ihre Versionsnummer nicht. Nichts erlaubt es, eine vorzuschlagen — wählen Sie die des Geräts, in das Sie diese Datei wieder einlesen werden.',

  'versions.messageExact': 'Diese Datei wurde von {declared} geschrieben. Sie ist es, die unten angepeilt wird, und Sie können eine andere wählen.',

  'versions.messageExactPinned': {
    one: 'Diese Datei wurde von {declared} geschrieben. {count} Version trägt diese Nummer; der Name, den die Datei angibt, bezeichnet nur eine davon. Sie ist es, die unten angepeilt wird, und Sie können eine andere wählen.',
    other: 'Diese Datei wurde von {declared} geschrieben. {count} Versionen tragen diese Nummer; der Name, den die Datei angibt, bezeichnet nur eine davon. Sie ist es, die unten angepeilt wird, und Sie können eine andere wählen.'
  },

  'versions.messageAmbiguous': {
    one: 'Diese Datei wurde von {declared} geschrieben. {count} Version trägt diese Nummer, ohne dieselben Einstellungen anzunehmen, und die Datei sagt nicht, welche sie geschrieben hat. Wir peilen die neueste an, {version} — eine willkürliche Wahl, zu der wir stehen: jede Bemerkung, die sich unter einer der anderen ändern würde, wird unten gemeldet.',
    other: 'Diese Datei wurde von {declared} geschrieben. {count} Versionen tragen diese Nummer, ohne dieselben Einstellungen anzunehmen, und die Datei sagt nicht, welche sie geschrieben hat. Wir peilen die neueste an, {version} — eine willkürliche Wahl, zu der wir stehen: jede Bemerkung, die sich unter einer der anderen ändern würde, wird unten gemeldet.'
  },

  'versions.messageApproximated': 'Diese Datei wurde von {declared} geschrieben, die keine erfasste Version trägt. Wir weichen auf die nächstgelegene Nummer aus, {code} — es ist nicht dieselbe Version, es ist die nächstgelegene, die wir lesen konnten. Wir peilen {version} an.',

  'versions.messageApproximatedSeveral': {
    one: 'Diese Datei wurde von {declared} geschrieben, die keine erfasste Version trägt. Wir weichen auf die nächstgelegene Nummer aus, {code} — es ist nicht dieselbe Version, es ist die nächstgelegene, die wir lesen konnten. Diese Nummer deckt selbst {count} Version ab; wir peilen die neueste an, {version}, und melden unten jede Bemerkung, die sich unter einer anderen ändern würde.',
    other: 'Diese Datei wurde von {declared} geschrieben, die keine erfasste Version trägt. Wir weichen auf die nächstgelegene Nummer aus, {code} — es ist nicht dieselbe Version, es ist die nächstgelegene, die wir lesen konnten. Diese Nummer deckt selbst {count} Versionen ab; wir peilen die neueste an, {version}, und melden unten jede Bemerkung, die sich unter einer anderen ändern würde.'
  },

  'versions.messageUnrecognized': {
    one: 'Diese Datei wurde von {declared} geschrieben, die wir nicht kennen: wir konnten {count} XCTrack-Version lesen, und diese gehört nicht dazu. Wir schlagen keine vor — eine auf gut Glück zu benennen hieße erfinden. Wählen Sie die Ihres Geräts.',
    other: 'Diese Datei wurde von {declared} geschrieben, die wir nicht kennen: wir konnten {count} XCTrack-Versionen lesen, und diese gehört nicht dazu. Wir schlagen keine vor — eine auf gut Glück zu benennen hieße erfinden. Wählen Sie die Ihres Geräts.'
  },

  'versions.messageUnrecognizedSituated': {
    one: 'Diese Datei wurde von {declared} geschrieben, die wir nicht kennen: wir konnten {count} XCTrack-Version lesen, und diese gehört nicht dazu. {situate} Wir schlagen keine vor — eine auf gut Glück zu benennen hieße erfinden. Wählen Sie die Ihres Geräts.',
    other: 'Diese Datei wurde von {declared} geschrieben, die wir nicht kennen: wir konnten {count} XCTrack-Versionen lesen, und diese gehört nicht dazu. {situate} Wir schlagen keine vor — eine auf gut Glück zu benennen hieße erfinden. Wählen Sie die Ihres Geräts.'
  },

  'versions.rangeAbove': 'Die Nummern, die wir kennen, reichen von {min} bis {max}; diese liegt über allen.',
  'versions.rangeBelow': 'Die Nummern, die wir kennen, reichen von {min} bis {max}; diese liegt unter allen.',
  'versions.rangeBetween': 'Die Nummern, die wir kennen, reichen von {min} bis {max}; diese fällt zwischen zwei davon.',

  'versions.aimingElsewhere': 'Sie peilen eine andere als jene Version an: die Diagnose unten hält diese Datei gegen {version}.',

  /* --------------------------------- ce que le choix du pilote ne change pas */

  'versions.sameNone': 'Keine andere erfasste Version nimmt genau dieselben Einstellungen an wie {version}: was unten steht, gilt nur für sie.',

  'versions.sameOtherOne': '{list} nimmt genau dieselben Einstellungen an wie {version}: wir unterscheiden sie nicht, und was unten steht, gilt für {total} Versionen.',
  'versions.sameOtherSeveral': '{list} nehmen genau dieselben Einstellungen an wie {version}: wir unterscheiden sie nicht, und was unten steht, gilt für {total} Versionen.',

  /* ------------------------------------------------- l'écart depuis la version d'avant */

  'versions.noPreviousRelease': {
    one: 'Keine veröffentlichte Version geht dieser voraus unter denen, die wir lesen konnten: nichts zu vergleichen. {count} bekanntes Widget.',
    other: 'Keine veröffentlichte Version geht dieser voraus unter denen, die wir lesen konnten: nichts zu vergleichen. {count} bekannte Widgets.'
  },
  'versions.widgetsAdded': {
    one: '{count} Widget hinzugefügt',
    other: '{count} Widgets hinzugefügt'
  },
  'versions.widgetsRemoved': {
    one: '{count} Widget entfernt',
    other: '{count} Widgets entfernt'
  },
  'versions.settingsAdded': {
    one: '{count} Einstellung hinzugefügt',
    other: '{count} Einstellungen hinzugefügt'
  },
  'versions.settingsRemoved': {
    one: '{count} Einstellung entfernt',
    other: '{count} Einstellungen entfernt'
  },
  'versions.deltaNone': 'Nichts unterscheidet diese Version von {version}: wir lesen darin dieselben Einstellungen.',
  'versions.deltaSince': 'Seit {version}: {changes}.',
  'versions.noVersionChosen': 'Keine Version gewählt: es wird nichts verglichen und nichts diagnostiziert.',

  'versions.deltaDetails': 'Die Einzelheiten dieser Änderungen',
  'versions.deltaCaveat': 'Was folgt, ist das, was die angezielte Version mehr oder weniger liest als die vorige. Die Widgets tragen dabei den Namen, den XCTrack ihnen gibt; die Einstellungen nicht — die Anwendung zeigt sie nirgends, und dies sind die Namen, die sie in die Datei schreibt.',
  'versions.detailWidgetsAdded': 'Hinzugefügte Widgets',
  'versions.detailWidgetsRemoved': 'Entfernte Widgets',
  'versions.detailSettingsAdded': 'Einstellungen, die auf bestehenden Widgets hinzugekommen sind',
  'versions.detailSettingsRemoved': 'Entfernte Einstellungen',
  'versions.detailLine': '{name}: {keys}',

  /* ------------------------------------------------------------------ le diagnostic */

  'versions.chooseVersion': 'Wählen Sie eine Version, um die Diagnose dieser Datei zu erhalten.',

  'versions.tally': {
    one: '{count} Einstellung erkannt von {examined} geprüften, verteilt auf {instances}.',
    other: '{count} Einstellungen erkannt von {examined} geprüften, verteilt auf {instances}.'
  },

  'versions.scope': {
    one: 'Diese Diagnose beruht auf unserer Erfassung von {count} XCTrack-Version und auf echten Dateien, die von ihr geschrieben wurden: das ist es, was „wir“ weiter unten meint. Nur die Widgets der Seiten werden geprüft — der Rest einer Sicherung (Vario, Einheiten, Sensoren, Lufträume) wird nicht diagnostiziert. Die Lage eines Widgets und seine Art sind keine Einstellungen und werden nicht mitgezählt.',
    other: 'Diese Diagnose beruht auf unserer Erfassung von {count} XCTrack-Versionen und auf echten Dateien, die von ihnen geschrieben wurden: das ist es, was „wir“ weiter unten meint. Nur die Widgets der Seiten werden geprüft — der Rest einer Sicherung (Vario, Einheiten, Sensoren, Lufträume) wird nicht diagnostiziert. Die Lage eines Widgets und seine Art sind keine Einstellungen und werden nicht mitgezählt.'
  },

  'versions.unstableNotice': {
    one: '{count} Bemerkung ändert sich je nach der Version, die unter denen behalten wird, die diese Datei meinen kann. Sie werden einzeln gemeldet.',
    other: '{count} Bemerkungen ändern sich je nach der Version, die unter denen behalten wird, die diese Datei meinen kann. Sie werden einzeln gemeldet.'
  },

  'versions.noFindings': 'Keine Abweichung: alle Einstellungen dieser Datei werden von der angepeilten Version gelesen, und alle ihre Widgets gibt es dort. Nichts zu melden — was nicht heißt, dass die Datei in Ordnung ist, sondern nur, dass wir nichts an ihr auszusetzen finden.',

  'versions.widgetKnownElsewhere': 'Art, die wir kennen, aber nicht in dieser Version',
  'versions.widgetNeverSeen': 'Art, die wir in keiner Version gesehen haben',

  'versions.unstableFinding': 'Unbeständige Bemerkung — unter {divergences}.',
  'versions.divergencePart': '{version}: {word}',
  'versions.divergenceJoin': '; ',

  'versions.readonlyNote': 'Sie sehen diese Datei an, ohne sie zu ändern: von hier aus kann nichts daraus entfernt werden. Um auf das einzuwirken, was Sie lesen, schließen Sie dieses Fenster und wechseln Sie zum Bearbeiten.',

  /* ================================================================= le nettoyage */

  'cleanup.title': 'Entfernen, was eine ältere Version hinterlassen hat',

  /** Die Überschrift, wenn nichts angeboten wird: es bleibt nur zu sagen, was gefunden wurde. */
  'cleanup.foundTitle': 'Was eine ältere Version hinterlassen hat',

  'cleanup.lead': {
    one: '{count} Einstellung dieser Datei stammt aus einer älteren Version von XCTrack, verteilt auf {instances}: {list}.',
    other: '{count} Einstellungen dieser Datei stammen aus einer älteren Version von XCTrack, verteilt auf {instances}: {list}.'
  },

  'cleanup.leadHeld': {
    one: '{count} weitere Einstellung wurde gefunden und wird nicht angeboten: sie ist unten benannt, mit dem Grund.',
    other: '{count} weitere Einstellungen wurden gefunden und werden nicht angeboten: sie sind unten benannt, mit dem Grund.'
  },

  /**
   * ⚠️ Dieser Satz hat bis zum 22. August 2026 zwei falsche Dinge behauptet — „XCTrack
   * schleppt sie mit, ohne sie zu lesen“ und „sie zu entfernen macht die Datei kleiner,
   * mehr nicht“. Ein Hin und Zurück auf einem AIR³ 7.2 hat das Gegenteil gezeigt: das
   * Gerät liest sie, leitet daraus seine heutigen Einstellungen ab und löscht sie dann.
   * Der Satz beruhigt jetzt nur noch über das, was gemessen wurde, Einstellung für
   * Einstellung.
   */
  'cleanup.calm': 'XCTrack liest diese Einstellungen beim Öffnen ein letztes Mal, leitet daraus seine heutigen Einstellungen ab und löscht sie dann. Diese hier wurden auf dem Gerät gemessen: es leitet dasselbe ab, ob sie da sind oder nicht. Sie zu entfernen macht die Datei kleiner und ändert nichts an Ihren Seiten.',

  'cleanup.seeList': {
    one: 'Diese Einstellung ansehen und abwählen, was Sie lieber behalten',
    other: 'Diese {count} Einstellungen ansehen und abwählen, was Sie lieber behalten'
  },

  'cleanup.caveat': 'Die Namen unten sind die, die XCTrack schreibt. Die Anwendung zeigt sie in ihren Menüs nicht mehr: sie ersetzt sie beim ersten Lesen durch die Einstellungen, die ihnen nachgefolgt sind.',

  /* ------------------------------------------- ce qui est trouvé et laissé en place */

  'cleanup.heldTitle': {
    one: '{count} Einstellung gefunden und stehen gelassen',
    other: '{count} Einstellungen gefunden und stehen gelassen'
  },
  'cleanup.heldLead': 'Diese werden nicht angeboten. XCTrack liest sie beim Öffnen ein letztes Mal, um daraus seine heutigen Einstellungen abzuleiten: sie vorher zu entfernen würde ändern, was Ihr Gerät anzeigt — oder niemand hat es gemessen, und wir raten nicht. Sie müssen nichts tun: sie verschwinden von selbst, sobald Ihr Gerät diese Datei gelesen hat.',
  /** `{successor}`, `{present}` und `{absent}` sind Namen und Werte von XCTrack: unverändert übernommen. */
  'cleanup.heldLive': 'Wenn Sie sie entfernen würden: {effect}.',
  'cleanup.heldMeasure': 'Auf dem Gerät gemessen: ohne sie springt {successor} von {present} auf {absent}.',
  'cleanup.heldUnmeasured': 'Niemand hat gemessen, was ihr Entfernen auf einem Gerät ändern würde. Wir raten nicht: sie bleibt bestehen.',

  'removalEffect.windArrowGone': 'der Windpfeil würde von diesem Kompass verschwinden',
  'removalEffect.windArcBecomesArrow': 'dieser Kompass würde den Wind wieder als Pfeil statt als Bogen zeigen',
  'removalEffect.terrainShadingGone': 'die Geländeschattierung würde auf dieser Karte erlöschen',
  'removalEffect.mapThemeGone': 'der OpenStreetMap-Hintergrund würde von dieser Karte verschwinden',
  'removalEffect.mapThemeAndTerrainGone': 'der OpenStreetMap-Hintergrund und die Geländeschattierung würden von dieser Karte verschwinden',
  'removalEffect.distanceBracketsReturn': 'die Navigationsentfernung stünde auf dieser Karte wieder in Klammern',
  'removalEffect.unnamed': 'dieses Widget würde nicht mehr dasselbe anzeigen',

  /* ------------------------------------------- ce que porte chaque réglage périmé */

  'cleanup.inertMeasure': 'Auf dem Gerät gemessen: mit ihr wie ohne sie steht {successor} auf {value}.',

  'cleanup.usedUntil': 'von XCTrack bis Version {release} geschrieben',
  'cleanup.noLongerRead': 'seither ersetzt, ohne dass wir sagen könnten wann',
  'cleanup.noteWithValue': 'auf {value} gesetzt, {since}',
  'cleanup.noteRepeated': {
    one: '{note}, {count}-mal auf diesem Widget geschrieben',
    other: '{note}, {count}-mal auf diesem Widget geschrieben'
  },
  'cleanup.valueYes': 'ja',
  'cleanup.valueNo': 'nein',

  /* ------------------------------------------------------------- décocher, puis agir */

  'cleanup.allSelected': {
    one: '{count} Einstellung angehakt: sie wird entfernt.',
    other: '{count} Einstellungen angehakt: sie werden entfernt.'
  },
  'cleanup.someSelected': {
    one: '{count} von {total} angehakt — {left}.',
    other: '{count} von {total} angehakt — {left}.'
  },
  'cleanup.remaining': {
    one: '{count} Einstellung bleibt bestehen',
    other: '{count} Einstellungen bleiben bestehen'
  },
  'cleanup.noneSelected': 'Keine Einstellung angehakt',

  'cleanup.removeButton': {
    one: 'Diese Einstellung entfernen',
    other: 'Diese {count} Einstellungen entfernen'
  },
  'cleanup.undoButton': {
    one: 'Diese Einstellung zurücklegen',
    other: 'Diese {count} Einstellungen zurücklegen'
  },

  'cleanup.removedTally': {
    one: '{count} Einstellung auf {instances} entfernt. Ihr Gerät weiß noch nichts davon: die Datei ändert sich erst, wenn Sie sie speichern.',
    other: '{count} Einstellungen auf {instances} entfernt. Ihr Gerät weiß noch nichts davon: die Datei ändert sich erst, wenn Sie sie speichern.'
  },

  /* --------------------------------------- le libellé du pas d'annulation de l'hôte */

  'cleanup.removeStep': {
    one: '{count} Einstellung einer älteren Version entfernen',
    other: '{count} Einstellungen einer älteren Version entfernen'
  },
  'cleanup.restoreStep': {
    one: '{count} Einstellung einer älteren Version zurücklegen',
    other: '{count} Einstellungen einer älteren Version zurücklegen'
  }
}

export default versions
