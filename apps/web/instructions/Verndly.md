# Verndly
# UI RULES & DESIGN SYSTEM

**Version:** 1.0  
**Status:** Mandatory  
**Design Direction:** Linear × Google × Apple  
**Primary Stack:** Next.js + TypeScript + Tailwind CSS + Motion  
**Design Philosophy:** Calm, precise, premium, fast, intentional.

---

# 01 — DESIGN NORTH STAR

The product must feel like a **serious modern SaaS**, not a generic dashboard template.

The visual language combines:

- **Linear** — density, precision, hierarchy, keyboard-first interaction
- **Google** — clarity, accessibility, simplicity, information architecture
- **Apple** — restraint, typography, spacing, polish and motion

The interface should communicate:

> **"Everything is under control."**

It should feel:

- Premium
- Calm
- Fast
- Intelligent
- Minimal
- Trustworthy
- Professional
- Highly intentional

It must NOT feel:

- Over-designed
- Flashy
- Corporate
- Generic
- Template-like
- Cluttered
- Cartoonish
- Excessively glassy
- Full of unnecessary cards

---

# 02 — ABSOLUTE DESIGN RULES

These rules override individual implementation preferences.

## Rule 1 — No visual noise

Every visual element must have a reason to exist.

If removing an element does not reduce usability, remove it.

---

## Rule 2 — No unnecessary cards

Do NOT put everything inside a card.

Bad:

```text
┌──────────────────────────────┐
│ Card                         │
│ ┌──────────────────────────┐ │
│ │ Card                    │ │
│ │ ┌──────────────────────┐│ │
│ │ │ Card                ││ │
│ │ └──────────────────────┘│ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

Prefer:

```text
Page
 ├── Header
 ├── Metrics
 ├── Content
 └── Secondary information
```

Use cards only when they establish meaningful grouping.

---

## Rule 3 — No drop shadows

Do not use:

```css
shadow-sm
shadow
shadow-md
shadow-lg
shadow-xl
```

The default visual separation mechanism is:

- borders
- background contrast
- spacing
- blur
- opacity
- typography

The interface should remain visually flat.

---

## Rule 4 — Borders over shadows

Use subtle borders.

Preferred:

```text
border-black/10
border-white/10
```

depending on theme.

Borders should rarely be visually dominant.

---

## Rule 5 — No random gradients

Gradients are an accent, not a background strategy.

Never apply gradients to:

- every card
- every button
- every section
- every heading
- every icon

Use gradients selectively for:

- hero backgrounds
- major visual moments
- branded accents
- highlighted states

---

# 03 — TYPOGRAPHY

Primary typeface:

> **SF Pro**

Use the closest system fallback when SF Pro is unavailable.

Recommended stack:

```css
font-family:
  -apple-system,
  BlinkMacSystemFont,
  "SF Pro Display",
  "SF Pro Text",
  "Inter",
  sans-serif;
```

Typography should feel compact and highly legible.

---

# 04 — TYPE SCALE

Use a restrained type hierarchy.

```text
Display
48–64px
Weight: 600

Page Title
28–36px
Weight: 600

Section Title
20–24px
Weight: 600

Card / Component Title
15–17px
Weight: 600

Body
14–16px
Weight: 400

Secondary
13–14px
Weight: 400

Metadata
11–12px
Weight: 500
```

Do not use huge typography merely to make a page look impressive.

Hierarchy matters more than size.

---

# 05 — FONT WEIGHTS

Preferred:

```text
400 — regular
500 — medium
600 — semibold
```

Avoid excessive `700` / bold typography.

The interface should communicate hierarchy through:

- size
- weight
- spacing
- contrast

not aggressive bold text.

---

# 06 — COLOR SYSTEM

The application must support:

```text
Light Mode
Dark Mode
System Mode
```

Use semantic tokens instead of hardcoded colors.

Example:

```text
background
foreground

muted
muted-foreground

border
input

primary
primary-foreground

secondary
secondary-foreground

