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
  MapPin
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
      const { data, error } = await supabase
        .rpc('create_invitation', {
          p_email: userData.email,
          p_invited_by: currentUser?.id,
          p_role: userData.role,
          p_projects: userData.assigned_project_ids || [],
          p_message: `ברוכים הבאים למערכת ניהול השיווק של נדל"ן! אתם מוזמנים להצטרף כ${getRoleText(userData.role)}.`,
          p_user_details: {
            full_name: userData.full_name,
            phone: userData.phone,
            company: userData.company
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

      // שליחת מייל הזמנה דרך RPC function מותאם (לא יוצר משתמש אוטומטית)
      try {
        const { error: emailError } = await supabase.rpc('send_user_invitation_email', {
          p_invitation_id: data, // זה ה-invitation_id שחזר מ-create_invitation
          p_email: userData.email,
          p_redirect_url: `${window.location.origin}/signup-invitation?invitation=${encodeURIComponent(invitationToken)}`,
          p_email_data: {
            full_name: userData.full_name,
            role: userData.role,
            phone: userData.phone,
            company: userData.company,
            invited_by: currentUser?.full_name || currentUser?.email,
            message: `ברוכים הבאים למערכת ניהול השיווק של נדל"ן! אתם מוזמנים להצטרף כ${getRoleText(userData.role)}.`,
            custom_invitation_token: invitationToken
          }
        });

        if (emailError) {
          console.warn('שליחת אימייל דרך RPC נכשלה:', emailError);
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

            // שליחה מחדש של מייל ההזמנה דרך RPC function מותאם
      try {
        const { error: emailError } = await supabase.rpc('send_user_invitation_email', {
          p_invitation_id: invitation.id,
          p_email: invitation.email,
          p_redirect_url: `${window.location.origin}/signup-invitation?invitation=${encodeURIComponent(invitation.invitation_token)}`,
          p_email_data: {
            full_name: invitation.user_details?.full_name,
            role: invitation.invited_to_role,
            phone: invitation.user_details?.phone,
            company: invitation.user_details?.company,
            invited_by: currentUser?.full_name || currentUser?.email,
            message: `שליחה מחדש - ברוכים הבאים למערכת ניהול השיווק של נדל"ן!`,
            custom_invitation_token: invitation.invitation_token
          }
        });

        if (emailError) {
          console.warn('שליחת אימייל דרך RPC נכשלה:', emailError);
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
            <Button
              onClick={() => {
                setEditingUser(null);
                setShowForm(true);
              }}
              variant="primary"
              icon={Plus}
            >
              הזמן משתמש חדש
            </Button>
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
    </div>
  );
}; 