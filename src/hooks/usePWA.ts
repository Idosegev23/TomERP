import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface PWAInstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  updateAvailable: boolean;
  swRegistration: ServiceWorkerRegistration | null;
}

export const usePWA = () => {
  const [pwaState, setPwaState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isOnline: navigator.onLine,
    updateAvailable: false,
    swRegistration: null
  });

  const [installPrompt, setInstallPrompt] = useState<PWAInstallPrompt | null>(null);

  useEffect(() => {
    // Register Service Worker
    registerServiceWorker();

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as PWAInstallPrompt);
      setPwaState(prev => ({ ...prev, isInstallable: true }));
    };

    // Listen for app installed
    const handleAppInstalled = () => {
      setPwaState(prev => ({ ...prev, isInstalled: true, isInstallable: false }));
      setInstallPrompt(null);
      toast.success('🎉 האפליקציה הותקנה בהצלחה!');
    };

    // Listen for online/offline changes
    const handleOnline = () => {
      setPwaState(prev => ({ ...prev, isOnline: true }));
      toast.success('🌐 חזרת למצב מקוון');
    };

    const handleOffline = () => {
      setPwaState(prev => ({ ...prev, isOnline: false }));
      toast.error('📴 עברת למצב לא מקוון');
    };

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone || 
        document.referrer.includes('android-app://')) {
      setPwaState(prev => ({ ...prev, isInstalled: true }));
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });

        setPwaState(prev => ({ ...prev, swRegistration: registration }));

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setPwaState(prev => ({ ...prev, updateAvailable: true }));
                showUpdateNotification();
              }
            });
          }
        });

        console.log('✅ Service Worker registered successfully');
      } catch (error) {
        console.error('❌ Service Worker registration failed:', error);
      }
    }
  };

  const showUpdateNotification = () => {
    toast.success(
      '🚀 עדכון זמין! גרסה חדשה של האפליקציה זמינה. עדכן עכשיו לגרסה החדשה.',
      {
        duration: 10000,
        position: 'top-center'
      }
    );
  };

  const installApp = async () => {
    if (!installPrompt) return false;

    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('✅ PWA install accepted');
        return true;
      } else {
        console.log('❌ PWA install dismissed');
        return false;
      }
    } catch (error) {
      console.error('❌ PWA install failed:', error);
      return false;
    }
  };

  const updateApp = () => {
    if (pwaState.swRegistration?.waiting) {
      pwaState.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  };

  const shareApp = async (data?: { title?: string; text?: string; url?: string }) => {
    const shareData = {
      title: data?.title || 'נדל"ן Pro',
      text: data?.text || 'מערכת ניהול נדל"ן מתקדמת',
      url: data?.url || window.location.origin
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return true;
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareData.url);
        toast.success('🔗 קישור הועתק ללוח');
        return true;
      }
    } catch (error) {
      console.error('❌ Sharing failed:', error);
      return false;
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast.success('🔔 הודעות הופעלו בהצלחה');
        return true;
      } else {
        toast.error('🔕 הודעות נדחו');
        return false;
      }
    }
    return false;
  };

  const addToHomeScreen = () => {
    if (pwaState.isInstallable && installPrompt) {
      installApp();
    } else if (!pwaState.isInstalled) {
      // Show manual instructions
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isAndroid = /Android/.test(navigator.userAgent);
      
      if (isIOS) {
        toast(
          'להתקנה: לחץ על כפתור השיתוף ↗️ ובחר "הוסף למסך הבית"',
          { duration: 8000, position: 'bottom-center' }
        );
      } else if (isAndroid) {
        toast(
          'להתקנה: לחץ על תפריט הדפדפן ⋮ ובחר "הוסף למסך הבית"',
          { duration: 8000, position: 'bottom-center' }
        );
      } else {
        toast(
          'להתקנה: חפש את הכפתור "התקן" בסרגל הכתובות',
          { duration: 8000, position: 'bottom-center' }
        );
      }
    }
  };

  return {
    ...pwaState,
    installApp,
    updateApp,
    shareApp,
    requestNotificationPermission,
    addToHomeScreen
  };
};