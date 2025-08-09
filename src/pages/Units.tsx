import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Home, 
  Search, 
  Filter,
  Plus,
  Building,
  MapPin,
  ChevronRight,
  Eye,
  Edit,
  DollarSign,
  Calendar,
  User,
  ArrowUpDown
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '../components/ui';
import { useAuth } from '../components/auth/AuthContext';
import toast from 'react-hot-toast';

interface Unit {
  id: string;
  apartment_number: string;
  apartment_type: string;
  status: string;
  built_area: number;
  garden_balcony_area?: number;
  total_area: number;
  marketing_price?: number;
  linear_price?: number;
  room_count?: number;
  directions?: string[];
  position?: string;
  parking_spots?: number;
  storage_rooms?: number;
  primary_contact_name?: string;
  primary_contact_phone?: string;
  floors: any;
}

interface FilterOptions {
  status: string;
  type: string;
  projectId: string;
  minPrice: string;
  maxPrice: string;
  minRooms: string;
  maxRooms: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export const Units: React.FC = () => {
  const navigate = useNavigate();
  const { hasAccess } = useAuth();
  const [units, setUnits] = useState<Unit[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    status: '',
    type: '',
    projectId: '',
    minPrice: '',
    maxPrice: '',
    minRooms: '',
    maxRooms: '',
    sortBy: 'apartment_number',
    sortOrder: 'asc'
  });

