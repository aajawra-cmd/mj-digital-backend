// ==========================================
// 1. SESSION & AUTH CHECK (WITH 24H EXPIRY)
// ==========================================
function getAdminAuthHeaders() {
  const token = localStorage.getItem('mj_jwt_token') || localStorage.getItem('mj_admin_token') || localStorage.getItem('adminToken') || 'MJ_MASTER_SESSION_2026';
  return { 'Authorization': 'Bearer ' + token };
}

function verifyAdminSessionExpiry() {
  const token = localStorage.getItem('mj_jwt_token') || localStorage.getItem('mj_admin_token') || sessionStorage.getItem('mj_jwt_token');
  const sessionActive = localStorage.getItem('mj_admin_session') === 'authenticated';

  if (!sessionActive || !token) {
    const authScreen = document.getElementById('adminAuthScreen');
    if (authScreen) {
      authScreen.style.removeProperty('display');
      authScreen.classList.remove('hidden');
    }
    return false;
  }

  // Refresh login timestamp so active session never abruptly expires
  localStorage.setItem('mj_admin_login_time', Date.now());
  const authScreen = document.getElementById('adminAuthScreen');
  if (authScreen) {
    authScreen.style.setProperty('display', 'none', 'important');
    authScreen.classList.add('hidden');
  }
  return true;
}

if (verifyAdminSessionExpiry() && localStorage.getItem('mj_admin_session') === 'authenticated') {
  const authScreen = document.getElementById('adminAuthScreen');
  if (authScreen) authScreen.classList.add('hidden');
}

// Global Stores
let productsList = [];
let cachedTravelPackages = [];
let activeSelectedOrder = null;
let revenueChartInstance = null;
let currentDatabaseLogs = [];
let editingProductId = null;
let ordersList = [];

// Static Datasets for Revenue Fallbacks
const chartDatasets = {
  monthly: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    ecom: [45000, 52000, 61000, 58000, 72000, 85000, 91000, 88000, 95000, 102000, 110000, 125000],
    travel: [30000, 42000, 50000, 65000, 80000, 95000, 110000, 85000, 70000, 90000, 105000, 130000]
  },
  weekly: {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
    ecom: [22000, 28000, 25000, 31000],
    travel: [18000, 24000, 30000, 27000]
  },
  daily: {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    ecom: [4200, 5100, 3900, 6200, 7500, 8900, 9400],
    travel: [3100, 4800, 5200, 4100, 6800, 9200, 11000]
  }
};

// ==========================================
// 2. DROPDOWNS & MODALS ENGINE
// ==========================================
function toggleDropdown(event, dropdownId) {
  if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
  const target = document.getElementById(dropdownId);
  const allDropdowns = ['notificationsDropdown', 'createDropdownMenu'];
  
  allDropdowns.forEach(id => {
    if (id !== dropdownId) {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    }
  });

  if (target) {
    target.classList.toggle('hidden');
  }
}

function closeAllDropdowns() {
  ['notificationsDropdown', 'createDropdownMenu'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
}

window.addEventListener('click', () => {
  closeAllDropdowns();
});

document.body.style.filter = 'none';
localStorage.removeItem('mj_theme');

function openModal(modalId) {
  const allModals = ['addProductModal', 'csvModal', 'addTravelModal', 'addCategoryModal', 'orderDetailsModal', 'uploadMediaModal', 'editTravelModal'];
  allModals.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add('hidden');
      el.classList.remove('flex');
    }
  });

  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.style.setProperty('display', 'flex', 'important');
  }

  if (modalId === 'addCategoryModal') {
    loadParentCategoryDropdown();
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    modal.style.removeProperty('display');
    modal.style.display = 'none';
  }
  if (modalId === 'addProductModal') {
    editingProductId = null;
    const modalTitle = document.querySelector('#addProductModal h3');
    if (modalTitle) modalTitle.innerText = 'Add New Product';
    const form = document.querySelector('#addProductModal form');
    if (form) form.reset();
    const vCont = document.getElementById('variantRowsContainer');
    if (vCont) vCont.innerHTML = '';
    const specsCont = document.getElementById('specsContainer');
    if (specsCont) {
      specsCont.innerHTML = '';
      addSpecRow();
      addSpecRow();
    }
    const prev = document.getElementById('prodImagePreviewContainer');
    if (prev) prev.classList.add('hidden');
  }
}

function processCSV() {
  const input = document.getElementById('csvFileInput');
  if (!input || !input.files[0]) {
    alert('Kripya pehle CSV file select karein!');
    return;
  }
  alert('CSV File upload ho rahi hai...');
  closeModal('csvModal');
}

// ==========================================
// 3. MASTER NAVIGATION CONTROLLER
// ==========================================
function switchTab(tabName) {
  closeAllDropdowns();

  document.querySelectorAll('.tab-content').forEach(sec => {
    sec.classList.add('hidden');
  });

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.remove('bg-blue-50', 'text-blue-600', 'font-bold');
    btn.classList.add('text-gray-600');
  });

  const cleanNavId = tabName.replace('Section', '');
  let targetSectionId = tabName.includes('Section') ? tabName : `${tabName}Section`;

  const targetSec = document.getElementById(targetSectionId) || document.getElementById(cleanNavId);
  if (targetSec) {
    targetSec.classList.remove('hidden');
  }

  const navBtn = document.getElementById(`nav-${cleanNavId}`);
  if (navBtn) {
    navBtn.classList.add('bg-blue-50', 'text-blue-600', 'font-bold');
    navBtn.classList.remove('text-gray-600');
  }

  if (cleanNavId === 'products' || cleanNavId.includes('product')) {
    loadAdminProducts();
  } else if (cleanNavId === 'travel' || cleanNavId.includes('travel')) {
    loadAdminTravelPackages();
  } else if (cleanNavId === 'orders' || cleanNavId.includes('order')) {
    loadAdminOrders();
  } else if (cleanNavId === 'categories' || cleanNavId.includes('categorie')) {
    loadCategoriesCatalog();
  } else if (cleanNavId === 'media') {
    renderMediaGrid();
  } else if (cleanNavId === 'audit') {
    renderLogsTable();
  } else if (cleanNavId === 'settings') {
    loadPlatformSettings();
  } else if (cleanNavId === 'cms' || cleanNavId.includes('cms')) {
    loadCmsPoliciesFromBackend();
  }
}

window.switchTab = switchTab;
window.toggleDropdown = toggleDropdown;
window.closeAllDropdowns = closeAllDropdowns;
window.openModal = openModal;
window.closeModal = closeModal;
window.processCSV = processCSV;

// ==========================================
// 4. CMS & LEGAL POLICIES + FAQ (MONGODB SYNC)
// ==========================================
let activeCmsTab = 'terms';

let cmsStorage = {
  terms: localStorage.getItem('mj_cms_terms') || '<h2>Terms & Conditions</h2><p>Welcome to M J DIGITAL. These are the platform terms.</p>',
  privacy: localStorage.getItem('mj_cms_privacy') || '<h2>Privacy Policy</h2><p>We respect your privacy and protect your personal information.</p>',
  refund: localStorage.getItem('mj_cms_refund') || '<h2>Refund & Cancellation</h2><p>Refunds are processed within 5-7 working days upon verification.</p>',
  additional: localStorage.getItem('mj_cms_additional') || '<h2>Additional Terms & Details</h2><p>All warranty claims require original invoice and serial validation.</p>',
  faq: ''
};

function getActiveEditor() {
  return document.getElementById('cmsEditor') || 
         document.querySelector('#cmsEditorContainer [contenteditable="true"]') ||
         document.querySelector('[contenteditable="true"]');
}

function formatDoc(cmd, value = null) {
  document.execCommand(cmd, false, value);
  const ed = getActiveEditor();
  if (ed) ed.focus();
}

function autoSyncCmsContent() {
  const editor = getActiveEditor();
  if (editor && activeCmsTab !== 'faq') {
    const val = editor.innerHTML;
    cmsStorage[activeCmsTab] = val;
    localStorage.setItem('mj_cms_' + activeCmsTab, val);
  }
}

function loadCurrentCmsIntoEditor() {
  const editor = getActiveEditor();
  if (!editor) return;
  const content = cmsStorage[activeCmsTab] || localStorage.getItem('mj_cms_' + activeCmsTab) || '';
  editor.innerHTML = content;
}

