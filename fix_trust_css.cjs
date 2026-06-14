const fs = require('fs');

let css = fs.readFileSync('trust.css', 'utf8');

// remove trust-logo CSS
css = css.replace(/\.trust-logo \{[\s\S]*?\}/, '');

fs.writeFileSync('trust.css', css);
console.log("Fixed trust.css");
