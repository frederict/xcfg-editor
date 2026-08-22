# XCTrack-configuratie-editor

[Français](README.md) · [English](README.en.md) · **Nederlands** ·
[Deutsch](README.de.md) · [Español](README.es.md)

Een webeditor voor de `.xcfg`-bestanden van **XCTrack**, de vliegtoepassing van
schermvliegers. U opent een export van uw instrument, u ziet uw pagina’s precies zoals het
toestel ze tekent, u bewerkt ze, u exporteert opnieuw.

Alles gebeurt **in de browser**. Geen server, geen account, niets dat vertrekt: het bestand
verlaat uw machine niet.

## 👉 [De editor openen](https://frederict.github.io/xcfg-editor/)

**<https://frederict.github.io/xcfg-editor/>** — niets te installeren, nergens aan te
melden. Sleep er een `.xcfg` of een `.xczfg` naartoe die u uit uw instrument hebt
geëxporteerd.

Het bestand wordt door uw browser gelezen en gaat nergens naartoe: de pagina wordt als
statische bestanden bediend, ze heeft geen server om tegen te praten.

---

## Hoe het eruitziet

> De schermafbeeldingen tonen de **Franse** interface, en dat blijft zo. Ze in vijf talen
> opnieuw maken zou dertig afbeeldingen betekenen die bij elk gewijzigd scherm opnieuw
> gemaakt moeten worden — ze zouden ter plaatse verouderen. De meetkunde en de handelingen
> zijn er evengoed op af te lezen; de interface zelf spreekt wel Nederlands.

![De editor geopend op de eerste liggende pagina van de testback-up: de pagina op ware
grootte getekend, de meetlat erboven, het widgetpaneel onderaan
uitgeklapt.](captures/editeur-paysage.png)

*Een pagina uit de testback-up, getekend op de meetkunde van een AIR³ 7.2. Niets deelt de
breedte met haar: het widgetpaneel gaat eronder door.*

## Het probleem

Uw pagina’s met de vinger instellen, op een scherm van zeven duim op uw knieën, kost uren.
XCTrack kan een pagina niet kopiëren en niet dupliceren om er 10 % van te wijzigen — dat is
sinds 2018 de meest gestemde vraag in zijn tracker. En niets laat u zien hoe een pagina
eruit zal zien voordat u in de lucht hangt.

Externe editors bestaan. Het eerste bezwaar dat een piloot ertegen inbrengt, met zoveel
woorden op het forum in juli 2026, is dit:

> ‘will my specific widget settings still be there after I use the editor? Most of my
> widgets use specific styles and settings, so having to re-enter these would cost more
> than I could gain from a more convenient interface for layouting.’

(‘Staan mijn eigen widgetinstellingen er nog na gebruik van de editor? Ze allemaal opnieuw
invoeren zou meer kosten dan een handiger indelingsscherm mij oplevert.’)

Dat is de juiste vraag. Dit project is rond het antwoord erop gebouwd.

## Getrouwheid tot op de byte, en wat ze precies waarborgt

**Een bestand dat wordt geopend en zonder wijziging opnieuw geëxporteerd, komt er met
dezelfde SHA-256-vingerafdruk uit.** Niet ‘gelijkwaardig’, niet ‘functioneel identiek’:
hetzelfde bestand, byte voor byte.

En wanneer u iets wijzigt, **verandert alleen wat u hebt gewijzigd**. Een widget
verplaatsen herschrijft alleen zijn vier coördinaten; de rest van het bestand — de 78 000
andere bytes — komt er ongeschonden uit.

Dat is geen ingenieurselegantie, het is wat het gereedschap bruikbaar maakt:

- **Uw eigen instellingen overleven, ook die welke de editor niet begrijpt.** Het
  `.xcfg`-formaat is niet gedocumenteerd en krijgt er bij elke versie van XCTrack sleutels
  bij. Een editor die het bestand heropbouwt uit wat hij heeft kunnen lezen, **verliest de
  rest zwijgend**. Deze draagt de onbekende sleutels onveranderd mee.
