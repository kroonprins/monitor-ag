class Type {
  id: string;
  description: string;
}

class Measurement {
  timestamp: Date;
  value: number;

  constructor(timestamp: Date, value: number) {
    this.timestamp = timestamp;
    this.value = value;
  }
}

export {
  Type,
  Measurement
};
