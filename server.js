import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

import { appendLog, readLogs } from './src/server/logService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// Python interpreter path (project venv)
const PYTHON_PATH = path.join(__dirname, 'venv/bin/python3');
const TRAIN_SCRIPT = path.join(__dirname, 'yolo_workflow', 'scripts', 'train_model.py');
const GESTURE_TRAIN_SCRIPT = path.join(__dirname, 'gesture_workflow', 'scripts', 'dtw_gesture.py');

// Track active training processes
let activeTrainingProcess = null;
let activeGestureTrainingProcess = null;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Configure Multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Ensure directories exist
const YOLO_WORKFLOW_DIR = path.join(__dirname, 'yolo_workflow');
const CLASSES_FILE = path.join(YOLO_WORKFLOW_DIR, 'classes.txt');
const TRAINED_CLASSES_FILE = path.join(YOLO_WORKFLOW_DIR, 'trained_classes.txt');
const RAW_DATA_DIR = path.join(YOLO_WORKFLOW_DIR, 'raw_data');
const TRAINED_MODEL_PATH = path.join(YOLO_WORKFLOW_DIR, 'runs', 'custom_model', 'weights', 'best.pt');

// Gesture workflow directories
const GESTURE_WORKFLOW_DIR = path.join(__dirname, 'gesture_workflow');
const GESTURES_DIR = path.join(GESTURE_WORKFLOW_DIR, 'gestures');
const GESTURE_CLASSES_FILE = path.join(GESTURE_WORKFLOW_DIR, 'classes.json');

// Ensure gesture directories exist
if (!fs.existsSync(GESTURES_DIR)) {
    fs.mkdirSync(GESTURES_DIR, { recursive: true });
}

if (!fs.existsSync(RAW_DATA_DIR)) {
    fs.mkdirSync(RAW_DATA_DIR, { recursive: true });
}

// --- Log Service Endpoints ---

