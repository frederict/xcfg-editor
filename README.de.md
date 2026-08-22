# XCTrack-Konfigurationseditor

[Français](README.md) · [English](README.en.md) · [Nederlands](README.nl.md) ·
**Deutsch** · [Español](README.es.md)

Ein Web-Editor für die `.xcfg`-Dateien von **XCTrack**, der Fluganwendung der
Gleitschirmfliegerinnen und -flieger. Man öffnet einen Export aus dem eigenen Gerät, sieht
seine Seiten so, wie das Gerät sie zeichnet, ändert sie und exportiert sie wieder.

Alles geschieht **im Browser**. Kein Server, kein Konto, kein Versand: die Datei verlässt
den Rechner nicht.

## 👉 [Den Editor öffnen](https://frederict.github.io/xcfg-editor/)

**<https://frederict.github.io/xcfg-editor/>** — nichts zu installieren, nichts
anzumelden. Ziehen Sie eine `.xcfg` oder `.xczfg` hinein, die aus Ihrem Gerät exportiert
wurde.

Die Datei wird von Ihrem Browser gelesen und nirgendwohin gesendet: die Seite wird als
statische Dateien ausgeliefert, sie hat keinen Server, mit dem sie sprechen könnte.

---

## Wie das aussieht

![Der Editor mit der ersten Querformat-Seite der Testsicherung: die Seite in
Originalgröße gezeichnet, das Maßband darüber, die Widget-Leiste unten
aufgeklappt.](captures/editeur-paysage.png)

*Eine Seite der Testsicherung, in der Geometrie eines AIR³ 7.2 gezeichnet. Nichts teilt
sich die Breite mit ihr: die Widget-Leiste liegt darunter. **Ein einziges Bildschirmfoto
für alle fünf Sprachen**: was es zeigt — die gezeichnete Seite, das Maßband, die Platte,
die sie trägt — ist in allen fünf dasselbe, und darum bleibt es französisch.*

## Das Problem

Seine Seiten mit dem Finger einzurichten, auf einem Sieben-Zoll-Bildschirm auf den Knien,
dauert Stunden. XCTrack kann eine Seite weder kopieren noch duplizieren, um 10 % davon zu
ändern — das ist die meistgewählte Bitte in seinem Tracker seit 2018. Und nichts erlaubt
zu sehen, wie eine Seite aussehen wird, bevor man in der Luft ist.

Es gibt externe Editoren. Der erste Einwand, den ein Pilot ihnen entgegenhält, im Juli
2026 wörtlich so im Forum:

> „will my specific widget settings still be there after I use the editor? Most of my
> widgets use specific styles and settings, so having to re-enter these would cost more
> than I could gain from a more convenient interface for layouting.“

Sinngemäß: *Sind meine besonderen Widget-Einstellungen nach dem Editor noch da? Sie neu
einzugeben würde mehr kosten, als eine bequemere Oberfläche für das Layout einbringt.*

Das ist die richtige Frage. Dieses Projekt ist um ihre Antwort herum gebaut.

## Treue bis aufs Byte, und was sie genau zusichert

**Eine Datei, die geöffnet und ohne Änderung wieder exportiert wird, kommt mit derselben
SHA-256-Prüfsumme heraus.** Nicht „gleichwertig“, nicht „funktional identisch“: dieselbe
Datei, Byte für Byte.

Und wenn Sie etwas ändern, **ändert sich nur das, was Sie geändert haben**. Ein Widget zu
verschieben schreibt nur seine vier Koordinaten neu; der Rest der Datei — die anderen
78 000 Bytes — geht unversehrt hinaus.

Das ist keine Ingenieurseleganz, sondern das, was das Werkzeug brauchbar macht:

- **Ihre besonderen Einstellungen überleben, auch die, die der Editor nicht versteht.**
  Das Format `.xcfg` ist nicht dokumentiert und bekommt mit jeder XCTrack-Version neue
  Schlüssel. Ein Editor, der die Datei aus dem wiederaufbaut, was er lesen konnte,
  **verliert den Rest stillschweigend**. Dieser überträgt unbekannte Schlüssel unverändert.
- **Zahlen behalten ihre Schreibweise.** Aus `3.0` wird nicht `3`, aus `1.0E7` nicht
  `10000000`, aus `-0.0` nicht `0`, eine Ganzzahl jenseits von 2^53 wird nicht gerundet,
  und eine negative Android-Farbe bleibt negativ. Ein schlichtes `JSON.parse` +
  `JSON.stringify` zerstört diese fünf Fälle — das ist die zentrale Falle dieses Formats.
