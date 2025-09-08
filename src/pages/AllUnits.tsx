import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Home, Search, Filter, Building, Layers, MapPin, TrendingUp, Eye, Edit, Trash2, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../components/auth/AuthContext';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import toast from 'react-hot-toast';

interface Unit {
  id: string;
  apartment_number: string;
  apartment_type: string;
  room_count?: number;
  built_area: number;
  garden_balcony_area?: number;
  total_area: number;
  directions?: string[];
  position?: string;
  parking_spots?: number;
  storage_rooms?: number;
  marketing_price?: number;
  linear_price?: number;
  payment_plan_20_80_price?: number;
  status: string;
  sales_agent_id?: string;
  reserved_until?: string;
  sold_date?: string;
  primary_contact_name?: string;
  primary_contact_phone?: string;
  primary_contact_email?: string;
  notes?: string;
  special_features?: string[];
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  floors?: {
    id: string;
    floor_number: number;
    buildings?: {
      id: string;
      name: string;
      projects?: {
        id: string;
        name: string;
      };
    };
  };
}

interface Project {
  id: string;
  name: string;
  city?: string;
  neighborhood?: string;
  total_units?: number;
}

export const AllUnits: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { hasAccess } = useAuth();
  
  const [units, setUnits] = useState<Unit[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // View mode: 'all' for all units, 'by-project' for grouped by project
  const [viewMode, setViewMode] = useState<'all' | 'by-project'>('all');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterUnits();
  }, [units, searchTerm, statusFilter, typeFilter, selectedProject, viewMode]);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Fetch all units with their hierarchy
      const { data: unitsData, error: unitsError } = await supabase
        .from('apartments')
        .select(`
          *,
          floors!inner (
            id,
            floor_number,
            buildings!inner (
              id,
              name,
              projects!inner (
                id,
                name
              )
            )
          )
        `)
        .eq('is_active', true)
        .order('apartment_number', { ascending: true });

      if (unitsError) throw unitsError;

      // Fetch projects summary
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          id,
          name,
          city,
          neighborhood,
          buildings!inner (
            apartments(count)
          )
        `)
        .order('name');

      if (projectsError) throw projectsError;

      // Process projects data to include unit counts
      const processedProjects = projectsData?.map(project => ({
        ...project,
        total_units: project.buildings?.reduce((sum: number, building: any) => 
          sum + (building.apartments?.[0]?.count || 0), 0) || 0
      })) || [];

      setUnits(unitsData || []);
      setProjects(processedProjects);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('שגיאה בטעינת הנתונים');
    } finally {
      setIsLoading(false);
    }
  };

  const filterUnits = () => {
    let filtered = [...units];

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(unit => 
        unit.apartment_number.toLowerCase().includes(searchLower) ||
        unit.apartment_type.toLowerCase().includes(searchLower) ||
        unit.position?.toLowerCase().includes(searchLower) ||
        unit.floors?.buildings?.name?.toLowerCase().includes(searchLower) ||
        unit.floors?.buildings?.projects?.name?.toLowerCase().includes(searchLower) ||
        unit.primary_contact_name?.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(unit => unit.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(unit => unit.apartment_type === typeFilter);
    }

    // Project filter (for by-project view)
    if (viewMode === 'by-project' && selectedProject !== 'all') {
      filtered = filtered.filter(unit => unit.floors?.buildings?.projects?.id === selectedProject);
    }

    setFilteredUnits(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'reserved': return 'bg-yellow-100 text-yellow-800';
      case 'sold': return 'bg-blue-100 text-blue-800';
      case 'unavailable': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available': return 'זמינה';
      case 'reserved': return 'שמורה';
      case 'sold': return 'נמכרה';
      case 'unavailable': return 'לא זמינה';
      case 'pending': return 'בהמתנה';
      default: return status;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'studio': return 'סטודיו';
      case 'one_room': return '1 חדר';
      case 'two_room': return '2 חדרים';
      case 'three_room': return '3 חדרים';
      case 'four_room': return '4 חדרים';
      case 'five_room': return '5 חדרים';
      case 'six_plus_room': return '6+ חדרים';
      case 'penthouse': return 'פנטהאוז';
      case 'duplex': return 'דופלקס';
      case 'garden': return 'דירת גן';
      case 'ground_floor': return 'דירת קרקע';
      case 'mini_penthouse': return 'מיני פנטהאוז';
      default: return type;
    }
  };

  const formatPrice = (price: number) => {
    if (!price) return 'לא צוין';
    return new Intl.NumberFormat('he-IL', { 
      style: 'currency', 
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const navigateToUnit = (unit: Unit) => {
    const projectId = unit.floors?.buildings?.projects?.id;
    const buildingId = unit.floors?.buildings?.id;
    const floorId = unit.floors?.id;
    
    if (projectId && buildingId && floorId && hasAccess('apartments')) {
      const navigationPath = `/projects/${projectId}/buildings/${buildingId}/floors/${floorId}/apartments`;
      toast.success(`מתנווט לדירה ${unit.apartment_number} בקומה ${unit.floors?.floor_number}`);
      navigate(navigationPath);
    } else if (projectId) {
      const navigationPath = `/projects/${projectId}`;
      toast.success(`מתנווט לפרטי הפרויקט ${unit.floors?.buildings?.projects?.name}`);
      navigate(navigationPath);
    } else {
      toast.error('שגיאה בניווט - לא נמצאו פרטי הפרויקט');
    }
  };

  const groupUnitsByProject = () => {
    const grouped = filteredUnits.reduce((acc, unit) => {
      const projectId = unit.floors?.buildings?.projects?.id || 'unknown';
      const projectName = unit.floors?.buildings?.projects?.name || 'פרויקט לא ידוע';
      
      if (!acc[projectId]) {
        acc[projectId] = {
          project: { id: projectId, name: projectName },
          units: []
        };
      }
      acc[projectId].units.push(unit);
      return acc;
    }, {} as Record<string, { project: { id: string; name: string }; units: Unit[] }>);

    return Object.values(grouped);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">טוען דירות...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6" dir="rtl">
      {/* Breadcrumbs */}
      <Breadcrumbs />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">כל הדירות במערכת</h1>
          <p className="text-gray-600">תצוגה מאוחדת של כל הדירות בכל הפרויקטים</p>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
            <span>סה"כ דירות: {units.length}</span>
            <span>מוצגות: {filteredUnits.length}</span>
            <span>פרויקטים: {projects.length}</span>
          </div>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="bg-white rounded-lg shadow-sm p-1 mb-6">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'all' 
                ? 'bg-blue-100 text-blue-700 font-medium' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Home className="h-4 w-4" />
            תצוגת כל הדירות
          </button>
          <button
            onClick={() => setViewMode('by-project')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'by-project' 
                ? 'bg-blue-100 text-blue-700 font-medium' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Building className="h-4 w-4" />
            תצוגה לפי פרויקט
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">חיפוש</label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="חיפוש דירה, פרויקט..."
                className="w-full pr-10 pl-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">סטטוס</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">כל הסטטוסים</option>
              <option value="available">זמינה</option>
              <option value="reserved">שמורה</option>
              <option value="sold">נמכרה</option>
              <option value="unavailable">לא זמינה</option>
              <option value="pending">בהמתנה</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">סוג דירה</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">כל הסוגים</option>
              <option value="studio">סטודיו</option>
              <option value="one_room">1 חדר</option>
              <option value="two_room">2 חדרים</option>
              <option value="three_room">3 חדרים</option>
              <option value="four_room">4 חדרים</option>
              <option value="five_room">5 חדרים</option>
              <option value="six_plus_room">6+ חדרים</option>
              <option value="penthouse">פנטהאוז</option>
              <option value="duplex">דופלקס</option>
              <option value="garden">דירת גן</option>
              <option value="ground_floor">דירת קרקע</option>
              <option value="mini_penthouse">מיני פנטהאוז</option>
            </select>
          </div>

          {viewMode === 'by-project' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">פרויקט</label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">כל הפרויקטים</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name} ({project.total_units} דירות)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setTypeFilter('all');
                setSelectedProject('all');
              }}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              נקה סינון
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'all' ? (
        // All Units View
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredUnits.map((unit) => (
            <div key={unit.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">
                      דירה {unit.apartment_number}
                    </h3>
                    <span className="text-sm text-gray-500">
                      {getTypeText(unit.apartment_type)}
                    </span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(unit.status)}`}>
                    {getStatusText(unit.status)}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    <span>{unit.floors?.buildings?.projects?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    <span>{unit.floors?.buildings?.name} - קומה {unit.floors?.floor_number}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>שטח: {unit.built_area} מ"ר</span>
                  </div>
                  {unit.room_count && (
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      <span>חדרים: {unit.room_count}</span>
                    </div>
                  )}
                  {unit.marketing_price && (
                    <div className="flex items-center gap-2 font-medium text-blue-600">
                      <span>מחיר: {formatPrice(unit.marketing_price)}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => navigateToUnit(unit)}
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
      ) : (
        // By Project View
        <div className="space-y-6">
          {groupUnitsByProject().map(({ project, units }) => (
            <div key={project.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building className="h-6 w-6 text-blue-600" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                      <p className="text-sm text-gray-600">{units.length} דירות</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/projects/${project.id}`)}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
                  >
                    <Eye className="h-4 w-4" />
                    צפייה בפרויקט
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {units.map((unit) => (
                    <div key={unit.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium text-gray-900">דירה {unit.apartment_number}</h4>
                          <span className="text-sm text-gray-500">{getTypeText(unit.apartment_type)}</span>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(unit.status)}`}>
                          {getStatusText(unit.status)}
                        </span>
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-600 mb-3">
                        <div>קומה {unit.floors?.floor_number} • {unit.built_area} מ"ר</div>
                        {unit.marketing_price && (
                          <div className="font-medium text-blue-600">{formatPrice(unit.marketing_price)}</div>
                        )}
                      </div>

                      <button
                        onClick={() => navigateToUnit(unit)}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                      >
                        <Eye className="h-4 w-4" />
                        צפייה
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredUnits.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <Home className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || selectedProject !== 'all'
              ? 'לא נמצאו דירות התואמות לחיפוש'
              : 'אין דירות במערכת'}
          </h3>
          <p className="text-gray-500">
            {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || selectedProject !== 'all'
              ? 'נסה לשנות את קריטריוני החיפוש'
              : 'התחל על ידי יצירת פרויקטים ודירות'}
          </p>
        </div>
      )}
    </div>
  );
};

export default AllUnits;
