/**
 * BirdSound v5.3.2 - AbortSignal Fix, Full Web Dashboard
 */
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, StatusBar, Platform, Alert, TextInput, Modal, Switch, Share, FlatList, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { Audio } from 'expo-av';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Network from 'expo-network';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { BIRD_LIBRARY } from './src/data/BirdLibrary';
import { ACHIEVEMENTS, calculateUnlockedAchievements, calculateTotalPoints, getRank } from './src/data/Achievements';

const URL = 'https://available-nonsegmentary-arlene.ngrok-free.dev';

export default function App() {
  const [settings, setSettings] = useState({
    backendUrl: URL, chunkDuration: 3, minConfidence: 0.1, enableGPS: true, offlineMode: true,
    selectedModel: null, consensusMethod: 'weighted_average', autoStopMinutes: 0,
  });
  const [availableModels, setAvailableModels] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
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
  const [mapFilter, setMapFilter] = useState({ session: 'all', species: 'all', timeRange: 'all' });
  
  const recordingRef = useRef(null);
  const timerRef = useRef(null);
  const analysisRef = useRef(null);
  const autoStopRef = useRef(null);
  const sessionRef = useRef(null);

  useEffect(() => { init(); return cleanup; }, []);
  useEffect(() => { const i = setInterval(checkNetwork, 10000); return () => clearInterval(i); }, []);

  const init = async () => {
    await loadData(); await checkNetwork(); await checkBackend(); await fetchModels();
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
      if (saved) setSettings(s => ({ ...s, ...JSON.parse(saved) }));
    } catch (e) {}
  };

  const saveData = async (key, data) => { try { await AsyncStorage.setItem(key, JSON.stringify(data)); } catch (e) {} };

  const checkNetwork = async () => {
    try {
      const state = await Network.getNetworkStateAsync();
      setIsOnline(state.isConnected && state.isInternetReachable);
      if (state.isConnected && offlineQueue.length > 0) syncQueue();
    } catch (e) { setIsOnline(false); }
  };

  // Timeout helper for older Android versions
  const fetchWithTimeout = (url, options = {}, timeout = 10000) => {
    return Promise.race([
      fetch(url, options),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
    ]);
  };

  const checkBackend = async () => {
    try {
      const r = await fetchWithTimeout(`${settings.backendUrl}/health`, { headers: { 'ngrok-skip-browser-warning': '1' } }, 5000);
      const d = await r.json();
      setIsConnected(d.status === 'healthy');
    } catch (e) { setIsConnected(false); }
  };

  const fetchModels = async () => {
    try {
      console.log('[BirdSound] Fetching models from:', settings.backendUrl);
      const r = await fetchWithTimeout(`${settings.backendUrl}/api/v1/models`, { headers: { 'ngrok-skip-browser-warning': '1' } }, 10000);
      const d = await r.json();
      console.log('[BirdSound] Models response:', JSON.stringify(d));
      if (d.models && d.models.length > 0) {
        setAvailableModels(d.models);
        console.log('[BirdSound] Loaded', d.models.length, 'models');
      }
    } catch (e) { 
      console.log('[BirdSound] fetchModels error:', e.message);
    }
  };

  const initGPS = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') { const loc = await Location.getCurrentPositionAsync({}); setLocation(loc.coords); }
    } catch (e) {}
  };

  const startStreaming = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Fehler', 'Mikrofon benötigt'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      
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
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY, (s) => { if (s.metering) setAudioLevel(Math.max(0, (s.metering + 60) * 1.67)); }, 50);
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

  const filtered = detections.filter(d => !filter.species || d.species.toLowerCase().includes(filter.species.toLowerCase()));
  const { unlocked, locked } = calculateUnlockedAchievements({ ...userStats, uniqueSpecies: uniqueSpecies.size, hasOwl: detections.some(d => ['Waldkauz','Uhu'].includes(d.species)), hasWoodpecker: detections.some(d => ['Buntspecht','Grünspecht'].includes(d.species)), hasRaptor: detections.some(d => ['Mäusebussard','Turmfalke'].includes(d.species)), hasNightingale: detections.some(d => d.species === 'Nachtigall'), hasCuckoo: detections.some(d => d.species === 'Kuckuck') });
  const points = calculateTotalPoints(userStats);
  const rank = getRank(points);
  const fmt = (s) => `${Math.floor(s/60).toString().padStart(2,'0')}:${Math.floor(s%60).toString().padStart(2,'0')}`;
  const cc = (c) => c >= 0.8 ? '#51cf66' : c >= 0.5 ? '#ffd43b' : '#ff6b6b';
  const sbh = Platform.OS === 'android' ? Constants.statusBarHeight : 0;

  // Map Filter Logik
  const allDetWithLocation = detections.filter(d => d.location);
  const uniqueMapSpecies = [...new Set(allDetWithLocation.map(d => d.species))].sort();
  const uniqueMapSessions = [...new Set(allDetWithLocation.map(d => d.sessionId).filter(Boolean))];
  
  const detWithLocation = allDetWithLocation.filter(d => {
    // Session Filter
    if (mapFilter.session !== 'all' && d.sessionId !== mapFilter.session) return false;
    // Species Filter
    if (mapFilter.species !== 'all' && d.species !== mapFilter.species) return false;
    // Zeit Filter
    if (mapFilter.timeRange !== 'all') {
      const now = Date.now();
      const detTime = new Date(d.time).getTime();
      if (mapFilter.timeRange === 'today' && now - detTime > 24 * 60 * 60 * 1000) return false;
      if (mapFilter.timeRange === 'week' && now - detTime > 7 * 24 * 60 * 60 * 1000) return false;
      if (mapFilter.timeRange === 'month' && now - detTime > 30 * 24 * 60 * 60 * 1000) return false;
    }
    return true;
  });

  const mapRegion = detWithLocation.length > 0 ? {
    latitude: detWithLocation[0].location.lat,
    longitude: detWithLocation[0].location.lng,
    latitudeDelta: 0.02, longitudeDelta: 0.02
  } : location ? { latitude: location.latitude, longitude: location.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 } : { latitude: 52.52, longitude: 13.405, latitudeDelta: 0.5, longitudeDelta: 0.5 };

  return (
    <View style={z.c}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a15" />
      <View style={{ height: sbh, backgroundColor: '#0a0a15' }} />
      <View style={z.h}><View><Text style={z.t}>🐦 BirdSound v5.3.2</Text><Text style={z.st}>{rank.icon} {rank.name} • {points}P</Text></View><View style={z.hr}><View style={[z.bg, isOnline ? z.bgG : z.bgR]}><Text style={z.bgT}>{isOnline ? '🌐' : '📴'}{offlineQueue.length > 0 ? ` (${offlineQueue.length})` : ''}</Text></View><TouchableOpacity onPress={() => setShowSettings(true)}><Text style={z.ic}>⚙️</Text></TouchableOpacity></View></View>
      <View style={z.tb}>{[['live','🎙️'],['map','🗺️'],['list','📋'],['library','📚'],['sessions','📊'],['achieve','🏆']].map(([id,ic]) => (<TouchableOpacity key={id} style={[z.ta, activeTab===id && z.taA]} onPress={() => setActiveTab(id)}><Text style={z.taI}>{ic}</Text></TouchableOpacity>))}</View>

      {activeTab === 'live' && (<ScrollView style={z.ct}>
        <View style={z.mb}><Text style={z.ml}>🤖</Text><Text style={z.mn}>{settings.selectedModel || 'Alle Modelle'}</Text><Text style={z.mc}>{availableModels.length} verfügbar</Text></View>
        <View style={z.cd}>
          <TouchableOpacity onPress={() => isStreaming ? stopStreaming() : startStreaming()} disabled={!isOnline && !settings.offlineMode}>
            <View style={[z.bt, isStreaming && z.btA]}><Text style={z.btI}>{isStreaming ? '⏹️' : '▶️'}</Text><Text style={z.btL}>{isStreaming ? 'STOP' : 'START'}</Text></View>
          </TouchableOpacity>
          <Text style={z.tm}>{fmt(streamTime)}</Text>
          {settings.autoStopMinutes > 0 && <Text style={z.as}>Auto-Stop: {settings.autoStopMinutes}min</Text>}
          <View style={z.lv}><View style={[z.lvF, { width: `${audioLevel}%` }]} /></View>
          {location && <Text style={z.gp}>📍 {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</Text>}
        </View>
        <View style={z.cd}><Text style={z.cdT}>🎵 Erkennungen</Text>
          {detections.slice(0, 5).map(d => (<TouchableOpacity key={d.id} style={z.dt} onPress={() => setShowBirdDetail(d)}><Text style={z.dtI}>{BIRD_LIBRARY[d.species]?.icon || '🐦'}</Text><View style={z.dtC}><Text style={z.dtS}>{d.species}</Text><Text style={z.dtSc}>{d.scientific}</Text></View><Text style={[z.dtP, { color: cc(d.confidence) }]}>{Math.round(d.confidence*100)}%</Text></TouchableOpacity>))}
          {!detections.length && <Text style={z.em}>Starte Streaming...</Text>}
        </View>
        <View style={z.ss}><View style={z.sst}><Text style={z.ssV}>{detections.length}</Text><Text style={z.ssL}>Erkennungen</Text></View><View style={z.sst}><Text style={z.ssV}>{uniqueSpecies.size}</Text><Text style={z.ssL}>Arten</Text></View><View style={z.sst}><Text style={z.ssV}>{sessionHistory.length}</Text><Text style={z.ssL}>Sessions</Text></View></View>
      </ScrollView>)}

      {activeTab === 'map' && (<View style={z.mapC}>
        <View style={z.mapFil}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flexGrow: 0}}>
            <TouchableOpacity style={[z.mfB, mapFilter.timeRange==='all' && z.mfA]} onPress={() => setMapFilter({...mapFilter, timeRange: 'all'})}><Text style={z.mfT}>🕐 Alle</Text></TouchableOpacity>
            <TouchableOpacity style={[z.mfB, mapFilter.timeRange==='today' && z.mfA]} onPress={() => setMapFilter({...mapFilter, timeRange: 'today'})}><Text style={z.mfT}>Heute</Text></TouchableOpacity>
            <TouchableOpacity style={[z.mfB, mapFilter.timeRange==='week' && z.mfA]} onPress={() => setMapFilter({...mapFilter, timeRange: 'week'})}><Text style={z.mfT}>Woche</Text></TouchableOpacity>
            <TouchableOpacity style={[z.mfB, mapFilter.timeRange==='month' && z.mfA]} onPress={() => setMapFilter({...mapFilter, timeRange: 'month'})}><Text style={z.mfT}>Monat</Text></TouchableOpacity>
            <View style={z.mfS}/>
            <TouchableOpacity style={[z.mfB, mapFilter.species==='all' && z.mfA]} onPress={() => setMapFilter({...mapFilter, species: 'all'})}><Text style={z.mfT}>🐦 Alle Arten</Text></TouchableOpacity>
            {uniqueMapSpecies.slice(0,5).map(sp => (
              <TouchableOpacity key={sp} style={[z.mfB, mapFilter.species===sp && z.mfA]} onPress={() => setMapFilter({...mapFilter, species: sp})}>
                <Text style={z.mfT}>{BIRD_LIBRARY[sp]?.icon||'🐦'} {sp.substring(0,8)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        <WebView
          style={{flex: 1}}
          originWhitelist={['*']}
          key={`map-${mapFilter.timeRange}-${mapFilter.species}-${mapFilter.session}`}
          source={{ html: `
<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>body{margin:0;padding:0}#map{width:100vw;height:100vh}.bird-marker{background:#16213e;border:2px solid #4ecdc4;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px}.info{position:fixed;bottom:60px;left:10px;right:10px;background:rgba(22,33,62,0.95);color:#fff;padding:10px;border-radius:10px;font-family:sans-serif;font-size:11px;z-index:1000}</style>
</head><body>
<div id="map"></div>
<div class="info"><b>📍 ${detWithLocation.length}</b> von ${allDetWithLocation.length} Fundorten • <b>${Object.keys(detWithLocation.reduce((a,d)=>{a[d.species]=1;return a;},{})).length}</b> Arten</div>
<script>
var map = L.map('map').setView([${location?.latitude || detWithLocation[0]?.location?.lat || 52.52}, ${location?.longitude || detWithLocation[0]?.location?.lng || 13.405}], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution:'© OSM'}).addTo(map);
var markers = ${JSON.stringify(detWithLocation.filter(d=>d.location?.lat && d.location?.lng).map(d=>({lat:d.location.lat,lng:d.location.lng,name:d.species,conf:Math.round(d.confidence*100),time:new Date(d.time).toLocaleString('de-DE'),icon:BIRD_LIBRARY[d.species]?.icon||'🐦'})))};
markers.forEach(function(m){
  var icon = L.divIcon({className:'',html:'<div class="bird-marker">'+m.icon+'</div>',iconSize:[32,32],iconAnchor:[16,16]});
  L.marker([m.lat,m.lng],{icon:icon}).addTo(map).bindPopup('<b>'+m.name+'</b><br>'+m.conf+'%<br><small>'+m.time+'</small>');
});
if(markers.length>1){var g=L.featureGroup(markers.map(m=>L.marker([m.lat,m.lng])));map.fitBounds(g.getBounds().pad(0.1));}
</script></body></html>
          `}}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />
        <View style={z.mapO}>
          <TouchableOpacity style={z.mapB} onPress={exportKML}><Text style={z.mapBT}>🌍 KML</Text></TouchableOpacity>
          <TouchableOpacity style={[z.mapB,{marginLeft:8}]} onPress={() => setMapFilter({session:'all',species:'all',timeRange:'all'})}><Text style={z.mapBT}>↻ Reset</Text></TouchableOpacity>
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
        {sessionHistory.map(s => (<TouchableOpacity key={s.id} style={z.sC} onPress={() => setShowSessionReport(s)}>
          <View style={z.sH}><Text style={z.sD}>{new Date(s.startTime).toLocaleDateString('de-DE')}</Text><Text style={z.sT}>{fmt(s.duration || 0)}</Text></View>
          <View style={z.sSt}><View style={z.sSi}><Text style={z.sSV}>{s.detections?.length || 0}</Text><Text style={z.sSL}>Erkennungen</Text></View><View style={z.sSi}><Text style={z.sSV}>{Object.keys(s.speciesCount || {}).length}</Text><Text style={z.sSL}>Arten</Text></View></View>
          <Text style={z.sM}>🤖 {s.modelUsed === 'all' ? 'Alle' : s.modelUsed}</Text>
        </TouchableOpacity>))}
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
          <TouchableOpacity style={z.sv} onPress={() => exportSessionReport(showSessionReport)}><Text style={z.svT}>📤 Exportieren</Text></TouchableOpacity>
        </>)}</ScrollView><TouchableOpacity style={z.cl} onPress={() => setShowSessionReport(null)}><Text style={z.clT}>Schließen</Text></TouchableOpacity></View></View>
      </Modal>

      <Modal visible={showSettings} transparent animationType="fade">
        <View style={z.mo}><View style={z.moS}><ScrollView>
          <Text style={z.moT}>⚙️ Einstellungen</Text>
          <Text style={z.lbl}>Backend-URL</Text><TextInput style={z.inp} value={settings.backendUrl} onChangeText={v => setSettings({...settings, backendUrl: v})} />
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
            <Text style={z.lbl}>🤖 Modell ({availableModels.length})</Text>
            <TouchableOpacity style={{backgroundColor:'#4ECDC4',paddingHorizontal:12,paddingVertical:6,borderRadius:8}} onPress={() => { fetchModels(); checkBackend(); }}>
              <Text style={{color:'#fff',fontWeight:'bold',fontSize:12}}>🔄 Laden</Text>
            </TouchableOpacity>
          </View>
          {availableModels.length === 0 && <Text style={{color:'#ff6b6b',fontSize:12,marginBottom:8}}>⚠️ Keine Modelle gefunden. Prüfe Backend-URL und Netzwerk.</Text>}
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
  mapC: { flex: 1 }, map: { flex: 1, width: SCREEN_WIDTH }, 
  mapEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#16213e' }, mapEmT: { color: '#888', fontSize: 14 },
  mk: { backgroundColor: '#16213e', padding: 6, borderRadius: 16, borderWidth: 2, borderColor: '#4ecdc4' }, mkI: { fontSize: 18 }, 
  mapO: { position: 'absolute', bottom: 70, right: 16, backgroundColor: 'rgba(22,33,62,0.95)', borderRadius: 10, padding: 8, flexDirection: 'row' }, 
  mapInfo: { flex: 1 }, mapSt: { color: '#fff', fontSize: 12, fontWeight: '600' }, mapSub: { color: '#4ecdc4', fontSize: 10 },
  mapB: { backgroundColor: '#4ecdc4', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 }, mapBT: { color: '#000', fontWeight: '600', fontSize: 11 },
  mapFil: { backgroundColor: '#0f0f1a', paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#1a1a2e' },
  mfB: { backgroundColor: '#1a1a2e', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, marginHorizontal: 3 },
  mfA: { backgroundColor: '#4ecdc4' },
  mfT: { color: '#fff', fontSize: 11, fontWeight: '500' },
  mfS: { width: 1, backgroundColor: '#333', marginHorizontal: 6 },
  mapLeg: { position: 'absolute', top: 8, left: 8, right: 8, backgroundColor: 'rgba(22,33,62,0.95)', borderRadius: 8, padding: 8 },
  mapLegT: { color: '#888', fontSize: 10, marginBottom: 6 }, 
  mapLegI: { alignItems: 'center', marginRight: 12, backgroundColor: 'rgba(78,205,196,0.1)', padding: 6, borderRadius: 8 }, 
  mapLegIc: { fontSize: 18 }, mapLegN: { color: '#fff', fontSize: 8, marginTop: 2 },
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
  dt: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 8, borderRadius: 6, marginBottom: 3, width: '100%' }, dtI: { fontSize: 20, marginRight: 8 }, dtC: { flex: 1 }, dtS: { color: '#fff', fontWeight: '600', fontSize: 12 }, dtSc: { color: '#888', fontSize: 9, fontStyle: 'italic' }, dtP: { fontSize: 11, fontWeight: '700' },
  em: { color: '#666', textAlign: 'center', paddingVertical: 16 },
  ss: { flexDirection: 'row', marginTop: 4 }, sst: { flex: 1, backgroundColor: '#16213e', borderRadius: 8, padding: 10, alignItems: 'center', marginHorizontal: 2 }, ssV: { fontSize: 18, fontWeight: '700', color: '#4ecdc4' }, ssL: { fontSize: 8, color: '#888', textTransform: 'uppercase', marginTop: 2 },
  fR: { flexDirection: 'row', marginBottom: 8, gap: 4 }, se: { flex: 1, backgroundColor: '#16213e', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, color: '#fff', fontSize: 12 }, fB: { backgroundColor: '#16213e', borderRadius: 8, padding: 8 },
  li: { backgroundColor: '#16213e', borderRadius: 8, marginBottom: 4, overflow: 'hidden' }, lm: { flexDirection: 'row', alignItems: 'center', padding: 8 }, lIc: { fontSize: 18, marginRight: 8 }, lIn: { flex: 1 }, lSp: { color: '#fff', fontWeight: '600', fontSize: 12 }, lMt: { color: '#666', fontSize: 9 }, lCf: { fontSize: 11, fontWeight: '700' },
  fb: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#1a1a2e' }, fbB: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRightWidth: 1, borderRightColor: '#1a1a2e' }, fbA: { backgroundColor: 'rgba(78,205,196,0.2)' },
  lb: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#16213e', borderRadius: 8, padding: 10, marginBottom: 4 }, lbI: { fontSize: 24, marginRight: 10 }, lbC: { flex: 1 }, lbN: { color: '#fff', fontWeight: '600', fontSize: 12 }, lbS: { color: '#4ecdc4', fontSize: 10, fontStyle: 'italic' }, lbF: { color: '#666', fontSize: 9 }, lbR: { fontSize: 9 },
  sc: { color: '#888', fontSize: 11, fontWeight: '600', marginBottom: 8, marginTop: 8 },
  sC: { backgroundColor: '#16213e', borderRadius: 10, padding: 12, marginBottom: 8 }, sH: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }, sD: { color: '#fff', fontWeight: '600', fontSize: 12 }, sT: { color: '#4ecdc4', fontSize: 11 }, sSt: { flexDirection: 'row', marginBottom: 6 }, sSi: { flex: 1, alignItems: 'center' }, sSV: { color: '#4ecdc4', fontSize: 16, fontWeight: '700' }, sSL: { color: '#666', fontSize: 8, textTransform: 'uppercase' }, sM: { color: '#888', fontSize: 9, borderTopWidth: 1, borderTopColor: '#1a1a2e', paddingTop: 6 },
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
  sw: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1a1a2e' }, swL: { color: '#fff', fontSize: 11 },
  mS: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 }, mO: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#0a0a15', borderRadius: 6, borderWidth: 1, borderColor: '#333' }, mOA: { backgroundColor: '#4ecdc4', borderColor: '#4ecdc4' }, mOT: { color: '#fff', fontSize: 10 },
  cfR: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 }, cfB: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#0a0a15', borderRadius: 6 }, cfA: { backgroundColor: '#4ecdc4' }, cfT: { color: '#fff', fontSize: 10 },
  sv: { backgroundColor: '#4ecdc4', borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 12 }, svT: { color: '#000', fontWeight: '600', fontSize: 12 },
  cl: { backgroundColor: '#333', borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 6 }, clT: { color: '#fff', fontWeight: '600', fontSize: 12 },
});
