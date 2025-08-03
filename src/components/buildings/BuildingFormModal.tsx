import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  X, 
  Save, 
  Building2,
  Layers,
  Home,
  Plus,
  Minus,
  MapPin,
  Zap,
  Car,
  Package,
  AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

interface BuildingFormData {
  name: string;
  description: string;
  building_number: number;
  total_floors: number;
  elevator_count: number;
  has_parking: boolean;
  has_storage: boolean;
  has_ground_floor: boolean;
}

interface FloorConfig {
  floor_number: number;
  name: string;
  units_count: number;
}

interface BuildingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onSuccess: () => void;
  building?: any; // For editing
}

export const BuildingFormModal: React.FC<BuildingFormModalProps> = ({
  isOpen,
  onClose,
  projectId,
  onSuccess,
  building
}) => {
  const [formData, setFormData] = useState<BuildingFormData>({
    name: '',
    description: '',
    building_number: 1,
    total_floors: 4,
    elevator_count: 1,
    has_parking: true,
    has_storage: true,
    has_ground_floor: true
  });

  const [floorsConfig, setFloorsConfig] = useState<FloorConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'building' | 'floors'>('building');

  useEffect(() => {
    if (isOpen) {
      if (building) {
        // Editing existing building
        setFormData({
          name: building.name || '',
          description: building.description || '',
          building_number: building.building_number || 1,
          total_floors: building.total_floors || 4,
          elevator_count: building.elevator_count || 1,
          has_parking: building.has_parking || false,
          has_storage: building.has_storage || false,
          has_ground_floor: true // We'll need to check floors to determine this
        });
        setStep('building'); // Only building details for editing
      } else {
        // New building
        resetForm();
        setStep('building');
      }
    }
  }, [isOpen, building]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      building_number: 1,
      total_floors: 4,
      elevator_count: 1,
      has_parking: true,
      has_storage: true,
      has_ground_floor: true
    });
    setFloorsConfig([]);
    setStep('building');
  };

  const generateFloorsConfig = () => {
    const floors: FloorConfig[] = [];
    
    for (let i = 0; i < formData.total_floors; i++) {
      const floorNumber = formData.has_ground_floor ? i : i + 1;
      const isGroundFloor = formData.has_ground_floor && i === 0;
      
      floors.push({
        floor_number: floorNumber,
        name: isGroundFloor ? 'קומת קרקע' : `קומה ${floorNumber}`,
        units_count: isGroundFloor ? 3 : 4 // Default: 3 for ground, 4 for others
      });
    }
    
    setFloorsConfig(floors);
    setStep('floors');
  };

  const updateFloorUnits = (index: number, units: number) => {
    if (units < 1) return;
    
    setFloorsConfig(prev => 
      prev.map((floor, i) => 
        i === index ? { ...floor, units_count: units } : floor
      )
    );
  };

  const getTotalUnits = () => {
    return floorsConfig.reduce((sum, floor) => sum + floor.units_count, 0);
  };

  const handleBuildingSubmit = () => {
    if (!formData.name.trim()) {
      toast.error('שם הבניין הוא שדה חובה');
      return;
    }

    if (building) {
      // For editing, just update the building
      handleFinalSubmit();
    } else {
      // For new building, proceed to floors configuration
      generateFloorsConfig();
    }
  };

  const handleFinalSubmit = async () => {
    setIsLoading(true);
    try {
      let buildingId: string;

      if (building) {
        // Update existing building
        const { error } = await supabase
          .from('buildings')
          .update({
            name: formData.name,
            description: formData.description || null,
            building_number: formData.building_number,
            total_floors: formData.total_floors,
            elevator_count: formData.elevator_count,
            has_parking: formData.has_parking,
            has_storage: formData.has_storage
          })
          .eq('id', building.id);

        if (error) throw error;
        toast.success('הבניין עודכן בהצלחה');
        onSuccess();
        onClose();
        return;
      }

      // Create new building
      const { data: buildingData, error: buildingError } = await supabase
        .from('buildings')
        .insert({
          name: formData.name,
          description: formData.description || null,
          project_id: projectId,
          building_number: formData.building_number,
          total_floors: formData.total_floors,
          total_units: getTotalUnits(),
          elevator_count: formData.elevator_count,
          has_parking: formData.has_parking,
          has_storage: formData.has_storage
        })
        .select()
        .single();

      if (buildingError) throw buildingError;
      buildingId = buildingData.id;

      // Create floors
      const floorsToInsert = floorsConfig.map(floor => ({
        building_id: buildingId,
        floor_number: floor.floor_number,
        name: floor.name,
        total_units: floor.units_count
      }));

      const { error: floorsError } = await supabase
        .from('floors')
        .insert(floorsToInsert);

      if (floorsError) throw floorsError;

      // Create apartments for each floor
      const apartmentsToInsert = [];
      
      for (const floor of floorsConfig) {
        // Get the created floor ID
        const { data: floorData } = await supabase
          .from('floors')
          .select('id')
          .eq('building_id', buildingId)
          .eq('floor_number', floor.floor_number)
          .single();

        if (floorData) {
          for (let i = 1; i <= floor.units_count; i++) {
            apartmentsToInsert.push({
              floor_id: floorData.id,
              apartment_number: `${floor.floor_number}-${i}`,
              apartment_type: 'three_room', // Default type
              built_area: 90, // Default area
              status: 'available'
            });
          }
        }
      }

      if (apartmentsToInsert.length > 0) {
        const { error: apartmentsError } = await supabase
          .from('apartments')
          .insert(apartmentsToInsert);

        if (apartmentsError) throw apartmentsError;
      }

      toast.success(
        `הבניין נוצר בהצלחה עם ${formData.total_floors} קומות ו-${getTotalUnits()} דירות!`
      );
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating building:', error);
      toast.error('שגיאה ביצירת הבניין');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl">
          {/* Header */}
          <div className="border-b border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="w-6 h-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">
                  {building ? 'עריכת בניין' : 'הוספת בניין חדש'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Step indicator */}
            {!building && (
              <div className="flex items-center gap-2 mt-4">
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                  step === 'building' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  <Building2 className="w-4 h-4" />
                  פרטי בניין
                </div>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                  step === 'floors' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  <Layers className="w-4 h-4" />
                  הגדרת קומות
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {step === 'building' && (
              <div className="space-y-6">
                {/* Building Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    שם הבניין *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="למשל: בניין A"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    תיאור הבניין
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="תיאור מפורט של הבניין"
                  />
                </div>

                {/* Building Configuration Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Building Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      מספר בניין
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.building_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, building_number: parseInt(e.target.value) || 1 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Total Floors */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Layers className="w-4 h-4 inline ml-2" />
                      מספר קומות
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={formData.total_floors}
                      onChange={(e) => setFormData(prev => ({ ...prev, total_floors: parseInt(e.target.value) || 1 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Elevator Count */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Zap className="w-4 h-4 inline ml-2" />
                      מספר מעליות
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={formData.elevator_count}
                      onChange={(e) => setFormData(prev => ({ ...prev, elevator_count: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Ground Floor Checkbox */}
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="has_ground_floor"
                      checked={formData.has_ground_floor}
                      onChange={(e) => setFormData(prev => ({ ...prev, has_ground_floor: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="has_ground_floor" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      יש קומת קרקע (תחשב כ-0)
                    </label>
                  </div>
                </div>

                {/* Features Checkboxes */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-900">מתקנים</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="has_parking"
                        checked={formData.has_parking}
                        onChange={(e) => setFormData(prev => ({ ...prev, has_parking: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="has_parking" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Car className="w-4 h-4" />
                        חניה
                      </label>
                    </div>

                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="has_storage"
                        checked={formData.has_storage}
                        onChange={(e) => setFormData(prev => ({ ...prev, has_storage: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="has_storage" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        מחסנים
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 'floors' && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-800 mb-2">
                    <AlertTriangle className="w-5 h-5" />
                    <h3 className="font-medium">הגדרת דירות לכל קומה</h3>
                  </div>
                  <p className="text-sm text-blue-700">
                    כעת תוכל להגדיר כמה דירות יהיו בכל קומה. 
                    ניתן לערוך את המספרים לפי הצורך של הפרויקט.
                  </p>
                </div>

                {/* Summary */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">סה"כ קומות:</p>
                      <p className="text-xl font-bold text-gray-900">{formData.total_floors}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">סה"כ דירות:</p>
                      <p className="text-xl font-bold text-blue-600">{getTotalUnits()}</p>
                    </div>
                  </div>
                </div>

                {/* Floors Configuration */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-900">קומות ודירות</h3>
                  
                  {floorsConfig.map((floor, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Layers className="w-5 h-5 text-gray-600" />
                          <div>
                            <p className="font-medium text-gray-900">{floor.name}</p>
                            <p className="text-sm text-gray-600">
                              {floor.floor_number === 0 ? 'קומת קרקע' : `קומה מספר ${floor.floor_number}`}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateFloorUnits(index, floor.units_count - 1)}
                            disabled={floor.units_count <= 1}
                            className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          
                          <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1">
                            <Home className="w-4 h-4 text-gray-600" />
                            <span className="font-medium text-gray-900 min-w-[2rem] text-center">
                              {floor.units_count}
                            </span>
                            <span className="text-sm text-gray-600">דירות</span>
                          </div>
                          
                          <button
                            onClick={() => updateFloorUnits(index, floor.units_count + 1)}
                            disabled={floor.units_count >= 20}
                            className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 p-6 flex justify-between gap-3">
            <div className="flex gap-3">
              {step === 'floors' && (
                <button
                  onClick={() => setStep('building')}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  חזור
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                ביטול
              </button>
            </div>
            
            <button
              onClick={step === 'building' ? handleBuildingSubmit : handleFinalSubmit}
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isLoading ? 'שומר...' : (
                step === 'building' 
                  ? (building ? 'שמור שינויים' : 'המשך להגדרת קומות')
                  : 'צור בניין'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};