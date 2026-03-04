/**
 * Arten-Bibliothek - Lokales Vogellexikon
 * Enthält Bilder, Beschreibungen, Gesang-Infos, Habitat, Verbreitung
 */

export const BIRD_LIBRARY = {
  // === DROSSELN ===
  'Amsel': {
    id: 'turdus_merula',
    scientificName: 'Turdus merula',
    germanName: 'Amsel',
    englishName: 'Common Blackbird',
    family: 'Drosseln (Turdidae)',
    order: 'Sperlingsvögel (Passeriformes)',
    icon: '🐦‍⬛',
    image: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Common_Blackbird.jpg',
    description: 'Die Amsel ist einer der häufigsten Singvögel in Europa. Männchen sind komplett schwarz mit orangegelbem Schnabel, Weibchen sind braun gefärbt.',
    size: '24-25 cm',
    weight: '80-125 g',
    wingspan: '34-38 cm',
    habitat: ['Wälder', 'Gärten', 'Parks', 'Siedlungen'],
    habitatTypes: ['urban', 'forest', 'garden'],
    food: 'Regenwürmer, Insekten, Beeren, Früchte',
    breedingSeason: 'März - August',
    nestType: 'Napfnest aus Zweigen und Moos',
    eggs: '3-6 blaugrüne Eier mit braunen Flecken',
    voice: {
      song: 'Melodischer, flötender Gesang mit vielen Variationen',
      call: 'Lautes "tjuk-tjuk-tjuk" bei Gefahr',
      frequency: '2.0-4.0 kHz',
      peakFrequency: 2.8,
    },
    distribution: {
      europe: 'Ganzjährig in ganz Europa',
      germany: 'Sehr häufiger Brutvogel',
      migration: 'Standvogel, nordische Populationen ziehen',
    },
    conservation: {
      status: 'LC', // Least Concern
      trend: 'stabil',
      redListDE: 'nicht gefährdet',
    },
    funFacts: [
      'Amseln können bis zu 5 Jahre alt werden',
      'Sie singen oft von erhöhten Warten',
      'Männchen verteidigen ihr Revier aggressiv',
    ],
    similarSpecies: ['Ringdrossel', 'Singdrossel'],
    bestTime: ['Morgen', 'Abenddämmerung'],
    rarity: 1, // 1=sehr häufig, 5=sehr selten
  },

  'Singdrossel': {
    id: 'turdus_philomelos',
    scientificName: 'Turdus philomelos',
    germanName: 'Singdrossel',
    englishName: 'Song Thrush',
    family: 'Drosseln (Turdidae)',
    order: 'Sperlingsvögel (Passeriformes)',
    icon: '🐦',
    image: 'https://upload.wikimedia.org/wikipedia/commons/1/19/Song_Thrush_%28Turdus_philomelos%29.jpg',
    description: 'Die Singdrossel ist bekannt für ihren melodischen Gesang, bei dem sie Phrasen typischerweise 2-4 mal wiederholt.',
    size: '20-23 cm',
    weight: '65-90 g',
    wingspan: '33-36 cm',
    habitat: ['Wälder', 'Parks', 'Gärten'],
    habitatTypes: ['forest', 'garden', 'park'],
    food: 'Schnecken, Würmer, Beeren',
    breedingSeason: 'März - Juli',
    voice: {
      song: 'Klarer, melodischer Gesang mit wiederholten Phrasen',
      call: 'Scharfes "zip"',
      frequency: '2.5-6.0 kHz',
      peakFrequency: 3.5,
    },
    distribution: {
      europe: 'Brutvogel in weiten Teilen Europas',
      germany: 'Häufiger Brutvogel',
      migration: 'Teilzieher',
    },
    conservation: { status: 'LC', trend: 'leicht abnehmend', redListDE: 'nicht gefährdet' },
    rarity: 2,
  },

  // === MEISEN ===
  'Kohlmeise': {
    id: 'parus_major',
    scientificName: 'Parus major',
    germanName: 'Kohlmeise',
    englishName: 'Great Tit',
    family: 'Meisen (Paridae)',
    order: 'Sperlingsvögel (Passeriformes)',
    icon: '🐤',
    image: 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Great_tit_side-on.jpg',
    description: 'Die Kohlmeise ist die größte einheimische Meisenart. Charakteristisch ist der schwarze Kopf mit weißen Wangen und der gelbe Bauch mit schwarzem Mittelstreif.',
    size: '13.5-14.5 cm',
    weight: '16-21 g',
    wingspan: '22-25 cm',
    habitat: ['Wälder', 'Gärten', 'Parks'],
    habitatTypes: ['forest', 'garden', 'urban', 'park'],
    food: 'Insekten, Samen, Nüsse, Fettfutter',
    breedingSeason: 'April - Juni',
    nestType: 'Höhlenbrüter (Nistkästen)',
    eggs: '7-13 weiße Eier mit roten Punkten',
    voice: {
      song: 'Zweisilbiges "zi-zi-bäh" oder "ti-ta"',
      call: 'Vielfältige Rufe, oft "pink-pink"',
      frequency: '3.5-7.0 kHz',
      peakFrequency: 4.5,
    },
    distribution: {
      europe: 'Ganzjährig in ganz Europa',
      germany: 'Sehr häufiger Brutvogel',
      migration: 'Standvogel',
    },
    conservation: { status: 'LC', trend: 'stabil', redListDE: 'nicht gefährdet' },
    funFacts: [
      'Kohlmeisen können bis zu 15 Jahre alt werden',
      'Sie sind sehr intelligent und können Milchflaschen öffnen',
      'Im Winter kommen sie gerne an Futterstellen',
    ],
    rarity: 1,
  },

  'Blaumeise': {
    id: 'cyanistes_caeruleus',
    scientificName: 'Cyanistes caeruleus',
    germanName: 'Blaumeise',
    englishName: 'Eurasian Blue Tit',
    family: 'Meisen (Paridae)',
    order: 'Sperlingsvögel (Passeriformes)',
    icon: '🐤',
    image: 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Cyanistes_caeruleus_2_Luc_Viatour.jpg',
    description: 'Kleine, lebhafte Meise mit blauer Kappe, gelbem Bauch und weißem Gesicht mit schwarzem Augenstreif.',
    size: '11-12 cm',
    weight: '9-12 g',
    wingspan: '17-20 cm',
    habitat: ['Laubwälder', 'Gärten', 'Parks'],
    habitatTypes: ['forest', 'garden', 'park'],
    food: 'Insekten, Spinnen, Samen',
    breedingSeason: 'April - Juni',
    voice: {
      song: 'Hoher Triller "tsii-tsii-tsürrr"',
      call: 'Hohes "tsii-tsii"',
      frequency: '4.0-8.0 kHz',
      peakFrequency: 6.0,
    },
    distribution: {
      europe: 'West- und Mitteleuropa',
      germany: 'Häufiger Brutvogel',
      migration: 'Standvogel',
    },
    conservation: { status: 'LC', trend: 'stabil', redListDE: 'nicht gefährdet' },
    rarity: 1,
  },

  'Tannenmeise': {
    id: 'periparus_ater',
    scientificName: 'Periparus ater',
    germanName: 'Tannenmeise',
    englishName: 'Coal Tit',
    family: 'Meisen (Paridae)',
    icon: '🐤',
    description: 'Kleine Meise mit schwarzem Kopf, weißen Wangen und charakteristischem weißen Nackenfleck.',
    size: '10-11.5 cm',
    weight: '8-10 g',
    habitat: ['Nadelwälder', 'Mischwälder'],
    habitatTypes: ['forest', 'coniferous'],
    voice: {
      song: 'Hohes, schnelles "si-tü si-tü si-tü"',
      frequency: '5.0-9.0 kHz',
      peakFrequency: 7.0,
    },
    conservation: { status: 'LC', trend: 'stabil', redListDE: 'nicht gefährdet' },
    rarity: 2,
  },

  // === FINKEN ===
  'Buchfink': {
    id: 'fringilla_coelebs',
    scientificName: 'Fringilla coelebs',
    germanName: 'Buchfink',
    englishName: 'Common Chaffinch',
    family: 'Finken (Fringillidae)',
    order: 'Sperlingsvögel (Passeriformes)',
    icon: '🐦',
    image: 'https://upload.wikimedia.org/wikipedia/commons/4/41/Fringilla_coelebs_chaffinch_male_edit2.jpg',
    description: 'Der Buchfink ist einer der häufigsten Singvögel Europas. Männchen haben eine rostbraune Brust und blaugrauen Kopf, Weibchen sind bräunlich.',
    size: '14-16 cm',
    weight: '18-29 g',
    wingspan: '25-28 cm',
    habitat: ['Wälder', 'Parks', 'Gärten'],
    habitatTypes: ['forest', 'garden', 'park'],
    food: 'Samen, Insekten, Bucheckern',
    breedingSeason: 'April - Juli',
    voice: {
      song: 'Schmetternder Gesang mit typischem Endschnörkel',
      call: '"Pink" oder "fink"',
      frequency: '2.5-6.0 kHz',
      peakFrequency: 4.0,
    },
    distribution: {
      europe: 'Ganz Europa',
      germany: 'Sehr häufiger Brutvogel',
      migration: 'Teilzieher',
    },
    conservation: { status: 'LC', trend: 'stabil', redListDE: 'nicht gefährdet' },
    funFacts: [
      'Der wissenschaftliche Name "coelebs" bedeutet "der Ledige" - Weibchen ziehen im Winter weiter als Männchen',
    ],
    rarity: 1,
  },

  'Grünfink': {
    id: 'chloris_chloris',
    scientificName: 'Chloris chloris',
    germanName: 'Grünfink',
    englishName: 'European Greenfinch',
    family: 'Finken (Fringillidae)',
    icon: '🐦',
    description: 'Kräftiger Fink mit olivgrünem Gefieder und gelben Flügelfeldern.',
    size: '14-16 cm',
    weight: '25-34 g',
    habitat: ['Gärten', 'Parks', 'Waldränder'],
    habitatTypes: ['garden', 'urban', 'park'],
    voice: {
      song: 'Zwitschernder Gesang mit charakteristischem "djüüü"',
      frequency: '2.0-5.0 kHz',
      peakFrequency: 3.5,
    },
    conservation: { status: 'LC', trend: 'abnehmend', redListDE: 'nicht gefährdet' },
    rarity: 2,
  },

  'Stieglitz': {
    id: 'carduelis_carduelis',
    scientificName: 'Carduelis carduelis',
    germanName: 'Stieglitz',
    englishName: 'European Goldfinch',
    family: 'Finken (Fringillidae)',
    icon: '🐦',
    image: 'https://upload.wikimedia.org/wikipedia/commons/6/68/Carduelis_carduelis_close_up.jpg',
    description: 'Einer der farbenprächtigsten einheimischen Vögel mit roter Gesichtsmaske, schwarzweißem Kopf und goldgelben Flügelbinden.',
    size: '12-13 cm',
    weight: '14-19 g',
    habitat: ['Obstgärten', 'Brachen', 'Waldränder'],
    habitatTypes: ['garden', 'field', 'edge'],
    food: 'Samen von Disteln, Kletten, Löwenzahn',
    voice: {
      song: 'Melodisches, trillerndes "stiglit-stiglit"',
      frequency: '3.0-7.0 kHz',
      peakFrequency: 5.0,
    },
    conservation: { status: 'LC', trend: 'stabil', redListDE: 'nicht gefährdet' },
    funFacts: ['Der Name Stieglitz kommt von seinem Ruf'],
    rarity: 2,
  },

  // === SPERLINGE ===
  'Haussperling': {
    id: 'passer_domesticus',
    scientificName: 'Passer domesticus',
    germanName: 'Haussperling',
    englishName: 'House Sparrow',
    family: 'Sperlinge (Passeridae)',
    order: 'Sperlingsvögel (Passeriformes)',
    icon: '🐦',
    image: 'https://upload.wikimedia.org/wikipedia/commons/6/6e/Passer_domesticus_male_%2815%29.jpg',
    description: 'Der "Spatz" ist ein typischer Kulturfolger. Männchen haben graubraunen Scheitel und schwarzen Kehllatz, Weibchen sind unscheinbar graubraun.',
    size: '14-16 cm',
    weight: '26-35 g',
    wingspan: '21-25 cm',
    habitat: ['Siedlungen', 'Bauernhöfe', 'Städte'],
    habitatTypes: ['urban', 'farm'],
    food: 'Samen, Getreide, Insekten, Küchenabfälle',
    breedingSeason: 'April - August',
    voice: {
      song: 'Monotones Tschilpen "tschilp-tschilp"',
      call: 'Vielfaches Tschilpen',
      frequency: '2.0-5.0 kHz',
      peakFrequency: 3.0,
    },
    distribution: {
      europe: 'Überall in Siedlungen',
      germany: 'Häufig, aber abnehmend',
      migration: 'Standvogel',
    },
    conservation: { status: 'LC', trend: 'abnehmend', redListDE: 'Vorwarnliste' },
    funFacts: [
      'Spatzen leben gesellig in Kolonien',
      'Sie baden gerne im Staub',
    ],
    rarity: 1,
  },

  'Feldsperling': {
    id: 'passer_montanus',
    scientificName: 'Passer montanus',
    germanName: 'Feldsperling',
    englishName: 'Eurasian Tree Sparrow',
    family: 'Sperlinge (Passeridae)',
    icon: '🐦',
    description: 'Etwas kleiner als der Haussperling, mit rotbrauner Kappe und schwarzem Wangenfleck. Beide Geschlechter gleich gefärbt.',
    size: '12.5-14 cm',
    weight: '19-25 g',
    habitat: ['Ländliche Gebiete', 'Waldränder', 'Obstgärten'],
    habitatTypes: ['farm', 'field', 'garden'],
    voice: {
      song: 'Ähnlich Haussperling, etwas höher',
      frequency: '2.5-5.5 kHz',
      peakFrequency: 3.5,
    },
    conservation: { status: 'LC', trend: 'abnehmend', redListDE: 'Vorwarnliste' },
    rarity: 2,
  },

  // === FLIEGENSCHNÄPPER ===
  'Rotkehlchen': {
    id: 'erithacus_rubecula',
    scientificName: 'Erithacus rubecula',
    germanName: 'Rotkehlchen',
    englishName: 'European Robin',
    family: 'Fliegenschnäpper (Muscicapidae)',
    order: 'Sperlingsvögel (Passeriformes)',
    icon: '🐦',
    image: 'https://upload.wikimedia.org/wikipedia/commons/f/f3/Erithacus_rubecula_with_cocked_head.jpg',
    description: 'Beliebter Singvogel mit charakteristischer orangeroter Brust. Sehr zutraulich und oft am Boden hüpfend.',
    size: '12.5-14 cm',
    weight: '16-22 g',
    wingspan: '20-22 cm',
    habitat: ['Wälder', 'Gärten', 'Parks', 'Hecken'],
    habitatTypes: ['forest', 'garden', 'urban'],
    food: 'Insekten, Spinnen, Würmer, Beeren',
    breedingSeason: 'April - Juli',
    voice: {
      song: 'Melodischer, perlender Gesang, oft in der Dämmerung',
      call: 'Scharfes "tick-tick"',
      frequency: '3.0-8.0 kHz',
      peakFrequency: 5.0,
    },
    distribution: {
      europe: 'Ganz Europa',
      germany: 'Sehr häufiger Brutvogel',
      migration: 'Teilzieher',
    },
    conservation: { status: 'LC', trend: 'stabil', redListDE: 'nicht gefährdet' },
    funFacts: [
      'Singt auch nachts unter Straßenlaternen',
      'Symbol für Weihnachten in Großbritannien',
      'Sehr territorial - kämpft auch gegen Spiegelbilder',
    ],
    rarity: 1,
  },

  'Nachtigall': {
    id: 'luscinia_megarhynchos',
    scientificName: 'Luscinia megarhynchos',
    germanName: 'Nachtigall',
    englishName: 'Common Nightingale',
    family: 'Fliegenschnäpper (Muscicapidae)',
    icon: '🎵',
    image: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Luscinia_megarhynchos_Istria_01.jpg',
    description: 'Berühmt für ihren melodischen Gesang, der besonders nachts zu hören ist. Unscheinbar braun gefärbt.',
    size: '15-16.5 cm',
    weight: '18-27 g',
    habitat: ['Gebüsche', 'Auwälder', 'Hecken'],
    habitatTypes: ['forest', 'wetland', 'shrub'],
    food: 'Insekten, Spinnen, Würmer, Beeren',
    breedingSeason: 'Mai - Juli',
    voice: {
      song: 'Sehr melodisch, laut, mit vielen Variationen. Singt auch nachts!',
      frequency: '2.0-8.0 kHz',
      peakFrequency: 4.5,
    },
    distribution: {
      europe: 'Süd- und Mitteleuropa',
      germany: 'Brutvogel, aber nicht häufig',
      migration: 'Langstreckenzieher nach Afrika',
    },
    conservation: { status: 'LC', trend: 'leicht abnehmend', redListDE: 'nicht gefährdet' },
    funFacts: [
      'Kann über 200 verschiedene Phrasen singen',
      'Männchen singen bis zu 4 Stunden pro Nacht',
    ],
    rarity: 3,
  },

  // === TAUBEN ===
  'Ringeltaube': {
    id: 'columba_palumbus',
    scientificName: 'Columba palumbus',
    germanName: 'Ringeltaube',
    englishName: 'Common Wood Pigeon',
    family: 'Tauben (Columbidae)',
    order: 'Taubenvögel (Columbiformes)',
    icon: '🕊️',
    description: 'Große Taube mit weißem Halsfleck und weißen Flügelbinden. Charakteristisches Gurren.',
    size: '40-42 cm',
    weight: '450-550 g',
    wingspan: '75-80 cm',
    habitat: ['Wälder', 'Parks', 'Städte'],
    habitatTypes: ['forest', 'urban', 'park'],
    food: 'Samen, Getreide, Beeren, Knospen',
    voice: {
      song: 'Tiefes, rhythmisches "ru-kuuu-ku-ku-ku"',
      frequency: '0.3-1.5 kHz',
      peakFrequency: 0.6,
    },
    conservation: { status: 'LC', trend: 'zunehmend', redListDE: 'nicht gefährdet' },
    rarity: 1,
  },

  'Türkentaube': {
    id: 'streptopelia_decaocto',
    scientificName: 'Streptopelia decaocto',
    germanName: 'Türkentaube',
    englishName: 'Eurasian Collared Dove',
    family: 'Tauben (Columbidae)',
    icon: '🕊️',
    description: 'Schlanke, hellgraue Taube mit schwarzem Nackenband.',
    size: '31-33 cm',
    weight: '150-200 g',
    habitat: ['Siedlungen', 'Gärten', 'Parks'],
    habitatTypes: ['urban', 'garden'],
    voice: {
      song: 'Monotones "gu-guuu-gu"',
      frequency: '0.4-1.2 kHz',
      peakFrequency: 0.7,
    },
    conservation: { status: 'LC', trend: 'stabil', redListDE: 'nicht gefährdet' },
    rarity: 1,
  },

  // === RABENVÖGEL ===
  'Elster': {
    id: 'pica_pica',
    scientificName: 'Pica pica',
    germanName: 'Elster',
    englishName: 'Eurasian Magpie',
    family: 'Rabenvögel (Corvidae)',
    order: 'Sperlingsvögel (Passeriformes)',
    icon: '🐦‍⬛',
    description: 'Auffälliger Rabenvogel mit schwarz-weißem Gefieder und langem Schwanz. Bekannt für ihre Intelligenz.',
    size: '44-46 cm',
    weight: '200-250 g',
    wingspan: '52-62 cm',
    habitat: ['Siedlungen', 'Parks', 'Feldgehölze'],
    habitatTypes: ['urban', 'park', 'field'],
    food: 'Allesfresser: Insekten, Eier, Aas, Samen',
    voice: {
      song: 'Schackerndes "schak-schak-schak"',
      frequency: '1.0-4.0 kHz',
      peakFrequency: 2.5,
    },
    conservation: { status: 'LC', trend: 'zunehmend', redListDE: 'nicht gefährdet' },
    funFacts: [
      'Kann sich im Spiegel erkennen',
      'Sammelt glänzende Objekte',
      'Baut überdachte Nester',
    ],
    rarity: 1,
  },

  'Rabenkrähe': {
    id: 'corvus_corone',
    scientificName: 'Corvus corone',
    germanName: 'Rabenkrähe',
    englishName: 'Carrion Crow',
    family: 'Rabenvögel (Corvidae)',
    icon: '🐦‍⬛',
    description: 'Komplett schwarzer Rabenvogel mit kräftigem Schnabel. Sehr intelligent.',
    size: '44-51 cm',
    weight: '370-650 g',
    habitat: ['Überall', 'Städte', 'Wälder', 'Felder'],
    habitatTypes: ['urban', 'forest', 'field'],
    voice: {
      song: 'Heiseres "krah-krah"',
      frequency: '0.8-3.0 kHz',
      peakFrequency: 1.5,
    },
    conservation: { status: 'LC', trend: 'stabil', redListDE: 'nicht gefährdet' },
    funFacts: [
      'Kann Werkzeuge benutzen',
      'Erkennt menschliche Gesichter',
    ],
    rarity: 1,
  },

  'Eichelhäher': {
    id: 'garrulus_glandarius',
    scientificName: 'Garrulus glandarius',
    germanName: 'Eichelhäher',
    englishName: 'Eurasian Jay',
    family: 'Rabenvögel (Corvidae)',
    icon: '🐦',
    image: 'https://upload.wikimedia.org/wikipedia/commons/f/f6/Garrulus_glandarius_1_Luc_Viatour.jpg',
    description: 'Farbenfroher Rabenvogel mit blau-schwarzen Flügelfeldern und schwarzem Bartstreif.',
    size: '32-35 cm',
    weight: '140-190 g',
    habitat: ['Wälder', 'Parks'],
    habitatTypes: ['forest', 'park'],
    food: 'Eicheln, Nüsse, Insekten, Eier',
    voice: {
      song: 'Raues "räätsch", kann andere Vögel imitieren',
      frequency: '1.5-5.0 kHz',
      peakFrequency: 2.8,
    },
    conservation: { status: 'LC', trend: 'stabil', redListDE: 'nicht gefährdet' },
    funFacts: [
      'Versteckt bis zu 5000 Eicheln pro Jahr',
      'Warnt andere Tiere vor Räubern',
    ],
    rarity: 2,
  },

  // === STARE ===
  'Star': {
    id: 'sturnus_vulgaris',
    scientificName: 'Sturnus vulgaris',
    germanName: 'Star',
    englishName: 'Common Starling',
    family: 'Stare (Sturnidae)',
    icon: '🐦‍⬛',
    image: 'https://upload.wikimedia.org/wikipedia/commons/5/5b/Toulouse_-_Sturnus_vulgaris_-_2012-02-26_-_3.jpg',
    description: 'Mittelgroßer Singvogel mit metallisch glänzendem Gefieder und hellen Punkten. Ausgezeichneter Imitator.',
    size: '19-22 cm',
    weight: '60-90 g',
    wingspan: '37-42 cm',
    habitat: ['Offenland', 'Siedlungen', 'Wiesen'],
    habitatTypes: ['field', 'urban', 'meadow'],
    food: 'Insekten, Würmer, Beeren, Obst',
    voice: {
      song: 'Vielfältig, imitiert andere Vögel und Geräusche',
      frequency: '2.0-8.0 kHz',
      peakFrequency: 4.0,
    },
    conservation: { status: 'LC', trend: 'abnehmend', redListDE: 'nicht gefährdet' },
    funFacts: [
      'Bildet riesige Schwärme (Murmurationen)',
      'Kann Handyklingeltöne imitieren',
    ],
    rarity: 1,
  },

  // === SPECHTE ===
  'Buntspecht': {
    id: 'dendrocopos_major',
    scientificName: 'Dendrocopos major',
    germanName: 'Buntspecht',
    englishName: 'Great Spotted Woodpecker',
    family: 'Spechte (Picidae)',
    order: 'Spechtvögel (Piciformes)',
    icon: '🪶',
    description: 'Häufigster Specht mit schwarz-weiß-rotem Gefieder. Trommelt laut an Bäumen.',
    size: '22-23 cm',
    weight: '70-90 g',
    habitat: ['Wälder', 'Parks', 'Gärten mit alten Bäumen'],
    habitatTypes: ['forest', 'park'],
    food: 'Insektenlarven, Nüsse, Samen',
    voice: {
      song: 'Trommeln: schnelle Schläge (8-12/Sek)',
      call: 'Scharfes "kix"',
      frequency: '1.0-4.0 kHz',
      peakFrequency: 2.0,
    },
    conservation: { status: 'LC', trend: 'zunehmend', redListDE: 'nicht gefährdet' },
    funFacts: [
      'Trommelt bis zu 20 Schläge pro Sekunde',
      'Die Zunge ist 10cm lang',
    ],
    rarity: 2,
  },

  'Grünspecht': {
    id: 'picus_viridis',
    scientificName: 'Picus viridis',
    germanName: 'Grünspecht',
    englishName: 'European Green Woodpecker',
    family: 'Spechte (Picidae)',
    icon: '🪶',
    description: 'Großer Specht mit grünem Rücken und roter Kappe. Sucht oft am Boden nach Ameisen.',
    size: '31-33 cm',
    weight: '180-220 g',
    habitat: ['Laubwälder', 'Parks', 'Obstwiesen'],
    habitatTypes: ['forest', 'park', 'meadow'],
    food: 'Hauptsächlich Ameisen',
    voice: {
      song: 'Lachender Ruf "klü-klü-klü-klü"',
      frequency: '1.5-3.5 kHz',
      peakFrequency: 2.2,
    },
    conservation: { status: 'LC', trend: 'zunehmend', redListDE: 'nicht gefährdet' },
    funFacts: [
      'Wird auch "Lachvogel" genannt',
      'Frisst bis zu 2000 Ameisen pro Tag',
    ],
    rarity: 2,
  },

  // === WASSERVÖGEL ===
  'Stockente': {
    id: 'anas_platyrhynchos',
    scientificName: 'Anas platyrhynchos',
    germanName: 'Stockente',
    englishName: 'Mallard',
    family: 'Entenvögel (Anatidae)',
    order: 'Gänsevögel (Anseriformes)',
    icon: '🦆',
    description: 'Die häufigste Entenart. Männchen mit grünem Kopf und weißem Halsring, Weibchen braun gesprenkelt.',
    size: '50-65 cm',
    weight: '850-1400 g',
    wingspan: '81-98 cm',
    habitat: ['Gewässer aller Art', 'Parks', 'Flüsse'],
    habitatTypes: ['water', 'wetland', 'urban'],
    food: 'Wasserpflanzen, Samen, Insekten, Brot',
    voice: {
      song: 'Weibchen: lautes "quak-quak", Männchen: leises "räb"',
      frequency: '0.5-3.0 kHz',
      peakFrequency: 1.5,
    },
    conservation: { status: 'LC', trend: 'stabil', redListDE: 'nicht gefährdet' },
    funFacts: [
      'Stammmutter der meisten Hausenten',
      'Kann bis zu 20 Jahre alt werden',
    ],
    rarity: 1,
  },

  'Graureiher': {
    id: 'ardea_cinerea',
    scientificName: 'Ardea cinerea',
    germanName: 'Graureiher',
    englishName: 'Grey Heron',
    family: 'Reiher (Ardeidae)',
    icon: '🦢',
    description: 'Großer, grauer Schreitvogel mit langem Hals und dolchartigem Schnabel.',
    size: '84-102 cm',
    weight: '1-2 kg',
    wingspan: '155-175 cm',
    habitat: ['Gewässer', 'Feuchtgebiete', 'Wiesen'],
    habitatTypes: ['water', 'wetland', 'meadow'],
    food: 'Fische, Frösche, Mäuse',
    voice: {
      song: 'Raues "kräik"',
      frequency: '0.5-2.0 kHz',
      peakFrequency: 1.0,
    },
    conservation: { status: 'LC', trend: 'zunehmend', redListDE: 'nicht gefährdet' },
    funFacts: [
      'Kann stundenlang regungslos warten',
      'Brütet in Kolonien auf Bäumen',
    ],
    rarity: 2,
  },

  // === GREIFVÖGEL ===
  'Mäusebussard': {
    id: 'buteo_buteo',
    scientificName: 'Buteo buteo',
    germanName: 'Mäusebussard',
    englishName: 'Common Buzzard',
    family: 'Habichtartige (Accipitridae)',
    order: 'Greifvögel (Accipitriformes)',
    icon: '🦅',
    description: 'Häufigster Greifvogel Mitteleuropas. Braun gefärbt, oft kreisend zu beobachten.',
    size: '51-57 cm',
    weight: '550-1300 g',
    wingspan: '113-128 cm',
    habitat: ['Wälder mit Offenland', 'Felder'],
    habitatTypes: ['forest', 'field'],
    food: 'Mäuse, Kaninchen, Aas',
    voice: {
      song: 'Miauendes "hiääh"',
      frequency: '1.0-3.0 kHz',
      peakFrequency: 1.8,
    },
    conservation: { status: 'LC', trend: 'stabil', redListDE: 'nicht gefährdet' },
    funFacts: [
      'Kann aus 100m Höhe eine Maus sehen',
    ],
    rarity: 2,
  },

  'Turmfalke': {
    id: 'falco_tinnunculus',
    scientificName: 'Falco tinnunculus',
    germanName: 'Turmfalke',
    englishName: 'Common Kestrel',
    family: 'Falken (Falconidae)',
    icon: '🦅',
    description: 'Kleiner Falke, bekannt für seinen Rüttelflug. Brütet auch in Städten.',
    size: '32-35 cm',
    weight: '135-250 g',
    wingspan: '71-80 cm',
    habitat: ['Offenland', 'Städte', 'Felsen'],
    habitatTypes: ['field', 'urban', 'cliff'],
    food: 'Mäuse, Insekten, kleine Vögel',
    voice: {
      song: 'Schnelles "ki-ki-ki-ki"',
      frequency: '2.0-5.0 kHz',
      peakFrequency: 3.5,
    },
    conservation: { status: 'LC', trend: 'leicht abnehmend', redListDE: 'nicht gefährdet' },
    funFacts: [
      'Kann UV-Licht sehen (Mäuseurin leuchtet)',
      'Rüttelt auf der Stelle in der Luft',
    ],
    rarity: 2,
  },

  // === EULEN ===
  'Waldkauz': {
    id: 'strix_aluco',
    scientificName: 'Strix aluco',
    germanName: 'Waldkauz',
    englishName: 'Tawny Owl',
    family: 'Eigentliche Eulen (Strigidae)',
    order: 'Eulen (Strigiformes)',
    icon: '🦉',
    description: 'Mittelgroße Eule mit rundem Kopf ohne Federohren. Nachtaktiv.',
    size: '37-39 cm',
    weight: '400-600 g',
    habitat: ['Wälder', 'Parks', 'Friedhöfe'],
    habitatTypes: ['forest', 'park', 'urban'],
    food: 'Mäuse, Vögel, Insekten',
    voice: {
      song: 'Heulend "hu-huuu-hu" und scharf "ku-witt"',
      frequency: '0.3-1.5 kHz',
      peakFrequency: 0.5,
    },
    conservation: { status: 'LC', trend: 'stabil', redListDE: 'nicht gefährdet' },
    funFacts: [
      'Kann den Kopf 270° drehen',
      'Fliegt völlig lautlos',
    ],
    rarity: 3,
  },

  'Uhu': {
    id: 'bubo_bubo',
    scientificName: 'Bubo bubo',
    germanName: 'Uhu',
    englishName: 'Eurasian Eagle-Owl',
    family: 'Eigentliche Eulen (Strigidae)',
    icon: '🦉',
    description: 'Größte Eule Europas mit markanten Federohren und orangefarbenen Augen.',
    size: '60-75 cm',
    weight: '1.5-4 kg',
    wingspan: '160-188 cm',
    habitat: ['Felsen', 'Steinbrüche', 'Wälder'],
    habitatTypes: ['cliff', 'forest', 'quarry'],
    food: 'Säugetiere bis Hasengröße, Vögel',
    voice: {
      song: 'Tiefes "buho" oder "uhu"',
      frequency: '0.2-0.8 kHz',
      peakFrequency: 0.4,
    },
    conservation: { status: 'LC', trend: 'zunehmend', redListDE: 'nicht gefährdet' },
    funFacts: [
      'Kann Beute bis 3kg schlagen',
      'War in Deutschland fast ausgestorben',
    ],
    rarity: 4,
  },

  // === WEITERE ARTEN ===
  'Zaunkönig': {
    id: 'troglodytes_troglodytes',
    scientificName: 'Troglodytes troglodytes',
    germanName: 'Zaunkönig',
    englishName: 'Eurasian Wren',
    family: 'Zaunkönige (Troglodytidae)',
    icon: '🐦',
    description: 'Einer der kleinsten europäischen Vögel mit hochgestelltem Schwänzchen. Überraschend lauter Gesang.',
    size: '9-10 cm',
    weight: '7-12 g',
    habitat: ['Unterholz', 'Hecken', 'Gärten'],
    habitatTypes: ['forest', 'garden', 'shrub'],
    voice: {
      song: 'Sehr lauter, trillernder Gesang',
      frequency: '4.0-10.0 kHz',
      peakFrequency: 6.5,
    },
    conservation: { status: 'LC', trend: 'stabil', redListDE: 'nicht gefährdet' },
    funFacts: [
      'Einer der lautesten Vögel im Verhältnis zur Größe',
      'Baut mehrere Nester, Weibchen wählt aus',
    ],
    rarity: 2,
  },

  'Kleiber': {
    id: 'sitta_europaea',
    scientificName: 'Sitta europaea',
    germanName: 'Kleiber',
    englishName: 'Eurasian Nuthatch',
    family: 'Kleiber (Sittidae)',
    icon: '🐦',
    description: 'Kompakter Vogel, der kopfüber an Baumstämmen hinunterklettern kann.',
    size: '12-14.5 cm',
    weight: '20-25 g',
    habitat: ['Laub- und Mischwälder', 'Parks'],
    habitatTypes: ['forest', 'park'],
    voice: {
      song: 'Lautes "twit-twit-twit" und Pfiffe',
      frequency: '3.0-6.0 kHz',
      peakFrequency: 4.0,
    },
    conservation: { status: 'LC', trend: 'stabil', redListDE: 'nicht gefährdet' },
    funFacts: [
      'Einziger Vogel, der kopfüber klettern kann',
      'Klebt Höhleneingänge mit Lehm zu',
    ],
    rarity: 2,
  },

  'Zilpzalp': {
    id: 'phylloscopus_collybita',
    scientificName: 'Phylloscopus collybita',
    germanName: 'Zilpzalp',
    englishName: 'Common Chiffchaff',
    family: 'Laubsänger (Phylloscopidae)',
    icon: '🐦',
    description: 'Kleiner, unscheinbarer Laubsänger mit charakteristischem Gesang.',
    size: '10-12 cm',
    weight: '6-9 g',
    habitat: ['Wälder', 'Gärten', 'Parks'],
    habitatTypes: ['forest', 'garden', 'park'],
    voice: {
      song: 'Monotones "zilp-zalp-zilp-zalp"',
      frequency: '4.0-7.0 kHz',
      peakFrequency: 5.5,
    },
    conservation: { status: 'LC', trend: 'stabil', redListDE: 'nicht gefährdet' },
    funFacts: [
      'Der Name kommt vom Gesang',
      'Einer der ersten Zugvögel im Frühling',
    ],
    rarity: 2,
  },

  'Fitis': {
    id: 'phylloscopus_trochilus',
    scientificName: 'Phylloscopus trochilus',
    germanName: 'Fitis',
    englishName: 'Willow Warbler',
    family: 'Laubsänger (Phylloscopidae)',
    icon: '🐦',
    description: 'Dem Zilpzalp sehr ähnlich, aber mit melodischerem, abfallendem Gesang.',
    size: '11-12.5 cm',
    weight: '8-11 g',
    habitat: ['Lichte Wälder', 'Gebüsche', 'Moore'],
    habitatTypes: ['forest', 'shrub', 'wetland'],
    voice: {
      song: 'Melodisch abfallende Strophe',
      frequency: '3.5-7.0 kHz',
      peakFrequency: 5.0,
    },
    conservation: { status: 'LC', trend: 'leicht abnehmend', redListDE: 'nicht gefährdet' },
    rarity: 2,
  },

  'Kuckuck': {
    id: 'cuculus_canorus',
    scientificName: 'Cuculus canorus',
    germanName: 'Kuckuck',
    englishName: 'Common Cuckoo',
    family: 'Kuckucke (Cuculidae)',
    order: 'Kuckucksvögel (Cuculiformes)',
    icon: '🐦',
    description: 'Bekannt für seinen "Kuckuck"-Ruf und das Brutparasitentum.',
    size: '32-34 cm',
    weight: '110-130 g',
    wingspan: '55-60 cm',
    habitat: ['Offene Landschaften', 'Waldränder'],
    habitatTypes: ['forest', 'field', 'edge'],
    food: 'Raupen, besonders haarige',
    breedingSeason: 'Mai - Juli (legt Eier in fremde Nester)',
    voice: {
      song: 'Unverwechselbares "ku-kuck"',
      frequency: '0.5-1.5 kHz',
      peakFrequency: 0.7,
    },
    distribution: {
      europe: 'Sommervogel in ganz Europa',
      migration: 'Langstreckenzieher nach Afrika',
    },
    conservation: { status: 'LC', trend: 'abnehmend', redListDE: 'Vorwarnliste' },
    funFacts: [
      'Legt Eier in über 100 verschiedene Wirtsvogelarten',
      'Jungvogel wirft andere Eier aus dem Nest',
    ],
    rarity: 3,
  },

  'Mauersegler': {
    id: 'apus_apus',
    scientificName: 'Apus apus',
    germanName: 'Mauersegler',
    englishName: 'Common Swift',
    family: 'Segler (Apodidae)',
    icon: '🐦',
    description: 'Hervorragender Flieger mit sichelförmigen Flügeln. Verbringt fast sein ganzes Leben in der Luft.',
    size: '16-17 cm',
    weight: '36-50 g',
    wingspan: '42-48 cm',
    habitat: ['Städte', 'Felsen'],
    habitatTypes: ['urban', 'cliff'],
    food: 'Fluginsekten',
    voice: {
      song: 'Schrilles "sriiii"',
      frequency: '5.0-10.0 kHz',
      peakFrequency: 7.0,
    },
    conservation: { status: 'LC', trend: 'abnehmend', redListDE: 'nicht gefährdet' },
    funFacts: [
      'Schläft im Flug',
      'Landet nur zum Brüten',
      'Fliegt bis zu 200 km/h',
    ],
    rarity: 2,
  },

  // ══════════════════════════════════════════════════════════════
  // ERWEITERTE ARTENLISTE - ~150 weitere mitteleuropäische Arten
  // Kompaktformat: Kernfelder für Erkennung & Anzeige
  // ══════════════════════════════════════════════════════════════

  // === DROSSELN & VERWANDTE ===
  'Wacholderdrossel': { id: 'turdus_pilaris', scientificName: 'Turdus pilaris', germanName: 'Wacholderdrossel', englishName: 'Fieldfare', family: 'Drosseln (Turdidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Gesellige Drossel mit grauem Kopf und rotbraunem Rücken.', size: '25-26 cm', habitat: ['Wiesen', 'Gärten', 'Waldränder'], rarity: 2 },
  'Misteldrossel': { id: 'turdus_viscivorus', scientificName: 'Turdus viscivorus', germanName: 'Misteldrossel', englishName: 'Mistle Thrush', family: 'Drosseln (Turdidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Größte einheimische Drossel mit kräftigem Gesang.', size: '27-28 cm', habitat: ['Wälder', 'Parks'], rarity: 3 },
  'Ringdrossel': { id: 'turdus_torquatus', scientificName: 'Turdus torquatus', germanName: 'Ringdrossel', englishName: 'Ring Ouzel', family: 'Drosseln (Turdidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Amselähnlich mit weißem Brustband.', size: '23-24 cm', habitat: ['Gebirge', 'Hochlagen'], rarity: 4 },
  'Rotdrossel': { id: 'turdus_iliacus', scientificName: 'Turdus iliacus', germanName: 'Rotdrossel', englishName: 'Redwing', family: 'Drosseln (Turdidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Kleine Drossel mit rostroten Flanken und hellem Überaugenstreif.', size: '21 cm', habitat: ['Wälder', 'Wiesen'], rarity: 3 },

  // === MEISEN ===
  'Sumpfmeise': { id: 'poecile_palustris', scientificName: 'Poecile palustris', germanName: 'Sumpfmeise', englishName: 'Marsh Tit', family: 'Meisen (Paridae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Kleine Meise mit glänzend schwarzer Kappe.', size: '11-12 cm', habitat: ['Laubwälder', 'Gärten'], rarity: 2 },
  'Weidenmeise': { id: 'poecile_montanus', scientificName: 'Poecile montanus', germanName: 'Weidenmeise', englishName: 'Willow Tit', family: 'Meisen (Paridae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Ähnlich der Sumpfmeise, mit mattem Oberkopf.', size: '11-12 cm', habitat: ['Feuchtgebiete', 'Nadelwälder'], rarity: 3 },
  'Haubenmeise': { id: 'lophophanes_cristatus', scientificName: 'Lophophanes cristatus', germanName: 'Haubenmeise', englishName: 'Crested Tit', family: 'Meisen (Paridae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Einzige Meise mit spitzer Federhaube.', size: '11-12 cm', habitat: ['Nadelwälder'], rarity: 3 },
  'Schwanzmeise': { id: 'aegithalos_caudatus', scientificName: 'Aegithalos caudatus', germanName: 'Schwanzmeise', englishName: 'Long-tailed Tit', family: 'Schwanzmeisen (Aegithalidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Winzige Meise mit extrem langem Schwanz.', size: '14 cm (davon 7-9 cm Schwanz)', habitat: ['Laubwälder', 'Hecken', 'Gärten'], rarity: 2 },
  'Bartmeise': { id: 'panurus_biarmicus', scientificName: 'Panurus biarmicus', germanName: 'Bartmeise', englishName: 'Bearded Reedling', family: 'Bartmeisen (Panuridae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Hübscher Schilfbewohner, Männchen mit schwarzem Bartstreif.', size: '12-13 cm', habitat: ['Schilfgebiete'], rarity: 4 },

  // === FINKEN ===
  'Bergfink': { id: 'fringilla_montifringilla', scientificName: 'Fringilla montifringilla', germanName: 'Bergfink', englishName: 'Brambling', family: 'Finken (Fringillidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Wintergast mit orangefarbener Brust.', size: '14-16 cm', habitat: ['Wälder', 'Felder'], rarity: 3 },
  'Kernbeißer': { id: 'coccothraustes_coccothraustes', scientificName: 'Coccothraustes coccothraustes', germanName: 'Kernbeißer', englishName: 'Hawfinch', family: 'Finken (Fringillidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Kräftiger Fink mit massivem Schnabel zum Knacken von Kirschkernen.', size: '16-18 cm', habitat: ['Laubwälder', 'Parks'], rarity: 3 },
  'Bluthänfling': { id: 'linaria_cannabina', scientificName: 'Linaria cannabina', germanName: 'Bluthänfling', englishName: 'Common Linnet', family: 'Finken (Fringillidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Fink mit roter Brust und Stirn beim Männchen.', size: '13-14 cm', habitat: ['Hecken', 'Brachland'], rarity: 3 },
  'Birkenzeisig': { id: 'acanthis_flammea', scientificName: 'Acanthis flammea', germanName: 'Birkenzeisig', englishName: 'Common Redpoll', family: 'Finken (Fringillidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Kleiner Fink mit roter Stirnplatte.', size: '12-14 cm', habitat: ['Birken', 'Erlen'], rarity: 3 },
  'Erlenzeisig': { id: 'spinus_spinus', scientificName: 'Spinus spinus', germanName: 'Erlenzeisig', englishName: 'Eurasian Siskin', family: 'Finken (Fringillidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Kleiner grüngelber Fink, oft in Erlenwäldern.', size: '11-12 cm', habitat: ['Nadelwälder', 'Erlen'], rarity: 2 },
  'Girlitz': { id: 'serinus_serinus', scientificName: 'Serinus serinus', germanName: 'Girlitz', englishName: 'European Serin', family: 'Finken (Fringillidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Kleinster europäischer Fink mit klirrendem Gesang.', size: '11-12 cm', habitat: ['Gärten', 'Parks', 'Friedhöfe'], rarity: 3 },
  'Gimpel': { id: 'pyrrhula_pyrrhula', scientificName: 'Pyrrhula pyrrhula', germanName: 'Gimpel', englishName: 'Eurasian Bullfinch', family: 'Finken (Fringillidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Auffälliger Fink, Männchen mit leuchtend roter Brust.', size: '15-16 cm', habitat: ['Nadelwälder', 'Gärten'], rarity: 2 },
  'Fichtenkreuzschnabel': { id: 'loxia_curvirostra', scientificName: 'Loxia curvirostra', germanName: 'Fichtenkreuzschnabel', englishName: 'Red Crossbill', family: 'Finken (Fringillidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Spezialist für Fichtenzapfen mit überkreuztem Schnabel.', size: '16-17 cm', habitat: ['Nadelwälder'], rarity: 3 },

  // === GRASMÜCKEN & LAUBSÄNGER ===
  'Mönchsgrasmücke': { id: 'sylvia_atricapilla', scientificName: 'Sylvia atricapilla', germanName: 'Mönchsgrasmücke', englishName: 'Eurasian Blackcap', family: 'Grasmücken (Sylviidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Einer der besten Sänger Europas. Männchen mit schwarzer, Weibchen mit brauner Kappe.', size: '13-14 cm', habitat: ['Wälder', 'Gärten', 'Parks'], rarity: 1 },
  'Gartengrasmücke': { id: 'sylvia_borin', scientificName: 'Sylvia borin', germanName: 'Gartengrasmücke', englishName: 'Garden Warbler', family: 'Grasmücken (Sylviidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Unscheinbare Grasmücke mit hervorragendem Gesang.', size: '13-14 cm', habitat: ['Gebüsch', 'Waldränder'], rarity: 2 },
  'Dorngrasmücke': { id: 'curruca_communis', scientificName: 'Curruca communis', germanName: 'Dorngrasmücke', englishName: 'Common Whitethroat', family: 'Grasmücken (Sylviidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Lebhafte Grasmücke mit weißer Kehle und rötlichen Flügeln.', size: '13-15 cm', habitat: ['Hecken', 'Brachland'], rarity: 2 },
  'Klappergrasmücke': { id: 'curruca_curruca', scientificName: 'Curruca curruca', germanName: 'Klappergrasmücke', englishName: 'Lesser Whitethroat', family: 'Grasmücken (Sylviidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Kleine Grasmücke mit klapperndem Gesang.', size: '12-13 cm', habitat: ['Hecken', 'Gärten'], rarity: 2 },
  'Sperbergrasmücke': { id: 'curruca_nisoria', scientificName: 'Curruca nisoria', germanName: 'Sperbergrasmücke', englishName: 'Barred Warbler', family: 'Grasmücken (Sylviidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Große Grasmücke mit gesperberter Unterseite.', size: '15-17 cm', habitat: ['Dorngebüsch', 'Hecken'], rarity: 4 },
  'Waldlaubsänger': { id: 'phylloscopus_sibilatrix', scientificName: 'Phylloscopus sibilatrix', germanName: 'Waldlaubsänger', englishName: 'Wood Warbler', family: 'Laubsänger (Phylloscopidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Laubsänger mit leuchtend gelbgrüner Oberseite und weißer Unterseite.', size: '12-13 cm', habitat: ['Buchenwälder'], rarity: 3 },

  // === ROHRSÄNGER & SPÖTTER ===
  'Teichrohrsänger': { id: 'acrocephalus_scirpaceus', scientificName: 'Acrocephalus scirpaceus', germanName: 'Teichrohrsänger', englishName: 'Eurasian Reed Warbler', family: 'Rohrsänger (Acrocephalidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Häufiger Schilfbewohner, wichtigster Kuckuckswirt.', size: '13 cm', habitat: ['Schilfgebiete', 'Feuchtgebiete'], rarity: 2 },
  'Sumpfrohrsänger': { id: 'acrocephalus_palustris', scientificName: 'Acrocephalus palustris', germanName: 'Sumpfrohrsänger', englishName: 'Marsh Warbler', family: 'Rohrsänger (Acrocephalidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Hervorragender Imitator, ahmt andere Vogelarten nach.', size: '13 cm', habitat: ['Hochstaudenfluren', 'Feuchtgebiete'], rarity: 3 },
  'Drosselrohrsänger': { id: 'acrocephalus_arundinaceus', scientificName: 'Acrocephalus arundinaceus', germanName: 'Drosselrohrsänger', englishName: 'Great Reed Warbler', family: 'Rohrsänger (Acrocephalidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Größter europäischer Rohrsänger mit lauter Stimme.', size: '19 cm', habitat: ['Schilfgebiete'], rarity: 3 },
  'Gelbspötter': { id: 'hippolais_icterina', scientificName: 'Hippolais icterina', germanName: 'Gelbspötter', englishName: 'Icterine Warbler', family: 'Rohrsänger (Acrocephalidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Gelblicher Spötter mit lautem, variablem Gesang.', size: '13 cm', habitat: ['Laubwälder', 'Parks'], rarity: 3 },

  // === SCHWALBEN ===
  'Rauchschwalbe': { id: 'hirundo_rustica', scientificName: 'Hirundo rustica', germanName: 'Rauchschwalbe', englishName: 'Barn Swallow', family: 'Schwalben (Hirundinidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Elegante Schwalbe mit tief gegabeltem Schwanz und roter Kehle.', size: '17-21 cm', habitat: ['Bauernhöfe', 'Offenland'], rarity: 2 },
  'Mehlschwalbe': { id: 'delichon_urbicum', scientificName: 'Delichon urbicum', germanName: 'Mehlschwalbe', englishName: 'Common House Martin', family: 'Schwalben (Hirundinidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Schwalbe mit weißem Bürzel, baut Lehmnester an Hauswänden.', size: '13-14 cm', habitat: ['Siedlungen', 'Städte'], rarity: 2 },
  'Uferschwalbe': { id: 'riparia_riparia', scientificName: 'Riparia riparia', germanName: 'Uferschwalbe', englishName: 'Sand Martin', family: 'Schwalben (Hirundinidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Kleinste europäische Schwalbe, brütet in Steilwänden.', size: '12-13 cm', habitat: ['Kiesgruben', 'Flussufer'], rarity: 3 },

  // === STELZEN & PIEPER ===
  'Bachstelze': { id: 'motacilla_alba', scientificName: 'Motacilla alba', germanName: 'Bachstelze', englishName: 'White Wagtail', family: 'Stelzen (Motacillidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Eleganter schwarz-weißer Vogel mit wippendem Schwanz.', size: '16-19 cm', habitat: ['Gewässer', 'Siedlungen', 'Felder'], rarity: 1 },
  'Gebirgsstelze': { id: 'motacilla_cinerea', scientificName: 'Motacilla cinerea', germanName: 'Gebirgsstelze', englishName: 'Grey Wagtail', family: 'Stelzen (Motacillidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Stelze mit leuchtend gelbem Bauch an Fließgewässern.', size: '17-20 cm', habitat: ['Bäche', 'Flüsse'], rarity: 2 },
  'Schafstelze': { id: 'motacilla_flava', scientificName: 'Motacilla flava', germanName: 'Schafstelze', englishName: 'Western Yellow Wagtail', family: 'Stelzen (Motacillidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Gelbbauchige Stelze auf Wiesen und Äckern.', size: '15-16 cm', habitat: ['Wiesen', 'Felder'], rarity: 3 },
  'Wiesenpieper': { id: 'anthus_pratensis', scientificName: 'Anthus pratensis', germanName: 'Wiesenpieper', englishName: 'Meadow Pipit', family: 'Stelzen (Motacillidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Schlichter Singvogel offener Landschaften.', size: '14-15 cm', habitat: ['Wiesen', 'Moore', 'Heiden'], rarity: 2 },
  'Baumpieper': { id: 'anthus_trivialis', scientificName: 'Anthus trivialis', germanName: 'Baumpieper', englishName: 'Tree Pipit', family: 'Stelzen (Motacillidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Pieper mit charakteristischem Singflug von Baumwipfeln.', size: '15-16 cm', habitat: ['Lichtungen', 'Waldränder'], rarity: 3 },

  // === SCHNÄPPER & ROTSCHWÄNZE ===
  'Hausrotschwanz': { id: 'phoenicurus_ochruros', scientificName: 'Phoenicurus ochruros', germanName: 'Hausrotschwanz', englishName: 'Black Redstart', family: 'Fliegenschnäpper (Muscicapidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Dunkelgrauer Vogel mit rostrotem Schwanz, singt von Dächern.', size: '14-15 cm', habitat: ['Siedlungen', 'Felsen', 'Industriegebiete'], rarity: 1 },
  'Gartenrotschwanz': { id: 'phoenicurus_phoenicurus', scientificName: 'Phoenicurus phoenicurus', germanName: 'Gartenrotschwanz', englishName: 'Common Redstart', family: 'Fliegenschnäpper (Muscicapidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Bunter Rotschwanz mit orangeroter Brust und schwarzer Kehle.', size: '13-14 cm', habitat: ['Gärten', 'Streuobstwiesen', 'Laubwälder'], rarity: 3 },
  'Trauerschnäpper': { id: 'ficedula_hypoleuca', scientificName: 'Ficedula hypoleuca', germanName: 'Trauerschnäpper', englishName: 'European Pied Flycatcher', family: 'Fliegenschnäpper (Muscicapidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Schwarz-weißer Schnäpper, Höhlenbrüter in Nistkästen.', size: '12-13 cm', habitat: ['Laubwälder', 'Gärten'], rarity: 3 },
  'Grauschnäpper': { id: 'muscicapa_striata', scientificName: 'Muscicapa striata', germanName: 'Grauschnäpper', englishName: 'Spotted Flycatcher', family: 'Fliegenschnäpper (Muscicapidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Unscheinbarer Ansitzjäger für Fluginsekten.', size: '13-15 cm', habitat: ['Gärten', 'Waldränder'], rarity: 3 },
  'Steinschmätzer': { id: 'oenanthe_oenanthe', scientificName: 'Oenanthe oenanthe', germanName: 'Steinschmätzer', englishName: 'Northern Wheatear', family: 'Fliegenschnäpper (Muscicapidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Langstreckenzieher mit weißem Bürzel.', size: '14-16 cm', habitat: ['Heiden', 'Steinbrüche', 'Dünen'], rarity: 3 },
  'Braunkehlchen': { id: 'saxicola_rubetra', scientificName: 'Saxicola rubetra', germanName: 'Braunkehlchen', englishName: 'Whinchat', family: 'Fliegenschnäpper (Muscicapidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Wiesenbrüter mit hellem Überaugenstreif.', size: '12-14 cm', habitat: ['Wiesen', 'Brachland'], rarity: 3 },
  'Schwarzkehlchen': { id: 'saxicola_rubicola', scientificName: 'Saxicola rubicola', germanName: 'Schwarzkehlchen', englishName: 'European Stonechat', family: 'Fliegenschnäpper (Muscicapidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Kleiner Vogel mit schwarzem Kopf und orangeroter Brust.', size: '11-13 cm', habitat: ['Heiden', 'Brachland'], rarity: 3 },

  // === HECKENBRAUNELLE ===
  'Heckenbraunelle': { id: 'prunella_modularis', scientificName: 'Prunella modularis', germanName: 'Heckenbraunelle', englishName: 'Dunnock', family: 'Braunellen (Prunellidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Unauffälliger Bodenvogel, oft mit Sperling verwechselt.', size: '13-14 cm', habitat: ['Hecken', 'Gärten', 'Unterholz'], rarity: 1 },

  // === AMMERN ===
  'Goldammer': { id: 'emberiza_citrinella', scientificName: 'Emberiza citrinella', germanName: 'Goldammer', englishName: 'Yellowhammer', family: 'Ammern (Emberizidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Leuchtend gelber Kopf, singt "Wie-wie-wie hab ich dich lieb".', size: '16-17 cm', habitat: ['Feldränder', 'Hecken'], rarity: 2 },
  'Rohrammer': { id: 'emberiza_schoeniclus', scientificName: 'Emberiza schoeniclus', germanName: 'Rohrammer', englishName: 'Common Reed Bunting', family: 'Ammern (Emberizidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Schilfbewohner, Männchen mit schwarzem Kopf.', size: '13-16 cm', habitat: ['Schilfgebiete', 'Feuchtgebiete'], rarity: 2 },
  'Grauammer': { id: 'emberiza_calandra', scientificName: 'Emberiza calandra', germanName: 'Grauammer', englishName: 'Corn Bunting', family: 'Ammern (Emberizidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Größte einheimische Ammer, singt von Zaunpfählen.', size: '16-19 cm', habitat: ['Agrarland', 'Brachen'], rarity: 3 },
  'Ortolan': { id: 'emberiza_hortulana', scientificName: 'Emberiza hortulana', germanName: 'Ortolan', englishName: 'Ortolan Bunting', family: 'Ammern (Emberizidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Seltene Ammer mit olivgrünem Kopf und gelber Kehle.', size: '15-17 cm', habitat: ['Trockene Hänge', 'Agrarland'], rarity: 4 },
  'Zippammer': { id: 'emberiza_cia', scientificName: 'Emberiza cia', germanName: 'Zippammer', englishName: 'Rock Bunting', family: 'Ammern (Emberizidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Ammer felsiger Berglagen mit gestreiftem Kopf.', size: '15-16 cm', habitat: ['Felsen', 'Weinberge'], rarity: 4 },

  // === RABENVÖGEL ===
  'Dohle': { id: 'coloeus_monedula', scientificName: 'Coloeus monedula', germanName: 'Dohle', englishName: 'Western Jackdaw', family: 'Rabenvögel (Corvidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦‍⬛', description: 'Kleiner Rabenvogel mit hellen Augen und grauem Nacken.', size: '33-34 cm', habitat: ['Städte', 'Kirchtürme', 'Burgen'], rarity: 2 },
  'Saatkrähe': { id: 'corvus_frugilegus', scientificName: 'Corvus frugilegus', germanName: 'Saatkrähe', englishName: 'Rook', family: 'Rabenvögel (Corvidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦‍⬛', description: 'Geselliger Rabenvogel mit hellgrauem Schnabelgrund.', size: '44-46 cm', habitat: ['Agrarland', 'Parks'], rarity: 2 },
  'Nebelkrähe': { id: 'corvus_cornix', scientificName: 'Corvus cornix', germanName: 'Nebelkrähe', englishName: 'Hooded Crow', family: 'Rabenvögel (Corvidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦‍⬛', description: 'Schwarz-graue Krähe, östlich der Rabenkrähe.', size: '44-51 cm', habitat: ['Offenland', 'Siedlungen'], rarity: 2 },
  'Kolkrabe': { id: 'corvus_corax', scientificName: 'Corvus corax', germanName: 'Kolkrabe', englishName: 'Common Raven', family: 'Rabenvögel (Corvidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦‍⬛', description: 'Größter Singvogel der Welt mit keilförmigem Schwanz.', size: '54-67 cm', habitat: ['Wälder', 'Gebirge', 'Küsten'], rarity: 3 },
  'Tannenhäher': { id: 'nucifraga_caryocatactes', scientificName: 'Nucifraga caryocatactes', germanName: 'Tannenhäher', englishName: 'Spotted Nutcracker', family: 'Rabenvögel (Corvidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Brauner Rabenvogel mit weißen Tropfen, sammelt Nüsse.', size: '32-35 cm', habitat: ['Nadelwälder', 'Gebirgswälder'], rarity: 3 },

  // === SPECHTE ===
  'Schwarzspecht': { id: 'dryocopus_martius', scientificName: 'Dryocopus martius', germanName: 'Schwarzspecht', englishName: 'Black Woodpecker', family: 'Spechte (Picidae)', order: 'Spechtvögel (Piciformes)', icon: '🦅', description: 'Größter europäischer Specht, ganz schwarz mit rotem Scheitel.', size: '45-47 cm', habitat: ['Buchenwälder', 'Mischwälder'], rarity: 3 },
  'Mittelspecht': { id: 'dendrocoptes_medius', scientificName: 'Dendrocoptes medius', germanName: 'Mittelspecht', englishName: 'Middle Spotted Woodpecker', family: 'Spechte (Picidae)', order: 'Spechtvögel (Piciformes)', icon: '🐦', description: 'Mittelgroßer Specht alter Eichenwälder mit rotem Scheitel.', size: '20-22 cm', habitat: ['Eichenwälder'], rarity: 3 },
  'Kleinspecht': { id: 'dryobates_minor', scientificName: 'Dryobates minor', germanName: 'Kleinspecht', englishName: 'Lesser Spotted Woodpecker', family: 'Spechte (Picidae)', order: 'Spechtvögel (Piciformes)', icon: '🐦', description: 'Spatzgroßer Specht, Europas kleinster.', size: '14-16 cm', habitat: ['Auwälder', 'Parks'], rarity: 3 },
  'Grauspecht': { id: 'picus_canus', scientificName: 'Picus canus', germanName: 'Grauspecht', englishName: 'Grey-headed Woodpecker', family: 'Spechte (Picidae)', order: 'Spechtvögel (Piciformes)', icon: '🐦', description: 'Ähnlich dem Grünspecht, aber mit grauem Kopf.', size: '25-28 cm', habitat: ['Laubwälder', 'Bergwälder'], rarity: 3 },
  'Wendehals': { id: 'jynx_torquilla', scientificName: 'Jynx torquilla', germanName: 'Wendehals', englishName: 'Eurasian Wryneck', family: 'Spechte (Picidae)', order: 'Spechtvögel (Piciformes)', icon: '🐦', description: 'Einziger Zugvogel unter den Spechten, perfekte Tarnung.', size: '16-18 cm', habitat: ['Streuobstwiesen', 'Lichtungen'], rarity: 4 },

  // === EULEN ===
  'Schleiereule': { id: 'tyto_alba', scientificName: 'Tyto alba', germanName: 'Schleiereule', englishName: 'Barn Owl', family: 'Schleiereulen (Tytonidae)', order: 'Eulen (Strigiformes)', icon: '🦉', description: 'Herzförmiger Gesichtsschleier, jagt in der Nacht über Wiesen.', size: '33-39 cm', habitat: ['Bauernhöfe', 'Offenland'], rarity: 3 },
  'Steinkauz': { id: 'athene_noctua', scientificName: 'Athene noctua', germanName: 'Steinkauz', englishName: 'Little Owl', family: 'Eulen (Strigidae)', order: 'Eulen (Strigiformes)', icon: '🦉', description: 'Kleine Eule mit strengem Blick, auch tagaktiv.', size: '21-23 cm', habitat: ['Streuobstwiesen', 'Weideland'], rarity: 3 },
  'Waldohreule': { id: 'asio_otus', scientificName: 'Asio otus', germanName: 'Waldohreule', englishName: 'Long-eared Owl', family: 'Eulen (Strigidae)', order: 'Eulen (Strigiformes)', icon: '🦉', description: 'Schlanke Eule mit langen Federohren.', size: '35-40 cm', habitat: ['Nadelwälder', 'Parks'], rarity: 3 },
  'Sumpfohreule': { id: 'asio_flammeus', scientificName: 'Asio flammeus', germanName: 'Sumpfohreule', englishName: 'Short-eared Owl', family: 'Eulen (Strigidae)', order: 'Eulen (Strigiformes)', icon: '🦉', description: 'Tagaktive Eule offener Landschaften.', size: '34-42 cm', habitat: ['Moore', 'Heiden', 'Marschen'], rarity: 4 },
  'Sperlingskauz': { id: 'glaucidium_passerinum', scientificName: 'Glaucidium passerinum', germanName: 'Sperlingskauz', englishName: 'Eurasian Pygmy Owl', family: 'Eulen (Strigidae)', order: 'Eulen (Strigiformes)', icon: '🦉', description: 'Europas kleinste Eule, nur starengroß.', size: '15-19 cm', habitat: ['Nadelwälder', 'Bergwälder'], rarity: 4 },
  'Raufußkauz': { id: 'aegolius_funereus', scientificName: 'Aegolius funereus', germanName: 'Raufußkauz', englishName: "Boreal Owl", family: 'Eulen (Strigidae)', order: 'Eulen (Strigiformes)', icon: '🦉', description: 'Nachtaktive Eule der Bergwälder mit staccato-artigem Gesang.', size: '24-26 cm', habitat: ['Nadelwälder'], rarity: 4 },

  // === GREIFVÖGEL ===
  'Sperber': { id: 'accipiter_nisus', scientificName: 'Accipiter nisus', germanName: 'Sperber', englishName: 'Eurasian Sparrowhawk', family: 'Habichtartige (Accipitridae)', order: 'Greifvögel (Accipitriformes)', icon: '🦅', description: 'Wendiger Jäger kleiner Singvögel.', size: '29-41 cm', habitat: ['Wälder', 'Gärten'], rarity: 2 },
  'Habicht': { id: 'accipiter_gentilis', scientificName: 'Accipiter gentilis', germanName: 'Habicht', englishName: 'Northern Goshawk', family: 'Habichtartige (Accipitridae)', order: 'Greifvögel (Accipitriformes)', icon: '🦅', description: 'Kraftvoller Greifvogel der Wälder.', size: '46-63 cm', habitat: ['Wälder'], rarity: 3 },
  'Rotmilan': { id: 'milvus_milvus', scientificName: 'Milvus milvus', germanName: 'Rotmilan', englishName: 'Red Kite', family: 'Habichtartige (Accipitridae)', order: 'Greifvögel (Accipitriformes)', icon: '🦅', description: 'Eleganter Greifvogel mit gegabeltem Schwanz, Deutschlands Verantwortungsart.', size: '60-66 cm', habitat: ['Offenland', 'Waldränder'], rarity: 2 },
  'Schwarzmilan': { id: 'milvus_migrans', scientificName: 'Milvus migrans', germanName: 'Schwarzmilan', englishName: 'Black Kite', family: 'Habichtartige (Accipitridae)', order: 'Greifvögel (Accipitriformes)', icon: '🦅', description: 'Dunklerer Milan, oft an Gewässern.', size: '48-58 cm', habitat: ['Gewässer', 'Auwälder'], rarity: 3 },
  'Wespenbussard': { id: 'pernis_apivorus', scientificName: 'Pernis apivorus', germanName: 'Wespenbussard', englishName: 'European Honey Buzzard', family: 'Habichtartige (Accipitridae)', order: 'Greifvögel (Accipitriformes)', icon: '🦅', description: 'Greifvogel der Wespen und Hummelnester gräbt.', size: '52-60 cm', habitat: ['Wälder'], rarity: 3 },
  'Wanderfalke': { id: 'falco_peregrinus', scientificName: 'Falco peregrinus', germanName: 'Wanderfalke', englishName: 'Peregrine Falcon', family: 'Falken (Falconidae)', order: 'Falkenartige (Falconiformes)', icon: '🦅', description: 'Schnellstes Tier der Welt, erreicht über 300 km/h im Sturzflug.', size: '38-51 cm', habitat: ['Felsen', 'Städte', 'Kirchtürme'], rarity: 3 },
  'Baumfalke': { id: 'falco_subbuteo', scientificName: 'Falco subbuteo', germanName: 'Baumfalke', englishName: 'Eurasian Hobby', family: 'Falken (Falconidae)', order: 'Falkenartige (Falconiformes)', icon: '🦅', description: 'Eleganter kleiner Falke, jagt Schwalben und Libellen.', size: '29-36 cm', habitat: ['Offenland', 'Waldränder'], rarity: 3 },
  'Fischadler': { id: 'pandion_haliaetus', scientificName: 'Pandion haliaetus', germanName: 'Fischadler', englishName: 'Osprey', family: 'Fischadler (Pandionidae)', order: 'Greifvögel (Accipitriformes)', icon: '🦅', description: 'Spezialist für den Fischfang aus der Luft.', size: '52-60 cm', habitat: ['Seen', 'Flüsse'], rarity: 3 },
  'Seeadler': { id: 'haliaeetus_albicilla', scientificName: 'Haliaeetus albicilla', germanName: 'Seeadler', englishName: 'White-tailed Eagle', family: 'Habichtartige (Accipitridae)', order: 'Greifvögel (Accipitriformes)', icon: '🦅', description: 'Größter Greifvogel Mitteleuropas mit weißem Schwanz.', size: '76-94 cm', habitat: ['Seen', 'Küsten'], rarity: 3 },

  // === WASSERVÖGEL ===
  'Blässhuhn': { id: 'fulica_atra', scientificName: 'Fulica atra', germanName: 'Blässhuhn', englishName: 'Eurasian Coot', family: 'Rallen (Rallidae)', order: 'Kranichvögel (Gruiformes)', icon: '🦆', description: 'Schwarzes Wasserhuhn mit weißer Stirnplatte.', size: '36-42 cm', habitat: ['Seen', 'Teiche', 'Flüsse'], rarity: 1 },
  'Teichhuhn': { id: 'gallinula_chloropus', scientificName: 'Gallinula chloropus', germanName: 'Teichhuhn', englishName: 'Common Moorhen', family: 'Rallen (Rallidae)', order: 'Kranichvögel (Gruiformes)', icon: '🦆', description: 'Dunkelbraunes Wasserhuhn mit rotem Stirnschild.', size: '30-35 cm', habitat: ['Teiche', 'Seen'], rarity: 2 },
  'Wasserralle': { id: 'rallus_aquaticus', scientificName: 'Rallus aquaticus', germanName: 'Wasserralle', englishName: 'Water Rail', family: 'Rallen (Rallidae)', order: 'Kranichvögel (Gruiformes)', icon: '🦆', description: 'Heimliche Ralle, oft nur durch "Quietschen" zu hören.', size: '23-28 cm', habitat: ['Schilfgebiete'], rarity: 3 },
  'Tüpfelsumpfhuhn': { id: 'porzana_porzana', scientificName: 'Porzana porzana', germanName: 'Tüpfelsumpfhuhn', englishName: 'Spotted Crake', family: 'Rallen (Rallidae)', order: 'Kranichvögel (Gruiformes)', icon: '🦆', description: 'Seltenes, scheues Sumpfhuhn mit getüpfelter Brust.', size: '19-22 cm', habitat: ['Feuchtwiesen', 'Schilfgebiete'], rarity: 4 },
  'Wachtelkönig': { id: 'crex_crex', scientificName: 'Crex crex', germanName: 'Wachtelkönig', englishName: 'Corncrake', family: 'Rallen (Rallidae)', order: 'Kranichvögel (Gruiformes)', icon: '🦆', description: 'Seltener Wiesenbrüter mit rätschendem Ruf.', size: '27-30 cm', habitat: ['Feuchtwiesen', 'Agrarland'], rarity: 4 },
  'Haubentaucher': { id: 'podiceps_cristatus', scientificName: 'Podiceps cristatus', germanName: 'Haubentaucher', englishName: 'Great Crested Grebe', family: 'Lappentaucher (Podicipedidae)', order: 'Lappentaucherartige (Podicipediformes)', icon: '🦆', description: 'Eleganter Schwimmvogel mit Federschmuck, berühmt für Balztanz.', size: '46-51 cm', habitat: ['Seen', 'Teiche'], rarity: 2 },
  'Zwergtaucher': { id: 'tachybaptus_ruficollis', scientificName: 'Tachybaptus ruficollis', germanName: 'Zwergtaucher', englishName: 'Little Grebe', family: 'Lappentaucher (Podicipedidae)', order: 'Lappentaucherartige (Podicipediformes)', icon: '🦆', description: 'Kleinster einheimischer Taucher mit trillerendem Ruf.', size: '25-29 cm', habitat: ['Teiche', 'Seen'], rarity: 2 },
  'Graugans': { id: 'anser_anser', scientificName: 'Anser anser', germanName: 'Graugans', englishName: 'Greylag Goose', family: 'Entenvögel (Anatidae)', order: 'Gänsevögel (Anseriformes)', icon: '🦆', description: 'Stammform der Hausgans, gesellig und laut.', size: '75-90 cm', habitat: ['Seen', 'Wiesen', 'Felder'], rarity: 2 },
  'Kanadagans': { id: 'branta_canadensis', scientificName: 'Branta canadensis', germanName: 'Kanadagans', englishName: 'Canada Goose', family: 'Entenvögel (Anatidae)', order: 'Gänsevögel (Anseriformes)', icon: '🦆', description: 'Eingebürgerter Neozoon mit schwarzem Hals und weißem Kinnband.', size: '90-100 cm', habitat: ['Parks', 'Seen', 'Wiesen'], rarity: 2 },
  'Nilgans': { id: 'alopochen_aegyptiaca', scientificName: 'Alopochen aegyptiaca', germanName: 'Nilgans', englishName: 'Egyptian Goose', family: 'Entenvögel (Anatidae)', order: 'Gänsevögel (Anseriformes)', icon: '🦆', description: 'Eingebürgerte Gans mit Augenfleck, breitet sich stark aus.', size: '63-73 cm', habitat: ['Parks', 'Gewässer'], rarity: 2 },
  'Höckerschwan': { id: 'cygnus_olor', scientificName: 'Cygnus olor', germanName: 'Höckerschwan', englishName: 'Mute Swan', family: 'Entenvögel (Anatidae)', order: 'Gänsevögel (Anseriformes)', icon: '🦢', description: 'Eleganter weißer Schwan mit orangerotem Schnabel.', size: '125-170 cm', habitat: ['Seen', 'Flüsse', 'Parks'], rarity: 1 },
  'Krickente': { id: 'anas_crecca', scientificName: 'Anas crecca', germanName: 'Krickente', englishName: 'Eurasian Teal', family: 'Entenvögel (Anatidae)', order: 'Gänsevögel (Anseriformes)', icon: '🦆', description: 'Kleinste europäische Ente mit auffälligem grünem Augenfleck.', size: '34-38 cm', habitat: ['Feuchtgebiete', 'Seen'], rarity: 3 },
  'Reiherente': { id: 'aythya_fuligula', scientificName: 'Aythya fuligula', germanName: 'Reiherente', englishName: 'Tufted Duck', family: 'Entenvögel (Anatidae)', order: 'Gänsevögel (Anseriformes)', icon: '🦆', description: 'Tauchente mit Federschopf am Hinterkopf.', size: '40-47 cm', habitat: ['Seen', 'Teiche'], rarity: 2 },
  'Tafelente': { id: 'aythya_ferina', scientificName: 'Aythya ferina', germanName: 'Tafelente', englishName: 'Common Pochard', family: 'Entenvögel (Anatidae)', order: 'Gänsevögel (Anseriformes)', icon: '🦆', description: 'Tauchente mit rotem Kopf und schwarzer Brust.', size: '42-49 cm', habitat: ['Seen', 'Teiche'], rarity: 3 },
  'Schnatterente': { id: 'mareca_strepera', scientificName: 'Mareca strepera', germanName: 'Schnatterente', englishName: 'Gadwall', family: 'Entenvögel (Anatidae)', order: 'Gänsevögel (Anseriformes)', icon: '🦆', description: 'Unscheinbare Gründelente mit schwarzem Bürzel.', size: '46-56 cm', habitat: ['Seen', 'Teiche'], rarity: 3 },
  'Löffelente': { id: 'spatula_clypeata', scientificName: 'Spatula clypeata', germanName: 'Löffelente', englishName: 'Northern Shoveler', family: 'Entenvögel (Anatidae)', order: 'Gänsevögel (Anseriformes)', icon: '🦆', description: 'Ente mit übergroßem löffelförmigem Schnabel.', size: '44-52 cm', habitat: ['Feuchtgebiete', 'Seen'], rarity: 3 },
  'Gänsesäger': { id: 'mergus_merganser', scientificName: 'Mergus merganser', germanName: 'Gänsesäger', englishName: 'Common Merganser', family: 'Entenvögel (Anatidae)', order: 'Gänsevögel (Anseriformes)', icon: '🦆', description: 'Großer Taucher mit Sägeschnabel für den Fischfang.', size: '58-72 cm', habitat: ['Flüsse', 'Seen'], rarity: 3 },
  'Kormoran': { id: 'phalacrocorax_carbo', scientificName: 'Phalacrocorax carbo', germanName: 'Kormoran', englishName: 'Great Cormorant', family: 'Kormorane (Phalacrocoracidae)', order: 'Suliformes', icon: '🐦‍⬛', description: 'Schwarzer Wasservogel, trocknet Flügel an der Sonne.', size: '77-94 cm', habitat: ['Seen', 'Flüsse', 'Küsten'], rarity: 2 },

  // === REIHER & STÖRCHE ===
  'Silberreiher': { id: 'ardea_alba', scientificName: 'Ardea alba', germanName: 'Silberreiher', englishName: 'Great Egret', family: 'Reiher (Ardeidae)', order: 'Pelecaniformes', icon: '🦢', description: 'Großer weißer Reiher, breitet sich in Europa aus.', size: '85-100 cm', habitat: ['Feuchtgebiete', 'Seen'], rarity: 3 },
  'Weißstorch': { id: 'ciconia_ciconia', scientificName: 'Ciconia ciconia', germanName: 'Weißstorch', englishName: 'White Stork', family: 'Störche (Ciconiidae)', order: 'Ciconiiformes', icon: '🦩', description: 'Beliebter Kulturfolger mit schwarz-weißem Gefieder.', size: '100-115 cm', habitat: ['Feuchtwiesen', 'Siedlungen'], rarity: 2 },
  'Schwarzstorch': { id: 'ciconia_nigra', scientificName: 'Ciconia nigra', germanName: 'Schwarzstorch', englishName: 'Black Stork', family: 'Störche (Ciconiidae)', order: 'Ciconiiformes', icon: '🦩', description: 'Scheuer Waldstorch mit metallisch glänzendem Gefieder.', size: '95-100 cm', habitat: ['Wälder', 'Feuchtgebiete'], rarity: 4 },

  // === LIMIKOLEN (WATVÖGEL) ===
  'Kiebitz': { id: 'vanellus_vanellus', scientificName: 'Vanellus vanellus', germanName: 'Kiebitz', englishName: 'Northern Lapwing', family: 'Regenpfeifer (Charadriidae)', order: 'Regenpfeiferartige (Charadriiformes)', icon: '🐦', description: 'Wiesenbrüter mit Federhaube und metallisch grünem Rücken.', size: '28-33 cm', habitat: ['Feuchtwiesen', 'Äcker'], rarity: 2 },
  'Bekassine': { id: 'gallinago_gallinago', scientificName: 'Gallinago gallinago', germanName: 'Bekassine', englishName: 'Common Snipe', family: 'Schnepfen (Scolopacidae)', order: 'Regenpfeiferartige (Charadriiformes)', icon: '🐦', description: 'Schnepfe mit extrem langem Schnabel, erzeugt Meckern im Flug.', size: '25-27 cm', habitat: ['Feuchtwiesen', 'Moore'], rarity: 3 },
  'Waldschnepfe': { id: 'scolopax_rusticola', scientificName: 'Scolopax rusticola', germanName: 'Waldschnepfe', englishName: 'Eurasian Woodcock', family: 'Schnepfen (Scolopacidae)', order: 'Regenpfeiferartige (Charadriiformes)', icon: '🐦', description: 'Dämmerungsaktiver Waldbewohner mit Schnepfenstrich.', size: '33-38 cm', habitat: ['Wälder', 'Feuchtgebiete'], rarity: 3 },
  'Flussregenpfeifer': { id: 'charadrius_dubius', scientificName: 'Charadrius dubius', germanName: 'Flussregenpfeifer', englishName: 'Little Ringed Plover', family: 'Regenpfeifer (Charadriidae)', order: 'Regenpfeiferartige (Charadriiformes)', icon: '🐦', description: 'Kleiner Bodenbrüter auf Kiesflächen.', size: '14-15 cm', habitat: ['Kiesgruben', 'Flussufer'], rarity: 3 },
  'Flussuferläufer': { id: 'actitis_hypoleucos', scientificName: 'Actitis hypoleucos', germanName: 'Flussuferläufer', englishName: 'Common Sandpiper', family: 'Schnepfen (Scolopacidae)', order: 'Regenpfeiferartige (Charadriiformes)', icon: '🐦', description: 'Wippt ständig mit dem Hinterkörper.', size: '19-21 cm', habitat: ['Flussufer', 'Seen'], rarity: 3 },

  // === MÖWEN & SEESCHWALBEN ===
  'Lachmöwe': { id: 'chroicocephalus_ridibundus', scientificName: 'Chroicocephalus ridibundus', germanName: 'Lachmöwe', englishName: 'Black-headed Gull', family: 'Möwen (Laridae)', order: 'Regenpfeiferartige (Charadriiformes)', icon: '🐦', description: 'Häufigste Möwe im Binnenland, Sommerkleid mit braunem Kopf.', size: '35-39 cm', habitat: ['Seen', 'Felder', 'Städte'], rarity: 1 },
  'Silbermöwe': { id: 'larus_argentatus', scientificName: 'Larus argentatus', germanName: 'Silbermöwe', englishName: 'European Herring Gull', family: 'Möwen (Laridae)', order: 'Regenpfeiferartige (Charadriiformes)', icon: '🐦', description: 'Große Möwe mit gelben Augen und rotem Schnabelfleck.', size: '55-67 cm', habitat: ['Küsten', 'Seen', 'Städte'], rarity: 2 },
  'Steppenmöwe': { id: 'larus_cachinnans', scientificName: 'Larus cachinnans', germanName: 'Steppenmöwe', englishName: 'Caspian Gull', family: 'Möwen (Laridae)', order: 'Regenpfeiferartige (Charadriiformes)', icon: '🐦', description: 'Große Möwe ähnlich der Silbermöwe.', size: '56-68 cm', habitat: ['Seen', 'Deponien'], rarity: 3 },
  'Sturmmöwe': { id: 'larus_canus', scientificName: 'Larus canus', germanName: 'Sturmmöwe', englishName: 'Mew Gull', family: 'Möwen (Laridae)', order: 'Regenpfeiferartige (Charadriiformes)', icon: '🐦', description: 'Mittelgroße Möwe mit sanftem Ausdruck.', size: '40-46 cm', habitat: ['Küsten', 'Felder'], rarity: 2 },
  'Flussseeschwalbe': { id: 'sterna_hirundo', scientificName: 'Sterna hirundo', germanName: 'Flussseeschwalbe', englishName: 'Common Tern', family: 'Seeschwalben (Sternidae)', order: 'Regenpfeiferartige (Charadriiformes)', icon: '🐦', description: 'Elegante Seeschwalbe, Stoßtaucher.', size: '31-35 cm', habitat: ['Seen', 'Flüsse', 'Küsten'], rarity: 3 },

  // === TAUBEN ===
  'Hohltaube': { id: 'columba_oenas', scientificName: 'Columba oenas', germanName: 'Hohltaube', englishName: 'Stock Dove', family: 'Tauben (Columbidae)', order: 'Taubenvögel (Columbiformes)', icon: '🕊️', description: 'Höhlenbrütende Taube, kleiner als Ringeltaube.', size: '29-34 cm', habitat: ['Wälder', 'Parks'], rarity: 3 },
  'Straßentaube': { id: 'columba_livia_f_domestica', scientificName: 'Columba livia f. domestica', germanName: 'Straßentaube', englishName: 'Rock Dove', family: 'Tauben (Columbidae)', order: 'Taubenvögel (Columbiformes)', icon: '🕊️', description: 'Verwilderte Haustaube, allgegenwärtig in Städten.', size: '29-37 cm', habitat: ['Städte', 'Siedlungen'], rarity: 1 },
  'Turteltaube': { id: 'streptopelia_turtur', scientificName: 'Streptopelia turtur', germanName: 'Turteltaube', englishName: 'European Turtle Dove', family: 'Tauben (Columbidae)', order: 'Taubenvögel (Columbiformes)', icon: '🕊️', description: 'Kleinste europäische Taube, schnurrende Stimme. Stark gefährdet!', size: '24-28 cm', habitat: ['Waldränder', 'Hecken'], rarity: 4 },

  // === HÜHNERVÖGEL ===
  'Fasan': { id: 'phasianus_colchicus', scientificName: 'Phasianus colchicus', germanName: 'Fasan', englishName: 'Common Pheasant', family: 'Fasanenartige (Phasianidae)', order: 'Hühnervögel (Galliformes)', icon: '🐔', description: 'Bunter Hühnervogel, Männchen mit langem Schwanz.', size: '53-89 cm', habitat: ['Felder', 'Waldränder'], rarity: 2 },
  'Rebhuhn': { id: 'perdix_perdix', scientificName: 'Perdix perdix', germanName: 'Rebhuhn', englishName: 'Grey Partridge', family: 'Fasanenartige (Phasianidae)', order: 'Hühnervögel (Galliformes)', icon: '🐔', description: 'Bodenbewohnender Hühnervogel der Agrarlandschaft, stark rückläufig.', size: '29-31 cm', habitat: ['Agrarland', 'Brachen'], rarity: 3 },
  'Wachtel': { id: 'coturnix_coturnix', scientificName: 'Coturnix coturnix', germanName: 'Wachtel', englishName: 'Common Quail', family: 'Fasanenartige (Phasianidae)', order: 'Hühnervögel (Galliformes)', icon: '🐔', description: 'Kleinster europäischer Hühnervogel, selten zu sehen, aber zu hören.', size: '16-18 cm', habitat: ['Felder', 'Wiesen'], rarity: 3 },

  // === NEOZOEN & SONDERFÄLLE ===
  'Halsbandsittich': { id: 'psittacula_krameri', scientificName: 'Psittacula krameri', germanName: 'Halsbandsittich', englishName: 'Rose-ringed Parakeet', family: 'Papageien (Psittacidae)', order: 'Papageien (Psittaciformes)', icon: '🦜', description: 'Grüner Papagei, in vielen deutschen Städten eingebürgert (Köln, Düsseldorf, Heidelberg).', size: '38-42 cm', habitat: ['Parks', 'Städte'], rarity: 3 },
  'Alexandersittich': { id: 'psittacula_eupatria', scientificName: 'Psittacula eupatria', germanName: 'Alexandersittich', englishName: 'Alexandrine Parakeet', family: 'Papageien (Psittacidae)', order: 'Papageien (Psittaciformes)', icon: '🦜', description: 'Großer Sittich, vereinzelt verwildert in Städten.', size: '56-62 cm', habitat: ['Parks', 'Städte'], rarity: 4 },

  // === EISVOGEL & SPEZIALISTEN ===
  'Eisvogel': { id: 'alcedo_atthis', scientificName: 'Alcedo atthis', germanName: 'Eisvogel', englishName: 'Common Kingfisher', family: 'Eisvögel (Alcedinidae)', order: 'Rackenvögel (Coraciiformes)', icon: '🐦', description: 'Funkelnder Juwel an Gewässern, taucht blitzschnell nach Fischen.', size: '16-17 cm', habitat: ['Bäche', 'Flüsse', 'Seen'], rarity: 3 },
  'Bienenfresser': { id: 'merops_apiaster', scientificName: 'Merops apiaster', germanName: 'Bienenfresser', englishName: 'European Bee-eater', family: 'Bienenfresser (Meropidae)', order: 'Rackenvögel (Coraciiformes)', icon: '🐦', description: 'Bunter Höhlenbrüter, breitet sich mit dem Klimawandel nach Norden aus.', size: '27-29 cm', habitat: ['Steilwände', 'Kiesgruben'], rarity: 4 },
  'Wiedehopf': { id: 'upupa_epops', scientificName: 'Upupa epops', germanName: 'Wiedehopf', englishName: 'Eurasian Hoopoe', family: 'Wiedehopfe (Upupidae)', order: 'Hornvögel (Bucerotiformes)', icon: '🐦', description: 'Auffälliger Vogel mit Federhaube und zebragemustertem Flügel.', size: '25-29 cm', habitat: ['Streuobstwiesen', 'Weinberge'], rarity: 4 },
  'Pirol': { id: 'oriolus_oriolus', scientificName: 'Oriolus oriolus', germanName: 'Pirol', englishName: 'Eurasian Golden Oriole', family: 'Pirole (Oriolidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Leuchtend gelb-schwarzer Tropenvogel-Look, flötender Gesang.', size: '22-25 cm', habitat: ['Auwälder', 'Laubwälder'], rarity: 3 },
  'Neuntöter': { id: 'lanius_collurio', scientificName: 'Lanius collurio', germanName: 'Neuntöter', englishName: 'Red-backed Shrike', family: 'Würger (Laniidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Kleiner Würger, spießt Beute auf Dornen auf.', size: '16-18 cm', habitat: ['Dornenhecken', 'Brachen'], rarity: 3 },
  'Raubwürger': { id: 'lanius_excubitor', scientificName: 'Lanius excubitor', germanName: 'Raubwürger', englishName: 'Great Grey Shrike', family: 'Würger (Laniidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Größter europäischer Würger, rüttelt wie ein kleiner Greifvogel.', size: '24-26 cm', habitat: ['Heiden', 'Brachen'], rarity: 4 },
  'Wasseramsel': { id: 'cinclus_cinclus', scientificName: 'Cinclus cinclus', germanName: 'Wasseramsel', englishName: 'White-throated Dipper', family: 'Wasseramseln (Cinclidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Einziger Singvogel der unter Wasser tauchen und laufen kann.', size: '17-20 cm', habitat: ['Gebirgsbäche', 'Fließgewässer'], rarity: 3 },
  'Baumläufer': { id: 'certhia_familiaris', scientificName: 'Certhia familiaris', germanName: 'Waldbaumläufer', englishName: 'Eurasian Treecreeper', family: 'Baumläufer (Certhiidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Klettert spiralförmig an Baumstämmen nach oben.', size: '12-13 cm', habitat: ['Wälder'], rarity: 2 },
  'Gartenbaumläufer': { id: 'certhia_brachydactyla', scientificName: 'Certhia brachydactyla', germanName: 'Gartenbaumläufer', englishName: 'Short-toed Treecreeper', family: 'Baumläufer (Certhiidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Ähnlich dem Waldbaumläufer, bevorzugt Gärten und Parks.', size: '12-13 cm', habitat: ['Parks', 'Gärten', 'Laubwälder'], rarity: 2 },
  'Feldlerche': { id: 'alauda_arvensis', scientificName: 'Alauda arvensis', germanName: 'Feldlerche', englishName: 'Eurasian Skylark', family: 'Lerchen (Alaudidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Singflug hoch in der Luft, Vogel des Jahres 2019.', size: '16-18 cm', habitat: ['Felder', 'Wiesen'], rarity: 2 },
  'Haubenlerche': { id: 'galerida_cristata', scientificName: 'Galerida cristata', germanName: 'Haubenlerche', englishName: 'Crested Lark', family: 'Lerchen (Alaudidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Lerche mit spitzer Haube, stark rückläufig.', size: '17-19 cm', habitat: ['Brachen', 'Industriegebiete'], rarity: 4 },
  'Heidelerche': { id: 'lullula_arborea', scientificName: 'Lullula arborea', germanName: 'Heidelerche', englishName: 'Woodlark', family: 'Lerchen (Alaudidae)', order: 'Sperlingsvögel (Passeriformes)', icon: '🐦', description: 'Melodisch flötende Lerche trockener Standorte.', size: '15 cm', habitat: ['Heiden', 'Lichtungen'], rarity: 3 },
  'Kranich': { id: 'grus_grus', scientificName: 'Grus grus', germanName: 'Kranich', englishName: 'Common Crane', family: 'Kraniche (Gruidae)', order: 'Kranichvögel (Gruiformes)', icon: '🐦', description: 'Majestätischer Zugvogel mit trompetendem Ruf.', size: '96-119 cm', habitat: ['Moore', 'Feuchtwiesen', 'Felder'], rarity: 3 },
};

