// Import models
import BusinessInformation from './BusinessInformation.js';
import Category from './Category.js';
import Customer from './Customer.js';
import Employee from './Employee.js';
import Expense from './Expense.js';
import Income from './Income.js';
import Inventory from './Inventory.js';
import InventoryItem from './InventoryItem.js';
import Invoice from './Invoice.js';
import Location from './Location.js';
import OhadaCode from './OhadaCode.js';
import Order from './Order.js';
import Payment from './Payment.js';
import Product from './Product.js';
import Receipt from './Receipt.js';
import Return from './Return.js';
import Sales from './Sales.js';
import Shop from './Shop.js';
import Supplier from './Supplier.js';
import User from './User.js';
import AuditLog from './AuditLog.js';
import BusinessSettings from './BusinessSettings.js';
import ShopSettings from './ShopSettings.js';
import StockMovement from './StockMovement.js';
import ProductVariant from './ProductVariant.js';
import BatchTracking from './BatchTracking.js';
import PriceHistory from './PriceHistory.js';
import CustomerSegment from './CustomerSegment.js';
import SecurityLog from './SecurityLog.js';

// Create models type
interface Models {
    BusinessInformation: typeof BusinessInformation;
    Category: typeof Category;
    Customer: typeof Customer;
    Employee: typeof Employee;
    Expense: typeof Expense;
    Income: typeof Income;
    Inventory: typeof Inventory;
    InventoryItem: typeof InventoryItem;
    Invoice: typeof Invoice;
    Location: typeof Location;
    OhadaCode: typeof OhadaCode;
    Order: typeof Order;
    Payment: typeof Payment;
    Product: typeof Product;
    Receipt: typeof Receipt;
    Return: typeof Return;
    Sales: typeof Sales;
    Shop: typeof Shop;
    Supplier: typeof Supplier;
    User: typeof User;
    AuditLog: typeof AuditLog;
    BusinessSettings: typeof BusinessSettings;
    ShopSettings: typeof ShopSettings;
    StockMovement: typeof StockMovement;
    ProductVariant: typeof ProductVariant;
    BatchTracking: typeof BatchTracking;
    PriceHistory: typeof PriceHistory;
    CustomerSegment: typeof CustomerSegment;
    SecurityLog: typeof SecurityLog;
}

export function initializeModels(sequelize: any): Models {
    const models: Models = {
        BusinessInformation: BusinessInformation.initModel(sequelize),
        Category: Category.initModel(sequelize),
        Customer: Customer.initModel(sequelize),
        Employee: Employee.initModel(sequelize),
        Expense: Expense.initModel(sequelize),
        Income: Income.initModel(sequelize),
        Inventory: Inventory.initModel(sequelize),
        InventoryItem: InventoryItem.initModel(sequelize),
        Invoice: Invoice.initModel(sequelize),
        Location: Location.initModel(sequelize),
        OhadaCode: OhadaCode.initModel(sequelize),
        Order: Order.initModel(sequelize),
        Payment: Payment.initModel(sequelize),
        Product: Product.initModel(sequelize),
        Receipt: Receipt.initModel(sequelize),
        Return: Return.initModel(sequelize),
        Sales: Sales.initModel(sequelize),
        Shop: Shop.initModel(sequelize),
        Supplier: Supplier.initModel(sequelize),
        User: User.initModel(sequelize),
        AuditLog: AuditLog.initModel(sequelize),
        BusinessSettings: BusinessSettings.initModel(sequelize),
        ShopSettings: ShopSettings.initModel(sequelize),
        StockMovement: StockMovement.initModel(sequelize),
        ProductVariant: ProductVariant.initModel(sequelize),
        BatchTracking: BatchTracking.initModel(sequelize),
        PriceHistory: PriceHistory.initModel(sequelize),
        CustomerSegment: CustomerSegment.initModel(sequelize),
        SecurityLog: SecurityLog.initModel(sequelize),
    };

    // Call associate methods for all models
    Object.values(models).forEach((model: any) => {
        if (model.associate) {
            console.log(`Setting up associations for model: ${model.name}`);
            model.associate(models);
        }
    });

    // Log initialized models
    console.log('Initialized models:', Object.keys(models));

    return models;
}

// Update the exports to use default exports
export { default as CustomerSegment } from './CustomerSegment.js';
export { default as Customer } from './Customer.js';
export { default as Sales } from './Sales.js';
export { default as BatchTracking } from './BatchTracking.js';
export { default as Product } from './Product.js';
export { default as Supplier } from './Supplier.js';
export { default as Shop } from './Shop.js';