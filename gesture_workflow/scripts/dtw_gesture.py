#!/usr/bin/env python3
"""
DTW + k-NN Gesture Recognition

Uses Dynamic Time Warping for sequence comparison and k-NN for classification.
- Position invariant (relative to wrist)
- Scale invariant (normalized by hand size)
- Speed invariant (DTW handles timing differences)
"""

import os
import json
import numpy as np
import sys
from datetime import datetime
import pickle
from collections import Counter

# Configuration
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
WORKFLOW_DIR = os.path.dirname(SCRIPT_DIR)
GESTURES_DIR = os.path.join(WORKFLOW_DIR, 'gestures')
MODELS_DIR = os.path.join(WORKFLOW_DIR, 'models')
CLASSES_FILE = os.path.join(WORKFLOW_DIR, 'classes.json')
MODEL_PATH = os.path.join(MODELS_DIR, 'gesture_model.pkl')
MODEL_INFO_PATH = os.path.join(MODELS_DIR, 'model_info.json')

# Hand landmark indices
WRIST = 0
MIDDLE_MCP = 9  # Used for scale reference


def log_progress(message, data=None):
    """Print progress in JSON format"""
    output = {"message": message}
    if data:
        output.update(data)
    print(json.dumps(output), flush=True)


def load_classes():
    """Load class metadata"""
    if not os.path.exists(CLASSES_FILE):
        return []
    with open(CLASSES_FILE, 'r') as f:
        data = json.load(f)
    return data.get('classes', [])


def normalize_landmarks(landmarks):
    """
    Normalize landmarks to be position and scale invariant.
    
    1. Translate so wrist is at origin
    2. Scale by distance from wrist to middle MCP (palm size)
    
    Input: list of 21 landmarks [[x,y,z], ...]
    Output: numpy array (21, 3) normalized
    """
    if landmarks is None or len(landmarks) < 21:
        return None
    
    landmarks = np.array(landmarks[:21], dtype=np.float32)
    
    # Get wrist position
    wrist = landmarks[WRIST].copy()
    
    # Translate to wrist origin
    landmarks = landmarks - wrist
    
    # Get palm size (wrist to middle MCP)
    palm_size = np.linalg.norm(landmarks[MIDDLE_MCP])
    
    # Scale by palm size (avoid division by zero)
    if palm_size > 0.001:
        landmarks = landmarks / palm_size
    
    return landmarks


def extract_frame_features(frame):
    """
    Extract normalized features from a single frame.
    Returns flattened array of both hands' landmarks.
    """
    left_hand = frame.get('left_hand')
    right_hand = frame.get('right_hand')
    
    # Process left hand
    if left_hand and 'landmarks' in left_hand:
        left_norm = normalize_landmarks(left_hand['landmarks'])
    else:
        left_norm = np.zeros((21, 3), dtype=np.float32)
    
    # Process right hand
    if right_hand and 'landmarks' in right_hand:
        right_norm = normalize_landmarks(right_hand['landmarks'])
    else:
        right_norm = np.zeros((21, 3), dtype=np.float32)
    
    if left_norm is None:
        left_norm = np.zeros((21, 3), dtype=np.float32)
    if right_norm is None:
        right_norm = np.zeros((21, 3), dtype=np.float32)
    
    # Flatten both hands: (21*3 + 21*3) = 126 features
    return np.concatenate([left_norm.flatten(), right_norm.flatten()])


def sequence_to_features(frames):
    """
    Convert a sequence of frames to a feature matrix.
    Returns: numpy array (num_frames, 126)
    """
    features = []
    for frame in frames:
        f = extract_frame_features(frame)
        features.append(f)
    return np.array(features, dtype=np.float32)


def dtw_distance(seq1, seq2):
    """
    Compute DTW distance between two sequences.
    
    seq1: (n, features)
    seq2: (m, features)
    
    Returns: float distance
    """
    n, m = len(seq1), len(seq2)
    
    # Cost matrix
    dtw_matrix = np.full((n + 1, m + 1), np.inf)
    dtw_matrix[0, 0] = 0
    
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            # Euclidean distance between frames
            cost = np.linalg.norm(seq1[i-1] - seq2[j-1])
            
            # DTW recurrence
            dtw_matrix[i, j] = cost + min(
                dtw_matrix[i-1, j],      # insertion
                dtw_matrix[i, j-1],      # deletion
                dtw_matrix[i-1, j-1]     # match
            )
    
    # Normalize by path length
    return dtw_matrix[n, m] / (n + m)


