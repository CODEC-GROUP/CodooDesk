import { Sequelize, DataTypes, QueryInterface } from 'sequelize';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { initializeModels } from '../../models/index.js'; 

const homeDir = os.homedir();
const dbPath = path.join(homeDir, '.salesbox');

if (!fs.existsSync(dbPath)) {
  fs.mkdirSync(dbPath, { recursive: true });
}

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(dbPath, 'database.sqlite'),
  // logging: console.log  // Enable logging for debugging
});

const models = initializeModels(sequelize);

/**
 * Initializes the database connection and syncs the models.
 * @returns {Promise<boolean>} True if the database was initialized successfully, false otherwise.
 */
export async function initDatabase(): Promise<boolean> {
  try {
    await sequelize.authenticate();
    console.log('Database connection established');

    await sequelize.sync({ 
      force: false,
      alter: true
    });

    console.log('Database tables synced successfully');
    return true;
  } catch (error) {
    console.error('Database initialization failed:', error);
    return false;
  }
}

export { sequelize, models };

console.log('Database path:', path.join(process.env.APPDATA || process.env.HOME || '', '.salesbox', 'database.sqlite'));
