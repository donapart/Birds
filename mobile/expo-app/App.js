/**
 * BirdSound - 160+ Arten, smarter Filter, BirdNET-Codes erweitert
 * Entwickler: Dano Schönwald
 *
 * Version: see app.json / package.json (single source of truth).
 * Read at runtime via Constants.expoConfig.version.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, StatusBar, Platform, Alert, TextInput, Modal, Switch, Share, FlatList, Dimensions, AppState, Linking, RefreshControl } from 'react-native';
import { WebView } from 'react-native-webview';
// MapView replaced with WebView + OpenStreetMap (no API key required)
import { Audio } from 'expo-av';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Network from 'expo-network';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as TaskManager from 'expo-task-manager';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { BIRD_LIBRARY } from './src/data/BirdLibrary';
import { ACHIEVEMENTS, calculateUnlockedAchievements, calculateTotalPoints, getRank } from './src/data/Achievements';
import { resolveSpecies, isPlausibleEuropean, isIndependentDetection } from './src/utils/SpeciesResolver';
import { generateFieldReport, generateSessionKML, generateSessionJSON } from './src/utils/ScientificReport';
import { SPECTROGRAM_HTML } from './src/components/SpectrogramHTML';

// API-URL via app.json -> expo.extra.apiUrl (override per build/env if needed)
const URL =
  (Constants.expoConfig && Constants.expoConfig.extra && Constants.expoConfig.extra.apiUrl) ||
  (Constants.manifest && Constants.manifest.extra && Constants.manifest.extra.apiUrl) ||
  'https://available-nonsegmentary-arlene.ngrok-free.dev';

// App-Version aus app.json/package.json (single source of truth)
const APP_VERSION =
  (Constants.expoConfig && Constants.expoConfig.version) ||
  (Constants.manifest && Constants.manifest.version) ||
  '0.0.0';

const BACKGROUND_LOCATION_TASK = 'background-location-task';

// Background Location Task für kontinuierliche Updates
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Background location error:', error);
    return;
  }
  if (data) {
    const { locations } = data;
    // Speichere letzten Standort für Background-Aufnahmen
    if (locations && locations.length > 0) {
      const latestLocation = locations[locations.length - 1];
      await AsyncStorage.setItem('lastBackgroundLocation', JSON.stringify(latestLocation.coords));
    }
  }
});

export default function App() {
  const [settings, setSettings] = useState({
    backendUrl: URL, chunkDuration: 3, minConfidence: 0.3, enableGPS: true, offlineMode: true,
    selectedModel: null, consensusMethod: 'weighted_average', autoStopMinutes: 0,
    backgroundRecording: false,  // Neue Einstellung für Hintergrund-Aufnahme
    // Audio Enhancement Settings (v5.6.0)
    audioEnhancement: {
      preset: null,  // none, light, moderate, aggressive, noisy_environment, wind_reduction
      bandpassEnabled: false,
      bandpassLowFreq: 1000,
      bandpassHighFreq: 8000,
      noiseReductionEnabled: false,
      noiseReductionStrength: 1.0,
      autoGainEnabled: false,
      autoGainTargetDb: -3.0,
      spectralGateEnabled: false,
      spectralGateThresholdDb: -40.0,
      highpassEnabled: false,
      highpassFreq: 200,
    },
  });
  const [availableModels, setAvailableModels] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isInBackground, setIsInBackground] = useState(false);
  const [streamTime, setStreamTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [location, setLocation] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [detections, setDetections] = useState([]);
  const [uniqueSpecies, setUniqueSpecies] = useState(new Set());
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [userStats, setUserStats] = useState({ totalDetections: 0, uniqueSpecies: 0, totalFeedback: 0 });
  const [activeTab, setActiveTab] = useState('live');
  const [showSettings, setShowSettings] = useState(false);
  const [showBirdDetail, setShowBirdDetail] = useState(null);
  const [showSessionReport, setShowSessionReport] = useState(null);
  const [filter, setFilter] = useState({ species: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [mapError, setMapError] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null); // { version, downloadUrl, releaseNotes, mandatory }
  const [mapFilter, setMapFilter] = useState('');
  const [mapShowOptions, setMapShowOptions] = useState(false);
  const [mapBaseLayer, setMapBaseLayer] = useState('osm'); // osm | topo | sat | dark
  const [mapHeatmap, setMapHeatmap] = useState(false);
  const [mapTimeRange, setMapTimeRange] = useState('all'); // all | today | 7d | 30d
  const [mapMinConf, setMapMinConf] = useState(0); // 0 | 0.5 | 0.7 | 0.9
  const [refreshing, setRefreshing] = useState(false);
  const [mapFiltersLoaded, setMapFiltersLoaded] = useState(false);
  
  const recordingRef = useRef(null);
  const timerRef = useRef(null);
  const analysisRef = useRef(null);
  const autoStopRef = useRef(null);
  const sessionRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const spectrogramRef = useRef(null);
  const lastDetectionTimesRef = useRef({}); // Temporal dedup: { species: lastTimestamp }
  const mapWebViewRef = useRef(null);
  const playRef = useRef(null);

  // ---- Helper: Fuzzy-Suche (normalisiert + Levenshtein für Tippfehler) ----
  const norm = (s) => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const lev = (a, b, max = 2) => {
    if (a === b) return 0;
    if (Math.abs(a.length - b.length) > max) return max + 1;
    const dp = Array(b.length + 1).fill(0).map((_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      let prev = dp[0]; dp[0] = i; let bestRow = i;
      for (let j = 1; j <= b.length; j++) {
        const tmp = dp[j];
        dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j - 1], dp[j]);
        prev = tmp;
        if (dp[j] < bestRow) bestRow = dp[j];
      }
      if (bestRow > max) return max + 1;
    }
    return dp[b.length];
  };
  const fuzzyHit = (query, fields) => {
    if (!query) return true;
    const nq = norm(query);
    if (!nq) return true;
    for (const f of fields) {
      const nf = norm(f); if (!nf) continue;
      if (nf.includes(nq)) return true;
      if (nq.length >= 4) {
        const tol = Math.max(1, Math.floor(nq.length / 5));
        if (lev(nq, nf, tol) <= tol) return true;
        for (const tok of nf.split(/[\s\-]+/)) {
          if (tok.length >= 3 && lev(nq, tok, tol) <= tol) return true;
        }
      }
    }
    return false;
  };

  // ---- Helper: gespeichertes Audio einer Erkennung abspielen ----
  const playDetectionAudio = async (d) => {
    try {
      if (!d || !d.audioUri) { Alert.alert('Keine Aufnahme', 'Für diese Erkennung wurde kein Audio gespeichert.'); return; }
      if (playRef.current) {
        try { await playRef.current.stopAsync(); await playRef.current.unloadAsync(); } catch {}
        playRef.current = null;
      }
      const { sound } = await Audio.Sound.createAsync({ uri: d.audioUri }, { shouldPlay: true });
      playRef.current = sound;
      sound.setOnPlaybackStatusUpdate((st) => {
        if (st && (st.didJustFinish || st.error)) {
          sound.unloadAsync().catch(() => {});
          if (playRef.current === sound) playRef.current = null;
        }
      });
    } catch (e) { Alert.alert('Wiedergabe fehlgeschlagen', String(e?.message || e)); }
  };

  // ---- Helper: Pull-to-Refresh ----
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await loadData(); } catch {}
    setRefreshing(false);
  }, []);

  // Semver-Vergleich: liefert true, wenn `latest` neuer als `current` ist.
  const isNewerVersion = (current, latest) => {
    if (!current || !latest) return false;
    const a = String(current).split('.').map(n => parseInt(n, 10) || 0);
    const b = String(latest).split('.').map(n => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const x = a[i] || 0, y = b[i] || 0;
      if (y > x) return true;
      if (y < x) return false;
    }
    return false;
  };

  const checkForUpdate = useCallback(async (url) => {
    const backendUrl = url || settings.backendUrl;
    try {
      const r = await fetchWithTimeout(`${backendUrl}/api/v1/mobile/latest-version`, { headers: { 'ngrok-skip-browser-warning': '1' } }, 4000);
      if (!r.ok) return;
      const d = await r.json();
      if (d && d.version && isNewerVersion(APP_VERSION, d.version)) {
        setUpdateInfo({
          version: d.version,
          downloadUrl: d.downloadUrl || 'https://github.com/donapart/Birds/releases/latest',
          releaseNotes: d.releaseNotes || '',
          mandatory: !!d.mandatory,
        });
      } else {
        setUpdateInfo(null);
      }
    } catch (e) { /* still kein Update-Banner zeigen */ }
  }, [settings.backendUrl]);

  const openUpdateUrl = useCallback(() => {
    if (!updateInfo) return;
    const msg = updateInfo.releaseNotes
      ? `Version ${updateInfo.version}\n\n${updateInfo.releaseNotes}`
      : `Version ${updateInfo.version} ist verfügbar.`;
    Alert.alert(
      updateInfo.mandatory ? 'Pflicht-Update' : 'Update verfügbar',
      msg,
      [
        { text: 'Später', style: 'cancel' },
        { text: 'Herunterladen', onPress: () => Linking.openURL(updateInfo.downloadUrl).catch(() => {}) },
      ]
    );
  }, [updateInfo]);

  // Sende Audio-Level an 3D-Spektrogramm WebView
  const updateSpectrogram = useCallback((level) => {
    if (spectrogramRef.current) {
      spectrogramRef.current.postMessage(JSON.stringify({ type: 'level', value: level }));
    }
  }, []);

  const clearSpectrogram = useCallback(() => {
    if (spectrogramRef.current) {
      spectrogramRef.current.postMessage(JSON.stringify({ type: 'clear' }));
    }
  }, []);

  // AppState Listener für Background-Erkennung
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [isStreaming, settings.backgroundRecording]);

  const handleAppStateChange = async (nextAppState) => {
    const wasInBackground = appStateRef.current.match(/inactive|background/);
    const isNowActive = nextAppState === 'active';
    
    if (wasInBackground && isNowActive) {
      // App kommt in den Vordergrund
      setIsInBackground(false);
      console.log('App active - resuming foreground mode');
    } else if (appStateRef.current === 'active' && nextAppState.match(/inactive|background/)) {
      // App geht in den Hintergrund
      setIsInBackground(true);
      console.log('App backgrounded - streaming:', isStreaming, 'bgEnabled:', settings.backgroundRecording);
      
      if (isStreaming && settings.backgroundRecording) {
        // Halte App wach für Hintergrund-Aufnahme
        await activateKeepAwakeAsync('birdsound-recording');
        console.log('Keep-awake activated for background recording');
      }
    }
    
    appStateRef.current = nextAppState;
  };

  useEffect(() => { init(); return cleanup; }, []);
  useEffect(() => { const i = setInterval(checkNetwork, 10000); return () => clearInterval(i); }, []);

  // Map-Filter persistieren (laden in loadData(), speichern bei Änderung)
  useEffect(() => {
    if (!mapFiltersLoaded) return;
    AsyncStorage.setItem('mapPrefs', JSON.stringify({
      mapBaseLayer, mapHeatmap, mapTimeRange, mapMinConf, mapFilter,
    })).catch(() => {});
  }, [mapBaseLayer, mapHeatmap, mapTimeRange, mapMinConf, mapFilter, mapFiltersLoaded]);
  
  // Auto-Reconnect: Prüfe Backend-Verbindung alle 15 Sekunden und reconnecte automatisch
  useEffect(() => {
    const reconnectInterval = setInterval(async () => {
      if (!isConnected) {
        console.log('Auto-reconnect: Checking backend...');
        await checkBackend(settings.backendUrl);
        if (!isConnected) {
          await fetchModels(settings.backendUrl);
        }
      }
    }, 15000);
    return () => clearInterval(reconnectInterval);
  }, [isConnected, settings.backendUrl]);

  const init = async () => {
    const savedUrl = await loadData();
    const url = savedUrl || URL;
    await checkNetwork();
    await checkBackend(url);
    await fetchModels(url);
    checkForUpdate(url);
    if (settings.enableGPS) initGPS();
  };

  const cleanup = () => { stopStreaming(); };

  const loadData = async () => {
    try {
      const [det, stats, queue, sessions, saved, mapPrefsRaw] = await Promise.all([
        AsyncStorage.getItem('detections'), AsyncStorage.getItem('userStats'),
        AsyncStorage.getItem('offlineQueue'), AsyncStorage.getItem('sessionHistory'),
        AsyncStorage.getItem('settings'), AsyncStorage.getItem('mapPrefs'),
      ]);
      if (det) setDetections(JSON.parse(det));
      if (stats) setUserStats(JSON.parse(stats));
      if (queue) setOfflineQueue(JSON.parse(queue));
      if (sessions) setSessionHistory(JSON.parse(sessions));
      let savedUrl = null;
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings(s => ({ ...s, ...parsed }));
        savedUrl = parsed.backendUrl;
      }
      if (mapPrefsRaw) {
        try {
          const mp = JSON.parse(mapPrefsRaw);
          if (mp.mapBaseLayer) setMapBaseLayer(mp.mapBaseLayer);
          if (typeof mp.mapHeatmap === 'boolean') setMapHeatmap(mp.mapHeatmap);
          if (mp.mapTimeRange) setMapTimeRange(mp.mapTimeRange);
          if (typeof mp.mapMinConf === 'number') setMapMinConf(mp.mapMinConf);
          if (typeof mp.mapFilter === 'string') setMapFilter(mp.mapFilter);
        } catch {}
      }
      setMapFiltersLoaded(true);
      return savedUrl;
    } catch (e) { setMapFiltersLoaded(true); return null; }
  };

  const saveData = async (key, data) => { try { await AsyncStorage.setItem(key, JSON.stringify(data)); } catch (e) {} };

  const checkNetwork = async () => {
    try {
      const state = await Network.getNetworkStateAsync();
      setIsOnline(state.isConnected && state.isInternetReachable);
      if (state.isConnected && offlineQueue.length > 0) syncQueue();
    } catch (e) { setIsOnline(false); }
  };

  const fetchWithTimeout = async (url, options = {}, timeout = 5000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      return response;
    } catch (e) {
      clearTimeout(id);
      throw e;
    }
  };

  const checkBackend = async (url) => {
    const backendUrl = url || settings.backendUrl;
    const wasConnected = isConnected;
    try {
      const r = await fetchWithTimeout(`${backendUrl}/health`, { headers: { 'ngrok-skip-browser-warning': '1' } });
      const d = await r.json();
      const nowConnected = d.status === 'healthy';
      setIsConnected(nowConnected);
      // Auto-Reconnect: Lade Modelle wenn Verbindung wiederhergestellt
      if (!wasConnected && nowConnected) {
        console.log('Backend reconnected! Loading models...');
        await fetchModels(backendUrl);
      }
    } catch (e) { setIsConnected(false); console.log('Backend check failed:', e.message); }
  };

  const fetchModels = async (url) => {
    const backendUrl = url || settings.backendUrl;
    try {
      console.log('Fetching models from:', backendUrl);
      const r = await fetchWithTimeout(`${backendUrl}/api/v1/models`, { headers: { 'ngrok-skip-browser-warning': '1' } });
      const d = await r.json();
      console.log('Models response:', d);
      if (d.models) setAvailableModels(d.models);
    } catch (e) { console.log('Fetch models failed:', e.message); }
  };

  const initGPS = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') { 
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }); 
        setLocation(loc.coords);
        
        // Für Background-Recording: Background-Location-Permission anfragen
        if (settings.backgroundRecording) {
          const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
          if (bgStatus === 'granted') {
            console.log('Background location permission granted');
          }
        }
      }
    } catch (e) { console.log('GPS init error:', e); }
  };

  const startStreaming = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Fehler', 'Mikrofon benötigt'); return; }
      
      // Audio-Modus für Background-Recording konfigurieren
      await Audio.setAudioModeAsync({ 
        allowsRecordingIOS: true, 
        playsInSilentModeIOS: true,
        staysActiveInBackground: settings.backgroundRecording,  // WICHTIG für iOS Background
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      
      // Keep-Awake aktivieren wenn Background-Recording aktiv
      if (settings.backgroundRecording) {
        await activateKeepAwakeAsync('birdsound-recording');
        
        // Starte Background-Location-Tracking für kontinuierliche Standort-Updates
        if (settings.enableGPS) {
          const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
          if (bgStatus === 'granted') {
            await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
              accuracy: Location.Accuracy.Balanced,
              timeInterval: 30000,  // Alle 30 Sekunden
              distanceInterval: 50, // Oder alle 50 Meter
              foregroundService: {
                notificationTitle: '🐦 BirdSound aktiv',
                notificationBody: 'Vogelstimmen werden aufgezeichnet...',
                notificationColor: '#51cf66',
              },
            });
          }
        }
      }
      
      const session = { id: Date.now(), startTime: new Date().toISOString(), endTime: null, location, detections: [], speciesCount: {}, totalAnalyzed: 0, modelUsed: settings.selectedModel || 'all' };
      sessionRef.current = session;
      setCurrentSession(session);
      setIsStreaming(true); setStreamTime(0);
      timerRef.current = setInterval(() => setStreamTime(t => t + 0.1), 100);
      
      if (settings.autoStopMinutes > 0) {
        autoStopRef.current = setTimeout(() => { stopStreaming(); Alert.alert('Auto-Stop', `Session nach ${settings.autoStopMinutes} Min beendet`); }, settings.autoStopMinutes * 60 * 1000);
      }
      await startChunk();
      analysisRef.current = setInterval(processChunk, settings.chunkDuration * 1000);
    } catch (e) { Alert.alert('Fehler', e.message); }
  };

  const stopStreaming = async () => {
    setIsStreaming(false);
    [timerRef, analysisRef, autoStopRef].forEach(r => { if (r.current) { clearInterval(r.current); clearTimeout(r.current); r.current = null; } });
    if (recordingRef.current) { try { await recordingRef.current.stopAndUnloadAsync(); } catch (e) {} recordingRef.current = null; }
    
    // Keep-Awake und Background-Location deaktivieren
    deactivateKeepAwake('birdsound-recording');
    try {
      const isTracking = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      if (isTracking) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      }
    } catch (e) { /* Ignore if not tracking */ }
    
    // Spektrogramm zurücksetzen
    clearSpectrogram();
    
    if (sessionRef.current) {
      const final = { ...sessionRef.current, endTime: new Date().toISOString(), duration: streamTime };
      const history = [final, ...sessionHistory].slice(0, 50);
      setSessionHistory(history); saveData('sessionHistory', history);
      setShowSessionReport(final);
      sessionRef.current = null; setCurrentSession(null);
    }
  };

  const startChunk = async () => {
    try {
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY, 
        (s) => { 
          if (s.metering) {
            const level = Math.max(0, (s.metering + 60) * 1.67);
            setAudioLevel(level);
            updateSpectrogram(level);  // 3D-Spektrogramm aktualisieren
          }
        }, 
        50  // Update alle 50ms für flüssige Animation
      );
      recordingRef.current = recording;
    } catch (e) {}
  };

  const processChunk = async () => {
    if (!recordingRef.current) return;
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null; startChunk();
      if (uri) { if (isOnline && isConnected) analyzeChunk(uri); else if (settings.offlineMode) queueOffline(uri); }
    } catch (e) { startChunk(); }
  };

  const analyzeChunk = async (uri) => {
    try {
      const form = new FormData();
      form.append('file', { uri, type: 'audio/m4a', name: 'chunk.m4a' });
      form.append('device_id', Constants.sessionId || 'mobile-app');
      if (location) {
        form.append('latitude', String(location.latitude));
        form.append('longitude', String(location.longitude));
      }
      if (settings.selectedModel) form.append('model', settings.selectedModel);
      
      // Audio Enhancement Settings
      const ae = settings.audioEnhancement || {};
      if (ae.preset) {
        form.append('enhancement_preset', ae.preset);
      } else {
        // Individual settings
        if (ae.bandpassEnabled) form.append('bandpass_enabled', 'true');
        if (ae.noiseReductionEnabled) form.append('noise_reduction_enabled', 'true');
        if (ae.autoGainEnabled) form.append('auto_gain_enabled', 'true');
        if (ae.spectralGateEnabled) form.append('spectral_gate_enabled', 'true');
        if (ae.highpassEnabled) form.append('highpass_enabled', 'true');
        if (ae.bandpassLowFreq) form.append('bandpass_low_freq', String(ae.bandpassLowFreq));
        if (ae.bandpassHighFreq) form.append('bandpass_high_freq', String(ae.bandpassHighFreq));
        if (ae.noiseReductionStrength) form.append('noise_reduction_strength', String(ae.noiseReductionStrength));
        if (ae.autoGainTargetDb) form.append('auto_gain_target_db', String(ae.autoGainTargetDb));
        if (ae.spectralGateThresholdDb) form.append('spectral_gate_threshold_db', String(ae.spectralGateThresholdDb));
        if (ae.highpassFreq) form.append('highpass_freq', String(ae.highpassFreq));
      }
      
      const r = await fetch(`${settings.backendUrl}/api/v1/predict/upload`, { 
        method: 'POST', 
        headers: { 'ngrok-skip-browser-warning': '1' }, 
        body: form 
      });
      const result = await r.json();
      if (sessionRef.current) sessionRef.current.totalAnalyzed++;
      if (result.predictions?.length > 0) processDet(result.predictions, uri, result.consensus, result.audio_enhancement);
    } catch (e) { console.log('Analysis error:', e); }
  };

  const processDet = (preds, uri, consensus, audioEnhancement) => {
    const ts = new Date();
    const newDets = preds
      .filter(p => p.confidence >= settings.minConfidence)
      .filter(p => isPlausibleEuropean(p.common_name || p.species))
      .slice(0, 5)
      .map(p => {
        const rawName = p.common_name || p.species;
        const resolved = resolveSpecies(rawName, p.scientific_name);
        const sp = resolved.german;
        const bird = BIRD_LIBRARY[sp] || {};
        return {
          id: Date.now() + Math.random(),
          species: sp,
          scientific: resolved.scientific,
          scientificName: resolved.scientific,
          englishName: resolved.english,
          germanName: resolved.german,
          rawApiName: rawName,
          family: resolved.family || bird.family || '',
          order: resolved.order || bird.order || '',
          confidence: p.confidence,
          time: ts.toISOString(),
          location: location ? { lat: location.latitude, lng: location.longitude, accuracy: location.accuracy ?? null, altitude: location.altitude ?? null } : null,
          audioUri: uri,
          feedback: null,
          model: p.model || 'unknown',
          consensus,
          audioEnhancement,
          ...bird,
          icon: resolved.icon || bird.icon || '🐦',
          _inLibrary: resolved.inLibrary,
        };
      })
      .filter(d => isIndependentDetection(d.species, ts, lastDetectionTimesRef.current, 30))
      .filter(d => {
        // Smarter Filter: Library-Arten immer zeigen
        if (d._inLibrary) return true;
        // Unbekannte Arten: nur bei hoher Konfidenz UND plausiblem Namen (kein BirdNET-Code)
        if (d.confidence >= 0.5 && d.species && d.species.includes(' ')) return true;
        return false;
      });
    
    // Update temporal dedup timestamps
    newDets.forEach(d => { lastDetectionTimesRef.current[d.species] = d.time; });
    
    if (newDets.length > 0) {
      const updated = [...newDets, ...detections].slice(0, 1000);
      setDetections(updated); saveData('detections', updated);
      const species = new Set([...uniqueSpecies, ...newDets.map(d => d.species)]);
      setUniqueSpecies(species);
      const stats = { ...userStats, totalDetections: userStats.totalDetections + newDets.length, uniqueSpecies: species.size };
      setUserStats(stats); saveData('userStats', stats);
      if (sessionRef.current) {
        sessionRef.current.detections.push(...newDets);
        newDets.forEach(d => { sessionRef.current.speciesCount[d.species] = (sessionRef.current.speciesCount[d.species] || 0) + 1; });
      }
    }
  };

  const queueOffline = async (uri) => { const q = [...offlineQueue, { uri, time: new Date().toISOString(), location }]; setOfflineQueue(q); saveData('offlineQueue', q); };
  const syncQueue = async () => { for (const item of offlineQueue) { try { await analyzeChunk(item.uri); } catch (e) {} } setOfflineQueue([]); saveData('offlineQueue', []); };
  const submitFeedback = (id, correct) => { const u = detections.map(d => d.id === id ? { ...d, feedback: correct } : d); setDetections(u); saveData('detections', u); const s = { ...userStats, totalFeedback: userStats.totalFeedback + 1 }; setUserStats(s); saveData('userStats', s); };
  const shareDetection = async (d) => { try { await Share.share({ message: `🐦 ${d.species} (${d.scientific || ''}) erkannt! ${Math.round(d.confidence*100)}% #BirdSound` }); } catch(e) { Alert.alert('Fehler', 'Teilen fehlgeschlagen: ' + e.message); } };

  const shareStats = async () => {
    try {
      const uniqueCount = (userStats?.uniqueSpecies && Array.isArray(userStats.uniqueSpecies))
        ? userStats.uniqueSpecies.length
        : (uniqueSpecies?.size || 0);
      const totalDet = userStats?.totalDetections ?? detections.length;
      const top = Object.entries(detections.reduce((acc, d) => { acc[d.species] = (acc[d.species] || 0) + 1; return acc; }, {}))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([s, n], i) => `${i + 1}. ${s} (${n}×)`)
        .join('\n');
      const message =
        `🐦 BirdSound Statistik\n\n` +
        `${rank.icon} ${rank.name} • ${points} Punkte\n` +
        `🎯 ${totalDet} Erkennungen\n` +
        `🪶 ${uniqueCount} verschiedene Arten\n` +
        `📊 ${sessionHistory.length} Sessions\n` +
        (top ? `\n🏆 Top-Arten:\n${top}\n` : '') +
        `\nApp: BirdSound v${APP_VERSION}\n#BirdSound #Vogelbeobachtung`;
      await Share.share({ title: 'BirdSound Statistik', message });
    } catch (e) {
      Alert.alert('Fehler', 'Teilen fehlgeschlagen: ' + e.message);
    }
  };
  const exportKML = async () => {
    try {
      const dets = detections.filter(d => d.location);
      if (!dets.length) { Alert.alert('Keine GPS-Daten', 'Aktiviere GPS in den Einstellungen für KML-Export.'); return; }
      const kml = `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>BirdSound Erkennungen</name><description>Exportiert am ${new Date().toLocaleDateString('de-DE')}</description>${dets.map(d => `<Placemark><name>${d.species}${d.scientific ? ` (${d.scientific})` : ''}</name><description>Konfidenz: ${Math.round(d.confidence*100)}%, Modell: ${d.model||'?'}, Zeit: ${new Date(d.time).toLocaleTimeString('de-DE')}</description><TimeStamp><when>${d.time}</when></TimeStamp><Point><coordinates>${d.location.lng},${d.location.lat},0</coordinates></Point></Placemark>`).join('')}</Document></kml>`;
      const p = `${FileSystem.documentDirectory}birdsound_export.kml`;
      await FileSystem.writeAsStringAsync(p, kml);
      await Sharing.shareAsync(p, { mimeType: 'application/vnd.google-earth.kml+xml', dialogTitle: 'KML exportieren' });
    } catch(e) { Alert.alert('Export-Fehler', 'KML-Export fehlgeschlagen: ' + e.message); }
  };
  const exportJSON = async () => {
    try {
      const p = `${FileSystem.documentDirectory}birdsound_export.json`;
      await FileSystem.writeAsStringAsync(p, JSON.stringify({ meta: { generator: `BirdSound v${APP_VERSION}`, developer: 'Dano Schönwald', exportDate: new Date().toISOString() }, stats: userStats, detections: detections.map(d => ({ species: d.species, scientific: d.scientific, englishName: d.englishName, confidence: d.confidence, time: d.time, location: d.location, model: d.model })), sessions: sessionHistory.map(s => ({ id: s.id, startTime: s.startTime, endTime: s.endTime, duration: s.duration, speciesCount: s.speciesCount, totalDetections: s.detections?.length || 0, totalAnalyzed: s.totalAnalyzed })) }, null, 2));
      await Sharing.shareAsync(p, { mimeType: 'application/json', dialogTitle: 'JSON exportieren' });
    } catch(e) { Alert.alert('Export-Fehler', 'JSON-Export fehlgeschlagen: ' + e.message); }
  };

  // CSV-Export aller Erkennungen (Excel-DE-kompatibel: ; als Trenner, BOM)
  const csvEsc = (v) => {
    const s = v == null ? '' : String(v);
    if (/[;"\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const exportCSV = async () => {
    try {
      if (!detections.length) { Alert.alert('Keine Daten', 'Es gibt noch keine Erkennungen zum Export.'); return; }
      const header = ['species','scientific','english','confidence','time','lat','lng','accuracy','altitude','model'];
      const rows = detections.map(d => [
        csvEsc(d.species), csvEsc(d.scientific), csvEsc(d.englishName),
        csvEsc((d.confidence ?? 0).toFixed(4)),
        csvEsc(d.time),
        csvEsc(d.location?.lat ?? ''), csvEsc(d.location?.lng ?? ''),
        csvEsc(d.location?.accuracy ?? ''), csvEsc(d.location?.altitude ?? ''),
        csvEsc(d.model ?? ''),
      ].join(';'));
      const csv = '\uFEFF' + header.join(';') + '\n' + rows.join('\n');
      const p = `${FileSystem.documentDirectory}birdsound_export.csv`;
      await FileSystem.writeAsStringAsync(p, csv);
      await Sharing.shareAsync(p, { mimeType: 'text/csv', dialogTitle: 'CSV exportieren' });
    } catch(e) { Alert.alert('Export-Fehler', 'CSV-Export fehlgeschlagen: ' + e.message); }
  };
  
  const calcShannon = (c) => { const v = Object.values(c || {}); if (!v.length) return 0; const t = v.reduce((a,b)=>a+b,0); return -v.reduce((s,n) => { const p=n/t; return s+(p>0?p*Math.log(p):0); },0); };
  const calcSimpson = (c) => { const v = Object.values(c || {}); if (!v.length) return 0; const t = v.reduce((a,b)=>a+b,0); return 1-(v.reduce((s,n)=>s+(n*(n-1)),0)/(t*(t-1)||1)); };
  
  const exportSessionReport = async (session, format = 'html') => {
    try {
      if (format === 'kml') {
        const kml = generateSessionKML(session);
        if (!kml) {
          const total = session.detections?.length || 0;
          const withGps = (session.detections || []).filter(d => d.location && typeof d.location.lat === 'number' && typeof d.location.lng === 'number').length;
          Alert.alert(
            'Keine GPS-Daten',
            total === 0
              ? 'Diese Session enthält keine Erkennungen.'
              : `Keine Erkennung mit Standortdaten gefunden (${withGps}/${total}).\n\nAktiviere GPS in den Einstellungen und erlaube Standortzugriff, dann werden neue Sessions GPS-fähig.`
          );
          return;
        }
        const p = `${FileSystem.documentDirectory}session_${session.id}.kml`;
        await FileSystem.writeAsStringAsync(p, kml);
        await Sharing.shareAsync(p, { mimeType: 'application/vnd.google-earth.kml+xml', dialogTitle: 'Session KML exportieren' });
      } else if (format === 'json') {
        const json = generateSessionJSON(session);
        const p = `${FileSystem.documentDirectory}session_${session.id}.json`;
        await FileSystem.writeAsStringAsync(p, json);
        await Sharing.shareAsync(p, { mimeType: 'application/json', dialogTitle: 'Session JSON exportieren' });
      } else if (format === 'csv') {
        const dets = session.detections || [];
        if (!dets.length) { Alert.alert('Keine Daten', 'Diese Session enthält keine Erkennungen.'); return; }
        const header = ['species','scientific','english','confidence','time','lat','lng','accuracy','altitude','model'];
        const rows = dets.map(d => [
          csvEsc(d.species), csvEsc(d.scientific), csvEsc(d.englishName),
          csvEsc((d.confidence ?? 0).toFixed(4)),
          csvEsc(d.time),
          csvEsc(d.location?.lat ?? ''), csvEsc(d.location?.lng ?? ''),
          csvEsc(d.location?.accuracy ?? ''), csvEsc(d.location?.altitude ?? ''),
          csvEsc(d.model ?? ''),
        ].join(';'));
        const csv = '\uFEFF' + header.join(';') + '\n' + rows.join('\n');
        const p = `${FileSystem.documentDirectory}session_${session.id}.csv`;
        await FileSystem.writeAsStringAsync(p, csv);
        await Sharing.shareAsync(p, { mimeType: 'text/csv', dialogTitle: 'Session CSV exportieren' });
      } else {
        // HTML Feldbericht (druckbar)
        const html = generateFieldReport(session, { appVersion: APP_VERSION, observerName: 'Dano Schönwald' });
        const p = `${FileSystem.documentDirectory}feldbericht_${session.id}.html`;
        await FileSystem.writeAsStringAsync(p, html);
        await Sharing.shareAsync(p, { mimeType: 'text/html', dialogTitle: 'Feldbericht exportieren' });
      }
    } catch(e) { Alert.alert('Export-Fehler', 'Export fehlgeschlagen: ' + e.message); }
  };

  const deleteSession = (session) => {
    const hasDetections = (session.detections?.length || 0) > 0;
    const title = hasDetections ? '🗑️ Session löschen?' : '🗑️ Leere Session verwerfen?';
    const msg = hasDetections 
      ? `Diese Session vom ${new Date(session.startTime).toLocaleDateString('de-DE')} mit ${session.detections.length} Erkennungen wirklich löschen?`
      : `Diese Session ohne Erkennungen verwerfen?`;
    
    Alert.alert(title, msg, [
      { text: 'Abbrechen', style: 'cancel' },
      { text: hasDetections ? 'Löschen' : 'Verwerfen', style: 'destructive', onPress: () => {
        const updated = sessionHistory.filter(s => s.id !== session.id);
        setSessionHistory(updated);
        saveData('sessionHistory', updated);
        setShowSessionReport(null);
      }}
    ]);
  };

  const filtered = detections.filter(d => !filter.species || d.species.toLowerCase().includes(filter.species.toLowerCase()));
  const { unlocked, locked } = calculateUnlockedAchievements({ ...userStats, uniqueSpecies: uniqueSpecies.size, hasOwl: detections.some(d => ['Waldkauz','Uhu'].includes(d.species)), hasWoodpecker: detections.some(d => ['Buntspecht','Grünspecht'].includes(d.species)), hasRaptor: detections.some(d => ['Mäusebussard','Turmfalke'].includes(d.species)), hasNightingale: detections.some(d => d.species === 'Nachtigall'), hasCuckoo: detections.some(d => d.species === 'Kuckuck') });
  const points = calculateTotalPoints(userStats);
  const rank = getRank(points);
  const fmt = (s) => `${Math.floor(s/60).toString().padStart(2,'0')}:${Math.floor(s%60).toString().padStart(2,'0')}`;
  const cc = (c) => c >= 0.8 ? '#51cf66' : c >= 0.5 ? '#ffd43b' : '#ff6b6b';
  const sbh = Platform.OS === 'android' ? Constants.statusBarHeight : 0;

  const detWithLocation = detections.filter(d => d.location);
  const mapRegion = detWithLocation.length > 0 ? {
    latitude: detWithLocation[0].location.lat,
    longitude: detWithLocation[0].location.lng,
    latitudeDelta: 0.02, longitudeDelta: 0.02
  } : location ? { latitude: location.latitude, longitude: location.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 } : { latitude: 52.52, longitude: 13.405, latitudeDelta: 0.5, longitudeDelta: 0.5 };

  return (
    <View style={z.c}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a15" />
      <View style={{ height: sbh, backgroundColor: '#0a0a15' }} />
      <View style={z.h}><View style={{flex: 1}}><Text style={z.t}>🐦 BirdSound v{APP_VERSION}</Text>{updateInfo ? (<TouchableOpacity onPress={openUpdateUrl} style={z.upd}><Text style={z.updT}>🔄 Update {updateInfo.version} verfügbar — antippen</Text></TouchableOpacity>) : null}<Text style={z.st}>{rank.icon} {rank.name} • {points}P</Text></View><View style={z.hr}><View style={[z.bg, isConnected ? z.bgG : z.bgR]}><Text style={z.bgT}>{isConnected ? '🟢' : '🔴'}{offlineQueue.length > 0 ? ` (${offlineQueue.length})` : ''}</Text></View><TouchableOpacity onPress={() => setShowSettings(true)}><Text style={z.ic}>⚙️</Text></TouchableOpacity></View></View>
      <View style={z.tb}>{[['live','🎙️'],['map','🗺️'],['list','📋'],['library','📚'],['sessions','📊'],['achieve','🏆']].map(([id,ic]) => (<TouchableOpacity key={id} style={[z.ta, activeTab===id && z.taA]} onPress={() => setActiveTab(id)}><Text style={z.taI}>{ic}</Text></TouchableOpacity>))}</View>

      {activeTab === 'live' && (<ScrollView style={z.ct}>
        <View style={z.mb}><Text style={z.ml}>🤖</Text><Text style={z.mn}>{settings.selectedModel || 'Alle Modelle'}</Text><Text style={z.mc}>{availableModels.length} verfügbar</Text></View>
        <View style={z.cd}>
          <TouchableOpacity onPress={() => isStreaming ? stopStreaming() : startStreaming()} disabled={!isOnline && !settings.offlineMode}>
            <View style={[z.bt, isStreaming && z.btA]}><Text style={z.btI}>{isStreaming ? '⏹️' : '▶️'}</Text><Text style={z.btL}>{isStreaming ? 'STOP' : 'START'}</Text></View>
          </TouchableOpacity>
          <Text style={z.tm}>{fmt(streamTime)}</Text>
          {settings.autoStopMinutes > 0 && <Text style={z.as}>Auto-Stop: {settings.autoStopMinutes}min</Text>}
          {location && <Text style={z.gp}>📍 {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</Text>}
        </View>
        
        {/* 3D Spektrogramm (Wasserfall-Diagramm) */}
        <View style={z.spectrogram}>
          <View style={z.spectrogramHeader}>
            <Text style={z.cdT}>🌊 3D-Spektrogramm</Text>
            <TouchableOpacity style={z.spectrogramReset} onPress={clearSpectrogram}><Text style={z.spectrogramResetT}>↺</Text></TouchableOpacity>
          </View>
          <View style={z.spectrogramContainer}>
            <WebView
              ref={spectrogramRef}
              source={{ html: SPECTROGRAM_HTML }}
              style={z.spectrogramView}
              scrollEnabled={false}
              bounces={false}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              originWhitelist={['*']}
              onMessage={() => {}}
              injectedJavaScript="window.ReactNativeWebView = window.ReactNativeWebView || {postMessage: function(){}}; true;"
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
            />
            {!isStreaming && (
              <View style={z.spectrogramOverlay}>
                <Text style={z.spectrogramHint}>▶️ Starte Aufnahme für Live-Visualisierung</Text>
                <Text style={z.spectrogramSubHint}>Touch: Drehen • Pinch: Zoom</Text>
              </View>
            )}
          </View>
          <View style={z.freqLabels}>
            <Text style={[z.freqLabel, { color: '#4ecdc4' }]}>1kHz</Text>
            <Text style={[z.freqLabel, { color: '#51cf66' }]}>2kHz</Text>
            <Text style={[z.freqLabel, { color: '#ffd43b' }]}>4kHz</Text>
            <Text style={[z.freqLabel, { color: '#ff6b6b' }]}>8kHz</Text>
          </View>
        </View>

        <View style={z.cd}><Text style={z.cdT}>🎵 Erkennungen</Text>
          {detections.slice(0, 5).map(d => (<TouchableOpacity key={d.id} style={z.dt} onPress={() => setShowBirdDetail(d)}><Text style={z.dtI}>{BIRD_LIBRARY[d.species]?.icon || '🐦'}</Text><View style={z.dtC}><Text style={z.dtS}>{d.species}</Text><Text style={z.dtSc}>{d.scientific}</Text></View><Text style={[z.dtP, { color: cc(d.confidence) }]}>{Math.round(d.confidence*100)}%</Text></TouchableOpacity>))}
          {!detections.length && <Text style={z.em}>Starte Streaming...</Text>}
        </View>
        <View style={z.ss}><View style={z.sst}><Text style={z.ssV}>{detections.length}</Text><Text style={z.ssL}>Erkennungen</Text></View><View style={z.sst}><Text style={z.ssV}>{uniqueSpecies.size}</Text><Text style={z.ssL}>Arten</Text></View><View style={z.sst}><Text style={z.ssV}>{sessionHistory.length}</Text><Text style={z.ssL}>Sessions</Text></View></View>
      </ScrollView>)}

      {activeTab === 'map' && (<View style={z.mapC}>
        <View style={z.mapFilterBar}>
          <TextInput
            style={z.mapFilterInput}
            placeholder="🔍 Art filtern..."
            placeholderTextColor="#888"
            value={mapFilter}
            onChangeText={(t) => {
              setMapFilter(t);
              if (mapWebViewRef.current) {
                mapWebViewRef.current.postMessage(JSON.stringify({ type: 'options', filter: t, baseLayer: mapBaseLayer, heatmap: mapHeatmap, timeRange: mapTimeRange, minConf: mapMinConf }));
              }
            }}
          />
          {mapFilter ? (<TouchableOpacity onPress={() => { setMapFilter(''); if (mapWebViewRef.current) mapWebViewRef.current.postMessage(JSON.stringify({ type: 'options', filter: '', baseLayer: mapBaseLayer, heatmap: mapHeatmap, timeRange: mapTimeRange, minConf: mapMinConf })); }}><Text style={z.mapFilterClear}>✕</Text></TouchableOpacity>) : null}
          <TouchableOpacity onPress={() => setMapShowOptions(v => !v)} style={z.mapOptT}><Text style={z.mapOptTT}>{mapShowOptions ? '▲' : '⚙️'}</Text></TouchableOpacity>
        </View>
        {mapShowOptions && (<View style={z.mapOpts}>
          <Text style={z.mapOptLbl}>Karte</Text>
          <View style={z.mapOptRow}>
            {[['osm','Standard'],['topo','Topo'],['sat','Satellit'],['dark','Dunkel']].map(([k,l]) => (
              <TouchableOpacity key={k} style={[z.mapChip, mapBaseLayer===k && z.mapChipA]} onPress={() => { setMapBaseLayer(k); mapWebViewRef.current && mapWebViewRef.current.postMessage(JSON.stringify({ type: 'options', filter: mapFilter, baseLayer: k, heatmap: mapHeatmap, timeRange: mapTimeRange, minConf: mapMinConf })); }}><Text style={[z.mapChipT, mapBaseLayer===k && z.mapChipTA]}>{l}</Text></TouchableOpacity>
            ))}
          </View>
          <Text style={z.mapOptLbl}>Zeitraum</Text>
          <View style={z.mapOptRow}>
            {[['all','Alle'],['today','Heute'],['7d','7 Tage'],['30d','30 Tage']].map(([k,l]) => (
              <TouchableOpacity key={k} style={[z.mapChip, mapTimeRange===k && z.mapChipA]} onPress={() => { setMapTimeRange(k); mapWebViewRef.current && mapWebViewRef.current.postMessage(JSON.stringify({ type: 'options', filter: mapFilter, baseLayer: mapBaseLayer, heatmap: mapHeatmap, timeRange: k, minConf: mapMinConf })); }}><Text style={[z.mapChipT, mapTimeRange===k && z.mapChipTA]}>{l}</Text></TouchableOpacity>
            ))}
          </View>
          <Text style={z.mapOptLbl}>Min. Konfidenz</Text>
          <View style={z.mapOptRow}>
            {[[0,'0%'],[0.5,'50%'],[0.7,'70%'],[0.9,'90%']].map(([k,l]) => (
              <TouchableOpacity key={String(k)} style={[z.mapChip, mapMinConf===k && z.mapChipA]} onPress={() => { setMapMinConf(k); mapWebViewRef.current && mapWebViewRef.current.postMessage(JSON.stringify({ type: 'options', filter: mapFilter, baseLayer: mapBaseLayer, heatmap: mapHeatmap, timeRange: mapTimeRange, minConf: k })); }}><Text style={[z.mapChipT, mapMinConf===k && z.mapChipTA]}>{l}</Text></TouchableOpacity>
            ))}
          </View>
          <View style={z.mapOptRow}>
            <TouchableOpacity style={[z.mapChip, mapHeatmap && z.mapChipA]} onPress={() => { const h = !mapHeatmap; setMapHeatmap(h); mapWebViewRef.current && mapWebViewRef.current.postMessage(JSON.stringify({ type: 'options', filter: mapFilter, baseLayer: mapBaseLayer, heatmap: h, timeRange: mapTimeRange, minConf: mapMinConf })); }}><Text style={[z.mapChipT, mapHeatmap && z.mapChipTA]}>🔥 Heatmap</Text></TouchableOpacity>
            <TouchableOpacity style={z.mapChip} onPress={() => mapWebViewRef.current && mapWebViewRef.current.postMessage(JSON.stringify({ type: 'locate' }))}><Text style={z.mapChipT}>📍 Standort</Text></TouchableOpacity>
            <TouchableOpacity style={z.mapChip} onPress={() => mapWebViewRef.current && mapWebViewRef.current.postMessage(JSON.stringify({ type: 'fit' }))}><Text style={z.mapChipT}>🔍 Alle zeigen</Text></TouchableOpacity>
          </View>
        </View>)}
        <WebView
          ref={mapWebViewRef}
          style={z.map}
          originWhitelist={['*']}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          onMessage={(event) => {
            try {
              const msg = JSON.parse(event.nativeEvent.data);
              if (msg.type === 'delete' && msg.id != null) {
                Alert.alert(
                  '🗑️ Erkennung löschen?',
                  `${msg.species || 'Erkennung'} wirklich von der Karte entfernen?`,
                  [
                    { text: 'Abbrechen', style: 'cancel' },
                    {
                      text: 'Löschen', style: 'destructive', onPress: () => {
                        setDetections(prev => {
                          const next = prev.filter(d => String(d.id) !== String(msg.id));
                          saveData('detections', next);
                          return next;
                        });
                      }
                    }
                  ]
                );
              }
            } catch (e) { /* ignore */ }
          }}
          source={{ html: `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
  <script src="https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js"></script>
  <style>
    body { margin: 0; padding: 0; }
    #map { width: 100%; height: 100vh; background: #1a1a2e; }
    .bird-marker { background: rgba(78, 205, 196, 0.9); border-radius: 50%; padding: 8px; font-size: 20px; text-align: center; border: 2px solid #fff; box-shadow: 0 2px 10px rgba(0,0,0,0.3); }
    .leaflet-popup-content { text-align: center; min-width: 160px; }
    .popup-title { font-weight: bold; color: #222; font-size: 14px; }
    .popup-sci { color: #666; font-style: italic; font-size: 11px; }
    .popup-conf { color: #4ecdc4; font-weight: 600; margin-top: 4px; }
    .popup-time { color: #888; font-size: 10px; margin-top: 2px; }
    .popup-del { background: #ff6b6b; color: #fff; border: none; border-radius: 6px; padding: 6px 10px; margin-top: 8px; font-size: 12px; cursor: pointer; width: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var allDetections = ${JSON.stringify(detWithLocation.map(d => ({
      id: d.id,
      lat: d.location?.lat || 0,
      lng: d.location?.lng || 0,
      species: d.species,
      scientific: d.scientific || '',
      confidence: d.confidence,
      time: d.time,
      icon: BIRD_LIBRARY[d.species]?.icon || '🐦'
    })))};
    var userLat = ${location?.latitude || 51.5};
    var userLng = ${location?.longitude || 10.0};
    var currentFilter = '';
    var currentTimeRange = 'all';
    var currentMinConf = 0;
    var heatmapOn = false;
    var heatLayer = null;

    var map = L.map('map').setView([userLat, userLng], 10);

    var baseLayers = {
      osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap', maxZoom: 19 }),
      topo: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { attribution: '© OpenTopoMap', maxZoom: 17 }),
      sat: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: '© Esri', maxZoom: 19 }),
      dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', { attribution: '© CARTO', maxZoom: 19, subdomains: 'abcd' })
    };
    var currentBaseKey = 'osm';
    baseLayers.osm.addTo(map);
    function setBaseLayer(key) {
      if (!baseLayers[key] || key === currentBaseKey) return;
      map.removeLayer(baseLayers[currentBaseKey]);
      baseLayers[key].addTo(map);
      currentBaseKey = key;
    }

    var userMarker = L.circleMarker([userLat, userLng], {
      radius: 10, fillColor: '#4ecdc4', color: '#fff', weight: 2, fillOpacity: 0.8
    }).addTo(map).bindPopup('📍 Dein Standort');

    var clusterGroup = L.markerClusterGroup({
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      maxClusterRadius: 40,
      zoomToBoundsOnClick: true,
      spiderfyDistanceMultiplier: 1.4
    });
    map.addLayer(clusterGroup);

    function escapeHtml(s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
        return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
      });
    }

    function buildPopup(d) {
      var safeId = escapeHtml(d.id);
      var safeSpec = escapeHtml(d.species);
      var safeSci = d.scientific ? '<div class="popup-sci">' + escapeHtml(d.scientific) + '</div>' : '';
      var time = d.time ? new Date(d.time).toLocaleString() : '';
      return '<div class="popup-title">' + safeSpec + '</div>'
        + safeSci
        + '<div class="popup-conf">' + Math.round((d.confidence||0)*100) + '%</div>'
        + '<div class="popup-time">' + escapeHtml(time) + '</div>'
        + '<button class="popup-del" onclick="(function(){if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(JSON.stringify({type:\\'delete\\',id:\\'' + safeId + '\\',species:\\'' + safeSpec + '\\'}));}})()">🗑️ Entfernen</button>';
    }

    function timeCutoff(range) {
      var now = Date.now();
      if (range === 'today') { var d = new Date(); d.setHours(0,0,0,0); return d.getTime(); }
      if (range === '7d') return now - 7*24*3600*1000;
      if (range === '30d') return now - 30*24*3600*1000;
      return 0;
    }

    function getVisible() {
      var filterLow = currentFilter.trim().toLowerCase();
      var cutoff = timeCutoff(currentTimeRange);
      return allDetections.filter(function(d) {
        if (!d.lat || !d.lng) return false;
        if (currentMinConf && (d.confidence || 0) < currentMinConf) return false;
        if (cutoff && d.time && new Date(d.time).getTime() < cutoff) return false;
        if (!filterLow) return true;
        return (d.species && d.species.toLowerCase().indexOf(filterLow) !== -1)
          || (d.scientific && d.scientific.toLowerCase().indexOf(filterLow) !== -1);
      });
    }

    var lastBounds = [];
    function rebuildMarkers(autoFit) {
      clusterGroup.clearLayers();
      if (heatLayer) { map.removeLayer(heatLayer); heatLayer = null; }
      var visible = getVisible();
      var bounds = [];
      if (heatmapOn && L.heatLayer) {
        var pts = visible.map(function(d){ return [d.lat, d.lng, Math.max(0.2, d.confidence||0.5)]; });
        heatLayer = L.heatLayer(pts, { radius: 28, blur: 22, maxZoom: 15 }).addTo(map);
        visible.forEach(function(d){ bounds.push([d.lat, d.lng]); });
      } else {
        visible.forEach(function(d) {
          var icon = L.divIcon({ className: '', html: '<div class="bird-marker">' + (d.icon || '🐦') + '</div>', iconSize: [40, 40], iconAnchor: [20, 20] });
          var m = L.marker([d.lat, d.lng], { icon: icon });
          m.bindPopup(buildPopup(d));
          clusterGroup.addLayer(m);
          bounds.push([d.lat, d.lng]);
        });
      }
      lastBounds = bounds;
      if (autoFit && bounds.length > 0) {
        try { map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 }); } catch(e) {}
      }
    }

    rebuildMarkers(true);

    function onFilterMessage(ev) {
      try {
        var data = JSON.parse(ev.data || ev.detail || '{}');
        if (data.type === 'options') {
          currentFilter = data.filter || '';
          currentTimeRange = data.timeRange || 'all';
          currentMinConf = data.minConf || 0;
          if (data.baseLayer) setBaseLayer(data.baseLayer);
          heatmapOn = !!data.heatmap;
          rebuildMarkers(false);
        } else if (data.type === 'filter') {
          currentFilter = data.value || '';
          rebuildMarkers(false);
        } else if (data.type === 'locate') {
          map.setView([userLat, userLng], 14);
        } else if (data.type === 'fit') {
          if (lastBounds.length > 0) { try { map.fitBounds(lastBounds, { padding: [60,60], maxZoom: 15 }); } catch(e) {} }
        }
      } catch(e) {}
    }
    document.addEventListener('message', onFilterMessage);
    window.addEventListener('message', onFilterMessage);
  </script>
</body>
</html>
          ` }}
        />
        <View style={z.mapO}>
          <Text style={z.mapSt}>📍 {detWithLocation.length} Fundorte{mapFilter ? ' • Filter aktiv' : ''}</Text>
          <TouchableOpacity style={z.mapB} onPress={exportKML}><Text style={z.mapBT}>🌍 KML Export</Text></TouchableOpacity>
        </View>
      </View>)}

      {activeTab === 'list' && (<View style={z.ct}>
        <View style={z.fR}><TextInput style={z.se} placeholder="Suchen..." placeholderTextColor="#666" value={filter.species} onChangeText={t => setFilter({...filter, species: t})} /><TouchableOpacity style={z.fB} onPress={exportKML}><Text>📤</Text></TouchableOpacity></View>
        <FlatList data={filtered} keyExtractor={i => i.id.toString()} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4ecdc4" colors={["#4ecdc4"]} />} renderItem={({ item: d }) => (
          <View style={z.li}><TouchableOpacity style={z.lm} onPress={() => setShowBirdDetail(d)}><Text style={z.lIc}>{BIRD_LIBRARY[d.species]?.icon || '🐦'}</Text><View style={z.lIn}><Text style={z.lSp}>{d.species}</Text><Text style={z.lMt}>{new Date(d.time).toLocaleString()} {d.location ? `📍${d.location.accuracy ? ` ±${Math.round(d.location.accuracy)}m` : ''}` : ''} • {d.model}</Text></View><Text style={[z.lCf, { color: cc(d.confidence) }]}>{Math.round(d.confidence*100)}%</Text></TouchableOpacity>
          <View style={z.fb}>{d.audioUri ? <TouchableOpacity style={z.fbB} onPress={() => playDetectionAudio(d)}><Text>▶️</Text></TouchableOpacity> : null}<TouchableOpacity style={[z.fbB, d.feedback === true && z.fbA]} onPress={() => submitFeedback(d.id, true)}><Text>👍</Text></TouchableOpacity><TouchableOpacity style={[z.fbB, d.feedback === false && z.fbA]} onPress={() => submitFeedback(d.id, false)}><Text>👎</Text></TouchableOpacity><TouchableOpacity style={z.fbB} onPress={() => shareDetection(d)}><Text>📤</Text></TouchableOpacity></View></View>
        )} />
      </View>)}

      {activeTab === 'library' && (<View style={z.ct}>
        <TextInput style={z.se} placeholder="Vogel suchen..." placeholderTextColor="#666" value={searchQuery} onChangeText={setSearchQuery} />
        <FlatList data={Object.entries(BIRD_LIBRARY).filter(([k, b]) => fuzzyHit(searchQuery, [k, b?.germanName, b?.scientificName, b?.englishName, b?.family]))} keyExtractor={([k]) => k} renderItem={({ item: [key, bird] }) => (
          <TouchableOpacity style={z.lb} onPress={() => setShowBirdDetail(bird)}><Text style={z.lbI}>{bird.icon || '🐦'}</Text><View style={z.lbC}><Text style={z.lbN}>{bird.germanName || key}</Text><Text style={z.lbS}>{bird.scientificName}</Text><Text style={z.lbF}>{bird.family}</Text></View><Text style={z.lbR}>{'⭐'.repeat(bird.rarity || 1)}</Text></TouchableOpacity>
        )} />
      </View>)}

      {activeTab === 'sessions' && (<ScrollView style={z.ct} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4ecdc4" colors={["#4ecdc4"]} />}>
        <Text style={z.sc}>📊 Sessions ({sessionHistory.length})</Text>
        {sessionHistory.map(s => (<View key={s.id} style={z.sC}>
          <TouchableOpacity onPress={() => setShowSessionReport(s)}>
            <View style={z.sH}><Text style={z.sD}>{new Date(s.startTime).toLocaleDateString('de-DE')}</Text><Text style={z.sT}>{fmt(s.duration || 0)}</Text></View>
            <View style={z.sSt}><View style={z.sSi}><Text style={z.sSV}>{s.detections?.length || 0}</Text><Text style={z.sSL}>Erkennungen</Text></View><View style={z.sSi}><Text style={z.sSV}>{Object.keys(s.speciesCount || {}).length}</Text><Text style={z.sSL}>Arten</Text></View></View>
            <Text style={z.sM}>🤖 {s.modelUsed === 'all' ? 'Alle' : s.modelUsed}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={z.sDelBtn} onPress={() => deleteSession(s)}><Text style={z.sDelBtnT}>🗑️</Text></TouchableOpacity>
        </View>))}
        {!sessionHistory.length && <Text style={z.em}>Noch keine Sessions</Text>}
      </ScrollView>)}

      {activeTab === 'achieve' && (<ScrollView style={z.ct}>
        <View style={z.rC}><Text style={z.rI}>{rank.icon}</Text><Text style={z.rN}>{rank.name}</Text><Text style={z.rP}>{points} Punkte</Text></View>
        <Text style={z.sc}>🏆 Freigeschaltet ({unlocked.length})</Text>
        {unlocked.map(a => (<View key={a.id} style={[z.ac, z.acU]}><Text style={z.acI}>{a.icon}</Text><View style={z.acC}><Text style={z.acN}>{a.name}</Text><Text style={z.acD}>{a.description}</Text></View><Text style={z.acP}>+{a.points}</Text></View>))}
        <Text style={z.sc}>🔒 Gesperrt ({locked.length})</Text>
        {locked.slice(0, 6).map(a => (<View key={a.id} style={z.ac}><Text style={z.acI}>{a.icon}</Text><View style={z.acC}><Text style={z.acN}>{a.name}</Text><Text style={z.acD}>{a.description}</Text></View><Text style={z.acP}>{a.points}</Text></View>))}
        <View style={z.exC}><TouchableOpacity style={z.ex} onPress={exportKML}><Text style={z.exI}>🌍</Text><Text style={z.exT}>KML</Text></TouchableOpacity><TouchableOpacity style={z.ex} onPress={exportJSON}><Text style={z.exI}>📋</Text><Text style={z.exT}>JSON</Text></TouchableOpacity><TouchableOpacity style={z.ex} onPress={exportCSV}><Text style={z.exI}>📑</Text><Text style={z.exT}>CSV</Text></TouchableOpacity><TouchableOpacity style={z.ex} onPress={shareStats}><Text style={z.exI}>📤</Text><Text style={z.exT}>Statistik</Text></TouchableOpacity></View>
      </ScrollView>)}

      <Modal visible={!!showBirdDetail} transparent animationType="slide">
        <View style={z.mo}><View style={z.moL}><ScrollView>{showBirdDetail && (<>
          <Text style={z.dI}>{showBirdDetail.icon || '🐦'}</Text>
          <Text style={z.dN}>{showBirdDetail.germanName || showBirdDetail.species}</Text>
          <Text style={z.dS}>{showBirdDetail.scientificName || showBirdDetail.scientific}</Text>
          {showBirdDetail.description && <><Text style={z.dSc}>📝 Beschreibung</Text><Text style={z.dT}>{showBirdDetail.description}</Text></>}
          <View style={z.dG}><View style={z.dCe}><Text style={z.dCL}>Familie</Text><Text style={z.dCV}>{showBirdDetail.family || '-'}</Text></View><View style={z.dCe}><Text style={z.dCL}>Größe</Text><Text style={z.dCV}>{showBirdDetail.size || '-'}</Text></View><View style={z.dCe}><Text style={z.dCL}>Frequenz</Text><Text style={z.dCV}>{showBirdDetail.voice?.frequency || '-'}</Text></View></View>
          {showBirdDetail.habitat && <><Text style={z.dSc}>🏠 Lebensraum</Text><Text style={z.dT}>{showBirdDetail.habitat?.join?.(', ') || showBirdDetail.habitat}</Text></>}
          {showBirdDetail.voice?.song && <><Text style={z.dSc}>🎵 Gesang</Text><Text style={z.dT}>{showBirdDetail.voice.song}</Text></>}
          {showBirdDetail.breedingSeason && <><Text style={z.dSc}>🥚 Brutzeit</Text><Text style={z.dT}>{showBirdDetail.breedingSeason}</Text></>}
          {showBirdDetail.nestType && <><Text style={z.dSc}>🪺 Nest</Text><Text style={z.dT}>{showBirdDetail.nestType}</Text></>}
          {showBirdDetail.eggs && <><Text style={z.dSc}>🐣 Eier / Gelege</Text><Text style={z.dT}>{showBirdDetail.eggs}</Text></>}
          {showBirdDetail.incubation && <><Text style={z.dSc}>⏳ Brutdauer</Text><Text style={z.dT}>{showBirdDetail.incubation}</Text></>}
          {showBirdDetail.funFacts && <><Text style={z.dSc}>💡 Fakten</Text>{showBirdDetail.funFacts.slice(0,3).map((f, i) => <Text key={i} style={z.dF}>• {f}</Text>)}</>}
          {showBirdDetail.confidence && <TouchableOpacity style={z.aB} onPress={() => shareDetection(showBirdDetail)}><Text style={z.aBT}>📤 Teilen</Text></TouchableOpacity>}
        </>)}</ScrollView><TouchableOpacity style={z.cl} onPress={() => setShowBirdDetail(null)}><Text style={z.clT}>Schließen</Text></TouchableOpacity></View></View>
      </Modal>

      <Modal visible={!!showSessionReport} transparent animationType="slide" onRequestClose={() => setShowSessionReport(null)}>
        <View style={z.mo}>
          <View style={[z.moL, {height: '90%', maxHeight: '95%', paddingBottom: 0, overflow: 'hidden'}]}>
            <ScrollView style={{flex: 1}} contentContainerStyle={{padding: 4, paddingBottom: 16}} showsVerticalScrollIndicator={true} bounces={true} nestedScrollEnabled={true}>{showSessionReport && (<>
          <Text style={z.moT}>📊 Ornithologischer Feldbericht</Text>
          <View style={z.rpH}><Text style={z.rpD}>{new Date(showSessionReport.startTime).toLocaleDateString('de-DE')}</Text><Text style={z.rpT}>{fmt(showSessionReport.duration || 0)}</Text></View>
          <View style={[z.rpS, {flexWrap: 'wrap'}]}>
            <View style={[z.rpSi, {minWidth: '22%'}]}><Text style={z.rpSV}>{showSessionReport.detections?.length || 0}</Text><Text style={z.rpSL}>Erkennungen</Text></View>
            <View style={[z.rpSi, {minWidth: '22%'}]}><Text style={z.rpSV}>{Object.keys(showSessionReport.speciesCount || {}).length}</Text><Text style={z.rpSL}>Arten</Text></View>
            <View style={[z.rpSi, {minWidth: '22%'}]}><Text style={z.rpSV}>{showSessionReport.totalAnalyzed || 0}</Text><Text style={z.rpSL}>Chunks</Text></View>
            <View style={[z.rpSi, {minWidth: '22%'}]}><Text style={z.rpSV}>{showSessionReport.detections?.length ? Math.round(showSessionReport.detections.reduce((s,d)=>s+(d.confidence||0),0)/showSessionReport.detections.length*100) : 0}%</Text><Text style={z.rpSL}>Ø Konfidenz</Text></View>
          </View>
          <Text style={z.dSc}>🦅 Artenliste (Deutsch / Lateinisch)</Text>
          {Object.entries(showSessionReport.speciesCount || {}).sort((a,b)=>b[1]-a[1]).slice(0,15).map(([sp,ct],i) => {
            const dets = (showSessionReport.detections || []).filter(d => d.species === sp);
            const maxConf = dets.length ? Math.max(...dets.map(d=>d.confidence||0)) : 0;
            const sci = dets[0]?.scientific || dets[0]?.scientificName || BIRD_LIBRARY[sp]?.scientificName || '';
            const bestDet = dets.slice().sort((a,b)=>(b.confidence||0)-(a.confidence||0))[0];
            return (<View key={sp} style={z.spR}>
              <Text style={z.spN}>{i+1}.</Text>
              <Text style={z.spI}>{BIRD_LIBRARY[sp]?.icon || '🐦'}</Text>
              <View style={{flex:1}}>
                <Text style={z.spNm}>{sp}</Text>
                {sci ? <Text style={{color:'#888',fontSize:9,fontStyle:'italic'}}>{sci}</Text> : null}
              </View>
              {bestDet?.audioUri ? <TouchableOpacity onPress={() => playDetectionAudio(bestDet)} style={{paddingHorizontal:6, paddingVertical:2}}><Text style={{fontSize:14}}>▶️</Text></TouchableOpacity> : null}
              <View style={{alignItems:'flex-end'}}>
                <Text style={z.spC}>{ct}x</Text>
                <Text style={{color:'#4ecdc4',fontSize:8}}>{Math.round(maxConf*100)}%</Text>
              </View>
            </View>);
          })}
          <Text style={z.dSc}>📊 Statistische Auswertung</Text>
          <View style={z.bio}>
            <View style={z.bioI}><Text style={z.bioL}>Shannon H'</Text><Text style={z.bioV}>{calcShannon(showSessionReport.speciesCount).toFixed(2)}</Text></View>
            <View style={z.bioI}><Text style={z.bioL}>Simpson 1-D</Text><Text style={z.bioV}>{calcSimpson(showSessionReport.speciesCount).toFixed(2)}</Text></View>
          </View>
          <View style={z.bio}>
            <View style={z.bioI}><Text style={z.bioL}>Evenness</Text><Text style={z.bioV}>{(() => { const S = Object.keys(showSessionReport.speciesCount||{}).length; return S > 1 ? (calcShannon(showSessionReport.speciesCount)/Math.log(S)).toFixed(2) : '1.00'; })()}</Text></View>
            <View style={z.bioI}><Text style={z.bioL}>Arten (S)</Text><Text style={z.bioV}>{Object.keys(showSessionReport.speciesCount || {}).length}</Text></View>
          </View>
          <Text style={z.dSc}>📤 Export & Teilen</Text>
          <View style={z.sBtns}>
            <TouchableOpacity style={[z.sv,{backgroundColor:'#2d6a4f'}]} onPress={() => exportSessionReport(showSessionReport, 'html')}><Text style={[z.svT,{color:'#fff'}]}>📄 Feldbericht</Text></TouchableOpacity>
          </View>
          <View style={[z.sBtns, {marginTop: 4}]}>
            <TouchableOpacity style={[z.sv,{backgroundColor:'#1a472a'}]} onPress={() => exportSessionReport(showSessionReport, 'kml')}><Text style={[z.svT,{color:'#fff'}]}>🌍 KML</Text></TouchableOpacity>
            <TouchableOpacity style={[z.sv,{backgroundColor:'#1a472a'}]} onPress={() => exportSessionReport(showSessionReport, 'json')}><Text style={[z.svT,{color:'#fff'}]}>📋 JSON</Text></TouchableOpacity>
            <TouchableOpacity style={[z.sv,{backgroundColor:'#1a472a'}]} onPress={() => exportSessionReport(showSessionReport, 'csv')}><Text style={[z.svT,{color:'#fff'}]}>📑 CSV</Text></TouchableOpacity>
          </View>
          <View style={[z.sBtns, {marginTop: 4}]}>
            <TouchableOpacity style={[z.sv,{backgroundColor:'#2196F3'}]} onPress={async () => {
              try {
                const s = showSessionReport;
                const n = Object.keys(s.speciesCount||{}).length;
                const d = s.detections?.length || 0;
                const arten = Object.entries(s.speciesCount||{}).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([sp,ct]) => {
                  const sci = BIRD_LIBRARY[sp]?.scientificName || '';
                  return `  • ${sp}${sci ? ` (${sci})` : ''}: ${ct}x`;
                }).join('\n');
                const txt = `🐦 BirdSound Feldbericht\n📅 ${new Date(s.startTime).toLocaleDateString('de-DE')} | ⏱️ ${fmt(s.duration||0)}\n\n📊 ${d} Erkennungen, ${n} Arten\n📈 Shannon H': ${calcShannon(s.speciesCount).toFixed(2)} | Simpson: ${calcSimpson(s.speciesCount).toFixed(2)}\n\n🦅 Top-Arten:\n${arten}\n\n— BirdSound v${APP_VERSION} | Dano Schönwald`;
                await Share.share({ message: txt, title: 'BirdSound Feldbericht' });
              } catch(e) { Alert.alert('Fehler', 'Teilen fehlgeschlagen: ' + e.message); }
            }}><Text style={[z.svT,{color:'#fff'}]}>📤 Teilen</Text></TouchableOpacity>
          </View>
          <View style={[z.sBtns, {marginTop: 8}]}>
            <TouchableOpacity style={z.sDel} onPress={() => deleteSession(showSessionReport)}><Text style={z.sDelT}>{(showSessionReport.detections?.length || 0) === 0 ? '🗑️ Verwerfen' : '🗑️ Löschen'}</Text></TouchableOpacity>
          </View>
        </>)}</ScrollView>
            <TouchableOpacity style={[z.cl, {marginTop: 0, borderRadius: 0, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, padding: 14, backgroundColor: '#4ecdc4'}]} onPress={() => setShowSessionReport(null)}><Text style={[z.clT, {color: '#000', fontSize: 14, fontWeight: '700'}]}>✕ Schließen</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showSettings} transparent animationType="fade">
        <View style={z.mo}><View style={z.moS}><ScrollView>
          <Text style={z.moT}>⚙️ Einstellungen</Text>
          <Text style={z.lbl}>Backend-URL</Text><TextInput style={z.inp} value={settings.backendUrl} onChangeText={v => setSettings({...settings, backendUrl: v})} />
          <Text style={z.lbl}>🤖 Modell ({availableModels.length})</Text>
          <View style={z.mS}><TouchableOpacity style={[z.mO, !settings.selectedModel && z.mOA]} onPress={() => setSettings({...settings, selectedModel: null})}><Text style={z.mOT}>Alle</Text></TouchableOpacity>{availableModels.map(m => (<TouchableOpacity key={m.name} style={[z.mO, settings.selectedModel === m.name && z.mOA]} onPress={() => setSettings({...settings, selectedModel: m.name})}><Text style={z.mOT}>{m.name}</Text></TouchableOpacity>))}</View>
          <Text style={z.lbl}>Konsensus</Text>
          <View style={z.cfR}>{[['weighted_average','Gewichtet'],['majority_vote','Mehrheit'],['max_confidence','Max']].map(([v,l]) => (<TouchableOpacity key={v} style={[z.cfB, settings.consensusMethod === v && z.cfA]} onPress={() => setSettings({...settings, consensusMethod: v})}><Text style={z.cfT}>{l}</Text></TouchableOpacity>))}</View>
          <Text style={z.lbl}>Auto-Stop (Min)</Text>
          <View style={z.cfR}>{[0,5,10,15,30].map(v => (<TouchableOpacity key={v} style={[z.cfB, settings.autoStopMinutes === v && z.cfA]} onPress={() => setSettings({...settings, autoStopMinutes: v})}><Text style={z.cfT}>{v || 'Aus'}</Text></TouchableOpacity>))}</View>
          <Text style={z.lbl}>Chunk (Sek)</Text>
          <View style={z.cfR}>{[2,3,5,10].map(v => (<TouchableOpacity key={v} style={[z.cfB, settings.chunkDuration === v && z.cfA]} onPress={() => setSettings({...settings, chunkDuration: v})}><Text style={z.cfT}>{v}s</Text></TouchableOpacity>))}</View>
          <Text style={z.lbl}>Min. Konfidenz: {Math.round(settings.minConfidence*100)}%</Text>
          <View style={z.cfR}>{[0.05,0.1,0.2,0.3,0.5].map(c => (<TouchableOpacity key={c} style={[z.cfB, settings.minConfidence === c && z.cfA]} onPress={() => setSettings({...settings, minConfidence: c})}><Text style={z.cfT}>{Math.round(c*100)}%</Text></TouchableOpacity>))}</View>
          <View style={z.sw}><Text style={z.swL}>📴 Offline</Text><Switch value={settings.offlineMode} onValueChange={v => setSettings({...settings, offlineMode: v})} /></View>
          <View style={z.sw}><Text style={z.swL}>📍 GPS</Text><Switch value={settings.enableGPS} onValueChange={v => setSettings({...settings, enableGPS: v})} /></View>
          <View style={z.sw}><Text style={z.swL}>🔒 Hintergrund-Aufnahme</Text><Switch value={settings.backgroundRecording} onValueChange={v => setSettings({...settings, backgroundRecording: v})} /></View>
          {settings.backgroundRecording && <Text style={z.hint}>Aufnahme läuft weiter bei Tastensperre oder wenn App minimiert ist. Erhöht Akkuverbrauch.</Text>}
          
          <Text style={[z.lbl, {marginTop: 20, fontSize: 16, color: '#4ecdc4'}]}>🎧 Audio-Verbesserung</Text>
          <Text style={z.hint}>Filtert Hintergrundgeräusche und verbessert die Vogelstimmen-Erkennung</Text>
          
          <Text style={z.lbl}>Preset</Text>
          <View style={z.cfR}>
            {[['none','Aus'],['light','Leicht'],['moderate','Mittel'],['aggressive','Stark'],['noisy_environment','Lärm'],['wind_reduction','Wind']].map(([v,l]) => (
              <TouchableOpacity key={v} style={[z.cfB, settings.audioEnhancement?.preset === v && z.cfA]} 
                onPress={() => setSettings({...settings, audioEnhancement: {...(settings.audioEnhancement || {}), preset: v === 'none' ? null : v}})}>
                <Text style={z.cfT}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          {!settings.audioEnhancement?.preset && (<>
            <Text style={[z.lbl, {marginTop: 10}]}>Individuelle Filter</Text>
            <View style={z.sw}><Text style={z.swL}>🎚️ Bandpass (1-8kHz)</Text><Switch value={settings.audioEnhancement?.bandpassEnabled || false} onValueChange={v => setSettings({...settings, audioEnhancement: {...(settings.audioEnhancement || {}), bandpassEnabled: v}})} /></View>
            <View style={z.sw}><Text style={z.swL}>🔇 Rauschunterdrückung</Text><Switch value={settings.audioEnhancement?.noiseReductionEnabled || false} onValueChange={v => setSettings({...settings, audioEnhancement: {...(settings.audioEnhancement || {}), noiseReductionEnabled: v}})} /></View>
            <View style={z.sw}><Text style={z.swL}>🔊 Auto-Verstärkung</Text><Switch value={settings.audioEnhancement?.autoGainEnabled || false} onValueChange={v => setSettings({...settings, audioEnhancement: {...(settings.audioEnhancement || {}), autoGainEnabled: v}})} /></View>
            <View style={z.sw}><Text style={z.swL}>🚪 Spectral Gate</Text><Switch value={settings.audioEnhancement?.spectralGateEnabled || false} onValueChange={v => setSettings({...settings, audioEnhancement: {...(settings.audioEnhancement || {}), spectralGateEnabled: v}})} /></View>
            <View style={z.sw}><Text style={z.swL}>📢 Hochpass (200Hz)</Text><Switch value={settings.audioEnhancement?.highpassEnabled || false} onValueChange={v => setSettings({...settings, audioEnhancement: {...(settings.audioEnhancement || {}), highpassEnabled: v}})} /></View>
          </>)}
          
          <TouchableOpacity style={z.sv} onPress={() => { saveData('settings', settings); fetchModels(); setShowSettings(false); }}><Text style={z.svT}>Speichern</Text></TouchableOpacity>
          <Text style={{color: '#666', fontSize: 10, textAlign: 'center', marginTop: 16, marginBottom: 8}}>Entwickelt von Dano Schönwald</Text>
        </ScrollView><TouchableOpacity style={z.cl} onPress={() => setShowSettings(false)}><Text style={z.clT}>Abbrechen</Text></TouchableOpacity></View></View>
      </Modal>
    </View>
  );
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const z = StyleSheet.create({
  c: { flex: 1, backgroundColor: '#0a0a15' },
  h: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#0f0f1a', borderBottomWidth: 1, borderBottomColor: '#1a1a2e' },
  mapC: { flex: 1 }, map: { flex: 1, width: SCREEN_WIDTH }, mk: { backgroundColor: '#16213e', padding: 6, borderRadius: 16, borderWidth: 2, borderColor: '#4ecdc4' }, mkI: { fontSize: 18 }, co: { padding: 6, minWidth: 100 }, coT: { fontWeight: '600', fontSize: 12 }, coS: { color: '#4ecdc4', fontSize: 11 }, mapO: { position: 'absolute', bottom: 16, left: 16, right: 16, backgroundColor: 'rgba(22,33,62,0.95)', borderRadius: 10, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, mapSt: { color: '#fff', fontSize: 12 }, mapB: { backgroundColor: '#4ecdc4', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }, mapBT: { color: '#000', fontWeight: '600', fontSize: 11 },
  mapPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a15' }, mapPlaceholderIcon: { fontSize: 48, marginBottom: 12 }, mapPlaceholderText: { color: '#fff', fontSize: 16, fontWeight: '600' }, mapPlaceholderHint: { color: '#666', fontSize: 12, marginTop: 8 },
  t: { fontSize: 18, fontWeight: '700', color: '#fff' }, st: { fontSize: 10, color: '#4ecdc4' },
  hr: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bg: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }, bgG: { backgroundColor: 'rgba(81,207,102,0.2)' }, bgR: { backgroundColor: 'rgba(255,107,107,0.2)' }, bgT: { color: '#fff', fontSize: 10 },
  ic: { fontSize: 20 },
  tb: { flexDirection: 'row', backgroundColor: '#0f0f1a', paddingVertical: 4 },
  ta: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 6, marginHorizontal: 2 }, taA: { backgroundColor: '#4ecdc4' }, taI: { fontSize: 14 },
  ct: { flex: 1, padding: 8 },
  mb: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#16213e', borderRadius: 8, padding: 8, marginBottom: 8 },
  ml: { fontSize: 14 }, mn: { color: '#4ecdc4', fontSize: 11, fontWeight: '600', marginLeft: 6, flex: 1 }, mc: { color: '#666', fontSize: 9 },
  cd: { backgroundColor: '#16213e', borderRadius: 10, padding: 14, marginBottom: 8, alignItems: 'center' }, cdT: { color: '#888', fontSize: 11, fontWeight: '600', marginBottom: 6, alignSelf: 'flex-start' },
  bt: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#1a1a2e', borderWidth: 3, borderColor: '#4ecdc4', alignItems: 'center', justifyContent: 'center' }, btA: { backgroundColor: 'rgba(255,107,107,0.2)', borderColor: '#ff6b6b' }, btI: { fontSize: 28 }, btL: { fontSize: 12, fontWeight: '700', color: '#fff', marginTop: 2 },
  tm: { fontSize: 24, fontWeight: '700', color: '#4ecdc4', marginTop: 8, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  as: { color: '#ff6b6b', fontSize: 9, marginTop: 2 },
  lv: { width: '100%', height: 10, backgroundColor: '#0a0a15', borderRadius: 5, marginTop: 8, overflow: 'hidden' }, lvF: { height: '100%', backgroundColor: '#4ecdc4', borderRadius: 5 },
  gp: { color: '#888', fontSize: 9, marginTop: 4 },
  // 3D Spektrogramm Styles
  spectrogram: { backgroundColor: '#16213e', borderRadius: 10, padding: 10, marginBottom: 8 },
  spectrogramHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  spectrogramReset: { backgroundColor: 'rgba(78,205,196,0.2)', borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  spectrogramResetT: { color: '#4ecdc4', fontSize: 14, fontWeight: '700' },
  spectrogramContainer: { height: 200, borderRadius: 8, overflow: 'hidden', backgroundColor: '#1a1a2e', position: 'relative' },
  spectrogramView: { flex: 1, backgroundColor: 'transparent' },
  spectrogramOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(10,10,21,0.8)' },
  spectrogramHint: { color: '#4ecdc4', fontSize: 12, textAlign: 'center' },
  spectrogramSubHint: { color: '#666', fontSize: 10, marginTop: 6 },
  freqLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8, marginTop: 6 },
  freqLabel: { fontSize: 9, fontWeight: '600' },
  dt: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 8, borderRadius: 6, marginBottom: 3, width: '100%' }, dtI: { fontSize: 20, marginRight: 8 }, dtC: { flex: 1 }, dtS: { color: '#fff', fontWeight: '600', fontSize: 12 }, dtSc: { color: '#888', fontSize: 9, fontStyle: 'italic' }, dtP: { fontSize: 11, fontWeight: '700' },
  em: { color: '#666', textAlign: 'center', paddingVertical: 16 },
  ss: { flexDirection: 'row', marginTop: 4 }, sst: { flex: 1, backgroundColor: '#16213e', borderRadius: 8, padding: 10, alignItems: 'center', marginHorizontal: 2 }, ssV: { fontSize: 18, fontWeight: '700', color: '#4ecdc4' }, ssL: { fontSize: 8, color: '#888', textTransform: 'uppercase', marginTop: 2 },
  fR: { flexDirection: 'row', marginBottom: 8, gap: 4 }, se: { flex: 1, backgroundColor: '#16213e', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, color: '#fff', fontSize: 12 }, fB: { backgroundColor: '#16213e', borderRadius: 8, padding: 8 },
  li: { backgroundColor: '#16213e', borderRadius: 8, marginBottom: 4, overflow: 'hidden' }, lm: { flexDirection: 'row', alignItems: 'center', padding: 8 }, lIc: { fontSize: 18, marginRight: 8 }, lIn: { flex: 1 }, lSp: { color: '#fff', fontWeight: '600', fontSize: 12 }, lMt: { color: '#666', fontSize: 9 }, lCf: { fontSize: 11, fontWeight: '700' },
  fb: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#1a1a2e' }, fbB: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRightWidth: 1, borderRightColor: '#1a1a2e' }, fbA: { backgroundColor: 'rgba(78,205,196,0.2)' },
  lb: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#16213e', borderRadius: 8, padding: 10, marginBottom: 4 }, lbI: { fontSize: 24, marginRight: 10 }, lbC: { flex: 1 }, lbN: { color: '#fff', fontWeight: '600', fontSize: 12 }, lbS: { color: '#4ecdc4', fontSize: 10, fontStyle: 'italic' }, lbF: { color: '#666', fontSize: 9 }, lbR: { fontSize: 9 },
  sc: { color: '#888', fontSize: 11, fontWeight: '600', marginBottom: 8, marginTop: 8 },
  sC: { backgroundColor: '#16213e', borderRadius: 10, padding: 12, marginBottom: 8, position: 'relative' }, sH: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }, sD: { color: '#fff', fontWeight: '600', fontSize: 12 }, sT: { color: '#4ecdc4', fontSize: 11 }, sSt: { flexDirection: 'row', marginBottom: 6 }, sSi: { flex: 1, alignItems: 'center' }, sSV: { color: '#4ecdc4', fontSize: 16, fontWeight: '700' }, sSL: { color: '#666', fontSize: 8, textTransform: 'uppercase' }, sM: { color: '#888', fontSize: 9, borderTopWidth: 1, borderTopColor: '#1a1a2e', paddingTop: 6 },
  sDelBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(255,107,107,0.2)', borderRadius: 15, width: 30, height: 30, alignItems: 'center', justifyContent: 'center' }, sDelBtnT: { fontSize: 14 },
  rC: { backgroundColor: '#16213e', borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 12 }, rI: { fontSize: 40 }, rN: { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 6 }, rP: { color: '#4ecdc4', fontSize: 11, marginTop: 2 },
  ac: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#16213e', borderRadius: 8, padding: 10, marginBottom: 4, opacity: 0.5 }, acU: { opacity: 1, borderLeftWidth: 3, borderLeftColor: '#4ecdc4' }, acI: { fontSize: 20, marginRight: 8 }, acC: { flex: 1 }, acN: { color: '#fff', fontWeight: '600', fontSize: 11 }, acD: { color: '#888', fontSize: 9 }, acP: { color: '#4ecdc4', fontSize: 11, fontWeight: '700' },
  exC: { flexDirection: 'row', gap: 8, marginTop: 8 }, ex: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#16213e', borderRadius: 8, padding: 12 }, exI: { fontSize: 18, marginRight: 8 }, exT: { color: '#fff', fontSize: 12 },
  mo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }, moS: { backgroundColor: '#16213e', borderRadius: 12, padding: 16, width: '88%', maxHeight: '80%' }, moL: { backgroundColor: '#16213e', borderRadius: 12, padding: 14, width: '90%', maxHeight: '82%' }, moT: { fontSize: 16, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 12 },
  dI: { fontSize: 48, textAlign: 'center' }, dN: { fontSize: 18, fontWeight: '700', color: '#fff', textAlign: 'center', marginTop: 6 }, dS: { fontSize: 11, color: '#4ecdc4', fontStyle: 'italic', textAlign: 'center', marginBottom: 10 }, dSc: { fontSize: 11, fontWeight: '600', color: '#4ecdc4', marginTop: 10, marginBottom: 4 }, dT: { color: '#ccc', fontSize: 11, lineHeight: 18 }, dG: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }, dCe: { width: '33%', padding: 6 }, dCL: { color: '#888', fontSize: 8, textTransform: 'uppercase' }, dCV: { color: '#fff', fontSize: 11, fontWeight: '600' }, dF: { color: '#ccc', fontSize: 10, marginBottom: 2 }, aB: { backgroundColor: '#4ecdc4', borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 12 }, aBT: { color: '#000', fontWeight: '600', fontSize: 12 },
  rpH: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }, rpD: { color: '#fff', fontSize: 14, fontWeight: '600' }, rpT: { color: '#4ecdc4', fontSize: 18, fontWeight: '700' },
  rpS: { flexDirection: 'row', marginBottom: 12, gap: 6 }, rpSi: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(78,205,196,0.1)', borderRadius: 8, padding: 10 }, rpSV: { color: '#4ecdc4', fontSize: 20, fontWeight: '700' }, rpSL: { color: '#888', fontSize: 8, textTransform: 'uppercase', marginTop: 2 },
  spR: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 8, borderRadius: 6, marginBottom: 3 }, spN: { color: '#4ecdc4', fontSize: 12, fontWeight: '700', width: 20 }, spI: { fontSize: 16, marginRight: 6 }, spNm: { flex: 1, color: '#fff', fontSize: 11 }, spC: { color: '#888', fontSize: 10 },
  bio: { flexDirection: 'row', gap: 8, marginBottom: 12 }, bioI: { flex: 1, backgroundColor: 'rgba(78,205,196,0.1)', borderRadius: 8, padding: 10, alignItems: 'center' }, bioL: { color: '#888', fontSize: 8, textTransform: 'uppercase' }, bioV: { color: '#4ecdc4', fontSize: 18, fontWeight: '700', marginTop: 2 },
  lbl: { color: '#fff', fontSize: 11, fontWeight: '600', marginTop: 10, marginBottom: 4 }, inp: { backgroundColor: '#0a0a15', borderWidth: 1, borderColor: '#333', borderRadius: 6, padding: 8, color: '#fff', fontSize: 11 },
  hint: { color: '#ff6b6b', fontSize: 9, fontStyle: 'italic', marginTop: 4, marginBottom: 8 },
  sw: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1a1a2e' }, swL: { color: '#fff', fontSize: 11 },
  mS: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 }, mO: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#0a0a15', borderRadius: 6, borderWidth: 1, borderColor: '#333' }, mOA: { backgroundColor: '#4ecdc4', borderColor: '#4ecdc4' }, mOT: { color: '#fff', fontSize: 10 },
  cfR: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 }, cfB: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#0a0a15', borderRadius: 6 }, cfA: { backgroundColor: '#4ecdc4' }, cfT: { color: '#fff', fontSize: 10 },
  sBtns: { flexDirection: 'row', gap: 8, marginTop: 12 }, sv: { flex: 1, backgroundColor: '#4ecdc4', borderRadius: 8, padding: 10, alignItems: 'center' }, svT: { color: '#000', fontWeight: '600', fontSize: 12 },
  sDel: { flex: 1, backgroundColor: '#ff6b6b', borderRadius: 8, padding: 10, alignItems: 'center' }, sDelT: { color: '#fff', fontWeight: '600', fontSize: 12 },
  cl: { backgroundColor: '#333', borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 6 }, clT: { color: '#fff', fontWeight: '600', fontSize: 12 },
  upd: { backgroundColor: '#ff6b35', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 4, marginBottom: 2, alignSelf: 'flex-start' },
  updT: { color: '#fff', fontSize: 11, fontWeight: '600' },
  mapFilterBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#16213e', paddingHorizontal: 8, paddingVertical: 6 },
  mapFilterInput: { flex: 1, backgroundColor: '#0a0a15', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, color: '#fff', fontSize: 12, borderWidth: 1, borderColor: '#333' },
  mapFilterClear: { color: '#ff6b6b', fontSize: 18, paddingHorizontal: 10, fontWeight: '700' },
  mapOptT: { paddingHorizontal: 8, paddingVertical: 4 },
  mapOptTT: { color: '#4ecdc4', fontSize: 16 },
  mapOpts: { backgroundColor: '#16213e', paddingHorizontal: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#0a0a15' },
  mapOptLbl: { color: '#888', fontSize: 10, marginTop: 4, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  mapOptRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  mapChip: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#0a0a15', borderRadius: 14, borderWidth: 1, borderColor: '#333' },
  mapChipA: { backgroundColor: '#4ecdc4', borderColor: '#4ecdc4' },
  mapChipT: { color: '#fff', fontSize: 11 },
  mapChipTA: { color: '#000', fontWeight: '700' },
});
