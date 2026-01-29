# RoadPulse UX Requirements

**Purpose:** Translate user personas into concrete, testable UX requirements for product-grade implementation.

**Source:** Derived from `docs/personas.md` (8 personas)  
**Status:** Active - drives current desktop polish sprint

---

## 1. Information Architecture

### 1.1 App Shell Layout Rules

**Hierarchy (Top to Bottom):**
```
┌─────────────────────────────────────────┐
│ HEADER (fixed)                          │ --app-header-h
│ - Brand, State Selector, Actions        │
├─────────────────────────────────────────┤
│ FILTER BAR (sticky optional)            │ --app-filters-h
│ - Filters, Search, Active Chips         │
├─────────────────────────────────────────┤
│ MAIN CONTENT (remaining height)         │ calc(100dvh - header - filters)
│ ┌─────────────┬─────────────────────┐   │
│ │ MAP PANEL   │ REPORTS LIST        │   │
│ │ (no scroll) │ (internal scroll)   │   │
│ └─────────────┴─────────────────────┘   │
└─────────────────────────────────────────┘
```

**Requirements:**
- ✅ **No full-page scroll** - Body `overflow: hidden`
- ✅ **Fixed header** - Always visible, `position: sticky` or fixed
- ✅ **Measured heights** - Use CSS custom properties for dynamic calculation
- ✅ **Internal scroll only** - Reports list, map details card
- ✅ **Modal layers** - z-index hierarchy: modals (5000), sheets (4000), header (1000)

**Persona Coverage:**
- **P3 (Dashboard User):** Demands professional app shell, no page scroll
- **P2 (Navigator):** Needs map stability, no layout shifts
- **P1 (Reporter):** Modal should overlay cleanly

---

### 1.2 Responsive Breakpoints

| Breakpoint | Width | Layout Mode | Panels Visible |
|------------|-------|-------------|----------------|
| Mobile | < 768px | Stacked tabs | Map OR List (segmented control) |
| Tablet | 768-1024px | Transition | Stacked or split depending on orientation |
| Desktop | > 1024px | Split view | Map (8/12) + List (4/12) side-by-side |
| Wide | > 1536px | Split view | Full width, increased padding |

**Requirements:**
- ✅ **Mobile tabs preserved** - Segmented control Map|Reports
- ✅ **Desktop split maintained** - 2-column layout
- 🔨 **Wide layout optimization** - Use max-w-screen-2xl instead of max-w-7xl
- ✅ **Touch targets** - Min 44px on mobile (already implemented)

---

### 1.3 Component Hierarchy

**Header Components (Priority Order):**
1. Brand/Logo (left) - Always visible
2. State Selector (left) - Primary navigation
3. Locate Button (right cluster) - Quick action
4. Safety Button (right cluster) - Critical feature
5. Report Button (right cluster) - Primary CTA

**Filter Bar Components:**
1. Quick Filters (left) - Type, Severity
2. Search (center) - Text query
3. Advanced (right) - Recency, Radius, Sort
4. Active Chips (bottom row) - Clear visibility
5. Collapse Toggle (far right) - Desktop only

**Map Panel:**
1. Panel Header - Title, count, actions
2. Map Container - Full remaining height
3. Report Details Card - Overlay on map
4. Empty State Overlay - When no reports

**Reports List Panel:**
1. Panel Header - Title, count, sort
2. List Container - Internal scroll
3. Report Cards - Clickable items
4. Empty State - When no reports

---

## 2. Desktop UX Requirements (Persona 3 Driven)

### 2.1 Viewport Usage

**Current Problem:**
- `max-w-7xl` (1280px) leaves huge whitespace on 1920px+ monitors
- Desktop feels cramped, not utilizing screen real estate
- Panels too narrow for comfortable reading

**Requirements:**
- 🔨 **Wide container** - Use `max-w-screen-2xl` (1536px) or `max-w-[1600px]`
- 🔨 **Responsive padding** - `px-4 lg:px-6 2xl:px-8` for breathing room
- 🔨 **Panel width ratio** - Desktop maintains 8/12 + 4/12 but spans more pixels
- ✅ **No arbitrary constraints** - Let content breathe

**Acceptance Criteria:**
- [ ] On 1920px screen, content uses ~1600px width (not 1280px)
- [ ] Map panel feels spacious, not cramped
- [ ] Filter bar spans full width with good spacing
- [ ] No awkward whitespace gaps

---

### 2.2 Height Management

**Current Problem:**
- Inconsistent height behavior (almost-full-height vs full)
- Page scroll on desktop (should be app scroll only)
- Map container doesn't know its exact height

