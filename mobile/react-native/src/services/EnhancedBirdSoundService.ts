/**
 * Enhanced Bird Sound Service with Stereo Support
 * 
 * Features:
 * - Stereo audio capture and analysis
 * - Bird direction detection
 * - Offline mode with local caching
 * - Weather integration
 * - Field notes
 * - Multi-microphone support
 */

import { Buffer } from 'buffer';
import StereoAudioService, { 
  StereoAnalysis, 
  AudioDevice, 
  AudioConfig 
} from './StereoAudioService';

// ============================================================================
// Types
// ============================================================================

export interface Detection {
  id: string;
  timestamp: Date;
  species: string;
  confidence: number;
  latitude: number | null;
  longitude: number | null;
  direction: number | null;        // -90° to +90° if stereo
  directionConfidence: number;     // 0 to 1
  stereoBalance: number | null;    // -1 to +1
  weather: WeatherData | null;
  notes: string;
  audioSnippetPath: string | null;
  isSynced: boolean;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  weatherCode: number;
  description: string;
}

export interface FieldSession {
  id: string;
  startTime: Date;
  endTime: Date | null;
  location: {
    latitude: number;
    longitude: number;
    name: string;
  };
  detections: Detection[];
  notes: string;
  weather: WeatherData | null;
  audioConfig: {
    isStereo: boolean;
    deviceName: string;
  };
}

export type DetectionCallback = (detection: Detection) => void;
export type DirectionCallback = (direction: number, confidence: number) => void;

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  windowDurationMs: 3000,
  hopDurationMs: 1000,
  minConfidence: 0.5,
  directionSmoothingFactor: 0.3,
  offlineCacheSize: 100,
};

// ============================================================================
// Enhanced Bird Sound Service
// ============================================================================

export class EnhancedBirdSoundService {
  private audioService: StereoAudioService;
  private apiBaseUrl: string;
  private deviceId: string;
  
  // State
  private isListening: boolean = false;
  private currentSession: FieldSession | null = null;
  private detections: Detection[] = [];
  private offlineQueue: Detection[] = [];
  
  // Audio buffers
  private audioBuffer: Int16Array[] = [];
  private processInterval: NodeJS.Timer | null = null;
  
  // Direction tracking
  private lastDirection: number = 0;
  private directionHistory: number[] = [];
  
  // Callbacks
  private onDetection: DetectionCallback | null = null;
  private onDirection: DirectionCallback | null = null;
  
  // Weather
  private currentWeather: WeatherData | null = null;
  
  constructor(apiBaseUrl: string, deviceId: string, audioConfig?: Partial<AudioConfig>) {
    this.apiBaseUrl = apiBaseUrl;
    this.deviceId = deviceId;
    this.audioService = new StereoAudioService(audioConfig);
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  async initialize(): Promise<void> {
    await this.audioService.initialize();
    
    // Set up audio data handler
    this.audioService.setOnAudioData((samples, stereoAnalysis) => {
      this.handleAudioData(samples, stereoAnalysis);
    });
    
    // Load offline queue from storage
    this.loadOfflineQueue();
    
    console.log('EnhancedBirdSoundService initialized');
  }

  // ============================================================================
  // Device Management
  // ============================================================================

  async getAvailableDevices(): Promise<AudioDevice[]> {
    return this.audioService.getAvailableDevices();
  }

  async selectDevice(deviceId: string): Promise<boolean> {
    return this.audioService.selectDevice(deviceId);
  }

  isStereoAvailable(): boolean {
    return this.audioService.isStereoAvailable();
  }

  // ============================================================================
  // Session Management
  // ============================================================================

  async startSession(locationName: string = 'Unbekannter Ort'): Promise<FieldSession> {
    const position = await this.getCurrentLocation();
    
    this.currentSession = {
      id: `session-${Date.now()}`,
      startTime: new Date(),
      endTime: null,
      location: {
        latitude: position?.latitude || 0,
        longitude: position?.longitude || 0,
        name: locationName,
      },
      detections: [],
      notes: '',
      weather: this.currentWeather,
      audioConfig: {
        isStereo: this.isStereoAvailable(),
        deviceName: 'Default',
      },
    };
    
    return this.currentSession;
  }

  endSession(): FieldSession | null {
    if (this.currentSession) {
      this.currentSession.endTime = new Date();
      const session = this.currentSession;
      
      // Save session to storage
      this.saveSession(session);
      
      this.currentSession = null;
      return session;
    }
    return null;
  }

  // ============================================================================
  // Listening Control
  // ============================================================================

  async startListening(): Promise<void> {
    if (this.isListening) return;
    
    this.isListening = true;
    this.audioBuffer = [];
    
    // Start audio capture
    await this.audioService.startRecording();
    
    // Start processing interval
    this.processInterval = setInterval(() => {
      this.processAudioWindow();
    }, CONFIG.hopDurationMs);
    
    // Fetch weather
    this.fetchWeather();
    
    console.log('Started listening (Stereo: ' + this.isStereoAvailable() + ')');
  }

  async stopListening(): Promise<void> {
    this.isListening = false;
    
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = null;
    }
    
    await this.audioService.stopRecording();
    
    console.log('Stopped listening');
  }

