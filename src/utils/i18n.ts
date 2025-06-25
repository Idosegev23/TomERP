import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Basic fallback translations for fast loading
const fallbackTranslations = {
  he: {
    translation: {
      common: {
        save: "שמור",
        cancel: "בטל", 
        delete: "מחק",
        edit: "ערוך",
        create: "צור",
        search: "חפש",
        loading: "טוען...",
        error: "שגיאה",
        success: "הצלחה"
      },
      navigation: {
        dashboard: "דשבורד",
        developers: "יזמים",
        projects: "פרויקטים", 
        buildings: "בניינים",
        tasks: "משימות"
      }
    }
  },
  en: {
    translation: {
      common: {
        save: "Save",
        cancel: "Cancel",
        delete: "Delete",
        edit: "Edit",
        create: "Create",
        search: "Search",
        loading: "Loading...",
        error: "Error",
        success: "Success"
      },
      navigation: {
        dashboard: "Dashboard",
        developers: "Developers",
        projects: "Projects",
        buildings: "Buildings",
        tasks: "Tasks"
      }
    }
  }
};

// Initialize with minimal resources for fast startup
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: fallbackTranslations,
    lng: import.meta.env.VITE_DEFAULT_LANGUAGE || 'he',
    fallbackLng: 'he',
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    
    interpolation: {
      escapeValue: false,
    },
    
    react: {
      useSuspense: false,
    }
  });

// Load full translations asynchronously after initialization
const loadFullTranslations = async () => {
  try {
    const heTranslations = await import('../locales/he.json');
    i18n.addResourceBundle('he', 'translation', heTranslations.default, true, true);
  } catch (error) {
  }
};

// Start loading full translations in background
setTimeout(loadFullTranslations, 100);

// RTL languages
const rtlLanguages = ['he', 'ar'];

// Helper function to check if current language is RTL
export const isRTL = (language?: string) => {
  const currentLng = language || i18n.language;
  return rtlLanguages.includes(currentLng);
};

// Helper function to get text direction
export const getDirection = (language?: string) => {
  return isRTL(language) ? 'rtl' : 'ltr';
};

// Update document direction when language changes
i18n.on('languageChanged', (lng) => {
  const direction = getDirection(lng);
  document.documentElement.setAttribute('dir', direction);
  document.documentElement.setAttribute('lang', lng);
  
  // Update font family for Hebrew
  if (lng === 'he') {
    document.documentElement.style.fontFamily = 'Assistant, Inter, ui-sans-serif, system-ui';
  } else {
    document.documentElement.style.fontFamily = 'Inter, ui-sans-serif, system-ui';
  }
});

// Set initial direction
const initialDirection = getDirection();
document.documentElement.setAttribute('dir', initialDirection);
document.documentElement.setAttribute('lang', i18n.language);

export default i18n; 