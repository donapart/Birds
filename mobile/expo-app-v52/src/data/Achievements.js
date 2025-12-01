/**
 * Achievements System - Abzeichen und Herausforderungen
 */

export const ACHIEVEMENTS = {
  // === ERSTE SCHRITTE ===
  first_detection: {
    id: 'first_detection',
    name: 'Erste Erkennung',
    description: 'Erkenne deinen ersten Vogel',
    icon: '🎯',
    category: 'basics',
    points: 10,
    condition: (stats) => stats.totalDetections >= 1,
  },
  first_species: {
    id: 'first_species',
    name: 'Vogelbeobachter',
    description: 'Identifiziere 5 verschiedene Arten',
    icon: '🐦',
    category: 'basics',
    points: 25,
    condition: (stats) => stats.uniqueSpecies >= 5,
  },
  bird_enthusiast: {
    id: 'bird_enthusiast',
    name: 'Vogelenthusiast',
    description: 'Identifiziere 20 verschiedene Arten',
    icon: '🦜',
    category: 'basics',
    points: 100,
    condition: (stats) => stats.uniqueSpecies >= 20,
  },
  bird_expert: {
    id: 'bird_expert',
    name: 'Vogelexperte',
    description: 'Identifiziere 50 verschiedene Arten',
    icon: '🎓',
    category: 'basics',
    points: 500,
    condition: (stats) => stats.uniqueSpecies >= 50,
  },

  // === MENGEN ===
  hundred_detections: {
    id: 'hundred_detections',
    name: 'Fleißiger Beobachter',
    description: '100 Erkennungen durchgeführt',
    icon: '💯',
    category: 'quantity',
    points: 50,
    condition: (stats) => stats.totalDetections >= 100,
  },
  thousand_detections: {
    id: 'thousand_detections',
    name: 'Marathonbeobachter',
    description: '1000 Erkennungen durchgeführt',
    icon: '🏆',
    category: 'quantity',
    points: 250,
    condition: (stats) => stats.totalDetections >= 1000,
  },

  // === ZEITBASIERT ===
  early_bird: {
    id: 'early_bird',
    name: 'Frühaufsteher',
    description: 'Erkenne einen Vogel vor 6 Uhr morgens',
    icon: '🌅',
    category: 'time',
    points: 30,
    condition: (stats) => stats.hasEarlyDetection,
  },
  night_owl: {
    id: 'night_owl',
    name: 'Nachteule',
    description: 'Erkenne einen Vogel nach 22 Uhr',
    icon: '🦉',
    category: 'time',
    points: 40,
    condition: (stats) => stats.hasNightDetection,
  },
  dawn_chorus: {
    id: 'dawn_chorus',
    name: 'Morgenkonzert',
    description: 'Erkenne 5+ Arten in einer Morgensession (5-8 Uhr)',
    icon: '🎵',
    category: 'time',
    points: 75,
    condition: (stats) => stats.maxDawnChorusSpecies >= 5,
  },
  streak_3: {
    id: 'streak_3',
    name: 'Beständig',
    description: '3 Tage in Folge Vögel beobachtet',
    icon: '🔥',
    category: 'time',
    points: 30,
    condition: (stats) => stats.currentStreak >= 3,
  },
  streak_7: {
    id: 'streak_7',
    name: 'Wochenroutine',
    description: '7 Tage in Folge Vögel beobachtet',
    icon: '🔥🔥',
    category: 'time',
    points: 75,
    condition: (stats) => stats.currentStreak >= 7,
  },
  streak_30: {
    id: 'streak_30',
    name: 'Monatschampion',
    description: '30 Tage in Folge Vögel beobachtet',
    icon: '🔥🔥🔥',
    category: 'time',
    points: 300,
    condition: (stats) => stats.currentStreak >= 30,
  },

  // === TAGESLEISTUNG ===
  ten_species_day: {
    id: 'ten_species_day',
    name: 'Produktiver Tag',
    description: '10 verschiedene Arten an einem Tag',
    icon: '📅',
    category: 'daily',
    points: 50,
    condition: (stats) => stats.maxSpeciesPerDay >= 10,
  },
  twenty_species_day: {
    id: 'twenty_species_day',
    name: 'Rekordtag',
    description: '20 verschiedene Arten an einem Tag',
    icon: '🌟',
    category: 'daily',
    points: 150,
    condition: (stats) => stats.maxSpeciesPerDay >= 20,
  },

  // === SPEZIELLE ARTEN ===
  owl_spotter: {
    id: 'owl_spotter',
    name: 'Eulenflüsterer',
    description: 'Erkenne eine Eule',
    icon: '🦉',
    category: 'species',
    points: 75,
    condition: (stats) => stats.hasOwl,
  },
  woodpecker_fan: {
    id: 'woodpecker_fan',
    name: 'Spechtfreund',
    description: 'Erkenne einen Specht',
    icon: '🪶',
    category: 'species',
    points: 50,
    condition: (stats) => stats.hasWoodpecker,
  },
  raptor_watcher: {
    id: 'raptor_watcher',
    name: 'Greifvogelbeobachter',
    description: 'Erkenne einen Greifvogel',
    icon: '🦅',
    category: 'species',
    points: 60,
    condition: (stats) => stats.hasRaptor,
  },
  nightingale_hunter: {
    id: 'nightingale_hunter',
    name: 'Nachtigallenjäger',
    description: 'Erkenne eine Nachtigall',
    icon: '🎵',
    category: 'species',
    points: 100,
    condition: (stats) => stats.hasNightingale,
  },
  cuckoo_finder: {
    id: 'cuckoo_finder',
    name: 'Kuckucksfinder',
    description: 'Erkenne einen Kuckuck',
    icon: '🐦',
    category: 'species',
    points: 75,
    condition: (stats) => stats.hasCuckoo,
  },
  rare_bird: {
    id: 'rare_bird',
    name: 'Seltenheitsjäger',
    description: 'Erkenne eine seltene Art (Rarity 4+)',
    icon: '💎',
    category: 'species',
    points: 150,
    condition: (stats) => stats.hasRareBird,
  },

  // === FAMILIEN ===
  tit_collector: {
    id: 'tit_collector',
    name: 'Meisensammler',
    description: 'Erkenne 3 verschiedene Meisenarten',
    icon: '🐤',
    category: 'family',
    points: 50,
    condition: (stats) => stats.titSpecies >= 3,
  },
  thrush_expert: {
    id: 'thrush_expert',
    name: 'Drosselkenner',
    description: 'Erkenne 3 verschiedene Drosselarten',
    icon: '🐦',
    category: 'family',
    points: 50,
    condition: (stats) => stats.thrushSpecies >= 3,
  },
  finch_fan: {
    id: 'finch_fan',
    name: 'Finkenfreund',
    description: 'Erkenne 4 verschiedene Finkenarten',
    icon: '🐦',
    category: 'family',
    points: 60,
    condition: (stats) => stats.finchSpecies >= 4,
  },

  // === GPS/STANDORT ===
  explorer: {
    id: 'explorer',
    name: 'Entdecker',
    description: 'Erkennungen an 5 verschiedenen Orten',
    icon: '🗺️',
    category: 'location',
    points: 50,
    condition: (stats) => stats.uniqueLocations >= 5,
  },
  globetrotter: {
    id: 'globetrotter',
    name: 'Weltenbummler',
    description: 'Erkennungen an 20 verschiedenen Orten',
    icon: '🌍',
    category: 'location',
    points: 150,
    condition: (stats) => stats.uniqueLocations >= 20,
  },

  // === QUALITÄT ===
  confident_spotter: {
    id: 'confident_spotter',
    name: 'Sicherer Blick',
    description: '10 Erkennungen mit >90% Konfidenz',
    icon: '🎯',
    category: 'quality',
    points: 40,
    condition: (stats) => stats.highConfidenceDetections >= 10,
  },
  perfect_id: {
    id: 'perfect_id',
    name: 'Perfekte Identifikation',
    description: 'Erkennung mit 99%+ Konfidenz',
    icon: '✨',
    category: 'quality',
    points: 25,
    condition: (stats) => stats.hasPerfectDetection,
  },

  // === FEEDBACK ===
  helpful_feedback: {
    id: 'helpful_feedback',
    name: 'Hilfreicher Beobachter',
    description: '10 Feedback-Bewertungen abgegeben',
    icon: '👍',
    category: 'community',
    points: 30,
    condition: (stats) => stats.totalFeedback >= 10,
  },
  feedback_champion: {
    id: 'feedback_champion',
    name: 'Feedback-Champion',
    description: '100 Feedback-Bewertungen abgegeben',
    icon: '🏅',
    category: 'community',
    points: 100,
    condition: (stats) => stats.totalFeedback >= 100,
  },

  // === SAISON ===
  spring_migration: {
    id: 'spring_migration',
    name: 'Frühlingsbeobachter',
    description: 'Erkenne einen Zugvogel im Frühling (März-Mai)',
    icon: '🌸',
    category: 'season',
    points: 40,
    condition: (stats) => stats.hasSpringMigrant,
  },
  winter_birding: {
    id: 'winter_birding',
    name: 'Winterbeobachter',
    description: '10 Erkennungen im Winter (Dez-Feb)',
    icon: '❄️',
    category: 'season',
    points: 50,
    condition: (stats) => stats.winterDetections >= 10,
  },
};

