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
import { BuildingFormModal } from '../components/buildings';

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

export const Buildings: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showBuildingForm, setShowBuildingForm] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [buildingStats, setBuildingStats] = useState<{ [key: string]: any }>({});
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);

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
      // Get apartment counts and statuses for each building
      const stats: { [key: string]: any } = {};

      for (const buildingId of buildingIds) {
        // Get floors count
        const { data: floorsData } = await supabase
          .from('floors')
          .select('id')
          .eq('building_id', buildingId)
          .eq('is_active', true);

        // Get apartments count and statuses
        const { data: apartmentsData } = await supabase
          .from('apartments')
          .select('status')
          .eq('floor_id', 'IN', `(${floorsData?.map(f => `'${f.id}'`).join(',') || "''"})`)
          .eq('is_active', true);

        // Get tasks count
        const { data: tasksData } = await supabase
          .from('tasks')
          .select('status')
          .eq('building_id', buildingId)
          .eq('is_active', true);

        stats[buildingId] = {
          floors_count: floorsData?.length || 0,
          apartments_count: apartmentsData?.length || 0,
          available_apartments: apartmentsData?.filter(a => a.status === 'available').length || 0,
          sold_apartments: apartmentsData?.filter(a => a.status === 'sold').length || 0,
          reserved_apartments: apartmentsData?.filter(a => a.status === 'reserved').length || 0,
          total_tasks: tasksData?.length || 0,
          completed_tasks: tasksData?.filter(t => t.status === 'completed').length || 0
        };
      }

      setBuildingStats(stats);
    } catch (error) {
      console.error('Error loading building stats:', error);
    }
  };

  const handleEdit = (building: Building) => {
    setEditingBuilding(building);
    setShowBuildingForm(true);
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

  const handleBuildingFormClose = () => {
    setEditingBuilding(null);
    setShowBuildingForm(false);
  };

  const handleViewFloors = (buildingId: string) => {
    navigate(`/projects/${projectId}/buildings/${buildingId}/floors`);
  };

  const handleManageTasks = (building: Building) => {
    setSelectedBuilding(building);
    setShowTasksModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">טוען...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-600 mb-4">
          <Home className="h-4 w-4" />
          <ChevronRight className="h-4 w-4" />
          <span>פרויקטים</span>
          <ChevronRight className="h-4 w-4" />
          <span>{project?.name}</span>
          <ChevronRight className="h-4 w-4" />
          <span className="text-gray-900 font-medium">בניינים</span>
        </nav>

        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">בניינים</h1>
            <p className="text-gray-600 mt-1">
              ניהול בניינים בפרויקט {project?.name}
            </p>
          </div>
          <button
            onClick={() => setShowBuildingForm(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            הוסף בניין
          </button>
        </div>
      </div>

      {/* Buildings List */}
      {buildings.length === 0 && !showBuildingForm ? (
        <div className="text-center py-12">
          <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">אין בניינים בפרויקט</h3>
          <p className="text-gray-500 mb-4">התחל בהוספת הבניין הראשון</p>
          <button
            onClick={() => setShowBuildingForm(true)}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            הוסף בניין
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {buildings.map((building) => {
            const stats = buildingStats[building.id] || {};
            return (
              <div
                key={building.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  {/* Building Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{building.name}</h3>
                      {building.description && (
                        <p className="text-sm text-gray-600 mt-1">{building.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(building)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="ערוך בניין"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(building.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="מחק בניין"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Building Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Layers className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">קומות</span>
                      </div>
                      <p className="text-xl font-bold text-blue-600">{building.total_floors || 0}</p>
                    </div>
                    
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Home className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-900">דירות</span>
                      </div>
                      <p className="text-xl font-bold text-green-600">{building.total_units || 0}</p>
                    </div>
                  </div>

                  {/* Building Features */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {building.elevator_count && building.elevator_count > 0 && (
                      <div className="flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">
                        <Zap className="h-3 w-3" />
                        <span>{building.elevator_count} מעליות</span>
                      </div>
                    )}
                    {building.has_parking && (
                      <div className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">
                        <Car className="h-3 w-3" />
                        <span>חניה</span>
                      </div>
                    )}
                    {building.has_storage && (
                      <div className="flex items-center gap-1 bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs">
                        <Package className="h-3 w-3" />
                        <span>מחסנים</span>
                      </div>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {stats.total_tasks > 0 && (
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>התקדמות משימות</span>
                        <span>{Math.round((stats.completed_tasks / stats.total_tasks) * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(stats.completed_tasks / stats.total_tasks) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewFloors(building.id)}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      <Eye className="h-4 w-4" />
                      צפה בקומות
                    </button>
                    <button
                      onClick={() => handleManageTasks(building)}
                      className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                    >
                      <Settings className="h-4 w-4" />
                      משימות
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Building Form Modal */}
      <BuildingFormModal
        isOpen={showBuildingForm}
        onClose={handleBuildingFormClose}
        projectId={projectId!}
        onSuccess={fetchProjectAndBuildings}
        building={editingBuilding}
      />

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