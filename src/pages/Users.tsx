import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  Users as UsersIcon, 
  Search, 
  Filter,
  Plus,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  Shield,
  ShieldCheck,
  Home,
  ChevronRight,
  Eye,
  Mail,
  Phone,
  MapPin,
  Building2,
  Building,
  TreePine,
  Layers
} from 'lucide-react';
import { Card, CardHeader, CardContent, Button } from '../components/ui';
import { useAuth } from '../components/auth/AuthContext';
import toast from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone: string;
  company: string;
  is_active: boolean;
  created_at: string;
  last_sign_in_at: string;
  assigned_project_ids: string[];
}

interface FilterOptions {
  role: string;
  status: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface HierarchyData {
  developers: Array<{ id: string; name: string; }>;
  projects: Array<{ id: string; name: string; developer_id: string; }>;
  buildings: Array<{ id: string; name: string; project_id: string; }>;
  floors: Array<{ id: string; number: number; building_id: string; }>;
  units: Array<{ id: string; number: string; floor_id: string; }>;
}

const HierarchicalAssignments: React.FC<{
  userDetails: any;
}> = ({ userDetails }) => {
  if (!userDetails) return null;

  const {
    assigned_developer_id,
    assigned_project_ids,
    assigned_building_ids,
    assigned_floor_ids,
    assigned_unit_ids
  } = userDetails;

  const hasAssignments = assigned_developer_id || 
    (assigned_project_ids?.length > 0) ||
    (assigned_building_ids?.length > 0) ||
    (assigned_floor_ids?.length > 0) ||
    (assigned_unit_ids?.length > 0);

  if (!hasAssignments) return null;

  return (
    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
      <h4 className="text-sm font-medium text-green-800 mb-2 flex items-center gap-1">
        <TreePine className="h-4 w-4" />
        שיוכים היררכיים
      </h4>
      <div className="space-y-1 text-xs text-green-700">
        {assigned_developer_id && (
          <div className="flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            <span>יזם: {assigned_developer_id}</span>
          </div>
        )}
        {assigned_project_ids?.length > 0 && (
          <div className="flex items-center gap-1">
            <Home className="h-3 w-3" />
            <span>פרויקטים: {assigned_project_ids.length}</span>
          </div>
        )}
        {assigned_building_ids?.length > 0 && (
          <div className="flex items-center gap-1">
            <Building className="h-3 w-3" />
            <span>בניינים: {assigned_building_ids.length}</span>
          </div>
        )}
        {assigned_floor_ids?.length > 0 && (
          <div className="flex items-center gap-1">
            <Layers className="h-3 w-3" />
            <span>קומות: {assigned_floor_ids.length}</span>
          </div>
        )}
        {assigned_unit_ids?.length > 0 && (
          <div className="flex items-center gap-1">
            <Home className="h-3 w-3" />
            <span>דירות: {assigned_unit_ids.length}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const HierarchicalInviteForm: React.FC<{
  onSubmit: (userData: any) => void;
  onCancel: () => void;
}> = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'developer_employee',
    phone: '',
    company: '',
    message: '',
    // Hierarchy assignments
    assigned_developer_id: '',
    assigned_project_ids: [] as string[],
    assigned_building_ids: [] as string[],
    assigned_floor_ids: [] as string[],
    assigned_unit_ids: [] as string[]
  });

  const [hierarchy, setHierarchy] = useState<HierarchyData>({
    developers: [],
    projects: [],
    buildings: [],
    floors: [],
    units: []
  });

  const [loading, setLoading] = useState({
    developers: false,
    projects: false,
    buildings: false,
    floors: false,
    units: false
  });

  // Load developers on mount
  useEffect(() => {
    fetchDevelopers();
  }, []);

  // Load projects when developer changes
  useEffect(() => {
    if (formData.assigned_developer_id) {
      fetchProjects(formData.assigned_developer_id);
      // Reset lower levels
      setFormData(prev => ({
        ...prev,
        assigned_project_ids: [],
        assigned_building_ids: [],
        assigned_floor_ids: [],
        assigned_unit_ids: []
      }));
      setHierarchy(prev => ({
        ...prev,
        projects: [],
        buildings: [],
        floors: [],
        units: []
      }));
    }
  }, [formData.assigned_developer_id]);

  // Load buildings when projects change
  useEffect(() => {
    if (formData.assigned_project_ids.length > 0) {
      fetchBuildings(formData.assigned_project_ids);
      // Reset lower levels
      setFormData(prev => ({
        ...prev,
        assigned_building_ids: [],
        assigned_floor_ids: [],
        assigned_unit_ids: []
      }));
      setHierarchy(prev => ({
        ...prev,
        buildings: [],
        floors: [],
        units: []
      }));
    }
  }, [formData.assigned_project_ids]);

  // Load floors when buildings change
  useEffect(() => {
    if (formData.assigned_building_ids.length > 0) {
      fetchFloors(formData.assigned_building_ids);
      // Reset lower levels
      setFormData(prev => ({
        ...prev,
        assigned_floor_ids: [],
        assigned_unit_ids: []
      }));
      setHierarchy(prev => ({
        ...prev,
        floors: [],
        units: []
      }));
    }
  }, [formData.assigned_building_ids]);

  // Load units when floors change
  useEffect(() => {
    if (formData.assigned_floor_ids.length > 0) {
      fetchUnits(formData.assigned_floor_ids);
      // Reset lower levels
      setFormData(prev => ({
        ...prev,
        assigned_unit_ids: []
      }));
      setHierarchy(prev => ({
        ...prev,
        units: []
      }));
    }
  }, [formData.assigned_floor_ids]);

  const fetchDevelopers = async () => {
    setLoading(prev => ({ ...prev, developers: true }));
    try {
      const { data, error } = await supabase
        .from('developers')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setHierarchy(prev => ({ ...prev, developers: data || [] }));
    } catch (error) {
      console.error('Error fetching developers:', error);
      toast.error('שגיאה בטעינת יזמים');
    } finally {
      setLoading(prev => ({ ...prev, developers: false }));
    }
  };

  const fetchProjects = async (developerId: string) => {
    setLoading(prev => ({ ...prev, projects: true }));
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, developer_id')
        .eq('developer_id', developerId)
        .order('name');
      
      if (error) throw error;
      setHierarchy(prev => ({ ...prev, projects: data || [] }));
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('שגיאה בטעינת פרויקטים');
    } finally {
      setLoading(prev => ({ ...prev, projects: false }));
    }
  };

  const fetchBuildings = async (projectIds: string[]) => {
    setLoading(prev => ({ ...prev, buildings: true }));
    try {
      const { data, error } = await supabase
        .from('buildings')
        .select('id, name, project_id')
        .in('project_id', projectIds)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      setHierarchy(prev => ({ ...prev, buildings: data || [] }));
    } catch (error) {
      console.error('Error fetching buildings:', error);
      toast.error('שגיאה בטעינת בניינים');
    } finally {
      setLoading(prev => ({ ...prev, buildings: false }));
    }
  };

  const fetchFloors = async (buildingIds: string[]) => {
    setLoading(prev => ({ ...prev, floors: true }));
    try {
      const { data, error } = await supabase
        .from('floors')
        .select('id, number, building_id')
        .in('building_id', buildingIds)
        .eq('is_active', true)
        .order('number');
      
      if (error) throw error;
      setHierarchy(prev => ({ ...prev, floors: data || [] }));
    } catch (error) {
      console.error('Error fetching floors:', error);
      toast.error('שגיאה בטעינת קומות');
    } finally {
      setLoading(prev => ({ ...prev, floors: false }));
    }
  };

  const fetchUnits = async (floorIds: string[]) => {
    setLoading(prev => ({ ...prev, units: true }));
    try {
      const { data, error } = await supabase
        .from('apartments')
        .select('id, number, floor_id')
        .in('floor_id', floorIds)
        .eq('is_active', true)
        .order('number');
      
      if (error) throw error;
      setHierarchy(prev => ({ ...prev, units: data || [] }));
    } catch (error) {
      console.error('Error fetching units:', error);
      toast.error('שגיאה בטעינת דירות');
    } finally {
      setLoading(prev => ({ ...prev, units: false }));
    }
  };

  const handleMultiSelect = (field: string, value: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked 
        ? [...(prev[field as keyof typeof prev] as string[]), value]
        : (prev[field as keyof typeof prev] as string[]).filter(id => id !== value)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email.trim() || !formData.full_name.trim()) {
      toast.error('אימייל ושם מלא הם שדות חובה');
      return;
    }

    // Determine assigned entities based on role
    let assignments: any = {};
    
    if (['developer'].includes(formData.role)) {
      assignments.assigned_developer_id = formData.assigned_developer_id;
    } else if (['developer_employee', 'sales_agent'].includes(formData.role)) {
      assignments.assigned_project_ids = formData.assigned_project_ids;
      assignments.assigned_building_ids = formData.assigned_building_ids;
      assignments.assigned_floor_ids = formData.assigned_floor_ids;
      assignments.assigned_unit_ids = formData.assigned_unit_ids;
    }

    onSubmit({
      ...formData,
      ...assignments
    });
  };

