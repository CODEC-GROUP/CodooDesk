import { Model, DataTypes, Sequelize, BelongsToManyAddAssociationsMixin } from 'sequelize';
import { sequelize } from '../services/database/index.js';
import Shop from './Shop.js';
import Sales from './Sales.js';

export interface CustomerAttributes {
  id?: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  address: string | null;
  city: string | null;
  region: string | null;
  country: string;
  dateOfBirth: Date;
  segment_id?: string;
}

class Customer extends Model<CustomerAttributes> implements CustomerAttributes {
  public id!: string;
  public first_name!: string;
  public last_name!: string;
  public phone_number!: string;
  public address!: string | null;
  public city!: string | null;
  public region!: string | null;
  public country!: string;
  public dateOfBirth!: Date;
  public segment_id?: string;
  public sales?: Sales[];

  public setShops!: BelongsToManyAddAssociationsMixin<Shop, string>;

  static initModel(sequelize: Sequelize): typeof Customer {
    return this.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true
        },
        first_name: {
          type: DataTypes.STRING,
          allowNull: false
        },
        last_name: {
          type: DataTypes.STRING,
          allowNull: false
        },
        phone_number: {
          type: DataTypes.STRING,
          allowNull: false
        },
        address: {
          type: DataTypes.STRING,
          allowNull: true
        },
        city: {
          type: DataTypes.STRING,
          allowNull: true
        },
        region: {
          type: DataTypes.STRING,
          allowNull: true
        },
        country: {
          type: DataTypes.STRING,
          allowNull: false
        },
        dateOfBirth: {
          type: DataTypes.DATE,
          allowNull: false,
          field: 'date_of_birth'
        }
      },
      {
        sequelize,
        tableName: 'customers',
        modelName: 'Customer',
        underscored: true
      }
    );
  }

  static associate(models: any) {
    this.belongsToMany(models.Shop, {
      through: 'CustomerShops',
      foreignKey: 'customer_id',
      otherKey: 'shop_id',
      as: 'shops'
    });

    this.hasMany(models.Sales, {
      foreignKey: 'customer_id',
      as: 'sales'
    });

    this.belongsTo(models.CustomerSegment, {
      foreignKey: 'segment_id',
      as: 'segment'
    });
  }
}

export default Customer;