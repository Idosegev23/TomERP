import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Home, Search, Filter, Plus, Eye, Edit, Trash2, Building2, MapPin, Layers, Building, CheckSquare, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface Project {
  id: string;
  name: string;
  description?: string;
  city?: string;
  neighborhood?: string;
}

interface Apartment {
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
  status: string;
  floor?: {
    id: string;
    floor_number: number;
    building?: {
      id: string;
      name: string;
    };
  };
}

export const ProjectApartments: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [filteredApartments, setFilteredApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    if (projectId) {
      fetchProjectAndApartments();
    }
  }, [projectId]);

  useEffect(() => {
    filterApartments();
  }, [apartments, searchTerm, statusFilter, typeFilter]);

  const fetchProjectAndApartments = async () => {
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

      // Fetch all apartments in this project
      const { data: apartmentsData, error: apartmentsError } = await supabase
        .from('apartments')
        .select(`
          *,
          floor:floors!inner (
            id,
            floor_number,
            building:buildings!inner (
              id,
              name,
              project_id
            )
          )
        `)
        .eq('floor.building.project_id', projectId)
        .order('apartment_number', { ascending: true });

      if (apartmentsError) throw apartmentsError;
      setApartments(apartmentsData || []);

    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  };

  const filterApartments = () => {
    let filtered = [...apartments];

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(apt => 
        apt.apartment_number.toLowerCase().includes(searchLower) ||
        apt.apartment_type.toLowerCase().includes(searchLower) ||
        apt.position?.toLowerCase().includes(searchLower) ||
        apt.floor?.building?.name?.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(apt => apt.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(apt => apt.apartment_type === typeFilter);
    }

    setFilteredApartments(filtered);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available': return 'זמינה';
      case 'reserved': return 'שמורה';
      case 'sold': return 'נמכרה';
      case 'unavailable': return 'לא זמינה';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800 border-green-200';
      case 'reserved': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'sold': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'unavailable': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeLabel = (type: string) => {
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

  const navigateToApartment = (apartment: Apartment) => {
    if (apartment.floor?.building?.id && apartment.floor?.id) {
      navigate(`/projects/${projectId}/buildings/${apartment.floor.building.id}/floors/${apartment.floor.id}/apartments`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">טוען דירות...</p>
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
        <span className="text-gray-900 font-medium">כל הדירות</span>
      </div>

      {/* Page Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Home className="h-6 w-6 text-blue-600" />
              כל הדירות - {project?.name}
            </h1>
            <p className="text-gray-600 mt-1">
              {project?.city && project?.neighborhood && `${project.city}, ${project.neighborhood}`}
            </p>
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
              <span>סה"כ דירות: {apartments.length}</span>
              <span>מוצגות: {filteredApartments.length}</span>
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
            className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium"
          >
            <Home className="h-4 w-4" />
            דירות
          </button>
          <button
            onClick={() => navigate(`/projects/${projectId}/floors`)}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Layers className="h-4 w-4" />
            קומות
          </button>
          <button
            onClick={() => navigate(`/projects/${projectId}/buildings`)}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Building2 className="h-4 w-4" />
            בניינים
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">חיפוש</label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="חיפוש דירה, בניין..."
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

          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setTypeFilter('all');
              }}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              נקה סינון
            </button>
          </div>
        </div>
      </div>

      {/* Apartments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredApartments.map((apartment) => (
          <div key={apartment.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">
                    דירה {apartment.apartment_number}
                  </h3>
                  <span className="text-sm text-gray-500">
                    {getTypeLabel(apartment.apartment_type)}
                  </span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(apartment.status)}`}>
                  {getStatusLabel(apartment.status)}
                </span>
              </div>

              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span>{apartment.floor?.building?.name} - קומה {apartment.floor?.floor_number}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>שטח: {apartment.built_area} מ"ר</span>
                </div>
                {apartment.room_count && (
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4" />
                    <span>חדרים: {apartment.room_count}</span>
                  </div>
                )}
                {apartment.marketing_price && (
                  <div className="flex items-center gap-2 font-medium text-blue-600">
                    <span>מחיר: {apartment.marketing_price.toLocaleString()} ₪</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => navigateToApartment(apartment)}
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

      {filteredApartments.length === 0 && !loading && (
        <div className="text-center py-12">
          <Home className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' 
              ? 'לא נמצאו דירות התואמות לחיפוש'
              : 'אין דירות בפרויקט זה'}
          </h3>
          <p className="text-gray-500">
            {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
              ? 'נסה לשנות את קריטריוני החיפוש'
              : 'התחל על ידי הוספת בניינים וקומות לפרויקט'}
          </p>
        </div>
      )}
    </div>
  );
};

export default ProjectApartments;
