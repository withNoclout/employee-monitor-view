#!/usr/bin/env python3
"""
GRU-based Gesture Recognition Training Script

This script trains a GRU model for gesture sequence classification.
- Loads sequences from gesture_workflow/gestures/{class_name}/sequence_XXX.json
- Uses relative coordinates (wrist as origin)
- Handles variable-length sequences with padding and masking
- Outputs model to gesture_workflow/models/gesture_model.h5
"""

import os
import json
import numpy as np
import sys
from datetime import datetime

# TensorFlow imports
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'  # Suppress TF warnings
import tensorflow as tf
from tensorflow.keras import layers, models, callbacks
from sklearn.model_selection import train_test_split

# Configuration
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
WORKFLOW_DIR = os.path.dirname(SCRIPT_DIR)
GESTURES_DIR = os.path.join(WORKFLOW_DIR, 'gestures')
MODELS_DIR = os.path.join(WORKFLOW_DIR, 'models')
CLASSES_FILE = os.path.join(WORKFLOW_DIR, 'classes.json')

# Model hyperparameters
MAX_SEQ_LEN = 90        # Max frames (3 seconds @ 30fps)
NUM_LANDMARKS = 21       # MediaPipe hand landmarks
COORDS_PER_LANDMARK = 3  # x, y, z
FEATURES_PER_HAND = NUM_LANDMARKS * COORDS_PER_LANDMARK  # 63
TOTAL_FEATURES = FEATURES_PER_HAND * 2  # 126 (both hands)

# Training hyperparameters
BATCH_SIZE = 16
EPOCHS = 100
LEARNING_RATE = 0.001
PATIENCE = 15  # Early stopping patience

# Mask value for padded frames
MASK_VALUE = 0.0


def log_progress(message, data=None):
    """Print progress in JSON format for frontend parsing"""
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


def flatten_hand_landmarks(hand_data):
    """
    Flatten hand landmarks to a 1D array.
    Input: {"landmarks": [[x,y,z], [x,y,z], ...]} or None
    Output: [x0,y0,z0, x1,y1,z1, ...] (63 values) or zeros if None
    """
    if hand_data is None:
        return [0.0] * FEATURES_PER_HAND
    
    landmarks = hand_data.get('landmarks', [])
    if not landmarks:
        return [0.0] * FEATURES_PER_HAND
    
    # Flatten the landmarks
    flattened = []
    for lm in landmarks[:NUM_LANDMARKS]:  # Take max 21 landmarks
        if isinstance(lm, (list, tuple)) and len(lm) >= 3:
            flattened.extend([float(lm[0]), float(lm[1]), float(lm[2])])
        else:
            flattened.extend([0.0, 0.0, 0.0])
    
    # Pad if we have fewer than 21 landmarks
    while len(flattened) < FEATURES_PER_HAND:
        flattened.append(0.0)
    
    return flattened[:FEATURES_PER_HAND]


def load_sequences():
    """
    Load all gesture sequences from disk.
    Returns: X (sequences), y (labels), class_names, class_sample_counts
    """
    classes = load_classes()
    if not classes:
        log_progress("ERROR: No gesture classes found", {"error": "no_classes"})
        return None, None, None, None
    
    class_names = [c['name'] for c in classes]
    class_to_idx = {name: idx for idx, name in enumerate(class_names)}
    
    all_sequences = []
    all_labels = []
    class_sample_counts = {}  # Track sequence count per class
    
    log_progress(f"Loading sequences for {len(class_names)} classes...")
    
    for class_info in classes:
        class_name = class_info['name']
        class_dir = os.path.join(GESTURES_DIR, class_name)
        class_sample_counts[class_name] = 0
        
        if not os.path.exists(class_dir):
            log_progress(f"Warning: No data directory for class '{class_name}'")
            continue
        
        sequence_files = [f for f in os.listdir(class_dir) if f.endswith('.json')]
        
        for seq_file in sequence_files:
            try:
                with open(os.path.join(class_dir, seq_file), 'r') as f:
                    seq_data = json.load(f)
                
                frames = seq_data.get('frames', [])
                if not frames:
                    continue
                
                # Convert frames to feature vectors
                sequence = []
                for frame in frames:
                    left_hand = flatten_hand_landmarks(frame.get('left_hand'))
                    right_hand = flatten_hand_landmarks(frame.get('right_hand'))
                    # Concatenate both hands: 126 features total
                    frame_features = left_hand + right_hand
                    sequence.append(frame_features)
                
                if sequence:
                    all_sequences.append(sequence)
                    all_labels.append(class_to_idx[class_name])
                    class_sample_counts[class_name] += 1
                    
            except Exception as e:
                log_progress(f"Error loading {seq_file}: {str(e)}")
                continue
    
    log_progress(f"Loaded {len(all_sequences)} sequences total")
    
    return all_sequences, all_labels, class_names, class_sample_counts


