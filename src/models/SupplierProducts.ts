import { Model, DataTypes, Sequelize } from 'sequelize';
import { sequelize } from '../services/database/index.js';

class SupplierProducts extends Model {
  static initModel(sequelize: Sequelize): typeof SupplierProducts {
    return this.init(
      {
        supplierId: {
          type: DataTypes.UUID,
          allowNull: false,
          primaryKey: true,
          references: {
            model: 'Suppliers',
            key: 'id'
          }
        },
        productId: {
          type: DataTypes.UUID,
          allowNull: false,
          primaryKey: true,
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
}

export default SupplierProducts;
