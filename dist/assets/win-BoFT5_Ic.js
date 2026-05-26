import"./modulepreload-polyfill-BQdWdB5M.js";import{i as e}from"./feature-flags-BBgfJO6n.js";/* empty css                   */var t=`https://api.thetrackerapp.io`,n=document.getElementById(`currentPrizePool`);document.getElementById(`activeChallengeSection`);var r=document.getElementById(`activeChallenge`),i=document.getElementById(`noActiveChallenge`),a=document.getElementById(`challengeLeaderboardSection`),o=document.getElementById(`challengeLeaderboard`),s=document.getElementById(`challengeTimer`),c=document.getElementById(`pastWinnersList`),l=document.getElementById(`enableNotificationsBtn`),u=null;async function d(){try{let e=await fetch(`${t}/api/challenges/current`);if(!e.ok){if(e.status===404){f();return}throw Error(`Failed to fetch`)}p(await e.json())}catch(e){console.error(`Error fetching challenge:`,e),f()}}function f(){r.hidden=!0,i.hidden=!1,a.hidden=!0,n.textContent=`0`}function p(e){r.hidden=!1,i.hidden=!0,a.hidden=!1,n.textContent=e.prize||`0`,r.innerHTML=`
    <h2 class="challenge-title">${e.title}</h2>
    <p class="challenge-description">${e.description}</p>
    
    <div class="challenge-requirements">
      ${e.requirements.map(e=>`
        <div class="challenge-requirement">
          <span class="requirement-value">${e.value}</span>
          <span class="requirement-label">${e.label}</span>
        </div>
      `).join(``)}
    </div>
    
    <div class="challenge-prize-display">Win $${e.prize}</div>
    
    <div class="challenge-cta">
      <button class="btn-primary" onclick="window.location.href='/login?redirect=/win'">
        Join Challenge
      </button>
      <button class="btn-secondary" onclick="shareChallenge()">
        Share
      </button>
    </div>
  `,m(new Date(e.endsAt)),h(e.id)}function m(e){u&&clearInterval(u);function t(){let t=e-new Date;if(t<=0){s.textContent=`ENDED`,clearInterval(u),d();return}let n=Math.floor(t/(1e3*60*60)),r=Math.floor(t%(1e3*60*60)/(1e3*60)),i=Math.floor(t%(1e3*60)/1e3);s.textContent=`${String(n).padStart(2,`0`)}:${String(r).padStart(2,`0`)}:${String(i).padStart(2,`0`)}`}t(),u=setInterval(t,1e3)}async function h(e){try{let n=await fetch(`${t}/api/challenges/${e}/leaderboard`);if(!n.ok)throw Error(`Failed to fetch`);g((await n.json()).entries||[])}catch(e){console.error(`Error fetching leaderboard:`,e),o.innerHTML=`<li class="loading-state">Leaderboard loading...</li>`}}function g(e){if(!e.length){o.innerHTML=`<li class="loading-state">No participants yet. Be the first!</li>`;return}o.innerHTML=e.map((e,t)=>`
    <li class="leaderboard-entry">
      <span class="leaderboard-rank">${t+1}</span>
      <span class="leaderboard-user">${e.username||e.name}</span>
      <span class="leaderboard-progress">${e.progress}%</span>
      ${e.completedAt?`<span class="leaderboard-time">${x(e.completedAt)}</span>`:``}
    </li>
  `).join(``)}async function _(){try{let e=await fetch(`${t}/api/challenges/winners?limit=10`);if(!e.ok)throw Error(`Failed to fetch`);v((await e.json()).winners||[])}catch(e){console.error(`Error fetching past winners:`,e),c.innerHTML=`<p class="loading-state">No recent winners yet.</p>`}}function v(e){if(!e.length){c.innerHTML=`<p class="loading-state">No recent winners yet.</p>`;return}c.innerHTML=e.map(e=>`
    <article class="past-winner-item">
      <div class="winner-avatar">${y(e.username||e.name)}</div>
      <div class="winner-details">
        <h4>${e.username||e.name}</h4>
        <p>${e.challenge} - ${b(e.date)}</p>
      </div>
      <span class="winner-prize">$${e.prize}</span>
    </article>
  `).join(``)}function y(e){return e.split(` `).map(e=>e[0]).join(``).toUpperCase().slice(0,2)}function b(e){return new Intl.DateTimeFormat(`en-US`,{month:`short`,day:`numeric`}).format(new Date(e))}function x(e){return new Intl.DateTimeFormat(`en-US`,{hour:`numeric`,minute:`2-digit`}).format(new Date(e))}window.shareChallenge=function(){let e=window.location.href;navigator.share?navigator.share({title:`Win Cash - The Tracker App`,text:`Check out this fitness challenge on The Tracker App!`,url:e}):(navigator.clipboard.writeText(e),alert(`Link copied to clipboard!`))};async function S(){if(!(`Notification`in window)){alert(`Your browser doesn't support notifications.`);return}await Notification.requestPermission()===`granted`?(alert(`Notifications enabled! You'll be notified when new challenges go live.`),localStorage.setItem(`tracker.notifications.challenges`,`true`)):alert(`Notifications blocked. Please enable them in your browser settings.`)}l?.addEventListener(`click`,S);async function C(){await e();let t=localStorage.getItem(`tracker.authenticated`)===`true`;document.getElementById(`loginLink`).hidden=t,document.getElementById(`dashboardLink`).hidden=!t,d(),_(),setInterval(d,3e4)}C();