// Hilfsfunktion: Vogel nach Namen suchen
export const findBird = (name) => {
  const searchName = name.toLowerCase();
  for (const [key, bird] of Object.entries(BIRD_LIBRARY)) {
    if (
      key.toLowerCase().includes(searchName) ||
      bird.germanName?.toLowerCase().includes(searchName) ||
      bird.englishName?.toLowerCase().includes(searchName) ||
      bird.scientificName?.toLowerCase().includes(searchName)
    ) {
      return { key, ...bird };
    }
  }
  return null;
};

// Hilfsfunktion: Alle Vögel für Habitat
export const getBirdsByHabitat = (habitatType) => {
  return Object.entries(BIRD_LIBRARY)
    .filter(([_, bird]) => bird.habitatTypes?.includes(habitatType))
    .map(([key, bird]) => ({ key, ...bird }));
};

// Hilfsfunktion: Vögel nach Seltenheit
export const getBirdsByRarity = (minRarity = 1, maxRarity = 5) => {
  return Object.entries(BIRD_LIBRARY)
    .filter(([_, bird]) => bird.rarity >= minRarity && bird.rarity <= maxRarity)
    .map(([key, bird]) => ({ key, ...bird }));
};

// Hilfsfunktion: Frequenzbereich für Art
export const getFrequencyRange = (name) => {
  const bird = BIRD_LIBRARY[name];
  return bird?.voice?.frequency || '2.0-8.0 kHz';
};

