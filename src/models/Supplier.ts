import { Model, DataTypes, Sequelize } from 'sequelize';
import { sequelize } from '../services/database/index.js';
import Location from './Location.js';
import InventoryItem from './InventoryItem.js';

export interface SupplierAttributes {
  id?: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  country: string;
  businessId: string;
  shopId: string;
}

class Supplier extends Model<SupplierAttributes> implements SupplierAttributes {
  public id!: string;
  public name!: string;
  public email!: string;
  public phone!: string | null;
  public address!: string | null;
  public city!: string | null;
  public region!: string | null;
  public country!: string;
  public businessId!: string;
  public shopId!: string;

  static initModel(sequelize: Sequelize): typeof Supplier {
    return this.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        email: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        phone: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        address: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        city: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        region: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        country: {
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
        shopId: {
          type: DataTypes.UUID,
          allowNull: false,
          field: 'shop_id'
        },
      },
      {
        sequelize,
        tableName: 'Suppliers',
        modelName: 'Supplier',
        timestamps: true,
      }
    );
  }

  static associate(models: any) {
    this.belongsTo(models.BusinessInformation, { foreignKey: 'businessId', as: 'business' });
    this.hasMany(models.InventoryItem, {
      foreignKey: 'supplier_id',
      as: 'inventoryItems'
    });
  }
}

export default Supplier;