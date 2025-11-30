import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { X, Save, Trash2, MousePointer2, Download, Brush, Eraser, ZoomIn, ZoomOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import JSZip from "jszip";

interface Annotation {
  id: string;
  x: number; // percentage 0-1
  y: number; // percentage 0-1
  width: number; // percentage 0-1
  height: number; // percentage 0-1
  label: string;
}

interface MaskAnnotation {
  id: string;
  label: string;
  maskDataURL: string; // Base64 encoded PNG
}

interface ImageAnnotatorProps {
  images: File[];
  onSave: (data: { image: string; annotations: Annotation[] }[]) => void;
  onCancel: () => void;
}

export const ImageAnnotator = ({ images, onSave, onCancel }: ImageAnnotatorProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [annotationMode, setAnnotationMode] = useState<'bbox' | 'marks'>('bbox'); // Mode selector
  
  // Bounding box state
  const [annotations, setAnnotations] = useState<Record<number, Annotation[]>>({});
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentBox, setCurrentBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  
  // Segmentation/Marks state
  const [masks, setMasks] = useState<Record<number, MaskAnnotation[]>>({});
  const [isDrawingMask, setIsDrawingMask] = useState(false);
  const [brushSize, setBrushSize] = useState(15);
  const [brushMode, setBrushMode] = useState<'brush' | 'eraser'>('brush');
  const [maskZoom, setMaskZoom] = useState(1);
  const [maskPanX, setMaskPanX] = useState(0);
  const [maskPanY, setMaskPanY] = useState(0);
  const [maskLabel, setMaskLabel] = useState("");
  const [currentMaskId, setCurrentMaskId] = useState<string | null>(null);
  
  // Shared state
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [labelInput, setLabelInput] = useState("");
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskImageRef = useRef<HTMLImageElement>(null);
  const lastX = useRef(0);
  const lastY = useRef(0);

  useEffect(() => {
    const urls = images.map(file => URL.createObjectURL(file));
    setImageUrls(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [images]);

  // Initialize mask canvas when mask mode is selected or image changes
  useEffect(() => {
    if (annotationMode === 'marks' && maskCanvasRef.current && maskImageRef.current && imageUrls[currentIndex]) {
      const canvas = maskCanvasRef.current;
      const img = maskImageRef.current;
      
      img.src = imageUrls[currentIndex];
      img.onload = () => {
        // Set canvas to match natural image dimensions (not display size)
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        
        // Load existing mask if present
        const existingMasks = masks[currentIndex] || [];
        if (existingMasks.length > 0 && currentMaskId) {
          const maskData = existingMasks.find(m => m.id === currentMaskId);
          if (maskData) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              const maskImg = new Image();
              maskImg.src = maskData.maskDataURL;
              maskImg.onload = () => {
                ctx.drawImage(maskImg, 0, 0);
              };
            }
          }
        } else {
          // Clear canvas for new mask
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
        }
      };
    }
  }, [annotationMode, currentIndex, imageUrls, masks, currentMaskId]);

  const getMousePos = (e: React.MouseEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height
    };
  };

  // Mask drawing functions
  const getMaskCanvasPos = (e: React.MouseEvent | React.PointerEvent) => {
    if (!maskCanvasRef.current) return { x: 0, y: 0 };
    const canvas = maskCanvasRef.current;
    
    // Get canvas bounding rect (display size on screen)
    const rect = canvas.getBoundingClientRect();
    
    // Screen coordinates relative to canvas element
    let screenX = e.clientX - rect.left;
    let screenY = e.clientY - rect.top;
    
    // Account for CSS zoom/scale transform
    screenX = screenX / maskZoom;
    screenY = screenY / maskZoom;
    
    // Canvas element displays at rect.width x rect.height on screen
    // But canvas.width x canvas.height is the internal resolution
    // We need to map display coordinates to internal resolution
    const displayWidth = rect.width / maskZoom;  // Display width accounting for zoom
    const displayHeight = rect.height / maskZoom; // Display height accounting for zoom
    const internalWidth = canvas.width;
    const internalHeight = canvas.height;
    
    const scaleX = internalWidth / displayWidth;
    const scaleY = internalHeight / displayHeight;
    
    return {
      x: screenX * scaleX,
      y: screenY * scaleY
    };
  };

  const drawBrushStroke = (fromX: number, fromY: number, toX: number, toY: number) => {
    if (!maskCanvasRef.current) return;
    const ctx = maskCanvasRef.current.getContext('2d');
    if (!ctx) return;

    // Scale brush size to match canvas resolution
    const canvas = maskCanvasRef.current;
    const img = maskImageRef.current;
    if (!img) return;
    
    const displayWidth = img.width;
    const actualWidth = canvas.width;
    const scaledBrushSize = (brushSize * actualWidth) / displayWidth;

    // Set common stroke properties
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = scaledBrushSize;

    if (brushMode === 'brush') {
      // Draw red brush stroke
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)'; // Semi-transparent red
      ctx.globalCompositeOperation = 'source-over';
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.stroke();
    } else {
      // Draw eraser (transparent)
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }
  };

  const handleMaskMouseDown = (e: React.PointerEvent) => {
    if (!maskCanvasRef.current) return;
    setIsDrawingMask(true);
    const pos = getMaskCanvasPos(e);
    lastX.current = pos.x;
    lastY.current = pos.y;
  };

  const handleMaskMouseMove = (e: React.PointerEvent) => {
    if (!isDrawingMask || !maskCanvasRef.current) return;
    const pos = getMaskCanvasPos(e);
    drawBrushStroke(lastX.current, lastY.current, pos.x, pos.y);
    lastX.current = pos.x;
    lastY.current = pos.y;
  };

  const handleMaskMouseUp = () => {
    setIsDrawingMask(false);
  };

  const saveMaskForCurrent = () => {
    if (!maskCanvasRef.current || !maskLabel.trim()) return;
    
    const canvas = maskCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Get pixel data from the red-drawn canvas
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Convert red strokes to white on black background
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];     // Red channel
      const a = data[i + 3]; // Alpha channel
      
      // If pixel has red color and is opaque, it was painted
      if (r > 100 && a > 100) {
        // Convert to white (255, 255, 255)
        data[i] = 255;       // R
        data[i + 1] = 255;   // G
        data[i + 2] = 255;   // B
        data[i + 3] = 255;   // A (fully opaque)
      } else {
        // Convert to black (0, 0, 0) - background
        data[i] = 0;         // R
        data[i + 1] = 0;     // G
        data[i + 2] = 0;     // B
        data[i + 3] = 255;   // A (fully opaque)
      }
    }
    
    // Put the converted image data back on canvas
    ctx.putImageData(imageData, 0, 0);
    
    // Export as binary mask (white on black)
    const maskDataURL = canvas.toDataURL('image/png');
    
    const newMask: MaskAnnotation = {
      id: Math.random().toString(36).substr(2, 9),
      label: maskLabel.trim(),
      maskDataURL
    };

    setMasks(prev => ({
      ...prev,
      [currentIndex]: [...(prev[currentIndex] || []), newMask]
    }));

    setMaskLabel("");
    // Clear canvas for next mask
    const freshCtx = maskCanvasRef.current.getContext('2d');
    if (freshCtx) {
      freshCtx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
    }
    setCurrentMaskId(null);
  };

  const clearCurrentMask = () => {
    if (!maskCanvasRef.current) return;
    const ctx = maskCanvasRef.current.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
    }
    setMaskLabel("");
    setCurrentMaskId(null);
  };

  const removeMask = (index: number, id: string) => {
    setMasks(prev => ({
      ...prev,
      [index]: prev[index].filter(m => m.id !== id)
    }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (showLabelInput) return;
    e.preventDefault();
    setIsDrawing(true);
    const pos = getMousePos(e);
    setStartPos(pos);
    setCurrentBox({ x: pos.x, y: pos.y, w: 0, h: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !startPos) return;
    const pos = getMousePos(e);
    
    const x = Math.min(pos.x, startPos.x);
    const y = Math.min(pos.y, startPos.y);
    const w = Math.abs(pos.x - startPos.x);
    const h = Math.abs(pos.y - startPos.y);

    setCurrentBox({ x, y, w, h });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentBox) return;
    setIsDrawing(false);
    if (currentBox.w > 0.01 && currentBox.h > 0.01) { // Minimum size threshold
      setShowLabelInput(true);
    } else {
      setCurrentBox(null);
      setStartPos(null);
    }
  };

  const handleAddLabel = () => {
    if (!labelInput.trim() || !currentBox) return;
    
    const newAnnotation: Annotation = {
      id: Math.random().toString(36).substr(2, 9),
      x: currentBox.x,
      y: currentBox.y,
      width: currentBox.w,
      height: currentBox.h,
      label: labelInput.trim()
    };

    setAnnotations(prev => ({
      ...prev,
      [currentIndex]: [...(prev[currentIndex] || []), newAnnotation]
    }));

    setLabelInput("");
    setShowLabelInput(false);
    setCurrentBox(null);
    setStartPos(null);
  };

  const removeAnnotation = (index: number, id: string) => {
    setAnnotations(prev => ({
      ...prev,
      [index]: prev[index].filter(a => a.id !== id)
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const zip = new JSZip();
      const datasetFolder = zip.folder("dataset");
      const imagesFolder = datasetFolder?.folder("images");
      const labelsFolder = datasetFolder?.folder("labels");
      const masksFolder = datasetFolder?.folder("masks"); // New masks folder for segmentation

      // Add images to zip
      images.forEach((file) => {
        imagesFolder?.file(file.name, file);
      });

      // Create annotations JSON - support both bbox and mask annotations
      const datasetData = images.map((file, idx) => {
        const bboxAnnotations = annotations[idx] || [];
        const maskAnnotations = masks[idx] || [];
        
        return {
          image: file.name,
          annotations: bboxAnnotations.map(ann => ({
            ...ann,
            annotationType: 'bbox'
          })),
          masks: maskAnnotations.map(mask => ({
            id: mask.id,
            label: mask.label,
            mask: `${file.name.split('.')[0]}_mask_${mask.id}.png`,
            annotationType: 'mask'
          }))
        };
      });

      // Create data for parent component including the File object
      const onSaveData = images.map((file, idx) => ({
        image: file.name,
        file: file,
        annotations: annotations[idx] || []
      }));

      // Add main JSON file with both bbox and mask metadata
      datasetFolder?.file("annotations.json", JSON.stringify(datasetData, null, 2));

      // Create individual YOLO format text files for bboxes
      images.forEach((file, idx) => {
        const imageAnnotations = annotations[idx] || [];
        if (imageAnnotations.length > 0) {
          const yoloContent = imageAnnotations.map(ann => {
            const xCenter = ann.x + ann.width / 2;
            const yCenter = ann.y + ann.height / 2;
            return `${ann.label} ${xCenter.toFixed(6)} ${yCenter.toFixed(6)} ${ann.width.toFixed(6)} ${ann.height.toFixed(6)}`;
          }).join("\n");
          
          const fileNameWithoutExt = file.name.split('.').slice(0, -1).join('.');
          labelsFolder?.file(`${fileNameWithoutExt}.txt`, yoloContent);
        }
      });

      // Add mask PNG files
      for (let idx = 0; idx < images.length; idx++) {
        const imageMasks = masks[idx] || [];
        for (const mask of imageMasks) {
          const file = images[idx];
          const fileNameWithoutExt = file.name.split('.')[0];
          const maskFileName = `${fileNameWithoutExt}_mask_${mask.id}.png`;
          
          // Convert data URL to blob
          const response = await fetch(mask.maskDataURL);
          const blob = await response.blob();
          masksFolder?.file(maskFileName, blob);
        }
      }

      // Generate zip
      const content = await zip.generateAsync({ type: "blob" });
      
      // Send to server
      const formData = new FormData();
      formData.append('dataset', content, 'dataset.zip');

      try {
        const response = await fetch('http://localhost:3000/api/save-dataset', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          console.log("Server response:", result);
          // toast.success("Dataset saved to server!");
        } else {
          console.error("Failed to save to server");
          // toast.error("Failed to save to server");
        }
      } catch (err) {
        console.error("Error uploading to server:", err);
        // Fallback to download if server fails
        const url = window.URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        link.download = "training_dataset.zip";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }

      onSave(onSaveData);
    } catch (error) {
      console.error("Error creating zip:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] gap-4">
      {/* Mode Selector */}
      <div className="flex items-center justify-between bg-card border border-border rounded-lg p-4">
        <h2 className="font-semibold">Annotation Mode</h2>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={annotationMode === 'bbox' ? 'default' : 'outline'}
            onClick={() => setAnnotationMode('bbox')}
          >
            <MousePointer2 className="w-4 h-4 mr-2" />
            Bounding Box
          </Button>
          <Button
            size="sm"
            variant={annotationMode === 'marks' ? 'default' : 'outline'}
            onClick={() => setAnnotationMode('marks')}
          >
            <Brush className="w-4 h-4 mr-2" />
            Marks (Segmentation)
          </Button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* BOUNDING BOX MODE */}
        {annotationMode === 'bbox' && (
          <>
            {/* Main Image Area */}
            <div className="flex-1 bg-muted/30 rounded-xl border border-border relative flex items-center justify-center overflow-hidden">
              {imageUrls[currentIndex] && (
                <div 
                  ref={containerRef}
                  className="relative inline-block max-h-full max-w-full select-none"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  <img 
                    src={imageUrls[currentIndex]} 
                    alt="Annotation target" 
                    className="max-h-[60vh] object-contain pointer-events-none"
                    draggable={false}
                  />
                  
                  {/* Existing Annotations */}
                  {annotations[currentIndex]?.map(ann => (
                    <div
                      key={ann.id}
                      className="absolute border-2 border-primary bg-primary/10 group"
                      style={{
                        left: `${ann.x * 100}%`,
                        top: `${ann.y * 100}%`,
                        width: `${ann.width * 100}%`,
                        height: `${ann.height * 100}%`,
                      }}
                    >
                      <div className="absolute -top-6 left-0 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                        {ann.label}
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeAnnotation(currentIndex, ann.id); }}
                          className="hover:text-destructive-foreground hover:bg-destructive rounded-sm p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Current Drawing Box */}
                  {currentBox && (
                    <div
                      className="absolute border-2 border-accent bg-accent/20"
                      style={{
                        left: `${currentBox.x * 100}%`,
                        top: `${currentBox.y * 100}%`,
                        width: `${currentBox.w * 100}%`,
                        height: `${currentBox.h * 100}%`,
                      }}
                    />
                  )}
                </div>
              )}

              {/* Label Input Popup */}
              {showLabelInput && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-background border border-border p-4 rounded-lg shadow-xl z-10 flex gap-2 animate-in fade-in zoom-in duration-200">
                  <Input
                    autoFocus
                    placeholder="Label name (e.g. CPU)"
                    value={labelInput}
                    onChange={e => setLabelInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddLabel()}
                  />
                  <Button onClick={handleAddLabel}>Add</Button>
                  <Button variant="ghost" size="icon" onClick={() => {
                    setShowLabelInput(false);
                    setCurrentBox(null);
                    setStartPos(null);
                  }}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Sidebar Info - BBox */}
            <Card className="w-64 p-4 flex flex-col gap-4">
              <div>
                <h3 className="font-semibold mb-2">Current Image</h3>
                <p className="text-sm text-muted-foreground truncate">{images[currentIndex]?.name}</p>
              </div>
              
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Annotations ({annotations[currentIndex]?.length || 0})</h3>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {annotations[currentIndex]?.map(ann => (
                      <div key={ann.id} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                        <span>{ann.label}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => removeAnnotation(currentIndex, ann.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                    {(!annotations[currentIndex] || annotations[currentIndex].length === 0) && (
                      <p className="text-sm text-muted-foreground italic">No annotations yet</p>
                    )}
                  </div>
                </ScrollArea>
              </div>

              <div className="flex flex-col gap-2">
                <Button className="w-full" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    "Saving..."
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save to Server
                    </>
                  )}
                </Button>
                <Button variant="outline" className="w-full" onClick={onCancel}>
                  Cancel
                </Button>
              </div>
            </Card>
          </>
        )}

        {/* SEGMENTATION/MARKS MODE */}
        {annotationMode === 'marks' && (
          <>
            {/* Main Segmentation Canvas Area */}
            <div className="flex-1 bg-muted/30 rounded-xl border border-border relative flex items-center justify-center overflow-auto flex-col gap-3 p-4">
              {imageUrls[currentIndex] && (
                <>
                  {/* Canvas Overlay for Drawing */}
                  <div className="relative bg-black/5 rounded-lg border border-border overflow-auto"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexGrow: 1,
                      width: '100%',
                      minHeight: '400px'
                    }}
                  >
                    {/* Centered container for zoom */}
                    <div
                      style={{
                        position: 'relative',
                        transform: `scale(${maskZoom})`,
                        transformOrigin: 'center',
                        transition: 'transform 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <img 
                        ref={maskImageRef}
                        alt="Mask target" 
                        className="max-h-[60vh] max-w-[90vw] object-contain"
                        style={{ pointerEvents: 'none', display: 'block' }}
                      />
                      <canvas
                        ref={maskCanvasRef}
                        onPointerDown={handleMaskMouseDown}
                        onPointerMove={handleMaskMouseMove}
                        onPointerUp={handleMaskMouseUp}
                        onPointerLeave={handleMaskMouseUp}
                        className="cursor-crosshair"
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          display: 'block',
                          maxHeight: '60vh',
                          maxWidth: '90vw',
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain'
                        }}
                      />
                    </div>
                  </div>

                  {/* Brush Controls */}
                  <div className="w-full flex gap-3 items-center bg-card border border-border p-3 rounded-lg">
                    <Button
                      size="sm"
                      variant={brushMode === 'brush' ? 'default' : 'outline'}
                      onClick={() => setBrushMode('brush')}
                    >
                      <Brush className="w-4 h-4 mr-1" />
                      Brush
                    </Button>
                    <Button
                      size="sm"
                      variant={brushMode === 'eraser' ? 'default' : 'outline'}
                      onClick={() => setBrushMode('eraser')}
                    >
                      <Eraser className="w-4 h-4 mr-1" />
                      Eraser
                    </Button>

                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-xs font-medium text-muted-foreground">Size: {brushSize}</span>
                      <Slider
                        min={1}
                        max={100}
                        step={1}
                        value={[brushSize]}
                        onValueChange={(val) => setBrushSize(val[0])}
                        className="flex-1"
                      />
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setMaskZoom(Math.min(maskZoom + 0.2, 3))}
                    >
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setMaskZoom(Math.max(maskZoom - 0.2, 0.5))}
                    >
                      <ZoomOut className="w-4 h-4" />
                    </Button>

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={clearCurrentMask}
                    >
                      Clear
                    </Button>
                  </div>

                  {/* Label and Save Mask */}
                  <div className="w-full flex gap-3 bg-card border border-border p-3 rounded-lg">
                    <Input
                      placeholder="Label name (e.g. person)"
                      value={maskLabel}
                      onChange={e => setMaskLabel(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveMaskForCurrent()}
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={saveMaskForCurrent}
                      disabled={!maskLabel.trim()}
                    >
                      <Save className="w-4 h-4 mr-1" />
                      Save Mask
                    </Button>
                  </div>
                </>
              )}
            </div>

            {/* Sidebar Info - Masks */}
            <Card className="w-64 p-4 flex flex-col gap-4">
              <div>
                <h3 className="font-semibold mb-2">Current Image</h3>
                <p className="text-sm text-muted-foreground truncate">{images[currentIndex]?.name}</p>
              </div>
              
              <div className="flex-1">
                <h3 className="font-semibold mb-2">Masks ({masks[currentIndex]?.length || 0})</h3>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {masks[currentIndex]?.map(mask => (
                      <div key={mask.id} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                        <span>{mask.label}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => removeMask(currentIndex, mask.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                    {(!masks[currentIndex] || masks[currentIndex].length === 0) && (
                      <p className="text-sm text-muted-foreground italic">No masks yet</p>
                    )}
                  </div>
                </ScrollArea>
              </div>

              <div className="flex flex-col gap-2">
                <Button className="w-full" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    "Saving..."
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save to Server
                    </>
                  )}
                </Button>
                <Button variant="outline" className="w-full" onClick={onCancel}>
                  Cancel
                </Button>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Thumbnail Strip */}
      <div className="h-24 bg-background border-t border-border">
        <ScrollArea className="w-full whitespace-nowrap p-4">
          <div className="flex gap-4">
            {imageUrls.map((url, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={cn(
                  "relative h-16 aspect-square rounded-lg overflow-hidden border-2 transition-all",
                  currentIndex === idx ? "border-primary ring-2 ring-primary/20" : "border-transparent opacity-60 hover:opacity-100"
                )}
              >
                <img src={url} alt="" className="w-full h-full object-cover" />
                {(annotations[idx]?.length > 0 || masks[idx]?.length > 0) && (
                  <div className="absolute top-0 right-0 w-3 h-3 bg-success rounded-bl-lg" />
                )}
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
    </div>
  );
};
