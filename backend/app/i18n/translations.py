"""
Translation dictionaries for German and English.
"""

from typing import Dict, Any, Optional, Callable

SUPPORTED_LANGUAGES = ["de", "en"]
DEFAULT_LANGUAGE = "de"

# German translations
DE: Dict[str, Any] = {
    # General
    "app_name": "Vogelstimmen-Erkennung",
    "welcome": "Willkommen zur Vogelstimmen-Erkennung",
    "language": "Sprache",
    "german": "Deutsch",
    "english": "Englisch",

    # Navigation
    "nav": {
        "home": "Startseite",
        "map": "Karte",
        "timeline": "Zeitverlauf",
        "species": "Arten",
        "recordings": "Aufnahmen",
        "settings": "Einstellungen",
        "about": "Über",
        "live": "Live-Erkennung",
        "statistics": "Statistiken",
        "export": "Exportieren"
    },

    # Recording & Detection
    "recording": {
        "start": "Aufnahme starten",
        "stop": "Aufnahme beenden",
        "listening": "Höre zu...",
        "processing": "Verarbeite Audio...",
        "detected": "Erkannt",
        "no_detection": "Kein Vogel erkannt",
        "confidence": "Konfidenz",
        "duration": "Dauer",
        "location": "Standort",
        "time": "Zeit",
        "date": "Datum",
        "audio_file": "Audiodatei",
        "spectrogram": "Spektrogramm",
        "waveform": "Wellenform"
    },

    # Species
    "species": {
        "title": "Vogelarten",
        "scientific_name": "Wissenschaftlicher Name",
        "common_name": "Deutscher Name",
        "family": "Familie",
        "search": "Art suchen...",
        "all_species": "Alle Arten",
        "detected_species": "Erkannte Arten",
        "total_detections": "Erkennungen gesamt",
        "last_detected": "Zuletzt erkannt",
        "never_detected": "Noch nie erkannt",
        "details": "Details",
        "wikipedia": "Wikipedia-Artikel",
        "listen": "Gesang anhören"
    },

    # Map
    "map": {
        "title": "Erkennungskarte",
        "show_all": "Alle anzeigen",
        "show_today": "Heute",
        "show_week": "Diese Woche",
        "show_month": "Dieser Monat",
        "cluster": "Gruppieren",
        "heatmap": "Heatmap",
        "markers": "Markierungen",
        "no_location": "Kein Standort verfügbar"
    },

    # Timeline
    "timeline": {
        "title": "Zeitverlauf",
        "today": "Heute",
        "yesterday": "Gestern",
        "this_week": "Diese Woche",
        "this_month": "Dieser Monat",
        "custom_range": "Zeitraum wählen",
        "no_recordings": "Keine Aufnahmen in diesem Zeitraum",
        "detections_per_hour": "Erkennungen pro Stunde",
        "detections_per_day": "Erkennungen pro Tag",
        "most_active": "Aktivste Zeit"
    },

    # Models
    "models": {
        "title": "ML-Modelle",
        "birdnet": "BirdNET",
        "huggingface": "HuggingFace Audio",
        "custom": "Eigenes Modell",
        "confidence_threshold": "Konfidenzschwelle",
        "consensus": "Konsens-Methode",
        "weighted_average": "Gewichteter Durchschnitt",
        "majority_vote": "Mehrheitsentscheidung",
        "max_confidence": "Höchste Konfidenz",
        "model_comparison": "Modellvergleich",
        "accuracy": "Genauigkeit",
        "inference_time": "Inferenzzeit"
    },

    # Statistics
    "stats": {
        "title": "Statistiken",
        "total_recordings": "Aufnahmen gesamt",
        "total_detections": "Erkennungen gesamt",
        "unique_species": "Verschiedene Arten",
        "today_detections": "Erkennungen heute",
        "average_confidence": "Durchschnittliche Konfidenz",
        "most_common": "Häufigste Art",
        "rarest": "Seltenste Art",
        "peak_hour": "Aktivste Stunde",
        "recording_hours": "Aufnahmestunden"
    },

    # Export
    "export": {
        "title": "Daten exportieren",
        "format": "Format",
        "csv": "CSV (Tabelle)",
        "json": "JSON (Daten)",
        "geojson": "GeoJSON (Karte)",
        "date_range": "Zeitraum",
        "include_audio": "Audio einschließen",
        "include_spectrograms": "Spektrogramme einschließen",
        "download": "Herunterladen",
        "export_success": "Export erfolgreich",
        "export_error": "Exportfehler"
    },

    # Settings
    "settings": {
        "title": "Einstellungen",
        "audio": "Audio-Einstellungen",
        "sample_rate": "Abtastrate",
        "window_size": "Fenstergröße",
        "overlap": "Überlappung",
        "device": "Audiogerät",
        "models": "Modell-Einstellungen",
        "storage": "Speicher-Einstellungen",
        "save_audio": "Audio speichern",
        "storage_location": "Speicherort",
        "notifications": "Benachrichtigungen",
        "notify_detection": "Bei Erkennung benachrichtigen",
        "notify_rare": "Bei seltener Art benachrichtigen",
        "language": "Sprache",
        "theme": "Design",
        "dark_mode": "Dunkelmodus",
        "light_mode": "Hellmodus"
    },

    # Errors
    "errors": {
        "generic": "Ein Fehler ist aufgetreten",
        "not_found": "Nicht gefunden",
        "recording_not_found": "Aufnahme nicht gefunden",
        "species_not_found": "Art nicht gefunden",
        "invalid_audio": "Ungültiges Audioformat",
        "upload_failed": "Upload fehlgeschlagen",
        "processing_failed": "Verarbeitung fehlgeschlagen",
        "connection_lost": "Verbindung verloren",
        "reconnecting": "Verbindung wird wiederhergestellt...",
        "microphone_denied": "Mikrofonzugriff verweigert",
        "no_microphone": "Kein Mikrofon gefunden",
        "server_error": "Serverfehler",
        "timeout": "Zeitüberschreitung"
    },

    # Success messages
    "success": {
        "saved": "Gespeichert",
        "deleted": "Gelöscht",
        "exported": "Exportiert",
        "uploaded": "Hochgeladen",
        "settings_saved": "Einstellungen gespeichert",
        "recording_saved": "Aufnahme gespeichert"
    },

    # Buttons
    "buttons": {
        "save": "Speichern",
        "cancel": "Abbrechen",
        "delete": "Löschen",
        "edit": "Bearbeiten",
        "close": "Schließen",
        "confirm": "Bestätigen",
        "retry": "Erneut versuchen",
        "refresh": "Aktualisieren",
        "load_more": "Mehr laden",
        "show_details": "Details anzeigen",
        "hide_details": "Details ausblenden",
        "play": "Abspielen",
        "pause": "Pause",
        "stop": "Stopp"
    },

    # Time
    "time": {
        "now": "Jetzt",
        "seconds_ago": "vor {n} Sekunden",
        "minutes_ago": "vor {n} Minuten",
        "hours_ago": "vor {n} Stunden",
        "days_ago": "vor {n} Tagen",
        "just_now": "Gerade eben"
    },

    # API responses
    "api": {
        "prediction_success": "Vorhersage erfolgreich",
        "no_birds_detected": "Keine Vögel erkannt",
        "model_not_available": "Modell nicht verfügbar",
        "invalid_request": "Ungültige Anfrage",
        "rate_limited": "Zu viele Anfragen, bitte warten"
    }
}