def dtw_distance_fast(seq1, seq2, window=None):
    """
    Fast DTW with Sakoe-Chiba band constraint.
    Much faster for long sequences.
    """
    n, m = len(seq1), len(seq2)
    
    if window is None:
        window = max(n, m) // 4 + 1
    
    window = max(window, abs(n - m) + 1)
    
    dtw_matrix = np.full((n + 1, m + 1), np.inf)
    dtw_matrix[0, 0] = 0
    
    for i in range(1, n + 1):
        j_start = max(1, i - window)
        j_end = min(m, i + window) + 1
        
        for j in range(j_start, j_end):
            cost = np.linalg.norm(seq1[i-1] - seq2[j-1])
            dtw_matrix[i, j] = cost + min(
                dtw_matrix[i-1, j],
                dtw_matrix[i, j-1],
                dtw_matrix[i-1, j-1]
            )
    
    return dtw_matrix[n, m] / (n + m)


def downsample_sequence(seq, target_frames=20):
    """
    Downsample a sequence to a fixed number of frames.
    Uses linear interpolation to preserve gesture shape.
    """
    n = len(seq)
    if n <= target_frames:
        return seq
    
    indices = np.linspace(0, n - 1, target_frames).astype(int)
    return seq[indices]


def compute_centroid(sequences):
    """
    Compute a centroid (representative) sequence from multiple sequences.
    Uses averaging after resampling to same length.
    """
    if not sequences:
        return None
    
    # Find median length
    lengths = [len(s) for s in sequences]
    target_len = int(np.median(lengths))
    
    # Resample all to same length
    resampled = []
    for seq in sequences:
        if len(seq) == target_len:
            resampled.append(seq)
        else:
            indices = np.linspace(0, len(seq) - 1, target_len).astype(int)
            resampled.append(seq[indices])
    
    # Average
    return np.mean(resampled, axis=0).astype(np.float32)


