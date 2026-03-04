/**
 * SpeciesResolver - Artennamen-Auflösung & geographischer Plausibilitätsfilter
 * 
 * Löst englische Artnamen, BirdNET-Codes und wissenschaftliche Namen
 * in deutsche Trivialnamen auf. Filtert nicht-europäische Arten.
 * 
 * BirdSound v5.9.2 — Dano Schönwald
 */
import { BIRD_LIBRARY } from '../data/BirdLibrary';

// ══════════════════════════════════════════════════════════════
// NAME MAPPING: English → German, BirdNET Codes → German
// ══════════════════════════════════════════════════════════════

const buildMaps = () => {
  const byEnglish = {};
  const byScientific = {};
  const byId = {};
  
  Object.entries(BIRD_LIBRARY).forEach(([germanName, bird]) => {
    if (bird.englishName) byEnglish[bird.englishName.toLowerCase()] = germanName;
    if (bird.scientificName) byScientific[bird.scientificName.toLowerCase()] = germanName;
    if (bird.id) byId[bird.id.toLowerCase()] = germanName;
  });
  
  return { byEnglish, byScientific, byId };
};

const { byEnglish, byScientific, byId } = buildMaps();

// BirdNET eBird-Codes → Deutsche Trivialnamen (nur Arten aus BIRD_LIBRARY)
// WICHTIG: Nur Codes für Arten die in unserer Bibliothek sind!
const BIRDNET_CODES = {
  // Amsel (Turdus merula)
  'eurbla': 'Amsel', 'eurbla1': 'Amsel', 'eurblk': 'Amsel', 'blkbir1': 'Amsel', 'blkbir2': 'Amsel', 'combla': 'Amsel',
  // Singdrossel (Turdus philomelos)
  'sonthr': 'Singdrossel', 'sonthr1': 'Singdrossel', 'songthr1': 'Singdrossel', 'sonthr2': 'Singdrossel',
  // Kohlmeise (Parus major)
  'gretit': 'Kohlmeise', 'gretit1': 'Kohlmeise', 'gretit2': 'Kohlmeise', 'gretit3': 'Kohlmeise',
  // Blaumeise (Cyanistes caeruleus)
  'blutit': 'Blaumeise', 'blutit1': 'Blaumeise', 'blutit2': 'Blaumeise', 'blutit3': 'Blaumeise', 'eurblt': 'Blaumeise', 'eurblt1': 'Blaumeise',
  // Tannenmeise (Periparus ater)
  'coltit': 'Tannenmeise', 'coltit1': 'Tannenmeise', 'eurcti': 'Tannenmeise',
  // Buchfink (Fringilla coelebs)
  'comcha': 'Buchfink', 'comcha1': 'Buchfink', 'houfin': 'Buchfink', 'eurchf': 'Buchfink',
  // Grünfink (Chloris chloris)
  'eurgre': 'Grünfink', 'eurgre1': 'Grünfink', 'eurgrf2': 'Grünfink', 'grefin1': 'Grünfink', 'grefin': 'Grünfink',
  // Stieglitz (Carduelis carduelis)
  'eurgol': 'Stieglitz', 'eurgol1': 'Stieglitz', 'goldfi5': 'Stieglitz', 'goldfinch': 'Stieglitz',
  // Haussperling (Passer domesticus)
  'houspa': 'Haussperling', 'houspa1': 'Haussperling', 'eutspa': 'Haussperling', 'hoospa': 'Haussperling',
  // Feldsperling (Passer montanus)
  'trespa': 'Feldsperling', 'trespa1': 'Feldsperling', 'euatsp': 'Feldsperling',
  // Rotkehlchen (Erithacus rubecula)
  'eurrob': 'Rotkehlchen', 'eurrob1': 'Rotkehlchen', 'eurrob2': 'Rotkehlchen',
  // Nachtigall (Luscinia megarhynchos)
  'nigale': 'Nachtigall', 'nigale1': 'Nachtigall', 'comnig': 'Nachtigall', 'comnig1': 'Nachtigall',
  // Ringeltaube (Columba palumbus)
  'comwoo': 'Ringeltaube', 'comwoo1': 'Ringeltaube', 'comwpi': 'Ringeltaube', 'comwpi1': 'Ringeltaube', 'woopio1': 'Ringeltaube',
  // Türkentaube (Streptopelia decaocto)
  'eutdov': 'Türkentaube', 'eutdov1': 'Türkentaube', 'eurtdv': 'Türkentaube', 'coldo2': 'Türkentaube', 'coldov': 'Türkentaube',
  // Elster (Pica pica)
  'eurmag': 'Elster', 'eurmag1': 'Elster', 'blbmag1': 'Elster',
  // Rabenkrähe (Corvus corone)
  'carcro': 'Rabenkrähe', 'carcro1': 'Rabenkrähe', 'carcrow': 'Rabenkrähe', 'hoocro': 'Rabenkrähe', 'hoocro1': 'Rabenkrähe', 'blkcro1': 'Rabenkrähe',
  // Eichelhäher (Garrulus glandarius)
  'eurjay': 'Eichelhäher', 'eurjay1': 'Eichelhäher', 'eurjay2': 'Eichelhäher',
  // Star (Sturnus vulgaris)
  'eursta': 'Star', 'eursta1': 'Star', 'comsta': 'Star', 'comsta1': 'Star',
  // Buntspecht (Dendrocopos major)
  'grswoo': 'Buntspecht', 'grswoo1': 'Buntspecht', 'grtwoo': 'Buntspecht', 'grewoo1': 'Buntspecht',
  // Grünspecht (Picus viridis)
  'eurgrf': 'Grünspecht', 'eurgrf1': 'Grünspecht', 'grnwoo': 'Grünspecht',
  // Stockente (Anas platyrhynchos)
  'mallar': 'Stockente', 'mallar1': 'Stockente', 'mallard': 'Stockente', 'mallrd': 'Stockente',
  // Graureiher (Ardea cinerea)
  'greher': 'Graureiher', 'greher1': 'Graureiher', 'gryher1': 'Graureiher',
  // Mäusebussard (Buteo buteo)
  'combuz': 'Mäusebussard', 'combuz1': 'Mäusebussard', 'eurbuz': 'Mäusebussard',
  // Turmfalke (Falco tinnunculus)
  'comkes': 'Turmfalke', 'comkes1': 'Turmfalke', 'eurkes': 'Turmfalke', 'eurkes1': 'Turmfalke',
  // Waldkauz (Strix aluco)
  'tawowl': 'Waldkauz', 'tawowl1': 'Waldkauz', 'eurtwl': 'Waldkauz', 'eurtwl1': 'Waldkauz',
  // Uhu (Bubo bubo)
  'eueowl': 'Uhu', 'eueowl1': 'Uhu', 'eaowl1': 'Uhu',
  // Zaunkönig (Troglodytes troglodytes)
  'eurwre': 'Zaunkönig', 'eurwre1': 'Zaunkönig', 'wren1': 'Zaunkönig', 'wren': 'Zaunkönig', 'winwre': 'Zaunkönig', 'winwre3': 'Zaunkönig',
  // Kleiber (Sitta europaea)
  'eurnut': 'Kleiber', 'eurnut1': 'Kleiber', 'euanut': 'Kleiber', 'euanut1': 'Kleiber', 'wbnutha1': 'Kleiber',
  // Zilpzalp (Phylloscopus collybita)
  'comchi': 'Zilpzalp', 'comchi1': 'Zilpzalp', 'eurchf1': 'Zilpzalp', 'chfwar1': 'Zilpzalp', 'chitchaff': 'Zilpzalp',
  // Fitis (Phylloscopus trochilus)
  'wilwar': 'Fitis', 'wilwar1': 'Fitis', 'wilwar2': 'Fitis',
  // Kuckuck (Cuculus canorus)
  'comcuc': 'Kuckuck', 'comcuc1': 'Kuckuck', 'eurcuc': 'Kuckuck',
  // Mauersegler (Apus apus)
  'comswi': 'Mauersegler', 'comswi1': 'Mauersegler', 'comswi2': 'Mauersegler', 'eugnig': 'Mauersegler', 'eugnig1': 'Mauersegler',

  // ══════════════════════════════════════════════════════════════
  // ERWEITERTE BirdNET-Codes für ~130 weitere europäische Arten
  // ══════════════════════════════════════════════════════════════

  // Drosseln
  'fieldf': 'Wacholderdrossel', 'fieldf1': 'Wacholderdrossel', 'fiefare': 'Wacholderdrossel', 'fiefare1': 'Wacholderdrossel',
  'misthr': 'Misteldrossel', 'misthr1': 'Misteldrossel', 'mistle': 'Misteldrossel',
  'rinouz': 'Ringdrossel', 'rinouz1': 'Ringdrossel', 'rinouzel': 'Ringdrossel',
  'redwin': 'Rotdrossel', 'redwin1': 'Rotdrossel', 'redwing': 'Rotdrossel',

  // Meisen (erweitert)
  'martit': 'Sumpfmeise', 'martit1': 'Sumpfmeise', 'marsti': 'Sumpfmeise',
  'wiltit': 'Weidenmeise', 'wiltit1': 'Weidenmeise', 'willow': 'Weidenmeise',
  'cretit': 'Haubenmeise', 'cretit1': 'Haubenmeise', 'eucrtt': 'Haubenmeise',
  'lotit1': 'Schwanzmeise', 'lottit': 'Schwanzmeise', 'lottit1': 'Schwanzmeise',
  'beared': 'Bartmeise', 'bearee': 'Bartmeise', 'bearee1': 'Bartmeise',

  // Finken (erweitert)
  'brambl': 'Bergfink', 'brambl1': 'Bergfink', 'brabling': 'Bergfink',
  'hawfin': 'Kernbeißer', 'hawfin1': 'Kernbeißer', 'hawfinch': 'Kernbeißer',
  'comlin': 'Bluthänfling', 'comlin1': 'Bluthänfling', 'linnet': 'Bluthänfling',
  'comred': 'Birkenzeisig', 'comred1': 'Birkenzeisig', 'redpol': 'Birkenzeisig', 'lesser': 'Birkenzeisig',
  'eursis': 'Erlenzeisig', 'eursis1': 'Erlenzeisig', 'siskin': 'Erlenzeisig',
  'eurser': 'Girlitz', 'eurser1': 'Girlitz', 'serin1': 'Girlitz',
  'eurbul': 'Gimpel', 'eurbul1': 'Gimpel', 'bulfinch': 'Gimpel', 'bullfi': 'Gimpel',
  'redcro': 'Fichtenkreuzschnabel', 'redcro1': 'Fichtenkreuzschnabel', 'crsbil': 'Fichtenkreuzschnabel',

  // Grasmücken & Laubsänger (erweitert)
  'eurbla2': 'Mönchsgrasmücke', 'eurblc': 'Mönchsgrasmücke', 'eurblc1': 'Mönchsgrasmücke', 'blacp1': 'Mönchsgrasmücke', 'blacap': 'Mönchsgrasmücke',
  'garwar': 'Gartengrasmücke', 'garwar1': 'Gartengrasmücke',
  'comwhi': 'Dorngrasmücke', 'comwhi1': 'Dorngrasmücke', 'comwht': 'Dorngrasmücke',
  'leswhi': 'Klappergrasmücke', 'leswhi1': 'Klappergrasmücke', 'leswht': 'Klappergrasmücke',
  'barwar': 'Sperbergrasmücke', 'barwar1': 'Sperbergrasmücke',
  'woowar': 'Waldlaubsänger', 'woowar1': 'Waldlaubsänger', 'woodwa': 'Waldlaubsänger',

  // Rohrsänger & Spötter
  'eurrew': 'Teichrohrsänger', 'eurrew1': 'Teichrohrsänger', 'reed1': 'Teichrohrsänger',
  'marwar': 'Sumpfrohrsänger', 'marwar1': 'Sumpfrohrsänger',
  'grerwa': 'Drosselrohrsänger', 'grerwa1': 'Drosselrohrsänger', 'grtrwa': 'Drosselrohrsänger',
  'ictwar': 'Gelbspötter', 'ictwar1': 'Gelbspötter',

  // Goldhähnchen
  'goldcr': 'Wintergoldhähnchen', 'goldcr1': 'Wintergoldhähnchen',
  'firecr': 'Sommergoldhähnchen', 'firecr1': 'Sommergoldhähnchen',

  // Schwalben
  'barswa': 'Rauchschwalbe', 'barswa1': 'Rauchschwalbe', 'barnswl': 'Rauchschwalbe',
  'comhom': 'Mehlschwalbe', 'comhom1': 'Mehlschwalbe', 'houma1': 'Mehlschwalbe',
  'sanmaa': 'Uferschwalbe', 'sanmaa1': 'Uferschwalbe', 'sanmar': 'Uferschwalbe', 'sanma1': 'Uferschwalbe',

  // Stelzen & Pieper
  'whtwag': 'Bachstelze', 'whtwag1': 'Bachstelze', 'whiwag': 'Bachstelze', 'piedalb': 'Bachstelze',
  'grywag': 'Gebirgsstelze', 'grywag1': 'Gebirgsstelze', 'greywag': 'Gebirgsstelze',
  'weswag': 'Schafstelze', 'weswag1': 'Schafstelze', 'yelwag': 'Schafstelze',
  'meapip': 'Wiesenpieper', 'meapip1': 'Wiesenpieper',
  'trepip': 'Baumpieper', 'trepip1': 'Baumpieper',

  // Schnäpper & Rotschwänze
  'blared': 'Hausrotschwanz', 'blared1': 'Hausrotschwanz', 'blkred': 'Hausrotschwanz',
  'comred2': 'Gartenrotschwanz', 'comred3': 'Gartenrotschwanz', 'comredst': 'Gartenrotschwanz',
  'eurpif': 'Trauerschnäpper', 'eurpif1': 'Trauerschnäpper', 'piefly': 'Trauerschnäpper',
  'spofly': 'Grauschnäpper', 'spofly1': 'Grauschnäpper',
  'norwhe': 'Steinschmätzer', 'norwhe1': 'Steinschmätzer', 'wheat1': 'Steinschmätzer',
  'whinch': 'Braunkehlchen', 'whinch1': 'Braunkehlchen',
  'eursto': 'Schwarzkehlchen', 'eursto1': 'Schwarzkehlchen', 'stonec': 'Schwarzkehlchen',

  // Heckenbraunelle
  'dunnoc': 'Heckenbraunelle', 'dunnoc1': 'Heckenbraunelle',

  // Ammern
  'yellow2': 'Goldammer', 'yelham': 'Goldammer', 'yelham1': 'Goldammer', 'yellowh': 'Goldammer',
  'comreb': 'Rohrammer', 'comreb1': 'Rohrammer', 'reebun': 'Rohrammer',
  'corbun': 'Grauammer', 'corbun1': 'Grauammer',
  'ortbun': 'Ortolan', 'ortbun1': 'Ortolan',
  'rocbun': 'Zippammer', 'rocbun1': 'Zippammer',

  // Rabenvögel (erweitert)
  'wesjac': 'Dohle', 'wesjac1': 'Dohle', 'eurjac': 'Dohle', 'jackdaw': 'Dohle',
  'rook1': 'Saatkrähe', 'rook': 'Saatkrähe',
  'hoocrow': 'Nebelkrähe',
  'comrav': 'Kolkrabe', 'comrav1': 'Kolkrabe', 'norraven': 'Kolkrabe',
  'sponut': 'Tannenhäher', 'sponut1': 'Tannenhäher',

  // Spechte (erweitert)
  'blawoo': 'Schwarzspecht', 'blawoo1': 'Schwarzspecht', 'blkwoo': 'Schwarzspecht',
  'midswo': 'Mittelspecht', 'midswo1': 'Mittelspecht', 'midwoo': 'Mittelspecht',
  'lesswo': 'Kleinspecht', 'lesswo1': 'Kleinspecht', 'leswoo': 'Kleinspecht',
  'grywoo': 'Grauspecht', 'grywoo1': 'Grauspecht', 'gryhew': 'Grauspecht',
  'eurwry': 'Wendehals', 'eurwry1': 'Wendehals', 'wrynec': 'Wendehals',

  // Eulen (erweitert)
  'brnowl': 'Schleiereule', 'brnowl1': 'Schleiereule', 'barnow': 'Schleiereule', 'barnow1': 'Schleiereule',
  'litowl': 'Steinkauz', 'litowl1': 'Steinkauz',
  'loeowl': 'Waldohreule', 'loeowl1': 'Waldohreule', 'loneow': 'Waldohreule',
  'sheowl': 'Sumpfohreule', 'sheowl1': 'Sumpfohreule',
  'eupowl': 'Sperlingskauz', 'eupowl1': 'Sperlingskauz',
  'borowl': 'Raufußkauz', 'borowl1': 'Raufußkauz', 'tengma': 'Raufußkauz',

  // Greifvögel (erweitert)
  'eurspa': 'Sperber', 'eurspa1': 'Sperber', 'spahaw': 'Sperber',
  'norgos': 'Habicht', 'norgos1': 'Habicht', 'goshawk': 'Habicht',
  'redkit': 'Rotmilan', 'redkit1': 'Rotmilan',
  'blakit': 'Schwarzmilan', 'blakit1': 'Schwarzmilan', 'blkkit': 'Schwarzmilan',
  'eurhnb': 'Wespenbussard', 'eurhnb1': 'Wespenbussard', 'honbuz': 'Wespenbussard',
  'perfal': 'Wanderfalke', 'perfal1': 'Wanderfalke', 'perefa': 'Wanderfalke',
  'eurhob': 'Baumfalke', 'eurhob1': 'Baumfalke',
  'osprey': 'Fischadler', 'osprey1': 'Fischadler',
  'whteag': 'Seeadler', 'whteag1': 'Seeadler', 'whteia': 'Seeadler',

  // Wasservögel (erweitert)
  'eurcoo': 'Blässhuhn', 'eurcoo1': 'Blässhuhn', 'coot1': 'Blässhuhn',
  'commoo': 'Teichhuhn', 'commoo1': 'Teichhuhn', 'moorhe': 'Teichhuhn',
  'watrai': 'Wasserralle', 'watrai1': 'Wasserralle',
  'spocra': 'Tüpfelsumpfhuhn', 'spocra1': 'Tüpfelsumpfhuhn',
  'corncr': 'Wachtelkönig', 'corncr1': 'Wachtelkönig',
  'grcgre': 'Haubentaucher', 'grcgre1': 'Haubentaucher',
  'litgre': 'Zwergtaucher', 'litgre1': 'Zwergtaucher',
  'gragoo': 'Graugans', 'gragoo1': 'Graugans', 'greygo': 'Graugans', 'grylgo': 'Graugans',
  'cangoo': 'Kanadagans', 'cangoo1': 'Kanadagans',
  'egygoo': 'Nilgans', 'egygoo1': 'Nilgans',
  'mutswa': 'Höckerschwan', 'mutswa1': 'Höckerschwan',
  'eurtea': 'Krickente', 'eurtea1': 'Krickente', 'comtea': 'Krickente',
  'tufduc': 'Reiherente', 'tufduc1': 'Reiherente',
  'compoc': 'Tafelente', 'compoc1': 'Tafelente',
  'gadwal': 'Schnatterente', 'gadwal1': 'Schnatterente',
  'norsho': 'Löffelente', 'norsho1': 'Löffelente',
  'commer': 'Gänsesäger', 'commer1': 'Gänsesäger', 'goosander': 'Gänsesäger',
  'grecor': 'Kormoran', 'grecor1': 'Kormoran', 'grcorm': 'Kormoran',

  // Reiher & Störche (erweitert)
  'grtegr': 'Silberreiher', 'grtegr1': 'Silberreiher', 'greegr': 'Silberreiher',
  'whisto': 'Weißstorch', 'whisto1': 'Weißstorch',
  'blasto': 'Schwarzstorch', 'blasto1': 'Schwarzstorch',

  // Watvögel / Limikolen
  'norlap': 'Kiebitz', 'norlap1': 'Kiebitz', 'lapwing': 'Kiebitz',
  'comsni': 'Bekassine', 'comsni1': 'Bekassine',
  'eurwoo': 'Waldschnepfe', 'eurwoo1': 'Waldschnepfe', 'woodco': 'Waldschnepfe',
  'litrin': 'Flussregenpfeifer', 'litrin1': 'Flussregenpfeifer',
  'comsan': 'Flussuferläufer', 'comsan1': 'Flussuferläufer',

  // Möwen & Seeschwalben
  'bkhgul': 'Lachmöwe', 'bkhgul1': 'Lachmöwe', 'blhgul': 'Lachmöwe',
  'hergul': 'Silbermöwe', 'hergul1': 'Silbermöwe',
  'casgul': 'Steppenmöwe', 'casgul1': 'Steppenmöwe',
  'mewgul': 'Sturmmöwe', 'mewgul1': 'Sturmmöwe', 'comgul': 'Sturmmöwe',
  'comter': 'Flussseeschwalbe', 'comter1': 'Flussseeschwalbe',

  // Tauben (erweitert)
  'stcdov': 'Hohltaube', 'stcdov1': 'Hohltaube', 'stodov': 'Hohltaube',
  'rocpig': 'Straßentaube', 'rocpig1': 'Straßentaube', 'rocdov': 'Straßentaube', 'pigeon': 'Straßentaube',
  'turtur': 'Turteltaube', 'turtdo': 'Turteltaube', 'eurtur': 'Turteltaube', 'eurtdv1': 'Turteltaube',

  // Hühnervögel
  'comphe': 'Fasan', 'comphe1': 'Fasan', 'pheasant': 'Fasan',
  'grypar': 'Rebhuhn', 'grypar1': 'Rebhuhn',
  'comqua': 'Wachtel', 'comqua1': 'Wachtel',

  // Neozoen / Papageien
  'rorpar': 'Halsbandsittich', 'rorpar1': 'Halsbandsittich', 'rinpar': 'Halsbandsittich',
  'alepar': 'Alexandersittich', 'alepar1': 'Alexandersittich',

  // Spezialisten & Sondervögel
  'comkin': 'Eisvogel', 'comkin1': 'Eisvogel', 'kingfi': 'Eisvogel',
  'eurbee': 'Bienenfresser', 'eurbee1': 'Bienenfresser', 'beaeat': 'Bienenfresser',
  'eurhoo': 'Wiedehopf', 'eurhoo1': 'Wiedehopf', 'hoopoe': 'Wiedehopf',
  'eurgoo': 'Pirol', 'eurgoo1': 'Pirol', 'golori': 'Pirol', 'golori1': 'Pirol',
  'rebshr': 'Neuntöter', 'rebshr1': 'Neuntöter',
  'greshr': 'Raubwürger', 'greshr1': 'Raubwürger', 'grgshr': 'Raubwürger',
  'whtdip': 'Wasseramsel', 'whtdip1': 'Wasseramsel', 'dipper': 'Wasseramsel',
  'eurtrc': 'Baumläufer', 'eurtrc1': 'Baumläufer',
  'shttre': 'Gartenbaumläufer', 'shttre1': 'Gartenbaumläufer',
  'eursky': 'Feldlerche', 'eursky1': 'Feldlerche', 'skylar': 'Feldlerche',
  'crela1': 'Haubenlerche', 'crelar': 'Haubenlerche',
  'woodla': 'Heidelerche', 'woodla1': 'Heidelerche',
  'comcra': 'Kranich', 'comcra1': 'Kranich', 'crane1': 'Kranich',

  // Goldammer (yellow2 war vorher Fehlzuordnung)
  'yellowhammer': 'Goldammer',
};

