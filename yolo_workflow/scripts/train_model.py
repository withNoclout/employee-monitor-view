import os
import sys
import yaml
from pathlib import Path
from ultralytics import YOLO
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

def main():
    print("Starting training pipeline...")
    
    # 1. Read classes
    if not CLASSES_FILE.exists():
        print("Error: classes.txt not found.")
        sys.exit(1)
        
    with open(CLASSES_FILE, 'r') as f:
        classes = [line.strip() for line in f.readlines() if line.strip()]
    
    # 2. Process Dataset (Split and Organize)
    print("Processing dataset...")
    # Clean processed directory first to ensure fresh split
    import shutil
    if PROCESSED_DATA_DIR.exists():
        shutil.rmtree(PROCESSED_DATA_DIR)
        
    process_dataset(RAW_DATA_DIR, PROCESSED_DATA_DIR)
    
    # 3. Create data.yaml
    print("Creating data.yaml...")
    yaml_path = create_data_yaml(classes)
    
    # 4. Train Model
    print("Initializing YOLO model...")
    try:
        model = YOLO('yolov8n.pt')  # load a pretrained model
        
        print("Starting training...")
        # Use absolute path for project to avoid confusion
        project_path = BASE_DIR / 'runs'
        
        results = model.train(
            data=str(yaml_path),
            epochs=10,  # Short run for testing
            imgsz=640,
            project=str(project_path),
            name='custom_model',
            exist_ok=True
        )
        
        print("Training completed successfully!")
        # results.save_dir is usually a Path object or string
        print(f"Best model saved at: {project_path}/custom_model/weights/best.pt")
        
    except Exception as e:
        print(f"Error during training: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
