import { Model, DataTypes, Sequelize } from 'sequelize';
import { sequelize } from '../services/database/index.js';
import Location from './Location.js';
import Employee from './Employee.js';

export interface UserAttributes {
  id?: string;
  username: string;
  email: string;
  password_hash: string;
  is_staff?: boolean;
  role?: 'shop_owner' | 'manager' | 'seller' | 'admin';
  locationId?: string;
  shopId?: string;  // Add this field
}

class User extends Model<UserAttributes> implements UserAttributes {
  public id!: string;
  public username!: string;
  public email!: string;
  public password_hash!: string;
  public is_staff!: boolean;
  public role!: 'shop_owner' | 'manager' | 'seller' | 'admin';
  public locationId!: string;
  public shopId!: string;  // Add this property

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
          allowNull: true,  // Make it nullable since shop owners might not have a shopId initially
          references: {
            model: 'Shops',
            key: 'id',
          }
        },
      },
      {
        sequelize,
        modelName: 'User',
        timestamps: true,
      }
    );
  }

  static associate(models: any) {
    this.belongsTo(models.Location, { foreignKey: 'locationId', as: 'location' });
    this.hasMany(models.Employee, { foreignKey: 'user_id', as: 'employee' });
    this.belongsTo(models.Shop, { foreignKey: 'shopId', as: 'shop' });  // Add this association
  }
}

export default User;