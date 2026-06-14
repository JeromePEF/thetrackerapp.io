const fs = require('fs');
let html = fs.readFileSync('trust.html', 'utf8');
if (!html.includes('trust.js')) {
    html = html.replace('</body>', '  <script type="module" src="src/trust.js"></script>\n  </body>');
    fs.writeFileSync('trust.html', html);
    console.log('Added script tag');
}
