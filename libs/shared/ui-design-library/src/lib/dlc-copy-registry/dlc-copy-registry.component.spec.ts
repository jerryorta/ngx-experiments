import type { ComponentFixture } from '@angular/core/testing';

import { Clipboard } from '@angular/cdk/clipboard';
import { TestBed } from '@angular/core/testing';

import type { DlcCopyRegistryItem } from './dlc-copy-registry.model';

import { DlcCopyRegistryComponent } from './dlc-copy-registry.component';

class StubClipboard {
  readonly writes: string[] = [];
  copy(text: string): boolean {
    this.writes.push(text);
    return true;
  }
}

const ITEM_MLS: DlcCopyRegistryItem = {
  id: 'item-1',
  label: 'MLS#',
  source: 'Property card',
  text: 'ACT231887082',
};

const ITEM_ADDRESS: DlcCopyRegistryItem = {
  id: 'item-2',
  label: 'Address',
  source: 'Detail panel',
  text: '123 Main St, Austin, TX 78701',
};

describe('DlcCopyRegistryComponent', () => {
  let component: DlcCopyRegistryComponent;
  let fixture: ComponentFixture<DlcCopyRegistryComponent>;
  let clipboard: StubClipboard;
  let copyAllEmissions: number;
  let clearAllEmissions: number;
  let removeItemEmissions: string[];
  let copyItemEmissions: string[];
  let autoClearEmissions: boolean[];

  function queryEmpty(): HTMLElement | null {
    return fixture.nativeElement.querySelector('[data-testid="copy-registry-empty"]');
  }

  function queryItems(): HTMLElement[] {
    return Array.from(
      fixture.nativeElement.querySelectorAll<HTMLElement>('[data-testid="copy-registry-item"]')
    );
  }

  function queryCopyAll(): HTMLElement {
    return fixture.nativeElement.querySelector('[data-testid="copy-registry-copy-all"]');
  }

  function queryClearAll(): HTMLElement {
    return fixture.nativeElement.querySelector('[data-testid="copy-registry-clear-all"]');
  }

  function queryItemCopyButtons(): HTMLElement[] {
    return Array.from(
      fixture.nativeElement.querySelectorAll<HTMLElement>('[data-testid="copy-registry-item-copy"]')
    );
  }

  function queryItemRemoveButtons(): HTMLElement[] {
    return Array.from(
      fixture.nativeElement.querySelectorAll<HTMLElement>(
        '[data-testid="copy-registry-item-remove"]'
      )
    );
  }

  function queryAutoClearInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector(
      '[data-testid="copy-registry-auto-clear"] input[type="checkbox"]'
    );
  }

  beforeEach(async () => {
    clipboard = new StubClipboard();
    await TestBed.configureTestingModule({
      imports: [DlcCopyRegistryComponent],
      providers: [{ provide: Clipboard, useValue: clipboard }],
    }).compileComponents();

    fixture = TestBed.createComponent(DlcCopyRegistryComponent);
    component = fixture.componentInstance;

    copyAllEmissions = 0;
    clearAllEmissions = 0;
    removeItemEmissions = [];
    copyItemEmissions = [];
    autoClearEmissions = [];

    component.copyAll.subscribe(() => copyAllEmissions++);
    component.clearAll.subscribe(() => clearAllEmissions++);
    component.removeItem.subscribe((id: string) => removeItemEmissions.push(id));
    component.copyItem.subscribe((id: string) => copyItemEmissions.push(id));
    component.autoClearChange.subscribe((checked: boolean) => autoClearEmissions.push(checked));

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply the dlc-copy-registry host class', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('dlc-copy-registry')).toBe(true);
  });

  describe('empty state', () => {
    it('should render the empty placeholder when items is empty', () => {
      expect(queryEmpty()).not.toBeNull();
      expect(queryItems()).toHaveLength(0);
    });

    it('should disable Copy All and Clear All in the empty state', () => {
      expect(queryCopyAll().querySelector('button')?.hasAttribute('disabled')).toBe(true);
      expect(queryClearAll().querySelector('button')?.hasAttribute('disabled')).toBe(true);
    });

    it('should not emit copyAll or write to the clipboard when Copy All is clicked while empty', () => {
      queryCopyAll().dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();
      expect(copyAllEmissions).toBe(0);
      expect(clipboard.writes).toHaveLength(0);
    });

    it('should not emit clearAll when Clear All is clicked while empty', () => {
      queryClearAll().dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();
      expect(clearAllEmissions).toBe(0);
    });

    it('should honor custom emptyMessage and emptyHint inputs', () => {
      fixture.componentRef.setInput('emptyMessage', 'Nothing yet');
      fixture.componentRef.setInput('emptyHint', 'Copy something to get started');
      fixture.detectChanges();
      const empty = queryEmpty();
      expect(empty?.textContent).toContain('Nothing yet');
      expect(empty?.textContent).toContain('Copy something to get started');
    });
  });

  describe('populated list', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('items', [ITEM_MLS, ITEM_ADDRESS]);
      fixture.detectChanges();
    });

    it('should hide the empty placeholder when items has entries', () => {
      expect(queryEmpty()).toBeNull();
    });

    it('should render one row per item with label, source, and text', () => {
      const items = queryItems();
      expect(items).toHaveLength(2);
      expect(items[0].textContent).toContain('MLS#');
      expect(items[0].textContent).toContain('Property card');
      expect(items[0].textContent).toContain('ACT231887082');
    });

    it('should render the item count badge', () => {
      const badge = fixture.nativeElement.querySelector(
        '[data-testid="copy-registry-count"]'
      ) as HTMLElement | null;
      expect(badge?.textContent?.trim()).toBe('2');
    });

    it('should copy a single item to the clipboard and emit copyItem on the per-item copy button', () => {
      const copyButtons = queryItemCopyButtons();
      copyButtons[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();
      expect(clipboard.writes).toEqual([ITEM_MLS.text]);
      expect(copyItemEmissions).toEqual([ITEM_MLS.id]);
    });

    it('should emit removeItem with the row id on the per-item remove button', () => {
      const removeButtons = queryItemRemoveButtons();
      removeButtons[1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();
      expect(removeItemEmissions).toEqual([ITEM_ADDRESS.id]);
    });

    it('should write the joined item texts to the clipboard and emit copyAll on Copy All', () => {
      queryCopyAll().dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();
      expect(clipboard.writes).toEqual([`${ITEM_MLS.text}\n${ITEM_ADDRESS.text}`]);
      expect(copyAllEmissions).toBe(1);
    });

    it('should emit clearAll on Clear All without touching the clipboard', () => {
      queryClearAll().dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();
      expect(clearAllEmissions).toBe(1);
      expect(clipboard.writes).toHaveLength(0);
    });
  });

  describe('auto-clear toggle', () => {
    it('should default to unchecked', () => {
      expect(queryAutoClearInput().checked).toBe(false);
    });

    it('should reflect the autoClearAfterPaste input on the checkbox', () => {
      fixture.componentRef.setInput('autoClearAfterPaste', true);
      fixture.detectChanges();
      expect(queryAutoClearInput().checked).toBe(true);
    });

    it('should emit autoClearChange on user toggle', () => {
      const input = queryAutoClearInput();
      input.checked = true;
      input.dispatchEvent(new Event('change'));
      fixture.detectChanges();
      expect(autoClearEmissions.pop()).toBe(true);
    });
  });

  describe('title input', () => {
    it('should default to "Copy Registry"', () => {
      const title = fixture.nativeElement.querySelector('.dlc-copy-registry__title') as HTMLElement;
      expect(title.textContent?.trim()).toBe('Copy Registry');
    });

    it('should reflect a custom title', () => {
      fixture.componentRef.setInput('title', 'Pasteboard');
      fixture.detectChanges();
      const title = fixture.nativeElement.querySelector('.dlc-copy-registry__title') as HTMLElement;
      expect(title.textContent?.trim()).toBe('Pasteboard');
    });
  });
});
