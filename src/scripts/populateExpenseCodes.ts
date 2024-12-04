import OhadaCode from '../models/OhadaCode.js'; 

const expenseTypes = {
  RENT_UTILITIES: { code: "612/614", name: "Rent and Utilities", description: "Loyer et charges" },
  SALARIES: { code: "641/645", name: "Salaries and Social Contributions", description: "Salaires et charges sociales" },
  SUPPLIES: { code: "601/602", name: "Supplies and Inventory", description: "Fournitures et stocks" },
  INSURANCE: { code: "616", name: "Insurance", description: "Assurances" },
  ADVERTISING: { code: "623", name: "Advertising and Marketing", description: "Publicité et marketing" },
  MAINTENANCE: { code: "615", name: "Maintenance and Repairs", description: "Entretien et réparations" },
  TRANSPORT: { code: "624", name: "Transportation and Delivery Fees", description: "Frais de transport et livraison" },
  ADMIN: { code: "626", name: "Administrative Costs", description: "Frais administratifs" },
  TAXES: { code: "635", name: "Taxes and Duties", description: "Impôts et taxes" },
  BANK_FEES: { code: "627", name: "Bank Fees", description: "Frais bancaires" },
  LEGAL: { code: "622", name: "Legal and Accounting Fees", description: "Frais juridiques et comptables" }
};

const ohadaCodes = {
  "601": { code: "601", description: "Purchases of goods for resale" },
  "602": { code: "602", description: "Purchases of materials and supplies" },
  "612": { code: "612", description: "Rent" },
  "614": { code: "614", description: "Utilities (water, electricity, gas)" },
  "616": { code: "616", description: "Insurance premiums" },
  "622": { code: "622", description: "Fees for professional services (legal, accounting, etc.)" },
  "623": { code: "623", description: "Advertising and promotional expenses" },
  "624": { code: "624", description: "Transportation and freight" },
  "626": { code: "626", description: "Office supplies and administrative expenses" },
  "627": { code: "627", description: "Banking services and transaction fees" },
  "635": { code: "635", description: "Taxes and duties other than income tax (including VAT)" }
};

export async function populateExpenseCodes() {
  try {
    console.log('Populating expense codes...');
    
    // First, handle the expense types
    for (const key in expenseTypes) {
      const { code, name, description } = expenseTypes[key as keyof typeof expenseTypes];
      try {
        await OhadaCode.create({ 
          code, 
          name, 
          description, 
          type: 'expense', 
          classification: 'Class 6 - Expenses'
        });
      } catch (error: any) {
        if (error.name === 'SequelizeUniqueConstraintError') {
          console.log(`Code ${code} already exists, skipping...`);
        } else {
          console.error(`Error creating expense type ${code}:`, error);
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
          type: 'expense',
          classification: 'Class 6 - Expenses'
        });
      } catch (error: any) {
        if (error.name === 'SequelizeUniqueConstraintError') {
          console.log(`Code ${code} already exists, skipping...`);
        } else {
          console.error(`Error creating OHADA code ${code}:`, error);
        }
      }
    }
    
    console.log('Expense codes population completed');
  } catch (error) {
    console.error('Failed to populate expense codes:', error);
    throw error;
  }
}

// Run the function if this is the main module
if (import.meta.url === new URL(import.meta.url).href) {
  populateExpenseCodes().catch(console.error);
}