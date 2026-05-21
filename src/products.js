// Products Page JavaScript
import { initFeatureFlags } from "./feature-flags.js";

// DOM Elements
const productCategoryFilter = document.getElementById("productCategoryFilter");
const productBrandFilter = document.getElementById("productBrandFilter");
const productsGrid = document.getElementById("productsGrid");

// Filter products
function filterProducts() {
  const category = productCategoryFilter?.value || "";
  const brand = productBrandFilter?.value || "";

  const products = productsGrid?.querySelectorAll(".product-card") || [];

  products.forEach((product) => {
    const productCategory = product.dataset.category || "";
    const productBrand = product.dataset.brand || "";

    const matchesCategory = !category || productCategory === category;
    const matchesBrand = !brand || productBrand === brand;

    product.hidden = !(matchesCategory && matchesBrand);
  });
}

// Handle product buy click
function handleBuyClick(e) {
  const productId = e.target.dataset.product;
  if (productId) {
    // Track click and redirect to affiliate link
    // In production, this would go through an affiliate link service
    console.log("Product clicked:", productId);

    // For now, show a placeholder message
    alert("Product links coming soon! Check back later.");
  }
}

// Event listeners
productCategoryFilter?.addEventListener("change", filterProducts);
productBrandFilter?.addEventListener("change", filterProducts);

productsGrid?.addEventListener("click", (e) => {
  if (e.target.classList.contains("product-buy-btn")) {
    e.preventDefault();
    handleBuyClick(e);
  }
});

// Initialize
async function init() {
  await initFeatureFlags();

  // Check auth state
  const isAuthenticated = localStorage.getItem("tracker.authenticated") === "true";
  document.getElementById("loginLink").hidden = isAuthenticated;
  document.getElementById("dashboardLink").hidden = !isAuthenticated;
}

init();
