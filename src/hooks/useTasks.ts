import { useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

export const useTasks = () => {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateTaskStatus = useCallback(async (taskId: string, newStatus: string) => {
    // Validate inputs
    if (!taskId || typeof taskId !== 'string') {
      toast.error('שגיאה: מזהה משימה לא תקין');
      return false;
    }

    if (!newStatus || typeof newStatus !== 'string') {
      toast.error('שגיאה: סטטוס לא תקין');
      return false;
    }

    if (!['draft', 'open', 'in_progress', 'pending_approval', 'completed', 'cancelled'].includes(newStatus)) {
      toast.error('שגיאה: סטטוס לא חוקי');
      return false;
    }

    setIsUpdating(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId)
        .select();

      if (error) {
        // Better error messages based on error type
        if (error.code === '42501') {
          toast.error('שגיאה: אין הרשאה לעדכן משימה זו');
        } else if (error.code === '23514') {
          toast.error('שגיאה: ערך סטטוס לא חוקי');
        } else if (error.code === '23503') {
          toast.error('שגיאה: משימה לא נמצאה');
        } else {
          toast.error(`שגיאה בעדכון: ${error.message}`);
        }
        
        return false;
      }
      
      if (!data || data.length === 0) {
        toast.error('שגיאה: משימה לא נמצאה');
        return false;
      }
      
      toast.success(`סטטוס המשימה עודכן ל"${getStatusLabel(newStatus)}"`);
      return true;
    } catch (error) {
      toast.error('שגיאה לא צפויה בעדכון המשימה');
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  // Helper function for status labels
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

  const updateTaskTitle = useCallback(async (taskId: string, newTitle: string) => {
    if (!newTitle.trim()) {
      toast.error('כותרת המשימה לא יכולה להיות רקה');
      return false;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ title: newTitle.trim() })
        .eq('id', taskId);

      if (error) throw error;
      
      toast.success('כותרת המשימה עודכנה בהצלחה');
      return true;
    } catch (error) {
      toast.error('שגיאה בעדכון כותרת המשימה');
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const updateTaskDescription = useCallback(async (taskId: string, newDescription: string) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ description: newDescription.trim() || null })
        .eq('id', taskId);

      if (error) throw error;
      
      toast.success('תיאור המשימה עודכן בהצלחה');
      return true;
    } catch (error) {
      toast.error('שגיאה בעדכון תיאור המשימה');
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const updateTaskDueDate = useCallback(async (taskId: string, newDueDate: string) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ due_date: newDueDate || null })
        .eq('id', taskId);

      if (error) throw error;
      
      toast.success('תאריך יעד עודכן בהצלחה');
      return true;
    } catch (error) {
      toast.error('שגיאה בעדכון תאריך היעד');
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const moveTaskToParent = useCallback(async (taskId: string, newParentId: string | null) => {
    setIsUpdating(true);
    try {
      // Check if trying to make a task its own parent
      if (taskId === newParentId) {
        toast.error('לא ניתן להפוך משימה לבת של עצמה');
        return false;
      }
      
      // Calculate the level based on parent
      const level = newParentId ? 1 : 0;
      
      const { error } = await supabase
        .from('tasks')
        .update({ 
          parent_task_id: newParentId,
          level: level
        })
        .eq('id', taskId);

      if (error) throw error;
      
      toast.success('המשימה הועברה בהצלחה');
      return true;
    } catch (error) {
      toast.error('שגיאה בהעברת המשימה');
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const updateTaskOrder = useCallback(async (taskId: string, newOrderIndex: number) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ order_index: newOrderIndex })
        .eq('id', taskId);

      if (error) throw error;
      
      return true;
    } catch (error) {
      toast.error('שגיאה בעדכון סדר המשימה');
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const deleteTask = useCallback(async (taskId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק משימה זו?')) {
      return false;
    }

    setIsUpdating(true);
    try {
      // First check if this task has children
      const { data: childTasks, error: checkError } = await supabase
        .from('tasks')
        .select('id')
        .eq('parent_task_id', taskId);

      if (checkError) throw checkError;

      if (childTasks && childTasks.length > 0) {
        const confirmed = confirm(
          `למשימה זו יש ${childTasks.length} תת-משימות. האם אתה בטוח שברצונך למחוק את כולן?`
        );
        if (!confirmed) {
          setIsUpdating(false);
          return false;
        }
      }

      // Delete the task (will cascade delete children due to foreign key constraint)
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      
      toast.success('המשימה נמחקה בהצלחה');
      return true;
    } catch (error) {
      toast.error('שגיאה במחיקת המשימה');
      return false;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const createSubTask = useCallback(async (parentTaskId: string, title: string) => {
    if (!title.trim()) {
      toast.error('כותרת המשימה לא יכולה להיות רקה');
      return null;
    }

    setIsUpdating(true);
    try {
      // Get parent task info
      const { data: parentTask, error: parentError } = await supabase
        .from('tasks')
        .select('project_id, developer_id, building_id, floor_id, apartment_id')
        .eq('id', parentTaskId)
        .single();

      if (parentError) throw parentError;

      const { data: newTask, error } = await supabase
        .from('tasks')
        .insert([{
          title: title.trim(),
          description: null,
          status: 'open',
          task_type: 'administrative',
          level: 1,
          parent_task_id: parentTaskId,
          project_id: parentTask.project_id,
          developer_id: parentTask.developer_id,
          building_id: parentTask.building_id,
          floor_id: parentTask.floor_id,
          apartment_id: parentTask.apartment_id,
          progress_percentage: 0
        }])
        .select()
        .single();

      if (error) throw error;
      
      toast.success('תת-משימה נוצרה בהצלחה');
      return newTask;
    } catch (error) {
      toast.error('שגיאה ביצירת תת-משימה');
      return null;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  return {
    updateTaskStatus,
    updateTaskTitle,
    updateTaskDescription,
    updateTaskDueDate,
    moveTaskToParent,
    updateTaskOrder,
    deleteTask,
    createSubTask,
    isUpdating
  };
}; 