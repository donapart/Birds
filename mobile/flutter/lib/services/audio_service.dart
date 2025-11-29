/// Flutter Audio Service for Bird Sound Recognition
///
/// This service handles:
/// - Microphone audio capture
/// - Audio chunking (3s windows with 1s overlap)
/// - GPS location retrieval
/// - API communication
///
/// Dependencies to add to pubspec.yaml:
/// ```yaml
/// dependencies:
///   flutter_sound: ^9.2.0
///   geolocator: ^10.0.0
///   http: ^1.1.0
///   permission_handler: ^11.0.0
/// ```

import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter_sound/flutter_sound.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;

/// Prediction result from a single model
class ModelPrediction {
  final String modelName;
  final String species;
  final double confidence;

  ModelPrediction({
    required this.modelName,
    required this.species,
    required this.confidence,
  });

  factory ModelPrediction.fromJson(Map<String, dynamic> json) {
    final predictions = json['predictions'] as List;
    final top = predictions.isNotEmpty ? predictions[0] : null;
    return ModelPrediction(
      modelName: json['model_name'],
      species: top?['species_common'] ?? 'Unknown',
      confidence: top?['confidence']?.toDouble() ?? 0.0,
    );
  }
}

/// Consensus prediction combining all models
class ConsensusPrediction {
  final String species;
  final double confidence;
  final int agreementCount;
  final int totalModels;

  ConsensusPrediction({
    required this.species,
    required this.confidence,
    required this.agreementCount,
    required this.totalModels,
  });

  factory ConsensusPrediction.fromJson(Map<String, dynamic> json) {
    return ConsensusPrediction(
      species: json['species_common'],
      confidence: json['confidence'].toDouble(),
      agreementCount: json['agreement_count'],
      totalModels: json['total_models'],
    );
  }
}

/// Full prediction response
class PredictionResponse {
  final String recordingId;
  final List<ModelPrediction> modelPredictions;
  final ConsensusPrediction consensus;

  PredictionResponse({
    required this.recordingId,
    required this.modelPredictions,
    required this.consensus,
  });

  factory PredictionResponse.fromJson(Map<String, dynamic> json) {
    return PredictionResponse(
      recordingId: json['recording_id'],
      modelPredictions: (json['model_predictions'] as List)
          .map((p) => ModelPrediction.fromJson(p))
          .toList(),
      consensus: ConsensusPrediction.fromJson(json['consensus']),
    );
  }
}

/// Audio service for bird sound recognition
class BirdSoundService {
  // Configuration
  static const int sampleRate = 16000; // 16 kHz for mobile
  static const int windowDurationMs = 3000; // 3 second windows
  static const int hopDurationMs = 1000; // 1 second hop (2s overlap)

  final String apiBaseUrl;
  final String deviceId;

  FlutterSoundRecorder? _recorder;
  StreamController<PredictionResponse>? _predictionStream;
  Timer? _captureTimer;
  List<int> _audioBuffer = [];
  bool _isRecording = false;

  BirdSoundService({
    required this.apiBaseUrl,
    required this.deviceId,
  });

  /// Stream of predictions for UI updates
  Stream<PredictionResponse> get predictions =>
      _predictionStream?.stream ?? const Stream.empty();

  /// Initialize the audio service
  Future<void> initialize() async {
    _recorder = FlutterSoundRecorder();
    await _recorder!.openRecorder();
    _predictionStream = StreamController<PredictionResponse>.broadcast();
  }

  /// Start continuous bird sound detection
  Future<void> startListening() async {
    if (_isRecording) return;

    // Check permissions
    final hasPermission = await _checkPermissions();
    if (!hasPermission) {
      throw Exception('Microphone permission not granted');
    }

    _isRecording = true;
    _audioBuffer = [];

    // Start recording to stream
    await _recorder!.startRecorder(
      toStream: _onAudioData,
      codec: Codec.pcm16,
      sampleRate: sampleRate,
      numChannels: 1,
    );

    // Schedule periodic analysis
    _captureTimer = Timer.periodic(
      Duration(milliseconds: hopDurationMs),
      (_) => _processAudioWindow(),
    );
  }

  /// Stop listening
  Future<void> stopListening() async {
    _isRecording = false;
    _captureTimer?.cancel();
    await _recorder?.stopRecorder();
  }

  /// Handle incoming audio data from microphone
  void _onAudioData(Food food) {
    if (food is FoodData && food.data != null) {
      _audioBuffer.addAll(food.data!);

      // Keep only the last 5 seconds of audio
      final maxSamples = sampleRate * 5;
      if (_audioBuffer.length > maxSamples) {
        _audioBuffer = _audioBuffer.sublist(_audioBuffer.length - maxSamples);
      }
    }
  }

