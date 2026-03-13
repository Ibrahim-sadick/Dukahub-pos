import { Router } from 'express';
import { authRouter } from './auth.routes';
import { plansRouter } from './plans.routes';
import { subscriptionsRouter } from './subscriptions.routes';
import { businessRouter } from './business.routes';
import { workspacesRouter } from './workspaces.routes';
import { usersRouter } from './users.routes';
import { staffRecordsRouter } from './staffRecords.routes';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/plans', plansRouter);
apiRouter.use('/subscriptions', subscriptionsRouter);
apiRouter.use('/business', businessRouter);
apiRouter.use('/workspaces', workspacesRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/staff-records', staffRecordsRouter);
