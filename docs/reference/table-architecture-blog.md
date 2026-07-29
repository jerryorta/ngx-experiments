# NgeTable — blog notes

Raw material for a future write-up on building `@nge/table` (ARCH-239). **Notes, not prose.**
Each entry is a finding worth a paragraph or a section, with the concrete evidence attached so the
specifics survive: numbers, file references, and the wrong answer that was tried first.

**Add to this as stories land.** The interesting parts of an epic are the places where the obvious
answer was wrong, and those are exactly the parts that get smoothed out of the code once they are
settled. Capture them while the reasoning is still fresh — a comment in the source records *what is
true*, and deliberately not *what was tried*; this file is where the second one lives.

Canonical technical docs: `docs/architecture/table.md` and `libs/shared/table/AGENTS.md`.

---

## Theme 1 — The measurement lessons (the strongest material)

This is the richest vein. Four findings from ARCH-291's frame-budget work and two more from
ARCH-293's, and each one generalises well beyond tables. The later pair is the more useful half for
a reader, because it is about what you *do* given the limitation the first half establishes.

### `p95` on a vsync-locked display cannot see what you think it sees

The headline finding, and the one most likely to be new to a reader.

Four measurements — a plain table, a chart column with the render gate on, the same with the gate
**defeated**, and a shells-only floor — produced **the same number**: p95 17.0–17.2 ms, worst frame
17.5–17.7 ms, zero dropped frames, across every mode.

The instinctive reading ("all four cost the same") is wrong. **A 60 Hz display quantises frame time:
1 ms of work and 15 ms of work both produce a ~16.7 ms frame.** p95 only moves once work *exceeds*
the budget. So four identical figures mean **"all four fit inside the frame budget"** — a real and
useful answer, but a much weaker one than it appears.

The blog angle: *your performance metric may be a pass/fail gate wearing the costume of a
continuous measurement.* To measure a *difference* rather than a *threshold*, something has to
overrun first.

### An acceptance criterion that passes vacuously

The ticket said: *"a scripted scroll of the 10k fixture with the chart column present stays inside
the frame budget."*

The harness advances `scrollTop` on **every** measured frame. Every scroll event resets the
engine's 150 ms scroll-idle timer, so the "has the scroll settled" flag never flips, so **not one
chart is ever built**. The instrument would have timed a column of grey placeholders and reported a
pass — with the feature effectively switched off for the entire measurement.

Great section on how a criterion can be *satisfied* and *meaningless* at once, and how you catch it:
by asking "what would this measure if the feature were deleted?"

The fix was a second instrument — flick hard, stop dead, then time the frames where a whole window
of charts mounts at once.

**It happened a second time, in a different mechanism, two stories later** — which is what turns
this from an anecdote into a pattern worth a reader's attention. ARCH-293's criterion was "the frame
budget is unchanged with an editable column present." But editing is *activated*: a cell renders
read-only text and builds no control at all until someone engages it. A scripted scroll engages
nothing, so the measurement would have timed a table of plain text and reported a pass — with, once
again, the feature switched off for the entire run. The fix was to make the measured column
`alwaysLive`, so every rendered row genuinely constructs a control.

Two instances, two unrelated causes — a timer that never fires, and a control that is never built —
and the same question catches both.

### The number that did land

`to first chart`: **150.3 ms** and **150.2 ms** across two runs, against the engine's documented
150 ms `isScrollingResetDelay`. Sub-millisecond agreement, twice.

Nice counterpoint to the section above: most of the measurements said nothing, and one said
something exact. Worth being honest that the exact one confirmed *the mechanism*, not *the value*.

### And the conclusion that got weaker on contact with data

The story was written around "the settle gate is what makes charts in cells affordable." The
measurement says: **at sparkline weight, the gate's benefit is zero.** Gate on and gate defeated are
indistinguishable. Its value is *headroom* for heavier content, not a demonstrated saving.

The docs were rewritten to claim the weaker thing. That's the honest ending, and probably the most
useful part of the post for a working engineer: **the feature is still right, and the claim about it
was still wrong.**

### The measurement that proved itself noise by coming out backwards

ARCH-293 asked the same question — what do the cell editors cost? — but built the comparison as a
**toggle inside one story** rather than as a reading held against a figure recorded somewhere else.
Editors on, editors off, identical columns and geometry, one machine, one session, four runs.

```
                  p95 median          worst          dropped     rows built
editors on        16.9ms (16.9–17.0)  17.6ms         0 / 240     714
editors off       17.3ms (17.1–17.4)  17.6–17.7ms    0 / 240     714
```

**Editors-on measured faster than editors-off.** Not by much, and obviously not really — but that is
precisely why it is the strongest form the result could have taken. The gap between the two medians
(2.4%) is *smaller than the spread within a single condition across two identical runs* (1.8%), and
its sign is backwards. No tolerance had to be argued, no threshold defended: the instrument reported
a difference in the impossible direction, which settles the question better than a number in the
expected one ever could.

The blog angle, and the practical takeaway from the whole theme: **given a metric that quantises,
stop trying to read it more precisely and start controlling what it is compared against.** A
single-story toggle removes the machine, the day, the cache state and the browser build from the
answer in one move. The noise floor is not a constant either — this library's own baseline spread
1.8% warm and 4.2–4.8% minutes after a cold rebuild — so a figure from another session is measuring
the machine's mood alongside the feature.

---

## Theme 2 — A cache that makes your data stale, and the fix that keeps both

The central design problem of ARCH-291, and a genuinely transferable one.

Cell contexts are memoised against the engine's `Cell` object — a `WeakMap` — because allocating a
fresh context per cell per render is exactly the churn virtualization exists to avoid. The
justification is sound: a cell's *value* cannot change under it.

