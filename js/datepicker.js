/* ===========================================
   DatePicker — Кастомный тёмный календарь
   =========================================== */

const DatePicker = {
    activeInput: null,
    pickerEl: null,
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(),
    selectedDateStr: '',

    MONTH_NAMES: [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ],
    WEEKDAY_NAMES: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],

    init() {
        if (typeof document !== 'undefined') {
            document.addEventListener('click', (e) => {
                if (this.pickerEl && !this.pickerEl.contains(e.target) && this.activeInput && !this.activeInput.contains(e.target)) {
                    this.close();
                }
            });
        }
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
    }
};
