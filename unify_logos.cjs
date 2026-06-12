const fs = require('fs');

const marketingLogoHtml = `          <a href="/" class="header-logo" aria-label="Home" style="display:flex; align-items:center; gap:8px; text-decoration:none;">
            <svg class="logo-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 32px; height: 32px;">
              <circle cx="32" cy="32" r="30.5" fill="transparent" stroke="#38ffd3" stroke-width="3"/>
              <text x="50%" y="54%" text-anchor="middle" dominant-baseline="central" font-size="34" fill="#fff">🏋</text>
            </svg>
            <span class="logo-text-svg" style="font-family: 'Orbitron', sans-serif; font-weight: 700; font-size: 20px; color: #fff; letter-spacing: -0.02em;">thetrackerapp.io</span>
          </a>`;

const authLogoHtml = `        <a href="/" class="header-logo auth-brand" aria-label="Home" style="display:flex; align-items:center; gap:8px; text-decoration:none; margin:0;">
          <svg class="logo-icon" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 28px; height: 28px;">
            <circle cx="32" cy="32" r="30.5" fill="transparent" stroke="#38ffd3" stroke-width="3"/>
            <text x="50%" y="54%" text-anchor="middle" dominant-baseline="central" font-size="30" fill="#fff">🏋</text>
          </svg>
          <span style="font-family: 'Orbitron', sans-serif; font-weight: 700; font-size: 18px; color: #fff; letter-spacing: -0.02em;">thetrackerapp.io</span>
        </a>`;

// Replace plain text headers in marketing pages (blog, press, etc)
const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));

files.forEach(file => {
  let html = fs.readFileSync(file, 'utf8');
  
  if (file === 'dashboard.html' || file === 'login.html' || file === 'authorize.html' || file.startsWith('affiliate/')) {
    // Replace <p class="auth-brand">The Tracker App</p>
    if (html.includes('<p class="auth-brand">The Tracker App</p>')) {
      html = html.replace(/<p class="auth-brand">The Tracker App<\/p>/, authLogoHtml);
      fs.writeFileSync(file, html);
      console.log("Patched auth header in " + file);
    } else if (file === 'dashboard.html') {
      // Fix dashboard which I already patched but text fill might be wrong
      html = html.replace(/<text x="50%" y="54%" text-anchor="middle" dominant-baseline="central" font-size="30">🏋<\/text>/g, 
                          '<text x="50%" y="54%" text-anchor="middle" dominant-baseline="central" font-size="30" fill="#fff">🏋</text>');
      fs.writeFileSync(file, html);
      console.log("Fixed emoji fill in " + file);
    }
  } else {
    // Marketing pages
    if (file === 'index.html') {
      html = html.replace(/<text x="50%" y="54%" text-anchor="middle" dominant-baseline="central" font-size="34">🏋<\/text>/g, 
                          '<text x="50%" y="54%" text-anchor="middle" dominant-baseline="central" font-size="34" fill="#fff">🏋</text>');
      fs.writeFileSync(file, html);
      console.log("Fixed emoji fill in " + file);
    } else if (html.includes('<div class="container header-row">')) {
      // Missing logo entirely
      if (!html.includes('class="header-logo"')) {
        html = html.replace(/<div class="container header-row">/, '<div class="container header-row">\n' + marketingLogoHtml);
        fs.writeFileSync(file, html);
        console.log("Added logo to " + file);
      }
    }
  }
});
