import { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { X, Save, Trash2, MousePointer2, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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

interface ImageAnnotatorProps {
  images: File[];
  onSave: (data: { image: string; annotations: Annotation[] }[]) => void;
  onCancel: () => void;
}

export const ImageAnnotator = ({ images, onSave, onCancel }: ImageAnnotatorProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [annotations, setAnnotations] = useState<Record<number, Annotation[]>>({});
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentBox, setCurrentBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [labelInput, setLabelInput] = useState("");
  const [showLabelInput, setShowLabelInput] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const urls = images.map(file => URL.createObjectURL(file));
    setImageUrls(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [images]);

  const getMousePos = (e: React.MouseEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height
    };
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

      // Add images to zip
      images.forEach((file) => {
        imagesFolder?.file(file.name, file);
      });

      // Create annotations JSON
      const datasetData = images.map((file, idx) => ({
        image: file.name,
        annotations: annotations[idx] || []
      }));

      // Create data for parent component including the File object
      const onSaveData = images.map((file, idx) => ({
        image: file.name,
        file: file,
        annotations: annotations[idx] || []
      }));

      // Add main JSON file
      datasetFolder?.file("annotations.json", JSON.stringify(datasetData, null, 2));

      // Also create individual YOLO format text files (optional but useful)
      // YOLO format: <object-class> <x_center> <y_center> <width> <height>
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
          // toast.success("Dataset saved to server!"); // Assuming toast is available or passed as prop, otherwise just log
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
      <div className="flex-1 flex gap-4 min-h-0">
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

        {/* Sidebar Info */}
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
                {annotations[idx]?.length > 0 && (
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
