/**
 * ScientificReport — Ornithologischer Feldbericht-Generator
 * 
 * Erzeugt druckfertige HTML-Berichte im wissenschaftlichen Format
 * für Feldforschung, Bestandserfassung und Monitoring.
 * 
 * Format: DIN A4, druckoptimiert mit @media print CSS
 * Enthält: Messprotokoll, Artenliste, Statistik, Zeitanalyse
 * 
 * BirdSound v5.9.2 — Dano Schönwald
 */

// ══════════════════════════════════════════════════════════════
// STATISTISCHE FUNKTIONEN
// ══════════════════════════════════════════════════════════════

/** Shannon-Wiener Index H' (natürlicher Logarithmus) */
const shannonIndex = (counts) => {
  const vals = Object.values(counts || {});
  if (!vals.length) return 0;
  const N = vals.reduce((a, b) => a + b, 0);
  return -vals.reduce((s, n) => {
    const p = n / N;
    return s + (p > 0 ? p * Math.log(p) : 0);
  }, 0);
};

/** Simpson Index (1-D) */
const simpsonIndex = (counts) => {
  const vals = Object.values(counts || {});
  if (!vals.length) return 0;
  const N = vals.reduce((a, b) => a + b, 0);
  return 1 - vals.reduce((s, n) => s + (n * (n - 1)), 0) / (N * (N - 1) || 1);
};

/** Evenness E = H'/ln(S) */
const evenness = (counts) => {
  const S = Object.keys(counts || {}).length;
  if (S <= 1) return 1;
  return shannonIndex(counts) / Math.log(S);
};

/** Margalef Richness (S-1)/ln(N) */
const margalefIndex = (counts) => {
  const S = Object.keys(counts || {}).length;
  const N = Object.values(counts || {}).reduce((a, b) => a + b, 0);
  if (N <= 1) return 0;
  return (S - 1) / Math.log(N);
};

/** Berger-Parker Dominance Index Nmax/N */
const bergerParkerIndex = (counts) => {
  const vals = Object.values(counts || {});
  if (!vals.length) return 0;
  const N = vals.reduce((a, b) => a + b, 0);
  return Math.max(...vals) / N;
};

/** Mittlere Konfidenz */
const meanConfidence = (detections) => {
  if (!detections?.length) return 0;
  return detections.reduce((s, d) => s + (d.confidence || 0), 0) / detections.length;
};

/** Median Konfidenz */
const medianConfidence = (detections) => {
  if (!detections?.length) return 0;
  const sorted = [...detections].sort((a, b) => a.confidence - b.confidence);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid].confidence : (sorted[mid - 1].confidence + sorted[mid].confidence) / 2;
};

/** Standardabweichung Konfidenz */
const stdDevConfidence = (detections) => {
  if (detections.length < 2) return 0;
  const mean = meanConfidence(detections);
  const variance = detections.reduce((s, d) => s + Math.pow((d.confidence || 0) - mean, 2), 0) / (detections.length - 1);
  return Math.sqrt(variance);
};

/** Dominanzklassen nach Engelmann (1978) */
const getDominanceClass = (proportion) => {
  if (proportion >= 0.32) return { class: 'eudominant', label: 'Eudominant', color: '#e74c3c' };
  if (proportion >= 0.10) return { class: 'dominant', label: 'Dominant', color: '#e67e22' };
  if (proportion >= 0.032) return { class: 'subdominant', label: 'Subdominant', color: '#f1c40f' };
  if (proportion >= 0.01) return { class: 'rezedent', label: 'Rezedent', color: '#3498db' };
  return { class: 'subrezedent', label: 'Subrezedent', color: '#95a5a6' };
};

// ══════════════════════════════════════════════════════════════
// ZEITLICHE ANALYSE
// ══════════════════════════════════════════════════════════════

/** Erstellt Zeitintervall-Gruppen (5-Minuten-Blöcke) */
const buildTimeIntervals = (detections, startTime) => {
  if (!detections?.length) return [];
  const start = new Date(startTime).getTime();
  const intervals = {};
  
  detections.forEach(d => {
    const t = new Date(d.time).getTime();
    const minuteOffset = Math.floor((t - start) / 60000);
    const interval = Math.floor(minuteOffset / 5) * 5;
    const key = `${interval}-${interval + 5}`;
    if (!intervals[key]) intervals[key] = { label: key, count: 0, species: new Set() };
    intervals[key].count++;
    intervals[key].species.add(d.species);
  });
  
  return Object.values(intervals).map(i => ({
    ...i,
    speciesCount: i.species.size,
    species: undefined
  }));
};