- **De getallen behouden hun schrijfwijze.** `3.0` wordt geen `3`, `1.0E7` wordt geen
  `10000000`, `-0.0` wordt geen `0`, een geheel getal boven 2^53 wordt niet afgerond, en een
  negatieve Android-kleur blijft negatief. Een gewone `JSON.parse` + `JSON.stringify`
  vernielt deze vijf gevallen — dat is de centrale valstrik van dit formaat.
- **De volgorde van de sleutels, de dubbele sleutels en de ruwe UTF-8 blijven behouden**,
  omdat XCTrack ze zo schrijft en een herschikt bestand niet meer hetzelfde bestand is.

Deze waarborg is geen belofte: hij wordt **door de tests bewezen**, op een corpus van
bestanden onder versiebeheer dat iedereen kan uitvoeren (`npm test`). Dat is opzettelijk —
een belofte van getrouwheid die alleen de auteur kan nagaan, is niets waard.

## Wat het gereedschap kan

- **Openen** van een `.xcfg` of een `.xczfg` (het ZIP-archief dat XCTrack schrijft wanneer
  de configuratie bijlagen meedraagt).
- **De pagina’s tekenen** op de meetkunde van het instrument, op acht schermsjablonen
  (AIR³ 7.2, 7.3, 7.35, en vijf gangbare verhoudingen), liggend en staand.
- **Melden wat er mis is** voordat u het tijdens de vlucht ontdekt. Zeven regels, verdeeld
  over de twee blokken van het overzicht — één enkele, die van de twee wegenkaarten, komt in
  het uitgeklapte blok terecht, omdat een regel daar alleen thuishoort als ze **tegelijk
  ernstig en vastgesteld** is. Elke regel zegt wat ze waard is:

  - een widget die met geen enkele vingerdruk te bereiken is, **bedekt door de widgets die
    na hem zijn getekend** — de vereniging van meerdere widgets, waarvan geen enkele hem
    alleen bedekt, telt ook mee, en een doorzichtige bedekker eveneens. **Dit is een
    hypothese**: wat gemeten is, is dat geen enkele klik hem in bewerkmodus bereikt; hoe een
    vingerdruk *tijdens de vlucht* wordt gerouteerd, is nooit waargenomen, en dat is nu net
    wat telt voor een knop. De regel **zwijgt** wanneer de meetkundige waarschuwing dezelfde
    montage al heeft gemeld: één probleem dat twee keer wordt gezegd, is minder waard dan
    één keer;
  - een pagina die nooit zal verschijnen — de pagina die door geen enkel navigatietype wordt
    ingeschakeld, de enige waarvan een proef op de AIR³ heeft bevestigd dat ze bij het
    doorbladeren wordt overgeslagen;
  - meerdere pagina’s met een thermiekassistent in dezelfde richting, waarvan er maar één de
    automatische omschakeling bij het kringen krijgt. **Welke, is een veronderstelling**:
    geen enkele opname van dit depot geeft de doorslag, en geen enkel bestand uit het corpus
    draagt er twee, dus niets heeft het ooit aangetoond;
  - een widget die **misschien** te klein is om op armlengte te lezen — de drempel komt uit
    een norm en geldt voor de fysieke grootte van het **gekozen schermsjabloon**, maar de
    verhouding tussen de hoogte van de widget en de hoogte van de tekst blijft **een erkende
    hypothese**, bij gebrek aan een meetcampagne op het toestel;
  - twee wegenkaarten op dezelfde pagina;
  - een Pro-widget in een bestand dat geen licentie vermeldt — die is **een vraag, geen
    vaststelling**: wat XCTrack ermee doet is nooit op het toestel nagegaan, en de regel
    schrijft dat op;
  - en een instelling die door een oudere versie van XCTrack is geschreven.

  **Vier van deze zeven zijn veronderstellingen**, en ze presenteren zich ook zo: nooit in
  het waarschuwingsblok, met een opschrift met het achtervoegsel ‘te bevestigen op het
  instrument’, en met een uitleg die begint met ‘dit is geen gemeten vaststelling maar een
  vraag’. Het gereedschap **meldt, het verbetert nooit uit zichzelf**.

  Wat op 22 augustus 2026 is **weggehaald**, en waarom dat hier staat: het gereedschap
  merkte bepaalde pagina’s aan als ‘verborgen buiten de vlucht’ op grond van hun **klasse**
  (`WPCompetition`, `WPThermalAssistant`) en kondigde aan: ‘op de grond toont het toestel er
  maar 3 van de 5’. Een proef op een AIR³ 7.2 heeft het tegendeel aangetoond — de pagina van
  de thermiekassistent komt wel degelijk in het doorbladeren op de grond terug, en de enige
  pagina die wordt overgeslagen is die welke door geen enkele navigatie wordt ingeschakeld.
  Het merkteken en de telling zijn verdwenen; wat werkelijk beslist, de sleutel
  `navigations`, is pagina per pagina te lezen in ‘Pagina’s beheren’.
