import"./modulepreload-polyfill-BJzIe6l4.js";import"./feature-flags-DmYA39an.js";var e=`https://api.thetrackerapp.io`,t={telegram:[{id:`tg_1`,name:`Morning Lifters`,emoji:`🏋️`,members:156,description:`Early birds who lift before work. 5-7 AM crew.`,workoutsThisWeek:342,totalVolume:`1.2M lb`,topStreak:45,joinUrl:`https://t.me/morninglifters`},{id:`tg_2`,name:`Run Club NYC`,emoji:`🏃`,members:89,description:`Central Park runners. All paces welcome!`,workoutsThisWeek:178,totalVolume:`890 mi`,topStreak:32,joinUrl:`https://t.me/runclubnyc`},{id:`tg_3`,name:`Home Workout Heroes`,emoji:`💪`,members:234,description:`No gym? No problem. Bodyweight and minimal equipment.`,workoutsThisWeek:567,totalVolume:`45K reps`,topStreak:67,joinUrl:`https://t.me/homeworkoutheroes`},{id:`tg_4`,name:`Powerlifting Squad`,emoji:`🦍`,members:67,description:`Serious lifters. SBD focused. Competition prep.`,workoutsThisWeek:134,totalVolume:`2.8M lb`,topStreak:28,joinUrl:`https://t.me/powerliftingsquad`},{id:`tg_5`,name:`Yoga & Mobility`,emoji:`🧘`,members:112,description:`Daily stretching, yoga flows, and recovery.`,workoutsThisWeek:298,totalVolume:`1.5K hrs`,topStreak:90,joinUrl:`https://t.me/yogamobility`},{id:`tg_6`,name:`CrossFit Crew`,emoji:`🔥`,members:78,description:`WODs, AMRAPs, and functional fitness.`,workoutsThisWeek:245,totalVolume:`890K lb`,topStreak:52,joinUrl:`https://t.me/crossfitcrew`}],imessage:[{id:`im_1`,name:`Austin Gym Bros`,emoji:`🤝`,members:24,description:`Local Austin lifters. Gym meetups and accountability.`,workoutsThisWeek:87,totalVolume:`456K lb`,topStreak:38,joinUrl:`sms:+15551234567&body=Join%20Austin%20Gym%20Bros`},{id:`im_2`,name:`Office Fitness Club`,emoji:`👔`,members:18,description:`Coworkers keeping each other accountable.`,workoutsThisWeek:45,totalVolume:`123K lb`,topStreak:21,joinUrl:`sms:+15559876543&body=Join%20Office%20Fitness`},{id:`im_3`,name:`Weekend Warriors`,emoji:`⚔️`,members:32,description:`Saturday and Sunday workout crew.`,workoutsThisWeek:64,totalVolume:`234K lb`,topStreak:15,joinUrl:`sms:+15555555555&body=Join%20Weekend%20Warriors`}]},n=`telegram`;function r(){document.querySelectorAll(`.platform-btn`).forEach(e=>{e.addEventListener(`click`,()=>{document.querySelectorAll(`.platform-btn`).forEach(e=>e.classList.remove(`active`)),e.classList.add(`active`),n=e.dataset.platform,i()})}),document.getElementById(`createGroupBtn`)?.addEventListener(`click`,()=>{window.location.href=`/login?action=createGroup`}),a()}function i(){let e=document.getElementById(`telegramSection`),t=document.getElementById(`imessageSection`);n===`telegram`?(e.hidden=!1,t.hidden=!0):(e.hidden=!0,t.hidden=!1)}async function a(){try{let n=await fetch(`${e}/api/groups`);if(n.ok){let e=await n.json();o(`telegram`,e.telegram||t.telegram),o(`imessage`,e.imessage||t.imessage);return}}catch(e){console.warn(`Could not fetch groups from API:`,e)}o(`telegram`,t.telegram),o(`imessage`,t.imessage)}function o(e,t){let n=document.getElementById(`${e}Groups`);if(n){if(!t.length){n.innerHTML=`<p class="loading-state">No groups available yet.</p>`;return}n.innerHTML=t.map(t=>`
    <article class="group-card">
      <div class="group-card-header">
        <div class="group-avatar">${t.emoji||`💪`}</div>
        <div class="group-info">
          <h3>${s(t.name)}</h3>
          <span class="group-members">${t.members} members</span>
        </div>
      </div>
      <p class="group-description">${s(t.description)}</p>
      <div class="group-stats">
        <div class="group-stat">
          <span class="group-stat-value">${t.workoutsThisWeek}</span>
          <span class="group-stat-label">Workouts/wk</span>
        </div>
        <div class="group-stat">
          <span class="group-stat-value">${t.totalVolume}</span>
          <span class="group-stat-label">Volume</span>
        </div>
        <div class="group-stat">
          <span class="group-stat-value">${t.topStreak}</span>
          <span class="group-stat-label">Top Streak</span>
        </div>
      </div>
      <a href="${s(t.joinUrl)}" target="_blank" rel="noreferrer" class="join-group-btn ${e}">
        Join on ${e===`telegram`?`Telegram`:`iMessage`}
      </a>
    </article>
  `).join(``)}}function s(e){return e?e.replace(/[&<>"']/g,e=>({"&":`&amp;`,"<":`&lt;`,">":`&gt;`,'"':`&quot;`,"'":`&#39;`})[e]):``}r();