import { Injectable } from '@angular/core';
import { Measurement } from '../model/chart.model';

@Injectable({
  providedIn: 'root'
})
export class ChartService {

  constructor() { }

  splitData(measurements: Measurement[]) {
    const xAxis = [], yAxis = [];
    for (const measurement of measurements) {
      xAxis.push(measurement.timestamp);
      yAxis.push(measurement.value);
    }
    return { xAxis, yAxis };
  }
}
