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

// BirdNET eBird-Codes → Deutsche Trivialnamen (häufige mitteleuropäische Arten)
const BIRDNET_CODES = {
  'eurbla': 'Amsel', 'eurbla1': 'Amsel',
  'eurgre1': 'Grünfink', 'eutspa': 'Haussperling', 'trespa': 'Feldsperling',
  'eursta': 'Star', 'eursta1': 'Star',
  'houfin': 'Buchfink', 'comcha1': 'Buchfink',
  'blutit1': 'Blaumeise', 'blutit2': 'Blaumeise',
  'gretit1': 'Kohlmeise', 'gretit2': 'Kohlmeise',
  'eurrob1': 'Rotkehlchen', 'eurrob': 'Rotkehlchen',
  'eurmag1': 'Elster', 'eurjay': 'Eichelhäher', 'eurjay1': 'Eichelhäher',
  'comwoo1': 'Ringeltaube', 'comwpi1': 'Ringeltaube',
  'eurwre1': 'Zaunkönig', 'eurwre': 'Zaunkönig',
  'grewoo1': 'Buntspecht', 'grswoo1': 'Buntspecht',
  'eugnig1': 'Mauersegler', 'comswi1': 'Mauersegler',
  'blkcro1': 'Rabenkrähe', 'carcro1': 'Rabenkrähe', 'hoocro1': 'Rabenkrähe',
  'eurnut1': 'Kleiber', 'euanut1': 'Kleiber',
  'eurgol1': 'Stieglitz', 'goldfi5': 'Stieglitz',
  'eurgrf': 'Grünspecht', 'eurgrf1': 'Grünspecht',
  'comred1': 'Birkenzeisig',
  'songthr1': 'Singdrossel', 'sonthr1': 'Singdrossel',
  'hawfin1': 'Kernbeißer', 'hawfin': 'Kernbeißer',
  'eugspa1': 'Heckenbraunelle', 
  'gartre1': 'Gartenrotschwanz',
  'comred': 'Hausrotschwanz',
  'comlin1': 'Bluthänfling', 'eurlin1': 'Bluthänfling',
  'skylar1': 'Feldlerche', 'eursla1': 'Feldlerche',
  'eursis1': 'Erlenzeisig',
  'comcuc1': 'Kuckuck', 'comcuc': 'Kuckuck',
  'eurblk1': 'Mönchsgrasmücke',
  'blacap1': 'Mönchsgrasmücke',
  'garwar1': 'Gartengrasmücke',
  'comwhi1': 'Dorngrasmücke',
  'wilwar1': 'Fitis',
  'chitchaff1': 'Zilpzalp', 'eurchf1': 'Zilpzalp', 'comchi1': 'Zilpzalp',
  'comswi2': 'Mauersegler',
  'barnow1': 'Schleiereule',
  'tawowl1': 'Waldkauz', 'eurtwl1': 'Waldkauz',
  'eueowl1': 'Uhu',
  'combuz1': 'Mäusebussard', 'combuz': 'Mäusebussard',
  'eursho1': 'Sperber',
  'comkes1': 'Turmfalke', 'eurkes1': 'Turmfalke',
  'whiwag1': 'Bachstelze', 'whtwal1': 'Bachstelze',
  'greher1': 'Graureiher',
  'comcoo1': 'Blässhuhn',
  'eurtea1': 'Krickente',
  'mallar1': 'Stockente', 'mallard': 'Stockente',
  'gragor1': 'Graugans', 'gragoo1': 'Graugans',
  'comcra1': 'Wachtelkönig',
  'nigale1': 'Nachtigall', 'comnig1': 'Nachtigall',
  'eugswa1': 'Rauchschwalbe', 'barswa1': 'Rauchschwalbe',
  'houmr1': 'Mehlschwalbe', 'comhsm1': 'Mehlschwalbe',
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
