/* ===========================================
   Journal — Ежедневный журнал и Дневной бюджет
   =========================================== */

const Journal = {
    STORAGE_KEY: 'journal_transactions',
    BUDGET_KEY: 'journal_budget_settings',

    currentMonth: new Date().toISOString().slice(0, 7), // "YYYY-MM"
    selectedDate: '', // "" означает "весь месяц", или "YYYY-MM-DD" для конкретного дня
    filterType: 'all', // 'all', 'income', 'mandatory', 'current'
    filterAccount: 'all',

    init() {
        if (!Storage.get(this.STORAGE_KEY)) {
            Storage.set(this.STORAGE_KEY, []);
        }
        if (!Storage.get(this.BUDGET_KEY)) {
            Storage.set(this.BUDGET_KEY, {});
        }
    },

    getAll() {
        return Storage.get(this.STORAGE_KEY) || [];
    },

    save(list) {
        Storage.set(this.STORAGE_KEY, list);
    },

    getBudgetSettings() {
        return Storage.get(this.BUDGET_KEY) || {};
    },

    saveBudgetSettings(settings) {
        Storage.set(this.BUDGET_KEY, settings);
    },

    /* --- Расчёт плана на день --- */

    getDaysInMonth(yearMonthStr) {
        if (!yearMonthStr) return 30;
        const [year, month] = yearMonthStr.split('-').map(Number);
        return new Date(year, month, 0).getDate();
    },

    getPrevMonthStr(yearMonthStr) {
        if (!yearMonthStr) return '';
        const [year, month] = yearMonthStr.split('-').map(Number);
        const d = new Date(year, month - 2, 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        return `${y}-${m}`;
    },

    getMonthBudget(yearMonthStr) {
        const settings = this.getBudgetSettings();
        if (settings[yearMonthStr]) {
            return settings[yearMonthStr];
        }

        // Авто-расчёт на основе предыдущего месяца
        const prevMonth = this.getPrevMonthStr(yearMonthStr);
        const allTx = this.getAll();
        const prevTx = allTx.filter(t => t.date && t.date.startsWith(prevMonth));

        let plannedIncome = prevTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        let plannedMandatory = prevTx.filter(t => t.type === 'expense' && t.expenseType === 'mandatory').reduce((s, t) => s + t.amount, 0);

        // Если данных за прошлый месяц нет — берём фактические текущего месяца
        if (plannedIncome === 0 && plannedMandatory === 0) {
            const currentTx = allTx.filter(t => t.date && t.date.startsWith(yearMonthStr));
            plannedIncome = currentTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
            plannedMandatory = currentTx.filter(t => t.type === 'expense' && t.expenseType === 'mandatory').reduce((s, t) => s + t.amount, 0);
        }

        return { plannedIncome, plannedMandatory, auto: true };
    },

    setMonthBudget(yearMonthStr, plannedIncome, plannedMandatory) {
        const settings = this.getBudgetSettings();
        settings[yearMonthStr] = {
            plannedIncome: parseFloat(plannedIncome) || 0,
            plannedMandatory: parseFloat(plannedMandatory) || 0,
            auto: false
        };
        this.saveBudgetSettings(settings);
    },

    /* --- Операции --- */

    add(data) {
        const list = this.getAll();
        const tx = {
            id: generateId(),
            date: data.date,
            type: data.type, // 'income' | 'expense'
            expenseType: data.type === 'expense' ? (data.expenseType || 'current') : null, // 'mandatory' | 'current'
            categoryId: data.categoryId,
            accountId: data.accountId,
            amount: parseFloat(data.amount) || 0,
            note: data.note || '',
            createdAt: new Date().toISOString()
        };

        list.unshift(tx);
        this.save(list);

        // Переключаем месяц просмотра на месяц сохраненной операции
        if (data.date) {
            this.currentMonth = data.date.slice(0, 7);
            if (this.selectedDate) {
                this.selectedDate = data.date;
            }
        }
        this.filterType = 'all';
        this.filterAccount = 'all';
    },

    update(id, newData) {
        const list = this.getAll();
        const tx = list.find(t => t.id === id);
        if (!tx) return;

        // Обновление значений
        tx.date = newData.date;
        tx.type = newData.type;
        tx.expenseType = newData.type === 'expense' ? (newData.expenseType || 'current') : null;
        tx.categoryId = newData.categoryId;
        tx.accountId = newData.accountId;
        tx.amount = parseFloat(newData.amount) || 0;
        tx.note = newData.note || '';

        this.save(list);

        // Переключаем месяц просмотра на месяц сохраненной операции
        if (newData.date) {
            this.currentMonth = newData.date.slice(0, 7);
            if (this.selectedDate) {
                this.selectedDate = newData.date;
            }
        }
        this.filterType = 'all';
        this.filterAccount = 'all';
    },

    remove(id) {
        const list = this.getAll();
        const updated = list.filter(t => t.id !== id);
        this.save(updated);
    },

    /* --- Получение имени категории --- */
    getCategoryName(categoryId, type, expenseType) {
        const cats = Categories.getAll();
        let section = 'current';
        if (type === 'income') section = 'income';
        else if (expenseType === 'mandatory') section = 'mandatory';

        const found = (cats[section] || []).find(c => c.id === categoryId);
        if (found) return found.name;

        // Поиск во всех разделах на случай переименования/удаления
        for (const s of ['income', 'mandatory', 'current']) {
            const c = (cats[s] || []).find(x => x.id === categoryId);
            if (c) return c.name;
        }
        return '(без категории)';
    },

    /* --- Рендеринг страницы Журнала --- */

    render() {
        const monthStr = (typeof App !== 'undefined' && App.currentMonth) ? App.currentMonth : this.currentMonth;
        const daysInMonth = this.getDaysInMonth(monthStr);
        const { plannedIncome, plannedMandatory } = this.getMonthBudget(monthStr);

        // План на день (для текущих расходов)
        const availableForCurrent = Math.max(0, plannedIncome - plannedMandatory);
        const dailyPlan = availableForCurrent / daysInMonth;

        // Транзакции выбранного месяца
        const allTx = this.getAll();
        const monthTx = allTx.filter(t => t.date && t.date.startsWith(monthStr));

        // Итоги за месяц
        const actualIncome = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const actualMandatory = monthTx.filter(t => t.type === 'expense' && t.expenseType === 'mandatory').reduce((s, t) => s + t.amount, 0);
        const actualCurrent = monthTx.filter(t => t.type === 'expense' && t.expenseType === 'current').reduce((s, t) => s + t.amount, 0);

        // Переводы на сторонние счета (Общий счёт + Валюты только с личных счетов)
        let actualSharedTransfers = 0;
        if (typeof Shared !== 'undefined' && Shared.getTransactions) {
            const sharedTxs = Shared.getTransactions() || [];
            actualSharedTransfers = sharedTxs
                .filter(t => t && t.type === 'my_deposit' && t.date && t.date.startsWith(monthStr))
                .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
        }

        let actualCurrencyTransfers = 0;
        if (typeof Currency !== 'undefined' && Currency.getTransactions) {
            const currTxs = Currency.getTransactions() || [];
            actualCurrencyTransfers = currTxs
                .filter(t => t && t.type === 'deposit' && t.date && t.date.startsWith(monthStr))
                .filter(t => t.sourceAccountId && t.sourceAccountId !== 'shared')
                .reduce((s, t) => s + (parseFloat(t.spentEur) || 0), 0);
        }

        const actualTransfers = actualSharedTransfers + actualCurrencyTransfers;
        const totalMonthExpenses = actualMandatory + actualCurrent + actualTransfers;

        const mandPercent = totalMonthExpenses > 0 ? Math.round((actualMandatory / totalMonthExpenses) * 100) : 0;
        const currPercent = totalMonthExpenses > 0 ? Math.round((actualCurrent / totalMonthExpenses) * 100) : 0;
        const transfPercent = totalMonthExpenses > 0 ? Math.round((actualTransfers / totalMonthExpenses) * 100) : 0;

        // Дата для карточки "Факт за день" (выбранный день или сегодня)
        const todayStr = new Date().toISOString().slice(0, 10);
        const displayDay = this.selectedDate || (todayStr.startsWith(monthStr) ? todayStr : `${monthStr}-01`);

        // Расчёт количества прошедших дней с начала месяца для среднего расхода
        const todayObj = new Date();
        const todayMonthStr = todayObj.toISOString().slice(0, 7);
        const todayDateStr = todayObj.toISOString().slice(0, 10);

        let daysPassed = 1;
        if (monthStr < todayMonthStr) {
            // Прошлый (завершённый) месяц -> делим на все дни месяца
            daysPassed = daysInMonth;
        } else if (monthStr === todayMonthStr) {
            // Текущий месяц -> количество прошедших дней с начала месяца (например, 9)
            const limitDate = (this.selectedDate && this.selectedDate <= todayDateStr && this.selectedDate.startsWith(monthStr))
                ? this.selectedDate
                : todayDateStr;
            daysPassed = Math.max(1, Math.min(parseInt(limitDate.slice(8, 10), 10), daysInMonth));
        } else {
            daysPassed = 1;
        }

        // Сумма текущих расходов и переводов на сторонние счета с начала месяца до выбранной/текущей даты
        const currentExpensesSoFar = monthTx
            .filter(t => t.type === 'expense' && t.expenseType === 'current' && (!this.selectedDate || t.date <= this.selectedDate))
            .reduce((s, t) => s + t.amount, 0);

        let sharedSoFar = 0;
        if (typeof Shared !== 'undefined' && Shared.getTransactions) {
            const sharedTxs = Shared.getTransactions() || [];
            sharedSoFar = sharedTxs
                .filter(t => t && t.type === 'my_deposit' && t.date && t.date.startsWith(monthStr) && (!this.selectedDate || t.date <= this.selectedDate))
                .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
        }

        let currencySoFar = 0;
        if (typeof Currency !== 'undefined' && Currency.getTransactions) {
            const currTxs = Currency.getTransactions() || [];
            currencySoFar = currTxs
                .filter(t => t && t.type === 'deposit' && t.date && t.date.startsWith(monthStr) && (!this.selectedDate || t.date <= this.selectedDate))
                .filter(t => t.sourceAccountId && t.sourceAccountId !== 'shared')
                .reduce((s, t) => s + (parseFloat(t.spentEur) || 0), 0);
        }

        const transfersSoFar = sharedSoFar + currencySoFar;
        const variableExpensesSoFar = currentExpensesSoFar + transfersSoFar;

        const averageDailyExpense = variableExpensesSoFar / daysPassed;
        const isOverBudget = dailyPlan > 0 && averageDailyExpense > dailyPlan;
        const diffDaily = Math.abs(averageDailyExpense - dailyPlan);

        // Фильтрация списка транзакций для таблицы
        let filteredTx = monthTx;
        if (this.selectedDate) {
            filteredTx = filteredTx.filter(t => t.date === this.selectedDate);
        }
        if (this.filterType !== 'all') {
            if (this.filterType === 'income') filteredTx = filteredTx.filter(t => t.type === 'income');
            else if (this.filterType === 'mandatory') filteredTx = filteredTx.filter(t => t.type === 'expense' && t.expenseType === 'mandatory');
            else if (this.filterType === 'current') filteredTx = filteredTx.filter(t => t.type === 'expense' && t.expenseType === 'current');
        }
        if (this.filterAccount !== 'all') {
            filteredTx = filteredTx.filter(t => t.accountId === this.filterAccount);
        }

        // Автоматическая сортировка транзакций по дате (от меньшей даты к большей: от 1-го числа к концу месяца)
        filteredTx.sort((a, b) => {
            if (a.date !== b.date) {
                return a.date.localeCompare(b.date);
            }
            return (a.createdAt || '').localeCompare(b.createdAt || '');
        });

        const accounts = Accounts.getAll();

        return `
            <!-- Верхняя панель настройки журнала -->
            <div class="journal-header-bar" style="display:flex; justify-content:flex-start; margin-bottom:20px;">
                <div class="journal-actions" style="display:flex; gap:10px;">
                    <button class="btn btn-primary" id="btn-add-tx">+ Записать операцию</button>
                    <button class="btn btn-secondary" id="btn-budget-settings">⚙️ План месяца</button>
                </div>
            </div>

            <!-- Дневной бюджет & Месячная сводка -->
            <div class="journal-budget-dashboard">
                <div class="card card-accent">
                    <div class="card-title">План на день</div>
                    <div class="card-value">${formatMoney(dailyPlan)}</div>
                    <div class="card-hint">(${formatMoney(plannedIncome)} - ${formatMoney(plannedMandatory)}) / ${daysInMonth} дн.</div>
                </div>

                <div class="card ${isOverBudget ? 'card-danger' : 'card-success'}">
                    <div class="card-title">СРЕДНИЙ РАСХОД В ДЕНЬ</div>
                    <div style="font-size: 10px; color: var(--text-muted); margin-top: -4px; margin-bottom: 4px;">(Текущие + Переводы)</div>
                    <div class="card-value ${isOverBudget ? 'negative' : 'positive'}">${formatMoney(averageDailyExpense)}</div>
                    <div class="card-hint">
                        ${isOverBudget 
                            ? `<span class="badge badge-danger">Перерасход на ${formatMoney(diffDaily)}/день</span>` 
                            : `<span class="badge badge-success">В норме (остаток ${formatMoney(dailyPlan - averageDailyExpense)})</span>`}
                        <div style="margin-top: 4px; font-size: 11px; color: var(--text-muted);">
                            (${formatMoney(variableExpensesSoFar)} / ${daysPassed} дн.)
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-title">Итоги месяца (${monthStr})</div>
                    <div class="card-stats">
                        <div class="stat-item"><span class="stat-label">Доходы:</span> <span class="stat-val positive">+${formatMoney(actualIncome)}</span></div>
                        <div class="stat-item"><span class="stat-label">Обязательные:</span> <span class="stat-val">${formatMoney(actualMandatory)} <span style="font-size:11px; color:var(--text-muted); font-weight:normal;">(${mandPercent}%)</span></span></div>
                        <div class="stat-item"><span class="stat-label">Текущие:</span> <span class="stat-val">${formatMoney(actualCurrent)} <span style="font-size:11px; color:var(--text-muted); font-weight:normal;">(${currPercent}%)</span></span></div>
                        <div class="stat-item"><span class="stat-label">Переводы:</span> <span class="stat-val">${formatMoney(actualTransfers)} <span style="font-size:11px; color:var(--text-muted); font-weight:normal;">(${transfPercent}%)</span></span></div>
                    </div>
                </div>
            </div>

            <!-- Фильтры Журнала -->
            <div class="journal-filter-bar">
                <div class="filter-group">
                    <label class="form-label" style="margin:0">Дата:</label>
                    <input type="date" id="journal-date-filter" class="form-input" value="${this.selectedDate}">
                    <button class="btn ${this.selectedDate === '' ? 'btn-primary' : 'btn-secondary'} btn-sm" id="btn-all-dates">Весь месяц</button>
                </div>
                <div class="filter-group">
                    <label class="form-label" style="margin:0">Тип:</label>
                    <select id="journal-type-filter" class="form-input">
                        <option value="all" ${this.filterType === 'all' ? 'selected' : ''}>Все записи</option>
                        <option value="income" ${this.filterType === 'income' ? 'selected' : ''}>💰 Доходы</option>
                        <option value="mandatory" ${this.filterType === 'mandatory' ? 'selected' : ''}>🔒 Обязательные</option>
                        <option value="current" ${this.filterType === 'current' ? 'selected' : ''}>💳 Текущие</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label class="form-label" style="margin:0">Счёт:</label>
                    <select id="journal-account-filter" class="form-input">
                        <option value="all" ${this.filterAccount === 'all' ? 'selected' : ''}>Все счета</option>
                        ${accounts.map(a => `<option value="${a.id}" ${this.filterAccount === a.id ? 'selected' : ''}>${a.name}</option>`).join('')}
                    </select>
                </div>
            </div>

            <!-- Список транзакций -->
            <div class="journal-table-container">
                ${filteredTx.length === 0 ? '<div class="list-empty">Записей не найдено</div>' : `
                <table class="journal-table">
                    <thead>
                        <tr>
                            <th>Дата</th>
                            <th>Тип</th>
                            <th>Категория</th>
                            <th>Счёт</th>
                            <th>Сумма</th>
                            <th>Пояснение</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredTx.map(t => {
                            const isIncome = t.type === 'income';
                            const isMandatory = t.type === 'expense' && t.expenseType === 'mandatory';
                            const typeBadge = isIncome 
                                ? '<span class="badge badge-success">Доход</span>'
                                : (isMandatory ? '<span class="badge badge-warning">Обязательный</span>' : '<span class="badge">Текущий</span>');
                            
                            const categoryName = this.getCategoryName(t.categoryId, t.type, t.expenseType);
                            const accountName = Accounts.accountName(t.accountId);

                            return `
                                <tr>
                                    <td class="tx-date">${formatDate(t.date)}</td>
                                    <td class="tx-type">${typeBadge}</td>
                                    <td class="tx-category">${categoryName}</td>
                                    <td class="tx-account">${accountName}</td>
                                    <td class="tx-amount ${isIncome ? 'positive' : 'negative'}">
                                        ${isIncome ? '+' : '-'}${formatMoney(t.amount)}
                                    </td>
                                    <td class="tx-note">${t.note || '-'}</td>
                                    <td class="tx-actions">
                                        <button class="btn-icon" data-action="edit-tx" data-id="${t.id}" title="Редактировать">✏️</button>
                                        <button class="btn-icon" data-action="delete-tx" data-id="${t.id}" title="Удалить">🗑️</button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>`}
            </div>
        `;
    },

    afterRender() {
        const monthInput = document.getElementById('journal-month-input');
        const dateInput = document.getElementById('journal-date-filter');
        const typeSelect = document.getElementById('journal-type-filter');
        const accountSelect = document.getElementById('journal-account-filter');

        // Открытие календаря при клике в любое место поля даты/месяца
        const enableCalendarClick = (inputEl) => {
            if (!inputEl) return;
            inputEl.addEventListener('click', () => {
                if (typeof inputEl.showPicker === 'function') {
                    try { inputEl.showPicker(); } catch (err) {}
                }
            });
        };
        enableCalendarClick(monthInput);
        enableCalendarClick(dateInput);

        monthInput?.addEventListener('change', (e) => {
            if (e.target.value) {
                this.currentMonth = e.target.value;
                if (this.selectedDate && !this.selectedDate.startsWith(this.currentMonth)) {
                    this.selectedDate = '';
                }
                App.renderPage();
            }
        });

        dateInput?.addEventListener('change', (e) => {
            this.selectedDate = e.target.value;
            if (this.selectedDate) {
                this.currentMonth = this.selectedDate.slice(0, 7);
            }
            App.renderPage();
        });

        document.getElementById('btn-all-dates')?.addEventListener('click', () => {
            this.selectedDate = '';
            App.renderPage();
        });

        typeSelect?.addEventListener('change', (e) => {
            this.filterType = e.target.value;
            App.renderPage();
        });

        accountSelect?.addEventListener('change', (e) => {
            this.filterAccount = e.target.value;
            App.renderPage();
        });

        document.getElementById('btn-add-tx')?.addEventListener('click', () => this.showAddModal());
        document.getElementById('btn-budget-settings')?.addEventListener('click', () => this.showBudgetSettingsModal());

        document.getElementById('content')?.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const { action, id } = btn.dataset;

            if (action === 'edit-tx') {
                this.showAddModal(id);
            } else if (action === 'delete-tx') {
                App.showConfirm('Удалить эту запись?', () => {
                    this.remove(id);
                    App.renderPage();
                });
            }
        });
    },

    /* --- Модальное окно создания / редактирования операции --- */

    showAddModal(editId = null) {
        const allAccounts = Accounts.getAll();
        if (allAccounts.length === 0) {
            alert('Сначала добавьте хотя бы один счёт во вкладке «Счета»!');
            return;
        }

        const isEdit = !!editId;
        const tx = isEdit ? this.getAll().find(t => t.id === editId) : null;

        // Показываем в Журнале только активные для трат счета (isVisible !== false)
        let accounts = allAccounts.filter(a => a.isVisible !== false);
        if (accounts.length === 0) accounts = allAccounts;

        // Если при редактировании выбран ранее скрытый счёт — временно добавляем его для корректного отображения
        if (isEdit && tx && !accounts.some(a => a.id === tx.accountId)) {
            const txAcc = Accounts.getById(tx.accountId);
            if (txAcc) accounts.push(txAcc);
        }

        const defaultType = tx ? tx.type : 'expense';
        const defaultExpenseType = tx ? (tx.expenseType || 'current') : 'current';
        const defaultDate = tx ? tx.date : (this.selectedDate || new Date().toISOString().slice(0, 10));
        const defaultAmount = tx ? tx.amount : '';
        const defaultAccount = tx ? tx.accountId : (accounts.find(a => a.isDefault)?.id || accounts[0].id);
        const defaultNote = tx ? tx.note : '';
        const defaultCategoryId = tx ? tx.categoryId : '';

        const renderCategoryOptions = (type, expenseType, selectedId = null) => {
            const cats = Categories.getAll();
            let items = [];
            if (type === 'income') items = cats.income || [];
            else if (expenseType === 'mandatory') items = cats.mandatory || [];
            else items = cats.current || [];

            if (items.length === 0) {
                return '<option value="">(нет категорий)</option>';
            }
            return items.map(c => `<option value="${c.id}" ${c.id === selectedId ? 'selected' : ''}>${c.name}</option>`).join('');
        };

        App.showModal(isEdit ? 'Редактировать запись' : 'Новая запись в журнал', `
            <form id="modal-form">
                <div class="form-group">
                    <label class="form-label">Тип операции</label>
                    <div class="radio-group" style="display:flex; gap:16px; margin-bottom: 8px;">
                        <label style="cursor:pointer;"><input type="radio" name="txType" value="expense" ${defaultType === 'expense' ? 'checked' : ''}> 🔻 Расход</label>
                        <label style="cursor:pointer;"><input type="radio" name="txType" value="income" ${defaultType === 'income' ? 'checked' : ''}> 🟩 Доход</label>
                    </div>
                </div>

                <div class="form-group" id="expense-type-group" style="display: ${defaultType === 'income' ? 'none' : 'block'};">
                    <label class="form-label">Вид расхода</label>
                    <div class="radio-group" style="display:flex; gap:16px;">
                        <label style="cursor:pointer;"><input type="radio" name="expenseType" value="current" ${defaultExpenseType === 'current' ? 'checked' : ''}> 💳 Текущий</label>
                        <label style="cursor:pointer;"><input type="radio" name="expenseType" value="mandatory" ${defaultExpenseType === 'mandatory' ? 'checked' : ''}> 🔒 Обязательный</label>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">Категория</label>
                    <select class="form-input" name="categoryId" id="tx-category-select" required>
                        ${renderCategoryOptions(defaultType, defaultExpenseType, defaultCategoryId)}
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label">Дата</label>
                    <input type="date" class="form-input" name="date" id="modal-tx-date" value="${defaultDate}" required>
                </div>

                <div class="form-group">
                    <label class="form-label">Сумма (€)</label>
                    <input type="number" class="form-input" name="amount" step="0.01" min="0.01" placeholder="0.00" value="${defaultAmount}" required>
                </div>

                <div class="form-group">
                    <label class="form-label">Счёт</label>
                    <select class="form-input" name="accountId" required>
                        ${accounts.map(a => `<option value="${a.id}" ${a.id === defaultAccount ? 'selected' : ''}>${a.name} (${formatMoney(Accounts.getBalance(a.id))})</option>`).join('')}
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label">Пояснение</label>
                    <input type="text" class="form-input" name="note" placeholder="Заметка, комментарий..." value="${defaultNote}">
                </div>

                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Отмена</button>
                    <button type="submit" class="btn btn-primary">${isEdit ? 'Сохранить изменения' : 'Сохранить'}</button>
                </div>
            </form>
        `);

        const form = document.getElementById('modal-form');
        const expenseTypeGroup = document.getElementById('expense-type-group');
        const catSelect = document.getElementById('tx-category-select');
        const dateInputModal = document.getElementById('modal-tx-date');

        // Открытие календаря при клике в поле даты модалки
        dateInputModal?.addEventListener('click', () => {
            if (typeof dateInputModal.showPicker === 'function') {
                try { dateInputModal.showPicker(); } catch (err) {}
            }
        });

        const updateCategorySelect = () => {
            const txType = form.txType.value;
            const expenseType = form.expenseType ? form.expenseType.value : 'current';

            if (txType === 'income') {
                expenseTypeGroup.style.display = 'none';
            } else {
                expenseTypeGroup.style.display = 'block';
            }
            catSelect.innerHTML = renderCategoryOptions(txType, expenseType, form.categoryId.value);
        };

        form.addEventListener('change', (e) => {
            if (e.target.name === 'txType' || e.target.name === 'expenseType') {
                updateCategorySelect();
            }
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const txType = form.txType.value;
            const expenseType = txType === 'expense' ? form.expenseType.value : null;

            const payload = {
                type: txType,
                expenseType: expenseType,
                categoryId: form.categoryId.value,
                date: form.date.value,
                amount: parseFloat(form.amount.value) || 0,
                accountId: form.accountId.value,
                note: form.note.value.trim()
            };

            if (!payload.categoryId) {
                alert('Пожалуйста, выберите категорию!');
                return;
            }

            if (isEdit) {
                this.update(editId, payload);
            } else {
                this.add(payload);
            }

            App.closeModal();
            App.renderPage();
        });
    },

    /* --- Модальное окно настройки бюджета месяца --- */

    showBudgetSettingsModal() {
        const monthStr = this.currentMonth;
        const currentBudget = this.getMonthBudget(monthStr);

        App.showModal(`Настройка плана за ${monthStr}`, `
            <form id="modal-form">
                <p style="font-size:13px; color:var(--text-secondary); margin-bottom:16px;">
                    Оценка дохода и обязательных платежей для вычисления дневного бюджета (Доход - Обязательные) / Дни.
                </p>
                <div class="form-group">
                    <label class="form-label">Оцениваемый Доход на месяц (€)</label>
                    <input type="number" class="form-input" name="plannedIncome" step="0.01" value="${currentBudget.plannedIncome}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Оцениваемые Обязательные расходы (€)</label>
                    <input type="number" class="form-input" name="plannedMandatory" step="0.01" value="${currentBudget.plannedMandatory}" required>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Отмена</button>
                    <button type="submit" class="btn btn-primary">Сохранить план</button>
                </div>
            </form>
        `);

        document.getElementById('modal-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const plannedIncome = parseFloat(e.target.plannedIncome.value) || 0;
            const plannedMandatory = parseFloat(e.target.plannedMandatory.value) || 0;

            this.setMonthBudget(monthStr, plannedIncome, plannedMandatory);
            App.closeModal();
            App.renderPage();
        });
    }
};
