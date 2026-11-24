# Zero Revisits to Bank

**Prepare Smart. Visit Once.**

A responsive, fintech-inspired web application designed to eliminate repeated bank visits caused by missing paperwork, incomplete forms, or uncertainty about bank-specific document requirements.

---

## Table of Contents
1. [Problem Statement & Solution](#problem-statement--solution)
2. [Key Features](#key-features)
3. [Application Screens](#application-screens)
4. [Technology Stack](#technology-stack)
5. [Project Folder Structure](#project-folder-structure)
6. [How to Run Locally](#how-to-run-locally)
7. [Live Presentation Demo Flow](#live-presentation-demo-flow)
8. [Data Disclaimer](#data-disclaimer)
9. [Future Enhancements](#future-enhancements)

---

## Problem Statement & Solution

**The Problem:**  
Customers frequently visit bank branches without knowing the exact documents required for their specific banking task. Missing ID proofs, unattested photocopies, or forgotten supporting forms lead to wasted time, long queues, and repeated branch visits.

**The Solution:**  
**Zero Revisits to Bank** acts as a pre-visit preparation assistant that guides users through a simple workflow:
1. Pick their bank.
2. Select the banking service they need.
3. Get a personalized, interactive document checklist tailored to both the bank and service.
4. Check off ready items, review pre-visit reminders, and generate a final **Visit Readiness Summary** before leaving home.

---

## Key Features

- **Dynamic Bank & Service Mapping:** Generates tailored document checklists based on the specific combination of selected bank (e.g., SBI, HDFC, ICICI, PNB, Axis, Bank of Baroda) and banking service.
- **Interactive Document Checklists:** Tap to mark/unmark documents as ready, attach reference notes, and differentiate between **Mandatory** and **Conditional** items.
- **Real-Time Readiness Calculator:** Automatically updates completion fractions and percentage progress bars as items are checked off.
- **Offline Persistence (`localStorage`):** Saves checklist progress, custom saved checklists, and user preferences locally in the browser—no backend or internet database required.
- **Instant Search & Filtering:** Search across banking services on the Home Dashboard and filter banks on the Bank Selection screen.
- **Export & Print Ready:** Download or print a clean summary of your selected bank, service, and document readiness status.
- **Mobile-First Responsive Design:** Built with clean fintech aesthetics, high-contrast navy/blue/teal accents, and touch-friendly controls.

---

## Application Screens

1. **Splash Screen:** Brand identity, animated readiness progress bar, and entry CTA.
2. **Home Dashboard:** Welcome banner, live service search, Zero Revisits Guarantee card, 8 banking service shortcuts, and recent activity cards.
3. **Onboarding / Welcome:** Interactive 3-step overview (*Pick Bank → Choose Service → Get Checklist*).
4. **Select Your Bank:** Searchable bank directory with public/private sector tags and active selection states.
5. **Select Banking Service:** Service selector displaying the active bank badge and service descriptions.
6. **Personalized Document Checklist:** Categorized checklist (*Identity Proof, Address Proof, Photographs, Additional Requirements*) with live completion percentage.
7. **My Saved Checklists:** Manage saved checklists with **Reopen**, **Edit**, and **Delete** actions.
8. **Additional Requirements:** Crucial branch reminders (originals vs. self-attested copies, fees, timings) and an interactive *"Don't Forget These"* packing list.
9. **Visit Readiness / Final Summary:** Overall readiness score, completed vs. pending document breakdown, Green Pass status, and PDF/Print export.
10. **Profile & Settings:** User profile details, preferred bank switcher, notification toggles, help section, and app information.

---

## Technology Stack

- **HTML5:** Semantic structure and multi-screen layout architecture
- **CSS3 & Tailwind CSS:** Responsive styling, safe-area handling, and fintech color system
- **Vanilla JavaScript (ES6+):** DOM manipulation, dynamic checklist rendering, state management, and progress calculation
- **Web Storage API (`localStorage`):** Client-side persistence for saved checklists and user settings
- **Google Fonts & Icons:** `Inter` typeface and `Material Symbols Outlined`

---

## Project Folder Structure

```text
zero-revisits-to-bank/
│
├── index.html          # Main application entry point containing all integrated screens
├── css/
│   └── style.css       # Custom styles, scrollbar hiding, and print media queries
├── js/
│   ├── data.js         # Structured dataset of banks, services, and document rules
│   ├── navigation.js   # Screen switching, history back-button, and bottom nav logic
│   ├── checklist.js    # Checklist generation, progress math, and LocalStorage saving
│   └── app.js          # App initialization, search filters, and UI event listeners
├── assets/
│   ├── images/         # Application logo and onboarding illustrations
│   └── icons/          # Custom icons (if applicable)
└── README.md           # Project documentation and setup guide