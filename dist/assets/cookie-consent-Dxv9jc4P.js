var e=`tta_cookie_consent`,t=1,n={essential:{label:`Essential`,required:!0,desc:`Session management, fraud prevention, and security. Always enabled.`},analytics:{label:`Analytics`,required:!1,desc:`Anonymous usage metrics via Google Analytics to improve the service.`}};function r(){try{let n=window.localStorage.getItem(e);if(!n)return null;let r=JSON.parse(n);return r?.version===t?r:null}catch{return null}}function i(n){let r={version:t,categories:n,acceptedAt:new Date().toISOString()};try{window.localStorage.setItem(e,JSON.stringify(r))}catch{}return r}function a(){return!!r()?.categories?.analytics}var o=null;function s(e){o=e}function c(e){typeof CustomEvent==`function`&&window.dispatchEvent(new CustomEvent(`ttaconsentchange`,{detail:e}))}var l=null;function u(){if(l)return l;let e=document.createElement(`div`);e.id=`cookieConsentBanner`,e.setAttribute(`role`,`dialog`),e.setAttribute(`aria-label`,`Cookie consent`),e.setAttribute(`aria-modal`,`false`),e.innerHTML=`
    <div class="ccb-inner">
      <p class="ccb-text">
        This site uses cookies for security and analytics.
        <button type="button" class="ccb-details-toggle" aria-expanded="false">Learn more</button>
      </p>
      <div class="ccb-details" hidden>
        <p><strong>Essential:</strong> ${n.essential.desc}</p>
        <p><strong>Analytics:</strong> ${n.analytics.desc}</p>
        <p>You can change your mind at any time via the "Cookie Settings" link in the footer.</p>
        <p>See our <a href="/privacy#cookies" target="_blank" rel="noopener">Privacy Policy</a> for full details.</p>
      </div>
      <div class="ccb-actions">
        <button type="button" class="ccb-btn ccb-btn-secondary" data-action="essential">Essential Only</button>
        <button type="button" class="ccb-btn ccb-btn-primary" data-action="accept">Accept All</button>
      </div>
    </div>
  `;let t=e.querySelector(`.ccb-details-toggle`),r=e.querySelector(`.ccb-details`);return t.addEventListener(`click`,()=>{let e=t.getAttribute(`aria-expanded`)===`true`;t.setAttribute(`aria-expanded`,String(!e)),r.hidden=e}),e.querySelector(`[data-action="essential"]`).addEventListener(`click`,()=>{d({essential:!0,analytics:!1})}),e.querySelector(`[data-action="accept"]`).addEventListener(`click`,()=>{d({essential:!0,analytics:!0})}),l=e,e}function d(e){let t=i(e);f(),c(t),o&&o(t)}function f(){l&&l.parentNode&&l.parentNode.removeChild(l)}function p(){let e=r();if(e){c(e),o&&o(e);return}let t=u();t.parentNode||document.body.appendChild(t)}function m(){try{window.localStorage.removeItem(e)}catch{}l&&l.parentNode&&l.parentNode.removeChild(l),l=null,p()}var h=`
#cookieConsentBanner {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 99999;
  background: #111;
  color: #eee;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  border-top: 1px solid #333;
  box-shadow: 0 -2px 16px rgba(0,0,0,.4);
  animation: ccbSlideUp .3s ease-out;
}
@keyframes ccbSlideUp {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}
.ccb-inner {
  max-width: 960px;
  margin: 0 auto;
  padding: 16px 20px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
}
.ccb-text {
  flex: 1 1 300px;
  margin: 0;
  color: #ccc;
}
.ccb-details-toggle {
  background: none;
  border: none;
  color: #818cf8;
  cursor: pointer;
  padding: 0;
  font: inherit;
  text-decoration: underline;
}
.ccb-details {
  flex: 1 1 100%;
  padding: 10px 0 0;
  font-size: 13px;
  color: #999;
  border-top: 1px solid #222;
}
.ccb-details p { margin: 4px 0; }
.ccb-details a { color: #818cf8; }
.ccb-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}
.ccb-btn {
  padding: 10px 20px;
  border-radius: 6px;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  white-space: nowrap;
}
.ccb-btn-secondary {
  background: #222;
  color: #ccc;
  border-color: #444;
}
.ccb-btn-secondary:hover { background: #333; }
.ccb-btn-primary {
  background: #818cf8;
  color: #111;
}
.ccb-btn-primary:hover { background: #a5b4fc; }

/* Footer settings link */
.ccb-settings-link {
  color: inherit;
  text-decoration: underline;
  cursor: pointer;
  background: none;
  border: none;
  font: inherit;
  padding: 0;
}
`;function g(){if(document.getElementById(`ccb-styles`))return;let e=document.createElement(`style`);e.id=`ccb-styles`,e.textContent=h,document.head.appendChild(e)}g(),document.readyState===`loading`?document.addEventListener(`DOMContentLoaded`,()=>p()):p();export{s as n,m as r,a as t};