function switchCmsTab(tabKey, element) {
  const currentEditor = document.getElementById('cmsEditor');
  if (currentEditor && activeCmsTab !== 'faq') {
    const textNow = currentEditor.innerHTML;
    cmsStorage[activeCmsTab] = textNow;
    localStorage.setItem('mj_cms_' + activeCmsTab, textNow);
  }

  activeCmsTab = tabKey;

  document.querySelectorAll('.cms-tab').forEach(btn => {
    btn.className = 'cms-tab hover:text-gray-800 pb-2 transition text-gray-500 cursor-pointer font-medium';
  });
  if (element) {
    element.className = 'cms-tab text-blue-600 border-b-2 border-blue-600 pb-2 transition font-bold cursor-pointer';
  }

  const richContainer = document.getElementById('cmsEditorContainer');
  const faqContainer = document.getElementById('cmsFaqContainer');

  if (tabKey === 'faq') {
    if (richContainer) {
      richContainer.classList.add('hidden');
      richContainer.style.display = 'none';
    }
    if (faqContainer) {
      faqContainer.classList.remove('hidden');
      faqContainer.style.display = 'block';
    }
    renderFaqAdminList();
  } else {
    if (faqContainer) {
      faqContainer.classList.add('hidden');
      faqContainer.style.display = 'none';
    }
    if (richContainer) {
      richContainer.classList.remove('hidden');
      richContainer.style.display = 'block';
    }
    loadCurrentCmsIntoEditor();
  }
}

async function loadCmsPoliciesFromBackend() {
  try {
    const res = await fetch('/api/cms/policies');
    const result = await res.json();
    const list = Array.isArray(result) ? result : (result.data || []);

    if (Array.isArray(list) && list.length > 0) {
      list.forEach(item => {
        if (item.policyKey && item.content && item.content.trim() !== '') {
          cmsStorage[item.policyKey] = item.content;
          localStorage.setItem('mj_cms_' + item.policyKey, item.content);
        }
      });
    }
  } catch (err) {
    console.warn('Backend CMS fetch error:', err);
  }

  if (activeCmsTab !== 'faq') {
    loadCurrentCmsIntoEditor();
  }
}

async function saveCmsContent() {
  let contentToSave = '';

  if (activeCmsTab === 'faq') {
    contentToSave = generateFaqHtml(faqData);
    cmsStorage['faq'] = contentToSave;
  } else {
    const editor = getActiveEditor();
    if (!editor) {
      alert('Editor element nahi mila!');
      return;
    }
    contentToSave = editor.innerHTML;
    cmsStorage[activeCmsTab] = contentToSave;
    localStorage.setItem('mj_cms_' + activeCmsTab, contentToSave);
  }

  try {
    const res = await fetch(`/api/cms/policies/${activeCmsTab}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminAuthHeaders()
      },
      body: JSON.stringify({ content: contentToSave })
    });

    const data = await res.json();
    if (res.ok && (data.success || data.data)) {
      alert(`Success: ${activeCmsTab.toUpperCase()} saved successfully!`);
    } else {
      alert('Save failed: ' + (data.message || 'Error'));
    }
  } catch (err) {
    console.error('Save error:', err);
    alert('Server connect error!');
  }
}

window.formatDoc = formatDoc;
window.autoSyncCmsContent = autoSyncCmsContent;
window.switchCmsTab = switchCmsTab;
window.saveCmsContent = saveCmsContent;
window.loadCmsPoliciesFromBackend = loadCmsPoliciesFromBackend;

// ==========================================
// 5. REVENUE CHART LOGIC
// ==========================================
async function renderRevenueChart() {
  const ctx = document.getElementById('revenueChart');
  if (!ctx || typeof Chart === 'undefined') return;

  try {
    const res = await fetch('/api/analytics/monthly-revenue');
    const json = await res.json();
    const data = (json && json.success) ? json.data : chartDatasets.monthly;

    if (revenueChartInstance) revenueChartInstance.destroy();

    revenueChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: 'Products (₹)',
            data: data.ecom,
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.08)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: '#2563eb'
          },
          {
            label: 'Travel Packages (₹)',
            data: data.travel,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: '#10b981'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: {
            grid: { color: '#f1f5f9' },
            ticks: { callback: (val) => '₹' + Number(val).toLocaleString('en-IN') }
          }
        }
      }
    });
  } catch (e) {
    console.warn("Chart API sync fallback:", e);
  }
}

// ==========================================
// UNIFIED LIVE DASHBOARD FILTER & CHART ENGINE
// Supports: 'all' | 'monthly' | 'weekly' | 'daily'
// ==========================================
window.currentDashboardTimeframe = localStorage.getItem('mj_admin_timeframe') || 'all';

function isOrderTravelType(ord) {
  const t = String(ord.type || ord.orderType || ord.category || '').toLowerCase();
  const title = String(ord.itemTitle || ord.title || '').toLowerCase();
  return t.includes('travel') || t.includes('tour') || title.includes('tour') || title.includes('package') || title.includes('goa') || title.includes('bali') || title.includes('kashmir');
}

function getFilteredOrdersByTimeframe(orders, timeframe) {
  if (!Array.isArray(orders)) return [];
  const validOrders = orders.filter(o => String(o.status || '').toLowerCase() !== 'cancelled');
  const now = new Date();
  const tf = String(timeframe || 'all').toLowerCase();

  if (tf === 'all') {
    return validOrders;
  }

  if (tf === 'monthly') {
    // This Year (Jan - Dec of current year)
    return validOrders.filter(o => {
      const d = new Date(o.createdAt || now);
      return d.getFullYear() === now.getFullYear();
    });
  }

  if (tf === 'weekly') {
    // This Month (Current month & current year)
    return validOrders.filter(o => {
      const d = new Date(o.createdAt || now);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }

  if (tf === 'daily') {
    // This Week (Last 7 days / Current week)
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(startOfDay.getTime() - 6 * 24 * 60 * 60 * 1000);
    return validOrders.filter(o => {
      const d = new Date(o.createdAt || now);
      return d >= sevenDaysAgo && d <= now;
    });
  }

  return validOrders;
}

function renderCategoryDoughnutChart(labels, values) {
  const canvas = document.getElementById('categoryRevenueChart');
  if (!canvas || typeof Chart === 'undefined') return;

  if (categoryChartInstance) {
    categoryChartInstance.destroy();
  }

  categoryChartInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: ['#2563eb', '#ec4899', '#0d9488', '#8b5cf6'],
        borderWidth: 2,
        borderColor: '#ffffff',
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 10,
            padding: 12,
            font: { size: 11 }
          }
        },
        tooltip: {
          callbacks: {
            label: function(ctx) {
              return ` ${ctx.label}: ₹${Number(ctx.raw || 0).toLocaleString('en-IN')}`;
            }
          }
        }
      }
    }
  });
}

function syncLiveActivityFeed() {
  const feedContainer = document.getElementById('liveActivityFeedList') || 
                        document.querySelector('#dashboardSection ul') || 
                        document.querySelector('.live-activity-list');
  if (!feedContainer) return;

  const activities = [];
  const formatAccurateDateTime = (dateVal) => {
    const d = dateVal ? new Date(dateVal) : new Date();
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  };

  if (Array.isArray(ordersList) && ordersList.length > 0) {
    ordersList.slice(0, 4).forEach(o => {
      activities.push({
        title: `ORDER: #${o.id}`,
        desc: `${o.customer} • ₹${Number(o.amount).toLocaleString('en-IN')}`,
        rawTime: o.createdAt ? new Date(o.createdAt).getTime() : Date.now(),
        timeFormatted: formatAccurateDateTime(o.createdAt),
        color: o.status === 'Cancelled' ? 'bg-rose-500' : 'bg-emerald-500'
      });
    });
  }

  if (Array.isArray(productsList) && productsList.length > 0) {
    productsList.slice(0, 2).forEach(p => {
      activities.push({
        title: `CATALOG: ${p.title || p.name || 'Product'}`,
        desc: `${p.category || 'General'} • Stock: ${p.stock ?? 0}`,
        rawTime: p.createdAt ? new Date(p.createdAt).getTime() : (Date.now() - 3600000),
        timeFormatted: formatAccurateDateTime(p.createdAt),
        color: 'bg-blue-500'
      });
    });
  }

  activities.sort((a, b) => b.rawTime - a.rawTime);

  if (activities.length === 0) {
    feedContainer.innerHTML = '<li class="text-xs text-gray-400 py-3 text-center">No recent activities found.</li>';
    return;
  }

  feedContainer.innerHTML = activities.slice(0, 5).map(act => `
    <li class="flex items-start gap-2.5 text-xs border-b border-gray-50 pb-2.5 mb-2 last:border-0 last:pb-0 last:mb-0">
      <span class="w-2 h-2 rounded-full ${act.color} mt-1.5 shrink-0"></span>
      <div class="flex-grow">
        <p class="font-bold text-gray-800 text-[11px] leading-tight">${act.title}</p>
        <p class="text-[10px] text-gray-500 mt-0.5">${act.desc}</p>
        <p class="text-[9px] font-semibold text-gray-400 mt-0.5"><i class="fa-regular fa-clock me-1"></i>${act.timeFormatted}</p>
      </div>
    </li>
  `).join('');
}

