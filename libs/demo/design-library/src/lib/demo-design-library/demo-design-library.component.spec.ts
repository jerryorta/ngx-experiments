import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DemoDesignLibraryComponent } from './demo-design-library.component';

describe('DemoDesignLibraryComponent', () => {
  let component: DemoDesignLibraryComponent;
  let fixture: ComponentFixture<DemoDesignLibraryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DemoDesignLibraryComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DemoDesignLibraryComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
