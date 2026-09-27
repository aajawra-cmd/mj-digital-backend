const API_URL = 'https://mj-digital-backend-3.onrender.com/api';

// Universal Safe Category Matcher (Strict Category Mapping)
function matchCategory(productCategory, targetTab) {
  const prodCat = (productCategory || '').toLowerCase().trim();
  const target = (targetTab || '').toLowerCase().trim();

  if (target === 'services' || target === 'service') {
    return prodCat === 'services' || prodCat === 'service' || prodCat === 'it services';
  }

  if (target === 'fashion') {
    return prodCat === 'fashion' || prodCat === 'clothing' || prodCat === 'apparel';
  }

  if (target === 'mobile' || target === 'mobiles') {
    return prodCat === 'mobile' || prodCat === 'mobiles' || prodCat === 'smartphone';
  }

  if (target === 'electronics' || target === 'electronic') {
    return prodCat === 'electronics' || prodCat === 'electronic' || prodCat === 'laptops';
  }

  return prodCat === target;
}

// ==========================================
// 1. PRODUCTS RENDER (Electronics, Mobile, Fashion, Services) - LIVE MONGODB
// ==========================================
async function loadMainSiteProducts() {
  try {
    const response = await fetch(`${API_URL}/products`);
    if (!response.ok) return;

    const result = await response.json();
    const products = Array.isArray(result) ? result : (result.data || []);

    // 1. Electronics Render
    const elecContainer = document.getElementById('electronicsProductsGrid');
    if (elecContainer) {
      const electronics = products.filter(p => matchCategory(p.category, 'electronics'));
      elecContainer.innerHTML = electronics.length > 0 
        ? electronics.map(p => createProductCard(p)).join('') 
        : '<p class="text-gray-400 p-4 text-sm">No electronics available.</p>';
    }

    // 2. Mobile Render
    const mobileContainer = document.getElementById('mobileProductsGrid');
    if (mobileContainer) {
      const mobiles = products.filter(p => matchCategory(p.category, 'mobile'));
      mobileContainer.innerHTML = mobiles.length > 0 
        ? mobiles.map(p => createProductCard(p)).join('') 
        : '<p class="text-gray-400 p-4 text-sm">No mobiles available.</p>';
    }

    // 3. Fashion Render
    const fashionContainer = document.getElementById('fashionProductsGrid');
    if (fashionContainer) {
      const fashion = products.filter(p => matchCategory(p.category, 'fashion'));
      fashionContainer.innerHTML = fashion.length > 0 
        ? fashion.map(p => createProductCard(p)).join('') 
        : '<p class="text-gray-400 p-4 text-sm">No fashion items available.</p>';
    }

    // 4. Services Render
    const serviceContainer = document.getElementById('servicesProductsGrid') || document.getElementById('serviceProductsGrid');
    if (serviceContainer) {
      const services = products.filter(p => matchCategory(p.category, 'service'));
      serviceContainer.innerHTML = services.length > 0 
        ? services.map(p => createProductCard(p)).join('') 
        : '<p class="text-gray-400 p-4 text-sm">No services available.</p>';
    }

  } catch (err) {
    console.error("Error loading products:", err);
  }
}

