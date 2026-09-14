/**
 * BirdSound - 160+ Arten, smarter Filter, BirdNET-Codes erweitert
 * Entwickler: Dano Schönwald
 *
 * Version: see app.json / package.json (single source of truth).
 * Read at runtime via Constants.expoConfig.version.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, StatusBar, Platform, Alert, TextInput, Share, FlatList, Dimensions, AppState, Linking, RefreshControl } from 'react-native';
import { WebView } from 'react-native-webview';
// MapView replaced with WebView + OpenStreetMap (no API key required)
import {
  createAudioPlayer,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Network from 'expo-network';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as TaskManager from 'expo-task-manager';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { BIRD_LIBRARY } from './src/data/BirdLibrary';
import { ACHIEVEMENTS, calculateUnlockedAchievements, calculateTotalPoints, getRank } from './src/data/Achievements';
import { resolveSpecies, isPlausibleEuropean, isIndependentDetection } from './src/utils/SpeciesResolver';
import { generateFieldReport, generateSessionKML, generateSessionJSON } from './src/utils/ScientificReport';
import { BirdDetailModal } from './src/components/BirdDetailModal';
import { SessionReportModal } from './src/components/SessionReportModal';
import { SettingsModal } from './src/components/SettingsModal';
import { SPECTROGRAM_HTML } from './src/components/SpectrogramHTML';
import { APP_VERSION, DEFAULT_API_URL, createApiHeaders } from './src/config/appConfig';
import {
  confidenceColor as cc,
  csvEscape as csvEsc,
  formatDuration as fmt,
  fuzzyHit,
  isNewerVersion,
} from './src/utils/appUtils';

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

function App() {
  const appStyles = makeStyles(PAL.dark);
  const [settings, setSettings] = useState({
    backendUrl: DEFAULT_API_URL, apiKey: '', chunkDuration: 3, minConfidence: 0.3, enableGPS: true, offlineMode: true,
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

  // ---- Helper: gespeichertes Audio einer Erkennung abspielen ----
  const playDetectionAudio = async (d) => {
    try {
      if (!d || !d.audioUri) { Alert.alert('Keine Aufnahme', 'Für diese Erkennung wurde kein Audio gespeichert.'); return; }
      if (playRef.current) {
        try { playRef.current.pause(); playRef.current.remove(); } catch {}
        playRef.current = null;
      }
      const player = createAudioPlayer({ uri: d.audioUri });
      playRef.current = player;
      player.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish || status.error) {
          player.remove();
          if (playRef.current === player) playRef.current = null;
        }
      });
      player.play();
    } catch (e) { Alert.alert('Wiedergabe fehlgeschlagen', String(e?.message || e)); }
  };

  // ---- Helper: Pull-to-Refresh ----
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await loadData(); } catch {}
    setRefreshing(false);
  }, []);

  const checkForUpdate = useCallback(async (url, apiKey = settings.apiKey) => {
    const backendUrl = url || settings.backendUrl;
    try {
      const r = await fetchWithTimeout(`${backendUrl}/api/v1/mobile/latest-version`, { headers: createApiHeaders(apiKey) }, 4000);
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
  }, [settings.backendUrl, settings.apiKey]);

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

  const audioRecorder = useAudioRecorder(
    { ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true },
    (status) => {
      if (typeof status.metering !== 'number') return;
      const level = Math.max(0, (status.metering + 60) * 1.67);
      setAudioLevel(level);
      updateSpectrogram(level);
    }
  );

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
    const saved = await loadData();
    const url = saved.backendUrl || DEFAULT_API_URL;
    await checkNetwork();
    await checkBackend(url);
    await fetchModels(url, saved.apiKey);
    checkForUpdate(url, saved.apiKey);
    if (settings.enableGPS) initGPS();
  };

  const cleanup = () => { stopStreaming(); };

  const loadData = async () => {
    try {
      const [det, stats, queue, sessions, saved, mapPrefsRaw, apiKey] = await Promise.all([
        AsyncStorage.getItem('detections'), AsyncStorage.getItem('userStats'),
        AsyncStorage.getItem('offlineQueue'), AsyncStorage.getItem('sessionHistory'),
        AsyncStorage.getItem('settings'), AsyncStorage.getItem('mapPrefs'),
        SecureStore.getItemAsync('apiKey'),
      ]);
      if (det) setDetections(JSON.parse(det));
      if (stats) setUserStats(JSON.parse(stats));
      if (queue) setOfflineQueue(JSON.parse(queue));
      if (sessions) setSessionHistory(JSON.parse(sessions));
      let savedUrl = null;
      let resolvedApiKey = apiKey || '';
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.apiKey) {
          resolvedApiKey ||= parsed.apiKey;
          const publicSettings = { ...parsed };
          delete publicSettings.apiKey;
          await Promise.all([
            AsyncStorage.setItem('settings', JSON.stringify(publicSettings)),
            SecureStore.setItemAsync('apiKey', resolvedApiKey),
          ]);
        }
        setSettings(s => ({ ...s, ...parsed, apiKey: resolvedApiKey }));
        savedUrl = parsed.backendUrl;
      } else if (resolvedApiKey) {
        setSettings(s => ({ ...s, apiKey: resolvedApiKey }));
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
      return { backendUrl: savedUrl, apiKey: resolvedApiKey };
    } catch (e) { setMapFiltersLoaded(true); return { backendUrl: null, apiKey: '' }; }
  };

  const saveData = async (key, data) => { try { await AsyncStorage.setItem(key, JSON.stringify(data)); } catch (e) {} };

  const saveSettings = async () => {
    const { apiKey, ...publicSettings } = settings;
    await Promise.all([
      saveData('settings', publicSettings),
      apiKey ? SecureStore.setItemAsync('apiKey', apiKey) : SecureStore.deleteItemAsync('apiKey'),
    ]);
    await fetchModels(undefined, apiKey);
    setShowSettings(false);
  };

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
      const r = await fetchWithTimeout(`${backendUrl}/health`, { headers: createApiHeaders(settings.apiKey) });
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

  const fetchModels = async (url, apiKey = settings.apiKey) => {
    const backendUrl = url || settings.backendUrl;
    try {
      console.log('Fetching models from:', backendUrl);
      const r = await fetchWithTimeout(`${backendUrl}/api/v1/models`, { headers: createApiHeaders(apiKey) });
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
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) { Alert.alert('Fehler', 'Mikrofon benötigt'); return; }
      
      // Audio-Modus für Background-Recording konfigurieren
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        allowsBackgroundRecording: settings.backgroundRecording,
        interruptionMode: 'duckOthers',
        shouldRouteThroughEarpiece: false,
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
    if (recordingRef.current) { try { await recordingRef.current.stop(); } catch (e) {} recordingRef.current = null; }
    
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
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      recordingRef.current = audioRecorder;
    } catch (e) {}
  };

  const processChunk = async () => {
    if (!recordingRef.current) return;
    try {
      await recordingRef.current.stop();
      const uri = recordingRef.current.uri;
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
        headers: createApiHeaders(settings.apiKey),
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
  const sbh = Platform.OS === 'android' ? Constants.statusBarHeight : 0;

  const detWithLocation = detections.filter(d => d.location);
  const mapRegion = detWithLocation.length > 0 ? {
    latitude: detWithLocation[0].location.lat,
    longitude: detWithLocation[0].location.lng,
    latitudeDelta: 0.02, longitudeDelta: 0.02
  } : location ? { latitude: location.latitude, longitude: location.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 } : { latitude: 52.52, longitude: 13.405, latitudeDelta: 0.5, longitudeDelta: 0.5 };

  return (
    <View style={appStyles.c}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a15" />
      <View style={{ height: sbh, backgroundColor: '#0a0a15' }} />
      <View style={appStyles.h}><View style={{flex: 1}}><Text style={appStyles.t}>🐦 BirdSound v{APP_VERSION}</Text>{updateInfo ? (<TouchableOpacity onPress={openUpdateUrl} style={appStyles.upd}><Text style={appStyles.updT}>🔄 Update {updateInfo.version} verfügbar — antippen</Text></TouchableOpacity>) : null}<Text style={appStyles.st}>{rank.icon} {rank.name} • {points}P</Text></View><View style={appStyles.hr}><View style={[appStyles.bg, isConnected ? appStyles.bgG : appStyles.bgR]}><Text style={appStyles.bgT}>{isConnected ? '🟢' : '🔴'}{offlineQueue.length > 0 ? ` (${offlineQueue.length})` : ''}</Text></View><TouchableOpacity onPress={() => setShowSettings(true)}><Text style={appStyles.ic}>⚙️</Text></TouchableOpacity></View></View>
      <View style={appStyles.tb}>{[['live','🎙️'],['map','🗺️'],['list','📋'],['library','📚'],['sessions','📊'],['achieve','🏆']].map(([id,ic]) => (<TouchableOpacity key={id} style={[appStyles.ta, activeTab===id && appStyles.taA]} onPress={() => setActiveTab(id)}><Text style={appStyles.taI}>{ic}</Text></TouchableOpacity>))}</View>

      {activeTab === 'live' && (<ScrollView style={appStyles.ct}>
        <View style={appStyles.mb}><Text style={appStyles.ml}>🤖</Text><Text style={appStyles.mn}>{settings.selectedModel || 'Alle Modelle'}</Text><Text style={appStyles.mc}>{availableModels.length} verfügbar</Text></View>
        <View style={appStyles.cd}>
          <TouchableOpacity onPress={() => isStreaming ? stopStreaming() : startStreaming()} disabled={!isOnline && !settings.offlineMode}>
            <View style={[appStyles.bt, isStreaming && appStyles.btA]}><Text style={appStyles.btI}>{isStreaming ? '⏹️' : '▶️'}</Text><Text style={appStyles.btL}>{isStreaming ? 'STOP' : 'START'}</Text></View>
          </TouchableOpacity>
          <Text style={appStyles.tm}>{fmt(streamTime)}</Text>
          {settings.autoStopMinutes > 0 && <Text style={appStyles.as}>Auto-Stop: {settings.autoStopMinutes}min</Text>}
          {location && <Text style={appStyles.gp}>📍 {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</Text>}
        </View>
        
        {/* 3D Spektrogramm (Wasserfall-Diagramm) */}
        <View style={appStyles.spectrogram}>
          <View style={appStyles.spectrogramHeader}>
            <Text style={appStyles.cdT}>🌊 3D-Spektrogramm</Text>
            <TouchableOpacity style={appStyles.spectrogramReset} onPress={clearSpectrogram}><Text style={appStyles.spectrogramResetT}>↺</Text></TouchableOpacity>
          </View>
          <View style={appStyles.spectrogramContainer}>
            <WebView
              ref={spectrogramRef}
              source={{ html: SPECTROGRAM_HTML }}
              style={appStyles.spectrogramView}
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
              <View style={appStyles.spectrogramOverlay}>
                <Text style={appStyles.spectrogramHint}>▶️ Starte Aufnahme für Live-Visualisierung</Text>
                <Text style={appStyles.spectrogramSubHint}>Touch: Drehen • Pinch: Zoom</Text>
              </View>
            )}
          </View>
          <View style={appStyles.freqLabels}>
            <Text style={[appStyles.freqLabel, { color: '#4ecdc4' }]}>1kHz</Text>
            <Text style={[appStyles.freqLabel, { color: '#51cf66' }]}>2kHz</Text>
            <Text style={[appStyles.freqLabel, { color: '#ffd43b' }]}>4kHz</Text>
            <Text style={[appStyles.freqLabel, { color: '#ff6b6b' }]}>8kHz</Text>
          </View>
        </View>

        <View style={appStyles.cd}><Text style={appStyles.cdT}>🎵 Erkennungen</Text>
          {detections.slice(0, 5).map(d => (<TouchableOpacity key={d.id} style={appStyles.dt} onPress={() => setShowBirdDetail(d)}><Text style={appStyles.dtI}>{BIRD_LIBRARY[d.species]?.icon || '🐦'}</Text><View style={appStyles.dtC}><Text style={appStyles.dtS}>{d.species}</Text><Text style={appStyles.dtSc}>{d.scientific}</Text></View><Text style={[appStyles.dtP, { color: cc(d.confidence) }]}>{Math.round(d.confidence*100)}%</Text></TouchableOpacity>))}
          {!detections.length && <Text style={appStyles.em}>Starte Streaming...</Text>}
        </View>
        <View style={appStyles.ss}><View style={appStyles.sst}><Text style={appStyles.ssV}>{detections.length}</Text><Text style={appStyles.ssL}>Erkennungen</Text></View><View style={appStyles.sst}><Text style={appStyles.ssV}>{uniqueSpecies.size}</Text><Text style={appStyles.ssL}>Arten</Text></View><View style={appStyles.sst}><Text style={appStyles.ssV}>{sessionHistory.length}</Text><Text style={appStyles.ssL}>Sessions</Text></View></View>
      </ScrollView>)}

      {activeTab === 'map' && (<View style={appStyles.mapC}>
        <View style={appStyles.mapFilterBar}>
          <TextInput
            style={appStyles.mapFilterInput}
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
          {mapFilter ? (<TouchableOpacity onPress={() => { setMapFilter(''); if (mapWebViewRef.current) mapWebViewRef.current.postMessage(JSON.stringify({ type: 'options', filter: '', baseLayer: mapBaseLayer, heatmap: mapHeatmap, timeRange: mapTimeRange, minConf: mapMinConf })); }}><Text style={appStyles.mapFilterClear}>✕</Text></TouchableOpacity>) : null}
          <TouchableOpacity onPress={() => setMapShowOptions(v => !v)} style={appStyles.mapOptT}><Text style={appStyles.mapOptTT}>{mapShowOptions ? '▲' : '⚙️'}</Text></TouchableOpacity>
        </View>
        {mapShowOptions && (<View style={appStyles.mapOpts}>
          <Text style={appStyles.mapOptLbl}>Karte</Text>
          <View style={appStyles.mapOptRow}>
            {[['osm','Standard'],['topo','Topo'],['sat','Satellit'],['dark','Dunkel']].map(([k,l]) => (
              <TouchableOpacity key={k} style={[appStyles.mapChip, mapBaseLayer===k && appStyles.mapChipA]} onPress={() => { setMapBaseLayer(k); mapWebViewRef.current && mapWebViewRef.current.postMessage(JSON.stringify({ type: 'options', filter: mapFilter, baseLayer: k, heatmap: mapHeatmap, timeRange: mapTimeRange, minConf: mapMinConf })); }}><Text style={[appStyles.mapChipT, mapBaseLayer===k && appStyles.mapChipTA]}>{l}</Text></TouchableOpacity>
            ))}
          </View>
          <Text style={appStyles.mapOptLbl}>Zeitraum</Text>
          <View style={appStyles.mapOptRow}>
            {[['all','Alle'],['today','Heute'],['7d','7 Tage'],['30d','30 Tage']].map(([k,l]) => (
              <TouchableOpacity key={k} style={[appStyles.mapChip, mapTimeRange===k && appStyles.mapChipA]} onPress={() => { setMapTimeRange(k); mapWebViewRef.current && mapWebViewRef.current.postMessage(JSON.stringify({ type: 'options', filter: mapFilter, baseLayer: mapBaseLayer, heatmap: mapHeatmap, timeRange: k, minConf: mapMinConf })); }}><Text style={[appStyles.mapChipT, mapTimeRange===k && appStyles.mapChipTA]}>{l}</Text></TouchableOpacity>
            ))}
          </View>
          <Text style={appStyles.mapOptLbl}>Min. Konfidenz</Text>
          <View style={appStyles.mapOptRow}>
            {[[0,'0%'],[0.5,'50%'],[0.7,'70%'],[0.9,'90%']].map(([k,l]) => (
              <TouchableOpacity key={String(k)} style={[appStyles.mapChip, mapMinConf===k && appStyles.mapChipA]} onPress={() => { setMapMinConf(k); mapWebViewRef.current && mapWebViewRef.current.postMessage(JSON.stringify({ type: 'options', filter: mapFilter, baseLayer: mapBaseLayer, heatmap: mapHeatmap, timeRange: mapTimeRange, minConf: k })); }}><Text style={[appStyles.mapChipT, mapMinConf===k && appStyles.mapChipTA]}>{l}</Text></TouchableOpacity>
            ))}
          </View>
          <View style={appStyles.mapOptRow}>
            <TouchableOpacity style={[appStyles.mapChip, mapHeatmap && appStyles.mapChipA]} onPress={() => { const h = !mapHeatmap; setMapHeatmap(h); mapWebViewRef.current && mapWebViewRef.current.postMessage(JSON.stringify({ type: 'options', filter: mapFilter, baseLayer: mapBaseLayer, heatmap: h, timeRange: mapTimeRange, minConf: mapMinConf })); }}><Text style={[appStyles.mapChipT, mapHeatmap && appStyles.mapChipTA]}>🔥 Heatmap</Text></TouchableOpacity>
            <TouchableOpacity style={appStyles.mapChip} onPress={() => mapWebViewRef.current && mapWebViewRef.current.postMessage(JSON.stringify({ type: 'locate' }))}><Text style={appStyles.mapChipT}>📍 Standort</Text></TouchableOpacity>
            <TouchableOpacity style={appStyles.mapChip} onPress={() => mapWebViewRef.current && mapWebViewRef.current.postMessage(JSON.stringify({ type: 'fit' }))}><Text style={appStyles.mapChipT}>🔍 Alle zeigen</Text></TouchableOpacity>
          </View>
        </View>)}
        <WebView
          ref={mapWebViewRef}
          style={appStyles.map}
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
        <View style={appStyles.mapO}>
          <Text style={appStyles.mapSt}>📍 {detWithLocation.length} Fundorte{mapFilter ? ' • Filter aktiv' : ''}</Text>
          <TouchableOpacity style={appStyles.mapB} onPress={exportKML}><Text style={appStyles.mapBT}>🌍 KML Export</Text></TouchableOpacity>
        </View>
      </View>)}

      {activeTab === 'list' && (<View style={appStyles.ct}>
        <View style={appStyles.fR}><TextInput style={appStyles.se} placeholder="Suchen..." placeholderTextColor="#666" value={filter.species} onChangeText={t => setFilter({...filter, species: t})} /><TouchableOpacity style={appStyles.fB} onPress={exportKML}><Text>📤</Text></TouchableOpacity></View>
        <FlatList data={filtered} keyExtractor={i => i.id.toString()} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4ecdc4" colors={["#4ecdc4"]} />} renderItem={({ item: d }) => (
          <View style={appStyles.li}><TouchableOpacity style={appStyles.lm} onPress={() => setShowBirdDetail(d)}><Text style={appStyles.lIc}>{BIRD_LIBRARY[d.species]?.icon || '🐦'}</Text><View style={appStyles.lIn}><Text style={appStyles.lSp}>{d.species}</Text><Text style={appStyles.lMt}>{new Date(d.time).toLocaleString()} {d.location ? `📍${d.location.accuracy ? ` ±${Math.round(d.location.accuracy)}m` : ''}` : ''} • {d.model}</Text></View><Text style={[appStyles.lCf, { color: cc(d.confidence) }]}>{Math.round(d.confidence*100)}%</Text></TouchableOpacity>
          <View style={appStyles.fb}>{d.audioUri ? <TouchableOpacity style={appStyles.fbB} onPress={() => playDetectionAudio(d)}><Text>▶️</Text></TouchableOpacity> : null}<TouchableOpacity style={[appStyles.fbB, d.feedback === true && appStyles.fbA]} onPress={() => submitFeedback(d.id, true)}><Text>👍</Text></TouchableOpacity><TouchableOpacity style={[appStyles.fbB, d.feedback === false && appStyles.fbA]} onPress={() => submitFeedback(d.id, false)}><Text>👎</Text></TouchableOpacity><TouchableOpacity style={appStyles.fbB} onPress={() => shareDetection(d)}><Text>📤</Text></TouchableOpacity></View></View>
        )} />
      </View>)}

      {activeTab === 'library' && (<View style={appStyles.ct}>
        <TextInput style={appStyles.se} placeholder="Vogel suchen..." placeholderTextColor="#666" value={searchQuery} onChangeText={setSearchQuery} />
        <FlatList data={Object.entries(BIRD_LIBRARY).filter(([k, b]) => fuzzyHit(searchQuery, [k, b?.germanName, b?.scientificName, b?.englishName, b?.family]))} keyExtractor={([k]) => k} renderItem={({ item: [key, bird] }) => (
          <TouchableOpacity style={appStyles.lb} onPress={() => setShowBirdDetail(bird)}><Text style={appStyles.lbI}>{bird.icon || '🐦'}</Text><View style={appStyles.lbC}><Text style={appStyles.lbN}>{bird.germanName || key}</Text><Text style={appStyles.lbS}>{bird.scientificName}</Text><Text style={appStyles.lbF}>{bird.family}</Text></View><Text style={appStyles.lbR}>{'⭐'.repeat(bird.rarity || 1)}</Text></TouchableOpacity>
        )} />
      </View>)}

      {activeTab === 'sessions' && (<ScrollView style={appStyles.ct} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4ecdc4" colors={["#4ecdc4"]} />}>
        <Text style={appStyles.sc}>📊 Sessions ({sessionHistory.length})</Text>
        {sessionHistory.map(s => (<View key={s.id} style={appStyles.sC}>
          <TouchableOpacity onPress={() => setShowSessionReport(s)}>
            <View style={appStyles.sH}><Text style={appStyles.sD}>{new Date(s.startTime).toLocaleDateString('de-DE')}</Text><Text style={appStyles.sT}>{fmt(s.duration || 0)}</Text></View>
            <View style={appStyles.sSt}><View style={appStyles.sSi}><Text style={appStyles.sSV}>{s.detections?.length || 0}</Text><Text style={appStyles.sSL}>Erkennungen</Text></View><View style={appStyles.sSi}><Text style={appStyles.sSV}>{Object.keys(s.speciesCount || {}).length}</Text><Text style={appStyles.sSL}>Arten</Text></View></View>
            <Text style={appStyles.sM}>🤖 {s.modelUsed === 'all' ? 'Alle' : s.modelUsed}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={appStyles.sDelBtn} onPress={() => deleteSession(s)}><Text style={appStyles.sDelBtnT}>🗑️</Text></TouchableOpacity>
        </View>))}
        {!sessionHistory.length && <Text style={appStyles.em}>Noch keine Sessions</Text>}
      </ScrollView>)}

      {activeTab === 'achieve' && (<ScrollView style={appStyles.ct}>
        <View style={appStyles.rC}><Text style={appStyles.rI}>{rank.icon}</Text><Text style={appStyles.rN}>{rank.name}</Text><Text style={appStyles.rP}>{points} Punkte</Text></View>
        <Text style={appStyles.sc}>🏆 Freigeschaltet ({unlocked.length})</Text>
        {unlocked.map(a => (<View key={a.id} style={[appStyles.ac, appStyles.acU]}><Text style={appStyles.acI}>{a.icon}</Text><View style={appStyles.acC}><Text style={appStyles.acN}>{a.name}</Text><Text style={appStyles.acD}>{a.description}</Text></View><Text style={appStyles.acP}>+{a.points}</Text></View>))}
        <Text style={appStyles.sc}>🔒 Gesperrt ({locked.length})</Text>
        {locked.slice(0, 6).map(a => (<View key={a.id} style={appStyles.ac}><Text style={appStyles.acI}>{a.icon}</Text><View style={appStyles.acC}><Text style={appStyles.acN}>{a.name}</Text><Text style={appStyles.acD}>{a.description}</Text></View><Text style={appStyles.acP}>{a.points}</Text></View>))}
        <View style={appStyles.exC}><TouchableOpacity style={appStyles.ex} onPress={exportKML}><Text style={appStyles.exI}>🌍</Text><Text style={appStyles.exT}>KML</Text></TouchableOpacity><TouchableOpacity style={appStyles.ex} onPress={exportJSON}><Text style={appStyles.exI}>📋</Text><Text style={appStyles.exT}>JSON</Text></TouchableOpacity><TouchableOpacity style={appStyles.ex} onPress={exportCSV}><Text style={appStyles.exI}>📑</Text><Text style={appStyles.exT}>CSV</Text></TouchableOpacity><TouchableOpacity style={appStyles.ex} onPress={shareStats}><Text style={appStyles.exI}>📤</Text><Text style={appStyles.exT}>Statistik</Text></TouchableOpacity></View>
      </ScrollView>)}

      <BirdDetailModal bird={showBirdDetail} onClose={() => setShowBirdDetail(null)} onShare={shareDetection} styles={appStyles} />

      <SessionReportModal
        session={showSessionReport}
        appVersion={APP_VERSION}
        onClose={() => setShowSessionReport(null)}
        onDelete={deleteSession}
        onExport={exportSessionReport}
        onPlayAudio={playDetectionAudio}
        styles={appStyles}
      />

      <SettingsModal
        visible={showSettings}
        settings={settings}
        models={availableModels}
        onChange={setSettings}
        onSave={saveSettings}
        onClose={() => setShowSettings(false)}
        styles={appStyles}
      />
    </View>
  );
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');


