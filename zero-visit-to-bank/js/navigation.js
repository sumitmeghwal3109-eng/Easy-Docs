/* ==========================================================================
   FILE: js/navigation.js
   PROJECT: Zero Revisits to Bank
   PURPOSE: A tiny hash-based router. It shows ONE screen at a time.

   How it works
   - Every screen in index.html is  <section class="screen" data-screen="NAME">
   - The URL hash decides which screen is visible:  index.html#/home
   - Any element with  data-nav="NAME"   goes to that screen when clicked.
   - Any element with  data-back="NAME"  goes one step back (or to NAME if
     there is nothing to go back to).
   - Elements with  data-nav-tab="NAME"  (bottom navigation) are highlighted
     when that screen is active.

   Used from other files:
     ZRB_NAV.init()                start the router (called once by app.js)
     ZRB_NAV.go("bank")            open a screen
     ZRB_NAV.go("home", {replace:true})   open without adding a history entry
     ZRB_NAV.back("home")          go back
     ZRB_NAV.on("home", fn)        run fn every time that screen opens
     ZRB_NAV.setGuard(fn)          fn(route) may return another route to redirect
     ZRB_NAV.current()             name of the visible screen
   ========================================================================== */

(function (global) {
  "use strict";

  /* All valid screens. To add a screen: add its name here, add a
     <section data-screen="..."> in index.html, and add a title below. */
  var ROUTES = [
    "splash", "welcome", "home", "bank", "service",
    "checklist", "extras", "summary", "saved", "docs", "profile"
  ];

  var DEFAULT_ROUTE = "splash";
  var HOME_ROUTE = "home";

  /* Browser tab titles */
  var TITLES = {
    splash: "Zero Revisits to Bank",
    welcome: "Welcome | Zero Revisits to Bank",
    home: "Home | Zero Revisits to Bank",
    bank: "Select Your Bank | Zero Revisits to Bank",
    service: "Select Service | Zero Revisits to Bank",
    checklist: "Document Checklist | Zero Revisits to Bank",
    extras: "Additional Requirements | Zero Revisits to Bank",
    summary: "Visit Readiness | Zero Revisits to Bank",
    saved: "My Checklists | Zero Revisits to Bank",
    docs: "Saved Docs | Zero Revisits to Bank",
    profile: "Profile | Zero Revisits to Bank"
  };

  /* Classes used to highlight the active bottom-nav item (from Stitch) */
  var TAB_ACTIVE = ["text-primary"];
  var TAB_INACTIVE = ["text-on-surface-variant", "hover:text-on-surface"];

  var handlers = {};        // route -> [functions]
  var guard = null;         // function(route) -> redirect route or null
  var currentRoute = null;
  var routeStack = [];      // routes visited, used to know if Back is possible
  var replaceNext = false;  // true when the next hash change is a "replace"
  var started = false;

  /* ---------- helpers ---------- */

  /* Read the route name from the URL hash, e.g. "#/home" -> "home".
     Returns null if the hash is empty or not a known route. */
  function parseHash() {
    var match = (global.location.hash || "").match(/^#\/?([a-z-]+)/i);
    var name = match ? match[1].toLowerCase() : "";
    return ROUTES.indexOf(name) !== -1 ? name : null;
  }

  function urlFor(route) {
    return global.location.href.split("#")[0] + "#/" + route;
  }

  /* Highlight the matching bottom-nav item on every screen */
  function updateTabs(route) {
    var tabs = document.querySelectorAll("[data-nav-tab]");
    for (var i = 0; i < tabs.length; i++) {
      var tab = tabs[i];
      var active = tab.getAttribute("data-nav-tab") === route;
      var j;
      for (j = 0; j < TAB_ACTIVE.length; j++) {
        tab.classList.toggle(TAB_ACTIVE[j], active);
      }
      for (j = 0; j < TAB_INACTIVE.length; j++) {
        tab.classList.toggle(TAB_INACTIVE[j], !active);
      }
      if (active) {
        tab.setAttribute("aria-current", "page");
      } else {
        tab.removeAttribute("aria-current");
      }
    }
  }

  /* ---------- showing a screen ---------- */

  function show(route) {
    /* Guard: app.js can redirect (e.g. no checklist yet -> go to home) */
    if (guard) {
      var redirect = guard(route);
      if (redirect && redirect !== route) {
        go(redirect, { replace: true });
        return;
      }
    }

    var target = document.querySelector('.screen[data-screen="' + route + '"]');
    if (!target) {
      console.error("[ZRB_NAV] Screen not found in index.html:", route);
      if (route !== HOME_ROUTE) {
        go(HOME_ROUTE, { replace: true });
      }
      return;
    }

    currentRoute = route;

    var screens = document.querySelectorAll(".screen");
    for (var i = 0; i < screens.length; i++) {
      screens[i].classList.toggle("is-active", screens[i] === target);
    }

    document.title = TITLES[route] || "Zero Revisits to Bank";
    updateTabs(route);
    global.scrollTo(0, 0);

    /* Let screens refresh themselves (e.g. re-render the checklist) */
    var list = handlers[route] || [];
    for (var k = 0; k < list.length; k++) {
      try {
        list[k](route);
      } catch (err) {
        console.error("[ZRB_NAV] Error while opening screen '" + route + "':", err);
      }
    }
  }

  /* Browser hash changed (our own go() calls, or the browser Back button) */
  function onHashChange() {
    var route = parseHash() || HOME_ROUTE;

    if (replaceNext) {
      routeStack[routeStack.length - 1] = route;
      replaceNext = false;
    } else if (routeStack.length > 1 && routeStack[routeStack.length - 2] === route) {
      routeStack.pop(); // the user went back
    } else if (routeStack[routeStack.length - 1] !== route) {
      routeStack.push(route);
    }

    show(route);
  }

  /* ---------- public functions ---------- */

  function go(route, options) {
    options = options || {};

    if (ROUTES.indexOf(route) === -1) {
      console.warn("[ZRB_NAV] Unknown screen '" + route + "'. Opening home instead.");
      route = HOME_ROUTE;
    }

    /* Already on this screen: just refresh it (no hash change would fire) */
    if (parseHash() === route) {
      show(route);
      return;
    }

    if (options.replace) {
      replaceNext = true;
      global.location.replace(urlFor(route));
    } else {
      global.location.hash = "#/" + route;
    }
  }

  function back(fallbackRoute) {
    if (routeStack.length > 1) {
      global.history.back();
    } else {
      go(fallbackRoute || HOME_ROUTE, { replace: true });
    }
  }

  function on(route, fn) {
    if (!handlers[route]) {
      handlers[route] = [];
    }
    handlers[route].push(fn);
  }

  function setGuard(fn) {
    guard = fn;
  }

  function current() {
    return currentRoute;
  }

  function init() {
    if (started) {
      return;
    }
    started = true;

    /* One click listener handles every data-nav / data-back element,
       including ones that are created later by JavaScript. */
    document.addEventListener("click", function (event) {
      var navEl = event.target.closest("[data-nav]");
      if (navEl && !navEl.disabled) {
        event.preventDefault();
        go(navEl.getAttribute("data-nav"), {
          replace: navEl.hasAttribute("data-nav-replace")
        });
        return;
      }
      var backEl = event.target.closest("[data-back]");
      if (backEl && !backEl.disabled) {
        event.preventDefault();
        back(backEl.getAttribute("data-back") || HOME_ROUTE);
      }
    });

    global.addEventListener("hashchange", onHashChange);

    /* First screen: use the URL hash if valid, otherwise start at splash */
    var first = parseHash();
    if (!first) {
      first = DEFAULT_ROUTE;
      try {
        global.history.replaceState(null, "", "#/" + first);
      } catch (err) {
        /* Some browsers block this on file:// pages. Fall back to the hash;
           onHashChange() will then show the screen. */
        routeStack = [first];
        global.location.hash = "#/" + first;
        return;
      }
    }
    routeStack = [first];
    show(first);
  }

  global.ZRB_NAV = {
    ROUTES: ROUTES,
    init: init,
    go: go,
    back: back,
    on: on,
    setGuard: setGuard,
    current: current
  };
})(window);