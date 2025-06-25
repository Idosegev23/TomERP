import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Unit, UnitFilters, UnitStatus, UnitType } from '../types';

interface UnitsStore {
  units: Unit[];
  filteredUnits: Unit[];
  filters: UnitFilters;
  loading: boolean;
  selectedUnit: Unit | null;
  
  // Actions
  setUnits: (units: Unit[]) => void;
  setFilters: (filters: UnitFilters) => void;
  setLoading: (loading: boolean) => void;
  setSelectedUnit: (unit: Unit | null) => void;
  
  // API Actions
  loadUnits: (projectId?: string, buildingId?: string, floorId?: string) => Promise<void>;
  loadUnitsByFilter: (filters: UnitFilters) => Promise<void>;
  createUnit: (unit: Omit<Unit, 'id' | 'created_at' | 'updated_at'>) => Promise<Unit>;
  updateUnit: (id: string, updates: Partial<Unit>) => Promise<void>;
  updateUnitStatus: (id: string, status: UnitStatus) => Promise<void>;
  deleteUnit: (id: string) => Promise<void>;
  
  // Filter Actions
  applyFilters: () => void;
  clearFilters: () => void;
  filterByStatus: (status: UnitStatus[]) => void;
  filterByType: (types: UnitType[]) => void;
  filterByPriceRange: (minPrice?: number, maxPrice?: number) => void;
  filterByBuilding: (buildingId: string) => void;
  filterByFloor: (floorId: string) => void;
  
  // Helper functions
  getUnitById: (id: string) => Unit | undefined;
  getUnitsCount: () => number;
  getFilteredUnitsCount: () => number;
  getUnitsByStatus: (status: UnitStatus) => Unit[];
  getAvailableUnitsCount: () => number;
  getSoldUnitsCount: () => number;
  getReservedUnitsCount: () => number;
  getTotalValue: () => number;
  getAveragePrice: () => number;
}

