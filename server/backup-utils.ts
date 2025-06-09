import { db } from './db';
import fs from 'fs/promises';
import path from 'path';

export class DatabaseBackupManager {
  private backupDir = './backups';

  constructor() {
    this.ensureBackupDirectory();
  }

  private async ensureBackupDirectory() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create backup directory:', error);
    }
  }

  async backupTransferCostOverrides(): Promise<string> {
    try {
      const overrides = await db.execute('SELECT * FROM transfer_cost_overrides ORDER BY created_at DESC');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `transfer_cost_overrides_${timestamp}.sql`;
      const filepath = path.join(this.backupDir, filename);

      let sql = '-- Transfer Cost Overrides Backup\n';
      sql += `-- Created: ${new Date().toISOString()}\n\n`;
      sql += 'DELETE FROM transfer_cost_overrides;\n\n';

      if (overrides.rows && overrides.rows.length > 0) {
        sql += 'INSERT INTO transfer_cost_overrides (override_id, original_cost, override_cost, reason, start_date, end_date, reminder_date, dismissed_at, is_active, created_at, updated_at, buyer_id, product_id) VALUES\n';
        
        const values = overrides.rows.map((row: any) => {
          return `(${row.override_id}, ${row.original_cost}, ${row.override_cost}, ${row.reason ? `'${row.reason.replace(/'/g, "''")}'` : 'NULL'}, '${row.start_date}', ${row.end_date ? `'${row.end_date}'` : 'NULL'}, ${row.reminder_date ? `'${row.reminder_date}'` : 'NULL'}, ${row.dismissed_at ? `'${row.dismissed_at}'` : 'NULL'}, ${row.is_active}, '${row.created_at}', '${row.updated_at}', ${row.buyer_id || 'NULL'}, ${row.product_id})`;
        });

        sql += values.join(',\n');
        sql += ';\n';
      }

      await fs.writeFile(filepath, sql);
      return filepath;
    } catch (error) {
      console.error('Backup failed:', error);
      throw error;
    }
  }

  async restoreFromBackup(backupFile: string): Promise<void> {
    try {
      const sql = await fs.readFile(backupFile, 'utf-8');
      await db.execute(sql);
    } catch (error) {
      console.error('Restore failed:', error);
      throw error;
    }
  }
}

export const backupManager = new DatabaseBackupManager();