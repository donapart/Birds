/**
 * SpeciesResolver - Artennamen-Auflösung & geographischer Plausibilitätsfilter
 * 
 * Löst englische Artnamen, BirdNET-Codes und wissenschaftliche Namen
 * in deutsche Trivialnamen auf. Filtert nicht-europäische Arten.
 * 
 * BirdSound v5.9.0 — Dano Schönwald
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
