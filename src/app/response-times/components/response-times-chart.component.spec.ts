import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ResponseTimesChartComponent } from './response-times-chart.component';

describe('ResponseTimesChartComponent', () => {
  let component: ResponseTimesChartComponent;
  let fixture: ComponentFixture<ResponseTimesChartComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ResponseTimesChartComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ResponseTimesChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
