import React, { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Camera, Save, Play, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface ClassData {
  id: string;
  name: string;
  samples: tf.Tensor[];
}

const TrainModel = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mobilenetModel, setMobilenetModel] = useState<mobilenet.MobileNet | null>(null);
  const [classifier, setClassifier] = useState<tf.Sequential | null>(null);
  const [classes, setClasses] = useState<ClassData[]>([
    { id: '1', name: 'Class 1', samples: [] },
    { id: '2', name: 'Class 2', samples: [] }
  ]);
  const [isTraining, setIsTraining] = useState(false);
  const [loss, setLoss] = useState<number | null>(null);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number>(0);
  const [isPredicting, setIsPredicting] = useState(false);

  // Load MobileNet
  useEffect(() => {
    const loadModel = async () => {
      try {
        console.log('Loading MobileNet...');
        const model = await mobilenet.load({ version: 2, alpha: 1.0 });
        setMobilenetModel(model);
        toast.success('MobileNet loaded successfully');
      } catch (error) {
        console.error('Error loading MobileNet:', error);
        toast.error('Failed to load MobileNet');
      }
    };
    loadModel();
  }, []);

  // Setup Webcam
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch((err) => console.error('Error accessing webcam:', err));
    }
  }, []);

  const addClass = () => {
    const newId = (classes.length + 1).toString();
    setClasses([...classes, { id: newId, name: `Class ${newId}`, samples: [] }]);
  };

  const removeClass = (id: string) => {
    setClasses(classes.filter(c => c.id !== id));
  };

  const updateClassName = (id: string, name: string) => {
    setClasses(classes.map(c => c.id === id ? { ...c, name } : c));
  };

  const captureSample = (classId: string) => {
    if (!mobilenetModel || !videoRef.current) return;

    const activation = tf.tidy(() => {
      const webcamImage = tf.browser.fromPixels(videoRef.current!);
      // Get intermediate activation from MobileNet (infer returns embeddings if second arg is true)
      // Actually mobilenet.infer is the standard way to get embeddings
      return mobilenetModel.infer(webcamImage, true); 
    });

    setClasses(prev => prev.map(c => {
      if (c.id === classId) {
        return { ...c, samples: [...c.samples, activation] };
      }
      return c;
    }));
  };

  const trainModel = async () => {
    if (classes.some(c => c.samples.length === 0)) {
      toast.error('All classes must have samples');
      return;
    }

    setIsTraining(true);
    setLoss(null);

    // Prepare data
    const xDataset: tf.Tensor[] = [];
    const yDataset: number[] = [];

    classes.forEach((c, index) => {
      c.samples.forEach(sample => {
        xDataset.push(sample);
        yDataset.push(index);
      });
    });

    const xs = tf.concat(xDataset);
    const ys = tf.oneHot(tf.tensor1d(yDataset, 'int32'), classes.length);

    // Create a simple model head
    const model = tf.sequential();
    model.add(tf.layers.dense({
      units: 100,
      activation: 'relu',
      inputShape: [1024] // MobileNet v2 1.0 alpha embedding size
    }));
    model.add(tf.layers.dense({
      units: classes.length,
      activation: 'softmax'
    }));

    model.compile({
      optimizer: tf.train.adam(0.0001),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    try {
      await model.fit(xs, ys, {
        epochs: 20,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            setLoss(logs?.loss || 0);
            console.log(`Epoch ${epoch}: loss = ${logs?.loss}`);
          }
        }
      });
      
      setClassifier(model);
      toast.success('Training complete!');
      
      // Cleanup tensors
      xs.dispose();
      ys.dispose();
    } catch (err) {
      console.error(err);
      toast.error('Training failed');
    } finally {
      setIsTraining(false);
    }
  };

  const togglePrediction = () => {
    setIsPredicting(!isPredicting);
  };

  // Prediction Loop
  useEffect(() => {
    let animationId: number;

    const predictLoop = async () => {
      if (isPredicting && classifier && mobilenetModel && videoRef.current) {
        tf.tidy(() => {
          const webcamImage = tf.browser.fromPixels(videoRef.current!);
          const activation = mobilenetModel.infer(webcamImage, true);
          const result = classifier.predict(activation) as tf.Tensor;
          const predictions = result.dataSync();
          const maxPrediction = Math.max(...predictions);
          const maxIndex = predictions.indexOf(maxPrediction);

          setPrediction(classes[maxIndex].name);
          setConfidence(maxPrediction);
        });
        
        // Small delay to not block UI
        await new Promise(resolve => setTimeout(resolve, 100));
        animationId = requestAnimationFrame(predictLoop);
      }
    };

    if (isPredicting) {
      predictLoop();
    }

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [isPredicting, classifier, mobilenetModel, classes]);

  const saveModel = async () => {
    if (!classifier) return;
    try {
      await classifier.save('localstorage://my-custom-model');
      toast.success('Model saved to LocalStorage');
    } catch (err) {
      toast.error('Failed to save model');
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Train Custom AI Model</h1>
        <div className="space-x-2">
          <Button onClick={saveModel} disabled={!classifier} variant="outline">
            <Save className="mr-2 h-4 w-4" /> Save Model
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Camera & Controls */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Webcam Feed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                {prediction && isPredicting && (
                  <div className="absolute top-4 left-4 bg-black/70 text-white p-2 rounded">
                    <div className="text-xl font-bold">{prediction}</div>
                    <div className="text-sm">Confidence: {(confidence * 100).toFixed(1)}%</div>
                  </div>
                )}
              </div>
              
              <div className="mt-4 flex gap-4">
                <Button 
                  onClick={trainModel} 
                  disabled={isTraining || !mobilenetModel}
                  className="flex-1"
                >
                  {isTraining ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Training...</>
                  ) : (
                    'Train Model'
                  )}
                </Button>
                
                <Button 
                  onClick={togglePrediction} 
                  disabled={!classifier}
                  variant={isPredicting ? "destructive" : "secondary"}
                  className="flex-1"
                >
                  {isPredicting ? 'Stop Predicting' : 'Start Predicting'}
                </Button>
              </div>
              
              {loss !== null && (
                <div className="mt-2 text-sm text-muted-foreground">
                  Last Loss: {loss.toFixed(4)}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Classes */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Training Classes</h2>
            <Button onClick={addClass} size="sm" variant="outline">
              <Plus className="mr-2 h-4 w-4" /> Add Class
            </Button>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
            {classes.map((cls) => (
              <Card key={cls.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="flex-1 space-y-2">
                    <Input
                      value={cls.name}
                      onChange={(e) => updateClassName(cls.id, e.target.value)}
                      placeholder="Class Name"
                    />
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{cls.samples.length} samples</Badge>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="secondary"
                      onMouseDown={() => captureSample(cls.id)}
                      title="Capture Sample"
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeClass(cls.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainModel;
