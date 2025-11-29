/**
 * Offline Bird Detection Service
 * 
 * Uses TensorFlow Lite for on-device bird sound classification.
 * Falls back to server API when online for better accuracy.
 * 
 * Models:
 * - BirdNET-Lite (~50MB) - 1000+ species, optimized for mobile
 * - Optional: Perch TFLite (~100MB) - 10,000+ species
 */

import { Platform } from 'react-native';
import RNFS from 'react-native-fs';

// ============================================================================
// Types
// ============================================================================

export interface OfflineDetection {
  id: string;
  species: string;
  scientificName: string;
  confidence: number;
  timestamp: Date;
  isOffline: boolean;
  audioPath?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  synced: boolean;
}

export interface ModelInfo {
  name: string;
  version: string;
  speciesCount: number;
  sizeBytes: number;
  isDownloaded: boolean;
  downloadProgress?: number;
}

export type ModelType = 'birdnet-lite' | 'perch-lite';

// ============================================================================
// Model URLs and Metadata
// ============================================================================

const MODELS: Record<ModelType, {
  url: string;
  labelsUrl: string;
  size: number;
  species: number;
  description: string;
}> = {
  'birdnet-lite': {
    url: 'https://github.com/kahst/BirdNET-Lite/raw/main/model/BirdNET_GLOBAL_3K_V2.3_Model_FP16.tflite',
    labelsUrl: 'https://github.com/kahst/BirdNET-Lite/raw/main/model/labels.txt',
    size: 50 * 1024 * 1024, // ~50MB
    species: 3000,
    description: 'BirdNET Lite - Optimiert für Mobile',
  },
  'perch-lite': {
    url: 'https://www.kaggle.com/models/google/bird-vocalization-classifier/frameworks/tfLite/variations/default/versions/1',
    labelsUrl: 'https://www.kaggle.com/models/google/bird-vocalization-classifier/frameworks/tfLite/variations/default/versions/1/labels.txt',
    size: 100 * 1024 * 1024, // ~100MB
    species: 10000,
    description: 'Google Perch - Mehr Arten',
  },
};

