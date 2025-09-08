import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { 
  CheckSquare, 
  Search, 
  Filter,
  Calendar,
  User,
  Building,
  Clock,
  CheckCircle2,
  AlertCircle,
  Pause,
  Home,
  ChevronRight,
  ChevronLeft,
  Eye,
  Upload,
  FileText
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '../components/ui';
import { useAuth } from '../components/auth/AuthContext';
import { FileUploadModal } from '../components/files';
import { TaskEditModal } from '../components/tasks';
import toast from 'react-hot-toast';

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string;
  assigned_to: string;
  task_type: string;
  progress_percentage: number;
  parent_task_id?: string;
  developer_id?: string;
  project_id?: string;
  building_id?: string;
  floor_id?: string;
  apartment_id?: string;
  created_at: string;
  updated_at: string;
  stage_order?: number;
  project?: any;
  assignee_profile?: any;
  parent_task?: Task;
  subtasks?: Task[];
  level?: number;
}

interface FilterOptions {
  status: string;
  priority: string;
  projectId: string;
  assignedTo: string;
  entityType: string;
  taskType: string; // 'stages', 'tasks', 'all'
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export const Tasks: React.FC = () => {
  const navigate = useNavigate();
  const { user, hasAccess } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [selectedTaskForFiles, setSelectedTaskForFiles] = useState<Task | null>(null);
  const [showTaskEdit, setShowTaskEdit] = useState(false);
  const [selectedTaskForEdit, setSelectedTaskForEdit] = useState<Task | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    status: '',
    priority: '',
    projectId: '',
    assignedTo: '',
    entityType: '',
    taskType: 'all', // all, stages, tasks
    sortBy: 'due_date',
    sortOrder: 'asc'
  });

  useEffect(() => {
    fetchTasks();
    fetchProjects();
    fetchUsers();
  }, [filters, searchTerm]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email')
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
    }
  };

  const buildTaskHierarchy = (tasks: Task[]): Task[] => {
    // Create a map for quick lookup
    const taskMap = new Map<string, Task>();
    tasks.forEach(task => {
      taskMap.set(task.id, { ...task, subtasks: [], level: 0 });
    });

    const rootTasks: Task[] = [];

    tasks.forEach(task => {
      const taskWithHierarchy = taskMap.get(task.id);
      if (!taskWithHierarchy) return;

      if (task.parent_task_id) {
        // This is a subtask
        const parentTask = taskMap.get(task.parent_task_id);
        if (parentTask) {
          taskWithHierarchy.parent_task = parentTask;
          taskWithHierarchy.level = (parentTask.level || 0) + 1;
          parentTask.subtasks = parentTask.subtasks || [];
          parentTask.subtasks.push(taskWithHierarchy);
        } else {
          // Parent not found, treat as root task
          rootTasks.push(taskWithHierarchy);
        }
      } else {
        // This is a root task
        rootTasks.push(taskWithHierarchy);
      }
    });

    // Flatten the hierarchy for display
    const flattenTasks = (tasks: Task[]): Task[] => {
      const result: Task[] = [];
      tasks.forEach(task => {
        result.push(task);
        if (task.subtasks && task.subtasks.length > 0) {
          result.push(...flattenTasks(task.subtasks));
        }
      });
      return result;
    };

    return flattenTasks(rootTasks);
  };

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      
      let query = supabase
        .from('tasks')
        .select(`
          id,
          title,
          description,
          status,
          priority,
          due_date,
          assigned_to,
          task_type,
          progress_percentage,
          parent_task_id,
          developer_id,
          project_id,
          building_id,
          floor_id,
          apartment_id,
          created_at,
          updated_at,
          stage_order
        `);

      // User access control
      if (user?.user_role === 'developer' && user?.developer_id) {
        // For developers, get tasks from their projects
        const { data: projectIds } = await supabase
          .from('projects')
          .select('id')
          .eq('developer_id', user.developer_id);
        
        if (projectIds && projectIds.length > 0) {
          const ids = projectIds.map(p => p.id);
          query = query.in('project_id', ids);
        }
      } else if (user?.user_role === 'sales_agent' && user?.assigned_project_ids) {
        query = query.in('project_id', user.assigned_project_ids);
      } else if (user?.user_role !== 'admin' && user?.user_role !== 'super_admin') {
        // For other roles, show only assigned tasks
        query = query.eq('assigned_to', user?.id);
      }

      // Apply search filter
      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      // Apply status filter
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      // Apply priority filter
      if (filters.priority) {
        query = query.eq('priority', filters.priority);
      }

      // Apply assigned to filter
      if (filters.assignedTo) {
        query = query.eq('assigned_to', filters.assignedTo);
      }

      // Apply project filter
      if (filters.projectId) {
        query = query.eq('project_id', filters.projectId);
      }

      // Apply entity type filter
      if (filters.entityType) {
        switch (filters.entityType) {
          case 'project':
            query = query.not('project_id', 'is', null);
            break;
          case 'building':
            query = query.not('building_id', 'is', null);
            break;
          case 'floor':
            query = query.not('floor_id', 'is', null);
            break;
          case 'apartment':
            query = query.not('apartment_id', 'is', null);
            break;
          case 'developer':
            query = query.not('developer_id', 'is', null);
            break;
        }
      }

      // Apply task type filter
      if (filters.taskType && filters.taskType !== 'all') {
        if (filters.taskType === 'stages') {
          query = query.is('parent_task_id', null);
        } else if (filters.taskType === 'tasks') {
          query = query.not('parent_task_id', 'is', null);
        }
      }

      // Apply sorting
      const isAsc = filters.sortOrder === 'asc';
      switch (filters.sortBy) {
        case 'status':
          query = query.order('status', { ascending: isAsc });
          break;
        case 'priority':
          query = query.order('priority', { ascending: isAsc });
          break;
        case 'title':
          query = query.order('title', { ascending: isAsc });
          break;
        case 'created_at':
          query = query.order('created_at', { ascending: isAsc });
          break;
        case 'due_date':
          query = query.order('due_date', { ascending: isAsc });
          break;
        default:
          // Default: chronological order by stage number for stages, then due_date
          query = query.order('stage_order', { ascending: true, nullsFirst: false })
                       .order('due_date', { ascending: true });
      }

      const { data, error } = await query.limit(200);

      if (error) {
        throw error;
      }

      
      if (data) {
        // Build task hierarchy
        const tasksWithHierarchy = buildTaskHierarchy(data as Task[]);
        setTasks(tasksWithHierarchy);
      } else {
        setTasks([]);
      }
      
      if (!data || data.length === 0) {
        // Create a sample task if none exist
        await createSampleTask();
      }
    } catch (error) {
      toast.error('שגיאה בטעינת המשימות');
    } finally {
      setIsLoading(false);
    }
  };

  const createSampleTask = async () => {
    try {
      const { data: project } = await supabase
        .from('projects')
        .select('id')
        .limit(1)
        .single();

      if (project) {
        const { error } = await supabase
          .from('tasks')
          .insert({
            title: 'משימת דוגמה - בדיקת מערכת',
            description: 'משימה זו נוצרה אוטומטית לבדיקת המערכת',
            status: 'draft',
            priority: 'medium',
            task_type: 'technical',
            project_id: project.id,
            assigned_to: user?.id,
            due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            created_by: user?.id
          });

        if (!error) {
          toast.success('נוצרה משימת דוגמה');
          fetchTasks(); // Refetch tasks
        }
      }
    } catch (error) {
    }
  };

  const handleFilterChange = (key: keyof FilterOptions, value: string | 'asc' | 'desc') => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      priority: '',
      projectId: '',
      assignedTo: '',
      entityType: '',
      taskType: 'all',
      sortBy: 'due_date',
      sortOrder: 'asc'
    });
    setSearchTerm('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'pending_approval': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'טיוטה';
      case 'open': return 'פתוחה';
      case 'in_progress': return 'בתהליך';
      case 'pending_approval': return 'ממתינה לאישור';
      case 'completed': return 'הושלמה';
      case 'cancelled': return 'בוטלה';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return AlertCircle;
      case 'open': return CheckSquare;
      case 'in_progress': return Clock;
      case 'pending_approval': return Pause;
      case 'completed': return CheckCircle2;
      case 'cancelled': return AlertCircle;
      default: return CheckSquare;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'urgent': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'low': return 'נמוכה';
      case 'medium': return 'בינונית';
      case 'high': return 'גבוהה';
      case 'urgent': return 'דחופה';
      default: return priority;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'לא נקבע';
    return new Date(dateString).toLocaleDateString('he-IL');
  };

  const isOverdue = (dueDateString: string) => {
    if (!dueDateString) return false;
    const dueDate = new Date(dueDateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  const handleEditTask = (task: Task) => {
    setSelectedTaskForEdit(task);
    setShowTaskEdit(true);
  };

  const handleUploadFiles = (task: Task) => {
    setSelectedTaskForFiles(task);
    setShowFileUpload(true);
  };

  const handleFileUploadSuccess = () => {
    setShowFileUpload(false);
    setSelectedTaskForFiles(null);
    toast.success('הקבצים הועלו בהצלחה למשימה');
  };

  const handleTaskUpdated = () => {
    setShowTaskEdit(false);
    setSelectedTaskForEdit(null);
    fetchTasks(); // Refresh the task list
  };

  const getEntityTypeText = (task: Task) => {
    if (task.apartment_id) return 'דירה';
    if (task.floor_id) return 'קומה';
    if (task.building_id) return 'בניין';
    if (task.project_id) return 'פרויקט';
    if (task.developer_id) return 'יזם';
    return 'כללי';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">טוען משימות...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 safe-area-bottom" dir="rtl">
      {/* Breadcrumbs */}
      <Breadcrumbs />
      
      {/* Header */}

      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg p-6 mb-8 border border-orange-100">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🎯 ניהול שלבים ומשימות
            </h1>
            <p className="text-gray-600 mb-4">
              מעקב מתקדם אחר שלבי הפרויקט ומשימות מכל רמות הארגון
            </p>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-3 border border-orange-200">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">🎯 שלבים</span>
                </div>
                <div className="text-xl font-bold text-blue-600">
                  {tasks.filter(task => !task.parent_task_id).length}
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-3 border border-orange-200">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">📋 משימות</span>
                </div>
                <div className="text-xl font-bold text-green-600">
                  {tasks.filter(task => task.parent_task_id).length}
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-3 border border-orange-200">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">✅ הושלמו</span>
                </div>
                <div className="text-xl font-bold text-purple-600">
                  {tasks.filter(task => task.status === 'completed').length}
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-3 border border-orange-200">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">🚨 פתוחות</span>
                </div>
                <div className="text-xl font-bold text-red-600">
                  {tasks.filter(task => ['open', 'in_progress'].includes(task.status)).length}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 tap-area ${
                  showFilters ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Filter className="h-4 w-4" />
                <span className="mobile-hidden">סינון מתקדם</span>
                <span className="md:hidden">סינון</span>
              </button>
              
              <button
                onClick={() => navigate('/tasks/stages')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 tap-area"
              >
                <CheckSquare className="h-4 w-4" />
                <span className="mobile-hidden">ניהול שלבים</span>
                <span className="md:hidden">🎯 שלבים</span>
              </button>
            </div>
            
            <div className="text-sm text-gray-600 text-center">
              סה"כ {tasks.length} פריטים • {tasks.filter(task => !task.parent_task_id).length} שלבים • {tasks.filter(task => task.parent_task_id).length} משימות
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="h-5 w-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="חפש לפי כותרת או תיאור..."
          className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="mb-6">
          <CardHeader>
            <h3 className="text-lg font-semibold">סינון מתקדם</h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">סטטוס</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">כל הסטטוסים</option>
                  <option value="draft">טיוטה</option>
                  <option value="open">פתוחה</option>
                  <option value="in_progress">בתהליך</option>
                  <option value="pending_approval">ממתינה לאישור</option>
                  <option value="completed">הושלמה</option>
                  <option value="cancelled">בוטלה</option>
                </select>
              </div>

              {/* Priority Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">עדיפות</label>
                <select
                  value={filters.priority}
                  onChange={(e) => handleFilterChange('priority', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">כל העדיפויות</option>
                  <option value="low">נמוכה</option>
                  <option value="medium">בינונית</option>
                  <option value="high">גבוהה</option>
                  <option value="urgent">דחופה</option>
                </select>
              </div>

              {/* Project Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">פרויקט</label>
                <select
                  value={filters.projectId}
                  onChange={(e) => handleFilterChange('projectId', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">כל הפרויקטים</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </div>

              {/* Assigned To Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">מוקצה ל</label>
                <select
                  value={filters.assignedTo}
                  onChange={(e) => handleFilterChange('assignedTo', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">כל המשתמשים</option>
                  {users.map(userOption => (
                    <option key={userOption.id} value={userOption.id}>
                      {userOption.full_name || userOption.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Entity Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">סוג ישות</label>
                <select
                  value={filters.entityType}
                  onChange={(e) => handleFilterChange('entityType', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">כל הסוגים</option>
                  <option value="project">פרויקט</option>
                  <option value="building">בניין</option>
                  <option value="floor">קומה</option>
                  <option value="apartment">דירה</option>
                </select>
              </div>

              {/* Task Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">🎯 סוג פריט</label>
                <select
                  value={filters.taskType}
                  onChange={(e) => handleFilterChange('taskType', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="all">הכל</option>
                  <option value="stages">🎯 שלבים בלבד</option>
                  <option value="tasks">📋 משימות בלבד</option>
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">מיון לפי</label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="due_date">תאריך יעד</option>
                  <option value="status">סטטוס</option>
                  <option value="priority">עדיפות</option>
                  <option value="title">כותרת</option>
                  <option value="created_at">תאריך יצירה</option>
                </select>
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">סדר</label>
                <select
                  value={filters.sortOrder}
                  onChange={(e) => handleFilterChange('sortOrder', e.target.value as 'asc' | 'desc')}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="asc">עולה</option>
                  <option value="desc">יורד</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center mt-6">
              <button
                onClick={clearFilters}
                className="text-gray-600 hover:text-gray-900 text-sm"
              >
                נקה סינונים
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">לא נמצאו משימות</h3>
            <p className="text-gray-600">נסה לשנות את הסינונים או החיפוש</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => {
            const StatusIcon = getStatusIcon(task.status);
            const indentLevel = task.level || 0;
            const indentStyle = indentLevel > 0 ? { marginRight: `${indentLevel * 2}rem` } : {};
            const isSubtask = task.parent_task_id ? true : false;
            const hasSubtasks = task.subtasks && task.subtasks.length > 0;
            
            return (
              <Card 
                key={task.id} 
                className={`card-mobile hover:shadow-lg transition-shadow cursor-pointer ${
                  isSubtask ? 'border-r-4 border-r-blue-200 bg-blue-50/30' : ''
                }`}
                style={indentStyle}
              >
                <CardContent className="p-6" onClick={() => handleEditTask(task)}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Header */}
                      <div className="flex items-center gap-3 mb-3">
                        {/* Stage/Task Type Indicator */}
                        <div className={`flex items-center gap-2 px-2 py-1 rounded-lg text-xs font-medium ${
                          isSubtask 
                            ? 'bg-green-100 text-green-700 border border-green-200' 
                            : 'bg-blue-100 text-blue-700 border border-blue-200'
                        }`}>
                          {isSubtask ? '📋 משימה' : '🎯 שלב'}
                          {hasSubtasks && !isSubtask && (
                            <span className="text-blue-500">({task.subtasks?.length})</span>
                          )}
                        </div>

                        {isSubtask && (
                          <div className="flex items-center gap-2 text-green-600">
                            <div className="w-4 h-0.5 bg-green-300"></div>
                            <ChevronLeft className="h-4 w-4" />
                          </div>
                        )}
                        
                        <StatusIcon className="h-5 w-5 text-gray-600" />
                        <h3 className={`font-semibold text-gray-900 ${isSubtask ? 'text-base' : 'text-lg'}`}>
                          {!isSubtask && task.stage_order && (
                            <span className="text-blue-600 font-bold">שלב {task.stage_order}: </span>
                          )}
                          {task.title}
                        </h3>
                        
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                          {getStatusText(task.status)}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                          {getPriorityText(task.priority)}
                        </span>
                      </div>

                      {/* Parent Task Info for Subtasks */}
                      {isSubtask && task.parent_task && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                          <p className="text-sm text-blue-800">
                            <strong>🎯 שלב {task.parent_task.stage_order}:</strong> {task.parent_task.title}
                          </p>
                        </div>
                      )}

                      {/* Description */}
                      {task.description && (
                        <p className="text-gray-600 mb-3 line-clamp-2">
                          {task.description}
                        </p>
                      )}

                      {/* Meta Information */}
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        {task.project && (
                          <div className="flex items-center gap-1">
                            <Building className="h-4 w-4" />
                            <span>{task.project.name}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-1">
                          <CheckSquare className="h-4 w-4" />
                          <span>{getEntityTypeText(task)}</span>
                        </div>

                        {task.assignee_profile && (
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            <span>{task.assignee_profile.full_name || task.assignee_profile.email}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-1">
                          <Calendar className={`h-4 w-4 ${isOverdue(task.due_date) ? 'text-red-500' : ''}`} />
                          <span className={isOverdue(task.due_date) ? 'text-red-600 font-medium' : ''}>
                            {formatDate(task.due_date)}
                            {isOverdue(task.due_date) && ' (באיחור)'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 card-actions-mobile">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUploadFiles(task);
                        }}
                        className="flex items-center justify-center gap-2 text-green-600 hover:text-green-700 text-sm px-3 py-2 rounded-lg hover:bg-green-50 transition-colors tap-area"
                      >
                        <Upload className="h-4 w-4" />
                        <span className="hidden sm:inline">העלה קבצים</span>
                        <span className="sm:hidden">📎 קבצים</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditTask(task);
                        }}
                        className="flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 text-sm px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors tap-area"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="hidden sm:inline">ערוך משימה</span>
                        <span className="sm:hidden">✏️ ערוך</span>
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* File Upload Modal */}
      {showFileUpload && selectedTaskForFiles && (
        <FileUploadModal
          isOpen={showFileUpload}
          onClose={() => setShowFileUpload(false)}
          onUploadSuccess={handleFileUploadSuccess}
          initialEntityType={
            selectedTaskForFiles.apartment_id ? 'unit' :
            selectedTaskForFiles.floor_id ? 'floor' :
            selectedTaskForFiles.building_id ? 'building' : 'project'
          }
          initialEntityId={
            selectedTaskForFiles.apartment_id ||
            selectedTaskForFiles.floor_id ||
            selectedTaskForFiles.building_id ||
            selectedTaskForFiles.project_id ||
            ''
          }
        />
      )}

      {/* Task Edit Modal */}
      {showTaskEdit && selectedTaskForEdit && (
        <TaskEditModal
          task={selectedTaskForEdit}
          isOpen={showTaskEdit}
          onClose={() => setShowTaskEdit(false)}
          onTaskUpdated={handleTaskUpdated}
        />
      )}
    </div>
  );
}; 