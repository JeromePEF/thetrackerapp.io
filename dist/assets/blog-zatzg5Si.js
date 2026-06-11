import"./modulepreload-polyfill-BJzIe6l4.js";import{i as e}from"./feature-flags-B-kyf4wl.js";/* empty css                   */var t=`https://api.thetrackerapp.io`,n=[],r=1,i=1,a=``,o=``,s=document.getElementById(`blogPostsList`),c=document.getElementById(`blogSearch`),l=document.getElementById(`blogTagFilter`),u=document.getElementById(`blogPagination`),d=document.getElementById(`blogPrevPage`),f=document.getElementById(`blogNextPage`),p=document.getElementById(`blogPageInfo`),m=document.getElementById(`blogCreateSection`),h=document.getElementById(`blogCreateForm`),g=document.getElementById(`blogCreateStatus`);async function _(){let e=localStorage.getItem(`tracker.auth.session`);if(!e)return!1;try{let n=await fetch(`${t}/api/user/role`,{headers:{Authorization:`Bearer ${e}`}});if(n.ok)return(await n.json()).role===`admin`}catch{}return!1}async function v(){s.innerHTML=`<p class="loading-state">Loading posts...</p>`;try{let e=new URLSearchParams({page:r,limit:12});a&&e.set(`tag`,a),o&&e.set(`search`,o);let s=await fetch(`${t}/api/blog/posts?${e}`);if(!s.ok)throw Error(`Failed to fetch posts`);let c=await s.json();n=c.posts||[],i=c.totalPages||1,y(),b(),x(c.tags||[])}catch(e){console.error(`Error fetching posts:`,e),s.innerHTML=`
      <p class="loading-state">Unable to load blog posts. Please try again later.</p>
    `}}function y(){if(!n.length){s.innerHTML=`
      <p class="loading-state">No posts found${o?` for "${o}"`:``}.</p>
    `;return}s.innerHTML=n.map(e=>`
    <article class="blog-post-card">
      ${e.featuredImage?`
        <div class="blog-post-image">
          <img src="${e.featuredImage}" alt="${e.title}" loading="lazy" />
        </div>
      `:``}
      <div class="blog-post-content">
        <div class="blog-post-meta">
          <time datetime="${e.publishedAt}">${S(e.publishedAt)}</time>
          ${e.author?`<span>by ${e.author}</span>`:``}
        </div>
        <h3><a href="/blog/${e.slug}">${e.title}</a></h3>
        <p class="blog-post-excerpt">${e.excerpt}</p>
        ${e.tags?.length?`
          <div class="blog-post-tags">
            ${e.tags.map(e=>`<span class="blog-tag">${e}</span>`).join(``)}
          </div>
        `:``}
      </div>
    </article>
  `).join(``)}function b(){if(i<=1){u.hidden=!0;return}u.hidden=!1,d.disabled=r<=1,f.disabled=r>=i,p.textContent=`Page ${r} of ${i}`}function x(e){let t=l.value;l.innerHTML=`<option value="">All Tags</option>`,e.forEach(e=>{let n=document.createElement(`option`);n.value=e,n.textContent=e,e===t&&(n.selected=!0),l.appendChild(n)})}function S(e){return new Intl.DateTimeFormat(`en-US`,{month:`short`,day:`numeric`,year:`numeric`}).format(new Date(e))}async function C(e){e.preventDefault();let n=new FormData(h),r=localStorage.getItem(`tracker.auth.session`),i={title:n.get(`title`),slug:n.get(`slug`),excerpt:n.get(`excerpt`),content:n.get(`content`),tags:n.get(`tags`)?.split(`,`).map(e=>e.trim()).filter(Boolean),featuredImage:n.get(`featuredImage`)||null};g.textContent=`Publishing...`,g.className=`form-status`;try{let e=await fetch(`${t}/api/blog/posts`,{method:`POST`,headers:{"Content-Type":`application/json`,Authorization:`Bearer ${r}`},body:JSON.stringify(i)});if(!e.ok){let t=await e.json();throw Error(t.message||`Failed to create post`)}g.textContent=`Post published successfully!`,g.className=`form-status success`,h.reset(),v()}catch(e){g.textContent=e.message,g.className=`form-status error`}}c?.addEventListener(`input`,e=>{o=e.target.value,r=1,v()}),l?.addEventListener(`change`,e=>{a=e.target.value,r=1,v()}),d?.addEventListener(`click`,()=>{r>1&&(r--,v())}),f?.addEventListener(`click`,()=>{r<i&&(r++,v())}),h?.addEventListener(`submit`,C),document.getElementById(`blogTitle`)?.addEventListener(`input`,e=>{let t=document.getElementById(`blogSlug`);t&&!t.dataset.manual&&(t.value=e.target.value.toLowerCase().replace(/[^a-z0-9]+/g,`-`).replace(/^-|-$/g,``))}),document.getElementById(`blogSlug`)?.addEventListener(`input`,e=>{e.target.dataset.manual=`true`});async function w(){await e();let t=localStorage.getItem(`tracker.authenticated`)===`true`;document.getElementById(`loginLink`).hidden=t,document.getElementById(`dashboardLink`).hidden=!t,await _()&&m&&(m.hidden=!1),v()}w();