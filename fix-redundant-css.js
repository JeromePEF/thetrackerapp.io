import fs from 'fs';

let content = fs.readFileSync('styles.css', 'utf8');

// The file got dirty with multiple appends. Let's use a regex to clean up everything from /* MOBILE FIXES */ to the end.

const mobileFixesIndex = content.indexOf('/* MOBILE FIXES */');
if (mobileFixesIndex !== -1) {
  content = content.substring(0, mobileFixesIndex);
}

// Now append a clean, final version of the mobile fixes.
content += `/* MOBILE FIXES */
@media (max-width: 900px) {
  .site-header {
    padding: 0.5rem 0 0.3rem !important;
  }
  .site-header .container.header-row {
    display: grid !important;
    grid-template-columns: 1fr auto !important;
    grid-template-rows: auto auto !important;
    gap: 0.8rem 0 !important;
    align-items: center !important;
    padding: 0 1rem !important;
    width: 100% !important;
    max-width: 100% !important;
  }
  
  .site-header .header-logo {
    display: flex !important;
    grid-column: 1 !important;
    grid-row: 1 !important;
    justify-self: start !important;
    margin-left: 0 !important;
    padding-left: 0 !important;
  }
  
  .site-header .header-auth {
    display: flex !important;
    grid-column: 2 !important;
    grid-row: 1 !important;
    justify-self: end !important;
    margin-right: 0 !important;
    padding-right: 0 !important;
  }
  
  .site-header .app-links {
    display: none !important;
  }
  
  .site-header .header-stats {
    grid-column: 1 / -1 !important;
    grid-row: 2 !important;
    justify-self: center !important;
    justify-content: center !important;
    text-align: center !important;
    width: 100% !important;
    display: flex !important;
    flex-wrap: wrap !important;
    gap: 0.5rem 0.8rem !important;
  }
}

@media (max-width: 640px) {
  .site-header .container.header-row {
    padding: 0 0.5rem !important;
  }
  
  .consent-row {
    font-size: 0.85rem !important;
    margin-top: 0.7rem !important;
    line-height: 1.5 !important;
    gap: 0.5rem !important;
  }
  
  .consent-row input[type="checkbox"] {
    width: 24px !important;
    height: 24px !important;
    margin-top: 0.1rem !important;
  }
}

/* FLOATING DELTA SMOKE EFFECT */
.floating-delta {
  color: #ff3333;
  font-weight: bold;
  font-size: 2.5rem;
  pointer-events: none;
  animation: smoke-up 1.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
  z-index: 100;
  white-space: nowrap;
  text-shadow: 0 0 4px rgba(255, 0, 0, 0.8);
}

@keyframes smoke-up {
  0% {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
  50% {
    opacity: 0.8;
  }
  100% {
    opacity: 0;
    transform: translateY(-25px) scale(1.1) translateX(5px);
    filter: blur(0);
  }
}
`;

fs.writeFileSync('styles.css', content, 'utf8');
