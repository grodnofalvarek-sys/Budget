/* ===========================================
   Storage — модуль хранилища, синхронизации и кода переноса (v2.2)
   =========================================== */

const Storage = {
    PREFIX: 'budget_',
    CLOUD_BLOB_KEY: 'budget_cloud_blob_id',

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
        'active_currency_account'
    ],

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
    },

    clear() {
        const keys = Object.keys(localStorage).filter(k => k.startsWith(this.PREFIX));
        keys.forEach(k => localStorage.removeItem(k));
    },

    getBlobId() {
        return localStorage.getItem(this.CLOUD_BLOB_KEY) || '';
    },

    setBlobId(id) {
        if (id) localStorage.setItem(this.CLOUD_BLOB_KEY, id.trim());
        else localStorage.removeItem(this.CLOUD_BLOB_KEY);
    },

    /* --- Экспорт и Импорт пакета данных --- */

    exportBundle() {
        const bundle = {
            version: '2.0',
            exportedAt: new Date().toISOString(),
            data: {}
        };
        this.ALL_KEYS.forEach(key => {
            bundle.data[key] = this.get(key);
        });
        return bundle;
    },

    importBundle(bundle) {
        if (!bundle || !bundle.data) return false;
        this.ALL_KEYS.forEach(key => {
            if (bundle.data[key] !== undefined && bundle.data[key] !== null) {
                localStorage.setItem(this.PREFIX + key, JSON.stringify(bundle.data[key]));
            }
        });
        return true;
    },

    /* --- Текстовый код синхронизации (100% гарантия переноса без интернет-ошибок) --- */

    exportCodeString() {
        const bundle = this.exportBundle();
        const jsonStr = JSON.stringify(bundle);
        // Base64 encoding with UTF-8 support
        return 'BDGT_' + btoa(unescape(encodeURIComponent(jsonStr)));
    },

    importCodeString(codeStr) {
        if (!codeStr) return false;
        try {
            let cleanStr = codeStr.trim();
            if (cleanStr.startsWith('BDGT_')) cleanStr = cleanStr.slice(5);
            const jsonStr = decodeURIComponent(escape(atob(cleanStr)));
            const bundle = JSON.parse(jsonStr);
            return this.importBundle(bundle);
        } catch (e) {
            console.error('Import code error:', e);
            return false;
        }
    },

    /* --- Фоновая авто-синхронизация --- */

    autoSyncTimer: null,
    autoSyncBackground() {
        if (this.autoSyncTimer) clearTimeout(this.autoSyncTimer);
        this.autoSyncTimer = setTimeout(() => {
            if (this.getBlobId()) {
                this.pushToCloud(true);
            }
        }, 2500);
    },

    /* --- Облачный обмен (Push & Pull) --- */

    async pushToCloud(silent = false) {
        try {
            const bundle = this.exportBundle();
            let blobId = this.getBlobId();

            let url = 'https://jsonblob.com/api/jsonBlob';
            let method = 'POST';

            if (blobId) {
                url = `https://jsonblob.com/api/jsonBlob/${blobId}`;
                method = 'PUT';
            }

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bundle)
            });

            if (response.ok || response.status === 200 || response.status === 201) {
                if (method === 'POST') {
                    const loc = response.headers.get('Location');
                    if (loc) {
                        const parts = loc.split('/');
                        blobId = parts[parts.length - 1];
                        this.setBlobId(blobId);
                    }
                }
                this.updateCloudStatusUI('🟢 Облако синхронизировано');
                return { success: true, blobId: this.getBlobId() };
            }
        } catch (err) {
            console.warn('Cloud push error:', err);
            this.updateCloudStatusUI('🟡 Сохранено локально');
        }
        return { success: false };
    },

    async pullFromCloud(silent = false) {
        const blobId = this.getBlobId();
        if (!blobId) return { success: false, reason: 'no_id' };

        try {
            const response = await fetch(`https://jsonblob.com/api/jsonBlob/${blobId}`);
            if (response.ok) {
                const bundle = await response.json();
                if (bundle && this.importBundle(bundle)) {
                    this.updateCloudStatusUI('🟢 Облако синхронизировано');
                    if (typeof App !== 'undefined' && App.renderPage) App.renderPage();
                    return { success: true };
                }
            }
        } catch (err) {
            console.warn('Cloud pull error:', err);
        }
        return { success: false };
    },

    updateCloudStatusUI(text) {
        if (typeof document !== 'undefined') {
            const el = document.getElementById('sidebar-cloud-status');
            if (el) el.textContent = text;
        }
    },

    /* --- Файловый Резервный Архив --- */

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
                    alert('✅ Данные успешно восстановлены из файла!');
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
        const currentBlobId = this.getBlobId();
        
        App.showModal('☁️ Синхронизация и перенос данных', `
            <div style="margin-bottom: 20px;">
                <div id="sync-notice-banner" style="display:none; padding:12px; border-radius:var(--radius); margin-bottom:16px; font-weight:600; font-size:13px;"></div>

                <!-- Вариант 1: Быстрый текстовый код переноса (100% гарантия) -->
                <div style="background: var(--bg-card); padding: 14px; border-radius: var(--radius); border: 1px solid var(--accent-start); margin-bottom: 16px;">
                    <div style="font-size: 13px; font-weight:700; color:var(--text-primary); margin-bottom: 4px;">🚀 Быстрый перенос по Коду (100% работает):</div>
                    <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 10px;">
                        Нажмите «Скопировать код», отправьте себе в Telegram/WhatsApp, а на телефоне нажмите «Вставить код»!
                    </div>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <button class="btn btn-primary btn-sm" id="btn-copy-code-str">📋 Скопировать код данных</button>
                        <button class="btn btn-secondary btn-sm" id="btn-paste-code-str">📥 Вставить код с телефона/ПК</button>
                    </div>
                </div>

                <!-- Вариант 2: Облачная ячейка -->
                <div style="background: var(--bg-card); padding: 14px; border-radius: var(--radius); border: 1px solid var(--border-subtle); margin-bottom: 16px;">
                    <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 6px;">ID авто-облака:</div>
                    <div style="display:flex; gap:8px;">
                        <input type="text" id="input-family-key" class="form-input" value="${currentBlobId}" placeholder="создастся при отправке..." style="font-weight:600; font-family:monospace;">
                        <button class="btn btn-secondary btn-sm" id="btn-save-family-key">Привязать ID</button>
                    </div>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-top:12px;">
                        <button class="btn btn-secondary btn-sm" id="btn-cloud-push">📤 Отправить в облако</button>
                        <button class="btn btn-secondary btn-sm" id="btn-cloud-pull">📥 Загрузить из облака</button>
                    </div>
                </div>

                <!-- Вариант 3: Резервный файл -->
                <div style="border-top: 1px solid var(--border-subtle); padding-top: 12px;">
                    <div style="font-size: 12px; font-weight:600; margin-bottom: 8px;">💾 Резервный файл на диске:</div>
                    <div style="display:flex; gap:8px; flex-wrap:wrap;">
                        <button class="btn btn-secondary btn-sm" id="btn-download-json">Скачать .json файл</button>
                        <label class="btn btn-secondary btn-sm" style="cursor:pointer; margin:0;">
                            Загрузить .json файл
                            <input type="file" id="input-restore-json" accept=".json" style="display:none;">
                        </label>
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

        // Копирование текстового кода
        document.getElementById('btn-copy-code-str')?.addEventListener('click', () => {
            const code = this.exportCodeString();
            navigator.clipboard.writeText(code).then(() => {
                showNotice('📋 Код данных скопирован в буфер обмена! Отправьте его в Telegram и вставьте на телефоне.');
            }).catch(() => {
                prompt('Скопируйте этот код вручную:', code);
            });
        });

        // Вставка текстового кода
        document.getElementById('btn-paste-code-str')?.addEventListener('click', () => {
            const code = prompt('Вставьте скопированный код данных (начинается на BDGT_):');
            if (code) {
                if (this.importCodeString(code)) {
                    showNotice('✅ Данные успешно импортированы из кода! Страница обновлена.');
                    if (typeof App !== 'undefined' && App.renderPage) App.renderPage();
                } else {
                    showNotice('❌ Неверный код данных. Проверьте правильность скопированного текста.', false);
                }
            }
        });

        document.getElementById('btn-save-family-key')?.addEventListener('click', () => {
            const val = document.getElementById('input-family-key')?.value;
            if (val) {
                this.setBlobId(val);
                showNotice('🔑 ID ячейки привязан!');
            }
        });

        document.getElementById('btn-cloud-push')?.addEventListener('click', async () => {
            const res = await this.pushToCloud(true);
            if (res.success) {
                const idInput = document.getElementById('input-family-key');
                if (idInput) idInput.value = res.blobId;
                showNotice(`✅ Данные выгружены в облако! ID: <strong style="font-family:monospace;">${res.blobId}</strong>`);
            } else {
                showNotice('⚠️ Интернет-облако недоступно. Используйте кнопку "📋 Скопировать код данных" выше — это гарантированно перенесёт данные!', false);
            }
        });

        document.getElementById('btn-cloud-pull')?.addEventListener('click', async () => {
            const res = await this.pullFromCloud(true);
            if (res.success) {
                showNotice('✅ Данные успешно загружены из облака!');
            } else {
                showNotice('⚠️ Не удалось загрузить. Воспользуйтесь кнопкой "📥 Вставить код данных" выше.', false);
            }
        });

        document.getElementById('btn-download-json')?.addEventListener('click', () => {
            this.downloadBackupFile();
        });

        document.getElementById('input-restore-json')?.addEventListener('change', (e) => {
            this.restoreFromBackupFile(e.target);
        });
    }
};
