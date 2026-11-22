import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import handler from './send-email';
import createUserHandler from './create-user';
import deleteUserHandler from './delete-user';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/send-email', (req, res) => {
  handler(req as unknown as VercelRequest, res as unknown as VercelResponse);
});
app.post('/api/create-user', (req, res) => {
  createUserHandler(req as unknown as VercelRequest, res as unknown as VercelResponse);
});
app.post('/api/delete-user', (req, res) => {
  deleteUserHandler(req as unknown as VercelRequest, res as unknown as VercelResponse);
});

app.listen(3001, () => {
  console.info('Dev API server running at http://localhost:3001');
});
