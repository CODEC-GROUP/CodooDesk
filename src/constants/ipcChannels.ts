export const IPC_CHANNELS = {
  // Finance dashboard channels
  GET_FINANCE_DASHBOARD: 'finance:dashboard:get',
  GET_FINANCE_TRENDS: 'dashboard:finance:trends',
  GET_EXPENSE_BREAKDOWN: 'dashboard:finance:expenses',
  GET_INCOME_BREAKDOWN: 'dashboard:finance:income',
  GET_FINANCE_OVERVIEW: 'dashboard:finance:overview',

  // Inventory dashboard channels
  GET_INVENTORY_DASHBOARD: 'dashboard:inventory:get',
  GET_INVENTORY_TRENDS: 'dashboard:inventory:trends',
  
  // Sales dashboard channels
  GET_SALES_DASHBOARD: 'dashboard:sales:get',
  GET_TOP_PRODUCTS: 'dashboard:products:top',
  
  // Customer dashboard channels
  GET_CUSTOMER_DASHBOARD: 'dashboard:customer:get',
  GET_CUSTOMER_TRENDS: 'dashboard:customer:trends'
};

export const DASHBOARD_CHANNELS = {
  GET_MAIN: 'dashboard:getMain',
  GET_FINANCE_DASHBOARD: 'dashboard:finance:get',
  GET_INVENTORY_DASHBOARD: 'dashboard:inventory:get',
  GET_SALES_DASHBOARD: 'dashboard:sales:get',
  GET_CUSTOMER_DASHBOARD: 'dashboard:customer:get'
}; 