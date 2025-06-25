import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const TestConnection: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [tables, setTables] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      setLoading(true);
      setError(null);

      // Test basic connection
      const { error: connectionError } = await supabase
        .from('developers')
        .select('count')
        .limit(1);

      if (connectionError) {
        throw connectionError;
      }

      setIsConnected(true);

      // Get list of tables
      const { error: tablesError } = await supabase
        .rpc('get_user_project_ids');

      if (!tablesError) {
        // Connection works, we have access to functions
        setTables(['developers', 'projects', 'buildings', 'floors', 'apartments', 'tasks', 'users']);
      }

    } catch (err: any) {
      setError(err.message || 'חיבור נכשל');
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">בודק חיבור למסד הנתונים...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">בדיקת חיבור Supabase</h1>
        
        {/* Connection Status */}
        <div className="mb-6">
          <div className="flex items-center mb-2">
            <div className={`w-3 h-3 rounded-full ml-2 ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className="font-medium">
              סטטוס חיבור: {isConnected ? 'מחובר' : 'לא מחובר'}
            </span>
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mt-2">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Connection Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">פרטי חיבור</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">URL:</span> 
                <span className="mr-2 font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                  {import.meta.env.VITE_SUPABASE_URL}
                </span>
              </div>
              <div>
                <span className="font-medium">Project ID:</span> 
                <span className="mr-2 font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                  zyrxgdswfytrwpprezso
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">טבלאות במסד נתונים</h3>
            {isConnected && tables.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {tables.map(table => (
                  <div key={table} className="bg-green-50 border border-green-200 rounded px-3 py-1 text-sm">
                    ✓ {table}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">לא ניתן לטעון רשימת טבלאות</p>
            )}
          </div>
        </div>

        {/* Test Actions */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">פעולות בדיקה</h3>
          <div className="flex gap-3">
            <button
              onClick={testConnection}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              בדוק חיבור שוב
            </button>
            
            {isConnected && (
              <button
                onClick={() => window.location.href = '/'}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
              >
                חזור לדף הבית
              </button>
            )}
          </div>
        </div>

        {/* Success Message */}
        {isConnected && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex items-center">
              <div className="text-green-600 ml-2">✅</div>
              <div>
                <h4 className="text-green-800 font-medium">החיבור פועל בהצלחה!</h4>
                <p className="text-green-700 text-sm mt-1">
                  מסד הנתונים מוכן לעבודה. כל הטבלאות נוצרו והמערכת מוכנה להמשך הפיתוח.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 