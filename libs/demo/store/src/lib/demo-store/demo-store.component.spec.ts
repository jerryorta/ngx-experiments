import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DemoStoreComponent } from './demo-store.component';

describe('DemoStoreComponent', () => {
  let component: DemoStoreComponent;
  let fixture: ComponentFixture<DemoStoreComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DemoStoreComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DemoStoreComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
