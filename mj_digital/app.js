// ==========================================
// 1. SESSION & AUTH CHECK
// ==========================================
if (localStorage.getItem('mj_admin_session') === 'authenticated') {
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
    const vCont = document.getElementById('variantRowsContainer');
    if (vCont) vCont.innerHTML = '';
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
    const res = await fetch('https://mj-digital-backend-3.onrender.com/api/cms/policies');
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
    const res = await fetch(`https://mj-digital-backend-3.onrender.com/api/cms/policies/${activeCmsTab}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
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
    alert('Server connect error! Check backend port 5000.');
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
    const res = await fetch('https://mj-digital-backend-3.onrender.com/api/analytics/monthly-revenue');
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

function handleTimeframeChange(selectedTimeframe) {
  const canvas = document.getElementById('revenueChart');
  if (!canvas || typeof Chart === 'undefined') return;

  const activeChart = Chart.getChart(canvas);
  if (activeChart) activeChart.destroy();

  let labels = [];
  let ecomData = [];
  let travelData = [];
  const now = new Date();

  if (selectedTimeframe === 'weekly') {
    labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    ecomData = [0, 0, 0, 0];
    travelData = [0, 0, 0, 0];

    ordersList.forEach(ord => {
      const d = ord.createdAt ? new Date(ord.createdAt) : new Date();
      if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
        const weekIdx = Math.min(Math.floor((d.getDate() - 1) / 7), 3);
        const amt = Number(ord.amount || 0);
        if (ord.type === 'travel') travelData[weekIdx] += amt;
        else ecomData[weekIdx] += amt;
      }
    });

  } else if (selectedTimeframe === 'daily') {
    labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    ecomData = [0, 0, 0, 0, 0, 0, 0];
    travelData = [0, 0, 0, 0, 0, 0, 0];

    ordersList.forEach(ord => {
      const d = ord.createdAt ? new Date(ord.createdAt) : new Date();
      const dayIdx = (d.getDay() + 6) % 7;
      const amt = Number(ord.amount || 0);
      if (ord.type === 'travel') travelData[dayIdx] += amt;
      else ecomData[dayIdx] += amt;
    });

  } else {
    labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    ecomData = new Array(12).fill(0);
    travelData = new Array(12).fill(0);

    ordersList.forEach(ord => {
      const d = ord.createdAt ? new Date(ord.createdAt) : new Date();
      if (d.getFullYear() === now.getFullYear()) {
        const monthIdx = d.getMonth();
        const amt = Number(ord.amount || 0);
        if (ord.type === 'travel') travelData[monthIdx] += amt;
        else ecomData[monthIdx] += amt;
      }
    });
  }

  new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Products (₹)',
          data: ecomData,
          backgroundColor: '#4f46e5',
          borderRadius: 6,
          barThickness: 14
        },
        {
          label: 'Travel Packages (₹)',
          data: travelData,
          backgroundColor: '#0d9488',
          borderRadius: 6,
          barThickness: 14
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: v => '₹' + (v >= 1000 ? (v / 1000) + 'k' : v) }
        },
        x: { grid: { display: false } }
      }
    }
  });
}

function updateChartData(filterValue) {
  handleTimeframeChange(filterValue);
}

window.handleTimeframeChange = handleTimeframeChange;
window.renderRevenueChart = renderRevenueChart;
window.updateChartData = updateChartData;

// ==========================================
// 6. LIVE PRODUCTS CATALOG & DYNAMIC VARIANT BUILDER
// ==========================================
function addVariantRow(color = '', ram = '', storage = '', size = '', price = '') {
  const container = document.getElementById('variantRowsContainer');
  if (!container) return;

  const rowId = 'var_' + Date.now() + Math.random().toString(36).substr(2, 4);
  const row = document.createElement('div');
  row.id = rowId;
  row.className = 'grid grid-cols-6 gap-2 items-center bg-gray-50 p-2 rounded-lg border border-gray-200 variant-row-item';

  row.innerHTML = `
    <input type="text" placeholder="Colour (e.g. Red)" value="${color}" class="col-var-color border p-1.5 rounded text-xs bg-white outline-none">
    <input type="text" placeholder="RAM (e.g. 12GB)" value="${ram}" class="col-var-ram border p-1.5 rounded text-xs bg-white outline-none">
    <input type="text" placeholder="Storage (e.g. 256GB)" value="${storage}" class="col-var-storage border p-1.5 rounded text-xs bg-white outline-none">
    <input type="text" placeholder="Size (e.g. 6.1 inch)" value="${size}" class="col-var-size border p-1.5 rounded text-xs bg-white outline-none">
    <input type="number" placeholder="Price (₹)" value="${price}" class="col-var-price border p-1.5 rounded text-xs font-bold text-blue-600 bg-white outline-none">
    <div class="text-right">
      <button type="button" onclick="document.getElementById('${rowId}').remove()" class="text-rose-500 hover:text-rose-700 text-xs font-bold p-1">
        ✕ Remove
      </button>
    </div>
  `;
  container.appendChild(row);
}
window.addVariantRow = addVariantRow;

function collectVariantsMatrix() {
  const rows = document.querySelectorAll('.variant-row-item');
  const configs = [];
  const options = {
    colors: new Set(),
    ram: new Set(),
    storage: new Set(),
    sizes: new Set()
  };

  rows.forEach(r => {
    const color = r.querySelector('.col-var-color')?.value.trim() || '';
    const ram = r.querySelector('.col-var-ram')?.value.trim() || '';
    const storage = r.querySelector('.col-var-storage')?.value.trim() || '';
    const size = r.querySelector('.col-var-size')?.value.trim() || '';
    const price = Number(r.querySelector('.col-var-price')?.value || 0);

    if (price > 0) {
      if (color) options.colors.add(color);
      if (ram) options.ram.add(ram);
      if (storage) options.storage.add(storage);
      if (size) options.sizes.add(size);

      configs.push({ color, ram, storage, size, price });
    }
  });

  return {
    variantOptions: {
      colors: Array.from(options.colors),
      ram: Array.from(options.ram),
      storage: Array.from(options.storage),
      sizes: Array.from(options.sizes)
    },
    configurations: configs
  };
}

async function loadAdminProducts() {
  const tbody = document.getElementById('productsTableBody');

  try {
    const res = await fetch('https://mj-digital-backend-3.onrender.com/api/products');
    const result = await res.json();
    const products = Array.isArray(result) ? result : (result.data || []);
    productsList = products;

    const productStatEl = document.getElementById('statTotalProducts');
    if (productStatEl) productStatEl.innerText = `${products.length} Items`;

    const uniqueCategories = new Set(products.map(p => p.category).filter(Boolean));
    const catEl = document.getElementById('statProductCategories') || document.querySelector('.fa-box-open ~ span') || document.querySelector('.fa-box-open')?.parentElement;
    if (catEl) {
      catEl.innerHTML = `<i class="fa-solid fa-box-open"></i> ${uniqueCategories.size} Categories`;
    }

    syncLiveActivityFeed();
    syncNotificationsDropdown();

    if (tbody) {
      if (products.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-gray-400 text-sm">Database mein koi product nahi mila. "+ Add Product" se create karein.</td></tr>`;
        return;
      }

      tbody.innerHTML = products.map(prod => {
        const img = (prod.images && prod.images[0]) || prod.imageUrl || 'https://placehold.co/50';
        const price = prod.price || 0;
        const stock = prod.stock ?? 0;
        const status = prod.status || (stock > 0 ? 'Active' : 'Out of Stock');
        
        // FIX: Case-insensitive active check taaki green color hamesha preserve rahe
        const isItemActive = String(status).toLowerCase() === 'active';
        const statusBadgeClass = isItemActive 
          ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
          : 'bg-rose-50 text-rose-600 border-rose-200';

        return `
          <tr class="border-b border-gray-100 hover:bg-gray-50/50 transition">
            <td class="p-3 flex items-center gap-3">
              <img src="${img}" class="w-10 h-10 object-cover rounded-lg border">
              <div>
                <span class="font-bold text-gray-800 block">${prod.title || prod.name || 'Untitled'}</span>
                <span class="text-xs text-gray-400">${prod.brand || '-'}</span>
              </div>
            </td>
            <td class="p-3 text-gray-600 text-xs">${prod.brand || '-'}</td>
            <td class="p-3"><span class="px-2 py-1 bg-gray-100 rounded-md text-xs font-semibold">${prod.category || 'General'}</span></td>
            <td class="p-3 text-xs">
              <div class="flex items-center gap-1">
                <span class="text-gray-500 font-bold">₹</span>
                <input type="number" value="${price}" 
                  class="w-20 px-2 py-1 border border-gray-200 rounded-lg text-xs font-bold text-gray-800 focus:outline-none focus:border-blue-500 bg-white"
                  onchange="quickUpdateProduct('${prod._id}', 'price', this.value)"
                />
              </div>
            </td>
            <td class="p-3 text-xs">
              <input type="number" value="${stock}" 
                class="w-16 px-2 py-1 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 focus:outline-none focus:border-blue-500 bg-white text-center"
                onchange="quickUpdateProduct('${prod._id}', 'stock', this.value)"
              />
            </td>
            <td class="p-3">
              <select onchange="updateProductStatus('${prod._id}', this.value)" 
                class="text-xs font-semibold px-2 py-1 rounded-lg border outline-none cursor-pointer ${statusBadgeClass}">
                <option value="Active" ${isItemActive ? 'selected' : ''}>Active</option>
                <option value="Inactive" ${String(status).toLowerCase() === 'inactive' ? 'selected' : ''}>Inactive</option>
                <option value="Out of Stock" ${String(status).toLowerCase().includes('stock') ? 'selected' : ''}>Out of Stock</option>
              </select>
            </td>
            <td class="p-3 text-right">
              <div class="flex items-center justify-end gap-1">
                <button type="button" onclick="openEditProductModal('${prod._id}')" class="text-blue-500 hover:text-blue-700 p-1.5 rounded-lg hover:bg-blue-50 transition" title="Edit Full Product">
                  <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button type="button" onclick="deleteProduct('${prod._id}')" class="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-red-50 transition" title="Delete Product">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }
  } catch (err) {
    console.error('Error loading products to table:', err);
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-rose-500 font-semibold">Backend server connect nahi ho saka.</td></tr>`;
    }
  }
}

