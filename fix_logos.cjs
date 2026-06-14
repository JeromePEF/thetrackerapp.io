const fs = require('fs');

const indexHtml = fs.readFileSync('index.html', 'utf8');
const logoMatch = indexHtml.match(/<a href="\/" class="header-logo"[\s\S]*?<\/a>/);

if (!logoMatch) {
  console.error("Could not find logo in index.html");
  process.exit(1);
}

const marketingLogo = logoMatch[0];

const authLogo = marketingLogo
  .replace(/class="header-logo"/, 'class="header-logo auth-brand"')
  .replace(/margin:0;?/, '')
  .replace(/style="/, 'style="margin:0; ')
  .replace(/width: 32px; height: 32px;/, 'width: 28px; height: 28px;')
  .replace(/font-size="32"/, 'font-size="28"')
  .replace(/font-size: 20px;/, 'font-size: 18px;');

function patchFile(filePath, isAuth) {
  let html = fs.readFileSync(filePath, 'utf8');
  let patched = false;

  if (isAuth) {
    if (html.match(/<a href="\/" class="header-logo auth-brand"[\s\S]*?<\/a>/)) {
      html = html.replace(/<a href="\/" class="header-logo auth-brand"[\s\S]*?<\/a>/, authLogo);
      patched = true;
    } else if (html.match(/<p class="auth-brand">[\s\S]*?<\/p>/)) {
      html = html.replace(/<p class="auth-brand">[\s\S]*?<\/p>/, authLogo);
      patched = true;
    }
  } else {
    if (html.match(/<a href="\/" class="header-logo"[\s\S]*?<\/a>/)) {
      html = html.replace(/<a href="\/" class="header-logo"[\s\S]*?<\/a>/, marketingLogo);
      patched = true;
    } else if (filePath === 'leaderboard.html' && html.match(/<a class="lb-logo" href="\/">[\s\S]*?<\/a>/)) {
      html = html.replace(/<a class="lb-logo" href="\/">[\s\S]*?<\/a>/, marketingLogo);
      patched = true;
    } else if (filePath === 'trust.html' && html.match(/<a href="\/" class="trust-logo">[\s\S]*?<\/a>/)) {
      html = html.replace(/<a href="\/" class="trust-logo">[\s\S]*?<\/a>/, marketingLogo);
      patched = true;
    }
  }

  if (patched) {
    fs.writeFileSync(filePath, html);
    console.log("Patched logo in " + filePath);
  } else {
    console.log("No logo found to patch in " + filePath);
  }
}

const authFiles = ['dashboard.html', 'login.html', 'authorize.html', 'affiliate/dashboard.html', 'affiliate/connect.html', 'affiliate/signup.html'];

const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));
files.forEach(f => {
  if (f === 'index.html') return;
  patchFile(f, authFiles.includes(f));
});

try {
  const toolsFiles = fs.readdirSync('tools').filter(f => f.endsWith('.html'));
  toolsFiles.forEach(f => patchFile('tools/' + f, false));
} catch(e) {}

try {
  const affiliateFiles = fs.readdirSync('affiliate').filter(f => f.endsWith('.html'));
  affiliateFiles.forEach(f => patchFile('affiliate/' + f, true));
} catch(e) {}