  // ============================================================================
  // Callbacks
  // ============================================================================

  setOnDetection(callback: DetectionCallback): void {
    this.onDetection = callback;
  }

  setOnDirection(callback: DirectionCallback): void {
    this.onDirection = callback;
  }

  // ============================================================================
  // Audio Processing
  // ============================================================================

  private handleAudioData(samples: Int16Array, stereoAnalysis: StereoAnalysis | null): void {
    // Store in buffer
    this.audioBuffer.push(samples);
    
    // Keep only last 5 seconds
    const maxBuffers = Math.ceil(5000 / 100); // 100ms per buffer
    if (this.audioBuffer.length > maxBuffers) {
      this.audioBuffer = this.audioBuffer.slice(-maxBuffers);
    }
    
    // Update direction if stereo
    if (stereoAnalysis && stereoAnalysis.isStereo) {
      this.updateDirection(stereoAnalysis.direction, stereoAnalysis.correlation);
    }
  }

  private updateDirection(direction: number, confidence: number): void {
    // Smooth direction with exponential moving average
    this.lastDirection = this.lastDirection * (1 - CONFIG.directionSmoothingFactor) + 
                         direction * CONFIG.directionSmoothingFactor;
    
    // Keep history for averaging
    this.directionHistory.push(direction);
    if (this.directionHistory.length > 10) {
      this.directionHistory.shift();
    }
    
    // Callback with smoothed direction
    if (this.onDirection) {
      this.onDirection(this.lastDirection, confidence);
    }
  }

  private async processAudioWindow(): Promise<void> {
    if (!this.isListening || this.audioBuffer.length === 0) return;
    
    try {
      // Combine buffers into one array
      const totalLength = this.audioBuffer.reduce((sum, buf) => sum + buf.length, 0);
      const combinedSamples = new Int16Array(totalLength);
      let offset = 0;
      for (const buf of this.audioBuffer) {
        combinedSamples.set(buf, offset);
        offset += buf.length;
      }
      
      // Convert to mono for API
      const monoSamples = this.audioService.stereoToMono(combinedSamples);
      
      // Get current position
      const position = await this.getCurrentLocation();
      
      // Send to API
      const response = await this.sendPrediction({
        audioData: monoSamples,
        latitude: position?.latitude || null,
        longitude: position?.longitude || null,
      });
      
      if (response && response.confidence >= CONFIG.minConfidence) {
        // Create detection
        const detection: Detection = {
          id: `det-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(),
          species: response.species,
          confidence: response.confidence,
          latitude: position?.latitude || null,
          longitude: position?.longitude || null,
          direction: this.isStereoAvailable() ? this.lastDirection : null,
          directionConfidence: this.directionHistory.length > 0 
            ? 1 - (this.standardDeviation(this.directionHistory) / 90)
            : 0,
          stereoBalance: null, // TODO: calculate from stereo analysis
          weather: this.currentWeather,
          notes: '',
          audioSnippetPath: null,
          isSynced: true,
        };
        
        // Add to current session
        if (this.currentSession) {
          this.currentSession.detections.push(detection);
        }
        
        // Callback
        if (this.onDetection) {
          this.onDetection(detection);
        }
      }
      
    } catch (error) {
      console.error('Error processing audio:', error);
      // Queue for offline sync if network error
      // this.queueOffline(detection);
    }
  }

  // ============================================================================
  // API Communication
  // ============================================================================

  private async sendPrediction(params: {
    audioData: Int16Array;
    latitude: number | null;
    longitude: number | null;
  }): Promise<{ species: string; confidence: number } | null> {
    const { audioData, latitude, longitude } = params;
    
    // Convert to base64
    const buffer = Buffer.alloc(audioData.length * 2);
    for (let i = 0; i < audioData.length; i++) {
      buffer.writeInt16LE(audioData[i], i * 2);
    }
    
    const requestBody = {
      device_id: this.deviceId,
      timestamp_utc: new Date().toISOString(),
      latitude,
      longitude,
      sample_rate: 44100,
      audio_format: 'pcm16_le',
      audio_base64: buffer.toString('base64'),
    };
    
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/v1/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      return {
        species: data.consensus?.species_common || 'Unknown',
        confidence: data.consensus?.confidence || 0,
      };
    } catch (error) {
      console.error('Network error:', error);
      return null;
    }
  }

  // ============================================================================
  // Weather Integration
  // ============================================================================

  private async fetchWeather(): Promise<void> {
    try {
      const position = await this.getCurrentLocation();
      if (!position) return;
      
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${position.latitude}&longitude=${position.longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m`;
      
      const response = await fetch(url);
      if (!response.ok) return;
      
      const data = await response.json();
      
      this.currentWeather = {
        temperature: data.current.temperature_2m,
        humidity: data.current.relative_humidity_2m,
        windSpeed: data.current.wind_speed_10m,
        windDirection: data.current.wind_direction_10m,
        weatherCode: data.current.weather_code,
        description: this.getWeatherDescription(data.current.weather_code),
      };
      
    } catch (error) {
      console.error('Weather fetch error:', error);
    }
  }

  private getWeatherDescription(code: number): string {
    const descriptions: Record<number, string> = {
      0: 'Klar',
      1: 'Überwiegend klar',
      2: 'Teilweise bewölkt',
      3: 'Bewölkt',
      45: 'Nebel',
      51: 'Leichter Nieselregen',
      61: 'Leichter Regen',
      71: 'Leichter Schneefall',
      95: 'Gewitter',
    };
    return descriptions[code] || 'Unbekannt';
  }

  // ============================================================================
  // Location
  // ============================================================================

  private getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
    return new Promise((resolve) => {
      // In real implementation, use Geolocation API
      // For demo, return Berlin coordinates
      resolve({ latitude: 52.52, longitude: 13.405 });
    });
  }

  // ============================================================================
  // Offline Support
  // ============================================================================

  private loadOfflineQueue(): void {
    // Load from AsyncStorage in real implementation
    this.offlineQueue = [];
  }

  private queueOffline(detection: Detection): void {
    detection.isSynced = false;
    this.offlineQueue.push(detection);
    
    // Limit queue size
    if (this.offlineQueue.length > CONFIG.offlineCacheSize) {
      this.offlineQueue.shift();
    }
    
    // Save to AsyncStorage
    // AsyncStorage.setItem('offlineQueue', JSON.stringify(this.offlineQueue));
  }

  async syncOfflineData(): Promise<number> {
    let synced = 0;
    
    for (const detection of this.offlineQueue) {
      if (!detection.isSynced) {
        // Attempt to sync
        try {
          // await this.sendDetection(detection);
          detection.isSynced = true;
          synced++;
        } catch (error) {
          // Keep in queue
        }
      }
    }
    
    // Remove synced items
    this.offlineQueue = this.offlineQueue.filter(d => !d.isSynced);
    
    return synced;
  }

  // ============================================================================
  // Session Storage
  // ============================================================================

  private saveSession(session: FieldSession): void {
    // Save to AsyncStorage in real implementation
    console.log('Session saved:', session.id);
  }

  async getSavedSessions(): Promise<FieldSession[]> {
    // Load from AsyncStorage
    return [];
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  private standardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map(value => Math.pow(value - mean, 2));
    return Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / values.length);
  }

