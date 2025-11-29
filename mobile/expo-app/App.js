/**
 * BirdSound - Vogelstimmen-Erkennung App
 * 
 * Version 1.1.2
 * WebView-basierte App mit vollem Dashboard
 * Fixed: WebView permissions für Mikrofon, Kamera, Geolocation
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  TextInput,
  Modal,
  SafeAreaView,
  Dimensions,
  BackHandler,
  Platform,
  PermissionsAndroid,
  Alert,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';

// ============================================================================
// Konfiguration
// ============================================================================

const DEFAULT_SERVER = 'http://192.168.0.27:8003';
const APP_VERSION = '1.1.2';

// ============================================================================
// Haupt-App Komponente
// ============================================================================

export default function App() {
  const [serverUrl, setServerUrl] = useState(DEFAULT_SERVER);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [tempServerUrl, setTempServerUrl] = useState(DEFAULT_SERVER);
  const [errorMessage, setErrorMessage] = useState('');
  const [location, setLocation] = useState(null);
  
  const webViewRef = useRef(null);
  
  // ============================================================================
  // Initialisierung
  // ============================================================================
  
  useEffect(() => {
    checkServerConnection();
    requestPermissions();
    
    // Android Back-Button Handler
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    });
    
    return () => backHandler.remove();
  }, [serverUrl]);
  
  const requestPermissions = async () => {
    try {
      // Standort-Permission
      const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
      if (locStatus === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc.coords);
      }
      
      // Mikrofon-Permission für Audio-Visualisierung
      const { status: audioStatus } = await Audio.requestPermissionsAsync();
      console.log('Audio permission status:', audioStatus);
      
    } catch (error) {
      console.log('Permission-Fehler:', error);
    }
  };
  
  const checkServerConnection = async () => {
    setIsLoading(true);
    setErrorMessage('');
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch(`${serverUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        setIsConnected(true);
        setErrorMessage('');
      } else {
        throw new Error('Server antwortet nicht korrekt');
      }
    } catch (error) {
      console.log('Verbindungsfehler:', error.message);
      setIsConnected(false);
      setErrorMessage(
        error.name === 'AbortError' 
          ? 'Zeitüberschreitung - Server nicht erreichbar'
          : `Verbindung fehlgeschlagen: ${error.message}`
      );
    } finally {
      setIsLoading(false);
    }
  };
  
  const saveSettings = () => {
    setServerUrl(tempServerUrl);
    setShowSettings(false);
  };
  
  // JavaScript zum Injizieren in WebView (für native Funktionen)
  const injectedJavaScript = `
    (function() {
      // Standort an WebView übergeben
      window.nativeLocation = ${JSON.stringify(location)};
      
      // App-Version anzeigen
      console.log('BirdSound App v${APP_VERSION}');
      
      true;
    })();
  `;
  
  // ============================================================================
  // Render - Verbindungsbildschirm
  // ============================================================================
  
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
        <View style={styles.loadingContainer}>
          <Text style={styles.logo}>🐦</Text>
          <Text style={styles.title}>BirdSound</Text>
          <ActivityIndicator size="large" color="#4ECDC4" style={{ marginTop: 20 }} />
          <Text style={styles.loadingText}>Verbinde mit Server...</Text>
          <Text style={styles.serverText}>{serverUrl}</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  if (!isConnected) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
        <View style={styles.errorContainer}>
          <Text style={styles.logo}>🐦</Text>
          <Text style={styles.title}>BirdSound</Text>
          <Text style={styles.version}>v{APP_VERSION}</Text>
          
          <View style={styles.errorBox}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>Server nicht erreichbar</Text>
            <Text style={styles.errorMessage}>{errorMessage}</Text>
          </View>
          
          <View style={styles.serverInputContainer}>
            <Text style={styles.inputLabel}>Server-URL:</Text>
            <TextInput
              style={styles.serverInput}
              value={tempServerUrl}
              onChangeText={setTempServerUrl}
              placeholder="http://192.168.x.x:8003"
              placeholderTextColor="#666"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={() => {
              setServerUrl(tempServerUrl);
            }}
          >
            <Text style={styles.retryButtonText}>🔄 Erneut verbinden</Text>
          </TouchableOpacity>
          
          <View style={styles.helpBox}>
            <Text style={styles.helpTitle}>💡 Tipps:</Text>
            <Text style={styles.helpText}>• Server auf PC starten (Port 8003)</Text>
            <Text style={styles.helpText}>• Handy im gleichen WLAN</Text>
            <Text style={styles.helpText}>• IP-Adresse des PCs prüfen</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }
  
  // ============================================================================
  // Render - WebView Dashboard
  // ============================================================================
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      
      {/* Header mit Einstellungen */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerLogo}>🐦</Text>
          <Text style={styles.headerTitle}>BirdSound</Text>
          <View style={styles.connectedBadge}>
            <Text style={styles.connectedDot}>●</Text>
            <Text style={styles.connectedText}>Live</Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => {
            setTempServerUrl(serverUrl);
            setShowSettings(true);
          }}
        >
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>
      
      {/* WebView mit Dashboard */}
      <WebView
        ref={webViewRef}
        source={{ uri: serverUrl }}
        style={styles.webview}
        injectedJavaScript={injectedJavaScript}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        allowsBackForwardNavigationGestures={true}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        mixedContentMode="always"
        cacheEnabled={false}
        cacheMode="LOAD_NO_CACHE"
        originWhitelist={['*']}
        geolocationEnabled={true}
        javaScriptCanOpenWindowsAutomatically={true}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        allowFileAccessFromFileURLs={true}
        mediaCapturePermissionGrantType="grant"
        androidHardwareAccelerationDisabled={false}
        androidLayerType="hardware"
        onPermissionRequest={(request) => {
          // Erlaube alle Permissions (Mikrofon, Kamera, etc.)
          console.log('Permission request:', request.nativeEvent.resources);
          request.nativeEvent.grant(request.nativeEvent.resources);
        }}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.log('WebView error:', nativeEvent);
          setIsConnected(false);
          setErrorMessage('Fehler beim Laden: ' + nativeEvent.description);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.log('HTTP error:', nativeEvent.statusCode);
        }}
        onLoadEnd={() => {
          // Trigger resize event um Canvas neu zu initialisieren
          webViewRef.current?.injectJavaScript(`
            window.dispatchEvent(new Event('resize'));
            if (typeof initMap === 'function' && window.map) {
              window.map.invalidateSize();
            }
            console.log('WebView loaded, triggered resize');
            true;
          `);
        }}
        renderLoading={() => (
          <View style={styles.webviewLoading}>
            <ActivityIndicator size="large" color="#4ECDC4" />
            <Text style={styles.loadingText}>Dashboard wird geladen...</Text>
          </View>
        )}
      />
      
      {/* Einstellungen Modal */}
      <Modal
        visible={showSettings}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>⚙️ Einstellungen</Text>
            
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Server-URL:</Text>
              <TextInput
                style={styles.settingInput}
                value={tempServerUrl}
                onChangeText={setTempServerUrl}
                placeholder="http://192.168.x.x:8003"
                placeholderTextColor="#666"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            
            <View style={styles.settingInfo}>
              <Text style={styles.settingInfoText}>📍 Standort: {
                location 
                  ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                  : 'Nicht verfügbar'
              }</Text>
              <Text style={styles.settingInfoText}>📱 Version: {APP_VERSION}</Text>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowSettings(false)}
              >
                <Text style={styles.cancelButtonText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]}
                onPress={saveSettings}
              >
                <Text style={styles.saveButtonText}>Speichern</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================================================
