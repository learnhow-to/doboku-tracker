import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireProjectAccess } from '../../middlewares/auth.js';
import * as projectsService from './projects.service.js';

const router = Router();

router.use(authenticate);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const projects = await projectsService.getUserProjects(req.user!);
    res.json(projects);
  } catch (err) {
    next(err);
  }
});

router.get('/:projectId', requireProjectAccess('projectId'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await projectsService.getProjectById(req.params.projectId, req.user!);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.json(project);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await projectsService.createProject(req.body, req.user!);
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
});

router.put('/:projectId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await projectsService.updateProject(req.params.projectId, req.body, req.user!);
    res.json(project);
  } catch (err) {
    next(err);
  }
});

export default router;

