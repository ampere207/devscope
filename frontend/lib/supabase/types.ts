export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      repositories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          repo_url: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          repo_url: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          repo_url?: string;
          created_at?: string;
        };
      };
      analyses: {
        Row: {
          id: string;
          repo_id: string;
          graph_data: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          repo_id: string;
          graph_data: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          repo_id?: string;
          graph_data?: Json;
          created_at?: string;
        };
      };
    };
  };
}
