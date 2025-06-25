import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Layers, 
  Plus, 
  Edit, 
  Trash2, 
  ArrowRight,
  Home,
  ChevronRight,
  Building2
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Floor {
  id: string;
  name: string;
  building_id: string;
  floor_number: number;
  total_units: number;
  floor_plan_url?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

interface Building {
  id: string;
  name: string;
  description?: string;
  project_id: string;
}

interface Project {
  id: string;
  name: string;
}

export const Floors: React.FC = () => {
  const { projectId, buildingId } = useParams<{ 
    projectId: string; 
    buildingId: string; 
  }>();
  const navigate = useNavigate();
  const [floors, setFloors] = useState<Floor[]>([]);
  const [building, setBuilding] = useState<Building | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingFloor, setEditingFloor] = useState<Floor | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    floor_number: 1,
    floor_plan_url: ''
  });

  useEffect(() => {
    if (projectId && buildingId) {
      fetchProjectBuildingAndFloors();
    }
  }, [projectId, buildingId]);

  const fetchProjectBuildingAndFloors = async () => {
    try {
      setIsLoading(true);
      
      // Fetch project details
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, name')
        .eq('id', projectId)
        .single();

      if (projectError) {
        toast.error('שגיאה בטעינת פרטי הפרויקט');
        return;
      }

      setProject(projectData);

      // Fetch building details
      const { data: buildingData, error: buildingError } = await supabase
        .from('buildings')
        .select('id, name, description, project_id')
        .eq('id', buildingId)
        .single();

      if (buildingError) {
        toast.error('שגיאה בטעינת פרטי הבניין');
        return;
      }

      setBuilding(buildingData);

      // Fetch floors
      const { data: floorsData, error: floorsError } = await supabase
        .from('floors')
        .select(`
          id,
          name,
          building_id,
          floor_number,
          total_units,
          floor_plan_url,
          is_active,
          created_by,
          created_at,
          updated_at
        `)
        .eq('building_id', buildingId)
        .eq('is_active', true)
        .order('floor_number', { ascending: true });

      if (floorsError) {
        toast.error('שגיאה בטעינת הקומות');
        return;
      }

      setFloors(floorsData || []);

    } catch (error) {
      toast.error('שגיאה כללית');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('שם הקומה הוא שדה חובה');
      return;
    }

    try {
      if (editingFloor) {
        // Update existing floor
        const { error } = await supabase
          .from('floors')
          .update({
            name: formData.name,
            floor_number: formData.floor_number,
            floor_plan_url: formData.floor_plan_url || null
          })
          .eq('id', editingFloor.id);

        if (error) {
          toast.error('שגיאה בעדכון הקומה');
          return;
        }

        toast.success('הקומה עודכנה בהצלחה');
      } else {
        // Create new floor
        const { error } = await supabase
          .from('floors')
          .insert({
            name: formData.name,
            building_id: buildingId,
            floor_number: formData.floor_number,
            floor_plan_url: formData.floor_plan_url || null
          });

        if (error) {
          toast.error('שגיאה ביצירת הקומה');
          return;
        }

        toast.success('הקומה נוצרה בהצלחה');
      }

      resetForm();
      fetchProjectBuildingAndFloors();
    } catch (error) {
      toast.error('שגיאה כללית');
    }
  };

  const handleEdit = (floor: Floor) => {
    setEditingFloor(floor);
    setFormData({
      name: floor.name,
      floor_number: floor.floor_number,
      floor_plan_url: floor.floor_plan_url || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (floorId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את הקומה? פעולה זו תמחק גם את כל הדירות בקומה.')) {
      return;
    }

    try {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('floors')
        .update({ is_active: false })
        .eq('id', floorId);

      if (error) {
        toast.error('שגיאה במחיקת הקומה');
        return;
      }

      toast.success('הקומה נמחקה בהצלחה');
      fetchProjectBuildingAndFloors();
    } catch (error) {
      toast.error('שגיאה כללית');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      floor_number: 1,
      floor_plan_url: ''
    });
    setEditingFloor(null);
    setShowForm(false);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">טוען...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6" dir="rtl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-600 mb-6">
        <button
          onClick={() => navigate('/')}
          className="hover:text-blue-600 flex items-center gap-1"
        >
          <Home className="h-4 w-4" />
          דף הבית
        </button>
        <ChevronRight className="h-4 w-4" />
        <button
          onClick={() => navigate('/projects')}
          className="hover:text-blue-600"
        >
          פרויקטים
        </button>
        <ChevronRight className="h-4 w-4" />
        <button
          onClick={() => navigate(`/projects/${projectId}`)}
          className="hover:text-blue-600"
        >
          {project?.name}
        </button>
        <ChevronRight className="h-4 w-4" />
        <button
          onClick={() => navigate(`/projects/${projectId}/buildings`)}
          className="hover:text-blue-600"
        >
          בניינים
        </button>
        <ChevronRight className="h-4 w-4" />
        <span className="text-gray-900 font-medium">
          {building?.name} - קומות
        </span>
      </nav>

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            קומות בבניין: {building?.name}
          </h1>
          {building?.description && (
            <p className="text-gray-600">{building.description}</p>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
            <Building2 className="h-4 w-4" />
            <span>פרויקט: {project?.name}</span>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
        >
          <Plus className="h-5 w-5" />
          הוסף קומה
        </button>
      </div>

      {/* Floors List */}
      {floors.length === 0 && !showForm ? (
        <div className="text-center py-12">
          <Layers className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">אין קומות בבניין</h3>
          <p className="text-gray-500 mb-4">התחל בהוספת הקומה הראשונה</p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto transition-colors"
          >
            <Plus className="h-5 w-5" />
            הוסף קומה
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {floors.map((floor) => (
            <div key={floor.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Layers className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{floor.name}</h3>
                    
                    <div className="flex items-center gap-6 mt-3 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">קומה מספר:</span>
                        <span className="bg-gray-100 px-2 py-1 rounded">{floor.floor_number}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <span className="font-medium">דירות:</span>
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">{floor.total_units}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(floor)}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    title="ערוך קומה"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(floor.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="מחק קומה"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => navigate(`/projects/${projectId}/buildings/${buildingId}/floors/${floor.id}/apartments`)}
                    className="bg-gray-50 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 flex items-center gap-2 transition-colors"
                  >
                    צפה בדירות
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">
                {editingFloor ? 'ערוך קומה' : 'הוסף קומה חדשה'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    שם הקומה *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="הזן שם קומה"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    מספר קומה
                  </label>
                  <input
                    type="number"
                    value={formData.floor_number}
                    onChange={(e) => setFormData({ ...formData, floor_number: parseInt(e.target.value) || 1 })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    קישור תצוגה
                  </label>
                  <input
                    type="text"
                    value={formData.floor_plan_url}
                    onChange={(e) => setFormData({ ...formData, floor_plan_url: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="הזן קישור תצוגה"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editingFloor ? 'עדכן' : 'הוסף'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    בטל
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 