**Requirements:**
- 🔨 **CSS Variables** - `--app-header-h`, `--app-filters-h` set dynamically
- 🔨 **Calculated heights** - Main content = `calc(100dvh - var(--app-header-h) - var(--app-filters-h))`
- 🔨 **Overflow control** - Body: `overflow-hidden`, panels: `overflow-auto` as needed
- ✅ **Map stability** - Fixed height prevents re-render (already improved)

**Acceptance Criteria:**
- [ ] No full-page scroll bar visible
- [ ] Map height stable across state changes
- [ ] Reports list scrolls internally only
- [ ] Header + filters always visible (no scroll-away)

---

### 2.3 Visual Density

**Current Problem:**
- Too much vertical padding in some areas (filters too tall)
- Not enough density for dashboard users (P3)
- Inconsistent spacing tokens

**Requirements:**
- 🔨 **Compact filter bar** - Reduce vertical padding on desktop
- 🔨 **Denser list items** - More reports visible without scroll
- 🔨 **Consistent spacing** - Use 4/8/12/16/24px rhythm
- ✅ **Readable typography** - Don't sacrifice legibility for density

**Spacing System:**
```css
--spacing-xs: 4px;   /* tight, chips, badges */
--spacing-sm: 8px;   /* controls padding */
--spacing-md: 12px;  /* card padding */
--spacing-lg: 16px;  /* section padding */
--spacing-xl: 24px;  /* panel padding */
--spacing-2xl: 32px; /* major sections */
```

---

## 3. Filter Bar Requirements

### 3.1 Visual Grouping (Persona 3)

**Current Problem:**
- Filters scattered, no clear grouping
- Looks amateur, not intentional
- Hard to scan quickly

**Requirements:**
- 🔨 **Logical groups** - Type/Severity | Search | Recency/Radius/Sort
- 🔨 **Visual separation** - Subtle dividers or spacing between groups
- 🔨 **Label clarity** - Small labels above groups on desktop
- 🔨 **Responsive collapse** - Stack on mobile, row on desktop

---

### 3.2 Active Filters Chips (Persona 2, 3)

**Current Problem:**
- Can't see active filters at a glance
- No quick way to clear individual filters
- Have to re-open controls to remove

**Requirements:**
- 🔨 **Chips row** - Show active filters as removable chips
- 🔨 **Clear all button** - When 2+ filters active
- 🔨 **Visual priority** - Chips visible before main controls
- 🔨 **Inline removal** - Click X on chip to remove filter

**Example:**
```
Active: [Pothole ×] [Critical ×] [Last 24h ×] [Clear all]
```

---

### 3.3 Collapse Functionality (Persona 3)

**Current Problem:**
- Filter bar always expanded, takes vertical space
- Dashboard users want more map/list space

**Requirements:**
- 🔨 **Toggle collapse** - Chevron icon, desktop only
- 🔨 **Persist state** - localStorage `filterBarCollapsed`
- 🔨 **Show chips when collapsed** - Active filters still visible
- 🔨 **Smooth animation** - Height transition 200ms

**Behavior:**
- Expanded: Full filter controls visible
- Collapsed: Only chips row + toggle button
- Mobile: Always expanded (no collapse)

---

### 3.4 Disabled States (Persona 2)

**Current Problem:**
- Radius filter disabled when no location, but not clear why
- Nearest sort disabled, no explanation

**Requirements:**
- ✅ **Visual disabled state** - Opacity 50%, cursor not-allowed (already exists)
- 🔨 **Tooltip explanation** - "Enable location to use this filter"
- ✅ **Graceful degradation** - Other filters still usable

---

## 4. Trust & Credibility Requirements

### 4.1 Verification Display (Persona 4)

**Current Problem:**
- Verification counts not visible
- No trust indicators on reports

**Requirements:**
- ✅ **Verification buttons** - "Resolved" / "Still there" (implemented)
- 🔨 **Count display** - "3 users confirmed" badge
- 🔨 **Recency indicator** - "Verified 1h ago"
- 🔨 **Visual badge** - Checkmark icon for high-verification reports

---

### 4.2 Recency Display (Persona 2)

**Current Problem:**
- Timestamps not prominent enough
- Hard to tell if report is stale

**Requirements:**
- ✅ **Relative time** - "2h ago", "Just now" (already implemented)
- 🔨 **Expiry warning** - Yellow badge "Expires in 30m"
- 🔨 **Stale indicator** - Gray out reports > 7 days
- ✅ **Last updated** - On report details card

---

### 4.3 Severity Communication (Persona 2)

