import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Task, TaskFilters, TaskStatus, TaskPriority, TaskCategory, EntityType } from '../types';

interface TasksStore {
  tasks: Task[];
  filteredTasks: Task[];
  filters: TaskFilters;
  loading: boolean;
  selectedTask: Task | null;
  
  // Actions
  setTasks: (tasks: Task[]) => void;
  setFilters: (filters: TaskFilters) => void;
  setLoading: (loading: boolean) => void;
  setSelectedTask: (task: Task | null) => void;
  
  // API Actions
  loadTasks: (entityType?: EntityType, entityId?: string) => Promise<void>;
  loadTasksByFilter: (filters: TaskFilters) => Promise<void>;
  createTask: (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  updateTaskStatus: (id: string, status: TaskStatus) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  
  // Hierarchy Actions
  moveTask: (taskId: string, newParentId?: string) => Promise<void>;
  duplicateTask: (taskId: string) => Promise<Task>;
  bulkUpdateStatus: (taskIds: string[], status: TaskStatus) => Promise<void>;
  
  // Filter Actions
  applyFilters: () => void;
  clearFilters: () => void;
  filterByStatus: (status: TaskStatus[]) => void;
  filterByPriority: (priority: TaskPriority[]) => void;
  filterByCategory: (category: TaskCategory[]) => void;
  filterByAssignee: (assigneeId: string) => void;
  filterByEntity: (entityType: EntityType, entityId: string) => void;
  filterOverdue: () => void;
  
  // Helper functions
  getTaskById: (id: string) => Task | undefined;
  getTasksCount: () => number;
  getFilteredTasksCount: () => number;
  getTasksByStatus: (status: TaskStatus) => Task[];
  getTasksByPriority: (priority: TaskPriority) => Task[];
  getTasksByCategory: (category: TaskCategory) => Task[];
  getOverdueTasks: () => Task[];
  getTaskProgress: (parentId?: string) => number;
  buildTaskHierarchy: (tasks?: Task[]) => Task[];
  getTaskPath: (taskId: string) => Task[];
}

export const useTasksStore = create<TasksStore>((set, get) => ({
  tasks: [],
  filteredTasks: [],
  filters: {},
  loading: false,
  selectedTask: null,

  setTasks: (tasks) => {
    set({ tasks });
    get().applyFilters();
  },
  
  setFilters: (filters) => {
    set({ filters });
    get().applyFilters();
  },
  
  setLoading: (loading) => set({ loading }),
  setSelectedTask: (task) => set({ selectedTask: task }),

  loadTasks: async (entityType, entityId) => {
    set({ loading: true });
    try {
      let query = supabase
        .from('tasks')
        .select(`
          *,
          assignee:users!tasks_assigned_to_fkey(id, full_name, email),
          creator:users!tasks_created_by_fkey(id, full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (entityType && entityId) {
        query = query
          .eq('entity_type', entityType)
          .eq('entity_id', entityId);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      set({ tasks: data || [] });
      get().applyFilters();
    } catch (error) {
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  loadTasksByFilter: async (filters) => {
    set({ loading: true, filters });
    try {
      let query = supabase
        .from('tasks')
        .select(`
          *,
          assignee:users!tasks_assigned_to_fkey(id, full_name, email),
          creator:users!tasks_created_by_fkey(id, full_name, email)
        `);

      // Apply filters to query
      if (filters.status?.length) {
        query = query.in('status', filters.status);
      }
      
      if (filters.priority?.length) {
        query = query.in('priority', filters.priority);
      }
      
      if (filters.category?.length) {
        query = query.in('category', filters.category);
      }
      
      if (filters.assigned_to) {
        query = query.eq('assigned_to', filters.assigned_to);
      }
      
      if (filters.entity_type && filters.entity_id) {
        query = query
          .eq('entity_type', filters.entity_type)
          .eq('entity_id', filters.entity_id);
      }
      
      if (filters.overdue) {
        const today = new Date().toISOString().split('T')[0];
        query = query
          .lt('due_date', today)
          .neq('status', 'done')
          .neq('status', 'cancelled');
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      set({ tasks: data || [] });
      get().applyFilters();
    } catch (error) {
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  createTask: async (taskData) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([taskData])
        .select(`
          *,
          assignee:users!tasks_assigned_to_fkey(id, full_name, email),
          creator:users!tasks_created_by_fkey(id, full_name, email)
        `)
        .single();

      if (error) {
        throw error;
      }

      // Add to tasks list
      const { tasks } = get();
      set({ tasks: [data, ...tasks] });
      get().applyFilters();

      return data;
    } catch (error) {
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  updateTask: async (id: string, updates) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          assignee:users!tasks_assigned_to_fkey(id, full_name, email),
          creator:users!tasks_created_by_fkey(id, full_name, email)
        `)
        .single();

      if (error) {
        throw error;
      }

      // Update in tasks list
      const { tasks, selectedTask } = get();
      const updatedTasks = tasks.map(t => t.id === id ? data : t);
      set({ tasks: updatedTasks });
      
      // Update selected task if it's the one being updated
      if (selectedTask?.id === id) {
        set({ selectedTask: data });
      }
      
      get().applyFilters();
    } catch (error) {
      throw error;
    }
  },

  updateTaskStatus: async (id: string, status: TaskStatus) => {
    try {
      const updates: Partial<Task> = { status };
      
      // Set completed_at when marking as done
      if (status === 'done') {
        updates.completed_at = new Date().toISOString();
      } else {
        updates.completed_at = undefined;
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Optimistic update
      const { tasks, selectedTask } = get();
      const updatedTasks = tasks.map(t => 
        t.id === id ? { ...t, ...updates } : t
      );
      set({ tasks: updatedTasks });
      
      if (selectedTask?.id === id) {
        set({ selectedTask: { ...selectedTask, ...updates } });
      }
      
      get().applyFilters();
    } catch (error) {
      throw error;
    }
  },

  deleteTask: async (id: string) => {
    set({ loading: true });
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      // Remove from tasks list
      const { tasks, selectedTask } = get();
      const filteredTasks = tasks.filter(t => t.id !== id);
      set({ tasks: filteredTasks });
      
      // Clear selected task if it's the one being deleted
      if (selectedTask?.id === id) {
        set({ selectedTask: null });
      }
      
      get().applyFilters();
    } catch (error) {
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  moveTask: async (taskId: string, newParentId?: string) => {
    try {
      const task = get().getTaskById(taskId);
      if (!task) throw new Error('Task not found');

      // Calculate new level
      let newLevel = 0;
      if (newParentId) {
        const parent = get().getTaskById(newParentId);
        if (!parent) throw new Error('Parent task not found');
        newLevel = parent.level + 1;
      }

      const { error } = await supabase
        .from('tasks')
        .update({ parent_id: newParentId, level: newLevel })
        .eq('id', taskId);

      if (error) {
        throw error;
      }

      // Update local state
      const { tasks } = get();
      const updatedTasks = tasks.map(t => 
        t.id === taskId ? { ...t, parent_id: newParentId, level: newLevel } : t
      );
      set({ tasks: updatedTasks });
      get().applyFilters();
    } catch (error) {
      throw error;
    }
  },

  duplicateTask: async (taskId: string) => {
    set({ loading: true });
    try {
      const task = get().getTaskById(taskId);
      if (!task) throw new Error('Task not found');

      const duplicateData = {
        ...task,
        title: `${task.title} (Copy)`,
        status: 'draft' as TaskStatus,
        completed_at: undefined,
      };
      
      // Remove fields that shouldn't be duplicated
      delete (duplicateData as any).id;
      delete (duplicateData as any).created_at;
      delete (duplicateData as any).updated_at;
      delete (duplicateData as any).assignee;
      delete (duplicateData as any).creator;

      return await get().createTask(duplicateData);
    } catch (error) {
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  bulkUpdateStatus: async (taskIds: string[], status: TaskStatus) => {
    set({ loading: true });
    try {
      const updates: Partial<Task> = { status };
      
      if (status === 'done') {
        updates.completed_at = new Date().toISOString();
      } else {
        updates.completed_at = undefined;
      }

      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .in('id', taskIds);

      if (error) {
        throw error;
      }

      // Update local state
      const { tasks } = get();
      const updatedTasks = tasks.map(t => 
        taskIds.includes(t.id) ? { ...t, ...updates } : t
      );
      set({ tasks: updatedTasks });
      get().applyFilters();
    } catch (error) {
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  // Filter Actions
  applyFilters: () => {
    const { tasks, filters } = get();
    let filtered = tasks;

    if (filters.status?.length) {
      filtered = filtered.filter(task => 
        filters.status!.includes(task.status)
      );
    }

    if (filters.priority?.length) {
      filtered = filtered.filter(task => 
        filters.priority!.includes(task.priority)
      );
    }

    if (filters.category?.length) {
      filtered = filtered.filter(task => 
        filters.category!.includes(task.category)
      );
    }

    if (filters.assigned_to) {
      filtered = filtered.filter(task => 
        task.assigned_to === filters.assigned_to
      );
    }

    if (filters.entity_type && filters.entity_id) {
      filtered = filtered.filter(task => 
        task.entity_type === filters.entity_type &&
        task.entity_id === filters.entity_id
      );
    }

    if (filters.overdue) {
      const today = new Date();
      filtered = filtered.filter(task => {
        if (!task.due_date || task.status === 'done' || task.status === 'cancelled') {
          return false;
        }
        return new Date(task.due_date) < today;
      });
    }

    set({ filteredTasks: filtered });
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

  filterByPriority: (priority) => {
    const { filters } = get();
    set({ filters: { ...filters, priority } });
    get().applyFilters();
  },

  filterByCategory: (category) => {
    const { filters } = get();
    set({ filters: { ...filters, category } });
    get().applyFilters();
  },

  filterByAssignee: (assigneeId) => {
    const { filters } = get();
    set({ filters: { ...filters, assigned_to: assigneeId } });
    get().applyFilters();
  },

  filterByEntity: (entityType, entityId) => {
    const { filters } = get();
    set({ filters: { ...filters, entity_type: entityType, entity_id: entityId } });
    get().applyFilters();
  },

  filterOverdue: () => {
    const { filters } = get();
    set({ filters: { ...filters, overdue: true } });
    get().applyFilters();
  },

  // Helper functions
  getTaskById: (id: string) => {
    const { tasks } = get();
    return tasks.find(t => t.id === id);
  },

  getTasksCount: () => {
    const { tasks } = get();
    return tasks.length;
  },

  getFilteredTasksCount: () => {
    const { filteredTasks } = get();
    return filteredTasks.length;
  },

  getTasksByStatus: (status: TaskStatus) => {
    const { tasks } = get();
    return tasks.filter(t => t.status === status);
  },

  getTasksByPriority: (priority: TaskPriority) => {
    const { tasks } = get();
    return tasks.filter(t => t.priority === priority);
  },

  getTasksByCategory: (category: TaskCategory) => {
    const { tasks } = get();
    return tasks.filter(t => t.category === category);
  },

  getOverdueTasks: () => {
    const { tasks } = get();
    const today = new Date();
    return tasks.filter(task => {
      if (!task.due_date) return false;
      if (task.status === 'done' || task.status === 'cancelled') return false;
      return new Date(task.due_date) < today;
    });
  },

  getTaskProgress: (parentId?: string) => {
    const { tasks } = get();
    const childTasks = parentId 
      ? tasks.filter(t => t.parent_id === parentId)
      : tasks.filter(t => !t.parent_id);

    if (childTasks.length === 0) return 0;

    const completedTasks = childTasks.filter(t => t.status === 'done');
    return Math.round((completedTasks.length / childTasks.length) * 100);
  },

  buildTaskHierarchy: (tasks) => {
    const tasksToUse = tasks || get().filteredTasks;
    const taskMap = new Map<string, Task & { children: Task[] }>();
    const rootTasks: (Task & { children: Task[] })[] = [];

    // Initialize tasks with children array
    tasksToUse.forEach(task => {
      taskMap.set(task.id, { ...task, children: [] });
    });

    // Build hierarchy
    tasksToUse.forEach(task => {
      const taskWithChildren = taskMap.get(task.id)!;
      
      if (task.parent_id && taskMap.has(task.parent_id)) {
        const parent = taskMap.get(task.parent_id)!;
        parent.children.push(taskWithChildren);
      } else {
        rootTasks.push(taskWithChildren);
      }
    });

    return rootTasks;
  },

  getTaskPath: (taskId: string) => {
    const { tasks } = get();
    const path: Task[] = [];
    let currentTask = tasks.find(t => t.id === taskId);

    while (currentTask) {
      path.unshift(currentTask);
      currentTask = currentTask.parent_id 
        ? tasks.find(t => t.id === currentTask!.parent_id)
        : undefined;
    }

    return path;
  },
})); 