// Achievement-Kategorien
export const ACHIEVEMENT_CATEGORIES = {
  basics: { name: 'Grundlagen', icon: '🎯', color: '#4CAF50' },
  quantity: { name: 'Menge', icon: '📊', color: '#2196F3' },
  time: { name: 'Zeit', icon: '⏰', color: '#FF9800' },
  daily: { name: 'Tagesleistung', icon: '📅', color: '#9C27B0' },
  species: { name: 'Besondere Arten', icon: '🦜', color: '#E91E63' },
  family: { name: 'Vogelfamilien', icon: '🐦', color: '#00BCD4' },
  location: { name: 'Standorte', icon: '🗺️', color: '#795548' },
  quality: { name: 'Qualität', icon: '✨', color: '#FFC107' },
  community: { name: 'Community', icon: '👥', color: '#607D8B' },
  season: { name: 'Jahreszeiten', icon: '🍂', color: '#8BC34A' },
};

// Hilfsfunktion: Unlocked Achievements berechnen
export const calculateUnlockedAchievements = (stats) => {
  const unlocked = [];
  const locked = [];
  
  for (const [id, achievement] of Object.entries(ACHIEVEMENTS)) {
    if (achievement.condition(stats)) {
      unlocked.push({ ...achievement, unlocked: true });
    } else {
      locked.push({ ...achievement, unlocked: false });
    }
  }
  
  return { unlocked, locked };
};

