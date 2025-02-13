export default {
  // Auth
  auth: {
    login: "Login",
    register: "Register",
    forgotPassword: "Forgot Password",
    resetPassword: "Reset Password",
    verifyEmail: "Verify Email",
    twoFactor: "Two-Factor Authentication",
  },

  // Navigation & Layout
  navigation: {
    dashboard: "Dashboard",
    pos: "Point of Sale",
    products: "Products",
    categories: "Categories",
    suppliers: "Suppliers",
    customers: "Customers",
    employees: "Employees",
    orders: "Orders",
    returns: "Returns",
    reports: "Reports",
  },

  // Reports Section
  reports: {
    expenses: "Expenses",
    income: "Income",
    performance: "Performance",
    treasury: "Treasury",
    financialReports: "Financial Reports",
  },

  // Products
  products: {
    addProduct: "Add Product",
    productList: "Product List",
    categories: "Categories",
    suppliers: "Suppliers",
  },

  // Customers
  customers: {
    addCustomer: "Add Customer",
    customerList: "Customer List",
    customerDetails: "Customer Details",
    orders: "Orders",
    spent: "Total Spent",
  },

  // Orders
  orders: {
    addOrder: "Add Order",
    orderList: "Order List",
    orderDetails: "Order Details",
    returns: "Returns",
  },

  // Common Actions
  actions: {
    add: "Add",
    edit: "Edit",
    delete: "Delete",
    back: "Back",
    save: "Save",
    cancel: "Cancel",
    confirm: "Confirm",
  },

  // Setup
  setup: {
    accountSetup: "Account Setup",
    businessSetup: "Business Setup",
  },

  // Messages
  messages: {
    loading: "Loading...",
    noData: "No data available",
    error: "An error occurred",
    success: "Operation successful",
  },
} as const; 