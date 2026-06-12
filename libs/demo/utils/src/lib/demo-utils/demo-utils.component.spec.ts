import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DemoUtilsComponent } from './demo-utils.component';

describe('DemoUtilsComponent', () => {
  let component: DemoUtilsComponent;
  let fixture: ComponentFixture<DemoUtilsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DemoUtilsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DemoUtilsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