Then a field arrives that **does** change: "has the scroll settled?"

Two obvious moves, both bad:

- **Drop the memo** — a new object per cell per render, which is the cost the memo was added to
  remove.
- **Keep the memo, add a boolean** — read once at first build and served stale forever. ⚠️ And the
  failure is *silent and looks like success*: the cell renders, the placeholder appears, and it
  simply never resolves.

The resolution: make the field **signal-valued**. Object identity stays stable (which is all the
cache needs); the value stays live (which is all the template needs). The two requirements stop
being in tension because they were never about the same thing — one is about *identity*, the other
about *content*.

One spec pins both halves in one assertion pair, and it is the spec that fails the day someone
"simplifies" the field back to a boolean.

Generalises to: *any memoised view-model that acquires a field which moves.*

---

## Theme 3 — Reuse the engine's answer instead of inventing one

The feature needed "the scroll has been quiet for N ms". The obvious implementation is a scroll
listener and a debounce timer.

The library had **no scroll listener at all** — scrolling was entirely delegated to the virtualizer.
And the virtualizer already tracked `isScrolling`, clearing it after a configurable quiet period
(150 ms), which *is* the required semantics with exactly one knob. The Angular adapter already
exposed it as a reactive signal.

So the whole feature is one `computed` over a flag the engine was already maintaining, and zero new
listeners.

Blog angle: the discipline of **reading the dependency's source before writing the obvious code**.
Also a good place for the related decision that the timing knob was deliberately *not* exposed on
the public config — one tuning constant a consumer can set badly is worse than a default that is
occasionally imperfect.

---

## Theme 4 — Substrate decisions with a wrong answer attached

Each of these has a "we tried the obvious thing" shape, which is what makes them worth writing.

### Flexbox lanes, not CSS Grid

CSS Grid is the modern answer for a table-shaped layout, and it was **rejected**. Its one decisive
advantage is intrinsic column sizing — and this product explicitly does not want it: columns take
explicit widths the user drags, Excel-style. Grid also cannot express the sticky lane wrapper that
column pinning needs, because a sticky lane cannot be a grid item.

The lesson: *the best-fitting tool for the general problem can be the wrong tool once you know which
half of the problem you actually have.*

### `top`, never `transform: translateY`

Virtualized rows are positioned with `top`. A transform creates a **stacking context**, and a
stacking context breaks `position: sticky` for every pinned cell inside the row.

⚠️ The cruel part: a transformed row looks **perfectly correct** until a column is pinned. It is a
correctness bug that no amount of looking at the feature you just built will reveal, because it
manifests in a *different* feature.

AG Grid hit the same wall and made the same switch — worth citing, since "we independently arrived
where the mature product already was" is a useful signal for a reader.

### Descriptors, not enumeration

Anything marking a row / cell / column is id-keyed state, never a DOM flag and never a field on the
datum (virtualization recycles DOM; the data belongs to the host and may be frozen).

But *id-keyed* does not mean *enumerated*. Highlighting one column of a 10,000-row dataset as a
per-cell map is **~270 KB of JSON, ~25 ms to build**, re-emitted on every state change — and three
or four such columns exceed Firestore's 1 MiB document limit, which destroys the "a user's view can
be persisted and restored" property the design exists for.

A *descriptor* — an anchor, a focus, a list of column ids — is one object regardless of row count,
and membership is a predicate. Concrete numbers make this section land.

---

## Theme 5 — Designing for extension, then auditing it

Four extension axes, all present from Wave 0: behaviour (`TableFeature`), render slots (named
templates), the data pipeline (readers over the processed row model), and events (one
discriminated union).

The interesting part is the **gate**: the core was declared "done" only when two features —
cell highlighting and CSV export — could be added touching **zero core files**. Not a design review;
a build.

Results worth reporting honestly:

- **Highlighting found one seam broken**, and broken in the worst direction — *silently, looking
  like success*. The state axis was never wired to the engine's own state-update route, and the
  adapter's internal state absorbed every write. The addon rendered, toggled, and survived a
  virtualized scroll while the published state never moved. Reverting the fix today fails 7 specs —
  **and every "is this cell highlighted" assertion still passes.**
- **CSV export then needed nothing at all.** Zero core files touched.

The generalisable line: *a rendering addon working is not evidence that a state seam works.* And the
pair is the real result — one fix, then a second addon that needed none.

The line generalised again two waves later, in a form worth pairing with the original. The select
editor's dropdown has to stop `Escape` from reaching two addons that listen on `document`. Delete
that one `stopPropagation()` and the panel still opens, still closes on `Escape`, still commits, and
still passes every keyboard assertion — **one** spec goes red, the one that installs a document
listener and asserts it never fires. *The visible half of a behaviour working is not evidence that
its invisible half does*, and the invisible half is usually the one holding an invariant.

### The same move applied to a dependency boundary

Later waves added a second kind of claim: the library has three entry points, and the production one
must never reach the other two — so an optional editor, and anything it depends on, cannot leak into
every consumer of the table.

That is exactly the sort of claim that is true on the day it is written and decays in silence. A
convenience re-export added months later compiles, lints, passes every other test, and quietly folds
the optional half into the main bundle. So it is asserted rather than stated: a spec walks the
**transitive** relative-import closure of the public barrel and fails if it reaches either secondary
directory. Transitive because a core module importing an editor is exactly as bad as the barrel
doing it, and considerably harder to notice.

⚠️ **And then the check itself has to be checked.** A walker whose resolver silently returns nothing
passes everything, forever, while looking like coverage. Appending `export * from './editors'` to
the barrel and watching the spec go red takes ten seconds and is the difference between a guard and
a decoration. Same instinct as the gate above — *don't review the claim, build something that fails
when it stops being true* — pointed at a boundary rather than a seam.

