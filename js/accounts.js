/* ===========================================
   Accounts — Управление счетами
   =========================================== */

const Accounts = {
    STORAGE_KEY: 'accounts',
    TRANSFER_KEY: 'transfers',

    DEFAULTS: [
        { name: 'Revolut', balance: 0, isVisible: true, isDefault: true },
        { name: 'Наличные', balance: 0, isVisible: true, isDefault: false },
        { name: 'Банк', balance: 0, isVisible: true, isDefault: false },
        { name: 'Пенсионный', balance: 0, isVisible: false, isDefault: false },
    ],

    init() {
        let list = Storage.get(this.STORAGE_KEY);
        if (!list) {
            list = this.DEFAULTS.map(a => ({
                id: generateId(),
                name: a.name,
                initialBalance: a.balance || 0,
                currency: 'EUR',
                isVisible: a.isVisible,
                isDefault: a.isDefault
            }));
            Storage.set(this.STORAGE_KEY, list);
        } else {
            // Миграция существующих счетов на использование initialBalance
            let needsSave = false;
            list.forEach(a => {
                if (a.initialBalance === undefined) {
                    const journalDelta = this.getJournalDeltaForAccount(a.id);
                    const transferDelta = this.getTransferDeltaForAccount(a.id);
                    const currentStored = a.balance !== undefined ? a.balance : 0;
                    a.initialBalance = currentStored - journalDelta - transferDelta;
                    delete a.balance;
                    needsSave = true;
                }
            });
            if (needsSave) {
                Storage.set(this.STORAGE_KEY, list);
            }
        }
    },

    getAll()    { return Storage.get(this.STORAGE_KEY) || []; },
    save(list)  { Storage.set(this.STORAGE_KEY, list); },
    getById(id) { return this.getAll().find(a => a.id === id); },

    /* --- Расчёт баланса на основе Журнала и Переводов --- */

    getJournalDeltaForAccount(accId) {
        if (typeof Journal === 'undefined') return 0;
        const allTx = Journal.getAll();
        return allTx.reduce((sum, t) => {
            if (t.accountId !== accId) return sum;
            return sum + (t.type === 'income' ? t.amount : -t.amount);
        }, 0);
    },

    getTransferDeltaForAccount(accId) {
        const transfers = this.getTransfers();
        return transfers.reduce((sum, tr) => {
            if (tr.fromId === accId) sum -= tr.amount;
            if (tr.toId === accId) sum += tr.amount;
            return sum;
        }, 0);
    },

    getSharedDeltaForAccount(accId) {
        if (typeof Shared === 'undefined' || !Shared.getTransactions) return 0;
        const sharedTxs = Shared.getTransactions() || [];
        return sharedTxs.reduce((sum, t) => {
            if (t.type === 'my_deposit' && t.accountId === accId) {
                return sum - (t.amount || 0);
            }
            return sum;
        }, 0);
    },

    getCurrencyDeltaForAccount(accId) {
        if (typeof Currency === 'undefined' || !Currency.getTransactions) return 0;
        const currencyTxs = Currency.getTransactions() || [];
        return currencyTxs.reduce((sum, t) => {
            if (t.type === 'deposit' && t.sourceAccountId === accId) {
                return sum - (parseFloat(t.spentEur) || 0);
            }
            return sum;
        }, 0);
    },

    getDepositedPrincipal(accId) {
        const acc = this.getById(accId);
        if (!acc) return 0;
        const initBal = acc.initialBalance !== undefined ? acc.initialBalance : (acc.balance || 0);
        return initBal + this.getJournalDeltaForAccount(accId) + this.getTransferDeltaForAccount(accId) + this.getSharedDeltaForAccount(accId) + this.getCurrencyDeltaForAccount(accId);
    },

    getBalance(accId) {
        const acc = this.getById(accId);
        if (!acc) return 0;
        const deposited = this.getDepositedPrincipal(accId);
        const yieldRate = parseFloat(acc.yieldRate) || 0;
        if (yieldRate > 0) {
            const accruedYield = deposited * (yieldRate / 100);
            return deposited + accruedYield;
        }
        return deposited;
    },

    getTotalBalance() {
        return this.getAll().filter(a => a.isVisible).reduce((s, a) => s + this.getBalance(a.id), 0);
    },

    add(data) {
        const list = this.getAll();
        list.push({
            id: generateId(),
            name: data.name,
            initialBalance: parseFloat(data.initialBalance) || 0,
            yieldRate: parseFloat(data.yieldRate) || 0,
            currency: 'EUR',
            isVisible: true,
            isDefault: list.length === 0
        });
        this.save(list);
    },

    update(id, data) {
        const list = this.getAll();
        const acc = list.find(a => a.id === id);
        if (acc) {
            acc.name = data.name;
            if (data.initialBalance !== undefined) acc.initialBalance = parseFloat(data.initialBalance) || 0;
            if (data.yieldRate !== undefined) acc.yieldRate = parseFloat(data.yieldRate) || 0;
            this.save(list);
        }
    },

    remove(id) {
        const list = this.getAll().filter(a => a.id !== id);
        if (list.length && !list.some(a => a.isDefault)) list[0].isDefault = true;
        this.save(list);
    },

    toggleVisibility(id) {
        const list = this.getAll();
        const acc = list.find(a => a.id === id);
        if (acc) { acc.isVisible = !acc.isVisible; this.save(list); }
    },

    setDefault(id) {
        const list = this.getAll();
        list.forEach(a => a.isDefault = (a.id === id));
        this.save(list);
    },

    /* --- Переводы между счетами --- */

    getTransfers() {
        const list = Storage.get(this.TRANSFER_KEY) || [];
        return list.slice().sort((a, b) => {
            if (a.date !== b.date) {
                return a.date.localeCompare(b.date);
            }
            return (a.id || '').localeCompare(b.id || '');
        });
    },
    
    saveTransfers(t) { Storage.set(this.TRANSFER_KEY, t); },

    addTransfer(data) {
        const transfers = Storage.get(this.TRANSFER_KEY) || [];
        transfers.unshift({
            id: generateId(),
            date: data.date,
            fromId: data.fromId,
            toId: data.toId,
            amount: data.amount,
            note: data.note
        });
        this.saveTransfers(transfers);
    },

    updateTransfer(id, newData) {
        const transfers = Storage.get(this.TRANSFER_KEY) || [];
        const tr = transfers.find(t => t.id === id);
        if (!tr) return;

        tr.date = newData.date;
        tr.fromId = newData.fromId;
        tr.toId = newData.toId;
        tr.amount = parseFloat(newData.amount) || 0;
        tr.note = newData.note || '';

        this.saveTransfers(transfers);
    },

    removeTransfer(id) {
        const transfers = this.getTransfers().filter(t => t.id !== id);
        this.saveTransfers(transfers);
    },

    accountName(id) {
        const acc = this.getById(id);
        return acc ? acc.name : '(удалён)';
    },

    filterMonthOnly: true,

    /* --- Рендеринг --- */

    render() {
        const accounts = this.getAll();
        const total = this.getTotalBalance();
        const allTransfers = this.getTransfers();
        const currentMonth = (typeof App !== 'undefined' && App.currentMonth) ? App.currentMonth : new Date().toISOString().slice(0, 7);
        const monthName = (typeof DatePicker !== 'undefined' && DatePicker.formatMonth) ? DatePicker.formatMonth(currentMonth) : currentMonth;

        const monthTransfers = allTransfers.filter(t => t.date && t.date.startsWith(currentMonth));
        const visibleTransfers = this.filterMonthOnly ? monthTransfers : allTransfers;

        return `
            <div class="card-grid">
                <div class="card card-accent">
                    <div class="card-title">Общий баланс</div>
                    <div class="card-value ${total >= 0 ? 'positive' : 'negative'}">${formatMoney(total)}</div>
                    <div class="card-hint">Сумма видимых счетов</div>
                </div>
            </div>

            <div class="section-header">
                <h2 class="section-title">Личные счета</h2>
                <button class="btn btn-primary" id="btn-add-account">+ Добавить</button>
                <button class="btn btn-secondary" id="btn-transfer">↔ Перевод</button>
            </div>

            <div class="card-grid">
                ${accounts.map(a => {
                    const currentBalance = this.getBalance(a.id);
                    const deposited = this.getDepositedPrincipal(a.id);
                    const yieldRate = parseFloat(a.yieldRate) || 0;
                    const accruedYield = yieldRate > 0 ? (deposited * (yieldRate / 100)) : 0;

                    return `
                    <div class="card ${a.isVisible ? '' : 'card-dimmed'}">
                        <div class="card-row">
                            <span class="card-name">${a.name}</span>
                            <label class="toggle" title="${a.isVisible ? 'Скрыть из баланса' : 'Показать в балансе'}">
                                <input type="checkbox" data-action="toggle-vis" data-id="${a.id}" ${a.isVisible ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        <div class="card-value">${formatMoney(currentBalance)}</div>
                        ${yieldRate > 0 ? `
                        <div style="font-size: 11px; color: var(--color-success); margin-top: -6px; margin-bottom: 10px; font-weight: 500;">
                            Внесено: ${formatMoney(deposited)} • Доход (+${yieldRate}%): +${formatMoney(accruedYield)}
                        </div>` : ''}
                        <div class="card-row">
                            <div style="display:flex; gap:6px; align-items:center;">
                                <span class="badge">${a.currency}</span>
                                ${yieldRate > 0 ? `<span class="badge" style="background:rgba(46,213,115,0.15); color:var(--color-success); border:1px solid rgba(46,213,115,0.3);">📈 +${yieldRate}%</span>` : ''}
                            </div>
                            <div class="card-actions">
                                ${a.isDefault
                                    ? '<span class="badge badge-accent">По умолчанию</span>'
                                    : `<button class="btn btn-set-default" data-action="set-default" data-id="${a.id}">По умолчанию</button>`}
                                <button class="btn-icon" data-action="edit" data-id="${a.id}" title="Редактировать счёт">✏️</button>
                                <button class="btn-icon" data-action="delete" data-id="${a.id}" title="Удалить счёт">🗑️</button>
                            </div>
                        </div>
                    </div>`;
                }).join('')}
            </div>

            <div class="section-header" style="margin-top:32px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <h2 class="section-title">История переводов</h2>
                ${allTransfers.length > 0 ? `
                <div style="display:flex; gap:6px; background:var(--bg-card-hover); padding:3px; border-radius:var(--radius-sm);">
                    <button class="btn btn-sm ${this.filterMonthOnly ? 'btn-primary' : 'btn-secondary'}" id="btn-transfer-filter-month" style="font-size:11px; padding:3px 10px;">
                        За ${monthName} (${monthTransfers.length})
                    </button>
                    <button class="btn btn-sm ${!this.filterMonthOnly ? 'btn-primary' : 'btn-secondary'}" id="btn-transfer-filter-all" style="font-size:11px; padding:3px 10px;">
                        Все (${allTransfers.length})
                    </button>
                </div>` : ''}
            </div>
            ${visibleTransfers.length > 0 ? `
            <div class="transfer-list">
                ${visibleTransfers.map(t => `
                    <div class="transfer-item">
                        <span class="transfer-date">${formatDate(t.date)}</span>
                        <span class="transfer-route">${this.accountName(t.fromId)} → ${this.accountName(t.toId)}</span>
                        <span class="transfer-amount">${formatMoney(t.amount)}</span>
                        <span class="transfer-note">${t.note || ''}</span>
                        <div class="card-actions">
                            <button class="btn-icon" data-action="edit-transfer" data-id="${t.id}" title="Редактировать перевод">✏️</button>
                            <button class="btn-icon" data-action="delete-transfer" data-id="${t.id}" title="Удалить перевод">🗑️</button>
                        </div>
                    </div>
                `).join('')}
            </div>` : `<div class="card" style="text-align:center; color:var(--text-muted); padding:16px; font-size:13px;">В ${monthName} переводов не было</div>`}`;
    },

    afterRender() {
        document.getElementById('btn-add-account')?.addEventListener('click', () => this.showModal());
        document.getElementById('btn-transfer')?.addEventListener('click', () => this.showTransferModal());
        document.getElementById('btn-transfer-filter-month')?.addEventListener('click', () => {
            this.filterMonthOnly = true;
            App.renderPage();
        });
        document.getElementById('btn-transfer-filter-all')?.addEventListener('click', () => {
            this.filterMonthOnly = false;
            App.renderPage();
        });

        const content = document.getElementById('content');
        if (content) {
            /* Одиночный обработчик переключения видимости (без накопления слушателей) */
            content.onchange = (e) => {
                if (e.target && e.target.dataset.action === 'toggle-vis') {
                    this.toggleVisibility(e.target.dataset.id);
                    App.renderPage();
                }
            };

            /* Одиночный обработчик кнопок действий */
            content.onclick = (e) => {
                const btn = e.target.closest('[data-action]');
                if (!btn || btn.tagName === 'INPUT') return;
                const { action, id } = btn.dataset;

                switch (action) {
                    case 'set-default':     this.setDefault(id); App.renderPage(); break;
                    case 'edit':            this.showModal(id); break;
                    case 'delete':
                        const acc = this.getById(id);
                        App.showConfirm(`Удалить счёт «${acc.name}»?`, () => { this.remove(id); App.renderPage(); });
                        break;
                    case 'edit-transfer':   this.showTransferModal(id); break;
                    case 'delete-transfer':
                        App.showConfirm('Удалить запись о переводе?', () => { this.removeTransfer(id); App.renderPage(); });
                        break;
                }
            };
        }
    },

    showModal(editId = null) {
        const acc = editId ? this.getById(editId) : null;
        const isEdit = !!editId;

        App.showModal(isEdit ? 'Редактировать счёт' : 'Новый счёт', `
            <form id="modal-form">
                <div class="form-group">
                    <label class="form-label">Название счёта</label>
                    <input type="text" class="form-input" name="name" value="${acc?.name || ''}" placeholder="например, Карта Visa" required autocomplete="off">
                </div>
                <div class="form-group">
                    <label class="form-label">Начальный баланс (€)</label>
                    <input type="number" class="form-input" name="initialBalance" step="0.01" value="${acc && acc.initialBalance !== undefined ? acc.initialBalance : (acc?.balance !== undefined ? acc.balance : '0.00')}">
                    <div class="form-hint" style="font-size:11px; color:var(--text-muted); margin-top:2px;">Сумма средств на счёте на начало ведения учёта</div>
                </div>
                <div class="form-group">
                    <label class="form-label">Процентная ставка / доходность (%):</label>
                    <input type="number" class="form-input" name="yieldRate" step="0.01" placeholder="0.00 (или например 8.17)" value="${acc && acc.yieldRate !== undefined ? acc.yieldRate : ''}">
                    <div class="form-hint" style="font-size:11px; color:var(--text-muted); margin-top:2px;">Для накопительных счетов (начисляется на сумму всех внесённых средств)</div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Отмена</button>
                    <button type="submit" class="btn btn-primary">Сохранить</button>
                </div>
            </form>
        `);

        document.getElementById('modal-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const name = e.target.name.value.trim();
            if (!name) return;
            const initialBalance = parseFloat(e.target.initialBalance?.value) || 0;
            const yieldRate = parseFloat(e.target.yieldRate?.value) || 0;

            if (isEdit) {
                this.update(editId, { name, initialBalance, yieldRate });
            } else {
                this.add({ name, initialBalance, yieldRate });
            }
            App.closeModal();
            App.renderPage();
        });
    },

    showTransferModal(editId = null) {
        const accounts = this.getAll();
        const isEdit = !!editId;
        const tr = isEdit ? this.getTransfers().find(t => t.id === editId) : null;

        const defaultDate = tr ? tr.date : new Date().toISOString().split('T')[0];
        const defaultFrom = tr ? tr.fromId : (accounts[0]?.id || '');
        const defaultTo = tr ? tr.toId : (accounts[1]?.id || accounts[0]?.id || '');
        const defaultAmount = tr ? tr.amount : '';
        const defaultNote = tr ? tr.note : '';

        const renderAccountOptions = (selectedId) => {
            return accounts.map(a => `<option value="${a.id}" ${a.id === selectedId ? 'selected' : ''}>${a.name} — ${formatMoney(this.getBalance(a.id))}</option>`).join('');
        };

        App.showModal(isEdit ? 'Редактировать перевод' : 'Перевод между счетами', `
            <form id="modal-form">
                <div class="form-group">
                    <label class="form-label">Дата</label>
                    <input type="date" class="form-input" name="date" id="modal-transfer-date" value="${defaultDate}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Со счёта</label>
                    <select class="form-input" name="fromId" required>${renderAccountOptions(defaultFrom)}</select>
                </div>
                <div class="form-group">
                    <label class="form-label">На счёт</label>
                    <select class="form-input" name="toId" required>${renderAccountOptions(defaultTo)}</select>
                </div>
                <div class="form-group">
                    <label class="form-label">Сумма (€)</label>
                    <input type="number" class="form-input" name="amount" step="0.01" min="0.01" value="${defaultAmount}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Пояснение</label>
                    <input type="text" class="form-input" name="note" placeholder="необязательно" value="${defaultNote}">
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Отмена</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Сохранить изменения' : 'Перевести'}</button>
                </div>
            </form>
        `);

        const dateInputModal = document.getElementById('modal-transfer-date');
        dateInputModal?.addEventListener('click', () => {
            if (typeof dateInputModal.showPicker === 'function') {
                try { dateInputModal.showPicker(); } catch (err) {}
            }
        });

        document.getElementById('modal-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const f = e.target;
            if (f.fromId.value === f.toId.value) { alert('Выберите разные счета'); return; }

            const payload = {
                date: f.date.value,
                fromId: f.fromId.value,
                toId: f.toId.value,
                amount: parseFloat(f.amount.value) || 0,
                note: f.note.value.trim()
            };

            if (isEdit) {
                this.updateTransfer(editId, payload);
            } else {
                this.addTransfer(payload);
            }
            App.closeModal();
            App.renderPage();
        });
    }
};
