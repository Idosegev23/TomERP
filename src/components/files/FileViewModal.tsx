import React, { useState, useEffect } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCw, Eye, FileText, AlertCircle, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface FileViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: {
    id: string;
    file_name: string;
    file_path: string;
    file_type: string;
    file_size: number;
    description?: string;
  };
}

export const FileViewModal: React.FC<FileViewModalProps> = ({
  isOpen,
  onClose,
  file
}) => {
  const [fileUrl, setFileUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [pdfLoadError, setPdfLoadError] = useState(false);

  useEffect(() => {
    if (isOpen && file) {
      loadFilePreview();
    }
    return () => {
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [isOpen, file]);

  const loadFilePreview = async () => {
    try {
      setLoading(true);
      setError('');
      setPdfLoadError(false);

      // Get file URL from Supabase Storage
      const { data, error } = await supabase.storage
        .from('files')
        .download(file.file_path);

      if (error) {
        throw error;
      }

      const url = URL.createObjectURL(data);
      setFileUrl(url);
    } catch (err: any) {
      setError('שגיאה בטעינת הקובץ');
      toast.error('שגיאה בטעינת הקובץ');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (fileUrl) {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = file.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const openInNewTab = () => {
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    }
  };

  const getFileCategory = (fileType: string): string => {
    
    const fileName = file.file_name.toLowerCase();
    
    if (fileType.startsWith('image/') || fileName.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg)$/)) return 'image';
    
    // Enhanced PDF detection
    if (
      fileType === 'application/pdf' ||
      fileType === 'application/x-pdf' ||
      fileType === 'application/acrobat' ||
      fileType === 'applications/vnd.pdf' ||
      fileType === 'text/pdf' ||
      fileType === 'text/x-pdf' ||
      fileName.endsWith('.pdf')
    ) return 'pdf';
    
    if (
      fileType.startsWith('text/') ||
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileType === 'application/msword' ||
      fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      fileType === 'application/vnd.ms-excel' ||
      fileName.match(/\.(doc|docx|txt|rtf|xls|xlsx|ppt|pptx)$/)
    ) return 'document';
    
    if (fileType.startsWith('video/') || fileName.match(/\.(mp4|avi|mov|wmv|flv|webm|mkv)$/)) return 'video';
    if (fileType.startsWith('audio/') || fileName.match(/\.(mp3|wav|flac|aac|ogg|m4a)$/)) return 'audio';
    return 'other';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderFilePreview = () => {
    const category = getFileCategory(file.file_type);

    if (loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">טוען קובץ...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-2">שגיאה בטעינת הקובץ</p>
            <p className="text-gray-500 text-sm">{error}</p>
          </div>
        </div>
      );
    }

    switch (category) {
      case 'image':
        return (
          <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg overflow-hidden">
            <img
              src={fileUrl}
              alt={file.file_name}
              className="max-w-full max-h-full object-contain"
              style={{
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                transition: 'transform 0.2s ease'
              }}
            />
          </div>
        );

      case 'pdf':
        if (pdfLoadError) {
          return (
            <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
              <div className="text-center">
                <FileText className="h-16 w-16 text-red-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">בעיה בתצוגת PDF</p>
                <p className="text-sm text-gray-500 mb-4">
                  הדפדפן שלך אינו תומך בתצוגת PDF משובצת
                </p>
                <div className="flex flex-col gap-2 items-center">
                  <button
                    onClick={openInNewTab}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    פתח בכרטיסייה חדשה
                  </button>
                  <button
                    onClick={handleDownload}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    הורד PDF
                  </button>
                </div>
              </div>
            </div>
          );
        }

        return (
          <div className="h-96 bg-gray-50 rounded-lg overflow-hidden">
            <iframe
              src={`${fileUrl}#toolbar=1&navpanes=1&scrollbar=1&page=1&view=FitH`}
              className="w-full h-full border-0"
              title={file.file_name}
              onError={() => setPdfLoadError(true)}
              onLoad={(e) => {
                // Check if iframe loaded successfully
                const iframe = e.target as HTMLIFrameElement;
                try {
                  // Try to access iframe content to see if it loaded
                  if (iframe.contentDocument === null) {
                    setPdfLoadError(true);
                  }
                } catch (error) {
                  // Cross-origin restrictions might prevent access, but that's ok
                  // Only set error if there's an actual loading issue
                }
              }}
            />
            <div className="mt-2 text-center">
              <div className="flex justify-center gap-2">
                <button
                  onClick={openInNewTab}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  פתח בכרטיסייה חדשה
                </button>
                <span className="text-gray-400">|</span>
                <button
                  onClick={handleDownload}
                  className="text-sm text-green-600 hover:text-green-800 flex items-center gap-1"
                >
                  <Download className="h-3 w-3" />
                  הורד PDF
                </button>
              </div>
            </div>
          </div>
        );

      case 'video':
        return (
          <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg overflow-hidden">
            <video
              src={fileUrl}
              controls
              className="max-w-full max-h-full"
              style={{ maxHeight: '100%' }}
            >
              הדפדפן שלך אינו תומך בתגית וידאו.
            </video>
          </div>
        );

      case 'audio':
        return (
          <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
            <div className="text-center">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">קובץ אודיו</p>
              <audio
                src={fileUrl}
                controls
                className="w-full max-w-md"
              >
                הדפדפן שלך אינו תומך בתגית אודיו.
              </audio>
            </div>
          </div>
        );

      case 'document':
        return (
          <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
            <div className="text-center">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">מסמך</p>
              <p className="text-sm text-gray-500 mb-4">
                לצפייה מלאה, אנא הורד את הקובץ
              </p>
              <button
                onClick={handleDownload}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
              >
                <Download className="h-4 w-4" />
                הורד לצפייה
              </button>
            </div>
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
            <div className="text-center">
              <Eye className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">תצוגה מקדימה לא זמינה</p>
              <p className="text-sm text-gray-500 mb-4">
                סוג קובץ זה אינו נתמך לתצוגה מקדימה
              </p>
              <button
                onClick={handleDownload}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
              >
                <Download className="h-4 w-4" />
                הורד קובץ
              </button>
            </div>
          </div>
        );
    }
  };

  if (!isOpen) return null;

  const category = getFileCategory(file.file_type);
  const showImageControls = category === 'image' && !loading && !error;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" dir="rtl">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900 truncate">
              {file.file_name}
            </h2>
            <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
              <span>{formatFileSize(file.file_size)}</span>
              <span>{file.file_type}</span>
              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                קטגוריה: {getFileCategory(file.file_type)}
              </span>
            </div>
            {file.description && (
              <p className="text-sm text-gray-600 mt-1">{file.description}</p>
            )}
          </div>
          
          <div className="flex items-center gap-2 mr-4">
            {showImageControls && (
              <>
                <button
                  onClick={() => setZoom(Math.max(25, zoom - 25))}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  title="התרחק"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="text-xs text-gray-500 min-w-[3rem] text-center">
                  {zoom}%
                </span>
                <button
                  onClick={() => setZoom(Math.min(200, zoom + 25))}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  title="התקרב"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setRotation((rotation + 90) % 360)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  title="סובב"
                >
                  <RotateCw className="h-4 w-4" />
                </button>
              </>
            )}

            {category === 'pdf' && fileUrl && (
              <button
                onClick={openInNewTab}
                className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                title="פתח בכרטיסייה חדשה"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
            )}
            
            <button
              onClick={handleDownload}
              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
              title="הורד קובץ"
            >
              <Download className="h-4 w-4" />
            </button>
            
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="סגור"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-auto">
          {renderFilePreview()}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {showImageControls && (
                <div className="flex items-center gap-4">
                  <span>זום: {zoom}%</span>
                  <span>סיבוב: {rotation}°</span>
                </div>
              )}
              {category === 'pdf' && (
                <div className="text-xs text-gray-500">
                  💡 אם אינך רואה את ה-PDF, נסה לפתוח בכרטיסייה חדשה או להוריד את הקובץ
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {category === 'pdf' && fileUrl && (
                <button
                  onClick={openInNewTab}
                  className="px-4 py-2 text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  פתח בכרטיסייה
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                סגור
              </button>
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                הורד
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 