function openEditProductModal(id) {
  const prod = productsList.find(p => String(p._id) === String(id));
  if (!prod) {
    alert('Product details nahi mili!');
    return;
  }

  editingProductId = prod._id;

  const tEl = document.getElementById('prodTitle');
  if (tEl) tEl.value = prod.title || prod.name || '';
  const bEl = document.getElementById('prodBrand');
  if (bEl) bEl.value = prod.brand || '';
  const cEl = document.getElementById('prodCat');
  if (cEl) cEl.value = prod.category || 'Fashion';
  
  // FIX: Numeric values ko safely bind karein taaki input field empty na rahe
  const pEl = document.getElementById('prodPrice');
  if (pEl) pEl.value = (prod.price !== undefined && prod.price !== null) ? prod.price : '';
  const dEl = document.getElementById('prodDiscountPrice');
  if (dEl) dEl.value = (prod.discountPrice !== undefined && prod.discountPrice !== null) ? prod.discountPrice : '';
  
  const sEl = document.getElementById('prodStock');
  if (sEl) sEl.value = prod.stock ?? 0;
  const imgEl = document.getElementById('prodImage');
  if (imgEl) imgEl.value = prod.imageUrl || (prod.images && prod.images[0]) || '';
  
  const descEl = document.querySelector('textarea[name="detailed_description"], textarea[name="description"]');
  if (descEl) descEl.value = prod.description || prod.detailedDescription || '';

  const specsCont = document.getElementById('specsContainer');
  if (specsCont) {
    specsCont.innerHTML = '';
    const specs = Array.isArray(prod.specifications) ? prod.specifications : [];
    if (specs.length > 0) {
      specs.forEach(s => addSpecRow(s.key || '', s.value || ''));
    } else {
      addSpecRow();
      addSpecRow();
    }
  }

  const vCont = document.getElementById('variantRowsContainer');
  if (vCont) {
    vCont.innerHTML = '';
    let parsedV = prod.variants;
    if (typeof parsedV === 'string') {
      try { parsedV = JSON.parse(parsedV); } catch(e) { parsedV = {}; }
    }
    const configs = parsedV?.configurations || [];
    if (configs.length > 0) {
      configs.forEach(c => addVariantRow(c.color, c.ram, c.storage, c.size, c.price));
    }
  }

  const varArea = document.getElementById('prodVariantsJson');
  if (varArea) {
    if (prod.variants) {
      try {
        varArea.value = typeof prod.variants === 'object' && Object.keys(prod.variants).length > 0 
          ? JSON.stringify(prod.variants, null, 2) 
          : (typeof prod.variants === 'string' ? prod.variants : JSON.stringify(prod.variants, null, 2));
      } catch (e) {
        varArea.value = '';
      }
    } else {
      varArea.value = '';
    }
  }

  const modalTitle = document.querySelector('#addProductModal h3');
  if (modalTitle) modalTitle.innerText = 'Edit Product (Full Catalog Update)';

  openModal('addProductModal');
}
window.openEditProductModal = openEditProductModal;

