/**

TWCC Attack Organizer v3.6.3

Nur „Eintreffend“, frei sortierbare Buttons und explizite Aktion:

Status ersetzen oder Zusatz anhängen.*/(function () {'use strict';

const win = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;const $ = win.jQuery || win.$ || window.jQuery || window.$;

if (!$) {console.error('[TWCC Attack Organizer] jQuery wurde nicht gefunden.');return;}

// Beim erneuten Laden keine doppelten Listener/Observer erzeugen.
if (win.TWCC_AttackOrganizer && typeof win.TWCC_AttackOrganizer.destroy === 'function') {try { win.TWCC_AttackOrganizer.destroy(); } catch (e) {}}

const fallbackSettings = {0: ['[Gedefft]', 'Gedefft', 'green', 'white'],1: ['[Nachdeffen]', 'Nachdeffen', 'lime', 'black'],2: ['[Rausstellen]', 'Rausstellen', 'yellow', 'black'],3: ['[Tabben]', 'Tabben', 'orange', 'white'],4: ['[Readel]', 'Readel', 'orange', 'white'],5: [' | Fakeschutz IO', 'Fakeschutz IO', 'green', 'white'],6: [' | Aufstocken IO', 'Aufgestockt', 'green', 'white'],7: [' | Wallcheck', 'Wallcheck', 'yellow', 'black'],8: [' | Off Raus ⚠️', 'Off Raus', 'yellow', 'black'],9: [' | Fake DB', 'Fake?', 'green', 'white'],10: [' | Off DB', 'Off?', 'red', 'white'],11: [' | DONE ✅', 'DONE', 'dgreen', 'white']};

const fallbackColors = {red: ['#c18a8a', '#c18a8a'],yellow: ['#ffd91c', '#e8c30d'],white: ['#ffffff', '#dbdbdb'],black: ['#000000', '#2b2b2b'],green: ['#31c908', '#228c05'],dgreen: ['#196f24', '#12551b'],orange: ['#ef8b10', '#d3790a'],lime: ['#ffd400', '#ffd400'],blue: ['#0d83dd', '#0860a3'],lblue: ['#22e5db', '#0cd3c9'],gray: ['#adb6c6', '#828891'],dorange: ['#ff0000', '#ff0000'],pink: ['#ff69b4', '#ff69b4'],incok: ['#659b5e', '#659b5e'],inckontrolle: ['#95bf74', '#95bf74'],durchlassen: ['#90323d', '#90323d'],raus: ['#ad2e24', '#ad2e24'],rausgestellt: ['#d8572a', '#d8572a'],tabben: ['#005e9b', '#005e9b'],getabben: ['#52acff', '#52acff'],cleaner: ['#ffb700', '#ffb700'],readel: ['#ffdd00', '#ffdd00'],Nachdeffen: ['#66CDAA', '#66CDAA'],holder: ['#D3D3D3', '#BDB76B']};

// TWCC bereitet diese Werte über applyAttackOrganizerGlobals() vor.
// Nur falls nichts vorhanden ist, werden die Originalwerte verwendet.
const settings = (win.settings && Object.keys(win.settings).length)? win.settings: fallbackSettings;

const colors = Object.assign({}, fallbackColors, win.colors || {});const fontSize = Number(win.font_size) || 8;const attackLayout = win.attack_layout || 'column';

const buttonNames = $.map(settings, obj => obj[0]);const buttonIcons = $.map(settings, obj => obj[1]);const buttonColors = $.map(settings, obj => obj[2]);const buttonTextColors = $.map(settings, obj => obj[3]);const buttonModes = $.map(settings, obj => obj[4] || (String(obj[0] || '').indexOf('|') !== -1 ? 'append' : 'replace'));

let observer = null;let scheduled = false;

function colorValue(name, index, fallback) {const entry = colors[name];return entry && entry[index] ? entry[index] : fallback;}

function getTop(num) {return colorValue(buttonColors[num], 0, '#b69471');}

function getBot(num) {return colorValue(buttonColors[num], 1, '#6c4d2d');}

function getFont(num) {return colorValue(buttonTextColors[num], 0, '#ffffff');}

function isSupport(line) {const src = $(line).find('img').first().attr('src') || '';return src.indexOf('support') >= 0;}

function baseCommandName(value) {return String(value || '').trim().split(/\s+/)[0] || '';}

function renameLine(line, text, mode) {const $line = $(line);const $rename = $line.find('.rename-icon').first();

 if (!$rename.length) return;

 $rename.trigger('click');

 // Quickedit wird teilweise erst nach dem Klick erzeugt.
 setTimeout(function () {
     const $input = $line.find('.quickedit-content input[type="text"], input[type="text"]').first();
     const $save = $line.find('.quickedit-content input[type="button"], input[type="button"]').first();

     if (!$input.length || !$save.length) return;

     const current = $input.val() || '';
                 if (mode === 'append') {
         const separator = current && text && !/^\s/.test(text) ? ' ' : '';
         $input.val(current + separator + text);
     } else {
         $input.val((baseCommandName(current) + ' ' + text).trim());
     }
     $save.trigger('click');

     setTimeout(function () {
         markRowUnprocessed(line);
         processRow(line);
         colorRows();
     }, 150);
 }, 30);

}

function markRowUnprocessed(line) {$(line).removeAttr('data-twcc-ao-ready');$(line).find('.twcc-ao-buttons').remove();}

function addButtons(line, nr) {const $line = $(line);if ($line.attr('data-twcc-ao-ready') === '1') return;if (isSupport(line)) return;

 // Die quickedit-content ist auf aktuellen Welten häufig ausgeblendet.
 // Darum werden die Buttons in die sichtbare Befehlszelle eingesetzt.
 const $quickedit = $line.find('.quickedit').first();
 const $label = $line.find('.quickedit-label').first();
 const $rename = $line.find('.rename-icon').first();

 let $target = $quickedit.closest('td');
 if (!$target.length) $target = $label.closest('td');
 if (!$target.length) $target = $rename.closest('td');
 if (!$target.length) return;

 const $wrap = $('<span class="twcc-ao-buttons"></span>').css({
     display: 'inline-flex',
     flexWrap: 'wrap',
     alignItems: 'center',
     gap: '2px',
     marginLeft: '6px',
     verticalAlign: 'middle',
     position: 'relative',
     zIndex: '5'
 });

 buttonIcons.forEach(function (icon, num) {
     const $button = $('<button type="button" class="btn twcc-ao-button"></button>')
         .text(icon)
         .attr('title', buttonNames[num])
         .css({
             color: getFont(num),
             fontSize: fontSize + 'px',
             background: 'linear-gradient(to bottom,' + getTop(num) + ' 30%,' + getBot(num) + ' 100%)',
             padding: '2px 5px',
             minHeight: '22px'
         })
         .on('click.twccAO', function (event) {
             event.preventDefault();
             event.stopPropagation();
             const text = buttonNames[num] || '';
             renameLine(line, text, buttonModes[num] === 'append' ? 'append' : 'replace');
         });

     $wrap.append($button);
 });

 // Direkt hinter dem sichtbaren Quickedit-Element einsetzen.
 if ($quickedit.length) {
     $quickedit.after($wrap);
 } else if ($label.length) {
     $label.closest('.quickedit-content, .quickedit, span').after($wrap);
 } else {
     $target.append($wrap);
 }

 $line.attr('data-twcc-ao-ready', '1');

}

function findCodes(name) {const found = [];for (let i = 0; i < buttonNames.length; i++) {if (name.indexOf(buttonNames[i]) !== -1) found.push(i);}return found;}

function setRowBackground($line, background) {
    const $directCells = $line.children('td');

    if (isOverviewIncomingAttacksPage()) {
        // Auf dieser Seite ausschließlich die sichtbare Befehlszelle markieren.
        $directCells.first().attr('style', function (_, old) {
            return (old || '') + ';background:' + background + ' !important;';
        });
    } else if (attackLayout === 'line') {
        $directCells.attr('style', function (_, old) {
            return (old || '') + ';background:' + background + ' !important;';
        });
    } else if (attackLayout === 'column') {
        $directCells.first().attr('style', function (_, old) {
            return (old || '') + ';background:' + background + ' !important;';
        });
    }

    $line.find('a').first().css({
        color: 'white',
        textShadow: '-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000'
    });
}

function normalizeText(value) {return String(value || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();}

function isOverviewIncomingAttacksPage() {
    const params = new URLSearchParams(window.location.search);

    return (
        params.get('screen') === 'overview_villages' &&
        params.get('mode') === 'incomings' &&
        params.get('subtype') === 'attacks'
    );
}

function getOverviewIncomingRows() {
    const rows = [];

    $('table').each(function () {
        const $table = $(this);

        // Nur direkte Tabellenzeilen prüfen. So werden keine übergeordneten
        // Layout-Tabellen oder Container-Zeilen versehentlich eingefärbt.
        const $directRows = $table.children('tbody').children('tr').add(
            $table.children('tr')
        );

        const $headerRow = $directRows.filter(function () {
            const text = normalizeText($(this).text());

            return (
                text.indexOf('befehl') !== -1 &&
                text.indexOf('ziel') !== -1 &&
                text.indexOf('herkunft') !== -1 &&
                text.indexOf('ankunft') !== -1
            );
        }).first();

        if (!$headerRow.length) return;

        $directRows.each(function () {
            const $row = $(this);
            const $cells = $row.children('td');

            if (!$cells.length) return;

            // Quickedit muss direkt in einer Zelle dieser Datenzeile liegen.
            // Nachfahren aus verschachtelten Tabellen zählen ausdrücklich nicht.
            const hasDirectCommandEditor = $cells.filter(function () {
                return $(this).find('.rename-icon, .quickedit-label, .quickedit').length > 0;
            }).length > 0;

            if (hasDirectCommandEditor) {
                rows.push(this);
            }
        });
    });

    return $(Array.from(new Set(rows)));
}

function getIncomingRows() {
    if (isOverviewIncomingAttacksPage()) {
        return getOverviewIncomingRows();
    }

    const result = [];

    $('table').each(function () {
        let insideIncomingSection = false;

        $(this).find('tr').each(function () {
            const $row = $(this);

            // Abschnittsüberschriften stehen in TW normalerweise in einer TH-
            // oder einer über mehrere Spalten laufenden TD-Zelle.
            const $headingCell = $row.children('th, td[colspan]').first();
            const heading = normalizeText($headingCell.text());

            if (/^eintreffend(?:\s|\(|$)/.test(heading)) {
                insideIncomingSection = true;
                return;
            }

            // Sobald ein anderer Befehlsabschnitt beginnt, endet „Eintreffend“.
            if (
                /^(eigene befehle|ausgehend|unterstützungen|rückkehrend|befehle)(?:\s|\(|$)/.test(heading)
            ) {
                insideIncomingSection = false;
                return;
            }

            if (
                insideIncomingSection &&
                $row.find('.rename-icon, .quickedit-label, .quickedit').length > 0
            ) {
                result.push(this);
            }
        });
    });

    return $(Array.from(new Set(result)));
}

function cleanupOutsideIncoming() {const allowed = new Set(getIncomingRows().toArray());

 $('.twcc-ao-buttons').each(function () {
     const row = $(this).closest('tr')[0];
     if (!row || !allowed.has(row)) {
         $(this).remove();
         if (row) $(row).removeAttr('data-twcc-ao-ready');
     }
 });

}

function colorRows() {getIncomingRows().each(function () {const $line = $(this);

     if (isSupport(this)) {
         setRowBackground($line, colorValue('yellow', 1, '#e8c30d'));
         return;
     }

     const name = $.trim($line.find('.quickedit-label').first().text());
     const codes = findCodes(name);

     if (codes.length === 1) {
         setRowBackground($line, colorValue(buttonColors[codes[0]], 1, '#6c4d2d'));
     } else if (codes.length >= 2) {
         const c1 = colorValue(buttonColors[codes[0]], 0, '#6c4d2d');
         const c2 = colorValue(buttonColors[codes[1]], 0, '#6c4d2d');
         setRowBackground(
             $line,
             'repeating-linear-gradient(45deg,' + c1 + ',' + c1 + ' 10px,' + c2 + ' 10px,' + c2 + ' 20px)'
         );
     } else if (name) {
         setRowBackground($line, colorValue('red', 1, '#b70707'));
     }
 });

}

function processRow(line, nr) {
    // In der kombinierten Eingangsübersicht nur die Zeilen färben.
    // Dort werden bewusst keine Organizer-Buttons eingefügt.
    if (isOverviewIncomingAttacksPage()) return;

    if (!isSupport(line)) addButtons(line, nr);
}

function scan() {scheduled = false;cleanupOutsideIncoming();

 getIncomingRows().each(function (nr) {
     processRow(this, nr);
 });

 colorRows();

}

function scheduleScan() {if (scheduled) return;scheduled = true;setTimeout(scan, 60);}

function ensureButtonStyles() {
    if (document.getElementById('twcc-ao-visible-style')) return;

    const style = document.createElement('style');
    style.id = 'twcc-ao-visible-style';
    style.textContent = `
        .twcc-ao-buttons {
            visibility: visible !important;
            opacity: 1 !important;
        }

        .twcc-ao-button {
            display: inline-block !important;
            visibility: visible !important;
            opacity: 1 !important;
            cursor: pointer !important;
        }

        #incomings_table td,
        #commands_incomings td {
            overflow: visible !important;
        }
    `;

    document.head.appendChild(style);
}

function init() {if (!document.body) {setTimeout(init, 100);return;}

 ensureButtonStyles();
 scan();

 const Observer = win.MutationObserver || window.MutationObserver;
 observer = new Observer(scheduleScan);
 observer.observe(document.body, {
     childList: true,
     subtree: true
 });

 // Einige Übersichten laden die Angriffstabelle verzögert per AJAX.
 setTimeout(scan, 500);
 setTimeout(scan, 1500);
 setTimeout(scan, 3500);

 console.log('[TWCC Attack Organizer] gestartet.', {
     href: location.href,
     buttons: buttonNames.length,
     layout: attackLayout,
     incomingRows: getIncomingRows().length
 });

}

function destroy() {if (observer) observer.disconnect();observer = null;$(document).off('.twccAO');$('.twcc-ao-button').off('.twccAO');$('.twcc-ao-buttons').remove();$('[data-twcc-ao-ready]').removeAttr('data-twcc-ao-ready');console.log('[TWCC Attack Organizer] beendet.');}

win.TWCC_AttackOrganizerLoaded = true;

win.TWCC_AttackOrganizer = {version: '3.6.3-overview-row-scope-fix',init,destroy,refresh: scan};

if (document.readyState === 'loading') {$(init);} else {init();}})();
