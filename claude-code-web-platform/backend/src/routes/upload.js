import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';

const router = Router();

// Configure multer for file uploads
const uploadDir = process.env.UPLOAD_DIR || './uploads';

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueId}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') // Default 10MB
  },
  fileFilter: (req, file, cb) => {
    // Allowed file types
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'text/plain',
      'text/markdown',
      'text/csv',
      'application/pdf',
      'application/json',
      'application/javascript',
      'text/javascript',
      'text/html',
      'text/css',
      'application/x-python-code',
      'text/x-python'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`), false);
    }
  }
});

// Upload single file
router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No file uploaded'
      });
    }

    const fileInfo = {
      id: path.basename(req.file.filename, path.extname(req.file.filename)),
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      uploadedAt: new Date().toISOString()
    };

    logger.info('File uploaded:', fileInfo);

    res.json({
      success: true,
      data: fileInfo
    });

  } catch (error) {
    logger.error('File upload failed:', error);
    next(error);
  }
});

// Upload multiple files
router.post('/multiple', upload.array('files', 10), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No files uploaded'
      });
    }

    const filesInfo = req.files.map(file => ({
      id: path.basename(file.filename, path.extname(file.filename)),
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
      uploadedAt: new Date().toISOString()
    }));

    logger.info(`${filesInfo.length} files uploaded`);

    res.json({
      success: true,
      data: filesInfo
    });

  } catch (error) {
    logger.error('Multiple file upload failed:', error);
    next(error);
  }
});

// Download file
router.get('/download/:fileId', async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    
    // Find file with this ID
    const files = await fs.readdir(uploadDir);
    const file = files.find(f => f.startsWith(fileId));
    
    if (!file) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'File not found'
      });
    }

    const filePath = path.join(uploadDir, file);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({
        error: 'Not Found',
        message: 'File not found'
      });
    }

    // Send file
    res.download(filePath);

  } catch (error) {
    logger.error('File download failed:', error);
    next(error);
  }
});

// Delete file
router.delete('/:fileId', async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    
    // Find file with this ID
    const files = await fs.readdir(uploadDir);
    const file = files.find(f => f.startsWith(fileId));
    
    if (!file) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'File not found'
      });
    }

    const filePath = path.join(uploadDir, file);
    
    // Delete file
    await fs.unlink(filePath);
    
    logger.info(`File deleted: ${fileId}`);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    logger.error('File deletion failed:', error);
    next(error);
  }
});

export const uploadRoutes = router;