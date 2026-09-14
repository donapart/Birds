import React from 'react';
import { Alert, Modal, ScrollView, Share, Text, TouchableOpacity, View } from 'react-native';

import { BIRD_LIBRARY } from '../data/BirdLibrary';
import { formatDuration, shannonIndex, simpsonIndex } from '../utils/appUtils';

export function SessionReportModal({
  session,
  appVersion,
  onClose,
  onDelete,
  onExport,
  onPlayAudio,
  styles,
}) {
  if (!session) return null;

  const detections = session.detections || [];
  const speciesCount = session.speciesCount || {};
  const speciesEntries = Object.entries(speciesCount).sort((left, right) => right[1] - left[1]);
  const averageConfidence = detections.length
    ? Math.round(detections.reduce((sum, detection) => sum + (detection.confidence || 0), 0) / detections.length * 100)
    : 0;

  const shareReport = async () => {
    try {
      const topSpecies = speciesEntries.slice(0, 5).map(([species, count]) => {
        const scientific = BIRD_LIBRARY[species]?.scientificName || '';
        return `  • ${species}${scientific ? ` (${scientific})` : ''}: ${count}x`;
      }).join('\n');
      const message = `🐦 BirdSound Feldbericht\n📅 ${new Date(session.startTime).toLocaleDateString('de-DE')} | ⏱️ ${formatDuration(session.duration || 0)}\n\n📊 ${detections.length} Erkennungen, ${speciesEntries.length} Arten\n📈 Shannon H': ${shannonIndex(speciesCount).toFixed(2)} | Simpson: ${simpsonIndex(speciesCount).toFixed(2)}\n\n🦅 Top-Arten:\n${topSpecies}\n\n— BirdSound v${appVersion} | Dano Schönwald`;
      await Share.share({ message, title: 'BirdSound Feldbericht' });
    } catch (error) {
      Alert.alert('Fehler', `Teilen fehlgeschlagen: ${error.message}`);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.mo}>
        <View style={[styles.moL, { height: '90%', maxHeight: '95%', paddingBottom: 0, overflow: 'hidden' }]}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 4, paddingBottom: 16 }} showsVerticalScrollIndicator bounces nestedScrollEnabled>
            <Text style={styles.moT}>📊 Ornithologischer Feldbericht</Text>
            <View style={styles.rpH}><Text style={styles.rpD}>{new Date(session.startTime).toLocaleDateString('de-DE')}</Text><Text style={styles.rpT}>{formatDuration(session.duration || 0)}</Text></View>
            <View style={[styles.rpS, { flexWrap: 'wrap' }]}>
              <View style={[styles.rpSi, { minWidth: '22%' }]}><Text style={styles.rpSV}>{detections.length}</Text><Text style={styles.rpSL}>Erkennungen</Text></View>
              <View style={[styles.rpSi, { minWidth: '22%' }]}><Text style={styles.rpSV}>{speciesEntries.length}</Text><Text style={styles.rpSL}>Arten</Text></View>
              <View style={[styles.rpSi, { minWidth: '22%' }]}><Text style={styles.rpSV}>{session.totalAnalyzed || 0}</Text><Text style={styles.rpSL}>Chunks</Text></View>
              <View style={[styles.rpSi, { minWidth: '22%' }]}><Text style={styles.rpSV}>{averageConfidence}%</Text><Text style={styles.rpSL}>Ø Konfidenz</Text></View>
            </View>

            <Text style={styles.dSc}>🦅 Artenliste (Deutsch / Lateinisch)</Text>
            {speciesEntries.slice(0, 15).map(([species, count], index) => {
              const matchingDetections = detections.filter((detection) => detection.species === species);
              const maxConfidence = matchingDetections.length ? Math.max(...matchingDetections.map((detection) => detection.confidence || 0)) : 0;
              const scientific = matchingDetections[0]?.scientific || matchingDetections[0]?.scientificName || BIRD_LIBRARY[species]?.scientificName || '';
              const bestDetection = matchingDetections.slice().sort((left, right) => (right.confidence || 0) - (left.confidence || 0))[0];
              return (
                <View key={species} style={styles.spR}>
                  <Text style={styles.spN}>{index + 1}.</Text>
                  <Text style={styles.spI}>{BIRD_LIBRARY[species]?.icon || '🐦'}</Text>
                  <View style={{ flex: 1 }}><Text style={styles.spNm}>{species}</Text>{scientific ? <Text style={{ color: '#888', fontSize: 9, fontStyle: 'italic' }}>{scientific}</Text> : null}</View>
                  {bestDetection?.audioUri ? <TouchableOpacity onPress={() => onPlayAudio(bestDetection)} style={{ paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ fontSize: 14 }}>▶️</Text></TouchableOpacity> : null}
                  <View style={{ alignItems: 'flex-end' }}><Text style={styles.spC}>{count}x</Text><Text style={{ color: '#4ecdc4', fontSize: 8 }}>{Math.round(maxConfidence * 100)}%</Text></View>
                </View>
              );
            })}

            <Text style={styles.dSc}>📊 Statistische Auswertung</Text>
            <View style={styles.bio}>
              <View style={styles.bioI}><Text style={styles.bioL}>Shannon H'</Text><Text style={styles.bioV}>{shannonIndex(speciesCount).toFixed(2)}</Text></View>
              <View style={styles.bioI}><Text style={styles.bioL}>Simpson 1-D</Text><Text style={styles.bioV}>{simpsonIndex(speciesCount).toFixed(2)}</Text></View>
            </View>
            <View style={styles.bio}>
              <View style={styles.bioI}><Text style={styles.bioL}>Evenness</Text><Text style={styles.bioV}>{speciesEntries.length > 1 ? (shannonIndex(speciesCount) / Math.log(speciesEntries.length)).toFixed(2) : '1.00'}</Text></View>
              <View style={styles.bioI}><Text style={styles.bioL}>Arten (S)</Text><Text style={styles.bioV}>{speciesEntries.length}</Text></View>
            </View>

            <Text style={styles.dSc}>📤 Export & Teilen</Text>
            <View style={styles.sBtns}><TouchableOpacity style={[styles.sv, { backgroundColor: '#2d6a4f' }]} onPress={() => onExport(session, 'html')}><Text style={[styles.svT, { color: '#fff' }]}>📄 Feldbericht</Text></TouchableOpacity></View>
            <View style={[styles.sBtns, { marginTop: 4 }]}>
              {['kml', 'json', 'csv'].map((format) => <TouchableOpacity key={format} style={[styles.sv, { backgroundColor: '#1a472a' }]} onPress={() => onExport(session, format)}><Text style={[styles.svT, { color: '#fff' }]}>{format === 'kml' ? '🌍' : format === 'json' ? '📋' : '📑'} {format.toUpperCase()}</Text></TouchableOpacity>)}
            </View>
            <View style={[styles.sBtns, { marginTop: 4 }]}><TouchableOpacity style={[styles.sv, { backgroundColor: '#2196F3' }]} onPress={shareReport}><Text style={[styles.svT, { color: '#fff' }]}>📤 Teilen</Text></TouchableOpacity></View>
            <View style={[styles.sBtns, { marginTop: 8 }]}><TouchableOpacity style={styles.sDel} onPress={() => onDelete(session)}><Text style={styles.sDelT}>{detections.length === 0 ? '🗑️ Verwerfen' : '🗑️ Löschen'}</Text></TouchableOpacity></View>
          </ScrollView>
          <TouchableOpacity style={[styles.cl, { marginTop: 0, borderRadius: 0, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, padding: 14, backgroundColor: '#4ecdc4' }]} onPress={onClose}><Text style={[styles.clT, { color: '#000', fontSize: 14, fontWeight: '700' }]}>✕ Schließen</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}