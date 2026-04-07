# Migration Example: vCard Wallpaper Builder (Zustand → stackpack-state)

A real migration of a vCard wallpaper builder from Zustand to `stackpack-state`. One session, one agent, the prompt above.

**Result:** 4 stores created, 5 components rewired, Zustand uninstalled.

---

## Stores created

| Store | File |
|---|---|
| `contact` | `state/contact.store.ts` |
| `wallpaper` | `state/wallpaper.store.ts` |
| `auth` | `state/auth.store.ts` |
| `editor` | `state/editor.store.ts` |

**`contact`** — 10 schema fields: `fname`, `lname`, `title`, `org`, `phone`, `phone2`, `email`, `url`, `note`, `qrUrl`. Two When conditions: `isEmpty`, `hasQrUrl`. No Gates.

**`wallpaper`** — 7 schema fields: `deviceLabel`, `deviceW`, `deviceH`, `bgStyle`, `bgDim`, `qrPosition`, `qrSize`, `useDifferentImage`. Two When conditions: `hasDimming`, `isUsingDifferentImage`. No Gates.

**`auth`** — 2 schema fields: `showAuthModal`, `hydrated`. One When: `isHydrated`. One Gate: `showModal`.

**`editor`** — 1 schema field: `activeTab`. No Whens. Two Gates: `showContact`, `showWallpaper`.

---

## Components rewired

| Component | Old → New |
|---|---|
| `ContactForm.tsx` | Zustand `useStore` → `useValue('contact')` + `useChange('contact', user)` |
| `WallpaperPanel.tsx` | Zustand `useStore` (16 selectors) → `useValue` × 2, `useChange`, `useWhen` |
| `AuthModal.tsx` | Zustand `useStore` → `useGate('auth', 'showModal')` + `hideAuthModal` action |
| `useAuthGate.ts` | Zustand `useStore` → `showAuthModal` action import |
| `page.tsx` | Zustand `useStore` → `useValue` × 4 (one per store) |

The `WallpaperPanel` row is the headline result: **16 hand-written selectors collapsed into 4 hook calls.**

---

## Conditions classified (When vs Gate)

| Condition | Type |
|---|---|
| `activeTab === 'contact'` | **When** (display:none) |
| `useDifferentImage` | **When** (via `useWhen`) |
| `showAuthModal` | **Gate** |
| `editor.showContact` / `showWallpaper` | **Gate** (defined, not yet used as `<Gated>`) |

**Why `activeTab` is a When, not a Gate:** tab content has to persist canvas state across switches. Mounting and unmounting would lose the canvas. So the tabs use `display: none` and the component stays in the tree — that's textbook When-edge behavior.

**Why `showAuthModal` is a Gate:** the modal is fully removed from the DOM when closed. Mount-edge.

**Why the editor Gates exist but aren't wired:** they're declared in the schema in case the tab UI is ever rebuilt with real mount/unmount semantics. Ready to wire, not wired today.

---

## State left in local `useState` (and why)

Not everything belongs in a store. Three deliberate exceptions:

| State | Component |
|---|---|
| `bgImageVcard`, `bgImageUrl` | `WallpaperPanel` |
| `email`, `sent`, `loading` | `AuthModal` |
| `search`, `open` | `DeviceDropdown` |

**Image elements** — `HTMLImageElement` instances aren't serializable with Zod, are browser-only, and re-upload on refresh is acceptable for this app. Local `useState` is the right home.

**Modal form state** — ephemeral. `email`, `sent`, and `loading` are only meaningful while the modal is open and should reset on close. Putting them in a global store would be over-consolidation.

**Dropdown UI state** — same logic. Filter input and open/closed state for a dropdown have no business outliving the dropdown itself.

This is the kind of judgment call the prompt's negative rules ("do not consolidate unrelated state") are designed to preserve.

---

## Plumbing

- **`state/actions.ts`** — all mutations attributed via `createHumanActor` (user) or `createSystemActor` (programmatic). No anonymous writes.
- **`state/provider.tsx`** — single `MultiStoreProvider` wrapping all four stores.
- **Deleted:** `store/useStore.ts` (old Zustand store), `zustand` package uninstalled.

One commit. One session. Production-ready.
