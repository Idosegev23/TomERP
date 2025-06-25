import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldX, ArrowRight, Home, Bug } from 'lucide-react';
import { useAuth } from '../components/auth/AuthContext';

export const Unauthorized: React.FC = () => {
  const navigate = useNavigate();
  const { user, debugCurrentUser } = useAuth();

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'super_admin': return 'מנהל מערכת עליון';
      case 'admin': return 'מנהל מערכת';
      case 'developer': return 'יזם';
      case 'developer_employee': return 'עובד הפרויקט';
      case 'sales_agent': return 'איש מכירות';
      case 'project_employee': return 'עובד פרויקט';
      case 'supplier': return 'ספק';
      case 'lawyer': return 'יועץ משפטי';
      case 'viewer': return 'צופה';
      case 'external_marketing': return 'שיווק חיצוני';
      default: return 'משתמש';
    }
  };

  // Debug current user when page loads
  const handleDebugUser = async () => {
    await debugCurrentUser();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4" dir="rtl">
      <div className="max-w-md w-full text-center bg-white rounded-lg shadow-lg p-8">
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <ShieldX className="h-8 w-8 text-red-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          אין לך הרשאה לגשת לדף זה
        </h1>
        
        <p className="text-gray-600 mb-6">
          הדף שניסית לגשת אליו דורש הרשאות מיוחדות שאין לך כרגע.
        </p>

        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-right">
          <div className="text-sm space-y-2">
            <div>
              <span className="font-medium text-gray-700">המשתמש הנוכחי: </span>
              <span className="text-gray-900">{user?.email || 'לא מחובר'}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">תפקיד: </span>
              <span className="text-gray-900">{getRoleLabel(user?.user_role)}</span>
            </div>
            {user?.full_name && (
              <div>
                <span className="font-medium text-gray-700">שם מלא: </span>
                <span className="text-gray-900">{user.full_name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Debug button for development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-4">
            <button
              onClick={handleDebugUser}
              className="text-xs bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300 flex items-center gap-1 mx-auto"
            >
              <Bug className="h-3 w-3" />
              Debug User Info
            </button>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            חזור לדף הקודם
          </button>
          
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-2 bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Home className="h-4 w-4" />
            דף הבית
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            נדרשת הרשאה נוספת? פנה למנהל המערכת:
          </p>
          <a
            href="mailto:triroars@gmail.com"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            triroars@gmail.com
          </a>
        </div>
      </div>
    </div>
  );
}; 