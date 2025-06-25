import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Project, Building, Floor, Unit } from '../types';

export interface ProjectHierarchy extends Project {
  buildings: (Building & {
    floors: (Floor & {
      units: Unit[];
    })[];
  })[];
}

interface ProjectsStore {
  projects: Project[];
  currentProject: ProjectHierarchy | null;
  loading: boolean;
  
  // Actions
  setProjects: (projects: Project[]) => void;
  setCurrentProject: (project: ProjectHierarchy | null) => void;
  setLoading: (loading: boolean) => void;
  
  // API Actions
  loadProjects: (developerId?: string) => Promise<void>;
  loadProjectHierarchy: (projectId: string) => Promise<void>;
  createProject: (project: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => Promise<Project>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  
  // Helper functions
  getProjectById: (id: string) => Project | undefined;
  getProjectsCount: () => number;
  getCurrentProjectStats: () => {
    totalBuildings: number;
    totalFloors: number;
    totalUnits: number;
    soldUnits: number;
    availableUnits: number;
  };
}

export const useProjectsStore = create<ProjectsStore>((set, get) => ({
  projects: [],
  currentProject: null,
  loading: false,

  setProjects: (projects) => set({ projects }),
  setCurrentProject: (project) => set({ currentProject: project }),
  setLoading: (loading) => set({ loading }),

  loadProjects: async (developerId) => {
    set({ loading: true });
    try {
      let query = supabase
        .from('projects')
        .select(`
          *,
          developer:developers(*)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (developerId) {
        query = query.eq('developer_id', developerId);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      set({ projects: data || [] });
    } catch (error) {
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  loadProjectHierarchy: async (projectId: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          developer:developers(*),
          buildings!inner(
            *,
            floors!inner(
              *,
              units(*)
            )
          )
        `)
        .eq('id', projectId)
        .eq('is_active', true)
        .eq('buildings.is_active', true)
        .eq('buildings.floors.is_active', true)
        .eq('buildings.floors.units.is_active', true)
        .single();

      if (error) {
        throw error;
      }

      set({ currentProject: data });
    } catch (error) {
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  createProject: async (projectData) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert([projectData])
        .select(`
          *,
          developer:developers(*)
        `)
        .single();

      if (error) {
        throw error;
      }

      // Add to projects list
      const { projects } = get();
      set({ projects: [data, ...projects] });

      return data;
    } catch (error) {
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateProject: async (id: string, updates) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          developer:developers(*)
        `)
        .single();

      if (error) {
        throw error;
      }

      // Update in projects list
      const { projects, currentProject } = get();
      const updatedProjects = projects.map(p => p.id === id ? data : p);
      set({ projects: updatedProjects });

      // Update current project if it's the one being updated
      if (currentProject?.id === id) {
        set({ currentProject: { ...currentProject, ...data } });
      }
    } catch (error) {
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  deleteProject: async (id: string) => {
    set({ loading: true });
    try {
      const { error } = await supabase
        .from('projects')
        .update({ is_active: false })
        .eq('id', id);

      if (error) {
        throw error;
      }

      // Remove from projects list
      const { projects, currentProject } = get();
      const filteredProjects = projects.filter(p => p.id !== id);
      set({ projects: filteredProjects });

      // Clear current project if it's the one being deleted
      if (currentProject?.id === id) {
        set({ currentProject: null });
      }
    } catch (error) {
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // Helper functions
  getProjectById: (id: string) => {
    const { projects } = get();
    return projects.find(p => p.id === id);
  },

  getProjectsCount: () => {
    const { projects } = get();
    return projects.length;
  },

  getCurrentProjectStats: () => {
    const { currentProject } = get();
    
    if (!currentProject) {
      return {
        totalBuildings: 0,
        totalFloors: 0,
        totalUnits: 0,
        soldUnits: 0,
        availableUnits: 0,
      };
    }

    const totalBuildings = currentProject.buildings?.length || 0;
    
    const totalFloors = currentProject.buildings?.reduce(
      (sum, building) => sum + (building.floors?.length || 0), 0
    ) || 0;
    
    const allUnits = currentProject.buildings?.flatMap(
      building => building.floors?.flatMap(floor => floor.units || []) || []
    ) || [];
    
    const totalUnits = allUnits.length;
    const soldUnits = allUnits.filter(unit => unit.status === 'sold').length;
    const availableUnits = allUnits.filter(unit => unit.status === 'available').length;

    return {
      totalBuildings,
      totalFloors,
      totalUnits,
      soldUnits,
      availableUnits,
    };
  },
})); 