// ==UserScript==
// @name         Die Stämme - Berichte Umbenennen + Dorfnotiz V5.6
// @namespace    http://tampermonkey.net/
// @version      5.6
// @description  Benennt einzelne oder markierte Berichte stabil nacheinander um und überschreibt die zugehörige Dorfnotiz
// @author       Daniel
// @match        https://*.die-staemme.de/game.php*
// @run-at       document-start
// @grant        none
// ==/UserScript==

function initBerichteUmbenennenUndDorfnotiz() {
    'use strict';

    const STORAGE_KEY = 'ds_report_rename_account_name_v50';
    const BTN_ID = 'ds-quickedit-rename-btn-v51';
    const INFO_ID = 'ds-quickedit-account-info-v51';
    const BATCH_KEY = 'ds_report_batch_v55';
    const WRAPPER_ID = 'ds-report-batch-wrapper-v55';
    const WORKER_FRAME_ID = 'ds-report-batch-worker-v55';
    const WORKER_MESSAGE = 'ds-report-batch-result-v55';
    const PROCESS_TIMEOUT_MS = 25000;

    const UNIT_COUNT = 13;

    const BUILDING_SHORT = {
        'Hauptgebäude': 'HG',
        'Kaserne': 'Kas',
        'Stall': 'Stall',
        'Werkstatt': 'WS',
        'Adelshof': 'AS',
        'Schmiede': 'Schm',
        'Versammlungsplatz': 'VP',
        'Marktplatz': 'MP',
        'Holzfällerlager': 'Holz',
        'Holzfaellerlager': 'Holz',
        'Holzfäller': 'Holz',
        'Lehmgrube': 'Lehm',
        'Eisenmine': 'Eisen',
        'Bauernhof': 'BH',
        'Speicher': 'Spei',
        'Versteck': 'Verst',
        'Wall': 'Wall',
        'Wachturm': 'WT',
        'Statue': 'Statue'
    };


    function isReportDetailPage() {
        const url = new URL(location.href);
        return url.searchParams.get('screen') === 'report' && !!url.searchParams.get('view');
    }

    function isWorkerFrame() {
        const url = new URL(location.href);
        return window.top !== window.self && url.searchParams.get('_dsworker') === '1';
    }

    function getWorkerIndex() {
        const value = Number(new URL(location.href).searchParams.get('_dsindex'));
        return Number.isInteger(value) && value >= 0 ? value : null;
    }

    function loadBatch() {
        try {
            const value = JSON.parse(localStorage.getItem(BATCH_KEY) || 'null');
            return value && Array.isArray(value.urls) ? value : null;
        } catch (error) {
            console.warn('Stapelstatus konnte nicht gelesen werden:', error);
            return null;
        }
    }

    function saveBatch(batch) {
        localStorage.setItem(BATCH_KEY, JSON.stringify(batch));
    }

    function clearBatch() {
        localStorage.removeItem(BATCH_KEY);
    }

    function withTimeout(promise, timeoutMs, message) {
        return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error(message)), timeoutMs))
        ]);
    }

    function forceNavigate(rawUrl) {
        const url = new URL(rawUrl, location.href);
        url.searchParams.set('_dsbatch', String(Date.now()));
        // replace erzwingt einen vollständigen Seitenaufruf und verhindert,
        // dass die interne Spielnavigation den Stapel nach einigen Berichten anhält.
        window.location.replace(url.toString());
    }

    function collectSelectedReportUrls() {
        const urls = [];
        const seen = new Set();
        const checked = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'));

        for (const checkbox of checked) {
            const row = checkbox.closest('tr');
            if (!row) continue;
            const links = Array.from(row.querySelectorAll('a[href*="screen=report"][href*="view="]'));
            const link = links.find(a => {
                try {
                    return !!new URL(a.href, location.href).searchParams.get('view');
                } catch (_) {
                    return false;
                }
            });
            if (!link) continue;

            const absolute = new URL(link.href, location.href).toString();
            if (!seen.has(absolute)) {
                seen.add(absolute);
                urls.push(absolute);
            }
        }
        return urls;
    }

    function startBatchFromOverview(btn) {
        const urls = collectSelectedReportUrls();
        if (!urls.length) {
            if (window.UI?.ErrorMessage) UI.ErrorMessage('Bitte zuerst mindestens einen Bericht markieren.', 3500);
            else alert('Bitte zuerst mindestens einen Bericht markieren.');
            return;
        }

        const batch = {
            active: true,
            urls,
            index: 0,
            success: 0,
            failed: 0,
            errors: [],
            returnUrl: location.href,
            startedAt: Date.now()
        };
        batch.lastActionAt = Date.now();
        saveBatch(batch);
        btn.disabled = true;
        btn.style.backgroundColor = '#b8860b';
        btn.innerHTML = `⏳ STARTE STAPEL<br>1 VON ${urls.length}`;
        runBatchController(btn);
    }

    function runBatchController(btn) {
        if (window.top !== window.self) return;
        let batch = loadBatch();
        if (!batch?.active || isReportDetailPage()) return;

        let frame = document.getElementById(WORKER_FRAME_ID);
        if (!frame) {
            frame = document.createElement('iframe');
            frame.id = WORKER_FRAME_ID;
            frame.setAttribute('aria-hidden', 'true');
            frame.style.position = 'fixed';
            frame.style.left = '-10000px';
            frame.style.top = '0';
            frame.style.width = '1280px';
            frame.style.height = '900px';
            frame.style.opacity = '0.01';
            frame.style.pointerEvents = 'none';
            frame.style.border = '0';
            document.body.appendChild(frame);
        }

        btn.disabled = true;
        btn.style.backgroundColor = '#b8860b';

        let timeoutId = null;
        let retryCount = 0;
        let expectedIndex = batch.index;

        const finishBatch = () => {
            const done = loadBatch();
            if (!done) return;
            done.active = false;
            done.finished = true;
            saveBatch(done);
            if (timeoutId) clearTimeout(timeoutId);
            frame.remove();
            btn.innerHTML = `✅ STAPEL FERTIG<br>${done.success} OK / ${done.failed} FEHLER`;
            btn.style.backgroundColor = done.failed ? '#b11e1e' : '#1e7e34';
            btn.disabled = false;
            const message = `Stapel abgeschlossen: ${done.success} erfolgreich, ${done.failed} fehlgeschlagen.`;
            if (window.UI?.[done.failed ? 'ErrorMessage' : 'SuccessMessage']) {
                window.UI[done.failed ? 'ErrorMessage' : 'SuccessMessage'](message, 7000);
            } else {
                alert(message);
            }
            setTimeout(clearBatch, 1000);
        };

        const loadWorker = (index) => {
            batch = loadBatch();
            if (!batch?.active) return;
            if (index >= batch.urls.length) {
                finishBatch();
                return;
            }

            expectedIndex = index;
            batch.lastActionAt = Date.now();
            saveBatch(batch);
            btn.innerHTML = `⏳ BERICHT ${index + 1} VON ${batch.urls.length}<br>WIRD BEARBEITET …`;

            const url = new URL(batch.urls[index], location.href);
            url.searchParams.set('_dsworker', '1');
            url.searchParams.set('_dsindex', String(index));
            url.searchParams.set('_dsbatch', String(Date.now()));
            frame.src = url.toString();

            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                const current = loadBatch();
                if (!current?.active || current.index !== index) return;
                if (retryCount < 2) {
                    retryCount += 1;
                    btn.innerHTML = `⚠️ BERICHT ${index + 1} HÄNGT<br>NEUER VERSUCH ${retryCount}/2 …`;
                    loadWorker(index);
                    return;
                }
                retryCount = 0;
                current.failed += 1;
                current.errors.push({ url: current.urls[index], message: 'Arbeitsfenster-Zeitüberschreitung' });
                current.index += 1;
                saveBatch(current);
                loadWorker(current.index);
            }, 45000);
        };

        const onWorkerMessage = (event) => {
            if (event.origin !== location.origin || event.source !== frame.contentWindow) return;
            const data = event.data;
            if (!data || data.type !== WORKER_MESSAGE || data.index !== expectedIndex) return;
            if (timeoutId) clearTimeout(timeoutId);
            retryCount = 0;

            const current = loadBatch();
            if (!current?.active || current.index !== data.index) return;
            if (data.ok) current.success += 1;
            else {
                current.failed += 1;
                current.errors.push({ url: current.urls[data.index], message: data.error || 'Unbekannter Fehler' });
            }
            current.index += 1;
            current.lastActionAt = Date.now();
            saveBatch(current);

            if (current.index < current.urls.length) {
                setTimeout(() => loadWorker(current.index), 300);
            } else {
                finishBatch();
            }
        };

        if (!frame.dataset.listenerReady) {
            window.addEventListener('message', onWorkerMessage);
            frame.dataset.listenerReady = '1';
        }
        loadWorker(batch.index);
    }

    function showBatchFinishedIfNeeded() {
        const batch = loadBatch();
        if (!batch || batch.active || !batch.finished) return;
        const message = `Stapel abgeschlossen: ${batch.success} erfolgreich, ${batch.failed} fehlgeschlagen.`;
        if (batch.failed && batch.errors?.length) console.warn('Fehler im Berichtsstapel:', batch.errors);
        if (window.UI?.[batch.failed ? 'ErrorMessage' : 'SuccessMessage']) {
            window.UI[batch.failed ? 'ErrorMessage' : 'SuccessMessage'](message, 7000);
        } else {
            alert(message);
        }
        clearBatch();
    }

    async function processCurrentBatchReport(btn) {
        const batch = loadBatch();
        if (!batch?.active || !isReportDetailPage() || btn.dataset.batchRunning === '1') return;
        btn.dataset.batchRunning = '1';
        btn.disabled = true;
        btn.style.backgroundColor = '#b8860b';
        const workerIndex = getWorkerIndex();
        const currentIndex = workerIndex ?? batch.index;
        const position = Math.min(currentIndex + 1, batch.urls.length);
        btn.innerHTML = `⏳ BERICHT ${position} VON ${batch.urls.length}<br>WIRD BEARBEITET …`;

        let ok = false;
        let errorMessage = '';
        try {
            batch.lastActionAt = Date.now();
            saveBatch(batch);
            const neuerName = buildNewName();
            await withTimeout((async () => {
                await renameReport(neuerName);
                btn.innerHTML = `⏳ BERICHT ${position} VON ${batch.urls.length}<br>DORFNOTIZ WIRD ÜBERSCHRIEBEN …`;
                await saveVillageNote(neuerName);
            })(), PROCESS_TIMEOUT_MS, 'Zeitüberschreitung bei der Stapelverarbeitung.');
            ok = true;
        } catch (error) {
            console.error('Stapelverarbeitung fehlgeschlagen:', error);
            errorMessage = String(error?.message || error);
        }

        if (isWorkerFrame()) {
            window.parent.postMessage({
                type: WORKER_MESSAGE,
                index: currentIndex,
                ok,
                error: errorMessage
            }, location.origin);
            btn.innerHTML = ok ? '✅ FERTIG – NÄCHSTER BERICHT …' : '❌ FEHLER – WIRD ÜBERSPRUNGEN …';
            return;
        }

        if (ok) batch.success += 1;
        else {
            batch.failed += 1;
            batch.errors.push({ url: location.href, message: errorMessage });
        }
        batch.index += 1;
        batch.lastActionAt = Date.now();
        if (batch.index < batch.urls.length) {
            saveBatch(batch);
            forceNavigate(batch.urls[batch.index]);
            return;
        }

        batch.active = false;
        batch.finished = true;
        saveBatch(batch);
        forceNavigate(batch.returnUrl);
    }

    function cleanText(text) {
        return (text || '').replace(/\s+/g, ' ').trim();
    }

    function normalizeName(name) {
        return cleanText(name).toLowerCase();
    }

    function getAccountName() {
        return localStorage.getItem(STORAGE_KEY) || window.game_data?.player?.name || '';
    }

    function setAccountName() {
        const current = getAccountName();
        const entered = prompt('Deinen Accountnamen eingeben:', current || '');
        if (entered && entered.trim()) {
            localStorage.setItem(STORAGE_KEY, entered.trim());
            updateAccountInfo();
            alert('Accountname gespeichert: ' + entered.trim());
        }
    }

    function updateAccountInfo() {
        const info = document.querySelector('#' + INFO_ID);
        if (!info) return;
        const name = getAccountName();
        info.innerHTML = `Account: <b>${name || 'nicht gesetzt'}</b><br>Rechtsklick zum Ändern`;
    }

    function rowFirstCellText(row) {
        const first = row ? row.querySelector('td,th') : null;
        return cleanText(first ? first.innerText : '');
    }

    function getCellNumbersAfterLabel(row) {
        if (!row) return [];
        const cells = Array.from(row.querySelectorAll('td,th'));
        const nums = [];

        // Wichtig: Wir lesen die Zahlen aus den einzelnen Zellen nach dem Label.
        // Dadurch bleiben die Spalten passend zu den Einheitensymbolen im Bericht.
        for (const td of cells) {
            const txt = cleanText(td.innerText);
            if (/^(Anzahl|Verluste):?$/i.test(txt)) continue;
            if (/^-?\d+$/.test(txt)) nums.push(parseInt(txt, 10));
        }

        // Fallback für Browser/Layouts, bei denen mehrere Zahlen in einer Zelle landen.
        if (nums.length < 3) {
            const text = cleanText(row.innerText).replace(/^(Anzahl|Verluste):?/i, '');
            return (text.match(/-?\d+/g) || []).map(n => parseInt(n, 10)).slice(0, UNIT_COUNT);
        }

        return nums.slice(0, UNIT_COUNT);
    }

    function findRowInTableByLabel(table, label) {
        if (!table) return null;
        const rows = Array.from(table.querySelectorAll('tr'));
        return rows.find(row => {
            const first = rowFirstCellText(row);
            return new RegExp('^' + label + ':?$', 'i').test(first) ||
                   new RegExp('^' + label + ':?', 'i').test(cleanText(row.innerText));
        }) || null;
    }

    function parseParty(label) {
        const rows = Array.from(document.querySelectorAll('tr'));

        // Header über die erste Zelle finden, damit nicht irgendein Text im Bericht matcht.
        const header = rows.find(row => {
            const first = rowFirstCellText(row);
            return new RegExp('^' + label + ':?$', 'i').test(first) ||
                   cleanText(row.innerText).startsWith(label + ':');
        });
        if (!header) return null;

        const headerCells = Array.from(header.querySelectorAll('td,th'));
        let name = '';
        if (headerCells.length >= 2) {
            name = cleanText(headerCells[1].innerText);
        }
        if (!name) {
            const headerText = cleanText(header.innerText);
            name = headerText.replace(new RegExp('^' + label + ':\\s*', 'i'), '').trim();
        }

        // Der Angreifer-/Verteidigerblock ist in Die-Stämme-Berichten in der Regel eine eigene Tabelle.
        // Wir lesen nur innerhalb dieser Tabelle, damit nicht die Verluste vom falschen Block genommen werden.
        const table = header.closest('table');

        const placeLabel = label === 'Angreifer' ? 'Herkunft' : 'Ziel';
        const placeRow = findRowInTableByLabel(table, placeLabel);
        const placeText = placeRow ? cleanText(placeRow.innerText) : '';
        const coordMatch = placeText.match(/\((\d{1,3}\|\d{1,3})\)/) || placeText.match(/\b(\d{1,3}\|\d{1,3})\b/);
        const coords = coordMatch ? coordMatch[1] : '';

        const countRow = findRowInTableByLabel(table, 'Anzahl');
        const lossRow = findRowInTableByLabel(table, 'Verluste');

        const counts = getCellNumbersAfterLabel(countRow);
        const losses = getCellNumbersAfterLabel(lossRow);

        let villageId = '';
        const villageLink = placeRow?.querySelector('a[href*="village="], a[href*="id="]');
        if (villageLink) {
            try {
                const url = new URL(villageLink.href, location.origin);
                // Links zu fremden Dörfern enthalten oft beide Parameter:
                // village = aktuell ausgewähltes eigenes Dorf, id = tatsächlich angeklicktes Dorf.
                // Deshalb bei info_village immer zuerst die Ziel-ID aus „id“ verwenden.
                const isVillageInfoLink = /(?:screen=info_village|info_village)/i.test(url.href);
                villageId = isVillageInfoLink
                    ? (url.searchParams.get('id') || url.searchParams.get('village') || '')
                    : (url.searchParams.get('id') || url.searchParams.get('village') || '');
            } catch (e) {
                const targetIdMatch = villageLink.href.match(/[?&]id=(\d+)/);
                const villageMatch = villageLink.href.match(/[?&]village=(\d+)/);
                villageId = targetIdMatch?.[1] || villageMatch?.[1] || '';
            }
        }

        return { label, header, table, name, placeText, coords, counts, losses, villageId };
    }

    function sameName(a, b) {
        const na = normalizeName(a);
        const nb = normalizeName(b);
        return !!na && !!nb && (na === nb || na.includes(nb) || nb.includes(na));
    }

    function getOpponent() {
        const account = getAccountName();
        const attacker = parseParty('Angreifer');
        const defender = parseParty('Verteidiger');

        if (!attacker && !defender) return null;

        if (attacker && sameName(attacker.name, account)) {
            return { role: 'V', party: defender || attacker }; // Gegner ist Verteidiger
        }
        if (defender && sameName(defender.name, account)) {
            return { role: 'A', party: attacker || defender }; // Gegner ist Angreifer
        }

        // Fallback: Falls Accountname nicht passt, lieber Angreifer nehmen, wenn vorhanden.
        return { role: '?', party: attacker || defender };
    }

    function getWallAndWatchtower() {
        const pageText = document.body.innerText;
        let wallLvl = 'Wx'; // Gewünscht: Wall unbekannt = Wx, nicht W0
        let wtLvl = '';

        // Spionage-Gebäudetabelle: Zeile enthält z.B. "Wall 17" oder "Wachturm 3".
        const rows = Array.from(document.querySelectorAll('tr'));
        for (const row of rows) {
            const text = cleanText(row.innerText);
            let m = text.match(/^Wall\s+(\d{1,2})$/i) || text.match(/\bWall\s+(\d{1,2})\b/i);
            if (m) wallLvl = 'W' + m[1];

            m = text.match(/^Wachturm\s+(\d{1,2})$/i) || text.match(/\bWachturm\s+(\d{1,2})\b/i);
            if (m) wtLvl = '🗼' + m[1];
        }

        // Letzten bekannten Endstand aus allen Schadensmeldungen übernehmen.
        const wallRegex = /Wall\s+beschädigt\s+von\s+Level\s+(\d+)\s+auf\s+Level\s+(\d+)/gi;
        let wm;
        while ((wm = wallRegex.exec(pageText)) !== null) {
            wallLvl = 'W' + wm[2];
        }

        const wtRegex = /Wachturm\s+beschädigt\s+von\s+Level\s+(\d+)\s+auf\s+Level\s+(\d+)/gi;
        let tm;
        while ((tm = wtRegex.exec(pageText)) !== null) {
            wtLvl = '🗼' + tm[2];
        }

        return { wallLvl, wtLvl };
    }

    function getApprovalText() {
        const text = document.body.innerText;
        let m = text.match(/Zustimmung\s+gesunken\s+von\s+(-?\d+)\s+auf\s+(-?\d+)/i) ||
                text.match(/Gesunken\s+von\s+(-?\d+)\s+auf\s+(-?\d+)/i);
        if (m) return `❤${m[1]}>${m[2]}`;

        m = text.match(/Zustimmung:\s*(-?\d+)/i);
        if (m) return `❤${m[1]}`;

        return '';
    }

    function getCatapultDamage() {
        const text = document.body.innerText;
        const results = [];
        const regex = /(Hauptgebäude|Kaserne|Stall|Werkstatt|Adelshof|Schmiede|Versammlungsplatz|Marktplatz|Holzfällerlager|Holzfäller|Lehmgrube|Eisenmine|Bauernhof|Speicher|Versteck|Wall|Wachturm|Statue)\s+beschädigt\s+von\s+Level\s+(\d+)\s+auf\s+Level\s+(\d+)/gi;
        let m;
        while ((m = regex.exec(text)) !== null) {
            const building = BUILDING_SHORT[m[1]] || m[1];
            results.push(`${building}${m[2]}>${m[3]}`);
        }
        return results;
    }

    function formatTroops(party) {
        const counts = (party?.counts || []).slice(0, UNIT_COUNT);
        const losses = (party?.losses || []).slice(0, UNIT_COUNT);
        if (!counts.length) return '';

        while (counts.length < UNIT_COUNT) counts.push(0);
        while (losses.length < UNIT_COUNT) losses.push(0);

        const hasLosses = losses.some(n => Number.isFinite(n) && n > 0);
        if (hasLosses) {
            const survivors = counts.map((n, i) => Math.max(0, (n || 0) - (losses[i] || 0)));
            return 'Ü:/' + survivors.join(' ');
        }
        return 'Trp:/' + counts.join(' ');
    }

    function buildNewName() {
        const opponent = getOpponent();
        if (!opponent || !opponent.party) throw new Error('Gegner konnte nicht erkannt werden. Accountname per Rechtsklick prüfen.');

        const { wallLvl, wtLvl } = getWallAndWatchtower();
        const approval = getApprovalText();
        const kata = getCatapultDamage();
        const troops = formatTroops(opponent.party);

        const first = `>>${opponent.role}/${opponent.party.name}${opponent.party.coords ? `,(${opponent.party.coords})` : ''}`;
        const parts = [first, wallLvl];
        if (wtLvl) parts.push(wtLvl);
        parts.push(...kata);
        if (approval) parts.push(approval);
        if (troops) parts.push(troops);

        return parts.filter(Boolean).join(',');
    }

    const UNIT_POPULATION = {
        spear: 1, sword: 1, axe: 1, archer: 1,
        spy: 2, light: 4, marcher: 5, heavy: 6,
        ram: 5, catapult: 8, knight: 10, snob: 100
    };

    function getUnitNames() {
        const configured = Array.isArray(window.game_data?.units) ? window.game_data.units : [];
        if (configured.length) return configured.slice(0, UNIT_COUNT);
        return ['spear', 'sword', 'axe', 'archer', 'spy', 'light', 'marcher', 'heavy', 'ram', 'catapult', 'knight', 'snob'].slice(0, UNIT_COUNT);
    }

    function classifyVillage(party) {
        const units = getUnitNames();
        const counts = (party?.counts || []).slice(0, units.length);
        let offensive = 0;
        let defensive = 0;

        counts.forEach((amount, index) => {
            const unit = units[index];
            const population = UNIT_POPULATION[unit] || 1;
            const value = (Number(amount) || 0) * population;

            if (['axe', 'light', 'marcher', 'ram', 'catapult'].includes(unit)) offensive += value;
            if (['spear', 'sword', 'archer', 'heavy'].includes(unit)) defensive += value;
        });

        if (!counts.some(n => Number(n) > 0)) return 'Keine überlebenden Truppen erkannt';
        if (offensive > 3000) return 'Offensivdorf';
        if (offensive > 500) return 'Vermutlich Offensivdorf';
        if (defensive > 1000) return 'Defensivdorf';
        if (defensive > 500) return 'Vermutlich Defensivdorf';
        return offensive > defensive ? 'Vermutlich Offensivdorf' : 'Vermutlich Defensivdorf';
    }

    function getChurchText() {
        const rows = Array.from(document.querySelectorAll('tr'));
        const found = [];
        for (const row of rows) {
            const text = cleanText(row.innerText);
            let match = text.match(/^(Erste Kirche|Hauptkirche)\s+(\d{1,2})$/i);
            if (match) found.push(`Erste Kirche ${match[2]}`);
            match = text.match(/^Kirche\s+(\d{1,2})$/i);
            if (match) found.push(`Kirche ${match[1]}`);
        }
        return [...new Set(found)];
    }

    function getReportExportCode() {
        return cleanText(document.querySelector('#report_export_code')?.textContent || '');
    }

    function buildVillageNote(reportName, opponent) {
        const villageType = classifyVillage(opponent.party);
        const { wallLvl, wtLvl } = getWallAndWatchtower();
        const churches = getChurchText();
        const approval = getApprovalText();
        const catapult = getCatapultDamage();
        const reportCode = document.querySelector('#report_export_code')?.textContent?.trim() || '';

        const details = [wallLvl, wtLvl, ...churches, ...catapult, approval].filter(Boolean).join(' | ');
        const typeColor = /Offensiv/i.test(villageType) ? 'ff0000' : '0eae0e';
        const lines = [
            `[b]${reportName}[/b]`,
            `[color=#${typeColor}][b]${villageType}[/b][/color]${details ? ` | ${details}` : ''}`,
            '',
            reportCode
        ];
        return lines.join('\n').trim();
    }

    async function saveVillageNote(reportName) {
        const opponent = getOpponent();
        const villageId = opponent?.party?.villageId;
        if (!opponent?.party) throw new Error('Gegner für die Dorfnotiz konnte nicht erkannt werden.');
        if (!villageId) throw new Error('Dorf-ID des Gegners konnte nicht erkannt werden.');

        const note = buildVillageNote(reportName, opponent);
        const params = new URLSearchParams({
            note,
            village_id: String(villageId),
            h: String(window.game_data?.csrf || '')
        });

        const sitter = String(window.game_data?.player?.sitter || '0');
        const apiUrl = new URL('/game.php', location.origin);
        apiUrl.searchParams.set('village', String(window.game_data?.village?.id || ''));
        apiUrl.searchParams.set('screen', 'api');
        apiUrl.searchParams.set('ajaxaction', 'village_note_edit');
        if (sitter !== '0') {
            apiUrl.searchParams.set('t', String(window.game_data?.player?.id || ''));
        } else {
            apiUrl.searchParams.set('h', String(window.game_data?.csrf || ''));
            const serverTime = window.Timing?.getCurrentServerTime?.() || Date.now();
            apiUrl.searchParams.set('client_time', String(Math.round(serverTime / 1000)));
        }

        const response = await fetch(apiUrl.toString(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: params.toString(),
            credentials: 'same-origin'
        });

        if (!response.ok) throw new Error(`Dorfnotiz konnte nicht gespeichert werden (HTTP ${response.status}).`);
        return villageId;
    }

    function waitForCondition(check, timeout = 3500, interval = 80) {
        return new Promise((resolve, reject) => {
            const started = Date.now();
            const timer = setInterval(() => {
                try {
                    const result = check();
                    if (result) {
                        clearInterval(timer);
                        resolve(result);
                    } else if (Date.now() - started >= timeout) {
                        clearInterval(timer);
                        reject(new Error('Zeitüberschreitung beim Umbenennen.'));
                    }
                } catch (error) {
                    clearInterval(timer);
                    reject(error);
                }
            }, interval);
        });
    }

    async function renameReport(neuerName) {
        const renameIcon = document.querySelector('.rename-icon') ||
                           document.querySelector('.quickedit-content .rename-icon') ||
                           document.querySelector('[class*="rename-icon"]');

        if (!renameIcon) {
            throw new Error('Premium-/Umbenennen-Symbol wurde nicht gefunden.');
        }

        const quickEditRoot = renameIcon.closest('.quickedit, .quickedit-content, [data-id], td, th') || renameIcon.parentElement;
        renameIcon.click();

        const inputField = await waitForCondition(() => {
            const scoped = quickEditRoot?.querySelector?.(
                'input[type="text"], input.rename-input, input[name="name"], .quickedit-edit input'
            );
            if (scoped && scoped.offsetParent !== null) return scoped;

            return Array.from(document.querySelectorAll(
                '.quickedit input[type="text"], .quickedit-content input[type="text"], input.rename-input, input[type="text"][name="name"]'
            )).find(input => input.offsetParent !== null);
        });

        inputField.focus();
        inputField.value = neuerName;
        inputField.setAttribute('value', neuerName);

        if (window.jQuery) {
            window.jQuery(inputField).val(neuerName).trigger('input').trigger('change').trigger('keyup');
        } else {
            inputField.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: neuerName }));
            inputField.dispatchEvent(new Event('change', { bubbles: true }));
            inputField.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'a' }));
        }

        const form = inputField.closest('form');
        const editContainer = inputField.closest('.quickedit, .quickedit-content, .quickedit-edit, td, th, form') || quickEditRoot;
        const submitBtn = editContainer?.querySelector?.(
            'input[type="submit"], button[type="submit"], input[type="button"], button.btn-confirm-yes, .btn-confirm-yes, .quickedit-submit'
        );

        if (form?.requestSubmit) {
            form.requestSubmit(submitBtn?.matches?.('[type="submit"]') ? submitBtn : undefined);
        } else if (submitBtn) {
            submitBtn.click();
        } else {
            inputField.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true
            }));
            inputField.dispatchEvent(new KeyboardEvent('keyup', {
                key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true
            }));
        }

        await waitForCondition(() => {
            const inputClosed = !document.contains(inputField) || inputField.offsetParent === null;
            const rootText = cleanText((quickEditRoot || document.body).innerText || '');
            const pageContainsName = rootText.includes(cleanText(neuerName));
            return inputClosed && pageContainsName;
        }, 5000, 120);

        return true;
    }

    async function doRename(btn) {
        let neuerName;
        try {
            neuerName = buildNewName();
        } catch (err) {
            console.error(err);
            alert(err.message || err);
            return;
        }

        btn.disabled = true;
        btn.innerHTML = '⏳ BERICHT WIRD UMBENANNT …';
        btn.style.backgroundColor = '#b8860b';

        try {
            await renameReport(neuerName);

            btn.innerHTML = '⏳ UMBENANNT – DORFNOTIZ WIRD GESPEICHERT …';
            await saveVillageNote(neuerName);

            btn.innerHTML = '✅ UMBENANNT & DORFNOTIZ GESPEICHERT!';
            btn.style.backgroundColor = '#1e7e34';
            if (window.UI?.SuccessMessage) {
                UI.SuccessMessage('Bericht wirklich umbenannt und Dorfnotiz gespeichert.', 3000);
            }
            setTimeout(() => resetButton(btn), 2600);
        } catch (err) {
            console.error('Umbenennen-/Notiz-Fehler:', err);
            btn.innerHTML = '❌ ' + (String(err.message || err).includes('Umbenennen') || String(err.message || err).includes('Zeitüberschreitung')
                ? 'BERICHT NICHT UMBENANNT – KEINE NOTIZ GESPEICHERT'
                : 'UMBENANNT – NOTIZ FEHLGESCHLAGEN');
            btn.style.backgroundColor = '#b11e1e';
            if (window.UI?.ErrorMessage) UI.ErrorMessage(err.message || String(err), 6000);
            else alert(err.message || err);
            setTimeout(() => resetButton(btn), 4500);
        }
    }

    function resetButton(btn) {
        btn.innerHTML = isReportDetailPage()
            ? '⚡ BERICHT UMBENENNEN<br>UND DORFNOTIZ<br>ÜBERSCHREIBEN<br>V5.5 ⚡'
            : '⚡ MARKIERTE BERICHTE<br>UMBENENNEN UND<br>DORFNOTIZEN ÜBERSCHREIBEN<br>V5.5 ⚡';
        btn.style.backgroundColor = '#61b15a';
        btn.disabled = false;
    }

    // Fängt seltene Fälle ab, in denen das Spiel nach einem Seitenwechsel
    // stehen bleibt oder den neuen DOM-Inhalt ohne erneutes DOMContentLoaded lädt.
    let lastObservedUrl = location.href;
    setInterval(() => {
        const batch = loadBatch();
        if (!batch?.active || isWorkerFrame() || (window.top === window.self && !isReportDetailPage())) return;

        if (location.href !== lastObservedUrl) {
            lastObservedUrl = location.href;
            document.querySelector('#' + BTN_ID)?.remove();
            document.querySelector('#' + WRAPPER_ID)?.remove();
        }

        const idleFor = Date.now() - Number(batch.lastActionAt || batch.startedAt || Date.now());
        if (idleFor > 35000 && batch.index < batch.urls.length) {
            batch.lastActionAt = Date.now();
            saveBatch(batch);
            forceNavigate(batch.urls[batch.index]);
        }
    }, 1500);

    const safetyTimer = setInterval(() => {
        if (!window.location.href.includes('screen=report')) return;
        if (document.querySelector('#' + BTN_ID)) return;

        const targetContainer = document.querySelector('#report_wrapper') ||
                                document.querySelector('.report_content') ||
                                document.querySelector('table.vis');
        if (!targetContainer || !targetContainer.parentNode) return;

        const wrapper = document.createElement('div');
        wrapper.id = WRAPPER_ID;
        wrapper.style.margin = '15px 0';

        const btn = document.createElement('button');
        btn.id = BTN_ID;
        btn.type = 'button';
        btn.style.width = '100%';
        btn.style.padding = '12px';
        btn.style.cursor = 'pointer';
        btn.style.backgroundColor = '#61b15a';
        btn.style.color = '#ffffff';
        btn.style.border = '2px solid #fff';
        btn.style.borderRadius = '5px';
        btn.style.fontWeight = 'bold';
        btn.style.fontSize = '13px';
        btn.style.display = 'block';
        resetButton(btn);

        const info = document.createElement('div');
        info.id = INFO_ID;
        info.style.fontSize = '10px';
        info.style.textAlign = 'center';
        info.style.marginTop = '4px';
        info.style.color = '#6b4b12';

        wrapper.appendChild(btn);
        wrapper.appendChild(info);
        targetContainer.parentNode.insertBefore(wrapper, targetContainer);
        updateAccountInfo();

        btn.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            e.stopPropagation();
            setAccountName();
        });

        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (isReportDetailPage()) doRename(btn);
            else startBatchFromOverview(btn);
        });

        if (isReportDetailPage()) {
            setTimeout(() => processCurrentBatchReport(btn), 400);
        } else {
            const activeBatch = loadBatch();
            if (activeBatch?.active && window.top === window.self) {
                setTimeout(() => runBatchController(btn), 250);
            } else {
                showBatchFinishedIfNeeded();
            }
        }
    }, 500);
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', initBerichteUmbenennenUndDorfnotiz, { once: true });
} else {
    initBerichteUmbenennenUndDorfnotiz();
}
