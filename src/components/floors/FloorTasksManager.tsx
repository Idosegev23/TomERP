import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  X, 
  Plus,
  Edit,
  Trash2,
  Save,
  Clock,
  User,
  AlertCircle,
  CheckCircle,
  FileText,
  Zap,
  Building2,
  Calendar,
  Target,
  Users,
  Camera,
  Briefcase,
  Shield,
  Wrench,
  Settings,
  Search,
  Filter
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Floor {
  id: string;
  name: string;
  floor_number: number;
}

interface FloorTask {
  id: string;
  floor_id: string;
  title: string;
  description?: string;
  category: string;
  priority: string;
  status: string;
  assigned_to?: string;
  due_date?: string;
  estimated_hours?: number;
  actual_hours?: number;
  progress_percentage: number;
  contractor_company?: string;
  notes?: string;
  requires_permit: boolean;
  safety_requirements?: string;
  completion_photos: boolean;
  created_at: string;
  completed_at?: string;
  assigned_user?: {
    id: string;
    full_name: string;
  };
}

interface FloorTasksManagerProps {
  isOpen: boolean;
  onClose: () => void;
  floor: Floor;
}

export const FloorTasksManager: React.FC<FloorTasksManagerProps> = ({
  isOpen,
  onClose,
  floor
}) => {
  const [tasks, setTasks] = useState<FloorTask[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<FloorTask | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    category: 'general',
    priority: 'medium',
    status: 'pending',
    assigned_to: '',
    due_date: '',
    estimated_hours: '',
    contractor_company: '',
    notes: '',
    requires_permit: false,
    safety_requirements: '',
    completion_photos: false
  });

  // קטגוריות אינטואיטיביות למשימות קומה
  const categories = [
    { id: 'all', label: '📋 הכל', icon: FileText },
    { id: 'construction', label: '🏗️ בנייה', icon: Building2 },
    { id: 'electrical', label: '⚡ חשמל', icon: Zap },
    { id: 'plumbing', label: '🚰 אינסטלציה', icon: Settings },
    { id: 'finishing', label: '🎨 גימורים', icon: Wrench },
    { id: 'inspection', label: '🔍 בדיקות', icon: Shield },
    { id: 'general', label: '📄 כללי', icon: FileText }
  ];

  const priorities = [
    { id: 'low', label: '🟢 נמוך', color: 'bg-green-100 text-green-800 border-green-200' },
    { id: 'medium', label: '🟡 בינוני', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    { id: 'high', label: '🟠 גבוה', color: 'bg-orange-100 text-orange-800 border-orange-200' },
    { id: 'urgent', label: '🔴 דחוף', color: 'bg-red-100 text-red-800 border-red-200' }
  ];

  const statuses = [
    { id: 'pending', label: '⏳ ממתין', color: 'bg-gray-100 text-gray-800 border-gray-200' },
    { id: 'in_progress', label: '🟦 בעבודה', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    { id: 'completed', label: '✅ הושלם', color: 'bg-green-100 text-green-800 border-green-200' },
    { id: 'cancelled', label: '❌ בוטל', color: 'bg-red-100 text-red-800 border-red-200' }
  ];

  useEffect(() => {
    if (isOpen) {
      fetchTasks();
      fetchUsers();
    }
  }, [isOpen, floor.id]);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('floor_tasks')
        .select(`
          *,
          assigned_user:assigned_to(id, full_name)
        `)
        .eq('floor_id', floor.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('שגיאה בטעינת המשימות');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!taskForm.title.trim()) {
      toast.error('כותרת המשימה היא שדה חובה');
      return;
    }

    try {
      const taskData = {
        floor_id: floor.id,
        title: taskForm.title.trim(),
        description: taskForm.description || null,
        category: taskForm.category,
        priority: taskForm.priority,
        status: taskForm.status,
        assigned_to: taskForm.assigned_to || null,
        due_date: taskForm.due_date || null,
        estimated_hours: taskForm.estimated_hours ? parseInt(taskForm.estimated_hours) : null,
        contractor_company: taskForm.contractor_company || null,
        notes: taskForm.notes || null,
        requires_permit: taskForm.requires_permit,
        safety_requirements: taskForm.safety_requirements || null,
        completion_photos: taskForm.completion_photos
      };

      if (editingTask) {
        const { error } = await supabase
          .from('floor_tasks')
          .update(taskData)
          .eq('id', editingTask.id);

        if (error) throw error;
        toast.success('המשימה עודכנה בהצלחה');
      } else {
        const { error } = await supabase
          .from('floor_tasks')
          .insert([taskData]);

        if (error) throw error;
        toast.success('המשימה נוצרה בהצלחה');
      }

      resetTaskForm();
      fetchTasks();
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error('שגיאה בשמירת המשימה');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את המשימה?')) return;

    try {
      const { error } = await supabase
        .from('floor_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      toast.success('המשימה נמחקה בהצלחה');
      fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('שגיאה במחיקת המשימה');
    }
  };

  const handleEditTask = (task: FloorTask) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || '',
      category: task.category,
      priority: task.priority,
      status: task.status,
      assigned_to: task.assigned_to || '',
      due_date: task.due_date || '',
      estimated_hours: task.estimated_hours?.toString() || '',
      contractor_company: task.contractor_company || '',
      notes: task.notes || '',
      requires_permit: task.requires_permit,
      safety_requirements: task.safety_requirements || '',
      completion_photos: task.completion_photos
    });
    setShowTaskForm(true);
  };

  const resetTaskForm = () => {
    setEditingTask(null);
    setTaskForm({
      title: '',
      description: '',
      category: 'general',
      priority: 'medium',
      status: 'pending',
      assigned_to: '',
      due_date: '',
      estimated_hours: '',
      contractor_company: '',
      notes: '',
      requires_permit: false,
      safety_requirements: '',
      completion_photos: false
    });
    setShowTaskForm(false);
  };

  const getStatusConfig = (status: string) => {
    return statuses.find(s => s.id === status) || statuses[0];
  };

  const getPriorityConfig = (priority: string) => {
    return priorities.find(p => p.id === priority) || priorities[1];
  };

  const filteredTasks = tasks.filter(task => {
    const matchesCategory = filterCategory === 'all' || task.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    const matchesSearch = searchTerm === '' || 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.contractor_company?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesCategory && matchesStatus && matchesSearch;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="border-b border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Zap className="w-6 h-6 text-orange-600" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    ⚡ משימות קומה {floor.floor_number}
                  </h2>
                  <p className="text-gray-600 mt-1">
                    {floor.name} • {tasks.length} משימות
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Action Bar */}
            <div className="flex items-center gap-4 mt-4">
              <button
                onClick={() => setShowTaskForm(true)}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                הוסף משימה
              </button>
              
              <div className="flex-1 relative">
                <Search className="h-5 w-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="חפש משימות..."
                  className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex gap-4 overflow-x-auto">
              <div className="flex gap-2">
                <span className="text-sm font-medium text-gray-700 py-2">קטגוריה:</span>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setFilterCategory(category.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                      filterCategory === category.id
                        ? 'bg-orange-100 text-orange-700 border border-orange-200'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <category.icon className="w-4 h-4" />
                    {category.label}
                  </button>
                ))}
              </div>
              
              <div className="flex gap-2 ml-4">
                <span className="text-sm font-medium text-gray-700 py-2">סטטוס:</span>
                {statuses.map((status) => (
                  <button
                    key={status.id}
                    onClick={() => setFilterStatus(status.id)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                      filterStatus === status.id
                        ? 'bg-orange-100 text-orange-700 border border-orange-200'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tasks Grid */}
          <div className="p-6 max-h-[50vh] overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="text-gray-500">טוען משימות...</div>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-12">
                <Zap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm ? 'לא נמצאו משימות' : 'אין משימות עדיין'}
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm ? 'נסה לשנות את החיפוש' : 'התחל בהוספת המשימה הראשונה'}
                </p>
                {!searchTerm && (
                  <button
                    onClick={() => setShowTaskForm(true)}
                    className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center gap-2 mx-auto"
                  >
                    <Plus className="w-4 h-4" />
                    הוסף משימה ראשונה
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTasks.map((task) => (
                  <div key={task.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 mb-1">{task.title}</h4>
                        {task.description && (
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{task.description}</p>
                        )}
                      </div>
                      
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={() => handleEditTask(task)}
                          className="p-1 text-gray-400 hover:text-blue-600"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className={`px-2 py-1 rounded-full text-xs border ${getStatusConfig(task.status).color}`}>
                        {getStatusConfig(task.status).label}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs border ${getPriorityConfig(task.priority).color}`}>
                        {getPriorityConfig(task.priority).label}
                      </span>
                      <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                        {categories.find(c => c.id === task.category)?.label || task.category}
                      </span>
                    </div>
                    
                    <div className="text-xs text-gray-500 space-y-1">
                      {task.assigned_user && (
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>{task.assigned_user.full_name}</span>
                        </div>
                      )}
                      {task.due_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(task.due_date).toLocaleDateString('he-IL')}</span>
                        </div>
                      )}
                      {task.contractor_company && (
                        <div className="flex items-center gap-1">
                          <Briefcase className="w-3 h-3" />
                          <span>{task.contractor_company}</span>
                        </div>
                      )}
                      {task.requires_permit && (
                        <div className="flex items-center gap-1 text-yellow-600">
                          <Shield className="w-3 h-3" />
                          <span>נדרש היתר</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Task Form Modal */}
      {showTaskForm && (
        <div className="fixed inset-0 z-60 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={resetTaskForm} />
            
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">
                    {editingTask ? 'ערוך משימה' : '⚡ הוסף משימה חדשה'}
                  </h3>
                  <button
                    onClick={resetTaskForm}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <form onSubmit={handleSubmitTask} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        כותרת המשימה *
                      </label>
                      <input
                        type="text"
                        value={taskForm.title}
                        onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        קטגוריה
                      </label>
                      <select
                        value={taskForm.category}
                        onChange={(e) => setTaskForm({ ...taskForm, category: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        {categories.slice(1).map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        עדיפות
                      </label>
                      <select
                        value={taskForm.priority}
                        onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        {priorities.map((priority) => (
                          <option key={priority.id} value={priority.id}>
                            {priority.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        אחראי
                      </label>
                      <select
                        value={taskForm.assigned_to}
                        onChange={(e) => setTaskForm({ ...taskForm, assigned_to: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        <option value="">בחר אחראי</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.full_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        תאריך יעד
                      </label>
                      <input
                        type="date"
                        value={taskForm.due_date}
                        onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      תיאור
                    </label>
                    <textarea
                      value={taskForm.description}
                      onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      rows={3}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        חברה קבלנית
                      </label>
                      <input
                        type="text"
                        value={taskForm.contractor_company}
                        onChange={(e) => setTaskForm({ ...taskForm, contractor_company: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        שעות משוערות
                      </label>
                      <input
                        type="number"
                        value={taskForm.estimated_hours}
                        onChange={(e) => setTaskForm({ ...taskForm, estimated_hours: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={taskForm.requires_permit}
                        onChange={(e) => setTaskForm({ ...taskForm, requires_permit: e.target.checked })}
                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">נדרש היתר</span>
                    </label>
                    
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={taskForm.completion_photos}
                        onChange={(e) => setTaskForm({ ...taskForm, completion_photos: e.target.checked })}
                        className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">נדרשות תמונות סיום</span>
                    </label>
                  </div>
                  
                  <div className="flex gap-4 pt-4">
                    <button
                      type="submit"
                      className="flex-1 bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {editingTask ? 'עדכן משימה' : 'צור משימה'}
                    </button>
                    <button
                      type="button"
                      onClick={resetTaskForm}
                      className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                    >
                      ביטול
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};