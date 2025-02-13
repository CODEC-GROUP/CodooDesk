import { Model, DataTypes, Sequelize } from 'sequelize';
import BusinessInformation from './BusinessInformation.js';

export interface BusinessSettingsAttributes {
  id?: string;
  businessId: string;
  profileSettings: {
    language: string;
    timezone: string;
    dateFormat: string;
    currency: string;
  };
  notificationSettings: {
    personalizedOffers: boolean;
    newFeatures: boolean;
    securityAlerts: boolean;
    billingUpdates: boolean;
  };
  securitySettings: {
    requirePasswordChange: boolean;
    passwordExpiryDays: number;
    twoFactorEnabled: boolean;
    sessionTimeout: number;
  };
  unitSettings: {
    weightUnit: 'kg' | 'lb' | 'g';
    volumeUnit: 'l' | 'ml' | 'gallon';
    lengthUnit: 'm' | 'cm' | 'in';
  };
}

class BusinessSettings extends Model<BusinessSettingsAttributes> implements BusinessSettingsAttributes {
  public id!: string;
  public businessId!: string;
  public profileSettings!: {
    language: string;
    timezone: string;
    dateFormat: string;
    currency: string;
  };
  public notificationSettings!: {
    personalizedOffers: boolean;
    newFeatures: boolean;
    securityAlerts: boolean;
    billingUpdates: boolean;
  };
  public securitySettings!: {
    requirePasswordChange: boolean;
    passwordExpiryDays: number;
    twoFactorEnabled: boolean;
    sessionTimeout: number;
  };
  public unitSettings!: {
    weightUnit: 'kg' | 'lb' | 'g';
    volumeUnit: 'l' | 'ml' | 'gallon';
    lengthUnit: 'm' | 'cm' | 'in';
  };

  static initModel(sequelize: Sequelize): typeof BusinessSettings {
    return this.init({
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      businessId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'BusinessInformation',
          key: 'id'
        }
      },
      profileSettings: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {
          language: 'en',
          timezone: 'Africa/Douala',
          dateFormat: 'DD/MM/YYYY',
          currency: 'XAF'
        }
      },
      notificationSettings: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {
          personalizedOffers: true,
          newFeatures: true,
          securityAlerts: true,
          billingUpdates: true
        }
      },
      securitySettings: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {
          requirePasswordChange: false,
          passwordExpiryDays: 90,
          twoFactorEnabled: false,
          sessionTimeout: 30
        }
      },
      unitSettings: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: {
          weightUnit: 'kg',
          volumeUnit: 'l',
          lengthUnit: 'm'
        }
      }
    }, {
      sequelize,
      modelName: 'BusinessSettings',
      timestamps: true,
    });
  }

  static associate(models: any) {
    this.belongsTo(models.BusinessInformation, {
      foreignKey: 'businessId',
      as: 'business'
    });
  }
}

export default BusinessSettings; 