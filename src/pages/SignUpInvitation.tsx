import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button, Card, CardHeader, CardContent } from '../components/ui';
import { CheckCircle, XCircle, Mail, User, Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

interface Invitation {
  id: string;
  email: string;
  invited_to_role: string;
  invited_to_projects: string[];
  user_details: any;
  expires_at: string;
  status: string;
  message: string;
}

export const SignUpInvitation: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invitationToken = searchParams.get('invitation');

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    phone: '',
    company: ''
  });

  useEffect(() => {
    if (invitationToken) {
      fetchInvitation();
    } else {
      setIsLoading(false);
    }
  }, [invitationToken]);

  const fetchInvitation = async () => {
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('invitation_token', invitationToken)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error) throw error;

      setInvitation(data);
      setFormData(prev => ({
        ...prev,
        email: data.email,
        full_name: data.user_details?.full_name || '',
        phone: data.user_details?.phone || '',
        company: data.user_details?.company || ''
      }));
    } catch (error: any) {
      toast.error('הזמנה לא נמצאה או פגת תוקף');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!invitation) {
      toast.error('הזמנה לא נמצאה');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('הסיסמאות אינן זהות');
      return;
    }

    if (formData.password.length < 8) {
      toast.error('הסיסמה חייבת להכיל לפחות 8 תווים');
      return;
    }

    setIsLoading(true);

    try {
      // יצירת המשתמש באופן אוטומטי דרך Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            role: invitation.invited_to_role,
            phone: formData.phone,
            company: formData.company,
            invitation_id: invitation.id
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // יצירת המשתמש בטבלת users
        const { error: userError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: formData.email,
            full_name: formData.full_name,
            role: invitation.invited_to_role,
            phone: formData.phone,
            company: formData.company,
            assigned_project_ids: invitation.invited_to_projects || []
          });

        if (userError) throw userError;

        // עדכון סטטוס ההזמנה לאושרה
        const { error: invitationError } = await supabase
          .rpc('accept_invitation', {
            p_token: invitationToken,
            p_user_id: authData.user.id
          });

        if (invitationError) {
          // לא נעצור את התהליך אם עדכון ההזמנה נכשל
        }

        toast.success('החשבון נוצר בהצלחה! ברוכים הבאים למערכת');
        navigate('/');
      }
    } catch (error: any) {
      toast.error(error.message || 'שגיאה ביצירת החשבון');
    } finally {
      setIsLoading(false);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8" dir="rtl">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">טוען פרטי הזמנה...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!invitationToken || !invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8" dir="rtl">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <Card>
            <CardContent className="text-center py-12">
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">הזמנה לא תקפה</h2>
              <p className="text-gray-600 mb-6">
                ההזמנה לא נמצאה, פגת תוקף או כבר שומשה.
              </p>
              <Button
                onClick={() => navigate('/login')}
                variant="primary"
              >
                חזור לכניסה למערכת
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8" dir="rtl">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">ברוכים הבאים למערכת!</h2>
          <p className="mt-2 text-gray-600">השלימו את הרשמתכם לפי ההזמנה</p>
        </div>

        <Card>
          <CardHeader>
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">הזמנה תקפה</h3>
              <p className="text-sm text-gray-600 mt-2">
                אתם מוזמנים להצטרף כ{getRoleText(invitation.invited_to_role)}
              </p>
              {invitation.message && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800 italic">"{invitation.message}"</p>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  אימייל
                </label>
                <div className="relative">
                  <Mail className="h-5 w-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  שם מלא *
                </label>
                <div className="relative">
                  <User className="h-5 w-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({...prev, full_name: e.target.value}))}
                    className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  סיסמה *
                </label>
                <div className="relative">
                  <Lock className="h-5 w-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({...prev, password: e.target.value}))}
                    className="w-full pr-10 pl-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">הסיסמה חייבת להכיל לפחות 8 תווים</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  אישור סיסמה *
                </label>
                <div className="relative">
                  <Lock className="h-5 w-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData(prev => ({...prev, confirmPassword: e.target.value}))}
                    className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    טלפון
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({...prev, phone: e.target.value}))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? 'יוצר חשבון...' : 'צור חשבון והצטרף למערכת'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                כבר יש לכם חשבון?{' '}
                <button
                  onClick={() => navigate('/login')}
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  התחברו כאן
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}; 