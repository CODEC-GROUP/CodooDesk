import { Model, DataTypes, Sequelize } from 'sequelize';

export interface SecurityLogAttributes {
  id?: string;
  user_id: string | null;
  event_type: 'login' | 'logout' | 'password_change' | 'failed_login' | 'permission_change' | 'data_access' | 'system_change';
  event_description: string;
  ip_address: string;
  user_agent?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'success' | 'failure' | 'blocked';
  additional_data?: Record<string, any>;
  shop_id?: string | null;
  readonly created_at?: Date;
  readonly updated_at?: Date;
}

export default class SecurityLog extends Model<SecurityLogAttributes> implements SecurityLogAttributes {
  public id!: string;
  public user_id!: string | null;
  public event_type!: 'login' | 'logout' | 'password_change' | 'failed_login' | 'permission_change' | 'data_access' | 'system_change';
  public event_description!: string;
  public ip_address!: string;
  public user_agent?: string;
  public severity!: 'low' | 'medium' | 'high' | 'critical';
  public status!: 'success' | 'failure' | 'blocked';
  public additional_data?: Record<string, any>;
  public shop_id?: string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  static initModel(sequelize: Sequelize): typeof SecurityLog {
    return this.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        user_id: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'Users',
            key: 'id',
          },
        },
        event_type: {
          type: DataTypes.ENUM(
            'login',
            'logout',
            'password_change',
            'failed_login',
            'permission_change',
            'data_access',
            'system_change'
          ),
          allowNull: false,
        },
        event_description: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        ip_address: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        user_agent: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        severity: {
          type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
          allowNull: false,
        },
        status: {
          type: DataTypes.ENUM('success', 'failure', 'blocked'),
          allowNull: false,
        },
        additional_data: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        shop_id: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'Shops',
            key: 'id',
          },
        },
        created_at: {
          type: DataTypes.DATE,
          defaultValue: DataTypes.NOW
        },
        updated_at: {
          type: DataTypes.DATE,
          defaultValue: DataTypes.NOW
        },
      },
      {
        sequelize,
        modelName: 'SecurityLog',
        timestamps: true,
        underscored: true,
        indexes: [
          {
            name: 'security_logs_user_id_event_type_created_at',
            fields: ['user_id', 'event_type', 'created_at']
          },
          {
            fields: ['ip_address'],
          },
          {
            fields: ['severity'],
          },
        ],
      }
    );
  }

  static associate(models: any) {
    this.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
    this.belongsTo(models.Shop, { foreignKey: 'shop_id', as: 'shop' });
  }
}
