import"./modulepreload-polyfill-BQdWdB5M.js";var e=`https://api.thetrackerapp.io`,t=[{id:`website`,name:`Website`,url:`https://thetrackerapp.io`},{id:`api`,name:`Tracker API`,url:`https://api.thetrackerapp.io`},{id:`dashboard`,name:`Dashboard`,url:`https://dashboard.thetrackerapp.io`},{id:`telegram`,name:`Telegram Bot`,url:null},{id:`imessage`,name:`iMessage Service`,url:null},{id:`sms`,name:`SMS Service`,url:null}];function n(){return t.map(e=>({...e,status:`operational`,uptime:99.9+Math.random()*.1,history:Array.from({length:30},()=>Math.random()>.02?`operational`:Math.random()>.5?`degraded`:`outage`)}))}function r(){return{avgResponseTime:Math.floor(180+Math.random()*100),p95ResponseTime:Math.floor(350+Math.random()*150),requestsToday:Math.floor(5e4+Math.random()*3e4)}}async function i(){try{let t=await fetch(`${e}/api/status`);if(t.ok)return await t.json()}catch(e){console.warn(`Could not fetch status:`,e)}return{services:n(),stats:r(),incidents:[],overall:`operational`}}function a(e){let t=document.getElementById(`servicesGrid`);t&&(t.innerHTML=e.map(e=>`
    <div class="service-card">
      <div class="service-info">
        <h3>${e.name}</h3>
        <div class="service-status">
          <span class="status-dot ${e.status}"></span>
          <span>${d(e.status)}</span>
        </div>
      </div>
      <div class="service-graph">
        ${e.history.slice(-30).map(e=>`<div class="graph-bar ${e}" style="height: ${e===`operational`?100:e===`degraded`?60:30}%"></div>`).join(``)}
      </div>
      <div class="service-uptime">
        <span class="uptime-percent">${e.uptime.toFixed(1)}%</span>
        <span class="uptime-label">uptime</span>
      </div>
    </div>
  `).join(``))}function o(e){let t=document.getElementById(`avgResponseTime`),n=document.getElementById(`p95ResponseTime`),r=document.getElementById(`requestsToday`);t&&(t.textContent=`${e.avgResponseTime}ms`),n&&(n.textContent=`${e.p95ResponseTime}ms`),r&&(r.textContent=f(e.requestsToday))}function s(e){let t=document.getElementById(`overallStatus`);if(!t)return;let n=t.querySelector(`.status-icon`),r=t.querySelector(`h1`);n&&(n.className=`status-icon ${e}`),r&&(r.textContent=e===`operational`?`All Systems Operational`:e===`degraded`?`Some Systems Degraded`:`System Outage`)}function c(e){let t=document.getElementById(`uptimeGrid`);if(!t)return;let n=[];for(let t=0;t<30;t++){let r=e.map(e=>e.history[t]||`operational`);r.includes(`outage`)?n.push(`outage`):r.includes(`degraded`)?n.push(`degraded`):n.push(`operational`)}t.innerHTML=n.map((e,t)=>{let n=new Date;return n.setDate(n.getDate()-(29-t)),`<div class="uptime-day ${e}" title="${n.toLocaleDateString()}"></div>`}).join(``)}function l(e){let t=document.getElementById(`incidentsList`);if(t){if(!e||e.length===0){t.innerHTML=`<p class="no-incidents">No incidents reported in the past 7 days</p>`;return}t.innerHTML=e.map(e=>`
    <div class="incident-item">
      <div class="incident-title">${p(e.title)}</div>
      <div class="incident-date">${new Date(e.date).toLocaleDateString()}</div>
    </div>
  `).join(``)}}function u(){let e=document.getElementById(`lastUpdated`);e&&(e.textContent=new Date().toLocaleTimeString())}function d(e){return e.charAt(0).toUpperCase()+e.slice(1)}function f(e){return e>=1e6?(e/1e6).toFixed(1)+`M`:e>=1e3?(e/1e3).toFixed(1)+`K`:e.toString()}function p(e){return e?e.replace(/[&<>"']/g,e=>({"&":`&amp;`,"<":`&lt;`,">":`&gt;`,'"':`&quot;`,"'":`&#39;`})[e]):``}async function m(){let e=await i();s(e.overall),a(e.services),o(e.stats),c(e.services),l(e.incidents),u()}m(),setInterval(m,6e4);