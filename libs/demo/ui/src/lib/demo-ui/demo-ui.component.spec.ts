import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DemoUiComponent } from './demo-ui.component';

describe('DemoUiComponent', () => {
  let component: DemoUiComponent;
  let fixture: ComponentFixture<DemoUiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DemoUiComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DemoUiComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
