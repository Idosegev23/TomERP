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
  Building2,
  FileText,
  Folder,
  Eye,
  Zap,
  CheckSquare
} from 'lucide-react';
import toast from 'react-hot-toast';
import { FloorDocumentsManager, FloorTasksManager } from '../components/floors';

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
  documents_count?: number; // כמות מסמכים
  // שדות נוספים
  description?: string;
  technical_notes?: string;
  ceiling_height?: number;
  completion_percentage?: number;
  construction_stage?: string;
  electrical_work?: string;
  plumbing_work?: string;
  flooring_work?: string;
  painting_work?: string;
  tasks_count?: number; // כמות משימות
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
  const [showDocuments, setShowDocuments] = useState(false);
  const [documentsFloor, setDocumentsFloor] = useState<Floor | null>(null);
  const [showTasks, setShowTasks] = useState(false);
  const [tasksFloor, setTasksFloor] = useState<Floor | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    floor_number: 1,
    floor_plan_url: '',
    description: '',
    technical_notes: '',
    ceiling_height: '',
    construction_stage: 'planned',
    electrical_work: 'not_started',
    plumbing_work: 'not_started',
    flooring_work: 'not_started',
    painting_work: 'not_started'
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

      // Fetch floors with all data
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
          updated_at,
          description,
          technical_notes,
          ceiling_height,
          completion_percentage,
          construction_stage,
          electrical_work,
          plumbing_work,
          flooring_work,
          painting_work
        `)
        .eq('building_id', buildingId)
        .eq('is_active', true)
        .order('floor_number', { ascending: true });

      if (floorsError) {
        toast.error('שגיאה בטעינת הקומות');
        return;
      }

      // Get documents and tasks count for each floor
      const floorsWithCounts = await Promise.all(
        (floorsData || []).map(async (floor) => {
          // ספירת מסמכים
          const { count: documentsCount } = await supabase
            .from('files')
            .select('*', { count: 'exact', head: true })
            .eq('floor_id', floor.id)
            .eq('is_active', true);
          
          // ספירת משימות
          const { count: tasksCount } = await supabase
            .from('floor_tasks')
            .select('*', { count: 'exact', head: true })
            .eq('floor_id', floor.id);
          
          return {
            ...floor,
            documents_count: documentsCount || 0,
            tasks_count: tasksCount || 0
          };
        })
      );

      setFloors(floorsWithCounts);

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
      const floorData = {
        name: formData.name,
        floor_number: formData.floor_number,
        floor_plan_url: formData.floor_plan_url || null,
        description: formData.description || null,
        technical_notes: formData.technical_notes || null,
        ceiling_height: formData.ceiling_height ? parseFloat(formData.ceiling_height) : null,
        construction_stage: formData.construction_stage,
        electrical_work: formData.electrical_work,
        plumbing_work: formData.plumbing_work,
        flooring_work: formData.flooring_work,
        painting_work: formData.painting_work
      };

      if (editingFloor) {
        // Update existing floor
        const { error } = await supabase
          .from('floors')
          .update(floorData)
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
            ...floorData,
            building_id: buildingId
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
      floor_plan_url: floor.floor_plan_url || '',
      description: floor.description || '',
      technical_notes: floor.technical_notes || '',
      ceiling_height: floor.ceiling_height?.toString() || '',
      construction_stage: floor.construction_stage || 'planned',
      electrical_work: floor.electrical_work || 'not_started',
      plumbing_work: floor.plumbing_work || 'not_started',
      flooring_work: floor.flooring_work || 'not_started',
      painting_work: floor.painting_work || 'not_started'
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

  const handleDocuments = (floor: Floor) => {
    setDocumentsFloor(floor);
    setShowDocuments(true);
  };

  const closeDocuments = () => {
    setShowDocuments(false);
    setDocumentsFloor(null);
    // Refresh floors to update documents count
    fetchProjectBuildingAndFloors();
  };

  const handleTasks = (floor: Floor) => {
    setTasksFloor(floor);
    setShowTasks(true);
  };

  const closeTasks = () => {
    setShowTasks(false);
    setTasksFloor(null);
    // Refresh floors to update tasks count
    fetchProjectBuildingAndFloors();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      floor_number: 1,
      floor_plan_url: '',
      description: '',
      technical_notes: '',
      ceiling_height: '',
      construction_stage: 'planned',
      electrical_work: 'not_started',
      plumbing_work: 'not_started',
      flooring_work: 'not_started',
      painting_work: 'not_started'
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
        <div className="flex gap-3">
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
          >
            <Plus className="h-5 w-5" />
            הוסף קומה
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      {floors.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Layers className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-900">
                  {floors.length}
                </div>
                <div className="text-sm text-green-700">קומות סה"כ</div>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Home className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-900">
                  {floors.reduce((sum, floor) => sum + floor.total_units, 0)}
                </div>
                <div className="text-sm text-blue-700">דירות סה"כ</div>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-900">
                  {floors.reduce((sum, floor) => sum + (floor.documents_count || 0), 0)}
                </div>
                <div className="text-sm text-purple-700">מסמכים סה"כ</div>
              </div>
            </div>
          </div>
          
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Zap className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-900">
                  {floors.reduce((sum, floor) => sum + (floor.tasks_count || 0), 0)}
                </div>
                <div className="text-sm text-orange-700">משימות סה"כ</div>
              </div>
            </div>
          </div>
        </div>
      )}

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
                      
                      <div className="flex items-center gap-1">
                        <span className="font-medium">📁 מסמכים:</span>
                        <span className={`px-2 py-1 rounded ${
                          (floor.documents_count || 0) > 0 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {floor.documents_count || 0}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <span className="font-medium">⚡ משימות:</span>
                        <span className={`px-2 py-1 rounded ${
                          (floor.tasks_count || 0) > 0 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {floor.tasks_count || 0}
                        </span>
                      </div>
                      
                      {floor.completion_percentage !== undefined && (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">📊 השלמה:</span>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all ${
                                  floor.completion_percentage >= 80 ? 'bg-green-500' :
                                  floor.completion_percentage >= 50 ? 'bg-yellow-500' :
                                  floor.completion_percentage >= 20 ? 'bg-orange-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${floor.completion_percentage}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium">
                              {floor.completion_percentage}%
                            </span>
                          </div>
                        </div>
                      )}
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
                    onClick={() => handleDocuments(floor)}
                    className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
                    title="📁 ניהול מסמכי קומה"
                  >
                    <Folder className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleTasks(floor)}
                    className="p-2 text-gray-400 hover:text-orange-600 transition-colors"
                    title="⚡ ניהול משימות קומה"
                  >
                    <Zap className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(floor.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="מחק קומה"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDocuments(floor)}
                    className="bg-purple-50 text-purple-700 px-3 py-2 rounded-lg hover:bg-purple-100 flex items-center gap-2 transition-colors"
                  >
                    📁 מסמכים
                    <Folder className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleTasks(floor)}
                    className="bg-orange-50 text-orange-700 px-3 py-2 rounded-lg hover:bg-orange-100 flex items-center gap-2 transition-colors"
                  >
                    ⚡ משימות
                    <Zap className="h-4 w-4" />
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
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    תיאור
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="תיאור כללי של הקומה"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      גובה תקרה (מטר)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.ceiling_height}
                      onChange={(e) => setFormData({ ...formData, ceiling_height: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="למשל: 2.7"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      שלב בנייה
                    </label>
                    <select
                      value={formData.construction_stage}
                      onChange={(e) => setFormData({ ...formData, construction_stage: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="planned">🗺️ מתוכנן</option>
                      <option value="foundation">🏗️ יסודות</option>
                      <option value="structure">🏢 שלד</option>
                      <option value="walls">🧱 קירות</option>
                      <option value="roofing">🏠 גגות</option>
                      <option value="electrical">⚡ חשמל</option>
                      <option value="plumbing">🚰 אינסטלציה</option>
                      <option value="flooring">🪜 ריצוף</option>
                      <option value="painting">🎨 צביעה</option>
                      <option value="finishing">✨ גימורים</option>
                      <option value="completed">✅ הושלם</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">🔧 סטטוס עבודות טכניות</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ⚡ חשמל
                      </label>
                      <select
                        value={formData.electrical_work}
                        onChange={(e) => setFormData({ ...formData, electrical_work: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="not_started">⏸️ לא התחיל</option>
                        <option value="in_progress">🔄 בעבודה</option>
                        <option value="completed">✅ הושלם</option>
                        <option value="issues">⚠️ בעיות</option>
                        <option value="approved">👍 מאושר</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        🚰 אינסטלציה
                      </label>
                      <select
                        value={formData.plumbing_work}
                        onChange={(e) => setFormData({ ...formData, plumbing_work: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="not_started">⏸️ לא התחיל</option>
                        <option value="in_progress">🔄 בעבודה</option>
                        <option value="completed">✅ הושלם</option>
                        <option value="issues">⚠️ בעיות</option>
                        <option value="approved">👍 מאושר</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        🪜 ריצוף
                      </label>
                      <select
                        value={formData.flooring_work}
                        onChange={(e) => setFormData({ ...formData, flooring_work: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="not_started">⏸️ לא התחיל</option>
                        <option value="in_progress">🔄 בעבודה</option>
                        <option value="completed">✅ הושלם</option>
                        <option value="issues">⚠️ בעיות</option>
                        <option value="approved">👍 מאושר</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        🎨 צביעה
                      </label>
                      <select
                        value={formData.painting_work}
                        onChange={(e) => setFormData({ ...formData, painting_work: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="not_started">⏸️ לא התחיל</option>
                        <option value="in_progress">🔄 בעבודה</option>
                        <option value="completed">✅ הושלם</option>
                        <option value="issues">⚠️ בעיות</option>
                        <option value="approved">👍 מאושר</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    הערות טכניות
                  </label>
                  <textarea
                    value={formData.technical_notes}
                    onChange={(e) => setFormData({ ...formData, technical_notes: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="הערות טכניות, בעיות, או הנחיות מיוחדות"
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

      {/* Documents Manager Modal */}
      {showDocuments && documentsFloor && (
        <FloorDocumentsManager
          isOpen={showDocuments}
          onClose={closeDocuments}
          floor={documentsFloor}
        />
      )}

      {/* Tasks Manager Modal */}
      {showTasks && tasksFloor && (
        <FloorTasksManager
          isOpen={showTasks}
          onClose={closeTasks}
          floor={tasksFloor}
        />
      )}
    </div>
  );
}; 