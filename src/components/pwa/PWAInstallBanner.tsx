import React, { useState } from 'react';
import { X, Download, Smartphone, Wifi, Bell } from 'lucide-react';
import { usePWA } from '../../hooks/usePWA';
import { Card, CardContent } from '../ui';

export const PWAInstallBanner: React.FC = () => {
  const { 
    isInstallable, 
    isInstalled, 
    isOnline, 
    installApp, 
    addToHomeScreen,
    requestNotificationPermission
  } = usePWA();
  
  const [isVisible, setIsVisible] = useState(true);
  const [isInstalling, setIsInstalling] = useState(false);

  // Don't show if already installed or not installable
  if (!isVisible || isInstalled || !isInstallable) {
    return null;
  }

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      const success = await installApp();
      if (success) {
        setIsVisible(false);
        // Request notification permission after install
        setTimeout(() => {
          requestNotificationPermission();
        }, 1000);
      }
    } catch (error) {
      console.error('Install failed:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Remember user dismissed for this session
    sessionStorage.setItem('pwa-banner-dismissed', 'true');
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:bottom-6 md:left-6 md:right-auto md:max-w-md" dir="rtl">
      <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0 shadow-lg">
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">התקן את האפליקציה</h3>
                <p className="text-blue-100 text-sm">נדל"ן Pro במכשיר שלך</p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              aria-label="סגור"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center">
              <div className="w-8 h-8 mx-auto mb-1 p-1.5 bg-white/20 rounded-lg">
                <Download className="w-full h-full" />
              </div>
              <p className="text-xs text-blue-100">התקנה מהירה</p>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 mx-auto mb-1 p-1.5 bg-white/20 rounded-lg">
                <Wifi className="w-full h-full" />
              </div>
              <p className="text-xs text-blue-100">עבודה לא מקוונת</p>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 mx-auto mb-1 p-1.5 bg-white/20 rounded-lg">
                <Bell className="w-full h-full" />
              </div>
              <p className="text-xs text-blue-100">התראות מיידיות</p>
            </div>
          </div>

          {/* Benefits */}
          <div className="bg-white/10 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-50 mb-2">🚀 יתרונות ההתקנה:</p>
            <ul className="text-xs text-blue-100 space-y-1">
              <li>• גישה מהירה מהמסך הראשי</li>
              <li>• עבודה גם ללא אינטרנט</li>
              <li>• התראות על עדכונים חשובים</li>
              <li>• ביצועים מהירים יותר</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleInstall}
              disabled={isInstalling}
              className="flex-1 bg-white text-blue-600 hover:bg-blue-50 disabled:opacity-50 py-2.5 px-4 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
            >
              {isInstalling ? (
                <>
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  מתקין...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  התקן עכשיו
                </>
              )}
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2.5 text-blue-100 hover:text-white hover:bg-white/10 rounded-lg text-sm transition-colors"
            >
              מאוחר יותר
            </button>
          </div>

          {/* Status indicator */}
          <div className="flex items-center justify-center mt-3 gap-2">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-xs text-blue-100">
              {isOnline ? 'מחובר לאינטרנט' : 'לא מקוון'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};