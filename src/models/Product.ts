import { Model, DataTypes, Sequelize } from 'sequelize';
import { sequelize } from '../services/database/index.js';
import Category, { CategoryAttributes } from './Category.js';
import Shop, { ShopAttributes } from './Shop.js';

export interface ProductAttributes {
  id?: string;
  name: string;
  sku?: string;
  sellingPrice: number;
  quantity: number;
  description: string | null;
  category_id: string | null;
  shop_id: string;
  status: 'high_stock' | 'medium_stock' | 'low_stock' | 'out_of_stock';
  unitType?: string;
  purchasePrice: number;
  featuredImage: string | null;
  additionalImages: string[] | null;
  reorderPoint: number;
  minimumStockLevel?: number;
  maximumStockLevel?: number;
  valuationMethod: 'FIFO' | 'LIFO' | 'AVERAGE_COST';
  hasExpiryDate: boolean;
  hasBatchTracking: boolean;
  createdAt?: Date;
  updatedAt?: Date;  
}

export interface ProductInstance extends Model<ProductAttributes>, ProductAttributes {
  category?: CategoryAttributes | null;
  shop?: ShopAttributes | null;
}

class Product extends Model<ProductAttributes> implements ProductAttributes {
  public id!: string;
  public name!: string;
  public sku!: string;
  public sellingPrice!: number;
  public quantity!: number;
  public description!: string | null;
  public category_id!: string | null;
  public shop_id!: string;
  public status!: 'high_stock' | 'medium_stock' | 'low_stock' | 'out_of_stock';
  public unitType?: string;
  public purchasePrice!: number;
  public featuredImage!: string | null;
  public additionalImages!: string[] | null;
  public reorderPoint!: number;
  public minimumStockLevel?: number;
  public maximumStockLevel?: number;
  public valuationMethod!: 'FIFO' | 'LIFO' | 'AVERAGE_COST';
  public hasExpiryDate!: boolean;
  public hasBatchTracking!: boolean;
  public createdAt!: Date;
  public updatedAt!: Date;

  static initModel(sequelize: Sequelize): typeof Product {
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
        sku: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
        },
        sellingPrice: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
        },
        quantity: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        category_id: {
          type: DataTypes.UUID,
          allowNull: true,
        },
        shop_id: {
          type: DataTypes.UUID,
          allowNull: false,
        },
        status: {
          type: DataTypes.ENUM('high_stock', 'medium_stock', 'low_stock', 'out_of_stock'),
          allowNull: false,
          defaultValue: 'high_stock'
        },
        unitType: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        purchasePrice: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
        },
        featuredImage: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        additionalImages: {
          type:  DataTypes.JSON,
          allowNull: true,
          defaultValue: [],
        },
        reorderPoint: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 10
        },
        minimumStockLevel: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        maximumStockLevel: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
        valuationMethod: {
          type: DataTypes.ENUM('FIFO', 'LIFO', 'AVERAGE_COST'),
          allowNull: false,
          defaultValue: 'FIFO',
        },
        hasExpiryDate: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        hasBatchTracking: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW
        }
      },
      {
        sequelize,
        tableName: 'Products',
        modelName: 'Product',
        timestamps: true,
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
        hooks: {
          beforeValidate: async (product: Product) => {
            // Auto-generate SKU if not provided
            if (!product.sku) {
              const timestamp = Date.now().toString(36);
              const randomStr = Math.random().toString(36).substring(2, 5);
              product.sku = `PRD-${timestamp}-${randomStr}`.toUpperCase();
            }
            // Ensure additionalImages is always an array
            if (!product.additionalImages) {
              product.additionalImages = [];
            }
          },
          beforeSave: (product: Product) => {
            if (product.quantity <= product.reorderPoint) {
              product.status = 'low_stock';
            } else if (product.quantity <= product.reorderPoint * 2) {
              product.status = 'medium_stock';
            } else {
              product.status = 'high_stock';
            }
          }
        }
      }
    );
  }

  static associate(models: any) {
    this.belongsTo(models.Category, { foreignKey: 'category_id', as: 'category' });
    this.belongsTo(models.Shop, { foreignKey: 'shop_id', as: 'shop' });
    this.hasMany(models.Order, {
      foreignKey: 'product_id',
      as: 'orders'
    });
    this.hasMany(models.ProductVariant, { foreignKey: 'product_id', as: 'variants' });
    this.hasMany(models.BatchTracking, { foreignKey: 'product_id', as: 'batches' });
    this.hasMany(models.PriceHistory, { foreignKey: 'product_id', as: 'priceHistory' });
    this.hasMany(models.Return, { 
      foreignKey: 'productId', 
      as: 'returns',
      constraints: false // Don't enforce foreign key constraints
    });
    this.hasMany(models.Inventory, {
      foreignKey: 'product_id',
      as: 'inventories'
    });
  }
}

export default Product;