- **Reihenfolge der Schlüssel, doppelte Schlüssel und rohes UTF-8 bleiben erhalten**, weil
  XCTrack sie so schreibt und eine umsortierte Datei nicht mehr dieselbe Datei ist.

Diese Zusicherung ist kein Versprechen: sie wird **durch Tests bewiesen**, auf einem
versionierten Dateibestand, den jede und jeder laufen lassen kann (`npm test`). Das ist
Absicht — ein Treueversprechen, das nur der Autor nachprüfen kann, ist nichts wert.

## Was das Werkzeug kann

- **Öffnen** einer `.xcfg` oder `.xczfg` (das ZIP-Archiv, das XCTrack schreibt, wenn die
  Konfiguration Betriebsmittel mitführt).
- **Die Seiten zeichnen** in der Geometrie des Geräts, auf acht Bildschirmvorlagen
  (AIR³ 7.2, 7.3, 7.35 und fünf gängige Seitenverhältnisse), im Quer- und im Hochformat.
- **Melden, was nicht stimmt**, bevor Sie es im Flug entdecken. Sieben Regeln, verteilt auf
  die beiden Blöcke der Übersicht — eine einzige, die beiden Straßenkarten, steigt in den
  aufgeklappten Block auf, denn eine Regel gehört dorthin nur, wenn sie **zugleich schwer
  wiegt und gesichert ist**. Jede sagt, was sie wert ist:

  - ein Widget, das kein Fingerdruck erreichen kann, weil es **von den nach ihm
    gezeichneten Widgets überdeckt ist** — auch die Vereinigung mehrerer, von denen keines
    es allein überdeckt, zählt, und ein durchsichtiger Überdecker ebenso. **Das ist eine
    Annahme**: gemessen ist, dass es im Bearbeitungsmodus kein Klick erreicht; wie ein
    Fingerdruck *im Flug* geleitet wird, wurde nie beobachtet, und genau darauf kommt es
    bei einer Schaltfläche an. Die Regel **schweigt**, wenn die Geometriewarnung denselben
    Aufbau bereits gemeldet hat: ein zweimal gesagtes Problem wiegt weniger als ein einmal
    gesagtes;
  - eine Seite, die nie erscheinen wird — die, die keine Navigation aktiviert; sie ist die
    einzige, bei der ein Versuch am AIR³ bestätigt hat, dass sie beim Durchblättern
    übersprungen wird;
  - mehrere Seiten des Thermikassistenten in derselben Ausrichtung, von denen nur eine das
    automatische Umschalten beim Kreisen erhält. **Welche das ist, ist eine Annahme**:
    keine Erhebung dieses Projekts entscheidet es, und keine Datei des Bestands trägt zwei
    davon, es hat also nie etwas gezeigt;
  - ein Widget, das **vielleicht** zu klein ist, um mit ausgestrecktem Arm gelesen zu
    werden — die Schwelle stammt aus einer Norm und gilt für die physische Größe der
    **gewählten Bildschirmvorlage**, aber das Verhältnis zwischen Widget-Höhe und Texthöhe
    bleibt **eine eingestandene Annahme**, solange keine Messreihe am Gerät vorliegt;
  - zwei Straßenkarten auf derselben Seite;
  - ein Pro-Widget in einer Datei, die keine Lizenz angibt — dieser Fall ist **eine Frage,
    keine Feststellung**: was XCTrack damit macht, wurde nie am Gerät überprüft, und die
    Regel schreibt das hin;
  - und eine Einstellung, die von einer früheren XCTrack-Version geschrieben wurde.

  **Vier dieser sieben sind Annahmen**, und sie treten als solche auf: nie im
  Warnungsblock, mit dem Zusatz „am Gerät zu bestätigen“ hinter der Überschrift, und die
  Erklärung beginnt damit, dass dies keine gemessene Feststellung ist, sondern eine Frage.
  Das Werkzeug **meldet, es korrigiert nie von selbst**.

  Was am 22. August 2026 **entfernt** wurde, und warum das hier steht: das Werkzeug
  kennzeichnete bestimmte Seiten nach ihrer **Klasse** (`WPCompetition`,
  `WPThermalAssistant`) als am Boden ausgeblendet und kündigte an, „am Boden zeigt das
  Gerät nur 3 von 5“. Ein Versuch an einem AIR³ 7.2 hat das Gegenteil gezeigt — die Seite
  des Thermikassistenten taucht am Boden sehr wohl wieder im Durchblättern auf, und die
  einzige übersprungene Seite ist die, die keine Navigation aktiviert. Kennzeichnung und
  Zählung sind weg; was wirklich entscheidet, der Schlüssel `navigations`, ist Seite für
  Seite in „Seiten verwalten“ nachzulesen.

  Was am 22. August 2026 aus demselben Grund **hinzugekommen** ist: Der Befund steigt auf
  die **geöffnete Seite** hinab. Ein Testpilot hatte ein Widget auf einer toten Seite
  abgelegt, ohne dass ihn irgendetwas gewarnt hätte — die Diagnose lebte in einer
  zugeklappten Liste der Übersicht und in einem Nebenfenster, nie auf dem Bildschirm, auf
  dem man arbeitet. Ein unaufdringliches Band sagt dort nun, **warum gerade diese Seite**
  nicht erscheint, und es unterscheidet drei Gründe, denn sie werden nicht auf dieselbe
  Weise behoben:

  - die Seite trägt die Einstellung **„Deaktiviert“** von XCTrack — der gemessene Fall,
    den das Blättern überspringt;
  - ihre **Navigationsliste ist leer** — dieselbe Folge, andere Schreibweise, am Gerät nie
    beobachtet, und das Werkzeug sagt es;
  - die **allgemeinen Einstellungen halten den Bildschirm** in der anderen Ausrichtung
    (`Display.Orientation`): Jede Seite dieser Ausrichtung ist unerreichbar, gleich welche
    Navigationen sie trägt.

  Die ersten beiden werden hier behoben: „Für alle Navigationen aktivieren“ schreibt den
  Wert, den XCTrack selbst schreibt, wenn alle fünf Navigationen aktiv sind — auf der
  geöffneten Seite wie in „Seiten verwalten“, mit Rückgängigmachen. **Auszuwählen, welche**,
  bleibt Sache des Geräts: Sein Kasten mit fünf Symbolen ist nicht nachgebaut, und eine
  Liste zu schreiben, die wir nicht zusammenstellen könnten, wäre schlimmer, als nichts
  anzubieten. Der dritte Grund wird nicht auf der Seite behoben — es ist eine Einstellung
  des ganzen Geräts —, und der Editor sagt nur, wo sie wohnt.
