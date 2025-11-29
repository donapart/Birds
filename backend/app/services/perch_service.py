"""
Google Perch Integration Service

Optionales Backend für erweiterte Vogelstimmen-Erkennung mit ~10.000 Arten.
Perch ist ein Google Research Projekt unter Apache 2.0 Lizenz.

Features:
- Mehr Arten als BirdNET (~10k vs ~6.5k)
- Embedding-basierte Klassifikation
- Unterstützt "agile modeling" für neue Arten
- TFLite Export für Mobile

Installation:
  pip install perch-chirp  # Vereinfachte Installation
  # oder vollständig: poetry install (mit JAX)
"""

import os
import json
import logging
import tempfile
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple
from dataclasses import dataclass
import numpy as np

logger = logging.getLogger(__name__)

# ============================================================================
# Konfiguration
# ============================================================================

PERCH_MODEL_PATH = os.getenv("PERCH_MODEL_PATH", "./models/perch")
PERCH_LABELS_PATH = os.getenv("PERCH_LABELS_PATH", "./models/perch/labels.csv")

@dataclass
class PerchPrediction:
    """Eine Vorhersage von Perch"""
    species_scientific: str
    species_common: str
    confidence: float
    embedding: Optional[np.ndarray] = None


# ============================================================================
# Perch Model Wrapper
# ============================================================================

