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
      title: 'פרויקטים פעילים',
      value: stats.totalProjects.toString(),
      icon: Building,
      trend: `${stats.totalBuildings} בניינים`,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'דירות במערכת',
      value: stats.totalApartments.toString(),
      icon: Home,
      trend: `${stats.availableApartments} זמינות`,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'מכירות',
      value: stats.soldApartments.toString(),
      icon: TrendingUp,
      trend: stats.totalApartments > 0 ? `${Math.round((stats.soldApartments / stats.totalApartments) * 100)}% נמכרו` : '0% נמכרו',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'משימות',
      value: stats.totalTasks.toString(),
      icon: CheckSquare,
      trend: `${stats.openTasks} פתוחות`,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
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
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">לוח הבקרה</h1>
          <p className="text-gray-600">
            שלום {user?.full_name || 'משתמש'}, ברוך הבא למערכת הניהול שלך
          </p>
        </div>
        
        {/* כפתור Debug למפתח */}
        <div className="flex gap-2">
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
          <Button
            onClick={() => navigate('/projects')}
            variant="primary"
            icon={Building}
          >
            נהל פרויקטים
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardStats.map((stat, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {stat.value}
                  </p>
                  <p className="text-sm mt-1 text-gray-500">
                    {stat.trend}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions & Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              פעולות מהירות
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {getQuickActions().map((action, index) => (
                <button
                  key={index}
                  onClick={() => navigate(action.path)}
                  className="w-full text-right p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <action.icon className="h-5 w-5 text-gray-600" />
                    <span>{action.label}</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-600" />
              סיכום ביצועים
            </h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium">משימות הושלמו</span>
                </div>
                <span className="text-lg font-bold text-green-600">
                  {stats.completedTasks}/{stats.totalTasks}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm font-medium">אחוז תפוסה</span>
                </div>
                <span className="text-lg font-bold text-blue-600">
                  {stats.totalApartments > 0 ? Math.round(((stats.totalApartments - stats.availableApartments) / stats.totalApartments) * 100) : 0}%
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-sm font-medium">בניינים פעילים</span>
                </div>
                <span className="text-lg font-bold text-purple-600">
                  {stats.totalBuildings}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}; 