- **Bearbeiten**: Widgets verschieben, in der Größe ändern, hinzufügen, löschen und
  umordnen; ihre Optionen einstellen; die Seiten verwalten (einfügen, duplizieren, löschen,
  umordnen, eine Seite wieder öffnen, die keine Navigation aktiviert). Rückgängig machen /
  wiederholen.
- **Die allgemeinen Einstellungen setzen** — die 217 Einstellungen, die außerhalb der
  Seiten leben: Einheiten, Tasten, Sensoren, Ton, Lufträume. In der Baumstruktur der
  23 Zeilen des Gerätemenüs. Beim Ansehen wird **kein einziges Formularelement gebaut**;
  beim Bearbeiten lassen sich 77 der 93 gezeigten Zeilen setzen — Kästchen, Liste, Regler,
  Zahl, Text, Farbe —, mit Rückgängig und Wiederherstellen wie alles andere. Die übrigen
  sechzehn, der verschachtelte JSON-Wert und alles, was die Seite nicht benennen kann,
  bleiben **ohne Bedienelement** stehen, und jedes sagt warum.
- **Schreiben, entfernen, wiederherstellen: drei Handgriffe rund um den Werkswert**, und
  sie sind nicht gleichwertig — weder untereinander noch je nach Bildschirm, auf dem man
  sie macht.

  Was ein **fehlender** Schlüssel bedeutet, ist auf beiden Seiten nicht dasselbe, und es
  ist auf beiden Seiten gemessen. Auf einem **Widget** ergänzt XCTrack beim Wiedereinlesen
  die Optionen, die eine Datei nicht trägt: der Werkswert gilt stillschweigend
  (festgestellt an der Tafel der 75 Widgets). In den **allgemeinen Einstellungen** nicht:
  beim Import „Alles ersetzen“ behält das Gerät die Einstellung, die es bereits hat, und
  ein in der Datei fehlender Schlüssel wird nicht angerührt — am AIR³ gemessen, indem
  `Display.Theme` aus einer Sicherung entfernt und diese wieder importiert wurde, mit einer
  Kontrolleinstellung im selben Durchgang. Auf einem Gerät, das sie nie angerührt hat, gilt
  notwendigerweise der Werkswert: das ist eine Ableitung, keine Messung, und die beiden
  anderen Importmodi wurden nicht erprobt.

  - **„Diesen Wert festlegen“** (im Bereich eines Widgets) und **„Diesen Wert schreiben“**
    (in den allgemeinen Einstellungen) schreiben einen Werkswert in die Datei, der nicht
    darin steht. Auf beiden Bildschirmen also. Auf einem Widget ändert das nichts an dem,
    was das Gerät heute tut, und schützt die Einstellung vor einem XCTrack-Update, das
    diesen Werkswert ändern würde. Bei einer allgemeinen Einstellung gilt das für ein
    Gerät, das dies nie eingestellt hat — und nicht für ein bereits eingestelltes Gerät,
    dessen Wert der Import ersetzen wird.
  - **„Aus der Datei entfernen“** lässt die Datei zu einer Einstellung schweigen: ein
    geschriebener Wert, der **bereits** dem Werkswert entspricht, verschwindet. Nur in den
    allgemeinen Einstellungen, und nur in diesem einen Zustand — die Datei zu einem Wert
    schweigen zu lassen, den Sie gewählt haben, nähme der Sicherung eine bewusste
    Einstellung, und das darf eine unauffällige Schaltfläche nicht mit einem Klick tun. Es
    ist **keine** Rückkehr zum Werkswert: das Gerät behält seinen eigenen.
  - **„Werkswert wiederherstellen“** (in den allgemeinen Einstellungen: „Den Werkswert
    wiederherstellen“) ersetzt einen Wert, den Sie gewählt haben, durch den, den ein
    frisches XCTrack anwendet. Ebenfalls auf beiden Bildschirmen. **Es ist der einzige der
    drei, der eine bewusste Einstellung löscht** — die beiden anderen rühren nur Werte an,
    die ohnehin schon dem Werkswert entsprachen oder überhaupt nicht geschrieben waren. Er
    zeigt sich deshalb nicht erst beim Überfahren: er nimmt seine eigene Zeile unter der
    Einstellung ein, zeigt beide Werte *vor* dem Klick und sagt, an welcher XCTrack-Version
    der Werkswert erhoben wurde, sobald es nicht die der Datei ist. Er **schreibt** den
    Werkswert, statt den Schlüssel zu löschen: die Zeile geht damit in den Zustand
    „Werkswert“ über, aus dem heraus „Aus der Datei entfernen“ angeboten wird. Zwei bewusste
    Klicks, zwei getrennte Wirkungen.

  Keine Schaltfläche dort, wo der Werkswert nicht erhoben ist, wo XCTrack ihn beim Start
  berechnet, wo es zwei einander widersprechende veröffentlicht (`Sensors.ManualQnh`: 1013
  und 1013.25), und auch nicht dort, wo die Erhebung nur einen zusammengesetzten Wert
  liefert (`{"theme": …, "terrain": …}`) — einen geratenen Wert zu schreiben wäre schlimmer,
  als nichts anzubieten.
