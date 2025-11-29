/**
 * Stereo Audio Service for Bird Sound Detection
 * 
 * Supports:
 * - Mono recording (built-in mic)
 * - Stereo recording (USB audio interface or stereo mic)
 * - Direction detection via stereo analysis
 * - Multi-microphone setups
 * 
 * Hardware Requirements for Stereo:
 * - USB Audio Interface (e.g., Focusrite, Behringer) + USB OTG adapter
 * - Stereo microphone (e.g., Zoom iQ7, Rode VideoMic Stereo)
 * - Android device with USB Host support
 */

import { Buffer } from 'buffer';

// ============================================================================
// Types
// ============================================================================

export interface AudioConfig {
  sampleRate: number;
  channels: 1 | 2;
  bitsPerSample: 16 | 24;
  bufferSize: number;
  audioSource: AudioSource;
}

export enum AudioSource {
  DEFAULT = 0,
  MIC = 1,
  VOICE_RECOGNITION = 6,
  CAMCORDER = 5,
  UNPROCESSED = 9,  // Best for external mics
}

export interface StereoAnalysis {
  leftLevel: number;      // -1 to 1 (RMS)
  rightLevel: number;     // -1 to 1 (RMS)
  balance: number;        // -1 (full left) to 1 (full right)
  direction: number;      // -90° to +90° estimated direction
  correlation: number;    // 0 to 1 (how similar L/R are)
  isStereo: boolean;
}

export interface AudioDevice {
  id: string;
  name: string;
  type: 'builtin' | 'usb' | 'bluetooth' | 'wired';
  channels: number;
  sampleRates: number[];
  isDefault: boolean;
}

export type AudioDataCallback = (
  data: Int16Array,
  stereoAnalysis: StereoAnalysis | null
) => void;

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: AudioConfig = {
  sampleRate: 44100,      // CD quality for better bird sound capture
  channels: 2,            // Stereo by default
  bitsPerSample: 16,
  bufferSize: 4096,
  audioSource: AudioSource.UNPROCESSED,
};

// ============================================================================
// Stereo Audio Service
// ============================================================================

export class StereoAudioService {
  private config: AudioConfig;
  private isRecording: boolean = false;
  private audioBuffer: Int16Array[] = [];
  private onAudioData: AudioDataCallback | null = null;
  private selectedDevice: AudioDevice | null = null;
  
  // Simulated devices for demo
  private availableDevices: AudioDevice[] = [
    {
      id: 'builtin',
      name: 'Eingebautes Mikrofon',
      type: 'builtin',
      channels: 1,
      sampleRates: [16000, 44100, 48000],
      isDefault: true,
    },
    {
      id: 'usb-stereo',
      name: 'USB Audio Interface (Stereo)',
      type: 'usb',
      channels: 2,
      sampleRates: [44100, 48000, 96000],
      isDefault: false,
    },
  ];

