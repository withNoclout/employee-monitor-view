# Marks/Segmentation Annotation Feature

## Overview
This document describes the new brush-based segmentation (marks) annotation mode added to the ImageAnnotator component. This feature allows users to annotate images using pixel-level masks in addition to the existing bounding-box annotations.

## Architecture

### Frontend: ImageAnnotator.tsx

#### Mode Selection
The annotator now supports two modes:
- **Bounding Box** (existing): Draw rectangles around objects
- **Marks (Segmentation)** (new): Paint masks over object regions

Users can switch modes using a mode selector at the top of the annotator UI.

#### Marks Mode UI & Controls

**Canvas Drawing:**
- Displays the image with an HTML5 Canvas overlay
- Pointer events (mouse/touch) are captured for drawing
- Brush strokes are rendered as semi-transparent red masks

**Brush Tools:**
- **Brush Tool**: Paints semi-transparent red (RGBA 255, 0, 0, 0.5)
- **Eraser Tool**: Removes mask pixels using `clearRect()`
- **Brush Size Slider**: Adjustable from 1-100 pixels
- **Zoom Controls**: Zoom in (up to 3x) and zoom out (down to 0.5x) for precise annotation
- **Clear Button**: Clears the entire canvas for the current image

**Label & Save:**
- Input field for mask label (e.g., "person", "object")
- Validation: Cannot save without a label
- Save Mask button: Converts canvas to PNG dataURL and stores the mask

#### Data Structure

**MaskAnnotation Interface:**
```typescript
interface MaskAnnotation {
  id: string;           // Unique identifier
  label: string;        // User-provided label
  maskDataURL: string;  // Base64-encoded PNG image
}
```

**State Management:**
- `masks`: Record of mask arrays indexed by image index
- `maskZoom`: Current zoom level (0.5 - 3)
- `brushSize`: Current brush size (1-100)
- `brushMode`: 'brush' | 'eraser'
- `maskLabel`: Current label input
- `currentMaskId`: Reference to currently edited mask

#### Save/Export Flow

When user clicks "Save to Server":

1. **Create ZIP structure:**
   ```
   dataset/
   ├── images/          (original image files)
   ├── labels/          (YOLO format .txt files for bboxes)
   ├── masks/           (PNG files for segmentation masks)
   └── annotations.json (metadata: both bbox and mask)
   ```

2. **annotations.json format:**
   ```json
   [
     {
       "image": "photo1.jpg",
       "annotations": [
         {
           "id": "ann123",
           "x": 0.1,
           "y": 0.2,
           "width": 0.3,
           "height": 0.4,
           "label": "CPU",
           "annotationType": "bbox"
         }
       ],
       "masks": [
         {
           "id": "mask456",
           "label": "person",
           "mask": "photo1_mask_mask456.png",
           "annotationType": "mask"
         }
       ]
     }
   ]
   ```

3. **Mask PNG naming convention:**
   - `{imageNameWithoutExt}_mask_{maskId}.png`
   - Example: `photo1_mask_abc123.png`

### Backend: server.js

#### save-dataset Endpoint (`POST /api/save-dataset`)

**File Structure on Disk:**
```
yolo_workflow/raw_data/
└── batch_1734567890/
    ├── images/        (original images)
    ├── labels/        (YOLO format .txt for bboxes)
    ├── masks/         (PNG mask files)
    └── annotations.json
```

**Processing Steps:**

1. **Extract ZIP:** Extracts the dataset.zip to a new batch directory
2. **Relocate folders:** Moves dataset/images, dataset/labels, dataset/masks up one level
3. **Update classes:** Parses annotations.json to extract mask labels and add to classes.txt
4. **Preserve structure:** Masks are stored as PNG files alongside other training data

**updateClassesAndLabels Function:**
- Processes YOLO format labels (bbox annotations)
- Extracts mask labels from annotations.json
- Consolidates all labels into a single classes.txt file
- Both bbox and mask annotations use the same class ID system

#### Class Management
- Classes are stored in `yolo_workflow/classes.txt`
- New classes (both from bbox and mask annotations) are automatically added
- Each class gets a numeric ID (index in classes.txt)
- The same class ID system is used for both annotation types

## Data Flow: End-to-End

### User Workflow
1. User navigates to `/training` page
2. Clicks "Upload" to select images
3. `ImageAnnotator` opens with mode selector
4. User chooses "Marks (Segmentation)" mode
5. For each image:
   - Paints mask using brush/eraser tools
   - Enters a label (e.g., "part_A")
   - Clicks "Save Mask"
   - Repeats for multiple masks per image if needed
6. Switches to next image using thumbnails
7. Clicks "Save to Server" to upload all data

### Server Processing
1. Receives dataset.zip from frontend
2. Extracts to `batch_{timestamp}/` in `yolo_workflow/raw_data/`
3. Updates `classes.txt` with any new labels
4. Data is ready for training pipeline to consume

### Training Pipeline Integration
- The backend can now read both:
  - **Bbox annotations** from `labels/` (YOLO format .txt files)
  - **Mask annotations** from `masks/` (PNG files + metadata in annotations.json)
- Training scripts can process mask data by:
  - Loading the original image
  - Loading the corresponding mask PNG
  - Using the mask as a binary segmentation target

## Validation & Error Handling

**Frontend Validation:**
- Cannot save mask without label
- Cannot save dataset without at least one annotation (bbox or mask)
- Canvas size matches image natural dimensions

**Backend Validation:**
- Checks for valid ZIP structure
- Handles missing optional folders gracefully
- Logs warnings if annotations.json is malformed
- Cleans up uploaded ZIP file after processing

## Compatibility

✅ **Backward Compatible:**
- Existing bbox-only datasets continue to work unchanged
- classes.txt system is extended, not replaced
- annotations.json structure is additive (bboxes + masks can coexist)

✅ **Side-by-Side Usage:**
- Same image can have both bbox and mask annotations
- Both are saved and tracked together
- Training pipeline can handle mixed datasets

## Future Enhancements

- **Mask refinement tools**: Magic wand, flood fill, contour smoothing
- **Multi-mask per label**: Support multiple masks with the same label in one image
- **Mask quality metrics**: Show confidence/coverage percentage
- **Batch operations**: Copy/apply mask to similar images
- **Augmentation**: Flip, rotate, scale masks during save
- **Export formats**: COCO, Pascal VOC format support for interoperability with other frameworks

## Testing Checklist

- [ ] Paint a mask on an image
- [ ] Switch brush size - verify rendering
- [ ] Test eraser - verify transparent areas
- [ ] Zoom in/out - verify drawing still works
- [ ] Save mask with label - verify in sidebar
- [ ] Delete mask - verify removal
- [ ] Switch to bbox mode - verify mode switch works
- [ ] Mix bbox and mask annotations on same image
- [ ] Save to server - verify ZIP structure and backend processing
- [ ] Check classes.txt - verify new labels are added
- [ ] Verify annotations.json on disk - check format

