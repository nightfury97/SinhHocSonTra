import { Router } from 'express';
import authRoutes from './modules/auth/auth.routes';
import speciesRoutes from './modules/species/species.routes';
import observationsRoutes from './modules/observations/observations.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import mapRoutes from './modules/map/map.routes';
import stationsRoutes from './modules/stations/stations.routes';
import usersRoutes from './modules/users/users.routes';
import datasetsRoutes from './modules/datasets/datasets.routes';
import surveysRoutes from './modules/surveys/surveys.routes';
import chatRoutes from './modules/chat/chat.routes';
import exportRoutes from './modules/export/export.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/species', speciesRoutes);
router.use('/observations', observationsRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/map', mapRoutes);
router.use('/stations', stationsRoutes);
router.use('/users', usersRoutes);
router.use('/datasets', datasetsRoutes);
router.use('/surveys', surveysRoutes);
router.use('/export', exportRoutes);
router.use('/chat', chatRoutes);

export default router;
