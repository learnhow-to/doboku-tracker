import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { authenticate } from '../../middlewares/auth.js';
import * as photosService from './photos.service.js';

const router = Router();

// Memory storage for multer so we can validate and calculate SHA-256 before writing to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      cb(new Error('Hanya format JPG, PNG, atau WEBP yang diperbolehkan'));
      return;
    }
    cb(null, true);
  },
});

router.use(authenticate);

router.post('/upload', upload.single('photo'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'File foto wajib disertakan' });
      return;
    }

    const { reportId, projectId, stage, locationSta, workType, caption } = req.body;
    if (!reportId || !projectId || !stage) {
      res.status(400).json({ error: 'reportId, projectId, dan stage wajib disertakan' });
      return;
    }

    const photo = await photosService.savePhoto(
      {
        reportId,
        projectId,
        stage,
        locationSta,
        workType,
        caption,
        fileBuffer: req.file.buffer,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
      },
      req.user!
    );

    res.status(201).json(photo);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/download', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await photosService.getPhotoForDownload(req.params.id, req.user!);
    if (!result) {
      res.status(404).json({ error: 'Foto tidak ditemukan' });
      return;
    }

    res.setHeader('Content-Type', result.photo.mime_type);
    res.sendFile(result.filePath);
  } catch (err) {
    next(err);
  }
});

export default router;