// Helper: Product Card HTML (Clickable to Detail View)
function createProductCard(p) {
  const title = (p.name || p.title || 'Product').replace(/'/g, "\\'");
  const price = p.price || p.basePrice || 0;
  const img = p.imageUrl || p.image || (p.images && p.images[0]) || 'https://placehold.co/300x300?text=No+Image';
  const brand = p.brand || '';
  const category = (p.category || 'Product').toUpperCase();

  return `
    <div class="bg-white rounded-2xl shadow-sm hover:shadow-md border border-gray-100 p-4 flex flex-col justify-between transition">
      <div onclick="openProductDetail('${p._id}')" class="w-full h-48 bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center p-2 mb-3 cursor-pointer">
        <img src="${img}" class="h-full w-full object-contain hover:scale-105 transition" alt="${title}" onerror="this.src='https://placehold.co/300x300?text=No+Image'">
      </div>
      <div>
        <span class="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-blue-50 text-blue-600 mb-1">
          ${category}
        </span>
        ${brand ? `<p class="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">${brand}</p>` : ''}
        <h4 onclick="openProductDetail('${p._id}')" class="font-bold text-gray-800 text-base mb-2 line-clamp-1 cursor-pointer hover:text-blue-600">${title}</h4>
      </div>
      <div class="pt-3 border-t border-gray-50 flex items-center justify-between">
        <span class="text-lg font-black text-blue-600">₹${Number(price).toLocaleString('en-IN')}</span>
        <button 
          type="button" 
          onclick="openProductDetail('${p._id}')" 
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition active:scale-95"
        >
          View Options
        </button>
      </div>
    </div>
  `;
}

// ==========================================
// 2. TRAVEL PACKAGES FRONTEND RENDER
// ==========================================
async function loadMainSiteTravels() {
  const container = document.getElementById('travelPackagesGrid');
  if (!container) return;

  try {
    const res = await fetch(`${API_URL}/travel-packages`);
    const data = await res.json();
    const pkgs = Array.isArray(data) ? data : (data.data || []);

    if (pkgs.length === 0) return;

    container.innerHTML = pkgs.map(pkg => {
      const title = (pkg.title || 'Travel Package').replace(/'/g, "\\'");
      const price = pkg.pricingTiers?.standard?.price || pkg.price || 0;
      const img = (pkg.images && pkg.images.length > 0) ? pkg.images[0] : 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500';
      const days = pkg.duration?.days || 1;
      const nights = pkg.duration?.nights || 1;

      return `
        <div class="col-md-4 col-sm-6 mb-4">
          <div class="card h-100 shadow-sm border-0 rounded-4 overflow-hidden">
            <img src="${img}" class="card-img-top" style="height: 180px; object-fit: cover;" alt="${title}">
            <div class="card-body p-3 flex-column d-flex justify-content-between">
              <div>
                <span class="badge bg-warning text-dark mb-1 text-uppercase">${pkg.destination || 'Tour'}</span>
                <h5 class="fw-bold text-dark mb-1">${title}</h5>
                <p class="text-muted small">${days} Days / ${nights} Nights</p>
              </div>
              <div class="d-flex align-items-center justify-content-between mt-3 pt-2 border-top">
                <span class="fs-5 fw-bold text-primary">₹${Number(price).toLocaleString('en-IN')}</span>
                <button 
                  type="button" 
                  onclick="handleBookNow('${pkg._id}', '${title}', ${price})" 
                  class="btn btn-primary px-3 py-1.5 rounded-pill fw-semibold"
                >
                  Book Now
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error("Error loading travel packages:", err);
  }
}

// ==========================================
// 3. ACTION HANDLERS (Orders & Bookings)
// ==========================================
async function handleBuyNow(productId, title, price) {
  const customerName = prompt('Enter Customer Name:', 'Guest Buyer');
  if (!customerName) return;

  const customerPhone = prompt('Enter Phone Number:', '9876543210');
  if (!customerPhone) return;

  const payload = {
    orderType: 'Product',
    customer: {
      name: customerName.trim(),
      email: `${customerName.toLowerCase().replace(/\s+/g, '')}@mjdigital.com`,
      phone: customerPhone.trim()
    },
    itemDetails: {
      title: title,
      tierOrCategory: 'General Order',
      quantity: 1
    },
    totalAmount: Number(price) || 0
  };

  await sendOrderToBackend(payload, `Order placed successfully for ${title}!`);
}

async function handleBookNow(packageId, title, price) {
  const customerName = prompt(`Booking for: ${title}\nEnter Traveler Name:`, 'Guest Traveler');
  if (!customerName) return;

  const customerPhone = prompt('Enter Contact Number:', '9876543210');
  if (!customerPhone) return;

  const payload = {
    orderType: 'Travel',
    customer: {
      name: customerName.trim(),
      email: `${customerName.toLowerCase().replace(/\s+/g, '')}@mjdigital.com`,
      phone: customerPhone.trim()
    },
    itemDetails: {
      title: title,
      tierOrCategory: 'Standard Tier',
      quantity: 1
    },
    totalAmount: Number(price) || 0
  };

  await sendOrderToBackend(payload, `✈️ Booking Confirmed for ${title}!`);
}

async function sendOrderToBackend(payload, successMsg) {
  try {
    const res = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (res.ok && data.success) {
      alert(`🎉 ${successMsg}\nID: #${data.data._id.slice(-6).toUpperCase()}\nAmount: ₹${Number(payload.totalAmount).toLocaleString('en-IN')}`);
    } else {
      alert('Order fail ho gaya: ' + (data.message || 'Server error'));
    }
  } catch (err) {
    console.error('Checkout error:', err);
    alert('Server connection error while placing order.');
  }
}

// ==========================================
// 4. LIVE CMS POLICIES & FAQ FETCHER
// ==========================================
let sitePoliciesCache = {};

async function fetchAllSitePolicies() {
  try {
    const res = await fetch('https://mj-digital-backend-3.onrender.com/api/cms/policies');
    const result = await res.json();
    const data = Array.isArray(result) ? result : (result.data || []);

    if (Array.isArray(data)) {
      data.forEach(item => {
        if (item.policyKey && item.content) {
          sitePoliciesCache[item.policyKey] = item.content;
          localStorage.setItem('mj_cms_' + item.policyKey, item.content);
        }
      });
    }
  } catch (err) {
    console.warn('Backend fetch failed, using local cache:', err);
  }

  injectPoliciesIntoDOM();
}

function injectPoliciesIntoDOM() {
  const keys = ['terms', 'privacy', 'refund', 'additional', 'faq'];

  keys.forEach(key => {
    const content = sitePoliciesCache[key] || localStorage.getItem('mj_cms_' + key);
    if (!content) return;

    const target = document.getElementById(`live-${key}-content`) || 
                   document.getElementById(`policy-${key}-content`) ||
                   document.getElementById(`${key}-content`);
    if (target) {
      target.innerHTML = content;
    }
  });

  document.querySelectorAll('div, p, span').forEach(el => {
    if (el.children.length === 0 && el.innerText) {
      const text = el.innerText.trim();

      if (text.includes('Loading policy details...')) {
        const sectionText = el.closest('div[id*="page-"], section, .container')?.innerText?.toLowerCase() || '';
        
        let matchedContent = sitePoliciesCache['terms'] || localStorage.getItem('mj_cms_terms');
        if (sectionText.includes('refund') || sectionText.includes('cancellation')) {
          matchedContent = sitePoliciesCache['refund'] || localStorage.getItem('mj_cms_refund');
        } else if (sectionText.includes('privacy')) {
          matchedContent = sitePoliciesCache['privacy'] || localStorage.getItem('mj_cms_privacy');
        } else if (sectionText.includes('additional')) {
          matchedContent = sitePoliciesCache['additional'] || localStorage.getItem('mj_cms_additional');
        }

        if (matchedContent) {
          el.innerHTML = matchedContent;
        }
      }

      if (text.includes('Loading FAQs...')) {
        const faqContent = sitePoliciesCache['faq'] || localStorage.getItem('mj_cms_faq');
        if (faqContent) {
          el.innerHTML = faqContent;
        }
      }
    }
  });
}

window.showPolicyPage = function(pageKey) {
  let targetId = `page-${pageKey}`;
  if (pageKey === 'refund') targetId = 'page-cancellation';
  if (pageKey === 'faq') targetId = 'page-faq';

  document.querySelectorAll('.page-view').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(targetId);
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  setTimeout(injectPoliciesIntoDOM, 20);
};

document.addEventListener('DOMContentLoaded', fetchAllSitePolicies);
window.addEventListener('focus', fetchAllSitePolicies);
window.fetchAllSitePolicies = fetchAllSitePolicies;
window.injectPoliciesIntoDOM = injectPoliciesIntoDOM;

// ==========================================
// 5. LIVE CUSTOMER ORDERS & SHIPMENT TRACKING
// ==========================================
let userOrders = [];

async function loadCustomerOrders() {
  const tbody = document.getElementById('ordersTableBody');
  if (!tbody) return;

  try {
    const res = await fetch(`${API_URL}/orders`);
    const result = await res.json();
    const orders = Array.isArray(result) ? result : (result.data || []);

    userOrders = orders.map(ord => {
      const isTravel = (ord.orderType === 'Travel' || ord.orderType === 'travel');
      const formattedDate = new Date(ord.createdAt || Date.now()).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });

      let badge = 'bg-primary';
      if (ord.status === 'Confirmed') badge = 'bg-info text-dark';
      else if (ord.status === 'In Transit') badge = 'bg-primary';
      else if (ord.status === 'Delivered') badge = 'bg-success';
      else if (ord.status === 'Cancelled') badge = 'bg-danger';
      else badge = 'bg-warning text-dark';

      return {
        id: ord._id,
        shortId: ord._id.slice(-6).toUpperCase(),
        type: isTravel ? 'Travel' : 'Product',
        title: ord.itemDetails?.title || (isTravel ? 'Tour Booking' : 'Store Product'),
        date: formattedDate,
        price: `₹${Number(ord.totalAmount || 0).toLocaleString('en-IN')}`,
        status: ord.status || 'Pending',
        badge: badge,
        createdAt: ord.createdAt
      };
    });

    if (userOrders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">No past orders or bookings found.</td></tr>`;
      return;
    }

    tbody.innerHTML = userOrders.map(o => `
      <tr>
        <td><span class="badge ${o.badge}">${o.type}</span></td>
        <td class="fw-bold text-dark">${o.title}</td>
        <td>${o.date}</td>
        <td class="fw-semibold text-primary">${o.price}</td>
        <td><span class="badge ${o.badge}">${o.status}</span></td>
        <td class="text-end">
          <button class="btn btn-outline-primary btn-sm rounded-pill px-3" onclick="openLiveTracking('${o.id}')">
            <i class="fa-solid fa-location-arrow me-1"></i> Track Live
          </button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error fetching customer orders:', err);
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Failed to load order history.</td></tr>`;
    }
  }
}

function openLiveTracking(orderId) {
  const order = userOrders.find(o => o.id === orderId);
  if (!order) return;

  document.getElementById('trackIdText').innerText = `#TRK-${order.shortId}`;
  document.getElementById('trackItemTitle').innerText = order.title;
  document.getElementById('trackItemDate').innerText = 'Order Date: ' + order.date;

  const currentStatus = order.status || 'Pending';

  const steps = [
    { key: 'Pending', title: 'Order Placed', time: order.date },
    { key: 'Confirmed', title: 'Order Confirmed & Processed', time: 'In Warehouse' },
    { key: 'In Transit', title: 'In Transit / Dispatched', time: 'Out for Delivery' },
    { key: 'Delivered', title: 'Delivered Successfully', time: 'Destination Reached' }
  ];

  const statusHierarchy = ['Pending', 'Confirmed', 'In Transit', 'Delivered'];
  const currentIndex = statusHierarchy.indexOf(currentStatus);

  const timelineContainer = document.getElementById('trackingTimelineContainer');
  if (!timelineContainer) return;

  if (currentStatus === 'Cancelled') {
    timelineContainer.innerHTML = `
      <div class="p-3 bg-danger bg-opacity-10 border border-danger rounded-3 text-danger">
        <h6 class="fw-bold mb-1"><i class="fa-solid fa-circle-xmark me-2"></i>Order Cancelled</h6>
        <p class="small mb-0">This booking or order was cancelled. Please reach out to customer support for refunds.</p>
      </div>
    `;
  } else {
    timelineContainer.innerHTML = steps.map((step, idx) => {
      const isCompleted = idx <= currentIndex;
      const isActive = idx === currentIndex;

      return `
        <div class="tracking-step ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}">
          <div class="tracking-icon">
            <i class="fa-solid ${isCompleted ? 'fa-check' : 'fa-circle-dot'}"></i>
          </div>
          <h6 class="fw-bold mb-1 fs-6">${step.title}</h6>
          <span class="small text-muted">${step.time}</span>
        </div>
      `;
    }).join('');
  }

  if (window.trackingModal) {
    window.trackingModal.show();
  }
}

window.loadCustomerOrders = loadCustomerOrders;
window.openLiveTracking = openLiveTracking;


// =========================================================================
// 6. LIVE PRODUCT DETAIL & STRICT DYNAMIC VARIANT / AUTO-HIDE ENGINE
// =========================================================================
let currentActiveProduct = null;
let currentSelection = {
  color: '',
  ram: '',
  storage: '',
  size: '',
  config: ''
};

async function initLiveProductPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');
  if (productId) {
    openProductDetail(productId);
  }
}

