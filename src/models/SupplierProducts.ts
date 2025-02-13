import { Model, DataTypes, Sequelize } from 'sequelize';

export interface SupplierProductsAttributes {
  id?: string;
  supplier_id: string;
  product_id: string;
}

class SupplierProducts extends Model<SupplierProductsAttributes> implements SupplierProductsAttributes {
  public id!: string;
  public supplier_id!: string;
  public product_id!: string;

  static initModel(sequelize: Sequelize): typeof SupplierProducts {
    return this.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        supplier_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'Suppliers',
            key: 'id'
          }
        },
        product_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'Products',
            key: 'id'
          }
        }
      },
      {
        sequelize,
        modelName: 'SupplierProducts',
        tableName: 'SupplierProducts',
        timestamps: true,
      }
    );
  }

  static associate(models: any) {
    // No associations needed as this is a junction table
  }
}

export default SupplierProducts;
