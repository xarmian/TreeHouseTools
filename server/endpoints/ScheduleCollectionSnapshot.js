import schedule from 'node-schedule';
import { transporter } from '../utils/emailConfig.js';
import { fetchTokensAndOwners } from '../utils/fetchCollectionTokens.js';
import { generateCSV } from '../utils/generateCollectionCSV.js';
import Database from 'better-sqlite3'

const db = new Database('./server/Database.db');

class EmailQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
  }

  async enqueue(emailTask) {
    this.queue.push(emailTask);
    if (!this.isProcessing) {
      this.isProcessing = true;
      await this.processQueue();
    }
  }

  async processQueue() {
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      await task();
    }
    this.isProcessing = false;
  }
}

const emailQueue = new EmailQueue();

export const scheduleCollectionSnapshot = ({ network, contractId, snapshotTime, emailAddress }) => {
  const snapshotDate = new Date(snapshotTime);
  console.log(`Scheduling snapshot for contract ${contractId} at ${snapshotDate} for ${emailAddress}`);
  
  schedule.scheduleJob(snapshotDate, async () => {
    console.log(`Executing scheduled snapshot for ${contractId}`);
    try {
      const tokensData = await fetchTokensAndOwners(contractId);
      const csvContent = generateCSV(tokensData);
      console.log(`Generated CSV for ${contractId}`);

      const mailOptions = {
        from: 'treehousetools@hotmail.com',
        to: emailAddress,
        subject: 'Scheduled Collection Token Snapshot',
        text: 'Attached is your scheduled Collection snapshot. Thank you for using the treehouse toolbox.',
        attachments: [{
          filename: 'snapshot.csv',
          content: csvContent,
          contentType: 'text/csv'
        }]
      };

      emailQueue.enqueue(async () => {
        return new Promise((resolve, reject) => {
          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              console.log(`Error sending email for ${contractId}:`, error);
              reject(error);
            } else {
              console.log(`Email sent for ${contractId}: ` + info.response);
              removeScheduledCollectionSnapshot({ network, contractId, snapshotTime, emailAddress });
              resolve(info);
            }
          });
        });
      });
      
    } catch (error) {
      console.error(`Failed to generate or send snapshot for ${contractId}:`, error);
    }
  });

  persistScheduledCollectionSnapshot({ network, contractId, snapshotTime, emailAddress });
};

const persistScheduledCollectionSnapshot = ({ network, contractId, snapshotTime, emailAddress }) => {
  try {
    const insert = db.prepare(`INSERT INTO ScheduledCollectionSnapshots (network, contractId, snapshotTime, emailAddress) VALUES (?, ?, ?, ?)`);
    insert.run(network, contractId, snapshotTime, emailAddress);
    console.log('Scheduled snapshot persisted successfully.');
  } catch (error) {
    console.error('Failed to persist scheduled snapshot:', error);
  }
};

const removeScheduledCollectionSnapshot = ({ network, contractId, snapshotTime, emailAddress }) => {
  try {
    const del = db.prepare(`DELETE FROM ScheduledCollectionSnapshots WHERE network = ? AND contractId = ? AND snapshotTime = ? AND emailAddress = ?`);
    del.run(network, contractId, snapshotTime, emailAddress);
    console.log('Scheduled snapshot removed successfully.');
  } catch (error) {
    console.error('Failed to remove scheduled snapshot:', error);
  }
};



export const loadAndScheduleCollectionJobs = () => {
  try {
    const select = db.prepare(`SELECT * FROM ScheduledCollectionSnapshots`);
    const rows = select.all();
    rows.forEach((row) => {
      const { network, contractId, snapshotTime, emailAddress } = row;
      const timeUntilSnapshot = new Date(snapshotTime) - new Date();

      if (timeUntilSnapshot > 0) {
        console.log(`Re-scheduling Collection snapshot for contract ${contractId} at ${snapshotTime} for ${emailAddress}`);

        scheduleCollectionSnapshot({ network, contractId, snapshotTime, emailAddress });
      } else {
        console.log(`Skipping past Collection snapshot for contract ${contractId} scheduled at ${snapshotTime}`);
      }
    });
  } catch (error) {
    console.error('Error loading and scheduling snapshots:', error);
  }
};

