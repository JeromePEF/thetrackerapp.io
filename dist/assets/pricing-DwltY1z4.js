import"./modulepreload-polyfill-BQdWdB5M.js";import{n as e}from"./feature-flags-ijnqwsP4.js";import{r as t,t as n}from"./billing-prices-Ca2N1vbS.js";var r=document.getElementById(`pricingContainer`),i=document.getElementById(`pricingSubtitle`),a=[`monthly`,`yearly`,`premium`,`premiumYearly`],o={monthly:`monthlyTier`,yearly:`yearlyTier`,premium:`premiumTier`,premiumYearly:`premiumYearlyTier`,weekly:`weeklyTier`},s={monthly:`Monthly`,yearly:`Yearly`,premium:`Premium`,premiumYearly:`Premium Yearly`,weekly:`Weekly`};function c(e){return String(e??``).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`)}function l(){r&&(u(),t(()=>u()),setInterval(u,300*1e3))}async function u(){try{let[t,r]=await Promise.all([e(),n()]);m({flags:t||{},prices:r||{}})}catch(e){console.warn(`Failed to load pricing:`,e),r.innerHTML=`
      <div class="pricing-error">
        Pricing is temporarily unavailable. Please refresh in a moment — or
        email <a href="mailto:contact@thetrackerapp.io">contact@thetrackerapp.io</a>.
      </div>
    `}}function d(e){return e===`premium`||e===`premiumYearly`}function f(e){return e===`yearly`||e===`premiumYearly`}function p(e,t){return e?.billing?.[o[t]]||null}function m({flags:e,prices:t}){let n=a.map(n=>{let r=t?.[n];if(!r?.formatted)return null;let i=p(e,n);return{planKey:n,name:i?.name||s[n]||n,formatted:r.formatted,perMonth:r.perMonthFormatted||null,savings:r.savingsVsMonthlyFormatted||null,features:Array.isArray(i?.features)?i.features:[],isPremium:d(n),isYearly:f(n)}}).filter(Boolean);if(!n.length){r.innerHTML=`
      <div class="pricing-error">
        Pricing is temporarily unavailable. Please refresh in a moment.
      </div>
    `,i&&(i.textContent=``);return}if(i){let e=n.find(e=>e.planKey===`yearly`);e?.savings?i.textContent=`One plan. Pay monthly, or ${e.savings} with yearly.`:i.textContent=`Simple, transparent pricing.`}let o=n.map(h).join(``);r.innerHTML=`
    <div class="pricing-cards-row pricing-cards-row-${n.length}">${o}</div>
  `}function h(e){let t=e.isPremium?`premium`:`base`,n=!!e.savings,r=`Start ${e.name}`,i=e.planKey===`premiumYearly`?`premium-yearly`:e.planKey;return`
    <article class="pricing-card pricing-card-${t} ${n?`pricing-card-featured`:``}"
             data-tier="${c(e.planKey)}" data-tier-type="${t}">
      ${n?`<div class="featured-badge">${c(e.savings)}</div>`:``}
      <div class="card-header">
        <h3 class="tier-name">${c(e.name)}</h3>
        <div class="tier-price">
          <span class="price-amount">${c(e.formatted)}</span>
        </div>
        ${e.isYearly&&e.perMonth?`<p class="tier-desc">${c(e.perMonth)} billed annually${e.savings?` · <strong>${c(e.savings)}</strong>`:``}</p>`:e.isYearly?``:`<p class="tier-desc">Billed monthly — cancel anytime</p>`}
      </div>
      <ul class="tier-features">
        ${e.features.map(e=>`<li>${c(e)}</li>`).join(``)}
      </ul>
      <a href="/login?plan=${encodeURIComponent(i)}"
         class="tier-cta ${n?`tier-cta-primary`:`tier-cta-secondary`}">
        ${c(r)}
      </a>
    </article>
  `}l();