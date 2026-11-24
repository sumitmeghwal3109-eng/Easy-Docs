/* ==========================================================================
   FILE: js/checklist.js
   PROJECT: Zero Revisits to Bank
   PURPOSE: The checklist engine. It has NO screen code (no buttons or HTML
            for the app UI). app.js calls these functions and draws the result.

   Contents
     1. ZRB_STORE      safe LocalStorage helper
     2. Small utilities
     3. Building a checklist from data.js (default + bank overrides)
     4. Progress and readiness calculations
     5. Changing a checklist (tick, attach, add custom item, rename, reset)
     6. Saving, reopening, deleting
     7. Additional-requirements content
     8. Download (.txt) and Print
   ========================================================================== */

(function (global) {
  "use strict";

  var D = global.ZRB_DATA;
  if (!D) {
    console.error("[ZRB] data.js must be loaded BEFORE checklist.js (check the <script> order in index.html).");
    return;
  }
  var KEYS = D.STORAGE_KEYS;

  /* ======================================================================
     1. ZRB_STORE  -  LocalStorage wrapper
        Values are saved as JSON text. If LocalStorage is blocked (private
        mode, strict settings), data lives in memory until the page closes.
     ====================================================================== */
  var memory = {};
  var storageWorks = (function () {
    try {
      var t = "__zrb_test__";
      global.localStorage.setItem(t, "1");
      global.localStorage.removeItem(t);
      return true;
    } catch (err) {
      return false;
    }
  })();

  var Store = {
    get: function (key, fallback) {
      try {
        var raw = storageWorks ? global.localStorage.getItem(key) : memory[key];
        if (raw === null || raw === undefined) {
          return fallback;
        }
        return JSON.parse(raw);
      } catch (err) {
        return fallback; // corrupted data: behave as if nothing is stored
      }
    },
    set: function (key, value) {
      var raw = JSON.stringify(value);
      if (!storageWorks) {
        memory[key] = raw;
        return true;
      }
      try {
        global.localStorage.setItem(key, raw);
        return true;
      } catch (err) {
        return false; // e.g. storage full
      }
    },
    remove: function (key) {
      try {
        if (storageWorks) {
          global.localStorage.removeItem(key);
        } else {
          delete memory[key];
        }
      } catch (err) { /* ignore */ }
    },
    isPersistent: function () {
      return storageWorks;
    }
  };

  /* Session = what the user is doing right now:
     { bankId, serviceId, activeChecklist } */
  Store.session = {
    get: function () {
      var s = Store.get(KEYS.session, null);
      return s && typeof s === "object" ? s : {};
    },
    patch: function (changes) {
      var merged = Object.assign(Store.session.get(), changes);
      Store.set(KEYS.session, merged);
      return merged;
    },
    clear: function () {
      Store.remove(KEYS.session);
    }
  };

  /* ======================================================================
     2. Small utilities
     ====================================================================== */
  function uid() {
    return "cl_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function nowISO() {
    return new Date().toISOString();
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /* Escape text before putting it into HTML (prevents broken layout / injection) */
  function esc(value) {
    return String(value === null || value === undefined ? "" : value).replace(
      /[&<>"']/g,
      function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
      }
    );
  }

  /* "just now", "5 min ago", "Yesterday", "12 Mar 2026" ... */
  function timeAgo(iso) {
    var t = Date.parse(iso);
    if (isNaN(t)) {
      return "";
    }
    var seconds = Math.max(0, Math.floor((Date.now() - t) / 1000));
    if (seconds < 60) { return "just now"; }
    var minutes = Math.floor(seconds / 60);
    if (minutes < 60) { return minutes + " min ago"; }
    var hours = Math.floor(minutes / 60);
    if (hours < 24) { return hours + (hours === 1 ? " hour ago" : " hours ago"); }
    var days = Math.floor(hours / 24);
    if (days === 1) { return "Yesterday"; }
    if (days < 7) { return days + " days ago"; }
    return new Date(t).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric"
    });
  }

  function formatDateTime(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) {
      return "";
    }
    return d.toLocaleString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  }

  function slug(text) {
    return String(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  /* ======================================================================
     3. Building a checklist
     ====================================================================== */

  /* Merge: default documents of the service + the selected bank's changes.
     Returns a fresh array (the data in data.js is never modified). */
  function buildDocuments(bankId, serviceId) {
    var req = D.REQUIREMENTS[serviceId];
    if (!req || !Array.isArray(req.documents)) {
      return [];
    }

    var docs = req.documents.map(clone);
    var override = req.bankOverrides ? req.bankOverrides[bankId] : null;

    if (override) {
      if (override.removeDocuments) {
        docs = docs.filter(function (d) {
          return override.removeDocuments.indexOf(d.id) === -1;
        });
      }
      if (override.updateDocuments) {
        docs.forEach(function (d) {
          if (override.updateDocuments[d.id]) {
            Object.assign(d, override.updateDocuments[d.id]);
          }
        });
      }
      if (override.addDocuments) {
        override.addDocuments.forEach(function (extra) {
          var copy = clone(extra);
          var index = docs.findIndex(function (d) { return d.id === copy.id; });
          if (index >= 0) {
            docs[index] = copy;
          } else {
            docs.push(copy);
          }
        });
      }
    }

    /* Add the "progress" fields that belong to the user, not to the data file */
    return docs.map(function (d) {
      return Object.assign({}, d, { done: false, refAttached: false, custom: false });
    });
  }

  /* Create a new checklist. Returns null if bank or service is invalid. */
  function createChecklist(bankId, serviceId) {
    var bank = D.getBank(bankId);
    var service = D.getService(serviceId);
    if (!bank || !service) {
      return null;
    }
    var documents = buildDocuments(bankId, serviceId);
    if (!documents.length) {
      return null;
    }
    var now = nowISO();
    return {
      id: uid(),
      bankId: bankId,
      serviceId: serviceId,
      bankName: bank.shortName,
      serviceName: service.activityName,
      label: "",            // optional custom name set in Edit
      createdAt: now,
      updatedAt: now,
      saved: false,         // true once the user taps Save
      documents: documents,
      pack: {}              // "Don't forget these" ticks: { itemId: true }
    };
  }

  /* Group documents under headings (Identity Proof, Address Proof ...). */
  function groupDocuments(checklist) {
    var groups = D.DOC_GROUPS.map(function (g) {
      return { id: g.id, label: g.label, icon: g.icon, docs: [] };
    });
    var custom = { id: "custom", label: "Added by You", icon: "add_task", docs: [] };

    checklist.documents.forEach(function (d) {
      if (d.custom) {
        custom.docs.push(d);
        return;
      }
      var home = groups.find(function (g) { return g.id === d.group; });
      (home || groups[groups.length - 1]).docs.push(d);
    });

    groups.push(custom);
    return groups.filter(function (g) { return g.docs.length > 0; });
  }

  function getTitle(checklist) {
    return checklist.label || checklist.serviceName;
  }

  /* ======================================================================
     4. Progress and readiness
     ====================================================================== */
  function getProgress(checklist) {
    var docs = checklist && Array.isArray(checklist.documents) ? checklist.documents : [];
    var total = docs.length;
    var done = docs.filter(function (d) { return d.done; }).length;

    var mandatory = docs.filter(function (d) { return d.status === "mandatory"; });
    var conditional = docs.filter(function (d) { return d.status !== "mandatory"; });
    var mandatoryDone = mandatory.filter(function (d) { return d.done; }).length;
    var conditionalDone = conditional.filter(function (d) { return d.done; }).length;

    return {
      total: total,
      done: done,
      pending: total - done,
      percent: total ? Math.round((done / total) * 100) : 0,
      mandatoryTotal: mandatory.length,
      mandatoryDone: mandatoryDone,
      mandatoryPending: mandatory.length - mandatoryDone,
      conditionalTotal: conditional.length,
      conditionalDone: conditionalDone,
      /* READY = every mandatory document is completed */
      isReady: total > 0 && mandatory.length - mandatoryDone === 0
    };
  }

  /* Short label shown under the progress bar on the checklist screen */
  function getStatusText(progress) {
    if (progress.total > 0 && progress.done === progress.total) {
      return { label: "All set!", icon: "celebration", filled: true };
    }
    if (progress.percent >= 50) {
      return { label: "Halfway there", icon: "verified", filled: true };
    }
    if (progress.done > 0) {
      return { label: "In progress", icon: "schedule", filled: false };
    }
    return { label: "Not started", icon: "schedule", filled: false };
  }

  /* Final summary message (wording from the project brief) */
  function getReadinessMessage(progress) {
    if (progress.isReady) {
      return {
        ready: true,
        heading: "You're Ready for Your Bank Visit!",
        sub: "All mandatory documents are ready. Carry them with you for a smooth branch visit."
      };
    }
    return {
      ready: false,
      heading: "You're Almost Ready!",
      sub: "Complete the Remaining Requirements Before Visiting."
    };
  }

  /* ======================================================================
     5. Changing a checklist
        Each function changes the checklist object you pass in and updates
        its "updatedAt" time. Afterwards call persistActive(checklist).
     ====================================================================== */
  function touch(checklist) {
    checklist.updatedAt = nowISO();
  }

  function findDoc(checklist, docId) {
    return checklist.documents.find(function (d) { return d.id === docId; }) || null;
  }

  /* Tick / untick a document. Returns the new state, or null if not found. */
  function toggleDoc(checklist, docId) {
    var d = findDoc(checklist, docId);
    if (!d) { return null; }
    d.done = !d.done;
    touch(checklist);
    return d.done;
  }

  /* "Attach Ref" button from the Stitch design */
  function toggleRef(checklist, docId) {
    var d = findDoc(checklist, docId);
    if (!d) { return null; }
    d.refAttached = !d.refAttached;
    touch(checklist);
    return d.refAttached;
  }

  function togglePack(checklist, itemId) {
    checklist.pack = checklist.pack || {};
    checklist.pack[itemId] = !checklist.pack[itemId];
    touch(checklist);
    return checklist.pack[itemId];
  }

  /* Add your own document. Returns the new document, or null if name is empty. */
  function addCustomDocument(checklist, details) {
    var name = String((details && details.name) || "").trim().slice(0, 80);
    if (!name) { return null; }
    var description = String((details && details.description) || "").trim().slice(0, 160);
    var newDoc = {
      id: "custom-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      group: "custom",
      name: name,
      description: description || "Added by you.",
      copies: "As needed",
      status: details && details.status === "mandatory" ? "mandatory" : "conditional",
      instructions: "This item was added by you and is not part of the sample requirements.",
      verification: "demo",
      done: false,
      refAttached: false,
      custom: true
    };
    checklist.documents.push(newDoc);
    touch(checklist);
    return newDoc;
  }

  /* Only documents you added yourself can be removed. */
  function removeDocument(checklist, docId) {
    var d = findDoc(checklist, docId);
    if (!d || !d.custom) { return false; }
    checklist.documents = checklist.documents.filter(function (x) { return x.id !== docId; });
    touch(checklist);
    return true;
  }

  function renameChecklist(checklist, label) {
    checklist.label = String(label || "").trim().slice(0, 60);
    touch(checklist);
  }

  /* Rebuild the sample documents from data.js (picks up any edits you made
     there) but keep what the user already ticked and any custom items. */
  function resetToDefaults(checklist) {
    var fresh = buildDocuments(checklist.bankId, checklist.serviceId);
    fresh.forEach(function (d) {
      var old = findDoc(checklist, d.id);
      if (old) {
        d.done = !!old.done;
        d.refAttached = !!old.refAttached;
      }
    });
    var customs = checklist.documents.filter(function (d) { return d.custom; });
    checklist.documents = fresh.concat(customs);
    touch(checklist);
  }

  /* Untick everything */
  function clearProgress(checklist) {
    checklist.documents.forEach(function (d) {
      d.done = false;
      d.refAttached = false;
    });
    checklist.pack = {};
    touch(checklist);
  }

  /* ======================================================================
     6. Saving, reopening, deleting
        - "Active" checklist = the one on screen now (kept in the session).
        - "Saved" checklists = the list shown in My Saved Checklists.
        An active checklist is only added to the saved list after the user
        taps Save. After that, every change is saved automatically.
     ====================================================================== */
  function isValid(c) {
    return !!c && typeof c === "object" && typeof c.id === "string" &&
      !!c.bankId && !!c.serviceId && Array.isArray(c.documents);
  }

  function loadAll() {
    var list = Store.get(KEYS.checklists, []);
    return Array.isArray(list) ? list.filter(isValid) : [];
  }

  /* Saved checklists, newest update first */
  function getSaved() {
    return loadAll().sort(function (a, b) {
      return String(b.updatedAt).localeCompare(String(a.updatedAt));
    });
  }

  function getById(id) {
    return loadAll().find(function (c) { return c.id === id; }) || null;
  }

  /* Insert or update one checklist in the saved list. Returns true on success. */
  function upsert(checklist) {
    var list = loadAll();
    var index = list.findIndex(function (c) { return c.id === checklist.id; });
    var copy = clone(checklist);
    if (index >= 0) {
      list[index] = copy;
    } else {
      list.push(copy);
    }
    return Store.set(KEYS.checklists, list);
  }

  /* The Save button. Returns true if saved. */
  function saveChecklist(checklist) {
    if (!isValid(checklist)) { return false; }
    checklist.saved = true;
    touch(checklist);
    var ok = upsert(checklist);
    Store.session.patch({ activeChecklist: clone(checklist) });
    return ok;
  }

  function deleteChecklist(id) {
    var list = loadAll().filter(function (c) { return c.id !== id; });
    var ok = Store.set(KEYS.checklists, list);
    var active = getActive();
    if (active && active.id === id) {
      clearActive();
    }
    return ok;
  }

  function getActive() {
    var c = Store.session.get().activeChecklist;
    return isValid(c) ? c : null;
  }

  function setActive(checklist) {
    Store.session.patch({ activeChecklist: clone(checklist) });
  }

  function clearActive() {
    Store.session.patch({ activeChecklist: null });
  }

  /* Call this after ANY change to the active checklist. */
  function persistActive(checklist) {
    Store.session.patch({ activeChecklist: clone(checklist) });
    if (checklist.saved) {
      return upsert(checklist);
    }
    return true;
  }

  /* Reopen a saved checklist: copy it into the session and return it. */
  function openSaved(id) {
    var found = getById(id);
    if (!found) { return null; }
    setActive(found);
    Store.session.patch({ bankId: found.bankId, serviceId: found.serviceId });
    return clone(found);
  }

  /* ======================================================================
     7. Additional-requirements content (for the "Additional Requirements" screen)
     ====================================================================== */
  function getExtras(bankId, serviceId) {
    var E = D.EXTRAS;
    var service = E.services[serviceId] || {};
    var bank = E.banks[bankId] || {};
    return {
      cards: [].concat(E.common.cards, service.cards || []),
      bankCards: bank.cards || [],
      important: service.important || E.common.important,
      reminder: E.common.reminder,
      packList: [].concat(E.common.packList, service.packList || [])
    };
  }

  /* ======================================================================
     8. Download (.txt) and Print
     ====================================================================== */
  function statusLabel(d) {
    return d.status === "mandatory" ? "Mandatory" : "Conditional";
  }

  function verificationLabel(d) {
    return d.verification === "verified"
      ? "Verified against an official source"
      : "Demo data - not officially verified";
  }

  /* Plain-text version of the checklist */
  function toText(checklist) {
    var p = getProgress(checklist);
    var msg = getReadinessMessage(p);
    var L = [];

    L.push("ZERO REVISITS TO BANK");
    L.push(D.APP.tagline);
    L.push("==========================================");
    L.push("Bank:      " + checklist.bankName);
    L.push("Service:   " + checklist.serviceName);
    if (checklist.label) {
      L.push("Checklist: " + checklist.label);
    }
    L.push("Created:   " + formatDateTime(checklist.createdAt));
    L.push("Updated:   " + formatDateTime(checklist.updatedAt));
    L.push("");
    L.push("READINESS: " + p.percent + "% (" + p.done + " of " + p.total + " documents completed)");
    L.push("Mandatory documents: " + p.mandatoryDone + " of " + p.mandatoryTotal + " completed");
    L.push("Status: " + msg.heading + (msg.ready ? "" : " " + msg.sub));
    L.push("");
    L.push("DOCUMENTS");
    L.push("------------------------------------------");

    groupDocuments(checklist).forEach(function (g) {
      L.push("");
      L.push(g.label.toUpperCase());
      g.docs.forEach(function (d) {
        L.push((d.done ? "[x] " : "[ ] ") + d.name + " (" + statusLabel(d) + ")");
        L.push("      What it is:  " + d.description);
        L.push("      Bring:       " + d.copies);
        L.push("      Tip:         " + d.instructions);
        L.push("      Data:        " + verificationLabel(d));
      });
    });

    var pendingDocs = checklist.documents.filter(function (d) { return !d.done; });
    L.push("");
    L.push("STILL PENDING (" + pendingDocs.length + ")");
    L.push("------------------------------------------");
    if (!pendingDocs.length) {
      L.push("Nothing pending.");
    } else {
      pendingDocs.forEach(function (d) {
        L.push("- " + d.name + " (" + statusLabel(d) + ")");
      });
    }

    L.push("");
    L.push("IMPORTANT");
    L.push("------------------------------------------");
    L.push(D.APP.demoNotice);
    L.push(D.APP.disclaimer);

    return L.join("\r\n");
  }

  function fileName(checklist) {
    var date = new Date().toISOString().slice(0, 10);
    return "zero-revisits_" + slug(checklist.bankName) + "_" + slug(checklist.serviceName) + "_" + date + ".txt";
  }

  /* Start a file download. Returns true if the browser accepted it. */
  function download(checklist) {
    if (!isValid(checklist)) { return false; }
    try {
      var blob = new Blob([toText(checklist)], { type: "text/plain;charset=utf-8" });
      var url = global.URL.createObjectURL(blob);
      var link = document.createElement("a");
      link.href = url;
      link.download = fileName(checklist);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(function () { global.URL.revokeObjectURL(url); }, 1000);
      return true;
    } catch (err) {
      console.error("[ZRB] Download failed:", err);
      return false;
    }
  }

  /* HTML for the printable sheet (only visible when printing, see style.css) */
  function buildPrintHTML(checklist) {
    var p = getProgress(checklist);
    var msg = getReadinessMessage(p);
    var rows = "";

    groupDocuments(checklist).forEach(function (g) {
      rows += '<tr><th colspan="4">' + esc(g.label) + "</th></tr>";
      g.docs.forEach(function (d) {
        rows +=
          "<tr>" +
          '<td class="' + (d.done ? "status-done" : "status-pending") + '">' +
          (d.done ? "Done" : "Pending") + "</td>" +
          "<td><strong>" + esc(d.name) + "</strong><br>" + esc(d.description) + "</td>" +
          "<td>" + esc(statusLabel(d)) + "<br>" + esc(d.copies) + "</td>" +
          "<td>" + esc(d.instructions) + "<br><em>" + esc(verificationLabel(d)) + "</em></td>" +
          "</tr>";
      });
    });

    return (
      "<h1>Zero Revisits to Bank</h1>" +
      '<p class="print-meta">' + esc(D.APP.tagline) + "</p>" +
      "<h2>Visit Checklist</h2>" +
      '<p class="print-meta"><strong>Bank:</strong> ' + esc(checklist.bankName) + "</p>" +
      '<p class="print-meta"><strong>Service:</strong> ' + esc(checklist.serviceName) + "</p>" +
      '<p class="print-meta"><strong>Printed:</strong> ' + esc(formatDateTime(nowISO())) + "</p>" +
      '<p class="print-meta"><strong>Readiness:</strong> ' + p.percent + "% (" + p.done + " of " + p.total +
      " completed; mandatory " + p.mandatoryDone + " of " + p.mandatoryTotal + ")</p>" +
      '<p class="print-meta"><strong>Status:</strong> ' + esc(msg.heading) + (msg.ready ? "" : " " + esc(msg.sub)) + "</p>" +
      "<h2>Documents</h2>" +
      "<table><thead><tr><th>Status</th><th>Document</th><th>Type / Bring</th><th>Tips</th></tr></thead><tbody>" +
      rows +
      "</tbody></table>" +
      '<div class="print-notice">' + esc(D.APP.demoNotice) + "<br>" + esc(D.APP.disclaimer) + "</div>"
    );
  }

  /* Fill the hidden print sheet, then open the browser's print dialog */
  function print(checklist) {
    if (!isValid(checklist)) { return false; }
    var sheet = document.getElementById("print-sheet");
    if (!sheet) {
      sheet = document.createElement("div");
      sheet.id = "print-sheet";
      sheet.className = "print-sheet";
      document.body.appendChild(sheet);
    }
    sheet.innerHTML = buildPrintHTML(checklist);
    global.print();
    return true;
  }

  /* ======================================================================
     Expose
     ====================================================================== */
  global.ZRB_STORE = Store;

  global.ZRB_CHECKLIST = {
    /* build */
    createChecklist: createChecklist,
    buildDocuments: buildDocuments,
    groupDocuments: groupDocuments,
    getTitle: getTitle,
    /* progress */
    getProgress: getProgress,
    getStatusText: getStatusText,
    getReadinessMessage: getReadinessMessage,
    /* change */
    toggleDoc: toggleDoc,
    toggleRef: toggleRef,
    togglePack: togglePack,
    addCustomDocument: addCustomDocument,
    removeDocument: removeDocument,
    renameChecklist: renameChecklist,
    resetToDefaults: resetToDefaults,
    clearProgress: clearProgress,
    /* save / open / delete */
    getSaved: getSaved,
    getById: getById,
    saveChecklist: saveChecklist,
    deleteChecklist: deleteChecklist,
    getActive: getActive,
    setActive: setActive,
    clearActive: clearActive,
    persistActive: persistActive,
    openSaved: openSaved,
    /* extras */
    getExtras: getExtras,
    /* export */
    toText: toText,
    download: download,
    print: print,
    /* utilities */
    esc: esc,
    timeAgo: timeAgo,
    formatDateTime: formatDateTime
  };
})(window);