import express from 'express';
import cors from 'cors';
import schedule from 'node-schedule';
import { transporter } from './utils/emailConfig.js';
import { fetchTokensAndOwners } from './utils/fetchCollectionTokens.js';
import { generateCSV } from './utils/generateCollectionCSV.js';
import bodyParser from 'body-parser';
import { scheduleCollectionSnapshot, loadAndScheduleCollectionJobs } from './endpoints/ScheduleCollectionSnapshot.js';
import arc200SnapshotRoute from './endpoints/arc200Snapshot.js';
import { scheduleArc200Snapshot, loadAndScheduleArc200Jobs } from './endpoints/ScheduleArc200Snapshot.js';
import Database from 'better-sqlite3';


//Setup
const app = express();
const PORT = process.env.PORT || 3006;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());
app.use(arc200SnapshotRoute);

const db = new Database('./server/Database.db');

// Airdrop collections metrics table
db.exec(`CREATE TABLE IF NOT EXISTS AirdropCollectionStats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  network TEXT,
  sender TEXT,
  tokenId TEXT,
  tokenName TEXT,  
  tokenDecimals TEXT,  
  collection TEXT,
  receivers TEXT,
  amounts TEXT,
  totalAmount TEXT
)`);

// Airdrop LP Providers metrics table
db.exec(`CREATE TABLE IF NOT EXISTS AirdropLPStats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  network TEXT,
  sender TEXT,
  tokenId TEXT,
  tokenName TEXT,  
  tokenDecimals TEXT,  
  LP_Token TEXT,
  receivers TEXT,
  amounts TEXT,
  totalAmount TEXT
)`);

// Airdrop LP Providers metrics table
db.exec(`CREATE TABLE IF NOT EXISTS AirdropTokenStats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  network TEXT,
  sender TEXT,
  tokenId TEXT,
  tokenName TEXT,  
  tokenDecimals TEXT,  
  Token TEXT,
  receivers TEXT,
  amounts TEXT,
  totalAmount TEXT
)`);

// Scheduled Collection Snapshots table
db.exec(`CREATE TABLE IF NOT EXISTS ScheduledCollectionSnapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  network TEXT,
  contractId TEXT NOT NULL,
  snapshotTime TEXT NOT NULL, 
  emailAddress TEXT NOT NULL
)`);

// Scheduled Collection Snapshots table
db.exec(`CREATE TABLE IF NOT EXISTS ScheduledArc200Snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  network TEXT,
  tokenId TEXT NOT NULL,
  snapshotTime TEXT NOT NULL, 
  emailAddress TEXT NOT NULL
)`);

// Collection Snapshots Metrics
db.exec(`CREATE TABLE IF NOT EXISTS SnapshotCollectionStats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  network TEXT NOT NULL,
  kind TEXT NOT NULL,
  contractId TEXT NOT NULL
)`);

// Arc200 Snapshots Metrics
db.exec(`CREATE TABLE IF NOT EXISTS SnapshotArc200Stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  network TEXT NOT NULL,
  kind TEXT NOT NULL,
  tokenId TEXT NOT NULL
)`);

// Send Arc-72 Metrics
db.exec(`CREATE TABLE IF NOT EXISTS SendArc72Stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  network TEXT,
  sender TEXT,
  collection TEXT,
  tokenId TEXT, 
  receiver TEXT
)`);

//endpoints

//scheduling collection snapshots
app.post('/api/schedule-collection-snapshot', async (req, res) => {
  try {
    scheduleCollectionSnapshot(req.body);
    // Respond with JSON indicating success
    res.json({ success: true, message: 'Snapshot scheduling initiated' });
  } catch (error) {
    console.error('Error scheduling snapshot:', error);
    // Respond with JSON indicating failure
    res.status(500).json({ success: false, message: 'Failed to schedule snapshot' });
  }
});

//scheduling arc200 snapshots
app.post('/api/schedule-arc200-snapshot', async (req, res) => {
  try {
    scheduleArc200Snapshot(req.body);
    // Respond with JSON indicating success
    res.json({ success: true, message: 'Snapshot scheduling initiated' });
  } catch (error) {
    console.error('Error scheduling snapshot:', error);
    // Respond with JSON indicating failure
    res.status(500).json({ success: false, message: 'Failed to schedule snapshot' });
  }
});

