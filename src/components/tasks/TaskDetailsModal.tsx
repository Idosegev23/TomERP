import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Calendar, 
  Building, 
  Home, 
  Tag, 
  FileText, 
  Clock,
  Flag,
  CheckCircle,
  Edit,
  Save,
  Paperclip,
  Upload,
  Eye,
  Download,
  Trash2,
  History
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { Button } from '../ui';
import { FileUploadModal, FileViewModal, FileVersionModal } from '../files';

interface TaskDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  onTaskUpdated?: () => void;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string;
  assigned_to: string;
  project_id: string;
  building_id: string;
  floor_id: string;
  apartment_id: string;
  created_at: string;
  updated_at: string;
  assigned_user?: {
    full_name: string;
    email: string;
  };
  project?: {
    id: string;
    name: string;
  };
  building?: {
    id: string;
    name: string;
  };
  floor?: {
    id: string;
    floor_number: number;
  };
  apartment?: {
    id: string;
    apartment_number: string;
  };
}

interface TaskFile {
  id: string;
  filename: string;
  original_filename?: string;
  file_type: string;
  file_size: number;
  mime_type?: string;
  file_url: string;
  thumbnail_url?: string;
  task_id?: string;
  project_id?: string;
  building_id?: string;
  floor_id?: string;
  apartment_id?: string;
  category?: string;
  tags?: string[];
  description?: string;
  version?: number;
  parent_file_id?: string;
  uploaded_by?: string;
  created_at: string;
  is_active?: boolean;
}

const TASK_STATUSES = [
  { value: 'draft', label: 'טיוטה', color: 'bg-gray-100 text-gray-800' },
  { value: 'open', label: 'פתוחה', color: 'bg-blue-100 text-blue-800' },
  { value: 'in_progress', label: 'בתהליך', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'pending_approval', label: 'ממתינה לאישור', color: 'bg-orange-100 text-orange-800' },
  { value: 'completed', label: 'הושלמה', color: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: 'בוטלה', color: 'bg-red-100 text-red-800' }
];

const TASK_PRIORITIES = [
  { value: 'low', label: 'נמוכה', color: 'text-green-600' },
  { value: 'medium', label: 'בינונית', color: 'text-yellow-600' },
  { value: 'high', label: 'גבוהה', color: 'text-orange-600' },
  { value: 'urgent', label: 'דחופה', color: 'text-red-600' }
];

