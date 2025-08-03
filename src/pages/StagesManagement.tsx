import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Target, 
  Search, 
  Filter,
  Plus,
  Edit,
  Trash2,
  CheckSquare,
  Home,
  ChevronRight,
  Building,
  Eye,
  Calendar,
  User,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  ArrowRight
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '../components/ui';
import { useAuth } from '../components/auth/AuthContext';
import toast from 'react-hot-toast';

interface Stage {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string;
  assigned_to: string;
  project_id?: string;
  building_id?: string;
  floor_id?: string;
  apartment_id?: string;
  created_at: string;
  updated_at: string;
  project?: any;
  assignee_profile?: any;
  subtasks?: Task[];
  tasks_count?: number;
  completed_tasks_count?: number;
  progress_percentage?: number;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string;
  assigned_to: string;
  parent_task_id: string;
  created_at: string;
  updated_at: string;
}

export const StagesManagement: React.FC = () => {
  const navigate = useNavigate();
  const { user, hasAccess } = useAuth();
  const [stages, setStages] = useState<Stage[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    projectId: '',
    assignedTo: '',
    progress: '', // 'completed', 'in_progress', 'not_started'
    sortBy: 'due_date',
    sortOrder: 'asc' as 'asc' | 'desc'
  });

  useEffect(() => {
    fetchStages();
    fetchProjects();
    fetchUsers();
  }, [searchTerm, filters]);

  const fetchStages = async () => {
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
          project_id,
          building_id,
          floor_id,
          apartment_id,
          created_at,
          updated_at,
          project:projects(id, name),
          assignee_profile:users!assigned_to(id, full_name, email)
        `)
        .is('parent_task_id', null); // שלבים בלבד

      // User access control
      if (user?.user_role === 'developer' && user?.developer_id) {
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
        query = query.eq('assigned_to', user?.id);
      }

      // Apply search filter
      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.priority) {
        query = query.eq('priority', filters.priority);
      }
      if (filters.assignedTo) {
        query = query.eq('assigned_to', filters.assignedTo);
      }
      if (filters.projectId) {
        query = query.eq('project_id', filters.projectId);
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
        default:
          query = query.order('due_date', { ascending: isAsc });
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data) {
        // Get tasks count for each stage
        const stagesWithStats = await Promise.all(
          data.map(async (stage) => {
            const { data: tasksData, error: tasksError } = await supabase
              .from('tasks')
              .select('id, status')
              .eq('parent_task_id', stage.id);

            if (tasksError) {
              console.error('Error fetching tasks for stage:', tasksError);
              return stage;
            }

            const tasksCount = tasksData?.length || 0;
            const completedTasksCount = tasksData?.filter(task => task.status === 'completed').length || 0;
            const progressPercentage = tasksCount > 0 ? Math.round((completedTasksCount / tasksCount) * 100) : 0;

            return {
              ...stage,
              tasks_count: tasksCount,
              completed_tasks_count: completedTasksCount,
              progress_percentage: progressPercentage
            };
          })
        );

        // Apply progress filter
        let filteredStages = stagesWithStats;
        if (filters.progress) {
          filteredStages = stagesWithStats.filter(stage => {
            switch (filters.progress) {
              case 'completed':
                return stage.progress_percentage === 100;
              case 'in_progress':
                return stage.progress_percentage > 0 && stage.progress_percentage < 100;
              case 'not_started':
                return stage.progress_percentage === 0;
              default:
                return true;
            }
          });
        }

        setStages(filteredStages);
      }
    } catch (error) {
      console.error('Error fetching stages:', error);
      toast.error('שגיאה בטעינת השלבים');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleFilterChange = (key: string, value: string | 'asc' | 'desc') => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      priority: '',
      projectId: '',
      assignedTo: '',
      progress: '',
      sortBy: 'due_date',
      sortOrder: 'asc'
    });
    setSearchTerm('');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircle;
      case 'in_progress': return Clock;
      case 'pending_approval': return AlertCircle;
      case 'cancelled': return AlertCircle;
      default: return CheckSquare;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending_approval': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'open': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'טיוטה';
      case 'open': return 'פתוח';
      case 'in_progress': return 'בתהליך';
      case 'pending_approval': return 'ממתין לאישור';
      case 'completed': return 'הושלם';
      case 'cancelled': return 'בוטל';
      default: return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'דחופה';
      case 'high': return 'גבוהה';
      case 'medium': return 'בינונית';
      case 'low': return 'נמוכה';
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

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    if (percentage >= 20) return 'bg-orange-500';
    return 'bg-red-500';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">טוען שלבים...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6" dir="rtl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-600 mb-6">
        <button
          onClick={() => navigate('/')}
          className="hover:text-blue-600 flex items-center gap-1"
        >
          <Home className="h-4 w-4" />
          דף הבית
        </button>
        <ChevronRight className="h-4 w-4" />
        <button
          onClick={() => navigate('/tasks')}
          className="hover:text-blue-600"
        >
          שלבים ומשימות
        </button>
        <ChevronRight className="h-4 w-4" />
        <span className="text-gray-900 font-medium">🎯 ניהול שלבים</span>
      </nav>

      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-8 border border-blue-100">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🎯 ניהול שלבים מתקדם
            </h1>
            <p className="text-gray-600 mb-4">
              תצוגה מרוכזת של כל השלבים והתקדמותם במערכת
            </p>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-3 border border-blue-200">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">סה"כ שלבים</span>
                </div>
                <div className="text-xl font-bold text-blue-600">
                  {stages.length}
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-3 border border-blue-200">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-700">הושלמו</span>
                </div>
                <div className="text-xl font-bold text-green-600">
                  {stages.filter(stage => stage.progress_percentage === 100).length}
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-3 border border-blue-200">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-orange-600" />
                  <span className="text-sm font-medium text-gray-700">בתהליך</span>
                </div>
                <div className="text-xl font-bold text-orange-600">
                  {stages.filter(stage => stage.progress_percentage > 0 && stage.progress_percentage < 100).length}
                </div>
              </div>
              
              <div className="bg-white rounded-lg p-3 border border-blue-200">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium text-gray-700">סה"כ משימות</span>
                </div>
                <div className="text-xl font-bold text-purple-600">
                  {stages.reduce((sum, stage) => sum + (stage.tasks_count || 0), 0)}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
                  showFilters ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Filter className="h-4 w-4" />
                סינון מתקדם
              </button>
              
              <button
                onClick={() => navigate('/tasks')}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
              >
                <CheckSquare className="h-4 w-4" />
                כל המשימות
              </button>
            </div>
            
            <div className="text-sm text-gray-600 text-center">
              {stages.length} שלבים • {stages.reduce((sum, stage) => sum + (stage.tasks_count || 0), 0)} משימות
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
          placeholder="חפש שלבים לפי כותרת או תיאור..."
          className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="mb-6">
          <CardHeader>
            <h3 className="text-lg font-semibold">🔍 סינון שלבים</h3>
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
                  <option value="open">פתוח</option>
                  <option value="in_progress">בתהליך</option>
                  <option value="pending_approval">ממתין לאישור</option>
                  <option value="completed">הושלם</option>
                  <option value="cancelled">בוטל</option>
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

              {/* Progress Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">📊 התקדמות</label>
                <select
                  value={filters.progress}
                  onChange={(e) => handleFilterChange('progress', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">כל הרמות</option>
                  <option value="not_started">לא התחיל (0%)</option>
                  <option value="in_progress">בתהליך (1-99%)</option>
                  <option value="completed">הושלם (100%)</option>
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

      {/* Stages List */}
      {stages.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">לא נמצאו שלבים</h3>
            <p className="text-gray-600">נסה לשנות את הסינונים או החיפוש</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {stages.map((stage) => {
            const StatusIcon = getStatusIcon(stage.status);
            const isOverdueStage = isOverdue(stage.due_date);
            
            return (
              <Card 
                key={stage.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-blue-500"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Header */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium bg-blue-100 text-blue-700 border border-blue-200">
                          <Target className="w-4 h-4" />
                          🎯 שלב
                          {stage.tasks_count && stage.tasks_count > 0 && (
                            <span className="text-blue-500">({stage.tasks_count})</span>
                          )}
                        </div>
                        
                        <StatusIcon className="h-5 w-5 text-gray-600" />
                        <h3 className="text-lg font-semibold text-gray-900">
                          {stage.title}
                        </h3>
                        
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(stage.status)}`}>
                          {getStatusText(stage.status)}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(stage.priority)}`}>
                          {getPriorityText(stage.priority)}
                        </span>
                        
                        {isOverdueStage && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                            🚨 באיחור
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      {stage.description && (
                        <p className="text-gray-600 mb-3 text-sm leading-relaxed">
                          {stage.description}
                        </p>
                      )}

                      {/* Progress Bar */}
                      {typeof stage.progress_percentage === 'number' && (
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">התקדמות שלב</span>
                            <span className="text-sm font-bold text-gray-900">{stage.progress_percentage}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all ${getProgressColor(stage.progress_percentage)}`}
                              style={{ width: `${stage.progress_percentage}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
                            <span>{stage.completed_tasks_count || 0} הושלמו</span>
                            <span>{stage.tasks_count || 0} סה"כ משימות</span>
                          </div>
                        </div>
                      )}

                      {/* Meta Information */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        {stage.project && (
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4" />
                            <span>{stage.project.name}</span>
                          </div>
                        )}
                        
                        {stage.assignee_profile && (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span>{stage.assignee_profile.full_name || stage.assignee_profile.email}</span>
                          </div>
                        )}
                        
                        {stage.due_date && (
                          <div className={`flex items-center gap-2 ${isOverdueStage ? 'text-red-600' : ''}`}>
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(stage.due_date)}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-2">
                          <CheckSquare className="h-4 w-4" />
                          <span>{stage.tasks_count || 0} משימות</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2 mr-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/tasks?stage=${stage.id}`);
                        }}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                        צפה במשימות
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/tasks/${stage.id}/edit`);
                        }}
                        className="flex items-center gap-2 text-orange-600 hover:text-orange-700 text-sm px-3 py-1 rounded-lg hover:bg-orange-50 transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                        ערוך שלב
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};