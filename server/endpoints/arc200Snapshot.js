import express from 'express';
import { arc200 } from 'ulujs';
import Database from 'better-sqlite3';
import { algodClientTestnet, algodIndexerTestnet, algodClientMainnet, algodIndexerMainnet } from '../utils/algod.js';

const arc200SnapshotRoute = express.Router();

const dbTestnet = new Database('./server/arc200_transfers_testnet.db', { verbose: console.log });
const dbMainnet = new Database('./server/arc200_transfers_mainnet.db', { verbose: console.log });

const zeroAddr = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ";

function getClientIndexer(network) {
  if (network === 'mainnet') {
    return { client: algodClientMainnet, indexer: algodIndexerMainnet };
  }
  return { client: algodClientTestnet, indexer: algodIndexerTestnet };
}

function getDatabase(network) {
  return network === 'mainnet' ? dbMainnet : dbTestnet;
}

function ensureTableForToken(db, tokenId) {
  const tableName = `transfers_${tokenId}`;
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS ${tableName} (
      txID TEXT,
      round INTEGER,
      timestamp INTEGER,
      fromAddr TEXT,
      toAddr TEXT,
      amount TEXT
    )`;
  db.prepare(createTableSQL).run();
}

function formatAmount(amount, decimals) {
  let amountStr = amount.toString();
  if (amountStr.length > 50) amountStr = '0'; 
  const requiredLength = decimals + 1;
  amountStr = amountStr.padStart(requiredLength, '0');
  const integerPart = amountStr.slice(0, -decimals);
  const decimalPart = amountStr.slice(-decimals);
  return decimals > 0 ? `${integerPart}.${decimalPart}` : integerPart;
}

export async function getArc200Snapshot(network, tokenId, round = null, addr = null) {
  console.log("tokenid:", tokenId);
  console.log("network:", network);

  if (!['mainnet', 'testnet'].includes(network)) {
    throw new Error('Invalid network');
  }

  const tokenIdNum = Number(tokenId);
  if (isNaN(tokenIdNum)) {
    throw new Error('Invalid tokenId');
  }

  const db = getDatabase(network);
  const { client, indexer } = getClientIndexer(network);
  ensureTableForToken(db, tokenIdNum);

  let roundNum = round ? Number(round) : NaN;
  if (isNaN(roundNum)) {
    const status = await client.status().do();
    roundNum = status["last-round"];
  }

  const ci = new arc200(tokenIdNum, client, indexer);
  try {
    const [arc200_nameR, arc200_symbolR, arc200_decimalsR, arc200_totalSupplyR] = await Promise.all([
      ci.arc200_name(),
      ci.arc200_symbol(),
      ci.arc200_decimals(),
      ci.arc200_totalSupply(),
    ]);

    if (!arc200_nameR.success || !arc200_symbolR.success || !arc200_totalSupplyR.success) {
      throw new Error('Error getting metadata');
    }

    const token = {
      tokenId: tokenIdNum,
      name: arc200_nameR.returnValue,
      symbol: arc200_symbolR.returnValue,
      decimals: Number(arc200_decimalsR?.returnValue || 0),
      totalSupply: arc200_totalSupplyR.returnValue.toString(),
    };

    const tableName = `transfers_${tokenId}`;
    const getLastRound = db.prepare(`SELECT MAX(round) as lastRound FROM ${tableName}`);
    const lastRoundResult = getLastRound.get();
    const lastRound = lastRoundResult ? lastRoundResult.lastRound : 0;

    const arc200_TransferR = await ci.arc200_Transfer({ minRound: lastRound > 0 ? lastRound + 1 : 0 });

    if (arc200_TransferR && Array.isArray(arc200_TransferR)) {
      const insert = db.prepare(`INSERT INTO ${tableName} (txID, round, timestamp, fromAddr, toAddr, amount) VALUES (?, ?, ?, ?, ?, ?)`);

      db.transaction(() => {
        for (let i = 0; i < arc200_TransferR.length; i++) {
          const transfer = arc200_TransferR[i];
          if (transfer.length === 6) {
            const transferPrepared = transfer.map(item => {
              return typeof item === 'bigint' ? item.toString() : String(item);
            });

            if (transferPrepared.some(value => typeof value !== 'string' || value.length > 500)) {
              console.log('Skipping a transfer record due to size constraints:', transferPrepared);
            } else {
              insert.run(...transferPrepared);
            }
          }
        }
      })();
      
      
    } else {
      console.error('Error: something went wrong with transfer retrieval');
    }

    const queryTransfers = addr ? 
        db.prepare(`SELECT * FROM ${tableName} WHERE (fromAddr = ? OR toAddr = ?) AND round <= ?`).all(addr, addr, roundNum) :
        db.prepare(`SELECT * FROM ${tableName} WHERE round <= ?`).all(roundNum);

    const balance = addr ? BigInt(0) : new Map();
    balance.set(zeroAddr, BigInt(token.totalSupply));

    for (const { fromAddr, toAddr, amount } of queryTransfers) {
      if (addr) {
        if (toAddr === addr) balance += BigInt(amount);
        if (fromAddr === addr) balance -= BigInt(amount);
      } else {
        if (!balance.has(fromAddr)) balance.set(fromAddr, BigInt(0));
        if (!balance.has(toAddr)) balance.set(toAddr, BigInt(0));

        balance.set(fromAddr, balance.get(fromAddr) - BigInt(amount));
        balance.set(toAddr, balance.get(toAddr) + BigInt(amount));
      }
    }

    if (addr) {
      const formattedBalance = token.decimals === 0 ? balance.toString() : (balance * BigInt(10 ** -token.decimals)).toString();
      return { balance: formattedBalance };
    } else {
      const snapshot = Array.from(balance.entries()).map(([account, amount]) => ({
        account,
        amount: token.decimals === 0 ? amount.toString() : formatAmount(amount, token.decimals),
      }));
      
      snapshot.sort((a, b) => Number(b.amount.replace('.', '')) - Number(a.amount.replace('.', '')));
      return snapshot;
    }
  } catch (error) {
    console.error('Error processing request:', error.message);
    throw error;
  }
}

arc200SnapshotRoute.get('/api/arc200-snapshot/:network/:tokenId/:round?', async (req, res) => {
  const { network, tokenId, round } = req.params;
  const addr = req.query.addr;

  try {
    const result = await getArc200Snapshot(network, tokenId, round, addr);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default arc200SnapshotRoute;