- **Bewerken**: widgets verplaatsen, van formaat veranderen, toevoegen, verwijderen en van
  volgorde wisselen; hun opties instellen; de pagina’s beheren (invoegen, dupliceren,
  verwijderen, herordenen). Ongedaan maken / opnieuw doen.
- **De algemene instellingen instellen** — de 217 voorkeuren die buiten de pagina’s leven:
  eenheden, knoppen, sensoren, geluid, luchtruim. In de boomstructuur van de 23 regels van
  het instrumentmenu. In kijkmodus wordt er **geen enkel formulierveld gebouwd**; in
  bewerkmodus zijn 77 van de 93 getoonde regels instelbaar — aankruisvakje, lijst,
  schuifregelaar, getal, tekst, kleur —, met ongedaan maken en opnieuw doen zoals de rest.
  De zestien overige, de geneste JSON-waarde en alles wat de pagina niet kan benoemen,
  blijven **zonder bediening** staan, en elk zegt waarom.
- **Schrijven, verwijderen, terugzetten: drie handelingen rond de fabriekswaarde**, en ze
  zijn niet gelijkwaardig — noch onderling, noch naargelang het scherm waarop u ze doet.

  Wat een **ontbrekende** sleutel betekent, is aan beide kanten niet hetzelfde, en het is aan
  beide kanten gemeten. Op een **widget** vult XCTrack bij het lezen de opties aan die een
  bestand niet draagt: de fabriekswaarde geldt impliciet (vastgesteld op de plaat met de 75
  widgets). In de **algemene instellingen** niet: bij het inlezen met ‘Alles vervangen’
  houdt het toestel de instelling die het al heeft, en een sleutel die in het bestand
  ontbreekt wordt niet aangeraakt — gemeten op de AIR³, met `Display.Theme` uit een back-up
  gehaald en daarna opnieuw ingelezen, met een controlegetuige in dezelfde ronde. Op een
  toestel dat er nooit aan heeft gezeten, geldt de fabriekswaarde noodzakelijk: dat is een
  afleiding, geen meting, en de twee andere inleesmodi zijn niet beproefd.

  - **‘Deze waarde vastleggen’** (paneel van een widget) en **‘Deze waarde schrijven’**
    (algemene instellingen) schrijven in het bestand een fabriekswaarde die er niet in staat.
    Op een widget verandert dat niets aan wat het toestel vandaag doet, en het stelt de
    instelling veilig tegen een update van XCTrack die die fabriekswaarde zou wijzigen. Op
    een algemene voorkeur geldt dat voor een toestel dat dit nooit heeft ingesteld — en niet
    voor een toestel dat het al heeft ingesteld, waarvan het inlezen de waarde zal
    vervangen.
  - **‘Verwijderen’** laat het bestand over een instelling zwijgen: een geschreven waarde die
    **al** gelijk is aan de fabriekswaarde verdwijnt. Alleen in de algemene instellingen, en
    alleen in die toestand — het bestand laten zwijgen over een waarde die u hebt gekozen zou
    de back-up een bewuste instelling ontnemen, en dat mag een onopvallende knop niet met één
    klik doen. Het is **geen** terugkeer naar de fabriekswaarde: het toestel houdt de zijne.
  - **‘Fabriekswaarde terugzetten’** vervangt een waarde die u hebt gekozen door de waarde
    die een nieuwe XCTrack toepast. Eveneens op beide schermen. **Het is de enige van de drie
    die een bewuste instelling wist** — de twee andere raken alleen waarden aan die al gelijk
    waren aan de fabriekswaarde, of die helemaal niet geschreven waren. Ze verschijnt dus
    niet pas bij het aanwijzen met de muis: ze neemt haar eigen regel onder de instelling in,
    toont de twee waarden die tegenover elkaar staan *vóór* de klik, en zegt op welke versie
    van XCTrack de fabriekswaarde is opgenomen zodra dat niet die van het bestand is. Ze
    **schrijft** de fabriekswaarde in plaats van de sleutel te wissen: de regel gaat dan naar
    de fabriekstoestand, van waaruit ‘Verwijderen’ wordt aangeboden. Twee bewuste klikken,
    twee gescheiden gevolgen.

  Geen enkele knop waar de fabriekswaarde niet is opgenomen, waar XCTrack haar bij het
  opstarten berekent, waar het er twee publiceert die elkaar tegenspreken
  (`Sensors.ManualQnh`: 1013 en 1013.25), en evenmin waar de opname er maar één samengestelde
  waarde van geeft (`{"theme": …, "terrain": …}`) — een geraden waarde schrijven zou erger
  zijn dan niets aanbieden.
