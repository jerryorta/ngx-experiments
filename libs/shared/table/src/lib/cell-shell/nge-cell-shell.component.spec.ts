import { TestBed } from '@angular/core/testing';

import { NgeCellShellComponent } from './nge-cell-shell.component';

// jsdom does not lay out, so nothing here asserts a size — the shell's whole job is
// geometric and belongs to the browser (`Table/NgeTable/Chart Cells/Interaction`).
// What it CAN prove is the part a regression would break silently: that the element
// carries the class the stylesheet selects on, that it stays hidden from assistive
// technology, and that it renders nothing of its own to hold stale state between
// virtualization recycles.
describe('NgeCellShellComponent', () => {
  function render(): HTMLElement {
    const fixture = TestBed.createComponent(NgeCellShellComponent);
    fixture.detectChanges();

    return fixture.nativeElement as HTMLElement;
  }

  it('carries the class its stylesheet selects on', () => {
    expect(render().classList.contains('nge-cell-shell')).toBe(true);
  });

  // A placeholder announced to a screen reader is noise: it stands in for content
  // that has not been drawn, and the real content is what should be met. In
  // practice it always is — the flag is settled whenever the viewport is quiet.
  it('is hidden from assistive technology', () => {
    expect(render().getAttribute('aria-hidden')).toBe('true');
  });

  // The host element IS the shell. A child node would be one more element per
  // rendered cell across a window that can hold hundreds, and anything bound
  // inside it would be a value to go stale when the node is recycled onto a
  // different row.
  it('renders no content of its own', () => {
    expect(render().children.length).toBe(0);
  });
});
