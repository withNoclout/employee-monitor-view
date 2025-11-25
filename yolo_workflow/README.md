# YOLO Dataset Workflow

This folder contains the tools and structure to manage your YOLO object detection dataset.

## Structure

- **`raw_data/`**: Place your raw images and annotation files here. You can have subfolders (e.g., `batch1`, `batch2`).
  - The script expects images and `.txt` labels to be either in the same folder or in parallel `images` and `labels` folders.
- **`processed_data/`**: The script will generate the ready-to-train dataset here, split into `train` and `val`.
- **`scripts/`**: Contains the python scripts to manage the data.
- **`classes.txt`**: List your object classes here, one per line.

## How to Use

1.  **Prepare Data**: Put your images and YOLO format `.txt` labels into `raw_data/`.
2.  **Define Classes**: Edit `classes.txt` to match your class names.
3.  **Run Script**:
    ```bash
    python3 scripts/manage_dataset.py
    ```
4.  **Result**:
    - Your data will be shuffled and split into `processed_data/train` and `processed_data/val`.
    - Files will be renamed to `{parent_folder}_{filename}` to avoid conflicts.
    - A `data.yaml` file will be created in `processed_data/` which you can use to start training YOLO.

## Training

To train using the generated config:
```bash
yolo task=detect mode=train model=yolov8n.pt data=processed_data/data.yaml epochs=100 imgsz=640
```