export const useUnitsStore = create<UnitsStore>((set, get) => ({
  units: [],
  filteredUnits: [],
  filters: {},
  loading: false,
  selectedUnit: null,

  setUnits: (units) => {
    set({ units });
    get().applyFilters();
  },
  
  setFilters: (filters) => {
    set({ filters });
    get().applyFilters();
  },
  
  setLoading: (loading) => set({ loading }),
  setSelectedUnit: (unit) => set({ selectedUnit: unit }),

  loadUnits: async (projectId, buildingId, floorId) => {
    set({ loading: true });
    try {
      let query = supabase
        .from('units')
        .select(`
          *,
          floor:floors(
            *,
            building:buildings(
              *,
              project:projects(*)
            )
          ),
          sales_agent:users(id, full_name, email)
        `)
        .eq('is_active', true)
        .order('number');

      if (floorId) {
        query = query.eq('floor_id', floorId);
      } else if (buildingId) {
        query = query.eq('floor.building_id', buildingId);
      } else if (projectId) {
        query = query.eq('floor.building.project_id', projectId);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      set({ units: data || [] });
      get().applyFilters();
    } catch (error) {
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  loadUnitsByFilter: async (filters) => {
    set({ loading: true, filters });
    try {
      let query = supabase
        .from('units')
        .select(`
          *,
          floor:floors(
            *,
            building:buildings(
              *,
              project:projects(*)
            )
          ),
          sales_agent:users(id, full_name, email)
        `)
        .eq('is_active', true);

      // Apply filters to query
      if (filters.status?.length) {
        query = query.in('status', filters.status);
      }
      
      if (filters.unit_type?.length) {
        query = query.in('unit_type', filters.unit_type);
      }
      
      if (filters.rooms_count?.length) {
        query = query.in('rooms_count', filters.rooms_count);
      }
      
      if (filters.min_price) {
        query = query.gte('marketing_price', filters.min_price);
      }
      
      if (filters.max_price) {
        query = query.lte('marketing_price', filters.max_price);
      }
      
      if (filters.sales_agent_id) {
        query = query.eq('sales_agent_id', filters.sales_agent_id);
      }
      
      if (filters.building_id) {
        query = query.eq('floor.building_id', filters.building_id);
      }
      
      if (filters.floor_id) {
        query = query.eq('floor_id', filters.floor_id);
      }

      const { data, error } = await query.order('number');

      if (error) {
        throw error;
      }

      set({ units: data || [] });
      get().applyFilters();
    } catch (error) {
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  createUnit: async (unitData) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('units')
        .insert([unitData])
        .select(`
          *,
          floor:floors(
            *,
            building:buildings(
              *,
              project:projects(*)
            )
          ),
          sales_agent:users(id, full_name, email)
        `)
        .single();

      if (error) {
        throw error;
      }

      // Add to units list
      const { units } = get();
      set({ units: [...units, data] });
      get().applyFilters();

      return data;
    } catch (error) {
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateUnit: async (id: string, updates) => {
    try {
      const { data, error } = await supabase
        .from('units')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          floor:floors(
            *,
            building:buildings(
              *,
              project:projects(*)
            )
          ),
          sales_agent:users(id, full_name, email)
        `)
        .single();

      if (error) {
        throw error;
      }

      // Update in units list
      const { units, selectedUnit } = get();
      const updatedUnits = units.map(u => u.id === id ? data : u);
      set({ units: updatedUnits });
      
      // Update selected unit if it's the one being updated
      if (selectedUnit?.id === id) {
        set({ selectedUnit: data });
      }
      
      get().applyFilters();
    } catch (error) {
      throw error;
    }
  },

  updateUnitStatus: async (id: string, status: UnitStatus) => {
    try {
      const { data, error } = await supabase
        .from('units')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Optimistic update
      const { units, selectedUnit } = get();
      const updatedUnits = units.map(u => 
        u.id === id ? { ...u, status } : u
      );
      set({ units: updatedUnits });
      
      if (selectedUnit?.id === id) {
        set({ selectedUnit: { ...selectedUnit, status } });
      }
      
      get().applyFilters();
    } catch (error) {
      throw error;
    }
  },

  deleteUnit: async (id: string) => {
    set({ loading: true });
    try {
      const { error } = await supabase
        .from('units')
        .update({ is_active: false })
        .eq('id', id);

      if (error) {
        throw error;
      }

      // Remove from units list
      const { units, selectedUnit } = get();
      const filteredUnits = units.filter(u => u.id !== id);
      set({ units: filteredUnits });
      
      // Clear selected unit if it's the one being deleted
      if (selectedUnit?.id === id) {
        set({ selectedUnit: null });
      }
      
      get().applyFilters();
    } catch (error) {
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // Filter Actions
  applyFilters: () => {
    const { units, filters } = get();
    let filtered = units;

    if (filters.status?.length) {
      filtered = filtered.filter(unit => 
        filters.status!.includes(unit.status)
      );
    }

    if (filters.unit_type?.length) {
      filtered = filtered.filter(unit => 
        unit.unit_type && filters.unit_type!.includes(unit.unit_type)
      );
    }

    if (filters.rooms_count?.length) {
      filtered = filtered.filter(unit => 
        unit.rooms_count && filters.rooms_count!.includes(unit.rooms_count)
      );
    }

    if (filters.min_price && filters.max_price) {
      filtered = filtered.filter(unit => 
        unit.marketing_price && 
        unit.marketing_price >= filters.min_price! &&
        unit.marketing_price <= filters.max_price!
      );
    } else if (filters.min_price) {
      filtered = filtered.filter(unit => 
        unit.marketing_price && unit.marketing_price >= filters.min_price!
      );
    } else if (filters.max_price) {
      filtered = filtered.filter(unit => 
        unit.marketing_price && unit.marketing_price <= filters.max_price!
      );
    }

    if (filters.sales_agent_id) {
      filtered = filtered.filter(unit => 
        unit.sales_agent_id === filters.sales_agent_id
      );
    }

    if (filters.building_id) {
      filtered = filtered.filter(unit => 
        unit.floor?.building_id === filters.building_id
      );
    }

    if (filters.floor_id) {
      filtered = filtered.filter(unit => 
        unit.floor_id === filters.floor_id
      );
    }

    set({ filteredUnits: filtered });
  },

  clearFilters: () => {
    set({ filters: {} });
    get().applyFilters();
  },

  filterByStatus: (status) => {
    const { filters } = get();
    set({ filters: { ...filters, status } });
    get().applyFilters();
  },

  filterByType: (types) => {
    const { filters } = get();
    set({ filters: { ...filters, unit_type: types } });
    get().applyFilters();
  },

  filterByPriceRange: (minPrice, maxPrice) => {
    const { filters } = get();
    set({ filters: { ...filters, min_price: minPrice, max_price: maxPrice } });
    get().applyFilters();
  },

  filterByBuilding: (buildingId) => {
    const { filters } = get();
    set({ filters: { ...filters, building_id: buildingId } });
    get().applyFilters();
  },

  filterByFloor: (floorId) => {
    const { filters } = get();
    set({ filters: { ...filters, floor_id: floorId } });
    get().applyFilters();
  },

  // Helper functions
  getUnitById: (id: string) => {
    const { units } = get();
    return units.find(u => u.id === id);
  },

  getUnitsCount: () => {
    const { units } = get();
    return units.length;
  },

  getFilteredUnitsCount: () => {
    const { filteredUnits } = get();
    return filteredUnits.length;
  },

  getUnitsByStatus: (status: UnitStatus) => {
    const { units } = get();
    return units.filter(u => u.status === status);
  },

  getAvailableUnitsCount: () => {
    const { units } = get();
    return units.filter(u => u.status === 'available').length;
  },

  getSoldUnitsCount: () => {
    const { units } = get();
    return units.filter(u => u.status === 'sold').length;
  },

  getReservedUnitsCount: () => {
    const { units } = get();
    return units.filter(u => u.status === 'reserved').length;
  },

  getTotalValue: () => {
    const { units } = get();
    return units.reduce((sum, unit) => 
      sum + (unit.marketing_price || 0), 0
    );
  },

  getAveragePrice: () => {
    const { units } = get();
    const unitsWithPrice = units.filter(u => u.marketing_price);
    if (unitsWithPrice.length === 0) return 0;
    
    const total = unitsWithPrice.reduce((sum, unit) => 
      sum + (unit.marketing_price || 0), 0
    );
    return total / unitsWithPrice.length;
  },
})); 