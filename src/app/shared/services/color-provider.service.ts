import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ColorProviderService {

  private colors = ['#7F7F7F', '#B9F442', '#17BECF']; // TODO add more
  private colorGenerator;

  constructor() {
    this.colorGenerator = this.colorGeneratorFunction();
  }

  private *colorGeneratorFunction(position: number = 0) {
    while (true) {
      yield this.colors[(position++) % this.colors.length];
    }
  }

  get(): string {
    return this.colorGenerator.next().value;
  }
}
