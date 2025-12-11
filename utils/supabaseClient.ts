// Supabase Client Configuration
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tfvgbybllozijozncser.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmdmdieWJsbG96aWpvem5jc2VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMjM4OTcsImV4cCI6MjA4MDg5OTg5N30.Fxxl4dZfSAXhpGayMcXCb7gN3nv-VSDwQrTw42n1Tnw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database Types (matching Supabase schema)
export interface DbCategory {
    id: string;
    name: string;
    icon: string;
    keywords: string[];
    is_default: boolean;
    order_index: number;
    created_at: string;
}

export interface DbLink {
    id: string;
    url: string;
    og_title: string;
    custom_title: string | null;
    og_image: string;
    og_description: string | null;
    category_id: string;
    is_favorite: boolean;
    is_public: boolean;
    is_featured: boolean;
    created_at: string;
}
