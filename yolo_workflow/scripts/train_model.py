import os
import sys
import json
import yaml
from pathlib import Path
from ultralytics import YOLO
from ultralytics.utils.callbacks import default_callbacks

# Add current directory to path to import manage_dataset
sys.path.append(str(Path(__file__).parent))
from manage_dataset import process_dataset

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
RAW_DATA_DIR = BASE_DIR / 'raw_data'
PROCESSED_DATA_DIR = BASE_DIR / 'processed_data'
CLASSES_FILE = BASE_DIR / 'classes.txt'
DATA_YAML = BASE_DIR / 'data.yaml'

def create_data_yaml(classes):
    data = {
        'path': str(PROCESSED_DATA_DIR.absolute()),
        'train': 'train/images',
        'val': 'val/images',
        'nc': len(classes),
        'names': classes
    }
    with open(DATA_YAML, 'w') as f:
        yaml.dump(data, f)
    return DATA_YAML


class TrainingCallback:
    """Custom callback to output JSON progress for frontend parsing"""
    
    def __init__(self):
        self.epoch_losses = []
        self.best_loss = float('inf')
        self.no_improve_count = 0
        
    def on_train_epoch_end(self, trainer):
        """Called at end of each training epoch"""
        epoch = trainer.epoch + 1
        total_epochs = trainer.epochs
        
        # Get losses from trainer
        loss_items = trainer.loss_items
        if loss_items is not None:
            box_loss = float(loss_items[0]) if len(loss_items) > 0 else 0
            cls_loss = float(loss_items[1]) if len(loss_items) > 1 else 0
            dfl_loss = float(loss_items[2]) if len(loss_items) > 2 else 0
            total_loss = box_loss + cls_loss + dfl_loss
        else:
            total_loss = 0
            box_loss = cls_loss = dfl_loss = 0
        
        self.epoch_losses.append(total_loss)
        
        # Output JSON for frontend to parse
        progress_data = {
            "type": "epoch_end",
            "epoch": epoch,
            "total_epochs": total_epochs,
            "progress": round((epoch / total_epochs) * 100, 1),
            "box_loss": round(box_loss, 4),
            "cls_loss": round(cls_loss, 4),
            "dfl_loss": round(dfl_loss, 4),
            "total_loss": round(total_loss, 4),
            "loss_history": [round(l, 4) for l in self.epoch_losses[-50:]]  # Last 50 losses for graph
        }
        print(f"[PROGRESS]{json.dumps(progress_data)}")
        sys.stdout.flush()
        
    def on_val_end(self, validator):
        """Called at end of validation"""
        metrics = validator.metrics
        if hasattr(metrics, 'box'):
            map50 = float(metrics.box.map50) if hasattr(metrics.box, 'map50') else 0
            map50_95 = float(metrics.box.map) if hasattr(metrics.box, 'map') else 0
        else:
            map50 = map50_95 = 0
            
        val_data = {
            "type": "validation",
            "mAP50": round(map50, 4),
            "mAP50_95": round(map50_95, 4)
        }
        print(f"[PROGRESS]{json.dumps(val_data)}")
        sys.stdout.flush()
        
    def on_train_start(self, trainer):
        """Called when training starts"""
        start_data = {
            "type": "train_start",
            "total_epochs": trainer.epochs,
            "model": "YOLOv8n (Transfer Learning)",
            "frozen_layers": "Backbone frozen for first 10 epochs"
        }
        print(f"[PROGRESS]{json.dumps(start_data)}")
        sys.stdout.flush()


