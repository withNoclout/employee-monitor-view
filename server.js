import express from 'express';
import cors from 'cors';
import multer from 'multer';
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Configure multer for file upload
const upload = multer({ dest: 'uploads/' });

const DATASET_DIR = path.join(__dirname, 'dataset');

// Ensure dataset directory exists
if (!fs.existsSync(DATASET_DIR)) {
  fs.mkdirSync(DATASET_DIR, { recursive: true });
}

app.post('/api/save-dataset', upload.single('dataset'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  console.log('Received dataset zip:', req.file.path);

  try {
    const zip = new AdmZip(req.file.path);
    
    // Extract to dataset folder
    zip.extractAllTo(DATASET_DIR, true);
    
    console.log(`Dataset extracted to ${DATASET_DIR}`);

    // Clean up uploaded zip file
    fs.unlinkSync(req.file.path);

    res.json({ message: 'Dataset saved and extracted successfully', path: DATASET_DIR });
  } catch (error) {
    console.error('Error extracting zip:', error);
    res.status(500).send('Error processing dataset');
  }
});

app.listen(port, () => {
  console.log(`Dataset server running at http://localhost:${port}`);
  console.log(`Files will be saved to: ${DATASET_DIR}`);
});
