import fs from 'fs';

let content = fs.readFileSync('styles.css', 'utf8');

// Replace floating delta size
content = content.replace(
  /\.floating-delta \{[\s\S]*?\}/,
  `.floating-delta {
  color: #ff3333;
  font-weight: bold;
  font-size: 1.5rem; /* Made it much bigger */
  pointer-events: none;
  animation: smoke-up 1.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
  z-index: 100;
  white-space: nowrap;
  text-shadow: 0 0 2px rgba(255, 0, 0, 0.8);
}`
);

// We want to force the header grid on mobile to be exactly what user requested:
// Top row: Logo (left), Login (right)
// Bottom row: Stats (centered)

content += `
@media (max-width: 900px) {
  .site-header .container.header-row {
    display: grid !important;
    grid-template-columns: 1fr auto !important;
    grid-template-rows: auto auto !important;
    gap: 0.8rem 0 !important;
    align-items: center !important;
  }
  
  .header-logo {
    grid-column: 1 !important;
    grid-row: 1 !important;
    justify-self: start !important;
    margin-left: 0 !important;
  }
  
  .header-auth {
    grid-column: 2 !important;
    grid-row: 1 !important;
    justify-self: end !important;
    margin-right: 0 !important;
  }
  
  .app-links {
    display: none !important;
  }
  
  .header-stats {
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
`;

fs.writeFileSync('styles.css', content, 'utf8');
