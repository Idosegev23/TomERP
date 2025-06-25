const fs = require('fs');
const path = require('path');

// פונקציה לתיקון קבצים
function fixFile(filePath) {
  try {
    console.log(`מתקן קובץ: ${filePath}`);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // תיקון אובייקטים שבורים שנוצרו מהסרת console.log
    content = content.replace(/(\s+)(\w+:\s*[^,\}\]]+,?\s*\n)(\s+)(\w+:\s*[^,\}\]]+,?\s*\n)*(\s*\}\);)/g, (match, spaces, line, ...rest) => {
      // אם יש אובייקט שבור, נסיר אותו
      return '';
    });
    
    // תיקון אובייקטים תלויים
    content = content.replace(/(\s+)(\w+:\s*[^,\}\]]+,?\s*\n)+(\s*\}\);)/g, '');
    
    // תיקון שגיאות syntax ספציפיות
    content = content.replace(/userRole: user\?\.[^,}]+,?\s*\n\s*userEmail: user\?\.[^,}]+\s*\n\s*\}\);/g, '');
    content = content.replace(/(\w+):\s*([^,}]+),?\s*\n(\s*\w+):\s*([^,}]+),?\s*\n(\s*\w+):\s*([^,}]+)\s*\n\s*\}\);/g, '');
    
    // הסרת אובייקטים שבורים נוספים
    content = content.replace(/\s+\w+:\s*[^,\}]+,?\s*\n(\s+\w+:\s*[^,\}]+,?\s*\n)*\s*\}\);/g, '');
    
    // תיקון try-catch שבורים
    content = content.replace(/\}\s*catch\s*\(/g, '} catch (');
    content = content.replace(/\s*\}\s*catch\s*\(/g, ' } catch (');
    
    // הסרת שורות ריקות מיותרות
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ תוקן בהצלחה: ${filePath}`);
  } catch (error) {
    console.error(`❌ שגיאה בתיקון ${filePath}:`, error.message);
  }
}

// קבצים לתיקון
const files = [
  'src/components/auth/AuthContext.tsx',
  'src/components/tasks/TaskViews.tsx', 
  'src/hooks/useTasks.ts',
  'src/pages/Files.tsx',
  'src/pages/ProjectDetails.tsx',
  'src/pages/Units.tsx'
];

console.log('🔧 מתחיל תיקון קבצים...');
files.forEach(fixFile);
console.log('✅ סיים תיקון קבצים'); 