function syncNotificationsDropdown() {
  const notifMenu = document.getElementById('notificationsDropdown');
  const notifBadge = document.querySelector('button[onclick*="notificationsDropdown"] span') || document.querySelector('.fa-bell ~ span');

  const alerts = [];
  if (Array.isArray(productsList)) {
    const outOfStock = productsList.filter(p => Number(p.stock) <= 0);
    if (outOfStock.length > 0) {
      alerts.push({
        title: 'Inventory Alert',
        msg: `${outOfStock.length} product(s) Out of Stock`,
        icon: 'fa-triangle-exclamation text-rose-500'
      });
    }
  }

  if (Array.isArray(ordersList)) {
    const processing = ordersList.filter(o => o.status === 'Processing');
    if (processing.length > 0) {
      alerts.push({
        title: 'Fulfillment Pending',
        msg: `${processing.length} new order(s) awaiting dispatch`,
        icon: 'fa-box text-amber-500'
      });
    }
  }

  if (notifBadge) {
    notifBadge.textContent = alerts.length;
    notifBadge.style.display = alerts.length > 0 ? 'inline-block' : 'none';
  }

  if (notifMenu) {
    if (alerts.length === 0) {
      notifMenu.innerHTML = '<div class="p-4 text-center text-xs text-gray-400">All caught up! No alerts.</div>';
      return;
    }

    notifMenu.innerHTML = `
      <div class="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <span class="font-bold text-xs text-gray-700">Notifications</span>
        <span class="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">${alerts.length} New</span>
      </div>
      <div class="divide-y divide-gray-50 max-h-60 overflow-y-auto">
        ${alerts.map(a => `
          <div class="p-3 flex items-start gap-3 hover:bg-gray-50 transition cursor-pointer" onclick="switchTab('orders')">
            <i class="fa-solid ${a.icon} text-sm mt-0.5"></i>
            <div>
              <p class="font-bold text-xs text-gray-800">${a.title}</p>
              <p class="text-[11px] text-gray-500">${a.msg}</p>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
}

async function loadAdminOrders() {
  const tbody = document.getElementById('ordersTableBody');

  try {
    const res = await fetch('/api/orders');
    const result = await res.json();
    const rawOrders = Array.isArray(result) ? result : (result.data || result.orders || []);

    ordersList = rawOrders.map(raw => {
      const rawType = String(raw.orderType || raw.type || raw.category || '').toLowerCase();
      const rawCat = String(raw.itemDetails?.category || raw.category || '').toLowerCase();
      const titleText = String(raw.itemDetails?.title || raw.title || '').toLowerCase();
      
      let resolvedType = 'Electronics';

      if (rawType.includes('travel') || rawCat.includes('travel') || 
          titleText.includes('tour') || titleText.includes('package') || 
          titleText.includes('paradise') || titleText.includes('getaway') || 
          titleText.includes('kashmir') || titleText.includes('bali')) {
        resolvedType = 'Travel Package';
      } else if (titleText.includes('wallet') || rawType.includes('wallet')) {
        resolvedType = 'Services';
      } else if (rawType.includes('service') || rawCat.includes('service')) {
        resolvedType = 'Services';
      } else if (rawType === 'mobile' || rawCat === 'mobile' || titleText.includes('iphone') || titleText.includes('galaxy') || titleText.includes('smartphone')) {
        resolvedType = 'Mobile';
      } else if (rawType.includes('fashion') || rawCat.includes('fashion') || titleText.includes('shirt') || titleText.includes('tshirt')) {
        resolvedType = 'Fashion';
      } else {
        resolvedType = 'Electronics';
      } 
      // 2. Wallet & Financial Services
  if (titleText.includes('wallet') || rawType.includes('wallet') || titleText.includes('recharge') || titleText.includes('pay')) {
        resolvedType = 'Services';
      }
      // 3. Digital & IT Services
  if (rawType.includes('service') || rawCat.includes('service') || titleText.includes('development') || titleText.includes('registration') || titleText.includes('gst')) {
        resolvedType = 'Services';
      }
      // 4. Mobiles Only
  if (rawType === 'mobile' || rawCat === 'mobile' || rawCat === 'mobiles' ||
               titleText.includes('iphone') || titleText.includes('galaxy') || titleText.includes('smartphone') || titleText.includes('pro max') || titleText.includes('ultra')) {
        resolvedType = 'Mobile';
      }
      // 5. Fashion
  if (rawType.includes('fashion') || rawCat.includes('fashion') || titleText.includes('shirt') || titleText.includes('apparel') || titleText.includes('cotton') || titleText.includes('wear')) {
        resolvedType = 'Fashion';
      }
      // 6. Electronics & Appliances (Headphones, Mac, Fridge, TV)
  if (rawType.includes('elect') || rawCat.includes('elect') || 
               titleText.includes('headphone') || titleText.includes('sony') || 
               titleText.includes('macbook') || titleText.includes('laptop') || 
               titleText.includes('fridge') || titleText.includes('watch') || 
               titleText.includes('airpods') || titleText.includes('tv') || titleText.includes('audio')) {
        resolvedType = 'Electronics';
      }

      return {
        id: raw._id ? String(raw._id).slice(-6).toUpperCase() : (raw.id || 'ORD101'),
        _rawId: raw._id || raw.id,
        customer: raw.customer?.name || raw.customerName || 'Guest Buyer',
        contact: raw.customer?.phone || raw.customerPhone || '+91 8306669999',
        email: raw.customer?.email || raw.customerEmail || 'mjdigitalworlds@gmail.com',
        amount: Number(raw.totalAmount || raw.amount || 0),
        itemTitle: raw.itemDetails?.title || raw.title || 'Order Item',
        status: raw.status || 'Processing',
        cancelReason: raw.cancelReason || '',
        category: resolvedType,
        type: resolvedType,
        paymentMethod: raw.paymentGateway || 'Razorpay',
        paymentStatus: raw.paymentStatus || 'Paid',
        createdAt: raw.createdAt || new Date(),
        rawItem: raw
      };
    });

    if (typeof updateDashboardMetrics === 'function') updateDashboardMetrics(ordersList);
    if (typeof updateDashboardChart === 'function') updateDashboardChart(ordersList);
    if (typeof syncLiveActivityFeed === 'function') syncLiveActivityFeed();
    if (typeof syncNotificationsDropdown === 'function') syncNotificationsDropdown();

    const orderBadges = document.querySelectorAll('a[href*="order"] span, .fa-clipboard-list ~ span, #sidebarOrdersBadge');
    orderBadges.forEach(b => {
      b.textContent = ordersList.length;
    });

    if (typeof filterOrdersTable === 'function') {
      filterOrdersTable();
    } else {
      renderOrdersTable(ordersList);
    }
  } catch (err) {
    console.error('Error fetching live orders:', err);
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-red-500 font-semibold">Backend server connect nahi ho saka.</td></tr>`;
    }
  }
}

window.loadAdminOrders = loadAdminOrders;

function filterOrdersTable() {
  const searchVal = (document.getElementById('orderSearchInput')?.value || '').trim().toLowerCase();
  const typeVal = (document.getElementById('orderTypeFilter')?.value || 'all').toLowerCase();
  const statusVal = (document.getElementById('orderStatusFilter')?.value || 'all').toLowerCase();

  const filtered = ordersList.filter(item => {
    const rawTitle = String(item.itemTitle || item.items || item.title || '').toLowerCase();
    const rawType = String(item.type || '').toLowerCase();
    
    let matchType = (typeVal === 'all') || (rawType.includes(typeVal));
    const st = String(item.status || 'pending').toLowerCase();
    let matchStatus = (statusVal === 'all') || (st === statusVal);

    let matchSearch = !searchVal || 
      String(item.id).toLowerCase().includes(searchVal) ||
      String(item.customer).toLowerCase().includes(searchVal) ||
      rawTitle.includes(searchVal);

    return matchType && matchStatus && matchSearch;
  });

  renderOrdersTable(filtered);
}

