import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  X, 
  Plus, 
  Edit, 
  Trash2,
  CheckCircle,
  Clock,
  User,
  Calendar,
  Tag,
  FileText,
  Building,
  Home,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import TaskFormModal from '../tasks/TaskFormModal';
// import { TaskDetailsModal } from '../tasks';

interface UnitTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  unit: any;
  building?: any;
  floor?: any;
  project?: any;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'draft' | 'open' | 'in_progress' | 'pending_approval' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  assigned_to?: string;
  project_id?: string;
  building_id?: string;
  floor_id?: string;
  apartment_id?: string;
  created_at: string;
  updated_at?: string;
  assigned_user?: {
    full_name: string;
    email?: string;
  };
}

export const UnitTasksModal: React.FC<UnitTasksModalProps> = ({ 
  isOpen, 
  onClose, 
  unit,
  building,
  floor,
  project
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<'all' | 'unit' | 'building' | 'floor' | 'project'>('all');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showTaskDetails, setShowTaskDetails] = useState(false);

  useEffect(() => {
    if (isOpen && unit) {
      loadTasks();
    }
  }, [isOpen, unit, filter]);

  const loadTasks = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('tasks')
        .select(`
          *,
          assigned_user:users!tasks_assigned_to_fkey (
            full_name,
            email
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      // Apply entity filters
      if (filter === 'unit') {
        query = query.eq('apartment_id', unit.id);
      } else if (filter === 'building') {
        query = query.eq('building_id', building?.id);
      } else if (filter === 'floor') {
        query = query.eq('floor_id', floor?.id);
      } else if (filter === 'project') {
        query = query.eq('project_id', project?.id);
      } else {
        // All related tasks - using OR condition
        query = query.or(`apartment_id.eq.${unit.id},building_id.eq.${building?.id || ''},floor_id.eq.${floor?.id || ''},project_id.eq.${project?.id || ''}`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      toast.error('שגיאה בטעינת המשימות');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId);

      if (error) throw error;

      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, ...updates } : task
      ));

      toast.success('המשימה עודכנה בהצלחה');
    } catch (error) {
      toast.error('שגיאה בעדכון המשימה');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את המשימה?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ is_active: false })
        .eq('id', taskId);

      if (error) throw error;

      setTasks(prev => prev.filter(task => task.id !== taskId));
      toast.success('המשימה נמחקה בהצלחה');
    } catch (error) {
      toast.error('שגיאה במחיקת המשימה');
    }
  };

  const handleTaskClick = (taskId: string) => {
    setSelectedTaskId(taskId);
    setShowTaskDetails(true);
  };

  const handleTaskDetailsClose = () => {
    setShowTaskDetails(false);
    setSelectedTaskId(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'in_progress': return 'text-blue-600 bg-blue-50';
      case 'todo': return 'text-orange-600 bg-orange-50';
      case 'cancelled': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'הושלמה';
      case 'in_progress': return 'בביצוע';
      case 'todo': return 'לביצוע';
      case 'cancelled': return 'בוטלה';
      default: return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  const getEntityTypeLabel = (entityType: string) => {
    switch (entityType) {
      case 'unit': return 'דירה';
      case 'building': return 'בניין';
      case 'floor': return 'קומה';
      case 'project': return 'פרויקט';
      default: return entityType;
    }
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'unit': return <Home className="h-4 w-4" />;
      case 'building': return <Building className="h-4 w-4" />;
      case 'floor': return <Tag className="h-4 w-4" />;
      case 'project': return <FileText className="h-4 w-4" />;
      default: return <Tag className="h-4 w-4" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h3 className="text-lg font-semibold">ניהול משימות - דירה {unit?.apartment_number}</h3>
            <p className="text-sm text-gray-600 mt-1">
              {project?.name} → {building?.name} → קומה {floor?.floor_number}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Filter Tabs */}
          <div className="flex gap-2 mb-6 border-b">
            {[
              { key: 'all', label: 'כל המשימות', count: tasks.length },
              { key: 'unit', label: 'דירה', count: tasks.filter(t => t.apartment_id).length },
              { key: 'building', label: 'בניין', count: tasks.filter(t => t.building_id && !t.apartment_id && !t.floor_id).length },
              { key: 'floor', label: 'קומה', count: tasks.filter(t => t.floor_id && !t.apartment_id).length },
              { key: 'project', label: 'פרויקט', count: tasks.filter(t => t.project_id && !t.building_id && !t.floor_id && !t.apartment_id).length },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as any)}
                className={`px-4 py-2 rounded-t-lg border-b-2 transition-colors ${
                  filter === tab.key
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex gap-2">
              <button
                onClick={() => setShowTaskForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                משימה חדשה
              </button>
            </div>
            
            <div className="text-sm text-gray-600">
              {tasks.filter(t => t.status === 'completed').length} / {tasks.length} הושלמו
            </div>
          </div>

          {/* Tasks List */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">אין משימות</h3>
              <p className="text-gray-600 mb-4">התחל בהוספת המשימה הראשונה</p>
              <button
                onClick={() => setShowTaskForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                הוסף משימה
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => (
                <div 
                  key={task.id} 
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleTaskClick(task.id)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium text-gray-900">{task.title}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(task.status)}`}>
                          {getStatusLabel(task.status)}
                        </span>
                        <span className={`flex items-center gap-1 text-xs ${getPriorityColor(task.priority)}`}>
                          <AlertCircle className="h-3 w-3" />
                          {task.priority}
                        </span>
                      </div>
                      
                      {task.description && (
                        <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          {task.apartment_id ? <Home className="h-4 w-4" /> : 
                           task.building_id ? <Building className="h-4 w-4" /> :
                           task.floor_id ? <Tag className="h-4 w-4" /> :
                           task.project_id ? <FileText className="h-4 w-4" /> : <Tag className="h-4 w-4" />}
                          {task.apartment_id ? 'דירה' : 
                           task.building_id ? 'בניין' :
                           task.floor_id ? 'קומה' :
                           task.project_id ? 'פרויקט' : 'כללי'}
                        </span>
                        
                        {task.assigned_user && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {task.assigned_user.full_name}
                          </span>
                        )}
                        
                        {task.due_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(task.due_date).toLocaleDateString('he-IL')}
                          </span>
                        )}
                        
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(task.created_at).toLocaleDateString('he-IL')}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {task.status !== 'completed' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTaskUpdate(task.id, { status: 'completed' });
                          }}
                          className="text-green-600 hover:text-green-800 transition-colors"
                          title="סמן כהושלמה"
                        >
                          <CheckCircle className="h-5 w-5" />
                        </button>
                      )}
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTask(task);
                          setShowTaskForm(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        title="עריכה"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTask(task.id);
                        }}
                        className="text-red-600 hover:text-red-800 transition-colors"
                        title="מחיקה"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Task Form Modal */}
        {showTaskForm && (
          <TaskFormModal
            isOpen={showTaskForm}
            onClose={() => {
              setShowTaskForm(false);
              setEditingTask(null);
            }}
            onTaskCreated={() => {
              loadTasks();
              setShowTaskForm(false);
              setEditingTask(null);
            }}
            projectId={project?.id}
          />
        )}

        {/* Task Details Modal */}
        {/* {showTaskDetails && selectedTaskId && (
          <TaskDetailsModal
            isOpen={showTaskDetails}
            onClose={handleTaskDetailsClose}
            taskId={selectedTaskId}
            onTaskUpdated={loadTasks}
          />
        )} */}
      </div>
    </div>
  );
}; 