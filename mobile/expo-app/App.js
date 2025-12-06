/**
 * BirdSound v5.5.1 - Multi-Model, Session Reports, Advanced Settings, MAP VIEW, BACKGROUND RECORDING, 3D SPECTROGRAM, AUTO-RECONNECT
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, StatusBar, Platform, Alert, TextInput, Modal, Switch, Share, FlatList, Dimensions, AppState } from 'react-native';
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

const URL = 'https://available-nonsegmentary-arlene.ngrok-free.dev';
const BACKGROUND_LOCATION_TASK = 'background-location-task';

// 3D Spektrogramm (Wasserfall-Diagramm) HTML/WebGL
const SPECTROGRAM_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #1a1a2e; overflow: hidden; touch-action: none; }
    canvas { display: block; width: 100%; height: 100%; }
    #info { position: absolute; bottom: 8px; left: 8px; color: #4ecdc4; font-family: monospace; font-size: 10px; opacity: 0.8; }
    #freq { position: absolute; top: 8px; right: 8px; color: #fff; font-family: monospace; font-size: 11px; text-align: right; line-height: 1.6; }
    #axes { position: absolute; bottom: 8px; right: 8px; color: #888; font-family: monospace; font-size: 9px; }
  </style>
</head>
<body>
  <canvas id="canvas"></canvas>
  <div id="info">3D Spektrogramm</div>
  <div id="freq">
    <div style="color:#00ff00">8kHz</div>
    <div style="color:#80ff00">4kHz</div>
    <div style="color:#ffff00">2kHz</div>
    <div style="color:#ff8000">1kHz</div>
  </div>
  <script>
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const info = document.getElementById('info');
    
    // Konfiguration - Waterfall Chart Style
    const CONFIG = {
      bands: 128,          // Mehr Frequenzbänder für feinere Auflösung
      history: 100,        // Längere Zeithistorie (Tiefe)
      perspective: 800,    // Perspektive-Distanz
      rotationX: 0.65,     // X-Rotation (Neigung) - flacher Blickwinkel
      rotationY: -0.35,    // Y-Rotation - leicht gedreht
      smoothing: 0.6,      // Glättung
      heightScale: 200,    // Höhenskalierung der Balken
      baseHeight: 0,       // Basishöhe
      gridLines: true,     // Gitterlinien anzeigen
    };
    
    // Datenstrukturen
    let spectrogramData = [];
    let currentBands = new Array(CONFIG.bands).fill(0);
    let animationId = null;
    
    // Canvas-Größe
    function resize() {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
    }
    window.addEventListener('resize', resize);
    resize();
    
    // Waterfall-Farbpalette: Rot -> Orange -> Gelb -> Grün (wie in den Screenshots)
    function getWaterfallColor(value) {
      const v = Math.min(1, Math.max(0, value));
      let r, g, b;
      
      if (v < 0.25) {
        // Rot zu Orange
        const t = v / 0.25;
        r = 255;
        g = Math.floor(80 * t);
        b = 0;
      } else if (v < 0.5) {
        // Orange zu Gelb
        const t = (v - 0.25) / 0.25;
        r = 255;
        g = 80 + Math.floor(175 * t);
        b = 0;
      } else if (v < 0.75) {
        // Gelb zu Hellgrün
        const t = (v - 0.5) / 0.25;
        r = 255 - Math.floor(155 * t);
        g = 255;
        b = 0;
      } else {
        // Hellgrün zu Grün
        const t = (v - 0.75) / 0.25;
        r = 100 - Math.floor(100 * t);
        g = 255;
        b = Math.floor(50 * t);
      }
      
      return { r, g, b };
    }
    
    // 3D Projektion - isometrische Perspektive wie Waterfall Chart
    function project3D(x, y, z) {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const centerX = w * 0.5;
      const centerY = h * 0.75;
      
      // Rotation anwenden
      const cosX = Math.cos(CONFIG.rotationX);
      const sinX = Math.sin(CONFIG.rotationX);
      const cosY = Math.cos(CONFIG.rotationY);
      const sinY = Math.sin(CONFIG.rotationY);
      
      // Y-Achsen-Rotation
      const x1 = x * cosY - z * sinY;
      const z1 = x * sinY + z * cosY;
      
      // X-Achsen-Rotation
      const y1 = y * cosX - z1 * sinX;
      const z2 = y * sinX + z1 * cosX;
      
      // Perspektivische Projektion
      const scale = CONFIG.perspective / (CONFIG.perspective + z2);
      
      return {
        x: centerX + x1 * scale,
        y: centerY - y1 * scale,
        z: z2,
        scale: scale
      };
    }
    
    // Zeichne Gitterlinien auf der Grundfläche
    function drawGrid() {
      const w = window.innerWidth;
      const gridWidth = w * 0.8;
      const gridDepth = w * 0.6;
      const gridLines = 10;
      
      ctx.strokeStyle = 'rgba(100, 100, 120, 0.4)';
      ctx.lineWidth = 1;
      
      // Horizontale Linien (Frequenz)
      for (let i = 0; i <= gridLines; i++) {
        const x = -gridWidth/2 + (i / gridLines) * gridWidth;
        const p1 = project3D(x, 0, 0);
        const p2 = project3D(x, 0, gridDepth);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
      
      // Vertikale Linien (Zeit)
      for (let i = 0; i <= gridLines; i++) {
        const z = (i / gridLines) * gridDepth;
        const p1 = project3D(-gridWidth/2, 0, z);
        const p2 = project3D(gridWidth/2, 0, z);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
      
      // Achsenbeschriftung
      ctx.fillStyle = '#888';
      ctx.font = '10px monospace';
      
      // Frequenz-Achse
      const freqLabels = ['1kHz', '2kHz', '4kHz', '8kHz'];
      freqLabels.forEach((label, i) => {
        const x = -gridWidth/2 + ((i + 1) / 5) * gridWidth;
        const p = project3D(x, 0, gridDepth + 20);
        ctx.fillText(label, p.x - 15, p.y + 15);
      });
    }
    
    // Zeichne Achsen
    function drawAxes() {
      const w = window.innerWidth;
      const axisLen = w * 0.1;
      
      // Y-Achse (Amplitude)
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 1;
      
      const origin = project3D(-w * 0.4, 0, 0);
      const yTop = project3D(-w * 0.4, CONFIG.heightScale * 1.2, 0);
      
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(yTop.x, yTop.y);
      ctx.stroke();
      
      // Y-Achsen-Striche
      for (let i = 1; i <= 4; i++) {
        const y = (i / 4) * CONFIG.heightScale * 1.2;
        const p = project3D(-w * 0.4, y, 0);
        ctx.beginPath();
        ctx.moveTo(p.x - 5, p.y);
        ctx.lineTo(p.x + 5, p.y);
        ctx.stroke();
      }
    }
    
    // Hauptzeichenfunktion - Waterfall 3D
    function draw() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      
      // Hintergrund
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, w, h);
      
      // Gitter und Achsen
      if (CONFIG.gridLines) {
        drawGrid();
        drawAxes();
      }
      
      const gridWidth = w * 0.8;
      const gridDepth = w * 0.6;
      const bandWidth = gridWidth / CONFIG.bands;
      const rowDepth = gridDepth / CONFIG.history;
      
      // Spektrogramm von hinten nach vorne zeichnen (Painter's Algorithm)
      for (let z = spectrogramData.length - 1; z >= 0; z--) {
        const row = spectrogramData[z];
        if (!row) continue;
        
        const zPos = z * rowDepth;
        const nextZPos = (z + 1) * rowDepth;
        
        for (let x = 0; x < row.length - 1; x++) {
          const value = row[x] || 0;
          const nextValue = row[x + 1] || 0;
          const nextRowValue = (spectrogramData[z + 1] && spectrogramData[z + 1][x]) || 0;
          const nextRowNextValue = (spectrogramData[z + 1] && spectrogramData[z + 1][x + 1]) || 0;
          
          const xPos = -gridWidth/2 + x * bandWidth;
          const nextXPos = -gridWidth/2 + (x + 1) * bandWidth;
          
          const height = value * CONFIG.heightScale;
          const nextHeight = nextValue * CONFIG.heightScale;
          const backHeight = nextRowValue * CONFIG.heightScale;
          const backNextHeight = nextRowNextValue * CONFIG.heightScale;
          
          // 4 Eckpunkte der Oberfläche
          const p1 = project3D(xPos, height, zPos);
          const p2 = project3D(nextXPos, nextHeight, zPos);
          const p3 = project3D(nextXPos, backNextHeight, nextZPos);
          const p4 = project3D(xPos, backHeight, nextZPos);
          
          // Durchschnittswert für Farbe
          const avgValue = (value + nextValue + nextRowValue + nextRowNextValue) / 4;
          
          if (avgValue > 0.01) {
            const color = getWaterfallColor(avgValue);
            
            // Schattierung basierend auf Tiefe
            const depthFade = 1 - (z / CONFIG.history) * 0.5;
            const r = Math.floor(color.r * depthFade);
            const g = Math.floor(color.g * depthFade);
            const b = Math.floor(color.b * depthFade);
            
            // Fläche zeichnen
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineTo(p3.x, p3.y);
            ctx.lineTo(p4.x, p4.y);
            ctx.closePath();
            
            ctx.fillStyle = \`rgb(\${r},\${g},\${b})\`;
            ctx.fill();
            
            // Leichte Konturlinie für 3D-Effekt
            if (avgValue > 0.1) {
              ctx.strokeStyle = \`rgba(\${Math.min(255, r + 30)},\${Math.min(255, g + 30)},\${b},0.3)\`;
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          }
          
          // Vertikale Balken von der Grundfläche - nur für stärkere Signale
          if (value > 0.15 && z < 3) {
            const base = project3D(xPos + bandWidth/2, 0, zPos);
            const top = project3D(xPos + bandWidth/2, height, zPos);
            
            const color = getWaterfallColor(value);
            ctx.strokeStyle = \`rgba(\${color.r},\${color.g},\${color.b},0.6)\`;
            ctx.lineWidth = Math.max(1, bandWidth * p1.scale * 0.5);
            ctx.beginPath();
            ctx.moveTo(base.x, base.y);
            ctx.lineTo(top.x, top.y);
            ctx.stroke();
          }
        }
      }
      
      // Info aktualisieren
      const maxBand = currentBands.indexOf(Math.max(...currentBands));
      const dominantFreq = Math.round((maxBand / CONFIG.bands) * 8000);
      const maxVal = Math.max(...currentBands);
      if (dominantFreq > 200 && maxVal > 0.05) {
        info.textContent = \`🎵 \${dominantFreq} Hz • Level: \${Math.round(maxVal * 100)}%\`;
      } else {
        info.textContent = '3D Spektrogramm';
      }
    }
    
    // Animation
    function animate() {
      draw();
      animationId = requestAnimationFrame(animate);
    }
    animate();
    
    // Audio-Daten vom React Native empfangen
    function updateSpectrum(data) {
      if (!data || !data.length) return;
      
      // Smooth interpolation
      for (let i = 0; i < CONFIG.bands; i++) {
        const srcIdx = Math.floor(i * data.length / CONFIG.bands);
        const value = data[srcIdx] || 0;
        currentBands[i] = currentBands[i] * CONFIG.smoothing + value * (1 - CONFIG.smoothing);
      }
      
      // Add to history
      spectrogramData.unshift([...currentBands]);
      if (spectrogramData.length > CONFIG.history) {
        spectrogramData.pop();
      }
    }
    
    // Simulierte Frequenzdaten basierend auf Audio-Level
    function updateFromLevel(level) {
      const normalizedLevel = Math.min(1, level / 100);
      const bands = new Array(CONFIG.bands);
      
      for (let i = 0; i < CONFIG.bands; i++) {
        const freqFactor = i / CONFIG.bands;
        // Vogelstimmen: 1-8 kHz, Peak bei 2-4 kHz
        const birdPeak1 = Math.exp(-Math.pow((freqFactor - 0.3) * 4, 2));
        const birdPeak2 = Math.exp(-Math.pow((freqFactor - 0.5) * 5, 2)) * 0.7;
        const birdWeight = birdPeak1 + birdPeak2;
        
        // Natürliche Variation mit Harmonischen
        const harmonics = Math.sin(freqFactor * Math.PI * 8) * 0.2 + 0.8;
        const noise = 0.5 + Math.random() * 0.5;
        
        bands[i] = normalizedLevel * birdWeight * noise * harmonics;
      }
      
      updateSpectrum(bands);
    }
    
    // Clear Spektrogramm
    function clearSpectrum() {
      spectrogramData = [];
      currentBands = new Array(CONFIG.bands).fill(0);
    }
    
    // Handler für Nachrichten von React Native
    function handleMessage(event) {
      try {
        const data = event.data || event.detail;
        const msg = typeof data === 'string' ? JSON.parse(data) : data;
        if (msg.type === 'level') {
          updateFromLevel(msg.value);
        } else if (msg.type === 'spectrum') {
          updateSpectrum(msg.data);
        } else if (msg.type === 'clear') {
          clearSpectrum();
        } else if (msg.type === 'config') {
          Object.assign(CONFIG, msg.config);
        }
      } catch(e) { console.log('Message parse error:', e); }
    }
    
    // Beide Event-Typen für Android und iOS Kompatibilität
    window.addEventListener('message', handleMessage);
    document.addEventListener('message', handleMessage);
    
    // Touch-Interaktion für Rotation
    let touchStart = null;
    let lastPinchDist = 0;
    
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        lastPinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    });
    
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length === 1 && touchStart) {
        const dx = e.touches[0].clientX - touchStart.x;
        const dy = e.touches[0].clientY - touchStart.y;
        CONFIG.rotationY = Math.max(-1, Math.min(1, CONFIG.rotationY + dx * 0.003));
        CONFIG.rotationX = Math.max(0.3, Math.min(1.2, CONFIG.rotationX + dy * 0.003));
        touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const delta = dist - lastPinchDist;
        CONFIG.heightScale = Math.max(50, Math.min(400, CONFIG.heightScale + delta * 0.5));
        lastPinchDist = dist;
      }
    });
    
    canvas.addEventListener('touchend', () => { touchStart = null; });
  </script>
</body>
</html>
`;

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
    backendUrl: URL, chunkDuration: 3, minConfidence: 0.1, enableGPS: true, offlineMode: true,
    selectedModel: null, consensusMethod: 'weighted_average', autoStopMinutes: 0,
    backgroundRecording: false,  // Neue Einstellung für Hintergrund-Aufnahme
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
  
  const recordingRef = useRef(null);
  const timerRef = useRef(null);
  const analysisRef = useRef(null);
  const autoStopRef = useRef(null);
  const sessionRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const spectrogramRef = useRef(null);

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
    if (settings.enableGPS) initGPS();
  };

  const cleanup = () => { stopStreaming(); };

  const loadData = async () => {
    try {
      const [det, stats, queue, sessions, saved] = await Promise.all([
        AsyncStorage.getItem('detections'), AsyncStorage.getItem('userStats'),
        AsyncStorage.getItem('offlineQueue'), AsyncStorage.getItem('sessionHistory'),
        AsyncStorage.getItem('settings'),
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
      return savedUrl;
    } catch (e) { return null; }
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
        const loc = await Location.getCurrentPositionAsync({}); 
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
      
      const r = await fetch(`${settings.backendUrl}/api/v1/predict/upload`, { 
        method: 'POST', 
        headers: { 'ngrok-skip-browser-warning': '1' }, 
        body: form 
      });
      const result = await r.json();
      if (sessionRef.current) sessionRef.current.totalAnalyzed++;
      if (result.predictions?.length > 0) processDet(result.predictions, uri, result.consensus);
    } catch (e) { console.log('Analysis error:', e); }
  };

  const processDet = (preds, uri, consensus) => {
    const ts = new Date();
    const newDets = preds.filter(p => p.confidence >= settings.minConfidence).slice(0, 5).map(p => {
      const sp = p.common_name || p.species;
      const bird = BIRD_LIBRARY[sp] || {};
      return { id: Date.now() + Math.random(), species: sp, scientific: p.scientific_name || '', confidence: p.confidence, time: ts.toISOString(), location: location ? { lat: location.latitude, lng: location.longitude } : null, audioUri: uri, feedback: null, model: p.model || 'unknown', consensus, ...bird };
    });
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
  const shareDetection = async (d) => { await Share.share({ message: `🐦 ${d.species} erkannt! ${Math.round(d.confidence*100)}% #BirdSound` }); };
  const exportKML = async () => { const dets = detections.filter(d => d.location); if (!dets.length) { Alert.alert('Keine GPS-Daten'); return; } const kml = `<?xml version="1.0"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>BirdSound</name>${dets.map(d => `<Placemark><name>${d.species}</name><Point><coordinates>${d.location.lng},${d.location.lat}</coordinates></Point></Placemark>`).join('')}</Document></kml>`; const p = `${FileSystem.documentDirectory}birds.kml`; await FileSystem.writeAsStringAsync(p, kml); await Sharing.shareAsync(p); };
  const exportJSON = async () => { const p = `${FileSystem.documentDirectory}birds.json`; await FileSystem.writeAsStringAsync(p, JSON.stringify({ stats: userStats, detections, sessions: sessionHistory })); await Sharing.shareAsync(p); };
  
  const calcShannon = (c) => { const v = Object.values(c || {}); if (!v.length) return 0; const t = v.reduce((a,b)=>a+b,0); return -v.reduce((s,n) => { const p=n/t; return s+(p>0?p*Math.log(p):0); },0); };
  const calcSimpson = (c) => { const v = Object.values(c || {}); if (!v.length) return 0; const t = v.reduce((a,b)=>a+b,0); return 1-(v.reduce((s,n)=>s+(n*(n-1)),0)/(t*(t-1)||1)); };
  
  const exportSessionReport = async (session) => {
    const d = Math.floor(session.duration || 0);
    const sp = Object.entries(session.speciesCount || {}).sort((a,b)=>b[1]-a[1]);
    const report = `🐦 BIRDSOUND SESSION\n\n📅 ${new Date(session.startTime).toLocaleDateString('de-DE')}\n⏱️ ${Math.floor(d/60)}:${(d%60).toString().padStart(2,'0')}\n🤖 ${session.modelUsed}\n\n📊 ${session.detections?.length || 0} Erkennungen, ${sp.length} Arten\n\n🦅 TOP ARTEN:\n${sp.slice(0,10).map((s,i)=>`${i+1}. ${s[0]} (${s[1]}x)`).join('\n')}\n\n📈 Shannon: ${calcShannon(session.speciesCount).toFixed(2)} | Simpson: ${calcSimpson(session.speciesCount).toFixed(2)}`;
    const p = `${FileSystem.documentDirectory}session_${session.id}.txt`;
    await FileSystem.writeAsStringAsync(p, report); await Sharing.shareAsync(p);
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
      <View style={z.h}><View><Text style={z.t}>🐦 BirdSound v5.5</Text><Text style={z.st}>{rank.icon} {rank.name} • {points}P</Text></View><View style={z.hr}><View style={[z.bg, isConnected ? z.bgG : z.bgR]}><Text style={z.bgT}>{isConnected ? '🟢' : '🔴'}{offlineQueue.length > 0 ? ` (${offlineQueue.length})` : ''}</Text></View><TouchableOpacity onPress={() => setShowSettings(true)}><Text style={z.ic}>⚙️</Text></TouchableOpacity></View></View>
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
        <WebView
          style={z.map}
          originWhitelist={['*']}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          source={{ html: `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body { margin: 0; padding: 0; }
    #map { width: 100%; height: 100vh; background: #1a1a2e; }
    .bird-marker { background: rgba(78, 205, 196, 0.9); border-radius: 50%; padding: 8px; font-size: 20px; text-align: center; border: 2px solid #fff; box-shadow: 0 2px 10px rgba(0,0,0,0.3); }
    .leaflet-popup-content { text-align: center; }
    .popup-title { font-weight: bold; color: #333; }
    .popup-conf { color: #4ecdc4; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const detections = ${JSON.stringify(detWithLocation.map(d => ({
      lat: d.location?.lat || 0,
      lng: d.location?.lng || 0,
      species: d.species,
      confidence: d.confidence,
      time: d.time,
      icon: '🐦'
    })))};
    const userLat = ${location?.latitude || 51.5};
    const userLng = ${location?.longitude || 10.0};
    
    const map = L.map('map').setView([userLat, userLng], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(map);
    
    // User location marker
    L.circleMarker([userLat, userLng], {
      radius: 10, fillColor: '#4ecdc4', color: '#fff', weight: 2, fillOpacity: 0.8
    }).addTo(map).bindPopup('📍 Dein Standort');
    
    // Detection markers
    detections.forEach(d => {
      if (d.lat && d.lng) {
        const icon = L.divIcon({ className: '', html: '<div class="bird-marker">' + d.icon + '</div>', iconSize: [40, 40], iconAnchor: [20, 20] });
        L.marker([d.lat, d.lng], { icon })
          .addTo(map)
          .bindPopup('<div class="popup-title">' + d.species + '</div><div class="popup-conf">' + Math.round(d.confidence * 100) + '%</div><div>' + new Date(d.time).toLocaleString() + '</div>');
      }
    });
    
    // Fit bounds if detections exist
    if (detections.length > 0) {
      const bounds = detections.filter(d => d.lat && d.lng).map(d => [d.lat, d.lng]);
      if (bounds.length > 0) map.fitBounds(bounds, { padding: [50, 50] });
    }
  </script>
</body>
</html>
          ` }}
        />
        <View style={z.mapO}>
          <Text style={z.mapSt}>📍 {detWithLocation.length} Fundorte</Text>
          <TouchableOpacity style={z.mapB} onPress={exportKML}><Text style={z.mapBT}>🌍 KML Export</Text></TouchableOpacity>
        </View>
      </View>)}

      {activeTab === 'list' && (<View style={z.ct}>
        <View style={z.fR}><TextInput style={z.se} placeholder="Suchen..." placeholderTextColor="#666" value={filter.species} onChangeText={t => setFilter({...filter, species: t})} /><TouchableOpacity style={z.fB} onPress={exportKML}><Text>📤</Text></TouchableOpacity></View>
        <FlatList data={filtered} keyExtractor={i => i.id.toString()} renderItem={({ item: d }) => (
          <View style={z.li}><TouchableOpacity style={z.lm} onPress={() => setShowBirdDetail(d)}><Text style={z.lIc}>{BIRD_LIBRARY[d.species]?.icon || '🐦'}</Text><View style={z.lIn}><Text style={z.lSp}>{d.species}</Text><Text style={z.lMt}>{new Date(d.time).toLocaleString()} {d.location ? '📍' : ''} • {d.model}</Text></View><Text style={[z.lCf, { color: cc(d.confidence) }]}>{Math.round(d.confidence*100)}%</Text></TouchableOpacity>
          <View style={z.fb}><TouchableOpacity style={[z.fbB, d.feedback === true && z.fbA]} onPress={() => submitFeedback(d.id, true)}><Text>👍</Text></TouchableOpacity><TouchableOpacity style={[z.fbB, d.feedback === false && z.fbA]} onPress={() => submitFeedback(d.id, false)}><Text>👎</Text></TouchableOpacity><TouchableOpacity style={z.fbB} onPress={() => shareDetection(d)}><Text>📤</Text></TouchableOpacity></View></View>
        )} />
      </View>)}

      {activeTab === 'library' && (<View style={z.ct}>
        <TextInput style={z.se} placeholder="Vogel suchen..." placeholderTextColor="#666" value={searchQuery} onChangeText={setSearchQuery} />
        <FlatList data={Object.entries(BIRD_LIBRARY).filter(([k]) => k.toLowerCase().includes(searchQuery.toLowerCase()))} keyExtractor={([k]) => k} renderItem={({ item: [key, bird] }) => (
          <TouchableOpacity style={z.lb} onPress={() => setShowBirdDetail(bird)}><Text style={z.lbI}>{bird.icon || '🐦'}</Text><View style={z.lbC}><Text style={z.lbN}>{bird.germanName || key}</Text><Text style={z.lbS}>{bird.scientificName}</Text><Text style={z.lbF}>{bird.family}</Text></View><Text style={z.lbR}>{'⭐'.repeat(bird.rarity || 1)}</Text></TouchableOpacity>
        )} />
      </View>)}

      {activeTab === 'sessions' && (<ScrollView style={z.ct}>
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
        <View style={z.exC}><TouchableOpacity style={z.ex} onPress={exportKML}><Text style={z.exI}>🌍</Text><Text style={z.exT}>KML</Text></TouchableOpacity><TouchableOpacity style={z.ex} onPress={exportJSON}><Text style={z.exI}>📋</Text><Text style={z.exT}>JSON</Text></TouchableOpacity></View>
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
          {showBirdDetail.funFacts && <><Text style={z.dSc}>💡 Fakten</Text>{showBirdDetail.funFacts.slice(0,3).map((f, i) => <Text key={i} style={z.dF}>• {f}</Text>)}</>}
          {showBirdDetail.confidence && <TouchableOpacity style={z.aB} onPress={() => shareDetection(showBirdDetail)}><Text style={z.aBT}>📤 Teilen</Text></TouchableOpacity>}
        </>)}</ScrollView><TouchableOpacity style={z.cl} onPress={() => setShowBirdDetail(null)}><Text style={z.clT}>Schließen</Text></TouchableOpacity></View></View>
      </Modal>

      <Modal visible={!!showSessionReport} transparent animationType="slide">
        <View style={z.mo}><View style={z.moL}><ScrollView>{showSessionReport && (<>
          <Text style={z.moT}>📊 Session-Bericht</Text>
          <View style={z.rpH}><Text style={z.rpD}>{new Date(showSessionReport.startTime).toLocaleDateString('de-DE')}</Text><Text style={z.rpT}>{fmt(showSessionReport.duration || 0)}</Text></View>
          <View style={z.rpS}><View style={z.rpSi}><Text style={z.rpSV}>{showSessionReport.detections?.length || 0}</Text><Text style={z.rpSL}>Erkennungen</Text></View><View style={z.rpSi}><Text style={z.rpSV}>{Object.keys(showSessionReport.speciesCount || {}).length}</Text><Text style={z.rpSL}>Arten</Text></View><View style={z.rpSi}><Text style={z.rpSV}>{showSessionReport.totalAnalyzed || 0}</Text><Text style={z.rpSL}>Chunks</Text></View></View>
          <Text style={z.dSc}>🦅 Arten-Ranking</Text>
          {Object.entries(showSessionReport.speciesCount || {}).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([sp,ct],i) => (<View key={sp} style={z.spR}><Text style={z.spN}>{i+1}.</Text><Text style={z.spI}>{BIRD_LIBRARY[sp]?.icon || '🐦'}</Text><Text style={z.spNm}>{sp}</Text><Text style={z.spC}>{ct}x</Text></View>))}
          <Text style={z.dSc}>📈 Biodiversität</Text>
          <View style={z.bio}><View style={z.bioI}><Text style={z.bioL}>Shannon</Text><Text style={z.bioV}>{calcShannon(showSessionReport.speciesCount).toFixed(2)}</Text></View><View style={z.bioI}><Text style={z.bioL}>Simpson</Text><Text style={z.bioV}>{calcSimpson(showSessionReport.speciesCount).toFixed(2)}</Text></View></View>
          <View style={z.sBtns}><TouchableOpacity style={z.sv} onPress={() => exportSessionReport(showSessionReport)}><Text style={z.svT}>📤 Exportieren</Text></TouchableOpacity><TouchableOpacity style={z.sDel} onPress={() => deleteSession(showSessionReport)}><Text style={z.sDelT}>{(showSessionReport.detections?.length || 0) === 0 ? '🗑️ Verwerfen' : '🗑️ Löschen'}</Text></TouchableOpacity></View>
        </>)}</ScrollView><TouchableOpacity style={z.cl} onPress={() => setShowSessionReport(null)}><Text style={z.clT}>Schließen</Text></TouchableOpacity></View></View>
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
          <TouchableOpacity style={z.sv} onPress={() => { saveData('settings', settings); fetchModels(); setShowSettings(false); }}><Text style={z.svT}>Speichern</Text></TouchableOpacity>
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
});
