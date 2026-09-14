import React from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';

export function BirdDetailModal({ bird, onClose, onShare, styles }) {
  return (
    <Modal visible={!!bird} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.mo}>
        <View style={styles.moL}>
          <ScrollView>
            {bird && (
              <>
                <Text style={styles.dI}>{bird.icon || '🐦'}</Text>
                <Text style={styles.dN}>{bird.germanName || bird.species}</Text>
                <Text style={styles.dS}>{bird.scientificName || bird.scientific}</Text>
                {bird.description && <><Text style={styles.dSc}>📝 Beschreibung</Text><Text style={styles.dT}>{bird.description}</Text></>}
                <View style={styles.dG}>
                  <View style={styles.dCe}><Text style={styles.dCL}>Familie</Text><Text style={styles.dCV}>{bird.family || '-'}</Text></View>
                  <View style={styles.dCe}><Text style={styles.dCL}>Größe</Text><Text style={styles.dCV}>{bird.size || '-'}</Text></View>
                  <View style={styles.dCe}><Text style={styles.dCL}>Frequenz</Text><Text style={styles.dCV}>{bird.voice?.frequency || '-'}</Text></View>
                </View>
                {bird.habitat && <><Text style={styles.dSc}>🏠 Lebensraum</Text><Text style={styles.dT}>{bird.habitat?.join?.(', ') || bird.habitat}</Text></>}
                {bird.voice?.song && <><Text style={styles.dSc}>🎵 Gesang</Text><Text style={styles.dT}>{bird.voice.song}</Text></>}
                {bird.breedingSeason && <><Text style={styles.dSc}>🥚 Brutzeit</Text><Text style={styles.dT}>{bird.breedingSeason}</Text></>}
                {bird.nestType && <><Text style={styles.dSc}>🪺 Nest</Text><Text style={styles.dT}>{bird.nestType}</Text></>}
                {bird.eggs && <><Text style={styles.dSc}>🐣 Eier / Gelege</Text><Text style={styles.dT}>{bird.eggs}</Text></>}
                {bird.incubation && <><Text style={styles.dSc}>⏳ Brutdauer</Text><Text style={styles.dT}>{bird.incubation}</Text></>}
                {bird.funFacts && <><Text style={styles.dSc}>💡 Fakten</Text>{bird.funFacts.slice(0, 3).map((fact, index) => <Text key={index} style={styles.dF}>• {fact}</Text>)}</>}
                {bird.confidence && <TouchableOpacity style={styles.aB} onPress={() => onShare(bird)}><Text style={styles.aBT}>📤 Teilen</Text></TouchableOpacity>}
              </>
            )}
          </ScrollView>
          <TouchableOpacity style={styles.cl} onPress={onClose}><Text style={styles.clT}>Schließen</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}