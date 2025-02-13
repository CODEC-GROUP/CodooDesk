import { Model, DataTypes, Sequelize } from 'sequelize';
import Shop from './Shop.js';
import Supplier from './Supplier.js';
import Employee from './Employee.js';

export interface BusinessInformationAttributes {
  id?: string;
  ownerId: string;
  fullBusinessName: string;
  businessType: 'retail' | 'wholesale' | 'ecommerce' | 'manufacturing' | 'dropshipping' | 'distribution' | 'subscription' | 'service' | 'consignment' | 'b2b' | 'franchise' | string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode?: string;
  };
  numberOfEmployees?: number | null;
  taxIdNumber?: string | null;
  shopLogo?: string | null;  // Stores relative path to the logo file
  taxationDocuments?: string | null;  // Stores relative path to tax documents
  nationalIdCard?: {
    front: string | null;
    back: string | null;
  } | null;
  shops?: Shop[];
}

class BusinessInformation extends Model<BusinessInformationAttributes> implements BusinessInformationAttributes {
  public id!: string;
  public ownerId!: string;
  public fullBusinessName!: string;
  public businessType!: 'retail' | 'wholesale' | 'ecommerce' | 'manufacturing' | 'dropshipping' | 'distribution' | 'subscription' | 'service' | 'consignment' | 'b2b' | 'franchise' | string;
  public address!: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode?: string;
  };
  public numberOfEmployees!: number | null;
  public taxIdNumber!: string | null;
  public shopLogo!: string | null;
  public taxationDocuments!: string | null;
  public nationalIdCard!: {
    front: string | null;
    back: string | null;
  } | null;

  declare shops?: Shop[];
  declare suppliers?: Supplier[];
  declare employees?: Employee[];

  static initModel(sequelize: Sequelize): typeof BusinessInformation {
    return this.init({
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        ownerId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'Users',
                key: 'id'
            }
        },
        fullBusinessName: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        businessType: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                customValidator(value: string) {
                    const validTypes = ['retail', 'wholesale', 'ecommerce', 'manufacturing', 'dropshipping', 'distribution', 'subscription', 'service', 'consignment', 'b2b', 'franchise'];
                    if (!value || (validTypes.indexOf(value.toLowerCase()) === -1 && value.trim() === '')) {
                        throw new Error('Business type must be one of the predefined types or a custom value');
                    }
                }
            }
        },
        address: {
            type: DataTypes.JSON,
            allowNull: false,
            validate: {
                hasRequiredFields(value: any) {
                    if (!value.street || !value.city || !value.state || !value.country) {
                        throw new Error('Address must include street, city, state, and country');
                    }
                }
            }
        },
        numberOfEmployees: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        taxIdNumber: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        shopLogo: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'Relative path to the shop logo file in storage'
        },
        taxationDocuments: {
            type: DataTypes.STRING,
            allowNull: true,
            comment: 'Relative path to taxation documents in storage'
        },
        nationalIdCard: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: 'Contains paths to the front and back of the national ID card'
        }
    }, {
        sequelize,
        modelName: 'BusinessInformation',
        tableName: 'BusinessInformation',
        timestamps: true,
    });
  }

  static associate(models: any) {
    this.belongsTo(models.User, { foreignKey: 'ownerId', as: 'owner' });
    this.hasMany(models.Shop, { 
      foreignKey: 'businessId',
      as: 'shops'
    });
    this.hasMany(models.Employee, {
      foreignKey: 'businessId',
      as: 'employees'
    });
    // Removing non-existent model associations:
    // this.hasMany(models.AnalyticsReport, {
    //   foreignKey: 'businessId',
    //   as: 'analytics'
    // });
    // this.hasMany(models.BusinessGoal, {
    //   foreignKey: 'businessId',
    //   as: 'goals'
    // });
  }
}

export default BusinessInformation;