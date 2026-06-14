import"./modulepreload-polyfill-B7MX_D3K.js";/* empty css               */import{r as e,t}from"./feature-flags-lTZ7Wx84.js";import{i as n,n as r}from"./billing-prices-Cx1pHCx8.js";var i=document.getElementById(`pricingContainer`),a=document.getElementById(`pricingSubtitle`),o=[`monthly`,`yearly`,`premium`,`premiumYearly`],s={monthly:`monthlyTier`,yearly:`yearlyTier`,premium:`premiumTier`,premiumYearly:`premiumYearlyTier`,weekly:`weeklyTier`},c={monthly:`Monthly`,yearly:`Yearly`,premium:`Premium`,premiumYearly:`Premium Yearly`,weekly:`Weekly`},l=[`everything in pro`,`api access`,`white-label`,`white label`,`custom goals`],u={monthly:[`Unlimited workout, nutrition & water logging`,`Body measurements & progress charts`,`Leaderboards, brackets & streaks`,`Wearable integrations`,`Cancel anytime`],yearly:[`Everything in Monthly`,`2 months free vs monthly`,`Priority support`,`Early access to new features`],premium:[`📷 Photo-based meal logging (AI calories + macros)`,`📷 Photo-based scale logging`,`📷 Photo-based workout logging`,`Nutrition-label scanning`,`Priority AI processing`],premiumYearly:[`Everything in Premium`,`Save vs monthly Premium`,`Priority AI processing`,`Early access to new features`]};function d(e){return e.some(e=>l.some(t=>String(e).toLowerCase().includes(t)))}function f(e,t){let n=Array.isArray(t?.features)?t.features:[];return n.length&&!d(n)?n.slice(0,5):(u[e]||[]).slice(0,5)}function p(e){return String(e??``).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`)}function m(){i&&(h(),n(()=>h()),setInterval(h,300*1e3))}async function h(){try{let[n,i]=await Promise.all([e(),r({force:!0})]);t(n||{}),b({flags:n||{},prices:i||{}})}catch(e){console.warn(`Failed to load pricing:`,e),i.innerHTML=`
      <div class="pricing-error">
        Pricing is temporarily unavailable. Please refresh in a moment — or
        email <a href="mailto:contact@thetrackerapp.io">contact@thetrackerapp.io</a>.
      </div>
    `}}function g(e){return e===`premium`||e===`premiumYearly`}function _(e){return e===`yearly`||e===`premiumYearly`}function v(e,t){return e?.billing?.[s[t]]||null}function y(e,t){let n=e?.billing?.tierVisibility;return!n||typeof n!=`object`?!0:n[t]!==!1}function b({flags:e,prices:t}){let n=o.map(n=>{if(!y(e,n))return null;let r=t?.[n];if(!r?.formatted)return null;let i=v(e,n);return{planKey:n,name:i?.name||c[n]||n,formatted:r.formatted,perMonth:r.perMonthFormatted||null,savings:r.savingsVsMonthlyFormatted||null,features:f(n,i),isPremium:g(n),isYearly:_(n)}}).filter(Boolean);if(!n.length){i.innerHTML=`
      <div class="pricing-error">
        Pricing is temporarily unavailable. Please refresh in a moment.
      </div>
    `,a&&(a.textContent=``);return}if(a){let e=n.find(e=>e.planKey===`yearly`);e?.savings?a.textContent=`One plan. Pay monthly, or ${e.savings} with yearly.`:a.textContent=`Simple, transparent pricing.`}let r=n.map(x).join(``);i.innerHTML=`
    <div class="pricing-cards-row pricing-cards-row-${n.length}">${r}</div>
  `}function x(e){let t=e.isPremium?`premium`:`base`,n=!!e.savings,r=`Start ${e.name}`,i=e.planKey===`premiumYearly`?`premium-yearly`:e.planKey;return`
    <article class="pricing-card pricing-card-${t} ${n?`pricing-card-featured`:``}"
             data-tier="${p(e.planKey)}" data-tier-type="${t}">
      ${n?`<div class="featured-badge">${p(e.savings)}</div>`:``}
      <div class="card-header">
        <h3 class="tier-name">${p(e.name)}</h3>
        <div class="tier-price">
          <span class="price-amount">${p(e.formatted)}</span>
        </div>
        ${e.isYearly&&e.perMonth?`<p class="tier-desc">${p(e.perMonth)} billed annually${e.savings?` · <strong>${p(e.savings)}</strong>`:``}</p>`:e.isYearly?``:`<p class="tier-desc">Billed monthly — cancel anytime</p>`}
      </div>
      <ul class="tier-features">
        ${e.features.map(e=>`<li>${p(e)}</li>`).join(``)}
      </ul>
      <a href="/login?plan=${encodeURIComponent(i)}"
         class="tier-cta ${n?`tier-cta-primary`:`tier-cta-secondary`}">
        ${p(r)}
      </a>
    </article>
  `}m();var S=0;function C(){let e=document.getElementById(`appShell`);if(!e)return;if(window.matchMedia(`(max-width: 900px)`).matches){e.style.transform=`none`,e.style.left=`0px`,e.style.top=`0px`;return}e.style.transform=`scale(1)`,e.style.left=`0px`,e.style.top=`0px`;let t=window.innerWidth,n=window.innerHeight,r=e.scrollWidth,i=e.scrollHeight;if(!r||!i||!t||!n)return;let a=Math.min(t/r,n/i,1),o=Math.max((t-r*a)/2,0),s=Math.max((n-i*a)/2,0);e.style.left=`${o}px`,e.style.top=`${s}px`,e.style.transform=`scale(${a})`}function w(){window.cancelAnimationFrame(S),S=window.requestAnimationFrame(C)}window.addEventListener(`resize`,w),window.addEventListener(`orientationchange`,w),document.fonts?.ready&&document.fonts.ready.then(w).catch(()=>{}),w();