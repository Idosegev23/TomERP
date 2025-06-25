import React, { useState, useEffect } from 'react';
import { Calculator, Info, TrendingUp } from 'lucide-react';

interface PricingCalculatorProps {
  unit: {
    id: string;
    apartment_type: string;
    built_area: number;
    garden_balcony_area?: number;
    total_area: number;
    marketing_price?: number;
    linear_price?: number;
    parking_spots?: number;
    storage_rooms?: number;
    room_count?: number;
    direction?: string;
    floor_number?: number;
  };
  onPriceUpdate?: (prices: any) => void;
}

interface PricingFactors {
  floor_factor: number;
  direction_factor: number;
  parking_factor: number;
  storage_factor: number;
  balcony_factor: number;
  apartment_type_factor: number;
  room_count_factor: number;
}

export const PricingCalculator: React.FC<PricingCalculatorProps> = ({ unit, onPriceUpdate }) => {
  const [factors, setFactors] = useState<PricingFactors>({
    floor_factor: 1.0,
    direction_factor: 1.0,
    parking_factor: 1.0,
    storage_factor: 1.0,
    balcony_factor: 1.0,
    apartment_type_factor: 1.0,
    room_count_factor: 1.0
  });

  const [calculatedPrices, setCalculatedPrices] = useState({
    base_price_per_sqm: 0,
    adjusted_price_per_sqm: 0,
    total_adjusted_price: 0,
    equivalent_price_per_sqm: 0,
    premium_discount: 0
  });

  const [basePricePerSqm, setBasePricePerSqm] = useState(25000); // מחיר בסיס למ"ר

  useEffect(() => {
    calculateFactors();
  }, [unit]);

  useEffect(() => {
    calculatePrices();
  }, [factors, basePricePerSqm, unit]);

  const calculateFactors = () => {
    const newFactors: PricingFactors = {
      // גורם קומה - קומות גבוהות יקרות יותר
      floor_factor: getFloorFactor(unit.floor_number || 1),
      
      // גורם כיוון - דרום/מערב יקרים יותר
      direction_factor: getDirectionFactor(unit.direction),
      
      // גורם חניות
      parking_factor: getParkingFactor(unit.parking_spots || 0),
      
      // גורם מחסנים
      storage_factor: getStorageFactor(unit.storage_rooms || 0),
      
      // גורם מרפסת/גן
      balcony_factor: getBalconyFactor(unit.garden_balcony_area || 0, unit.built_area),
      
      // גורם סוג דירה
      apartment_type_factor: getApartmentTypeFactor(unit.apartment_type),
      
      // גורם מספר חדרים
      room_count_factor: getRoomCountFactor(unit.room_count || 2)
    };

    setFactors(newFactors);
  };

  const getFloorFactor = (floor: number): number => {
    if (floor <= 0) return 0.9; // מרתף
    if (floor === 1) return 0.95; // קרקע
    if (floor <= 3) return 1.0; // קומות נמוכות
    if (floor <= 6) return 1.05; // קומות בינוניות
    if (floor <= 10) return 1.1; // קומות גבוהות
    return 1.15; // קומות מאוד גבוהות
  };

  const getDirectionFactor = (direction?: string): number => {
    switch (direction?.toLowerCase()) {
      case 'south':
      case 'דרום': return 1.1;
      case 'west':
      case 'מערב': return 1.05;
      case 'southwest':
      case 'דרום-מערב': return 1.15;
      case 'southeast':
      case 'דרום-מזרח': return 1.08;
      case 'east':
      case 'מזרח': return 1.0;
      case 'north':
      case 'צפון': return 0.95;
      case 'northwest':
      case 'צפון-מערב': return 0.98;
      case 'northeast':
      case 'צפון-מזרח': return 0.92;
      default: return 1.0;
    }
  };

  const getParkingFactor = (parkingSpots: number): number => {
    return 1 + (parkingSpots * 0.08); // כל חניה מוסיפה 8%
  };

  const getStorageFactor = (storageRooms: number): number => {
    return 1 + (storageRooms * 0.05); // כל מחסן מוסיף 5%
  };

  const getBalconyFactor = (balconyArea: number, builtArea: number): number => {
    if (balconyArea <= 0) return 1.0;
    const balconyRatio = balconyArea / builtArea;
    if (balconyRatio > 0.5) return 1.15; // מרפסת גדולה מאוד
    if (balconyRatio > 0.3) return 1.1; // מרפסת גדולה
    if (balconyRatio > 0.15) return 1.05; // מרפסת בינונית
    return 1.02; // מרפסת קטנה
  };

  const getApartmentTypeFactor = (type: string): number => {
    switch (type) {
      case 'penthouse': return 1.3;
      case 'duplex': return 1.15;
      case 'garden': return 1.1;
      case 'mini_penthouse': return 1.2;
      case 'six_plus_room': return 1.05;
      default: return 1.0;
    }
  };

  const getRoomCountFactor = (roomCount: number): number => {
    if (roomCount >= 5) return 1.1;
    if (roomCount === 4) return 1.05;
    if (roomCount === 3) return 1.0;
    if (roomCount === 2) return 0.98;
    if (roomCount === 1) return 0.95;
    return 0.9; // סטודיו
  };

  const calculatePrices = () => {
    // חישוב מקדם משוקלל כולל
    const totalFactor = Object.values(factors).reduce((acc, factor) => acc * factor, 1);
    
    // מחיר מותאם למ"ר
    const adjustedPricePerSqm = basePricePerSqm * totalFactor;
    
    // מחיר כולל מותאם
    const totalAdjustedPrice = adjustedPricePerSqm * unit.built_area;
    
    // מחיר אקוויוולנטי למ"ר (כולל שטח מרפסת)
    const equivalentPricePerSqm = totalAdjustedPrice / unit.total_area;
    
    // אחוז פרמיה/הנחה מהמחיר הבסיסי
    const premiumDiscount = ((totalFactor - 1) * 100);

    const newPrices = {
      base_price_per_sqm: basePricePerSqm,
      adjusted_price_per_sqm: Math.round(adjustedPricePerSqm),
      total_adjusted_price: Math.round(totalAdjustedPrice),
      equivalent_price_per_sqm: Math.round(equivalentPricePerSqm),
      premium_discount: Math.round(premiumDiscount * 100) / 100
    };

    setCalculatedPrices(newPrices);
    
    if (onPriceUpdate) {
      onPriceUpdate(newPrices);
    }
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('he-IL');
  };

  const getFactorColor = (factor: number) => {
    if (factor > 1.05) return 'text-green-600';
    if (factor < 0.95) return 'text-red-600';
    return 'text-gray-600';
  };

  const getFactorLabel = (factor: number) => {
    if (factor > 1.05) return 'פרמיה';
    if (factor < 0.95) return 'הנחה';
    return 'נייטרלי';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Calculator className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">מחשבון תמחור שמאי</h3>
          <p className="text-sm text-gray-600">חישוב מחיר אקוויוולנטי למ"ר על פי נוסחא שמאית</p>
        </div>
      </div>

      {/* Base Price Input */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          מחיר בסיס למ"ר (₪)
        </label>
        <input
          type="number"
          value={basePricePerSqm}
          onChange={(e) => setBasePricePerSqm(parseInt(e.target.value) || 25000)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="25000"
        />
      </div>

      {/* Factors Analysis */}
      <div className="mb-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Info className="h-5 w-5" />
          ניתוח מקדמי התאמה
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">גורם קומה:</span>
              <span className={`text-sm font-medium ${getFactorColor(factors.floor_factor)}`}>
                {factors.floor_factor.toFixed(2)} ({getFactorLabel(factors.floor_factor)})
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">גורם כיוון:</span>
              <span className={`text-sm font-medium ${getFactorColor(factors.direction_factor)}`}>
                {factors.direction_factor.toFixed(2)} ({getFactorLabel(factors.direction_factor)})
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">גורם חניות:</span>
              <span className={`text-sm font-medium ${getFactorColor(factors.parking_factor)}`}>
                {factors.parking_factor.toFixed(2)} ({getFactorLabel(factors.parking_factor)})
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">גורם מחסנים:</span>
              <span className={`text-sm font-medium ${getFactorColor(factors.storage_factor)}`}>
                {factors.storage_factor.toFixed(2)} ({getFactorLabel(factors.storage_factor)})
              </span>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">גורם מרפסת:</span>
              <span className={`text-sm font-medium ${getFactorColor(factors.balcony_factor)}`}>
                {factors.balcony_factor.toFixed(2)} ({getFactorLabel(factors.balcony_factor)})
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">גורם סוג דירה:</span>
              <span className={`text-sm font-medium ${getFactorColor(factors.apartment_type_factor)}`}>
                {factors.apartment_type_factor.toFixed(2)} ({getFactorLabel(factors.apartment_type_factor)})
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">גורם מספר חדרים:</span>
              <span className={`text-sm font-medium ${getFactorColor(factors.room_count_factor)}`}>
                {factors.room_count_factor.toFixed(2)} ({getFactorLabel(factors.room_count_factor)})
              </span>
            </div>
            
            <div className="flex justify-between items-center pt-2 border-t border-gray-200">
              <span className="text-sm font-medium text-gray-900">מקדם כולל:</span>
              <span className={`text-sm font-bold ${getFactorColor(Object.values(factors).reduce((acc, f) => acc * f, 1))}`}>
                {Object.values(factors).reduce((acc, f) => acc * f, 1).toFixed(3)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Calculated Prices */}
      <div className="bg-green-50 p-4 rounded-lg">
        <h4 className="text-md font-semibold text-green-900 mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          תוצאות חישוב
        </h4>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-green-700">מחיר בסיס למ"ר:</span>
            <span className="text-sm font-medium text-green-900">
              ₪{formatNumber(calculatedPrices.base_price_per_sqm)}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-green-700">מחיר מותאם למ"ר:</span>
            <span className="text-sm font-medium text-green-900">
              ₪{formatNumber(calculatedPrices.adjusted_price_per_sqm)}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-green-700">מחיר כולל מותאם:</span>
            <span className="text-sm font-medium text-green-900">
              ₪{formatNumber(calculatedPrices.total_adjusted_price)}
            </span>
          </div>
          
          <div className="flex justify-between items-center pt-2 border-t border-green-200">
            <span className="text-sm font-medium text-green-800">מחיר אקוויוולנטי למ"ר:</span>
            <span className="text-lg font-bold text-green-900">
              ₪{formatNumber(calculatedPrices.equivalent_price_per_sqm)}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-green-700">פרמיה/הנחה:</span>
            <span className={`text-sm font-medium ${calculatedPrices.premium_discount >= 0 ? 'text-green-900' : 'text-red-600'}`}>
              {calculatedPrices.premium_discount >= 0 ? '+' : ''}{calculatedPrices.premium_discount.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Market Comparison */}
      {unit.marketing_price && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-md font-semibold text-blue-900 mb-3">השוואה למחיר שיווקי</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-blue-700">מחיר שיווקי נוכחי:</span>
              <span className="text-sm font-medium text-blue-900">
                ₪{formatNumber(unit.marketing_price)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-blue-700">מחיר מחושב:</span>
              <span className="text-sm font-medium text-blue-900">
                ₪{formatNumber(calculatedPrices.total_adjusted_price)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-blue-200">
              <span className="text-sm font-medium text-blue-800">הפרש:</span>
              <span className={`text-sm font-bold ${
                unit.marketing_price > calculatedPrices.total_adjusted_price ? 'text-red-600' : 'text-green-600'
              }`}>
                ₪{formatNumber(Math.abs(unit.marketing_price - calculatedPrices.total_adjusted_price))}
                ({((unit.marketing_price - calculatedPrices.total_adjusted_price) / calculatedPrices.total_adjusted_price * 100).toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 