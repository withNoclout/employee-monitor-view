import os
import shutil
import random
import yaml
from pathlib import Path
from tqdm import tqdm

def setup_directories(base_path):
    """Creates the YOLO directory structure."""
    dirs = [
        base_path / 'train' / 'images',
        base_path / 'train' / 'labels',
        base_path / 'val' / 'images',
        base_path / 'val' / 'labels'
    ]
    for d in dirs:
        d.mkdir(parents=True, exist_ok=True)
    return base_path

def get_image_files(source_dir):
    """Recursively finds all image files."""
    extensions = {'.jpg', '.jpeg', '.png', '.bmp', '.webp'}
    return [p for p in Path(source_dir).rglob('*') if p.suffix.lower() in extensions]

def process_dataset(source_dir, dest_dir, split_ratio=0.8, classes=None):
    """
    Manages YOLO dataset: pairs, shuffles, splits, renames, and copies.
    """
    source_path = Path(source_dir)
    dest_path = Path(dest_dir)
    
    # 1. Setup Destination Structure
    setup_directories(dest_path)
    
    # 2. Find and Pair Data
    print(f"Scanning {source_path} for images...")
    image_files = get_image_files(source_path)
    valid_pairs = []
    
    for img_path in image_files:
        # Assumes label is in a 'labels' folder parallel to 'images' 
        # OR in the same folder with .txt extension
        # Let's try to find the corresponding txt file
        
        # Strategy 1: Same folder, same name, .txt
        txt_path = img_path.with_suffix('.txt')
        
        # Strategy 2: If img is in .../images/..., look in .../labels/...
        if not txt_path.exists():
            parts = list(img_path.parts)
            if 'images' in parts:
                idx = len(parts) - 1 - parts[::-1].index('images')
                parts[idx] = 'labels'
                txt_path = Path(*parts).with_suffix('.txt')
        
        if txt_path.exists():
            # Check if file is not empty
            if txt_path.stat().st_size > 0:
                valid_pairs.append((img_path, txt_path))
    
    print(f"Found {len(valid_pairs)} valid image-label pairs.")
    
    if not valid_pairs:
        print("No valid pairs found. Exiting.")
        return

    # 3. Shuffle
    random.shuffle(valid_pairs)
    
    # 4. Split
    split_idx = int(len(valid_pairs) * split_ratio)
    train_pairs = valid_pairs[:split_idx]
    val_pairs = valid_pairs[split_idx:]
    
    print(f"Split: {len(train_pairs)} Train, {len(val_pairs)} Val")
    
    # 5. Copy and Rename
    def copy_files(pairs, split_name):
        print(f"Processing {split_name} set...")
        for img_src, txt_src in tqdm(pairs):
            # Logic: {parent_folder_name}_{original_filename}
            # Parent folder name is the immediate parent of the image
            parent_name = img_src.parent.name
            new_filename = f"{parent_name}_{img_src.name}"
            new_txt_filename = f"{parent_name}_{txt_src.name}"
            
            # Destination paths
            img_dest = dest_path / split_name / 'images' / new_filename
            txt_dest = dest_path / split_name / 'labels' / new_txt_filename
            
            shutil.copy2(img_src, img_dest)
            shutil.copy2(txt_src, txt_dest)

    copy_files(train_pairs, 'train')
    copy_files(val_pairs, 'val')
    
    # 6. Generate data.yaml
    if classes:
        yaml_content = {
            'path': str(dest_path.absolute()),
            'train': 'train/images',
            'val': 'val/images',
            'nc': len(classes),
            'names': classes
        }
        
        yaml_path = dest_path / 'data.yaml'
        with open(yaml_path, 'w') as f:
            yaml.dump(yaml_content, f, sort_keys=False)
        print(f"Created config at {yaml_path}")

if __name__ == "__main__":
    # Configuration
    script_dir = Path(__file__).parent
    SOURCE_DIR = "../raw_data"
    DEST_DIR = "../processed_data"
    CLASSES_FILE = "../classes.txt"
    
    source = (script_dir / SOURCE_DIR).resolve()
    dest = (script_dir / DEST_DIR).resolve()
    classes_path = (script_dir / CLASSES_FILE).resolve()
    
    # Read classes
    if classes_path.exists():
        with open(classes_path, 'r') as f:
            CLASSES = [line.strip() for line in f.readlines() if line.strip()]
    else:
        print(f"Warning: {classes_path} not found. Using default classes.")
        CLASSES = ["item"]

    process_dataset(source, dest, classes=CLASSES)