class DTWGestureClassifier:
    """
    DTW + k-NN Gesture Classifier
    
    Stores template sequences for each class and uses DTW distance
    with k-NN voting for classification.
    
    Optimized version uses:
    - Downsampled sequences (20 frames) for faster comparison
    - Centroid templates (1 per class) for O(num_classes) instead of O(num_templates)
    """
    
    def __init__(self, k=3, use_centroids=True, downsample_frames=20):
        self.k = k
        self.use_centroids = use_centroids
        self.downsample_frames = downsample_frames
        self.templates = []  # List of (class_name, sequence)
        self.class_names = []
        self.centroids = {}  # class_name -> centroid sequence (computed during save/build)
    
    def add_template(self, class_name, sequence):
        """Add a template sequence for a class"""
        if class_name not in self.class_names:
            self.class_names.append(class_name)
        # Downsample for storage
        downsampled = downsample_sequence(sequence, self.downsample_frames)
        self.templates.append((class_name, downsampled))
    
    def build_centroids(self):
        """Build centroid templates for each class"""
        class_sequences = {}
        for class_name, seq in self.templates:
            if class_name not in class_sequences:
                class_sequences[class_name] = []
            class_sequences[class_name].append(seq)
        
        self.centroids = {}
        for class_name, sequences in class_sequences.items():
            centroid = compute_centroid(sequences)
            if centroid is not None:
                self.centroids[class_name] = centroid
    
    def classify(self, query_sequence, return_all_distances=False):
        """
        Classify a query sequence using DTW + k-NN.
        
        Returns: (predicted_class, confidence, all_probs)
        """
        if not self.templates and not self.centroids:
            return "Unknown", 0.0, {}
        
        # Downsample query
        query_downsampled = downsample_sequence(query_sequence, self.downsample_frames)
        
        # Use centroids if available (much faster - O(num_classes))
        if self.use_centroids and self.centroids:
            distances = []
            for class_name, centroid in self.centroids.items():
                dist = dtw_distance_fast(query_downsampled, centroid)
                distances.append((dist, class_name))
        else:
            # Fall back to all templates (slower - O(num_templates))
            distances = []
            for class_name, template in self.templates:
                dist = dtw_distance_fast(query_downsampled, template)
                distances.append((dist, class_name))
        
        # Sort by distance (closest first)
        distances.sort(key=lambda x: x[0])
        
        # k-NN voting
        k = min(self.k, len(distances))
        k_nearest = distances[:k]
        
        # Vote
        votes = Counter([cls for _, cls in k_nearest])
        predicted_class = votes.most_common(1)[0][0]
        
        # Compute confidence based on distances
        # Convert distances to similarity scores
        all_distances = {}
        for dist, cls in distances:
            if cls not in all_distances:
                all_distances[cls] = dist
        
        # Convert to probabilities using softmax on negative distances
        min_dist = min(all_distances.values())
        max_dist = max(all_distances.values())
        
        # Normalize distances to [0, 1] range and invert
        all_probs = {}
        if max_dist > min_dist:
            for cls, dist in all_distances.items():
                # Similarity = 1 - normalized_distance
                normalized = (dist - min_dist) / (max_dist - min_dist + 1e-8)
                all_probs[cls] = 1.0 - normalized
        else:
            # All same distance
            for cls in all_distances:
                all_probs[cls] = 1.0 / len(all_distances)
        
        # Normalize to sum to 1
        total = sum(all_probs.values())
        if total > 0:
            for cls in all_probs:
                all_probs[cls] /= total
        
        confidence = all_probs.get(predicted_class, 0.0)
        
        return predicted_class, confidence, all_probs
    
    def save(self, path):
        """Save model to file (includes centroids for fast inference)"""
        # Build centroids before saving
        self.build_centroids()
        
        data = {
            'k': self.k,
            'use_centroids': self.use_centroids,
            'downsample_frames': self.downsample_frames,
            'templates': self.templates,
            'class_names': self.class_names,
            'centroids': self.centroids
        }
        with open(path, 'wb') as f:
            pickle.dump(data, f)
    
    @classmethod
    def load(cls, path):
        """Load model from file"""
        with open(path, 'rb') as f:
            data = pickle.load(f)
        
        model = cls(
            k=data.get('k', 3),
            use_centroids=data.get('use_centroids', True),
            downsample_frames=data.get('downsample_frames', 20)
        )
        model.templates = data.get('templates', [])
        model.class_names = data.get('class_names', [])
        model.centroids = data.get('centroids', {})
        
        # Build centroids if not present (backward compatibility)
        if not model.centroids and model.templates:
            model.build_centroids()
        
        return model


