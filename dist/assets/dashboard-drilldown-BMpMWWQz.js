var e=`https://api.thetrackerapp.io`;function t(){try{let e=localStorage.getItem(`tracker.auth.session`);if(!e)return``;try{let t=JSON.parse(e),n=t&&(t.token||t.accessToken);if(n)return String(n).trim()}catch{}return String(e).trim()}catch{return``}}function n(){try{let e=localStorage.getItem(`tracker.auth.user`);if(!e)return``;let t=JSON.parse(e);return(t?.username||t?.canonical||t?.credential||t?.maskedCredential||t?.accountId||``).toString().trim()}catch{return``}}async function r(n,r={}){let i=t(),a={Accept:`application/json`,...r.headers||{}};r.body&&(a[`Content-Type`]=`application/json`),i&&(a.Authorization=`Bearer ${i}`);let o=`${e}${n}${n.includes(`?`)?`&`:`?`}_=${Date.now()}`,s=await fetch(o,{...r,headers:a,cache:`no-store`});if(!s.ok){let e=await s.text().catch(()=>``);throw Error(e||`API ${s.status}`)}return s.status===204?null:s.json().catch(()=>null)}function i(e){return String(e??``).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`).replace(/'/g,`&#39;`)}function a(e){if(!e)return``;let t=new Date(e);return Number.isNaN(t.getTime())?``:t.toLocaleTimeString(`en-US`,{hour:`numeric`,minute:`2-digit`})}function o(e){if(!e)return``;let t=new Date(e);return Number.isNaN(t.getTime())?String(e):t.toLocaleDateString(`en-US`,{weekday:`short`,month:`short`,day:`numeric`,year:`numeric`})}var s=null;function c(){return s||(s=document.createElement(`div`),s.className=`tracker-modal`,s.setAttribute(`role`,`dialog`),s.setAttribute(`aria-modal`,`true`),s.hidden=!0,s.innerHTML=`
    <div class="tracker-modal-backdrop" data-action="close"></div>
    <div class="tracker-modal-window">
      <header class="tracker-modal-head">
        <h2 id="trackerModalTitle">Details</h2>
        <button type="button" class="tracker-modal-close" data-action="close" aria-label="Close">×</button>
      </header>
      <div class="tracker-modal-body" id="trackerModalBody"></div>
    </div>
  `,document.body.appendChild(s),s.addEventListener(`click`,e=>{e.target.dataset.action===`close`&&d()}),document.addEventListener(`keydown`,e=>{!s.hidden&&e.key===`Escape`&&d()}),s)}function l(e,t){let n=c();return n.querySelector(`#trackerModalTitle`).textContent=e,n.querySelector(`#trackerModalBody`).innerHTML=t,n.hidden=!1,document.body.classList.add(`tracker-modal-open`),n}function u(e){let t=s?.querySelector(`#trackerModalBody`);t&&(t.innerHTML=e)}function d(){s&&(s.hidden=!0,document.body.classList.remove(`tracker-modal-open`))}async function f({date:e,fallback:t={}}){if(!e)return;let i=n();if(i){l(`Calories — ${o(e)}`,`<p class="tracker-modal-loading">Loading entries…</p>`);try{let n=await r(`/api/user/nutrition/day?contact=${encodeURIComponent(i)}&date=${encodeURIComponent(e)}`);if(!n||n.ok===!1)throw Error(n?.error||`No data`);u(p(n,e)),b(e,t),v()}catch(n){u(y(e,t,n))}}}function p(e,t){let n=e.totals||{},r=Array.isArray(e.entries)?e.entries:[];return r.length?`
    <div class="drilldown-summary">
      ${m(`Calories`,n.calories,`kcal`)}
      ${m(`Protein`,n.protein,`g`)}
      ${m(`Carbs`,n.carbs,`g`)}
      ${m(`Fats`,n.fats,`g`)}
    </div>
    <table class="drilldown-table">
      <thead>
        <tr>
          <th>Time</th>
          <th>Item</th>
          <th class="num">kcal</th>
          <th class="num">P</th>
          <th class="num">C</th>
          <th class="num">F</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${r.map((e,t)=>{let n=a(e.loggedAt||e.time||e.timestamp),r=i(e.name||e.item||e.raw||`Entry`),o=i(e.id??``),s=i(e.confidence&&e.confidence.source||e.source||``),c=g(e.confidence),l=c?`<button type="button" class="drilldown-conf-badge is-${c.level}" data-action="toggle-conf" data-entry-idx="${t}" aria-expanded="false" aria-controls="conf-${t}" title="Tap to see how this was estimated">${c.scorePct}% · ±${c.plusMinusKcal} kcal</button>`:``,u=c?`<tr class="drilldown-conf-row" id="conf-${t}" hidden>
                  <td colspan="7">
                    <div class="drilldown-conf-panel">
                      <div class="drilldown-conf-head">
                        <span class="drilldown-conf-pill is-${c.level}">${i(c.level)} confidence · ${c.scorePct}%</span>
                        ${c.sourceLabel?`<span class="drilldown-conf-source">${i(c.sourceLabel)}</span>`:``}
                      </div>
                      <div class="drilldown-conf-ranges">
                        ${_(`Calories`,c.ranges.calories,`kcal`)}
                        ${_(`Protein`,c.ranges.protein,`g`)}
                        ${_(`Carbs`,c.ranges.carbs,`g`)}
                        ${_(`Fats`,c.ranges.fats,`g`)}
                      </div>
                      ${c.explanation?`<p class="drilldown-conf-explain">${i(c.explanation)}</p>`:``}
                      ${c.alternatives&&c.alternatives.length?`<div class="drilldown-conf-alts"><span class="drilldown-conf-alts-label">Wrong item?</span>${c.alternatives.map(e=>`<span class="drilldown-conf-alt">${i(e.name)}${e.calories==null?``:` · ${Math.round(e.calories)} kcal`}</span>`).join(``)}</div>`:``}
                    </div>
                  </td>
                </tr>`:``;return`
            <tr data-entry-id="${o}">
              <td>${n}</td>
              <td>
                <span class="drilldown-item-name">${r}</span>
                ${s?`<span class="drilldown-source">${s}</span>`:``}
                ${l}
              </td>
              <td class="num">${S(e.calories)}</td>
              <td class="num">${S(e.protein)}</td>
              <td class="num">${S(e.carbs)}</td>
              <td class="num">${S(e.fats)}</td>
              <td class="num">
                ${o?`<button type="button" class="drilldown-delete" data-action="delete-nut" data-entry-id="${o}" title="Delete entry">×</button>`:``}
              </td>
            </tr>
            ${u}
          `}).join(``)}
      </tbody>
    </table>
    <p class="tracker-modal-foot">
      Spot something wrong? Click the × to remove an entry, or tap the confidence
      badge to see how an estimate was made. Changes update your stats immediately.
    </p>
  `:`
      <p class="tracker-modal-empty">No food entries logged on ${i(o(t))}.</p>
    `}function m(e,t,n){let r=Number(t);return Number.isFinite(r)?`
    <div class="drilldown-stat">
      <span class="drilldown-stat-label">${i(e)}</span>
      <span class="drilldown-stat-value">${Math.round(r).toLocaleString()}<span class="drilldown-stat-unit">${i(n)}</span></span>
    </div>
  `:``}var h={natural_language_food:`Natural-language parse`,barcode:`Barcode scan`,photo_estimate:`Photo estimate`,menu_match:`Restaurant menu match`,user_manual:`Manual entry`,restaurant_db:`Restaurant database`,brand_db:`Brand database`,recipe_compose:`Recipe (sum of ingredients)`};function g(e){if(!e||typeof e!=`object`)return null;let t=Number(e.score),n=String(e.level||``).toLowerCase();if(Number.isFinite(t)||(t=n===`high`?.9:n===`medium`?.7:n===`low`?.45:NaN),n||=t>=.85?`high`:t>=.6?`medium`:`low`,!Number.isFinite(t))return null;let r=e.ranges||{},i=r.calories||{},a=Math.round(Number(i.plusMinus)||(Number(i.high)&&Number(i.low)?(i.high-i.low)/2:0));return{score:t,scorePct:Math.round(t*100),level:n,plusMinusKcal:a,sourceLabel:h[e.source]||e.source||``,explanation:e.explanation||``,ranges:{calories:r.calories,protein:r.protein,carbs:r.carbs,fats:r.fats},alternatives:Array.isArray(e.alternativeMatches)?e.alternativeMatches:[]}}function _(e,t,n){if(!t||typeof t!=`object`)return``;let r=Number(t.plusMinus),a=Number(t.low),o=Number(t.high),s=Number.isFinite(r)?`±${Math.round(r*10)/10}`:Number.isFinite(a)&&Number.isFinite(o)?`${Math.round(a)}–${Math.round(o)}`:``;return s?`
    <div class="drilldown-conf-range">
      <span class="drilldown-conf-range-label">${i(e)}</span>
      <span class="drilldown-conf-range-value">${i(s)}<span class="drilldown-conf-range-unit"> ${i(n)}</span></span>
    </div>
  `:``}function v(){s?.querySelectorAll(`[data-action="toggle-conf"]`).forEach(e=>{e.addEventListener(`click`,()=>{let t=e.dataset.entryIdx,n=s.querySelector(`#conf-${t}`);if(!n)return;let r=!n.hidden;n.hidden=r,e.setAttribute(`aria-expanded`,r?`false`:`true`),e.classList.toggle(`is-open`,!r)})})}function y(e,t,n){let r=Array.isArray(t.sources)?t.sources.filter(Boolean):[];return`
    <p class="tracker-modal-empty">
      Detailed per-meal breakdown isn't available from the backend yet.
    </p>
    <div class="drilldown-summary">
      ${t.total?m(`Total`,t.total,`kcal`):``}
      ${t.entryCount?m(`Entries`,t.entryCount,``):``}
    </div>
    ${r.length?`<p class="tracker-modal-foot">Sources for this day: ${r.map(e=>`<code>${i(e)}</code>`).join(`, `)}</p>`:``}
    <p class="tracker-modal-foot tracker-modal-error">
      Endpoint <code>GET /api/user/nutrition/day?contact=…&amp;date=${i(e)}</code>
      not yet implemented on the backend. (${i(n?.message||`request failed`)})
    </p>
  `}function b(e,t){s?.querySelectorAll(`[data-action="delete-nut"]`).forEach(n=>n.addEventListener(`click`,async()=>{let i=n.dataset.entryId;if(i&&confirm(`Delete this food entry?`)){n.disabled=!0;try{await r(`/api/user/nutrition/entry/${encodeURIComponent(i)}`,{method:`DELETE`}),f({date:e,fallback:t}),window.dispatchEvent(new CustomEvent(`tracker:nutrition-changed`,{detail:{date:e}}))}catch(e){n.disabled=!1,alert(`Delete failed: ${e?.message||e}`)}}}))}function x({key:e,label:t,unit:n,points:a}){Array.isArray(a)||(a=[]);let c=a.slice().sort((e,t)=>String(t.date).localeCompare(String(e.date))).map(t=>{let r=t.id??t.entryId??``,a=t.source||``,s=t.raw||``;return`
      <tr data-entry-id="${i(r)}">
        <td>${i(o(t.date))}</td>
        <td class="num">${S(t.value)}<span class="drilldown-stat-unit"> ${i(n||``)}</span></td>
        <td><span class="drilldown-source">${i(a||`—`)}</span></td>
        <td class="drilldown-raw">${i(s||``)}</td>
        <td class="num">
          ${r?`<button type="button" class="drilldown-delete" data-action="delete-measure" data-entry-id="${i(r)}" data-metric="${i(e)}" title="Delete entry">×</button>`:``}
        </td>
      </tr>
    `}).join(``),u=a.length?`
    <p class="tracker-modal-sub">Every ${i(t.toLowerCase())} entry the backend has for you, newest first. If something here is wrong or wasn't logged by you, delete it with ×.</p>
    <table class="drilldown-table">
      <thead>
        <tr>
          <th>Date</th>
          <th class="num">Value</th>
          <th>Source</th>
          <th>Raw</th>
          <th></th>
        </tr>
      </thead>
      <tbody>${c}</tbody>
    </table>
  `:`<p class="tracker-modal-empty">No ${i(t.toLowerCase())} entries yet.</p>`;l(`${t} — all entries`,u),s?.querySelectorAll(`[data-action="delete-measure"]`).forEach(e=>{e.addEventListener(`click`,async()=>{let t=e.dataset.entryId,n=e.dataset.metric;if(t&&confirm(`Delete this ${n} entry?`)){e.disabled=!0;try{await r(`/api/user/measurements/${encodeURIComponent(t)}`,{method:`DELETE`});let i=e.closest(`tr`);i&&i.remove(),window.dispatchEvent(new CustomEvent(`tracker:measurement-changed`,{detail:{metric:n,id:t}}))}catch(t){e.disabled=!1,alert(`Delete failed: ${t?.message||t}`)}}})})}function S(e){let t=Number(e);return Number.isFinite(t)?Math.abs(t)>=1e3?t.toLocaleString(void 0,{maximumFractionDigits:0}):Math.abs(t)>=10?t.toFixed(1):t.toFixed(2).replace(/\.?0+$/,``):`—`}export{x as openMetricEntries,f as openNutritionDay};