def pad_sequences(sequences, max_len=MAX_SEQ_LEN):
    """
    Pad sequences to uniform length.
    Shorter sequences are post-padded with zeros.
    Longer sequences are truncated.
    """
    padded = []
    
    for seq in sequences:
        if len(seq) > max_len:
            # Truncate (take last max_len frames - more recent action)
            padded.append(seq[-max_len:])
        elif len(seq) < max_len:
            # Pad with zeros
            padding = [[MASK_VALUE] * TOTAL_FEATURES] * (max_len - len(seq))
            padded.append(seq + padding)
        else:
            padded.append(seq)
    
    return np.array(padded, dtype=np.float32)


def create_gru_model(num_classes, seq_length=MAX_SEQ_LEN, features=TOTAL_FEATURES):
    """
    Create a GRU-based sequence classification model.
    
    Why GRU over LSTM?
    - Fewer parameters = faster training
    - Better for real-time inference
    - Similar accuracy for short sequences (<2 seconds)
    - Simpler gating mechanism
    """
    model = models.Sequential([
        # Masking layer to ignore padded frames
        layers.Masking(mask_value=MASK_VALUE, input_shape=(seq_length, features)),
        
        # First GRU layer - captures temporal patterns
        layers.GRU(128, return_sequences=True, dropout=0.2, recurrent_dropout=0.2),
        layers.BatchNormalization(),
        
        # Second GRU layer - higher-level features
        layers.GRU(64, dropout=0.2, recurrent_dropout=0.2),
        layers.BatchNormalization(),
        
        # Dense layers for classification
        layers.Dense(32, activation='relu'),
        layers.Dropout(0.3),
        layers.Dense(num_classes, activation='softmax')
    ])
    
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=LEARNING_RATE),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    
    return model


def create_lstm_model(num_classes, seq_length=MAX_SEQ_LEN, features=TOTAL_FEATURES):
    """
    Alternative LSTM model for comparison.
    Better for very long sequences but slower to train.
    """
    model = models.Sequential([
        layers.Masking(mask_value=MASK_VALUE, input_shape=(seq_length, features)),
        
        layers.LSTM(128, return_sequences=True, dropout=0.2, recurrent_dropout=0.2),
        layers.BatchNormalization(),
        
        layers.LSTM(64, dropout=0.2, recurrent_dropout=0.2),
        layers.BatchNormalization(),
        
        layers.Dense(32, activation='relu'),
        layers.Dropout(0.3),
        layers.Dense(num_classes, activation='softmax')
    ])
    
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=LEARNING_RATE),
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    
    return model


class TrainingProgressCallback(callbacks.Callback):
    """Custom callback to report training progress"""
    
    def on_epoch_end(self, epoch, logs=None):
        logs = logs or {}
        log_progress("epoch_complete", {
            "epoch": epoch + 1,
            "total_epochs": EPOCHS,
            "loss": float(logs.get('loss', 0)),
            "accuracy": float(logs.get('accuracy', 0)),
            "val_loss": float(logs.get('val_loss', 0)),
            "val_accuracy": float(logs.get('val_accuracy', 0)),
            "progress": (epoch + 1) / EPOCHS * 100
        })


