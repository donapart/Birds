/**
 * Bird Detector - React Native Android App
 * 
 * Main App Component with:
 * - Stereo/Mono microphone support
 * - Direction compass display
 * - Real-time detection
 * - Weather integration
 * - Field notes
 * - Session management
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  Animated,
  Dimensions,
  Platform,
  PermissionsAndroid,
} from 'react-native';

import EnhancedBirdSoundService, {
  Detection,
  FieldSession,
  WeatherData,
} from './services/EnhancedBirdSoundService';
import { AudioDevice } from './services/StereoAudioService';

// ============================================================================
// Configuration
// ============================================================================

const API_URL = 'http://192.168.1.100:8003'; // Replace with your server IP
const DEVICE_ID = `android-${Platform.OS}-${Date.now()}`;

// ============================================================================
// Components
// ============================================================================

// Direction Compass Component
const DirectionCompass: React.FC<{
  direction: number;
  confidence: number;
}> = ({ direction, confidence }) => {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(rotation, {
      toValue: direction,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  }, [direction]);

  const rotateStyle = {
    transform: [
      {
        rotate: rotation.interpolate({
          inputRange: [-90, 90],
          outputRange: ['-90deg', '90deg'],
        }),
      },
    ],
  };

  return (
    <View style={styles.compassContainer}>
      <Text style={styles.compassLabel}>Richtung</Text>
      <View style={styles.compass}>
        <Text style={styles.compassDirection}>L</Text>
        <View style={styles.compassCenter}>
          <Animated.View style={[styles.compassNeedle, rotateStyle]}>
            <View style={styles.needleArrow} />
          </Animated.View>
          <View style={styles.compassDot} />
        </View>
        <Text style={styles.compassDirection}>R</Text>
      </View>
      <Text style={styles.compassDegrees}>
        {direction.toFixed(0)}° ({(confidence * 100).toFixed(0)}%)
      </Text>
    </View>
  );
};

// Weather Display Component
const WeatherDisplay: React.FC<{ weather: WeatherData | null }> = ({ weather }) => {
  if (!weather) return null;

  const getWeatherIcon = (code: number): string => {
    if (code === 0) return '☀️';
    if (code <= 3) return '🌤️';
    if (code <= 49) return '🌫️';
    if (code <= 59) return '🌧️';
    if (code <= 69) return '🌨️';
    if (code <= 79) return '❄️';
    return '⛈️';
  };

  return (
    <View style={styles.weatherContainer}>
      <Text style={styles.weatherIcon}>{getWeatherIcon(weather.weatherCode)}</Text>
      <View style={styles.weatherInfo}>
        <Text style={styles.weatherTemp}>{weather.temperature}°C</Text>
        <Text style={styles.weatherDetails}>
          💧 {weather.humidity}% | 💨 {weather.windSpeed} km/h
        </Text>
      </View>
    </View>
  );
};

// Detection Card Component
const DetectionCard: React.FC<{
  detection: Detection;
  onAddNote: (id: string) => void;
}> = ({ detection, onAddNote }) => {
  const confidenceColor =
    detection.confidence >= 0.8
      ? '#4CAF50'
      : detection.confidence >= 0.5
      ? '#FFC107'
      : '#F44336';

  return (
    <View style={styles.detectionCard}>
      <View style={styles.detectionHeader}>
        <Text style={styles.birdIcon}>🐦</Text>
        <View style={styles.detectionInfo}>
          <Text style={styles.speciesName}>{detection.species}</Text>
          <Text style={styles.detectionTime}>
            {detection.timestamp.toLocaleTimeString()}
          </Text>
        </View>
        <View style={[styles.confidenceBadge, { backgroundColor: confidenceColor }]}>
          <Text style={styles.confidenceText}>
            {(detection.confidence * 100).toFixed(0)}%
          </Text>
        </View>
      </View>

      {detection.direction !== null && (
        <View style={styles.directionBadge}>
          <Text style={styles.directionText}>
            📍 {detection.direction > 0 ? 'Rechts' : 'Links'} ({Math.abs(detection.direction).toFixed(0)}°)
          </Text>
        </View>
      )}

      {detection.weather && (
        <Text style={styles.weatherBadge}>
          {detection.weather.temperature}°C | {detection.weather.description}
        </Text>
      )}

      {detection.notes ? (
        <Text style={styles.noteText}>📝 {detection.notes}</Text>
      ) : (
        <TouchableOpacity
          style={styles.addNoteButton}
          onPress={() => onAddNote(detection.id)}
        >
          <Text style={styles.addNoteText}>+ Notiz hinzufügen</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// Device Selector Component
const DeviceSelector: React.FC<{
  devices: AudioDevice[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}> = ({ devices, selectedId, onSelect }) => {
  return (
    <View style={styles.deviceSelector}>
      <Text style={styles.deviceSelectorTitle}>🎤 Mikrofon auswählen:</Text>
      {devices.map((device) => (
        <TouchableOpacity
          key={device.id}
          style={[
            styles.deviceOption,
            selectedId === device.id && styles.deviceOptionSelected,
          ]}
          onPress={() => onSelect(device.id)}
        >
          <Text style={styles.deviceIcon}>
            {device.type === 'usb' ? '🔌' : device.type === 'bluetooth' ? '📶' : '📱'}
          </Text>
          <View style={styles.deviceInfo}>
            <Text style={styles.deviceName}>{device.name}</Text>
            <Text style={styles.deviceChannels}>
              {device.channels === 2 ? '🔊 Stereo' : '🔈 Mono'} • {device.sampleRates[0] / 1000}kHz
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// ============================================================================
// Main App Component
// ============================================================================

export default function BirdDetectorApp() {
  // Service reference
  const serviceRef = useRef<EnhancedBirdSoundService | null>(null);

  // State
  const [isInitialized, setIsInitialized] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [currentSession, setCurrentSession] = useState<FieldSession | null>(null);
  const [direction, setDirection] = useState(0);
  const [directionConfidence, setDirectionConfidence] = useState(0);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [isStereo, setIsStereo] = useState(false);
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [noteDetectionId, setNoteDetectionId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  // ============================================================================
  // Initialization
  // ============================================================================

  useEffect(() => {
    initializeApp();
    return () => {
      serviceRef.current?.dispose();
    };
  }, []);

  const initializeApp = async () => {
    try {
      // Request permissions on Android
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        if (
          granted[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] !==
          PermissionsAndroid.RESULTS.GRANTED
        ) {
          Alert.alert('Berechtigung erforderlich', 'Mikrofon-Zugriff wird benötigt');
          return;
        }
      }

      // Initialize service
      const service = new EnhancedBirdSoundService(API_URL, DEVICE_ID);
      await service.initialize();
      serviceRef.current = service;

      // Set up callbacks
      service.setOnDetection((detection) => {
        setDetections((prev) => [detection, ...prev].slice(0, 50));
      });

      service.setOnDirection((dir, conf) => {
        setDirection(dir);
        setDirectionConfidence(conf);
      });

      // Get available devices
      const availableDevices = await service.getAvailableDevices();
      setDevices(availableDevices);

      // Select default device
      const defaultDevice = availableDevices.find((d) => d.isDefault);
      if (defaultDevice) {
        await selectDevice(defaultDevice.id);
      }

      setIsInitialized(true);
    } catch (error) {
      console.error('Initialization error:', error);
      Alert.alert('Fehler', 'App konnte nicht initialisiert werden');
    }
  };

  // ============================================================================
  // Device Selection
  // ============================================================================

  const selectDevice = async (deviceId: string) => {
    if (!serviceRef.current) return;

    const success = await serviceRef.current.selectDevice(deviceId);
    if (success) {
      setSelectedDeviceId(deviceId);
      setIsStereo(serviceRef.current.isStereoAvailable());
      setShowDeviceSelector(false);
    }
  };

  // ============================================================================
  // Recording Control
  // ============================================================================

  const toggleListening = useCallback(async () => {
    if (!serviceRef.current) return;

    if (isListening) {
      await serviceRef.current.stopListening();
      setIsListening(false);
    } else {
      // Start new session
      const session = await serviceRef.current.startSession('Feldbeobachtung');
      setCurrentSession(session);

      await serviceRef.current.startListening();
      setIsListening(true);
    }
  }, [isListening]);

  // ============================================================================
  // Notes
  // ============================================================================

  const openNoteModal = (detectionId: string) => {
    setNoteDetectionId(detectionId);
    setNoteText('');
    setNoteModalVisible(true);
  };

  const saveNote = () => {
    if (serviceRef.current && noteDetectionId) {
      serviceRef.current.addNoteToDetection(noteDetectionId, noteText);

      // Update local state
      setDetections((prev) =>
        prev.map((d) =>
          d.id === noteDetectionId ? { ...d, notes: noteText } : d
        )
      );
    }

    setNoteModalVisible(false);
    setNoteDetectionId(null);
    setNoteText('');
  };

  // ============================================================================
  // Export
  // ============================================================================

  const exportSession = () => {
    if (!serviceRef.current || !currentSession) return;

    const csv = serviceRef.current.exportSessionAsCSV(currentSession);
    // In real app: share via Share API or save to file
    console.log('Export CSV:\n', csv);
    Alert.alert('Export', 'Session als CSV exportiert (siehe Konsole)');
  };

  // ============================================================================
  // Render
  // ============================================================================

  if (!isInitialized) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>🐦 BirdSound wird geladen...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>🐦 BirdSound</Text>
        <TouchableOpacity
          style={styles.deviceButton}
          onPress={() => setShowDeviceSelector(true)}
        >
          <Text style={styles.deviceButtonText}>
            {isStereo ? '🔊 Stereo' : '🔈 Mono'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Weather */}
      <WeatherDisplay weather={weather} />

      {/* Direction Compass (only if stereo) */}
      {isStereo && isListening && (
        <DirectionCompass direction={direction} confidence={directionConfidence} />
      )}

      {/* Status */}
      <View style={styles.statusContainer}>
        <View
          style={[
            styles.statusIndicator,
            { backgroundColor: isListening ? '#4CAF50' : '#9E9E9E' },
          ]}
        />
        <Text style={styles.statusText}>
          {isListening ? 'Lauscht...' : 'Bereit'}
        </Text>
        {isListening && (
          <Text style={styles.detectionCount}>
            {detections.length} Erkennungen
          </Text>
        )}
      </View>

      {/* Start/Stop Button */}
      <TouchableOpacity
        style={[styles.mainButton, isListening && styles.mainButtonStop]}
        onPress={toggleListening}
      >
        <Text style={styles.mainButtonText}>
          {isListening ? '⏹️ Stoppen' : '▶️ Starten'}
        </Text>
      </TouchableOpacity>

      {/* Detections List */}
      <ScrollView style={styles.detectionsList}>
        <Text style={styles.sectionTitle}>📋 Erkennungen</Text>
        {detections.length === 0 ? (
          <Text style={styles.emptyText}>
            Noch keine Vögel erkannt. Starte die Aufnahme!
          </Text>
        ) : (
          detections.map((detection) => (
            <DetectionCard
              key={detection.id}
              detection={detection}
              onAddNote={openNoteModal}
            />
          ))
        )}
      </ScrollView>

      {/* Export Button */}
      {currentSession && detections.length > 0 && (
        <TouchableOpacity style={styles.exportButton} onPress={exportSession}>
          <Text style={styles.exportButtonText}>📤 Session exportieren</Text>
        </TouchableOpacity>
      )}

      {/* Device Selector Modal */}
      {showDeviceSelector && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <DeviceSelector
              devices={devices}
              selectedId={selectedDeviceId}
              onSelect={selectDevice}
            />
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowDeviceSelector(false)}
            >
              <Text style={styles.modalCloseText}>Schließen</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Note Modal */}
      {noteModalVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>📝 Notiz hinzufügen</Text>
            <TextInput
              style={styles.noteInput}
              value={noteText}
              onChangeText={setNoteText}
              placeholder="Beobachtungsnotizen..."
              multiline
              numberOfLines={4}
            />
            <View style={styles.quickTags}>
              {['🎵 Singend', '📣 Rufend', '🦅 Fliegend', '🐛 Fressend', '🪺 Nistend'].map(
                (tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={styles.quickTag}
                    onPress={() => setNoteText((prev) => prev + ' ' + tag)}
                  >
                    <Text style={styles.quickTagText}>{tag}</Text>
                  </TouchableOpacity>
                )
              )}
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setNoteModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={saveNote}
              >
                <Text style={styles.modalButtonText}>Speichern</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

// ============================================================================
// Styles
// ============================================================================

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  loadingText: {
    fontSize: 20,
    color: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  deviceButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  deviceButtonText: {
    color: '#4ecdc4',
    fontSize: 14,
  },
  weatherContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  weatherIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  weatherInfo: {
    flex: 1,
  },
  weatherTemp: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffd93d',
  },
  weatherDetails: {
    fontSize: 12,
    color: '#aaa',
  },
  compassContainer: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.2)',
    margin: 16,
    marginTop: 8,
    borderRadius: 12,
  },
  compassLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  compass: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: width * 0.6,
  },
  compassDirection: {
    fontSize: 18,
    color: '#666',
    width: 30,
    textAlign: 'center',
  },
  compassCenter: {
    width: 120,
    height: 60,
    borderRadius: 60,
    backgroundColor: 'rgba(78,205,196,0.1)',
    borderWidth: 2,
    borderColor: '#4ecdc4',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  compassNeedle: {
    width: 80,
    height: 4,
    backgroundColor: '#4ecdc4',
    borderRadius: 2,
    position: 'absolute',
  },
  needleArrow: {
    position: 'absolute',
    right: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderLeftColor: '#4ecdc4',
    borderTopWidth: 6,
    borderTopColor: 'transparent',
    borderBottomWidth: 6,
    borderBottomColor: 'transparent',
  },
  compassDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4ecdc4',
  },
  compassDegrees: {
    marginTop: 8,
    fontSize: 16,
    color: '#4ecdc4',
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    color: '#fff',
  },
  detectionCount: {
    marginLeft: 16,
    fontSize: 14,
    color: '#888',
  },
  mainButton: {
    backgroundColor: '#4ecdc4',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  mainButtonStop: {
    backgroundColor: '#ff6b6b',
  },
  mainButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  detectionsList: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 32,
  },
  detectionCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  detectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  birdIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  detectionInfo: {
    flex: 1,
  },
  speciesName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  detectionTime: {
    fontSize: 12,
    color: '#888',
  },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  directionBadge: {
    marginTop: 8,
    paddingVertical: 4,
  },
  directionText: {
    fontSize: 12,
    color: '#4ecdc4',
  },
  weatherBadge: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
  },
  noteText: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 8,
    fontStyle: 'italic',
  },
  addNoteButton: {
    marginTop: 8,
  },
  addNoteText: {
    fontSize: 12,
    color: '#4ecdc4',
  },
  exportButton: {
    backgroundColor: 'rgba(78,205,196,0.2)',
    margin: 16,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  exportButtonText: {
    color: '#4ecdc4',
    fontWeight: '600',
  },
  deviceSelector: {
    padding: 16,
  },
  deviceSelectorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  deviceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    marginBottom: 8,
  },
  deviceOptionSelected: {
    backgroundColor: 'rgba(78,205,196,0.2)',
    borderWidth: 1,
    borderColor: '#4ecdc4',
  },
  deviceIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 14,
    color: '#fff',
  },
  deviceChannels: {
    fontSize: 12,
    color: '#888',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.9,
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  modalCloseButton: {
    marginTop: 16,
    padding: 12,
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#888',
    fontSize: 14,
  },
  noteInput: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  quickTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  quickTag: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  quickTagText: {
    fontSize: 12,
    color: '#aaa',
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  modalButtonSave: {
    backgroundColor: '#4ecdc4',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
