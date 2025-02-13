export default {
  // Auth
  auth: {
    login: "Connexion",
    register: "S'inscrire",
    forgotPassword: "Mot de passe oublié",
    resetPassword: "Réinitialiser le mot de passe",
    verifyEmail: "Vérifier l'email",
    twoFactor: "Authentification à deux facteurs",
  },

  // Navigation & Layout
  navigation: {
    dashboard: "Tableau de bord",
    pos: "Point de vente",
    products: "Produits",
    categories: "Catégories",
    suppliers: "Fournisseurs",
    customers: "Clients",
    employees: "Employés",
    orders: "Commandes",
    returns: "Retours",
    reports: "Rapports",
  },

  // Reports Section
  reports: {
    expenses: "Dépenses",
    income: "Revenus",
    performance: "Performance",
    treasury: "Trésorerie",
    financialReports: "Rapports financiers",
  },

  // Products
  products: {
    addProduct: "Ajouter un produit",
    productList: "Liste des produits",
    categories: "Catégories",
    suppliers: "Fournisseurs",
  },

  // Customers
  customers: {
    addCustomer: "Ajouter un client",
    customerList: "Liste des clients",
    customerDetails: "Détails du client",
    orders: "Commandes",
    spent: "Total dépensé",
  },

  // Orders
  orders: {
    addOrder: "Ajouter une commande",
    orderList: "Liste des commandes",
    orderDetails: "Détails de la commande",
    returns: "Retours",
  },

  // Common Actions
  actions: {
    add: "Ajouter",
    edit: "Modifier",
    delete: "Supprimer",
    back: "Retour",
    save: "Enregistrer",
    cancel: "Annuler",
    confirm: "Confirmer",
  },

  // Setup
  setup: {
    accountSetup: "Configuration du compte",
    businessSetup: "Configuration de l'entreprise",
  },

  // Messages
  messages: {
    loading: "Chargement...",
    noData: "Aucune donnée disponible",
    error: "Une erreur est survenue",
    success: "Opération réussie",
  },
} as const; 