- **Den Versionsabstand diagnostizieren**: Sie wählen Ihre XCTrack-Version **über ihren
  Namen** — den, den Ihr Gerät anzeigt, „1.0.3-beta“ — unter den 46 Einträgen, die unsere
  Erhebung unterscheidet, und das Werkzeug geht von der aus, die die Datei selbst angibt,
  bereits vorausgewählt. Es zeigt dann, was die Datei enthält, das diese Version nicht mehr
  liest, und was sie erwartet und die Datei nicht hat. Da mehrere Versionen oft genau
  dieselben Einstellungen annehmen, **benennt das Werkzeug die, die seine Erhebung nicht
  von Ihrer unterscheiden kann**: die Wahl zwischen zwei Nachbarinnen bleibt ohne Wirkung,
  und es ist besser, das zu sagen, als es raten zu lassen. Die Diagnose **stellt fest** —
  acht Familien der Abweichung, jede mit ihrer Handlungsempfehlung — und unterscheidet
  sorgfältig, was gemessen ist und was nicht: eine von XCTrack entfernte Einstellung, eine
  Lücke in unserer eigenen Erhebung und eine Einstellung, auf der wir blind sind, verlangen
  nicht dasselbe Vorgehen.
- **Entfernen, was eine ältere Version hinterlassen hat** — und nichts sonst. XCTrack
  behält die Einstellungen, die es nicht mehr kennt: eine Sicherung von 2026 schleppt noch
  Schalter von 2023 mit. Das ist die einzige Stelle, an der das Werkzeug **von sich aus**
  anbietet, etwas aus dem Dokument zu entfernen, und die Auswahl ist bewusst eng: eine
  Einstellung wird nur dann vorgeschlagen, wenn eine echte Datei sie bezeugt — der
  Bildschirm nennt sie **veraltet**. Eine Lücke in unserer Lesung der Versionen — die
  Einstellung gab es, unsere Extraktion hat sie verfehlt — oder eine Einstellung, die diese
  Lesung nie gesehen hat, heißen **blinder Fleck** und **unbekannt** und werden **nie**
  vorgeschlagen; selbst eine veraltete Einstellung, bei der wir nicht sagen können, seit
  wann sie nicht mehr dient, bleibt an ihrem Platz, denn man schlägt nicht vor zu löschen,
  was man nicht erklären könnte. Nichts zu entfernen macht nichts kaputt, zu Unrecht zu
  entfernen macht eine Flugkonfiguration kaputt: die ganze Auswahl ist auf diesem
  Ungleichgewicht gebaut.

  Gemessen an der Referenzsicherung des Bestands
  (`tests/fixtures/exports/2026-08-20_backup-00.xcfg`, geschrieben von XCTrack 1.0.3-beta):
  **9 vorgeschlagene Einstellungen, auf 4 Widgets, bei 1 059 untersuchten
  Widget-Einstellungen.** Sie sehen die Liste — jede Einstellung mit der letzten
  XCTrack-Version, die sie noch las —, Sie wählen ab, was Sie lieber behalten, Sie handeln
  mit einem ausdrücklichen Klick, und Sie können gleich danach zurück: zurückgelegt kommt
  die Datei **bis aufs Byte** wieder heraus. Das Aufräumen steht unter der
  Versionsdiagnose, und nur im Bearbeitungsmodus.
