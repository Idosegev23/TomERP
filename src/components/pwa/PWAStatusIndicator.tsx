import React from 'react';
import { Wifi, WifiOff, RefreshCw, Download, Smartphone } from 'lucide-react';
import { usePWA } from '../../hooks/usePWA';

export const PWAStatusIndicator: React.FC = () => {
  const { 
    isOnline, 
    updateAvailable, 
    isInstalled,
    isInstallable,
    updateApp,
    addToHomeScreen
  } = usePWA();

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col gap-2" dir="rtl">
      {/* Online/Offline Status */}
      <div className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300
        ${isOnline 
          ? 'bg-green-100 text-green-800 border border-green-200' 
          : 'bg-red-100 text-red-800 border border-red-200 animate-pulse'
        }
      `}>
        {isOnline ? (
          <>
            <Wifi className="w-3 h-3" />
            <span className="hidden sm:inline">מקוון</span>
          </>
        ) : (
          <>
            <WifiOff className="w-3 h-3" />
            <span className="hidden sm:inline">לא מקוון</span>
          </>
        )}
      </div>

      {/* Update Available */}
      {updateAvailable && (
        <button
          onClick={updateApp}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-full text-xs font-medium hover:bg-blue-700 transition-colors animate-bounce"
        >
          <RefreshCw className="w-3 h-3" />
          <span className="hidden sm:inline">עדכון זמין</span>
        </button>
      )}

      {/* Install Available */}
      {!isInstalled && isInstallable && (
        <button
          onClick={addToHomeScreen}
          className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded-full text-xs font-medium hover:bg-purple-700 transition-colors"
        >
          <Download className="w-3 h-3" />
          <span className="hidden sm:inline">התקן</span>
        </button>
      )}

      {/* PWA Installed Indicator */}
      {isInstalled && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-800 border border-purple-200 rounded-full text-xs font-medium">
          <Smartphone className="w-3 h-3" />
          <span className="hidden sm:inline">מותקן</span>
        </div>
      )}
    </div>
  );
};