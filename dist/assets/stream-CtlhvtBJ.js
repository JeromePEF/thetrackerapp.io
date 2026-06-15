import"./modulepreload-polyfill-B7MX_D3K.js";/* empty css               */import{a as e}from"./feature-flags-BD13vgcb.js";function t(e){if(!e)return null;try{let t=new URL(e);if(t.hostname.includes(`youtube.com`)||t.hostname.includes(`youtu.be`)){if(t.pathname.startsWith(`/live/`))return t.pathname.split(`/`)[2];if(t.pathname.startsWith(`/watch`))return t.searchParams.get(`v`);if(t.hostname===`youtu.be`)return t.pathname.slice(1);let e=t.pathname.split(`/`).filter(Boolean);if(e[0]===`embed`||e[0]===`live`)return e[1]}}catch{return null}return null}function n(e){return`https://www.youtube.com/embed/${e}?origin=https%3A%2F%2Fthetrackerapp.io`}function r(e){let r=document.getElementById(`streamEmbedWrapper`),i=document.getElementById(`streamOffline`);if(!r)return;let a=t(e);if(!a){i&&(i.hidden=!1);return}i&&(i.hidden=!0),r.innerHTML=`
    <iframe
      src="${n(a)}"
      title="The Tracker App Live Stream"
      allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowfullscreen>
    </iframe>
  `}async function i(){let t=await e();if(t.maintenanceMode){let e=document.getElementById(`maintenanceOverlay`),n=document.getElementById(`maintenanceMessage`);e&&(e.hidden=!1,n&&t.maintenanceMessage&&(n.textContent=t.maintenanceMessage))}r(t?.youtubeStreamUrl||``)}i();