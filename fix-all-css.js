import fs from 'fs';

let styles = fs.readFileSync('styles.css', 'utf8');

// Fix floating delta size
styles = styles.replace(/font-size: 1\.5rem; \/\* Made it much bigger \*\//, 'font-size: 2.5rem; /* Massive */');
styles = styles.replace(/font-size: 0\.9em;/, 'font-size: 2.5rem;'); // in case the old one is there

// Ensure header is laid out exactly as requested
styles += `
@media (max-width: 900px) {
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
    grid-column: 1 !important;
    grid-row: 1 !important;
    justify-self: start !important;
    margin-left: 0 !important;
    padding-left: 0 !important;
  }
  
  .site-header .header-auth {
    grid-column: 2 !important;
    grid-row: 1 !important;
    justify-self: end !important;
    margin-right: 0 !important;
    padding-right: 0 !important;
    display: flex !important;
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
  .site-header {
    padding-left: 0 !important;
    padding-right: 0 !important;
  }
}
`;

fs.writeFileSync('styles.css', styles, 'utf8');

