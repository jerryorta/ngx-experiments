import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { applicationConfig, type Meta, moduleMetadata, type StoryObj } from '@storybook/angular';

import { DlcCellDirective } from '../dlc-cell.directive';
import { DlcDataTableComponent } from '../dlc-data-table.component';
import { DlcDataTableStoriesComponent } from './dlc-data-table-stories.component';

const meta: Meta<DlcDataTableStoriesComponent> = {
  component: DlcDataTableStoriesComponent,
  decorators: [
    applicationConfig({
      providers: [provideAnimationsAsync()],
    }),
  ],
  parameters: { themeGroup: 'cg' },
  title: 'UI Design Library/Data Table',
};

export default meta;
type Story = StoryObj<DlcDataTableStoriesComponent>;

export const primary: Story = {
  args: {},
  name: 'Data Table',
};

export const ThemeShowcase: Story = {
  decorators: [moduleMetadata({ imports: [DlcDataTableComponent, DlcCellDirective] })],
  name: 'Theme Showcase',
  render: () => ({
    template: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
        <div class="dlc-professional-light" style="padding:1.5rem;background:var(--dlc-surface)">
          <p style="margin-bottom:0.5rem;font-size:0.75rem;font-weight:600;opacity:0.5">Professional · Light</p>
          <dlc-data-table
            [columns]="[{key:'name',label:'Name',sticky:true},{key:'status',label:'Status'}]"
            [groups]="[{label:'Active Clients',accentColor:'#4caf50',collapsible:true,rows:[{name:'Alice Johnson',status:'active'},{name:'Bob Martinez',status:'active'}]},{label:'Leads',accentColor:'#ff9800',collapsible:true,rows:[{name:'Carol Smith',status:'pending'}]}]"
          ></dlc-data-table>
        </div>
        <div class="dlc-professional-dark" style="padding:1.5rem;background:var(--dlc-surface)">
          <p style="margin-bottom:0.5rem;font-size:0.75rem;font-weight:600;opacity:0.5">Professional · Dark</p>
          <dlc-data-table
            [columns]="[{key:'name',label:'Name',sticky:true},{key:'status',label:'Status'}]"
            [groups]="[{label:'Active Clients',accentColor:'#4caf50',collapsible:true,rows:[{name:'Alice Johnson',status:'active'},{name:'Bob Martinez',status:'active'}]},{label:'Leads',accentColor:'#ff9800',collapsible:true,rows:[{name:'Carol Smith',status:'pending'}]}]"
          ></dlc-data-table>
        </div>
        <div class="dlc-home-light" style="padding:1.5rem;background:var(--dlc-surface)">
          <p style="margin-bottom:0.5rem;font-size:0.75rem;font-weight:600;opacity:0.5">Home · Light</p>
          <dlc-data-table
            [columns]="[{key:'name',label:'Name',sticky:true},{key:'status',label:'Status'}]"
            [groups]="[{label:'Active Clients',accentColor:'#4caf50',collapsible:true,rows:[{name:'Alice Johnson',status:'active'},{name:'Bob Martinez',status:'active'}]},{label:'Leads',accentColor:'#ff9800',collapsible:true,rows:[{name:'Carol Smith',status:'pending'}]}]"
          ></dlc-data-table>
        </div>
        <div class="dlc-home-dark" style="padding:1.5rem;background:var(--dlc-surface)">
          <p style="margin-bottom:0.5rem;font-size:0.75rem;font-weight:600;opacity:0.5">Home · Dark</p>
          <dlc-data-table
            [columns]="[{key:'name',label:'Name',sticky:true},{key:'status',label:'Status'}]"
            [groups]="[{label:'Active Clients',accentColor:'#4caf50',collapsible:true,rows:[{name:'Alice Johnson',status:'active'},{name:'Bob Martinez',status:'active'}]},{label:'Leads',accentColor:'#ff9800',collapsible:true,rows:[{name:'Carol Smith',status:'pending'}]}]"
          ></dlc-data-table>
        </div>
        <div class="dlc-service-provider-light" style="padding:1.5rem;background:var(--dlc-surface)">
          <p style="margin-bottom:0.5rem;font-size:0.75rem;font-weight:600;opacity:0.5">Service Provider · Light</p>
          <dlc-data-table
            [columns]="[{key:'name',label:'Name',sticky:true},{key:'status',label:'Status'}]"
            [groups]="[{label:'Active Clients',accentColor:'#4caf50',collapsible:true,rows:[{name:'Alice Johnson',status:'active'},{name:'Bob Martinez',status:'active'}]},{label:'Leads',accentColor:'#ff9800',collapsible:true,rows:[{name:'Carol Smith',status:'pending'}]}]"
          ></dlc-data-table>
        </div>
        <div class="dlc-service-provider-dark" style="padding:1.5rem;background:var(--dlc-surface)">
          <p style="margin-bottom:0.5rem;font-size:0.75rem;font-weight:600;opacity:0.5">Service Provider · Dark</p>
          <dlc-data-table
            [columns]="[{key:'name',label:'Name',sticky:true},{key:'status',label:'Status'}]"
            [groups]="[{label:'Active Clients',accentColor:'#4caf50',collapsible:true,rows:[{name:'Alice Johnson',status:'active'},{name:'Bob Martinez',status:'active'}]},{label:'Leads',accentColor:'#ff9800',collapsible:true,rows:[{name:'Carol Smith',status:'pending'}]}]"
          ></dlc-data-table>
        </div>
      </div>`,
  }),
};
