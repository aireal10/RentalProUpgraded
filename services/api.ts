
import { supabase } from '../lib/supabaseClient';
import { NewsArticle } from '../types';

// Map entity names to Supabase table names
const TABLE_MAP: Record<string, string> = {
  Property: 'properties',
  Unit: 'units',
  Tenant: 'tenants',
  Contract: 'contracts',
  Invoice: 'invoices',
  Expense: 'expenses',
  LeasePayment: 'lease_payments',
  Partner: 'partners'
};

const createEntityClient = (entityName: string) => {
  const tableName = TABLE_MAP[entityName];

  return {
    list: async (sort: string = 'created_at') => {
      let query = supabase.from(tableName).select('*');
      
      if (sort) {
        const desc = sort.startsWith('-');
        const field = desc ? sort.substring(1) : sort;
        // Assuming sort field corresponds to column name
        query = query.order(field, { ascending: !desc });
      }
      
      const { data, error } = await query;
      if (error) {
          console.error(`Error listing ${entityName}:`, error);
          throw error;
      }
      return data || [];
    },
    create: async (itemData: any) => {
      // Remove undefined keys to avoid Supabase errors
      const cleanData = Object.fromEntries(
        Object.entries(itemData).filter(([_, v]) => v !== undefined)
      );

      const { data, error } = await supabase
        .from(tableName)
        .insert(cleanData)
        .select()
        .single();

      if (error) {
          console.error(`Error creating ${entityName}:`, error);
          throw error;
      }
      return data;
    },
    update: async (id: string, itemData: any) => {
      const cleanData = Object.fromEntries(
        Object.entries(itemData).filter(([_, v]) => v !== undefined)
      );

      const { data, error } = await supabase
        .from(tableName)
        .update(cleanData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
          console.error(`Error updating ${entityName}:`, error);
          throw error;
      }
      return data;
    },
    delete: async (id: string) => {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) {
          console.error(`Error deleting ${entityName}:`, error);
          throw error;
      }
      return;
    },
    bulkCreate: async (itemsData: any[]) => {
      if (itemsData.length === 0) return [];
      const { data, error } = await supabase
        .from(tableName)
        .insert(itemsData)
        .select();

      if (error) {
          console.error(`Error bulk creating ${entityName}:`, error);
          throw error;
      }
      return data;
    },
    bulkDelete: async (ids: string[]) => {
      if (ids.length === 0) return;
      const { error } = await supabase
        .from(tableName)
        .delete()
        .in('id', ids);

      if (error) {
          console.error(`Error bulk deleting ${entityName}:`, error);
          throw error;
      }
      return;
    }
  };
};

// --- Supabase File Upload ---
const uploadFile = async (payload: { file: File, bucket?: string, path?: string }): Promise<{ file_url: string }> => {
    const bucket = payload.bucket || 'uploads';
    const fileExt = payload.file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = payload.path ? `${payload.path}/${fileName}` : fileName;

    const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, payload.file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

    return { file_url: publicUrl };
};

// --- System Functions ---
const backupData = async () => {
    const backup: Record<string, any[]> = {};
    for (const entity of Object.keys(TABLE_MAP)) {
        const tableName = TABLE_MAP[entity];
        const { data, error } = await supabase.from(tableName).select('*');
        if (error) throw error;
        backup[entity] = data || [];
    }
    return backup;
};

const restoreData = async (data: Record<string, any[]>) => {
    if (!data || typeof data !== 'object') throw new Error("Invalid backup file format");
    
    // Order of operations to respect Foreign Keys (approximate)
    const ORDERED_ENTITIES = ['Property', 'Unit', 'Tenant', 'Contract', 'Invoice', 'Expense', 'LeasePayment', 'Partner'];

    for (const entity of ORDERED_ENTITIES) {
        const tableName = TABLE_MAP[entity];
        const records = data[entity];
        if (records && Array.isArray(records) && records.length > 0) {
            // We use upsert to restore data. 
            const { error } = await supabase.from(tableName).upsert(records, { onConflict: 'id' });
            if (error) {
                console.error(`Failed to restore ${entity}:`, error);
                throw error;
            }
        }
    }
    return true;
};

// --- Mock News Data (External API placeholder) ---
const createRecentDate = (daysAgo: number): string => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString();
};

const mockNews: NewsArticle[] = [
    { 
        title: "Saudi real estate market to see SR1.13tn investment by 2030", 
        source: "Arab News", 
        date: createRecentDate(0), 
        url: "#", 
        snippet: "..." 
    },
    { 
        title: "عكاظ: وزارة الإسكان تطلق مبادرات جديدة لتنظيم سوق الإيجار", 
        source: "Okaz", 
        date: createRecentDate(0), 
        url: "#", 
        snippet: "..." 
    },
    { 
        title: "Riyadh real estate prices surge 10% in Q1 2024", 
        source: "Argaam", 
        date: createRecentDate(1), 
        url: "#", 
        snippet: "..." 
    },
    { 
        title: "الرياض: ارتفاع حجم التمويل العقاري السكني للأفراد", 
        source: "Al Riyadh", 
        date: createRecentDate(1), 
        url: "#", 
        snippet: "..." 
    },
    { 
        title: "Saudi Arabia’s non-oil private sector activity remains robust", 
        source: "Saudi Gazette", 
        date: createRecentDate(2), 
        url: "#", 
        snippet: "..." 
    },
    { 
        title: "سبق: تعديلات جديدة في نظام الوساطة العقارية", 
        source: "Sabq", 
        date: createRecentDate(3), 
        url: "#", 
        snippet: "..." 
    },
];

type EntityClient = ReturnType<typeof createEntityClient>;

export const base44 = {
  entities: Object.keys(TABLE_MAP).reduce((acc, name) => {
    acc[name] = createEntityClient(name) as EntityClient;
    return acc;
  }, {} as Record<string, EntityClient>),
  integrations: {
    Core: {
      UploadFile: uploadFile
    }
  },
  system: {
      backup: backupData,
      restore: restoreData
  },
  external: {
      getRealEstateNews: async () => {
          return Promise.resolve(mockNews);
      }
  }
};