def train_model():
    """Train DTW + k-NN model"""
    log_progress("Starting DTW + k-NN gesture model training...")
    
    classes = load_classes()
    if not classes:
        log_progress("No classes found!")
        return False
    
    classifier = DTWGestureClassifier(k=3)
    class_sample_counts = {}
    total_samples = 0
    
    # Load all sequences as templates
    for cls in classes:
        class_name = cls['name']
        class_dir = os.path.join(GESTURES_DIR, class_name)
        
        if not os.path.exists(class_dir):
            continue
        
        sequence_files = sorted([f for f in os.listdir(class_dir) if f.endswith('.json')])
        class_sample_counts[class_name] = len(sequence_files)
        
        for seq_file in sequence_files:
            seq_path = os.path.join(class_dir, seq_file)
            try:
                with open(seq_path, 'r') as f:
                    data = json.load(f)
                
                frames = data.get('frames', [])
                if not frames:
                    continue
                
                # Convert to feature sequence
                features = sequence_to_features(frames)
                classifier.add_template(class_name, features)
                total_samples += 1
                
            except Exception as e:
                log_progress(f"Error loading {seq_path}: {e}")
                continue
    
    if total_samples == 0:
        log_progress("No training data found!")
        return False
    
    log_progress(f"Loaded {total_samples} templates for {len(classifier.class_names)} classes")
    log_progress(f"Classes: {classifier.class_names}")
    log_progress(f"Samples per class: {class_sample_counts}")
    
    # Save model
    os.makedirs(MODELS_DIR, exist_ok=True)
    classifier.save(MODEL_PATH)
    log_progress(f"Model saved to {MODEL_PATH}")
    
    # Compute leave-one-out accuracy
    log_progress("Computing leave-one-out cross-validation accuracy...")
    correct = 0
    for i, (true_class, query_seq) in enumerate(classifier.templates):
        # Create temp classifier without this sample
        temp_classifier = DTWGestureClassifier(k=3)
        for j, (cls, seq) in enumerate(classifier.templates):
            if i != j:
                temp_classifier.add_template(cls, seq)
        
        if temp_classifier.templates:
            pred_class, _, _ = temp_classifier.classify(query_seq)
            if pred_class == true_class:
                correct += 1
    
    accuracy = correct / total_samples if total_samples > 0 else 0
    log_progress(f"Leave-one-out accuracy: {accuracy:.4f}")
    
    # Emit progress for UI
    log_progress("epoch_complete", {
        "epoch": 1,
        "total_epochs": 1,
        "loss": 1 - accuracy,
        "accuracy": accuracy,
        "val_loss": 1 - accuracy,
        "val_accuracy": accuracy,
        "progress": 100.0
    })
    
    # Save model info
    model_info = {
        "trained_at": datetime.now().isoformat(),
        "classes": classifier.class_names,
        "trained_classes": classifier.class_names,
        "class_sample_counts": class_sample_counts,
        "num_classes": len(classifier.class_names),
        "total_samples": total_samples,
        "final_accuracy": float(accuracy),
        "model_type": "DTW_KNN",
        "k": 3
    }
    
    with open(MODEL_INFO_PATH, 'w') as f:
        json.dump(model_info, f, indent=2)
    log_progress("Model info saved!")
    
    log_progress("Training complete!", {
        "final_val_accuracy": accuracy,
        "epochs_trained": 1
    })
    
    return True


def classify_sequence(frames):
    """Classify a single sequence"""
    if not os.path.exists(MODEL_PATH):
        return {"error": "Model not found"}
    
    try:
        classifier = DTWGestureClassifier.load(MODEL_PATH)
        features = sequence_to_features(frames)
        
        predicted_class, confidence, all_probs = classifier.classify(features)
        
        return {
            "predicted_class": predicted_class,
            "confidence": confidence,
            "all_probs": all_probs,
            "frame_count": len(frames)
        }
    except Exception as e:
        return {"error": str(e)}


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='DTW Gesture Recognition')
    parser.add_argument('--train', action='store_true', help='Train the model')
    parser.add_argument('--classify', type=str, help='Classify a sequence file')
    parser.add_argument('--info', action='store_true', help='Print model info')
    parser.add_argument('--stream', action='store_true', help='Stream mode')
    args = parser.parse_args()
    
    if args.train:
        success = train_model()
        sys.exit(0 if success else 1)
    
    elif args.info:
        if os.path.exists(MODEL_INFO_PATH):
            with open(MODEL_INFO_PATH, 'r') as f:
                print(f.read())
        else:
            print(json.dumps({"error": "No model info found"}))
    
    elif args.classify:
        with open(args.classify, 'r') as f:
            data = json.load(f)
        result = classify_sequence(data.get('frames', []))
        print(json.dumps(result))
    
    elif args.stream:
        # Load model once
        if not os.path.exists(MODEL_PATH):
            print(json.dumps({"error": "Model not found"}), flush=True)
            sys.exit(1)
        
        classifier = DTWGestureClassifier.load(MODEL_PATH)
        print(json.dumps({
            "status": "loaded",
            "classes": classifier.class_names,
            "model_type": "DTW_KNN"
        }), flush=True)
        
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            try:
                data = json.loads(line)
                frames = data.get('frames', [])
                features = sequence_to_features(frames)
                predicted_class, confidence, all_probs = classifier.classify(features)
                
                print(json.dumps({
                    "predicted_class": predicted_class,
                    "confidence": confidence,
                    "all_probs": all_probs,
                    "frame_count": len(frames)
                }), flush=True)
            except Exception as e:
                print(json.dumps({"error": str(e)}), flush=True)
    
    else:
        # Default: read from stdin
        try:
            data = json.load(sys.stdin)
            result = classify_sequence(data.get('frames', []))
            print(json.dumps(result))
        except Exception as e:
            print(json.dumps({"error": str(e)}))