- **Het versieverschil vaststellen**: u kiest uw versie van XCTrack **op haar naam** — die
  welke uw toestel toont, ‘1.0.3-beta’ — uit de 46 items die onze opname onderscheidt, en
  het gereedschap vertrekt van de versie die het bestand zelf vermeldt, al voorgeselecteerd.
  Het toont dan wat het bestand draagt dat die versie niet meer leest, en wat zij verwacht en
  het niet heeft. Omdat meerdere versies vaak precies dezelfde instellingen aanvaarden,
  **noemt het gereedschap de versies die zijn opname niet van de uwe kan onderscheiden**: de
  keuze tussen twee buren heeft dan geen effect, en dat kan men beter zeggen dan laten raden.
  De diagnose **stelt vast** — acht families verschillen, elk met wat u ermee moet doen — en
  onderscheidt zorgvuldig wat gemeten is van wat dat niet is: een instelling die XCTrack heeft
  weggehaald, een gat in onze eigen opname, en een instelling waarvoor wij blind zijn vragen
  niet om dezelfde handelwijze.
- **De instellingen weghalen die een oudere versie heeft achtergelaten** — en niets anders.
  XCTrack bewaart de instellingen die het niet meer kent: een back-up uit 2026 sleept nog
  schakelaars uit 2023 mee. Dit is de enige plek waar het gereedschap **uit zichzelf**
  voorstelt iets uit het document weg te halen, en de schifting is met opzet nauw: een
  instelling wordt pas voorgesteld wanneer een echt bestand haar bevestigt — het scherm noemt
  ze **verouderd**. Een gat in onze lezing van de versies — de instelling bestond wel, onze
  extractie heeft ze gemist — of een instelling die zij nooit heeft gezien, heten **blinde
  vlek** en **onbekend**, en worden **nooit** voorgesteld; zelfs een verouderde instelling
  waarvan wij niet kunnen zeggen sinds wanneer ze niet meer dient, blijft staan, want men
  stelt niet voor te verwijderen wat men niet zou kunnen uitleggen. Niets weghalen maakt
  niets stuk, ten onrechte weghalen maakt een vluchtconfiguratie stuk: de hele schifting is
  op die onevenwichtigheid gebouwd.

  Gemeten op de referentieback-up van het corpus
  (`tests/fixtures/exports/2026-08-20_backup-00.xcfg`, geschreven door XCTrack 1.0.3-beta):
  **9 voorgestelde instellingen, op 4 widgets, op 1 059 onderzochte widgetinstellingen.** U
  ziet de lijst — elke instelling met de laatste versie van XCTrack die ze nog las —, u vinkt
  af wat u liever houdt, u handelt met een uitdrukkelijk gebaar, en u kunt er meteen daarna op
  terugkomen: teruggezet komt het bestand er **byte voor byte** uit. Het opruimen staat onder
  de versiediagnose, en alleen in bewerkmodus.
