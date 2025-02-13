import { Model, DataTypes, Sequelize } from 'sequelize';
import { sequelize } from '../services/database/index.js';
import BusinessInformation from './BusinessInformation.js';
import Employee from './Employee.js';
import Customer from './Customer.js';
import Product from './Product.js';
import Location from './Location.js';
import Sales from './Sales.js';
import Inventory from './Inventory.js';
import Return from './Return.js';
// import PerformanceMetric from './PerformanceMetric.js';
import ShopSettings from './ShopSettings.js';

export interface ShopAttributes {
  id?: string;
  name: string;
  businessId: string;
  locationId: string;
  status: 'active' | 'inactive';
  type: string;
  shopType?: string;
  contactInfo: {
    phone?: string;
    email: string;
  };
  operatingHours?: {
    monday?: string;
    tuesday?: string;
    wednesday?: string;
    thursday?: string;
    friday?: string;
    saturday?: string;
    sunday?: string;
  } | null;
  manager?: string | null;
}

class Shop extends Model<ShopAttributes> implements ShopAttributes {
  public id!: string;
  public name!: string;
  public businessId!: string;
  public locationId!: string;
  public status!: 'active' | 'inactive';
  public type!: string;
  public shopType?: string;
  public contactInfo!: {
    phone?: string;
    email: string;
  };
  public operatingHours!: {
    monday?: string;
    tuesday?: string;
    wednesday?: string;
    thursday?: string;
    friday?: string;
    saturday?: string;
    sunday?: string;
  } | null;
  public manager!: string | null;

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  static initModel(sequelize: Sequelize): typeof Shop {
    return this.init({
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      businessId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'BusinessInformation',
          key: 'id',
        },
      },
      locationId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'locations',
          key: 'id',
        },
      },
      status: {
        type: DataTypes.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'active',
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      shopType: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      contactInfo: {
        type: DataTypes.JSON,
        allowNull: false,
        validate: {
          hasEmail(value: any) {
            if (!value.email) {
              throw new Error('Contact info must include an email address');
            }
          }
        }
      },
      operatingHours: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      manager: {
        type: DataTypes.STRING,
        allowNull: true,
      }
    }, {
      sequelize,
      modelName: 'Shop',
      timestamps: true,
    });
  }

  static associate(models: any) {
    this.belongsTo(models.BusinessInformation, {
      foreignKey: 'businessId',
      as: 'business',
    });
    this.belongsTo(models.Location, {
      foreignKey: 'locationId',
      as: 'location',
    });
    this.hasMany(models.Employee, {
      foreignKey: 'shopId',
      as: 'employees',
    });
    this.belongsToMany(models.Customer, {
      through: 'CustomerShops',
      foreignKey: 'shop_id',
      otherKey: 'customer_id',
      as: 'customers'
    });
    this.belongsToMany(models.Product, { 
      through: 'ShopProducts', 
      foreignKey: 'shopId', 
      as: 'products' 
    });
    this.hasMany(models.Sales, {
      foreignKey: 'shopId',
      as: 'sales',
    });
    this.hasMany(models.Inventory, {
      foreignKey: {
        name: 'shopId',
        allowNull: false
      },
      onDelete: 'CASCADE'
    });
    this.hasMany(models.User, {
      foreignKey: {
        name: 'shopId',
        allowNull: false
      },
      onDelete: 'CASCADE'
    });
    this.hasMany(models.Return, {
      foreignKey: 'shopId',
      as: 'returns',
    });
    this.hasOne(models.ShopSettings, {
      foreignKey: 'shopId',
      as: 'settings'
    });
  }
}

export default Shop;