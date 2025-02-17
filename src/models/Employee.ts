import { Model, DataTypes, Sequelize } from 'sequelize';
import { sequelize } from '../services/database/index.js';
import User from './User.js';
import Shop from './Shop.js';
import Sales from './Sales.js';
import Business from './BusinessInformation.js';
import AuditLog from './AuditLog.js';
import SecurityLog from './SecurityLog.js';

export interface EmployeeAttributes {
  id?: string;
  userId: string;
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  role: 'shop_owner' | 'manager' | 'seller' | 'admin';
  hireDate: Date;
  status: 'active' | 'inactive' | 'terminated';
  description?: string;
  shopId: string;
  businessId: string; // Added businessId
  country?: string;
  address?: string;
  dateOfBirth?: Date;
  nationalId?: string;
  employmentStatus: 'full-time' | 'part-time' | 'contract' | 'intern';
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  education?: {
    degree: string;
    institution: string;
    graduationYear: number;
  };
  salary: number;
  username?: string;
  password?: string;
}

class Employee extends Model<EmployeeAttributes> implements EmployeeAttributes {
  public id!: string;
  public userId!: string;
  public firstName!: string;
  public lastName?: string;
  public email!: string;
  public phone?: string;
  public role!: 'shop_owner' | 'manager' | 'seller' | 'admin';
  public hireDate!: Date;
  public status!: 'active' | 'inactive' | 'terminated';
  public description?: string;
  public shopId!: string;
  public businessId!: string; // Added businessId
  public country?: string;
  public address?: string;
  public dateOfBirth?: Date;
  public nationalId?: string;
  public employmentStatus!: 'full-time' | 'part-time' | 'contract' | 'intern';
  public emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  public education?: {
    degree: string;
    institution: string;
    graduationYear: number;
  };
  public salary!: number;
  public username?: string;
  public password?: string;
  declare sales?: Sales[];
  declare shop?: Shop;

  static initModel(sequelize: Sequelize): typeof Employee {
    return this.init({
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        }
      },
      firstName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      lastName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isEmail: true
        }
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      role: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      hireDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      status: {
        type: DataTypes.ENUM('active', 'inactive', 'terminated'),
        defaultValue: 'active',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      shopId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Shops',
          key: 'id'
        }
      },
      businessId: { // Added businessId
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'BusinessInformation',
          key: 'id'
        }
      },
      country: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      address: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      dateOfBirth: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      nationalId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      employmentStatus: {
        type: DataTypes.ENUM('full-time', 'part-time', 'contract', 'intern'),
        defaultValue: 'full-time',
      },
      emergencyContact: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      education: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      salary: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
      }
    }, {
      sequelize,
      modelName: 'Employee',
      tableName: 'Employees',
      timestamps: true,
    });
  }

  static associate(models: any) {
    this.belongsTo(models.User, { 
      foreignKey: 'userId',
      as: 'user'
    });
    this.belongsTo(models.Shop, { foreignKey: 'shopId', as: 'shop' });
    this.belongsTo(models.BusinessInformation, { foreignKey: 'businessId', as: 'business' });
    this.hasMany(models.Sales, {
      foreignKey: 'employeeId',
      as: 'sales'
    });
    this.hasMany(models.AuditLog, { 
      foreignKey: 'userId',
      sourceKey: 'userId',
      as: 'activities'
    });
  }
}

export default Employee;