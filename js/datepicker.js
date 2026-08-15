/* ===========================================
   DatePicker — Кастомный тёмный календарь и Month/Year Picker
   =========================================== */

const DatePicker = {
    activeInput: null,
    pickerEl: null,
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(),
    selectedDateStr: '',

    // Для выбора месяца и года
    monthPickerEl: null,
    monthPickerYear: new Date().getFullYear(),
    monthPickerSelected: '', // "YYYY-MM"
    monthPickerCallback: null,

    MONTH_NAMES: [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ],
    MONTH_NAMES_SHORT: [
        'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
        'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'
    ],
    WEEKDAY_NAMES: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],

    init() {
        if (typeof document !== 'undefined') {
            document.addEventListener('click', (e) => {
                if (this.pickerEl && !this.pickerEl.contains(e.target) && this.activeInput && !this.activeInput.contains(e.target)) {
                    this.close();
                }
                if (this.monthPickerEl && !this.monthPickerEl.contains(e.target) && !e.target.closest('#btn-global-month-picker')) {
                    this.closeMonthPicker();
                }
            });
        }
    },

    formatMonth(yearMonthStr) {
        if (!yearMonthStr) return '';
        const [y, m] = yearMonthStr.split('-').map(Number);
        const name = this.MONTH_NAMES[m - 1] || '';
        return `${name} ${y}`;
    },

    attach(inputEl) {
        if (!inputEl) return;
        inputEl.readOnly = true;
        inputEl.style.cursor = 'pointer';
        
        inputEl.addEventListener('click', (e) => {
            e.stopPropagation();
            this.open(inputEl);
        });
    },

    attachAll(container = document) {
        const inputs = container.querySelectorAll('input[type="date"]');
        inputs.forEach(input => this.attach(input));
    },

    open(inputEl) {
        this.activeInput = inputEl;
        let val = inputEl.value;
        let d = val ? new Date(val) : new Date();
        if (isNaN(d.getTime())) d = new Date();

        this.currentYear = d.getFullYear();
        this.currentMonth = d.getMonth();
        this.selectedDateStr = val;

        this.render();
    },

    close() {
        if (this.pickerEl) {
            this.pickerEl.remove();
            this.pickerEl = null;
        }
        this.activeInput = null;
    },

    render() {
        if (!this.pickerEl) {
            this.pickerEl = document.createElement('div');
            this.pickerEl.className = 'custom-datepicker-popover';
            document.body.appendChild(this.pickerEl);
        }

        const rect = this.activeInput.getBoundingClientRect();
        this.pickerEl.style.top = `${rect.bottom + window.scrollY + 6}px`;
        this.pickerEl.style.left = `${rect.left + window.scrollX}px`;

        const year = this.currentYear;
        const month = this.currentMonth;

        const firstDayOfMonth = new Date(year, month, 1);
        let dayOfWeek = firstDayOfMonth.getDay(); // 0:Sun, 1:Mon ... 6:Sat
        let startOffset = (dayOfWeek === 0 ? 6 : dayOfWeek - 1);

        const prevMonthLastDate = new Date(year, month, 0).getDate();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        let daysHTML = '';

        // Дни предыдущего месяца (приглушенные)
        for (let i = startOffset - 1; i >= 0; i--) {
            const pDay = prevMonthLastDate - i;
            daysHTML += `<div class="dp-day dp-day-other-month">${pDay}</div>`;
        }

        // Дни текущего месяца (яркие)
        const todayStr = new Date().toISOString().slice(0, 10);
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === this.selectedDateStr;

            daysHTML += `
                <div class="dp-day ${isToday ? 'dp-day-today' : ''} ${isSelected ? 'dp-day-selected' : ''}" data-date="${dateStr}">
                    ${d}
                </div>
            `;
        }

        // Дни следующего месяца (приглушенные)
        const totalCellsSoFar = startOffset + daysInMonth;
        const totalCells = totalCellsSoFar > 35 ? 42 : 35;
        const nextMonthDays = totalCells - totalCellsSoFar;
        for (let n = 1; n <= nextMonthDays; n++) {
            daysHTML += `<div class="dp-day dp-day-other-month">${n}</div>`;
        }

        this.pickerEl.innerHTML = `
            <div class="dp-header">
                <button type="button" class="dp-btn" id="dp-prev-month">‹</button>
                <div class="dp-title">${this.MONTH_NAMES[month]} ${year}</div>
                <button type="button" class="dp-btn" id="dp-next-month">›</button>
            </div>
            <div class="dp-weekdays">
                ${this.WEEKDAY_NAMES.map((w, idx) => `<div class="dp-weekday ${idx >= 5 ? 'dp-weekend' : ''}">${w}</div>`).join('')}
            </div>
            <div class="dp-days-grid">
                ${daysHTML}
            </div>
        `;

        this.pickerEl.querySelector('#dp-prev-month').addEventListener('click', (e) => {
            e.stopPropagation();
            this.currentMonth--;
            if (this.currentMonth < 0) {
                this.currentMonth = 11;
                this.currentYear--;
            }
            this.render();
        });

        this.pickerEl.querySelector('#dp-next-month').addEventListener('click', (e) => {
            e.stopPropagation();
            this.currentMonth++;
            if (this.currentMonth > 11) {
                this.currentMonth = 0;
                this.currentYear++;
            }
            this.render();
        });

        this.pickerEl.querySelectorAll('.dp-day[data-date]').forEach(cell => {
            cell.addEventListener('click', (e) => {
                e.stopPropagation();
                const selDate = cell.dataset.date;
                if (this.activeInput) {
                    this.activeInput.value = selDate;
                    this.activeInput.dispatchEvent(new Event('change', { bubbles: true }));
                    this.activeInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
                this.close();
            });
        });
    },

    /* --- Month/Year Picker Popover --- */

    openMonthPicker(anchorEl, currentYearMonth, onSelect) {
        this.close();
        this.closeMonthPicker();

        const [y, m] = (currentYearMonth || new Date().toISOString().slice(0, 7)).split('-').map(Number);
        this.monthPickerYear = y || new Date().getFullYear();
        this.monthPickerSelected = currentYearMonth || new Date().toISOString().slice(0, 7);
        this.monthPickerCallback = onSelect;

        this.renderMonthPicker(anchorEl);
    },

    closeMonthPicker() {
        if (this.monthPickerEl) {
            this.monthPickerEl.remove();
            this.monthPickerEl = null;
        }
        this.monthPickerCallback = null;
    },

    renderMonthPicker(anchorEl) {
        if (!this.monthPickerEl) {
            this.monthPickerEl = document.createElement('div');
            this.monthPickerEl.className = 'custom-monthpicker-popover';
            document.body.appendChild(this.monthPickerEl);
        }

        if (anchorEl) {
            const rect = anchorEl.getBoundingClientRect();
            this.monthPickerEl.style.top = `${rect.bottom + window.scrollY + 6}px`;
            this.monthPickerEl.style.left = `${rect.left + window.scrollX}px`;
        }

        const year = this.monthPickerYear;
        const currentActualMonth = new Date().toISOString().slice(0, 7);

        let gridHTML = '';
        for (let m = 0; m < 12; m++) {
            const mNum = String(m + 1).padStart(2, '0');
            const ymStr = `${year}-${mNum}`;
            const isSelected = ymStr === this.monthPickerSelected;
            const isActualCurrent = ymStr === currentActualMonth;

            gridHTML += `
                <button type="button" class="mp-month-btn ${isSelected ? 'active' : ''} ${isActualCurrent ? 'actual-current' : ''}" data-ym="${ymStr}">
                    ${this.MONTH_NAMES_SHORT[m]}
                </button>
            `;
        }

        this.monthPickerEl.innerHTML = `
            <div class="mp-header">
                <button type="button" class="mp-btn" id="mp-prev-year">‹</button>
                <div class="mp-title">${year}</div>
                <button type="button" class="mp-btn" id="mp-next-year">›</button>
            </div>
            <div class="mp-months-grid">
                ${gridHTML}
            </div>
            <div class="mp-footer">
                <button type="button" class="btn btn-secondary btn-sm btn-block" id="mp-btn-today" style="font-size:11px; justify-content:center;">
                    ⭐ Текущий месяц (${this.formatMonth(currentActualMonth)})
                </button>
            </div>
        `;

        this.monthPickerEl.querySelector('#mp-prev-year').addEventListener('click', (e) => {
            e.stopPropagation();
            this.monthPickerYear--;
            this.renderMonthPicker(anchorEl);
        });

        this.monthPickerEl.querySelector('#mp-next-year').addEventListener('click', (e) => {
            e.stopPropagation();
            this.monthPickerYear++;
            this.renderMonthPicker(anchorEl);
        });

        this.monthPickerEl.querySelector('#mp-btn-today').addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.monthPickerCallback) {
                this.monthPickerCallback(currentActualMonth);
            }
            this.closeMonthPicker();
        });

        this.monthPickerEl.querySelectorAll('.mp-month-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const ym = btn.dataset.ym;
                if (this.monthPickerCallback) {
                    this.monthPickerCallback(ym);
                }
                this.closeMonthPicker();
            });
        });
    }
};
