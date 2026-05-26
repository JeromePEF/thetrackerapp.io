import"./modulepreload-polyfill-BQdWdB5M.js";import{n as e}from"./feature-flags-BBgfJO6n.js";var t=document.getElementById(`pricingContainer`),n=document.getElementById(`pricingSubtitle`);function r(e){return String(e||``).replace(/Tier$/i,``).replace(/([a-z])([A-Z])/g,`$1-$2`).toLowerCase()}function i(e){let t=Number(e);return Number.isFinite(t)?t%1==0?`$${t}`:`$${t.toFixed(2)}`:`—`}function a(e){let t=Number(e);return Number.isFinite(t)?t%1==0?`$${t}`:`$${t.toFixed(2)}`:null}function o(e){return String(e??``).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`)}function s(){t&&(c(),setInterval(c,300*1e3))}async function c(){try{l((await e())?.billing||{})}catch(e){console.warn(`Failed to load pricing:`,e),t.innerHTML=`
      <div class="pricing-error">
        Pricing is temporarily unavailable. Please refresh in a moment — or
        email <a href="mailto:contact@thetrackerapp.io">contact@thetrackerapp.io</a>.
      </div>
    `}}function l(e){let r=Object.entries(e).map(([e,t])=>({key:e,...t})).filter(e=>e&&typeof e==`object`&&e.price!=null).filter(e=>typeof e.tierType==`string`&&e.tierType).filter(e=>!(e.interval||``).toLowerCase().startsWith(`week`));if(!r.length){t.innerHTML=`
      <div class="pricing-error">
        No pricing plans are configured. Set <code>billing.*Tier.tierType</code>
        in the backend control panel to surface a plan here.
      </div>
    `,n&&(n.textContent=``);return}let i=r.find(e=>e.tierType===`base`&&(e.interval||``).startsWith(`month`)),a=r.find(e=>e.tierType===`base`&&(e.interval||``).startsWith(`year`));if(n)if(i&&a){let e=d(i.price,a.price);n.textContent=e?`One plan. Pay monthly, or save ${e}% with yearly.`:`Simple, transparent pricing.`}else n.textContent=`Simple, transparent pricing.`;let o=e=>({base:0,pro:1,premium:2,enterprise:3})[e.tierType]??99,s=e=>(e.interval||``).startsWith(`year`)?1:(e.interval||``).startsWith(`month`)?0:2,c=e=>r.find(t=>t.tierType===e.tierType&&(t.interval||``).startsWith(`month`)),l=r.slice().sort((e,t)=>o(e)-o(t)||s(e)-s(t)),f=l.map(e=>u(e,{monthlyForComparison:c(e)})).join(``);t.innerHTML=`
    <div class="pricing-cards-row pricing-cards-row-${l.length}">${f}</div>
  `}function u(e,{monthlyForComparison:t}){let n=(e.interval||``).startsWith(`year`),s=(e.interval||``).startsWith(`month`),c=(e.interval||``).startsWith(`week`),l=null,u=null,f=null;n&&t?.price&&(l=d(t.price,e.price),u=Number(t.price)*12-Number(e.price),f=Number.isFinite(Number(e.yearlyEquivalent))&&Number(e.yearlyEquivalent)>0?Number(e.yearlyEquivalent):Number(e.price)/12);let p=e.interval?`/${e.interval}`:``,m=r(e.key),h=`Start ${(e.name||e.key||``).replace(/Tier$/i,``)}`.trim(),g=l!=null&&l>0;return`
    <article class="pricing-card pricing-card-${o(e.tierType||`default`)} ${g?`pricing-card-featured`:``}" data-tier="${o(e.key)}" data-tier-type="${o(e.tierType||``)}" data-stripe="${o(e.stripePriceId||``)}">
      ${g?`<div class="featured-badge">Save ${l}%</div>`:``}
      <div class="card-header">
        <h3 class="tier-name">${o(e.name||e.key)}</h3>
        <div class="tier-price">
          <span class="price-amount">${i(e.price)}</span>
          <span class="price-period">${o(p)}</span>
        </div>
        ${n&&f?`<p class="tier-desc">${o(a(f))}/mo billed annually${u>0?` · <strong>save ${o(i(u))}/year</strong>`:``}</p>`:s?`<p class="tier-desc">Billed monthly — cancel anytime</p>`:c?`<p class="tier-desc">Billed weekly — pause anytime</p>`:``}
      </div>
      <ul class="tier-features">
        ${(Array.isArray(e.features)?e.features:[]).map(e=>`<li>${o(e)}</li>`).join(``)}
      </ul>
      <a href="/login?plan=${encodeURIComponent(m)}"
         class="tier-cta ${g?`tier-cta-primary`:`tier-cta-secondary`}">
        ${o(h)||`Get started`}
      </a>
    </article>
  `}function d(e,t){let n=Number(e),r=Number(t);if(!Number.isFinite(n)||!Number.isFinite(r)||n<=0||r<=0)return null;let i=n*12;return r>=i?0:Math.round((i-r)/i*100)}s();