const PAL = {
  dark: {
    bg0: '#0a0a15', bg1: '#0f0f1a', bg2: '#1a1a2e', bg3: '#16213e',
    text: '#fff', desc: '#ccc', muted: '#888', muted2: '#666', border: '#333',
    row: 'rgba(255,255,255,0.03)', overlay: 'rgba(22,33,62,0.95)',
    modalBg: 'rgba(0,0,0,0.9)', specOverlay: 'rgba(10,10,21,0.8)',
    statusBar: 'light-content',
  },
  light: {
    bg0: '#f5f6fa', bg1: '#ffffff', bg2: '#e1e5ee', bg3: '#ffffff',
    text: '#1a1a2e', desc: '#444', muted: '#555', muted2: '#888', border: '#d0d4dd',
    row: 'rgba(0,0,0,0.04)', overlay: 'rgba(255,255,255,0.95)',
    modalBg: 'rgba(0,0,0,0.5)', specOverlay: 'rgba(245,246,250,0.85)',
    statusBar: 'dark-content',
  },
};
function makeStyles(p) { return StyleSheet.create({
  c: { flex: 1, backgroundColor: p.bg0 },
  h: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: p.bg1, borderBottomWidth: 1, borderBottomColor: p.bg2 },
  mapC: { flex: 1 }, map: { flex: 1, width: SCREEN_WIDTH }, mk: { backgroundColor: p.bg3, padding: 6, borderRadius: 16, borderWidth: 2, borderColor: '#4ecdc4' }, mkI: { fontSize: 18 }, co: { padding: 6, minWidth: 100 }, coT: { fontWeight: '600', fontSize: 12 }, coS: { color: '#4ecdc4', fontSize: 11 }, mapO: { position: 'absolute', bottom: 16, left: 16, right: 16, backgroundColor: p.overlay, borderRadius: 10, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, mapSt: { color: p.text, fontSize: 12 }, mapB: { backgroundColor: '#4ecdc4', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }, mapBT: { color: '#000', fontWeight: '600', fontSize: 11 },
  mapPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: p.bg0 }, mapPlaceholderIcon: { fontSize: 48, marginBottom: 12 }, mapPlaceholderText: { color: p.text, fontSize: 16, fontWeight: '600' }, mapPlaceholderHint: { color: p.muted2, fontSize: 12, marginTop: 8 },
  t: { fontSize: 18, fontWeight: '700', color: p.text }, st: { fontSize: 10, color: '#4ecdc4' },
  hr: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bg: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }, bgG: { backgroundColor: 'rgba(81,207,102,0.2)' }, bgR: { backgroundColor: 'rgba(255,107,107,0.2)' }, bgT: { color: p.text, fontSize: 10 },
  ic: { fontSize: 20 },
  tb: { flexDirection: 'row', backgroundColor: p.bg1, paddingVertical: 4 },
  ta: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 6, marginHorizontal: 2 }, taA: { backgroundColor: '#4ecdc4' }, taI: { fontSize: 14 },
  ct: { flex: 1, padding: 8 },
  mb: { flexDirection: 'row', alignItems: 'center', backgroundColor: p.bg3, borderRadius: 8, padding: 8, marginBottom: 8 },
  ml: { fontSize: 14 }, mn: { color: '#4ecdc4', fontSize: 11, fontWeight: '600', marginLeft: 6, flex: 1 }, mc: { color: p.muted2, fontSize: 9 },
  cd: { backgroundColor: p.bg3, borderRadius: 10, padding: 14, marginBottom: 8, alignItems: 'center' }, cdT: { color: p.muted, fontSize: 11, fontWeight: '600', marginBottom: 6, alignSelf: 'flex-start' },
  bt: { width: 90, height: 90, borderRadius: 45, backgroundColor: p.bg2, borderWidth: 3, borderColor: '#4ecdc4', alignItems: 'center', justifyContent: 'center' }, btA: { backgroundColor: 'rgba(255,107,107,0.2)', borderColor: '#ff6b6b' }, btI: { fontSize: 28 }, btL: { fontSize: 12, fontWeight: '700', color: p.text, marginTop: 2 },
  tm: { fontSize: 24, fontWeight: '700', color: '#4ecdc4', marginTop: 8, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  as: { color: '#ff6b6b', fontSize: 9, marginTop: 2 },
  lv: { width: '100%', height: 10, backgroundColor: p.bg0, borderRadius: 5, marginTop: 8, overflow: 'hidden' }, lvF: { height: '100%', backgroundColor: '#4ecdc4', borderRadius: 5 },
  gp: { color: p.muted, fontSize: 9, marginTop: 4 },
  // 3D Spektrogramm Styles
  spectrogram: { backgroundColor: p.bg3, borderRadius: 10, padding: 10, marginBottom: 8 },
  spectrogramHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  spectrogramReset: { backgroundColor: 'rgba(78,205,196,0.2)', borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  spectrogramResetT: { color: '#4ecdc4', fontSize: 14, fontWeight: '700' },
  spectrogramContainer: { height: 200, borderRadius: 8, overflow: 'hidden', backgroundColor: p.bg2, position: 'relative' },
  spectrogramView: { flex: 1, backgroundColor: 'transparent' },
  spectrogramOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: p.specOverlay },
  spectrogramHint: { color: '#4ecdc4', fontSize: 12, textAlign: 'center' },
  spectrogramSubHint: { color: p.muted2, fontSize: 10, marginTop: 6 },
  freqLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8, marginTop: 6 },
  freqLabel: { fontSize: 9, fontWeight: '600' },
  dt: { flexDirection: 'row', alignItems: 'center', backgroundColor: p.row, padding: 8, borderRadius: 6, marginBottom: 3, width: '100%' }, dtI: { fontSize: 20, marginRight: 8 }, dtC: { flex: 1 }, dtS: { color: p.text, fontWeight: '600', fontSize: 12 }, dtSc: { color: p.muted, fontSize: 9, fontStyle: 'italic' }, dtP: { fontSize: 11, fontWeight: '700' },
  em: { color: p.muted2, textAlign: 'center', paddingVertical: 16 },
  ss: { flexDirection: 'row', marginTop: 4 }, sst: { flex: 1, backgroundColor: p.bg3, borderRadius: 8, padding: 10, alignItems: 'center', marginHorizontal: 2 }, ssV: { fontSize: 18, fontWeight: '700', color: '#4ecdc4' }, ssL: { fontSize: 8, color: p.muted, textTransform: 'uppercase', marginTop: 2 },
  fR: { flexDirection: 'row', marginBottom: 8, gap: 4 }, se: { flex: 1, backgroundColor: p.bg3, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, color: p.text, fontSize: 12 }, fB: { backgroundColor: p.bg3, borderRadius: 8, padding: 8 },
  li: { backgroundColor: p.bg3, borderRadius: 8, marginBottom: 4, overflow: 'hidden' }, lm: { flexDirection: 'row', alignItems: 'center', padding: 8 }, lIc: { fontSize: 18, marginRight: 8 }, lIn: { flex: 1 }, lSp: { color: p.text, fontWeight: '600', fontSize: 12 }, lMt: { color: p.muted2, fontSize: 9 }, lCf: { fontSize: 11, fontWeight: '700' },
  fb: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: p.bg2 }, fbB: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRightWidth: 1, borderRightColor: p.bg2 }, fbA: { backgroundColor: 'rgba(78,205,196,0.2)' },
  lb: { flexDirection: 'row', alignItems: 'center', backgroundColor: p.bg3, borderRadius: 8, padding: 10, marginBottom: 4 }, lbI: { fontSize: 24, marginRight: 10 }, lbC: { flex: 1 }, lbN: { color: p.text, fontWeight: '600', fontSize: 12 }, lbS: { color: '#4ecdc4', fontSize: 10, fontStyle: 'italic' }, lbF: { color: p.muted2, fontSize: 9 }, lbR: { fontSize: 9 },
  sc: { color: p.muted, fontSize: 11, fontWeight: '600', marginBottom: 8, marginTop: 8 },
  sC: { backgroundColor: p.bg3, borderRadius: 10, padding: 12, marginBottom: 8, position: 'relative' }, sH: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }, sD: { color: p.text, fontWeight: '600', fontSize: 12 }, sT: { color: '#4ecdc4', fontSize: 11 }, sSt: { flexDirection: 'row', marginBottom: 6 }, sSi: { flex: 1, alignItems: 'center' }, sSV: { color: '#4ecdc4', fontSize: 16, fontWeight: '700' }, sSL: { color: p.muted2, fontSize: 8, textTransform: 'uppercase' }, sM: { color: p.muted, fontSize: 9, borderTopWidth: 1, borderTopColor: p.bg2, paddingTop: 6 },
  sDelBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(255,107,107,0.2)', borderRadius: 15, width: 30, height: 30, alignItems: 'center', justifyContent: 'center' }, sDelBtnT: { fontSize: 14 },
  rC: { backgroundColor: p.bg3, borderRadius: 10, padding: 16, alignItems: 'center', marginBottom: 12 }, rI: { fontSize: 40 }, rN: { color: p.text, fontSize: 16, fontWeight: '700', marginTop: 6 }, rP: { color: '#4ecdc4', fontSize: 11, marginTop: 2 },
  ac: { flexDirection: 'row', alignItems: 'center', backgroundColor: p.bg3, borderRadius: 8, padding: 10, marginBottom: 4, opacity: 0.5 }, acU: { opacity: 1, borderLeftWidth: 3, borderLeftColor: '#4ecdc4' }, acI: { fontSize: 20, marginRight: 8 }, acC: { flex: 1 }, acN: { color: p.text, fontWeight: '600', fontSize: 11 }, acD: { color: p.muted, fontSize: 9 }, acP: { color: '#4ecdc4', fontSize: 11, fontWeight: '700' },
  exC: { flexDirection: 'row', gap: 8, marginTop: 8 }, ex: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: p.bg3, borderRadius: 8, padding: 12 }, exI: { fontSize: 18, marginRight: 8 }, exT: { color: p.text, fontSize: 12 },
  mo: { flex: 1, backgroundColor: p.modalBg, justifyContent: 'center', alignItems: 'center' }, moS: { backgroundColor: p.bg3, borderRadius: 12, padding: 16, width: '88%', maxHeight: '80%' }, moL: { backgroundColor: p.bg3, borderRadius: 12, padding: 14, width: '90%', maxHeight: '82%' }, moT: { fontSize: 16, fontWeight: '700', color: p.text, textAlign: 'center', marginBottom: 12 },
  dI: { fontSize: 48, textAlign: 'center' }, dN: { fontSize: 18, fontWeight: '700', color: p.text, textAlign: 'center', marginTop: 6 }, dS: { fontSize: 11, color: '#4ecdc4', fontStyle: 'italic', textAlign: 'center', marginBottom: 10 }, dSc: { fontSize: 11, fontWeight: '600', color: '#4ecdc4', marginTop: 10, marginBottom: 4 }, dT: { color: p.desc, fontSize: 11, lineHeight: 18 }, dG: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }, dCe: { width: '33%', padding: 6 }, dCL: { color: p.muted, fontSize: 8, textTransform: 'uppercase' }, dCV: { color: p.text, fontSize: 11, fontWeight: '600' }, dF: { color: p.desc, fontSize: 10, marginBottom: 2 }, aB: { backgroundColor: '#4ecdc4', borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 12 }, aBT: { color: '#000', fontWeight: '600', fontSize: 12 },
  rpH: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }, rpD: { color: p.text, fontSize: 14, fontWeight: '600' }, rpT: { color: '#4ecdc4', fontSize: 18, fontWeight: '700' },
  rpS: { flexDirection: 'row', marginBottom: 12, gap: 6 }, rpSi: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(78,205,196,0.1)', borderRadius: 8, padding: 10 }, rpSV: { color: '#4ecdc4', fontSize: 20, fontWeight: '700' }, rpSL: { color: p.muted, fontSize: 8, textTransform: 'uppercase', marginTop: 2 },
  spR: { flexDirection: 'row', alignItems: 'center', backgroundColor: p.row, padding: 8, borderRadius: 6, marginBottom: 3 }, spN: { color: '#4ecdc4', fontSize: 12, fontWeight: '700', width: 20 }, spI: { fontSize: 16, marginRight: 6 }, spNm: { flex: 1, color: p.text, fontSize: 11 }, spC: { color: p.muted, fontSize: 10 },
  bio: { flexDirection: 'row', gap: 8, marginBottom: 12 }, bioI: { flex: 1, backgroundColor: 'rgba(78,205,196,0.1)', borderRadius: 8, padding: 10, alignItems: 'center' }, bioL: { color: p.muted, fontSize: 8, textTransform: 'uppercase' }, bioV: { color: '#4ecdc4', fontSize: 18, fontWeight: '700', marginTop: 2 },
  lbl: { color: p.text, fontSize: 11, fontWeight: '600', marginTop: 10, marginBottom: 4 }, inp: { backgroundColor: p.bg0, borderWidth: 1, borderColor: p.border, borderRadius: 6, padding: 8, color: p.text, fontSize: 11 },
  hint: { color: '#ff6b6b', fontSize: 9, fontStyle: 'italic', marginTop: 4, marginBottom: 8 },
  sw: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: p.bg2 }, swL: { color: p.text, fontSize: 11 },
  mS: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 }, mO: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: p.bg0, borderRadius: 6, borderWidth: 1, borderColor: p.border }, mOA: { backgroundColor: '#4ecdc4', borderColor: '#4ecdc4' }, mOT: { color: p.text, fontSize: 10 },
  cfR: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 }, cfB: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: p.bg0, borderRadius: 6 }, cfA: { backgroundColor: '#4ecdc4' }, cfT: { color: p.text, fontSize: 10 },
  sBtns: { flexDirection: 'row', gap: 8, marginTop: 12 }, sv: { flex: 1, backgroundColor: '#4ecdc4', borderRadius: 8, padding: 10, alignItems: 'center' }, svT: { color: '#000', fontWeight: '600', fontSize: 12 },
  sDel: { flex: 1, backgroundColor: '#ff6b6b', borderRadius: 8, padding: 10, alignItems: 'center' }, sDelT: { color: p.text, fontWeight: '600', fontSize: 12 },
  cl: { backgroundColor: p.border, borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 6 }, clT: { color: p.text, fontWeight: '600', fontSize: 12 },
  upd: { backgroundColor: '#ff6b35', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 4, marginBottom: 2, alignSelf: 'flex-start' },
  updT: { color: p.text, fontSize: 11, fontWeight: '600' },
  mapFilterBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: p.bg3, paddingHorizontal: 8, paddingVertical: 6 },
  mapFilterInput: { flex: 1, backgroundColor: p.bg0, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, color: p.text, fontSize: 12, borderWidth: 1, borderColor: p.border },
  mapFilterClear: { color: '#ff6b6b', fontSize: 18, paddingHorizontal: 10, fontWeight: '700' },
  mapOptT: { paddingHorizontal: 8, paddingVertical: 4 },
  mapOptTT: { color: '#4ecdc4', fontSize: 16 },
  mapOpts: { backgroundColor: p.bg3, paddingHorizontal: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: p.bg0 },
  mapOptLbl: { color: p.muted, fontSize: 10, marginTop: 4, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  mapOptRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  mapChip: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: p.bg0, borderRadius: 14, borderWidth: 1, borderColor: p.border },
  mapChipA: { backgroundColor: '#4ecdc4', borderColor: '#4ecdc4' },
  mapChipT: { color: p.text, fontSize: 11 },
  mapChipTA: { color: '#000', fontWeight: '700' },
}); }

export default App;

