/* ===========================================
   Storage — модуль хранилища и облачной синхронизации Supabase (v3.0)
   =========================================== */

const Storage = {
    PREFIX: 'budget_',
    
    // Настройки облачной базы данных Supabase
    SUPABASE_URL: 'https://nxjnfbvhtxovyoiysokl.supabase.co',
    SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54am5mYnZodHhvdnlvaXlzb2tsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3OTI3NDEsImV4cCI6MjEwMjM2ODc0MX0.P3Wwqlxz7j6ACbGGeCJCbgQPPzVAHpdP0RWAYaS_GpI',
    TABLE_NAME: 'budget_sync',
    ROW_ID: 'family_main',

    client: null,
    realtimeChannel: null,
    lastPushedTimestamp: null,

    ALL_KEYS: [
        'accounts',
        'transfers',
        'categories',
        'journal_transactions',
        'journal_budget_settings',
        'shared_transactions',
        'shared_categories',
        'shared_initial_balance',
        'currency_accounts',
        'currency_transactions',
        'active_currency_account',
        'toyota_data'
    ],

    /* --- Инициализация Supabase и Realtime --- */

    init() {
        try {
            if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
                this.client = window.supabase.createClient(this.SUPABASE_URL, this.SUPABASE_KEY);
                this.initRealtime();
                this.pullFromCloud(true);
            } else {
                console.warn('Supabase SDK not loaded yet. Retrying in 1s.');
                setTimeout(() => this.init(), 1000);
            }
        } catch (err) {
            console.error('Storage.init error:', err);
            this.updateCloudStatusUI('🟡 Офлайн');
        }
    },

    initRealtime() {
        if (!this.client) return;

        try {
            this.realtimeChannel = this.client
                .channel('budget_realtime_channel')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: this.TABLE_NAME
                }, (payload) => {
                    const row = payload.new;
                    if (row && row.id === this.ROW_ID && row.payload && row.payload.data) {
                        // Игнорируем эхо собственного недавнего пуша
                        if (row.payload.syncedAt && row.payload.syncedAt === this.lastPushedTimestamp) {
                            return;
                        }

                        const localSyncedAt = localStorage.getItem('budget_last_synced_at') || '';
                        if (!row.payload.syncedAt || row.payload.syncedAt > localSyncedAt) {
                            this.importBundle(row.payload, true);
                            localStorage.setItem('budget_last_synced_at', row.payload.syncedAt || new Date().toISOString());
                            
                            if (typeof App !== 'undefined' && App.renderPage) {
                                App.renderPage();
                            }
                            this.showSyncToast('Облако: данные обновлены ☁️');
                            this.updateCloudStatusUI('🟢 Онлайн');
                        }
                    }
                })
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        this.updateCloudStatusUI('🟢 Онлайн');
                    } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                        this.updateCloudStatusUI('🟡 Офлайн');
                    }
                });
        } catch (e) {
            console.warn('Realtime subscription error:', e);
        }
    },

    /* --- Локальные операции (Local Storage) --- */

    get(key) {
        try {
            const data = localStorage.getItem(this.PREFIX + key);
            return data ? JSON.parse(data) : null;
        } catch {
            return null;
        }
    },

    set(key, value) {
        try {
            localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
            this.autoSyncBackground();
            return true;
        } catch {
            return false;
        }
    },

    remove(key) {
        localStorage.removeItem(this.PREFIX + key);
        this.autoSyncBackground();
    },

    clear() {
        const keys = Object.keys(localStorage).filter(k => k.startsWith(this.PREFIX));
        keys.forEach(k => localStorage.removeItem(k));
    },

    /* --- Экспорт и Импорт пакета данных --- */

    exportBundle() {
        const bundle = {
            version: '2.0',
            syncedAt: new Date().toISOString(),
            data: {}
        };
        this.ALL_KEYS.forEach(key => {
            bundle.data[key] = this.get(key);
        });
        return bundle;
    },

    importBundle(bundle, silent = false) {
        if (!bundle || !bundle.data) return false;
        this.ALL_KEYS.forEach(key => {
            if (bundle.data[key] !== undefined && bundle.data[key] !== null) {
                localStorage.setItem(this.PREFIX + key, JSON.stringify(bundle.data[key]));
            }
        });
        return true;
    },

    /* --- Фоновая авто-синхронизация с базой данных --- */

    autoSyncTimer: null,
    autoSyncBackground() {
        if (this.autoSyncTimer) clearTimeout(this.autoSyncTimer);
        this.autoSyncTimer = setTimeout(() => {
            this.pushToCloud(true);
        }, 800);
    },

    /* --- Облачный обмен с Supabase (Push & Pull) --- */

    async pushToCloud(silent = false) {
        try {
            const bundle = this.exportBundle();
            this.lastPushedTimestamp = bundle.syncedAt;

            // 1. Попытка через Supabase JS Client
            if (this.client) {
                const { error } = await this.client
                    .from(this.TABLE_NAME)
                    .upsert({
                        id: this.ROW_ID,
                        payload: bundle,
                        updated_at: new Date().toISOString()
                    });

                if (!error) {
                    localStorage.setItem('budget_last_synced_at', bundle.syncedAt);
                    this.updateCloudStatusUI('🟢 Онлайн');
                    return { success: true };
                }
            }

            // 2. Запасной прямой REST-запрос через fetch
            const response = await fetch(`${this.SUPABASE_URL}/rest/v1/${this.TABLE_NAME}`, {
                method: 'POST',
                headers: {
                    'apikey': this.SUPABASE_KEY,
                    'Authorization': `Bearer ${this.SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'resolution=merge-duplicates'
                },
                body: JSON.stringify({
                    id: this.ROW_ID,
                    payload: bundle,
                    updated_at: new Date().toISOString()
                })
            });

            if (response.ok || response.status === 201 || response.status === 200) {
                localStorage.setItem('budget_last_synced_at', bundle.syncedAt);
                this.updateCloudStatusUI('🟢 Онлайн');
                return { success: true };
            }
        } catch (err) {
            console.warn('Supabase push error:', err);
            this.updateCloudStatusUI('🟡 Офлайн');
        }
        return { success: false };
    },

    async pullFromCloud(silent = false) {
        try {
            let bundle = null;

            // 1. Попытка через Supabase JS Client
            if (this.client) {
                const { data, error } = await this.client
                    .from(this.TABLE_NAME)
                    .select('payload, updated_at')
                    .eq('id', this.ROW_ID)
                    .single();

                if (!error && data && data.payload) {
                    bundle = data.payload;
                }
            }

            // 2. Запасной прямой REST-запрос
            if (!bundle) {
                const response = await fetch(`${this.SUPABASE_URL}/rest/v1/${this.TABLE_NAME}?id=eq.${this.ROW_ID}&select=payload,updated_at`, {
                    headers: {
                        'apikey': this.SUPABASE_KEY,
                        'Authorization': `Bearer ${this.SUPABASE_KEY}`
                    }
                });
                if (response.ok) {
                    const rows = await response.json();
                    if (rows && rows.length > 0 && rows[0].payload) {
                        bundle = rows[0].payload;
                    }
                }
            }

            if (bundle && bundle.data) {
                // Проверяем, есть ли данные в облаке
                const hasCloudData = bundle.data.accounts && bundle.data.accounts.length > 0;
                const hasLocalData = this.get('accounts') && this.get('accounts').length > 0;

                if (!hasCloudData && hasLocalData) {
                    // В облаке пусто, а локально есть данные — выгружаем в облако
                    await this.pushToCloud(true);
                } else if (hasCloudData) {
                    this.importBundle(bundle, true);
                    localStorage.setItem('budget_last_synced_at', bundle.syncedAt || new Date().toISOString());
                    if (typeof App !== 'undefined' && App.renderPage) {
                        App.renderPage();
                    }
                }
                this.updateCloudStatusUI('🟢 Онлайн');
                return { success: true };
            } else {
                // Записи ещё нет — пушим текущие локальные данные
                await this.pushToCloud(true);
                this.updateCloudStatusUI('🟢 Онлайн');
                return { success: true };
            }
        } catch (err) {
            console.warn('Supabase pull error:', err);
            this.updateCloudStatusUI('🟡 Офлайн');
        }
        return { success: false };
    },

    updateCloudStatusUI(text) {
        if (typeof document !== 'undefined') {
            const el = document.getElementById('sidebar-cloud-status');
            if (el) el.textContent = text;
        }
    },

    showSyncToast(message) {
        let toast = document.getElementById('sync-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'sync-toast';
            toast.className = 'sync-toast';
            document.body.appendChild(toast);
        }
        toast.innerHTML = message;
        toast.classList.add('visible');
        setTimeout(() => {
            toast.classList.remove('visible');
        }, 2500);
    },

    /* --- Текстовый код синхронизации (Запасной вариант) --- */

    exportCodeString() {
        const bundle = this.exportBundle();
        const jsonStr = JSON.stringify(bundle);
        return 'BDGT_' + btoa(unescape(encodeURIComponent(jsonStr)));
    },

    importCodeString(codeStr) {
        if (!codeStr) return false;
        try {
            let cleanStr = codeStr.trim();
            if (cleanStr.startsWith('BDGT_')) cleanStr = cleanStr.slice(5);
            const jsonStr = decodeURIComponent(escape(atob(cleanStr)));
            const bundle = JSON.parse(jsonStr);
            const res = this.importBundle(bundle);
            if (res) this.pushToCloud(true);
            return res;
        } catch (e) {
            console.error('Import code error:', e);
            return false;
        }
    },

    /* --- Файловый Резервный Архив (.json) --- */

    downloadBackupFile() {
        const bundle = this.exportBundle();
        const dateStr = new Date().toISOString().slice(0, 10);
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(bundle, null, 2));
        const dlAnchor = document.createElement('a');
        dlAnchor.setAttribute("href", dataStr);
        dlAnchor.setAttribute("download", `budget_backup_${dateStr}.json`);
        document.body.appendChild(dlAnchor);
        dlAnchor.click();
        dlAnchor.remove();
    },

    restoreFromBackupFile(fileInputEl) {
        const file = fileInputEl.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const bundle = JSON.parse(e.target.result);
                if (this.importBundle(bundle)) {
                    this.pushToCloud(true);
                    alert('✅ Данные успешно восстановлены из файла и сохранены в облако!');
                    if (typeof App !== 'undefined' && App.renderPage) App.renderPage();
                } else {
                    alert('❌ Ошибка формата файла!');
                }
            } catch (err) {
                alert('❌ Ошибка чтения файла: ' + err.message);
            }
        };
        reader.readAsText(file);
    },

    /* --- Модальное окно синхронизации --- */

    showSyncModal() {
        const lastSync = localStorage.getItem('budget_last_synced_at');
        const lastSyncText = lastSync ? new Date(lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'нет';

        App.showModal('☁️ Облачная база данных (Supabase)', `
            <div style="margin-bottom: 20px;">
                <div id="sync-notice-banner" style="display:none; padding:12px; border-radius:var(--radius); margin-bottom:16px; font-weight:600; font-size:13px;"></div>

                <!-- Статус базы данных -->
                <div style="background: var(--bg-card); padding: 14px; border-radius: var(--radius); border: 1px solid var(--accent-start); margin-bottom: 16px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <span style="font-size: 13px; font-weight:700; color:var(--text-primary);">Статус подключения:</span>
                        <span style="font-size: 12px; font-weight:600; color:var(--color-success);">🟢 База данных активна</span>
                    </div>
                    <div style="font-size: 11px; color: var(--text-muted); line-height: 1.5; margin-bottom: 12px;">
                        Все изменения (расходы, взносы, валюты) мгновенно синхронизируются в реальном времени между всеми устройствами семьи.
                    </div>
                    <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 12px;">
                        Последняя синхронизация: <strong>${lastSyncText}</strong>
                    </div>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px;">
                        <button class="btn btn-primary btn-sm" id="btn-cloud-push" style="justify-content:center;">📤 Отправить в базу</button>
                        <button class="btn btn-secondary btn-sm" id="btn-cloud-pull" style="justify-content:center;">📥 Загрузить из базы</button>
                    </div>
                </div>

                <!-- Резервные копии -->
                <div style="background: var(--bg-card); padding: 14px; border-radius: var(--radius); border: 1px solid var(--border-subtle); margin-bottom: 16px;">
                    <div style="font-size: 12px; font-weight:600; margin-bottom: 8px;">💾 Резервная копия на диске (.json):</div>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <button class="btn btn-secondary btn-sm" id="btn-download-json">Скачать .json файл</button>
                        <label class="btn btn-secondary btn-sm" style="cursor:pointer; margin:0;">
                            Загрузить .json файл
                            <input type="file" id="input-restore-json" accept=".json" style="display:none;">
                        </label>
                    </div>
                </div>

                <!-- Запасной перенос кодом -->
                <div style="border-top: 1px solid var(--border-subtle); padding-top: 12px;">
                    <div style="font-size: 12px; font-weight:600; margin-bottom: 6px;">📋 Перенос через код (offline):</div>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <button class="btn btn-secondary btn-sm" id="btn-copy-code-str">Скопировать код</button>
                        <button class="btn btn-secondary btn-sm" id="btn-paste-code-str">Вставить код</button>
                    </div>
                </div>
            </div>

            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Закрыть</button>
            </div>
        `);

        const banner = document.getElementById('sync-notice-banner');
        const showNotice = (msg, isSuccess = true) => {
            if (!banner) return;
            banner.style.display = 'block';
            banner.style.background = isSuccess ? 'rgba(46, 213, 115, 0.15)' : 'rgba(255, 71, 87, 0.15)';
            banner.style.border = isSuccess ? '1px solid var(--color-success)' : '1px solid var(--color-danger)';
            banner.style.color = isSuccess ? 'var(--color-success)' : 'var(--color-danger)';
            banner.innerHTML = msg;
        };

        document.getElementById('btn-cloud-push')?.addEventListener('click', async () => {
            showNotice('⏳ Отправка данных в Supabase...');
            const res = await this.pushToCloud(false);
            if (res.success) {
                showNotice('✅ Данные успешно сохранены в облачную базу данных!');
            } else {
                showNotice('❌ Ошибка отправки в базу. Проверьте интернет-соединение.', false);
            }
        });

        document.getElementById('btn-cloud-pull')?.addEventListener('click', async () => {
            showNotice('⏳ Загрузка данных из Supabase...');
            const res = await this.pullFromCloud(false);
            if (res.success) {
                showNotice('✅ Данные успешно получены и применены!');
            } else {
                showNotice('❌ Не удалось получить данные из базы.', false);
            }
        });

        document.getElementById('btn-download-json')?.addEventListener('click', () => {
            this.downloadBackupFile();
        });

        document.getElementById('input-restore-json')?.addEventListener('change', (e) => {
            this.restoreFromBackupFile(e.target);
        });

        document.getElementById('btn-copy-code-str')?.addEventListener('click', () => {
            const code = this.exportCodeString();
            navigator.clipboard.writeText(code).then(() => {
                showNotice('📋 Код скопирован в буфер обмена!');
            }).catch(() => {
                prompt('Скопируйте этот код:', code);
            });
        });

        document.getElementById('btn-paste-code-str')?.addEventListener('click', () => {
            const code = prompt('Вставьте скопированный код данных (BDGT_...):');
            if (code) {
                if (this.importCodeString(code)) {
                    showNotice('✅ Данные успешно импортированы и сохранены в облаке!');
                    if (typeof App !== 'undefined' && App.renderPage) App.renderPage();
                } else {
                    showNotice('❌ Неверный код данных.', false);
                }
            }
        });
    }
};
