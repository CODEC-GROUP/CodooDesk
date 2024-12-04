import OhadaCode from '../models/OhadaCode.js'; 

const incomeTypes = {
  SALES: { code: "701", name: "Sales of Goods", description: "Ventes de marchandises" },
  SERVICES: { code: "706", name: "Sales of Services", description: "Prestations de services" },
  DISCOUNTS: { code: "709", name: "Discounts, Rebates, and Allowances Granted", description: "Remises, rabais, et ristournes accordés" },
  LATE_INTEREST: { code: "762", name: "Interest on Late Payments", description: "Intérêts de retard sur paiements" },
  RENTAL: { code: "704", name: "Rental Income", description: "Revenus locatifs" },
  SUBSIDIES: { code: "775", name: "Subsidies and Grants", description: "Subventions et aides" },
  COMMISSION: { code: "706", name: "Commission Income", description: "Revenus de commissions" },
  ASSET_SALES: { code: "775", name: "Gains on Sale of Assets", description: "Gains sur cession d'immobilisations" },
  INVESTMENT: { code: "764", name: "Investment Income", description: "Revenus des placements" },
  OTHER: { code: "707", name: "Other Operating Income", description: "Autres produits d'exploitation" },
  FOREX: { code: "766", name: "Foreign Exchange Gains", description: "Gains de change" }
};

const ohadaCodes = {
  "701": { code: "701", description: "Sales of goods for resale" },
  "704": { code: "704", description: "Rental income" },
  "706": { code: "706", description: "Revenue from services rendered" },
  "707": { code: "707", description: "Miscellaneous operating income" },
  "709": { code: "709", description: "Discounts and rebates on sales" },
  "762": { code: "762", description: "Interest earned on delayed payments from customers" },
  "764": { code: "764", description: "Investment income (such as dividends or interest from investments)" },
  "766": { code: "766", description: "Foreign exchange gains" },
  "775": { code: "775", description: "Operating grants and subsidies" }
};

export async function populateIncomeCodes() {
  try {
    console.log('Populating income codes...');
    
    // First, handle the income types
    for (const key in incomeTypes) {
      const { code, name, description } = incomeTypes[key as keyof typeof incomeTypes];
      try {
        await OhadaCode.create({ 
          code, 
          name, 
          description, 
          type: 'income',
          classification: 'Class 7 - Revenue'
        });
      } catch (error: any) {
        if (error.name === 'SequelizeUniqueConstraintError') {
          console.log(`Code ${code} already exists, skipping...`);
        } else {
          console.error(`Error creating income type ${code}:`, error);
        }
      }
    }

    // Then handle the OHADA codes
    for (const code in ohadaCodes) {
      const { description } = ohadaCodes[code as keyof typeof ohadaCodes];
      try {
        await OhadaCode.create({ 
          code,
          name: description,
          description,
          type: 'income',
          classification: 'Class 7 - Revenue'
        });
      } catch (error: any) {
        if (error.name === 'SequelizeUniqueConstraintError') {
          console.log(`Code ${code} already exists, skipping...`);
        } else {
          console.error(`Error creating OHADA code ${code}:`, error);
        }
      }
    }
    
    console.log('Income codes population completed');
  } catch (error) {
    console.error('Failed to populate income codes:', error);
    throw error;
  }
}

// Run the function if this is the main module
if (import.meta.url === new URL(import.meta.url).href) {
  populateIncomeCodes().catch(console.error);
}