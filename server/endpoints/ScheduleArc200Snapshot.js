import schedule from 'node-schedule';
import { transporter } from '../utils/emailConfig.js';
import Database from 'better-sqlite3'
import { getArc200Snapshot } from './arc200Snapshot.js';

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

export const scheduleArc200Snapshot = ({ network, tokenId, snapshotTime, emailAddress }) => {
  const snapshotDate = new Date(snapshotTime);
  console.log(`Scheduling snapshot for token ${tokenId} at ${snapshotDate} for ${emailAddress}`);
  
  schedule.scheduleJob(snapshotDate, async () => {
    console.log(`Executing scheduled snapshot for ${tokenId}`);

    try {

      const Arc200Data = await getArc200Snapshot(network, tokenId);
      const csvHeader = "Address,Amount\n";
      const csvRows = Arc200Data.map(token => `${token.account},${token.amount}`).join('\n');
      const csvContent = csvHeader + csvRows;

    
      console.log(`Generated CSV for ${tokenId}`);
      const mailOptions = {
        from: 'treehousetools@hotmail.com',
        to: emailAddress,
        subject: 'Scheduled ARC 200 Snapshot',
        text: `Attached is your scheduled ARC 200 snapshot for token ID: ${tokenId}. Thank you for using the treehouse toolbox.`,
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
              console.log(`Error sending email for ${tokenId}:`, error);
              reject(error);
            } else {
              console.log(`Email sent for ${tokenId}: ` + info.response);
              removeScheduledArc200Snapshot({ network, tokenId, snapshotTime, emailAddress });
              resolve(info);
            }
          });
        });
      });
      
    } catch (error) {
      console.error(`Failed to generate or send snapshot for ${tokenId}:`, error);
    }
  });

  persistScheduledArc200Snapshot({ network, tokenId, snapshotTime, emailAddress });
};

const persistScheduledArc200Snapshot = ({ network, tokenId, snapshotTime, emailAddress }) => {
  try {
    const insert = db.prepare(`INSERT INTO ScheduledArc200Snapshots (network, tokenId, snapshotTime, emailAddress) VALUES (?, ?, ?, ?)`);
    insert.run(network, tokenId, snapshotTime, emailAddress);
    console.log('Scheduled snapshot persisted successfully.');
  } catch (error) {
    console.error('Failed to persist scheduled snapshot:', error);
  }
};

const removeScheduledArc200Snapshot = ({ network, tokenId, snapshotTime, emailAddress }) => {
  try {
    const del = db.prepare(`DELETE FROM ScheduledArc200Snapshots WHERE network = ? AND tokenId = ? AND snapshotTime = ? AND emailAddress = ?`);
    del.run(network, tokenId, snapshotTime, emailAddress);
    console.log('Scheduled snapshot removed successfully.');
  } catch (error) {
    console.error('Failed to remove scheduled snapshot:', error);
  }
};



export const loadAndScheduleArc200Jobs = () => {
  try {
    const select = db.prepare(`SELECT * FROM ScheduledArc200Snapshots`);
    const rows = select.all();
    rows.forEach((row) => {
      const { network, tokenId, snapshotTime, emailAddress } = row;
      const timeUntilSnapshot = new Date(snapshotTime) - new Date();

      if (timeUntilSnapshot > 0) {
        console.log(`Re-scheduling Arc 200 snapshot for token ${tokenId} at ${snapshotTime} for ${emailAddress}`);
        scheduleCollectionSnapshot({ network, tokenId, snapshotTime, emailAddress });
      } else {
        console.log(`Skipping past arc200 snapshot for token ${tokenId} scheduled at ${snapshotTime}`);
      }
    });
  } catch (error) {
    console.error('Error loading and scheduling snapshots:', error);
  }
};
