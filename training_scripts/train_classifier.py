import json
import os
import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, models
from PIL import Image
from sklearn.model_selection import train_test_split

# Configuration
DATASET_PATH = "dataset"  # Path to the unzipped dataset folder
IMG_SIZE = (224, 224)
BATCH_SIZE = 32
EPOCHS = 10

def load_dataset(dataset_path):
    """
    Loads images and annotations from the dataset folder.
    This is a simplified example assuming classification based on the first label found.
    For object detection (bounding boxes), you would need a more complex model like YOLO or SSD.
    """
    images = []
    labels = []
    
    # Load annotations
    with open(os.path.join(dataset_path, "annotations.json"), 'r') as f:
        data = json.load(f)
    
    # Create a label map
    unique_labels = set()
    for item in data:
        for ann in item['annotations']:
            unique_labels.add(ann['label'])
    
    label_map = {label: i for i, label in enumerate(sorted(unique_labels))}
    print(f"Found classes: {label_map}")
    
    for item in data:
        img_name = item['image']
        img_path = os.path.join(dataset_path, "images", img_name)
        
        if not os.path.exists(img_path):
            continue
            
        # For this example, we take the label of the first annotation
        # In a real object detection scenario, you'd use the bounding boxes
        if item['annotations']:
            label_str = item['annotations'][0]['label']
            label_idx = label_map[label_str]
            
            try:
                img = Image.open(img_path).convert('RGB')
                img = img.resize(IMG_SIZE)
                img_array = np.array(img) / 255.0
                
                images.append(img_array)
                labels.append(label_idx)
            except Exception as e:
                print(f"Error loading {img_name}: {e}")

    return np.array(images), np.array(labels), len(unique_labels)

def create_model(num_classes):
    """
    Creates a simple CNN model for classification.
    """
    model = models.Sequential([
        layers.Conv2D(32, (3, 3), activation='relu', input_shape=(IMG_SIZE[0], IMG_SIZE[1], 3)),
        layers.MaxPooling2D((2, 2)),
        layers.Conv2D(64, (3, 3), activation='relu'),
        layers.MaxPooling2D((2, 2)),
        layers.Conv2D(64, (3, 3), activation='relu'),
        layers.Flatten(),
        layers.Dense(64, activation='relu'),
        layers.Dense(num_classes, activation='softmax')
    ])
    
    model.compile(optimizer='adam',
                  loss='sparse_categorical_crossentropy',
                  metrics=['accuracy'])
    return model

def main():
    if not os.path.exists(DATASET_PATH):
        print(f"Dataset not found at {DATASET_PATH}. Please unzip your downloaded dataset here.")
        return

    print("Loading dataset...")
    X, y, num_classes = load_dataset(DATASET_PATH)
    
    if len(X) == 0:
        print("No valid images found.")
        return
        
    print(f"Loaded {len(X)} images with {num_classes} classes.")
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("Creating model...")
    model = create_model(num_classes)
    model.summary()
    
    print("Training model...")
    history = model.fit(X_train, y_train, epochs=EPOCHS, validation_data=(X_test, y_test))
    
    print("Saving model...")
    model.save('component_classifier.h5')
    print("Model saved as component_classifier.h5")

if __name__ == "__main__":
    main()
