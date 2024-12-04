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

async function createCustomerShopsTable() {
  const queryInterface = sequelize.getQueryInterface();
  const tables = await queryInterface.showAllTables();
  
  if (!tables.includes('CustomerShops')) {
    await queryInterface.createTable('CustomerShops', {
      customerId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Customers',
          key: 'id'
        }
      },
      shopId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Shops',
          key: 'id'
        }
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });

    // Add composite primary key after table creation
    await queryInterface.addConstraint('CustomerShops', {
      fields: ['customerId', 'shopId'],
      type: 'primary key',
      name: 'CustomerShops_pkey'
    });
  }
}

export async function initDatabase(): Promise<boolean> {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');

    // First sync all tables except CustomerShops
    await sequelize.sync();
    
    // Then handle CustomerShops table separately
    await createCustomerShopsTable();

    
    console.log('Database tables have been synchronized.');

    // Display all tables created
    const tables = await sequelize.getQueryInterface().showAllTables();
    console.log('Tables in the database:', tables);

    return true;
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    return false;
  }
}

export { sequelize, models };

console.log('Database path:', path.join(process.env.APPDATA || process.env.HOME || '', '.salesbox', 'database.sqlite'));