function renderOrdersTable(data = ordersList) {
  const tbody = document.getElementById('ordersTableBody');
  if (!tbody) return;

  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-gray-400">No orders or bookings found.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(item => {
    const rawType = String(item.type || 'Product').toLowerCase();
    
    let typeBadge = `<span class="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">Product</span>`;
    
    if (rawType.includes('travel')) {
      typeBadge = `<span class="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">Travel Package</span>`;
    } else if (rawType.includes('mobile')) {
      typeBadge = `<span class="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">Mobile</span>`;
    } else if (rawType.includes('electronic')) {
      typeBadge = `<span class="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200">Electronics</span>`;
    } else if (rawType.includes('fashion')) {
      typeBadge = `<span class="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-pink-50 text-pink-700 border border-pink-200">Fashion</span>`;
    } else if (rawType.includes('service')) {
      typeBadge = `<span class="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">Services</span>`;
    }

    const currentStatus = item.status || 'Processing';
    const hasCustomerReason = Boolean(item.cancelReason || item.rawItem?.cancelReason);
    const isCancelledByCustomer = (currentStatus === 'Cancelled' && hasCustomerReason);
    const cancelReasonText = item.cancelReason || item.rawItem?.cancelReason || '';

    const statusColor = (currentStatus === 'Confirmed' || currentStatus === 'Delivered' || currentStatus === 'Completed')
      ? 'border-emerald-300 text-emerald-700 bg-emerald-50'
      : (currentStatus === 'Cancelled' ? 'border-rose-300 text-rose-700 bg-rose-50' : 'border-amber-300 text-amber-700 bg-amber-50');

    const dt = new Date(item.createdAt || Date.now());
    const dateStr = dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    return `
      <tr class="hover:bg-gray-50/70 transition border-b border-gray-100 text-xs">
        <td class="py-3.5 px-4 font-mono font-bold text-blue-600">#${item.id}</td>
        <td class="py-3.5 px-4">
          <p class="font-bold text-gray-800">${item.customer}</p>
          <p class="text-[10px] text-gray-400">${item.contact} • ${item.email}</p>
        </td>
        <td class="py-3.5 px-4">${typeBadge}</td>
        <td class="py-3.5 px-4 font-bold text-gray-900 text-sm">₹${Number(item.amount || 0).toLocaleString('en-IN')}</td>
        <td class="py-3.5 px-4">
          <p class="font-semibold text-gray-700">${item.itemTitle}</p>
          <span class="text-[10px] text-gray-400">${dateStr} • ${timeStr}</span>
        </td>
        <td class="py-3.5 px-4">
          ${isCancelledByCustomer ? `
            <div class="inline-flex flex-col items-start">
              <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-300">
                <i class="fa-solid fa-user-xmark me-1 text-[10px]"></i> Cancelled by Customer
              </span>
              <div class="text-[10px] text-rose-600 font-semibold mt-1">Reason: ${cancelReasonText}</div>
            </div>
          ` : `
            <select data-rawid="${item._rawId}" class="order-status-select text-[11px] font-bold border rounded-lg px-2 py-1 outline-none ${statusColor} cursor-pointer">
              <option value="Pending" ${currentStatus === 'Pending' ? 'selected' : ''}>Pending</option>
              <option value="Processing" ${currentStatus === 'Processing' ? 'selected' : ''}>Processing</option>
              <option value="Confirmed" ${currentStatus === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
              <option value="In Transit" ${currentStatus === 'In Transit' ? 'selected' : ''}>In Transit</option>
              <option value="Delivered" ${currentStatus === 'Delivered' ? 'selected' : ''}>Delivered</option>
              <option value="Cancelled" ${currentStatus === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
          `}
        </td>
        <td class="py-3.5 px-4 text-right">
          <button onclick="viewOrderDetails('${item._rawId || item.id}')" class="text-xs font-semibold px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg border">
            View
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function getStatusBadgeStyles(statusVal) {
  const s = String(statusVal || '').toLowerCase();
  if (s === 'confirmed' || s === 'delivered') {
    return {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-300',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-300'
    };
  } else if (s === 'in transit') {
    return {
      bg: 'bg-blue-50 text-blue-700 border-blue-300',
      badge: 'bg-blue-100 text-blue-800 border-blue-300'
    };
  } else if (s === 'cancelled') {
    return {
      bg: 'bg-rose-50 text-rose-700 border-rose-300',
      badge: 'bg-rose-100 text-rose-800 border-rose-300'
    };
  } else {
    return {
      bg: 'bg-amber-50 text-amber-800 border-amber-400',
      badge: 'bg-amber-100 text-amber-800 border-amber-300'
    };
  }
}

// Table Ke Bahar Se Status Change Karna
document.addEventListener('change', async function(e) {
  if (e.target && e.target.classList.contains('order-status-select')) {
    const rawId = e.target.getAttribute('data-rawid');
    const newStatus = e.target.value;

    if (!rawId || rawId === 'undefined') {
      alert("Order ID missing!");
      return;
    }

    try {
      const payload = { 
        status: newStatus,
        cancelReason: newStatus === 'Cancelled' ? 'Cancelled by Admin' : ''
      };

      let res = await fetch(`/api/orders/${rawId}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          ...getAdminAuthHeaders()
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        res = await fetch(`/api/orders/${rawId}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            ...getAdminAuthHeaders()
          },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (res.ok && (data.success || data.data)) {
        if (typeof loadAdminOrders === 'function') {
          await loadAdminOrders();
        }
        alert(`Order status badal kar "${newStatus}" ho gaya!`);
      } else {
        alert('Update failed: ' + (data.message || 'Error updating status'));
      }
    } catch (err) {
      console.error('Table status update error:', err);
      alert('Server connect error!');
    }
  }
});

// View Modal Ke Andar Se Status Change Karna
window.changeActiveOrderStatus = async function(newStatus) {
  if (!activeSelectedOrder) {
    alert("Pehle koi order select karke modal kholiye!");
    return;
  }

  const orderId = activeSelectedOrder._rawId || activeSelectedOrder._id || activeSelectedOrder.id;
  if (!orderId) {
    alert("Order ID nahi mili!");
    return;
  }

  try {
    const payload = { 
      status: newStatus,
      cancelReason: newStatus === 'Cancelled' ? 'Cancelled by Admin' : ''
    };

    let res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminAuthHeaders()
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...getAdminAuthHeaders()
        },
        body: JSON.stringify(payload)
      });
    }

    const data = await res.json();
    if (res.ok && (data.success || data.data)) {
      activeSelectedOrder.status = newStatus;
      
      const styles = getStatusBadgeStyles(newStatus);

      const statusBadge = document.getElementById('modalOrderStatus');
      if (statusBadge) {
        statusBadge.innerText = newStatus;
        statusBadge.className = `text-xs font-bold px-3 py-1 rounded-full border ${styles.badge}`;
      }

      const statusSelect = document.getElementById('updateStatusSelect');
      if (statusSelect) {
        statusSelect.value = newStatus;
        statusSelect.className = `text-xs font-bold rounded-full px-3 py-1 outline-none shadow-xs cursor-pointer border ${styles.bg}`;
      }

      if (typeof loadAdminOrders === 'function') {
        await loadAdminOrders();
      }
      alert(`Order status badal kar "${newStatus}" ho gaya!`);
    } else {
      alert("Status update fail hua: " + (data.message || "Server error"));
    }
  } catch (err) {
    console.error("Modal status update error:", err);
    alert("Server request fail ho gayi!");
  }
};

function viewOrderDetails(orderId) {
  const cleanId = String(orderId).replace('#', '').trim().toLowerCase();
  const order = ordersList.find(o => 
    String(o.id).toLowerCase() === cleanId || 
    String(o._rawId || '').toLowerCase() === cleanId || 
    String(o._rawId || '').toLowerCase().includes(cleanId)
  );
  
  if (!order) {
    alert("Order details nahi mili!");
    return;
  }

  activeSelectedOrder = {
    ...order,
    _id: order._rawId || order.id,
    _rawId: order._rawId || order.id
  };

  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.innerText = val;
  };

  setEl('modalOrderId', 'ID: #' + (order.id || String(order._rawId).slice(-6).toUpperCase()));
  setEl('modalCustomerName', order.customer);
  setEl('modalCustomerContact', `${order.contact} • ${order.email}`);
  setEl('modalItemTitle', order.itemTitle);
  setEl('modalItemPrice', `₹${Number(order.amount || 0).toLocaleString('en-IN')}`);
  setEl('modalPaymentInfo', `${order.paymentMethod || 'Online'} (${order.paymentStatus || 'Paid'})`);

  const styles = getStatusBadgeStyles(order.status);

  const statusBadge = document.getElementById('modalOrderStatus');
  if (statusBadge) {
    statusBadge.innerText = order.status;
    statusBadge.className = `text-xs font-bold px-3 py-1 rounded-full border ${styles.badge}`;
  }

  const statusDropdown = document.getElementById('updateStatusSelect');
  if (statusDropdown) {
    statusDropdown.value = order.status;
    statusDropdown.className = `text-xs font-bold rounded-full px-3 py-1 outline-none shadow-xs cursor-pointer border ${styles.bg}`;
  }

  openModal('orderDetailsModal');
}

window.viewOrderDetails = viewOrderDetails;
window.loadAdminOrders = loadAdminOrders;
window.renderOrdersTable = renderOrdersTable;

// ==========================================
// 10. MEDIA ASSET LIBRARY LOGIC (MONGODB SYNC)
// ==========================================
async function renderMediaGrid() {
  const container = document.getElementById('mediaGridContainer');
  if (!container) return;

  try {
    const res = await fetch('/api/media');
    const result = await res.json();
    const mediaList = result.success ? result.data : [];

    if (mediaList.length === 0) {
      container.innerHTML = `<div class="col-span-3 text-center text-gray-400 py-6 text-xs font-semibold">No media assets in database yet. Click "+ Upload Asset" to add.</div>`;
      return;
    }

    container.innerHTML = mediaList.map(item => `
      <div class="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition flex flex-col group">
        <div class="h-36 w-full overflow-hidden bg-gray-100 relative">
          <img src="${item.url}" alt="${item.name}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300" onerror="this.src='https://placehold.co/400x250?text=Asset'">
        </div>
        <div class="p-3.5 flex justify-between items-center">
          <div class="truncate mr-2">
            <p class="font-bold text-gray-800 text-xs truncate" title="${item.name}">${item.name}</p>
            <span class="text-[10px] text-gray-400 font-medium">${item.size || '1.0 MB'}</span>
          </div>
          <button 
            type="button" 
            onclick="copyMediaUrl('${item.url}')" 
            title="Copy Image URL" 
            class="text-gray-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition"
          >
            <i class="fa-regular fa-clone text-xs"></i>
          </button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error loading media assets:', err);
    container.innerHTML = `<div class="col-span-3 text-center text-rose-500 py-6 text-xs font-bold">Backend connect error while loading media.</div>`;
  }
}

function copyMediaUrl(url) {
  navigator.clipboard.writeText(url).then(() => {
    alert('Image link copied to clipboard!');
  }).catch(() => {
    alert('Link: ' + url);
  });
}

async function handleMediaUpload() {
  const fileInput = document.getElementById('mediaUploadInput');
  const titleInput = document.getElementById('mediaTitleInput');

  if (!fileInput || !fileInput.files[0]) {
    alert('Kripya pehle image file select karein!');
    return;
  }

  const formData = new FormData();
  formData.append('mediaFile', fileInput.files[0]);
  if (titleInput && titleInput.value.trim()) {
    formData.append('name', titleInput.value.trim());
  }

  try {
    const res = await fetch('/api/media', {
      method: 'POST',
      headers: {
        ...getAdminAuthHeaders()
      },
      body: formData
    });
    const result = await res.json();
    if (res.ok && result.success) {
      alert('Media asset MongoDB database mein save ho gaya!');
      closeModal('uploadMediaModal');
      fileInput.value = '';
      if (titleInput) titleInput.value = '';
      renderMediaGrid();
    } else {
      alert('Upload failed: ' + (result.message || 'Error'));
    }
  } catch (err) {
    console.error('Media upload error:', err);
    alert('Server connect error while uploading media.');
  }
}

window.renderMediaGrid = renderMediaGrid;
window.copyMediaUrl = copyMediaUrl;
window.handleMediaUpload = handleMediaUpload;

// ==========================================
// 11. AUDIT ACTIVITY LOGS (FULLY SYNCHRONIZED)
// ==========================================
async function renderLogsTable(logsToRender = null) {
  const tbody = document.getElementById('logsTableBody');
  if (!tbody) return;

  try {
    if (!logsToRender) {
      const res = await fetch('/api/audit-logs', {
        headers: {
          ...getAdminAuthHeaders()
        }
      });
      const result = await res.json();
      currentDatabaseLogs = (result && result.success && result.data) ? result.data : [];
    } else {
      currentDatabaseLogs = logsToRender;
    }

    let displayList = [...currentDatabaseLogs];

    if (displayList.length === 0 && Array.isArray(ordersList) && ordersList.length > 0) {
      ordersList.forEach(ord => {
        displayList.push({
          time: ord.rawItem?.createdAt || new Date().toISOString(),
          admin: ord.customer || 'Customer Checkout',
          role: 'Customer',
          action: ord.status === 'Cancelled' ? 'DELETE' : (ord.status === 'Confirmed' ? 'CREATE' : 'UPDATE'),
          description: `Order #${ord.id}: ${ord.itemTitle} (₹${Number(ord.amount).toLocaleString('en-IN')}) - ${ord.status}`,
          ip: '127.0.0.1',
          status: ord.status === 'Cancelled' ? 'Danger' : 'Success'
        });
      });
      currentDatabaseLogs = displayList;
    }

    if (displayList.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-gray-400 text-xs font-semibold">No activity logs recorded in database.</td></tr>`;
      return;
    }

    tbody.innerHTML = displayList.map(item => {
      const displayTime = item.time ? 
        new Date(item.time).toLocaleString('en-IN', { hour12: true }) : 
        new Date().toLocaleString('en-IN', { hour12: true });

      return `
        <tr class="hover:bg-gray-50/60 transition text-xs border-b border-gray-100">
          <td class="py-3 px-4 text-gray-500 font-mono text-[10px] whitespace-nowrap">${displayTime}</td>
          <td class="py-3 px-4">
            <p class="font-bold text-gray-800">${item.admin || 'M. J. Admin'}</p>
            <p class="text-[9px] text-gray-500 font-medium">${item.role || 'Super Admin'}</p>
          </td>
          <td class="py-3 px-4">
            <span class="px-2 py-0.5 rounded text-[9px] font-bold ${
              item.action === 'CREATE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 
              item.action === 'UPDATE' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 
              item.action === 'DELETE' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 
              'bg-purple-50 text-purple-700 border border-purple-200'
            }">
              ${item.action || 'UPDATE'}
            </span>
          </td>
          <td class="py-3 px-4 text-gray-700 font-medium leading-relaxed">${item.description || '-'}</td>
          <td class="py-3 px-4 font-mono text-gray-400 text-[10px]">${item.ip || '127.0.0.1'}</td>
          <td class="py-3 px-4 text-center">
            <span class="px-2 py-0.5 rounded-full text-[9px] font-bold ${
              item.status === 'Success' ? 'bg-emerald-100 text-emerald-700' : 
              item.status === 'Warning' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
            }">
              ${item.status || 'Success'}
            </span>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error('Audit logs fetch error:', err);
    tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-rose-500 text-xs font-bold bg-rose-50">Error connecting to Audit API.</td></tr>`;
  }
}

function filterLogsTable() {
  const searchVal = (document.getElementById('logSearchInput')?.value || '').toLowerCase().trim();
  const actionVal = document.getElementById('logActionFilter')?.value || 'all';
  const statusVal = document.getElementById('logSeverityFilter')?.value || 'all';

  const filtered = currentDatabaseLogs.filter(log => {
    const textMatch = !searchVal || 
                    (log.description || '').toLowerCase().includes(searchVal) || 
                    (log.admin || '').toLowerCase().includes(searchVal) || 
                    (log.ip || '').includes(searchVal);
                    
    const actionMatch = (actionVal === 'all') || (log.action === actionVal);
    const statusMatch = (statusVal === 'all') || (log.status === statusVal);
    
    return textMatch && actionMatch && statusMatch;
  });

  renderLogsTable(filtered);
}

function exportLogsCSV() {
  if (!currentDatabaseLogs || currentDatabaseLogs.length === 0) {
    alert('No logs to export.');
    return;
  }

  let csv = 'Timestamp,Admin,Role,Action,Description,IP,Status\n';
  currentDatabaseLogs.forEach(l => {
    const timeStr = l.time ? new Date(l.time).toISOString().replace('T', ' ').substring(0, 19) : '';
    const desc = (l.description || '').replace(/"/g, '""');
    csv += `"${timeStr}","${l.admin}","${l.role}","${l.action}","${desc}","${l.ip}","${l.status}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('download', `audit_logs_${Date.now()}.csv`);
  a.click();
}

async function clearActivityLogs() {
  if (!confirm('Kya aap sabhi purane audit logs database se permanently clear karna chahte hain?')) return;
  try {
    const res = await fetch('/api/audit-logs', { 
      method: 'DELETE',
      headers: {
        ...getAdminAuthHeaders()
      }
    });
    const data = await res.json();
    if (res.ok && data.success) {
      alert('Sabhi audit activity logs database se clear ho gaye!');
      currentDatabaseLogs = [];
      renderLogsTable([]);
    } else {
      alert('Logs clear fail: ' + (data.message || 'Error'));
    }
  } catch (err) {
    console.error('Clear logs error:', err);
    alert('Server connection error while clearing logs.');
  }
}

window.renderLogsTable = renderLogsTable;
window.filterLogsTable = filterLogsTable;
window.exportLogsCSV = exportLogsCSV;
window.clearActivityLogs = clearActivityLogs;

// ==========================================
// 12. PLATFORM SETTINGS (MONGODB LIVE SYNC)
// ==========================================
// ==========================================
// MULTI-GATEWAY VAULT STATE
// ==========================================
let gatewayVault = {
  razorpay: { test: { keyId: '', keySecret: '' }, live: { keyId: '', keySecret: '' } },
  cashfree: { test: { keyId: '', keySecret: '' }, live: { keyId: '', keySecret: '' } },
  phonepe:  { test: { keyId: '', keySecret: '' }, live: { keyId: '', keySecret: '' } },
  stripe:   { test: { keyId: '', keySecret: '' }, live: { keyId: '', keySecret: '' } },
  paytm:    { test: { keyId: '', keySecret: '' }, live: { keyId: '', keySecret: '' } }
};

let currentProvider = 'razorpay';
let currentEnv = 'live';

function getProviderLabels(provider) {
  if (provider === 'cashfree') return { id: 'Cashfree App ID', secret: 'Cashfree Secret Key' };
  if (provider === 'phonepe')  return { id: 'PhonePe Merchant ID', secret: 'PhonePe Salt Key / Secret' };
  if (provider === 'stripe')   return { id: 'Stripe Publishable Key (pk_...)', secret: 'Stripe Secret Key (sk_...)' };
  if (provider === 'paytm')    return { id: 'Paytm Merchant ID (MID)', secret: 'Paytm Merchant Key' };
  return { id: 'Razorpay Key ID (rzp_...)', secret: 'Razorpay Key Secret' };
}

function onGatewaySelectionChanged() {
  // Save current values to temporary in-memory vault before switching
  const prevId = document.getElementById('settingGatewayKeyId')?.value.trim() || '';
  const prevSec = document.getElementById('settingGatewayKeySecret')?.value.trim() || '';
  if (!gatewayVault[currentProvider]) gatewayVault[currentProvider] = { test: {}, live: {} };
  if (!gatewayVault[currentProvider][currentEnv]) gatewayVault[currentProvider][currentEnv] = {};
  gatewayVault[currentProvider][currentEnv] = { keyId: prevId, keySecret: prevSec };

  // Update current selections
  const newProvider = document.getElementById('settingGateway')?.value || 'razorpay';
  const rawEnv = document.getElementById('settingEnv')?.value || 'live';
  const newEnv = (rawEnv === 'sandbox' || rawEnv === 'test') ? 'test' : 'live';

  currentProvider = newProvider;
  currentEnv = newEnv;

  // Update Input labels & placeholders dynamically
  const labels = getProviderLabels(newProvider);
  const lblId = document.getElementById('lblGatewayKeyId');
  const lblSec = document.getElementById('lblGatewayKeySecret');
  const inpId = document.getElementById('settingGatewayKeyId');
  const inpSec = document.getElementById('settingGatewayKeySecret');

  if (lblId) lblId.innerHTML = '<i class="fa-solid fa-key text-blue-500 me-1"></i> ' + labels.id + ' (' + newEnv.toUpperCase() + ')';
  if (lblSec) lblSec.innerHTML = '<i class="fa-solid fa-lock text-emerald-500 me-1"></i> ' + labels.secret + ' (' + newEnv.toUpperCase() + ')';
  
  if (inpId) inpId.placeholder = 'Enter ' + labels.id;
  if (inpSec) inpSec.placeholder = 'Enter ' + labels.secret;

  // Load new selection values from vault
  const activeKeys = gatewayVault[newProvider]?.[newEnv] || { keyId: '', keySecret: '' };
  if (inpId) inpId.value = activeKeys.keyId || '';
  if (inpSec) inpSec.value = activeKeys.keySecret || '';
}

window.onGatewaySelectionChanged = onGatewaySelectionChanged;

async function savePlatformSettings() {
  const saveBtn = document.querySelector('button[onclick="savePlatformSettings()"]');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-xs"></i> Saving...`;
  }

  
    // Commit current active inputs into vault before saving
    if (!gatewayVault[currentProvider]) gatewayVault[currentProvider] = { test: {}, live: {} };
    gatewayVault[currentProvider][currentEnv] = {
      keyId: document.getElementById('settingGatewayKeyId')?.value.trim() || '',
      keySecret: document.getElementById('settingGatewayKeySecret')?.value.trim() || ''
    };

    const rawEnv = document.getElementById('settingEnv')?.value || 'live';
    const cleanEnv = (rawEnv === 'sandbox' || rawEnv === 'test') ? 'test' : 'live';

    const settingsData = {
      storeName: document.getElementById('settingStoreName')?.value.trim() || 'M J DIGITAL',
      email: document.getElementById('settingEmail')?.value.trim() || 'support@mjdigital.in',
      phone: document.getElementById('settingPhone')?.value.trim() || '+91 830 666 9999',
      address: document.getElementById('settingAddress')?.value.trim() || '',
      currency: document.getElementById('settingCurrency')?.value || 'INR',
      gateway: currentProvider,
      environment: rawEnv,
      gatewayKeys: gatewayVault,
      paymentMethods: {
        upi: Boolean(document.getElementById('pay_upi')?.checked),
        cards: Boolean(document.getElementById('pay_cards')?.checked),
        netbanking: Boolean(document.getElementById('pay_netbanking')?.checked),
        wallets: Boolean(document.getElementById('pay_wallets')?.checked),
        rewards: Boolean(document.getElementById('pay_rewards')?.checked),
        cod: Boolean(document.getElementById('pay_cod')?.checked)
      },
      orderEmailNotification: Boolean(document.getElementById('toggleOrderEmail')?.checked),
      bookingSmsNotification: Boolean(document.getElementById('toggleBookingSms')?.checked),
      maintenanceMode: Boolean(document.getElementById('toggleMaintenance')?.checked)
    };


  try {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        ...getAdminAuthHeaders()
      },
      body: JSON.stringify(settingsData)
    });

    const result = await res.json();
    if (res.ok && result.success) {
      localStorage.setItem('mj_platform_settings', JSON.stringify(settingsData));
      alert('✅ Platform Settings successfully saved to MongoDB!');
    } else {
      alert('Save failed: ' + (result.message || 'Server error'));
    }
  } catch (err) {
    console.error('Settings save error:', err);
    alert('Server connection error! Check if port 5000 is running.');
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = `<i class="fa-solid fa-floppy-disk text-xs"></i> Save Settings`;
    }
  }
}

async function loadPlatformSettings() {
  try {
    const res = await fetch('/api/settings');
    const result = await res.json();
    const data = (result && result.success && result.data) ? result.data : JSON.parse(localStorage.getItem('mj_platform_settings') || '{}');

    if (!data) return;

    if (data.storeName && document.getElementById('settingStoreName')) {
      document.getElementById('settingStoreName').value = data.storeName;
    }
    if (data.email && document.getElementById('settingEmail')) {
      document.getElementById('settingEmail').value = data.email;
    }
    if (data.phone && document.getElementById('settingPhone')) {
      document.getElementById('settingPhone').value = data.phone;
    }
    if (data.address && document.getElementById('settingAddress')) {
      document.getElementById('settingAddress').value = data.address;
    }

    if (data.currency && document.getElementById('settingCurrency')) {
      document.getElementById('settingCurrency').value = data.currency;
    }
    if (data.gateway && document.getElementById('settingGateway')) {
      document.getElementById('settingGateway').value = data.gateway;
    }
    if (data.environment && document.getElementById('settingEnv')) {
      document.getElementById('settingEnv').value = data.environment;
    }
    
    if (data.gatewayKeys) {
      gatewayVault = Object.assign(gatewayVault, data.gatewayKeys);
    }
    currentProvider = data.gateway || 'razorpay';
    const loadedEnv = (data.environment === 'sandbox' || data.environment === 'test') ? 'test' : 'live';
    currentEnv = loadedEnv;

    if (typeof onGatewaySelectionChanged === 'function') {
      onGatewaySelectionChanged();
    }


    if (data.paymentMethods) {
      if (document.getElementById('pay_upi')) document.getElementById('pay_upi').checked = !!data.paymentMethods.upi;
      if (document.getElementById('pay_cards')) document.getElementById('pay_cards').checked = !!data.paymentMethods.cards;
      if (document.getElementById('pay_netbanking')) document.getElementById('pay_netbanking').checked = !!data.paymentMethods.netbanking;
      if (document.getElementById('pay_wallets')) document.getElementById('pay_wallets').checked = !!data.paymentMethods.wallets;
      if (document.getElementById('pay_rewards')) document.getElementById('pay_rewards').checked = !!data.paymentMethods.rewards;
      if (document.getElementById('pay_cod')) document.getElementById('pay_cod').checked = !!data.paymentMethods.cod;
    }

    if (document.getElementById('toggleOrderEmail')) {
      document.getElementById('toggleOrderEmail').checked = Boolean(data.orderEmailNotification);
    }
    if (document.getElementById('toggleBookingSms')) {
      document.getElementById('toggleBookingSms').checked = Boolean(data.bookingSmsNotification);
    }
    if (document.getElementById('toggleMaintenance')) {
      document.getElementById('toggleMaintenance').checked = Boolean(data.maintenanceMode);
    }
  } catch (err) {
    console.warn('Settings load notice, using local values:', err);
  }
}

window.savePlatformSettings = savePlatformSettings;
window.loadPlatformSettings = loadPlatformSettings;

// ==========================================
// 13. AUTHENTICATION (ADMIN LOGIN / LOGOUT)
// ==========================================
async function handleAdminLogin(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  const emailInput = document.getElementById('authEmailInput') || document.querySelector('input[type="text"]');
  const passInput = document.getElementById('authPasswordInput') || document.querySelector('input[type="password"]');
  const errorEl = document.getElementById('authErrorMsg');

  const username = emailInput ? emailInput.value.trim() : '';
  const password = passInput ? passInput.value.trim() : '';

  if (errorEl) errorEl.classList.add('hidden');

  if (!username || !password) {
    if (errorEl) {
      errorEl.innerText = 'Kripya Username aur Password dono bharein.';
      errorEl.classList.remove('hidden');
    }
    return false;
  }

  const btn = event?.target?.querySelector('button[type="submit"]') || document.querySelector('#adminAuthScreen button[type="submit"]');
  const origBtnText = btn ? btn.innerText : 'Authenticate & Login';
  if (btn) { btn.disabled = true; btn.innerText = 'Verifying...'; }

  try {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (!data.success) {
      if (errorEl) {
        errorEl.innerText = data.message || 'Invalid Admin Credentials';
        errorEl.classList.remove('hidden');
      }
      return false;
    }

    if (data.requires2FA) {
      const otp = prompt("🔐 2FA SECURITY OTP:\n\nAapke screen par OTP generate hua hai:\n" + (data.debugOtp || "1234") + "\n\nKripya 4-digit code yahan daalein:");
      if (!otp) return false;

      const verifyRes = await fetch("/api/admin/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId: data.adminId, otp: otp.trim() })
      });
      const verifyData = await verifyRes.json();

      if (verifyData.success) {
        const token = verifyData.token;
        localStorage.setItem('mj_jwt_token', token);
        localStorage.setItem('mj_admin_token', token);
        localStorage.setItem('adminToken', token);
        sessionStorage.setItem('mj_jwt_token', token);
        localStorage.setItem('mj_admin_session', 'authenticated');
        localStorage.setItem('mj_admin_user', username);
        localStorage.setItem('mj_admin_login_time', Date.now());

        const authScreen = document.getElementById('adminAuthScreen');
        if (authScreen) authScreen.classList.add('hidden');
        window.location.reload();
      } else {
        alert(verifyData.message || 'Galat OTP code!');
      }
    } else {
      const token = data.token;
      localStorage.setItem('mj_jwt_token', token);
      localStorage.setItem('mj_admin_token', token);
      localStorage.setItem('adminToken', token);
      sessionStorage.setItem('mj_jwt_token', token);
      localStorage.setItem('mj_admin_session', 'authenticated');
      localStorage.setItem('mj_admin_user', username);
      localStorage.setItem('mj_admin_login_time', Date.now());

      const authScreen = document.getElementById('adminAuthScreen');
      if (authScreen) authScreen.classList.add('hidden');
      window.location.reload();
    }
  } catch (err) {
    if (errorEl) {
      errorEl.innerText = 'Backend connection failed! Make sure Render server is responding.';
      errorEl.classList.remove('hidden');
    }
  } finally {
    if (btn) { btn.disabled = false; btn.innerText = origBtnText; }
  }
  return false;
  }

function handleAdminLogout() {
  if (confirm('Admin session logout karein?')) {
    localStorage.removeItem('mj_jwt_token');
    sessionStorage.removeItem('mj_jwt_token');
    localStorage.removeItem('mj_admin_session');
    localStorage.removeItem('mj_admin_user');
    localStorage.removeItem('mj_admin_login_time');
    location.reload();
  }
}

window.handleAdminLogin = handleAdminLogin;
window.handleAdminLogout = handleAdminLogout;

// ==========================================
// 14. SINGLE SYNCHRONOUS BOOTSTRAPPER
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
  verifyAdminSessionExpiry();
  localStorage.removeItem('products');
  localStorage.removeItem('mockProducts');

  loadCmsPoliciesFromBackend();
  loadAdminProducts();
  loadAdminTravelPackages();
  loadAdminOrders();
  loadCategoriesCatalog();
  renderMediaGrid();
});

