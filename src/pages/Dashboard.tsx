import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardContent, Button } from '../components/ui';
import { 
  Building, 
  Home, 
  Users, 
  TrendingUp, 
  Plus, 
  Database,
  CheckSquare,
  Building2,
  Activity,
  BarChart3,
  ArrowRight,
  AlertCircle,
  FileText,
  CheckCircle,
  Briefcase,
  Target,
  Clock,
  ArrowUp,
  ArrowDown,
  Calendar,
  ChartBar,
  Search,
  Bug
} from 'lucide-react';
import { useAuth } from '../components/auth/AuthContext';
import { supabase } from '../lib/supabase';

interface DashboardStats {
  totalProjects: number;
  totalBuildings: number;
  totalApartments: number;
  soldApartments: number;
  availableApartments: number;
  totalTasks: number;
  completedTasks: number;
  openTasks: number;
}

export const Dashboard: React.FC = () => {
  const { user, loading: authLoading, debugCurrentUser } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    totalBuildings: 0,
    totalApartments: 0,
    soldApartments: 0,
    availableApartments: 0,
    totalTasks: 0,
    completedTasks: 0,
    openTasks: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only fetch stats when user is loaded and available
    if (!authLoading && user) {
      fetchDashboardStats();
    } else if (!authLoading && !user) {
      // User is not logged in, redirect to login
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  const fetchDashboardStats = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null); // Clear any previous errors

      // Fetch projects based on user role
      let projectsQuery = supabase.from('projects').select('id');
      
      // Safe checks for user role
      const userRole = user.user_role;
      const userDeveloperId = user.developer_id;
      const userAssignedProjects = user.assigned_project_ids;

      if (userRole === 'developer' && userDeveloperId) {
        projectsQuery = projectsQuery.eq('developer_id', userDeveloperId);
      } else if (userRole !== 'admin' && userRole !== 'super_admin' && userAssignedProjects) {
        projectsQuery = projectsQuery.in('id', userAssignedProjects);
      } else {
      }

      const { data: projects, error: projectsError } = await projectsQuery;
      
      if (projectsError) {
        throw projectsError;
      }

      const projectIds = projects?.map(p => p.id) || [];

      if (projectIds.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch buildings
      const { data: buildings, error: buildingsError } = await supabase
        .from('buildings')
        .select('id')
        .in('project_id', projectIds);

      if (buildingsError) {
        // Continue with empty buildings array instead of throwing
      }

      const buildingIds = buildings?.map(b => b.id) || [];

      // Fetch floors
      const { data: floors, error: floorsError } = await supabase
        .from('floors')
        .select('id')
        .in('building_id', buildingIds);

      if (floorsError) {
      }

      const floorIds = floors?.map(f => f.id) || [];

      // Fetch apartments  
      const { data: apartments, error: apartmentsError } = await supabase
        .from('apartments')
        .select('status, marketing_price')
        .in('floor_id', floorIds);

      if (apartmentsError) {
      }

      // Fetch tasks
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('status')
        .in('project_id', projectIds);

      if (tasksError) {
      }

      // Calculate stats
      const soldApartments = apartments?.filter(a => a.status === 'sold').length || 0;
      const availableApartments = apartments?.filter(a => a.status === 'available').length || 0;
      const completedTasks = tasks?.filter(t => t.status === 'completed').length || 0;
      const openTasks = tasks?.filter(t => t.status === 'open' || t.status === 'in_progress').length || 0;

      const finalStats = {
        totalProjects: projects?.length || 0,
        totalBuildings: buildings?.length || 0,
        totalApartments: apartments?.length || 0,
        soldApartments,
        availableApartments,
        totalTasks: tasks?.length || 0,
        completedTasks,
        openTasks
      };

      setStats(finalStats);

    } catch (error) {
      setError('שגיאה בטעינת נתוני הדשבורד. אנא נסה לרענן את הדף.');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBasedGreeting = () => {
    switch (user?.user_role) {
      case 'super_admin': return 'ברוך הבא, מנהל מערכת עליון';
      case 'admin': return 'ברוך הבא, מנהל המערכת';
      case 'developer': return 'ברוך הבא, יזם יקר';
      case 'developer_employee': return 'ברוך הבא, עובד הפרויקט';
      case 'sales_agent': return 'ברוך הבא, איש מכירות';
      case 'supplier': return 'ברוך הבא, ספק שותף';
      case 'lawyer': return 'ברוך הבא, יועץ משפטי';
      case 'viewer': return 'ברוך הבא, צופה';
      case 'external_marketing': return 'ברוך הבא, שיווק חיצוני';
      default: return 'ברוך הבא למערכת';
    }
  };

  const getQuickActions = () => {
    const actions = [];
    const userRole = user?.user_role;

    // Admin and Developer actions
    if (userRole === 'admin' || userRole === 'super_admin' || userRole === 'developer') {
      actions.push(
        { label: 'הוסף פרויקט חדש', path: '/projects', icon: Building, color: 'blue' },
        { label: 'נהל יזמים', path: '/developers', icon: Users, color: 'green' }
      );
    }

    // Common actions for all users
    actions.push(
      { label: 'צפה בפרויקטים', path: '/projects', icon: Building2, color: 'purple' }
    );

    // Task actions (not for viewers only)
    if (userRole !== 'viewer') {
      actions.push(
        { label: 'משימות פתוחות', path: '/tasks', icon: CheckSquare, color: 'orange' }
      );
    }

    // File management
    actions.push(
      { label: 'ניהול קבצים', path: '/files', icon: Database, color: 'gray' }
    );

    return actions;
  };

  const dashboardStats = [
    {
      title: '🏗️ פרויקטים פעילים',
      value: stats.totalProjects.toString(),
      icon: Building,
      trend: `${stats.totalBuildings} בניינים`,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      hoverColor: 'hover:bg-blue-100',
      clickPath: '/projects',
      description: 'צפה בכל הפרויקטים שלך'
    },
    {
      title: '🏠 דירות במערכת',
      value: stats.totalApartments.toString(),
      icon: Home,
      trend: `${stats.availableApartments} זמינות`,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      hoverColor: 'hover:bg-green-100',
      clickPath: '/units',
      description: 'נהל את כל הדירות'
    },
    {
      title: '📈 מכירות',
      value: stats.soldApartments.toString(),
      icon: TrendingUp,
      trend: stats.totalApartments > 0 ? `${Math.round((stats.soldApartments / stats.totalApartments) * 100)}% נמכרו` : '0% נמכרו',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      hoverColor: 'hover:bg-purple-100',
      clickPath: '/sales',
      description: 'צפה בנתוני מכירות'
    },
    {
      title: '⚡ משימות',
      value: stats.totalTasks.toString(),
      icon: CheckSquare,
      trend: `${stats.openTasks} פתוחות`,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      hoverColor: 'hover:bg-orange-100',
      clickPath: '/tasks',
      description: 'נהל משימות פתוחות'
    }
  ];

  // הוספתי כפתור Debug למפתח
  const handleDebugUser = async () => {
    await debugCurrentUser();
  };

  // Show loading while auth is loading or dashboard stats are loading
  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex items-center gap-3 text-gray-600">
          <Activity className="h-6 w-6 animate-spin" />
          <span>
            {authLoading ? 'מאמת זהות...' : 'טוען נתוני דשבורד...'}
          </span>
        </div>
      </div>
    );
  }

  // If user is not loaded yet, don't render anything
  if (!user) {
    return null;
  }

  // Show error state
  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center gap-3 text-red-600">
          <AlertCircle className="h-8 w-8" />
          <span className="text-center">{error}</span>
          <Button 
            onClick={() => {
              setError(null);
              fetchDashboardStats();
            }}
            className="mt-2"
          >
            נסה שוב
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6" dir="rtl">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-8 border border-blue-100">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🏢 לוח הבקרה המרכזי
            </h1>
            <p className="text-gray-600 mb-4">
              שלום {user?.full_name || 'משתמש'}, ברוך הבא למערכת הניהול המתקדמת שלך
            </p>
            
            {/* Quick Navigation */}
            <div className="flex flex-wrap gap-2 mb-3">
              <button
                onClick={() => navigate('/projects')}
                className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full text-sm text-blue-700 hover:bg-blue-50 transition-colors border border-blue-200"
              >
                <Building className="h-4 w-4" />
                פרויקטים
              </button>
              <button
                onClick={() => navigate('/tasks')}
                className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full text-sm text-orange-700 hover:bg-orange-50 transition-colors border border-orange-200"
              >
                <CheckSquare className="h-4 w-4" />
                משימות
              </button>
              <button
                onClick={() => navigate('/units')}
                className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full text-sm text-green-700 hover:bg-green-50 transition-colors border border-green-200"
              >
                <Home className="h-4 w-4" />
                דירות
              </button>
              <button
                onClick={() => navigate('/tasks/stages')}
                className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full text-sm text-purple-700 hover:bg-purple-50 transition-colors border border-purple-200"
              >
                <Target className="h-4 w-4" />
                שלבים
              </button>
              <button
                onClick={() => navigate('/files')}
                className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full text-sm text-indigo-700 hover:bg-indigo-50 transition-colors border border-indigo-200"
              >
                <FileText className="h-4 w-4" />
                קבצים
              </button>
              <button
                onClick={() => navigate('/search')}
                className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full text-sm text-gray-700 hover:bg-gray-50 transition-colors border border-gray-200"
              >
                <Search className="h-4 w-4" />
                חיפוש
              </button>
            </div>
            
            {/* System Status */}
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>מערכת פעילה</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>עודכן לאחרונה: {new Date().toLocaleTimeString('he-IL')}</span>
              </div>
              <div className="flex items-center gap-1">
                <Database className="h-3 w-3" />
                <span>רמת נתונים: מלאה</span>
              </div>
            </div>
        </div>
        
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          {process.env.NODE_ENV === 'development' && (
            <Button
              onClick={handleDebugUser}
              variant="secondary"
              icon={Bug}
              className="text-xs"
            >
              Debug User
            </Button>
          )}
            
            <div className="flex gap-2">
              <Button
                onClick={() => navigate('/projects/new')}
                variant="secondary"
                icon={Plus}
                className="text-sm"
              >
                פרויקט חדש
              </Button>
          <Button
            onClick={() => navigate('/projects')}
            variant="primary"
            icon={Building}
                className="text-sm"
          >
            נהל פרויקטים
          </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {dashboardStats.map((stat, index) => (
          <div key={index}>
            <button
              onClick={() => navigate(stat.clickPath)}
              className={`w-full text-right group tap-area`}
            >
              <Card className={`card-mobile hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:scale-105 ${stat.hoverColor} border-2 hover:border-blue-200`}>
            <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600 group-hover:text-gray-800 transition-colors">
                    {stat.title}
                  </p>
                      <p className="text-3xl font-bold text-gray-900 mt-2 group-hover:text-gray-800 transition-colors">
                    {stat.value}
                  </p>
                      <p className="text-sm mt-1 text-gray-500 group-hover:text-gray-600 transition-colors">
                    {stat.trend}
                  </p>
                </div>
                    <div className={`p-3 rounded-lg ${stat.bgColor} group-hover:scale-110 transition-transform`}>
                      <stat.icon className={`h-6 w-6 ${stat.color} group-hover:scale-110 transition-transform`} />
                </div>
              </div>
                  
                  {/* Action Hint */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 group-hover:border-gray-200 transition-colors">
                    <span className="text-xs text-gray-500 group-hover:text-gray-600 transition-colors">
                      {stat.description}
                    </span>
                    <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
                  </div>
            </CardContent>
          </Card>
            </button>
          </div>
        ))}
      </div>

      {/* Project Health Overview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">📊 מצב כללי של המערכת</h2>
              <p className="text-gray-600 text-sm">תמונת מצב מהירה של כל הפעילות</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/reports')}
            className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
          >
            דוח מפורט
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Task Completion Rate */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-100">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-xs text-green-600 font-medium">
                {stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}%
              </span>
            </div>
            <h4 className="text-sm font-medium text-gray-900">השלמת משימות</h4>
            <p className="text-xs text-gray-600 mt-1">
              {stats.completedTasks} מתוך {stats.totalTasks}
            </p>
          </div>

          {/* Sales Rate */}
          <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-4 rounded-lg border border-purple-100">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <span className="text-xs text-purple-600 font-medium">
                {stats.totalApartments > 0 ? Math.round((stats.soldApartments / stats.totalApartments) * 100) : 0}%
              </span>
            </div>
            <h4 className="text-sm font-medium text-gray-900">אחוז מכירות</h4>
            <p className="text-xs text-gray-600 mt-1">
              {stats.soldApartments} נמכרו
            </p>
          </div>

          {/* Occupancy Rate */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-100">
            <div className="flex items-center justify-between mb-2">
              <Home className="h-5 w-5 text-blue-600" />
              <span className="text-xs text-blue-600 font-medium">
                {stats.totalApartments > 0 ? Math.round(((stats.totalApartments - stats.availableApartments) / stats.totalApartments) * 100) : 0}%
              </span>
            </div>
            <h4 className="text-sm font-medium text-gray-900">תפוסה</h4>
            <p className="text-xs text-gray-600 mt-1">
              {stats.totalApartments - stats.availableApartments} תפוסות
            </p>
          </div>

          {/* Active Projects */}
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-4 rounded-lg border border-orange-100">
            <div className="flex items-center justify-between mb-2">
              <Building className="h-5 w-5 text-orange-600" />
              <span className="text-xs text-orange-600 font-medium">
                {stats.totalProjects}
              </span>
            </div>
            <h4 className="text-sm font-medium text-gray-900">פרויקטים</h4>
            <p className="text-xs text-gray-600 mt-1">
              {stats.totalBuildings} בניינים
            </p>
          </div>

          {/* Open Tasks */}
          <div className="bg-gradient-to-br from-red-50 to-pink-50 p-4 rounded-lg border border-red-100">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-xs text-red-600 font-medium">
                {stats.openTasks}
              </span>
            </div>
            <h4 className="text-sm font-medium text-gray-900">משימות פתוחות</h4>
            <p className="text-xs text-gray-600 mt-1">
              דורש תשומת לב
            </p>
          </div>

          {/* Available Units */}
          <div className="bg-gradient-to-br from-gray-50 to-slate-50 p-4 rounded-lg border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="h-5 w-5 text-gray-600" />
              <span className="text-xs text-gray-600 font-medium">
                {stats.availableApartments}
              </span>
            </div>
            <h4 className="text-sm font-medium text-gray-900">יחידות זמינות</h4>
            <p className="text-xs text-gray-600 mt-1">
              מוכנות למכירה
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions & Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              🚀 פעולות מהירות
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              גישה מהירה לכלים החשובים ביותר
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {getQuickActions().map((action, index) => (
                <button
                  key={index}
                  onClick={() => navigate(action.path)}
                  className="w-full text-right p-4 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-blue-50 hover:to-blue-100 rounded-lg transition-all duration-200 flex items-center justify-between group transform hover:scale-102 shadow-sm hover:shadow"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg shadow-sm group-hover:shadow transition-shadow">
                      <action.icon className="h-5 w-5 text-gray-600 group-hover:text-blue-600 transition-colors" />
                    </div>
                    <div className="text-left">
                      <span className="font-medium text-gray-900 group-hover:text-blue-900 transition-colors">{action.label}</span>
                      <div className="text-xs text-gray-500 group-hover:text-blue-600 transition-colors">
                        לחץ לניווט מהיר
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-600" />
                  📈 סיכום ביצועים
            </h3>
                <p className="text-sm text-gray-600 mt-1">
                  מדדי ביצועים מרכזיים
                </p>
              </div>
              <button
                onClick={() => navigate('/analytics')}
                className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1 transition-colors"
              >
                ניתוח מלא
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Tasks Progress */}
              <button
                onClick={() => navigate('/tasks')}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 rounded-lg transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-900">משימות הושלמו</span>
                  </div>
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ 
                        width: `${stats.totalTasks > 0 ? (stats.completedTasks / stats.totalTasks) * 100 : 0}%`
                      }}
                    />
                  </div>
                </div>
                <span className="text-lg font-bold text-green-600 group-hover:scale-110 transition-transform">
                  {stats.completedTasks}/{stats.totalTasks}
                </span>
              </button>
              
              {/* Occupancy Rate */}
              <button
                onClick={() => navigate('/apartments')}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 rounded-lg transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Home className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-900">אחוז תפוסה</span>
                  </div>
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ 
                        width: `${stats.totalApartments > 0 ? ((stats.totalApartments - stats.availableApartments) / stats.totalApartments) * 100 : 0}%`
                      }}
                    />
                  </div>
                </div>
                <span className="text-lg font-bold text-blue-600 group-hover:scale-110 transition-transform">
                  {stats.totalApartments > 0 ? Math.round(((stats.totalApartments - stats.availableApartments) / stats.totalApartments) * 100) : 0}%
                </span>
              </button>
              
              {/* Sales Progress */}
              <button
                onClick={() => navigate('/sales')}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-violet-50 hover:from-purple-100 hover:to-violet-100 rounded-lg transition-all duration-200 group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-medium text-gray-900">אחוז מכירות</span>
                  </div>
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-500 h-2 rounded-full transition-all"
                      style={{ 
                        width: `${stats.totalApartments > 0 ? (stats.soldApartments / stats.totalApartments) * 100 : 0}%`
                      }}
                    />
                  </div>
                </div>
                <span className="text-lg font-bold text-purple-600 group-hover:scale-110 transition-transform">
                  {stats.totalApartments > 0 ? Math.round((stats.soldApartments / stats.totalApartments) * 100) : 0}%
                </span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Smart Insights & Alerts */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Urgent Tasks Alert */}
        {stats.openTasks > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-orange-900">🚨 משימות דורשות תשומת לב</h4>
                  <p className="text-sm text-orange-700">{stats.openTasks} משימות פתוחות</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/tasks?filter=open')}
                className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
              >
                <CheckSquare className="h-4 w-4" />
                טפל במשימות
              </button>
            </CardContent>
          </Card>
        )}

        {/* Sales Opportunity */}
        {stats.availableApartments > 0 && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-green-900">💰 הזדמנויות מכירה</h4>
                  <p className="text-sm text-green-700">{stats.availableApartments} דירות זמינות</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/apartments?filter=available')}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <Home className="h-4 w-4" />
                צפה בדירות זמינות
              </button>
            </CardContent>
          </Card>
        )}

        {/* Performance Insight */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-blue-900">📊 תובנת ביצועים</h4>
                <p className="text-sm text-blue-700">
                  {stats.totalTasks > 0 && stats.completedTasks / stats.totalTasks > 0.8 
                    ? 'ביצועים מעולים!'
                    : stats.totalTasks > 0 && stats.completedTasks / stats.totalTasks > 0.5
                    ? 'ביצועים טובים'
                    : 'ניתן לשפר'
                  }
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/analytics')}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Target className="h-4 w-4" />
              דוח ביצועים מפורט
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Feed */}
      <Card className="mt-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-600" />
              🕐 פעילות אחרונה
            </h3>
            <button
              onClick={() => navigate('/activity')}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
            >
              צפה בהכל
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">מערכת טעונה בהצלחה</p>
                <p className="text-xs text-gray-500">לפני זמן קצר</p>
              </div>
              <Clock className="h-4 w-4 text-gray-400" />
            </div>
            
            {stats.totalProjects > 0 && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {stats.totalProjects} פרויקטים פעילים במערכת
                  </p>
                  <p className="text-xs text-gray-500">מסונכרן</p>
                </div>
                <Building className="h-4 w-4 text-gray-400" />
              </div>
            )}

            {stats.totalTasks > 0 && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {stats.totalTasks} משימות כוללות במערכת
                  </p>
                  <p className="text-xs text-gray-500">
                    {stats.completedTasks} הושלמו, {stats.openTasks} פתוחות
                  </p>
                </div>
                <CheckSquare className="h-4 w-4 text-gray-400" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 