// Hilfsfunktion: Gesamtpunkte berechnen
export const calculateTotalPoints = (stats) => {
  let points = 0;
  for (const achievement of Object.values(ACHIEVEMENTS)) {
    if (achievement.condition(stats)) {
      points += achievement.points;
    }
  }
  return points;
};

// Hilfsfunktion: Rang basierend auf Punkten
export const getRank = (points) => {
  if (points >= 2000) return { name: 'Meisterornithologe', icon: '👑', level: 10 };
  if (points >= 1500) return { name: 'Experte', icon: '🎖️', level: 9 };
  if (points >= 1000) return { name: 'Fortgeschrittener', icon: '🥇', level: 8 };
  if (points >= 750) return { name: 'Erfahrener Beobachter', icon: '🥈', level: 7 };
  if (points >= 500) return { name: 'Hobby-Ornithologe', icon: '🥉', level: 6 };
  if (points >= 300) return { name: 'Begeisterter Beobachter', icon: '⭐', level: 5 };
  if (points >= 150) return { name: 'Naturfreund', icon: '🌿', level: 4 };
  if (points >= 75) return { name: 'Vogelfreund', icon: '🐦', level: 3 };
  if (points >= 25) return { name: 'Anfänger', icon: '🌱', level: 2 };
  return { name: 'Neuling', icon: '🥚', level: 1 };
};

// Herausforderungen (tägliche/wöchentliche)
export const CHALLENGES = {
  daily: [
    { id: 'daily_5', name: '5 Erkennungen heute', target: 5, reward: 10, icon: '🎯' },
    { id: 'daily_3_species', name: '3 verschiedene Arten', target: 3, reward: 15, icon: '🐦' },
    { id: 'daily_high_conf', name: 'Eine Erkennung >80%', target: 1, reward: 10, icon: '✨' },
  ],
  weekly: [
    { id: 'weekly_20', name: '20 Erkennungen diese Woche', target: 20, reward: 50, icon: '📅' },
    { id: 'weekly_10_species', name: '10 verschiedene Arten', target: 10, reward: 75, icon: '🦜' },
    { id: 'weekly_new', name: 'Eine neue Art entdecken', target: 1, reward: 100, icon: '🆕' },
  ],
};

export default ACHIEVEMENTS;
