import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Home, 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  Filter,
  ChevronRight,
  Building2,
  Layers,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Eye,
  Users,
  FileText,
  Image,
  Upload,
  Download,
  X,
  Compass,
  MapPin,
  Car,
  Package,
  DollarSign,
  Phone,
  Mail,
  User,
  Calendar,
  FileImage,
  FileVideo,
  FileSpreadsheet,
  Presentation,
  Settings,
  TrendingUp,
  Calculator
} from 'lucide-react';
import toast from 'react-hot-toast';
import { UnitStatusModal, UnitTasksModal, PricingCalculator } from '../components/units';
import { FileUploadModal } from '../components/files';
import { PricingFactorsModal, ApartmentStatusManager } from '../components/apartments';

interface Apartment {
  id: string;
  floor_id: string;
  apartment_number: string;
  apartment_type: string;
  room_count?: number;
  built_area: number;
  garden_balcony_area?: number;
  total_area: number;
  directions?: string[]; // שונה מ-direction ל-directions array
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
  secondary_contact_name?: string;
  secondary_contact_phone?: string;
  notes?: string;
  special_features?: string[];
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at?: string;
  // הוספת שדות נוספים לתמיכה בדירת גן
  floor?: { floor_number: number; name?: string };
  // שדות למעקב מכירות
  interested_count?: number;
  last_activity_date?: string;
  contract_signed_date?: string;
  down_payment_amount?: number;
  final_price?: number;
  commission_rate?: number;
}

// Interface למקדמי מחיר אקוויוולנטי
interface PricingFactors {
  id: string;
  project_id: string;
  floor_factor: number;
  direction_factor: { [key: string]: number };
  parking_factor: number;
  storage_factor: number;
  balcony_garden_factor: number;
  unit_type_factor: { [key: string]: number };
  room_count_factor: { [key: string]: number };
}

interface ApartmentFile {
  id: string;
  apartment_id: string;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  file_url: string;
  thumbnail_url?: string;
  category?: string;
  tags?: string[];
  description?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
}

interface Floor {
  id: string;
  name: string;
  floor_number: number;
  building_id: string;
}

interface Building {
  id: string;
  name: string;
  project_id: string;
}

interface Project {
  id: string;
  name: string;
}

