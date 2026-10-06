// ==UserScript==
// @name         FarmGod Tampermonkey
// @namespace    FarmGod
// @version      1.5.5-twcc-automation-split
// @description  FarmGod TWCC-Test: Approved-Grundfunktion + getrennte Versand-/Loop-Automatik
// @author      Daniel
// @match        https://*.die-staemme.de/*
// @match        https://*.tribalwars.de/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

if (typeof ScriptAPI !== 'undefined') {
  ScriptAPI.register('FarmGod', true, 'Warre', 'nl.tribalwars@coma.innogames.de');
}

window.FarmGod = {};
window.FarmGod.Library = (function () {
  /**** TribalWarsLibrary.js ****/
  if (typeof window.twLib === 'undefined') {
    window.twLib = {
      queues: null,
      init: function () {
        if (this.queues === null) {
          this.queues = this.queueLib.createQueues(5);
        }
      },
      queueLib: {
        maxAttempts: 3,
        Item: function (action, arg, promise = null) {
          this.action = action;
          this.arguments = arg;
          this.promise = promise;
          this.attempts = 0;
        },
        Queue: function () {
          this.list = [];
          this.working = false;
          this.length = 0;

          this.doNext = function () {
            let item = this.dequeue();
            let self = this;

            if (item.action == 'openWindow') {
              window
                .open(...item.arguments)
                .addEventListener(
                  'DOMContentLoaded',
                  function () {
                    self.start();
                  }
                );
            } else {
              $[item.action](...item.arguments)
                .done(function () {
                  item.promise.resolve.apply(null, arguments);
                  self.start();
                })
                .fail(function () {
                  item.attempts += 1;
                  if (
                    item.attempts <
                    twLib.queueLib.maxAttempts
                  ) {
                    self.enqueue(item, true);
                  } else {
                    item.promise.reject.apply(
                      null,
                      arguments
                    );
                  }

                  self.start();
                });
            }
          };

          this.start = function () {
            if (this.length) {
              this.working = true;
              this.doNext();
            } else {
              this.working = false;
            }
          };

          this.dequeue = function () {
            this.length -= 1;
            return this.list.shift();
          };

          this.enqueue = function (item, front = false) {
            front ? this.list.unshift(item) : this.list.push(item);
            this.length += 1;

            if (!this.working) {
              this.start();
            }
          };
        },
        createQueues: function (amount) {
          let arr = [];

          for (let i = 0; i < amount; i++) {
            arr[i] = new twLib.queueLib.Queue();
          }

          return arr;
        },
        addItem: function (item) {
          let leastBusyQueue = twLib.queues
            .map((q) => q.length)
            .reduce((next, curr) => (curr < next ? curr : next), 0);
          twLib.queues[leastBusyQueue].enqueue(item);
        },
        orchestrator: function (type, arg) {
          let promise = $.Deferred();
          let item = new twLib.queueLib.Item(type, arg, promise);

          twLib.queueLib.addItem(item);

          return promise;
        },
      },
      ajax: function () {
        return twLib.queueLib.orchestrator('ajax', arguments);
      },
      get: function () {
        return twLib.queueLib.orchestrator('get', arguments);
      },
      post: function () {
        return twLib.queueLib.orchestrator('post', arguments);
      },
      openWindow: function () {
        let item = new twLib.queueLib.Item('openWindow', arguments);

        twLib.queueLib.addItem(item);
      },
    };

    twLib.init();
  }

  /**** Script Library ****/
  const setUnitSpeeds = function () {
    let unitSpeeds = {};

    $.when($.get('/interface.php?func=get_unit_info')).then((xml) => {
      $(xml)
        .find('config')
        .children()
        .map((i, el) => {
          unitSpeeds[$(el).prop('nodeName')] = $(el)
            .find('speed')
            .text()
            .toNumber();
        });

      localStorage.setItem(
        'FarmGod_unitSpeeds',
        JSON.stringify(unitSpeeds)
      );
    });
  };

  const getUnitSpeeds = function () {
    return JSON.parse(localStorage.getItem('FarmGod_unitSpeeds')) || false;
  };

  if (!getUnitSpeeds()) setUnitSpeeds();

  const determineNextPage = function (page, $html) {
    let villageLength =
      $html.find('#scavenge_mass_screen').length > 0
        ? $html.find('tr[id*="scavenge_village"]').length
        : $html.find('tr.row_a, tr.row_ax, tr.row_b, tr.row_bx').length;
    let navSelect = $html
      .find('.paged-nav-item')
      .first()
      .closest('td')
      .find('select')
      .first();
   let navLength =
      $html.find('#am_widget_Farm').length > 0
        ? parseInt(
          $('#plunder_list_nav')
            .first()
            .find('a.paged-nav-item, strong.paged-nav-item')
          [
            $('#plunder_list_nav')
              .first()
              .find(
                'a.paged-nav-item, strong.paged-nav-item'
              ).length - 1
          ].textContent.replace(/\D/g, '')
        ) - 1
        : navSelect.length > 0
          ? navSelect.find('option').length - 1
          : $html.find('.paged-nav-item').not('[href*="page=-1"]').length;
    let pageSize =
      $('#mobileHeader').length > 0
        ? 10
        : parseInt($html.find('input[name="page_size"]').val());

    if (page == -1 && villageLength == 1000) {
      return Math.floor(1000 / pageSize);
    } else if (page < navLength) {
      return page + 1;
    }

    return false;
  };

  const processPage = function (url, page, wrapFn) {
    let pageText = url.match('am_farm')
      ? `&Farm_page=${page}`
      : `&page=${page}`;

    return twLib
      .ajax({
        url: url + pageText,
      })
      .then((html) => {
        return wrapFn(page, $(html));
      });
  };

  const processAllPages = function (url, processorFn) {
    let page = url.match('am_farm') || url.match('scavenge_mass') ? 0 : -1;
    let wrapFn = function (page, $html) {
      let dnp = determineNextPage(page, $html);

      if (dnp) {
        processorFn($html);
        return processPage(url, dnp, wrapFn);
      } else {
        return processorFn($html);
      }
    };

    return processPage(url, page, wrapFn);
  };

  const getDistance = function (origin, target) {
    let a = origin.toCoord(true).x - target.toCoord(true).x;
    let b = origin.toCoord(true).y - target.toCoord(true).y;

    return Math.hypot(a, b);
  };

  const subtractArrays = function (array1, array2) {
    let result = array1.map((val, i) => {
      return val - array2[i];
    });

    return result.some((v) => v < 0) ? false : result;
  };

  const getCurrentServerTime = function () {
    let [hour, min, sec, day, month, year] = $('#serverTime')
      .closest('p')
      .text()
      .match(/\d+/g);
    return new Date(year, month - 1, day, hour, min, sec).getTime();
  };

  const timestampFromString = function (timestr) {
    let d = $('#serverDate')
      .text()
      .split('/')
      .map((x) => +x);
    let todayPattern = new RegExp(
      window.lang['aea2b0aa9ae1534226518faaefffdaad'].replace(
        '%s',
        '([\\d+|:]+)'
      )
    ).exec(timestr);
    let tomorrowPattern = new RegExp(
      window.lang['57d28d1b211fddbb7a499ead5bf23079'].replace(
        '%s',
        '([\\d+|:]+)'
      )
    ).exec(timestr);
    let laterDatePattern = new RegExp(
      window.lang['0cb274c906d622fa8ce524bcfbb7552d']
        .replace('%1', '([\\d+|\\.]+)')
        .replace('%2', '([\\d+|:]+)')
    ).exec(timestr);
    let t, date;

    if (todayPattern !== null) {
      t = todayPattern[1].split(':');
      date = new Date(d[2], d[1] - 1, d[0], t[0], t[1], t[2], t[3] || 0);
    } else if (tomorrowPattern !== null) {
      t = tomorrowPattern[1].split(':');
      date = new Date(
        d[2],
        d[1] - 1,
        d[0] + 1,
        t[0],
        t[1],
        t[2],
        t[3] || 0
      );
    } else {
      d = (laterDatePattern[1] + d[2]).split('.').map((x) => +x);
      t = laterDatePattern[2].split(':');
      date = new Date(d[2], d[1] - 1, d[0], t[0], t[1], t[2], t[3] || 0);
    }

    return date.getTime();
  };

  String.prototype.toCoord = function (objectified) {
    let c = (this.match(/\d{1,3}\|\d{1,3}/g) || [false]).pop();
    return c && objectified
      ? { x: c.split('|')[0], y: c.split('|')[1] }
      : c;
  };

  String.prototype.toNumber = function () {
    return parseFloat(this);
  };

  Number.prototype.toNumber = function () {
    return parseFloat(this);
  };

  return {
    getUnitSpeeds,
    processPage,
    processAllPages,
    getDistance,
    subtractArrays,
    getCurrentServerTime,
    timestampFromString,
  };
})();

