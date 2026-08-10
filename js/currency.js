/* ===========================================
   Currency — Валютные счета для поездок
   =========================================== */

const Currency = {
    STORAGE_KEY: 'currency_transactions',
    ACCOUNTS_KEY: 'currency_accounts',
    ACTIVE_ACC_KEY: 'active_currency_account',

    DEFAULT_ACCOUNTS: [
        { id: 'curr_byn', name: 'Беларусь (BYN)', code: 'BYN', symbol: 'Br', initialBalance: 0 },
        { id: 'curr_pln', name: 'Польша (PLN)', code: 'PLN', symbol: 'zł', initialBalance: 0 },
        { id: 'curr_try', name: 'Турция (TRY)', code: 'TRY', symbol: '₺', initialBalance: 0 }
    ],

    init() {
        let accs = Storage.get(this.ACCOUNTS_KEY);
        if (!accs || accs.length === 0) {
            Storage.set(this.ACCOUNTS_KEY, this.DEFAULT_ACCOUNTS);
            accs = this.DEFAULT_ACCOUNTS;
        }
        if (!Storage.get(this.ACTIVE_ACC_KEY)) {
            Storage.set(this.ACTIVE_ACC_KEY, accs[0].id);
        }
        if (!Storage.get(this.STORAGE_KEY)) {
            Storage.set(this.STORAGE_KEY, []);
        }
    },

    /* --- Активный и список счетов --- */

    getAccounts() {
        return Storage.get(this.ACCOUNTS_KEY) || [];
    },

    saveAccounts(accs) {
        Storage.set(this.ACCOUNTS_KEY, accs);
    },

    getActiveAccountId() {
        const accs = this.getAccounts();
        let activeId = Storage.get(this.ACTIVE_ACC_KEY);
        if (!accs.find(a => a.id === activeId)) {
            activeId = accs[0] ? accs[0].id : null;
            if (activeId) Storage.set(this.ACTIVE_ACC_KEY, activeId);
        }
        return activeId;
    },

    setActiveAccountId(id) {
        Storage.set(this.ACTIVE_ACC_KEY, id);
    },

    getActiveAccount() {
        const id = this.getActiveAccountId();
        return this.getAccounts().find(a => a.id === id) || null;
    },

    addAccount(data) {
        const accs = this.getAccounts();
        const newAcc = {
            id: generateId(),
            name: data.name.trim(),
            code: data.code.trim().toUpperCase(),
            symbol: data.symbol.trim(),
            initialBalance: parseFloat(data.initialBalance) || 0
        };
        accs.push(newAcc);
        this.saveAccounts(accs);
        this.setActiveAccountId(newAcc.id);
    },

    updateAccount(id, data) {
        const accs = this.getAccounts();
        const acc = accs.find(a => a.id === id);
        if (acc) {
            acc.name = data.name.trim();
            acc.code = data.code.trim().toUpperCase();
            acc.symbol = data.symbol.trim();
            acc.initialBalance = parseFloat(data.initialBalance) || 0;
            this.saveAccounts(accs);
        }
    },

    removeAccount(id) {
        const accs = this.getAccounts().filter(a => a.id !== id);
        this.saveAccounts(accs);
        const txs = this.getTransactions().filter(t => t.currencyAccountId !== id);
        this.saveTransactions(txs);
        if (accs.length > 0) {
            this.setActiveAccountId(accs[0].id);
        }
    },

    /* --- Операции --- */

    getTransactions() {
        return Storage.get(this.STORAGE_KEY) || [];
    },

    saveTransactions(txs) {
        Storage.set(this.STORAGE_KEY, txs);
    },

    addTransaction(data) {
        const txs = this.getTransactions();
        const tx = {
            id: generateId(),
            currencyAccountId: data.currencyAccountId,
            date: data.date,
            type: data.type, // 'deposit' (обмен) | 'expense' (расход)
            sourceAccountId: data.sourceAccountId || null, // 'shared' или personal accId
            spentEur: parseFloat(data.spentEur) || 0,
            rate: parseFloat(data.rate) || 0,
            amountLocal: parseFloat(data.amountLocal) || 0,
            categoryId: data.categoryId || null,
            note: data.note || '',
            createdAt: new Date().toISOString()
        };
        txs.unshift(tx);
        this.saveTransactions(txs);

        // Если списание Евро происходило с Общего счёта, авто-записываем расход в Общий счёт
        if (data.type === 'deposit' && data.sourceAccountId === 'shared' && typeof Shared !== 'undefined') {
            const acc = this.getActiveAccount();
            const currCode = acc ? acc.code : 'валюту';
            Shared.addTransaction({
                date: data.date,
                type: 'expense',
                categoryId: (Shared.getCategories()[0] || {}).id || null,
                amount: parseFloat(data.spentEur) || 0,
                note: `💱 Покупка ${data.amountLocal} ${currCode} (курс ${data.rate})`
            });
        }
    },

    updateTransaction(id, newData) {
        const txs = this.getTransactions();
        const tx = txs.find(t => t.id === id);
        if (!tx) return;

        tx.date = newData.date;
        tx.type = newData.type;
        tx.sourceAccountId = newData.sourceAccountId || null;
        tx.spentEur = parseFloat(newData.spentEur) || 0;
        tx.rate = parseFloat(newData.rate) || 0;
        tx.amountLocal = parseFloat(newData.amountLocal) || 0;
        tx.categoryId = newData.categoryId || null;
        tx.note = newData.note || '';

        this.saveTransactions(txs);
    },

    removeTransaction(id) {
        const txs = this.getTransactions().filter(t => t.id !== id);
        this.saveTransactions(txs);
    },

    /* --- Расчёты по активному валютному счёту --- */

    getBalance(accId) {
        const accs = this.getAccounts();
        const acc = accs.find(a => a.id === accId);
        const initBal = acc ? (parseFloat(acc.initialBalance) || 0) : 0;
        
        const txs = this.getTransactions().filter(t => t.currencyAccountId === accId);
        const delta = txs.reduce((sum, t) => {
            const amt = parseFloat(t.amountLocal) || 0;
            if (t.type === 'deposit' || t.type === 'direct_deposit') return sum + amt;
            if (t.type === 'expense') return sum - amt;
            return sum;
        }, 0);

        return initBal + delta;
    },

    getTotalDepositsLocal(accId) {
        const txs = this.getTransactions().filter(t => t.currencyAccountId === accId && (t.type === 'deposit' || t.type === 'direct_deposit'));
        return txs.reduce((s, t) => s + (parseFloat(t.amountLocal) || 0), 0);
    },

    getTotalSpentEur(accId) {
        const txs = this.getTransactions().filter(t => t.currencyAccountId === accId && t.type === 'deposit');
        return txs.reduce((s, t) => s + (parseFloat(t.spentEur) || 0), 0);
    },

    getAverageRate(accId) {
        const totalLocalExchanged = this.getTransactions().filter(t => t.currencyAccountId === accId && t.type === 'deposit').reduce((s, t) => s + (parseFloat(t.amountLocal) || 0), 0);
        const totalEur = this.getTotalSpentEur(accId);
        if (totalEur > 0) return totalLocalExchanged / totalEur;
        return 0;
    },

    getMonthlyExpensesLocal(accId, monthStr) {
        const txs = this.getTransactions().filter(t => t.currencyAccountId === accId && t.type === 'expense' && t.date && t.date.startsWith(monthStr));
        return txs.reduce((s, t) => s + (parseFloat(t.amountLocal) || 0), 0);
    },

    getCategoryName(catId) {
        if (typeof Shared !== 'undefined' && Shared.getCategories) {
            const cat = Shared.getCategories().find(c => c.id === catId);
            if (cat) return cat.name;
        }
        if (typeof Categories !== 'undefined' && Categories.getAll) {
            const cats = Categories.getAll();
            const all = [...(cats.mandatory || []), ...(cats.current || []), ...(cats.income || [])];
            const item = all.find(c => c.id === catId);
            if (item) return item.name;
        }
        return '(без категории)';
    },

    /* --- Рендеринг страницы Валюты --- */

    render() {
        const accounts = this.getAccounts();
        const activeAcc = this.getActiveAccount();

        if (!activeAcc) {
            return `<div class="card card-accent" style="padding:24px;"><h2>💱 Валютные счета</h2><p style="margin-top:12px;">Нет активных валютных счетов. Создайте первый счёт!</p></div>`;
        }

        const today = new Date();
        const currentMonth = today.toISOString().slice(0, 7);

        const currentBalanceLocal = this.getBalance(activeAcc.id);
        const avgRate = this.getAverageRate(activeAcc.id);
        const currentBalanceEur = avgRate > 0 ? (currentBalanceLocal / avgRate) : 0;

        const totalBoughtLocal = this.getTotalDepositsLocal(activeAcc.id);
        const totalSpentEur = this.getTotalSpentEur(activeAcc.id);
        const monthlyExpensesLocal = this.getMonthlyExpensesLocal(activeAcc.id, currentMonth);
        const monthlyExpensesEur = avgRate > 0 ? (monthlyExpensesLocal / avgRate) : 0;

        const rawTxs = this.getTransactions().filter(t => t.currencyAccountId === activeAcc.id);
        const sortedTxs = rawTxs.slice().sort((a, b) => {
            if (a.date !== b.date) return (a.date || '').localeCompare(b.date || '');
            return (a.createdAt || '').localeCompare(b.createdAt || '');
        });

        return `
            <!-- Вкладки валютных счетов -->
            <div style="display:flex; gap:8px; margin-bottom:20px; overflow-x:auto; padding-bottom:4px;">
                ${accounts.map(a => `
                    <button class="btn ${a.id === activeAcc.id ? 'btn-primary' : 'btn-secondary'}" data-action="switch-curr-acc" data-id="${a.id}">
                        ${a.name}
                    </button>
                `).join('')}
                <button class="btn btn-secondary" id="btn-add-currency-acc">+ Добавить валюту</button>
            </div>

            <!-- Верхняя панель карточек сводки по активной валюте -->
            <div class="card-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-bottom: 24px;">
                <div class="card card-accent">
                    <div class="card-title">Баланс (${activeAcc.code})</div>
                    <div class="card-value ${currentBalanceLocal >= 0 ? 'positive' : 'negative'}">
                        ${currentBalanceLocal.toFixed(2)} ${activeAcc.symbol}
                    </div>
                    <div class="card-hint">
                        ${avgRate > 0 ? `~ ${formatMoney(currentBalanceEur)} (курс: ${avgRate.toFixed(2)})` : `Начальный: ${activeAcc.initialBalance} ${activeAcc.symbol}`}
                    </div>
                </div>

                <div class="card">
                    <div class="card-title">Пополнено всего</div>
                    <div class="card-value positive">+${totalBoughtLocal.toFixed(2)} ${activeAcc.symbol}</div>
                    <div class="card-hint">Куплено на: ${formatMoney(totalSpentEur)}</div>
                </div>

                <div class="card">
                    <div class="card-title">Расходы за месяц</div>
                    <div class="card-value negative">-${monthlyExpensesLocal.toFixed(2)} ${activeAcc.symbol}</div>
                    <div class="card-hint">
                        ${avgRate > 0 ? `~ ${formatMoney(monthlyExpensesEur)}` : `Текущий месяц (${currentMonth})`}
                    </div>
                </div>
            </div>

            <!-- Панель действий -->
            <div class="section-header">
                <h2 class="section-title">Операции: ${activeAcc.name}</h2>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button class="btn btn-primary" id="btn-curr-exchange">💱 Обмен валюты</button>
                    <button class="btn btn-secondary" id="btn-curr-direct-deposit">+ Зачислить валюту</button>
                    <button class="btn btn-secondary" id="btn-curr-expense">- Расход</button>
                    <button class="btn btn-secondary" id="btn-curr-settings">⚙️ Настройка счёта</button>
                </div>
            </div>

            <!-- Таблица Журнала по валютному счёту -->
            <div class="journal-table-container">
                ${sortedTxs.length === 0 ? `<div class="list-empty">Операций по валютному счёту ${activeAcc.name} пока нет</div>` : `
                <table class="journal-table">
                    <thead>
                        <tr>
                            <th>Дата</th>
                            <th>Тип операции</th>
                            <th>Детали / Категория</th>
                            <th>Сумма в валюте</th>
                            <th>Эквивалент / Курс</th>
                            <th>Пояснение</th>
                            <th style="text-align:right">Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedTxs.map(t => {
                            let typeBadge = '';
                            let detail = '';
                            let isPlus = false;
                            const localEurEq = avgRate > 0 ? (t.amountLocal / avgRate) : 0;

                            if (t.type === 'deposit') {
                                typeBadge = '<span class="badge badge-success">💱 Обмен валюты</span>';
                                let sourceName = '';
                                if (t.sourceAccountId === 'shared') sourceName = 'Общий счёт';
                                else if (t.sourceAccountId) sourceName = Accounts.accountName(t.sourceAccountId);
                                else sourceName = 'Евро счёт';
                                detail = `Со счёта: <strong>${sourceName}</strong>`;
                                isPlus = true;
                            } else if (t.type === 'direct_deposit') {
                                typeBadge = '<span class="badge badge-accent">📥 Прямое пополнение</span>';
                                detail = 'Пополнение в местной валюте';
                                isPlus = true;
                            } else {
                                typeBadge = '<span class="badge badge-danger">🔻 Расход</span>';
                                detail = `Категория: <strong>${this.getCategoryName(t.categoryId)}</strong>`;
                                isPlus = false;
                            }

                            return `
                            <tr>
                                <td>${formatDate(t.date || '')}</td>
                                <td>${typeBadge}</td>
                                <td>${detail}</td>
                                <td class="${isPlus ? 'positive' : 'negative'}" style="font-weight:700;">
                                    ${isPlus ? '+' : '-'}${t.amountLocal.toFixed(2)} ${activeAcc.symbol}
                                </td>
                                <td style="font-size:12px; color:var(--text-muted);">
                                    ${t.type === 'deposit' 
                                        ? `-${formatMoney(t.spentEur)} <span style="opacity:0.8;">(1€ = ${t.rate.toFixed(2)} ${activeAcc.code})</span>` 
                                        : `~ ${formatMoney(localEurEq)}`}
                                </td>
                                <td style="color:var(--text-muted);">${t.note || ''}</td>
                                <td style="text-align:right">
                                    <button class="btn-icon" data-action="edit-curr-tx" data-id="${t.id}" title="Редактировать">✏️</button>
                                    <button class="btn-icon" data-action="delete-curr-tx" data-id="${t.id}" title="Удалить">🗑️</button>
                                </td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>`}
            </div>
        `;
    },

    afterRender() {
        document.getElementById('btn-add-currency-acc')?.addEventListener('click', () => this.showAddCurrencyModal());
        document.getElementById('btn-curr-exchange')?.addEventListener('click', () => this.showExchangeModal());
        document.getElementById('btn-curr-direct-deposit')?.addEventListener('click', () => this.showDirectDepositModal());
        document.getElementById('btn-curr-expense')?.addEventListener('click', () => this.showExpenseModal());
        document.getElementById('btn-curr-settings')?.addEventListener('click', () => this.showSettingsModal());

        const content = document.getElementById('content');
        content.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const { action, id } = btn.dataset;

            switch (action) {
                case 'switch-curr-acc':
                    this.setActiveAccountId(id);
                    App.renderPage();
                    break;
                case 'edit-curr-tx':
                    this.showEditModal(id);
                    break;
                case 'delete-curr-tx':
                    App.showConfirm('Удалить эту операцию по валютному счёту?', () => {
                        this.removeTransaction(id);
                        App.renderPage();
                    });
                    break;
            }
        });
    },

    /* --- Модальные окна --- */

    showExchangeModal(editId = null) {
        const activeAcc = this.getActiveAccount();
        if (!activeAcc) return;

        const personalAccounts = Accounts.getAll().filter(a => a.isVisible !== false);
        const isEdit = !!editId;
        const tx = isEdit ? this.getTransactions().find(t => t.id === editId) : null;
        const today = new Date().toISOString().slice(0, 10);

        const defaultDate = tx ? tx.date : today;
        const defaultSource = tx ? tx.sourceAccountId : (personalAccounts[0] ? personalAccounts[0].id : 'shared');
        const defaultSpentEur = tx ? tx.spentEur : '100';
        const defaultRate = tx ? tx.rate : '3.29';
        const defaultAmountLocal = tx ? tx.amountLocal : (100 * 3.29).toFixed(2);
        const defaultNote = tx ? tx.note : '';

        const sourceOptions = `
            <option value="shared" ${defaultSource === 'shared' ? 'selected' : ''}>🤝 Общий счёт (${formatMoney(typeof Shared !== 'undefined' ? Shared.getBalance() : 0)})</option>
            ${personalAccounts.map(a => 
                `<option value="${a.id}" ${a.id === defaultSource ? 'selected' : ''}>💳 ${a.name} (${formatMoney(Accounts.getBalance(a.id))})</option>`
            ).join('')}
        `;

        App.showModal(isEdit ? 'Редактировать обмен валюты' : `💱 Обмен Евро на ${activeAcc.name}`, `
            <form id="modal-form">
                <div class="form-group">
                    <label class="form-label">Дата обмена</label>
                    <input type="date" class="form-input" name="date" id="modal-curr-date" value="${defaultDate}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Списать Евро (€) со счёта</label>
                    <select class="form-input" name="sourceAccountId" required>${sourceOptions}</select>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                    <div class="form-group">
                        <label class="form-label">Потрачено Евро (€)</label>
                        <input type="number" class="form-input" name="spentEur" id="modal-spent-eur" step="0.01" min="0.01" value="${defaultSpentEur}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Курс обмена (${activeAcc.code}/1€)</label>
                        <input type="number" class="form-input" name="rate" id="modal-rate" step="0.0001" min="0.0001" value="${defaultRate}" required>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Получено в местной валюте (${activeAcc.symbol})</label>
                    <input type="number" class="form-input" name="amountLocal" id="modal-amount-local" step="0.01" min="0.01" value="${defaultAmountLocal}" required style="font-weight:700; color:var(--color-success);">
                    <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">Рассчитывается автоматически: Евро × Курс</div>
                </div>
                <div class="form-group">
                    <label class="form-label">Пояснение</label>
                    <input type="text" class="form-input" name="note" placeholder="название обменника / карточка..." value="${defaultNote}">
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Отмена</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Сохранить' : 'Зачислить валюту'}</button>
                </div>
            </form>
        `);

        const dateEl = document.getElementById('modal-curr-date');
        dateEl?.addEventListener('click', () => { if (typeof dateEl.showPicker === 'function') try { dateEl.showPicker(); } catch(e){} });

        const eurInput = document.getElementById('modal-spent-eur');
        const rateInput = document.getElementById('modal-rate');
        const localInput = document.getElementById('modal-amount-local');

        const recalculateLocal = () => {
            const eur = parseFloat(eurInput.value) || 0;
            const rate = parseFloat(rateInput.value) || 0;
            if (eur > 0 && rate > 0) {
                localInput.value = (eur * rate).toFixed(2);
            }
        };

        const recalculateRate = () => {
            const eur = parseFloat(eurInput.value) || 0;
            const local = parseFloat(localInput.value) || 0;
            if (eur > 0 && local > 0) {
                rateInput.value = (local / eur).toFixed(4);
            }
        };

        eurInput?.addEventListener('input', recalculateLocal);
        rateInput?.addEventListener('input', recalculateLocal);
        localInput?.addEventListener('input', recalculateRate);

        document.getElementById('modal-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const f = e.target;
            const payload = {
                currencyAccountId: activeAcc.id,
                date: f.date.value,
                type: 'deposit',
                sourceAccountId: f.sourceAccountId.value,
                spentEur: parseFloat(f.spentEur.value) || 0,
                rate: parseFloat(f.rate.value) || 0,
                amountLocal: parseFloat(f.amountLocal.value) || 0,
                note: f.note.value.trim()
            };
            if (isEdit) this.updateTransaction(editId, payload);
            else this.addTransaction(payload);
            App.closeModal();
            App.renderPage();
        });
    },

    showExpenseModal(editId = null) {
        const activeAcc = this.getActiveAccount();
        if (!activeAcc) return;

        let categories = [];
        if (typeof Shared !== 'undefined' && Shared.getCategories) {
            categories = Shared.getCategories();
        }
        if (categories.length === 0 && typeof Categories !== 'undefined' && Categories.getAll) {
            const cats = Categories.getAll();
            categories = [...(cats.current || []), ...(cats.mandatory || [])];
        }

        const isEdit = !!editId;
        const tx = isEdit ? this.getTransactions().find(t => t.id === editId) : null;
        const today = new Date().toISOString().slice(0, 10);

        const defaultDate = tx ? tx.date : today;
        const defaultCategory = tx ? tx.categoryId : (categories[0] ? categories[0].id : '');
        const defaultAmountLocal = tx ? tx.amountLocal : '';
        const defaultNote = tx ? tx.note : '';

        const catOptions = categories.map(c => 
            `<option value="${c.id}" ${c.id === defaultCategory ? 'selected' : ''}>${c.name}</option>`
        ).join('');

        App.showModal(isEdit ? 'Редактировать расход в валюте' : `🔻 Расход в ${activeAcc.name}`, `
            <form id="modal-form">
                <div class="form-group">
                    <label class="form-label">Дата</label>
                    <input type="date" class="form-input" name="date" id="modal-curr-date" value="${defaultDate}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Категория расхода</label>
                    <select class="form-input" name="categoryId" required>${catOptions}</select>
                </div>
                <div class="form-group">
                    <label class="form-label">Сумма в местной валюте (${activeAcc.symbol})</label>
                    <input type="number" class="form-input" name="amountLocal" step="0.01" min="0.01" placeholder="0.00" value="${defaultAmountLocal}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Пояснение</label>
                    <input type="text" class="form-input" name="note" placeholder="описание покупки..." value="${defaultNote}">
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Отмена</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Сохранить' : 'Списать расход'}</button>
                </div>
            </form>
        `);

        const dateEl = document.getElementById('modal-curr-date');
        dateEl?.addEventListener('click', () => { if (typeof dateEl.showPicker === 'function') try { dateEl.showPicker(); } catch(e){} });

        document.getElementById('modal-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const f = e.target;
            const payload = {
                currencyAccountId: activeAcc.id,
                date: f.date.value,
                type: 'expense',
                categoryId: f.categoryId.value,
                amountLocal: parseFloat(f.amountLocal.value) || 0,
                note: f.note.value.trim()
            };
            if (isEdit) this.updateTransaction(editId, payload);
            else this.addTransaction(payload);
            App.closeModal();
            App.renderPage();
        });
    },

    showDirectDepositModal(editId = null) {
        const activeAcc = this.getActiveAccount();
        if (!activeAcc) return;

        const isEdit = !!editId;
        const tx = isEdit ? this.getTransactions().find(t => t.id === editId) : null;
        const today = new Date().toISOString().slice(0, 10);

        const defaultDate = tx ? tx.date : today;
        const defaultAmountLocal = tx ? tx.amountLocal : '';
        const defaultNote = tx ? tx.note : '';

        App.showModal(isEdit ? 'Редактировать прямое пополнение' : `📥 Прямое пополнение (${activeAcc.name})`, `
            <form id="modal-form">
                <div class="form-group">
                    <label class="form-label">Дата</label>
                    <input type="date" class="form-input" name="date" id="modal-curr-date" value="${defaultDate}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Сумма в местной валюте (${activeAcc.symbol})</label>
                    <input type="number" class="form-input" name="amountLocal" step="0.01" min="0.01" placeholder="0.00" value="${defaultAmountLocal}" required style="font-weight:700; color:var(--color-success);">
                    <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">Без списания Евро с личных и общего счетов</div>
                </div>
                <div class="form-group">
                    <label class="form-label">Пояснение</label>
                    <input type="text" class="form-input" name="note" placeholder="остаток с прошлого года / подарок..." value="${defaultNote}">
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Отмена</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Сохранить' : 'Зачислить валюту'}</button>
                </div>
            </form>
        `);

        const dateEl = document.getElementById('modal-curr-date');
        dateEl?.addEventListener('click', () => { if (typeof dateEl.showPicker === 'function') try { dateEl.showPicker(); } catch(e){} });

        document.getElementById('modal-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const f = e.target;
            const payload = {
                currencyAccountId: activeAcc.id,
                date: f.date.value,
                type: 'direct_deposit',
                sourceAccountId: null,
                spentEur: 0,
                rate: 0,
                amountLocal: parseFloat(f.amountLocal.value) || 0,
                note: f.note.value.trim()
            };
            if (isEdit) this.updateTransaction(editId, payload);
            else this.addTransaction(payload);
            App.closeModal();
            App.renderPage();
        });
    },

    showEditModal(id) {
        const tx = this.getTransactions().find(t => t.id === id);
        if (!tx) return;
        if (tx.type === 'deposit') this.showExchangeModal(id);
        else if (tx.type === 'direct_deposit') this.showDirectDepositModal(id);
        else if (tx.type === 'expense') this.showExpenseModal(id);
    },

    showAddCurrencyModal() {
        App.showModal('➕ Добавить новый валютный счёт', `
            <form id="modal-form">
                <div class="form-group">
                    <label class="form-label">Название страны / валюты</label>
                    <input type="text" class="form-input" name="name" placeholder="например, Польша (PLN)" required>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                    <div class="form-group">
                        <label class="form-label">Код валюты</label>
                        <input type="text" class="form-input" name="code" placeholder="PLN" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Символ валюты</label>
                        <input type="text" class="form-input" name="symbol" placeholder="zł" required>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Начальный баланс в валюте</label>
                    <input type="number" class="form-input" name="initialBalance" step="0.01" placeholder="0.00" value="0">
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Отмена</button>
                    <button type="submit" class="btn btn-primary">Создать счёт</button>
                </div>
            </form>
        `);

        document.getElementById('modal-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const f = e.target;
            this.addAccount({
                name: f.name.value,
                code: f.code.value,
                symbol: f.symbol.value,
                initialBalance: f.initialBalance.value
            });
            App.closeModal();
            App.renderPage();
        });
    },

    showSettingsModal() {
        const activeAcc = this.getActiveAccount();
        if (!activeAcc) return;

        App.showModal(`⚙️ Настройка счёта ${activeAcc.name}`, `
            <form id="modal-form">
                <div class="form-group">
                    <label class="form-label">Название счёта</label>
                    <input type="text" class="form-input" name="name" value="${activeAcc.name}" required>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                    <div class="form-group">
                        <label class="form-label">Код валюты</label>
                        <input type="text" class="form-input" name="code" value="${activeAcc.code}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Символ</label>
                        <input type="text" class="form-input" name="symbol" value="${activeAcc.symbol}" required>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Начальный баланс в валюте</label>
                    <input type="number" class="form-input" name="initialBalance" step="0.01" value="${activeAcc.initialBalance || 0}" required>
                </div>
                <div class="form-actions" style="justify-content:space-between;">
                    <button type="button" class="btn btn-danger" id="btn-delete-curr-acc">Удалить этот счёт</button>
                    <div style="display:flex; gap:8px;">
                        <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Отмена</button>
                        <button type="submit" class="btn btn-primary">Сохранить</button>
                    </div>
                </div>
            </form>
        `);

        document.getElementById('btn-delete-curr-acc')?.addEventListener('click', () => {
            App.showConfirm(`Удалить валютный счёт "${activeAcc.name}" и все его операции?`, () => {
                this.removeAccount(activeAcc.id);
                App.closeModal();
                App.renderPage();
            });
        });

        document.getElementById('modal-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const f = e.target;
            this.updateAccount(activeAcc.id, {
                name: f.name.value,
                code: f.code.value,
                symbol: f.symbol.value,
                initialBalance: f.initialBalance.value
            });
            App.closeModal();
            App.renderPage();
        });
    }
};
