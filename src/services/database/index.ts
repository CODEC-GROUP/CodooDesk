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
  logging: false
});

const models = initializeModels(sequelize);




export async function initDatabase(): Promise<boolean> {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');

    // First sync all tables except junction tables
    await sequelize.sync({alter: true});
    

    return true;
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    return false;
  }
}

export { sequelize, models };

console.log('Database path:', path.join(process.env.APPDATA || process.env.HOME || '', '.salesbox', 'database.sqlite'));
