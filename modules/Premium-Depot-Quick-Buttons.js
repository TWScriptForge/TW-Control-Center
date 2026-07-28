// ==UserScript==
// @name         DS Premium-Depot Quick Buttons v4.0
// @namespace    https://tampermonkey.net/
// @version      4.0.0
// @description  Konfigurierbare Quick Buttons im Premium-Depot mit verstecktem Auto-Modus und Status-Hotkeys.
// @author       Daniel
// @match        *://*.die-staemme.de/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const MODULE_ID = 'twcc-premium-depot-quick-buttons';
  const VERSION = '4.0.0';
  const STORAGE = {
    buttons: `${MODULE_ID}:buttons`,
    auto: `${MODULE_ID}:auto`,
    debug: `${MODULE_ID}:debug`
  };

  const DEFAULT_BUTTONS = [
    { id: '250k', label: '250k', type: 'fixed', value: 250000, enabled: true },
    { id: '350k', label: '350k', type: 'fixed', value: 350000, enabled: true },
    { id: '70k', label: '70k', type: 'fixed', value: 70000, enabled: true },
    { id: 'custom', label: 'Custom', type: 'custom', value: null, enabled: true },
    { id: 'max', label: 'MAX', type: 'max', value: null, enabled: true }
  ];

  const RESOURCES = ['wood', 'stone', 'iron'];
  const STOCK_IDS = {
    wood: 'premium_exchange_stock_wood',
    stone: 'premium_exchange_stock_stone',
    iron: 'premium_exchange_stock_iron'
  };

  let initialized = false;
  let lastQuickAction = null;

  function start() {
    if (window[MODULE_ID]) return;
    window[MODULE_ID] = {
      version: VERSION,
      refresh() {
        document.querySelectorAll('.pdq-button-bar').forEach(bar => {
          delete bar.dataset.signature;
        });
        init();
      }
    };

    bindHotkeys();
    if (!isExchangePage()) return;

    init();
    new MutationObserver(debounce(init, 200)).observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function isExchangePage() {
    return new URLSearchParams(location.search).get('mode') === 'exchange';
  }

  function init() {
    if (!isExchangePage()) return;

    const buttons = getButtons().filter(button => button && button.enabled !== false);

    RESOURCES.forEach(resource => {
      const input = findBuyInput(resource);
      const stock = document.getElementById(STOCK_IDS[resource]);
      applyDebugOutline(input, stock);
      if (!input || !stock) return;

      let wrap = input.closest('.pdq-wrap');
      if (!wrap) {
        wrap = document.createElement('div');
        wrap.className = 'pdq-wrap';
        wrap.dataset.pdqResource = resource;
        wrap.style.cssText = 'display:flex;flex-direction:column;align-items:flex-start;gap:6px';
        input.parentNode.insertBefore(wrap, input);
        wrap.appendChild(input);
      }

      let bar = wrap.querySelector('.pdq-button-bar');
      if (!bar) {
        bar = document.createElement('div');
        bar.className = 'pdq-button-bar';
        bar.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap';
        wrap.appendChild(bar);
      }

      const signature = JSON.stringify(buttons);
      if (bar.dataset.signature === signature) return;
      bar.textContent = '';
      bar.dataset.signature = signature;

      buttons.forEach(config => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'pdq-quick-button';
        button.textContent = String(config.label || '');
        button.dataset.buttonId = String(config.id || '');
        button.dataset.resource = resource;
        button.style.cssText = 'padding:4px 8px;border:0;border-radius:12px;cursor:pointer;font-weight:600;background:#6b4e23;color:#fff;box-shadow:inset 0 -2px 0 rgba(0,0,0,.15)';
        button.addEventListener('click', event => {
          event.preventDefault();
          event.stopPropagation();
          onQuickButtonClick(config, input, resource);
        });
        bar.appendChild(button);
      });
    });

    initialized = true;
  }

  function findBuyInput(resource) {
    let element = document.querySelector(`input.premium-exchange-input[data-type="buy"][data-resource="${resource}"]`);
    if (element) return element;

    const cell = document.getElementById(`premium_exchange_buy_${resource}`);
    if (cell) {
      element = cell.querySelector('input.premium-exchange-input[data-type="buy"], input[type="number"], input[type="text"]');
      if (element) return element;
    }

    return document.querySelector(`input[data-type="buy"][name$="_${resource}"]`) ||
      document.querySelector(`input[name$="_${resource}"]`) || null;
  }

  async function onQuickButtonClick(config, input, resource) {
    if (!isExchangePage()) return toast('Nicht im Premium-Depot.');

    const currentInput = findBuyInput(resource);
    if (!currentInput || currentInput !== input) {
      return toast(`BUY-Feld für ${resource} nicht eindeutig gefunden.`);
    }

    let finalValue;
    if (config.type === 'custom') {
      finalValue = toInt(prompt('Wert eingeben:', '100000'));
      if (!finalValue) return toast('Ungültige Zahl.');
    } else if (config.type === 'max') {
      finalValue = readStock(resource);
      if (!finalValue) return toast('Vorrat nicht gefunden.');
    } else {
      finalValue = toInt(config.value);
      if (!finalValue) return toast('Ungültiger Button-Wert.');
    }

    setValue(input, finalValue);
    lastQuickAction = { resource, value: finalValue, time: Date.now() };

    if (isAutoEnabled()) {
      toast(`Auto: ${config.label} → ${resource}`, 1000);
      await runAutoConfirm(input);
    }
  }

  async function runAutoConfirm(input) {
    if (!lastQuickAction || Date.now() - lastQuickAction.time > 4000) return;
    if (!isExchangePage() || !document.contains(input)) return;

    // Ein künstliches Enter löst im Browser keine native Formularaktion aus.
    // Deshalb wird der zum BUY-Feld gehörende Kaufen-Button bzw. das Formular benutzt.
    await sleep(180);
    const firstStep = submitBuyField(input, lastQuickAction.resource);
    if (!firstStep) {
      toast('Auto: Kaufen-Schaltfläche nicht gefunden.', 2600);
      return;
    }

    const confirmTarget = await waitForConfirmTarget(3500);
    if (!confirmTarget) {
      toast('Auto: Bestätigungsfenster nicht gefunden.', 2600);
      return;
    }

    await sleep(180);
    if (!isVisible(confirmTarget)) {
      toast('Auto: Bestätigung nicht mehr sichtbar.', 2200);
      return;
    }

    confirmTarget.focus?.();
    confirmTarget.click();
  }

  function submitBuyField(input, resource) {
    const cell = input.closest(`#premium_exchange_buy_${resource}`) || input.closest('td');
    const row = input.closest('tr');
    const form = input.closest('form');

    const roots = [cell, row, form].filter(Boolean);
    const selectors = [
      '.premium-exchange-buy',
      '.btn-premium-exchange-buy',
      '[data-type="buy"] button',
      'button[type="submit"]',
      'input[type="submit"]',
      'button.btn',
      'a.btn'
    ];

    for (const root of roots) {
      for (const selector of selectors) {
        for (const node of root.querySelectorAll(selector)) {
          if (!isVisible(node) || node === input || node.classList.contains('pdq-quick-button')) continue;
          const text = String(node.textContent || node.value || node.title || '').trim().toLowerCase();
          const type = String(node.dataset?.type || '').toLowerCase();
          if (type === 'sell' || /verkauf|sell/.test(text)) continue;
          if (type === 'buy' || /kauf|buy|tausch|exchange|berechnen|weiter/.test(text) || node.type === 'submit') {
            node.click();
            return true;
          }
        }
      }
    }

    if (form) {
      if (typeof form.requestSubmit === 'function') form.requestSubmit();
      else form.submit();
      return true;
    }

    return false;
  }

  async function waitForConfirmTarget(timeoutMs) {
    const end = Date.now() + timeoutMs;
    while (Date.now() < end) {
      const target = findVisibleConfirmTarget();
      if (target) return target;
      await sleep(100);
    }
    return null;
  }

  function findVisibleConfirmTarget() {
    const selectors = [
      '.popup_box .btn-confirm-yes',
      '.popup_box .btn-confirm',
      '.popup_box .btn-confirm-no + .btn',
      '.confirmation-box .btn-confirm',
      '.ui-dialog [data-confirm="yes"]',
      '.ui-dialog button',
      '#premium_exchange_confirm',
      '[role="dialog"] button',
      '[role="dialog"] input[type="submit"]'
    ];

    for (const selector of selectors) {
      for (const node of document.querySelectorAll(selector)) {
        if (!isVisible(node)) continue;
        const text = String(node.textContent || node.value || '').trim().toLowerCase();
        const insideDialog = !!node.closest('.popup_box, .confirmation-box, .ui-dialog, [role="dialog"]');
        if (insideDialog || /bestät|confirm|kaufen|tauschen|ok|ja/.test(text) || node.id === 'premium_exchange_confirm') {
          return node;
        }
      }
    }
    return null;
  }

  function isVisible(element) {
    if (!element || !document.documentElement.contains(element)) return false;
    const style = getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function readStock(resource) {
    const element = document.getElementById(STOCK_IDS[resource]);
    return element ? pickNumber(element.textContent || element.innerText) : null;
  }

  function setValue(input, value) {
    const prototype = Object.getPrototypeOf(input);
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
    if (descriptor?.set) descriptor.set.call(input, String(value));
    else input.value = String(value);

    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));

    const oldShadow = input.style.boxShadow;
    input.style.boxShadow = '0 0 0 3px rgba(107,78,35,.35)';
    setTimeout(() => { input.style.boxShadow = oldShadow; }, 500);
  }

  function bindHotkeys() {
    document.addEventListener('keydown', event => {
      if (!event.ctrlKey || !event.altKey || event.repeat) return;
      const key = event.key.toLowerCase();

      if (key === 'b') {
        event.preventDefault();
        const next = !isAutoEnabled();
        localStorage.setItem(STORAGE.auto, JSON.stringify(next));
        toast(`Auto-Bestätigung: ${next ? 'EIN' : 'AUS'}`, 2200);
      }

      if (key === 'i') {
        event.preventDefault();
        showStatus();
      }

      if (key === 'd') {
        event.preventDefault();
        const next = !isDebugEnabled();
        localStorage.setItem(STORAGE.debug, JSON.stringify(next));
        applyDebugToAll();
        toast(`Debug: ${next ? 'EIN' : 'AUS'}`, 1800);
      }
    }, true);
  }

  function showStatus() {
    const buttons = getButtons().filter(button => button.enabled !== false);
    const found = RESOURCES.map(resource => `${resource}: ${findBuyInput(resource) ? 'BUY ✓' : 'BUY ✗'} / ${document.getElementById(STOCK_IDS[resource]) ? 'Stock ✓' : 'Stock ✗'}`).join('\n');

    toast([
      `Premium-Depot Quick Buttons ${VERSION}`,
      `Seite: ${isExchangePage() ? 'Premium-Depot ✓' : 'nicht geöffnet ✗'}`,
      `Modul: ${initialized ? 'aktiv ✓' : 'geladen'}`,
      `Auto-Bestätigung: ${isAutoEnabled() ? 'EIN' : 'AUS'}`,
      `Debug: ${isDebugEnabled() ? 'EIN' : 'AUS'}`,
      `Buttons: ${buttons.length}`,
        `Hotkeys: Ctrl+Alt+B Auto · Ctrl+Alt+I Info · Ctrl+Alt+D Debug`,
      found
    ].join('\n'), 6500, true);
  }

  function getButtons() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE.buttons));
      return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_BUTTONS;
    } catch {
      return DEFAULT_BUTTONS;
    }
  }

  function isAutoEnabled() {
    try { return JSON.parse(localStorage.getItem(STORAGE.auto) || 'false') === true; }
    catch { return false; }
  }

  function isDebugEnabled() {
    try { return JSON.parse(localStorage.getItem(STORAGE.debug) || 'false') === true; }
    catch { return false; }
  }

  function applyDebugOutline(input, stock) {
    const enabled = isDebugEnabled();
    if (input) input.style.outline = enabled ? '2px solid rgba(0,0,255,.45)' : '';
    if (stock) stock.style.outline = enabled ? '2px solid rgba(0,128,0,.55)' : '';
  }

  function applyDebugToAll() {
    RESOURCES.forEach(resource => applyDebugOutline(findBuyInput(resource), document.getElementById(STOCK_IDS[resource])));
  }

  function pickNumber(text) {
    if (!text) return null;
    const matches = [...String(text).matchAll(/([0-9]{1,3}(?:[.\u00A0 ][0-9]{3})+|[0-9]+)/g)]
      .map(match => toInt(match[1])).filter(Boolean);
    return matches.length ? Math.max(...matches) : null;
  }

  function toInt(value) {
    const number = parseInt(String(value ?? '').replace(/[^\d]/g, ''), 10);
    return Number.isFinite(number) && number > 0 ? number : null;
  }

  function toast(message, duration = 1500, multiline = false) {
    let box = document.getElementById('pdq-toast');
    if (!box) {
      box = document.createElement('div');
      box.id = 'pdq-toast';
      box.style.cssText = 'position:fixed;right:18px;bottom:18px;padding:10px 14px;border-radius:8px;background:#6b4e23;color:#fff;font-weight:700;z-index:999999;box-shadow:0 2px 10px rgba(0,0,0,.25);max-width:420px;transition:opacity .2s';
      document.body.appendChild(box);
    }
    box.style.whiteSpace = multiline ? 'pre-line' : 'normal';
    box.textContent = message;
    box.style.opacity = '1';
    clearTimeout(box._pdqTimer);
    box._pdqTimer = setTimeout(() => { box.style.opacity = '0'; }, duration);
  }

  function debounce(fn, ms) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