  constructor(config: Partial<AudioConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================================================
  // Device Management
  // ============================================================================

  /**
   * Get list of available audio input devices
   */
  async getAvailableDevices(): Promise<AudioDevice[]> {
    // In real implementation, this would query Android AudioManager
    // AudioManager.getDevices(AudioManager.GET_DEVICES_INPUTS)
    
    console.log('Scanning for audio devices...');
    return this.availableDevices;
  }

  /**
   * Select a specific audio input device
   */
  async selectDevice(deviceId: string): Promise<boolean> {
    const device = this.availableDevices.find(d => d.id === deviceId);
    if (!device) {
      console.error(`Device not found: ${deviceId}`);
      return false;
    }

    this.selectedDevice = device;
    
    // Adjust config based on device capabilities
    if (device.channels === 1) {
      this.config.channels = 1;
    }
    
    console.log(`Selected device: ${device.name} (${device.channels} channels)`);
    return true;
  }

  /**
   * Check if stereo recording is available
   */
  isStereoAvailable(): boolean {
    if (!this.selectedDevice) {
      return false;
    }
    return this.selectedDevice.channels >= 2;
  }

  // ============================================================================
  // Recording Control
  // ============================================================================

  /**
   * Initialize audio capture
   */
  async initialize(): Promise<void> {
    // In real implementation:
    // 1. Request RECORD_AUDIO permission
    // 2. Initialize AudioRecord with selected device
    // 3. Set up audio routing
    
    console.log('StereoAudioService initialized');
    console.log(`Config: ${this.config.sampleRate}Hz, ${this.config.channels}ch, ${this.config.bitsPerSample}bit`);
  }

  /**
   * Start recording
   */
  async startRecording(): Promise<void> {
    if (this.isRecording) {
      console.warn('Already recording');
      return;
    }

    this.isRecording = true;
    this.audioBuffer = [];

    // Start simulated audio capture
    this.simulateAudioCapture();

    console.log('Started recording');
  }

  /**
   * Stop recording
   */
  async stopRecording(): Promise<void> {
    this.isRecording = false;
    console.log('Stopped recording');
  }

  /**
   * Set callback for audio data
   */
  setOnAudioData(callback: AudioDataCallback): void {
    this.onAudioData = callback;
  }

  // ============================================================================
  // Stereo Analysis
  // ============================================================================

  /**
   * Analyze stereo audio for direction detection
   */
  analyzeStereo(samples: Int16Array): StereoAnalysis {
    if (this.config.channels !== 2) {
      return {
        leftLevel: 0,
        rightLevel: 0,
        balance: 0,
        direction: 0,
        correlation: 1,
        isStereo: false,
      };
    }

    const numSamples = samples.length / 2;
    let leftSum = 0, rightSum = 0;
    let leftSqSum = 0, rightSqSum = 0;
    let crossSum = 0;

    // Separate left and right channels and calculate statistics
    for (let i = 0; i < numSamples; i++) {
      const left = samples[i * 2] / 32768;
      const right = samples[i * 2 + 1] / 32768;

      leftSum += left;
      rightSum += right;
      leftSqSum += left * left;
      rightSqSum += right * right;
      crossSum += left * right;
    }

    // Calculate RMS levels
    const leftRms = Math.sqrt(leftSqSum / numSamples);
    const rightRms = Math.sqrt(rightSqSum / numSamples);

    // Calculate balance (-1 = full left, +1 = full right)
    const totalLevel = leftRms + rightRms;
    const balance = totalLevel > 0 ? (rightRms - leftRms) / totalLevel : 0;

    // Calculate correlation (similarity between channels)
    const leftStd = Math.sqrt(leftSqSum / numSamples - Math.pow(leftSum / numSamples, 2));
    const rightStd = Math.sqrt(rightSqSum / numSamples - Math.pow(rightSum / numSamples, 2));
    const covariance = crossSum / numSamples - (leftSum * rightSum) / (numSamples * numSamples);
    const correlation = (leftStd > 0 && rightStd > 0) 
      ? Math.max(-1, Math.min(1, covariance / (leftStd * rightStd)))
      : 1;

    // Estimate direction based on time delay (simplified)
    // In a real implementation, use cross-correlation for ITD estimation
    const direction = balance * 90; // Simplified: -90° to +90°

    return {
      leftLevel: leftRms,
      rightLevel: rightRms,
      balance,
      direction,
      correlation,
      isStereo: true,
    };
  }

  /**
   * Estimate bird direction using Interaural Time Difference (ITD)
   * This is a more sophisticated algorithm for direction detection
   */
  estimateDirection(
    leftChannel: Float32Array,
    rightChannel: Float32Array,
    sampleRate: number,
    micDistance: number = 0.15 // meters between mics (typical human head width)
  ): { angle: number; confidence: number } {
    // Cross-correlation to find time delay
    const maxDelay = Math.ceil(micDistance / 343 * sampleRate); // 343 m/s speed of sound
    let maxCorr = -Infinity;
    let bestDelay = 0;

    for (let delay = -maxDelay; delay <= maxDelay; delay++) {
      let corr = 0;
      let count = 0;

      for (let i = Math.max(0, delay); i < Math.min(leftChannel.length, rightChannel.length + delay); i++) {
        corr += leftChannel[i] * rightChannel[i - delay];
        count++;
      }

      if (count > 0) {
        corr /= count;
        if (corr > maxCorr) {
          maxCorr = corr;
          bestDelay = delay;
        }
      }
    }

    // Convert delay to angle
    const timeDelay = bestDelay / sampleRate;
    const maxTimeDelay = micDistance / 343;
    const sinAngle = Math.max(-1, Math.min(1, timeDelay / maxTimeDelay));
    const angle = Math.asin(sinAngle) * (180 / Math.PI);

    // Confidence based on correlation strength
    const confidence = Math.max(0, Math.min(1, maxCorr));

    return { angle, confidence };
  }

  // ============================================================================
  // Audio Processing Utilities
  // ============================================================================

  /**
   * Convert stereo to mono (for API submission)
   */
  stereoToMono(stereoSamples: Int16Array): Int16Array {
    if (this.config.channels === 1) {
      return stereoSamples;
    }

    const monoLength = stereoSamples.length / 2;
    const mono = new Int16Array(monoLength);

    for (let i = 0; i < monoLength; i++) {
      const left = stereoSamples[i * 2];
      const right = stereoSamples[i * 2 + 1];
      mono[i] = Math.round((left + right) / 2);
    }

    return mono;
  }

  /**
   * Get separate channels from stereo audio
   */
  splitChannels(stereoSamples: Int16Array): { left: Int16Array; right: Int16Array } {
    if (this.config.channels === 1) {
      return { left: stereoSamples, right: stereoSamples };
    }

    const length = stereoSamples.length / 2;
    const left = new Int16Array(length);
    const right = new Int16Array(length);

    for (let i = 0; i < length; i++) {
      left[i] = stereoSamples[i * 2];
      right[i] = stereoSamples[i * 2 + 1];
    }

    return { left, right };
  }

  /**
   * Apply high-pass filter to remove wind noise
   */
  applyHighPassFilter(samples: Int16Array, cutoffHz: number = 200): Int16Array {
    const filtered = new Int16Array(samples.length);
    const rc = 1 / (2 * Math.PI * cutoffHz);
    const dt = 1 / this.config.sampleRate;
    const alpha = rc / (rc + dt);

    let prevInput = 0;
    let prevOutput = 0;

    for (let i = 0; i < samples.length; i++) {
      const input = samples[i];
      const output = alpha * (prevOutput + input - prevInput);
      filtered[i] = Math.round(output);
      prevInput = input;
      prevOutput = output;
    }

    return filtered;
  }

  // ============================================================================
  // Simulation for Demo
  // ============================================================================

  private simulateAudioCapture(): void {
    const bufferDurationMs = 100;
    const samplesPerBuffer = Math.floor(
      this.config.sampleRate * bufferDurationMs / 1000 * this.config.channels
    );

    const interval = setInterval(() => {
      if (!this.isRecording) {
        clearInterval(interval);
        return;
      }

      // Generate simulated stereo audio
      const samples = new Int16Array(samplesPerBuffer);
      const frequency = 3000 + Math.random() * 2000; // Bird frequency range
      const amplitude = 0.3 + Math.random() * 0.2;
      
      // Simulate a bird slightly to the left
      const birdDirection = -30 + Math.random() * 60; // degrees
      const delayFactor = Math.sin(birdDirection * Math.PI / 180);
      const delaySamples = Math.round(delayFactor * 10);

      for (let i = 0; i < samplesPerBuffer / this.config.channels; i++) {
        const t = i / this.config.sampleRate;
        const baseSample = Math.sin(2 * Math.PI * frequency * t) * amplitude * 32767;
        
        if (this.config.channels === 2) {
          // Stereo: left channel
          samples[i * 2] = Math.round(baseSample + (Math.random() - 0.5) * 1000);
          // Stereo: right channel with slight delay/level difference
          const rightIndex = Math.max(0, i - delaySamples);
          const rightSample = Math.sin(2 * Math.PI * frequency * (rightIndex / this.config.sampleRate));
          samples[i * 2 + 1] = Math.round(rightSample * amplitude * 32767 * (1 - delayFactor * 0.2) + (Math.random() - 0.5) * 1000);
        } else {
          // Mono
          samples[i] = Math.round(baseSample + (Math.random() - 0.5) * 1000);
        }
      }

      // Analyze and callback
      const analysis = this.config.channels === 2 ? this.analyzeStereo(samples) : null;
      
      if (this.onAudioData) {
        this.onAudioData(samples, analysis);
      }

    }, bufferDurationMs);
  }

  // ============================================================================
  // Resource Cleanup
  // ============================================================================

  dispose(): void {
    this.stopRecording();
    this.onAudioData = null;
    this.selectedDevice = null;
  }
}

export default StereoAudioService;
