import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { RequestCountsChartComponent } from './request-counts-chart.component';

describe('RequestCountsChartComponent', () => {
  let component: RequestCountsChartComponent;
  let fixture: ComponentFixture<RequestCountsChartComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RequestCountsChartComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RequestCountsChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