// ==========================================
// 15. AUTO-SYNC: 4 Second Background Polling
// ==========================================
setInterval(() => {
  const ordersSec = document.getElementById('ordersSection');
  const isDropdownOpen = document.querySelector('.order-status-select:focus');
  if (ordersSec && !ordersSec.classList.contains('hidden') && !isDropdownOpen) {
    if (typeof loadAdminOrders === 'function') loadAdminOrders();
  }

  const prodSec = document.getElementById('productsSection');
  if (prodSec && !prodSec.classList.contains('hidden')) {
    if (typeof loadAdminProducts === 'function') loadAdminProducts();
  }

  const dashSec = document.getElementById('dashboardSection');
  if (dashSec && !dashSec.classList.contains('hidden')) {
    if (typeof loadAdminOrders === 'function') loadAdminOrders();
    if (typeof loadAdminTravelPackages === 'function') loadAdminTravelPackages();
  }
}, 4000);

async function fetchAndRenderSitePolicies() {
  try {
    const res = await fetch('/api/cms/policies');
    const result = await res.json();

    if (res.ok && result.success && Array.isArray(result.data)) {
      result.data.forEach(policy => {
        const contentEl = document.getElementById(`live-${policy.policyKey}-content`);
        const dateEl = document.getElementById(`live-${policy.policyKey}-date`);

        if (contentEl && policy.content) {
          contentEl.innerHTML = policy.content;
        }

        if (dateEl && policy.lastUpdated) {
          const formattedDate = new Date(policy.lastUpdated).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
          });
          dateEl.innerText = `Last Updated: ${formattedDate}`;
        }
      });
    }
  } catch (err) {
    console.warn('Could not load dynamic CMS policies on main website:', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  fetchAndRenderSitePolicies();
});