// German bird names for common species
const GERMAN_BIRD_NAMES: Record<string, string> = {
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
// Offline Bird Detector Class
// ============================================================================

export class OfflineBirdDetector {
  private modelPath: string | null = null;
  private labelsPath: string | null = null;
  private labels: string[] = [];
  private isModelLoaded: boolean = false;
  private currentModel: ModelType = 'birdnet-lite';
  
  // TFLite interpreter reference (via react-native-tflite)
  private interpreter: any = null;
  
  // Offline detection queue
  private offlineQueue: OfflineDetection[] = [];
  
  // Database path for offline storage
  private dbPath: string;
  
  constructor() {
    this.dbPath = `${RNFS.DocumentDirectoryPath}/birdsound_offline.json`;
  }
  
  // ==========================================================================
  // Model Management
  // ==========================================================================
  
  /**
   * Get available models and their download status
   */
  async getAvailableModels(): Promise<ModelInfo[]> {
    const models: ModelInfo[] = [];
    
    for (const [type, info] of Object.entries(MODELS)) {
      const modelFile = `${RNFS.DocumentDirectoryPath}/models/${type}.tflite`;
      const exists = await RNFS.exists(modelFile);
      
      models.push({
        name: info.description,
        version: type,
        speciesCount: info.species,
        sizeBytes: info.size,
        isDownloaded: exists,
      });
    }
    
    return models;
  }
  
  /**
   * Download a model for offline use
   */
  async downloadModel(
    modelType: ModelType,
    onProgress?: (progress: number) => void
  ): Promise<boolean> {
    const modelInfo = MODELS[modelType];
    if (!modelInfo) {
      throw new Error(`Unknown model type: ${modelType}`);
    }
    
    const modelsDir = `${RNFS.DocumentDirectoryPath}/models`;
    const modelFile = `${modelsDir}/${modelType}.tflite`;
    const labelsFile = `${modelsDir}/${modelType}_labels.txt`;
    
    try {
      // Create models directory
      await RNFS.mkdir(modelsDir);
      
      // Download model
      console.log(`Downloading ${modelType} model...`);
      
      const downloadResult = await RNFS.downloadFile({
        fromUrl: modelInfo.url,
        toFile: modelFile,
        progress: (res) => {
          const progress = res.bytesWritten / modelInfo.size;
          onProgress?.(progress * 0.9); // 90% for model
        },
      }).promise;
      
      if (downloadResult.statusCode !== 200) {
        throw new Error(`Download failed: ${downloadResult.statusCode}`);
      }
      
      // Download labels
      console.log(`Downloading ${modelType} labels...`);
      await RNFS.downloadFile({
        fromUrl: modelInfo.labelsUrl,
        toFile: labelsFile,
      }).promise;
      
      onProgress?.(1.0);
      console.log(`${modelType} downloaded successfully`);
      
      return true;
    } catch (error) {
      console.error(`Failed to download ${modelType}:`, error);
      // Clean up partial downloads
      await RNFS.unlink(modelFile).catch(() => {});
      await RNFS.unlink(labelsFile).catch(() => {});
      return false;
    }
  }
  
  /**
   * Load a model for inference
   */
  async loadModel(modelType: ModelType = 'birdnet-lite'): Promise<boolean> {
    const modelsDir = `${RNFS.DocumentDirectoryPath}/models`;
    const modelFile = `${modelsDir}/${modelType}.tflite`;
    const labelsFile = `${modelsDir}/${modelType}_labels.txt`;
    
    // Check if model exists
    if (!await RNFS.exists(modelFile)) {
      console.log(`Model ${modelType} not downloaded`);
      return false;
    }
    
    try {
      // Load labels
      const labelsContent = await RNFS.readFile(labelsFile, 'utf8');
      this.labels = labelsContent.split('\n').filter(l => l.trim());
      
      // Load TFLite model
      // Note: This requires react-native-tflite or similar package
      // For now, we'll use a placeholder
      this.modelPath = modelFile;
      this.labelsPath = labelsFile;
      this.currentModel = modelType;
      this.isModelLoaded = true;
      
      console.log(`Loaded ${modelType} with ${this.labels.length} species`);
      return true;
    } catch (error) {
      console.error(`Failed to load model:`, error);
      return false;
    }
  }
  
  // ==========================================================================
  // Audio Processing
  // ==========================================================================
  
  /**
   * Process audio buffer for bird detection
   * Returns top predictions
   */
  async detectBirds(
    audioBuffer: Float32Array,
    sampleRate: number = 48000,
    latitude?: number,
    longitude?: number
  ): Promise<OfflineDetection[]> {
    if (!this.isModelLoaded) {
      throw new Error('Model not loaded. Call loadModel() first.');
    }
    
    const detections: OfflineDetection[] = [];
    
    try {
      // Preprocess audio
      const processedAudio = this.preprocessAudio(audioBuffer, sampleRate);
      
      // Run inference
      // Note: Actual TFLite inference would go here
      // This is a placeholder showing the expected interface
      const predictions = await this.runInference(processedAudio);
      
      // Process predictions
      const timestamp = new Date();
      
      for (let i = 0; i < Math.min(5, predictions.length); i++) {
        const pred = predictions[i];
        if (pred.confidence < 0.1) continue;
        
        const germanName = GERMAN_BIRD_NAMES[pred.scientificName] || pred.species;
        
        detections.push({
          id: `offline_${timestamp.getTime()}_${i}`,
          species: germanName,
          scientificName: pred.scientificName,
          confidence: pred.confidence,
          timestamp,
          isOffline: true,
          location: latitude && longitude ? { latitude, longitude } : undefined,
          synced: false,
        });
      }
      
      // Save to offline queue
      await this.saveDetections(detections);
      
      return detections;
    } catch (error) {
      console.error('Detection failed:', error);
      return [];
    }
  }
  
  /**
   * Preprocess audio for model input
   */
  private preprocessAudio(audio: Float32Array, sampleRate: number): Float32Array {
    // Resample to 48kHz if needed
    const targetSampleRate = 48000;
    let processed = audio;
    
    if (sampleRate !== targetSampleRate) {
      const ratio = targetSampleRate / sampleRate;
      const newLength = Math.floor(audio.length * ratio);
      processed = new Float32Array(newLength);
      
      for (let i = 0; i < newLength; i++) {
        const srcIndex = i / ratio;
        const srcIndexFloor = Math.floor(srcIndex);
        const srcIndexCeil = Math.min(srcIndexFloor + 1, audio.length - 1);
        const t = srcIndex - srcIndexFloor;
        processed[i] = audio[srcIndexFloor] * (1 - t) + audio[srcIndexCeil] * t;
      }
    }
    
    // Ensure 3-second window (144000 samples at 48kHz)
    const windowSize = 3 * targetSampleRate;
    if (processed.length > windowSize) {
      processed = processed.slice(0, windowSize);
    } else if (processed.length < windowSize) {
      const padded = new Float32Array(windowSize);
      padded.set(processed);
      processed = padded;
    }
    
    // Normalize
    let max = 0;
    for (let i = 0; i < processed.length; i++) {
      max = Math.max(max, Math.abs(processed[i]));
    }
    if (max > 0) {
      for (let i = 0; i < processed.length; i++) {
        processed[i] /= max;
      }
    }
    
    return processed;
  }
  
  /**
   * Run TFLite inference
   * Note: This is a placeholder - actual implementation requires react-native-tflite
   */
  private async runInference(audio: Float32Array): Promise<Array<{
    species: string;
    scientificName: string;
    confidence: number;
  }>> {
    // Placeholder: In production, this would use TFLite interpreter
    // For now, return empty to show the interface
    console.log('TFLite inference placeholder - integrate react-native-tflite');
    
    // Example of what actual inference would return:
    // const output = await this.interpreter.run(audio);
    // return this.processOutput(output);
    
    return [];
  }
  
  // ==========================================================================
  // Offline Storage
  // ==========================================================================
  
  /**
   * Save detections to local storage
   */
  private async saveDetections(detections: OfflineDetection[]): Promise<void> {
    try {
      let existing: OfflineDetection[] = [];
      
      if (await RNFS.exists(this.dbPath)) {
        const content = await RNFS.readFile(this.dbPath, 'utf8');
        existing = JSON.parse(content);
      }
      
      const updated = [...existing, ...detections];
      
      // Keep last 1000 detections
      const trimmed = updated.slice(-1000);
      
      await RNFS.writeFile(this.dbPath, JSON.stringify(trimmed, null, 2), 'utf8');
    } catch (error) {
      console.error('Failed to save detections:', error);
    }
  }
  
  /**
   * Get all offline detections
   */
  async getOfflineDetections(): Promise<OfflineDetection[]> {
    try {
      if (!await RNFS.exists(this.dbPath)) {
        return [];
      }
      
      const content = await RNFS.readFile(this.dbPath, 'utf8');
      const detections = JSON.parse(content) as OfflineDetection[];
      
      // Parse dates
      return detections.map(d => ({
        ...d,
        timestamp: new Date(d.timestamp),
      }));
    } catch (error) {
      console.error('Failed to load detections:', error);
      return [];
    }
  }
  
  /**
   * Get unsynced detections for upload
   */
  async getUnsyncedDetections(): Promise<OfflineDetection[]> {
    const all = await this.getOfflineDetections();
    return all.filter(d => !d.synced);
  }
  
  /**
   * Mark detections as synced
   */
  async markAsSynced(ids: string[]): Promise<void> {
    const all = await this.getOfflineDetections();
    const updated = all.map(d => ({
      ...d,
      synced: ids.includes(d.id) ? true : d.synced,
    }));
    
    await RNFS.writeFile(this.dbPath, JSON.stringify(updated, null, 2), 'utf8');
  }
  
  /**
   * Clear old synced detections
   */
  async cleanupSyncedDetections(olderThanDays: number = 30): Promise<number> {
    const all = await this.getOfflineDetections();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);
    
    const filtered = all.filter(d => 
      !d.synced || d.timestamp > cutoff
    );
    
    const removed = all.length - filtered.length;
    
    await RNFS.writeFile(this.dbPath, JSON.stringify(filtered, null, 2), 'utf8');
    
    return removed;
  }
  
  // ==========================================================================
  // Utility
  // ==========================================================================
  
  /**
   * Get model info
   */
  getModelInfo(): { type: ModelType; speciesCount: number } | null {
    if (!this.isModelLoaded) return null;
    
    return {
      type: this.currentModel,
      speciesCount: this.labels.length,
    };
  }
  
  /**
   * Check if model is ready
   */
  isReady(): boolean {
    return this.isModelLoaded;
  }
  
  /**
   * Get storage usage
   */
  async getStorageUsage(): Promise<{
    modelsSize: number;
    detectionsSize: number;
    totalSize: number;
  }> {
    const modelsDir = `${RNFS.DocumentDirectoryPath}/models`;
    let modelsSize = 0;
    let detectionsSize = 0;
    
    try {
      const modelFiles = await RNFS.readDir(modelsDir);
      for (const file of modelFiles) {
        modelsSize += file.size;
      }
    } catch {}
    
    try {
      const stat = await RNFS.stat(this.dbPath);
      detectionsSize = stat.size;
    } catch {}
    
    return {
      modelsSize,
      detectionsSize,
      totalSize: modelsSize + detectionsSize,
    };
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const offlineDetector = new OfflineBirdDetector();
export default offlineDetector;
