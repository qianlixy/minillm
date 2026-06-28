import { Request, Response } from 'express';
import { loadDB, saveDB } from '../../db/local_store.js';

export const loginAdmin = (req: Request, res: Response) => {
  const { username, secret } = req.body;
  const db = loadDB();

  if (username === db.adminUsername && secret === db.adminSecret) {
    return res.json({
      success: true,
      token: `${username}:${secret}`,
      username: db.adminUsername
    });
  }

  return res.status(401).json({
    success: false,
    error: 'Invalid administrator username or secret key.'
  });
};

export const updateAdminProfile = (req: Request, res: Response) => {
  const { username, secret } = req.body;
  if (!username || !secret || !username.trim() || !secret.trim()) {
    return res.status(400).json({ error: 'Username and secret key cannot be empty' });
  }

  const db = loadDB();
  db.adminUsername = username.trim();
  db.adminSecret = secret.trim();
  saveDB(db);

  return res.json({
    success: true,
    token: `${db.adminUsername}:${db.adminSecret}`,
    username: db.adminUsername,
    message: 'Administrator credentials updated successfully.'
  });
};

export const getAdminProfile = (req: Request, res: Response) => {
  const db = loadDB();
  res.json({
    username: db.adminUsername,
    secret: db.adminSecret
  });
};