window.FarmGod.Translation = (function () {
  const msg = {
    nl_NL: {
      missingFeatures:
        'Script vereist een premium account en farm assistent!',
      options: {
        title: 'FarmGod Opties',
        warning:
          '<b>Waarschuwingen:</b><br>- Zorg dat A is ingesteld als je standaard microfarm en B als een grotere microfarm<br>- Zorg dat de farm filters correct zijn ingesteld voor je het script gebruikt',
        filterImage:
          'https://higamy.github.io/TW/Scripts/Assets/farmGodFilters.png',
        group: 'Uit welke groep moet er gefarmd worden:',
        distance: 'Maximaal aantal velden dat farms mogen lopen:',
        time: 'Hoe veel tijd in minuten moet er tussen farms zitten:',
        losses: 'Verstuur farm naar dorpen met gedeeltelijke verliezen:',
        maxloot: 'Verstuur een B farm als de buit vorige keer vol was:',
        newbarbs: 'Voeg nieuwe barbarendorpen toe om te farmen:',
        button: 'Plan farms',
      },
      table: {
        noFarmsPlanned:
          'Er kunnen met de opgegeven instellingen geen farms verstuurd worden.',
        origin: 'Oorsprong',
        target: 'Doel',
        fields: 'Velden',
        farm: 'Farm',
        goTo: 'Ga naar',
      },
      messages: {
        villageChanged: 'Succesvol van dorp veranderd!',
        villageError:
          'Alle farms voor het huidige dorp zijn reeds verstuurd!',
        sendError: 'Error: farm niet verstuurd!',
      },
    },
    hu_HU: {
      missingFeatures:
        'A scriptnek szÃ¼ksÃ©ge van PrÃ©mium fiÃ³kra Ã©s FarmkezelÅ‘re!',
      options: {
        title: 'FarmGod opciÃ³k',
        warning:
          '<b>Figyelem:</b><br>- Bizonyosodj meg rÃ³la, hogy az "A" sablon az alapÃ©rtelmezett Ã©s a "B" egy nagyobb mennyisÃ©gÅ± mikrÃ³-farm<br>- Bizonyosodj meg rÃ³la, hogy a farm-filterek megfelelÅ‘en vannak beÃ¡llÃ­tva mielÅ‘tt hasznÃ¡lod a sctiptet',
        filterImage:
          'https://higamy.github.io/TW/Scripts/Assets/farmGodFilters_HU.png',
        group: 'EbbÅ‘l a csoportbÃ³l kÃ¼ldje:',
        distance: 'MaximÃ¡lis mezÅ‘ tÃ¡volsÃ¡g:',
        time: 'Mekkora idÅ‘intervallumban kÃ¼ldje a tÃ¡madÃ¡sokat percben:',
        losses: 'KÃ¼ldjÃ¶n tÃ¡madÃ¡st olyan falvakba ahol rÃ©szleges vesztesÃ©ggel jÃ¡rhat a tÃ¡madÃ¡s:',
        maxloot:
          'A "B" sablont kÃ¼ldje abban az esetben, ha az elÅ‘zÅ‘ tÃ¡madÃ¡s maximÃ¡lis fosztogatÃ¡ssal jÃ¡rt:',
        newbarbs: 'Adj hozzÃ¡ Ãºj barbÃ¡r falukat:',
        button: 'Farm megtervezÃ©se',
      },
      table: {
        noFarmsPlanned:
          'A jelenlegi beÃ¡llÃ­tÃ¡sokkal nem lehet Ãºj tÃ¡madÃ¡st kikÃ¼ldeni.',
        origin: 'Origin',
        target: 'CÃ©lpont',
        fields: 'TÃ¡volsÃ¡g',
        farm: 'Farm',
        goTo: 'Go to',
      },
      messages: {
        villageChanged: 'Falu sikeresen megvÃ¡ltoztatva!',
        villageError: 'Minden farm kiment a jelenlegi falubÃ³l!',
        sendError: 'Hiba: Farm nemvolt elkÃ¼ldve!',
      },
    },
    int: {
      missingFeatures:
        'Script requires a premium account and loot assistent!',
      options: {
        title: 'FarmGod Options',
        warning:
          '<b>Warning:</b><br>- Make sure A is set as your default microfarm and B as a larger microfarm<br>- Make sure the farm filters are set correctly before using the script',
        filterImage:
          'https://higamy.github.io/TW/Scripts/Assets/farmGodFilters.png',
        group: 'Send farms from group:',
        distance: 'Maximum fields for farms:',
        time: 'How much time in minutes should there be between farms:',
        losses: 'Send farm to villages with partial losses:',
        maxloot: 'Send a B farm if the last loot was full:',
        newbarbs: 'Add new barbs te farm:',
        button: 'Plan farms',
      },
      table: {
        noFarmsPlanned:
          'No farms can be sent with the specified settings.',
        origin: 'Origin',
        target: 'Target',
        fields: 'fields',
        farm: 'Farm',
        goTo: 'Go to',
      },
      messages: {
        villageChanged: 'Successfully changed village!',
        villageError:
          'All farms for the current village have been sent!',
        sendError: 'Error: farm not send!',
      },
    },
  };

  const get = function () {
    let lang = msg.hasOwnProperty(game_data.locale)
      ? game_data.locale
      : 'int';
    return msg[lang];
  };

  return {
    get,
  };
})();

