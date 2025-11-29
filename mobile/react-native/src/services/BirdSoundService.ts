/**
 * React Native Bird Sound Detection Service
 *
 * This service handles:
 * - Microphone audio capture
 * - Audio chunking (3s windows with 1s overlap)
 * - GPS location retrieval
 * - API communication
 *
 * Dependencies to install:
 * ```
 * npm install react-native-live-audio-stream @react-native-community/geolocation
 * # or
 * yarn add react-native-live-audio-stream @react-native-community/geolocation
 * ```
 */

import { Buffer } from 'buffer';
// Note: Install react-native-live-audio-stream for actual implementation
// import LiveAudioStream from 'react-native-live-audio-stream';
// import Geolocation from '@react-native-community/geolocation';

// ============================================================================
// Types
// ============================================================================

export interface SpeciesPrediction {
  speciesCode: string | null;
  speciesScientific: string | null;
  speciesCommon: string;
  confidence: number;
  rank: number;
}

export interface ModelPrediction {
  modelName: string;
  modelVersion: string | null;
  inferenceTimeMs: number;
  predictions: SpeciesPrediction[];
}

export interface ConsensusPrediction {
  speciesCode: string | null;
  speciesScientific: string | null;
  speciesCommon: string;
  confidence: number;
  method: string;
  agreementCount: number;
  totalModels: number;
}

export interface PredictionResponse {
  recordingId: string;
  timestampUtc: string;
  processingTimeMs: number;
  modelPredictions: ModelPrediction[];
  consensus: ConsensusPrediction;
  latitude: number | null;
  longitude: number | null;
}

export interface AudioChunkRequest {
  device_id: string;
  timestamp_utc: string;
  latitude: number | null;
  longitude: number | null;
  sample_rate: number;
  audio_format: string;
  audio_base64: string;
}

export type PredictionCallback = (prediction: PredictionResponse) => void;
export type ErrorCallback = (error: Error) => void;

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  sampleRate: 16000, // 16 kHz for mobile
  windowDurationMs: 3000, // 3 second windows
  hopDurationMs: 1000, // 1 second hop
  channels: 1,
  bitsPerSample: 16,
};

// ============================================================================
// Bird Sound Service
// ============================================================================

export class BirdSoundService {
  private apiBaseUrl: string;
  private deviceId: string;
  private audioBuffer: number[] = [];
  private isRecording: boolean = false;
  private captureInterval: NodeJS.Timer | null = null;

  private onPrediction: PredictionCallback | null = null;
  private onError: ErrorCallback | null = null;

  constructor(apiBaseUrl: string, deviceId: string) {
    this.apiBaseUrl = apiBaseUrl;
    this.deviceId = deviceId;
  }

  /**
   * Set callback for prediction results
   */
  setOnPrediction(callback: PredictionCallback): void {
    this.onPrediction = callback;
  }

  /**
   * Set callback for errors
   */
  setOnError(callback: ErrorCallback): void {
    this.onError = callback;
  }

  /**
   * Initialize the audio stream
   */
  async initialize(): Promise<void> {
    // Initialize live audio stream
    // LiveAudioStream.init({
    //   sampleRate: CONFIG.sampleRate,
    //   channels: CONFIG.channels,
    //   bitsPerSample: CONFIG.bitsPerSample,
    //   audioSource: 6, // VOICE_RECOGNITION
    //   bufferSize: 4096,
    // });

    console.log('BirdSoundService initialized');
  }

  /**
   * Start continuous bird sound detection
   */
  async startListening(): Promise<void> {
    if (this.isRecording) {
      console.warn('Already recording');
      return;
    }

    this.isRecording = true;
    this.audioBuffer = [];

    // Start audio stream
    // LiveAudioStream.start();

    // Listen to audio data
    // LiveAudioStream.on('data', (data: string) => {
    //   this.handleAudioData(data);
    // });

    // For demo/testing: simulate audio data
    this.simulateAudioCapture();

    // Schedule periodic processing
    this.captureInterval = setInterval(() => {
      this.processAudioWindow();
    }, CONFIG.hopDurationMs);

    console.log('Started listening for bird sounds');
  }