# English translations
EN: Dict[str, Any] = {
    # General
    "app_name": "Bird Sound Recognition",
    "welcome": "Welcome to Bird Sound Recognition",
    "language": "Language",
    "german": "German",
    "english": "English",

    # Navigation
    "nav": {
        "home": "Home",
        "map": "Map",
        "timeline": "Timeline",
        "species": "Species",
        "recordings": "Recordings",
        "settings": "Settings",
        "about": "About",
        "live": "Live Detection",
        "statistics": "Statistics",
        "export": "Export"
    },

    # Recording & Detection
    "recording": {
        "start": "Start Recording",
        "stop": "Stop Recording",
        "listening": "Listening...",
        "processing": "Processing audio...",
        "detected": "Detected",
        "no_detection": "No bird detected",
        "confidence": "Confidence",
        "duration": "Duration",
        "location": "Location",
        "time": "Time",
        "date": "Date",
        "audio_file": "Audio file",
        "spectrogram": "Spectrogram",
        "waveform": "Waveform"
    },

    # Species
    "species": {
        "title": "Bird Species",
        "scientific_name": "Scientific Name",
        "common_name": "Common Name",
        "family": "Family",
        "search": "Search species...",
        "all_species": "All Species",
        "detected_species": "Detected Species",
        "total_detections": "Total Detections",
        "last_detected": "Last Detected",
        "never_detected": "Never Detected",
        "details": "Details",
        "wikipedia": "Wikipedia Article",
        "listen": "Listen to Song"
    },

    # Map
    "map": {
        "title": "Detection Map",
        "show_all": "Show All",
        "show_today": "Today",
        "show_week": "This Week",
        "show_month": "This Month",
        "cluster": "Cluster",
        "heatmap": "Heatmap",
        "markers": "Markers",
        "no_location": "No location available"
    },

    # Timeline
    "timeline": {
        "title": "Timeline",
        "today": "Today",
        "yesterday": "Yesterday",
        "this_week": "This Week",
        "this_month": "This Month",
        "custom_range": "Custom Range",
        "no_recordings": "No recordings in this period",
        "detections_per_hour": "Detections per Hour",
        "detections_per_day": "Detections per Day",
        "most_active": "Most Active Time"
    },

    # Models
    "models": {
        "title": "ML Models",
        "birdnet": "BirdNET",
        "huggingface": "HuggingFace Audio",
        "custom": "Custom Model",
        "confidence_threshold": "Confidence Threshold",
        "consensus": "Consensus Method",
        "weighted_average": "Weighted Average",
        "majority_vote": "Majority Vote",
        "max_confidence": "Max Confidence",
        "model_comparison": "Model Comparison",
        "accuracy": "Accuracy",
        "inference_time": "Inference Time"
    },

    # Statistics
    "stats": {
        "title": "Statistics",
        "total_recordings": "Total Recordings",
        "total_detections": "Total Detections",
        "unique_species": "Unique Species",
        "today_detections": "Today's Detections",
        "average_confidence": "Average Confidence",
        "most_common": "Most Common Species",
        "rarest": "Rarest Species",
        "peak_hour": "Peak Hour",
        "recording_hours": "Recording Hours"
    },

    # Export
    "export": {
        "title": "Export Data",
        "format": "Format",
        "csv": "CSV (Spreadsheet)",
        "json": "JSON (Data)",
        "geojson": "GeoJSON (Map)",
        "date_range": "Date Range",
        "include_audio": "Include Audio",
        "include_spectrograms": "Include Spectrograms",
        "download": "Download",
        "export_success": "Export successful",
        "export_error": "Export error"
    },

    # Settings
    "settings": {
        "title": "Settings",
        "audio": "Audio Settings",
        "sample_rate": "Sample Rate",
        "window_size": "Window Size",
        "overlap": "Overlap",
        "device": "Audio Device",
        "models": "Model Settings",
        "storage": "Storage Settings",
        "save_audio": "Save Audio",
        "storage_location": "Storage Location",
        "notifications": "Notifications",
        "notify_detection": "Notify on Detection",
        "notify_rare": "Notify on Rare Species",
        "language": "Language",
        "theme": "Theme",
        "dark_mode": "Dark Mode",
        "light_mode": "Light Mode"
    },

    # Errors
    "errors": {
        "generic": "An error occurred",
        "not_found": "Not found",
        "recording_not_found": "Recording not found",
        "species_not_found": "Species not found",
        "invalid_audio": "Invalid audio format",
        "upload_failed": "Upload failed",
        "processing_failed": "Processing failed",
        "connection_lost": "Connection lost",
        "reconnecting": "Reconnecting...",
        "microphone_denied": "Microphone access denied",
        "no_microphone": "No microphone found",
        "server_error": "Server error",
        "timeout": "Timeout"
    },

    # Success messages
    "success": {
        "saved": "Saved",
        "deleted": "Deleted",
        "exported": "Exported",
        "uploaded": "Uploaded",
        "settings_saved": "Settings saved",
        "recording_saved": "Recording saved"
    },

    # Buttons
    "buttons": {
        "save": "Save",
        "cancel": "Cancel",
        "delete": "Delete",
        "edit": "Edit",
        "close": "Close",
        "confirm": "Confirm",
        "retry": "Retry",
        "refresh": "Refresh",
        "load_more": "Load More",
        "show_details": "Show Details",
        "hide_details": "Hide Details",
        "play": "Play",
        "pause": "Pause",
        "stop": "Stop"
    },

    # Time
    "time": {
        "now": "Now",
        "seconds_ago": "{n} seconds ago",
        "minutes_ago": "{n} minutes ago",
        "hours_ago": "{n} hours ago",
        "days_ago": "{n} days ago",
        "just_now": "Just now"
    },

    # API responses
    "api": {
        "prediction_success": "Prediction successful",
        "no_birds_detected": "No birds detected",
        "model_not_available": "Model not available",
        "invalid_request": "Invalid request",
        "rate_limited": "Too many requests, please wait"
    }
}