- **Sagen, was Ihre Datei über Sie verrät**, bevor Sie sie weitergeben. Ein
  `backup`-Export enthält Ihren Namen, Ihren Schirm, Ihre gekoppelten Sensoren, Ihre
  Wegpunktdateien — bis hin zum Namen des Wettkampfs, an dem Sie teilnehmen. Beim Speichern
  bietet das Werkzeug deshalb **drei Wege** an, geordnet nach dem, was hinausgeht — eine
  Stufe hinunterzugehen heißt immer „weniger aus der Hand geben“:

  1. **„Ihre Konfiguration, genau so wie sie ist“**, bis aufs Byte wiedergegeben;
  2. **„Alle Ihre Einstellungen, ohne das, was Sie erkennbar macht“** — eine vollständige
     Sicherung, deren Sie kenntlich machende Zeilen ersetzt, entfernt oder behalten und als
     solche benannt werden. Mit dieser lässt sich zu den eigenen Vario-Einstellungen um
     Hilfe bitten, ohne den eigenen Namen zu veröffentlichen;
  3. **„Teilbare Fassung, ohne persönliche Daten“** — ein `pages`-Export, ohne jede
     Einstellung.

  Jeder Weg trägt sein Verzeichnis: jede angerührte Zeile, ihr Ort und ihr Grund, gezeigt
  *vor* dem Herunterladen. Der Name der erzeugten Datei trägt einen Zeitstempel und
  **übernimmt nichts vom ursprünglichen Namen**, der oft einen Vornamen enthält.
- **Mehrere Konfigurationen unter einem Namen ablegen**, in Ihrem Browser, und zu einer
  davon zurückkehren: eine für den Wettkampf, eine für das Biwakfliegen, eine für die
  Schule. Die abgelegten Bytes sind die Ihrer Datei, beim Wiedereinlesen anhand der
  Prüfsumme geprüft. Nichts wird irgendwohin gesendet. Jeder Eintrag trägt eine
  **Miniatur** — die erste Querformat-Seite, die Ihr Gerät wirklich zeigt; die von keiner
  Navigation aufgerufene wird übersprungen, da Sie sie nie sehen; gibt es kein Querformat,
  dann Hochformat. Der „Steckbrief“ zeigt sie groß unter der Überschrift „Vorschau“. Zwei
  Dinge folgen daraus, und man sollte sie wissen, bevor man eine echte Konfiguration
  ablegt: **Ihre eigenen Texte sind dort verdeckt** — eigene Titel, freier Text, Anrufkarte
  werden zu grauen Balken, Rahmen und Platz des Widgets bleiben unversehrt, denn ein Bild
  entgeht der Anonymisierung, die nur an der Datei arbeitet; und **das Bibliotheksarchiv
  nimmt keine Miniatur mit**, weder das Bild noch die Zeile, die es ankündigt, ein Import
  glaubt keine, der Editor erstellt sie hier neu. Ein Eintrag ohne Bild — vor der Funktion
  abgelegt, aus einem Archiv zurück, unlesbar — zeigt eine ruhige Fläche, ohne ein Wort.