async function handleProductSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);

  const title = document.getElementById('prodTitle')?.value || form.querySelector('[name="title"]')?.value || formData.get('title') || '';
  const brand = document.getElementById('prodBrand')?.value || form.querySelector('[name="brand"]')?.value || formData.get('brand') || '';
  const category = document.getElementById('prodCat')?.value || form.querySelector('[name="category"]')?.value || formData.get('category') || 'Fashion';
  
  // FIX: DOM element se price nikal kar form data me strictly number set karein
  const priceInputVal = document.getElementById('prodPrice')?.value;
  const price = Number(priceInputVal !== undefined && priceInputVal !== '' ? priceInputVal : (formData.get('price') || 0));
  
  const discountInputVal = document.getElementById('prodDiscountPrice')?.value;
  const discountPrice = discountInputVal ? Number(discountInputVal) : null;
  
  const stock = Number(document.getElementById('prodStock')?.value || form.querySelector('[name="stock"]')?.value || formData.get('stock') || 10);
  const imageUrl = document.getElementById('prodImage')?.value || form.querySelector('[name="imageUrl"]')?.value || formData.get('imageUrl') || '';
  const desc = form.querySelector('[name="detailed_description"]')?.value || form.querySelector('[name="description"]')?.value || formData.get('description') || '';

  const specsContainer = document.getElementById('specsContainer');
  const specifications = [];
  if (specsContainer) {
    specsContainer.querySelectorAll('.spec-row, div.flex, div').forEach(row => {
      const inputs = row.querySelectorAll('input[type="text"]');
      if (inputs.length >= 2) {
        const k = String(inputs[0]?.value || '').trim();
        const v = String(inputs[1]?.value || '').trim();
        if (k || v) {
          specifications.push({ key: k, value: v });
        }
      }
    });
  }

  if (!title.trim()) {
    alert('Product Name / Title likhna zaroori hai!');
    return;
  }

  let variantData = collectVariantsMatrix();

  if (variantData.configurations.length === 0) {
    const rawJson = document.getElementById('prodVariantsJson')?.value?.trim();
    if (rawJson) {
      try {
        variantData = JSON.parse(rawJson);
      } catch (e) {
        console.warn('Invalid fallback JSON in variants');
      }
    }
  }

  formData.set('title', title.trim());
  formData.set('brand', brand.trim());
  formData.set('category', category.trim());
  formData.set('price', price);
  if (discountPrice !== null) {
    formData.set('discountPrice', discountPrice);
  } else {
    formData.delete('discountPrice');
  }
  formData.set('stock', stock);
  
  // FIX: Status hamesha Capital standard me bhejein
  formData.set('status', stock > 0 ? 'Active' : 'Out of Stock');
  formData.set('description', desc);
  formData.set('detailedDescription', desc);
  formData.set('type', 'ecommerce');
  formData.set('specifications', JSON.stringify(specifications));
  formData.set('variants', JSON.stringify(variantData));
  if (imageUrl) formData.set('imageUrl', imageUrl);

  const fileInput = form.querySelector('input[type="file"]');
  if (fileInput && fileInput.files.length > 0) {
    formData.delete('images');
    formData.delete('imageFiles');
    formData.delete('image');
    Array.from(fileInput.files).forEach(file => {
      formData.append('images', file);
    });
  }

  const method = editingProductId ? 'PUT' : 'POST';
  const endpoint = editingProductId 
    ? `https://mj-digital-backend-3.onrender.com/api/products/${editingProductId}` 
    : 'https://mj-digital-backend-3.onrender.com/api/products';

  try {
    const res = await fetch(endpoint, {
      method: method,
      body: formData
    });

    const result = await res.json();
    if (res.ok && (result.success || result._id || result.data)) {
      alert(`🎉 Product successfully ${editingProductId ? 'updated' : 'saved'} ho gaya!`);
      form.reset();
      editingProductId = null;
      
      const modalTitle = document.querySelector('#addProductModal h3');
      if (modalTitle) modalTitle.innerText = 'Add New Product';

      const cont = document.getElementById('specsContainer');
      if (cont) {
        cont.innerHTML = '';
        addSpecRow();
        addSpecRow();
      }
      const vCont = document.getElementById('variantRowsContainer');
      if (vCont) vCont.innerHTML = '';
      
      closeModal('addProductModal');
      loadAdminProducts();
    } else {
      alert('Save Error: ' + (result.message || 'Product save nahi hua.'));
    }
  } catch (err) {
    console.error('Product save network error:', err);
    alert('Server se connect nahi ho paya. Port 5000 check karein.');
  }
}