def main():
    print("Starting training pipeline...")
    print("[INFO] Using Transfer Learning with Frozen Base + Fine-tuning")
    
    # 1. Read classes
    if not CLASSES_FILE.exists():
        print("Error: classes.txt not found.")
        sys.exit(1)
        
    with open(CLASSES_FILE, 'r') as f:
        classes = [line.strip() for line in f.readlines() if line.strip()]
    
    print(f"[INFO] Found {len(classes)} classes: {classes}")
    
    # 2. Process Dataset (Split and Organize)
    print("Processing dataset...")
    import shutil
    if PROCESSED_DATA_DIR.exists():
        shutil.rmtree(PROCESSED_DATA_DIR)
        
    process_dataset(RAW_DATA_DIR, PROCESSED_DATA_DIR)
    
    # Count images
    train_images = list((PROCESSED_DATA_DIR / 'train' / 'images').glob('*')) if (PROCESSED_DATA_DIR / 'train' / 'images').exists() else []
    val_images = list((PROCESSED_DATA_DIR / 'val' / 'images').glob('*')) if (PROCESSED_DATA_DIR / 'val' / 'images').exists() else []
    print(f"[INFO] Training images: {len(train_images)}, Validation images: {len(val_images)}")
    
    if len(train_images) < 5:
        print("[WARNING] Very few training images! Consider adding more data.")
    
    # 3. Create data.yaml
    print("Creating data.yaml...")
    yaml_path = create_data_yaml(classes)
    
    # 4. Train Model with Transfer Learning
    print("Initializing YOLO model with transfer learning...")
    try:
        # Load pretrained YOLOv8n (this is transfer learning - using pretrained weights)
        model = YOLO('yolov8n.pt')
        
        # Register custom callbacks
        callback = TrainingCallback()
        model.add_callback("on_train_epoch_end", callback.on_train_epoch_end)
        model.add_callback("on_val_end", callback.on_val_end)
        model.add_callback("on_train_start", callback.on_train_start)
        
        project_path = BASE_DIR / 'runs'
        
        # Phase 1: Train with frozen backbone (transfer learning)
        print("\n[PHASE 1] Training with frozen backbone (10 epochs)...")
        print("[INFO] Backbone layers are frozen - only training detection head")
        
        phase1_data = {
            "type": "phase_start",
            "phase": 1,
            "description": "Frozen backbone - training detection head only",
            "epochs": 10
        }
        print(f"[PROGRESS]{json.dumps(phase1_data)}")
        
        results = model.train(
            data=str(yaml_path),
            epochs=10,  # Phase 1: Short training with frozen base
            imgsz=640,
            batch=4,
            patience=10,
            project=str(project_path),
            name='custom_model_phase1',
            exist_ok=True,
            freeze=10,  # Freeze first 10 layers (backbone)
            augment=True,
            hsv_h=0.015,
            hsv_s=0.7,
            hsv_v=0.4,
            degrees=15,
            translate=0.1,
            scale=0.5,
            fliplr=0.5,
            mosaic=1.0,
            mixup=0.1,
            verbose=True,
        )
        
        # Phase 2: Fine-tune with unfrozen layers
        print("\n[PHASE 2] Fine-tuning with all layers unfrozen (90 epochs with early stopping)...")
        print("[INFO] All layers unfrozen - fine-tuning entire model")
        
        phase2_data = {
            "type": "phase_start",
            "phase": 2,
            "description": "All layers unfrozen - fine-tuning entire model",
            "epochs": 90
        }
        print(f"[PROGRESS]{json.dumps(phase2_data)}")
        
        # Load the best model from phase 1 and continue training
        best_phase1 = project_path / 'custom_model_phase1' / 'weights' / 'best.pt'
        if best_phase1.exists():
            model = YOLO(str(best_phase1))
        
        # Re-register callbacks for phase 2
        callback2 = TrainingCallback()
        model.add_callback("on_train_epoch_end", callback2.on_train_epoch_end)
        model.add_callback("on_val_end", callback2.on_val_end)
        
        results = model.train(
            data=str(yaml_path),
            epochs=90,  # Phase 2: Longer training
            imgsz=640,
            batch=4,
            patience=20,  # Early stopping: stop if no improvement for 20 epochs
            project=str(project_path),
            name='custom_model',
            exist_ok=True,
            freeze=0,  # Unfreeze all layers
            augment=True,
            hsv_h=0.015,
            hsv_s=0.7,
            hsv_v=0.4,
            degrees=15,
            translate=0.1,
            scale=0.5,
            fliplr=0.5,
            mosaic=1.0,
            mixup=0.1,
            lr0=0.001,  # Lower learning rate for fine-tuning
            lrf=0.01,
            verbose=True,
        )
        
        complete_data = {
            "type": "training_complete",
            "best_model": str(project_path / 'custom_model' / 'weights' / 'best.pt'),
            "message": "Training completed successfully!"
        }
        print(f"[PROGRESS]{json.dumps(complete_data)}")
        print("Training completed successfully!")
        print(f"Best model saved at: {project_path}/custom_model/weights/best.pt")
        
    except Exception as e:
        error_data = {
            "type": "error",
            "message": str(e)
        }
        print(f"[PROGRESS]{json.dumps(error_data)}")
        print(f"Error during training: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