- **Ihre Sprache sprechen, auf zwei Achsen, die man nicht verwechseln darf.** *Unsere*
  Prosa — die Oberfläche, das Handbuch, dieses README — gibt es in fünf Sprachen:
  Französisch, Englisch, Niederländisch, Deutsch, Spanisch. Die Namen und Beschreibungen
  *von XCTrack* sind die der Anwendung selbst, aus dem APK gelesen — 33 Sprachen für die
  Widgets, 34 für ihre Optionen, 35 für die Beschriftungen der allgemeinen Einstellungen —,
  und sie richten sich nach der Sprache der geöffneten Datei; nur bei einer Datei, die
  keine angibt, übernehmen sie die der Oberfläche. Diese drei Zahlen sind keine Wahl von
  uns: es ist das, was das APK enthält.
- **Sich an Ort und Stelle erklären**: ein Handbuch in dreizehn Kapiteln öffnet sich vom
  Startbildschirm und aus dem Menü „Datei“, ohne die Seite zu verlassen — **in allen fünf
  Sprachen**, und heruntergeladen wird nur die angezeigte. Es ist für Pilotinnen und
  Piloten geschrieben, nicht für Informatikerinnen und Informatiker, und beginnt mit dem,
  was man auf keinen Fall tun sollte: seine Sicherung so weitergeben, wie sie ist.

### In Bildern

*Alle Bildschirmfotos sind auf den anonymisierten Fixtures aus `tests/fixtures/`
aufgenommen, nie auf einer echten Konfiguration — eine angezeigte Karte kann eine Wohnung
auf das Gebäude genau verraten.*

*Die sechs folgenden Bildschirmfotos gibt es **in fünf Ausfertigungen**, eine je Sprache,
weil dort der Text die Sache ist: dieses README zeigt die deutschen. Die Namen von Widgets
und Einstellungen darauf folgen dagegen **der Sprache der geöffneten Datei**, sobald diese
eine angibt — das ist die Trennung der beiden Achsen, und sie ist mit bloßem Auge auf dem
Bildschirm der allgemeinen Einstellungen zu sehen, dessen Fixture Französisch angibt.*

![Der Einstellungsbereich des Widgets „Luftraum-Annäherung“ im Bearbeitungsmodus: drei
Zeilen „Werkswert wiederherstellen“, die beide Werte zeigen, und unten der Block der
Einstellung, die dieses Widget nicht schreibt, mit ihrer Schaltfläche „Diesen Wert
festlegen“.](captures/panneau-gadget.de.png)

*Der Bereich eines Widgets und die beiden Werkswert-Handgriffe, die er anbietet:
wiederherstellen, was man eingestellt hat, oder festschreiben, was die Datei nicht sagt.*

![Der Bildschirm „Intégration Android“ der allgemeinen Einstellungen im Bearbeitungsmodus:
Zeilen „Aus der Datei entfernen“ mit der Plakette „Werkswert“, Zeilen „Den Werkswert
wiederherstellen“ mit der bernsteinfarbenen Plakette „von Ihnen gesetzt“, und zwei Zeilen
„Diesen Wert schreiben“ mit der Plakette „fehlt in der
Datei“.](captures/reglages-generaux.de.png)

*Die allgemeinen Einstellungen in der Baumstruktur des Gerätemenüs — und die drei
Werkswert-Handgriffe auf einem einzigen Bildschirm vereint. Hier zeigen sich auch die
beiden Sprachachsen am deutlichsten: die Fixture gibt Französisch an, also bleiben die
Namen der Einstellungen in allen fünf Ausfertigungen französisch — nur unsere eigene Prosa
wechselt.*

![Der Dialog „Angepeilte Version und Kompatibilität“: die Version 1.0.3-beta
vorausgewählt, der Satz über die nicht unterscheidbaren Versionen, der Block „Veraltete
Einstellungen“ mit seinen neun Zeilen und der aufgeklappte Abschnitt „Entfernen, was eine
ältere Version hinterlassen hat“ mit seinen neun
Kästchen.](captures/version-et-nettoyage.de.png)

*Die Versionswahl, die Diagnose und das Aufräumen, das sie eröffnet — neun Einstellungen
auf vier Widgets, jede mit der letzten XCTrack-Version, die sie noch las.*

![Der Dialog „Diese Konfiguration speichern“: die drei Wege, dann das Verzeichnis der fünf
ersetzten Texte — jeder mit seiner Seite, seinem Widget, dem durchgestrichenen alten Wert,
dem neuen und dem Grund der Ersetzung.](captures/enregistrer-et-partager.de.png)

*Beim Speichern: was die Datei verrät und was ersetzt werden kann — gezeigt vor dem
Herunterladen, nicht danach.*

