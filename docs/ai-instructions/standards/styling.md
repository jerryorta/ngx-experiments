---
applyTo: '**/*.scss'
title: Theming tokens (new components)
---

New components theme via their OWN `--<prefix>-*` CSS-variable tokens with literal fallbacks — never Material `--mat-sys-*` (legacy EC/RE only). The "Tailwind-preferred / no mat-sys" invariants are enforced separately; these are the shapes.

- Prefer Tailwind token refs in the template over SCSS:

```html
<span class="text-[var(--giga-calendar-primary,#2563eb)]">…</span>
<div class="bg-[var(--giga-calendar-surface-container,#f3f4f6)]">…</div>
```

- Use SCSS only for: defining override tokens, pseudo-elements, or selectors Tailwind can't express:

```scss
.giga-calendar { --giga-calendar-header-color: var(--giga-calendar-on-surface-variant, #475569); }
.giga-calendar::before { background-color: var(--giga-calendar-primary, #2563eb); }
```

- Always pair a token with a literal fallback: `var(--<prefix>-token, <literal>)`.