// ══════════════════════════════════════════════════════════════
// GEOGRAPHIC PLAUSIBILITY FILTER
// ══════════════════════════════════════════════════════════════

// Schlüsselwörter die auf nicht-europäische Arten hindeuten
const EXOTIC_KEYWORDS = [
  'chachalaca', 'guan', 'tinamou', 'toucan', 'macaw', 'parakeet',
  'quetzal', 'motmot', 'tanager', 'antbird', 'antpitta', 'antshrike',
  'antwren', 'manakin', 'cotinga', 'woodcreeper', 'barbet', 'trogon',
  'jacamar', 'puffbird', 'bellbird', 'cacique', 'elepaio', 'oropendola',
  'honeycreeper', 'euphonia', 'saltator', 'seedeater', 'grassquit',
  'ani', 'potoo', 'nightjar-tropical', 'hermit', 'mango', 'emerald',
  'hummingbird', 'sabrewing', 'brilliant', 'sunangel', 'starfrontlet',
  'thornbill', 'woodstar', 'sapphire', 'violetear', 'piculet',
  'foliage-gleaner', 'xenops', 'spinetail', 'canastero', 'hornero',
  'tapaculo', 'tyrannulet', 'flycatcher-tropical', 'kingbird',
  'kiskadee', 'attila', 'tityra', 'becard', 'piha', 'umbrellabird',
  'cock-of-the-rock', 'fruiteater', 'berryeater', 'chat-tropical',
  'pygmy-owl-tropical', 'screech-owl-tropical',
  // Afrikanische Arten
  'sunbird', 'weaver', 'bishop', 'whydah', 'indigobird', 'firefinch',
  'waxbill', 'mannikin', 'pytilia', 'twinspot',
  // Australische Arten
  'lyrebird', 'bowerbird', 'fairywren', 'honeyeater', 'lorikeet',
  'cockatoo', 'galah', 'rosella', 'kookaburra', 'frogmouth',
  // Asiatische Arten
  'leafbird', 'iora', 'minivet', 'drongo', 'bulbul-asian',
  // Geographische Marker
  'african', 'american', 'australian', 'amazonian', 'andean', 
  'caribbean', 'cuban', 'jamaican', 'hawaiian', 'galapagos',
  'mexican', 'west mexican', 'east mexican', 'brazilian', 'peruvian',
  'colombian', 'venezuelan', 'ecuadorian', 'bolivian', 'panamanian',
  'costa rican', 'honduran', 'salvadoran', 'guatemalan', 'nicaraguan',
  'trinidadian', 'chaco', 'cerrado', 'caatinga', 'pampas',
  'new zealand', 'new guinea', 'philippine', 'bornean', 'sumatran',
  'javan', 'sulawesi', 'madagascar', 'malagasy', 'reunion',
  'indian', 'sri lanka', 'chinese', 'japanese', 'taiwanese',
  'band-tailed', 'tawny-breasted', 'chestnut-winged',
  // Weitere nicht-europäische Marker
  'nothura', 'fish crow', 'fish eagle', 'crow-tropical',
  'mockingbird', 'cardinal', 'blue jay', 'catbird', 'towhee', 'junco',
  'vireo', 'thrasher', 'wren-tropical', 'grackle', 'oriole-tropical',
  'chickadee', 'titmouse', 'nuthatch-tropical', 'sapsucker',
  'flicker-tropical', 'pewee', 'phoebe', 'empidonax',
  'south american', 'north american', 'central american', 'neotropical',
  'white-bellied', 'rufous-bellied', 'buff-bellied', 'yellow-bellied',
];

