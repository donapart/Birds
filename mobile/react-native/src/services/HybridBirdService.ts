/**
 * Hybrid Bird Detection Service
 * 
 * Combines offline (TFLite) and online (Server API) detection:
 * - Offline-first: Works without internet
 * - Auto-sync: Uploads detections when online
 * - Smart fallback: Uses server for better accuracy when available
 * - Location-aware: Filters species by region
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { offlineDetector, OfflineDetection, ModelType } from './OfflineBirdDetector';
import EnhancedBirdSoundService, { Detection } from './EnhancedBirdSoundService';

// ============================================================================
// Types
// ============================================================================

export interface HybridDetection extends Detection {
  source: 'offline' | 'server' | 'hybrid';
  offlineConfidence?: number;
  serverConfidence?: number;
}

export interface SyncStatus {
  lastSync: Date | null;
  pendingCount: number;
  isSyncing: boolean;
  error?: string;
}

export interface HybridConfig {
  apiUrl: string;
  preferServer: boolean;  // Use server when online for better accuracy
  autoSync: boolean;      // Auto-sync offline detections
  syncInterval: number;   // Sync interval in ms
  offlineModel: ModelType;
  minConfidence: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: HybridConfig = {
  apiUrl: 'http://192.168.1.100:8003',
  preferServer: true,
  autoSync: true,
  syncInterval: 5 * 60 * 1000, // 5 minutes
  offlineModel: 'birdnet-lite',
  minConfidence: 0.3,
};

// ============================================================================
// Hybrid Bird Service
// ============================================================================

export class HybridBirdService {
  private config: HybridConfig;
  private serverService: EnhancedBirdSoundService | null = null;
  private isOnline: boolean = false;
  private syncTimer: NodeJS.Timeout | null = null;
  private syncStatus: SyncStatus = {
    lastSync: null,
    pendingCount: 0,
    isSyncing: false,
  };
  
  // Callbacks
  private onDetectionCallback?: (detection: HybridDetection) => void;
  private onNetworkChangeCallback?: (isOnline: boolean) => void;
  private onSyncStatusChangeCallback?: (status: SyncStatus) => void;
  
  constructor(config: Partial<HybridConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  // ==========================================================================
  // Initialization
  // ==========================================================================
  
  /**
   * Initialize the hybrid service
   */
  async initialize(): Promise<void> {
    console.log('Initializing Hybrid Bird Service...');
    
    // Load saved config
    await this.loadConfig();
    
    // Setup network listener
    NetInfo.addEventListener(this.handleNetworkChange.bind(this));
    const netState = await NetInfo.fetch();
    this.isOnline = netState.isConnected ?? false;
    
    // Initialize offline detector
    const models = await offlineDetector.getAvailableModels();
    const targetModel = models.find(m => m.version === this.config.offlineModel);
    
    if (targetModel?.isDownloaded) {
      await offlineDetector.loadModel(this.config.offlineModel);
      console.log('Offline model loaded');
    } else {
      console.log('Offline model not downloaded yet');
    }
    
    // Initialize server service if online
    if (this.isOnline) {
      await this.initializeServerService();
    }
    
    // Start auto-sync if enabled
    if (this.config.autoSync) {
      this.startAutoSync();
    }
    
    // Update pending count
    await this.updatePendingCount();
    
    console.log(`Hybrid service ready. Online: ${this.isOnline}`);
  }
  
  /**
   * Initialize server service
   */
  private async initializeServerService(): Promise<void> {
    try {
      this.serverService = new EnhancedBirdSoundService(
        this.config.apiUrl,
        `hybrid-${Date.now()}`
      );
      await this.serverService.initialize();
      console.log('Server service initialized');
    } catch (error) {
      console.warn('Failed to initialize server service:', error);
      this.serverService = null;
    }
  }
  
  // ==========================================================================
  // Detection
  // ==========================================================================
  
  /**
   * Detect birds in audio buffer
   * Uses hybrid strategy based on network availability
   */
  async detect(
    audioBuffer: Float32Array,
    sampleRate: number = 48000,
    latitude?: number,
    longitude?: number
  ): Promise<HybridDetection[]> {
    const results: HybridDetection[] = [];
    
    // Strategy 1: Server preferred and online
    if (this.config.preferServer && this.isOnline && this.serverService) {
      try {
        // Use server for primary detection
        const serverResults = await this.detectWithServer(
          audioBuffer, sampleRate, latitude, longitude
        );
        
        // Optionally run offline for comparison
        if (offlineDetector.isReady()) {
          const offlineResults = await offlineDetector.detectBirds(
            audioBuffer, sampleRate, latitude, longitude
          );
          
          // Merge results (server primary, offline secondary)
          return this.mergeResults(serverResults, offlineResults);
        }
        
        return serverResults;
      } catch (error) {
        console.warn('Server detection failed, falling back to offline:', error);
      }
    }
    
    // Strategy 2: Offline detection
    if (offlineDetector.isReady()) {
      const offlineResults = await offlineDetector.detectBirds(
        audioBuffer, sampleRate, latitude, longitude
      );
      
      return offlineResults.map(d => ({
        ...d,
        source: 'offline' as const,
        offlineConfidence: d.confidence,
      }));
    }
    
    // No detection available
    console.warn('No detection method available');
    return [];
  }
  
  /**
   * Detect using server API
   */
  private async detectWithServer(
    audioBuffer: Float32Array,
    sampleRate: number,
    latitude?: number,
    longitude?: number
  ): Promise<HybridDetection[]> {
    // Convert audio buffer to WAV
    const wavBlob = this.audioBufferToWav(audioBuffer, sampleRate);
    
    // Create form data
    const formData = new FormData();
    formData.append('file', wavBlob, 'audio.wav');
    if (latitude) formData.append('lat', latitude.toString());
    if (longitude) formData.append('lon', longitude.toString());
    
    // Send to server
    const response = await fetch(`${this.config.apiUrl}/api/v1/predict/quick`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return data.predictions.map((p: any, index: number) => ({
      id: `server_${Date.now()}_${index}`,
      species: p.species_common || p.species_scientific,
      scientificName: p.species_scientific,
      confidence: p.confidence,
      timestamp: new Date(),
      source: 'server' as const,
      serverConfidence: p.confidence,
      isOffline: false,
      synced: true,
    }));
  }
  
  /**
   * Merge offline and server results
   */
  private mergeResults(
    serverResults: HybridDetection[],
    offlineResults: OfflineDetection[]
  ): HybridDetection[] {
    const merged: HybridDetection[] = [];
    const seenSpecies = new Set<string>();
    
    // Add server results first (higher priority)
    for (const sr of serverResults) {
      seenSpecies.add(sr.scientificName);
      merged.push(sr);
    }
    
    // Add offline results that aren't duplicates
    for (const or of offlineResults) {
      if (!seenSpecies.has(or.scientificName)) {
        merged.push({
          ...or,
          source: 'offline',
          offlineConfidence: or.confidence,
        });
        seenSpecies.add(or.scientificName);
      } else {
        // Update existing with offline confidence
        const existing = merged.find(m => m.scientificName === or.scientificName);
        if (existing) {
          existing.source = 'hybrid';
          existing.offlineConfidence = or.confidence;
          // Average the confidences for hybrid
          existing.confidence = (existing.serverConfidence! + or.confidence) / 2;
        }
      }
    }
    
    // Sort by confidence
    merged.sort((a, b) => b.confidence - a.confidence);
    
    return merged;
  }
  
  // ==========================================================================
  // Sync
  // ==========================================================================
  
  /**
   * Sync offline detections to server
   */
  async syncToServer(): Promise<{ synced: number; failed: number }> {
    if (!this.isOnline) {
      return { synced: 0, failed: 0 };
    }
    
    this.syncStatus.isSyncing = true;
    this.notifySyncStatusChange();
    
    let synced = 0;
    let failed = 0;
    
    try {
      const unsynced = await offlineDetector.getUnsyncedDetections();
      
      for (const detection of unsynced) {
        try {
          await fetch(`${this.config.apiUrl}/api/v1/detections/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              species: detection.species,
              scientific_name: detection.scientificName,
              confidence: detection.confidence,
              timestamp: detection.timestamp.toISOString(),
              latitude: detection.location?.latitude,
              longitude: detection.location?.longitude,
              source: 'offline_mobile',
            }),
          });
          
          await offlineDetector.markAsSynced([detection.id]);
          synced++;
        } catch (error) {
          console.warn(`Failed to sync detection ${detection.id}:`, error);
          failed++;
        }
      }
      
      this.syncStatus.lastSync = new Date();
      this.syncStatus.error = undefined;
    } catch (error) {
      this.syncStatus.error = String(error);
    } finally {
      this.syncStatus.isSyncing = false;
      await this.updatePendingCount();
      this.notifySyncStatusChange();
    }
    
    return { synced, failed };
  }
  
  /**
   * Start auto-sync timer
   */
  private startAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    
    this.syncTimer = setInterval(async () => {
      if (this.isOnline) {
        await this.syncToServer();
      }
    }, this.config.syncInterval);
  }
  
  /**
   * Update pending sync count
   */
  private async updatePendingCount(): Promise<void> {
    const unsynced = await offlineDetector.getUnsyncedDetections();
    this.syncStatus.pendingCount = unsynced.length;
  }
  
  // ==========================================================================
  // Network Handling
  // ==========================================================================
  
  /**
   * Handle network state changes
   */
  private async handleNetworkChange(state: NetInfoState): Promise<void> {
    const wasOnline = this.isOnline;
    this.isOnline = state.isConnected ?? false;
    
    if (this.isOnline !== wasOnline) {
      console.log(`Network changed: ${this.isOnline ? 'Online' : 'Offline'}`);
      
      if (this.isOnline) {
        // Coming online - initialize server and sync
        await this.initializeServerService();
        if (this.config.autoSync) {
          await this.syncToServer();
        }
      }
      
      this.onNetworkChangeCallback?.(this.isOnline);
    }
  }
  
  // ==========================================================================
  // Model Management
  // ==========================================================================
  
  /**
   * Download offline model
   */
  async downloadOfflineModel(
    modelType: ModelType = 'birdnet-lite',
    onProgress?: (progress: number) => void
  ): Promise<boolean> {
    const success = await offlineDetector.downloadModel(modelType, onProgress);
    
    if (success) {
      await offlineDetector.loadModel(modelType);
      this.config.offlineModel = modelType;
      await this.saveConfig();
    }
    
    return success;
  }
  
  /**
   * Get offline model status
   */
  async getOfflineModelStatus(): Promise<{
    isReady: boolean;
    modelType: ModelType | null;
    speciesCount: number;
    storageUsed: number;
  }> {
    const modelInfo = offlineDetector.getModelInfo();
    const storage = await offlineDetector.getStorageUsage();
    
    return {
      isReady: offlineDetector.isReady(),
      modelType: modelInfo?.type || null,
      speciesCount: modelInfo?.speciesCount || 0,
      storageUsed: storage.totalSize,
    };
  }
  
  // ==========================================================================
  // Configuration
  // ==========================================================================
  
  /**
   * Update configuration
   */
  async updateConfig(newConfig: Partial<HybridConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    await this.saveConfig();
    
    // Restart auto-sync if interval changed
    if (newConfig.syncInterval || newConfig.autoSync !== undefined) {
      if (this.config.autoSync) {
        this.startAutoSync();
      } else if (this.syncTimer) {
        clearInterval(this.syncTimer);
        this.syncTimer = null;
      }
    }
  }
  
  /**
   * Save config to storage
   */
  private async saveConfig(): Promise<void> {
    await AsyncStorage.setItem('hybrid_config', JSON.stringify(this.config));
  }
  
  /**
   * Load config from storage
   */
  private async loadConfig(): Promise<void> {
    try {
      const saved = await AsyncStorage.getItem('hybrid_config');
      if (saved) {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.warn('Failed to load config:', error);
    }
  }
  
  // ==========================================================================
  // Callbacks
  // ==========================================================================
  
  setOnDetection(callback: (detection: HybridDetection) => void): void {
    this.onDetectionCallback = callback;
  }
  
  setOnNetworkChange(callback: (isOnline: boolean) => void): void {
    this.onNetworkChangeCallback = callback;
  }
  
  setOnSyncStatusChange(callback: (status: SyncStatus) => void): void {
    this.onSyncStatusChangeCallback = callback;
  }
  
  private notifySyncStatusChange(): void {
    this.onSyncStatusChangeCallback?.({ ...this.syncStatus });
  }
  
  // ==========================================================================
  // Utility
  // ==========================================================================
  
  /**
   * Convert Float32Array to WAV blob
   */
  private audioBufferToWav(buffer: Float32Array, sampleRate: number): Blob {
    const numChannels = 1;
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = buffer.length * bytesPerSample;
    
    const arrayBuffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bytesPerSample * 8, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);
    
    // Audio data
    const offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      const sample = Math.max(-1, Math.min(1, buffer[i]));
      view.setInt16(offset + i * 2, sample * 0x7FFF, true);
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }
  
  /**
   * Get current status
   */
  getStatus(): {
    isOnline: boolean;
    offlineReady: boolean;
    serverConnected: boolean;
    syncStatus: SyncStatus;
    config: HybridConfig;
  } {
    return {
      isOnline: this.isOnline,
      offlineReady: offlineDetector.isReady(),
      serverConnected: this.serverService !== null,
      syncStatus: { ...this.syncStatus },
      config: { ...this.config },
    };
  }
  
  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const hybridService = new HybridBirdService();
export default hybridService;
