// Guide page JavaScript

// Mobile menu toggle
document.addEventListener("DOMContentLoaded", () => {
  // Add mobile menu button if on mobile
  if (window.innerWidth <= 900) {
    const sidebar = document.querySelector(".guide-sidebar");
    const content = document.querySelector(".guide-content");
    
    // Create menu button
    const menuBtn = document.createElement("button");
    menuBtn.className = "mobile-menu-btn";
    menuBtn.innerHTML = "☰ Menu";
    menuBtn.setAttribute("aria-label", "Toggle navigation menu");
    
    // Insert at top of content
    content.insertBefore(menuBtn, content.firstChild);
    
    // Create overlay
    const overlay = document.createElement("div");
    overlay.className = "sidebar-overlay";
    document.body.appendChild(overlay);
    
    // Toggle sidebar
    menuBtn.addEventListener("click", () => {
      sidebar.classList.toggle("open");
      overlay.classList.toggle("active");
    });
    
    overlay.addEventListener("click", () => {
      sidebar.classList.remove("open");
      overlay.classList.remove("active");
    });
    
    // Add styles for mobile menu
    const style = document.createElement("style");
    style.textContent = `
      .mobile-menu-btn {
        display: block;
        margin-bottom: 1.5rem;
        padding: 0.75rem 1rem;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(166, 193, 225, 0.15);
        border-radius: 8px;
        color: #e8f0f8;
        font-family: inherit;
        font-size: 0.9rem;
        cursor: pointer;
      }
      .sidebar-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 999;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s;
      }
      .sidebar-overlay.active {
        opacity: 1;
        pointer-events: auto;
      }
    `;
    document.head.appendChild(style);
  }
  
  // Highlight current nav link based on URL
  const currentPath = window.location.pathname;
  document.querySelectorAll(".nav-link").forEach(link => {
    if (link.getAttribute("href") === currentPath) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
});
