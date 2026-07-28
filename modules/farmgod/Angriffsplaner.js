// ==UserScript==
// @name         TWCC Angriffsplaner
// @namespace    TWCC
// @version      1.1.15
// @description  Angriffsplaner mit versteckter Hotkey-Automatik, Übergabe-Export, Vorlagen-Mapping und Sprachwarnung
// @author       Daniel
// @match        https://*.die-staemme.de/game.php*
// @match        https://*.tribalwars.net/game.php*
// @match        https://*.tribalwars.*/*game.php*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const STORAGE_KEY = 'TWCC_DSU_TEST_VILLAGE_MAP';
    const PLAN_KEY = 'TWCC_DSU_TEST_PLAN';
    const RAW_KEY = 'TWCC_DSU_TEST_PLAN_RAW';
    const ACTIVE_KEY = 'TWCC_DSU_TEST_ACTIVE_ATTACK';
    const QUEUE_KEY = 'TWCC_DSU_TEST_QUEUE_RUNNING';
    const QUEUE_PAUSE_KEY = 'TWCC_DSU_TEST_QUEUE_PAUSED';
    const TIMING_DEFAULT_MS_KEY = 'TWCC_DSU_TIMING_DEFAULT_MS';
    const TIMING_OFFSET_KEY = 'TWCC_DSU_TIMING_OFFSET_MS';
    const TIMING_STATS_KEY = 'TWCC_DSU_TIMING_STATS';
    const TIMING_AUTOCALIB_KEY = 'TWCC_DSU_TIMING_AUTOCALIB';
    const TIMING_CALIB_LIMIT_KEY = 'TWCC_DSU_TIMING_CALIB_LIMIT';
    const AUTO_CLOSE_KEY = 'TWCC_DSU_AUTO_CLOSE_TAB';
    const CLOSE_MARKER_KEY = 'TWCC_DSU_CLOSE_MARKER';
    const AUTOMATION_ENABLED_KEY = 'TWCC_DSU_HIDDEN_AUTOMATION_ENABLED';
    const TEMPLATE_MAP_KEY = 'TWCC_DSU_TEMPLATE_MAP_V2';
    const TEMPLATE_COLOR_KEY = 'TWCC_DSU_TEMPLATE_COLORS_V1';
    const SOUND_SETTINGS_KEY = 'TWCC_DSU_WARNING_SOUND_SETTINGS';
    const AUDIO_HOST_KEY = 'TWCC_DSU_AUDIO_HOST_V1';
    const AUDIO_EVENT_KEY = 'TWCC_DSU_AUDIO_EVENT_V1';
    const VILLAGE_NAME_CACHE_KEY = 'TWCC_DSU_VILLAGE_NAMES_V1';

    const TEMPLATE_DEFINITIONS = [
        { key: 'spear', label: 'Speer', aliases: ['spear', 'speer'] },
        { key: 'sword', label: 'Schwert', aliases: ['sword', 'schwert'] },
        { key: 'axe', label: 'Axt', aliases: ['axe', 'axt', 'fake'] },
        { key: 'archer', label: 'Bogenschütze', aliases: ['archer', 'bogen', 'bogenschuetze', 'bogenschütze'] },
        { key: 'spy', label: 'Späher', aliases: ['spy', 'spaeher', 'späher', 'scout'] },
        { key: 'light', label: 'Leichte Kavallerie', aliases: ['light', 'lkav', 'leichte kavallerie'] },
        { key: 'marcher', label: 'Berittener Bogenschütze', aliases: ['marcher', 'berittener bogenschuetze', 'berittener bogenschütze'] },
        { key: 'heavy', label: 'Schwere Kavallerie', aliases: ['heavy', 'skav', 'schwere kavallerie'] },
        { key: 'ram', label: 'Ramme', aliases: ['ram', 'ramme', 'rammen'] },
        { key: 'catapult', label: 'Katapult', aliases: ['catapult', 'kata', 'katapult'] },
        { key: 'knight', label: 'Paladin', aliases: ['knight', 'paladin'] },
        { key: 'snob', label: 'AG', aliases: ['snob', 'ag', 'noble', 'adelsgeschlecht'] },
        { key: 'militia', label: 'Miliz', aliases: ['militia', 'miliz'] }
    ];

    const DEFAULT_TEMPLATE_MAP = {
        spear: 'Speer', sword: 'Schwert', axe: 'Fake', archer: 'Bogen', spy: 'Späher',
        light: 'Leichte Kavallerie', marcher: 'Berittener Bogenschütze', heavy: 'Schwere Kavallerie',
        ram: 'volle off', catapult: 'Fake1', knight: 'Paladin', snob: 'AG1', militia: 'Miliz'
    };

    const DEFAULT_TEMPLATE_COLORS = {
        spear: '#4f81bd', sword: '#555555', axe: '#f39c12', archer: '#9b59b6',
        spy: '#1e88e5', light: '#f1c40f', marcher: '#8e44ad', heavy: '#8b5a2b',
        ram: '#d32f2f', catapult: '#2eaf4a', knight: '#17a2b8', snob: '#c9a227', militia: '#7f8c8d'
    };

    const DEFAULT_SOUND_SETTINGS = { enabled: true, secondsBefore: 60, warningText: 'Piep', beepCount: 2, volume: 0.55, frequency: 880 };
    const WARNING_FIRED_KEY = 'TWCC_DSU_WARNING_FIRED_ATTACK';

    function log(...args) {
        console.log('[TWCC-DSU-P1]', ...args);
    }

    function toast(msg) {
        let el = document.getElementById('twcc-dsu-toast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'twcc-dsu-toast';
            el.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:999999;background:#6f4e2e;color:white;padding:10px 14px;border-radius:8px;font-weight:bold;box-shadow:0 2px 10px rgba(0,0,0,.25);';
            document.body.appendChild(el);
        }
        el.textContent = msg;
        el.style.opacity = '1';
        clearTimeout(el._timer);
        el._timer = setTimeout(() => el.style.opacity = '0', 2200);
    }

    function getParams() {
        return new URLSearchParams(window.location.search);
    }

    function getScreen() {
        return getParams().get('screen') || '';
    }

    function saveJson(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    function loadJson(key, fallback) {
        try {
            return JSON.parse(localStorage.getItem(key)) || fallback;
        } catch (e) {
            return fallback;
        }
    }

    function coordFromText(text) {
        const m = String(text || '').match(/\b(\d{3})\|(\d{3})\b/);
        return m ? `${m[1]}|${m[2]}` : '';
    }

    function villageIdFromHref(href) {
        const m = String(href || '').match(/[?&]village=(\d+)/);
        return m ? m[1] : '';
    }

    let VILLAGE_NAME_FETCH_PROMISE = null;
    let VILLAGE_NAME_LAST_ATTEMPT = 0;

    function getVillageNameCache() {
        const cache = loadJson(VILLAGE_NAME_CACHE_KEY, {});
        return {
            byId: cache && typeof cache.byId === 'object' ? cache.byId : {},
            byCoord: cache && typeof cache.byCoord === 'object' ? cache.byCoord : {}
        };
    }

    function decodeVillageName(value) {
        try {
            return decodeURIComponent(String(value || '').replace(/\+/g, ' '));
        } catch (e) {
            return String(value || '').replace(/\+/g, ' ');
        }
    }

    function getVillageDisplayName(attack, side, villageMap, cache) {
        const isStart = side === 'start';
        const coord = String(isStart ? attack.from : attack.to || '').trim();
        const id = String(
            isStart
                ? (attack.villageId || villageMap[coord] || '')
                : (attack.targetId || '')
        ).trim();

        return cache.byId[id] || cache.byCoord[coord] || id || coord || '-';
    }

    async function ensureVillageNames(plan) {
        const attacks = (Array.isArray(plan) ? plan : []).filter(item => item && item.ok);
        if (!attacks.length) return false;

        const villageMap = loadJson(STORAGE_KEY, {});
        const cache = getVillageNameCache();
        const neededIds = new Set();
        const neededCoords = new Set();

        attacks.forEach(attack => {
            const startId = String(attack.villageId || villageMap[attack.from] || '').trim();
            const targetId = String(attack.targetId || '').trim();
            const startCoord = String(attack.from || '').trim();
            const targetCoord = String(attack.to || '').trim();

            if (startId && !cache.byId[startId]) neededIds.add(startId);
            if (targetId && !cache.byId[targetId]) neededIds.add(targetId);
            if (startCoord && !cache.byCoord[startCoord]) neededCoords.add(startCoord);
            if (targetCoord && !cache.byCoord[targetCoord]) neededCoords.add(targetCoord);
        });

        if (!neededIds.size && !neededCoords.size) return false;
        if (VILLAGE_NAME_FETCH_PROMISE) return VILLAGE_NAME_FETCH_PROMISE;

        // Bei einem Netzwerkfehler nicht bei jedem Live-Refresh erneut laden.
        if (Date.now() - VILLAGE_NAME_LAST_ATTEMPT < 15000) return false;
        VILLAGE_NAME_LAST_ATTEMPT = Date.now();

        VILLAGE_NAME_FETCH_PROMISE = (async () => {
            try {
                const response = await fetch('/map/village.txt', {
                    credentials: 'same-origin',
                    cache: 'no-store'
                });
                if (!response.ok) throw new Error('HTTP ' + response.status);

                const text = await response.text();
                let changed = false;

                text.split(/\r?\n/).forEach(line => {
                    if (!line) return;
                    const parts = line.split(',');
                    if (parts.length < 4) return;

                    const id = String(parts[0] || '').trim();
                    const name = decodeVillageName(parts[1]);
                    const coord = `${String(parts[2] || '').trim()}|${String(parts[3] || '').trim()}`;

                    if (!name) return;
                    if (neededIds.has(id) && cache.byId[id] !== name) {
                        cache.byId[id] = name;
                        changed = true;
                    }
                    if (neededCoords.has(coord) && cache.byCoord[coord] !== name) {
                        cache.byCoord[coord] = name;
                        changed = true;
                    }
                });

                if (changed) saveJson(VILLAGE_NAME_CACHE_KEY, cache);
                return changed;
            } catch (e) {
                log('Dorfnamen konnten nicht geladen werden:', e);
                return false;
            } finally {
                VILLAGE_NAME_FETCH_PROMISE = null;
            }
        })();

        return VILLAGE_NAME_FETCH_PROMISE;
    }

    function normalizeUnit(unit) {
        return String(unit || '').trim().toLowerCase();
    }

    function getTemplateMap() {
        return Object.assign({}, DEFAULT_TEMPLATE_MAP, loadJson(TEMPLATE_MAP_KEY, {}));
    }

    function setTemplateMap(map) {
        saveJson(TEMPLATE_MAP_KEY, Object.assign({}, DEFAULT_TEMPLATE_MAP, map || {}));
    }

    function getTemplateColors() {
        return Object.assign({}, DEFAULT_TEMPLATE_COLORS, loadJson(TEMPLATE_COLOR_KEY, {}));
    }

    function setTemplateColors(colors) {
        saveJson(TEMPLATE_COLOR_KEY, Object.assign({}, DEFAULT_TEMPLATE_COLORS, colors || {}));
    }

    function normalizeHexColor(value, fallback = '#ffffff') {
        const color = String(value || '').trim();
        return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
    }

    function readableTextColor(background) {
        const hex = normalizeHexColor(background, '#ffffff').slice(1);
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        return (0.299 * r + 0.587 * g + 0.114 * b) >= 150 ? '#111111' : '#ffffff';
    }

    function getCanonicalUnit(unit) {
        const normalized = normalizeUnit(unit);
        const found = TEMPLATE_DEFINITIONS.find(def => def.aliases.includes(normalized));
        return found ? found.key : normalized;
    }

    function getTemplateName(unit) {
        const normalized = normalizeUnit(unit);
        const canonical = getCanonicalUnit(normalized);
        const map = getTemplateMap();
        return map[canonical] || map[normalized] || unit || '';
    }

    function getSoundSettings() {
        const saved = loadJson(SOUND_SETTINGS_KEY, {});
        return Object.assign({}, DEFAULT_SOUND_SETTINGS, saved || {});
    }

    function setSoundSettings(settings) {
        saveJson(SOUND_SETTINGS_KEY, Object.assign({}, DEFAULT_SOUND_SETTINGS, settings || {}));
    }

    function isAutomationEnabled() {
        return localStorage.getItem(AUTOMATION_ENABLED_KEY) === '1';
    }

    function setAutomationEnabled(value, showMessage = true) {
        localStorage.setItem(AUTOMATION_ENABLED_KEY, value ? '1' : '0');
        if (value) {
            setQueueRunning(true);
            setQueuePaused(false);
            markExpiredAttacks();
            claimAudioHost();
            queueTick('hotkey-enable');
        } else {
            setQueueRunning(false);
            setQueuePaused(false);
            clearPhase2Timer?.();
        }
        if (showMessage) toast(value ? 'Automatik aktiviert' : 'Automatik deaktiviert');
    }

    function toggleAutomation() {
        setAutomationEnabled(!isAutomationEnabled(), true);
    }

    function showAutomationStatus() {
        const stats = getQueueStats();
        toast(`Automatik ${isAutomationEnabled() ? 'AN' : 'AUS'} · offen ${stats.open} · erledigt ${stats.done}`);
    }

    // Wichtig: sessionStorage wird bei window.open() in den neuen Tab kopiert.
    // Eine dort gespeicherte ID wäre deshalb in Haupt-, Truppen- und Confirm-Tab identisch.
    // Jeder Dokumentkontext braucht zwingend eine eigene ID, damit nur der per Hotkey
    // freigeschaltete Haupt-Tab die Audioausgabe übernimmt.
    const AUDIO_TAB_ID = 'tab-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);

    let AUDIO_CONTEXT = null;
    let AUDIO_HOST_HEARTBEAT = null;
    let AUDIO_SENDTIME_WATCHDOG = null;
    let AUDIO_EVENT_POLL = null;
    let LAST_AUDIO_EVENT_ID = null;

    function unlockAudio() {
        try {
            AUDIO_CONTEXT = AUDIO_CONTEXT || new (window.AudioContext || window.webkitAudioContext)();
            if (AUDIO_CONTEXT.state === 'suspended') {
                const resumed = AUDIO_CONTEXT.resume();
                if (resumed && typeof resumed.catch === 'function') resumed.catch(() => {});
            }
        } catch (e) {
            log('Audio nicht verfügbar:', e);
        }
    }

    function primeAudioOutput() {
        unlockAudio();
        if (!AUDIO_CONTEXT) return;
        try {
            const osc = AUDIO_CONTEXT.createOscillator();
            const gain = AUDIO_CONTEXT.createGain();
            gain.gain.value = 0.00001;
            osc.connect(gain);
            gain.connect(AUDIO_CONTEXT.destination);
            osc.start();
            osc.stop(AUDIO_CONTEXT.currentTime + 0.03);
        } catch (e) {
            log('Audio-Freischaltung fehlgeschlagen:', e);
        }
    }

    function writeAudioHost() {
        saveJson(AUDIO_HOST_KEY, { id: AUDIO_TAB_ID, at: Date.now() });
    }

    function claimAudioHost() {
        primeAudioOutput();
        writeAudioHost();
        if (AUDIO_HOST_HEARTBEAT) clearInterval(AUDIO_HOST_HEARTBEAT);
        AUDIO_HOST_HEARTBEAT = setInterval(() => {
            writeAudioHost();
        }, 2000);
        startSendTimeWarningWatchdog();
        startAudioEventPoll();
    }

    function getAudioHost() {
        const host = loadJson(AUDIO_HOST_KEY, null);
        return host && host.id && Date.now() - Number(host.at || 0) < 10000 ? host : null;
    }

    function isCurrentAudioHost() {
        const host = getAudioHost();
        return !!host && host.id === AUDIO_TAB_ID;
    }

    function playBeepWarning(settings) {
        unlockAudio();
        if (!AUDIO_CONTEXT) return;
        const count = Math.max(1, Math.min(10, Number(settings.beepCount) || 2));
        const volume = Math.max(0, Math.min(1, Number(settings.volume) || 0.55));
        const frequency = Math.max(150, Math.min(2500, Number(settings.frequency) || 880));
        for (let i = 0; i < count; i++) {
            const start = AUDIO_CONTEXT.currentTime + i * 0.38;
            const osc = AUDIO_CONTEXT.createOscillator();
            const gain = AUDIO_CONTEXT.createGain();
            osc.type = 'sine';
            osc.frequency.value = frequency;
            gain.gain.setValueAtTime(0.0001, start);
            gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
            osc.connect(gain);
            gain.connect(AUDIO_CONTEXT.destination);
            osc.start(start);
            osc.stop(start + 0.24);
        }
    }

    let ACTIVE_UTTERANCE = null;
    function speakWarning(text, settings) {
        if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
            playBeepWarning(settings);
            toast('Sprachausgabe nicht verfügbar – Ersatzton abgespielt');
            return;
        }
        try {
            const synth = window.speechSynthesis;
            synth.cancel();
            if (synth.paused) synth.resume();

            const utterance = new SpeechSynthesisUtterance(text);
            ACTIVE_UTTERANCE = utterance; // verhindert, dass Browser die Ansage vorzeitig verwirft
            utterance.lang = document.documentElement.lang || 'de-DE';
            utterance.volume = Math.max(0, Math.min(1, Number(settings.volume) || 0.55));
            utterance.rate = 1;
            utterance.pitch = 1;
            let started = false;
            utterance.onstart = () => { started = true; };
            utterance.onend = () => { if (ACTIVE_UTTERANCE === utterance) ACTIVE_UTTERANCE = null; };
            utterance.onerror = event => {
                log('Sprachausgabe fehlgeschlagen:', event?.error || event);
                if (ACTIVE_UTTERANCE === utterance) ACTIVE_UTTERANCE = null;
                playBeepWarning(settings);
            };

            // Manche Browser verschlucken die erste Ansage nach längerer Inaktivität.
            // Ein kurzes Resume direkt vor speak macht die Ausgabe deutlich zuverlässiger.
            synth.resume();
            synth.speak(utterance);
            setTimeout(() => {
                if (synth.paused) synth.resume();
            }, 120);
            // Einige Browser melden keinen Fehler, starten die Sprache aber trotzdem nicht.
            // Dann folgt als hörbare Absicherung ein Piepton.
            setTimeout(() => {
                if (!started && ACTIVE_UTTERANCE === utterance) {
                    try { synth.cancel(); } catch (e) {}
                    ACTIVE_UTTERANCE = null;
                    playBeepWarning(settings);
                }
            }, 1200);
        } catch (e) {
            log('Sprachausgabe fehlgeschlagen:', e);
            ACTIVE_UTTERANCE = null;
            playBeepWarning(settings);
        }
    }

    function playWarningSoundLocal(settings = getSoundSettings()) {
        if (!settings.enabled) return;
        const text = String(settings.warningText ?? 'Piep').trim();
        if (!text) return;
        if (/^(piep|beep)$/i.test(text)) playBeepWarning(settings);
        else speakWarning(text, settings);
    }

    function requestWarningFromAudioHost(settings) {
        const event = {
            id: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2),
            source: AUDIO_TAB_ID,
            at: Date.now(),
            settings
        };
        saveJson(AUDIO_EVENT_KEY, event);
    }

    function playWarningSound(settings = getSoundSettings()) {
        if (!settings.enabled) return;
        if (isCurrentAudioHost()) {
            playWarningSoundLocal(settings);
            return;
        }

        const host = getAudioHost();
        if (host) {
            requestWarningFromAudioHost(settings);
            return;
        }

        // Kein Haupt-Tab erreichbar: lokale Ausgabe wenigstens versuchen.
        playWarningSoundLocal(settings);
    }

    function handleAudioEventPayload(payload) {
        if (!payload || !payload.id || payload.id === LAST_AUDIO_EVENT_ID) return false;
        if (payload.source === AUDIO_TAB_ID || Date.now() - Number(payload.at || 0) > 10000) return false;
        LAST_AUDIO_EVENT_ID = payload.id;
        playWarningSoundLocal(payload.settings || getSoundSettings());
        log('Audio-Warnung im Haupt-Tab abgespielt', { eventId: payload.id, source: payload.source });
        return true;
    }

    window.addEventListener('storage', event => {
        if (event.key !== AUDIO_EVENT_KEY || !event.newValue || !isCurrentAudioHost()) return;
        try {
            handleAudioEventPayload(JSON.parse(event.newValue));
        } catch (e) {
            log('Audio-Ereignis ungültig:', e);
        }
    });

    function startAudioEventPoll() {
        if (AUDIO_EVENT_POLL) clearInterval(AUDIO_EVENT_POLL);
        AUDIO_EVENT_POLL = setInterval(() => {
            if (!isCurrentAudioHost()) return;
            const payload = loadJson(AUDIO_EVENT_KEY, null);
            if (payload) handleAudioEventPayload(payload);
        }, 150);
    }

    function getWarningFiredMap() {
        const stored = loadJson(WARNING_FIRED_KEY, {});
        // Abwärtskompatibilität zu älteren Versionen mit nur einem gespeicherten Angriff.
        if (stored && stored.attackId) {
            return { [stored.attackId]: { sendMs: stored.sendMs, firedAt: stored.firedAt } };
        }
        return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
    }

    function clearWarningFiredForAttack(attackId) {
        if (!attackId) {
            localStorage.removeItem(WARNING_FIRED_KEY);
            return;
        }
        const fired = getWarningFiredMap();
        if (Object.prototype.hasOwnProperty.call(fired, attackId)) {
            delete fired[attackId];
            saveJson(WARNING_FIRED_KEY, fired);
        }
    }

    function hasWarningFired(attackId) {
        return !!attackId && Object.prototype.hasOwnProperty.call(getWarningFiredMap(), attackId);
    }

    function markWarningFired(attackId, sendMs) {
        if (!attackId) return;
        const fired = getWarningFiredMap();
        fired[attackId] = { sendMs, firedAt: Date.now() };
        saveJson(WARNING_FIRED_KEY, fired);
    }

    function isWarningCandidate(attack) {
        if (!attack || !attack.ok || !attack.id || !attack.send) return false;
        return !['submitted', 'submitted_test', 'done', 'expired', 'failed', 'error'].includes(String(attack.status || 'open'));
    }

    function checkWarningBySendTime() {
        if (!isCurrentAudioHost()) return;

        const settings = getSoundSettings();
        if (!settings.enabled) return;

        const warningMs = Math.max(0, Number(settings.secondsBefore) || 0) * 1000;
        const nowServer = getCurrentServerMs();
        const plan = loadJson(PLAN_KEY, []);
        const active = loadJson(ACTIVE_KEY, null);

        // Auch ein gerade aktiver Angriff wird berücksichtigt, falls sein Planstatus bereits geändert wurde.
        const candidates = [...plan];
        if (active?.id && !candidates.some(item => item?.id === active.id)) candidates.push(active);

        candidates
            .filter(isWarningCandidate)
            .map(attack => ({ attack, timing: getSendTimingInfo(attack.send) }))
            .filter(item => item.timing && !hasWarningFired(item.attack.id))
            .sort((a, b) => a.timing.targetMs - b.timing.targetMs)
            .forEach(({ attack, timing }) => {
                const sendMs = timing.targetMs; // immer die importierte Abschickzeit, ohne Klick-Offset
                const remaining = sendMs - nowServer;
                if (remaining <= warningMs && remaining > -5000) {
                    markWarningFired(attack.id, sendMs);
                    playWarningSoundLocal(settings);
                    toast(`Vorwarnung: Abschickzeit in ${Math.max(0, Math.ceil(remaining / 1000))} Sekunden`);
                    log('Warnung nach Abschickzeit ausgelöst', { id: attack.id, send: attack.send, remaining, warningMs });
                }
            });
    }

    function startSendTimeWarningWatchdog() {
        if (AUDIO_SENDTIME_WATCHDOG) clearInterval(AUDIO_SENDTIME_WATCHDOG);
        AUDIO_SENDTIME_WATCHDOG = setInterval(checkWarningBySendTime, 200);
        checkWarningBySendTime();
    }

    function installAudioHostGesture() {
        if (document._twccAudioHostGestureInstalled) return;
        document._twccAudioHostGestureInstalled = true;

        const activate = event => {
            if (event && event.isTrusted === false) return;
            claimAudioHost();
        };

        // Ein normaler Klick oder Tastendruck reicht zur Browser-Freigabe. Das ist
        // vollständig unabhängig davon, ob die versteckte Automatik aktiviert ist.
        document.addEventListener('pointerdown', activate, true);
        document.addEventListener('keydown', activate, true);
    }

    function installHiddenHotkeys() {
        if (document._twccHiddenHotkeysInstalled) return;
        document._twccHiddenHotkeysInstalled = true;
        document.addEventListener('keydown', e => {
            if (!e.ctrlKey || !e.altKey || e.repeat) return;
            const key = String(e.key || '').toLowerCase();
            if (key === 'p') {
                e.preventDefault();
                e.stopPropagation();
                toggleAutomation();
            } else if (key === 'i') {
                e.preventDefault();
                e.stopPropagation();
                showAutomationStatus();
            }
        }, true);
    }

    function scanOwnVillages() {
        const map = loadJson(STORAGE_KEY, {});
        const links = Array.from(document.querySelectorAll('a[href*="village="]'));

        links.forEach(a => {
            const coord = coordFromText(a.textContent) || coordFromText(a.closest('tr')?.textContent || '');
            const id = villageIdFromHref(a.href);
            if (coord && id) map[coord] = id;
        });

        saveJson(STORAGE_KEY, map);
        log('Village map gespeichert:', map);
        return map;
    }


    function normalizeDsuDate(str) {
        const m = String(str || '').trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{2}):(\d{2})(?::(\d{1,3}))?$/);
        if (!m) return str;
        const ms = m[7] !== undefined ? '.' + String(m[7]).padEnd(3, '0').slice(0, 3) : '';
        return `${pad(m[3])}.${pad(m[2])}.${m[1]} ${pad(m[4])}:${m[5]}:${m[6]}${ms}`;
    }

    function getAttackSendTimestamp(attack) {
        if (!attack || !attack.ok) return Number.POSITIVE_INFINITY;
        const parsed = parseDateTimeDe(attack.send);
        return parsed && Number.isFinite(parsed.targetMs)
            ? parsed.targetMs
            : Number.POSITIVE_INFINITY;
    }

    function sortPlanBySendTime(plan) {
        return (Array.isArray(plan) ? plan : [])
            .map((attack, originalIndex) => ({ attack, originalIndex }))
            .sort((a, b) => {
                const timeDiff = getAttackSendTimestamp(a.attack) - getAttackSendTimestamp(b.attack);
                return timeDiff || a.originalIndex - b.originalIndex;
            })
            .map(entry => entry.attack);
    }

    function parseDsuBBCode(text) {
        const source = String(text || '');
        if (!source.includes('[coord]') || !source.includes('[unit]') || !source.includes('game.php?village=')) return [];

        const lines = source.split(/\r?\n/).map(l => l.trim()).filter(l => l.includes('[coord]') && l.includes('[unit]'));
        const result = [];

        const re = /(?:Offensiv|Defensiv)?\s*von\s+\[b\]([^\[]+?)\[\/b\]\s+aus\s+\[coord\](\d{3}\|\d{3})\[\/coord\]\s+mit\s+\[unit\]([a-z_]+)\[\/unit\]\s+auf\s+\[b\]([^\[]+?)\[\/b\]\s+.*?\[coord\](\d{3}\|\d{3})\[\/coord\]\s+startet\s+am\s+\[color=[^\]]+\]([0-9-]+\s+[0-9:]+)\[\/color\]\s+und\s+kommt\s+am\s+\[color=[^\]]+\]([0-9-]+\s+[0-9:]+)\[\/color\]\s+an\s+\(\[url="([^"]+)"\]/i;

        lines.forEach((line, idx) => {
            const m = line.match(re);
            if (!m) {
                result.push({ ok: false, status: 'error', line: idx + 1, raw: line, error: 'BBCode-Zeile nicht erkannt' });
                return;
            }

            const url = m[8];
            const villageMatch = url.match(/[?&]village=(\d+)/);
            const targetMatch = url.match(/[?&]target=(\d+)/);

            result.push({
                id: 'dsu-bb-' + Date.now() + '-' + idx,
                source: 'dsu-bbcode',
                ok: true,
                status: 'open',
                line: idx + 1,
                villageId: villageMatch ? villageMatch[1] : '',
                targetId: targetMatch ? targetMatch[1] : '',
                fromName: m[1].trim(),
                from: m[2],
                unit: m[3].trim(),
                toName: m[4].trim(),
                to: m[5],
                send: normalizeDsuDate(m[6]),
                arrival: normalizeDsuDate(m[7]),
                raw: line
            });
        });

        return result;
    }


    function parseDsuText(text) {
        const bb = parseDsuBBCode(text);
        if (bb.length) return sortPlanBySendTime(bb);

        const lines = String(text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const result = [];

        const fullRe = /(?:✅|•|\-|\*)?\s*(\d{3}\|\d{3})\s*\(([^)]*)\)\s*→\s*(\d{3}\|\d{3})\s*\(([^)]*)\)\s*\|\s*Abschicken:\s*([0-9.]+\s+[0-9:]+(?:\.\d{1,3})?)(?:\s*\|\s*Ankunft:\s*([0-9.]+\s+[0-9:.]+))?(?:\s*\|\s*Einheit:\s*(.+))?$/i;
        const shortRe = /(?:✅|•|\-|\*)?\s*(\d{3}\|\d{3}).*?→\s*(\d{3}\|\d{3}).*?Abschicken:\s*([0-9.]+\s+[0-9:]+(?:\.\d{1,3})?)(?:.*?Einheit:\s*(.+))?$/i;

        lines.forEach((line, idx) => {
            let m = line.match(fullRe);
            if (m) {
                result.push({
                    id: 'dsu-' + Date.now() + '-' + idx,
                    ok: true,
                    status: 'open',
                    line: idx + 1,
                    from: m[1],
                    fromName: m[2] || '',
                    to: m[3],
                    toName: m[4] || '',
                    send: m[5],
                    arrival: m[6] || '',
                    unit: (m[7] || '').trim() || 'Ramme',
                    raw: line
                });
                return;
            }

            m = line.match(shortRe);
            if (m) {
                result.push({
                    id: 'dsu-' + Date.now() + '-' + idx,
                    ok: true,
                    status: 'open',
                    line: idx + 1,
                    from: m[1],
                    fromName: '',
                    to: m[2],
                    toName: '',
                    send: m[3],
                    arrival: '',
                    unit: (m[4] || '').trim() || 'Ramme',
                    raw: line
                });
                return;
            }

            result.push({ ok: false, status: 'error', line: idx + 1, raw: line, error: 'Nicht erkannt' });
        });

        return sortPlanBySendTime(result);
    }

    function escapeHtml(s) {
        return String(s ?? '').replace(/[&<>"']/g, c => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[c]));
    }

    function updatePlanItem(id, patch) {
        const plan = loadJson(PLAN_KEY, []);
        const idx = plan.findIndex(p => p.id === id);
        if (idx >= 0) {
            plan[idx] = Object.assign({}, plan[idx], patch);
            saveJson(PLAN_KEY, plan);
        }
        return plan;
    }


    const HANDOFF_TERMINAL_STATUSES = new Set([
        'submitted_test', 'submitted', 'done', 'expired', 'error', 'submit_failed', 'not_enough_troops'
    ]);

    function getTransferableAttacks() {
        const plan = sortPlanBySendTime(markExpiredAttacks());
        return plan
            .filter(p => p && p.ok && !HANDOFF_TERMINAL_STATUSES.has(p.status || 'open'))
            .map((p, index) => {
                const clean = Object.assign({}, p, {
                    id: 'handoff-' + Date.now() + '-' + index,
                    status: 'open',
                    error: '',
                    transferredAt: Date.now()
                });
                delete clean.failedAt;
                delete clean.submitAt;
                delete clean.startedAt;
                delete clean.attackClickedAt;
                delete clean.phase;
                delete clean.done;
                delete clean.openedByAngriffsplaner;
                return clean;
            });
    }

    function buildHandoffPackage() {
        const plan = getTransferableAttacks();
        return {
            format: 'TWCC_ANGRIFFSPLANER_HANDOFF',
            version: 1,
            createdAt: new Date().toISOString(),
            attackCount: plan.length,
            plan,
            villageMap: loadJson(STORAGE_KEY, {})
        };
    }

    function validateHandoffPackage(data) {
        if (!data || data.format !== 'TWCC_ANGRIFFSPLANER_HANDOFF' || !Array.isArray(data.plan)) {
            throw new Error('Keine gültige TWCC-Übergabedatei');
        }
        const plan = data.plan.filter(p => p && p.ok && p.from && p.to && p.send).map((p, index) => ({
            ...p,
            id: 'import-' + Date.now() + '-' + index,
            status: 'open',
            error: ''
        }));
        if (!plan.length) throw new Error('Die Übergabe enthält keine offenen Angriffe');
        return {
            plan: sortPlanBySendTime(plan),
            villageMap: data.villageMap && typeof data.villageMap === 'object' ? data.villageMap : {}
        };
    }

    function getAttackMergeKey(attack) {
        const parts = [
            attack?.villageId || '',
            String(attack?.from || '').trim(),
            String(attack?.to || '').trim(),
            String(attack?.targetId || '').trim(),
            String(attack?.send || '').trim(),
            normalizeUnit(attack?.unit || ''),
            String(attack?.arrival || '').trim()
        ];
        return parts.join('||').toLowerCase();
    }

    function mergeImportedPlan(importedPlan) {
        const existing = loadJson(PLAN_KEY, []);
        const seen = new Set(existing.filter(p => p && p.ok).map(getAttackMergeKey));
        const additions = [];
        let duplicates = 0;

        importedPlan.forEach((attack, index) => {
            const key = getAttackMergeKey(attack);
            if (seen.has(key)) {
                duplicates++;
                return;
            }
            seen.add(key);
            additions.push({
                ...attack,
                id: 'merge-' + Date.now() + '-' + index,
                status: 'open',
                error: ''
            });
        });

        return {
            plan: sortPlanBySendTime(existing.concat(additions)),
            added: additions.length,
            duplicates
        };
    }

    function downloadTextFile(filename, text) {
        const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function showHandoffDialog(mode, initialText = '') {
        document.getElementById('twcc-dsu-handoff-dialog')?.remove();
        const overlay = document.createElement('div');
        overlay.id = 'twcc-dsu-handoff-dialog';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:1000001;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:20px;';
        const isExport = mode === 'export';
        overlay.innerHTML = `
            <div style="width:min(760px,95vw);background:#f4e4bc;border:2px solid #6f4e2e;border-radius:10px;box-shadow:0 5px 24px rgba(0,0,0,.45);padding:12px;color:#2b1a08;font:13px Arial,sans-serif;">
                <div style="font-weight:bold;font-size:16px;margin-bottom:8px;">${isExport ? 'Offene Angriffe übergeben' : 'Übergabe importieren'}</div>
                <div style="margin-bottom:8px;">${isExport ? 'Diesen Text kopieren oder als Datei herunterladen und an den nächsten Spieler weitergeben.' : 'Übergabetext einfügen oder eine zuvor exportierte JSON-Datei auswählen.'}</div>
                <textarea id="twcc-dsu-handoff-text" style="width:100%;height:330px;box-sizing:border-box;font:12px monospace;" placeholder="Übergabedaten hier einfügen...">${escapeHtml(initialText)}</textarea>
                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
                    ${isExport ? '<button id="twcc-dsu-handoff-copy">In Zwischenablage kopieren</button><button id="twcc-dsu-handoff-download">JSON herunterladen</button>' : '<button id="twcc-dsu-handoff-merge">Plan dazusetzen</button><button id="twcc-dsu-handoff-apply">Aktuellen Plan ersetzen</button><button id="twcc-dsu-handoff-file">JSON-Datei auswählen</button><input id="twcc-dsu-handoff-file-input" type="file" accept="application/json,.json,.txt" style="display:none;">'}
                    <button id="twcc-dsu-handoff-close">Schließen</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        const textArea = document.getElementById('twcc-dsu-handoff-text');
        document.getElementById('twcc-dsu-handoff-close').onclick = () => overlay.remove();
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

        if (isExport) {
            document.getElementById('twcc-dsu-handoff-copy').onclick = async () => {
                try {
                    await navigator.clipboard.writeText(textArea.value);
                    toast('Übergabe kopiert');
                } catch (e) {
                    textArea.focus();
                    textArea.select();
                    document.execCommand('copy');
                    toast('Übergabe kopiert');
                }
            };
            document.getElementById('twcc-dsu-handoff-download').onclick = () => {
                const stamp = new Date().toISOString().replace(/[:.]/g, '-');
                downloadTextFile('TWCC-Uebergabe-' + stamp + '.json', textArea.value);
            };
        } else {
            const finishImport = (message) => {
                localStorage.removeItem(ACTIVE_KEY);
                setQueueRunning(false);
                setQueuePaused(false);
                localStorage.setItem(AUTOMATION_ENABLED_KEY, '0');
                overlay.remove();
                toast(message);
                createWindow();
                const win = document.getElementById('twcc-dsu-p1');
                if (win) {
                    win.style.display = '';
                    win.dispatchEvent(new CustomEvent('twcc-handoff-imported'));
                }
            };

            const readImport = () => {
                const parsed = JSON.parse(textArea.value.trim());
                return validateHandoffPackage(parsed);
            };

            const applyImport = () => {
                try {
                    const imported = readImport();
                    if (!confirm(`Aktuellen Plan durch ${imported.plan.length} offene Angriffe ersetzen?`)) return;
                    saveJson(PLAN_KEY, imported.plan);
                    if (Object.keys(imported.villageMap).length) saveJson(STORAGE_KEY, imported.villageMap);
                    finishImport(`${imported.plan.length} offene Angriffe importiert`);
                } catch (e) {
                    alert('Import fehlgeschlagen: ' + (e?.message || e));
                }
            };

            const mergeImport = () => {
                try {
                    const imported = readImport();
                    const merged = mergeImportedPlan(imported.plan);
                    const currentCount = loadJson(PLAN_KEY, []).filter(p => p && p.ok).length;
                    if (!confirm(`${merged.added} neue Angriffe zu den vorhandenen ${currentCount} Angriffen dazusetzen?${merged.duplicates ? `\n${merged.duplicates} doppelte Angriffe werden übersprungen.` : ''}`)) return;
                    saveJson(PLAN_KEY, merged.plan);
                    const currentMap = loadJson(STORAGE_KEY, {});
                    saveJson(STORAGE_KEY, Object.assign({}, currentMap, imported.villageMap));
                    finishImport(`${merged.added} ergänzt${merged.duplicates ? ` · ${merged.duplicates} doppelt` : ''}`);
                } catch (e) {
                    alert('Import fehlgeschlagen: ' + (e?.message || e));
                }
            };

            document.getElementById('twcc-dsu-handoff-apply').onclick = applyImport;
            document.getElementById('twcc-dsu-handoff-merge').onclick = mergeImport;
            const fileInput = document.getElementById('twcc-dsu-handoff-file-input');
            document.getElementById('twcc-dsu-handoff-file').onclick = () => fileInput.click();
            fileInput.onchange = async () => {
                const file = fileInput.files?.[0];
                if (!file) return;
                textArea.value = await file.text();
            };
        }
    }

    function exportOpenAttacks() {
        const data = buildHandoffPackage();
        if (!data.plan.length) return toast('Keine offenen Angriffe zum Exportieren');
        showHandoffDialog('export', JSON.stringify(data, null, 2));
    }

    function importOpenAttacks() {
        showHandoffDialog('import');
    }

    function isAttackExpired(attack) {
        try {
            const timing = getSendTimingInfo(attack.send);
            if (!timing) return false;
            return timing.clickMs <= getCurrentServerMs() + 250;
        } catch (e) {
            return false;
        }
    }

    function markExpiredAttacks() {
        const plan = loadJson(PLAN_KEY, []);
        let changed = false;

        plan.forEach(p => {
            if (!p.ok) return;
            if (['submitted_test', 'submitted', 'done', 'error', 'expired', 'not_enough_troops'].includes(p.status)) return;

            if (isAttackExpired(p)) {
                p.status = 'expired';
                p.error = 'Abschickzeit liegt in der Vergangenheit';
                changed = true;
            }
        });

        if (changed) saveJson(PLAN_KEY, plan);
        return plan;
    }

    function getNextOpenAttack() {
        const plan = sortPlanBySendTime(markExpiredAttacks());
        saveJson(PLAN_KEY, plan);
        return plan.find(p => p.ok && (!p.status || p.status === 'open') && !isAttackExpired(p));
    }

    function detectNotEnoughTroopsText() {
        const txt = (document.body.innerText || '').toLowerCase();
        const patterns = [
            'nicht genügend',
            'zu wenig',
            'nicht genug',
            'nicht ausreichend',
            'nicht genügend einheiten',
            'nicht genügend truppen',
            'nicht genug truppen',
            'nicht genug einheiten'
        ];
        return patterns.find(p => txt.includes(p)) || '';
    }

    function failActiveAttack(status, errorText) {
        const active = loadJson(ACTIVE_KEY, null);
        if (!active?.id) return;

        updatePlanItem(active.id, { status, error: errorText || status, failedAt: Date.now() });
        localStorage.removeItem(ACTIVE_KEY);

        toast(errorText || status);
        log('Aktiver Angriff fehlgeschlagen:', status, errorText);

        if (isQueueRunning() && !isQueuePaused()) {
            setTimeout(() => queueTick(status), 1200);
        }
    }



    function isQueueRunning() {
        return localStorage.getItem(QUEUE_KEY) === '1';
    }

    function setQueueRunning(value) {
        localStorage.setItem(QUEUE_KEY, value ? '1' : '0');
    }

    function isQueuePaused() {
        return localStorage.getItem(QUEUE_PAUSE_KEY) === '1';
    }

    function setQueuePaused(value) {
        localStorage.setItem(QUEUE_PAUSE_KEY, value ? '1' : '0');
    }

    function getQueueStats() {
        const plan = loadJson(PLAN_KEY, []);
        const okPlan = plan.filter(p => p.ok);
        const done = okPlan.filter(p => ['submitted_test', 'submitted', 'done'].includes(p.status)).length;
        const open = okPlan.filter(p => (!p.status || p.status === 'open')).length;
        const errors = okPlan.filter(p => p.status === 'error' || p.status === 'submit_failed' || p.status === 'expired' || p.status === 'not_enough_troops').length;
        const working = okPlan.filter(p => ['preparing', 'confirm_opening', 'confirm_ready'].includes(p.status)).length;
        return { total: okPlan.length, done, open, errors, working };
    }

    function startQueue() {
        if (!isAutomationEnabled()) return toast('Automatik ist deaktiviert');
        setQueueRunning(true);
        setQueuePaused(false);

        const active = loadJson(ACTIVE_KEY, null);
        if (active && ['phase1-auto', 'confirm-opened', 'confirm-ready'].includes(active.phase)) {
            toast('Angriffe laufen bereits mit aktivem Angriff');
            return;
        }

        markExpiredAttacks();
        toast('Angriffe gestartet');
        queueTick('start');
    }

    function pauseQueue() {
        setQueuePaused(true);
        toast('Angriffe pausiert');
    }

    function resumeQueue() {
        if (!isAutomationEnabled()) return toast('Automatik ist deaktiviert');
        setQueuePaused(false);
        setQueueRunning(true);
        markExpiredAttacks();
        toast('Angriffe fortgesetzt');
        queueTick('resume');
    }

    function stopQueue() {
        localStorage.setItem(AUTOMATION_ENABLED_KEY, '0');
        setQueueRunning(false);
        setQueuePaused(false);
        clearPhase2Timer?.();
        toast('Angriffe gestoppt');
    }

    function queueTick(reason = 'tick') {
        log('Angriffe tick:', reason, { enabled: isAutomationEnabled(), running: isQueueRunning(), paused: isQueuePaused(), stats: getQueueStats() });

        if (!isAutomationEnabled() || !isQueueRunning() || isQueuePaused()) return;

        const active = loadJson(ACTIVE_KEY, null);
        if (active && ['phase1-auto', 'confirm-opened', 'confirm-ready'].includes(active.phase)) {
            log('Angriffe warten auf aktiven Angriff:', active.phase);
            return;
        }

        const next = getNextOpenAttack();
        if (!next) {
            setQueueRunning(false);
            localStorage.setItem(AUTOMATION_ENABLED_KEY, '0');
            toast('Angriffe fertig: Automatik deaktiviert');
            log('Angriffe fertig');
            return;
        }

        openPlaceForAttack(next, true);
    }


    function openPlaceForAttack(attack, auto = false) {
        const expired = isAttackExpired(attack);

        // Abgelaufene Angriffe bleiben für die versteckte Automatik gesperrt.
        // Bei ausgeschalteter Automatik darf das Startdorf aber weiterhin manuell
        // über „Dorf öffnen“ geöffnet werden, ohne einen aktiven Angriff anzulegen.
        if (expired && (auto || isAutomationEnabled())) {
            updatePlanItem(attack.id, { status: 'expired', error: 'Abschickzeit liegt in der Vergangenheit' });
            toast('Übersprungen: abgelaufen ' + attack.from + ' → ' + attack.to);
            if (auto && isQueueRunning() && !isQueuePaused()) setTimeout(() => queueTick('expired-open-guard'), 400);
            return;
        }

        const villageMap = loadJson(STORAGE_KEY, {});
        const villageId = attack.villageId || villageMap[attack.from];

        if (!villageId) {
            alert('Keine village_id für Startdorf ' + attack.from + ' gefunden. Bei BBCode sollte village= im Link stehen, sonst erst Übersicht scannen.');
            return;
        }

        const [x, y] = attack.to.split('|');
        const targetParam = attack.targetId ? `&target=${encodeURIComponent(attack.targetId)}` : '';
        const url = `/game.php?village=${encodeURIComponent(villageId)}&screen=place${targetParam}&x=${encodeURIComponent(x)}&y=${encodeURIComponent(y)}`;

        if (expired) {
            localStorage.removeItem(ACTIVE_KEY);
            updatePlanItem(attack.id, { status: 'expired', error: 'Abschickzeit liegt in der Vergangenheit' });
            toast('Abgelaufen – Startdorf wird nur manuell geöffnet');
            window.open(url, '_blank');
            return;
        }

        const active = Object.assign({}, attack, {
            villageId,
            phase: auto ? 'phase1-auto' : 'manual-open',
            openedByAngriffsplaner: auto,
            startedAt: Date.now()
        });

        clearWarningFiredForAttack();
        saveJson(ACTIVE_KEY, active);
        updatePlanItem(attack.id, { status: auto ? 'preparing' : 'opened' });
        window.open(url, '_blank');
    }

    function startNextPhase1() {
        const attack = getNextOpenAttack();
        if (!attack) {
            toast('Kein offener Angriff im Plan');
            return;
        }

        toast('Phase 1 startet: ' + attack.from + ' → ' + attack.to);
        openPlaceForAttack(attack, true);
    }

    function isVisible(el) {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    }

    function textOf(el) {
        return String(el?.textContent || el?.value || el?.title || el?.getAttribute?.('aria-label') || '').trim();
    }

    function findByText(selectors, wantedText) {
        const wanted = String(wantedText || '').trim().toLowerCase();
        if (!wanted) return null;

        const els = Array.from(document.querySelectorAll(selectors.join(','))).filter(isVisible);

        return els.find(el => textOf(el).toLowerCase() === wanted)
            || els.find(el => textOf(el).toLowerCase().includes(wanted))
            || null;
    }

    function findTemplateButton(templateName) {
        const selectors = [
            'a',
            'button',
            'input[type="button"]',
            'input[type="submit"]',
            '.btn',
            '.troop_template_selector',
            '[data-template-id]',
            '[data-title]'
        ];

        return findByText(selectors, templateName);
    }

    function setTargetCoords(to) {
        const [x, y] = String(to || '').split('|');

        const xInput =
            document.querySelector('input[name="x"]') ||
            document.querySelector('#inputx') ||
            document.querySelector('#target_x');

        const yInput =
            document.querySelector('input[name="y"]') ||
            document.querySelector('#inputy') ||
            document.querySelector('#target_y');

        if (xInput && yInput) {
            xInput.value = x;
            yInput.value = y;
            xInput.dispatchEvent(new Event('input', { bubbles: true }));
            yInput.dispatchEvent(new Event('input', { bubbles: true }));
            xInput.dispatchEvent(new Event('change', { bubbles: true }));
            yInput.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
        }

        const combined =
            document.querySelector('input[name="target"]') ||
            document.querySelector('input[name="coord"]') ||
            document.querySelector('input[placeholder*="000|000"]');

        if (combined) {
            combined.value = to;
            combined.dispatchEvent(new Event('input', { bubbles: true }));
            combined.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
        }

        return false;
    }

    function findAttackButton() {
        return (
            document.querySelector('#target_attack') ||
            document.querySelector('input[name="attack"]') ||
            document.querySelector('button[name="attack"]') ||
            Array.from(document.querySelectorAll('input, button, a')).find(el => {
                if (!isVisible(el)) return false;
                const txt = textOf(el).toLowerCase();
                return txt.includes('angriff') || txt.includes('attack');
            }) ||
            null
        );
    }

    function safeClick(el) {
        if (!el) return false;
        try {
            el.scrollIntoView({ block: 'center', inline: 'center' });
        } catch (e) {}
        try {
            el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
            el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            el.click();
            return true;
        } catch (e) {
            try {
                el.click();
                return true;
            } catch (_) {
                return false;
            }
        }
    }

    async function phase1AutoOnPlace() {
        if (getScreen() !== 'place') return;

        const active = loadJson(ACTIVE_KEY, null);
        if (!active || active.phase !== 'phase1-auto') return;
        if (!isAutomationEnabled()) return;

        if (active.done) return;

        if (isAttackExpired(active)) {
            failActiveAttack('expired', 'Abschickzeit liegt in der Vergangenheit');
            return;
        }

        log('Phase1 aktiv auf Place:', active);
        toast('Phase 1: Vorlage/Ziel/Angriff vorbereiten');

        await sleep(800);

        const targetOk = setTargetCoords(active.to);
        log('Ziel gesetzt:', targetOk, active.to);

        await sleep(500);

        const templateName = getTemplateName(active.unit);
        const templateBtn = findTemplateButton(templateName);

        if (!templateBtn) {
            log('Vorlage nicht gefunden:', templateName);
            toast('Vorlage nicht gefunden: ' + templateName);
            updatePlanItem(active.id, { status: 'error', error: 'Vorlage nicht gefunden: ' + templateName });
            if (isQueueRunning()) pauseQueue();
            return;
        }

        log('Vorlage gefunden:', templateName, templateBtn);
        safeClick(templateBtn);

        await sleep(900);

        // Nach Vorlagen-Klick sicherheitshalber Koordinaten nochmal setzen,
        // falls die Vorlage Eingaben verändert.
        setTargetCoords(active.to);

        await sleep(400);

        const attackBtn = findAttackButton();
        if (!attackBtn) {
            log('Angriff-Button nicht gefunden');
            toast('Angriff-Button nicht gefunden');
            updatePlanItem(active.id, { status: 'error', error: 'Angriff-Button nicht gefunden' });
            if (isQueueRunning()) pauseQueue();
            return;
        }

        log('Angriff-Button gefunden:', attackBtn);
        toast('Klicke Angriff bis Confirm');
        updatePlanItem(active.id, { status: 'confirm_opening' });

        // active bleibt gespeichert, damit Confirm-Seite ihn später in Phase 2 nutzen kann.
        active.phase = 'confirm-opened';
        active.templateName = templateName;
        active.targetSet = targetOk;
        active.attackClickedAt = Date.now();
        saveJson(ACTIVE_KEY, active);

        await sleep(300);
        safeClick(attackBtn);

        setTimeout(() => {
            const current = loadJson(ACTIVE_KEY, null);
            if (!current || current.id !== active.id) return;

            const params = getParams();
            const stillPlace = getScreen() === 'place' && params.get('try') !== 'confirm';

            if (!stillPlace) return;

            const reason = detectNotEnoughTroopsText();
            if (reason) {
                failActiveAttack('not_enough_troops', 'Zu wenig Truppen / ' + reason);
                return;
            }

            // Wenn nach dem Angriffsklick keine Confirm-Seite kam, behandeln wir es als Vorbereitungsfehler.
            failActiveAttack('error', 'Confirm-Seite wurde nicht geöffnet');
        }, 3200);
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }


    function isAutoCloseEnabled() {
        return localStorage.getItem(AUTO_CLOSE_KEY) !== '0';
    }

    function setAutoCloseEnabled(value) {
        localStorage.setItem(AUTO_CLOSE_KEY, value ? '1' : '0');
    }

    function setCloseMarker(active, reason) {
        if (!active || !active.id) return;
        const marker = {
            id: active.id,
            villageId: active.villageId || '',
            from: active.from,
            to: active.to,
            reason: reason || 'submitted',
            at: Date.now()
        };
        console.log('[TWCC Angriffsplaner V1.0.1] Close-Marker gesetzt', marker);
        localStorage.setItem(CLOSE_MARKER_KEY, JSON.stringify(marker));
    }

    function maybeAutoCloseThisTab() {
        if (!isAutoCloseEnabled()) return;
        const marker = loadJson(CLOSE_MARKER_KEY, null);
        if (!marker) return;

        const params = getParams();
        const currentVillage = params.get('village') || '';

        // Nur Tabs schließen, die sehr wahrscheinlich vom Angriffsplaner geöffnet wurden.
        const isSameVillage = !marker.villageId || marker.villageId === currentVillage;
        const fresh = Date.now() - Number(marker.at || 0) < 20000;

        if (!fresh || !isSameVillage) return;

        console.log('[TWCC Angriffsplaner V1.0.2] Tab wird nach Senden geschlossen, Queue wird vorher fortgesetzt', marker);
        localStorage.removeItem(CLOSE_MARKER_KEY);

        // Wichtig:
        // Nach dem Submit lädt die Seite neu. Der Code nach submitConfirm() läuft nicht zuverlässig.
        // Deshalb erledigt diese neue Seite hier den Status + Queue-Fortsetzung.
        if (marker.id) {
            updatePlanItem(marker.id, { status: 'submitted_test', submitAt: Date.now() });
        }

        localStorage.removeItem(ACTIVE_KEY);

        if (isQueueRunning() && !isQueuePaused()) {
            setTimeout(() => {
                console.log('[TWCC Angriffsplaner V1.0.2] Queue weiter nach Auto-Close-Marker');
                queueTick('post-submit-close-marker');
            }, 900);
        }

        // Erst schließen, nachdem queueTick Zeit hatte, den nächsten Angriff zu öffnen.
        setTimeout(() => {
            try {
                window.close();
            } catch (e) {
                console.warn('[TWCC Angriffsplaner] window.close nicht erlaubt', e);
            }
        }, 2600);
    }


    function getStatusInfo(status, error) {
        const s = status || 'open';

        const map = {
            open: { color: '#2f80ed', label: 'offen' },
            preparing: { color: '#f2c94c', label: 'wird vorbereitet' },
            opened: { color: '#56ccf2', label: 'Place geöffnet' },
            confirm_opening: { color: '#bb6bd9', label: 'Confirm öffnet' },
            confirm_ready: { color: '#9b51e0', label: 'Confirm bereit' },
            submitted_test: { color: '#27ae60', label: 'gesendet' },
            submitted: { color: '#27ae60', label: 'gesendet' },
            done: { color: '#27ae60', label: 'fertig' },
            expired: { color: '#eb5757', label: 'abgelaufen' },
            not_enough_troops: { color: '#f2994a', label: 'zu wenig Truppen' },
            error: { color: '#eb5757', label: 'Fehler' },
            submit_failed: { color: '#eb5757', label: 'Submit fehlgeschlagen' }
        };

        const info = map[s] || { color: '#828282', label: s };
        return {
            color: info.color,
            label: error ? `${info.label}: ${error}` : info.label
        };
    }

    function renderStatusBadge(status, error) {
        const info = getStatusInfo(status, error);
        return `<span style="display:inline-flex;align-items:center;gap:5px;white-space:nowrap;">
            <span style="width:10px;height:10px;border-radius:50%;background:${info.color};display:inline-block;border:1px solid rgba(0,0,0,.35);"></span>
            <span>${escapeHtml(info.label)}</span>
        </span>`;
    }

    function getRowBgByStatus(status) {
        switch (status) {
            case 'submitted_test':
            case 'submitted':
            case 'done':
                return 'background:#d9f7d9;';
            case 'preparing':
            case 'opened':
            case 'confirm_opening':
            case 'confirm_ready':
                return 'background:#fff3bf;';
            case 'not_enough_troops':
                return 'background:#ffe0bd;';
            case 'expired':
            case 'error':
            case 'submit_failed':
                return 'background:#ffd6d6;';
            default:
                return '';
        }
    }


    function renderPreview(plan) {
        const villageMap = loadJson(STORAGE_KEY, {});
        const villageNameCache = getVillageNameCache();
        const templateColors = getTemplateColors();
        const rows = plan.map((p, i) => {
            if (!p.ok) {
                return `<tr style="background:#ffd6d6;"><td>${p.line}</td><td colspan="11">${escapeHtml(p.raw)}<br><b>${escapeHtml(p.error)}</b></td></tr>`;
            }

            const vid = p.villageId || villageMap[p.from] || '';
            const status = vid ? '✅ gefunden' : '❌ fehlt';
            const template = getTemplateName(p.unit);
            const unitKey = getCanonicalUnit(p.unit);
            const unitColor = normalizeHexColor(templateColors[unitKey] || DEFAULT_TEMPLATE_COLORS[unitKey], '#ffffff');
            const unitTextColor = readableTextColor(unitColor);
            const unitCellStyle = `background:${unitColor};color:${unitTextColor};font-weight:bold;`;
            const state = (p.status || 'open') + (p.error ? ' · ' + p.error : '');
            const startVillageName = getVillageDisplayName(p, 'start', villageMap, villageNameCache);
            const targetVillageName = getVillageDisplayName(p, 'target', villageMap, villageNameCache);

            const rowBg = getRowBgByStatus(p.status);

            return `<tr style="${rowBg}">
                <td>${i + 1}</td>
                <td>${escapeHtml(p.fromName || '-')}</td>
                <td title="${escapeHtml(vid || p.from)}">${escapeHtml(startVillageName)}</td>
                <td>${escapeHtml(p.toName || '-')}</td>
                <td title="${escapeHtml(p.targetId || p.to)}">${escapeHtml(targetVillageName)}</td>
                <td>${escapeHtml(p.send)}</td>
                <td>${escapeHtml(p.arrival || '-')}</td>
                <td style="${unitCellStyle}">${escapeHtml(p.unit)}</td>
                <td style="${unitCellStyle}">${escapeHtml(template)}</td>
                <td>${renderStatusBadge(p.status, p.error)}</td>
                <td>${status}</td>
                <td><button class="twcc-dsu-open" data-index="${i}" ${vid ? '' : 'disabled'}>Dorf öffnen</button></td>
            </tr>`;
        }).join('');

        return `<table style="width:100%; border-collapse:collapse; font-size:12px;" border="1" cellpadding="4">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Startspieler</th>
                    <th>Startdorf</th>
                    <th>Zielspieler</th>
                    <th>Zieldorf</th>
                    <th>Abschickzeit</th>
                    <th>Ankunft</th>
                    <th>Einheit</th>
                    <th>Vorlage</th>
                    <th>Status</th>
                    <th>Map</th>
                    <th>Test</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>`;
    }

    function createWindow() {
        let win = document.getElementById('twcc-dsu-p1');
        if (win) {
            win.style.display = '';
            return;
        }

        win = document.createElement('div');
        win.id = 'twcc-dsu-p1';
        win.style.cssText = [
            'position:fixed',
            'top:90px',
            'left:90px',
            'width:980px',
            'height:660px',
            'z-index:999999',
            'background:#f4e4bc',
            'border:2px solid #6f4e2e',
            'border-radius:8px',
            'box-shadow:0 4px 16px rgba(0,0,0,.35)',
            'font:12px Arial,sans-serif',
            'color:#2b1a08',
            'resize:both',
            'overflow:auto'
        ].join(';');

        win.innerHTML = `
            <div id="twcc-dsu-head" style="background:#6f4e2e;color:white;padding:8px;cursor:move;font-weight:bold;">
                📋 TWCC Angriffsplaner
                <button id="twcc-dsu-close" style="float:right;">×</button>
            </div>
            <div style="padding:10px;">
                <div style="margin-bottom:8px;">
                    <button id="twcc-dsu-scan">Eigene Dörfer scannen</button>
                    <button id="twcc-dsu-showmap">Village-Map anzeigen</button>
                    <button id="twcc-dsu-start">Angriff vorbereiten</button>
                    <button id="twcc-dsu-resetstatus">Status zurücksetzen</button>
                    <button id="twcc-dsu-handoff-export">Offene exportieren</button>
                    <button id="twcc-dsu-handoff-import">Übergabe importieren</button>
                    <button id="twcc-dsu-clear">Daten löschen</button>
                    <span id="twcc-dsu-status" style="margin-left:10px;font-weight:bold;"></span>
                </div>

                <details style="background:#fff8e8;border:1px solid #c7a76b;border-radius:6px;padding:8px;margin-bottom:8px;">
                    <summary style="cursor:pointer;font-weight:bold;">Vorlagen und Vorwarnung einstellen</summary>
                    <div id="twcc-dsu-template-settings" style="display:grid;grid-template-columns:repeat(3,minmax(210px,1fr));gap:6px;margin-top:8px;"></div>
                    <div style="border-top:1px solid #c7a76b;margin-top:9px;padding-top:8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                        <label><input id="twcc-dsu-sound-enabled" type="checkbox"> Warnung aktiv</label>
                        <label>Vorwarnung <input id="twcc-dsu-sound-seconds" type="number" min="0" max="3600" style="width:70px;"> Sek.</label>
                        <label>Text <input id="twcc-dsu-warning-text" type="text" maxlength="160" placeholder="Piep oder gesprochener Text" style="width:220px;"></label>
                        <label>Pieptöne <input id="twcc-dsu-sound-count" type="number" min="1" max="10" style="width:55px;" title="Wird nur verwendet, wenn als Text Piep eingetragen ist"></label>
                        <label>Lautstärke <input id="twcc-dsu-sound-volume" type="range" min="0" max="1" step="0.05"></label>
                        <label>Tonhöhe <input id="twcc-dsu-sound-frequency" type="number" min="150" max="2500" style="width:75px;" title="Wird nur verwendet, wenn als Text Piep eingetragen ist"> Hz</label>
                        <button id="twcc-dsu-sound-test">Warnung testen</button>
                        <button id="twcc-dsu-settings-save">Einstellungen speichern</button>
                    </div>
                </details>

                <textarea id="twcc-dsu-text" style="width:100%;height:170px;" placeholder="DS-Ultimate Copy-Liste hier einfügen..."></textarea>

                <div style="margin:8px 0;">
                    <button id="twcc-dsu-parse">Prüfen / Vorschau</button>
                    <button id="twcc-dsu-save">Plan speichern</button>
                </div>

                <div id="twcc-dsu-preview"></div>
            </div>
        `;

        document.body.appendChild(win);

        const textarea = document.getElementById('twcc-dsu-text');
        textarea.value = localStorage.getItem(RAW_KEY) || '';

        let currentPlan = loadJson(PLAN_KEY, []);

        const templateSettings = document.getElementById('twcc-dsu-template-settings');
        const templateMap = getTemplateMap();
        const templateColors = getTemplateColors();
        templateSettings.innerHTML = TEMPLATE_DEFINITIONS.map(def => {
            const color = normalizeHexColor(templateColors[def.key] || DEFAULT_TEMPLATE_COLORS[def.key], '#ffffff');
            return `
                <label style="display:grid;grid-template-columns:minmax(110px,1fr) 125px 22px;gap:6px;align-items:center;">
                    <span>${escapeHtml(def.label)}</span>
                    <input class="twcc-dsu-template-input" data-unit="${escapeHtml(def.key)}" value="${escapeHtml(templateMap[def.key] || '')}" style="width:125px;box-sizing:border-box;">
                    <span class="twcc-dsu-color-square" data-unit="${escapeHtml(def.key)}" title="Farbe für ${escapeHtml(def.label)} wählen" style="position:relative;width:18px;height:18px;border:1px solid #5d4528;border-radius:2px;background:${color};cursor:pointer;display:inline-block;box-shadow:inset 0 0 0 1px rgba(255,255,255,.35);">
                        <input class="twcc-dsu-template-color" data-unit="${escapeHtml(def.key)}" type="color" value="${color}" aria-label="Farbe für ${escapeHtml(def.label)}" style="position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;padding:0;border:0;">
                    </span>
                </label>`;
        }).join('');

        document.querySelectorAll('.twcc-dsu-template-color').forEach(input => {
            input.addEventListener('input', () => {
                const square = input.closest('.twcc-dsu-color-square');
                if (square) square.style.background = input.value;
            });
        });

        const soundSettings = getSoundSettings();
        document.getElementById('twcc-dsu-sound-enabled').checked = !!soundSettings.enabled;
        document.getElementById('twcc-dsu-sound-seconds').value = String(soundSettings.secondsBefore);
        document.getElementById('twcc-dsu-warning-text').value = String(soundSettings.warningText ?? 'Piep');
        document.getElementById('twcc-dsu-sound-count').value = String(soundSettings.beepCount);
        document.getElementById('twcc-dsu-sound-volume').value = String(soundSettings.volume);
        document.getElementById('twcc-dsu-sound-frequency').value = String(soundSettings.frequency);

        function collectSoundSettings() {
            return {
                enabled: document.getElementById('twcc-dsu-sound-enabled').checked,
                secondsBefore: Math.max(0, Math.min(3600, Number(document.getElementById('twcc-dsu-sound-seconds').value) || 0)),
                warningText: document.getElementById('twcc-dsu-warning-text').value.trim(),
                beepCount: Math.max(1, Math.min(10, Number(document.getElementById('twcc-dsu-sound-count').value) || 2)),
                volume: Math.max(0, Math.min(1, Number(document.getElementById('twcc-dsu-sound-volume').value) || 0)),
                frequency: Math.max(150, Math.min(2500, Number(document.getElementById('twcc-dsu-sound-frequency').value) || 880))
            };
        }

        document.getElementById('twcc-dsu-sound-test').onclick = () => { claimAudioHost(); playWarningSoundLocal(collectSoundSettings()); };
        document.getElementById('twcc-dsu-settings-save').onclick = () => {
            const nextMap = {};
            const nextColors = {};
            document.querySelectorAll('.twcc-dsu-template-input').forEach(input => {
                nextMap[input.dataset.unit] = input.value.trim();
            });
            document.querySelectorAll('.twcc-dsu-template-color').forEach(input => {
                nextColors[input.dataset.unit] = normalizeHexColor(input.value, DEFAULT_TEMPLATE_COLORS[input.dataset.unit] || '#ffffff');
            });
            setTemplateMap(nextMap);
            setTemplateColors(nextColors);
            setSoundSettings(collectSoundSettings());
            toast('Vorlagen, Farben und Warnung gespeichert');
            refreshPreview();
        };

        function refreshPreview() {
            markExpiredAttacks();
            currentPlan = sortPlanBySendTime(loadJson(PLAN_KEY, currentPlan || []));
            saveJson(PLAN_KEY, currentPlan);
            document.getElementById('twcc-dsu-preview').innerHTML = renderPreview(currentPlan);

            ensureVillageNames(currentPlan).then(changed => {
                if (changed && document.getElementById('twcc-dsu-p1')?.style.display !== 'none') {
                    document.getElementById('twcc-dsu-preview').innerHTML = renderPreview(currentPlan);
                    document.querySelectorAll('.twcc-dsu-open').forEach(btn => {
                        btn.onclick = () => openPlaceForAttack(currentPlan[parseInt(btn.dataset.index, 10)], false);
                    });
                }
            });

            document.querySelectorAll('.twcc-dsu-open').forEach(btn => {
                btn.onclick = () => openPlaceForAttack(currentPlan[parseInt(btn.dataset.index, 10)], false);
            });

            const ok = currentPlan.filter(p => p.ok).length;
            const bad = currentPlan.length - ok;
            const missing = currentPlan.filter(p => p.ok && !loadJson(STORAGE_KEY, {})[p.from]).length;
            document.getElementById('twcc-dsu-status').textContent = `${ok} erkannt, ${bad} Fehler, ${missing} ohne village_id`;
        }

        if (!win._twccHandoffListener) {
            win._twccHandoffListener = true;
            win.addEventListener('twcc-handoff-imported', () => {
                currentPlan = loadJson(PLAN_KEY, []);
                textarea.value = '';
                refreshPreview();
            });
        }

        document.getElementById('twcc-dsu-close').onclick = () => win.style.display = 'none';

        document.getElementById('twcc-dsu-scan').onclick = () => {
            const map = scanOwnVillages();
            document.getElementById('twcc-dsu-status').textContent = `${Object.keys(map).length} Dörfer gespeichert`;
            refreshPreview();
        };

        document.getElementById('twcc-dsu-showmap').onclick = () => {
            const map = loadJson(STORAGE_KEY, {});
            document.getElementById('twcc-dsu-preview').innerHTML = `<pre style="background:white;padding:8px;max-height:350px;overflow:auto;">${escapeHtml(JSON.stringify(map, null, 2))}</pre>`;
        };

        document.getElementById('twcc-dsu-start').onclick = startNextPhase1;
        document.getElementById('twcc-dsu-handoff-export').onclick = exportOpenAttacks;
        document.getElementById('twcc-dsu-handoff-import').onclick = importOpenAttacks;

        document.getElementById('twcc-dsu-resetstatus').onclick = () => {
            const plan = loadJson(PLAN_KEY, []).map(p => p.ok ? Object.assign({}, p, { status: 'open', error: '' }) : p);
            saveJson(PLAN_KEY, plan);
            localStorage.removeItem(ACTIVE_KEY);
            setQueueRunning(false);
            setQueuePaused(false);
            localStorage.setItem(AUTOMATION_ENABLED_KEY, '0');
            currentPlan = plan;
            refreshPreview();
            toast('Status zurückgesetzt');
        };

        document.getElementById('twcc-dsu-clear').onclick = () => {
            if (!confirm('Testdaten löschen?')) return;
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(PLAN_KEY);
            localStorage.removeItem(RAW_KEY);
            localStorage.removeItem(ACTIVE_KEY);
            localStorage.removeItem(QUEUE_KEY);
            localStorage.removeItem(QUEUE_PAUSE_KEY);
            localStorage.removeItem(AUTOMATION_ENABLED_KEY);
            localStorage.removeItem(TEMPLATE_MAP_KEY);
            localStorage.removeItem(TEMPLATE_COLOR_KEY);
            localStorage.removeItem(VILLAGE_NAME_CACHE_KEY);
            localStorage.removeItem(SOUND_SETTINGS_KEY);
            localStorage.removeItem(WARNING_FIRED_KEY);
            currentPlan = [];
            document.getElementById('twcc-dsu-status').textContent = 'gelöscht';
            document.getElementById('twcc-dsu-preview').innerHTML = '';
        };

        document.getElementById('twcc-dsu-parse').onclick = () => {
            currentPlan = parseDsuText(textarea.value);
            clearWarningFiredForAttack();
            saveJson(PLAN_KEY, currentPlan);
            localStorage.setItem(RAW_KEY, textarea.value);
            refreshPreview();
        };

        document.getElementById('twcc-dsu-save').onclick = () => {
            if (!currentPlan.length) currentPlan = parseDsuText(textarea.value);
            clearWarningFiredForAttack();
            saveJson(PLAN_KEY, currentPlan);
            localStorage.setItem(RAW_KEY, textarea.value);
            alert(currentPlan.filter(p => p.ok).length + ' Angriffe gespeichert.');
            refreshPreview();
        };

        makeDraggable(win, document.getElementById('twcc-dsu-head'));
        refreshPreview();

        if (!win._twccLiveRefresh) {
            win._twccLiveRefresh = setInterval(() => {
                if (win.style.display === 'none') return;
                refreshPreview();
            }, 1200);
        }
    }

    function makeDraggable(panel, header) {
        let dragging = false, sx = 0, sy = 0, sl = 0, st = 0;

        header.addEventListener('mousedown', e => {
            if (e.target.closest('button')) return;
            dragging = true;
            sx = e.clientX;
            sy = e.clientY;
            const r = panel.getBoundingClientRect();
            sl = r.left;
            st = r.top;
            e.preventDefault();
        });

        document.addEventListener('mousemove', e => {
            if (!dragging) return;
            panel.style.left = Math.max(0, sl + e.clientX - sx) + 'px';
            panel.style.top = Math.max(0, st + e.clientY - sy) + 'px';
        });

        document.addEventListener('mouseup', () => dragging = false);
    }

    function addLauncher() {
        if (document.getElementById('twcc-dsu-launch')) return;

        const btn = document.createElement('button');
        btn.id = 'twcc-dsu-launch';
        btn.textContent = 'Angriffsplaner';
        btn.style.cssText = [
            'position:fixed',
            'right:10px',
            'bottom:55px',
            'z-index:999998',
            'background:#f4e4bc',
            'border:2px solid #6f4e2e',
            'border-radius:6px',
            'padding:6px 10px',
            'cursor:pointer'
        ].join(';');

        btn.onclick = createWindow;
        document.body.appendChild(btn);
    }


    // ======================
    // PHASE 2: Confirm / Timer Test
    // ======================

    const PHASE2_STATE = {
        armed: false,
        timeout: null,
        warningTimeout: null,
        warningInterval: null,
        warnedAttackId: null,
        raf: null,
        tick: null
    };

    function pad(n, len = 2) {
        return String(n).padStart(len, '0');
    }

    function getTimingDefaultMs() {
        const v = Math.round(Number(localStorage.getItem(TIMING_DEFAULT_MS_KEY) ?? '200'));
        return Number.isFinite(v) ? Math.max(0, Math.min(999, v)) : 200;
    }

    function setTimingDefaultMs(v) {
        const n = Math.round(Number(String(v ?? '').replace(',', '.')));
        localStorage.setItem(TIMING_DEFAULT_MS_KEY, String(Number.isFinite(n) ? Math.max(0, Math.min(999, n)) : 200));
    }

    function getTimingOffsetMs() {
        const v = Math.round(Number(localStorage.getItem(TIMING_OFFSET_KEY) ?? '0'));
        return Number.isFinite(v) ? v : 0;
    }

    function setTimingOffsetMs(v) {
        const n = Math.round(Number(String(v ?? '').replace(',', '.')));
        localStorage.setItem(TIMING_OFFSET_KEY, String(Number.isFinite(n) ? n : 0));
    }

    function parseDateTimeDe(str) {
        const m = String(str || '').trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/);
        if (!m) return null;

        const explicitMs = m[7] !== undefined;
        const ms = explicitMs
            ? Number(String(m[7]).padEnd(3, '0').slice(0, 3))
            : getTimingDefaultMs();

        const targetMs = new Date(
            Number(m[3]),
            Number(m[2]) - 1,
            Number(m[1]),
            Number(m[4]),
            Number(m[5]),
            Number(m[6]),
            ms
        ).getTime();

        return {
            raw: str,
            targetMs,
            ms,
            explicitMs,
            display: `${pad(m[4])}:${m[5]}:${m[6]}.${pad(ms, 3)}`,
            dateDisplay: `${pad(m[1])}.${pad(m[2])}.${m[3]} ${pad(m[4])}:${m[5]}:${m[6]}.${pad(ms, 3)}`,
            clickMs: targetMs + getTimingOffsetMs()
        };
    }

    function getSendTimingInfo(sendText) {
        const parsed = parseDateTimeDe(sendText);
        if (!parsed) return null;

        const offset = getTimingOffsetMs();
        return {
            ...parsed,
            offset,
            clickMs: parsed.targetMs + offset,
            clickDisplay: formatServerTime(parsed.targetMs + offset)
        };
    }


    function isAutoCalibEnabled() {
        return localStorage.getItem(TIMING_AUTOCALIB_KEY) !== '0';
    }

    function setAutoCalibEnabled(value) {
        localStorage.setItem(TIMING_AUTOCALIB_KEY, value ? '1' : '0');
    }

    function getCalibLimit() {
        const v = Math.round(Number(localStorage.getItem(TIMING_CALIB_LIMIT_KEY) ?? '300'));
        return Number.isFinite(v) ? Math.max(20, Math.min(1000, v)) : 300;
    }

    function setCalibLimit(value) {
        const v = Math.round(Number(String(value ?? '').replace(',', '.')));
        localStorage.setItem(TIMING_CALIB_LIMIT_KEY, String(Number.isFinite(v) ? Math.max(20, Math.min(1000, v)) : 300));
    }

    function calculateAutoCalib() {
        const stats = loadJson(TIMING_STATS_KEY, [])
            .filter(s => Number.isFinite(Number(s.diffMs)))
            .slice(-5);

        if (stats.length < 5) {
            return {
                ready: false,
                message: `${stats.length}/5 Werte gesammelt`,
                used: stats.map(s => Number(s.diffMs)),
                ignored: null,
                avg: null,
                correction: 0
            };
        }

        const values = stats.map(s => Number(s.diffMs));
        const rawAvg = values.reduce((a, b) => a + b, 0) / values.length;

        let ignoredIndex = -1;
        let maxDistance = -1;

        values.forEach((v, i) => {
            const dist = Math.abs(v - rawAvg);
            if (dist > maxDistance) {
                maxDistance = dist;
                ignoredIndex = i;
            }
        });

        const distances = values.map(v => Math.abs(v - rawAvg)).sort((a, b) => b - a);
        const biggest = distances[0] || 0;
        const second = distances[1] || 0;
        const removeOutlier = ignoredIndex >= 0 && biggest > 80 && biggest > second * 1.8;

        const used = removeOutlier ? values.filter((_, i) => i !== ignoredIndex) : values;
        const ignored = removeOutlier ? values[ignoredIndex] : null;
        const avg = used.reduce((a, b) => a + b, 0) / used.length;

        const limit = getCalibLimit();
        let correction = -Math.round(avg);
        correction = Math.max(-limit, Math.min(limit, correction));

        return {
            ready: true,
            message: `Ø ${avg >= 0 ? '+' : ''}${avg.toFixed(1)} ms · Korrektur ${correction >= 0 ? '+' : ''}${correction} ms` + (ignored !== null ? ` · Ausreißer ignoriert ${ignored >= 0 ? '+' : ''}${ignored} ms` : ''),
            used,
            ignored,
            avg,
            correction
        };
    }

    function applyAutoCalibIfReady() {
        if (!isAutoCalibEnabled()) return;
        const calc = calculateAutoCalib();

        if (!calc.ready) {
            log('AutoKalibrierung wartet:', calc.message);
            return;
        }

        if (!calc.correction) {
            log('AutoKalibrierung keine Korrektur nötig:', calc.message);
            return;
        }

        const oldOffset = getTimingOffsetMs();
        const newOffset = oldOffset + calc.correction;
        setTimingOffsetMs(newOffset);

        log(`AutoKalibrierung angewendet: Offset ${oldOffset} -> ${newOffset} (${calc.message})`);
        toast(`Auto-Kalibrierung: Offset ${newOffset} ms`);
    }


    function saveTimingStat(entry) {
        const stats = loadJson(TIMING_STATS_KEY, []);
        stats.push(Object.assign({ at: Date.now() }, entry));
        saveJson(TIMING_STATS_KEY, stats.slice(-50));
        applyAutoCalibIfReady();
    }

    function getTimingStatsSummary() {
        const stats = loadJson(TIMING_STATS_KEY, []).filter(s => Number.isFinite(Number(s.diffMs)));
        if (!stats.length) return 'Noch keine Werte';
        const diffs = stats.map(s => Number(s.diffMs));
        const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
        const best = diffs.reduce((best, v) => Math.abs(v) < Math.abs(best) ? v : best, diffs[0]);
        const worst = diffs.reduce((worst, v) => Math.abs(v) > Math.abs(worst) ? v : worst, diffs[0]);
        const calib = calculateAutoCalib();
        return `Ø ${avg >= 0 ? '+' : ''}${avg.toFixed(1)} ms · Beste ${best >= 0 ? '+' : ''}${best.toFixed(0)} ms · Schlechteste ${worst >= 0 ? '+' : ''}${worst.toFixed(0)} ms · Kalib: ${calib.message}`;
    }



    function formatMs(ms) {
        if (!Number.isFinite(ms)) return '-';
        const sign = ms < 0 ? '-' : '';
        ms = Math.abs(ms);
        const h = Math.floor(ms / 3600000);
        ms %= 3600000;
        const m = Math.floor(ms / 60000);
        ms %= 60000;
        const s = Math.floor(ms / 1000);
        const milli = Math.floor(ms % 1000);
        return `${sign}${pad(h)}:${pad(m)}:${pad(s)}.${pad(milli, 3)}`;
    }

    function getServerOffset() {
        try {
            const txt = $('#serverTime').closest('p').text();
            const nums = txt.match(/\d+/g);
            if (!nums || nums.length < 6) return 0;
            const [hour, min, sec, day, month, year] = nums.map(Number);
            const serverDateTime = new Date(year, month - 1, day, hour, min, sec).getTime();
            return Math.round(Math.abs(serverDateTime - Date.now()) / 36e5) * 3600 * 1000;
        } catch (e) {
            return 0;
        }
    }

    function getCurrentServerMs() {
        if (typeof Timing !== 'undefined' && typeof Timing.getCurrentServerTime === 'function') {
            return Math.round(Timing.getCurrentServerTime());
        }
        return Date.now() + getServerOffset();
    }

    function formatServerTime(ms) {
        const d = new Date(ms);
        return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
    }

    function findConfirmButton() {
        return (
            document.querySelector('#troop_confirm_submit') ||
            document.querySelector('input[name="submit"]') ||
            document.querySelector('button[name="submit"]') ||
            Array.from(document.querySelectorAll('input, button, a')).find(el => {
                if (!isVisible(el)) return false;
                const txt = textOf(el).toLowerCase();
                return txt.includes('angreifen') || txt.includes('bestätigen') || txt.includes('confirm') || txt.includes('ok');
            }) ||
            null
        );
    }

    function submitConfirm(btn) {
        if (!btn) return false;

        try {
            const form = btn.closest('form');
            if (form && typeof form.requestSubmit === 'function') {
                form.requestSubmit(btn);
                return true;
            }
            btn.click();
            return true;
        } catch (e) {
            try {
                btn.click();
                return true;
            } catch (_) {
                return false;
            }
        }
    }

    function clearPhase2Timer() {
        PHASE2_STATE.armed = false;
        if (PHASE2_STATE.timeout) {
            clearTimeout(PHASE2_STATE.timeout);
            PHASE2_STATE.timeout = null;
        }
        if (PHASE2_STATE.warningTimeout) {
            clearTimeout(PHASE2_STATE.warningTimeout);
            PHASE2_STATE.warningTimeout = null;
        }
        if (PHASE2_STATE.warningInterval) {
            clearInterval(PHASE2_STATE.warningInterval);
            PHASE2_STATE.warningInterval = null;
        }
        PHASE2_STATE.warnedAttackId = null;
        if (PHASE2_STATE.raf) {
            cancelAnimationFrame(PHASE2_STATE.raf);
            PHASE2_STATE.raf = null;
        }
    }

    function precisionSubmitAt(sendServerMs, btn) {
        const status = document.getElementById('twcc-dsu-exec-status');

        const spin = () => {
            if (!PHASE2_STATE.armed) return;

            const nowServer = getCurrentServerMs();
            const rest = sendServerMs - nowServer;

            if (status) status.textContent = `Precision aktiv · Rest ${Math.round(rest)} ms · Server-ms ${nowServer % 1000}`;

            if (rest <= 0) {
                if (!isAutomationEnabled()) {
                    clearPhase2Timer();
                    return;
                }
                PHASE2_STATE.armed = false;

                const before = getCurrentServerMs();
                const restAtSubmit = sendServerMs - before;
                const activeBeforeSubmit = loadJson(ACTIVE_KEY, null);
                if (activeBeforeSubmit && isAutoCloseEnabled() && activeBeforeSubmit.openedByAngriffsplaner) {
                    setCloseMarker(activeBeforeSubmit, 'auto-submit');
                }

                const ok = submitConfirm(btn);
                const after = getCurrentServerMs();

                const activeForStats = loadJson(ACTIVE_KEY, null);
                const timingForStats = activeForStats ? getSendTimingInfo(activeForStats.send) : null;
                const diffToTarget = timingForStats ? before - timingForStats.targetMs : null;

                log(`PHASE2 SUBMIT ${ok ? 'OK' : 'FAIL'} · RestKlick ${restAtSubmit} ms · ZielDiff ${diffToTarget} ms · ServerMS ${before % 1000} · Call ${after - before} ms`);

                if (ok && timingForStats) {
                    saveTimingStat({
                        id: activeForStats.id,
                        from: activeForStats.from,
                        to: activeForStats.to,
                        targetMs: timingForStats.targetMs,
                        clickMs: before,
                        offsetMs: timingForStats.offset,
                        diffMs: diffToTarget,
                        serverMs: before % 1000,
                        submitCallMs: after - before
                    });
                }

                if (status) {
                    status.textContent = ok
                        ? `GEKLICKT · ZielDiff ${diffToTarget} ms · ServerMS ${before % 1000}`
                        : 'Submit fehlgeschlagen';
                }

                const active = loadJson(ACTIVE_KEY, null);
                if (active?.id) {
                    updatePlanItem(active.id, { status: ok ? 'submitted_test' : 'submit_failed', submitAt: Date.now() });
                    active.phase = ok ? 'submitted-test' : 'submit-failed';
                    active.submitAt = Date.now();
                    if (ok) {
                        const shouldClose = isAutoCloseEnabled() && active.openedByAngriffsplaner;
                        localStorage.removeItem(ACTIVE_KEY);
                        setTimeout(() => queueTick('auto-submit'), 900);
                        if (shouldClose) {
                            setTimeout(() => {
                                try { window.close(); } catch (e) {}
                            }, 1500);
                        }
                    } else {
                        saveJson(ACTIVE_KEY, active);
                    }
                }

                toast(ok ? 'Angriff gesendet' : 'Submit fehlgeschlagen');
                return;
            }

            if (rest > 16) PHASE2_STATE.raf = requestAnimationFrame(spin);
            else queueMicrotask(spin);
        };

        spin();
    }

    function armPhase2Timer() {
        clearPhase2Timer();
        if (!isAutomationEnabled()) return toast('Automatik ist deaktiviert');

        const active = loadJson(ACTIVE_KEY, null);
        if (!active) return toast('Kein aktiver Angriff gefunden');

        if (isAttackExpired(active)) {
            failActiveAttack('expired', 'Abschickzeit liegt in der Vergangenheit');
            return;
        }

        const timing = getSendTimingInfo(active.send);
        if (!timing) return toast('Abschickzeit ungültig: ' + active.send);
        const sendMs = timing.clickMs;

        const btn = findConfirmButton();
        if (!btn) return toast('Confirm-Button nicht gefunden');

        const nowServer = getCurrentServerMs();
        const delay = sendMs - nowServer;

        if (delay < 0) {
            const status = document.getElementById('twcc-dsu-exec-status');
            if (status) status.textContent = `Zu spät · Delay ${delay} ms`;
            failActiveAttack('expired', 'Abschickzeit liegt in der Vergangenheit');
            return;
        }

        PHASE2_STATE.armed = true;

        const sound = getSoundSettings();
        const warningMs = Math.max(0, Number(sound.secondsBefore) || 0) * 1000;
        const warningDelay = delay - warningMs;
        const triggerWarning = () => {
            if (!PHASE2_STATE.armed || !isAutomationEnabled()) return false;
            const current = loadJson(ACTIVE_KEY, null);
            if (!current || current.id !== active.id || PHASE2_STATE.warnedAttackId === active.id || hasWarningFired(active.id)) return false;
            const warningTargetMs = timing.targetMs; // Warnung immer anhand der Abschickzeit
            const remaining = warningTargetMs - getCurrentServerMs();
            if (remaining <= -2500 || remaining > warningMs + 1000) return false;

            // Gemeinsame Kennzeichnung verhindert doppelte Warnungen aus Haupt- und Confirm-Tab.
            PHASE2_STATE.warnedAttackId = active.id;
            markWarningFired(active.id, warningTargetMs);
            playWarningSound(sound);
            toast(`Vorwarnung: Angriff in ${Math.max(0, Math.round(remaining / 1000))} Sekunden`);
            if (PHASE2_STATE.warningInterval) {
                clearInterval(PHASE2_STATE.warningInterval);
                PHASE2_STATE.warningInterval = null;
            }
            return true;
        };
        if (sound.enabled && warningMs > 0) {
            // Haupttimer plus Watchdog: Hintergrund-Tabs drosseln setTimeout teilweise stark.
            // Der Watchdog prüft deshalb fortlaufend und warnt zuverlässig vor jedem Angriff.
            if (warningDelay > 0) {
                PHASE2_STATE.warningTimeout = setTimeout(triggerWarning, warningDelay);
            } else if (delay > 0) {
                setTimeout(triggerWarning, 25);
            }
            PHASE2_STATE.warningInterval = setInterval(triggerWarning, 250);
            triggerWarning();
        }

        const prepareMs = 120;
        const waitMs = Math.max(0, delay - prepareMs);

        const status = document.getElementById('twcc-dsu-exec-status');
        if (status) status.textContent = `Abschickzeit aktiv · Start Precision in ${Math.round(waitMs)} ms`;

        log(`PHASE2 SCHARF · Ziel ${timing.dateDisplay} · Offset ${timing.offset} · Klick ${formatServerTime(timing.clickMs)} · Delay ${delay} ms · Prepare ${prepareMs}`);

        PHASE2_STATE.timeout = setTimeout(() => {
            if (!PHASE2_STATE.armed) return;
            precisionSubmitAt(sendMs, btn);
        }, waitMs);
    }

    function getCurrentArrivalInfo() {
        const container = document.getElementById('date_arrival');
        if (!container) return { text: '-', timestamp: null };

        const span = container.querySelector('span[data-endtime], span');
        const endtime = Number(span?.dataset?.endtime);

        if (Number.isFinite(endtime) && endtime > 0) {
            const timestamp = endtime * 1000;
            return { text: formatFullDateTime(timestamp), timestamp };
        }

        const text = String(container.textContent || '')
            .replace(/\s+/g, ' ')
            .replace(/^.*?(Ankunft|Arrival)\s*:?\s*/i, '')
            .trim();

        return { text: text || '-', timestamp: null };
    }

    function formatFullDateTime(ms) {
        if (!Number.isFinite(ms)) return '-';
        const d = new Date(ms);
        return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
    }

    function updateTimingProgressBar(nowServer, clickMs) {
        const bar = document.getElementById('twcc-dsu-ms-bar-fill');
        const label = document.getElementById('twcc-dsu-ms-bar-label');
        if (!bar || !label || !Number.isFinite(nowServer)) return;

        const serverMs = ((Math.round(nowServer) % 1000) + 1000) % 1000;
        bar.style.width = `${Math.max(0, Math.min(100, serverMs / 10))}%`;

        let background = '#f39c12';
        let phase = 'Wartefenster';

        if (Number.isFinite(clickMs)) {
            const remaining = clickMs - nowServer;
            if (remaining >= 0 && remaining <= 1000) {
                background = '#2eaf4a';
                phase = 'Perfektes Klickfenster';
            } else if (remaining < 0) {
                background = '#d32f2f';
                phase = 'Zeitpunkt überschritten';
            }
        }

        bar.style.background = background;
        label.textContent = `${phase} · Server-MS ${pad(serverMs, 3)}`;
    }

    function buildAngriffsplanerPanel(active) {
        let panel = document.getElementById('twcc-dsu-executor');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'twcc-dsu-executor';
            panel.style.cssText = [
                'position:fixed',
                'right:20px',
                'top:90px',
                'width:430px',
                'z-index:999999',
                'background:#f4e4bc',
                'border:2px solid #6f4e2e',
                'border-radius:10px',
                'box-shadow:0 4px 16px rgba(0,0,0,.35)',
                'font:12px Arial,sans-serif',
                'color:#2b1a08',
                'resize:both',
                'overflow:auto'
            ].join(';');

            panel.innerHTML = `
                <div id="twcc-dsu-exec-head" style="background:#6f4e2e;color:white;padding:8px;cursor:move;font-weight:bold;">
                    ⏱ TWCC Angriffsplaner Timer
                    <button id="twcc-dsu-exec-close" style="float:right;">×</button>
                </div>
                <div style="padding:10px;">
                    <div style="background:#fff8e8;border:1px solid #c7a76b;border-radius:6px;padding:8px;margin-bottom:8px;">
                        <div><b>Aktuell:</b> <span id="twcc-dsu-exec-current">-</span></div>
                        <div><b>Vorlage:</b> <span id="twcc-dsu-exec-template">-</span></div>
                        <div><b>Abschicken Import:</b> <span id="twcc-dsu-exec-send">-</span></div>
                        <div><b>Zielzeit:</b> <span id="twcc-dsu-exec-target">-</span></div>
                        <div><b>Geplante Ankunft:</b> <span id="twcc-dsu-exec-arrival-planned">-</span></div>
                        <div id="twcc-dsu-exec-arrival-current-row" style="margin:4px -4px;padding:4px;border-radius:4px;background:#d9f7d9;border:1px solid #77b877;">
                            <b>Ankunft aktuell:</b> <span id="twcc-dsu-exec-arrival-current">-</span>
                        </div>
                        <div style="position:relative;height:22px;margin:7px 0 5px;background:#777;border:1px solid #4e3b27;border-radius:4px;overflow:hidden;">
                            <div id="twcc-dsu-ms-bar-fill" style="height:100%;width:0%;background:#f39c12;transition:width 35ms linear,background-color 80ms linear;"></div>
                            <div id="twcc-dsu-ms-bar-label" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:bold;text-shadow:0 1px 2px #000;">Wartefenster</div>
                        </div>
                        <div><b>MS-Modus:</b> <span id="twcc-dsu-exec-msmode">-</span></div>
                        <div><b>Klick geplant:</b> <span id="twcc-dsu-exec-click">-</span></div>
                        <div><b>Serverzeit:</b> <span id="twcc-dsu-exec-server">-</span></div>
                        <div><b>Rest bis Klick:</b> <span id="twcc-dsu-exec-rest">-</span></div>
                    </div>

                    <div style="background:#ead3a2;border:1px solid #8b6b3f;border-radius:6px;padding:8px;margin-bottom:8px;">
                        <b>Timing</b><br>
                        Standard-MS wenn leer:
                        <input id="twcc-dsu-default-ms" type="number" min="0" max="999" style="width:70px;" value="200">
                        Offset ms:
                        <input id="twcc-dsu-offset-ms" type="number" style="width:80px;" value="0">
                        Limit:
                        <input id="twcc-dsu-calib-limit" type="number" style="width:70px;" value="300">
                        <label style="white-space:nowrap;"><input id="twcc-dsu-autocalib" type="checkbox" checked> Auto-Kalibrierung</label>
                        <label style="white-space:nowrap;"><input id="twcc-dsu-autoclose" type="checkbox" checked> Tab nach Senden schließen</label>
                        <button id="twcc-dsu-save-timing">Speichern</button>
                        <div style="margin-top:5px;font-size:11px;">Statistik: <span id="twcc-dsu-timing-stats">-</span></div>
                    </div>

                    <div id="twcc-dsu-exec-status" style="font-weight:bold;margin-bottom:8px;">Status: Confirm erkannt</div>

                    <div style="display:flex;gap:8px;flex-wrap:wrap;">
                        <button id="twcc-dsu-exec-manual">Jetzt senden</button>
                        <button id="twcc-dsu-exec-arm">Abschickzeit aktiv</button>
                        <button id="twcc-dsu-exec-stop">Timer Stop</button>
                    </div>

                    <pre id="twcc-dsu-exec-debug" style="margin-top:10px;background:#2f1d07;color:#f8e7bd;padding:8px;border-radius:6px;max-height:120px;overflow:auto;white-space:pre-wrap;"></pre>
                </div>
            `;

            document.body.appendChild(panel);

            document.getElementById('twcc-dsu-exec-close').onclick = () => panel.style.display = 'none';
            document.getElementById('twcc-dsu-exec-manual').onclick = () => {
                const btn = findConfirmButton();
                const active = loadJson(ACTIVE_KEY, null);
                if (active && isAutoCloseEnabled() && active.openedByAngriffsplaner) {
                    setCloseMarker(active, 'manual-submit');
                }
                const ok = submitConfirm(btn);
                if (ok && active?.id) {
                    updatePlanItem(active.id, { status: 'submitted_test', submitAt: Date.now() });
                    const shouldClose = isAutoCloseEnabled() && active.openedByAngriffsplaner;
                    localStorage.removeItem(ACTIVE_KEY);
                    setTimeout(() => queueTick('manual-submit'), 900);
                    if (shouldClose) {
                        setTimeout(() => {
                            try { window.close(); } catch (e) {}
                        }, 1200);
                    }
                }
                toast(ok ? 'Manuell gesendet' : 'Manuelles Abschicken fehlgeschlagen');
            };
            document.getElementById('twcc-dsu-exec-arm').onclick = armPhase2Timer;
            document.getElementById('twcc-dsu-exec-stop').onclick = () => {
                clearPhase2Timer();
                document.getElementById('twcc-dsu-exec-status').textContent = 'Status: Timer gestoppt';
                toast('Timer gestoppt');
            };

            document.getElementById('twcc-dsu-default-ms').value = String(getTimingDefaultMs());
            document.getElementById('twcc-dsu-offset-ms').value = String(getTimingOffsetMs());
            document.getElementById('twcc-dsu-calib-limit').value = String(getCalibLimit());
            document.getElementById('twcc-dsu-autocalib').checked = isAutoCalibEnabled();
            document.getElementById('twcc-dsu-autoclose').checked = isAutoCloseEnabled();
            document.getElementById('twcc-dsu-save-timing').onclick = () => {
                setTimingDefaultMs(document.getElementById('twcc-dsu-default-ms').value);
                setTimingOffsetMs(document.getElementById('twcc-dsu-offset-ms').value);
                setCalibLimit(document.getElementById('twcc-dsu-calib-limit').value);
                setAutoCalibEnabled(document.getElementById('twcc-dsu-autocalib').checked);
                setAutoCloseEnabled(document.getElementById('twcc-dsu-autoclose').checked);
                toast('Timing gespeichert');
            };

            makeDraggable(panel, document.getElementById('twcc-dsu-exec-head'));
        }

        panel.style.display = '';

        function update() {
            const activeNow = loadJson(ACTIVE_KEY, active);
            if (!activeNow) return;

            const now = getCurrentServerMs();
            const timing = getSendTimingInfo(activeNow.send);
            const rest = timing ? timing.clickMs - now : NaN;

            const plan = loadJson(PLAN_KEY, []);
            const total = plan.filter(p => p.ok).length;
            const done = plan.filter(p => ['submitted_test', 'done'].includes(p.status)).length;

            document.getElementById('twcc-dsu-exec-current').textContent =
                `${activeNow.from} → ${activeNow.to} (${done}/${total} erledigt)`;
            document.getElementById('twcc-dsu-exec-template').textContent = activeNow.templateName || getTemplateName(activeNow.unit);
            document.getElementById('twcc-dsu-exec-send').textContent = activeNow.send || '-';
            document.getElementById('twcc-dsu-exec-target').textContent = timing ? timing.dateDisplay : '-';

            const currentArrival = getCurrentArrivalInfo();
            document.getElementById('twcc-dsu-exec-arrival-planned').textContent = String(activeNow.arrival || '').trim() || '-';
            document.getElementById('twcc-dsu-exec-arrival-current').textContent = currentArrival.text;

            const arrivalRow = document.getElementById('twcc-dsu-exec-arrival-current-row');
            if (arrivalRow) {
                arrivalRow.style.background = currentArrival.text !== '-' ? '#d9f7d9' : '#eeeeee';
                arrivalRow.style.borderColor = currentArrival.text !== '-' ? '#77b877' : '#aaaaaa';
            }

            updateTimingProgressBar(now, timing ? timing.clickMs : NaN);

            document.getElementById('twcc-dsu-exec-msmode').textContent = timing ? (timing.explicitMs ? 'aus Import' : 'Standard .' + pad(timing.ms, 3)) : '-';
            document.getElementById('twcc-dsu-exec-click').textContent = timing ? `${formatServerTime(timing.clickMs)} (${timing.offset >= 0 ? '+' : ''}${timing.offset} ms)` : '-';
            document.getElementById('twcc-dsu-exec-server').textContent = formatServerTime(now);
            document.getElementById('twcc-dsu-exec-rest').textContent = formatMs(rest);
            const statsEl = document.getElementById('twcc-dsu-timing-stats');
            if (statsEl) statsEl.textContent = getTimingStatsSummary();

            const dbg = document.getElementById('twcc-dsu-exec-debug');
            if (dbg) {
                dbg.textContent =
                    `screen=${getScreen()} try=${getParams().get('try') || '-'}\n` +
                    `confirmButton=${!!findConfirmButton()}\n` +
                    `active.phase=${activeNow.phase}\n` +
                    `active.status=${activeNow.status || '-'}\n` +
                    `stats=${JSON.stringify(getQueueStats())}\n` +
                    `timing=${timing ? JSON.stringify({target: timing.dateDisplay, click: formatServerTime(timing.clickMs), offset: timing.offset, explicitMs: timing.explicitMs}) : '-'}`;
            }
        }

        update();

        if (!PHASE2_STATE.tick) {
            PHASE2_STATE.tick = setInterval(update, 100);
        }

        if (isAutomationEnabled() && isQueueRunning() && !isQueuePaused() && !PHASE2_STATE.armed) {
            const status = document.getElementById('twcc-dsu-exec-status');
            if (status) status.textContent = 'Timer wird vorbereitet';
            setTimeout(armPhase2Timer, 700);
        }
    }


    function markConfirmPageIfActive() {
        const params = getParams();
        if (getScreen() !== 'place' || params.get('try') !== 'confirm') return;

        const active = loadJson(ACTIVE_KEY, null);
        if (!active || active.phase !== 'confirm-opened') return;

        updatePlanItem(active.id, { status: 'confirm_ready' });
        active.phase = 'confirm-ready';
        active.confirmReadyAt = Date.now();
        saveJson(ACTIVE_KEY, active);

        toast('Confirm-Seite bereit für Phase 2');
        log('Confirm-Seite erkannt:', active);
        buildAngriffsplanerPanel(active);
    }

    function init() {
        installHiddenHotkeys();
        installAudioHostGesture();
        startSendTimeWarningWatchdog();
        startAudioEventPoll();
        const navigation = performance.getEntriesByType?.('navigation')?.[0];
        if (navigation?.type === 'reload' && !loadJson(ACTIVE_KEY, null)) {
            localStorage.setItem(AUTOMATION_ENABLED_KEY, '0');
            setQueueRunning(false);
            setQueuePaused(false);
        }
        maybeAutoCloseThisTab();
        addLauncher();

        if (getScreen() === 'overview_villages') {
            setTimeout(() => {
                const map = scanOwnVillages();
                log('Auto-Scan overview_villages:', Object.keys(map).length);
            }, 1200);
        }

        setTimeout(phase1AutoOnPlace, 700);
        setTimeout(markConfirmPageIfActive, 1000);
        setTimeout(() => {
            if (getScreen() === 'place' && getParams().get('try') === 'confirm') {
                const active = loadJson(ACTIVE_KEY, null);
                if (active) buildAngriffsplanerPanel(active);
            } else if (isAutomationEnabled() && isQueueRunning() && !isQueuePaused()) {
                const active = loadJson(ACTIVE_KEY, null);
                if (!active) queueTick('init-continue');
            }
        }, 1400);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
