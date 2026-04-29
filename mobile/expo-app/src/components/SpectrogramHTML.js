/**
 * 3D Waterfall Spectrogram (HTML/Canvas) embedded in WebView.
 * Extracted from App.js to keep the main bundle file small and readable.
 */
export const SPECTROGRAM_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #1a1a2e; overflow: hidden; touch-action: none; }
    canvas { display: block; width: 100%; height: 100%; }
    #info { position: absolute; bottom: 8px; left: 8px; color: #4ecdc4; font-family: monospace; font-size: 10px; opacity: 0.8; }
    #freq { position: absolute; top: 8px; right: 8px; color: #fff; font-family: monospace; font-size: 11px; text-align: right; line-height: 1.6; }
    #axes { position: absolute; bottom: 8px; right: 8px; color: #888; font-family: monospace; font-size: 9px; }
  </style>
</head>
<body>
  <canvas id="canvas"></canvas>
  <div id="info">3D Spektrogramm</div>
  <div id="freq">
    <div style="color:#00ff00">8kHz</div>
    <div style="color:#80ff00">4kHz</div>
    <div style="color:#ffff00">2kHz</div>
    <div style="color:#ff8000">1kHz</div>
  </div>
  <script>
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const info = document.getElementById('info');
    
    // Konfiguration - Waterfall Chart Style
    const CONFIG = {
      bands: 128,          // Mehr Frequenzbänder für feinere Auflösung
      history: 100,        // Längere Zeithistorie (Tiefe)
      perspective: 800,    // Perspektive-Distanz
      rotationX: 0.65,     // X-Rotation (Neigung) - flacher Blickwinkel
      rotationY: -0.35,    // Y-Rotation - leicht gedreht
      smoothing: 0.6,      // Glättung
      heightScale: 200,    // Höhenskalierung der Balken
      baseHeight: 0,       // Basishöhe
      gridLines: true,     // Gitterlinien anzeigen
    };
    
    // Datenstrukturen
    let spectrogramData = [];
    let currentBands = new Array(CONFIG.bands).fill(0);
    let animationId = null;
    
    // Canvas-Größe
    function resize() {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
    }
    window.addEventListener('resize', resize);
    resize();
    
    // Waterfall-Farbpalette: Rot -> Orange -> Gelb -> Grün (wie in den Screenshots)
    function getWaterfallColor(value) {
      const v = Math.min(1, Math.max(0, value));
      let r, g, b;
      
      if (v < 0.25) {
        // Rot zu Orange
        const t = v / 0.25;
        r = 255;
        g = Math.floor(80 * t);
        b = 0;
      } else if (v < 0.5) {
        // Orange zu Gelb
        const t = (v - 0.25) / 0.25;
        r = 255;
        g = 80 + Math.floor(175 * t);
        b = 0;
      } else if (v < 0.75) {
        // Gelb zu Hellgrün
        const t = (v - 0.5) / 0.25;
        r = 255 - Math.floor(155 * t);
        g = 255;
        b = 0;
      } else {
        // Hellgrün zu Grün
        const t = (v - 0.75) / 0.25;
        r = 100 - Math.floor(100 * t);
        g = 255;
        b = Math.floor(50 * t);
      }
      
      return { r, g, b };
    }
    
    // 3D Projektion - isometrische Perspektive wie Waterfall Chart
    function project3D(x, y, z) {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const centerX = w * 0.5;
      const centerY = h * 0.75;
      
      // Rotation anwenden
      const cosX = Math.cos(CONFIG.rotationX);
      const sinX = Math.sin(CONFIG.rotationX);
      const cosY = Math.cos(CONFIG.rotationY);
      const sinY = Math.sin(CONFIG.rotationY);
      
      // Y-Achsen-Rotation
      const x1 = x * cosY - z * sinY;
      const z1 = x * sinY + z * cosY;
      
      // X-Achsen-Rotation
      const y1 = y * cosX - z1 * sinX;
      const z2 = y * sinX + z1 * cosX;
      
      // Perspektivische Projektion
      const scale = CONFIG.perspective / (CONFIG.perspective + z2);
      
      return {
        x: centerX + x1 * scale,
        y: centerY - y1 * scale,
        z: z2,
        scale: scale
      };
    }
    
    // Zeichne Gitterlinien auf der Grundfläche
    function drawGrid() {
      const w = window.innerWidth;
      const gridWidth = w * 0.8;
      const gridDepth = w * 0.6;
      const gridLines = 10;
      
      ctx.strokeStyle = 'rgba(100, 100, 120, 0.4)';
      ctx.lineWidth = 1;
      
      // Horizontale Linien (Frequenz)
      for (let i = 0; i <= gridLines; i++) {
        const x = -gridWidth/2 + (i / gridLines) * gridWidth;
        const p1 = project3D(x, 0, 0);
        const p2 = project3D(x, 0, gridDepth);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
      
      // Vertikale Linien (Zeit)
      for (let i = 0; i <= gridLines; i++) {
        const z = (i / gridLines) * gridDepth;
        const p1 = project3D(-gridWidth/2, 0, z);
        const p2 = project3D(gridWidth/2, 0, z);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
      
      // Achsenbeschriftung
      ctx.fillStyle = '#888';
      ctx.font = '10px monospace';
      
      // Frequenz-Achse
      const freqLabels = ['1kHz', '2kHz', '4kHz', '8kHz'];
      freqLabels.forEach((label, i) => {
        const x = -gridWidth/2 + ((i + 1) / 5) * gridWidth;
        const p = project3D(x, 0, gridDepth + 20);
        ctx.fillText(label, p.x - 15, p.y + 15);
      });
    }
    
    // Zeichne Achsen
    function drawAxes() {
      const w = window.innerWidth;
      const axisLen = w * 0.1;
      
      // Y-Achse (Amplitude)
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 1;
      
      const origin = project3D(-w * 0.4, 0, 0);
      const yTop = project3D(-w * 0.4, CONFIG.heightScale * 1.2, 0);
      
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(yTop.x, yTop.y);
      ctx.stroke();
      
      // Y-Achsen-Striche
      for (let i = 1; i <= 4; i++) {
        const y = (i / 4) * CONFIG.heightScale * 1.2;
        const p = project3D(-w * 0.4, y, 0);
        ctx.beginPath();
        ctx.moveTo(p.x - 5, p.y);
        ctx.lineTo(p.x + 5, p.y);
        ctx.stroke();
      }
    }
    
    // Hauptzeichenfunktion - Waterfall 3D
    function draw() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      
      // Hintergrund
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, w, h);
      
      // Gitter und Achsen
      if (CONFIG.gridLines) {
        drawGrid();
        drawAxes();
      }
      
      const gridWidth = w * 0.8;
      const gridDepth = w * 0.6;
      const bandWidth = gridWidth / CONFIG.bands;
      const rowDepth = gridDepth / CONFIG.history;
      
      // Spektrogramm von hinten nach vorne zeichnen (Painter's Algorithm)
      for (let z = spectrogramData.length - 1; z >= 0; z--) {
        const row = spectrogramData[z];
        if (!row) continue;
        
        const zPos = z * rowDepth;
        const nextZPos = (z + 1) * rowDepth;
        
        for (let x = 0; x < row.length - 1; x++) {
          const value = row[x] || 0;
          const nextValue = row[x + 1] || 0;
          const nextRowValue = (spectrogramData[z + 1] && spectrogramData[z + 1][x]) || 0;
          const nextRowNextValue = (spectrogramData[z + 1] && spectrogramData[z + 1][x + 1]) || 0;
          
          const xPos = -gridWidth/2 + x * bandWidth;
          const nextXPos = -gridWidth/2 + (x + 1) * bandWidth;
          
          const height = value * CONFIG.heightScale;
          const nextHeight = nextValue * CONFIG.heightScale;
          const backHeight = nextRowValue * CONFIG.heightScale;
          const backNextHeight = nextRowNextValue * CONFIG.heightScale;
          
          // 4 Eckpunkte der Oberfläche
          const p1 = project3D(xPos, height, zPos);
          const p2 = project3D(nextXPos, nextHeight, zPos);
          const p3 = project3D(nextXPos, backNextHeight, nextZPos);
          const p4 = project3D(xPos, backHeight, nextZPos);
          
          // Durchschnittswert für Farbe
          const avgValue = (value + nextValue + nextRowValue + nextRowNextValue) / 4;
          
          if (avgValue > 0.01) {
            const color = getWaterfallColor(avgValue);
            
            // Schattierung basierend auf Tiefe
            const depthFade = 1 - (z / CONFIG.history) * 0.5;
            const r = Math.floor(color.r * depthFade);
            const g = Math.floor(color.g * depthFade);
            const b = Math.floor(color.b * depthFade);
            
            // Fläche zeichnen
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineTo(p3.x, p3.y);
            ctx.lineTo(p4.x, p4.y);
            ctx.closePath();
            
            ctx.fillStyle = \`rgb(\${r},\${g},\${b})\`;
            ctx.fill();
            
            // Leichte Konturlinie für 3D-Effekt
            if (avgValue > 0.1) {
              ctx.strokeStyle = \`rgba(\${Math.min(255, r + 30)},\${Math.min(255, g + 30)},\${b},0.3)\`;
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          }
          
          // Vertikale Balken von der Grundfläche - nur für stärkere Signale
          if (value > 0.15 && z < 3) {
            const base = project3D(xPos + bandWidth/2, 0, zPos);
            const top = project3D(xPos + bandWidth/2, height, zPos);
            
            const color = getWaterfallColor(value);
            ctx.strokeStyle = \`rgba(\${color.r},\${color.g},\${color.b},0.6)\`;
            ctx.lineWidth = Math.max(1, bandWidth * p1.scale * 0.5);
            ctx.beginPath();
            ctx.moveTo(base.x, base.y);
            ctx.lineTo(top.x, top.y);
            ctx.stroke();
          }
        }
      }
      
      // Info aktualisieren
      const maxBand = currentBands.indexOf(Math.max(...currentBands));
      const dominantFreq = Math.round((maxBand / CONFIG.bands) * 8000);
      const maxVal = Math.max(...currentBands);
      if (dominantFreq > 200 && maxVal > 0.05) {
        info.textContent = \`🎵 \${dominantFreq} Hz • Level: \${Math.round(maxVal * 100)}%\`;
      } else {
        info.textContent = '3D Spektrogramm';
      }
    }
    
    // Animation
    function animate() {
      draw();
      animationId = requestAnimationFrame(animate);
    }
    animate();
    
    // Audio-Daten vom React Native empfangen
    function updateSpectrum(data) {
      if (!data || !data.length) return;
      
      // Smooth interpolation
      for (let i = 0; i < CONFIG.bands; i++) {
        const srcIdx = Math.floor(i * data.length / CONFIG.bands);
        const value = data[srcIdx] || 0;
        currentBands[i] = currentBands[i] * CONFIG.smoothing + value * (1 - CONFIG.smoothing);
      }
      
      // Add to history
      spectrogramData.unshift([...currentBands]);
      if (spectrogramData.length > CONFIG.history) {
        spectrogramData.pop();
      }
    }
    
    // Simulierte Frequenzdaten basierend auf Audio-Level
    function updateFromLevel(level) {
      const normalizedLevel = Math.min(1, level / 100);
      const bands = new Array(CONFIG.bands);
      
      for (let i = 0; i < CONFIG.bands; i++) {
        const freqFactor = i / CONFIG.bands;
        // Vogelstimmen: 1-8 kHz, Peak bei 2-4 kHz
        const birdPeak1 = Math.exp(-Math.pow((freqFactor - 0.3) * 4, 2));
        const birdPeak2 = Math.exp(-Math.pow((freqFactor - 0.5) * 5, 2)) * 0.7;
        const birdWeight = birdPeak1 + birdPeak2;
        
        // Natürliche Variation mit Harmonischen
        const harmonics = Math.sin(freqFactor * Math.PI * 8) * 0.2 + 0.8;
        const noise = 0.5 + Math.random() * 0.5;
        
        bands[i] = normalizedLevel * birdWeight * noise * harmonics;
      }
      
      updateSpectrum(bands);
    }
    
    // Clear Spektrogramm
    function clearSpectrum() {
      spectrogramData = [];
      currentBands = new Array(CONFIG.bands).fill(0);
    }
    
    // Handler für Nachrichten von React Native
    function handleMessage(event) {
      try {
        const data = event.data || event.detail;
        const msg = typeof data === 'string' ? JSON.parse(data) : data;
        if (msg.type === 'level') {
          updateFromLevel(msg.value);
        } else if (msg.type === 'spectrum') {
          updateSpectrum(msg.data);
        } else if (msg.type === 'clear') {
          clearSpectrum();
        } else if (msg.type === 'config') {
          Object.assign(CONFIG, msg.config);
        }
      } catch(e) { console.log('Message parse error:', e); }
    }
    
    // Beide Event-Typen für Android und iOS Kompatibilität
    window.addEventListener('message', handleMessage);
    document.addEventListener('message', handleMessage);
    
    // Touch-Interaktion für Rotation
    let touchStart = null;
    let lastPinchDist = 0;
    
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        lastPinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    });
    
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length === 1 && touchStart) {
        const dx = e.touches[0].clientX - touchStart.x;
        const dy = e.touches[0].clientY - touchStart.y;
        CONFIG.rotationY = Math.max(-1, Math.min(1, CONFIG.rotationY + dx * 0.003));
        CONFIG.rotationX = Math.max(0.3, Math.min(1.2, CONFIG.rotationX + dy * 0.003));
        touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const delta = dist - lastPinchDist;
        CONFIG.heightScale = Math.max(50, Math.min(400, CONFIG.heightScale + delta * 0.5));
        lastPinchDist = dist;
      }
    });
    
    canvas.addEventListener('touchend', () => { touchStart = null; });
  </script>
</body>
</html>
`;

export default SPECTROGRAM_HTML;
