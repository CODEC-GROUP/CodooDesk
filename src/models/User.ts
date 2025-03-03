import { Model, DataTypes, Sequelize } from 'sequelize';
import { sequelize } from '../services/database/index.js';
import Location from './Location.js';
import Employee from './Employee.js';
import Sales from './Sales.js'; // Add this import

export interface UserAttributes {
  id?: string;
  username: string;
  email: string;
  password_hash: string;
  is_staff?: boolean;
  role?: 'shop_owner' | 'manager' | 'seller' | 'admin';
  locationId?: string;
  shopId?: string;  
}

class User extends Model<UserAttributes> implements UserAttributes {
  public id!: string;
  public username!: string;
  public email!: string;
  public password_hash!: string;
  public is_staff!: boolean;
  public role!: 'shop_owner' | 'manager' | 'seller' | 'admin';
  public locationId!: string;
  public shopId!: string;  

  static initModel(sequelize: Sequelize): typeof User {
    return this.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        username: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
        },
        email: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
        },
        password_hash: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        is_staff: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
          allowNull: true,
        },
        role: {
          type: DataTypes.ENUM('shop_owner', 'manager', 'seller', 'admin'),
          defaultValue: 'shop_owner',
          allowNull: true,
        },
        locationId: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        shopId: {
          type: DataTypes.UUID,
          allowNull: true,  
          references: {
            model: 'Shops',
            key: 'id',
          }
        },
      },
      {
        sequelize,
        tableName: 'Users',
        modelName: 'User',
        timestamps: true,
      }
    );
  }

  static associate(models: any) {
    this.belongsTo(models.Location, { foreignKey: 'locationId', as: 'location' });
    this.hasMany(models.Employee, { 
      foreignKey: 'userId',
      as: 'user'
    });
    this.belongsTo(models.Shop, { foreignKey: 'shopId', as: 'shop' });  
    this.hasMany(models.Sales, { foreignKey: 'salesPersonId', as: 'sales' }); 
  }
}

export default User;