async function deleteProduct(productId) {
  if (!confirm('Kya aap sach mein ye product delete karna chahte hain?')) return;

  try {
    const res = await fetch(`https://mj-digital-backend-3.onrender.com/api/products/${productId}`, {
      method: 'DELETE'
    });
    const data = await res.json();

    if (res.ok && data.success) {
      loadAdminProducts();
    } else {
      alert('Delete failed: ' + (data.message || 'Server error'));
    }
  } catch (err) {
    console.error('Delete error:', err);
    alert('Server connection error while deleting.');
  }
}

async function quickUpdateProduct(id, field, value) {
  try {
    const payload = {};
    payload[field] = Number(value);

    const res = await fetch(`https://mj-digital-backend-3.onrender.com/api/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      alert('Update failed: ' + (data.message || 'Server error'));
      loadAdminProducts();
    }
  } catch (err) {
    console.error('Quick update error:', err);
  }
}

async function updateProductStatus(id, status) {
  try {
    const res = await fetch(`https://mj-digital-backend-3.onrender.com/api/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (res.ok) {
      loadAdminProducts();
    }
  } catch (e) {
    console.error('Status error:', e);
  }
}

function filterProductsTable() {
  const searchVal = document.getElementById('prodSearchInput')?.value.toLowerCase().trim() || '';
  const catVal = document.getElementById('prodCategoryFilter')?.value || 'all';
  const statusVal = document.getElementById('prodStatusFilter')?.value || 'all';

  const filtered = productsList.filter(item => {
    const title = (item.title || item.name || '').toLowerCase();
    const brand = (item.brand || '').toLowerCase();
    const matchesSearch = title.includes(searchVal) || brand.includes(searchVal);
    const matchesCat = (catVal === 'all') || (item.category === catVal);
    const matchesStatus = (statusVal === 'all') || (item.status === statusVal);
    return matchesSearch && matchesCat && matchesStatus;
  });

  const tbody = document.getElementById('productsTableBody');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-gray-400 text-xs">No matching products found.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(item => `
    <tr class="hover:bg-gray-50 transition border-b border-gray-100">
      <td class="p-3 font-semibold text-gray-900">${item.title || item.name || '-'}</td>
      <td class="p-3 text-xs text-gray-500">${item.brand || '-'}</td>
      <td class="p-3 text-xs text-gray-600"><span class="bg-gray-100 px-2 py-0.5 rounded border">${item.category || '-'}</span></td>
      <td class="p-3 font-bold text-gray-800">₹${Number(item.price || 0).toLocaleString('en-IN')}</td>
      <td class="p-3 text-xs text-gray-600 font-medium">${item.stock ?? 0}</td>
      <td class="p-3">
        <span class="text-xs font-bold px-2.5 py-1 rounded-full ${
          String(item.status).toLowerCase() === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
        }">
          ${item.status || 'Active'}
        </span>
      </td>
      <td class="p-3 text-right">
        <div class="flex items-center justify-end gap-1">
          <button type="button" onclick="openEditProductModal('${item._id}')" class="text-blue-500 hover:text-blue-700 p-1.5 rounded-lg hover:bg-blue-50 transition" title="Edit Full Product">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button type="button" onclick="deleteProduct('${item._id}')" class="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-red-50 transition" title="Delete Product">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function addSpecRow(key = '', value = '') {
  const container = document.getElementById('specsContainer');
  if (!container) return;

  const row = document.createElement('div');
  row.className = 'flex gap-2 items-center spec-row mb-2';
  row.innerHTML = `
    <input type="text" placeholder="Key (e.g. RAM)" value="${key}" class="w-1/2 border p-2 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 spec-key">
    <input type="text" placeholder="Value (e.g. 16GB)" value="${value}" class="w-1/2 border p-2 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 spec-val">
    <button type="button" onclick="this.parentElement.remove()" class="text-rose-500 hover:text-rose-700 font-bold px-2 text-sm">✕</button>
  `;
  container.appendChild(row);
}

document.addEventListener('DOMContentLoaded', () => {
  const cont = document.getElementById('specsContainer');
  if (cont && cont.children.length === 0) {
    addSpecRow();
    addSpecRow();
  }
});

document.addEventListener('change', (e) => {
  if (e.target && e.target.id === 'prodImageFile') {
    const file = e.target.files[0];
    const preview = document.getElementById('prodImagePreview');
    const container = document.getElementById('prodImagePreviewContainer');
    if (file && preview && container) {
      preview.src = URL.createObjectURL(file);
      container.classList.remove('hidden');
    }
  }
});

window.loadAdminProducts = loadAdminProducts;
window.loadProductsCatalog = loadAdminProducts;
window.renderProductsTable = loadAdminProducts;
window.handleProductSubmit = handleProductSubmit;
window.deleteProduct = deleteProduct;
window.quickUpdateProduct = quickUpdateProduct;
window.updateProductStatus = updateProductStatus;
window.filterProductsTable = filterProductsTable;
window.addSpecRow = addSpecRow;
window.openEditProductModal = openEditProductModal;

