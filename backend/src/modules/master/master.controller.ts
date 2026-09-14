import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import * as masterService from './master.service.js';

const router = Router();
router.use(authenticate);

// Workers Endpoints
router.get('/workers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const workers = await masterService.getMasterWorkers(req.user!, includeInactive);
    res.json(workers);
  } catch (err) {
    next(err);
  }
});

router.post('/workers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const worker = await masterService.createMasterWorker(req.body, req.user!);
    res.status(201).json(worker);
  } catch (err) {
    next(err);
  }
});

router.put('/workers/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const worker = await masterService.updateMasterWorker(req.params.id, req.body, req.user!);
    res.json(worker);
  } catch (err) {
    next(err);
  }
});

router.delete('/workers/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await masterService.deleteMasterWorker(req.params.id, req.user!);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Equipment Endpoints
router.get('/equipment', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const equipment = await masterService.getMasterEquipment(req.user!, includeInactive);
    res.json(equipment);
  } catch (err) {
    next(err);
  }
});

router.post('/equipment', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const equip = await masterService.createMasterEquipment(req.body, req.user!);
    res.status(201).json(equip);
  } catch (err) {
    next(err);
  }
});

router.put('/equipment/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const equip = await masterService.updateMasterEquipment(req.params.id, req.body, req.user!);
    res.json(equip);
  } catch (err) {
    next(err);
  }
});

router.delete('/equipment/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await masterService.deleteMasterEquipment(req.params.id, req.user!);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
