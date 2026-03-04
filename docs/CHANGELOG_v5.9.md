# Changelog - BirdSound v5.9.x

## Version 5.9.2 - 4. März 2026
### 🐦 Massive Artenerweiterung

**BIRD_LIBRARY: 32 → 160+ Arten**
- 130+ neue mitteleuropäische Vogelarten mit vollständigen Steckbriefen
- Alle wichtigen deutschen Brutvögel und häufige Durchzügler abgedeckt

**Neue Artengruppen:**
- 🐦 **Drosseln**: Wacholderdrossel, Misteldrossel, Rotdrossel, Ringdrossel
- 🐦 **Meisen**: Sumpfmeise, Weidenmeise, Haubenmeise, Schwanzmeise, Bartmeise
- 🐦 **Finken**: Gimpel, Kernbeißer, Bergfink, Erlenzeisig, Girlitz, Bluthänfling, Birkenzeisig, Fichtenkreuzschnabel
- 🐦 **Grasmücken**: Mönchs-, Garten-, Dorn-, Klapper-, Sperbergrasmücke, Waldlaubsänger
- 🐦 **Rohrsänger**: Teich-, Sumpf-, Drosselrohrsänger, Gelbspötter
- 🐦 **Schwalben**: Rauch-, Mehl-, Uferschwalbe
- 🐦 **Stelzen & Pieper**: Bach-, Gebirgs-, Schafstelze, Wiesen-, Baumpieper
- 🐦 **Schnäpper & Rotschwänze**: Haus-, Gartenrotschwanz, Trauer-, Grauschnäpper, Steinschmätzer, Braun-, Schwarzkehlchen
- 🐦 **Ammern**: Goldammer, Rohrammer, Grauammer, Ortolan, Zippammer
- 🐦‍⬛ **Rabenvögel**: Dohle, Saatkrähe, Nebelkrähe, Kolkrabe, Tannenhäher
- 🦅 **Spechte**: Schwarz-, Mittel-, Klein-, Grauspecht, Wendehals
- 🦉 **Eulen**: Schleiereule, Steinkauz, Waldohreule, Sumpfohreule, Sperlingskauz, Raufußkauz
- 🦅 **Greifvögel**: Sperber, Habicht, Rotmilan, Schwarzmilan, Wespenbussard, Wanderfalke, Baumfalke, Fischadler, Seeadler
- 🦆 **Wasservögel**: Blässhuhn, Teichhuhn, Wasserralle, Tüpfelsumpfhuhn, Wachtelkönig, Haubentaucher, Zwergtaucher, Graugans, Kanadagans, Nilgans, Höckerschwan, Krickente, Reiherente, Tafelente, Schnatterente, Löffelente, Gänsesäger, Kormoran
- 🦩 **Reiher & Störche**: Silberreiher, Weißstorch, Schwarzstorch
- 🐦 **Limikolen**: Kiebitz, Bekassine, Waldschnepfe, Flussregenpfeifer, Flussuferläufer
- 🐦 **Möwen**: Lachmöwe, Silbermöwe, Steppenmöwe, Sturmmöwe, Flussseeschwalbe
- 🕊️ **Tauben**: Hohltaube, Straßentaube, Turteltaube
- 🐔 **Hühnervögel**: Fasan, Rebhuhn, Wachtel
- 🦜 **Neozoen**: Halsbandsittich, Alexandersittich (für Köln, Düsseldorf etc.)
- 🐦 **Spezialisten**: Eisvogel, Bienenfresser, Wiedehopf, Pirol, Neuntöter, Raubwürger, Wasseramsel, Feld-, Hauben-, Heidelerche, Kranich
- 🐦 **Weitere**: Heckenbraunelle, Wald- & Gartenbaumläufer, Goldhähnchen

**BirdNET-Codes:**
- ~200+ neue eBird-Codes für alle neuen Arten
- Vollständige Abdeckung der häufigsten BirdNET-Ausgabecodes

**Smarter Filter:**
- Library-Arten werden immer angezeigt
- Unbekannte Arten bei hoher Konfidenz (≥50%) und plausiblem Namen (kein Code) werden durchgelassen
- Seltene Durchzügler und Irrgäste werden nicht mehr herausgefiltert

---

## Version 5.9.1 - 4. März 2026
### 🔧 Bugfixes & Share-Funktion

- **BirdNET-Code-Filter**: Alle kryptischen Codes (comcha, houspa, rook1, yellow2 etc.) werden aufgelöst
- **`_inLibrary`-Filter**: Nur bekannte Arten aus BIRD_LIBRARY anzeigen
- **Erweiterte EXOTIC_KEYWORDS**: ~110+ Schlüsselwörter gegen nicht-europäische Arten
- **Modal-Fix**: 
  - maxHeight 95%, ScrollView mit `bounces`/`nestedScrollEnabled`
  - Close-Button außerhalb ScrollView (immer sichtbar)
  - `onRequestClose` für Android-Zurück-Taste
- **📤 Teilen-Funktion**: "Teilen" Button im Session-Report (Share API mit Top-5 Arten)

---

## Version 5.9.0 - 3. März 2026
### 🔬 Wissenschaftliche Feldberichte

- **SpeciesResolver**: Vollständige Namensauflösung (EN → DE, BirdNET-Codes → DE, LAT → DE)
- **ScientificReport**: Druckfertige HTML-Feldberichte (DIN A4)
  - Shannon-Diversitätsindex, Simpson-Index
  - Zeitanalyse, Artenliste nach Häufigkeit
  - Messprotokoll mit Gerätedaten
- **Export-Fix**: KML, JSON, HTML Export vollständig funktional
- **minConfidence**: Standard von 0.1 auf 0.3 erhöht
- **Session Report Modal**: Komplett überarbeitete UI

---

**Entwickler:** Dano Schönwald  
**Repository:** https://github.com/donapart/Birds  
**GitHub Pages:** https://donapart.github.io/Birds/
