import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  X, 
  Upload,
  FileText,
  Image,
  FileVideo,
  FileSpreadsheet,
  Download,
  Eye,
  Trash2,
  Plus,
  Folder,
  Search,
  Filter,
  Calendar,
  User,
  Building2,
  FileImage,
  FilePlus,
  ZoomIn,
  ExternalLink,
  Tag,
  Clock,
  FolderOpen
} from 'lucide-react';
import toast from 'react-hot-toast';
import { MediaGallery } from '../common';

interface Floor {
  id: string;
  name: string;
  floor_number: number;
}

interface FloorFile {
  id: string;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  mime_type?: string;
  file_url: string;
  thumbnail_url?: string;
  category?: string;
  tags?: string[];
  description?: string;
  version: number;
  is_latest_version: boolean;
  uploaded_by?: string;
  created_at: string;
}

interface FloorDocumentsManagerProps {
  isOpen: boolean;
  onClose: () => void;
  floor: Floor;
}

export const FloorDocumentsManager: React.FC<FloorDocumentsManagerProps> = ({
  isOpen,
  onClose,
  floor
}) => {
  const [files, setFiles] = useState<FloorFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [floorTasks, setFloorTasks] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<FloorFile | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryStartIndex, setGalleryStartIndex] = useState(0);
  const [uploadData, setUploadData] = useState({
    category: 'plans',
    description: '',
    tags: [] as string[],
    relatedTaskId: '',
    documentPurpose: 'general'
  });

  // קטגוריות אינטואיטיביות לקומה
  const categories = [
    { id: 'all', label: '📁 הכל', icon: FolderOpen, count: files.length },
    { id: 'plans', label: '🏗️ תוכניות', icon: FileImage, count: files.filter(f => f.category === 'plans').length },
    { id: 'permits', label: '📋 היתרים', icon: FileText, count: files.filter(f => f.category === 'permits').length },
    { id: 'reports', label: '📊 דוחות', icon: FileSpreadsheet, count: files.filter(f => f.category === 'reports').length },
    { id: 'photos', label: '📸 תמונות', icon: Image, count: files.filter(f => f.category === 'photos').length },
    { id: 'videos', label: '🎬 סרטונים', icon: FileVideo, count: files.filter(f => f.category === 'videos').length },
    { id: 'other', label: '📄 אחר', icon: FileText, count: files.filter(f => f.category === 'other' || !f.category).length }
  ];

  useEffect(() => {
    if (isOpen) {
      fetchFloorFiles();
      fetchFloorTasks();
    }
  }, [isOpen, floor.id]);

  const fetchFloorTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('floor_tasks')
        .select('id, title, status')
        .eq('floor_id', floor.id)
        .order('title');

      if (error) throw error;
      setFloorTasks(data || []);
    } catch (error) {
      console.error('Error fetching floor tasks:', error);
    }
  };

  const fetchFloorFiles = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('floor_id', floor.id)
        .eq('is_active', true)
        .eq('is_latest_version', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error('Error fetching floor files:', error);
      toast.error('שגיאה בטעינת המסמכים');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(selectedFiles)) {
        await uploadSingleFile(file);
      }
      
      toast.success(`${selectedFiles.length} קבצים הועלו בהצלחה!`);
      setShowUploadForm(false);
      fetchFloorFiles();
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('שגיאה בהעלאת הקבצים');
    } finally {
      setIsUploading(false);
    }
  };

  const uploadSingleFile = async (file: File) => {
    // Upload to Supabase Storage
    const fileName = `floor-${floor.id}/${Date.now()}-${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('files')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('files')
      .getPublicUrl(fileName);

    // Determine file type and category
    const mimeType = file.type;
    let detectedCategory = uploadData.category;
    
    if (mimeType.startsWith('image/')) {
      detectedCategory = uploadData.category === 'plans' ? 'plans' : 'photos';
    } else if (mimeType.startsWith('video/')) {
      detectedCategory = 'videos';
    } else if (mimeType.includes('pdf') || mimeType.includes('document')) {
      detectedCategory = uploadData.category === 'permits' ? 'permits' : 'reports';
    }

    // Save file metadata to database
    const { data: fileRecord, error: dbError } = await supabase
      .from('files')
      .insert([{
        filename: fileName,
        original_filename: file.name,
        file_type: mimeType.split('/')[0],
        file_size: file.size,
        mime_type: mimeType,
        file_url: publicUrl,
        floor_id: floor.id,
        category: detectedCategory,
        description: uploadData.description,
        tags: uploadData.tags,
        related_floor_task_id: uploadData.relatedTaskId || null,
        document_purpose: uploadData.documentPurpose
      }])
      .select('id');

    if (dbError) throw dbError;

    // Create task-document relationship if related to a task
    if (uploadData.relatedTaskId && fileRecord && fileRecord[0]) {
      await supabase
        .from('task_documents')
        .insert([{
          task_id: uploadData.relatedTaskId,
          task_type: 'floor_task',
          file_id: fileRecord[0].id,
          relationship_type: uploadData.documentPurpose,
          description: uploadData.description
        }]);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את הקובץ?')) return;

    try {
      const { error } = await supabase
        .from('files')
        .update({ is_active: false })
        .eq('id', fileId);

      if (error) throw error;

      toast.success('הקובץ נמחק בהצלחה');
      fetchFloorFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('שגיאה במחיקת הקובץ');
    }
  };

  const handleOpenGallery = (fileIndex: number) => {
    setGalleryStartIndex(fileIndex);
    setShowGallery(true);
  };

  const handleDownloadFile = async (file: FloorFile) => {
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
      
      toast.success('הקובץ הורד בהצלחה');
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('שגיאה בהורדת הקובץ');
    }
  };

  const getFileIcon = (file: FloorFile) => {
    if (file.mime_type?.startsWith('image/')) {
      return <Image className="w-8 h-8 text-green-600" />;
    } else if (file.mime_type?.startsWith('video/')) {
      return <FileVideo className="w-8 h-8 text-purple-600" />;
    } else if (file.mime_type?.includes('pdf')) {
      return <FileText className="w-8 h-8 text-red-600" />;
    } else if (file.mime_type?.includes('spreadsheet') || file.mime_type?.includes('excel')) {
      return <FileSpreadsheet className="w-8 h-8 text-green-600" />;
    } else {
      return <FileText className="w-8 h-8 text-blue-600" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredFiles = files.filter(file => {
    const matchesCategory = activeCategory === 'all' || file.category === activeCategory || 
      (activeCategory === 'other' && (!file.category || file.category === 'other'));
    
    const matchesSearch = searchTerm === '' || 
      file.original_filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="border-b border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="w-6 h-6 text-blue-600" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    📁 מסמכי קומה {floor.floor_number}
                  </h2>
                  <p className="text-gray-600 mt-1">
                    {floor.name} • {files.length} מסמכים
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
                onClick={() => setShowUploadForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
              >
                <Upload className="w-4 h-4" />
                העלה מסמכים
              </button>
              
              <div className="flex-1 relative">
                <Search className="h-5 w-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="חפש מסמכים..."
                  className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex gap-2 overflow-x-auto">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    activeCategory === category.id
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <category.icon className="w-4 h-4" />
                  {category.label}
                  {category.count > 0 && (
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      activeCategory === category.id ? 'bg-blue-200' : 'bg-gray-200'
                    }`}>
                      {category.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Files Grid */}
          <div className="p-6 max-h-[50vh] overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="text-gray-500">טוען מסמכים...</div>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="text-center py-12">
                <Folder className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm ? 'לא נמצאו מסמכים' : 'אין מסמכים עדיין'}
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm ? 'נסה לשנות את החיפוש' : 'התחל בהעלאת המסמך הראשון'}
                </p>
                {!searchTerm && (
                  <button
                    onClick={() => setShowUploadForm(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto"
                  >
                    <Upload className="w-4 h-4" />
                    העלה מסמך ראשון
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFiles.map((file) => (
                  <div key={file.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        {getFileIcon(file)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">
                          {file.original_filename}
                        </h4>
                        
                        {file.description && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {file.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>{formatFileSize(file.file_size)}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(file.created_at).toLocaleDateString('he-IL')}
                          </span>
                        </div>
                        
                        {file.tags && file.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {file.tags.slice(0, 2).map((tag, index) => (
                              <span key={index} className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                                {tag}
                              </span>
                            ))}
                            {file.tags.length > 2 && (
                              <span className="text-xs text-gray-500">+{file.tags.length - 2}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-1 mt-4 pt-4 border-t border-gray-100">
                      <button
                        onClick={() => handleOpenGallery(index)}
                        className="flex-1 bg-purple-50 text-purple-700 px-3 py-2 rounded-lg hover:bg-purple-100 flex items-center justify-center gap-2 text-sm transition-colors"
                        title="פתח בגלריה"
                      >
                        <FolderOpen className="w-4 h-4" />
                        גלריה
                      </button>
                      <button
                        onClick={() => setPreviewFile(file)}
                        className="flex-1 bg-blue-50 text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-100 flex items-center justify-center gap-2 text-sm transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        צפה
                      </button>
                      <button
                        onClick={() => handleDownloadFile(file)}
                        className="flex-1 bg-green-50 text-green-700 px-3 py-2 rounded-lg hover:bg-green-100 flex items-center justify-center gap-2 text-sm transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        הורד
                      </button>
                      <button
                        onClick={() => handleDeleteFile(file.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Form Modal */}
      {showUploadForm && (
        <div className="fixed inset-0 z-60 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowUploadForm(false)} />
            
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">📤 העלאת מסמכים</h3>
                  <button
                    onClick={() => setShowUploadForm(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      קטגוריה
                    </label>
                    <select
                      value={uploadData.category}
                      onChange={(e) => setUploadData({ ...uploadData, category: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="plans">🏗️ תוכניות</option>
                      <option value="permits">📋 היתרים</option>
                      <option value="reports">📊 דוחות</option>
                      <option value="photos">📸 תמונות</option>
                      <option value="videos">🎬 סרטונים</option>
                      <option value="other">📄 אחר</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      תיאור (אופציונלי)
                    </label>
                    <textarea
                      value={uploadData.description}
                      onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                      placeholder="תאר את המסמך..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        קישור למשימה (אופציונלי)
                      </label>
                      <select
                        value={uploadData.relatedTaskId}
                        onChange={(e) => setUploadData({ ...uploadData, relatedTaskId: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">בחר משימה</option>
                        {floorTasks.map((task) => (
                          <option key={task.id} value={task.id}>
                            {task.title}
                            {task.status === 'completed' && ' ✅'}
                            {task.status === 'in_progress' && ' 🔄'}
                            {task.status === 'pending' && ' ⏳'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        סוג קישור
                      </label>
                      <select
                        value={uploadData.documentPurpose}
                        onChange={(e) => setUploadData({ ...uploadData, documentPurpose: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="general">📄 כללי</option>
                        <option value="before">📷 תמונת לפני</option>
                        <option value="after">✅ תמונת אחרי</option>
                        <option value="progress">📊 תמונת התקדמות</option>
                        <option value="inspection">🔍 בדיקה</option>
                        <option value="permit">📋 היתר</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      בחר קבצים
                    </label>
                    <input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      disabled={isUploading}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                  
                  {isUploading && (
                    <div className="text-center py-4">
                      <div className="text-blue-600">מעלה קבצים...</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-60 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-75" onClick={() => setPreviewFile(null)} />
            
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-semibold">{previewFile.original_filename}</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.open(previewFile.file_url, '_blank')}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    title="פתח בחלון חדש"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPreviewFile(null)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="p-4 max-h-[80vh] overflow-auto">
                {previewFile.mime_type?.startsWith('image/') ? (
                  <img 
                    src={previewFile.file_url} 
                    alt={previewFile.original_filename}
                    className="max-w-full h-auto mx-auto"
                  />
                ) : previewFile.mime_type?.includes('pdf') ? (
                  <iframe 
                    src={previewFile.file_url}
                    className="w-full h-[70vh] border-0"
                    title={previewFile.original_filename}
                  />
                ) : (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">לא ניתן להציג תצוגה מקדימה עבור סוג קובץ זה</p>
                    <button
                      onClick={() => window.open(previewFile.file_url, '_blank')}
                      className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto"
                    >
                      <ExternalLink className="w-4 h-4" />
                      פתח קובץ
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Media Gallery */}
      {showGallery && (
        <MediaGallery
          files={filteredFiles.map(file => ({
            id: file.id,
            original_filename: file.original_filename,
            file_url: file.file_url,
            thumbnail_url: file.thumbnail_url,
            mime_type: file.mime_type,
            file_size: file.file_size,
            description: file.description,
            created_at: file.created_at
          }))}
          isOpen={showGallery}
          onClose={() => setShowGallery(false)}
          initialIndex={galleryStartIndex}
          title={`מסמכי קומה ${floor.floor_number}`}
        />
      )}
    </div>
  );
};