![Der Dialog „Konfigurationsbibliothek“: zwei abgelegte Konfigurationen, jede mit ihrer
Vorschau, ihrer Größe und ihrer Zahl persönlicher Angaben; bei der ersten sind die von
Ihnen geschriebenen Texte durch graue Balken ersetzt. Am Fuß „Die ganze Bibliothek
löschen“.](captures/bibliotheque.de.png)

*Die Bibliothek lebt in Ihrem Browser, und nichts verlässt ihn. Jeder Eintrag sagt, was er
an Persönlichem trägt und was mit den Seiten mitginge; seine Vorschau verdeckt Ihre Texte
mit grauen Balken, denn ein Bild entgeht der Anonymisierung. Und „Die ganze Bibliothek
löschen“ steht am Fuß der Liste, nicht in einer Einstellung versteckt.*

![Das Handbuch als ganze Seite: links das Inhaltsverzeichnis seiner dreizehn Kapitel,
rechts ein eingerahmter Warnhinweis „Zu lesen, bevor Sie Ihre Datei irgendjemandem geben“,
dann der Anfang von Kapitel 1.](captures/manuel.de.png)

*Das Handbuch nimmt eine Seite in der Breite des Editors ein. Es beginnt mit dem
Warnhinweis statt mit der Führung, und sein Inhaltsverzeichnis bleibt während der ganzen
Lektüre links stehen — mit einem Strich bei dem Kapitel, in dem man sich befindet.*

## Was es nicht kann, und was ungewiss bleibt

Sagen wir es gleich.

- **Das Format `.xcfg` ist nicht dokumentiert.** Alles, was das Werkzeug darüber weiß,
  stammt aus der Beobachtung eines Bestands echter Dateien (2022 → 2026) und aus der Lesung
  der Anwendung. Das Schema ändert sich mit jeder XCTrack-Version: was heute wahr ist, kann
  es morgen nicht mehr sein. Genau deshalb ist das Werkzeug darauf gebaut, **zu übertragen,
  was es nicht versteht**, statt das Format nachzubilden.
- **Die Darstellung ist eine Nachbildung, nicht das Gerät.** Die Zeichnungen der Widgets
  sind nach dem wiederaufgebaut, was an einem **AIR³ 7.2** beobachtet wurde — ein einziges
  Gerät, eine einzige XCTrack-Version. Die angezeigten Werte sind feste Beispiele: nichts
  wird simuliert. Ein Widget, dessen Zeichnung nicht nachgebildet wurde, erscheint in einer
  ehrlichen allgemeinen Form statt in einer irreführenden Annäherung.
- **Keine Synchronisierung mit dem Gerät.** Der Hin- und Rückweg läuft über SD-Karte oder
  Kabel, von Hand.
- **Weder Vorschlag noch automatische Korrektur.** Das Werkzeug ordnet Ihre Seiten nicht um
  und entscheidet nicht an Ihrer Stelle. Das Aufräumen veralteter Einstellungen ist keine
  Ausnahme: nichts geht weg, ohne dass Sie die Liste gesehen und geklickt haben.
- **Keine Gemeinschaftsbibliothek, kein Konto, kein Server.** Das ist eine Wahl: was es
  nicht gibt, kann nicht auslaufen. Die Bibliothek der Konfigurationen lebt **in Ihrem
  Browser** (IndexedDB) und verlässt ihn nur, wenn Sie sie selbst exportieren; die Daten
  der Website zu löschen löscht sie, und ein anderes Gerät sieht sie nicht.
- **Nicht alles lässt sich in den allgemeinen Einstellungen setzen.** Das verschachtelte
  JSON des Abschnitts `preferences` (`Sounds`, `Navigation.State`, `Sensors.Configuration`,
  `Sound.AcousticVario.CustomProfile`) kommt unversehrt wieder heraus und wird nie neu
  geschrieben; die sechzehn Zeilen, die auf dem Gerät einen Dialog öffnen — die fünfzehn
  Tasten, die Tabelle des akustischen Varios —, lassen sich hier nicht setzen, weil ihr
  Wertebereich nicht bekannt ist; und die acht `Unit.*`, deren Liste XCTrack im Code füllt,
  haben nur ein Textfeld statt einer erfundenen Liste.
