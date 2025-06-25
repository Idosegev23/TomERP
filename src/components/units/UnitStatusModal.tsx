import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  X, 
  User, 
  Phone, 
  Mail, 
  DollarSign, 
  Calendar, 
  Clock,
  AlertTriangle,
  CheckCircle,
  Building,
  FileText,
  Percent,
  TrendingUp,
  Calculator
} from 'lucide-react';
import toast from 'react-hot-toast';

interface UnitStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  unit: any;
  onUpdate: () => void;
}

interface SalesAgent {
  id: string;
  full_name: string;
  phone?: string;
  email?: string;
}

interface StatusChange {
  old_status: string;
  new_status: string;
  notes?: string;
  changed_by: string;
  changed_at: string;
}

export const UnitStatusModal: React.FC<UnitStatusModalProps> = ({ 
  isOpen, 
  onClose, 
  unit, 
  onUpdate 
}) => {
  const [formData, setFormData] = useState({
    status: '',
    sales_agent_id: '',
    reserved_until: '',
    sold_date: '',
    marketing_price: '',
    linear_price: '',
    payment_plan_20_80_price: '',
    discount_percentage: '',
    final_price: '',
    primary_contact_name: '',
    primary_contact_phone: '',
    primary_contact_email: '',
    secondary_contact_name: '',
    secondary_contact_phone: '',
    secondary_contact_email: '',
    notes: '',
    special_features: [] as string[],
    commission_percentage: '',
    expected_closing_date: '',
    contract_date: '',
    deposit_amount: '',
    financing_approved: false,
    lawyer_contact: '',
    status_notes: ''
  });

  const [salesAgents, setSalesAgents] = useState<SalesAgent[]>([]);
  const [statusHistory, setStatusHistory] = useState<StatusChange[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pricePerSqm, setPricePerSqm] = useState({
    marketing: 0,
    linear: 0,
    final: 0
  });

  useEffect(() => {
    if (isOpen && unit) {
      loadData();
    }
  }, [isOpen, unit]);

  useEffect(() => {
    calculatePrices();
  }, [formData.marketing_price, formData.linear_price, formData.final_price, formData.discount_percentage]);

  const loadData = async () => {
    try {
      // Load unit data
      setFormData({
        status: unit.status || 'available',
        sales_agent_id: unit.sales_agent_id || '',
        reserved_until: unit.reserved_until || '',
        sold_date: unit.sold_date || '',
        marketing_price: unit.marketing_price?.toString() || '',
        linear_price: unit.linear_price?.toString() || '',
        payment_plan_20_80_price: unit.payment_plan_20_80_price?.toString() || '',
        discount_percentage: unit.discount_percentage?.toString() || '0',
        final_price: unit.final_price?.toString() || '',
        primary_contact_name: unit.primary_contact_name || '',
        primary_contact_phone: unit.primary_contact_phone || '',
        primary_contact_email: unit.primary_contact_email || '',
        secondary_contact_name: unit.secondary_contact_name || '',
        secondary_contact_phone: unit.secondary_contact_phone || '',
        secondary_contact_email: unit.secondary_contact_email || '',
        notes: unit.notes || '',
        special_features: unit.special_features || [],
        commission_percentage: unit.commission_percentage?.toString() || '2',
        expected_closing_date: unit.expected_closing_date || '',
        contract_date: unit.contract_date || '',
        deposit_amount: unit.deposit_amount?.toString() || '',
        financing_approved: unit.financing_approved || false,
        lawyer_contact: unit.lawyer_contact || '',
        status_notes: ''
      });

      // Load sales agents
      const { data: agentsData, error: agentsError } = await supabase
        .from('user_profiles')
        .select('id, full_name, phone, email')
        .in('role', ['sales_agent', 'project_manager'])
        .eq('is_active', true);

      if (agentsError) throw agentsError;
      setSalesAgents(agentsData || []);

      // Load status history
      const { data: historyData, error: historyError } = await supabase
        .from('unit_status_history')
        .select('*')
        .eq('unit_id', unit.id)
        .order('changed_at', { ascending: false })
        .limit(10);

      if (historyError) throw historyError;
      setStatusHistory(historyData || []);

    } catch (error) {
      toast.error('שגיאה בטעינת הנתונים');
    }
  };

  const calculatePrices = () => {
    const marketingPrice = parseFloat(formData.marketing_price) || 0;
    const linearPrice = parseFloat(formData.linear_price) || 0;
    const discountPercentage = parseFloat(formData.discount_percentage) || 0;
    const totalArea = unit.total_area || unit.built_area || 1;

    // Calculate final price with discount
    const finalPrice = marketingPrice * (1 - discountPercentage / 100);
    
    // Update final price field
    if (discountPercentage > 0) {
      setFormData(prev => ({
        ...prev,
        final_price: finalPrice.toString()
      }));
    }

    // Calculate price per square meter
    setPricePerSqm({
      marketing: marketingPrice / totalArea,
      linear: linearPrice / totalArea,
      final: finalPrice / totalArea
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const updateData = {
        status: formData.status,
        sales_agent_id: formData.sales_agent_id || null,
        reserved_until: formData.reserved_until || null,
        sold_date: formData.sold_date || null,
        marketing_price: formData.marketing_price ? parseFloat(formData.marketing_price) : null,
        linear_price: formData.linear_price ? parseFloat(formData.linear_price) : null,
        payment_plan_20_80_price: formData.payment_plan_20_80_price ? parseFloat(formData.payment_plan_20_80_price) : null,
        discount_percentage: formData.discount_percentage ? parseFloat(formData.discount_percentage) : 0,
        final_price: formData.final_price ? parseFloat(formData.final_price) : null,
        primary_contact_name: formData.primary_contact_name || null,
        primary_contact_phone: formData.primary_contact_phone || null,
        primary_contact_email: formData.primary_contact_email || null,
        secondary_contact_name: formData.secondary_contact_name || null,
        secondary_contact_phone: formData.secondary_contact_phone || null,
        secondary_contact_email: formData.secondary_contact_email || null,
        notes: formData.notes || null,
        special_features: formData.special_features,
        commission_percentage: formData.commission_percentage ? parseFloat(formData.commission_percentage) : 2,
        expected_closing_date: formData.expected_closing_date || null,
        contract_date: formData.contract_date || null,
        deposit_amount: formData.deposit_amount ? parseFloat(formData.deposit_amount) : null,
        financing_approved: formData.financing_approved,
        lawyer_contact: formData.lawyer_contact || null,
        updated_at: new Date().toISOString()
      };

      // Update apartment
      const { error: updateError } = await supabase
        .from('apartments')
        .update(updateData)
        .eq('id', unit.id);

      if (updateError) throw updateError;

      // Add status change to history if status changed
      if (formData.status !== unit.status) {
        const { error: historyError } = await supabase
          .from('unit_status_history')
          .insert([{
            unit_id: unit.id,
            old_status: unit.status,
            new_status: formData.status,
            notes: formData.status_notes,
            changed_by: (await supabase.auth.getUser()).data.user?.id,
            changed_at: new Date().toISOString()
          }]);

        if (historyError) throw historyError;
      }

      toast.success('הדירה עודכנה בהצלחה');
      onUpdate();
      onClose();
    } catch (error) {
      toast.error('שגיאה בעדכון הדירה');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'text-green-600 bg-green-50';
      case 'reserved': return 'text-orange-600 bg-orange-50';
      case 'sold': return 'text-blue-600 bg-blue-50';
      case 'unavailable': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available': return 'זמינה';
      case 'reserved': return 'שמורה';
      case 'sold': return 'נמכרה';
      case 'unavailable': return 'לא זמינה';
      default: return status;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h3 className="text-lg font-semibold">ניהול מכירה - דירה {unit?.apartment_number}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Status Section */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-md font-semibold mb-4 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              סטטוס דירה
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">סטטוס</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="available">זמינה</option>
                  <option value="reserved">שמורה</option>
                  <option value="sold">נמכרה</option>
                  <option value="unavailable">לא זמינה</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">איש מכירות</label>
                <select
                  value={formData.sales_agent_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, sales_agent_id: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">בחר איש מכירות</option>
                  {salesAgents.map(agent => (
                    <option key={agent.id} value={agent.id}>{agent.full_name}</option>
                  ))}
                </select>
              </div>

              {formData.status === 'reserved' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">שמורה עד</label>
                  <input
                    type="date"
                    value={formData.reserved_until}
                    onChange={(e) => setFormData(prev => ({ ...prev, reserved_until: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {formData.status === 'sold' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">תאריך מכירה</label>
                  <input
                    type="date"
                    value={formData.sold_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, sold_date: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">הערות לשינוי סטטוס</label>
                <textarea
                  value={formData.status_notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, status_notes: e.target.value }))}
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="הערות על השינוי..."
                />
              </div>
            </div>
          </div>

          {/* Pricing Section */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="text-md font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              תמחור ותנאים
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">מחיר שיווקי</label>
                <input
                  type="number"
                  value={formData.marketing_price}
                  onChange={(e) => setFormData(prev => ({ ...prev, marketing_price: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
                {pricePerSqm.marketing > 0 && (
                  <p className="text-xs text-gray-600 mt-1">
                    {pricePerSqm.marketing.toLocaleString()} ₪/מ״ר
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">מחיר לינארי</label>
                <input
                  type="number"
                  value={formData.linear_price}
                  onChange={(e) => setFormData(prev => ({ ...prev, linear_price: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
                {pricePerSqm.linear > 0 && (
                  <p className="text-xs text-gray-600 mt-1">
                    {pricePerSqm.linear.toLocaleString()} ₪/מ״ר
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">מחיר 20/80</label>
                <input
                  type="number"
                  value={formData.payment_plan_20_80_price}
                  onChange={(e) => setFormData(prev => ({ ...prev, payment_plan_20_80_price: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">אחוז הנחה</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.discount_percentage}
                  onChange={(e) => setFormData(prev => ({ ...prev, discount_percentage: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">מחיר סופי</label>
                <input
                  type="number"
                  value={formData.final_price}
                  onChange={(e) => setFormData(prev => ({ ...prev, final_price: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
                {pricePerSqm.final > 0 && (
                  <p className="text-xs text-gray-600 mt-1">
                    {pricePerSqm.final.toLocaleString()} ₪/מ״ר
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">אחוז עמלה</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.commission_percentage}
                  onChange={(e) => setFormData(prev => ({ ...prev, commission_percentage: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="2"
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="text-md font-semibold mb-4 flex items-center gap-2">
              <User className="h-5 w-5" />
              פרטי קשר
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">איש קשר ראשי</label>
                <input
                  type="text"
                  value={formData.primary_contact_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, primary_contact_name: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="שם מלא"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">טלפון ראשי</label>
                <input
                  type="tel"
                  value={formData.primary_contact_phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, primary_contact_phone: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="050-1234567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">אימייל ראשי</label>
                <input
                  type="email"
                  value={formData.primary_contact_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, primary_contact_email: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="example@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">איש קשר משני</label>
                <input
                  type="text"
                  value={formData.secondary_contact_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, secondary_contact_name: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="שם מלא"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">טלפון משני</label>
                <input
                  type="tel"
                  value={formData.secondary_contact_phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, secondary_contact_phone: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="050-1234567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">אימייל משני</label>
                <input
                  type="email"
                  value={formData.secondary_contact_email}
                  onChange={(e) => setFormData(prev => ({ ...prev, secondary_contact_email: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="example@email.com"
                />
              </div>
            </div>
          </div>

          {/* Sales Process */}
          {(formData.status === 'reserved' || formData.status === 'sold') && (
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="text-md font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                תהליך מכירה
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">תאריך חוזה</label>
                  <input
                    type="date"
                    value={formData.contract_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, contract_date: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">תאריך סגירה צפוי</label>
                  <input
                    type="date"
                    value={formData.expected_closing_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, expected_closing_date: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">סכום דמי קידמה</label>
                  <input
                    type="number"
                    value={formData.deposit_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, deposit_amount: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">עורך דין</label>
                  <input
                    type="text"
                    value={formData.lawyer_contact}
                    onChange={(e) => setFormData(prev => ({ ...prev, lawyer_contact: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="פרטי עורך דין"
                  />
                </div>

                <div className="col-span-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.financing_approved}
                      onChange={(e) => setFormData(prev => ({ ...prev, financing_approved: e.target.checked }))}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-700">מימון אושר</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">הערות כלליות</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={4}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="הערות נוספות..."
            />
          </div>

          {/* Status History */}
          {statusHistory.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-md font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                היסטוריית שינויים
              </h4>
              <div className="space-y-2">
                {statusHistory.map((change, index) => (
                  <div key={index} className="flex items-center justify-between py-2 px-3 bg-white rounded border">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded text-xs ${getStatusColor(change.old_status)}`}>
                        {getStatusLabel(change.old_status)}
                      </span>
                      <span>→</span>
                      <span className={`px-2 py-1 rounded text-xs ${getStatusColor(change.new_status)}`}>
                        {getStatusLabel(change.new_status)}
                      </span>
                      {change.notes && (
                        <span className="text-sm text-gray-600">- {change.notes}</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(change.changed_at).toLocaleDateString('he-IL')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'שומר...' : 'שמור שינויים'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}; 