---

## Theme 6 — Traps that cost real time

Short, punchy, and the kind of thing readers bookmark. Each of these shipped past lint, tests and a
type-check.

- **The DOM probe that lies.** `document.querySelector('nge-chart svg')` does not return nothing
  when the chart renders into a shadow root — it returns a **0×0 `<svg>`**, because the chart's
  always-instantiated tooltip keeps an arrow in the light DOM. So the obvious check finds an svg,
  measures zero, and reports a collapsed chart that is rendering perfectly. Measured: 26 charts → 26
  zero-sized light-DOM svgs → 26 correct marks in the shadow roots.
- **`align-self: stretch` is silently defeated by an explicit `height`** on the same element —
  stretch applies only when the item's own cross size is `auto`. A placeholder and its replacement
  were 12 px apart despite every declaration in the stylesheet being correct. Caught by measuring
  `offsetHeight`, not by reading CSS.
- **A Storybook control that renders as a bare `-`.** `options` belongs at the argType level, not
  inside `control`. Nested, Storybook honours `type: 'select'`, finds no options where it looks, and
  gives up **with no error anywhere**. Boolean and number controls have nothing to look up, so they
  keep working and hide the mistake. It survived lint, tests, type-check and a clean Storybook
  compile, and surfaced only when a human opened the panel.
- **A hidden browser tab suspends `requestAnimationFrame`**, so zoneless change detection never
  flushes and *nothing re-renders*. Measured: a scripted 2880 px scroll moved `scrollTop` while the
  virtualization window did not slide and no rAF callback fired in 300 ms. ⚠️ This makes browser
  automation structurally unable to verify anything animation- or scroll-driven — and the failure
  reads exactly like the feature being broken.
- **The obvious generalisation of a guard that would have disabled a whole feature.** The library
  refuses to start a cell-range drag inside a control, and the tag list (`input, button, select,
  textarea, [contenteditable]`) missed every `div`-based control — which is what a design-library
  slider or select actually is. The ticket proposed widening it with `[tabindex]`, among other
  things. That one clause would have switched cell ranges off entirely: the table's own row carries
  `tabindex="0"` whenever selection is on, and the guard is a `closest()` walk, so **every cell in
  every selectable table** would have resolved to an "interactive" ancestor. The interesting part is
  that it fails *totally* rather than subtly, which is the only reason it was caught before shipping —
  a subtler version of the same mistake is what usually survives review.
- **Fifteen is a number `@ngrx/signals` never tells you about.** `signalStore` is typed by overload
  and the widest one takes fifteen features. A store already at fifteen does not reject the
  sixteenth — inference just stops matching, every member degrades to an index signature, and the
  store's own type becomes `Function`. About forty errors then appear in the consuming component,
  which dominates the output and is where every signal points. Diagnosing it means checking the
  baseline rather than reading the errors. (Two corrections found while fixing it in ARCH-297: on
  TypeScript 6.0.3 the store file **does** also report one `TS2769: No overload matches this call`,
  so it is not literally silent — just drowned. And the sibling `signalStoreFeature` has a **lower**
  ceiling of ten, which nothing documents either.)

- **A focus rule that is right for one column type and catastrophic for the other (ARCH-293).** A
  cell editor has to focus itself, or the keyboard route into an editable table dead-ends: `Enter`
  on a focused row activates a column and focuses nothing. The obvious implementation — focus the
  field when it exists — is correct for every *activated* column and wrong for an *always-live* one,
  where every rendered cell reports "being edited" from the first paint. Thirty rows would each grab
  focus as they painted and the last to render would win, so a user's caret leaves whatever they
  were doing the moment the table appears. The fix is one word of difference: focus on the
  **transition** into editing, not on the state. What makes it worth writing up is that both
  versions pass every test you would think to write about focus; the failing case only exists on a
  configuration flag most columns do not set.
- **The seam you already have, versus the branch you were about to add (ARCH-293).** Shipping the
  library's own editors seemed to need a branch in the table's markup — "if this column is editable,
  render our input" — which was exactly the central switch the epic's extensibility gate exists to
  catch, and would have forced the core to import the optional editors it names. The answer was that
  the render seam already accepted a *component* as well as a template, so a column could simply
  name one and the existing lookup gained a second line. The general shape: when a feature seems to
  need a branch in the core, check whether the seam's own contract is wider than the way you have
  been using it.

The through-line for this section: **every one of these was found by a person using the thing.** A
green pipeline is a claim about the code, not about the product.

An addition worth making to that claim: the last two were found by a *compiler* and by *reading a
ticket sceptically* — but both share the property that the failure signal points somewhere other than
the cause. That, rather than "tests do not catch everything", is what makes them worth writing up.

---

## Theme 7 — Positioning (a short framing section)

Worth stating early in any post: this is a table for **displaying** complex data — the bar is
Angular Material's table and AG Grid — and deliberately **not a spreadsheet**.

That distinction resolves scope questions rather than merely describing them. Selection, ranges and
a fill handle are there because they make *reading and extracting* faster. Where a spreadsheet
gesture has a display half and an editing half, the library takes the display half and declines the
other: the fill handle **proposes** values and never writes them; dragging inward **shrinks the
selection** rather than clearing cells, because clearing is a change to data whose vocabulary
belongs to the host's schema.

Good illustration of a boundary that is easy to state and does real work.

## Theme 8 — When the ticket's letter and the architecture disagree

Two findings from the last story of the epic (the select editor over a CDK overlay), both of the
same shape: a specification that read as settled, and a codebase that had already decided otherwise.

### The meta key that could not exist

The ticket asked for the select's options to be declared on the column through a **namespaced meta
key**, "the way `meta.ngeExport.format` and `meta.ngeFill.enabled` already are". Reasonable on its
face, and consistent with two shipped precedents.

