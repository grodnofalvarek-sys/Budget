/* ===========================================
   Dashboard — Главная страница финансовой сводки
   =========================================== */

const Dashboard = {
    init() {},

    getCategoryName(type, expenseType, catId) {
        try {
            if (typeof Categories !== 'undefined' && Categories.getAll) {
                const cats = Categories.getAll();
                let list = [];
                if (type === 'income') list = cats.income || [];
                else if (expenseType === 'mandatory') list = cats.mandatory || [];
                else list = cats.current || [];
                const item = list.find(c => c && c.id === catId);
                if (item) return item.name;
            }
        } catch (e) {}
        return '(без категории)';
    },

    getAccountName(accId) {
        try {
            if (typeof Accounts !== 'undefined' && Accounts.getById) {
                const acc = Accounts.getById(accId);
                if (acc) return acc.name;
            }
        } catch (e) {}
        return '(неизвестный счёт)';
    },

    getCapitalDynamics(monthStr) {
        try {
            const allAccounts = (typeof Accounts !== 'undefined' && Accounts.getAll) ? (Accounts.getAll() || []) : [];
            const allTx = (typeof Journal !== 'undefined' && Journal.getAll) ? (Journal.getAll() || []) : [];
            const allTransfers = (typeof Accounts !== 'undefined' && Accounts.getTransfers) ? (Accounts.getTransfers() || []) : [];
            const allShared = (typeof Shared !== 'undefined' && Shared.getTransactions) ? (Shared.getTransactions() || []) : [];
            const allCurrency = (typeof Currency !== 'undefined' && Currency.getTransactions) ? (Currency.getTransactions() || []) : [];

            const monthStart = monthStr + '-01';
            const [y, m] = monthStr.split('-').map(Number);
            const lastDay = new Date(y, m, 0).getDate();
            const monthEnd = `${monthStr}-${lastDay < 10 ? '0' + lastDay : lastDay}`;

            let totalStart = 0;
            let totalEnd = 0;

            allAccounts.forEach(a => {
                const initBal = a.initialBalance !== undefined ? a.initialBalance : (a.balance || 0);
                const yieldRate = parseFloat(a.yieldRate) || 0;

                // Расчёт на начало месяца (строго до 1-го числа месяца)
                const jStart = allTx.reduce((sum, t) => {
                    if (t.accountId !== a.id || (t.date && t.date >= monthStart)) return sum;
                    return sum + (t.type === 'income' ? t.amount : -t.amount);
                }, 0);

                const trStart = allTransfers.reduce((sum, tr) => {
                    if (tr.date && tr.date >= monthStart) return sum;
                    if (tr.toId === a.id) sum += tr.amount;
                    if (tr.fromId === a.id) sum -= tr.amount;
                    return sum;
                }, 0);

                const shStart = allShared.reduce((sum, t) => {
                    if (t.type === 'my_deposit' && t.accountId === a.id && (!t.date || t.date < monthStart)) {
                        return sum - (t.amount || 0);
                    }
                    return sum;
                }, 0);

                const cuStart = allCurrency.reduce((sum, t) => {
                    if (t.type === 'deposit' && t.sourceAccountId === a.id && (!t.date || t.date < monthStart)) {
                        return sum - (parseFloat(t.spentEur) || 0);
                    }
                    return sum;
                }, 0);

                const startDeposited = initBal + jStart + trStart + shStart + cuStart;
                const startBal = startDeposited + (yieldRate > 0 ? (startDeposited * (yieldRate / 100)) : 0);

                // Расчёт на конец месяца (по последнее число включительно)
                const jEnd = allTx.reduce((sum, t) => {
                    if (t.accountId !== a.id || (t.date && t.date > monthEnd)) return sum;
                    return sum + (t.type === 'income' ? t.amount : -t.amount);
                }, 0);

                const trEnd = allTransfers.reduce((sum, tr) => {
                    if (tr.date && tr.date > monthEnd) return sum;
                    if (tr.toId === a.id) sum += tr.amount;
                    if (tr.fromId === a.id) sum -= tr.amount;
                    return sum;
                }, 0);

                const shEnd = allShared.reduce((sum, t) => {
                    if (t.type === 'my_deposit' && t.accountId === a.id && (!t.date || t.date <= monthEnd)) {
                        return sum - (t.amount || 0);
                    }
                    return sum;
                }, 0);

                const cuEnd = allCurrency.reduce((sum, t) => {
                    if (t.type === 'deposit' && t.sourceAccountId === a.id && (!t.date || t.date <= monthEnd)) {
                        return sum - (parseFloat(t.spentEur) || 0);
                    }
                    return sum;
                }, 0);

                const endDeposited = initBal + jEnd + trEnd + shEnd + cuEnd;
                const endBal = endDeposited + (yieldRate > 0 ? (endDeposited * (yieldRate / 100)) : 0);

                totalStart += startBal;
                totalEnd += endBal;
            });

            const delta = totalEnd - totalStart;
            const deltaPercent = totalStart > 0 ? (delta / totalStart) * 100 : 0;

            return { totalStart, totalEnd, delta, deltaPercent };
        } catch (e) {
            console.error('Error calculating capital dynamics:', e);
            return { totalStart: 0, totalEnd: 0, delta: 0, deltaPercent: 0 };
        }
    },

    render() {
        try {
            const today = new Date();
            const currentMonth = (typeof App !== 'undefined' && App.currentMonth) ? App.currentMonth : today.toISOString().slice(0, 7);
            
            const allTx = (typeof Journal !== 'undefined' && Journal.getAll) ? (Journal.getAll() || []) : [];
            const monthTx = allTx.filter(t => t && t.date && t.date.startsWith(currentMonth));

            // 1. KPI метрики
            const totalBalance = (typeof Accounts !== 'undefined' && Accounts.getTotalBalance) ? Accounts.getTotalBalance() : 0;
            const actualIncome = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
            const actualMandatory = monthTx.filter(t => t.type === 'expense' && t.expenseType === 'mandatory').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
            const actualCurrent = monthTx.filter(t => t.type === 'expense' && t.expenseType === 'current').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
            
            // Переводы на сторонние счета (Общий счёт и Валюты) за выбранный месяц
            let actualSharedTransfers = 0;
            if (typeof Shared !== 'undefined' && Shared.getTransactions) {
                const sharedTxs = Shared.getTransactions() || [];
                actualSharedTransfers = sharedTxs
                    .filter(t => t && t.type === 'my_deposit' && t.date && t.date.startsWith(currentMonth))
                    .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
            }

            let actualCurrencyTransfers = 0;
            if (typeof Currency !== 'undefined' && Currency.getTransactions) {
                const currTxs = Currency.getTransactions() || [];
                actualCurrencyTransfers = currTxs
                    .filter(t => t && t.type === 'deposit' && t.date && t.date.startsWith(currentMonth))
                    .filter(t => t.sourceAccountId && t.sourceAccountId !== 'shared') // Исключаем Общий счёт (только личные счета)
                    .reduce((s, t) => s + (parseFloat(t.spentEur) || 0), 0);
            }

            const actualExternalTransfers = actualSharedTransfers + actualCurrencyTransfers;
            const actualExpenses = actualMandatory + actualCurrent + actualExternalTransfers;
            const netMonthBalance = actualIncome - actualExpenses;

            // Динамика суммарного капитала всех счетов за месяц
            const capDynamics = this.getCapitalDynamics(currentMonth);
            const capDelta = capDynamics.delta;
            const isCapPositive = capDelta >= 0;

            // 2. Личные счета
            const accounts = (typeof Accounts !== 'undefined' && Accounts.getAll) ? (Accounts.getAll() || []) : [];

            // 3. Последние 5 операций
            const recentTx = allTx.slice().sort((a, b) => {
                if (a.date !== b.date) return (b.date || '').localeCompare(a.date || '');
                return (b.createdAt || '').localeCompare(a.createdAt || '');
            }).slice(0, 5);

            // 4. Распределение по категориям: Обязательные (🔒) + Текущие (💳) + Переводы (💰)
            const allCats = (typeof Categories !== 'undefined' && Categories.getAll) ? Categories.getAll() : { mandatory: [], current: [] };
            const mandatoryCats = allCats.mandatory || [];
            const currentCats = allCats.current || [];
            const categoryStats = [];

            // Обязательные (🔒)
            const mandMap = {};
            monthTx.filter(t => t.type === 'expense' && t.expenseType === 'mandatory').forEach(t => {
                mandMap[t.categoryId] = (mandMap[t.categoryId] || 0) + (parseFloat(t.amount) || 0);
            });
            mandatoryCats.forEach(c => {
                const amount = mandMap[c.id] || 0;
                if (amount > 0) {
                    categoryStats.push({ id: c.id, name: c.name, icon: '🔒', type: 'mandatory', amount });
                }
            });
            Object.keys(mandMap).forEach(catId => {
                if (!mandatoryCats.some(c => c.id === catId) && mandMap[catId] > 0) {
                    categoryStats.push({ id: catId, name: this.getCategoryName('expense', 'mandatory', catId), icon: '🔒', type: 'mandatory', amount: mandMap[catId] });
                }
            });

            // Текущие (💳)
            const currMap = {};
            monthTx.filter(t => t.type === 'expense' && t.expenseType === 'current').forEach(t => {
                currMap[t.categoryId] = (currMap[t.categoryId] || 0) + (parseFloat(t.amount) || 0);
            });
            currentCats.forEach(c => {
                const amount = currMap[c.id] || 0;
                if (amount > 0) {
                    categoryStats.push({ id: c.id, name: c.name, icon: '💳', type: 'current', amount });
                }
            });
            Object.keys(currMap).forEach(catId => {
                if (!currentCats.some(c => c.id === catId) && currMap[catId] > 0) {
                    categoryStats.push({ id: catId, name: this.getCategoryName('expense', 'current', catId), icon: '💳', type: 'current', amount: currMap[catId] });
                }
            });

            // Переводы на сторонние счета (💰)
            if (actualSharedTransfers > 0) {
                categoryStats.push({ id: 'transfer_shared', name: 'Взнос в Общий счёт', icon: '💰', type: 'transfer', amount: actualSharedTransfers });
            }
            if (actualCurrencyTransfers > 0) {
                categoryStats.push({ id: 'transfer_currency', name: 'Покупка валюты', icon: '💰', type: 'transfer', amount: actualCurrencyTransfers });
            }

            categoryStats.sort((a, b) => b.amount - a.amount);

            const formattedMonthName = (typeof DatePicker !== 'undefined' && DatePicker.formatMonth)
                ? DatePicker.formatMonth(currentMonth)
                : currentMonth;

            return `
                <!-- Верхняя панель KPI метрик -->
                <div class="card-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-bottom: 24px;">
                    <div class="card card-accent">
                        <div class="card-title">Общий баланс</div>
                        <div class="card-value ${totalBalance >= 0 ? 'positive' : 'negative'}">${formatMoney(totalBalance)}</div>
                        <div class="card-hint">Сумма видимых счетов</div>
                    </div>

                    <div class="card">
                        <div class="card-title">Доход за месяц</div>
                        <div class="card-value positive">+${formatMoney(actualIncome)}</div>
                        <div class="card-hint">За ${formattedMonthName}</div>
                    </div>

                    <div class="card">
                        <div class="card-title">Расход за месяц</div>
                        <div class="card-value negative">-${formatMoney(actualExpenses)}</div>
                        <div class="card-hint">Обязательные+Текущие+Переводы</div>
                    </div>

                    <div class="card ${netMonthBalance >= 0 ? 'card-success' : 'card-danger'}">
                        <div class="card-title">Итог месяца (Баланс)</div>
                        <div class="card-value ${netMonthBalance >= 0 ? 'positive' : 'negative'}">${netMonthBalance >= 0 ? '+' : ''}${formatMoney(netMonthBalance)}</div>
                        <div class="card-hint">
                            ${netMonthBalance >= 0 
                                ? `<span class="badge badge-success">Накоплено в этом месяце</span>` 
                                : `<span class="badge badge-danger">Дефицит месяца</span>`}
                        </div>
                    </div>

                    <div class="card ${isCapPositive ? 'card-success' : 'card-danger'}">
                        <div class="card-title">Динамика капитала</div>
                        <div style="font-size: 10px; color: var(--text-muted); margin-top: -4px; margin-bottom: 4px;">(Все счета, включая Пенсионный)</div>
                        <div class="card-value ${isCapPositive ? 'positive' : 'negative'}">${isCapPositive ? '+' : ''}${formatMoney(capDelta)}</div>
                        <div class="card-hint">
                            ${formatMoney(capDynamics.totalStart)} ➔ ${formatMoney(capDynamics.totalEnd)}
                            <span class="badge ${isCapPositive ? 'badge-success' : 'badge-danger'}" style="margin-left:4px;">${isCapPositive ? '▲ +' : '▼ '}${Math.abs(capDynamics.deltaPercent).toFixed(1)}%</span>
                        </div>
                    </div>
                </div>

                <!-- Основные сетки Дашборда -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 24px;">
                    <div style="display: flex; flex-direction: column; gap: 24px;">
                        
                        <!-- Виджет Счетов -->
                        <div class="card">
                            <div class="section-header" style="margin-bottom: 12px; padding: 0;">
                                <h3 class="section-title" style="font-size: 16px;">💳 Состояние счетов</h3>
                                <div style="display:flex; gap:8px;">
                                    <button class="btn btn-primary btn-sm" id="dashboard-btn-add-tx">+ Запись</button>
                                    <button class="btn btn-secondary btn-sm" id="dashboard-btn-transfer">↔ Перевод</button>
                                </div>
                            </div>
                            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px;">
                                ${accounts.map(a => {
                                    const bal = Accounts.getBalance ? Accounts.getBalance(a.id) : 0;
                                    return `
                                    <div style="background: var(--bg-body); border: 1px solid var(--border-subtle); border-radius: var(--radius); padding: 10px 12px;">
                                        <div style="font-size: 13px; color: var(--text-secondary); display:flex; justify-content: space-between; align-items:center;">
                                            <span>${a.name}</span>
                                            ${!a.isVisible ? '<span style="font-size:10px; opacity:0.6;">(скрыт)</span>' : ''}
                                        </div>
                                        <div style="font-size: 16px; font-weight: 700; margin-top: 4px;" class="${bal >= 0 ? '' : 'negative'}">
                                            ${formatMoney(bal)}
                                        </div>
                                    </div>`;
                                }).join('')}
                            </div>
                        </div>

                        <!-- Виджет 5 последних операций -->
                        <div class="card">
                            <div class="section-header" style="margin-bottom: 12px; padding: 0;">
                                <h3 class="section-title" style="font-size: 16px;">📝 Последние операции</h3>
                                <button class="btn btn-secondary btn-sm" id="dashboard-btn-go-journal">В журнал →</button>
                            </div>
                            ${recentTx.length === 0 ? '<div class="list-empty">Операций пока нет</div>' : `
                            <div style="display: flex; flex-direction: column; gap: 8px;">
                                ${recentTx.map(t => {
                                    const catName = this.getCategoryName(t.type, t.expenseType, t.categoryId);
                                    const accName = this.getAccountName(t.accountId);
                                    const isInc = t.type === 'income';
                                    return `
                                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--bg-body); border-radius: var(--radius); border: 1px solid var(--border-subtle);">
                                        <div>
                                            <div style="font-weight: 600; font-size: 13px;">${catName}</div>
                                            <div style="font-size: 11px; color: var(--text-muted);">${formatDate(t.date || '')} • ${accName}</div>
                                        </div>
                                        <div style="font-weight: 700; font-size: 14px;" class="${isInc ? 'positive' : 'negative'}">
                                            ${isInc ? '+' : '-'}${formatMoney(t.amount)}
                                        </div>
                                    </div>`;
                                }).join('')}
                            </div>`}
                        </div>

                    </div>

                    <div style="display: flex; flex-direction: column; gap: 24px;">
                        
                        <!-- Виджет общих расходов по категориям (без перегружающих полос) -->
                        <div class="card">
                            <div class="section-header" style="margin-bottom: 12px; padding: 0;">
                                <h3 class="section-title" style="font-size: 16px;">🍩 Общие расходы за месяц</h3>
                            </div>
                            ${categoryStats.length === 0 ? '<div class="list-empty">Расходов в этом месяце пока нет</div>' : `
                            <div style="display: flex; flex-direction: column; gap: 4px;">
                                ${categoryStats.map(c => {
                                    const rawPercent = Math.round((c.amount / (actualExpenses || 1)) * 100);
                                    const percentStr = rawPercent > 0 ? `${rawPercent}%` : '<1%';

                                    return `
                                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 7px 0; border-bottom: 1px solid var(--border-subtle); font-size: 13px;">
                                        <span style="display:inline-flex; align-items:center; gap:8px;">
                                            <span style="font-size:13px;">${c.icon}</span>
                                            <span style="font-weight:500;">${c.name}</span>
                                        </span>
                                        <span style="font-weight: 600;">${formatMoney(c.amount)} <span style="font-size: 11px; color: var(--text-muted); font-weight: normal;">(${percentStr})</span></span>
                                    </div>`;
                                }).join('')}
                            </div>`}
                        </div>

                    </div>
                </div>
            `;
        } catch (err) {
            console.error('Dashboard render error:', err);
            return `
                <div class="card card-accent" style="padding: 24px;">
                    <h2>📊 Обзор финансового состояния</h2>
                    <p style="margin-top: 12px; color: var(--text-secondary)">Дашборд готов к работе! Переключайтесь между разделами в боковом меню.</p>
                </div>`;
        }
    },

    afterRender() {
        try {
            document.getElementById('dashboard-btn-add-tx')?.addEventListener('click', () => {
                if (typeof Journal !== 'undefined' && Journal.showAddModal) Journal.showAddModal();
            });
            document.getElementById('dashboard-btn-transfer')?.addEventListener('click', () => {
                if (typeof Accounts !== 'undefined' && Accounts.showTransferModal) Accounts.showTransferModal();
            });
            document.getElementById('dashboard-btn-go-journal')?.addEventListener('click', () => {
                if (typeof App !== 'undefined' && App.navigate) App.navigate('journal');
            });
        } catch (e) {}
    }
};
