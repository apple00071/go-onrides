const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

// List of files that need to be fixed based on the error messages
const filesToFix = [
  'src/app/api/admin/dashboard/stats/route.ts',
  'src/app/api/admin/dashboard/route.ts',
  'src/app/api/admin/login/route.ts',
  'src/app/api/bookings/[id]/return/route.ts',
  'src/app/api/bookings/[id]/route.ts',
  'src/app/api/bookings/route.ts',
  'src/app/api/customers/search/route.ts',
  'src/app/api/customers/[id]/route.ts',
  'src/app/api/payments/[id]/route.ts',
  'src/app/api/payments/route.ts',
  'src/app/api/rentals/[id]/route.ts',
  'src/app/api/test/check-auth-token/route.ts',
  'src/app/api/users/route.ts',
  'src/app/api/worker/dashboard/stats/route.ts'
];

async function fixFile(filePath) {
  try {
    // Read the file
    const content = await readFile(filePath, 'utf8');
    
    // Check if the file contains runtime export via destructuring
    if (content.includes('export { dynamic, runtime }') || 
        content.includes('export { runtime,') || 
        content.includes('export {runtime,') || 
        content.includes('export { runtime }')) {
      
      // Remove runtime from imports if present
      let updatedContent = content.replace(/import\s*{\s*([^}]*),\s*runtime\s*([^}]*)\s*}\s*from\s*['"]@\/app\/api\/config['"];?/g, 
        (match, before, after) => {
          // Keep other imports intact
          return `import { ${before}${after} } from '@/app/api/config';`;
        });
      
      // Replace export destructuring with direct runtime export
      updatedContent = updatedContent.replace(/export\s*{\s*([^}]*),?\s*runtime\s*,?([^}]*)\s*}\s*;?/g, 
        (match, before, after) => {
          const exports = [];
          if (before.trim()) exports.push(before.trim());
          if (after.trim()) exports.push(after.trim());
          
          const exportStatement = exports.length ? `export { ${exports.join(', ')} };` : '';
          return `export const runtime = 'nodejs';\n${exportStatement}`;
        });
      
      // Write the updated content back to the file
      await writeFile(filePath, updatedContent, 'utf8');
      console.log(`✅ Fixed: ${filePath}`);
    } else {
      console.log(`⏭️ Skipped: ${filePath} (no runtime export found)`);
    }
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error);
  }
}

async function main() {
  console.log('Starting to fix runtime export issues...');
  for (const file of filesToFix) {
    await fixFile(file);
  }
  console.log('Completed fixing runtime export issues!');
}

main().catch(console.error); 