  useEffect(() => {
    fetchUnits();
    fetchProjects();
  }, [filters, searchTerm]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
    }
  };

  const fetchUnits = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('apartments')
        .select(`
          id,
          apartment_number,
          apartment_type,
          status,
          built_area,
          garden_balcony_area,
          total_area,
          marketing_price,
          linear_price,
          room_count,
          directions,
          position,
          parking_spots,
          storage_rooms,
          primary_contact_name,
          primary_contact_phone,
          floors:floor_id (
            id,
            floor_number,
            buildings:building_id (
              id,
              name,
              projects:project_id (
                id,
                name
              )
            )
          )
        `)
        .eq('is_active', true);

      // Apply search filter
      if (searchTerm) {
        query = query.or(`apartment_number.ilike.%${searchTerm}%,apartment_type.ilike.%${searchTerm}%,primary_contact_name.ilike.%${searchTerm}%`);
      }

      // Apply status filter
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      // Apply type filter
      if (filters.type) {
        query = query.eq('apartment_type', filters.type);
      }

      // Apply price range filters
      if (filters.minPrice) {
        query = query.gte('marketing_price', parseInt(filters.minPrice));
      }
      if (filters.maxPrice) {
        query = query.lte('marketing_price', parseInt(filters.maxPrice));
      }

      // Apply rooms filter
      if (filters.minRooms) {
        query = query.gte('room_count', parseInt(filters.minRooms));
      }
      if (filters.maxRooms) {
        query = query.lte('room_count', parseInt(filters.maxRooms));
      }

      // Apply project filter at database level
      if (filters.projectId) {
        query = query.eq('floors.buildings.projects.id', filters.projectId);
      }

      // Apply sorting
      const isAsc = filters.sortOrder === 'asc';
      switch (filters.sortBy) {
        case 'price':
          query = query.order('marketing_price', { ascending: isAsc });
          break;
        case 'rooms':
          query = query.order('room_count', { ascending: isAsc });
          break;
        case 'area':
          query = query.order('built_area', { ascending: isAsc });
          break;
        default:
          query = query.order('apartment_number', { ascending: isAsc });
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;

      setUnits(data || []);
    } catch (error) {
      toast.error('שגיאה בטעינת הדירות');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (key: keyof FilterOptions, value: string | 'asc' | 'desc') => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      type: '',
      projectId: '',
      minPrice: '',
      maxPrice: '',
      minRooms: '',
      maxRooms: '',
      sortBy: 'apartment_number',
      sortOrder: 'asc'
    });
    setSearchTerm('');
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
      // Navigate directly to the specific apartment's floor page
      const navigationPath = `/projects/${projectId}/buildings/${buildingId}/floors/${floorId}/apartments`;
      toast.success(`מתנווט לדירה ${unit.apartment_number} בקומה ${unit.floors?.floor_number}`);
      navigate(navigationPath);
    } else if (projectId) {
      // Fallback to project details if we don't have full hierarchy
      const navigationPath = `/projects/${projectId}`;
      toast.success(`מתנווט לפרטי הפרויקט ${unit.floors?.buildings?.projects?.name}`);
      navigate(navigationPath);
    } else {
      toast.error('שגיאה בניווט - לא נמצאו פרטי הפרויקט');
    }
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
        <span className="text-gray-900 font-medium">כל הדירות</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">כל הדירות במערכת</h1>
          <p className="text-gray-600">רשימת כל הדירות מכל הפרויקטים</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
              showFilters ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Filter className="h-4 w-4" />
            סינון
          </button>
          <span className="text-sm text-gray-500 py-2">
            נמצאו {units.length} דירות
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="h-5 w-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="חפש לפי מספר דירה או סוג..."
          className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="mb-6">
          <CardHeader>
            <h3 className="text-lg font-semibold">סינון מתקדם</h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">סטטוס</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">כל הסטטוסים</option>
                  <option value="available">זמינה</option>
                  <option value="reserved">שמורה</option>
                  <option value="sold">נמכרה</option>
                  <option value="unavailable">לא זמינה</option>
                  <option value="pending">בהמתנה</option>
                </select>
              </div>

              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">סוג דירה</label>
                <select
                  value={filters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">כל הסוגים</option>
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
                  <option value="mini_penthouse">מיני פנטהאוז</option>
                </select>
              </div>

              {/* Project Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">פרויקט</label>
                <select
                  value={filters.projectId}
                  onChange={(e) => handleFilterChange('projectId', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">כל הפרויקטים</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">מיון לפי</label>
                <div className="flex gap-2">
                  <select
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="apartment_number">מספר דירה</option>
                    <option value="price">מחיר</option>
                    <option value="rooms">חדרים</option>
                    <option value="area">שטח</option>
                  </select>
                  <button
                    onClick={() => handleFilterChange('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Price Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">מחיר מינימלי</label>
                <input
                  type="number"
                  value={filters.minPrice}
                  onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                  placeholder="0"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">מחיר מקסימלי</label>
                <input
                  type="number"
                  value={filters.maxPrice}
                  onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                  placeholder="ללא הגבלה"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Rooms Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">חדרים מינימלי</label>
                <input
                  type="number"
                  value={filters.minRooms}
                  onChange={(e) => handleFilterChange('minRooms', e.target.value)}
                  placeholder="0"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">חדרים מקסימלי</label>
                <input
                  type="number"
                  value={filters.maxRooms}
                  onChange={(e) => handleFilterChange('maxRooms', e.target.value)}
                  placeholder="ללא הגבלה"
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-between items-center mt-6">
              <button
                onClick={clearFilters}
                className="text-gray-600 hover:text-gray-900 text-sm"
              >
                נקה סינונים
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Units Grid */}
      {units.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Home className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">לא נמצאו דירות</h3>
            <p className="text-gray-600">נסה לשנות את הסינונים או החיפוש</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {units.map((unit) => (
            <Card key={unit.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6" onClick={() => navigateToUnit(unit)}>
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      דירה {unit.apartment_number}
                    </h3>
                    <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                      <MapPin className="h-3 w-3" />
                      {unit.floors?.buildings?.projects?.name} - {unit.floors?.buildings?.name}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(unit.status)}`}>
                    {getStatusText(unit.status)}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">סוג:</span>
                    <span className="text-sm font-medium">{getTypeText(unit.apartment_type)}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">קומה:</span>
                    <span className="text-sm font-medium">{unit.floors?.floor_number || 'לא צוין'}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">חדרים:</span>
                    <span className="text-sm font-medium">{unit.room_count || 0} חדרים</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">שטח בנוי:</span>
                    <span className="text-sm font-medium">{unit.built_area} מ"ר</span>
                  </div>

                  {unit.garden_balcony_area && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">מרפסת:</span>
                      <span className="text-sm font-medium">{unit.garden_balcony_area} מ"ר</span>
                    </div>
                  )}

                  {unit.total_area > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">שטח כולל:</span>
                      <span className="text-sm font-medium">{unit.total_area} מ"ר</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">חניות:</span>
                    <span className="text-sm font-medium">{unit.parking_spots || 0}</span>
                  </div>

                  {unit.storage_rooms && unit.storage_rooms > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">מחסנים:</span>
                      <span className="text-sm font-medium">{unit.storage_rooms}</span>
                    </div>
                  )}

                  {unit.primary_contact_name && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">קונה:</span>
                      <span className="text-sm font-medium text-blue-600">{unit.primary_contact_name}</span>
                    </div>
                  )}
                </div>

                {/* Price */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">מחיר שיווקי:</span>
                    <span className="text-lg font-bold text-blue-600">
                      {formatPrice(unit.marketing_price || 0)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 flex justify-between items-center">
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateToUnit(unit);
                      }}
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      <Eye className="h-4 w-4" />
                      צפה בדירה
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const projectId = unit.floors?.buildings?.projects?.id;
                        if (projectId) {
                          toast.success(`מתנווט לפרטי הפרויקט ${unit.floors?.buildings?.projects?.name}`);
                          navigate(`/projects/${projectId}`);
                        }
                      }}
                      className="flex items-center gap-2 text-green-600 hover:text-green-700 text-sm"
                    >
                      <Building className="h-4 w-4" />
                      פרטי פרויקט
                    </button>
                  </div>
                  <span className="text-xs text-gray-500">
                    לחץ לניווט מהיר
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}; 