export const Apartments: React.FC = () => {
  const { projectId, buildingId, floorId } = useParams<{ 
    projectId: string; 
    buildingId: string; 
    floorId: string; 
  }>();
  const navigate = useNavigate();
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [filteredApartments, setFilteredApartments] = useState<Apartment[]>([]);
  const [floor, setFloor] = useState<Floor | null>(null);
  const [building, setBuilding] = useState<Building | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingApartment, setEditingApartment] = useState<Apartment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedApartment, setSelectedApartment] = useState<Apartment | null>(null);
  const [apartmentFiles, setApartmentFiles] = useState<ApartmentFile[]>([]);
  const [showFilesModal, setShowFilesModal] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [editingStatusApartment, setEditingStatusApartment] = useState<Apartment | null>(null);
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [editingTasksApartment, setEditingTasksApartment] = useState<Apartment | null>(null);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [pricingApartment, setPricingApartment] = useState<Apartment | null>(null);
  const [showFileUploadModal, setShowFileUploadModal] = useState(false);
  const [apartmentForFileUpload, setApartmentForFileUpload] = useState<Apartment | null>(null);
  const [showPricingFactorsModal, setShowPricingFactorsModal] = useState(false);
  const [showStatusManager, setShowStatusManager] = useState(false);
  const [statusManagerApartment, setStatusManagerApartment] = useState<Apartment | null>(null);
  
  const [formData, setFormData] = useState({
    apartment_number: '',
    apartment_type: 'two_room',
    room_count: 2,
    built_area: '',
    garden_balcony_area: '',
    directions: [] as string[], // שונה מ-direction ל-directions array
    position: '',
    parking_spots: '0',
    storage_rooms: '0',
    marketing_price: '',
    primary_contact_name: '',
    primary_contact_phone: '',
    primary_contact_email: '',
    notes: ''
  });

  useEffect(() => {
    if (projectId && buildingId && floorId) {
      fetchHierarchyAndApartments();
    }
  }, [projectId, buildingId, floorId]);

  useEffect(() => {
    filterApartments();
  }, [apartments, searchTerm, statusFilter, typeFilter]);

  const fetchHierarchyAndApartments = async () => {
    try {
      setIsLoading(true);
      
      // Fetch project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('id, name')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      // Fetch building
      const { data: buildingData, error: buildingError } = await supabase
        .from('buildings')
        .select('id, name, project_id')
        .eq('id', buildingId)
        .single();

      if (buildingError) throw buildingError;
      setBuilding(buildingData);

      // Fetch floor
      const { data: floorData, error: floorError } = await supabase
        .from('floors')
        .select('id, name, floor_number, building_id')
        .eq('id', floorId)
        .single();

      if (floorError) throw floorError;
      setFloor(floorData);

      // Fetch apartments with correct column names
      const { data: apartmentsData, error: apartmentsError } = await supabase
        .from('apartments')
        .select('*')
        .eq('floor_id', floorId)
        .order('apartment_number', { ascending: true });

      if (apartmentsError) throw apartmentsError;
      setApartments(apartmentsData || []);

    } catch (error) {
      toast.error('שגיאה בטעינת הנתונים');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchApartmentFiles = async (apartmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('apartment_id', apartmentId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApartmentFiles(data || []);
    } catch (error) {
      toast.error('שגיאה בטעינת קבצי הדירה');
    }
  };

  const filterApartments = () => {
    let filtered = apartments;

    // Enhanced search filter - searches across multiple fields
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(apt => 
        apt.apartment_number.toLowerCase().includes(searchLower) ||
        apt.apartment_type.toLowerCase().includes(searchLower) ||
        (apt.primary_contact_name && apt.primary_contact_name.toLowerCase().includes(searchLower)) ||
        (apt.primary_contact_phone && apt.primary_contact_phone.includes(searchTerm)) ||
        (apt.primary_contact_email && apt.primary_contact_email.toLowerCase().includes(searchLower)) ||
        (apt.direction && apt.direction.toLowerCase().includes(searchLower)) ||
        (apt.position && apt.position.toLowerCase().includes(searchLower)) ||
        (apt.notes && apt.notes.toLowerCase().includes(searchLower)) ||
        // Search by numeric values
        apt.room_count?.toString().includes(searchTerm) ||
        apt.built_area.toString().includes(searchTerm) ||
        apt.total_area.toString().includes(searchTerm) ||
        apt.marketing_price?.toString().includes(searchTerm) ||
        apt.parking_spots?.toString().includes(searchTerm) ||
        apt.storage_rooms?.toString().includes(searchTerm) ||
        // Search status in Hebrew
        getStatusLabel(apt.status).includes(searchLower) ||
        getTypeLabel(apt.apartment_type).includes(searchLower)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.apartment_number.trim()) {
      toast.error('מספר דירה הוא שדה חובה');
      return;
    }

    if (!formData.built_area) {
      toast.error('שטח בנוי הוא שדה חובה');
      return;
    }

    try {
      const apartmentData = {
        floor_id: floorId,
        apartment_number: formData.apartment_number.trim(),
        apartment_type: formData.apartment_type,
        room_count: formData.room_count || null,
        built_area: parseFloat(formData.built_area),
        garden_balcony_area: formData.garden_balcony_area ? parseFloat(formData.garden_balcony_area) : 0,
        directions: formData.directions.length > 0 ? formData.directions : null, // עדכון לתמיכה במערך כיוונים
        position: formData.position || null,
        parking_spots: formData.parking_spots ? parseInt(formData.parking_spots) : 0,
        storage_rooms: formData.storage_rooms ? parseInt(formData.storage_rooms) : 0,
        marketing_price: formData.marketing_price ? parseFloat(formData.marketing_price) : null,
        primary_contact_name: formData.primary_contact_name || null,
        primary_contact_phone: formData.primary_contact_phone || null,
        primary_contact_email: formData.primary_contact_email || null,
        notes: formData.notes || null,
        status: 'available',
        is_active: true
      };

      if (editingApartment) {
        const { error } = await supabase
          .from('apartments')
          .update(apartmentData)
          .eq('id', editingApartment.id);

        if (error) throw error;
        toast.success('הדירה עודכנה בהצלחה');
      } else {
        const { error } = await supabase
          .from('apartments')
          .insert([apartmentData]);

        if (error) throw error;
        toast.success('הדירה נוספה בהצלחה');
      }

      await fetchHierarchyAndApartments();
      resetForm();
    } catch (error) {
      toast.error('שגיאה בשמירת הדירה');
    }
  };

  const handleEdit = (apartment: Apartment) => {
    setEditingApartment(apartment);
    setFormData({
      apartment_number: apartment.apartment_number,
      apartment_type: apartment.apartment_type,
      room_count: apartment.room_count || 2,
      built_area: apartment.built_area.toString(),
      garden_balcony_area: apartment.garden_balcony_area?.toString() || '',
      directions: apartment.directions || [], // עדכון לתמיכה במערך כיוונים
      position: apartment.position || '',
      parking_spots: apartment.parking_spots?.toString() || '0',
      storage_rooms: apartment.storage_rooms?.toString() || '0',
      marketing_price: apartment.marketing_price?.toString() || '',
      primary_contact_name: apartment.primary_contact_name || '',
      primary_contact_phone: apartment.primary_contact_phone || '',
      primary_contact_email: apartment.primary_contact_email || '',
      notes: apartment.notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (apartmentId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את הדירה?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('apartments')
        .update({ is_active: false })
        .eq('id', apartmentId);

      if (error) throw error;
      
      toast.success('הדירה נמחקה בהצלחה');
      await fetchHierarchyAndApartments();
    } catch (error) {
      toast.error('שגיאה במחיקת הדירה');
    }
  };

  const openApartmentFiles = async (apartment: Apartment) => {
    setSelectedApartment(apartment);
    await fetchApartmentFiles(apartment.id);
    setShowFilesModal(true);
  };

  const openStatusModal = (apartment: Apartment) => {
    handleStatusManagement(apartment);
  };

  const closeStatusModal = () => {
    setShowStatusModal(false);
    setEditingStatusApartment(null);
  };

  const openTasksModal = (apartment: Apartment) => {
    setEditingTasksApartment(apartment);
    setShowTasksModal(true);
  };

  const closeTasksModal = () => {
    setShowTasksModal(false);
    setEditingTasksApartment(null);
  };

  const openPricingModal = (apartment: Apartment) => {
    setPricingApartment(apartment);
    setShowPricingModal(true);
  };

  const closePricingModal = () => {
    setShowPricingModal(false);
    setPricingApartment(null);
  };

  const openFileUploadModal = (apartment: Apartment) => {
    setApartmentForFileUpload(apartment);
    setShowFileUploadModal(true);
  };

  const closeFileUploadModal = () => {
    setShowFileUploadModal(false);
    setApartmentForFileUpload(null);
  };

  const handleFileUploadSuccess = () => {
    closeFileUploadModal();
    toast.success('הקבצים הועלו בהצלחה לדירה');
  };

  const handleStatusManagement = (apartment: Apartment) => {
    setStatusManagerApartment(apartment);
    setShowStatusManager(true);
  };

  const handleStatusUpdated = () => {
    fetchHierarchyAndApartments();
  };

  const calculatePricePerSqm = (price: number, totalArea: number) => {
    if (!price || !totalArea) return 0;
    return Math.round(price / totalArea);
  };

  const handleFileUpload = async (file: File) => {
    if (!selectedApartment) return;

    try {
      setUploadingFile(true);
      
      // Upload file to Supabase Storage
      const fileName = `${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('apartment-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('apartment-files')
        .getPublicUrl(fileName);

      // Save file record to database
      const { error: dbError } = await supabase
        .from('files')
        .insert([{
          filename: fileName,
          original_filename: file.name,
          file_type: getFileType(file.type),
          file_size: file.size,
          mime_type: file.type,
          file_url: publicUrl,
          apartment_id: selectedApartment.id,
          category: 'apartment_document',
          is_active: true
        }]);

      if (dbError) throw dbError;

      toast.success('הקובץ הועלה בהצלחה');
      await fetchApartmentFiles(selectedApartment.id);
    } catch (error) {
      toast.error('שגיאה בהעלאת הקובץ');
    } finally {
      setUploadingFile(false);
    }
  };

  const getFileType = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.includes('pdf')) return 'document';
    if (mimeType.includes('word') || mimeType.includes('text')) return 'document';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'spreadsheet';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'presentation';
    return 'other';
  };

  const downloadFile = async (file: ApartmentFile) => {
    try {
      const { data, error } = await supabase.storage
        .from('apartment-files')
        .download(file.filename);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.original_filename || file.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('שגיאה בהורדת הקובץ');
    }
  };

  const resetForm = () => {
    setFormData({
      apartment_number: '',
      apartment_type: 'two_room',
      room_count: 2,
      built_area: '',
      garden_balcony_area: '',
      directions: [], // עדכון לתמיכה במערך כיוונים
      position: '',
      parking_spots: '0',
      storage_rooms: '0',
      marketing_price: '',
      primary_contact_name: '',
      primary_contact_phone: '',
      primary_contact_email: '',
      notes: ''
    });
    setEditingApartment(null);
    setShowForm(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'reserved': return 'bg-yellow-100 text-yellow-800';
      case 'sold': return 'bg-blue-100 text-blue-800';
      case 'unavailable': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return <CheckCircle className="w-4 h-4" />;
      case 'reserved': return <Clock className="w-4 h-4" />;
      case 'sold': return <Users className="w-4 h-4" />;
      case 'unavailable': return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
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
      case 'mini_penthouse': return 'מיני פנטהאוז';
      default: return type;
    }
  };

  const getDirectionLabel = (direction: string) => {
    switch (direction) {
      case 'north': return 'צפון';
      case 'south': return 'דרום';
      case 'east': return 'מזרח';
      case 'west': return 'מערב';
      case 'northeast': return 'צפון מזרח';
      case 'northwest': return 'צפון מערב';
      case 'southeast': return 'דרום מזרח';
      case 'southwest': return 'דרום מערב';
      default: return direction;
    }
  };

  const getPositionLabel = (position: string) => {
    switch (position) {
      case 'front': return 'חזית';
      case 'back': return 'עורף';
      case 'side': return 'צד';
      case 'corner': return 'פינתית';
      default: return position;
    }
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
        <button
          onClick={() => navigate(`/projects/${projectId}/buildings/${buildingId}/floors`)}
          className="hover:text-blue-600"
        >
          {building?.name}
        </button>
        <ChevronRight className="h-4 w-4" />
        <span className="text-gray-900 font-medium">
          {floor?.name} - דירות
        </span>
      </nav>

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            דירות בקומה: {floor?.name}
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Building2 className="h-4 w-4" />
              <span>בניין: {building?.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <Layers className="h-4 w-4" />
              <span>קומה: {floor?.floor_number}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowPricingFactorsModal(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2 transition-colors"
          >
            <Calculator className="h-5 w-5" />
            מקדמי מחיר
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
          >
            <Plus className="h-5 w-5" />
            הוסף דירה
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="h-5 w-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="חפש לפי מספר דירה, שם קונה או טלפון"
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Filter className="h-4 w-4" />
            סינון
          </button>
        </div>

        {showFilters && (
          <div className="flex gap-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">סטטוס</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">כל הסטטוסים</option>
                <option value="available">זמינה</option>
                <option value="reserved">שמורה</option>
                <option value="sold">נמכרה</option>
                <option value="unavailable">לא זמינה</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">סוג</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <option value="mini_penthouse">מיני פנטהאוז</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Apartments Grid */}
      {filteredApartments.length === 0 && !showForm ? (
        <div className="text-center py-12">
          <Home className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {apartments.length === 0 ? 'אין דירות בקומה' : 'לא נמצאו דירות מתאימות'}
          </h3>
          <p className="text-gray-500 mb-4">
            {apartments.length === 0 ? 'התחל בהוספת הדירה הראשונה' : 'נסה לשנות את הסינון או החיפוש'}
          </p>
          {apartments.length === 0 && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto transition-colors"
            >
              <Plus className="h-5 w-5" />
              הוסף דירה
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredApartments.map((apartment) => (
            <div key={apartment.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Home className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">
                      דירה {apartment.apartment_number}
                    </h3>
                    <span className="text-sm text-gray-500">
                      {getTypeLabel(apartment.apartment_type)}
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1">
                    {getStatusIcon(apartment.status)}
                    <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(apartment.status)}`}>
                      {getStatusLabel(apartment.status)}
                    </span>
                  </div>
                  
                  {/* מעוניינים ופעילות אחרונה */}
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    {apartment.interested_count && apartment.interested_count > 0 && (
                      <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-full">
                        <Users className="h-3 w-3 text-blue-600" />
                        <span className="text-blue-700">{apartment.interested_count}</span>
                      </div>
                    )}
                    {apartment.last_activity_date && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(apartment.last_activity_date).toLocaleDateString('he-IL')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">חדרים:</span>
                  <span className="font-medium">{apartment.room_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">שטח בנוי:</span>
                  <span className="font-medium">{apartment.built_area} מ"ר</span>
                </div>
                {apartment.garden_balcony_area && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">שטח מרפסת:</span>
                    <span className="font-medium">{apartment.garden_balcony_area} מ"ר</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">שטח כולל:</span>
                  <span className="font-medium">{apartment.total_area} מ"ר</span>
                </div>
                {apartment.directions && apartment.directions.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">כיוונים:</span>
                    <div className="flex flex-wrap gap-1">
                      {apartment.directions.map(dir => (
                        <span key={dir} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                          {getDirectionLabel(dir)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {apartment.position && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">מיקום:</span>
                    <span className="font-medium">{getPositionLabel(apartment.position)}</span>
                  </div>
                )}
                {apartment.parking_spots && apartment.parking_spots > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">חניות:</span>
                    <span className="font-medium">{apartment.parking_spots}</span>
                  </div>
                )}
                {apartment.storage_rooms && apartment.storage_rooms > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">מחסנים:</span>
                    <span className="font-medium">{apartment.storage_rooms}</span>
                  </div>
                )}
              </div>

              {/* Price Section */}
              {apartment.marketing_price && (
                <div className="bg-green-50 p-3 rounded-lg mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-green-700 font-medium">מחיר שיווקי</span>
                      <span className="text-green-800 font-bold text-lg">
                        ₪{apartment.marketing_price.toLocaleString()}
                      </span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-green-600 text-sm">מחיר למ"ר</span>
                    <span className="text-green-700 text-sm">
                      ₪{calculatePricePerSqm(apartment.marketing_price, apartment.total_area).toLocaleString()}
                    </span>
                  </div>
                  {apartment.linear_price && (
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-green-600 text-sm">מחיר לינארי למ"ר</span>
                      <span className="text-green-700 text-sm">
                        ₪{calculatePricePerSqm(apartment.linear_price, apartment.total_area).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {apartment.payment_plan_20_80_price && (
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-green-600 text-sm">מחיר 20/80</span>
                      <span className="text-green-700 text-sm">
                        ₪{apartment.payment_plan_20_80_price.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {apartment.primary_contact_name && (
                <div className="bg-blue-50 p-3 rounded-lg mb-4">
                  <div className="flex items-center gap-2 text-blue-700 font-medium mb-1">
                    <Users className="h-4 w-4" />
                    פרטי קונה
                  </div>
                  <div className="text-sm text-blue-600">
                    <div>{apartment.primary_contact_name}</div>
                    {apartment.primary_contact_phone && <div>{apartment.primary_contact_phone}</div>}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t border-gray-100">
                <button
                  onClick={() => handleEdit(apartment)}
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                  title="עריכה"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => openStatusModal(apartment)}
                  className="text-purple-600 hover:text-purple-800 transition-colors"
                  title="🚀 ניהול סטטוס ומכירות"
                >
                  <TrendingUp size={16} />
                </button>
                <button
                  onClick={() => openTasksModal(apartment)}
                  className="text-orange-600 hover:text-orange-800 transition-colors"
                  title="ניהול משימות"
                >
                  <CheckCircle size={16} />
                </button>
                <button
                  onClick={() => openPricingModal(apartment)}
                  className="text-yellow-600 hover:text-yellow-800 transition-colors"
                  title="מחשבון תמחור"
                >
                  <Calculator size={16} />
                </button>
                <button
                  onClick={() => openApartmentFiles(apartment)}
                  className="text-green-600 hover:text-green-800 transition-colors"
                  title="צפה במסמכים והדמיות"
                >
                  <FileText size={16} />
                </button>
                <button
                  onClick={() => openFileUploadModal(apartment)}
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                  title="העלה קבצים"
                >
                  <Upload size={16} />
                </button>
                <button
                  onClick={() => handleDelete(apartment.id)}
                  className="text-red-600 hover:text-red-800 transition-colors"
                  title="מחיקה"
                >
                  <Trash2 size={16} />
                </button>
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
                {editingApartment ? 'ערוך דירה' : 'הוסף דירה חדשה'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      מספר דירה *
                    </label>
                    <input
                      type="text"
                      value={formData.apartment_number}
                      onChange={(e) => setFormData({ ...formData, apartment_number: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="1, 2, 3..."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      סוג דירה
                    </label>
                    <select
                      value={formData.apartment_type}
                      onChange={(e) => setFormData({ ...formData, apartment_type: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      חדרים
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.room_count}
                      onChange={(e) => setFormData({ ...formData, room_count: parseInt(e.target.value) || 1 })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Areas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      שטח בנוי (מ"ר) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.built_area}
                      onChange={(e) => setFormData({ ...formData, built_area: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {formData.apartment_type === 'garden' || (floor && floor.floor_number === 0) 
                        ? '🌳 שטח גינה (מ"ר)' 
                        : '🏢 שטח מרפסת (מ"ר)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.garden_balcony_area}
                      onChange={(e) => setFormData({ ...formData, garden_balcony_area: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={formData.apartment_type === 'garden' || (floor && floor.floor_number === 0) 
                        ? 'שטח הגינה במ"ר' 
                        : 'שטח המרפסת במ"ר'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      שטח כולל (מ"ר)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={(parseFloat(formData.built_area) + parseFloat(formData.garden_balcony_area || '0')).toString() || ''}
                      readOnly
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 text-gray-600"
                      placeholder="מחושב אוטומטית"
                    />
                  </div>
                </div>

                {/* Rooms & Features */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      🏠 חדרים (בקפיצות 0.5)
                    </label>
                    <select
                      value={formData.room_count}
                      onChange={(e) => setFormData({ ...formData, room_count: parseFloat(e.target.value) || 1 })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {[1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8].map(roomCount => (
                        <option key={roomCount} value={roomCount}>
                          {roomCount} חדרים
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      כיווני נוף (בחירה מרובה)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'north', label: '🧭 צפון' },
                        { value: 'south', label: '🧭 דרום' },
                        { value: 'east', label: '🧭 מזרח' },
                        { value: 'west', label: '🧭 מערב' },
                        { value: 'northeast', label: '🧭 צפון מזרח' },
                        { value: 'northwest', label: '🧭 צפון מערב' },
                        { value: 'southeast', label: '🧭 דרום מזרח' },
                        { value: 'southwest', label: '🧭 דרום מערב' }
                      ].map(direction => (
                        <label key={direction.value} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.directions.includes(direction.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({ 
                                  ...formData, 
                                  directions: [...formData.directions, direction.value] 
                                });
                              } else {
                                setFormData({ 
                                  ...formData, 
                                  directions: formData.directions.filter(d => d !== direction.value) 
                                });
                              }
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-700">{direction.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      מיקום בבניין
                    </label>
                    <select
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">בחר מיקום</option>
                      <option value="front">חזית</option>
                      <option value="back">עורף</option>
                      <option value="side">צד</option>
                      <option value="corner">פינתית</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      חניות
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.parking_spots}
                      onChange={(e) => setFormData({ ...formData, parking_spots: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Storage Rooms */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    מחסנים
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.storage_rooms}
                    onChange={(e) => setFormData({ ...formData, storage_rooms: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Pricing */}
                <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      מחיר שיווקי (₪)
                    </label>
                    <input
                      type="number"
                      value={formData.marketing_price}
                      onChange={(e) => setFormData({ ...formData, marketing_price: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="למשל: 2500000"
                    />
                  </div>
                </div>

                {/* Buyer Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      שם קונה
                    </label>
                    <input
                      type="text"
                      value={formData.primary_contact_name}
                      onChange={(e) => setFormData({ ...formData, primary_contact_name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="שם מלא של הקונה"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      טלפון קונה
                    </label>
                    <input
                      type="tel"
                      value={formData.primary_contact_phone}
                      onChange={(e) => setFormData({ ...formData, primary_contact_phone: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="05X-XXXXXXX"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    אימייל קונה
                  </label>
                  <input
                    type="email"
                    value={formData.primary_contact_email}
                    onChange={(e) => setFormData({ ...formData, primary_contact_email: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="example@example.com"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    הערות
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="הערות נוספות על הדירה"
                    rows={3}
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editingApartment ? 'עדכן' : 'הוסף'}
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

      {/* Files Modal */}
      {showFilesModal && selectedApartment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" dir="rtl">
          <div className="bg-white rounded-lg p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                מסמכים והדמיות - דירה {selectedApartment.apartment_number}
              </h2>
              <button
                onClick={() => setShowFilesModal(false)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Upload Section */}
            <div className="mb-8 p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-colors">
              <div className="text-center">
                <Upload className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <label className="cursor-pointer">
                  <span className="mt-2 block text-lg font-medium text-gray-900">
                    גרור קבצים לכאן או לחץ להעלאה
                  </span>
                  <span className="mt-2 block text-sm text-gray-500">
                    תמונות, מסמכים, הדמיות, וידאו, מצגות ועוד
                  </span>
                  <span className="mt-1 block text-xs text-gray-400">
                    PNG, JPG, PDF, DOC, XLS, PPT, MP4 עד 50MB
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) {
                        Array.from(e.target.files).forEach(file => {
                          handleFileUpload(file);
                        });
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Files Grid */}
            {apartmentFiles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {apartmentFiles.map((file) => (
                  <div key={file.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow bg-white">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {file.file_type === 'image' && <FileImage size={20} className="text-blue-500 flex-shrink-0" />}
                        {file.file_type === 'document' && <FileText size={20} className="text-red-500 flex-shrink-0" />}
                        {file.file_type === 'video' && <FileVideo size={20} className="text-purple-500 flex-shrink-0" />}
                        {file.file_type === 'spreadsheet' && <FileSpreadsheet size={20} className="text-green-500 flex-shrink-0" />}
                        {file.file_type === 'presentation' && <Presentation size={20} className="text-orange-500 flex-shrink-0" />}
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {file.original_filename}
                        </span>
                      </div>
                    </div>
                    
                    {/* File Preview */}
                    <div className="mb-3">
                      {file.file_type === 'image' ? (
                        <img 
                          src={file.file_url} 
                          alt={file.original_filename}
                          className="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(file.file_url, '_blank')}
                        />
                      ) : (
                        <div className="w-full h-32 bg-gray-100 rounded border flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors"
                             onClick={() => window.open(file.file_url, '_blank')}>
                          <div className="text-center">
                            {file.file_type === 'document' && <FileText size={32} className="text-red-400 mx-auto mb-2" />}
                            {file.file_type === 'video' && <FileVideo size={32} className="text-purple-400 mx-auto mb-2" />}
                            {file.file_type === 'spreadsheet' && <FileSpreadsheet size={32} className="text-green-400 mx-auto mb-2" />}
                            {file.file_type === 'presentation' && <Presentation size={32} className="text-orange-400 mx-auto mb-2" />}
                            <span className="text-xs text-gray-500">לחץ לצפייה</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* File Info */}
                    {file.description && (
                      <p className="text-xs text-gray-600 mb-2 line-clamp-2">{file.description}</p>
                    )}
                    
                    {file.category && (
                      <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full mb-2">
                        {file.category}
                      </span>
                    )}
                    
                    <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                      <span className="text-xs text-gray-500">
                        {(file.file_size / 1024 / 1024).toFixed(1)} MB
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => window.open(file.file_url, '_blank')}
                          className="text-blue-600 hover:text-blue-800 text-sm p-1 hover:bg-blue-50 rounded transition-colors"
                          title="צפה בקובץ"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => downloadFile(file)}
                          className="text-green-600 hover:text-green-800 text-sm p-1 hover:bg-green-50 rounded transition-colors"
                          title="הורד קובץ"
                        >
                          <Download size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">אין קבצים עדיין</h3>
                <p className="text-gray-500 mb-4">העלה מסמכים, הדמיות ותמונות של הדירה</p>
                <p className="text-gray-400 text-sm">
                  תוכל להעלות תוכניות, הדמיות תלת מימד, תמונות, מצגות ומסמכים נוספים
                </p>
              </div>
            )}

            {uploadingFile && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span className="text-blue-700 font-medium">מעלה קבצים...</span>
                  <span className="text-blue-600 text-sm">אנא המתן</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status Management Modal */}
      {showStatusModal && editingStatusApartment && (
        <UnitStatusModal
          isOpen={showStatusModal}
          onClose={closeStatusModal}
          unit={editingStatusApartment}
          onUpdate={fetchHierarchyAndApartments}
        />
      )}

      {/* Tasks Management Modal */}
      {showTasksModal && editingTasksApartment && (
        <UnitTasksModal
          isOpen={showTasksModal}
          onClose={closeTasksModal}
          unit={editingTasksApartment}
          building={building}
          floor={floor}
          project={project}
        />
      )}

      {/* Pricing Calculator Modal */}
      {showPricingModal && pricingApartment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-semibold">מחשבון תמחור שמאי - דירה {pricingApartment.apartment_number}</h3>
              <button onClick={closePricingModal} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <PricingCalculator
                unit={{
                  id: pricingApartment.id,
                  apartment_type: pricingApartment.apartment_type,
                  built_area: pricingApartment.built_area,
                  garden_balcony_area: pricingApartment.garden_balcony_area,
                  total_area: pricingApartment.total_area,
                  marketing_price: pricingApartment.marketing_price,
                  linear_price: pricingApartment.linear_price,
                  parking_spots: pricingApartment.parking_spots,
                  storage_rooms: pricingApartment.storage_rooms,
                  room_count: pricingApartment.room_count,
                  direction: pricingApartment.direction,
                  floor_number: floor?.floor_number
                }}
                onPriceUpdate={(prices) => {
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* File Upload Modal */}
      {showFileUploadModal && apartmentForFileUpload && (
        <FileUploadModal
          isOpen={showFileUploadModal}
          onClose={closeFileUploadModal}
          onUploadSuccess={handleFileUploadSuccess}
          initialEntityType="unit"
          initialEntityId={apartmentForFileUpload.id}
        />
      )}

      {/* Pricing Factors Modal */}
      {showPricingFactorsModal && (
        <PricingFactorsModal
          isOpen={showPricingFactorsModal}
          onClose={() => setShowPricingFactorsModal(false)}
          projectId={projectId!}
        />
      )}

      {/* Apartment Status Manager */}
      {showStatusManager && statusManagerApartment && (
        <ApartmentStatusManager
          isOpen={showStatusManager}
          onClose={() => setShowStatusManager(false)}
          apartment={statusManagerApartment}
          onStatusUpdated={handleStatusUpdated}
        />
      )}
    </div>
  );
}; 