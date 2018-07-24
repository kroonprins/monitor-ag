import { Component, OnInit, ViewChild, ElementRef, Input } from '@angular/core';
import * as Plotly from 'plotly.js';
import { Type, Measurement } from '../model/chart.model';
import { FirestoreService } from '../services/firestore.service';
import { ColorProviderService } from '../services/color-provider.service';
import { ChartService } from '../services/chart.service';

@Component({
  selector: 'app-line-chart',
  templateUrl: './line-chart.component.html',
  styleUrls: ['./line-chart.component.css']
})
export class LineChartComponent implements OnInit {

  @Input()
  measurement: string;
  @Input()
  title: string;

  @ViewChild('lineChart') el: ElementRef;

  private chartData = {};

  constructor(
    private firestoreService: FirestoreService,
    private chartService: ChartService,
    private colorGenerator: ColorProviderService) { }

  ngOnInit() {
    this.firestoreService.getTypes()
      .subscribe(types => {
        for (const type of types) {
          this.firestoreService.getMeasurements(this.measurement, type)
            .subscribe(measurements => {
              this.createChartData(measurements, type);
              this.drawChart(); // split in separate method because might become necessary to "batch" redrawings
            });
        }
      });
  }

  createChartData(measurements: Measurement[], type: Type) {
    const { xAxis, yAxis } = this.chartService.splitData(measurements);

    const chartDataDoesNotExist = !this.chartData[type.id];
    if (chartDataDoesNotExist) {
      this.chartData[type.id] = {
        x: xAxis,
        y: yAxis,
        type: 'scatter',
        mode: 'lines',
        name: type.description,
        line: { color: this.colorGenerator.get() }
      };
    } else {
      const chartData = this.chartData[type.id];
      chartData.x = xAxis;
      chartData.y = yAxis;
    }
  }

  drawChart() {
    Plotly.newPlot(
      this.el.nativeElement,
      Object.values(this.chartData),
      {
        title: this.title,
        showlegend: true,
        legend: {
          x: 0,
          y: 1,
          "orientation": "h"
        },
        margin: {
          l: 40,
          r: 10
        }
      }
    );
  }
}
