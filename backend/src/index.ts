import './loadEnv';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import authRoutes from './routes/auth';
import localChargesRoutes from './routes/localCharges';
import lampiranRoutes from './routes/lampiran';
import customersRoutes from './routes/customers';
import inputanRoutes from './routes/inputan';
import usersRoutes from './routes/users';
import rolesRoutes from './routes/roles';
import logsRoutes from './routes/logs';
import inspectionReportRoutes from './routes/inspectionReport';
import employeesRoutes from './routes/employees';
import { priceListRoutes } from './routes/priceList';
import { logger as winstonLogger } from './lib/logger';

const app = new Hono();

app.use('*', async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  winstonLogger.info(`${c.req.method} ${c.req.url} - ${c.res.status} - ${ms}ms`);
});
// Accept requests from any configured origin or from LAN IPs
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',').map(o => o.trim());

app.use('/api/v1/*', cors({
  origin: (origin) => {
    if (!origin) return origin; // allow non-browser requests (curl, etc.)
    // Allow exact matches from env config
    if (allowedOrigins.includes(origin)) return origin;
    // Allow any LAN IP (192.168.x.x, 10.x.x.x, 172.16-31.x.x) on any port
    if (/^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(origin)) return origin;
    return '';
  },
  credentials: true,
}));

app.get('/', (c) => {
  return c.text('WorkHub API is running!');
});

app.route('/api/v1/auth', authRoutes);
app.route('/api/v1/local-charges', localChargesRoutes);
app.route('/api/v1/lampiran', lampiranRoutes);
app.route('/api/v1/customers', customersRoutes);
app.route('/api/v1/inputan', inputanRoutes);
app.route('/api/v1/users', usersRoutes);
app.route('/api/v1/roles', rolesRoutes);
app.route('/api/v1/logs', logsRoutes);
app.route('/api/v1/inspection-reports', inspectionReportRoutes);
app.route('/api/v1/employees', employeesRoutes);
app.route('/api/v1/pricelist', priceListRoutes);

const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;

console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
  hostname: '0.0.0.0'
});