  /**
   * Stop listening
   */
  async stopListening(): Promise<void> {
    this.isRecording = false;

    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
    }

    // LiveAudioStream.stop();

    console.log('Stopped listening');
  }

  /**
   * Handle incoming audio data
   */
  private handleAudioData(base64Data: string): void {
    // Decode base64 to bytes
    const buffer = Buffer.from(base64Data, 'base64');

    // Convert to 16-bit samples
    for (let i = 0; i < buffer.length; i += 2) {
      const sample = buffer.readInt16LE(i);
      this.audioBuffer.push(sample);
    }

    // Keep only last 5 seconds
    const maxSamples = CONFIG.sampleRate * 5;
    if (this.audioBuffer.length > maxSamples) {
      this.audioBuffer = this.audioBuffer.slice(-maxSamples);
    }
  }

  /**
   * Simulate audio capture for testing
   */
  private simulateAudioCapture(): void {
    // Generate random audio data for testing
    const interval = setInterval(() => {
      if (!this.isRecording) {
        clearInterval(interval);
        return;
      }

      // Generate 100ms of random audio
      const samples = Math.floor(CONFIG.sampleRate * 0.1);
      for (let i = 0; i < samples; i++) {
        this.audioBuffer.push(Math.floor(Math.random() * 65536 - 32768));
      }

      // Keep only last 5 seconds
      const maxSamples = CONFIG.sampleRate * 5;
      if (this.audioBuffer.length > maxSamples) {
        this.audioBuffer = this.audioBuffer.slice(-maxSamples);
      }
    }, 100);
  }

  /**
   * Process a 3-second window of audio
   */
  private async processAudioWindow(): Promise<void> {
    if (!this.isRecording) return;

    // Check if we have enough audio
    const windowSamples = Math.floor(
      CONFIG.sampleRate * (CONFIG.windowDurationMs / 1000)
    );

    if (this.audioBuffer.length < windowSamples) {
      console.log('Not enough audio data yet');
      return;
    }

    // Get the last 3 seconds
    const audioChunk = this.audioBuffer.slice(-windowSamples);

    try {
      // Get current location
      const position = await this.getCurrentLocation();

      // Convert to bytes
      const buffer = Buffer.alloc(audioChunk.length * 2);
      for (let i = 0; i < audioChunk.length; i++) {
        buffer.writeInt16LE(audioChunk[i], i * 2);
      }

      // Send to API
      const response = await this.sendPredictionRequest({
        audioData: buffer,
        latitude: position?.latitude ?? null,
        longitude: position?.longitude ?? null,
      });

      if (response && this.onPrediction) {
        this.onPrediction(response);
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      if (this.onError && error instanceof Error) {
        this.onError(error);
      }
    }
  }

  /**
   * Get current GPS location
   */
  private getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
    return new Promise((resolve) => {
      // Geolocation.getCurrentPosition(
      //   (position) => {
      //     resolve({
      //       latitude: position.coords.latitude,
      //       longitude: position.coords.longitude,
      //     });
      //   },
      //   (error) => {
      //     console.warn('Error getting location:', error);
      //     resolve(null);
      //   },
      //   { enableHighAccuracy: true, timeout: 5000, maximumAge: 10000 }
      // );

      // Demo: return fixed location (Berlin)
      resolve({ latitude: 52.52, longitude: 13.405 });
    });
  }

  /**
   * Send audio to backend API
   */
  private async sendPredictionRequest(params: {
    audioData: Buffer;
    latitude: number | null;
    longitude: number | null;
  }): Promise<PredictionResponse | null> {
    const { audioData, latitude, longitude } = params;

    const requestBody: AudioChunkRequest = {
      device_id: this.deviceId,
      timestamp_utc: new Date().toISOString(),
      latitude,
      longitude,
      sample_rate: CONFIG.sampleRate,
      audio_format: 'pcm16_le',
      audio_base64: audioData.toString('base64'),
    };

    try {
      const response = await fetch(`${this.apiBaseUrl}/api/v1/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return this.parseResponse(data);
    } catch (error) {
      console.error('Network error:', error);
      return null;
    }
  }

  /**
   * Parse API response
   */
  private parseResponse(data: any): PredictionResponse {
    return {
      recordingId: data.recording_id,
      timestampUtc: data.timestamp_utc,
      processingTimeMs: data.processing_time_ms,
      modelPredictions: data.model_predictions.map((mp: any) => ({
        modelName: mp.model_name,
        modelVersion: mp.model_version,
        inferenceTimeMs: mp.inference_time_ms,
        predictions: mp.predictions.map((p: any) => ({
          speciesCode: p.species_code,
          speciesScientific: p.species_scientific,
          speciesCommon: p.species_common,
          confidence: p.confidence,
          rank: p.rank,
        })),
      })),
      consensus: {
        speciesCode: data.consensus.species_code,
        speciesScientific: data.consensus.species_scientific,
        speciesCommon: data.consensus.species_common,
        confidence: data.consensus.confidence,
        method: data.consensus.method,
        agreementCount: data.consensus.agreement_count,
        totalModels: data.consensus.total_models,
      },
      latitude: data.latitude,
      longitude: data.longitude,
    };
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stopListening();
    this.onPrediction = null;
    this.onError = null;
  }
}

// ============================================================================
// Example React Native Component
// ============================================================================

/*
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { BirdSoundService, PredictionResponse } from './services/BirdSoundService';

const API_URL = 'http://your-server:8000';
const DEVICE_ID = `rn-${Date.now()}`;

export default function BirdDetectionScreen() {
  const [service] = useState(() => new BirdSoundService(API_URL, DEVICE_ID));
  const [isListening, setIsListening] = useState(false);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize service
    service.initialize();

    // Set callbacks
    service.setOnPrediction((pred) => {
      setPrediction(pred);
      setError(null);
    });

    service.setOnError((err) => {
      setError(err.message);
    });

    return () => {
      service.dispose();
    };
  }, [service]);

  const toggleListening = useCallback(async () => {
    if (isListening) {
      await service.stopListening();
    } else {
      await service.startListening();
    }
    setIsListening(!isListening);
  }, [isListening, service]);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Bird Sound Detector</Text>

      <View style={styles.statusContainer}>
        <View
          style={[
            styles.statusIndicator,
            { backgroundColor: isListening ? '#4CAF50' : '#9E9E9E' },
          ]}
        />
        <Text style={styles.statusText}>
          {isListening ? 'Listening...' : 'Not listening'}
        </Text>
      </View>

      {prediction && (
        <View style={styles.predictionContainer}>
          <Text style={styles.speciesName}>
            {prediction.consensus.speciesCommon}
          </Text>
          <Text style={styles.confidence}>
            {(prediction.consensus.confidence * 100).toFixed(1)}% confidence
          </Text>
          <Text style={styles.modelInfo}>
            {prediction.consensus.agreementCount}/{prediction.consensus.totalModels} models agree
          </Text>

          <View style={styles.modelList}>
            {prediction.modelPredictions.map((mp, idx) => (
              <Text key={idx} style={styles.modelItem}>
                {mp.modelName}: {mp.predictions[0]?.speciesCommon || 'N/A'} (
                {((mp.predictions[0]?.confidence || 0) * 100).toFixed(0)}%)
              </Text>
            ))}
          </View>
        </View>
      )}

      {error && (
        <Text style={styles.error}>{error}</Text>
      )}

      <TouchableOpacity
        style={[styles.button, isListening && styles.buttonStop]}
        onPress={toggleListening}
      >
        <Text style={styles.buttonText}>
          {isListening ? 'Stop' : 'Start Listening'}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  statusIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
  },
  predictionContainer: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 20,
  },
  speciesName: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  confidence: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  modelInfo: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 12,
  },
  modelList: {
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingTop: 12,
  },
  modelItem: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  error: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonStop: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
*/

export default BirdSoundService;
