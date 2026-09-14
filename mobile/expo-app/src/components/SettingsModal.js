import React from 'react';
import { Modal, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';

const OPTIONS = {
  consensus: [['weighted_average', 'Gewichtet'], ['majority_vote', 'Mehrheit'], ['max_confidence', 'Max']],
  presets: [['none', 'Aus'], ['light', 'Leicht'], ['moderate', 'Mittel'], ['aggressive', 'Stark'], ['noisy_environment', 'Lärm'], ['wind_reduction', 'Wind']],
};

export function SettingsModal({ visible, settings, models, onChange, onSave, onClose, styles }) {
  const update = (values) => onChange({ ...settings, ...values });
  const updateEnhancement = (values) => update({ audioEnhancement: { ...(settings.audioEnhancement || {}), ...values } });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.mo}><View style={styles.moS}><ScrollView>
        <Text style={styles.moT}>⚙️ Einstellungen</Text>
        <Text style={styles.lbl}>Backend-URL</Text>
        <TextInput style={styles.inp} value={settings.backendUrl} onChangeText={(backendUrl) => update({ backendUrl })} autoCapitalize="none" autoCorrect={false} />
        <Text style={styles.lbl}>API-Key</Text>
        <TextInput style={styles.inp} value={settings.apiKey} onChangeText={(apiKey) => update({ apiKey })} secureTextEntry autoCapitalize="none" autoCorrect={false} />
        <Text style={styles.lbl}>🤖 Modell ({models.length})</Text>
        <View style={styles.mS}>
          <TouchableOpacity style={[styles.mO, !settings.selectedModel && styles.mOA]} onPress={() => update({ selectedModel: null })}><Text style={styles.mOT}>Alle</Text></TouchableOpacity>
          {models.map((model) => <TouchableOpacity key={model.name} style={[styles.mO, settings.selectedModel === model.name && styles.mOA]} onPress={() => update({ selectedModel: model.name })}><Text style={styles.mOT}>{model.name}</Text></TouchableOpacity>)}
        </View>
        <Text style={styles.lbl}>Konsensus</Text>
        <View style={styles.cfR}>{OPTIONS.consensus.map(([value, label]) => <TouchableOpacity key={value} style={[styles.cfB, settings.consensusMethod === value && styles.cfA]} onPress={() => update({ consensusMethod: value })}><Text style={styles.cfT}>{label}</Text></TouchableOpacity>)}</View>
        <Text style={styles.lbl}>Auto-Stop (Min)</Text>
        <View style={styles.cfR}>{[0, 5, 10, 15, 30].map((value) => <TouchableOpacity key={value} style={[styles.cfB, settings.autoStopMinutes === value && styles.cfA]} onPress={() => update({ autoStopMinutes: value })}><Text style={styles.cfT}>{value || 'Aus'}</Text></TouchableOpacity>)}</View>
        <Text style={styles.lbl}>Chunk (Sek)</Text>
        <View style={styles.cfR}>{[2, 3, 5, 10].map((value) => <TouchableOpacity key={value} style={[styles.cfB, settings.chunkDuration === value && styles.cfA]} onPress={() => update({ chunkDuration: value })}><Text style={styles.cfT}>{value}s</Text></TouchableOpacity>)}</View>
        <Text style={styles.lbl}>Min. Konfidenz: {Math.round(settings.minConfidence * 100)}%</Text>
        <View style={styles.cfR}>{[0.05, 0.1, 0.2, 0.3, 0.5].map((value) => <TouchableOpacity key={value} style={[styles.cfB, settings.minConfidence === value && styles.cfA]} onPress={() => update({ minConfidence: value })}><Text style={styles.cfT}>{Math.round(value * 100)}%</Text></TouchableOpacity>)}</View>
        <View style={styles.sw}><Text style={styles.swL}>📴 Offline</Text><Switch value={settings.offlineMode} onValueChange={(offlineMode) => update({ offlineMode })} /></View>
        <View style={styles.sw}><Text style={styles.swL}>📍 GPS</Text><Switch value={settings.enableGPS} onValueChange={(enableGPS) => update({ enableGPS })} /></View>
        <View style={styles.sw}><Text style={styles.swL}>🔒 Hintergrund-Aufnahme</Text><Switch value={settings.backgroundRecording} onValueChange={(backgroundRecording) => update({ backgroundRecording })} /></View>
        {settings.backgroundRecording && <Text style={styles.hint}>Aufnahme läuft weiter bei Tastensperre oder wenn App minimiert ist. Erhöht Akkuverbrauch.</Text>}

        <Text style={[styles.lbl, { marginTop: 20, fontSize: 16, color: '#4ecdc4' }]}>🎧 Audio-Verbesserung</Text>
        <Text style={styles.hint}>Filtert Hintergrundgeräusche und verbessert die Vogelstimmen-Erkennung</Text>
        <Text style={styles.lbl}>Preset</Text>
        <View style={styles.cfR}>{OPTIONS.presets.map(([value, label]) => <TouchableOpacity key={value} style={[styles.cfB, settings.audioEnhancement?.preset === value && styles.cfA]} onPress={() => updateEnhancement({ preset: value === 'none' ? null : value })}><Text style={styles.cfT}>{label}</Text></TouchableOpacity>)}</View>

        {!settings.audioEnhancement?.preset && <>
          <Text style={[styles.lbl, { marginTop: 10 }]}>Individuelle Filter</Text>
          <View style={styles.sw}><Text style={styles.swL}>🎚️ Bandpass (1-8kHz)</Text><Switch value={settings.audioEnhancement?.bandpassEnabled || false} onValueChange={(bandpassEnabled) => updateEnhancement({ bandpassEnabled })} /></View>
          <View style={styles.sw}><Text style={styles.swL}>🔇 Rauschunterdrückung</Text><Switch value={settings.audioEnhancement?.noiseReductionEnabled || false} onValueChange={(noiseReductionEnabled) => updateEnhancement({ noiseReductionEnabled })} /></View>
          <View style={styles.sw}><Text style={styles.swL}>🔊 Auto-Verstärkung</Text><Switch value={settings.audioEnhancement?.autoGainEnabled || false} onValueChange={(autoGainEnabled) => updateEnhancement({ autoGainEnabled })} /></View>
          <View style={styles.sw}><Text style={styles.swL}>🚪 Spectral Gate</Text><Switch value={settings.audioEnhancement?.spectralGateEnabled || false} onValueChange={(spectralGateEnabled) => updateEnhancement({ spectralGateEnabled })} /></View>
          <View style={styles.sw}><Text style={styles.swL}>📢 Hochpass (200Hz)</Text><Switch value={settings.audioEnhancement?.highpassEnabled || false} onValueChange={(highpassEnabled) => updateEnhancement({ highpassEnabled })} /></View>
        </>}

        <TouchableOpacity style={styles.sv} onPress={onSave}><Text style={styles.svT}>Speichern</Text></TouchableOpacity>
        <Text style={{ color: '#666', fontSize: 10, textAlign: 'center', marginTop: 16, marginBottom: 8 }}>Entwickelt von Dano Schönwald</Text>
      </ScrollView><TouchableOpacity style={styles.cl} onPress={onClose}><Text style={styles.clT}>Abbrechen</Text></TouchableOpacity></View></View>
    </Modal>
  );
}