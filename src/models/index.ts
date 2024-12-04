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
import SupplierProducts from './SupplierProducts.js';
import User from './User.js';

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
    SupplierProducts: typeof SupplierProducts;
    User: typeof User;
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
        SupplierProducts: SupplierProducts.initModel(sequelize),
        User: User.initModel(sequelize),
    };

    // Call associate methods for all models
    Object.values(models).forEach((model: any) => {
        if (model.associate) {
            model.associate(models);
        }
    });

    return models;
}