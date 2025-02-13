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
  logging: console.log  // Enable logging for debugging
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

    // Sync all models in correct order
    await sequelize.sync({ 
      force: false, // Set to true in development to reset DB
      alter: process.env.NODE_ENV === 'development' // Auto-update tables in dev
    });

    // Verify core tables exist
    await Promise.all([
      sequelize.models.User.describe(),
      sequelize.models.Shop.describe(),
      sequelize.models.Product.describe(),
      sequelize.models.OhadaCode.describe()
    ]);

    console.log('All tables created successfully');
    return true;
  } catch (error) {
    console.error('Database initialization failed:', error);
    return false;
  }
}

export { sequelize, models };

console.log('Database path:', path.join(process.env.APPDATA || process.env.HOME || '', '.salesbox', 'database.sqlite'));
