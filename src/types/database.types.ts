export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          assigned_project_ids: string[] | null
          company: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          assigned_project_ids?: string[] | null
          company?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id: string
          is_active?: boolean | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          assigned_project_ids?: string[] | null
          company?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      developers: {
        Row: {
          id: string
          name: string
          email: string | null
          phone: string | null
          contact_email: string | null
          contact_phone: string | null
          address: string | null
          description: string | null
          logo_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email?: string | null
          phone?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          address?: string | null
          description?: string | null
          logo_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          phone?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          address?: string | null
          description?: string | null
          logo_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          id: string
          name: string
          developer_id: string
          address: string | null
          city: string | null
          neighborhood: string | null
          description: string | null
          status: Database["public"]["Enums"]["project_status"]
          project_status: Database["public"]["Enums"]["project_status"]
          start_date: string | null
          end_date: string | null
          completion_date: string | null
          marketing_start_date: string | null
          model_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          developer_id: string
          address?: string | null
          city?: string | null
          neighborhood?: string | null
          description?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          project_status?: Database["public"]["Enums"]["project_status"]
          start_date?: string | null
          end_date?: string | null
          completion_date?: string | null
          marketing_start_date?: string | null
          model_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          developer_id?: string
          address?: string | null
          city?: string | null
          neighborhood?: string | null
          description?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          project_status?: Database["public"]["Enums"]["project_status"]
          start_date?: string | null
          end_date?: string | null
          completion_date?: string | null
          marketing_start_date?: string | null
          model_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_developer_id_fkey"
            columns: ["developer_id"]
            isOneToOne: false
            referencedRelation: "developers"
            referencedColumns: ["id"]
          }
        ]
      }
      files: {
        Row: {
          id: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          entity_type: "project" | "building" | "floor" | "unit" | "developer" | "general"
          entity_id: string | null
          uploaded_by: string | null
          description: string | null
          tags: string[] | null
          version: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          file_name: string
          file_path: string
          file_size?: number
          file_type: string
          entity_type: "project" | "building" | "floor" | "unit" | "developer" | "general"
          entity_id?: string | null
          uploaded_by?: string | null
          description?: string | null
          tags?: string[] | null
          version?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          entity_type?: "project" | "building" | "floor" | "unit" | "developer" | "general"
          entity_id?: string | null
          uploaded_by?: string | null
          description?: string | null
          tags?: string[] | null
          version?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role:
        | "super_admin"
        | "admin"
        | "developer"
        | "developer_employee"
        | "sales_agent"
        | "supplier"
        | "lawyer"
        | "viewer"
        | "external_marketing"
      project_status:
        | "planning"
        | "in_construction"
        | "marketing"
        | "completed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Convenience types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];

// Entity types
export type User = Tables<'users'>;

// Enums for easy use
export type UserRole = 
  | "super_admin"
  | "admin" 
  | "developer"
  | "developer_employee"
  | "sales_agent"
  | "supplier"
  | "lawyer"
  | "viewer"
  | "external_marketing";

// Hebrew translations for enums
export const UserRoleLabels: Record<UserRole, string> = {
  super_admin: 'מנהל מערכת עליון',
  admin: 'מנהל מערכת',
  developer: 'יזם',
  developer_employee: 'עובד יזם',
  sales_agent: 'איש מכירות',
  supplier: 'ספק',
  lawyer: 'עורך דין',
  viewer: 'צופה',
  external_marketing: 'שיווק חיצוני'
}; 