// ==========================================
// 7. LIVE TRAVEL PACKAGES MODULE
// ==========================================
async function loadAdminTravelPackages() {
  const container = document.getElementById('travelList');

  try {
    const res = await fetch('https://mj-digital-backend-3.onrender.com/api/travel-packages');
    const result = await res.json();
    const packages = Array.isArray(result) ? result : (result.data || []);
    cachedTravelPackages = packages;

    const travelStat = document.getElementById('statTotalTravel') || document.querySelector('.fa-plane ~ h3') || document.querySelector('.stat-travel');
    if (travelStat) {
      travelStat.innerText = `${packages.length} Packages`;
    }

    const destSet = new Set(packages.map(p => p.destination).filter(Boolean));
    const destSubtitle = document.querySelector('#statTotalTravel ~ span') || document.querySelector('.fa-location-dot ~ span');
    if (destSubtitle && destSet.size > 0) {
      destSubtitle.innerText = `${destSet.size} Destinations`;
    }

    if (!container) return;

    if (packages.length === 0) {
      container.innerHTML = '<div class="col-span-3 text-gray-400 py-6 text-center text-sm">Database mein koi travel package nahi mila.</div>';
      return;
    }

    container.innerHTML = packages.map(pkg => {
      const price = pkg.pricingTiers?.standard?.price || pkg.price || 0;
      const days = pkg.duration?.days || 1;
      const nights = pkg.duration?.nights || 0;
      const currentStatus = pkg.status || 'Active';

      let badgeClass = 'bg-emerald-50 text-emerald-600 border border-emerald-200';
      if (currentStatus === 'Inactive') badgeClass = 'bg-gray-100 text-gray-500 border border-gray-200';
      if (currentStatus === 'Coming Soon') badgeClass = 'bg-amber-50 text-amber-600 border border-amber-200';

      return `
        <div class="bg-white border rounded-xl p-4 shadow-sm flex flex-col justify-between relative hover:shadow-md transition">
          <div>
            <div class="flex justify-between items-start mb-2">
              <span class="px-2.5 py-0.5 text-[11px] font-semibold rounded-full ${badgeClass}">
                ${currentStatus}
              </span>
              <div class="flex items-center gap-2">
                <button type="button" onclick="openEditTravelModal('${pkg._id}')" class="text-blue-500 hover:text-blue-700 text-xs font-semibold p-1 hover:bg-blue-50 rounded" title="Edit Full Package">
                  <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button type="button" onclick="deleteTravelPackage('${pkg._id}')" class="text-red-400 hover:text-red-600 text-xs font-semibold p-1 hover:bg-red-50 rounded" title="Delete Package">
                  <i class="fa-solid fa-trash-can"></i>
                </button>
              </div>
            </div>
            <h3 class="font-bold text-lg text-gray-800">${pkg.title || 'Untitled Package'}</h3>
            <p class="text-xs text-gray-500 mt-1">Destination: ${pkg.destination || 'N/A'} (${days}D / ${nights}N)</p>
          </div>

          <div class="mt-4 pt-3 border-t flex justify-between items-center">
            <div class="flex items-center gap-1">
              <span class="text-blue-600 font-bold text-base">₹</span>
              <input 
                type="number" 
                value="${price}" 
                class="w-28 px-2 py-1 border border-gray-200 rounded-lg text-base font-bold text-blue-600 focus:outline-none focus:border-blue-500 bg-white"
                onchange="quickUpdateTravelPrice('${pkg._id}', this.value)"
              />
            </div>
            <select 
              onchange="updateTravelStatus('${pkg._id}', this.value)" 
              class="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-gray-200 outline-none cursor-pointer bg-white text-gray-700 hover:border-blue-500 transition shadow-sm"
            >
              <option value="Active" ${currentStatus === 'Active' ? 'selected' : ''}>Active</option>
              <option value="Inactive" ${currentStatus === 'Inactive' ? 'selected' : ''}>Inactive</option>
              <option value="Coming Soon" ${currentStatus === 'Coming Soon' ? 'selected' : ''}>Coming Soon</option>
            </select>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Error loading travel packages:', err);
  }
}

async function handleTravelSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);

  const fileInput = form.querySelector('input[type="file"]');
  if (fileInput && fileInput.files.length > 0) {
    formData.delete('images');
    Array.from(fileInput.files).forEach(file => {
      formData.append('images', file);
    });
  }

  try {
    const res = await fetch('https://mj-digital-backend-3.onrender.com/api/travel-packages', {
      method: 'POST',
      body: formData
    });

    const result = await res.json();
    if (res.ok && result.success) {
      alert('🎉 Travel Package successfully save ho gaya!');
      form.reset();
      closeModal('addTravelModal');
      loadAdminTravelPackages();
    } else {
      alert(result.message || 'Error saving travel package');
    }
  } catch (err) {
    console.error('Travel submit network error:', err);
    alert('Server se connect nahi ho paya. Make sure backend port 5000 par live hai.');
  }
}

async function deleteTravelPackage(id) {
  if (!confirm('Kya aap sach me is travel package ko delete karna chahte hain?')) return;
  try {
    const res = await fetch(`https://mj-digital-backend-3.onrender.com/api/travel-packages/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok && data.success) {
      loadAdminTravelPackages();
    } else {
      alert('Delete fail: ' + (data.message || 'Server error'));
    }
  } catch (e) {
    console.error(e);
    alert('Server error while deleting package.');
  }
}

async function updateTravelStatus(id, newStatus) {
  try {
    const res = await fetch(`https://mj-digital-backend-3.onrender.com/api/travel-packages/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      loadAdminTravelPackages();
    } else {
      alert('Status update failed: ' + (data.message || 'Server error'));
    }
  } catch (e) {
    console.error(e);
    alert('Server connection error while updating status.');
  }
}

async function quickUpdateTravelPrice(id, newPrice) {
  try {
    const res = await fetch(`https://mj-digital-backend-3.onrender.com/api/travel-packages/${id}/quick-update`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price: Number(newPrice) })
    });
    const data = await res.json();
    if (!res.ok) {
      alert('Price update fail: ' + (data.message || 'Server error'));
      loadAdminTravelPackages();
    }
  } catch (e) {
    console.error(e);
    alert('Server connection error while updating price.');
  }
}