/**
 * Prüft ob eine Art plausibel für Mitteleuropa ist.
 * @param {string} name - Artname (englisch, deutsch oder wissenschaftlich)
 * @returns {boolean} true wenn die Art in Europa vorkommen könnte
 */
export const isPlausibleEuropean = (name) => {
  if (!name) return false;
  const lower = name.toLowerCase();
  
  // Wenn in BIRD_LIBRARY → auf jeden Fall europäisch
  if (BIRD_LIBRARY[name]) return true;
  
  // Prüfe gegen exotische Schlüsselwörter
  return !EXOTIC_KEYWORDS.some(kw => lower.includes(kw));
};

/**
 * Löst einen Artnamen in alle Namensversionen auf.
 * 
 * @param {string} rawName - Rohname aus API (englisch, BirdNET-Code, etc.)
 * @param {string} rawScientific - Wissenschaftlicher Name aus API (optional)
 * @returns {{ german: string, scientific: string, english: string, family: string, order: string, icon: string, inLibrary: boolean }}
 */
export const resolveSpecies = (rawName, rawScientific) => {
  if (!rawName) return { german: 'Unbekannt', scientific: '', english: '', family: '', order: '', icon: '🐦', inLibrary: false };
  
  // 1. Direkt in BIRD_LIBRARY (bereits deutscher Name)
  if (BIRD_LIBRARY[rawName]) {
    const b = BIRD_LIBRARY[rawName];
    return {
      german: rawName,
      scientific: b.scientificName || rawScientific || '',
      english: b.englishName || '',
      family: b.family || '',
      order: b.order || '',
      icon: b.icon || '🐦',
      inLibrary: true,
    };
  }
  
  // 2. BirdNET eBird-Code Lookup
  const codeLower = rawName.toLowerCase().replace(/[\s_-]/g, '');
  if (BIRDNET_CODES[codeLower]) {
    const de = BIRDNET_CODES[codeLower];
    const b = BIRD_LIBRARY[de] || {};
    return {
      german: de,
      scientific: b.scientificName || rawScientific || '',
      english: b.englishName || rawName,
      family: b.family || '',
      order: b.order || '',
      icon: b.icon || '🐦',
      inLibrary: !!BIRD_LIBRARY[de],
    };
  }
  
  // 3. English Name Lookup
  const engLower = rawName.toLowerCase();
  if (byEnglish[engLower]) {
    const de = byEnglish[engLower];
    const b = BIRD_LIBRARY[de];
    return {
      german: de,
      scientific: b.scientificName || rawScientific || '',
      english: rawName,
      family: b.family || '',
      order: b.order || '',
      icon: b.icon || '🐦',
      inLibrary: true,
    };
  }
  
  // 4. Scientific Name Lookup
  if (rawScientific && byScientific[rawScientific.toLowerCase()]) {
    const de = byScientific[rawScientific.toLowerCase()];
    const b = BIRD_LIBRARY[de];
    return {
      german: de,
      scientific: rawScientific,
      english: b.englishName || rawName,
      family: b.family || '',
      order: b.order || '',
      icon: b.icon || '🐦',
      inLibrary: true,
    };
  }
  
  // 5. ID-based Lookup (species codes like turdus_merula)
  const idLower = rawName.toLowerCase().replace(/[\s]/g, '_');
  if (byId[idLower]) {
    const de = byId[idLower];
    const b = BIRD_LIBRARY[de];
    return {
      german: de,
      scientific: b.scientificName || rawScientific || '',
      english: b.englishName || rawName,
      family: b.family || '',
      order: b.order || '',
      icon: b.icon || '🐦',
      inLibrary: true,
    };
  }
  
  // 6. Fallback: Name nicht auflösbar
  return {
    german: rawName,
    scientific: rawScientific || '',
    english: rawName,
    family: '',
    order: '',
    icon: '🐦',
    inLibrary: false,
  };
};

/**
 * Berechnet ob eine Erkennung als "unabhängig" gilt (temporal dedup).
 * Eine Erkennung ist unabhängig, wenn die gleiche Art nicht in den
 * letzten `windowSec` Sekunden erkannt wurde.
 * 
 * @param {string} species - Artname
 * @param {Date} time - Zeitpunkt
 * @param {Object} lastDetectionTimes - Map { species: lastTimestamp }
 * @param {number} windowSec - Zeitfenster in Sekunden (default: 30)
 * @returns {boolean} true wenn unabhängige Erkennung
 */
export const isIndependentDetection = (species, time, lastDetectionTimes, windowSec = 30) => {
  const lastTime = lastDetectionTimes[species];
  if (!lastTime) return true;
  const diffMs = time.getTime() - new Date(lastTime).getTime();
  return diffMs >= windowSec * 1000;
};

export default { resolveSpecies, isPlausibleEuropean, isIndependentDetection };
