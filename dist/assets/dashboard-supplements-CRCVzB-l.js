var e=`https://api.thetrackerapp.io`,t=`tracker.supplements.tracked`,n=[{key:`creatine`,displayName:`Creatine`,defaultUnit:`g`,defaultDose:5,popular:!0},{key:`whey`,displayName:`Whey Protein`,defaultUnit:`g`,defaultDose:25,popular:!0},{key:`multivitamin`,displayName:`Multivitamin`,defaultUnit:`serving`,defaultDose:1,popular:!0},{key:`vitaminD`,displayName:`Vitamin D`,defaultUnit:`IU`,defaultDose:2e3,popular:!0},{key:`fishOil`,displayName:`Fish Oil`,defaultUnit:`mg`,defaultDose:1e3,popular:!0},{key:`magnesium`,displayName:`Magnesium`,defaultUnit:`mg`,defaultDose:400,popular:!0},{key:`vitaminC`,displayName:`Vitamin C`,defaultUnit:`mg`,defaultDose:500,popular:!0},{key:`electrolytes`,displayName:`Electrolytes`,defaultUnit:`mL`,defaultDose:500,popular:!0},{key:`collagen`,displayName:`Collagen`,defaultUnit:`g`,defaultDose:10,popular:!0},{key:`preWorkout`,displayName:`Pre-Workout`,defaultUnit:`scoop`,defaultDose:1,popular:!0},{key:`caseinProtein`,displayName:`Casein Protein`,defaultUnit:`g`,defaultDose:25,popular:!1},{key:`bcaa`,displayName:`BCAAs`,defaultUnit:`g`,defaultDose:5,popular:!1},{key:`eaa`,displayName:`EAAs`,defaultUnit:`g`,defaultDose:5,popular:!1},{key:`caffeinePill`,displayName:`Caffeine`,defaultUnit:`mg`,defaultDose:200,popular:!1},{key:`vitaminB12`,displayName:`Vitamin B12`,defaultUnit:`mcg`,defaultDose:500,popular:!1},{key:`zinc`,displayName:`Zinc`,defaultUnit:`mg`,defaultDose:15,popular:!1},{key:`iron`,displayName:`Iron`,defaultUnit:`mg`,defaultDose:18,popular:!1},{key:`calcium`,displayName:`Calcium`,defaultUnit:`mg`,defaultDose:500,popular:!1},{key:`potassium`,displayName:`Potassium`,defaultUnit:`mg`,defaultDose:99,popular:!1}],r={creatine:`#4dd0e1`,whey:`#64b5f6`,caseinProtein:`#5c6bc0`,multivitamin:`#81c784`,vitaminD:`#ffb74d`,fishOil:`#ff8a65`,magnesium:`#9575cd`,vitaminC:`#ffd54f`,electrolytes:`#4fc3f7`,collagen:`#a1887f`,preWorkout:`#ef5350`,bcaa:`#26a69a`,eaa:`#66bb6a`,caffeinePill:`#7e57c2`,vitaminB12:`#f48fb1`,zinc:`#90a4ae`,iron:`#d84315`,calcium:`#bcaaa4`,potassium:`#b0bec5`},i={rootEl:null,registry:n,registryByKey:new Map(n.map(e=>[e.key,e])),tracked:[],todayEntries:[],endpointAvailable:!0,customs:[]};function a(){try{let e=localStorage.getItem(`tracker.auth.session`);if(!e)return``;try{let t=JSON.parse(e),n=t&&(t.token||t.accessToken);if(n)return String(n).trim()}catch{}return String(e).trim()}catch{return``}}async function o(t,n={}){let r=a(),o={Accept:`application/json`,...n.headers||{}};n.body&&!o[`Content-Type`]&&(o[`Content-Type`]=`application/json`),r&&(o.Authorization=`Bearer ${r}`);let s=await fetch(`${e}${t}`,{...n,headers:o});if(!s.ok){(s.status===404||s.status===501)&&(i.endpointAvailable=!1);let e=await s.text().catch(()=>``);throw Error(`${t} ${s.status}: ${e||s.statusText}`)}return s.status===204?null:s.json().catch(()=>null)}function s(e){return String(e??``).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`).replace(/'/g,`&#39;`)}function c(){let e=new Date;return`${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,`0`)}-${String(e.getDate()).padStart(2,`0`)}`}function l(e){return String(e).toLowerCase().replace(/[^a-z0-9]+/g,`-`).replace(/^-+|-+$/g,``).slice(0,40)}function u(e){return i.registryByKey.get(e)||i.customs.find(t=>t.key===e)||null}function d(e){return r[e]||`#64b5f6`}async function f(e){e&&(i.rootEl=e,p(),y(),await Promise.allSettled([h(),g(),_()]),y())}function p(){try{let e=localStorage.getItem(t);if(e){let t=JSON.parse(e);Array.isArray(t?.tracked)&&(i.tracked=t.tracked.slice()),Array.isArray(t?.customs)&&(i.customs=t.customs.slice())}}catch{}}function m(){try{localStorage.setItem(t,JSON.stringify({tracked:i.tracked,customs:i.customs}))}catch{}}async function h(){try{let e=await o(`/api/nutrition/supplement/registry`);Array.isArray(e?.items)&&e.items.length&&(i.registry=e.items,i.registryByKey=new Map(e.items.map(e=>[e.key,e])))}catch{}}async function g(){try{let e=await o(`/api/account/profile`),t=e?.trackedSupplements||e?.profile?.trackedSupplements;Array.isArray(t)&&(i.tracked=t.slice(),t.forEach(e=>{!i.registryByKey.has(e)&&!i.customs.find(t=>t.key===e)&&i.customs.push({key:e,displayName:e,defaultUnit:`g`,defaultDose:1})}),m())}catch{}}async function _(){try{let e=await o(`/api/nutrition/supplement?date=${c()}`);i.todayEntries=Array.isArray(e?.entries)?e.entries:[]}catch{i.todayEntries=[]}}async function v(){m();try{await o(`/api/account/profile`,{method:`PATCH`,body:JSON.stringify({trackedSupplements:i.tracked,customSupplements:i.customs.length?i.customs:void 0})})}catch(e){console.warn(`persist tracked supplements failed:`,e)}}function y(){if(!i.rootEl)return;let e=new Set(i.todayEntries.map(e=>e.canonicalKey||e.key)),t=i.tracked.map(e=>u(e)).filter(Boolean),n=i.todayEntries.length?i.todayEntries.slice(0,6).map(e=>`<span class="supp-today-chip" style="--c:${d(e.canonicalKey||e.key)}">${s(e.name||u(e.canonicalKey||e.key)?.displayName||e.canonicalKey)} <strong>${e.amount}${s(e.unit||``)}</strong></span>`).join(``)+(i.todayEntries.length>6?`<span class="supp-today-more">+${i.todayEntries.length-6} more</span>`:``):`<span class="supp-today-empty">Nothing logged yet today.</span>`,r=t.length?`
      <div class="supp-chip-grid">
        ${t.map(t=>{let n=e.has(t.key),r=d(t.key);return`
              <div class="supp-chip-wrap">
                <button type="button" class="supp-chip ${n?`is-taken`:``}"
                        data-supp-action="log" data-supp-key="${s(t.key)}"
                        style="--c:${r}"
                        title="Log ${s(t.displayName)} (${t.defaultDose} ${s(t.defaultUnit)}). Shift-click for custom amount.">
                  <span class="supp-chip-name">${s(t.displayName)}</span>
                  <span class="supp-chip-dose">${t.defaultDose}<span class="supp-chip-unit">${s(t.defaultUnit)}</span></span>
                </button>
                <button type="button" class="supp-chip-remove"
                        data-supp-action="untrack" data-supp-key="${s(t.key)}"
                        aria-label="Stop tracking ${s(t.displayName)}">×</button>
              </div>
            `}).join(``)}
        <button type="button" class="supp-chip supp-chip-add" data-supp-action="open-picker">
          <span class="supp-chip-name">+ Add supplement</span>
          <span class="supp-chip-dose">choose what to track</span>
        </button>
      </div>
    `:`
      <div class="supp-empty">
        <p class="supp-empty-title">No supplements tracked yet.</p>
        <p class="supp-empty-sub">Pick the ones you take regularly and we'll only show those on your dashboard. Add as many or as few as you want — totally yours to curate.</p>
        <button type="button" class="btn-primary supp-empty-btn" data-supp-action="open-picker">+ Add a supplement</button>
      </div>
    `;i.rootEl.innerHTML=`
    <section class="supplements-panel grafana-panel">
      <header class="panel-header">
        <div>
          <h3>Supplements</h3>
          <p class="panel-sub">${t.length?`Tap a chip to log a dose. × to stop tracking. Only your tracked supplements show up in charts.`:`Curate the supplements you actually take — they'll appear on your dashboard with their own chart line.`}</p>
        </div>
      </header>

      ${t.length?`<div class="supp-today-row">${n}</div>`:``}

      ${r}

      ${i.endpointAvailable?``:`<p class="supp-fallback-note">Backend logging endpoint isn't live yet — chips will log to localStorage in the meantime. You can also text the bot (e.g. "took 5g creatine") and it'll go through the existing nutrition path.</p>`}
    </section>
  `,E()}function b(){let e=document.createElement(`div`);e.className=`supp-picker-overlay`,e.id=`suppPickerOverlay`,e.innerHTML=x(!1),document.body.appendChild(e),e.addEventListener(`click`,t=>{t.target===e&&C()}),S(e)}function x(e){let t=new Set(i.tracked),n=i.registry.slice(),r=n.filter(e=>e.popular!==!1).slice(0,10),a=n.filter(e=>e.popular===!1),o=e=>{let n=t.has(e.key),r=d(e.key);return`
      <button type="button" class="supp-picker-row ${n?`is-tracked`:``}"
              data-supp-action="toggle-track" data-supp-key="${s(e.key)}"
              style="--c:${r}">
        <span class="supp-picker-swatch"></span>
        <span class="supp-picker-name">${s(e.displayName)}</span>
        <span class="supp-picker-meta">${e.defaultDose} ${s(e.defaultUnit)}</span>
        <span class="supp-picker-action">${n?`✓ Tracking`:`+ Add`}</span>
      </button>
    `};return`
    <div class="supp-picker" role="dialog" aria-modal="true" aria-labelledby="suppPickerTitle">
      <header class="supp-picker-head">
        <h3 id="suppPickerTitle">Add a supplement</h3>
        <button type="button" class="supp-picker-close" data-supp-action="close-picker" aria-label="Close">×</button>
      </header>
      <p class="supp-picker-sub">Tap to add — you can remove anything later. Only what you track shows up on your charts.</p>

      <section class="supp-picker-section">
        <h4>Popular</h4>
        ${r.map(o).join(``)}
      </section>

      ${a.length?`
        <section class="supp-picker-section">
          <button type="button" class="supp-picker-expand" data-supp-action="toggle-show-all" aria-expanded="${e}">
            ${e?`− Hide other`:`+ Browse other (${a.length})`}
          </button>
          ${e?`<div class="supp-picker-other">${a.map(o).join(``)}</div>`:``}
        </section>
      `:``}

      <section class="supp-picker-section">
        <h4>Custom</h4>
        <p class="supp-picker-custom-hint">Don't see what you take? Add your own — any name, any unit.</p>
        <button type="button" class="supp-picker-custom-btn" data-supp-action="add-custom">+ Add custom supplement</button>
      </section>

      <footer class="supp-picker-foot">
        <button type="button" class="btn-primary" data-supp-action="close-picker">Done</button>
      </footer>
    </div>
  `}function S(e){e.querySelectorAll(`[data-supp-action]`).forEach(t=>{t.addEventListener(`click`,async n=>{let r=t.dataset.suppAction,i=t.dataset.suppKey;r===`close-picker`?C():r===`toggle-track`&&i?(await T(i),e.innerHTML=x(!!e.querySelector(`.supp-picker-other`)),S(e)):r===`toggle-show-all`?(e.innerHTML=x(!e.querySelector(`.supp-picker-other`)),S(e)):r===`add-custom`&&(await w(),e.innerHTML=x(!!e.querySelector(`.supp-picker-other`)),S(e))})})}function C(){let e=document.getElementById(`suppPickerOverlay`);e&&e.remove(),y()}async function w(){let e=prompt(`Supplement name (e.g. 'Tongkat Ali', 'Beetroot Powder'):`);if(!e)return;let t=prompt(`Typical dose for ${e} (number):`),n=Number(t);if(!Number.isFinite(n)||n<=0){alert(`Please enter a positive number.`);return}let r=prompt(`Unit: g / mg / mcg / oz / IU / mL / L / serving / scoop / tablet / capsule`,`g`)||`g`,a=`custom-${l(e)}`,o={key:a,displayName:e,defaultUnit:r,defaultDose:n};i.customs.find(e=>e.key===a)||i.customs.push(o),i.tracked.includes(a)||i.tracked.push(a),await v()}async function T(e){i.tracked.includes(e)?i.tracked=i.tracked.filter(t=>t!==e):i.tracked=[...i.tracked,e],await v()}function E(){i.rootEl?.querySelectorAll(`[data-supp-action]`).forEach(e=>{e.addEventListener(`click`,async t=>{let n=e.dataset.suppAction,r=e.dataset.suppKey;if(n===`log`&&r)await D(r,t.shiftKey);else if(n===`untrack`&&r){let e=u(r);confirm(`Stop tracking ${e?.displayName||r}?\n\nIt'll disappear from your dashboard charts but past logs stay in your history.`)&&(i.tracked=i.tracked.filter(e=>e!==r),await v(),y(),window.dispatchEvent(new CustomEvent(`tracker:nutrition-changed`,{detail:{kind:`supplement-untrack`}})))}else n===`open-picker`&&b()})})}async function D(e,t){let n=u(e);if(!n)return;let r=n.defaultDose,i=n.defaultUnit;if(t){let e=prompt(`How much ${n.displayName}? (default ${n.defaultDose} ${n.defaultUnit})`,n.defaultDose);if(e==null||e===``)return;if(r=Number(e),!Number.isFinite(r)||r<=0){alert(`Please enter a positive number.`);return}}await O({name:n.displayName,canonicalKey:n.key,amount:r,unit:i})}async function O({name:e,canonicalKey:t,amount:n,unit:r}){let a={id:`pending-${Date.now()}`,name:e,canonicalKey:t,amount:n,unit:r,loggedAt:new Date().toISOString(),pending:!0};i.todayEntries=[a,...i.todayEntries],y();try{let s=await o(`/api/nutrition/supplement`,{method:`POST`,body:JSON.stringify({name:e,canonicalKey:t,amount:n,unit:r,source:`manual`})});if(s&&(s.id||s.entry)){let e=s.entry||s;i.todayEntries=i.todayEntries.map(t=>t===a?e:t)}y(),window.dispatchEvent(new CustomEvent(`tracker:nutrition-changed`,{detail:{kind:`supplement-log`}}))}catch(t){i.todayEntries=i.todayEntries.filter(e=>e!==a),y(),i.endpointAvailable&&(console.warn(`supplement log failed:`,t),alert(`Couldn't log ${e}. Try again in a moment.`))}}export{f as initSupplementsPanel};