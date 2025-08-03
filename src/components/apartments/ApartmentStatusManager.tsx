import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  X, 
  Save, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Users,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Heart,
  Home,
  Handshake,
  FileText,
  TrendingUp,
  UserPlus,
  PhoneCall,
  CalendarDays,
  Banknote
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Apartment {
  id: string;
  apartment_number: string;
  status: string;
  marketing_price?: number;
  primary_contact_name?: string;
  primary_contact_phone?: string;
  primary_contact_email?: string;
  interested_count?: number;
  last_activity_date?: string;
}

interface Activity {
  id: string;
  activity_type: string;
  activity_date: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  notes?: string;
  amount?: number;
}

interface Appointment {
  id: string;
  appointment_type: string;
  scheduled_date: string;
  status: string;
  contact_name: string;
  contact_phone?: string;
  duration_minutes: number;
  notes?: string;
}

interface ApartmentStatusManagerProps {
  isOpen: boolean;
  onClose: () => void;
  apartment: Apartment;
  onStatusUpdated: () => void;
}

export const ApartmentStatusManager: React.FC<ApartmentStatusManagerProps> = ({
  isOpen,
  onClose,
  apartment,
  onStatusUpdated
}) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'actions' | 'history' | 'appointments'>('actions');

  // States for quick actions
  const [showContactForm, setShowContactForm] = useState(false);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [contactData, setContactData] = useState({
    name: '',
    phone: '',
    email: '',
    notes: ''
  });
  const [appointmentData, setAppointmentData] = useState({
    type: 'visit',
    date: '',
    time: '',
    contact_name: '',
    contact_phone: '',
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, apartment.id]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('apartment_activities')
        .select('*')
        .eq('apartment_id', apartment.id)
        .order('activity_date', { ascending: false });

      if (activitiesError) throw activitiesError;
      setActivities(activitiesData || []);

      // Fetch appointments
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('apartment_appointments')
        .select('*')
        .eq('apartment_id', apartment.id)
        .order('scheduled_date', { ascending: true });

      if (appointmentsError) throw appointmentsError;
      setAppointments(appointmentsData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('שגיאה בטעינת הנתונים');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Status Actions - המגדירים את האינטואיטיביות!
  const statusActions = [
    {
      id: 'inquiry',
      label: '📞 פנייה ראשונית',
      color: 'bg-blue-500 hover:bg-blue-600',
      description: 'לקוח חדש התעניין',
      nextStatus: 'interested',
      action: () => setShowContactForm(true)
    },
    {
      id: 'visit',
      label: '🏠 תיאום ביקור',
      color: 'bg-purple-500 hover:bg-purple-600', 
      description: 'לקוח רוצה לראות את הדירה',
      nextStatus: 'visiting',
      action: () => setShowAppointmentForm(true)
    },
    {
      id: 'negotiate',
      label: '💰 משא ומתן',
      color: 'bg-orange-500 hover:bg-orange-600',
      description: 'התחלת משא ומתן',
      nextStatus: 'negotiating',
      action: () => handleStatusChange('negotiating')
    },
    {
      id: 'reserve',
      label: '⭐ רישום לדירה',
      color: 'bg-yellow-500 hover:bg-yellow-600',
      description: 'לקוח ישם דמי רישום',
      nextStatus: 'reserved',
      action: () => handleReservation()
    },
    {
      id: 'contract',
      label: '📋 חוזה נחתם',
      color: 'bg-green-500 hover:bg-green-600',
      description: 'חוזה קנייה נחתם',
      nextStatus: 'sold',
      action: () => handleContractSigning()
    }
  ];

  const handleQuickAction = async (actionId: string, activityType: string, newStatus?: string) => {
    try {
      // Add activity
      const { error: activityError } = await supabase
        .from('apartment_activities')
        .insert([{
          apartment_id: apartment.id,
          activity_type: activityType,
          contact_name: contactData.name || apartment.primary_contact_name,
          contact_phone: contactData.phone || apartment.primary_contact_phone,
          contact_email: contactData.email || apartment.primary_contact_email,
          notes: contactData.notes
        }]);

      if (activityError) throw activityError;

      // Update status if needed
      if (newStatus) {
        const { error: statusError } = await supabase
          .from('apartments')
          .update({ 
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', apartment.id);

        if (statusError) throw statusError;
      }

      toast.success('הפעולה בוצעה בהצלחה!');
      fetchData();
      onStatusUpdated();
      
      // Reset forms
      setContactData({ name: '', phone: '', email: '', notes: '' });
      setShowContactForm(false);
      
    } catch (error) {
      console.error('Error:', error);
      toast.error('שגיאה בביצוע הפעולה');
    }
  };

  const handleAddContact = async () => {
    if (!contactData.name || !contactData.phone) {
      toast.error('נא למלא שם וטלפון');
      return;
    }
    await handleQuickAction('inquiry', 'inquiry', 'interested');
  };

  const handleScheduleAppointment = async () => {
    if (!appointmentData.date || !appointmentData.time || !appointmentData.contact_name) {
      toast.error('נא למלא את כל השדות הנדרשים');
      return;
    }

    try {
      const scheduledDate = new Date(`${appointmentData.date}T${appointmentData.time}`);
      
      const { error } = await supabase
        .from('apartment_appointments')
        .insert([{
          apartment_id: apartment.id,
          appointment_type: appointmentData.type,
          scheduled_date: scheduledDate.toISOString(),
          contact_name: appointmentData.contact_name,
          contact_phone: appointmentData.contact_phone,
          notes: appointmentData.notes
        }]);

      if (error) throw error;

      // Also add as activity
      await handleQuickAction('visit', 'visit', 'visiting');
      
      setAppointmentData({
        type: 'visit',
        date: '',
        time: '',
        contact_name: '',
        contact_phone: '',
        notes: ''
      });
      setShowAppointmentForm(false);
      
    } catch (error) {
      console.error('Error scheduling appointment:', error);
      toast.error('שגיאה בתיאום הפגישה');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const { error } = await supabase
        .from('apartments')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', apartment.id);

      if (error) throw error;

      toast.success('סטטוס עודכן בהצלחה!');
      onStatusUpdated();
      
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('שגיאה בעדכון הסטטוס');
    }
  };

  const handleReservation = () => {
    // This would open a reservation modal
    toast.info('פונקציית רישום תבוא בשלב הבא');
  };

  const handleContractSigning = () => {
    // This would open a contract modal
    toast.info('פונקציית חוזה תבוא בשלב הבא');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800 border-green-200';
      case 'interested': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'visiting': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'negotiating': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'reserved': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'sold': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available': return '🟢 זמינה למכירה';
      case 'interested': return '🔵 יש מעוניינים';
      case 'visiting': return '🟣 ביקורים מתוכננים';
      case 'negotiating': return '🟠 במשא ומתן';
      case 'reserved': return '🟡 רשומה';
      case 'sold': return '🔴 נמכרה';
      default: return status;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="border-b border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Home className="w-6 h-6 text-blue-600" />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    דירה {apartment.apartment_number}
                  </h2>
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm border ${getStatusColor(apartment.status)}`}>
                    {getStatusLabel(apartment.status)}
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <Users className="w-5 h-5 mx-auto text-blue-600 mb-1" />
                <div className="text-lg font-semibold text-blue-900">{apartment.interested_count || 0}</div>
                <div className="text-xs text-blue-700">מעוניינים</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <DollarSign className="w-5 h-5 mx-auto text-green-600 mb-1" />
                <div className="text-lg font-semibold text-green-900">
                  {apartment.marketing_price ? `₪${apartment.marketing_price.toLocaleString()}` : 'לא הוגדר'}
                </div>
                <div className="text-xs text-green-700">מחיר</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <Calendar className="w-5 h-5 mx-auto text-purple-600 mb-1" />
                <div className="text-lg font-semibold text-purple-900">{appointments.length}</div>
                <div className="text-xs text-purple-700">פגישות</div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'actions', label: '⚡ פעולות מהירות', icon: TrendingUp },
                { id: 'history', label: '📋 היסטוריה', icon: Clock },
                { id: 'appointments', label: '📅 פגישות', icon: Calendar }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[50vh] overflow-y-auto">
            {activeTab === 'actions' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    🚀 מה הצעד הבא?
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {statusActions.map((action) => (
                      <button
                        key={action.id}
                        onClick={action.action}
                        className={`${action.color} text-white p-4 rounded-lg text-right transition-all hover:scale-105 shadow-lg`}
                      >
                        <div className="text-lg font-semibold">{action.label}</div>
                        <div className="text-sm opacity-90 mt-1">{action.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Contact Form */}
                {showContactForm && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-3">📞 פרטי איש קשר</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="שם מלא"
                        value={contactData.name}
                        onChange={(e) => setContactData({ ...contactData, name: e.target.value })}
                        className="px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="tel"
                        placeholder="טלפון"
                        value={contactData.phone}
                        onChange={(e) => setContactData({ ...contactData, phone: e.target.value })}
                        className="px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="email"
                        placeholder="אימייל (אופציונלי)"
                        value={contactData.email}
                        onChange={(e) => setContactData({ ...contactData, email: e.target.value })}
                        className="px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="הערות"
                        value={contactData.notes}
                        onChange={(e) => setContactData({ ...contactData, notes: e.target.value })}
                        className="px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={handleAddContact}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                      >
                        <UserPlus className="w-4 h-4" />
                        הוסף פנייה
                      </button>
                      <button
                        onClick={() => setShowContactForm(false)}
                        className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                      >
                        ביטול
                      </button>
                    </div>
                  </div>
                )}

                {/* Appointment Form */}
                {showAppointmentForm && (
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <h4 className="font-medium text-purple-900 mb-3">🏠 תיאום ביקור</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="שם איש הקשר"
                        value={appointmentData.contact_name}
                        onChange={(e) => setAppointmentData({ ...appointmentData, contact_name: e.target.value })}
                        className="px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                      <input
                        type="tel"
                        placeholder="טלפון"
                        value={appointmentData.contact_phone}
                        onChange={(e) => setAppointmentData({ ...appointmentData, contact_phone: e.target.value })}
                        className="px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                      <input
                        type="date"
                        value={appointmentData.date}
                        onChange={(e) => setAppointmentData({ ...appointmentData, date: e.target.value })}
                        className="px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                      <input
                        type="time"
                        value={appointmentData.time}
                        onChange={(e) => setAppointmentData({ ...appointmentData, time: e.target.value })}
                        className="px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={handleScheduleAppointment}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2"
                      >
                        <CalendarDays className="w-4 h-4" />
                        תאם ביקור
                      </button>
                      <button
                        onClick={() => setShowAppointmentForm(false)}
                        className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                      >
                        ביטול
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">📋 היסטוריית פעילות</h3>
                {activities.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    אין פעילות עדיין
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activities.map((activity) => (
                      <div key={activity.id} className="bg-gray-50 p-4 rounded-lg border">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-full">
                              {activity.activity_type === 'inquiry' && <PhoneCall className="w-4 h-4 text-blue-600" />}
                              {activity.activity_type === 'visit' && <Home className="w-4 h-4 text-purple-600" />}
                              {activity.activity_type === 'negotiating' && <Handshake className="w-4 h-4 text-orange-600" />}
                              {activity.activity_type === 'reservation' && <FileText className="w-4 h-4 text-yellow-600" />}
                              {activity.activity_type === 'sale' && <CheckCircle className="w-4 h-4 text-green-600" />}
                            </div>
                            <div>
                              <div className="font-medium">{activity.contact_name}</div>
                              <div className="text-sm text-gray-600">{activity.contact_phone}</div>
                            </div>
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(activity.activity_date).toLocaleDateString('he-IL')}
                          </div>
                        </div>
                        {activity.notes && (
                          <div className="mt-2 text-sm text-gray-700">
                            {activity.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'appointments' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">📅 פגישות מתוכננות</h3>
                {appointments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    אין פגישות מתוכננות
                  </div>
                ) : (
                  <div className="space-y-3">
                    {appointments.map((appointment) => (
                      <div key={appointment.id} className="bg-white p-4 rounded-lg border shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-full">
                              <Calendar className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                              <div className="font-medium">{appointment.contact_name}</div>
                              <div className="text-sm text-gray-600">{appointment.contact_phone}</div>
                            </div>
                          </div>
                          <div className="text-left">
                            <div className="font-medium">
                              {new Date(appointment.scheduled_date).toLocaleDateString('he-IL')}
                            </div>
                            <div className="text-sm text-gray-600">
                              {new Date(appointment.scheduled_date).toLocaleTimeString('he-IL', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </div>
                          </div>
                        </div>
                        {appointment.notes && (
                          <div className="mt-2 text-sm text-gray-700">
                            {appointment.notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};