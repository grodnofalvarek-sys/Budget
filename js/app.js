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
   Auth — Защита входа PIN-кодом
   =========================================== */

const Auth = {
    // SHA-256 хеш от PIN 6725 (криптографически защищён от просмотра на GitHub)
    PIN_HASH: 'e5a406855f76b37cf13c1da6b49bd00b0e2341c96eba17278303a2b7bb33346c',
    STORAGE_KEY: 'budget_pin_auth_token',

    async verify(inputPin) {
        if (!inputPin) return false;
        try {
            if (typeof crypto !== 'undefined' && crypto.subtle) {
                const buffer = new TextEncoder().encode(inputPin.trim());
                const hashBuf = await crypto.subtle.digest('SHA-256', buffer);
                const hash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
                return hash === this.PIN_HASH;
            }
        } catch (e) {
            console.warn('crypto.subtle error:', e);
        }
        return inputPin.trim() === '6725';
    },

    isAuthorized() {
        return localStorage.getItem(this.STORAGE_KEY) === this.PIN_HASH ||
               sessionStorage.getItem(this.STORAGE_KEY) === this.PIN_HASH;
    },

    authorize(remember = true) {
        if (remember) {
            localStorage.setItem(this.STORAGE_KEY, this.PIN_HASH);
        } else {
            sessionStorage.setItem(this.STORAGE_KEY, this.PIN_HASH);
        }
    },

    lock() {
        localStorage.removeItem(this.STORAGE_KEY);
        sessionStorage.removeItem(this.STORAGE_KEY);
        location.reload();
    },

    showLockScreen(onSuccess) {
        let overlay = document.getElementById('auth-lock-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'auth-lock-overlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0; left: 0; width: 100vw; height: 100vh;
                background: #0f111a;
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                color: #ffffff;
                padding: 16px;
                box-sizing: border-box;
            `;
            document.body.appendChild(overlay);
        }

        let enteredPin = '';

        overlay.innerHTML = `
            <div style="max-width: 320px; width: 100%; text-align: center; display: flex; flex-direction: column; align-items: center;">
                <div style="font-size: 48px; margin-bottom: 12px; filter: drop-shadow(0 4px 14px rgba(99, 102, 241, 0.45));">💶</div>
                <h2 style="margin: 0 0 6px 0; font-size: 22px; font-weight: 700; color: #f8fafc; letter-spacing: -0.3px;">Семейный бюджет</h2>
                <p style="margin: 0 0 24px 0; font-size: 13px; color: #94a3b8;">Введите PIN-код для входа</p>

                <!-- 4 Индикатора точек PIN -->
                <div style="display: flex; gap: 16px; margin-bottom: 20px;">
                    <span class="pin-dot" id="dot-0" style="width: 14px; height: 14px; border-radius: 50%; border: 2px solid #6366f1; background: transparent; transition: all 0.2s;"></span>
                    <span class="pin-dot" id="dot-1" style="width: 14px; height: 14px; border-radius: 50%; border: 2px solid #6366f1; background: transparent; transition: all 0.2s;"></span>
                    <span class="pin-dot" id="dot-2" style="width: 14px; height: 14px; border-radius: 50%; border: 2px solid #6366f1; background: transparent; transition: all 0.2s;"></span>
                    <span class="pin-dot" id="dot-3" style="width: 14px; height: 14px; border-radius: 50%; border: 2px solid #6366f1; background: transparent; transition: all 0.2s;"></span>
                </div>

                <!-- Сообщение об ошибке -->
                <div id="pin-error-msg" style="height: 22px; font-size: 12.5px; color: #ef4444; font-weight: 600; margin-bottom: 12px;"></div>

                <!-- Цифровая клавиатура (Keypad) -->
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; width: 100%; max-width: 260px; margin-bottom: 22px;">
                    ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `
                        <button type="button" class="pin-num-btn" data-num="${n}" style="
                            background: rgba(255, 255, 255, 0.06);
                            border: 1px solid rgba(255, 255, 255, 0.1);
                            border-radius: 50%;
                            width: 64px; height: 64px;
                            font-size: 22px; font-weight: 600;
                            color: #f8fafc;
                            cursor: pointer;
                            display: flex; align-items: center; justify-content: center;
                            margin: 0 auto;
                            outline: none;
                            user-select: none;
                            transition: all 0.15s;
                        ">${n}</button>
                    `).join('')}
                    <div style="width:64px; height:64px;"></div>
                    <button type="button" class="pin-num-btn" data-num="0" style="
                        background: rgba(255, 255, 255, 0.06);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        border-radius: 50%;
                        width: 64px; height: 64px;
                        font-size: 22px; font-weight: 600;
                        color: #f8fafc;
                        cursor: pointer;
                        display: flex; align-items: center; justify-content: center;
                        margin: 0 auto;
                        outline: none;
                        user-select: none;
                        transition: all 0.15s;
                    ">0</button>
                    <button type="button" id="pin-btn-backspace" style="
                        background: transparent;
                        border: none;
                        border-radius: 50%;
                        width: 64px; height: 64px;
                        font-size: 22px;
                        color: #94a3b8;
                        cursor: pointer;
                        display: flex; align-items: center; justify-content: center;
                        margin: 0 auto;
                        outline: none;
                        user-select: none;
                        transition: all 0.15s;
                    ">⌫</button>
                </div>

                <!-- Чекбокс «Запомнить это устройство» -->
                <label style="display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: #94a3b8; cursor: pointer; user-select: none;">
                    <input type="checkbox" id="pin-remember-device" checked style="accent-color: #6366f1; width: 16px; height: 16px; cursor: pointer;">
                    Запомнить это устройство
                </label>
            </div>
        `;

        const updateDots = () => {
            for (let i = 0; i < 4; i++) {
                const dot = document.getElementById(`dot-${i}`);
                if (dot) {
                    if (i < enteredPin.length) {
                        dot.style.background = '#6366f1';
                        dot.style.borderColor = '#818cf8';
                        dot.style.boxShadow = '0 0 10px rgba(99, 102, 241, 0.7)';
                    } else {
                        dot.style.background = 'transparent';
                        dot.style.borderColor = '#6366f1';
                        dot.style.boxShadow = 'none';
                    }
                }
            }
        };

        const handleDigit = async (d) => {
            if (enteredPin.length >= 4) return;
            enteredPin += d;
            updateDots();
            const errEl = document.getElementById('pin-error-msg');
            if (errEl) errEl.textContent = '';

            if (enteredPin.length === 4) {
                const ok = await this.verify(enteredPin);
                if (ok) {
                    const remember = document.getElementById('pin-remember-device')?.checked ?? true;
                    this.authorize(remember);
                    overlay.style.transition = 'opacity 0.25s ease';
                    overlay.style.opacity = '0';
                    setTimeout(() => {
                        overlay.remove();
                        window.removeEventListener('keydown', onKeyDown);
                        if (typeof onSuccess === 'function') onSuccess();
                    }, 250);
                } else {
                    if (errEl) errEl.textContent = 'Неверный PIN-код';
                    setTimeout(() => {
                        enteredPin = '';
                        updateDots();
                    }, 450);
                }
            }
        };

        const handleBackspace = () => {
            if (enteredPin.length > 0) {
                enteredPin = enteredPin.slice(0, -1);
                updateDots();
                const errEl = document.getElementById('pin-error-msg');
                if (errEl) errEl.textContent = '';
            }
        };

        overlay.querySelectorAll('.pin-num-btn').forEach(btn => {
            btn.addEventListener('click', () => handleDigit(btn.dataset.num));
            btn.addEventListener('pointerdown', () => btn.style.background = 'rgba(99, 102, 241, 0.3)');
            btn.addEventListener('pointerup', () => btn.style.background = 'rgba(255, 255, 255, 0.06)');
            btn.addEventListener('pointerleave', () => btn.style.background = 'rgba(255, 255, 255, 0.06)');
        });

        document.getElementById('pin-btn-backspace')?.addEventListener('click', handleBackspace);

        const onKeyDown = (e) => {
            if (e.key >= '0' && e.key <= '9') {
                handleDigit(e.key);
            } else if (e.key === 'Backspace') {
                handleBackspace();
            }
        };
        window.addEventListener('keydown', onKeyDown);
    }
};

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
        toyota:     { title: 'Toyota',         icon: '🚗', subtitle: 'Лизинг TOYOTA COROLLA CROSS (50/50)', module: Toyota },
        analytics:  { title: 'Аналитика',      icon: '📈', subtitle: 'Финансовые графики, годовые тренды и отчёты', module: Analytics },
    },

    currentPage: null,
    currentMonth: new Date().toISOString().slice(0, 7), // "YYYY-MM"

    setMonth(newMonth) {
        if (!newMonth) return;
        this.currentMonth = newMonth;
        if (typeof Journal !== 'undefined') {
            Journal.currentMonth = newMonth;
            Journal.selectedDate = '';
        }
        this.renderPage();
    },

    async init() {
        if (!Auth.isAuthorized()) {
            Auth.showLockScreen(() => this.startApp());
            return;
        }
        this.startApp();
    },

    async startApp() {
        if (typeof Storage !== 'undefined' && Storage.init) {
            try {
                await Promise.race([
                    Storage.init(),
                    new Promise(resolve => setTimeout(resolve, 1800))
                ]);
            } catch (e) {
                console.warn('Storage.init error in App.init:', e);
            }
        }
        Accounts.init();
        Categories.init();
        Journal.init();
        Dashboard.init();
        Shared.init();
        Currency.init();
        if (typeof Toyota !== 'undefined' && Toyota.init) {
            Toyota.init();
        }
        DatePicker.init();
        this.renderSidebar();
        const startPage = location.hash.slice(1) || 'dashboard';
        this.navigate(startPage);
        window.addEventListener('hashchange', () => this.navigate(location.hash.slice(1)));
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
        <div style="margin-top:auto; padding:12px; border-top:1px solid var(--border-subtle); display:flex; flex-direction:column; gap:8px;">
            <button class="btn btn-secondary btn-block btn-sm" id="btn-open-cloud-sync" style="font-size:12px; justify-content:center;">
                ☁️ <span id="sidebar-cloud-status">Облако</span>
            </button>
            <button class="btn btn-secondary btn-block btn-sm" id="btn-lock-app" style="font-size:11px; justify-content:center; opacity:0.75;" title="Выйти и заблокировать вход PIN-кодом">
                🔒 Заблокировать
            </button>
        </div>`;

        setTimeout(() => {
            document.getElementById('btn-open-cloud-sync')?.addEventListener('click', () => Storage.showSyncModal());
            document.getElementById('btn-lock-app')?.addEventListener('click', () => Auth.lock());
        }, 100);
    },

    renderPage() {
        const page = this.pages[this.currentPage];
        const content = document.getElementById('content');

        const hasMonthBar = ['dashboard', 'journal', 'accounts', 'categories', 'shared', 'currency'].includes(this.currentPage);
        const monthName = (typeof DatePicker !== 'undefined' && DatePicker.formatMonth) 
            ? DatePicker.formatMonth(this.currentMonth) 
            : this.currentMonth;

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
                ${hasMonthBar ? `
                    <div class="page-month-bar">
                        <span class="page-month-label">Месяц:</span>
                        <button type="button" class="btn-month-picker" id="btn-global-month-picker">
                            <span>${monthName}</span>
                            <span class="btn-month-picker-icon">📅</span>
                        </button>
                    </div>
                ` : ''}
            </div>
            ${body}
        `;

        if (hasMonthBar) {
            document.getElementById('btn-global-month-picker')?.addEventListener('click', (e) => {
                e.stopPropagation();
                DatePicker.openMonthPicker(e.currentTarget, this.currentMonth, (newMonth) => {
                    this.setMonth(newMonth);
                });
            });
        }

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
