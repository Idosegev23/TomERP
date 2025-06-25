import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Building2, 
  Plus, 
  Edit, 
  Trash2, 
  ArrowRight,
  Home,
  ChevronRight,
  CheckCircle,
  Settings,
  FileText,
  Users,
  TrendingUp,
  MapPin,
  Layers,
  Car,
  Package,
  Zap,
  Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import { UnitTasksModal } from '../components/units';

interface Building {
  id: string;
  name: string;
  description?: string;
  project_id: string;
  building_number?: number;
  total_floors?: number;
  total_units: number;
  elevator_count?: number;
  has_parking: boolean;
  has_storage: boolean;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
}

interface FormData {
  name: string;
  description: string;
  building_number: number;
  total_floors: number;
  elevator_count: number;
  has_parking: boolean;
  has_storage: boolean;
}

export const Buildings: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [buildingStats, setBuildingStats] = useState<{ [key: string]: any }>({});
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    building_number: 1,
    total_floors: 1,
    elevator_count: 0,
    has_parking: false,
    has_storage: false
  });

  useEffect(() => {
    if (projectId) {
      fetchProjectAndBuildings();
    }
  }, [projectId]);

  const fetchProjectAndBuildings = async () => {
    if (!projectId) return;

    try {
      setIsLoading(true);
      
      // Fetch project details
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, name, description')
        .eq('id', projectId)
        .single();

      if (projectError) {
        toast.error('שגיאה בטעינת פרטי הפרויקט');
        return;
      }

      setProject(projectData);

      // Fetch buildings
      const { data: buildingsData, error: buildingsError } = await supabase
        .from('buildings')
        .select(`
          id,
          name,
          description,
          project_id,
          building_number,
          total_floors,
          total_units,
          elevator_count,
          has_parking,
          has_storage,
          is_active,
          created_by,
          created_at,
          updated_at
        `)
        .eq('project_id', projectId)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (buildingsError) {
        toast.error('שגיאה בטעינת הבניינים');
        return;
      }

      setBuildings(buildingsData || []);

      // Load building statistics
      if (buildingsData && buildingsData.length > 0) {
        await loadBuildingStats(buildingsData.map(b => b.id));
      }

    } catch (error) {
      toast.error('שגיאה כללית');
    } finally {
      setIsLoading(false);
    }
  };

  const loadBuildingStats = async (buildingIds: string[]) => {
    try {
      const stats: { [key: string]: any } = {};
      
      for (const buildingId of buildingIds) {
        // Count floors
        const { data: floorsData } = await supabase
          .from('floors')
          .select('id')
          .eq('building_id', buildingId)
          .eq('is_active', true);

        // Count apartments
        const { data: apartmentsData } = await supabase
          .from('apartments')
          .select('id, status')
          .in('floor_id', (floorsData || []).map(f => f.id))
          .eq('is_active', true);

        // Count tasks
        const { data: tasksData } = await supabase
          .from('tasks')
          .select('id, status')
          .eq('entity_type', 'building')
          .eq('entity_id', buildingId)
          .eq('is_active', true);

        stats[buildingId] = {
          floorsCount: floorsData?.length || 0,
          apartmentsCount: apartmentsData?.length || 0,
          availableApartments: apartmentsData?.filter(a => a.status === 'available').length || 0,
          soldApartments: apartmentsData?.filter(a => a.status === 'sold').length || 0,
          reservedApartments: apartmentsData?.filter(a => a.status === 'reserved').length || 0,
          totalTasks: tasksData?.length || 0,
          completedTasks: tasksData?.filter(t => t.status === 'completed').length || 0,
          pendingTasks: tasksData?.filter(t => t.status !== 'completed').length || 0
        };
      }
      
      setBuildingStats(stats);
    } catch (error) {
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('שם הבניין הוא שדה חובה');
      return;
    }

    try {
      if (editingBuilding) {
        // Update existing building
        const { error } = await supabase
          .from('buildings')
          .update({
            name: formData.name,
            description: formData.description || null,
            building_number: formData.building_number,
            total_floors: formData.total_floors,
            elevator_count: formData.elevator_count,
            has_parking: formData.has_parking,
            has_storage: formData.has_storage
          })
          .eq('id', editingBuilding.id);

        if (error) {
          toast.error('שגיאה בעדכון הבניין');
          return;
        }

        toast.success('הבניין עודכן בהצלחה');
      } else {
        // Create new building
        const { error } = await supabase
          .from('buildings')
          .insert({
            name: formData.name,
            description: formData.description || null,
            project_id: projectId,
            building_number: formData.building_number,
            total_floors: formData.total_floors,
            elevator_count: formData.elevator_count,
            has_parking: formData.has_parking,
            has_storage: formData.has_storage
          });

        if (error) {
          toast.error('שגיאה ביצירת הבניין');
          return;
        }

        toast.success('הבניין נוצר בהצלחה');
      }

      resetForm();
      fetchProjectAndBuildings();
    } catch (error) {
      toast.error('שגיאה כללית');
    }
  };

  const handleEdit = (building: Building) => {
    setEditingBuilding(building);
    setFormData({
      name: building.name,
      description: building.description || '',
      building_number: building.building_number || 1,
      total_floors: building.total_floors || 1,
      elevator_count: building.elevator_count || 0,
      has_parking: building.has_parking,
      has_storage: building.has_storage
    });
    setShowForm(true);
  };

  const handleDelete = async (buildingId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את הבניין? פעולה זו תמחק גם את כל הקומות והדירות בבניין.')) {
      return;
    }

    try {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('buildings')
        .update({ is_active: false })
        .eq('id', buildingId);

      if (error) {
        toast.error('שגיאה במחיקת הבניין');
        return;
      }

      toast.success('הבניין נמחק בהצלחה');
      fetchProjectAndBuildings();
    } catch (error) {
      toast.error('שגיאה כללית');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      building_number: 1,
      total_floors: 1,
      elevator_count: 0,
      has_parking: false,
      has_storage: false
    });
    setEditingBuilding(null);
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
        <span className="text-gray-900 font-medium">
          {project?.name} - בניינים
        </span>
      </nav>

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            בניינים בפרויקט: {project?.name}
          </h1>
          {project?.description && (
            <p className="text-gray-600">{project.description}</p>
          )}
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
        >
          <Plus className="h-5 w-5" />
          הוסף בניין
        </button>
      </div>

      {/* Buildings List */}
      {buildings.length === 0 && !showForm ? (
        <div className="text-center py-12">
          <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">אין בניינים בפרויקט</h3>
          <p className="text-gray-500 mb-4">התחל בהוספת הבניין הראשון</p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto transition-colors"
          >
            <Plus className="h-5 w-5" />
            הוסף בניין
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {buildings.map((building) => {
            const stats = buildingStats[building.id] || {};
            return (
              <div key={building.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200">
                {/* Header */}
                <div className="p-6 border-b border-gray-100">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Building2 className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg">{building.name}</h3>
                        <span className="text-sm text-gray-500">
                          בניין מספר {building.building_number || 'לא צוין'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(building)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="ערוך בניין"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedBuilding(building);
                          setShowTasksModal(true);
                        }}
                        className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        title="ניהול משימות"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(building.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="מחק בניין"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {building.description && (
                    <p className="text-gray-600 text-sm">{building.description}</p>
                  )}
                </div>

                {/* Statistics */}
                <div className="p-4 bg-gray-50">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Layers className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium text-gray-700">קומות</span>
                      </div>
                      <div className="text-lg font-bold text-blue-600">
                        {stats.floorsCount || building.total_floors || 0}
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Home className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium text-gray-700">דירות</span>
                      </div>
                      <div className="text-lg font-bold text-green-600">
                        {stats.apartmentsCount || building.total_units || 0}
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <CheckCircle className="h-4 w-4 text-orange-500" />
                        <span className="text-sm font-medium text-gray-700">משימות</span>
                      </div>
                      <div className="text-lg font-bold text-orange-600">
                        {stats.totalTasks || 0}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="p-4 space-y-3">
                  {/* Sales Statistics */}
                  {stats.apartmentsCount > 0 && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <h4 className="font-medium text-blue-900 text-sm mb-2">סטטוס מכירות</h4>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center">
                          <div className="font-bold text-green-600">{stats.availableApartments || 0}</div>
                          <div className="text-green-700">זמינות</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-orange-600">{stats.reservedApartments || 0}</div>
                          <div className="text-orange-700">שמורות</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-blue-600">{stats.soldApartments || 0}</div>
                          <div className="text-blue-700">נמכרו</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Building Features */}
                  <div className="flex flex-wrap gap-2">
                    {building.elevator_count && building.elevator_count > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                        <Zap className="h-3 w-3" />
                        {building.elevator_count} מעליות
                      </span>
                    )}
                    {building.has_parking && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                        <Car className="h-3 w-3" />
                        חניה
                      </span>
                    )}
                    {building.has_storage && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">
                        <Package className="h-3 w-3" />
                        מחסנים
                      </span>
                    )}
                  </div>

                  {/* Tasks Progress */}
                  {stats.totalTasks > 0 && (
                    <div className="bg-gray-100 p-3 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">התקדמות משימות</span>
                        <span className="text-xs text-gray-600">
                          {stats.completedTasks || 0} / {stats.totalTasks || 0}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${((stats.completedTasks || 0) / (stats.totalTasks || 1)) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="p-4 border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => navigate(`/projects/${projectId}/buildings/${building.id}/floors`)}
                      className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors text-sm"
                    >
                      <Eye className="h-4 w-4" />
                      צפה בקומות
                    </button>
                    <button
                      onClick={() => {
                        setSelectedBuilding(building);
                        setShowTasksModal(true);
                      }}
                      className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 flex items-center justify-center gap-2 transition-colors text-sm"
                    >
                      <Settings className="h-4 w-4" />
                      ניהול
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">
                {editingBuilding ? 'ערוך בניין' : 'הוסף בניין חדש'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    שם הבניין
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="הכנס שם הבניין"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    מספר בניין
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.building_number}
                    onChange={(e) => setFormData({ ...formData, building_number: parseInt(e.target.value) || 1 })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    תיאור הבניין
                  </label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="תיאור כללי של הבניין..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      מספר קומות
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.total_floors}
                      onChange={(e) => setFormData({ ...formData, total_floors: parseInt(e.target.value) || 1 })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      מספר מעליות
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.elevator_count}
                      onChange={(e) => setFormData({ ...formData, elevator_count: parseInt(e.target.value) || 0 })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="has_parking"
                      checked={formData.has_parking}
                      onChange={(e) => setFormData({ ...formData, has_parking: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="has_parking" className="mr-2 block text-sm font-medium text-gray-700">
                      יש חניה
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="has_storage"
                      checked={formData.has_storage}
                      onChange={(e) => setFormData({ ...formData, has_storage: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="has_storage" className="mr-2 block text-sm font-medium text-gray-700">
                      יש מחסנים
                    </label>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editingBuilding ? 'עדכן' : 'הוסף'}
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

      {/* Building Tasks Modal */}
      {showTasksModal && selectedBuilding && (
        <UnitTasksModal
          isOpen={showTasksModal}
          onClose={() => {
            setShowTasksModal(false);
            setSelectedBuilding(null);
          }}
          unit={{
            id: selectedBuilding.id,
            apartment_number: selectedBuilding.name,
            type: 'building'
          }}
          building={selectedBuilding}
          project={project}
        />
      )}
    </div>
  );
}; 