function openEditTravelModal(id) {
  const pkg = cachedTravelPackages.find(p => p._id === id);
  if (!pkg) {
    alert('Package details nahi mili.');
    return;
  }

  document.getElementById('editTravelId').value = pkg._id;
  document.getElementById('editTravelTitle').value = pkg.title || '';
  document.getElementById('editTravelDestination').value = pkg.destination || '';
  document.getElementById('editTravelDays').value = pkg.duration?.days || 1;
  document.getElementById('editTravelNights').value = pkg.duration?.nights || 0;
  document.getElementById('editStandardPrice').value = pkg.pricingTiers?.standard?.price ?? pkg.price ?? 0;
  document.getElementById('editDeluxePrice').value = pkg.pricingTiers?.deluxe?.price ?? '';
  document.getElementById('editLuxuryPrice').value = pkg.pricingTiers?.luxury?.price ?? '';
  document.getElementById('editTravelInclusions').value = Array.isArray(pkg.inclusions) ? pkg.inclusions.join(', ') : '';

  openModal('editTravelModal');
}

async function handleEditTravelSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);
  const id = document.getElementById('editTravelId').value;

  if (!id) {
    alert('Package ID missing hai. Page reload karke dobara try karein.');
    return;
  }

  const payload = {
    title: formData.get('title'),
    destination: formData.get('destination'),
    days: Number(formData.get('days')) || 1,
    nights: Number(formData.get('nights')) || 0,
    standardPrice: Number(formData.get('standardPrice')) || 0,
    deluxePrice: formData.get('deluxePrice') ? Number(formData.get('deluxePrice')) : null,
    luxuryPrice: formData.get('luxuryPrice') ? Number(formData.get('luxuryPrice')) : null,
    inclusions: formData.get('inclusions')
  };

  try {
    const res = await fetch(`https://mj-digital-backend-3.onrender.com/api/travel-packages/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (res.ok && data.success) {
      alert('Travel Package updated successfully!');
      closeModal('editTravelModal');
      loadAdminTravelPackages();
    } else {
      alert(data.message || 'Update failed');
    }
  } catch (err) {
    console.error('Travel Edit Error:', err);
    alert('Server connect error while updating package. Terminal me server check karein.');
  }
}

window.loadAdminTravelPackages = loadAdminTravelPackages;
window.handleTravelSubmit = handleTravelSubmit;
window.deleteTravelPackage = deleteTravelPackage;
window.updateTravelStatus = updateTravelStatus;
window.toggleTravelStatus = updateTravelStatus;
window.quickUpdateTravelPrice = quickUpdateTravelPrice;
window.openEditTravelModal = openEditTravelModal;
window.handleEditTravelSubmit = handleEditTravelSubmit;
window.closeEditTravelModal = () => closeModal('editTravelModal');

// ==========================================
// 8. CATEGORIES MANAGEMENT
// ==========================================
async function loadParentCategoryDropdown() {
  try {
    const res = await fetch('https://mj-digital-backend-3.onrender.com/api/categories');
    const result = await res.json();
    const select = document.getElementById('parentCategorySelect');
    if (!select) return;

    select.innerHTML = '<option value="">None (Top-Level Category)</option>';
    if (result.success && result.data) {
      result.data.filter(cat => !cat.parent).forEach(parent => {
        select.innerHTML += `<option value="${parent._id}">${parent.name} (${(parent.type || 'ecommerce').toUpperCase()})</option>`;
      });
    }
  } catch (err) {
    console.error('Dropdown load error:', err);
  }
}

async function loadCategoriesCatalog() {
  const tbody = document.getElementById('categoryTableBody') || document.getElementById('categoriesTableBody');
  const prodCatSelect = document.getElementById('prodCategory') || document.getElementById('prodCat');

  try {
    const res = await fetch('https://mj-digital-backend-3.onrender.com/api/categories');
    const result = await res.json();
    const categories = Array.isArray(result) ? result : (result.data || []);

    if (prodCatSelect) {
      prodCatSelect.innerHTML = `<option value="">Select Category</option>` + 
        categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('');
    }

    if (tbody) {
      if (categories.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-gray-400 text-xs">No categories added yet.</td></tr>`;
        return;
      }

      tbody.innerHTML = categories.map(cat => `
        <tr class="hover:bg-gray-50/50 transition border-b border-gray-100">
          <td class="py-3 px-4 font-semibold text-gray-800 text-xs">${cat.name}</td>
          <td class="py-3 px-4">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${cat.type === 'travel' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}">
              ${(cat.type || 'ecommerce').toUpperCase()}
            </span>
          </td>
          <td class="py-3 px-4 text-gray-500 text-xs">${cat.parent ? cat.parent.name : '— (Main)'}</td>
          <td class="py-3 px-4 text-gray-500 text-xs">${cat.slug || '-'}</td>
          <td class="py-3 px-4 text-center">
            <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
              Active
            </span>
          </td>
          <td class="py-3 px-4 text-right space-x-2">
            <button onclick="deleteCategory('${cat._id}')" class="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition" title="Delete Category">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    console.error('Table load error:', err);
  }
}

async function handleCategorySubmit(event) {
  event.preventDefault();
  const form = event.target;
  const formData = new FormData(form);

  const payload = {
    name: formData.get('name'),
    type: formData.get('type') || 'ecommerce'
  };

  if (!payload.name || !payload.name.trim()) {
    alert('Category name likhna zaroori hai.');
    return;
  }

  try {
    const res = await fetch('https://mj-digital-backend-3.onrender.com/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (res.ok && data.success) {
      alert('Category successfully add ho gayi!');
      form.reset();
      closeModal('addCategoryModal');
      loadCategoriesCatalog();
    } else {
      alert(data.message || 'Category save fail ho gayi.');
    }
  } catch (err) {
    console.error('Category error:', err);
    alert('Server connect error.');
  }
}

async function deleteCategory(id) {
  if (!id || id === 'undefined') return alert('Category ID missing hai.');
  if (!confirm('Kya aap sach mein is category ko delete karna chahte hain?')) return;

  try {
    const res = await fetch(`https://mj-digital-backend-3.onrender.com/api/categories/${id}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (res.ok && data.success) {
      alert('Category deleted successfully!');
      loadCategoriesCatalog();
    } else {
      alert(data.message || 'Category delete nahi ho payi.');
    }
  } catch (err) {
    console.error('Delete category error:', err);
    alert('Delete category error: Server se connection fail hua. Backend terminal check karein.');
  }
}

