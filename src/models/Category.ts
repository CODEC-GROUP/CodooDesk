import { Model, DataTypes, Sequelize } from 'sequelize';
import BusinessInformation from './BusinessInformation.js';
import Product from './Product.js';

export interface CategoryAttributes {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  businessId: string;
}

class Category extends Model<CategoryAttributes> implements CategoryAttributes {
  public id!: string;
  public name!: string;
  public description!: string | null;
  public image!: string | null;
  public businessId!: string;

  static initModel(sequelize: Sequelize): typeof Category {
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
          type: DataTypes.STRING,
          allowNull: true,
        },
        image: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        businessId: {
          type: DataTypes.UUID,
          allowNull: false,
        },
      },
      {
        sequelize,
        modelName: 'Category',
        timestamps: true,
      }
    );
  }

  static associate(models: any) {
    this.belongsTo(models.BusinessInformation, {
      foreignKey: 'businessId',
      as: 'business'
    });
    this.hasMany(models.Product, { 
      foreignKey: { 
        name: 'category_id',
        allowNull: true
      }, 
      as: 'products'
    });
  }
}

export default Category;