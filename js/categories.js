/* ===========================================
   Categories — Категории доходов и расходов
   =========================================== */

const Categories = {
    STORAGE_KEY: 'categories',

    DEFAULTS: {
        mandatory: [
            { name: 'Аренда и коммунальные' },
            { name: 'Связь' },
            { name: 'Подписки' },
            { name: 'Пенсионные накопления' },
            { name: 'Общий счёт (взнос)' },
            { name: 'Лизинг Toyota' },
        ],
        current: [
            { name: 'Продукты' },
            { name: 'Транспорт' },
            { name: 'Здоровье' },
            { name: 'Одежда и обувь' },
            { name: 'Кафе и рестораны' },
            { name: 'Бытовые товары' },
            { name: 'Подарки' },
            { name: 'Поездки' },
            { name: 'Прочие' },
        ],
        income: [
            { name: 'Зарплата' },
            { name: 'Фриланс' },
            { name: 'Возврат' },
            { name: 'Прочее' },
        ]
    },

    init() {
        let cats = Storage.get(this.STORAGE_KEY);
        if (!cats) {
            cats = {
                mandatory: this.DEFAULTS.mandatory.map(c => ({ id: generateId(), name: c.name })),
                current:   this.DEFAULTS.current.map(c => ({ id: generateId(), name: c.name })),
                income:    this.DEFAULTS.income.map(c => ({ id: generateId(), name: c.name }))
            };
            Storage.set(this.STORAGE_KEY, cats);
        } else {
            // Ensure income section exists for existing storage
            if (!cats.income) {
                cats.income = this.DEFAULTS.income.map(c => ({ id: generateId(), name: c.name }));
                Storage.set(this.STORAGE_KEY, cats);
            }
        }
    },

    getAll() {
        const cats = Storage.get(this.STORAGE_KEY) || {};
        return { mandatory: [], current: [], income: [], ...cats };
    },

    save(cats) {
        Storage.set(this.STORAGE_KEY, cats);
    },

    categoryName(type, expenseType, catId) {
        const cats = this.getAll();
        let list = [];
        if (type === 'income') list = cats.income || [];
        else if (expenseType === 'mandatory') list = cats.mandatory || [];
        else list = cats.current || [];
        const item = list.find(c => c.id === catId);
        return item ? item.name : '(неизвестно)';
    },

    add(section, data) {
        const cats = this.getAll();
        cats[section].push({ id: generateId(), name: data.name });
        this.save(cats);
    },

    update(section, id, data) {
        const cats = this.getAll();
        const cat = (cats[section] || []).find(c => c.id === id);
        if (cat) {
            cat.name = data.name;
            this.save(cats);
        }
    },

    remove(section, id) {
        const cats = this.getAll();
        cats[section] = (cats[section] || []).filter(c => c.id !== id);
        this.save(cats);
    },

    /* --- Рендеринг --- */

    render() {
        const cats = this.getAll();
        const currentMonth = (typeof App !== 'undefined' && App.currentMonth) ? App.currentMonth : new Date().toISOString().slice(0, 7);
        const monthTx = (typeof Journal !== 'undefined' && Journal.getAll) 
            ? Journal.getAll().filter(t => t && t.date && t.date.startsWith(currentMonth)) 
            : [];

        // Карта сумм по категориям за текущий месяц
        const catSumMap = {};
        monthTx.forEach(t => {
            if (t.categoryId) {
                catSumMap[t.categoryId] = (catSumMap[t.categoryId] || 0) + (parseFloat(t.amount) || 0);
            }
        });

        // Итоги по группам за текущий месяц
        const totalMandatory = monthTx.filter(t => t.type === 'expense' && t.expenseType === 'mandatory').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
        const totalCurrent = monthTx.filter(t => t.type === 'expense' && t.expenseType === 'current').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
        const totalIncome = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);

        return `<div class="categories-grid">
            ${this.renderSection('mandatory', '🔒 Обязательные расходы', cats.mandatory, catSumMap, totalMandatory)}
            ${this.renderSection('current',   '💳 Текущие расходы',      cats.current,   catSumMap, totalCurrent)}
            ${this.renderSection('income',    '💰 Категории доходов',    cats.income,    catSumMap, totalIncome)}
        </div>`;
    },

    renderSection(section, title, items = [], catSumMap = {}, sectionTotal = 0) {
        return `
            <div class="category-section">
                <div class="section-header">
                    <h2 class="section-title">${title}</h2>
                </div>
                <div class="category-list">
                    ${items.length === 0 ? '<div class="list-empty">Нет категорий</div>' : ''}
                    ${items.map(c => {
                        const sum = catSumMap[c.id] || 0;
                        const percent = sectionTotal > 0 ? Math.round((sum / sectionTotal) * 100) : 0;
                        return `
                        <div class="category-item">
                            <div style="display:flex; align-items:baseline; gap:6px; flex-wrap:wrap; flex:1;">
                                <span class="category-name">${c.name}</span>
                                <span style="font-size:12px; color:var(--text-muted);">— ${formatMoney(sum)} (${percent}%)</span>
                            </div>
                            <div class="card-actions">
                                <button class="btn-icon" data-action="edit-cat" data-section="${section}" data-id="${c.id}">✏️</button>
                                <button class="btn-icon" data-action="delete-cat" data-section="${section}" data-id="${c.id}">🗑️</button>
                            </div>
                        </div>`;
                    }).join('')}
                </div>
                <button class="btn btn-secondary btn-block" data-action="add-cat" data-section="${section}">+ Добавить категорию</button>
            </div>`;
    },

    afterRender() {
        document.getElementById('content').addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const { action, section, id } = btn.dataset;

            switch (action) {
                case 'add-cat':  this.showModal(section); break;
                case 'edit-cat': this.showModal(section, id); break;
                case 'delete-cat':
                    const cat = (this.getAll()[section] || []).find(c => c.id === id);
                    if (cat) {
                        App.showConfirm(`Удалить «${cat.name}»?`, () => { this.remove(section, id); App.renderPage(); });
                    }
                    break;
            }
        });
    },

    showModal(section, editId = null) {
        const cat = editId ? (this.getAll()[section] || []).find(c => c.id === editId) : null;

        App.showModal(cat ? 'Редактировать категорию' : 'Новая категория', `
            <form id="modal-form">
                <div class="form-group">
                    <label class="form-label">Название</label>
                    <input type="text" class="form-input" name="name" value="${cat?.name || ''}" placeholder="Введите название..." required autocomplete="off">
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
            if (editId) this.update(section, editId, { name });
            else this.add(section, { name });
            App.closeModal();
            App.renderPage();
        });
    }
};
