// ==UserScript==
// @name         TW Control Center
// @namespace    http://tampermonkey.net/
// @version      3.0.0
// @description  TW Control Center 3.0.0 – modulare Basis von TWScriptForge
// @author       TWScriptForge
// @match        https://*.die-staemme.de/*
// @match        https://*.tribalwars.de/*
// @run-at       document-end
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_addStyle
// @grant        unsafeWindow
// ==/UserScript==

(function () {
    'use strict';

    function cssEscape(value) {
        if (window.CSS && typeof window.CSS.escape === 'function') {
            return window.CSS.escape(String(value));
        }
        return String(value).replace(/[^a-zA-Z0-9_-]/g, function (ch) {
            return '\\' + ch.charCodeAt(0).toString(16) + ' ';
        });
    }

    const win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    win.TWCC_CoreInfo = Object.freeze({
        name: 'TW Control Center',
        version: '3.0.0',
        phase: 'theme-engine-live'
    });
    const $ = win.jQuery || win.$;

    if (!$) {
        console.warn('[TW Control Center] jQuery nicht gefunden. Script gestoppt.');
        return;
    }

    $.ajaxSetup({ cache: true });

    const TWCC_VERSION = '3.0.0';
    const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/TWScriptForge/TW-Control-Center/main/';
    const MODULE_BASE = GITHUB_RAW_BASE + 'modules/';

    const CORE_KEY = 'TW_TOOLBOX_CORE_V1';
    const TAB_KEY = 'TW_TOOLBOX_TAB_OVERRIDES_V1';
    const CATEGORY_ORDER_KEY = 'TWCC_CATEGORY_ORDER_V1';
    const AO_KEY = 'AO_GUI_SETTINGS_V1';
    const DSUI_KEY = 'TW_TOOLBOX_DSUI_SETTINGS_V1';
    const DSV_KEY = 'TW_TOOLBOX_DSV_SETTINGS_V1';
    const BOTGUARD_KEY = 'TW_TOOLBOX_BOTGUARD_SETTINGS_V1';
    const KORI_KEY = 'TWCC_KORRIKARTE_PROFILES_V1';

    const DEFAULT_CORE = {
        panel: {
            left: null,
            top: null,
            width: 520,
            height: 560,
            collapsed: false,
            minimized: false
        },
        favorites: ['botGuard', 'attackOrganizer'],
        categoriesCollapsed: {},
        search: '',
        modules: {
            botGuard: { enabled: true, cacheBust: '' },
            farmGodExternal: { enabled: false, cacheBust: '' },
            fakeGeneratorExternal: { enabled: false, cacheBust: '' },
            angriffsplanerExternal: { enabled: false, cacheBust: '' },
            dorfnotizVorlagen: { enabled: true, cacheBust: '' },
            signaturForumIgm: { enabled: true, cacheBust: '' },
            zustimmungsanzeige: { enabled: true, cacheBust: '' },
            attackOrganizer: { enabled: true, cacheBust: '' },
            dsUiExtended: { enabled: true, cacheBust: '' },
            dsSelectVillages: { enabled: true, cacheBust: '' },
        attackTimerServerMs: { enabled: false, cacheBust: '' },
            dsUltimateVerlaeufe: { enabled: false, cacheBust: '' },
            berichteUmbenennen: { enabled: false, cacheBust: '' },
            premiumDepotQuickButtons: { enabled: false, cacheBust: '' },
            korrikarteProfiles: { enabled: true, cacheBust: '' }
        }
    };

    const DEFAULT_AO = {
        fontSize: 8,
        layout: 'column',
        buttons: [
            { text: '[Gedefft]',        button: 'Gedefft',       mode: 'replace', bg: '#31c908', bg2: '#228c05', fg: '#ffffff' },
            { text: '[Nachdeffen]',      button: 'Nachdeffen',    mode: 'replace', bg: '#66cdaa', bg2: '#4da98c', fg: '#000000' },
            { text: '[Rausstellen]',     button: 'Rausstellen',   mode: 'replace', bg: '#ffd91c', bg2: '#e8c30d', fg: '#000000' },
            { text: '[Tabben]',          button: 'Tabben',        mode: 'replace', bg: '#ef8b10', bg2: '#d3790a', fg: '#ffffff' },
            { text: '[Readel]',          button: 'Readel',        mode: 'replace', bg: '#ffdd00', bg2: '#e8c900', fg: '#000000' },
            { text: ' | Fakeschutz IO',  button: 'Fakeschutz IO',      mode: 'append', bg: '#31c908', bg2: '#228c05', fg: '#ffffff' },
            { text: ' | Aufstocken IO',  button: 'Aufstocken IO',      mode: 'append', bg: '#31c908', bg2: '#228c05', fg: '#ffffff' },
            { text: ' | Wallcheck',      button: 'Wallcheck',      mode: 'append',     bg: '#ffd91c', bg2: '#e8c30d', fg: '#000000' },
            { text: ' | Off Raus ⚠️',    button: 'Off Raus',      mode: 'append',      bg: '#ffd91c', bg2: '#e8c30d', fg: '#000000' },
            { text: ' | Fake DB',        button: 'Fake DB',      mode: 'append',       bg: '#31c908', bg2: '#228c05', fg: '#ffffff' },
            { text: ' | Off DB',         button: 'Off DB',      mode: 'append',        bg: '#e20606', bg2: '#b70707', fg: '#ffffff' },
            { text: ' | DONE ✅',        button: 'DONE',      mode: 'append',          bg: '#196f24', bg2: '#12551b', fg: '#ffffff' }
        ],
        panel: { left: null, top: null, width: 760, height: 620, collapsed: true }
    };

    const DEFAULT_DSUI = {
        CopyAndExportButton: true,
        OverviewVillages: true,
        TroopCounter: true,
        InfoVillage: true,
        ReportBashPoints: true,
        ReportSurvived: false,
        MassSupport: true,
        Transport: true,
        FlagStats: true,
        AllySummarie: true,
        spear_bunker_value: 20000,
        PlaceFilters: true,
        ReportSpyInfo: true,
        ReportTimes: true,
        CommandAndNotesSharing: true,
        ReportPreview: true,
        panel: { left: null, top: null, width: 560, height: 520, collapsed: true }
    };

    const DEFAULT_DSV = {
        filter: false,
        showWithCoords: false,
        showWithCounter: false,
        breakAfter: 5,
        activationCharCode: 'b',
        panel: { left: null, top: null, width: 520, height: 360, collapsed: true }
    };

    const DEFAULT_BOTGUARD = {
        alarmEnabled: true,
        alarmVolume: 0.5,
        panel: { left: null, top: null, width: 460, height: 280, collapsed: true }
    };

    const DEFAULT_KORI = {
        panel: {
            left: null,
            top: null,
            width: 780,
            height: 640,
            collapsed: true
        },
        profiles: {}
    };

    function deepClone(value) {
        if (value === undefined) return undefined;
        return JSON.parse(JSON.stringify(value));
    }

    const Storage = Object.freeze({
        get(key, fallback = null) {
            const value = GM_getValue(key, undefined);
            return value === undefined ? fallback : value;
        },

        set(key, value) {
            GM_setValue(key, value);
            return value;
        },

        remove(key) {
            if (typeof GM_deleteValue === 'function') GM_deleteValue(key);
            else GM_setValue(key, undefined);
        },

        getJson(key, fallback = null, mergeDefaults = false) {
            const saved = this.get(key, null);
            if (saved === null || saved === undefined || saved === '') {
                return deepClone(fallback);
            }

            try {
                const parsed = typeof saved === 'string' ? JSON.parse(saved) : saved;
                if (mergeDefaults && fallback && typeof fallback === 'object' && !Array.isArray(fallback)) {
                    return mergeDeep(deepClone(fallback), parsed || {});
                }
                return deepClone(parsed);
            } catch (error) {
                console.warn('[TW Control Center] Speicher konnte nicht geladen werden:', key, error);
                return deepClone(fallback);
            }
        },

        setJson(key, value) {
            return this.set(key, JSON.stringify(value));
        }
    });

    function loadJson(key, fallback) {
        return Storage.getJson(key, fallback, true);
    }

    function saveJson(key, value) {
        Storage.setJson(key, value);
    }

    function mergeDeep(target, source) {
        Object.keys(source || {}).forEach(key => {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                target[key] = mergeDeep(target[key] || {}, source[key]);
            } else {
                target[key] = source[key];
            }
        });
        return target;
    }

    let core = loadJson(CORE_KEY, DEFAULT_CORE);
    let aoConfig = loadJson(AO_KEY, DEFAULT_AO);
    let dsuiConfig = loadJson(DSUI_KEY, DEFAULT_DSUI);
    let dsvConfig = loadJson(DSV_KEY, DEFAULT_DSV);
    let botGuardConfig = loadJson(BOTGUARD_KEY, DEFAULT_BOTGUARD);
    let koriConfig = loadJson(KORI_KEY, DEFAULT_KORI);

    function ensureCoreModulesRegistered() {
        core.modules = core.modules || {};
        // Entferntes Modul aus älteren gespeicherten Einstellungen bereinigen.
        delete core.modules.berichteFilter;
        Object.entries(DEFAULT_CORE.modules).forEach(([id, defaults]) => {
            core.modules[id] = mergeDeep(deepClone(defaults), core.modules[id] || {});
        });
        saveJson(CORE_KEY, core);
    }
    ensureCoreModulesRegistered();

    function loadTabOverrides() {
        try { return JSON.parse(sessionStorage.getItem(TAB_KEY) || '{}'); }
        catch { return {}; }
    }
    function saveTabOverrides(data) { sessionStorage.setItem(TAB_KEY, JSON.stringify(data || {})); }
    let tabOverrides = loadTabOverrides();

    const Modules = {

        fakeGeneratorExternal: {
            id: 'fakeGeneratorExternal',
            name: 'FakeGenerator Extern',
            icon: '🎭',
            category: 'troopMovement',
            categoryName: 'Truppenbewegung',
            description: 'Lädt den FakeGenerator extern aus GitHub/jsDelivr. Standardmäßig AUS. Konflikt mit FarmGod Extern.',
            author: 'TWScriptForge / SaveBank',
            version: '2.3.7-external',
            source: 'external',
            loader: 'fetch',
            scriptUrl: MODULE_BASE + 'Fakegenerator.js',
            started: false,
            conflicts: ['farmGodExternal'],
            matchesPage() {

                return location.href.includes('/game.php');

            },
            init() {
                if (this.started) return;
                this.started = true;
                twccFakeGeneratorSpecialLoader('module-init');

            },
            openSettings() { createFakeGeneratorExternalInfoPanel(); }
        },

        angriffsplanerExternal: {
            id: 'angriffsplanerExternal',
            name: 'Angriffsplaner',
            icon: '📋',
            category: 'troopMovement',
            categoryName: 'Truppenbewegung',
            description: 'DS-Ultimate BBCode importieren, Angriffe vorbereiten und mit Timing/Auto-Kalibrierung senden.',
            author: 'TWScriptForge',
            version: '1.0-external',
            source: 'external',
            loader: 'fetch',
            scriptUrl: MODULE_BASE + 'farmgod/Angriffsplaner.js',
            started: false,
            matchesPage() {
                return location.href.includes('/game.php');
            },
            init() {
                if (this.started) return;
                if (!this.matchesPage()) {
                    console.log('[TW Control Center] Angriffsplaner aktiv, aber nur auf game.php-Seiten geladen.');
                    return;
                }
                this.started = true;
                loadExternalScript(this.scriptUrl, this.id, this.loader);
            },
            openSettings() {
                const btn = document.getElementById('twcc-dsu-launch');
                if (btn) btn.click();
                else {
                    this.init();
                    try { ToolboxCore.Notify.info('Angriffsplaner wird geladen. Button unten rechts öffnen.'); } catch(e) {}
                }
            }
        },

        zustimmungsanzeige: {
            id: 'zustimmungsanzeige',
            name: 'Zustimmungsanzeige',
            icon: '👑',
            category: 'map',
            categoryName: 'Karte',
            description: 'Zustimmungsanzeige für Adelungen auf Dorfinfoseite, Karte, Bericht und Übersicht. Das Script liest die Welt selbst aus.',
            author: 'Ademes',
            version: '1.2',
            source: 'external',
            loader: 'jquery',
            scriptUrl: 'https://media.innogames.com/com_DS_DE/Scriptdatenbank/userscript_main/140_zustimmungsanzeige_ademes.js',
            started: false,
            matchesPage() {
                return location.href.includes('screen=report') ||
                       location.href.includes('screen=info_village') ||
                       location.href.includes('screen=map') ||
                       location.href.includes('screen=overview');
            },
            init() {
                if (this.started) return;
                if (!this.matchesPage()) {
                    console.log('[TW Control Center] Zustimmungsanzeige aktiv, aber auf dieser Seite nicht geladen.');
                    return;
                }
                this.started = true;
                initZustimmungsanzeigeModule();
            },
            openSettings() { createZustimmungsanzeigeInfoPanel(); }
        },

        signaturForumIgm: {
            id: 'signaturForumIgm',
            name: 'Signatur Forum/IGM',
            icon: '✒️',
            category: 'overview',
            categoryName: 'Übersicht',
            description: 'Signatur für Forum und Nachrichten. Texte können direkt im TWCC eingestellt werden.',
            author: 'Mausmajor, Ademes',
            version: '1.0',
            source: 'external',
            loader: 'jquery',
            scriptUrl: 'https://media.innogames.com/com_DS_DE/Scriptdatenbank/userscript_main/100_signatur_im_forum_und_igm_mausmajor_ademes.js',
            started: false,
            matchesPage() {
                return location.href.includes('screen=forum') || location.href.includes('screen=settings') || location.href.includes('screen=mail');
            },
            init() {
                if (this.started) return;
                if (!this.matchesPage()) {
                    console.log('[TW Control Center] Signatur aktiv, aber nur Forum/Settings/Mail geladen.');
                    return;
                }
                this.started = true;
                initSignaturForumIgmModule();
            },
            openSettings() { createSignaturForumIgmPanel(); }
        },

        dorfnotizVorlagen: {
            id: 'dorfnotizVorlagen',
            name: 'Dorfnotiz-Vorlagen',
            icon: '📝',
            category: 'map',
            categoryName: 'Karte',

            description: 'Dorfnotizen einfacher machen: Vorlagen, Hotkeys und Custom-Buttons auf der Dorf-Info-Seite.',
            author: 'ners, TheHebel97',
            version: '1.1',
            source: 'external',
            loader: 'jquery',
            scriptUrl: 'https://media.innogames.com/com_DS_DE/Scriptdatenbank/userscript_main/350_dorfnotiz-vorlagen_thehebel97.js',
            started: false,
            matchesPage() {
                return location.href.includes('screen=info_village');
            },
            init() {
                if (this.started) return;
                if (!this.matchesPage()) {
                    console.log('[TW Control Center] Dorfnotiz-Vorlagen aktiv, aber nur auf Dorf-Info-Seiten geladen.');
                    return;
                }
                this.started = true;
                initDorfnotizVorlagenModule();
            },
            openSettings() { createDorfnotizVorlagenPanel(); }
        },

        farmGodExternal: {
            id: 'farmGodExternal',
            name: 'FarmGod',
            icon: '🌾',
            category: 'attack',
            categoryName: 'Angriff',
            description: 'Lädt FarmGod extern aus GitHub/jsDelivr. FarmGod bleibt außerhalb vom Master und kann separat bearbeitet werden.',
            author: 'TWScriptForge / Warre',
            version: '1.5.4-external',
            source: 'external',
            loader: 'pageBlob',
            scriptUrl: MODULE_BASE + 'farmgod/farmgod.js',
            started: false,
            conflicts: ['fakeGenerator'],
            matchesPage() {
                return typeof game_data !== 'undefined' && game_data.screen === 'am_farm';
            },
            init() {
                if (this.started) return;
                if (!this.matchesPage()) {
                    console.log('[TW Control Center] FarmGod Extern ist aktiv, startet aber nur im Farm-Assistenten.');
                    return;
                }
                this.started = true;
                loadExternalScript(this.scriptUrl, this.id, this.loader);
            },
            openSettings() { createFarmGodExternalInfoPanel(); }
        },
        botGuard: {
            id: 'botGuard',
            name: 'Bot-Schutz',
            icon: '🛡️',
            category: 'security',
            categoryName: 'Sicherheit',
            description: 'Erkennt Bot-Schutz, pausiert die Toolbox und warnt per Banner/Alarm. Löst nichts automatisch.',
            author: 'Toolbox Core',
            version: '1.0',
            source: 'core',
            started: false,
            matchesPage() { return true; },
            init() {
                if (this.started) return;
                this.started = true;
                BotGuard.start();
            },
            openSettings() { createBotGuardPanel(false); }
        },
        attackOrganizer: {
            id: 'attackOrganizer',
            name: 'Attack Organizer',
            icon: '⚔️',
            category: 'attack',
            categoryName: 'Angriff',
            description: 'Benennt eingehende Angriffe per Klick um und färbt sie nach Status ein.',
            author: 'fmthemaster, Mau Maria, PhilipsNostrum, Kirgonix, Diogo Rocha, Bernas',
            version: '3.5-external',
            source: 'external',
            loader: 'fetch',
            scriptUrl: MODULE_BASE + 'AttackOrganizer.js',
            started: false,
            matchesPage() { return isAttackOrganizerPage(); },
            init() {
                if (this.started) return;
                if (!this.matchesPage()) {
                    console.log('[TW Control Center] Attack Organizer ist aktiv, wird auf dieser Seite aber nicht geladen.');
                    return;
                }
                this.started = true;
                applyAttackOrganizerGlobals();
                loadExternalScript(this.scriptUrl, this.id, this.loader);
            },
            openSettings() { createAttackOrganizerPanel(false); }
        },
        dsUiExtended: {
            id: 'dsUiExtended',
            name: 'DS UI Erweitert',
            icon: '📊',
            category: 'overview',
            categoryName: 'Übersicht',
            description: 'Erweitert mehrere Spielseiten um Summen, Filter und zusätzliche Informationen.',
            author: 'suilenroc, Get Drunk, ruingvar',
            version: '3.0',
            source: 'external',
            loader: 'jquery',
            scriptUrl: 'https://media.innogames.com/com_DS_DE/Scriptdatenbank/userscript_main/315_ds-ui_erweitern_suilenroc.js',
            started: false,
            matchesPage() { return isDsUiPage(); },
            init() {
                if (this.started) return;
                if (!this.matchesPage()) {
                    console.log('[TW Control Center] DS UI Erweitert ist aktiv, wird auf dieser Seite aber nicht geladen.');
                    return;
                }
                this.started = true;
                applyDsUiGlobals();
                loadExternalScript(this.scriptUrl, this.id, this.loader);
            },
            openSettings() { createDsUiPanel(false); }
        }

        ,
        dsUltimateVerlaeufe: {
            id: 'dsUltimateVerlaeufe',
            name: 'DS Ultimate Verläufe',
            icon: '📈',
            category: 'overview',
            categoryName: 'Übersicht',
            description: 'Lädt DS Ultimate Verläufe aus der offiziellen Scriptdatenbank.',
            author: 'mkich / skatecram',
            version: 'external',
            source: 'external',
            loader: 'page',
            scriptUrl: 'https://media.innogames.com/com_DS_DE/Scriptdatenbank/userscript_main/290_ds-ultimate_verlaeufe_mkich_skatecram.js',
            started: false,
            matchesPage() {
                const hostOk = /(^|\.)die-staemme\.de$/.test(location.hostname) ||
                               /(^|\.)tribalwars\.de$/.test(location.hostname);
                return hostOk && location.href.includes('/game.php');
            },
            init() {
                if (this.started) return;
                if (!this.matchesPage()) {
                    console.log('[TW Control Center] DS Ultimate Verläufe aktiv, aber nur auf game.php-Seiten geladen.');
                    return;
                }
                this.started = true;
                loadExternalScript(this.scriptUrl, this.id, this.loader);
            },
            openSettings() { createModuleInfoPanel(this); }
        },

        berichteUmbenennen: {
            id: 'berichteUmbenennen',
            name: 'Berichte umbenennen + Dorfnotiz',
            icon: '📨',
            category: 'overview',
            categoryName: 'Übersicht',
            description: 'Benennt einzelne Berichte um und verarbeitet in der Berichtsübersicht mehrere markierte Berichte inklusive Dorfnotiz.',
            author: 'TWScriptForge',
            version: '5.5-external',
            source: 'external',
            loader: 'fetch',
            scriptUrl: MODULE_BASE + 'Berichte-Umbenennen.js',
            started: false,
            matchesPage() {
                return location.href.includes('screen=report');
            },
            init() {
                if (this.started) return;
                if (!this.matchesPage()) {
                    console.log('[TW Control Center] Berichte umbenennen aktiv, aber nur auf Berichtsseiten geladen.');
                    return;
                }
                this.started = true;
                loadExternalScript(this.scriptUrl, this.id, this.loader);
            },
            openSettings() { createModuleInfoPanel(this); }
        },


        premiumDepotQuickButtons: {
            id: 'premiumDepotQuickButtons',
            name: 'Premium-Depot Quick Buttons',
            icon: '💰',
            category: 'premium',
            categoryName: 'Premium',
            description: 'Frei konfigurierbare Kauf-Buttons für Holz, Lehm und Eisen im Premium-Depot inklusive MAX, Custom und optionaler Auto-Bestätigung.',
            author: 'achilles88 / TWScriptForge',
            version: '4.0.0-external',
            source: 'external',
            loader: 'fetch',
            scriptUrl: MODULE_BASE + 'Premium-Depot-Quick-Buttons.js',
            started: false,
            matchesPage() {
                const params = new URLSearchParams(location.search);
                return params.get('mode') === 'exchange';
            },
            init() {
                if (this.started) return;
                if (!this.matchesPage()) {
                    console.log('[TW Control Center] Premium-Depot Quick Buttons aktiv, aber nur im Premium-Depot geladen.');
                    return;
                }
                this.started = true;
                loadExternalScript(this.scriptUrl, this.id, this.loader);
            },
            openSettings() {
                createPremiumDepotSettingsPanel();
            }
        },

        attackTimerServerMs: {
            id: 'attackTimerServerMs',
            name: 'DS Angriff Timer ServerMS',
            icon: '⏱️',
            category: 'attack',
            categoryName: 'Angriff',
            description: 'Extern geladener ServerMS Angriff-Timer mit Gegnerzeit-Rechner, Kalibrierung, Drag/Resize UI und Debug-Log.',
            author: 'daniel',
            version: '4.5-external-fetch',
            source: 'external',
            loader: 'fetch',
            scriptUrl: MODULE_BASE + 'AttackTimerServerMS.js',
            started: false,
            matchesPage() { return isAttackTimerServerMsPage(); },
            init() {
                if (this.started) return;
                if (!this.matchesPage()) {
                    console.log('[TW Control Center] DS Angriff Timer ServerMS ist aktiv, wird auf dieser Seite aber nicht geladen.');
                    return;
                }
                this.started = true;
                loadExternalScript(this.scriptUrl, this.id, this.loader);
            },
            openSettings() {
                if (!this.matchesPage()) {
                    createAttackTimerInfoPanel();
                    return;
                }

                this.init();

                const openTimer = () => {
                    const api = win.TWCC_AttackTimerServerMS || window.TWCC_AttackTimerServerMS;
                    if (api?.openSettings) {
                        api.openSettings();
                        ToolboxCore.Notify.info('Angriff Timer geöffnet');
                        return true;
                    }
                    return false;
                };

                if (!openTimer()) {
                    let attempts = 0;
                    const waiter = setInterval(() => {
                        attempts += 1;
                        if (openTimer() || attempts >= 40) clearInterval(waiter);
                    }, 100);
                }
            }
        }

        ,
        korrikarteProfiles: {
            id: 'korrikarteProfiles',
            name: 'Korrikarte Profile',
            icon: '🧭',
            category: 'map',
            categoryName: 'Karte',
            description: 'Weltabhängige Korrikarten verwalten, ersetzen und ausführen. Pro Welt wird ein eigenes Profil gespeichert.',
            author: 'Shinko to Kuma, suilenroc, TWScriptForge',
            version: '0.6',
            source: 'internal',
            started: false,
            matchesPage() { return isKorrikartePage(); },
            init() {
                if (this.started) return;
                if (!this.matchesPage()) {
                    console.log('[TW Control Center] Korrikarte Profile ist aktiv, wird auf dieser Seite aber nicht geladen.');
                    return;
                }
                this.started = true;
                initKorrikarteProfiles();
            },
            openSettings() { createKorrikartePanel(false); }
        }

        ,
        dsSelectVillages: {
            id: 'dsSelectVillages',
            name: 'DSSelectVillages',
            icon: '🗺️',
            category: 'map',
            categoryName: 'Karte',
            description: 'Erlaubt das Markieren/Auswählen von Dörfern auf der Karte per Aktivierungstaste.',
            author: 'Phisa / Philipp Winter, suilenroc',
            version: '2.0',
            source: 'external',
            loader: 'page',
            scriptUrl: 'https://media.innogames.com/com_DS_DE/Scriptdatenbank/userscript_main/90_selectvillages_phisa.js',
            started: false,
            matchesPage() { return isDsSelectVillagesPage(); },
            init() {
                if (this.started) return;
                if (!this.matchesPage()) {
                    console.log('[TW Control Center] DSSelectVillages ist aktiv, wird auf dieser Seite aber nicht geladen.');
                    return;
                }
                this.started = true;
                applyDsSelectVillagesGlobals();
                loadExternalScript(this.scriptUrl, this.id, this.loader);
            },
            openSettings() { createDsSelectVillagesPanel(false); }
        }
    };

    // ==========================================================
    // ZENTRALE MODUL-INFORMATIONEN
    // ==========================================================
    // Nur die Texte zwischen den Backticks (`...`) bearbeiten.
    // Externe Module werden dafür NICHT gelesen und müssen NICHT verändert werden.
    const TOOL_INFO = Object.freeze({
        fakeGeneratorExternal: {
            description: `HIER GEHÖRT DEINE BESCHREIBUNG ZUM FAKEGENERATOR REIN`,
            instructions: `HIER GEHÖRT DEINE ANLEITUNG ZUM FAKEGENERATOR REIN`,
            tips: `HIER GEHÖREN DEINE TIPPS ZUM FAKEGENERATOR REIN`,
            notes: `HIER GEHÖREN WICHTIGE HINWEISE ZUM FAKEGENERATOR REIN`
        },
        angriffsplanerExternal: {
            description: `HIER GEHÖRT DEINE BESCHREIBUNG ZUM ANGRIFFSPLANER REIN`,
            instructions: `HIER GEHÖRT DEINE ANLEITUNG ZUM ANGRIFFSPLANER REIN`,
            tips: `HIER GEHÖREN DEINE TIPPS ZUM ANGRIFFSPLANER REIN`,
            notes: `HIER GEHÖREN WICHTIGE HINWEISE ZUM ANGRIFFSPLANER REIN`
        },
        zustimmungsanzeige: {
            description: `HIER GEHÖRT DEINE BESCHREIBUNG ZUR ZUSTIMMUNGSANZEIGE REIN`,
            instructions: `HIER GEHÖRT DEINE ANLEITUNG ZUR ZUSTIMMUNGSANZEIGE REIN`,
            tips: `HIER GEHÖREN DEINE TIPPS ZUR ZUSTIMMUNGSANZEIGE REIN`,
            notes: `HIER GEHÖREN WICHTIGE HINWEISE ZUR ZUSTIMMUNGSANZEIGE REIN`
        },
        signaturForumIgm: {
            description: `HIER GEHÖRT DEINE BESCHREIBUNG ZUR SIGNATUR FORUM/IGM REIN`,
            instructions: `HIER GEHÖRT DEINE ANLEITUNG ZUR SIGNATUR FORUM/IGM REIN`,
            tips: `HIER GEHÖREN DEINE TIPPS ZUR SIGNATUR FORUM/IGM REIN`,
            notes: `HIER GEHÖREN WICHTIGE HINWEISE ZUR SIGNATUR FORUM/IGM REIN`
        },
        dorfnotizVorlagen: {
            description: `HIER GEHÖRT DEINE BESCHREIBUNG ZU DEN DORFNOTIZ-VORLAGEN REIN`,
            instructions: `HIER GEHÖRT DEINE ANLEITUNG ZU DEN DORFNOTIZ-VORLAGEN REIN`,
            tips: `HIER GEHÖREN DEINE TIPPS ZU DEN DORFNOTIZ-VORLAGEN REIN`,
            notes: `HIER GEHÖREN WICHTIGE HINWEISE ZU DEN DORFNOTIZ-VORLAGEN REIN`
        },
        farmGodExternal: {
            description: `HIER GEHÖRT DEINE BESCHREIBUNG ZU FARMGOD REIN`,
            instructions: `HIER GEHÖRT DEINE ANLEITUNG ZU FARMGOD REIN`,
            tips: `HIER GEHÖREN DEINE TIPPS ZU FARMGOD REIN`,
            notes: `HIER GEHÖREN WICHTIGE HINWEISE ZU FARMGOD REIN`
        },
        botGuard: {
            description: `HIER GEHÖRT DEINE BESCHREIBUNG ZUM BOT-SCHUTZ REIN`,
            instructions: `HIER GEHÖRT DEINE ANLEITUNG ZUM BOT-SCHUTZ REIN`,
            tips: `HIER GEHÖREN DEINE TIPPS ZUM BOT-SCHUTZ REIN`,
            notes: `HIER GEHÖREN WICHTIGE HINWEISE ZUM BOT-SCHUTZ REIN`
        },
        attackOrganizer: {
            description: `HIER GEHÖRT DEINE BESCHREIBUNG ZUM ATTACK ORGANIZER REIN`,
            instructions: `HIER GEHÖRT DEINE ANLEITUNG ZUM ATTACK ORGANIZER REIN`,
            tips: `HIER GEHÖREN DEINE TIPPS ZUM ATTACK ORGANIZER REIN`,
            notes: `HIER GEHÖREN WICHTIGE HINWEISE ZUM ATTACK ORGANIZER REIN`
        },
        dsUiExtended: {
            description: `HIER GEHÖRT DEINE BESCHREIBUNG ZU DS UI ERWEITERT REIN`,
            instructions: `HIER GEHÖRT DEINE ANLEITUNG ZU DS UI ERWEITERT REIN`,
            tips: `HIER GEHÖREN DEINE TIPPS ZU DS UI ERWEITERT REIN`,
            notes: `HIER GEHÖREN WICHTIGE HINWEISE ZU DS UI ERWEITERT REIN`
        },
        dsUltimateVerlaeufe: {
            description: `DS Ultimate Verläufe wird als externes Modul direkt aus der offiziellen Scriptdatenbank geladen.`,
            instructions: `Modul im TW Control Center aktivieren und anschließend eine Spielseite neu laden. Das externe Script entscheidet selbst, auf welchen Ansichten seine Funktionen angezeigt werden.`,
            tips: `Bei einer neuen Scriptversion über das Aktualisieren-Symbol des Moduls einen CacheBust auslösen und die Seite neu laden.`,
            notes: `Das Modul ist standardmäßig deaktiviert. Der Ladeweg „page“ führt das ältere Script im Seitenkontext aus, damit Spielvariablen und vorhandene Seitenbibliotheken erreichbar bleiben.`
        },
        berichteUmbenennen: {
            description: `Das Modul lädt die von uns erstellte Version 5.5 direkt aus deinem GitHub-Repository. Es funktioniert sowohl in einem einzelnen Bericht als auch in der Berichtsübersicht mit mehreren markierten Berichten.`,
            instructions: `Modul aktivieren und die Berichtsseite neu laden. Im Einzelbericht wird der aktuelle Bericht umbenannt und die Dorfnotiz des gegnerischen Dorfes gespeichert oder überschrieben. In der Berichtsübersicht mehrere Berichte markieren und denselben grünen Button starten.`,
            tips: `Nach Änderungen an Berichte-Umbenennen.js den Aktualisieren-Button des Moduls verwenden. Dadurch wird der CacheBust gesetzt und anschließend die aktuelle GitHub-Version geladen.`,
            notes: `Es wird ausschließlich das gemeinsam erstellte Modul verwendet. Die Stapelverarbeitung bleibt auf der Übersicht und arbeitet die markierten Berichte nacheinander über einen unsichtbaren Worker ab.`
        },

        premiumDepotQuickButtons: {
            description: `Fügt direkt bei den BUY-Feldern im Premium-Depot frei konfigurierbare Quick Buttons ein. Jeder Klick bleibt fest an Holz, Lehm oder Eisen gebunden.`,
            instructions: `Modul aktivieren und das Premium-Depot öffnen. Unter Einstellungen können Buttons hinzugefügt, gelöscht, verschoben, ein- oder ausgeblendet sowie Text, Typ und Wert geändert werden.`,
            tips: `Strg + Alt + B schaltet die Auto-Bestätigung dauerhaft ein oder aus. Strg + Alt + I zeigt den Status. Strg + Alt + D schaltet Debug-Markierungen ein oder aus.`,
            notes: `Die Auto-Bestätigung wird ausschließlich unmittelbar nach einem Klick auf einen Quick Button ausgeführt. Einstellungen werden lokal pro Spiel-Domain gespeichert.`
        },
        attackTimerServerMs: {
            description: `HIER GEHÖRT DEINE BESCHREIBUNG ZUM DS ANGRIFF TIMER SERVERMS REIN`,
            instructions: `HIER GEHÖRT DEINE ANLEITUNG ZUM DS ANGRIFF TIMER SERVERMS REIN`,
            tips: `HIER GEHÖREN DEINE TIPPS ZUM DS ANGRIFF TIMER SERVERMS REIN`,
            notes: `HIER GEHÖREN WICHTIGE HINWEISE ZUM DS ANGRIFF TIMER SERVERMS REIN`
        },
        korrikarteProfiles: {
            description: `HIER GEHÖRT DEINE BESCHREIBUNG ZU DEN KORRIKARTE-PROFILEN REIN`,
            instructions: `HIER GEHÖRT DEINE ANLEITUNG ZU DEN KORRIKARTE-PROFILEN REIN`,
            tips: `HIER GEHÖREN DEINE TIPPS ZU DEN KORRIKARTE-PROFILEN REIN`,
            notes: `HIER GEHÖREN WICHTIGE HINWEISE ZU DEN KORRIKARTE-PROFILEN REIN`
        },
        dsSelectVillages: {
            description: `HIER GEHÖRT DEINE BESCHREIBUNG ZU DSSELECTVILLAGES REIN`,
            instructions: `HIER GEHÖRT DEINE ANLEITUNG ZU DSSELECTVILLAGES REIN`,
            tips: `HIER GEHÖREN DEINE TIPPS ZU DSSELECTVILLAGES REIN`,
            notes: `HIER GEHÖREN WICHTIGE HINWEISE ZU DSSELECTVILLAGES REIN`
        }
    });

    const MODULE_CONFLICTS = {
        farmGodExternal: ['fakeGeneratorExternal'],
        fakeGeneratorExternal: ['farmGodExternal']
    };

    function applyModuleConflicts(enabledId) {
        const conflicts = MODULE_CONFLICTS[enabledId] || (Modules[enabledId] && Modules[enabledId].conflicts) || [];
        conflicts.forEach(conflictId => {
            if (core.modules[conflictId] && core.modules[conflictId].enabled) {
                core.modules[conflictId].enabled = false;
                try {
                    ToolboxCore.Notify.warning((Modules[conflictId]?.name || conflictId) + ' wegen Konflikt mit ' + (Modules[enabledId]?.name || enabledId) + ' deaktiviert.');
                } catch(e) {}
            }
            if (tabOverrides[conflictId]) {
                delete tabOverrides[conflictId];
                saveTabOverrides(tabOverrides);
            }
        });
    }

    function isAttackOrganizerPage() {
        const href = location.href;
        return href.includes('screen=overview') ||
            href.includes('screen=place') ||
            href.includes('screen=commands') ||
            href.includes('mode=incomings') ||
            href.includes('subtype=attacks');
    }

    function isDsUiPage() {
        const href = location.href;
        const hostOk = location.hostname.includes('die-staemme.de');
        if (!hostOk) return false;
        return href.includes('screen=place') ||
            href.includes('screen=info_village') ||
            href.includes('screen=overview_villages') ||
            href.includes('screen=report') ||
            href.includes('screen=flags') ||
            (href.includes('screen=ally') && href.includes('mode=members')) ||
            href.includes('/public_report/') ||
            href.includes('screen=settings');
    }

    function isDsSelectVillagesPage() {
        const href = location.href;
        const hostOk = /(^|\.)die-staemme\.de$/.test(location.hostname) || /(^|\.)tribalwars\.de$/.test(location.hostname);
        return hostOk && href.includes('screen=map');
    }

    function getCurrentWorldKey() {
        const m = location.hostname.match(/^([a-z]+\d+)\./i);
        return m ? m[1] : location.hostname;
    }

    function isKorrikartePage() {
        const hostOk = /(^|\.)die-staemme\.de$/.test(location.hostname) || /(^|\.)tribalwars\.de$/.test(location.hostname);
        return hostOk && location.href.includes('screen=map');
    }

    function isAttackTimerServerMsPage() {
        const href = location.href;
        const hostOk = /(^|\.)die-staemme\.de$/.test(location.hostname) || /(^|\.)tribalwars\.de$/.test(location.hostname);
        return hostOk && href.includes('screen=place') && href.includes('try=confirm');
    }

    /*
     * Externe Module besitzen teilweise bewusst unterschiedliche Ladewege.
     * Diese Sonderfälle nicht vereinheitlichen, solange die Module keine
     * gemeinsame, getestete Start-Schnittstelle bereitstellen.
     */
    function loadExternalScript(url, moduleId, loaderMode = 'jquery') {
        const data = core.modules[moduleId] || {};
        const bust = data.cacheBust ? String(data.cacheBust) : '';
        const finalUrl = bust ? url + (url.includes('?') ? '&' : '?') + 'twx_update=' + encodeURIComponent(bust) : url;

        if (loaderMode === 'pageBlob') {
            const old = document.querySelector('script[data-twx-module="' + cssEscape(moduleId) + '"]');
            if (old) old.remove();

            const fetchUrl = finalUrl + (finalUrl.includes('?') ? '&' : '?') + 'twcc_blob=' + Date.now();

            console.log('[TW Control Center] PageBlob lade:', moduleId, fetchUrl);

            fetch(fetchUrl, {
                cache: 'no-store',
                credentials: 'omit',
                mode: 'cors'
            })
                .then(response => {
                    if (!response.ok) throw new Error('HTTP ' + response.status);
                    return response.text();
                })
                .then(code => {
                    const blob = new Blob([
                        code + '\n//# sourceURL=TWCC_' + moduleId + '_page_blob.js'
                    ], { type: 'application/javascript' });

                    const blobUrl = URL.createObjectURL(blob);
                    const s = document.createElement('script');
                    s.dataset.twxModule = moduleId;
                    s.src = blobUrl;
                    s.async = false;
                    s.onload = function () {
                        console.log('[TW Control Center] Modul geladen:', moduleId, '(pageBlob)', code.length);
                        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
                    };
                    s.onerror = function (e) {
                        console.warn('[TW Control Center] Modul konnte nicht geladen werden:', moduleId, e);
                        URL.revokeObjectURL(blobUrl);
                    };
                    (document.head || document.documentElement).appendChild(s);
                })
                .catch(err => {
                    console.warn('[TW Control Center] PageBlob Fehler:', moduleId, err);
                });
            return;
        }

        if (loaderMode === 'fetch') {
            const old = document.querySelector('script[data-twx-module="' + cssEscape(moduleId) + '"]');
            if (old) old.remove();

            const fetchUrl = finalUrl + (finalUrl.includes('?') ? '&' : '?') + 'twcc_fetch=' + Date.now();

            fetch(fetchUrl, { cache: 'no-store', credentials: 'omit', mode: 'cors' })
                .then(response => {
                    if (!response.ok) throw new Error('HTTP ' + response.status);
                    return response.text();
                })
                .then(code => {
                    console.log('[TW Control Center] Modul geladen:', moduleId, '(fetch)', code.length);
                    (new Function(code + '\n//# sourceURL=TWCC_' + moduleId + '_fetched.js'))();
                })
                .catch(err => {
                    console.warn('[TW Control Center] Modul konnte nicht geladen werden:', moduleId, err);
                });
            return;
        }

        if (loaderMode === 'page') {
            // Für alte Scripts mit Tastatur-/Map-Hooks: direkt in den Seiten-Kontext einhängen.
            const old = document.querySelector('script[data-twx-module="' + cssEscape(moduleId) + '"]');
            if (old) old.remove();

            const script = document.createElement('script');
            script.src = finalUrl;
            script.async = false;
            script.dataset.twxModule = moduleId;
            script.onload = () => console.log('[TW Control Center] Modul geladen:', moduleId, '(page)');
            script.onerror = () => console.warn('[TW Control Center] Modul konnte nicht geladen werden:', moduleId);
            (document.head || document.documentElement).appendChild(script);
            return;
        }

        // Standard: jQuery/Tampermonkey-Kontext. Das ist für Attack Organizer kompatibler,
        // weil dessen Buttons über die vorbereiteten win.settings/win.colors erzeugt werden.
        $.getScript(finalUrl)
            .done(() => console.log('[TW Control Center] Modul geladen:', moduleId, '(jquery)'))
            .fail((_, __, err) => console.warn('[TW Control Center] Modul konnte nicht geladen werden:', moduleId, err));
    }

    function forceModuleUpdate(moduleId) {
        core.modules[moduleId] = core.modules[moduleId] || {};
        core.modules[moduleId].cacheBust = Date.now();
        saveJson(CORE_KEY, core);
        location.reload();
    }

    function getModuleState(id) {
        const globalEnabled = !!(core.modules[id] && core.modules[id].enabled);
        const tabMode = tabOverrides[id] || 'global'; // global, forceOn, forceOff
        let effective = globalEnabled;
        if (tabMode === 'forceOn') effective = true;
        if (tabMode === 'forceOff') effective = false;
        return { globalEnabled, tabMode, effective };
    }

    function setGlobalEnabled(id, enabled) {
        core.modules[id] = core.modules[id] || {};
        core.modules[id].enabled = !!enabled;
        if (enabled) applyModuleConflicts(id);
        saveJson(CORE_KEY, core);
    }

    function setTabMode(id, mode) {
        if (mode === 'global') delete tabOverrides[id];
        else tabOverrides[id] = mode;
        if (mode === 'forceOn') applyModuleConflicts(id);
        saveTabOverrides(tabOverrides);
    }

    function initActiveModules() {
        Object.values(Modules).forEach(mod => {
            if (!getModuleState(mod.id).effective) return;
            if (mod.id !== 'botGuard' && getModuleState('botGuard').effective && typeof BotGuard !== 'undefined' && BotGuard.isActive()) return;
            mod.init();
        });
    }

    GM_addStyle(`
        :root {
            /* TWCC Classic – aktuell nur zentrale Farbquelle, optisch unverändert */
            --twcc-window-bg: #f4e4bc;
            --twcc-window-surface: #fffaf0;
            --twcc-window-header: #6f4e2e;
            --twcc-window-border: #b89563;
            --twcc-window-text: #3b250f;
            --twcc-window-text-strong: #2f1d07;
            --twcc-button-bg: #dfc28c;
            --twcc-section-bg: #d7bd86;
            --twcc-header-text: #ffffff;
            --twcc-overlay-light: rgba(255,255,255,.18);
            --twcc-overlay-lighter: rgba(255,255,255,.22);
            --twcc-overlay-subtle: rgba(255,255,255,.10);
            --twcc-header-overlay: rgba(111,78,46,.13);
            --twcc-soft-border: rgba(120,80,35,.28);
            --twcc-log-bg: #2f1d07;
            --twcc-log-text: #f8e7bd;
        }
        .twx-btn { border:1px solid var(--twcc-window-header); border-radius:5px; background:var(--twcc-button-bg); color:var(--twcc-window-text); font-weight:bold; cursor:pointer; padding:5px 8px; }
        .twx-input, .twx-select { box-sizing:border-box; width:100%; border:1px solid var(--twcc-window-border); border-radius:4px; padding:4px; background:var(--twcc-window-surface); color:var(--twcc-window-text); }
        #twx-master-toggle { position:fixed; right:12px; top:90px; z-index:99998; padding:7px 11px; border:1px solid var(--twcc-window-header); border-radius:6px; background:var(--twcc-window-bg); color:var(--twcc-window-text); font-weight:bold; cursor:pointer; box-shadow:0 2px 8px rgba(0,0,0,.25); }
        .twx-panel { position:fixed; z-index:99999; background:var(--twcc-window-bg); color:var(--twcc-window-text); border:2px solid var(--twcc-window-header); border-radius:7px; box-shadow:0 4px 18px rgba(0,0,0,.35); resize:both; overflow:auto; font-family:Arial,sans-serif; min-width:360px; min-height:230px; }
        .twx-hidden { display:none !important; }
        .twx-header { cursor:move; padding:8px 10px; background:var(--twcc-window-header); color:var(--twcc-header-text); font-weight:bold; display:flex; justify-content:space-between; align-items:center; user-select:none; }
        .twx-close { cursor:pointer; padding:1px 7px; border-radius:4px; background:var(--twcc-overlay-light); }
        .twx-body { padding:10px; }
        .twx-master-toolbar { display:flex; gap:6px; align-items:center; margin-bottom:8px; }
        .twx-search { flex:1; box-sizing:border-box; border:1px solid var(--twcc-window-border); border-radius:6px; padding:7px 8px; background:var(--twcc-window-surface); color:var(--twcc-window-text); }
        .twx-category { margin:8px 0 10px; border:1px solid var(--twcc-window-border); border-radius:7px; background:var(--twcc-overlay-light); overflow:hidden; }
        .twx-category-head { display:flex; justify-content:space-between; align-items:center; padding:7px 9px; background:var(--twcc-section-bg); font-weight:bold; cursor:pointer; user-select:none; }
        .twx-category-body { padding:0 8px; }
        .twx-category.collapsed .twx-category-body { display:none; }
        .twx-module-row { display:grid; grid-template-columns: 1fr 64px 86px 30px 30px 30px 30px 30px; gap:6px; align-items:center; padding:7px 0; border-bottom:1px solid var(--twcc-window-border); }
        .twx-module-row:last-child { border-bottom:0; }
        .twx-module-name { font-weight:bold; display:flex; align-items:center; gap:5px; }
        .twx-status { font-size:11px; opacity:.85; margin-top:2px; }
        .twx-fav { font-size:16px; padding:3px 5px; }
        .twx-info-box { line-height:1.45; }
        .twcc-info-section { margin:10px 0; padding:10px; border:1px solid var(--twcc-window-border); border-radius:7px; background:var(--twcc-overlay-light); }
        .twcc-info-section h4 { margin:0 0 7px; }
        .twcc-info-text { white-space:pre-wrap; line-height:1.55; }
        .twcc-general-brand { text-align:center; padding:12px 10px 16px; margin-bottom:12px; border:1px solid var(--twcc-window-border); border-radius:10px; background:var(--twcc-overlay-light); }
        .twcc-general-logo { display:block; width:min(250px,80%); max-height:180px; object-fit:contain; margin:0 auto 8px; filter:drop-shadow(0 7px 14px rgba(0,0,0,.28)); }
        .twcc-general-title { font-size:22px; font-weight:800; color:var(--twcc-window-text-strong); }
        .twcc-general-version { margin-top:4px; font-size:12px; opacity:.78; }
        .twx-pill { display:inline-block; padding:2px 6px; border-radius:10px; background:var(--twcc-section-bg); margin:2px 4px 2px 0; font-size:11px; }
        .twx-switch { position:relative; display:inline-block; width:58px; height:26px; }
        .twx-switch input { opacity:0; width:0; height:0; }
        .twx-slider { position:absolute; cursor:pointer; inset:0; background:#9b3a2d; transition:.2s; border-radius:20px; border:1px solid rgba(0,0,0,.25); }
        .twx-slider:before { position:absolute; content:''; height:20px; width:20px; left:3px; bottom:2px; background:white; transition:.2s; border-radius:50%; box-shadow:0 1px 3px rgba(0,0,0,.35); }
        .twx-switch input:checked + .twx-slider { background:#2d9b3a; }
        .twx-switch input:checked + .twx-slider:before { transform:translateX(31px); }
        .twx-small { font-size:11px; opacity:.85; margin-top:8px; line-height:1.35; }
        #twx-botguard-banner { position:fixed; left:0; right:0; top:0; z-index:2147483647; background:rgba(198,40,40,.96); color:var(--twcc-header-text); padding:10px 12px; font-size:14px; box-shadow:0 4px 12px rgba(0,0,0,.35); display:none; user-select:none; }
        #botguard-gui-panel { min-width:380px; min-height:230px; }
        #ao-gui-panel { min-width:440px; min-height:290px; }
        .ao-top-grid { display:grid; grid-template-columns:120px 1fr 80px 1fr; gap:8px; align-items:center; margin-bottom:12px; }
        .ao-row { display:grid; grid-template-columns:28px 1.35fr .75fr 130px .65fr .65fr .65fr; gap:6px; align-items:center; margin-bottom:6px; padding:4px; border-radius:4px; }
        .ao-row[data-mode='replace'] { background:rgba(74,120,190,.12); border-left:4px solid #4a78be; }
        .ao-row[data-mode='append'] { background:rgba(46,145,74,.12); border-left:4px solid #2e914a; }
        .ao-drag { cursor:grab; user-select:none; text-align:center; font-size:18px; font-weight:bold; opacity:.75; }
        .ao-drag:active { cursor:grabbing; }
        .ao-row.ao-dragging { opacity:.45; }
        .ao-mode { min-width:120px; }
        .ao-head { font-weight:bold; border-bottom:1px solid var(--twcc-window-border); padding-bottom:3px; }
        #ao-gui-panel input[type='color'] { padding:1px; height:28px; }
        .ao-actions { display:flex; gap:8px; margin-top:12px; flex-wrap:wrap; }

        #kori-gui-panel { min-width:540px; min-height:390px; }
        .kori-editor { width:100%; height:390px; box-sizing:border-box; resize:both; overflow:auto; font-family:Consolas,Monaco,monospace; font-size:12px; background:var(--twcc-window-surface); color:var(--twcc-window-text-strong); border:1px solid var(--twcc-window-border); border-radius:6px; padding:8px; }
        .kori-grid { display:grid; grid-template-columns:120px 1fr; gap:8px; align-items:center; margin-bottom:8px; }

        .twx-category-block { margin:8px 0; border:1px solid var(--twcc-soft-border); border-radius:8px; overflow:hidden; background:var(--twcc-overlay-subtle); }
        .twx-category-header { cursor:grab; user-select:none; padding:7px 8px; background:var(--twcc-header-overlay); display:flex; align-items:center; justify-content:space-between; font-weight:800; }
        .twx-category-title { display:flex; align-items:center; gap:6px; }
        .twx-category-toggle { width:18px; display:inline-block; text-align:center; cursor:pointer; }
        .twx-category-handle { opacity:.75; cursor:grab; }
        .twx-category-count { font-size:11px; opacity:.75; font-weight:600; }
        .twx-category-body.twx-collapsed { display:none; }
        .twx-category-block.twx-dragging { opacity:.55; }

        .twx-tool-section { border:1px solid var(--twcc-window-border); border-radius:7px; background:var(--twcc-overlay-lighter); padding:8px; margin:8px 0; }
        .twx-tool-section h4 { margin:0 0 7px 0; }
        .twx-tool-grid { display:grid; grid-template-columns:1fr 1fr; gap:7px; }
        .twx-textarea { width:100%; min-height:180px; box-sizing:border-box; border:1px solid var(--twcc-window-border); border-radius:6px; padding:7px; background:var(--twcc-window-surface); color:var(--twcc-window-text); font-family:Consolas,Monaco,monospace; font-size:12px; }

        .twx-toast { position:fixed; right:20px; bottom:20px; z-index:2147483647; background:var(--twcc-window-header); color:var(--twcc-header-text); padding:10px 14px; border-radius:8px; font-weight:bold; box-shadow:0 2px 10px rgba(0,0,0,.28); transition:opacity .25s; }
        .twx-toast.twx-toast-success { background:#2d7f38; }
        .twx-toast.twx-toast-error { background:#a73428; }
        .twx-toast.twx-toast-warning { background:#9a6d18; }

        .twcc-header-actions { display:flex; gap:6px; align-items:center; }
        .twcc-header-icon { min-width:28px; padding:2px 7px; line-height:20px; }
        .twcc-settings-layout { display:grid; grid-template-columns:170px minmax(0,1fr); gap:12px; min-height:340px; }
        .twcc-settings-nav { border-right:1px solid var(--twcc-window-border); padding-right:10px; }
        .twcc-settings-nav button { width:100%; text-align:left; margin-bottom:6px; }
        .twcc-settings-nav button.active { background:var(--twcc-window-header); color:var(--twcc-header-text); }
        .twcc-settings-page { display:none; }
        .twcc-settings-page.active { display:block; }
        .twcc-theme-card { border:1px solid var(--twcc-window-border); border-radius:7px; padding:10px; margin-bottom:10px; background:var(--twcc-overlay-light); }
        .twcc-window-theme-row { display:grid; grid-template-columns:minmax(160px,1fr) 150px 34px; gap:8px; align-items:center; padding:7px 0; border-bottom:1px solid var(--twcc-soft-border); }
        .twcc-window-theme-row:last-child { border-bottom:0; }
        .twcc-settings-note { font-size:11px; opacity:.78; line-height:1.4; }

        .twcc-custom-editor { display:none; }
        .twcc-custom-editor.active { display:block; }
        .twcc-color-grid { display:grid; grid-template-columns:minmax(150px,1fr) 86px 92px; gap:7px 10px; align-items:center; margin-top:10px; }
        .twcc-color-grid input[type='color'] { width:86px; height:30px; padding:1px; border:1px solid var(--twcc-window-border); border-radius:5px; background:var(--twcc-window-surface); cursor:pointer; }
        .twcc-color-value { font-family:Consolas,Monaco,monospace; font-size:11px; text-align:center; }
        .twcc-theme-preview { margin-top:12px; border:2px solid var(--twcc-window-border); border-radius:7px; overflow:hidden; background:var(--twcc-window-bg); color:var(--twcc-window-text); }
        .twcc-theme-preview-head { padding:7px 9px; background:var(--twcc-window-header); color:var(--twcc-header-text); font-weight:bold; }
        .twcc-theme-preview-body { padding:9px; background:var(--twcc-window-bg); }
        .twcc-theme-preview-surface { padding:8px; border:1px solid var(--twcc-window-border); border-radius:5px; background:var(--twcc-window-surface); }
        .twcc-theme-preview-actions { display:flex; gap:7px; flex-wrap:wrap; margin-top:8px; }
        .twcc-theme-editor-actions { display:flex; gap:8px; flex-wrap:wrap; margin-top:12px; }

        /* TWCC UI Polish */
        .twx-panel,
        #twx-master-panel,
        #tw-arrival-panel,
        #twcc-dsu-executor {
            transition: background-color .18s ease, color .18s ease, border-color .18s ease, box-shadow .18s ease, opacity .15s ease;
        }
        .twx-btn,
        .twx-input,
        .twx-select,
        .twx-search,
        .twx-textarea,
        .twcc-color-grid input[type='color'] {
            transition: background-color .16s ease, color .16s ease, border-color .16s ease, box-shadow .16s ease, transform .12s ease;
        }
        .twx-btn:hover { filter:brightness(1.04); transform:translateY(-1px); }
        .twx-btn:active { transform:translateY(0); }
        .twx-btn:focus-visible,
        .twx-input:focus-visible,
        .twx-select:focus-visible,
        .twx-search:focus-visible,
        .twx-textarea:focus-visible,
        .twcc-color-grid input[type='color']:focus-visible {
            outline:2px solid var(--twcc-window-header);
            outline-offset:2px;
            box-shadow:0 0 0 3px var(--twcc-overlay-light);
        }
        .twx-header,
        .twcc-theme-preview-head { transition:background-color .18s ease, color .18s ease; }
        .twx-category,
        .twx-tool-section,
        .twcc-theme-card,
        .twcc-theme-preview,
        .twcc-theme-preview-surface { transition:background-color .18s ease, border-color .18s ease, color .18s ease; }
        .twx-panel::-webkit-scrollbar,
        #tw-arrival-panel::-webkit-scrollbar,
        #twcc-dsu-executor::-webkit-scrollbar { width:10px; height:10px; }
        .twx-panel::-webkit-scrollbar-thumb,
        #tw-arrival-panel::-webkit-scrollbar-thumb,
        #twcc-dsu-executor::-webkit-scrollbar-thumb { background:var(--twcc-window-border); border-radius:10px; border:2px solid var(--twcc-window-bg); }
        .twx-panel::-webkit-scrollbar-track,
        #tw-arrival-panel::-webkit-scrollbar-track,
        #twcc-dsu-executor::-webkit-scrollbar-track { background:var(--twcc-window-bg); }
        [data-twcc-theme] input:not([type='checkbox']):not([type='radio']),
        [data-twcc-theme] textarea,
        [data-twcc-theme] select {
            color-scheme:light;
        }
        [data-twcc-theme='dark'] input:not([type='checkbox']):not([type='radio']),
        [data-twcc-theme='dark'] textarea,
        [data-twcc-theme='dark'] select { color-scheme:dark; }
        @media (max-width:760px) {
            .twcc-settings-layout { grid-template-columns:1fr; }
            .twcc-settings-nav { border-right:0; border-bottom:1px solid var(--twcc-window-border); padding-right:0; padding-bottom:6px; display:flex; gap:6px; overflow:auto; }
            .twcc-settings-nav button { width:auto; white-space:nowrap; margin-bottom:0; }
            .twcc-color-grid { grid-template-columns:minmax(120px,1fr) 78px 84px; }
        }
        @media (prefers-reduced-motion:reduce) {
            .twx-panel, #twx-master-panel, #tw-arrival-panel, #twcc-dsu-executor,
            .twx-btn, .twx-input, .twx-select, .twx-search, .twx-textarea,
            .twx-header, .twcc-theme-card, .twcc-theme-preview { transition:none !important; }
        }

        /* Phase 2 Fix 1: externe Fenster mit fest eingebauten Farben */
        #tw-arrival-panel[data-twcc-theme="dark"],
        #twcc-dsu-executor[data-twcc-theme="dark"] {
            background:#25282d !important;
            border-color:#606772 !important;
            color:#eceff3 !important;
        }

        #tw-arrival-panel[data-twcc-theme="dark"] input,
        #tw-arrival-panel[data-twcc-theme="dark"] textarea,
        #tw-arrival-panel[data-twcc-theme="dark"] select,
        #twcc-dsu-executor[data-twcc-theme="dark"] input,
        #twcc-dsu-executor[data-twcc-theme="dark"] textarea,
        #twcc-dsu-executor[data-twcc-theme="dark"] select {
            background:#34383f !important;
            border-color:#606772 !important;
            color:#eceff3 !important;
        }

        #tw-arrival-panel[data-twcc-theme="dark"] div[style*="background:#d8ffd2"],
        #tw-arrival-panel[data-twcc-theme="dark"] div[style*="background: #d8ffd2"] {
            background:#33463a !important;
            border-color:#577760 !important;
            color:#e7f3e9 !important;
        }

        #tw-arrival-panel[data-twcc-theme="dark"] div[style*="background:#efd59c"],
        #tw-arrival-panel[data-twcc-theme="dark"] div[style*="background: #efd59c"],
        #twcc-dsu-executor[data-twcc-theme="dark"] div[style*="background:#efd59c"],
        #twcc-dsu-executor[data-twcc-theme="dark"] div[style*="background: #efd59c"] {
            background:#3b414a !important;
            border-color:#606772 !important;
        }

        #tw-arrival-panel[data-twcc-theme="dark"] button:not([style*="background:#299b2f"]):not([style*="background:#bc3434"]),
        #twcc-dsu-executor[data-twcc-theme="dark"] button:not([style*="background:#299b2f"]):not([style*="background:#bc3434"]) {
            background:#4b515b !important;
            border-color:#606772 !important;
            color:#ffffff !important;
        }
        .twx-log-box { margin-top:8px; background:var(--twcc-log-bg); color:var(--twcc-log-text); padding:8px; border-radius:6px; font-size:11px; max-height:120px; overflow:auto; white-space:pre-wrap; }
    `);

    // =============================
    // Core API v1: Window / Notify / Log / Storage
    // =============================
    const ToolboxCore = (function () {
        const WINDOW_STORE_KEY = 'TW_TOOLBOX_WINDOWS_V1';
        const LOG_STORE_KEY = 'TW_TOOLBOX_LOGS_V1';

        function loadWindowStore() { return loadJson(WINDOW_STORE_KEY, {}); }
        function saveWindowStore(store) { saveJson(WINDOW_STORE_KEY, store || {}); }
        function getWindowState(id) {
            const store = loadWindowStore();
            return store[id] || {};
        }
        function setWindowState(id, state) {
            const store = loadWindowStore();
            store[id] = Object.assign({}, store[id] || {}, state || {});
            saveWindowStore(store);
        }

        function notify(message, type = 'info', timeout = 2200) {
            let el = document.getElementById('twx-core-toast');
            if (!el) {
                el = document.createElement('div');
                el.id = 'twx-core-toast';
                document.body.appendChild(el);
            }
            el.className = 'twx-toast twx-toast-' + type;
            el.textContent = message;
            el.style.opacity = '1';
            clearTimeout(el._twxTimer);
            el._twxTimer = setTimeout(() => { el.style.opacity = '0'; }, timeout);
        }

        function getLogs(id) {
            const all = Storage.getJson(LOG_STORE_KEY, {});
            return Array.isArray(all[id]) ? all[id] : [];
        }

        function setLogs(id, logs) {
            const all = Storage.getJson(LOG_STORE_KEY, {});
            all[id] = (logs || []).slice(0, 80);
            Storage.setJson(LOG_STORE_KEY, all);
        }
        function log(id, message) {
            const d = new Date();
            const stamp = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0');
            const logs = getLogs(id);
            logs.unshift('[' + stamp + '] ' + message);
            setLogs(id, logs);
            const box = document.querySelector('[data-twx-log="' + cssEscape(id) + '"]');
            if (box) box.textContent = logs.slice(0, 40).join('\n') || '—';
        }

        function createWindow(options) {
            const opts = Object.assign({ width: 460, height: 300, left: null, top: 120, resizable: true, hidden: false }, options || {});
            if (!opts.id) throw new Error('Toolbox.Window.create braucht eine id');
            const existing = document.getElementById('twx-window-' + opts.id);
            if (existing) return existing;

            const saved = getWindowState(opts.id);
            const panel = document.createElement('div');
            panel.id = 'twx-window-' + opts.id;
            panel.className = 'twx-panel' + (saved.hidden || opts.hidden ? ' twx-hidden' : '');
            panel.style.width = (saved.width || opts.width) + 'px';
            panel.style.height = (saved.height || opts.height) + 'px';
            panel.style.left = (saved.left ?? opts.left ?? Math.max(20, window.innerWidth - (opts.width + 40))) + 'px';
            panel.style.top = (saved.top ?? opts.top) + 'px';
            if (!opts.resizable) panel.style.resize = 'none';
            panel.innerHTML = `
                <div class="twx-header" id="twx-window-header-${escapeHtml(opts.id)}">
                    <span>${escapeHtml(opts.title || opts.id)}</span>
                    <span class="twx-close" data-twx-close="${escapeHtml(opts.id)}">×</span>
                </div>
                <div class="twx-body" id="twx-window-body-${escapeHtml(opts.id)}"></div>`;
            document.body.appendChild(panel);

            const body = panel.querySelector('.twx-body');
            if (typeof opts.content === 'string') body.innerHTML = opts.content;
            else if (opts.content instanceof Node) body.appendChild(opts.content);
            else if (typeof opts.render === 'function') opts.render(body, panel);

            const save = () => {
                const rect = panel.getBoundingClientRect();
                setWindowState(opts.id, {
                    left: Math.max(0, Math.round(rect.left)),
                    top: Math.max(0, Math.round(rect.top)),
                    width: Math.round(rect.width),
                    height: Math.round(rect.height),
                    hidden: panel.classList.contains('twx-hidden')
                });
            };
            makeDraggable(panel, panel.querySelector('.twx-header'), save);
            observeResize(panel, save);
            panel.querySelector('[data-twx-close]').addEventListener('click', () => {
                panel.classList.add('twx-hidden');
                save();
            });
            return panel;
        }

        function toggleWindow(id, show = null) {
            const panel = document.getElementById('twx-window-' + id);
            if (!panel) return;
            if (show === null) panel.classList.toggle('twx-hidden');
            else panel.classList.toggle('twx-hidden', !show);
            const rect = panel.getBoundingClientRect();
            setWindowState(id, {
                left: Math.max(0, Math.round(rect.left)),
                top: Math.max(0, Math.round(rect.top)),
                width: Math.round(rect.width),
                height: Math.round(rect.height),
                hidden: panel.classList.contains('twx-hidden')
            });
        }

        return {
            Window: { create: createWindow, toggle: toggleWindow, getState: getWindowState, setState: setWindowState },
            Notify: { info: (m) => notify(m, 'info'), success: (m) => notify(m, 'success'), warning: (m) => notify(m, 'warning'), error: (m) => notify(m, 'error') },
            Log: { add: log, get: getLogs, set: setLogs },
            Storage,
            version: 'core-window-v1'
        };
    })();

    win.TWToolbox = ToolboxCore;

    // ==========================================================
    // TWCC v2.4.0: zentrale Modul-Import/Export-Engine
    // ==========================================================
    const TWCC_EXPORT_FORMAT = 'twcc-module-export';
    const TWCC_EXPORT_FORMAT_VERSION = 1;

    function normalizeModuleId(moduleName) {
        const value = String(moduleName || '').trim();
        if (!value || !/^[a-zA-Z0-9_-]+$/.test(value)) {
            throw new Error('Ungültiger Modulname. Erlaubt sind Buchstaben, Zahlen, _ und -.');
        }
        return value;
    }

    function safeExportFilename(value) {
        return String(value || 'TWCC_Export')
            .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
            .replace(/\s+/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_+|_+$/g, '') || 'TWCC_Export';
    }

    function createModuleExport(moduleName, data, options = {}) {
        const moduleId = normalizeModuleId(moduleName);
        const moduleInfo = Modules[moduleId] || {};
        return {
            format: TWCC_EXPORT_FORMAT,
            formatVersion: TWCC_EXPORT_FORMAT_VERSION,
            twccVersion: TWCC_VERSION,
            module: moduleId,
            moduleName: options.moduleLabel || moduleInfo.name || moduleId,
            moduleVersion: String(options.moduleVersion || moduleInfo.version || 'unbekannt'),
            exportedAt: new Date().toISOString(),
            world: options.includeWorld === false ? undefined : getCurrentWorldKey(),
            data: deepClone(data)
        };
    }

    function validateModuleExport(payload, expectedModule, options = {}) {
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
            throw new Error('Die gewählte Datei enthält kein gültiges TWCC-Exportobjekt.');
        }
        if (payload.format !== TWCC_EXPORT_FORMAT) {
            throw new Error('Diese Datei ist kein TWCC-Modul-Export.');
        }
        if (Number(payload.formatVersion) !== TWCC_EXPORT_FORMAT_VERSION) {
            throw new Error('Nicht unterstützte Exportformat-Version: ' + String(payload.formatVersion ?? 'unbekannt') + '.');
        }
        const expected = normalizeModuleId(expectedModule);
        if (payload.module !== expected) {
            const actualName = payload.moduleName || payload.module || 'unbekannt';
            const expectedName = options.moduleLabel || Modules[expected]?.name || expected;
            throw new Error('Falsche Moduldatei: „' + actualName + '“ kann nicht in „' + expectedName + '“ importiert werden.');
        }
        if (!Object.prototype.hasOwnProperty.call(payload, 'data')) {
            throw new Error('Der Export enthält keine Moduldaten.');
        }
        if (typeof options.validateData === 'function') {
            const result = options.validateData(deepClone(payload.data), payload);
            if (result === false) throw new Error('Die Moduldaten wurden vom Modul abgelehnt.');
            if (typeof result === 'string') throw new Error(result);
        }
        return payload;
    }

    function downloadModuleTransferFile(payload, options = {}) {
        const json = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
        const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
        const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        const label = options.fileName || parsed.moduleName || parsed.module || 'TWCC_Export';
        anchor.href = url;
        anchor.download = safeExportFilename(label) + '.json';
        anchor.style.display = 'none';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
    }

    function showModuleTransferDialog(mode, config = {}) {
        document.getElementById('twcc-module-transfer-dialog')?.remove();
        const isExport = mode === 'export';
        const overlay = document.createElement('div');
        overlay.id = 'twcc-module-transfer-dialog';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:1000005;background:rgba(0,0,0,.58);display:flex;align-items:center;justify-content:center;padding:20px;';
        const moduleLabel = String(config.moduleLabel || config.moduleName || 'TWCC-Modul');
        overlay.innerHTML = `
            <div class="twx-panel" style="position:relative;display:block;width:min(780px,96vw);height:auto;max-height:92vh;overflow:auto;left:auto;top:auto;resize:none;">
                <div class="twx-header"><span>${escapeHtml(isExport ? moduleLabel + ' – Export' : moduleLabel + ' – Import')}</span><span class="twx-close" id="twcc-transfer-close">×</span></div>
                <div class="twx-body">
                    <div style="margin-bottom:8px;line-height:1.45;">${isExport
                        ? 'Diesen Text kopieren und weitergeben. Alternativ kann er als JSON-Datei gespeichert werden.'
                        : 'Übergabetext einfügen oder eine zuvor gespeicherte JSON-Datei auswählen.'}</div>
                    <textarea id="twcc-transfer-text" class="twx-input" style="width:100%;height:330px;box-sizing:border-box;font:12px monospace;white-space:pre;resize:vertical;" placeholder="TWCC-Übergabedaten hier einfügen ...">${escapeHtml(config.initialText || '')}</textarea>
                    <div class="ao-actions" style="margin-top:9px;">
                        ${isExport
                            ? '<button class="twx-btn" id="twcc-transfer-copy">📋 In Zwischenablage kopieren</button><button class="twx-btn" id="twcc-transfer-download">💾 JSON herunterladen</button>'
                            : '<button class="twx-btn" id="twcc-transfer-apply">📥 Importieren</button><button class="twx-btn" id="twcc-transfer-file">📁 JSON-Datei auswählen</button><input id="twcc-transfer-file-input" type="file" accept="application/json,.json,.twcc,.txt" style="display:none;">'}
                        <button class="twx-btn" id="twcc-transfer-cancel">Schließen</button>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(overlay);

        const textArea = overlay.querySelector('#twcc-transfer-text');
        const close = () => overlay.remove();
        overlay.querySelector('#twcc-transfer-close').addEventListener('click', close);
        overlay.querySelector('#twcc-transfer-cancel').addEventListener('click', close);
        overlay.addEventListener('click', event => { if (event.target === overlay) close(); });

        if (isExport) {
            overlay.querySelector('#twcc-transfer-copy').addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(textArea.value);
                } catch (_) {
                    textArea.focus();
                    textArea.select();
                    document.execCommand('copy');
                }
                ToolboxCore.Notify.success(moduleLabel + ': Übergabetext kopiert.');
            });
            overlay.querySelector('#twcc-transfer-download').addEventListener('click', () => {
                try {
                    downloadModuleTransferFile(textArea.value, config.options || {});
                    ToolboxCore.Notify.success(moduleLabel + ' wurde als JSON gespeichert.');
                } catch (error) {
                    ToolboxCore.Notify.error('Download fehlgeschlagen: ' + (error?.message || error));
                }
            });
        } else {
            const fileInput = overlay.querySelector('#twcc-transfer-file-input');
            overlay.querySelector('#twcc-transfer-file').addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', async () => {
                const file = fileInput.files?.[0];
                if (!file) return;
                textArea.value = await file.text();
            });
            overlay.querySelector('#twcc-transfer-apply').addEventListener('click', async () => {
                try {
                    await config.onImport(textArea.value);
                    close();
                } catch (_) {}
            });
        }
        setTimeout(() => { textArea.focus(); if (isExport) textArea.select(); }, 0);
        return overlay;
    }

    function exportModule(moduleName, data, options = {}) {
        try {
            const payload = createModuleExport(moduleName, data, options);
            showModuleTransferDialog('export', {
                moduleLabel: payload.moduleName || payload.module,
                initialText: JSON.stringify(payload, null, 2),
                options
            });
            return payload;
        } catch (error) {
            console.error('[TWCC Import/Export] Export fehlgeschlagen:', error);
            ToolboxCore.Notify.error('Export fehlgeschlagen: ' + (error?.message || error));
            return null;
        }
    }

    function importModule(moduleName, callback, options = {}) {
        let expectedModule;
        try {
            expectedModule = normalizeModuleId(moduleName);
        } catch (error) {
            ToolboxCore.Notify.error(error.message);
            return Promise.reject(error);
        }

        return new Promise((resolve, reject) => {
            const displayName = options.moduleLabel || Modules[expectedModule]?.name || expectedModule;
            showModuleTransferDialog('import', {
                moduleLabel: displayName,
                async onImport(raw) {
                    try {
                        if (!String(raw || '').trim()) throw new Error('Bitte zuerst Übergabetext einfügen oder eine Datei auswählen.');
                        let payload;
                        try {
                            payload = JSON.parse(raw);
                        } catch (_) {
                            throw new Error('Der Übergabetext enthält kein gültiges JSON.');
                        }
                        validateModuleExport(payload, expectedModule, options);
                        const importedData = deepClone(payload.data);
                        let callbackResult = importedData;
                        if (typeof callback === 'function') callbackResult = await callback(importedData, payload);
                        ToolboxCore.Notify.success(displayName + ' wurde importiert.');
                        resolve({ data: importedData, payload, result: callbackResult });
                        return callbackResult;
                    } catch (error) {
                        console.error('[TWCC Import/Export] Import fehlgeschlagen:', error);
                        ToolboxCore.Notify.error('Import fehlgeschlagen: ' + (error?.message || error));
                        reject(error);
                        throw error;
                    }
                }
            });
        });
    }

    const TWCCModuleTransfer = Object.freeze({
        format: TWCC_EXPORT_FORMAT,
        formatVersion: TWCC_EXPORT_FORMAT_VERSION,
        createExport: createModuleExport,
        validateExport: validateModuleExport,
        exportModule,
        importModule
    });

    // Öffentliche API für interne und extern geladene Module.
    win.TWCC = Object.assign(win.TWCC || {}, {
        version: TWCC_VERSION,
        exportModule,
        importModule,
        ModuleTransfer: TWCCModuleTransfer
    });
    ToolboxCore.ModuleTransfer = TWCCModuleTransfer;


    // ==========================================================
    // Theme Engine Phase 1: zentrale Themes + öffentliche Modul-API
    // ==========================================================
    const TWCC_THEME_KEY = 'TWCC_THEME_SETTINGS_V1';

    const TWCC_THEMES = Object.freeze({
        classic: {
            label: 'Classic',
            vars: {
                '--twcc-window-bg': '#f4e4bc',
                '--twcc-window-surface': '#fffaf0',
                '--twcc-window-header': '#6f4e2e',
                '--twcc-window-border': '#b89563',
                '--twcc-window-text': '#3b250f',
                '--twcc-window-text-strong': '#2f1d07',
                '--twcc-button-bg': '#dfc28c',
                '--twcc-section-bg': '#d7bd86',
                '--twcc-header-text': '#ffffff',
                '--twcc-overlay-light': 'rgba(255,255,255,.18)',
                '--twcc-overlay-lighter': 'rgba(255,255,255,.22)',
                '--twcc-overlay-subtle': 'rgba(255,255,255,.10)',
                '--twcc-header-overlay': 'rgba(111,78,46,.13)',
                '--twcc-soft-border': 'rgba(120,80,35,.28)',
                '--twcc-log-bg': '#2f1d07',
                '--twcc-log-text': '#f8e7bd'
            }
        },
        dark: {
            label: 'Dunkel',
            vars: {
                '--twcc-window-bg': '#25282d',
                '--twcc-window-surface': '#34383f',
                '--twcc-window-header': '#111318',
                '--twcc-window-border': '#606772',
                '--twcc-window-text': '#eceff3',
                '--twcc-window-text-strong': '#ffffff',
                '--twcc-button-bg': '#4b515b',
                '--twcc-section-bg': '#3b414a',
                '--twcc-header-text': '#ffffff',
                '--twcc-overlay-light': 'rgba(255,255,255,.07)',
                '--twcc-overlay-lighter': 'rgba(255,255,255,.10)',
                '--twcc-overlay-subtle': 'rgba(255,255,255,.05)',
                '--twcc-header-overlay': 'rgba(0,0,0,.25)',
                '--twcc-soft-border': 'rgba(255,255,255,.18)',
                '--twcc-log-bg': '#0d0f12',
                '--twcc-log-text': '#dce3eb'
            }
        },
        blue: {
            label: 'Blau',
            vars: {
                '--twcc-window-bg': '#dce9f5',
                '--twcc-window-surface': '#f5f9fd',
                '--twcc-window-header': '#1f4f78',
                '--twcc-window-border': '#6f96b8',
                '--twcc-window-text': '#17324a',
                '--twcc-window-text-strong': '#0d2539',
                '--twcc-button-bg': '#a9c9e3',
                '--twcc-section-bg': '#8fb7d8',
                '--twcc-header-text': '#ffffff',
                '--twcc-overlay-light': 'rgba(255,255,255,.36)',
                '--twcc-overlay-lighter': 'rgba(255,255,255,.48)',
                '--twcc-overlay-subtle': 'rgba(31,79,120,.07)',
                '--twcc-header-overlay': 'rgba(31,79,120,.15)',
                '--twcc-soft-border': 'rgba(31,79,120,.28)',
                '--twcc-log-bg': '#102b43',
                '--twcc-log-text': '#dceeff'
            }
        },
        green: {
            label: 'Grün',
            vars: {
                '--twcc-window-bg': '#dfe9cf',
                '--twcc-window-surface': '#f4f7ec',
                '--twcc-window-header': '#355f35',
                '--twcc-window-border': '#7f9f69',
                '--twcc-window-text': '#233b21',
                '--twcc-window-text-strong': '#172b16',
                '--twcc-button-bg': '#b6cf98',
                '--twcc-section-bg': '#9fbd7d',
                '--twcc-header-text': '#ffffff',
                '--twcc-overlay-light': 'rgba(255,255,255,.32)',
                '--twcc-overlay-lighter': 'rgba(255,255,255,.44)',
                '--twcc-overlay-subtle': 'rgba(53,95,53,.07)',
                '--twcc-header-overlay': 'rgba(53,95,53,.15)',
                '--twcc-soft-border': 'rgba(53,95,53,.28)',
                '--twcc-log-bg': '#20391f',
                '--twcc-log-text': '#e5f1d9'
            }
        },
        custom: {
            label: 'Eigenes Theme…',
            placeholder: true,
            vars: {
                '--twcc-window-bg': '#f4e4bc',
                '--twcc-window-surface': '#fffaf0',
                '--twcc-window-header': '#6f4e2e',
                '--twcc-window-border': '#b89563',
                '--twcc-window-text': '#3b250f',
                '--twcc-window-text-strong': '#2f1d07',
                '--twcc-button-bg': '#dfc28c',
                '--twcc-section-bg': '#d7bd86',
                '--twcc-header-text': '#ffffff',
                '--twcc-overlay-light': 'rgba(255,255,255,.18)',
                '--twcc-overlay-lighter': 'rgba(255,255,255,.22)',
                '--twcc-overlay-subtle': 'rgba(255,255,255,.10)',
                '--twcc-header-overlay': 'rgba(111,78,46,.13)',
                '--twcc-soft-border': 'rgba(120,80,35,.28)',
                '--twcc-log-bg': '#2f1d07',
                '--twcc-log-text': '#f8e7bd'
            }
        }
    });

    const TWCC_WINDOW_THEME_TARGETS = Object.freeze({
        main: { name: 'TWCC Hauptfenster', ids: ['twx-master-panel'] },
        botGuard: { name: 'Bot-Schutz', ids: ['botguard-gui-panel'] },
        attackOrganizer: { name: 'Attack Organizer', ids: ['ao-gui-panel'] },
        dsUiExtended: { name: 'DS UI Erweitert', ids: ['dsui-gui-panel'] },
        dsSelectVillages: { name: 'DSSelectVillages', ids: ['dsv-gui-panel'] },
        korrikarteProfiles: { name: 'Korrikarte Profile', ids: ['kori-gui-panel'] },
        fakeGeneratorExternal: { name: 'FakeGenerator Extern', ids: ['twx-window-fakegenerator-external-info'] },
        farmGodExternal: { name: 'FarmGod', ids: ['twx-window-farmGod-external-info'] },
        zustimmungsanzeige: { name: 'Zustimmungsanzeige', ids: ['twx-window-zustimmungsanzeige-info'] },
        signaturForumIgm: { name: 'Signatur Forum/IGM', ids: ['twx-window-signatur-settings'] },
        dorfnotizVorlagen: { name: 'Dorfnotiz-Vorlagen', ids: ['twx-window-dorfnotiz-settings'] },
        angriffsplanerExternal: { name: 'Angriffsplaner', ids: ['twcc-dsu-executor'] },
        attackTimerServerMs: { name: 'DS Angriff Timer ServerMS', ids: ['tw-arrival-panel'] }
    });

    let twccThemeSettings = Storage.getJson(TWCC_THEME_KEY, {
        globalTheme: 'classic',
        windows: {},
        customVars: deepClone(TWCC_THEMES.classic.vars)
    }, true);

    function twccGetThemeVars(themeId) {
        if (themeId === 'custom') {
            return Object.assign({}, TWCC_THEMES.classic.vars, twccThemeSettings.customVars || {});
        }
        return (TWCC_THEMES[themeId] || TWCC_THEMES.classic).vars;
    }

    function twccSetThemeVars(target, themeId, varsOverride = null) {
        const vars = varsOverride || twccGetThemeVars(themeId);
        Object.entries(vars).forEach(([name, value]) => target.style.setProperty(name, value));
    }

    function twccApplyCustomPreview(vars) {
        if ((twccThemeSettings.globalTheme || 'classic') === 'custom') {
            twccSetThemeVars(document.documentElement, 'custom', vars);
        }
        Object.entries(TWCC_WINDOW_THEME_TARGETS).forEach(([key, target]) => {
            if ((twccThemeSettings.windows?.[key] || 'global') !== 'custom') return;
            target.ids.forEach(id => {
                const panel = document.getElementById(id);
                if (panel) twccSetThemeVars(panel, 'custom', vars);
            });
        });
    }

    function twccClearThemeVars(target) {
        Object.keys(TWCC_THEMES.classic.vars).forEach(name => target.style.removeProperty(name));
    }

    function twccApplyGlobalTheme() {
        twccSetThemeVars(document.documentElement, twccThemeSettings.globalTheme || 'classic');
    }

    function twccApplyWindowTheme(targetKey) {
        const target = TWCC_WINDOW_THEME_TARGETS[targetKey];
        if (!target) return;
        const ownTheme = twccThemeSettings.windows?.[targetKey] || 'global';
        const effectiveTheme = ownTheme === 'global'
            ? (twccThemeSettings.globalTheme || 'classic')
            : ownTheme;

        target.ids.forEach(id => {
            const panel = document.getElementById(id);
            if (!panel) return;

            panel.dataset.twccTheme = effectiveTheme;

            if (ownTheme === 'global') twccClearThemeVars(panel);
            else twccSetThemeVars(panel, ownTheme);
        });
    }

    function twccApplyAllWindowThemes() {
        twccApplyGlobalTheme();
        Object.keys(TWCC_WINDOW_THEME_TARGETS).forEach(twccApplyWindowTheme);
        twccNotifyThemeListeners();
    }

    // Öffentliche Theme-API für interne und extern geladene Module.
    // Module können entweder ein DOM-Element direkt einfärben oder sich als Ziel registrieren.
    const twccThemeListeners = new Set();
    const twccDynamicThemeTargets = new Map();

    function twccNormalizeThemeId(themeId, allowGlobal = false) {
        const id = String(themeId || '').trim().toLowerCase();
        if (allowGlobal && id === 'global') return 'global';
        return Object.prototype.hasOwnProperty.call(TWCC_THEMES, id) ? id : 'classic';
    }

    function twccGetEffectiveTheme(targetKey = null) {
        if (targetKey) {
            const ownTheme = twccThemeSettings.windows?.[targetKey] || 'global';
            if (ownTheme !== 'global') return twccNormalizeThemeId(ownTheme);
        }
        return twccNormalizeThemeId(twccThemeSettings.globalTheme || 'classic');
    }

    function twccResolveThemeTarget(target) {
        if (!target) return null;
        if (target instanceof Element || target === document.documentElement) return target;
        if (typeof target === 'string') return document.querySelector(target);
        return null;
    }

    function twccApplyTheme(themeId, target = 'global', options = {}) {
        const normalized = twccNormalizeThemeId(themeId);
        const persist = options.persist !== false;

        // Zentrale Umschaltung: Einstellung speichern und alle offenen Fenster live aktualisieren.
        if (target === 'global' || target === document.documentElement || target === null) {
            twccThemeSettings.globalTheme = normalized;
            if (persist) Storage.setJson(TWCC_THEME_KEY, twccThemeSettings);
            twccApplyAllWindowThemes();
            return {
                id: normalized,
                label: TWCC_THEMES[normalized].label,
                scope: 'global',
                vars: deepClone(twccGetThemeVars(normalized))
            };
        }

        // Registriertes TWCC-Fenster per Schlüssel umschalten.
        if (typeof target === 'string' && Object.prototype.hasOwnProperty.call(TWCC_WINDOW_THEME_TARGETS, target)) {
            twccThemeSettings.windows = twccThemeSettings.windows || {};
            twccThemeSettings.windows[target] = normalized;
            if (persist) Storage.setJson(TWCC_THEME_KEY, twccThemeSettings);
            twccApplyWindowTheme(target);
            twccNotifyThemeListeners();
            return {
                id: normalized,
                label: TWCC_THEMES[normalized].label,
                scope: target,
                vars: deepClone(twccGetThemeVars(normalized))
            };
        }

        // Beliebiges DOM-Ziel direkt einfärben, ohne die globale Einstellung zu verändern.
        const element = twccResolveThemeTarget(target);
        if (!element) throw new Error('Theme-Ziel wurde nicht gefunden.');
        twccSetThemeVars(element, normalized);
        element.dataset.twccTheme = normalized;
        return {
            id: normalized,
            label: TWCC_THEMES[normalized].label,
            scope: 'element',
            vars: deepClone(twccGetThemeVars(normalized))
        };
    }

    function twccRegisterThemeTarget(id, target, options = {}) {
        const targetId = normalizeModuleId(id);
        const element = twccResolveThemeTarget(target);
        if (!element) throw new Error('Theme-Ziel für „' + targetId + '“ wurde nicht gefunden.');

        const record = {
            id: targetId,
            element,
            theme: twccNormalizeThemeId(options.theme || 'global', true)
        };
        twccDynamicThemeTargets.set(targetId, record);
        twccApplyRegisteredThemeTarget(record);
        return () => twccDynamicThemeTargets.delete(targetId);
    }

    function twccApplyRegisteredThemeTarget(record) {
        if (!record?.element?.isConnected) return;
        const themeId = record.theme === 'global' ? twccGetEffectiveTheme() : record.theme;
        if (record.theme === 'global') twccClearThemeVars(record.element);
        else twccSetThemeVars(record.element, themeId);
        record.element.dataset.twccTheme = themeId;
    }

    let twccLastThemeEventSignature = '';

    function twccNotifyThemeListeners(force = false) {
        twccDynamicThemeTargets.forEach((record, id) => {
            if (!record.element?.isConnected) twccDynamicThemeTargets.delete(id);
            else twccApplyRegisteredThemeTarget(record);
        });

        const state = {
            globalTheme: twccGetEffectiveTheme(),
            settings: deepClone(twccThemeSettings),
            vars: deepClone(twccGetThemeVars(twccGetEffectiveTheme()))
        };
        const signature = JSON.stringify(state);
        if (!force && signature === twccLastThemeEventSignature) return;
        twccLastThemeEventSignature = signature;

        twccThemeListeners.forEach(listener => {
            try { listener(state); }
            catch (error) { console.warn('[TW Control Center] Theme-Listener Fehler:', error); }
        });

        // Browserweit nutzbares Event für intern und extern geladene Module.
        const eventState = deepClone(state);
        window.dispatchEvent(new CustomEvent('twcc:themechange', { detail: eventState }));
        if (win !== window) win.dispatchEvent(new CustomEvent('twcc:themechange', { detail: deepClone(eventState) }));
    }

    function twccOnThemeChange(listener) {
        if (typeof listener !== 'function') throw new Error('Theme-Listener muss eine Funktion sein.');
        twccThemeListeners.add(listener);
        return () => twccThemeListeners.delete(listener);
    }

    const TWCCThemeAPI = Object.freeze({
        themes: Object.freeze(Object.fromEntries(Object.entries(TWCC_THEMES).map(([id, theme]) => [id, theme.label]))),
        getCurrent: twccGetEffectiveTheme,
        getVars(themeId = null) {
            return deepClone(twccGetThemeVars(themeId ? twccNormalizeThemeId(themeId) : twccGetEffectiveTheme()));
        },
        applyTheme: twccApplyTheme,
        apply: twccApplyTheme,
        registerTarget: twccRegisterThemeTarget,
        unregisterTarget(id) { return twccDynamicThemeTargets.delete(String(id || '')); },
        onChange: twccOnThemeChange,
        refresh: twccApplyAllWindowThemes
    });

    win.TWCC = Object.assign(win.TWCC || {}, {
        applyTheme: twccApplyTheme,
        Theme: TWCCThemeAPI,
        ThemeManager: TWCCThemeAPI
    });
    win.TWCCThemeManager = TWCCThemeAPI;
    ToolboxCore.Theme = TWCCThemeAPI;
    ToolboxCore.ThemeManager = TWCCThemeAPI;

    function twccSaveThemeSettings() {
        Storage.setJson(TWCC_THEME_KEY, twccThemeSettings);
        twccApplyAllWindowThemes();
    }

    function createTwccSettingsPanel() {
        const panel = ToolboxCore.Window.create({
            id: 'twcc-settings',
            title: '⚙ TWCC Einstellungen',
            width: 760,
            height: 510,
            render(body) {
                body.innerHTML = `
                    <div class="twcc-settings-layout">
                        <div class="twcc-settings-nav">
                            <button class="twx-btn active" data-twcc-page="appearance">🎨 Darstellung</button>
                            <button class="twx-btn" data-twcc-page="windows">🪟 Fenster</button>
                            <button class="twx-btn" data-twcc-page="general">⚙ Allgemein</button>
                            <button class="twx-btn" data-twcc-page="about">ℹ Über</button>
                        </div>
                        <div>
                            <section class="twcc-settings-page active" data-twcc-page-content="appearance">
                                <h3 style="margin-top:0;">Darstellung</h3>
                                <div class="twcc-theme-card">
                                    <b>Globales Theme</b>
                                    <p class="twcc-settings-note">Dieses Theme gilt für alle TWCC-Fenster, außer ein Fenster besitzt unten eine eigene Auswahl.</p>
                                    <select id="twcc-global-theme" class="twx-select">
                                        <option value="classic">Classic</option>
                                        <option value="dark">Dunkel</option>
                                        <option value="blue">Blau</option>
                                        <option value="green">Grün</option>
                                        <option value="custom">Eigenes Theme…</option>
                                    </select>
                                </div>
                                <div class="twcc-theme-card">
                                    <b>Standard-Themes</b>
                                    <p style="margin-bottom:0;">Classic, Dunkel, Blau und Grün sind sofort verfügbar. Mit „Eigenes Theme…“ kannst du alle zentralen TWCC-Farben selbst festlegen.</p>
                                </div>
                                <div id="twcc-custom-editor" class="twcc-theme-card twcc-custom-editor">
                                    <b>🎨 Eigenes Theme</b>
                                    <p class="twcc-settings-note">Änderungen werden sofort als Vorschau angezeigt. Dauerhaft übernommen werden sie erst mit „Speichern“.</p>
                                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;">
                                        <label>Vorlage
                                            <select id="twcc-custom-base" class="twx-select" style="margin-top:4px;">
                                                <option value="classic">Classic</option>
                                                <option value="dark">Dunkel</option>
                                                <option value="blue">Blau</option>
                                                <option value="green">Grün</option>
                                            </select>
                                        </label>
                                        <label>Theme-Name
                                            <input id="twcc-custom-name" class="twx-input" maxlength="60" style="margin-top:4px;" placeholder="Mein TWCC Theme">
                                        </label>
                                    </div>
                                    <div id="twcc-color-grid" class="twcc-color-grid"></div>
                                    <h4 style="margin:12px 0 6px;">Transparenz und Effekte</h4>
                                    <div id="twcc-effect-grid" class="twcc-color-grid"></div>
                                    <div id="twcc-theme-preview" class="twcc-theme-preview">
                                        <div class="twcc-theme-preview-head">Vorschau-Header</div>
                                        <div class="twcc-theme-preview-body">
                                            <div class="twcc-theme-preview-surface">
                                                Beispieltext und Eingabefeld
                                                <input class="twx-input" value="TWCC Vorschau" style="margin-top:6px;">
                                                <div class="twcc-theme-preview-actions">
                                                    <button class="twx-btn">Beispiel-Button</button>
                                                    <button class="twx-btn">Aktion</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="twcc-theme-editor-actions">
                                        <button id="twcc-custom-save" class="twx-btn">💾 Speichern</button>
                                        <button id="twcc-custom-export" class="twx-btn">⬇ Exportieren</button>
                                        <button id="twcc-custom-import" class="twx-btn">⬆ Importieren</button>
                                        <button id="twcc-custom-reset" class="twx-btn">↩ Vorlage laden</button>
                                        <input id="twcc-custom-import-file" type="file" accept="application/json,.json" class="twx-hidden">
                                    </div>
                                </div>
                            </section>

                            <section class="twcc-settings-page" data-twcc-page-content="windows">
                                <h3 style="margin-top:0;">Fenster</h3>
                                <p class="twcc-settings-note">„Global“ übernimmt das oben gewählte Theme. Angriffsplaner und ServerMS sind jetzt ebenfalls als echte Fenster eingebunden.</p>
                                <div id="twcc-window-theme-list"></div>
                            </section>

                            <section class="twcc-settings-page" data-twcc-page-content="general">
                                <h3 style="margin-top:0;">Allgemein</h3>
                                <div class="twcc-general-brand">
                                    <img class="twcc-general-logo" src="${GITHUB_RAW_BASE}assets/twcc-logo.png.gif" alt="TWCC Logo">
                                    <div class="twcc-general-title">TW Control Center</div>
                                    <div class="twcc-general-version">Version ${escapeHtml(TWCC_VERSION)} · Modular Control Center for Tribal Wars</div>
                                </div>
                                <div class="twcc-theme-card">
                                    <b>Allgemeine Einstellungen</b>
                                    <p class="twcc-settings-note" style="margin-bottom:0;">Hier werden künftig zentrale TWCC-Einstellungen gesammelt, die nicht zu einem einzelnen Modul oder Theme gehören.</p>
                                </div>
                            </section>

                            <section class="twcc-settings-page" data-twcc-page-content="about">
                                <h3 style="margin-top:0;">Über</h3>
                                <div class="twcc-theme-card">
                                    <b>TW Control Center v${escapeHtml(TWCC_VERSION)}</b><br>
                                    Custom Theme Editor – Live-Vorschau, Import und Export
                                </div>
                            </section>
                        </div>
                    </div>`;

                const globalSelect = body.querySelector('#twcc-global-theme');
                const customEditor = body.querySelector('#twcc-custom-editor');
                const colorGrid = body.querySelector('#twcc-color-grid');
                const effectGrid = body.querySelector('#twcc-effect-grid');
                const preview = body.querySelector('#twcc-theme-preview');
                const customBase = body.querySelector('#twcc-custom-base');
                const customName = body.querySelector('#twcc-custom-name');
                const importFile = body.querySelector('#twcc-custom-import-file');
                const colorFields = [
                    ['--twcc-window-bg', 'Fenster'],
                    ['--twcc-window-surface', 'Fensterinhalt'],
                    ['--twcc-window-header', 'Header'],
                    ['--twcc-window-border', 'Rahmen'],
                    ['--twcc-window-text', 'Text'],
                    ['--twcc-window-text-strong', 'Starker Text'],
                    ['--twcc-button-bg', 'Buttons'],
                    ['--twcc-section-bg', 'Bereiche'],
                    ['--twcc-header-text', 'Header-Text'],
                    ['--twcc-log-bg', 'Log-Hintergrund'],
                    ['--twcc-log-text', 'Log-Text']
                ];
                const effectFields = [
                    ['--twcc-overlay-light', 'Overlay hell'],
                    ['--twcc-overlay-lighter', 'Overlay heller'],
                    ['--twcc-overlay-subtle', 'Overlay dezent'],
                    ['--twcc-header-overlay', 'Header-Overlay'],
                    ['--twcc-soft-border', 'Weicher Rahmen']
                ];
                let customDraft = Object.assign({}, TWCC_THEMES.classic.vars, twccThemeSettings.customVars || {});
                customName.value = String(twccThemeSettings.customName || 'Mein TWCC Theme');

                function updateCustomEditorVisibility() {
                    const windowUsesCustom = Object.values(twccThemeSettings.windows || {}).includes('custom');
                    customEditor.classList.toggle('active', globalSelect.value === 'custom' || windowUsesCustom);
                }

                function applyPreviewVars(vars) {
                    Object.entries(vars).forEach(([name, value]) => preview.style.setProperty(name, value));
                    twccApplyCustomPreview(vars);
                }

                function renderEffectGrid() {
                    effectGrid.innerHTML = '';
                    effectFields.forEach(([varName, label]) => {
                        const labelEl = document.createElement('span');
                        labelEl.textContent = label;
                        const value = document.createElement('input');
                        value.className = 'twx-input';
                        value.value = customDraft[varName] || '';
                        value.style.gridColumn = 'span 2';
                        value.addEventListener('input', () => {
                            customDraft[varName] = value.value.trim();
                            applyPreviewVars(customDraft);
                        });
                        effectGrid.append(labelEl, value);
                    });
                }

                function renderCustomEditor() {
                    renderColorGrid();
                    renderEffectGrid();
                    applyPreviewVars(customDraft);
                }

                function downloadCustomTheme() {
                    const payload = {
                        format: 'twcc-theme-export',
                        formatVersion: 1,
                        twccVersion: TWCC_VERSION,
                        name: customName.value.trim() || 'Mein TWCC Theme',
                        exportedAt: new Date().toISOString(),
                        vars: Object.assign({}, customDraft)
                    };
                    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = safeExportFilename(payload.name) + '.twcc-theme.json';
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                }

                function importCustomTheme(file) {
                    const reader = new FileReader();
                    reader.onload = () => {
                        try {
                            const payload = JSON.parse(String(reader.result || ''));
                            if (!payload || payload.format !== 'twcc-theme-export' || Number(payload.formatVersion) !== 1 || !payload.vars || typeof payload.vars !== 'object') {
                                throw new Error('Keine gültige TWCC-Theme-Datei.');
                            }
                            const allowed = Object.keys(TWCC_THEMES.classic.vars);
                            customDraft = Object.fromEntries(allowed.map(key => [key, String(payload.vars[key] ?? TWCC_THEMES.classic.vars[key])]));
                            customName.value = String(payload.name || 'Importiertes Theme').slice(0, 60);
                            renderCustomEditor();
                            ToolboxCore.Notify.success('Theme importiert – zum dauerhaften Übernehmen speichern.');
                        } catch (error) {
                            ToolboxCore.Notify.error(error.message || 'Theme konnte nicht importiert werden.');
                        } finally {
                            importFile.value = '';
                        }
                    };
                    reader.onerror = () => ToolboxCore.Notify.error('Theme-Datei konnte nicht gelesen werden.');
                    reader.readAsText(file);
                }

                function renderColorGrid() {
                    colorGrid.innerHTML = '';
                    colorFields.forEach(([varName, label]) => {
                        const color = document.createElement('input');
                        color.type = 'color';
                        color.value = /^#[0-9a-f]{6}$/i.test(customDraft[varName] || '') ? customDraft[varName] : '#000000';
                        color.dataset.themeVar = varName;

                        const value = document.createElement('input');
                        value.className = 'twx-input twcc-color-value';
                        value.value = color.value.toUpperCase();
                        value.maxLength = 7;

                        const labelEl = document.createElement('span');
                        labelEl.textContent = label;
                        colorGrid.append(labelEl, color, value);

                        const setValue = next => {
                            if (!/^#[0-9a-f]{6}$/i.test(next)) return false;
                            const normalized = next.toUpperCase();
                            color.value = normalized;
                            value.value = normalized;
                            customDraft[varName] = normalized;
                            applyPreviewVars(customDraft);
                            return true;
                        };
                        color.addEventListener('input', () => setValue(color.value));
                        value.addEventListener('change', () => {
                            if (!setValue(value.value.trim())) {
                                value.value = color.value.toUpperCase();
                                ToolboxCore.Notify.warning('Bitte eine Farbe im Format #RRGGBB eingeben.');
                            }
                        });
                    });
                    applyPreviewVars(customDraft);
                }

                globalSelect.value = twccThemeSettings.globalTheme || 'classic';
                globalSelect.addEventListener('change', () => {
                    twccThemeSettings.globalTheme = globalSelect.value;
                    twccSaveThemeSettings();
                    updateCustomEditorVisibility();
                    ToolboxCore.Notify.success(globalSelect.value === 'custom' ? 'Eigenes Theme aktiviert' : 'Globales Theme gespeichert');
                });

                body.querySelector('#twcc-custom-save').addEventListener('click', () => {
                    twccThemeSettings.customVars = Object.assign({}, customDraft);
                    twccThemeSettings.customName = customName.value.trim() || 'Mein TWCC Theme';
                    twccSaveThemeSettings();
                    ToolboxCore.Notify.success('Eigenes Theme gespeichert');
                });

                body.querySelector('#twcc-custom-export').addEventListener('click', downloadCustomTheme);
                body.querySelector('#twcc-custom-import').addEventListener('click', () => importFile.click());
                importFile.addEventListener('change', () => {
                    const file = importFile.files && importFile.files[0];
                    if (file) importCustomTheme(file);
                });

                body.querySelector('#twcc-custom-reset').addEventListener('click', () => {
                    const baseId = customBase.value in TWCC_THEMES ? customBase.value : 'classic';
                    customDraft = Object.assign({}, TWCC_THEMES[baseId].vars);
                    renderCustomEditor();
                    ToolboxCore.Notify.info('Vorlage geladen – zum dauerhaften Übernehmen speichern.');
                });

                customBase.addEventListener('change', () => {
                    customDraft = Object.assign({}, TWCC_THEMES[customBase.value].vars);
                    renderCustomEditor();
                    ToolboxCore.Notify.info('Vorlage als Live-Vorschau geladen.');
                });

                renderCustomEditor();
                updateCustomEditorVisibility();

                const list = body.querySelector('#twcc-window-theme-list');
                Object.entries(TWCC_WINDOW_THEME_TARGETS).forEach(([key, meta]) => {
                    const row = document.createElement('div');
                    row.className = 'twcc-window-theme-row';
                    row.innerHTML = `
                        <span><b>${escapeHtml(meta.name)}</b></span>
                        <select class="twx-select" data-theme-window="${escapeHtml(key)}">
                            <option value="global">Global</option>
                            <option value="classic">Classic</option>
                            <option value="dark">Dunkel</option>
                            <option value="blue">Blau</option>
                            <option value="green">Grün</option>
                            <option value="custom">Eigenes Theme…</option>
                        </select>
                        <button class="twx-btn" title="Fensterdesign auswählen" data-theme-gear="${escapeHtml(key)}">⚙</button>`;
                    const select = row.querySelector('select');
                    select.value = twccThemeSettings.windows?.[key] || 'global';
                    select.addEventListener('change', () => {
                        twccThemeSettings.windows = twccThemeSettings.windows || {};
                        twccThemeSettings.windows[key] = select.value;
                        twccSaveThemeSettings();
                        updateCustomEditorVisibility();
                        if (select.value === 'custom') ToolboxCore.Notify.info('Eigenes Theme für dieses Fenster aktiviert. Die Farben findest du unter Darstellung.');
                    });
                    row.querySelector('[data-theme-gear]').addEventListener('click', () => {
                        select.focus();
                        select.click();
                    });
                    list.appendChild(row);
                });

                body.querySelectorAll('[data-twcc-page]').forEach(button => {
                    button.addEventListener('click', () => {
                        const page = button.dataset.twccPage;
                        body.querySelectorAll('[data-twcc-page]').forEach(x => x.classList.toggle('active', x === button));
                        body.querySelectorAll('[data-twcc-page-content]').forEach(x => x.classList.toggle('active', x.dataset.twccPageContent === page));
                    });
                });
            }
        });

        ToolboxCore.Window.toggle('twcc-settings', true);
        twccApplyAllWindowThemes();
        return panel;
    }

    twccApplyGlobalTheme();

    const TWCC_EXTERNAL_THEME_SELECTORS = [
        '#tw-arrival-panel',
        '#twcc-dsu-executor',
        '#ao-gui-panel',
        '#botguard-gui-panel',
        '#dsui-gui-panel',
        '#dsv-gui-panel',
        '#kori-gui-panel',
        '.twx-panel'
    ].join(',');

    function twccPolishThemeNode(node) {
        if (!(node instanceof Element)) return false;
        let changed = false;
        const candidates = [];
        if (node.matches?.(TWCC_EXTERNAL_THEME_SELECTORS)) candidates.push(node);
        node.querySelectorAll?.(TWCC_EXTERNAL_THEME_SELECTORS).forEach(el => candidates.push(el));

        candidates.forEach(panel => {
            if (panel.dataset.twccPolished === '1') return;
            panel.dataset.twccPolished = '1';
            panel.classList.add('twcc-theme-polished');
            changed = true;
        });
        return changed;
    }

    let twccThemeRefreshFrame = 0;
    function twccScheduleThemeRefresh() {
        if (twccThemeRefreshFrame) return;
        twccThemeRefreshFrame = requestAnimationFrame(() => {
            twccThemeRefreshFrame = 0;
            twccApplyGlobalTheme();
            Object.keys(TWCC_WINDOW_THEME_TARGETS).forEach(twccApplyWindowTheme);
            twccDynamicThemeTargets.forEach(twccApplyRegisteredThemeTarget);
            twccNotifyThemeListeners();
        });
    }

    twccPolishThemeNode(document.documentElement);
    const twccThemeObserver = new MutationObserver(mutations => {
        let relevant = false;
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (twccPolishThemeNode(node)) relevant = true;
                if (node instanceof Element && (
                    node.matches?.(TWCC_EXTERNAL_THEME_SELECTORS) ||
                    node.querySelector?.(TWCC_EXTERNAL_THEME_SELECTORS)
                )) relevant = true;
            }
        }
        if (relevant) twccScheduleThemeRefresh();
    });
    twccThemeObserver.observe(document.documentElement, { childList: true, subtree: true });


    function createMasterPanel() {
        if (document.getElementById('twx-master-panel')) return;
        const toggle = document.createElement('button');
        toggle.id = 'twx-master-toggle';
        toggle.textContent = 'TW Control Center';
        document.body.appendChild(toggle);

        const panel = document.createElement('div');
        panel.id = 'twx-master-panel';
        panel.className = 'twx-panel' + (core.panel.collapsed ? ' twx-hidden' : '');
        panel.style.width = (core.panel.width || 520) + 'px';
        panel.style.height = (core.panel.height || 560) + 'px';
        panel.style.left = (core.panel.left ?? (window.innerWidth - 570)) + 'px';
        panel.style.top = (core.panel.top ?? 100) + 'px';
        panel.innerHTML = `
            <div class="twx-header" id="twx-master-header">
                <span>⚔ TW Control Center <span style="opacity:.75;font-size:11px;">v${escapeHtml(TWCC_VERSION)}</span></span>
                <span class="twcc-header-actions">
                    <button class="twx-btn twcc-header-icon" id="twx-master-settings" title="TWCC Einstellungen">⚙</button>
                    <button class="twx-btn twcc-header-icon" id="twx-master-minimize" title="Control Center minimieren">−</button>
                    <span class="twx-close" id="twx-master-close" title="Control Center ausblenden">×</span>
                </span>
            </div>
            <div class="twx-body" id="twx-master-body">
                <div class="twx-master-toolbar">
                    <input id="twx-module-search" class="twx-search" type="search" placeholder="🔍 Suche Modul...">
                    <button class="twx-btn" id="twx-master-refresh" title="Seite neu laden">↻</button>
                </div>
                <div id="twx-module-list"></div>
                <div class="twx-small" id="twx-master-footer"></div>
            </div>`;
        document.body.appendChild(panel);

        const masterBody = document.getElementById('twx-master-body');
        const minimizeBtn = document.getElementById('twx-master-minimize');

        function applyMasterMinimizedState() {
            const minimized = !!core.panel.minimized;
            if (masterBody) masterBody.style.display = minimized ? 'none' : '';
            if (minimizeBtn) {
                minimizeBtn.textContent = minimized ? '+' : '−';
                minimizeBtn.title = minimized ? 'Control Center vergrößern' : 'Control Center minimieren';
            }
            panel.style.height = minimized ? 'auto' : ((core.panel.height || 560) + 'px');
            panel.style.resize = minimized ? 'none' : 'both';
        }

        applyMasterMinimizedState();

        toggle.addEventListener('click', () => {
            panel.classList.toggle('twx-hidden');
            core.panel.collapsed = panel.classList.contains('twx-hidden');
            savePanelState(panel, core.panel, CORE_KEY, core);
        });
        document.getElementById('twx-master-close').addEventListener('click', () => {
            panel.classList.add('twx-hidden');
            core.panel.collapsed = true;
            savePanelState(panel, core.panel, CORE_KEY, core);
        });
        minimizeBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            core.panel.minimized = !core.panel.minimized;
            applyMasterMinimizedState();
            saveJson(CORE_KEY, core);
        });
        document.getElementById('twx-master-settings').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            createTwccSettingsPanel();
        });

        document.getElementById('twx-master-refresh').addEventListener('click', () => location.reload());

        const search = document.getElementById('twx-module-search');
        search.value = core.search || '';
        search.addEventListener('input', () => {
            core.search = search.value;
            saveJson(CORE_KEY, core);
            renderModuleList();
        });

        renderModuleList();
        makeDraggable(panel, document.getElementById('twx-master-header'), () => savePanelState(panel, core.panel, CORE_KEY, core));
        observeResize(panel, () => savePanelState(panel, core.panel, CORE_KEY, core));
    }

    function isFavorite(id) {
        core.favorites = Array.isArray(core.favorites) ? core.favorites : [];
        return core.favorites.includes(id);
    }

    function toggleFavorite(id) {
        core.favorites = Array.isArray(core.favorites) ? core.favorites : [];
        if (core.favorites.includes(id)) core.favorites = core.favorites.filter(x => x !== id);
        else core.favorites.push(id);
        saveJson(CORE_KEY, core);
        renderModuleList();
    }

    function moduleMatchesSearch(mod, search) {
        if (!search) return true;
        const hay = [mod.name, mod.id, mod.categoryName, mod.description, mod.author, mod.version].join(' ').toLowerCase();
        return hay.includes(search.toLowerCase());
    }

    function createModuleRow(mod) {
        const state = getModuleState(mod.id);
        const row = document.createElement('div');
        row.className = 'twx-module-row';
        const availableHere = typeof mod.matchesPage === 'function' ? mod.matchesPage() : true;
        const label = state.effective ? (availableHere ? 'aktiv' : 'aktiv, hier nicht geladen') : 'aus';
        const tabText = state.tabMode === 'global' ? 'Global' : (state.tabMode === 'forceOn' ? 'Nur Tab ON' : 'Nur Tab OFF');
        const sourceText = mod.source === 'core' ? 'Core' : 'Extern';
        row.innerHTML = `
            <div>
                <div class="twx-module-name"><span>${escapeHtml(mod.icon || '🧩')}</span><span>${escapeHtml(mod.name)}</span></div>
                <div class="twx-status">${label} · ${tabText} · ${sourceText} · v${escapeHtml(mod.version)}</div>
            </div>
            <label class="twx-switch" title="Global ein/aus">
                <input class="twx-global-toggle" type="checkbox" ${state.globalEnabled ? 'checked' : ''}>
                <span class="twx-slider"></span>
            </label>
            <select class="twx-select twx-tab-mode" title="Tab-Modus">
                <option value="global">Global</option>
                <option value="forceOn">Tab ON</option>
                <option value="forceOff">Tab OFF</option>
            </select>
            <button class="twx-btn twx-fav" title="Favorit">${isFavorite(mod.id) ? '★' : '☆'}</button>
            <button class="twx-btn twx-update" title="Externes Script neu laden / Cache umgehen">↯</button>
            <button class="twx-btn twx-reset-module" title="Modul zurücksetzen">⟲</button>
            <button class="twx-btn twx-settings" title="Einstellungen">⚙</button>
            <button class="twx-btn twx-info" title="Info">ℹ</button>`;
        row.querySelector('.twx-tab-mode').value = state.tabMode;
        row.querySelector('.twx-global-toggle').addEventListener('change', e => {
            setGlobalEnabled(mod.id, e.target.checked);
            location.reload();
        });
        row.querySelector('.twx-tab-mode').addEventListener('change', e => {
            setTabMode(mod.id, e.target.value);
            location.reload();
        });
        row.querySelector('.twx-fav').addEventListener('click', () => toggleFavorite(mod.id));
        row.querySelector('.twx-update').addEventListener('click', () => {
            if (!confirm('Cache für ' + mod.name + ' umgehen und Seite neu laden?')) return;
            forceModuleUpdate(mod.id);
        });
        row.querySelector('.twx-reset-module').addEventListener('click', () => resetSingleModule(mod.id));
        row.querySelector('.twx-settings').addEventListener('click', () => mod.openSettings());
        row.querySelector('.twx-info').addEventListener('click', () => createModuleInfoPanel(mod));
        return row;
    }

    const CATEGORY_META = {
        favorites: { name: 'Favoriten', icon: '⭐' },
        troopMovement: { name: 'Truppenbewegung', icon: '⚔️' },
        villages: { name: 'Dörfer', icon: '🏘️' },
        attack: { name: 'Truppenbewegung', icon: '⚔️' },
        farming: { name: 'Truppenbewegung', icon: '⚔️' },
        map: { name: 'Karte', icon: '🗺️' },
        communication: { name: 'Kommunikation', icon: '✒️' },
        security: { name: 'Sicherheit', icon: '🛡️' },
        overview: { name: 'Übersicht', icon: '📊' },
        system: { name: 'System', icon: '🧰' }
    };

    function getCategoryOrder() {
        let saved = Storage.getJson(CATEGORY_ORDER_KEY, null);

        // Einmalige Übernahme aus älteren TWCC-Versionen.
        if (!Array.isArray(saved)) {
            try {
                const legacy = JSON.parse(localStorage.getItem(CATEGORY_ORDER_KEY) || 'null');
                if (Array.isArray(legacy)) {
                    saved = legacy;
                    Storage.setJson(CATEGORY_ORDER_KEY, legacy);
                    localStorage.removeItem(CATEGORY_ORDER_KEY);
                }
            } catch (error) {
                saved = null;
            }
        }

        const defaults = ['favorites', 'troopMovement', 'villages', 'map', 'communication', 'security', 'overview', 'system'];
        const out = [];

        (Array.isArray(saved) ? saved : []).forEach(id => {
            if (id && !out.includes(id)) out.push(id);
        });
        defaults.forEach(id => {
            if (!out.includes(id)) out.push(id);
        });

        return out;
    }

    function saveCategoryOrder(order) {
        Storage.setJson(CATEGORY_ORDER_KEY, Array.isArray(order) ? order : []);
    }

    function getCategoryDisplayName(category, fallbackName) {
        const meta = CATEGORY_META[category] || {};
        return (meta.icon ? meta.icon + ' ' : '') + (meta.name || fallbackName || category || 'Sonstiges');
    }

    function normalizeCategory(mod) {
        const id = mod.id;
        if (id === 'attackOrganizer' || id === 'attackTimerServerMs' || id === 'farmGodExternal' || id === 'fakeGeneratorExternal' || id === 'angriffsplanerExternal') return 'troopMovement';
        if (id === 'dorfnotizVorlagen' || id === 'zustimmungsanzeige') return 'villages';
        if (id === 'signaturForumIgm') return 'communication';
        if (id === 'botGuard') return 'security';
        return mod.category || 'system';
    }

    function makeCategoryBlocksSortable(container) {
        if (!container || container.dataset.twccCategorySort === '1') return;
        container.dataset.twccCategorySort = '1';
        let dragged = null;

        container.addEventListener('dragstart', e => {
            const header = e.target.closest('.twx-category-header');
            if (!header) return;
            dragged = header.closest('.twx-category-block');
            if (!dragged) return;
            dragged.classList.add('twx-dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', dragged.dataset.category || '');
        });

        container.addEventListener('dragover', e => {
            if (!dragged) return;
            const block = e.target.closest('.twx-category-block');
            if (!block || block === dragged || !container.contains(block)) return;
            e.preventDefault();
            const rect = block.getBoundingClientRect();
            container.insertBefore(dragged, e.clientY < rect.top + rect.height / 2 ? block : block.nextSibling);
        });

        container.addEventListener('dragend', () => {
            if (!dragged) return;
            dragged.classList.remove('twx-dragging');
            saveCategoryOrder(Array.from(container.querySelectorAll('.twx-category-block')).map(el => el.dataset.category).filter(Boolean));
            dragged = null;
            ToolboxCore.Notify.success('Kategorie-Reihenfolge gespeichert');
        });
    }

    function updateFooter() {
        try {
            const footer = document.getElementById('twx-master-footer') || document.querySelector('.twx-master-footer');
            if (!footer) return;
            const total = Object.keys(Modules).length;
            const active = Object.keys(Modules).filter(id => getModuleState(id).effective).length;
            footer.innerHTML = `Module: ${active}/${total} effektiv aktiv · Suche/Favoriten/Kategorien sind gespeichert.<br>Tab-Modus: Global nutzt den normalen ON/OFF-Schalter. Tab ON/OFF überschreibt nur diesen Browser-Tab.`;
        } catch (e) {
            console.warn('[TWCC] Footer konnte nicht aktualisiert werden', e);
        }
    }

    function renderModuleList() {
        const list = document.getElementById('twx-module-list');
        if (!list) return;

        const query = (document.getElementById('twx-module-search')?.value || '').toLowerCase().trim();
        list.innerHTML = '';

        const mods = Object.values(Modules).filter(mod => moduleMatchesSearch(mod, query));
        const groups = {};

        mods.forEach(mod => {
            const cat = normalizeCategory(mod);
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(mod);
        });

        const favorites = mods.filter(mod => isFavorite(mod.id));
        if (favorites.length) groups.favorites = favorites;

        const ordered = getCategoryOrder();
        Object.keys(groups).forEach(cat => {
            if (!ordered.includes(cat)) ordered.push(cat);
        });

        ordered.forEach(cat => {
            const groupMods = groups[cat];
            if (!groupMods || !groupMods.length) return;

            const activeCount = groupMods.filter(mod => getModuleState(mod.id).effective).length;
            const collapsed = !!core.categoriesCollapsed[cat];

            const block = document.createElement('div');
            block.className = 'twx-category-block';
            block.dataset.category = cat;

            const header = document.createElement('div');
            header.className = 'twx-category-header';
            header.draggable = true;
            header.innerHTML = `
                <span class="twx-category-title">
                    <span class="twx-category-handle">☰</span>
                    <span class="twx-category-toggle">${collapsed ? '▶' : '▼'}</span>
                    <span>${escapeHtml(getCategoryDisplayName(cat, groupMods[0].categoryName))}</span>
                </span>
                <span class="twx-category-count">${activeCount}/${groupMods.length}</span>
            `;

            const body = document.createElement('div');
            body.className = 'twx-category-body' + (collapsed ? ' twx-collapsed' : '');

            groupMods.forEach(mod => {
                try { body.appendChild(createModuleRow(mod)); }
                catch (e) { console.error('[TWCC] Modul konnte nicht gerendert werden:', mod.id, e); }
            });

            header.querySelector('.twx-category-toggle').addEventListener('click', e => {
                e.stopPropagation();
                core.categoriesCollapsed[cat] = !core.categoriesCollapsed[cat];
                saveJson(CORE_KEY, core);
                renderModuleList();
            });

            block.appendChild(header);
            block.appendChild(body);
            list.appendChild(block);
        });

        makeCategoryBlocksSortable(list);
        if (typeof updateFooter === 'function') updateFooter();
    }

    function twccFakeGenDebug(step, data) {
        try {
            const params = new URLSearchParams(location.search);
            const msg = `[TWCC-FG-DEBUG ${step}] screen=${params.get('screen') || '-'} mode=${params.get('mode') || '-'} url=${location.href}`;
            if (data !== undefined) console.log(msg, data);
            else console.log(msg);
        } catch (e) {
            console.log('[TWCC-FG-DEBUG]', step, data || '');
        }
    }

    function twccLoadFakeGeneratorBridge(mod) {
        const params = new URLSearchParams(location.search);
        const screen = params.get('screen') || '';
        const mode = params.get('mode') || '';

        window.TWCC_FAKEGENERATOR_ALLOWED = true;
        window.TWCC_FAKEGENERATOR_FORCE_PLACE = true;
        window.TWCC_FAKEGENERATOR_DEBUG = true;

        twccFakeGenDebug('1 bridge-start', { id: mod.id, screen, mode, scriptUrl: mod.scriptUrl });

        if (!location.href.includes('/game.php')) {
            twccFakeGenDebug('2 stop-not-gamephp');
            return;
        }

        const state = (typeof core !== 'undefined' && core.modules) ? (core.modules[mod.id] || {}) : {};
        const cache = state.cacheBust || String(Date.now());
        const url = mod.scriptUrl + (mod.scriptUrl.includes('?') ? '&' : '?') + 'twcc_debug=' + encodeURIComponent(cache);

        twccFakeGenDebug('3 load-script', url);

        const script = document.createElement('script');
        script.src = url;
        script.async = false;
        script.dataset.twccModule = mod.id;
        script.onload = function () {
            twccFakeGenDebug('4 script-loaded');

            setTimeout(function () {
                const fgPanel = document.getElementById('fg-local-control-panel');
                const attackButton = document.querySelector('#target_attack, input[name="attack"], button[name="attack"]');
                const confirmButton = document.querySelector('#troop_confirm_submit, input[name="submit"], button[name="submit"]');

                twccFakeGenDebug('5 after-load-state', {
                    hasPanel: !!fgPanel,
                    hasAttackButton: !!attackButton,
                    hasConfirmButton: !!confirmButton,
                    hasTwSDK: !!window.twSDK,
                    fgEnabled: localStorage.getItem('fg_local_wrapper_enabled'),
                    fgLockedTab: localStorage.getItem('fg_local_wrapper_locked_tab')
                });
            }, 1800);
        };
        script.onerror = function (e) {
            twccFakeGenDebug('ERR script-load-failed', e);
            try { ToolboxCore.Notify.error('FakeGenerator konnte nicht geladen werden'); } catch(err) {}
        };

        (document.head || document.documentElement || document.body).appendChild(script);
    }

    async function twccFakeGeneratorSpecialLoader(reason) {
        try {
            const state = getModuleState('fakeGeneratorExternal');
            const params = new URLSearchParams(location.search);
            const screen = params.get('screen') || '-';

            console.log('[TWCC-FG-FETCH] check', {
                reason,
                screen,
                effective: state.effective,
                href: location.href
            });

            if (!location.href.includes('/game.php')) {
                console.log('[TWCC-FG-FETCH] stop: not game.php');
                return;
            }

            if (!state.effective) {
                console.log('[TWCC-FG-FETCH] stop: module not effective');
                return;
            }

            if (window.__TWCC_FAKEGENERATOR_FETCH_LOADED__) {
                console.log('[TWCC-FG-FETCH] stop: already loaded');
                return;
            }

            window.__TWCC_FAKEGENERATOR_FETCH_LOADED__ = true;
            window.TWCC_FAKEGENERATOR_ALLOWED = true;
            window.TWCC_FAKEGENERATOR_SPECIAL = true;

            const url = MODULE_BASE + 'Fakegenerator.js' + '?twcc_fetch=' + Date.now();
            console.log('[TWCC-FG-FETCH] fetch', url);

            const response = await fetch(url, {
                cache: 'no-store',
                credentials: 'omit',
                mode: 'cors'
            });

            console.log('[TWCC-FG-FETCH] response', {
                ok: response.ok,
                status: response.status,
                type: response.type,
                contentType: response.headers.get('content-type')
            });

            if (!response.ok) throw new Error('HTTP ' + response.status);

            const code = await response.text();

            console.log('[TWCC-FG-FETCH] code-check', {
                length: code.length,
                hasPlaceAutomation: code.includes('runPlaceEnterAutomation'),
                hasOldReturnText: code.includes('Originalscript wird hier nicht gestartet'),
                first80: code.slice(0, 80)
            });

            if (!code.includes('runPlaceEnterAutomation')) {
                throw new Error('FakeGenerator-Datei enthält runPlaceEnterAutomation nicht');
            }

            // Quelle für Fehlermeldungen lesbarer machen
            const wrapped = code + '\n//# sourceURL=TWCC_Fakegenerator_fetched.js';

            console.log('[TWCC-FG-FETCH] execute-start');
            (new Function(wrapped))();
            console.log('[TWCC-FG-FETCH] execute-done');

            setTimeout(function () {
                console.log('[TWCC-FG-FETCH] after-state', {
                    hasPanel: !!document.getElementById('fg-local-control-panel'),
                    hasAttackButton: !!document.querySelector('#target_attack, input[name="attack"], button[name="attack"]'),
                    hasConfirmButton: !!document.querySelector('#troop_confirm_submit, input[name="submit"], button[name="submit"]'),
                    fgEnabled: localStorage.getItem('fg_local_wrapper_enabled'),
                    fgLockedTab: localStorage.getItem('fg_local_wrapper_locked_tab')
                });
            }, 1800);

        } catch (e) {
            console.error('[TWCC-FG-FETCH] failed', e);
            try { ToolboxCore.Notify.error('FakeGenerator Fetch-Test fehlgeschlagen'); } catch(err) {}
            window.__TWCC_FAKEGENERATOR_FETCH_LOADED__ = false;
        }
    }

    function createFakeGeneratorExternalInfoPanel() {
        return ToolboxCore.Window.create({
            id: 'fakegenerator-external-info',
            title: '🎭 FakeGenerator Extern',
            width: 540,
            height: 340,
            content: `<div class="twx-info-box">
                <h3 style="margin-top:0;">🎭 FakeGenerator Extern</h3>
                <p>Der FakeGenerator wird extern aus deinem GitHub-Repository geladen.</p>
                <div><span class="twx-pill">extern</span><span class="twx-pill">Truppenbewegung</span><span class="twx-pill">Konflikt mit FarmGod</span></div>
                <hr>
                <b>Quelle:</b><br>
                <code>modules/Fakegenerator.js</code><br><br>
                <b>Test:</b><br>
                Übersicht öffnen → FakeGenerator Extern einschalten → Seite neu laden.
            </div>`
        });
    }

    function createFarmGodExternalInfoPanel() {
        return ToolboxCore.Window.create({
            id: 'farmGod-external-info',
            title: '🌾 FarmGod',
            width: 520,
            height: 340,
            content: `<div class="twx-info-box">
                <h3 style="margin-top:0;">🌾 FarmGod </h3>
                <p>FarmGod wird extern aus deinem GitHub-Repository geladen. Der Master bleibt sauber und FarmGod kann separat bearbeitet werden.</p>
                <div><span class="twx-pill">extern</span><span class="twx-pill">nur Farm-Assistent</span><span class="twx-pill">jsDelivr</span></div>
                <hr>
                <b>Quelle</b><br>
                <code>modules/farmgod/farmgod.js</code><br><br>
                <b>Test</b><br>
                1. Farm-Assistent öffnen<br>
                2. FarmGod Extern einschalten<br>
                3. Seite neu laden
            </div>`
        });
    }

    function resetSingleModule(id) {
        const mod = Modules[id];
        if (!mod) return;
        if (!confirm('Modul "' + mod.name + '" wirklich zurücksetzen?\\nON/OFF, Tab-Modus und Cache werden zurückgesetzt.')) return;

        if (core.modules[id]) {
            const defaultState = DEFAULT_CORE.modules && DEFAULT_CORE.modules[id]
                ? deepClone(DEFAULT_CORE.modules[id])
                : { enabled: false, cacheBust: '' };
            core.modules[id] = defaultState;
        }
        if (tabOverrides[id]) delete tabOverrides[id];

        saveTabOverrides(tabOverrides);
        saveJson(CORE_KEY, core);
        ToolboxCore.Notify.success(mod.name + ' zurückgesetzt');
        location.reload();
    }

    function exportTwccSettings() {
        const data = {
            exportedAt: new Date().toISOString(),
            version: '2.1.3',
            core: core,
            tabOverrides: tabOverrides,
            aoConfig: typeof aoConfig !== 'undefined' ? aoConfig : null,
            dsuiConfig: typeof dsuiConfig !== 'undefined' ? dsuiConfig : null,
            dsvConfig: typeof dsvConfig !== 'undefined' ? dsvConfig : null,
            botGuardConfig: typeof botGuardConfig !== 'undefined' ? botGuardConfig : null,
            koriConfig: typeof koriConfig !== 'undefined' ? koriConfig : null,
            dorfnotizConfig: typeof dorfnotizConfig !== 'undefined' ? dorfnotizConfig : null,
            signaturConfig: typeof signaturConfig !== 'undefined' ? signaturConfig : null
        };
        return JSON.stringify(data, null, 2);
    }

    function importTwccSettings(raw) {
        let data;
        try { data = JSON.parse(raw); }
        catch (e) {
            ToolboxCore.Notify.error('Import fehlgeschlagen: ungültiges JSON');
            return;
        }

        if (data.core) { core = mergeDeep(deepClone(DEFAULT_CORE), data.core); saveJson(CORE_KEY, core); }
        if (data.tabOverrides) { tabOverrides = data.tabOverrides || {}; saveTabOverrides(tabOverrides); }
        if (data.aoConfig && typeof AO_KEY !== 'undefined') saveJson(AO_KEY, data.aoConfig);
        if (data.dsuiConfig && typeof DSUI_KEY !== 'undefined') saveJson(DSUI_KEY, data.dsuiConfig);
        if (data.dsvConfig && typeof DSV_KEY !== 'undefined') saveJson(DSV_KEY, data.dsvConfig);
        if (data.botGuardConfig && typeof BOTGUARD_KEY !== 'undefined') saveJson(BOTGUARD_KEY, data.botGuardConfig);
        if (data.koriConfig && typeof KORI_KEY !== 'undefined') saveJson(KORI_KEY, data.koriConfig);
        if (data.dorfnotizConfig && typeof DORFNOTIZ_KEY !== 'undefined') saveJson(DORFNOTIZ_KEY, data.dorfnotizConfig);
        if (data.signaturConfig && typeof SIGNATUR_KEY !== 'undefined') saveJson(SIGNATUR_KEY, data.signaturConfig);

        ToolboxCore.Notify.success('TWCC Einstellungen importiert');
        location.reload();
    }

    function initZustimmungsanzeigeModule() {
        win.AnstiegZustimmung = win.AnstiegZustimmung || new Array();

        // Originalwerte aus dem Userscript. Das externe Script liest die aktuelle Welt selbst.
        win.AnstiegZustimmung['de95'] = 1.6;
        win.AnstiegZustimmung['de99'] = 2.0;
        win.AnstiegZustimmung['de100'] = 1.6;
        win.AnstiegZustimmung['de103'] = 1.7;
        win.AnstiegZustimmung['de107'] = 1.6;
        win.AnstiegZustimmung['de187'] = 1.6;

        win.message = true;

        if (win.$ && win.$.ajaxSetup) win.$.ajaxSetup({ cache: true });
        loadExternalScript(Modules.zustimmungsanzeige.scriptUrl, 'zustimmungsanzeige', 'jquery');
        ToolboxCore.Log.add('zustimmungsanzeige', 'Zustimmungsanzeige geladen');
    }

    function createZustimmungsanzeigeInfoPanel() {
        return ToolboxCore.Window.create({
            id: 'zustimmungsanzeige-info',
            title: '👑 Zustimmungsanzeige',
            width: 520,
            height: 320,
            content: `<div class="twx-info-box">
                <h3 style="margin-top:0;">👑 Zustimmungsanzeige</h3>
                <p>Zeigt Zustimmungswerte für Adelungen auf Dorfinfoseite, Karte, Berichten und Übersicht an.</p>
                <div><span class="twx-pill">extern</span><span class="twx-pill">automatische Welt-Erkennung</span><span class="twx-pill">keine Einstellungen</span></div>
                <hr>
                <b>Läuft auf:</b><br>
                Dorfinformation, Karte, Bericht, Übersicht<br><br>
                <b>Hinweis:</b><br>
                Das Script erkennt die Welt selbst. Deshalb gibt es hier erstmal keine zusätzliche Einstellungsmaske.
            </div>`
        });
    }

    const SIGNATUR_KEY = 'TWCC_SIGNATUR_FORUM_IGM_V1';
    const DEFAULT_SIGNATUR = {
        forum: '[spoiler]Hier kann die [b]Signatur[/b] für das [u]Forum[/u] definiert werden![/spoiler]',
        pn: '[spoiler]Hier kann die [b]Signatur[/b] für die [u]Nachrichten[/u] definiert werden![/spoiler]'
    };

    let signaturConfig = loadJson(SIGNATUR_KEY, DEFAULT_SIGNATUR);

    function applySignaturGlobals() {
        signaturConfig = mergeDeep(deepClone(DEFAULT_SIGNATUR), signaturConfig || {});
        win.sig_text_forum_vor = signaturConfig.forum || '';
        win.sig_text_pn_vor = signaturConfig.pn || '';
    }

    function initSignaturForumIgmModule() {
        applySignaturGlobals();
        if (win.$ && win.$.ajaxSetup) win.$.ajaxSetup({ cache: true });
        loadExternalScript(Modules.signaturForumIgm.scriptUrl, 'signaturForumIgm', 'jquery');
        ToolboxCore.Log.add('signaturForumIgm', 'Signatur Forum/IGM geladen');
    }

    function createSignaturForumIgmPanel() {
        signaturConfig = mergeDeep(deepClone(DEFAULT_SIGNATUR), signaturConfig || {});

        const content = `
            <div class="twx-info-box">
                <h3 style="margin-top:0;">✒️ Signatur Forum/IGM</h3>
                <div><span class="twx-pill">Forum</span><span class="twx-pill">Nachrichten</span><span class="twx-pill">BBCode</span></div>

                <div class="twx-tool-section">
                    <h4>Forum-Signatur</h4>
                    <textarea id="sig-forum" class="twx-textarea" spellcheck="false">${escapeHtml(signaturConfig.forum || '')}</textarea>
                </div>

                <div class="twx-tool-section">
                    <h4>Nachrichten-Signatur</h4>
                    <textarea id="sig-pn" class="twx-textarea" spellcheck="false">${escapeHtml(signaturConfig.pn || '')}</textarea>
                </div>

                <div class="ao-actions">
                    <button class="twx-btn" id="sig-save">Speichern & neu laden</button>
                    <button class="twx-btn" id="sig-reset">Reset</button>
                </div>
            </div>
        `;

        const panel = ToolboxCore.Window.create({
            id: 'signatur-settings',
            title: '✒️ Signatur Forum/IGM',
            width: 720,
            height: 620,
            content
        });
        ToolboxCore.Window.toggle('signatur-settings', true);

        document.getElementById('sig-save')?.addEventListener('click', () => {
            signaturConfig = {
                forum: document.getElementById('sig-forum').value || '',
                pn: document.getElementById('sig-pn').value || ''
            };
            saveJson(SIGNATUR_KEY, signaturConfig);
            ToolboxCore.Notify.success('Signaturen gespeichert');
            location.reload();
        });

        document.getElementById('sig-reset')?.addEventListener('click', () => {
            if (!confirm('Signaturen zurücksetzen?')) return;
            signaturConfig = deepClone(DEFAULT_SIGNATUR);
            saveJson(SIGNATUR_KEY, signaturConfig);
            location.reload();
        });

        return panel;
    }

    const DORFNOTIZ_KEY = 'TWCC_DORFNOTIZ_VORLAGEN_V1';
    const DEFAULT_DORFNOTIZ = {
        config: 'Bruch',
        defaultOverwriteCheckbox: false,
        defaultPointsCheckbox: false,
        useHotkeys: true,
        useCustom: true,
        showHotkeysonButton: true,
        hotkeys: {
            openEditHotkey: 'e',
            swapNoteCheckHotkey: 'x',
            offHotkey: 'r',
            offtotHotkey: 't',
            offvollHotkey: 'z',
            deffHotkey: 'f',
            vmtldeffHotkey: 'g',
            flexHotkey: 'h',
            cleanHotkey: 'n',
            bunkerHotkey: 'b',
            swapPointsCheckHotkey: '',
            bhplusHotkey: '',
            vmtloffHotkey: '',
            wallbreakHotkey: '',
            kataoffHotkey: '',
            skavoffHotkey: '',
            off25Hotkey: '',
            off50Hotkey: '',
            off75Hotkey: '',
            flexvollHotkey: '',
            katasplitHotkey: '',
            spyHotkey: '',
            churchHotkey: '',
            watchHotkey: '',
            AHHotkey: '',
            AGHotkey: '',
            startHotkey: ''
        },
        custom: [
            { title: 'Beispiel', note: 'DsBbCodes und Text hier einfügen der in der Notiz stehen soll', unit: 'zusätzlicher Text (zB ein bild (mit img tags))', hotkey: '' }
        ]
    };

    let dorfnotizConfig = loadJson(DORFNOTIZ_KEY, DEFAULT_DORFNOTIZ);

    function applyDorfnotizGlobals() {
        dorfnotizConfig = mergeDeep(deepClone(DEFAULT_DORFNOTIZ), dorfnotizConfig || {});

        win.config = dorfnotizConfig.config;
        win.defaultOverwriteCheckbox = !!dorfnotizConfig.defaultOverwriteCheckbox;
        win.defaultPointsCheckbox = !!dorfnotizConfig.defaultPointsCheckbox;
        win.useHotkeys = !!dorfnotizConfig.useHotkeys;
        win.useCustom = !!dorfnotizConfig.useCustom;
        win.showHotkeysonButton = !!dorfnotizConfig.showHotkeysonButton;

        Object.keys(dorfnotizConfig.hotkeys || {}).forEach(key => {
            win[key] = dorfnotizConfig.hotkeys[key] || '';
        });

        win.custom = Array.isArray(dorfnotizConfig.custom) ? dorfnotizConfig.custom : [];
    }

    function initDorfnotizVorlagenModule() {
        applyDorfnotizGlobals();
        if (win.$ && win.$.ajaxSetup) win.$.ajaxSetup({ cache: true });
        loadExternalScript(Modules.dorfnotizVorlagen.scriptUrl, 'dorfnotizVorlagen', 'jquery');
        ToolboxCore.Log.add('dorfnotizVorlagen', 'Dorfnotiz-Vorlagen geladen');
    }

    function createDorfnotizVorlagenPanel() {
        dorfnotizConfig = mergeDeep(deepClone(DEFAULT_DORFNOTIZ), dorfnotizConfig || {});

        const hotkeyRows = Object.keys(DEFAULT_DORFNOTIZ.hotkeys).map(key => `
            <tr>
                <td style="font-size:11px;">${escapeHtml(key)}</td>
                <td><input class="twx-input dorf-hotkey" data-key="${escapeHtml(key)}" value="${escapeHtml(dorfnotizConfig.hotkeys[key] || '')}" maxlength="3"></td>
            </tr>
        `).join('');

        const content = `
            <div class="twx-info-box">
                <h3 style="margin-top:0;">📝 Dorfnotiz-Vorlagen</h3>
                <div><span class="twx-pill">Dorf-Info</span><span class="twx-pill">Hotkeys</span><span class="twx-pill">Custom Buttons</span></div>

                <div class="twx-tool-section">
                    <h4>Allgemein</h4>
                    <label>Config:</label>
                    <input id="dorf-config" class="twx-input" value="${escapeHtml(dorfnotizConfig.config)}">
                    <div style="margin-top:8px;display:grid;grid-template-columns:1fr 80px;gap:6px;align-items:center;">
                        <span>Überschreiben standardmäßig aktiv</span><input id="dorf-overwrite" type="checkbox" ${dorfnotizConfig.defaultOverwriteCheckbox ? 'checked' : ''}>
                        <span>Punkte standardmäßig aktiv</span><input id="dorf-points" type="checkbox" ${dorfnotizConfig.defaultPointsCheckbox ? 'checked' : ''}>
                        <span>Hotkeys verwenden</span><input id="dorf-use-hotkeys" type="checkbox" ${dorfnotizConfig.useHotkeys ? 'checked' : ''}>
                        <span>Custom Buttons verwenden</span><input id="dorf-use-custom" type="checkbox" ${dorfnotizConfig.useCustom ? 'checked' : ''}>
                        <span>Hotkeys auf Buttons anzeigen</span><input id="dorf-show-hotkeys" type="checkbox" ${dorfnotizConfig.showHotkeysonButton ? 'checked' : ''}>
                    </div>
                </div>

                <div class="twx-tool-section">
                    <h4>Hotkeys</h4>
                    <table class="vis" style="width:100%;font-size:11px;">
                        <tr><th>Aktion</th><th>Hotkey</th></tr>
                        ${hotkeyRows}
                    </table>
                </div>

                <div class="twx-tool-section">
                    <h4>Custom Buttons JSON</h4>
                    <textarea id="dorf-custom" class="twx-textarea" spellcheck="false">${escapeHtml(JSON.stringify(dorfnotizConfig.custom, null, 2))}</textarea>
                </div>

                <div class="ao-actions">
                    <button class="twx-btn" id="dorf-save">Speichern & neu laden</button>
                    <button class="twx-btn" id="dorf-export">📤 Export</button>
                    <button class="twx-btn" id="dorf-import">📥 Import</button>
                    <button class="twx-btn" id="dorf-reset">Reset</button>
                </div>
            </div>
        `;

        const panel = ToolboxCore.Window.create({
            id: 'dorfnotiz-settings',
            title: '📝 Dorfnotiz-Vorlagen',
            width: 720,
            height: 720,
            content
        });
        ToolboxCore.Window.toggle('dorfnotiz-settings', true);

        document.getElementById('dorf-save')?.addEventListener('click', () => {
            const next = mergeDeep(deepClone(DEFAULT_DORFNOTIZ), {});
            next.config = document.getElementById('dorf-config').value || 'Bruch';
            next.defaultOverwriteCheckbox = document.getElementById('dorf-overwrite').checked;
            next.defaultPointsCheckbox = document.getElementById('dorf-points').checked;
            next.useHotkeys = document.getElementById('dorf-use-hotkeys').checked;
            next.useCustom = document.getElementById('dorf-use-custom').checked;
            next.showHotkeysonButton = document.getElementById('dorf-show-hotkeys').checked;

            next.hotkeys = {};
            document.querySelectorAll('.dorf-hotkey').forEach(input => {
                next.hotkeys[input.dataset.key] = input.value || '';
            });

            try {
                next.custom = JSON.parse(document.getElementById('dorf-custom').value || '[]');
                if (!Array.isArray(next.custom)) throw new Error('Custom muss ein Array sein');
            } catch (e) {
                ToolboxCore.Notify.error('Custom JSON ungültig: ' + e.message);
                return;
            }

            dorfnotizConfig = next;
            saveJson(DORFNOTIZ_KEY, dorfnotizConfig);
            ToolboxCore.Notify.success('Dorfnotiz-Vorlagen gespeichert');
            location.reload();
        });

        function readDorfnotizPanelValues() {
            const next = mergeDeep(deepClone(DEFAULT_DORFNOTIZ), {});
            next.config = document.getElementById('dorf-config')?.value || 'Bruch';
            next.defaultOverwriteCheckbox = !!document.getElementById('dorf-overwrite')?.checked;
            next.defaultPointsCheckbox = !!document.getElementById('dorf-points')?.checked;
            next.useHotkeys = !!document.getElementById('dorf-use-hotkeys')?.checked;
            next.useCustom = !!document.getElementById('dorf-use-custom')?.checked;
            next.showHotkeysonButton = !!document.getElementById('dorf-show-hotkeys')?.checked;
            next.hotkeys = {};
            document.querySelectorAll('.dorf-hotkey').forEach(input => {
                next.hotkeys[input.dataset.key] = String(input.value || '').slice(0, 3);
            });
            next.custom = JSON.parse(document.getElementById('dorf-custom')?.value || '[]');
            if (!Array.isArray(next.custom)) throw new Error('Custom muss ein Array sein.');
            next.custom = next.custom.map((item, index) => {
                if (!item || typeof item !== 'object' || Array.isArray(item)) {
                    throw new Error('Custom Button ' + (index + 1) + ' ist ungültig.');
                }
                return {
                    title: String(item.title ?? ''),
                    note: String(item.note ?? ''),
                    unit: String(item.unit ?? ''),
                    hotkey: String(item.hotkey ?? '').slice(0, 3)
                };
            });
            return next;
        }

        function writeDorfnotizPanelValues(config) {
            document.getElementById('dorf-config').value = config.config || 'Bruch';
            document.getElementById('dorf-overwrite').checked = !!config.defaultOverwriteCheckbox;
            document.getElementById('dorf-points').checked = !!config.defaultPointsCheckbox;
            document.getElementById('dorf-use-hotkeys').checked = !!config.useHotkeys;
            document.getElementById('dorf-use-custom').checked = !!config.useCustom;
            document.getElementById('dorf-show-hotkeys').checked = !!config.showHotkeysonButton;
            document.querySelectorAll('.dorf-hotkey').forEach(input => {
                input.value = config.hotkeys?.[input.dataset.key] || '';
            });
            document.getElementById('dorf-custom').value = JSON.stringify(config.custom || [], null, 2);
        }

        document.getElementById('dorf-export')?.addEventListener('click', () => {
            try {
                const current = readDorfnotizPanelValues();
                dorfnotizConfig = current;
                saveJson(DORFNOTIZ_KEY, dorfnotizConfig);
                exportModule('dorfnotizVorlagen', deepClone(current), {
                    moduleLabel: 'Dorfnotiz-Vorlagen',
                    moduleVersion: Modules.dorfnotizVorlagen.version,
                    fileName: 'Dorfnotiz_Vorlagen_Einstellungen'
                });
            } catch (error) {
                ToolboxCore.Notify.error('Export fehlgeschlagen: ' + (error?.message || error));
            }
        });

        document.getElementById('dorf-import')?.addEventListener('click', () => {
            importModule('dorfnotizVorlagen', imported => {
                if (!imported || typeof imported !== 'object' || Array.isArray(imported)) {
                    throw new Error('Ungültige Dorfnotiz-Vorlagen-Einstellungen.');
                }
                const next = mergeDeep(deepClone(DEFAULT_DORFNOTIZ), {});
                next.config = String(imported.config || DEFAULT_DORFNOTIZ.config);
                next.defaultOverwriteCheckbox = !!imported.defaultOverwriteCheckbox;
                next.defaultPointsCheckbox = !!imported.defaultPointsCheckbox;
                next.useHotkeys = imported.useHotkeys !== false;
                next.useCustom = imported.useCustom !== false;
                next.showHotkeysonButton = imported.showHotkeysonButton !== false;
                next.hotkeys = {};
                Object.keys(DEFAULT_DORFNOTIZ.hotkeys).forEach(key => {
                    next.hotkeys[key] = String(imported.hotkeys?.[key] ?? '').slice(0, 3);
                });
                if (!Array.isArray(imported.custom)) throw new Error('Die Übergabe enthält keine gültige Custom-Button-Liste.');
                next.custom = imported.custom.map((item, index) => {
                    if (!item || typeof item !== 'object' || Array.isArray(item)) {
                        throw new Error('Custom Button ' + (index + 1) + ' ist ungültig.');
                    }
                    return {
                        title: String(item.title ?? ''),
                        note: String(item.note ?? ''),
                        unit: String(item.unit ?? ''),
                        hotkey: String(item.hotkey ?? '').slice(0, 3)
                    };
                });
                dorfnotizConfig = next;
                saveJson(DORFNOTIZ_KEY, dorfnotizConfig);
                writeDorfnotizPanelValues(dorfnotizConfig);
                ToolboxCore.Notify.success('Dorfnotiz-Vorlagen übernommen. Zum Anwenden Seite neu laden.');
                return dorfnotizConfig;
            }, {
                moduleLabel: 'Dorfnotiz-Vorlagen',
                moduleVersion: Modules.dorfnotizVorlagen.version
            });
        });

        document.getElementById('dorf-reset')?.addEventListener('click', () => {
            if (!confirm('Dorfnotiz-Vorlagen Einstellungen zurücksetzen?')) return;
            dorfnotizConfig = deepClone(DEFAULT_DORFNOTIZ);
            saveJson(DORFNOTIZ_KEY, dorfnotizConfig);
            location.reload();
        });

        return panel;
    }

    function createTwccToolsPanel() {
        const content = document.createElement('div');
        content.innerHTML = `
            <div class="twx-tool-section">
                <h4>📤 Export / 📥 Import</h4>
                <textarea id="twcc-export-box" class="twx-textarea" spellcheck="false"></textarea>
                <div class="ao-actions">
                    <button class="twx-btn" id="twcc-export-fill">Export erzeugen</button>
                    <button class="twx-btn" id="twcc-export-copy">Kopieren</button>
                    <button class="twx-btn" id="twcc-import-apply">Import anwenden</button>
                </div>
                <div class="twx-small">Export enthält Master-Einstellungen, Tab-Modus, Modulstatus, BotGuard, Korrikarten und Modul-Konfigurationen.</div>
            </div>
            <div class="twx-tool-section">
                <h4>🔄 Updates / Cache</h4>
                <div class="twx-tool-grid">
                    <button class="twx-btn" id="twcc-cache-all">Alle externen Module neu laden</button>
                    <button class="twx-btn" id="twcc-reset-master">Master-Einstellungen resetten</button>
                </div>
            </div>
            <div class="twx-tool-section">
                <h4>📝 Changelog</h4>
                <div class="twx-small">
                    <b>v2.1.3</b><br>
                    + Werkzeuge-Fenster<br>
                    + Export/Import Einstellungen<br>
                    + CacheBust pro Modul und global<br>
                    + Reset einzelner Module<br>
                    + Entwicklerbereich<br>
                    + Changelog im Master
                </div>
            </div>
        `;

        const panel = ToolboxCore.Window.create({
            id: 'twcc-tools',
            title: '🧰 TWCC Werkzeuge',
            width: 700,
            height: 620,
            content
        });
        ToolboxCore.Window.toggle('twcc-tools', true);

        const box = document.getElementById('twcc-export-box');
        if (box && !box.value) box.value = exportTwccSettings();

        document.getElementById('twcc-export-fill')?.addEventListener('click', () => {
            box.value = exportTwccSettings();
            ToolboxCore.Notify.success('Export erzeugt');
        });
        document.getElementById('twcc-export-copy')?.addEventListener('click', async () => {
            box.value = box.value || exportTwccSettings();
            try {
                await navigator.clipboard.writeText(box.value);
                ToolboxCore.Notify.success('Export kopiert');
            } catch (e) {
                box.select();
                document.execCommand('copy');
                ToolboxCore.Notify.success('Export markiert/kopiert');
            }
        });
        document.getElementById('twcc-import-apply')?.addEventListener('click', () => {
            if (!confirm('Einstellungen wirklich importieren und Seite neu laden?')) return;
            importTwccSettings(box.value);
        });
        document.getElementById('twcc-cache-all')?.addEventListener('click', () => {
            if (!confirm('Alle externen Module mit CacheBust markieren und neu laden?')) return;
            Object.values(Modules).forEach(mod => {
                if (mod.scriptUrl) {
                    core.modules[mod.id] = core.modules[mod.id] || {};
                    core.modules[mod.id].cacheBust = Date.now();
                }
            });
            saveJson(CORE_KEY, core);
            location.reload();
        });
        document.getElementById('twcc-reset-master')?.addEventListener('click', () => {
            if (!confirm('TWCC Master-Einstellungen wirklich zurücksetzen? Moduleinstellungen bleiben teilweise erhalten.')) return;
            core = deepClone(DEFAULT_CORE);
            saveJson(CORE_KEY, core);
            sessionStorage.removeItem(TAB_KEY);
            location.reload();
        });

        return panel;
    }

    function createDeveloperPanel() {
        const modules = Object.values(Modules);
        const active = modules.filter(m => getModuleState(m.id).effective);
        const currentPage = location.pathname + location.search;
        const rows = modules.map(m => {
            const s = getModuleState(m.id);
            const here = typeof m.matchesPage === 'function' ? m.matchesPage() : true;
            return `<tr>
                <td>${escapeHtml(m.icon || '')} ${escapeHtml(m.name)}</td>
                <td>${s.globalEnabled ? 'ON' : 'OFF'}</td>
                <td>${escapeHtml(s.tabMode)}</td>
                <td>${s.effective ? 'aktiv' : 'aus'}</td>
                <td>${here ? 'ja' : 'nein'}</td>
                <td>${escapeHtml(m.source || '-')}</td>
            </tr>`;
        }).join('');

        const content = `
            <div class="twx-info-box">
                <h3 style="margin-top:0;">🛠 TWCC Developer</h3>
                <div><span class="twx-pill">Module ${active.length}/${modules.length}</span><span class="twx-pill">Core v2.1.3</span><span class="twx-pill">${escapeHtml((typeof game_data !== 'undefined' ? game_data.world : '') || 'unknown')}</span></div>
                <div class="twx-tool-section">
                    <h4>Seite</h4>
                    <div class="twx-small"><b>URL:</b> ${escapeHtml(currentPage)}<br><b>Screen:</b> ${escapeHtml((typeof game_data !== 'undefined' ? game_data.screen : '') || '-')}</div>
                </div>
                <div class="twx-tool-section">
                    <h4>Module</h4>
                    <table class="vis" style="width:100%;font-size:11px;">
                        <tr><th>Modul</th><th>Global</th><th>Tab</th><th>Effektiv</th><th>Seite</th><th>Typ</th></tr>
                        ${rows}
                    </table>
                </div>
                <div class="ao-actions">
                    <button class="twx-btn" id="twcc-dev-copy-state">State kopieren</button>
                    <button class="twx-btn" id="twcc-dev-clear-tab">Tab-Overrides löschen</button>
                </div>
            </div>
        `;

        const panel = ToolboxCore.Window.create({
            id: 'twcc-dev',
            title: '🛠 TWCC Developer',
            width: 760,
            height: 620,
            content
        });
        ToolboxCore.Window.toggle('twcc-dev', true);

        document.getElementById('twcc-dev-copy-state')?.addEventListener('click', async () => {
            const dump = exportTwccSettings();
            try {
                await navigator.clipboard.writeText(dump);
                ToolboxCore.Notify.success('State kopiert');
            } catch (e) {
                prompt('State kopieren:', dump);
            }
        });
        document.getElementById('twcc-dev-clear-tab')?.addEventListener('click', () => {
            if (!confirm('Tab-Overrides für diesen Browser-Tab löschen?')) return;
            tabOverrides = {};
            saveTabOverrides(tabOverrides);
            location.reload();
        });

        return panel;
    }

    function createAttackTimerInfoPanel() {
        return ToolboxCore.Window.create({
            id: 'attackTimerServerMs-help',
            title: '⏱️ DS Angriff Timer ServerMS',
            width: 440,
            height: 260,
            content: `<div class="twx-info-box">
                <h3 style="margin-top:0;">⏱️ DS Angriff Timer ServerMS</h3>
                <p>Dieses Modul läuft nur auf der Angriffs-Bestätigungsseite.</p>
                <div class="twx-small">
                    Erwartete Seite:<br>
                    <b>Versammlungsplatz → Angriff bestätigen</b><br><br>
                    Erkennungsbedingung:<br>
                    <code>screen=place</code> und <code>try=confirm</code>
                </div>
                <hr>
                <div class="twx-small">Auf der passenden Seite erscheint automatisch die Timer-Maske.</div>
            </div>`
        });
    }

    function twccInfoValue(info, key, fallback) {
        const value = String(info?.[key] ?? '').trim();
        return value || fallback;
    }


    function createPremiumDepotSettingsPanel() {
        const STORAGE_KEY = 'twcc-premium-depot-quick-buttons:buttons';
        const DEFAULTS = [
            { id: '250k', label: '250k', type: 'fixed', value: 250000, enabled: true },
            { id: '350k', label: '350k', type: 'fixed', value: 350000, enabled: true },
            { id: '70k', label: '70k', type: 'fixed', value: 70000, enabled: true },
            { id: 'custom', label: 'Custom', type: 'custom', value: null, enabled: true },
            { id: 'max', label: 'MAX', type: 'max', value: null, enabled: true }
        ];

        const readButtons = () => {
            try {
                const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
                return Array.isArray(value) && value.length ? value : JSON.parse(JSON.stringify(DEFAULTS));
            } catch (_) {
                return JSON.parse(JSON.stringify(DEFAULTS));
            }
        };

        let buttons = readButtons();

        const panel = ToolboxCore.Window.create({
            id: 'premium-depot-quick-buttons-settings',
            title: '💰 Premium-Depot Quick Buttons',
            width: 790,
            height: 560,
            render(body) {
                body.innerHTML = `
                    <div class="twcc-theme-card">
                        <b>Button-Verwaltung</b>
                        <p class="twcc-settings-note">
                            Diese Vorlagen erscheinen getrennt bei Holz, Lehm und Eisen. Jeder Button schreibt nur in das zugehörige BUY-Feld.
                        </p>
                        <div id="pdq-settings-list"></div>
                        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">
                            <button class="twx-btn" id="pdq-settings-add">➕ Button hinzufügen</button>
                            <button class="twx-btn" id="pdq-settings-save">💾 Speichern</button>
                            <button class="twx-btn" id="pdq-settings-reset">↩ Standard</button>
                        </div>
                    </div>
                    </div>`;

                const list = body.querySelector('#pdq-settings-list');

                const renderRows = () => {
                    list.innerHTML = buttons.map((button, index) => `
                        <div class="pdq-setting-row" data-index="${index}" style="display:grid;grid-template-columns:42px minmax(100px,1fr) 120px minmax(110px,1fr) 36px 36px 36px;gap:6px;align-items:center;margin-top:7px;">
                            <label style="text-align:center;" title="Sichtbar">
                                <input class="pdq-enabled" type="checkbox" ${button.enabled !== false ? 'checked' : ''}>
                            </label>
                            <input class="twx-input pdq-label" value="${escapeHtml(button.label || '')}" placeholder="Button-Text">
                            <select class="twx-select pdq-type">
                                <option value="fixed" ${button.type === 'fixed' ? 'selected' : ''}>Fester Wert</option>
                                <option value="custom" ${button.type === 'custom' ? 'selected' : ''}>Custom</option>
                                <option value="max" ${button.type === 'max' ? 'selected' : ''}>MAX</option>
                            </select>
                            <input class="twx-input pdq-value" type="number" min="1" step="1"
                                   value="${button.type === 'fixed' && button.value ? Number(button.value) : ''}"
                                   placeholder="Wert">
                            <button class="twx-btn pdq-up" title="Nach oben">↑</button>
                            <button class="twx-btn pdq-down" title="Nach unten">↓</button>
                            <button class="twx-btn pdq-delete" title="Löschen">✕</button>
                        </div>
                    `).join('');

                    list.querySelectorAll('.pdq-setting-row').forEach(row => {
                        const index = Number(row.dataset.index);
                        const type = row.querySelector('.pdq-type');
                        const value = row.querySelector('.pdq-value');
                        const syncValueState = () => {
                            value.disabled = type.value !== 'fixed';
                            if (value.disabled) value.value = '';
                        };
                        type.addEventListener('change', syncValueState);
                        syncValueState();

                        row.querySelector('.pdq-up').addEventListener('click', () => {
                            if (index <= 0) return;
                            [buttons[index - 1], buttons[index]] = [buttons[index], buttons[index - 1]];
                            renderRows();
                        });
                        row.querySelector('.pdq-down').addEventListener('click', () => {
                            if (index >= buttons.length - 1) return;
                            [buttons[index + 1], buttons[index]] = [buttons[index], buttons[index + 1]];
                            renderRows();
                        });
                        row.querySelector('.pdq-delete').addEventListener('click', () => {
                            buttons.splice(index, 1);
                            renderRows();
                        });
                    });
                };

                const collectRows = () => {
                    const next = [];
                    list.querySelectorAll('.pdq-setting-row').forEach((row, index) => {
                        const label = row.querySelector('.pdq-label').value.trim();
                        const type = row.querySelector('.pdq-type').value;
                        const rawValue = Number(row.querySelector('.pdq-value').value);
                        if (!label) return;
                        if (type === 'fixed' && (!Number.isFinite(rawValue) || rawValue <= 0)) return;
                        next.push({
                            id: `button-${Date.now()}-${index}`,
                            label,
                            type,
                            value: type === 'fixed' ? Math.floor(rawValue) : null,
                            enabled: row.querySelector('.pdq-enabled').checked
                        });
                    });
                    return next;
                };

                body.querySelector('#pdq-settings-add').addEventListener('click', () => {
                    buttons = collectRows();
                    buttons.push({
                        id: `button-${Date.now()}`,
                        label: 'Neu',
                        type: 'fixed',
                        value: 100000,
                        enabled: true
                    });
                    renderRows();
                });

                body.querySelector('#pdq-settings-save').addEventListener('click', () => {
                    const next = collectRows();
                    if (!next.length) {
                        if (typeof UI !== 'undefined' && UI.ErrorMessage) UI.ErrorMessage('Mindestens ein gültiger Button ist erforderlich.');
                        return;
                    }
                    buttons = next;
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(buttons));
                    try {
                        const api = win['twcc-premium-depot-quick-buttons'];
                        if (api && typeof api.refresh === 'function') api.refresh();
                    } catch (_) {}
                    if (typeof UI !== 'undefined' && UI.SuccessMessage) UI.SuccessMessage('Premium-Depot Buttons gespeichert.');
                });

                body.querySelector('#pdq-settings-reset').addEventListener('click', () => {
                    buttons = JSON.parse(JSON.stringify(DEFAULTS));
                    renderRows();
                });

                renderRows();
            }
        });

        ToolboxCore.Window.toggle('premium-depot-quick-buttons-settings', true);
        return panel;
    }

    function createModuleInfoPanel(mod) {
        const info = TOOL_INFO[mod.id] || {};
        const panelId = 'module-info-' + mod.id;
        const existing = document.getElementById('twx-window-' + panelId);
        if (existing) {
            existing.remove();
        }

        const description = twccInfoValue(info, 'description', 'HIER GEHÖRT DEINE BESCHREIBUNG REIN');
        const instructions = twccInfoValue(info, 'instructions', 'HIER GEHÖRT DEINE ANLEITUNG REIN');
        const tips = twccInfoValue(info, 'tips', 'HIER GEHÖREN DEINE TIPPS REIN');
        const notes = twccInfoValue(info, 'notes', 'HIER GEHÖREN WICHTIGE HINWEISE REIN');

        const panel = ToolboxCore.Window.create({
            id: panelId,
            title: 'ℹ ' + mod.name,
            width: 620,
            height: 590,
            content: `<div class="twx-info-box">
                <h3 style="margin-top:0;">${escapeHtml(mod.icon || '🧩')} ${escapeHtml(mod.name)}</h3>

                <div class="twcc-info-section">
                    <h4>📌 Beschreibung</h4>
                    <div class="twcc-info-text">${escapeHtml(description)}</div>
                </div>

                <div class="twcc-info-section">
                    <h4>📖 Anleitung</h4>
                    <div class="twcc-info-text">${escapeHtml(instructions)}</div>
                </div>

                <div class="twcc-info-section">
                    <h4>💡 Tipps</h4>
                    <div class="twcc-info-text">${escapeHtml(tips)}</div>
                </div>

                <div class="twcc-info-section">
                    <h4>⚠ Wichtige Hinweise</h4>
                    <div class="twcc-info-text">${escapeHtml(notes)}</div>
                </div>

                <div class="ao-actions">
                    <button class="twx-btn" id="twx-info-settings-${escapeHtml(mod.id)}">⚙ Einstellungen öffnen</button>
                </div>
            </div>`
        });

        ToolboxCore.Window.toggle(panelId, true);
        const btn = document.getElementById('twx-info-settings-' + mod.id);
        if (btn) btn.addEventListener('click', () => mod.openSettings());
        return panel;
    }

    // Öffentliche Helferfunktion: TWCC.showInfo('farmGodExternal')
    function showInfo(moduleId) {
        const mod = Modules[String(moduleId || '')];
        if (!mod) {
            ToolboxCore.Notify.warning('Keine Info für dieses Modul gefunden.');
            return null;
        }
        return createModuleInfoPanel(mod);
    }

    win.TWCC = Object.assign(win.TWCC || {}, {
        showInfo,
        ToolInfo: TOOL_INFO
    });

    const BotGuard = (function () {
        let interval = null;
        let alarmInterval = null;
        let paused = false;

        function normalize(text) {
            return String(text || '').replace(/\s+/g, ' ').trim();
        }

        function isActive() {
            if (document.getElementById('botprotection_quest')) return true;

            const clone = document.body ? document.body.cloneNode(true) : null;
            if (clone) {
                clone.querySelector('#twx-botguard-banner')?.remove();
                clone.querySelector('#twx-master-panel')?.remove();
                clone.querySelector('#twx-master-toggle')?.remove();
                clone.querySelector('#ao-gui-panel')?.remove();
                clone.querySelector('#dsui-gui-panel')?.remove();
                clone.querySelector('#dsv-gui-panel')?.remove();
                clone.querySelector('#botguard-gui-panel')?.remove();
                clone.querySelector('#twx-core-toast')?.remove();
                clone.querySelectorAll('[id^="twx-window-"]').forEach(e=>e.remove());
            }

            const bodyText = normalize(clone?.innerText || '');
            return bodyText.includes('Bot-Schutz-Prüfung') ||
                bodyText.includes('Bot Schutz Prüfung') ||
                bodyText.includes('Bot-Schutz') ||
                bodyText.toLowerCase().includes('bot protection');
        }

        function ensureBanner() {
            let el = document.getElementById('twx-botguard-banner');
            if (el) return el;

            el = document.createElement('div');
            el.id = 'twx-botguard-banner';
            el.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
                    <b>🛑 BOT-SCHUTZ aktiv – bitte manuell lösen. Toolbox pausiert.</b>
                    <button id="twx-botguard-ok" class="twx-btn" style="background:#fff;color:#7b1d1d;">OK, gelöst</button>
                </div>`;
            (document.body || document.documentElement).appendChild(el);

            el.querySelector('#twx-botguard-ok').addEventListener('click', () => {
                if (!isActive()) {
                    paused = false;
                    stopAlarm();
                    el.style.display = 'none';
                    try { win.UI && win.UI.SuccessMessage && win.UI.SuccessMessage('BotGuard: Bot-Schutz gelöst.'); } catch (e) {}
                    console.log('[TW Control Center] BotGuard: Bot-Schutz gelöst.');
                    location.reload();
                } else {
                    try { win.UI && win.UI.ErrorMessage && win.UI.ErrorMessage('BotGuard: Bot-Schutz ist noch aktiv.'); } catch (e) {}
                }
            });

            return el;
        }

        function pauseAll() {
            if (paused) return;
            paused = true;
            console.warn('[TW Control Center] BotGuard: Bot-Schutz erkannt. Module werden pausiert.');
            ensureBanner().style.display = 'block';
            startAlarm();
        }

        function startAlarm() {
            if (!botGuardConfig.alarmEnabled || alarmInterval) return;

            const beep = function () {
                try {
                    const AudioCtx = window.AudioContext || window.webkitAudioContext;
                    if (!AudioCtx) return;
                    const ctx = new AudioCtx();
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = 900;
                    gain.gain.value = Math.max(0, Math.min(1, Number(botGuardConfig.alarmVolume) || 0));
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start();
                    setTimeout(() => {
                        try { osc.stop(); } catch (e) {}
                        try { ctx.close(); } catch (e) {}
                    }, 300);
                } catch (e) {}
            };

            beep();
            alarmInterval = setInterval(beep, 8000);
        }

        function stopAlarm() {
            if (alarmInterval) {
                clearInterval(alarmInterval);
                alarmInterval = null;
            }
        }

        function start() {
            if (interval) return;
            if (isActive()) pauseAll();
            interval = setInterval(() => {
                if (isActive()) pauseAll();
            }, 1000);
        }

        function isPaused() { return paused; }

        return { start, isActive, isPaused, stopAlarm };
    })();

    function createBotGuardPanel(forceHidden = true) {
        let panel = document.getElementById('botguard-gui-panel');
        if (panel) {
            panel.classList.remove('twx-hidden');
            botGuardConfig.panel.collapsed = false;
            saveJson(BOTGUARD_KEY, botGuardConfig);
            return;
        }

        panel = document.createElement('div');
        panel.id = 'botguard-gui-panel';
        panel.className = 'twx-panel' + ((forceHidden || botGuardConfig.panel.collapsed) ? ' twx-hidden' : '');
        panel.style.width = (botGuardConfig.panel.width || 460) + 'px';
        panel.style.height = (botGuardConfig.panel.height || 280) + 'px';
        panel.style.left = (botGuardConfig.panel.left ?? 140) + 'px';
        panel.style.top = (botGuardConfig.panel.top ?? 150) + 'px';
        panel.innerHTML = `
            <div class="twx-header" id="botguard-gui-header">
                <span>BotGuard Einstellungen</span><span class="twx-close" id="botguard-close">×</span>
            </div>
            <div class="twx-body">
                <div class="twx-module-row" style="grid-template-columns:1fr 72px;">
                    <div>
                        <div class="twx-module-name">Alarm</div>
                        <div class="twx-status">Piept, solange Bot-Schutz aktiv ist.</div>
                    </div>
                    <label class="twx-switch"><input id="botguard-alarm" type="checkbox" ${botGuardConfig.alarmEnabled ? 'checked' : ''}><span class="twx-slider"></span></label>
                </div>
                <label style="display:block;margin-top:12px;font-weight:bold;">Lautstärke: <span id="botguard-volume-label">${Math.round((Number(botGuardConfig.alarmVolume) || 0) * 100)}%</span></label>
                <input id="botguard-volume" type="range" min="0" max="100" value="${Math.round((Number(botGuardConfig.alarmVolume) || 0) * 100)}" style="width:100%;margin-top:8px;">
                <div class="twx-small">
                    BotGuard löst nichts automatisch. Er erkennt nur, pausiert die Toolbox und warnt dich, damit alles sauber und regelkonform bleibt.
                </div>
                <div class="ao-actions">
                    <button class="twx-btn" id="botguard-save">Speichern</button>
                    <button class="twx-btn" id="botguard-test">Alarm testen</button>
                </div>
            </div>`;
        document.body.appendChild(panel);

        document.getElementById('botguard-close').addEventListener('click', () => {
            panel.classList.add('twx-hidden');
            botGuardConfig.panel.collapsed = true;
            savePanelState(panel, botGuardConfig.panel, BOTGUARD_KEY, botGuardConfig);
        });
        document.getElementById('botguard-volume').addEventListener('input', e => {
            document.getElementById('botguard-volume-label').textContent = e.target.value + '%';
        });
        document.getElementById('botguard-save').addEventListener('click', () => {
            botGuardConfig.alarmEnabled = document.getElementById('botguard-alarm').checked;
            botGuardConfig.alarmVolume = Number(document.getElementById('botguard-volume').value) / 100;
            saveJson(BOTGUARD_KEY, botGuardConfig);
            BotGuard.stopAlarm();
            try { win.UI && win.UI.SuccessMessage && win.UI.SuccessMessage('BotGuard Einstellungen gespeichert.'); } catch (e) {}
        });
        document.getElementById('botguard-test').addEventListener('click', () => {
            const oldEnabled = botGuardConfig.alarmEnabled;
            botGuardConfig.alarmEnabled = true;
            const oldVol = botGuardConfig.alarmVolume;
            botGuardConfig.alarmVolume = Number(document.getElementById('botguard-volume').value) / 100;
            try {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                const ctx = new AudioCtx();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine'; osc.frequency.value = 900;
                gain.gain.value = Math.max(0, Math.min(1, botGuardConfig.alarmVolume));
                osc.connect(gain); gain.connect(ctx.destination); osc.start();
                setTimeout(() => { try { osc.stop(); } catch(e){} try { ctx.close(); } catch(e){} }, 300);
            } catch (e) {}
            botGuardConfig.alarmEnabled = oldEnabled;
            botGuardConfig.alarmVolume = oldVol;
        });
        makeDraggable(panel, document.getElementById('botguard-gui-header'), () => savePanelState(panel, botGuardConfig.panel, BOTGUARD_KEY, botGuardConfig));
        observeResize(panel, () => savePanelState(panel, botGuardConfig.panel, BOTGUARD_KEY, botGuardConfig));
    }

    function applyAttackOrganizerGlobals() {
        win.font_size = Number(aoConfig.fontSize) || 8;
        win.attack_layout = aoConfig.layout || 'column';
        win.settings = {};
        win.colors = {
            red: ['#e20606', '#b70707'], green: ['#31c908', '#228c05'], blue: ['#0d83dd', '#0860a3'],
            yellow: ['#ffd91c', '#e8c30d'], orange: ['#ef8b10', '#d3790a'], lblue: ['#22e5db', '#0cd3c9'],
            lime: ['#ffd400', '#ffd400'], white: ['#ffffff', '#dbdbdb'], black: ['#000000', '#2b2b2b'],
            gray: ['#adb6c6', '#828891'], dorange: ['#ff0000', '#ff0000'], pink: ['#ff69b4', '#ff69b4']
        };
        aoConfig.buttons.forEach((item, index) => {
            const bgKey = `ao_bg_${index}`;
            const fgKey = `ao_fg_${index}`;
            win.settings[index] = [item.text || '', item.button || '', bgKey, fgKey, item.mode || ((item.text || '').includes('|') ? 'append' : 'replace')];
            win.colors[bgKey] = [item.bg || '#ffffff', item.bg2 || item.bg || '#ffffff'];
            win.colors[fgKey] = [item.fg || '#000000', item.fg || '#000000'];
        });
    }

    function createAttackOrganizerPanel(forceHidden = true) {
        let panel = document.getElementById('ao-gui-panel');
        if (panel) {
            panel.classList.remove('twx-hidden');
            aoConfig.panel.collapsed = false;
            saveJson(AO_KEY, aoConfig);
            return;
        }
        panel = document.createElement('div');
        panel.id = 'ao-gui-panel';
        panel.className = 'twx-panel' + (forceHidden && aoConfig.panel.collapsed ? ' twx-hidden' : '');
        panel.style.width = (aoConfig.panel.width || 560) + 'px';
        panel.style.height = (aoConfig.panel.height || 460) + 'px';
        panel.style.left = (aoConfig.panel.left ?? (window.innerWidth - 610)) + 'px';
        panel.style.top = (aoConfig.panel.top ?? 150) + 'px';
        panel.innerHTML = `
            <div class="twx-header" id="ao-gui-header"><span>Attack Organizer v3.5 – Einstellungen</span><span class="twx-close" id="ao-gui-close">×</span></div>
            <div class="twx-body">
                <div class="ao-top-grid">
                    <label>Schriftgröße</label><input id="ao-font-size" class="twx-input" type="number" min="6" max="24" value="${escapeHtml(aoConfig.fontSize)}">
                    <label>Layout</label><select id="ao-layout" class="twx-select"><option value="column">Spalte</option><option value="line">Zeile</option><option value="nothing">Nichts</option></select>
                </div>
                <div class="ao-row ao-head"><div></div><div>Angezeigter Text</div><div>Button</div><div>Aktion</div><div>Farbe 1</div><div>Farbe 2</div><div>Textfarbe</div></div>
                <div id="ao-button-list"></div>
                <div class="ao-actions">
                    <button class="twx-btn" id="ao-save">Speichern & neu laden</button>
                    <button class="twx-btn" id="ao-add">+ Button</button>
                    <button class="twx-btn" id="ao-export">📤 Export</button>
                    <button class="twx-btn" id="ao-import">📥 Import</button>
                    <button class="twx-btn" id="ao-reset">Reset</button>
                </div>
                <div class="twx-small">Zeilen am Griff ☰ verschieben. Blau = Status ersetzen, Grün = Zusatz anhängen. Die Aktion lässt sich pro Zeile frei auswählen.</div>
            </div>`;
        document.body.appendChild(panel);
        document.getElementById('ao-layout').value = aoConfig.layout || 'column';
        renderAoRows();

        document.getElementById('ao-gui-close').addEventListener('click', () => {
            panel.classList.add('twx-hidden');
            aoConfig.panel.collapsed = true;
            savePanelState(panel, aoConfig.panel, AO_KEY, aoConfig);
        });
        document.getElementById('ao-save').addEventListener('click', () => {
            readAoPanelValues();
            savePanelState(panel, aoConfig.panel, AO_KEY, aoConfig);
            saveJson(AO_KEY, aoConfig);
            location.reload();
        });
        document.getElementById('ao-add').addEventListener('click', () => {
            readAoPanelValues(false);
            aoConfig.buttons.push({ text: '[Neu]', button: 'N', mode: 'replace', bg: '#31c908', bg2: '#228c05', fg: '#ffffff' });
            renderAoRows();
        });
        document.getElementById('ao-export').addEventListener('click', () => {
            readAoPanelValues(true);
            saveJson(AO_KEY, aoConfig);
            exportModule('attackOrganizer', {
                fontSize: aoConfig.fontSize,
                layout: aoConfig.layout,
                buttons: deepClone(aoConfig.buttons)
            }, {
                moduleLabel: 'Attack Organizer',
                moduleVersion: Modules.attackOrganizer.version,
                fileName: 'Attack_Organizer_Einstellungen'
            });
        });
        document.getElementById('ao-import').addEventListener('click', () => {
            importModule('attackOrganizer', imported => {
                if (!imported || typeof imported !== 'object' || Array.isArray(imported)) {
                    throw new Error('Ungültige Attack-Organizer-Einstellungen.');
                }
                if (!Array.isArray(imported.buttons)) {
                    throw new Error('Die Datei enthält keine gültige Button-Liste.');
                }
                const validLayouts = ['column', 'line', 'nothing'];
                const cleanedButtons = imported.buttons.map((item, index) => {
                    if (!item || typeof item !== 'object' || Array.isArray(item)) {
                        throw new Error('Button ' + (index + 1) + ' ist ungültig.');
                    }
                    return {
                        text: String(item.text ?? ''),
                        button: String(item.button ?? ''),
                        mode: item.mode === 'append' ? 'append' : 'replace',
                        bg: safeColor(item.bg, '#ffffff'),
                        bg2: safeColor(item.bg2 || item.bg, '#ffffff'),
                        fg: safeColor(item.fg, '#000000')
                    };
                });
                const localPanel = deepClone(aoConfig.panel || DEFAULT_AO.panel);
                aoConfig = {
                    fontSize: Math.min(24, Math.max(6, Number(imported.fontSize) || DEFAULT_AO.fontSize)),
                    layout: validLayouts.includes(imported.layout) ? imported.layout : DEFAULT_AO.layout,
                    buttons: cleanedButtons,
                    panel: localPanel
                };
                saveJson(AO_KEY, aoConfig);
                document.getElementById('ao-font-size').value = aoConfig.fontSize;
                document.getElementById('ao-layout').value = aoConfig.layout;
                renderAoRows();
                applyAttackOrganizerGlobals();
                ToolboxCore.Notify.success('Attack-Organizer-Einstellungen übernommen. Neu laden, damit alle Seitenbereiche aktualisiert werden.');
                return aoConfig;
            }, {
                moduleLabel: 'Attack Organizer',
                validateData(data) {
                    if (!data || typeof data !== 'object' || Array.isArray(data)) return 'Ungültige Attack-Organizer-Daten.';
                    if (!Array.isArray(data.buttons)) return 'Die Datei enthält keine Attack-Organizer-Buttons.';
                    return true;
                }
            }).catch(() => {});
        });
        document.getElementById('ao-reset').addEventListener('click', () => {
            if (!confirm('Wirklich alle Attack Organizer Einstellungen zurücksetzen?')) return;
            aoConfig = deepClone(DEFAULT_AO);
            saveJson(AO_KEY, aoConfig);
            location.reload();
        });
        makeDraggable(panel, document.getElementById('ao-gui-header'), () => savePanelState(panel, aoConfig.panel, AO_KEY, aoConfig));
        observeResize(panel, () => savePanelState(panel, aoConfig.panel, AO_KEY, aoConfig));
    }

    function renderAoRows() {
        const list = document.getElementById('ao-button-list');
        if (!list) return;
        list.innerHTML = '';

        aoConfig.buttons.forEach((item, index) => {
            const row = document.createElement('div');
            row.className = 'ao-row';
            row.draggable = true;
            row.dataset.index = String(index);
            row.dataset.mode = item.mode || ((item.text || '').includes('|') ? 'append' : 'replace');

            row.innerHTML = `
                <div class="ao-drag" title="Ziehen zum Sortieren">☰</div>
                <input class="twx-input ao-text" value="${escapeHtml(item.text || '')}">
                <input class="twx-input ao-button" value="${escapeHtml(item.button || '')}">
                <select class="twx-select ao-mode" title="Was soll dieser Button mit dem Angriffsnamen machen?">
                    <option value="replace">Status ersetzen</option>
                    <option value="append">Zusatz anhängen</option>
                </select>
                <input class="twx-input ao-bg" type="color" value="${safeColor(item.bg, '#ffffff')}">
                <input class="twx-input ao-bg2" type="color" value="${safeColor(item.bg2 || item.bg, '#ffffff')}">
                <div style="display:flex; gap:4px;">
                    <input class="twx-input ao-fg" type="color" value="${safeColor(item.fg, '#000000')}">
                    <button class="twx-btn ao-delete" title="Löschen" style="width:32px; padding:4px;">×</button>
                </div>`;

            const modeSelect = row.querySelector('.ao-mode');
            modeSelect.value = row.dataset.mode;
            modeSelect.addEventListener('change', () => {
                row.dataset.mode = modeSelect.value;
            });

            row.querySelector('.ao-delete').addEventListener('click', () => {
                readAoPanelValues(false);
                aoConfig.buttons.splice(index, 1);
                renderAoRows();
            });

            row.addEventListener('dragstart', event => {
                readAoPanelValues(false);
                row.classList.add('ao-dragging');
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', String(index));
            });

            row.addEventListener('dragend', () => {
                row.classList.remove('ao-dragging');
            });

            row.addEventListener('dragover', event => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
            });

            row.addEventListener('drop', event => {
                event.preventDefault();
                const from = Number(event.dataTransfer.getData('text/plain'));
                const to = Number(row.dataset.index);
                if (!Number.isInteger(from) || !Number.isInteger(to) || from === to) return;

                const [moved] = aoConfig.buttons.splice(from, 1);
                aoConfig.buttons.splice(to, 0, moved);
                renderAoRows();
            });

            list.appendChild(row);
        });
    }

    function readAoPanelValues(readTop = true) {
        if (readTop) {
            aoConfig.fontSize = Number(document.getElementById('ao-font-size').value) || 8;
            aoConfig.layout = document.getElementById('ao-layout').value || 'column';
        }
        aoConfig.buttons = Array.from(document.querySelectorAll('#ao-button-list .ao-row')).map(row => ({
            text: row.querySelector('.ao-text').value,
            button: row.querySelector('.ao-button').value,
            mode: row.querySelector('.ao-mode').value,
            bg: row.querySelector('.ao-bg').value,
            bg2: row.querySelector('.ao-bg2').value,
            fg: row.querySelector('.ao-fg').value
        }));
    }

    function applyDsUiGlobals() {
        win.CopyAndExportButton = !!dsuiConfig.CopyAndExportButton;
        win.OverviewVillages = !!dsuiConfig.OverviewVillages;
        win.TroopCounter = !!dsuiConfig.TroopCounter;
        win.InfoVillage = !!dsuiConfig.InfoVillage;
        win.ReportBashPoints = !!dsuiConfig.ReportBashPoints;
        win.ReportSurvived = !!dsuiConfig.ReportSurvived;
        win.MassSupport = !!dsuiConfig.MassSupport;
        win.Transport = !!dsuiConfig.Transport;
        win.FlagStats = !!dsuiConfig.FlagStats;
        win.AllySummarie = !!dsuiConfig.AllySummarie;
        win.spear_bunker_value = Number(dsuiConfig.spear_bunker_value) || 20000;
        win.PlaceFilters = !!dsuiConfig.PlaceFilters;
        win.ReportSpyInfo = !!dsuiConfig.ReportSpyInfo;
        win.ReportTimes = !!dsuiConfig.ReportTimes;
        win.CommandAndNotesSharing = !!dsuiConfig.CommandAndNotesSharing;
        win.ReportPreview = !!dsuiConfig.ReportPreview;
    }

    const DSUI_FIELDS = [
        ['CopyAndExportButton', 'Dörfer kopieren + WB Button'],
        ['OverviewVillages', 'Produktion Zusammenfassung'],
        ['TroopCounter', 'Truppenzähler'],
        ['InfoVillage', 'Dorfinfo Zusammenfassung'],
        ['ReportBashPoints', 'Bericht Bashpunkte + UT-Zusammenfassung'],
        ['ReportSurvived', 'Überlebende Truppen Zeile'],
        ['MassSupport', 'Massen-Unterstützung Zusammenfassung'],
        ['Transport', 'Transport Zusammenfassung'],
        ['FlagStats', 'Flaggen Zusammenfassung'],
        ['AllySummarie', 'Ally Mitglieder Zusammenfassungen'],
        ['PlaceFilters', 'Sortier/Filter im Versammlungsplatz'],
        ['ReportSpyInfo', 'Zusatzinfo bei Spähberichten'],
        ['ReportTimes', 'Abschick- und Retime Zeiten'],
        ['CommandAndNotesSharing', 'Befehlsfreigabe/Notizen Sharing'],
        ['ReportPreview', 'UT-Berichte Vorschau']
    ];

    function createDsUiPanel(forceHidden = true) {
        let panel = document.getElementById('dsui-gui-panel');
        if (panel) {
            panel.classList.remove('twx-hidden');
            dsuiConfig.panel.collapsed = false;
            saveJson(DSUI_KEY, dsuiConfig);
            return;
        }
        panel = document.createElement('div');
        panel.id = 'dsui-gui-panel';
        panel.className = 'twx-panel' + (forceHidden && dsuiConfig.panel.collapsed ? ' twx-hidden' : '');
        panel.style.width = (dsuiConfig.panel.width || 560) + 'px';
        panel.style.height = (dsuiConfig.panel.height || 520) + 'px';
        panel.style.left = (dsuiConfig.panel.left ?? (window.innerWidth - 620)) + 'px';
        panel.style.top = (dsuiConfig.panel.top ?? 170) + 'px';
        panel.innerHTML = `
            <div class="twx-header" id="dsui-gui-header"><span>DS UI Erweitert Einstellungen</span><span class="twx-close" id="dsui-gui-close">×</span></div>
            <div class="twx-body">
                <div id="dsui-field-list"></div>
                <div style="display:grid; grid-template-columns:1fr 140px; gap:8px; align-items:center; margin-top:10px;">
                    <label><b>Speer Bunker Wert</b></label>
                    <input id="dsui-spear" class="twx-input" type="number" min="0" step="100" value="${escapeHtml(dsuiConfig.spear_bunker_value)}">
                </div>
                <div class="ao-actions"><button class="twx-btn" id="dsui-save">Speichern & neu laden</button><button class="twx-btn" id="dsui-reset">Reset</button><button class="twx-btn" id="dsui-force-update">Externes Script neu laden</button></div>
                <div class="twx-small">DS UI wird nur auf seinen passenden Seiten geladen. Änderungen brauchen wegen des externen Scripts einen Reload.</div>
            </div>`;
        document.body.appendChild(panel);
        renderDsUiRows();
        document.getElementById('dsui-gui-close').addEventListener('click', () => {
            panel.classList.add('twx-hidden');
            dsuiConfig.panel.collapsed = true;
            savePanelState(panel, dsuiConfig.panel, DSUI_KEY, dsuiConfig);
        });
        document.getElementById('dsui-save').addEventListener('click', () => {
            readDsUiValues();
            savePanelState(panel, dsuiConfig.panel, DSUI_KEY, dsuiConfig);
            saveJson(DSUI_KEY, dsuiConfig);
            location.reload();
        });
        document.getElementById('dsui-reset').addEventListener('click', () => {
            if (!confirm('DS UI Einstellungen wirklich zurücksetzen?')) return;
            dsuiConfig = deepClone(DEFAULT_DSUI);
            saveJson(DSUI_KEY, dsuiConfig);
            location.reload();
        });
        document.getElementById('dsui-force-update').addEventListener('click', () => forceModuleUpdate('dsUiExtended'));
        makeDraggable(panel, document.getElementById('dsui-gui-header'), () => savePanelState(panel, dsuiConfig.panel, DSUI_KEY, dsuiConfig));
        observeResize(panel, () => savePanelState(panel, dsuiConfig.panel, DSUI_KEY, dsuiConfig));
    }

    function renderDsUiRows() {
        const list = document.getElementById('dsui-field-list');
        if (!list) return;
        list.innerHTML = '';
        DSUI_FIELDS.forEach(([key, label]) => {
            const row = document.createElement('div');
            row.className = 'twx-module-row';
            row.style.gridTemplateColumns = '1fr 72px';
            row.innerHTML = `
                <div class="twx-module-name">${escapeHtml(label)}</div>
                <label class="twx-switch"><input data-key="${escapeHtml(key)}" type="checkbox" ${dsuiConfig[key] ? 'checked' : ''}><span class="twx-slider"></span></label>`;
            list.appendChild(row);
        });
    }

    function readDsUiValues() {
        document.querySelectorAll('#dsui-field-list input[type="checkbox"]').forEach(input => {
            dsuiConfig[input.dataset.key] = !!input.checked;
        });
        dsuiConfig.spear_bunker_value = Number(document.getElementById('dsui-spear').value) || 20000;
    }

    function applyDsSelectVillagesGlobals() {
        const key = String(dsvConfig.activationCharCode || 'b').charAt(0).toLowerCase();
        win.filter = !!dsvConfig.filter;
        win.showWithCoords = !!dsvConfig.showWithCoords;
        win.showWithCounter = !!dsvConfig.showWithCounter;
        win.breakAfter = Number(dsvConfig.breakAfter) || 5;
        win.activationCharCode = key;
        // Zusatz-Aliasse für ältere Varianten/Abfragen des externen Scripts.
        win.activationChar = key;
        win.activationKey = key;
        win.activationKeyCode = key.toUpperCase().charCodeAt(0);
        win.activationCode = key.toUpperCase().charCodeAt(0);
    }

    const DSV_FIELDS = [
        ['filter', 'Filter aktivieren'],
        ['showWithCoords', 'Dörfer mit Koordinaten anzeigen'],
        ['showWithCounter', 'Dörfer mit Zähler anzeigen']
    ];

    function createDsSelectVillagesPanel(forceHidden = true) {
        let panel = document.getElementById('dsv-gui-panel');
        if (panel) {
            panel.classList.remove('twx-hidden');
            dsvConfig.panel.collapsed = false;
            saveJson(DSV_KEY, dsvConfig);
            return;
        }
        panel = document.createElement('div');
        panel.id = 'dsv-gui-panel';
        panel.className = 'twx-panel' + (forceHidden && dsvConfig.panel.collapsed ? ' twx-hidden' : '');
        panel.style.width = (dsvConfig.panel.width || 520) + 'px';
        panel.style.height = (dsvConfig.panel.height || 360) + 'px';
        panel.style.left = (dsvConfig.panel.left ?? (window.innerWidth - 580)) + 'px';
        panel.style.top = (dsvConfig.panel.top ?? 190) + 'px';
        panel.innerHTML = `
            <div class="twx-header" id="dsv-gui-header"><span>DSSelectVillages Einstellungen</span><span class="twx-close" id="dsv-gui-close">×</span></div>
            <div class="twx-body">
                <div id="dsv-field-list"></div>
                <div style="display:grid; grid-template-columns:1fr 140px; gap:8px; align-items:center; margin-top:10px;">
                    <label><b>Umbruch nach</b></label>
                    <input id="dsv-break-after" class="twx-input" type="number" min="1" step="1" value="${escapeHtml(dsvConfig.breakAfter)}">
                    <label><b>Aktivierungs-Taste</b></label>
                    <input id="dsv-activation" class="twx-input" maxlength="1" value="${escapeHtml(dsvConfig.activationCharCode)}">
                </div>
                <div class="ao-actions"><button class="twx-btn" id="dsv-save">Speichern & neu laden</button><button class="twx-btn" id="dsv-reset">Reset</button><button class="twx-btn" id="dsv-force-update">Externes Script neu laden</button></div>
                <div class="twx-small">DSSelectVillages wird nur auf der Karte geladen. Änderungen brauchen wegen des externen Scripts einen Reload.</div>
            </div>`;
        document.body.appendChild(panel);
        renderDsSelectVillagesRows();
        document.getElementById('dsv-gui-close').addEventListener('click', () => {
            panel.classList.add('twx-hidden');
            dsvConfig.panel.collapsed = true;
            savePanelState(panel, dsvConfig.panel, DSV_KEY, dsvConfig);
        });
        document.getElementById('dsv-save').addEventListener('click', () => {
            readDsSelectVillagesValues();
            savePanelState(panel, dsvConfig.panel, DSV_KEY, dsvConfig);
            saveJson(DSV_KEY, dsvConfig);
            location.reload();
        });
        document.getElementById('dsv-reset').addEventListener('click', () => {
            if (!confirm('DSSelectVillages Einstellungen wirklich zurücksetzen?')) return;
            dsvConfig = deepClone(DEFAULT_DSV);
            saveJson(DSV_KEY, dsvConfig);
            location.reload();
        });
        document.getElementById('dsv-force-update').addEventListener('click', () => forceModuleUpdate('dsSelectVillages'));
        makeDraggable(panel, document.getElementById('dsv-gui-header'), () => savePanelState(panel, dsvConfig.panel, DSV_KEY, dsvConfig));
        observeResize(panel, () => savePanelState(panel, dsvConfig.panel, DSV_KEY, dsvConfig));
    }

    function renderDsSelectVillagesRows() {
        const list = document.getElementById('dsv-field-list');
        if (!list) return;
        list.innerHTML = '';
        DSV_FIELDS.forEach(([key, label]) => {
            const row = document.createElement('div');
            row.className = 'twx-module-row';
            row.style.gridTemplateColumns = '1fr 72px';
            row.innerHTML = `
                <div class="twx-module-name">${escapeHtml(label)}</div>
                <label class="twx-switch"><input data-key="${escapeHtml(key)}" type="checkbox" ${dsvConfig[key] ? 'checked' : ''}><span class="twx-slider"></span></label>`;
            list.appendChild(row);
        });
    }

    function readDsSelectVillagesValues() {
        document.querySelectorAll('#dsv-field-list input[type="checkbox"]').forEach(input => {
            dsvConfig[input.dataset.key] = !!input.checked;
        });
        dsvConfig.breakAfter = Number(document.getElementById('dsv-break-after').value) || 5;
        dsvConfig.activationCharCode = String(document.getElementById('dsv-activation').value || 'b').charAt(0);
    }

    function koriExtractName(scriptText) {
        const m = String(scriptText || '').match(/@name\s+([^\n\r]+)/);
        return m ? m[1].trim() : '';
    }

    function koriExtractWorld(scriptText) {
        const m = String(scriptText || '').match(/https:\/\/(de\d+)\.die-staemme\.de/i);
        return m ? m[1] : '';
    }

    function koriExtractBody(scriptText) {
        const s = String(scriptText || '');
        const marker = 'win.$.ajaxSetup({ cache: true });';
        const i = s.indexOf(marker);
        if (i >= 0) return s.slice(i + marker.length).trim();
        return s.trim();
    }

    function getKoriProfile(world = getCurrentWorldKey()) {
        koriConfig.profiles = koriConfig.profiles || {};
        if (!koriConfig.profiles[world]) {
            koriConfig.profiles[world] = {
                name: 'Korrikarte ' + world,
                world: world,
                enabled: true,
                body: '',
                updatedAt: Date.now()
            };
            saveJson(KORI_KEY, koriConfig);
        }
        return koriConfig.profiles[world];
    }

    function initKorrikarteProfiles() {
        const world = getCurrentWorldKey();
        const profile = getKoriProfile(world);
        if (!profile.enabled) return;
        if (!String(profile.body || '').trim()) return;

        try {
            new Function('win', '$', profile.body)(win, win.$ || win.jQuery);
            ToolboxCore.Log.add('korrikarteProfiles', 'Korrikarte ausgeführt: ' + world + ' / ' + (profile.name || 'Profil'));
        } catch (e) {
            console.error('[TW Control Center] Korrikarte Fehler:', e);
            ToolboxCore.Notify.error('Korrikarte Fehler: ' + (e && e.message ? e.message : e));
            ToolboxCore.Log.add('korrikarteProfiles', 'Fehler: ' + (e && e.message ? e.message : e));
        }
    }

    function createKorrikartePanel(forceHidden = true) {
        let panel = document.getElementById('kori-gui-panel');
        if (panel) {
            panel.classList.remove('twx-hidden');
            koriConfig.panel.collapsed = false;
            saveJson(KORI_KEY, koriConfig);
            return;
        }

        const world = getCurrentWorldKey();
        const profile = getKoriProfile(world);

        panel = document.createElement('div');
        panel.id = 'kori-gui-panel';
        panel.className = 'twx-panel' + (forceHidden && koriConfig.panel.collapsed ? ' twx-hidden' : '');
        panel.style.width = (koriConfig.panel.width || 780) + 'px';
        panel.style.height = (koriConfig.panel.height || 640) + 'px';
        panel.style.left = (koriConfig.panel.left ?? 120) + 'px';
        panel.style.top = (koriConfig.panel.top ?? 120) + 'px';

        panel.innerHTML = `
            <div class="twx-header" id="kori-gui-header">
                <span>🧭 Korrikarte Profile</span><span class="twx-close" id="kori-close">×</span>
            </div>
            <div class="twx-body">
                <div class="twx-small" style="margin-top:0;">
                    Aktuelle Welt: <b>${escapeHtml(world)}</b>. Hier kannst du die Korrikarte dieser Welt ersetzen oder bearbeiten.
                </div>

                <div class="kori-grid">
                    <label><b>Profilname</b></label>
                    <input id="kori-name" class="twx-input" value="${escapeHtml(profile.name || ('Korrikarte ' + world))}">
                    <label><b>Profil aktiv</b></label>
                    <label class="twx-switch"><input id="kori-enabled" type="checkbox" ${profile.enabled ? 'checked' : ''}><span class="twx-slider"></span></label>
                </div>

                <textarea id="kori-editor" class="kori-editor" spellcheck="false">${escapeHtml(profile.body || '')}</textarea>

                <div class="ao-actions">
                    <button class="twx-btn" id="kori-save">Speichern & neu laden</button>
                    <button class="twx-btn" id="kori-run">Jetzt testen</button>
                    <button class="twx-btn" id="kori-import">Komplettes Script importieren</button>
                    <button class="twx-btn" id="kori-export">Export kopieren</button>
                    <button class="twx-btn" id="kori-reset">Profil leeren</button>
                </div>

                <div class="twx-small">
                    Import: komplettes altes Korrikarten-Userscript einfügen. TWCC nimmt automatisch nur den veränderlichen Teil nach <code>ajaxSetup</code>.
                </div>
                <pre class="twx-log-box" data-twx-log="korrikarteProfiles">${escapeHtml(ToolboxCore.Log.get('korrikarteProfiles').slice(0, 20).join('\n') || '—')}</pre>
            </div>`;

        document.body.appendChild(panel);

        function readKoriValues() {
            const p = getKoriProfile(world);
            p.name = document.getElementById('kori-name').value || ('Korrikarte ' + world);
            p.enabled = document.getElementById('kori-enabled').checked;
            p.body = document.getElementById('kori-editor').value;
            p.updatedAt = Date.now();
        }

        document.getElementById('kori-close').addEventListener('click', () => {
            panel.classList.add('twx-hidden');
            koriConfig.panel.collapsed = true;
            savePanelState(panel, koriConfig.panel, KORI_KEY, koriConfig);
        });

        document.getElementById('kori-save').addEventListener('click', () => {
            readKoriValues();
            savePanelState(panel, koriConfig.panel, KORI_KEY, koriConfig);
            saveJson(KORI_KEY, koriConfig);
            ToolboxCore.Notify.success('Korrikarte gespeichert: ' + world);
            location.reload();
        });

        document.getElementById('kori-run').addEventListener('click', () => {
            readKoriValues();
            saveJson(KORI_KEY, koriConfig);
            initKorrikarteProfiles();
            ToolboxCore.Notify.info('Korrikarte ausgeführt');
        });

        document.getElementById('kori-import').addEventListener('click', () => {
            const full = prompt('Komplettes Korrikarten-Userscript hier einfügen:');
            if (!full) return;
            const foundName = koriExtractName(full);
            const foundWorld = koriExtractWorld(full);
            const targetWorld = foundWorld || world;
            koriConfig.profiles = koriConfig.profiles || {};
            koriConfig.profiles[targetWorld] = {
                name: foundName || ('Korrikarte ' + targetWorld),
                world: targetWorld,
                enabled: true,
                body: koriExtractBody(full),
                updatedAt: Date.now()
            };
            saveJson(KORI_KEY, koriConfig);
            ToolboxCore.Notify.success('Import gespeichert für ' + targetWorld);
            location.reload();
        });

        document.getElementById('kori-export').addEventListener('click', async () => {
            readKoriValues();
            saveJson(KORI_KEY, koriConfig);
            const p = getKoriProfile(world);
            const exportText = JSON.stringify(p, null, 2);
            try {
                await navigator.clipboard.writeText(exportText);
                ToolboxCore.Notify.success('Profil in Zwischenablage kopiert');
            } catch (e) {
                prompt('Export kopieren:', exportText);
            }
        });

        document.getElementById('kori-reset').addEventListener('click', () => {
            if (!confirm('Korrikarten-Profil für diese Welt wirklich leeren?')) return;
            koriConfig.profiles = koriConfig.profiles || {};
            delete koriConfig.profiles[world];
            saveJson(KORI_KEY, koriConfig);
            location.reload();
        });

        makeDraggable(panel, document.getElementById('kori-gui-header'), () => savePanelState(panel, koriConfig.panel, KORI_KEY, koriConfig));
        observeResize(panel, () => savePanelState(panel, koriConfig.panel, KORI_KEY, koriConfig));
    }

    function savePanelState(panel, target, key, rootObj) {
        if (!panel || !target) return;
        const rect = panel.getBoundingClientRect();
        target.left = Math.max(0, Math.round(rect.left));
        target.top = Math.max(0, Math.round(rect.top));
        target.width = Math.round(rect.width);
        target.height = Math.round(rect.height);
        target.collapsed = panel.classList.contains('twx-hidden');
        saveJson(key, rootObj);
    }

    function makeDraggable(panel, handle, onDone) {
        let dragging = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;
        handle.addEventListener('mousedown', e => {
            dragging = true; startX = e.clientX; startY = e.clientY; startLeft = panel.offsetLeft; startTop = panel.offsetTop; e.preventDefault();
        });
        document.addEventListener('mousemove', e => {
            if (!dragging) return;
            panel.style.left = Math.max(0, startLeft + e.clientX - startX) + 'px';
            panel.style.top = Math.max(0, startTop + e.clientY - startY) + 'px';
        });
        document.addEventListener('mouseup', () => { if (!dragging) return; dragging = false; if (onDone) onDone(); });
    }

    function observeResize(panel, cb) {
        if (typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(() => cb && cb());
        observer.observe(panel);
    }

    function escapeHtml(value) { return String(value).replace(/[&<>\"]/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[s])); }
    function safeColor(value, fallback) { return /^#[0-9a-fA-F]{6}$/.test(value || '') ? value : fallback; }

    // =============================
    // Modul: DS Angriff Timer ServerMS v4.5
    // Quelle: vom Nutzer bereitgestelltes lokales Script

    function boot() {

    function setupTwccHiddenHotkeys() {
        if (window.__TWCC_HIDDEN_HOTKEYS__) return;
        window.__TWCC_HIDDEN_HOTKEYS__ = true;

        document.addEventListener('keydown', (e) => {
            const key = (e.key || '').toLowerCase();

            if (e.ctrlKey && e.altKey && key === 't') {
                e.preventDefault();
                createTwccToolsPanel();
                ToolboxCore.Notify.info('TWCC Werkzeuge geöffnet');
            }

            if (e.ctrlKey && e.altKey && key === 'd') {
                e.preventDefault();
                createDeveloperPanel();
                ToolboxCore.Notify.info('TWCC Entwicklerbereich geöffnet');
            }
        });
    }

    setupTwccHiddenHotkeys();

    function setupTwccMasterDragFix() {
        const panel =
            document.getElementById('twx-master') ||
            document.querySelector('[id*="twx-master"]') ||
            Array.from(document.querySelectorAll('div')).find(el =>
                (el.textContent || '').includes('TW Control Center') &&
                el.getBoundingClientRect().width > 250 &&
                el.getBoundingClientRect().height > 80
            );

        if (!panel || panel.dataset.twccDragFix === '1') return;
        panel.dataset.twccDragFix = '1';

        const header =
            panel.querySelector('.twx-master-title') ||
            panel.querySelector('.twx-title') ||
            panel.querySelector('.twx-header') ||
            panel.querySelector('[class*="header"]') ||
            Array.from(panel.children).find(el => (el.textContent || '').includes('TW Control Center')) ||
            panel.firstElementChild;

        if (!header) return;

        header.style.cursor = 'move';

        let dragging = false;
        let sx = 0, sy = 0, sl = 0, st = 0;

        header.addEventListener('mousedown', function (e) {
            if (e.target.closest('button, input, select, textarea, a, .twx-btn')) return;

            dragging = true;
            sx = e.clientX;
            sy = e.clientY;

            const rect = panel.getBoundingClientRect();
            sl = rect.left;
            st = rect.top;

            panel.style.position = 'fixed';
            panel.style.left = sl + 'px';
            panel.style.top = st + 'px';
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
            panel.style.margin = '0';

            e.preventDefault();
            e.stopPropagation();
        }, true);

        document.addEventListener('mousemove', function (e) {
            if (!dragging) return;

            const width = panel.offsetWidth || 520;
            const height = panel.offsetHeight || 300;
            const nextLeft = Math.max(0, Math.min(window.innerWidth - Math.min(80, width), sl + e.clientX - sx));
            const nextTop = Math.max(0, Math.min(window.innerHeight - Math.min(40, height), st + e.clientY - sy));

            panel.style.left = nextLeft + 'px';
            panel.style.top = nextTop + 'px';
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';

            if (typeof core !== 'undefined' && core.panel) {
                core.panel.left = nextLeft;
                core.panel.top = nextTop;
            }
        }, true);

        document.addEventListener('mouseup', function () {
            if (!dragging) return;
            dragging = false;
            try {
                if (typeof core !== 'undefined') saveJson(CORE_KEY, core);
            } catch (e) {}
        }, true);

        console.log('[TWCC] DragFix aktiv', panel, header);
    }

    function setupTwccCollapseFix() {
        const panel =
            document.getElementById('twx-master') ||
            document.querySelector('[id*="twx-master"]');

        if (!panel || panel.dataset.twccCollapseFix === '1') return;
        panel.dataset.twccCollapseFix = '1';

        const buttons = Array.from(panel.querySelectorAll('button'));
        const collapseBtn = buttons.find(btn =>
            (btn.textContent || '').trim() === '▼' ||
            (btn.textContent || '').trim() === '▲' ||
            (btn.textContent || '').trim() === '▾' ||
            (btn.textContent || '').trim() === '▴'
        );

        if (!collapseBtn) return;

        collapseBtn.addEventListener('mousedown', e => {
            e.stopPropagation();
        }, true);

        collapseBtn.addEventListener('click', e => {
            e.stopPropagation();

            const body =
                panel.querySelector('.twx-master-body') ||
                panel.querySelector('.twx-body') ||
                panel.querySelector('#twx-module-list')?.parentElement;

            if (!body) return;

            const collapsed = body.style.display !== 'none' ? true : false;
            body.style.display = collapsed ? 'none' : '';
            collapseBtn.textContent = collapsed ? '▲' : '▼';

            if (typeof core !== 'undefined' && core.panel) {
                core.panel.collapsed = collapsed;
                saveJson(CORE_KEY, core);
            }
        }, true);
    }

    createMasterPanel();
    twccApplyAllWindowThemes();
    setTimeout(() => twccFakeGeneratorSpecialLoader('startup-special'), 700);
    setTimeout(setupTwccMasterDragFix, 250);
        createBotGuardPanel(true);
        createAttackOrganizerPanel(true);
        createDsUiPanel(true);
        createDsSelectVillagesPanel(true);
        initActiveModules();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
