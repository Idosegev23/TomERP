import React, { useState, useEffect } from 'react';
import { X, Upload, Download, Eye, History, Clock, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface FileVersion {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  version: number;
  description?: string;
  uploaded_by: string;
  created_at: string;
  uploader_name?: string;
}

interface FileVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string;
  fileName: string;
  onVersionUploaded?: () => void;
}

export const FileVersionModal: React.FC<FileVersionModalProps> = ({
  isOpen,
  onClose,
  fileId,
  fileName,
  onVersionUploaded
}) => {
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newVersionFile, setNewVersionFile] = useState<File | null>(null);
  const [versionDescription, setVersionDescription] = useState('');

  useEffect(() => {
    if (isOpen && fileId) {
      loadVersions();
    }
  }, [isOpen, fileId]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      // Get the base file info first
      const { data: baseFile, error: baseError } = await supabase
        .from('files')
        .select('*')
        .eq('id', fileId)
        .single();

      if (baseError) throw baseError;

      const displayName = baseFile.original_filename || baseFile.filename;

      // Get all files with the same name (same entity context)
      let query = supabase
        .from('files')
        .select('*')
        .eq('original_filename', displayName)
        .eq('is_active', true);

      // Filter by same entity context as the base file
      if (baseFile.task_id) {
        query = query.eq('task_id', baseFile.task_id);
      } else if (baseFile.project_id) {
        query = query.eq('project_id', baseFile.project_id);
      } else if (baseFile.building_id) {
        query = query.eq('building_id', baseFile.building_id);
      } else if (baseFile.floor_id) {
        query = query.eq('floor_id', baseFile.floor_id);
      } else if (baseFile.apartment_id) {
        query = query.eq('apartment_id', baseFile.apartment_id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;


      // Convert to version format with numbering based on creation order
      const versions = (data || [])
        .map((version, index) => {
          return {
            ...version,
            file_name: displayName,
            file_path: version.file_url,
            version: data.length - index, // Latest = highest number
            uploader_name: 'משתמש' // Since we don't have users profiles yet
          };
        });

      setVersions(versions);
    } catch (error) {
      toast.error('שגיאה בטעינת גרסאות הקובץ');
    } finally {
      setLoading(false);
    }
  };

  const handleNewVersionUpload = async () => {
    if (!newVersionFile) {
      toast.error('אנא בחר קובץ חדש');
      return;
    }

    setUploading(true);
    try {
      // Get the base file info
      const { data: baseFile, error: baseError } = await supabase
        .from('files')
        .select('*')
        .eq('id', fileId)
        .single();

      if (baseError) throw baseError;

      const displayName = baseFile.original_filename || baseFile.filename;

      // Keep the same name for the new version (no version suffix)
      const newVersionName = displayName;

      // Upload new version to storage
      const fileExt = newVersionFile.name.split('.').pop();
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2);
      
      // Determine entity type for folder structure
      let folderPath = 'misc';
      if (baseFile.task_id) folderPath = 'tasks';
      else if (baseFile.project_id) folderPath = 'projects';
      else if (baseFile.building_id) folderPath = 'buildings';
      else if (baseFile.floor_id) folderPath = 'floors';
      else if (baseFile.apartment_id) folderPath = 'apartments';

      const storageFileName = `${folderPath}/${timestamp}_${randomString}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('files')
        .upload(storageFileName, newVersionFile);

      if (uploadError) {
        throw new Error('שגיאה בהעלאת הקובץ');
      }

      // Save new version to database
      const insertData: any = {
        filename: storageFileName,
        original_filename: newVersionName, // Use versioned name
        file_size: newVersionFile.size,
        file_type: newVersionFile.type.startsWith('image/') ? 'image' : 
                  newVersionFile.type.startsWith('video/') ? 'video' :
                  newVersionFile.type.includes('pdf') || newVersionFile.type.includes('document') ? 'document' :
                  newVersionFile.type.includes('sheet') || newVersionFile.type.includes('excel') ? 'spreadsheet' :
                  newVersionFile.type.includes('presentation') ? 'presentation' : 'other',
        mime_type: newVersionFile.type,
        file_url: storageFileName,
        description: versionDescription || null,
        is_active: true
      };

      // Copy entity associations from base file
      if (baseFile.task_id) insertData.task_id = baseFile.task_id;
      if (baseFile.project_id) insertData.project_id = baseFile.project_id;
      if (baseFile.building_id) insertData.building_id = baseFile.building_id;
      if (baseFile.floor_id) insertData.floor_id = baseFile.floor_id;
      if (baseFile.apartment_id) insertData.apartment_id = baseFile.apartment_id;

      const { error: dbError } = await supabase
        .from('files')
        .insert(insertData);

      if (dbError) {
        throw new Error('שגיאה בשמירת גרסת הקובץ');
      }

      toast.success(`גרסה חדשה הועלתה בהצלחה`);
      setNewVersionFile(null);
      setVersionDescription('');
      loadVersions();
      onVersionUploaded?.();

    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'שגיאה בהעלאת הגרסה');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (version: FileVersion) => {
    try {
      const { data, error } = await supabase.storage
        .from('files')
        .download(version.file_path);

      if (error) {
        throw new Error('שגיאה בהורדת הקובץ');
      }

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = version.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (error) {
      toast.error('שגיאה בהורדת הקובץ');
    }
  };

  const handlePreview = async (version: FileVersion) => {
    try {
      const { data } = supabase.storage
        .from('files')
        .getPublicUrl(version.file_path);

      if (data.publicUrl) {
        window.open(data.publicUrl, '_blank');
      } else {
        throw new Error('לא ניתן לקבל URL לתצוגה מקדימה');
      }
    } catch (error) {
      toast.error('שגיאה בתצוגה מקדימה');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" dir="rtl">
      <div className="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <History size={24} />
                גרסאות קובץ
              </h2>
              <p className="text-gray-600 mt-1">{fileName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Upload New Version */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">העלה גרסה חדשה</h3>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-400 transition-colors">
                <div className="text-center">
                  <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <label className="cursor-pointer">
                    <span className="text-sm font-medium text-gray-900 block mb-1">
                      בחר קובץ חדש
                    </span>
                    <input
                      type="file"
                      accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar"
                      className="hidden"
                      onChange={(e) => setNewVersionFile(e.target.files?.[0] || null)}
                    />
                    <span className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors inline-block">
                      בחר קובץ
                    </span>
                  </label>
                </div>
              </div>

              {newVersionFile && (
                <div className="bg-gray-50 p-3 rounded border">
                  <p className="text-sm font-medium text-gray-900">{newVersionFile.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(newVersionFile.size)}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  תיאור השינויים (אופציונלי)
                </label>
                <textarea
                  value={versionDescription}
                  onChange={(e) => setVersionDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="מה השתנה בגרסה זו?"
                  rows={3}
                />
              </div>

              <button
                onClick={handleNewVersionUpload}
                disabled={uploading || !newVersionFile}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    מעלה...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    העלה גרסה חדשה
                  </>
                )}
              </button>
            </div>

            {/* Right Column - Versions List */}
            <div className="lg:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">גרסאות קיימות</h3>
              
              {loading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="text-gray-500">טוען גרסאות...</div>
                </div>
              ) : versions.length === 0 ? (
                <div className="text-center py-12">
                  <History className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">אין גרסאות עדיין</h3>
                  <p className="text-gray-500">העלה גרסה חדשה כדי לנהל שינויים</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {versions.map((version) => (
                    <div key={version.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded-full">
                              גרסה {version.version}
                            </span>
                            {version.version === Math.max(...versions.map(v => v.version)) && (
                              <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full">
                                עדכנית
                              </span>
                            )}
                          </div>
                          
                          <h4 className="font-medium text-gray-900 mt-2">{version.file_name}</h4>
                          
                          {version.description && (
                            <p className="text-sm text-gray-600 mt-1">{version.description}</p>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                            <span className="flex items-center gap-1">
                              <User size={12} />
                              {version.uploader_name}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {formatDate(version.created_at)}
                            </span>
                            <span>{formatFileSize(version.file_size)}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {version.file_type.startsWith('image/') && (
                            <button
                              onClick={() => handlePreview(version)}
                              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                              title="תצוגה מקדימה"
                            >
                              <Eye size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDownload(version)}
                            className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                            title="הורד קובץ"
                          >
                            <Download size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 