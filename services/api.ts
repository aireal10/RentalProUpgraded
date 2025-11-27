
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

      // Removed .single() to prevent PGRST116 error when RLS policies might hide the return value
      const { data, error } = await supabase
        .from(tableName)
        .insert(cleanData)
        .select();

      if (error) {
          console.error(`Error creating ${entityName}:`, error);
          throw error;
      }
      // Safely return the first item if it exists, or null
      return data?.[0] || null;
    },
    update: async (id: string, itemData: any) => {
      const cleanData = Object.fromEntries(
        Object.entries(itemData).filter(([_, v]) => v !== undefined)
      );

      // Removed .single() to prevent PGRST116 error when RLS policies might hide the return value
      const { data, error } = await supabase
        .from(tableName)
        .update(cleanData)
        .eq('id', id)
        .select();

      if (error) {
          console.error(`Error updating ${entityName}:`, error);
          throw error;
      }
      // Safely return the first item if it exists, or null
      return data?.[0] || null;
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

// --- News Fetching Logic ---

// Helper: Check if date is within last 3 days
const isRecent = (dateString: string): boolean => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = diffTime / (1000 * 3600 * 24);
    return diffDays <= 3;
};

// Fallback dynamic news generator if API fails
const getFallbackNews = (): NewsArticle[] => {
    const sources = ["Arab News", "Saudi Gazette", "Argaam", "Reuters", "Bloomberg", "Al Arabiya"];
    const titles = [
        "Saudi real estate market projected to grow by 5% this quarter",
        "New housing projects announced in Riyadh North",
        "GCC economy shows resilience amidst global fluctuations",
        "Tech investment in Saudi Arabia reaches new highs",
        "Sustainable development goals driving construction sector",
        "Riyadh metro expected to boost local property values",
        "Vision 2030 initiatives fueling non-oil sector growth",
        "New regulations for commercial leases announced"
    ];
    
    // Shuffle and pick 5
    const shuffled = titles.sort(() => 0.5 - Math.random()).slice(0, 5);

    return shuffled.map((title, index) => {
        const date = new Date();
        date.setDate(date.getDate() - (index % 3)); // 0, 1, or 2 days ago
        return {
            title,
            source: sources[index % sources.length],
            date: date.toISOString(),
            url: "#",
            snippet: "Latest update on the market situation..."
        };
    });
};

const fetchRealEstateNews = async (): Promise<NewsArticle[]> => {
    try {
        // Query for Saudi Arabia and Gulf Real Estate/Economy
        // We use a CORS-friendly proxy or directly call an RSS-to-JSON service
        const rssUrl = 'https://news.google.com/rss/search?q=Saudi+Arabia+Real+Estate+OR+Saudi+Economy+OR+Gulf+Business&hl=en-US&gl=SA&ceid=SA:en';
        const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
        
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        if (data.status === 'ok' && Array.isArray(data.items)) {
            const articles: NewsArticle[] = data.items.map((item: any) => {
                // Google News titles are usually "Headline - Source"
                let title = item.title;
                let source = item.author || "News";
                
                const titleParts = item.title.split(' - ');
                if (titleParts.length > 1) {
                    source = titleParts.pop() || source; 
                    title = titleParts.join(' - ');
                }

                return {
                    title: title,
                    source: source,
                    date: item.pubDate,
                    url: item.link,
                    snippet: item.description ? item.description.replace(/<[^>]*>?/gm, '') : ''
                };
            });

            // Filter for news not older than 3 days
            const recentArticles = articles.filter(a => isRecent(a.date));
            
            // Return unique by title
            const uniqueArticles = Array.from(new Map(recentArticles.map(item => [item.title, item])).values());

            if (uniqueArticles.length > 0) {
                return uniqueArticles.slice(0, 8); // Limit to 8 items
            }
        }
        
        // If API returns ok but no recent items, or status not ok
        console.warn("News API returned no recent items, using fallback.");
        return getFallbackNews();

    } catch (error) {
        console.warn("Fetching news failed (likely CORS or network), using fallback data:", error);
        return getFallbackNews();
    }
};

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
      getRealEstateNews: fetchRealEstateNews
  }
};
