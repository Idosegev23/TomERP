import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Layers, Building2, Home, Search, Plus, Eye, Edit, Trash2, FileText, CheckSquare, Building } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface Project {
  id: string;
  name: string;
  description?: string;
  city?: string;
  neighborhood?: string;
}

interface Floor {
  id: string;
  name?: string;
  floor_number: number;
  total_units: number;
  floor_plan_url?: string;
  completion_percentage?: number;
  construction_stage?: string;
  description?: string;
  technical_notes?: string;
  building: {
    id: string;
    name: string;
  };
  apartments_count?: number;
  documents_count?: number;
  tasks_count?: number;
}

export const ProjectFloors: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [filteredFloors, setFilteredFloors] = useState<Floor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [buildingFilter, setBuildingFilter] = useState<string>('all');

  useEffect(() => {
    if (projectId) {
      fetchProjectAndFloors();
    }
  }, [projectId]);

  useEffect(() => {
    filterFloors();
  }, [floors, searchTerm, buildingFilter]);

  const fetchProjectAndFloors = async () => {
    try {
      setLoading(true);

      // Fetch project details
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, name, description, city, neighborhood')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      // Fetch all floors in this project
      const { data: floorsData, error: floorsError } = await supabase
        .from('floors')
        .select(`
          id,
          name,
          floor_number,
          total_units,
          floor_plan_url,
          completion_percentage,
          construction_stage,
          description,
          technical_notes,
          building:buildings!inner (
            id,
            name,
            project_id
          )
        `)
        .eq('building.project_id', projectId)
        .eq('is_active', true)
        .order('floor_number', { ascending: true });

      if (floorsError) throw floorsError;

      // Get counts for each floor
      const floorsWithCounts = await Promise.all(
        (floorsData || []).map(async (floor) => {
          // Count apartments
          const { count: apartmentsCount } = await supabase
            .from('apartments')
            .select('*', { count: 'exact', head: true })
            .eq('floor_id', floor.id)
            .eq('is_active', true);

          // Count documents
          const { count: documentsCount } = await supabase
            .from('files')
            .select('*', { count: 'exact', head: true })
            .eq('floor_id', floor.id)
            .eq('is_active', true);

          // Count tasks
          const { count: tasksCount } = await supabase
            .from('floor_tasks')
            .select('*', { count: 'exact', head: true })
            .eq('floor_id', floor.id);

          return {
            ...floor,
            building: Array.isArray(floor.building) ? floor.building[0] : floor.building,
            apartments_count: apartmentsCount || 0,
            documents_count: documentsCount || 0,
            tasks_count: tasksCount || 0
          } as Floor;
        })
      );

      setFloors(floorsWithCounts);

    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  };

  const filterFloors = () => {
    let filtered = [...floors];

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(floor => 
        floor.floor_number.toString().includes(searchLower) ||
        floor.name?.toLowerCase().includes(searchLower) ||
        floor.building.name.toLowerCase().includes(searchLower) ||
        floor.description?.toLowerCase().includes(searchLower)
      );
    }

    // Building filter
    if (buildingFilter !== 'all') {
      filtered = filtered.filter(floor => floor.building.id === buildingFilter);
    }

    setFilteredFloors(filtered);
  };

  const getConstructionStageLabel = (stage?: string) => {
    switch (stage) {
      case 'planning': return 'תכנון';
      case 'foundation': return 'יסודות';
      case 'structure': return 'שלד';
      case 'finishing': return 'גמר';
      case 'completed': return 'הושלם';
      default: return stage || 'לא צוין';
    }
  };

  const getConstructionStageColor = (stage?: string) => {
    switch (stage) {
      case 'planning': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'foundation': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'structure': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'finishing': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const navigateToFloor = (floor: Floor) => {
    navigate(`/projects/${projectId}/buildings/${floor.building.id}/floors/${floor.id}/apartments`);
  };

  const uniqueBuildings = floors.reduce((acc, floor) => {
    if (!acc.find(b => b.id === floor.building.id)) {
      acc.push(floor.building);
    }
    return acc;
  }, [] as Array<{ id: string; name: string }>);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">טוען קומות...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6" dir="rtl">
      {/* Header with breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
        <button 
          onClick={() => navigate('/projects')} 
          className="hover:text-blue-600 transition-colors"
        >
          פרויקטים
        </button>
        <ArrowRight className="h-4 w-4" />
        <button 
          onClick={() => navigate(`/projects/${projectId}`)} 
          className="hover:text-blue-600 transition-colors"
        >
          {project?.name}
        </button>
        <ArrowRight className="h-4 w-4" />
        <span className="text-gray-900 font-medium">כל הקומות</span>
      </div>

      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Layers className="h-6 w-6 text-blue-600" />
              כל הקומות - {project?.name}
            </h1>
            <p className="text-gray-600 mt-1">
              {project?.city && project?.neighborhood && `${project.city}, ${project.neighborhood}`}
            </p>
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
              <span>סה"כ קומות: {floors.length}</span>
              <span>מוצגות: {filteredFloors.length}</span>
              <span>סה"כ דירות: {floors.reduce((sum, floor) => sum + (floor.apartments_count || 0), 0)}</span>
            </div>
          </div>
          
          <button
            onClick={() => navigate(`/projects/${projectId}`)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Building2 className="h-4 w-4" />
            חזרה לפרויקט
          </button>
        </div>
      </div>

      {/* Context Switcher */}
      <div className="bg-white rounded-lg shadow-sm p-1 mb-6">
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate(`/projects/${projectId}`)}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Building2 className="h-4 w-4" />
            כללי
          </button>
          <button
            onClick={() => navigate(`/projects/${projectId}/apartments`)}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Home className="h-4 w-4" />
            דירות
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium"
          >
            <Layers className="h-4 w-4" />
            קומות
          </button>
          <button
            onClick={() => navigate(`/projects/${projectId}/buildings`)}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Building className="h-4 w-4" />
            בניינים
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">חיפוש</label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="חיפוש קומה, בניין..."
                className="w-full pr-10 pl-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">בניין</label>
            <select
              value={buildingFilter}
              onChange={(e) => setBuildingFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">כל הבניינים</option>
              {uniqueBuildings.map((building) => (
                <option key={building.id} value={building.id}>{building.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setBuildingFilter('all');
              }}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              נקה סינון
            </button>
          </div>
        </div>
      </div>

      {/* Floors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFloors.map((floor) => (
          <div key={floor.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">
                    קומה {floor.floor_number}
                  </h3>
                  <span className="text-sm text-gray-500">
                    {floor.building.name}
                  </span>
                </div>
                {floor.construction_stage && (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getConstructionStageColor(floor.construction_stage)}`}>
                    {getConstructionStageLabel(floor.construction_stage)}
                  </span>
                )}
              </div>

              {floor.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{floor.description}</p>
              )}

              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div className="flex justify-between">
                  <span>דירות:</span>
                  <span className="font-medium">{floor.apartments_count || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>מסמכים:</span>
                  <span className="font-medium">{floor.documents_count || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>משימות:</span>
                  <span className="font-medium">{floor.tasks_count || 0}</span>
                </div>
                {floor.completion_percentage !== undefined && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span>התקדמות</span>
                      <span>{floor.completion_percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${floor.completion_percentage}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => navigateToFloor(floor)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <Eye className="h-4 w-4" />
                  צפייה
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredFloors.length === 0 && !loading && (
        <div className="text-center py-12">
          <Layers className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || buildingFilter !== 'all' 
              ? 'לא נמצאו קומות התואמות לחיפוש'
              : 'אין קומות בפרויקט זה'}
          </h3>
          <p className="text-gray-500">
            {searchTerm || buildingFilter !== 'all'
              ? 'נסה לשנות את קריטריוני החיפוש'
              : 'התחל על ידי הוספת בניינים וקומות לפרויקט'}
          </p>
        </div>
      )}
    </div>
  );
};

export default ProjectFloors;
