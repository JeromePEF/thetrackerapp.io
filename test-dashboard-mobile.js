import fs from 'fs';

const content = fs.readFileSync('auth-pages.css', 'utf8');
const lines = content.split('\n');
const fixedWidths = [];

for (let i=0; i<lines.length; i++) {
  if (lines[i].match(/min-width:\s*[4-9]\d{2,}px/)) {
    fixedWidths.push({line: i+1, content: lines[i]});
  }
}
console.log("Min widths > 400px:");
console.log(fixedWidths);

const widthRegex = /width:\s*[4-9]\d{2,}px/;
const fixedWidths2 = [];
for (let i=0; i<lines.length; i++) {
  if (lines[i].match(widthRegex)) {
    fixedWidths2.push({line: i+1, content: lines[i]});
  }
}
console.log("Widths > 400px:");
console.log(fixedWidths2);