- **Zeggen wat uw bestand over u prijsgeeft** voordat u het deelt. Een `backup`-export draagt
  uw naam, uw scherm, uw gekoppelde sensoren, uw waypointbestanden — tot en met de naam van
  de wedstrijd waaraan u deelneemt. Bij het opslaan biedt het gereedschap daarom **drie
  uitwegen**, gerangschikt in de volgorde van wat vertrekt — een trap lager gaan betekent
  altijd ‘minder weggeven’:

  1. **‘Uw configuratie, precies zoals ze is’**, byte voor byte teruggegeven;
  2. **‘Al uw instellingen, zonder wat u herkenbaar maakt’** — een volledige back-up, waarvan
     de regels die u herkenbaar maken worden vervangen, verwijderd, of behouden en als
     zodanig benoemd. Dat is de uitweg waarmee u hulp kunt vragen over uw vario-instellingen
     zonder uw naam te publiceren;
  3. **‘Deelbare versie, zonder persoonlijke gegevens’** — een `pages`-export, zonder ook maar
     één voorkeur.

  Elke uitweg draagt haar inventaris: elke aangeraakte regel, haar plaats en haar reden,
  getoond *vóór* de download. De naam van het gemaakte bestand draagt een tijdstempel en
  **neemt niets van de oorspronkelijke naam over**, die vaak een voornaam bevat.
- **Meerdere configuraties onder een naam opbergen**, in uw browser, en naar een ervan
  terugkeren: een voor de wedstrijd, een voor de vliegbivak, een voor de school. De
  opgeborgen bytes zijn die van uw bestand, bij het herlezen met de vingerafdruk nagekeken.
  Er wordt niets ergens naartoe gestuurd.
- **Uw taal spreken, langs twee assen die niet samenvallen.** *Onze* prose — de interface, de
  handleiding, deze README — bestaat in vijf talen: Frans, Engels, Nederlands, Duits, Spaans.
  De namen en beschrijvingen *van XCTrack* zijn die van de toepassing zelf, uit de APK
  gehaald — 33 talen voor de widgets, 34 voor hun opties, 35 voor de opschriften van de
  algemene instellingen —, en ze volgen de taal van het geopende bestand, niet die van de
  interface. Die drie getallen zijn geen keuze van ons: het is wat de APK draagt.
- **Zichzelf ter plaatse uitleggen**: een handleiding in dertien hoofdstukken opent vanaf het
  startscherm en vanuit het menu ‘Bestand’, zonder de pagina te verlaten — **in de vijf
  talen**, en alleen de taal die wordt getoond, wordt gedownload. Ze is voor een piloot
  geschreven en niet voor een informaticus, en ze opent met wat u vooral niet moet doen: uw
  back-up versturen zoals hij is.

### In beelden

*Alle schermafbeeldingen zijn gemaakt op de geanonimiseerde fixtures van
`tests/fixtures/`, nooit op een echte configuratie — een getoonde kaart kan een woonplaats
tot op het gebouw verraden.*

![Het instellingenpaneel van de widget ‘Luchtruim in de buurt’, in bewerkmodus: drie regels
‘Fabriekswaarde terugzetten’ die de twee waarden tegenover elkaar tonen, en onderaan het
blok met de instelling die deze widget niet schrijft, met zijn knop ‘Deze waarde
vastleggen’.](captures/panneau-gadget.png)

*Het paneel van een widget, en de twee fabriekswaardehandelingen die het biedt: terugzetten
wat u hebt ingesteld, of vastleggen wat het bestand niet zegt.*

![Het scherm ‘Android-integratie’ van de algemene instellingen, in bewerkmodus: regels
‘Verwijderen’ met de vermelding FABRIEKSWAARDE, regels ‘De fabriekswaarde terugzetten’ met
de vermelding DOOR U INGESTELD, en twee regels ‘Deze waarde schrijven’ met de vermelding
ONTBREEKT IN HET BESTAND.](captures/reglages-generaux.png)

*De algemene instellingen, in de boomstructuur van het instrumentmenu — en de drie
fabriekswaardehandelingen samen op één scherm.*

