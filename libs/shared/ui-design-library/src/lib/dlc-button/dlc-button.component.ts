import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { gsap } from 'gsap';

export type DlcButtonVariant = 'danger' | 'ghost' | 'primary';
export type DlcButtonSize = 'lg' | 'md' | 'sm';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class.dlc-button--danger]': 'variant() === "danger"',
    '[class.dlc-button--disabled]': 'disabled()',
    '[class.dlc-button--ghost]': 'variant() === "ghost"',
    '[class.dlc-button--lg]': 'size() === "lg"',
    '[class.dlc-button--light]': 'light()',
    '[class.dlc-button--loading]': 'loading()',
    '[class.dlc-button--md]': 'size() === "md"',
    '[class.dlc-button--primary]': 'variant() === "primary"',
    '[class.dlc-button--sm]': 'size() === "sm"',
    class: 'dlc-button',
  },
  imports: [],
  selector: 'dlc-button',
  styleUrl: './dlc-button.component.scss',
  templateUrl: './dlc-button.component.html',
})
export class DlcButtonComponent {
  private readonly el = inject(ElementRef);

  readonly disabled = input(false);
  readonly light = input(false);
  readonly loading = input(false);
  readonly size = input<DlcButtonSize>('md');
  readonly variant = input<DlcButtonVariant>('primary');

  readonly buttonClasses = computed(() => {
    const sizeMap: Record<DlcButtonSize, string> = {
      lg: 'px-6 py-3 text-base',
      md: 'px-5 py-2.5 text-sm',
      sm: 'px-3 py-1.5 text-xs',
    };
    const stateClass =
      this.disabled() || this.loading() ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';
    return `inline-flex w-full items-center justify-center gap-2 font-medium transition-opacity ${sizeMap[this.size()]} ${stateClass}`;
  });

  @HostListener('mousedown')
  onMouseDown(): void {
    if (this.disabled() || this.loading()) return;
    gsap.to(this.el.nativeElement, { duration: 0.08, ease: 'power2.out', scale: 0.97 });
  }

  @HostListener('mouseleave')
  @HostListener('mouseup')
  onRelease(): void {
    if (this.disabled() || this.loading()) return;
    gsap.to(this.el.nativeElement, { duration: 0.15, ease: 'power2.out', scale: 1 });
  }
}
