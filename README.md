# 🏢 Real Estate Marketing Management System

> מערכת ניהול שיווק נדל"ן מתקדמת עם React + TypeScript + Supabase

[![Built with React](https://img.shields.io/badge/React-18.x-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Powered by Supabase](https://img.shields.io/badge/Supabase-Backend-green.svg)](https://supabase.com/)
[![Built with Vite](https://img.shields.io/badge/Vite-6.x-purple.svg)](https://vitejs.dev/)

## 🎯 תיאור המערכת

מערכת ניהול שיווק נדל"ן מתקדמת המיועדת ליזמים, אנשי מכירות ומנהלי פרויקטים. המערכת מאפשרת ניהול מלא של פרויקטים נדל"ניים החל מהיזם ועד לדירה הבודדת.

### 🏗️ ארכיטקטורה היררכית (BIM רך)
```
יזם → פרויקט → בניין → קומה → דירה
```

## ✨ תכונות מרכזיות

### 🏡 ניהול דירות מתקדם
- **מחשבון תמחור שמאי** - נוסחאות מקצועיות עם מקדמי התאמה
- **ניהול מכירות** - מעקב סטטוס, פרטי קונה, תהליך מכירה
- **חיפוש מתקדם** - בכל השדות והפרמטרים
- **מעקב מחירים** - שיווקי, לינארי, 20/80, מחיר סופי

### 📋 מערכת משימות מתקדמת
- **היררכיה אינסופית** - משימות ותת-משימות ללא הגבלה
- **11 שלבי שיווק נדל"ן** - טמפלטים מוכנים לשימוש
- **Kanban Board** - ממשק גרירה ושחרור מתקדם
- **תצוגות מרובות** - עץ, גאנט, קנבן

### 📁 ניהול קבצים וגרסאות
- **17 קטגוריות מוכנות** - תוכניות, אישורים, שיווק, חוזים ועוד
- **ניהול גרסאות** - מעקב אחר כל הגרסאות של קובץ
- **העלאה מרובה** - Drag & Drop לקבצים מרובים
- **תצוגה מקדימה** - לתמונות ומסמכים

### 👥 מערכת הרשאות מתקדמת
- **5 תפקידים** - מנהל מערכת, יזם, עובד יזם, איש מכירות, ספק
- **RLS (Row Level Security)** - אבטחה ברמת שורה
- **הגבלות גישה** - לפי תפקיד ושיוך פרויקטים

### 🎨 חוויית משתמש מעולה
- **ממשק RTL** - תמיכה מלאה בעברית
- **Responsive Design** - מתאים לכל המכשירים
- **Real-time Updates** - עדכונים חיים עם Supabase
- **Toast Notifications** - הודעות ופידבק מיידי

## 🛠️ טכנולוגיות

### Frontend
- **React 18** - ספריית UI מרכזית
- **TypeScript** - טיפוסים סטטיים
- **Vite** - כלי Build מהיר
- **TailwindCSS** - עיצוב utility-first
- **Zustand** - ניהול State
- **React Router** - ניווט
- **i18next** - תרגום ו-RTL

### Backend & Database
- **Supabase** - Backend-as-a-Service
  - PostgreSQL Database
  - Authentication & Authorization
  - Real-time subscriptions
  - File Storage
  - Row Level Security

### UI/UX Components
- **@dnd-kit** - Drag & Drop מתקדם
- **Lucide React** - אייקונים מודרניים
- **React Hot Toast** - התראות
- **React Hook Form** - ניהול טפסים

## 🚀 התקנה והרצה

### דרישות מערכת
- Node.js 18.0.0 או חדש יותר
- npm או yarn
- חיבור לאינטרנט (לSupabase)

### התקנה מקומית
```bash
# Clone the repository
git clone <repository-url>
cd itzikproject

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Configure your Supabase credentials in .env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Start development server
npm run dev
```

### Build לפרודקשן
```bash
# Clean build with all checks
./deploy.sh

# Or manual build
npm run build

# Preview production build
npm run preview
```

## 🔧 הגדרות Supabase

### משתני סביבה נדרשים
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_NAME="Real Estate Marketing Management"
VITE_DEFAULT_LANGUAGE=he
VITE_SUPPORTED_LANGUAGES=he,en
```

### מבנה מסד הנתונים
המערכת משתמשת במבנה נתונים היררכי:
- `developers` - יזמים
- `projects` - פרויקטים
- `buildings` - בניינים
- `floors` - קומות
- `apartments` - דירות
- `tasks` - משימות
- `files` - קבצים

## 📦 Deployment

### Vercel (מומלץ)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Netlify
```bash
# Build first
npm run build

# Deploy
npx netlify deploy --prod --dir=dist
```

### הגדרות Hosting נדרשות
1. **Environment Variables** - הגדר את משתני הסביבה
2. **SPA Redirects** - הגדר redirect ל-`index.html` עבור React Router
3. **SSL Certificate** - הפעל HTTPS
4. **Custom Domain** - הגדר דומיין מותאם אישית

## 📊 ביצועים ואבטחה

### אבטחה
- ✅ Row Level Security (RLS) מופעל
- ✅ JWT Authentication
- ✅ HTTPS Only
- ✅ Environment Variables מוגנות
- ✅ No Console Logs בפרודקשן

### אופטימיזציה
- ✅ Code Splitting אוטומטי
- ✅ Bundle Analysis
- ✅ Image Optimization
- ✅ Lazy Loading
- ✅ Minification

## 🧪 בדיקות ואיכות

### בדיקות זמינות
```bash
# Lint check
npm run lint

# TypeScript check
npm run build

# Security audit
npm audit

# Full deployment check
./deploy.sh
```

## 📈 מוכנות לפרודקשן

### ✅ מה שעובד מעולה
- מערכת אימות והרשאות מלאה
- ניהול דירות עם מחשבון תמחור
- מערכת משימות היררכית
- ניהול קבצים מתקדם
- ממשק RTL מושלם

### ⚠️ דברים לתיקון לפני פרודקשן
- [ ] תיקון שגיאות TypeScript (60 שגיאות)
- [ ] ניקוי Lint Warnings (152 בעיות)
- [ ] הסרת debug statements
- [ ] אופטימיזציה נוספת של bundle

## 🤝 תרומה ופיתוח

### מבנה הפרויקט
```
src/
├── components/      # רכיבים נפוצים
├── pages/          # דפי האפליקציה  
├── hooks/          # Custom hooks
├── stores/         # Zustand stores
├── types/          # TypeScript definitions
└── utils/          # פונקציות עזר
```

### קוד סטנדרטים
- TypeScript Strict Mode
- ESLint + Prettier
- Conventional Commits
- Component-First Architecture

## 📞 תמיכה

לתמיכה טכנית או שאלות, פנה אל המפתח או צור issue בGitHub.

---

**Built with ❤️ for Real Estate Professionals**