![Het venster ‘Beoogde versie en compatibiliteit’: versie 1.0.3-beta voorgeselecteerd, de
zin over de niet te onderscheiden versies, het blok VEROUDERD met negen instellingen, en de
sectie ‘Weghalen wat een oudere versie heeft achtergelaten’ uitgeklapt op haar negen
aankruisvakjes.](captures/version-et-nettoyage.png)

*De versiekeuze, de diagnose, en het opruimen dat eruit voortkomt — negen instellingen, op
vier widgets, elk met de laatste versie van XCTrack die ze nog las.*

![Het venster ‘Deze configuratie opslaan’: de drie uitwegen, en daarna de inventaris van de
vijf vervangen teksten — elk met zijn pagina, zijn widget, de oude waarde doorstreept, de
nieuwe, en de reden van de vervanging.](captures/enregistrer-et-partager.png)

*Bij het opslaan: wat het bestand prijsgeeft en wat kan worden vervangen — getoond vóór de
download, niet erna.*

![De handleiding als volledige pagina: links de inhoudsopgave van de dertien
hoofdstukken, rechts een omkaderde waarschuwing ‘Lees dit voordat u uw bestand aan wie dan
ook geeft’, en daarna het begin van hoofdstuk 1.](captures/manuel.png)

*De handleiding beslaat een pagina zo breed als de editor. Ze begint met de waarschuwing
en niet met de rondleiding, en haar inhoudsopgave blijft tijdens het hele lezen links
staan — met een streepje bij het hoofdstuk waar u bent.*

## Wat het niet kan, en wat onzeker blijft

Dat kan net zo goed meteen gezegd worden.

- **Het `.xcfg`-formaat is niet gedocumenteerd.** Alles wat het gereedschap erover weet komt
  uit de waarneming van een corpus echte bestanden (2022 → 2026) en uit het lezen van de
  toepassing. Het schema verandert bij elke versie van XCTrack: wat vandaag waar is, kan dat
  morgen niet meer zijn. Precies daarom is het gereedschap gebouwd om **mee te dragen wat het
  niet begrijpt** in plaats van het formaat te modelleren.
- **De weergave is een nabootsing, niet het toestel.** De tekeningen van de widgets zijn
  heropgebouwd uit wat op een **AIR³ 7.2** is waargenomen — één enkel toestel, één enkele
  versie van XCTrack. De getoonde waarden zijn vaste voorbeelden: er wordt niets gesimuleerd.
  Een widget waarvan de tekening niet is nagemaakt, verschijnt in een eerlijke algemene vorm
  in plaats van in een misleidende benadering.
- **Geen enkele synchronisatie met het instrument.** De heen- en terugweg loopt met de hand,
  via SD-kaart of kabel.
- **Geen suggesties, geen automatische verbetering.** Het gereedschap herschikt uw pagina’s
  niet en beslist niet in uw plaats. Het opruimen van verouderde instellingen is daarop geen
  uitzondering: er vertrekt niets zonder dat u de lijst hebt gezien en hebt geklikt.
- **Geen bibliotheek van de gemeenschap, geen account, geen server.** Dat is een keuze: wat
  niet bestaat, lekt niet. De bibliotheek met configuraties leeft **in uw browser**
  (IndexedDB) en komt er alleen uit als u ze zelf exporteert; de sitegegevens wissen wist
  haar, en een ander toestel ziet haar niet.
- **Niet alles is in de algemene voorkeuren instelbaar.** De geneste JSON van de sectie
  `preferences` (`Sounds`, `Navigation.State`, `Sensors.Configuration`,
  `Sound.AcousticVario.CustomProfile`) komt er ongeschonden uit en wordt nooit herschreven;
  de zestien regels die op het toestel een venster openen — de vijftien knoppen, de tabel van
  de akoestische vario — zijn hier niet instelbaar, bij gebrek aan kennis van hun
  waardenbereik; en de acht `Unit.*`, waarvan XCTrack de lijst in code vult, hebben alleen
  een tekstveld in plaats van een verzonnen lijst.
