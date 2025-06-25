import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Tag, Folder, Building, Home, FileText, Image, FileVideo, FileSpreadsheet, Presentation, Archive, CheckSquare, MapPin, History, Plus, Link } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface Project {
  id: string;
  name: string;
}

interface Building {
  id: string;
  name: string;
  building_number: number;
}

interface Floor {
  id: string;
  floor_number: number;
  name: string;
}

interface Unit {
  id: string;
  apartment_number: string;
  apartment_type: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  task_type: string;
}

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: () => void;
  initialEntityType?: 'project' | 'building' | 'floor' | 'unit';
  initialEntityId?: string;
}

const QUICK_TAGS = [
  'תוכניות',
  'אישורים',
  'שיווק',
  'חוזים',
  'הדמיות',
  'תמונות',
  'מפרטים',
  'מסמכים משפטיים',
  'רישיונות',
  'קבלנים',
  'תכניות פיתוח',
  'מעליות',
  'חניה',
  'מחסנים',
  'גינון',
  'ביטוח',
  'תחזוקה'
];

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
  initialEntityType = 'project',
  initialEntityId = ''
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileNames, setFileNames] = useState<{ [index: number]: string }>({});
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  
  // Version management state
  const [isNewVersion, setIsNewVersion] = useState(false);
  const [selectedParentFile, setSelectedParentFile] = useState<string>('');
  const [existingFiles, setExistingFiles] = useState<any[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  
  // Entity selection state
  const [entityType, setEntityType] = useState<'project' | 'building' | 'floor' | 'unit'>(initialEntityType);
  const [selectedProjectId, setSelectedProjectId] = useState(initialEntityId || '');
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [selectedFloorId, setSelectedFloorId] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  
  // Loading states
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingBuildings, setLoadingBuildings] = useState(false);
  const [loadingFloors, setLoadingFloors] = useState(false);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  
  // Data arrays
  const [projects, setProjects] = useState<Project[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadProjects();
      resetForm();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedProjectId) {
      loadBuildings(selectedProjectId);
      setSelectedBuildingId('');
      setSelectedFloorId('');
      setSelectedUnitId('');
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (selectedBuildingId) {
      loadFloors(selectedBuildingId);
      setSelectedFloorId('');
      setSelectedUnitId('');
    }
  }, [selectedBuildingId]);

  useEffect(() => {
    if (selectedFloorId) {
      loadUnits(selectedFloorId);
      setSelectedUnitId('');
    }
  }, [selectedFloorId]);

  // Load tasks when entity changes
  useEffect(() => {
    const entityId = getEntityId();
    if (entityId) {
      loadTasks();
      loadExistingFiles();
    } else {
      setTasks([]);
      setSelectedTaskId('');
      setExistingFiles([]);
    }
  }, [entityType, selectedProjectId, selectedBuildingId, selectedFloorId, selectedUnitId]);

  // Auto-generate file names when files are selected
  useEffect(() => {
    const newFileNames: {[index: number]: string} = {};
    selectedFiles.forEach((file, index) => {
      if (!fileNames[index]) {
        // Remove extension and suggest a clean name
        const baseName = file.name.replace(/\.[^/.]+$/, "");
        newFileNames[index] = baseName;
      } else {
        newFileNames[index] = fileNames[index];
      }
    });
    setFileNames(newFileNames);
  }, [selectedFiles]);

  const loadProjects = async () => {
    setLoadingProjects(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      toast.error('שגיאה בטעינת הפרויקטים');
    } finally {
      setLoadingProjects(false);
    }
  };

  const loadBuildings = async (projectId: string) => {
    setLoadingBuildings(true);
    try {
      const { data, error } = await supabase
        .from('buildings')
        .select('id, name, building_number')
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('building_number');

      if (error) throw error;
      setBuildings(data || []);
    } catch (error) {
      toast.error('שגיאה בטעינת הבניינים');
    } finally {
      setLoadingBuildings(false);
    }
  };

  const loadFloors = async (buildingId: string) => {
    setLoadingFloors(true);
    try {
      const { data, error } = await supabase
        .from('floors')
        .select('id, floor_number, name')
        .eq('building_id', buildingId)
        .eq('is_active', true)
        .order('floor_number');

      if (error) throw error;
      setFloors(data || []);
    } catch (error) {
      toast.error('שגיאה בטעינת הקומות');
    } finally {
      setLoadingFloors(false);
    }
  };

  const loadUnits = async (floorId: string) => {
    setLoadingUnits(true);
    try {
      const { data, error } = await supabase
        .from('apartments')
        .select('id, apartment_number, apartment_type')
        .eq('floor_id', floorId)
        .eq('is_active', true)
        .order('apartment_number');

      if (error) throw error;
      setUnits(data || []);
    } catch (error) {
      toast.error('שגיאה בטעינת הדירות');
    } finally {
      setLoadingUnits(false);
    }
  };

  const loadTasks = async () => {
    const entityId = getEntityId();
    if (!entityId) return;

    setLoadingTasks(true);
    try {
      let query = supabase.from('tasks').select('id, title, status, priority, task_type');

      // Filter by entity
      switch (entityType) {
        case 'project':
          query = query.eq('project_id', entityId);
          break;
        case 'building':
          query = query.eq('building_id', entityId);
          break;
        case 'floor':
          query = query.eq('floor_id', entityId);
          break;
        case 'unit':
          query = query.eq('apartment_id', entityId);
          break;
      }

      const { data, error } = await query.order('title');
      if (error) throw error;

      setTasks(data || []);
    } catch (error) {
      toast.error('שגיאה בטעינת המשימות');
    } finally {
      setLoadingTasks(false);
    }
  };

  const loadExistingFiles = async () => {
    const entityId = getEntityId();
    if (!entityId) return;

    setLoadingFiles(true);
    try {
      let query = supabase
        .from('files')
        .select('id, filename, original_filename, file_type, created_at')
        .eq('is_active', true);

      // Filter by entity
      switch (entityType) {
        case 'project':
          query = query.eq('project_id', entityId);
          break;
        case 'building':
          query = query.eq('building_id', entityId);
          break;
        case 'floor':
          query = query.eq('floor_id', entityId);
          break;
        case 'unit':
          query = query.eq('apartment_id', entityId);
          break;
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;


      // Group files by exact name (for versions)
      const fileGroups: {[key: string]: any[]} = {};
      (data || []).forEach(file => {
        const displayName = file.original_filename || file.filename;
        
        
        if (!fileGroups[displayName]) {
          fileGroups[displayName] = [];
        }
        fileGroups[displayName].push({
          ...file,
          baseName: displayName,
          displayName
        });
      });


      // Get the latest file for each group and add version info
      const latestFiles = Object.entries(fileGroups).map(([fileName, group]) => {
        const sorted = group.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const latestFile = sorted[0];
        
        
        return {
          ...latestFile,
          version_count: group.length,
          baseName: fileName
        };
      });


      setExistingFiles(latestFiles);
    } catch (error) {
      toast.error('שגיאה בטעינת קבצים קיימים');
    } finally {
      setLoadingFiles(false);
    }
  };

  const resetForm = () => {
    setSelectedFiles([]);
    setFileNames({});
    setDragActive(false);
    setDescription('');
    setTags([]);
    setCustomTag('');
    setSelectedTaskId('');
    setSelectedProjectId(initialEntityId || '');
    setSelectedBuildingId('');
    setSelectedFloorId('');
    setSelectedUnitId('');
    setProjects([]);
    setBuildings([]);
    setFloors([]);
    setUnits([]);
    setTasks([]);
    setExistingFiles([]);
    setIsNewVersion(false);
    setSelectedParentFile('');
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files);
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
    setFileNames(names => {
      const newNames = { ...names };
      delete newNames[index];
      // Re-index the remaining names
      const reindexed: {[index: number]: string} = {};
      Object.entries(newNames).forEach(([key, value]) => {
        const numKey = parseInt(key);
        if (numKey > index) {
          reindexed[numKey - 1] = value;
        } else {
          reindexed[numKey] = value;
        }
      });
      return reindexed;
    });
  };

  const updateFileName = (index: number, name: string) => {
    setFileNames(prev => ({
      ...prev,
      [index]: name
    }));
  };

  const addQuickTag = (tag: string) => {
    if (!tags.includes(tag)) {
      setTags([...tags, tag]);
    }
  };

  const addCustomTag = () => {
    if (customTag.trim() && !tags.includes(customTag.trim())) {
      setTags([...tags, customTag.trim()]);
      setCustomTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const getEntityId = () => {
    switch (entityType) {
      case 'project': return selectedProjectId;
      case 'building': return selectedBuildingId;
      case 'floor': return selectedFloorId;
      case 'unit': return selectedUnitId;
      default: return '';
    }
  };

  const getEntityDisplayText = () => {
    const parts = [];
    
    const projectName = projects.find(p => p.id === selectedProjectId)?.name;
    if (projectName) parts.push(`פרויקט ${projectName}`);
    
    if (entityType === 'building' && selectedBuildingId) {
      const building = buildings.find(b => b.id === selectedBuildingId);
      if (building) parts.push(`בניין ${building.name}`);
    }
    
    if ((entityType === 'floor' || entityType === 'unit') && selectedFloorId) {
      const floor = floors.find(f => f.id === selectedFloorId);
      if (floor) parts.push(`קומה ${floor.floor_number}`);
    }
    
    if (entityType === 'unit' && selectedUnitId) {
      const unit = units.find(u => u.id === selectedUnitId);
      if (unit) parts.push(`דירה ${unit.apartment_number}`);
    }
    
    return parts.join(' > ');
  };

  const getFileIcon = (file: File) => {
    const type = file.type;
    if (type.startsWith('image/')) return <Image size={16} className="text-green-500" />;
    if (type.startsWith('video/')) return <FileVideo size={16} className="text-purple-500" />;
    if (type.includes('pdf')) return <FileText size={16} className="text-red-500" />;
    if (type.includes('sheet') || type.includes('excel')) return <FileSpreadsheet size={16} className="text-green-600" />;
    if (type.includes('presentation') || type.includes('powerpoint')) return <Presentation size={16} className="text-orange-500" />;
    if (type.includes('zip') || type.includes('rar')) return <Archive size={16} className="text-gray-500" />;
    return <FileText size={16} className="text-blue-500" />;
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('אנא בחר קבצים להעלאה');
      return;
    }

    const entityId = getEntityId();
    if (!entityId) {
      toast.error('אנא בחר ישות להעלאה');
      return;
    }

    // Check if all files have names
    for (let i = 0; i < selectedFiles.length; i++) {
      if (!fileNames[i] || !fileNames[i].trim()) {
        toast.error(`אנא הזן שם לקובץ ${selectedFiles[i].name}`);
        return;
      }
    }

    // If it's a new version, validate parent file is selected
    if (isNewVersion && !selectedParentFile) {
      toast.error('אנא בחר קובץ קיים להוספת גרסה');
      return;
    }

    if (isNewVersion && selectedFiles.length > 1) {
      toast.error('ניתן להעלות קובץ אחד בלבד כגרסה חדשה');
      return;
    }

    try {
      setUploading(true);
      
      const uploadPromises = selectedFiles.map(async (file, index) => {
        let customName = fileNames[index].trim();
        
        // If it's a new version, keep the original name
        if (isNewVersion && selectedParentFile) {
          const parentFile = existingFiles.find(f => f.id === selectedParentFile);
          if (parentFile) {
            // Keep the original base name without version suffix
            customName = parentFile.baseName;
          }
        }
        
        // Generate unique filename for storage
        const fileExtension = file.name.split('.').pop();
        const uniqueId = Math.random().toString(36).substr(2, 9);
        const storageFileName = `${entityType}/${entityId}/${uniqueId}_${Date.now()}.${fileExtension}`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('files')
          .upload(storageFileName, file);

        if (uploadError) {
          throw new Error(`שגיאה בהעלאת ${customName}: ${uploadError.message}`);
        }


        // Save file record to database
        const insertData: any = {
          filename: storageFileName,
          original_filename: customName, // Use custom name with version if applicable
          file_size: file.size,
          file_type: file.type.startsWith('image/') ? 'image' : 
                    file.type.startsWith('video/') ? 'video' :
                    file.type.includes('pdf') || file.type.includes('document') ? 'document' :
                    file.type.includes('sheet') || file.type.includes('excel') ? 'spreadsheet' :
                    file.type.includes('presentation') ? 'presentation' : 'other',
          mime_type: file.type,
          file_url: storageFileName,
          description: description || null,
          tags: tags.length > 0 ? tags : null,
          task_id: selectedTaskId || null,
          is_active: true
        };

        // Set the appropriate entity field
        switch (entityType) {
          case 'project':
            insertData.project_id = entityId;
            break;
          case 'building':
            insertData.building_id = entityId;
            break;
          case 'floor':
            insertData.floor_id = entityId;
            break;
          case 'unit':
            insertData.apartment_id = entityId;
            break;
        }

        const { error: dbError } = await supabase
          .from('files')
          .insert(insertData);

        if (dbError) {
          throw new Error(`שגיאה בשמירת פרטי ${customName}`);
        }

        return { 
          success: true, 
          fileName: customName,
          isNewVersion: isNewVersion
        };
      });

      const results = await Promise.all(uploadPromises);
      const successCount = results.filter(r => r.success).length;
      
      if (isNewVersion && results.length > 0) {
        const result = results[0];
        toast.success(`גרסה חדשה של "${result.fileName}" הועלתה בהצלחה`);
      } else {
        toast.success(`${successCount} קבצים הועלו בהצלחה ל${getEntityDisplayText()}`);
      }
      
      onUploadSuccess?.();
      onClose();
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'שגיאה בהעלאת הקבצים');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" dir="rtl">
      <div className="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {isNewVersion ? 'העלאת גרסה חדשה' : 'העלאת קבצים חדשים'}
              </h2>
              {isNewVersion && selectedParentFile && (
                <p className="text-sm text-gray-600 mt-1">
                  {existingFiles.find(f => f.id === selectedParentFile)?.baseName && (
                    <>
                      גרסה חדשה עבור: {existingFiles.find(f => f.id === selectedParentFile)?.baseName}
                    </>
                  )}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - File Selection */}
            <div className="space-y-6">
              {/* File Upload Section */}
              <div 
                className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-blue-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <label className="cursor-pointer">
                    <span className="text-lg font-medium text-gray-900 block mb-2">
                      בחר קבצים להעלאה
                    </span>
                    <span className="text-sm text-gray-500 block mb-4">
                      או גרור קבצים לכאן
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                    <span className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-block">
                      בחר קבצים
                    </span>
                  </label>
                </div>
              </div>

              {/* Selected Files */}
              {selectedFiles.length > 0 && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">קבצים נבחרים ({selectedFiles.length})</h3>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getFileIcon(file)}
                            <div>
                              <span className="text-sm font-medium text-gray-900 block">{file.name}</span>
                              <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => removeFile(index)}
                            className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        
                        {/* Custom File Name Input */}
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            שם הקובץ במערכת <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={fileNames[index] || ''}
                            onChange={(e) => updateFileName(index, e.target.value)}
                            placeholder="הזן שם לקובץ..."
                            className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Version Management */}
              {selectedFiles.length > 0 && getEntityId() && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <History className="h-5 w-5 text-blue-600" />
                    <h3 className="font-medium text-gray-900">ניהול גרסאות</h3>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        id="new-files"
                        name="version-type"
                        checked={!isNewVersion}
                        onChange={() => setIsNewVersion(false)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="new-files" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        קבצים חדשים
                      </label>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        id="new-version"
                        name="version-type"
                        checked={isNewVersion}
                        onChange={() => setIsNewVersion(true)}
                        className="text-blue-600 focus:ring-blue-500"
                        disabled={selectedFiles.length > 1}
                      />
                      <label htmlFor="new-version" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Link className="h-4 w-4" />
                        גרסה חדשה לקובץ קיים
                        {selectedFiles.length > 1 && (
                          <span className="text-xs text-red-500">(זמין רק לקובץ אחד)</span>
                        )}
                      </label>
                    </div>

                    {/* Existing Files Selection */}
                    {isNewVersion && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          בחר קובץ קיים להוספת גרסה
                        </label>
                        <select
                          value={selectedParentFile}
                          onChange={(e) => setSelectedParentFile(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={loadingFiles}
                        >
                          <option value="">בחר קובץ...</option>
                          {existingFiles.map(file => (
                            <option key={file.id} value={file.id}>
                              {file.baseName} ({file.version_count} גרסאות)
                            </option>
                          ))}
                        </select>
                        {loadingFiles && (
                          <p className="text-xs text-gray-500 mt-1">טוען קבצים קיימים...</p>
                        )}
                        {existingFiles.length === 0 && !loadingFiles && (
                          <p className="text-xs text-gray-500 mt-1">אין קבצים קיימים בישות זו</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  תיאור (אופציונלי)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="תיאור הקבצים..."
                  rows={3}
                />
              </div>
            </div>

            {/* Right Column - Entity Selection & Tags */}
            <div className="space-y-6">
              {/* Entity Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  סוג ישות <span className="text-red-500">*</span>
                </label>
                <select
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value as 'project' | 'building' | 'floor' | 'unit')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="project">פרויקט</option>
                  <option value="building">בניין</option>
                  <option value="floor">קומה</option>
                  <option value="unit">דירה</option>
                </select>
              </div>

              {/* Project Selection */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Home size={16} />
                  פרויקט <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loadingProjects}
                >
                  <option value="">בחר פרויקט</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
                {loadingProjects && (
                  <p className="text-sm text-gray-500 mt-1">טוען פרויקטים...</p>
                )}
              </div>

              {/* Building Selection */}
              {(entityType === 'building' || entityType === 'floor' || entityType === 'unit') && selectedProjectId && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Building size={16} />
                    בניין <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedBuildingId}
                    onChange={(e) => setSelectedBuildingId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loadingBuildings || buildings.length === 0}
                  >
                    <option value="">בחר בניין</option>
                    {buildings.map(building => (
                      <option key={building.id} value={building.id}>
                        {building.name} (בניין {building.building_number})
                      </option>
                    ))}
                  </select>
                  {loadingBuildings && (
                    <p className="text-sm text-gray-500 mt-1">טוען בניינים...</p>
                  )}
                  {buildings.length === 0 && selectedProjectId && !loadingBuildings && (
                    <p className="text-sm text-gray-500 mt-1">אין בניינים בפרויקט זה</p>
                  )}
                </div>
              )}

              {/* Floor Selection */}
              {(entityType === 'floor' || entityType === 'unit') && selectedBuildingId && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Folder size={16} />
                    קומה {(entityType === 'floor' || entityType === 'unit') && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={selectedFloorId}
                    onChange={(e) => setSelectedFloorId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loadingFloors || floors.length === 0}
                  >
                    <option value="">בחר קומה</option>
                    {floors.map(floor => (
                      <option key={floor.id} value={floor.id}>
                        קומה {floor.floor_number} {floor.name && `- ${floor.name}`}
                      </option>
                    ))}
                  </select>
                  {loadingFloors && (
                    <p className="text-sm text-gray-500 mt-1">טוען קומות...</p>
                  )}
                  {floors.length === 0 && selectedBuildingId && !loadingFloors && (
                    <p className="text-sm text-gray-500 mt-1">אין קומות בבניין זה</p>
                  )}
                </div>
              )}

              {/* Unit Selection */}
              {entityType === 'unit' && selectedFloorId && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Home size={16} />
                    דירה <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedUnitId}
                    onChange={(e) => setSelectedUnitId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loadingUnits || units.length === 0}
                  >
                    <option value="">בחר דירה</option>
                    {units.map(unit => (
                      <option key={unit.id} value={unit.id}>
                        דירה {unit.apartment_number} ({unit.apartment_type})
                      </option>
                    ))}
                  </select>
                  {loadingUnits && (
                    <p className="text-sm text-gray-500 mt-1">טוען דירות...</p>
                  )}
                  {units.length === 0 && selectedFloorId && !loadingUnits && (
                    <p className="text-sm text-gray-500 mt-1">אין דירות בקומה זו</p>
                  )}
                </div>
              )}

              {/* Quick Tags */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Tag size={16} />
                  תגיות מהירות
                </label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {QUICK_TAGS.map(tag => (
                    <button
                      key={tag}
                      onClick={() => addQuickTag(tag)}
                      className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                        tags.includes(tag)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                {/* Custom Tag Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addCustomTag()}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="הוסף תגית מותאמת אישית"
                  />
                  <button
                    onClick={addCustomTag}
                    className="bg-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                  >
                    הוסף
                  </button>
                </div>
              </div>

              {/* Selected Tags */}
              {tags.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">תגיות נבחרות:</h4>
                  <div className="flex flex-wrap gap-2">
                    {tags.map(tag => (
                      <span
                        key={tag}
                        className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center gap-1"
                      >
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="hover:text-blue-900"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Task Selection */}
              {getEntityId() && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <CheckSquare size={16} />
                    קישור למשימה (אופציונלי)
                  </label>
                  <select
                    value={selectedTaskId}
                    onChange={(e) => setSelectedTaskId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loadingTasks}
                  >
                    <option value="">ללא קישור למשימה</option>
                    {tasks.map(task => (
                      <option key={task.id} value={task.id}>
                        {task.title} ({task.status} - {task.priority})
                      </option>
                    ))}
                  </select>
                  {loadingTasks && (
                    <p className="text-sm text-gray-500 mt-1">טוען משימות...</p>
                  )}
                  {tasks.length === 0 && getEntityId() && !loadingTasks && (
                    <p className="text-sm text-gray-500 mt-1">אין משימות פעילות עבור הישות הזאת</p>
                  )}
                </div>
              )}

              {/* Entity Summary */}
              {getEntityId() && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
                    <MapPin size={16} />
                    סיכום יעד העלאה
                  </h4>
                  <div className="space-y-1 text-sm text-blue-700">
                    {selectedProjectId && (
                      <div className="flex items-center gap-2">
                        <Home size={14} />
                        <span>פרויקט: {projects.find(p => p.id === selectedProjectId)?.name}</span>
                      </div>
                    )}
                    {selectedBuildingId && (
                      <div className="flex items-center gap-2">
                        <Building size={14} />
                        <span>בניין: {buildings.find(b => b.id === selectedBuildingId)?.name} (בניין {buildings.find(b => b.id === selectedBuildingId)?.building_number})</span>
                      </div>
                    )}
                    {selectedFloorId && (
                      <div className="flex items-center gap-2">
                        <Folder size={14} />
                        <span>קומה: {floors.find(f => f.id === selectedFloorId)?.floor_number}{floors.find(f => f.id === selectedFloorId)?.name && ` - ${floors.find(f => f.id === selectedFloorId)?.name}`}</span>
                      </div>
                    )}
                    {selectedUnitId && (
                      <div className="flex items-center gap-2">
                        <Home size={14} />
                        <span>דירה: {units.find(u => u.id === selectedUnitId)?.apartment_number} ({units.find(u => u.id === selectedUnitId)?.apartment_type})</span>
                      </div>
                    )}
                    {selectedTaskId && (
                      <div className="flex items-center gap-2">
                        <CheckSquare size={14} />
                        <span>משימה: {tasks.find(t => t.id === selectedTaskId)?.title}</span>
                      </div>
                    )}
                    <div className="mt-2 pt-2 border-t border-blue-200">
                      <span className="font-medium">
                        הקבצים יישמרו ב: {getEntityDisplayText()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center pt-6 border-t border-gray-200 mt-6">
            <div className="text-sm text-gray-600">
              {selectedFiles.length > 0 && (
                <div className="space-y-1">
                  <div>
                    העלאה ל: <strong>{getEntityDisplayText() || 'לא נבחר'}</strong>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                בטל
              </button>
              <button
                onClick={handleUpload}
                disabled={
                  uploading || 
                  selectedFiles.length === 0 || 
                  !getEntityId() ||
                  selectedFiles.some((_, index) => !fileNames[index]?.trim()) ||
                  (isNewVersion && !selectedParentFile)
                }
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {isNewVersion ? 'מעלה גרסה...' : 'מעלה קבצים...'}
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    {isNewVersion ? 'העלה גרסה חדשה' : `העלה קבצים ${selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}`}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 