  const getRolePermissions = (role: string) => {
    switch (role) {
      case 'super_admin':
      case 'admin':
        return { showDeveloper: false, showProject: false, showBuilding: false, showFloor: false, showUnit: false };
      case 'developer':
        return { showDeveloper: true, showProject: false, showBuilding: false, showFloor: false, showUnit: false };
      case 'developer_employee':
        return { showDeveloper: true, showProject: true, showBuilding: true, showFloor: false, showUnit: false };
      case 'sales_agent':
        return { showDeveloper: true, showProject: true, showBuilding: true, showFloor: true, showUnit: true };
      case 'supplier':
        return { showDeveloper: true, showProject: true, showBuilding: false, showFloor: false, showUnit: false };
      default:
        return { showDeveloper: false, showProject: false, showBuilding: false, showFloor: false, showUnit: false };
    }
  };

  const permissions = getRolePermissions(formData.role);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Mail className="h-6 w-6 text-blue-600" />
            הזמנת משתמש חדש עם שיוך היררכי
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">פרטים בסיסיים</h3>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      אימייל *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      שם מלא *
                    </label>
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData(prev => ({...prev, full_name: e.target.value}))}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      תפקיד *
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData(prev => ({...prev, role: e.target.value}))}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="super_admin">מנהל על</option>
                      <option value="admin">מנהל מערכת</option>
                      <option value="developer">יזם</option>
                      <option value="developer_employee">עובד יזם</option>
                      <option value="sales_agent">איש מכירות</option>
                      <option value="supplier">ספק</option>
                      <option value="lawyer">עורך דין</option>
                      <option value="viewer">צופה</option>
                      <option value="external_marketing">שיווק חיצוני</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      טלפון
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({...prev, phone: e.target.value}))}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      חברה
                    </label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData(prev => ({...prev, company: e.target.value}))}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      הודעה אישית להזמנה
                    </label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => setFormData(prev => ({...prev, message: e.target.value}))}
                      rows={3}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="הוסף הודעה אישית להזמנה (אופציונלי)..."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Hierarchical Assignment */}
            {(permissions.showDeveloper || permissions.showProject || permissions.showBuilding || permissions.showFloor || permissions.showUnit) && (
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <TreePine className="h-5 w-5 text-green-600" />
                    שיוך היררכי
                  </h3>
                  <p className="text-sm text-gray-600">
                    בחר את הישויות שהמשתמש יוכל לגשת אליהן לפי תפקידו
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Developer Selection */}
                    {permissions.showDeveloper && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          יזם {formData.role === 'developer' ? '*' : ''}
                        </label>
                        <select
                          value={formData.assigned_developer_id}
                          onChange={(e) => setFormData(prev => ({...prev, assigned_developer_id: e.target.value}))}
                          className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required={formData.role === 'developer'}
                          disabled={loading.developers}
                        >
                          <option value="">בחר יזם...</option>
                          {hierarchy.developers.map(dev => (
                            <option key={dev.id} value={dev.id}>{dev.name}</option>
                          ))}
                        </select>
                        {loading.developers && <p className="text-sm text-gray-500 mt-1">טוען יזמים...</p>}
                      </div>
                    )}

                    {/* Projects Selection */}
                    {permissions.showProject && formData.assigned_developer_id && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <Home className="h-4 w-4" />
                          פרויקטים ({formData.assigned_project_ids.length} נבחרו)
                        </label>
                        <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto">
                          {loading.projects ? (
                            <p className="text-sm text-gray-500">טוען פרויקטים...</p>
                          ) : hierarchy.projects.length === 0 ? (
                            <p className="text-sm text-gray-500">לא נמצאו פרויקטים</p>
                          ) : (
                            hierarchy.projects.map(project => (
                              <label key={project.id} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded">
                                <input
                                  type="checkbox"
                                  checked={formData.assigned_project_ids.includes(project.id)}
                                  onChange={(e) => handleMultiSelect('assigned_project_ids', project.id, e.target.checked)}
                                  className="w-4 h-4 text-blue-600"
                                />
                                <span className="text-sm">{project.name}</span>
                              </label>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {/* Buildings Selection */}
                    {permissions.showBuilding && formData.assigned_project_ids.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <Building className="h-4 w-4" />
                          בניינים ({formData.assigned_building_ids.length} נבחרו)
                        </label>
                        <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto">
                          {loading.buildings ? (
                            <p className="text-sm text-gray-500">טוען בניינים...</p>
                          ) : hierarchy.buildings.length === 0 ? (
                            <p className="text-sm text-gray-500">לא נמצאו בניינים</p>
                          ) : (
                            hierarchy.buildings.map(building => (
                              <label key={building.id} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded">
                                <input
                                  type="checkbox"
                                  checked={formData.assigned_building_ids.includes(building.id)}
                                  onChange={(e) => handleMultiSelect('assigned_building_ids', building.id, e.target.checked)}
                                  className="w-4 h-4 text-blue-600"
                                />
                                <span className="text-sm">{building.name}</span>
                              </label>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {/* Floors Selection */}
                    {permissions.showFloor && formData.assigned_building_ids.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <Layers className="h-4 w-4" />
                          קומות ({formData.assigned_floor_ids.length} נבחרו)
                        </label>
                        <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto">
                          {loading.floors ? (
                            <p className="text-sm text-gray-500">טוען קומות...</p>
                          ) : hierarchy.floors.length === 0 ? (
                            <p className="text-sm text-gray-500">לא נמצאו קומות</p>
                          ) : (
                            hierarchy.floors.map(floor => (
                              <label key={floor.id} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded">
                                <input
                                  type="checkbox"
                                  checked={formData.assigned_floor_ids.includes(floor.id)}
                                  onChange={(e) => handleMultiSelect('assigned_floor_ids', floor.id, e.target.checked)}
                                  className="w-4 h-4 text-blue-600"
                                />
                                <span className="text-sm">קומה {floor.number}</span>
                              </label>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {/* Units Selection */}
                    {permissions.showUnit && formData.assigned_floor_ids.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <Home className="h-4 w-4" />
                          דירות ({formData.assigned_unit_ids.length} נבחרו)
                        </label>
                        <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto">
                          {loading.units ? (
                            <p className="text-sm text-gray-500">טוען דירות...</p>
                          ) : hierarchy.units.length === 0 ? (
                            <p className="text-sm text-gray-500">לא נמצאו דירות</p>
                          ) : (
                            hierarchy.units.map(unit => (
                              <label key={unit.id} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded">
                                <input
                                  type="checkbox"
                                  checked={formData.assigned_unit_ids.includes(unit.id)}
                                  onChange={(e) => handleMultiSelect('assigned_unit_ids', unit.id, e.target.checked)}
                                  className="w-4 h-4 text-blue-600"
                                />
                                <span className="text-sm">דירה {unit.number}</span>
                              </label>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={onCancel}
              >
                ביטול
              </Button>
              <Button type="submit" variant="primary">
                שלח הזמנה
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const UserForm: React.FC<{
  user?: User | null;
  onSubmit: (userData: any) => void;
  onCancel: () => void;
}> = ({ user, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    email: user?.email || '',
    full_name: user?.full_name || '',
    role: user?.role || 'project_employee',
    phone: user?.phone || '',
    company: user?.company || '',
    is_active: user?.is_active ?? true,
    assigned_project_ids: user?.assigned_project_ids || []
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email.trim() || !formData.full_name.trim()) {
      toast.error('אימייל ושם מלא הם שדות חובה');
      return;
    }
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">
            {user ? 'עריכת משתמש' : 'הוספת משתמש חדש'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  אימייל *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  שם מלא *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData(prev => ({...prev, full_name: e.target.value}))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  תפקיד
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({...prev, role: e.target.value}))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="super_admin">מנהל על</option>
                  <option value="admin">מנהל מערכת</option>
                  <option value="developer">יזם</option>
                  <option value="project_employee">עובד פרויקט</option>
                  <option value="supplier">ספק</option>
                  <option value="viewer">צופה</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  טלפון
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({...prev, phone: e.target.value}))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  חברה
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData(prev => ({...prev, company: e.target.value}))}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({...prev, is_active: e.target.checked}))}
                className="w-4 h-4 text-blue-600"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                משתמש פעיל
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={onCancel}
              >
                ביטול
              </Button>
              <Button type="submit" variant="primary">
                {user ? 'עדכן' : 'הוסף'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export const Users: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser, hasAccess } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showHierarchicalInvite, setShowHierarchicalInvite] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    role: '',
    status: '',
    sortBy: 'full_name',
    sortOrder: 'asc'
  });
  const [invitations, setInvitations] = useState<any[]>([]);
  const [showInvitations, setShowInvitations] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchInvitations();
  }, [filters, searchTerm]);

  // פונקציה לטעינת הזמנות
  const fetchInvitations = async () => {
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select(`
          *,
          invited_by:users!invitations_invited_by_fkey(full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvitations(data || []);
    } catch (error: any) {
    }
  };

  // פונקציה ליצירת הזמנה חדשה
  const handleCreateInvitation = async (userData: any) => {
    try {
      // Prepare hierarchical assignments for the invitation
      const hierarchicalAssignments: any = {};
      if (userData.assigned_developer_id) {
        hierarchicalAssignments.assigned_developer_id = userData.assigned_developer_id;
      }
      if (userData.assigned_project_ids?.length > 0) {
        hierarchicalAssignments.assigned_project_ids = userData.assigned_project_ids;
      }
      if (userData.assigned_building_ids?.length > 0) {
        hierarchicalAssignments.assigned_building_ids = userData.assigned_building_ids;
      }
      if (userData.assigned_floor_ids?.length > 0) {
        hierarchicalAssignments.assigned_floor_ids = userData.assigned_floor_ids;
      }
      if (userData.assigned_unit_ids?.length > 0) {
        hierarchicalAssignments.assigned_unit_ids = userData.assigned_unit_ids;
      }

      const { data, error } = await supabase
        .rpc('create_invitation', {
          p_email: userData.email,
          p_invited_by: currentUser?.id,
          p_role: userData.role,
          p_projects: userData.assigned_project_ids || [],
          p_message: userData.message || `ברוכים הבאים למערכת ניהול השיווק של נדל"ן! אתם מוזמנים להצטרף כ${getRoleText(userData.role)}.`,
          p_user_details: {
            full_name: userData.full_name,
            phone: userData.phone,
            company: userData.company,
            ...hierarchicalAssignments
          }
        });

      if (error) throw error;

      // נוודא שיש לנו invitation_token ולא רק invitation_id
      let invitationToken = data;
      
      // אם data הוא רק ID, נשלוף את הטוקן
      if (data && !data.includes('/') && !data.includes('+') && !data.includes('=')) {
        console.log('נתקבל invitation_id, שולף את invitation_token...');
        const { data: invitationData, error: fetchError } = await supabase
          .from('invitations')
          .select('invitation_token')
          .eq('id', data)
          .single();
        
        if (fetchError) {
          console.error('שגיאה בשליפת invitation_token:', fetchError);
          throw fetchError;
        }
        
        invitationToken = invitationData.invitation_token;
      }

      console.log('Invitation Token:', invitationToken);

      // מחיקת משתמש קיים אם קיים (מקרה של הזמנה מחדש)
      try {
        await supabase.rpc('cleanup_unconfirmed_user', { p_email: userData.email });
      } catch (cleanupError) {
        console.warn('לא הצלחנו למחוק משתמש קיים:', cleanupError);
      }

      // שליחת מייל הזמנה דרך Supabase Auth (יוצר משתמש חדש)
      try {
        const { error: emailError } = await supabase.rpc('send_supabase_invitation', {
          p_email: userData.email,
          p_invitation_token: invitationToken,
          p_user_data: {
            full_name: userData.full_name,
            role: userData.role,
            phone: userData.phone,
            company: userData.company,
            invited_by: currentUser?.full_name || currentUser?.email,
            message: `ברוכים הבאים למערכת ניהול השיווק של נדל"ן! אתם מוזמנים להצטרף כ${getRoleText(userData.role)}.`
          }
        });

        if (emailError) {
          console.warn('שליחת אימייל דרך Supabase נכשלה:', emailError);
          throw emailError;
        }

        toast.success('הזמנה נשלחה בהצלחה באימייל! 📧');
      } catch (emailError) {
        console.warn('שליחת אימייל נכשלה:', emailError);
        // Fallback - קישור ידני
        const invitationUrl = `${window.location.origin}/signup-invitation?invitation=${encodeURIComponent(invitationToken)}`;
        navigator.clipboard.writeText(invitationUrl);
        toast.success('הזמנה נוצרה! הקישור הועתק ללוח - שלחו אותו למוזמן');
        console.log('Invitation URL:', invitationUrl);
      }
      setShowForm(false);
      setShowHierarchicalInvite(false);
      fetchInvitations();
    } catch (error: any) {
      toast.error(error.message || 'שגיאה ביצירת ההזמנה');
    }
  };

  // פונקציה לביטול הזמנה
  const handleCancelInvitation = async (invitationId: string) => {
    if (!confirm('האם אתה בטוח שברצונך לבטל את ההזמנה?')) return;

    try {
      const { error } = await supabase
        .rpc('cancel_invitation', { p_invitation_id: invitationId });

      if (error) throw error;

      toast.success('ההזמנה בוטלה בהצלחה');
      fetchInvitations();
    } catch (error: any) {
      toast.error('שגיאה בביטול ההזמנה');
    }
  };

  // פונקציה לשליחה מחדש של הזמנה
  const handleResendInvitation = async (invitation: any) => {
    try {
      // עדכון תאריך תפוגה של ההזמנה
      const { error } = await supabase
        .rpc('extend_invitation_expiry', { 
          p_invitation_id: invitation.id,
          p_days: 7
        });

      if (error) throw error;

      console.log('Resending invitation with token:', invitation.invitation_token);

            // שליחה מחדש של מייל ההזמנה דרך Supabase Auth
      try {
        const { error: emailError } = await supabase.rpc('send_supabase_invitation', {
          p_email: invitation.email,
          p_invitation_token: invitation.invitation_token,
          p_user_data: {
            full_name: invitation.user_details?.full_name,
            role: invitation.invited_to_role,
            phone: invitation.user_details?.phone,
            company: invitation.user_details?.company,
            invited_by: currentUser?.full_name || currentUser?.email,
            message: `שליחה מחדש - ברוכים הבאים למערכת ניהול השיווק של נדל"ן!`
          }
        });

        if (emailError) {
          console.warn('שליחת אימייל דרך Supabase נכשלה:', emailError);
          throw emailError;
        }

        toast.success('ההזמנה נשלחה מחדש בהצלחה באימייל! 📧');
      } catch (emailError) {
        console.warn('שליחת אימייל נכשלה:', emailError);
        // Fallback - העתקת הקישור
        const invitationUrl = `${window.location.origin}/signup-invitation?invitation=${encodeURIComponent(invitation.invitation_token)}`;
        navigator.clipboard.writeText(invitationUrl);
        toast.success('תוקף ההזמנה הוארך, הקישור הועתק ללוח');
      }
      
      fetchInvitations();
    } catch (error: any) {
      console.error('שגיאה בשליחה מחדש:', error);
      // Fallback - רק העתקת הקישור
      const invitationUrl = `${window.location.origin}/signup-invitation?invitation=${encodeURIComponent(invitation.invitation_token)}`;
      navigator.clipboard.writeText(invitationUrl);
      toast.success('קישור ההזמנה הועתק ללוח');
    }
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('users')
        .select('*');

      // Apply search filter
      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%`);
      }

      // Apply role filter
      if (filters.role) {
        query = query.eq('role', filters.role);
      }

      // Apply status filter
      if (filters.status) {
        query = query.eq('is_active', filters.status === 'active');
      }

      // Apply sorting
      const isAsc = filters.sortOrder === 'asc';
      query = query.order(filters.sortBy, { ascending: isAsc });

      const { data, error } = await query;

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      toast.error('שגיאה בטעינת המשתמשים');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (userData: any) => {
    try {
      if (editingUser) {
        // Update existing user
        const { error } = await supabase
          .from('users')
          .update(userData)
          .eq('id', editingUser.id);

        if (error) throw error;
        toast.success('המשתמש עודכן בהצלחה');
      } else {
        // Create invitation instead of direct user creation
        await handleCreateInvitation(userData);
        return;
      }

      setShowForm(false);
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'שגיאה בשמירת המשתמש');
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setShowForm(true);
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את המשתמש? פעולה זו לא ניתנת לביטול.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      toast.success('המשתמש נמחק בהצלחה');
      fetchUsers();
    } catch (error: any) {
      toast.error('שגיאה במחיקת המשתמש');
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) throw error;
      toast.success(currentStatus ? 'המשתמש הושבת' : 'המשתמש הופעל');
      fetchUsers();
    } catch (error: any) {
      toast.error('שגיאה בעדכון סטטוס המשתמש');
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
      role: '',
      status: '',
      sortBy: 'full_name',
      sortOrder: 'asc'
    });
    setSearchTerm('');
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-red-100 text-red-800';
      case 'developer': return 'bg-blue-100 text-blue-800';
      case 'project_employee': return 'bg-green-100 text-green-800';
      case 'supplier': return 'bg-orange-100 text-orange-800';
      case 'viewer': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'super_admin': return 'מנהל על';
      case 'admin': return 'מנהל מערכת';
      case 'developer': return 'יזם';
      case 'project_employee': return 'עובד פרויקט';
      case 'supplier': return 'ספק';
      case 'viewer': return 'צופה';
      default: return role;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin':
      case 'admin':
        return ShieldCheck;
      case 'developer':
        return Shield;
      default:
        return UsersIcon;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'מעולם לא';
    return new Date(dateString).toLocaleDateString('he-IL');
  };

  // Check if current user can edit other users
  const canEdit = hasAccess('users') && (currentUser?.user_role === 'admin' || currentUser?.user_role === 'super_admin');

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">טוען משתמשים...</div>
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
        <span className="text-gray-900 font-medium">ניהול משתמשים</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ניהול משתמשים</h1>
          <p className="text-gray-600">ניהול כל המשתמשים במערכת</p>
        </div>
        <div className="flex gap-3">
          {canEdit && (
            <>
              <Button
                onClick={() => setShowHierarchicalInvite(true)}
                variant="primary"
                icon={TreePine}
                className="bg-green-600 hover:bg-green-700"
              >
                הזמנה עם שיוך
              </Button>
              <Button
                onClick={() => {
                  setEditingUser(null);
                  setShowForm(true);
                }}
                variant="secondary"
                icon={Plus}
              >
                הזמנה בסיסית
              </Button>
            </>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 ${
              showFilters ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Filter className="h-4 w-4" />
            סינון
          </button>
        </div>
      </div>

      {/* Tabs for Users and Invitations */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex gap-8">
            <button
              onClick={() => setShowInvitations(false)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                !showInvitations
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              משתמשים ({users.length})
            </button>
            <button
              onClick={() => setShowInvitations(true)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                showInvitations
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              הזמנות ממתינות ({invitations.filter(inv => inv.status === 'pending').length})
            </button>
                     </nav>
         </div>
       </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="h-5 w-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="חפש לפי שם, אימייל או חברה..."
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
              {/* Role Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">תפקיד</label>
                <select
                  value={filters.role}
                  onChange={(e) => handleFilterChange('role', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">כל התפקידים</option>
                  <option value="super_admin">מנהל על</option>
                  <option value="admin">מנהל מערכת</option>
                  <option value="developer">יזם</option>
                  <option value="project_employee">עובד פרויקט</option>
                  <option value="supplier">ספק</option>
                  <option value="viewer">צופה</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">סטטוס</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">כל הסטטוסים</option>
                  <option value="active">פעיל</option>
                  <option value="inactive">לא פעיל</option>
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">מיון לפי</label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="full_name">שם</option>
                  <option value="email">אימייל</option>
                  <option value="role">תפקיד</option>
                  <option value="created_at">תאריך יצירה</option>
                  <option value="last_sign_in_at">כניסה אחרונה</option>
                </select>
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">סדר</label>
                <select
                  value={filters.sortOrder}
                  onChange={(e) => handleFilterChange('sortOrder', e.target.value as 'asc' | 'desc')}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="asc">עולה</option>
                  <option value="desc">יורד</option>
                </select>
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

      {/* Invitations List */}
      {showInvitations ? (
        <div className="space-y-4">
          {invitations.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">אין הזמנות ממתינות</h3>
                <p className="text-gray-600">כל ההזמנות שנשלחו מופיעות כאן</p>
              </CardContent>
            </Card>
          ) : (
            invitations.map((invitation) => (
              <Card key={invitation.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Invitation Icon */}
                      <div className="w-12 h-12 rounded-full bg-orange-600 flex items-center justify-center">
                        <Mail className="h-6 w-6 text-white" />
                      </div>

                      {/* Invitation Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {invitation.user_details?.full_name || 'שם לא צוין'}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(invitation.invited_to_role)}`}>
                            {getRoleText(invitation.invited_to_role)}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            invitation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            invitation.status === 'accepted' ? 'bg-green-100 text-green-800' :
                            invitation.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {invitation.status === 'pending' ? 'ממתינה' :
                             invitation.status === 'accepted' ? 'התקבלה' :
                             invitation.status === 'cancelled' ? 'בוטלה' :
                             invitation.status === 'expired' ? 'פגת תוקף' : invitation.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            <span>{invitation.email}</span>
                          </div>

                          <div className="flex items-center gap-1">
                            <UsersIcon className="h-4 w-4" />
                            <span>הוזמן על ידי: {invitation.invited_by?.full_name}</span>
                          </div>

                          <div className="flex items-center gap-1">
                            <span>פג תוקף: {formatDate(invitation.expires_at)}</span>
                          </div>
                        </div>

                        {invitation.message && (
                          <div className="mt-2 text-sm text-gray-600 italic">
                            "{invitation.message}"
                          </div>
                        )}

                        {/* Hierarchical Assignments Display */}
                        <HierarchicalAssignments userDetails={invitation.user_details} />
                      </div>
                    </div>

                    {/* Invitation Actions */}
                    {canEdit && invitation.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleResendInvitation(invitation)}
                          variant="ghost"
                          size="sm"
                          icon={Mail}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          שלח מחדש
                        </Button>

                        <Button
                          onClick={() => handleCancelInvitation(invitation.id)}
                          variant="ghost"
                          size="sm"
                          icon={Trash2}
                          className="text-red-600 hover:text-red-700"
                        >
                          בטל
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        /* Users List */
        <>
          {users.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">לא נמצאו משתמשים</h3>
            <p className="text-gray-600">נסה לשנות את הסינונים או החיפוש</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {users.map((user) => {
            const RoleIcon = getRoleIcon(user.role);
            return (
              <Card key={user.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center">
                        <span className="text-white text-lg font-medium">
                          {user.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                        </span>
                      </div>

                      {/* User Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {user.full_name || 'שם לא צוין'}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                            {getRoleText(user.role)}
                          </span>
                          {!user.is_active && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              לא פעיל
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            <span>{user.email}</span>
                          </div>

                          {user.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-4 w-4" />
                              <span>{user.phone}</span>
                            </div>
                          )}

                          {user.company && (
                            <div className="flex items-center gap-1">
                              <UsersIcon className="h-4 w-4" />
                              <span>{user.company}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-1">
                            <RoleIcon className="h-4 w-4" />
                            <span>כניסה אחרונה: {formatDate(user.last_sign_in_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    {canEdit && (
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleEdit(user)}
                          variant="ghost"
                          size="sm"
                          icon={Edit}
                        >
                          ערוך
                        </Button>

                        <Button
                          onClick={() => toggleUserStatus(user.id, user.is_active)}
                          variant="ghost"
                          size="sm"
                          icon={user.is_active ? UserX : UserCheck}
                          className={user.is_active ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
                        >
                          {user.is_active ? 'השבת' : 'הפעל'}
                        </Button>

                        {user.id !== currentUser?.id && (
                          <Button
                            onClick={() => handleDelete(user.id)}
                            variant="ghost"
                            size="sm"
                            icon={Trash2}
                            className="text-red-600 hover:text-red-700"
                          >
                            מחק
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
        </>
      )}

      {/* User Form Modal */}
      {showForm && (
        <UserForm
          user={editingUser}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingUser(null);
          }}
        />
      )}

      {/* Hierarchical Invite Modal */}
      {showHierarchicalInvite && (
        <HierarchicalInviteForm
          onSubmit={handleCreateInvitation}
          onCancel={() => setShowHierarchicalInvite(false)}
        />
      )}
    </div>
  );
}; 