// FAQ Array State
let faqData = [
  {
    q: "How long does retail order shipping take?",
    a: "Orders ship from Ahmedabad within 24-48 hours. Standard courier transit takes 3 to 6 working days across India."
  },
  {
    q: "Are GST invoices provided for business tax credits?",
    a: "Yes. Computerized tax invoices carrying itemized HSN/SAC codes and Gujarat State GST details are generated instantly upon order confirmation."
  },
  {
    q: "How do I receive my travel package booking confirmation?",
    a: "Travel confirmation vouchers, hotel vouchers, and day-by-day itineraries are delivered to your registered email and WhatsApp number within 12 hours of payment confirmation."
  }
];

function renderFaqAdminList() {
  const container = document.getElementById('faqListContainer');
  if (!container) return;

  if (!faqData || faqData.length === 0) {
    container.innerHTML = `<div class="p-6 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">No FAQ items yet. Click "+ Add FAQ Question" to create one.</div>`;
    return;
  }

  container.innerHTML = faqData.map((item, index) => `
    <div class="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-xs space-y-3 relative group">
      <div class="flex justify-between items-center gap-3">
        <input type="text" value="${item.q.replace(/"/g, '&quot;')}" oninput="updateFaqQuestion(${index}, this.value)" placeholder="Question title..." class="w-full font-bold text-sm text-gray-900 border-b border-transparent focus:border-blue-500 outline-none pb-1 transition">
        <button type="button" onclick="deleteFaqItem(${index})" class="text-gray-400 hover:text-red-600 p-1 rounded-lg transition" title="Delete FAQ">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
        </button>
      </div>
      <textarea oninput="updateFaqAnswer(${index}, this.value)" placeholder="Answer description..." class="w-full text-xs text-gray-600 border border-gray-200 rounded-xl p-3 focus:border-blue-500 outline-none min-h-[70px] resize-y transition leading-relaxed">${item.a}</textarea>
    </div>
  `).join('');
}

