/* ==========================================================================
   FILE: js/data.js
   PROJECT: Zero Revisits to Bank
   PURPOSE: ALL application data lives here (banks, services, documents,
            additional requirements, FAQs, defaults). The screens never
            hardcode this content, so you can edit it without touching the UI.

   !!! IMPORTANT !!!
   Every requirement below is SAMPLE / DEMONSTRATION data. None of it is
   officially confirmed by any bank. To replace an item with verified
   information, edit its text and set  verification: "verified".

   This file only defines data. The code that merges default + bank-specific
   requirements is in js/checklist.js.
   ========================================================================== */

(function (global) {
  "use strict";

  /* ------------------------------------------------------------------
     1. General settings and notices
     ------------------------------------------------------------------ */
  const APP = {
    name: "Zero Revisits to Bank",
    tagline: "Prepare Smart. Visit Once.",
    version: "1.0.0",
    demoNotice:
      "Sample checklist for demonstration. Requirements vary by branch and account type. " +
      "Verify with your bank's latest official instructions.",
    disclaimer:
      "Completing this checklist does not guarantee service approval. " +
      "Confirm the latest requirements with your bank."
  };

  /* LocalStorage keys (all start with "zrb_" so they never clash with other sites) */
  const STORAGE_KEYS = {
    checklists: "zrb_checklists", // array of saved checklists
    session: "zrb_session",       // selected bank, service, active checklist
    profile: "zrb_profile",       // name, phone, email, preferred bank
    prefs: "zrb_prefs",           // notification / app preferences
    activity: "zrb_activity"      // recent activity list
  };

  /* ------------------------------------------------------------------
     2. Colour "tones" for service icons (taken from the Stitch design)
     ------------------------------------------------------------------ */
  const TONES = {
    secondary: {
      box: "bg-secondary-fixed text-secondary",
      hover: "group-hover:bg-secondary group-hover:text-on-secondary"
    },
    tertiary: {
      box: "bg-tertiary-fixed text-on-tertiary-fixed-variant",
      hover: "group-hover:bg-on-tertiary-container group-hover:text-on-tertiary"
    },
    primary: {
      box: "bg-primary-fixed text-primary",
      hover: "group-hover:bg-primary group-hover:text-on-primary"
    },
    neutral: {
      box: "bg-surface-container text-on-surface-variant",
      hover: "group-hover:bg-primary group-hover:text-on-primary"
    }
  };

  /* ------------------------------------------------------------------
     3. Banks  (add a new bank = add one object to this array)
     ------------------------------------------------------------------ */
  const BANKS = [
    {
      id: "sbi",
      name: "State Bank of India (SBI)",
      shortName: "State Bank of India",
      initials: "SBI",
      category: "Public Sector • Pan-India",
      iconClass: "bg-primary text-on-primary"
    },
    {
      id: "hdfc",
      name: "HDFC Bank",
      shortName: "HDFC Bank",
      initials: "HDFC",
      category: "Private Sector • Fast-Track",
      iconClass: "bg-secondary-fixed text-on-secondary-fixed"
    },
    {
      id: "icici",
      name: "ICICI Bank",
      shortName: "ICICI Bank",
      initials: "ICICI",
      category: "Private Sector • Digital KYC",
      iconClass: "bg-primary-fixed text-on-primary-fixed"
    },
    {
      id: "pnb",
      name: "Punjab National Bank (PNB)",
      shortName: "Punjab National Bank",
      initials: "PNB",
      category: "Public Sector • Pan-India",
      iconClass: "bg-secondary-fixed-dim/40 text-on-secondary-fixed-variant"
    },
    {
      id: "axis",
      name: "Axis Bank",
      shortName: "Axis Bank",
      initials: "AXIS",
      category: "Private Sector • Priority",
      iconClass: "bg-surface-container-high text-on-surface"
    },
    {
      id: "bob",
      name: "Bank of Baroda",
      shortName: "Bank of Baroda",
      initials: "BOB",
      category: "Public Sector • Pan-India",
      iconClass: "bg-primary-fixed-dim/50 text-on-primary-fixed-variant"
    }
  ];

  /* ------------------------------------------------------------------
     4. Banking services (the 8 services from the project brief)
        title        = name shown on cards
        activityName = wording used in the checklist header / summary
        keywords     = extra words that the search box also matches
     ------------------------------------------------------------------ */
  const SERVICES = [
    {
      id: "open-account",
      title: "Open a New Bank Account",
      subtitle: "New individual savings account",
      activityName: "Opening a Savings Account",
      icon: "account_balance",
      tone: "secondary",
      keywords: ["savings", "account", "new", "open", "joint"]
    },
    {
      id: "update-kyc",
      title: "Update KYC Details",
      subtitle: "Re-KYC, ID or PAN verification",
      activityName: "KYC Update",
      icon: "badge",
      tone: "tertiary",
      keywords: ["kyc", "re-kyc", "pan", "identity", "verification", "id"]
    },
    {
      id: "debit-card",
      title: "Apply for a Debit Card",
      subtitle: "New card or lost card replacement",
      activityName: "Debit Card Application",
      icon: "credit_card",
      tone: "secondary",
      keywords: ["debit", "card", "atm", "lost", "replacement"]
    },
    {
      id: "cheque-book",
      title: "Apply for a Cheque Book",
      subtitle: "Request new personalised leaves",
      activityName: "Cheque Book Request",
      icon: "menu_book",
      tone: "primary",
      keywords: ["cheque", "check", "book", "leaves"]
    },
    {
      id: "update-mobile",
      title: "Update Mobile Number",
      subtitle: "Link new number for SMS & OTP",
      activityName: "Mobile Number Update",
      icon: "smartphone",
      tone: "secondary",
      keywords: ["mobile", "phone", "number", "sms", "otp"]
    },
    {
      id: "update-address",
      title: "Update Address",
      subtitle: "Change communication or permanent address",
      activityName: "Address Update",
      icon: "home_pin",
      tone: "tertiary",
      keywords: ["address", "residence", "move", "shift", "location"]
    },
    {
      id: "bank-loan",
      title: "Apply for a Bank Loan",
      subtitle: "Income, property & collateral docs",
      activityName: "Loan Application",
      icon: "real_estate_agent",
      tone: "primary",
      keywords: ["loan", "home", "personal", "emi", "credit", "finance"]
    },
    {
      id: "other-services",
      title: "Other Banking Services",
      subtitle: "Account closure, branch transfer & more",
      activityName: "Account Closure / Transfer",
      icon: "apps",
      tone: "neutral",
      keywords: ["other", "close", "closure", "transfer", "branch", "misc"]
    }
  ];

  /* ------------------------------------------------------------------
     5. Document groups (section headings in the checklist, with icons)
     ------------------------------------------------------------------ */
  const DOC_GROUPS = [
    { id: "identity", label: "Identity Proof", icon: "badge" },
    { id: "address", label: "Address Proof", icon: "home_pin" },
    { id: "photo", label: "Photographs", icon: "photo_camera" },
    { id: "account", label: "Account Details", icon: "account_balance" },
    { id: "financial", label: "Income & Financial Proof", icon: "account_balance_wallet" },
    { id: "property", label: "Property & Collateral", icon: "home_work" },
    { id: "forms", label: "Forms & Fees", icon: "assignment" }
  ];

  /* ------------------------------------------------------------------
     6. Helpers for writing document data
        doc(...) builds one document object with every required field.
        Fields:
          id           unique within one checklist
          group        one of DOC_GROUPS ids
          name         document name
          description  short description
          copies       original / copy requirement
          status       "mandatory" or "conditional"
          instructions extra tips shown under the document
          verification "demo" (sample data) or "verified" (checked officially)
     ------------------------------------------------------------------ */
  function doc(id, group, name, description, copies, status, instructions) {
    return {
      id: id,
      group: group,
      name: name,
      description: description,
      copies: copies,
      status: status,
      instructions: instructions,
      verification: "demo"
    };
  }

  /* Documents used by several services. pick("pan") copies the common
     version; pass an object as the 2nd argument to change some fields. */
  const COMMON_DOCS = {
    aadhaar: doc(
      "aadhaar", "identity", "Aadhaar Card",
      "Primary identity and address proof for KYC.",
      "Original + 1 self-attested copy", "mandatory",
      "Carry the original for verification. Keep the mobile number linked to Aadhaar handy for OTP checks."
    ),
    pan: doc(
      "pan", "identity", "PAN Card",
      "Permanent Account Number for tax and account linking.",
      "Original + 1 self-attested copy", "mandatory",
      "If you do not have a PAN, ask the bank whether Form 60 can be submitted instead."
    ),
    idProof: doc(
      "id-proof", "identity", "Photo ID Proof",
      "Aadhaar, passport, voter ID or driving licence.",
      "Original + 1 self-attested copy", "mandatory",
      "The bank decides which IDs it accepts. Carry the original for verification."
    ),
    addressProof: doc(
      "address-proof", "address", "Valid Address Proof",
      "Needed if your current address differs from the one on your ID.",
      "Original + 1 self-attested copy", "conditional",
      "Examples: recent utility bill, passport or voter ID. Ask the bank which proofs it accepts."
    ),
    photos: doc(
      "photos", "photo", "Passport-Size Photographs",
      "2 recent colour photographs.",
      "2 printed photographs", "conditional",
      "Some branches capture your photo digitally. Confirm before printing."
    ),
    accountDetails: doc(
      "account-details", "account", "Account Number / Passbook",
      "Helps the branch identify your account quickly.",
      "Original passbook or account details", "mandatory",
      "Carry your passbook, or a note of your account number and the branch where the account is held."
    )
  };

  function pick(key, changes) {
    return Object.assign({}, COMMON_DOCS[key], changes || {});
  }

  /* ------------------------------------------------------------------
     7. REQUIREMENTS  =  default documents per service + bank overrides

     REQUIREMENTS[serviceId] = {
       documents: [ ...default documents for every bank... ],
       bankOverrides: {
         bankId: {
           addDocuments:    [ ...extra documents for this bank... ],
           updateDocuments: { docId: { field: "new value" } },
           removeDocuments: [ docId, ... ]
         }
       }
     }
     ------------------------------------------------------------------ */
  const REQUIREMENTS = {
    /* ---------------- Open a New Bank Account ---------------- */
    "open-account": {
      documents: [
        pick("aadhaar"),
        pick("pan"),
        pick("addressProof"),
        pick("photos"),
        doc(
          "account-form", "forms", "Account Opening Form",
          "Filled and signed account opening (CIF + savings account) form.",
          "Original (signed)", "mandatory",
          "Forms are usually available at the branch. Use black or blue ink and capital letters to avoid corrections."
        ),
        doc(
          "initial-deposit", "forms", "Initial Deposit",
          "Minimum opening balance, if applicable to the account type.",
          "Cash, cheque or transfer", "conditional",
          "Zero-balance and regular savings accounts follow different rules. Ask the bank which applies to you."
        )
      ],
      bankOverrides: {
        sbi: {
          addDocuments: [
            doc(
              "nominee", "forms", "Nominee Details",
              "Name, relationship and address of your nominee.",
              "Written details", "conditional",
              "Sample item: nomination is usually offered at account opening. Confirm the exact form with the branch."
            )
          ]
        },
        hdfc: {
          updateDocuments: {
            "account-form": {
              instructions:
                "Sample note: some private banks pre-fill forms digitally. Carry your ID so the officer can complete verification."
            }
          }
        },
        icici: {
          updateDocuments: {
            aadhaar: {
              instructions:
                "Sample note: digital KYC may be offered at the branch. Keep your Aadhaar-linked mobile phone with you."
            }
          }
        },
        pnb: {
          addDocuments: [
            doc(
              "nominee", "forms", "Nominee Details",
              "Name, relationship and address of your nominee.",
              "Written details", "conditional",
              "Sample item. Confirm the exact nomination form with the branch."
            )
          ]
        },
        axis: {
          updateDocuments: {
            photos: {
              instructions:
                "Sample note: the branch may take a digital photo. Still carry 2 prints as a backup."
            }
          }
        },
        bob: {
          addDocuments: [
            doc(
              "nominee", "forms", "Nominee Details",
              "Name, relationship and address of your nominee.",
              "Written details", "conditional",
              "Sample item. Confirm the exact nomination form with the branch."
            )
          ],
          updateDocuments: {
            "address-proof": {
              instructions:
                "Sample note: bring a proof that shows your current residential address. Ask which proofs the branch accepts."
            }
          }
        }
      }
    },

    /* ---------------- Update KYC Details ---------------- */
    "update-kyc": {
      documents: [
        pick("accountDetails"),
        pick("idProof"),
        pick("pan"),
        pick("addressProof", {
          description: "Needed if your address has changed since your last KYC.",
          instructions: "Carry a recent proof showing your current address, such as a utility bill."
        }),
        pick("photos", {
          id: "photo-recent",
          name: "Recent Photograph",
          description: "1 recent colour photograph, if the branch asks for it.",
          copies: "1 printed photograph"
        }),
        doc(
          "kyc-form", "forms", "KYC Update Form",
          "Form to refresh or correct your KYC details.",
          "Original (signed)", "mandatory",
          "Sign exactly as per your bank records. Fill the form at the branch if you do not have a printed copy."
        ),
        doc(
          "occupation-declaration", "forms", "Occupation / Income Declaration",
          "Details of your occupation and income range, if asked.",
          "Written declaration", "conditional",
          "Some banks ask for this during periodic KYC refresh. Confirm with the branch."
        )
      ],
      bankOverrides: {
        hdfc: {
          updateDocuments: {
            "kyc-form": {
              instructions:
                "Sample note: some private banks allow partial KYC updates online. Ask whether a branch visit is required for your case."
            }
          }
        },
        sbi: {
          updateDocuments: {
            "account-details": {
              instructions:
                "Sample note: public sector banks often prefer you to visit your home branch for KYC. Confirm with the branch."
            }
          }
        },
        icici: {
          removeDocuments: ["occupation-declaration"]
        }
      }
    },

    /* ---------------- Apply for a Debit Card ---------------- */
    "debit-card": {
      documents: [
        pick("accountDetails"),
        pick("idProof"),
        doc(
          "card-form", "forms", "Debit Card Request Form",
          "Application or request form, if not done through net banking.",
          "Original (signed)", "mandatory",
          "Ask at the counter whether the request can also be raised through net or mobile banking."
        ),
        doc(
          "registered-mobile", "account", "Registered Mobile Number",
          "The mobile number linked to your account.",
          "Keep your phone with you", "mandatory",
          "OTP and SMS alerts are needed to set up or activate the card."
        ),
        doc(
          "lost-card-ref", "forms", "Block / Lost-Card Reference",
          "Only for replacing a lost, stolen or damaged card.",
          "Reference number or damaged card", "conditional",
          "If the old card is lost, block it first and note the reference number."
        ),
        doc(
          "card-fee", "forms", "Card Issuance Fee",
          "Fee for a new or replacement card, if applicable.",
          "Cash or account debit", "conditional",
          "Fees depend on card type. Ask the bank before your visit."
        )
      ],
      bankOverrides: {}
    },

    /* ---------------- Apply for a Cheque Book ---------------- */
    "cheque-book": {
      documents: [
        pick("accountDetails"),
        doc(
          "requisition-slip", "forms", "Cheque Book Requisition Slip",
          "Request slip, usually found at the end of your old cheque book.",
          "Original (signed)", "mandatory",
          "Sign exactly as per your bank records. Fill in the number of leaves you need."
        ),
        pick("idProof", {
          status: "conditional",
          description: "The branch may ask for ID if you are not a regular visitor.",
          copies: "Original"
        }),
        doc(
          "joint-signatures", "forms", "Joint Holder Signatures",
          "Needed only for joint accounts with specific signing rules.",
          "Signatures of required holders", "conditional",
          "Check how your joint account is operated (either or survivor, jointly, etc.)."
        )
      ],
      bankOverrides: {}
    },

    /* ---------------- Update Mobile Number ---------------- */
    "update-mobile": {
      documents: [
        pick("accountDetails"),
        pick("idProof"),
        doc(
          "mobile-form", "forms", "Mobile Number Update Form",
          "Request form to change your registered mobile number.",
          "Original (signed)", "mandatory",
          "Write the new number clearly and double-check each digit."
        ),
        doc(
          "new-mobile", "account", "New Mobile Number (Active)",
          "The new number must be active and reachable.",
          "Keep the phone and SIM with you", "mandatory",
          "An OTP or confirmation SMS may be sent to the new number."
        ),
        doc(
          "old-mobile", "account", "Old Registered Mobile (if accessible)",
          "The number currently linked to your account.",
          "Keep the phone with you", "conditional",
          "If the old number is lost or inactive, tell the officer. Extra verification may apply."
        ),
        doc(
          "debit-card-carry", "account", "Debit Card",
          "May help the branch verify your identity.",
          "Original card", "conditional",
          "Carry it if you have one. Never share your PIN."
        )
      ],
      bankOverrides: {}
    },

    /* ---------------- Update Address ---------------- */
    "update-address": {
      documents: [
        pick("accountDetails"),
        pick("idProof"),
        pick("addressProof", {
          id: "new-address-proof",
          name: "New Address Proof",
          status: "mandatory",
          description: "A document showing your NEW address.",
          instructions: "The name and new address on the proof should be clearly readable."
        }),
        doc(
          "address-form", "forms", "Address Change Request Form",
          "Form to update your communication or permanent address.",
          "Original (signed)", "mandatory",
          "Mention whether you are changing the communication address, permanent address, or both."
        ),
        doc(
          "self-declaration", "forms", "Self-Declaration of New Address",
          "Signed declaration, if your proof does not show the new address.",
          "Original (signed)", "conditional",
          "Ask whether the bank accepts a signed declaration along with other documents."
        )
      ],
      bankOverrides: {}
    },

    /* ---------------- Apply for a Bank Loan ---------------- */
    "bank-loan": {
      documents: [
        pick("idProof"),
        pick("pan"),
        pick("addressProof", { status: "mandatory" }),
        pick("photos", { status: "mandatory", description: "2 recent colour photographs for the application." }),
        doc(
          "income-proof", "financial", "Income Proof",
          "Latest salary slips (salaried) or income proof (self-employed).",
          "Originals + 1 copy set", "mandatory",
          "Salaried applicants usually carry the last 3 months of salary slips."
        ),
        doc(
          "bank-statements", "financial", "Bank Statements (6 months)",
          "Statements of the account where your income is credited.",
          "Printed or stamped statements", "mandatory",
          "Ask your home branch for a stamped statement if the loan bank requires it."
        ),
        doc(
          "itr-form16", "financial", "ITR / Form 16",
          "Income tax return and/or Form 16 for recent years.",
          "Copies", "mandatory",
          "Carry the acknowledgement or computation, as available."
        ),
        doc(
          "employment-proof", "financial", "Employment / Business Proof",
          "Appointment letter, ID card, or business registration.",
          "Copies", "conditional",
          "The bank may ask for this to verify stability of income."
        ),
        doc(
          "existing-loans", "financial", "Existing Loan Statements",
          "Statements of any running loans or credit cards.",
          "Copies", "conditional",
          "Needed only if you already have active loans."
        ),
        doc(
          "property-docs", "property", "Property / Collateral Documents",
          "Sale agreement, title documents or collateral papers.",
          "Originals + copies", "conditional",
          "Mainly for home loans or secured loans. Ask the bank for its exact list."
        ),
        doc(
          "loan-form", "forms", "Loan Application Form",
          "Completed and signed loan application.",
          "Original (signed)", "mandatory",
          "Fill in every field. Incomplete forms are a common reason for delays."
        )
      ],
      bankOverrides: {}
    },

    /* ---------------- Other Banking Services (closure / transfer) ---------------- */
    "other-services": {
      documents: [
        pick("accountDetails"),
        pick("idProof"),
        doc(
          "request-form", "forms", "Written Request / Closure Form",
          "Request for account closure or branch transfer.",
          "Original (signed)", "mandatory",
          "State clearly whether you want to close the account or move it to another branch."
        ),
        doc(
          "unused-instruments", "account", "Unused Cheque Leaves & Debit Card",
          "Surrender these when closing an account.",
          "Originals", "conditional",
          "Cut or hand over the card and unused cheque leaves as the bank instructs."
        ),
        doc(
          "destination-branch", "forms", "Destination Branch Details",
          "Name and code of the branch you want to transfer to.",
          "Written details", "conditional",
          "Needed only for a branch transfer."
        ),
        doc(
          "dues-clearance", "forms", "Pending Dues / Standing Instructions",
          "Clear dues and cancel auto-debits linked to the account.",
          "Written confirmation", "conditional",
          "Cancel EMIs, SIPs and subscriptions before closing the account."
        )
      ],
      bankOverrides: {}
    }
  };

  /* ------------------------------------------------------------------
     8. EXTRAS  =  content for the "Additional Requirements" screen
        common      shown for every bank and service
        services    extra cards for one service
        banks       branch-related notes for one bank
        card.tone   secondary | tertiary | primary | neutral (see TONES)
     ------------------------------------------------------------------ */
  const EXTRAS = {
    common: {
      cards: [
        {
          id: "originals",
          icon: "folder_copy",
          tone: "primary",
          title: "Original Documents for Verification",
          text: "Carry originals alongside photocopies. The officer verifies them and returns the originals."
        },
        {
          id: "attested",
          icon: "draw",
          tone: "secondary",
          title: "Self-Attested Photocopies",
          text: "Sign across copies if requested, and add the current date."
        },
        {
          id: "appointment",
          icon: "event_available",
          tone: "tertiary",
          title: "Appointment or Branch Visit",
          text: "Check branch timings or book a slot where available to avoid peak-hour queues."
        },
        {
          id: "fees",
          icon: "account_balance_wallet",
          tone: "neutral",
          title: "Applicable Fees & Minimum Balance",
          text: "Ask about fees, charges and minimum balance rules so there are no surprises at the counter."
        }
      ],
      important:
        "Branch policies may require a physical signature or in-person biometric verification.",
      reminder:
        "These are sample requirements for demonstration. Always verify the latest requirements with your bank before visiting.",
      packList: [
        { id: "pen", icon: "edit", label: "Black/blue ballpoint pen" },
        { id: "phone", icon: "smartphone", label: "Registered mobile phone for OTP" }
      ]
    },

    services: {
      "open-account": {
        cards: [
          {
            id: "joint",
            icon: "group",
            tone: "secondary",
            title: "Opening a Joint Account?",
            text: "All applicants usually need to be present, each with their own identity and address documents."
          }
        ],
        packList: [
          { id: "deposit", icon: "payments", label: "Debit card/cash for initial deposit" }
        ]
      },
      "update-kyc": {
        cards: [
          {
            id: "kyc-changes",
            icon: "published_with_changes",
            tone: "tertiary",
            title: "Mention Recent Changes",
            text: "If your name, address, or marital status changed, bring supporting proof for that change."
          }
        ],
        packList: []
      },
      "debit-card": {
        cards: [
          {
            id: "card-safety",
            icon: "lock",
            tone: "primary",
            title: "Card & PIN Safety",
            text: "Never share your PIN or card details with anyone, including bank staff."
          }
        ],
        packList: []
      },
      "cheque-book": {
        cards: [
          {
            id: "signature",
            icon: "signature",
            tone: "secondary",
            title: "Match Your Signature",
            text: "Sign the request exactly as your signature appears in the bank records."
          }
        ],
        packList: []
      },
      "update-mobile": {
        cards: [
          {
            id: "otp-both",
            icon: "sms",
            tone: "secondary",
            title: "Keep Both Numbers Reachable",
            text: "The bank may send a confirmation OTP to the old or new number."
          }
        ],
        packList: []
      },
      "update-address": {
        cards: [
          {
            id: "address-match",
            icon: "home_pin",
            tone: "tertiary",
            title: "Proof Must Match",
            text: "Your name on the proof should match the name on your bank account."
          }
        ],
        packList: []
      },
      "bank-loan": {
        important:
          "Loan approval depends on the bank's own credit assessment. Completing this checklist does not guarantee approval.",
        cards: [
          {
            id: "credit-score",
            icon: "speed",
            tone: "primary",
            title: "Know Your Credit Score",
            text: "Check your credit score beforehand. It strongly influences eligibility and interest rate."
          },
          {
            id: "loan-extra-docs",
            icon: "post_add",
            tone: "secondary",
            title: "Extra Documents May Be Requested",
            text: "Loan officers may ask for additional papers after reviewing your application."
          }
        ],
        packList: [
          { id: "folder", icon: "folder", label: "Folder for original documents" }
        ]
      },
      "other-services": {
        cards: [
          {
            id: "closure-balance",
            icon: "savings",
            tone: "neutral",
            title: "Closing an Account",
            text: "Check the remaining balance, closure charges, and linked auto-debits before you visit."
          }
        ],
        packList: []
      }
    },

    /* Branch-related considerations per bank (sample text) */
    banks: {
      sbi: {
        cards: [
          {
            id: "bank-sbi",
            icon: "storefront",
            tone: "primary",
            title: "Branch Note: State Bank of India",
            text: "Sample note: some services may be easier at your home branch. Ask whether any branch can help."
          }
        ]
      },
      hdfc: {
        cards: [
          {
            id: "bank-hdfc",
            icon: "storefront",
            tone: "primary",
            title: "Branch Note: HDFC Bank",
            text: "Sample note: some steps may be possible digitally. Ask whether you can complete part of this online."
          }
        ]
      },
      icici: {
        cards: [
          {
            id: "bank-icici",
            icon: "storefront",
            tone: "primary",
            title: "Branch Note: ICICI Bank",
            text: "Sample note: ask whether digital or video KYC is available for your service."
          }
        ]
      },
      pnb: {
        cards: [
          {
            id: "bank-pnb",
            icon: "storefront",
            tone: "primary",
            title: "Branch Note: Punjab National Bank",
            text: "Sample note: branch timings and counters can differ. Confirm with your branch before leaving."
          }
        ]
      },
      axis: {
        cards: [
          {
            id: "bank-axis",
            icon: "storefront",
            tone: "primary",
            title: "Branch Note: Axis Bank",
            text: "Sample note: ask whether a priority or appointment slot is available at your branch."
          }
        ]
      },
      bob: {
        cards: [
          {
            id: "bank-bob",
            icon: "storefront",
            tone: "primary",
            title: "Branch Note: Bank of Baroda",
            text: "Sample note: some requests may need the home branch. Confirm before you travel."
          }
        ]
      }
    }
  };

  /* ------------------------------------------------------------------
     9. FAQs (shown in Profile > Help & Support)
     ------------------------------------------------------------------ */
  const FAQS = [
    {
      q: "Are these requirements official?",
      a: "No. The requirements in this demo are sample data. Always confirm the latest list with your bank or its official website."
    },
    {
      q: "Where is my data stored?",
      a: "Only in your own browser (LocalStorage) on this device. Nothing is sent to a server, and clearing browser data will remove it."
    },
    {
      q: "What does 'mandatory' vs 'conditional' mean?",
      a: "Mandatory documents are needed for almost every case. Conditional documents depend on your situation, branch or account type."
    },
    {
      q: "When am I 'ready' for my visit?",
      a: "When every mandatory document is marked as completed. Conditional documents are shown separately so you can decide whether they apply to you."
    },
    {
      q: "Can I print or download my checklist?",
      a: "Yes. Open the Visit Readiness Summary and use the Download or Print buttons."
    }
  ];

  /* ------------------------------------------------------------------
     10. Default profile and preferences
         No fake user: the profile starts empty and you can edit it.
     ------------------------------------------------------------------ */
  const DEFAULT_PROFILE = {
    name: "",
    phone: "",
    email: "",
    preferredBankId: "sbi"
  };

  const DEFAULT_PREFS = {
    visitReminders: true,
    checklistAlerts: true
  };

  /* ------------------------------------------------------------------
     11. Small lookup helpers
     ------------------------------------------------------------------ */
  function getBank(id) {
    return BANKS.find(function (b) { return b.id === id; }) || null;
  }

  function getService(id) {
    return SERVICES.find(function (s) { return s.id === id; }) || null;
  }

  function getGroup(id) {
    return DOC_GROUPS.find(function (g) { return g.id === id; }) || DOC_GROUPS[DOC_GROUPS.length - 1];
  }

  /* ------------------------------------------------------------------
     12. Expose everything on one global object
     ------------------------------------------------------------------ */
  global.ZRB_DATA = {
    APP: APP,
    STORAGE_KEYS: STORAGE_KEYS,
    TONES: TONES,
    BANKS: BANKS,
    SERVICES: SERVICES,
    DOC_GROUPS: DOC_GROUPS,
    REQUIREMENTS: REQUIREMENTS,
    EXTRAS: EXTRAS,
    FAQS: FAQS,
    DEFAULT_PROFILE: DEFAULT_PROFILE,
    DEFAULT_PREFS: DEFAULT_PREFS,
    getBank: getBank,
    getService: getService,
    getGroup: getGroup
  };
})(window);