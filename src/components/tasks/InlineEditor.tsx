import React, { useState, useRef, useEffect } from 'react';
import { Check, X, Edit2 } from 'lucide-react';

interface InlineEditorProps {
  value: string;
  placeholder?: string;
  onSave: (value: string) => Promise<boolean>;
  multiline?: boolean;
  className?: string;
  disabled?: boolean;
}

export const InlineEditor: React.FC<InlineEditorProps> = ({
  value,
  placeholder = '',
  onSave,
  multiline = false,
  className = '',
  disabled = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (multiline && inputRef.current instanceof HTMLTextAreaElement) {
        inputRef.current.setSelectionRange(editValue.length, editValue.length);
      } else if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.setSelectionRange(editValue.length, editValue.length);
      }
    }
  }, [isEditing, editValue.length, multiline]);

  const handleEdit = () => {
    if (disabled) return;
    setIsEditing(true);
    setEditValue(value);
  };

  const handleSave = async () => {
    if (editValue.trim() === value || (!editValue.trim() && !value)) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    const success = await onSave(editValue);
    setIsSaving(false);
    
    if (success) {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (multiline && !e.shiftKey) {
        e.preventDefault();
        handleSave();
      } else if (!multiline) {
        e.preventDefault();
        handleSave();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-start gap-2 group">
        {multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`min-h-[60px] resize-none flex-1 px-2 py-1 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
            disabled={isSaving}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`flex-1 px-2 py-1 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
            disabled={isSaving}
          />
        )}
        <div className="flex gap-1 mt-1">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded disabled:opacity-50"
            title="שמור"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded disabled:opacity-50"
            title="בטל"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`group cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
      onClick={handleEdit}
    >
      <div className="flex items-center gap-2">
        <span className={`flex-1 ${!value ? 'text-gray-400 italic' : ''} ${className}`}>
          {value || placeholder}
        </span>
        {!disabled && (
          <Edit2 className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </div>
    </div>
  );
}; 