# Tutor Chooser Front-End Assets

This repository serves as the central hub for the custom logic (JavaScript) and styling (CSS) powering the **Tutor Chooser (TC)** platform. 

### Why this exists
Previously, custom code was managed directly within Webflow's Custom Code blocks. However, due to Webflow's **50,000 character limit** per page and the need for better **version control**, all significant scripts and styles have been moved here.

This architecture provides:
* **Infinite Scalability**: No more character limits for complex platform logic.
* **Version History**: Ability to track changes, debug regressions, and collaborate effectively.
* **High Performance**: Files are delivered via the **jsDelivr Global CDN** for low-latency loading.

---

### Delivery Pipeline
To link these files to Webflow, use the following CDN format:
`https://cdn.jsdelivr.net/gh/tutor-chooser/front-end@main/[FOLDER_PATH]/[FILE_NAME].js`

> **Note on Caching**: If updates are not appearing instantly on the live site, append a version query to the URL in Webflow (e.g., `...script.js?v=1.1`) to force the CDN to fetch the absolute latest version.

---

### Folder Structure
The repository is organized by site section and user type to ensure modularity.

* **/global/**: Shared items used across the entire site.
    * `utils.js`: Core helper functions (e.g., `escapeHtml`, `formatDate`).
    * `theme.css`: Shared `:root` brand variables and global styles.
* **/dashboard/**: User-specific dashboard logic.
    * **/tutor/**: Profile management, verification states, and subscription logic.
    * **/parent/**: Meeting requests, tutor finder interactions, and booking history.
* **/tutor-finder/**:
    * **/view-profile/**: Logic for loading and rendering public tutor profile data.
* **/home/**: Landing page specific interactions.
* **/profile-page/**: Detailed view pages for both user types.

---

### Key Feature Logic
* **Tier-Based Visibility**: The dashboard script dynamically hides or shows subscription boxes (Free vs. Pro) based on the user's current plan and verification status to prevent downgrades.
* **Dynamic Badging**: Logic automatically renders badges for academic qualifications (PhD, Masters, etc.), verified teaching licenses, and police certificates based on Monday.com status data.
* **Verification Locking**: Once a profile is "Verified" or "Under Review" in Monday.com, specific UI sections and inputs are automatically locked to prevent unauthorized changes.
* **Stripe Integration**: Redirects users to the Stripe Checkout Worker based on the selected subscription tier or verification fee status.

---

### Usage Guidelines
1.  **Pure Code Only**: Files in this repo should **not** contain `<script>` or `<style>` tags. They should be raw `.js` or `.css` files.
2.  **Order Matters**: In Webflow, always load `/global/utils.js` **before** any page-specific scripts to ensure helper functions are available.
3.  **Security**: Do not commit sensitive API keys or secrets to this repository. Use Cloudflare Workers to handle sensitive tokens and private communications.