app.post('/api/logs', async (req, res) => {
    try {
        const success = await appendLog(req.body);
        if (success) {
            res.status(201).json({ message: 'Log entry created' });
        } else {
            res.status(500).json({ error: 'Failed to write log entry' });
        }
    } catch (error) {
        console.error('API Error appending log:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/logs', async (req, res) => {
    try {
        const { component, user, startDate, endDate, limit, offset } = req.query;
        const result = await readLogs({
            component: component,
            user: user,
            startDate: startDate,
            endDate: endDate,
            limit: limit ? parseInt(limit) : 50,
            offset: offset ? parseInt(offset) : 0
        });
        res.json(result);
    } catch (error) {
        console.error('API Error reading logs:', error);
        res.status(500).json({ error: error.message });
    }
});

// New endpoint to get training logs
app.get('/api/train/logs', (req, res) => {
    try {
        const logs = fs.readFileSync(TRAINING_LOG_FILE, 'utf-8');
        res.json({ logs });
    } catch (err) {
        console.error('Error reading training log file:', err);
        res.status(500).json({ error: 'Failed to read logs' });
    }
});

// New endpoint to provide parsed loss metrics for the graph
app.get('/api/train/metrics', (req, res) => {
    try {
        const logContent = fs.readFileSync(TRAINING_LOG_FILE, 'utf-8');
        const lines = logContent.split('\n');
        const metrics = [];
        const progressPrefix = '[PROGRESS]';
        let isTrainingComplete = false;
        for (const line of lines) {
            if (line.includes('[TRAINING_COMPLETE]')) {
                isTrainingComplete = true;
            }
            if (line.includes(progressPrefix)) {
                try {
                    const jsonStr = line.split(progressPrefix)[1];
                    const data = JSON.parse(jsonStr);

                    if (data.type === 'epoch_end') {
                        metrics.push({
                            epoch: data.epoch,
                            totalEpochs: data.total_epochs,
                            loss: data.total_loss,
                            box_loss: data.box_loss,
                            cls_loss: data.cls_loss,
                            dfl_loss: data.dfl_loss,
                            mAP50: 0,
                            mAP50_95: 0
                        });
                    } else if (data.type === 'validation' && metrics.length > 0) {
                        const lastMetric = metrics[metrics.length - 1];
                        lastMetric.mAP50 = data.mAP50;
                        lastMetric.mAP50_95 = data.mAP50_95;
                    }
                } catch (e) {
                    console.error('Error parsing log line:', e);
                }
            }
        }
        res.json({ metrics, isTrainingComplete });
    } catch (err) {
        console.error('Error parsing training metrics:', err);
        res.status(500).json({ error: 'Failed to parse metrics' });
    }
});

// Serve training results static files
app.use('/api/training-results', express.static(path.join(__dirname, 'yolo_workflow/runs/custom_model')));

app.get('/api/train/summary', (req, res) => {
    try {
        const resultsPath = path.join(__dirname, 'yolo_workflow/runs/custom_model/results.csv');
        if (!fs.existsSync(resultsPath)) {
            return res.status(404).json({ error: 'Results not found' });
        }

        const content = fs.readFileSync(resultsPath, 'utf-8');
        const lines = content.trim().split('\n');

        if (lines.length < 2) {
            return res.status(400).json({ error: 'No data in results file' });
        }

        // Parse header to find column indices
        const headers = lines[0].split(',').map(h => h.trim());
        const lastLine = lines[lines.length - 1].split(',').map(v => v.trim());

        // Helper to get value by partial header match
        const getValue = (search) => {
            const index = headers.findIndex(h => h.includes(search));
            return index !== -1 ? parseFloat(lastLine[index]) : 0;
        };

        const summary = {
            precision: getValue('metrics/precision(B)'),
            recall: getValue('metrics/recall(B)'),
            mAP50: getValue('metrics/mAP50(B)'),
            mAP50_95: getValue('metrics/mAP50-95(B)'),
            box_loss: getValue('train/box_loss'),
            cls_loss: getValue('train/cls_loss'),
            dfl_loss: getValue('train/dfl_loss'),
            epoch: parseInt(lastLine[0])
        };

        res.json(summary);
    } catch (err) {
        console.error('Error fetching training summary:', err);
        res.status(500).json({ error: 'Failed to fetch summary' });
    }
});

// --- End Log Service Endpoints ---

app.post('/api/save-dataset', upload.single('dataset'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    console.log(`Received file: ${req.file.originalname}`);

    try {
        const zip = new AdmZip(req.file.path);
        const batchName = `batch_${Date.now()}`;
        const batchDir = path.join(RAW_DATA_DIR, batchName);

        fs.mkdirSync(batchDir, { recursive: true });

        // Extract everything
        zip.extractAllTo(batchDir, true);

        // Process extracted files to match YOLO structure
        // The zip contains dataset/images and dataset/labels
        // We want to move them to batchDir/images and batchDir/labels

        const extractedRoot = path.join(batchDir, 'dataset');
        if (fs.existsSync(extractedRoot)) {
            // Move contents up
            const items = fs.readdirSync(extractedRoot);
            items.forEach(item => {
                const src = path.join(extractedRoot, item);
                const dest = path.join(batchDir, item);
                fs.renameSync(src, dest);
            });
            fs.rmdirSync(extractedRoot);
        }

        // Update classes.txt and rewrite labels with IDs
        updateClassesAndLabels(batchDir);

        // Cleanup uploaded zip
        try {
            fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
            console.warn('Warning: Could not delete uploaded file:', cleanupError);
        }

        // Extract unique labels from the new annotations
        const newLabels = new Set();
        const annotationsFile = path.join(batchDir, 'dataset', 'annotations.json');

        if (fs.existsSync(annotationsFile)) {
            try {
                const datasetData = JSON.parse(fs.readFileSync(annotationsFile, 'utf-8'));
                datasetData.forEach(item => {
                    if (item.annotations) {
                        item.annotations.forEach(ann => {
                            if (ann.label) newLabels.add(ann.label);
                        });
                    }
                });
            } catch (e) {
                console.error("Error reading annotations.json:", e);
            }
        }

        // Update trained_classes.txt: Remove classes that have new data
        if (newLabels.size > 0 && fs.existsSync(TRAINED_CLASSES_FILE)) {
            const trainedClasses = fs.readFileSync(TRAINED_CLASSES_FILE, 'utf-8')
                .split('\n')
                .map(c => c.trim())
                .filter(c => c);

            const updatedTrainedClasses = trainedClasses.filter(c => !newLabels.has(c));

            if (updatedTrainedClasses.length !== trainedClasses.length) {
                fs.writeFileSync(TRAINED_CLASSES_FILE, updatedTrainedClasses.join('\n'));
                console.log(`[API] Updated trained classes. Removed: ${[...newLabels].filter(l => trainedClasses.includes(l)).join(', ')}`);
            }
        }

        res.json({ message: 'Dataset saved and processed successfully', batch: batchName });
    } catch (error) {
        console.error('Error processing zip:', error);
        res.status(500).json({ error: 'Failed to process dataset' });
    }
});

function updateClassesAndLabels(batchDir) {
    let classes = [];
    if (fs.existsSync(CLASSES_FILE)) {
        classes = fs.readFileSync(CLASSES_FILE, 'utf-8')
            .split('\n')
            .map(c => c.trim())
            .filter(c => c);
    }

    const labelsDir = path.join(batchDir, 'labels');
    if (fs.existsSync(labelsDir)) {
        const files = fs.readdirSync(labelsDir);

        files.forEach(file => {
            if (!file.endsWith('.txt')) return;

            const filePath = path.join(labelsDir, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.split('\n');
            const newLines = [];

            lines.forEach(line => {
                if (!line.trim()) return;

                const parts = line.trim().split(' ');
                const labelName = parts[0]; // Currently string
                const coords = parts.slice(1).join(' ');

                // Find or add class
                let classIdx = classes.findIndex(c => c.toLowerCase() === labelName.toLowerCase());
                if (classIdx === -1) {
                    classes.push(labelName);
                    classIdx = classes.length - 1;
                    console.log(`New class added: ${labelName}`);
                }

                newLines.push(`${classIdx} ${coords}`);
            });

            // Rewrite file with IDs
            fs.writeFileSync(filePath, newLines.join('\n'));
        });
    }

    // Save updated classes
    fs.writeFileSync(CLASSES_FILE, classes.join('\n'));
}

app.get('/api/classes', (req, res) => {
    try {
        if (fs.existsSync(CLASSES_FILE)) {
            const classNames = fs.readFileSync(CLASSES_FILE, 'utf-8')
                .split('\n')
                .map(c => c.trim())
                .filter(c => c);

            // Initialize counts
            const counts = new Array(classNames.length).fill(0);

            // Scan raw_data for counts
            if (fs.existsSync(RAW_DATA_DIR)) {
                const batches = fs.readdirSync(RAW_DATA_DIR);
                batches.forEach(batch => {
                    const labelsDir = path.join(RAW_DATA_DIR, batch, 'labels');
                    if (fs.existsSync(labelsDir)) {
                        const files = fs.readdirSync(labelsDir);
                        files.forEach(file => {
                            if (!file.endsWith('.txt')) return;
                            const content = fs.readFileSync(path.join(labelsDir, file), 'utf-8');
                            const lines = content.split('\n');
                            lines.forEach(line => {
                                if (!line.trim()) return;
                                const classId = parseInt(line.trim().split(' ')[0]);
                                if (!isNaN(classId) && classId < counts.length) {
                                    counts[classId]++;
                                }
                            });
                        });
                    }
                });
            }

            // Check which classes are actually trained
            let trainedClasses = [];
            if (fs.existsSync(TRAINED_MODEL_PATH) && fs.existsSync(TRAINED_CLASSES_FILE)) {
                trainedClasses = fs.readFileSync(TRAINED_CLASSES_FILE, 'utf-8')
                    .split('\n')
                    .map(c => c.trim())
                    .filter(c => c);
            }

            const classesWithStats = classNames.map((name, index) => ({
                id: index.toString(),
                name,
                count: counts[index],
                isTrained: trainedClasses.includes(name)
            }));

            res.json(classesWithStats);
        } else {
            res.json([]);
        }
    } catch (error) {
        console.error('Error fetching classes:', error);
        res.status(500).send('Error fetching classes');
    }
});

// Save single annotation from Annotate page
app.post('/api/yolo/save-annotation', (req, res) => {
    try {
        const { image, annotations } = req.body;

        if (!image || !annotations || annotations.length === 0) {
            return res.status(400).json({ error: 'Image and annotations required' });
        }

        // Create a new batch folder for this annotation
        const timestamp = Date.now();
        const batchName = `annotate_${timestamp}`;
        const batchDir = path.join(RAW_DATA_DIR, batchName);
        const imagesDir = path.join(batchDir, 'images');
        const labelsDir = path.join(batchDir, 'labels');

        fs.mkdirSync(imagesDir, { recursive: true });
        fs.mkdirSync(labelsDir, { recursive: true });

        // Save image
        const imageName = `capture_${timestamp}.jpg`;
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        fs.writeFileSync(path.join(imagesDir, imageName), base64Data, 'base64');

        // Save label in YOLO format
        const labelName = `capture_${timestamp}.txt`;
        const labelContent = annotations.map(ann => {
            // YOLO format: class_id center_x center_y width height (all normalized 0-1)
            return `${ann.classId} ${ann.x.toFixed(6)} ${ann.y.toFixed(6)} ${ann.width.toFixed(6)} ${ann.height.toFixed(6)}`;
        }).join('\n');

        fs.writeFileSync(path.join(labelsDir, labelName), labelContent);

        console.log(`[Annotate] Saved: ${imageName} with ${annotations.length} annotation(s)`);

        res.json({
            success: true,
            message: `Saved to ${batchName}`,
            imagePath: path.join(imagesDir, imageName),
            labelPath: path.join(labelsDir, labelName)
        });
    } catch (error) {
        console.error('[Annotate] Error saving:', error);
        res.status(500).json({ error: error.message });
    }
});

// Log file path
const TRAINING_LOG_FILE = path.join(__dirname, 'training.log');

app.post('/api/train', (req, res) => {
    console.log('Starting training process...');

    // Reset log file
    fs.writeFileSync(TRAINING_LOG_FILE, '');

    console.log(`[API] Starting training...`);
    console.log(`[API] Python Path: ${PYTHON_PATH}`);
    console.log(`[API] Script Path: ${TRAIN_SCRIPT}`);

    const pythonProcess = spawn(PYTHON_PATH, [TRAIN_SCRIPT]);
    activeTrainingProcess = pythonProcess;

    // Stream output to log file
    const logStream = fs.createWriteStream(TRAINING_LOG_FILE, { flags: 'a' });

    pythonProcess.stdout.pipe(logStream);
    pythonProcess.stderr.pipe(logStream);

    // Concise logging to server console
    pythonProcess.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
            if (line.includes('[PROGRESS]')) {
                try {
                    const jsonStr = line.split('[PROGRESS]')[1];
                    const metrics = JSON.parse(jsonStr);

                    if (metrics.type === 'epoch_end') {
                        console.log(`[Training] Epoch ${metrics.epoch}/${metrics.total_epochs} - Loss: ${metrics.total_loss.toFixed(4)}`);
                    } else if (metrics.type === 'validation') {
                        console.log(`[Training] Validation - mAP50: ${(metrics.mAP50 * 100).toFixed(1)}%, mAP50-95: ${(metrics.mAP50_95 * 100).toFixed(1)}%`);
                    }
                } catch (e) {
                    // Ignore parsing errors for partial lines
                }
            }
        }
    });

    pythonProcess.on('error', (err) => {
        console.error('[API] Failed to start subprocess:', err);
        fs.appendFileSync(TRAINING_LOG_FILE, `\n[TRAINING_FAILED] Spawn Error: ${err.message}\n`);
    });

    pythonProcess.on('close', (code) => {
        activeTrainingProcess = null;
        console.log(`Training process exited with code ${code}`);
        if (code === 0) {
            fs.appendFileSync(TRAINING_LOG_FILE, '\n[TRAINING_COMPLETE]\n');
        } else {
            fs.appendFileSync(TRAINING_LOG_FILE, `\n[TRAINING_FAILED] Code: ${code}\n`);
        }
    });

    // Return immediately
    res.json({ message: 'Training started', logFile: TRAINING_LOG_FILE });
});

app.get('/api/train/logs', (req, res) => {
    if (!fs.existsSync(TRAINING_LOG_FILE)) {
        return res.json({ logs: '' });
    }
    const logs = fs.readFileSync(TRAINING_LOG_FILE, 'utf8');
    res.json({ logs });
});


app.post('/api/train/cancel', (req, res) => {
    if (activeTrainingProcess) {
        console.log('Cancelling training process...');
        activeTrainingProcess.kill();
        activeTrainingProcess = null;
        res.json({ message: 'Training cancelled' });
    } else {
        res.status(400).json({ message: 'No active training process' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

// Serve model weights statically
app.use('/models', express.static(path.join(__dirname, 'yolo_workflow', 'runs', 'custom_model', 'weights')));

// Detection endpoint - accepts base64 image, returns detections
app.post('/api/detect', express.json({ limit: '10mb' }), async (req, res) => {
    const { image } = req.body; // base64 encoded image

    if (!image) {
        return res.status(400).json({ error: 'No image provided' });
    }

    try {
        // Save temp image
        const tempPath = path.join(__dirname, 'uploads', `detect_${Date.now()}.jpg`);
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        fs.writeFileSync(tempPath, base64Data, 'base64');

        // Run detection script
        const detectScript = path.join(__dirname, 'yolo_workflow', 'scripts', 'detect.py');

        const result = await new Promise((resolve, reject) => {
            const proc = spawn(PYTHON_PATH, [detectScript, tempPath]);
            let output = '';
            let error = '';

            proc.stdout.on('data', (data) => {
                output += data.toString();
            });

            proc.stderr.on('data', (data) => {
                error += data.toString();
            });

            proc.on('close', (code) => {
                // Clean up temp file
                try { fs.unlinkSync(tempPath); } catch (e) { }

                if (code === 0) {
                    try {
                        // Try to parse just the last line (in case of warnings)
                        const lines = output.trim().split('\n');
                        const jsonLine = lines[lines.length - 1];
                        resolve(JSON.parse(jsonLine));
                    } catch (e) {
                        console.error('Parse error. Raw output:', output);
                        console.error('Stderr:', error);
                        reject(new Error('Failed to parse detection output: ' + output.substring(0, 200)));
                    }
                } else {
                    reject(new Error(error || 'Detection failed'));
                }
            });
        });

        res.json(result);
    } catch (error) {
        console.error('Detection error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ================== GESTURE API ENDPOINTS ==================

// Helper to load gesture classes
function loadGestureClasses() {
    if (fs.existsSync(GESTURE_CLASSES_FILE)) {
        return JSON.parse(fs.readFileSync(GESTURE_CLASSES_FILE, 'utf-8'));
    }
    return { classes: [], version: "1.0", created_at: null, updated_at: null };
}

// Helper to save gesture classes
function saveGestureClasses(data) {
    data.updated_at = new Date().toISOString();
    fs.writeFileSync(GESTURE_CLASSES_FILE, JSON.stringify(data, null, 2));
}

// Get all gesture classes with sequence counts
app.get('/api/gestures/classes', (req, res) => {
    try {
        const classData = loadGestureClasses();

        // Count sequences per class
        const classesWithCounts = classData.classes.map(cls => {
            const classDir = path.join(GESTURES_DIR, cls.name);
            let sequenceCount = 0;
            let totalFrames = 0;

            if (fs.existsSync(classDir)) {
                const files = fs.readdirSync(classDir).filter(f => f.endsWith('.json'));
                sequenceCount = files.length;

                // Count total frames across all sequences
                files.forEach(file => {
                    try {
                        const seq = JSON.parse(fs.readFileSync(path.join(classDir, file), 'utf-8'));
                        totalFrames += seq.frames?.length || 0;
                    } catch (e) { }
                });
            }

            return {
                ...cls,
                sequenceCount,
                totalFrames
            };
        });

        res.json(classesWithCounts);
    } catch (error) {
        console.error('Error fetching gesture classes:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add new gesture class
app.post('/api/gestures/classes', (req, res) => {
    try {
        const { name, duration } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Class name required' });
        }

        const classData = loadGestureClasses();

        // Check for duplicate
        const safeName = name.toLowerCase().replace(/\s+/g, '_');
        if (classData.classes.some(c => c.name === safeName)) {
            return res.status(400).json({ error: 'Class already exists' });
        }

        // Create class directory
        const classDir = path.join(GESTURES_DIR, safeName);
        if (!fs.existsSync(classDir)) {
            fs.mkdirSync(classDir, { recursive: true });
        }

        // Add to classes
        const newClass = {
            id: `gesture_${Date.now()}`,
            name: safeName,
            displayName: name,
            duration: duration || 2, // Default 2 seconds
            createdAt: new Date().toISOString()
        };

        classData.classes.push(newClass);
        if (!classData.created_at) classData.created_at = new Date().toISOString();
        saveGestureClasses(classData);

        res.json(newClass);
    } catch (error) {
        console.error('Error creating gesture class:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete gesture class
app.delete('/api/gestures/classes/:className', (req, res) => {
    try {
        const { className } = req.params;
        const classData = loadGestureClasses();

        // Remove from classes list
        classData.classes = classData.classes.filter(c => c.name !== className);
        saveGestureClasses(classData);

        // Optionally delete data directory (keeping for safety, just removing from training)
        // const classDir = path.join(GESTURES_DIR, className);
        // if (fs.existsSync(classDir)) { fs.rmSync(classDir, { recursive: true }); }

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting gesture class:', error);
        res.status(500).json({ error: error.message });
    }
});

// Save a gesture sequence
app.post('/api/gestures/sequences', (req, res) => {
    try {
        const { className, frames, metadata } = req.body;

        if (!className || !frames || !Array.isArray(frames)) {
            return res.status(400).json({ error: 'className and frames array required' });
        }

        const classData = loadGestureClasses();
        const safeName = className.toLowerCase().replace(/\s+/g, '_');

        // Ensure class exists
        if (!classData.classes.some(c => c.name === safeName)) {
            return res.status(400).json({ error: 'Class does not exist' });
        }

        // Create class directory if needed
        const classDir = path.join(GESTURES_DIR, safeName);
        if (!fs.existsSync(classDir)) {
            fs.mkdirSync(classDir, { recursive: true });
        }

        // Generate sequence ID
        const existingFiles = fs.readdirSync(classDir).filter(f => f.endsWith('.json'));
        const sequenceNum = existingFiles.length + 1;
        const sequenceId = `sequence_${String(sequenceNum).padStart(3, '0')}`;

        // Create sequence data
        const sequenceData = {
            class: safeName,
            sequence_id: sequenceId,
            recorded_at: new Date().toISOString(),
            frames: frames, // Array of { timestamp, left_hand, right_hand }
            metadata: {
                fps: metadata?.fps || 30,
                duration_ms: metadata?.duration_ms || (frames.length * 33),
                frame_count: frames.length,
                ...metadata
            }
        };

        // Save sequence
        const filePath = path.join(classDir, `${sequenceId}.json`);
        console.log(`[API] Saving gesture sequence for class '${safeName}'...`);
        fs.writeFileSync(filePath, JSON.stringify(sequenceData, null, 2));
        console.log(`[API] Sequence saved to: ${filePath}`);
        console.log(`[API] Sequence ID: ${sequenceId}, Frames: ${frames.length}`);

        console.log(`Saved gesture sequence: ${safeName}/${sequenceId} (${frames.length} frames)`);

        res.json({
            success: true,
            sequenceId,
            className: safeName,
            frameCount: frames.length
        });
    } catch (error) {
        console.error('Error saving gesture sequence:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get sequences for a class
app.get('/api/gestures/sequences/:className', (req, res) => {
    try {
        const { className } = req.params;
        const classDir = path.join(GESTURES_DIR, className);

        if (!fs.existsSync(classDir)) {
            return res.json([]);
        }

        const files = fs.readdirSync(classDir).filter(f => f.endsWith('.json'));
        const sequences = files.map(file => {
            const data = JSON.parse(fs.readFileSync(path.join(classDir, file), 'utf-8'));
            return {
                sequence_id: data.sequence_id,
                recorded_at: data.recorded_at,
                frame_count: data.frames?.length || 0,
                duration_ms: data.metadata?.duration_ms || 0
            };
        });

        res.json(sequences);
    } catch (error) {
        console.error('Error fetching sequences:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete a sequence
app.delete('/api/gestures/sequences/:className/:sequenceId', (req, res) => {
    try {
        const { className, sequenceId } = req.params;
        const filePath = path.join(GESTURES_DIR, className, `${sequenceId}.json`);

        if (fs.existsSync(filePath)) {
            console.log(`[API] Deleting sequence file: ${filePath}`);
            fs.unlinkSync(filePath);
            console.log(`[API] Sequence ${sequenceId} deleted successfully`);

            // Update model_info.json to mark class as untrained
            const modelInfoPath = path.join(__dirname, 'gesture_workflow', 'models', 'model_info.json');
            if (fs.existsSync(modelInfoPath)) {
                try {
                    const modelInfo = JSON.parse(fs.readFileSync(modelInfoPath, 'utf-8'));
                    if (modelInfo.trained_classes && modelInfo.trained_classes.includes(className)) {
                        console.log(`[API] Marking class '${className}' as untrained due to data change`);
                        modelInfo.trained_classes = modelInfo.trained_classes.filter(c => c !== className);
                        fs.writeFileSync(modelInfoPath, JSON.stringify(modelInfo, null, 2));
                    }
                } catch (e) {
                    console.error("Error updating model_info.json:", e);
                }
            }
        } else {
            console.log(`[API] Sequence file not found: ${filePath}`);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting sequence:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete entire gesture class
app.delete('/api/gestures/classes/:className', (req, res) => {
    try {
        const { className } = req.params;
        const classDir = path.join(GESTURES_DIR, className);

        console.log(`[API] Request to delete gesture class: ${className}`);
        console.log(`[API] Target directory: ${classDir}`);

        // 1. Kill inference process first to release any potential locks
        if (gestureInferenceProcess) {
            console.log('[API] Killing inference process before deletion...');
            gestureInferenceProcess.kill();
            gestureInferenceProcess = null;
        }

        // 2. Delete all sequence files and directory recursively
        if (fs.existsSync(classDir)) {
            // Use rmSync with recursive: true for robust deletion
            fs.rmSync(classDir, { recursive: true, force: true });
            console.log(`[API] Deleted directory: ${classDir}`);
        } else {
            console.log(`[API] Directory not found (already deleted?): ${classDir}`);
        }

        // 3. Verify deletion
        if (fs.existsSync(classDir)) {
            throw new Error(`Failed to delete directory: ${classDir}`);
        }

        // 4. Remove from classes.json
        const classData = loadGestureClasses();
        const initialLength = classData.classes.length;
        classData.classes = classData.classes.filter(c => c.name !== className);

        if (classData.classes.length === initialLength) {
            console.log(`[API] Warning: Class ${className} was not found in classes.json`);
        }

        saveGestureClasses(classData);

        // 5. Delete the trained model file to force a rebuild
        const gestureModelPath = path.join(__dirname, 'gesture_workflow', 'models', 'gesture_model.pkl');
        const modelInfoPath = path.join(__dirname, 'gesture_workflow', 'models', 'model_info.json');

        if (fs.existsSync(gestureModelPath)) {
            fs.unlinkSync(gestureModelPath);
            console.log(`[API] Deleted model file to force rebuild: ${gestureModelPath}`);
        }

        if (fs.existsSync(modelInfoPath)) {
            fs.unlinkSync(modelInfoPath);
            console.log(`[API] Deleted model info file: ${modelInfoPath}`);
        }

        // 6. Restart inference process
        console.log(`[API] Reloading inference process...`);
        startGestureProcess();

        res.json({ success: true, message: `Deleted gesture class "${className}" and reset model.` });
    } catch (error) {
        console.error('Error deleting gesture class:', error);
        // Try to restart process even if delete failed, to ensure system isn't broken
        startGestureProcess();
        res.status(500).json({ error: error.message });
    }
});

// Train gesture model
app.post('/api/gestures/train', (req, res) => {
    console.log('Starting gesture model training...');

    // Reset log file
    fs.writeFileSync(TRAINING_LOG_FILE, '');

    console.log(`[API] Starting gesture training...`);
    console.log(`[API] Python Path: ${PYTHON_PATH}`);
    console.log(`[API] Script Path: ${GESTURE_TRAIN_SCRIPT}`);

    const pythonProcess = spawn(PYTHON_PATH, [GESTURE_TRAIN_SCRIPT, '--train']);
    activeGestureTrainingProcess = pythonProcess;

    // Stream output to log file
    const logStream = fs.createWriteStream(TRAINING_LOG_FILE, { flags: 'a' });

    pythonProcess.stdout.pipe(logStream);
    pythonProcess.stderr.pipe(logStream);

    pythonProcess.on('error', (err) => {
        console.error('[API] Failed to start gesture subprocess:', err);
        fs.appendFileSync(TRAINING_LOG_FILE, `\n[TRAINING_FAILED] Spawn Error: ${err.message}\n`);
    });

    pythonProcess.on('close', (code) => {
        activeGestureTrainingProcess = null;
        console.log(`Gesture training process exited with code ${code}`);
        if (code === 0) {
            fs.appendFileSync(TRAINING_LOG_FILE, '\n[TRAINING_COMPLETE]\n');
            // Reload gesture inference process with new model
            console.log('[Gesture] Reloading inference process after training...');
            startGestureProcess();
        } else {
            fs.appendFileSync(TRAINING_LOG_FILE, `\n[TRAINING_FAILED] Code: ${code}\n`);
        }
    });

    // Return immediately
    res.json({ message: 'Gesture training started', logFile: TRAINING_LOG_FILE });
});

app.post('/api/gestures/train/cancel', (req, res) => {
    if (activeGestureTrainingProcess) {
        console.log('Cancelling gesture training process...');
        activeGestureTrainingProcess.kill();
        activeGestureTrainingProcess = null;
        res.json({ message: 'Gesture training cancelled' });
    } else {
        res.status(400).json({ message: 'No active gesture training process' });
    }
});

// Get gesture model info
app.get('/api/gestures/model', (req, res) => {
    try {
        const modelPath = path.join(GESTURE_WORKFLOW_DIR, 'models', 'gesture_model.pkl');
        const modelInfoPath = path.join(GESTURE_WORKFLOW_DIR, 'models', 'model_info.json');

        if (!fs.existsSync(modelPath)) {
            return res.json({ exists: false });
        }

        let modelInfo = { exists: true };
        if (fs.existsSync(modelInfoPath)) {
            modelInfo = {
                ...modelInfo,
                ...JSON.parse(fs.readFileSync(modelInfoPath, 'utf-8'))
            };
        }

        res.json(modelInfo);
    } catch (error) {
        console.error('Error fetching model info:', error);
        res.status(500).json({ error: error.message });
    }
});

// Gesture inference endpoint with persistent process
const GESTURE_INFERENCE_SCRIPT = path.join(__dirname, 'gesture_workflow', 'scripts', 'dtw_gesture.py');

// Persistent gesture inference process
let gestureInferenceProcess = null;
let gestureProcessReady = false;
let gestureProcessClasses = [];
let pendingClassifications = [];

function startGestureProcess() {
    if (gestureInferenceProcess) {
        gestureInferenceProcess.kill();
    }

    gestureProcessReady = false;
    gestureProcessClasses = [];

    gestureInferenceProcess = spawn(PYTHON_PATH, [GESTURE_INFERENCE_SCRIPT, '--stream']);

    let buffer = '';

    gestureInferenceProcess.stdout.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line in buffer

        for (const line of lines) {
            if (!line.trim()) continue;
            try {
                const parsed = JSON.parse(line);
                if (parsed.status === 'loaded') {
                    gestureProcessReady = true;
                    gestureProcessClasses = parsed.classes || [];
                    console.log('[Gesture] Process ready with classes:', gestureProcessClasses);
                } else if (parsed.predicted_class !== undefined) {
                    // Classification result - resolve pending promise
                    if (pendingClassifications.length > 0) {
                        const { resolve } = pendingClassifications.shift();
                        resolve(parsed);
                    }
                } else if (parsed.error) {
                    if (pendingClassifications.length > 0) {
                        const { reject } = pendingClassifications.shift();
                        reject(new Error(parsed.error));
                    }
                }
            } catch (e) {
                // Not JSON, ignore
            }
        }
    });

    gestureInferenceProcess.stderr.on('data', (data) => {
        console.error('[Gesture Process Error]:', data.toString());
    });

    gestureInferenceProcess.on('close', (code) => {
        console.log('[Gesture] Process closed with code:', code);
        gestureProcessReady = false;
        gestureInferenceProcess = null;

        // Reject any pending classifications
        while (pendingClassifications.length > 0) {
            const { reject } = pendingClassifications.shift();
            reject(new Error('Gesture process closed'));
        }
    });

    gestureInferenceProcess.on('error', (err) => {
        console.error('[Gesture] Process error:', err);
        gestureProcessReady = false;
    });
}

// Start gesture process on server start (if model exists)
const gestureModelPath = path.join(__dirname, 'gesture_workflow', 'models', 'gesture_model.pkl');
if (fs.existsSync(gestureModelPath)) {
    console.log('[Gesture] Starting persistent inference process...');
    startGestureProcess();
}

// Endpoint to restart gesture process (after training)
app.post('/api/gestures/reload', (req, res) => {
    console.log('[Gesture] Reloading inference process...');
    startGestureProcess();
    res.json({ status: 'reloading' });
});

app.post('/api/gestures/classify', async (req, res) => {
    const { frames, threshold } = req.body;

    if (!frames || !Array.isArray(frames)) {
        return res.status(400).json({ error: 'frames array required' });
    }

    // Start process if not running
    if (!gestureInferenceProcess) {
        if (fs.existsSync(gestureModelPath)) {
            startGestureProcess();
            // Wait for process to be ready (max 5 seconds)
            const startTime = Date.now();
            while (!gestureProcessReady && Date.now() - startTime < 5000) {
                await new Promise(r => setTimeout(r, 100));
            }
        } else {
            return res.status(400).json({ error: 'Model not found. Please train first.' });
        }
    }

    if (!gestureProcessReady) {
        return res.status(503).json({ error: 'Gesture process not ready' });
    }

    // Debug: Log what we're sending
    console.log('[Gesture] ========== CLASSIFY REQUEST ==========');
    console.log('[Gesture] Frames count:', frames.length);
    if (frames.length > 0) {
        const f = frames[0];
        console.log('[Gesture] First frame:', {
            timestamp: f.timestamp,
            left_hand: f.left_hand ? 'present' : 'null',
            right_hand: f.right_hand ? 'present' : 'null'
        });
        if (f.right_hand && f.right_hand.landmarks) {
            console.log('[Gesture] Right hand landmarks count:', f.right_hand.landmarks.length);
        }
        if (f.left_hand && f.left_hand.landmarks) {
            console.log('[Gesture] Left hand landmarks count:', f.left_hand.landmarks.length);
        }
    }

    try {
        // Use persistent process - send request and wait for response
        const result = await new Promise((resolve, reject) => {
            // Add to pending queue
            pendingClassifications.push({ resolve, reject });

            // Send classification request
            gestureInferenceProcess.stdin.write(JSON.stringify({ frames, threshold: threshold || 0.5 }) + '\n');

            // Timeout after 5 seconds
            setTimeout(() => {
                const idx = pendingClassifications.findIndex(p => p.resolve === resolve);
                if (idx !== -1) {
                    pendingClassifications.splice(idx, 1);
                    reject(new Error('Classification timeout'));
                }
            }, 5000);
        });

        // Log the result
        console.log('[Gesture] ========== RESULT ==========');
        console.log('[Gesture] Predicted:', result.predicted_class);
        console.log('[Gesture] Confidence:', (result.confidence * 100).toFixed(1) + '%');
        console.log('[Gesture] All probs:', result.all_probs);
        console.log('[Gesture] ==============================');

        res.json(result);
    } catch (error) {
        console.error('[Gesture] Classification error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Serve gesture models statically
app.use('/gesture-models', express.static(path.join(__dirname, 'gesture_workflow', 'models')));


// Delete class and associated data
app.delete('/api/classes/:className', (req, res) => {
    try {
        const className = req.params.className;
        if (!fs.existsSync(CLASSES_FILE)) {
            return res.status(404).json({ error: 'Classes file not found' });
        }

        let classes = fs.readFileSync(CLASSES_FILE, 'utf-8')
            .split('\n')
            .map(c => c.trim())
            .filter(c => c);

        const classIndex = classes.indexOf(className);
        if (classIndex === -1) {
            return res.status(404).json({ error: 'Class not found' });
        }

        // Remove class from classes.txt
        classes.splice(classIndex, 1);
        fs.writeFileSync(CLASSES_FILE, classes.join('\n'));

        // Remove from trained_classes.txt if present
        if (fs.existsSync(TRAINED_CLASSES_FILE)) {
            let trainedClasses = fs.readFileSync(TRAINED_CLASSES_FILE, 'utf-8')
                .split('\n')
                .map(c => c.trim())
                .filter(c => c);

            const newTrainedClasses = trainedClasses.filter(c => c !== className);
            if (newTrainedClasses.length !== trainedClasses.length) {
                fs.writeFileSync(TRAINED_CLASSES_FILE, newTrainedClasses.join('\n'));
            }
        }

        // Process all label files in raw_data
        let deletedImagesCount = 0;

        // Helper to recursively find all .txt files
        function processDirectory(dir) {
            const files = fs.readdirSync(dir);

            files.forEach(file => {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);

                if (stat.isDirectory()) {
                    processDirectory(filePath);
                } else if (file.endsWith('.txt')) {
                    // It's a label file
                    let content = fs.readFileSync(filePath, 'utf-8');
                    let lines = content.split('\n').filter(l => l.trim());
                    let newLines = [];
                    let hasChanges = false;
                    let remainingLabels = 0;

                    lines.forEach(line => {
                        const parts = line.trim().split(' ');
                        const clsId = parseInt(parts[0]);

                        if (isNaN(clsId)) return; // Skip invalid lines

                        if (clsId === classIndex) {
                            // This is the deleted class - remove it
                            hasChanges = true;
                        } else if (clsId > classIndex) {
                            // Shift ID down
                            parts[0] = (clsId - 1).toString();
                            newLines.push(parts.join(' '));
                            hasChanges = true;
                            remainingLabels++;
                        } else {
                            // Keep as is
                            newLines.push(line);
                            remainingLabels++;
                        }
                    });

                    if (hasChanges) {
                        if (remainingLabels === 0) {
                            // No labels left, delete label file AND image
                            fs.unlinkSync(filePath);

                            // Try to find and delete the corresponding image
                            // Assuming image has same basename and is in ../images/ or same dir
                            const imageExts = ['.jpg', '.jpeg', '.png'];
                            const baseName = path.basename(file, '.txt');
                            const dirName = path.dirname(filePath);

                            // Check same dir
                            let imageDeleted = false;
                            for (const ext of imageExts) {
                                const imgPath = path.join(dirName, baseName + ext);
                                if (fs.existsSync(imgPath)) {
                                    fs.unlinkSync(imgPath);
                                    imageDeleted = true;
                                    break;
                                }
                            }

                            // Check ../images/ dir (standard YOLO structure)
                            if (!imageDeleted) {
                                const parentDir = path.dirname(dirName);
                                const imagesDir = path.join(parentDir, 'images');
                                if (fs.existsSync(imagesDir)) {
                                    for (const ext of imageExts) {
                                        const imgPath = path.join(imagesDir, baseName + ext);
                                        if (fs.existsSync(imgPath)) {
                                            fs.unlinkSync(imgPath);
                                            imageDeleted = true;
                                            break;
                                        }
                                    }
                                }
                            }

                            deletedImagesCount++;
                        } else {
                            // Update label file with shifted IDs
                            fs.writeFileSync(filePath, newLines.join('\n'));
                        }
                    }
                }
            });
        }

        if (fs.existsSync(RAW_DATA_DIR)) {
            processDirectory(RAW_DATA_DIR);
        }

        console.log(`[API] Deleted class '${className}'. Removed ${deletedImagesCount} images.`);
        res.json({ success: true, message: `Class deleted. ${deletedImagesCount} images removed.` });

    } catch (error) {
        console.error('Error deleting class:', error);
        res.status(500).json({ error: error.message });
    }
});