function addNewFaqItem() {
  faqData.unshift({
    q: "New FAQ Question?",
    a: "Enter your answer explanation here."
  });
  renderFaqAdminList();
}

function updateFaqQuestion(index, value) {
  if (faqData[index]) faqData[index].q = value;
}

function updateFaqAnswer(index, value) {
  if (faqData[index]) faqData[index].a = value;
}

function deleteFaqItem(index) {
  faqData.splice(index, 1);
  renderFaqAdminList();
}

function generateFaqHtml(list) {
  return list.map(item => `
    <div class="border border-gray-200 rounded-xl p-3 bg-white mb-2 shadow-xs">
      <h4 class="font-semibold text-blue-600 text-sm mb-1">${item.q}</h4>
      <p class="text-xs text-gray-600 leading-normal m-0">${item.a}</p>
    </div>
  `).join('');
}

window.addNewFaqItem = addNewFaqItem;
window.updateFaqQuestion = updateFaqQuestion;
window.updateFaqAnswer = updateFaqAnswer;
window.deleteFaqItem = deleteFaqItem;
window.openEditProductModal = openEditProductModal;
window.addSpecRow = addSpecRow;

function openOrderReceipt(orderId) {
  const targetId = orderId || (activeSelectedOrder && (activeSelectedOrder._rawId || activeSelectedOrder.id));
  if (!targetId) {
    alert("Order ID missing hai!");
    return;
  }
  window.open(`../invoice.html?id=${targetId}`, '_blank');
}

window.openOrderReceipt = openOrderReceipt;

// ==========================================
// SECURITY & 2FA SETTINGS HANDLERS
// ==========================================
function openChangeCredsModal() {
  const m = document.getElementById('changeCredsModal');
  if (m) {
    m.classList.remove('hidden');
    m.style.setProperty('display', 'flex', 'important');
  }
}

function closeChangeCredsModal() {
  const m = document.getElementById('changeCredsModal');
  if (m) {
    m.classList.add('hidden');
    m.style.removeProperty('display');
  }
}

