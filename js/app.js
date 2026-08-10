/* ===========================================
   Утилиты
   =========================================== */

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function formatMoney(amount, currency = '€') {
    return parseFloat(amount || 0).toFixed(2) + ' ' + currency;
}

function formatDate(dateStr) {
    const [y, m, d] = dateStr.split('-');
    return `${d}.${m}.${y}`;
}

/* ===========================================
   App — Инициализация, роутинг, модалки
   =========================================== */

const App = {
    pages: {
        dashboard:  { title: 'Дашборд',       icon: '📊', subtitle: 'Обзор финансового состояния',  module: Dashboard },
        journal:    { title: 'Журнал',         icon: '📝', subtitle: 'Ежедневные доходы и расходы',  module: Journal },
        accounts:   { title: 'Счета',          icon: '💰', subtitle: 'Управление счетами',          module: Accounts },
        categories: { title: 'Категории',      icon: '📋', subtitle: 'Категории доходов и расходов', module: Categories },
        shared:     { title: 'Общий счёт',     icon: '🤝', subtitle: 'Семейные расходы и взносы',   module: Shared },
        currency:   { title: 'Валюты',         icon: '💱', subtitle: 'Валютные счета для поездок',   module: Currency },
        toyota:     { title: 'Toyota',         icon: '🚗', subtitle: 'Лизинг и график погашения',   stage: 7 },
        analytics:  { title: 'Аналитика',      icon: '📈', subtitle: 'Графики и тренды',            stage: 8 },
    },

    currentPage: null,

    init() {
        Accounts.init();
        Categories.init();
        Journal.init();
        Dashboard.init();
        Shared.init();
        Currency.init();
        DatePicker.init();
        this.renderSidebar();
        const startPage = location.hash.slice(1) || 'dashboard';
        this.navigate(startPage);
        window.addEventListener('hashchange', () => this.navigate(location.hash.slice(1)));

        // Авто-загрузка данных из облака при старте
        if (typeof Storage !== 'undefined' && Storage.pullFromCloud) {
            Storage.pullFromCloud(true);
        }
    },

    navigate(pageId) {
        if (!this.pages[pageId]) pageId = 'dashboard';
        this.currentPage = pageId;

        document.querySelectorAll('.nav-item').forEach(el => {
            el.classList.toggle('active', el.dataset.page === pageId);
        });

        this.renderPage();
    },

    renderSidebar() {
        const nav = document.getElementById('sidebar-nav');
        nav.innerHTML = Object.entries(this.pages).map(([id, page]) => `
            <a href="#${id}" class="nav-item ${id === this.currentPage ? 'active' : ''}" data-page="${id}">
                <span class="nav-icon">${page.icon}</span>
                <span>${page.title}</span>
            </a>
        `).join('') + `
        <div style="margin-top:auto; padding:12px; border-top:1px solid var(--border-subtle)">
            <button class="btn btn-secondary btn-block btn-sm" id="btn-open-cloud-sync" style="font-size:12px; justify-content:center;">
                ☁️ <span id="sidebar-cloud-status">Облако</span>
            </button>
        </div>`;

        setTimeout(() => {
            document.getElementById('btn-open-cloud-sync')?.addEventListener('click', () => Storage.showSyncModal());
        }, 100);
    },

    renderPage() {
        const page = this.pages[this.currentPage];
        const content = document.getElementById('content');

        let body;
        if (page.module) {
            body = page.module.render();
        } else {
            body = `
                <div class="page-placeholder">
                    <div class="page-placeholder-icon">${page.icon}</div>
                    <h2>${page.title}</h2>
                    <p class="page-placeholder-text">Раздел находится в разработке (Этап ${page.stage})</p>
                </div>`;
        }

        content.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">${page.icon} ${page.title}</h1>
                <p class="page-subtitle">${page.subtitle}</p>
            </div>
            ${body}
        `;

        if (page.module && page.module.afterRender) {
            page.module.afterRender();
        }
        DatePicker.attachAll(content);
    },

    /* --- Модальные окна --- */

    showModal(title, bodyHTML) {
        let overlay = document.getElementById('modal-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'modal-overlay';
            overlay.className = 'modal-overlay';
            document.body.appendChild(overlay);
        }
        overlay.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">${title}</h3>
                    <button class="btn-icon modal-close" onclick="App.closeModal()">✕</button>
                </div>
                <div class="modal-body">${bodyHTML}</div>
            </div>`;
        overlay.classList.add('visible');
        overlay.addEventListener('click', (e) => { if (e.target === overlay) App.closeModal(); });
        DatePicker.attachAll(overlay);
    },

    closeModal() {
        DatePicker.close();
        const overlay = document.getElementById('modal-overlay');
        if (overlay) overlay.classList.remove('visible');
    },

    showConfirm(message, onConfirm) {
        this.showModal('Подтверждение', `
            <p style="margin-bottom:20px;color:var(--text-secondary)">${message}</p>
            <div class="form-actions">
                <button class="btn btn-secondary" onclick="App.closeModal()">Отмена</button>
                <button class="btn btn-danger" id="btn-confirm-yes">Удалить</button>
            </div>
        `);
        document.getElementById('btn-confirm-yes').addEventListener('click', () => {
            App.closeModal();
            onConfirm();
        });
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
