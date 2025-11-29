"""Quick model test"""
import asyncio
import numpy as np
from app.services.model_registry import model_registry
from app.services.audio_processor import audio_processor

async def test():
    # Load models
    await model_registry.load_models()
    print(f"Loaded models: {list(model_registry.models.keys())}")
    
    # Generate test audio
    audio = np.random.rand(48000).astype(np.float32)
    
    # Predict
    try:
        results = await model_registry.predict_all(audio, lat=52.52, lon=13.405)
        print(f"Prediction results: {len(results)} models")
        
        if results and results[0].predictions:
            print(f"Top prediction: {results[0].predictions[0].species_common}")
            print(f"Confidence: {results[0].predictions[0].confidence:.2%}")
        else:
            print("No predictions")
            
        # Test consensus
        consensus = model_registry.compute_consensus(results)
        print(f"\nConsensus: {consensus['species_common']} ({consensus['confidence']:.2%})")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
