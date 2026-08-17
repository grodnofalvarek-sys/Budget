/* ===========================================
   Storage — модуль хранилища и облачной синхронизации Supabase (v3.5 с защитой Anti-Wipe)
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
    isCloudReady: false,
    isPulling: false,
    isPushing: false,

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

    async init() {
        try {
            if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
                this.client = window.supabase.createClient(this.SUPABASE_URL, this.SUPABASE_KEY);
                this.initRealtime();
                await this.pullFromCloud(true);
            } else {
                console.warn('Supabase SDK not loaded yet. Retrying in 1s.');
                setTimeout(() => this.init(), 1000);
            }
        } catch (err) {
            console.error('Storage.init error:', err);
            this.isCloudReady = true;
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
            version: '3.5',
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
        try {
            localStorage.setItem('budget_emergency_backup', JSON.stringify(bundle));
        } catch (e) {}
        return true;
    },

    /* --- Фоновая авто-синхронизация с базой данных --- */

    autoSyncTimer: null,
    autoSyncBackground() {
        if (!this.isCloudReady) {
            return;
        }
        if (this.autoSyncTimer) clearTimeout(this.autoSyncTimer);
        this.autoSyncTimer = setTimeout(() => {
            this.pushToCloud(true);
        }, 1000);
    },

    /* --- Облачный обмен с Supabase (Push & Pull) с защитой от затирания --- */

    async pushToCloud(silent = false) {
        if (this.isPushing) return { success: false };
        this.isPushing = true;

        try {
            const bundle = this.exportBundle();
            
            const localTxCount = (bundle.data.journal_transactions || []).length +
                                 (bundle.data.shared_transactions || []).length +
                                 (bundle.data.currency_transactions || []).length;
            
            const lastKnownCloudTxCount = parseInt(localStorage.getItem('budget_known_cloud_tx_count') || '0', 10);

            if (localTxCount === 0 && lastKnownCloudTxCount > 0 && !silent) {
                console.error('CRITICAL: Blocked attempt to overwrite non-empty cloud database with 0 transactions!');
                this.showSyncToast('⚠️ Заблокирована попытка затереть облако');
                return { success: false, reason: 'anti_wipe_blocked' };
            }

            this.lastPushedTimestamp = bundle.syncedAt;

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
                    localStorage.setItem('budget_known_cloud_tx_count', String(localTxCount));
                    this.updateCloudStatusUI('🟢 Онлайн');
                    if (!silent) this.showSyncToast('Данные успешно выгружены в облако ☁️');
                    return { success: true };
                }
            }

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
                localStorage.setItem('budget_known_cloud_tx_count', String(localTxCount));
                this.updateCloudStatusUI('🟢 Онлайн');
                if (!silent) this.showSyncToast('Данные успешно выгружены в облако ☁️');
                return { success: true };
            }
        } catch (err) {
            console.warn('Supabase push error:', err);
            this.updateCloudStatusUI('🟡 Офлайн');
        } finally {
            this.isPushing = false;
        }
        return { success: false };
    },

    async pullFromCloud(silent = false) {
        if (this.isPulling) return { success: false };
        this.isPulling = true;

        try {
            let bundle = null;

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
                const cloudTxCount = (bundle.data.journal_transactions || []).length +
                                     (bundle.data.shared_transactions || []).length +
                                     (bundle.data.currency_transactions || []).length;
                
                const hasCloudData = cloudTxCount > 0 || (bundle.data.accounts && bundle.data.accounts.length > 0);

                if (hasCloudData) {
                    this.importBundle(bundle, true);
                    localStorage.setItem('budget_last_synced_at', bundle.syncedAt || new Date().toISOString());
                    localStorage.setItem('budget_known_cloud_tx_count', String(cloudTxCount));
                    
                    if (typeof App !== 'undefined' && App.renderPage) {
                        App.renderPage();
                    }
                    if (!silent) this.showSyncToast('Данные успешно загружены из облака ☁️');
                }

                this.isCloudReady = true;
                this.updateCloudStatusUI('🟢 Онлайн');
                return { success: true };
            } else {
                this.isCloudReady = true;
                const localBundle = this.exportBundle();
                const localTxCount = (localBundle.data.journal_transactions || []).length;
                if (localTxCount > 0) {
                    await this.pushToCloud(true);
                }
                this.updateCloudStatusUI('🟢 Онлайн');
                return { success: true };
            }
        } catch (err) {
            console.warn('Supabase pull error:', err);
            this.updateCloudStatusUI('🟡 Офлайн');
            
            const emergency = localStorage.getItem('budget_emergency_backup');
            if (emergency && !this.get('accounts')) {
                try {
                    this.importBundle(JSON.parse(emergency), true);
                    console.log('Restored from local emergency snapshot');
                } catch (e) {}
            }
            this.isCloudReady = true;
        } finally {
            this.isPulling = false;
        }
        return { success: false };
    },

    updateCloudStatusUI(text) {
        if (typeof document !== 'undefined') {
            const el = document.getElementById('sidebar-cloud-status');
            if (el) el.textContent = text;
        }
    },

    /* --- Всплывающее уведомление (Toast) --- */

    showSyncToast(msg, duration = 3000) {
        if (typeof document === 'undefined') return;
        let toast = document.getElementById('sync-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'sync-toast';
            toast.className = 'sync-toast';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.classList.add('visible');
        setTimeout(() => toast.classList.remove('visible'), duration);
    },

    /* --- Модальное окно управления синхронизацией --- */

    showSyncModal() {
        const lastSync = localStorage.getItem('budget_last_synced_at') 
            ? new Date(localStorage.getItem('budget_last_synced_at')).toLocaleString('ru-RU')
            : 'Никогда';

        const jsonExport = JSON.stringify(this.exportBundle(), null, 2);

        App.showModal('☁️ Облачная синхронизация (Supabase Realtime)', `
            <div style="margin-bottom: 16px;">
                <div style="background: rgba(46, 213, 115, 0.1); border: 1px solid rgba(46, 213, 115, 0.3); border-radius: var(--radius); padding: 12px; margin-bottom: 16px;">
                    <div style="font-weight: 700; color: var(--color-success); margin-bottom: 4px; display:flex; align-items:center; gap:6px;">
                        <span>🟢</span>
                        <span>Автоматическая Realtime-синхронизация активна</span>
                    </div>
                    <div style="font-size: 12px; color: var(--text-secondary);">
                        Любые изменения на компьютере, телефоне или планшете мгновенно передаются на все устройства. Встроенная защита Anti-Wipe предотвращает потерю данных при открытии на чистых устройствах.
                    </div>
                </div>

                <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px;">
                    Последняя синхронизация: <strong style="color: var(--text-primary);">${lastSync}</strong>
                </div>

                <div style="display: flex; gap: 10px; margin-bottom: 16px;">
                    <button type="button" class="btn btn-primary btn-block" id="btn-modal-push-cloud">
                        ⬆️ Выгрузить в облако
                    </button>
                    <button type="button" class="btn btn-secondary btn-block" id="btn-modal-pull-cloud">
                        ⬇️ Загрузить из облака
                    </button>
                </div>

                <div style="margin-top: 16px; border-top: 1px solid var(--border-subtle); padding-top: 16px;">
                    <label class="form-label">Автономный локальный файл (без облака):</label>
                    <div style="display:flex; gap:10px; margin-bottom:12px;">
                        <button type="button" class="btn btn-secondary btn-block" id="btn-download-backup-file">
                            📥 Скачать файл на диск (.json)
                        </button>
                        <button type="button" class="btn btn-secondary btn-block" id="btn-upload-backup-file">
                            📤 Загрузить файл с диска
                        </button>
                        <input type="file" id="input-backup-file" accept=".json" style="display:none;">
                    </div>

                    <details style="margin-top: 8px;">
                        <summary style="font-size: 12px; color: var(--text-muted); cursor: pointer; user-select: none;">Показать текстовый JSON-код</summary>
                        <div style="margin-top: 8px;">
                            <textarea id="sync-json-area" class="form-input" style="font-family: monospace; font-size: 11px; height: 80px; resize: vertical;" readonly>${jsonExport}</textarea>
                            <div style="display:flex; gap:8px; margin-top:8px;">
                                <button type="button" class="btn btn-secondary btn-sm" id="btn-copy-backup-json">📋 Скопировать</button>
                                <button type="button" class="btn btn-secondary btn-sm" id="btn-import-custom-json">📥 Восстановить из текста</button>
                            </div>
                        </div>
                    </details>
                </div>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="App.closeModal()">Закрыть</button>
            </div>
        `);

        document.getElementById('btn-modal-push-cloud')?.addEventListener('click', async () => {
            await this.pushToCloud(false);
            App.closeModal();
        });

        document.getElementById('btn-modal-pull-cloud')?.addEventListener('click', async () => {
            await this.pullFromCloud(false);
            App.closeModal();
        });

        // 1-Click Скачать файл бэкапа на устройство
        document.getElementById('btn-download-backup-file')?.addEventListener('click', () => {
            const bundle = this.exportBundle();
            const dateStr = new Date().toISOString().slice(0, 10);
            const fileName = `budget_backup_${dateStr}.json`;
            const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            this.showSyncToast(`Файл ${fileName} сохранён 📥`);
        });

        // 1-Click Загрузить файл бэкапа с устройства
        const fileInput = document.getElementById('input-backup-file');
        document.getElementById('btn-upload-backup-file')?.addEventListener('click', () => {
            fileInput?.click();
        });

        fileInput?.addEventListener('change', (e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const parsed = JSON.parse(event.target.result);
                    if (this.importBundle(parsed)) {
                        this.pushToCloud(true);
                        if (typeof App !== 'undefined' && App.renderPage) {
                            App.renderPage();
                        }
                        this.showSyncToast('Данные успешно восстановлены из файла! 🚀');
                        App.closeModal();
                    } else {
                        alert('Ошибка: неверный формат файла резервной копии');
                    }
                } catch (err) {
                    alert('Ошибка чтения файла: ' + err.message);
                }
            };
            reader.readAsText(file);
        });

        document.getElementById('btn-copy-backup-json')?.addEventListener('click', () => {
            const area = document.getElementById('sync-json-area');
            if (area) {
                area.select();
                navigator.clipboard.writeText(area.value);
                this.showSyncToast('Резервная копия скопирована в буфер 📋');
            }
        });

        document.getElementById('btn-import-custom-json')?.addEventListener('click', () => {
            const jsonStr = prompt('Вставьте JSON-строку резервной копии:');
            if (jsonStr) {
                try {
                    const parsed = JSON.parse(jsonStr);
                    if (this.importBundle(parsed)) {
                        this.pushToCloud(true);
                        App.renderPage();
                        alert('Данные успешно восстановлены и синхронизированы с облаком!');
                        App.closeModal();
                    } else {
                        alert('Ошибка: неверный формат данных JSON');
                    }
                } catch (e) {
                    alert('Ошибка парсинга JSON: ' + e.message);
                }
            }
        });
    }
};
