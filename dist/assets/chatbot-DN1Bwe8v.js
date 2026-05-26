var e=`https://api.thetrackerapp.io`,t=`tracker.chat.session`,n=`tracker.chat.transcript`,r=6e3,i=1e3,a=null,o=null,s=null,c=null,l=null,u=null,d=null,f=null,p={open:!1,busy:!1,mode:`ai`,pollTimer:null,lastPolledAt:null},m=g(),h=v();function g(){try{return localStorage.getItem(t)||``}catch{return``}}function _(e){try{e&&localStorage.setItem(t,e)}catch{}}function v(){try{let e=localStorage.getItem(n);if(!e)return[];let t=JSON.parse(e);return Array.isArray(t)?t.slice(-50):[]}catch{return[]}}function y(){try{localStorage.setItem(n,JSON.stringify(h.slice(-50)))}catch{}}function b(){try{let e=localStorage.getItem(`tracker.auth.session`);if(!e)return``;try{let t=JSON.parse(e),n=t&&(t.token||t.accessToken);if(n)return String(n).trim()}catch{}return String(e).trim()}catch{return``}}function x(){try{let e=localStorage.getItem(`tracker.auth.user`);if(!e)return``;let t=JSON.parse(e);return(t?.username||t?.canonical||t?.credential||t?.maskedCredential||t?.accountId||``).toString().trim()}catch{return``}}async function S(t,n={}){let r={Accept:`application/json`,"Content-Type":`application/json`,...n.headers||{}},i=b();i&&(r.Authorization=`Bearer ${i}`);let a=await fetch(`${e}${t}`,{...n,headers:r});if(!a.ok){let e=await a.text().catch(()=>``);throw Error(e||`HTTP ${a.status}`)}return a.status===204?null:a.json()}function C(e){return String(e??``).replace(/&/g,`&amp;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`).replace(/"/g,`&quot;`).replace(/'/g,`&#39;`)}function w(e){let t=C(e);return t=t.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,(e,t,n)=>`<a href="${n}" target="_blank" rel="noreferrer">${C(t)}</a>`),t=t.replace(/(^|[\s])(https?:\/\/[^\s<]+)/g,(e,t,n)=>`${t}<a href="${n}" target="_blank" rel="noreferrer">${C(n)}</a>`),t.replace(/\n/g,`<br>`)}function T(e){if(!e||e.chatbotEnabled!==!0){E();return}a||(a=document.createElement(`div`),a.className=`tracker-chatbot`,a.innerHTML=D(),document.body.appendChild(a),d=a.querySelector(`.chat-launcher`),o=a.querySelector(`.chat-panel`),s=a.querySelector(`.chat-messages`),c=a.querySelector(`.chat-input`),l=a.querySelector(`.chat-send`),u=a.querySelector(`.chat-agent-btn`),f=a.querySelector(`.chat-unread`),h.length?P():N({role:`ai`,text:`Hi! I'm the Tracker App assistant. Ask me anything about logging workouts, nutrition, billing, or anything else. If you need a human I can hand you off — just say "agent".`,ts:new Date().toISOString()}),O())}function E(){p.pollTimer&&clearInterval(p.pollTimer),p.pollTimer=null,a&&=(a.remove(),o=s=c=l=u=d=f=null)}function D(){return`
    <button type="button" class="chat-launcher" aria-label="Open chat support">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M21 11.5c0 4.142-4.03 7.5-9 7.5-1.155 0-2.262-.18-3.27-.51L4 20l1.6-3.4C4.6 15.27 4 13.94 4 12.5 4 8.358 8.03 5 13 5h.5C18.05 5 21 8.04 21 11.5z"
              fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="chat-launcher-label">Chat with us</span>
      <span class="chat-unread" hidden>•</span>
    </button>

    <section class="chat-panel" role="dialog" aria-label="Tracker App chat" hidden>
      <header class="chat-panel-head">
        <div class="chat-head-left">
          <span class="chat-head-avatar" aria-hidden="true">🤖</span>
          <div>
            <span class="chat-head-title">Tracker Assistant</span>
            <span class="chat-head-sub" id="chatHeadSub">AI · typically replies instantly</span>
          </div>
        </div>
        <button type="button" class="chat-close" aria-label="Close chat">×</button>
      </header>

      <div class="chat-messages" aria-live="polite"></div>

      <div class="chat-actions">
        <button type="button" class="chat-agent-btn">Talk to a human</button>
      </div>

      <form class="chat-form" novalidate>
        <textarea class="chat-input" rows="1" placeholder="Ask anything…" autocomplete="off" maxlength="${i}"></textarea>
        <button type="submit" class="chat-send" aria-label="Send">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 12l18-9-4 9 4 9z" fill="currentColor"/>
          </svg>
        </button>
      </form>
      <p class="chat-foot">
        Powered by The Tracker App. Don't share credit card numbers or 2FA codes in chat.
      </p>
    </section>
  `}function O(){d.addEventListener(`click`,k),a.querySelector(`.chat-close`).addEventListener(`click`,A),u.addEventListener(`click`,()=>z()),c.addEventListener(`input`,()=>{c.style.height=`auto`,c.style.height=Math.min(120,c.scrollHeight)+`px`}),c.addEventListener(`keydown`,e=>{e.key===`Enter`&&!e.shiftKey&&(e.preventDefault(),R())}),a.querySelector(`.chat-form`).addEventListener(`submit`,e=>{e.preventDefault(),R()}),document.addEventListener(`keydown`,e=>{p.open&&e.key===`Escape`&&A()})}function k(){p.open=!0,o.hidden=!1,d.setAttribute(`aria-expanded`,`true`),M(),p.mode===`agent`&&B(),requestAnimationFrame(()=>{s&&(s.scrollTop=s.scrollHeight),c?.focus()})}function A(){p.open=!1,o.hidden=!0,d.setAttribute(`aria-expanded`,`false`)}function j(){p.open||!f||(f.hidden=!1)}function M(){f&&(f.hidden=!0)}function N(e){h.push(e),y(),P(),!p.open&&e.role!==`user`&&j()}function P(){s&&(s.innerHTML=h.map(e=>{let t=e.role===`agent`?`<span class="chat-msg-author">${C(e.agentName||`Support`)}</span>`:e.role===`ai`?`<span class="chat-msg-author">Assistant</span>`:``,n=Array.isArray(e.suggestedActions)&&e.suggestedActions.length?`<div class="chat-msg-actions">${e.suggestedActions.map(e=>`<a class="chat-msg-action" href="${C(e.url||`#`)}" ${e.url?.startsWith(`http`)?`target="_blank" rel="noreferrer"`:``}>${C(e.label||e.kind||`Open`)}</a>`).join(``)}</div>`:``;return`
      <div class="chat-msg chat-msg-${e.role}">
        ${t}
        <div class="chat-msg-body">${w(e.text||``)}</div>
        ${n}
      </div>
    `}).join(``),s.scrollTop=s.scrollHeight)}function F(e){let t=a?.querySelector(`#chatHeadSub`);t&&(t.textContent=e)}function I(e){p.busy=e,l&&(l.disabled=e),c&&(c.disabled=e)}function L(){if(!s)return null;let e=document.createElement(`div`);return e.className=`chat-msg chat-msg-ai chat-msg-typing`,e.innerHTML=`
    <span class="chat-msg-author">Assistant</span>
    <div class="chat-msg-body">
      <span class="chat-typing">
        <span></span><span></span><span></span>
      </span>
    </div>
  `,s.appendChild(e),s.scrollTop=s.scrollHeight,e}async function R(){if(p.busy)return;let e=(c?.value||``).trim();if(!e)return;if(c.value=``,c.style.height=`auto`,N({role:`user`,text:e,ts:new Date().toISOString()}),/^(agent|human|talk to (a |an )?(person|agent|human)|support|representative)\b/i.test(e)){await z(e);return}I(!0);let t=L();try{let n=await S(`/api/chat/message`,{method:`POST`,body:JSON.stringify({sessionId:m||void 0,contact:x()||void 0,message:e,context:{page:location.pathname,url:location.href}})});t?.remove(),n?.sessionId&&(m=n.sessionId,_(m)),p.mode=n?.mode===`agent`?`agent`:`ai`,p.mode===`agent`&&F(`Human · usually replies within minutes`),N({role:p.mode===`agent`?`agent`:`ai`,text:n?.reply||`Hmm — got an empty reply. Try again?`,suggestedActions:n?.suggestedActions,ts:new Date().toISOString(),agentName:n?.agentName}),n?.handedOff&&B()}catch(e){t?.remove(),N({role:`system`,text:`Couldn't reach the chat backend (${e.message||`request failed`}). You can also email support@thetrackerapp.io.`,ts:new Date().toISOString()})}finally{I(!1),c.focus()}}async function z(e){I(!0);let t=L();try{let n=await S(`/api/chat/request-agent`,{method:`POST`,body:JSON.stringify({sessionId:m||void 0,contact:x()||void 0,reason:e||void 0})});t?.remove(),n?.sessionId&&(m=n.sessionId,_(m)),p.mode=`agent`,F(`Human · ${n?.eta?`ETA ${n.eta}`:`usually replies within minutes`}`),N({role:`system`,text:n?.greeting||`Got it — a human will jump in${n?.eta?` in ${n.eta}`:` shortly`}. Feel free to keep typing in the meantime.`,ts:new Date().toISOString()}),B()}catch(e){t?.remove(),N({role:`system`,text:`Couldn't reach a human right now (${e.message||`request failed`}). Please email support@thetrackerapp.io — we usually reply within a few hours.`,ts:new Date().toISOString()})}finally{I(!1)}}function B(){p.pollTimer||(p.pollTimer=setInterval(H,r),H())}function V(){p.pollTimer&&clearInterval(p.pollTimer),p.pollTimer=null}async function H(){if(m)try{let e=new URLSearchParams({sessionId:m});p.lastPolledAt&&e.set(`since`,p.lastPolledAt);let t=await S(`/api/chat/messages?${e.toString()}`);if(p.lastPolledAt=new Date().toISOString(),Array.isArray(t?.messages))for(let e of t.messages)e.id&&h.some(t=>t.id===e.id)||N({id:e.id,role:e.role||(t.mode===`agent`?`agent`:`ai`),text:e.text||``,agentName:e.agentName,ts:e.ts||new Date().toISOString()});t?.mode===`agent`&&F(`Human · live`),t?.closed&&V()}catch{}}export{T as default,T as initChatbot};