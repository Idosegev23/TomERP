import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  X, 
  Save, 
  Calculator,
  Building2,
  Compass,
  Car,
  Package,
  Home,
  Layers,
  TrendingUp,
  Settings
} from 'lucide-react';
import toast from 'react-hot-toast';

interface PricingFactors {
  id: string;
  project_id: string;
  floor_factor: number;
  direction_factor: { [key: string]: number };
  parking_factor: number;
  storage_factor: number;
  balcony_garden_factor: number;
  unit_type_factor: { [key: string]: number };
  room_count_factor: { [key: string]: number };
}

interface PricingFactorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export const PricingFactorsModal: React.FC<PricingFactorsModalProps> = ({
  isOpen,
  onClose,
  projectId
}) => {
  const [factors, setFactors] = useState<PricingFactors | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && projectId) {
      fetchPricingFactors();
    }
  }, [isOpen, projectId]);

  const fetchPricingFactors = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('apartment_pricing_factors')
        .select('*')
        .eq('project_id', projectId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        setFactors(data);
      } else {
        // Create default factors
        const defaultFactors: Partial<PricingFactors> = {
          project_id: projectId,
          floor_factor: 1.0,
          direction_factor: {
            north: 1.05,
            south: 0.95,
            east: 1.0,
            west: 0.98,
            northeast: 1.03,
            northwest: 1.02,
            southeast: 1.01,
            southwest: 0.97
          },
          parking_factor: 1.0,
          storage_factor: 1.0,
          balcony_garden_factor: 1.0,
          unit_type_factor: {
            studio: 0.9,
            one_room: 0.95,
            two_room: 1.0,
            three_room: 1.0,
            four_room: 1.05,
            five_room: 1.1,
            six_plus_room: 1.15,
            penthouse: 1.3,
            duplex: 1.2,
            garden: 1.15,
            mini_penthouse: 1.25
          },
          room_count_factor: {
            "1": 0.9,
            "1.5": 0.95,
            "2": 1.0,
            "2.5": 1.02,
            "3": 1.05,
            "3.5": 1.08,
            "4": 1.1,
            "4.5": 1.13,
            "5": 1.15,
            "5.5": 1.18,
            "6": 1.2
          }
        };
        setFactors(defaultFactors as PricingFactors);
      }
    } catch (error) {
      console.error('Error fetching pricing factors:', error);
      toast.error('שגיאה בטעינת מקדמי המחיר');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!factors) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('apartment_pricing_factors')
        .upsert({
          ...factors,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success('מקדמי המחיר נשמרו בהצלחה');
      onClose();
    } catch (error) {
      console.error('Error saving pricing factors:', error);
      toast.error('שגיאה בשמירת מקדמי המחיר');
    } finally {
      setIsSaving(false);
    }
  };

  const updateDirectionFactor = (direction: string, value: number) => {
    if (!factors) return;
    setFactors({
      ...factors,
      direction_factor: {
        ...factors.direction_factor,
        [direction]: value
      }
    });
  };

  const updateUnitTypeFactor = (unitType: string, value: number) => {
    if (!factors) return;
    setFactors({
      ...factors,
      unit_type_factor: {
        ...factors.unit_type_factor,
        [unitType]: value
      }
    });
  };

  const updateRoomCountFactor = (roomCount: string, value: number) => {
    if (!factors) return;
    setFactors({
      ...factors,
      room_count_factor: {
        ...factors.room_count_factor,
        [roomCount]: value
      }
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="border-b border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calculator className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">
                  מקדמי מחיר אקוויוולנטי
                </h2>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <p className="text-gray-600 mt-2">
              עריכת מקדמי התאמה לחישוב מחיר אקוויוולנטי עבור דירות בפרויקט
            </p>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="text-gray-500">טוען...</div>
              </div>
            ) : factors ? (
              <div className="space-y-8">
                {/* Basic Factors */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Layers className="w-4 h-4 inline ml-2" />
                      מקדם קומה
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={factors.floor_factor}
                      onChange={(e) => setFactors({ ...factors, floor_factor: parseFloat(e.target.value) || 1.0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Car className="w-4 h-4 inline ml-2" />
                      מקדם חניה
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={factors.parking_factor}
                      onChange={(e) => setFactors({ ...factors, parking_factor: parseFloat(e.target.value) || 1.0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Package className="w-4 h-4 inline ml-2" />
                      מקדם מחסן
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={factors.storage_factor}
                      onChange={(e) => setFactors({ ...factors, storage_factor: parseFloat(e.target.value) || 1.0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Building2 className="w-4 h-4 inline ml-2" />
                      מקדם מרפסת/גינה
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      value={factors.balcony_garden_factor}
                      onChange={(e) => setFactors({ ...factors, balcony_garden_factor: parseFloat(e.target.value) || 1.0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Direction Factors */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <Compass className="w-5 h-5" />
                    מקדמי כיוון נוף
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(factors.direction_factor).map(([direction, factor]) => (
                      <div key={direction}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {direction === 'north' && '🧭 צפון'}
                          {direction === 'south' && '🧭 דרום'}
                          {direction === 'east' && '🧭 מזרח'}
                          {direction === 'west' && '🧭 מערב'}
                          {direction === 'northeast' && '🧭 צפון מזרח'}
                          {direction === 'northwest' && '🧭 צפון מערב'}
                          {direction === 'southeast' && '🧭 דרום מזרח'}
                          {direction === 'southwest' && '🧭 דרום מערב'}
                        </label>
                        <input
                          type="number"
                          step="0.001"
                          value={factor}
                          onChange={(e) => updateDirectionFactor(direction, parseFloat(e.target.value) || 1.0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Unit Type Factors */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <Home className="w-5 h-5" />
                    מקדמי סוג דירה
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Object.entries(factors.unit_type_factor).map(([unitType, factor]) => (
                      <div key={unitType}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {unitType === 'studio' && '🏠 סטודיו'}
                          {unitType === 'one_room' && '🏠 חד חדרי'}
                          {unitType === 'two_room' && '🏠 דו חדרי'}
                          {unitType === 'three_room' && '🏠 תלת חדרי'}
                          {unitType === 'four_room' && '🏠 ארבע חדרים'}
                          {unitType === 'five_room' && '🏠 חמישה חדרים'}
                          {unitType === 'six_plus_room' && '🏠 שישה חדרים+'}
                          {unitType === 'penthouse' && '🏠 פנטהאוז'}
                          {unitType === 'duplex' && '🏠 דופלקס'}
                          {unitType === 'garden' && '🏠 דירת גן'}
                          {unitType === 'mini_penthouse' && '🏠 מיני פנטהאוז'}
                        </label>
                        <input
                          type="number"
                          step="0.001"
                          value={factor}
                          onChange={(e) => updateUnitTypeFactor(unitType, parseFloat(e.target.value) || 1.0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Room Count Factors */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    מקדמי מספר חדרים
                  </h3>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                    {Object.entries(factors.room_count_factor).map(([roomCount, factor]) => (
                      <div key={roomCount}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {roomCount} חדרים
                        </label>
                        <input
                          type="number"
                          step="0.001"
                          value={factor}
                          onChange={(e) => updateRoomCountFactor(roomCount, parseFloat(e.target.value) || 1.0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-800 mb-2">
                    <Settings className="w-5 h-5" />
                    <h4 className="font-medium">הסבר על מקדמים</h4>
                  </div>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• מקדם 1.0 = מחיר בסיס (ללא שינוי)</li>
                    <li>• מקדם מעל 1.0 = תוספת מחיר (למשל 1.1 = +10%)</li>
                    <li>• מקדם מתחת ל-1.0 = הנחה (למשל 0.9 = -10%)</li>
                    <li>• המקדמים משפיעים על חישוב המחיר האקוויוולנטי בלבד</li>
                  </ul>
                </div>
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              ביטול
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'שומר...' : 'שמור מקדמים'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};