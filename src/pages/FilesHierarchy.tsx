import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  File, Upload, Download, Eye, History, Clock, ChevronLeft,
  FileText, Image, Video, Music, Archive, Plus
} from 'lucide-react';
import { useAuth } from '../components/auth/AuthContext';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { FileUploadModal } from '../components/files/FileUploadModal';
import { FileVersionModal } from '../components/files/FileVersionModal';
import { FileViewModal } from '../components/files/FileViewModal';
import toast from 'react-hot-toast';

interface FileRecord {
  id: string;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  task_id?: string;
  project_id?: string;
  building_id?: string;
  floor_id?: string;
  apartment_id?: string;
  created_at: string;
  file_url?: string;
  level?: number;
  isBaseFile?: boolean;
  versionCount?: number;
}

export const FilesHierarchy: React.FC = () => {
  const { user, hasAccess } = useAuth();
  
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null);
  const [selectedFileForVersions, setSelectedFileForVersions] = useState<FileRecord | null>(null);

  // Build file hierarchy similar to tasks
  const buildFileHierarchy = (files: FileRecord[]): FileRecord[] => {
    
    // Group files by original_filename
    const fileGroups = new Map<string, FileRecord[]>();
    
    files.forEach(file => {
      const baseName = file.original_filename || file.filename;
      if (!fileGroups.has(baseName)) {
        fileGroups.set(baseName, []);
      }
      fileGroups.get(baseName)!.push(file);
    });
    
    const result: FileRecord[] = [];
    
    fileGroups.forEach((versions, baseName) => {
      // Sort by creation date (oldest first)
      versions.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      
      if (versions.length === 1) {
        // Single file - no versions
        const file = { ...versions[0], level: 0, isBaseFile: true, versionCount: 1 };
        result.push(file);
      } else {
        // Multiple versions - create hierarchy
        const baseFile = { 
          ...versions[0], 
          level: 0, 
          isBaseFile: true, 
          versionCount: versions.length
        };
        
        result.push(baseFile);
        
        // Add versions after base file
        versions.slice(1).forEach(version => {
          result.push({
            ...version,
            level: 1,
            isBaseFile: false
          });
        });
      }
    });
    
    return result;
  };

  // Filter files while maintaining hierarchy
  const filterFilesWithHierarchy = (files: FileRecord[], searchTerm: string): FileRecord[] => {
    if (!searchTerm.trim()) return files;
    
    const filtered: FileRecord[] = [];
    let i = 0;
    
    while (i < files.length) {
      const file = files[i];
      const fileName = (file.original_filename || file.filename).toLowerCase();
      const search = searchTerm.toLowerCase();
      
      if (file.isBaseFile) {
        // Check if base file or any of its versions match
        const baseMatches = fileName.includes(search);
        let hasMatchingVersion = false;
        let versionCount = 0;
        
        // Look ahead for versions
        const versions: FileRecord[] = [];
        for (let j = i + 1; j < files.length && files[j].level === 1; j++) {
          versions.push(files[j]);
          versionCount++;
          if ((files[j].original_filename || files[j].filename).toLowerCase().includes(search)) {
            hasMatchingVersion = true;
          }
        }
        
        if (baseMatches || hasMatchingVersion) {
          // Add base file
          filtered.push(file);
          
          // Add matching versions
          versions.forEach(version => {
            const versionMatches = (version.original_filename || version.filename).toLowerCase().includes(search);
            if (baseMatches || versionMatches) {
              filtered.push(version);
            }
          });
        }
        
        // Skip the versions we already processed
        i += versionCount + 1;
      } else {
        // This shouldn't happen if hierarchy is built correctly
        i++;
      }
    }
    
    return filtered;
  };



  const fetchFiles = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('files')
        .select('*')
        .eq('is_active', true);

      // Apply user access control
      if (user?.user_role !== 'admin' && user?.user_role !== 'super_admin') {
        if (user?.user_role === 'developer' && user?.developer_id) {
          const { data: projectIds } = await supabase
            .from('projects')
            .select('id')
            .eq('developer_id', user.developer_id);
          
          if (projectIds && projectIds.length > 0) {
            query = query.in('project_id', projectIds.map(p => p.id));
          }
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const filesWithHierarchy = buildFileHierarchy(data as FileRecord[]);
        setFiles(filesWithHierarchy);
      } else {
        setFiles([]);
      }
    } catch (error) {
      toast.error('שגיאה בטעינת הקבצים');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [user]);

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="h-6 w-6 text-green-500" />;
    if (fileType.startsWith('video/')) return <Video className="h-6 w-6 text-purple-500" />;
    if (fileType.startsWith('audio/')) return <Music className="h-6 w-6 text-blue-500" />;
    if (fileType.includes('pdf')) return <FileText className="h-6 w-6 text-red-500" />;
    if (fileType.includes('zip') || fileType.includes('rar')) return <Archive className="h-6 w-6 text-orange-500" />;
    return <File className="h-6 w-6 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleViewClick = (file: FileRecord) => {
    setSelectedFile(file);
    setShowViewModal(true);
  };

  const handleVersionsClick = (file: FileRecord) => {
    setSelectedFileForVersions(file);
    setShowVersionModal(true);
  };

  const handleDownload = async (file: FileRecord) => {
    try {
      if (file.file_url) {
        const { data, error } = await supabase.storage
          .from('files')
          .download(file.file_url.replace('/storage/v1/object/public/files/', ''));

        if (error) throw error;

        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.original_filename || file.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      toast.error('שגיאה בהורדת הקובץ');
    }
  };

  const filteredFiles = filterFilesWithHierarchy(files, searchTerm);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumbs */}
      <Breadcrumbs />
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">קבצים עם גרסאות</h1>
        <Button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2"
        >
          <Upload className="h-5 w-5" />
          העלה קובץ
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="חפש קבצים..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Files List */}
      {filteredFiles.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <File className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">לא נמצאו קבצים</h3>
            <p className="text-gray-600">נסה לשנות את החיפוש או העלה קובץ חדש</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredFiles.map((file) => {
            const indentLevel = file.level || 0;
            const indentStyle = indentLevel > 0 ? { marginRight: `${indentLevel * 2}rem` } : {};
            const isVersion = !file.isBaseFile;
            const hasVersions = file.versionCount && file.versionCount > 1;
            
            return (
              <Card 
                key={file.id} 
                className={`hover:shadow-lg transition-shadow ${
                  isVersion ? 'border-r-4 border-r-blue-200 bg-blue-50/30' : ''
                }`}
                style={indentStyle}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Header */}
                      <div className="flex items-center gap-3 mb-3">
                        {isVersion && (
                          <div className="flex items-center gap-2 text-blue-600">
                            <div className="w-4 h-0.5 bg-blue-300"></div>
                            <ChevronLeft className="h-4 w-4" />
                          </div>
                        )}
                        {getFileIcon(file.file_type)}
                        <h3 className={`font-semibold text-gray-900 ${isVersion ? 'text-base' : 'text-lg'}`}>
                          {file.original_filename || file.filename}
                        </h3>
                        
                        {hasVersions && file.isBaseFile && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            קובץ-בסיס ({file.versionCount} גרסאות)
                          </span>
                        )}
                        
                        {isVersion && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            גרסה
                          </span>
                        )}
                      </div>

                      {/* Meta Information */}
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <File className="h-4 w-4" />
                          <span>{formatFileSize(file.file_size)}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          <span>
                            {new Date(file.created_at).toLocaleDateString('he-IL', {
                              year: 'numeric',
                              month: '2-digit', 
                              day: '2-digit'
                            })} • {' '}
                            {new Date(file.created_at).toLocaleTimeString('he-IL', { 
                              hour: '2-digit', 
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => handleViewClick(file)}
                        className="p-2"
                        title="צפה בקובץ"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => handleVersionsClick(file)}
                        className="p-2"
                        title="ניהול גרסאות"
                      >
                        <History className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => handleDownload(file)}
                        className="p-2"
                        title="הורד קובץ"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <FileUploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onUploadSuccess={fetchFiles}
        />
      )}

      {/* Version Management Modal */}
      {showVersionModal && selectedFileForVersions && (
        <FileVersionModal
          isOpen={showVersionModal}
          onClose={() => {
            setShowVersionModal(false);
            setSelectedFileForVersions(null);
          }}
          fileId={selectedFileForVersions.id}
          fileName={selectedFileForVersions.original_filename || selectedFileForVersions.filename}
          onVersionUploaded={fetchFiles}
        />
      )}

      {/* File View Modal */}
      {showViewModal && selectedFile && (
        <FileViewModal
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setSelectedFile(null);
          }}
          file={{
            id: selectedFile.id,
            file_name: selectedFile.filename,
            file_path: selectedFile.file_url || '',
            file_type: selectedFile.file_type,
            file_size: selectedFile.file_size,
            description: ''
          }}
        />
      )}
    </div>
  );
}; 