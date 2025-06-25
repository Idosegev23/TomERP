import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Shield, 
  Palette,
  Globe,
  Save,
  Eye,
  EyeOff,
  Moon,
  Sun,
  Monitor,
  Mail,
  Phone,
  Home,
  ChevronRight
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '../components/ui';
import { useAuth } from '../components/auth/AuthContext';
import toast from 'react-hot-toast';

interface UserSettings {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  language: string;
  theme: 'light' | 'dark' | 'system';
  notifications_email: boolean;
  notifications_push: boolean;
  user_role: string;
}

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchUserSettings();
  }, [user]);

  const fetchUserSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setSettings({
        ...data,
        theme: data.theme || 'system',
        language: data.language || 'he',
        notifications_email: data.notifications_email ?? true,
        notifications_push: data.notifications_push ?? true,
      });
    } catch (error) {
      toast.error('שגיאה בטעינת ההגדרות');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: settings.full_name,
          phone: settings.phone,
          language: settings.language,
          theme: settings.theme,
          notifications_email: settings.notifications_email,
          notifications_push: settings.notifications_push,
        })
        .eq('id', user?.id);

      if (error) throw error;

      toast.success('ההגדרות נשמרו בהצלחה');
    } catch (error) {
      toast.error('שגיאה בשמירת ההגדרות');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">שגיאה בטעינת ההגדרות</h2>
          <button
            onClick={fetchUserSettings}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            נסה שוב
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-gray-600 mb-6">
        <Home className="w-4 h-4 ml-2" />
        <span>דף הבית</span>
        <ChevronRight className="w-4 h-4 mx-2" />
        <span className="text-gray-900 font-medium">הגדרות</span>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <SettingsIcon className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">הגדרות המערכת</h1>
          <p className="text-gray-600">נהל את הפרופיל והעדפות המערכת שלך</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-blue-600" />
                <h2 className="text-xl font-semibold">פרטים אישיים</h2>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  שם מלא
                </label>
                <input
                  type="text"
                  value={settings.full_name || ''}
                  onChange={(e) => setSettings(prev => prev ? {...prev, full_name: e.target.value} : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  dir="rtl"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="w-4 h-4 inline ml-2" />
                  כתובת אימייל
                </label>
                <input
                  type="email"
                  value={settings.email}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="w-4 h-4 inline ml-2" />
                  טלפון
                </label>
                <input
                  type="tel"
                  value={settings.phone || ''}
                  onChange={(e) => setSettings(prev => prev ? {...prev, phone: e.target.value} : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="050-1234567"
                  dir="ltr"
                />
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-yellow-600" />
                <h2 className="text-xl font-semibold">התראות</h2>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">התראות אימייל</h3>
                  <p className="text-sm text-gray-500">קבל התראות על אירועים חשובים באימייל</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifications_email}
                    onChange={(e) => setSettings(prev => prev ? {...prev, notifications_email: e.target.checked} : null)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">התראות במערכת</h3>
                  <p className="text-sm text-gray-500">קבל התראות מיידיות בדפדפן</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifications_push}
                    onChange={(e) => setSettings(prev => prev ? {...prev, notifications_push: e.target.checked} : null)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Save Button */}
        <div className="flex justify-center pt-6">
          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-lg"
          >
            <Save className="w-5 h-5" />
            {isSaving ? 'שומר...' : 'שמור הגדרות'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings; 