// ══════════════════════════════════════════════════════════════
// HTML REPORT GENERATOR
// ══════════════════════════════════════════════════════════════

/**
 * Erzeugt einen wissenschaftlichen Feldbericht als HTML.
 * 
 * @param {Object} session - Session-Objekt mit detections, speciesCount, etc.
 * @param {Object} options - Optionen: { appVersion, observerName, notes }
 * @returns {string} Vollständiges HTML-Dokument
 */
export const generateFieldReport = (session, options = {}) => {
  const {
    appVersion = '5.9.2',
    observerName = 'Automatische Erfassung',
    notes = '',
  } = options;
  
  const startDate = new Date(session.startTime);
  const endDate = session.endTime ? new Date(session.endTime) : new Date();
  const durationSec = Math.floor(session.duration || (endDate - startDate) / 1000);
  const durationMin = Math.floor(durationSec / 60);
  const durationRemSec = durationSec % 60;
  
  const speciesEntries = Object.entries(session.speciesCount || {}).sort((a, b) => b[1] - a[1]);
  const totalDetections = session.detections?.length || speciesEntries.reduce((s, [, c]) => s + c, 0);
  const speciesRichness = speciesEntries.length;
  
  const H = shannonIndex(session.speciesCount);
  const D = simpsonIndex(session.speciesCount);
  const E = evenness(session.speciesCount);
  const M = margalefIndex(session.speciesCount);
  const BP = bergerParkerIndex(session.speciesCount);
  
  const meanConf = meanConfidence(session.detections || []);
  const medConf = medianConfidence(session.detections || []);
  const stdConf = stdDevConfidence(session.detections || []);
  const highConf = (session.detections || []).filter(d => d.confidence >= 0.5).length;
  const veryHighConf = (session.detections || []).filter(d => d.confidence >= 0.8).length;
  
  const loc = session.location || session.detections?.find(d => d.location)?.location;
  
  const intervals = buildTimeIntervals(session.detections, session.startTime);
  
  // Modellstatistik
  const modelCounts = {};
  (session.detections || []).forEach(d => {
    const m = d.model || 'unbekannt';
    if (!modelCounts[m]) modelCounts[m] = { count: 0, species: new Set(), confSum: 0 };
    modelCounts[m].count++;
    modelCounts[m].species.add(d.species);
    modelCounts[m].confSum += d.confidence || 0;
  });
  
  // Artenliste mit Details aufbauen
  const speciesTable = speciesEntries.map(([name, count], i) => {
    const proportion = count / totalDetections;
    const dom = getDominanceClass(proportion);
    // Aus den Detections mehr Info extrahieren
    const specDets = (session.detections || []).filter(d => d.species === name);
    const maxConf = specDets.length ? Math.max(...specDets.map(d => d.confidence || 0)) : 0;
    const avgConf = specDets.length ? specDets.reduce((s, d) => s + (d.confidence || 0), 0) / specDets.length : 0;
    const firstDetection = specDets.length ? new Date(specDets[specDets.length - 1].time) : null;
    const lastDetection = specDets.length ? new Date(specDets[0].time) : null;
    const scientific = specDets[0]?.scientific || specDets[0]?.scientificName || '';
    const english = specDets[0]?.englishName || specDets[0]?.english || '';
    const models = [...new Set(specDets.map(d => d.model || '?'))].join(', ');
    
    return {
      rank: i + 1,
      name,
      scientific,
      english,
      count,
      proportion,
      dominanceClass: dom,
      maxConf,
      avgConf,
      firstDetection,
      lastDetection,
      models,
    };
  });
  
  const reportId = `BS-${startDate.getFullYear()}${(startDate.getMonth()+1).toString().padStart(2,'0')}${startDate.getDate().toString().padStart(2,'0')}-${session.id?.toString().slice(-4) || '0000'}`;
  
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Feldbericht ${reportId}</title>
<style>
  @page { size: A4; margin: 15mm 18mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; font-size: 10pt; line-height: 1.5; color: #1a1a1a; background: #fff; max-width: 210mm; margin: 0 auto; padding: 10mm; }
  
  h1 { font-size: 16pt; color: #1a472a; border-bottom: 3px solid #1a472a; padding-bottom: 6px; margin-bottom: 12px; }
  h2 { font-size: 12pt; color: #1a472a; border-bottom: 1.5px solid #2d6a4f; padding-bottom: 3px; margin: 16px 0 8px; page-break-after: avoid; }
  h3 { font-size: 10pt; color: #2d6a4f; margin: 10px 0 4px; }
  
  .header { text-align: center; margin-bottom: 16px; }
  .header .title { font-size: 18pt; font-weight: 700; color: #1a472a; letter-spacing: 0.5px; }
  .header .subtitle { font-size: 11pt; color: #555; margin-top: 2px; }
  .header .report-id { font-family: monospace; font-size: 9pt; color: #888; margin-top: 4px; }
  
  .protocol-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 16px; background: #f8f9fa; padding: 10px 14px; border: 1px solid #dee2e6; border-radius: 4px; margin-bottom: 12px; }
  .protocol-grid dt { font-weight: 600; color: #555; font-size: 9pt; }
  .protocol-grid dd { margin-bottom: 4px; }
  
  .summary-boxes { display: flex; gap: 8px; margin: 12px 0; }
  .summary-box { flex: 1; text-align: center; background: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; padding: 8px 4px; }
  .summary-box .value { font-size: 18pt; font-weight: 700; color: #166534; }
  .summary-box .label { font-size: 8pt; color: #555; text-transform: uppercase; letter-spacing: 0.5px; }
  
  table { width: 100%; border-collapse: collapse; font-size: 9pt; margin: 6px 0 12px; }
  th { background: #1a472a; color: #fff; padding: 5px 6px; text-align: left; font-weight: 600; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.3px; }
  td { padding: 4px 6px; border-bottom: 1px solid #e9ecef; }
  tr:nth-child(even) { background: #f8f9fa; }
  tr:hover { background: #e8f5e9; }
  .num { text-align: right; font-family: monospace; }
  .pct { text-align: right; font-family: monospace; font-size: 8pt; }
  
  .dom-badge { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 7pt; font-weight: 600; color: #fff; }
  
  .stats-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin: 8px 0; }
  .stat-card { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; padding: 8px 10px; }
  .stat-card .stat-value { font-size: 14pt; font-weight: 700; color: #1a472a; font-family: monospace; }
  .stat-card .stat-label { font-size: 8pt; color: #666; }
  .stat-card .stat-desc { font-size: 7pt; color: #999; margin-top: 2px; }
  
  .conf-bar { display: inline-block; height: 10px; background: #4caf50; border-radius: 2px; vertical-align: middle; }
  
  .time-row { display: flex; align-items: center; margin: 2px 0; }
  .time-label { width: 60px; font-size: 8pt; font-family: monospace; color: #666; }
  .time-bar { height: 14px; background: #2d6a4f; border-radius: 2px; min-width: 2px; transition: width 0.3s; }
  .time-count { font-size: 8pt; margin-left: 6px; color: #555; }
  
  .methodology { background: #f8f9fa; padding: 10px 14px; border-left: 3px solid #2d6a4f; font-size: 9pt; color: #555; margin: 12px 0; }
  
  .footer { margin-top: 20px; padding-top: 8px; border-top: 2px solid #1a472a; font-size: 8pt; color: #888; display: flex; justify-content: space-between; }
  
  .notes-box { background: #fffbeb; border: 1px solid #fbbf24; border-radius: 4px; padding: 10px; margin: 8px 0; min-height: 40px; }
  .notes-box.empty { border-style: dashed; color: #999; font-style: italic; }
  
  .page-break { page-break-before: always; }
  
  @media print {
    body { padding: 0; font-size: 9pt; }
    .no-print { display: none !important; }
    h2 { page-break-after: avoid; }
    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; }
    .summary-boxes { break-inside: avoid; }
    .stats-grid { break-inside: avoid; }
  }
  
  @media screen and (max-width: 600px) {
    body { padding: 4mm; font-size: 9pt; }
    .protocol-grid { grid-template-columns: 1fr; }
    .stats-grid { grid-template-columns: 1fr 1fr; }
    .summary-boxes { flex-wrap: wrap; }
    .summary-box { min-width: 45%; }
  }
</style>
</head>
<body>

<div class="header">
  <div class="title">🐦 ORNITHOLOGISCHER FELDBERICHT</div>
  <div class="subtitle">Akustische Bestandserfassung — Punktzählung</div>
  <div class="report-id">Protokoll-Nr.: ${reportId}</div>
</div>

<h2>📋 Messprotokoll</h2>
<dl class="protocol-grid">
  <dt>Datum</dt>
  <dd><strong>${startDate.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</strong></dd>
  <dt>Uhrzeit</dt>
  <dd>${startDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} – ${endDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</dd>
  <dt>Dauer</dt>
  <dd>${durationMin} Min ${durationRemSec.toString().padStart(2, '0')} Sek</dd>
  <dt>Standort</dt>
  <dd>${loc ? `${loc.lat?.toFixed(5) || loc.latitude?.toFixed(5)}° N, ${loc.lng?.toFixed(5) || loc.longitude?.toFixed(5)}° E` : 'Keine GPS-Daten'}</dd>
  <dt>Methode</dt>
  <dd>Automatische akustische Aufnahme (Punkt-Stopp-Zählung)</dd>
  <dt>Gerät</dt>
  <dd>BirdSound v${appVersion} — Mobiles Endgerät</dd>
  <dt>Modell(e)</dt>
  <dd>${session.modelUsed === 'all' ? 'Alle verfügbaren (Multi-Model-Konsensus)' : session.modelUsed}</dd>
  <dt>Erfasser</dt>
  <dd>${observerName}</dd>
  <dt>Audio-Segmente</dt>
  <dd>${session.totalAnalyzed || 0} Chunks analysiert</dd>
  <dt>Konfidenz-Schwelle</dt>
  <dd>≥ ${Math.round((session.minConfidence || 0.3) * 100)}%</dd>
</dl>

<div class="summary-boxes">
  <div class="summary-box"><div class="value">${totalDetections}</div><div class="label">Erkennungen</div></div>
  <div class="summary-box"><div class="value">${speciesRichness}</div><div class="label">Arten (S)</div></div>
  <div class="summary-box"><div class="value">${(meanConf * 100).toFixed(0)}%</div><div class="label">Ø Konfidenz</div></div>
  <div class="summary-box"><div class="value">${session.totalAnalyzed || 0}</div><div class="label">Segmente</div></div>
</div>

<h2>🦅 Artenliste — Systematische Erfassung</h2>
<table>
  <thead>
    <tr>
      <th>#</th>
      <th>Deutscher Name</th>
      <th>Wissenschaftl. Name</th>
      <th class="num">n</th>
      <th class="pct">%</th>
      <th>Dominanz</th>
      <th class="num">Max. Konf.</th>
      <th class="num">Ø Konf.</th>
      <th>Erstnachweis</th>
      <th>Modell(e)</th>
    </tr>
  </thead>
  <tbody>
    ${speciesTable.map(sp => `
    <tr>
      <td>${sp.rank}</td>
      <td><strong>${sp.name}</strong>${sp.english && sp.english !== sp.name ? `<br><span style="color:#888;font-size:8pt">${sp.english}</span>` : ''}</td>
      <td style="font-style:italic;color:#555">${sp.scientific || '—'}</td>
      <td class="num"><strong>${sp.count}</strong></td>
      <td class="pct">${(sp.proportion * 100).toFixed(1)}%</td>
      <td><span class="dom-badge" style="background:${sp.dominanceClass.color}">${sp.dominanceClass.label}</span></td>
      <td class="num">${(sp.maxConf * 100).toFixed(0)}%<div class="conf-bar" style="width:${sp.maxConf * 50}px"></div></td>
      <td class="num">${(sp.avgConf * 100).toFixed(0)}%</td>
      <td style="font-size:8pt">${sp.firstDetection ? sp.firstDetection.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}</td>
      <td style="font-size:8pt">${sp.models}</td>
    </tr>`).join('')}
  </tbody>
</table>
<p style="font-size:8pt;color:#888">Gesamt: ${totalDetections} Erkennungen von ${speciesRichness} Arten. Dominanzklassen nach Engelmann (1978).</p>

<h2>📊 Statistische Auswertung</h2>
<h3>Diversitätsindizes</h3>
<div class="stats-grid">
  <div class="stat-card">
    <div class="stat-value">${H.toFixed(3)}</div>
    <div class="stat-label">Shannon-Wiener H'</div>
    <div class="stat-desc">Informationstheoretisches Diversitätsmaß (ln-basiert)</div>
  </div>
  <div class="stat-card">
    <div class="stat-value">${D.toFixed(3)}</div>
    <div class="stat-label">Simpson (1-D)</div>
    <div class="stat-desc">Wahrscheinlichkeit, dass zwei Individuen verschiedenen Arten angehören</div>
  </div>
  <div class="stat-card">
    <div class="stat-value">${E.toFixed(3)}</div>
    <div class="stat-label">Evenness E</div>
    <div class="stat-desc">Gleichverteilung der Arten (H'/ln S). 1 = maximal gleichverteilt</div>
  </div>
  <div class="stat-card">
    <div class="stat-value">${M.toFixed(3)}</div>
    <div class="stat-label">Margalef-Index</div>
    <div class="stat-desc">Artenreichtum relativ zum Stichprobenumfang: (S-1)/ln(N)</div>
  </div>
  <div class="stat-card">
    <div class="stat-value">${BP.toFixed(3)}</div>
    <div class="stat-label">Berger-Parker</div>
    <div class="stat-desc">Dominanzindex: Anteil der häufigsten Art (N_max/N)</div>
  </div>
  <div class="stat-card">
    <div class="stat-value">${speciesRichness}</div>
    <div class="stat-label">Species Richness S</div>
    <div class="stat-desc">Anzahl nachgewiesener Arten</div>
  </div>
</div>

<h3>Konfidenzanalyse</h3>
<div class="stats-grid">
  <div class="stat-card">
    <div class="stat-value">${(meanConf * 100).toFixed(1)}%</div>
    <div class="stat-label">Mittlere Konfidenz</div>
  </div>
  <div class="stat-card">
    <div class="stat-value">${(medConf * 100).toFixed(1)}%</div>
    <div class="stat-label">Median Konfidenz</div>
  </div>
  <div class="stat-card">
    <div class="stat-value">±${(stdConf * 100).toFixed(1)}%</div>
    <div class="stat-label">Standardabweichung</div>
  </div>
</div>
<table>
  <thead><tr><th>Konfidenzstufe</th><th class="num">Anzahl</th><th class="pct">Anteil</th></tr></thead>
  <tbody>
    <tr><td>≥ 80% (sehr sicher)</td><td class="num">${veryHighConf}</td><td class="pct">${totalDetections ? ((veryHighConf / totalDetections) * 100).toFixed(1) : 0}%</td></tr>
    <tr><td>≥ 50% (sicher)</td><td class="num">${highConf}</td><td class="pct">${totalDetections ? ((highConf / totalDetections) * 100).toFixed(1) : 0}%</td></tr>
    <tr><td>≥ 30% (wahrscheinlich)</td><td class="num">${(session.detections || []).filter(d => d.confidence >= 0.3).length}</td><td class="pct">${totalDetections ? (((session.detections || []).filter(d => d.confidence >= 0.3).length / totalDetections) * 100).toFixed(1) : 0}%</td></tr>
    <tr><td>&lt; 30% (unsicher)</td><td class="num">${(session.detections || []).filter(d => d.confidence < 0.3).length}</td><td class="pct">${totalDetections ? (((session.detections || []).filter(d => d.confidence < 0.3).length / totalDetections) * 100).toFixed(1) : 0}%</td></tr>
  </tbody>
</table>

${Object.keys(modelCounts).length > 1 ? `
<h3>Modellvergleich</h3>
<table>
  <thead><tr><th>Modell</th><th class="num">Erkennungen</th><th class="num">Arten</th><th class="num">Ø Konfidenz</th></tr></thead>
  <tbody>
    ${Object.entries(modelCounts).map(([model, data]) => `
    <tr>
      <td>${model}</td>
      <td class="num">${data.count}</td>
      <td class="num">${data.species.size}</td>
      <td class="num">${(data.confSum / data.count * 100).toFixed(1)}%</td>
    </tr>`).join('')}
  </tbody>
</table>
` : ''}

${intervals.length > 0 ? `
<h2>⏱️ Zeitliche Verteilung</h2>
<p style="font-size:9pt;color:#555">Erkennungen gruppiert in 5-Minuten-Intervalle ab Aufnahmestart:</p>
<div style="margin:8px 0">
  ${intervals.map(iv => {
    const maxCount = Math.max(...intervals.map(i => i.count), 1);
    const barWidth = Math.round((iv.count / maxCount) * 200);
    return `<div class="time-row">
      <span class="time-label">${iv.label} min</span>
      <div class="time-bar" style="width:${barWidth}px"></div>
      <span class="time-count">${iv.count} Erkennungen, ${iv.speciesCount} Arten</span>
    </div>`;
  }).join('')}
</div>
` : ''}

<h2>📝 Bemerkungen</h2>
<div class="notes-box ${notes ? '' : 'empty'}">
  ${notes || 'Keine Bemerkungen. (Feld für Wetterbedingungen, besondere Beobachtungen, Störungen etc.)'}
</div>

<h2>🔬 Methodik</h2>
<div class="methodology">
  <strong>Aufnahmemethode:</strong> Kontinuierliche akustische Aufnahme mittels Smartphone-Mikrofon. 
  Audio wird in Segmente (Chunks) aufgeteilt und sequentiell durch maschinelle Lernmodelle analysiert.<br><br>
  <strong>Erkennungsmodelle:</strong> ${session.modelUsed === 'all' 
    ? 'Multi-Model-Ansatz mit BirdNET V2.4 (Cornell Lab, 6.522 Arten), DimaBird (HuggingFace wav2vec2), und Google Perch (TF Hub, 15.000+ Arten). Konsensus-Ergebnis via gewichteter Mittelung.'
    : `Einzelmodell: ${session.modelUsed}`}<br><br>
  <strong>Konfidenz:</strong> Die Konfidenzwerte (0–100%) geben die Sicherheit der automatischen Erkennung an. 
  Werte ≥50% gelten als zuverlässig, Werte ≥80% als sehr sicher. 
  Niedrige Konfidenzen können durch Überlagerungen, Hintergrundgeräusche oder seltene Arten bedingt sein.<br><br>
  <strong>Diversitätsindizes:</strong> Shannon-Wiener H' (Shannon & Weaver, 1949), Simpson 1-D (Simpson, 1949), 
  Evenness E = H'/ln(S) (Pielou, 1966), Margalef-Index (Margalef, 1958), Berger-Parker-Index (Berger & Parker, 1970).
  Dominanzklassen nach Engelmann (1978): eudominant (≥32%), dominant (10–32%), subdominant (3,2–10%), rezedent (1–3,2%), subrezedent (<1%).<br><br>
  <strong>Einschränkungen:</strong> Automatische akustische Artbestimmung kann durch Umgebungslärm, Überlagerungen 
  mehrerer Arten, atypische Rufe und Distanz zum Mikrofon beeinflusst werden. Die Ergebnisse sollten durch 
  Experten-Verifikation ergänzt werden. Seltene oder nicht im Trainingsdate vertretene Arten können 
  unterrepräsentiert sein.
</div>

<div class="footer">
  <span>Erstellt mit BirdSound v${appVersion} · Entwickler: Dano Schönwald</span>
  <span>Berichtsdatum: ${new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}, ${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
</div>

</body>
</html>`;
};

/** XML-Escape für KML-Text-Attribute */
const escXml = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

/** Wandelt einen beliebigen Zeit-Wert in einen ISO-8601 String um (KML <when> Format) */
const toIsoWhen = (t) => {
  if (!t) return '';
  try {
    const d = (t instanceof Date) ? t : new Date(t);
    if (isNaN(d.getTime())) return '';
    return d.toISOString();
  } catch { return ''; }
};

/** Validiert ob d.location geographisch plausible Koordinaten enthält */
const hasValidLocation = (d) => {
  const loc = d && d.location;
  if (!loc) return false;
  const lat = Number(loc.lat), lng = Number(loc.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat === 0 && lng === 0) return false; // Null-Insel ausschließen
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};

/**
 * Erzeugt einen KML-Export für eine einzelne Session.
 * Gibt null zurück, wenn keine Erkennung mit gültigen GPS-Koordinaten existiert.
 */
export const generateSessionKML = (session) => {
  const dets = (session.detections || []).filter(hasValidLocation);
  if (!dets.length) return null;

  const startDate = new Date(session.startTime);
  const dateStr = isNaN(startDate.getTime()) ? '' : startDate.toLocaleDateString('de-DE');
  const docName = `BirdSound Session ${dateStr}`.trim();

  // Track-Linie: zeitlich sortierte Punkte verbinden (optisch der Beobachtungs-Pfad)
  const sorted = [...dets].sort((a, b) => new Date(a.time) - new Date(b.time));
  const trackCoords = sorted.map(d => `${Number(d.location.lng)},${Number(d.location.lat)},0`).join(' ');

  const placemarks = sorted.map(d => {
    const name = `${d.species || 'Unbekannt'}${d.scientific ? ` (${d.scientific})` : ''}`;
    const conf = Math.round((d.confidence || 0) * 100);
    const timeIso = toIsoWhen(d.time);
    const timeStr = timeIso ? new Date(timeIso).toLocaleTimeString('de-DE') : '?';
    const desc = `Konfidenz: ${conf}% | Modell: ${d.model || '?'} | Zeit: ${timeStr}`;
    const whenTag = timeIso ? `<TimeStamp><when>${timeIso}</when></TimeStamp>` : '';
    return `  <Placemark>
    <name>${escXml(name)}</name>
    <description><![CDATA[${desc}]]></description>
    ${whenTag}
    <styleUrl>#birdIcon</styleUrl>
    <Point><coordinates>${Number(d.location.lng)},${Number(d.location.lat)},0</coordinates></Point>
  </Placemark>`;
  }).join('\n');

  const trackPlacemark = sorted.length > 1 ? `
  <Placemark>
    <name>Beobachtungs-Pfad</name>
    <styleUrl>#trackLine</styleUrl>
    <LineString>
      <tessellate>1</tessellate>
      <coordinates>${trackCoords}</coordinates>
    </LineString>
  </Placemark>` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
  <name>${escXml(docName)}</name>
  <description><![CDATA[Ornithologische Bestandserfassung vom ${dateStr} — ${dets.length} Erkennungen mit GPS]]></description>
  <Style id="birdIcon"><IconStyle><color>ff00ff00</color><scale>1.0</scale><Icon><href>http://maps.google.com/mapfiles/kml/shapes/parks.png</href></Icon></IconStyle></Style>
  <Style id="trackLine"><LineStyle><color>ff4ecdc4</color><width>3</width></LineStyle></Style>
${placemarks}${trackPlacemark}
</Document>
</kml>`;
};

/**
 * Erzeugt einen wissenschaftlichen JSON-Export einer Session.
 */
export const generateSessionJSON = (session) => {
  const speciesEntries = Object.entries(session.speciesCount || {}).sort((a, b) => b[1] - a[1]);
  const totalDetections = session.detections?.length || 0;
  
  return JSON.stringify({
    meta: {
      reportType: 'ornithological_field_survey',
      generator: 'BirdSound v5.9.2',
      developer: 'Dano Schönwald',
      exportDate: new Date().toISOString(),
    },
    protocol: {
      sessionId: session.id,
      startTime: session.startTime,
      endTime: session.endTime,
      durationSeconds: Math.floor(session.duration || 0),
      location: session.location || null,
      model: session.modelUsed,
      chunksAnalyzed: session.totalAnalyzed || 0,
    },
    results: {
      totalDetections,
      speciesRichness: speciesEntries.length,
      speciesList: speciesEntries.map(([name, count]) => {
        const dets = (session.detections || []).filter(d => d.species === name);
        return {
          germanName: name,
          scientificName: dets[0]?.scientific || dets[0]?.scientificName || '',
          englishName: dets[0]?.englishName || dets[0]?.english || '',
          count,
          proportion: totalDetections ? count / totalDetections : 0,
          maxConfidence: dets.length ? Math.max(...dets.map(d => d.confidence || 0)) : 0,
          meanConfidence: dets.length ? dets.reduce((s, d) => s + (d.confidence || 0), 0) / dets.length : 0,
          models: [...new Set(dets.map(d => d.model || 'unknown'))],
          firstDetection: dets.length ? dets[dets.length - 1].time : null,
          lastDetection: dets.length ? dets[0].time : null,
        };
      }),
    },
    statistics: {
      shannonWiener: shannonIndex(session.speciesCount),
      simpson: simpsonIndex(session.speciesCount),
      evenness: evenness(session.speciesCount),
      margalef: margalefIndex(session.speciesCount),
      bergerParker: bergerParkerIndex(session.speciesCount),
      meanConfidence: meanConfidence(session.detections || []),
      medianConfidence: medianConfidence(session.detections || []),
      stdDevConfidence: stdDevConfidence(session.detections || []),
    },
    rawDetections: (session.detections || []).map(d => ({
      time: d.time,
      species: d.species,
      scientificName: d.scientific || d.scientificName || '',
      confidence: d.confidence,
      model: d.model,
      location: d.location,
    })),
  }, null, 2);
};

export default { generateFieldReport, generateSessionKML, generateSessionJSON };
