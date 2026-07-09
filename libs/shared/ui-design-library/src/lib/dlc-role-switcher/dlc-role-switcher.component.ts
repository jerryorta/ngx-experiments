import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  ViewEncapsulation,
} from '@angular/core';

import { DlcIconDirective } from '../dlc-icon/dlc-icon.directive';

export type DlcPersonaRole = 'home' | 'professional' | 'service-provider';

export interface DlcRoleOption {
  icon: string;
  label: string;
  role: DlcPersonaRole;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'dlc-role-switcher',
  },
  imports: [DlcIconDirective],
  selector: 'dlc-role-switcher',
  styleUrl: './dlc-role-switcher.component.scss',
  templateUrl: './dlc-role-switcher.component.html',
})
export class DlcRoleSwitcherComponent {
  readonly activeRole = input<DlcPersonaRole>('professional');
  readonly roleChange = output<DlcPersonaRole>();

  protected _open = false;

  readonly roles: DlcRoleOption[] = [
    { icon: 'real_estate_agent', label: 'Broker / Agent', role: 'professional' },
    { icon: 'home', label: 'Buyer / Seller', role: 'home' },
    { icon: 'construction', label: 'Service Provider', role: 'service-provider' },
  ];

  protected getActiveOption(): DlcRoleOption {
    return this.roles.find(r => r.role === this.activeRole()) ?? this.roles[0];
  }

  protected selectRole(role: DlcPersonaRole): void {
    this.roleChange.emit(role);
    this._open = false;
  }
}