# Translation dictionary mapping
TRANSLATIONS: Dict[str, Dict[str, Any]] = {
    "de": DE,
    "en": EN
}


def get_translation(key: str, lang: str = DEFAULT_LANGUAGE, **kwargs) -> str:
    """
    Get a translation for a key.
    Supports nested keys with dot notation (e.g., "nav.home").
    Supports variable substitution with {name} syntax.

    Args:
        key: Translation key (e.g., "nav.home" or "time.seconds_ago")
        lang: Language code ("de" or "en")
        **kwargs: Variables for substitution

    Returns:
        Translated string or key if not found
    """
    if lang not in TRANSLATIONS:
        lang = DEFAULT_LANGUAGE

    translations = TRANSLATIONS[lang]

    # Navigate nested keys
    keys = key.split(".")
    value = translations

    try:
        for k in keys:
            value = value[k]
    except (KeyError, TypeError):
        # Fallback to English if key not found in selected language
        if lang != "en":
            return get_translation(key, "en", **kwargs)
        return key

    # Apply variable substitution
    if isinstance(value, str) and kwargs:
        for var_name, var_value in kwargs.items():
            value = value.replace(f"{{{var_name}}}", str(var_value))

    return value


def get_translator(lang: str = DEFAULT_LANGUAGE) -> Callable[[str], str]:
    """
    Get a translator function for a specific language.

    Args:
        lang: Language code ("de" or "en")

    Returns:
        Translation function
    """
    def translate(key: str, **kwargs) -> str:
        return get_translation(key, lang, **kwargs)

    return translate


def get_all_translations(lang: str = DEFAULT_LANGUAGE) -> Dict[str, Any]:
    """
    Get all translations for a language.

    Args:
        lang: Language code ("de" or "en")

    Returns:
        Full translation dictionary
    """
    if lang not in TRANSLATIONS:
        lang = DEFAULT_LANGUAGE
    return TRANSLATIONS[lang]
