const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    if (fs.statSync(file).isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) { 
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
let changed = 0;

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let originalContent = content;
  
  // Replace the exact div for the K logo in any file
  content = content.replace(/<div className="w-9 h-9 rounded-\[var\(--r-md\)\][^>]+>\s*K\s*<\/div>/g, '<Image src="/logo.png" alt="KUPPET Logo" width={36} height={36} className="rounded-[var(--r-md)] bg-white object-contain p-0.5 shrink-0 shadow-sm border border-black/5" />');
  content = content.replace(/<div className="w-10 h-10 rounded-\[var\(--r-md\)\][^>]+>\s*K\s*<\/div>/g, '<Image src="/logo.png" alt="KUPPET Logo" width={40} height={40} className="rounded-[var(--r-md)] bg-white object-contain p-0.5 shrink-0 shadow-sm border border-black/5" />');
  content = content.replace(/<div className="w-11 h-11 rounded-\[var\(--r-md\)\][^>]+>\s*K\s*<\/div>/g, '<Image src="/logo.png" alt="KUPPET Logo" width={44} height={44} className="rounded-[var(--r-md)] bg-white object-contain p-0.5 shrink-0 shadow-sm border border-black/5" />');
  
  if (content !== originalContent) {
    // Make sure we have the next/image import
    if (!content.includes('import Image from "next/image"')) {
      content = 'import Image from "next/image";\n' + content;
    }
    fs.writeFileSync(f, content);
    console.log('Fixed', f);
    changed++;
  }
});

console.log(`Replaced logo in ${changed} files.`);
