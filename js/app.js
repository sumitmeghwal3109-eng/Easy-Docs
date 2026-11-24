/* ==========================================================================
   FILE: js/app.js
   PROJECT: Zero Revisits to Bank
   PURPOSE: Connects the data (data.js), the router (navigation.js) and the
            checklist engine (checklist.js) to the screens in index.html.

   Load order in index.html:  data.js -> navigation.js -> checklist.js -> app.js

   Contents
     1.  Setup and small helpers
     2.  Toast and dialogs
     3.  Remote images (with fallback)
     4.  Splash and Welcome
     5.  Home
     6.  Select Bank
     7.  Select Service
     8.  Checklist
     9.  Additional Requirements
     10. Summary
     11. My Saved Checklists
     12. Saved Docs
     13. Profile
     14. Actions (buttons with data-action)
     15. Start-up
   ========================================================================== */

(function () {
  "use strict";

  /* ======================================================================
     1. SETUP AND SMALL HELPERS
     ====================================================================== */
  var D = window.ZRB_DATA;
  var NAV = window.ZRB_NAV;
  var CL = window.ZRB_CHECKLIST;
  var STORE = window.ZRB_STORE;

  if (!D || !NAV || !CL || !STORE) {
    console.error(
      "[ZRB] A script did not load. Check that index.html loads data.js, navigation.js, " +
      "checklist.js and app.js in that order, and that the file names match exactly."
    );
    return;
  }

  var KEYS = D.STORAGE_KEYS;
  var esc = CL.esc;
  var SEEN_KEY = "zrb_seen"; // remembers that the Welcome screen was shown once

  /* Stitch images. If one cannot load (offline, expired link), the fallback
     icon already in index.html stays visible, so the app still looks right. */
  var IMAGES = {
    logo:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBFyJftTFZJfcIX8wIxuU29FmeCiCnEkmQ7sp3kP3IPbKNssIGCx6cSOyHR5qW_UX9a5-YlQXkwAuo0vwuoR-JQRlp2N_O5PeJLOD969M9qc1FQIKZ81LJXqnUhi8aIZHUcykGxmTrQOWTQ2oQJf99AT5yY9m0DPhJMCzgftnKkkvhUjAlcwPSB9Hi-TN9C6kVG6-7lfsaiD4qmt4I0QeDTZybFuFijf7guGw9zZ5o",
    welcome:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDUYWw6q54f6s6zp-dC1i1os78z-5IrIiTD5One0euFlNHrDldoXrKZ35ePxiY1EWo_wmw8fQ6mPWII1V4R6qIbIpmMpiKqygmLNE_iciS96dcMIRrn3bASFly2ZBG0I77-lAgbpJNxuk2klc8cdaANLWMYoP1NFAWzE83NYHSuLBCkxD4EmYSo2oNhu-TijSaRCPwdgdlDrE9FgKae2KrjdIAnEjZCLwaT1bhBUzQ"
  };

  /* Screens that show the bottom navigation bar */
  var TAB_SCREENS = ["home", "saved", "docs", "profile"];

  function $(id) {
    return document.getElementById(id);
  }

  /* Show or hide an element. "display" is the class that gives it its layout
     when visible (for example "flex" for elements that start as is-hidden). */
  function setVisible(el, visible, display) {
    if (!el) { return; }
    el.classList.toggle("is-hidden", !visible);
    if (display) { el.classList.toggle(display, visible); }
  }

  /* ---------- session (what the user is choosing right now) ---------- */
  function getBankId() {
    var id = STORE.session.get().bankId;
    return D.getBank(id) ? id : null;
  }

  function getServiceId() {
    var id = STORE.session.get().serviceId;
    return D.getService(id) ? id : null;
  }

  /* ---------- profile and preferences ---------- */
  function getProfile() {
    var saved = STORE.get(KEYS.profile, null);
    if (!saved || typeof saved !== "object") { saved = {}; }
    return Object.assign({}, D.DEFAULT_PROFILE, saved);
  }

  function hasSavedProfile() {
    var saved = STORE.get(KEYS.profile, null);
    return !!saved && typeof saved === "object";
  }

  function getPrefs() {
    var saved = STORE.get(KEYS.prefs, null);
    if (!saved || typeof saved !== "object") { saved = {}; }
    return Object.assign({}, D.DEFAULT_PREFS, saved);
  }

  /* All checklists that have ticked documents (saved ones + the unsaved
     active one). Used by Saved Docs and the Profile counter. */
  function collectChecklists() {
    var list = CL.getSaved().slice();
    var active = CL.getActive();
    if (active && !active.saved && !list.some(function (c) { return c.id === active.id; })) {
      list.push(active);
    }
    return list;
  }

  function countReadyDocs() {
    return collectChecklists().reduce(function (sum, c) {
      return sum + CL.getProgress(c).done;
    }, 0);
  }

  /* ======================================================================
     2. TOAST AND DIALOGS
     ====================================================================== */
  var toastTimer = null;

  function toast(message) {
    var el = $("toast");
    if (!el) { return; }
    el.textContent = message;
    el.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove("is-visible");
    }, 2600);
  }

  var confirmHandler = null;

  function openModal(id) {
    var modal = $(id);
    if (!modal) { return; }
    modal.classList.add("is-open");
    var focusTarget = modal.querySelector("input, select, button");
    setTimeout(function () {
      if (focusTarget) { focusTarget.focus(); }
    }, 30);
  }

  function closeModals() {
    var open = document.querySelectorAll(".zrb-modal-backdrop.is-open");
    for (var i = 0; i < open.length; i++) {
      open[i].classList.remove("is-open");
    }
    confirmHandler = null;
  }

  /* Generic "Are you sure?" dialog.
     options: { title, text, okLabel, onOk } */
  function askConfirm(options) {
    $("confirm-title").textContent = options.title || "Are you sure?";
    $("confirm-text").textContent = options.text || "";
    $("confirm-ok").textContent = options.okLabel || "Confirm";
    confirmHandler = options.onOk || null;
    openModal("modal-confirm");
  }

  /* ======================================================================
     3. REMOTE IMAGES (with fallback)
     ====================================================================== */
  function loadRemoteImages() {
    var images = document.querySelectorAll("img[data-remote]");
    Array.prototype.forEach.call(images, function (img) {
      var url = IMAGES[img.getAttribute("data-remote")];
      if (!url) { return; }
      var probe = new Image();
      probe.onload = function () {
        img.src = url;
        img.classList.remove("is-hidden");
        var fallback = img.parentElement && img.parentElement.querySelector("[data-fallback]");
        if (fallback) { fallback.classList.add("is-hidden"); }
      };
      probe.onerror = function () {
        /* Do nothing: the fallback icon stays visible. */
      };
      probe.src = url;
    });
  }

  /* ======================================================================
     4. SPLASH AND WELCOME
     ====================================================================== */
  var splashTimers = [];

  var SPLASH_STEPS = [
    { width: "45%", text: "Loading document requirements..." },
    { width: "80%", text: "Checking sample branch guidelines..." },
    { width: "100%", text: "Ready for your visit" }
  ];

  function clearSplashTimers() {
    splashTimers.forEach(function (id) { clearTimeout(id); });
    splashTimers = [];
  }

  function setSplash(width, text) {
    var bar = $("splash-progress");
    var status = $("splash-status");
    if (bar) { bar.style.width = width; }
    if (status) { status.textContent = text; }
  }

  function startSplash() {
    clearSplashTimers();
    setSplash("15%", "Preparing your checklists...");
    SPLASH_STEPS.forEach(function (step, index) {
      splashTimers.push(setTimeout(function () {
        setSplash(step.width, step.text);
      }, (index + 1) * 450));
    });
    splashTimers.push(setTimeout(finishSplash, 2400));
  }

  /* Leave the splash: first visit -> Welcome, afterwards -> Home */
  function finishSplash() {
    clearSplashTimers();
    if (NAV.current() !== "splash") { return; }
    var seen = STORE.get(SEEN_KEY, false);
    STORE.set(SEEN_KEY, true);
    NAV.go(seen ? "home" : "welcome", { replace: true });
  }

  var STEP_HINTS = {
    1: "Select your bank from the supported list.",
    2: "Pick what you need: account opening, KYC, card, loan and more.",
    3: "Get a personalised, checkable list of the documents you may need."
  };

  function setStep(step) {
    var pills = document.querySelectorAll("#step-pills .step-pill");
    Array.prototype.forEach.call(pills, function (pill) {
      var active = pill.getAttribute("data-step") === String(step);
      var badge = pill.querySelector(".step-badge");
      pill.classList.toggle("bg-secondary-fixed", active);
      pill.classList.toggle("text-on-secondary-fixed-variant", active);
      pill.classList.toggle("bg-surface-container-lowest", !active);
      pill.classList.toggle("text-on-surface-variant", !active);
      if (badge) {
        badge.classList.toggle("bg-secondary", active);
        badge.classList.toggle("text-on-secondary", active);
        badge.classList.toggle("bg-surface-container-high", !active);
        badge.classList.toggle("text-on-surface-variant", !active);
      }
    });
    $("step-hint-text").textContent = STEP_HINTS[step] || STEP_HINTS[1];
  }

  function renderWelcome() {
    $("bank-count-label").textContent = D.BANKS.length + " Sample Banks";
    setStep(1);
  }

  /* ======================================================================
     5. HOME
     ====================================================================== */
  function renderHome() {
    var name = getProfile().name.trim();
    var first = name ? name.split(/\s+/)[0] : "";
    $("home-greeting").textContent = first ? "Hello, " + first + "!" : "Hello, Welcome Back!";
    renderServicesGrid();
    renderRecent();
  }

  function renderServicesGrid() {
    var input = $("service-search");
    var query = (input.value || "").trim().toLowerCase();
    setVisible($("clear-search"), query.length > 0);

    var matches = D.SERVICES.filter(function (s) {
      if (!query) { return true; }
      var haystack = (s.title + " " + s.subtitle + " " + s.keywords.join(" ")).toLowerCase();
      return haystack.indexOf(query) !== -1;
    });

    $("services-grid").innerHTML = matches.map(function (s) {
      var tone = D.TONES[s.tone] || D.TONES.neutral;
      return (
        '<button type="button" data-home-service="' + esc(s.id) + '" ' +
        'class="group flex flex-col items-start gap-space-sm p-space-md rounded-xl bg-surface-container-lowest shadow-sm hover:shadow-md active:scale-[0.98] transition-all text-left w-full">' +
        '<div class="w-10 h-10 rounded-lg ' + tone.box + " " + tone.hover + ' flex items-center justify-center transition-colors">' +
        '<span class="material-symbols-outlined text-[22px]">' + esc(s.icon) + "</span></div>" +
        '<span class="font-label-lg text-label-lg text-on-surface line-clamp-2">' + esc(s.title) + "</span>" +
        "</button>"
      );
    }).join("");

    $("service-count").textContent = matches.length === 1 ? "1 Service" : matches.length + " Services";
    setVisible($("services-grid"), matches.length > 0);
    setVisible($("services-empty"), matches.length === 0, "flex");
  }

  function renderRecent() {
    var recent = CL.getSaved().slice(0, 3);
    $("recent-list").innerHTML = recent.map(function (c) {
      var p = CL.getProgress(c);
      var service = D.getService(c.serviceId);
      var icon = service ? service.icon : "account_balance";
      var chip = p.isReady
        ? '<span class="inline-flex items-center gap-1 px-space-sm py-space-xs rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant font-label-sm text-label-sm shrink-0">' +
          '<span class="material-symbols-outlined text-[14px] icon-fill">verified</span>Ready</span>'
        : '<span class="inline-flex items-center px-space-sm py-space-xs rounded-full bg-secondary-fixed text-on-secondary-fixed-variant font-label-sm text-label-sm shrink-0">' +
          p.done + " of " + p.total + " ready</span>";
      var bar = p.isReady
        ? ""
        : '<div class="w-full h-2 rounded-full bg-secondary-fixed overflow-hidden"><div class="progress-fill h-full bg-on-tertiary-container rounded-full" style="width:' + p.percent + '%"></div></div>';
      return (
        '<button type="button" data-recent-open="' + esc(c.id) + '" ' +
        'class="w-full text-left flex flex-col gap-space-sm p-space-md rounded-xl bg-surface-container-lowest shadow-sm active:scale-[0.99] transition-transform">' +
        '<div class="flex items-center justify-between gap-space-sm">' +
        '<div class="flex items-center gap-space-sm min-w-0">' +
        '<div class="w-10 h-10 rounded-full ' + (p.isReady ? "bg-tertiary-fixed text-on-tertiary-fixed-variant" : "bg-secondary-fixed text-secondary") + ' flex items-center justify-center shrink-0">' +
        '<span class="material-symbols-outlined text-[20px]">' + esc(icon) + "</span></div>" +
        '<div class="flex flex-col min-w-0">' +
        '<span class="font-label-lg text-label-lg text-on-surface truncate">' + esc(c.bankName) + "</span>" +
        '<span class="font-body-sm text-body-sm text-on-surface-variant truncate">' + esc(CL.getTitle(c)) + "</span>" +
        "</div></div>" + chip + "</div>" + bar + "</button>"
      );
    }).join("");

    setVisible($("recent-list"), recent.length > 0);
    setVisible($("recent-empty"), recent.length === 0, "flex");
  }

  /* ======================================================================
     6. SELECT BANK
     ====================================================================== */
  function renderBanks() {
    var query = ($("bank-search").value || "").trim().toLowerCase();
    setVisible($("bank-clear"), query.length > 0, "flex");

    var selected = getBankId();
    var profile = getProfile();
    var showPreferred = hasSavedProfile();

    var matches = D.BANKS.filter(function (b) {
      if (!query) { return true; }
      return (b.name + " " + b.shortName + " " + b.initials + " " + b.category)
        .toLowerCase().indexOf(query) !== -1;
    });

    $("bank-list").innerHTML = matches.map(function (b) {
      var on = b.id === selected;
      var category = b.category + (showPreferred && b.id === profile.preferredBankId ? " • Your preferred bank" : "");
      return (
        '<div role="listitem"><button type="button" data-bank-id="' + esc(b.id) + '" aria-pressed="' + on + '" ' +
        'class="w-full flex items-center justify-between gap-space-md p-space-md rounded-xl ' +
        (on ? "bg-tertiary-fixed/25 shadow-md" : "bg-surface-container-lowest shadow-sm") +
        ' text-left transition-all">' +
        '<div class="flex items-center gap-space-md min-w-0">' +
        '<div class="w-11 h-11 rounded-lg ' + b.iconClass + ' flex items-center justify-center shrink-0 font-label-lg text-label-lg">' + esc(b.initials) + "</div>" +
        '<div class="flex flex-col min-w-0">' +
        '<span class="font-title-md text-title-md text-on-surface truncate">' + esc(b.name) + "</span>" +
        '<span class="font-body-sm text-body-sm ' + (on ? "text-on-tertiary-fixed-variant" : "text-on-surface-variant") + ' truncate">' + esc(category) + "</span>" +
        "</div></div>" +
        '<div class="w-6 h-6 rounded-full ' + (on ? "bg-on-tertiary-container text-on-tertiary" : "bg-surface-container text-transparent") + ' flex items-center justify-center shrink-0">' +
        '<span class="material-symbols-outlined text-[16px]">check</span></div>' +
        "</button></div>"
      );
    }).join("");

    setVisible($("bank-list"), matches.length > 0);
    setVisible($("bank-empty"), matches.length === 0, "flex");
    $("bank-continue").classList.toggle("opacity-60", !selected);
  }

  /* ======================================================================
     7. SELECT SERVICE
     ====================================================================== */
  function renderServices() {
    var bank = D.getBank(getBankId());
    $("service-bank-name").textContent = bank ? bank.name : "-";
    var selected = getServiceId();

    $("service-list").innerHTML = D.SERVICES.map(function (s) {
      var on = s.id === selected;
      return (
        '<div role="listitem"><button type="button" data-service-id="' + esc(s.id) + '" aria-pressed="' + on + '" ' +
        'class="w-full text-left rounded-xl p-space-md shadow-sm flex items-center justify-between gap-space-md transition-all active:scale-[0.99] ' +
        (on ? "bg-primary-fixed/40" : "bg-surface-container-lowest hover:bg-surface-container-low") + '">' +
        '<div class="flex items-center gap-space-md min-w-0">' +
        '<div class="w-11 h-11 rounded-xl ' + (on ? "bg-primary text-on-primary" : "bg-surface-container-low text-on-surface-variant") + ' flex items-center justify-center shrink-0 transition-colors">' +
        '<span class="material-symbols-outlined text-[22px]' + (on ? " icon-fill" : "") + '">' + esc(s.icon) + "</span></div>" +
        '<div class="flex flex-col min-w-0">' +
        '<span class="font-title-md text-title-md text-on-surface truncate">' + esc(s.title) + "</span>" +
        '<span class="font-body-sm text-body-sm text-on-surface-variant truncate">' + esc(s.subtitle) + "</span>" +
        "</div></div>" +
        '<span class="material-symbols-outlined text-[24px] shrink-0 ' + (on ? "text-primary icon-fill" : "text-outline-variant") + '">' +
        (on ? "check_circle" : "radio_button_unchecked") + "</span>" +
        "</button></div>"
      );
    }).join("");

    $("service-continue").classList.toggle("opacity-60", !selected);
  }

  /* ======================================================================
     8. CHECKLIST  (the most important screen)
     ====================================================================== */
  var expandedDocs = {}; // which document "Tips" panels are open

  function docItemHTML(d) {
    var done = !!d.done;
    var required = d.status === "mandatory";
    var chip = required
      ? '<span class="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm shrink-0">Required</span>'
      : '<span class="px-2 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm inline-flex items-center gap-1 shrink-0">' +
        '<span class="material-symbols-outlined text-[12px]">info</span>Conditional</span>';
    var verified = d.verification === "verified";
    var open = !!expandedDocs[d.id];

    var removeBtn = d.custom
      ? '<button type="button" data-doc-remove="' + esc(d.id) + '" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-error-container text-on-error-container font-label-sm text-label-sm">' +
        '<span class="material-symbols-outlined text-[14px]">delete</span><span>Remove</span></button>'
      : "";

    return (
      '<div class="doc-item bg-surface-container-low rounded-lg p-space-md flex items-start gap-space-md cursor-pointer transition-colors" ' +
      'data-doc-id="' + esc(d.id) + '" data-done="' + done + '">' +
      '<button type="button" role="checkbox" aria-checked="' + done + '" aria-label="' + esc(d.name) + '" ' +
      'class="w-6 h-6 rounded-lg ' + (done ? "bg-on-tertiary-container text-on-tertiary" : "bg-surface-container-lowest text-transparent shadow-sm") +
      ' flex items-center justify-center shrink-0 mt-0.5 transition-all">' +
      '<span class="material-symbols-outlined text-[16px]">check</span></button>' +
      '<div class="flex flex-col gap-1 flex-1 min-w-0">' +
      '<div class="flex items-center justify-between gap-space-sm flex-wrap">' +
      '<span class="doc-title font-label-lg text-label-lg text-on-surface">' + esc(d.name) + "</span>" + chip + "</div>" +
      '<p class="font-body-sm text-body-sm text-on-surface-variant">' + esc(d.description) + "</p>" +
      '<p class="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">' +
      '<span class="material-symbols-outlined text-[14px]">content_copy</span>' + esc(d.copies) +
      (verified ? "" : " &middot; Sample data") + "</p>" +
      '<div class="pt-1 flex flex-wrap items-center gap-space-sm">' +
      '<button type="button" data-doc-ref="' + esc(d.id) + '" title="Mark that you have a copy or reference ready" ' +
      'class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg ' +
      (d.refAttached ? "bg-tertiary-fixed text-on-tertiary-fixed" : "bg-surface-container-lowest text-secondary hover:bg-secondary-fixed") +
      ' font-label-sm text-label-sm shadow-sm transition-colors">' +
      '<span class="material-symbols-outlined text-[14px]">' + (d.refAttached ? "check_circle" : "attach_file") + "</span>" +
      "<span>" + (d.refAttached ? "Ref Attached" : "Attach Ref") + "</span></button>" +
      '<button type="button" data-doc-info="' + esc(d.id) + '" aria-expanded="' + open + '" ' +
      'class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container-lowest text-on-surface-variant font-label-sm text-label-sm shadow-sm">' +
      '<span class="material-symbols-outlined text-[14px]">' + (open ? "expand_less" : "lightbulb") + "</span><span>" + (open ? "Hide tips" : "Tips") + "</span></button>" +
      removeBtn + "</div>" +
      '<div class="' + (open ? "" : "is-hidden ") + 'mt-1 rounded-lg bg-secondary-fixed/50 p-space-sm flex flex-col gap-1">' +
      '<p class="font-body-sm text-body-sm text-on-secondary-fixed">' + esc(d.instructions) + "</p>" +
      '<span class="self-start px-2 py-0.5 rounded-full ' + (verified ? "bg-tertiary-fixed text-on-tertiary-fixed" : "bg-surface-container-lowest text-on-surface-variant") + ' font-label-sm text-label-sm">' +
      (verified ? "Verified against an official source" : "Demo data - not officially verified") + "</span>" +
      "</div></div></div>"
    );
  }

  function renderChecklist(keepScroll) {
    var cl = CL.getActive();
    if (!cl) { return; }
    var scrollY = window.scrollY;
    var p = CL.getProgress(cl);
    var st = CL.getStatusText(p);

    $("cl-title").textContent = cl.bankName + " \u2022 " + CL.getTitle(cl);
    $("cl-badge").textContent = p.percent + "%";
    $("cl-progress-text").textContent = p.done + " of " + p.total + " documents completed";
    $("cl-status").innerHTML =
      '<span class="material-symbols-outlined text-[14px]' + (st.filled ? " icon-fill" : "") + '">' + st.icon + "</span> " + esc(st.label);
    $("cl-bar").style.width = p.percent + "%";
    $("cl-bar-wrap").setAttribute("aria-valuenow", String(p.percent));
    $("cl-mandatory").textContent =
      "Mandatory documents: " + p.mandatoryDone + " of " + p.mandatoryTotal + " completed" +
      (p.isReady ? " - ready for your visit" : "");
    $("cl-notice").textContent = D.APP.demoNotice;

    $("cl-saved-chip").innerHTML = cl.saved
      ? '<span class="material-symbols-outlined text-[14px] icon-fill">cloud_done</span> Saved in this browser'
      : '<span class="material-symbols-outlined text-[14px]">cloud_off</span> Not saved yet';
    $("cl-save-label").textContent = cl.saved ? "Saved" : "Save";

    var groups = CL.groupDocuments(cl);
    $("cl-groups").innerHTML = groups.map(function (g, index) {
      var doneInGroup = g.docs.filter(function (d) { return d.done; }).length;
      return (
        '<div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-space-md">' +
        '<div class="flex items-center justify-between gap-space-sm">' +
        '<div class="flex items-center gap-space-sm min-w-0">' +
        '<span class="material-symbols-outlined text-secondary text-[20px] icon-fill">' + esc(g.icon) + "</span>" +
        '<h3 class="font-title-md text-title-md text-on-surface truncate">' + (index + 1) + ". " + esc(g.label) + "</h3></div>" +
        '<span class="font-label-sm text-label-sm text-on-surface-variant shrink-0">' + doneInGroup + "/" + g.docs.length + "</span></div>" +
        '<div class="flex flex-col gap-space-sm">' + g.docs.map(docItemHTML).join("") + "</div></div>"
      );
    }).join("");

    if (keepScroll) { window.scrollTo(0, scrollY); }
  }

  /* Save changes made to the active checklist, then redraw */
  function commitChecklist(cl, keepScroll) {
    var ok = CL.persistActive(cl);
    if (!ok) {
      toast("Could not save your changes. Browser storage may be full or blocked.");
    }
    renderChecklist(keepScroll !== false);
  }

  function onChecklistClick(event) {
    var target = event.target;
    var cl = CL.getActive();
    if (!cl) { return; }

    var refBtn = target.closest("[data-doc-ref]");
    if (refBtn) {
      CL.toggleRef(cl, refBtn.getAttribute("data-doc-ref"));
      commitChecklist(cl);
      return;
    }

    var infoBtn = target.closest("[data-doc-info]");
    if (infoBtn) {
      var infoId = infoBtn.getAttribute("data-doc-info");
      expandedDocs[infoId] = !expandedDocs[infoId];
      renderChecklist(true);
      return;
    }

    var removeBtn = target.closest("[data-doc-remove]");
    if (removeBtn) {
      if (CL.removeDocument(cl, removeBtn.getAttribute("data-doc-remove"))) {
        commitChecklist(cl);
        toast("Document removed");
      }
      return;
    }

    /* Any other tap on a document card ticks / unticks it */
    var item = target.closest(".doc-item");
    if (item) {
      if (CL.toggleDoc(cl, item.getAttribute("data-doc-id")) !== null) {
        commitChecklist(cl);
      }
    }
  }

  /* ======================================================================
     9. ADDITIONAL REQUIREMENTS
     ====================================================================== */
  function extraCardHTML(card) {
    var tone = D.TONES[card.tone] || D.TONES.neutral;
    return (
      '<div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex items-start gap-space-md">' +
      '<div class="w-11 h-11 rounded-xl ' + tone.box + ' flex items-center justify-center shrink-0">' +
      '<span class="material-symbols-outlined text-[22px]">' + esc(card.icon) + "</span></div>" +
      '<div class="flex flex-col gap-space-xs min-w-0">' +
      '<h3 class="font-title-md text-title-md text-on-surface">' + esc(card.title) + "</h3>" +
      '<p class="font-body-sm text-body-sm text-on-surface-variant">' + esc(card.text) + "</p></div></div>"
    );
  }

  function renderExtras() {
    var cl = CL.getActive();
    if (!cl) { return; }
    var extras = CL.getExtras(cl.bankId, cl.serviceId);

    $("extras-context").textContent = cl.bankName + " \u2022 " + cl.serviceName;
    $("extras-cards").innerHTML = extras.cards.map(extraCardHTML).join("");
    $("extras-bank").innerHTML = extras.bankCards.map(extraCardHTML).join("");
    $("extras-important").textContent = extras.important;
    $("extras-reminder").textContent = extras.reminder;

    var pack = cl.pack || {};
    var total = extras.packList.length;
    var ticked = extras.packList.filter(function (item) { return pack[item.id]; }).length;

    $("pack-list").innerHTML = total
      ? extras.packList.map(function (item) {
          var on = !!pack[item.id];
          return (
            '<button type="button" data-pack-id="' + esc(item.id) + '" aria-pressed="' + on + '" ' +
            'class="w-full flex items-center gap-space-md p-space-sm rounded-lg hover:bg-surface-container-low transition-colors text-left">' +
            '<span class="w-6 h-6 rounded-md ' + (on ? "bg-on-tertiary-container text-on-tertiary" : "bg-surface-container-high text-transparent") + ' flex items-center justify-center shrink-0 transition-all">' +
            '<span class="material-symbols-outlined text-[16px]">check</span></span>' +
            '<span class="material-symbols-outlined text-[20px] text-secondary shrink-0">' + esc(item.icon) + "</span>" +
            '<span class="font-body-md text-body-md ' + (on ? "line-through text-on-surface-variant" : "text-on-surface") + '">' + esc(item.label) + "</span></button>"
          );
        }).join("")
      : '<p class="p-space-sm font-body-sm text-body-sm text-on-surface-variant">Nothing extra to pack for this service.</p>';

    var counter = $("pack-counter");
    var all = total > 0 && ticked === total;
    counter.textContent = all ? "All " + total + " ready!" : ticked + " of " + total + " ready";
    counter.className =
      "px-2.5 py-1 rounded-full font-label-sm text-label-sm transition-colors duration-200 " +
      (all ? "bg-tertiary-fixed text-on-tertiary-fixed" : "bg-surface-container-high text-on-surface-variant");
  }

  function onPackClick(event) {
    var btn = event.target.closest("[data-pack-id]");
    var cl = CL.getActive();
    if (!btn || !cl) { return; }
    CL.togglePack(cl, btn.getAttribute("data-pack-id"));
    CL.persistActive(cl);
    renderExtras();
  }

  /* ======================================================================
     10. SUMMARY
     ====================================================================== */
  function summaryRowHTML(d, done) {
    var required = d.status === "mandatory";
    var chip = done
      ? '<span class="font-label-sm text-label-sm text-on-tertiary-fixed-variant bg-tertiary-fixed/60 px-space-sm py-space-xs rounded-full shrink-0">Ready</span>'
      : required
        ? '<span class="font-label-sm text-label-sm text-on-error-container bg-error-container/60 px-space-sm py-space-xs rounded-full shrink-0">Mandatory</span>'
        : '<span class="font-label-sm text-label-sm text-on-secondary-fixed-variant bg-secondary-fixed px-space-sm py-space-xs rounded-full shrink-0">Conditional</span>';
    return (
      '<button type="button" data-sum-toggle="' + esc(d.id) + '" ' +
      'aria-label="' + esc(done ? "Mark " + d.name + " as pending" : "Mark " + d.name + " as completed") + '" ' +
      'class="w-full text-left bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex items-center justify-between gap-space-md transition-all duration-200">' +
      '<div class="flex items-center gap-space-md min-w-0">' +
      '<div class="w-8 h-8 rounded-lg ' + (done ? "bg-on-tertiary-container" : "bg-error-container") + ' flex items-center justify-center shrink-0">' +
      '<span class="material-symbols-outlined text-[20px] ' + (done ? "text-on-primary" : "text-on-error-container") + '">' + (done ? "check" : "schedule") + "</span></div>" +
      '<div class="flex flex-col min-w-0">' +
      '<span class="font-label-lg text-label-lg text-on-surface truncate">' + esc(d.name) + "</span>" +
      '<span class="font-body-sm text-body-sm text-on-surface-variant truncate">' + esc(d.copies) + "</span></div></div>" +
      chip + "</button>"
    );
  }

  function renderSummary() {
    var cl = CL.getActive();
    if (!cl) { return; }
    var p = CL.getProgress(cl);
    var msg = CL.getReadinessMessage(p);

    $("sum-heading").textContent = msg.heading;
    $("sum-sub").textContent = msg.sub;
    $("sum-badge").className =
      "w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-sm " +
      (msg.ready ? "bg-tertiary-fixed" : "bg-error-container");
    $("sum-badge-icon").className =
      "material-symbols-outlined text-[24px] icon-fill " +
      (msg.ready ? "text-on-tertiary-fixed" : "text-on-error-container");
    $("sum-badge-icon").textContent = msg.ready ? "verified" : "pending_actions";

    $("sum-bank").textContent = cl.bankName;
    $("sum-service").textContent = cl.serviceName;
    $("sum-total").textContent = String(p.total);
    $("sum-done").textContent = String(p.done);
    $("sum-pending").textContent = String(p.pending);
    $("sum-fraction").textContent = p.done + " of " + p.total + " completed";

    var percentChip = $("sum-percent");
    percentChip.textContent = p.percent + "% ready";
    percentChip.className =
      "font-label-md text-label-md px-space-sm py-space-xs rounded-full " +
      (msg.ready ? "text-on-tertiary-fixed-variant bg-tertiary-fixed/60" : "text-on-secondary-fixed-variant bg-secondary-fixed");

    $("sum-bar").style.width = p.percent + "%";
    $("sum-bar").className = "progress-fill h-full rounded-full " + (msg.ready ? "bg-on-tertiary-container" : "bg-secondary");
    $("sum-bar-wrap").setAttribute("aria-valuenow", String(p.percent));

    $("sum-mandatory").textContent =
      "Mandatory documents: " + p.mandatoryDone + " of " + p.mandatoryTotal + " completed." +
      (p.conditionalTotal ? " Conditional documents: " + p.conditionalDone + " of " + p.conditionalTotal + " (only if they apply to you)." : "");
    $("sum-disclaimer").textContent = D.APP.disclaimer;

    var doneDocs = cl.documents.filter(function (d) { return d.done; });
    var pendingDocs = cl.documents.filter(function (d) { return !d.done; });

    $("sum-done-badge").textContent = doneDocs.length + " Ready";
    $("sum-pending-badge").textContent = pendingDocs.length + " Pending";

    $("sum-done-list").innerHTML = doneDocs.length
      ? doneDocs.map(function (d) { return summaryRowHTML(d, true); }).join("")
      : '<p class="font-body-sm text-body-sm text-on-surface-variant px-space-xs">No documents completed yet.</p>';

    $("sum-pending-list").innerHTML = pendingDocs.length
      ? pendingDocs.map(function (d) { return summaryRowHTML(d, false); }).join("")
      : '<p class="font-body-sm text-body-sm text-on-surface-variant px-space-xs">Nothing pending. Every document is completed.</p>';
  }

  function onSummaryClick(event) {
    var btn = event.target.closest("[data-sum-toggle]");
    var cl = CL.getActive();
    if (!btn || !cl) { return; }
    if (CL.toggleDoc(cl, btn.getAttribute("data-sum-toggle")) !== null) {
      CL.persistActive(cl);
      renderSummary();
    }
  }

  /* ======================================================================
     11. MY SAVED CHECKLISTS
     ====================================================================== */
  function renderSaved() {
    var list = CL.getSaved();
    var readyCount = list.filter(function (c) { return CL.getProgress(c).isReady; }).length;

    $("saved-summary").textContent = list.length + " saved \u2022 " + readyCount + " ready for branch";
    $("saved-ready-chip").textContent = readyCount + " / " + list.length + " Ready";

    $("saved-list").innerHTML = list.map(function (c) {
      var p = CL.getProgress(c);
      var service = D.getService(c.serviceId);
      var icon = service ? service.icon : "account_balance";
      var pending = c.documents.filter(function (d) { return !d.done; }).map(function (d) { return d.name; });
      var pendingLine = pending.length
        ? "Pending: " + pending.slice(0, 3).join(", ") + (pending.length > 3 ? " +" + (pending.length - 3) + " more" : "")
        : "Nothing pending";

      var chip = p.isReady
        ? '<span class="inline-flex items-center gap-1 bg-tertiary-fixed text-on-tertiary-fixed-variant font-label-sm text-label-sm px-space-sm py-space-xs rounded-full shrink-0">' +
          '<span class="material-symbols-outlined text-[14px] icon-fill">check_circle</span><span>Ready</span></span>'
        : '<span class="inline-flex items-center gap-1 bg-secondary-fixed text-on-secondary-fixed-variant font-label-sm text-label-sm px-space-sm py-space-xs rounded-full shrink-0">' +
          '<span class="material-symbols-outlined text-[14px]">schedule</span><span>' + p.done + " of " + p.total + " Done</span></span>";

      return (
        '<article data-saved-id="' + esc(c.id) + '" class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-space-sm">' +
        '<div class="flex items-start justify-between gap-space-sm">' +
        '<div class="flex items-center gap-space-sm min-w-0">' +
        '<div class="w-10 h-10 rounded-lg ' + (p.isReady ? "bg-tertiary-fixed text-on-tertiary-fixed-variant" : "bg-secondary-fixed text-on-secondary-fixed-variant") + ' flex items-center justify-center shrink-0">' +
        '<span class="material-symbols-outlined text-[22px]">' + esc(icon) + "</span></div>" +
        '<div class="min-w-0"><h2 class="font-title-md text-title-md text-on-surface truncate">' + esc(c.bankName) + "</h2>" +
        '<p class="font-body-md text-body-md text-on-surface-variant truncate">' + esc(CL.getTitle(c)) + "</p></div></div>" + chip + "</div>" +
        '<div class="flex flex-col gap-space-xs pt-space-xs">' +
        '<div class="flex items-center justify-between"><span class="font-body-sm text-body-sm text-on-surface-variant">Updated ' + esc(CL.timeAgo(c.updatedAt)) + "</span>" +
        '<span class="font-label-sm text-label-sm ' + (p.isReady ? "text-on-tertiary-fixed-variant" : "text-secondary") + '">' + p.percent + "%</span></div>" +
        '<div class="w-full h-2 ' + (p.isReady ? "bg-tertiary-fixed" : "bg-secondary-fixed") + ' rounded-full overflow-hidden">' +
        '<div class="progress-fill h-full ' + (p.isReady ? "bg-on-tertiary-container" : "bg-secondary") + ' rounded-full" style="width:' + p.percent + '%"></div></div></div>' +
        '<div class="flex flex-wrap items-center gap-x-space-md gap-y-space-xs font-label-sm text-label-sm">' +
        '<span class="inline-flex items-center gap-1 text-on-tertiary-fixed-variant"><span class="w-2 h-2 rounded-full bg-on-tertiary-container"></span>' + p.done + " completed</span>" +
        '<span class="inline-flex items-center gap-1 text-on-error-container"><span class="w-2 h-2 rounded-full bg-error"></span>' + p.pending + " pending</span></div>" +
        '<p class="font-body-sm text-body-sm text-on-surface-variant">' + esc(pendingLine) + "</p>" +
        '<div class="flex items-center justify-between gap-space-sm pt-space-xs">' +
        '<button type="button" data-saved-open class="flex-1 inline-flex items-center justify-center gap-space-xs bg-primary text-on-primary font-label-lg text-label-lg min-h-[44px] px-space-md rounded-lg active:scale-95 transition-transform">' +
        '<span class="material-symbols-outlined text-[18px]">open_in_new</span><span>Reopen</span></button>' +
        '<button type="button" data-saved-edit aria-label="Rename ' + esc(c.bankName) + ' checklist" class="inline-flex items-center justify-center bg-surface-container-low text-on-surface hover:bg-surface-container min-w-[44px] min-h-[44px] rounded-lg active:scale-95 transition-transform">' +
        '<span class="material-symbols-outlined text-[20px]">edit</span></button>' +
        '<button type="button" data-saved-delete aria-label="Delete ' + esc(c.bankName) + ' checklist" class="inline-flex items-center justify-center bg-error-container text-on-error-container min-w-[44px] min-h-[44px] rounded-lg active:scale-95 transition-transform">' +
        '<span class="material-symbols-outlined text-[20px]">delete</span></button></div></article>'
      );
    }).join("");

    setVisible($("saved-list"), list.length > 0);
    setVisible($("saved-empty"), list.length === 0, "flex");
  }

  function openSavedChecklist(id) {
    var found = CL.openSaved(id);
    if (!found) {
      toast("That checklist could not be found.");
      refreshCurrent();
      return;
    }
    NAV.go("checklist");
  }

  var renameTargetId = null;

  function openRename() {
    var cl = CL.getActive();
    if (!cl) { return; }
    renameTargetId = cl.id;
    $("rename-input").value = cl.label || "";
    openModal("modal-rename");
  }

  function onSavedClick(event) {
    var card = event.target.closest("[data-saved-id]");
    if (!card) { return; }
    var id = card.getAttribute("data-saved-id");

    if (event.target.closest("[data-saved-open]")) {
      openSavedChecklist(id);
    } else if (event.target.closest("[data-saved-edit]")) {
      /* Make it the active checklist, then rename it */
      if (CL.openSaved(id)) { openRename(); }
    } else if (event.target.closest("[data-saved-delete]")) {
      var target = CL.getById(id);
      askConfirm({
        title: "Delete this checklist?",
        text: target
          ? "\"" + target.bankName + " - " + CL.getTitle(target) + "\" will be removed from this browser. This cannot be undone."
          : "This checklist will be removed. This cannot be undone.",
        okLabel: "Delete",
        onOk: function () {
          CL.deleteChecklist(id);
          renderSaved();
          toast("Checklist deleted");
        }
      });
    }
  }

  /* ======================================================================
     12. SAVED DOCS
     ====================================================================== */
  function renderDocs() {
    var blocks = collectChecklists().filter(function (c) {
      return CL.getProgress(c).done > 0;
    });
    var total = blocks.reduce(function (sum, c) { return sum + CL.getProgress(c).done; }, 0);

    $("docs-summary").textContent =
      total + (total === 1 ? " document" : " documents") + " marked ready across " +
      blocks.length + (blocks.length === 1 ? " checklist" : " checklists");

    $("docs-list").innerHTML = blocks.map(function (c) {
      var done = c.documents.filter(function (d) { return d.done; });
      return (
        '<div class="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-space-sm">' +
        '<div class="flex items-center justify-between gap-space-sm">' +
        '<div class="min-w-0"><p class="font-title-md text-title-md text-on-surface truncate">' + esc(c.bankName) + "</p>" +
        '<p class="font-body-sm text-body-sm text-on-surface-variant truncate">' + esc(CL.getTitle(c)) + (c.saved ? "" : " (not saved yet)") + "</p></div>" +
        '<button type="button" data-docs-open="' + esc(c.id) + '" class="px-space-sm py-space-xs rounded-lg bg-surface-container-low text-secondary font-label-md text-label-md shrink-0 min-h-[36px]">Open</button></div>' +
        done.map(function (d) {
          return (
            '<div class="flex items-center gap-space-sm p-space-sm rounded-lg bg-surface-container-low">' +
            '<span class="material-symbols-outlined text-on-tertiary-fixed-variant text-[20px] icon-fill">check_circle</span>' +
            '<div class="flex flex-col min-w-0"><span class="font-body-md text-body-md text-on-surface truncate">' + esc(d.name) + "</span>" +
            '<span class="font-body-sm text-body-sm text-on-surface-variant truncate">' + esc(d.copies) + "</span></div></div>"
          );
        }).join("") + "</div>"
      );
    }).join("");

    setVisible($("docs-list"), blocks.length > 0);
    setVisible($("docs-empty"), blocks.length === 0, "flex");
  }

  function onDocsClick(event) {
    var btn = event.target.closest("[data-docs-open]");
    if (!btn) { return; }
    var id = btn.getAttribute("data-docs-open");
    var active = CL.getActive();
    if (active && active.id === id) {
      NAV.go("checklist");
    } else {
      openSavedChecklist(id);
    }
  }

  /* ======================================================================
     13. PROFILE
     ====================================================================== */
  function renderProfile() {
    var profile = getProfile();
    var prefs = getPrefs();

    $("pf-name").value = profile.name;
    $("pf-phone").value = profile.phone;
    $("pf-email").value = profile.email;

    $("pf-bank").innerHTML = D.BANKS.map(function (b) {
      return '<option value="' + esc(b.id) + '"' + (b.id === profile.preferredBankId ? " selected" : "") + ">" + esc(b.name) + "</option>";
    }).join("");

    renderProfileHeader(profile);

    var saved = CL.getSaved().length;
    $("pf-saved-count").textContent = saved + (saved === 1 ? " saved checklist" : " saved checklists");

    var ready = countReadyDocs();
    $("pf-ready-chip").innerHTML =
      '<span class="material-symbols-outlined text-[12px]">check_circle</span> ' + ready + (ready === 1 ? " Doc Ready" : " Docs Ready");

    Array.prototype.forEach.call(document.querySelectorAll(".pref-switch"), function (btn) {
      applySwitch(btn, !!prefs[btn.getAttribute("data-pref")]);
    });

    $("about-version").textContent = "v" + D.APP.version;
    setVisible($("pf-error"), false);
  }

  function renderProfileHeader(profile) {
    var name = profile.name.trim();
    $("pf-name-display").textContent = name || "Guest User";
    $("pf-email-display").textContent = profile.email.trim() || "Add your details below";

    var avatar = $("pf-avatar");
    if (name) {
      var parts = name.split(/\s+/);
      avatar.textContent = (parts[0].charAt(0) + (parts[1] ? parts[1].charAt(0) : "")).toUpperCase();
    } else {
      avatar.innerHTML = '<span class="material-symbols-outlined text-[32px]">person</span>';
    }
  }

  function applySwitch(btn, on) {
    btn.setAttribute("aria-checked", String(on));
    btn.classList.toggle("bg-on-tertiary-container", on);
    btn.classList.toggle("justify-end", on);
    btn.classList.toggle("bg-surface-variant", !on);
    btn.classList.toggle("justify-start", !on);
  }

  function saveProfile() {
    var name = $("pf-name").value.trim();
    var phone = $("pf-phone").value.trim();
    var email = $("pf-email").value.trim();
    var bankId = $("pf-bank").value;
    var error = "";

    if (phone && !/^(\+91|91|0)?[6-9]\d{9}$/.test(phone.replace(/[\s-]/g, ""))) {
      error = "Please enter a valid 10-digit Indian mobile number.";
    } else if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      error = "Please enter a valid email address.";
    }

    var errorEl = $("pf-error");
    if (error) {
      errorEl.textContent = error;
      setVisible(errorEl, true);
      return;
    }
    setVisible(errorEl, false);

    var profile = { name: name, phone: phone, email: email, preferredBankId: D.getBank(bankId) ? bankId : "sbi" };
    if (STORE.set(KEYS.profile, profile)) {
      renderProfileHeader(profile);
      toast("Profile saved on this device");
    } else {
      toast("Could not save. Browser storage may be full or blocked.");
    }
  }

  function onPrefClick(event) {
    var btn = event.target.closest(".pref-switch");
    if (!btn) { return; }
    var key = btn.getAttribute("data-pref");
    var prefs = getPrefs();
    prefs[key] = !prefs[key];
    STORE.set(KEYS.prefs, prefs);
    applySwitch(btn, prefs[key]);
    toast(prefs[key] ? "Preference turned on" : "Preference turned off");
  }

  function renderFaq() {
    $("faq-list").innerHTML = D.FAQS.map(function (f) {
      return (
        '<details class="group rounded-lg">' +
        '<summary class="flex items-center justify-between gap-space-sm p-space-sm cursor-pointer list-none [&::-webkit-details-marker]:hidden rounded-lg hover:bg-surface-container-low">' +
        '<span class="font-body-md text-body-md text-on-surface">' + esc(f.q) + "</span>" +
        '<span class="material-symbols-outlined text-on-surface-variant text-[18px] shrink-0 group-open:rotate-180 transition-transform">expand_more</span></summary>' +
        '<p class="px-space-sm pb-space-sm font-body-sm text-body-sm text-on-surface-variant">' + esc(f.a) + "</p></details>"
      );
    }).join("");
  }

  function clearAllData() {
    Object.keys(KEYS).forEach(function (k) { STORE.remove(KEYS[k]); });
    STORE.remove(SEEN_KEY);
    expandedDocs = {};
    $("service-search").value = "";
    $("bank-search").value = "";
    toast("All your data was cleared");
    NAV.go("home");
    renderHome();
  }

  /* ======================================================================
     14. ACTIONS  (buttons that have data-action="...")
     ====================================================================== */

  /* Start a brand-new checklist journey: bank -> service -> checklist */
  function startNew() {
    CL.clearActive();
    var patch = { serviceId: null };
    if (!getBankId() && hasSavedProfile()) {
      patch.bankId = getProfile().preferredBankId;
    }
    STORE.session.patch(patch);
    NAV.go("bank");
  }

  function bankContinue() {
    if (!getBankId()) {
      toast("Please select your bank to continue.");
      return;
    }
    NAV.go("service");
  }

  function serviceContinue() {
    var bankId = getBankId();
    var serviceId = getServiceId();
    if (!bankId) {
      toast("Please choose your bank first.");
      NAV.go("bank");
      return;
    }
    if (!serviceId) {
      toast("Please select a service to continue.");
      return;
    }

    /* Coming back from the checklist with the same choices? Keep the progress. */
    var active = CL.getActive();
    var checklist = active && active.bankId === bankId && active.serviceId === serviceId
      ? active
      : CL.createChecklist(bankId, serviceId);

    if (!checklist) {
      toast("No requirements are available for this service yet.");
      return;
    }
    CL.setActive(checklist);
    NAV.go("checklist");
  }

  function saveActive() {
    var cl = CL.getActive();
    if (!cl) {
      toast("There is no checklist to save yet.");
      return;
    }
    if (!CL.saveChecklist(cl)) {
      toast("Could not save. Browser storage may be full or blocked.");
      return;
    }
    toast(STORE.isPersistent()
      ? "Checklist saved to My Checklists"
      : "Saved for this session only (browser storage is blocked)");
    refreshCurrent();
  }

  function downloadActive() {
    var cl = CL.getActive();
    if (!cl) { toast("There is no checklist to download yet."); return; }
    toast(CL.download(cl) ? "Checklist downloaded" : "Download failed. Try the Print button instead.");
  }

  function printActive() {
    var cl = CL.getActive();
    if (!cl) { toast("There is no checklist to print yet."); return; }
    CL.print(cl);
  }

  function confirmRename() {
    var cl = CL.getActive();
    if (!cl || cl.id !== renameTargetId) {
      closeModals();
      return;
    }
    CL.renameChecklist(cl, $("rename-input").value);
    CL.persistActive(cl);
    closeModals();
    toast("Name updated");
    refreshCurrent();
  }

  function openAddDoc() {
    $("add-name").value = "";
    $("add-desc").value = "";
    $("add-status").value = "conditional";
    setVisible($("add-error"), false);
    openModal("modal-add");
  }

  function confirmAddDoc() {
    var cl = CL.getActive();
    if (!cl) { closeModals(); return; }
    var added = CL.addCustomDocument(cl, {
      name: $("add-name").value,
      description: $("add-desc").value,
      status: $("add-status").value
    });
    if (!added) {
      var errorEl = $("add-error");
      errorEl.textContent = "Please enter a document name.";
      setVisible(errorEl, true);
      return;
    }
    CL.persistActive(cl);
    closeModals();
    renderChecklist(false);
    toast("Document added");
  }

  function openReset() {
    askConfirm({
      title: "Reset this checklist?",
      text: "This unticks every document and reloads the sample requirements. Documents you added yourself stay on the list.",
      okLabel: "Reset",
      onOk: function () {
        var cl = CL.getActive();
        if (!cl) { return; }
        CL.resetToDefaults(cl);
        CL.clearProgress(cl);
        CL.persistActive(cl);
        renderChecklist(false);
        toast("Checklist reset");
      }
    });
  }

  function handleAction(name) {
    switch (name) {
      case "splash-continue": setSplash("100%", "Opening your workspace..."); finishSplash(); break;
      case "start-new": startNew(); break;
      case "bank-continue": bankContinue(); break;
      case "service-continue": serviceContinue(); break;
      case "save-checklist": saveActive(); break;
      case "download": downloadActive(); break;
      case "print": printActive(); break;
      case "rename-open": openRename(); break;
      case "rename-confirm": confirmRename(); break;
      case "add-doc-open": openAddDoc(); break;
      case "add-doc-confirm": confirmAddDoc(); break;
      case "reset-open": openReset(); break;
      case "save-profile": saveProfile(); break;
      case "clear-data-open":
        askConfirm({
          title: "Clear all your data?",
          text: "This removes your profile, saved checklists and preferences from this browser. This cannot be undone.",
          okLabel: "Clear Data",
          onOk: clearAllData
        });
        break;
      case "modal-close": closeModals(); break;
      case "confirm-ok":
        var handler = confirmHandler;
        closeModals();
        if (handler) { handler(); }
        break;
      default:
        console.warn("[ZRB] Unknown data-action:", name);
    }
  }

  /* ======================================================================
     15. START-UP
     ====================================================================== */

  /* Which function draws which screen */
  var RENDERERS = {
    welcome: renderWelcome,
    home: renderHome,
    bank: renderBanks,
    service: renderServices,
    checklist: function () { renderChecklist(false); },
    extras: renderExtras,
    summary: renderSummary,
    saved: renderSaved,
    docs: renderDocs,
    profile: renderProfile
  };

  function refreshCurrent() {
    var render = RENDERERS[NAV.current()];
    if (render) { render(); }
  }

  /* Opening a screen without what it needs sends the user to the right place */
  function routeGuard(route) {
    if ((route === "checklist" || route === "extras" || route === "summary") && !CL.getActive()) {
      toast("Start a checklist first.");
      return "home";
    }
    if (route === "service" && !getBankId()) {
      toast("Please choose your bank first.");
      return "bank";
    }
    return null;
  }

  function bindEvents() {
    /* Welcome step pills */
    $("step-pills").addEventListener("click", function (e) {
      var pill = e.target.closest(".step-pill");
      if (pill) { setStep(pill.getAttribute("data-step")); }
    });

    /* Home */
    $("service-search").addEventListener("input", renderServicesGrid);
    $("clear-search").addEventListener("click", function () {
      $("service-search").value = "";
      renderServicesGrid();
      $("service-search").focus();
    });
    $("services-grid").addEventListener("click", function (e) {
      var card = e.target.closest("[data-home-service]");
      if (!card) { return; }
      CL.clearActive();
      STORE.session.patch({ serviceId: card.getAttribute("data-home-service") });
      toast(getBankId() ? "Confirm your bank to continue." : "Now choose your bank.");
      NAV.go("bank");
    });
    $("recent-list").addEventListener("click", function (e) {
      var card = e.target.closest("[data-recent-open]");
      if (card) { openSavedChecklist(card.getAttribute("data-recent-open")); }
    });

    /* Bank */
    $("bank-search").addEventListener("input", renderBanks);
    $("bank-clear").addEventListener("click", function () {
      $("bank-search").value = "";
      renderBanks();
      $("bank-search").focus();
    });
    $("bank-list").addEventListener("click", function (e) {
      var card = e.target.closest("[data-bank-id]");
      if (!card) { return; }
      STORE.session.patch({ bankId: card.getAttribute("data-bank-id") });
      renderBanks();
    });

    /* Service */
    $("service-list").addEventListener("click", function (e) {
      var card = e.target.closest("[data-service-id]");
      if (!card) { return; }
      STORE.session.patch({ serviceId: card.getAttribute("data-service-id") });
      renderServices();
    });

    /* Checklist, extras, summary, saved, docs, profile */
    $("cl-groups").addEventListener("click", onChecklistClick);
    $("pack-list").addEventListener("click", onPackClick);
    $("sum-done-list").addEventListener("click", onSummaryClick);
    $("sum-pending-list").addEventListener("click", onSummaryClick);
    $("saved-list").addEventListener("click", onSavedClick);
    $("docs-list").addEventListener("click", onDocsClick);
    Array.prototype.forEach.call(document.querySelectorAll(".pref-switch"), function (btn) {
      btn.addEventListener("click", onPrefClick);
    });

    /* Every button with data-action="..." */
    document.addEventListener("click", function (e) {
      var el = e.target.closest("[data-action]");
      if (el) { handleAction(el.getAttribute("data-action")); }
    });

    /* Click on the dark area behind a dialog closes it */
    Array.prototype.forEach.call(document.querySelectorAll(".zrb-modal-backdrop"), function (backdrop) {
      backdrop.addEventListener("click", function (e) {
        if (e.target === backdrop) { closeModals(); }
      });
    });

    /* Keyboard: Esc closes dialogs, Enter confirms the text dialogs */
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { closeModals(); }
    });
    $("rename-input").addEventListener("keydown", function (e) {
      if (e.key === "Enter") { confirmRename(); }
    });
    $("add-name").addEventListener("keydown", function (e) {
      if (e.key === "Enter") { confirmAddDoc(); }
    });
  }

  function init() {
    loadRemoteImages();
    renderFaq();

    /* Register what happens when each screen opens (BEFORE NAV.init) */
    NAV.on("splash", startSplash);
    NAV.ROUTES.forEach(function (route) {
      if (route !== "splash") { clearSplashTimersOn(route); }
      if (RENDERERS[route]) { NAV.on(route, RENDERERS[route]); }
      NAV.on(route, function () {
        $("bottom-nav").classList.toggle("is-hidden", TAB_SCREENS.indexOf(route) === -1);
      });
    });

    NAV.setGuard(routeGuard);
    bindEvents();
    NAV.init();
  }

  /* Stop the splash timers as soon as any other screen opens */
  function clearSplashTimersOn(route) {
    NAV.on(route, clearSplashTimers);
  }

  init();
})();