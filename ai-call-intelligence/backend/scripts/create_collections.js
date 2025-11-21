#!/usr/bin/env node
/**
 * create_collections.js
 *
 * Connects to MongoDB (Atlas) using backend/config/database.js and ensures
 * the requested collections exist (empty). Useful to pre-create collection
 * names (folders) in Atlas without migrating any documents.
 *
 * Usage: run from the repo root or backend folder. The script will load
 * backend/.env when run from `backend` folder. You can also set
 * ATLAS_URI or MONGODB_URI in the environment.
 */

const path = require('path');

// Ensure we run from backend so dotenv in database.js picks up backend/.env
// If running from repo root, database.js already calls dotenv but from cwd,
// so recommend running this from the backend folder.

const database = require('../config/database');
const mongoose = require('mongoose');

// Collections to create (empty)
const COLLECTIONS = [
  'analyses',
  'calls',
  'chatmessages',
  'chatsessions',
  'classifications',
  'tasks',
  'test',
  'transcriptions',
  'users'
];

async function ensureCollections() {
  try {
    console.log('🔗 Connecting to DB...');
    await database.connect();

    const db = mongoose.connection.db;
    const existing = await db.listCollections().toArray();
    const existingNames = new Set(existing.map(c => c.name));

    for (const name of COLLECTIONS) {
      if (existingNames.has(name)) {
        console.log(`ℹ️  Collection already exists: ${name}`);
        continue;
      }

      try {
        await db.createCollection(name);
        console.log(`✅ Created collection: ${name}`);
      } catch (err) {
        console.error(`❌ Failed to create collection ${name}:`, err.message);
      }
    }

    console.log('🔌 Disconnecting...');
    await database.disconnect();
    console.log('✅ Done');
    process.exit(0);
  } catch (err) {
    console.error('CONNECT_FAILED', err && err.message ? err.message : err);
    try { await database.disconnect(); } catch(e){}
    process.exit(1);
  }
}

ensureCollections();
