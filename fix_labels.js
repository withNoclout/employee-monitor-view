import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const YOLO_WORKFLOW_DIR = path.join(__dirname, 'yolo_workflow');
const RAW_DATA_DIR = path.join(YOLO_WORKFLOW_DIR, 'raw_data');
const CLASSES_FILE = path.join(YOLO_WORKFLOW_DIR, 'classes.txt');

function fixLabels() {
    console.log('Starting label repair...');
    
    let classes = [];
    if (fs.existsSync(CLASSES_FILE)) {
        classes = fs.readFileSync(CLASSES_FILE, 'utf-8')
            .split('\n')
            .map(c => c.trim())
            .filter(c => c);
    }

    if (!fs.existsSync(RAW_DATA_DIR)) {
        console.log('No raw_data directory found.');
        return;
    }

    const batches = fs.readdirSync(RAW_DATA_DIR);
    
    batches.forEach(batch => {
        const batchDir = path.join(RAW_DATA_DIR, batch);
        const labelsDir = path.join(batchDir, 'labels');
        
        if (fs.existsSync(labelsDir)) {
            const files = fs.readdirSync(labelsDir);
            
            files.forEach(file => {
                if (!file.endsWith('.txt')) return;
                
                const filePath = path.join(labelsDir, file);
                const content = fs.readFileSync(filePath, 'utf-8');
                const lines = content.split('\n');
                const newLines = [];
                let modified = false;
                
                lines.forEach(line => {
                    if (!line.trim()) return;
                    
                    const parts = line.trim().split(' ');
                    const labelToken = parts[0];
                    const coords = parts.slice(1).join(' ');
                    
                    // Check if label is already a number
                    if (!isNaN(parseInt(labelToken))) {
                        newLines.push(line);
                        return;
                    }

                    // It's a string, need to convert
                    modified = true;
                    let classIdx = classes.findIndex(c => c.toLowerCase() === labelToken.toLowerCase());
                    
                    if (classIdx === -1) {
                        classes.push(labelToken);
                        classIdx = classes.length - 1;
                        console.log(`New class added during repair: ${labelToken}`);
                    }
                    
                    newLines.push(`${classIdx} ${coords}`);
                });
                
                if (modified) {
                    fs.writeFileSync(filePath, newLines.join('\n'));
                    console.log(`Fixed labels in: ${file}`);
                }
            });
        }
    });
    
    fs.writeFileSync(CLASSES_FILE, classes.join('\n'));
    console.log('Label repair completed.');
}

fixLabels();