// Styles
// ============================================================================

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  
  // Loading Screen
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logo: {
    fontSize: 80,
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4ECDC4',
  },
  version: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  loadingText: {
    color: '#888',
    marginTop: 15,
    fontSize: 16,
  },
  serverText: {
    color: '#4ECDC4',
    marginTop: 5,
    fontSize: 14,
  },
  
  // Error Screen
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorBox: {
    backgroundColor: 'rgba(255, 100, 100, 0.1)',
    borderRadius: 12,
    padding: 20,
    marginTop: 30,
    marginBottom: 20,
    alignItems: 'center',
    width: '100%',
    maxWidth: 350,
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ff6b6b',
    marginBottom: 10,
  },
  errorMessage: {
    color: '#aaa',
    textAlign: 'center',
    fontSize: 14,
  },
  
  // Server Input
  serverInputContainer: {
    width: '100%',
    maxWidth: 350,
    marginBottom: 20,
  },
  inputLabel: {
    color: '#888',
    marginBottom: 8,
    fontSize: 14,
  },
  serverInput: {
    backgroundColor: '#16213e',
    borderRadius: 10,
    padding: 15,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  
  // Retry Button
  retryButton: {
    backgroundColor: '#4ECDC4',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    marginBottom: 30,
  },
  retryButtonText: {
    color: '#1a1a2e',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Help Box
  helpBox: {
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    borderRadius: 12,
    padding: 15,
    width: '100%',
    maxWidth: 350,
  },
  helpTitle: {
    color: '#4ECDC4',
    fontWeight: 'bold',
    marginBottom: 10,
    fontSize: 14,
  },
  helpText: {
    color: '#888',
    fontSize: 13,
    marginBottom: 5,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#16213e',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    fontSize: 24,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4ECDC4',
    marginRight: 10,
  },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(78, 205, 196, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  connectedDot: {
    color: '#4ECDC4',
    fontSize: 10,
    marginRight: 4,
  },
  connectedText: {
    color: '#4ECDC4',
    fontSize: 12,
    fontWeight: '600',
  },
  settingsButton: {
    padding: 8,
  },
  settingsIcon: {
    fontSize: 22,
  },
  
  // WebView
  webview: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  webviewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  settingRow: {
    marginBottom: 15,
  },
  settingLabel: {
    color: '#888',
    marginBottom: 8,
    fontSize: 14,
  },
  settingInput: {
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  settingInfo: {
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  settingInfoText: {
    color: '#888',
    fontSize: 13,
    marginBottom: 5,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#333',
  },
  cancelButtonText: {
    color: '#888',
    textAlign: 'center',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#4ECDC4',
  },
  saveButtonText: {
    color: '#1a1a2e',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});
