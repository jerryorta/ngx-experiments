# Known Pages — Real Estate App

Routes, key UI elements, and what to test on each page. This file is the regression test spec — when the skill runs without arguments, it tests everything listed here.

## App Shell

Every page includes:
- **Access gate** — blocks UI until code entered (see `access-gate-bypass.md`)
- **Header** — responsive: `re-large-header` (desktop) / `re-small-header` (mobile)
- **Left sidenav** — `re-sidenav` navigation drawer
- **Router outlet** — main content area

---

## Public Pages (No Auth Required)

### Home Page — `/`

**Component:** `ReHomeComponent` (logged-out view)

**Key elements to test:**
- Hero section loads with CTA buttons
- "Start Your 3-Month Trial" button is visible and clickable
- "Explore Features" button is visible and clickable
- Features grid renders with icons
- Pricing card section loads
- Footer links work: Privacy Policy, Terms of Use, Support

**Checks:**
- [ ] Page loads without console errors
- [ ] All CTA buttons are clickable
- [ ] Footer links navigate correctly
- [ ] Page is responsive (test at different viewport sizes)

### Property Search — `/large/search` (desktop) / `/small/home-search` (mobile)

**Component:** `ReHomeSearchPageComponent` / `SmallHomeSearchComponent`

**Key elements to test:**
- Search input field loads
- Search results area renders
- Map component loads (if present)

**Checks:**
- [ ] Search page loads without errors
- [ ] Search input is visible and accepts text
- [ ] Layout is appropriate for viewport size

### Privacy Policy — `/common/privacy-policy`

**Component:** `PrivacyPolicyPageComponent`

**Checks:**
- [ ] Page loads with legal content
- [ ] Content is readable and scrollable

### Terms of Use — `/common/terms-of-use`

**Component:** `TermsOfUsePageComponent`

**Checks:**
- [ ] Page loads with legal content
- [ ] Content is readable and scrollable

### Support — `/common/support`

**Component:** `SupportPageComponent`

**Checks:**
- [ ] Page loads with support information
- [ ] Contact methods are visible

### Subscribe — `/common/subscribe`

**Component:** `SubscribePageComponent`

**Checks:**
- [ ] Pricing/subscription options load
- [ ] CTA buttons are visible and clickable

---

## Subdomain-Gated Pages (Public, Requires Subdomain)

These pages require the app to be accessed via a subdomain (e.g., `acmebrokerage.realestate-concierge.io`). Without a subdomain, they redirect to `/`.

### Seller Intake Form — `/seller-intake`

**Component:** `SubdomainSellerIntakePageComponent`

**Key elements to test:**
- Dynamic form sections with select dropdowns
- Radio button groups
- Textarea fields
- Address autocomplete (`dlc-intake-address-autocomplete`)
- Checkbox fields
- Standard text/email/phone inputs
- Submit button with loading state
- Success/error message display

**Checks:**
- [ ] Form loads with all sections visible
- [ ] Required fields show validation errors when empty
- [ ] Select dropdowns open and options are selectable
- [ ] Radio buttons are clickable
- [ ] Submit button is disabled when form is invalid
- [ ] Submit button enables when form is valid
- [ ] Success message appears after valid submission
- [ ] Error messages appear for invalid inputs

### Buyer Intake — `/common/buyer-intake`

**Component:** `SubdomainBuyerIntakePageComponent`

**Checks:**
- [ ] Form loads with buyer-specific fields
- [ ] Validation works on required fields
- [ ] Submit flow works

### Home Valuation — `/common/home-valuation`

**Component:** `SubdomainHomeValuationPageComponent`

**Checks:**
- [ ] Valuation form loads
- [ ] Address input works
- [ ] Form submission works

---

## Protected Pages (Auth Required)

These pages require Firebase authentication. They can only be tested if the user has logged in through the persistent `playwright-cli` session.

### Dashboard — `/dashboard`

**Component:** `ReDashboardComponent`

**Key elements to test:**
- Quick-access cards for brokerages
- Quick-access cards for agencies
- Workspace list with create button
- Circle templates card
- Tier signup card
- Flag code entry card

**Checks:**
- [ ] Dashboard loads without errors
- [ ] Cards are visible and clickable
- [ ] "Add Circle" button works
- [ ] Navigation to workspace/brokerage/agency works

### Profile — `/common/profile`

**Component:** `ProfilePageComponent`

**Checks:**
- [ ] Profile form loads with user data
- [ ] Fields are editable
- [ ] Save button works

### Account — `/common/account`

**Component:** `AccountPageComponent`

**Checks:**
- [ ] Account settings load
- [ ] Settings are editable

### Leads — `/common/leads`

**Component:** `LeadListComponent`

**Checks:**
- [ ] Leads list loads
- [ ] Individual lead detail loads at `/common/leads/:id`

### PDF Forms — `/common/pdf-forms-admin/list`

**Component:** `PdfFormsPageComponent`

**Checks:**
- [ ] Forms list loads
- [ ] Individual form designer loads at `/common/pdf-forms-admin/designer/:pdfId`

---

## Admin Pages (Auth + Admin Role Required)

### Admin Users — `/common/admin-users`
### Admin Replication — `/common/admin-replication`
### Admin Tiers — `/common/admin-tiers`
### Admin Flags — `/common/admin-flags`
### Admin CMA Presets — `/common/admin-cma-presets`
### Admin Subdomains — `/common/admin-subdomains`

**Checks for all admin pages:**
- [ ] Page loads without errors
- [ ] Admin data table/list renders
- [ ] CRUD operations work (where applicable)

---

## Workspace Pages (Auth Required)

Routes: `/small/circle/:workspaceId/*` and `/large/circle/:workspaceId/*`

### Dashboard — `circle/:workspaceId/dashboard`
### Tasks — `circle/:workspaceId/tasks`
### Task Table — `circle/:workspaceId/task-table`
### Members — `circle/:workspaceId/members`
### Gallery — `circle/:workspaceId/gallery`
### Chat Log — `circle/:workspaceId/chat-log`
### Files — `circle/:workspaceId/files`
### Contacts — `circle/:workspaceId/contacts`
### Settings — `circle/:workspaceId/settings`

**Checks for all workspace pages:**
- [ ] Page loads within workspace context
- [ ] Tab/nav shows correct active state
- [ ] Content area renders appropriate data
- [ ] Mobile vs desktop layout is correct

---

## Brokerage Pages (Auth Required)

Routes: `/small/brokerage/:bid/*` and `/large/brokerage/:bid/*`

### About — `brokerage/:bid/about`
### Settings — `brokerage/:bid/settings`
### Members — `brokerage/:bid/members`
### Forms — `brokerage/:bid/forms`
### Configs — `brokerage/:bid/configs`
### DocuSign Auth — `brokerage/:bid/docusign-auth`
### Circles — `brokerage/:bid/circles`

---

## Agency Pages (Auth Required)

Routes: `/small/agency/:aid/*` and `/large/agency/:aid/*`

Same structure as Brokerage pages:
### About — `agency/:aid/about`
### Settings — `agency/:aid/settings`
### Members — `agency/:aid/members`
### Forms — `agency/:aid/forms`
### Configs — `agency/:aid/configs`
### DocuSign Auth — `agency/:aid/docusign-auth`
### Circles — `agency/:aid/circles`
