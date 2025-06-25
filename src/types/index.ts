// User & Auth Types
export type UserRole = 
  | 'super_admin'
  | 'admin'
  | 'developer' 
  | 'developer_employee' 
  | 'sales_agent' 
  | 'supplier'
  | 'lawyer'
  | 'viewer'
  | 'external_marketing';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  developer_id?: string;
  phone?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

// BIM Hierarchy Types
export interface Developer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

export type ProjectStatus = 
  | 'planning' 
  | 'in_construction' 
  | 'marketing' 
  | 'completed';

export interface Project {
  id: string;
  name: string;
  developer_id: string;
  address?: string;
  city?: string;
  description?: string;
  status: ProjectStatus;
  start_date?: string;
  end_date?: string;
  model_url?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  developer?: Developer;
  buildings?: Building[];
}

export interface Building {
  id: string;
  name: string;
  project_id: string;
  floors_count: number;
  model_url?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  project?: Project;
  floors?: Floor[];
}

export interface Floor {
  id: string;
  number: number;
  building_id: string;
  units_count: number;
  created_at: string;
  updated_at: string;
  
  // Relations
  building?: Building;
  units?: Unit[];
}

// Unit Types
export type UnitType = 
  | 'regular' 
  | 'garden' 
  | 'penthouse' 
  | 'duplex' 
  | 'studio';

export type UnitStatus = 
  | 'available' 
  | 'reserved' 
  | 'sold' 
  | 'frozen';

export interface Unit {
  id: string;
  number: string;
  floor_id: string;
  
  // Physical parameters
  built_area?: number;
  garden_area?: number;
  balcony_area?: number;
  rooms_count?: number;
  unit_type?: UnitType;
  model_type?: string;
  directions?: string[];
  is_front_facing: boolean;
  parking_spots: number;
  storage_rooms: number;
  
  // Pricing
  marketing_price?: number;
  linear_price?: number;
  price_20_80?: number;
  
  // Status & contacts
  status: UnitStatus;
  buyer_name?: string;
  sales_agent_id?: string;
  entry_date: string;
  
  model_url?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  floor?: Floor;
  sales_agent?: User;
}

// Task Types
export type TaskStatus = 
  | 'draft'
  | 'todo' 
  | 'in_progress' 
  | 'waiting_approval'
  | 'done' 
  | 'cancelled';

export type TaskPriority = 
  | 'low' 
  | 'medium' 
  | 'high' 
  | 'urgent';

export type TaskCategory = 
  | 'technical'
  | 'marketing'  
  | 'sales'
  | 'approvals'
  | 'administrative';

export type EntityType = 
  | 'project' 
  | 'building' 
  | 'floor' 
  | 'unit' 
  | 'developer';

export interface Task {
  id: string;
  title: string;
  description?: string;
  parent_id?: string;
  level: number;
  status: TaskStatus;
  priority: TaskPriority;
  category: TaskCategory;
  assigned_to?: string;
  entity_type?: EntityType;
  entity_id?: string;
  due_date?: string;
  completed_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  children?: Task[];
  assignee?: User;
  creator?: User;
}

// Document Types
export type DocumentType = 
  | 'floor_plan' 
  | 'specification' 
  | 'marketing_material' 
  | 'legal_document' 
  | 'contract' 
  | 'visualization' 
  | 'other';

export interface Document {
  id: string;
  name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  document_type: DocumentType;
  entity_type?: EntityType;
  entity_id?: string;
  version: number;
  parent_document_id?: string;
  tags?: string[];
  uploaded_by: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  uploader?: User;
  versions?: Document[];
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// Filter Types
export interface UnitFilters {
  status?: UnitStatus[];
  unit_type?: UnitType[];
  rooms_count?: number[];
  min_price?: number;
  max_price?: number;
  sales_agent_id?: string;
  building_id?: string;
  floor_id?: string;
}

export interface TaskFilters {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  category?: TaskCategory[];
  assigned_to?: string;
  entity_type?: EntityType;
  entity_id?: string;
  overdue?: boolean;
}

// Form Types
export interface CreateProjectForm {
  name: string;
  developer_id: string;
  address?: string;
  city?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
}

export interface CreateUnitForm {
  number: string;
  floor_id: string;
  built_area?: number;
  garden_area?: number;
  balcony_area?: number;
  rooms_count?: number;
  unit_type?: UnitType;
  directions?: string[];
  is_front_facing: boolean;
  parking_spots: number;
  storage_rooms: number;
  marketing_price?: number;
  price_20_80?: number;
}

export interface CreateTaskForm {
  title: string;
  description?: string;
  priority: TaskPriority;
  category: TaskCategory;
  assigned_to?: string;
  entity_type?: EntityType;
  entity_id?: string;
  due_date?: string;
  parent_id?: string;
} 