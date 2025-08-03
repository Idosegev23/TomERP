import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  GripVertical, 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Calendar,
  User
} from 'lucide-react';
import { InlineEditor } from './InlineEditor';
import { useTasks } from '../../hooks/useTasks';
import { TaskDetailsModal } from './TaskDetailsModal';

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  task_type: string;
  level: number;
  parent_task_id?: string;
  progress_percentage?: number;
  due_date?: string;
  assigned_to?: string;
  created_at: string;
  order_index?: number;
  children?: Task[];
}

interface DraggableTaskProps {
  task: Task;
  children?: Task[];
  isExpanded?: boolean;
  onToggleExpanded?: (taskId: string) => void;
  onRefresh?: () => void;
  depth?: number;
}

export const DraggableTask: React.FC<DraggableTaskProps> = ({
  task,
  children = [],
  isExpanded = false,
  onToggleExpanded,
  onRefresh,
  depth = 0
}) => {
  const [showAddSubTask, setShowAddSubTask] = useState(false);
  const [newSubTaskTitle, setNewSubTaskTitle] = useState('');
  const [showTaskDetails, setShowTaskDetails] = useState(false);
  
  const {
    updateTaskTitle,
    updateTaskDescription,
    updateTaskStatus,
    updateTaskDueDate,
    deleteTask,
    createSubTask,
    isUpdating
  } = useTasks();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: task.id,
    data: {
      type: 'task',
      task: task
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-300';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'pending_approval': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-300';
      case 'draft': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // const getStatusLabel = (status: string) => {
  //   switch (status) {
  //     case 'open': return 'פתוחה';
  //     case 'in_progress': return 'בתהליך';
  //     case 'on_hold': return 'ממתינה';
  //     case 'completed': return 'הושלמה';
  //     case 'cancelled': return 'בוטלה';
  //     default: return status;
  //   }
  // };

  const handleAddSubTask = async () => {
    if (!newSubTaskTitle.trim()) return;
    
    const newTask = await createSubTask(task.id, newSubTaskTitle);
    if (newTask) {
      setNewSubTaskTitle('');
      setShowAddSubTask(false);
      onRefresh?.();
    }
  };

  const handleDelete = async () => {
    const success = await deleteTask(task.id);
    if (success) {
      onRefresh?.();
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    const success = await updateTaskStatus(task.id, newStatus);
    if (success) {
      onRefresh?.();
    }
  };

  const handleTitleUpdate = async (newTitle: string) => {
    const success = await updateTaskTitle(task.id, newTitle);
    if (success) {
      onRefresh?.();
    }
    return success;
  };

  const handleDescriptionUpdate = async (newDescription: string) => {
    const success = await updateTaskDescription(task.id, newDescription);
    if (success) {
      onRefresh?.();
    }
    return success;
  };

  const handleDueDateUpdate = async (newDueDate: string) => {
    const success = await updateTaskDueDate(task.id, newDueDate);
    if (success) {
      onRefresh?.();
    }
    return success;
  };

  const indentationStyle = depth > 0 ? { marginLeft: `${Math.min(depth * 1.5, 6)}rem` } : {};

  const handleTaskClick = () => {
    setShowTaskDetails(true);
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={transform ? { transform: CSS.Transform.toString(transform) } : undefined}
        className={`bg-white rounded-lg border p-3 shadow-sm transition-all hover:shadow-md cursor-pointer ${
          isDragging ? 'opacity-50' : ''
        } ${
          task.priority === 'urgent' ? 'border-r-4 border-r-red-500' : 
          task.priority === 'high' ? 'border-r-4 border-r-orange-500' : ''
        }`}
        onClick={handleTaskClick}
        {...attributes}
        {...listeners}
      >
        {/* Main Task Row */}
        <div className={`p-4 ${task.level === 0 ? 'bg-gray-50 border-b border-gray-200' : ''}`}>
          <div className="flex items-start gap-3">
            {/* Drag Handle */}
            <div
              className="mt-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 touch-none select-none"
              style={{ touchAction: 'none' }}
            >
              <GripVertical className="h-4 w-4" />
            </div>

            {/* Expand/Collapse Button */}
            {children.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpanded?.(task.id);
                }}
                className="mt-1 text-gray-500 hover:text-gray-700 transition-colors"
              >
                {isExpanded ? 
                  <ChevronDown className="h-4 w-4" /> : 
                  <ChevronRight className="h-4 w-4" />
                }
              </button>
            )}

            {/* Task Content */}
            <div className="flex-1 min-w-0 space-y-2">
              {/* Title */}
              <div className="flex items-center gap-2">
                <InlineEditor
                  value={task.title}
                  placeholder="כותרת המשימה"
                  onSave={handleTitleUpdate}
                  disabled={isUpdating}
                  className="font-medium text-gray-900"
                />
                
                {task.level === 0 && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {children.length} משימות
                  </span>
                )}
              </div>

              {/* Description */}
              {(task.description || task.level === 0) && (
                <InlineEditor
                  value={task.description || ''}
                  placeholder="תיאור המשימה"
                  onSave={handleDescriptionUpdate}
                  disabled={isUpdating}
                  multiline
                  className="text-sm text-gray-600"
                />
              )}

              {/* Meta Info Row */}
              <div className="flex items-center gap-4 text-xs text-gray-500">
                {/* Due Date */}
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <input
                    type="date"
                    value={task.due_date ? task.due_date.split('T')[0] : ''}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleDueDateUpdate(e.target.value);
                    }}
                    className="bg-transparent border-none outline-none cursor-pointer hover:text-blue-600"
                    disabled={isUpdating}
                  />
                </div>

                {/* Assigned To */}
                {task.assigned_to && (
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>{task.assigned_to}</span>
                  </div>
                )}

                {/* Progress */}
                {task.progress_percentage !== null && task.level === 0 && (
                  <div className="flex items-center gap-1">
                    <span>התקדמות:</span>
                    <div className="w-16 bg-gray-200 rounded-full h-1.5">
                      <div 
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
                        style={{ width: `${task.progress_percentage}%` }}
                      />
                    </div>
                    <span>{task.progress_percentage}%</span>
                  </div>
                )}
              </div>
            </div>

            {/* Status & Actions */}
            <div className="flex items-start gap-2">
              {/* Status Dropdown */}
              <select
                value={task.status}
                onChange={(e) => {
                  e.stopPropagation();
                  handleStatusChange(e.target.value);
                }}
                disabled={isUpdating}
                className={`text-xs border rounded-md px-2 py-1 ${getStatusColor(task.status)} disabled:opacity-50`}
              >
                <option value="draft">טיוטה</option>
                <option value="open">פתוחה</option>
                <option value="in_progress">בתהליך</option>
                <option value="pending_approval">ממתינה לאישור</option>
                <option value="completed">הושלמה</option>
                <option value="cancelled">בוטלה</option>
              </select>

              {/* Action Buttons */}
              <div className="flex gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAddSubTask(!showAddSubTask);
                  }}
                  disabled={isUpdating}
                  className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                  title="הוסף משימה לשלב"
                >
                  <Plus className="h-4 w-4" />
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete();
                  }}
                  disabled={isUpdating}
                  className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                  title="מחק משימה"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Add Sub-Task Form */}
          {showAddSubTask && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSubTaskTitle}
                  onChange={(e) => setNewSubTaskTitle(e.target.value)}
                  placeholder="כותרת משימה חדשה"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddSubTask();
                    } else if (e.key === 'Escape') {
                      setShowAddSubTask(false);
                      setNewSubTaskTitle('');
                    }
                  }}
                  autoFocus
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddSubTask();
                  }}
                  disabled={!newSubTaskTitle.trim() || isUpdating}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  הוסף
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAddSubTask(false);
                    setNewSubTaskTitle('');
                  }}
                  className="px-3 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  בטל
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Child Tasks */}
        {isExpanded && children.length > 0 && (
          <div className="bg-white border-t border-gray-100">
            {children.map((childTask, index) => (
              <div key={childTask.id} className={`${index > 0 ? 'border-t border-gray-50' : ''}`}>
                <DraggableTask
                  task={childTask}
                  children={childTask.children || []}
                  isExpanded={isExpanded}
                  onToggleExpanded={onToggleExpanded}
                  depth={depth + 1}
                  onRefresh={onRefresh}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Task Details Modal */}
      {showTaskDetails && (
        <TaskDetailsModal
          isOpen={showTaskDetails}
          onClose={() => setShowTaskDetails(false)}
          taskId={task.id}
          onTaskUpdated={onRefresh}
        />
      )}
    </>
  );
}; 