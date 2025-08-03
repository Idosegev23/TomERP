import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Building, Building2, MapPin, Calendar, Users, CheckSquare2, Settings, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { TaskViews } from '../components/tasks';
import { useTasks } from '../hooks/useTasks';

interface Project {
  id: string;
  name: string;
  description?: string;
  developer_id: string;
  address?: string;
  city?: string;
  neighborhood?: string;
  start_date?: string;
  completion_date?: string;
  marketing_start_date?: string;
  project_status?: string;
  created_at: string;
  developers?: {
    id: string;
    name: string;
  };
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  task_type: string;
  level: number;
  parent_task_id?: string;
  progress_percentage?: number;
  due_date?: string;
  assigned_to?: string;
  created_at: string;
  order_index?: number;
}

const ProjectDetails: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  
  const { updateTaskStatus: hookUpdateTaskStatus } = useTasks();

  useEffect(() => {
    if (projectId) {
      fetchProjectDetails();
      fetchProjectTasks();
    }
  }, [projectId]);

  const fetchProjectDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          developers:developer_id (
            id,
            name
          )
        `)
        .eq('id', projectId)
        .single();

      if (error) throw error;
      setProject(data);
    } catch (error) {
      setError('שגיאה בטעינת פרטי הפרויקט');
    }
  };

  const fetchProjectTasks = async () => {
    
    try {
      // Add timestamp to force fresh data
      const timestamp = Date.now();
      
      // Use direct query instead of RPC for immediate consistency
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('level', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Compare with current tasks to see if anything changed
      const currentTasksCount = tasks.length;
      const newTasksCount = data?.length || 0;
      
      // Check if any status actually changed
      const currentTasksById = tasks.reduce((acc, task) => {
        acc[task.id] = task.status;
        return acc;
      }, {} as Record<string, string>);
      
      const changedTasks = data?.filter(newTask => 
        currentTasksById[newTask.id] && currentTasksById[newTask.id] !== newTask.status
      ) || [];
      
      // Force state update by creating new array reference
      const newTasks = [...(data || [])];
      setTasks(newTasks);
    } catch (error) {
      setError('שגיאה בטעינת משימות הפרויקט');
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    
    // Use the hook function
    const success = await hookUpdateTaskStatus(taskId, newStatus);
    
    if (success) {
      // Immediate refresh without timeout
      await fetchProjectTasks();
    } else {
    }
    
    return success;
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      planning: 'bg-blue-100 text-blue-800',
      construction: 'bg-yellow-100 text-yellow-800',
      marketing: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800'
    };

    const statusLabels = {
      planning: 'בתכנון',
      construction: 'בבנייה',
      marketing: 'בשיווק',
      completed: 'הושלם'
    };

    const colorClass = statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800';
    const label = statusLabels[status as keyof typeof statusLabels] || status;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
        {label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">טוען פרטי פרויקט...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="text-red-600 text-lg mb-4">{error || 'פרויקט לא נמצא'}</div>
            <button
              onClick={() => navigate('/projects')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              חזרה לרשימת פרויקטים
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with breadcrumb */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <button
              onClick={() => navigate('/projects')}
              className="hover:text-blue-600 transition-colors"
            >
              פרויקטים
            </button>
            <ArrowRight className="h-4 w-4 rotate-180" />
            <span className="text-gray-900 font-medium">{project.name}</span>
          </div>
        </div>

        {/* Project Info Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Building className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{project.name}</h1>
                {project.description && (
                  <p className="text-gray-600 mb-4">{project.description}</p>
                )}
                
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>יזם: {(project as any).developers?.name || 'לא מוגדר'}</span>
                  </div>
                  
                  {project.city && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{project.city}{project.neighborhood ? `, ${project.neighborhood}` : ''}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>נוצר: {new Date(project.created_at).toLocaleDateString('he-IL')}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {getStatusBadge(project.project_status || 'planning')}
              <button
                onClick={() => navigate(`/projects/${project.id}/edit`)}
                className="flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Settings className="h-4 w-4" />
                עריכה
              </button>
            </div>
          </div>

          {/* Project Dates */}
          {(project.start_date || project.marketing_start_date || project.completion_date) && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {project.start_date && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-700 font-medium mb-1">
                      <Calendar className="h-4 w-4" />
                      תאריך התחלה
                    </div>
                    <div className="text-blue-900 font-semibold">
                      {new Date(project.start_date).toLocaleDateString('he-IL')}
                    </div>
                  </div>
                )}
                
                {project.marketing_start_date && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 text-green-700 font-medium mb-1">
                      <Users className="h-4 w-4" />
                      תחילת שיווק
                    </div>
                    <div className="text-green-900 font-semibold">
                      {new Date(project.marketing_start_date).toLocaleDateString('he-IL')}
                    </div>
                  </div>
                )}
                
                {project.completion_date && (
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-700 font-medium mb-1">
                      <CheckSquare2 className="h-4 w-4" />
                      סיום צפוי
                    </div>
                    <div className="text-yellow-900 font-semibold">
                      {new Date(project.completion_date).toLocaleDateString('he-IL')}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Project Statistics & Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">סה"כ משימות</p>
                <p className="text-2xl font-bold text-gray-900">{tasks.length}</p>
              </div>
              <CheckSquare2 className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">משימות הושלמו</p>
                <p className="text-2xl font-bold text-green-600">
                  {tasks.filter(t => t.status === 'completed').length}
                </p>
              </div>
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <div className="h-4 w-4 bg-green-600 rounded-full"></div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">בתהליך</p>
                <p className="text-2xl font-bold text-blue-600">
                  {tasks.filter(t => t.status === 'in_progress').length}
                </p>
              </div>
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                <div className="h-4 w-4 bg-blue-600 rounded-full"></div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">🎯 שלבים</p>
                <p className="text-2xl font-bold text-purple-600">
                  {tasks.filter(t => t.level === 0).length}
                </p>
              </div>
              <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                <div className="h-4 w-4 bg-purple-600 rounded-full"></div>
              </div>
            </div>
          </div>

          {/* Buildings Button */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <button
              onClick={() => navigate(`/projects/${project.id}/buildings`)}
              className="w-full h-full flex flex-col items-center justify-center gap-2 hover:bg-gray-50 transition-colors group"
            >
              <Building2 className="h-8 w-8 text-orange-600 group-hover:text-orange-700" />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-600 group-hover:text-gray-700">
                  בניינים
                </p>
                <p className="text-xs text-orange-600 group-hover:text-orange-700">
                  נהל בניינים
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Tasks Section */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckSquare2 className="h-6 w-6 text-green-600" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">משימות הפרויקט</h2>
                  <p className="text-sm text-gray-600">
                    ניהול ומעקב אחר כל השלבים והמשימות
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => setShowTaskForm(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                הוסף משימה
              </button>
            </div>
          </div>

          <div className="p-6">
            {tasks.length === 0 ? (
              <div className="text-center py-12">
                <CheckSquare2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">אין משימות בפרויקט זה</h3>
                <p className="text-gray-500 mb-6">התחל על ידי הוספת משימות לפרויקט</p>
                <button 
                  onClick={() => setShowTaskForm(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  הוסף משימה ראשונה
                </button>
              </div>
            ) : (
              <TaskViews 
                key={`tasks-${projectId}`}
                tasks={tasks} 
                onUpdateTaskStatus={updateTaskStatus}
                onRefresh={fetchProjectTasks}
              />
            )}
          </div>
        </div>
      </div>
      
      {/* Task Form Modal */}
      {/* {projectId && (
        <TaskFormModal
          isOpen={showTaskForm}
          onClose={() => setShowTaskForm(false)}
          onTaskCreated={fetchProjectTasks}
          projectId={projectId}
        />
      )} */}
    </div>
  );
};

export default ProjectDetails; 