- **Eines der sieben Bildschirmfotos gibt es nur auf Französisch.** Oberfläche, Handbuch
  und dieses README sind auf Französisch, Englisch, Niederländisch, Deutsch und Spanisch
  übersetzt (`src/i18n/`), und sechs der sieben Bildschirmfotos folgen — jedes README
  zeigt seine eigenen. Das siebte, der ganze Editor, hat nur eine Ausfertigung: seine
  Sache ist eine gezeichnete Seite, ein Maßband und die Platte, die sie trägt, in allen
  fünf Sprachen dieselben. Seine Bildunterschrift sagt es. Die Beschriftungen von
  XCTrack — Namen von Widgets, Optionen, Einstellungen — folgen nicht der Sprachwahl der
  Oberfläche, sondern **der der Datei**; erst wenn die Datei keine angibt, übernehmen sie
  die Sprache der Oberfläche. Das sind zwei verschiedene Achsen, und sie zu verwechseln
  hieße, einer tschechischen Pilotin englische Widget-Namen vorzusetzen,
  während ihr Gerät sie ihr auf Tschechisch zeigt. Das Bildschirmfoto der allgemeinen
  Einstellungen zeigt es: seine Fixture gibt Französisch an, also bleiben seine Namen von
  Einstellungen in allen fünf Sprachen französisch.

## Ihre Meinung sagen, melden, was nicht stimmt

Das Werkzeug ist für Pilotinnen und Piloten geschrieben, und es wird nur besser durch das,
was sie darüber sagen. **Rückmeldungen laufen über die GitHub-Issues:**

**<https://github.com/frederict/xcfg-editor/issues>**

Alles ist nützlich: ein schlecht gezeichnetes Widget, eine Einstellung, die der Editor
nicht zeigt, ein dunkles Wort, eine XCTrack-Version, die in der Liste fehlt, eine Datei,
die sich nicht öffnen lässt — und, seit es die Oberfläche in fünf Sprachen gibt, **eine
Übersetzung, die schief klingt oder eine Schaltfläche anders benennt als der Bildschirm**.
Welches Gerät, welche XCTrack-Version und was Sie erwartet hatten zu nennen spart viel
Zeit.

**Schreiben Sie in Ihrer Sprache** — Französisch, Englisch, Niederländisch, Deutsch oder
Spanisch. Sie müssen für eine Meldung nicht auf Englisch wechseln.

⚠️ **Hängen Sie niemals Ihre eigene `.xcfg` an.** Sie enthält Ihren Namen, Ihre Sensoren,
Ihre Wegpunktdateien, manchmal Ihre Koordinaten — und eine GitHub-Issue ist öffentlich, und
das für immer. Wenn eine Datei unentbehrlich ist, um das Problem zu verstehen, erzeugen Sie
zuerst mit dem Werkzeug selbst eine bereinigte Fassung (Schaltfläche zum Speichern), und
lesen Sie das Verzeichnis durch, das es Ihnen zeigt, bevor Sie irgendetwas versenden.
Welche Sie wählen, hängt von Ihrer Frage ab: **„Teilbare Fassung, ohne persönliche Daten“**,
wenn sie Ihre Seiten betrifft, **„Alle Ihre Einstellungen, ohne das, was Sie erkennbar
macht“**, wenn sie eine allgemeine Einstellung betrifft — Vario, Sensoren, Einheiten.

## Installieren und starten

Sie brauchen Node.js 22 oder neuer.

```bash
git clone https://github.com/frederict/xcfg-editor.git
cd xcfg-editor
npm ci
npm run dev          # http://localhost:5173
```

Für die statische Fassung:

```bash
npm run build        # erzeugt dist/
npm run preview      # liefert dist/ lokal aus
```

`dist/` ist eine vollständig statische Website ohne Abhängigkeit zur Laufzeit: sie lässt
sich auf jedem Dateihosting ablegen, auch in einem Unterverzeichnis.

## Für Mitwirkende: die Dokumentation lebt im französischen README

Alles, was das Mitwirken betrifft — Tests, Konventionen, das Neuerzeugen der
XCTrack-Versionsdatenbank und des Katalogs der allgemeinen Einstellungen, die Herkunft der
Erhebungen — steht **im [französischen README](README.md)**, und nur dort.

Das ist eine bewusste Entscheidung. **Der Code und seine Kommentare sind auf Französisch
geschrieben**: wer am Code mitwirkt, liest ohnehin Französisch. Eine Übersetzung dieser
Abschnitte würde still vom Code abdriften, ohne dass es jemand bemerkt — und eine falsche
Dokumentation ist schlimmer als gar keine.

## Lizenz

MIT — siehe [LICENSE](LICENSE).

XCTrack ist eine Anwendung von [XContest](https://xcontest.org/). Dieses Projekt ist weder
mit XContest noch mit Air3 verbunden und wird von ihnen nicht unterstützt.