It is unbuildable without a core edit, and noticing why took reading one interface. Those two
precedents are top-level keys because the **core** reads them — the export seam and the fill feature
respectively. The cell context handed to an editor carries `columnId` as a *string* and no column
object at all, so an editor cannot read column meta by any route. Plumbing a `ngeSelect` key
through to a component would mean the core learning what a select is: a central switch in front of a
seam, which is precisely what the epic's extensibility gate exists to catch.

The options went where the architecture already had a channel — the inputs the adapter spreads for
an editor — which is still namespaced and still not a bare field. Following the ticket to the letter
would have satisfied its acceptance criterion and quietly violated the epic's central lock.

The transferable habit: when a spec cites precedents, check *why* those precedents have the shape
they do. Two features with an identical-looking key had it for a reason that did not extend to a
third.

### The containment that stops one node earlier

An earlier story established that `Escape` inside a cell is contained by stopping it at the cell,
because three separate addons bind `Escape` on `document` and `document` is last on the bubble path.
One `stopPropagation()`, no negotiation, and any future addon inherits the containment free.

A dropdown attached to `<body>` — which is the entire reason it can escape the cell's
`overflow: hidden` — is not on that path. The containment does not merely weaken; it never runs.

The fix is the same trick applied one node earlier, and it is only findable by reading the
framework's source: the CDK dispatches overlay keydowns from a listener on **`body`**, one node
before `document`. So stopping the event in the overlay's own keydown stream starves the same three
addons, symmetrically.

But the trigger is still inside the cell, so a key pressed there is stopped by the *old* containment
before it ever reaches `body` — meaning the first `Escape` would cancel the edit outright when the
user only meant to close a dropdown. Hence two claimants: one at the panel, one at the trigger
**guarded on the panel being open**, so that with no panel the key is left completely alone and the
original behaviour is inherited rather than reimplemented.

Two lessons. **A containment mechanism is a claim about a position in the tree, not about a key** —
move the element and the claim silently stops holding. And **the guard is what keeps a second
claimant from being coordination**: the thing the original finding rejected was editors negotiating
over a key, not an editor ever touching one.

### A precise claim beats a memorable one

The story also warned that the token contract "does not reach" a body-level panel. Nearly right, and
the imprecision points at the wrong fix.

Defaults declared at `:root` *do* reach it — the overlay container is a child of `<body>`, itself a
descendant of `:root` — which is why such a panel renders correctly with no theme loaded, and why
that is the least informative case to check. What does not follow it out is anything scoped tighter:
a theme class on a wrapper, and the host element's own inline geometry.

So the fix is not "apply the tokens to the panel" but "resolve them *where the trigger stands* and
carry the answers over", which handles every scoping at once and needs no knowledge of any domain's
theme-class naming. The verification follows from the same precision: measure the rendered panel,
never the wrapper's declared token, because a wrapper will happily show a value the panel never
received.

### An acceptance criterion that encoded a mitigation, not a requirement

The best of the three, because the ticket was not merely imprecise here — it was *right about the
danger and wrong about the fix*, and only the codebase could say so.

The criterion read: **"an open panel survives nothing it should not: scrolling closes it rather than
leaving it positioned against a detached trigger."** The stated hazard is real and well known —
virtualization destroys rows, a dropdown anchored to a destroyed element has nothing to measure, and
CDK's `CloseScrollStrategy` exists precisely for this. Every design-system select in the wild either
closes or repositions for the same reason.

One line settled it against the criterion. The table renders its window with
`@for (rendered of store.renderedRows(); track rendered.row.id)` — **tracked by row identity, not by
index** — so a row leaving the window is *destroyed*, not recycled onto another record. The editor
component dies with its row and its `DestroyRef` teardown disposes the overlay.

Which means "follows the trigger" and "closes when the row is gone" were never alternatives. They are
the same mechanism seen from two ends: reposition tracks while the row lives, and the row's death
closes the panel for free.

Verified rather than argued, and the sampling rate is the point — a single bad frame would show as a
dropdown flashing to the screen corner, which no 200ms-interval check would catch:

```
scrolling a 2,000-row virtualized table at 25px/frame
  frames tracking the trigger exactly            13
  frames at the detached {0,0,0,0} origin         0
  close when the row left the window            frame 14, clean
  stray overlay panes afterwards                  0
```

Three things generalise, and the third is the one worth the section:

1. **Read an acceptance criterion for its requirement, not its remedy.** What this one wanted was
   *"the panel is never positioned against a dead element."* "Scrolling closes it" was one way to get
   that — and once the row model was checked, the requirement already held. Implementing the remedy
   would have satisfied the letter and charged a real price: a dropdown lost to an inertial trackpad
   brush.
2. **A framework's default safety advice is written for the general case, and you are a specific
   one.** `CloseScrollStrategy` is correct for a page that recycles DOM. This table does not.
3. ⚠️ **The dependency runs backwards from intuition.** Row recycling — reusing row controllers
   across window slides instead of destroying them — sits in the epic's backlog as a *performance*
   improvement. If it lands, a recycled trigger stays connected while showing a different record, and
   the panel silently follows the wrong row. **The more efficient row model is the one that breaks
   the overlay**, which is not where anyone would think to look for the regression. Worth a line in
   the recycling story before it starts, not a bug report after it ships.

## Theme 9 — A ceiling in the wrong layer, and a smell that was mostly incidental

### The suggestion that was right about the mechanism and wrong about the layer (ARCH-297)

`NgeTableStore` reached `signalStore`'s fifteen-feature ceiling, and the natural suggestion is that
this epic had already solved it. Extension axis 1 is TanStack's `_features` array; it is unbounded,
`core/table.ts` composes `[...builtInFeatures, ...options._features]` with no central switch, and
ARCH-250's highlight addon proved the route end to end. Move some concerns onto the engine and the
adapter stops being crowded.

