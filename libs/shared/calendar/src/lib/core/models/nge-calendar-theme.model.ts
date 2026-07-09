/**
 * A partial map of `--nge-calendar-*` CSS custom-property names to their
 * values, used to theme `<nge-calendar>` from the consumer side.
 *
 * Only the *shape* is constrained here — every key must be a
 * `--nge-calendar-*` custom property. The authoritative, full token set and
 * the host-binding that applies it are S5 / ARCH-65's responsibility; this type
 * exists so config models can reference a theme without that work landing yet.
 */
export type NgeCalendarTheme = Record<`--nge-calendar-${string}`, string>;
