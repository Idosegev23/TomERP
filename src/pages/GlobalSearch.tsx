import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Search, 
  Filter,
  Building, 
  Home, 
  Users, 
  FileText, 
  ArrowRight,
  Building2,
  Layers,
  ChevronRight,
  Eye
} from 'lucide-react';
import { useAuth } from '../components/auth/AuthContext';
import { FileViewModal } from '../components/files/FileViewModal';
import toast from 'react-hot-toast';

interface SearchResult {
  id: string;
  type: 'project' | 'building' | 'floor' | 'apartment' | 'task' | 'file' | 'developer';
  title: string;
  subtitle?: string;
  description?: string;
  meta?: string[];
  path: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  fileData?: {
    file_path: string;
    file_type: string;
    file_size: number;
  };
}

interface SearchFilters {
  types: string[];
  projects: string[];
  status: string[];
  dateRange: {
    start: string;
    end: string;
  };
}

export const GlobalSearch: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedFileForView, setSelectedFileForView] = useState<any>(null);
  
  const [filters, setFilters] = useState<SearchFilters>({
    types: [],
    projects: [],
    status: [],
    dateRange: { start: '', end: '' }
  });

  const [availableProjects, setAvailableProjects] = useState<Array<{id: string, name: string}>>([]);

  const searchTypes = [
    { id: 'project', label: 'פרויקטים', icon: Building, color: 'blue' },
    { id: 'building', label: 'בניינים', icon: Building2, color: 'green' },
    { id: 'floor', label: 'קומות', icon: Layers, color: 'purple' },
    { id: 'apartment', label: 'דירות', icon: Home, color: 'orange' },
    { id: 'task', label: 'משימות', icon: Layers, color: 'red' },
    { id: 'file', label: 'קבצים', icon: FileText, color: 'gray' },
    { id: 'developer', label: 'יזמים', icon: Users, color: 'indigo' },
  ];

  useEffect(() => {
    fetchAvailableProjects();
  }, [user]);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      performSearch();
    } else {
      setResults([]);
      setTotalResults(0);
    }
  }, [searchTerm, filters]);

  useEffect(() => {
    const query = searchTerm;
    if (query && query !== searchTerm) {
      setSearchTerm(query);
    }
  }, [searchTerm]);

  const fetchAvailableProjects = async () => {
    if (!user) return;

    try {
      let projectsQuery = supabase.from('projects').select('id, name');
      
      if (user.user_role === 'developer' && user.developer_id) {
        projectsQuery = projectsQuery.eq('developer_id', user.developer_id);
      } else if (user.user_role !== 'admin' && user.assigned_project_ids) {
        projectsQuery = projectsQuery.in('id', user.assigned_project_ids);
      }

      const { data: projects } = await projectsQuery;
      setAvailableProjects(projects || []);
    } catch (error) {
    }
  };

  const performSearch = async () => {
    if (!user || !searchTerm.trim()) return;

    try {
      setLoading(true);
      const results: SearchResult[] = [];

      // Get accessible project IDs
      const accessibleProjectIds = availableProjects.map(p => p.id);
      
      if (accessibleProjectIds.length === 0 && user.user_role !== 'admin') {
        setResults([]);
        setTotalResults(0);
        return;
      }

      // Search Projects
      if (shouldSearchType('project')) {
        let projectsQuery = supabase
          .from('projects')
          .select('id, name, description, status, created_at')
          .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);

        if (user.user_role === 'developer' && user.developer_id) {
          projectsQuery = projectsQuery.eq('developer_id', user.developer_id);
        } else if (user.user_role !== 'admin' && accessibleProjectIds.length > 0) {
          projectsQuery = projectsQuery.in('id', accessibleProjectIds);
        }

        const { data: projects } = await projectsQuery;
        
        projects?.forEach(project => {
          results.push({
            id: project.id,
            type: 'project',
            title: project.name,
            subtitle: 'פרויקט',
            description: project.description,
            meta: [project.status, new Date(project.created_at).toLocaleDateString('he-IL')],
            path: `/projects/${project.id}`,
            icon: Building,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50'
          });
        });
      }

      // Search Buildings
      if (shouldSearchType('building') && accessibleProjectIds.length > 0) {
        const { data: buildings } = await supabase
          .from('buildings')
          .select(`
            id, name, description, floors_count, created_at,
            project:projects!inner(id, name)
          `)
          .in('project_id', accessibleProjectIds)
          .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);

        buildings?.forEach(building => {
          const project = building.project as any;
          results.push({
            id: building.id,
            type: 'building',
            title: building.name,
            subtitle: `בניין • ${project?.name}`,
            description: building.description,
            meta: [`${building.floors_count} קומות`, new Date(building.created_at).toLocaleDateString('he-IL')],
            path: `/projects/${project?.id}/buildings`,
            icon: Building2,
            color: 'text-green-600',
            bgColor: 'bg-green-50'
          });
        });
      }

      // Search Apartments
      if (shouldSearchType('apartment') && accessibleProjectIds.length > 0) {
        const { data: apartments } = await supabase
          .from('apartments')
          .select(`
            id, apartment_number, apartment_type, apartment_status, rooms, marketing_price,
            buyer_name, buyer_phone,
            floor:floors(id, name, building:buildings(id, name, project:projects(id, name)))
          `)
          .or(`apartment_number.ilike.%${searchTerm}%,buyer_name.ilike.%${searchTerm}%,buyer_phone.ilike.%${searchTerm}%`)
          .limit(50);

        apartments?.forEach(apartment => {
          const floor = apartment.floor as any;
          const building = floor?.building as any;
          const project = building?.project as any;
          if (project && accessibleProjectIds.includes(project.id)) {
            results.push({
              id: apartment.id,
              type: 'apartment',
              title: `דירה ${apartment.apartment_number}`,
              subtitle: `${apartment.apartment_type} • ${building?.name} • ${project.name}`,
              description: apartment.buyer_name ? `קונה: ${apartment.buyer_name}` : undefined,
              meta: [
                apartment.apartment_status,
                `${apartment.rooms} חדרים`,
                apartment.marketing_price ? `₪${apartment.marketing_price.toLocaleString()}` : ''
              ].filter(Boolean),
              path: `/projects/${project.id}/buildings/${building?.id}/floors/${floor?.id}/apartments`,
              icon: Home,
              color: 'text-orange-600',
              bgColor: 'bg-orange-50'
            });
          }
        });
      }

      // Search Tasks
      if (shouldSearchType('task') && accessibleProjectIds.length > 0) {
        const { data: tasks } = await supabase
          .from('tasks')
          .select(`
            id, title, description, status, priority, due_date,
            project:projects(id, name)
          `)
          .in('project_id', accessibleProjectIds)
          .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
          .limit(50);

        tasks?.forEach(task => {
          const project = task.project as any;
          results.push({
            id: task.id,
            type: 'task',
            title: task.title,
            subtitle: `משימה • ${project?.name}`,
            description: task.description,
            meta: [
              task.status,
              task.priority,
              task.due_date ? new Date(task.due_date).toLocaleDateString('he-IL') : ''
            ].filter(Boolean),
            path: `/projects/${project?.id}`,
            icon: Layers,
            color: 'text-red-600',
            bgColor: 'bg-red-50'
          });
        });
      }

      // Search Files
      if (shouldSearchType('file') && accessibleProjectIds.length > 0) {
        const { data: files } = await supabase
          .from('files')
          .select('id, file_name, file_path, file_size, description, file_type, entity_type, entity_id, created_at')
          .or(`file_name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
          .limit(50);

        files?.forEach(file => {
          results.push({
            id: file.id,
            type: 'file',
            title: file.file_name,
            subtitle: `קובץ • ${file.entity_type}`,
            description: file.description,
            meta: [file.file_type, new Date(file.created_at).toLocaleDateString('he-IL')],
            path: '/files',
            icon: FileText,
            color: 'text-gray-600',
            bgColor: 'bg-gray-50',
            fileData: {
              file_path: file.file_path,
              file_type: file.file_type,
              file_size: file.file_size
            }
          });
        });
      }

      // Search Developers (Admin only)
      if (shouldSearchType('developer') && user.user_role === 'admin') {
        const { data: developers } = await supabase
          .from('developers')
          .select('id, name, contact_person, phone, email')
          .or(`name.ilike.%${searchTerm}%,contact_person.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
          .limit(20);

        developers?.forEach(developer => {
          results.push({
            id: developer.id,
            type: 'developer',
            title: developer.name,
            subtitle: 'יזם',
            description: developer.contact_person,
            meta: [developer.phone, developer.email].filter(Boolean),
            path: `/developers`,
            icon: Users,
            color: 'text-indigo-600',
            bgColor: 'bg-indigo-50'
          });
        });
      }

      // Sort results by relevance
      results.sort((a, b) => {
        const aScore = getRelevanceScore(a.title, searchTerm) + getRelevanceScore(a.description || '', searchTerm);
        const bScore = getRelevanceScore(b.title, searchTerm) + getRelevanceScore(b.description || '', searchTerm);
        return bScore - aScore;
      });

      setResults(results);
      setTotalResults(results.length);

    } catch (error) {
      toast.error('שגיאה בחיפוש');
    } finally {
      setLoading(false);
    }
  };

  const shouldSearchType = (type: string): boolean => {
    return filters.types.length === 0 || filters.types.includes(type);
  };

  const getRelevanceScore = (text: string, searchTerm: string): number => {
    if (!text || !searchTerm) return 0;
    
    const lowerText = text.toLowerCase();
    const lowerSearch = searchTerm.toLowerCase();
    
    if (lowerText === lowerSearch) return 100;
    if (lowerText.startsWith(lowerSearch)) return 80;
    if (lowerText.includes(lowerSearch)) return 60;
    
    // Word boundary matches
    const words = lowerSearch.split(' ');
    let score = 0;
    words.forEach(word => {
      if (lowerText.includes(word)) score += 20;
    });
    
    return score;
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleFilterChange = (filterType: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      types: [],
      projects: [],
      status: [],
      dateRange: { start: '', end: '' }
    });
  };

  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'file' && result.fileData) {
      // Open file in viewer modal
      setSelectedFileForView({
        id: result.id,
        file_name: result.title,
        file_path: result.fileData.file_path,
        file_type: result.fileData.file_type,
        file_size: result.fileData.file_size,
        description: result.description
      });
      setShowViewModal(true);
    } else {
      // Navigate to other types
      navigate(result.path);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4" dir="rtl">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">חיפוש גלובלי</h1>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="h-5 w-5 absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="חפש פרויקטים, דירות, משימות, קבצים ועוד..."
              className="w-full pr-12 pl-4 py-3 text-lg border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Filter className="h-5 w-5" />
            </button>
          </div>

          {/* Results Count */}
          {searchTerm && (
            <p className="text-sm text-gray-600 mt-3">
              {loading ? 'מחפש...' : `נמצאו ${totalResults} תוצאות עבור "${searchTerm}"`}
            </p>
          )}
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">סינון תוצאות</h3>
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                נקה הכל
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  סוגי תוכן
                </label>
                <div className="space-y-2">
                  {searchTypes.map(type => (
                    <label key={type.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.types.includes(type.id)}
                        onChange={(e) => {
                          const newTypes = e.target.checked
                            ? [...filters.types, type.id]
                            : filters.types.filter(t => t !== type.id);
                          handleFilterChange('types', newTypes);
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="mr-2 text-sm text-gray-700">{type.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Project Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  פרויקטים
                </label>
                <select
                  multiple
                  value={filters.projects}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, option => option.value);
                    handleFilterChange('projects', values);
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  size={4}
                >
                  {availableProjects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  טווח תאריכים
                </label>
                <div className="space-y-2">
                  <input
                    type="date"
                    value={filters.dateRange.start}
                    onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, start: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="מתאריך"
                  />
                  <input
                    type="date"
                    value={filters.dateRange.end}
                    onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, end: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="עד תאריך"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="text-gray-500">מחפש...</div>
            </div>
          ) : results.length === 0 && searchTerm ? (
            <div className="text-center py-12">
              <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                לא נמצאו תוצאות
              </h3>
              <p className="text-gray-500">
                נסה לשנות את מילות החיפוש או הסנן
              </p>
            </div>
          ) : (
            results.map((result) => (
              <div
                key={`${result.type}-${result.id}`}
                onClick={() => handleResultClick(result)}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${result.bgColor}`}>
                    <result.icon className={`h-5 w-5 ${result.color}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-900">
                        {result.title}
                      </h3>
                      {result.type === 'file' && (
                        <div title="ניתן לצפייה">
                          <Eye className="h-4 w-4 text-green-600" />
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {result.subtitle}
                    </p>
                    {result.description && (
                      <p className="text-sm text-gray-500 mb-2">
                        {result.description}
                      </p>
                    )}
                    {result.meta && result.meta.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {result.meta.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {result.type === 'file' ? (
                    <div title="לחץ לצפייה">
                      <Eye className="h-5 w-5 text-green-600" />
                    </div>
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Load More */}
        {results.length >= 50 && (
          <div className="text-center mt-6">
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              טען עוד תוצאות
            </button>
          </div>
        )}
      </div>

      {/* File View Modal */}
      {showViewModal && selectedFileForView && (
        <FileViewModal
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setSelectedFileForView(null);
          }}
          file={selectedFileForView}
        />
      )}
    </div>
  );
}; 