⚠️ **It is a real mechanism at the wrong layer, and almost nothing could move even in principle.**
`_features` is unbounded extensibility for *engine* concerns — rows, columns, state. Fifteen is an
`@ngrx/signals` overload limit on the *Angular adapter* that turns engine state into a painted table.
What the store actually holds is a `TemplateRef` registry, lane widths and scroll margins, the
virtualization window, `aria-colcount`/`aria-rowcount`, and one scratch `editing` target. The engine
knows nothing about `TemplateRef`s, pixels, or scroll settling.

The `editing` case is the sharpest, because moving it would have been an actual regression rather
than a lateral move: ARCH-292 deliberately kept it **out** of the published `NgeTableState` so a
restored view could not re-open an editor nobody touched. Relocating it to a `TableFeature` puts it
back into the persistable state it was excluded from. The migration that looks like tidying is the
one that undoes a decision.

So the answer was worth having as a **placement rule** rather than as a plan:

> New state belonging to a table feature goes on the engine. New state describing how Angular paints
> the table belongs in the store. Ask which one a new concern is before adding a slot.

**The store was large because painting a virtualized, pinned, themed, slot-driven table in Angular is
genuinely a lot of derivation** — not because engine state had been misfiled into it. Worth checking
before concluding that a big adapter is a badly-organised one.

### Eight blocks, three reasons, and the one that dissolves on contact

The composition was one `withState`, two `withProps`, four `withComputed` and **eight** `withMethods`.
Eight is the number that looks like a problem, so it is where the audit started — and only three of
those splits were required. Each was required for one mechanical reason: **a `signalStore` feature's
`store` argument carries only what *previous* features added**, so a method calling a sibling declared
in its own block throws `is not a function` at click time. Runtime, not compile time, because the
object literal is still being built. One of the blocks carried a ⚠️ comment saying exactly that.

The reason is real, and it is also entirely an artifact of reaching the sibling *through the store*.
Written as plain `const`s in the factory body and exposed once at the end, the same call is ordinary
TDZ that the compiler checks — and the block boundary stops carrying any weight at all. Merging alone
took fifteen to eleven; grouping into six `signalStoreFeature` units took it to seven.

The generalisable part: **before restructuring around a constraint, check how much of it is the
constraint and how much is the idiom you happened to write it in.** Five of eight blocks here were
the idiom.

### A guard has to fire before the cliff, not at it

The obvious guard is "fail when the sixteenth feature is added." That is useless, because at sixteen
the damage is already the confusing part — inference has collapsed and the errors are in a file
nobody edited. The guard added instead fails at **ten of fifteen**, so whoever trips it still has five
slots to land their feature and regroup afterwards. A tripwire whose only setting is "too late" gets
deleted; one that leaves room gets obeyed.

It parses the composition root with the TypeScript AST rather than a regex, for a reason that
generalises to every source-reading test: the file's own prose names `withMethods` and `withFeature`
in comments, and counting balanced parentheses is where a regex stops being honest. And it carries
the falsifiability tests this library now writes by habit — a counter proved against synthetic sources
with known answers, because one that quietly returned zero would pass against every possible tree.

---

## Theme 10 — When a control runs out of implicit moments (ARCH-296)

### Three editors, three different implicit commits — and the fourth gets none

The library's editors each found a natural instant to commit at, and nobody planned the set:
`<nge-cell-input>` commits on blur, `<nge-cell-checkbox>` on toggle, `<nge-cell-select>` on
selection. Three controls, three different answers, each obvious in isolation.

The textarea gets none of them, and the two refusals fail in opposite directions.

`Enter` is unavailable because it inserts a newline — and multi-line input is the *entire* reason a
column reaches for a textarea rather than an input. Taking the key removes the feature the control
was chosen for.

Blur is unavailable for a sharper reason: **it is the exact inverse of what the previous editor
story recorded.** ARCH-293's finding was that a blur handler needs *guarding* on `isEditing()`,
because removing a focused element fires a native blur, and `Escape` does exactly that — so an
unguarded teardown blur commits the draft `Escape` had just discarded. Here the failure runs the
other way: clicking **Cancel** blurs the field on its way to the button while the edit is still
perfectly live, so the guard *passes* and a commit-on-blur applies the very edit Cancel exists to
discard.

Same event, same two stories, opposite conclusions — and the second one is not "guard harder", it is
**the handler must not exist**. Inheriting a sibling's mechanism because the sibling is nearby is how
this would have shipped broken.

### The generalisable line

> **A control whose natural gestures are all ambiguous needs explicit affordances, and adding them is
> cheaper than inventing a rule about which keystroke means "done".**

The alternative was on the table and is worth naming, because it is the one that feels clever:
`Shift`+`Enter` for a newline, plain `Enter` to commit. That is a convention every consumer has to
teach every user, bought for the price of two buttons. Two buttons is the cheaper answer, and it is
the *only* one that also makes the abandon path obvious.

### A failure that is benign in one editor and data loss in the next

Rows are `@for`-tracked by `row.id`, so a row leaving the virtualized window is **destroyed** — the
editor dies with it and its `DestroyRef` teardown disposes the overlay. The previous story verified
that mechanism and *depends* on it: it is what makes a reposition scroll strategy safe for a select.

The same mechanism, one story later, is the worst bug in the library. A select loses a closed list.
A textarea loses however much prose the user had typed — silently, mid-sentence, because they
scrolled.

The interesting part is that **nothing about the mechanism changed.** What changed is what the
control was holding, and that is not visible anywhere in the mechanism's own code or in the story
that verified it. Inherited infrastructure carries its original stakes as an unstated assumption,
and the assumption is invisible precisely because it was correct when written.