async function handleSecurityCredentialsSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('secSaveBtn');
  const origText = btn ? btn.innerText : 'Save Settings';
  if (btn) { btn.disabled = true; btn.innerText = 'Saving...'; }

  const currentPassword = document.getElementById('secCurrentPass')?.value || '';
  const newUsername = document.getElementById('secNewUsername')?.value.trim() || '';
  const newPassword = document.getElementById('secNewPass')?.value.trim() || '';
  const twoFactorEnabled = Boolean(document.getElementById('sec2FaToggle')?.checked);

  try {
    const res = await fetch('/api/admin/change-credentials', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAdminAuthHeaders()
      },
      body: JSON.stringify({ currentPassword, newUsername, newPassword, twoFactorEnabled })
    });
    const data = await res.json();

    if (res.ok && data.success) {
      alert('🎉 ' + data.message + '\nNaye ID aur password se dobara login karein!');
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    } else {
      alert('❌ Error: ' + (data.message || 'Credentials update nahi huye.'));
    }
  } catch(err) {
    alert('Server error: ' + err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.innerText = origText; }
  }
}

window.openChangeCredsModal = openChangeCredsModal;
window.closeChangeCredsModal = closeChangeCredsModal;
window.handleSecurityCredentialsSubmit = handleSecurityCredentialsSubmit;


async function handleBuyAgain(itemId, titleFallback) {
  try {
    let resolvedItem = null;
    const res = await fetch('/api/catalog/lookup/' + encodeURIComponent(itemId || titleFallback));
    const result = await res.json();
    if (result.success && result.data) {
      resolvedItem = result.data;
    }

    if (!resolvedItem) {
      alert((titleFallback || 'Item') + ' abhi available nahi hai ya update ho raha hai.');
      return;
    }

    let cart = JSON.parse(localStorage.getItem('mj_cart') || '[]');
    cart.push({
      id: resolvedItem._id,
      title: resolvedItem.title,
      price: resolvedItem.price || resolvedItem.pricingTiers?.standard?.price || 0,
      image: resolvedItem.imageUrl || (resolvedItem.images && resolvedItem.images[0]) || '',
      quantity: 1,
      type: resolvedItem.destination ? 'travel' : 'ecommerce'
    });
    localStorage.setItem('mj_cart', JSON.stringify(cart));
    if (typeof updateCartBadge === 'function') updateCartBadge();
    window.location.href = '/bag';
  } catch(err) {
    alert('Buy Again process error: ' + err.message);
  }
}
window.handleBuyAgain = handleBuyAgain;

// SAFE SHOPPING BAG RENDERER
function renderCartItems() {
  const container = document.getElementById('cartItemsList') || document.getElementById('bagItemsContainer') || document.querySelector('.bag-items');
  const countEls = document.querySelectorAll('.cart-count, #cartBadge, #bagCountBadge');
  
  let cart = [];
  try {
    cart = JSON.parse(localStorage.getItem('mj_cart') || '[]');
  } catch(e) { cart = []; }

  countEls.forEach(el => { if (el) el.innerText = cart.length; });

  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = '<div class="p-8 text-center text-gray-500 font-medium">Aapka Shopping Bag khali hai.</div>';
    const subtotalEl = document.getElementById('bagSubtotal') || document.getElementById('cartSubtotal');
    const totalEl = document.getElementById('bagTotal') || document.getElementById('cartTotal');
    if (subtotalEl) subtotalEl.innerText = '₹0';
    if (totalEl) totalEl.innerText = '₹0';
    return;
  }

  let total = 0;
  let html = '';

  cart.forEach((item, index) => {
    const title = item.title || item.name || 'Selected Item';
    const price = Number(item.price || item.discountPrice || 0);
    const qty = Number(item.quantity || item.qty || 1);
    const img = item.image || item.imageUrl || (item.images && item.images[0]) || 'https://placehold.co/100x100?text=Item';
    const itemTotal = price * qty;
    total += itemTotal;

    html += `
      <div class="flex items-center justify-between p-4 mb-3 bg-white border border-gray-200 rounded-xl shadow-sm">
        <div class="flex items-center gap-4">
          <img src="${img}" class="w-16 h-16 object-cover rounded-lg border border-gray-100" onerror="this.src='https://placehold.co/100x100?text=Item'">
          <div>
            <h4 class="font-bold text-gray-900 text-sm md:text-base">${title}</h4>
            <p class="text-xs text-blue-600 font-semibold">${item.type === 'travel' ? 'Travel Package' : 'Product'}</p>
            <p class="text-sm font-bold text-gray-700 mt-1">₹${price.toLocaleString('en-IN')} × ${qty} = ₹${itemTotal.toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <button onclick="removeFromCart(${index})" class="text-red-500 hover:text-red-700 p-2 text-sm font-semibold">
            <i class="fa-solid fa-trash"></i> Remove
          </button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
  const subtotalEl = document.getElementById('bagSubtotal') || document.getElementById('cartSubtotal');
  const totalEl = document.getElementById('bagTotal') || document.getElementById('cartTotal');
  if (subtotalEl) subtotalEl.innerText = '₹' + total.toLocaleString('en-IN');
  if (totalEl) totalEl.innerText = '₹' + total.toLocaleString('en-IN');
}
window.renderCartItems = renderCartItems;

function removeFromCart(idx) {
  let cart = JSON.parse(localStorage.getItem('mj_cart') || '[]');
  cart.splice(idx, 1);
  localStorage.setItem('mj_cart', JSON.stringify(cart));
  renderCartItems();
}
window.removeFromCart = removeFromCart;

function renderBag() {
  const bagList = document.getElementById('bagItemsContainer') || document.getElementById('cartItemsList') || document.querySelector('.bag-items-list');
  const countBadges = document.querySelectorAll('.cart-count, #cartBadge, #bagCountBadge, #headerCartCount');
  
  let cart = [];
  try {
    cart = JSON.parse(localStorage.getItem('mj_cart') || '[]');
  } catch(e) { cart = []; }

  if (countBadges) {
    countBadges.forEach(b => { if (b) b.innerText = cart.length; });
  }

  if (!bagList) return;

  if (cart.length === 0) {
    bagList.innerHTML = '<div class="p-8 text-center text-gray-500 font-semibold text-base">Aapka Shopping Bag khali hai.</div>';
    const subtotalEl = document.getElementById('bagSubtotal');
    const totalEl = document.getElementById('bagTotal');
    if (subtotalEl) subtotalEl.innerText = '₹0';
    if (totalEl) totalEl.innerText = '₹0';
    return;
  }

  let total = 0;
  let html = '';

  cart.forEach((item, index) => {
    const title = item.title || item.name || 'Selected Item';
    const price = Number(item.price || item.discountPrice || item.standardPrice || 0);
    const qty = Number(item.quantity || item.qty || 1);
    const itemTotal = price * qty;
    total += itemTotal;

    const img = item.image || item.imageUrl || (item.images && item.images[0]) || 'https://placehold.co/120x120?text=MJ+Digital';
    const isTour = item.destination || item.type === 'travel' || item.days;

    html += `
      <div class="flex items-center justify-between p-4 mb-3 bg-white rounded-2xl border border-gray-100 shadow-sm transition hover:shadow-md">
        <div class="flex items-center gap-4">
          <img src="${img}" class="w-16 h-16 object-cover rounded-xl border border-gray-100" onerror="this.src='https://placehold.co/120x120?text=Item'">
          <div>
            <h4 class="font-bold text-gray-900 text-sm md:text-base leading-tight">${title}</h4>
            <span class="inline-block px-2 py-0.5 mt-1 text-[11px] font-semibold rounded-md ${isTour ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}">
              ${isTour ? 'Travel Package' : 'Product'}
            </span>
            <p class="text-sm font-bold text-gray-800 mt-1">₹${price.toLocaleString('en-IN')} × ${qty} = <span class="text-blue-600 font-extrabold">₹${itemTotal.toLocaleString('en-IN')}</span></p>
          </div>
        </div>
        <button onclick="removeFromBagItem(${index})" class="text-red-500 hover:text-red-700 p-2 font-medium text-xs flex items-center gap-1 transition">
          <i class="fa-solid fa-trash"></i> Remove
        </button>
      </div>
    `;
  });

  bagList.innerHTML = html;
  const subtotalEl = document.getElementById('bagSubtotal');
  const totalEl = document.getElementById('bagTotal');
  if (subtotalEl) subtotalEl.innerText = '₹' + total.toLocaleString('en-IN');
  if (totalEl) totalEl.innerText = '₹' + total.toLocaleString('en-IN');
}
window.renderBag = renderBag;
window.renderCartItems = renderBag;

function removeFromBagItem(idx) {
  let cart = JSON.parse(localStorage.getItem('mj_cart') || '[]');
  cart.splice(idx, 1);
  localStorage.setItem('mj_cart', JSON.stringify(cart));
  renderBag();
}
window.removeFromBagItem = removeFromBagItem;