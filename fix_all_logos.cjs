const fs = require('fs');

const indexHtml = fs.readFileSync('index.html', 'utf8');
const logoMatch = indexHtml.match(/<a href="\/" class="header-logo"[\s\S]*?<\/a>/);

const marketingLogo = logoMatch[0];

const authLogo = marketingLogo
  .replace(/class="header-logo"/, 'class="header-logo auth-brand"')
  .replace(/margin:0;?/, '')
  .replace(/style="/, 'style="margin:0; ')
  .replace(/width: 32px; height: 32px;/, 'width: 28px; height: 28px;')
  .replace(/font-size="32"/, 'font-size="28"')
  .replace(/font-size: 20px;/, 'font-size: 18px;');

function forcePatch(filePath, isAuth) {
  let html = fs.readFileSync(filePath, 'utf8');
  let patched = false;
  
  const logoToUse = isAuth ? authLogo : marketingLogo;

  if (html.match(/<a[^>]*class="[^"]*logo[^"]*"[^>]*>[\s\S]*?<\/a>/)) {
    // If it has *any* link with 'logo' in the class, replace it
    html = html.replace(/<a[^>]*class="[^"]*(header-logo|auth-brand|trust-logo|lb-logo)[^"]*"[^>]*>[\s\S]*?<\/a>/, logoToUse);
    patched = true;
  } else if (html.match(/<div class="container header-row">/)) {
    // If it has no logo but has the header-row, inject it
    html = html.replace(/<div class="container header-row">\s*/, '<div class="container header-row">\n          ' + logoToUse + '\n          ');
    patched = true;
  }

  if (patched) {
    fs.writeFileSync(filePath, html);
    console.log("Force patched logo in " + filePath);
  }
}

const authFiles = ['dashboard.html', 'login.html', 'authorize.html', 'affiliate/dashboard.html', 'affiliate/connect.html', 'affiliate/signup.html'];

const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));
files.forEach(f => {
  if (f === 'index.html') return;
  forcePatch(f, authFiles.includes(f));
});

try {
  const toolsFiles = fs.readdirSync('tools').filter(f => f.endsWith('.html'));
  toolsFiles.forEach(f => forcePatch('tools/' + f, false));
} catch(e) {}

try {
  const affiliateFiles = fs.readdirSync('affiliate').filter(f => f.endsWith('.html'));
  affiliateFiles.forEach(f => forcePatch('affiliate/' + f, true));
} catch(e) {}

