/**
 * Offline Status Component
 * 
 * Shows network status, sync state, and offline capabilities.
 * Allows model download and manual sync.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import hybridService, { SyncStatus, HybridConfig } from '../services/HybridBirdService';
import { offlineDetector } from '../services/OfflineBirdDetector';

// ============================================================================
// Types
// ============================================================================

interface OfflineStatusProps {
  style?: any;
  compact?: boolean;
  onPress?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const OfflineStatusBar: React.FC<OfflineStatusProps> = ({
  style,
  compact = false,
  onPress,
}) => {
  const [isOnline, setIsOnline] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSync: null,
    pendingCount: 0,
    isSyncing: false,
  });
  const [modelDownloading, setModelDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  
  const pulseAnim = new Animated.Value(1);
  
  useEffect(() => {
    // Initial status
    updateStatus();
    
    // Setup listeners
    hybridService.setOnNetworkChange((online) => {
      setIsOnline(online);
    });
    
    hybridService.setOnSyncStatusChange((status) => {
      setSyncStatus(status);
    });
    
    // Pulse animation for syncing
    if (syncStatus.isSyncing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.5, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    }
    
    return () => {
      pulseAnim.stopAnimation();
    };
  }, [syncStatus.isSyncing]);
  
  const updateStatus = async () => {
    const status = hybridService.getStatus();
    setIsOnline(status.isOnline);
    setOfflineReady(status.offlineReady);
    setSyncStatus(status.syncStatus);
  };
  
  const handleDownloadModel = async () => {
    if (modelDownloading) return;
    
    setModelDownloading(true);
    setDownloadProgress(0);
    
    const success = await hybridService.downloadOfflineModel(
      'birdnet-lite',
      (progress) => setDownloadProgress(progress)
    );
    
    setModelDownloading(false);
    
    if (success) {
      setOfflineReady(true);
    }
  };
  
  const handleSync = async () => {
    if (syncStatus.isSyncing || !isOnline) return;
    await hybridService.syncToServer();
  };
  
  const formatLastSync = (date: Date | null): string => {
    if (!date) return 'Nie';
    
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Gerade eben';
    if (minutes < 60) return `Vor ${minutes} Min.`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Vor ${hours} Std.`;
    
    return date.toLocaleDateString('de-DE');
  };
  
  // ==========================================================================
  // Compact Mode
  // ==========================================================================
  
  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactContainer, style]}
        onPress={onPress}
      >
        <View style={styles.compactRow}>
          {/* Network Status Dot */}
          <View style={[
            styles.statusDot,
            { backgroundColor: isOnline ? '#4ECDC4' : '#FF6B6B' }
          ]} />
          
          {/* Offline Ready Icon */}
          {offlineReady && (
            <Text style={styles.compactIcon}>📱</Text>
          )}
          
          {/* Pending Count */}
          {syncStatus.pendingCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{syncStatus.pendingCount}</Text>
            </View>
          )}
          
          {/* Syncing Indicator */}
          {syncStatus.isSyncing && (
            <ActivityIndicator size="small" color="#4ECDC4" />
          )}
        </View>
      </TouchableOpacity>
    );
  }
  
  // ==========================================================================
  // Full Mode
  // ==========================================================================
  
  return (
    <View style={[styles.container, style]}>
      {/* Network Status */}
      <View style={styles.section}>
        <View style={styles.statusRow}>
          <View style={[
            styles.statusDot,
            { backgroundColor: isOnline ? '#4ECDC4' : '#FF6B6B' }
          ]} />
          <Text style={styles.statusText}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>
      
      {/* Offline Model Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Offline-Modus</Text>
        
        {offlineReady ? (
          <View style={styles.statusRow}>
            <Text style={styles.checkIcon}>✓</Text>
            <Text style={styles.statusText}>
              BirdNET-Lite bereit (~1000 Arten)
            </Text>
          </View>
        ) : modelDownloading ? (
          <View style={styles.downloadContainer}>
            <ActivityIndicator color="#4ECDC4" />
            <View style={styles.progressBar}>
              <View style={[
                styles.progressFill,
                { width: `${downloadProgress * 100}%` }
              ]} />
            </View>
            <Text style={styles.progressText}>
              {Math.round(downloadProgress * 100)}%
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.downloadButton}
            onPress={handleDownloadModel}
          >
            <Text style={styles.downloadButtonText}>
              📥 Offline-Modell herunterladen (~50MB)
            </Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Sync Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Synchronisation</Text>
        
        <View style={styles.syncRow}>
          <View>
            <Text style={styles.statusText}>
              Letzte Sync: {formatLastSync(syncStatus.lastSync)}
            </Text>
            {syncStatus.pendingCount > 0 && (
              <Text style={styles.pendingText}>
                {syncStatus.pendingCount} Erkennung(en) warten auf Sync
              </Text>
            )}
          </View>
          
          {isOnline && syncStatus.pendingCount > 0 && (
            <TouchableOpacity
              style={[
                styles.syncButton,
                syncStatus.isSyncing && styles.syncButtonDisabled
              ]}
              onPress={handleSync}
              disabled={syncStatus.isSyncing}
            >
              {syncStatus.isSyncing ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.syncButtonText}>🔄 Sync</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
        
        {syncStatus.error && (
          <Text style={styles.errorText}>⚠️ {syncStatus.error}</Text>
        )}
      </View>
    </View>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1E1E2E',
    borderRadius: 12,
    padding: 16,
    margin: 16,
  },
  
  compactContainer: {
    backgroundColor: '#1E1E2E',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  
  compactIcon: {
    fontSize: 14,
  },
  
  section: {
    marginBottom: 16,
  },
  
  sectionTitle: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  
  statusText: {
    color: '#FFF',
    fontSize: 14,
  },
  
  checkIcon: {
    color: '#4ECDC4',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  downloadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    overflow: 'hidden',
  },
  
  progressFill: {
    height: '100%',
    backgroundColor: '#4ECDC4',
  },
  
  progressText: {
    color: '#888',
    fontSize: 12,
    width: 40,
    textAlign: 'right',
  },
  
  downloadButton: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  
  downloadButtonText: {
    color: '#4ECDC4',
    fontSize: 14,
    fontWeight: '600',
  },
  
  syncRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  pendingText: {
    color: '#FFB347',
    fontSize: 12,
    marginTop: 4,
  },
  
  syncButton: {
    backgroundColor: '#4ECDC4',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  
  syncButtonDisabled: {
    opacity: 0.6,
  },
  
  syncButtonText: {
    color: '#1E1E2E',
    fontSize: 14,
    fontWeight: '600',
  },
  
  badge: {
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  
  badgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    marginTop: 8,
  },
});

export default OfflineStatusBar;
