import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Upload, Image as ImageIcon, Plus, Trash2, Tag, Database, Play, CheckCircle2, XCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { ImageAnnotator } from "@/components/ImageAnnotator";
import { toast } from "sonner";
import * as tf from '@tensorflow/tfjs';
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";

interface ClassInfo {
  id: string;
  name: string;
  count: number;
  isTrained: boolean;
  includeInTraining: boolean;
}

const Training = () => {
  const navigate = useNavigate();
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [model, setModel] = useState<tf.LayersModel | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [currentEpoch, setCurrentEpoch] = useState(0);
  const [totalEpochs, setTotalEpochs] = useState(10);
  const [loss, setLoss] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  const [classes, setClasses] = useState<ClassInfo[]>(() => {
    const saved = localStorage.getItem('training_classes');
    if (saved) {
      return JSON.parse(saved);
    }
    return [
      { id: "1", name: "Motherboard", count: 450, isTrained: true, includeInTraining: true },
      { id: "2", name: "CPU", count: 320, isTrained: true, includeInTraining: true },
      { id: "3", name: "RAM Stick", count: 280, isTrained: true, includeInTraining: true },
      { id: "4", name: "GPU", count: 198, isTrained: false, includeInTraining: true },
      { id: "5", name: "Power Supply", count: 150, isTrained: false, includeInTraining: false },
    ];
  });

  useEffect(() => {
    localStorage.setItem('training_classes', JSON.stringify(classes));
  }, [classes]);

  useEffect(() => {
    loadModel();
  }, []);

  const loadModel = async () => {
    setIsModelLoading(true);
    try {
      // Try to load from IndexedDB first
      const loadedModel = await tf.loadLayersModel('indexeddb://my-model');
      setModel(loadedModel);
      toast.success("Latest model loaded successfully");
    } catch (e) {
      console.log("No saved model found, creating new one...");
      // Create a simple model if none exists
      const newModel = tf.sequential();
      newModel.add(tf.layers.conv2d({
        inputShape: [224, 224, 3],
        filters: 32,
        kernelSize: 3,
        activation: 'relu',
      }));
      newModel.add(tf.layers.maxPooling2d({ poolSize: [2, 2] }));
      newModel.add(tf.layers.flatten());
      newModel.add(tf.layers.dense({ units: 64, activation: 'relu' }));
      newModel.add(tf.layers.dense({ units: classes.length, activation: 'softmax' }));
      
      newModel.compile({
        optimizer: 'adam',
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy'],
      });
      
      setModel(newModel);
    } finally {
      setIsModelLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadedImages(Array.from(e.target.files));
      setIsAnnotating(true);
    }
  };

  const handleSaveDataset = (data: any) => {
    console.log("Saving dataset:", data);
    
    // Update classes based on new annotations
    const newClasses = [...classes];
    data.forEach((item: any) => {
      item.annotations.forEach((ann: any) => {
        const existingClass = newClasses.find(c => c.name === ann.label);
        if (existingClass) {
          existingClass.count++;
          existingClass.isTrained = false; // New data needs training
        } else {
          newClasses.push({
            id: Math.random().toString(36).substr(2, 9),
            name: ann.label,
            count: 1,
            isTrained: false,
            includeInTraining: true
          });
        }
      });
    });
    setClasses(newClasses);

    toast.success("Dataset updated successfully!");
    setIsAnnotating(false);
    setUploadedImages([]);
  };

  const toggleClassTraining = (id: string) => {
    setClasses(classes.map(c => 
      c.id === id ? { ...c, includeInTraining: !c.includeInTraining } : c
    ));
  };

  const startTraining = async () => {
    if (!model) return;
    
    const activeClasses = classes.filter(c => c.includeInTraining);
    if (activeClasses.length === 0) {
      toast.error("Please select at least one class to train");
      return;
    }

    setIsTraining(true);
    setTrainingProgress(0);
    setCurrentEpoch(0);
    setLoss(null);
    setAccuracy(null);

    try {
      // Simulate training process since we don't have the actual image tensors loaded in memory here
      // In a real app, you would load the dataset tensors here
      
      const totalSteps = totalEpochs * 10; // 10 batches per epoch
      
      for (let epoch = 1; epoch <= totalEpochs; epoch++) {
        setCurrentEpoch(epoch);
        
        // Simulate batches
        for (let batch = 0; batch < 10; batch++) {
          await new Promise(resolve => setTimeout(resolve, 200)); // Simulate computation
          const progress = ((epoch - 1) * 10 + batch + 1) / totalSteps * 100;
          setTrainingProgress(progress);
        }

        // Simulate metrics update
        setLoss(Math.max(0.1, 2.0 - (epoch * 0.15) + (Math.random() * 0.1)));
        setAccuracy(Math.min(0.99, 0.4 + (epoch * 0.05) + (Math.random() * 0.05)));
      }

      // Save the "trained" model
      await model.save('indexeddb://my-model');
      
      // Update class status
      setClasses(classes.map(c => ({
        ...c,
        isTrained: c.includeInTraining // Only included classes are now considered "Trained" in this model version
      })));

      toast.success("Training completed and model saved!");
    } catch (error) {
      console.error("Training error:", error);
      toast.error("Training failed");
    } finally {
      setIsTraining(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-4 pl-0 hover:pl-2 transition-all">
          ← Back to Dashboard
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
              <Brain className="w-10 h-10 text-primary" />
              AI Training Center
            </h1>
            <p className="text-muted-foreground text-lg">
              Manage dataset, label images, and train your model
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg shadow-sm">
              {isModelLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              ) : (
                <div className="w-3 h-3 rounded-full bg-success animate-pulse" />
              )}
              <span className="font-medium text-sm">
                {isModelLoading ? "Loading Model..." : "Model Ready (v1.0.2)"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {isAnnotating ? (
        <ImageAnnotator 
          images={uploadedImages}
          onSave={handleSaveDataset}
          onCancel={() => {
            setIsAnnotating(false);
            setUploadedImages([]);
          }}
        />
      ) : (
        <>
          {/* Training Status Overlay */}
          {isTraining && (
            <Card className="mb-8 border-primary/50 bg-primary/5">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <div>
                      <h3 className="font-semibold text-lg">Training in Progress...</h3>
                      <p className="text-sm text-muted-foreground">Epoch {currentEpoch}/{totalEpochs}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">Accuracy: {accuracy ? (accuracy * 100).toFixed(1) : "--"}%</p>
                    <p className="text-sm text-muted-foreground">Loss: {loss ? loss.toFixed(4) : "--"}</p>
                  </div>
                </div>
                <Progress value={trainingProgress} className="h-2 mb-2" />
                <p className="text-xs text-muted-foreground text-right">{Math.round(trainingProgress)}%</p>
              </CardContent>
            </Card>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <ImageIcon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Images</p>
                  <p className="text-2xl font-bold">
                    {classes.reduce((acc, curr) => acc + curr.count, 0)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-secondary/10 rounded-lg">
                  <Tag className="w-6 h-6 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Classes</p>
                  <p className="text-2xl font-bold">{classes.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-success/10 rounded-lg">
                  <Database className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Trained Classes</p>
                  <p className="text-2xl font-bold">
                    {classes.filter(c => c.isTrained).length}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 bg-warning/10 rounded-lg">
                  <Play className="w-6 h-6 text-warning-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Training Status</p>
                  <p className="text-2xl font-bold">{isTraining ? "Running" : "Idle"}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Upload Section */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Upload New Samples</CardTitle>
                <CardDescription>Select multiple images from a folder to start labeling</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-border rounded-xl p-12 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors relative">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleFileSelect}
                  />
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 pointer-events-none">
                    <Upload className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 pointer-events-none">Drop images here or click to browse</h3>
                  <p className="text-muted-foreground mb-6 pointer-events-none">Support for JPG, PNG, WEBP</p>
                  <Button className="pointer-events-none">Select Files</Button>
                </div>
              </CardContent>
            </Card>

            {/* Classes Section */}
            <Card className="flex flex-col h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle>Classes Panel</CardTitle>
                <Button size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Class
                </Button>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-4">
                <div className="space-y-3 flex-1 overflow-auto max-h-[400px] pr-2">
                  {classes.map((cls) => (
                    <div key={cls.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${cls.isTrained ? 'bg-success' : 'bg-warning'}`} />
                        <div>
                          <p className="font-medium text-sm">{cls.name}</p>
                          <p className="text-xs text-muted-foreground">{cls.count} samples</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={cls.isTrained ? "default" : "secondary"} className="text-[10px]">
                          {cls.isTrained ? "Trained" : "New"}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => toggleClassTraining(cls.id)}
                          title={cls.includeInTraining ? "Exclude from training" : "Include in training"}
                        >
                          {cls.includeInTraining ? (
                            <Eye className="w-4 h-4 text-primary" />
                          ) : (
                            <EyeOff className="w-4 h-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-border mt-auto">
                  <Button 
                    className="w-full" 
                    size="lg" 
                    onClick={startTraining}
                    disabled={isTraining || classes.filter(c => c.includeInTraining).length === 0}
                  >
                    {isTraining ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Training...
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4 mr-2" />
                        Train Model
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    {classes.filter(c => c.includeInTraining).length} classes selected for training
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default Training;