export const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({ 
  isOpen, 
  onClose, 
  taskId, 
  onTaskUpdated 
}) => {
  const [task, setTask] = useState<Task | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [buildings, setBuildings] = useState<any[]>([]);
  const [floors, setFloors] = useState<any[]>([]);
  const [apartments, setApartments] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'files' | 'history'>('details');
  
  // Files state
  const [taskFiles, setTaskFiles] = useState<TaskFile[]>([]);
  const [showFileUploadModal, setShowFileUploadModal] = useState(false);
  const [showFileViewModal, setShowFileViewModal] = useState(false);
  const [showFileVersionModal, setShowFileVersionModal] = useState(false);
  const [selectedFileForView, setSelectedFileForView] = useState<TaskFile | null>(null);
  const [selectedFileForVersions, setSelectedFileForVersions] = useState<TaskFile | null>(null);
  const [loadingFiles, setLoadingFiles] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    status: '',
    priority: '',
    due_date: '',
    assigned_to: '',
    project_id: '',
    building_id: '',
    floor_id: '',
    apartment_id: ''
  });

  useEffect(() => {
    if (isOpen && taskId) {
      loadTaskData();
      loadUsers();
      loadProjects();
    }
  }, [isOpen, taskId]);

  useEffect(() => {
    if (editForm.project_id) {
      loadBuildings(editForm.project_id);
    }
  }, [editForm.project_id]);

  useEffect(() => {
    if (editForm.building_id) {
      loadFloors(editForm.building_id);
    }
  }, [editForm.building_id]);

  useEffect(() => {
    if (editForm.floor_id) {
      loadApartments(editForm.floor_id);
    }
  }, [editForm.floor_id]);

  useEffect(() => {
    if (activeTab === 'files' && taskId) {
      loadTaskFiles();
    }
  }, [activeTab, taskId]);

  const loadTaskData = async () => {
    setIsLoading(true);
    try {
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select(`
          *,
          assigned_user:users!tasks_assigned_to_fkey (
            full_name,
            email
          ),
          project:projects (
            id,
            name
          ),
          building:buildings (
            id,
            name
          ),
          floor:floors (
            id,
            floor_number
          ),
          apartment:apartments (
            id,
            apartment_number
          )
        `)
        .eq('id', taskId)
        .single();

      if (taskError) throw taskError;

      setTask(taskData);
      setEditForm({
        title: taskData.title || '',
        description: taskData.description || '',
        status: taskData.status || 'open',
        priority: taskData.priority || 'medium',
        due_date: taskData.due_date || '',
        assigned_to: taskData.assigned_to || '',
        project_id: taskData.project_id || '',
        building_id: taskData.building_id || '',
        floor_id: taskData.floor_id || '',
        apartment_id: taskData.apartment_id || ''
      });
    } catch (error) {
      toast.error('שגיאה בטעינת המשימה');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
    }
  };

  const loadProjects = async () => {
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

  const loadBuildings = async (projectId: string) => {
    if (!projectId) return;
    try {
      const { data, error } = await supabase
        .from('buildings')
        .select('id, name, project_id')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setBuildings(data || []);
    } catch (error) {
    }
  };

  const loadFloors = async (buildingId: string) => {
    if (!buildingId) return;
    try {
      const { data, error } = await supabase
        .from('floors')
        .select('id, floor_number, building_id')
        .eq('building_id', buildingId)
        .eq('is_active', true)
        .order('floor_number');

      if (error) throw error;
      setFloors(data || []);
    } catch (error) {
    }
  };

  const loadApartments = async (floorId: string) => {
    if (!floorId) return;
    try {
      const { data, error } = await supabase
        .from('apartments')
        .select('id, apartment_number, floor_id')
        .eq('floor_id', floorId)
        .eq('is_active', true)
        .order('apartment_number');

      if (error) throw error;
      setApartments(data || []);
    } catch (error) {
    }
  };

  const loadTaskFiles = async () => {
    setLoadingFiles(true);
    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('task_id', taskId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setTaskFiles(data || []);
    } catch (error) {
      toast.error('שגיאה בטעינת קבצי המשימה');
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleFileUploadSuccess = () => {
    setShowFileUploadModal(false);
    setShowFileVersionModal(false);
    loadTaskFiles();
    toast.success('הקבצים הועלו בהצלחה למשימה');
  };

  const handleViewFile = (file: TaskFile) => {
    setSelectedFileForView(file);
    setShowFileViewModal(true);
  };

  const handleVersionsClick = (file: TaskFile) => {
    setSelectedFileForVersions(file);
    setShowFileVersionModal(true);
  };

  const handleDownloadFile = async (file: TaskFile) => {
    try {
      const { data, error } = await supabase.storage
        .from('files')
        .download(file.file_url);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_filename || file.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('שגיאה בהורדת הקובץ');
    }
  };

  const handleDeleteFile = async (fileId: string, fileUrl: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את הקובץ?')) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('files')
        .remove([fileUrl]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('files')
        .delete()
        .eq('id', fileId);

      if (dbError) throw dbError;

      toast.success('הקובץ נמחק בהצלחה');
      loadTaskFiles();
    } catch (error) {
      toast.error('שגיאה במחיקת הקובץ');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <FileText className="h-5 w-5 text-blue-500" />;
    if (fileType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
    if (fileType.includes('doc')) return <FileText className="h-5 w-5 text-blue-600" />;
    if (fileType.includes('sheet') || fileType.includes('excel')) return <FileText className="h-5 w-5 text-green-500" />;
    return <FileText className="h-5 w-5 text-gray-500" />;
  };

  const handleSaveTask = async () => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: editForm.title,
          description: editForm.description,
          status: editForm.status,
          priority: editForm.priority,
          due_date: editForm.due_date || null,
          assigned_to: editForm.assigned_to || null,
          project_id: editForm.project_id || null,
          building_id: editForm.building_id || null,
          floor_id: editForm.floor_id || null,
          apartment_id: editForm.apartment_id || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) throw error;

      toast.success('המשימה עודכנה בהצלחה');
      setIsEditing(false);
      await loadTaskData();
      onTaskUpdated?.();
    } catch (error) {
      toast.error('שגיאה בעדכון המשימה');
    }
  };

  const getStatusColor = (status: string) => {
    return TASK_STATUSES.find(s => s.value === status)?.color || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    return TASK_PRIORITIES.find(p => p.value === priority)?.color || 'text-gray-600';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold">פרטי משימה</h3>
              {task && (
                <p className="text-sm text-gray-600">
                  נוצרה: {new Date(task.created_at).toLocaleDateString('he-IL')}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit className="h-4 w-4 mr-1" />
                עריכה
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                >
                  ביטול
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveTask}
                >
                  <Save className="h-4 w-4 mr-1" />
                  שמירה
                </Button>
              </div>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {[
            { key: 'details', label: 'פרטים', icon: FileText },
            { key: 'files', label: 'קבצים', icon: Paperclip },
            { key: 'history', label: 'היסטוריה', icon: Clock }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Details Tab */}
              {activeTab === 'details' && task && (
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        כותרת המשימה
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.title}
                          onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <p className="text-gray-900 font-medium">{task.title}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        סטטוס
                      </label>
                      {isEditing ? (
                        <select
                          value={editForm.status}
                          onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {TASK_STATUSES.map(status => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(task.status)}`}>
                          {TASK_STATUSES.find(s => s.value === task.status)?.label}
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        עדיפות
                      </label>
                      {isEditing ? (
                        <select
                          value={editForm.priority}
                          onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {TASK_PRIORITIES.map(priority => (
                            <option key={priority.value} value={priority.value}>
                              {priority.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className={`flex items-center gap-1 ${getPriorityColor(task.priority)}`}>
                          <Flag className="h-4 w-4" />
                          {TASK_PRIORITIES.find(p => p.value === task.priority)?.label}
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        תאריך יעד
                      </label>
                      {isEditing ? (
                        <input
                          type="date"
                          value={editForm.due_date}
                          onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <span className="flex items-center gap-1 text-gray-600">
                          <Calendar className="h-4 w-4" />
                          {task.due_date ? new Date(task.due_date).toLocaleDateString('he-IL') : 'לא נקבע'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      תיאור
                    </label>
                    {isEditing ? (
                      <textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="תיאור המשימה..."
                      />
                    ) : (
                      <p className="text-gray-600 whitespace-pre-wrap">
                        {task.description || 'אין תיאור'}
                      </p>
                    )}
                  </div>

                  {/* Assignment */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      אחראי
                    </label>
                    {isEditing ? (
                      <select
                        value={editForm.assigned_to}
                        onChange={(e) => setEditForm({ ...editForm, assigned_to: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">בחר אחראי</option>
                        {users.map(user => (
                          <option key={user.id} value={user.id}>
                            {user.full_name} ({user.email})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="flex items-center gap-2 text-gray-600">
                        <User className="h-4 w-4" />
                        {task.assigned_user ? 
                          `${task.assigned_user.full_name} (${task.assigned_user.email})` : 
                          'לא הוקצה'
                        }
                      </span>
                    )}
                  </div>

                  {/* Location Assignment */}
                  <div className="border-t pt-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">שיוך מיקום</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          פרויקט
                        </label>
                        {isEditing ? (
                          <select
                            value={editForm.project_id}
                            onChange={(e) => setEditForm({ ...editForm, project_id: e.target.value, building_id: '', floor_id: '', apartment_id: '' })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">בחר פרויקט</option>
                            {projects.map(project => (
                              <option key={project.id} value={project.id}>
                                {project.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="flex items-center gap-2 text-gray-600">
                            <Building className="h-4 w-4" />
                            {task.project?.name || 'לא משויך'}
                          </span>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          בניין
                        </label>
                        {isEditing ? (
                          <select
                            value={editForm.building_id}
                            onChange={(e) => setEditForm({ ...editForm, building_id: e.target.value, floor_id: '', apartment_id: '' })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={!editForm.project_id}
                          >
                            <option value="">בחר בניין</option>
                            {buildings.map(building => (
                              <option key={building.id} value={building.id}>
                                {building.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="flex items-center gap-2 text-gray-600">
                            <Building className="h-4 w-4" />
                            {task.building?.name || 'לא משויך'}
                          </span>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          קומה
                        </label>
                        {isEditing ? (
                          <select
                            value={editForm.floor_id}
                            onChange={(e) => setEditForm({ ...editForm, floor_id: e.target.value, apartment_id: '' })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={!editForm.building_id}
                          >
                            <option value="">בחר קומה</option>
                            {floors.map(floor => (
                              <option key={floor.id} value={floor.id}>
                                קומה {floor.floor_number}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="flex items-center gap-2 text-gray-600">
                            <Tag className="h-4 w-4" />
                            {task.floor ? `קומה ${task.floor.floor_number}` : 'לא משויך'}
                          </span>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          דירה
                        </label>
                        {isEditing ? (
                          <select
                            value={editForm.apartment_id}
                            onChange={(e) => setEditForm({ ...editForm, apartment_id: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={!editForm.floor_id}
                          >
                            <option value="">בחר דירה</option>
                            {apartments.map(apartment => (
                              <option key={apartment.id} value={apartment.id}>
                                דירה {apartment.apartment_number}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="flex items-center gap-2 text-gray-600">
                            <Home className="h-4 w-4" />
                            {task.apartment ? `דירה ${task.apartment.apartment_number}` : 'לא משויך'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Files Tab */}
              {activeTab === 'files' && (
                <div className="space-y-6">
                  {/* Header with upload button */}
                  <div className="flex justify-between items-center">
                    <h4 className="text-lg font-medium text-gray-900">קבצי המשימה</h4>
                    <Button
                      onClick={() => setShowFileUploadModal(true)}
                      className="flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      העלה קבצים
                    </Button>
                  </div>

                  {/* Files list */}
                  {loadingFiles ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : taskFiles.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {taskFiles.map((file) => (
                        <div key={file.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {getFileIcon(file.file_type)}
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {file.original_filename || file.filename}
                              </span>
                            </div>
                          </div>
                          
                          {file.description && (
                            <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                              {file.description}
                            </p>
                          )}
                          
                          {file.tags && file.tags.length > 0 && (
                            <div className="mb-3">
                              {file.tags.slice(0, 2).map((tag, index) => (
                                <span
                                  key={index}
                                  className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full mr-1 mb-1"
                                >
                                  {tag}
                                </span>
                              ))}
                              {file.tags.length > 2 && (
                                <span className="text-xs text-gray-500">+{file.tags.length - 2}</span>
                              )}
                            </div>
                          )}
                          
                          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                            <span className="text-xs text-gray-500">
                              {formatFileSize(file.file_size)}
                            </span>
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleViewFile(file)}
                                className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded transition-colors"
                                title="צפה בקובץ"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleVersionsClick(file)}
                                className="text-purple-600 hover:text-purple-800 p-1 hover:bg-purple-50 rounded transition-colors"
                                title="גרסאות קובץ"
                              >
                                <History className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDownloadFile(file)}
                                className="text-green-600 hover:text-green-800 p-1 hover:bg-green-50 rounded transition-colors"
                                title="הורד קובץ"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteFile(file.id, file.file_url)}
                                className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded transition-colors"
                                title="מחק קובץ"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                      <p>אין קבצים עדיין</p>
                      <p className="text-sm mt-2">השתמש בכפתור "העלה קבצים" כדי להוסיף קבצים למשימה</p>
                    </div>
                  )}
                </div>
              )}

              {/* History Tab */}
              {activeTab === 'history' && (
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-gray-900">היסטוריית המשימה</h4>
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>היסטוריית שינויים תיושם בעדכון הבא</p>
                    <p className="text-sm mt-2">יכלול מעקב אחר כל השינויים במשימה</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* File Upload Modal */}
      {showFileUploadModal && task && (
        <FileUploadModal
          isOpen={showFileUploadModal}
          onClose={() => setShowFileUploadModal(false)}
          onUploadSuccess={handleFileUploadSuccess}
        />
      )}

      {/* File View Modal */}
      {showFileViewModal && selectedFileForView && (
        <FileViewModal
          isOpen={showFileViewModal}
          onClose={() => {
            setShowFileViewModal(false);
            setSelectedFileForView(null);
          }}
          file={{
            id: selectedFileForView.id,
            file_name: selectedFileForView.original_filename || '',
            file_path: selectedFileForView.file_url,
            file_type: selectedFileForView.file_type,
            file_size: selectedFileForView.file_size
          }}
        />
      )}

      {/* File Version Modal */}
      {showFileVersionModal && selectedFileForVersions && (
        <FileVersionModal
          isOpen={showFileVersionModal}
          onClose={() => {
            setShowFileVersionModal(false);
            setSelectedFileForVersions(null);
          }}
          fileId={selectedFileForVersions.id}
          fileName={selectedFileForVersions.original_filename || selectedFileForVersions.filename}
          onVersionUploaded={handleFileUploadSuccess}
        />
      )}
    </div>
  );
}; 