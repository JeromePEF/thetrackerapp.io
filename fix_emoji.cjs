const fs = require('fs');

const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));

files.forEach(file => {
  let html = fs.readFileSync(file, 'utf8');
  
  html = html.replace(/<text x="50%" y="54%" text-anchor="middle" dominant-baseline="central" font-size="34" fill="#[0-9a-fA-F]+">🏋<\/text>/g, 
                      '<text x="50%" y="50%" dy="0.35em" text-anchor="middle" font-size="32" fill="#fff">🏋️</text>');
                      
  html = html.replace(/<text x="50%" y="54%" text-anchor="middle" dominant-baseline="central" font-size="30" fill="#[0-9a-fA-F]+">🏋<\/text>/g, 
                      '<text x="50%" y="50%" dy="0.35em" text-anchor="middle" font-size="30" fill="#fff">🏋️</text>');

  fs.writeFileSync(file, html);
  console.log("Patched emoji positioning in " + file);
});
