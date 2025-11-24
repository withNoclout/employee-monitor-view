# AI Training Guide

This guide explains how to use the dataset collected from the Employee Monitor View application to train a Convolutional Neural Network (CNN).

## 1. Collect Data

1. Go to the **Training** page in the web application.
2. Upload images of the components you want to recognize (e.g., CPU, RAM, Motherboard).
3. Draw bounding boxes around the objects and label them.
4. Click **Download Dataset**. This will download a `training_dataset.zip` file.

## 2. Prepare Environment

You need Python installed with the following libraries:

```bash
pip install tensorflow numpy pillow scikit-learn
```

## 3. Setup Training Script

1. Create a folder for your training project.
2. Unzip the `training_dataset.zip` into this folder. You should see a `dataset` folder containing `images/` and `annotations.json`.
3. Copy the `train_classifier.py` script into the same folder.

## 4. Train the Model

Run the training script:

```bash
python train_classifier.py
```

The script will:
1. Load the images and labels from the dataset.
2. Preprocess the images (resize to 224x224, normalize).
3. Split the data into training and testing sets.
4. Train a simple CNN model.
5. Save the trained model as `component_classifier.h5`.

## Note on Object Detection vs. Classification

The provided script trains a **Classifier** (it predicts what the main object in the image is). 

If you want to perform **Object Detection** (finding *where* the object is, using the bounding boxes you drew), you will need to use a more advanced algorithm like YOLO (You Only Look Once) or SSD.

The downloaded dataset includes labels in YOLO format (`.txt` files in `dataset/labels`), so you can directly use it to train a YOLO model (e.g., using Ultralytics YOLOv8).

### Training with YOLOv8 (Recommended for Object Detection)

1. Install Ultralytics:
   ```bash
   pip install ultralytics
   ```

2. Create a `data.yaml` file:
   ```yaml
   path: ./dataset  # dataset root dir
   train: images  # train images (relative to 'path')
   val: images  # val images (relative to 'path')
   
   names:
     0: CPU
     1: RAM
     # ... add all your classes here matching the index
   ```

3. Run training command:
   ```bash
   yolo detect train data=data.yaml model=yolov8n.pt epochs=100 imgsz=640
   ```
