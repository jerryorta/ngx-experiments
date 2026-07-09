import { Component, computed, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { DlcCopyRegistryItem } from '../dlc-copy-registry.model';

import { DlcCopyRegistryComponent } from '../dlc-copy-registry.component';

const SEED_ITEMS: readonly DlcCopyRegistryItem[] = [
  {
    id: 'seed-mls-1',
    label: 'MLS#',
    source: '123 Main St — Property card',
    text: 'ACT231887082',
  },
  {
    id: 'seed-address-1',
    label: 'Address',
    source: '123 Main St — Detail panel',
    text: '123 Main St, Austin, TX 78701',
  },
  {
    id: 'seed-mls-2',
    label: 'MLS#',
    source: '456 Elm Ave — Property card',
    text: 'ACT220415735',
  },
];

@Component({
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-copy-registry-stories' },
  imports: [DlcCopyRegistryComponent, NgeStorybookReviewContainerComponent],
  selector: 'dlc-copy-registry-stories',
  standalone: true,
  styleUrl: './dlc-copy-registry-stories.component.scss',
  templateUrl: './dlc-copy-registry-stories.component.html',
})
export class DlcCopyRegistryStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/concierge/design-library/src/lib/dlc-copy-registry/stories';

  // Independent backing state for the interactive instance — the leaf is
  // controlled, so the stories component plays the role of the page store:
  // mutate items on remove/clear, flip the auto-clear flag on autoClearChange,
  // clear all items on copyAll when auto-clear is on.
  readonly interactiveAutoClear = signal(false);
  readonly interactiveItems = signal<readonly DlcCopyRegistryItem[]>(SEED_ITEMS);

  readonly interactiveCount = computed(() => this.interactiveItems().length);

  // Read-only "empty state" + "populated" instances for the static blocks.
  readonly populatedItems: readonly DlcCopyRegistryItem[] = SEED_ITEMS;

  onInteractiveAutoClearChange(checked: boolean): void {
    this.interactiveAutoClear.set(checked);
  }

  onInteractiveClearAll(): void {
    this.interactiveItems.set([]);
  }

  onInteractiveCopyAll(): void {
    // Mirror the auto-clear contract — the leaf wrote to the clipboard,
    // we drop the list when the toggle is on.
    if (this.interactiveAutoClear()) {
      this.interactiveItems.set([]);
    }
  }

  onInteractiveRemoveItem(id: string): void {
    this.interactiveItems.update(items => items.filter(item => item.id !== id));
  }

  /**
   * Re-seeds the interactive list after the user clears it, so reviewers can
   * play with Copy All / Clear All / Auto-clear without reloading the story.
   */
  onResetInteractive(): void {
    this.interactiveItems.set(SEED_ITEMS);
    this.interactiveAutoClear.set(false);
  }
}