window.loadCategoriesCatalog = loadCategoriesCatalog;
window.loadCategoriesTable = loadCategoriesCatalog;
window.handleCategorySubmit = handleCategorySubmit;
window.deleteCategory = deleteCategory;
window.loadParentCategoryDropdown = loadParentCategoryDropdown;

// ==========================================
// 9. ORDERS & BOOKINGS MANAGEMENT + RECEIPT
// ==========================================
// ==========================================
// 9. ORDERS & BOOKINGS MANAGEMENT + RECEIPT + CATEGORY ANALYTICS
// ==========================================
let categoryChartInstance = null;

function updateDashboardMetrics(orders) {
  if (!Array.isArray(orders)) return;
  const totalRev = orders.reduce((sum, ord) => sum + Number(ord.amount || 0), 0);
  const revEl = document.getElementById('statTotalRevenue');
  if (revEl) revEl.innerText = `₹${totalRev.toLocaleString('en-IN')}`;

  const ordersEl = document.getElementById('statTotalOrders');
  if (ordersEl) ordersEl.innerText = `${orders.length} Total`;

  const sidebarBadge = document.getElementById('sidebarOrdersBadge');
  if (sidebarBadge) {
    sidebarBadge.innerText = orders.length;
  }

  // --- DYNAMIC CATEGORY-WISE REVENUE BREAKDOWN ---
  const catTotals = {
    'Mobile & Electronics': 0,
    'Fashion': 0,
    'Travel Packages': 0,
    'Services & IT': 0
  };

  orders.forEach(ord => {
    const amt = Number(ord.amount || ord.totalAmount || 0);
    const cat = String(ord.category || ord.type || '').toLowerCase();
    const title = String(ord.itemTitle || '').toLowerCase();

    if (cat.includes('travel') || title.includes('tour') || title.includes('package') || title.includes('zeeland') || title.includes('bali')) {
      catTotals['Travel Packages'] += amt;
    } else if (cat.includes('fashion') || title.includes('shirt') || title.includes('cotton') || title.includes('dress')) {
      catTotals['Fashion'] += amt;
    } else if (cat.includes('service') || title.includes('digital') || title.includes('it')) {
      catTotals['Services & IT'] += amt;
    } else {
      catTotals['Mobile & Electronics'] += amt;
    }
  });

  // Summary Cards Update
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.innerText = `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };
  setVal('catMetricElectronics', catTotals['Mobile & Electronics']);
  setVal('catMetricFashion', catTotals['Fashion']);
  setVal('catMetricTravel', catTotals['Travel Packages']);
  setVal('catMetricServices', catTotals['Services & IT']);

  // Render Doughnut Chart
  renderCategoryDoughnutChart(Object.keys(catTotals), Object.values(catTotals));
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

function updateDashboardChart(orders) {
  const canvas = document.getElementById('revenueChart');
  if (!canvas || typeof Chart === 'undefined') return;

  if (!Array.isArray(orders)) orders = [];

  const activeChart = Chart.getChart(canvas);
  if (activeChart) activeChart.destroy();

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const ecomMonthly = new Array(12).fill(0);
  const travelMonthly = new Array(12).fill(0);

  orders.forEach(ord => {
    const ordDate = ord.createdAt ? new Date(ord.createdAt) : new Date();
    const monthIdx = ordDate.getMonth();
    const amount = Number(ord.amount || ord.totalAmount || 0);

    const isTravel = String(ord.type || ord.orderType || '').toLowerCase().includes('travel');
    if (isTravel) {
      travelMonthly[monthIdx] += amount;
    } else {
      ecomMonthly[monthIdx] += amount;
    }
  });

  new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels: months,
      datasets: [
        {
          label: 'Products (₹)',
          data: ecomMonthly,
          backgroundColor: '#4f46e5',
          borderRadius: 6,
          barThickness: 12
        },
        {
          label: 'Travel Packages (₹)',
          data: travelMonthly,
          backgroundColor: '#0d9488',
          borderRadius: 6,
          barThickness: 12
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: v => '₹' + (v >= 1000 ? (v / 1000) + 'k' : v)
          }
        },
        x: { grid: { display: false } }
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
    const res = await fetch('https://mj-digital-backend-3.onrender.com/api/orders');
    const result = await res.json();
    const rawOrders = Array.isArray(result) ? result : (result.data || result.orders || []);

    ordersList = rawOrders.map(raw => {
      const rawType = String(raw.orderType || raw.type || raw.category || '').toLowerCase();
      const rawCat = String(raw.itemDetails?.category || raw.category || '').toLowerCase();
      const titleText = String(raw.itemDetails?.title || raw.title || '').toLowerCase();
      
      let resolvedType = 'Product';
      
      if (rawType.includes('travel') || rawType.includes('tour') || rawType.includes('package') || titleText.includes('zeeland') || titleText.includes('bali') || titleText.includes('hongkong') || titleText.includes('goa')) {
        resolvedType = 'Travel Package';
      } else if (rawType.includes('mobile') || rawCat.includes('mobile') || titleText.includes('phone') || titleText.includes('iphone') || titleText.includes('pro')) {
        resolvedType = 'Mobile';
      } else if (rawType.includes('electronic') || rawCat.includes('electronic') || titleText.includes('gadget') || titleText.includes('laptop') || titleText.includes('headphone')) {
        resolvedType = 'Electronics';
      } else if (rawType.includes('fashion') || rawCat.includes('fashion') || titleText.includes('tshirt') || titleText.includes('shirt') || titleText.includes('dress')) {
        resolvedType = 'Fashion';
      } else if (rawType.includes('service') || rawCat.includes('service')) {
        resolvedType = 'Services';
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

// 1. Table Ke Bahar Se Status Change Karna
document.addEventListener('change', async function(e) {
  if (e.target && e.target.classList.contains('order-status-select')) {
    const rawId = e.target.getAttribute('data-rawid');
    const newStatus = e.target.value;

    if (!rawId || rawId === 'undefined') {
      alert("Order ID missing!");
      return;
    }

    try {
      const payload = { status: newStatus };
      if (newStatus !== 'Cancelled') payload.cancelReason = '';

      let res = await fetch(`https://mj-digital-backend-3.onrender.com/api/orders/${rawId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        res = await fetch(`https://mj-digital-backend-3.onrender.com/api/orders/${rawId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (res.ok && (data.success || data.data)) {
        if (typeof loadAdminOrders === 'function') loadAdminOrders();
      } else {
        alert('Update failed: ' + (data.message || 'Error updating status'));
      }
    } catch (err) {
      console.error('Table status update error:', err);
    }
  }
});

