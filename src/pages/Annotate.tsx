import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Camera, Grid3X3, Trash2, Save, RefreshCw, Check } from "lucide-react";
import { toast } from "sonner";

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  classId: number;
  className: string;
}

interface GridCell {
  row: number;
  col: number;
  selected: boolean;
}

const GRID_SIZE = 5; // 5x5 = 25 cells like CAPTCHA

export default function Annotate() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLive, setIsLive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  // Only grid annotation mode
  
  // Grid mode state
  const [gridCells, setGridCells] = useState<GridCell[]>([]);
  const [savedCount, setSavedCount] = useState(0);

  // Load classes from server
  useEffect(() => {
    const loadClasses = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/classes');
        if (response.ok) {
          const data = await response.json();
          setClasses(data.classes || []);
          if (data.classes?.length > 0) {
            setSelectedClass(data.classes[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load classes:', err);
        // Fallback classes
        setClasses(['phone', 'pen', 'snack']);
        setSelectedClass('phone');
      }
    };
    loadClasses();
  }, []);

  // Initialize grid cells
  useEffect(() => {
    const cells: GridCell[] = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        cells.push({ row, col, selected: false });
      }
    }
    setGridCells(cells);
  }, []);

  // Start camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: 640, height: 480 }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsLive(true);
        }
      } catch (err) {
        console.error('Camera error:', err);
        toast.error('Failed to access camera');
      }
    };
    startCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  // Capture image from video
  const captureImage = useCallback(() => {
    if (!videoRef.current) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      setCapturedImage(canvas.toDataURL('image/jpeg', 0.9));
      setGridCells(prev => prev.map(cell => ({ ...cell, selected: false })));
    }
  }, []);

  // Toggle grid cell selection
  const toggleCell = (row: number, col: number) => {
    setGridCells(prev => prev.map(cell => 
      cell.row === row && cell.col === col 
        ? { ...cell, selected: !cell.selected }
        : cell
    ));
  };

  // Convert grid selection to bounding box
  const gridToBoundingBox = (): BoundingBox | null => {
    const selectedCells = gridCells.filter(c => c.selected);
    if (selectedCells.length === 0) return null;

    const minRow = Math.min(...selectedCells.map(c => c.row));
    const maxRow = Math.max(...selectedCells.map(c => c.row));
    const minCol = Math.min(...selectedCells.map(c => c.col));
    const maxCol = Math.max(...selectedCells.map(c => c.col));

    const cellWidth = 1 / GRID_SIZE;
    const cellHeight = 1 / GRID_SIZE;

    const classId = classes.indexOf(selectedClass);

    return {
      x: minCol * cellWidth,
      y: minRow * cellHeight,
      width: (maxCol - minCol + 1) * cellWidth,
      height: (maxRow - minRow + 1) * cellHeight,
      classId: classId >= 0 ? classId : 0,
      className: selectedClass
    };
  };



  // Draw on canvas
  useEffect(() => {
    if (!canvasRef.current || !capturedImage) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Draw grid overlay in grid mode
      if (true) {
        const cellW = canvas.width / GRID_SIZE;
        const cellH = canvas.height / GRID_SIZE;

        // Draw grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        for (let i = 1; i < GRID_SIZE; i++) {
          ctx.beginPath();
          ctx.moveTo(i * cellW, 0);
          ctx.lineTo(i * cellW, canvas.height);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(0, i * cellH);
          ctx.lineTo(canvas.width, i * cellH);
          ctx.stroke();
        }

        // Highlight selected cells
        gridCells.filter(c => c.selected).forEach(cell => {
          ctx.fillStyle = 'rgba(34, 197, 94, 0.4)';
          ctx.fillRect(cell.col * cellW, cell.row * cellH, cellW, cellH);
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 3;
          ctx.strokeRect(cell.col * cellW, cell.row * cellH, cellW, cellH);
        });

        // Draw the resulting bounding box
        const bbox = gridToBoundingBox();
        if (bbox) {
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 3;
          ctx.setLineDash([10, 5]);
          ctx.strokeRect(
            bbox.x * canvas.width,
            bbox.y * canvas.height,
            bbox.width * canvas.width,
            bbox.height * canvas.height
          );
          ctx.setLineDash([]);
        }
      }
    };
    img.src = capturedImage;
  }, [capturedImage, gridCells]);

  // Save annotation
  const saveAnnotation = async () => {
    if (!capturedImage) {
      toast.error('Capture an image first');
      return;
    }

    let boxesToSave: BoundingBox[] = [];
    const bbox = gridToBoundingBox();
    if (!bbox) {
      toast.error('Select grid cells first');
      return;
    }
    boxesToSave = [bbox];

    try {
      // Convert to YOLO format and save
      const response = await fetch('http://localhost:3000/api/yolo/save-annotation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: capturedImage,
          annotations: boxesToSave.map(box => ({
            classId: box.classId,
            // YOLO format: center_x, center_y, width, height (all normalized 0-1)
            x: box.x + box.width / 2,
            y: box.y + box.height / 2,
            width: box.width,
            height: box.height
          }))
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Saved! ${result.message || 'Annotation added to dataset'}`);
        setSavedCount(prev => prev + 1);
        
        // Reset for next capture
        setCapturedImage(null);
        setGridCells(prev => prev.map(cell => ({ ...cell, selected: false })));
      } else {
        throw new Error('Failed to save');
      }
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save annotation');
    }
  };

  // Clear current annotation
  const clearAnnotation = () => {
    setGridCells(prev => prev.map(cell => ({ ...cell, selected: false })));
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Quick Annotate</h1>
            <p className="text-gray-400">Fast annotation with grid or rectangle mode</p>
          </div>
          <Badge className="ml-auto bg-green-500/20 text-green-400">
            {savedCount} saved this session
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Canvas Area */}
          <div className="lg:col-span-2">
            <Card className="bg-[#111] border-gray-800">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {capturedImage ? 'Annotate Image' : 'Camera Preview'}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Grid3X3 className="w-4 h-4" />
                    Grid (Fast)
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                  {/* Video preview (hidden when image captured) */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${capturedImage ? 'hidden' : ''}`}
                  />
                  
                  {/* Canvas for annotation */}
                  {capturedImage && (
                    <canvas
                      ref={canvasRef}
                      className="w-full h-full object-contain"
                    />
                  )}

                  {/* Grid overlay for clicking (grid mode only) */}
                  {capturedImage && (
                    <div 
                      className="absolute inset-0 grid"
                      style={{ 
                        gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                        gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`
                      }}
                    >
                      {gridCells.map((cell, idx) => (
                        <div
                          key={idx}
                          onClick={() => toggleCell(cell.row, cell.col)}
                          className={`
                            border border-white/20 cursor-pointer transition-all
                            hover:bg-blue-500/30
                            ${cell.selected ? 'bg-green-500/40 border-green-500' : ''}
                          `}
                        />
                      ))}
                    </div>
                  )}

                  {/* Instructions overlay */}
                  {!capturedImage && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="text-center">
                        <Camera className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                        <p className="text-gray-300">Position object and capture</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 mt-4">
                  {!capturedImage ? (
                    <Button onClick={captureImage} className="flex-1 bg-blue-600 hover:bg-blue-700">
                      <Camera className="w-4 h-4 mr-2" />
                      Capture Image
                    </Button>
                  ) : (
                    <>
                      <Button onClick={() => setCapturedImage(null)} variant="outline" className="flex-1">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Retake
                      </Button>
                      <Button onClick={clearAnnotation} variant="outline" className="flex-1">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Clear
                      </Button>
                      <Button onClick={saveAnnotation} className="flex-1 bg-green-600 hover:bg-green-700">
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Controls Panel */}
          <div className="space-y-6">
            {/* Class Selection */}
            <Card className="bg-[#111] border-gray-800">
              <CardHeader>
                <CardTitle className="text-lg">Select Class</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="bg-gray-800 border-gray-700">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls} value={cls}>
                        {cls}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Quick class buttons */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {classes.slice(0, 6).map((cls) => (
                    <Button
                      key={cls}
                      size="sm"
                      variant={selectedClass === cls ? "default" : "outline"}
                      onClick={() => setSelectedClass(cls)}
                      className={selectedClass === cls ? "bg-green-600" : ""}
                    >
                      {cls}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Mode Instructions */}
            <Card className="bg-[#111] border-gray-800">
              <CardHeader>
                <CardTitle className="text-lg">Grid Mode</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-400 space-y-2">
                <p className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Click cells containing the object
                </p>
                <p className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Select all cells the object touches
                </p>
                <p className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Box auto-calculates from selection
                </p>
                <p className="text-xs text-yellow-500 mt-3">
                  💡 Faster than drawing, great for quick labeling!
                </p>
              </CardContent>
            </Card>

            {/* Grid Selection Preview */}
            {capturedImage && (
              <Card className="bg-[#111] border-gray-800">
                <CardHeader>
                  <CardTitle className="text-lg">Selection</CardTitle>
                </CardHeader>
                <CardContent>
                  {gridCells.filter(c => c.selected).length > 0 ? (
                    <div className="text-sm">
                      <p className="text-green-400">
                        {gridCells.filter(c => c.selected).length} cells selected
                      </p>
                      <p className="text-gray-400 mt-1">
                        Class: <span className="text-white">{selectedClass}</span>
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Click cells to select</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
