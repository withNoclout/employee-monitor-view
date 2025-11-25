import express from 'express';
import multer from 'multer';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// Python interpreter path (from venv)
const PYTHON_PATH = '/home/noclout/Vision_sign/QC_hackaton/server/venv/bin/python';
const TRAIN_SCRIPT = path.join(__dirname, 'yolo_workflow', 'scripts', 'train_model.py');

app.use(cors());
app.use(express.json());

// Configure Multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Ensure directories exist
const YOLO_WORKFLOW_DIR = path.join(__dirname, 'yolo_workflow');
const RAW_DATA_DIR = path.join(YOLO_WORKFLOW_DIR, 'raw_data');
const CLASSES_FILE = path.join(YOLO_WORKFLOW_DIR, 'classes.txt');

if (!fs.existsSync(RAW_DATA_DIR)) {
    fs.mkdirSync(RAW_DATA_DIR, { recursive: true });
}

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

        res.json({ message: 'Dataset saved and processed successfully', batch: batchName });
    } catch (error) {
        console.error('Error processing zip:', error);
        // If we have a batchDir but failed, we might want to clean it up? 
        // For now, keep it for debugging.
        res.status(500).send('Error processing dataset: ' + error.message);
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
        const classes = [];
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

            classNames.forEach((name, index) => {
                classes.push({
                    id: index.toString(),
                    name: name,
                    count: counts[index],
                    isTrained: false, // Default for now
                    includeInTraining: true
                });
            });
        }
        res.json(classes);
    } catch (error) {
        console.error('Error fetching classes:', error);
        res.status(500).send('Error fetching classes');
    }
});

app.post('/api/train', (req, res) => {
    console.log('Starting training process...');
    
    // Set headers for streaming
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');

    const pythonProcess = spawn(PYTHON_PATH, [TRAIN_SCRIPT]);
    
    pythonProcess.stdout.on('data', (data) => {
        const msg = data.toString();
        console.log(`[Train]: ${msg}`);
        res.write(msg);
    });

    pythonProcess.stderr.on('data', (data) => {
        const msg = data.toString();
        console.error(`[Train Error]: ${msg}`);
        res.write(msg);
    });

    pythonProcess.on('close', (code) => {
        console.log(`Training process exited with code ${code}`);
        if (code === 0) {
            res.write('\n[TRAINING_COMPLETE]\n');
        } else {
            res.write(`\n[TRAINING_FAILED] Code: ${code}\n`);
        }
        res.end();
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
