/* ===========================================
   Shared — Общий счёт (Семейный бюджет)
   =========================================== */

const Shared = {
    STORAGE_KEY: 'shared_transactions',
    CAT_STORAGE_KEY: 'shared_categories',
    INIT_BAL_KEY: 'shared_initial_balance',

    DEFAULT_CATEGORIES: [
        'Отдых',
        'Кафе и рестораны',
        'Гостиницы',
        'Подарки',
        'Машина'
    ],

    init() {
        let cats = Storage.get(this.CAT_STORAGE_KEY);
        if (!cats) {
            cats = this.DEFAULT_CATEGORIES.map(name => ({ id: generateId(), name }));
            Storage.set(this.CAT_STORAGE_KEY, cats);
        }
        if (!Storage.get(this.STORAGE_KEY)) {
            Storage.set(this.STORAGE_KEY, []);
        }
    },

    /* --- Начальный баланс --- */

    getInitialBalance() {
        return parseFloat(Storage.get(this.INIT_BAL_KEY)) || 0;
    },

    setInitialBalance(val) {
        Storage.set(this.INIT_BAL_KEY, parseFloat(val) || 0);
    },

    /* --- Категории Общего счёта --- */

    getCategories() {
        return Storage.get(this.CAT_STORAGE_KEY) || [];
    },

    saveCategories(cats) {
        Storage.set(this.CAT_STORAGE_KEY, cats);
    },

    addCategory(name) {
        const cats = this.getCategories();
        cats.push({ id: generateId(), name: name.trim() });
        this.saveCategories(cats);
    },

    updateCategory(id, name) {
        const cats = this.getCategories();
        const cat = cats.find(c => c.id === id);
        if (cat) {
            cat.name = name.trim();
            this.saveCategories(cats);
        }
    },

    removeCategory(id) {
        const cats = this.getCategories().filter(c => c.id !== id);
        this.saveCategories(cats);
    },

    categoryName(catId) {
        const cat = this.getCategories().find(c => c.id === catId);
        return cat ? cat.name : '(без категории)';
    },

    /* --- Операции Общего счёта --- */

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
            date: data.date,
            type: data.type, // 'my_deposit' | 'wife_deposit' | 'expense'
            accountId: data.accountId || null, // для my_deposit
            categoryId: data.categoryId || null, // для expense
            amount: parseFloat(data.amount) || 0,
            note: data.note || '',
            createdAt: new Date().toISOString()
        };
        txs.unshift(tx);
        this.saveTransactions(txs);
    },

    updateTransaction(id, newData) {
        const txs = this.getTransactions();
        const tx = txs.find(t => t.id === id);
        if (!tx) return;

        tx.date = newData.date;
        tx.type = newData.type;
        tx.accountId = newData.accountId || null;
        tx.categoryId = newData.categoryId || null;
        tx.amount = parseFloat(newData.amount) || 0;
        tx.note = newData.note || '';

        this.saveTransactions(txs);
    },

    removeTransaction(id) {
        const txs = this.getTransactions().filter(t => t.id !== id);
        this.saveTransactions(txs);
    },

    /* --- Расчёты балансов --- */

    getBalance() {
        const initBal = this.getInitialBalance();
        const txs = this.getTransactions();
        const delta = txs.reduce((sum, t) => {
            const amt = parseFloat(t.amount) || 0;
            if (t.type === 'my_deposit' || t.type === 'wife_deposit') {
                return sum + amt;
            } else if (t.type === 'expense') {
                return sum - amt;
            }
            return sum;
        }, 0);
        return initBal + delta;
    },

    getMyMonthlyDeposits(monthStr) {
        const txs = this.getTransactions();
        return txs
            .filter(t => t.type === 'my_deposit' && t.date && t.date.startsWith(monthStr))
            .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
    },

    getWifeMonthlyDeposits(monthStr) {
        const txs = this.getTransactions();
        return txs
            .filter(t => t.type === 'wife_deposit' && t.date && t.date.startsWith(monthStr))
            .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
    },

    getMonthlyExpenses(monthStr) {
        const txs = this.getTransactions();
        return txs
            .filter(t => t.type === 'expense' && t.date && t.date.startsWith(monthStr))
            .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
    },

    /* --- Рендеринг страницы Общего счёта --- */

    render() {
        const today = new Date();
        const currentMonth = (typeof App !== 'undefined' && App.currentMonth) ? App.currentMonth : today.toISOString().slice(0, 7);
        
        const initBal = this.getInitialBalance();
        const currentBalance = this.getBalance();
        const myDeposits = this.getMyMonthlyDeposits(currentMonth);
        const wifeDeposits = this.getWifeMonthlyDeposits(currentMonth);
        const totalExpenses = this.getMonthlyExpenses(currentMonth);

        const rawTxs = this.getTransactions();
        
        // Хронологическая сортировка по возрастанию даты (от 1-го числа к концу месяца)
        const sortedTxs = rawTxs.slice().sort((a, b) => {
            if (a.date !== b.date) {
                return (a.date || '').localeCompare(b.date || '');
            }
            return (a.createdAt || '').localeCompare(b.createdAt || '');
        });

        return `
            <!-- Верхняя панель карточек сводки -->
            <div class="card-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-bottom: 24px;">
                <div class="card card-accent">
                    <div class="card-title">Баланс Общего счёта</div>
                    <div class="card-value ${currentBalance >= 0 ? 'positive' : 'negative'}">${formatMoney(currentBalance)}</div>
                    <div class="card-hint">Начальный остаток: ${formatMoney(initBal)}</div>
                </div>

                <div class="card">
                    <div class="card-title">Мои взносы</div>
                    <div class="card-value positive">+${formatMoney(myDeposits)}</div>
                    <div class="card-hint">В этом месяце (${currentMonth})</div>
                </div>

                <div class="card">
                    <div class="card-title">Взносы жены</div>
                    <div class="card-value positive">+${formatMoney(wifeDeposits)}</div>
                    <div class="card-hint">В этом месяце (${currentMonth})</div>
                </div>

                <div class="card">
                    <div class="card-title">Расходы с общего счёта</div>
                    <div class="card-value negative">-${formatMoney(totalExpenses)}</div>
                    <div class="card-hint">В этом месяце (${currentMonth})</div>
                </div>
            </div>

            <!-- Панель действий -->
            <div class="section-header">
                <h2 class="section-title">Операции по Общему счёту</h2>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button class="btn btn-primary" id="btn-shared-my-deposit">+ Мой взнос</button>
                    <button class="btn btn-secondary" id="btn-shared-wife-deposit">+ Взнос жены</button>
                    <button class="btn btn-secondary" id="btn-shared-expense">- Расход</button>
                    <button class="btn btn-secondary" id="btn-shared-manage-cats">⚙️ Категории</button>
                    <button class="btn btn-secondary" id="btn-shared-init-bal">⚙️ Начальный баланс</button>
                </div>
            </div>

            <!-- Таблица Журнала Общего счёта -->
            <div class="journal-table-container">
                ${sortedTxs.length === 0 ? '<div class="list-empty">Операций по Общему счёту пока нет</div>' : `
                <table class="journal-table">
                    <thead>
                        <tr>
                            <th>Дата</th>
                            <th>Тип операции</th>
                            <th>Детали / Категория</th>
                            <th>Сумма</th>
                            <th>Пояснение</th>
                            <th style="text-align:right">Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedTxs.map(t => {
                            let typeBadge = '';
                            let detail = '';
                            let isPlus = false;

                            if (t.type === 'my_deposit') {
                                typeBadge = '<span class="badge badge-accent">👤 Мой взнос</span>';
                                detail = `Со счёта: <strong>${Accounts.accountName(t.accountId)}</strong>`;
                                isPlus = true;
                            } else if (t.type === 'wife_deposit') {
                                typeBadge = '<span class="badge badge-success">👩 Взнос жены</span>';
                                detail = 'Пополнение от жены';
                                isPlus = true;
                            } else {
                                typeBadge = '<span class="badge badge-danger">🔻 Расход</span>';
                                detail = `Категория: <strong>${this.categoryName(t.categoryId)}</strong>`;
                                isPlus = false;
                            }

                            return `
                            <tr>
                                <td>${formatDate(t.date || '')}</td>
                                <td>${typeBadge}</td>
                                <td>${detail}</td>
                                <td class="${isPlus ? 'positive' : 'negative'}" style="font-weight:700;">
                                    ${isPlus ? '+' : '-'}${formatMoney(t.amount)}
                                </td>
                                <td style="color:var(--text-muted);">${t.note || ''}</td>
                                <td style="text-align:right">
                                    <button class="btn-icon" data-action="edit-shared" data-id="${t.id}" title="Редактировать">✏️</button>
                                    <button class="btn-icon" data-action="delete-shared" data-id="${t.id}" title="Удалить">🗑️</button>
                                </td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>`}
            </div>
        `;
    },

    afterRender() {
        document.getElementById('btn-shared-my-deposit')?.addEventListener('click', () => this.showMyDepositModal());
        document.getElementById('btn-shared-wife-deposit')?.addEventListener('click', () => this.showWifeDepositModal());
        document.getElementById('btn-shared-expense')?.addEventListener('click', () => this.showExpenseModal());
        document.getElementById('btn-shared-manage-cats')?.addEventListener('click', () => this.showCategoryModal());
        document.getElementById('btn-shared-init-bal')?.addEventListener('click', () => this.showInitialBalanceModal());

        const content = document.getElementById('content');
        content.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const { action, id } = btn.dataset;

            switch (action) {
                case 'edit-shared':
                    this.showEditModal(id);
                    break;
                case 'delete-shared':
                    App.showConfirm('Удалить эту операцию по Общему счёту?', () => {
                        this.removeTransaction(id);
                        App.renderPage();
                    });
                    break;
            }
        });
    },

    /* --- Модальные окна --- */

    showMyDepositModal(editId = null) {
        const accounts = Accounts.getAll().filter(a => a.isVisible !== false);
        if (accounts.length === 0) {
            alert('Сначала добавьте хотя бы один счёт во вкладке «Счета»!');
            return;
        }

        const isEdit = !!editId;
        const tx = isEdit ? this.getTransactions().find(t => t.id === editId) : null;
        const today = new Date().toISOString().slice(0, 10);

        const defaultDate = tx ? tx.date : today;
        const defaultAccount = tx ? tx.accountId : accounts[0].id;
        const defaultAmount = tx ? tx.amount : '';
        const defaultNote = tx ? tx.note : '';

        const accountOptions = accounts.map(a => 
            `<option value="${a.id}" ${a.id === defaultAccount ? 'selected' : ''}>${a.name} (${formatMoney(Accounts.getBalance(a.id))})</option>`
        ).join('');

        App.showModal(isEdit ? 'Редактировать мой взнос' : '👤 Мой взнос на Общий счёт', `
            <form id="modal-form">
                <div class="form-group">
                    <label class="form-label">Дата</label>
                    <input type="date" class="form-input" name="date" id="modal-shared-date" value="${defaultDate}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Списать с моего счёта</label>
                    <select class="form-input" name="accountId" required>${accountOptions}</select>
                </div>
                <div class="form-group">
                    <label class="form-label">Сумма (€)</label>
                    <input type="number" class="form-input" name="amount" step="0.01" min="0.01" placeholder="0.00" value="${defaultAmount}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Пояснение</label>
                    <input type="text" class="form-input" name="note" placeholder="например, Пополнение на продукты" value="${defaultNote}">
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Отмена</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Сохранить' : 'Внести взнос'}</button>
                </div>
            </form>
        `);

        const dateEl = document.getElementById('modal-shared-date');
        dateEl?.addEventListener('click', () => { if (typeof dateEl.showPicker === 'function') try { dateEl.showPicker(); } catch(e){} });

        document.getElementById('modal-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const f = e.target;
            const payload = {
                date: f.date.value,
                type: 'my_deposit',
                accountId: f.accountId.value,
                amount: parseFloat(f.amount.value) || 0,
                note: f.note.value.trim()
            };
            if (isEdit) this.updateTransaction(editId, payload);
            else this.addTransaction(payload);
            App.closeModal();
            App.renderPage();
        });
    },

    showWifeDepositModal(editId = null) {
        const isEdit = !!editId;
        const tx = isEdit ? this.getTransactions().find(t => t.id === editId) : null;
        const today = new Date().toISOString().slice(0, 10);

        const defaultDate = tx ? tx.date : today;
        const defaultAmount = tx ? tx.amount : '';
        const defaultNote = tx ? tx.note : '';

        App.showModal(isEdit ? 'Редактировать взнос жены' : '👩 Взнос жены на Общий счёт', `
            <form id="modal-form">
                <div class="form-group">
                    <label class="form-label">Дата</label>
                    <input type="date" class="form-input" name="date" id="modal-shared-date" value="${defaultDate}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Сумма взноса (€)</label>
                    <input type="number" class="form-input" name="amount" step="0.01" min="0.01" placeholder="0.00" value="${defaultAmount}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Пояснение</label>
                    <input type="text" class="form-input" name="note" placeholder="пополнение от жены" value="${defaultNote}">
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Отмена</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Сохранить' : 'Зачислить взнос'}</button>
                </div>
            </form>
        `);

        const dateEl = document.getElementById('modal-shared-date');
        dateEl?.addEventListener('click', () => { if (typeof dateEl.showPicker === 'function') try { dateEl.showPicker(); } catch(e){} });

        document.getElementById('modal-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const f = e.target;
            const payload = {
                date: f.date.value,
                type: 'wife_deposit',
                amount: parseFloat(f.amount.value) || 0,
                note: f.note.value.trim()
            };
            if (isEdit) this.updateTransaction(editId, payload);
            else this.addTransaction(payload);
            App.closeModal();
            App.renderPage();
        });
    },

    showExpenseModal(editId = null) {
        const cats = this.getCategories();
        if (cats.length === 0) {
            alert('Сначала добавьте хотя бы одну категорию для Общего счёта!');
            return;
        }

        const isEdit = !!editId;
        const tx = isEdit ? this.getTransactions().find(t => t.id === editId) : null;
        const today = new Date().toISOString().slice(0, 10);

        const defaultDate = tx ? tx.date : today;
        const defaultCategory = tx ? tx.categoryId : cats[0].id;
        const defaultAmount = tx ? tx.amount : '';
        const defaultNote = tx ? tx.note : '';

        const catOptions = cats.map(c => 
            `<option value="${c.id}" ${c.id === defaultCategory ? 'selected' : ''}>${c.name}</option>`
        ).join('');

        App.showModal(isEdit ? 'Редактировать общий расход' : '🔻 Расход с Общего счёта', `
            <form id="modal-form">
                <div class="form-group">
                    <label class="form-label">Дата</label>
                    <input type="date" class="form-input" name="date" id="modal-shared-date" value="${defaultDate}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Категория общего счёта</label>
                    <select class="form-input" name="categoryId" required>${catOptions}</select>
                </div>
                <div class="form-group">
                    <label class="form-label">Сумма (€)</label>
                    <input type="number" class="form-input" name="amount" step="0.01" min="0.01" placeholder="0.00" value="${defaultAmount}" required>
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

        const dateEl = document.getElementById('modal-shared-date');
        dateEl?.addEventListener('click', () => { if (typeof dateEl.showPicker === 'function') try { dateEl.showPicker(); } catch(e){} });

        document.getElementById('modal-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const f = e.target;
            const payload = {
                date: f.date.value,
                type: 'expense',
                categoryId: f.categoryId.value,
                amount: parseFloat(f.amount.value) || 0,
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
        if (tx.type === 'my_deposit') this.showMyDepositModal(id);
        else if (tx.type === 'wife_deposit') this.showWifeDepositModal(id);
        else if (tx.type === 'expense') this.showExpenseModal(id);
    },

    showCategoryModal() {
        const cats = this.getCategories();
        const listHTML = cats.map(c => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px; border-bottom:1px solid var(--border-subtle)">
                <span>${c.name}</span>
                <div>
                    <button class="btn-icon" data-cat-action="edit" data-id="${c.id}">✏️</button>
                    <button class="btn-icon" data-cat-action="delete" data-id="${c.id}">🗑️</button>
                </div>
            </div>
        `).join('');

        App.showModal('⚙️ Категории Общего счёта', `
            <div style="margin-bottom:16px;">
                <div style="display:flex; gap:8px; margin-bottom:16px;">
                    <input type="text" id="new-shared-cat-input" class="form-input" placeholder="Новая категория...">
                    <button class="btn btn-primary" id="btn-add-shared-cat">+ Добавить</button>
                </div>
                <div style="max-height:240px; overflow-y:auto;">
                    ${listHTML || '<div class="list-empty">Нет категорий</div>'}
                </div>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Закрыть</button>
            </div>
        `);

        document.getElementById('btn-add-shared-cat')?.addEventListener('click', () => {
            const input = document.getElementById('new-shared-cat-input');
            const name = input?.value.trim();
            if (name) {
                this.addCategory(name);
                this.showCategoryModal();
            }
        });

        const overlay = document.getElementById('modal-overlay');
        overlay?.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-cat-action]');
            if (!btn) return;
            const { catAction, id } = btn.dataset;
            if (catAction === 'delete') {
                this.removeCategory(id);
                this.showCategoryModal();
            } else if (catAction === 'edit') {
                const cat = this.getCategories().find(c => c.id === id);
                const newName = prompt('Новое название категории:', cat?.name || '');
                if (newName && newName.trim()) {
                    this.updateCategory(id, newName.trim());
                    this.showCategoryModal();
                }
            }
        });
    },

    showInitialBalanceModal() {
        const currentInit = this.getInitialBalance();
        App.showModal('⚙️ Начальный баланс Общего счёта', `
            <form id="modal-form">
                <div class="form-group">
                    <label class="form-label">Начальный остаток средств (€)</label>
                    <input type="number" class="form-input" name="initialBalance" step="0.01" placeholder="0.00" value="${currentInit || ''}" required>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Отмена</button>
                    <button type="submit" class="btn btn-primary">Сохранить</button>
                </div>
            </form>
        `);

        document.getElementById('modal-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const val = e.target.initialBalance.value;
            this.setInitialBalance(val);
            App.closeModal();
            App.renderPage();
        });
    }
};