window.FarmGod.Main = (function (Library, Translation) {
  const lib = Library;
  const t = Translation.get();
  let curVillage = null;
  let farmBusy = false;

  const FARMGOD_ACTIVE_TAB_KEY = 'FarmGod_activeTabId';
  const FARMGOD_TAB_ID_KEY = 'FarmGod_tabId';
  const FARMGOD_GLOBAL_DISABLED_KEY = 'FarmGod_globalDisabled';
  const FARMGOD_AUTO_LOOP_KEY = 'FarmGod_autoLoopEnabled';
  const FARMGOD_AUTOMATION_KEY = 'FarmGod_twccAutomationEnabled';
  // Später setzt TWCC dieses Capability-Flag anhand von farmGod.automation.
  // Testversion: true, damit die neue Trennung getestet werden kann.
  const FARMGOD_AUTOMATION_CAPABILITY = true;
  const FARMGOD_LOOP_RANGE_KEY = 'FarmGod_loopRange';
  const FARMGOD_NEXT_RELOAD_AT_KEY = 'FarmGod_nextReloadAt';
  const FARMGOD_AUTOPLAN_AFTER_RELOAD_KEY = 'FarmGod_autoPlanAfterReload';
  const FARMGOD_PANEL_COLLAPSED_KEY = 'FarmGod_panelCollapsed';

  const FARMGOD_STATS_KEY = 'FarmGod_stats';
  const FARMGOD_LOG_KEY = 'FarmGod_log';
  const FARMGOD_LAST_ACTIVITY_KEY = 'FarmGod_lastActivityAt';
  const FARMGOD_WATCHDOG_INTERVAL_MS = 10 * 60 * 1000;
  const FARMGOD_WATCHDOG_IDLE_MS = 10 * 60 * 1000;

  const getTodayKey = function () {
    const d = new Date();
    return (
      d.getFullYear() +
      '-' +
      String(d.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(d.getDate()).padStart(2, '0')
    );
  };

  const getFarmGodStats = function () {
    let stats = {};

    try {
      stats = JSON.parse(localStorage.getItem(FARMGOD_STATS_KEY)) || {};
    } catch (e) {
      stats = {};
    }

    const todayKey = getTodayKey();

    if (stats.todayKey !== todayKey) {
      stats.todayKey = todayKey;
      stats.today = 0;
      stats.currentRun = 0;
    }

    stats.today = Number.isFinite(stats.today) ? stats.today : 0;
    stats.currentRun = Number.isFinite(stats.currentRun) ? stats.currentRun : 0;
    stats.session = Number.isFinite(stats.session) ? stats.session : 0;
    stats.total = Number.isFinite(stats.total) ? stats.total : 0;
    stats.startedAt = Number.isFinite(stats.startedAt) ? stats.startedAt : 0;
    stats.sessionStartedAt = Number.isFinite(stats.sessionStartedAt) ? stats.sessionStartedAt : 0;

    return stats;
  };

  const setFarmGodStats = function (stats) {
    localStorage.setItem(FARMGOD_STATS_KEY, JSON.stringify(stats));
  };

  const ensureStatsStarted = function () {
    const stats = getFarmGodStats();
    const now = Date.now();

    if (!stats.startedAt) stats.startedAt = now;
    if (!stats.sessionStartedAt) stats.sessionStartedAt = now;

    setFarmGodStats(stats);
  };

  const resetCurrentRunStats = function () {
    const stats = getFarmGodStats();
    const now = Date.now();

    stats.currentRun = 0;
    if (!stats.startedAt) stats.startedAt = now;
    if (!stats.sessionStartedAt) stats.sessionStartedAt = now;

    setFarmGodStats(stats);
  };

  const incrementFarmStats = function () {
    const stats = getFarmGodStats();
    const now = Date.now();

    if (!stats.startedAt) stats.startedAt = now;
    if (!stats.sessionStartedAt) stats.sessionStartedAt = now;

    stats.today += 1;
    stats.currentRun += 1;
    stats.session += 1;
    stats.total += 1;

    setFarmGodStats(stats);
  };

  const resetFarmGodStats = function () {
    const now = Date.now();

    setFarmGodStats({
      todayKey: getTodayKey(),
      today: 0,
      currentRun: 0,
      session: 0,
      total: 0,
      startedAt: now,
      sessionStartedAt: now,
    });

    localStorage.removeItem(FARMGOD_LOG_KEY);
    markFarmGodActivity('Statistik zurückgesetzt');
  };

  const formatDuration = function (ms) {
    if (!ms || ms < 0) return '00:00:00';

    const total = Math.floor(ms / 1000);
    const days = Math.floor(total / 86400);
    const h = Math.floor((total % 86400) / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;

    const time =
      String(h).padStart(2, '0') +
      ':' +
      String(m).padStart(2, '0') +
      ':' +
      String(s).padStart(2, '0');

    return days > 0 ? days + 'd ' + time : time;
  };

  const getAverageFarmsPerHour = function () {
  const stats = getFarmGodStats();

  if (!stats.sessionStartedAt || !stats.session) return null;

  const hours = (Date.now() - stats.sessionStartedAt) / 3600000;

  if (hours < 0.5) return null;

  return Math.round(stats.session / hours);
};

  const getFarmGodLog = function () {
    try {
      return JSON.parse(localStorage.getItem(FARMGOD_LOG_KEY)) || [];
    } catch (e) {
      return [];
    }
  };

  const addFarmGodLog = function (message) {
    const d = new Date();
    const time =
      String(d.getHours()).padStart(2, '0') +
      ':' +
      String(d.getMinutes()).padStart(2, '0') +
      ':' +
      String(d.getSeconds()).padStart(2, '0');

    const log = getFarmGodLog();
    log.unshift(time + ' ' + message);

    localStorage.setItem(FARMGOD_LOG_KEY, JSON.stringify(log.slice(0, 50)));
  };

  const markFarmGodActivity = function (message = null) {
    localStorage.setItem(FARMGOD_LAST_ACTIVITY_KEY, String(Date.now()));

    if (message) {
      addFarmGodLog(message);
    }
  };

  const getLastFarmGodActivity = function () {
    const v = parseInt(localStorage.getItem(FARMGOD_LAST_ACTIVITY_KEY), 10);
    return Number.isFinite(v) ? v : 0;
  };

  const getAutoLoopEnabled = function () {
    return localStorage.getItem(FARMGOD_AUTO_LOOP_KEY) === '1';
  };

  const setAutoLoopEnabled = function (v) {
    localStorage.setItem(FARMGOD_AUTO_LOOP_KEY, v ? '1' : '0');

    if (!v) {
      localStorage.removeItem(FARMGOD_NEXT_RELOAD_AT_KEY);
      localStorage.removeItem(FARMGOD_AUTOPLAN_AFTER_RELOAD_KEY);
    }
  };

  const getLoopRange = function () {
    return localStorage.getItem(FARMGOD_LOOP_RANGE_KEY) || '20-40';
  };

  const setLoopRange = function (range) {
    localStorage.setItem(FARMGOD_LOOP_RANGE_KEY, range);
  };

  const parseLoopRange = function () {
    const parts = getLoopRange().split('-').map((v) => parseInt(v, 10));
    return {
      min: Number.isFinite(parts[0]) ? parts[0] : 20,
      max: Number.isFinite(parts[1]) ? parts[1] : 40,
    };
  };

  const scheduleNextReload = function () {
    if (!getAutomationEnabled() || !getAutoLoopEnabled() || isFarmGodGlobalDisabled() || !refreshFarmGodEnabled()) return;

    const existing = getNextReloadAt();
    if (existing && existing > Date.now()) return;

    const range = parseLoopRange();
    const minutes = randInt(range.min, range.max);
    const reloadAt = Date.now() + minutes * 60 * 1000;

    localStorage.setItem(FARMGOD_NEXT_RELOAD_AT_KEY, String(reloadAt));
    localStorage.setItem(FARMGOD_AUTOPLAN_AFTER_RELOAD_KEY, '1');

    markFarmGodActivity('Runde beendet – warte ' + minutes + ' Minuten');
    UI.SuccessMessage('FarmGod fertig. Nächster Lauf in ca. ' + minutes + ' Minuten.');
  };

  const clearNextReload = function () {
    localStorage.removeItem(FARMGOD_NEXT_RELOAD_AT_KEY);
    localStorage.removeItem(FARMGOD_AUTOPLAN_AFTER_RELOAD_KEY);
  };

  const getNextReloadAt = function () {
    const v = parseInt(localStorage.getItem(FARMGOD_NEXT_RELOAD_AT_KEY), 10);
    return Number.isFinite(v) ? v : 0;
  };

  const formatCountdown = function (ms) {
    if (ms <= 0) return '00:00';
    const total = Math.ceil(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  };

  const isFarmGodGlobalDisabled = function () {
    return localStorage.getItem(FARMGOD_GLOBAL_DISABLED_KEY) === '1';
  };

  const setFarmGodGlobalDisabled = function (v) {
    localStorage.setItem(FARMGOD_GLOBAL_DISABLED_KEY, v ? '1' : '0');

    if (v) {
      clearActiveFarmGodTab();
      clearNextReload();
      farmGodEnabled = false;
      farmBusy = false;
      try { Dialog.close(); } catch (err) {}
      try { $('.farmGodContent').remove(); } catch (err) {}
    }
  };

  let farmGodTabId = sessionStorage.getItem(FARMGOD_TAB_ID_KEY);
  if (!farmGodTabId) {
    farmGodTabId = String(Date.now()) + '_' + Math.random().toString(36).slice(2);
    sessionStorage.setItem(FARMGOD_TAB_ID_KEY, farmGodTabId);
  }

  const isFarmAssistantScreen = function () {
    return typeof game_data !== 'undefined' && game_data.screen == 'am_farm';
  };

  const getActiveFarmGodTab = function () {
    return localStorage.getItem(FARMGOD_ACTIVE_TAB_KEY);
  };

  const setActiveFarmGodTab = function () {
    localStorage.setItem(FARMGOD_ACTIVE_TAB_KEY, farmGodTabId);
  };

  const clearActiveFarmGodTab = function () {
    if (getActiveFarmGodTab() === farmGodTabId) {
      localStorage.removeItem(FARMGOD_ACTIVE_TAB_KEY);
    }
  };

  const isThisFarmGodTabActive = function () {
    return getActiveFarmGodTab() === farmGodTabId;
  };

  let farmGodEnabled = false;

  const refreshFarmGodEnabled = function () {
    if (isFarmGodGlobalDisabled()) {
      farmGodEnabled = false;
      return false;
    }

    // Falls noch kein aktiver Tab gesetzt ist, darf nur der Farm-Assistent-Tab automatisch übernehmen.
    if (!getActiveFarmGodTab() && isFarmAssistantScreen()) {
      setActiveFarmGodTab();
    }

    farmGodEnabled = isThisFarmGodTabActive();
    return farmGodEnabled;
  };

  refreshFarmGodEnabled();
  if (farmGodEnabled) {
    ensureStatsStarted();
    markFarmGodActivity();
  }

  const hasAutomationCapability = function () { return FARMGOD_AUTOMATION_CAPABILITY === true; };
  const getAutomationEnabled = function () {
    return hasAutomationCapability() && localStorage.getItem(FARMGOD_AUTOMATION_KEY) === '1';
  };
  const setAutomationEnabled = function (v) {
    localStorage.setItem(FARMGOD_AUTOMATION_KEY, v ? '1' : '0');
    if (!v) setAutoLoopEnabled(false);
  };

  const createControlPanel = function () {
    if (document.getElementById('farmgod-control')) return;

    const parent = document.body || document.documentElement;
    if (!parent) return;

    const panel = document.createElement('div');
    panel.id = 'farmgod-control';

    const savedLeft = localStorage.getItem('FarmGod_panelLeft');
    const savedTop = localStorage.getItem('FarmGod_panelTop');

    panel.style.cssText = `
      position:fixed;
      top:${savedTop || '100px'};
      ${savedLeft ? `left:${savedLeft};` : 'right:20px;'}
      width:230px;
      background:#f4e4bc;
      border:2px solid #6b4d1f;
      padding:12px;
      z-index:2147483647;
      cursor:move;
      box-shadow:0 2px 8px rgba(0,0,0,.4);
      border-radius:6px;
      user-select:none;
      text-align:center;
    `;

    panel.innerHTML = `
      <div id="farmgod-header" style="display:flex;justify-content:space-between;align-items:center;font-weight:bold;margin-bottom:8px;font-size:15px;">
        <span>FarmGod</span>
        <button id="farmgod-collapse" class="btn" style="padding:2px 8px;">−</button>
      </div>
      <div id="farmgod-content">
      <button id="farmgod-toggle" class="btn" style="width:100%;font-size:14px;padding:6px;margin-bottom:6px;">
        ${farmGodEnabled ? '🟢 Dieser Tab aktiv' : '🔴 Dieser Tab pausiert'}
      </button>
      <button id="farmgod-global-toggle" class="btn" style="width:100%;font-size:14px;padding:6px;margin-bottom:6px;">
        ${isFarmGodGlobalDisabled() ? '▶ Global EIN' : '⛔ Global AUS'}
      </button>

      ${hasAutomationCapability() ? `
      <div style="border-top:1px solid #7D510F;margin:7px 0 5px 0;"></div>
      <div style="font-size:12px;text-align:left;font-weight:bold;margin-bottom:4px;">🤖 TWCC Automatik</div>
      <button id="farmgod-automation-toggle" class="btn" style="width:100%;font-size:13px;padding:5px;margin-bottom:5px;">
        ${getAutomationEnabled() ? '🤖 Automatischer Versand: AN' : '🤖 Automatischer Versand: AUS'}
      </button>
      <div id="farmgod-automation-status" style="font-size:11px;text-align:left;line-height:1.35;margin-bottom:5px;">
        ${getAutomationEnabled() ? 'Geplante Farms werden automatisch nacheinander gesendet.' : 'Farms werden nur geplant und müssen manuell ausgelöst werden.'}
      </div>
      ` : ''}
      ${hasAutomationCapability() ? `
      <div style="font-size:12px;text-align:left;margin:4px 0 2px 0;font-weight:bold;">Auto-Neustart</div>
      <button id="farmgod-loop-toggle" class="btn" style="width:100%;font-size:13px;padding:5px;margin-bottom:5px;">
        ${getAutoLoopEnabled() ? '🔁 Loop AN' : '⏸ Loop AUS'}
      </button>
      <select id="farmgod-loop-range" style="width:100%;font-size:13px;margin-bottom:5px;">
        <option value="5-15">5–15 Minuten</option>
        <option value="20-40">20–40 Minuten</option>
        <option value="30-60">30–60 Minuten</option>
        <option value="60-90">60–90 Minuten</option>
      </select>
      <div id="farmgod-next-run" style="font-size:12px;text-align:center;min-height:16px;margin-bottom:6px;">
        Nächster Lauf: —
      </div>

      ` : ''}
      <div style="border-top:1px solid #7D510F;margin:7px 0 5px 0;"></div>
      <div style="font-size:12px;text-align:left;font-weight:bold;margin-bottom:4px;">📊 Statistik</div>
      <div id="farmgod-stats" style="font-size:12px;text-align:left;line-height:1.45;">
        Heute: 0<br>
        Aktuelle Runde: 0<br>
        Laufzeit: 00:00:00<br>
        Nächster Reload: —<br>
        Session: 0<br>
        Gesamt: 0<br>
        Ø/h: 0
      </div>
      <button id="farmgod-stats-reset" class="btn" style="width:100%;font-size:12px;padding:4px;margin-top:5px;">
        Statistik reset
      </button>

      <div style="border-top:1px solid #7D510F;margin:7px 0 5px 0;"></div>
      <div style="font-size:12px;text-align:left;font-weight:bold;margin-bottom:4px;">📝 Log</div>
      <div id="farmgod-log" style="font-size:11px;text-align:left;line-height:1.35;max-height:135px;overflow:auto;background:rgba(255,255,255,.35);border:1px solid #7D510F;padding:4px;">
        —
      </div>
      </div>
    `;

    parent.appendChild(panel);

    const btn = document.getElementById('farmgod-toggle');
    const globalBtn = document.getElementById('farmgod-global-toggle');
    const automationBtn = document.getElementById('farmgod-automation-toggle');
    const automationStatus = document.getElementById('farmgod-automation-status');
    const loopBtn = document.getElementById('farmgod-loop-toggle');
    const loopRange = document.getElementById('farmgod-loop-range');
    const nextRun = document.getElementById('farmgod-next-run');
    const statsBox = document.getElementById('farmgod-stats');
    const statsResetBtn = document.getElementById('farmgod-stats-reset');
    const logBox = document.getElementById('farmgod-log');
    const collapseBtn = document.getElementById('farmgod-collapse');
    const contentBox = document.getElementById('farmgod-content');

    if (loopRange) loopRange.value = getLoopRange();

    let collapsed = localStorage.getItem(FARMGOD_PANEL_COLLAPSED_KEY) === '1';

    const applyCollapsedState = function () {
      contentBox.style.display = collapsed ? 'none' : 'block';
      collapseBtn.textContent = collapsed ? '+' : '−';
    };

    collapseBtn.addEventListener('click', (e) => {
      e.stopPropagation();

      collapsed = !collapsed;
      localStorage.setItem(FARMGOD_PANEL_COLLAPSED_KEY, collapsed ? '1' : '0');
      applyCollapsedState();
    });

    applyCollapsedState();

    const updateButtonText = function () {
      refreshFarmGodEnabled();

      if (isFarmGodGlobalDisabled()) {
        btn.textContent = '⛔ Global deaktiviert';
        btn.disabled = true;
        btn.title = 'Global AUS ist aktiv';
        globalBtn.textContent = '▶ Global EIN';
      } else {
        btn.disabled = false;
        btn.textContent = farmGodEnabled ? '🟢 Dieser Tab aktiv' : '🔴 Dieser Tab pausiert';
        btn.title = farmGodEnabled
          ? 'Nur dieser Tab darf FarmGod ausführen'
          : 'Klicken, um diesen Tab als FarmGod-Tab zu aktivieren';
        globalBtn.textContent = '⛔ Global AUS';
      }

      if (automationBtn) automationBtn.textContent = getAutomationEnabled() ? '🤖 Automatischer Versand: AN' : '🤖 Automatischer Versand: AUS';
      if (automationStatus) automationStatus.textContent = getAutomationEnabled()
        ? 'Geplante Farms werden automatisch nacheinander gesendet.'
        : 'Farms werden nur geplant und müssen manuell ausgelöst werden.';
      if (loopBtn) { loopBtn.disabled = !getAutomationEnabled(); loopBtn.textContent = getAutoLoopEnabled() ? '🔁 Loop AN' : '⏸ Loop AUS'; }
      if (loopRange) { loopRange.disabled = !getAutomationEnabled(); loopRange.value = getLoopRange(); }

      const reloadAt = getNextReloadAt();
      let reloadText = '—';

      if (getAutomationEnabled() && getAutoLoopEnabled() && reloadAt > Date.now()) {
        reloadText = formatCountdown(reloadAt - Date.now());
        nextRun.textContent = 'Nächster Lauf: ' + reloadText;
      } else if (getAutomationEnabled() && getAutoLoopEnabled()) {
        reloadText = 'bereit';
        nextRun.textContent = 'Nächster Lauf: bereit';
      } else {
        nextRun.textContent = 'Nächster Lauf: —';
      }

      const stats = getFarmGodStats();
      const runtime = stats.startedAt ? formatDuration(Date.now() - stats.startedAt) : '00:00:00';

      statsBox.innerHTML =
        'Heute: <b>' + stats.today + '</b><br>' +
        'Aktuelle Runde: <b>' + stats.currentRun + '</b><br>' +
        'Laufzeit: <b>' + runtime + '</b><br>' +
        'Nächster Reload: <b>' + reloadText + '</b><br>' +
        'Session: <b>' + stats.session + '</b><br>' +
        'Gesamt: <b>' + stats.total + '</b><br>' +
        'Ø/h: <b>' +
(getAverageFarmsPerHour() === null ? 'wird berechnet...' : getAverageFarmsPerHour()) +
'</b>';

      const log = getFarmGodLog().slice(0, 25);
      logBox.innerHTML = log.length
        ? log.map((line) => line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')).join('<br>')
        : '—';
    };

    if (automationBtn) automationBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      setAutomationEnabled(!getAutomationEnabled());
      markFarmGodActivity(getAutomationEnabled() ? 'Automatischer Versand AN' : 'Automatischer Versand AUS');
      updateButtonText();
      UI.SuccessMessage(getAutomationEnabled() ? 'FarmGod Automatik aktiviert' : 'FarmGod Automatik deaktiviert');
    });

    globalBtn.addEventListener('click', (e) => {
      e.stopPropagation();

      const nextDisabled = !isFarmGodGlobalDisabled();
      setFarmGodGlobalDisabled(nextDisabled);
      markFarmGodActivity(nextDisabled ? 'Global AUS' : 'Global EIN');
      updateButtonText();

      UI.SuccessMessage(
        nextDisabled ? 'FarmGod global ausgeschaltet' : 'FarmGod global eingeschaltet'
      );
    });

    if (loopBtn) loopBtn.addEventListener('click', (e) => {
      e.stopPropagation();

      setAutoLoopEnabled(!getAutoLoopEnabled());
      if (getAutoLoopEnabled()) ensureStatsStarted();
      updateButtonText();

      UI.SuccessMessage(
        getAutoLoopEnabled() ? 'Auto-Neustart aktiviert' : 'Auto-Neustart deaktiviert'
      );
    });

    if (loopRange) loopRange.addEventListener('change', (e) => {
      e.stopPropagation();
      setLoopRange(loopRange.value);
      updateButtonText();
      UI.SuccessMessage('Auto-Neustart Bereich: ' + loopRange.options[loopRange.selectedIndex].text);
    });

    statsResetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      resetFarmGodStats();
      updateButtonText();
      UI.SuccessMessage('FarmGod Statistik zurückgesetzt');
    });

    btn.addEventListener('click', (e) => {
      e.stopPropagation();

      if (isFarmGodGlobalDisabled()) {
        updateButtonText();
        return;
      }

      refreshFarmGodEnabled();

      if (farmGodEnabled) {
        clearActiveFarmGodTab();
        farmGodEnabled = false;
      } else {
        setActiveFarmGodTab();
        farmGodEnabled = true;
        ensureStatsStarted();
        markFarmGodActivity('Dieser Tab aktiviert');
      }

      updateButtonText();

      if (!refreshFarmGodEnabled()) {
        farmBusy = false;
        try { Dialog.close(); } catch (err) {}
        $('.farmGodContent').remove();
      }

      UI.SuccessMessage(
        farmGodEnabled ? 'FarmGod in diesem Tab aktiviert' : 'FarmGod in diesem Tab pausiert'
      );
    });

    window.addEventListener('storage', (e) => {
      if (e.key === FARMGOD_ACTIVE_TAB_KEY || e.key === FARMGOD_GLOBAL_DISABLED_KEY) {
        const wasEnabled = farmGodEnabled;
        updateButtonText();

        if (wasEnabled && !farmGodEnabled) {
          farmBusy = false;
          try { Dialog.close(); } catch (err) {}
          $('.farmGodContent').remove();
        }
      }
    });

    setInterval(updateButtonText, 1000);

    setInterval(() => {
      if (isFarmGodGlobalDisabled() || !refreshFarmGodEnabled() || !getAutomationEnabled() || !getAutoLoopEnabled()) return;

      const reloadAt = getNextReloadAt();
      if (reloadAt && Date.now() >= reloadAt) {
        localStorage.setItem(FARMGOD_AUTOPLAN_AFTER_RELOAD_KEY, '1');
        markFarmGodActivity('Reload gestartet');
        location.reload();
      }
    }, 1000);

    setInterval(() => {
      if (isFarmGodGlobalDisabled()) return;
      if (!refreshFarmGodEnabled()) return;
      const reloadAt = getNextReloadAt();
      if (reloadAt && reloadAt > Date.now()) return;

      const lastActivity = getLastFarmGodActivity();
      if (!lastActivity) {
        markFarmGodActivity();
        return;
      }

      if (Date.now() - lastActivity >= FARMGOD_WATCHDOG_IDLE_MS) {
        localStorage.setItem(FARMGOD_AUTOPLAN_AFTER_RELOAD_KEY, '1');
        markFarmGodActivity('Watchdog: Hänger erkannt → Reload');
        location.reload();
      }
    }, FARMGOD_WATCHDOG_INTERVAL_MS);

    updateButtonText();



    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;

    panel.addEventListener('mousedown', (e) => {
      if (e.target.id === 'farmgod-toggle' || e.target.id === 'farmgod-collapse') return;

      dragging = true;
      offsetX = e.clientX - panel.offsetLeft;
      offsetY = e.clientY - panel.offsetTop;
    });

    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;

      panel.style.left = e.clientX - offsetX + 'px';
      panel.style.top = e.clientY - offsetY + 'px';
      panel.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => {
      if (!dragging) return;

      dragging = false;
      localStorage.setItem('FarmGod_panelLeft', panel.style.left);
      localStorage.setItem('FarmGod_panelTop', panel.style.top);
    });
  };

  // =======================
  // Auto-click pacing
  // =======================
  const FARMGOD_PACING_KEY = 'FarmGod_pacingStats';

  const FARMGOD_CLICK_MIN_MS = 160;
  const FARMGOD_CLICK_MAX_MS = 320;

  const FARMGOD_MICRO_PAUSE_AFTER_MIN_MS = 10000;
  const FARMGOD_MICRO_PAUSE_AFTER_MAX_MS = 20000;

  const FARMGOD_MICRO_PAUSE_MIN_MS = 500;
  const FARMGOD_MICRO_PAUSE_MAX_MS = 1200;

  const randInt = function (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  const getPacingStats = function () {
    try {
      return JSON.parse(sessionStorage.getItem(FARMGOD_PACING_KEY)) || {};
    } catch (e) {
      return {};
    }
  };

  const setPacingStats = function (stats) {
    sessionStorage.setItem(FARMGOD_PACING_KEY, JSON.stringify(stats));
  };

  const getNextFarmDelay = function (baseDelay = null) {
    const now = Date.now();
    let stats = getPacingStats();

    if (!stats.nextPauseAt) {
      stats.nextPauseAt = now + randInt(FARMGOD_MICRO_PAUSE_AFTER_MIN_MS, FARMGOD_MICRO_PAUSE_AFTER_MAX_MS);
    }

    let delay = baseDelay === null
      ? randInt(FARMGOD_CLICK_MIN_MS, FARMGOD_CLICK_MAX_MS)
      : baseDelay;

    if (now >= stats.nextPauseAt) {
      delay += randInt(FARMGOD_MICRO_PAUSE_MIN_MS, FARMGOD_MICRO_PAUSE_MAX_MS);
      stats.nextPauseAt = now + randInt(FARMGOD_MICRO_PAUSE_AFTER_MIN_MS, FARMGOD_MICRO_PAUSE_AFTER_MAX_MS);
    }

    setPacingStats(stats);
    return delay;
  };

  const triggerNextFarm = function (delay = null) {
    if (!getAutomationEnabled()) return;
    setTimeout(() => {
      if (!getAutomationEnabled()) return;
      if (!refreshFarmGodEnabled()) return;

      const nextFarm = $('.farmGod_icon').first();

      if (nextFarm.length) {
        nextFarm.trigger('click');
      } else {
        scheduleNextReload();
      }
    }, getNextFarmDelay(delay));
  };


  const init = function () {
    createControlPanel();

    if (!refreshFarmGodEnabled()) {
      return;
    }

    if (
      game_data.features.Premium.active &&
      game_data.features.FarmAssistent.active
    ) {
      if (game_data.screen == 'am_farm') {
        $.when(buildOptions()).then((html) => {
          if (!refreshFarmGodEnabled()) return;
          Dialog.show('FarmGod', html);

          $('.optionButton')
            .off('click')
            .on('click', () => {
              let optionGroup = parseInt($('.optionGroup').val());
              let optionDistance = parseFloat(
                $('.optionDistance').val()
              );
              let optionTime = parseFloat($('.optionTime').val());
              let optionLosses =
                $('.optionLosses').prop('checked');
              let optionMaxloot =
                $('.optionMaxloot').prop('checked');
              let optionNewbarbs =
                $('.optionNewbarbs').prop('checked') || false;

              clearNextReload();
              ensureStatsStarted();
              resetCurrentRunStats();
              markFarmGodActivity('Plan farms geklickt');

              localStorage.setItem(
                'farmGod_options',
                JSON.stringify({
                  optionGroup: optionGroup,
                  optionDistance: optionDistance,
                  optionTime: optionTime,
                  optionLosses: optionLosses,
                  optionMaxloot: optionMaxloot,
                  optionNewbarbs: optionNewbarbs,
                })
              );

              $('.optionsContent').html(
                UI.Throbber[0].outerHTML + '<br><br>'
              );
              getData(
                optionGroup,
                optionNewbarbs,
                optionLosses
              ).then((data) => {
                Dialog.close();
                markFarmGodActivity('Daten geladen');

                let plan = createPlanning(
                  optionDistance,
                  optionTime,
                  optionMaxloot,
                  data
                );
                $('.farmGodContent').remove();
                $('#am_widget_Farm')
                  .first()
                  .before(buildTable(plan.farms));

                bindEventHandlers();
                UI.InitProgressBars();
                UI.updateProgressBar(
                  $('#FarmGodProgessbar'),
                  0,
                  plan.counter
                );
                $('#FarmGodProgessbar')
                  .data('current', 0)
                  .data('max', plan.counter);

                markFarmGodActivity('Neue Runde gestartet: ' + plan.counter + ' Farms');
                if (getAutomationEnabled()) triggerNextFarm();
              }).catch((err) => {
                farmBusy = false;
                Dialog.close();
                markFarmGodActivity('Fehler beim Planen');
                UI.ErrorMessage('FarmGod Fehler beim Planen: ' + (err && err.message ? err.message : err));
                console.error('FarmGod planning error:', err);
              });
            });

          document.querySelector('.optionButton').focus();

          if (
            getAutoLoopEnabled() &&
            localStorage.getItem(FARMGOD_AUTOPLAN_AFTER_RELOAD_KEY) === '1' &&
            refreshFarmGodEnabled() &&
            !isFarmGodGlobalDisabled()
          ) {
            let autoPlanTries = 0;

            const autoPlanInterval = setInterval(() => {
              autoPlanTries++;

              if (!refreshFarmGodEnabled() || isFarmGodGlobalDisabled()) {
                clearInterval(autoPlanInterval);
                return;
              }

              const btn = document.querySelector('.optionButton');

              if (btn) {
                clearInterval(autoPlanInterval);

                localStorage.removeItem(
                  FARMGOD_AUTOPLAN_AFTER_RELOAD_KEY
                );

                markFarmGodActivity('Auto-Plan nach Reload geklickt');
                btn.click();
                return;
              }

              if (autoPlanTries >= 40) {
                clearInterval(autoPlanInterval);
                UI.ErrorMessage('FarmGod: Plan farms Button wurde nicht gefunden.');
              }
            }, 500);
          }
        });
      } else {
        location.href = game_data.link_base_pure + 'am_farm';
      }
    } else {
      UI.ErrorMessage(t.missingFeatures);
    }

    /*
    if (game_data.market != 'nl') {
      $.post('https://swtools.be/ScriptStats/insert.php', { script: 'FarmGod', market: game_data.market, world: game_data.world, player: game_data.player.id });
    }*/
  };

  const bindEventHandlers = function () {
    $('.farmGod_icon')
      .off('click')
      .on('click', function () {
        if (
          game_data.market != 'nl' ||
          $(this).data('origin') == curVillage
        ) {
          sendFarm($(this));
        } else {
          UI.ErrorMessage(t.messages.villageError);
        }
      });

    $(document)
      .off('keydown')
      .on('keydown', (event) => {
        if ((event.keyCode || event.which) == 13) {
          $('.farmGod_icon').first().trigger('click');
        }
      });

    $('.switchVillage')
      .off('click')
      .on('click', function () {
        curVillage = $(this).data('id');
        UI.SuccessMessage(t.messages.villageChanged);
        $(this).closest('tr').remove();
      });
  };

  const buildOptions = function () {
    let options = JSON.parse(localStorage.getItem('farmGod_options')) || {
      optionGroup: 0,
      optionDistance: 25,
      optionTime: 10,
      optionLosses: false,
      optionMaxloot: true,
      optionNewbarbs: true,
    };
    let checkboxSettings = [false, true, true, true, false];
    let checkboxError = $('#plunder_list_filters')
      .find('input[type="checkbox"]')
      .map((i, el) => {
        return $(el).prop('checked') != checkboxSettings[i];
      })
      .get()
      .includes(true);
    let $templateRows = $('form[action*="action=edit_all"]')
      .find('input[type="hidden"][name*="template"]')
      .closest('tr');
    let templateError =
      $templateRows.first().find('td').last().text().toNumber() >=
      $templateRows.last().find('td').last().text().toNumber();

    return $.when(buildGroupSelect(options.optionGroup)).then(
      (groupSelect) => {
        return `<style>#popup_box_FarmGod{text-align:center;width:550px;}</style>
                <h3>${t.options.title}</h3><br><div class="optionsContent">
                ${checkboxError || templateError
            ? `<div class="info_box" style="line-height: 15px;font-size:10px;text-align:left;"><p style="margin:0px 5px;">${t.options.warning}<br><img src="${t.options.filterImage}" style="width:100%;"></p></div><br>`
            : ``
          }
                <div style="width:90%;margin:auto;background: url(\'graphic/index/main_bg.jpg\') 100% 0% #E3D5B3;border: 1px solid #7D510F;border-collapse: separate !important;border-spacing: 0px !important;"><table class="vis" style="width:100%;text-align:left;font-size:11px;">
                  <tr><td>${t.options.group}</td><td>${groupSelect}</td></tr>
                  <tr><td>${t.options.distance
          }</td><td><input type="text" size="5" class="optionDistance" value="${options.optionDistance
          }"></td></tr>
                  <tr><td>${t.options.time
          }</td><td><input type="text" size="5" class="optionTime" value="${options.optionTime
          }"></td></tr>
                  <tr><td>${t.options.losses
          }</td><td><input type="checkbox" class="optionLosses" ${options.optionLosses ? 'checked' : ''
          }></td></tr>
                  <tr><td>${t.options.maxloot
          }</td><td><input type="checkbox" class="optionMaxloot" ${options.optionMaxloot ? 'checked' : ''
          }></td></tr>
                  ${game_data.market == 'nl'
            ? `<tr><td>${t.options.newbarbs
            }</td><td><input type="checkbox" class="optionNewbarbs" ${options.optionNewbarbs ? 'checked' : ''
            }></td></tr>`
            : ''
          }
                </table></div><br><input type="button" class="btn optionButton" value="${t.options.button
          }"></div>`;
      }
    );
  };

  const buildGroupSelect = function (id) {
    return $.get(
      TribalWars.buildURL('GET', 'groups', { ajax: 'load_group_menu' })
    ).then((groups) => {
      let html = `<select class="optionGroup">`;

      groups.result.forEach((val) => {
        if (val.type == 'separator') {
          html += `<option disabled=""/>`;
        } else {
          html += `<option value="${val.group_id}" ${val.group_id == id ? 'selected' : ''
            }>${val.name}</option>`;
        }
      });

      html += `</select>`;

      return html;
    });
  };

  const buildTable = function (plan) {
    let html = `<div class="vis farmGodContent"><h4>FarmGod</h4><table class="vis" width="100%">
                <tr><div id="FarmGodProgessbar" class="progress-bar live-progress-bar progress-bar-alive" style="width:98%;margin:5px auto;"><div style="background: rgb(146, 194, 0);"></div><span class="label" style="margin-top:0px;"></span></div></tr>
                <tr><th style="text-align:center;">${t.table.origin}</th><th style="text-align:center;">${t.table.target}</th><th style="text-align:center;">${t.table.fields}</th><th style="text-align:center;">${t.table.farm}</th></tr>`;

    if (!$.isEmptyObject(plan)) {
      for (let prop in plan) {
        if (game_data.market == 'nl') {
          html += `<tr><td colspan="4" style="background: #e7d098;"><input type="button" class="btn switchVillage" data-id="${plan[prop][0].origin.id}" value="${t.table.goTo} ${plan[prop][0].origin.name} (${plan[prop][0].origin.coord})" style="float:right;"></td></tr>`;
        }

        plan[prop].forEach((val, i) => {
          html += `<tr class="farmRow row_${i % 2 == 0 ? 'a' : 'b'}">
                    <td style="text-align:center;"><a href="${game_data.link_base_pure
            }info_village&id=${val.origin.id}">${val.origin.name} (${val.origin.coord
            })</a></td>
                    <td style="text-align:center;"><a href="${game_data.link_base_pure
            }info_village&id=${val.target.id}">${val.target.coord
            }</a></td>
                    <td style="text-align:center;">${val.fields.toFixed(2)}</td>
                    <td style="text-align:center;"><a href="#" data-origin="${val.origin.id
            }" data-target="${val.target.id}" data-template="${val.template.id
            }" class="farmGod_icon farm_icon farm_icon_${val.template.name
            }" style="margin:auto;"></a></td>
                  </tr>`;
        });
      }
    } else {
      html += `<tr><td colspan="4" style="text-align: center;">${t.table.noFarmsPlanned}</td></tr>`;
    }

    html += `</table></div>`;

    return html;
  };

  const getData = function (group, newbarbs, losses) {
    let data = {
      villages: {},
      commands: {},
      farms: { templates: {}, farms: {} },
    };

    let villagesProcessor = ($html) => {
      let skipUnits = ['ram', 'catapult', 'knight', 'snob', 'militia'];
      const mobileCheck = $('#mobileHeader').length > 0;

      if (mobileCheck) {
        let table = jQuery($html).find('.overview-container > div');
        table.each((i, el) => {
          try {
            const villageId = jQuery(el)
              .find('.quickedit-vn')
              .data('id');
            const name = jQuery(el)
              .find('.quickedit-label')
              .attr('data-text');
            const coord = jQuery(el)
              .find('.quickedit-label')
              .text()
              .toCoord();

            const units = new Array(game_data.units.length).fill(0);
            const unitsElements = jQuery(el).find(
              '.overview-units-row > div.unit-row-item'
            );

            unitsElements.each((_, unitElement) => {
              const img = jQuery(unitElement).find('img');
              const span =
                jQuery(unitElement).find('span.unit-row-name');
              if (img.length && span.length) {
                let unitType = img
                  .attr('src')
                  .split('unit_')[1]
                  .replace('@2x.webp', '')
                  .replace('.webp', '')
                  .replace('.png', '');
                const value = parseInt(span.text()) || 0;
                const unitIndex =
                  game_data.units.indexOf(unitType);
                if (unitIndex !== -1) {
                  units[unitIndex] = value;
                }
              }
            });

            const filteredUnits = units.filter(
              (_, index) =>
                skipUnits.indexOf(game_data.units[index]) === -1
            );

            data.villages[coord] = {
              name: name,
              id: villageId,
              units: filteredUnits,
            };
          } catch (e) {
            console.error('Error processing village data:', e);
          }
        });
      } else {
        $html
          .find('#combined_table')
          .find('.row_a, .row_b')
          .filter((i, el) => {
            return $(el).find('.bonus_icon_33').length == 0;
          })
          .map((i, el) => {
            let $el = $(el);
            let $qel = $el.find('.quickedit-label').first();
            let units = [];

            units = $el
              .find('.unit-item')
              .filter((index, element) => {
                return (
                  skipUnits.indexOf(game_data.units[index]) ==
                  -1
                );
              })
              .map((index, element) => {
                return $(element).text().toNumber();
              })
              .get();

            return (data.villages[$qel.text().toCoord()] = {
              name: $qel.data('text'),
              id: parseInt(
                $el.find('.quickedit-vn').first().data('id')
              ),
              units: units,
            });
          });
      }

      console.log('villages', data.villages);
      return data;
    };

    let commandsProcessor = ($html) => {
      $html
        .find('#commands_table')
        .find('.row_a, .row_ax, .row_b, .row_bx')
        .map((i, el) => {
          let $el = $(el);
          let coord = $el
            .find('.quickedit-label')
            .first()
            .text()
            .toCoord();

          if (coord) {
            if (!data.commands.hasOwnProperty(coord))
              data.commands[coord] = [];
            return data.commands[coord].push(
              Math.round(
                lib.timestampFromString(
                  $el.find('td').eq(2).text().trim()
                ) / 1000
              )
            );
          }
        });

      return data;
    };

    let farmProcessor = ($html) => {
      if ($.isEmptyObject(data.farms.templates)) {
        let unitSpeeds = lib.getUnitSpeeds();

        $html
          .find('form[action*="action=edit_all"]')
          .find('input[type="hidden"][name*="template"]')
          .closest('tr')
          .map((i, el) => {
            let $el = $(el);

            return (data.farms.templates[
              $el
                .prev('tr')
                .find('a.farm_icon')
                .first()
                .attr('class')
                .match(/farm_icon_(.*)\s/)[1]
            ] = {
              id: $el
                .find(
                  'input[type="hidden"][name*="template"][name*="[id]"]'
                )
                .first()
                .val()
                .toNumber(),
              units: $el
                .find(
                  'input[type="text"], input[type="number"]'
                )
                .map((index, element) => {
                  return $(element).val().toNumber();
                })
                .get(),
              speed: Math.max(
                ...$el
                  .find(
                    'input[type="text"], input[type="number"]'
                  )
                  .map((index, element) => {
                    return $(element).val().toNumber() > 0
                      ? unitSpeeds[
                      $(element)
                        .attr('name')
                        .trim()
                        .split('[')[0]
                      ]
                      : 0;
                  })
                  .get()
              ),
            });
          });
      }

      $html
        .find('#plunder_list')
        .find('tr[id^="village_"]')
        .map((i, el) => {
          let $el = $(el);

          return (data.farms.farms[
            $el
              .find('a[href*="screen=report&mode=all&view="]')
              .first()
              .text()
              .toCoord()
          ] = {
            id: $el.attr('id').split('_')[1].toNumber(),
            color: $el
              .find('img[src*="graphic/dots/"]')
              .attr('src')
              .match(/dots\/(green|yellow|red|blue|red_blue)/)[1],
            max_loot: $el.find('img[src*="max_loot/1"]').length > 0,
          });
        });

      return data;
    };

    let findNewbarbs = () => {
      if (newbarbs) {
        return twLib.get('/map/village.txt').then((allVillages) => {
          allVillages.match(/[^\r\n]+/g).forEach((villageData) => {
            let [id, name, x, y, player_id] =
              villageData.split(',');
            let coord = `${x}|${y}`;

            if (
              player_id == 0 &&
              !data.farms.farms.hasOwnProperty(coord)
            ) {
              data.farms.farms[coord] = {
                id: id.toNumber(),
              };
            }
          });

          return data;
        });
      } else {
        return data;
      }
    };

    let filterFarms = () => {
      data.farms.farms = Object.fromEntries(
        Object.entries(data.farms.farms).filter(([key, val]) => {
          return (
            !val.hasOwnProperty('color') ||
            (val.color != 'red' &&
              val.color != 'red_blue' &&
              (val.color != 'yellow' || losses))
          );
        })
      );

      return data;
    };

    return Promise.all([
      lib.processAllPages(
        TribalWars.buildURL('GET', 'overview_villages', {
          mode: 'combined',
          group: group,
        }),
        villagesProcessor
      ),
      lib.processAllPages(
        TribalWars.buildURL('GET', 'overview_villages', {
          mode: 'commands',
          type: 'attack',
        }),
        commandsProcessor
      ),
      lib.processAllPages(
        TribalWars.buildURL('GET', 'am_farm'),
        farmProcessor
      ),
      findNewbarbs(),
    ])
      .then(filterFarms)
      .then(() => {
        return data;
      });
  };

  const createPlanning = function (
    optionDistance,
    optionTime,
    optionMaxloot,
    data
  ) {
    let plan = { counter: 0, farms: {} };
    let serverTime = Math.round(lib.getCurrentServerTime() / 1000);

    for (let prop in data.villages) {
      let orderedFarms = Object.keys(data.farms.farms)
        .map((key) => {
          return { coord: key, dis: lib.getDistance(prop, key) };
        })
        .sort((a, b) => (a.dis > b.dis ? 1 : -1));

      orderedFarms.forEach((el) => {
        let farmIndex = data.farms.farms[el.coord];
        let template_name =
          optionMaxloot &&
            farmIndex.hasOwnProperty('max_loot') &&
            farmIndex.max_loot
            ? 'b'
            : 'a';
        let template = data.farms.templates[template_name];
        let unitsLeft = lib.subtractArrays(
          data.villages[prop].units,
          template.units
        );

        let distance = lib.getDistance(prop, el.coord);
        let arrival = Math.round(
          serverTime +
          distance * template.speed * 60 +
          Math.round(plan.counter / 5)
        );
        let maxTimeDiff = Math.round(optionTime * 60);
        let timeDiff = true;
        if (data.commands.hasOwnProperty(el.coord)) {
          if (
            !farmIndex.hasOwnProperty('color') &&
            data.commands[el.coord].length > 0
          )
            timeDiff = false;
          data.commands[el.coord].forEach((timestamp) => {
            if (Math.abs(timestamp - arrival) < maxTimeDiff)
              timeDiff = false;
          });
        } else {
          data.commands[el.coord] = [];
        }

        if (unitsLeft && timeDiff && distance < optionDistance) {
          plan.counter++;
          if (!plan.farms.hasOwnProperty(prop)) plan.farms[prop] = [];

          plan.farms[prop].push({
            origin: {
              coord: prop,
              name: data.villages[prop].name,
              id: data.villages[prop].id,
            },
            target: { coord: el.coord, id: farmIndex.id },
            fields: distance,
            template: { name: template_name, id: template.id },
          });

          data.villages[prop].units = unitsLeft;
          data.commands[el.coord].push(arrival);
        }
      });
    }

    return plan;
  };

  const sendFarm = function ($this) {
    if (!refreshFarmGodEnabled()) return;

    let n = Timing.getElapsedTimeSinceLoad();
    if (farmBusy) return;

    if (
      Accountmanager.farm.last_click &&
      n - Accountmanager.farm.last_click < 220
    ) {
      setTimeout(() => {
        if (refreshFarmGodEnabled()) {
          sendFarm($this);
        }
      }, 250);
      return;
    }

    {
      farmBusy = true;
      Accountmanager.farm.last_click = n;
      let $pb = $('#FarmGodProgessbar');

      TribalWars.post(
        Accountmanager.send_units_link.replace(
          /village=(\d+)/,
          'village=' + $this.data('origin')
        ),
        null,
        {
          target: $this.data('target'),
          template_id: $this.data('template'),
          source: $this.data('origin'),
        },
        function (r) {
          UI.SuccessMessage(r.success);
          incrementFarmStats();
          markFarmGodActivity('Farm gesendet');
          $pb.data('current', $pb.data('current') + 1);
          UI.updateProgressBar(
            $pb,
            $pb.data('current'),
            $pb.data('max')
          );
          $this.closest('.farmRow').remove();
          farmBusy = false;
          if (getAutomationEnabled()) triggerNextFarm();
        },
        function (r) {
          UI.ErrorMessage(r || t.messages.sendError);
          markFarmGodActivity('Farm Fehler');
          $pb.data('current', $pb.data('current') + 1);
          UI.updateProgressBar(
            $pb,
            $pb.data('current'),
            $pb.data('max')
          );
          $this.closest('.farmRow').remove();
          farmBusy = false;
          if (getAutomationEnabled()) triggerNextFarm();
        }
      );
    }
  };

  return {
    init,
  };
})(window.FarmGod.Library, window.FarmGod.Translation);

(() => {
  window.FarmGod.Main.init();

  // Fallback: Falls das Panel beim ersten Laden vom Spiel-Layout verschluckt wird,
  // wird es kurz danach erneut aufgebaut.
  let farmGodPanelRetries = 0;
  const farmGodPanelRetry = setInterval(() => {
    farmGodPanelRetries++;

    if (!document.getElementById('farmgod-control')) {
      try {
        window.FarmGod.Main.init();
      } catch (e) {}
    }

    if (document.getElementById('farmgod-control') || farmGodPanelRetries >= 10) {
      clearInterval(farmGodPanelRetry);
    }
  }, 500);
})();

})();
