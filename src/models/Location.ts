import { Model, DataTypes, Sequelize } from 'sequelize';
import { sequelize } from '../services/database/index.js';
import Shop from './Shop.js';
import Supplier from './Supplier.js';

export interface LocationAttributes {
  id?: string;
  address: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: {
    name: string;
    code?: string;
  };
}

class Location extends Model<LocationAttributes> implements LocationAttributes {
  public id!: string;
  public address!: string | null;
  public city!: string | null;
  public region!: string | null;
  public postalCode!: string | null;
  public country!: {
    name: string;
    code?: string;
  };

  static initModel(sequelize: Sequelize): typeof Location {
    return this.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
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
        postalCode: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        country: {
          type: DataTypes.JSON,
          allowNull: false,
          validate: {
            hasName(value: any) {
              if (!value.name) {
                throw new Error('Country must include a name');
              }
            }
          }
        }
      },
      {
        sequelize,
        modelName: 'Location',
        tableName: 'locations',
        timestamps: true,
      }
    );
  }

  static associate(models: any) {
    this.hasMany(models.Shop, { foreignKey: 'locationId', as: 'shops' });
    this.hasMany(models.Supplier, { foreignKey: 'locationId', as: 'suppliers' });
  }
}

export default Location;