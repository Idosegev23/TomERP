import React, { useState, useEffect } from 'react';
import { X, Plus, Building2, Home, Users, FileText, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated?: () => void;
  projectId: string;
  parentTaskId?: string;
  defaultLevel?: number;
}

interface TaskFormData {
  title: string;
  description: string;
  task_type: 'technical' | 'marketing' | 'sales' | 'approval' | 'administrative';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string;
  developer_id?: string;
  building_id?: string;
  floor_id?: string;
  apartment_id?: string;
  assigned_to?: string;
}

interface Entity {
  id: string;
  name: string;
}

interface Developer extends Entity {}
interface Building extends Entity {}
interface Floor extends Entity {
  building_id: string;
}
interface Apartment extends Entity {
  floor_id: string;
  apartment_number: string;
}
interface User extends Entity {
  email: string;
}

const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  onClose,
  onTaskCreated,
  projectId,
  parentTaskId,
  defaultLevel = 0
}) => {
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    task_type: 'technical',
    priority: 'medium',
    due_date: '',
  });

  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [loading, setLoading] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Load entities when modal opens
  useEffect(() => {
    if (isOpen) {
      loadEntities();
    }
  }, [isOpen, projectId]);

  // Load floors when building changes
  useEffect(() => {
    if (formData.building_id) {
      loadFloors(formData.building_id);
    } else {
      setFloors([]);
      setApartments([]);
    }
  }, [formData.building_id]);

  // Load apartments when floor changes
  useEffect(() => {
    if (formData.floor_id) {
      loadApartments(formData.floor_id);
    } else {
      setApartments([]);
    }
  }, [formData.floor_id]);

  const loadEntities = async () => {
    try {
      // Load developers
      const { data: developersData } = await supabase
        .from('developers')
        .select('id, name')
        .eq('is_active', true);

      // Load buildings for this project
      const { data: buildingsData } = await supabase
        .from('buildings')
        .select('id, name')
        .eq('project_id', projectId)
        .eq('is_active', true);

      // Load users
      const { data: usersData } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('is_active', true);

      setDevelopers(developersData || []);
      setBuildings(buildingsData || []);
      setUsers(usersData?.map(user => ({
        id: user.id,
        name: user.full_name || user.email,
        email: user.email
      })) || []);
    } catch (error) {
      toast.error('שגיאה בטעינת נתונים');
    }
  };

  const loadFloors = async (buildingId: string) => {
    try {
      const { data } = await supabase
        .from('floors')
        .select('id, name, floor_number, building_id')
        .eq('building_id', buildingId)
        .eq('is_active', true)
        .order('floor_number');

      setFloors(data?.map(floor => ({
        id: floor.id,
        name: floor.name || `קומה ${floor.floor_number}`,
        building_id: floor.building_id
      })) || []);
    } catch (error) {
      toast.error('שגיאה בטעינת קומות');
    }
  };

  const loadApartments = async (floorId: string) => {
    try {
      const { data } = await supabase
        .from('apartments')
        .select('id, apartment_number, floor_id')
        .eq('floor_id', floorId)
        .eq('is_active', true)
        .order('apartment_number');

      setApartments(data?.map(apt => ({
        id: apt.id,
        name: `דירה ${apt.apartment_number}`,
        apartment_number: apt.apartment_number,
        floor_id: apt.floor_id
      })) || []);
    } catch (error) {
      toast.error('שגיאה בטעינת דירות');
    }
  };

  const handleInputChange = (field: keyof TaskFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear dependent fields when parent changes
    if (field === 'building_id') {
      setFormData(prev => ({
        ...prev,
        floor_id: '',
        apartment_id: ''
      }));
    } else if (field === 'floor_id') {
      setFormData(prev => ({
        ...prev,
        apartment_id: ''
      }));
    }
  };

  const createTask = async () => {
    if (!formData.title.trim()) {
      toast.error('כותרת המשימה חובה');
      return;
    }

    setLoading(true);
    try {
      const taskData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        task_type: formData.task_type,
        priority: formData.priority,
        status: 'draft',
        project_id: projectId,
        parent_task_id: parentTaskId || null,
        level: parentTaskId ? defaultLevel + 1 : defaultLevel,
        due_date: formData.due_date || null,
        developer_id: formData.developer_id || null,
        building_id: formData.building_id || null,
        floor_id: formData.floor_id || null,
        apartment_id: formData.apartment_id || null,
        assigned_to: formData.assigned_to || null,
        is_auto_generated: false,
        template_id: null
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert(taskData)
        .select()
        .single();

      if (error) throw error;

      toast.success('המשימה נוצרה בהצלחה!');
      
      // Check if this is a new task that should be added to template
      setShowTemplateModal(true);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        task_type: 'technical',
        priority: 'medium',
        due_date: '',
      });

      if (onTaskCreated) {
        onTaskCreated();
      }

    } catch (error) {
      toast.error('שגיאה ביצירת המשימה');
    } finally {
      setLoading(false);
    }
  };

  const addToTemplate = async () => {
    try {
      const templateData = {
        name: formData.title,
        description: formData.description || null,
        task_type: formData.task_type,
        priority: formData.priority,
        applies_to: 'project',
        is_active: true,
        checklist_items: null,
        required_files: null,
        estimated_duration_days: null,
        auto_trigger_conditions: null
      };

      const { error } = await supabase
        .from('task_templates')
        .insert(templateData);

      if (error) throw error;

      toast.success('המשימה נוספה לטמפלט!');
    } catch (error) {
      toast.error('שגיאה בהוספה לטמפלט');
    } finally {
      setShowTemplateModal(false);
      handleClose();
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      task_type: 'technical',
      priority: 'medium',
      due_date: '',
    });
    setShowTemplateModal(false);
    onClose();
  };

  if (!isOpen && !showTemplateModal) return null;

  // Template confirmation modal
  if (showTemplateModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" dir="rtl">
        <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="text-blue-500" size={24} />
            <h3 className="text-lg font-semibold">הוסף לטמפלט?</h3>
          </div>
          
          <p className="text-gray-600 mb-6">
            האם ברצונך להוסיף את המשימה "{formData.title}" לטמפלט כדי שתופיע אוטומטית בפרויקטים חדשים?
          </p>
          
          <div className="flex gap-3">
            <button
              onClick={addToTemplate}
              className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
            >
              כן, הוסף לטמפלט
            </button>
            <button
              onClick={() => { setShowTemplateModal(false); handleClose(); }}
              className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
            >
              לא, השאר רק לפרויקט זה
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" dir="rtl">
      <div className="bg-white rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {parentTaskId ? 'הוספת תת-משימה' : 'הוספת משימה חדשה'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              כותרת המשימה *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="הזן כותרת למשימה"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              תיאור
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="תיאור המשימה (אופציונלי)"
            />
          </div>

          {/* Type and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                סוג משימה
              </label>
              <select
                value={formData.task_type}
                onChange={(e) => handleInputChange('task_type', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="technical">טכנית</option>
                <option value="marketing">שיווק</option>
                <option value="sales">מכירות</option>
                <option value="approval">אישורים</option>
                <option value="administrative">אדמיניסטרטיבית</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                עדיפות
              </label>
              <select
                value={formData.priority}
                onChange={(e) => handleInputChange('priority', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">נמוכה</option>
                <option value="medium">בינונית</option>
                <option value="high">גבוהה</option>
                <option value="urgent">דחופה</option>
              </select>
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              תאריך יעד
            </label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => handleInputChange('due_date', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Entity Assignment */}
          <div className="border-t pt-6">
            <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Building2 size={20} />
              שיוך ישויות
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Developer */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  יזם
                </label>
                <select
                  value={formData.developer_id || ''}
                  onChange={(e) => handleInputChange('developer_id', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">בחר יזם</option>
                  {developers.map(dev => (
                    <option key={dev.id} value={dev.id}>{dev.name}</option>
                  ))}
                </select>
              </div>

              {/* Building */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  בניין
                </label>
                <select
                  value={formData.building_id || ''}
                  onChange={(e) => handleInputChange('building_id', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">בחר בניין</option>
                  {buildings.map(building => (
                    <option key={building.id} value={building.id}>{building.name}</option>
                  ))}
                </select>
              </div>

              {/* Floor */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  קומה
                </label>
                <select
                  value={formData.floor_id || ''}
                  onChange={(e) => handleInputChange('floor_id', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!formData.building_id}
                >
                  <option value="">בחר קומה</option>
                  {floors.map(floor => (
                    <option key={floor.id} value={floor.id}>{floor.name}</option>
                  ))}
                </select>
              </div>

              {/* Apartment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  דירה
                </label>
                <select
                  value={formData.apartment_id || ''}
                  onChange={(e) => handleInputChange('apartment_id', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!formData.floor_id}
                >
                  <option value="">בחר דירה</option>
                  {apartments.map(apt => (
                    <option key={apt.id} value={apt.id}>{apt.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Assigned User */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Users size={16} />
              משויך למשתמש
            </label>
            <select
              value={formData.assigned_to || ''}
              onChange={(e) => handleInputChange('assigned_to', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">בחר משתמש</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t">
          <button
            onClick={createTask}
            disabled={loading || !formData.title.trim()}
            className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <Plus size={20} />
            )}
            יצירת משימה
          </button>
          <button
            onClick={handleClose}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskFormModal; 