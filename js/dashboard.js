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

    render() {
        try {
            const today = new Date();
            const currentMonth = today.toISOString().slice(0, 7); // "YYYY-MM"
            
            const allTx = (typeof Journal !== 'undefined' && Journal.getAll) ? (Journal.getAll() || []) : [];
            const monthTx = allTx.filter(t => t && t.date && t.date.startsWith(currentMonth));

            // 1. KPI метрики
            const totalBalance = (typeof Accounts !== 'undefined' && Accounts.getTotalBalance) ? Accounts.getTotalBalance() : 0;
            const actualIncome = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
            const actualMandatory = monthTx.filter(t => t.type === 'expense' && t.expenseType === 'mandatory').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
            const actualCurrent = monthTx.filter(t => t.type === 'expense' && t.expenseType === 'current').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
            const actualExpenses = actualMandatory + actualCurrent;
            const netMonthBalance = actualIncome - actualExpenses;

            // Дневной бюджет и средний расход в день
            let dailyPlan = 0;
            const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
            if (typeof Journal !== 'undefined' && Journal.getBudgetForMonth) {
                const budgetSettings = Journal.getBudgetForMonth(currentMonth) || {};
                const pIncome = budgetSettings.plannedIncome || 0;
                const pMandatory = budgetSettings.plannedMandatory || 0;
                dailyPlan = Math.max(0, (pIncome - pMandatory) / daysInMonth);
            }
            const daysPassed = Math.max(1, today.getDate());
            const averageDailyExpense = actualCurrent / daysPassed;
            const isOverDailyPlan = dailyPlan > 0 && averageDailyExpense > dailyPlan;

            // 2. Личные счета
            const accounts = (typeof Accounts !== 'undefined' && Accounts.getAll) ? (Accounts.getAll() || []) : [];

            // 3. Последние 5 операций
            const recentTx = allTx.slice().sort((a, b) => {
                if (a.date !== b.date) return (b.date || '').localeCompare(a.date || '');
                return (b.createdAt || '').localeCompare(a.createdAt || '');
            }).slice(0, 5);

            // 4. Распределение общих расходов по категориям (Обязательные + Текущие)
            const categoryMap = {};
            monthTx.filter(t => t.type === 'expense').forEach(t => {
                categoryMap[t.categoryId] = (categoryMap[t.categoryId] || 0) + (parseFloat(t.amount) || 0);
            });
            const cats = (typeof Categories !== 'undefined' && Categories.getAll) ? (Categories.getAll() || {}) : {};
            const allExpenseCategories = [...(cats.mandatory || []), ...(cats.current || [])];
            const categoryStats = allExpenseCategories.map(c => ({
                name: c.name,
                amount: categoryMap[c.id] || 0
            })).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount);
            const maxCatAmount = Math.max(...categoryStats.map(c => c.amount), 1);

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
                        <div class="card-hint">Текущий месяц (${currentMonth})</div>
                    </div>

                    <div class="card">
                        <div class="card-title">Расход за месяц</div>
                        <div class="card-value negative">-${formatMoney(actualExpenses)}</div>
                        <div class="card-hint">Обязательные + Текущие</div>
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

                    <div class="card ${isOverDailyPlan ? 'card-danger' : 'card-success'}">
                        <div class="card-title">Средний расход/день</div>
                        <div style="font-size: 10px; color: var(--text-muted); margin-top: -4px; margin-bottom: 4px;">(Только текущие расходы)</div>
                        <div class="card-value ${isOverDailyPlan ? 'negative' : 'positive'}">${formatMoney(averageDailyExpense)}</div>
                        <div class="card-hint">
                            ${isOverDailyPlan 
                                ? `<span class="badge badge-danger">План: ${formatMoney(dailyPlan)}/дн</span>` 
                                : `<span class="badge badge-success">План: ${formatMoney(dailyPlan)}/дн</span>`}
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
                        
                        <!-- Виджет общих расходов по категориям -->
                        <div class="card">
                            <div class="section-header" style="margin-bottom: 12px; padding: 0;">
                                <h3 class="section-title" style="font-size: 16px;">🍩 Общие расходы за месяц</h3>
                            </div>
                            ${categoryStats.length === 0 ? '<div class="list-empty">Расходов в этом месяце пока нет</div>' : `
                            <div style="display: flex; flex-direction: column; gap: 12px;">
                                ${categoryStats.map(c => {
                                    const percent = Math.round((c.amount / (actualExpenses || 1)) * 100) || 0;
                                    const barWidth = Math.round((c.amount / maxCatAmount) * 100);
                                    return `
                                    <div>
                                        <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px;">
                                            <span>${c.name}</span>
                                            <span style="font-weight: 600;">${formatMoney(c.amount)} <span style="font-size: 11px; color: var(--text-muted);">(${percent}%)</span></span>
                                        </div>
                                        <div style="height: 6px; background: var(--bg-body); border-radius: 3px; overflow: hidden;">
                                            <div style="height: 100%; width: ${barWidth}%; background: var(--accent); border-radius: 3px;"></div>
                                        </div>
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