**Current Problem:**
- Severity colors not clearly explained
- No legend on map

**Requirements:**
- 🔨 **Color legend** - Red (Critical), Orange (High), Yellow (Medium), Blue (Low)
- 🔨 **Map legend** - Small tooltip or panel corner
- ✅ **Consistent colors** - Markers, badges, text all match
- ✅ **Accessible** - Not color-only (icons too)

---

## 5. Safety Feature Requirements (Persona 6)

### 5.1 Privacy Clarity

**Current Problem:**
- Users unsure who can see trip
- Expiry not prominent

**Requirements:**
- ✅ **Privacy banner** - "Only people with this link can view" (implemented)
- ✅ **Expiry display** - "Expires in 1h 23m" countdown (implemented)
- ✅ **Status indicator** - Green dot "Active" / Red "Ended"
- 🔨 **Mobile optimization** - All controls accessible on small screens

---

### 5.2 Emergency Access (Persona 6)

**Current Problem:**
- SOS might be accidentally triggered
- Not clear enough in panic situation

**Requirements:**
- ✅ **Long-press activation** - Prevents accidents (implemented)
- ✅ **Confirmation dialog** - "Are you sure?" before sending
- 🔨 **Visual priority** - Red, prominent, but safe
- 🔨 **One-tap alternative** - Panic button option in settings

---

## 6. Empty States Requirements

### 6.1 Map Empty State (Persona 1, 2)

**Current Problem:**
- Empty map is just blank, confusing
- No guidance on what to do

**Requirements:**
- 🔨 **Overlay card** - Centered on map when no reports
- 🔨 **Clear message** - "No reports yet in {State}"
- 🔨 **Primary CTA** - "Report an Issue" button
- 🔨 **Secondary action** - "Try another state" or "Enable location"

**Design:**
```
┌─────────────────────────────┐
│ Empty Map                   │
│                             │
│   ┌───────────────────┐     │
│   │ 📍 No reports     │     │
│   │ in Lagos yet      │     │
│   │                   │     │
│   │ [Report Issue]    │     │
│   │ or try filters    │     │
│   └───────────────────┘     │
└─────────────────────────────┘
```

---

### 6.2 List Empty State (Persona 2, 3)

**Current Problem:**
- Empty list message not actionable enough
- Doesn't guide user to next step

**Requirements:**
- ✅ **Contextual message** - Varies by filter state (already good)
- ✅ **Clear filters CTA** - When filters cause empty (already implemented)
- 🔨 **Consistent styling** - Match map empty state design
- 🔨 **Icon + message** - Visual interest, not just text

---

### 6.3 Comments Empty State (Persona 5)

**Current Problem:**
- "No comments yet" is plain text
- Not inviting to add first comment

**Requirements:**
- ✅ **Inviting message** - "Be the first to comment!" (implemented)
- 🔨 **Icon** - 💬 emoji or MessageCircle icon
- ✅ **Form visible** - Comment textarea always shown when auth'd
- ✅ **Simple interaction** - One click to add comment

---

## 7. Accessibility Requirements

### 7.1 Keyboard Navigation

**Requirements:**
- ✅ **Tab order logical** - Header → Filters → Map/List → Modals
- ✅ **Focus indicators** - Visible outline on all interactive elements
- ✅ **Escape key** - Closes modals, details cards
- 🔨 **Keyboard shortcuts** - Cmd/Ctrl+K for search, / for filters

**Priority Actions:**
- Tab to Report button → Enter to open modal
- Tab through filter controls → Arrow keys for selects
- Enter on report card → Opens details
- Escape closes any overlay

---

### 7.2 ARIA Labels

**Current Status:**
- ✅ Most buttons have aria-label (Navigate, Resolved, etc.)
- ✅ Comment textarea has label
- 🔨 Missing on some icons-only buttons

**Requirements:**
- 🔨 **All icon buttons** - aria-label descriptive
- 🔨 **Live regions** - Toast notifications announced
- 🔨 **Role attributes** - dialog, alertdialog, navigation
- ✅ **Form labels** - All inputs properly labeled

---

### 7.3 Color Contrast

**Requirements:**
- ✅ **WCAG AA minimum** - 4.5:1 for text, 3:1 for UI
- ✅ **Check combinations** - Slate text on white bg = good
- ✅ **Error states** - Red text on white meets contrast
- 🔨 **Verify severity colors** - Ensure readable on map

**Tool:** Use WebAIM Contrast Checker during implementation

---

## 8. Performance Requirements

### 8.1 Map Performance (Persona 2, 3)

