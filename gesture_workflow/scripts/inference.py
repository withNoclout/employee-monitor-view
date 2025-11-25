#!/usr/bin/env python3
"""
GRU Gesture Inference Script

This script loads a trained GRU model and classifies gesture sequences.
Can be used for:
1. Single sequence classification
2. Real-time streaming classification via stdin
"""

import os
import json
import sys
import numpy as np

# Suppress TF warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
import tensorflow as tf

# Configuration
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
WORKFLOW_DIR = os.path.dirname(SCRIPT_DIR)
MODELS_DIR = os.path.join(WORKFLOW_DIR, 'models')
MODEL_PATH = os.path.join(MODELS_DIR, 'gesture_model.h5')
MODEL_INFO_PATH = os.path.join(MODELS_DIR, 'model_info.json')

# Must match training configuration
MAX_SEQ_LEN = 90
NUM_LANDMARKS = 21
COORDS_PER_LANDMARK = 3
FEATURES_PER_HAND = NUM_LANDMARKS * COORDS_PER_LANDMARK  # 63
TOTAL_FEATURES = FEATURES_PER_HAND * 2  # 126
MASK_VALUE = 0.0


class GestureClassifier:
    def __init__(self):
        self.model = None
        self.class_names = []
        self.loaded = False
        
    def load(self):
        """Load the trained model and class info"""
        if not os.path.exists(MODEL_PATH):
            print(json.dumps({"error": "Model not found", "path": MODEL_PATH}), flush=True)
            return False
            
        try:
            self.model = tf.keras.models.load_model(MODEL_PATH)
            
            # Load class names
            if os.path.exists(MODEL_INFO_PATH):
                with open(MODEL_INFO_PATH, 'r') as f:
                    info = json.load(f)
                    self.class_names = info.get('classes', [])
            
            self.loaded = True
            print(json.dumps({
                "status": "loaded",
                "classes": self.class_names,
                "max_seq_len": MAX_SEQ_LEN
            }), flush=True)
            return True
            
        except Exception as e:
            print(json.dumps({"error": str(e)}), flush=True)
            return False
    
    def flatten_hand(self, hand_data):
        """
        Flatten hand landmarks to 1D array.
        Input: {"landmarks": [[x,y,z], ...]} or None
        Output: list of 63 values
        """
        if hand_data is None:
            return [0.0] * FEATURES_PER_HAND
        
        landmarks = hand_data.get('landmarks', [])
        if not landmarks:
            return [0.0] * FEATURES_PER_HAND
        
        flattened = []
        for lm in landmarks[:NUM_LANDMARKS]:
            if isinstance(lm, (list, tuple)) and len(lm) >= 3:
                flattened.extend([float(lm[0]), float(lm[1]), float(lm[2])])
            else:
                flattened.extend([0.0, 0.0, 0.0])
        
        while len(flattened) < FEATURES_PER_HAND:
            flattened.append(0.0)
        
        return flattened[:FEATURES_PER_HAND]
    
    def preprocess_sequence(self, frames):
        """
        Convert sequence of frames to model input format.
        Input: [{"left_hand": {...}, "right_hand": {...}}, ...]
        Output: numpy array of shape (1, MAX_SEQ_LEN, TOTAL_FEATURES)
        """
        sequence = []
        
        for frame in frames:
            left = self.flatten_hand(frame.get('left_hand'))
            right = self.flatten_hand(frame.get('right_hand'))
            sequence.append(left + right)
        
        # Pad or truncate to MAX_SEQ_LEN
        if len(sequence) > MAX_SEQ_LEN:
            sequence = sequence[-MAX_SEQ_LEN:]  # Take last frames
        elif len(sequence) < MAX_SEQ_LEN:
            padding = [[MASK_VALUE] * TOTAL_FEATURES] * (MAX_SEQ_LEN - len(sequence))
            sequence = sequence + padding
        
        return np.array([sequence], dtype=np.float32)
    
    def classify(self, frames, threshold=0.5):
        """
        Classify a gesture sequence.
        Returns: {"class": str, "confidence": float, "all_probs": dict}
        """
        if not self.loaded:
            return {"error": "Model not loaded"}
        
        if len(frames) < 5:
            return {"error": "Sequence too short", "min_frames": 5}
        
        try:
            # Preprocess
            X = self.preprocess_sequence(frames)
            
            # Predict
            probs = self.model.predict(X, verbose=0)[0]
            
            # Get best prediction
            best_idx = int(np.argmax(probs))
            best_prob = float(probs[best_idx])
            best_class = self.class_names[best_idx] if best_idx < len(self.class_names) else f"class_{best_idx}"
            
            # Create probability dict for all classes
            all_probs = {}
            for i, p in enumerate(probs):
                name = self.class_names[i] if i < len(self.class_names) else f"class_{i}"
                all_probs[name] = float(p)
            
            result = {
                "class": best_class if best_prob >= threshold else "unknown",
                "confidence": best_prob,
                "all_probs": all_probs,
                "frame_count": len(frames)
            }
            
            return result
            
        except Exception as e:
            return {"error": str(e)}


def classify_file(filepath):
    """Classify a sequence from a JSON file"""
    classifier = GestureClassifier()
    if not classifier.load():
        return
    
    try:
        with open(filepath, 'r') as f:
            data = json.load(f)
        
        frames = data.get('frames', [])
        result = classifier.classify(frames)
        print(json.dumps(result), flush=True)
        
    except Exception as e:
        print(json.dumps({"error": str(e)}), flush=True)


def streaming_mode():
    """
    Run in streaming mode - read JSON lines from stdin.
    Each line should be a JSON object with "frames" array.
    Outputs classification result for each input.
    """
    classifier = GestureClassifier()
    if not classifier.load():
        return
    
    print(json.dumps({"status": "ready", "mode": "streaming"}), flush=True)
    
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        
        if line == "quit" or line == "exit":
            break
        
        try:
            data = json.loads(line)
            frames = data.get('frames', [])
            result = classifier.classify(frames, threshold=data.get('threshold', 0.5))
            print(json.dumps(result), flush=True)
        except json.JSONDecodeError:
            print(json.dumps({"error": "Invalid JSON"}), flush=True)
        except Exception as e:
            print(json.dumps({"error": str(e)}), flush=True)


def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python inference.py <sequence.json>  - Classify a single sequence file")
        print("  python inference.py --stream         - Streaming mode (read from stdin)")
        print("  python inference.py --info           - Show model info")
        return
    
    arg = sys.argv[1]
    
    if arg == "--stream":
        streaming_mode()
    elif arg == "--info":
        if os.path.exists(MODEL_INFO_PATH):
            with open(MODEL_INFO_PATH, 'r') as f:
                print(json.dumps(json.load(f), indent=2))
        else:
            print(json.dumps({"error": "No model info found"}))
    elif os.path.exists(arg):
        classify_file(arg)
    else:
        print(json.dumps({"error": f"File not found: {arg}"}))


if __name__ == '__main__':
    main()