def train():
    """Main training function"""
    log_progress("Starting gesture model training...")
    
    # Ensure models directory exists
    os.makedirs(MODELS_DIR, exist_ok=True)
    
    # Load data
    sequences, labels, class_names, class_sample_counts = load_sequences()
    
    if sequences is None or len(sequences) == 0:
        log_progress("ERROR: No training data available", {"error": "no_data"})
        return False
    
    if len(class_names) < 2:
        log_progress("ERROR: Need at least 2 classes for training", {"error": "insufficient_classes"})
        return False
    
    # Check minimum samples per class
    unique, counts = np.unique(labels, return_counts=True)
    min_samples = counts.min()
    
    if min_samples < 3:
        log_progress(f"WARNING: Some classes have < 3 samples. Recommend at least 10 per class.",
                    {"min_samples": int(min_samples)})
    
    log_progress(f"Classes: {class_names}")
    log_progress(f"Samples per class: {dict(zip(class_names, counts.tolist()))}")
    
    # Pad sequences
    log_progress("Padding sequences...")
    X = pad_sequences(sequences)
    y = np.array(labels)
    
    log_progress(f"Data shape: {X.shape}")  # (num_samples, MAX_SEQ_LEN, TOTAL_FEATURES)
    
    # Train/validation split
    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    log_progress(f"Training samples: {len(X_train)}, Validation samples: {len(X_val)}")
    
    # Create model
    log_progress("Creating GRU model...")
    model = create_gru_model(num_classes=len(class_names))
    model.summary(print_fn=lambda x: log_progress(x))
    
    # Callbacks
    early_stop = callbacks.EarlyStopping(
        monitor='val_loss',
        patience=PATIENCE,
        restore_best_weights=True,
        verbose=1
    )
    
    reduce_lr = callbacks.ReduceLROnPlateau(
        monitor='val_loss',
        factor=0.5,
        patience=5,
        min_lr=1e-6,
        verbose=1
    )
    
    # Train
    log_progress("Starting training...")
    history = model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=EPOCHS,
        batch_size=BATCH_SIZE,
        callbacks=[TrainingProgressCallback(), early_stop, reduce_lr],
        verbose=0  # We use our custom callback for progress
    )
    
    # Evaluate
    val_loss, val_acc = model.evaluate(X_val, y_val, verbose=0)
    log_progress("Training complete!", {
        "final_val_loss": float(val_loss),
        "final_val_accuracy": float(val_acc),
        "epochs_trained": len(history.history['loss'])
    })
    
    # Save model in H5 format
    model_path = os.path.join(MODELS_DIR, 'gesture_model.h5')
    model.save(model_path)
    log_progress(f"Model saved to {model_path}")
    
    # Also save in Keras native format
    keras_model_path = os.path.join(MODELS_DIR, 'gesture_model.keras')
    model.save(keras_model_path)
    log_progress(f"Keras format saved to {keras_model_path}")
    
    # Save model info
    model_info = {
        "trained_at": datetime.now().isoformat(),
        "classes": class_names,
        "trained_classes": class_names,  # For tracking which classes were trained
        "class_sample_counts": class_sample_counts,  # Sequence count per class at training time
        "num_classes": len(class_names),
        "max_seq_len": MAX_SEQ_LEN,
        "features_per_frame": TOTAL_FEATURES,
        "total_samples": len(sequences),
        "final_accuracy": float(val_acc),
        "final_loss": float(val_loss),
        "epochs_trained": len(history.history['loss']),
        "model_type": "GRU"
    }
    
    with open(os.path.join(MODELS_DIR, 'model_info.json'), 'w') as f:
        json.dump(model_info, f, indent=2)
    
    log_progress("Model info saved!")
    
    return True


if __name__ == '__main__':
    success = train()
    sys.exit(0 if success else 1)