**Requirements:**
- ✅ **Clustering** - > 50 markers trigger clustering (implemented)
- ✅ **Lazy load tiles** - Only visible map area (Leaflet default)
- ✅ **invalidateSize** - On resize, but debounced (implemented)
- 🔨 **Marker optimization** - Virtualize if > 500 markers

**Metrics:**
- Map initial render < 2 seconds
- Marker clustering < 300ms
- Zoom/pan smooth (60fps)

---

### 8.2 List Performance (Persona 3)

**Requirements:**
- 🔨 **Virtual scrolling** - If > 100 reports (optional, monitor first)
- ✅ **Limit query** - Max 200 reports per state (implemented)
- ✅ **Optimize images** - Lazy load thumbnails
- ✅ **Memoization** - Prevent unnecessary re-renders

**Metrics:**
- List render < 500ms for 50 reports
- Scroll performance smooth
- Filter change < 200ms

---

### 8.3 Loading States (All Personas)

**Requirements:**
- ✅ **Skeleton screens** - Map, list, cards (implemented)
- ✅ **Inline loaders** - Buttons show "Loading..." (implemented)
- ✅ **Optimistic updates** - Votes, comments update immediately
- ✅ **Error boundaries** - Graceful failure, retry options

---

## 9. Visual System Requirements

### 9.1 Color Palette

**Primary:**
- Blue: `#3B82F6` (blue-600) - Primary actions, links
- Slate: `#1E293B` (slate-900) - Primary text
- White: `#FFFFFF` - Panel backgrounds

**Status:**
- Green: `#10B981` (emerald-600) - Success, resolved
- Red: `#EF4444` (red-600) - Critical, error, SOS
- Orange: `#F97316` (orange-600) - High severity, warning
- Yellow: `#FBBF24` (amber-400) - Medium severity, caution

**Neutrals:**
- `slate-50` - App background
- `slate-100` - Hover states
- `slate-200` - Borders, dividers
- `slate-500` - Secondary text
- `slate-600` - Tertiary text

---

### 9.2 Typography Scale

**Headings:**
- Page Title: `text-2xl font-bold` (24px)
- Panel Title: `text-lg font-semibold` (18px)
- Section Title: `text-base font-semibold` (16px)
- Card Title: `text-sm font-semibold tracking-tight` (14px)

**Body:**
- Large: `text-base` (16px) - Primary content
- Medium: `text-sm` (14px) - Default, lists
- Small: `text-xs` (12px) - Meta, timestamps, labels

**Tracking:**
- Tight: `tracking-tight` - Headings
- Normal: default - Body text
- Wide: `tracking-wide` - Labels, all-caps

---

### 9.3 Border & Radius

**Radius System:**
- Small: `rounded-lg` (8px) - Buttons, chips
- Medium: `rounded-xl` (12px) - Inputs, small cards
- Large: `rounded-2xl` (16px) - Panels, modals
- Full: `rounded-full` - Avatars, icon buttons

**Borders:**
- Default: `border border-slate-200` (1px solid)
- Focus: `ring-2 ring-blue-500/20` (2px offset)
- Dividers: `border-t border-slate-200`

---

### 9.4 Shadows

**Elevation:**
- None: `shadow-none` - Flat elements
- Subtle: `shadow-sm` - Cards, panels (default)
- Medium: `shadow-md` - Elevated cards, dropdowns
- Large: `shadow-lg` - Modals, important overlays
- XL: `shadow-xl` - Overlays with backdrop

**Usage:**
- Panels: `shadow-sm`
- Modals: `shadow-xl`
- Buttons: No shadow (flat design)
- Hover: No shadow change (avoid flicker)

---

## 10. Component-Specific Requirements

### 10.1 Panel Headers

**Unified Design:**
```tsx
<div className="px-4 py-3 border-b border-slate-200 bg-white">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <Icon className="w-5 h-5 text-blue-600" />
      <h2 className="text-lg font-semibold text-slate-900">Title</h2>
    </div>
    <span className="text-sm text-slate-500">Count or Meta</span>
  </div>
</div>
```

**Requirements:**
- ✅ Same padding: `px-4 py-3`
- ✅ Same border: `border-b border-slate-200`
- ✅ Same typography: `text-lg font-semibold`
- ✅ Icon + title pattern consistent

---

### 10.2 Action Buttons

**Primary Button:**
```tsx
<button className="px-4 py-2.5 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-colors font-medium">
  Action
</button>
```

**Secondary Button:**
```tsx
<button className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-2xl hover:bg-slate-200 transition-colors font-medium">
  Action
</button>
```

