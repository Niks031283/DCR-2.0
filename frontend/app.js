/* =====================================================
   PHARMA CRM - App Core JavaScript
   ===================================================== */

const API_BASE = '/api';

// ── Auth Utils ──
const Auth = {
  get token() { return localStorage.getItem('crm_token'); },
  get user() {
    const u = localStorage.getItem('crm_user');
    return u ? JSON.parse(u) : null;
  },
  set(token, user) {
    localStorage.setItem('crm_token', token);
    localStorage.setItem('crm_user', JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_user');
  },
  isLoggedIn() { return !!this.token && !!this.user; },
  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = '/login.html';
      return false;
    }
    return true;
  },
};

// ── API Utils ──
async function apiCall(endpoint, options = {}) {
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Auth.token || ''}`,
    },
  };
  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: { ...defaultOptions.headers, ...(options.headers || {}) },
  };
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const res = await fetch(url, mergedOptions);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

// ── Toast Notifications ──
const Toast = {
  container: null,
  init() {
    if (!document.querySelector('.toast-container')) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    } else {
      this.container = document.querySelector('.toast-container');
    }
  },
  show(message, type = 'default', duration = 3000) {
    if (!this.container) this.init();
    const icons = { success: '✅', error: '❌', warning: '⚠️', default: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
    this.container.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
  },
  success(msg) { this.show(msg, 'success'); },
  error(msg) { this.show(msg, 'error'); },
  warning(msg) { this.show(msg, 'warning'); },
};

// ── Loading ──
const Loading = {
  el: null,
  show(msg = 'Loading...') {
    if (!this.el) {
      this.el = document.createElement('div');
      this.el.className = 'loading-overlay';
      this.el.innerHTML = `<div class="spinner"></div><p style="font-size:14px;color:#475569">${msg}</p>`;
      document.body.appendChild(this.el);
    }
  },
  hide() {
    if (this.el) { this.el.remove(); this.el = null; }
  },
};

// ── Modal ──
const Modal = {
  open(id) {
    const overlay = document.getElementById(id);
    if (overlay) {
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  },
  close(id) {
    const overlay = document.getElementById(id);
    if (overlay) {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  },
  closeAll() {
    document.querySelectorAll('.modal-overlay.active').forEach(m => {
      m.classList.remove('active');
    });
    document.body.style.overflow = '';
  },
};

// ── Nav Helpers ──
function renderNav(activePage) {
  const user = Auth.user;
  const navPages = [
    { id: 'dashboard', icon: '🏠', label: 'Home', href: '/dashboard.html' },
    { id: 'doctors', icon: '👨‍⚕️', label: 'Doctors', href: '/doctors.html' },
    { id: 'dcr', icon: '📋', label: 'DCR', href: '/visits.html' },
    { id: 'planner', icon: '📅', label: 'Planner', href: '/planner.html' },
    { id: 'reports', icon: '📊', label: 'Reports', href: '/reports.html' },
  ];

  // Top nav
  const topNav = document.getElementById('topNav');
  if (topNav) {
    topNav.innerHTML = `
      <div class="nav-brand">
        <div class="nav-logo">💊</div>
        <div>
          <div class="nav-title">Pharma<span>CRM</span></div>
        </div>
      </div>
      <div class="nav-actions">
        <div class="nav-avatar" onclick="showUserMenu()" title="${user?.name || 'User'}">${user?.avatar || 'U'}</div>
      </div>
    `;
  }

  // Bottom nav
  const bottomNav = document.getElementById('bottomNav');
  if (bottomNav) {
    bottomNav.innerHTML = navPages.map(p => `
      <a class="bottom-nav-item ${activePage === p.id ? 'active' : ''}" href="${p.href}">
        <div class="nav-icon">${p.icon}</div>
        <span class="nav-label">${p.label}</span>
      </a>
    `).join('');
  }
}

function showUserMenu() {
  const user = Auth.user;
  const menuHtml = `
    <div class="modal-overlay active" id="userMenuModal" onclick="if(event.target===this)Modal.close('userMenuModal')">
      <div class="modal" style="border-radius:var(--radius-xl)">
        <div class="modal-handle"></div>
        <div class="modal-header">
          <span class="modal-title">My Profile</span>
          <button class="modal-close" onclick="Modal.close('userMenuModal')">✕</button>
        </div>
        <div class="modal-body">
          <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px">
            <div class="nav-avatar" style="width:56px;height:56px;font-size:18px">${user?.avatar}</div>
            <div>
              <div style="font-size:16px;font-weight:700">${user?.name}</div>
              <div style="font-size:13px;color:var(--text-muted)">${user?.email}</div>
              <div class="badge badge-primary" style="margin-top:6px">${user?.role}</div>
            </div>
          </div>
          <div class="divider"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px">
            <div style="background:var(--surface2);padding:12px;border-radius:var(--radius-sm)">
              <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Territory</div>
              <div style="font-size:13px;font-weight:600">${user?.territory}</div>
            </div>
            <div style="background:var(--surface2);padding:12px;border-radius:var(--radius-sm)">
              <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Division</div>
              <div style="font-size:13px;font-weight:600">${user?.division}</div>
            </div>
          </div>
          <button class="btn btn-danger btn-full" onclick="logout()">🚪 Logout</button>
        </div>
      </div>
    </div>
  `;
  const div = document.createElement('div');
  div.innerHTML = menuHtml;
  document.body.appendChild(div.firstElementChild);
}

function logout() {
  Auth.clear();
  window.location.href = '/login.html';
}

// ── Format Utils ──
const Format = {
  date(str) {
    if (!str) return '—';
    const d = new Date(str);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  },
  time(str) {
    if (!str) return '';
    const [h, m] = str.split(':');
    const hour = parseInt(h);
    const period = hour >= 12 ? 'PM' : 'AM';
    return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${period}`;
  },
  currency(n) {
    return `₹${parseFloat(n || 0).toFixed(2)}`;
  },
  daysSince(dateStr) {
    if (!dateStr) return null;
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return `${diff}d ago`;
  },
  currentMonth() {
    return new Date().toISOString().slice(0, 7);
  },
  monthName(yyyyMM) {
    if (!yyyyMM) return '';
    const [y, m] = yyyyMM.split('-');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[parseInt(m) - 1]} ${y}`;
  },
  initials(name) {
    if (!name) return '?';
    return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  },
};

// ── Initialize on all authenticated pages ──
document.addEventListener('DOMContentLoaded', () => {
  Toast.init();

  // Close modals on overlay click
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      Modal.close(e.target.id);
    }
  });
});
