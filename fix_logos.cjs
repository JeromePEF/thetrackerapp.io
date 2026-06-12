const fs = require('fs');

const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));

files.forEach(file => {
  let html = fs.readFileSync(file, 'utf8');
  
  // Replace white fill with black fill for the emoji
  html = html.replace(/<text x="50%" y="54%" text-anchor="middle" dominant-baseline="central" font-size="34" fill="#fff">🏋<\/text>/g, 
                      '<text x="50%" y="54%" text-anchor="middle" dominant-baseline="central" font-size="34" fill="#000">🏋</text>');
                      
  html = html.replace(/<text x="50%" y="54%" text-anchor="middle" dominant-baseline="central" font-size="30" fill="#fff">🏋<\/text>/g, 
                      '<text x="50%" y="54%" text-anchor="middle" dominant-baseline="central" font-size="30" fill="#000">🏋</text>');
                      
  html = html.replace(/<text x="50%" y="54%" text-anchor="middle" dominant-baseline="central" font-size="34">🏋<\/text>/g, 
                      '<text x="50%" y="54%" text-anchor="middle" dominant-baseline="central" font-size="34" fill="#000">🏋</text>');
                      
  html = html.replace(/<text x="50%" y="54%" text-anchor="middle" dominant-baseline="central" font-size="30">🏋<\/text>/g, 
                      '<text x="50%" y="54%" text-anchor="middle" dominant-baseline="central" font-size="30" fill="#000">🏋</text>');

  // Make sure thetrackerapp.io text is white
  html = html.replace(/color: #fff; letter-spacing:/g, 'color: #fff; fill: #fff; letter-spacing:');

  fs.writeFileSync(file, html);
  console.log("Patched logo emoji and text color in " + file);
});