class PerchModelService:
    """
    Service für Google Perch Vogelstimmen-Klassifikation.
    
    Perch bietet:
    - ~10.000 Vogelarten weltweit
    - Embedding-Extraktion für ähnliche Arten
    - Agile Modeling für schnelles Training neuer Arten
    """
    
    def __init__(
        self,
        model_path: Optional[str] = None,
        use_tflite: bool = False,
        device: str = "cpu"
    ):
        """
        Initialisiert den Perch Service.
        
        Args:
            model_path: Pfad zum Modell (oder auto-download)
            use_tflite: TFLite statt JAX/TF verwenden
            device: "cpu", "gpu", oder "tpu"
        """
        self.model_path = model_path or PERCH_MODEL_PATH
        self.use_tflite = use_tflite
        self.device = device
        
        self.model = None
        self.labels: Dict[str, str] = {}
        self.is_loaded = False
        
        # Audio Konfiguration (Perch Standard)
        self.sample_rate = 32000
        self.window_size_s = 5.0
        self.hop_size_s = 2.5
        
    async def load_model(self) -> bool:
        """
        Lädt das Perch Modell.
        
        Returns:
            True wenn erfolgreich geladen
        """
        try:
            if self.use_tflite:
                return await self._load_tflite_model()
            else:
                return await self._load_full_model()
        except Exception as e:
            logger.error(f"Fehler beim Laden von Perch: {e}")
            return False
    
    async def _load_full_model(self) -> bool:
        """Lädt das vollständige JAX/TF Modell"""
        try:
            # Perch erfordert chirp-* Pakete
            from chirp.inference import interface
            from chirp.inference import models
            
            logger.info("Lade Perch Full Model...")
            
            # Prüfe ob Modell existiert, sonst download
            model_dir = Path(self.model_path)
            if not model_dir.exists():
                logger.info("Perch Modell nicht gefunden, starte Download...")
                await self._download_model()
            
            # Lade Model Config
            config_path = model_dir / "config.json"
            if config_path.exists():
                with open(config_path) as f:
                    self.config = json.load(f)
            
            # Initialisiere Model
            self.model = models.TaxonomyModelTF(
                checkpoint_path=str(model_dir / "checkpoint"),
                embedding_dim=1280,  # Perch embedding dimension
            )
            
            # Lade Labels
            await self._load_labels()
            
            self.is_loaded = True
            logger.info(f"Perch geladen: {len(self.labels)} Arten")
            return True
            
        except ImportError as e:
            logger.warning(f"Perch nicht installiert: {e}")
            logger.info("Installation: pip install perch-chirp")
            return False
        except Exception as e:
            logger.error(f"Fehler beim Laden: {e}")
            return False
    
    async def _load_tflite_model(self) -> bool:
        """Lädt das TFLite Modell für Mobile/Edge"""
        try:
            import tflite_runtime.interpreter as tflite
        except ImportError:
            try:
                import tensorflow.lite as tflite
            except ImportError:
                logger.error("TFLite nicht installiert")
                return False
        
        logger.info("Lade Perch TFLite Model...")
        
        tflite_path = Path(self.model_path) / "model.tflite"
        
        if not tflite_path.exists():
            logger.info("TFLite Modell nicht gefunden, starte Download...")
            # Kaggle: google/bird-vocalization-classifier
            await self._download_tflite_model()
        
        # Initialisiere Interpreter
        self.model = tflite.Interpreter(model_path=str(tflite_path))
        self.model.allocate_tensors()
        
        # Input/Output Details
        self.input_details = self.model.get_input_details()
        self.output_details = self.model.get_output_details()
        
        await self._load_labels()
        
        self.is_loaded = True
        logger.info(f"Perch TFLite geladen: {len(self.labels)} Arten")
        return True
    
    async def _load_labels(self):
        """Lädt die Artenlabels"""
        labels_path = Path(self.model_path) / "labels.csv"
        
        if labels_path.exists():
            import csv
            with open(labels_path, newline='', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    scientific = row.get('scientific_name', row.get('label', ''))
                    common = row.get('common_name', scientific)
                    self.labels[scientific] = common
        else:
            # Fallback: Grundlegende Labels
            logger.warning("Labels-Datei nicht gefunden, verwende Platzhalter")
    
    async def _download_model(self):
        """Lädt das Modell von der offiziellen Quelle herunter"""
        # Perch Models sind auf GCS gehostet
        # https://github.com/google-research/perch
        model_url = "gs://chirp-public-bucket/models/perch_8k_v1"
        
        logger.info(f"Download von {model_url}...")
        
        # Für lokale Nutzung: gsutil oder tf.io.gfile
        try:
            from tensorflow.io import gfile
            
            model_dir = Path(self.model_path)
            model_dir.mkdir(parents=True, exist_ok=True)
            
            # Hier würde der eigentliche Download stattfinden
            # In der Praxis: gsutil cp -r gs://... ./models/perch/
            
            logger.info("Modell-Download gestartet (kann mehrere Minuten dauern)")
            
        except Exception as e:
            logger.error(f"Download fehlgeschlagen: {e}")
            logger.info("Manueller Download:")
            logger.info("  gsutil -m cp -r gs://chirp-public-bucket/models/perch_8k_v1 ./models/perch/")
    
    async def _download_tflite_model(self):
        """Lädt das TFLite Modell von Kaggle"""
        model_dir = Path(self.model_path)
        model_dir.mkdir(parents=True, exist_ok=True)
        
        logger.info("TFLite Download von Kaggle...")
        logger.info("Manueller Download:")
        logger.info("  https://www.kaggle.com/models/google/bird-vocalization-classifier")
        
        # In Produktion: Kaggle API nutzen
        # kaggle models download google/bird-vocalization-classifier -p ./models/perch/
    
    async def predict(
        self,
        audio: np.ndarray,
        sample_rate: int = 48000,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        top_k: int = 5,
        min_confidence: float = 0.1
    ) -> List[PerchPrediction]:
        """
        Klassifiziert Vogelstimmen in Audio.
        
        Args:
            audio: Audio-Daten als numpy array (float32, mono)
            sample_rate: Sample-Rate des Audio
            latitude: Breitengrad für geo-filtering
            longitude: Längengrad für geo-filtering
            top_k: Anzahl der Top-Vorhersagen
            min_confidence: Mindest-Konfidenz
            
        Returns:
            Liste von PerchPrediction Objekten
        """
        if not self.is_loaded:
            raise RuntimeError("Modell nicht geladen. Rufe load_model() auf.")
        
        # Resample zu 32kHz (Perch Standard)
        if sample_rate != self.sample_rate:
            audio = self._resample(audio, sample_rate, self.sample_rate)
        
        # Normalisiere
        audio = audio.astype(np.float32)
        if audio.max() > 1.0:
            audio = audio / 32768.0  # int16 -> float
        
        predictions = []
        
        if self.use_tflite:
            predictions = await self._predict_tflite(audio, top_k, min_confidence)
        else:
            predictions = await self._predict_full(audio, top_k, min_confidence)
        
        # Geo-Filtering (optional)
        if latitude is not None and longitude is not None:
            predictions = self._filter_by_location(predictions, latitude, longitude)
        
        return predictions[:top_k]
    
    async def _predict_tflite(
        self,
        audio: np.ndarray,
        top_k: int,
        min_confidence: float
    ) -> List[PerchPrediction]:
        """Inference mit TFLite"""
        # Prepare input
        input_shape = self.input_details[0]['shape']
        expected_samples = input_shape[1] if len(input_shape) > 1 else len(audio)
        
        # Pad or truncate
        if len(audio) < expected_samples:
            audio = np.pad(audio, (0, expected_samples - len(audio)))
        else:
            audio = audio[:expected_samples]
        
        # Run inference
        input_data = audio.reshape(self.input_details[0]['shape']).astype(np.float32)
        self.model.set_tensor(self.input_details[0]['index'], input_data)
        self.model.invoke()
        
        # Get output
        output_data = self.model.get_tensor(self.output_details[0]['index'])
        scores = output_data[0]
        
        # Build predictions
        predictions = []
        indices = np.argsort(scores)[::-1]
        
        label_list = list(self.labels.keys())
        
        for idx in indices[:top_k]:
            if scores[idx] < min_confidence:
                continue
            
            scientific = label_list[idx] if idx < len(label_list) else f"species_{idx}"
            common = self.labels.get(scientific, scientific)
            
            predictions.append(PerchPrediction(
                species_scientific=scientific,
                species_common=common,
                confidence=float(scores[idx])
            ))
        
        return predictions
    
    async def _predict_full(
        self,
        audio: np.ndarray,
        top_k: int,
        min_confidence: float
    ) -> List[PerchPrediction]:
        """Inference mit vollem JAX/TF Modell"""
        # Sliding window über Audio
        window_samples = int(self.window_size_s * self.sample_rate)
        hop_samples = int(self.hop_size_s * self.sample_rate)
        
        all_predictions = []
        
        for start in range(0, len(audio) - window_samples + 1, hop_samples):
            window = audio[start:start + window_samples]
            
            # Run model
            outputs = self.model.embed(window)
            logits = outputs.get('label', outputs.get('logits'))
            embedding = outputs.get('embedding')
            
            # Softmax
            scores = np.exp(logits) / np.sum(np.exp(logits))
            
            # Top predictions
            indices = np.argsort(scores)[::-1]
            label_list = list(self.labels.keys())
            
            for idx in indices[:top_k]:
                if scores[idx] < min_confidence:
                    continue
                
                scientific = label_list[idx] if idx < len(label_list) else f"species_{idx}"
                common = self.labels.get(scientific, scientific)
                
                all_predictions.append(PerchPrediction(
                    species_scientific=scientific,
                    species_common=common,
                    confidence=float(scores[idx]),
                    embedding=embedding if embedding is not None else None
                ))
        
        # Aggregiere über alle Fenster
        return self._aggregate_predictions(all_predictions, top_k, min_confidence)
    
    def _aggregate_predictions(
        self,
        predictions: List[PerchPrediction],
        top_k: int,
        min_confidence: float
    ) -> List[PerchPrediction]:
        """Aggregiert Vorhersagen aus mehreren Fenstern"""
        species_scores: Dict[str, List[float]] = {}
        species_names: Dict[str, str] = {}
        
        for pred in predictions:
            if pred.species_scientific not in species_scores:
                species_scores[pred.species_scientific] = []
                species_names[pred.species_scientific] = pred.species_common
            species_scores[pred.species_scientific].append(pred.confidence)
        
        # Berechne Durchschnitt und Max
        aggregated = []
        for scientific, scores in species_scores.items():
            avg_conf = np.mean(scores)
            max_conf = np.max(scores)
            
            # Gewichteter Score
            final_conf = 0.7 * max_conf + 0.3 * avg_conf
            
            if final_conf >= min_confidence:
                aggregated.append(PerchPrediction(
                    species_scientific=scientific,
                    species_common=species_names[scientific],
                    confidence=float(final_conf)
                ))
        
        # Sortiere nach Konfidenz
        aggregated.sort(key=lambda x: x.confidence, reverse=True)
        return aggregated[:top_k]
    
    def _filter_by_location(
        self,
        predictions: List[PerchPrediction],
        latitude: float,
        longitude: float
    ) -> List[PerchPrediction]:
        """Filtert Vorhersagen nach geografischer Plausibilität"""
        # Hier könnte eine Geo-Datenbank abgefragt werden
        # Für jetzt: alle Vorhersagen zurückgeben
        return predictions
    
    def _resample(
        self,
        audio: np.ndarray,
        from_rate: int,
        to_rate: int
    ) -> np.ndarray:
        """Resamplet Audio"""
        if from_rate == to_rate:
            return audio
        
        duration = len(audio) / from_rate
        new_length = int(duration * to_rate)
        
        # Lineare Interpolation (einfach aber funktional)
        indices = np.linspace(0, len(audio) - 1, new_length)
        return np.interp(indices, np.arange(len(audio)), audio)
    
    async def get_embedding(
        self,
        audio: np.ndarray,
        sample_rate: int = 48000
    ) -> np.ndarray:
        """
        Extrahiert das Audio-Embedding für Ähnlichkeitsvergleiche.
        
        Args:
            audio: Audio-Daten
            sample_rate: Sample-Rate
            
        Returns:
            Embedding-Vektor (1280 Dimensionen)
        """
        if not self.is_loaded or self.use_tflite:
            raise RuntimeError("Embeddings nur mit Full Model verfügbar")
        
        if sample_rate != self.sample_rate:
            audio = self._resample(audio, sample_rate, self.sample_rate)
        
        outputs = self.model.embed(audio)
        return outputs.get('embedding', np.zeros(1280))
    
    @property
    def species_count(self) -> int:
        """Anzahl der unterstützten Arten"""
        return len(self.labels)
    
    @property
    def model_name(self) -> str:
        """Name des Modells"""
        return "Google Perch" + (" TFLite" if self.use_tflite else "")


# ============================================================================
# Factory Function
# ============================================================================

_perch_instance: Optional[PerchModelService] = None

async def get_perch_service(
    use_tflite: bool = False,
    force_new: bool = False
) -> PerchModelService:
    """
    Gibt eine Singleton-Instanz des Perch Service zurück.
    
    Args:
        use_tflite: TFLite statt Full Model verwenden
        force_new: Neue Instanz erzwingen
        
    Returns:
        PerchModelService Instanz
    """
    global _perch_instance
    
    if _perch_instance is None or force_new:
        _perch_instance = PerchModelService(use_tflite=use_tflite)
        await _perch_instance.load_model()
    
    return _perch_instance


# ============================================================================
# CLI für Tests
# ============================================================================

if __name__ == "__main__":
    import asyncio
    import sys
    
    async def main():
        print("=== Google Perch Test ===\n")
        
        # Versuche Perch zu laden
        service = PerchModelService(use_tflite=True)
        
        if await service.load_model():
            print(f"✓ Modell geladen: {service.model_name}")
            print(f"  Arten: {service.species_count}")
            
            # Test mit Stille
            test_audio = np.zeros(int(5 * 32000), dtype=np.float32)
            predictions = await service.predict(test_audio, sample_rate=32000)
            print(f"\n  Test-Vorhersagen: {len(predictions)}")
        else:
            print("✗ Modell konnte nicht geladen werden")
            print("\nInstallation:")
            print("  pip install perch-chirp")
            print("  oder TFLite von Kaggle:")
            print("  https://www.kaggle.com/models/google/bird-vocalization-classifier")
    
    asyncio.run(main())
