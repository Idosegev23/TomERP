import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  X, 
  Save, 
  Upload, 
  FileText, 
  Image, 
  Video,
  Download,
  Eye,
  Trash2,
  User,
  Calendar,
  Flag,
  MessageCircle,
  Send,
  Paperclip,
  Building,
  Home,
  Layers,
  ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Task {
  id: string;
  title: string;
  description: string;
  task_type: string;
  priority: string;
  status: string;
  due_date?: string;
  start_date?: string;
  assigned_to?: string;
  assigned_by?: string;
  progress_percentage: number;
  developer_id?: string;
  project_id?: string;
  building_id?: string;
  floor_id?: string;
  apartment_id?: string;
  parent_task_id?: string;
  stage_order?: number;
  created_at: string;
  updated_at: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  role: string;
}

interface TaskFile {
  id: string;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  file_url: string;
  thumbnail_url?: string;
  category?: string;
  tags?: string[];
  description?: string;
  created_at: string;
  uploaded_by?: string;
  uploader?: User;
}

interface TaskComment {
  id: string;
  comment: string;
  author_id: string;
  created_at: string;
  author?: User;
}

interface TaskEditModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated: () => void;
}

export const TaskEditModal: React.FC<TaskEditModalProps> = ({
  task,
  isOpen,
  onClose,
  onTaskUpdated
}) => {
  const [editedTask, setEditedTask] = useState<Task>(task);
  const [users, setUsers] = useState<User[]>([]);
  const [taskFiles, setTaskFiles] = useState<TaskFile[]>([]);
  const [taskComments, setTaskComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'files' | 'comments'>('details');
  const [previewFile, setPreviewFile] = useState<TaskFile | null>(null);
  const [entityNames, setEntityNames] = useState<{[key: string]: string}>({});

  useEffect(() => {
    if (isOpen) {
      setEditedTask(task);
      fetchUsers();
      fetchTaskFiles();
      fetchTaskComments();
      fetchEntityNames();
    }
  }, [isOpen, task]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, phone, role')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchTaskFiles = async () => {
    try {
      const { data, error } = await supabase
        .from('files')
        .select(`
          *,
          uploader:uploaded_by(id, full_name, email)
        `)
        .eq('task_id', task.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTaskFiles(data || []);
    } catch (error) {
      console.error('Error fetching task files:', error);
    }
  };

  const fetchTaskComments = async () => {
    try {
      const { data, error } = await supabase
        .from('task_comments')
        .select(`
          *,
          author:author_id(id, full_name, email)
        `)
        .eq('task_id', task.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTaskComments(data || []);
    } catch (error) {
      console.error('Error fetching task comments:', error);
    }
  };

  const fetchEntityNames = async () => {
    const names: {[key: string]: string} = {};
    
    try {
      // Fetch project name
      if (task.project_id) {
        const { data: project } = await supabase
          .from('projects')
          .select('name')
          .eq('id', task.project_id)
          .single();
        if (project) names.project = project.name;
      }

      // Fetch building name
      if (task.building_id) {
        const { data: building } = await supabase
          .from('buildings')
          .select('name')
          .eq('id', task.building_id)
          .single();
        if (building) names.building = building.name;
      }

      // Fetch floor name
      if (task.floor_id) {
        const { data: floor } = await supabase
          .from('floors')
          .select('name, floor_number')
          .eq('id', task.floor_id)
          .single();
        if (floor) names.floor = floor.name || `קומה ${floor.floor_number}`;
      }

      // Fetch apartment number
      if (task.apartment_id) {
        const { data: apartment } = await supabase
          .from('apartments')
          .select('apartment_number')
          .eq('id', task.apartment_id)
          .single();
        if (apartment) names.apartment = `דירה ${apartment.apartment_number}`;
      }

      setEntityNames(names);
    } catch (error) {
      console.error('Error fetching entity names:', error);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: editedTask.title,
          description: editedTask.description,
          task_type: editedTask.task_type,
          priority: editedTask.priority,
          status: editedTask.status,
          due_date: editedTask.due_date,
          start_date: editedTask.start_date,
          assigned_to: editedTask.assigned_to,
          progress_percentage: editedTask.progress_percentage,
          stage_order: editedTask.stage_order,
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id);

      if (error) throw error;

      toast.success('המשימה עודכנה בהצלחה');
      onTaskUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('שגיאה בעדכון המשימה');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      toast.error('אנא בחר קבצים להעלאה');
      return;
    }

    setIsUploading(true);
    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const fileName = `${Date.now()}_${file.name}`;
        
        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('files')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('files')
          .getPublicUrl(fileName);

        // Determine file type
        const fileType = getFileType(file.type);

        // Save file record to database
        const { error: dbError } = await supabase
          .from('files')
          .insert({
            filename: fileName,
            original_filename: file.name,
            file_type: fileType,
            file_size: file.size,
            mime_type: file.type,
            file_url: publicUrl,
            task_id: task.id,
            uploaded_by: (await supabase.auth.getUser()).data.user?.id,
            category: 'משימה'
          });

        if (dbError) throw dbError;
      }

      toast.success(`${selectedFiles.length} קבצים הועלו בהצלחה`);
      setSelectedFiles(null);
      fetchTaskFiles();
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('שגיאה בהעלאת הקבצים');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      const { error } = await supabase
        .from('task_comments')
        .insert({
          task_id: task.id,
          comment: newComment.trim(),
          author_id: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;

      toast.success('התגובה נוספה בהצלחה');
      setNewComment('');
      fetchTaskComments();
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('שגיאה בהוספת התגובה');
    }
  };

  const getFileType = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return 'document';
    if (mimeType.includes('presentation')) return 'presentation';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'spreadsheet';
    return 'other';
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'image': return <Image className="w-5 h-5 text-blue-500" />;
      case 'video': return <Video className="w-5 h-5 text-red-500" />;
      case 'document': return <FileText className="w-5 h-5 text-green-500" />;
      default: return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownloadFile = async (file: TaskFile) => {
    try {
      const response = await fetch(file.file_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('שגיאה בהורדת הקובץ');
    }
  };

  const FilePreviewModal = ({ file }: { file: TaskFile }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75" onClick={() => setPreviewFile(null)}>
      <div className="max-w-4xl max-h-[90vh] w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="bg-white rounded-lg overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="text-lg font-semibold">{file.original_filename}</h3>
            <button
              onClick={() => setPreviewFile(null)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 max-h-[70vh] overflow-auto">
            {file.file_type === 'image' ? (
              <img 
                src={file.file_url} 
                alt={file.original_filename}
                className="max-w-full h-auto"
              />
            ) : (
              <div className="text-center py-8">
                <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 mb-4">לא ניתן להציג תצוגה מקדימה לסוג קובץ זה</p>
                <button
                  onClick={() => handleDownloadFile(file)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  הורד קובץ
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
          
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden modal-mobile">
            {/* Header */}
            <div className="border-b border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">עריכת משימה</h2>
                  
                  {/* Breadcrumb */}
                  {(entityNames.project || entityNames.building || entityNames.floor || entityNames.apartment) && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                      {entityNames.project && (
                        <>
                          <Building className="w-4 h-4" />
                          <span>{entityNames.project}</span>
                        </>
                      )}
                      {entityNames.building && (
                        <>
                          <ChevronRight className="w-4 h-4" />
                          <Home className="w-4 h-4" />
                          <span>{entityNames.building}</span>
                        </>
                      )}
                      {entityNames.floor && (
                        <>
                          <ChevronRight className="w-4 h-4" />
                          <Layers className="w-4 h-4" />
                          <span>{entityNames.floor}</span>
                        </>
                      )}
                      {entityNames.apartment && (
                        <>
                          <ChevronRight className="w-4 h-4" />
                          <Home className="w-4 h-4" />
                          <span>{entityNames.apartment}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              {/* Tabs */}
              <div className="flex gap-1 mt-4">
                {[
                  { id: 'details', label: 'פרטים', icon: FileText },
                  { id: 'files', label: 'קבצים', icon: Paperclip },
                  { id: 'comments', label: 'תגובות', icon: MessageCircle }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                    {tab.id === 'files' && taskFiles.length > 0 && (
                      <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-0.5">
                        {taskFiles.length}
                      </span>
                    )}
                    {tab.id === 'comments' && taskComments.length > 0 && (
                      <span className="bg-blue-500 text-white text-xs rounded-full px-2 py-0.5">
                        {taskComments.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {activeTab === 'details' && (
                <div className="space-y-6">
                  {/* Title and Stage Order */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-10">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        כותרת המשימה *
                      </label>
                      <input
                        type="text"
                        value={editedTask.title}
                        onChange={(e) => setEditedTask(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="הזן כותרת למשימה"
                      />
                    </div>
                    
                    {/* Stage Order - only for stages (parent tasks) */}
                    {!editedTask.parent_task_id && (
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          מספר שלב
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="99"
                          value={editedTask.stage_order || ''}
                          onChange={(e) => setEditedTask(prev => ({ 
                            ...prev, 
                            stage_order: e.target.value ? parseInt(e.target.value) : undefined 
                          }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                          placeholder="1"
                        />
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      תיאור המשימה
                    </label>
                    <textarea
                      value={editedTask.description || ''}
                      onChange={(e) => setEditedTask(prev => ({ ...prev, description: e.target.value }))}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="הזן תיאור מפורט למשימה"
                    />
                  </div>

                  {/* Grid for form fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Task Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        סוג משימה
                      </label>
                      <select
                        value={editedTask.task_type}
                        onChange={(e) => setEditedTask(prev => ({ ...prev, task_type: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="technical">טכנית</option>
                        <option value="marketing">שיווק</option>
                        <option value="sales">מכירות</option>
                        <option value="approval">אישורים</option>
                        <option value="administrative">אדמיניסטרטיבית</option>
                      </select>
                    </div>

                    {/* Priority */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Flag className="w-4 h-4 inline ml-2" />
                        עדיפות
                      </label>
                      <select
                        value={editedTask.priority}
                        onChange={(e) => setEditedTask(prev => ({ ...prev, priority: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="low">נמוכה</option>
                        <option value="medium">בינונית</option>
                        <option value="high">גבוהה</option>
                        <option value="urgent">דחופה</option>
                      </select>
                    </div>

                    {/* Status */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        סטטוס
                      </label>
                      <select
                        value={editedTask.status}
                        onChange={(e) => setEditedTask(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="draft">טיוטה</option>
                        <option value="open">פתוחה</option>
                        <option value="in_progress">בביצוע</option>
                        <option value="pending_approval">ממתינה לאישור</option>
                        <option value="completed">הושלמה</option>
                        <option value="cancelled">בוטלה</option>
                      </select>
                    </div>

                    {/* Assigned To */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <User className="w-4 h-4 inline ml-2" />
                        הוקצה אל
                      </label>
                      <select
                        value={editedTask.assigned_to || ''}
                        onChange={(e) => setEditedTask(prev => ({ ...prev, assigned_to: e.target.value || undefined }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">-- בחר משתמש --</option>
                        {users.map(user => (
                          <option key={user.id} value={user.id}>
                            {user.full_name} ({user.role})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Start Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Calendar className="w-4 h-4 inline ml-2" />
                        תאריך התחלה
                      </label>
                      <input
                        type="date"
                        value={editedTask.start_date || ''}
                        onChange={(e) => setEditedTask(prev => ({ ...prev, start_date: e.target.value || undefined }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    {/* Due Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Calendar className="w-4 h-4 inline ml-2" />
                        תאריך יעד
                      </label>
                      <input
                        type="date"
                        value={editedTask.due_date || ''}
                        onChange={(e) => setEditedTask(prev => ({ ...prev, due_date: e.target.value || undefined }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Progress */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      אחוז השלמה: {editedTask.progress_percentage}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={editedTask.progress_percentage}
                      onChange={(e) => setEditedTask(prev => ({ ...prev, progress_percentage: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'files' && (
                <div className="space-y-6">
                  {/* File Upload */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                    <div className="text-center">
                      <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">העלאת קבצים</h3>
                      <p className="text-gray-600 mb-4">
                        בחר קבצים להעלאה או גרור אותם לכאן
                      </p>
                      <input
                        type="file"
                        multiple
                        onChange={(e) => setSelectedFiles(e.target.files)}
                        className="hidden"
                        id="file-upload"
                      />
                      <label
                        htmlFor="file-upload"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
                      >
                        בחר קבצים
                      </label>
                      
                      {selectedFiles && selectedFiles.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm text-gray-600 mb-2">
                            נבחרו {selectedFiles.length} קבצים:
                          </p>
                          <div className="text-xs text-gray-500 space-y-1">
                            {Array.from(selectedFiles).map((file, index) => (
                              <div key={index} className="flex justify-between">
                                <span>{file.name}</span>
                                <span>{formatFileSize(file.size)}</span>
                              </div>
                            ))}
                          </div>
                          <button
                            onClick={handleFileUpload}
                            disabled={isUploading}
                            className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                          >
                            {isUploading ? 'מעלה...' : 'העלה קבצים'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Files List */}
                  {taskFiles.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        קבצים מצורפים ({taskFiles.length})
                      </h3>
                      <div className="space-y-3">
                        {taskFiles.map(file => (
                          <div key={file.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                            <div className="flex items-center gap-3">
                              {getFileIcon(file.file_type)}
                              <div>
                                <p className="font-medium text-gray-900">{file.original_filename}</p>
                                <p className="text-sm text-gray-500">
                                  {formatFileSize(file.file_size)} • {new Date(file.created_at).toLocaleDateString('he-IL')}
                                  {file.uploader && ` • הועלה על ידי ${file.uploader.full_name}`}
                                </p>
                                {file.description && (
                                  <p className="text-sm text-gray-600 mt-1">{file.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setPreviewFile(file)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                title="תצוגה מקדימה"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDownloadFile(file)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                                title="הורד קובץ"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'comments' && (
                <div className="space-y-6">
                  {/* Add Comment */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">הוסף תגובה</h3>
                    <div className="flex gap-3">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="כתב תגובה..."
                        rows={3}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        onClick={handleAddComment}
                        disabled={!newComment.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        שלח
                      </button>
                    </div>
                  </div>

                  {/* Comments List */}
                  {taskComments.length > 0 ? (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        תגובות ({taskComments.length})
                      </h3>
                      <div className="space-y-4">
                        {taskComments.map(comment => (
                          <div key={comment.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {comment.author?.full_name || 'משתמש לא מזוהה'}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {new Date(comment.created_at).toLocaleString('he-IL')}
                                </p>
                              </div>
                            </div>
                            <p className="text-gray-700 whitespace-pre-wrap">{comment.comment}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <MessageCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-600">אין תגובות עדיין</p>
                      <p className="text-sm text-gray-500">הוסף תגובה ראשונה כדי להתחיל דיון</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 p-6 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                ביטול
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isLoading ? 'שומר...' : 'שמור שינויים'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* File Preview Modal */}
      {previewFile && <FilePreviewModal file={previewFile} />}
    </>
  );
};