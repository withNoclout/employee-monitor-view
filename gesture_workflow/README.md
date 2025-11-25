# Gesture Recognition System

## Data Structure

```
gesture_workflow/
├── gestures/                    # Raw gesture data
│   ├── {class_name}/           # e.g., "thumbs_up", "hand_raise"
│   │   ├── sequence_001.json   # Each file = one complete action
│   │   ├── sequence_002.json
│   │   └── ...
│   └── ...
├── models/                      # Trained models
│   └── gesture_model.h5
├── scripts/
│   ├── train_gesture.py        # GRU-based training
│   └── inference.py            # Real-time inference
└── classes.json                # Class metadata
```

## Sequence Data Format (sequence_XXX.json)

```json
{
  "class": "thumbs_up",
  "sequence_id": "sequence_001",
  "recorded_at": "2025-01-15T10:30:00Z",
  "frames": [
    {
      "timestamp": 0,
      "left_hand": null,
      "right_hand": {
        "landmarks": [
          [0.0, 0.0, 0.0],      // Wrist (always 0,0,0 - origin)
          [0.12, -0.15, 0.02],  // Thumb CMC (relative to wrist)
          [0.18, -0.22, 0.03],  // Thumb MCP
          // ... 21 landmarks total (63 values = 21 * 3)
        ]
      }
    },
    // More frames...
  ],
  "metadata": {
    "fps": 30,
    "duration_ms": 1500,
    "frame_count": 45
  }
}
```

## Coordinate System

- **Origin**: Wrist (landmark 0)
- **Relative coordinates**: All landmarks normalized relative to wrist position
- **Scale normalization**: Optionally normalized by hand size (palm width)
- **Z-depth**: Available from MediaPipe (negative = towards camera)

## Model Architecture (GRU)

Why GRU over LSTM?
- Faster training (fewer parameters)
- Better for real-time inference
- Sufficient for gesture sequences (typically <2 seconds)
- Similar accuracy for shorter sequences

```
Input: (batch, seq_len, features)
  - seq_len: padded to MAX_SEQ_LEN (e.g., 60 frames = 2 seconds @ 30fps)
  - features: 63 per hand (21 landmarks × 3 coordinates) = 126 for both hands

GRU Layers:
  - GRU(128, return_sequences=True)
  - Dropout(0.3)
  - GRU(64)
  - Dropout(0.3)
  - Dense(32, relu)
  - Dense(num_classes, softmax)
```

## Handling Missing Data

- **No hand detected**: Fill with zeros (63 values)
- **Masking**: Use Keras Masking layer to ignore padded frames
- **Padding**: Post-pad sequences to MAX_SEQ_LEN