destructive
success
warning
info
```

Never scatter arbitrary colors throughout components.

Bad:

```tsx
text-[#192938]
bg-[#f7f8fa]
border-[#d9dce1]
```

Prefer semantic tokens:

```tsx
text-foreground
bg-background
border-border
text-muted-foreground
```

---

# 07 — COLOR PHILOSOPHY

### Light Mode

The interface should feel:

- white
- warm/cool neutral
- subtle
- spacious

Avoid pure-white everything with zero hierarchy.

Use extremely subtle surface differentiation.

---

### Dark Mode

Dark mode should NOT simply be:

```text
background: #000000
```

Use near-black surfaces.

Hierarchy comes from:

```text
background
surface
elevated surface
border
foreground
muted foreground
```

---

# 08 — GLASSMORPHISM

Glass is allowed, but controlled.

Use glass for:

- navigation
- floating controls
- command palette
- sticky headers
- modal overlays
- contextual controls

Example:

```css
backdrop-blur-xl
bg-background/70
border border-border/50
```

Do NOT make the entire application glass.

Glass must communicate:

> floating above the interface

not:

> everything is transparent.

---

# 09 — BLUR

Blur should establish depth.

Recommended:

```text
backdrop-blur-sm
backdrop-blur-md
backdrop-blur-xl
```

Do not blur content unnecessarily.

Never sacrifice readability for aesthetics.

---

# 10 — SPACING SYSTEM

Use a consistent spacing scale.

Primary values:

```text
4
8
12
16
20
24
32
40
48
64
80
96
```

Avoid arbitrary spacing.

Prefer:

```tsx
gap-4
gap-6
p-4
p-6
space-y-6
```

over arbitrary values unless there is a specific design reason.

---

# 11 — BORDER RADIUS

Use restrained rounding.

Suggested:

```text
sm: 6px
md: 8px
lg: 12px
xl: 16px
2xl: 20px
```

Do not make every component extremely rounded.

Avoid:

```text
rounded-full
```

unless the element is naturally circular/pill-shaped.

---

# 12 — LAYOUT

The application should use a strong layout system.

Host dashboard:

```text
┌───────────────────────────────────────────────┐
│ Topbar                                        │
├──────────────┬────────────────────────────────┤
│              │                                │
│ Sidebar      │ Main Content                   │
│              │                                │
│              │                                │
│              │                                │
└──────────────┴────────────────────────────────┘
```

Desktop:

```text
Sidebar: 240–260px
Content: flexible
Max content width: approximately 1400px
```

Do not unnecessarily constrain dashboard content to tiny widths.

---

# 13 — SIDEBAR

The sidebar should feel like Linear.

Requirements:

- Compact
- Quiet
- Clear
- Keyboard friendly
- Strong active state
- Minimal decoration

Structure:

```text
Workspace
   ↓
Overview

EVENT
   Events
   Voting
   Tickets
   Nominees

MANAGEMENT
   Transactions
   Attendees
   Analytics

SETTINGS
   Organization
   Team
   Billing
```

Use section labels sparingly.

Icons should support navigation, not replace labels.

---

# 14 — TOPBAR

The topbar should contain only high-value controls.

Possible:

```text
Breadcrumb
Event selector
Search
Notifications
Help
Account
```

Do not turn the topbar into a toolbar containing every action.

---

# 15 — BUTTONS

Buttons must communicate hierarchy.

Primary:

```text
Create Event
Publish Event
Save Changes
```

Secondary:

```text
Cancel
Export
Configure
```

Tertiary:

```text
View
Open
More
```

Destructive:

```text
Delete
Disable
Cancel Event
```

Avoid multiple competing primary buttons.

Every screen should have an obvious primary action.

---

# 16 — BUTTON RULE

A button must have:

- clear action
- predictable result
- loading state
- disabled state
- hover state
- focus state
- error handling when applicable

Never create decorative buttons.

If something does not perform an action, it should not look like a button.

---

# 17 — ICONS

Use one icon system consistently.

Preferred:

```text
Lucide
```

Rules:

- Consistent stroke width
- Consistent sizing
- 16px for compact UI
- 18px for standard actions
- 20–24px for prominent actions

Never mix random icon libraries.

---

# 18 — ICON + TEXT

For important actions:

```text
[ + ] Create event
[ ↓ ] Export
[ ⚙ ] Settings
```

Icons support recognition.

They do not replace meaningful labels where ambiguity exists.

---

# 19 — TABLES

Tables are critical for:

- nominees
- transactions
- votes
- tickets
- attendees
- events

Tables should be:

- dense
- readable
- sortable
- filterable
- responsive
- keyboard accessible

Example:

```text
Nominee        Category       Votes       Status       Actions
──────────────────────────────────────────────────────────────
Jane Doe       Best Student   1,204       Active       •••
John Doe       Best Student     982       Active       •••
```

Avoid excessive row decoration.

Use whitespace and subtle borders.

---

# 20 — DATA DENSITY

This is an operations product.

Do not make dashboards unnecessarily spacious.

Users need to process information quickly.

Use:

```text
compact tables
clear numbers
strong hierarchy
controlled whitespace
```

The UI should feel closer to Linear than a marketing website.

---

# 21 — DASHBOARD METRICS

Metrics should answer questions immediately.

Examples:

```text
Total Votes
12,482
+18.4%

Revenue
GHS 24,960
+12.2%

Tickets Sold
842
68% capacity

Active Nominees
64
```

Do not use charts just because the dashboard needs a chart.

Every visualization must answer a question.

---

# 22 — CHARTS

Charts must be:

- minimal
- readable
- responsive
- informative

Avoid:

- 3D charts
- excessive gradients
- decorative graphs
- unnecessary legends
- rainbow colors

Prefer:

```text
line charts
bar charts
simple area charts
donuts only when genuinely useful
```

---

# 23 — MOTION

Motion is mandatory for polish but must remain subtle.

Use Motion for:

- page transitions
- modal entry
- dropdowns
- hover states
- list changes
- expanding sections
- tab transitions
- loading states
- navigation transitions

Animation should feel:

> physically believable

not:

> attention seeking

---

# 24 — MOTION TIMING

Recommended:

```text
Micro interaction:
100–180ms

Standard:
180–250ms

Large transition:
250–400ms
```

Use easing.

Prefer:

```text
ease-out
spring
```

Avoid slow animations for routine operations.

The product should feel fast.

---

# 25 — MOTION PRINCIPLE

Animate the smallest meaningful surface.

Bad:

```text
Entire dashboard flies in every time.
```

Good:

```text
Dropdown fades/slides in.
Row appears smoothly.
Modal scales slightly.
Button transitions state.
```

Do not animate everything.

---

# 26 — PAGE TRANSITIONS

Avoid theatrical page transitions.

Preferred:

```text
opacity
small translate
small scale
```

Example conceptual behavior:

```text
opacity: 0 → 1
y: 4px → 0
duration: 180ms
```

---

# 27 — LOADING STATES

Never leave blank space while waiting for data.

Use:

- skeletons
- progress indicators
- optimistic updates where safe
- disabled/loading buttons

Skeletons should resemble the final layout.

---

# 28 — EMPTY STATES

Empty states should explain:

1. What is empty?
2. Why does it matter?
3. What should the user do?

Example:

```text
No nominees yet

Add nominees to begin configuring your voting categories.

[ Add nominee ]
```

Never use:

```text
No data.
```

alone.

---

# 29 — ERROR STATES

Errors must be useful.

Bad:

```text
Something went wrong.
```

Better:

```text
We couldn't publish this event.

Check that your event has:
• at least one category
• at least one nominee
• a valid voting period

[ Review event ]
```

Errors should help users recover.

---

# 30 — FORMS

Forms must be simple and progressive.

Use:

```text
Label
Input
Helper text
Error
```

Never rely solely on placeholder text.

Example:

```text
Event name
Ghana Students Mentorship Summit & Awards

The name shown publicly on your event page.
```

---

# 31 — FORM VALIDATION

Validate:

- client-side for immediate feedback
- server-side for security

Never trust client-side validation.

Validation messages should explain the problem.

Bad:

```text
Invalid input.
```

Good:

```text
Event name must be at least 3 characters.
```

---

# 32 — ONBOARDING

Onboarding should be progressive.

Do NOT ask 30 questions on one screen.

Preferred:

```text
Step 1
Create your organization

Step 2
Create your event

Step 3
Configure voting

Step 4
Configure tickets

Step 5
Review & publish
```

Always show progress.

---

# 33 — EVENT CREATION

Event creation should feel like a guided workflow.

```text
Basic Information
       ↓
Branding
       ↓
Voting
       ↓
Categories
       ↓
Nominees
       ↓
Tickets
       ↓
Review
       ↓
Publish
```

Users should always know:

- where they are
- what is completed
- what remains
- what blocks publishing

---

# 34 — PUBLIC EVENT EXPERIENCE

The public event page is different from the host dashboard.

It should feel:

- branded
- elegant
- simple
- trustworthy
- conversion focused

The event's branding can be expressive.

The host dashboard should remain restrained.

---

# 35 — PUBLIC VOTING EXPERIENCE

The voter should understand the flow immediately.

```text
Event
 ↓
Category
 ↓
Nominee
 ↓
Vote
 ↓
Payment
 ↓
Confirmation
```

Minimize friction.

Never force unnecessary account creation unless the business/security model requires it.

---

# 36 — PUBLIC TICKETING EXPERIENCE

Ticket purchasing should feel like checkout, not administration.

```text
Event
 ↓
Choose ticket
 ↓
Quantity
 ↓
Attendee details
 ↓
Payment
 ↓
Ticket
```

Make:

- price
- quantity
- total
- payment state

obvious.

---

# 37 — QR TICKETS

Ticket QR codes should be visually prominent but not oversized.

Ticket UI should show:

```text
Event
Ticket Type
Attendee
Ticket ID
Date
Venue
QR Code
Status
```

Verification should be fast.

---

# 38 — MODALS

Use modals only for focused actions.

Good:

- Delete confirmation
- Quick create
- Edit small record
- Confirmation

Bad:

- Entire multi-step workflows
- Large forms
- Important information users need to reference

Use full pages for complex workflows.

---

# 39 — DRAWERS

Drawers are useful for:

- quick editing
- record details
- transaction details
- nominee previews

Use them when the user needs contextual information without leaving the current page.

---

# 40 — COMMAND PALETTE

The SaaS should eventually support a Linear-style command palette.

Possible commands:

```text
Search
Create event
Add nominee
Create ticket
Open analytics
Open settings
Switch organization
Switch event
```

Keyboard shortcut:

```text
⌘K
Ctrl+K
```

The command palette must be searchable and keyboard navigable.

---

# 41 — RESPONSIVENESS

The system must work on:

```text
Mobile
Tablet
Laptop
Desktop
Large desktop
```

Do not simply shrink desktop layouts.

Recompose them.

For example:

Desktop:

```text
Sidebar + table + filters
```

Mobile:

```text
Header
Filters
Cards / condensed rows
Actions
```

---

# 42 — ACCESSIBILITY

Accessibility is not optional.

Required:

- keyboard navigation
- visible focus states
- semantic HTML
- proper labels
- ARIA only when needed
- sufficient contrast
- reduced motion support
- accessible dialogs
- accessible dropdowns
- accessible tables
- screen-reader-friendly status updates

Respect:

```text
prefers-reduced-motion
```

---

# 43 — RESPONSIVE TABLE RULE

Never allow important data to become unreadable.

Use:

- horizontal scrolling
- responsive columns
- priority columns
- mobile card transformation where appropriate

Do not blindly force every column into a mobile viewport.

---

# 44 — REUSABLE COMPONENT ARCHITECTURE

**Never build the same component twice.**

Before creating a new component:

1. Search existing components.
2. Determine whether the existing component can support the new use case.
3. Extend it if appropriate.
4. Only create a new component when the behavior is genuinely different.

---

# 45 — COMPONENT HIERARCHY

Use:

```text
Primitive
   ↓
Base Component
   ↓
Composite Component
   ↓
Feature Component
   ↓
Page
```

Example:

```text
Button
 ↓
ActionButton
 ↓
CreateEventButton
 ↓
EventPage
```

Do not put business logic into primitive UI components.

---

# 46 — SHARED COMPONENTS

Create a shared design system.

Example:

```text
components/
├── ui/
│   ├── button
│   ├── input
│   ├── textarea
│   ├── select
│   ├── dialog
│   ├── drawer
│   ├── dropdown
│   ├── tooltip
│   ├── tabs
│   ├── badge
│   ├── avatar
│   ├── table
│   ├── pagination
│   ├── skeleton
│   └── toast
│
├── layout/
│   ├── sidebar
│   ├── topbar
│   ├── page-header
│   ├── container
│   └── section
│
├── data-display/
│   ├── stat
│   ├── chart
│   ├── empty-state
│   ├── error-state
│   └── activity
│
└── domain/
    ├── event-card
    ├── nominee-card
    ├── ticket-card
    ├── vote-summary
    └── transaction-row
```

---

# 47 — COMPONENT API DESIGN

Components should be configurable.

Bad:

```tsx
<NastyCustomButton />
```

Better:

```tsx
<Button
  variant="primary"
  size="md"
  loading={isLoading}
>
  Create Event
</Button>
```

Use predictable APIs.

---

# 48 — NO PROP EXPLOSIONS

Do not create components with 30 unrelated props.

If a component becomes too complex:

```text
split it
```

or use composition.

Prefer:

```tsx
<Card>
  <CardHeader />
  <CardContent />
  <CardFooter />
</Card>
```

over:

```tsx
<Card
  title=""
  description=""
  footer=""
  showIcon
  icon=""
  ...
/>
```

---

# 49 — DESIGN TOKENS

Centralize:

```text
colors
spacing
radius
typography
animation
breakpoints
z-index
```

The UI should be changeable globally.

One token change should update the entire product.

---

# 50 — DOMAIN COMPONENTS

Domain components should contain business-specific presentation.

Examples:

```text
EventStatusBadge
VoteCount
RevenueMetric
NomineeRow
TicketStatus
PaymentStatus
EventProgress
```

These should be reusable across pages.

---

# 51 — BUSINESS LOGIC SEPARATION

Do not place API calls directly inside reusable UI primitives.

Bad:

```tsx
<Button onClick={() => fetch("/api/events")}>
```

The Button should know nothing about events.

Instead:

```text
UI
 ↓
Hook
 ↓
Service
 ↓
API
```

Example:

```text
useCreateEvent()
      ↓
eventService.create()
      ↓
POST /events
```

---

# 52 — HOOKS

Reusable behavior belongs in hooks.

Examples:

```text
useEvent()
useEvents()
useCreateEvent()
useUpdateEvent()
useDeleteEvent()

useNominees()
useCreateNominee()

useTickets()
useTicketSales()

useVotes()
useVotingAnalytics()

useDebounce()
useMediaQuery()
useCommandPalette()
```

---

# 53 — SERVICE LAYER

API communication should be centralized.

Example:

```text
services/
├── auth.service.ts
├── event.service.ts
├── nominee.service.ts
├── voting.service.ts
├── ticket.service.ts
├── payment.service.ts
├── analytics.service.ts
└── organization.service.ts
```

Pages should not contain raw API implementation.

---

# 54 — STATE MANAGEMENT

Use local state when possible.

Use global state only when state genuinely needs to be shared.

Good candidates:

```text
authentication
organization
current event
UI preferences
command palette
```

Do not put every form field into global state.

---

# 55 — URL STATE

Use URL state for things users should be able to:

- bookmark
- share
- refresh without losing
- navigate backward/forward

Examples:

```text
?page=2
?search=john
?status=active
?category=best-student
```

---

# 56 — SEARCH

Search should feel instantaneous.

Use:

- debouncing
- server-side search for large datasets
- clear empty state
- keyboard navigation where appropriate

Do not make users click "Search" for simple global searches unless there is a good reason.

---

# 57 — FILTERS

Filters should be composable.

Example:

```text
Search
Status
Category
Date
Payment Status
```

Filters should be visible enough to understand current state.

Provide:

```text
Clear filters
```

when filters are active.

---

# 58 — NOTIFICATIONS

Use notifications for meaningful system feedback.

Good:

```text
Event published
Nominee added
Payment received
Ticket generated
```

Bad:

```text
You clicked a button.
```

Do not spam users with toasts.

---

# 59 — CONFIRMATION ACTIONS

Destructive actions require confirmation.

Example:

```text
Delete nominee?

This action cannot be undone.

[Cancel] [Delete nominee]
```

For especially dangerous actions, require explicit typing or additional confirmation.

---

# 60 — EVENT STATUS

Use a consistent status vocabulary:

```text
Draft
Scheduled
Live
Paused
Closed
Archived
```

Do not invent alternate labels on different screens.

---

# 61 — PAYMENT STATUS

Use:

```text
Pending
Successful
Failed
Refunded
Cancelled
```

Keep terminology consistent across:

- votes
- tickets
- transactions
- dashboard
- exports

---

# 62 — VISUAL HIERARCHY

Every screen should have:

```text
1. Primary purpose
2. Primary action
3. Important information
4. Secondary information
5. Tertiary controls
```

If everything looks important, nothing is important.

---

# 63 — INFORMATION ARCHITECTURE

Prefer fewer, stronger screens.

Avoid creating:

```text
Event Overview
Event Summary
Event Dashboard
Event Details
Event Information
```

if they all show essentially the same information.

Merge related concepts.

---

# 64 — NAVIGATION PRINCIPLE

Navigation should answer:

> Where am I?

> What can I do here?

> Where can I go next?

Use breadcrumbs where hierarchy becomes deep.

---

# 65 — PUBLIC VS HOST UI

### Host UI

```text
Functional
Dense
Precise
Operational
Data-focused
```

### Public UI

```text
Branded
Emotional
Simple
Conversion-focused
Visual
```

Never make the public voting page look like an admin dashboard.

---

# 66 — BRAND CUSTOMIZATION

Hosts may customize:

- logo
- event image
- primary brand color
- event title
- description
- typography where supported
- public page appearance

But customization must remain within safe design constraints.

Do not allow hosts to destroy usability with arbitrary styling.

---

# 67 — ANIMATION + ACCESSIBILITY

When:

```css
prefers-reduced-motion: reduce
```

reduce or disable non-essential animation.

Motion must never interfere with:

- reading
- clicking
- navigation
- form completion

---

# 68 — PERFORMANCE

UI quality includes performance.

Avoid:

- massive client components
- unnecessary re-renders
- giant JavaScript bundles
- loading every chart library globally
- unnecessary animation libraries per component
- unoptimized images

Use:

- Server Components where appropriate
- dynamic imports
- optimized images
- memoization only where useful
- virtualization for large datasets

---

# 69 — IMAGE RULES

Event and nominee images must:

- use proper aspect ratios
- be optimized
- have alt text
- avoid layout shift
- use appropriate object-fit

Prefer:

```text
object-cover
```

for visual cards.

---

# 70 — DESIGN CONSISTENCY TEST

Before shipping a page, ask:

### Typography

- Is the hierarchy obvious?
- Are weights consistent?

### Spacing

- Does the page follow the spacing system?
- Are there random gaps?

### Components

- Could an existing component have been reused?

### Color

- Are colors semantic?
- Is contrast sufficient?

### Motion

- Does animation improve understanding?

### UX

- Is the primary action obvious?

### Responsiveness

- Does the layout actually recompose on mobile?

---

# 71 — ANTI-PATTERNS

Never ship UI containing:

```text
❌ Random gradients
❌ Drop-shadow everywhere
❌ Excessive rounded cards
❌ Giant hero sections inside dashboards
❌ Emoji as primary UI icons
❌ Inconsistent icon libraries
❌ Random font sizes
❌ Random colors
❌ 10 different button styles
❌ Nested cards everywhere
❌ Unnecessary modals
❌ Decorative charts
❌ Fake statistics
❌ Dead buttons
❌ Placeholder functionality presented as complete
❌ "Coming soon" where functionality is expected
❌ Unexplained empty pages
```

---

# 72 — THE "LINEAR TEST"

Before approving any dashboard screen:

> Would this look out of place inside Linear?

If yes, simplify it.

Ask:

- Is there unnecessary decoration?
- Is there excessive whitespace?
- Are there too many colors?
- Are there too many cards?
- Are actions obvious?
- Is the information dense enough?

---

# 73 — THE "GOOGLE TEST"

Ask:

> Can a first-time user understand this screen without being trained?

If not:

- simplify
- rename
- restructure
- improve hierarchy

---

# 74 — THE "APPLE TEST"

Ask:

> Can I remove 20% of this UI without losing functionality?

If yes:

**remove it.**

---

# 75 — THE "REUSE TEST"

Before creating anything:

```text
Does this already exist?
        ↓
Can it be generalized?
        ↓
Can it be composed?
        ↓
Can it be reused elsewhere?
```

Build the component once.

---

# 76 — REQUIRED UI SYSTEM

The project should establish these foundational components before feature development accelerates:

```text
Button
IconButton
Input
Textarea
Select
Combobox
Checkbox
Radio
Switch
Slider

Dialog
Drawer
Popover
Dropdown
Tooltip

Tabs
Accordion
Breadcrumb
Pagination

Table
DataTable
ColumnHeader
TableToolbar

Card
Section
PageHeader
EmptyState
ErrorState
Skeleton

Badge
StatusBadge
Avatar
AvatarGroup

Toast
Alert
Banner

Stat
Metric
ChartContainer

Sidebar
Topbar
CommandPalette

Form
FormField
FormError
FormDescription

DatePicker
DateRangePicker

FileUpload
ImageUpload

ConfirmDialog
LoadingButton
```

---

# 77 — DOMAIN UI SYSTEM

Build reusable domain components:

```text
EventCard
EventStatus
EventSelector

CategoryCard
CategoryRow

NomineeCard
NomineeRow
NomineeAvatar

VoteCount
VoteSummary
VoteActivity

TicketCard
TicketTypeRow
TicketStatus
TicketQRCode

TransactionRow
TransactionStatus

RevenueMetric
AttendanceMetric
VotingMetric

EventProgress
PublishChecklist
```

---

# 78 — FOLDER PRINCIPLE

Recommended frontend structure:

```text
src/
├── app/
│
├── components/
│   ├── ui/
│   ├── layout/
│   ├── data-display/
│   └── domain/
│
├── features/
│   ├── auth/
│   ├── organizations/
│   ├── events/
│   ├── voting/
│   ├── nominees/
│   ├── tickets/
│   ├── payments/
│   ├── analytics/
│   └── onboarding/
│
├── hooks/
├── services/
├── lib/
├── types/
├── validators/
└── config/
```

Feature-specific logic stays inside its feature.

Shared logic stays shared.

---

# 79 — FEATURE STRUCTURE

Example:

```text
features/events/

├── components/
├── hooks/
├── services/
├── validators/
├── types/
└── utils/
```

Do not create a massive:

```text
utils/
```

folder containing unrelated business logic.

---

# 80 — FINAL DESIGN PRINCIPLE

The interface should never scream:

> "Look how much design we added."

It should quietly communicate:

> **"This product is exceptionally well made."**

Every component must earn its place.

Every animation must have purpose.

Every color must have meaning.

Every spacing decision must establish hierarchy.

Every interaction must feel predictable.

Every page must feel like part of the same product.

**Build less. Reuse more. Remove noise. Protect hierarchy. Make every interaction intentional.**

---

# NON-NEGOTIABLE SUMMARY

```text
NEXT.JS
TYPESCRIPT
TAILWIND CSS
MOTION
SF PRO / SYSTEM FONT
LIGHT + DARK MODE

NO SHADOWS
CONTROLLED GLASS
CONTROLLED BLUR
CONTROLLED GRADIENTS

LINEAR-INSPIRED DENSITY
GOOGLE-INSPIRED CLARITY
APPLE-INSPIRED POLISH

SHARED COMPONENTS
REUSABLE HOOKS
REUSABLE SERVICES
SEMANTIC DESIGN TOKENS
ACCESSIBILITY
RESPONSIVE DESIGN
PERFORMANCE

NO DUPLICATED COMPONENTS
NO RANDOM STYLING
NO DECORATIVE UI
NO DEAD INTERACTIONS
NO VISUAL NOISE
```

**The goal is not to make the UI beautiful.**

**The goal is to make the product feel inevitable — as if every element is exactly where it should be.**