// Habitat-Typen
export const HABITAT_TYPES = {
  urban: { name: 'Stadt/Siedlung', icon: '🏙️', color: '#888' },
  garden: { name: 'Garten', icon: '🌳', color: '#4CAF50' },
  forest: { name: 'Wald', icon: '🌲', color: '#2E7D32' },
  coniferous: { name: 'Nadelwald', icon: '🌲', color: '#1B5E20' },
  park: { name: 'Park', icon: '🏞️', color: '#66BB6A' },
  field: { name: 'Feld/Offenland', icon: '🌾', color: '#FFC107' },
  meadow: { name: 'Wiese', icon: '🌿', color: '#8BC34A' },
  water: { name: 'Gewässer', icon: '💧', color: '#2196F3' },
  wetland: { name: 'Feuchtgebiet', icon: '🌊', color: '#03A9F4' },
  shrub: { name: 'Gebüsch/Hecke', icon: '🌿', color: '#689F38' },
  edge: { name: 'Waldrand', icon: '🌳', color: '#558B2F' },
  cliff: { name: 'Felsen', icon: '🪨', color: '#795548' },
  farm: { name: 'Bauernhof', icon: '🏠', color: '#8D6E63' },
  quarry: { name: 'Steinbruch', icon: '⛏️', color: '#607D8B' },
};

export default BIRD_LIBRARY;
