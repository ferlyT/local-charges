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

const app = new Hono();

app.use('*', logger());
app.use('/api/v1/*', cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.get('/', (c) => {
  return c.text('Local Charges API is running!');
});

app.route('/api/v1/auth', authRoutes);
app.route('/api/v1/local-charges', localChargesRoutes);
app.route('/api/v1/lampiran', lampiranRoutes);
app.route('/api/v1/customers', customersRoutes);
app.route('/api/v1/inputan', inputanRoutes);
app.route('/api/v1/users', usersRoutes);
app.route('/api/v1/roles', rolesRoutes);

const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;

console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port
});
