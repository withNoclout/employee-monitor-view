#!/usr/bin/env python3
"""
Detection script for YOLO model inference.
Takes an image path as argument, outputs JSON with detections.
"""

import sys
import json
from pathlib import Path
from ultralytics import YOLO

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / 'runs' / 'custom_model' / 'weights' / 'best.pt'
CLASSES_FILE = BASE_DIR / 'classes.txt'

def load_classes():
    """Load class names from classes.txt"""
    if CLASSES_FILE.exists():
        with open(CLASSES_FILE, 'r') as f:
            return [line.strip() for line in f.readlines() if line.strip()]
    return []

def detect(image_path, conf_threshold=0.1):
    """Run detection on an image and return results as JSON"""
    
    if not MODEL_PATH.exists():
        return {"error": "Model not found. Please train the model first.", "detections": []}
    
    try:
        model = YOLO(str(MODEL_PATH))
        # Use very low confidence to show all possible detections
        results = model(image_path, verbose=False, conf=conf_threshold)
        
        classes = load_classes()
        detections = []
        
        for result in results:
            boxes = result.boxes
            if boxes is not None:
                for i, box in enumerate(boxes):
                    # Get box coordinates (normalized)
                    xyxy = box.xyxyn[0].tolist()  # normalized [x1, y1, x2, y2]
                    conf = float(box.conf[0])
                    cls_id = int(box.cls[0])
                    
                    # Get class name
                    cls_name = classes[cls_id] if cls_id < len(classes) else f"class_{cls_id}"
                    
                    detections.append({
                        "class": cls_name,
                        "class_id": cls_id,
                        "confidence": round(conf, 3),
                        "bbox": {
                            "x1": round(xyxy[0], 4),
                            "y1": round(xyxy[1], 4),
                            "x2": round(xyxy[2], 4),
                            "y2": round(xyxy[3], 4)
                        }
                    })
        
        return {"detections": detections}
        
    except Exception as e:
        return {"error": str(e), "detections": []}

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No image path provided", "detections": []}))
        sys.exit(1)
    
    image_path = sys.argv[1]
    result = detect(image_path)
    print(json.dumps(result))