//recording collection airdrop metrics
app.post('/api/record-collection-airdrop', async (req, res) => {
  try {
    const { network, sender, tokenId, tokenName, tokenDecimals, collection, receivers, amounts, totalAmount } = req.body;
    const insert = db.prepare(`INSERT INTO AirdropCollectionStats (network, sender, tokenId, tokenName, tokenDecimals, collection, receivers, amounts, totalAmount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    insert.run(network, sender, tokenId, tokenName, tokenDecimals, collection, JSON.stringify(receivers), JSON.stringify(amounts), totalAmount);
    res.json({ success: true, message: 'Airdrop event recorded successfully' });
  } catch (error) {
    console.error('Error recording airdrop:', error);
    res.status(500).json({ success: false, message: 'Error recording airdrop event' });
  }
});

//recording lp airdrop metrics
app.post('/api/record-lp-airdrop', async (req, res) => {
  try {
    const { network, sender, tokenId, tokenName, tokenDecimals, LP_Token, receivers, amounts, totalAmount } = req.body;
    const insert = db.prepare(`INSERT INTO AirdropLPStats (network, sender, tokenId, tokenName, tokenDecimals, LP_Token, receivers, amounts, totalAmount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    insert.run(network, sender, tokenId, tokenName, tokenDecimals, LP_Token, JSON.stringify(receivers), JSON.stringify(amounts), totalAmount);
    res.json({ success: true, message: 'Airdrop event recorded successfully' });
  } catch (error) {
    console.error('Error recording airdrop:', error);
    res.status(500).json({ success: false, message: 'Error recording airdrop event' });
  }
});

//recording lp airdrop metrics
app.post('/api/record-token-airdrop', async (req, res) => {
  try {
    const { network, sender, tokenId, tokenName, tokenDecimals, token, receivers, amounts, totalAmount } = req.body;
    const insert = db.prepare(`INSERT INTO AirdropTokenStats (network, sender, tokenId, tokenName, tokenDecimals, token, receivers, amounts, totalAmount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    insert.run(network, sender, tokenId, tokenName, tokenDecimals, token, JSON.stringify(receivers), JSON.stringify(amounts), totalAmount);
    res.json({ success: true, message: 'Airdrop event recorded successfully' });
  } catch (error) {
    console.error('Error recording airdrop:', error);
    res.status(500).json({ success: false, message: 'Error recording airdrop event' });
  }
});


//recording collection snapshot metrics
app.post('/api/record-collection-snapshot', async (req, res) => {
  try {
    const { network, kind, collection } = req.body;
    if (!network || !kind || !collection) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    const insert = db.prepare(`INSERT INTO SnapshotCollectionStats (network, kind, contractId) VALUES (?, ?, ?)`);
    const info = insert.run(network, kind, collection);
    res.json({ success: true, message: 'Snapshot recorded successfully', id: info.lastInsertRowid });
  } catch (error) {
    console.error('Error recording snapshot:', error);
    res.status(500).json({ success: false, message: 'Error recording snapshot' });
  }
});

//recording arc200 snapshot metrics
app.post('/api/record-arc200-snapshot', async (req, res) => {
  try {
    const { network, kind, tokenId } = req.body;
    if (!network || !kind || !tokenId) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    const insert = db.prepare(`INSERT INTO SnapshotArc200Stats (network, kind, tokenId) VALUES (?, ?, ?)`);
    const info = insert.run(network, kind, tokenId);
    res.json({ success: true, message: 'Snapshot recorded successfully', id: info.lastInsertRowid });
  } catch (error) {
    console.error('Error recording snapshot:', error);
    res.status(500).json({ success: false, message: 'Error recording snapshot' });
  }
});


//recording send arc72 metrics
app.post('/api/record-send-arc72', async (req, res) => {
  try {
    const { network, sender, collection, tokenId, receiver } = req.body;
    const insert = db.prepare(`INSERT INTO SendArc72Stats (network, sender, collection, tokenId, receiver) VALUES (?, ?, ?, ?, ?)`);
    insert.run(network, sender, collection, tokenId, receiver);
    res.json({ success: true, message: 'Send event recorded successfully' });
  } catch (error) {
    console.error('Error recording send:', error);
    res.status(500).json({ success: false, message: 'Error recording send event' });
  }
});



//serving collection airdrop metrics
app.get('/api/collection-airdrop-metrics', async (req, res) => {
  try {
    const select = db.prepare('SELECT * FROM AirdropCollectionStats');
    const rows = select.all();
    const metrics = rows.map(row => ({
      ...row,
      receivers: JSON.parse(row.receivers),
      amounts: JSON.parse(row.amounts)
    }));
    res.json({ success: true, data: metrics });
  } catch (error) {
    console.error('Error fetching airdrop metrics:', error);
    res.status(500).json({ success: false, message: 'Error fetching airdrop metrics' });
  }
});


//serving ar72 send metrics
app.get('/api/send-arc72-metrics', async (req, res) => {
  try {
    const select = db.prepare('SELECT * FROM SendArc72Stats');
    const rows = select.all();
    const metrics = rows.map(row => ({
      id: row.id,
      network: row.network,
      eventTime: row.event_time,
      sender: row.sender,
      collection: row.collection,
      tokenId: row.tokenId,
      receiver: row.receiver
    }));
    res.json({ success: true, data: metrics });
  } catch (error) {
    console.error('Error fetching SendArc72 metrics:', error);
    res.status(500).json({ success: false, message: 'Error fetching SendArc72 metrics' });
  }
});


//serving collection snapshot metrics
app.get('/api/collection-snapshot-metrics', async (req, res) => {
  try {
    const select = db.prepare('SELECT * FROM SnapshotCollectionStats');
    const rows = select.all();
    const metrics = rows.map(row => ({
      id: row.id,
      network: row.network,
      eventTime: row.event_time,
      collection: row.contractId,
    }));
    res.json({ success: true, data: metrics });
  } catch (error) {
    console.error('Error fetching collection snapshot metrics:', error);
    res.status(500).json({ success: false, message: 'Error fetching collection snapshot metrics' });
  }
});


app.listen(PORT, () => {
  console.log(`API server started. Server running on port ${PORT}`);
  loadAndScheduleCollectionJobs();
  loadAndScheduleArc200Jobs();
});

