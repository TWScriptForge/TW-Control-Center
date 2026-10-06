// ==UserScript==
// @name         Fake Generator Local Controlled
// @namespace    https://github.com/Daniel/FakeGenerator
// @version      2.3.9-twcc-automation-toggle
// @description  TWCC-Testversion mit getrennt schaltbarer Versand-Automatik und Auto-Close
// @author       Daniel
// @match        https://*.die-staemme.de/game.php*
// @match        https://*.tribalwars.net/game.php*
// @match        https://*.tribalwars.*/*game.php*
// @grant        none
// ==/UserScript==

(function () {
    // 'use strict' deaktiviert: Das Originalscript setzt globale Variablen (DEBUG, BIG_SERVER usw.).

    const WRAPPER = {
        enabledKey: 'fg_local_wrapper_enabled',
        lockedTabKey: 'fg_local_wrapper_locked_tab',
        tabIdKey: 'fg_local_wrapper_this_tab_id',
        panelId: 'fg-local-control-panel',
        automationKey: 'fg_twcc_send_automation_enabled',
    };

    function getTabId() {
        let id = sessionStorage.getItem(WRAPPER.tabIdKey);
        if (!id) {
            id = 'fg-tab-' + Date.now() + '-' + Math.random().toString(36).slice(2);
            sessionStorage.setItem(WRAPPER.tabIdKey, id);
        }
        return id;
    }

    function isEnabled() {
        return localStorage.getItem(WRAPPER.enabledKey) !== 'false';
    }

    function setEnabled(value) {
        localStorage.setItem(WRAPPER.enabledKey, value ? 'true' : 'false');
    }

    function getLockedTab() {
        return localStorage.getItem(WRAPPER.lockedTabKey) || '';
    }

    function setLockedTab(tabId) {
        if (tabId) localStorage.setItem(WRAPPER.lockedTabKey, tabId);
        else localStorage.removeItem(WRAPPER.lockedTabKey);
    }

    function isThisTabAllowed() {
        const locked = getLockedTab();
        return !locked || locked === getTabId();
    }

    function isSendAutomationEnabled() {
        // Sicherheitsprinzip: Automatik ist standardmäßig AUS und muss bewusst aktiviert werden.
        return localStorage.getItem(WRAPPER.automationKey) === 'true';
    }

    function setSendAutomationEnabled(value) {
        localStorage.setItem(WRAPPER.automationKey, value ? 'true' : 'false');
    }

    function updateSendAutomationButton() {
        const btn = document.getElementById('fgSendAutomationToggle');
        const status = document.getElementById('fgSendAutomationStatus');
        if (!btn) return;
        const enabled = isSendAutomationEnabled();
        btn.textContent = enabled ? '🤖 Automatischer Versand: AN' : '🤖 Automatischer Versand: AUS';
        btn.classList.toggle('btn-confirm-yes', enabled);
        btn.classList.toggle('btn-confirm-no', !enabled);
        if (status) {
            status.textContent = enabled
                ? 'Angriff und Bestätigung werden in den geöffneten Fake-Tabs automatisch ausgelöst; danach wird der Tab geschlossen.'
                : 'Die Angriffstabs werden nur geöffnet. Angriff und Bestätigung bleiben manuell.';
        }
    }

    function runPlaceEnterAutomation() {
        // Läuft nur in geöffneten Angriffs-Tabs (screen=place).
        // Grund: künstliche KeyboardEvents lösen in Browsern oft keinen echten Submit aus.
        // Deshalb wird zuerst Enter simuliert und danach der sichtbare Submit-Button als Enter-Ersatz geklickt.
        const DONE_KEY = 'fg_place_enter_automation_done';
        const STEP_KEY = 'fg_place_enter_automation_step';
        const CLOSE_PENDING_KEY = 'fg_place_enter_automation_close_pending';

        function closeIfSubmitWasDone() {
            const pendingRaw = sessionStorage.getItem(CLOSE_PENDING_KEY);
            if (!pendingRaw) return false;

            let pending = null;
            try {
                pending = JSON.parse(pendingRaw);
            } catch (e) {
                pending = { at: Date.now(), reason: pendingRaw };
            }

            const age = Date.now() - Number(pending.at || 0);

            // Nur frische Marker verwenden, damit kein alter Tab versehentlich schließt.
            if (age > 120000) {
                sessionStorage.removeItem(CLOSE_PENDING_KEY);
                return false;
            }

            console.info('[Fake Generator Local Controlled] Fake-Tab: Submit erledigt, Tab schließt gleich.', pending);

            sessionStorage.removeItem(CLOSE_PENDING_KEY);
            sessionStorage.setItem(DONE_KEY, 'true');

            setTimeout(() => {
                try {
                    window.close();
                } catch (e) {
                    console.warn('[Fake Generator Local Controlled] window.close nicht erlaubt:', e);
                }
            }, 1800);

            return true;
        }

        // Nach dem Bestätigen lädt der Tab neu. Auf dieser neuen Seite schließen wir den Tab.
        if (closeIfSubmitWasDone()) return;

        function isVisible(el) {
            if (!el) return false;
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
        }

        function findButton(selectors) {
            for (const selector of selectors) {
                const found = Array.from(document.querySelectorAll(selector)).find(isVisible);
                if (found) return found;
            }
            return null;
        }

        function fireEnterOn(el) {
            const target = el || document.activeElement || document.body || document;
            try { target.focus && target.focus(); } catch (e) {}
            ['keydown', 'keypress', 'keyup'].forEach((type) => {
                target.dispatchEvent(new KeyboardEvent(type, {
                    key: 'Enter',
                    code: 'Enter',
                    keyCode: 13,
                    which: 13,
                    bubbles: true,
                    cancelable: true,
                }));
            });
        }

        function clickLikeEnter(el) {
            if (!el) return false;
            fireEnterOn(el);
            setTimeout(() => el.click(), 80);
            return true;
        }

        function run() {
            if (sessionStorage.getItem(DONE_KEY) === 'true') return;

            const confirmButton = findButton([
                '#troop_confirm_submit',
                'input[name="submit"]',
                'button[name="submit"]',
                'input[type="submit"][value*="OK"]',
                'input[type="submit"][value*="Bestätigen"]',
                'input[type="submit"][value*="Confirm"]'
            ]);

            if (confirmButton) {
                sessionStorage.setItem(CLOSE_PENDING_KEY, JSON.stringify({
                    at: Date.now(),
                    reason: 'confirm-submit',
                    href: location.href
                }));
                sessionStorage.setItem(DONE_KEY, 'true');
                console.info('[Fake Generator Local Controlled] Angriffs-Tab: 2. Enter/Bestätigen ausgelöst. Close-Marker gesetzt.');
                clickLikeEnter(confirmButton);

                // Fallback: Falls kein Seitenwechsel passiert, nicht sofort schließen.
                // Der normale Close passiert nach dem Reload über CLOSE_PENDING_KEY.
                return;
            }

            if (sessionStorage.getItem(STEP_KEY) !== 'attack_clicked') {
                const attackButton = findButton([
                    '#target_attack',
                    'input[name="attack"]',
                    'button[name="attack"]',
                    'input[type="submit"][value*="Angriff"]',
                    'input[type="submit"][value*="Attack"]'
                ]);

                if (attackButton) {
                    sessionStorage.setItem(STEP_KEY, 'attack_clicked');
                    console.info('[Fake Generator Local Controlled] Angriffs-Tab: 1. Enter/Angriff ausgelöst.');
                    clickLikeEnter(attackButton);
                    return;
                }
            }

            // Falls Buttons etwas später gerendert werden.
            setTimeout(run, 500);
        }

        setTimeout(run, 1200);
    }

    function addPanel() {
        if (document.getElementById(WRAPPER.panelId)) return;

        const panel = document.createElement('div');
        panel.id = WRAPPER.panelId;
        panel.style.cssText = [
            'position:fixed',
            'right:10px',
            'bottom:10px',
            'z-index:999999',
            'background:#f4e4bc',
            'border:2px solid #7d510f',
            'border-radius:6px',
            'padding:8px',
            'font:12px Arial,sans-serif',
            'color:#321',
            'box-shadow:0 2px 8px rgba(0,0,0,.25)',
            'min-width:205px'
        ].join(';');

        panel.innerHTML = `
            <div style="font-weight:bold;margin-bottom:6px;">Fake Generator</div>
            <button id="fg-toggle" style="margin:2px;padding:3px 6px;"></button>
            <button id="fg-lock" style="margin:2px;padding:3px 6px;"></button>
            <button id="fg-unlock" style="margin:2px;padding:3px 6px;">Tab entsperren</button>
            <div id="fg-status" style="margin-top:6px;font-size:11px;"></div>
        `;

        document.body.appendChild(panel);

        const toggle = document.getElementById('fg-toggle');
        const lock = document.getElementById('fg-lock');
        const unlock = document.getElementById('fg-unlock');
        const status = document.getElementById('fg-status');

        function render() {
            const enabled = isEnabled();
            const allowed = isThisTabAllowed();
            const locked = getLockedTab();
            toggle.textContent = enabled ? 'Deaktivieren' : 'Aktivieren';
            lock.textContent = locked === getTabId() ? 'Auf diesem Tab gesperrt' : 'Auf diesen Tab sperren';
            status.textContent = `${enabled ? 'Aktiv' : 'Aus'} · ${allowed ? 'Tab erlaubt' : 'Anderer Tab gesperrt'}`;
        }

        toggle.addEventListener('click', function () {
            setEnabled(!isEnabled());
            location.reload();
        });

        lock.addEventListener('click', function () {
            setLockedTab(getTabId());
            location.reload();
        });

        unlock.addEventListener('click', function () {
            setLockedTab('');
            location.reload();
        });

        render();
    }

    function waitForBody() {
        if (document.body) addPanel();
        else setTimeout(waitForBody, 50);
    }

    waitForBody();

    const fgParams = new URLSearchParams(window.location.search);
    const fgScreen = fgParams.get('screen');
    const fgMode = fgParams.get('mode');

    if (!isEnabled()) {
        console.info('[Fake Generator Local Controlled] Script deaktiviert.');
        return;
    }

    // Auf den geöffneten Angriffs-Tabs soll nur die Enter-Automatik laufen.
    // Die Tab-Sperre wird hier bewusst ignoriert, damit es auf allen neu geöffneten Tabs läuft.
    if (fgScreen === 'place') {
        console.info('[Fake Generator Local Controlled] Angriffs-Tab erkannt: Originalscript wird hier nicht gestartet.');
        if (isSendAutomationEnabled()) {
            console.info('[Fake Generator Local Controlled] Automatischer Versand ist AN.');
            runPlaceEnterAutomation();
        } else {
            console.info('[Fake Generator Local Controlled] Automatischer Versand ist AUS – Tab bleibt zur manuellen Bestätigung offen.');
        }
        return;
    }

    if (!isThisTabAllowed()) {
        console.info('[Fake Generator Local Controlled] Script läuft nicht, weil ein anderer Tab gesperrt ist.');
        return;
    }

    // WICHTIG: Der Fake Generator darf nur auf der Übersichts-/Berechnungsseite starten.
    // Auf anderen Seiten außer overview_villages soll der Generator ebenfalls nicht starten.
    // Die interne Weiterleitung des Originalscripts bleibt für overview_villages ohne combined erhalten.
    if (fgScreen && fgScreen !== 'overview_villages') {
        console.info('[Fake Generator Local Controlled] Keine Generator-Seite: Originalscript gestoppt.');
        return;
    }

    /*
* Script Name: Fake Generator
* Version: v2.3.7
* Last Updated: 2026-02-23
* Author: SaveBank
* Author Contact: Discord: savebank
* Contributor: RedAlert
* Approved: Yes
* Approved Date: 06.01.2024
* Mod: RedAlert
*/

/*
    NAME: Tribal Wars Scripts Library
    VERSION: 1.1.8 (beta version)
    LAST UPDATED AT: 2024-05-15
    AUTHOR: RedAlert (redalert_tw)
    AUTHOR URL: https://twscripts.dev/
    CONTRIBUTORS: Shinko to Kuma; Sass, SaveBankDev, DSsecundum, suilenroc
    HELP: https://github.com/RedAlertTW/Tribal-Wars-Scripts-SDK
    STATUS: Work in progress. Not finished 100%.

    This software is provided 'as-is', without any express or implied warranty.
    In no event will the author/s be held liable for any damages arising from the use of this software.
    It is allowed to clone, rehost, re-distribute and all other forms of copying this code without permission from the author/s, for as long as it is not used on commercial products.
    This notice may not be removed or altered from any source distribution.
 */

var scriptUrl = window.scriptUrl = ((document.currentScript && document.currentScript.src) ? document.currentScript.src : window.location.href);

window.twSDK = {
    // variables
    scriptData: {},
    translations: {},
    allowedMarkets: [],
    allowedScreens: [],
    allowedModes: [],
    enableCountApi: true,
    isDebug: false,
    isMobile: jQuery('#mobileHeader').length > 0,
    delayBetweenRequests: 200,
    // helper variables
    market: game_data.market,
    units: game_data.units,
    village: game_data.village,
    buildings: game_data.village.buildings,
    sitterId: game_data.player.sitter > 0 ? `&t=${game_data.player.id}` : '',
    coordsRegex: /\d{1,3}\|\d{1,3}/g,
    dateTimeMatch:
        /(?:[A-Z][a-z]{2}\s+\d{1,2},\s*\d{0,4}\s+|today\s+at\s+|tomorrow\s+at\s+)\d{1,2}:\d{2}:\d{2}:?\.?\d{0,3}/,
    worldInfoInterface: '/interface.php?func=get_config',
    unitInfoInterface: '/interface.php?func=get_unit_info',
    buildingInfoInterface: '/interface.php?func=get_building_info',
    worldDataVillages: '/map/village.txt',
    worldDataPlayers: '/map/player.txt',
    worldDataTribes: '/map/ally.txt',
    worldDataConquests: '/map/conquer_extended.txt',
    // game constants
    // https://help.tribalwars.net/wiki/Points
    buildingPoints: {
        main: [
            10, 2, 2, 3, 4, 4, 5, 6, 7, 9, 10, 12, 15, 18, 21, 26, 31, 37, 44,
            53, 64, 77, 92, 110, 133, 159, 191, 229, 274, 330,
        ],
        barracks: [
            16, 3, 4, 5, 5, 7, 8, 9, 12, 14, 16, 20, 24, 28, 34, 42, 49, 59, 71,
            85, 102, 123, 147, 177, 212,
        ],
        stable: [
            20, 4, 5, 6, 6, 9, 10, 12, 14, 17, 21, 25, 29, 36, 43, 51, 62, 74,
            88, 107,
        ],
        garage: [24, 5, 6, 6, 9, 10, 12, 14, 17, 21, 25, 29, 36, 43, 51],
        chuch: [10, 2, 2],
        church_f: [10],
        watchtower: [
            42, 8, 10, 13, 14, 18, 20, 25, 31, 36, 43, 52, 62, 75, 90, 108, 130,
            155, 186, 224,
        ],
        snob: [512],
        smith: [
            19, 4, 4, 6, 6, 8, 10, 11, 14, 16, 20, 23, 28, 34, 41, 49, 58, 71,
            84, 101,
        ],
        place: [0],
        statue: [24],
        market: [
            10, 2, 2, 3, 4, 4, 5, 6, 7, 9, 10, 12, 15, 18, 21, 26, 31, 37, 44,
            53, 64, 77, 92, 110, 133,
        ],
        wood: [
            6, 1, 2, 1, 2, 3, 3, 3, 5, 5, 6, 8, 8, 11, 13, 15, 19, 22, 27, 32,
            38, 46, 55, 66, 80, 95, 115, 137, 165, 198,
        ],
        stone: [
            6, 1, 2, 1, 2, 3, 3, 3, 5, 5, 6, 8, 8, 11, 13, 15, 19, 22, 27, 32,
            38, 46, 55, 66, 80, 95, 115, 137, 165, 198,
        ],
        iron: [
            6, 1, 2, 1, 2, 3, 3, 3, 5, 5, 6, 8, 8, 11, 13, 15, 19, 22, 27, 32,
            38, 46, 55, 66, 80, 95, 115, 137, 165, 198,
        ],
        farm: [
            5, 1, 1, 2, 1, 2, 3, 3, 3, 5, 5, 6, 8, 8, 11, 13, 15, 19, 22, 27,
            32, 38, 46, 55, 66, 80, 95, 115, 137, 165,
        ],
        storage: [
            6, 1, 2, 1, 2, 3, 3, 3, 5, 5, 6, 8, 8, 11, 13, 15, 19, 22, 27, 32,
            38, 46, 55, 66, 80, 95, 115, 137, 165, 198,
        ],
        hide: [5, 1, 1, 2, 1, 2, 3, 3, 3, 5],
        wall: [
            8, 2, 2, 2, 3, 3, 4, 5, 5, 7, 9, 9, 12, 15, 17, 20, 25, 29, 36, 43,
        ],
    },
    unitsFarmSpace: {
        spear: 1,
        sword: 1,
        axe: 1,
        archer: 1,
        spy: 2,
        light: 4,
        marcher: 5,
        heavy: 6,
        ram: 5,
        catapult: 8,
        knight: 10,
        snob: 100,
    },
    // https://help.tribalwars.net/wiki/Timber_camp
    // https://help.tribalwars.net/wiki/Clay_pit
    // https://help.tribalwars.net/wiki/Iron_mine
    resPerHour: {
        0: 2,
        1: 30,
        2: 35,
        3: 41,
        4: 47,
        5: 55,
        6: 64,
        7: 74,
        8: 86,
        9: 100,
        10: 117,
        11: 136,
        12: 158,
        13: 184,
        14: 214,
        15: 249,
        16: 289,
        17: 337,
        18: 391,
        19: 455,
        20: 530,
        21: 616,
        22: 717,
        23: 833,
        24: 969,
        25: 1127,
        26: 1311,
        27: 1525,
        28: 1774,
        29: 2063,
        30: 2400,
    },
    watchtowerLevels: [
        1.1, 1.3, 1.5, 1.7, 2, 2.3, 2.6, 3, 3.4, 3.9, 4.4, 5.1, 5.8, 6.7, 7.6,
        8.7, 10, 11.5, 13.1, 15,
    ],

    // internal methods
    _initDebug: function () {
        const scriptInfo = this.scriptInfo();
        console.debug(`${scriptInfo} It works 🚀!`);
        console.debug(`${scriptInfo} HELP:`, this.scriptData.helpLink);
        if (this.isDebug) {
            console.debug(`${scriptInfo} Market:`, game_data.market);
            console.debug(`${scriptInfo} World:`, game_data.world);
            console.debug(`${scriptInfo} Screen:`, game_data.screen);
            console.debug(
                `${scriptInfo} Game Version:`,
                game_data.majorVersion
            );
            console.debug(`${scriptInfo} Game Build:`, game_data.version);
            console.debug(`${scriptInfo} Locale:`, game_data.locale);
            console.debug(
                `${scriptInfo} PA:`,
                game_data.features.Premium.active
            );
            console.debug(
                `${scriptInfo} LA:`,
                game_data.features.FarmAssistent.active
            );
            console.debug(
                `${scriptInfo} AM:`,
                game_data.features.AccountManager.active
            );
        }
    },

    // public methods
    addGlobalStyle: function () {
        return `
            /* Table Styling */
            .ra-table-container { overflow-y: auto; overflow-x: hidden; height: auto; max-height: 400px; }
            .ra-table th { font-size: 14px; }
            .ra-table th label { margin: 0; padding: 0; }
            .ra-table th,
            .ra-table td { padding: 5px; text-align: center; }
            .ra-table td a { word-break: break-all; }
            .ra-table a:focus { color: blue; }
            .ra-table a.btn:focus { color: #fff; }
            .ra-table tr:nth-of-type(2n) td { background-color: #f0e2be }
            .ra-table tr:nth-of-type(2n+1) td { background-color: #fff5da; }

            .ra-table-v2 th,
            .ra-table-v2 td { text-align: left; }

            .ra-table-v3 { border: 2px solid #bd9c5a; }
            .ra-table-v3 th,
            .ra-table-v3 td { border-collapse: separate; border: 1px solid #bd9c5a; text-align: left; }

            /* Inputs */
            .ra-textarea { width: 100%; height: 80px; resize: none; }

            /* Popup */
            .ra-popup-content { width: 360px; }
            .ra-popup-content * { box-sizing: border-box; }
            .ra-popup-content input[type="text"] { padding: 3px; width: 100%; }
            .ra-popup-content .btn-confirm-yes { padding: 3px !important; }
            .ra-popup-content label { display: block; margin-bottom: 5px; font-weight: 600; }
            .ra-popup-content > div { margin-bottom: 15px; }
            .ra-popup-content > div:last-child { margin-bottom: 0 !important; }
            .ra-popup-content textarea { width: 100%; height: 100px; resize: none; }

            /* Elements */
            .ra-details { display: block; margin-bottom: 8px; border: 1px solid #603000; padding: 8px; border-radius: 4px; }
            .ra-details summary { font-weight: 600; cursor: pointer; }
            .ra-details p { margin: 10px 0 0 0; padding: 0; }

            /* Helpers */
            .ra-pa5 { padding: 5px !important; }
            .ra-mt15 { margin-top: 15px !important; }
            .ra-mb10 { margin-bottom: 10px !important; }
            .ra-mb15 { margin-bottom: 15px !important; }
            .ra-tal { text-align: left !important; }
            .ra-tac { text-align: center !important; }
            .ra-tar { text-align: right !important; }

            /* RESPONSIVE */
            @media (max-width: 480px) {
                .ra-fixed-widget {
                    position: relative !important;
                    top: 0;
                    left: 0;
                    display: block;
                    width: auto;
                    height: auto;
                    z-index: 1;
                }

                .ra-box-widget {
                    position: relative;
                    display: block;
                    box-sizing: border-box;
                    width: 97%;
                    height: auto;
                    margin: 10px auto;
                }

                .ra-table {
                    border-collapse: collapse !important;
                }

                .custom-close-button { display: none; }
                .ra-fixed-widget h3 { margin-bottom: 15px; }
                .ra-popup-content { width: 100%; }
            }
        `;
    },
    arraysIntersection: function () {
        var result = [];
        var lists;

        if (arguments.length === 1) {
            lists = arguments[0];
        } else {
            lists = arguments;
        }

        for (var i = 0; i < lists.length; i++) {
            var currentList = lists[i];
            for (var y = 0; y < currentList.length; y++) {
                var currentValue = currentList[y];
                if (result.indexOf(currentValue) === -1) {
                    var existsInAll = true;
                    for (var x = 0; x < lists.length; x++) {
                        if (lists[x].indexOf(currentValue) === -1) {
                            existsInAll = false;
                            break;
                        }
                    }
                    if (existsInAll) {
                        result.push(currentValue);
                    }
                }
            }
        }
        return result;
    },
    buildUnitsPicker: function (
        selectedUnits = [],
        unitsToIgnore,
        type = 'checkbox'
    ) {
        let unitsTable = ``;

        let thUnits = ``;
        let tableRow = ``;

        game_data.units.forEach((unit) => {
            if (!unitsToIgnore.includes(unit)) {
                let checked = '';
                if (selectedUnits.includes(unit)) {
                    checked = `checked`;
                }

                thUnits += `
                    <th class="ra-tac">
                        <label for="unit_${unit}">
                            <img src="/graphic/unit/unit_${unit}.png">
                        </label>
                    </th>
                `;

                tableRow += `
                    <td class="ra-tac">
                        <input name="ra_chosen_units" type="${type}" ${checked} id="unit_${unit}" class="ra-unit-selector" value="${unit}" />
                    </td>
                `;
            }
        });

        unitsTable = `
            <table class="ra-table ra-table-v2" width="100%" id="raUnitSelector">
                <thead>
                    <tr>
                        ${thUnits}
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        ${tableRow}
                    </tr>
                </tbody>
            </table>
        `;

        return unitsTable;
    },
    calculateCoinsNeededForNthNoble: function (noble) {
        return (noble * noble + noble) / 2;
    },
    calculateDistanceFromCurrentVillage: function (coord) {
        const x1 = game_data.village.x;
        const y1 = game_data.village.y;
        const [x2, y2] = coord.split('|');
        const deltaX = Math.abs(x1 - x2);
        const deltaY = Math.abs(y1 - y2);
        return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    },
    calculateDistance: function (from, to) {
        const [x1, y1] = from.split('|');
        const [x2, y2] = to.split('|');
        const deltaX = Math.abs(x1 - x2);
        const deltaY = Math.abs(y1 - y2);
        return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    },
    calculatePercentages: function (amount, total) {
        if (amount === undefined) amount = 0;
        return parseFloat((amount / total) * 100).toFixed(2);
    },
    calculateTimesByDistance: async function (distance) {
        const _self = this;

        const times = [];
        const travelTimes = [];

        const unitInfo = await _self.getWorldUnitInfo();
        const worldConfig = await _self.getWorldConfig();

        for (let [key, value] of Object.entries(unitInfo.config)) {
            times.push(value.speed);
        }

        const { speed, unit_speed } = worldConfig.config;

        times.forEach((time) => {
            let travelTime = Math.round(
                (distance * time * 60) / speed / unit_speed
            );
            travelTime = _self.secondsToHms(travelTime);
            travelTimes.push(travelTime);
        });

        return travelTimes;
    },
    checkValidLocation: function (type) {
        switch (type) {
            case 'screen':
                return this.allowedScreens.includes(
                    this.getParameterByName('screen')
                );
            case 'mode':
                return this.allowedModes.includes(
                    this.getParameterByName('mode')
                );
            default:
                return false;
        }
    },
    checkValidMarket: function () {
        if (this.market === 'yy') return true;
        return this.allowedMarkets.includes(this.market);
    },
    cleanString: function (string) {
        try {
            return decodeURIComponent(string).replace(/\+/g, ' ');
        } catch (error) {
            console.error(error, string);
            return string;
        }
    },
    copyToClipboard: function (string) {
        navigator.clipboard.writeText(string);
    },
    createUUID: function () {
        return crypto.randomUUID();
    },
    csvToArray: function (strData, strDelimiter = ',') {
        var objPattern = new RegExp(
            '(\\' +
                strDelimiter +
                '|\\r?\\n|\\r|^)' +
                '(?:"([^"]*(?:""[^"]*)*)"|' +
                '([^"\\' +
                strDelimiter +
                '\\r\\n]*))',
            'gi'
        );
        var arrData = [[]];
        var arrMatches = null;
        while ((arrMatches = objPattern.exec(strData))) {
            var strMatchedDelimiter = arrMatches[1];
            if (
                strMatchedDelimiter.length &&
                strMatchedDelimiter !== strDelimiter
            ) {
                arrData.push([]);
            }
            var strMatchedValue;

            if (arrMatches[2]) {
                strMatchedValue = arrMatches[2].replace(
                    new RegExp('""', 'g'),
                    '"'
                );
            } else {
                strMatchedValue = arrMatches[3];
            }
            arrData[arrData.length - 1].push(strMatchedValue);
        }
        return arrData;
    },
    decryptString: function (str) {
        const alphabet =
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 !"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~';
        let decryptedStr = '';

        for (let i = 0; i < str.length; i++) {
            const char = str[i];
            const index = alphabet.indexOf(char);

            if (index === -1) {
                // Character is not in the alphabet, leave it as-is
                decryptedStr += char;
            } else {
                // Substitue the character with its corresponding shifted character
                const shiftedIndex = (index - 3 + 94) % 94;
                decryptedStr += alphabet[shiftedIndex];
            }
        }

        return decryptedStr;
    },
    encryptString: function (str) {
        const alphabet =
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 !"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~';
        let encryptedStr = '';

        for (let i = 0; i < str.length; i++) {
            const char = str[i];
            const index = alphabet.indexOf(char);

            if (index === -1) {
                // Character is not in the alphabet, leave it as-is
                encryptedStr += char;
            } else {
                // Substitue the character with its corresponding shifted character
                const shiftedIndex = (index + 3) % 94;
                encryptedStr += alphabet[shiftedIndex];
            }
        }

        return encryptedStr;
    },
    filterVillagesByPlayerIds: function (playerIds, villages) {
        const playerVillages = [];
        villages.forEach((village) => {
            if (playerIds.includes(parseInt(village[4]))) {
                const coordinate = village[2] + '|' + village[3];
                playerVillages.push(coordinate);
            }
        });
        return playerVillages;
    },
    formatAsNumber: function (number) {
        return parseInt(number).toLocaleString('de');
    },
    formatDateTime: function (dateTime) {
        dateTime = new Date(dateTime);
        return (
            this.zeroPad(dateTime.getDate(), 2) +
            '/' +
            this.zeroPad(dateTime.getMonth() + 1, 2) +
            '/' +
            dateTime.getFullYear() +
            ' ' +
            this.zeroPad(dateTime.getHours(), 2) +
            ':' +
            this.zeroPad(dateTime.getMinutes(), 2) +
            ':' +
            this.zeroPad(dateTime.getSeconds(), 2)
        );
    },
    frequencyCounter: function (array) {
        return array.reduce(function (acc, curr) {
            if (typeof acc[curr] == 'undefined') {
                acc[curr] = 1;
            } else {
                acc[curr] += 1;
            }
            return acc;
        }, {});
    },
    getAll: function (
        urls, // array of URLs
        onLoad, // called when any URL is loaded, params (index, data)
        onDone, // called when all URLs successfully loaded, no params
        onError // called when a URL load fails or if onLoad throws an exception, params (error)
    ) {
        var numDone = 0;
        var lastRequestTime = 0;
        var minWaitTime = this.delayBetweenRequests; // ms between requests
        loadNext();
        function loadNext() {
            if (numDone == urls.length) {
                onDone();
                return;
            }

            let now = Date.now();
            let timeElapsed = now - lastRequestTime;
            if (timeElapsed < minWaitTime) {
                let timeRemaining = minWaitTime - timeElapsed;
                setTimeout(loadNext, timeRemaining);
                return;
            }
            lastRequestTime = now;
            jQuery
                .get(urls[numDone])
                .done((data) => {
                    try {
                        onLoad(numDone, data);
                        ++numDone;
                        loadNext();
                    } catch (e) {
                        onError(e);
                    }
                })
                .fail((xhr) => {
                    onError(xhr);
                });
        }
    },
    getBuildingsInfo: async function () {
        const TIME_INTERVAL = 60 * 60 * 1000 * 24 * 365; // fetch config only once since they don't change
        const LAST_UPDATED_TIME =
            localStorage.getItem('buildings_info_last_updated') ?? 0;
        let buildingsInfo = [];

        if (LAST_UPDATED_TIME !== null) {
            if (Date.parse(new Date()) >= LAST_UPDATED_TIME + TIME_INTERVAL) {
                const response = await jQuery.ajax({
                    url: this.buildingInfoInterface,
                });
                buildingsInfo = this.xml2json(jQuery(response));
                localStorage.setItem(
                    'buildings_info',
                    JSON.stringify(buildingsInfo)
                );
                localStorage.setItem(
                    'buildings_info_last_updated',
                    Date.parse(new Date())
                );
            } else {
                buildingsInfo = JSON.parse(
                    localStorage.getItem('buildings_info')
                );
            }
        } else {
            const response = await jQuery.ajax({
                url: this.buildingInfoInterface,
            });
            buildingsInfo = this.xml2json(jQuery(response));
            localStorage.setItem('buildings_info', JSON.stringify(unitInfo));
            localStorage.setItem(
                'buildings_info_last_updated',
                Date.parse(new Date())
            );
        }

        return buildingsInfo;
    },
    getContinentByCoord: function (coord) {
        let [x, y] = Array.from(coord.split('|')).map((e) => parseInt(e));
        for (let i = 0; i < 1000; i += 100) {
            //x axes
            for (let j = 0; j < 1000; j += 100) {
                //y axes
                if (i >= x && x < i + 100 && j >= y && y < j + 100) {
                    let nr_continent =
                        parseInt(y / 100) + '' + parseInt(x / 100);
                    return nr_continent;
                }
            }
        }
    },
    getContinentsFromCoordinates: function (coordinates) {
        let continents = [];

        coordinates.forEach((coord) => {
            const continent = twSDK.getContinentByCoord(coord);
            continents.push(continent);
        });

        return [...new Set(continents)];
    },
    getCoordFromString: function (string) {
        if (!string) return [];
        return string.match(this.coordsRegex)[0];
    },
    getDestinationCoordinates: function (config, tribes, players, villages) {
        const {
            playersInput,
            tribesInput,
            continents,
            minCoord,
            maxCoord,
            distCenter,
            center,
            excludedPlayers,
            enable20To1Limit,
            minPoints,
            maxPoints,
            selectiveRandomConfig,
        } = config;

        // get target coordinates
        const chosenPlayers = playersInput.split(',');
        const chosenTribes = tribesInput.split(',');

        const chosenPlayerIds = twSDK.getEntityIdsByArrayIndex(
            chosenPlayers,
            players,
            1
        );
        const chosenTribeIds = twSDK.getEntityIdsByArrayIndex(
            chosenTribes,
            tribes,
            2
        );

        const tribePlayers = twSDK.getTribeMembersById(chosenTribeIds, players);

        const mergedPlayersList = [...tribePlayers, ...chosenPlayerIds];
        let uniquePlayersList = [...new Set(mergedPlayersList)];

        const chosenExcludedPlayers = excludedPlayers.split(',');
        if (chosenExcludedPlayers.length > 0) {
            const excludedPlayersIds = twSDK.getEntityIdsByArrayIndex(
                chosenExcludedPlayers,
                players,
                1
            );
            excludedPlayersIds.forEach((item) => {
                uniquePlayersList = uniquePlayersList.filter(
                    (player) => player !== item
                );
            });
        }

        // filter by 20:1 rule
        if (enable20To1Limit) {
            let uniquePlayersListArray = [];
            uniquePlayersList.forEach((playerId) => {
                players.forEach((player) => {
                    if (parseInt(player[0]) === playerId) {
                        uniquePlayersListArray.push(player);
                    }
                });
            });

            const playersNotBiggerThen20Times = uniquePlayersListArray.filter(
                (player) => {
                    return (
                        parseInt(player[4]) <=
                        parseInt(game_data.player.points) * 20
                    );
                }
            );

            uniquePlayersList = playersNotBiggerThen20Times.map((player) =>
                parseInt(player[0])
            );
        }

        let coordinatesArray = twSDK.filterVillagesByPlayerIds(
            uniquePlayersList,
            villages
        );

        // filter by min and max village points
        if (minPoints || maxPoints) {
            let filteredCoordinatesArray = [];

            coordinatesArray.forEach((coordinate) => {
                villages.forEach((village) => {
                    const villageCoordinate = village[2] + '|' + village[3];
                    if (villageCoordinate === coordinate) {
                        filteredCoordinatesArray.push(village);
                    }
                });
            });

            filteredCoordinatesArray = filteredCoordinatesArray.filter(
                (village) => {
                    const villagePoints = parseInt(village[5]);
                    const minPointsNumber = parseInt(minPoints) || 26;
                    const maxPointsNumber = parseInt(maxPoints) || 12124;
                    if (
                        villagePoints > minPointsNumber &&
                        villagePoints < maxPointsNumber
                    ) {
                        return village;
                    }
                }
            );

            coordinatesArray = filteredCoordinatesArray.map(
                (village) => village[2] + '|' + village[3]
            );
        }

        // filter coordinates by continent
        if (continents.length) {
            let chosenContinentsArray = continents.split(',');
            chosenContinentsArray = chosenContinentsArray.map((item) =>
                item.trim()
            );

            const availableContinents =
                twSDK.getContinentsFromCoordinates(coordinatesArray);
            const filteredVillagesByContinent =
                twSDK.getFilteredVillagesByContinent(
                    coordinatesArray,
                    availableContinents
                );

            const isUserInputValid = chosenContinentsArray.every((item) =>
                availableContinents.includes(item)
            );

            if (isUserInputValid) {
                coordinatesArray = chosenContinentsArray
                    .map((continent) => {
                        if (continent.length && $.isNumeric(continent)) {
                            return [...filteredVillagesByContinent[continent]];
                        } else {
                            return;
                        }
                    })
                    .flat();
            } else {
                return [];
            }
        }

        // filter coordinates by a bounding box of coordinates
        if (minCoord.length && maxCoord.length) {
            const raMinCoordCheck = minCoord.match(twSDK.coordsRegex);
            const raMaxCoordCheck = maxCoord.match(twSDK.coordsRegex);

            if (raMinCoordCheck !== null && raMaxCoordCheck !== null) {
                const [minX, minY] = raMinCoordCheck[0].split('|');
                const [maxX, maxY] = raMaxCoordCheck[0].split('|');

                coordinatesArray = [...coordinatesArray].filter(
                    (coordinate) => {
                        const [x, y] = coordinate.split('|');
                        if (minX <= x && x <= maxX && minY <= y && y <= maxY) {
                            return coordinate;
                        }
                    }
                );
            } else {
                return [];
            }
        }

        // filter by radius
        if (distCenter.length && center.length) {
            if (!$.isNumeric(distCenter)) distCenter = 0;
            const raCenterCheck = center.match(twSDK.coordsRegex);

            if (distCenter !== 0 && raCenterCheck !== null) {
                let coordinatesArrayWithDistance = [];
                coordinatesArray.forEach((coordinate) => {
                    const distance = twSDK.calculateDistance(
                        raCenterCheck[0],
                        coordinate
                    );
                    coordinatesArrayWithDistance.push({
                        coord: coordinate,
                        distance: distance,
                    });
                });

                coordinatesArrayWithDistance =
                    coordinatesArrayWithDistance.filter((item) => {
                        return (
                            parseFloat(item.distance) <= parseFloat(distCenter)
                        );
                    });

                coordinatesArray = coordinatesArrayWithDistance.map(
                    (item) => item.coord
                );
            } else {
                return [];
            }
        }

        // apply multiplier
        if (selectiveRandomConfig) {
            const selectiveRandomizer = selectiveRandomConfig.split(';');

            const makeRepeated = (arr, repeats) =>
                Array.from({ length: repeats }, () => arr).flat();
            const multipliedCoordinatesArray = [];

            selectiveRandomizer.forEach((item) => {
                const [playerName, distribution] = item.split(':');
                if (distribution > 1) {
                    players.forEach((player) => {
                        if (
                            twSDK.cleanString(player[1]) ===
                            twSDK.cleanString(playerName)
                        ) {
                            let playerVillages =
                                twSDK.filterVillagesByPlayerIds(
                                    [parseInt(player[0])],
                                    villages
                                );
                            const flattenedPlayerVillagesArray = makeRepeated(
                                playerVillages,
                                distribution
                            );
                            multipliedCoordinatesArray.push(
                                flattenedPlayerVillagesArray
                            );
                        }
                    });
                }
            });

            coordinatesArray.push(...multipliedCoordinatesArray.flat());
        }

        return coordinatesArray;
    },
    getEntityIdsByArrayIndex: function (chosenItems, items, index) {
        const itemIds = [];
        chosenItems.forEach((chosenItem) => {
            items.forEach((item) => {
                if (
                    twSDK.cleanString(item[index]) ===
                    twSDK.cleanString(chosenItem)
                ) {
                    return itemIds.push(parseInt(item[0]));
                }
            });
        });
        return itemIds;
    },
    getFilteredVillagesByContinent: function (
        playerVillagesCoords,
        continents
    ) {
        let coords = [...playerVillagesCoords];
        let filteredVillagesByContinent = [];

        coords.forEach((coord) => {
            continents.forEach((continent) => {
                let currentVillageContinent = twSDK.getContinentByCoord(coord);
                if (currentVillageContinent === continent) {
                    filteredVillagesByContinent.push({
                        continent: continent,
                        coords: coord,
                    });
                }
            });
        });

        return twSDK.groupArrayByProperty(
            filteredVillagesByContinent,
            'continent',
            'coords'
        );
    },
    getGameFeatures: function () {
        const { Premium, FarmAssistent, AccountManager } = game_data.features;
        const isPA = Premium.active;
        const isLA = FarmAssistent.active;
        const isAM = AccountManager.active;
        return { isPA, isLA, isAM };
    },
    getKeyByValue: function (object, value) {
        return Object.keys(object).find((key) => object[key] === value);
    },
    getLandingTimeFromArrivesIn: function (arrivesIn) {
        const currentServerTime = twSDK.getServerDateTimeObject();
        const [hours, minutes, seconds] = arrivesIn.split(':');
        const totalSeconds = +hours * 3600 + +minutes * 60 + +seconds;
        const arrivalDateTime = new Date(
            currentServerTime.getTime() + totalSeconds * 1000
        );
        return arrivalDateTime;
    },
    getLastCoordFromString: function (string) {
        if (!string) return [];
        const regex = this.coordsRegex;
        let match;
        let lastMatch;
        while ((match = regex.exec(string)) !== null) {
            lastMatch = match;
        }
        return lastMatch ? lastMatch[0] : [];
    },
    getPagesToFetch: function () {
        let list_pages = [];

        const currentPage = twSDK.getParameterByName('page');
        if (currentPage == '-1') return [];

        if (
            document
                .getElementsByClassName('vis')[1]
                .getElementsByTagName('select').length > 0
        ) {
            Array.from(
                document
                    .getElementsByClassName('vis')[1]
                    .getElementsByTagName('select')[0]
            ).forEach(function (item) {
                list_pages.push(item.value);
            });
            list_pages.pop();
        } else if (
            document.getElementsByClassName('paged-nav-item').length > 0
        ) {
            let nr = 0;
            Array.from(
                document.getElementsByClassName('paged-nav-item')
            ).forEach(function (item) {
                let current = item.href;
                current = current.split('page=')[0] + 'page=' + nr;
                nr++;
                list_pages.push(current);
            });
        } else {
            let current_link = window.location.href;
            list_pages.push(current_link);
        }
        list_pages.shift();

        return list_pages;
    },
    getParameterByName: function (name, url = window.location.href) {
        return new URL(url).searchParams.get(name);
    },
    getRelativeImagePath: function (url) {
        const urlParts = url.split('/');
        return `/${urlParts[5]}/${urlParts[6]}/${urlParts[7]}`;
    },
    getServerDateTimeObject: function () {
        const formattedTime = this.getServerDateTime();
        return new Date(formattedTime);
    },
    getServerDateTime: function () {
        const serverTime = jQuery('#serverTime').text();
        const serverDate = jQuery('#serverDate').text();
        const [day, month, year] = serverDate.split('/');
        const serverTimeFormatted =
            year + '-' + month + '-' + day + ' ' + serverTime;
        return serverTimeFormatted;
    },
    getTimeFromString: function (timeLand) {
        let dateLand = '';
        let serverDate = document
            .getElementById('serverDate')
            .innerText.split('/');

        let TIME_PATTERNS = {
            today: 'today at %s',
            tomorrow: 'tomorrow at %s',
            later: 'on %1 at %2',
        };

        if (window.lang) {
            TIME_PATTERNS = {
                today: window.lang['aea2b0aa9ae1534226518faaefffdaad'],
                tomorrow: window.lang['57d28d1b211fddbb7a499ead5bf23079'],
                later: window.lang['0cb274c906d622fa8ce524bcfbb7552d'],
            };
        }

        let todayPattern = new RegExp(
            TIME_PATTERNS.today.replace('%s', '([\\d+|:]+)')
        ).exec(timeLand);
        let tomorrowPattern = new RegExp(
            TIME_PATTERNS.tomorrow.replace('%s', '([\\d+|:]+)')
        ).exec(timeLand);
        let laterDatePattern = new RegExp(
            TIME_PATTERNS.later
                .replace('%1', '([\\d+|\\.]+)')
                .replace('%2', '([\\d+|:]+)')
        ).exec(timeLand);

        if (todayPattern !== null) {
            // today
            dateLand =
                serverDate[0] +
                '/' +
                serverDate[1] +
                '/' +
                serverDate[2] +
                ' ' +
                timeLand.match(/\d+:\d+:\d+:\d+/)[0];
        } else if (tomorrowPattern !== null) {
            // tomorrow
            let tomorrowDate = new Date(
                serverDate[1] + '/' + serverDate[0] + '/' + serverDate[2]
            );
            tomorrowDate.setDate(tomorrowDate.getDate() + 1);
            dateLand =
                ('0' + tomorrowDate.getDate()).slice(-2) +
                '/' +
                ('0' + (tomorrowDate.getMonth() + 1)).slice(-2) +
                '/' +
                tomorrowDate.getFullYear() +
                ' ' +
                timeLand.match(/\d+:\d+:\d+:\d+/)[0];
        } else {
            // on
            let on = timeLand.match(/\d+.\d+/)[0].split('.');
            dateLand =
                on[0] +
                '/' +
                on[1] +
                '/' +
                serverDate[2] +
                ' ' +
                timeLand.match(/\d+:\d+:\d+:\d+/)[0];
        }

        return dateLand;
    },
    getTravelTimeInSecond: function (distance, unitSpeed) {
        let travelTime = distance * unitSpeed * 60;
        if (travelTime % 1 > 0.5) {
            return (travelTime += 1);
        } else {
            return travelTime;
        }
    },
    getTribeMembersById: function (tribeIds, players) {
        const tribeMemberIds = [];
        players.forEach((player) => {
            if (tribeIds.includes(parseInt(player[2]))) {
                tribeMemberIds.push(parseInt(player[0]));
            }
        });
        return tribeMemberIds;
    },
    getTroop: function (unit) {
        return parseInt(
            document.units[unit].parentNode
                .getElementsByTagName('a')[1]
                .innerHTML.match(/\d+/),
            10
        );
    },
    getVillageBuildings: function () {
        const buildings = game_data.village.buildings;
        const villageBuildings = [];

        for (let [key, value] of Object.entries(buildings)) {
            if (value > 0) {
                villageBuildings.push({
                    building: key,
                    level: value,
                });
            }
        }

        return villageBuildings;
    },
    getWorldConfig: async function () {
        const TIME_INTERVAL = 60 * 60 * 1000 * 24 * 7;
        const LAST_UPDATED_TIME =
            localStorage.getItem('world_config_last_updated') ?? 0;
        let worldConfig = [];

        if (LAST_UPDATED_TIME !== null) {
            if (Date.parse(new Date()) >= LAST_UPDATED_TIME + TIME_INTERVAL) {
                const response = await jQuery.ajax({
                    url: this.worldInfoInterface,
                });
                worldConfig = this.xml2json(jQuery(response));
                localStorage.setItem(
                    'world_config',
                    JSON.stringify(worldConfig)
                );
                localStorage.setItem(
                    'world_config_last_updated',
                    Date.parse(new Date())
                );
            } else {
                worldConfig = JSON.parse(localStorage.getItem('world_config'));
            }
        } else {
            const response = await jQuery.ajax({
                url: this.worldInfoInterface,
            });
            worldConfig = this.xml2json(jQuery(response));
            localStorage.setItem('world_config', JSON.stringify(unitInfo));
            localStorage.setItem(
                'world_config_last_updated',
                Date.parse(new Date())
            );
        }

        return worldConfig;
    },
    getWorldUnitInfo: async function () {
        const TIME_INTERVAL = 60 * 60 * 1000 * 24 * 7;
        const LAST_UPDATED_TIME =
            localStorage.getItem('units_info_last_updated') ?? 0;
        let unitInfo = [];

        if (LAST_UPDATED_TIME !== null) {
            if (Date.parse(new Date()) >= LAST_UPDATED_TIME + TIME_INTERVAL) {
                const response = await jQuery.ajax({
                    url: this.unitInfoInterface,
                });
                unitInfo = this.xml2json(jQuery(response));
                localStorage.setItem('units_info', JSON.stringify(unitInfo));
                localStorage.setItem(
                    'units_info_last_updated',
                    Date.parse(new Date())
                );
            } else {
                unitInfo = JSON.parse(localStorage.getItem('units_info'));
            }
        } else {
            const response = await jQuery.ajax({
                url: this.unitInfoInterface,
            });
            unitInfo = this.xml2json(jQuery(response));
            localStorage.setItem('units_info', JSON.stringify(unitInfo));
            localStorage.setItem(
                'units_info_last_updated',
                Date.parse(new Date())
            );
        }

        return unitInfo;
    },
    groupArrayByProperty: function (array, property, filter) {
        return array.reduce(function (accumulator, object) {
            // get the value of our object(age in our case) to use for group    the array as the array key
            const key = object[property];
            // if the current value is similar to the key(age) don't accumulate the transformed array and leave it empty
            if (!accumulator[key]) {
                accumulator[key] = [];
            }
            // add the value to the array
            accumulator[key].push(object[filter]);
            // return the transformed array
            return accumulator;
            // Also we also set the initial value of reduce() to an empty object
        }, {});
    },
    isArcherWorld: function () {
        return this.units.includes('archer');
    },
    isChurchWorld: function () {
        return 'church' in this.village.buildings;
    },
    isPaladinWorld: function () {
        return this.units.includes('knight');
    },
    isWatchTowerWorld: function () {
        return 'watchtower' in this.village.buildings;
    },
    loadJS: function (url, callback) {
        let scriptTag = document.createElement('script');
        scriptTag.src = url;
        scriptTag.onload = callback;
        scriptTag.onreadystatechange = callback;
        document.body.appendChild(scriptTag);
    },
    redirectTo: function (location) {
        window.location.assign(game_data.link_base_pure + location);
    },
    removeDuplicateObjectsFromArray: function (array, prop) {
        return array.filter((obj, pos, arr) => {
            return arr.map((mapObj) => mapObj[prop]).indexOf(obj[prop]) === pos;
        });
    },
    renderBoxWidget: function (body, id, mainClass, customStyle) {
        const globalStyle = this.addGlobalStyle();

        const content = `
            <div class="${mainClass} ra-box-widget" id="${id}">
                <div class="${mainClass}-header">
                    <h3>${this.tt(this.scriptData.name)}</h3>
                </div>
                <div class="${mainClass}-body">
                    ${body}
                </div>
                <div class="${mainClass}-footer">
                    <small>
                        <strong>
                            ${this.tt(this.scriptData.name)} ${
            this.scriptData.version
        }
                        </strong> -
                        <a href="${
                            this.scriptData.authorUrl
                        }" target="_blank" rel="noreferrer noopener">
                            ${this.scriptData.author}
                        </a> -
                        <a href="${
                            this.scriptData.helpLink
                        }" target="_blank" rel="noreferrer noopener">
                            ${this.tt('Help')}
                        </a>
                    </small>
                </div>
            </div>
            <style>
                .${mainClass} { position: relative; display: block; width: 100%; height: auto; clear: both; margin: 10px 0 15px; border: 1px solid #603000; box-sizing: border-box; background: #f4e4bc; }
                .${mainClass} * { box-sizing: border-box; }
                .${mainClass} > div { padding: 10px; }
                .${mainClass} .btn-confirm-yes { padding: 3px; }
                .${mainClass}-header { display: flex; align-items: center; justify-content: space-between; background-color: #c1a264 !important; background-image: url(/graphic/screen/tableheader_bg3.png); background-repeat: repeat-x; }
                .${mainClass}-header h3 { margin: 0; padding: 0; line-height: 1; }
                .${mainClass}-body p { font-size: 14px; }
                .${mainClass}-body label { display: block; font-weight: 600; margin-bottom: 6px; }

                ${globalStyle}

                /* Custom Style */
                ${customStyle}
            </style>
        `;

        if (jQuery(`#${id}`).length < 1) {
            jQuery('#contentContainer').prepend(content);
            jQuery('#mobileContent').prepend(content);
        } else {
            jQuery(`.${mainClass}-body`).html(body);
        }
    },
    renderFixedWidget: function (
        body,
        id,
        mainClass,
        customStyle,
        width,
        customName = this.scriptData.name
    ) {
        const globalStyle = this.addGlobalStyle();

        const content = `
            <div class="${mainClass} ra-fixed-widget" id="${id}">
                <div class="${mainClass}-header">
                    <h3>${this.tt(customName)}</h3>
                </div>
                <div class="${mainClass}-body">
                    ${body}
                </div>
                <div class="${mainClass}-footer">
                    <small>
                        <strong>
                            ${this.tt(customName)} ${this.scriptData.version}
                        </strong> -
                        <a href="${
                            this.scriptData.authorUrl
                        }" target="_blank" rel="noreferrer noopener">
                            ${this.scriptData.author}
                        </a> -
                        <a href="${
                            this.scriptData.helpLink
                        }" target="_blank" rel="noreferrer noopener">
                            ${this.tt('Help')}
                        </a>
                    </small>
                </div>
                <a class="popup_box_close custom-close-button" href="#">&nbsp;</a>
            </div>
            <style>
                .${mainClass} { position: fixed; top: 10vw; right: 10vw; z-index: 99999; border: 2px solid #7d510f; border-radius: 10px; padding: 10px; width: ${
            width ?? '360px'
        }; overflow-y: auto; padding: 10px; background: #e3d5b3 url('/graphic/index/main_bg.jpg') scroll right top repeat; }
                .${mainClass} * { box-sizing: border-box; }

                ${globalStyle}

                /* Custom Style */
                .custom-close-button { right: 0; top: 0; }
                ${customStyle}
            </style>
        `;

        if (jQuery(`#${id}`).length < 1) {
            if (mobiledevice) {
                jQuery('#content_value').prepend(content);
            } else {
                jQuery('#contentContainer').prepend(content);
                jQuery(`#${id}`).draggable({
                    cancel: '.ra-table, input, textarea, button, select, option',
                });

                jQuery(`#${id} .custom-close-button`).on('click', function (e) {
                    e.preventDefault();
                    jQuery(`#${id}`).remove();
                });
            }
        } else {
            jQuery(`.${mainClass}-body`).html(body);
        }
    },
    scriptInfo: function (scriptData = this.scriptData) {
        return `[${scriptData.name} ${scriptData.version}]`;
    },
    secondsToHms: function (timestamp) {
        const hours = Math.floor(timestamp / 60 / 60);
        const minutes = Math.floor(timestamp / 60) - hours * 60;
        const seconds = timestamp % 60;
        return (
            hours.toString().padStart(2, '0') +
            ':' +
            minutes.toString().padStart(2, '0') +
            ':' +
            seconds.toString().padStart(2, '0')
        );
    },
    setUpdateProgress: function (elementToUpdate, valueToSet) {
        jQuery(elementToUpdate).text(valueToSet);
    },
    sortArrayOfObjectsByKey: function (array, key) {
        return array.sort((a, b) => b[key] - a[key]);
    },
    startProgressBar: function (total) {
        const width = jQuery('#content_value')[0].clientWidth;
        const preloaderContent = `
            <div id="progressbar" class="progress-bar" style="margin-bottom:12px;">
                <span class="count label">0/${total}</span>
                <div id="progress">
                    <span class="count label" style="width: ${width}px;">
                        0/${total}
                    </span>
                </div>
            </div>
        `;

        if (this.isMobile) {
            jQuery('#content_value').eq(0).prepend(preloaderContent);
        } else {
            jQuery('#contentContainer').eq(0).prepend(preloaderContent);
        }
    },
    sumOfArrayItemValues: function (array) {
        return array.reduce((a, b) => a + b, 0);
    },
    timeAgo: function (seconds) {
        var interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + ' Y';

        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + ' M';

        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + ' D';

        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + ' H';

        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + ' m';

        return Math.floor(seconds) + ' s';
    },
    tt: function (string) {
        if (this.translations[game_data.locale] !== undefined) {
            return this.translations[game_data.locale][string];
        } else {
            return this.translations['en_DK'][string];
        }
    },
    updateProgress: function (elementToUpate, itemsLength, index) {
        jQuery(elementToUpate).text(`${index}/${itemsLength}`);
    },
    updateProgressBar: function (index, total) {
        jQuery('#progress').css('width', `${((index + 1) / total) * 100}%`);
        jQuery('.count').text(`${index + 1}/${total}`);
        if (index + 1 == total) {
            jQuery('#progressbar').fadeOut(1000);
        }
    },
    toggleUploadButtonStatus: function (elementToToggle) {
        jQuery(elementToToggle).attr('disabled', (i, v) => !v);
    },
    xml2json: function ($xml) {
        let data = {};
        const _self = this;
        $.each($xml.children(), function (i) {
            let $this = $(this);
            if ($this.children().length > 0) {
                data[$this.prop('tagName')] = _self.xml2json($this);
            } else {
                data[$this.prop('tagName')] = $.trim($this.text());
            }
        });
        return data;
    },
    worldDataAPI: async function (entity) {
        const TIME_INTERVAL = 60 * 60 * 1000; // fetch data every hour
        const LAST_UPDATED_TIME = localStorage.getItem(
            `${entity}_last_updated`
        );

        // check if entity is allowed and can be fetched
        const allowedEntities = ['village', 'player', 'ally', 'conquer'];
        if (!allowedEntities.includes(entity)) {
            throw new Error(`Entity ${entity} does not exist!`);
        }

        // initial world data
        const worldData = {};

        const dbConfig = {
            village: {
                dbName: 'villagesDb',
                dbTable: 'villages',
                key: 'villageId',
                url: twSDK.worldDataVillages,
            },
            player: {
                dbName: 'playersDb',
                dbTable: 'players',
                key: 'playerId',
                url: twSDK.worldDataPlayers,
            },
            ally: {
                dbName: 'tribesDb',
                dbTable: 'tribes',
                key: 'tribeId',
                url: twSDK.worldDataTribes,
            },
            conquer: {
                dbName: 'conquerDb',
                dbTable: 'conquer',
                key: '',
                url: twSDK.worldDataConquests,
            },
        };

        // Helpers: Fetch entity data and save to localStorage
        const fetchDataAndSave = async () => {
            const DATA_URL = dbConfig[entity].url;

            try {
                // fetch data
                const response = await jQuery.ajax(DATA_URL);
                const data = twSDK.csvToArray(response);
                let responseData = [];

                // prepare data to be saved in db
                switch (entity) {
                    case 'village':
                        responseData = data
                            .filter((item) => {
                                if (item[0] != '') {
                                    return item;
                                }
                            })
                            .map((item) => {
                                return {
                                    villageId: parseInt(item[0]),
                                    villageName: twSDK.cleanString(item[1]),
                                    villageX: item[2],
                                    villageY: item[3],
                                    playerId: parseInt(item[4]),
                                    villagePoints: parseInt(item[5]),
                                    villageType: parseInt(item[6]),
                                };
                            });
                        break;
                    case 'player':
                        responseData = data
                            .filter((item) => {
                                if (item[0] != '') {
                                    return item;
                                }
                            })
                            .map((item) => {
                                return {
                                    playerId: parseInt(item[0]),
                                    playerName: twSDK.cleanString(item[1]),
                                    tribeId: parseInt(item[2]),
                                    villages: parseInt(item[3]),
                                    points: parseInt(item[4]),
                                    rank: parseInt(item[5]),
                                };
                            });
                        break;
                    case 'ally':
                        responseData = data
                            .filter((item) => {
                                if (item[0] != '') {
                                    return item;
                                }
                            })
                            .map((item) => {
                                return {
                                    tribeId: parseInt(item[0]),
                                    tribeName: twSDK.cleanString(item[1]),
                                    tribeTag: twSDK.cleanString(item[2]),
                                    players: parseInt(item[3]),
                                    villages: parseInt(item[4]),
                                    points: parseInt(item[5]),
                                    allPoints: parseInt(item[6]),
                                    rank: parseInt(item[7]),
                                };
                            });
                        break;
                    case 'conquer':
                        responseData = data
                            .filter((item) => {
                                if (item[0] != '') {
                                    return item;
                                }
                            })
                            .map((item) => {
                                return {
                                    villageId: parseInt(item[0]),
                                    unixTimestamp: parseInt(item[1]),
                                    newPlayerId: parseInt(item[2]),
                                    newPlayerId: parseInt(item[3]),
                                    oldTribeId: parseInt(item[4]),
                                    newTribeId: parseInt(item[5]),
                                    villagePoints: parseInt(item[6]),
                                };
                            });
                        break;
                    default:
                        return [];
                }

                // save data in db
                saveToIndexedDbStorage(
                    dbConfig[entity].dbName,
                    dbConfig[entity].dbTable,
                    dbConfig[entity].key,
                    responseData
                );

                // update last updated localStorage item
                localStorage.setItem(
                    `${entity}_last_updated`,
                    Date.parse(new Date())
                );

                return responseData;
            } catch (error) {
                throw Error(`Error fetching ${DATA_URL}`);
            }
        };

        // Helpers: Save to IndexedDb storage
        async function saveToIndexedDbStorage(dbName, table, keyId, data) {
            const dbConnect = indexedDB.open(dbName);

            dbConnect.onupgradeneeded = function () {
                const db = dbConnect.result;
                if (keyId.length) {
                    db.createObjectStore(table, {
                        keyPath: keyId,
                    });
                } else {
                    db.createObjectStore(table, {
                        autoIncrement: true,
                    });
                }
            };

            dbConnect.onsuccess = function () {
                const db = dbConnect.result;
                const transaction = db.transaction(table, 'readwrite');
                const store = transaction.objectStore(table);
                store.clear(); // clean store from items before adding new ones

                data.forEach((item) => {
                    store.put(item);
                });

                UI.SuccessMessage('Database updated!');
            };
        }

        // Helpers: Read all villages from indexedDB
        function getAllData(dbName, table) {
            return new Promise((resolve, reject) => {
                const dbConnect = indexedDB.open(dbName);

                dbConnect.onsuccess = () => {
                    const db = dbConnect.result;

                    const dbQuery = db
                        .transaction(table, 'readwrite')
                        .objectStore(table)
                        .getAll();

                    dbQuery.onsuccess = (event) => {
                        resolve(event.target.result);
                    };

                    dbQuery.onerror = (event) => {
                        reject(event.target.error);
                    };
                };

                dbConnect.onerror = (event) => {
                    reject(event.target.error);
                };
            });
        }

        // Helpers: Transform an array of objects into an array of arrays
        function objectToArray(arrayOfObjects, entity) {
            switch (entity) {
                case 'village':
                    return arrayOfObjects.map((item) => [
                        item.villageId,
                        item.villageName,
                        item.villageX,
                        item.villageY,
                        item.playerId,
                        item.villagePoints,
                        item.villageType,
                    ]);
                case 'player':
                    return arrayOfObjects.map((item) => [
                        item.playerId,
                        item.playerName,
                        item.tribeId,
                        item.villages,
                        item.points,
                        item.rank,
                    ]);
                case 'ally':
                    return arrayOfObjects.map((item) => [
                        item.tribeId,
                        item.tribeName,
                        item.tribeTag,
                        item.players,
                        item.villages,
                        item.points,
                        item.allPoints,
                        item.rank,
                    ]);
                case 'conquer':
                    return arrayOfObjects.map((item) => [
                        item.villageId,
                        item.unixTimestamp,
                        item.newPlayerId,
                        item.newPlayerId,
                        item.oldTribeId,
                        item.newTribeId,
                        item.villagePoints,
                    ]);
                default:
                    return [];
            }
        }

        // decide what to do based on current time and last updated entity time
        if (LAST_UPDATED_TIME !== null) {
            if (
                Date.parse(new Date()) >=
                parseInt(LAST_UPDATED_TIME) + TIME_INTERVAL
            ) {
                worldData[entity] = await fetchDataAndSave();
            } else {
                worldData[entity] = await getAllData(
                    dbConfig[entity].dbName,
                    dbConfig[entity].dbTable
                );
            }
        } else {
            worldData[entity] = await fetchDataAndSave();
        }

        // transform the data so at the end an array of array is returned
        worldData[entity] = objectToArray(worldData[entity], entity);

        return worldData[entity];
    },
    zeroPad: function (num, count) {
        var numZeropad = num + '';
        while (numZeropad.length < count) {
            numZeropad = '0' + numZeropad;
        }
        return numZeropad;
    },

    // initialize library
    init: async function (scriptConfig) {
        const {
            scriptData,
            translations,
            allowedMarkets,
            allowedScreens,
            allowedModes,
            isDebug,
            enableCountApi,
        } = scriptConfig;

        this.scriptData = scriptData;
        this.translations = translations;
        this.allowedMarkets = allowedMarkets;
        this.allowedScreens = allowedScreens;
        this.allowedModes = allowedModes;
        this.enableCountApi = enableCountApi;
        this.isDebug = isDebug;

        twSDK._initDebug();
    },
};


/*
By uploading a user-generated mod (script) for use with Tribal Wars, the creator grants InnoGames a perpetual, irrevocable, worldwide, royalty-free, non-exclusive license to use, reproduce, distribute, publicly display, modify, and create derivative works of the mod. This license permits InnoGames to incorporate the mod into any aspect of the game and its related services, including promotional and commercial endeavors, without any requirement for compensation or attribution to the uploader. The uploader represents and warrants that they have the legal right to grant this license and that the mod does not infringe upon any third-party rights.
*/

// User Input
if (typeof DEBUG !== 'boolean') DEBUG = false;
if (typeof BIG_SERVER !== 'boolean') BIG_SERVER = false;
if (typeof NIGHT_BONUS_OFFSET !== 'number') NIGHT_BONUS_OFFSET = 15; // 15 minutes before Night bonus to give players time to send the attacks


// Global variable
var STANDARD_DELAY = 200;
var LAST_REQUEST_TIME = 0;
var DEFAULT_ATTACKS_PER_BUTTON = 20;
var DEFAULT_DELAY = 250;
var DEFAULT_MAX_ATTACKS_PER_VILLAGE = 0;
var COORD_REGEX = (BIG_SERVER) ? /\d{1,3}\|\d{1,3}/g : /\d\d\d\|\d\d\d/g; // Different regex depending on player input if the server is too big for the strict regex
var MIN_ATTACKS_PER_BUTTON = 1;
var MIN_DELAY = 200;
var TROOP_POP = {
    spear: 1,
    sword: 1,
    axe: 1,
    archer: 1,
    spy: 2,
    light: 4,
    marcher: 5,
    heavy: 6,
    ram: 5,
    catapult: 8,
    knight: 10,
    snob: 100,
}

var ALL_ATTACKS = [];
var ARRIVAL_HOURS = new Map();

var scriptConfig = {
    scriptData: {
        prefix: 'fakegenerator',
        name: 'Fake Generator',
        version: 'v2.3.7',
        author: 'SaveBank',
        authorUrl: 'https://forum.tribalwars.net/index.php?members/savebank.131111/',
        helpLink: 'https://forum.tribalwars.net/index.php?threads/fakegenerator.291767/',
    },
    translations: {
        en_DK: {
            'Redirecting...': 'Redirecting...',
            Help: 'Help',
            'Fake Generator': 'Fake Generator',
            'Group': 'Group',
            'Attacks per Button': 'Attacks per Button',
            'There was an error!': 'There was an error!',
            'Calculate Fakes': 'Calculate Fakes',
            'Insert target coordinates here': 'Insert target coordinates here',
            'No target coordinates!': 'No target coordinates!',
            'There was an error while fetching the data!': 'There was an error while fetching the data!',
            'Send Spy?': 'Send Spy?',
            'Yes': 'Yes',
            'No': 'No',
            'No Fakes possible!': 'No Fakes possible!',
            'Loading...': 'Loading...',
            'Delay when opening tabs (in ms)': 'Delay when opening tabs (in ms)',
            'Max Attacks per Village (0 ignores this setting)': 'Max Attacks per Village (0 ignores this setting)',
            'dynamically': 'Dynamically',
            'manually': 'Manually',
            'Unit selection': 'Unit selection',
            'Keep Catapults': 'Keep Catapults',
            'Enter units to send (-1 for all troops)': 'Enter units to send (-1 for all troops)',
            'Enter units to keep (-1 for all troops)': 'Enter units to keep (-1 for all troops)',
            'Target Coordinates': 'Target Coordinates',
            'Delete all arrival times': 'Delete all arrival times',
            'Arrival time': 'Arrival time',
            'Reset Input': 'Reset Input',
            'Invalid entry. Please check the selected times.': 'Invalid entry. Please check the selected times.',
            'Invalid entry. Please select valid start and end times.': 'Invalid entry. Please select valid start and end times.',
            'This entry already exists.': 'This entry already exists.',
            'From': 'From',
            'To': 'To',
            'Delete Entry': 'Delete Entry',
            'Open Tabs': 'Open Tabs',
            'Unused Target Coordinates': 'Unused Target Coordinates',
            'Loading...': 'Loading...',
            'Ready!': 'Ready!',
            'Filter': 'Filter',
            'Avoid attacks into night bonus?': 'Avoid attacks into night bonus?',
            'Buffer to night bonus (in minutes)': 'Buffer to night bonus (in minutes)',
            'Total number of possible Attacks': 'Total number of possible Attacks',
            'Calculate!': 'Calculate!',
            'Too many requests! Please wait a moment before trying again.': 'Too many requests! Please wait a moment before trying again.',
            'One or more of the fetched world configuration data is empty.': 'One or more of the fetched world configuration data is empty.',
            'Export WB': 'Export WB',
            'No attacks to export!': 'No attacks to export!',
            'Exported and copied to clipboard': 'Exported and copied to clipboard',
            'Fetching troop data...' : 'Fetching troop data...',
            'Fetching troop data for a large account. This may take a while...' : 'Fetching troop data for a large account. This may take a while...',
            'Troop data fetched successfully!': 'Troop data fetched successfully!',
        },
        de_DE: {
            'Redirecting...': 'Weiterleiten...',
            Help: 'Hilfe',
            'Fake Generator': 'Fake Generator',
            'Group': 'Gruppe',
            'Attacks per Button': 'Angriffe pro Button',
            'There was an error!': 'Es gab einen Fehler!',
            'Calculate Fakes': 'Berechne Fakes',
            'Insert target coordinates here': 'Zielkoordinaten hier einfuegen',
            'No target coordinates!': 'Keine Zielkoordinaten!',
            'There was an error while fetching the data!': 'Es gab einen Fehler beim Laden der Daten!',
            'Send Spy?': 'Späher mitschicken?',
            'Yes': 'Ja',
            'No': 'Nein',
            'No Fakes possible!': 'Keine Fakes möglich!',
            'Loading...': 'Lädt...',
            'Delay when opening tabs (in ms)': 'Verzögerung beim Tab öffnen (in ms)',
            'Max Attacks per Village (0 ignores this setting)': 'Max Angriffe aus einem Dorf (0 ignoriert diese Einstellung)',
            'dynamically': 'Dynamisch',
            'manually': 'Manuell',
            'Unit selection': 'Truppenauswahl',
            'Keep Catapults': 'Katapulte zurückhalten',
            'Enter units to send (-1 for all troops)': 'Zu sendende Truppen eingeben (-1 für alle Truppen)',
            'Enter units to keep (-1 for all troops)': 'Zu behaltende Truppen eingeben (-1 für alle Truppen)',
            'Target Coordinates': 'Zielkoordinaten',
            'Delete all arrival times': 'Alle Ankunftszeiten löschen',
            'Arrival time': 'Ankunftszeiten',
            'Reset Input': 'Eingaben zurücksetzen',
            'Invalid entry. Please check the selected times.': 'Ungültiger Eintrag. Bitte überprüfen Sie die Zeiten.',
            'Invalid entry. Please select valid start and end times.': 'Ungültiger Eintrag. Bitte gültige Start- und Endzeiten auswählen.',
            'This entry already exists.': 'Dieser Eintrag existiert bereits.',
            'From': 'Von',
            'To': 'Bis',
            'Delete Entry': 'Eintrag löschen',
            'Open Tabs': 'Tabs öffnen',
            'Unused Target Coordinates': 'Unbenutzte Zielkoordinaten',
            'Loading...': 'Lädt...',
            'Ready!': 'Bereit!',
            'Filter': 'Filter',
            'Avoid attacks into night bonus?': 'Angriffe in den Nachtbonus verhindern?',
            'Buffer to night bonus (in minutes)': 'Puffer zum Nachtbonus (in Minuten)',
            'Total number of possible Attacks': 'Mögliche Angriffsanzahl',
            'Calculate!': 'Berechnen!',
            'Too many requests! Please wait a moment before trying again.': 'Zu viele Anfragen! Bitte warten Sie einen Moment, bevor Sie es erneut versuchen.',
            'One or more of the fetched world configuration data is empty.': 'Eine oder mehrere der abgerufenen Weltkonfigurationsdaten sind leer.',
            'Export WB': 'Export WB',
            'No attacks to export!': 'Keine Angriffe zum Exportieren!',
            'Exported and copied to clipboard': 'Exportiert und in die Zwischenablage kopiert',
            'Fetching troop data...' : 'Truppendaten werden geladen...',
            'Fetching troop data for a large account. This may take a while...' : 'Truppendaten für einen großen Account werden geladen. Dies kann eine Weile dauern...',
            'Troop data fetched successfully!': 'Truppendaten wurden erfolgreich geladen!',
        }
    },
    allowedMarkets: [],
    allowedScreens: ['overview_villages'],
    allowedModes: ['combined'],
    isDebug: DEBUG,
    enableCountApi: false
};

(async function () {
    // Initialize Library
    if (DEBUG) {
        console.debug("INIT");
    }
    await twSDK.init(scriptConfig);
    const scriptInfo = twSDK.scriptInfo();
    const isValidScreen = twSDK.checkValidLocation('screen');
    const isValidMode = twSDK.checkValidLocation('mode');
    // Check that we are on the correct screen and mode
    // I think we need to do it this early to avoid await fetchWorldConfigData() from being interupted by the redirection
    // Some players had the issue that their indexedDb was empty after loading the script and this might fix it
    if (!isValidScreen && !isValidMode) {
        // Redirect to correct screen if necessary
        UI.InfoMessage(twSDK.tt('Redirecting...'));
        twSDK.redirectTo('overview_villages&combined');
        return;
    }
    UI.InfoMessage(twSDK.tt('Loading...'));
    const groups = await fetchVillageGroups();
    const { players, villages, worldUnitInfo, worldConfig } = await fetchWorldConfigData();
    if (players.length < 1 || villages.length < 1 || !worldUnitInfo || !worldConfig) {
        UI.ErrorMessage('One or more of the fetched world data is empty.', 5000);
        return;
    }
    const villageMap = createVillageMap(villages);
    const allPlayers = new Map(players.map(player => [player[0], player.slice(1)]));
    const villageData = villageArrayToDict(villages)

    const ratio = parseInt(worldConfig.config.newbie.ratio);
    const nightBonusActive = (worldConfig.config.night.active === '1') ? true : false;

    if (DEBUG) {
        console.debug(`${scriptInfo} Groups:`, groups);
        console.debug(`${scriptInfo} Players:`, allPlayers);
        console.debug(`${scriptInfo} Villages:`, villageData);
        console.debug(`${scriptInfo} World Unit Info:`, worldUnitInfo);
        console.debug(`${scriptInfo} World Config:`, worldConfig);
        console.debug(`${scriptInfo} Village Map:`, villageMap);
        console.debug(`${scriptInfo} allPlayers:`, allPlayers);
        console.debug(`${scriptInfo} villageData:`, villageData);
        console.debug(`${scriptInfo} ratio:`, ratio);
        console.debug(`${scriptInfo} nightBonusActive:`, nightBonusActive);
    }

    // Entry point
    (async function () {
        try {
            renderUI();
            addEventHandlers();
            UI.InfoMessage(twSDK.tt('Ready!'));
        } catch (error) {
            UI.ErrorMessage(twSDK.tt('There was an error!'));
            console.error(`${scriptInfo} Error:`, error);
        }
    })();


    function renderUI() {
        const groupsFilter = renderGroupsFilter();
        const unitSelectionType = renderUnitSelectionType();
        const dynamicUnitSelection = renderDynamicUnitSelection();
        const manualUnitSelection = renderManualUnitSelection();
        const arrivalTimeSelector = renderArrivalTimeSelector();

        const ratioHide = (ratio === 0) ? 'style="display: none;"' : '';
        const nightBonusActiveHide = (nightBonusActive) ? '' : 'style="display: none;"';

        const content = `
        <div class="fake-generator-data">
            <div class="ra-mb10">
                <div class="sb-grid sb-grid-3">
                    <fieldset class="sb-fieldset">
                        <legend>${twSDK.tt('Group')}</legend>
                        ${groupsFilter}
                    </fieldset>
                    <fieldset class="sb-fieldset">
                        <legend>${twSDK.tt('Attacks per Button')}</legend>
                        <input id="AttPerBut" type="number" value="${DEFAULT_ATTACKS_PER_BUTTON}">
                    </fieldset>
                    <fieldset class="sb-fieldset">
                        <legend>${twSDK.tt('Delay when opening tabs (in ms)')}</legend>
                        <input id="DelayTab" type="number" value="${DEFAULT_DELAY}">
                    </fieldset>
                </div>
            </div>
            <div class="ra-mb10">
                <div class="sb-grid sb-grid-2">
                    <fieldset class="sb-fieldset">
                        <legend>${twSDK.tt('Unit selection')}</legend>
                        ${unitSelectionType}
                    </fieldset>
                    <fieldset class="sb-fieldset">
                        <legend>${twSDK.tt('Max Attacks per Village (0 ignores this setting)')}</legend>
                        <input id="MaxAttPerVil" type="number" value="${DEFAULT_MAX_ATTACKS_PER_VILLAGE}">
                    </fieldset>
                </div>
            </div>
            <div class="ra-mb10">
                ${dynamicUnitSelection}
            </div>
            <div class="ra-mb10">
                ${manualUnitSelection}
            </div>
            <div class="ra-mb10">
                <div class="sb-grid sb-grid-4">
                    <fieldset class="sb-fieldset">
                        <legend>${twSDK.tt('Total number of possible Attacks')}:</legend>
                        <button id="calculateTotalPossibleAttacks" class="btn btn-confirm-yes onclick">${twSDK.tt('Calculate!')}</button>
                    </fieldset>
                    <fieldset class="sb-fieldset" ${ratioHide}>
                        <legend>${twSDK.tt('Filter') + " " + ratio + ":1?"}</legend>
                        <input type="checkbox" id="filterRatio" />
                    </fieldset>
                    <fieldset class="sb-fieldset" ${nightBonusActiveHide}>
                        <legend>${twSDK.tt('Avoid attacks into night bonus?')}</legend>
                        <input type="checkbox" id="avoidNightbonus" />
                    </fieldset>
                    <fieldset class="sb-fieldset" style="display: none;" id="bufferNightbonusDisplay">
                        <legend>${twSDK.tt('Buffer to night bonus (in minutes)')}</legend>
                        <input type="number" id="bufferNightbonus" />
                    </fieldset>
                </div>
            </div>
            <div class="ra-mb10">
                ${arrivalTimeSelector}
            </div>
            <div class="ra-mb10">
                <fieldset class="sb-fieldset">
                    <legend id="coordinates">${twSDK.tt('Target Coordinates')}:</legend>
                    <textarea id="CoordInput" style="width: 100%" class="ra-textarea" placeholder="${twSDK.tt('Insert target coordinates here')}"></textarea>
                </fieldset>
            </div>
            <div class="ra-mb10">
                <fieldset class="sb-fieldset" id="fgAutomationFieldset">
                    <legend>TWCC Versand-Automatik</legend>
                    <button type="button" id="fgSendAutomationToggle" class="btn"></button>
                    <div id="fgSendAutomationStatus" style="margin-top:7px;font-size:11px;line-height:1.35;"></div>
                </fieldset>
            </div>
            <div class="ra-mb10">
                <a href="javascript:void(0);" id="calculateFakes" class="btn btn-confirm-yes onclick="">
                    ${twSDK.tt('Calculate Fakes')}
                </a>
            </div>
        </div>
        <div class="ra-mb10" style="display: none;" id="unusedCoordsDiv">
            <fieldset class="sb-fieldset">
                <legend id="unusedCoordsLegend">${twSDK.tt('Unused Target Coordinates')}:</legend>
                <textarea id="unusedCoordsDisplay" style="width: 100%" class="ra-textarea" readonly></textarea>
            </fieldset>
        </div>
        <div>
            <div id="open_tabs" style="display: none;" class="ra-mb10 sb-grid sb-grid-2">
                <div>
                    <h2 id="h2_tabs"><center style="margin:10px"><u>${twSDK.tt('Open Tabs')}</u></center></h2>
                </div>
                <div>
                    <button id="exportPlanFG" class="btn onclick">${twSDK.tt('Export WB')}</button>
                </div>
            </div>
        </div>`;
        const style = `
            .btn-confirm-clicked { background: #666 !important; }
            .ra-textarea::placeholder {
                font-size: 15px;
                font-style: italic;
            }
            .sb-grid {
                display: grid;
                grid-gap: 10px;
            }
            .sb-grid-5 {
                grid-template-columns: repeat(5, 1fr);
            }
            .sb-grid-4 {
                grid-template-columns: repeat(4, 1fr);
            }
            .sb-grid-3 {
                grid-template-columns: repeat(3, 1fr);
            }
            .sb-grid-2 {
                grid-template-columns: repeat(2, 1fr);
            }
            .sb-fieldset {
                border: 1px solid #c1a264;
                border-radius: 4px;
                padding: 10px;
            }
            .sb-fieldset legend {
                font-size: 12px;
                font-weight: bold;
            }
            .sb-fieldset select {
                padding: 8px;
                font-size: 14px;
                border: 1px solid #c1a264;
                border-radius: 3px;
                width: 165px;
            }
            .sb-fieldset input[type="number"] {
                padding: 8px;
                font-size: 14px;
                border: 1px solid #c1a264;
                border-radius: 3px;
                width: 70px;
            }

            .sb-fieldset input[type="checkbox"] {
                margin-right: 5px;
                transform: scale(1.2);
            }

            .ra-table th img {
                display: block;
                margin: 0 auto;
            }
            input[type="datetime-local"] {
                padding: 10px;
                font-size: 13px;
                border: 1px solid #c1a264;
                border-radius: 3px;
            }
            .sb-grid-item-text {
                font-size: 16px;
                text-align: center;
                line-height: 34px;
            }
            .add-entry-btn {
                padding: 10px;
                font-size: 17px;
                color: white;
                background: #0bac00;
                background: linear-gradient(to bottom, #0bac00 0%,#0e7a1e 100%);
                border: 1px solid;
                border-color: #006712;
                border-radius: 3px;
                cursor: pointer;
            }
            .add-entry-btn, .deleteAllEntries {
                width: 90%;
                height: 40px;
                display: inline-block;
                text-align: center;
            }
            .delete-entry-btn:hover {
                text-decoration: underline;
            }
            .deleteAllEntries {
                padding: 8px;
                font-size: 11.5px;
                font-weight: bold;
                background: #af281d;
                background: linear-gradient(to bottom, #af281d 0%,#801006 100%);
            }
            .deleteAllEntries:hover {
                background: #c92722;
                background: linear-gradient(to bottom, #c92722 0%,#a00d08 100%);
            }
            .sb-mb5 {
                margin-bottom: 5px !important;
            }
            #addTimeEntry:hover {
                background: #13c600;
                background: linear-gradient(to bottom, #13c600 0%,#129e23 100%);
            }
            .entries-table {
                width: 100%;
                border-collapse: collapse;
            }
            .entries-table th {
                background-color: #f2f2f2;
                text-align: left;
                padding: 10px;
            }
            .entries-table td {
                border: 1px solid #ddd;
                padding: 8px;
            }
            .entry-row:nth-child(even) {
                background-color: ##f0e2be;
            }
            .entry-row:nth-child(odd) {
                background-color: #fff5da;
            }
            .entry-start, .entry-end {
                text-align: center;
            }
            .delete-entry-btn {
                width: 30%;
                height: 50%;
                padding: 10px;
                border: 1px solid black;
                border-radius: 3px;
                color: white;
                cursor: pointer;
                font-weight: bold;
                background: #af281d;
                background: linear-gradient(to bottom, #af281d 0%,#801006 100%);
                padding: 0;

            }
            .delete-entry-btn:hover {
                background: #c92722;
                background: linear-gradient(to bottom, #c92722 0%,#a00d08 100%);
            }
            #calculateTotalPossibleAttacks {
                width: 100%;
            }
        `;


        twSDK.renderBoxWidget(
            content,
            'FakeGenerator',
            'fake-generator',
            style
        );
        updateSendAutomationButton();
    }

    // Add event handlers and data storage and value initialization
    function addEventHandlers() {
        jQuery('#fgSendAutomationToggle').off('click.twccFgAutomation').on('click.twccFgAutomation', function (e) {
            e.preventDefault();
            setSendAutomationEnabled(!isSendAutomationEnabled());
            updateSendAutomationButton();
            try {
                if (window.UI && UI.InfoMessage) {
                    UI.InfoMessage(isSendAutomationEnabled()
                        ? 'FakeGenerator: Automatischer Versand aktiviert.'
                        : 'FakeGenerator: Automatischer Versand deaktiviert.');
                }
            } catch (err) {}
        });

        updateSendAutomationButton();

        // For the Group select menu
        jQuery('#GroupsFilter').on('change', function (e) {
            if (DEBUG) {
                console.debug(`${scriptInfo} selected group ID: `, e.target.value);
            }
            // Use the setLocalStorage function to update chosen_group
            let localStorageSettings = getLocalStorage();
            localStorageSettings.chosen_group = e.target.value;
            saveLocalStorage(localStorageSettings);
        });

        // For the calculateTotalPossibleAttacks button
        jQuery('#calculateTotalPossibleAttacks').on('click', async function () {
            if (DEBUG) {
                console.debug(`${scriptInfo} Calculate Total Possible Attacks`);
            }
            await updateTotalPossibleNumberOfAttacks();
        });

        // Init avoid nightbonus checkbox
        let localStorageSettingsAvoidNightbonus = getLocalStorage();
        jQuery('#avoidNightbonus').prop('checked', localStorageSettingsAvoidNightbonus.avoid_nightbonus);
        // For the avoid nightbonus checkbox
        jQuery('#avoidNightbonus').on('change', function (e) {
            if (DEBUG) {
                console.debug(`${scriptInfo} Avoid nightbonus: `, e.target.checked);
            }
            // Use setLocalStorage to update avoid_nightbonus value
            let localStorageSettingsAvoidNightbonus = getLocalStorage();
            localStorageSettingsAvoidNightbonus.avoid_nightbonus = e.target.checked;
            saveLocalStorage(localStorageSettingsAvoidNightbonus);
            if (e.target.checked) {
                jQuery('#bufferNightbonusDisplay').show();
            } else {
                jQuery('#bufferNightbonusDisplay').hide();
            }
        });

        // Init buffer nightbonus input
        let localStorageSettingsBufferNightbonus = getLocalStorage();
        jQuery('#bufferNightbonus').val(localStorageSettingsBufferNightbonus.buffer_nightbonus);
        if (localStorageSettingsBufferNightbonus.avoid_nightbonus == true && nightBonusActive) {
            jQuery('#bufferNightbonusDisplay').show();
        } else {
            jQuery('#bufferNightbonusDisplay').hide();
        }
        // For the buffer nightbonus input
        jQuery('#bufferNightbonus').on('change', function (e) {
            if (DEBUG) {
                console.debug(`${scriptInfo} Buffer nightbonus: `, e.target.value);
            }
            // Use setLocalStorage to update buffer_nightbonus value
            let localStorageSettingsBufferNightbonus = getLocalStorage();
            localStorageSettingsBufferNightbonus.buffer_nightbonus = (parseInt(e.target.value) >= 0) ? e.target.value : NIGHT_BONUS_OFFSET;
            e.target.value = localStorageSettingsBufferNightbonus.buffer_nightbonus;
            saveLocalStorage(localStorageSettingsBufferNightbonus);
        });

        // Init filter ratio checkbox
        let localStorageSettingsFilterRatio = getLocalStorage();
        jQuery('#filterRatio').prop('checked', localStorageSettingsFilterRatio.filter_ratio);

        // For the filter ratio checkbox
        jQuery('#filterRatio').on('change', function (e) {
            if (DEBUG) {
                console.debug(`${scriptInfo} Filter ratio: `, e.target.checked);
            }
            // Use setLocalStorage to update filter_ratio value
            let localStorageSettingsFilterRatio = getLocalStorage();
            localStorageSettingsFilterRatio.filter_ratio = e.target.checked;
            saveLocalStorage(localStorageSettingsFilterRatio);
        });

        // For the Attacks per Button Option
        let localStorageSettingsAPB = getLocalStorage();
        let attacksPerButton = (parseInt(localStorageSettingsAPB.attack_per_button) >= MIN_ATTACKS_PER_BUTTON) ? localStorageSettingsAPB.attack_per_button : MIN_ATTACKS_PER_BUTTON;
        localStorageSettingsAPB.attack_per_button = attacksPerButton;
        saveLocalStorage(localStorageSettingsAPB);
        jQuery('#AttPerBut').val(attacksPerButton);

        jQuery('#AttPerBut').on('change', function (e) {
            if (e.target.value < 1 || isNaN(parseInt(e.target.value)) || parseInt(e.target.value) < MIN_ATTACKS_PER_BUTTON) {
                jQuery('#AttPerBut').val(MIN_ATTACKS_PER_BUTTON);
                e.target.value = MIN_ATTACKS_PER_BUTTON;
            }
            if (DEBUG) {
                console.debug(`${scriptInfo} Attacks per Button: `, e.target.value);
            }
            // Update AttPerBut in localStorage using setLocalStorage
            let localStorageSettingsAttPerButChange = getLocalStorage();
            localStorageSettingsAttPerButChange.attack_per_button = e.target.value;
            saveLocalStorage(localStorageSettingsAttPerButChange);
        });

        // For the delay Option
        let localStorageSettingsDelay = getLocalStorage();
        let delay = localStorageSettingsDelay.delay;
        delay = (parseInt(localStorageSettingsDelay.delay) >= MIN_DELAY) ? localStorageSettingsDelay.delay : MIN_DELAY;
        localStorageSettingsDelay.delay = delay;
        saveLocalStorage(localStorageSettingsDelay);
        jQuery('#DelayTab').val(delay);

        jQuery('#DelayTab').on('change', function (e) {
            const inputValue = parseInt(e.target.value);
            const defaultValue = MIN_DELAY;

            if (DEBUG) {
                console.debug(`${scriptInfo} Delay: `, inputValue);
            }

            // Use setLocalStorage to update delay value
            let localStorageSettingsDelay = getLocalStorage();
            localStorageSettingsDelay.delay = (inputValue >= defaultValue) ? inputValue : defaultValue;
            saveLocalStorage(localStorageSettingsDelay);

            // Update the value in the input field
            jQuery('#DelayTab').val(localStorageSettingsDelay.delay);
        });

        // For the unit selection type Option
        jQuery('#UnitSelectionType').on('change', function (e) {
            if (DEBUG) {
                console.debug(`${scriptInfo} Unit Selection Type: `, e.target.value);
            }

            // Use setLocalStorage to update unit_selection_type value
            let localStorageSettingsUnitSelection = getLocalStorage();
            localStorageSettingsUnitSelection.unit_selection_type = e.target.value;
            saveLocalStorage(localStorageSettingsUnitSelection);

            // Toggle visibility of corresponding divs
            if (e.target.value === 'dynamically') {
                jQuery('#dynamic-unit').show();
                jQuery('#manual-unit').hide();
            } else {
                jQuery('#dynamic-unit').hide();
                jQuery('#manual-unit').show();
            }
        });

        // For the max attacks per village Option
        let localStorageSettingsMaxAttacks = getLocalStorage();
        let maxAttacksPerVillage = localStorageSettingsMaxAttacks.max_attacks_per_village;
        maxAttacksPerVillage = (parseInt(maxAttacksPerVillage) >= 0) ? maxAttacksPerVillage : 0;
        localStorageSettingsMaxAttacks.max_attacks_per_village = maxAttacksPerVillage;
        saveLocalStorage(localStorageSettingsMaxAttacks);
        jQuery('#MaxAttPerVil').val(maxAttacksPerVillage);

        jQuery('#MaxAttPerVil').on('change', function (e) {
            if (DEBUG) {
                console.debug(`${scriptInfo} Max Attacks per Village: `, e.target.value);
            }

            // Ensure the value is above 0
            const newValue = Math.max(0, parseInt(e.target.value)) || 0;

            // Use setLocalStorage to update max_attacks_per_village value
            let localStorageSettingsMaxAttacks = getLocalStorage();
            localStorageSettingsMaxAttacks.max_attacks_per_village = newValue;
            saveLocalStorage(localStorageSettingsMaxAttacks);

            // Update the input value to the sanitized value
            jQuery('#MaxAttPerVil').val(newValue);
        });


        // For the Send spy select menu
        jQuery('#SendSpy').on('change', function (e) {
            if (DEBUG) {
                console.debug(`${scriptInfo} Send Spy: `, e.target.value);
            }
            // Use setLocalStorage to update send_spy value
            let localStorageSettingsSendSpy = getLocalStorage();
            localStorageSettingsSendSpy.send_spy = e.target.value;
            saveLocalStorage(localStorageSettingsSendSpy);
        });

        // For the keep catapults
        jQuery('#KeepCatapults').on('change', function (e) {
            if (DEBUG) {
                console.debug(`${scriptInfo} Keep catapults: `, e.target.value);
            }
            // Use setLocalStorage to update send_spy value
            let localStorageSettingsKeepCatapults = getLocalStorage();
            localStorageSettingsKeepCatapults.keep_catapults = e.target.value;
            saveLocalStorage(localStorageSettingsKeepCatapults);
        });


        // Initialize units_to_send and units_to_keep values from local storage
        const localStorageSettingsUnits = getLocalStorage();

        // Initialize units_to_send
        for (const unit in localStorageSettingsUnits.units_to_send) {
            const inputValue = localStorageSettingsUnits.units_to_send[unit] || 0;
            jQuery(`#send_unit_${unit}`).val(inputValue);
        }

        // Initialize units_to_keep
        for (const unit in localStorageSettingsUnits.units_to_keep) {
            const inputValue = localStorageSettingsUnits.units_to_keep[unit] || 0;
            jQuery(`#keep_unit_${unit}`).val(inputValue);
        }

        // Handle function for unit input changes
        function handleUnitInputChange(e) {
            if (DEBUG) {
                console.debug(`${scriptInfo} ${e.target.id}: `, e.target.value);
            }
            const id = e.target.id;
            let sendOrKeep = "";
            if (id.startsWith('send')) {
                sendOrKeep = 'units_to_send';
            } else if (id.startsWith('keep')) {
                sendOrKeep = 'units_to_keep';
            }
            const idParts = e.target.id.split('_');
            const lastWord = idParts[idParts.length - 1];

            // Ensure the input is at least -1
            const inputValue = parseInt(e.target.value) >= -1 ? parseInt(e.target.value) : 0;

            jQuery(`#${e.target.id}`).val(inputValue);

            // Use setLocalStorage to update unit value
            let localStorageSettingsUnit = getLocalStorage();
            localStorageSettingsUnit[sendOrKeep][lastWord] = inputValue;
            saveLocalStorage(localStorageSettingsUnit);
        }

        // Attach the generic function to all unit number inputs
        jQuery('.ra-unit-selector').on('change', function (e) {
            handleUnitInputChange(e);
        });


        let target_coords = getLocalStorage().target_coordinates;
        if (target_coords && target_coords.length > 0) {
            jQuery('#coordinates').text(`${twSDK.tt('Target Coordinates')}: ${target_coords.length}`);
        }
        jQuery('#CoordInput').val(target_coords.join(' '));
        // For the coord input text area
        jQuery('#CoordInput').on('change', function (e) {
            let startTime = new Date().getTime();
            let amountOfCoords = 0;
            let existingCoordinates = [];
            const coordinates = this.value.match(COORD_REGEX);
            if (coordinates) {
                amountOfCoords = coordinates.length;
                existingCoordinates = coordinates.filter(coord => checkIfVillageExists(coord));
                this.value = existingCoordinates.join(' ');
                jQuery('#coordinates').text(`${twSDK.tt('Target Coordinates')}: ${existingCoordinates.length}`);
            } else {
                this.value = '';
                jQuery('#coordinates').text(`${twSDK.tt('Target Coordinates')}:`);
            }
            let endTime = new Date().getTime();
            if (DEBUG) {
                console.debug(`${scriptInfo} The script took ${endTime - startTime} milliseconds to filter ${amountOfCoords} coords and check for their existence.\n${scriptInfo} ${existingCoordinates.length} existing coordinates have been found.`);
            }

            // Update target_coordinates in localStorage using setLocalStorage
            let localStorageSettingsCoordInput = getLocalStorage();
            localStorageSettingsCoordInput.target_coordinates = existingCoordinates;
            saveLocalStorage(localStorageSettingsCoordInput);
        });
        jQuery('#deleteAllEntries').on('click', function () {
            // Remove all entries in the table with the id arrivalEntryTable
            jQuery('#arrivalEntryTable .entry-row').remove();

            // Clear saved times in local storage
            const localStorageObject = getLocalStorage();
            localStorageObject.arrival_times = [];
            saveLocalStorage(localStorageObject);

            // Make the table invisible
            jQuery('#arrivalEntryTable').css('display', 'none');
        });
        initializeSavedEntries()
        jQuery('#arrivalEntryTable').on('click', '.delete-entry-btn', function () {
            const idParts = this.id.split('-');
            const startTime = Number(idParts[1]);
            const endTime = Number(idParts[2]);

            const updatedLocalStorage = getLocalStorage();
            updatedLocalStorage.arrival_times = updatedLocalStorage.arrival_times.filter(timeSpan => !(timeSpan[0] === startTime && timeSpan[1] === endTime));
            saveLocalStorage(updatedLocalStorage);

            jQuery(this).parent().parent().remove();

            // Hide the table if there are no entries
            if (updatedLocalStorage.arrival_times.length === 0) {
                jQuery('#arrivalEntryTable').css('display', 'none');
            }
        });
        jQuery('#addTimeEntry').on('click', async function (e) {
            e.preventDefault();

            // Logic to validate and add new entry into the table with the id arrivalEntryTable
            const startTimeString = jQuery('#startDateTime').val();
            const endTimeString = jQuery('#endDateTime').val();

            if (startTimeString && endTimeString) {
                const currentTime = Date.now();
                const startTime = new Date(startTimeString).getTime();
                const endTime = new Date(endTimeString).getTime();

                if (!isNaN(startTime) && !isNaN(endTime) && startTime < endTime && currentTime < endTime) {
                    // Check if the combination of timestamps is already saved
                    const localStorageObject = getLocalStorage();
                    const isDuplicate = localStorageObject.arrival_times.some(timeSpan => isEqual(timeSpan, [startTime, endTime]));

                    if (isDuplicate) {
                        UI.ErrorMessage(`${twSDK.tt('This entry already exists.')}`);
                        return;
                    }

                    // Valid entry, proceed to update localStorage
                    localStorageObject.arrival_times.push([startTime, endTime]);
                    saveLocalStorage(localStorageObject);

                    // Create a new row for the new entry
                    const newEntryRow = jQuery('<tr class="entry-row"></tr>');
                    newEntryRow.append(`<td class="entry-start">${formatLocalizedTime(new Date(startTime))}</td>`);
                    newEntryRow.append(`<td class="entry-end">${formatLocalizedTime(new Date(endTime))}</td>`);
                    newEntryRow.append(`<td class="ra-tac"><button class="delete-entry-btn" id="btn-${startTime}-${endTime}">X</button></td>`);
                    jQuery('#arrivalEntryTable').append(newEntryRow);

                    // Make the table visible if it has at least one entry
                    jQuery('#arrivalEntryTable').css('display', 'table');

                    // Event handler for the delete entry button
                    newEntryRow.find('.delete-entry-btn').on('click', function () {
                        newEntryRow.remove();
                        const updatedLocalStorage = getLocalStorage();
                        updatedLocalStorage.arrival_times = updatedLocalStorage.arrival_times.filter(timeSpan => !isEqual(timeSpan, [startTime, endTime]));
                        saveLocalStorage(updatedLocalStorage);

                        // Hide the table if there are no entries
                        if (updatedLocalStorage.arrival_times.length === 0) {
                            jQuery('#arrivalEntryTable').css('display', 'none');
                        }
                    });
                } else {
                    UI.ErrorMessage(`${twSDK.tt('Invalid entry. Please select valid start and end times.')}`);
                }
            } else {
                UI.ErrorMessage(`${twSDK.tt('Invalid entry. Please check the selected times.')}`);
            }
        });
        jQuery('#resetInput').on('click', function () {
            if (DEBUG) console.debug(`${scriptInfo} Reset Input`);
            resetInput();
        });
        jQuery('#exportPlanFG').on('click', function () {
            if (DEBUG) console.debug(`${scriptInfo} Export Plan`);
            exportAttacks();
            UI.InfoMessage(twSDK.tt('Exported and copied to clipboard'));
        });
        // For the Calculate Fakes Button
        jQuery('#calculateFakes').on('click', async function (e) {
            e.preventDefault();

            clearButtons();
            jQuery('#exportPlanFG').on('click', function () {
                if (DEBUG) console.debug(`${scriptInfo} Export Plan`);
                exportAttacks();
                UI.InfoMessage(twSDK.tt('Exported and copied to clipboard'));
            });
            jQuery('#unusedCoordsDiv').hide();

            let playerVillages;
            let targetCoords = [];
            let unchangedTroopData;

            targetCoords = jQuery('#CoordInput').val().trim().match(COORD_REGEX) ?? [];
            if (targetCoords.length === 0) {
                UI.ErrorMessage(twSDK.tt('No target coordinates!'));
                return;
            }
            const groupId = getLocalStorage().chosen_group;

            if (DEBUG) {
                console.debug(`${scriptInfo} Target coordinates: `, targetCoords);
                console.debug(`${scriptInfo} worldConfig: `, worldConfig);
                console.debug(`${scriptInfo} worldUnitInfo: `, worldUnitInfo);
                console.debug(`${scriptInfo} village.txt villages: `, villages);
                console.debug(`${scriptInfo} Current URL: `, getCurrentURL());
            }

            try {
                playerVillages = await fetchTroopsForCurrentGroup(parseInt(groupId));
                if (DEBUG) {
                    console.debug(`${scriptInfo} Player villages: `, playerVillages);
                }
            } catch (error) {
                UI.ErrorMessage(twSDK.tt('There was an error!'));
                console.error(`${scriptInfo} Error:`, error);
            }


            for (let playerVillage of playerVillages) {
                points = getVillagePointsFromCoord(playerVillage.coord)
                playerVillage.points = points;
            }
            unchangedTroopData = JSON.parse(JSON.stringify(playerVillages));

            if (DEBUG) {
                console.debug(`${scriptInfo} Player villages with points: `, playerVillages);
            }
            let spySend;
            const spy = getLocalStorage().send_spy;
            if (spy === "yes") {
                spySend = true;
            } else {
                spySend = false;
            }
            calculateAttacks(playerVillages, targetCoords, worldConfig.config.night, parseInt(worldConfig.config.game.fake_limit), worldUnitInfo.config, spySend, unchangedTroopData);
        });
    }

    function calculateAttacks(playerVillages, targetCoords, nightInfo, fakeLimit, configSpeed, spySend, unchangedTroopData) {
        // Time to calculate calculation time
        let startTime = new Date().getTime();
        ALL_ATTACKS = [];
        ARRIVAL_HOURS = new Map();
        let { amountOfCombinations, allCombinations } = getAllPossibleCombinations(playerVillages, targetCoords, configSpeed, nightInfo, fakeLimit, spySend);
        if (DEBUG) {
            let endTimeGetAll = new Date().getTime();
            if (DEBUG) console.debug(`${scriptInfo} The script took ${endTimeGetAll - startTime} milliseconds to calculate ${allCombinations} with ${amountOfCombinations} possible combinations.`);
        }

        if (DEBUG) {
            console.debug(`${scriptInfo} All calculated Combinations: `, allCombinations);
            console.debug(`${scriptInfo} Amount of possible Combinations: `, amountOfCombinations);
        }
        if (amountOfCombinations === 0) {
            UI.ErrorMessage(twSDK.tt('No Fakes possible!'));
            return;
        }

        allCombinations.sort((a, b) => a.length - b.length);

        //Initializing map to count the usage of each playerVillage
        let usedPlayerVillages = new Map();
        playerVillages.forEach((village) => {
            usedPlayerVillages.set(village.villageId, 0);
        });

        let calculatedFakePairs = [];
        let counts = getCounts(allCombinations);
        let minCat;
        const localStorageObject = getLocalStorage();
        const unitSelectionType = localStorageObject.unit_selection_type;
        const unitsToSend = localStorageObject.units_to_send;
        const unitsToKeep = localStorageObject.units_to_keep;
        const ratioBool = parseBool(localStorageObject.filter_ratio);
        let startTimeWhile;
        let whileCounter;
        let unusedCoords = [];
        if (DEBUG) {
            startTimeWhile = new Date().getTime();
            whileCounter = 0;
        }
        while (allCombinations.length > 0) {
            if (DEBUG) whileCounter += 1;
            let combination = allCombinations.shift();

            // Filter villages below ratio if ratio is active
            if (ratio > 0 && ratioBool) {
                if (parseInt(villageData[combination[0]][2]) < (game_data.player.points / ratio)) {
                    continue;
                }
            }

            // Next loop if the combination only contains the target village
            if (combination.length < 2) {
                unusedCoords.push(combination[0]);
                continue;
            }
            // Sort player villages
            combination = sortPlayerVillages(combination, counts, usedPlayerVillages, allCombinations);

            //Choose the most fitting village
            let chosenVillage = null;
            chosenVillage = chooseVillage(combination, fakeLimit, spySend, calculatedFakePairs, usedPlayerVillages)
            if (!chosenVillage) {
                unusedCoords.push(combination[0]);
                continue;
            }

            // Remove used units from village
            if (unitSelectionType == "manually") {
                subtractUnitsFromVillage(chosenVillage, unitsToSend);
            } else if (unitSelectionType == "dynamically") {
                let unitObjectCatapult = createDefaultUnitsObject();
                unitObjectCatapult["catapult"] = getMinAmountOfCatapults(chosenVillage.points, fakeLimit);
                if (spySend) {
                    unitObjectCatapult["spy"] = 1;
                }
                subtractUnitsFromVillage(chosenVillage, unitObjectCatapult);
            } else {
                console.error("Invalid unit selection type", unitSelectionType)
                return;
            }
            calculatedFakePairs.push([chosenVillage, combination[0]]);

            // Increment the used counter of the village we just used
            usedPlayerVillages.set(chosenVillage.villageId, usedPlayerVillages.get(chosenVillage.villageId) + 1);

            // Update counts for all villages in the chosen combination
            combination.slice(1).forEach((playerVillage) => {
                let villageId = playerVillage.villageId;

                if (counts.has(villageId)) {
                    counts.set(villageId, counts.get(villageId) - 1);
                }
            });

            // Remove used village if not enough remaining troops
            if (unitSelectionType == "manually") {
                if (!isValidUnitsToSend(chosenVillage, unitsToSend) || Object.values(unitsToSend).some(value => value === -1)) {
                    allCombinations = allCombinations.map(combination => {
                        return combination.filter(element => element !== chosenVillage);
                    });
                    allCombinations.sort((a, b) => a.length - b.length);
                }
            } else if (unitSelectionType == "dynamically") {
                minCat = getMinAmountOfCatapults(chosenVillage.points, fakeLimit);
                if (chosenVillage.catapult < minCat || (spySend && chosenVillage.spy <= 0)) {
                    allCombinations = allCombinations.map(combination => {
                        return combination.filter(element => element !== chosenVillage);
                    });
                    allCombinations.sort((a, b) => a.length - b.length);
                }
            } else {
                console.error("Invalid unit selection type", unitSelectionType)
                return;
            }
        }
        if (DEBUG) {
            let endTimeWhile = new Date().getTime();
            if (DEBUG) console.debug(`${scriptInfo} The script took ${endTimeWhile - startTimeWhile} milliseconds to calculate ${whileCounter} while loops for ${(endTimeWhile - startTimeWhile) / whileCounter} ms per while loops.`);
            if (DEBUG) console.debug(`${scriptInfo} Arrival Hours: `, ARRIVAL_HOURS);
        }
        if (DEBUG) console.debug(`${scriptInfo} Calculated fake pairs: ${calculatedFakePairs}`);
        if (DEBUG) {
            let villageUsages = [];

            for (let villageId of usedPlayerVillages.keys()) {
                let usage = usedPlayerVillages.get(villageId);
                villageUsages.push(usage);
                // console.debug(`${scriptInfo} How often each village was used: ${villageId} : ${usage}`);
            }

            villageUsages.sort((a, b) => a - b);
            let median;
            let midIndex = Math.floor(villageUsages.length / 2);
            if (villageUsages.length % 2 === 0) {
                median = (villageUsages[midIndex - 1] + villageUsages[midIndex]) / 2;
            } else {
                median = villageUsages[midIndex];
            }

            console.debug(`${scriptInfo} Sorted usages ${villageUsages}`);
            console.debug(`${scriptInfo} Median usage of villages: ${median}`);
        }
        let generatedFakeLinks = [];
        let unitObject = createDefaultUnitsObject();
        if (spySend) {
            unitObject["spy"] = 1;
        }
        let attack = {};
        // origin, target, slowest, arrival, type, drawIn=true, sent=false, units
        for (let pair of calculatedFakePairs) {
            let villageData = unchangedTroopData.find(village => village.villageId == pair[0].villageId);
            let link
            if (!villageData) {
                console.error("Village not found in unchangedTroopData", villageId1, unchangedTroopData);
                continue;
            }
            if (unitSelectionType == "manually") {
                link = generateLink(pair[0].villageId, getVillageIdFromCoord(pair[1]), unitsToSend, villageData, unitsToKeep);
                generatedFakeLinks.push(link);
                attack = {
                    origin: pair[0].villageId,
                    target: getVillageIdFromCoord(pair[1]),
                    slowestUnit: getSlowestUnit(unitsToSend, configSpeed),
                    arrivalTime: calculateArrivalTimeFromVillageIds(pair[0].villageId, getVillageIdFromCoord(pair[1]), getSlowestSpeed(unitsToSend, configSpeed)),
                    type: "14",
                    drawIn: true,
                    sent: false,
                    units: calculateUnitsToSend(unitsToSend, villageData, unitsToKeep),
                    link: link,
                };
                ALL_ATTACKS.push(attack);
            } else if (unitSelectionType == "dynamically") {
                unitObject["catapult"] = getMinAmountOfCatapults(pair[0].points, fakeLimit);
                link = generateLink(pair[0].villageId, getVillageIdFromCoord(pair[1]), unitObject, villageData, unitsToKeep);
                generatedFakeLinks.push(link);
                attack = {
                    origin: pair[0].villageId,
                    target: getVillageIdFromCoord(pair[1]),
                    slowestUnit: getSlowestUnit(unitObject, configSpeed),
                    arrivalTime: calculateArrivalTimeFromVillageIds(pair[0].villageId, getVillageIdFromCoord(pair[1]), getSlowestSpeed(unitObject, configSpeed)),
                    type: "14",
                    drawIn: true,
                    sent: false,
                    units: calculateUnitsToSend(unitObject, villageData, unitsToKeep),
                    link: link,
                };
                ALL_ATTACKS.push(attack);
            } else {
                console.error("Invalid unit selection type", unitSelectionType)
                return;
            }
        }
        shuffleArray(generatedFakeLinks);
        if (DEBUG) console.debug(`${scriptInfo} One of the generated Links: ${generatedFakeLinks[0]}`);
        if (DEBUG) console.debug(`${scriptInfo} Unused coords: ${unusedCoords}`);
        // Get end timestamp
        let endTime = new Date().getTime();
        if (DEBUG) console.debug(`${scriptInfo} The script took ${endTime - startTime} milliseconds to calculate ${calculatedFakePairs.length} fake pairs from ${amountOfCombinations} possible combinations.`);
        if (unusedCoords.length > 0) {
            jQuery('#unusedCoordsDiv').show();
            jQuery('#unusedCoordsDisplay').val(unusedCoords.join(' '));
            jQuery('#unusedCoordsLegend').text(`${twSDK.tt('Unused Target Coordinates')}: ${unusedCoords.length}`);
        }
        createSendButtons(generatedFakeLinks);
        if (DEBUG) console.debug(`${scriptInfo} Finished`);

        return;
    }


    // All possible combinations of player village and target  coords with consideration of arrival time outside the night bonus and minimum catapult am
    function getAllPossibleCombinations(playerVillages, targetCoords, configSpeed, nightInfo, fakeLimit, spySend) {
        let allCombinations = [];
        let currentTime = Date.now();
        let minCat = 1;
        let amountOfCombinations = 0;
        let distance;
        let travelTime;
        let unitSpeed;
        let timestamp;
        let timeBool;
        let nightBool;

        const localStorageObject = getLocalStorage();
        const unitSelectionType = localStorageObject.unit_selection_type;
        const unitsToKeep = localStorageObject.units_to_keep;
        const unitsToSend = localStorageObject.units_to_send;
        const keepCatapults = localStorageObject.keep_catapults;
        const arrivalTimes = localStorageObject.arrival_times;
        const nightBonusOffset = parseInt(localStorageObject.buffer_nightbonus);
        const avoidNightBonus = parseBool(localStorageObject.avoid_nightbonus);
        let playerVillagesWithEnoughUnits = [];

        if (unitSelectionType === "manually") {
            // Subtract units_to_keep from player villages
            unitSpeed = getSlowestSpeed(unitsToSend, configSpeed)
            for (let playerVillage of playerVillages) {
                subtractUnitsFromVillage(playerVillage, unitsToKeep);
                if (isValidUnitsToSend(playerVillage, unitsToSend)) {
                    playerVillagesWithEnoughUnits.push(playerVillage);
                }
            }
            for (let targetCoord of targetCoords) {
                let subArray = [targetCoord];
                for (let playerVillage of playerVillagesWithEnoughUnits) {
                    distance = twSDK.calculateDistance(playerVillage.coord, targetCoord);
                    travelTime = twSDK.getTravelTimeInSecond(distance, unitSpeed) * 1000;
                    timestamp = currentTime + travelTime;
                    timeBool = false;
                    if (arrivalTimes.length === 0) {
                        timeBool = true;
                    }
                    for (const [start, end] of arrivalTimes) {
                        if (timestamp >= start && timestamp <= end) {
                            timeBool = true;
                            break;
                        }
                    }
                    if (!timeBool) continue;
                    // We want to arrive shortly before the night bonus to give the player time to send the attacks
                    if (avoidNightBonus && nightBonusActive) {
                        const time = new Date(currentTime + travelTime);
                        const currentTotalTime = (time.getHours() + time.getMinutes() / 60);

                        const checkStartNb = ((parseInt(nightInfo.start_hour) + 24) - (nightBonusOffset / 60)) % 24;  // Wrap around when subtracting offsett
                        const checkEndNb = parseInt(nightInfo.end_hour);

                        // Check if current time is less than the start of the night bonus or current time is greater than the end of the night bonus.
                        if (parseInt(nightInfo.start_hour) === parseInt(nightInfo.end_hour)) {
                            nightBool = false; // edge case where start and end time are the same
                        } else {
                            nightBool = (currentTotalTime >= checkEndNb && currentTotalTime < checkStartNb);
                        }
                        if (!nightBool) continue;
                    }
                    subArray.push({originVillage: playerVillage, arrivalTime: new Date(timestamp).getHours()});
                    amountOfCombinations += 1;
                }
                allCombinations.push(subArray);
            }


        } else if (unitSelectionType === "dynamically") {
            // Subtract units_to_keep from player villages
            let unitObjectCatapult = createDefaultUnitsObject();
            unitObjectCatapult["catapult"] = keepCatapults;
            unitSpeed = configSpeed.catapult.speed;
            for (let playerVillage of playerVillages) {
                subtractUnitsFromVillage(playerVillage, unitObjectCatapult);
                minCat = getMinAmountOfCatapults(playerVillage.points, fakeLimit);
                if (playerVillage.catapult < minCat) {
                    continue;
                }
                if (spySend && playerVillage.spy <= 0) {
                    continue;
                }
                playerVillagesWithEnoughUnits.push(playerVillage);
            }
            for (let targetCoord of targetCoords) {
                let subArray = [targetCoord];
                for (let playerVillage of playerVillages) {
                    distance = twSDK.calculateDistance(playerVillage.coord, targetCoord);
                    travelTime = twSDK.getTravelTimeInSecond(distance, unitSpeed) * 1000;
                    timestamp = currentTime + travelTime;
                    timeBool = false;
                    if (arrivalTimes.length === 0) {
                        timeBool = true;
                    }
                    for (const [start, end] of arrivalTimes) {
                        if (timestamp >= start && timestamp <= end) {
                            timeBool = true;
                            break;
                        }
                    }
                    if (!timeBool) continue;
                    if (avoidNightBonus) {
                        const time = new Date(currentTime + travelTime);
                        const currentTotalTime = (time.getHours() + time.getMinutes() / 60);

                        const checkStartNb = ((parseInt(nightInfo.start_hour) + 24) - (nightBonusOffset / 60)) % 24;  // Wrap around when subtracting offsett
                        const checkEndNb = parseInt(nightInfo.end_hour);

                        if (parseInt(nightInfo.start_hour) === parseInt(nightInfo.end_hour)) {
                            nightBool = false; // edge case where start and end time are the same
                        } else {
                            nightBool = (currentTotalTime >= checkEndNb && currentTotalTime < checkStartNb);
                        }
                        if (!nightBool) continue;
                    }
                    subArray.push({originVillage: playerVillage, arrivalTime: new Date(timestamp).getHours()});
                    amountOfCombinations += 1;
                }
                allCombinations.push(subArray);
            }

        } else {
            console.error("Invalid unit selection type", unitSelectionType)
        }
        return { amountOfCombinations, allCombinations };
    }

    function sortPlayerVillages(combination, counts, usedPlayerVillages, allCombinations) {
        const threshold = 0.10; // 10% threshold
        const localStorageObject = getLocalStorage();
        const maxAttacksFromVillage = localStorageObject.max_attacks_per_village;
        if (parseInt(maxAttacksFromVillage) == 0) {
            return [combination[0]].concat(combination.slice(1).sort((a, b) => {
                let villageIdA = a.originVillage.villageId;
                let villageIdB = b.originVillage.villageId;

                let countA = counts.get(villageIdA);
                let countB = counts.get(villageIdB);

                let usedCountA = usedPlayerVillages.get(villageIdA);
                let usedCountB = usedPlayerVillages.get(villageIdB);

                let remainingTargets = allCombinations.length;

                // Compare usedPlayerVillage values if:
                // - Both counts are greater than the number of remaining targets
                // - The absolute difference between usedCounts is greater than 2
                // - And both counts are greater than 2
                if (((countA > remainingTargets * threshold && countB > remainingTargets * threshold) || Math.abs(usedCountA - usedCountB) > 1) && countA > 2 && countB > 2 && usedCountA != usedCountB) {
                    return usedCountA - usedCountB; // Lower usedPlayerVillage is better.
                } else {
                    // If not, then compare count values.
                    return countA - countB; // Lower count is better.
                }
            }));
        } else if (parseInt(maxAttacksFromVillage) > 0) {
            return [combination[0]].concat(combination.slice(1).sort((a, b) => {
                let villageIdA = a.originVillage.villageId;
                let villageIdB = b.originVillage.villageId;

                let countA = counts.get(villageIdA);
                let countB = counts.get(villageIdB);

                let usedCountA = usedPlayerVillages.get(villageIdA);
                let usedCountB = usedPlayerVillages.get(villageIdB);

                if (countA == countB) {
                    return usedCountA - usedCountB;
                } else {
                    return countA - countB;
                }
            }));
        } else {
            console.error("Invalid max_attacks_per_village", maxAttacksFromVillage)
            return combination;
        }
    }

    function chooseVillage(combination, fakeLimit, spySend, calculatedFakePairs, usedPlayerVillages) {
        const localStorageObject = getLocalStorage();
        const unitSelectionType = localStorageObject.unit_selection_type;
        const unitsToSend = localStorageObject.units_to_send;
        const maxAttacksFromVillage = localStorageObject.max_attacks_per_village;

        let eligibleVillages = [];

        const possiblePercentages = [0.25, 0.37, 0.50, 0.62, 0.75];
        let percentage = possiblePercentages[Math.floor(Math.random() * possiblePercentages.length)];

        let chosenVillage = null;
        if (unitSelectionType == "manually") {
            for (let j = 1; j < combination.length; j++) {
                let village = combination[j];
                if (usedPlayerVillages.get(village.originVillage.villageId) >= maxAttacksFromVillage && maxAttacksFromVillage > 0) {
                    continue;
                }
                if (!isValidUnitsToSend(village.originVillage, unitsToSend)) {
                    continue;
                }
                if (calculatedFakePairs.some(pair => pair[0] === village.originVillage && pair[1] === combination[0])) {
                    continue;
                }
                eligibleVillages.push(village);
                if(eligibleVillages.length > Math.floor(combination.length * percentage)) {
                    break;
                }
            }
        } else if (unitSelectionType == "dynamically") {
            for (let j = 1; j < combination.length; j++) {
                let village = combination[j];
                if (usedPlayerVillages.get(village.originVillage.villageId) >= maxAttacksFromVillage && maxAttacksFromVillage > 0) {
                    continue;
                }
                const minCat = getMinAmountOfCatapults(village.originVillage.points, fakeLimit);
                if (!(village.originVillage.catapult >= minCat)) {
                    continue;
                }
                if (calculatedFakePairs.some(pair => pair[0] === village.originVillage && pair[1] === combination[0])) {
                    continue;
                }
                if (spySend && village.originVillage.spy <= 0) {
                    continue;
                }
                eligibleVillages.push(village);
                if(eligibleVillages.length > Math.floor(combination.length * percentage)) {
                    break;
                }
            }
        } else {
            console.error("Invalid unit selection type", unitSelectionType)
        }

        if (eligibleVillages.length == 0) {
            return null;
        }

        for (let village of eligibleVillages) {
            if(!chosenVillage) {
                chosenVillage = village;
            } else {
                if(ARRIVAL_HOURS.get(chosenVillage.arrivalTime) > ARRIVAL_HOURS.get(village.arrivalTime)) {
                    chosenVillage = village;
                }
            }
        }

        if(ARRIVAL_HOURS.has(chosenVillage.arrivalTime)) {
            ARRIVAL_HOURS.set(chosenVillage.arrivalTime, ARRIVAL_HOURS.get(chosenVillage.arrivalTime) + 1);
        } else {
            ARRIVAL_HOURS.set(chosenVillage.arrivalTime, 1);
        }

        return chosenVillage.originVillage;
    }

    async function updateTotalPossibleNumberOfAttacks() {
        if (Date.now() - LAST_REQUEST_TIME < STANDARD_DELAY) {
            if (DEBUG) {
                console.debug(`${scriptInfo} Too many requests!`);
            }
            UI.ErrorMessage(twSDK.tt('Too many requests! Please wait a moment before trying again.'));
            return;
        }
        LAST_REQUEST_TIME = Date.now();
        let playerVillages;
        const groupId = getLocalStorage().chosen_group;

        try {
            playerVillages = await fetchTroopsForCurrentGroup(parseInt(groupId));
            if (DEBUG) {
                console.debug(`${scriptInfo} Player villages: `, playerVillages);
            }
        } catch (error) {
            UI.ErrorMessage(twSDK.tt('There was an error!'));
            console.error(`${scriptInfo} Error:`, error);
            return;
        }
        let localStorageObject = getLocalStorage();
        let totalPossibleAttacks = 0;
        let spySend = localStorageObject.send_spy;
        let units_to_send = localStorageObject.units_to_send;
        let units_to_keep = localStorageObject.units_to_keep;
        let keep_catapults = localStorageObject.keep_catapults;
        let unitSelectionType = localStorageObject.unit_selection_type;
        let max_attacks_per_village = parseInt(localStorageObject.max_attacks_per_village);

        let keepCatapultsObject = createDefaultUnitsObject();
        keepCatapultsObject["catapult"] = keep_catapults;

        let unitsToSend = createDefaultUnitsObject();
        if (unitSelectionType === "dynamically") {
            if (spySend === "yes") {
                unitsToSend["spy"] = 1;
            }
        } else if (unitSelectionType === "manually") {
            unitsToSend = units_to_send;
        } else {
            console.error("Invalid unit selection type", unitSelectionType)
        }

        for (let playerVillage of playerVillages) {
            let numberOfAttacksOfThisVillage = 0;
            if (unitSelectionType === "dynamically") {
                unitsToSend["catapult"] = getMinAmountOfCatapults(getVillagePointsFromCoord(playerVillage.coord), parseInt(worldConfig.config.game.fake_limit));
                subtractUnitsFromVillage(playerVillage, keepCatapultsObject);
            } else if (unitSelectionType === "manually") {
                subtractUnitsFromVillage(playerVillage, units_to_keep);
            } else {
                console.error("Invalid unit selection type", unitSelectionType)
            }
            while (isValidUnitsToSend(playerVillage, unitsToSend)) {
                totalPossibleAttacks += 1;
                numberOfAttacksOfThisVillage += 1;
                if (max_attacks_per_village > 0 && numberOfAttacksOfThisVillage >= max_attacks_per_village) {
                    break;
                }
                subtractUnitsFromVillage(playerVillage, unitsToSend);
            }
        }
        jQuery('#calculateTotalPossibleAttacks').text(`${totalPossibleAttacks}`);
    }

    // Helper: Parses boolean
    function parseBool(input) {
        if (typeof input === 'string') {
            return input.toLowerCase() === 'true';
        } else if (typeof input === 'boolean') {
            return input;
        } else {
            console.error(`${scriptInfo}: Invalid input: needs to be a string or boolean.`);
            return false;
        }
    }

    // Helper: Checks if the village has enough units
    function isValidUnitsToSend(playerVillage, unitsToSend) {
        let atLeastOneUnitToSend = false;
        for (const unitType in unitsToSend) {
            const requiredUnits = unitsToSend[unitType];
            const availableUnits = playerVillage[unitType];
            if ((requiredUnits === -1 && availableUnits > 0) || (requiredUnits > 0 && availableUnits >= requiredUnits)) {
                atLeastOneUnitToSend = true;
            }
            if (requiredUnits !== -1 && availableUnits < requiredUnits) {
                return false;
            }
        }
        return atLeastOneUnitToSend;
    }

    // Helper: Subtracts units of a unitsToSubtract object from the given village
    function subtractUnitsFromVillage(playerVillage, unitsToSubtract) {
        for (const unitType in unitsToSubtract) {
            if (unitsToSubtract[unitType] == 0) {
                continue;
            }
            if (playerVillage.hasOwnProperty(unitType)) {
                if (unitsToSubtract[unitType] === -1) {
                    // All of the units are sent
                    playerVillage[unitType] = 0;
                } else {
                    playerVillage[unitType] -= unitsToSubtract[unitType];
                }
            } else {
                console.error("Saved unit type not found! This should never happen!", unitType);
            }
        }
    }
    //Helper: Creates a default units object
    function createDefaultUnitsObject() {
        const defaultUnitsObject = {};
        const gameDataUnits = game_data.units;

        for (const unitType of gameDataUnits) {
            defaultUnitsObject[unitType] = 0;
        }

        return defaultUnitsObject;
    }

    function calculateArrivalTimeFromVillageIds(villageId1, villageId2, unitSpeed) {
        const currentTime = parseInt(Date.now());
        const villageCoord1 = villageMap.get(villageId1);
        const villageCoord2 = villageMap.get(villageId2);
        const distance = twSDK.calculateDistance(villageCoord1, villageCoord2);
        const travelTime = parseInt(twSDK.getTravelTimeInSecond(distance, unitSpeed)) * 1000;
        const arrivalTime = parseInt(currentTime) + parseInt(travelTime);
        return arrivalTime;
    }

    // origin, target, slowestUnit, arrivalTime, type, drawIn=true, sent=false, units
    function exportAttacks() {
        if (ALL_ATTACKS.length === 0) {
            UI.ErrorMessage(twSDK.tt('No attacks to export!'));
            return;
        }
        let exportWB = "";
        for (let attack of ALL_ATTACKS) {
            let {
                origin,
                target,
                slowestUnit,
                arrivalTime,
                type,
                drawIn,
                sent,
                units
            } = attack;

            let arrTimestamp = (new Date(arrivalTime).getTime()) + parseInt(type);
            exportWB += origin + "&" + target + "&" + slowestUnit +
                "&" + arrTimestamp + "&" + type + "&" + drawIn + "&" + sent + "&";

            let unitsArray = [];
            for (let unit in units) {
                unitsArray.push(unit + "=" + btoa(units[unit]));
            }
            exportWB += unitsArray.join('/') + "\n";
        }
        if (DEBUG) console.debug(`${scriptInfo}: Created export string: ${exportWB}`);
        twSDK.copyToClipboard(exportWB);
    }

    // Helper: Function to calculate units to send
    function calculateUnitsToSend(unitObject, villageData, unitsToKeep) {
        let unitAmount;
        let unitsToSend = {};

        for (const unitType in unitObject) {
            if (unitObject[unitType] > 0) {
                // If the value is greater than 0, add to the unitsToSend object
                unitsToSend[unitType] = unitObject[unitType];
            } else if (unitObject[unitType] === -1 && villageData[unitType] >= 0) {
                // If the value is -1, use the value from unchangedTroopData if available
                if (unitsToKeep[unitType] >= 0) {
                    unitAmount = (villageData[unitType] - unitsToKeep[unitType]) > 0 ? (villageData[unitType] - unitsToKeep[unitType]) : 0; // hope this works
                } else {
                    unitAmount = 0;
                    console.error("Too many -1, idk whats going on")
                }
                unitsToSend[unitType] = unitAmount;
            }
        }

        return unitsToSend;
    }

    // Helper: Function to generate a link from villageIds
    function generateLink(villageId1, villageId2, unitObject, villageData, unitsToKeep) {
        let completeLink = getCurrentURL();
        if (twSDK.sitterId.length > 0) {
            completeLink += `?${twSDK.sitterId}&village=${villageId1}&screen=place&target=${villageId2}`;
        } else {
            completeLink += `?village=${villageId1}&screen=place&target=${villageId2}`;
        }



        const unitsToSend = calculateUnitsToSend(unitObject, villageData, unitsToKeep);

        for (const unitType in unitsToSend) {
            completeLink += `&${unitType}=${unitsToSend[unitType]}`;
        }

        return completeLink;
    }

    // Helper: Returns the slowest unit speed of the units to send
    function getSlowestSpeed(unitsToSend, unitInfo) {
        const unitSpeeds = [];
        for (const unitType in unitsToSend) {
            if (unitsToSend[unitType] === -1 || unitsToSend[unitType] > 0) {
                // if (DEBUG) console.debug(`${scriptInfo} Unit type: ${unitType}  Speed ${unitInfo[unitType]?.speed}`);
                const speed = parseInt(unitInfo[unitType]?.speed) || 0;
                unitSpeeds.push(speed);
            }
        }
        return Math.max(...unitSpeeds, 0); // Return the highest speed, or 0 if the array is empty
    }
    function getSlowestUnit(unitsToSend, unitInfo) {
        let slowestUnit = "";
        let slowestSpeed = 0;
        for (const unitType in unitsToSend) {
            if (unitsToSend[unitType] === -1 || unitsToSend[unitType] > 0) {
                // if (DEBUG) console.debug(`${scriptInfo} Unit type: ${unitType}`);
                const speed = parseInt(unitInfo[unitType]?.speed) || 0;
                // if (DEBUG) console.debug(`${scriptInfo} Speed: ${speed}`);
                if (speed > slowestSpeed) {
                    // if (DEBUG) console.debug(`${scriptInfo} New slowest unit: ${unitType}`);
                    slowestSpeed = speed;
                    slowestUnit = unitType;
                }
            }
        }
        return slowestUnit;
    }

    // Helper: Villages array to dictionary, to quickly search with coordinates
    function villageArrayToDict(villageArray) {
        let dict = {};
        let playerPoints;
        for (let i = 0; i < villageArray.length; i++) {
            let key = villageArray[i][2] + '|' + villageArray[i][3]; //assuming x is at arr[i][2] and y is at arr[i][3]
            let playerId = villageArray[i][4]; //assuming player id is at arr[i][4]
            if (parseInt(playerId) === 0) {
                playerPoints = 9999999999; // barbs get alot of points to always avoid ratio filter
            } else {
                playerPoints = allPlayers.get(playerId)[3]; //assuming player points is at index 3 in the player array
            }
            dict[key] = [villageArray[i][0], villageArray[i][5], playerPoints]; //assuming id is at arr[i][0] and points is at arr[i][5]
        }
        return dict;
    }

    // Helper: Creates village map that maps villageid to village coords
    function createVillageMap(villageArray) {
        let villageMap = new Map();
        for (let i = 0; i < villageArray.length; i++) {
            let villageId = villageArray[i][0];
            let villageCoord = villageArray[i][2] + '|' + villageArray[i][3];
            villageMap.set(parseInt(villageId), villageCoord);
        }
        return villageMap;
    }

    // Helper:  Get Village ID from a coordinate
    function getVillageIdFromCoord(coord) {
        try {
            let village = villageData[coord];
            return village[0];
        } catch (error) {
            console.warn(`No village found for coordinate ${coord}`);
        }
    }

    // Helper: Get village points from village.txt with coordinates
    function getVillagePointsFromCoord(coord) {
        try {
            let village = villageData[coord];
            return village[1];
        } catch (error) {
            console.warn(`No village found for coordinate ${coord}`);
        }
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // Helper: Create a function to count the frequency of each value in the remaining value arrays
    function getCounts(array) {
        let counts = new Map();

        array.forEach((subArray) => {
            subArray.slice(1).forEach((object) => {
                let villageId = object.originVillage.villageId;  // Renamed variable

                if (!counts.has(villageId)) {
                    counts.set(villageId, 1);
                } else {
                    let updatedCount = counts.get(villageId);
                    counts.set(villageId, updatedCount + 1);
                }
            });
        });

        return counts;
    }

    // Helper: Check if coord exists as village
    function checkIfVillageExists(coord) {
        return coord in villageData;
    }

    //  Helper: Get current URL
    function getCurrentURL() {
        return window.location.protocol + "//" + window.location.host + window.location.pathname;;
    }

    // Helper: Get minimum amount of catapults to send depending on if fakeLimit is active
    function getMinAmountOfCatapults(playerVillagePoints, fakeLimit) {
        let reqCatapults = 1;
        if (fakeLimit === 0) {
            return reqCatapults;
        } else {
            // Get the required amount of pop and calculate the next higher amount of catapults to meet the demand
            reqCatapults = Math.floor(((playerVillagePoints * (fakeLimit / 100)) + (TROOP_POP.catapult - 1)) / TROOP_POP.catapult);
            // If the required catapult amount is 0 we still need at least 1 to send a fake
            return (reqCatapults > 0) ? reqCatapults : 1;
        }
    }

    function clearButtons() {
        // Fetch the 'open_tabs' div where buttons will be appended
        let openTabsDiv = document.getElementById("open_tabs");

        // Reset the buttons
        openTabsDiv.innerHTML = `                    <div>
        <h2 id="h2_tabs"><center style="margin:10px"><u>${twSDK.tt('Open Tabs')}</u></center></h2>
    </div>
    <div id="exportWBFG">
        <button id="exportPlanFG" class="btn ra-mb10">${twSDK.tt('Export WB')}</button>
    </div>`;
        // Make the 'open_tabs' div invisible
        openTabsDiv.style.display = "none";

    }

    function createSendButtons(URIs) {
        // Get the number of attacks per button
        let nrSplit = parseInt(getLocalStorage().attack_per_button);
        let delay = parseInt(getLocalStorage().delay);

        if (DEBUG) console.debug(`${scriptInfo} Number of attacks per button: ${nrSplit}`);

        // Fetch the 'open_tabs' div where buttons will be appended
        let openTabsDiv = document.getElementById("open_tabs");

        // Reset the buttons
        clearButtons();
        jQuery('#exportPlanFG').on('click', function () {
            if (DEBUG) console.debug(`${scriptInfo} Export Plan`);
            exportAttacks();
            UI.InfoMessage(twSDK.tt('Exported and copied to clipboard'));
        });

        // Calculate the number of required buttons
        let nrButtons = Math.ceil(URIs.length / nrSplit);
        if (DEBUG) console.debug(`${scriptInfo} Required number of buttons: ${nrButtons}`);


        // Create and append buttons
        for (let i = 0; i < nrButtons; i++) {
            let button = document.createElement('button');
            // Add CSS classes to the button
            button.classList.add('btn', 'btn-confirm-yes', 'sb-mb5');

            let start = i * nrSplit + 1; // calculate starting index for display
            let end = Math.min(URIs.length, start + nrSplit - 1); // calculate ending index, don't exceed total URIs

            // Label for the button
            button.textContent = `[ ${start}-${end} ]`;

            // Add a click event listener to each button
            button.addEventListener('click', function () {
                // Set button to grey after it's clicked
                this.classList.remove('btn-confirm-yes');
                this.classList.add('btn-confirm-clicked');
                // Open each link in new tab
                URIs.slice(start - 1, end).forEach((link, index) => {  // adjust start for zero-based index
                    setTimeout(() => {
                        window.open(link);
                        // Find the corresponding attack and set its 'sent' property to true
                        let attack = ALL_ATTACKS.find(attack => attack.link === link);
                        if (attack) {
                            attack.sent = true;
                        }
                    }, index * delay);
                })
            });
            // Add an additional event listener to prevent the "Enter" key from triggering the button
            button.addEventListener('keydown', function (event) {
                if (event.key === 'Enter') {
                    // Prevent the default behavior for the "Enter" key
                    event.preventDefault();
                }
            });

            // Append button to 'open_tabs' div
            openTabsDiv.appendChild(button);
        }
        // Make the 'open_tabs' div visible
        openTabsDiv.style.display = "block";
    }

    // Helper: Render groups select
    function renderGroupsFilter() {
        const groupId = getLocalStorage().chosen_group;
        let groupsFilter = `
    <select name="group-filter" id="GroupsFilter">
    `;

        for (const [_, group] of Object.entries(groups.result)) {
            const { group_id, name } = group;
            const isSelected = parseInt(group_id) === parseInt(groupId) ? 'selected' : '';
            if (name !== undefined) {
                groupsFilter += `
            <option value="${group_id}" ${isSelected}>
                ${name}
            </option>
        `;
            }
        }

        groupsFilter += `
    </select>
    `;

        return groupsFilter;
    }

    // Helper: Render send spy select
    function renderSpySelect() {
        const sendSpy = getLocalStorage().send_spy;
        let contentSpySelect = `
        <select id="SendSpy">
        `;

        if (sendSpy === "yes") {
            contentSpySelect += `
            <option value="yes" selected>${twSDK.tt("Yes")}</option>
            <option value="no">${twSDK.tt("No")}</option>
            `
        } else {
            contentSpySelect += `
            <option value="yes">${twSDK.tt("Yes")}</option>
            <option value="no" selected>${twSDK.tt("No")}</option>
            `
        }

        contentSpySelect += `</select>`;
        return contentSpySelect;
    }

    // Helper function to check array equality
    function isEqual(arr1, arr2) {
        return arr1[0] === arr2[0] && arr1[1] === arr2[1];
    }

    // Helper: Render unit selection type
    function renderUnitSelectionType() {
        const unitSelectionType = getLocalStorage().unit_selection_type;
        let contentUnitSelectionType = `
        <select id="UnitSelectionType">
        `;

        if (unitSelectionType === "dynamically") {
            contentUnitSelectionType += `
            <option value="dynamically" selected>${twSDK.tt("dynamically")}</option>
            <option value="manually">${twSDK.tt("manually")}</option>
            `;
        } else {
            contentUnitSelectionType += `
            <option value="dynamically">${twSDK.tt("dynamically")}</option>
            <option value="manually" selected>${twSDK.tt("manually")}</option>
            `;
        }

        contentUnitSelectionType += `</select>`;
        return contentUnitSelectionType;
    }

    //Helper: Render dynamic unit selection
    function renderDynamicUnitSelection() {
        const spySelect = renderSpySelect();
        const unitSelectionType = getLocalStorage().unit_selection_type;
        const keepCatapults = getLocalStorage().keep_catapults;
        let visibility;
        if (unitSelectionType === "dynamically") {
            visibility = `style="display: block;"`
        } else {
            visibility = `style="display: none;"`
        }
        let contentDynamicUnitSelection = `
        <div class="ra-mb10" id="dynamic-unit" ${visibility}>
            <div class="sb-grid sb-grid-2">
                <fieldset class="sb-fieldset">
                    <legend>${twSDK.tt('Send Spy?')}</legend>
                    ${spySelect}
                </fieldset>
                <fieldset class="sb-fieldset">
                    <legend>${twSDK.tt('Keep Catapults')}</legend>
                    <input id="KeepCatapults" type="number" value="${keepCatapults}">
                </fieldset>
            </div>
        </div>
        `;

        return contentDynamicUnitSelection;
    }

    //Helper: Render manual unit selection
    function renderManualUnitSelection() {
        const unitSelectionType = getLocalStorage().unit_selection_type;
        let visibility;
        if (unitSelectionType === "dynamically") {
            visibility = `style="display: none;"`
        } else {
            visibility = `style="display: block;"`
        }
        const units = game_data.units;
        let contentManualUnitSelection = "";
        const unitsToIgnore = ['militia'];
        let unitTableSend = buildUnitsPicker(unitsToIgnore, "send", 'number');
        let unitTableKeep = buildUnitsPicker(unitsToIgnore, "keep", 'number');


        contentManualUnitSelection = `
        <div class="ra-mb10" id="manual-unit" ${visibility}>
            <fieldset class="sb-fieldset">
                <legend>${twSDK.tt('Enter units to send (-1 for all troops)')}</legend>
                ${unitTableSend}
            </fieldset>
            <fieldset class="sb-fieldset">
                <legend>${twSDK.tt('Enter units to keep (-1 for all troops)')}</legend>
                ${unitTableKeep}
            </fieldset>
        </div>
        `;

        return contentManualUnitSelection;
    }

    //Helper: Render Arrival time selection
    function renderArrivalTimeSelector() {
        let contentArrivalTimeSelector = `
            <fieldset class="sb-fieldset" id="arrivalTimeFieldset">
                <legend>${twSDK.tt("Arrival time")}</legend>
                <div class="sb-grid sb-grid-5 ra-mb10">
                    <div>
                        <input type="datetime-local" id="startDateTime" required>
                    </div>
                    <div>
                        <input type="datetime-local" id="endDateTime" required>
                    </div>
                    <div>
                        <button type="button" class="add-entry-btn" id="addTimeEntry">+</button>
                    </div>
                    <div>
                        <button type="button" class="add-entry-btn deleteAllEntries" id="deleteAllEntries">${twSDK.tt("Delete all arrival times")}</button>
                    </div>
                    <div class="ra-tac">
                        <button id="resetInput" class="add-entry-btn deleteAllEntries" >${twSDK.tt('Reset Input')}</button>
                    </div>
                </div>
            </fieldset>
        `;
        return contentArrivalTimeSelector;
    }
    // Helper: Fetch village groups
    async function fetchVillageGroups() {
        let fetchGroups = '';
        if (game_data.player.sitter > 0) {
            fetchGroups = game_data.link_base_pure + `groups&mode=overview&ajax=load_group_menu&t=${game_data.player.id}`;
        } else {
            fetchGroups = game_data.link_base_pure + 'groups&mode=overview&ajax=load_group_menu';
        }
        const villageGroups = await jQuery.get(fetchGroups).then((response) => response).catch((error) => {
            UI.ErrorMessage('Error fetching village groups!');
            console.error(`${scriptInfo} Error:`, error);
        }
        );

        return villageGroups;
    }
    function formatLocalizedTime(date) {
        return date.toLocaleDateString(undefined, {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: false,
        });
    }
    async function fetchTroopsForCurrentGroup(groupId) {
        const mobileCheck = jQuery('#mobileHeader').length > 0;
        const totalVillages = parseInt(game_data.player.villages);
        const troopsForGroup = [];

        // Function to fetch and process data for a single page
        async function fetchPageData(page) {
            const response = await jQuery.get(
                game_data.link_base_pure +
                `overview_villages&mode=combined&group=${groupId}&page=${page}`
            );

            const htmlDoc = jQuery.parseHTML(response);
            const homeTroops = [];

            const pageSize = parseInt(jQuery(htmlDoc).find("input[name='page_size']").val(), 10);

            if (mobileCheck) {
                let table = jQuery(htmlDoc).find('#combined_table tr.nowrap');
                for (let i = 0; i < table.length; i++) {
                    let objTroops = {};
                    let villageId = parseInt(
                        table[i]
                            .getElementsByClassName('quickedit-vn')[0]
                            .getAttribute('data-id')
                    );
                    let listTroops = Array.from(
                        table[i].getElementsByTagName('img')
                    )
                        .filter((e) => e.src.includes('unit'))
                        .map((e) => ({
                            name: e.src
                                .split('unit_')[1]
                                .replace('@2x.webp', ''),
                            value: parseInt(
                                e.parentElement.nextElementSibling.innerText
                            ),
                        }));
                    listTroops.forEach((item) => {
                        objTroops[item.name] = item.value;
                    });

                    objTroops.villageId = villageId;
                    objTroops.coord = villageMap.get(parseInt(villageId));

                    homeTroops.push(objTroops);
                }
            } else {
                const combinedTableRows = jQuery(htmlDoc).find(
                    '#combined_table tr.nowrap'
                );
                const combinedTableHead = jQuery(htmlDoc).find(
                    '#combined_table tr:eq(0) th'
                );

                const combinedTableHeader = [];

                // collect possible buildings and troop types
                jQuery(combinedTableHead).each(function () {
                    const thImage = jQuery(this).find('img').attr('src');
                    if (thImage) {
                        let thImageFilename = thImage.split('/').pop();
                        thImageFilename = thImageFilename.replace('.webp', '');
                        combinedTableHeader.push(thImageFilename);
                    } else {
                        combinedTableHeader.push(null);
                    }
                });

                // collect possible troop types
                combinedTableRows.each(function () {
                    let rowTroops = {};

                    combinedTableHeader.forEach((tableHeader, index) => {
                        if (tableHeader) {
                            if (tableHeader.includes('unit_')) {
                                const villageId = jQuery(this)
                                    .find('td:eq(1) span.quickedit-vn')
                                    .attr('data-id');
                                const unitType = tableHeader.replace(
                                    'unit_',
                                    ''
                                );
                                rowTroops = {
                                    ...rowTroops,
                                    villageId: parseInt(villageId),
                                    [unitType]: parseInt(
                                        jQuery(this)
                                            .find(`td:eq(${index})`)
                                            .text()
                                    ),
                                };
                            }
                        }
                    });
                    rowTroops.coord = villageMap.get(parseInt(rowTroops.villageId));
                    homeTroops.push(rowTroops);
                });
            }

            return { homeTroops, pageSize };
        }

        try {
            if (totalVillages <= 1000) {
                // If the player has less than or equal to 1000 villages, use page=-1 for efficiency
                UI.SuccessMessage(twSDK.tt('Fetching troop data...'));
                const { homeTroops } = await fetchPageData(-1);
                troopsForGroup.push(...homeTroops);
            } else {
                UI.SuccessMessage(twSDK.tt('Fetching troop data for a large account. This may take a while...'));
                let page = 0;
                let totalProcessedVillages = 0;
                let pageSize = 0;

                // Loop through pages until all villages are processed
                while (totalProcessedVillages < totalVillages) {
                    const { homeTroops, pageSize: currentPageSize } = await fetchPageData(page);
                    troopsForGroup.push(...homeTroops);
                    totalProcessedVillages += homeTroops.length;

                    // Update pageSize if it's the first page
                    if (page === 0) {
                        pageSize = currentPageSize;
                    }

                    // If the number of processed villages is less than the page size, we have reached the last page
                    if (homeTroops.length < pageSize) {
                        break;
                    }

                    page++;
                    await new Promise(resolve => setTimeout(resolve, 200)); // Wait for 200 ms before the next request
                }
                UI.SuccessMessage(twSDK.tt('Troop data fetched successfully!'));
            }

            // Check if we have data for the same number of villages as the player has in the game_data object
            if (troopsForGroup.length !== totalVillages) {
                console.error("Mismatch in the number of villages processed:", troopsForGroup.length, "expected:", totalVillages);
            }

            return troopsForGroup;
        } catch (error) {
            UI.ErrorMessage(
                twSDK.tt('There was an error while fetching the data!')
            );
            console.error(`${scriptInfo} Error:`, error);
            return [];
        }
    }

    // Function to initialize date and time entries from local storage
    function initializeSavedEntries() {
        const localStorageObject = getLocalStorage();
        const { arrival_times } = localStorageObject;

        const entriesTable = document.createElement('table');
        entriesTable.classList.add('entries-table');
        entriesTable.id = 'arrivalEntryTable';

        // Add table headers
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = `
    <th class="ra-tac">${twSDK.tt('From')}</th>
    <th class="ra-tac">${twSDK.tt('To')}</th>
    <th class="ra-tac">${twSDK.tt('Delete Entry')}</th>
    `;
        entriesTable.appendChild(headerRow);

        if (arrival_times && arrival_times.length > 0) {
            entriesTable.style.display = 'table'; // Make the table visible

            arrival_times.forEach((timeSpan, index) => {
                const newEntryRow = document.createElement('tr');
                newEntryRow.classList.add('entry-row');

                const startTime = formatLocalizedTime(new Date(timeSpan[0]));
                const endTime = formatLocalizedTime(new Date(timeSpan[1]));

                newEntryRow.innerHTML = `
            <td class="entry-start">${startTime}</td>
            <td class="entry-end">${endTime}</td>
            <td class="ra-tac"><button class="delete-entry-btn" id="btn-${timeSpan[0]}-${timeSpan[1]}">X</button></td>
        `;

                entriesTable.appendChild(newEntryRow);
            });
        } else {
            entriesTable.style.display = 'none'; // Hide the table if there are no entries
        }

        document.getElementById('arrivalTimeFieldset').appendChild(entriesTable);
    }

    function resetInput() {
        localStorageObject = getLocalStorage();
        const defaultSettings = {
            chosen_group: 0,
            attack_per_button: DEFAULT_ATTACKS_PER_BUTTON,
            delay: DEFAULT_DELAY,
            unit_selection_type: localStorageObject.unit_selection_type,
            max_attacks_per_village: DEFAULT_MAX_ATTACKS_PER_VILLAGE,
            send_spy: 'yes',
            keep_catapults: 0,
            units_to_send: {},
            units_to_keep: {},
            arrival_times: localStorageObject.arrival_times,
            target_coordinates: [],
            filter_ratio: false,
            avoid_nightbonus: true,
            buffer_nightbonus: NIGHT_BONUS_OFFSET,
        };

        // Initialize units_to_send and units_to_keep with each unit set to 0
        game_data.units.forEach(unit => {
            defaultSettings.units_to_send[unit] = 0;
            defaultSettings.units_to_keep[unit] = 0;
        });



        saveLocalStorage(defaultSettings);
        const fakeGeneratorDiv = document.getElementById('FakeGenerator');
        if (fakeGeneratorDiv) {
            fakeGeneratorDiv.remove();
        }
        renderUI();
        addEventHandlers();
    }

    // Service: Function to get settings from localStorage
    function getLocalStorage() {
        const localStorageSettings = localStorage.getItem('sbFakegeneratorSettings');

        expectedSettings = [
            'chosen_group',
            'attack_per_button',
            'delay',
            'unit_selection_type',
            'max_attacks_per_village',
            'send_spy',
            'keep_catapults',
            'units_to_send',
            'units_to_keep',
            'arrival_times',
            'target_coordinates',
            'filter_ratio',
            'avoid_nightbonus',
            'buffer_nightbonus'
        ]
        let missingSettings = []
        if (localStorageSettings) {
            // Check if all expected settings are present in localStorage
            missingSettings = expectedSettings.filter(setting => !localStorageSettings.includes(setting));
        }

        if (localStorageSettings && missingSettings.length === 0) {
            // If settings exist in localStorage, parse and return the object
            return JSON.parse(localStorageSettings);
        } else {
            // If no settings found, create an object with default values
            const defaultSettings = {
                chosen_group: 0,
                attack_per_button: DEFAULT_ATTACKS_PER_BUTTON,
                delay: DEFAULT_DELAY,
                unit_selection_type: 'dynamically',
                max_attacks_per_village: DEFAULT_MAX_ATTACKS_PER_VILLAGE,
                send_spy: 'yes',
                keep_catapults: 0,
                units_to_send: {},
                units_to_keep: {},
                arrival_times: [],
                target_coordinates: [],
                filter_ratio: false,
                avoid_nightbonus: true,
                buffer_nightbonus: NIGHT_BONUS_OFFSET,
            };

            // Initialize units_to_send and units_to_keep with each unit set to 0
            game_data.units.forEach(unit => {
                defaultSettings.units_to_send[unit] = 0;
                defaultSettings.units_to_keep[unit] = 0;
            });
            saveLocalStorage(defaultSettings);

            return defaultSettings;
        }
    }

    //Service: Function to save settings to localStorage
    function saveLocalStorage(settingsObject) {
        // Stringify and save the settings object
        localStorage.setItem('sbFakegeneratorSettings', JSON.stringify(settingsObject));
    }

    // Service: Fetch world config and needed data
    async function fetchWorldConfigData() {
        try {
            const worldUnitInfo = await twSDK.getWorldUnitInfo();
            const villages = await twSDK.worldDataAPI('village');
            const players = await twSDK.worldDataAPI('player');
            const worldConfig = await twSDK.getWorldConfig();
            return { players, villages, worldUnitInfo, worldConfig };
        } catch (error) {
            UI.ErrorMessage(
                twSDK.tt('There was an error while fetching the data!')
            );
            console.error(`${scriptInfo} Error:`, error);
        }
    }

    // Copied and edited from twSDK by RedAlert to be able to call it twice and get different IDs and to not have the checked stuff
    // Some cleaned up version of this should be in the sdk probably
    function buildUnitsPicker(unitsToIgnore, id_prefix, type = 'checkbox') {
        let unitsTable = ``;

        let thUnits = ``;
        let tableRow = ``;

        game_data.units.forEach((unit) => {
            if (!unitsToIgnore.includes(unit)) {

                thUnits += `
                    <th class="ra-text-center">
                        <label for="${id_prefix}_unit_${unit}">
                            <img src="/graphic/unit/unit_${unit}.webp">
                        </label>
                    </th>
                `;

                tableRow += `
                    <td class="ra-text-center">
                        <input name="ra_chosen_units" type="${type}" id="${id_prefix}_unit_${unit}" class="ra-unit-selector" value="0" />
                    </td>
                `;
            }
        });

        unitsTable = `
            <table class="ra-table ra-table-v2" width="100%" id="${id_prefix}_raUnitSelector">
                <thead>
                    <tr>
                        ${thUnits}
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        ${tableRow}
                    </tr>
                </tbody>
            </table>
        `;

        return unitsTable;
    }
})();

})();