  /// Process a 3-second window of audio
  Future<void> _processAudioWindow() async {
    if (!_isRecording) return;

    // Need at least 3 seconds of audio
    final windowSamples = sampleRate * windowDurationMs ~/ 1000;
    if (_audioBuffer.length < windowSamples) return;

    // Get the last 3 seconds
    final audioChunk = _audioBuffer.sublist(_audioBuffer.length - windowSamples);

    try {
      // Get current location
      final position = await _getCurrentLocation();

      // Send to API
      final response = await _sendPredictionRequest(
        audioData: Uint8List.fromList(audioChunk),
        latitude: position?.latitude,
        longitude: position?.longitude,
      );

      // Emit to stream
      if (response != null) {
        _predictionStream?.add(response);
      }
    } catch (e) {
      print('Error processing audio: $e');
    }
  }

  /// Get current GPS location
  Future<Position?> _getCurrentLocation() async {
    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) return null;

      final permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        return null;
      }

      return await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: Duration(seconds: 5),
      );
    } catch (e) {
      print('Error getting location: $e');
      return null;
    }
  }

  /// Send audio to backend API
  Future<PredictionResponse?> _sendPredictionRequest({
    required Uint8List audioData,
    double? latitude,
    double? longitude,
  }) async {
    final timestamp = DateTime.now().toUtc().toIso8601String();
    final audioBase64 = base64Encode(audioData);

    final requestBody = {
      'device_id': deviceId,
      'timestamp_utc': timestamp,
      'latitude': latitude,
      'longitude': longitude,
      'sample_rate': sampleRate,
      'audio_format': 'pcm16_le',
      'audio_base64': audioBase64,
    };

    try {
      final response = await http.post(
        Uri.parse('$apiBaseUrl/api/v1/predict'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(requestBody),
      );

      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        return PredictionResponse.fromJson(json);
      } else {
        print('API error: ${response.statusCode} ${response.body}');
        return null;
      }
    } catch (e) {
      print('Network error: $e');
      return null;
    }
  }

  /// Check and request permissions
  Future<bool> _checkPermissions() async {
    // Note: Use permission_handler package in real implementation
    // This is simplified pseudocode
    return true;
  }

  /// Clean up resources
  Future<void> dispose() async {
    await stopListening();
    await _recorder?.closeRecorder();
    await _predictionStream?.close();
  }
}


// ============================================================================
// Example Usage in a Flutter Widget
// ============================================================================

/*
import 'package:flutter/material.dart';

class BirdDetectionScreen extends StatefulWidget {
  @override
  _BirdDetectionScreenState createState() => _BirdDetectionScreenState();
}

class _BirdDetectionScreenState extends State<BirdDetectionScreen> {
  late BirdSoundService _service;
  PredictionResponse? _latestPrediction;
  bool _isListening = false;

  @override
  void initState() {
    super.initState();
    _initService();
  }

  Future<void> _initService() async {
    _service = BirdSoundService(
      apiBaseUrl: 'http://your-server:8000',
      deviceId: 'flutter-${DateTime.now().millisecondsSinceEpoch}',
    );
    await _service.initialize();

    // Listen to predictions
    _service.predictions.listen((prediction) {
      setState(() {
        _latestPrediction = prediction;
      });
    });
  }

  void _toggleListening() async {
    if (_isListening) {
      await _service.stopListening();
    } else {
      await _service.startListening();
    }
    setState(() {
      _isListening = !_isListening;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Bird Sound Detector')),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Status indicator
            Icon(
              _isListening ? Icons.mic : Icons.mic_off,
              size: 64,
              color: _isListening ? Colors.green : Colors.grey,
            ),
            SizedBox(height: 20),

            // Latest prediction
            if (_latestPrediction != null) ...[
              Text(
                _latestPrediction!.consensus.species,
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
              ),
              Text(
                '${(_latestPrediction!.consensus.confidence * 100).toStringAsFixed(1)}%',
                style: TextStyle(fontSize: 18, color: Colors.grey),
              ),
              SizedBox(height: 10),
              Text(
                '${_latestPrediction!.consensus.agreementCount}/${_latestPrediction!.consensus.totalModels} models agree',
                style: TextStyle(fontSize: 14),
              ),
            ],

            SizedBox(height: 40),

            // Start/Stop button
            ElevatedButton.icon(
              onPressed: _toggleListening,
              icon: Icon(_isListening ? Icons.stop : Icons.play_arrow),
              label: Text(_isListening ? 'Stop' : 'Start Listening'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _service.dispose();
    super.dispose();
  }
}
*/
