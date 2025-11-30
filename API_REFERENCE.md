# API & Data Format Reference

## Request Format: Save Dataset with Marks

### Frontend Request (multipart/form-data)

**Endpoint:** `POST /api/save-dataset`

**Request Body:**
- `dataset`: File (ZIP archive)

### ZIP Archive Structure

```
dataset/
├── images/
│   ├── photo1.jpg
│   ├── photo2.png
│   └── ...
├── labels/
│   ├── photo1.txt  (YOLO format, only for bbox annotations)
│   ├── photo2.txt
│   └── ...
├── masks/          (NEW: for segmentation annotations)
│   ├── photo1_mask_mask_id_1.png
│   ├── photo1_mask_mask_id_2.png
│   ├── photo2_mask_mask_id_3.png
│   └── ...
└── annotations.json (updated format)
```

### annotations.json Format

```json
[
  {
    "image": "photo1.jpg",
    "annotations": [
      {
        "id": "bbox_1",
        "x": 0.15,
        "y": 0.25,
        "width": 0.35,
        "height": 0.45,
        "label": "CPU",
        "annotationType": "bbox"
      }
    ],
    "masks": [
      {
        "id": "mask_1",
        "label": "person",
        "mask": "photo1_mask_mask_1.png",
        "annotationType": "mask"
      },
      {
        "id": "mask_2",
        "label": "workbench",
        "mask": "photo1_mask_mask_2.png",
        "annotationType": "mask"
      }
    ]
  },
  {
    "image": "photo2.jpg",
    "annotations": [],
    "masks": [
      {
        "id": "mask_3",
        "label": "part_a",
        "mask": "photo2_mask_mask_3.png",
        "annotationType": "mask"
      }
    ]
  }
]
```

## Backend Response

### Success Response (200 OK)

```json
{
  "message": "Dataset saved and processed successfully",
  "batch": "batch_1734567890123"
}
```

### Error Responses

**400 Bad Request:**
```json
"No file uploaded."
```

**500 Internal Server Error:**
```json
"Error processing dataset: {error message}"
```

## Backend Processing & Storage

### Directory Structure After Processing

```
yolo_workflow/raw_data/
└── batch_1734567890123/
    ├── images/
    │   ├── photo1.jpg
    │   └── photo2.jpg
    ├── labels/
    │   ├── photo1.txt  (YOLO format: "<class_id> <x> <y> <w> <h>")
    │   └── photo2.txt
    ├── masks/
    │   ├── photo1_mask_mask_1.png
    │   ├── photo1_mask_mask_2.png
    │   └── photo2_mask_mask_3.png
    └── annotations.json
```

### YOLO Format Labels (photo1.txt)

```
0 0.5 0.5 0.3 0.4
1 0.2 0.3 0.2 0.2
```

Where:
- First column: class ID (index in classes.txt)
- Remaining columns: x_center, y_center, width, height (normalized 0-1)

### Classes File (yolo_workflow/classes.txt)

```
CPU
Motherboard
person
workbench
part_a
```

Class IDs are line numbers (0-indexed).

## Integration with Training Pipeline

### For YOLO/Bbox Training
Training scripts can:
1. Read images from `batch_*/images/`
2. Read annotations from `batch_*/labels/` (YOLO format)
3. Use classes.txt for label mapping
4. Process as normal YOLO dataset

### For Mask-based Training (Segmentation)
Training scripts can:
1. Read images from `batch_*/images/`
2. Read mask metadata from `batch_*/annotations.json`
3. Load masks from `batch_*/masks/`
4. Use classes.txt for label mapping (same class ID system)
5. Pair each image with its corresponding mask(s) for training

### Example Python Integration

```python
import json
from pathlib import Path
from PIL import Image

batch_dir = Path("yolo_workflow/raw_data/batch_1734567890123")

# Load class names
with open("yolo_workflow/classes.txt") as f:
    classes = [line.strip() for line in f]

# Load annotations
with open(batch_dir / "annotations.json") as f:
    data = json.load(f)

# Process each item
for item in data:
    image = Image.open(batch_dir / "images" / item["image"])
    
    # Process bbox annotations
    for ann in item.get("annotations", []):
        if ann["annotationType"] == "bbox":
            label = classes[int(ann["label"])]
            # ... use bbox data
    
    # Process mask annotations
    for mask_meta in item.get("masks", []):
        if mask_meta["annotationType"] == "mask":
            mask_path = batch_dir / "masks" / mask_meta["mask"]
            mask = Image.open(mask_path)
            label = mask_meta["label"]
            class_id = classes.index(label)
            # ... use mask data
```

## Key Design Decisions

1. **Unified Class System**: Both bbox and mask annotations use the same classes.txt
   - Ensures consistency in downstream training
   - Simplifies class management

2. **PNG for Masks**: Masks are stored as PNG images rather than binary/numpy formats
   - Platform-independent
   - Easily viewable for debugging
   - No additional dependencies required

3. **Additive Structure**: masks array in annotations.json is separate from annotations array
   - Allows mixed datasets (images with both bbox and mask)
   - Easy to filter by annotation type
   - Backward compatible with existing bbox-only code

4. **Metadata Separation**: Mask file paths are stored in annotations.json
   - Enables flexible file naming
   - Decouples mask IDs from storage location
   - Supports future alternative storage schemes

