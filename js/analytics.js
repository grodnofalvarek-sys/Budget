/* ===========================================
   Analytics — Финансовая аналитика, графики и отчёты
   =========================================== */

const Analytics = {
    selectedPeriod: 'year', // 'month' | 'quarter' | 'half_year' | 'year' | 'all'

    init() {},

    /* --- Форматирование даты и времени в европейский ISO-формат (YYYY-MM-DD, HH:MM) --- */

    formatDateTime(d = new Date()) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${y}-${m}-${day}, ${hh}:${mm}`;
    },

    /* --- Сбор и агрегация данных за период --- */

    getMonthsForPeriod(period, currentMonthStr) {
        const [curYear, curMonthNum] = (currentMonthStr || new Date().toISOString().slice(0, 7)).split('-').map(Number);
        const months = [];

        if (period === 'month') {
            months.push(currentMonthStr);
        } else if (period === 'quarter') {
            for (let i = 2; i >= 0; i--) {
                let m = curMonthNum - i;
                let y = curYear;
                if (m <= 0) { m += 12; y -= 1; }
                months.push(`${y}-${m < 10 ? '0' + m : m}`);
            }
        } else if (period === 'half_year') {
            for (let i = 5; i >= 0; i--) {
                let m = curMonthNum - i;
                let y = curYear;
                if (m <= 0) { m += 12; y -= 1; }
                months.push(`${y}-${m < 10 ? '0' + m : m}`);
            }
        } else if (period === 'year') {
            for (let m = 1; m <= 12; m++) {
                months.push(`${curYear}-${m < 10 ? '0' + m : m}`);
            }
        } else if (period === 'all') {
            const allTx = (typeof Journal !== 'undefined' && Journal.getAll) ? (Journal.getAll() || []) : [];
            const monthSet = new Set();
            allTx.forEach(t => { if (t.date) monthSet.add(t.date.slice(0, 7)); });
            monthSet.add(currentMonthStr);
            months.push(...Array.from(monthSet).sort());
        }

        return months;
    },

    getMonthData(monthStr) {
        const allTx = (typeof Journal !== 'undefined' && Journal.getAll) ? (Journal.getAll() || []) : [];
        const monthTx = allTx.filter(t => t && t.date && t.date.startsWith(monthStr));

        const income = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
        const mandatory = monthTx.filter(t => t.type === 'expense' && t.expenseType === 'mandatory').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
        const current = monthTx.filter(t => t.type === 'expense' && t.expenseType === 'current').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);

        let sharedTransfers = 0;
        if (typeof Shared !== 'undefined' && Shared.getTransactions) {
            const sharedTxs = Shared.getTransactions() || [];
            sharedTransfers = sharedTxs
                .filter(t => t && t.type === 'my_deposit' && t.date && t.date.startsWith(monthStr))
                .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
        }

        let currencyTransfers = 0;
        if (typeof Currency !== 'undefined' && Currency.getTransactions) {
            const currTxs = Currency.getTransactions() || [];
            currencyTransfers = currTxs
                .filter(t => t && t.type === 'deposit' && t.date && t.date.startsWith(monthStr))
                .filter(t => t.sourceAccountId && t.sourceAccountId !== 'shared')
                .reduce((s, t) => s + (parseFloat(t.spentEur) || 0), 0);
        }

        const transfers = sharedTransfers + currencyTransfers;
        const totalExpenses = mandatory + current + transfers;
        const netSavings = income - totalExpenses;
        const savingsRate = income > 0 ? (netSavings / income) * 100 : 0;

        let endCapital = 0;
        if (typeof Dashboard !== 'undefined' && Dashboard.getCapitalDynamics) {
            const cap = Dashboard.getCapitalDynamics(monthStr);
            endCapital = cap.totalEnd;
        }

        return {
            month: monthStr,
            income,
            mandatory,
            current,
            transfers,
            totalExpenses,
            netSavings,
            savingsRate,
            endCapital,
            hasData: (income > 0 || totalExpenses > 0)
        };
    },

    getAggregatedPeriodData(period, currentMonthStr) {
        const months = this.getMonthsForPeriod(period, currentMonthStr);
        const monthlyStats = months.map(m => this.getMonthData(m));

        const totalIncome = monthlyStats.reduce((s, m) => s + m.income, 0);
        const totalMandatory = monthlyStats.reduce((s, m) => s + m.mandatory, 0);
        const totalCurrent = monthlyStats.reduce((s, m) => s + m.current, 0);
        const totalTransfers = monthlyStats.reduce((s, m) => s + m.transfers, 0);
        const totalExpenses = totalMandatory + totalCurrent + totalTransfers;
        const totalSavings = totalIncome - totalExpenses;
        const avgSavingsRate = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;

        const allTx = (typeof Journal !== 'undefined' && Journal.getAll) ? (Journal.getAll() || []) : [];
        const periodTx = allTx.filter(t => t && t.date && months.some(m => t.date.startsWith(m)));
        const allCats = (typeof Categories !== 'undefined' && Categories.getAll) ? Categories.getAll() : { mandatory: [], current: [] };

        const categoryStats = [];

        // Обязательные (🔒)
        const mandMap = {};
        periodTx.filter(t => t.type === 'expense' && t.expenseType === 'mandatory').forEach(t => {
            mandMap[t.categoryId] = (mandMap[t.categoryId] || 0) + (parseFloat(t.amount) || 0);
        });
        (allCats.mandatory || []).forEach(c => {
            const amount = mandMap[c.id] || 0;
            if (amount > 0) categoryStats.push({ id: c.id, name: c.name, icon: '🔒', type: 'mandatory', amount });
        });
        Object.keys(mandMap).forEach(catId => {
            if (!(allCats.mandatory || []).some(c => c.id === catId) && mandMap[catId] > 0) {
                categoryStats.push({ id: catId, name: (Dashboard.getCategoryName ? Dashboard.getCategoryName('expense', 'mandatory', catId) : catId), icon: '🔒', type: 'mandatory', amount: mandMap[catId] });
            }
        });

        // Текущие (💳)
        const currMap = {};
        periodTx.filter(t => t.type === 'expense' && t.expenseType === 'current').forEach(t => {
            currMap[t.categoryId] = (currMap[t.categoryId] || 0) + (parseFloat(t.amount) || 0);
        });
        (allCats.current || []).forEach(c => {
            const amount = currMap[c.id] || 0;
            if (amount > 0) categoryStats.push({ id: c.id, name: c.name, icon: '💳', type: 'current', amount });
        });
        Object.keys(currMap).forEach(catId => {
            if (!(allCats.current || []).some(c => c.id === catId) && currMap[catId] > 0) {
                categoryStats.push({ id: catId, name: (Dashboard.getCategoryName ? Dashboard.getCategoryName('expense', 'current', catId) : catId), icon: '💳', type: 'current', amount: currMap[catId] });
            }
        });

        // Переводы на сторонние счета (💰)
        if (totalTransfers > 0) {
            let sharedTotal = 0;
            if (typeof Shared !== 'undefined' && Shared.getTransactions) {
                const sharedTxs = Shared.getTransactions() || [];
                sharedTotal = sharedTxs
                    .filter(t => t && t.type === 'my_deposit' && t.date && months.some(m => t.date.startsWith(m)))
                    .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
            }
            let currTotal = 0;
            if (typeof Currency !== 'undefined' && Currency.getTransactions) {
                const currTxs = Currency.getTransactions() || [];
                currTotal = currTxs
                    .filter(t => t && t.type === 'deposit' && t.date && months.some(m => t.date.startsWith(m)))
                    .filter(t => t.sourceAccountId && t.sourceAccountId !== 'shared')
                    .reduce((s, t) => s + (parseFloat(t.spentEur) || 0), 0);
            }

            if (sharedTotal > 0) categoryStats.push({ id: 'transfer_shared', name: 'Взнос в Общий счёт', icon: '💰', type: 'transfer', amount: sharedTotal });
            if (currTotal > 0) categoryStats.push({ id: 'transfer_currency', name: 'Покупка валюты', icon: '💰', type: 'transfer', amount: currTotal });
        }

        categoryStats.sort((a, b) => b.amount - a.amount);

        return {
            months,
            monthlyStats,
            totalIncome,
            totalMandatory,
            totalCurrent,
            totalTransfers,
            totalExpenses,
            totalSavings,
            avgSavingsRate,
            categoryStats
        };
    },

    /* --- Рендеринг основной страницы Аналитики --- */

    render() {
        const currentMonth = (typeof App !== 'undefined' && App.currentMonth) ? App.currentMonth : new Date().toISOString().slice(0, 7);
        const data = this.getAggregatedPeriodData(this.selectedPeriod, currentMonth);

        const periodLabels = {
            month: 'Выбранный месяц',
            quarter: 'Квартал (3 мес)',
            half_year: 'Полгода (6 мес)',
            year: 'Весь ' + currentMonth.slice(0, 4) + ' год',
            all: 'За всё время'
        };

        const lastMonthCapital = data.monthlyStats[data.monthlyStats.length - 1]?.endCapital || 0;

        return `
            <!-- Панель фильтра периодов и универсальной кнопки отчёта -->
            <div class="analytics-toolbar" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:24px;">
                <div class="period-switcher" style="display:flex; gap:6px; background:var(--bg-card); padding:4px; border-radius:var(--radius); border:1px solid var(--border-subtle); flex-wrap:wrap;">
                    ${[
                        { id: 'month', label: 'Месяц' },
                        { id: 'quarter', label: '3 месяца' },
                        { id: 'half_year', label: 'Полгода' },
                        { id: 'year', label: 'Год (' + currentMonth.slice(0, 4) + ')' },
                        { id: 'all', label: 'Всё время' }
                    ].map(p => `
                        <button class="btn btn-sm ${this.selectedPeriod === p.id ? 'btn-primary' : 'btn-secondary'}" data-period="${p.id}" style="font-size:12px; padding:6px 14px;">
                            ${p.label}
                        </button>
                    `).join('')}
                </div>

                <div class="export-actions">
                    <button class="btn btn-primary btn-sm" id="btn-open-pdf-report" style="font-size:13px; font-weight:600; padding:8px 18px; box-shadow:0 2px 10px rgba(99, 102, 241, 0.35);">
                        📄 Сформировать финансовый отчёт (PDF)
                    </button>
                </div>
            </div>

            <!-- Верхние KPI карточки периода -->
            <div class="card-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-bottom: 24px;">
                <div class="card">
                    <div class="card-title">Доход за период</div>
                    <div class="card-value positive">+${formatMoney(data.totalIncome)}</div>
                    <div class="card-hint">${periodLabels[this.selectedPeriod]}</div>
                </div>

                <div class="card">
                    <div class="card-title">Расход за период</div>
                    <div class="card-value negative">-${formatMoney(data.totalExpenses)}</div>
                    <div class="card-hint">Обязательные + Текущие + Переводы</div>
                </div>

                <div class="card ${data.totalSavings >= 0 ? 'card-success' : 'card-danger'}">
                    <div class="card-title">Чистые накопления</div>
                    <div class="card-value ${data.totalSavings >= 0 ? 'positive' : 'negative'}">
                        ${data.totalSavings >= 0 ? '+' : ''}${formatMoney(data.totalSavings)}
                    </div>
                    <div class="card-hint">
                        ${data.totalSavings >= 0 
                            ? `<span class="badge badge-success">Норма сбережений: ${data.avgSavingsRate.toFixed(1)}%</span>` 
                            : `<span class="badge badge-danger">Дефицит периода</span>`}
                    </div>
                </div>

                <div class="card card-accent">
                    <div class="card-title">Текущий капитал</div>
                    <div class="card-value">${formatMoney(lastMonthCapital)}</div>
                    <div class="card-hint">Все счета с процентами</div>
                </div>
            </div>

            <!-- Графики: Сетка 2 колонки -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); gap: 24px; margin-bottom: 24px;">
                
                <!-- График 1: Доходы vs Расходы по месяцам -->
                <div class="card">
                    <div class="section-header" style="margin-bottom: 16px; padding: 0;">
                        <h3 class="section-title" style="font-size: 16px;">📊 Доходы vs Расходы по месяцам</h3>
                        <div style="display:flex; gap:12px; font-size:11px; color:var(--text-muted);">
                            <span style="display:inline-flex; align-items:center; gap:4px;"><span style="width:8px; height:8px; border-radius:2px; background:#2ed573;"></span> Доходы</span>
                            <span style="display:inline-flex; align-items:center; gap:4px;"><span style="width:8px; height:8px; border-radius:2px; background:#ff4757;"></span> Расходы</span>
                        </div>
                    </div>
                    <div style="width:100%; min-height:220px; display:flex; align-items:center;">
                        ${this.renderBarChart(data.monthlyStats)}
                    </div>
                </div>

                <!-- График 2: Структура расходов (Донат-диаграмма) -->
                <div class="card">
                    <div class="section-header" style="margin-bottom: 16px; padding: 0;">
                        <h3 class="section-title" style="font-size: 16px;">🍩 Структура расходов</h3>
                        <div style="font-size:11px; color:var(--text-muted);">Всего: ${formatMoney(data.totalExpenses)}</div>
                    </div>
                    <div style="width:100%; min-height:220px; display:flex; align-items:center; justify-content:center;">
                        ${this.renderDonutChart(data.categoryStats, data.totalExpenses)}
                    </div>
                </div>

            </div>

            <!-- График 3: Тренд роста капитала -->
            <div class="card" style="margin-bottom: 24px;">
                <div class="section-header" style="margin-bottom: 16px; padding: 0;">
                    <h3 class="section-title" style="font-size: 16px;">📈 Динамика роста суммарного капитала</h3>
                    <div style="font-size:11px; color:var(--text-muted);">Включая накопительный пенсионный счёт с доходностью</div>
                </div>
                <div style="width:100%; min-height:160px;">
                    ${this.renderLineChart(data.monthlyStats)}
                </div>
            </div>

            <!-- Сводная таблица «Месяц к месяцу» -->
            <div class="card">
                <div class="section-header" style="margin-bottom: 16px; padding: 0;">
                    <h3 class="section-title" style="font-size: 16px;">📋 Сводный сравнительный отчёт</h3>
                    <div style="font-size:12px; color:var(--text-secondary);">${periodLabels[this.selectedPeriod]}</div>
                </div>

                <div class="journal-table-container">
                    <table class="journal-table analytics-table">
                        <thead>
                            <tr>
                                <th>Месяц</th>
                                <th style="text-align:right;">Доходы</th>
                                <th style="text-align:right;">Обязательные</th>
                                <th style="text-align:right;">Текущие</th>
                                <th style="text-align:right;">Переводы</th>
                                <th style="text-align:right;">Всего расходов</th>
                                <th style="text-align:right;">Чистый остаток</th>
                                <th style="text-align:right;">Капитал на конец</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.monthlyStats.map(m => {
                                const mName = (typeof DatePicker !== 'undefined' && DatePicker.formatMonth) ? DatePicker.formatMonth(m.month) : m.month;
                                const isPositive = m.netSavings >= 0;
                                return `
                                <tr style="${!m.hasData ? 'opacity:0.4;' : ''}">
                                    <td style="font-weight:600;">${mName}</td>
                                    <td style="text-align:right; font-weight:600;" class="${m.income > 0 ? 'positive' : ''}">
                                        ${m.income > 0 ? '+' : ''}${formatMoney(m.income)}
                                    </td>
                                    <td style="text-align:right;">${formatMoney(m.mandatory)}</td>
                                    <td style="text-align:right;">${formatMoney(m.current)}</td>
                                    <td style="text-align:right;">${formatMoney(m.transfers)}</td>
                                    <td style="text-align:right; font-weight:600;" class="${m.totalExpenses > 0 ? 'negative' : ''}">
                                        ${m.totalExpenses > 0 ? '-' : ''}${formatMoney(m.totalExpenses)}
                                    </td>
                                    <td style="text-align:right; font-weight:700;" class="${isPositive ? 'positive' : 'negative'}">
                                        ${isPositive ? '+' : ''}${formatMoney(m.netSavings)}
                                    </td>
                                    <td style="text-align:right; font-weight:600; color:var(--accent-start, #6366f1);">
                                        ${formatMoney(m.endCapital)}
                                    </td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                        <tfoot>
                            <tr style="background:var(--bg-card-hover); font-weight:700; border-top:2px solid var(--border-subtle);">
                                <td>ИТОГО ЗА ПЕРИОД:</td>
                                <td style="text-align:right;" class="positive">+${formatMoney(data.totalIncome)}</td>
                                <td style="text-align:right;">${formatMoney(data.totalMandatory)}</td>
                                <td style="text-align:right;">${formatMoney(data.totalCurrent)}</td>
                                <td style="text-align:right;">${formatMoney(data.totalTransfers)}</td>
                                <td style="text-align:right;" class="negative">-${formatMoney(data.totalExpenses)}</td>
                                <td style="text-align:right;" class="${data.totalSavings >= 0 ? 'positive' : 'negative'}">
                                    ${data.totalSavings >= 0 ? '+' : ''}${formatMoney(data.totalSavings)}
                                </td>
                                <td style="text-align:right; color:var(--accent-start, #6366f1);">${formatMoney(lastMonthCapital)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        `;
    },

    /* --- Рендеринг графиков (SVG) --- */

    renderBarChart(monthlyStats) {
        const maxVal = Math.max(...monthlyStats.map(m => Math.max(m.income, m.totalExpenses)), 1000);
        const height = 160;
        const width = 460;
        const barGroupWidth = width / (monthlyStats.length || 1);
        const barWidth = Math.max(6, Math.min(18, barGroupWidth * 0.32));

        return `
            <div style="overflow-x:auto; width:100%;">
                <svg viewBox="0 0 ${width} ${height + 35}" style="width:100%; min-width:340px; height:${height + 35}px; overflow:visible;">
                    <line x1="0" y1="0" x2="${width}" y2="0" stroke="rgba(255,255,255,0.07)" stroke-dasharray="3" />
                    <line x1="0" y1="${height/2}" x2="${width}" y2="${height/2}" stroke="rgba(255,255,255,0.07)" stroke-dasharray="3" />
                    <line x1="0" y1="${height}" x2="${width}" y2="${height}" stroke="rgba(255,255,255,0.15)" />

                    ${monthlyStats.map((m, idx) => {
                        const xCenter = idx * barGroupWidth + barGroupWidth / 2;
                        const incomeH = (m.income / maxVal) * height;
                        const expenseH = (m.totalExpenses / maxVal) * height;
                        const shortMonth = m.month.slice(5);

                        return `
                            <g class="chart-bar-group">
                                <rect x="${xCenter - barWidth - 1}" y="${height - incomeH}" width="${barWidth}" height="${incomeH}" 
                                      rx="2" fill="#2ed573" opacity="${m.income > 0 ? '0.9' : '0.2'}">
                                    <title>${m.month}: Доход +${formatMoney(m.income)}</title>
                                </rect>
                                <rect x="${xCenter + 1}" y="${height - expenseH}" width="${barWidth}" height="${expenseH}" 
                                      rx="2" fill="#ff4757" opacity="${m.totalExpenses > 0 ? '0.9' : '0.2'}">
                                    <title>${m.month}: Расход -${formatMoney(m.totalExpenses)}</title>
                                </rect>
                                <text x="${xCenter}" y="${height + 18}" text-anchor="middle" font-size="10" fill="var(--text-muted)">
                                    ${shortMonth}
                                </text>
                            </g>
                        `;
                    }).join('')}
                </svg>
            </div>
        `;
    },

    renderDonutChart(categoryStats, totalExpenses) {
        if (categoryStats.length === 0 || totalExpenses <= 0) {
            return '<div class="list-empty" style="padding:40px 0; text-align:center; color:var(--text-muted); font-size:13px;">Расходов в этом периоде пока нет</div>';
        }

        const colors = [
            '#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6', 
            '#06b6d4', '#f97316', '#64748b', '#eab308', '#a855f7'
        ];

        let accumulatedAngle = 0;
        const size = 150;
        const radius = 55;
        const center = size / 2;
        const strokeWidth = 22;
        const circumference = 2 * Math.PI * radius;

        const topCategories = categoryStats.slice(0, 5);
        const otherAmount = categoryStats.slice(5).reduce((s, c) => s + c.amount, 0);
        if (otherAmount > 0) {
            topCategories.push({ id: 'other', name: 'Прочие категории', icon: '📦', amount: otherAmount });
        }

        const segments = topCategories.map((c, idx) => {
            const ratio = c.amount / totalExpenses;
            const strokeDasharray = `${(ratio * circumference).toFixed(2)} ${circumference.toFixed(2)}`;
            const strokeDashoffset = (-accumulatedAngle * circumference).toFixed(2);
            accumulatedAngle += ratio;
            const color = colors[idx % colors.length];

            return {
                ...c,
                color,
                strokeDasharray,
                strokeDashoffset,
                percent: Math.round(ratio * 100) || (ratio > 0 ? '<1' : 0)
            };
        });

        return `
            <div style="display:flex; flex-wrap:wrap; align-items:center; gap:20px; justify-content:center; width:100%;">
                <div style="position:relative; width:${size}px; height:${size}px; flex-shrink:0;">
                    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform: rotate(-90deg);">
                        <circle cx="${center}" cy="${center}" r="${radius}" fill="transparent" stroke="var(--bg-body)" stroke-width="${strokeWidth}" />
                        ${segments.map(s => `
                            <circle cx="${center}" cy="${center}" r="${radius}" fill="transparent" 
                                    stroke="${s.color}" stroke-width="${strokeWidth}"
                                    stroke-dasharray="${s.strokeDasharray}" 
                                    stroke-dashoffset="${s.strokeDashoffset}">
                                <title>${s.name}: ${formatMoney(s.amount)} (${s.percent}%)</title>
                            </circle>
                        `).join('')}
                    </svg>
                    <div style="position:absolute; top:0; left:0; width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; pointer-events:none;">
                        <span style="font-size:10px; color:var(--text-muted);">Всего</span>
                        <span style="font-weight:700; font-size:12px;">${formatMoney(totalExpenses)}</span>
                    </div>
                </div>

                <div style="display:flex; flex-direction:column; gap:6px; flex:1; min-width:160px;">
                    ${segments.map(s => `
                        <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px;">
                            <span style="display:inline-flex; align-items:center; gap:6px;">
                                <span style="width:8px; height:8px; border-radius:50%; background:${s.color}; flex-shrink:0;"></span>
                                <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:120px;">${s.icon || ''} ${s.name}</span>
                            </span>
                            <span style="font-weight:600; white-space:nowrap; margin-left:8px;">${formatMoney(s.amount)} <span style="color:var(--text-muted); font-size:10px; font-weight:normal;">(${s.percent}%)</span></span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    renderLineChart(monthlyStats) {
        const capitals = monthlyStats.map(m => m.endCapital);
        const minVal = Math.min(...capitals, 0);
        const maxVal = Math.max(...capitals, 1000) * 1.05;
        const range = maxVal - minVal || 1;

        const width = 460;
        const height = 130;
        const stepX = width / Math.max(1, monthlyStats.length - 1);

        const points = monthlyStats.map((m, idx) => {
            const x = idx * stepX;
            const y = height - ((m.endCapital - minVal) / range) * height;
            return { x, y, val: m.endCapital, month: m.month };
        });

        const pathD = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
        const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${height} L 0 ${height} Z`;

        return `
            <div style="overflow-x:auto; width:100%;">
                <svg viewBox="0 0 ${width} ${height + 25}" style="width:100%; min-width:340px; height:${height + 25}px; overflow:visible;">
                    <defs>
                        <linearGradient id="capitalGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="#6366f1" stop-opacity="0.35" />
                            <stop offset="100%" stop-color="#6366f1" stop-opacity="0.0" />
                        </linearGradient>
                    </defs>

                    <path d="${areaD}" fill="url(#capitalGradient)" />
                    <path d="${pathD}" fill="none" stroke="#818cf8" stroke-width="2.5" stroke-linecap="round" />

                    ${points.map(p => `
                        <g>
                            <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="#a5b4fc" stroke="#1e1e2d" stroke-width="1.5">
                                <title>${p.month}: Капитал ${formatMoney(p.val)}</title>
                            </circle>
                            <text x="${p.x.toFixed(1)}" y="${height + 16}" text-anchor="middle" font-size="9" fill="var(--text-muted)">
                                ${p.month.slice(5)}
                            </text>
                        </g>
                    `).join('')}
                </svg>
            </div>
        `;
    },

    /* --- Обработчики событий --- */

    afterRender() {
        const content = document.getElementById('content');
        if (!content) return;

        content.querySelectorAll('[data-period]').forEach(btn => {
            btn.onclick = () => {
                this.selectedPeriod = btn.dataset.period;
                App.renderPage();
            };
        });

        document.getElementById('btn-open-pdf-report')?.addEventListener('click', () => {
            const currentMonth = (typeof App !== 'undefined' && App.currentMonth) ? App.currentMonth : new Date().toISOString().slice(0, 7);
            this.showMonthlyReportModal(currentMonth, this.selectedPeriod);
        });
    },

    /* --- Генерация и Предпросмотр PDF-отчёта --- */

    showMonthlyReportModal(monthStr, periodMode = 'month') {
        const formattedMonth = (typeof DatePicker !== 'undefined' && DatePicker.formatMonth) ? DatePicker.formatMonth(monthStr) : monthStr;
        const reportData = this.prepareMonthlyReportData(monthStr, periodMode);

        let modalOverlay = document.getElementById('report-modal-overlay');
        if (!modalOverlay) {
            modalOverlay = document.createElement('div');
            modalOverlay.id = 'report-modal-overlay';
            modalOverlay.className = 'modal-overlay';
            document.body.appendChild(modalOverlay);
        }

        modalOverlay.innerHTML = `
            <div class="modal report-preview-modal" style="max-width: 880px; width: 95%; max-height: 90vh; display: flex; flex-direction: column; padding: 0; background: var(--bg-secondary); border-radius: var(--radius); overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
                <!-- Шапка окна предпросмотра -->
                <div class="modal-header" style="padding: 16px 24px; margin-bottom: 0; border-bottom: 1px solid var(--border-subtle); background: var(--bg-card); display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 20px;">📄</span>
                        <div>
                            <div style="font-weight: 700; font-size: 16px;">${reportData.docTitle}</div>
                            <div style="font-size: 11px; color: var(--text-muted);">${reportData.docSubtitle} • Сформирован: ${reportData.generatedDateTime}</div>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <button class="btn btn-primary btn-sm" id="btn-print-report-now" style="padding: 8px 18px; font-weight: 600; box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);">
                            🖨️ Распечатать / Сохранить в PDF
                        </button>
                        <button class="modal-close" id="btn-close-report-modal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--text-muted);">&times;</button>
                    </div>
                </div>

                <!-- Тело отчёта (Белый финансовый документ А4) -->
                <div class="report-scroll-container" style="overflow-y: auto; padding: 24px; background: #525659; flex: 1;">
                    <div id="printable-financial-report" style="background: #ffffff; color: #1e293b; max-width: 800px; margin: 0 auto; padding: 36px 40px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; line-height: 1.5;">
                        
                        <!-- Заголовок документа -->
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 22px;">
                            <div>
                                <div style="font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">${reportData.docTitle}</div>
                                <div style="font-size: 13px; font-weight: 600; color: #4f46e5; margin-top: 2px;">${reportData.docSubtitle}</div>
                            </div>
                            <div style="text-align: right; font-size: 11px; color: #64748b;">
                                <div style="font-weight: 700; color: #0f172a; font-size: 12px;">💶 СЕМЕЙНЫЙ БЮДЖЕТ</div>
                                <div style="margin-top: 2px;">Сформирован: <span style="font-weight:600; color:#0f172a;">${reportData.generatedDateTime}</span></div>
                                <div>Статус: <span style="color: #059669; font-weight: 600;">Утверждён</span></div>
                            </div>
                        </div>

                        <!-- РАЗДЕЛ I: Сводные показатели -->
                        <div style="margin-bottom: 22px;">
                            <div style="font-size: 12px; font-weight: 700; color: #0f172a; text-transform: uppercase; margin-bottom: 8px; border-left: 3px solid #4f46e5; padding-left: 8px;">
                                I. Основные финансовые результаты
                            </div>
                            <table style="width: 100%; border-collapse: collapse; font-size: 11.5px; margin-bottom: 6px;">
                                <thead>
                                    <tr style="background: #f1f5f9; text-align: left;">
                                        <th style="padding: 7px 10px; border: 1px solid #cbd5e1;">Показатель</th>
                                        <th style="padding: 7px 10px; border: 1px solid #cbd5e1; text-align: right;">Сумма (EUR)</th>
                                        <th style="padding: 7px 10px; border: 1px solid #cbd5e1; text-align: right;">Доля / Норма</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style="padding: 7px 10px; border: 1px solid #cbd5e1; font-weight: 600;">📈 Доходы за период</td>
                                        <td style="padding: 7px 10px; border: 1px solid #cbd5e1; text-align: right; font-weight: 700; color: #059669;">+${formatMoney(reportData.income)}</td>
                                        <td style="padding: 7px 10px; border: 1px solid #cbd5e1; text-align: right; color: #64748b;">100%</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 7px 10px; border: 1px solid #cbd5e1; padding-left: 20px;">🔒 Обязательные расходы</td>
                                        <td style="padding: 7px 10px; border: 1px solid #cbd5e1; text-align: right;">${formatMoney(reportData.mandatory)}</td>
                                        <td style="padding: 7px 10px; border: 1px solid #cbd5e1; text-align: right; color: #64748b;">${reportData.mandShare}%</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 7px 10px; border: 1px solid #cbd5e1; padding-left: 20px;">💳 Текущие расходы</td>
                                        <td style="padding: 7px 10px; border: 1px solid #cbd5e1; text-align: right;">${formatMoney(reportData.current)}</td>
                                        <td style="padding: 7px 10px; border: 1px solid #cbd5e1; text-align: right; color: #64748b;">${reportData.currShare}%</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 7px 10px; border: 1px solid #cbd5e1; padding-left: 20px;">💰 Переводы (Общий счёт + Валюта)</td>
                                        <td style="padding: 7px 10px; border: 1px solid #cbd5e1; text-align: right;">${formatMoney(reportData.transfers)}</td>
                                        <td style="padding: 7px 10px; border: 1px solid #cbd5e1; text-align: right; color: #64748b;">${reportData.transfShare}%</td>
                                    </tr>
                                    <tr style="background: #f8fafc; font-weight: 700;">
                                        <td style="padding: 7px 10px; border: 1px solid #cbd5e1;">📉 ВСЕГО РАСХОДОВ ЗА ПЕРИОД</td>
                                        <td style="padding: 7px 10px; border: 1px solid #cbd5e1; text-align: right; color: #dc2626;">-${formatMoney(reportData.totalExpenses)}</td>
                                        <td style="padding: 7px 10px; border: 1px solid #cbd5e1; text-align: right; color: #64748b;">${reportData.expenseIncomeRatio}% от дохода</td>
                                    </tr>
                                    <tr style="background: ${reportData.netSavings >= 0 ? '#ecfdf5' : '#fef2f2'}; font-weight: 800;">
                                        <td style="padding: 8px 10px; border: 1px solid #cbd5e1; font-size: 12px;">🏆 ЧИСТЫЙ ОСТАТОК / НАКОПЛЕНИЯ</td>
                                        <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: right; font-size: 12px; color: ${reportData.netSavings >= 0 ? '#059669' : '#dc2626'};">
                                            ${reportData.netSavings >= 0 ? '+' : ''}${formatMoney(reportData.netSavings)}
                                        </td>
                                        <td style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: right; color: ${reportData.netSavings >= 0 ? '#059669' : '#dc2626'}; font-weight: 700;">
                                            Норма: ${reportData.savingsRate.toFixed(1)}%
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <!-- РАЗДЕЛ II: Состояние и динамика счетов -->
                        <div style="margin-bottom: 22px;">
                            <div style="font-size: 12px; font-weight: 700; color: #0f172a; text-transform: uppercase; margin-bottom: 8px; border-left: 3px solid #4f46e5; padding-left: 8px;">
                                II. Состояние и движение капитала по счетам
                            </div>
                            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                                <thead>
                                    <tr style="background: #f1f5f9; text-align: left;">
                                        <th style="padding: 6px 8px; border: 1px solid #cbd5e1;">Счёт</th>
                                        <th style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right;">На начало (${reportData.startPeriodDate})</th>
                                        <th style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right;">Поступления</th>
                                        <th style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right;">Списания</th>
                                        <th style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right;">Доходность</th>
                                        <th style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right;">На конец периода</th>
                                        <th style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right;">Дельта</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${reportData.accountsTable.map(a => `
                                        <tr>
                                            <td style="padding: 6px 8px; border: 1px solid #cbd5e1; font-weight: 600;">${a.name}</td>
                                            <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right;">${formatMoney(a.startBal)}</td>
                                            <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right; color: #059669;">${a.inflow > 0 ? '+' + formatMoney(a.inflow) : '—'}</td>
                                            <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right; color: #dc2626;">${a.outflow > 0 ? '-' + formatMoney(a.outflow) : '—'}</td>
                                            <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right; color: #4f46e5;">${a.yieldText}</td>
                                            <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right; font-weight: 700;">${formatMoney(a.endBal)}</td>
                                            <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right; font-weight: 700; color: ${a.delta >= 0 ? '#059669' : '#dc2626'};">
                                                ${a.delta >= 0 ? '+' : ''}${formatMoney(a.delta)}
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                                <tfoot>
                                    <tr style="background: #f8fafc; font-weight: 800; border-top: 2px solid #0f172a;">
                                        <td style="padding: 7px 8px; border: 1px solid #cbd5e1;">ИТОГО КАПИТАЛ:</td>
                                        <td style="padding: 7px 8px; border: 1px solid #cbd5e1; text-align: right;">${formatMoney(reportData.totalStartCap)}</td>
                                        <td style="padding: 7px 8px; border: 1px solid #cbd5e1; text-align: right; color: #059669;">+${formatMoney(reportData.totalInflow)}</td>
                                        <td style="padding: 7px 8px; border: 1px solid #cbd5e1; text-align: right; color: #dc2626;">-${formatMoney(reportData.totalOutflow)}</td>
                                        <td style="padding: 7px 8px; border: 1px solid #cbd5e1; text-align: right; color: #4f46e5;">+${formatMoney(reportData.totalYieldAccrued)}</td>
                                        <td style="padding: 7px 8px; border: 1px solid #cbd5e1; text-align: right; color: #4f46e5;">${formatMoney(reportData.totalEndCap)}</td>
                                        <td style="padding: 7px 8px; border: 1px solid #cbd5e1; text-align: right; color: ${reportData.capitalDelta >= 0 ? '#059669' : '#dc2626'};">
                                            ${reportData.capitalDelta >= 0 ? '+' : ''}${formatMoney(reportData.capitalDelta)} (${reportData.capitalDeltaPercent >= 0 ? '+' : ''}${reportData.capitalDeltaPercent.toFixed(1)}%)
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <!-- РАЗДЕЛ III: Структура расходов по категориям -->
                        <div style="margin-bottom: 22px;">
                            <div style="font-size: 12px; font-weight: 700; color: #0f172a; text-transform: uppercase; margin-bottom: 8px; border-left: 3px solid #4f46e5; padding-left: 8px;">
                                III. Распределение расходов по статьям
                            </div>
                            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                                <thead>
                                    <tr style="background: #f1f5f9; text-align: left;">
                                        <th style="padding: 5px 8px; border: 1px solid #cbd5e1;">Категория расходов</th>
                                        <th style="padding: 5px 8px; border: 1px solid #cbd5e1;">Тип статьи</th>
                                        <th style="padding: 5px 8px; border: 1px solid #cbd5e1; text-align: right;">Сумма (EUR)</th>
                                        <th style="padding: 5px 8px; border: 1px solid #cbd5e1; text-align: right;">Доля от всех трат</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${reportData.categories.map(c => `
                                        <tr>
                                            <td style="padding: 5px 8px; border: 1px solid #cbd5e1; font-weight: 600;">${c.icon} ${c.name}</td>
                                            <td style="padding: 5px 8px; border: 1px solid #cbd5e1; color: #64748b;">${c.typeName}</td>
                                            <td style="padding: 5px 8px; border: 1px solid #cbd5e1; text-align: right; font-weight: 600;">${formatMoney(c.amount)}</td>
                                            <td style="padding: 5px 8px; border: 1px solid #cbd5e1; text-align: right; color: #475569;">${c.percent}%</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>

                        <!-- РАЗДЕЛ IV: Реестр операций -->
                        <div>
                            <div style="font-size: 12px; font-weight: 700; color: #0f172a; text-transform: uppercase; margin-bottom: 8px; border-left: 3px solid #4f46e5; padding-left: 8px;">
                                IV. Детализированный реестр совершённых операций (${reportData.transactions.length} записей)
                            </div>
                            <table style="width: 100%; border-collapse: collapse; font-size: 10.5px;">
                                <thead>
                                    <tr style="background: #f1f5f9; text-align: left;">
                                        <th style="padding: 5px 6px; border: 1px solid #cbd5e1;">Дата (ГГГГ-ММ-ДД)</th>
                                        <th style="padding: 5px 6px; border: 1px solid #cbd5e1;">Категория / Статья</th>
                                        <th style="padding: 5px 6px; border: 1px solid #cbd5e1;">Счёт</th>
                                        <th style="padding: 5px 6px; border: 1px solid #cbd5e1;">Примечание</th>
                                        <th style="padding: 5px 6px; border: 1px solid #cbd5e1; text-align: right;">Сумма (EUR)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${reportData.transactions.map(t => `
                                        <tr>
                                            <td style="padding: 5px 6px; border: 1px solid #cbd5e1; white-space: nowrap; font-family: monospace;">${t.isoDate}</td>
                                            <td style="padding: 5px 6px; border: 1px solid #cbd5e1; font-weight: 600;">${t.icon} ${t.categoryName}</td>
                                            <td style="padding: 5px 6px; border: 1px solid #cbd5e1; color: #64748b;">${t.accountName}</td>
                                            <td style="padding: 5px 6px; border: 1px solid #cbd5e1; color: #475569;">${t.comment || '—'}</td>
                                            <td style="padding: 5px 6px; border: 1px solid #cbd5e1; text-align: right; font-weight: 700; color: ${t.isIncome ? '#059669' : '#1e293b'};">
                                                ${t.isIncome ? '+' : ''}${formatMoney(t.amount)}
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>

                    </div>
                </div>
            </div>
        `;

        modalOverlay.classList.add('visible');

        document.getElementById('btn-close-report-modal').onclick = () => {
            modalOverlay.classList.remove('visible');
        };

        document.getElementById('btn-print-report-now').onclick = () => {
            this.printDocument('printable-financial-report');
        };
    },

    /* --- Подготовка данных для финансового отчёта --- */

    prepareMonthlyReportData(monthStr, periodMode = 'month') {
        const generatedDateTime = this.formatDateTime(new Date());
        const months = this.getMonthsForPeriod(periodMode, monthStr);
        const startPeriodDate = `${months[0]}-01`;

        let docTitle = 'ФИНАНСОВЫЙ ОТЧЁТ';
        let docSubtitle = '';

        if (periodMode === 'year') {
            docTitle = 'ГОДОВОЙ ФИНАНСОВЫЙ ОТЧЁТ';
            docSubtitle = `За ${monthStr.slice(0, 4)} год`;
        } else if (periodMode === 'quarter') {
            docTitle = 'КВАРТАЛЬНЫЙ ФИНАНСОВЫЙ ОТЧЁТ';
            docSubtitle = `За 3 месяца (${months[0]} — ${months[months.length - 1]})`;
        } else if (periodMode === 'half_year') {
            docTitle = 'ПОЛУГОДОВОЙ ФИНАНСОВЫЙ ОТЧЁТ';
            docSubtitle = `За 6 месяцев (${months[0]} — ${months[months.length - 1]})`;
        } else if (periodMode === 'all') {
            docTitle = 'СВОДНЫЙ ФИНАНСОВЫЙ ОТЧЁТ';
            docSubtitle = 'За всё время ведения учёта';
        } else {
            const formattedMonth = (typeof DatePicker !== 'undefined' && DatePicker.formatMonth) ? DatePicker.formatMonth(monthStr) : monthStr;
            docTitle = 'ФИНАНСОВЫЙ ОТЧЁТ ЗА МЕСЯЦ';
            docSubtitle = `За ${formattedMonth} года`;
        }

        const allTx = (typeof Journal !== 'undefined' && Journal.getAll) ? (Journal.getAll() || []) : [];
        const periodTx = allTx.filter(t => t && t.date && months.some(m => t.date.startsWith(m)));

        const income = periodTx.filter(t => t.type === 'income').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
        const mandatory = periodTx.filter(t => t.type === 'expense' && t.expenseType === 'mandatory').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
        const current = periodTx.filter(t => t.type === 'expense' && t.expenseType === 'current').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);

        let sharedTransfers = 0;
        if (typeof Shared !== 'undefined' && Shared.getTransactions) {
            const sharedTxs = Shared.getTransactions() || [];
            sharedTransfers = sharedTxs
                .filter(t => t && t.type === 'my_deposit' && t.date && months.some(m => t.date.startsWith(m)))
                .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
        }

        let currencyTransfers = 0;
        if (typeof Currency !== 'undefined' && Currency.getTransactions) {
            const currTxs = Currency.getTransactions() || [];
            currencyTransfers = currTxs
                .filter(t => t && t.type === 'deposit' && t.date && months.some(m => t.date.startsWith(m)))
                .filter(t => t.sourceAccountId && t.sourceAccountId !== 'shared')
                .reduce((s, t) => s + (parseFloat(t.spentEur) || 0), 0);
        }

        const transfers = sharedTransfers + currencyTransfers;
        const totalExpenses = mandatory + current + transfers;
        const netSavings = income - totalExpenses;
        const savingsRate = income > 0 ? (netSavings / income) * 100 : 0;
        const expenseIncomeRatio = income > 0 ? Math.round((totalExpenses / income) * 100) : 0;

        const mandShare = totalExpenses > 0 ? Math.round((mandatory / totalExpenses) * 100) : 0;
        const currShare = totalExpenses > 0 ? Math.round((current / totalExpenses) * 100) : 0;
        const transfShare = totalExpenses > 0 ? Math.round((transfers / totalExpenses) * 100) : 0;

        // Данные по счетам
        const allAccounts = (typeof Accounts !== 'undefined' && Accounts.getAll) ? (Accounts.getAll() || []) : [];
        const allTransfers = (typeof Accounts !== 'undefined' && Accounts.getTransfers) ? (Accounts.getTransfers() || []) : [];
        const allShared = (typeof Shared !== 'undefined' && Shared.getTransactions) ? (Shared.getTransactions() || []) : [];
        const allCurrency = (typeof Currency !== 'undefined' && Currency.getTransactions) ? (Currency.getTransactions() || []) : [];

        const startMonthStr = months[0];
        const endMonthStr = months[months.length - 1];
        const [yEnd, mEnd] = endMonthStr.split('-').map(Number);
        const lastDayEnd = new Date(yEnd, mEnd, 0).getDate();
        const fullEndPeriodDate = `${endMonthStr}-${lastDayEnd < 10 ? '0' + lastDayEnd : lastDayEnd}`;

        let totalStartCap = 0;
        let totalEndCap = 0;
        let totalInflow = 0;
        let totalOutflow = 0;
        let totalYieldAccrued = 0;

        const accountsTable = allAccounts.map(a => {
            const initBal = a.initialBalance !== undefined ? a.initialBalance : (a.balance || 0);
            const yieldRate = parseFloat(a.yieldRate) || 0;

            const jStart = allTx.reduce((sum, t) => {
                if (t.accountId !== a.id || (t.date && t.date >= startPeriodDate)) return sum;
                return sum + (t.type === 'income' ? t.amount : -t.amount);
            }, 0);
            const trStart = allTransfers.reduce((sum, tr) => {
                if (tr.date && tr.date >= startPeriodDate) return sum;
                if (tr.toId === a.id) sum += tr.amount;
                if (tr.fromId === a.id) sum -= tr.amount;
                return sum;
            }, 0);
            const shStart = allShared.reduce((sum, t) => {
                if (t.type === 'my_deposit' && t.accountId === a.id && (!t.date || t.date < startPeriodDate)) return sum - (t.amount || 0);
                return sum;
            }, 0);
            const cuStart = allCurrency.reduce((sum, t) => {
                if (t.type === 'deposit' && t.sourceAccountId === a.id && (!t.date || t.date < startPeriodDate)) return sum - (parseFloat(t.spentEur) || 0);
                return sum;
            }, 0);

            const startDeposited = initBal + jStart + trStart + shStart + cuStart;
            const startBal = startDeposited + (yieldRate > 0 ? (startDeposited * (yieldRate / 100)) : 0);

            const inflow = periodTx.filter(t => t.accountId === a.id && t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0) +
                           allTransfers.filter(tr => tr.toId === a.id && tr.date && months.some(m => tr.date.startsWith(m))).reduce((s, tr) => s + tr.amount, 0);

            const outflow = periodTx.filter(t => t.accountId === a.id && t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0) +
                            allTransfers.filter(tr => tr.fromId === a.id && tr.date && months.some(m => tr.date.startsWith(m))).reduce((s, tr) => s + tr.amount, 0) +
                            allShared.filter(t => t.type === 'my_deposit' && t.accountId === a.id && t.date && months.some(m => t.date.startsWith(m))).reduce((s, t) => s + (t.amount || 0), 0) +
                            allCurrency.filter(t => t.type === 'deposit' && t.sourceAccountId === a.id && t.date && months.some(m => t.date.startsWith(m))).reduce((s, t) => s + (parseFloat(t.spentEur) || 0), 0);

            const jEnd = allTx.reduce((sum, t) => {
                if (t.accountId !== a.id || (t.date && t.date > fullEndPeriodDate)) return sum;
                return sum + (t.type === 'income' ? t.amount : -t.amount);
            }, 0);
            const trEnd = allTransfers.reduce((sum, tr) => {
                if (tr.date && tr.date > fullEndPeriodDate) return sum;
                if (tr.toId === a.id) sum += tr.amount;
                if (tr.fromId === a.id) sum -= tr.amount;
                return sum;
            }, 0);
            const shEnd = allShared.reduce((sum, t) => {
                if (t.type === 'my_deposit' && t.accountId === a.id && (!t.date || t.date <= fullEndPeriodDate)) return sum - (t.amount || 0);
                return sum;
            }, 0);
            const cuEnd = allCurrency.reduce((sum, t) => {
                if (t.type === 'deposit' && t.sourceAccountId === a.id && (!t.date || t.date <= fullEndPeriodDate)) return sum - (parseFloat(t.spentEur) || 0);
                return sum;
            }, 0);

            const endDeposited = initBal + jEnd + trEnd + shEnd + cuEnd;
            const endYield = yieldRate > 0 ? (endDeposited * (yieldRate / 100)) : 0;
            const endBal = endDeposited + endYield;
            const delta = endBal - startBal;

            totalStartCap += startBal;
            totalEndCap += endBal;
            totalInflow += inflow;
            totalOutflow += outflow;
            totalYieldAccrued += endYield;

            return {
                name: a.name,
                startBal,
                inflow,
                outflow,
                yieldText: yieldRate > 0 ? `+${yieldRate}% (+${formatMoney(endYield)})` : '—',
                endBal,
                delta
            };
        });

        const capitalDelta = totalEndCap - totalStartCap;
        const capitalDeltaPercent = totalStartCap > 0 ? (capitalDelta / totalStartCap) * 100 : 0;

        // Категории трат
        const allCats = (typeof Categories !== 'undefined' && Categories.getAll) ? Categories.getAll() : { mandatory: [], current: [] };
        const categories = [];

        const mandMap = {};
        periodTx.filter(t => t.type === 'expense' && t.expenseType === 'mandatory').forEach(t => {
            mandMap[t.categoryId] = (mandMap[t.categoryId] || 0) + (parseFloat(t.amount) || 0);
        });
        (allCats.mandatory || []).forEach(c => {
            if (mandMap[c.id] > 0) categories.push({ icon: '🔒', name: c.name, typeName: 'Обязательные', amount: mandMap[c.id], percent: Math.round((mandMap[c.id] / totalExpenses) * 100) });
        });

        const currMap = {};
        periodTx.filter(t => t.type === 'expense' && t.expenseType === 'current').forEach(t => {
            currMap[t.categoryId] = (currMap[t.categoryId] || 0) + (parseFloat(t.amount) || 0);
        });
        (allCats.current || []).forEach(c => {
            if (currMap[c.id] > 0) categories.push({ icon: '💳', name: c.name, typeName: 'Текущие', amount: currMap[c.id], percent: Math.round((currMap[c.id] / totalExpenses) * 100) });
        });

        if (sharedTransfers > 0) categories.push({ icon: '💰', name: 'Взнос в Общий счёт', typeName: 'Переводы', amount: sharedTransfers, percent: Math.round((sharedTransfers / totalExpenses) * 100) });
        if (currencyTransfers > 0) categories.push({ icon: '💰', name: 'Покупка валюты', typeName: 'Переводы', amount: currencyTransfers, percent: Math.round((currencyTransfers / totalExpenses) * 100) });

        categories.sort((a, b) => b.amount - a.amount);

        // Список всех операций (хронология, даты в формате YYYY-MM-DD)
        const transactions = periodTx.slice().sort((a, b) => (a.date || '').localeCompare(b.date || '')).map(t => {
            const isIncome = t.type === 'income';
            let catName = 'Доход';
            let icon = '📈';

            if (!isIncome) {
                icon = t.expenseType === 'mandatory' ? '🔒' : '💳';
                if (typeof Dashboard !== 'undefined' && Dashboard.getCategoryName) {
                    catName = Dashboard.getCategoryName('expense', t.expenseType, t.categoryId);
                } else {
                    catName = t.categoryId || 'Расход';
                }
            } else {
                if (typeof Dashboard !== 'undefined' && Dashboard.getCategoryName) {
                    catName = Dashboard.getCategoryName('income', null, t.categoryId);
                }
            }

            const accName = (typeof Accounts !== 'undefined' && Accounts.getById) ? (Accounts.getById(t.accountId)?.name || 'Счёт') : 'Счёт';

            return {
                isoDate: t.date || '',
                icon,
                categoryName: catName,
                accountName: accName,
                comment: t.comment || '',
                amount: t.amount,
                isIncome
            };
        });

        return {
            docTitle,
            docSubtitle,
            generatedDateTime,
            startPeriodDate,
            income,
            mandatory,
            current,
            transfers,
            totalExpenses,
            netSavings,
            savingsRate,
            expenseIncomeRatio,
            mandShare,
            currShare,
            transfShare,
            accountsTable,
            totalStartCap,
            totalEndCap,
            totalInflow,
            totalOutflow,
            totalYieldAccrued,
            capitalDelta,
            capitalDeltaPercent,
            categories,
            transactions
        };
    },

    /* --- Функция чистой изолированной печати (без теней и артефактов) --- */

    printDocument(elementId) {
        const elem = document.getElementById(elementId);
        if (!elem) return;

        const todayIso = new Date().toISOString().slice(0, 10);
        const docFileName = `${todayIso} Финансовый отчёт`;

        // Временно меняем заголовок главной страницы, чтобы PDF-принтер и браузер подставили нужное имя файла
        const originalTitle = document.title;
        document.title = docFileName;

        const printFrame = document.createElement('iframe');
        printFrame.style.position = 'fixed';
        printFrame.style.right = '0';
        printFrame.style.bottom = '0';
        printFrame.style.width = '0';
        printFrame.style.height = '0';
        printFrame.style.border = '0';
        document.body.appendChild(printFrame);

        const frameDoc = printFrame.contentWindow.document;
        frameDoc.open();
        frameDoc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>${docFileName}</title>
                <style>
                    @page {
                        size: A4 portrait;
                        margin: 12mm 15mm;
                    }
                    *, *::before, *::after {
                        box-shadow: none !important;
                        text-shadow: none !important;
                    }
                    body {
                        background: #ffffff !important;
                        color: #1e293b !important;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        font-size: 11px;
                        line-height: 1.4;
                        margin: 0;
                        padding: 0;
                    }
                    #printable-financial-report {
                        padding: 0 !important;
                        margin: 0 !important;
                        box-shadow: none !important;
                        border: none !important;
                        border-radius: 0 !important;
                        max-width: 100% !important;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                    }
                    th, td {
                        border: 1px solid #cbd5e1;
                    }
                    tr {
                        page-break-inside: avoid;
                    }
                </style>
            </head>
            <body>
                ${elem.outerHTML}
            </body>
            </html>
        `);
        frameDoc.close();

        setTimeout(() => {
            printFrame.contentWindow.focus();
            printFrame.contentWindow.print();
            setTimeout(() => {
                document.body.removeChild(printFrame);
                document.title = originalTitle;
            }, 3000);
        }, 350);
    }
};
