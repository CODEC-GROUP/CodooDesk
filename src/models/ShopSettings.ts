import { Model, DataTypes, Sequelize } from 'sequelize';
import Shop from './Shop.js';
import { ShopSettingsAttributes } from '../types/settings';

class ShopSettings extends Model<ShopSettingsAttributes> implements ShopSettingsAttributes {
  public id!: string;
  public shopId!: string;
  public currency!: string;
  public language!: string;
  public timezone!: string;
  public taxRate!: number;
  public invoicePrefix!: string;
  public receiptPrefix!: string;
  public lowStockThreshold!: number;
  public enableStockAlerts!: boolean;
  public enableCustomerLoyalty!: boolean;
  public pointsPerPurchase?: number;
  public moneyPerPoint?: number;
  public operatingHours!: {
    monday: { open: string; close: string } | null;
    tuesday: { open: string; close: string } | null;
    wednesday: { open: string; close: string } | null;
    thursday: { open: string; close: string } | null;
    friday: { open: string; close: string } | null;
    saturday: { open: string; close: string } | null;
    sunday: { open: string; close: string } | null;
  };
  public orderPrefix!: string;
  declare dateFormat: string;
  declare timeFormat: string;
  public weightUnit!: string;
  public volumeUnit!: string;
  public lengthUnit!: string;

  static initModel(sequelize: Sequelize): typeof ShopSettings {
    return this.init({
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      shopId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Shops',
          key: 'id'
        }
      },
      currency: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'XAF'
      },
      language: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'en'
      },
      timezone: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Africa/Douala'
      },
      taxRate: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 19.25
      },
      invoicePrefix: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'INV'
      },
      receiptPrefix: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'RCP'
      },
      lowStockThreshold: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 10
      },
      enableStockAlerts: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      enableCustomerLoyalty: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      pointsPerPurchase: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      moneyPerPoint: {
        type: DataTypes.FLOAT,
        allowNull: true
      },
      operatingHours: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {
          monday: { open: '08:00', close: '17:00' },
          tuesday: { open: '08:00', close: '17:00' },
          wednesday: { open: '08:00', close: '17:00' },
          thursday: { open: '08:00', close: '17:00' },
          friday: { open: '08:00', close: '17:00' },
          saturday: { open: '09:00', close: '15:00' },
          sunday: null
        }
      },
      orderPrefix: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'ORD'
      },
      dateFormat: {
        type: DataTypes.STRING,
        defaultValue: 'DD/MM/YYYY'
      },
      timeFormat: {
        type: DataTypes.STRING,
        defaultValue: '24h'
      },
      weightUnit: {
        type: DataTypes.STRING,
        defaultValue: 'kg'
      },
      volumeUnit: {
        type: DataTypes.STRING,
        defaultValue: 'l'
      },
      lengthUnit: {
        type: DataTypes.STRING,
        defaultValue: 'm'
      }
    }, {
      sequelize,
      modelName: 'ShopSettings',
      timestamps: true,
    });
  }

  static associate(models: any) {
    this.belongsTo(models.Shop, {
      foreignKey: 'shopId',
      as: 'shop'
    });
  }
}

export default ShopSettings; 