**Requirements:**
- ✅ Consistent padding: `px-4 py-2.5`
- ✅ Rounded: `rounded-2xl`
- ✅ Font: `font-medium`
- ✅ Hover states defined
- ✅ Transition: `transition-colors`

---

### 10.3 Form Inputs

**Text Input:**
```tsx
<input className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
```

**Select:**
```tsx
<select className="px-3 py-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20">
```

**Requirements:**
- ✅ Padding: `px-3 py-2`
- ✅ Border: `border-slate-200`
- ✅ Rounded: `rounded-xl`
- ✅ Focus ring: `ring-2 ring-blue-500/20`

---

## 11. Acceptance Criteria Summary

### Must Pass (Blocking Release)

**Layout:**
- [ ] No full-page scroll on desktop
- [ ] App fills viewport (100dvh)
- [ ] Internal scroll only (reports list)
- [ ] Map height stable, no resize glitches

**Width:**
- [ ] Desktop uses max-w-screen-2xl or wider
- [ ] No awkward whitespace on 1920px screens
- [ ] Filter bar spans full width properly

**Visual Hierarchy:**
- [ ] Panel headers consistent (padding, border, typography)
- [ ] Button styles unified (primary, secondary, danger)
- [ ] Spacing rhythm consistent (4/8/12/16/24px)

**Functionality:**
- [ ] Mobile tabs still work (Map|Reports)
- [ ] Desktop split view preserved
- [ ] All interactive elements keyboard accessible
- [ ] ARIA labels on icon buttons

### Should Pass (Polish)

**Filter Bar:**
- [ ] Active filters shown as chips
- [ ] Clear all button when 2+ filters
- [ ] Collapse functionality (desktop)
- [ ] Visual grouping clear

**Empty States:**
- [ ] Map empty state with CTA
- [ ] List empty state contextual
- [ ] Consistent styling across states

**Trust Indicators:**
- [ ] Verification count visible
- [ ] Recency indicators clear
- [ ] Severity legend on map

### Nice to Have (Post-MVP)

- [ ] Keyboard shortcuts (Cmd+K, /)
- [ ] Virtual scrolling for long lists
- [ ] Map marker clustering optimization
- [ ] Animated transitions

---

## 12. Testing Checklist

### Desktop (> 1024px)

**Layout:**
- [ ] Open app on 1920px monitor → No awkward whitespace
- [ ] Resize window → Map invalidates size correctly
- [ ] Scroll page → No page scroll, list scrolls only
- [ ] Open modal → Backdrop covers properly

**Filter Bar:**
- [ ] Apply filter → Chip appears in active filters row
- [ ] Click chip X → Filter removed
- [ ] Apply 3 filters → "Clear all" button appears
- [ ] Click collapse toggle → Filter bar collapses smoothly

**Visual:**
- [ ] Panel headers match (Map + Reports)
- [ ] Button styles consistent across app
- [ ] Spacing feels intentional, not random
- [ ] Focus states visible on Tab navigation

### Mobile (< 768px)

**Layout:**
- [ ] Segmented control visible (Map|Reports tabs)
- [ ] Switch tabs → Correct panel shows
- [ ] Select report from list → Auto-switches to Map tab
- [ ] Open modal → Takes full screen

**Touch:**
- [ ] All buttons at least 44px tall
- [ ] Tap targets not too close together
- [ ] Swipe gestures don't conflict

### Cross-Browser

- [ ] Chrome/Edge - Tested
- [ ] Safari - Tested (webkit quirks)
- [ ] Firefox - Tested
- [ ] Mobile Safari - Tested
- [ ] Mobile Chrome - Tested

---

## 13. Implementation Order

### Phase 1: Foundation (Current Sprint)
1. ✅ Create personas.md
2. ✅ Create ux-requirements.md (this doc)
3. 🔨 Implement AppShell component
4. 🔨 Widen desktop container (max-w-screen-2xl)
5. 🔨 Unify panel headers

### Phase 2: Filter Bar
6. 🔨 Add active filter chips
7. 🔨 Add collapse functionality
8. 🔨 Improve visual grouping

### Phase 3: Polish
9. 🔨 Add map empty state
10. 🔨 Add map legend (severity colors)
11. 🔨 Verification count display
12. 🔨 Final spacing/typography audit

### Phase 4: Validation
13. 🔨 Manual testing checklist
14. 🔨 Accessibility audit
15. 🔨 Update mvp-readiness.md

---

**Legend:**
- ✅ Already implemented/compliant
- 🔨 To be implemented this sprint
- 🔲 Backlog (post-MVP)

**Last Updated:** January 2026  
**Next Review:** After AppShell implementation