### The third sighting of one seam: CDK's scroll APIs mean the *page*

The obvious API for "stop the table scrolling" is `scrollStrategies.block()`. It is a **verified
no-op** here: it operates on `document.documentElement`, and its own `disable()` doc comment says it
unblocks *page-level* scroll. This table scrolls in an inner `.nge-table__viewport`. Measured
earlier in the epic: with `.cdk-global-scrollblock` applied to `<html>`, the viewport still scrolled
to 3,000 of its 80,045px.

That is the **third** time this epic hit the same wall — ARCH-294 found the identical limitation in
`autoClose`, which carries an upstream TODO saying so. Three sightings is a rule rather than a
coincidence: **assume any CDK scroll API means the browser viewport until proven otherwise.**

What worked instead was not a scroll strategy at all. `hasBackdrop: true` puts a hit-testable
full-viewport element between the pointer and the table, so a wheel event's scroll chain runs
overlay-container → `body` → `html` and never includes the table's viewport. The fix for "the inner
viewport scrolls" turned out to be an element, not a strategy — worth noting because the API surface
named after the problem was the wrong place to look.

### Modal, but only once there is something to lose

Blocking scroll leaves outside clicks to decide, and both available answers are bad in isolation:
dismiss-on-outside-click destroys a draft by a stray click instead of by a scroll, while
never-dismissing is a trap.

The resolution is that **the panel is modal only while the draft is dirty.** A clean panel closes on
an outside click like every other dropdown. A dirty one keeps itself and takes focus back — and an
"Unsaved" hint appears at exactly the moment the panel starts refusing to dismiss, so the refusal and
its explanation are one thing rather than a rule and a surprise.

Dirtiness is a comparison against the cell (`field.value !== display()`), not a record that a key was
pressed, so typing back to the original makes the panel dismissible again. That falls out of the
definition rather than needing a rule of its own, which is usually the sign the definition is right.

### An option that is incoherent rather than merely inadvisable

`ngeCellSelectEdit()` offers `alwaysLive` and defaults it *true*. `ngeCellTextareaEdit()` does not
offer it at all.

That is not a preference reversal. A select's always-live cost is one `<button>` per visible row —
a trade. This editor's control is a **body-level overlay opened on activation**, so always-live means
one panel per visible row, which is not a rendering of a column at all. The option is not a worse
setting; it is not a setting.

⚠️ **And the API refusing to offer it is not the same as it being impossible.** A hand-written
`meta.ngeEdit` can still say `alwaysLive: true`, so the component takes a second lock: it opens on
the **transition** into editing rather than on its presence — the same `null`-start rule an earlier
story already needed for focus — and an always-live column never makes a transition. The degraded
state is "no panel opens", not "thirty do". **Where a config object is one globally-merged interface,
a typed helper is a recommendation and the component still needs the guard.**

### Falsifiability, third confirmation

The house rule by now: prove the test can fail before believing it.

