import"./modulepreload-polyfill-BQdWdB5M.js";import{a as e,c as t,i as n,l as r,n as i,o as a,r as o,t as s}from"./api-DCiD4VV-.js";import{n as c,t as l}from"./google-analytics-BtHxdyHL.js";import{a as u,i as d,r as f}from"./feature-flags-BBgfJO6n.js";/* empty css                   */import{a as p,c as m,d as h,f as g,g as _,h as ee,l as te,m as v,n as ne,o as re,s as y,t as b,u as ie,v as ae}from"./affiliate-shape-CbCjCOr6.js";var oe=`https://api.thetrackerapp.io`,se=`tracker.checklist.hidden`,ce=`tracker.checklist.doneBannerShown`;function le(){try{let e=localStorage.getItem(`tracker.auth.session`);if(!e)return``;try{let t=JSON.parse(e),n=t&&(t.token||t.accessToken);if(n)return String(n).trim()}catch{}return String(e).trim()}catch{return``}}function ue(){try{let e=localStorage.getItem(`tracker.auth.user`);if(!e)return``;let t=JSON.parse(e);return(t?.username||t?.canonical||t?.credential||t?.maskedCredential||t?.accountId||``).toString().trim()}catch{return``}}async function de(e,t={}){let n=le(),r={Accept:`application/json`,"Content-Type":`application/json`,...t.headers||{}};n&&(r.Authorization=`Bearer ${n}`);let i=await fetch(`${oe}${e}`,{...t,headers:r,cache:`no-store`});if(!i.ok){let e=await i.text().catch(()=>``);throw Error(e||`HTTP ${i.status}`)}return i.status===204?null:i.json().catch(()=>null)}function x(e){return String(e??``).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`).replace(/'/g,`&#39;`)}var fe={age_group:{type:`radio`,field:`ageGroup`,options:[`child`,`teen`,`adult`,`elder`],labels:{child:`Child`,teen:`Teen`,adult:`Adult`,elder:`Elder`}},sex:{type:`radio`,field:`sex`,options:[`male`,`female`,`prefer_not_to_say`],labels:{male:`Male`,female:`Female`,prefer_not_to_say:`Prefer not to say`}},current_weight:{type:`weight`,field:`currentWeight`},current_height:{type:`height`,field:`currentHeight`},body_goal:{type:`radio`,field:`bodyGoal`,options:[`lose`,`maintain`,`gain`,`recomp`],labels:{lose:`Lose`,maintain:`Maintain`,gain:`Gain`,recomp:`Recomp`},disclaimer:!0},calorie_target:{type:`calorie`,field:`calorieGoal`,disclaimer:!0},water_goal:{type:`water`,field:`waterGoal`},workout_split:{type:`chips`,field:`workoutSplit`,chips:[`PPL`,`Upper/Lower`,`Full body`,`Bro split`,`Custom`]},daily_reminders:{type:`reminders`},weekly_body_reminder:{type:`toggle-day`,field:`weeklyBodyMeasurePromptEnabled`,dayField:null,label:`Remind me to take body measurements weekly`},weekly_reports:{type:`toggle-day`,field:`weeklyReportsEnabled`,dayField:`weeklyReportDay`,label:`Send me a weekly progress report`},phone_call_reminders:{type:`toggle`,field:`phoneCallReminders`,label:`Phone-call reminders (for missed days)`},notification_channel:{type:`radio`,field:`preferredChannel`,options:[`iMessage`,`SMS`,`WhatsApp`,`email`],labels:{iMessage:`iMessage`,SMS:`SMS`,WhatsApp:`WhatsApp`,email:`Email`}},nutrition_coaching:{type:`toggle`,field:`nutritionCoachingEnabled`,label:`Nutrition coaching`,sub:`AI nudges based on your daily totals and goals.`},leaderboard_optin:{type:`toggle`,field:`leaderboardOptIn`,label:`Show me on public leaderboards`,sub:`Your username + score; you control your flair and emoji.`},flair:{type:`flair`},reply_style:{type:`radio`,field:`replyStyle`,options:[`default`,`concise`,`verbose`],labels:{default:`Default`,concise:`Concise`,verbose:`Verbose`}},export_format:{type:`radio`,field:`exportFormat`,options:[`csv`,`json`,`pdf`],labels:{csv:`CSV`,json:`JSON`,pdf:`PDF`}}},pe=[`Profile`,`Goals`,`Notifications`,`Coaching`,`Community`,`Preferences`],me={high:0,medium:1,low:2},S=null,C=null,w={items:[],summary:{total:0,completed:0,remaining:0,completionPercent:0},panelOpen:!1,hidden:!1};function he(){try{return localStorage.getItem(se)===`1`}catch{return!1}}function ge(e){try{localStorage.setItem(se,e?`1`:`0`)}catch{}}async function _e(){ue()&&(w.hidden=he(),ve(),await xe())}function ve(){if(S)return;let e=document.getElementById(`dashboardNav`);e&&(S=document.createElement(`button`),S.type=`button`,S.className=`checklist-bell`,S.setAttribute(`aria-label`,`Setup checklist`),S.innerHTML=`
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18 16v-5a6 6 0 1 0-12 0v5l-2 2v1h16v-1l-2-2zm-6 5a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2z"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
    </svg>
    <span class="checklist-bell-badge" hidden>0</span>
  `,S.addEventListener(`click`,be),e.insertBefore(S,e.firstChild))}function ye(){if(!S)return;let e=S.querySelector(`.checklist-bell-badge`),t=w.summary.remaining;t>0&&!w.hidden?(e.textContent=t>99?`99+`:String(t),e.hidden=!1,S.classList.add(`has-pending`)):(e.hidden=!0,S.classList.remove(`has-pending`))}function be(){w.panelOpen=!w.panelOpen,Ce()}async function xe(){try{let e=ue(),t=await de(`/api/profile/deferred-checklist?contact=${encodeURIComponent(e)}`);t?.ok&&(w.items=Array.isArray(t.items)?t.items:[],w.summary=t.summary||{total:0,completed:0,remaining:0,completionPercent:0})}catch{w.items=[],w.summary={total:0,completed:0,remaining:0,completionPercent:0}}if(ye(),w.panelOpen&&Ce(),w.summary.remaining===0&&w.summary.total>0&&!localStorage.getItem(ce)){try{localStorage.setItem(ce,`1`)}catch{}ge(!0),w.hidden=!0,ye(),ke()}}function Se(){return C||(C=document.createElement(`div`),C.className=`checklist-panel`,C.hidden=!0,document.body.appendChild(C),C.addEventListener(`click`,e=>{e.target.dataset.action===`close-panel`&&(w.panelOpen=!1,Ce())}),C)}function Ce(){let e=Se();if(e.hidden=!w.panelOpen,!w.panelOpen)return;let t=new Map;for(let e of w.items){let n=e.category||`Other`;t.has(n)||t.set(n,[]),t.get(n).push(e)}for(let e of t.values())e.sort((e,t)=>(me[e.priority]??9)-(me[t.priority]??9));let n=[...pe.filter(e=>t.has(e)),...[...t.keys()].filter(e=>!pe.includes(e))],r=w.summary.completionPercent||0;e.innerHTML=`
    <div class="checklist-backdrop" data-action="close-panel"></div>
    <aside class="checklist-window" role="dialog" aria-label="Profile setup checklist">
      <header class="checklist-head">
        <div>
          <h2>Finish setting up your profile</h2>
          <p class="checklist-sub">${w.summary.completed} of ${w.summary.total} done · ${r}%</p>
        </div>
        <button type="button" class="checklist-close" data-action="close-panel" aria-label="Close">×</button>
      </header>
      <div class="checklist-progress">
        <div class="checklist-progress-fill" style="width: ${r}%"></div>
      </div>
      <div class="checklist-body">
        ${n.map(e=>`
          <section class="checklist-group">
            <h3>${x(e)}</h3>
            ${t.get(e).map(we).join(``)}
          </section>
        `).join(``)}
      </div>
      <footer class="checklist-foot">
        <button type="button" class="btn-ghost" data-action="hide-panel">Hide for now</button>
        <p class="checklist-foot-note">Updates save instantly. You can edit anything any time from this panel.</p>
      </footer>
    </aside>
  `,Ee()}function we(e){let t=!!e.completed,n=fe[e.id];return`
    <article class="checklist-card ${t?`is-done`:``} priority-${x(e.priority||`low`)}"
             data-item-id="${x(e.id)}">
      <button type="button" class="checklist-card-head" data-action="toggle-item">
        <span class="checklist-card-check" aria-hidden="true">${t?`✓`:``}</span>
        <span class="checklist-card-title">${x(e.title)}</span>
        <span class="checklist-card-priority">${x(e.priority||``)}</span>
      </button>
      <form class="checklist-card-form" data-item-id="${x(e.id)}" hidden>
        ${Te(e,n)}
        ${n?.disclaimer?`<p class="checklist-disclaimer">These are general estimates. Consult a registered dietitian or physician for a personalized plan.</p>`:``}
        <div class="checklist-card-actions">
          <button type="submit" class="btn-primary">Save</button>
          <button type="button" class="btn-ghost" data-action="skip-item">Skip for now</button>
          <span class="checklist-card-status" data-status></span>
        </div>
      </form>
    </article>
  `}function Te(e,t){if(!t)return`<p class="checklist-empty">Form widget not implemented for "${x(e.id)}".</p>`;switch(t.type){case`radio`:return`
        <div class="checklist-radio-row">
          ${t.options.map(e=>`<label class="checklist-radio">
                  <input type="radio" name="value" value="${x(e)}">
                  <span>${x(t.labels?.[e]||e)}</span>
                </label>`).join(``)}
        </div>
      `;case`weight`:return`
        <div class="checklist-inline-input">
          <input type="number" name="value" min="40" max="700" step="0.1" placeholder="175" required>
          <select name="unit">
            <option value="lb" selected>lb</option>
            <option value="kg">kg</option>
          </select>
        </div>
      `;case`height`:return`
        <div class="checklist-inline-input">
          <input type="text" name="value" placeholder='5&apos;10" or 178 cm' required>
        </div>
      `;case`calorie`:return`
        <div class="checklist-inline-input">
          <input type="number" name="value" min="800" max="6000" step="10" placeholder="2200">
          <button type="button" class="btn-ghost" data-action="calorie-auto">Auto-estimate from my profile</button>
        </div>
      `;case`water`:return`
        <div class="checklist-inline-input">
          <input type="number" name="value" min="8" max="500" step="1" placeholder="128">
          <select name="unit">
            <option value="oz" selected>oz</option>
            <option value="ml">mL</option>
            <option value="l">L</option>
          </select>
        </div>
      `;case`chips`:return`
        <div class="checklist-chips">
          ${t.chips.map(e=>`<button type="button" class="chip" data-chip="${x(e)}">${x(e)}</button>`).join(``)}
        </div>
        <input type="text" name="value" placeholder="Or type your own" />
      `;case`reminders`:return`
        <label class="checklist-toggle">
          <input type="checkbox" name="enabled">
          <span>Send me daily reminders</span>
        </label>
        <div class="checklist-times">
          <label>First reminder <input type="time" name="time1" value="08:00"></label>
          <label>Second (optional) <input type="time" name="time2"></label>
        </div>
      `;case`toggle-day`:return`
        <label class="checklist-toggle">
          <input type="checkbox" name="enabled">
          <span>${x(t.label||`Enable`)}</span>
        </label>
        ${t.dayField?`<label class="checklist-day-label">Day
                <select name="day">
                  ${[`sunday`,`monday`,`tuesday`,`wednesday`,`thursday`,`friday`,`saturday`].map(e=>`<option value="${e}" ${e===`saturday`?`selected`:``}>${e[0].toUpperCase()+e.slice(1)}</option>`).join(``)}
                </select>
              </label>`:``}
      `;case`toggle`:return`
        <label class="checklist-toggle">
          <input type="checkbox" name="enabled">
          <span>${x(t.label||`Enable`)}</span>
        </label>
        ${t.sub?`<p class="checklist-sub-help">${x(t.sub)}</p>`:``}
      `;case`flair`:return`
        <div class="checklist-inline-input">
          <input type="text" name="emoji" maxlength="4" placeholder="🔥 emoji">
          <input type="text" name="text" maxlength="32" placeholder="Flair text (optional)">
        </div>
      `;default:return``}}function Ee(){C&&(C.querySelectorAll(`[data-action="toggle-item"]`).forEach(e=>{e.addEventListener(`click`,()=>{let t=e.closest(`.checklist-card`)?.querySelector(`.checklist-card-form`);t&&(t.hidden=!t.hidden)})}),C.querySelectorAll(`[data-action="skip-item"]`).forEach(e=>{e.addEventListener(`click`,()=>{let t=e.closest(`.checklist-card-form`);t&&(t.hidden=!0)})}),C.querySelectorAll(`.checklist-card-form`).forEach(e=>{e.addEventListener(`submit`,async t=>{t.preventDefault(),await De(e)}),e.querySelectorAll(`.chip`).forEach(t=>{t.addEventListener(`click`,()=>{let n=e.querySelector(`input[name="value"]`);n&&(n.value=t.dataset.chip)})}),e.querySelector(`[data-action="calorie-auto"]`)?.addEventListener(`click`,async()=>{let t=e.querySelector(`[data-status]`);try{t&&(t.textContent=`Estimating…`),await de(`/api/account/profile`,{method:`PATCH`,body:JSON.stringify({calorieGoal:`auto`})}),t&&(t.textContent=`Saved`,t.className=`checklist-card-status is-ok`),await xe()}catch(e){t&&(t.textContent=`Failed: ${e?.message||``}`,t.className=`checklist-card-status is-error`)}})}),C.querySelector(`[data-action="hide-panel"]`)?.addEventListener(`click`,()=>{ge(!0),w.hidden=!0,w.panelOpen=!1,Ce(),ye()}))}async function De(e){let t=fe[e.dataset.itemId];if(!t)return;let n=e.querySelector(`[data-status]`),r=Oe(e,t);if(!r){n&&(n.textContent=`Please fill in a value.`,n.className=`checklist-card-status is-error`);return}try{n&&(n.textContent=`Saving…`,n.className=`checklist-card-status`),await de(`/api/account/profile`,{method:`PATCH`,body:JSON.stringify(r)}),n&&(n.textContent=`Saved`,n.className=`checklist-card-status is-ok`),await xe()}catch(e){n&&(n.textContent=`Failed: ${e?.message||``}`,n.className=`checklist-card-status is-error`)}}function Oe(e,t){let n=new FormData(e);switch(t.type){case`radio`:{let e=n.get(`value`);return e?{[t.field]:e}:null}case`weight`:{let e=n.get(`value`),r=n.get(`unit`)||`lb`;return e?{[t.field]:`${e} ${r}`}:null}case`height`:case`chips`:{let e=(n.get(`value`)||``).toString().trim();return e?{[t.field]:e}:null}case`calorie`:{let e=n.get(`value`);return e?{[t.field]:Number(e)}:null}case`water`:{let e=Number(n.get(`value`)),r=n.get(`unit`)||`oz`;if(!e)return null;let i=r===`ml`?e*.033814:r===`l`?e*33.814:e;return{[t.field]:Math.round(i)}}case`reminders`:{let e=n.get(`enabled`)===`on`,t=[n.get(`time1`),n.get(`time2`)].filter(Boolean);return{dailyReminderEnabled:e,dailyReminderTimes:e?t:[]}}case`toggle-day`:{let e=n.get(`enabled`)===`on`,r=n.get(`day`),i={[t.field]:e};return t.dayField&&r&&(i[t.dayField]=r),i}case`toggle`:return{[t.field]:n.get(`enabled`)===`on`};case`flair`:{let e=(n.get(`emoji`)||``).toString().trim(),t=(n.get(`text`)||``).toString().trim();return!e&&!t?null:{flair:t||e,leaderboardEmoji:e}}default:return null}}function ke(){let e=document.createElement(`div`);e.className=`checklist-done-banner`,e.innerHTML=`
    <span class="checklist-done-emoji" aria-hidden="true">🎉</span>
    <span>Profile setup complete — nice work.</span>
    <button type="button" class="checklist-done-close" aria-label="Dismiss">×</button>
  `,e.querySelector(`.checklist-done-close`).addEventListener(`click`,()=>e.remove()),document.body.appendChild(e),setTimeout(()=>e.remove(),8e3)}var Ae=`https://api.thetrackerapp.io`,je=[`Maintain`,`Lose`,`Gain`,`Recomp`,`Bulk`,`Cut`];function Me(){try{let e=localStorage.getItem(`tracker.auth.session`);if(!e)return``;try{let t=JSON.parse(e),n=t&&(t.token||t.accessToken);if(n)return String(n).trim()}catch{}return String(e).trim()}catch{return``}}async function Ne(e,t={}){let n=Me(),r={"Content-Type":`application/json`,...t.headers||{}};n&&(r.Authorization=`Bearer ${n}`);let i=await fetch(`${Ae}${e}`,{...t,headers:r});if(!i.ok){let e=await i.text().catch(()=>``);throw Error(`API ${i.status}: ${e||i.statusText}`)}return i.status===204?null:i.json().catch(()=>null)}function Pe(e){return String(e??``).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`).replace(/'/g,`&#39;`)}function Fe(e){if(!e)return``;let t=new Date(e);return Number.isNaN(t.getTime())?String(e):t.toLocaleDateString(`en-US`,{month:`short`,day:`numeric`,year:`numeric`})}function Ie(e){if(!e)return null;let t=new Date(e);return Number.isNaN(t.getTime())?null:t.toISOString().slice(0,10)}function Le(){return new Date().toISOString().slice(0,10)}function Re(e){let t=e.querySelector(`[data-edit="measurement"][data-field="date"]`);if(t){let e=Ie(t.textContent.trim());if(e)return e}return Le()}function ze(e,t){let n=(e.querySelector(`.value`)?.textContent||e.textContent||``).trim();if(!n||n===`--`)return null;if(t===`number`){let e=parseFloat(n);return Number.isNaN(e)?null:e}return n}function Be(e,t,n,r){if(t===`goal`){let t=String(e).toLowerCase();return r.classList.remove(`lose`,`gain`,`maintain`,`recomp`,`bulk`,`cut`),r.classList.add(t),Pe(String(e))}return t===`date`?Pe(Fe(e)||String(e)):r.classList.contains(`measurement-value`)?`<span class="value">${Pe(String(e))}</span><span class="unit">${Pe(n||``)}</span>`:Pe(String(e))}async function Ve(e,t,n,r){if(e===`profile`)return Ne(`/api/user/profile`,{method:`PATCH`,body:JSON.stringify({[t]:n})});let i=Re(r);return Ne(`/api/user/measurements`,{method:`POST`,body:JSON.stringify({date:i,[t]:n})})}function He(e,t){let n=e.dataset.edit;if(n===`journal`)return Ue(e);let r=e.dataset.field,i=e.dataset.type||`number`,a=e.dataset.unit||``,o=e.innerHTML,s=ze(e,i),c;if(i===`goal`?(c=document.createElement(`select`),c.className=`inline-edit-input`,je.forEach(e=>{let t=document.createElement(`option`);t.value=e,t.textContent=e,s&&e.toLowerCase()===String(s).toLowerCase()&&(t.selected=!0),c.appendChild(t)})):i===`date`?(c=document.createElement(`input`),c.className=`inline-edit-input`,c.type=`date`,c.value=Ie(s)||Le()):(c=document.createElement(`input`),c.className=`inline-edit-input`,c.type=`number`,c.inputMode=`decimal`,c.step=`0.1`,c.placeholder=a?`value (${a})`:`value`,c.value=s??``),c.setAttribute(`aria-label`,e.getAttribute(`aria-label`)||e.dataset.field||`Edit`),e.innerHTML=``,e.appendChild(c),i===`number`&&a){let t=document.createElement(`span`);t.className=`unit`,t.textContent=a,e.appendChild(t)}c.focus(),c.select&&c.select();let l=!1;c.addEventListener(`blur`,async()=>{if(l)return;l=!0;let s=c.value;if(s===``||s==null){e.innerHTML=o;return}let u=i===`number`?Number(s):s;if(i===`number`&&(Number.isNaN(u)||u<0)){e.innerHTML=o;return}try{await Ve(n,r,u,t),e.innerHTML=Be(u,i,a,e),e.classList.add(`just-saved`),setTimeout(()=>e.classList.remove(`just-saved`),700)}catch(t){e.innerHTML=o,e.classList.add(`save-failed`),setTimeout(()=>e.classList.remove(`save-failed`),1200),console.warn(`Save failed:`,t)}}),c.addEventListener(`keydown`,t=>{t.key===`Enter`?(t.preventDefault(),c.blur()):t.key===`Escape`&&(t.preventDefault(),l=!0,e.innerHTML=o)})}function Ue(e){let t=e.dataset.part,n=e.dataset.display||t,r=e.querySelector(`.journal-content`),i=e.querySelector(`.journal-date`);if(!r)return;let a=r.querySelector(`em`)?``:r.textContent.trim(),o=document.createElement(`textarea`);o.className=`inline-edit-textarea`,o.rows=3,o.placeholder=`How does your ${n.toLowerCase()} look and feel?`,o.value=a,r.replaceChildren(o),o.focus();let s=!1;o.addEventListener(`blur`,async()=>{if(s)return;s=!0;let n=o.value.trim();if(!n&&!a){r.innerHTML=`<em>Click to add assessment...</em>`;return}if(!n&&a){try{await Ne(`/api/user/journals/${encodeURIComponent(t)}`,{method:`DELETE`}),r.innerHTML=`<em>Click to add assessment...</em>`,i&&i.remove()}catch{r.textContent=a}return}try{let a=await Ne(`/api/user/journals/${encodeURIComponent(t)}`,{method:`POST`,body:JSON.stringify({content:n})});r.textContent=n;let o=a&&(a.date||a.updatedAt)||new Date().toISOString();if(i)i.textContent=`Updated ${Fe(o)}`;else{let t=document.createElement(`span`);t.className=`journal-date`,t.textContent=`Updated ${Fe(o)}`,e.appendChild(t)}e.classList.add(`just-saved`),setTimeout(()=>e.classList.remove(`just-saved`),700)}catch(t){r.textContent=a,e.classList.add(`save-failed`),setTimeout(()=>e.classList.remove(`save-failed`),1200),console.warn(`Journal save failed:`,t)}}),o.addEventListener(`keydown`,e=>{e.key===`Enter`&&(e.metaKey||e.ctrlKey)?(e.preventDefault(),o.blur()):e.key===`Escape`&&(e.preventDefault(),s=!0,r.innerHTML=a?Pe(a):`<em>Click to add assessment...</em>`)})}function We(e={},t=document){if(!t)return;let n=Array.isArray(e.measurements)&&e.measurements[0]||(e.latest&&typeof e.latest==`object`?e.latest:null);if(n&&t.querySelectorAll(`[data-edit="measurement"], [data-edit="profile"]`).forEach(e=>{let t=e.dataset.field;if(!t)return;let r=n[t];r==null||r===``||(e.innerHTML=Be(r,e.dataset.type||`number`,e.dataset.unit||``,e))}),e.goal){let n=t.querySelector(`[data-edit="profile"][data-field="goal"]`);n&&(n.innerHTML=Be(e.goal,`goal`,``,n))}e.journals&&typeof e.journals==`object`&&Object.entries(e.journals).forEach(([e,n])=>{let r=t.querySelector(`[data-edit="journal"][data-part="${CSS.escape(e)}"]`);if(!r||!n)return;let i=r.querySelector(`.journal-content`);if(i&&n.content&&(i.textContent=n.content),n.date){let e=r.querySelector(`.journal-date`);e||(e=document.createElement(`span`),e.className=`journal-date`,r.appendChild(e)),e.textContent=`Updated ${Fe(n.date)}`}})}function Ge(e=document){e&&e.querySelectorAll(`[data-edit]`).forEach(t=>{t.dataset.inlineEditBound!==`1`&&(t.dataset.inlineEditBound=`1`,t.classList.add(`editable`),t.hasAttribute(`tabindex`)||t.setAttribute(`tabindex`,`0`),t.hasAttribute(`role`)||t.setAttribute(`role`,`button`),t.addEventListener(`click`,n=>{t.querySelector(`input, textarea, select`)||n.target.closest(`.journal-date`)||(n.preventDefault(),He(t,e))}),t.addEventListener(`keydown`,n=>{(n.key===`Enter`||n.key===` `)&&(n.preventDefault(),He(t,e))}))})}var Ke=`https://api.thetrackerapp.io`;function qe(){try{let e=localStorage.getItem(`tracker.auth.session`);if(!e)return``;try{let t=JSON.parse(e),n=t&&(t.token||t.accessToken);if(n)return String(n).trim()}catch{}return String(e).trim()}catch{return``}}function Je(){try{let e=localStorage.getItem(`tracker.auth.user`);if(e){let t=JSON.parse(e),n=[t?.username,t?.canonical,t?.credential,t?.maskedCredential,t?.accountId,t?.email];for(let e of n)if(e&&String(e).trim())return String(e).trim()}}catch{}for(let e of[`tracker.identity.contact`,`tracker.user.contact`,`tracker.account.contact`,`tracker.username`])try{let t=localStorage.getItem(e);if(t&&t.trim())return t.trim()}catch{}return``}async function Ye(e){let t=qe(),n={Accept:`application/json`};t&&(n.Authorization=`Bearer ${t}`);let r=`${Ke}${e}${e.includes(`?`)?`&`:`?`}_=${Date.now()}`,i=await fetch(r,{headers:n,cache:`no-store`});if(!i.ok)throw Error(`API ${i.status}`);return i.json()}var Xe=[`body`,`bodyMeasures`,`nutrition`,`hydration`,`health`],Ze={body:`Body`,bodyMeasures:`Body Measurements`,nutrition:`Nutrition`,hydration:`Hydration`,health:`Health`},Qe=[`#38ffd3`,`#64b5f6`,`#ff7f7f`,`#ffb74d`,`#ba68c8`,`#4fc3f7`,`#81c784`,`#ef5350`,`#9575cd`,`#f48fb1`,`#ffcc80`,`#90a4ae`];function $e(e,t){return Qe[t%Qe.length]}var et=[{left:`bicepL`,right:`bicepR`,label:`Biceps`,unit:`in`},{left:`forearmL`,right:`forearmR`,label:`Forearms`,unit:`in`},{left:`quadL`,right:`quadR`,label:`Quads`,unit:`in`},{left:`calfL`,right:`calfR`,label:`Calves`,unit:`in`}],tt=[`weight`,`calories`,`protein`,`water`],nt=[`all`,`workouts`,`nutrition`,`water`],rt={calories:`#ffb74d`,protein:`#64b5f6`,carbs:`#81c784`,fats:`#ffd54f`,saturatedFat:`#ef5350`,polyunsaturatedFat:`#26a69a`,monounsaturatedFat:`#66bb6a`,transFat:`#d81b60`,sugars:`#f48fb1`,sodium:`#9575cd`,cholesterol:`#ff8a65`,fiber:`#a1887f`,caffeine:`#7e57c2`,creatine:`#4dd0e1`},T={range:`30d`,data:null,cardio:null,overlay:[`weight`,`calories`,`protein`],inflight:null,contact:``,advancedOpen:!1,chartMode:{all:`combined`,workouts:`combined`,nutrition:`combined`,water:`combined`},subView:it()};function it(){if(typeof window>`u`)return`all`;let e=(window.location.hash||``).replace(/^#/,``).toLowerCase();return nt.includes(e)?e:`all`}function at(e){if(typeof window>`u`)return;let t=e===`all`?``:`#${e}`;window.location.hash!==t&&history.replaceState(null,``,`${window.location.pathname}${window.location.search}${t}`)}function ot(e){switch(e){case`7d`:return`w`;case`30d`:return`m`;case`90d`:return`90d`;case`1y`:return`y`;case`all`:return`at`;default:return`w`}}var E=null;async function st(e){e&&(E=e,T.contact=Je(),e.innerHTML=`
    <div class="grafana-shell" id="grafanaShell">
      <nav class="stats-subtabs" role="tablist" aria-label="Stats view">
        ${lt(`all`,`🏠 All`)}
        ${lt(`workouts`,`🏋️ Workouts`)}
        ${lt(`nutrition`,`🍎 Nutrition`)}
        ${lt(`water`,`💧 Water`)}
      </nav>
      <div class="grafana-toolbar">
        <div class="range-buttons" role="tablist" aria-label="Time range">
          ${ct(`7d`,`7D`)}
          ${ct(`30d`,`30D`,!0)}
          ${ct(`90d`,`90D`)}
          ${ct(`1y`,`1Y`)}
          ${ct(`all`,`All`)}
        </div>
        <div class="grafana-toolbar-actions">
          <button type="button" class="grafana-refresh" id="grafanaShareWeek" aria-label="Download a shareable weekly snapshot PNG">📸 Share week</button>
          <button type="button" class="grafana-refresh" id="grafanaDownloadWorkouts" aria-label="Download all workouts as CSV (PRs highlighted)">📋 Workouts CSV</button>
          <button type="button" class="grafana-refresh" id="grafanaRefresh" aria-label="Refresh charts">↻ Refresh</button>
        </div>
      </div>
      <div class="grafana-body" id="grafanaBody">
        <p class="grafana-empty">Loading chart data…</p>
      </div>
    </div>
  `,ut(e),e.querySelectorAll(`.range-btn`).forEach(t=>{t.addEventListener(`click`,()=>{e.querySelectorAll(`.range-btn`).forEach(e=>e.classList.remove(`active`)),t.classList.add(`active`),T.range=t.dataset.range,dt()})}),e.querySelector(`#grafanaRefresh`)?.addEventListener(`click`,()=>{dt()}),e.querySelector(`#grafanaShareWeek`)?.addEventListener(`click`,async()=>{T.data||await dt();let{downloadWeeklySnapshot:e}=await u(async()=>{let{downloadWeeklySnapshot:e}=await import(`./weekly-snapshot-DlbWkyEQ.js`);return{downloadWeeklySnapshot:e}},[]);e({data:T.data,cardio:T.cardio,username:T.contact||`you`})}),e.querySelector(`#grafanaDownloadWorkouts`)?.addEventListener(`click`,async()=>{T.data||await dt(),pt(T.data,T.contact||`you`)}),await dt())}function ct(e,t,n=!1){return`<button type="button" class="range-btn ${n?`active`:``}" data-range="${e}">${t}</button>`}function lt(e,t){let n=T.subView===e;return`<button type="button" class="stats-subtab ${n?`active`:``}" role="tab" aria-selected="${n}" data-subview="${e}">${t}</button>`}function ut(e){e.querySelectorAll(`.stats-subtab`).forEach(t=>{t.addEventListener(`click`,()=>{let n=t.dataset.subview;!nt.includes(n)||n===T.subView||(T.subView=n,at(n),e.querySelectorAll(`.stats-subtab`).forEach(e=>{let t=e.dataset.subview===n;e.classList.toggle(`active`,t),e.setAttribute(`aria-selected`,String(t))}),T.data&&ft())})})}async function dt(){if(!E)return;let e=E.querySelector(`#grafanaBody`);if(e){if(T.contact||=Je(),!T.contact){e.innerHTML=`<p class="grafana-empty">Sign in to view your charts.</p>`;return}e.innerHTML=`<p class="grafana-empty">Loading chart data…</p>`;try{T.inflight&&T.inflight.abort?.();let e=new URLSearchParams({contact:T.contact,range:T.range}),t=new URLSearchParams({contact:T.contact,range:ot(T.range)}),[n,r]=await Promise.all([Ye(`/api/chart/data?${e.toString()}`),Ye(`/api/cardio/stats?${t.toString()}`).catch(()=>null)]);if(!n||n.ok===!1)throw Error(`Bad response`);T.data=n,T.cardio=r&&r.ok!==!1?r:null,ft()}catch(t){e.innerHTML=`<p class="grafana-empty grafana-error">Chart data unavailable: ${k(t?.message||`request failed`)}</p>`,console.warn(`Chart data fetch failed:`,t)}}}function ft(){if(!E||!T.data)return;let e=E.querySelector(`#grafanaBody`);if(!e)return;let{metrics:t,metricsByCategory:n,chartData:r}=T.data,i=new Map;if((t||[]).forEach(e=>{e.key===`waterGallons`&&T.data.chartData?.water||e.available&&Array.isArray(r[e.key])&&r[e.key].length>0&&i.set(e.key,e)}),i.size===0){e.innerHTML=`<p class="grafana-empty">No data yet for this time range. Try widening the range or log something via text.</p>`;return}T.overlay=T.overlay.filter(e=>i.has(e)),T.overlay.length===0&&(T.overlay=tt.filter(e=>i.has(e)).slice(0,3),T.overlay.length===0&&(T.overlay=Array.from(i.keys()).slice(0,3)));let a=``;a=T.subView===`workouts`?Vt(i,n):T.subView===`nutrition`?Ht(i,n):T.subView===`water`?Ut(i,n):`
      ${xt(i)}
      ${St(i)}
      ${Bt(zt(i),{subView:`all`,title:`Everything you're tracking`,subtitle:`All ${i.size} metric${i.size===1?``:`s`} over ${T.range.toUpperCase()}. Click a legend chip to hide a line; toggle Individual to see each on its own.`,defaultVisibleKeys:tt.filter(e=>i.has(e))})}
      <div class="advanced-toggle-row">
        <button type="button" class="advanced-toggle ${T.advancedOpen?`is-open`:``}" id="advancedToggle" aria-expanded="${T.advancedOpen}">
          <span class="advanced-toggle-icon">${T.advancedOpen?`−`:`+`}</span>
          ${T.advancedOpen?`Hide advanced charts`:`Show advanced charts`}
        </button>
      </div>
      <div class="advanced-section" id="advancedSection" ${T.advancedOpen?``:`hidden`}>
        ${Kt(i)}
        ${qt(i)}
        ${Jt(n,i)}
      </div>
    `,e.innerHTML=a,Ft(T.data),requestAnimationFrame(()=>$t(i)),Xt(i),vt(),gt(i);let o=E?.querySelector(`#supplementsPanelHost`);o&&u(()=>import(`./dashboard-supplements-CRCVzB-l.js`).then(e=>e.initSupplementsPanel(o)),[]).catch(e=>console.warn(`supplements panel failed:`,e)),E.querySelector(`#advancedToggle`)?.addEventListener(`click`,()=>{T.advancedOpen=!T.advancedOpen,ft()})}function pt(e,t){if(!e)return;let n=[`bench`,`squat`,`deadlift`,`overheadPress`,`ohp`,`row`,`pullup`,`pushup`],r=(Array.isArray(e.metrics)?e.metrics:[]).filter(e=>e.available!==!1&&(e.category===`strength`||n.includes(e.key)));if(!r.length){alert(`No strength workouts to export yet — log one via text first.`);return}let i=[];for(let t of r){let n=e.chartData?.[t.key]||[],r=Number(t.stats?.max),a=t.unit||`lb`;for(let e of n){let n=Number(e.value);if(!Number.isFinite(n))continue;let o=Number.isFinite(r)&&Math.abs(n-r)<.001;i.push({date:e.date,lift:t.label||t.key,value:n,unit:a,isPR:o,source:e.source||``,id:e.id??``})}}i.sort((e,t)=>String(t.date).localeCompare(String(e.date)));let a=e=>{let t=String(e??``);return/[",\n]/.test(t)?`"${t.replace(/"/g,`""`)}"`:t},o=`${[`Date`,`Lift`,`Value`,`Unit`,`PR`,`Source`,`ID`].map(a).join(`,`)}\n${i.map(e=>[e.date,e.lift,e.value,e.unit,e.isPR?`★ PR`:``,e.source,e.id].map(a).join(`,`)).join(`
`)}\n`,s=new Blob([o],{type:`text/csv;charset=utf-8;`}),c=URL.createObjectURL(s),l=document.createElement(`a`),u=String(t||`user`).replace(/[^a-zA-Z0-9_-]/g,`_`);l.href=c,l.download=`${u}-workouts-${new Date().toISOString().slice(0,10)}.csv`,document.body.appendChild(l),l.click(),l.remove(),setTimeout(()=>URL.revokeObjectURL(c),1500)}async function mt(e,t){try{(await u(()=>import(`./dashboard-drilldown-BMpMWWQz.js`),[])).openNutritionDay({date:e,fallback:t||{}})}catch(e){console.warn(`openNutritionDay failed:`,e)}}async function ht(){try{let e=await u(()=>import(`./dashboard-drilldown-BMpMWWQz.js`),[]),t=T.data?.chartData?.weight||[];e.openMetricEntries({key:`weight`,label:`Weight`,unit:`lb`,points:t})}catch(e){console.warn(`openMetricEntries failed:`,e)}}function gt(e){if(!E)return;E.querySelectorAll(`.week-bar[data-day]`).forEach(e=>{e.style.cursor=`pointer`,e.addEventListener(`click`,()=>{let t=e.dataset.day,n=Number(e.dataset.value||0),r=(T.data?.chartData?.calories||[]).find(e=>e.date===t)||{};mt(t,{total:n,entryCount:r.entryCount,sources:Array.isArray(r.sources)?r.sources:r.source?[r.source]:[]})}),e.addEventListener(`keydown`,t=>{(t.key===`Enter`||t.key===` `)&&(t.preventDefault(),e.click())})});let t=E.querySelector(`.spotlight-calories .spotlight-cal-big`);t&&(t.style.cursor=`pointer`,t.title=`Click to see today's food entries`,t.addEventListener(`click`,()=>{let e=vn(),t=(T.data?.chartData?.calories||[]).find(t=>t.date===e)||{};mt(e,{total:Number(t.value)||0,entryCount:t.entryCount,sources:Array.isArray(t.sources)?t.sources:t.source?[t.source]:[]})}));let n=E.querySelector(`.metric-card[data-metric="weight"]`);if(n&&!n.querySelector(`.metric-card-view-entries`)){let e=n.querySelector(`.metric-card-head`);if(e){let t=document.createElement(`button`);t.type=`button`,t.className=`metric-card-view-entries`,t.textContent=`View entries`,t.addEventListener(`click`,e=>{e.stopPropagation(),ht()}),e.appendChild(t)}}}var _t=[`Maintain`,`Lose`,`Gain`,`Recomp`,`Bulk`,`Cut`];function vt(){document.querySelectorAll(`[data-target-edit]`).forEach(e=>{e.dataset.spotlightBound!==`1`&&(e.dataset.spotlightBound=`1`,e.addEventListener(`click`,t=>{t.preventDefault(),yt(e)}),e.addEventListener(`keydown`,t=>{(t.key===`Enter`||t.key===` `)&&(t.preventDefault(),yt(e))}))}),document.querySelectorAll(`.spotlight-maint-why`).forEach(e=>{e.dataset.maintBound!==`1`&&(e.dataset.maintBound=`1`,e.addEventListener(`click`,()=>{let t=e.dataset.why||`Maintenance calories are estimated from your age, sex, height, weight, and recent activity.`;alert(t)}))})}function yt(e){if(e.querySelector(`input, select`))return;let t=e.dataset.targetEdit,n=t===`fitnessGoal`,r=e.dataset.targetUnit||``,i=e.innerHTML,a;if(n)a=document.createElement(`select`),a.className=`spotlight-edit-input`,_t.forEach(t=>{let n=document.createElement(`option`);n.value=t,n.textContent=t,t.toLowerCase()===e.textContent.trim().toLowerCase()&&(n.selected=!0),a.appendChild(n)});else{a=document.createElement(`input`),a.className=`spotlight-edit-input`,a.type=`number`,a.inputMode=`numeric`,a.min=`0`,a.step=`1`,a.placeholder=r;let t=e.textContent.match(/(\d+)/);t&&(a.value=t[1])}e.innerHTML=``,e.appendChild(a),a.focus&&a.focus(),a.select&&a.select();let o=!1;a.addEventListener(`blur`,async()=>{if(o)return;o=!0;let r=a.value;if(r===``||r==null){e.innerHTML=i;return}let s;if(n)s=String(r);else{let t=Number(r);if(!Number.isFinite(t)||t<0){e.innerHTML=i;return}s=Math.round(t)}try{if(await bt(t,s),n)T.data.goal=s;else{let e=t.replace(/Goal$/,``);T.data.targets=T.data.targets||{},T.data.targets[e]=s}e.classList.add(`just-saved`),setTimeout(()=>ft(),250)}catch(t){e.innerHTML=i,e.classList.add(`save-failed`),setTimeout(()=>e.classList.remove(`save-failed`),1200),console.warn(`Save target failed:`,t)}}),a.addEventListener(`keydown`,t=>{t.key===`Enter`?(t.preventDefault(),a.blur()):t.key===`Escape`&&(t.preventDefault(),o=!0,e.innerHTML=i)})}async function bt(e,t){let n=T.contact||Je();if(!n)throw Error(`Missing contact`);let r=new URLSearchParams({contact:n}),i=qe(),a={"Content-Type":`application/json`,Accept:`application/json`};i&&(a.Authorization=`Bearer ${i}`);let o=await fetch(`${Ke}/api/account/profile?${r.toString()}`,{method:`PATCH`,headers:a,body:JSON.stringify({[e]:t})});if(!o.ok){let e=await o.text().catch(()=>``);throw Error(`PATCH /api/account/profile ${o.status}: ${e||o.statusText}`)}return o.json().catch(()=>null)}function xt(e){let t=vn(),n=e=>{let n=T.data.chartData?.[e];if(!Array.isArray(n))return null;let r=n.find(e=>e.date===t);return r?r.value:null},r=T.data.goal||T.data.profile?.goal||`Maintain`,i=Number(T.data.streak?.currentDays??T.data.streak??0)||0,a=T.data.targets||T.data.goals||{},o=n(`calories`),s=Nt(a.calories,null),c=s&&o!=null?Math.min(100,Math.round(o/s*100)):null,l=T.data.maintenanceCalories,u=l&&typeof l==`object`?{value:Nt(l.value,null),confidence:String(l.confidence||``).toLowerCase(),method:String(l.method||``),explanation:l.explanation||``}:l==null?null:{value:Nt(l,null),confidence:``,method:``,explanation:``},d=[`saturatedFat`,`polyunsaturatedFat`,`monounsaturatedFat`,`transFat`].map(e=>{let t=n(e);if(t==null)return null;let r=Nt(a[e],null);return{key:e,label:{saturatedFat:`Saturated`,polyunsaturatedFat:`Polyunsat`,monounsaturatedFat:`Monounsat`,transFat:`Trans`}[e],value:t,target:r}}).filter(Boolean),f=[`protein`,`carbs`,`fats`].map(e=>{let t=n(e),r=Nt(a[e],null);return{key:e,label:e[0].toUpperCase()+e.slice(1),unit:`g`,value:t,target:r,pct:r&&t!=null?Math.min(100,Math.round(t/r*100)):null,color:{protein:`#64b5f6`,carbs:`#ffb74d`,fats:`#ba68c8`}[e],breakdown:e===`fats`?d:null}}),p=(()=>{let e=[];for(let n=6;n>=0;n--){let r=new Date;r.setDate(r.getDate()-n);let i=r.toISOString().slice(0,10),a=T.data.chartData?.calories?.find(e=>e.date===i);e.push({date:i,value:a?a.value:0,label:r.toLocaleDateString(`en-US`,{weekday:`short`})[0],weekdayShort:r.toLocaleDateString(`en-US`,{weekday:`short`}),dateLong:r.toLocaleDateString(`en-US`,{weekday:`short`,month:`short`,day:`numeric`,year:`numeric`}),isToday:i===t})}return e})(),m=Math.max(1,...p.map(e=>e.value));return`
    <section class="spotlight">
      <article class="spotlight-card spotlight-calories">
        <header class="spotlight-card-head">
          <span class="spotlight-label">Calories today</span>
          <span class="spotlight-goal-pill goal-${r.toLowerCase()} editable-goal" data-target-edit="fitnessGoal" tabindex="0" role="button" aria-label="Edit fitness goal">${k(r)}</span>
        </header>
        <div class="spotlight-cal-row">
          ${Mt(c,`kcal`)}
          <div class="spotlight-cal-stats">
            <div class="spotlight-cal-big">
              ${o==null?`—`:`${Math.round(o).toLocaleString()}<span class="spotlight-cal-unit">kcal</span>`}
            </div>
            <div class="spotlight-cal-sub editable-target" data-target-edit="calorieGoal" data-target-unit="kcal" tabindex="0" role="button" aria-label="Edit calorie target">${s?`of ${Math.round(s).toLocaleString()} kcal`:`+ Set target`}</div>
            ${s&&o!=null?`<div class="spotlight-cal-delta ${o>s?`delta-over`:`delta-under`}">${o>s?`+`:``}${Math.round(o-s).toLocaleString()} kcal vs target</div>`:``}
          </div>
        </div>
        ${jt(u,o)}
      </article>

      <article class="spotlight-card spotlight-macros">
        <header class="spotlight-card-head">
          <span class="spotlight-label">Macros today</span>
        </header>
        <div class="macros-bars">
          ${f.map(e=>{let t=`${e.key}Goal`,n=e.unit||`g`,r=e.value==null?`<span class="macro-row-empty">—</span>`:`<span class="macro-row-logged">${Math.round(e.value)}${n}</span>`,i=e.target?`<span class="editable-target" data-target-edit="${t}" data-target-unit="${n}" tabindex="0" role="button" aria-label="Edit ${e.label} target">${Math.round(e.target)}${n}</span>`:`<span class="editable-target macro-target-empty" data-target-edit="${t}" data-target-unit="${n}" tabindex="0" role="button" aria-label="Set ${e.label} target">+ Set target</span>`,a=e.breakdown&&e.breakdown.length?`<details class="macro-fat-breakdown"><summary>Fat breakdown</summary>${e.breakdown.map(e=>`
                        <div class="macro-fat-row${e.key===`transFat`?` is-trans`:``}">
                          <span class="macro-fat-label">${k(e.label)}</span>
                          <span class="macro-fat-value">${Math.round(e.value*10)/10}g${e.target?` <span class="macro-fat-target">/ ${Math.round(e.target)}g</span>`:``}</span>
                        </div>`).join(``)}</details>`:``;return`
            <div class="macro-row" style="--macro-color:${e.color}">
              <div class="macro-row-head">
                <span class="macro-row-label">${e.label}</span>
                <span class="macro-row-value">${r}<span class="macro-row-divider"> / </span>${i}</span>
              </div>
              <div class="macro-bar"><div class="macro-bar-fill" style="width:${e.pct??0}%"></div></div>
              ${a}
            </div>
          `}).join(``)}
        </div>
      </article>

      <article class="spotlight-card spotlight-streak">
        <header class="spotlight-card-head">
          <span class="spotlight-label">Logging streak</span>
        </header>
        <div class="streak-body">
          <div class="streak-emoji" aria-hidden="true">🔥</div>
          <div class="streak-stats">
            <div class="streak-count">${i}</div>
            <div class="streak-sub">${i===1?`day in a row`:`days in a row`}</div>
          </div>
        </div>
      </article>

      <article class="spotlight-card spotlight-week">
        <header class="spotlight-card-head">
          <span class="spotlight-label">Calories — this week</span>
          <span class="spotlight-sub">Sun → Sat</span>
        </header>
        <div class="week-bars" role="img" aria-label="Calories for the last 7 days">
          ${p.map(e=>{let t=e.value?`${Math.round(e.value).toLocaleString()} kcal`:`No data`;return`
            <div class="week-bar ${e.isToday?`is-today`:``}" tabindex="0" role="button"
                 data-day="${A(e.date)}" data-value="${A(String(e.value||0))}"
                 aria-label="${k(e.dateLong)} — ${k(t)}. Click to view entries.">
              <div class="week-bar-tooltip" role="tooltip">
                <span class="week-bar-tooltip-date">${k(e.dateLong)}${e.isToday?` · Today`:``}</span>
                <span class="week-bar-tooltip-value ${e.value?``:`is-empty`}">${k(t)}</span>
                <span class="week-bar-tooltip-hint">Click to view entries</span>
              </div>
              <div class="week-bar-fill" style="height:${e.value?Math.max(4,Math.round(e.value/m*100)):2}%"></div>
              <span class="week-bar-label">${k(e.label)}</span>
            </div>
          `}).join(``)}
        </div>
      </article>
    </section>
  `}function St(e){let t=[Ct(e),Et(),wt(e),Tt(e)].filter(Boolean);return t.length?`<section class="info-strips" aria-label="Activity strips">${t.join(``)}</section>`:``}function Ct(e){if(!e.get(`calories`))return``;let t=(T.data.chartData?.calories||[]).slice();if(!t.length)return``;let n=vn(),r=t.filter(e=>{let t=new Date(e.date);if(Number.isNaN(t.getTime()))return!1;let n=(Date.now()-t.getTime())/(1e3*60*60*24);return n>=0&&n<=7});if(!r.length)return``;let i=r.reduce((e,t)=>e+(Number(t.value)||0),0),a=i/r.length,o=r.reduce((e,t)=>Number(t.value)>Number(e.value)?t:e,r[0]),s=T.data.targets?.calories,c=s?s*7:null,l=c?Math.min(100,Math.round(i/c*100)):null,u=t.find(e=>e.date===n)?.value;return`
    <article class="info-strip strip-calories">
      <header class="info-strip-head">
        <span class="info-strip-icon">🍎</span>
        <div class="info-strip-headings">
          <span class="info-strip-title">Calories</span>
          <span class="info-strip-sub">Last 7 days</span>
        </div>
      </header>
      <div class="info-strip-row">
        <div class="info-stat">
          <span class="info-stat-label">Today</span>
          <span class="info-stat-value">${u==null?`—`:`${Math.round(u).toLocaleString()}<span class="info-stat-unit"> kcal</span>`}</span>
        </div>
        <div class="info-stat">
          <span class="info-stat-label">7-day total</span>
          <span class="info-stat-value">${Math.round(i).toLocaleString()}<span class="info-stat-unit"> kcal</span></span>
        </div>
        <div class="info-stat">
          <span class="info-stat-label">Daily avg</span>
          <span class="info-stat-value">${Math.round(a).toLocaleString()}<span class="info-stat-unit"> kcal</span></span>
        </div>
        <div class="info-stat">
          <span class="info-stat-label">Biggest day</span>
          <span class="info-stat-value">${Math.round(o.value).toLocaleString()}<span class="info-stat-unit"> kcal</span><span class="info-stat-date">${k(Lt(o.date))}</span></span>
        </div>
      </div>
      ${l==null?``:`
        <div class="info-strip-bar" style="--strip-color:#ff8a65">
          <div class="info-strip-bar-fill" style="width:${l}%"></div>
          <span class="info-strip-bar-label">${l}% of ${Math.round(c).toLocaleString()} kcal weekly target</span>
        </div>
      `}
    </article>
  `}function wt(e){let t=e.get(`workouts`),n=t?.stats?.count??null,r=[`bench`,`squat`,`deadlift`,`overheadPress`,`row`].filter(t=>e.has(t));if(!t&&r.length===0)return``;let i=r.slice(0,4).map(t=>{let n=e.get(t),r=n.stats?.last?.value,i=n.stats?.max,a=n.stats?.delta,o=n.unit||`lb`;return`
      <div class="info-strip-pr">
        <span class="info-strip-pr-label">${k(n.label)}</span>
        <span class="info-strip-pr-value">${r==null?`—`:`${Math.round(r)}<span class="info-stat-unit"> ${k(o)}</span>`}</span>
        <span class="info-strip-pr-meta">
          ${i==null?``:`PR ${Math.round(i)} ${k(o)}`}${a?` · ${a>0?`+`:``}${Math.round(a)} ${k(o)}`:``}
        </span>
      </div>
    `}).join(``);return`
    <article class="info-strip strip-workouts">
      <header class="info-strip-head">
        <span class="info-strip-icon">🏋️</span>
        <div class="info-strip-headings">
          <span class="info-strip-title">Workouts</span>
          <span class="info-strip-sub">${T.range.toUpperCase()}${n==null?``:` · ${n} session${n===1?``:`s`}`}</span>
        </div>
      </header>
      ${r.length?`<div class="info-strip-prs">${i}</div>`:`<p class="info-strip-empty">Log a workout via text to see your PRs and weekly volume here.</p>`}
    </article>
  `}function Tt(e){if(!e.get(`water`))return``;let t=T.data.chartData?.water||[];if(!t.length)return``;let n=vn(),r=t.find(e=>e.date===n)?.value||0,i=T.data.targets?.water,a=i?Math.min(100,Math.round(r/i*100)):null,o=t.filter(e=>{let t=new Date(e.date);if(Number.isNaN(t.getTime()))return!1;let n=(Date.now()-t.getTime())/(1e3*60*60*24);return n>=0&&n<=7}),s=o.reduce((e,t)=>e+(Number(t.value)||0),0),c=i?o.filter(e=>Number(e.value)>=i).length:null;return`
    <article class="info-strip strip-water">
      <header class="info-strip-head">
        <span class="info-strip-icon">💧</span>
        <div class="info-strip-headings">
          <span class="info-strip-title">Water</span>
          <span class="info-strip-sub">Today + last 7 days</span>
        </div>
      </header>
      <div class="info-strip-row">
        <div class="info-stat">
          <span class="info-stat-label">Today</span>
          <span class="info-stat-value">${Math.round(r)}<span class="info-stat-unit"> oz</span></span>
        </div>
        ${i?`<div class="info-stat">
                <span class="info-stat-label">Target</span>
                <span class="info-stat-value editable-target" data-target-edit="waterGoal" data-target-unit="oz" tabindex="0" role="button" aria-label="Edit water target">${Math.round(i)}<span class="info-stat-unit"> oz</span></span>
              </div>`:`<div class="info-stat">
                <span class="info-stat-label">Target</span>
                <span class="info-stat-value editable-target macro-target-empty" data-target-edit="waterGoal" data-target-unit="oz" tabindex="0" role="button">+ Set target</span>
              </div>`}
        <div class="info-stat">
          <span class="info-stat-label">7-day total</span>
          <span class="info-stat-value">${Math.round(s)}<span class="info-stat-unit"> oz</span></span>
        </div>
        ${c==null?``:`<div class="info-stat">
                <span class="info-stat-label">Days hit target</span>
                <span class="info-stat-value">${c}<span class="info-stat-unit"> / 7</span></span>
              </div>`}
      </div>
      ${a==null?``:`
        <div class="info-strip-bar" style="--strip-color:#4fc3f7">
          <div class="info-strip-bar-fill" style="width:${a}%"></div>
          <span class="info-strip-bar-label">${a}% of today's ${Math.round(i)} oz target</span>
        </div>
      `}
    </article>
  `}function Et(){let e=T.cardio;if(!e)return``;let t=e.summary||{},n=Number(t.totalSessions||0);if(n===0)return``;let r=Array.isArray(e.byCategory)?e.byCategory:[],i=r.slice().sort((e,t)=>(t.sessions||0)-(e.sessions||0))[0],a=e.goals||{},o=a.weeklyMiles?Math.min(100,Math.round(Number(t.totalMiles||0)/Number(a.weeklyMiles)*100)):null,s=a.weeklySessions?Math.min(100,Math.round(n/Number(a.weeklySessions)*100)):null,c=a.weeklyCalories?Math.min(100,Math.round(Number(t.totalCalories||0)/Number(a.weeklyCalories)*100)):null,l=i?`${k(Ot[i.category]||i.category)} focus`:`Cardio this period`,u=(e.recentWorkouts||[]).slice(0,4);return`
    <section class="cardio-strip" aria-label="Cardio summary">
      <header class="cardio-strip-head">
        <div>
          <span class="spotlight-label">${k(l)}</span>
          <span class="spotlight-sub">${k(T.range.toUpperCase())} · ${n} session${n===1?``:`s`}</span>
        </div>
        <div class="cardio-totals">
          <div class="cardio-total">
            <span class="cardio-total-value">${At(t.totalMiles)}</span>
            <span class="cardio-total-label">mi total</span>
          </div>
          <div class="cardio-total">
            <span class="cardio-total-value">${Math.round(t.totalCalories||0).toLocaleString()}</span>
            <span class="cardio-total-label">kcal burned</span>
          </div>
          <div class="cardio-total">
            <span class="cardio-total-value">${k(t.totalTime||`0:00`)}</span>
            <span class="cardio-total-label">total time</span>
          </div>
        </div>
      </header>

      ${o!=null||s!=null||c!=null?`
        <div class="cardio-goal-bars">
          ${o==null?``:Dt(`Miles`,t.totalMiles,a.weeklyMiles,`mi`,o,`#38ffd3`)}
          ${s==null?``:Dt(`Sessions`,n,a.weeklySessions,``,s,`#64b5f6`)}
          ${c==null?``:Dt(`Calories`,t.totalCalories,a.weeklyCalories,`kcal`,c,`#ff8a65`)}
        </div>
      `:``}

      ${r.length>0?`
        <div class="cardio-categories">
          ${r.map(e=>`
            <div class="cardio-category" data-cat="${A(e.category)}">
              <span class="cardio-cat-emoji" aria-hidden="true">${k(kt[e.category]||`🏃`)}</span>
              <div class="cardio-cat-info">
                <span class="cardio-cat-name">${k(Ot[e.category]||e.category)}</span>
                <span class="cardio-cat-stats">${e.sessions} · ${At(e.totalMiles)} mi · ${Math.round(e.totalCalories||0)} kcal</span>
              </div>
            </div>
          `).join(``)}
        </div>
      `:``}

      ${u.length>0?`
        <div class="cardio-recent">
          <span class="cardio-recent-label">Recent</span>
          ${u.map(e=>`
            <div class="cardio-recent-row">
              <span class="cardio-recent-emoji">${k(kt[e.category]||`🏃`)}</span>
              <span class="cardio-recent-name">${k(e.exercise||e.category||`Cardio`)}</span>
              <span class="cardio-recent-sub">${k(Lt(e.date))} · ${At(e.distance?.miles)} mi${e.calories?` · ${Math.round(e.calories)} kcal`:``}</span>
            </div>
          `).join(``)}
        </div>
      `:``}
    </section>
  `}function Dt(e,t,n,r,i,a){let o=r?` ${r}`:``;return`
    <div class="cardio-goal-bar" style="--cardio-color:${a}">
      <div class="cardio-goal-head">
        <span>${k(e)}</span>
        <span class="cardio-goal-value">${At(t)}${o} <span class="cardio-goal-target">/ ${At(n)}${o}</span></span>
      </div>
      <div class="cardio-bar"><div class="cardio-bar-fill" style="width:${i}%"></div></div>
    </div>
  `}var Ot={run:`Running`,walk:`Walking`,treadmill:`Treadmill`,cycling:`Cycling`,rowing:`Rowing`,elliptical:`Elliptical`,stairmaster:`Stairmaster`,swimming:`Swimming`,hiit:`HIIT`,jump_rope:`Jump rope`},kt={run:`🏃`,walk:`🚶`,treadmill:`🏃‍♂️`,cycling:`🚴`,rowing:`🚣`,elliptical:`🏋️`,stairmaster:`🪜`,swimming:`🏊`,hiit:`🔥`,jump_rope:`🪢`};function At(e){let t=Number(e);return Number.isFinite(t)?t>=100?Math.round(t).toLocaleString():t>=10?t.toFixed(1):t.toFixed(2).replace(/\.?0+$/,``):`0`}function jt(e,t){if(!e||!Number.isFinite(e.value))return`
      <div class="spotlight-maint spotlight-maint-empty">
        <span class="spotlight-maint-label">Maintenance</span>
        <a class="spotlight-maint-link" href="/dashboard?view=stats#nutrition">Complete your profile to see this →</a>
      </div>
    `;let n=e.confidence?`is-${e.confidence}`:``,r=t==null?null:Math.round(t-e.value),i=r==null?``:r===0?`right at maintenance`:r>0?`+${r.toLocaleString()} above today`:`${r.toLocaleString()} below today`;return`
    <div class="spotlight-maint ${n}" role="group" aria-label="Maintenance calories">
      <div class="spotlight-maint-head">
        <span class="spotlight-maint-label">Maintenance</span>
        ${e.confidence?`<span class="spotlight-maint-conf">${k(e.confidence)} confidence</span>`:``}
      </div>
      <div class="spotlight-maint-value">
        ${Math.round(e.value).toLocaleString()}<span class="spotlight-maint-unit">kcal/day</span>
      </div>
      ${i?`<div class="spotlight-maint-delta">${k(i)}</div>`:``}
      ${e.explanation?`<button type="button" class="spotlight-maint-why" data-why="${A(e.explanation)}" aria-label="How is this computed?">Why?</button>`:``}
    </div>
  `}function Mt(e,t){let n=e==null?0:Math.max(0,Math.min(100,e)),r=2*Math.PI*36;return`
    <svg class="spotlight-ring" viewBox="0 0 88 88" aria-hidden="true">
      <circle cx="44" cy="44" r="36" class="ring-track" />
      <circle cx="44" cy="44" r="36" class="ring-fill" stroke-dasharray="${r}" stroke-dashoffset="${r-n/100*r}" />
      <text x="44" y="46" class="ring-pct" text-anchor="middle">${e==null?`—`:`${n}%`}</text>
    </svg>
  `}function Nt(e,t){let n=Number(e);return Number.isFinite(n)&&n>0?n:t}var Pt={weight:`weightGoal`,height:`heightGoal`,bodyFat:`bodyFatGoal`,bicepL:`bicepLGoal`,bicepR:`bicepRGoal`,forearmL:`forearmLGoal`,forearmR:`forearmRGoal`,chest:`chestGoal`,shoulders:`shouldersGoal`,neck:`neckGoal`,lats:`latsGoal`,traps:`trapsGoal`,serratusAnterior:`serratusAnteriorGoal`,waist:`waistGoal`,abs:`absGoal`,obliques:`obliquesGoal`,quadL:`quadLGoal`,quadR:`quadRGoal`,calfL:`calfLGoal`,calfR:`calfRGoal`,glutes:`glutesGoal`};function Ft(e){if(!e)return;let t=Array.isArray(e.metrics)?e.metrics:[],n=e.targets||e.goals||{},r=new Map(t.map(e=>[e.key,e]));document.querySelectorAll(`.measurement-card .measurement-value[data-field]`).forEach(e=>{let t=e.dataset.field;if(!t)return;let i=e.closest(`.measurement-card`);if(!i)return;let a=r.get(t),o=a?.stats||{},s=e.dataset.unit||a?.unit||``,c=o.last&&typeof o.last==`object`?o.last.value:o.last;c!=null&&c!==``&&(e.querySelector(`input`)||(e.innerHTML=`<span class="value">${k(It(c))}</span><span class="unit">${k(s||``)}</span>`));let l=o.last&&typeof o.last==`object`?o.last.date:null,u=Number(o.count||0),d=i.querySelector(`.measurement-meta`);d||(d=document.createElement(`div`),d.className=`measurement-meta`,i.appendChild(d));let f=l?`last ${Lt(l)}`:`no entries yet`,p=u>0?`${u} ${u===1?`entry`:`entries`}`:``;d.textContent=[f,p].filter(Boolean).join(` · `);let m=Pt[t];if(m){let e=Nt(n[t],null),r=i.querySelector(`.measurement-goal`);r||(r=document.createElement(`div`),r.className=`measurement-goal`,i.appendChild(r)),r.innerHTML=e?`goal: <span class="editable-target measurement-goal-value" data-target-edit="${m}" data-target-unit="${A(s||``)}" tabindex="0" role="button" aria-label="Edit ${A(t)} goal">${It(e)}${k(s||``)}</span>`:`<span class="editable-target measurement-goal-set" data-target-edit="${m}" data-target-unit="${A(s||``)}" tabindex="0" role="button" aria-label="Set ${A(t)} goal">+ Set goal</span>`}}),vt()}function It(e){let t=Number(e);return Number.isFinite(t)?t%1==0?String(t):t.toFixed(1).replace(/\.0$/,``):String(e??`—`)}function Lt(e){if(!e)return``;let t=new Date(e);return Number.isNaN(t.getTime())?String(e):t.toLocaleDateString(`en-US`,{month:`short`,day:`numeric`})}function Rt(e,t,n={}){return n.subView===`nutrition`&&rt[e]||rt[e]?rt[e]:$e(e,t)}function zt(e){let t=`weight.bodyFat.calories.protein.carbs.fats.saturatedFat.polyunsaturatedFat.monounsaturatedFat.transFat.sugars.sodium.cholesterol.fiber.caffeine.creatine.water.steps.bench.squat.deadlift.overheadPress.ohp.row.pullup.pushup`.split(`.`),n=new Set,r=[];for(let i of t)e.has(i)&&!n.has(i)&&(r.push(i),n.add(i));for(let t of e.keys())n.has(t)||(r.push(t),n.add(t));return r}function Bt(e,t={}){let n=t.subView||`all`,r=Array.from(new Set(e||[])).filter(e=>{let t=T.data.chartData?.[e];return Array.isArray(t)&&t.length>0});if(!r.length)return``;let i=T.chartMode[n]||`combined`,a=!t.singleSeriesAuto&&r.length>1,o=A(n),s=t.defaultVisibleKeys&&t.defaultVisibleKeys.length?new Set(t.defaultVisibleKeys):null,c=r.map((e,t)=>{let r=(T.data.metrics||[]).find(t=>t.key===e)||{label:e,unit:``},i=(T.data.metrics||[]).findIndex(t=>t.key===e),a=Rt(e,i>=0?i:t,{subView:n}),c=!s||s.has(e);return`
        <button type="button" class="combined-legend-item ${c?``:`is-hidden`}" data-combined-key="${A(e)}"
                data-view="${o}" style="--metric-color:${a}"
                aria-pressed="${c?`true`:`false`}" title="${c?`Hide`:`Show`} ${k(r.label||e)}">
          <span class="combined-legend-swatch"></span>
          <span class="combined-legend-name">${k(r.label||e)}</span>
          ${r.unit?`<span class="combined-legend-unit">${k(r.unit)}</span>`:``}
        </button>
      `}).join(``),l=r.map(e=>{let t=(T.data.metrics||[]).find(t=>t.key===e);if(!t)return``;let r=(T.data.metrics||[]).findIndex(t=>t.key===e),i=Rt(e,r>=0?r:0,{subView:n}),a=A(e);return`
        <article class="metric-card" data-metric="${a}" style="--metric-color:${i}">
          <header class="metric-card-head">
            <span class="metric-dot"></span>
            <span class="metric-card-label">${k(t.label||e)}</span>
            <span class="metric-card-unit">${k(t.unit||``)}</span>
            <span class="metric-card-last">${O(t.stats?.last?.value)}</span>
          </header>
          <div class="chart-wrapper">
            <canvas id="combined-ind-${o}-${a}" class="grafana-canvas" data-h="170"></canvas>
            <div class="chart-tooltip" id="combined-ind-tip-${o}-${a}" hidden></div>
          </div>
          ${Yt([t],{mode:`single`})}
        </article>`}).join(``);return`
    <section class="grafana-panel combined-chart-panel" data-combined-view="${o}" data-combined-mode="${i}">
      <header class="panel-header combined-panel-header">
        <div>
          <h3>${k(t.title||`Charts`)}</h3>
          ${t.subtitle?`<p class="panel-sub">${k(t.subtitle)}</p>`:``}
        </div>
        ${a?`<div class="chart-mode-toggle" role="tablist" aria-label="Chart display mode">
                <button type="button" class="chart-mode-btn ${i===`combined`?`is-active`:``}"
                        data-chart-mode="combined" data-view="${o}" role="tab" aria-selected="${i===`combined`}">
                  Combined
                </button>
                <button type="button" class="chart-mode-btn ${i===`individual`?`is-active`:``}"
                        data-chart-mode="individual" data-view="${o}" role="tab" aria-selected="${i===`individual`}">
                  Individual
                </button>
              </div>`:``}
      </header>

      <div class="combined-chart-body" ${i===`combined`?``:`hidden`}>
        <div class="chart-wrapper combined-chart-wrapper">
          <canvas id="combined-canvas-${o}" class="grafana-canvas" data-h="320"></canvas>
          <div class="chart-tooltip" id="combined-tooltip-${o}" hidden></div>
        </div>
        ${r.length>1?`<div class="combined-legend" data-view="${o}">${c}</div>`:``}
      </div>

      <div class="combined-individual-body" ${i===`individual`?``:`hidden`}>
        <div class="quick-charts-grid">${l}</div>
      </div>
    </section>
  `}function Vt(e,t){let n=[`bench`,`squat`,`deadlift`,`overheadPress`,`ohp`,`row`,`pullup`,`pushup`],r=(T.data.metrics||[]).filter(e=>e.available!==!1&&e.stats&&(e.category===`strength`||n.includes(e.key))),i=T.cardio,a=i?.summary||null,o=Gt(T.data,i);return`
    <section class="subview subview-workouts" aria-label="Workouts overview">
      <header class="subview-head">
        <h2 class="subview-title">Workouts</h2>
        <p class="subview-sub">${k(T.range.toUpperCase())} · ${r.length} lift${r.length===1?``:`s`} tracked</p>
      </header>

      <div class="subview-kpis">
        ${D(`Unique workouts (week)`,o.uniqueWorkoutsWeek,``)}
        ${D(`Total workouts`,o.totalWorkouts,``)}
        ${D(`Total reps`,o.totalReps?.toLocaleString(),``)}
        ${D(`Total sets`,o.totalSets?.toLocaleString(),``)}
        ${D(`Aggregate volume`,o.aggregateVolume?.toLocaleString(),`lb`)}
        ${D(`Cardio sessions`,a?.totalSessions??`—`,``)}
      </div>

      ${a?Et():``}

      <article class="grafana-panel">
        <header class="panel-header">
          <h3>Top lifts</h3>
          <p class="panel-sub">Latest, all-time PR, and Δ over the range. Gold = current value is the PR.</p>
        </header>
        ${r.length?`<table class="legend-table legend-table-wide">
                <thead><tr>
                  <th>Lift</th>
                  <th>Last</th>
                  <th>PR</th>
                  <th>Δ range</th>
                  <th>Entries</th>
                </tr></thead>
                <tbody>${r.map(Wt).join(``)}</tbody>
              </table>`:`<p class="grafana-empty">No strength workouts logged yet — text "bench press 4x8 at 225" to log one.</p>`}
      </article>

      ${Bt(r.map(e=>e.key),{subView:`workouts`,title:`Lift progress`,subtitle:`All lifts over ${T.range.toUpperCase()}. Toggle Individual for one chart per lift.`})}
    </section>
  `}function Ht(e,t){let n=[`calories`,`protein`,`carbs`,`fats`,`saturatedFat`,`polyunsaturatedFat`,`monounsaturatedFat`,`transFat`,`sugars`,`sodium`,`cholesterol`,`fiber`,`caffeine`,`creatine`].filter(t=>e.has(t)),r=vn(),i=e=>Number((T.data.chartData?.[e]||[]).find(e=>e.date===r)?.value)||0,a=e=>Number(T.data.targets?.[e])||0;return`
    <section class="subview subview-nutrition" aria-label="Nutrition overview">
      <header class="subview-head">
        <h2 class="subview-title">Nutrition</h2>
        <p class="subview-sub">Today · ${k(T.range.toUpperCase())} totals + breakdown</p>
      </header>

      <div class="subview-kpis">
        ${D(`Today — calories`,Math.round(i(`calories`)).toLocaleString(),`kcal`,`calories`)}
        ${D(`Today — protein`,Math.round(i(`protein`)),`g`,`protein`)}
        ${D(`Today — carbs`,Math.round(i(`carbs`)),`g`,`carbs`)}
        ${D(`Today — fats`,Math.round(i(`fats`)),`g`,`fats`)}
        ${i(`saturatedFat`)?D(`Saturated`,Math.round(i(`saturatedFat`)*10)/10,`g`,`saturatedFat`):``}
        ${i(`polyunsaturatedFat`)?D(`Polyunsat`,Math.round(i(`polyunsaturatedFat`)*10)/10,`g`,`polyunsaturatedFat`):``}
        ${i(`monounsaturatedFat`)?D(`Monounsat`,Math.round(i(`monounsaturatedFat`)*10)/10,`g`,`monounsaturatedFat`):``}
        ${i(`transFat`)?D(`Trans`,Math.round(i(`transFat`)*10)/10,`g`,`transFat`):``}
        ${a(`calories`)?D(`Calorie target`,Math.round(a(`calories`)).toLocaleString(),`kcal`):``}
        ${D(`Tracked metrics`,n.length,``)}
      </div>

      ${Ct(e)}
      <div id="supplementsPanelHost"></div>
      ${Bt(n,{subView:`nutrition`,title:`Nutrition trends`,subtitle:`All nutrition metrics over ${T.range.toUpperCase()}. Color-coded by macro — toggle Individual to see each on its own.`})}
    </section>
  `}function Ut(e,t){let n=T.data.chartData?.water||[],r=vn(),i=Number(n.find(e=>e.date===r)?.value)||0,a=Number(T.data.targets?.water)||0,o=n.filter(e=>{let t=new Date(e.date);if(Number.isNaN(t.getTime()))return!1;let n=(Date.now()-t.getTime())/(1e3*60*60*24);return n>=0&&n<=7}),s=o.reduce((e,t)=>e+(Number(t.value)||0),0),c=a?o.filter(e=>Number(e.value)>=a).length:null,l=o.length?s/o.length:0;return`
    <section class="subview subview-water" aria-label="Water overview">
      <header class="subview-head">
        <h2 class="subview-title">Water</h2>
        <p class="subview-sub">Hydration · ${k(T.range.toUpperCase())}</p>
      </header>

      <div class="subview-kpis">
        ${D(`Today`,Math.round(i),`oz`)}
        ${a?D(`Target`,Math.round(a),`oz`):``}
        ${D(`7-day total`,Math.round(s),`oz`)}
        ${D(`7-day avg`,Math.round(l),`oz/day`)}
        ${c==null?``:D(`Days hit target`,`${c} / 7`,``)}
      </div>

      ${Tt(e)}
      ${Bt([`water`],{subView:`water`,title:`Hydration`,subtitle:`Water intake over ${T.range.toUpperCase()}.`,singleSeriesAuto:!0})}
    </section>
  `}function D(e,t,n,r){if(t==null||t===``)return``;let i=r&&rt[r],a=i?` style="--kpi-color:${i}"`:``;return`
    <div class="${i?`subview-kpi has-color`:`subview-kpi`}"${a}>
      <span class="subview-kpi-dot" aria-hidden="true"></span>
      <span class="subview-kpi-label">${k(e)}</span>
      <span class="subview-kpi-value">${k(String(t))}${n?`<span class="subview-kpi-unit">${k(n)}</span>`:``}</span>
    </div>
  `}function Wt(e){let t=e.stats||{},n=e.unit||`lb`,r=t.last&&typeof t.last==`object`?t.last.value:t.last,i=t.max,a=t.delta,o=Number.isFinite(Number(r))&&Number.isFinite(Number(i))&&Math.abs(Number(r)-Number(i))<.001;return`
    <tr class="${o?`is-pr`:``}">
      <td>${k(e.label||e.key)}</td>
      <td class="num">${O(r)}${r==null?``:` ${k(n)}${o?` 🏆`:``}`}</td>
      <td class="num">${O(i)}${i==null?``:` ${k(n)}`}</td>
      <td class="num ${a>0?`delta-pos`:a<0?`delta-neg`:``}">${mn(a,n)}</td>
      <td class="num">${t.count??`—`}</td>
    </tr>
  `}function Gt(e,t){let n=e.metrics||[],r=[`bench`,`squat`,`deadlift`,`overheadPress`,`ohp`,`row`,`pullup`,`pushup`],i=n.filter(e=>e.category===`strength`||r.includes(e.key)),a=Number(e.workoutSummary?.totalReps)||0,o=Number(e.workoutSummary?.totalSets)||0,s=Number(e.workoutSummary?.totalVolume)||0,c=Number(e.workoutSummary?.totalWorkouts)||0,l=Number(e.workoutSummary?.uniqueWorkoutsWeek)||0,u=Date.now()-7*864e5,d=new Set;for(let t of i){let n=e.chartData?.[t.key]||[];for(let t of n){Number.isFinite(t.reps)&&Number.isFinite(t.sets)&&(e.workoutSummary?.totalReps||(a+=t.reps*t.sets),e.workoutSummary?.totalSets||(o+=t.sets),Number.isFinite(t.value)&&(e.workoutSummary?.totalVolume||(s+=t.value*t.reps*t.sets))),e.workoutSummary?.totalWorkouts||(c+=1);let n=new Date(t.date).getTime();Number.isFinite(n)&&n>=u&&d.add(t.date)}}return e.workoutSummary?.uniqueWorkoutsWeek||(l=d.size),t?.summary?.totalSessions&&!e.workoutSummary?.totalWorkouts&&(c+=Number(t.summary.totalSessions)),{uniqueWorkoutsWeek:l,totalWorkouts:c,totalReps:a,totalSets:o,aggregateVolume:Math.round(s)}}function Kt(e){let t=new Set(T.overlay),n=Qt(T.data.metricsByCategory,e);return`
    <section class="grafana-panel" id="aggregatePanel">
      <header class="panel-header">
        <h3>Overlay chart</h3>
        <p class="panel-sub">Compare multiple metrics on the same axes.</p>
      </header>

      <div class="overlay-pills">
        ${T.overlay.map(t=>{let n=e.get(t);return n?`
        <span class="overlay-pill" style="--metric-color:${$e(t,T.data.metrics.findIndex(e=>e.key===t))}">
          <span class="overlay-swatch"></span>
          ${k(n.label)}
          <button type="button" class="overlay-pill-remove" data-remove="${A(t)}" aria-label="Remove ${k(n.label)}">×</button>
        </span>`:``}).join(``)}
        <button type="button" class="overlay-add" id="overlayAddBtn" aria-expanded="false">+ Add metric</button>
      </div>
      <div class="overlay-controls" id="overlayControls" hidden>${n.map(({category:e,label:n,metrics:r})=>`
      <fieldset class="overlay-group">
        <legend>${k(n)}</legend>
        <div class="overlay-checkboxes">
          ${r.map((e,n)=>`
              <label class="overlay-check" style="--metric-color:${$e(e.key,n)}">
                <input type="checkbox" name="overlay" value="${A(e.key)}" ${t.has(e.key)?`checked`:``}>
                <span class="overlay-swatch"></span>
                <span class="overlay-name">${k(e.label)}</span>
              </label>`).join(``)}
        </div>
      </fieldset>`).join(``)}</div>

      <div class="chart-wrapper">
        <canvas id="aggregateCanvas" class="grafana-canvas"></canvas>
        <div class="chart-tooltip" id="aggregateTooltip" hidden></div>
      </div>

      ${Yt(T.overlay.map(t=>e.get(t)).filter(Boolean),{mode:`overlay`})}
    </section>
  `}function qt(e){let t=et.filter(t=>e.has(t.left)&&e.has(t.right));return t.length?`
    <section class="grafana-panel">
      <header class="panel-header">
        <h3>Symmetry Tracking</h3>
        <p class="panel-sub">Left vs Right comparison for matched body parts.</p>
      </header>
      <div class="symmetry-grid">
        ${t.map(t=>{let n=A(`${t.left}_${t.right}`);return`
            <div class="symmetry-card" data-pair="${n}">
              <h4>${k(t.label)} — Left vs Right</h4>
              <div class="chart-wrapper">
                <canvas id="sym-${n}" class="grafana-canvas" data-h="200"></canvas>
                <div class="chart-tooltip" id="sym-tooltip-${n}" hidden></div>
              </div>
              ${Yt([{...e.get(t.left),label:`${t.label} (L)`},{...e.get(t.right),label:`${t.label} (R)`}],{mode:`symmetry`})}
            </div>`}).join(``)}
      </div>
    </section>
  `:``}function Jt(e,t){return Xe.filter(n=>(e?.[n]||[]).filter(e=>t.has(e.key)).length>0).map(n=>{let r=(e[n]||[]).filter(e=>t.has(e.key));return`
      <section class="grafana-panel" data-category="${A(n)}">
        <header class="panel-header">
          <h3>${k(Ze[n]||n)}</h3>
          <p class="panel-sub">${r.length} metric${r.length===1?``:`s`} · ${k(T.range.toUpperCase())}</p>
        </header>
        <div class="metric-grid">
          ${r.map((e,t)=>{let n=$e(e.key,t),r=A(e.key);return`
              <article class="metric-card" data-metric="${r}" style="--metric-color:${n}">
                <header class="metric-card-head">
                  <span class="metric-dot"></span>
                  <span class="metric-card-label">${k(e.label)}</span>
                  <span class="metric-card-unit">${k(e.unit||``)}</span>
                </header>
                <div class="chart-wrapper">
                  <canvas id="chart-${r}" class="grafana-canvas" data-h="160"></canvas>
                  <div class="chart-tooltip" id="tooltip-${r}" hidden></div>
                </div>
                ${Yt([e],{mode:`single`})}
              </article>`}).join(``)}
        </div>
      </section>`}).join(``)}function Yt(e,{mode:t}={}){return e.length?`
    <table class="legend-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Mean</th>
          <th>Min</th>
          <th>Max</th>
          <th>Last</th>
          <th>Δ</th>
        </tr>
      </thead>
      <tbody>${e.map((e,t)=>{let n=$e(e.key,t),r=e.stats||{},i=e.unit?` ${e.unit}`:``,a=r.last&&typeof r.last==`object`?r.last.value:r.last;return`
      <tr>
        <td><span class="legend-dot" style="background:${n}"></span>${k(e.label)}</td>
        <td>${O(r.avg)}${i}</td>
        <td>${O(r.min)}${i}</td>
        <td>${O(r.max)}${i}</td>
        <td>${O(a)}${i}</td>
        <td class="${r.delta>0?`delta-pos`:r.delta<0?`delta-neg`:``}">${mn(r.delta,e.unit)}</td>
      </tr>`}).join(``)}</tbody>
    </table>
  `:``}function Xt(e){let t=E?.querySelector(`#aggregatePanel`);if(!t)return;let n=t.querySelector(`#overlayAddBtn`),r=t.querySelector(`#overlayControls`);n&&r&&n.addEventListener(`click`,()=>{let e=!r.hidden;r.hidden=e,n.setAttribute(`aria-expanded`,String(!e)),n.textContent=e?`+ Add metric`:`− Hide options`}),t.querySelectorAll(`.overlay-pill-remove`).forEach(t=>{t.addEventListener(`click`,()=>{let n=t.dataset.remove;T.overlay=T.overlay.filter(e=>e!==n),Zt(e)})}),t.querySelectorAll(`input[name="overlay"]`).forEach(n=>{n.addEventListener(`change`,()=>{T.overlay=Array.from(t.querySelectorAll(`input[name="overlay"]:checked`)).map(e=>e.value),Zt(e)})})}function Zt(e){let t=E?.querySelector(`#aggregatePanel`);t&&(t.outerHTML=Kt(e),Xt(e),an(e),un(e))}function Qt(e,t){return Xe.map(n=>{let r=(e?.[n]||[]).filter(e=>t.has(e.key));return{category:n,label:Ze[n]||n,metrics:r}}).filter(e=>e.metrics.length>0)}function $t(e){en(e),T.advancedOpen&&(an(e),on(e),sn(e)),un(e),rn(e)}function en(e){E&&E.querySelectorAll(`.combined-chart-panel`).forEach(t=>{let n=t.dataset.combinedView||`all`,r=t.dataset.combinedMode||`combined`,i=Array.from(t.querySelectorAll(`.combined-legend-item`)).map(e=>e.dataset.combinedKey).filter(Boolean),a=i.length?i:Array.from(t.querySelectorAll(`.metric-card[data-metric]`)).map(e=>e.dataset.metric).filter(Boolean);r===`combined`?tn(t,n,a,e):nn(t,n,a,e)})}function tn(e,t,n,r){let i=e.querySelector(`#combined-canvas-${bn(t)}`);if(!i)return;let a=new Set(Array.from(e.querySelectorAll(`.combined-legend-item[aria-pressed="false"]`)).map(e=>e.dataset.combinedKey));cn(i,n.filter(e=>!a.has(e)).map((e,n)=>{let i=r.get(e)||(T.data.metrics||[]).find(t=>t.key===e);if(!i)return null;let a=(T.data.metrics||[]).findIndex(t=>t.key===e),o=Rt(e,a>=0?a:n,{subView:t}),s=(T.data.chartData[e]||[]).slice().sort((e,t)=>e.date.localeCompare(t.date));return{key:e,label:i.label,unit:i.unit,color:o,points:s}}).filter(Boolean),{height:320,multi:!0})}function nn(e,t,n,r){n.forEach((n,i)=>{let a=e.querySelector(`#combined-ind-${bn(t)}-${bn(n)}`);if(!a)return;let o=r.get(n)||(T.data.metrics||[]).find(e=>e.key===n);if(!o)return;let s=(T.data.metrics||[]).findIndex(e=>e.key===n),c=Rt(n,s>=0?s:i,{subView:t}),l=(T.data.chartData[n]||[]).slice().sort((e,t)=>e.date.localeCompare(t.date));cn(a,[{key:n,label:o.label,unit:o.unit,color:c,points:l}],{height:170,multi:!1})})}function rn(e){E&&(E.querySelectorAll(`.chart-mode-btn`).forEach(t=>{t.dataset.bound!==`1`&&(t.dataset.bound=`1`,t.addEventListener(`click`,()=>{let n=t.dataset.view,r=t.dataset.chartMode;if(!n||!r)return;T.chartMode[n]=r;let i=t.closest(`.combined-chart-panel`);if(!i)return;i.dataset.combinedMode=r,i.querySelectorAll(`.chart-mode-btn`).forEach(e=>{e.classList.toggle(`is-active`,e.dataset.chartMode===r),e.setAttribute(`aria-selected`,e.dataset.chartMode===r?`true`:`false`)});let a=i.querySelector(`.combined-chart-body`),o=i.querySelector(`.combined-individual-body`);a&&(a.hidden=r!==`combined`),o&&(o.hidden=r!==`individual`),requestAnimationFrame(()=>en(e))}))}),E.querySelectorAll(`.combined-legend-item`).forEach(t=>{t.dataset.bound!==`1`&&(t.dataset.bound=`1`,t.addEventListener(`click`,()=>{let n=t.getAttribute(`aria-pressed`)===`true`;t.setAttribute(`aria-pressed`,n?`false`:`true`),t.classList.toggle(`is-hidden`,n),requestAnimationFrame(()=>en(e))}))}))}function an(e){let t=E?.querySelector(`#aggregateCanvas`);t&&cn(t,T.overlay.map((t,n)=>{let r=e.get(t);if(!r)return null;let i=(T.data.chartData[t]||[]).slice().sort((e,t)=>e.date.localeCompare(t.date));return{key:t,label:r.label,unit:r.unit,color:$e(t,n),points:i}}).filter(Boolean),{height:300,multi:!0})}function on(e){for(let t of et){if(!e.has(t.left)||!e.has(t.right))continue;let n=`${t.left}_${t.right}`,r=E?.querySelector(`#sym-${n}`);r&&cn(r,[{key:t.left,label:`${t.label} (L)`,unit:t.unit,color:`#64b5f6`,points:(T.data.chartData[t.left]||[]).slice().sort((e,t)=>e.date.localeCompare(t.date))},{key:t.right,label:`${t.label} (R)`,unit:t.unit,color:`#ef5350`,points:(T.data.chartData[t.right]||[]).slice().sort((e,t)=>e.date.localeCompare(t.date))}],{height:200,multi:!0})}}function sn(e){e.forEach((e,t)=>{let n=E?.querySelector(`#chart-${bn(t)}`);if(!n)return;let r=T.data.metrics.findIndex(e=>e.key===t),i=$e(t,r>=0?r:0),a=(T.data.chartData[t]||[]).slice().sort((e,t)=>e.date.localeCompare(t.date));cn(n,[{key:t,label:e.label,unit:e.unit,color:i,points:a}],{height:160,multi:!1})})}function cn(e,t,n={}){let r=e.getContext(`2d`),i=e.getBoundingClientRect(),a=window.devicePixelRatio||1,o=n.height||parseInt(e.dataset.h||`180`,10),s=Math.max(i.width,200);e.width=s*a,e.height=o*a,e.style.height=`${o}px`,r.setTransform(a,0,0,a,0,0),r.fillStyle=`#0b0e11`,r.fillRect(0,0,s,o);let c={top:16,right:18,bottom:32,left:52},l=s-c.left-c.right,u=o-c.top-c.bottom,d=t.filter(e=>e.points&&e.points.length);if(!d.length){r.fillStyle=`rgba(255,255,255,0.35)`,r.font=`12px Space Grotesk, sans-serif`,r.textAlign=`center`,r.fillText(`No data for this period`,s/2,o/2),e._chart=null;return}let f=new Set;d.forEach(e=>e.points.forEach(e=>f.add(e.date)));let p=Array.from(f).sort(),m=p[0],h=p[p.length-1],g=new Date(m).getTime(),_=new Date(h).getTime(),ee=Math.max(_-g,1),te=d.flatMap(e=>e.points.map(e=>e.value)),v=Math.min(...te),ne=Math.max(...te),re=(ne-v||1)*.08,y=v-re,b=ne+re,ie=b-y||1,ae=e=>c.left+((new Date(e).getTime()-g)/ee*l||0),oe=e=>c.top+u-(e-y)/ie*u;r.strokeStyle=`rgba(255,255,255,0.08)`,r.lineWidth=1,r.fillStyle=`rgba(255,255,255,0.55)`,r.font=`10px Space Grotesk, sans-serif`,r.textAlign=`right`,r.textBaseline=`middle`;for(let e=0;e<=5;e++){let t=c.top+u*e/5;r.beginPath(),r.moveTo(c.left,t),r.lineTo(s-c.right,t),r.stroke();let n=b-ie*e/5;r.fillText(hn(n),c.left-6,t)}r.setLineDash([2,4]),r.strokeStyle=`rgba(255,255,255,0.06)`,r.fillStyle=`rgba(255,255,255,0.55)`,r.textAlign=`center`,r.textBaseline=`top`;let se=Math.min(8,Math.max(2,Math.floor(l/80)));for(let e=0;e<=se;e++){let t=c.left+l*e/se;r.beginPath(),r.moveTo(t,c.top),r.lineTo(t,c.top+u),r.stroke();let n=g+ee*e/se;r.fillText(gn(new Date(n)),t,c.top+u+6)}r.setLineDash([]);let ce=[];for(let e of d){let t=e.points.map(e=>({x:ae(e.date),y:oe(e.value),date:e.date,value:e.value})),n=r.createLinearGradient(0,c.top,0,c.top+u);if(n.addColorStop(0,yn(e.color,.32)),n.addColorStop(.7,yn(e.color,.07)),n.addColorStop(1,yn(e.color,0)),r.fillStyle=n,r.beginPath(),r.moveTo(t[0].x,c.top+u),ln(r,t),r.lineTo(t[t.length-1].x,c.top+u),r.closePath(),r.fill(),r.strokeStyle=e.color,r.lineWidth=2,r.lineJoin=`round`,r.lineCap=`round`,r.beginPath(),ln(r,t),r.stroke(),t.length<=60){r.fillStyle=e.color;for(let e of t)r.beginPath(),r.arc(e.x,e.y,2.6,0,Math.PI*2),r.fill()}ce.push({...e,points:t})}e._chart={padding:c,plotW:l,plotH:u,width:s,height:o,series:ce,xOf:ae,yOf:oe,dateMin:m,dateMax:h}}function ln(e,t){if(!t.length||(e.moveTo(t[0].x,t[0].y),t.length===1))return;if(t.length===2){e.lineTo(t[1].x,t[1].y);return}for(let n=1;n<t.length-1;n++){let r=t[n],i=t[n+1],a=(r.x+i.x)/2,o=(r.y+i.y)/2;e.quadraticCurveTo(r.x,r.y,a,o)}let n=t[t.length-1];e.lineTo(n.x,n.y)}function un(e){E?.querySelectorAll(`.grafana-canvas`).forEach(e=>{let t=e.parentElement;if(!t)return;let n=t.querySelector(`.chart-tooltip`),r=t.querySelector(`.chart-crosshair`);r||(r=document.createElement(`div`),r.className=`chart-crosshair`,r.hidden=!0,t.appendChild(r)),n&&(e.addEventListener(`pointermove`,t=>dn(e,n,r,t)),e.addEventListener(`pointerleave`,()=>{n.hidden=!0,r.hidden=!0,e._chart&&fn(e,null)}))})}function dn(e,t,n,r){let i=e._chart;if(!i){t.hidden=!0,n.hidden=!0;return}let a=e.getBoundingClientRect(),o=r.clientX-a.left;if(o<i.padding.left||o>i.width-i.padding.right){t.hidden=!0,n.hidden=!0,fn(e,null);return}let s=null,c=null,l=1/0;for(let e of i.series)for(let t of e.points){let e=Math.abs(t.x-o);e<l&&(l=e,s=t.date,c=t.x)}if(!s){t.hidden=!0,n.hidden=!0,fn(e,null);return}let u=i.series.map(e=>{let t=e.points.find(e=>e.date===s);if(!t)return``;let n=e.unit?` ${e.unit}`:``;return`<div class="tt-row">
        <span class="tt-dot" style="background:${e.color}"></span>
        <span class="tt-label">${k(e.label)}</span>
        <span class="tt-value">${O(t.value)}${k(n)}</span>
      </div>`}).filter(Boolean).join(``);t.innerHTML=`
    <div class="tt-date">${k(_n(s))}</div>
    ${u}
  `,t.hidden=!1,n.style.left=`${c}px`,n.style.top=`${i.padding.top}px`,n.style.height=`${i.plotH}px`,n.hidden=!1,fn(e,s);let d=t.offsetWidth||180,f=c+d+24>i.width;t.style.left=`${f?c-d-12:c+12}px`,t.style.top=`${Math.max(0,r.offsetY-10)}px`}function fn(e,t){let n=e._chart;if(!n)return;let r=e.getContext(`2d`),i=window.devicePixelRatio||1;if(r.setTransform(i,0,0,i,0,0),!t){n._focusedDate&&(n._focusedDate=null,pn(e));return}if(n._focusedDate!==t){n._focusedDate=t,pn(e);for(let e of n.series){let n=e.points.find(e=>e.date===t);n&&(r.beginPath(),r.arc(n.x,n.y,6,0,Math.PI*2),r.fillStyle=yn(e.color,.18),r.fill(),r.beginPath(),r.arc(n.x,n.y,4,0,Math.PI*2),r.fillStyle=e.color,r.fill(),r.beginPath(),r.arc(n.x,n.y,2,0,Math.PI*2),r.fillStyle=`#0b0e11`,r.fill())}}}function pn(e){let t=e._chart;t&&cn(e,t.series.map(e=>({key:e.key,label:e.label,unit:e.unit,color:e.color,points:e.points.map(e=>({date:e.date,value:e.value}))})),{height:t.height,multi:t.series.length>1})}function O(e){if(e==null||Number.isNaN(e))return`—`;let t=Math.abs(e);return t>=1e3?e.toLocaleString(void 0,{maximumFractionDigits:0}):t>=10?e.toFixed(1):e.toFixed(2)}function mn(e,t){if(e==null||Number.isNaN(e))return`—`;let n=t?` ${t}`:``;return`${e>0?`+`:``}${O(e)}${n}`}function hn(e){if(e==null||Number.isNaN(e))return``;let t=Math.abs(e);return t>=1e3?Math.round(e).toString():t>=100?e.toFixed(0):e.toFixed(+(t<10))}function gn(e){return e.toLocaleDateString(`en-US`,{month:`numeric`,day:`numeric`})}function _n(e){let t=new Date(e);return Number.isNaN(t.getTime())?e:t.toLocaleDateString(`en-US`,{weekday:`short`,month:`short`,day:`numeric`,year:`numeric`})}function vn(){return new Date().toISOString().slice(0,10)}function yn(e,t){let n=0,r=0,i=0;return e.length===4?(n=parseInt(e[1]+e[1],16),r=parseInt(e[2]+e[2],16),i=parseInt(e[3]+e[3],16)):e.length===7&&(n=parseInt(e.slice(1,3),16),r=parseInt(e.slice(3,5),16),i=parseInt(e.slice(5,7),16)),`rgba(${n}, ${r}, ${i}, ${t})`}function k(e){return String(e??``).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`).replace(/'/g,`&#39;`)}function A(e){return k(e)}function bn(e){return window.CSS&&CSS.escape?CSS.escape(e):String(e).replace(/[^a-zA-Z0-9_-]/g,e=>`\\${e}`)}var xn=`https://api.thetrackerapp.io`;function Sn(){try{let e=localStorage.getItem(`tracker.auth.session`);if(!e)return``;try{let t=JSON.parse(e),n=t&&(t.token||t.accessToken);if(n)return String(n).trim()}catch{}return String(e).trim()}catch{return``}}function Cn(){try{let e=localStorage.getItem(`tracker.auth.user`);if(!e)return``;let t=JSON.parse(e);return(t?.username||t?.canonical||t?.credential||t?.maskedCredential||t?.accountId||``).toString().trim()}catch{return``}}async function j(e,t={}){let n=Sn(),r={"Content-Type":`application/json`,Accept:`application/json`,...t.headers||{}};n&&(r.Authorization=`Bearer ${n}`);let i=await fetch(`${xn}${e}`,{...t,headers:r});if(!i.ok){let t=await i.text().catch(()=>``);throw Error(`${e} ${i.status}: ${t||i.statusText}`)}return i.status===204?null:i.json().catch(()=>null)}function M(e){return String(e??``).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`).replace(/'/g,`&#39;`)}function wn(e){return e?`/u/${encodeURIComponent(String(e).replace(/^@/,``))}`:`#`}function Tn(e){if(!e)return``;let t=new Date(e);return Number.isNaN(t.getTime())?``:t.toLocaleDateString(`en-US`,{month:`short`,day:`numeric`,year:`numeric`})}var En={telegram:`Telegram`,imessage:`iMessage`,"run-club":`Run Club`,bracket:`Bracket`},N=null,Dn=null,On=new Set;async function kn(){let e=null;try{e=await j(`/api/account/profile`)}catch{e=null}if(!e)try{e=JSON.parse(localStorage.getItem(`tracker.auth.user`)||`null`)}catch{e=null}return Dn=e||{},Dn}async function An(e){if(e){N=e,e.innerHTML=`<p class="coach-empty">Loading coach &amp; community…</p>`;try{zn(await kn())}catch(t){e.innerHTML=`<p class="coach-empty coach-error">Coach panel unavailable: ${M(t.message||`load failed`)}</p>`}}}async function jn(e){e&&(On.add(e),e.innerHTML=`<p class="coach-empty">Loading…</p>`,Fn(e,await kn()))}async function Mn(e){e&&(On.add(e),e.innerHTML=`<p class="coach-empty">Loading…</p>`,In(e,await kn(),`group`,{title:`Workout groups`,emptyHelp:`You haven't joined any workout groups yet.`}))}async function Nn(e){e&&(On.add(e),e.innerHTML=`<p class="coach-empty">Loading…</p>`,In(e,await kn(),`run-club`,{title:`Run clubs`,emptyHelp:`You're not in any run clubs yet.`}))}async function Pn(){let e=await kn();N&&zn(e);for(let t of On)t.id===`personalTrainerPanelBody`?Fn(t,e):t.id===`groupsPanelBody`?In(t,e,`group`,{title:`Workout groups`,emptyHelp:`You haven't joined any workout groups yet.`}):t.id===`runClubsPanelBody`&&In(t,e,`run-club`,{title:`Run clubs`,emptyHelp:`You're not in any run clubs yet.`})}function Fn(e,t){let n=!!t.isPersonalTrainer,r=t.trainerApplicationStatus||`none`;e.innerHTML=`
    <div class="coach-community-grid pt-tab-grid">
      ${Bn(t)}
      ${Vn(t)}
    </div>
    ${!n&&(r===`none`||r===`rejected`)?Ln(t):``}
  `,N=e,Un(t),Rn(t)}function In(e,t,n,{title:r,emptyHelp:i}){let a=Array.isArray(t.communities)?t.communities:[],o=n===`group`?a.filter(e=>[`telegram`,`imessage`,`group`].includes(e.kind)):a.filter(e=>e.kind===`run-club`);if(o.length===0){e.innerHTML=`
      <div class="coach-empty-card">
        <p>${M(i)}</p>
      </div>
    `;return}e.innerHTML=`
    <div class="community-list">
      ${o.map(e=>`
        <div class="community-row community-row-wide" data-community="${escapeAttr(e.id||``)}">
          <a class="community-row-link" href="${e.url?M(e.url):`#`}" target="${e.url?.startsWith?.(`http`)?`_blank`:`_self`}" rel="noreferrer">
            <span class="community-emoji" aria-hidden="true">${M(e.emoji||(n===`run-club`?`🏃`:`👥`))}</span>
            <div class="community-info">
              <span class="community-name">${M(e.name||r)}</span>
              <span class="community-meta">
                <span class="community-kind">${M(En[e.kind]||e.kind||`Group`)}</span>
                ${e.memberCount?`<span> · ${e.memberCount.toLocaleString()} members</span>`:``}
                ${e.location?`<span> · ${M(e.location)}</span>`:``}
                ${e.role&&e.role!==`member`?`<span class="community-role role-${M(e.role)}">${M(e.role)}</span>`:``}
              </span>
            </div>
            <span class="community-since">${e.since?`since ${M(Tn(e.since))}`:``}</span>
          </a>
          <button type="button" class="btn-ghost btn-tiny" data-action="community-leave" data-community-id="${escapeAttr(e.id||``)}" data-community-name="${escapeAttr(e.name||``)}">Leave</button>
        </div>
      `).join(``)}
    </div>
  `,e.querySelectorAll(`[data-action="community-leave"]`).forEach(e=>{e.addEventListener(`click`,async()=>{let t=e.dataset.communityId,n=e.dataset.communityName||`this community`;if(!(!t||!confirm(`Leave ${n}?`)))try{await j(`/api/communities/${encodeURIComponent(t)}/leave`,{method:`POST`,body:`{}`}),await Pn()}catch(e){alert(`Leave failed: ${e.message}`)}})})}function Ln(e){return`
    <section class="coach-card pt-apply-card" id="ptApplyCard">
      <header class="coach-card-head">
        <h3>Become a coach</h3>
        <span class="coach-status-pill status-none">Application</span>
      </header>
      <p class="coach-note">Already training people? Send us your credentials and we'll mint your unique <strong>coach code</strong>. Once approved, athletes lock in by entering your code on their dashboard.</p>
      <form class="pt-apply-form" id="ptApplyForm" novalidate>
        <label>
          <span>Full legal name</span>
          <input name="fullName" type="text" autocomplete="name" required maxlength="120" />
        </label>
        <label>
          <span>Years coaching</span>
          <input name="experienceYears" type="number" min="0" max="60" step="1" inputmode="numeric" required />
        </label>
        <label class="pt-full">
          <span>Credentials &amp; certifications</span>
          <input name="credentials" type="text" placeholder="e.g. NSCA-CPT, RDN, USA Weightlifting L2" maxlength="200" />
        </label>
        <label class="pt-full">
          <span>Specialties</span>
          <input name="specialties" type="text" placeholder="e.g. Hybrid, Strength, Endurance, Hyrox" maxlength="200" />
        </label>
        <label class="pt-full">
          <span>Short bio for athletes</span>
          <textarea name="bio" rows="3" maxlength="500" placeholder="A few sentences athletes will see when your code is shared." required></textarea>
        </label>
        <label class="pt-full">
          <span>Portfolio / Instagram / website (optional)</span>
          <input name="portfolioUrl" type="url" placeholder="https://" maxlength="200" />
        </label>
        <label class="pt-full pt-agree">
          <input name="agreeTerms" type="checkbox" required />
          <span>I agree to the <a href="/terms" target="_blank" rel="noreferrer">Terms</a> and confirm the credentials above are accurate.</span>
        </label>
        <div class="pt-apply-actions">
          <button type="submit" class="btn-primary">Submit application</button>
          <p class="coach-error coach-action-status" data-status-for="trainer-apply" hidden></p>
        </div>
      </form>
    </section>
  `}function Rn(e){let t=document.getElementById(`ptApplyForm`);t&&t.addEventListener(`submit`,async e=>{e.preventDefault();let n=new FormData(t),r={fullName:String(n.get(`fullName`)||``).trim(),experienceYears:Number(n.get(`experienceYears`)||0),credentials:String(n.get(`credentials`)||``).split(/[,;\n]/).map(e=>e.trim()).filter(Boolean),specialties:String(n.get(`specialties`)||``).split(/[,;\n]/).map(e=>e.trim()).filter(Boolean),bio:String(n.get(`bio`)||``).trim(),portfolioUrl:String(n.get(`portfolioUrl`)||``).trim(),agreeTerms:!!n.get(`agreeTerms`)};r.agreeTerms&&await Wn(`trainer-apply`,async()=>{await j(`/api/trainer/application`,{method:`POST`,body:JSON.stringify(r)}),await Pn()})})}function zn(e){N&&(N.innerHTML=`
    <div class="coach-community-grid">
      ${Vn(e)}
      ${Bn(e)}
      ${Hn(e)}
    </div>
  `,Un(e))}function Bn(e){let t=e.personalTrainerStatus||(e.personalTrainer?`linked`:`none`),n=e.personalTrainer,r=e.trainerCodePending,i=``;return i=t===`linked`&&n?`
      <div class="coach-figure">
        <div class="coach-avatar" aria-hidden="true">${M(n.displayName?.slice(0,1)||`C`)}</div>
        <div class="coach-info">
          <a class="coach-name" href="${wn(n.username)}">${M(n.displayName||n.username||`Coach`)}</a>
          <span class="coach-sub">@${M(n.username||``)}${n.since?` · since ${M(Tn(n.since))}`:``}</span>
        </div>
      </div>
      <div class="coach-actions">
        <a class="btn-secondary" href="${wn(n.username)}">View profile</a>
        <button type="button" class="btn-ghost" data-action="trainer-unlink">Unlink coach</button>
      </div>
      <p class="coach-error coach-action-status" data-status-for="trainer-unlink" hidden></p>
    `:t===`pending`&&r?`
      <div class="coach-pending">
        <div class="coach-pending-emoji">⏳</div>
        <div>
          <p class="coach-pending-title">Waiting on <strong>@${M(r.trainerUsername)}</strong></p>
          <p class="coach-pending-sub">Sent ${M(Tn(r.submittedAt))} — your coach will get a text to approve.</p>
        </div>
      </div>
      <button type="button" class="btn-ghost" data-action="trainer-cancel">Cancel request</button>
      <p class="coach-error coach-action-status" data-status-for="trainer-cancel" hidden></p>
    `:`
      ${t===`rejected`?`<p class="coach-note">Your last request wasn't accepted. Try another coach's code below.</p>`:`<p class="coach-note">Got a coach's invite code? Enter it here and we'll text them to approve you.</p>`}
      <form class="coach-code-form" data-action="trainer-redeem-form">
        <label class="sr-only" for="trainerCodeInput">Coach code</label>
        <input id="trainerCodeInput" name="code" type="text" autocomplete="off" placeholder="RIVER-9X4P" maxlength="32" />
        <button type="submit" class="btn-primary">Send to coach</button>
      </form>
      <p class="coach-error coach-action-status" data-status-for="trainer-redeem" hidden></p>
    `,`
    <article class="coach-card">
      <header class="coach-card-head">
        <h3>Your coach</h3>
        ${t===`linked`?`<span class="coach-status-pill status-linked">Linked</span>`:`<span class="coach-status-pill status-${t}">${M(t===`none`?`Unlinked`:t)}</span>`}
      </header>
      ${i}
    </article>
  `}function Vn(e){let t=!!e.isPersonalTrainer,n=e.trainerApplicationStatus||`none`;if(!t){let e=``;return e=n===`pending`?`
        <div class="coach-pending">
          <div class="coach-pending-emoji">📝</div>
          <div>
            <p class="coach-pending-title">Application pending</p>
            <p class="coach-pending-sub">An admin is reviewing your credentials. You'll get a text when you're approved.</p>
          </div>
        </div>
        <button type="button" class="btn-ghost" data-action="trainer-app-withdraw">Withdraw application</button>
        <p class="coach-error coach-action-status" data-status-for="trainer-app-withdraw" hidden></p>
      `:n===`rejected`?`
        <p class="coach-note coach-error">Your last application wasn't approved. Add credentials and try again.</p>
        <a href="/personal-trainers#apply" class="btn-primary">Apply again</a>
      `:`
        <p class="coach-note">Already coaching people? Apply to verify your credentials and get a unique <strong>coach code</strong> you can share. Once approved, athletes can lock in by entering your code on their dashboard.</p>
        <a href="/personal-trainers#apply" class="btn-primary">Apply to become a coach</a>
      `,`
      <article class="coach-card trainer-card">
        <header class="coach-card-head">
          <h3>Coach status</h3>
          <span class="coach-status-pill status-${n}">${M(n===`none`?`Not applied`:n)}</span>
        </header>
        ${e}
      </article>
    `}let r=e.trainerCode||`—`,i=Array.isArray(e.clientsAsTrainer)?e.clientsAsTrainer:[],a=e.trainerSettings?.acceptingClients??!0;return`
    <article class="coach-card trainer-card">
      <header class="coach-card-head">
        <h3>Your athletes</h3>
        <span class="coach-status-pill status-linked">Coach</span>
      </header>
      <div class="trainer-code-row">
        <div>
          <span class="coach-sub">Your coach code</span>
          <div class="trainer-code">${M(r)}</div>
        </div>
        <button type="button" class="btn-secondary" data-action="copy-trainer-code" data-code="${M(r)}">Copy</button>
      </div>
      <label class="trainer-accepting">
        <input type="checkbox" data-action="trainer-toggle-accepting" ${a?`checked`:``}>
        <span>Accepting new athletes</span>
      </label>
      <div class="trainer-clients">
        <p class="coach-sub">${i.length===0?`No athletes yet — share your code to get started.`:`${i.length} ${i.length===1?`athlete`:`athletes`}`}</p>
        ${i.slice(0,8).map(e=>`
          <a class="trainer-client" href="${wn(e.username)}">
            <span class="client-avatar" aria-hidden="true">${M(e.displayName?.slice(0,1)||e.username?.slice(0,1)||`?`)}</span>
            <span class="client-name">${M(e.displayName||e.username||`Athlete`)}</span>
            <span class="client-status status-${e.status||`active`}">${M(e.status||`active`)}</span>
            <span class="client-since">${e.lastLog?`last ${M(Tn(e.lastLog))}`:``}</span>
          </a>`).join(``)}
        ${i.length>8?`<a class="trainer-clients-more" href="/personal-trainers#mine">+ ${i.length-8} more</a>`:``}
      </div>
      <p class="coach-error coach-action-status" data-status-for="trainer-toggle-accepting" hidden></p>
    </article>
  `}function Hn(e){let t=Array.isArray(e.communities)?e.communities:[];return t.length===0?`
      <article class="coach-card communities-card">
        <header class="coach-card-head">
          <h3>Communities</h3>
        </header>
        <p class="coach-note">You haven't joined any workout groups, run clubs, or brackets yet.</p>
        <div class="coach-cta-row">
          <a class="btn-secondary" href="/groups">Find a group</a>
          <a class="btn-ghost" href="/run-clubs">Browse run clubs</a>
          <a class="btn-ghost" href="/brackets" data-feature="brackets">Brackets</a>
        </div>
      </article>
    `:`
    <article class="coach-card communities-card">
      <header class="coach-card-head">
        <h3>Communities</h3>
        <span class="coach-sub">${t.length} membership${t.length===1?``:`s`}</span>
      </header>
      <div class="community-list">
        ${t.map(e=>`
          <a class="community-row" href="${e.url?M(e.url):`#`}" target="${e.url?.startsWith(`http`)?`_blank`:`_self`}" rel="noreferrer">
            <span class="community-emoji" aria-hidden="true">${M(e.emoji||`👥`)}</span>
            <div class="community-info">
              <span class="community-name">${M(e.name||`Community`)}</span>
              <span class="community-meta">
                <span class="community-kind">${M(En[e.kind]||e.kind||`Group`)}</span>
                ${e.memberCount?`<span> · ${e.memberCount.toLocaleString()} members</span>`:``}
                ${e.location?`<span> · ${M(e.location)}</span>`:``}
                ${e.role&&e.role!==`member`?`<span class="community-role role-${M(e.role)}">${M(e.role)}</span>`:``}
              </span>
            </div>
            <span class="community-since">${e.since?`since ${M(Tn(e.since))}`:``}</span>
          </a>`).join(``)}
      </div>
      <div class="coach-cta-row">
        <a class="btn-ghost" href="/groups">Discover groups</a>
        <a class="btn-ghost" href="/run-clubs">Discover run clubs</a>
      </div>
    </article>
  `}function Un(e){N&&(N.querySelector(`[data-action="trainer-redeem-form"]`)?.addEventListener(`submit`,async e=>{e.preventDefault();let t=(e.currentTarget.querySelector(`input[name='code']`)?.value||``).trim();t&&await Wn(`trainer-redeem`,async()=>{await j(`/api/account/trainer-code/redeem`,{method:`POST`,body:JSON.stringify({code:t})}),await An(N)})}),N.querySelector(`[data-action="trainer-cancel"]`)?.addEventListener(`click`,async()=>{await Wn(`trainer-cancel`,async()=>{await j(`/api/account/trainer-code/cancel`,{method:`POST`,body:`{}`}),await An(N)})}),N.querySelector(`[data-action="trainer-unlink"]`)?.addEventListener(`click`,async()=>{confirm(`Unlink from your coach? You can lock back in later with their code.`)&&await Wn(`trainer-unlink`,async()=>{let e=Cn();await j(`/api/trainer/clients/${encodeURIComponent(e)}/remove`,{method:`POST`,body:`{}`}),await An(N)})}),N.querySelector(`[data-action="trainer-app-withdraw"]`)?.addEventListener(`click`,async()=>{await Wn(`trainer-app-withdraw`,async()=>{await j(`/api/trainer/application/withdraw`,{method:`POST`,body:`{}`}),await An(N)})}),N.querySelector(`[data-action="copy-trainer-code"]`)?.addEventListener(`click`,async e=>{let t=e.currentTarget.dataset.code;try{await navigator.clipboard.writeText(t),e.currentTarget.textContent=`Copied!`,setTimeout(()=>e.currentTarget.textContent=`Copy`,1500)}catch{}}),N.querySelector(`[data-action="trainer-toggle-accepting"]`)?.addEventListener(`change`,async e=>{let t=!!e.target.checked;await Wn(`trainer-toggle-accepting`,async()=>{await j(`/api/account/profile?contact=${encodeURIComponent(Cn())}`,{method:`PATCH`,body:JSON.stringify({trainerSettings:{acceptingClients:t}})})})}))}async function Wn(e,t){let n=N?.querySelector(`[data-status-for="${e}"]`);n&&(n.hidden=!0,n.textContent=``);try{await t()}catch(t){n?(n.textContent=t?.message||`Request failed`,n.hidden=!1):console.warn(`coach-community action '${e}' failed:`,t)}}var Gn=`https://api.thetrackerapp.io`,Kn=[`Sun`,`Mon`,`Tue`,`Wed`,`Thu`,`Fri`,`Sat`],P={rootEl:null,schedule:null,month:null,monthData:null,weekData:null,adherence:null,loading:!1};function qn(){try{let e=localStorage.getItem(`tracker.auth.session`);if(!e)return``;try{let t=JSON.parse(e),n=t&&(t.token||t.accessToken);if(n)return String(n).trim()}catch{}return String(e).trim()}catch{return``}}async function Jn(e,t={}){let n=qn(),r={Accept:`application/json`,...t.headers||{}};t.body&&!r[`Content-Type`]&&(r[`Content-Type`]=`application/json`),n&&(r.Authorization=`Bearer ${n}`);let i=await fetch(`${Gn}${e}`,{...t,headers:r});if(!i.ok){let t=await i.text().catch(()=>``);throw Error(`${e} ${i.status}: ${t||i.statusText}`)}return i.status===204?null:i.json().catch(()=>null)}function F(e){return String(e??``).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`).replace(/'/g,`&#39;`)}function Yn(e){return F(e).replace(/`/g,`&#96;`)}function Xn(){let e=new Date;return`${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,`0`)}-${String(e.getDate()).padStart(2,`0`)}`}function Zn(){return Xn().slice(0,7)}function Qn(e){let t=new Date(e.getTime());return t.setDate(t.getDate()-t.getDay()),`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,`0`)}-${String(t.getDate()).padStart(2,`0`)}`}function $n(e,t){let[n,r]=e.split(`-`).map(Number),i=new Date(n,r-1+t,1);return`${i.getFullYear()}-${String(i.getMonth()+1).padStart(2,`0`)}`}function er(e){let[t,n]=e.split(`-`).map(Number);return new Date(t,n-1,1).toLocaleDateString(`en-US`,{month:`long`,year:`numeric`})}async function tr(e){e&&(P.rootEl=e,P.month||=Zn(),e.innerHTML=cr(),yr(),await nr())}async function nr(){P.loading=!0,sr(!0);let e=[rr(),ir(P.month),ar(),or(`30d`)];await Promise.allSettled(e),P.loading=!1,sr(!1),lr()}async function rr(){try{P.schedule=(await Jn(`/api/calendar/schedule`))?.schedule||null}catch(e){console.warn(`calendar schedule load failed:`,e),P.schedule=null}}async function ir(e){try{P.monthData=await Jn(`/api/calendar/month?month=${encodeURIComponent(e)}`)||null}catch(e){console.warn(`calendar month load failed:`,e),P.monthData=null}}async function ar(){try{let e=Qn(new Date);P.weekData=await Jn(`/api/calendar/week?weekStart=${encodeURIComponent(e)}`)||null}catch(e){console.warn(`calendar week load failed:`,e),P.weekData=null}}async function or(e){try{P.adherence=await Jn(`/api/calendar/adherence?range=${encodeURIComponent(e)}`)||null}catch(e){console.warn(`calendar adherence load failed:`,e),P.adherence=null}}function sr(e){if(!P.rootEl)return;let t=P.rootEl.querySelector(`#calLoadingOverlay`);t&&(t.hidden=!e)}function cr(){return`
    <div class="calendar-tab">
      <div class="calendar-summary-row" id="calSummaryRow"></div>

      <section class="calendar-toolbar">
        <div class="calendar-month-nav">
          <button type="button" class="cal-nav-btn" id="calPrevMonth" aria-label="Previous month">‹</button>
          <h3 class="calendar-month-label" id="calMonthLabel">${F(er(P.month))}</h3>
          <button type="button" class="cal-nav-btn" id="calNextMonth" aria-label="Next month">›</button>
          <button type="button" class="cal-today-btn" id="calTodayBtn">Today</button>
        </div>
        <div class="calendar-legend" aria-label="Status legend">
          <span class="cal-legend-dot is-hit"></span><span>Hit</span>
          <span class="cal-legend-dot is-partial"></span><span>Partial</span>
          <span class="cal-legend-dot is-missed"></span><span>Missed</span>
          <span class="cal-legend-dot is-rest"></span><span>Rest</span>
        </div>
      </section>

      <div class="calendar-loading" id="calLoadingOverlay" hidden>Loading…</div>

      <div class="calendar-grid-wrap">
        <div class="calendar-grid" id="calMonthGrid" role="grid" aria-label="Workout calendar"></div>
      </div>

      <div class="calendar-bottom-row">
        <section class="calendar-schedule-card" id="calScheduleCard"></section>
        <section class="calendar-adherence-card" id="calAdherenceCard"></section>
      </div>

      <div class="calendar-day-drawer" id="calDayDrawer" hidden></div>
    </div>
  `}function lr(){ur(),fr(),mr(),hr()}function ur(){let e=P.rootEl?.querySelector(`#calSummaryRow`);if(!e)return;let t=P.weekData,n=P.monthData?.summary||{},r=t?.adherencePct??n.adherencePct??P.adherence?.adherencePct??null,i=n.currentStreak??0,a=n.longestStreak??0,o=t?.committedHits??null,s=t?.committedDays??null,c=t?.totalDaysHit??null,l=s!=null&&s>0,u=r==null?`—`:`${Math.round(r*100)}%`;e.innerHTML=`
    <div class="cal-summary-tile cal-summary-adherence ${r==null?``:r>=.8?`is-good`:r>=.5?`is-warn`:`is-bad`}">
      <span class="cal-summary-label">Plan followed</span>
      <span class="cal-summary-big">${F(u)}</span>
      <span class="cal-summary-sub">${F(P.adherence?.range?`Over ${P.adherence.range.toUpperCase()}`:`This week`)}</span>
    </div>

    <div class="cal-summary-tile cal-summary-week">
      <span class="cal-summary-label">${l?`Committed days hit`:`Active days this week`}</span>
      <span class="cal-summary-big">${l?`${o??0}<span class="cal-summary-of">/${s}</span>`:`${c??0}<span class="cal-summary-of">/7</span>`}</span>
      <span class="cal-summary-sub">${F(dr(t))}</span>
    </div>

    <div class="cal-summary-tile cal-summary-streak">
      <span class="cal-summary-label">Streak</span>
      <span class="cal-summary-big">${i}<span class="cal-summary-of"> 🔥</span></span>
      <span class="cal-summary-sub">${a?`Best this month: ${a} days`:`Log a workout to start a streak`}</span>
    </div>
  `}function dr(e){return e?.perDay?.length?e.perDay.map(e=>e.status===`hit`?`●`:e.status===`partial`?`◐`:e.status===`missed`?`○`:e.logged?`·`:e.isCommitted?`○`:`·`).join(` `):`M T W T F S S`}function fr(){let e=P.rootEl?.querySelector(`#calMonthGrid`);if(!e)return;let t=P.rootEl?.querySelector(`#calMonthLabel`);t&&(t.textContent=er(P.month));let[n,r]=P.month.split(`-`).map(Number),i=new Date(n,r-1,1),a=new Date(n,r,0),o=i.getDay(),s=Math.ceil((o+a.getDate())/7)*7,c=new Map;(P.monthData?.days||[]).forEach(e=>c.set(e.date,e));let l=Xn(),u=new Set(P.schedule?.committedWeekdays||[]),d=``;d+=`<div class="cal-grid-header">`;for(let e=0;e<7;e++)d+=`<div class="cal-grid-dow">${Kn[e]}</div>`;d+=`</div>`,d+=`<div class="cal-grid-body">`;for(let e=0;e<s;e++){let t=e-o+1;if(!(t>=1&&t<=a.getDate())){d+=`<div class="cal-cell is-empty" aria-hidden="true"></div>`;continue}let i=new Date(n,r-1,t),s=`${n}-${String(r).padStart(2,`0`)}-${String(t).padStart(2,`0`)}`,f=i.getDay(),p=c.get(s)||{},m=p.isCommitted??u.has(f),h=p.status||pr(p,m,s,l),g=p.planned||P.schedule?.weekdayPlan?.[f]||null,_=p.actual||null,ee=s===l,te=s>l,v=g?.label||(m?`Scheduled`:``),ne=_?.workouts?`<span class="cal-cell-actual">${_.workouts}×</span>`:``;d+=`
      <button type="button"
              class="cal-cell is-${Yn(h)} ${m?`is-committed`:``} ${ee?`is-today`:``} ${te?`is-future`:``}"
              data-date="${s}"
              data-status="${Yn(h)}"
              aria-label="${Yn(`${i.toDateString()} — ${h}${v?`, planned ${v}`:``}${_?.workouts?`, ${_.workouts} workout${_.workouts===1?``:`s`} logged`:``}`)}">
        <span class="cal-cell-day">${t}</span>
        ${v?`<span class="cal-cell-plan">${F(v)}</span>`:``}
        ${ne}
        <span class="cal-cell-status-dot" aria-hidden="true"></span>
      </button>
    `}d+=`</div>`,e.innerHTML=d,xr()}function pr(e,t,n,r){return n>r?`future`:t?e.actual?.logged||e.actual?.workouts?`hit`:`missed`:`rest`}function mr(){let e=P.rootEl?.querySelector(`#calScheduleCard`);if(!e)return;let t=P.schedule;if(!t){e.innerHTML=`
      <header class="cal-card-head"><h4>Your schedule</h4></header>
      <p class="cal-empty">You haven't set up a workout schedule yet.</p>
      <p class="cal-empty-hint">Tell the bot something like "I work out Mon, Wed, Fri" and refresh — or click below to set it now.</p>
      <button type="button" class="btn-primary cal-setup-btn" id="calSetupBtn">Set up schedule</button>
    `,Cr();return}let n=new Set(t.committedWeekdays||[]),r=t.targetDaysPerWeek,i=t.weekdayPlan||{};e.innerHTML=`
    <header class="cal-card-head">
      <h4>Your schedule</h4>
      ${r?`<span class="cal-card-sub">${n.size||r} day${(n.size||r)===1?``:`s`} / week</span>`:``}
    </header>
    <div class="cal-weekday-grid">
      ${[0,1,2,3,4,5,6].map(e=>{let t=n.has(e),r=i[e]?.label||``;return`
            <button type="button" class="cal-weekday-chip ${t?`is-on`:``}" data-dow="${e}" aria-pressed="${t}">
              <span class="cal-weekday-name">${Kn[e]}</span>
              <span class="cal-weekday-label">${F(r||(t?`Scheduled`:`Rest`))}</span>
            </button>
          `}).join(``)}
    </div>
    <p class="cal-card-foot">
      Tap a day to toggle commitment. Long-press to edit the workout label.
    </p>
  `,Sr()}function hr(){let e=P.rootEl?.querySelector(`#calAdherenceCard`);if(!e)return;let t=P.adherence?.weeks||[];if(!t.length){e.innerHTML=`
      <header class="cal-card-head"><h4>Adherence trend</h4></header>
      <p class="cal-empty">Not enough data yet.</p>
      <p class="cal-empty-hint">Log a few weeks of workouts to see your trend line.</p>
    `;return}let n=t.map(e=>{let t=Math.max(0,Math.min(1,Number(e.pct)||0));return`
        <div class="cal-adherence-bar ${t>=.8?`is-good`:t>=.5?`is-warn`:`is-bad`}" style="--bar-h:${Math.round(t*100)}%"
             title="Week of ${Yn(e.weekStart)} — ${Math.round(t*100)}% (${e.hits}/${e.committed})">
          <span class="cal-adherence-bar-fill"></span>
          <span class="cal-adherence-bar-label">${Math.round(t*100)}%</span>
        </div>
      `}).join(``),r=P.adherence?.bestWeek,i=P.adherence?.worstWeek;e.innerHTML=`
    <header class="cal-card-head"><h4>Adherence trend</h4>
      <span class="cal-card-sub">${F(P.adherence?.range?.toUpperCase()||``)}</span>
    </header>
    <div class="cal-adherence-bars">${n}</div>
    ${r||i?`<p class="cal-card-foot">
            ${r?`Best: ${Math.round((r.pct||0)*100)}% (week of ${F(r.weekStart)})`:``}
            ${r&&i?` · `:``}
            ${i?`Worst: ${Math.round((i.pct||0)*100)}%`:``}
           </p>`:``}
  `}function gr(e){let t=P.rootEl?.querySelector(`#calDayDrawer`);if(!t)return;let n=(P.monthData?.days||[]).find(t=>t.date===e)||{date:e},r=n.planned||P.schedule?.weekdayPlan?.[new Date(e).getDay()]||null,i=n.actual||null,a=n.status||`future`;t.hidden=!1,t.innerHTML=`
    <div class="cal-drawer-inner" role="dialog" aria-modal="false" aria-labelledby="calDrawerTitle">
      <button type="button" class="cal-drawer-close" id="calDrawerClose" aria-label="Close">×</button>
      <h3 id="calDrawerTitle" class="cal-drawer-title">${F(new Date(e).toLocaleDateString(`en-US`,{weekday:`long`,month:`long`,day:`numeric`}))}</h3>
      <span class="cal-drawer-status is-${Yn(a)}">${F(vr(a))}</span>

      <section class="cal-drawer-section">
        <h4>Planned</h4>
        ${r?`<p class="cal-drawer-line"><strong>${F(r.label||`Scheduled`)}</strong>${r.type?` · ${F(r.type)}`:``}</p>${r.exercises?.length?`<p class="cal-drawer-meta">Exercises: ${r.exercises.map(F).join(`, `)}</p>`:``}${r.notes?`<p class="cal-drawer-meta">${F(r.notes)}</p>`:``}`:`<p class="cal-empty">Nothing scheduled for this day.</p>`}
      </section>

      <section class="cal-drawer-section">
        <h4>Actual</h4>
        ${i?.logged||i?.workouts?`<p class="cal-drawer-line"><strong>${i.workouts||0}</strong> workout${(i.workouts||0)===1?``:`s`} logged</p>${i.exercises?.length?`<p class="cal-drawer-meta">Did: ${i.exercises.map(F).join(`, `)}</p>`:``}${i.totalVolumeLb?`<p class="cal-drawer-meta">Volume: ${i.totalVolumeLb.toLocaleString()} lb${i.totalReps?` · ${i.totalReps} reps · ${i.totalSets} sets`:``}</p>`:``}${i.cardioMinutes?`<p class="cal-drawer-meta">Cardio: ${i.cardioMinutes} min</p>`:``}`:e>Xn()?`<p class="cal-empty">Future day — not logged yet.</p>`:`<p class="cal-empty">No workouts logged for this day.</p>`}
      </section>

      ${n.notes?`<section class="cal-drawer-section"><h4>Notes</h4><p>${F(n.notes)}</p></section>`:``}
    </div>
  `,t.querySelector(`#calDrawerClose`)?.addEventListener(`click`,()=>_r()),t.addEventListener(`click`,e=>{e.target===t&&_r()},{once:!0})}function _r(){let e=P.rootEl?.querySelector(`#calDayDrawer`);e&&(e.hidden=!0)}function vr(e){return{hit:`✓ Hit`,partial:`◐ Partial`,missed:`✗ Missed`,rest:`· Rest day`,future:`Upcoming`}[e]||e}function yr(){P.rootEl?.querySelector(`#calPrevMonth`)?.addEventListener(`click`,()=>br(-1)),P.rootEl?.querySelector(`#calNextMonth`)?.addEventListener(`click`,()=>br(1)),P.rootEl?.querySelector(`#calTodayBtn`)?.addEventListener(`click`,()=>{P.month=Zn(),nr()})}async function br(e){P.month=$n(P.month,e),sr(!0),await ir(P.month),sr(!1),fr()}function xr(){P.rootEl?.querySelectorAll(`.cal-cell[data-date]`).forEach(e=>{e.addEventListener(`click`,()=>{let t=e.dataset.date;t&&gr(t)})})}function Sr(){P.rootEl?.querySelectorAll(`.cal-weekday-chip`).forEach(e=>{e.addEventListener(`click`,async()=>{let t=Number(e.dataset.dow);if(!Number.isInteger(t))return;let n=new Set(P.schedule?.committedWeekdays||[]);n.has(t)?n.delete(t):n.add(t);let r=Array.from(n).sort((e,t)=>e-t),i=P.schedule;P.schedule={...P.schedule||{},committedWeekdays:r},mr();try{let e=await Jn(`/api/calendar/schedule`,{method:`PATCH`,body:JSON.stringify({schedule:{committedWeekdays:r}})});e?.schedule&&(P.schedule=e.schedule,mr())}catch(e){console.warn(`schedule patch failed:`,e),P.schedule=i,mr(),alert(`Couldn't save schedule. Try again in a moment.`)}})})}function Cr(){P.rootEl?.querySelector(`#calSetupBtn`)?.addEventListener(`click`,async()=>{try{P.schedule=(await Jn(`/api/calendar/schedule`,{method:`PATCH`,body:JSON.stringify({schedule:{committedWeekdays:[1,3,5],targetDaysPerWeek:3}})}))?.schedule||{committedWeekdays:[1,3,5],targetDaysPerWeek:3},mr()}catch(e){console.warn(`setup failed:`,e),alert(`Couldn't set up schedule. Try again in a moment.`)}})}var wr=`https://api.thetrackerapp.io`,Tr=new Set(`help.tutorial.presets.ping.stop.resume.goback.start.quickstart.setup.advanced.advancedstart.signup.plans.upgrade.premium.billing.reminders.reminder.bodyreminder.bodycheckin.measurements.country.nation.timezone.tz.city.goal.goals.log.today.week.month.plan.report.workout.suggest.units.nutrition.food.water.body.blood.export.style.response.undo.redo.leaderboard.emoji.group.club.trainer.stats.adminstats.cost.spend.geminicost.costjson`.split(`.`).map(e=>e.toLowerCase())),Er=[{group:`Workouts`,key:`/mypush`,expansion:`20 pushups`},{group:`Workouts`,key:`/mypull`,expansion:`10 pullups`},{group:`Workouts`,key:`/core`,expansion:`20 crunches and 30 leg raises and 60 second plank`},{group:`Workouts`,key:`/legday`,expansion:`3 sets of 10 squats at 135 lb`},{group:`Workouts`,key:`/amrap`,expansion:`5 rounds of 10 pushups 10 pullups 20 squats`},{group:`Meals`,key:`/breakfast`,expansion:`oatmeal with blueberries and 2 boiled eggs`},{group:`Meals`,key:`/lunch`,expansion:`chicken rice and broccoli`},{group:`Meals`,key:`/dinner`,expansion:`salmon sweet potato and a salad`},{group:`Meals`,key:`/snack`,expansion:`handful of almonds`},{group:`Drinks`,key:`/coffee`,expansion:`black coffee 8 oz`},{group:`Drinks`,key:`/shake`,expansion:`whey protein 25g and 1 banana`},{group:`Drinks`,key:`/celsius`,expansion:`drank a celsius`},{group:`Hydration`,key:`/bottle`,expansion:`drank 16 oz of water`},{group:`Hydration`,key:`/h2o`,expansion:`drank 8 oz of water`},{group:`Hydration`,key:`/chug`,expansion:`drank 32 oz of water`},{group:`Supplements`,key:`/preworkout`,expansion:`took 1 scoop pre-workout and 200mg caffeine`},{group:`Supplements`,key:`/vitamins`,expansion:`vitamin d 2000 IU, fish oil 1000 mg, magnesium 400 mg`},{group:`Supplements`,key:`/creatine`,expansion:`took 5g creatine`},{group:`Supplements`,key:`/bedtime`,expansion:`magnesium 400mg and melatonin 3mg`},{group:`Cardio`,key:`/run`,expansion:`ran 3 miles in 28 minutes`},{group:`Cardio`,key:`/commute`,expansion:`walked 0.6 miles`},{group:`Cardio`,key:`/spin`,expansion:`biked 30 minutes at moderate intensity`},{group:`Check-in`,key:`/morning`,expansion:`weight 175 lb`},{group:`Check-in`,key:`/sat`,expansion:`chest 42 in, waist 33 in, arms 15 in`}],I={maxKeyLength:32,maxExpansionLength:400,maxCommandsPerUser:50},L={rootEl:null,commands:[],loading:!1,modalMode:null,editingKey:null};function Dr(){try{let e=localStorage.getItem(`tracker.auth.user`);if(!e)return``;let t=JSON.parse(e);return(t?.username||t?.canonical||t?.credential||t?.maskedCredential||t?.accountId||``).toString().trim()}catch{return``}}function Or(){try{let e=localStorage.getItem(`tracker.auth.session`);if(!e)return``;try{let t=JSON.parse(e),n=t&&(t.token||t.accessToken);if(n)return String(n).trim()}catch{}return String(e).trim()}catch{return``}}async function kr(e,t={}){let n=Or(),r={Accept:`application/json`,...t.headers||{}};t.body&&!r[`Content-Type`]&&(r[`Content-Type`]=`application/json`),n&&(r.Authorization=`Bearer ${n}`);let i=await fetch(`${wr}${e}`,{...t,headers:r}),a=null;try{a=await i.json()}catch{}if(!i.ok){let t=Error(a?.error||a?.note||`${e} ${i.status}`);throw t.code=a?.error||``,t.note=a?.note||``,t.status=i.status,t.body=a,t}return a}function Ar(e){let t=String(e||``).trim().toLowerCase();return t.startsWith(`/`)&&(t=t.slice(1)),t=t.replace(/[^a-z0-9_]/g,``),t?(t=t.slice(0,I.maxKeyLength-1),`/`+t):``}function jr(e,{skipDuplicateCheck:t=!1,allowKey:n=``}={}){let r=Ar(e);if(!r)return{ok:!1,error:`invalid_key`,message:`Use letters, numbers, or underscores.`};if(r.length<3)return{ok:!1,error:`key_too_short`,message:`At least 2 characters after the /.`};let i=r.slice(1);if(Tr.has(i))return{ok:!1,error:`reserved_key`,message:`${r} is a built-in command. Pick something else.`};if(!t){let e=L.commands.find(e=>e.key===r);if(e&&e.key!==n)return{ok:!1,error:`duplicate_key`,message:`You already have ${r}. Edit it instead.`}}return{ok:!0,normalized:r}}function Mr(e){let t=String(e||``).trim();return t?t.length>I.maxExpansionLength?{ok:!1,error:`expansion_too_long`,message:`Keep it under ${I.maxExpansionLength} characters.`}:{ok:!0,trimmed:t}:{ok:!1,error:`expansion_required`,message:`What should this expand to?`}}function Nr(e){return String(e??``).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`).replace(/'/g,`&#39;`)}function Pr(e){return Nr(e).replace(/`/g,`&#96;`)}async function Fr(e){e&&(L.rootEl=e,e.innerHTML=zr(),Br(),await Ir(),Hr())}async function Ir(){let e=Dr();if(!e){L.commands=[];return}L.loading=!0,Vr(!0);try{let t=await kr(`/api/user/quick-commands?contact=${encodeURIComponent(e)}`);L.commands=Array.isArray(t?.commands)?t.commands.slice():[],t?.limits&&(I.maxKeyLength=t.limits.maxKeyLength??I.maxKeyLength,I.maxExpansionLength=t.limits.maxExpansionLength??I.maxExpansionLength,I.maxCommandsPerUser=t.limits.maxCommandsPerUser??I.maxCommandsPerUser)}catch(e){console.warn(`shortcuts load failed:`,e),L.commands=[]}finally{L.loading=!1,Vr(!1)}}async function Lr({key:e,expansion:t}){let n=Dr();if(!n)throw Error(`Sign in to manage shortcuts.`);return kr(`/api/user/quick-commands`,{method:`POST`,body:JSON.stringify({contact:n,key:e,expansion:t})})}async function Rr(e){let t=Dr();if(!t)throw Error(`Sign in to manage shortcuts.`);return kr(`/api/user/quick-commands`,{method:`DELETE`,body:JSON.stringify({contact:t,key:e})})}function zr(){return`
    <div class="shortcuts-tab">
      <div class="shortcuts-toolbar">
        <div class="shortcuts-count" id="shortcutsCount">—</div>
        <button type="button" class="btn-primary" id="shortcutsNewBtn">+ New shortcut</button>
      </div>
      <p class="shortcuts-tip">
        Type a shortcut on its own (<code>/coffee</code>) or follow it with extra text
        (<code>/coffee with 2 sugars</code>) — both work. Anything after the alias gets
        appended before the bot parser runs.
      </p>
      <div id="shortcutsListHost" class="shortcuts-list-host" aria-live="polite"></div>
    </div>
  `}function Br(){L.rootEl?.querySelector(`#shortcutsNewBtn`)?.addEventListener(`click`,()=>{Qr(`create`)})}function Vr(e){let t=L.rootEl?.querySelector(`#shortcutsListHost`);t&&e&&!L.commands.length&&(t.innerHTML=`<p class="shortcuts-loading">Loading your shortcuts…</p>`)}function Hr(){let e=L.rootEl?.querySelector(`#shortcutsListHost`);if(e){if(Ur(),!L.commands.length){e.innerHTML=Wr(),qr();return}e.innerHTML=`
    <table class="shortcuts-table" aria-label="Your shortcuts">
      <thead>
        <tr>
          <th class="shortcuts-th-key">Shortcut</th>
          <th>Expands to</th>
          <th class="shortcuts-th-usage" title="How many times you've used it">Used</th>
          <th class="shortcuts-th-actions" aria-label="Actions"></th>
        </tr>
      </thead>
      <tbody>
        ${L.commands.slice().sort((e,t)=>{let n=Number(e.usageCount)||0,r=Number(t.usageCount)||0;return n===r?String(e.key).localeCompare(String(t.key)):r-n}).map(e=>`
          <tr data-key="${Pr(e.key)}">
            <td class="shortcuts-td-key"><code>${Nr(e.key)}</code></td>
            <td class="shortcuts-td-expansion">${Nr(e.expansion)}</td>
            <td class="shortcuts-td-usage">${Number(e.usageCount)||0}</td>
            <td class="shortcuts-td-actions">
              <button type="button" class="shortcuts-action-btn" data-action="copy" data-key="${Pr(e.key)}" title="Copy shortcut">⧉</button>
              <button type="button" class="shortcuts-action-btn" data-action="edit" data-key="${Pr(e.key)}" title="Edit">✎</button>
              <button type="button" class="shortcuts-action-btn shortcuts-action-danger" data-action="delete" data-key="${Pr(e.key)}" title="Delete">×</button>
            </td>
          </tr>
        `).join(``)}
      </tbody>
    </table>

    <details class="shortcuts-starter-fold">
      <summary>+ Browse starter shortcuts (${Er.length})</summary>
      ${Gr()}
    </details>
  `,Kr(),qr()}}function Ur(){let e=L.rootEl?.querySelector(`#shortcutsCount`);if(!e)return;let t=L.commands.length;e.textContent=t===0?`0 shortcuts`:`${t} of ${I.maxCommandsPerUser} shortcut${t===1?``:`s`}`}function Wr(){return`
    <div class="shortcuts-empty">
      <p class="shortcuts-empty-title">No shortcuts yet.</p>
      <p class="shortcuts-empty-sub">Create one to save typing on things you log every day. Tap any starter below to add it instantly.</p>
    </div>
    ${Gr()}
  `}function Gr(){let e=new Set(L.commands.map(e=>e.key)),t={};return Er.forEach(e=>{t[e.group]||(t[e.group]=[]),t[e.group].push(e)}),`
    <div class="shortcuts-gallery">
      ${Object.entries(t).map(([t,n])=>`
        <section class="shortcuts-gallery-group">
          <h4>${Nr(t)}</h4>
          <div class="shortcuts-gallery-grid">
            ${n.map(t=>{let n=e.has(t.key);return`
                  <button type="button"
                          class="shortcuts-gallery-card ${n?`is-added`:``}"
                          data-starter-key="${Pr(t.key)}"
                          data-starter-expansion="${Pr(t.expansion)}"
                          ${n?`disabled`:``}>
                    <code class="shortcuts-gallery-key">${Nr(t.key)}</code>
                    <span class="shortcuts-gallery-expansion">${Nr(t.expansion)}</span>
                    <span class="shortcuts-gallery-add">${n?`✓ Added`:`+ Add`}</span>
                  </button>
                `}).join(``)}
          </div>
        </section>
      `).join(``)}
    </div>
  `}function Kr(){L.rootEl?.querySelectorAll(`[data-action]`).forEach(e=>{e.addEventListener(`click`,async t=>{t.stopPropagation();let n=e.dataset.action,r=e.dataset.key;if(r)if(n===`copy`)try{await navigator.clipboard.writeText(r),Jr(e,`✓`)}catch{}else n===`edit`?Qr(`edit`,r):n===`delete`&&confirm(`Delete ${r}?`)&&await Xr(r)})}),L.rootEl?.querySelectorAll(`tr[data-key]`).forEach(e=>{e.addEventListener(`click`,t=>{if(t.target.closest(`[data-action]`))return;let n=e.dataset.key;n&&Qr(`edit`,n)})})}function qr(){L.rootEl?.querySelectorAll(`[data-starter-key]`).forEach(e=>{e.addEventListener(`click`,async()=>{let t=e.dataset.starterKey,n=e.dataset.starterExpansion;if(!(!t||!n)){e.disabled=!0;try{await Yr({key:t,expansion:n})}finally{e.disabled=!1}}})})}function Jr(e,t){let n=e.textContent;e.textContent=t,setTimeout(()=>{e.textContent=n},900)}async function Yr({key:e,expansion:t,oldKey:n}){let r=jr(e,{allowKey:n||``});if(!r.ok)return alert(r.message),!1;let i=Mr(t);if(!i.ok)return alert(i.message),!1;if(L.commands.length>=I.maxCommandsPerUser&&!L.commands.find(e=>e.key===r.normalized)&&!n)return alert(`You've hit the ${I.maxCommandsPerUser}-shortcut limit. Delete one before adding a new one.`),!1;try{if(n&&n!==r.normalized)try{await Rr(n)}catch{}return await Lr({key:r.normalized,expansion:i.trimmed}),await Ir(),Hr(),$r(),!0}catch(e){return Zr(e),!1}}async function Xr(e){try{await Rr(e),L.commands=L.commands.filter(t=>t.key!==e),Hr()}catch(e){Zr(e)}}function Zr(e){let t={invalid_key:`That shortcut name isn't valid. Use letters, numbers, or underscores.`,key_too_short:`Shortcut needs at least 2 characters after the /.`,reserved_key:e.note||`That's a built-in command. Pick something else.`,expansion_required:`Add what the shortcut should expand to.`,limit_reached:`You've hit the ${I.maxCommandsPerUser}-shortcut limit. Delete one before adding a new one.`,not_found:`That shortcut wasn't found — maybe it's already gone.`};alert(t[e.code]||e.message||`Couldn't save. Try again in a moment.`)}function Qr(e,t=``){L.modalMode=e,L.editingKey=e===`edit`?t:null;let n=e===`edit`?L.commands.find(e=>e.key===t):null,r=n?.key||``,i=n?.expansion||``,a=document.createElement(`div`);a.className=`shortcuts-modal-overlay`,a.id=`shortcutsModal`,a.innerHTML=`
    <div class="shortcuts-modal" role="dialog" aria-modal="true" aria-labelledby="shortcutsModalTitle">
      <header class="shortcuts-modal-head">
        <h3 id="shortcutsModalTitle">${e===`edit`?`Edit shortcut`:`New shortcut`}</h3>
        <button type="button" class="shortcuts-modal-close" id="shortcutsModalClose" aria-label="Close">×</button>
      </header>

      <form id="shortcutsModalForm" class="shortcuts-modal-form" novalidate>
        <label class="shortcuts-field">
          <span class="shortcuts-field-label">Shortcut</span>
          <span class="shortcuts-field-help">What you'll type. Letters, numbers, underscores. We'll add the / for you.</span>
          <div class="shortcuts-field-input-wrap">
            <span class="shortcuts-field-prefix">/</span>
            <input
              type="text"
              id="shortcutsKeyInput"
              class="shortcuts-field-input"
              maxlength="${I.maxKeyLength-1}"
              autocomplete="off"
              spellcheck="false"
              autocapitalize="none"
              placeholder="coffee"
              value="${Pr((r||``).replace(/^\//,``))}"
            />
          </div>
          <span class="shortcuts-field-error" id="shortcutsKeyError" role="status"></span>
        </label>

        <label class="shortcuts-field">
          <span class="shortcuts-field-label">Expands to</span>
          <span class="shortcuts-field-help">What gets sent to the bot when you type the shortcut. Anything you'd normally text — food, workouts, supplements, water, weight, all at once.</span>
          <textarea
            id="shortcutsExpansionInput"
            class="shortcuts-field-textarea"
            maxlength="${I.maxExpansionLength}"
            placeholder="black coffee 8 oz"
            rows="3"
          >${Nr(i)}</textarea>
          <div class="shortcuts-field-counter">
            <span id="shortcutsExpansionCount">${i.length}</span> / ${I.maxExpansionLength}
          </div>
          <span class="shortcuts-field-error" id="shortcutsExpansionError" role="status"></span>
        </label>

        <div class="shortcuts-modal-foot">
          ${e===`edit`?`<button type="button" class="btn-danger" id="shortcutsModalDelete">Delete</button>`:``}
          <div class="shortcuts-modal-foot-right">
            <button type="button" class="btn-secondary" id="shortcutsModalCancel">Cancel</button>
            <button type="submit" class="btn-primary" id="shortcutsModalSave">${e===`edit`?`Save`:`Create`}</button>
          </div>
        </div>
      </form>
    </div>
  `,document.body.appendChild(a),ei(a,{oldKey:r}),setTimeout(()=>a.querySelector(`#shortcutsKeyInput`)?.focus(),30)}function $r(){document.getElementById(`shortcutsModal`)?.remove(),L.modalMode=null,L.editingKey=null}function ei(e,{oldKey:t}){e.addEventListener(`click`,t=>{t.target===e&&$r()}),e.querySelector(`#shortcutsModalClose`)?.addEventListener(`click`,$r),e.querySelector(`#shortcutsModalCancel`)?.addEventListener(`click`,$r);let n=e.querySelector(`#shortcutsKeyInput`),r=e.querySelector(`#shortcutsKeyError`),i=e.querySelector(`#shortcutsExpansionInput`),a=e.querySelector(`#shortcutsExpansionCount`),o=e.querySelector(`#shortcutsExpansionError`);n.addEventListener(`input`,()=>{let e=n.value,i=jr(e,{allowKey:t});i.ok?(r.textContent=``,n.classList.remove(`is-error`)):(r.textContent=i.message,n.classList.add(`is-error`))}),i.addEventListener(`input`,()=>{let e=i.value;a.textContent=e.length,a.parentElement.classList.toggle(`is-warn`,e.length>I.maxExpansionLength*.8),a.parentElement.classList.toggle(`is-error`,e.length>=I.maxExpansionLength);let t=Mr(e);t.ok?(o.textContent=``,i.classList.remove(`is-error`)):(o.textContent=t.message,i.classList.add(`is-error`))}),e.querySelector(`#shortcutsModalDelete`)?.addEventListener(`click`,async()=>{t&&confirm(`Delete ${t}?`)&&(await Xr(t),$r())}),e.querySelector(`#shortcutsModalForm`)?.addEventListener(`submit`,async r=>{r.preventDefault();let a=e.querySelector(`#shortcutsModalSave`);a&&(a.disabled=!0),await Yr({key:n.value,expansion:i.value,oldKey:t}),a&&(a.disabled=!1)})}var ti=`tracker.authenticated`,ni=`tracker.auth.user`,ri=`tracker.auth.session`,ii=`tracker.affiliate.pending`,ai=`tracker.dashboard.goals`,oi=`tracker.dashboard.ai.sessions`,si=`/api/backend-proxy`,ci=`https://thetrackerapp.io/login`,li=`https://thetrackerapp.io/logout?next=%2F`,ui=`https://dashboard.thetrackerapp.io/dashboard`,di=`https://thetrackerapp.io/#leaderboard`,fi=`https://thetrackerapp.io/dashboard?billing=success&session_id={CHECKOUT_SESSION_ID}&contact={CONTACT}`,pi=`https://thetrackerapp.io/dashboard?billing=cancelled&contact={CONTACT}`,mi=4e3,hi=[`account`,`stats`,`calendar`,`shortcuts`,`export`,`goals`,`billing`,`integrate`,`ai`,`sheet`,`personal-trainer`,`groups`,`run-clubs`,`affiliate`],gi=[`today`,`week`,`month`,`year`,`all`],_i={today:`D`,week:`W`,month:`M`,year:`Y`,all:`AT`,custom:`CUSTOM`},vi=[{id:`pushups_100_day_1`,name:`100 Pushups a Day Club 1`,target:100},{id:`pushups_1000_day`,name:`1000 Pushups a Day Club`,target:1e3},{id:`miles_100_ran`,name:`100 Miles Ran Club`,target:100}],yi={7:[{id:`7_push_pull_legs_strength`,name:`Push Pull Legs + Strength`,summary:`High frequency split for advanced users with two lower and two push/pull exposures.`,days:[`Day 1: Push (chest/shoulders/triceps)`,`Day 2: Pull (back/biceps)`,`Day 3: Legs (quad focus)`,`Day 4: Upper strength (bench/row/overhead press)`,`Day 5: Lower strength (squat/deadlift variations)`,`Day 6: Glute + hamstring hypertrophy`,`Day 7: Conditioning + mobility`]}],6:[{id:`6_ppl_x2`,name:`PPL x2`,summary:`Classic hypertrophy split repeated twice per week.`,days:[`Day 1: Push A`,`Day 2: Pull A`,`Day 3: Legs A`,`Day 4: Push B`,`Day 5: Pull B`,`Day 6: Legs B + core`]}],5:[{id:`5_upper_lower_glute`,name:`Upper/Lower + Glute Priority`,summary:`Balanced split with extra glute volume.`,days:[`Day 1: Upper (push emphasis)`,`Day 2: Lower (quad emphasis)`,`Day 3: Upper (pull emphasis)`,`Day 4: Lower (hamstring/glute emphasis)`,`Day 5: Glute specialization + conditioning`]}],4:[{id:`4_upper_lower`,name:`Upper Lower x2`,summary:`Efficient split for most intermediates.`,days:[`Day 1: Upper strength`,`Day 2: Lower strength`,`Day 3: Upper hypertrophy`,`Day 4: Lower hypertrophy + core`]}],3:[{id:`3_full_body`,name:`Full Body 3-Day`,summary:`Time-efficient strength + muscle plan.`,days:[`Day 1: Full body (squat + push + pull)`,`Day 2: Full body (hinge + overhead + row)`,`Day 3: Full body (single-leg + incline push + pulldown)`]}],2:[{id:`2_upper_lower_essentials`,name:`Upper Lower Essentials`,summary:`Two-day plan for busy schedules.`,days:[`Day 1: Full upper + core`,`Day 2: Full lower + conditioning`]}],1:[{id:`1_full_body_priority`,name:`Single-Day Full Body`,summary:`One high-impact session per week.`,days:[`Day 1: Squat/hinge/push/pull + finisher circuit`]}]},R={navButtons:Array.from(document.querySelectorAll(`.dashboard-tab[data-tab]`)),panels:Array.from(document.querySelectorAll(`[data-tab-panel]`)),navGoals:document.getElementById(`navGoals`),navIntegrate:document.getElementById(`navIntegrate`),accountEmailValue:document.getElementById(`accountEmailValue`),accountUsernameValue:document.getElementById(`accountUsernameValue`),accountAgeValue:document.getElementById(`accountAgeValue`),accountIdValue:document.getElementById(`accountIdValue`),accountCanonicalValue:document.getElementById(`accountCanonicalValue`),accountMethodValue:document.getElementById(`accountMethodValue`),accountContactValue:document.getElementById(`accountContactValue`),accountLoginAtValue:document.getElementById(`accountLoginAtValue`),accountEmailInput:document.getElementById(`accountEmailInput`),accountUsernameInput:document.getElementById(`accountUsernameInput`),accountAgeInput:document.getElementById(`accountAgeInput`),saveAccountEmailButton:document.getElementById(`saveAccountEmailButton`),verifyAccountEmailButton:document.getElementById(`verifyAccountEmailButton`),saveAccountUsernameButton:document.getElementById(`saveAccountUsernameButton`),saveAccountAgeButton:document.getElementById(`saveAccountAgeButton`),accountEmailSaved:document.getElementById(`accountEmailSaved`),accountUsernameSaved:document.getElementById(`accountUsernameSaved`),accountAgeSaved:document.getElementById(`accountAgeSaved`),accountEmailStatus:document.getElementById(`accountEmailStatus`),accountUsernameStatus:document.getElementById(`accountUsernameStatus`),accountAgeStatus:document.getElementById(`accountAgeStatus`),navPersonalTrainer:document.getElementById(`navPersonalTrainer`),personalTrainerPanel:document.getElementById(`tabPersonalTrainer`),personalTrainerStatusValue:document.getElementById(`personalTrainerStatusValue`),personalTrainerNameValue:document.getElementById(`personalTrainerNameValue`),navAffiliate:document.getElementById(`navAffiliate`),affiliatePanel:document.getElementById(`tabAffiliate`),affiliateTabEmpty:document.getElementById(`affiliateTabEmpty`),affiliateTabMetrics:document.getElementById(`affiliateTabMetrics`),affiliateApplyForm:document.getElementById(`affiliateApplyForm`),affiliateFirstNameInput:document.getElementById(`affiliateFirstNameInput`),affiliateLastNameInput:document.getElementById(`affiliateLastNameInput`),affiliateEmailInput:document.getElementById(`affiliateEmailInput`),affiliateConfirmEmailInput:document.getElementById(`affiliateConfirmEmailInput`),affiliatePhoneInput:document.getElementById(`affiliatePhoneInput`),affiliateTabBillingStatus:document.getElementById(`affiliateTabBillingStatus`),affiliateApplyButton:document.getElementById(`affiliateApplyButton`),affiliateApplySuccess:document.getElementById(`affiliateApplySuccess`),affiliateOpenBillingButton:document.getElementById(`affiliateOpenBillingButton`),affiliateTabEmptyStatus:document.getElementById(`affiliateTabEmptyStatus`),affiliateTabAgreementBox:document.getElementById(`affiliateTabAgreementBox`),affiliateAgreementHeading:document.getElementById(`affiliateAgreementHeading`),affiliateAgreementMessage:document.getElementById(`affiliateAgreementMessage`),affiliateAgreementEmailInput:document.getElementById(`affiliateAgreementEmailInput`),affiliateAgreementConfirmEmailInput:document.getElementById(`affiliateAgreementConfirmEmailInput`),affiliateAgreementLink:document.getElementById(`affiliateAgreementLink`),affiliateAgreementResendButton:document.getElementById(`affiliateAgreementResendButton`),affiliateAgreementStatus:document.getElementById(`affiliateAgreementStatus`),affiliateTabLinkInput:document.getElementById(`affiliateTabLinkInput`),affiliateTabCode:document.getElementById(`affiliateTabCode`),affiliateTabClicks:document.getElementById(`affiliateTabClicks`),affiliateTabSignups:document.getElementById(`affiliateTabSignups`),affiliateTabConversions:document.getElementById(`affiliateTabConversions`),affiliateTabCalculated:document.getElementById(`affiliateTabCalculated`),affiliateTabHeld:document.getElementById(`affiliateTabHeld`),affiliateTabSent:document.getElementById(`affiliateTabSent`),affiliateTabStripeStatus:document.getElementById(`affiliateTabStripeStatus`),affiliateTabConnectButton:document.getElementById(`affiliateTabConnectButton`),affiliateTabConnectStatus:document.getElementById(`affiliateTabConnectStatus`),affiliateReferralsRows:document.getElementById(`affiliateReferralsRows`),affiliateReferralsStatus:document.getElementById(`affiliateReferralsStatus`),statsRangeButtons:Array.from(document.querySelectorAll(`.stats-range-btn[data-range]`)),statsFromDate:document.getElementById(`statsFromDate`),statsToDate:document.getElementById(`statsToDate`),applyCustomRangeButton:document.getElementById(`applyCustomRangeButton`),statsRangeStatus:document.getElementById(`statsRangeStatus`),statsWorkoutsValue:document.getElementById(`statsWorkoutsValue`),statsCaloriesValue:document.getElementById(`statsCaloriesValue`),statsGallonsValue:document.getElementById(`statsGallonsValue`),statsWindowLabel:document.getElementById(`statsWindowLabel`),statsGeneratedAtValue:document.getElementById(`statsGeneratedAtValue`),statsSheetLink:document.getElementById(`statsSheetLink`),toggleMilestonesButton:document.getElementById(`toggleMilestonesButton`),milestonesSection:document.getElementById(`milestonesSection`),chartWorkoutsRows:document.getElementById(`chartWorkoutsRows`),chartNutritionRows:document.getElementById(`chartNutritionRows`),chartWaterRows:document.getElementById(`chartWaterRows`),chartCombinedRows:document.getElementById(`chartCombinedRows`),bodyMeasureRows:document.getElementById(`bodyMeasureRows`),workoutHeatmap:document.getElementById(`workoutHeatmap`),nutritionHeatmap:document.getElementById(`nutritionHeatmap`),waterHeatmap:document.getElementById(`waterHeatmap`),leaderboardRankValue:document.getElementById(`leaderboardRankValue`),leaderboardLink:document.getElementById(`leaderboardLink`),exportCsvButton:document.getElementById(`exportCsvButton`),exportJsonButton:document.getElementById(`exportJsonButton`),exportStatus:document.getElementById(`exportStatus`),goalWeightInput:document.getElementById(`goalWeightInput`),goalBodyFatInput:document.getElementById(`goalBodyFatInput`),goalWorkoutPlanInput:document.getElementById(`goalWorkoutPlanInput`),planDayButtons:Array.from(document.querySelectorAll(`.plan-day-btn[data-days]`)),popularPlansList:document.getElementById(`popularPlansList`),plansStatus:document.getElementById(`plansStatus`),saveGoalsButton:document.getElementById(`saveGoalsButton`),goalsStatus:document.getElementById(`goalsStatus`),affiliateCopyButtons:Array.from(document.querySelectorAll(`.affiliate-copy[data-copy-target]`)),billingStatusValue:document.getElementById(`billingStatusValue`),billingPlanValue:document.getElementById(`billingPlanValue`),billingLastPaymentValue:document.getElementById(`billingLastPaymentValue`),billingNextBillingValue:document.getElementById(`billingNextBillingValue`),billingManageLink:document.getElementById(`billingManageLink`),billingYearlyButton:document.getElementById(`billingYearlyButton`),billingCancelButton:document.getElementById(`billingCancelButton`),billingResumeButton:document.getElementById(`billingResumeButton`),billingCancelNotice:document.getElementById(`billingCancelNotice`),billingActionStatus:document.getElementById(`billingActionStatus`),integrationCards:document.getElementById(`integrationCards`),integrateStatus:document.getElementById(`integrateStatus`),aiPromptButtons:Array.from(document.querySelectorAll(`.ai-prompt[data-prompt]`)),aiChatForm:document.getElementById(`aiChatForm`),aiQuestionInput:document.getElementById(`aiQuestionInput`),askAiButton:document.getElementById(`askAiButton`),aiNewSessionButton:document.getElementById(`aiNewSessionButton`),aiSessionsList:document.getElementById(`aiSessionsList`),aiMessages:document.getElementById(`aiMessages`),aiEmptyState:document.getElementById(`aiEmptyState`),aiGreetingName:document.getElementById(`aiGreetingName`),aiUserAvatar:document.getElementById(`aiUserAvatar`),aiStatus:document.getElementById(`aiStatus`),aiResponseBox:document.getElementById(`aiResponseBox`),sheetDatabaseLink:document.getElementById(`sheetDatabaseLink`),sheetStatus:document.getElementById(`sheetStatus`),milestonesList:document.getElementById(`milestonesList`),milestonesStatus:document.getElementById(`milestonesStatus`)},z={activeTab:`stats`,activeRange:`today`,metricsByRange:new Map,bodyMeasures:[],leaderboardRank:null,goals:{weightGoal:``,bodyFatGoal:``,workoutPlan:``},selectedPlanDays:`7`,milestonesOpen:!1,currentSheetUrl:``,userSheetUrl:``,backendSnapshot:null,availableIntegrations:[],aiSessions:[],activeAiSessionId:``,affiliateProfile:null,billingPortalUrl:``,affiliateHistoryLoadedKey:``,affiliateHistoryLoading:!1},bi={email:{input:()=>R.accountEmailInput,button:()=>R.saveAccountEmailButton,status:()=>R.accountEmailStatus,check:()=>R.accountEmailSaved,label:`email`},username:{input:()=>R.accountUsernameInput,button:()=>R.saveAccountUsernameButton,status:()=>R.accountUsernameStatus,check:()=>R.accountUsernameSaved,label:`username`},age:{input:()=>R.accountAgeInput,button:()=>R.saveAccountAgeButton,status:()=>R.accountAgeStatus,check:()=>R.accountAgeSaved,label:`age`}};function xi(e){let t=String(e||``).trim();if(!t)return null;try{let e=atob(t),n=Uint8Array.from(e,e=>e.charCodeAt(0)),r=new TextDecoder().decode(n);return JSON.parse(r)}catch{return null}}function Si(e){if(typeof e==`boolean`)return e;let t=String(e||``).trim().toLowerCase();return t===`true`||t===`1`||t===`yes`}function Ci(e){return e==null||e===``?null:Si(e)}function B(e){return/^\S+@\S+\.\S+$/.test(String(e||``).trim())}function wi(e){return/^[a-zA-Z0-9](?:[a-zA-Z0-9._-]{1,30}[a-zA-Z0-9])?$/.test(String(e||``).trim())}function Ti(e){let t=String(e||``).trim();if(!t)return``;let n=t.replace(/\D/g,``);return n.length===10?`+1${n}`:n.length===11&&n.startsWith(`1`)?`+${n}`:n.length>=10&&n.length<=15?t.startsWith(`+`)?t:`+${n}`:``}function Ei(e){let t=Ti(e);return/^\+1\d{10}$/.test(t)?`+1 ${t.slice(2,5)}-${t.slice(5,8)}-${t.slice(8)}`:t||String(e||``).trim()}function Di(e){let t={};return Object.entries(e||{}).forEach(([e,n])=>{n==null||n===``||(t[e]=n)}),t}function Oi(e){let t=String(e||``).trim().split(/\s+/).filter(Boolean);return t.length?t.length===1?{firstName:t[0],lastName:``}:{firstName:t[0],lastName:t.slice(1).join(` `)}:{firstName:``,lastName:``}}function ki(e){return!e||typeof e!=`object`?null:{accountId:String(e.accountId||e.id||``).trim(),maskedCredential:String(e.maskedCredential||e.credential||``).trim(),credential:String(e.credential||e.identifier||``).trim(),method:String(e.method||``).trim(),canonical:String(e.canonical||``).trim(),username:String(e.username||``).trim(),email:String(e.email||``).trim(),emailVerified:Ci(e.emailVerified??e.primaryEmailVerified??e.email_verified??e.verifiedEmail??e.isEmailVerified),firstName:String(e.firstName||e.givenName||``).trim(),lastName:String(e.lastName||e.familyName||``).trim(),name:String(e.name||e.fullName||``).trim(),age:String(e.age||``).trim(),billingStatus:String(e.billingStatus||e.subscriptionStatus||``).trim(),billingPlan:String(e.billingPlan||e.plan||e.priceNickname||``).trim(),billingLastPaymentDate:String(e.billingLastPaymentDate||e.lastPaymentDate||``).trim(),billingNextBillingDate:String(e.billingNextBillingDate||e.nextBillingDate||``).trim(),sheetUrl:String(e.sheetUrl||e.googleSheetUrl||``).trim(),affiliateCode:String(e.affiliateCode||``).trim(),hasPersonalTrainer:Si(e.hasPersonalTrainer||e.personalTrainerAttached||e.trainerAttached),personalTrainerName:String(e.personalTrainerName||e.trainerName||``).trim(),loginAt:String(e.loginAt||``).trim()}}function Ai(){let e=new URLSearchParams(window.location.search),t=ki(xi(e.get(`auth_payload`))),n=String(e.get(`session_token`)||``).trim(),r=String(e.get(`session_expires_at`)||``).trim();if(!t&&!n)return;try{t&&(window.localStorage.setItem(ni,JSON.stringify(t)),window.localStorage.setItem(ti,`true`)),n&&window.localStorage.setItem(ri,JSON.stringify({token:n,expiresAt:r||null}))}catch{}e.delete(`auth_payload`),e.delete(`session_token`),e.delete(`session_expires_at`);let i=e.toString(),a=`${window.location.pathname}${i?`?${i}`:``}${window.location.hash||``}`;window.history.replaceState({},``,a)}function V(){try{let e=window.localStorage.getItem(ni);return e?ki(JSON.parse(e)):null}catch{return null}}function ji(){try{let e=window.localStorage.getItem(ri);if(!e)return``;let t=JSON.parse(e);return String(t?.token||``).trim()}catch{return``}}function Mi(e){let t=String(e||``).trim();if(!t)return t;try{let e=new URL(t,window.location.origin),n=new URL(s).origin,r=e.origin===n&&e.pathname.startsWith(`/api/`),i=e.origin===window.location.origin&&e.pathname.startsWith(`/api/`);if(!r&&!i)return e.toString();let a=new URL(si,window.location.origin);return a.searchParams.set(`target`,`${e.pathname}${e.search}`),a.toString()}catch{return t}}function Ni(e,t=`Request failed.`){let n=String(e?.message||t).trim();return n?/failed to fetch|networkerror|network request failed|load failed/i.test(n)?Error(`Dashboard could not reach the backend.`):e instanceof Error?e:Error(n):Error(t)}async function Pi(e,t={}){let n=ji(),r=new Headers(t.headers||{});return r.has(`Accept`)||r.set(`Accept`,`application/json`),n&&!r.has(`Authorization`)&&r.set(`Authorization`,`Bearer ${n}`),fetch(Mi(e),{cache:`no-store`,...t,headers:r})}function Fi(){let e=V(),t=[e?.canonical,e?.email,e?.username,e?.credential,e?.maskedCredential];for(let e of t){let t=String(e||``).trim();if(t&&!/[*]/.test(t))return t}return``}function Ii(){let e=new URLSearchParams(window.location.search);return String(e.get(`contact`)||``).trim()||Fi()}function H(e,t){if(!e||typeof e!=`object`)return null;for(let n of t){let t=Number(e?.[n]);if(Number.isFinite(t))return t}return null}function Li(e){if(!e||typeof e!=`object`)return null;let t=[e.date,e.loggedAt,e.recordedAt,e.createdAt,e.timestamp,e.time];for(let e of t){let t=String(e||``).trim();if(!t)continue;let n=new Date(t);if(!Number.isNaN(n.getTime()))return n}return null}function Ri(e){return new Date(e.getFullYear(),e.getMonth(),e.getDate())}function zi(e){let t=(e.getDay()+6)%7,n=Ri(e);return n.setDate(n.getDate()-t),n}function Bi(e){return new Date(e.getFullYear(),e.getMonth(),1)}function Vi(e){return new Date(e.getFullYear(),0,1)}function Hi(e,t){if(!(e instanceof Date)||Number.isNaN(e.getTime()))return!1;let n=new Date;return t===`all`?!0:t===`today`?e>=Ri(n):t===`week`?e>=zi(n):t===`month`?e>=Bi(n):t===`year`?e>=Vi(n):!1}function U(e,t=``){return{value:Number.isFinite(Number(e))?Number(e):0,sheetUrl:t||z.currentSheetUrl||``}}function Ui(e){let t=String(e?.googleSheetUrl||e?.sheetUrl||e?.dashboardSheetUrl||``).trim();if(t)return t;let n=String(e?.googleSheetId||``).trim();return n?`https://docs.google.com/spreadsheets/d/${n}/edit`:``}function Wi(e,t=``){let n=Array.isArray(e?.workouts)?e.workouts:[],r=Array.isArray(e?.nutrition)?e.nutrition:[],i=Array.isArray(e?.water)?e.water:[],a=new Map;return gi.forEach(e=>{let o=0,s=0,c=0;n.forEach(t=>{let n=Li(t);n&&Hi(n,e)&&(o+=1)}),r.forEach(t=>{let n=Li(t);if(!n||!Hi(n,e))return;let r=H(t,[`calories`,`kcal`,`totalCalories`,`caloriesTracked`,`value`]);s+=r||0}),i.forEach(t=>{let n=Li(t);if(!n||!Hi(n,e))return;let r=H(t,[`gallons`,`gallonsDrank`,`waterGallons`])??(()=>{let e=H(t,[`ounces`,`oz`,`waterOz`]);if(e!==null)return e/128;let n=H(t,[`ml`,`milliliters`]);return n===null?0:n/3785.41})();c+=r||0}),a.set(e,{requestedWindow:e,generatedAt:new Date().toISOString(),masterLogSheetUrl:t||``,usersUsingToday:U(0,t),totalUsersThisWeek:U(0,t),usersOnline:U(0,t),workoutsLogged:U(o,t),caloriesTracked:U(s,t),gallonsDrank:U(c,t)})}),a}function Gi(e){let t=e?.portal||e?.data?.portal||e?.data||e;if(!t||typeof t!=`object`)return null;let n=t.profile&&typeof t.profile==`object`?t.profile:{},r=t.membership&&typeof t.membership==`object`?t.membership:{},i=t.history&&typeof t.history==`object`?t.history:{},a=String(t.googleSheet||t.googleSheetUrl||``).trim()||Ui(n);return{contact:String(t.contact||n.contact||``).trim(),profile:n,membership:r,history:i,integrations:Array.isArray(t.integrations)?t.integrations:Array.isArray(t?.data?.integrations)?t.data.integrations:[],goals:(t.goals&&typeof t.goals==`object`?t.goals:{})||{},sheetUrl:a,billingStatus:String(r.status||n.stripeSubscriptionStatus||t.billingStatus||t.subscriptionStatus||``).trim(),billingPlan:String(r.plan||r.selectedPlan||n.stripePlanKey||t.plan||t.planName||``).trim(),billingLastPaymentDate:qo(t),billingNextBillingDate:Jo(t),billingPortalUrl:Xo(t)}}function Ki(e){if(e)try{let t=V()||{},n=ki({...t,canonical:t.canonical||e.contact||e.profile?.contact||``,username:t.username||e.profile?.username||``,email:t.email||e.profile?.primaryEmail||e.profile?.email||``,emailVerified:Ci(e.profile?.emailVerified??e.profile?.primaryEmailVerified??e.profile?.email_verified??e.profile?.verifiedEmail??e.profile?.isEmailVerified??e.emailVerified??e.primaryEmailVerified)??t.emailVerified,age:t.age||e.profile?.age||``,billingStatus:e.billingStatus||t.billingStatus||``,billingPlan:e.billingPlan||t.billingPlan||``,billingLastPaymentDate:e.billingLastPaymentDate||t.billingLastPaymentDate||``,billingNextBillingDate:e.billingNextBillingDate||t.billingNextBillingDate||``,sheetUrl:e.sheetUrl||t.sheetUrl||``});if(!n)return;window.localStorage.setItem(ni,JSON.stringify(n)),window.localStorage.setItem(ti,`true`)}catch{}}function qi(e){if(!e)return;z.backendSnapshot=e,e.billingPortalUrl&&(z.billingPortalUrl=e.billingPortalUrl),Ki(e),e.sheetUrl&&(z.userSheetUrl=e.sheetUrl),Array.isArray(e.integrations)&&e.integrations.length&&(z.availableIntegrations=e.integrations),Wi(e.history,e.sheetUrl).forEach((e,t)=>{(!z.metricsByRange.has(t)||G(z.metricsByRange.get(t)?.workoutsLogged)<=0)&&z.metricsByRange.set(t,e)}),!z.bodyMeasures.length&&Array.isArray(e.history?.bodyMetrics)&&(z.bodyMeasures=wo(e.history.bodyMetrics));let t=e.goals?.body&&typeof e.goals.body==`object`?e.goals.body:{};z.goals.weightGoal||(z.goals.weightGoal=String(t.targetWeight||t.weightGoal||e.profile?.currentWeight||``).trim()),z.goals.bodyFatGoal||(z.goals.bodyFatGoal=String(t.bodyFatGoal||t.targetBodyFat||``).trim()),z.goals.workoutPlan||(z.goals.workoutPlan=String(e.profile?.workoutSplit||e.profile?.goalSummary||``).trim());let n=z.metricsByRange.get(z.activeRange)||z.metricsByRange.get(`today`);n&&(Do(n,z.activeRange||`today`),Oo()),So()}async function Ji(){let e=Ii();if(!e)return null;let t=e?`?contact=${encodeURIComponent(e)}`:``,n=[`${s}/api/portal${t}`,`${s}/api/portal`,`${s}/api/account/portal${t}`,`${s}/api/user/profile${t}`,`/api/portal`];try{let e=Gi(await Ho(n));return e?(qi(e),da(),Vs(),_s(),Eo(),e):null}catch{return null}}function Yi(){let e=V();try{return window.localStorage.getItem(ti)===`true`&&!!(e?.accountId||e?.username||e?.email)}catch{return!1}}function Xi(){if(Ai(),Yi())return;let e=window.location.href||ui,t=`${ci}?next=${encodeURIComponent(e)}`;window.location.replace(t)}function Zi(e){return e===`phone`?`Phone OTP`:e===`email`?`Email OTP`:e===`username`?`Username OTP`:`Unknown`}function Qi(e){let t=String(e||``).trim().split(`@`)[0].replace(/[._-]+/g,` `).replace(/\s+/g,` `).trim();return t?t.split(` `).filter(Boolean).map(e=>e.charAt(0).toUpperCase()+e.slice(1)).join(` `):`there`}function $i(){let e=z.backendSnapshot?.profile||{},t=V()||{},n=Qi(e.firstName||e.name||e.username||e.canonical||t.username||t.canonical||e.email||t.email||``);return{displayName:n,initial:n===`there`?`A`:n.charAt(0).toUpperCase()}}function ea(){let{displayName:e,initial:t}=$i();R.aiGreetingName&&(R.aiGreetingName.textContent=e),R.aiUserAvatar&&(R.aiUserAvatar.textContent=t)}function ta(e){if(!e)return`Unknown`;let t=new Date(e);return Number.isNaN(t.getTime())?`Unknown`:t.toLocaleString()}function W(e,t=0){let n=Number(e||0);return Number.isFinite(n)?new Intl.NumberFormat(`en-US`,{minimumFractionDigits:t,maximumFractionDigits:t}).format(n):`0`}function G(e){return e&&typeof e==`object`&&`value`in e?Number(e.value||0):Number(e||0)}function na(e){let t=String(e||``).trim().toLowerCase();return hi.includes(t)?t:``}function ra(e){return R.navButtons.find(t=>t.dataset.tab===e)||null}function ia(e){let t=ra(e);return!!t&&!t.hidden}function aa(e){let t=new URLSearchParams(window.location.search);t.set(`view`,e);let n=t.toString(),r=`${window.location.pathname}${n?`?${n}`:``}`;window.history.replaceState({},``,r)}function oa(e,t=!0){let n=na(e)||`stats`;if(ia(n)||(n=`stats`),z.activeTab=n,R.navButtons.forEach(e=>{e.classList.toggle(`is-active`,e.dataset.tab===n)}),R.panels.forEach(e=>{let t=e.dataset.tabPanel===n;e.hidden=!t,e.classList.toggle(`is-active`,t)}),t&&aa(n),n===`stats`&&nc(),n===`calendar`){let e=document.getElementById(`calendarPanelBody`);e&&tr(e).catch(e=>console.warn(`calendar tab failed:`,e))}else if(n===`shortcuts`){let e=document.getElementById(`shortcutsPanelBody`);e&&Fr(e).catch(e=>console.warn(`shortcuts tab failed:`,e))}else if(n===`personal-trainer`){let e=document.getElementById(`personalTrainerPanelBody`);e&&jn(e).catch(e=>console.warn(`personal-trainer tab failed:`,e))}else if(n===`groups`){let e=document.getElementById(`groupsPanelBody`);e&&Mn(e).catch(e=>console.warn(`groups tab failed:`,e))}else if(n===`run-clubs`){let e=document.getElementById(`runClubsPanelBody`);e&&Nn(e).catch(e=>console.warn(`run-clubs tab failed:`,e))}}function sa(){R.navButtons.forEach(e=>{e.addEventListener(`click`,()=>{e.hidden||oa(e.dataset.tab)})})}function ca(e){R.accountEmailInput&&(R.accountEmailInput.value=e?.email||``),R.accountUsernameInput&&(R.accountUsernameInput.value=e?.username||``),R.accountAgeInput&&(R.accountAgeInput.value=e?.age||``)}function la(e=V()){let t=Ci(e?.emailVerified);if(t!==null)return t;let n=z.backendSnapshot?.profile||{};return Ci(n.emailVerified??n.primaryEmailVerified??n.email_verified??n.verifiedEmail??n.isEmailVerified??z.backendSnapshot?.emailVerified??z.backendSnapshot?.primaryEmailVerified)===!0}function ua(e=V()){let t=String(e?.email||``).trim(),n=la(e);if(R.verifyAccountEmailButton&&(R.verifyAccountEmailButton.hidden=!t||n,R.verifyAccountEmailButton.disabled=!t||n),R.accountEmailStatus&&t){let e=String(R.accountEmailStatus.textContent||``).trim();(!e||/email verified|email not verified|verify email/i.test(e))&&Z(R.accountEmailStatus,n?`Email verified.`:`Email not verified. Verify before applying as an affiliate.`,n?`is-success`:`is-error`)}}function da(){let e=V();ca(e),R.accountEmailValue&&(R.accountEmailValue.textContent=e?.email||`-`),R.accountUsernameValue&&(R.accountUsernameValue.textContent=e?.username||`-`),R.accountAgeValue&&(R.accountAgeValue.textContent=e?.age||`-`),R.accountIdValue&&(R.accountIdValue.textContent=e?.accountId||`-`),R.accountCanonicalValue&&(R.accountCanonicalValue.textContent=e?.canonical||`-`),R.accountMethodValue&&(R.accountMethodValue.textContent=Zi(e?.method||``)),R.accountContactValue&&(R.accountContactValue.textContent=e?.maskedCredential||`-`),R.accountLoginAtValue&&(R.accountLoginAtValue.textContent=ta(e?.loginAt||``)),R.billingStatusValue&&(R.billingStatusValue.textContent=e?.billingStatus||z.backendSnapshot?.billingStatus||`-`),R.billingPlanValue&&(R.billingPlanValue.textContent=e?.billingPlan||z.backendSnapshot?.billingPlan||`-`),R.billingLastPaymentValue&&(R.billingLastPaymentValue.textContent=Yo(e?.billingLastPaymentDate||z.backendSnapshot?.billingLastPaymentDate||``)||`-`),R.billingNextBillingValue&&(R.billingNextBillingValue.textContent=Yo(e?.billingNextBillingDate||z.backendSnapshot?.billingNextBillingDate||``)||`-`),R.affiliateTabBillingStatus&&(R.affiliateTabBillingStatus.textContent=e?.billingStatus||z.backendSnapshot?.billingStatus||`Unknown`),ua(e),$a(),ea(),oo()}function fa(e){let t=bi[e];return t?{input:t.input(),button:t.button(),status:t.status(),check:t.check()}:{input:null,button:null,status:null,check:null}}function pa(e){let{check:t}=fa(e);t&&(t.hidden=!0)}function ma(e){let{check:t}=fa(e);t&&(t.hidden=!1)}function K(e,t,n=``){let{status:r}=fa(e);Z(r,t,n)}function ha(e,t){let n=e?.profile||e?.data?.profile||e?.account||e?.user||e?.data?.account||e,r=n&&typeof n==`object`?n:{};return{email:String(r.email??r.primaryEmail??t.email??V()?.email??``).trim(),emailVerified:Ci(r.emailVerified??r.primaryEmailVerified??r.email_verified??r.verifiedEmail??r.isEmailVerified)??(t.email?!1:V()?.emailVerified),username:String(r.username??r.handle??t.username??V()?.username??``).trim(),age:String(r.age??t.age??V()?.age??``).trim(),canonical:String(r.canonical??r.contact??V()?.canonical??``).trim()}}function ga(e){let t=ki({...V()||{},...e});if(t){try{window.localStorage.setItem(ni,JSON.stringify(t)),window.localStorage.setItem(ti,`true`)}catch{}z.backendSnapshot?.profile&&typeof z.backendSnapshot.profile==`object`&&Object.assign(z.backendSnapshot.profile,e),e?.sheetUrl&&(z.userSheetUrl=String(e.sheetUrl).trim())}}function _a(e){let{input:t}=fa(e),n=String(t?.value||``).trim();return e===`email`?n.toLowerCase():e===`username`?n.replace(/^@/,``):n}function va(e,t){if(e===`email`)return t?B(t)?{ok:!0,value:t}:{ok:!1,message:`Enter a valid email address.`}:{ok:!0,value:``};if(e===`username`)return!t||!wi(t)?{ok:!1,message:`Enter a valid username.`}:{ok:!0,value:t};let n=String(t||``).trim();if(!n)return{ok:!0,value:``};let r=Number(n);return!Number.isFinite(r)||r<0||r>130?{ok:!1,message:`Enter a valid age.`}:{ok:!0,value:String(Math.round(r))}}async function ya(){let e=V()||{},t=String(R.accountEmailInput?.value||e.email||``).trim().toLowerCase();if(!B(t)){K(`email`,`Enter and save a valid email address first.`,`is-error`);return}if(String(e.email||``).trim().toLowerCase()!==t){K(`email`,`Save this email before sending verification.`,`is-error`);return}let n=Di({email:t,contact:e.canonical||e.credential||e.maskedCredential||t,username:e.username,accountId:e.accountId,canonical:e.canonical,returnUrl:Ha(`account`)});R.verifyAccountEmailButton&&(R.verifyAccountEmailButton.disabled=!0),K(`email`,`Sending verification email...`);try{let e=await $([`/api/account/email/verify`,`/api/account/verify-email`,`/api/user/email/verify`,`${s}/api/account/email/verify`,`${s}/api/account/verify-email`,`${s}/api/user/email/verify`],n);if(Ci(e?.emailVerified??e?.primaryEmailVerified??e?.verified??e?.profile?.emailVerified??e?.profile?.primaryEmailVerified)===!0){ga({email:t,emailVerified:!0}),da(),K(`email`,`Email verified.`,`is-success`);return}ga({email:t,emailVerified:!1}),ua(V()),K(`email`,`Verification email sent. Check your inbox.`,`is-success`)}catch(e){K(`email`,String(e?.message||`Could not send verification email.`),`is-error`)}finally{ua(V())}}async function ba(e){let t=V()||{},n=va(e,_a(e));if(!n.ok){pa(e),K(e,n.message,`is-error`);return}let r=n.value;if(r===String(t?.[e]||``).trim()){K(e,`Already up to date.`);return}let i={[e]:e===`age`?r?Number(r):null:r},{button:a}=fa(e);a&&(a.disabled=!0),pa(e),K(e,`Saving ${bi[e].label}...`);try{ga(ha(await $([`/api/account/profile`,`${s}/api/account/profile`,`/api/user/profile`,`${s}/api/user/profile`,`${s}/api/account/update-profile`],i),i)),da(),ma(e),e===`email`&&!la(V())?(K(e,`Email updated. Send verification before applying as an affiliate.`,`is-success`),Ga()):K(e,`${bi[e].label} updated.`,`is-success`)}catch(t){K(e,String(t?.message||`Profile update failed.`),`is-error`)}finally{a&&(a.disabled=!1)}}function xa(){Object.keys(bi).forEach(e=>{let{input:t,button:n,status:r}=fa(e);t&&(t.addEventListener(`input`,()=>{pa(e),e===`email`&&R.verifyAccountEmailButton&&(R.verifyAccountEmailButton.hidden=!0),r&&(r.textContent=``,r.classList.remove(`is-error`,`is-success`))}),t.addEventListener(`keydown`,t=>{t.key===`Enter`&&(t.preventDefault(),ba(e))})),n&&n.addEventListener(`click`,()=>{ba(e)})}),R.verifyAccountEmailButton&&R.verifyAccountEmailButton.addEventListener(`click`,()=>{ya()})}var Sa=!1,Ca=0,wa=!1;function Ta(){try{let e=window.localStorage.getItem(ii);if(!e)return null;let t=JSON.parse(e);return t&&typeof t==`object`?t:null}catch{return null}}function Ea(e){let t=b(e);if(!(!ne(t)&&!y(t)&&!te(t)&&!re(t)))try{window.localStorage.setItem(ii,JSON.stringify(e))}catch{}}function Da(){try{window.localStorage.removeItem(ii)}catch{}}function Oa(e,t){if(!(!e||typeof e!=`object`)){for(let n of t)if(e[n]!==void 0&&e[n]!==null&&e[n]!==``)return e[n]}}function ka(e,t,n=0){let r=Oa(e,t),i=Number(r);return Number.isFinite(i)?i:n}function Aa(e,t){let n=Oa(e,t);if(typeof n==`boolean`)return n;let r=String(n||``).trim().toLowerCase();return r===`true`||r===`1`||r===`yes`}function ja(e){let t=Number(e),n=Number.isFinite(t)?t:0;return new Intl.NumberFormat(`en-US`,{style:`currency`,currency:`USD`}).format(n/100)}function q(e,t,n=``){let r=Oa(e,t);return r==null?n:String(r).trim()}function Ma(e,t=`—`){let n=String(e||``).trim();return n?/^[A-Z0-9][A-Z0-9\s/+-]*$/.test(n)?n:n.replace(/[_-]+/g,` `).replace(/\s+/g,` `).trim().replace(/\b([a-z])/gi,e=>e.toUpperCase()):t}function Na(e){return ka(e?.counts,[`totalReferredSubscribers`,`signups`,`signupCount`,`totalSignups`,`leads`])}function Pa(e){return Yo(Oa(e,[`signedUpAt`,`signupAt`,`createdAt`,`joinedAt`,`date`,`timestamp`,`time`]))||`—`}function Fa(e){let t=q(e,[`status`,`billingStatus`,`subscriptionStatus`,`state`,`planStatus`]);return t?Ma(t):Aa(e,[`converted`,`qualified`,`isQualified`,`subscribed`,`paid`,`isPaidSubscriber`])?`Converted`:`Signup`}function Ia(e){return(Array.isArray(e?.referrals)?e.referrals:[]).map((e,t)=>{let n=q(e,[`name`,`fullName`,`displayName`]),r=q(e,[`username`,`handle`,`canonical`]),i=q(e,[`email`,`subscriberEmail`,`userEmail`,`contactEmail`]),a=q(e,[`phone`,`maskedPhone`,`phoneNumber`]),o=q(e,[`contact`,`accountId`,`userId`,`subscriberId`]),s=n||r||i||a||o||`Signup ${t+1}`,c=i||a||o||`—`;return c===s&&(c=a&&a!==s?a:`—`),{signedUp:Pa(e),subscriber:s,contact:c,plan:Ma(q(e,[`plan`,`planName`,`priceNickname`,`billingPlan`,`subscriptionPlan`,`tier`])),status:Fa(e)}})}function La(e){let t=g(e),n=e?.affiliate||{},r=q(n,[`accountId`,`affiliateId`,`id`]),i=q(n,[`email`]),a=q(n,[`username`,`handle`]),o=q(n,[`contact`,`phone`,`canonical`]);return[t,r||i||a||o].filter(Boolean).join(`|`)}function Ra(e,t={}){if(!R.affiliateReferralsRows||!R.affiliateReferralsStatus)return;let n=Ia(e),r=Math.max(Na(e),n.length);if(Q(R.affiliateReferralsRows),!n.length){let e=document.createElement(`tr`);e.className=`is-empty`;let n=document.createElement(`td`);n.colSpan=5;let i=t.loading?`Loading signup list...`:r>0?t.error?`Backend has signup totals but did not return the signup rows yet.`:`Waiting for signup rows from backend.`:`No signups yet — share your link to get started.`;n.textContent=i,e.appendChild(n),R.affiliateReferralsRows.appendChild(e),Z(R.affiliateReferralsStatus,i,t.error&&r>0?`is-error`:``);return}n.forEach(e=>{let t=document.createElement(`tr`);[e.signedUp,e.subscriber,e.contact,e.plan,e.status].forEach(e=>{let n=document.createElement(`td`);n.textContent=e||`—`,t.appendChild(n)}),R.affiliateReferralsRows.appendChild(t)});let i=r>n.length?`Showing ${n.length} of ${r} signups returned by backend.`:`Showing ${n.length} signup${n.length===1?``:`s`} returned by backend.`;Z(R.affiliateReferralsStatus,i)}async function za(e){if(!e)return;let t=La(e);if(!t||z.affiliateHistoryLoading||z.affiliateHistoryLoadedKey===t)return;let r=eo(e?.affiliate||{});if(!(r.contact||r.phone||r.email||r.username||r.accountId||r.canonical))return;let i=Ia(e).length>0;z.affiliateHistoryLoading=!0,i||Ra(e,{loading:!0});try{let e=await n({...r,refresh:1});if(z.affiliateHistoryLoadedKey=t,z.affiliateHistoryLoading=!1,e&&typeof e==`object`&&e.ok!==!1){X(Y(z.affiliateProfile,e));return}i||Ra(b(z.affiliateProfile),{error:!0})}catch{z.affiliateHistoryLoadedKey=t,z.affiliateHistoryLoading=!1,i||Ra(b(z.affiliateProfile),{error:!0})}}function Ba(){return String(z.billingPortalUrl||z.backendSnapshot?.billingPortalUrl||Xo(z.backendSnapshot||{})||``).trim()}function Va(){R.affiliateOpenBillingButton&&(R.affiliateOpenBillingButton.textContent=Ba()?`Open Stripe Billing`:`Open Billing Tab`)}function Ha(e=`affiliate`){let t=new URL(`/dashboard`,window.location.origin);return t.searchParams.set(`view`,na(e)||`affiliate`),t.toString()}function Ua(e){R.affiliateApplySuccess&&(R.affiliateApplySuccess.hidden=!e)}function Wa(){let e=V()||{};return String(e.email||``).trim()?la(e)?``:`Verify your account email before applying as an affiliate.`:`Add and verify an account email before applying as an affiliate.`}function Ga(){let e=Wa();return R.affiliateApplyButton&&(R.affiliateApplyButton.disabled=!!e),e}function Ka(){Ca&&=(window.clearTimeout(Ca),0)}function qa(e){return!e||!y(e)?!1:!m(e)||p(e)||!ie(e)}function Ja(e=mi){Ka(),Ca=window.setTimeout(()=>{so()},e)}function J(e,t=null){for(let n of e){let e=String(n||``).trim();if(!e)continue;let r=typeof t==`function`?t(e):e;if(r)return r}return``}function Ya(){let e=V()||{},t=z.backendSnapshot?.profile||{},n=b(z.affiliateProfile)?.affiliate||{},r=J([n.firstName,n.legalFirstName,t.firstName,e.firstName]),i=J([n.lastName,n.legalLastName,t.lastName,e.lastName]);return r||i?{firstName:r,lastName:i}:Oi(J([n.name,n.fullName,t.name,t.fullName,e.name]))}function Xa(e=b(z.affiliateProfile)){let t=V()||{},n=z.backendSnapshot?.profile||{},i=e?.affiliate||{},a=e?.agreement||{},o=r();return J([i.email,a.email,a.signerEmail,a.recipientEmail,n.primaryEmail,n.email,o.email,t.email,R.affiliateEmailInput?.value],e=>B(e)?e.toLowerCase():``)}function Za(e,t,n={}){let r=String(n.primaryLabel||`email address`).trim()||`email address`,i=String(e?.value||``).trim().toLowerCase(),a=String(t?.value||``).trim().toLowerCase();return e&&(e.value=i),t&&(t.value=a),B(i)?a?B(a)?i===a?{ok:!0,email:i}:{ok:!1,message:`The ${r} entries do not match.`}:{ok:!1,message:`Enter a valid confirmation email.`}:{ok:!1,message:`Confirm the ${r}.`}:{ok:!1,message:`Enter a valid ${r}.`}}function Qa(e=b(z.affiliateProfile)){let t=Xa(e);if(R.affiliateAgreementEmailInput&&!String(R.affiliateAgreementEmailInput.value||``).trim()&&(R.affiliateAgreementEmailInput.value=t),R.affiliateConfirmEmailInput&&R.affiliateAgreementConfirmEmailInput&&!String(R.affiliateAgreementConfirmEmailInput.value||``).trim()){let e=String(R.affiliateConfirmEmailInput.value||``).trim().toLowerCase();B(e)&&e===t&&(R.affiliateAgreementConfirmEmailInput.value=e)}}function $a(){let e=z.backendSnapshot?.profile||{},t=V()||{},n=r(),i=Ya();R.affiliateFirstNameInput&&!String(R.affiliateFirstNameInput.value||``).trim()&&(R.affiliateFirstNameInput.value=i.firstName||``),R.affiliateLastNameInput&&!String(R.affiliateLastNameInput.value||``).trim()&&(R.affiliateLastNameInput.value=i.lastName||``);let a=J([e.primaryEmail,e.email,n.email,t.email],e=>B(e)?e.toLowerCase():``);R.affiliateEmailInput&&!String(R.affiliateEmailInput.value||``).trim()&&(R.affiliateEmailInput.value=a),R.affiliateConfirmEmailInput&&!String(R.affiliateConfirmEmailInput.value||``).trim()&&B(String(R.affiliateConfirmEmailInput?.defaultValue||``))&&(R.affiliateConfirmEmailInput.value=String(R.affiliateConfirmEmailInput.defaultValue||``).trim().toLowerCase());let o=J([n.phone,n.contact,e.contact,t.credential,t.maskedCredential],e=>{let t=Ti(e);return t?Ei(t):``});R.affiliatePhoneInput&&!String(R.affiliatePhoneInput.value||``).trim()&&(R.affiliatePhoneInput.value=o),Qa(b(z.affiliateProfile))}function eo(e={}){let t=V()||{},n=z.backendSnapshot?.profile||{},i=b(z.affiliateProfile)?.affiliate||{},a=r(),o=Ya(),s=J([e.firstName,i.firstName,i.legalFirstName,o.firstName]),c=J([e.lastName,i.lastName,i.legalLastName,o.lastName]),l=J([e.name,i.name,i.fullName])||[s,c].filter(Boolean).join(` `).trim(),u=J([e.email,i.email,n.primaryEmail,n.email,a.email,t.email],e=>B(e)?e.toLowerCase():``),d=J([e.phone,i.phone,i.contact,a.phone,a.contact,n.contact,t.credential],Ti),f=J([e.username,i.username,a.username,t.username]),p=J([e.accountId,i.accountId,a.accountId,t.accountId]),m=J([e.canonical,i.canonical,a.canonical,t.canonical]);return Di({firstName:s,lastName:c,legalFirstName:s,legalLastName:c,name:l,email:u,phone:d,contact:J([e.contact,i.contact,a.contact,d,u,f,p,m]),username:f,accountId:p,canonical:m,source:String(e.source||`dashboard_affiliate_tab`).trim(),requestedAt:String(e.requestedAt||``).trim()||void 0,returnUrl:String(e.returnUrl||``).trim()||void 0,refreshUrl:String(e.refreshUrl||``).trim()||void 0,refresh:e.refresh})}function to(){let e=String(R.affiliateFirstNameInput?.value||``).trim(),t=String(R.affiliateLastNameInput?.value||``).trim(),n=Ti(String(R.affiliatePhoneInput?.value||``).trim()),r=Za(R.affiliateEmailInput,R.affiliateConfirmEmailInput,{primaryLabel:`affiliate email address`});if(!e)return{ok:!1,message:`Enter the affiliate's legal first name.`};if(!t)return{ok:!1,message:`Enter the affiliate's legal last name.`};if(!r.ok)return{ok:!1,message:r.message};if(!n)return{ok:!1,message:`Enter a valid affiliate phone number.`};let i=r.email;return R.affiliateEmailInput&&(R.affiliateEmailInput.value=i),R.affiliateConfirmEmailInput&&(R.affiliateConfirmEmailInput.defaultValue=i),R.affiliatePhoneInput&&(R.affiliatePhoneInput.value=Ei(n)),R.affiliateAgreementEmailInput&&(R.affiliateAgreementEmailInput.value=i),R.affiliateAgreementConfirmEmailInput&&(R.affiliateAgreementConfirmEmailInput.value=i),{ok:!0,payload:eo({firstName:e,lastName:t,email:i,phone:n,contact:n,source:`dashboard_affiliate_apply`,requestedAt:new Date().toISOString()})}}function Y(e,t,n=null){let r=e&&typeof e==`object`?e:{},i=t&&typeof t==`object`?t:{},a={...r.affiliate&&typeof r.affiliate==`object`?r.affiliate:{},...i.affiliate&&typeof i.affiliate==`object`?i.affiliate:{}},o={...r.stripe&&typeof r.stripe==`object`?r.stripe:{},...i.stripe&&typeof i.stripe==`object`?i.stripe:{}},s={...r.agreement&&typeof r.agreement==`object`?r.agreement:{},...i.agreement&&typeof i.agreement==`object`?i.agreement:{}};if(n&&typeof n==`object`){let e=String(n.source||``).trim().toLowerCase(),t=e===`dashboard_affiliate_apply`||e===`dashboard_affiliate_agreement`,r=String(n.name||``).trim()||[n.firstName,n.lastName].filter(Boolean).join(` `).trim();n.firstName&&(t||!a.firstName)&&(a.firstName=n.firstName),n.lastName&&(t||!a.lastName)&&(a.lastName=n.lastName),n.firstName&&(t||!a.legalFirstName)&&(a.legalFirstName=n.firstName),n.lastName&&(t||!a.legalLastName)&&(a.legalLastName=n.lastName),r&&(t||!a.name)&&(a.name=r),n.email&&(t||!a.email)&&(a.email=n.email),n.phone&&(t||!a.phone)&&(a.phone=n.phone),n.contact&&(t||!a.contact)&&(a.contact=n.contact),n.username&&!a.username&&(a.username=n.username),n.accountId&&!a.accountId&&(a.accountId=n.accountId),n.canonical&&!a.canonical&&(a.canonical=n.canonical),n.email&&(t||!s.email)&&(s.email=n.email)}let c={...r,...i};return Object.keys(a).length&&(c.affiliate=a),Object.keys(o).length&&(c.stripe=o),Object.keys(s).length&&(c.agreement=s),c}function no(){R.affiliateTabAgreementBox&&(R.affiliateTabAgreementBox.hidden=!0),R.affiliateAgreementHeading&&(R.affiliateAgreementHeading.textContent=`Affiliate Agreement Required`),R.affiliateAgreementMessage&&(R.affiliateAgreementMessage.textContent=`We emailed your affiliate agreement. Sign it before connecting Stripe.`),R.affiliateAgreementLink&&(R.affiliateAgreementLink.hidden=!0,R.affiliateAgreementLink.href=`#`),R.affiliateAgreementResendButton&&(R.affiliateAgreementResendButton.hidden=!0,R.affiliateAgreementResendButton.disabled=!1),Z(R.affiliateAgreementStatus,``)}function ro(e){let t=y(e),n=m(e),r=p(e),i=ie(e),a=String(te(e)||``).trim(),o=String(re(e)||``).trim();if(!t||n&&i&&!r)return no(),{required:t,signed:n,connectBlocked:r,canConnectStripe:i,signingUrl:a,message:o};R.affiliateTabAgreementBox&&(R.affiliateTabAgreementBox.hidden=!1),Qa(e);let s=Xa(e),c=`Affiliate Agreement Required`,l=o||`We emailed your affiliate agreement. Sign it before connecting Stripe.`,u=a?`Open the agreement, sign it, and this tab will refresh automatically.`:`Use Resend Agreement if you need a fresh signing link.`,d=``,f=!!a&&!n,h=!n||r;return n&&(!i||r)?(c=`Finalizing Affiliate Setup`,l=o||`Your agreement is signed. We are refreshing Stripe access now.`,u=`Checking agreement status...`,d=`is-success`,f=!1,h=!1):a||(u=s?`Confirm the email below and resend the agreement for a fresh signing link.`:`Enter and confirm your email below, then resend the agreement.`),R.affiliateAgreementHeading&&(R.affiliateAgreementHeading.textContent=c),R.affiliateAgreementMessage&&(R.affiliateAgreementMessage.textContent=l),R.affiliateAgreementLink&&(R.affiliateAgreementLink.hidden=!f,R.affiliateAgreementLink.href=f?a:`#`),R.affiliateAgreementResendButton&&(R.affiliateAgreementResendButton.hidden=!h,R.affiliateAgreementResendButton.disabled=!1),Z(R.affiliateAgreementStatus,u,d),{required:t,signed:n,connectBlocked:r,canConnectStripe:i,signingUrl:a,message:o}}function io(){Ka(),z.affiliateProfile=null,z.affiliateHistoryLoadedKey=``,z.affiliateHistoryLoading=!1,R.navAffiliate&&(R.navAffiliate.hidden=!1),R.affiliateTabMetrics&&(R.affiliateTabMetrics.hidden=!0),R.affiliateTabEmpty&&(R.affiliateTabEmpty.hidden=!1),R.affiliateApplyButton&&(R.affiliateApplyButton.disabled=!1),Ua(!1),Va(),no(),$a(),Ra(null);let e=Ga();R.affiliateTabEmptyStatus&&(R.affiliateTabEmptyStatus.classList.remove(`is-error`,`is-success`),e?(R.affiliateTabEmptyStatus.textContent=e,R.affiliateTabEmptyStatus.classList.add(`is-error`)):R.affiliateTabEmptyStatus.textContent=`Enter your legal details so we can send the affiliate agreement and unlock Stripe Connect once it is signed.`)}function X(e){let t=Y(z.affiliateProfile,e);z.affiliateProfile=t;let n=b(t),r=La(n);z.affiliateHistoryLoadedKey&&r&&z.affiliateHistoryLoadedKey!==r&&(z.affiliateHistoryLoadedKey=``);let i=n?.affiliate||t,a=n?.counts||i,o=n?.totals||i,s=ro(n),c=String(g(n)),l=String(_(n));R.navAffiliate&&(R.navAffiliate.hidden=!1),R.affiliateTabEmpty&&(R.affiliateTabEmpty.hidden=!0),R.affiliateTabMetrics&&(R.affiliateTabMetrics.hidden=!1),R.affiliateTabConnectButton&&(R.affiliateTabConnectButton.disabled=!1),Ua(!1),Va(),R.affiliateTabLinkInput&&(R.affiliateTabLinkInput.value=l||``),R.affiliateTabCode&&(R.affiliateTabCode.textContent=c||`—`),R.affiliateTabClicks&&(R.affiliateTabClicks.textContent=ka(a,[`clicks`,`clickCount`,`totalClicks`]).toLocaleString()),R.affiliateTabSignups&&(R.affiliateTabSignups.textContent=ka(a,[`totalReferredSubscribers`,`signups`,`signupCount`,`totalSignups`,`leads`]).toLocaleString()),R.affiliateTabConversions&&(R.affiliateTabConversions.textContent=ka(a,[`totalQualifiedSubscribers`,`conversions`,`conversionCount`,`paidConversions`,`subscribers`]).toLocaleString()),R.affiliateTabCalculated&&(R.affiliateTabCalculated.textContent=ja(ka(o,[`totalPayoutsCalculatedCents`,`calculatedCents`,`calculated_cents`,`calculated`]))),R.affiliateTabHeld&&(R.affiliateTabHeld.textContent=ja(ka(o,[`totalPayoutsHeldCents`,`heldCents`,`held_cents`,`held`]))),R.affiliateTabSent&&(R.affiliateTabSent.textContent=ja(ka(o,[`totalPayoutsSentCents`,`sentCents`,`sent_cents`,`sent`])));let u=String(ae(n)).toLowerCase(),d=h(n),f=ee(n);R.affiliateTabStripeStatus&&R.affiliateTabConnectButton&&(R.affiliateTabConnectButton.hidden=!1,R.affiliateTabConnectButton.disabled=!1,R.affiliateTabConnectButton.classList.remove(`btn-secondary`),R.affiliateTabConnectButton.classList.add(`btn-primary`),s.required&&(!s.signed||s.connectBlocked||!s.canConnectStripe)?(R.affiliateTabStripeStatus.textContent=s.signed?`Agreement signed. Waiting for Stripe Connect access to refresh.`:`Sign the affiliate agreement before connecting Stripe.`,R.affiliateTabConnectButton.hidden=!0):u===`active`||d&&f?(R.affiliateTabStripeStatus.textContent=`Stripe connected — you're eligible for payouts.`,R.affiliateTabConnectButton.textContent=`Manage Stripe account`,R.affiliateTabConnectButton.classList.remove(`btn-primary`),R.affiliateTabConnectButton.classList.add(`btn-secondary`)):u===`onboarding`||u===`pending`||u===`restricted`?(R.affiliateTabStripeStatus.textContent=`Stripe onboarding in progress. Finish setup to start receiving payouts.`,R.affiliateTabConnectButton.textContent=`Continue Stripe onboarding`):(R.affiliateTabStripeStatus.textContent=`Connect Stripe to receive your earnings.`,R.affiliateTabConnectButton.textContent=`Connect Stripe`)),R.affiliateTabConnectStatus&&(R.affiliateTabConnectStatus.textContent=``,R.affiliateTabConnectStatus.classList.remove(`is-error`,`is-success`)),Ra(n),qa(n)?(Ea(t),Ja()):(Ka(),Da()),za(n)}async function ao(t){if(t&&t.preventDefault(),!R.affiliateApplyButton)return;let n=R.affiliateApplyButton,r=R.affiliateTabEmptyStatus,i=Wa();if(i){Ga(),Z(r,i,`is-error`);return}let o=to();if(!o.ok){Z(r,o.message,`is-error`);return}let s=o.payload;if(!(s.accountId||s.canonical||s.username||s.email||s.phone)){Z(r,`Missing account identity. Log out and sign back in, then try again.`,`is-error`);return}n.disabled=!0,Ua(!1),Z(r,`Submitting affiliate application...`);try{let t=await e(s),n=Y(z.affiliateProfile,t,s);Ea(n),Ua(!0);let i=b(n);Z(r,y(i)&&!m(i)?`Agreement sent to ${s.email}. Open it to finish affiliate onboarding.`:`Affiliate profile confirmed.`,`is-success`),window.setTimeout(()=>{X(n)},280)}catch(e){let t=String(e?.message||`Couldn't submit affiliate application.`);if(/already.*affiliate|affiliate.*already|already exists|existing affiliate/i.test(t)){Ua(!0),Z(r,`Affiliate profile already exists. Loading your dashboard...`,`is-success`);try{let e=await a({...s,refresh:1});X(Y(z.affiliateProfile,e,s))}catch{}return}Z(r,t,`is-error`),n.disabled=!1}}async function oo(){if(Sa)return;Sa=!0;let e=Ta();try{let t=await a(eo(e?.affiliate||{})),n=b(t);if(t&&typeof t==`object`&&t.ok!==!1&&ne(n)){X(Y(e,t));return}}catch{}let t=b(e);if(e&&(ne(t)||y(t)||te(t)||re(t))){X(e);return}Da(),io()}async function so(){if(Ka(),wa||!qa(b(z.affiliateProfile)))return;let e=eo({refresh:1});if(e.contact||e.phone||e.email||e.username||e.accountId||e.canonical){wa=!0;try{let t=await a(e);t&&typeof t==`object`&&t.ok!==!1&&X(Y(z.affiliateProfile,t))}catch{qa(b(z.affiliateProfile))&&Ja()}finally{wa=!1,qa(b(z.affiliateProfile))&&!Ca&&Ja()}}}async function co(){if(!R.affiliateAgreementResendButton)return;let e=R.affiliateAgreementResendButton,t=Za(R.affiliateAgreementEmailInput,R.affiliateAgreementConfirmEmailInput,{primaryLabel:`agreement email address`});if(!t.ok){Z(R.affiliateAgreementStatus,t.message,`is-error`);return}let n=eo({email:t.email,contact:t.email,requestedAt:new Date().toISOString(),source:`dashboard_affiliate_agreement`});if(!(n.contact||n.phone||n.email||n.username||n.accountId||n.canonical)){Z(R.affiliateAgreementStatus,`Missing affiliate identity. Refresh and try again.`,`is-error`);return}e.disabled=!0,Z(R.affiliateAgreementStatus,`Sending a fresh agreement...`);try{let e=await i(n),t=Y(z.affiliateProfile,e,n);X(t),Ea(t);let r=te(b(t));Z(R.affiliateAgreementStatus,r?`Fresh agreement ready. Open it to continue.`:`Fresh agreement sent. Check your email.`,`is-success`)}catch(e){Z(R.affiliateAgreementStatus,String(e?.message||`Couldn't resend the agreement.`),`is-error`)}finally{e.disabled=!1}}async function lo(){if(!R.affiliateTabConnectButton)return;let e=R.affiliateTabConnectButton,t=R.affiliateTabConnectStatus,n=b(z.affiliateProfile);if(y(n)&&(!m(n)||p(n)||!ie(n))){Z(t,re(n)||`Sign the affiliate agreement before connecting Stripe.`,`is-error`);return}e.disabled=!0,t&&(t.textContent=`Requesting a fresh Stripe link...`,t.classList.remove(`is-error`,`is-success`));let r=Ha(`affiliate`);try{let n=await o(eo({returnUrl:r,refreshUrl:r})),i=Y(z.affiliateProfile,n),a=b(i);if(X(i),y(a)&&(!m(a)||p(a)||!ie(a))){Z(t,re(a)||`Affiliate agreement required before connecting Stripe.`,`is-error`),e.disabled=!1;return}let s=String(v(a)||n?.onboardingUrl||n?.accountLinkUrl||n?.redirectUrl||n?.dashboardUrl||n?.loginUrl||n?.manageUrl||n?.managementUrl||``).trim();if(!s)throw Error(`Stripe did not return an onboarding link.`);window.location.assign(s)}catch(n){t&&(t.textContent=String(n?.message||`Couldn't start Stripe onboarding.`),t.classList.add(`is-error`)),e.disabled=!1}}function Z(e,t,n=``){e&&(e.textContent=t,e.classList.remove(`is-error`,`is-success`),n&&e.classList.add(n))}function uo(e){R.statsRangeButtons.forEach(t=>{t.classList.toggle(`is-active`,t.dataset.range===e)})}function Q(e){e&&(e.innerHTML=``)}function fo(e,t=0,n=``){return`${W(e,t)} ${n}`.trim()}function po(e){let t=String(e?.id||``).trim();return t===`chartNutritionRows`?{stroke:`#ffb65a`,fill:`rgba(255, 182, 90, 0.18)`,dot:`#ffd59b`}:t===`chartWaterRows`?{stroke:`#59b9ff`,fill:`rgba(89, 185, 255, 0.18)`,dot:`#9bd8ff`}:t===`chartCombinedRows`?{stroke:`#8d78ff`,fill:`rgba(141, 120, 255, 0.18)`,dot:`#c0afff`}:{stroke:`#39d9c0`,fill:`rgba(57, 217, 192, 0.18)`,dot:`#8af1e1`}}function mo(e){return e.map((e,t)=>`${t===0?`M`:`L`} ${e.x} ${e.y}`).join(` `)}function ho(e,t){return e.length?[`M ${e[0].x} ${t}`,...e.map((e,t)=>`L ${e.x} ${e.y}`),`L ${e[e.length-1].x} ${t}`,`Z`].join(` `):``}function go(e,t,n){let r=document.createElement(`div`);r.className=`trend-chart-stat`;let i=document.createElement(`span`);i.className=`trend-chart-stat-label`,i.textContent=t;let a=document.createElement(`strong`);a.className=`trend-chart-stat-value`,a.textContent=n,r.appendChild(i),r.appendChild(a),e.appendChild(r)}function _o(e,t,n,r=0){if(!e)return;Q(e);let i=Array.isArray(n)?n.map(e=>({rangeId:e.rangeId,value:Number(e.value||0)})):[];if(!i.length)return;let a=po(e),o=document.createElement(`div`);o.className=`trend-chart`,o.style.setProperty(`--trend-stroke`,a.stroke),o.style.setProperty(`--trend-fill`,a.fill),o.style.setProperty(`--trend-dot`,a.dot);let s=document.createElement(`div`);s.className=`trend-chart-summary`;let c=i.reduce((e,t)=>t.value>e.value?t:e,i[0]),l=i.reduce((e,t)=>e+t.value,0)/i.length;go(s,`Peak`,fo(c.value,r,t)),go(s,`Average`,fo(l,r,t)),o.appendChild(s);let u=Math.max(...i.map(e=>Math.max(e.value,0)),1),d=Math.min(...i.map(e=>Math.min(e.value,0)),0),f=Math.max(u-d,1),p=i.map((e,t)=>{let n=i.length===1?320/2:18+284*t/(i.length-1),r=148-(e.value-d)/f*132;return{...e,x:n,y:r}}),m=document.createElementNS(`http://www.w3.org/2000/svg`,`svg`);m.setAttribute(`viewBox`,`0 0 320 164`),m.setAttribute(`class`,`trend-chart-svg`),m.setAttribute(`role`,`img`),m.setAttribute(`aria-label`,`Trend chart`);for(let e=0;e<4;e+=1){let t=16+132*e/3,n=document.createElementNS(`http://www.w3.org/2000/svg`,`line`);n.setAttribute(`x1`,`18`),n.setAttribute(`x2`,`302`),n.setAttribute(`y1`,String(t)),n.setAttribute(`y2`,String(t)),n.setAttribute(`class`,`trend-chart-gridline`),m.appendChild(n)}let h=document.createElementNS(`http://www.w3.org/2000/svg`,`path`);h.setAttribute(`d`,ho(p,148)),h.setAttribute(`class`,`trend-chart-area`),m.appendChild(h);let g=document.createElementNS(`http://www.w3.org/2000/svg`,`path`);g.setAttribute(`d`,mo(p)),g.setAttribute(`class`,`trend-chart-line`),m.appendChild(g),p.forEach(e=>{let n=document.createElementNS(`http://www.w3.org/2000/svg`,`circle`);n.setAttribute(`cx`,String(e.x)),n.setAttribute(`cy`,String(e.y)),n.setAttribute(`r`,`4`),n.setAttribute(`class`,`trend-chart-point`);let i=document.createElementNS(`http://www.w3.org/2000/svg`,`title`);i.textContent=`${_i[e.rangeId]||e.rangeId.toUpperCase()}: ${fo(e.value,r,t)}`,n.appendChild(i),m.appendChild(n)}),o.appendChild(m);let _=document.createElement(`div`);_.className=`trend-chart-axis`,i.forEach(e=>{let n=document.createElement(`div`);n.className=`trend-chart-chip`;let i=document.createElement(`span`);i.className=`trend-chart-chip-label`,i.textContent=_i[e.rangeId]||e.rangeId.toUpperCase();let a=document.createElement(`span`);a.className=`trend-chart-chip-value`,a.textContent=fo(e.value,r,t),n.appendChild(i),n.appendChild(a),_.appendChild(n)}),o.appendChild(_),e.appendChild(o)}function vo(){if(!R.chartCombinedRows)return;let e=gi.map(e=>{let t=z.metricsByRange.get(e)||null,n=G(t?.workoutsLogged),r=G(t?.caloriesTracked),i=G(t?.gallonsDrank),a=r/100,o=i*10,s=(n+a+o)/3;return{rangeId:e,value:Math.max(s,0)}});_o(R.chartCombinedRows,`score`,e,1)}function yo(e){return new Date(e.getFullYear(),e.getMonth(),e.getDate())}function bo(e){let t=Li(e);return!(t instanceof Date)||Number.isNaN(t.getTime())?``:yo(t).toISOString().slice(0,10)}function xo(e,t,n){if(!e)return;Q(e);let r=Array.isArray(t)?t:[];if(!r.length){let t=document.createElement(`p`);t.className=`stats-status`,t.textContent=n,e.appendChild(t);return}let i=new Map;r.forEach(e=>{let t=bo(e);t&&i.set(t,(i.get(t)||0)+1)});let a=yo(new Date),o=[];for(let e=83;e>=0;--e){let t=new Date(a);t.setDate(a.getDate()-e),o.push(t)}let s=Math.max(1,...o.map(e=>i.get(e.toISOString().slice(0,10))||0));o.forEach(t=>{let n=t.toISOString().slice(0,10),r=i.get(n)||0,a=0;r>0&&(a=Math.min(4,Math.max(1,Math.ceil(r/s*4))));let o=document.createElement(`div`);o.className=`heatmap-cell`,o.dataset.level=String(a),o.title=`${n}: ${r}`,e.appendChild(o)})}function So(){let e=z.backendSnapshot?.history||{};xo(R.workoutHeatmap,e.workouts,`Workout history unavailable from backend.`),xo(R.nutritionHeatmap,e.nutrition,`Nutrition history unavailable from backend.`),xo(R.waterHeatmap,e.water,`Water history unavailable from backend.`)}function Co(e,t,n,r){let i=new Date(`${n}T00:00:00`),a=new Date(`${r}T23:59:59.999`);if(Number.isNaN(i.getTime())||Number.isNaN(a.getTime()))return null;let o=0,s=0,c=0,l=Array.isArray(e?.workouts)?e.workouts:[],u=Array.isArray(e?.nutrition)?e.nutrition:[],d=Array.isArray(e?.water)?e.water:[];return l.forEach(e=>{let t=Li(e);t&&t>=i&&t<=a&&(o+=1)}),u.forEach(e=>{let t=Li(e);if(!t||t<i||t>a)return;let n=H(e,[`calories`,`kcal`,`totalCalories`,`caloriesTracked`,`value`]);s+=n||0}),d.forEach(e=>{let t=Li(e);if(!t||t<i||t>a)return;let n=H(e,[`gallons`,`gallonsDrank`,`waterGallons`])??(()=>{let t=H(e,[`ounces`,`oz`,`waterOz`]);if(t!==null)return t/128;let n=H(e,[`ml`,`milliliters`]);return n===null?0:n/3785.41})();c+=n||0}),{requestedWindow:`custom`,generatedAt:new Date().toISOString(),masterLogSheetUrl:t||z.currentSheetUrl||``,usersUsingToday:U(0,t),totalUsersThisWeek:U(0,t),usersOnline:U(0,t),workoutsLogged:U(o,t),caloriesTracked:U(s,t),gallonsDrank:U(c,t)}}function wo(e){let t=Array.isArray(e)?e:e?.measurements||e?.entries||e?.data?.measurements||e?.data?.entries||e?.bodyMeasures||[];return Array.isArray(t)?t.map(e=>({date:String(e?.date||e?.recordedAt||e?.createdAt||``).trim(),weight:Number(e?.weight??e?.weightLb??e?.bodyWeight??NaN),bodyFat:Number(e?.bodyFat??e?.bodyFatPct??NaN),waist:Number(e?.waist??e?.waistIn??NaN),glute:Number(e?.glute??e?.hips??e?.hipIn??NaN)})).filter(e=>e.date||[e.weight,e.bodyFat,e.waist,e.glute].some(Number.isFinite)).sort((e,t)=>String(e.date).localeCompare(String(t.date))):[]}async function To(){let e=[`/api/body-measures`,`/api/account/body-measures`,`${s}/api/body-measures`];for(let t of e)try{let e=await Pi(t),n=null;try{n=await e.json()}catch{n=null}if(!e.ok||n&&typeof n==`object`&&`ok`in n&&!n.ok)throw Error(n?.error||n?.message||`Body measures request failed (${e.status})`);return wo(n)}catch(e){Ni(e)}return[]}function Eo(){if(!R.bodyMeasureRows)return;Q(R.bodyMeasureRows);let e=z.bodyMeasures;if(!e.length){let e=document.createElement(`p`);e.className=`stats-status`,e.textContent=`Body measures unavailable from backend.`,R.bodyMeasureRows.appendChild(e);return}let t=e[e.length-1],n=e[0];[{key:`weight`,label:`Weight`,unit:`lb`},{key:`bodyFat`,label:`Body Fat`,unit:`%`},{key:`waist`,label:`Waist`,unit:`in`},{key:`glute`,label:`Glute/Hips`,unit:`in`}].forEach(e=>{let r=Number(t?.[e.key]),i=Number(n?.[e.key]);if(!Number.isFinite(r)&&!Number.isFinite(i))return;let a=Number.isFinite(r)&&Number.isFinite(i)?r-i:null,o=document.createElement(`div`);o.className=`measure-row`;let s=document.createElement(`span`);s.textContent=`${e.label}: ${Number.isFinite(r)?W(r,1):`-`} ${e.unit}`;let c=document.createElement(`span`);a===null?c.textContent=`delta -`:c.textContent=`delta ${a>0?`+`:``}${W(a,1)} ${e.unit}`,o.appendChild(s),o.appendChild(c),R.bodyMeasureRows.appendChild(o)})}function Do(e,t,n=``){let r=G(e?.workoutsLogged),i=G(e?.caloriesTracked),a=G(e?.gallonsDrank);if(R.statsWorkoutsValue&&(R.statsWorkoutsValue.textContent=W(r)),R.statsCaloriesValue&&(R.statsCaloriesValue.textContent=W(i)),R.statsGallonsValue&&(R.statsGallonsValue.textContent=W(a,1)),R.statsWindowLabel){let e=n||_i[t]||t.toUpperCase();R.statsWindowLabel.textContent=`Range: ${e}`}R.statsGeneratedAtValue&&(R.statsGeneratedAtValue.textContent=e?.generatedAt?ta(e.generatedAt):`Unknown`);let o=e?.masterLogSheetUrl||e?.sheetUrl||e?.workoutsLogged?.sheetUrl||z.currentSheetUrl||``;o&&(z.currentSheetUrl=o),R.statsSheetLink&&(R.statsSheetLink.href=o||`#`),Vs()}function Oo(){let e=gi.map(e=>({rangeId:e,value:G(z.metricsByRange.get(e)?.workoutsLogged)})),t=gi.map(e=>({rangeId:e,value:G(z.metricsByRange.get(e)?.caloriesTracked)})),n=gi.map(e=>({rangeId:e,value:G(z.metricsByRange.get(e)?.gallonsDrank)}));_o(R.chartWorkoutsRows,``,e,0),_o(R.chartNutritionRows,``,t,0),_o(R.chartWaterRows,``,n,1),vo(),Eo()}async function ko(){z.metricsByRange.size>=gi.length||z.backendSnapshot&&Wi(z.backendSnapshot?.history||{},z.backendSnapshot?.sheetUrl||z.userSheetUrl||``).forEach((e,t)=>{z.metricsByRange.set(t,e)})}function Ao(e){let t=e?.data&&typeof e.data==`object`?e.data:e,n=Number(t?.workoutsLogged??t?.workouts??t?.metrics?.workoutsLogged??t?.metrics?.workouts??NaN),r=Number(t?.caloriesTracked??t?.calories??t?.metrics?.caloriesTracked??t?.metrics?.calories??NaN),i=Number(t?.gallonsDrank??t?.waterGallons??t?.metrics?.gallonsDrank??t?.metrics?.waterGallons??NaN),a=Number(t?.usersActive??t?.activeUsers??t?.users??t?.metrics?.usersActive??NaN);if(![n,r,i,a].some(Number.isFinite))return null;let o=String(t?.sheetUrl||t?.masterLogSheetUrl||``).trim()||null;return{requestedWindow:`custom`,generatedAt:t?.generatedAt||new Date().toISOString(),masterLogSheetUrl:o,workoutsLogged:{value:Number.isFinite(n)?n:0,sheetUrl:o},caloriesTracked:{value:Number.isFinite(r)?r:0,sheetUrl:o},gallonsDrank:{value:Number.isFinite(i)?i:0,sheetUrl:o},usersUsingToday:{value:Number.isFinite(a)?a:0,sheetUrl:o}}}async function jo(e,t){if(z.backendSnapshot?.history){let n=Co(z.backendSnapshot.history,z.backendSnapshot.sheetUrl||z.userSheetUrl||``,e,t);if(n)return n}let n=new URLSearchParams({from:e,to:t}).toString(),r=[`/api/stats/range?${n}`,`/api/dashboard/stats/range?${n}`,`${s}/api/stats/range?${n}`],i=null;for(let e of r)try{let t=await Pi(e),n=null;try{n=await t.json()}catch{n=null}if(!t.ok||n&&typeof n==`object`&&`ok`in n&&!n.ok)throw Error(n?.error||n?.message||`Range request failed (${t.status})`);let r=Ao(n);if(!r)throw Error(`Range endpoint returned no usable metrics.`);return r}catch(e){i=Ni(e)}throw i||Error(`Custom range endpoint is unavailable.`)}async function Mo(e){z.activeRange=e,uo(e),Z(R.statsRangeStatus,`Loading stats...`);try{await ko();let t=z.metricsByRange.get(e);if(!t)throw Error(`User-specific stats are unavailable from backend.`);Do(t,e),Oo(),Z(R.statsRangeStatus,`Loaded ${_i[e]} stats.`,`is-success`)}catch(e){Z(R.statsRangeStatus,String(e?.message||`Unable to load stats.`),`is-error`)}}async function No(){let e=String(R.statsFromDate?.value||``).trim(),t=String(R.statsToDate?.value||``).trim();if(!e||!t){Z(R.statsRangeStatus,`Select both From and To dates.`,`is-error`);return}if(e>t){Z(R.statsRangeStatus,`From date must be before To date.`,`is-error`);return}z.activeRange=`custom`,uo(``),Z(R.statsRangeStatus,`Loading custom range...`);try{Do(await jo(e,t),`custom`,`${e} to ${t}`),Z(R.statsRangeStatus,`Loaded custom range ${e} to ${t}.`,`is-success`)}catch(e){Z(R.statsRangeStatus,String(e?.message||`Custom range unavailable.`),`is-error`)}}function Po(){R.statsRangeButtons.forEach(e=>{e.addEventListener(`click`,()=>{Mo(e.dataset.range)})}),R.applyCustomRangeButton&&R.applyCustomRangeButton.addEventListener(`click`,()=>{No()})}function Fo(e){let t=e?.data&&typeof e.data==`object`?e.data:e,n=Number(t?.rank??t?.leaderboardRank??t?.position??NaN);return Number.isFinite(n)?Math.max(1,Math.round(n)):null}async function Io(){let e=V(),n=e?.username||e?.canonical||e?.accountId||``;if(!n)return null;let r=new URLSearchParams({user:n}).toString(),i=[`/api/leaderboard/rank?${r}`,`/api/stats/rank?${r}`,`${s}/api/leaderboard/rank?${r}`];for(let e of i)try{let t=await Pi(e),n=null;try{n=await t.json()}catch{n=null}if(!t.ok||n&&typeof n==`object`&&`ok`in n&&!n.ok)continue;let r=Fo(n);if(r)return r}catch{}try{let n=await t(),r=[];(n?.entries||[]).forEach((e,t)=>{r.push({name:String(e?.name||``).toLowerCase(),rank:t+1})}),(n?.groupEntries||[]).forEach((e,t)=>{r.push({name:String(e?.name||``).toLowerCase(),rank:t+1})});let i=[e?.username,e?.canonical,e?.email].map(e=>String(e||``).toLowerCase()).filter(Boolean);for(let e of i){let t=r.find(t=>t.name&&(t.name===e||t.name.includes(e)));if(t)return t.rank}}catch{}return null}async function Lo(){R.leaderboardLink&&(R.leaderboardLink.href=di),R.leaderboardRankValue&&(R.leaderboardRankValue.textContent=`Loading...`);let e=await Io();z.leaderboardRank=e,R.leaderboardRankValue&&(R.leaderboardRankValue.textContent=e?`#${e}`:`Unranked`)}function Ro(){let e=V(),t={};return z.metricsByRange.forEach((e,n)=>{t[n]={workoutsLogged:G(e?.workoutsLogged),caloriesTracked:G(e?.caloriesTracked),gallonsDrank:G(e?.gallonsDrank),usersActive:G(e?.usersUsingToday),generatedAt:e?.generatedAt||null}}),{exportedAt:new Date().toISOString(),profile:e,goals:z.goals,statsByRange:t,bodyMeasures:z.bodyMeasures,leaderboardRank:z.leaderboardRank}}function zo(e,t,n){let r=new Blob([t],{type:n}),i=URL.createObjectURL(r),a=document.createElement(`a`);a.href=i,a.download=e,document.body.appendChild(a),a.click(),a.remove(),URL.revokeObjectURL(i)}function Bo(e){let t=[];return t.push(`section,key,value`),Object.entries(e.profile||{}).forEach(([e,n])=>{t.push(`profile,${e},"${String(n??``).replaceAll(`"`,`""`)}"`)}),Object.entries(e.goals||{}).forEach(([e,n])=>{t.push(`goals,${e},"${String(n??``).replaceAll(`"`,`""`)}"`)}),Object.entries(e.statsByRange||{}).forEach(([e,n])=>{Object.entries(n||{}).forEach(([n,r])=>{t.push(`stats_${e},${n},"${String(r??``).replaceAll(`"`,`""`)}"`)})}),(e.bodyMeasures||[]).forEach((e,n)=>{t.push(`body_measure_${n+1},date,"${String(e.date||``).replaceAll(`"`,`""`)}"`),t.push(`body_measure_${n+1},weight,"${String(e.weight??``).replaceAll(`"`,`""`)}"`),t.push(`body_measure_${n+1},bodyFat,"${String(e.bodyFat??``).replaceAll(`"`,`""`)}"`),t.push(`body_measure_${n+1},waist,"${String(e.waist??``).replaceAll(`"`,`""`)}"`),t.push(`body_measure_${n+1},glute,"${String(e.glute??``).replaceAll(`"`,`""`)}"`)}),t.join(`
`)}function Vo(){R.exportCsvButton&&R.exportCsvButton.addEventListener(`click`,()=>{let e=Bo(Ro());zo(`tracker-export-${Date.now()}.csv`,e,`text/csv;charset=utf-8`),Z(R.exportStatus,`CSV exported.`,`is-success`)}),R.exportJsonButton&&R.exportJsonButton.addEventListener(`click`,()=>{let e=Ro(),t=JSON.stringify(e,null,2);zo(`tracker-export-${Date.now()}.json`,t,`application/json;charset=utf-8`),Z(R.exportStatus,`JSON exported.`,`is-success`)})}async function $(e,t){let n=null;for(let r of e)try{let e=await Pi(r,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify(t)}),n=null;try{n=await e.json()}catch{n=null}if(!e.ok||n&&typeof n==`object`&&`ok`in n&&!n.ok)throw Error(n?.error||n?.message||`Request failed (${e.status})`);return n}catch(e){n=Ni(e)}throw n||Error(`Request failed.`)}async function Ho(e){let t=null;for(let n of e)try{let e=await Pi(n,{method:`GET`}),t=null;try{t=await e.json()}catch{t=null}if(!e.ok||t&&typeof t==`object`&&`ok`in t&&!t.ok)throw Error(t?.error||t?.message||`Request failed (${e.status})`);return t}catch(e){t=Ni(e)}throw t||Error(`Request failed.`)}function Uo(e){let t=[e?.membership?.status,e?.billing?.status,e?.billing?.subscriptionStatus,e?.profile?.stripeSubscriptionStatus,e?.billingStatus,e?.subscriptionStatus,e?.status,e?.subscription?.status,e?.portal?.membership?.status,e?.portal?.billing?.status,e?.portal?.billingStatus,e?.portal?.subscriptionStatus,e?.portal?.status,e?.portal?.subscription?.status,e?.data?.billingStatus,e?.data?.subscriptionStatus,e?.data?.status,e?.data?.subscription?.status];for(let e of t){let t=String(e||``).trim();if(t)return t}return``}function Wo(e){let t=[e?.membership?.plan,e?.membership?.planName,e?.membership?.selectedPlan,e?.billing?.plan,e?.billing?.selectedPlan,e?.profile?.stripePlanKey,e?.plan,e?.planName,e?.priceNickname,e?.subscription?.plan,e?.subscription?.priceNickname,e?.subscription?.interval,e?.portal?.membership?.plan,e?.portal?.billing?.plan,e?.portal?.plan,e?.portal?.planName,e?.portal?.priceNickname,e?.portal?.subscription?.plan,e?.portal?.subscription?.priceNickname,e?.portal?.subscription?.interval,e?.data?.plan,e?.data?.planName,e?.data?.priceNickname];for(let e of t){let t=String(e||``).trim();if(t)return t}return``}function Go(e){let t=[e?.cancelAtPeriodEnd,e?.profile?.stripeCancelAtPeriodEnd,e?.membership?.stripeCancelAtPeriodEnd,e?.billing?.cancelAtPeriodEnd,e?.subscription?.cancelAtPeriodEnd,e?.subscription?.cancel_at_period_end,e?.portal?.cancelAtPeriodEnd];for(let e of t)if(e===!0||e===!1)return e;return null}function Ko(e){let t=[e?.currentPeriodEnd,e?.profile?.stripeCurrentPeriodEnd,e?.membership?.stripeCurrentPeriodEnd,e?.membership?.trialEnd,e?.membership?.nextBillingDate,e?.subscription?.currentPeriodEnd,e?.subscription?.current_period_end];for(let e of t){let t=String(e||``).trim();if(t)return t}return``}function qo(e){let t=[e?.lastPaymentDate,e?.lastPaymentAt,e?.latestPaymentDate,e?.latestInvoicePaidAt,e?.lastInvoicePaidAt,e?.membership?.lastPaymentDate,e?.membership?.lastPaymentAt,e?.membership?.latestPaymentDate,e?.membership?.latestInvoicePaidAt,e?.membership?.lastInvoicePaidAt,e?.billing?.lastPaymentDate,e?.billing?.lastPaymentAt,e?.billing?.latestPaymentDate,e?.billing?.latestInvoicePaidAt,e?.billing?.lastInvoicePaidAt,e?.subscription?.lastPaymentDate,e?.subscription?.lastPaymentAt,e?.subscription?.latestInvoicePaidAt,e?.subscription?.lastInvoicePaidAt,e?.portal?.lastPaymentDate,e?.portal?.lastPaymentAt,e?.portal?.membership?.lastPaymentDate,e?.portal?.membership?.latestInvoicePaidAt,e?.portal?.billing?.lastPaymentDate,e?.portal?.billing?.latestInvoicePaidAt,e?.data?.lastPaymentDate,e?.data?.lastPaymentAt,e?.data?.latestInvoicePaidAt];for(let e of t){let t=String(e||``).trim();if(t)return t}return``}function Jo(e){let t=Ko(e);if(t)return t;let n=[e?.nextBillingDate,e?.nextInvoiceDate,e?.nextChargeDate,e?.membership?.nextBillingDate,e?.membership?.nextInvoiceDate,e?.membership?.nextChargeDate,e?.billing?.nextBillingDate,e?.billing?.nextInvoiceDate,e?.subscription?.nextBillingDate,e?.subscription?.nextInvoiceDate,e?.subscription?.current_period_end,e?.portal?.nextBillingDate,e?.portal?.membership?.nextBillingDate,e?.portal?.billing?.nextBillingDate,e?.data?.nextBillingDate,e?.data?.nextInvoiceDate];for(let e of n){let t=String(e||``).trim();if(t)return t}return``}function Yo(e){if(e==null||e===``)return``;if(e instanceof Date&&!Number.isNaN(e.getTime()))return e.toLocaleDateString();let t=Number(e);if(Number.isFinite(t)&&/^\d+$/.test(String(e).trim())){let e=t>0xe8d4a51000?t:t*1e3,n=new Date(e);if(!Number.isNaN(n.getTime()))return n.toLocaleDateString()}if(/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(String(e)))return e;let n=new Date(e);return Number.isNaN(n.getTime())?e:n.toLocaleDateString()}function Xo(e){let t=[e?.stripeBillingUrl,e?.billingPortalUrl,e?.portalUrl,e?.manageUrl,e?.url,e?.membership?.stripeBillingUrl,e?.membership?.billingPortalUrl,e?.membership?.portalUrl,e?.membership?.manageUrl,e?.profile?.stripeBillingUrl,e?.profile?.billingPortalUrl,e?.profile?.portalUrl,e?.profile?.manageUrl,e?.portal?.stripeBillingUrl,e?.portal?.billingPortalUrl,e?.portal?.portalUrl,e?.portal?.manageUrl,e?.portal?.url,e?.data?.stripeBillingUrl,e?.data?.billingPortalUrl,e?.data?.portalUrl,e?.data?.manageUrl,e?.data?.url];for(let e of t){let t=String(e||``).trim();if(t)return t}return``}function Zo(e,t=``,n=``,r=``){let i=String(e||``).trim(),a=String(t||``).trim(),o=String(n||``).trim(),s=String(r||``).trim();if(!(!i&&!a&&!o&&!s))try{let e=V();if(!e)return;i&&(e.billingStatus=i),a&&(e.billingPlan=a),e.billingLastPaymentDate=o,e.billingNextBillingDate=s,window.localStorage.setItem(ni,JSON.stringify(e)),window.localStorage.setItem(ti,`true`)}catch{}}function Qo(e){let t=Uo(e),n=Wo(e),r=Xo(e),i=Go(e),a=Ko(e),o=qo(e),s=Jo(e);if(t&&R.billingStatusValue&&(R.billingStatusValue.textContent=t),n&&R.billingPlanValue&&(R.billingPlanValue.textContent=n),R.billingLastPaymentValue&&(R.billingLastPaymentValue.textContent=Yo(o)||`-`),R.billingNextBillingValue&&(R.billingNextBillingValue.textContent=Yo(s)||`-`),R.billingManageLink){let e=!!r;R.billingManageLink.hidden=!e,R.billingManageLink.href=e?r:`#`}z.billingPortalUrl=r||z.billingPortalUrl||``,Va();let c=String(t||``).toLowerCase(),l=c===`active`||c===`trialing`||c===`past_due`,u=i===!0&&l;if(R.billingCancelNotice)if(u){let e=Yo(a);R.billingCancelNotice.textContent=e?`Subscription is set to cancel on ${e}. Resume any time before then to keep your plan.`:`Subscription is set to cancel at the end of the current period.`,R.billingCancelNotice.hidden=!1}else R.billingCancelNotice.hidden=!0,R.billingCancelNotice.textContent=``;return R.billingYearlyButton&&(R.billingYearlyButton.hidden=l),R.billingCancelButton&&(R.billingCancelButton.hidden=!(l&&!u)),R.billingResumeButton&&(R.billingResumeButton.hidden=!u),rs({currentPlan:n,hasActiveSub:l}),Zo(t,n,o,s),t}var $o={monthly:`monthly`,monthlyTier:`monthly`,month:`monthly`,yearly:`yearly`,yearlyTier:`yearly`,annual:`yearly`,year:`yearly`,premium:`premium`,premiumTier:`premium`,premiumYearly:`premiumYearly`,premium_yearly:`premiumYearly`,premiumYearlyTier:`premiumYearly`,weekly:`weekly`,weeklyTier:`weekly`,free:`free`};function es(e){let t=String(e||``).trim().toLowerCase().replace(/\s+/g,``);return $o[t]||t}function ts(e){let t=es(e);return t===`free`||t===``||t===`-`||t===`weekly`?[`monthly`,`yearly`,`premium`,`premiumYearly`]:t===`monthly`?[`yearly`,`premium`,`premiumYearly`]:t===`yearly`?[`premium`,`premiumYearly`]:t===`premium`?[`premiumYearly`]:t===`premiumyearly`?[]:[`yearly`,`premium`,`premiumYearly`]}function ns(e){return{monthly:`monthlyTier`,yearly:`yearlyTier`,premium:`premiumTier`,premiumYearly:`premiumYearlyTier`,weekly:`weeklyTier`,free:`freeTier`}[e]}function rs({currentPlan:e,hasActiveSub:t}){let n=document.getElementById(`billingUpgradeGrid`),r=document.getElementById(`billingUpgradeSection`);if(!n||!r)return;let i=f()?.billing||{},a=ts(e),o=(()=>{let t=i[ns(es(e))];if(!t)return null;if(t.interval===`year`){let e=Number(t.yearlyEquivalent??t.price/12);return Number.isFinite(e)?e:null}return t.interval===`week`?Number(t.price)*4.33:Number(t.price)})(),s=a.map(e=>{let n=i[ns(e)];if(!n||!n.name)return null;let r=n.interval||`month`,a=Number(n.price);if(!Number.isFinite(a))return null;let s=n.tierType===`premium`||/premium/i.test(n.name),c=r===`year`?Number(n.yearlyEquivalent??a/12):r===`week`?a*4.33:a,l=o&&Number.isFinite(c)&&c<o?`Save $${Math.round((o-c)*12)}/yr`:r===`year`&&a<120?`Best value`:``,u=r===`year`?`$${a}<span class="bill-card-interval">/yr</span><span class="bill-card-mo-eq">≈ $${c.toFixed(2)}/mo</span>`:r===`week`?`$${a}<span class="bill-card-interval">/week</span>`:`$${a}<span class="bill-card-interval">/mo</span>`,d=Array.isArray(n.features)?n.features.slice(0,4):[];return`
        <article class="billing-upgrade-card ${s?`is-premium`:``}" data-plan="${is(e)}">
          ${l?`<span class="billing-upgrade-badge">${is(l)}</span>`:``}
          ${s?`<span class="billing-upgrade-tier">Premium</span>`:``}
          <h4 class="billing-upgrade-name">${is(n.name)}</h4>
          <div class="billing-upgrade-price">${u}</div>
          ${d.length?`<ul class="billing-upgrade-features">${d.map(e=>`<li>${is(String(e))}</li>`).join(``)}</ul>`:``}
          <button type="button" class="btn-primary billing-upgrade-btn" data-action="upgrade" data-plan="${is(e)}">
            ${t?`Switch to ${n.name}`:`Start ${n.name}`}
          </button>
        </article>
      `}).filter(Boolean);if(!s.length){r.hidden=!0;return}n.innerHTML=s.join(``),r.hidden=!1,n.querySelectorAll(`[data-action="upgrade"]`).forEach(e=>{e.addEventListener(`click`,()=>{let t=e.dataset.plan;t&&as(t,e)})})}function is(e){return String(e??``).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`).replace(/'/g,`&#39;`)}async function as(e,t){Z(R.billingActionStatus,`Starting checkout for ${e}…`);let n=Ii();if(!n){Z(R.billingActionStatus,`Missing contact. Re-login so checkout can be linked to your account.`,`is-error`);return}t&&(t.disabled=!0);try{let t=ss(await $([`${s}/api/stripe/checkout-session`,`/api/stripe/checkout-session`,`/api/stripe/checkout`,`/api/billing/checkout-session`],{contact:n,plan:e,successUrl:fi,cancelUrl:pi}));if(!t)throw Error(`Checkout session created but no URL was returned.`);Z(R.billingActionStatus,`Redirecting to Stripe…`,`is-success`),window.location.assign(t)}catch(e){t&&(t.disabled=!1),Z(R.billingActionStatus,String(e?.message||`Unable to start checkout.`),`is-error`)}}function os(){let e=new URLSearchParams(window.location.search);e.delete(`billing`),e.delete(`session_id`),e.delete(`contact`);let t=e.toString(),n=`${window.location.pathname}${t?`?${t}`:``}${window.location.hash||``}`;window.history.replaceState({},``,n)}function ss(e){let t=[e?.url,e?.checkoutUrl,e?.checkout_url,e?.sessionUrl,e?.session_url,e?.data?.url,e?.data?.checkoutUrl,e?.data?.checkout_url];for(let e of t){let t=String(e||``).trim();if(t)return t}return``}async function cs(){Z(R.billingActionStatus,`Starting Stripe checkout...`);let e=Ii();if(!e){Z(R.billingActionStatus,`Missing contact. Re-login so checkout can be linked to your account.`,`is-error`);return}try{let t=ss(await $([`${s}/api/stripe/checkout-session`,`/api/stripe/checkout-session`,`/api/stripe/checkout`,`/api/billing/checkout-session`],{contact:e,plan:`monthly`,successUrl:fi,cancelUrl:pi}));if(!t)throw Error(`Checkout session created but no checkout URL was returned.`);Z(R.billingActionStatus,`Redirecting to Stripe checkout...`,`is-success`),window.location.assign(t)}catch(e){Z(R.billingActionStatus,String(e?.message||`Unable to start checkout.`),`is-error`)}}async function ls(e){let t=e?`?contact=${encodeURIComponent(e)}`:``,n=await Ho([`${s}/api/portal${t}`,`${s}/api/account/portal${t}`,`${s}/api/user/portal${t}`,`${s}/api/portal`,`/api/portal`]);return n?.portal||n?.data?.portal||n}async function us(){let e=new URLSearchParams(window.location.search),t=String(e.get(`billing`)||``).trim().toLowerCase();if(!t)return;if(t===`cancelled`||t===`canceled`){Z(R.billingActionStatus,`Checkout cancelled.`,`is-error`),os();return}if(t!==`success`)return;let n=String(e.get(`session_id`)||``).trim();if(!n){Z(R.billingActionStatus,`Missing Stripe session id in success redirect.`,`is-error`),os();return}Z(R.billingActionStatus,`Finalizing Stripe checkout...`);try{let e=await Ho([`${s}/api/stripe/checkout-complete?session_id=${encodeURIComponent(n)}`,`/api/stripe/checkout-complete?session_id=${encodeURIComponent(n)}`]);if(e?.ok===!1)throw Error(e?.error||e?.message||`Stripe checkout completion failed.`);let t=e?.portal||e?.data?.portal||e;if(!e?.portal&&!e?.data?.portal)try{let e=await ls(Ii());e&&(t=e)}catch{}let r=Qo(t);r?(da(),Z(R.billingActionStatus,`Billing active: ${r}.`,`is-success`)):Z(R.billingActionStatus,`Checkout completed and portal synced.`,`is-success`)}catch(e){Z(R.billingActionStatus,String(e?.message||`Unable to finalize checkout.`),`is-error`)}finally{os()}}async function ds(){let e=Ii();if(!e){Z(R.billingActionStatus,`Missing contact on session. Re-login to sync billing.`,`is-error`);return}Z(R.billingActionStatus,`Loading billing status...`);try{let t=await ls(e);if(t&&typeof t==`object`){let e=Gi(t);e&&(qi(e),da(),Vs())}let n=Qo(t),r=Wo(t),i=Xo(t);n||r||i?Z(R.billingActionStatus,`Billing synced from backend.`,`is-success`):Z(R.billingActionStatus,`Billing response received, but status is missing.`,`is-error`)}catch(e){let t=String(e?.message||`Unable to load billing status.`);if(/404/.test(t)){Z(R.billingActionStatus,`Billing profile not found yet for this user.`,`is-error`);return}Z(R.billingActionStatus,t,`is-error`)}}function fs(){try{let e=window.localStorage.getItem(ai);if(!e)return;let t=JSON.parse(e);if(!t||typeof t!=`object`)return;z.goals={weightGoal:String(t.weightGoal||``).trim(),bodyFatGoal:String(t.bodyFatGoal||``).trim(),workoutPlan:String(t.workoutPlan||``).trim()},z.selectedPlanDays=String(t.selectedPlanDays||z.selectedPlanDays||`7`)}catch{}}function ps(e){let t=String(e||`7`);z.selectedPlanDays=yi[t]?t:`7`,R.planDayButtons.forEach(e=>{e.classList.toggle(`is-active`,e.dataset.days===z.selectedPlanDays)})}function ms(e){let t=[e.name,``,...e.days];return e.summary&&t.splice(1,0,e.summary),t.join(`
`)}function hs(e=z.selectedPlanDays){if(!R.popularPlansList)return;ps(e),Q(R.popularPlansList);let t=yi[z.selectedPlanDays]||[];if(!t.length){Z(R.plansStatus,`No plans available for this split.`,`is-error`);return}t.forEach(e=>{let t=document.createElement(`article`);t.className=`plan-card`;let n=document.createElement(`div`);n.className=`plan-card-head`;let r=document.createElement(`h4`);r.className=`plan-name`,r.textContent=e.name;let i=document.createElement(`button`);i.type=`button`,i.className=`btn-secondary`,i.dataset.planId=e.id,i.textContent=`Use This Plan`,n.appendChild(r),n.appendChild(i);let a=document.createElement(`p`);a.className=`plan-summary`,a.textContent=e.summary;let o=document.createElement(`ul`);o.className=`plan-days-list`,e.days.forEach(e=>{let t=document.createElement(`li`);t.textContent=e,o.appendChild(t)}),t.appendChild(n),t.appendChild(a),t.appendChild(o),R.popularPlansList.appendChild(t)}),Z(R.plansStatus,`${z.selectedPlanDays}-day plans loaded.`,`is-success`)}function gs(e){return(yi[z.selectedPlanDays]||[]).find(t=>t.id===e)||null}function _s(){R.goalWeightInput&&(R.goalWeightInput.value=z.goals.weightGoal||``),R.goalBodyFatInput&&(R.goalBodyFatInput.value=z.goals.bodyFatGoal||``),R.goalWorkoutPlanInput&&(R.goalWorkoutPlanInput.value=z.goals.workoutPlan||``),hs(z.selectedPlanDays)}async function vs(){z.goals={weightGoal:String(R.goalWeightInput?.value||``).trim(),bodyFatGoal:String(R.goalBodyFatInput?.value||``).trim(),workoutPlan:String(R.goalWorkoutPlanInput?.value||``).trim(),selectedPlanDays:z.selectedPlanDays};try{window.localStorage.setItem(ai,JSON.stringify(z.goals))}catch{}try{await $([`/api/account/goals`,`${s}/api/account/goals`],z.goals),Z(R.goalsStatus,`Goals saved to backend.`,`is-success`)}catch{Z(R.goalsStatus,`Goals saved locally.`,`is-success`)}}function ys(){fs(),_s(),R.planDayButtons.forEach(e=>{e.addEventListener(`click`,()=>{hs(e.dataset.days)})}),R.popularPlansList&&R.popularPlansList.addEventListener(`click`,e=>{let t=e.target;if(!(t instanceof HTMLElement))return;let n=t.closest(`button[data-plan-id]`);if(!n)return;let r=gs(n.dataset.planId);r&&(R.goalWorkoutPlanInput&&(R.goalWorkoutPlanInput.value=ms(r)),Z(R.plansStatus,`${r.name} inserted into workout plan.`,`is-success`))}),R.saveGoalsButton&&R.saveGoalsButton.addEventListener(`click`,()=>{vs()})}function bs(){R.affiliateCopyButtons.forEach(e=>{e.addEventListener(`click`,async()=>{let t=e.dataset.copyTarget,n=document.getElementById(t),r=String(n?.value||``).trim();if(r)try{await navigator.clipboard.writeText(r),Z(R.goalsStatus,`Affiliate link copied.`,`is-success`)}catch{Z(R.goalsStatus,`Copy failed. Copy manually.`,`is-error`)}})})}async function xs(e){if(e===`monthly`){await cs();return}if(e===`cancel`&&!window.confirm(`Cancel your subscription? You'll keep access until the end of the current billing period, and you can resume any time before then.`))return;Z(R.billingActionStatus,e===`resume`?`Resuming subscription...`:`Cancelling subscription...`);let t=Ii(),n=e===`resume`?[`${s}/api/billing/resume`,`${s}/api/stripe/subscription/resume`,`/api/billing/resume`]:[`${s}/api/billing/cancel`,`${s}/api/stripe/subscription/cancel`,`${s}/api/stripe/cancel`,`/api/billing/cancel`];try{Qo(await $(n,{action:e,contact:t}));let r=e===`resume`?`Subscription resumed. Welcome back.`:`Subscription set to cancel at period end.`;Z(R.billingActionStatus,r,`is-success`),await ds()}catch(t){let n=String(t?.message||`Billing action failed.`);if(/404/.test(n)){Z(R.billingActionStatus,e===`resume`?`Resume endpoint is not configured on backend yet.`:`Cancel endpoint is not configured on backend yet.`,`is-error`);return}Z(R.billingActionStatus,n,`is-error`)}}function Ss(){R.billingYearlyButton&&R.billingYearlyButton.addEventListener(`click`,()=>{xs(`monthly`)}),R.billingCancelButton&&R.billingCancelButton.addEventListener(`click`,()=>{xs(`cancel`)}),R.billingResumeButton&&R.billingResumeButton.addEventListener(`click`,()=>{xs(`resume`)})}function Cs(e){let t=Array.isArray(e)?e:e?.integrations||e?.items||e?.data?.integrations||e?.data?.items||[];return Array.isArray(t)?t.map((e,t)=>({id:String(e?.id||e?.provider||e?.key||`integration_${t+1}`).trim(),name:String(e?.name||e?.label||e?.provider||`Integration ${t+1}`).trim(),description:String(e?.description||e?.summary||``).trim(),provider:String(e?.provider||e?.id||e?.key||``).trim(),connectUrl:String(e?.connectUrl||e?.url||e?.redirectUrl||``).trim(),connected:Si(e?.connected||e?.isConnected),actionLabel:String(e?.actionLabel||e?.buttonLabel||(e?.connected?`Manage`:`Connect`)).trim(),statusLabel:String(e?.statusLabel||e?.status||``).trim()})).filter(e=>e.name):[]}function ws(e){z.availableIntegrations=Array.isArray(e)?e:[];let t=z.availableIntegrations.length>0;if(R.navIntegrate&&(R.navIntegrate.hidden=!t),R.integrationCards&&Q(R.integrationCards),!t){z.activeTab===`integrate`&&oa(`stats`);return}z.availableIntegrations.forEach(e=>{let t=document.createElement(`article`);t.className=`integration-card`;let n=document.createElement(`h3`);n.textContent=e.name;let r=document.createElement(`p`);r.textContent=e.description||`Integration available from backend.`;let i=document.createElement(`div`);i.className=`panel-actions`;let a=document.createElement(e.connectUrl?`a`:`button`);if(a.className=e.connected?`btn-secondary`:`btn-primary`,a.textContent=e.actionLabel||(e.connected?`Manage`:`Connect`),e.connectUrl?(a.href=e.connectUrl,a.target=`_blank`,a.rel=`noopener noreferrer`):(a.type=`button`,a.dataset.provider=e.provider||e.id),i.appendChild(a),e.statusLabel){let a=document.createElement(`p`);a.className=`stats-status`,a.textContent=e.statusLabel,t.appendChild(n),t.appendChild(r),t.appendChild(i),t.appendChild(a)}else t.appendChild(n),t.appendChild(r),t.appendChild(i);R.integrationCards?.appendChild(t)})}async function Ts(){let e=Cs(z.backendSnapshot?.integrations||[]);if(e.length)return ws(e),Z(R.integrateStatus,`Integrations loaded from portal snapshot.`,`is-success`),e;try{let e=Cs(await Ho([`/api/integrations`,`${s}/api/integrations`,`/api/account/integrations`,`${s}/api/account/integrations`]));return ws(e),e.length&&Z(R.integrateStatus,`Integrations loaded.`,`is-success`),e}catch{return ws([]),[]}}function Es(){R.integrationCards&&R.integrationCards.addEventListener(`click`,async e=>{let t=e.target;if(!(t instanceof HTMLElement))return;let n=t.closest(`button[data-provider]`);if(!n)return;let r=String(n.dataset.provider||``).trim();if(r){Z(R.integrateStatus,`Connecting ${r}...`);try{await $([`/api/integrations/connect`,`${s}/api/integrations/connect`],{provider:r}),Z(R.integrateStatus,`${r} connected.`,`is-success`)}catch{Z(R.integrateStatus,`${r} integration endpoint unavailable.`,`is-error`)}}})}function Ds(e=`New Chat`){return{id:`chat_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,title:e,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),messages:[]}}function Os(){try{let e=window.localStorage.getItem(oi);if(!e)return[];let t=JSON.parse(e);return Array.isArray(t)?t:[]}catch{return[]}}function ks(){try{window.localStorage.setItem(oi,JSON.stringify(z.aiSessions))}catch{}}function As(){return z.aiSessions.find(e=>e.id===z.activeAiSessionId)||null}function js(){if(z.aiSessions.length||(z.aiSessions=Os()),!z.aiSessions.length){let e=Ds(`Welcome`);e.messages.push({role:`assistant`,content:`I can help with workouts, nutrition, hydration, and body metrics. Ask me anything.`,createdAt:new Date().toISOString()}),z.aiSessions=[e]}(!z.activeAiSessionId||!As())&&(z.activeAiSessionId=z.aiSessions[0].id)}function Ms(e){let t=(e?.messages||[]).find(e=>e.role===`user`);return t?.content?String(t.content).slice(0,42):String(e?.title||`New Chat`)}function Ns(e){let t=new Date(e);return Number.isNaN(t.getTime())?``:t.toLocaleTimeString([],{hour:`numeric`,minute:`2-digit`})}function Ps(){R.aiSessionsList&&(Q(R.aiSessionsList),z.aiSessions.forEach(e=>{let t=document.createElement(`button`);t.type=`button`,t.className=`ai-session-btn`,e.id===z.activeAiSessionId&&t.classList.add(`is-active`),t.dataset.sessionId=e.id,t.textContent=Ms(e),R.aiSessionsList.appendChild(t)}))}function Fs(){if(!R.aiMessages)return;Q(R.aiMessages);let e=As();if(!e||!Array.isArray(e.messages)||!e.messages.length){R.aiEmptyState&&(R.aiEmptyState.hidden=!1);return}R.aiEmptyState&&(R.aiEmptyState.hidden=!0),e.messages.forEach(e=>{let t=document.createElement(`article`);t.className=`ai-message ${e.role===`user`?`user`:`assistant`}`;let n=document.createElement(`div`);n.textContent=String(e.content||``);let r=document.createElement(`div`);r.className=`ai-message-meta`,r.textContent=`${e.role===`user`?`You`:`Coach`} • ${Ns(e.createdAt)}`,t.appendChild(n),t.appendChild(r),R.aiMessages.appendChild(t)}),R.aiMessages.scrollTop=R.aiMessages.scrollHeight}function Is(e,t){let n=As();n&&(n.messages.push({role:e,content:String(t||``).trim(),createdAt:new Date().toISOString()}),n.updatedAt=new Date().toISOString(),ks(),Ps(),Fs())}function Ls(e=``){let t=Ds(e?String(e).slice(0,24):`New Chat`);z.aiSessions.unshift(t),z.activeAiSessionId=t.id,ks(),Ps(),Fs()}async function Rs(e){let t=String(e||``).trim();if(!t){Z(R.aiStatus,`Enter a message first.`,`is-error`);return}js(),As()||Ls(t),Is(`user`,t),R.aiQuestionInput&&(R.aiQuestionInput.value=``),Z(R.aiStatus,`Thinking...`),R.aiResponseBox&&(R.aiResponseBox.hidden=!0,R.aiResponseBox.textContent=``);try{let e=As(),n=await $([`${s}/api/ai/chat`,`${s}/api/ai/fitness`,`${s}/api/gemini/fitness`,`/api/ai/chat`,`/api/ai/fitness`,`/api/gemini/fitness`],{sessionId:e?.id||``,message:t,question:t,messages:(e?.messages||[]).map(e=>({role:e.role,content:e.content,createdAt:e.createdAt})),context:{profile:z.backendSnapshot?.profile||V(),goals:z.goals,activeRange:z.activeRange,history:z.backendSnapshot?.history||null}});Is(`assistant`,String(n?.answer||n?.response||n?.content||n?.message||n?.data?.answer||`No answer returned.`).trim()),Z(R.aiStatus,`AI response ready.`,`is-success`)}catch(e){Is(`assistant`,`I could not reach the AI backend for this request.`),Z(R.aiStatus,String(e?.message||`AI endpoint unavailable.`),`is-error`)}}function zs(){js(),Ps(),Fs(),R.aiNewSessionButton&&R.aiNewSessionButton.addEventListener(`click`,()=>{Ls(),Z(R.aiStatus,`Started a new chat.`)}),R.aiSessionsList&&R.aiSessionsList.addEventListener(`click`,e=>{let t=e.target;if(!(t instanceof HTMLElement))return;let n=t.closest(`button[data-session-id]`);n&&(z.activeAiSessionId=String(n.dataset.sessionId||``).trim(),Ps(),Fs())}),R.aiPromptButtons.forEach(e=>{e.addEventListener(`click`,()=>{R.aiQuestionInput&&(R.aiQuestionInput.value=String(e.dataset.prompt||``).trim(),R.aiQuestionInput.focus())})}),R.aiChatForm?R.aiChatForm.addEventListener(`submit`,e=>{e.preventDefault(),Rs(R.aiQuestionInput?.value||``)}):R.askAiButton&&R.askAiButton.addEventListener(`click`,()=>{Rs(R.aiQuestionInput?.value||``)})}async function Bs(){if(z.userSheetUrl)return z.userSheetUrl;try{let e=await Ho([`/api/account/sheet`,`${s}/api/account/sheet`,`/api/sheet`,`${s}/api/sheet`]),t=String(e?.sheetUrl||e?.googleSheetUrl||e?.url||e?.data?.sheetUrl||e?.data?.googleSheetUrl||``).trim();return t?(z.userSheetUrl=t,ga({sheetUrl:t}),Vs(),t):``}catch{return``}}function Vs(){let e=V(),t=String(e?.sheetUrl||z.userSheetUrl||``).trim();R.sheetDatabaseLink&&(R.sheetDatabaseLink.href=t||`#`),R.sheetStatus&&(R.sheetStatus.textContent=t?`Sheet link available.`:`No sheet link found in account yet.`,R.sheetStatus.classList.toggle(`is-error`,!t),R.sheetStatus.classList.toggle(`is-success`,!!t))}function Hs(e){let t=new Map;return vi.forEach(e=>{t.set(e.id,{...e,progress:0,completed:!1})}),e.forEach(e=>{let n=String(e.id||e.key||e.slug||``).trim(),r=Number(e.target??e.goal??NaN),i=Number(e.progress??e.current??e.value??NaN),a={id:n||`milestone_${t.size+1}`,name:String(e.name||e.title||`Milestone`).trim(),target:Number.isFinite(r)&&r>0?r:1,progress:Number.isFinite(i)&&i>0?i:0,completed:Si(e.completed)};t.set(a.id,a)}),[...t.values()].map(e=>{let t=Math.max(0,Number(e.progress||0)),n=Math.max(1,Number(e.target||1));return{...e,progress:t,target:n,completed:e.completed||t>=n,pct:Math.min(100,t/n*100)}})}function Us(e){let t=Array.isArray(e)?e:e?.milestones||e?.data?.milestones||e?.data?.items||e?.items||[];return Array.isArray(t)?t:[]}function Ws(){if(!R.toggleMilestonesButton||!R.milestonesSection)return;let e=()=>{R.milestonesSection.hidden=!z.milestonesOpen,R.toggleMilestonesButton.textContent=z.milestonesOpen?`Hide Milestones`:`Show Milestones`};e(),R.toggleMilestonesButton.addEventListener(`click`,()=>{z.milestonesOpen=!z.milestonesOpen,e()})}async function Gs(){Z(R.milestonesStatus,`Loading milestones...`);let e=[],t=[`/api/milestones`,`/api/account/milestones`,`${s}/api/milestones`];for(let n of t)try{let t=await Pi(n),r=null;try{r=await t.json()}catch{r=null}if(!t.ok||r&&typeof r==`object`&&`ok`in r&&!r.ok)continue;e=Us(r);break}catch{}Ks(Hs(e)),e.length?Z(R.milestonesStatus,`Milestones synced from backend.`,`is-success`):Z(R.milestonesStatus,`Using default milestone tracks.`,`is-success`)}function Ks(e){R.milestonesList&&(Q(R.milestonesList),e.forEach(e=>{let t=document.createElement(`article`);t.className=`milestone-item`;let n=document.createElement(`div`);n.className=`milestone-top`;let r=document.createElement(`p`);r.className=`milestone-name`,r.textContent=e.name;let i=document.createElement(`span`);i.className=`trend-value`,i.textContent=e.completed?`Unlocked`:`In Progress`,n.appendChild(r),n.appendChild(i);let a=document.createElement(`p`);a.className=`milestone-progress`,a.textContent=`${W(e.progress)} / ${W(e.target)}`;let o=document.createElement(`div`);o.className=`milestone-track`;let s=document.createElement(`div`);s.className=`milestone-fill`,s.style.width=`${e.pct}%`,o.appendChild(s),t.appendChild(n),t.appendChild(a),t.appendChild(o),R.milestonesList.appendChild(t)}))}async function qs(){!z.bodyMeasures.length&&Array.isArray(z.backendSnapshot?.history?.bodyMetrics)&&(z.bodyMeasures=wo(z.backendSnapshot.history.bodyMetrics)),z.bodyMeasures.length||(z.bodyMeasures=await To()),Eo()}function Js(){let e=new URLSearchParams(window.location.search),t=na(e.get(`view`));if(t)return t;let n=String(e.get(`billing`)||``).trim().toLowerCase();return n===`success`||n===`cancelled`||n===`canceled`?`billing`:`stats`}function Ys(){bs(),R.affiliateApplyForm?R.affiliateApplyForm.addEventListener(`submit`,ao):R.affiliateApplyButton&&R.affiliateApplyButton.addEventListener(`click`,ao),[R.affiliateFirstNameInput,R.affiliateLastNameInput,R.affiliateEmailInput,R.affiliateConfirmEmailInput,R.affiliatePhoneInput].forEach(e=>{e&&e.addEventListener(`input`,()=>{Ua(!1),R.affiliateTabEmptyStatus&&R.affiliateTabEmptyStatus.classList.remove(`is-error`,`is-success`)})}),R.affiliatePhoneInput&&R.affiliatePhoneInput.addEventListener(`blur`,()=>{let e=Ti(R.affiliatePhoneInput?.value||``);e&&(R.affiliatePhoneInput.value=Ei(e))}),[R.affiliateEmailInput,R.affiliateConfirmEmailInput,R.affiliateAgreementEmailInput,R.affiliateAgreementConfirmEmailInput].forEach(e=>{e&&(e.addEventListener(`blur`,()=>{e.value=String(e.value||``).trim().toLowerCase()}),e.addEventListener(`input`,()=>{R.affiliateAgreementStatus&&R.affiliateAgreementStatus.classList.remove(`is-error`,`is-success`)}))}),R.affiliateOpenBillingButton&&R.affiliateOpenBillingButton.addEventListener(`click`,()=>{let e=Ba();if(e){window.open(e,`_blank`,`noopener,noreferrer`);return}oa(`billing`)}),R.affiliateTabConnectButton&&R.affiliateTabConnectButton.addEventListener(`click`,lo),R.affiliateAgreementResendButton&&R.affiliateAgreementResendButton.addEventListener(`click`,()=>{co()}),R.affiliateAgreementLink&&R.affiliateAgreementLink.addEventListener(`click`,()=>{Z(R.affiliateAgreementStatus,`Once you sign, this tab will refresh automatically.`),Ja(1500)})}function Xs(){Po(),Ws(),Vo(),ys(),xa(),Ss(),Es(),zs(),Ys()}async function Zs(){await Promise.allSettled([Mo(`today`),qs(),Lo(),Gs(),Ts(),Bs()])}function Qs(e){e&&e.preventDefault(),Ka();try{window.localStorage.removeItem(ti),window.localStorage.removeItem(ni),window.localStorage.removeItem(ri),window.localStorage.removeItem(`tracker.affiliate.email`),window.localStorage.removeItem(ii),window.localStorage.removeItem(`tracker.auth.pending`)}catch{}window.location.replace(li)}function $s(){let e=document.getElementById(`dashboardLogoutLink`);e&&e.addEventListener(`click`,Qs)}function ec(){Xi(),da(),Vs(),So(),sa(),Xs(),$s(),oa(Js(),!1),us().finally(()=>{ds()}),Ji().finally(()=>{Zs()})}function tc(){let e=z.bodyMeasures||[];if(!e.length)return;let t=e[e.length-1]||{},n=e.length>1?e[e.length-2]:null,r={measureHeight:t.height,measureWeight:t.weight||t.bodyweight,measureBodyFat:t.bodyFat,measureDate:t.date?new Date(t.date).toLocaleDateString():null,measureBicepL:t.bicepL||t.bicepLeft,measureBicepR:t.bicepR||t.bicepRight,measureForearmL:t.forearmL||t.forearmLeft,measureForearmR:t.forearmR||t.forearmRight,measureChest:t.chest,measureShoulders:t.shoulders,measureNeck:t.neck,measureLats:t.lats,measureTraps:t.traps,measureSerratus:t.serratus||t.serratusAnterior,measureWaist:t.waist,measureAbs:t.abs,measureObliques:t.obliques,measureQuadL:t.quadL||t.quadLeft,measureQuadR:t.quadR||t.quadRight,measureCalfL:t.calfL||t.calfLeft,measureCalfR:t.calfR||t.calfRight,measureGlutes:t.glutes||t.glute};for(let[e,t]of Object.entries(r)){let n=document.getElementById(e);if(!n||t==null||t===``)continue;let r=n.dataset?.unit||``;n.classList.contains(`measurement-value`)?n.innerHTML=`<span class="value">${typeof t==`number`?t.toFixed(1):t}</span><span class="unit">${r}</span>`:n.textContent=typeof t==`number`?t.toFixed(1):t}let i=document.getElementById(`measureWeightDelta`);if(i&&t.weight&&n?.weight){let e=t.weight-n.weight;i.textContent=`${e>=0?`+`:``}${e.toFixed(1)} lb`,i.className=`stat-delta ${e>0?`positive`:e<0?`negative`:``}`}}function nc(){let e=document.getElementById(`progressChartsContainer`);e&&st(e).catch(e=>{console.warn(`initDashboardCharts failed:`,e)})}function rc(){tc(),nc(),_e().catch(e=>console.warn(`initChecklist failed:`,e)),d().then(()=>{document.querySelector(`[data-tab="${z.activeTab}"]`)?.hidden&&oa(`stats`)}).catch(e=>console.warn(`initFeatureFlags failed:`,e));let e=document.getElementById(`bodyMeasurementsSection`);e&&(Ge(e),Pi(`${s}/api/user/measurements`).then(e=>e&&e.ok?e.json():null).then(t=>{t&&We(t,e)}).catch(()=>{}))}c(),l(),ec(),setTimeout(()=>{rc(),tc()},500);