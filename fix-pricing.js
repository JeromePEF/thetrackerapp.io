import fs from 'fs';

let content = fs.readFileSync('pricing.css', 'utf8');

content = content.replace(
  /\.pricing-hero \{[\s\S]*?text-align: center;[\s\S]*?\}/,
  `.pricing-hero {
  text-align: center;
  margin-bottom: 3rem;
  padding: 2rem 1rem;
}`
);

content = content.replace(
  /\.pricing-hero h1 \{[\s\S]*?\}/,
  `.pricing-hero h1 {
  font-family: "Orbitron", sans-serif;
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 800;
  margin-bottom: 0.75rem;
  background: linear-gradient(135deg, #fff, #38ffd3);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.02em;
}`
);

fs.writeFileSync('pricing.css', content, 'utf8');
