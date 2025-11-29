/**
 * BirdSound - Vogelstimmen-Erkennung App
 * 
 * Version 1.0.0
 * Einfache App zur Aufnahme und Erkennung von Vogelstimmen
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  StatusBar,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as Location from 'expo-location';
import * as Sharing from 'expo-sharing';

// ============================================================================
// Konfiguration
// ============================================================================

// Server-URL: Für lokales Netzwerk die IP des PCs verwenden
// Für Cloud: render.com URL verwenden (z.B. https://birdsound-api.onrender.com)
const DEFAULT_SERVER = 'http://192.168.178.171:8003';
const APP_VERSION = '1.0.2';

// Offline-Modus: Lokale Simulation wenn Server nicht erreichbar
const OFFLINE_MODE_ENABLED = true;

// Deutsche Vogelnamen für häufige Arten
const GERMAN_BIRD_NAMES = {
  'Turdus merula': 'Amsel',
  'Erithacus rubecula': 'Rotkehlchen',
  'Parus major': 'Kohlmeise',
  'Cyanistes caeruleus': 'Blaumeise',
  'Fringilla coelebs': 'Buchfink',
  'Passer domesticus': 'Haussperling',
  'Columba palumbus': 'Ringeltaube',
  'Corvus corone': 'Rabenkrähe',
  'Sturnus vulgaris': 'Star',
  'Phylloscopus collybita': 'Zilpzalp',
  'Sylvia atricapilla': 'Mönchsgrasmücke',
  'Troglodytes troglodytes': 'Zaunkönig',
  'Dendrocopos major': 'Buntspecht',
  'Sitta europaea': 'Kleiber',
  'Aegithalos caudatus': 'Schwanzmeise',
  'Carduelis carduelis': 'Stieglitz',
  'Chloris chloris': 'Grünfink',
  'Garrulus glandarius': 'Eichelhäher',
  'Pica pica': 'Elster',
  'Motacilla alba': 'Bachstelze',
  'Anas platyrhynchos': 'Stockente',
  'Ardea cinerea': 'Graureiher',
  'Buteo buteo': 'Mäusebussard',
  'Falco tinnunculus': 'Turmfalke',
  'Strix aluco': 'Waldkauz',
  'Apus apus': 'Mauersegler',
  'Hirundo rustica': 'Rauchschwalbe',
  'Delichon urbicum': 'Mehlschwalbe',
  'Cuculus canorus': 'Kuckuck',
  'Luscinia megarhynchos': 'Nachtigall',
};

// ============================================================================
// Haupt-App Komponente
// ============================================================================

export default function App() {
  // State
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [predictions, setPredictions] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER);
  const [isConnected, setIsConnected] = useState(false);
  const [location, setLocation] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [history, setHistory] = useState([]);
  const [offlineMode, setOfflineMode] = useState(false);
  
  const timerRef = useRef(null);
  
  // ============================================================================
  // Initialisierung
  // ============================================================================
  
  useEffect(() => {
    checkServerConnection();
    requestPermissions();
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);
  
  const requestPermissions = async () => {
    try {
      // Audio-Berechtigung
      const { status: audioStatus } = await Audio.requestPermissionsAsync();
      if (audioStatus !== 'granted') {
        Alert.alert('Berechtigung benötigt', 'Mikrofonzugriff ist für die Aufnahme erforderlich.');
      }
      
      // Standort-Berechtigung (optional)
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      if (locationStatus === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc.coords);
      }
    } catch (error) {
      console.log('Berechtigungsfehler:', error);
    }
  };
  
  const checkServerConnection = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${serverUrl}/api/v1/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      
      const connected = response.ok;
      setIsConnected(connected);
      setOfflineMode(!connected);
      return connected;
    } catch (error) {
      console.log('Server nicht erreichbar, Offline-Modus aktiviert');
      setIsConnected(false);
      setOfflineMode(true);
      return false;
    }
  };
  
  // ============================================================================
  // Aufnahme-Funktionen
  // ============================================================================
  
  const startRecording = async () => {
    try {
      // Audio-Modus konfigurieren
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
      
      // Aufnahme starten
      const { recording: newRecording } = await Audio.Recording.createAsync(
        {
          android: {
            extension: '.wav',
            outputFormat: Audio.AndroidOutputFormat.DEFAULT,
            audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
            sampleRate: 48000,
            numberOfChannels: 1,
            bitRate: 128000,
          },
          ios: {
            extension: '.wav',
            audioQuality: Audio.IOSAudioQuality.HIGH,
            sampleRate: 48000,
            numberOfChannels: 1,
            bitRate: 128000,
            linearPCMBitDepth: 16,
            linearPCMIsBigEndian: false,
            linearPCMIsFloat: false,
          },
          web: {},
        }
      );
      
      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);
      setPredictions([]);
      
      // Timer für Aufnahmedauer
      timerRef.current = setInterval(() => {
        setRecordingDuration(d => d + 1);
      }, 1000);
      
    } catch (error) {
      console.error('Aufnahmefehler:', error);
      Alert.alert('Fehler', 'Aufnahme konnte nicht gestartet werden.');
    }
  };
  
  const stopRecording = async () => {
    if (!recording) return;
    
    try {
      clearInterval(timerRef.current);
      
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      setRecording(null);
      setIsRecording(false);
      
      // Analysieren
      if (uri) {
        await analyzeAudio(uri);
      }
      
    } catch (error) {
      console.error('Stopp-Fehler:', error);
      setIsRecording(false);
    }
  };
  
  // ============================================================================
  // Analyse-Funktionen
  // ============================================================================
  
  const analyzeAudio = async (audioUri) => {
    setIsAnalyzing(true);
    
    try {
      // Prüfe Server-Verbindung
      const serverAvailable = await checkServerConnection();
      
      if (!serverAvailable && OFFLINE_MODE_ENABLED) {
        // Offline-Modus: Lokale Simulation
        await simulateOfflineAnalysis();
        return;
      }
      
      if (!serverAvailable) {
        Alert.alert(
          'Offline',
          `Server nicht erreichbar.\n\nServer: ${serverUrl}\n\nBitte stelle sicher, dass:\n• Der Server läuft\n• Du im gleichen WiFi bist\n• Die IP-Adresse korrekt ist`
        );
        setIsAnalyzing(false);
        return;
      }
      
      // Audio als Base64 lesen
      const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Request an Server
      const requestBody = {
        device_id: `birdsound-app-${Platform.OS}`,
        timestamp_utc: new Date().toISOString(),
        latitude: location?.latitude || 52.52,
        longitude: location?.longitude || 13.405,
        sample_rate: 48000,
        audio_format: 'wav',
        audio_base64: base64Audio,
      };
      
      const response = await fetch(`${serverUrl}/api/v1/predict/quick`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        throw new Error(`Server-Fehler: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Ergebnisse verarbeiten
      const processedPredictions = processPredictions(result);
      setPredictions(processedPredictions);
      
      // Zur History hinzufügen
      if (processedPredictions.length > 0) {
        setHistory(prev => [{
          timestamp: new Date(),
          topPrediction: processedPredictions[0],
          location: location,
        }, ...prev.slice(0, 49)]);
      }
      
    } catch (error) {
      console.error('Analysefehler:', error);
      
      if (OFFLINE_MODE_ENABLED) {
        // Fallback zu Offline-Modus
        await simulateOfflineAnalysis();
      } else {
        Alert.alert(
          'Analysefehler',
          `Verbindung zum Server fehlgeschlagen.\n\nServer: ${serverUrl}\n\nPrüfe ob der Server läuft.`
        );
      }
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // Offline-Simulation für Demo-Zwecke
  const simulateOfflineAnalysis = async () => {
    // Simulierte Verzögerung
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Demo-Ergebnisse mit zufälligen deutschen Vögeln
    const demoSpecies = [
      { scientific: 'Turdus merula', common: 'Amsel', confidence: 0.85 },
      { scientific: 'Erithacus rubecula', common: 'Rotkehlchen', confidence: 0.72 },
      { scientific: 'Parus major', common: 'Kohlmeise', confidence: 0.68 },
      { scientific: 'Cyanistes caeruleus', common: 'Blaumeise', confidence: 0.55 },
      { scientific: 'Fringilla coelebs', common: 'Buchfink', confidence: 0.48 },
      { scientific: 'Phylloscopus collybita', common: 'Zilpzalp', confidence: 0.42 },
      { scientific: 'Sylvia atricapilla', common: 'Mönchsgrasmücke', confidence: 0.38 },
    ];
    
    // Zufällige Auswahl
    const shuffled = demoSpecies.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 3 + Math.floor(Math.random() * 3));
    
    // Konfidenz-Werte anpassen
    const processedPredictions = selected.map((species, idx) => ({
      species: species.common,
      scientific: species.scientific,
      confidence: Math.max(0.3, species.confidence - (idx * 0.1) + (Math.random() * 0.1)),
      source: 'offline-demo',
    })).sort((a, b) => b.confidence - a.confidence);
    
    setPredictions(processedPredictions);
    
    // Zur History hinzufügen
    if (processedPredictions.length > 0) {
      setHistory(prev => [{
        timestamp: new Date(),
        topPrediction: processedPredictions[0],
        location: location,
        offline: true,
      }, ...prev.slice(0, 49)]);
    }
    
    // Hinweis anzeigen
    Alert.alert(
      '📴 Offline-Modus',
      'Die Erkennung läuft im Demo-Modus.\n\nFür echte Ergebnisse:\n• Verbinde dich mit dem Server\n• Gehe in Einstellungen → Server-URL',
      [{ text: 'OK' }]
    );
  };
  
  const processPredictions = (result) => {
    const preds = [];
    
    // Consensus-Ergebnis
    if (result.consensus) {
      const germanName = GERMAN_BIRD_NAMES[result.consensus.species_scientific] || 
                         result.consensus.species_common;
      preds.push({
        species: germanName,
        scientific: result.consensus.species_scientific,
        confidence: result.consensus.confidence,
        source: 'consensus',
      });
    }
    
    // Model-Ergebnisse
    if (result.model_results) {
      for (const modelResult of result.model_results) {
        for (const pred of modelResult.predictions || []) {
          const germanName = GERMAN_BIRD_NAMES[pred.species_scientific] || 
                            pred.species_common;
          
          // Duplikate vermeiden
          if (!preds.find(p => p.scientific === pred.species_scientific)) {
            preds.push({
              species: germanName,
              scientific: pred.species_scientific,
              confidence: pred.confidence,
              source: modelResult.model_name,
            });
          }
        }
      }
    }
    
    // Nach Konfidenz sortieren
    return preds.sort((a, b) => b.confidence - a.confidence).slice(0, 10);
  };
  
  // ============================================================================
  // UI Komponenten
  // ============================================================================
  
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatConfidence = (confidence) => {
    return `${(confidence * 100).toFixed(1)}%`;
  };
  
  // ============================================================================
  // KML Export Funktion
  // ============================================================================
  
  const exportToKML = async () => {
    if (history.length === 0) {
      Alert.alert('Keine Daten', 'Es gibt noch keine Erkennungen zum Exportieren.');
      return;
    }
    
    try {
      // KML generieren
      const kmlContent = generateKML(history);
      
      // Datei speichern
      const filename = `birdsound_${new Date().toISOString().slice(0,10)}.kml`;
      const fileUri = FileSystem.documentDirectory + filename;
      
      await FileSystem.writeAsStringAsync(fileUri, kmlContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      
      // Teilen
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/vnd.google-earth.kml+xml',
          dialogTitle: 'Vogelerkennungen exportieren',
        });
      } else {
        Alert.alert('Exportiert', `Datei gespeichert: ${filename}`);
      }
      
    } catch (error) {
      console.error('Export-Fehler:', error);
      Alert.alert('Fehler', 'Export fehlgeschlagen');
    }
  };
  
  const generateKML = (detections) => {
    const placemarks = detections.map((item, index) => {
      const lat = item.location?.latitude || 52.52;
      const lon = item.location?.longitude || 13.405;
      const species = item.topPrediction.species;
      const scientific = item.topPrediction.scientific;
      const confidence = (item.topPrediction.confidence * 100).toFixed(1);
      const time = item.timestamp.toISOString();
      
      return `
    <Placemark>
      <name>${species} (${confidence}%)</name>
      <description><![CDATA[
        <b>Art:</b> ${species}<br/>
        <b>Wissenschaftlich:</b> ${scientific}<br/>
        <b>Konfidenz:</b> ${confidence}%<br/>
        <b>Zeit:</b> ${item.timestamp.toLocaleString('de-DE')}
      ]]></description>
      <TimeStamp><when>${time}</when></TimeStamp>
      <styleUrl>#birdStyle</styleUrl>
      <Point>
        <coordinates>${lon},${lat},0</coordinates>
      </Point>
    </Placemark>`;
    }).join('\n');
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
  <name>BirdSound Erkennungen</name>
  <description>Exportiert am ${new Date().toLocaleString('de-DE')}</description>
  
  <Style id="birdStyle">
    <IconStyle>
      <color>ff00cdc4</color>
      <scale>1.2</scale>
      <Icon><href>http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href></Icon>
    </IconStyle>
    <LabelStyle>
      <scale>0.8</scale>
    </LabelStyle>
  </Style>
  
  <Folder>
    <name>Vogelerkennungen (${detections.length})</name>
    ${placemarks}
  </Folder>
</Document>
</kml>`;
  };
  
  // Settings Modal
  if (showSettings) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowSettings(false)}>
            <Text style={styles.backButton}>← Zurück</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Einstellungen</Text>
        </View>
        
        <View style={styles.settingsContainer}>
          <Text style={styles.settingsLabel}>Server-URL:</Text>
          <TextInput
            style={styles.textInput}
            value={serverUrl}
            onChangeText={setServerUrl}
            placeholder="http://192.168.1.100:8003"
            placeholderTextColor="#666"
            autoCapitalize="none"
            autoCorrect={false}
          />
          
          <TouchableOpacity 
            style={styles.testButton}
            onPress={checkServerConnection}
          >
            <Text style={styles.testButtonText}>Verbindung testen</Text>
          </TouchableOpacity>
          
          <View style={styles.connectionStatus}>
            <View style={[
              styles.statusDot,
              { backgroundColor: isConnected ? '#4ECDC4' : '#FF6B6B' }
            ]} />
            <Text style={styles.statusText}>
              {isConnected ? 'Verbunden' : 'Nicht verbunden'}
            </Text>
          </View>
          
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Tipps:</Text>
            <Text style={styles.infoText}>
              • Server auf dem PC starten{'\n'}
              • IP-Adresse des PCs verwenden{'\n'}
              • Port 8003 (oder wie konfiguriert){'\n'}
              • Gleiches WiFi-Netzwerk wie PC
            </Text>
          </View>
          
          <Text style={styles.versionText}>
            BirdSound v{APP_VERSION}{'\n'}
            6522 Vogelarten • BirdNET V2.4
          </Text>
        </View>
      </View>
    );
  }
  
  // Haupt-UI
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🐦 BirdSound</Text>
        <TouchableOpacity onPress={() => setShowSettings(true)}>
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>
      
      {/* Connection Status */}
      <View style={styles.statusBar}>
        <View style={[
          styles.statusDot,
          { backgroundColor: isConnected ? '#4ECDC4' : (offlineMode ? '#FFB347' : '#FF6B6B') }
        ]} />
        <Text style={styles.statusText}>
          {isConnected ? 'Server verbunden' : (offlineMode ? '📴 Offline-Demo' : 'Offline')}
        </Text>
        {location && (
          <Text style={styles.locationText}>
            📍 {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
          </Text>
        )}
      </View>
      
      {/* Recording Section */}
      <View style={styles.recordingSection}>
        {isRecording && (
          <Text style={styles.recordingTimer}>
            ⏱️ {formatDuration(recordingDuration)}
          </Text>
        )}
        
        <TouchableOpacity
          style={[
            styles.recordButton,
            isRecording && styles.recordButtonActive,
            isAnalyzing && styles.recordButtonDisabled,
          ]}
          onPress={isRecording ? stopRecording : startRecording}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? (
            <ActivityIndicator size="large" color="#FFF" />
          ) : (
            <>
              <Text style={styles.recordButtonIcon}>
                {isRecording ? '⬛' : '🎙️'}
              </Text>
              <Text style={styles.recordButtonText}>
                {isRecording ? 'Stopp' : 'Aufnehmen'}
              </Text>
            </>
          )}
        </TouchableOpacity>
        
        {isAnalyzing && (
          <Text style={styles.analyzingText}>Analysiere...</Text>
        )}
      </View>
      
      {/* Predictions */}
      <ScrollView style={styles.resultsSection}>
        {predictions.length > 0 ? (
          <>
            <Text style={styles.resultsTitle}>Erkannte Vögel:</Text>
            {predictions.map((pred, index) => (
              <View key={index} style={styles.predictionCard}>
                <View style={styles.predictionHeader}>
                  <Text style={styles.predictionRank}>#{index + 1}</Text>
                  <Text style={styles.predictionSpecies}>{pred.species}</Text>
                  <Text style={styles.predictionConfidence}>
                    {formatConfidence(pred.confidence)}
                  </Text>
                </View>
                <Text style={styles.predictionScientific}>
                  {pred.scientific}
                </Text>
                <View style={styles.confidenceBar}>
                  <View 
                    style={[
                      styles.confidenceFill,
                      { width: `${pred.confidence * 100}%` }
                    ]} 
                  />
                </View>
              </View>
            ))}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎵</Text>
            <Text style={styles.emptyText}>
              Drücke den Aufnahme-Button und halte das Gerät Richtung Vogelstimme.
            </Text>
            <Text style={styles.emptyHint}>
              Beste Ergebnisse bei 3-10 Sekunden Aufnahme
            </Text>
          </View>
        )}
        
        {/* History */}
        {history.length > 0 && predictions.length === 0 && (
          <View style={styles.historySection}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Letzte Erkennungen:</Text>
              <TouchableOpacity 
                style={styles.exportButton}
                onPress={exportToKML}
              >
                <Text style={styles.exportButtonText}>📤 KML Export</Text>
              </TouchableOpacity>
            </View>
            {history.slice(0, 5).map((item, index) => (
              <View key={index} style={styles.historyItem}>
                <Text style={styles.historyTime}>
                  {item.timestamp.toLocaleTimeString('de-DE')}
                </Text>
                <Text style={styles.historySpecies}>
                  {item.topPrediction.species}
                </Text>
                <Text style={styles.historyConfidence}>
                  {formatConfidence(item.topPrediction.confidence)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E2E',
  },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 15,
    backgroundColor: '#2D2D44',
  },
  
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4ECDC4',
  },
  
  settingsIcon: {
    fontSize: 24,
  },
  
  backButton: {
    fontSize: 18,
    color: '#4ECDC4',
  },
  
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#252538',
    gap: 8,
  },
  
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  
  statusText: {
    color: '#888',
    fontSize: 14,
  },
  
  locationText: {
    color: '#666',
    fontSize: 12,
    marginLeft: 'auto',
  },
  
  recordingSection: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  
  recordingTimer: {
    fontSize: 32,
    color: '#FF6B6B',
    marginBottom: 20,
    fontWeight: '600',
  },
  
  recordButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#4ECDC4',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#4ECDC4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  
  recordButtonActive: {
    backgroundColor: '#FF6B6B',
    shadowColor: '#FF6B6B',
  },
  
  recordButtonDisabled: {
    backgroundColor: '#555',
    shadowOpacity: 0,
  },
  
  recordButtonIcon: {
    fontSize: 40,
  },
  
  recordButtonText: {
    fontSize: 16,
    color: '#1E1E2E',
    fontWeight: '600',
    marginTop: 5,
  },
  
  analyzingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#4ECDC4',
  },
  
  resultsSection: {
    flex: 1,
    paddingHorizontal: 15,
  },
  
  resultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 15,
    marginTop: 10,
  },
  
  predictionCard: {
    backgroundColor: '#2D2D44',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  
  predictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  
  predictionRank: {
    fontSize: 14,
    color: '#4ECDC4',
    fontWeight: '600',
    marginRight: 10,
  },
  
  predictionSpecies: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    flex: 1,
  },
  
  predictionConfidence: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4ECDC4',
  },
  
  predictionScientific: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  
  confidenceBar: {
    height: 4,
    backgroundColor: '#3D3D5C',
    borderRadius: 2,
    overflow: 'hidden',
  },
  
  confidenceFill: {
    height: '100%',
    backgroundColor: '#4ECDC4',
  },
  
  emptyState: {
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 30,
  },
  
  emptyIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  
  emptyText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    lineHeight: 24,
  },
  
  emptyHint: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
  
  historySection: {
    marginTop: 20,
  },
  
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#888',
  },
  
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  
  exportButton: {
    backgroundColor: '#4ECDC4',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  
  exportButtonText: {
    color: '#1E1E2E',
    fontSize: 12,
    fontWeight: '600',
  },
  
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  
  historyTime: {
    fontSize: 12,
    color: '#666',
    width: 70,
  },
  
  historySpecies: {
    flex: 1,
    fontSize: 14,
    color: '#CCC',
  },
  
  historyConfidence: {
    fontSize: 14,
    color: '#4ECDC4',
  },
  
  // Settings Styles
  settingsContainer: {
    flex: 1,
    padding: 20,
  },
  
  settingsLabel: {
    fontSize: 16,
    color: '#CCC',
    marginBottom: 8,
  },
  
  textInput: {
    backgroundColor: '#2D2D44',
    borderRadius: 8,
    padding: 15,
    color: '#FFF',
    fontSize: 16,
    marginBottom: 15,
  },
  
  testButton: {
    backgroundColor: '#4ECDC4',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  
  testButtonText: {
    color: '#1E1E2E',
    fontSize: 16,
    fontWeight: '600',
  },
  
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  
  infoBox: {
    backgroundColor: '#252538',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4ECDC4',
    marginBottom: 8,
  },
  
  infoText: {
    fontSize: 14,
    color: '#888',
    lineHeight: 22,
  },
  
  versionText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 12,
    marginTop: 'auto',
  },
});
