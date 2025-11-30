/**
 * BirdSound - Vogelstimmen-Erkennung App
 * 
 * Version 1.3.0 - Embedded HTML (keine HTTP-Anfragen nötig)
 * Das komplette Dashboard ist direkt eingebettet
 */

import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, StatusBar, BackHandler, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import Constants from 'expo-constants';

// Komplettes HTML eingebettet - kein HTTP nötig!
const EMBEDDED_HTML = `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>BirdSound</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #1a1a2e;
            color: #eee;
            min-height: 100vh;
            overflow-x: hidden;
        }
        .header {
            background: linear-gradient(135deg, #16213e 0%, #1a1a2e 100%);
            padding: 12px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #333;
            position: sticky;
            top: 0;
            z-index: 100;
        }
        .header h1 {
            font-size: 1.3rem;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .status-badge {
            display: flex;
            align-items: center;
            gap: 6px;
            background: rgba(81, 207, 102, 0.2);
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
        }
        .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #51cf66;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.3); opacity: 0.7; }
        }
        .main {
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }
        .card {
            background: #16213e;
            border-radius: 12px;
            padding: 16px;
            border: 1px solid #333;
        }
        .card-title {
            font-size: 0.9rem;
            color: #888;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        /* Live Detection */
        .live-detection {
            text-align: center;
            padding: 24px 16px;
        }
        .detection-icon {
            font-size: 4rem;
            margin-bottom: 12px;
            animation: bounce 2s ease-in-out infinite;
        }
        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
        .detection-species {
            font-size: 1.8rem;
            font-weight: 600;
            color: #4ecdc4;
            margin-bottom: 8px;
        }
        .detection-conf {
            font-size: 1.1rem;
            color: #51cf66;
        }
        .detection-time {
            font-size: 0.85rem;
            color: #666;
            margin-top: 8px;
        }
        
        /* Pegel Meter */
        .pegel-container {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .pegel-bar {
            flex: 1;
            height: 24px;
            background: #0a0a15;
            border-radius: 12px;
            overflow: hidden;
            position: relative;
        }
        .pegel-fill {
            height: 100%;
            background: linear-gradient(90deg, #51cf66 0%, #ffd93d 60%, #ff6b6b 100%);
            border-radius: 12px;
            transition: width 0.15s ease-out;
            box-shadow: 0 0 10px rgba(81, 207, 102, 0.5);
        }
        .pegel-value {
            min-width: 60px;
            text-align: right;
            font-family: monospace;
            font-size: 0.9rem;
            color: #4ecdc4;
        }
        
        /* Spektrogramm */
        .spektro-canvas {
            width: 100%;
            height: 100px;
            background: #0a0a15;
            border-radius: 8px;
        }
        
        /* Waveform */
        .wave-canvas {
            width: 100%;
            height: 80px;
            background: #0a0a15;
            border-radius: 8px;
        }
        
        /* Map */
        #map {
            height: 250px;
            border-radius: 8px;
            z-index: 1;
        }
        
        /* Timeline */
        .timeline-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            background: rgba(255,255,255,0.05);
            border-radius: 8px;
            margin-bottom: 8px;
            border-left: 3px solid #4ecdc4;
        }
        .timeline-icon {
            font-size: 1.8rem;
        }
        .timeline-content {
            flex: 1;
        }
        .timeline-species {
            font-weight: 600;
            font-size: 1rem;
        }
        .timeline-meta {
            font-size: 0.8rem;
            color: #888;
        }
        .timeline-conf {
            font-weight: 600;
            color: #51cf66;
            font-size: 0.95rem;
        }
        
        /* Stats Grid */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
        }
        .stat-item {
            text-align: center;
            padding: 12px;
            background: rgba(0,0,0,0.2);
            border-radius: 8px;
        }
        .stat-value {
            font-size: 1.8rem;
            font-weight: 600;
            color: #4ecdc4;
        }
        .stat-label {
            font-size: 0.75rem;
            color: #888;
            margin-top: 4px;
        }
        
        /* Demo Animation */
        .demo-note {
            text-align: center;
            padding: 8px;
            background: rgba(78, 205, 196, 0.1);
            border-radius: 8px;
            font-size: 0.8rem;
            color: #4ecdc4;
            margin-top: 12px;
        }
    </style>
</head>
<body>
    <header class="header">
        <h1>🐦 BirdSound</h1>
        <div class="status-badge">
            <div class="status-dot"></div>
            LIVE
        </div>
    </header>
    
    <main class="main">
        <!-- Live Detection Card -->
        <div class="card live-detection">
            <div class="detection-icon" id="birdIcon">🐦</div>
            <div class="detection-species" id="speciesName">Amsel</div>
            <div class="detection-conf" id="confValue">Konfidenz: 94.2%</div>
            <div class="detection-time" id="detectionTime">Gerade erkannt</div>
        </div>
        
        <!-- Pegel Meter -->
        <div class="card">
            <div class="card-title">📊 Pegel</div>
            <div class="pegel-container">
                <div class="pegel-bar">
                    <div class="pegel-fill" id="pegelFill" style="width: 45%"></div>
                </div>
                <div class="pegel-value" id="pegelValue">-12 dB</div>
            </div>
        </div>
        
        <!-- Spektrogramm -->
        <div class="card">
            <div class="card-title">🎵 Spektrogramm</div>
            <canvas class="spektro-canvas" id="spektroCanvas"></canvas>
        </div>
        
        <!-- Waveform -->
        <div class="card">
            <div class="card-title">〰️ Wellenform</div>
            <canvas class="wave-canvas" id="waveCanvas"></canvas>
        </div>
        
        <!-- Map -->
        <div class="card">
            <div class="card-title">📍 Erkennungskarte</div>
            <div id="map"></div>
        </div>
        
        <!-- Stats -->
        <div class="card">
            <div class="card-title">📈 Statistiken</div>
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-value" id="totalDetections">47</div>
                    <div class="stat-label">Erkennungen</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" id="uniqueSpecies">12</div>
                    <div class="stat-label">Arten</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" id="avgConf">87%</div>
                    <div class="stat-label">Ø Konfidenz</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" id="sessionTime">02:15</div>
                    <div class="stat-label">Session</div>
                </div>
            </div>
        </div>
        
        <!-- Timeline -->
        <div class="card">
            <div class="card-title">🕐 Letzte Erkennungen</div>
            <div id="timeline">
                <div class="timeline-item">
                    <div class="timeline-icon">🐦‍⬛</div>
                    <div class="timeline-content">
                        <div class="timeline-species">Amsel</div>
                        <div class="timeline-meta">vor 5 Sekunden</div>
                    </div>
                    <div class="timeline-conf">94%</div>
                </div>
                <div class="timeline-item">
                    <div class="timeline-icon">🐤</div>
                    <div class="timeline-content">
                        <div class="timeline-species">Kohlmeise</div>
                        <div class="timeline-meta">vor 23 Sekunden</div>
                    </div>
                    <div class="timeline-conf">89%</div>
                </div>
                <div class="timeline-item">
                    <div class="timeline-icon">🐦</div>
                    <div class="timeline-content">
                        <div class="timeline-species">Buchfink</div>
                        <div class="timeline-meta">vor 45 Sekunden</div>
                    </div>
                    <div class="timeline-conf">91%</div>
                </div>
            </div>
        </div>
        
        <div class="demo-note">
            🎯 BirdNET V2.4 - 6522 Arten weltweit
        </div>
    </main>
    
    <script>
        // === DEMO ANIMATION ===
        const birds = [
            { name: 'Amsel', icon: '🐦‍⬛', conf: 94.2 },
            { name: 'Kohlmeise', icon: '🐤', conf: 89.7 },
            { name: 'Buchfink', icon: '🐦', conf: 91.3 },
            { name: 'Rotkehlchen', icon: '🐦', conf: 87.5 },
            { name: 'Blaumeise', icon: '🐤', conf: 92.1 },
            { name: 'Haussperling', icon: '🐦', conf: 85.8 },
            { name: 'Star', icon: '🐦‍⬛', conf: 88.4 },
            { name: 'Grünfink', icon: '🐦', conf: 90.6 }
        ];
        
        let currentBird = 0;
        let detections = 47;
        
        // Pegel Animation
        function animatePegel() {
            const fill = document.getElementById('pegelFill');
            const value = document.getElementById('pegelValue');
            const level = 30 + Math.random() * 50;
            fill.style.width = level + '%';
            const db = Math.round(-30 + (level / 100) * 30);
            value.textContent = db + ' dB';
        }
        setInterval(animatePegel, 150);
        
        // Bird Detection Animation
        function showNewDetection() {
            currentBird = (currentBird + 1) % birds.length;
            const bird = birds[currentBird];
            
            document.getElementById('birdIcon').textContent = bird.icon;
            document.getElementById('speciesName').textContent = bird.name;
            document.getElementById('confValue').textContent = 'Konfidenz: ' + bird.conf.toFixed(1) + '%';
            document.getElementById('detectionTime').textContent = 'Gerade erkannt';
            
            detections++;
            document.getElementById('totalDetections').textContent = detections;
        }
        setInterval(showNewDetection, 8000);
        
        // Spektrogramm Animation
        const spektroCanvas = document.getElementById('spektroCanvas');
        const spektroCtx = spektroCanvas.getContext('2d');
        let spektroData = [];
        
        function initSpektro() {
            spektroCanvas.width = spektroCanvas.offsetWidth;
            spektroCanvas.height = spektroCanvas.offsetHeight;
            for (let i = 0; i < spektroCanvas.width; i++) {
                spektroData[i] = new Array(32).fill(0);
            }
        }
        
        function drawSpektro() {
            const w = spektroCanvas.width;
            const h = spektroCanvas.height;
            
            // Shift data left
            spektroData.shift();
            
            // New column with bird-like frequencies
            const newCol = new Array(32).fill(0);
            const birdFreqs = [8, 12, 16, 20]; // Bird song frequencies
            birdFreqs.forEach(f => {
                const intensity = Math.random() * 0.7 + 0.3;
                newCol[f] = intensity;
                if (f > 0) newCol[f-1] = intensity * 0.5;
                if (f < 31) newCol[f+1] = intensity * 0.5;
            });
            spektroData.push(newCol);
            
            // Draw
            const imgData = spektroCtx.createImageData(w, h);
            for (let x = 0; x < w; x++) {
                const col = spektroData[x] || new Array(32).fill(0);
                for (let y = 0; y < h; y++) {
                    const freqIdx = Math.floor((1 - y/h) * 32);
                    const val = col[freqIdx] || 0;
                    const idx = (y * w + x) * 4;
                    imgData.data[idx] = val * 78;      // R
                    imgData.data[idx+1] = val * 205;   // G  
                    imgData.data[idx+2] = val * 196;   // B
                    imgData.data[idx+3] = 255;
                }
            }
            spektroCtx.putImageData(imgData, 0, 0);
        }
        
        // Waveform Animation
        const waveCanvas = document.getElementById('waveCanvas');
        const waveCtx = waveCanvas.getContext('2d');
        
        function initWave() {
            waveCanvas.width = waveCanvas.offsetWidth;
            waveCanvas.height = waveCanvas.offsetHeight;
        }
        
        function drawWave() {
            const w = waveCanvas.width;
            const h = waveCanvas.height;
            
            waveCtx.fillStyle = '#0a0a15';
            waveCtx.fillRect(0, 0, w, h);
            
            waveCtx.beginPath();
            waveCtx.strokeStyle = '#4ecdc4';
            waveCtx.lineWidth = 2;
            
            const time = Date.now() / 1000;
            for (let x = 0; x < w; x++) {
                const y = h/2 + Math.sin(x * 0.05 + time * 5) * (h * 0.3) * Math.sin(x * 0.01 + time);
                if (x === 0) waveCtx.moveTo(x, y);
                else waveCtx.lineTo(x, y);
            }
            waveCtx.stroke();
        }
        
        // Map
        function initMap() {
            const map = L.map('map').setView([52.52, 13.405], 12);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap'
            }).addTo(map);
            
            // Add markers
            const locations = [
                [52.52, 13.405, 'Amsel', '🐦‍⬛'],
                [52.53, 13.42, 'Kohlmeise', '🐤'],
                [52.51, 13.39, 'Buchfink', '🐦'],
                [52.54, 13.38, 'Rotkehlchen', '🐦'],
                [52.50, 13.41, 'Star', '🐦‍⬛']
            ];
            
            locations.forEach(loc => {
                L.marker([loc[0], loc[1]])
                    .addTo(map)
                    .bindPopup(loc[3] + ' ' + loc[2]);
            });
        }
        
        // Animation loop
        function animate() {
            drawSpektro();
            drawWave();
            requestAnimationFrame(animate);
        }
        
        // Init
        window.onload = function() {
            initSpektro();
            initWave();
            initMap();
            animate();
        };
        
        window.onresize = function() {
            initSpektro();
            initWave();
        };
    </script>
</body>
</html>
`;

export default function App() {
  const webViewRef = useRef(null);
  
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => backHandler.remove();
  }, []);
  
  // StatusBar Höhe für Android
  const statusBarHeight = Platform.OS === 'android' ? Constants.statusBarHeight : 0;
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" translucent={false} />
      <View style={{ height: statusBarHeight, backgroundColor: '#1a1a2e' }} />
      <WebView
        ref={webViewRef}
        source={{ html: EMBEDDED_HTML }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        originWhitelist={['*']}
        mixedContentMode="always"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  webview: {
    flex: 1,
  },
});