- **Geen voorbeeldafbeelding in de bibliotheek.** De plaats is in de gegevens voorbehouden,
  de miniatuur is een leeg kader dat het zegt.
- **De interface bestaat in vijf talen, de schermafbeeldingen van dit bestand in één.** De
  interface, de handleiding en deze README zijn vertaald in het Frans, Engels, Nederlands,
  Duits en Spaans (`src/i18n/`). De afbeeldingen tonen de **Franse** interface: ze in vijf
  talen opnieuw maken zou dertig schermafbeeldingen betekenen die bij elk gewijzigd scherm
  opnieuw gemaakt moeten worden, en ze zouden verouderen. De meetkunde en de handelingen zijn
  er evengoed op af te lezen. De opschriften van XCTrack — namen van widgets, van opties, van
  voorkeuren — volgen niet de taalkeuze van de interface maar **die van het bestand**: dat
  zijn twee verschillende assen, en ze verwarren zou een Tsjechische piloot widgetnamen in
  het Engels laten lezen terwijl zijn instrument ze hem in het Tsjechisch toont.

## Uw mening geven, melden wat er mis is

Het gereedschap is voor piloten geschreven, en het wordt alleen beter door wat zij erover
zeggen. **De reacties lopen via de GitHub-issues:**

**<https://github.com/frederict/xcfg-editor/issues>**

Alles is nuttig: een slecht getekende widget, een instelling die de editor niet toont, een
duister woord, een versie van XCTrack die niet in de lijst staat, een bestand dat weigert
open te gaan — en, nu de interface in vijf talen bestaat, **een vertaling die vals klinkt of
die een knop anders noemt dan het scherm**. Zeggen welk toestel, welke versie van XCTrack en
wat u verwachtte, bespaart heel veel tijd.

**Schrijf in uw eigen taal** — Frans, Engels, Nederlands, Duits of Spaans. U hoeft niet naar
het Engels over te schakelen om iets te melden.

⚠️ **Voeg nooit uw eigen `.xcfg` bij.** Hij draagt uw naam, uw sensoren, uw
waypointbestanden, soms uw contactgegevens — en een GitHub-issue is openbaar, en voorgoed. Is
een bestand onmisbaar om het probleem te begrijpen, maak er dan eerst met het gereedschap
zelf een geschoonde versie van (de opslaanknop), en lees de inventaris door die het u toont
vóór u wat dan ook verstuurt. Welke uitweg u kiest hangt van uw vraag af: **‘Deelbare versie,
zonder persoonlijke gegevens’** als ze over uw pagina’s gaat, **‘Al uw instellingen, zonder
wat u herkenbaar maakt’** als ze over een algemene instelling gaat — vario, sensoren,
eenheden.

## Installeren en starten

U hebt Node.js 22 of nieuwer nodig.

```bash
git clone https://github.com/frederict/xcfg-editor.git
cd xcfg-editor
npm ci
npm run dev          # http://localhost:5173
```

De statische versie bouwen:

```bash
npm run build        # maakt dist/
npm run preview      # bedient dist/ lokaal
```

`dist/` is een volledig statische site zonder enige afhankelijkheid bij het uitvoeren: ze
kan op om het even welke bestandshosting worden gezet, ook in een submap.

## Bijdragen: de documentatie staat in de Franse README

De documentatie voor wie aan de code werkt — bijdragen, het testcorpus, het opnieuw
opbouwen van de XCTrack-versiedatabank en van de catalogus met algemene voorkeuren, de
versiedimensie van de voorkeuren, de waardenbereiken die de schermen niet dragen — staat in
de **[Franse README](README.md)**, en alleen daar.

Dat is een bewuste beslissing. **De code en zijn commentaar zijn in het Frans geschreven**:
wie aan de code bijdraagt, leest dus Frans. Een vertaling van die secties zou van de code
afdrijven zonder dat iemand het merkt, en foute documentatie is erger dan geen documentatie.

## Licentie

MIT — zie [LICENSE](LICENSE).

XCTrack is een toepassing van [XContest](https://xcontest.org/). Dit project is niet
verbonden met XContest of Air3, en wordt door hen niet goedgekeurd.
