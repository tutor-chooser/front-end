# Tutor Profile Management Script (`profile-stage.js`)

## Overview
This script serves as the core controller for the Tutor Profile. It orchestrates data synchronization between the frontend (Webflow), the backend (Monday.com), and the payment processor (Stripe). It utilizes a modular "Singleton" architecture to separate API logic, UI updates, and state management, ensuring a responsive and maintainable codebase.

## High-Level Functionality Buckets

### 1. Initialization & State Hydration
* **User Identification:** Waits for Memberstack to initialize and securely retrieves the logged-in user's `tutor-id`.
* **Data Fetching:** Performs parallel requests to fetch the user's raw profile data from Monday.com and their real-time profile completion percentage.
* **UI Hydration:** Automatically populates HTML inputs, text areas, dropdowns, and file lists with the data retrieved from the server, ensuring the user sees their most up-to-date information.

### 2. UI Logic & Dynamic Display
* **Badge System:** Dynamically shows or hides status badges (e.g., "Verified", "Early Adopter", "PhD", "Police Check") based on specific column values returned from the backend.
* **Profile Locking:** Enforces read-only states by locking the entire profile form (disabling inputs and buttons) if the user status is `VERIFIED` or `SUBMITTED`.
* **Smart Pricing:** Updates subscription pricing cards in real-time. It checks for "Early Adopter" status or valid "Referral Codes" to apply discounts (striking through old prices and displaying new ones) automatically.

### 3. Form Handling & Change Detection
* **"Dirty" Checking:** Uses a strategy pattern to detect changes. When a user clicks "Save," the script compares the current input values against the initial server data and constructs a payload containing *only* the changed fields.
* **Validation:**
    * **Phone Numbers:** Integrates with `intl-tel-input` to enforce valid international phone number formats.
    * **Required Fields:** Scans 20+ specific required fields before allowing profile submission, highlighting missing fields visually.
* **Referral Validation:** Monitors the referral code input. If changed, it triggers a 6-second debounce delay before re-validating the code with the server to prevent API spamming.

### 4. File Management
* **List Rendering:** Renders read-only lists of existing files (Qualifications, Police Certs, etc.) sourced directly from Monday.com column data.
* **Upload Handling:** Bundles new file uploads into a `FormData` object and routes them to a dedicated worker for processing.

### 5. Payments & Submission
* **Stripe Integration:** Manages event listeners for "Free", "Starter", and "Pro" plan buttons. It initiates Stripe Checkout sessions and handles the redirect logic.
* **Verification Flow:** Manages the "Submit for Review" process. It intelligently decides whether to prompt the user for a verification payment or allow a direct re-submission based on the user's existing `feePaid` status.

---

## API Endpoints & Workers
This script interacts with the following Tutor Chooser Cloudflare Workers:

| Variable Name | Endpoint URL | Purpose |
| :--- | :--- | :--- |
| **`MONDAY_API`** | `https://tc-stage.tutorchooser.workers.dev` | Fetches raw column data (GraphQL) from Monday.com. |
| **`PROFILE_WORKER`** | `https://tc-staging-profile.tutorchooser.workers.dev` | Handles text updates and calculates completion percentage. |
| **`FILE_UPLOAD_WORKER`** | `https://tc-staging-file-upload.tutorchooser.workers.dev/` | Accepts multipart form data to upload documents to Monday.com. |
| **`STRIPE_WORKER`** | `https://tc-staging-stripe.tutorchooser.workers.dev/create-checkout-session` | Generates Stripe Checkout sessions for subscription plans. |

---

## Configuration
All configuration—including API URLs, Monday.com Column IDs, and month names—is centralized in the `CONFIG` object at the top of the file. 

To update a Column ID, simply edit the `CONFIG.COLS` map in `profile-stage.js`.

## Dependencies
* **Memberstack DOM:** Required for user authentication (`window.$memberstackDom`).
* **Intl-Tel-Input:** Required for phone number validation (`window.intlTelInputGlobals`).
* **Select2 / jQuery:** (Optional) Supports Select2 dropdowns if present in the DOM.