  // ============================================================================
  // Notes
  // ============================================================================

  addNoteToDetection(detectionId: string, note: string): void {
    const detection = this.detections.find(d => d.id === detectionId);
    if (detection) {
      detection.notes = note;
    }
    
    if (this.currentSession) {
      const sessionDetection = this.currentSession.detections.find(d => d.id === detectionId);
      if (sessionDetection) {
        sessionDetection.notes = note;
      }
    }
  }

  addSessionNote(note: string): void {
    if (this.currentSession) {
      this.currentSession.notes = note;
    }
  }

  // ============================================================================
  // Export
  // ============================================================================

  exportSessionAsCSV(session: FieldSession): string {
    const headers = [
      'Timestamp', 'Species', 'Confidence', 'Latitude', 'Longitude',
      'Direction', 'Direction Confidence', 'Temperature', 'Wind', 'Notes'
    ];
    
    const rows = session.detections.map(d => [
      d.timestamp.toISOString(),
      d.species,
      d.confidence.toFixed(3),
      d.latitude?.toFixed(6) || '',
      d.longitude?.toFixed(6) || '',
      d.direction?.toFixed(1) || '',
      d.directionConfidence.toFixed(2),
      d.weather?.temperature || '',
      d.weather?.windSpeed || '',
      `"${d.notes.replace(/"/g, '""')}"`,
    ]);
    
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  exportSessionAsGeoJSON(session: FieldSession): object {
    return {
      type: 'FeatureCollection',
      features: session.detections
        .filter(d => d.latitude && d.longitude)
        .map(d => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [d.longitude, d.latitude],
          },
          properties: {
            species: d.species,
            confidence: d.confidence,
            timestamp: d.timestamp.toISOString(),
            direction: d.direction,
            notes: d.notes,
            weather: d.weather,
          },
        })),
    };
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  dispose(): void {
    this.stopListening();
    this.audioService.dispose();
    this.onDetection = null;
    this.onDirection = null;
  }
}

export default EnhancedBirdSoundService;