async function openProductDetail(productId) {
  try {
    const res = await fetch(`${API_URL}/products/${productId}`);
    const result = await res.json();
    const product = result.data || result;

    if (!product) return;
    currentActiveProduct = product;

    // View switch: Show Detail Page Container
    const detailContainer = document.getElementById('page-item-details') || document.getElementById('productDetailPage') || document.getElementById('page-product-detail');
    if (detailContainer) {
      document.querySelectorAll('.page-view').forEach(p => p.classList.remove('active'));
      detailContainer.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // 1. Text Info Set
    const titleEl = document.getElementById('pageDetailTitle') || document.getElementById('productTitle');
    const titleText = product.title || product.name || 'Untitled';
    if (titleEl) titleEl.innerText = titleText;

    const descEl = document.getElementById('pageDetailDesc') || document.getElementById('productDescription') || document.getElementById('productDesc');
    if (descEl) descEl.innerText = product.description || 'No description provided.';

    // 2. Images Setup
    const images = (product.images && product.images.length > 0) 
      ? product.images 
      : [product.imageUrl || 'https://placehold.co/500x500?text=Product'];

    const mainMediaBox = document.getElementById('pageDetailMediaBox');
    if (mainMediaBox) {
      mainMediaBox.innerHTML = `<img id="mainProductImage" src="${images[0]}" class="img-fluid rounded-4" style="max-height: 380px; width: 100%; object-fit: contain;">`;
    }

    const thumbContainer = document.getElementById('pageDetailThumbnails') || document.getElementById('galleryThumbnails');
    if (thumbContainer) {
      if (images.length > 1) {
        thumbContainer.innerHTML = images.map(img => `
          <div onclick="document.querySelector('#pageDetailMediaBox img').src='${img}'" class="v-thumb-item" style="width: 58px; height: 58px; border-radius: 8px; border: 2px solid #cbd5e1; overflow: hidden; cursor: pointer; background: #fff;">
            <img src="${img}" style="width: 100%; height: 100%; object-fit: cover;">
          </div>
        `).join('');
      } else {
        thumbContainer.innerHTML = '';
      }
    }

    // 3. Render Pure Dynamic Variants (Directly into pageDetailVariantsContainer)
    renderStrictDynamicVariants(product);

    // 4. Initial Live Price Set
    calculateAndRenderLivePrice();

  } catch (err) {
    console.error('Error opening product details:', err);
  }
}

function renderStrictDynamicVariants(item) {
  const container = document.getElementById('pageDetailVariantsContainer');
  if (!container) return;

  let parsed = item.variants;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch(e) { parsed = {}; }
  }

  let configs = [];
  let opts = {};

  if (Array.isArray(parsed)) {
    configs = parsed;
  } else if (typeof parsed === 'object' && parsed !== null) {
    configs = parsed.configurations || [];
    opts = parsed.variantOptions || {};
  }

  // AUTO-HIDE: Agar backend me koi variant row/option nahi hai, to area ko poora blank rakhein
  if (configs.length === 0 && (!opts.colors || opts.colors.length === 0)) {
    container.innerHTML = '';
    return;
  }

  // Safe unique extract
  const colors = (opts.colors && opts.colors.length > 0) ? opts.colors : [...new Set(configs.map(c => c.color || c.colour).filter(Boolean))];
  const rams = (opts.ram && opts.ram.length > 0) ? opts.ram : [...new Set(configs.map(c => c.ram).filter(Boolean))];
  const roms = (opts.storage && opts.storage.length > 0) ? opts.storage : [...new Set(configs.map(c => c.storage || c.rom).filter(Boolean))];
  const sizes = (opts.sizes && opts.sizes.length > 0) ? opts.sizes : [...new Set(configs.map(c => c.size).filter(Boolean))];

  // Combined Configuration (e.g. Laptop RAM + Storage)
  const combinedConfigs = configs.filter(c => c.ram && (c.storage || c.rom)).map(c => `${c.ram} / ${c.storage || c.rom}`);
  const uniqueCombined = [...new Set(combinedConfigs)];

  let html = '';
  currentSelection = { color: '', ram: '', storage: '', size: '', config: '' };

  // 1. Fashion Size: Sirf tab dikhega jab size saved ho
  if (sizes.length > 0) {
    currentSelection['size'] = sizes[0];
    html += `
      <div class="mb-3 variant-block-dynamic" data-attr="size">
        <label class="small fw-bold text-dark d-block mb-1.5">Select Size: <span class="text-primary selected-val">${sizes[0]}</span></label>
        <div class="d-flex flex-wrap gap-2">
          ${sizes.map((s, idx) => `<button type="button" class="variant-pill ${idx === 0 ? 'active' : ''}" onclick="onDynamicVariantSelect('size', '${s}')">${s}</button>`).join('')}
        </div>
      </div>
    `;
  }

  // 2. Laptop Configuration (RAM/Storage combination)
  if (uniqueCombined.length > 0) {
    currentSelection['config'] = uniqueCombined[0];
    html += `
      <div class="mb-3 variant-block-dynamic" data-attr="config">
        <label class="small fw-bold text-dark d-block mb-1.5">Configuration (RAM/Storage): <span class="text-primary selected-val">${uniqueCombined[0]}</span></label>
        <div class="d-flex flex-wrap gap-2">
          ${uniqueCombined.map((cfg, idx) => `<button type="button" class="variant-pill ${idx === 0 ? 'active' : ''}" onclick="onDynamicVariantSelect('config', '${cfg}')">${cfg}</button>`).join('')}
        </div>
      </div>
    `;
  } else {
    // Separate RAM block
    if (rams.length > 0) {
      currentSelection['ram'] = rams[0];
      html += `
        <div class="mb-3 variant-block-dynamic" data-attr="ram">
          <label class="small fw-bold text-dark d-block mb-1.5">RAM: <span class="text-primary selected-val">${rams[0]}</span></label>
          <div class="d-flex flex-wrap gap-2">
            ${rams.map((r, idx) => `<button type="button" class="variant-pill ${idx === 0 ? 'active' : ''}" onclick="onDynamicVariantSelect('ram', '${r}')">${r}</button>`).join('')}
          </div>
        </div>
      `;
    }
    // Separate Storage block
    if (roms.length > 0) {
      currentSelection['storage'] = roms[0];
      html += `
        <div class="mb-3 variant-block-dynamic" data-attr="storage">
          <label class="small fw-bold text-dark d-block mb-1.5">Storage (ROM): <span class="text-primary selected-val">${roms[0]}</span></label>
          <div class="d-flex flex-wrap gap-2">
            ${roms.map((rom, idx) => `<button type="button" class="variant-pill ${idx === 0 ? 'active' : ''}" onclick="onDynamicVariantSelect('storage', '${rom}')">${rom}</button>`).join('')}
          </div>
        </div>
      `;
    }
  }

  // 3. Colour block
  if (colors.length > 0) {
    currentSelection['color'] = colors[0];
    html += `
      <div class="mb-3 variant-block-dynamic" data-attr="color">
        <label class="small fw-bold text-dark d-block mb-1.5">Colour: <span class="text-primary selected-val">${colors[0]}</span></label>
        <div class="d-flex flex-wrap gap-2">
          ${colors.map((c, idx) => `<button type="button" class="variant-pill ${idx === 0 ? 'active' : ''}" onclick="onDynamicVariantSelect('color', '${c}')">${c}</button>`).join('')}
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
}

function onDynamicVariantSelect(attrKey, val) {
  currentSelection[attrKey] = val;
  const block = document.querySelector(`.variant-block-dynamic[data-attr="${attrKey}"]`);
  if (block) {
    block.querySelectorAll('.variant-pill').forEach(p => {
      p.classList.toggle('active', p.innerText.trim() === val);
    });
    const span = block.querySelector('.selected-val');
    if (span) span.innerText = val;
  }
  calculateAndRenderLivePrice();
}

function calculateAndRenderLivePrice() {
  if (!currentActiveProduct) return;

  let parsed = currentActiveProduct.variants;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch(e) { parsed = {}; }
  }

  const configs = Array.isArray(parsed) ? parsed : (parsed?.configurations || []);
  if (!configs || configs.length === 0) {
    const priceEl = document.getElementById('pageDetailPrice') || document.getElementById('displayPrice');
    if (priceEl) priceEl.innerText = `₹${Number(currentActiveProduct.price || 0).toLocaleString('en-IN')}`;
    return;
  }

  // Match current selections with backend configuration
  const matched = configs.find(c => {
    let ok = true;
    const cColor = c.color || c.colour;
    const cRom = c.storage || c.rom;

    if (currentSelection['color'] && cColor) {
      if (String(cColor).toLowerCase() !== String(currentSelection['color']).toLowerCase()) ok = false;
    }
    if (currentSelection['size'] && c.size) {
      if (String(c.size).toLowerCase() !== String(currentSelection['size']).toLowerCase()) ok = false;
    }
    if (currentSelection['config']) {
      const [r, s] = currentSelection['config'].split(' / ');
      if (c.ram && String(c.ram).toLowerCase() !== String(r).toLowerCase()) ok = false;
      if (cRom && String(cRom).toLowerCase() !== String(s).toLowerCase()) ok = false;
    } else {
      if (currentSelection['ram'] && c.ram) {
        if (String(c.ram).toLowerCase() !== String(currentSelection['ram']).toLowerCase()) ok = false;
      }
      if (currentSelection['storage'] && cRom) {
        if (String(cRom).toLowerCase() !== String(currentSelection['storage']).toLowerCase()) ok = false;
      }
    }
    return ok;
  });

  const targetPrice = (matched && matched.price) ? matched.price : (configs[0]?.price || currentActiveProduct.price || 0);
  const priceEl = document.getElementById('pageDetailPrice') || document.getElementById('displayPrice');
  if (priceEl) {
    priceEl.innerText = `₹${Number(targetPrice).toLocaleString('en-IN')}`;
  }
}

// Global Exports
window.openProductDetail = openProductDetail;
window.onDynamicVariantSelect = onDynamicVariantSelect;

// ==========================================
// 7. AUTO INITIALIZATION (HOME & DETAIL CHECK)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  loadMainSiteProducts();
  loadMainSiteTravels();
  initLiveProductPage();

  const homeView = document.getElementById('page-home');
  const urlParams = new URLSearchParams(window.location.search);
  if (homeView && !urlParams.get('id')) {
    homeView.classList.add('active');
  }
});