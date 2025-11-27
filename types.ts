
export interface Property {
  id: string;
  name: string;
  property_type: 'Building' | 'Villa' | 'Warehouse' | 'Shop' | 'Office';
  address: string;
  total_investment: number;
  management_commission?: number; // New Field
  is_leased: boolean;
  lease_start_date?: string;
  lease_end_date?: string;
  owner_rent_amount?: number;
  owner_rent_frequency?: '3_months' | '6_months' | 'yearly';
  lease_invoice_url?: string;
  // Utility Accounts (Master/Building)
  electricity_meter?: string;
  water_meter?: string;
  gas_meter?: string;
  internet_account?: string;
  
  // Utility Amounts
  electricity_amount?: number;
  water_amount?: number;
  gas_amount?: number;
  internet_amount?: number;

  // Utility Bills Status
  electricity_bill_paid?: boolean;
  water_bill_paid?: boolean;
  gas_bill_paid?: boolean;
  internet_bill_paid?: boolean;

  // Generator Configuration
  generator_config?: {
    mode: 'simple' | 'smart';
    simple: {
      family_count: number;
      bachelor_count: number;
      start_number: number;
    };
    smart: {
      family: any[];
      bachelor: any[];
    };
  };

  created_at: string;
}

export interface Unit {
  id: string;
  property_id: string;
  unit_number: string;
  unit_type: 'Flat' | 'Room';
  // Detailed Specs
  num_rooms: number;
  num_halls: number;
  num_kitchens: number;
  num_bathrooms: number;
  
  occupancy_type?: 'Family' | 'Bachelor';
  furnished?: boolean;
  has_parking?: boolean;
  
  rent_amount: number;
  status: 'vacant' | 'occupied';
  
  // Utility Accounts (Unit specific)
  electricity_meter?: string;
  water_meter?: string;
  gas_meter?: string;
  internet_account?: string;

  // Utility Amounts
  electricity_amount?: number;
  water_amount?: number;
  gas_amount?: number;
  internet_amount?: number;

  // Utility Bills Status
  electricity_bill_paid?: boolean;
  water_bill_paid?: boolean;
  gas_bill_paid?: boolean;
  internet_bill_paid?: boolean;

  created_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  iqama_number: string;
  iqama_expiry?: string;
  nationality?: string;
  phone: string;
  tenant_type: 'Family' | 'Bachelor';
  id_copy_url?: string;
  created_at: string;
}

export interface Contract {
  id: string;
  tenant_id: string;
  unit_id: string;
  start_date: string;
  end_date: string;
  total_rent: number;
  payment_frequency: 'monthly' | '3_months' | '6_months' | 'yearly';
  security_deposit?: number; // New Field
  advance_payment?: number; // New Field
  contract_url?: string;
  status: 'active' | 'expired' | 'terminated';
  condition_at_move_in?: string; // New Field
  condition_at_move_out?: string; // New Field
  created_at: string;
}

export interface Invoice {
  id: string;
  contract_id: string;
  due_date: string;
  amount: number;
  paid_amount: number;
  status: 'unpaid' | 'partial' | 'paid';
  created_at: string;
}

export interface Expense {
  id: string;
  property_id: string;
  unit_id?: string; // New Field
  category: 'Maintenance' | 'Utilities' | 'Insurance' | 'Taxes' | 'Management Fee' | 'Repairs' | 'Cleaning' | 'Marketing' | 'Legal' | 'Other';
  description: string;
  amount: number;
  deduct_from_deposit?: boolean; // New Field
  date: string;
  created_at: string;
}

export interface LeasePayment {
  id: string;
  property_id: string;
  due_date: string;
  amount: number;
  paid_amount: number;
  status: 'unpaid' | 'partial' | 'paid';
  created_at: string;
}

export interface PartnerShare {
  property_id: string;
  share_percentage: number;
}

export interface Partner {
    id: string;
    name: string;
    shares: PartnerShare[];
    created_at: string;
}

export interface NewsArticle {
    title: string;
    source: string;
    date: string;
    url: string;
    snippet: string;
}
