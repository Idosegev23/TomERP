import React, { useState, useMemo, useCallback, useEffect, memo } from 'react';
import { 
  DndContext, 
  DragOverlay,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
  PointerSensor
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { 
  SortableContext, 
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { 
  ChevronDown, 
  ChevronRight, 
  ChevronLeft,
  FileText, 
  Clock, 
  User, 
  GripVertical,
  Calendar,
  Target,
  BarChart3,
  Columns
} from 'lucide-react';
import { useTasks } from '../../hooks/useTasks';

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

interface TaskViewsProps {
  tasks: Task[];
  onUpdateTaskStatus: (taskId: string, newStatus: string) => Promise<boolean> | void;
  onRefresh?: () => void;
}

type ViewMode = 'tree' | 'gantt' | 'kanban';

const TaskViews: React.FC<TaskViewsProps> = ({ tasks, onUpdateTaskStatus, onRefresh }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);

  const { moveTaskToParent } = useTasks();

  // Track changes in tasks
  useEffect(() => {
    console.log('Tasks updated:', {
      newTasksCount: tasks.length,
      currentViewMode: viewMode,
      tasksByStatus: {
        open: tasks.filter(t => t.status === 'open').length,
        in_progress: tasks.filter(t => t.status === 'in_progress').length,
        pending_approval: tasks.filter(t => t.status === 'pending_approval').length,
        completed: tasks.filter(t => t.status === 'completed').length
      }
    });
  }, [tasks, viewMode]);

  // Memoized status columns for Kanban
  const statusColumns = useMemo(() => {
    const columns = [
      { id: 'open', title: 'פתוחות', status: 'open', color: 'bg-blue-50 border-blue-200' },
      { id: 'in_progress', title: 'בתהליך', status: 'in_progress', color: 'bg-yellow-50 border-yellow-200' },
      { id: 'pending_approval', title: 'ממתינות לאישור', status: 'pending_approval', color: 'bg-orange-50 border-orange-200' },
      { id: 'completed', title: 'הושלמו', status: 'completed', color: 'bg-green-50 border-green-200' }
    ];
    return columns;
  }, []);

  // Memoized function to get tasks by status
  const getTasksByStatus = useCallback((status: string) => {
    return tasks.filter(task => task.status === status);
  }, [tasks]);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100,
        tolerance: 5,
      },
    }),
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const toggleNode = (taskId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedNodes(newExpanded);
  };

  // Organize tasks into infinite hierarchy
  const organizedTasks = useMemo(() => {
    const buildHierarchy = (parentId: string | null = null): Task[] => {
      return tasks
        .filter(task => task.parent_task_id === parentId)
        .map(task => ({
          ...task,
          children: buildHierarchy(task.id)
        }))
        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    };
    
    return buildHierarchy(null);
  }, [tasks]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'pending_approval': return 'bg-orange-100 text-orange-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'טיוטה';
      case 'open': return 'פתוחה';
      case 'in_progress': return 'בתהליך';
      case 'pending_approval': return 'ממתינה לאישור';
      case 'completed': return 'הושלמה';
      case 'cancelled': return 'בוטלה';
      default: return status;
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const taskId = event.active.id as string;
    setActiveId(taskId);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveId(null);

    if (!over) {
      return;
    }

    if (active.id === over.id) {
      return;
    }

    const activeTask = tasks.find(t => t.id === active.id);
    if (!activeTask) {
      return;
    }

    // Handle different drop scenarios
    const overData = over.data.current;
    
    if (overData?.type === 'task') {
      // Dropped on another task - make it a sub-task (Tree view)
      const overTask = overData.task;
      if (overTask.level === 0 && activeTask.level === 0) {
        const success = await moveTaskToParent(activeTask.id, overTask.id);
        if (success) {
          onRefresh?.();
        }
      }
    } else if (overData?.type === 'status-column') {
      // Dropped on Kanban column - update status
      const newStatus = overData.status;
      
      // Validate the new status
      if (!['draft', 'open', 'in_progress', 'pending_approval', 'completed', 'cancelled'].includes(newStatus)) {
        return;
      }
      
      if (newStatus !== activeTask.status) {
        try {
          const result = await onUpdateTaskStatus(activeTask.id, newStatus);
          
          if (result !== false && result !== undefined) {
            onRefresh?.();
          }
        } catch (error) {
          console.error('Error updating task status:', error);
        }
      }
    }
  };

  // Kanban Components - defined at component level to avoid hook issues
  const DroppableColumn = memo(({ column, children }: { column: any, children: React.ReactNode }) => {
    const droppableData = {
      type: 'status-column',
      status: column.status,
      columnId: column.id,
      columnTitle: column.title
    };

    const { setNodeRef, isOver } = useDroppable({
      id: `column-${column.status}`,
      data: droppableData,
    });

    const tasksInColumn = getTasksByStatus(column.status);

    return (
      <div
        ref={setNodeRef}
        className={`${column.color} rounded-lg p-4 border-2 transition-all duration-300 ${
          isOver ? 'border-blue-400 bg-blue-100 scale-105 shadow-lg' : 'border-gray-200'
        }`}
        style={{ minHeight: '500px' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900">{column.title}</h3>
          <span className="bg-white text-gray-700 text-xs px-2 py-1 rounded-full shadow-sm">
            {tasksInColumn.length}
          </span>
        </div>
        
        <div className="space-y-3 min-h-[400px] relative">
          {tasksInColumn.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <div className="text-2xl mb-2">📋</div>
                <p className="text-sm">אין משימות</p>
                {isOver && (
                  <p className="text-xs mt-1 text-blue-600 font-medium">שחרר כאן להעביר</p>
                )}
              </div>
            </div>
          )}
          {children}
        </div>
      </div>
    );
  });

  const KanbanTask = memo(({ task }: { task: Task }) => {
    const sortableData = {
      type: 'task',
      task: task,
    };

    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({
      id: task.id,
      data: sortableData,
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`bg-white rounded-lg p-3 shadow-sm border hover:shadow-md transition-all duration-200 cursor-pointer ${
          isDragging ? 'shadow-lg ring-2 ring-blue-400 rotate-3 z-50' : ''
        }`}
      >
        <div className="flex items-start gap-2">
          <div
            {...attributes}
            {...listeners}
            className="mt-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 touch-none select-none"
            style={{ touchAction: 'none' }}
          >
            <GripVertical className="h-4 w-4" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm text-gray-900 leading-tight">
              {task.title}
            </h4>
            
            {task.description && (
              <p className="text-xs text-gray-600 mt-2 line-clamp-2 leading-relaxed">
                {task.description}
              </p>
            )}
            
            <div className="flex items-center gap-2 mt-3">
              {task.due_date && (
                <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  <Clock className="h-3 w-3" />
                  {new Date(task.due_date).toLocaleDateString('he-IL')}
                </div>
              )}
              
              {task.assigned_to && (
                <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  <User className="h-3 w-3" />
                  {task.assigned_to}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  });

  // Tree View Components
  const TreeNode: React.FC<{ task: Task; level: number }> = ({ task, level }) => {
    const hasChildren = task.children && task.children.length > 0;
    const isExpanded = expandedNodes.has(task.id);
    
    const sortableData = {
      type: 'task',
      task: task,
    };
    
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({
      id: task.id,
      data: sortableData,
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };
    
    const isSubTask = level > 0;
    const indentWidth = level * 2; // 2rem per level

    return (
      <div style={style}>
        {/* Main Task */}
        <div 
          ref={setNodeRef}
          className={`flex items-center gap-3 p-3 rounded-lg border transition-all hover:shadow-md ${
            isSubTask 
              ? 'bg-blue-50 border-l-4 border-l-blue-300 border-gray-200 ml-8' 
              : 'bg-white border-gray-200 shadow-sm'
          } ${isDragging ? 'shadow-lg ring-2 ring-blue-400' : ''}`}
          style={{ 
            marginRight: `${indentWidth}rem`,
            minHeight: '60px'
          }}
        >
          {/* Visual Hierarchy Indicators */}
          {isSubTask && (
            <div className="flex items-center gap-2 text-blue-600 flex-shrink-0">
              <div className="w-4 h-0.5 bg-blue-300"></div>
              <ChevronLeft className="h-4 w-4" />
            </div>
          )}
          
          {/* Drag Handle */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            <GripVertical className="h-4 w-4" />
          </div>

          {/* Expand/Collapse for parent tasks */}
          <div className="flex-shrink-0">
            {hasChildren ? (
              <button
                onClick={() => toggleNode(task.id)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            ) : (
              <div className="w-6 h-6"></div>
            )}
          </div>

          {/* Task Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h3 className={`font-medium text-gray-900 ${isSubTask ? 'text-base' : 'text-lg'}`}>
                {task.title}
              </h3>
              
              {/* Status Badge */}
              <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(task.status)}`}>
                {getStatusLabel(task.status)}
              </span>
              
              {/* Parent/Sub-task Indicators */}
              {hasChildren && !isSubTask && (
                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  משימת-אב ({task.children?.length || 0} תתי-משימות)
                </span>
              )}
              
              {isSubTask && (
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  <ChevronLeft className="h-3 w-3" />
                  תת-משימה
                </span>
              )}
            </div>
            
            {/* Parent Task Info for Sub-tasks */}
            {isSubTask && task.parent_task_id && (
              <div className="mb-2">
                <div className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded border border-blue-200">
                  <FileText className="h-3 w-3" />
                  <span>משימת-אב: {tasks.find(t => t.id === task.parent_task_id)?.title || 'לא נמצא'}</span>
                </div>
              </div>
            )}
            
            {task.description && (
              <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                {task.description}
              </p>
            )}
            
            <div className="flex items-center gap-4 text-sm text-gray-500">
              {task.due_date && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{new Date(task.due_date).toLocaleDateString('he-IL')}</span>
                </div>
              )}
              
              {task.assigned_to && (
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>{task.assigned_to}</span>
                </div>
              )}
              
              {task.progress_percentage !== undefined && (
                <div className="flex items-center gap-1">
                  <Target className="h-4 w-4" />
                  <span>{task.progress_percentage}%</span>
                </div>
              )}
            </div>
          </div>
        </div>

                 {/* Children (Sub-tasks) */}
         {hasChildren && isExpanded && task.children && (
           <div className="mt-2">
             {task.children.map((childTask) => (
               <TreeNode 
                 key={childTask.id} 
                 task={childTask} 
                 level={level + 1}
               />
             ))}
           </div>
         )}
      </div>
    );
  };

  const renderTreeView = () => {
    if (organizedTasks.length === 0) {
      return (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">אין משימות</h3>
          <p className="text-gray-500">יצרו משימה חדשה כדי להתחיל</p>
        </div>
      );
    }

    return (
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext 
          items={tasks.map(t => t.id)} 
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {organizedTasks.map((task) => (
              <TreeNode key={task.id} task={task} level={0} />
            ))}
          </div>
        </SortableContext>
        
        <DragOverlay>
          {activeId ? (
            <div className="bg-white p-3 rounded-lg shadow-lg border-2 border-blue-400 opacity-90">
              {tasks.find(t => t.id === activeId)?.title}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    );
  };

  const renderGanttView = () => {
    const tasksWithDates = tasks.filter(task => task.due_date);
    
    if (tasksWithDates.length === 0) {
      return (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">אין משימות עם תאריכי יעד</h3>
          <p className="text-gray-500">הוסיפו תאריכי יעד למשימות כדי לראות את תצוגת הגאנט</p>
        </div>
      );
    }

    const getTaskPosition = (task: Task) => {
      if (!task.due_date) return { left: 0, width: 0 };
      
      const today = new Date();
      const dueDate = new Date(task.due_date);
      const createdDate = new Date(task.created_at);
      
      const totalDays = Math.ceil((dueDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      const daysFromStart = Math.ceil((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      
      const left = Math.max(0, (daysFromStart / totalDays) * 100);
      const width = Math.min(100 - left, 30);
      
      return { left: `${left}%`, width: `${width}%` };
    };

    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">תצוגת גאנט</h3>
          <p className="text-sm text-gray-500 mt-1">ציר זמן של משימות לפי תאריכי יעד</p>
        </div>
        
        <div className="p-4">
          <div className="space-y-4">
            {tasksWithDates.map((task) => {
              const position = getTaskPosition(task);
              
              return (
                <div key={task.id} className="relative">
                  <div className="flex items-center mb-2">
                    <div className="w-1/3 pr-4">
                      <h4 className="font-medium text-sm text-gray-900 truncate">
                        {task.title}
                      </h4>
                      <span className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusColor(task.status)}`}>
                        {getStatusLabel(task.status)}
                      </span>
                    </div>
                    
                    <div className="w-2/3 relative">
                      <div className="h-2 bg-gray-100 rounded-full relative overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            task.status === 'completed' ? 'bg-green-400' :
                            task.status === 'in_progress' ? 'bg-blue-400' :
                            task.status === 'pending_approval' ? 'bg-orange-400' :
                            'bg-gray-300'
                          }`}
                          style={position}
                        />
                      </div>
                      
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>{new Date(task.created_at).toLocaleDateString('he-IL')}</span>
                        <span>{new Date(task.due_date!).toLocaleDateString('he-IL')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderKanbanView = () => {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statusColumns.map((column) => (
            <DroppableColumn key={column.id} column={column}>
              <SortableContext 
                items={getTasksByStatus(column.status).map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                {getTasksByStatus(column.status).map((task) => (
                  <KanbanTask key={task.id} task={task} />
                ))}
              </SortableContext>
            </DroppableColumn>
          ))}
        </div>
        
        <DragOverlay>
          {activeId ? (
            <KanbanTask task={tasks.find(t => t.id === activeId)!} />
          ) : null}
        </DragOverlay>
      </DndContext>
    );
  };

  const ViewToggle = () => (
    <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
      <button
        onClick={() => setViewMode('tree')}
        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          viewMode === 'tree'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <FileText className="h-4 w-4" />
        עץ
      </button>
      <button
        onClick={() => setViewMode('gantt')}
        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          viewMode === 'gantt'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <BarChart3 className="h-4 w-4" />
        גאנט
      </button>
      <button
        onClick={() => setViewMode('kanban')}
        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          viewMode === 'kanban'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <Columns className="h-4 w-4" />
        קנבן
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900">משימות</h2>
          <span className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
            {tasks.length} משימות
          </span>
        </div>
        
        <ViewToggle />
      </div>

      <div className="bg-gray-50 min-h-screen p-6 rounded-lg">
        {viewMode === 'tree' && renderTreeView()}
        {viewMode === 'gantt' && renderGanttView()}
        {viewMode === 'kanban' && renderKanbanView()}
      </div>
    </div>
  );
};

export default TaskViews; 