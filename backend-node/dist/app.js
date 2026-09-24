import cors from 'cors';
import express from 'express';
import path from 'node:path';
import helmet from 'helmet';
import { pool } from './config/database.js';
import { env } from './config/env.js';
import { authenticate } from './middleware/authenticate.js';
import { enforceAgencyScope } from './middleware/agency-scope.js';
import { asyncHandler, errorHandler, notFound } from './middleware/error-handler.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { coreRouter } from './modules/core/core.routes.js';
import { crmRouter } from './modules/crm/crm.routes.js';
import { notificationRouter } from './modules/notifications/notification.routes.js';
import { customerRouter } from './modules/customers/customer.routes.js';
import { vehicleRouter } from './modules/vehicles/vehicle.routes.js';
import { showroomRouter } from './modules/showroom/showroom.routes.js';
import { deliveryRouter } from './modules/deliveries/delivery.routes.js';
import { workshopRouter } from './modules/workshop/workshop.routes.js';
import { partRouter } from './modules/parts/part.routes.js';
import { billingRouter } from './modules/billing/billing.routes.js';
import { reportRouter } from './modules/reports/report.routes.js';
import { documentRouter } from './modules/documents/document.routes.js';
import { userRouter } from './modules/users/user.routes.js';
import { settingRouter } from './modules/settings/setting.routes.js';
import { saleRouter } from './modules/sales/sale.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { quotationRouter } from './modules/quotations/quotation.routes.js';
import { hrRouter } from './modules/hr/hr.routes.js';
export function createApp() {
    const app = express();
    app.disable('x-powered-by');
    app.set('trust proxy', env.trustProxyHops);
    app.use(helmet());
    app.use(cors({ origin: env.frontendUrl, credentials: true }));
    app.use(express.json({ limit: '50mb' }));
    const publicUploadRoot = path.resolve(process.env.UPLOAD_DIR ?? 'uploads');
    // La GED est privée et n'est jamais exposée par express.static. Seuls les
    // espaces explicitement publics/compatibles conservent leurs URLs historiques.
    for (const folder of ['avatars', 'vehicles'])
        app.use(`/uploads/${folder}`, express.static(path.join(publicUploadRoot, folder), { fallthrough: false, index: false }));
    app.get('/api/health', asyncHandler(async (_request, response) => { await pool.query('SELECT 1'); response.json({ status: 'ok', service: 'lca-backend-node' }); }));
    app.use('/api/auth', createAuthRouter());
    app.use('/api', authenticate, enforceAgencyScope, userRouter, hrRouter, settingRouter, documentRouter, customerRouter, crmRouter, notificationRouter, vehicleRouter, showroomRouter, quotationRouter, saleRouter, deliveryRouter, partRouter, workshopRouter, billingRouter, reportRouter, dashboardRouter, coreRouter);
    app.use(notFound);
    app.use(errorHandler);
    return app;
}