- Deleting the panel's single `stopPropagation()` fails **exactly one** spec — `never lets a panel
  Escape reach a document-level listener` — and leaves *every* "the panel closed" assertion green.
  Third time this epic has confirmed that a rendering assertion is not evidence about a state or
  event seam.
- Adding the forbidden `(blur)="apply()"` fails **two of three** blur specs. The third — the outside
  click — stays green, because jsdom moves no focus on a synthesized backdrop click and so fires no
  blur.

The second result is the more useful one, and it got written into the spec file rather than quietly
accepted: **three sibling `it`s under one `describe` read as equal cover, and were not.** A test
suite's shape is itself a claim about what is verified, and that claim can be wrong while every
assertion in it passes.

### Measuring a negative: three legs, or it is not evidence

The claim to verify was "with an editor open, a wheel over the table does not scroll it." The naive
test is one wheel event and one `scrollTop` reading, and it is worthless in **both** directions.

- Scripted wheel events are **untrusted**, so they scroll nothing whether or not a backdrop exists.
  A synthetic-event test passes for entirely the wrong reason.
- Even with a real wheel, "nothing moved" is ambiguous: a table that was never scrollable, a section
  too short to scroll, and a working backdrop all produce the identical reading.

What settles it is three legs and one corroborating detail:

| Leg | `scrollTop` | |
| --- | --- | --- |
| baseline, no panel | 0 → 500 | the table genuinely scrolls |
| panel open | 500 → 500 | blocked |
| after Cancel | 500 → 1,500 | it scrolls again, so nothing else broke it |

The corroborating detail is that during the middle leg **the page scrolled instead**. That is what
distinguishes "the backdrop caught the wheel" from "the wheel never landed" — the event went
somewhere, just not into the table. Without it the middle leg is still ambiguous.

### The automation tab lies about `requestAnimationFrame`

The verification nearly produced a confident false negative. CDK applies
`cdk-overlay-backdrop-showing` inside a `requestAnimationFrame`, and a transparent backdrop is
`visibility: hidden` until that class lands — so it intercepts nothing. An automation tab runs at
`visibilityState: 'hidden'`, which **suspends rAF**, so the class never arrives and the backdrop sits
there inert, looking exactly like a feature that does not work.

Two lessons, and the second is the general one:

1. The measurement needed the class applied by hand, with that stated plainly, because the
   alternative was reporting a browser-harness artifact as a product defect.
2. **A hidden automation tab is not a small tab.** rAF-suspension has now bitten this workspace twice
   in different disguises — once as an animation frozen at frame 0, once as a CSS class that never
   arrives. Anything whose correctness depends on a frame having passed will read as broken there.

It also surfaced a real, if minor, property worth knowing: in a genuine browser there is a
one-frame window after the panel opens during which the backdrop does not block. Nobody has typed
anything yet, so it costs nothing — but it is the sort of thing that is much cheaper to write down
once than to rediscover under a bug report.

### And a reminder that a blank page is not a verdict

Two of the three stories rendered empty in the browser at the end of that session, after a long run
of navigations against a server that was being restarted underneath them — the renderer eventually
stopped answering screenshot requests altogether. It would have been easy to go hunting for a bug in
those two components.

The cheap disambiguation was to leave the browser entirely: a throwaway `TestBed` spec that mounts
each story component and counts what it produced. All three rendered in full — 10, 5 and 5 sections
respectively. The blank pages were a sick session, not sick code. **When a browser result is
surprising, first ask whether the browser is still trustworthy**, and prefer a check that does not
depend on it.

## Row expansion, and two things that were true for the wrong reason (ARCH-298)

Wave 7's only story looked like a small one. `state.expanded` had been a first-class slice since Wave
0, `onExpandedChange` was already routed, the `row-detail` slot already rendered and already gated
itself on `isExpanded`, and the token was already bridged across ten themes. What was missing was a
chevron and an answer to one geometry question. Both halves turned out to have a finding in them, and
neither was the half anyone would have guessed.

### An engine default written for a feature we are not building

The write path really was free: `row.toggleExpanded()` forwards to `options.onExpandedChange`, which
has pointed at the store since ARCH-242. What was not free was being *allowed* to open a row at all.

`row.getCanExpand()` falls back to `(enableExpanding ?? true) && !!row.subRows?.length`. Flat data has
no `subRows`. So the engine's default answer, for every row of every table this library will ever
render, is **no** — and the symptom is a feature that renders a full column of chevrons, routes every
click correctly, and does nothing at all.

That default is not a bug; it is written for tree data, where "can this expand" genuinely means "does
it have children". A detail band is the other half of a feature TanStack models as one, and the
distinction is exactly the one this story had to keep making: `getExpandedRowModel()` flattens
sub-rows into the visible row model, and a band needs none of it. Declining the row model while
adopting the row API is the whole shape of the story.

### The lock that had never been load-bearing

`allRowsExpanded` was written the obvious way first — ask the engine, `getIsAllRowsExpanded()`. It is
wrong, and it fails in a way that is easy to stare past: pressing expand-all twice **expanded twice**.

The engine's method reads `table.getState()`, which is the options object the Angular adapter last
applied — not the store's state. Two writes inside one change-detection pass have the second deciding
against the state before the first. Angular's own signals were fine; the *engine's copy* of the state
was one pass behind.

"Never read state back off the table instance as a source of truth" has been an architectural lock
since ARCH-242, stated in every review checklist, and had — as far as anyone could tell — never once
been the difference between working and not working. It is now. The interesting part is that a lock
can sit unexercised for six waves and still be the thing that saves you, which is an argument for
keeping the ones whose cost is a line of prose.

### Two mechanisms, one test, and a green run that proved less than it looked like

The virtualizer's `estimateSize` had to become index-aware, so an expanded row is
`rowHeight + rowDetailHeight` and the rows beneath move down instead of being overlapped. Reading
`virtual-core` gave a clean prediction: `estimateSize` is **not** among the options the measurement
memo watches, so changing what it returns would compute new sizes nobody reads. An effect calling
`measure()` was added, and a regression test written.

The test passed. It also passed with the effect commented out.

`getItemKey` is a fresh arrow on every options rebuild, and the options rebuild whenever the expansion
slice moves — so its *identity* was already invalidating the memo, entirely by accident. Disabling
either mechanism alone still passed; only disabling both failed. The prediction from source had been
correct and the test still could not see it, because something else was quietly holding the same door.

The explicit call stayed. "Redundant, so delete it" is the tempting read and the wrong one: memoising
`getItemKey` is an obvious optimisation on ten thousand rows, and whoever makes it — in a story with
nothing to do with expansion — would silently put every expanded row back on top of its neighbour.
What changed is the test's comment, which now says plainly that a green run there does not prove the
explicit path works, and tells the next person which second thing to disable.

**The generalisable bit:** verifying a mechanism by disabling it is only conclusive when you disable
*every* mechanism that could be producing the result. A/B against one variable is how you confirm a
redundancy you did not know you had.

### And the browser found the thing nothing else could

The band's height went on `.nge-table__row-detail`. Lint, 1,017 specs, and a full typecheck were
green. The first Storybook load showed it instantly: **every closed row was 161px tall, carrying an
empty 120px band.**

The slot contract was working exactly as designed — the band renders for every row whose table
registered a template, and the *template* does the gating on `isExpanded`. So a height on the band
itself reserves one on every closed row. Off virtualization that is a table of triple-height rows.
On it, the window budgets 40px per closed row while the DOM hands back 161px, and every row overlaps
the next — the precise failure the whole declared-height design exists to prevent, reintroduced by
the CSS while the arithmetic above it was correct.

The fix hangs the height off a `--open` modifier. The follow-on was subtler and also needed the
browser: moving the row's `flex-wrap` onto `--open` as well makes a closed band a `width: 100%` flex
item competing with the lanes in a `nowrap` row. It happened not to squash anything, because that
table had 26px of slack — which is the kind of "works" that stops working on someone else's screen.
The wrap stays keyed on the band merely existing.

jsdom cannot measure a height, but it can hold the class a height hangs off, so four specs now pin it.
ARCH-250 recorded that *a rendering addon is not evidence that a state seam works*. This is the same
sentence in a different key: **a feature that renders is not evidence that its geometry is right**, and
for anything positioned by arithmetic the only instrument that can tell you is a browser.

## The direction an animation is allowed to run (ARCH-300)

The band snapped open, and the ticket to animate it looked like a token and a `transition` line. It
was — but only after two questions had been answered, and both of them are about what a *windowed*
list will let you animate rather than about CSS.

### The declared height paid a second time, and then charged for it

The reason accordions are hard is that `height: auto` is not animatable. That single fact is what
sends implementations into JavaScript measurement, `max-height` guesswork, or a FLIP library. ARCH-298
had declared the band's height for an entirely unrelated reason — the virtualizer has to know a row's
size before it renders it — and a declared height is also a transitionable one. The animation cost
three CSS rules and no measurement anywhere.

Then the bill arrived. Off virtualization the band had deliberately been a `min-height`, so an
un-virtualized table could grow one to arbitrary content: nothing there is positioned by arithmetic,
so nothing can overlap. That cannot animate, and not for a fixable reason — the consumer's template
un-gates its content in the same frame the class flips, so the band jumps straight to content height
whatever the `min-height` is doing. There is no second definite endpoint to transition *to*.

So the choice was: keep the growth affordance and have no animation off virtualization, or converge
both regimes on a definite height and lose the growth. Losing it also turned out to *retire* a trap —
ARCH-299 had had to document that a percentage-height child in a band resolved against a fixed
`height` in one regime and a bare `min-height` in the other, which is a footgun that only exists
because the regimes disagreed. **The generalisable bit:** when a story cannot honour an earlier
decision, the useful question is not "how do I keep both" but "what did that decision cost elsewhere,
and does removing it refund anything". Here it refunded a documented footgun.

### Clip, don't squash — which quietly eliminated the fashionable technique

`grid-template-rows: 0fr → 1fr` is the modern answer to animating to `auto` height, and it would have
kept the growth affordance outright. It was rejected in about a minute, on a constraint from a
different story: the trick works by stretching the item into a collapsing track, so the *content* is
re-laid-out on every frame. A `<nge-chart>` in that content is being re-measured thirty times on the
way open, in a box heading toward zero height — and charts collapse to nothing in a zero-height
parent. `height` plus `overflow` clips instead: the content keeps its own height and is progressively
revealed, laid out exactly once.

The same reasoning caught a subtler one. The open band is `overflow: auto`, so content taller than
the declared height scrolls — ARCH-298's honest failure. But band content is *pitched at* the declared
height, so during the animation it always exceeds the growing box, and a scrollbar appears for the
duration, taking layout space away from the content and re-laying out the chart on every frame. The
fix is to delay the `overflow` flip by exactly the transition's duration, which
`transition-behavior: allow-discrete` makes a one-line matter.

The prediction at the time was "this is invisible on macOS, where overlay scrollbars take no space,
and wrong on Windows" — a tidy story about a bug that hides on the machine it was written on. Then it
was measured. Sweeping the band through the heights the transition passes and reading the chart's box
back gave an identical box at every height with `overflow: hidden`, and an **8px swing on every frame
with `overflow: auto`** — on macOS, in Chrome. Whether a scrollbar takes layout space turns on the
user's *Show scroll bars* setting as much as on the platform, so "overlay scrollbars will save us" is
not a property of an operating system at all. **The lesson survived being wrong, and got better: a
platform-shaped excuse for not measuring is still an excuse for not measuring.**

### The rows beneath, and why the library that solves this was never a candidate

Half the ticket was the decision *not* to animate the rows under an opening band, and to write down
why where the next person will find it.

The answer looks like a library choice and is not. GSAP's FLIP plugin is the standard tool for exactly
this problem — take a before and after position, animate the difference. But FLIP animates by applying
`transform`s, and this library bans `transform` on rows and lanes because a transform creates a
stacking context and a stacking context breaks `position: sticky` for every pinned lane inside it.
The constraint is *no transforms*; GSAP solves *sequencing is hard*. It would land on the same wall as
a hand-rolled version, having added a runtime dependency first. **When rejecting a tool, name the
constraint it fails rather than the problem it solves** — otherwise the rejection reads as taste and
gets reopened every second story.

The hand-rolled version — `transition: top` — fails on its own merits: layout on every rendered row
every frame, against a frozen frame budget. And there was a third argument in the ticket that turned
out to be *wrong in its premise and right in its conclusion*. It said row elements are recycled, so a
blanket `transition: top` would smear every scroll. They are not recycled: the rows are tracked by id,
so a row entering the window is a new element and takes its first `top` without animating. But an
element that survives a **sort** gets a new `top` along with every other row — so the smear is real,
it just happens on re-order rather than on scroll. Checking the premise made the argument stronger,
which is the usual outcome and the reason to check.

### The finding: an animation has a direction, and windowing takes one away

The last one was not in the ticket at all. In normal flow the band animates open *and* closed, and the
rows beneath follow it smoothly — free, because they are in flow. Inside a window the close cannot
animate, and the reason is the same arithmetic that made the open cheap: a virtualized row is
absolutely positioned at a running total, so on collapse the row beneath takes its closed offset in
one frame while the band is still at full height. Rows are transparent by default, so the closing band
goes on painting *through* the row that has already moved over it. Not a subtle seam — a smear.

Opening has the opposite shape and needs no help: the rows make the space in one frame, and the band
grows into it. So the rule the library ships is **the band animates in the direction where the space
already exists** — both ways in flow, one way in a window — and the close is suppressed with a single
`transition: none` on the closed selector, because a transition is chosen from the style the element
is moving *to*.

**The generalisable bit:** in a virtualized list, layout is published by arithmetic in one frame, and
an animation is a claim that the DOM disagrees with that arithmetic for a while. That claim is safe
while the arithmetic has *already made room* and dangerous when it has already taken the room back.
Any windowed collapse, drag-out, or remove animation hits this, and the shape of the fix is the same:
animate into space, never out of it — or hold the geometry back, which is a much larger change than
it looks and belongs to its own ticket.