// 2. View Modal Ke Andar Se Status Change Karna
// Helper: Status ke hisaab se dynamic Tailwind colors return karega
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
    // Pending / Processing
    return {
      bg: 'bg-amber-50 text-amber-800 border-amber-400',
      badge: 'bg-amber-100 text-amber-800 border-amber-300'
    };
  }
}

// 1. Table Ke Bahar Se Status Change Karna (Alert + Color Sync)
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

      let res = await fetch(`https://mj-digital-backend-3.onrender.com/api/orders/${rawId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        res = await fetch(`https://mj-digital-backend-3.onrender.com/api/orders/${rawId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (res.ok && (data.success || data.data)) {
        // Table refresh karein
        if (typeof loadAdminOrders === 'function') {
          await loadAdminOrders();
        }
        // Bahar se bhi alert aayega
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

// 2. View Modal Ke Andar Se Status Change Karna (Dynamic Color Change)
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

    let res = await fetch(`https://mj-digital-backend-3.onrender.com/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      res = await fetch(`https://mj-digital-backend-3.onrender.com/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    const data = await res.json();
    if (res.ok && (data.success || data.data)) {
      activeSelectedOrder.status = newStatus;
      
      // Dynamic Colors Modal par live lagayein
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

  // Modal open hote hi current status ka exact color apply karein
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
    const res = await fetch('https://mj-digital-backend-3.onrender.com/api/media');
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
    const res = await fetch('https://mj-digital-backend-3.onrender.com/api/media', {
      method: 'POST',
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
      const res = await fetch('https://mj-digital-backend-3.onrender.com/api/audit-logs');
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
    const res = await fetch('https://mj-digital-backend-3.onrender.com/api/audit-logs', { method: 'DELETE' });
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
async function savePlatformSettings() {
  const saveBtn = document.querySelector('button[onclick="savePlatformSettings()"]');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-xs"></i> Saving...`;
  }

  const settingsData = {
    storeName: document.getElementById('settingStoreName')?.value.trim() || 'M J DIGITAL',
    email: document.getElementById('settingEmail')?.value.trim() || 'support@mjdigital.in',
    phone: document.getElementById('settingPhone')?.value.trim() || '+91 830 666 9999',
    address: document.getElementById('settingAddress')?.value.trim() || '',
    currency: document.getElementById('settingCurrency')?.value || 'INR',
    gateway: document.getElementById('settingGateway')?.value || 'razorpay',
    environment: document.getElementById('settingEnv')?.value || 'live',
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
    const res = await fetch('https://mj-digital-backend-3.onrender.com/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
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
    const res = await fetch('https://mj-digital-backend-3.onrender.com/api/settings');
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

  const emailInput = document.getElementById('authEmailInput');
  const passInput = document.getElementById('authPasswordInput');
  const errorEl = document.getElementById('authErrorMsg');

  const email = emailInput ? emailInput.value.trim() : '';
  const password = passInput ? passInput.value.trim() : '';

  if (errorEl) errorEl.classList.add('hidden');

  try {
    const response = await fetch('https://mj-digital-backend-3.onrender.com/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      sessionStorage.setItem('mj_jwt_token', data.token);
      localStorage.setItem('mj_admin_session', 'authenticated');
      localStorage.setItem('mj_admin_user', email);

      const authScreen = document.getElementById('adminAuthScreen');
      if (authScreen) authScreen.classList.add('hidden');
      return false;
    } else {
      if (errorEl) {
        errorEl.innerText = data.message || 'Invalid Admin Credentials';
        errorEl.classList.remove('hidden');
      }
      return false;
    }
  } catch (err) {
    if (email.toLowerCase() === 'admin@mjdigital.in' && (password === 'admin' || password === 'admin123')) {
      localStorage.setItem('mj_admin_session', 'authenticated');
      localStorage.setItem('mj_admin_user', email);

      const authScreen = document.getElementById('adminAuthScreen');
      if (authScreen) authScreen.classList.add('hidden');
      return false;
    }

    if (errorEl) {
      errorEl.innerText = 'Backend connection failed! Server check karein ya default pass: admin use karein.';
      errorEl.classList.remove('hidden');
    }
  }
  return false;
}

function handleAdminLogout() {
  if (confirm('Admin session logout karein?')) {
    sessionStorage.removeItem('mj_jwt_token');
    localStorage.removeItem('mj_admin_session');
    localStorage.removeItem('mj_admin_user');
    location.reload();
  }
}

window.handleAdminLogin = handleAdminLogin;
window.handleAdminLogout = handleAdminLogout;

// ==========================================
// 14. SINGLE SYNCHRONOUS BOOTSTRAPPER
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
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
// 15. AUTO-SYNC: 3 Second Background Polling
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
    const res = await fetch('https://mj-digital-backend-3.onrender.com/api/cms/policies');
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