/**
 * A single entry in the {@link DlcCopyRegistryComponent} list.
 *
 * The leaf is purely presentational — registry state (the items array, the
 * auto-clear flag) is owned by the consuming page system's component-scoped
 * SignalStore. The leaf only renders the list and forwards interactions.
 */
export interface DlcCopyRegistryItem {
  /**
   * Stable id used for `@for` tracking and as the payload of the
   * `removeItem` / `copyItem` outputs.
   */
  readonly id: string;

  /**
   * Optional short tag (e.g. `MLS#`, `Address`) shown above the text. Kept
   * separate from the text body so the consumer doesn't have to format the
   * label into the clipboard payload.
   */
  readonly label?: string;

  /**
   * Optional source context (e.g. property card heading, detail-panel page).
   * Surfaced beneath the label as a small dimmed line so the user can trace
   * where they copied from.
   */
  readonly source?: string;

  /** The text written to the system clipboard on Copy All / per-item copy. */
  readonly text: string;
}
