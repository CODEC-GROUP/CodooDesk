import { Model, DataTypes, Sequelize } from 'sequelize';

export interface CustomerSegmentAttributes {
  id?: string;
  name: string;
  description?: string;
  criteria: {
    min_purchase_amount?: number;
    min_purchase_frequency?: number;
    loyalty_points?: number;
    custom_rules?: Record<string, any>;
  };
  discount_percentage?: number;
  special_benefits?: string[];
  shop_id: string;
}

class CustomerSegment extends Model<CustomerSegmentAttributes> implements CustomerSegmentAttributes {
  public id!: string;
  public name!: string;
  public description?: string;
  public criteria!: {
    min_purchase_amount?: number;
    min_purchase_frequency?: number;
    loyalty_points?: number;
    custom_rules?: Record<string, any>;
  };
  public discount_percentage?: number;
  public special_benefits?: string[];
  public shop_id!: string;

  static initModel(sequelize: Sequelize): typeof CustomerSegment {
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
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        criteria: {
          type: DataTypes.JSONB,
          allowNull: false,
        },
        discount_percentage: {
          type: DataTypes.FLOAT,
          allowNull: true,
        },
        special_benefits: {
          type: DataTypes.JSON,
          allowNull: true,
          defaultValue: []
        },
        shop_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'Shops',
            key: 'id',
          },
        },
      },
      {
        sequelize,
        modelName: 'CustomerSegment',
        timestamps: true,
      }
    );
  }

  static associate(models: any) {
    this.belongsTo(models.Shop, { foreignKey: 'shop_id', as: 'shop' });
    this.hasMany(models.Customer, {
      foreignKey: 'segmentId',
      as: 'customers'
    });
  }
}

export default CustomerSegment;
