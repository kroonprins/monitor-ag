import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import * as Plotly from 'plotly.js';
import { AngularFirestore } from 'angularfire2/firestore';
import { Timestamp } from 'firebase/firestore';
import { Type } from '../model/chart-types';

@Component({
  selector: 'app-request-counts-chart',
  templateUrl: './request-counts-chart.component.html',
  styleUrls: ['./request-counts-chart.component.css']
})
export class RequestCountsChartComponent implements OnInit {

  @ViewChild('requestCountChart') el: ElementRef;

  private chartData = {};
  private types: Type[];

  private colors = [ '#7F7F7F', '#B9F442', '#17BECF' ]; // TODO add more
  private colorGenerator; // TODO make service
  private colorMapping = {}

  constructor(private angularFirestore: AngularFirestore) {
    this.colorGenerator = this.generateColor();
  }

  ngOnInit() {
    this.angularFirestore
      .collection('types')
      .snapshotChanges()
      .forEach(values => {
        this.types = values.map(val => {
          const type = new Type();
          type.id = val.payload.doc.id;
          const data = val.payload.doc.data();
          type.description = data['description'];
          return type;
        });
        for (let type of this.types) {
          this.angularFirestore
            .doc(`requestCounts/${type.id}`)
            // .doc(`responseTimes/${type.id}`)
            .collection('measurements', ref => ref.orderBy('timestamp')/*.limit(100)*/)
            .valueChanges()
            .forEach(val => {
              this.createChartData(val, type);
              this.drawChart();
            });
        }
      });
  }

  createChartData(data: any[], type: Type) {
    const x = [], y = [];
    for (let measurement of data) {
      x.push(<Timestamp>(measurement['timestamp']).toDate())
      y.push(measurement['value'])
    }
    let color = this.colorMapping[type.id];
    if(!color) {
      color = this.colorGenerator.next().value
      this.colorMapping[type.id] = color
    }
    this.chartData[type.id] = {
      x: x,
      y: y,
      type: 'scatter',
      mode: 'lines',
      name: type.description,
      line: { color: color }
    }
  }

  drawChart() {
    Plotly.newPlot(
      this.el.nativeElement,
      Object.values(this.chartData),
      {
        title: 'Request count'
      }
    );
  }

  *generateColor(position: number = 0) {
    while(true) {
      yield this.colors[(position++)%this.colors.length]
    }
  }

}
