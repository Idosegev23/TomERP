import React, { useState } from 'react';
import { 
  X, 
  ZoomIn, 
  Download, 
  Eye,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Maximize2,
  FileText,
  Image as ImageIcon,
  FileVideo,
  FileSpreadsheet,
  ExternalLink
} from 'lucide-react';

interface MediaFile {
  id: string;
  original_filename: string;
  file_url: string;
  thumbnail_url?: string;
  mime_type?: string;
  file_size: number;
  description?: string;
  created_at: string;
}

interface MediaGalleryProps {
  files: MediaFile[];
  isOpen: boolean;
  onClose: () => void;
  initialIndex?: number;
  title?: string;
}

export const MediaGallery: React.FC<MediaGalleryProps> = ({
  files,
  isOpen,
  onClose,
  initialIndex = 0,
  title = "גלריית מדיה"
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const currentFile = files[currentIndex];

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + files.length) % files.length);
    setRotation(0);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % files.length);
    setRotation(0);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleDownload = async (file: MediaFile) => {
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
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType?: string) => {
    if (mimeType?.startsWith('image/')) {
      return <ImageIcon className="w-5 h-5 text-green-600" />;
    } else if (mimeType?.startsWith('video/')) {
      return <FileVideo className="w-5 h-5 text-purple-600" />;
    } else if (mimeType?.includes('pdf')) {
      return <FileText className="w-5 h-5 text-red-600" />;
    } else if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel')) {
      return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
    } else {
      return <FileText className="w-5 h-5 text-blue-600" />;
    }
  };

  const isImage = currentFile?.mime_type?.startsWith('image/');
  const isVideo = currentFile?.mime_type?.startsWith('video/');
  const isPdf = currentFile?.mime_type?.includes('pdf');

  if (!isOpen || !currentFile) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black bg-opacity-95">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-black bg-opacity-50 p-4">
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-medium">{title}</h3>
            <div className="text-sm opacity-75">
              {currentIndex + 1} מתוך {files.length}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {isImage && (
              <button
                onClick={handleRotate}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                title="סובב"
              >
                <RotateCw className="w-5 h-5" />
              </button>
            )}
            
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
              title="מסך מלא"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => handleDownload(currentFile)}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
              title="הורד"
            >
              <Download className="w-5 h-5" />
            </button>
            
            {!isImage && !isVideo && (
              <button
                onClick={() => window.open(currentFile.file_url, '_blank')}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                title="פתח בחלון חדש"
              >
                <ExternalLink className="w-5 h-5" />
              </button>
            )}
            
            <button
              onClick={onClose}
              className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
              title="סגור"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      {files.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 p-3 bg-black bg-opacity-50 text-white hover:bg-opacity-70 rounded-full transition-colors"
            title="קודם"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
          
          <button
            onClick={goToNext}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 p-3 bg-black bg-opacity-50 text-white hover:bg-opacity-70 rounded-full transition-colors"
            title="הבא"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Content Area */}
      <div className="flex items-center justify-center h-full p-4 pt-20 pb-20">
        <div className="max-w-full max-h-full">
          {isImage ? (
            <img
              src={currentFile.file_url}
              alt={currentFile.original_filename}
              className="max-w-full max-h-full object-contain transition-transform"
              style={{ 
                transform: `rotate(${rotation}deg)`,
                maxWidth: isFullscreen ? '100vw' : '90vw',
                maxHeight: isFullscreen ? '100vh' : '70vh'
              }}
            />
          ) : isVideo ? (
            <video
              src={currentFile.file_url}
              controls
              className="max-w-full max-h-full"
              style={{ 
                maxWidth: isFullscreen ? '100vw' : '90vw',
                maxHeight: isFullscreen ? '100vh' : '70vh'
              }}
            />
          ) : isPdf ? (
            <iframe
              src={currentFile.file_url}
              className="bg-white"
              style={{ 
                width: isFullscreen ? '100vw' : '90vw',
                height: isFullscreen ? '100vh' : '70vh'
              }}
              title={currentFile.original_filename}
            />
          ) : (
            <div className="bg-white rounded-lg p-12 text-center max-w-md">
              <div className="flex justify-center mb-4">
                {getFileIcon(currentFile.mime_type)}
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                {currentFile.original_filename}
              </h4>
              <p className="text-gray-600 mb-4">
                לא ניתן להציג תצוגה מקדימה עבור סוג קובץ זה
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => window.open(currentFile.file_url, '_blank')}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  פתח קובץ
                </button>
                <button
                  onClick={() => handleDownload(currentFile)}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  הורד קובץ
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* File Info Footer */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-black bg-opacity-50 p-4">
        <div className="text-white text-center">
          <div className="font-medium">{currentFile.original_filename}</div>
          <div className="text-sm opacity-75 mt-1">
            {formatFileSize(currentFile.file_size)} • 
            {new Date(currentFile.created_at).toLocaleDateString('he-IL')}
            {currentFile.description && ` • ${currentFile.description}`}
          </div>
        </div>
      </div>

      {/* Thumbnails Strip */}
      {files.length > 1 && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-10">
          <div className="flex gap-2 bg-black bg-opacity-50 rounded-lg p-2 max-w-screen overflow-x-auto">
            {files.map((file, index) => (
              <button
                key={file.id}
                onClick={() => {
                  setCurrentIndex(index);
                  setRotation(0);
                }}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                  index === currentIndex 
                    ? 'border-white scale-110' 
                    : 'border-transparent hover:border-gray-400'
                }`}
              >
                {file.mime_type?.startsWith('image/') ? (
                  <img
                    src={file.thumbnail_url || file.file_url}
                    alt={file.original_filename}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                    {getFileIcon(file.mime_type)}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};