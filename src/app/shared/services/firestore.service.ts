import { Injectable } from '@angular/core';
import { AngularFirestore, DocumentChangeAction } from 'angularfire2/firestore';
import { take, map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { Type, Measurement } from '../model/chart.model';
import { Timestamp } from 'firebase/firestore';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {

  private typesObervable: Observable<Type[]>;

  constructor(private angularFirestore: AngularFirestore) { }

  getTypes(): Observable<Type[]> {
    if (!this.typesObervable) {
      this.typesObervable = this.angularFirestore
        .collection('types')
        .snapshotChanges()
        .pipe(take(1))
        .pipe(map(values => {
          return values.map(val => {
            const type = new Type();
            type.id = val.payload.doc.id;
            const data = val.payload.doc.data();
            type.description = data['description'];
            return type;
          });
        }));
    }
    return this.typesObervable;
  }

  getMeasurements(measurement: string, type: Type): Observable<Measurement[]> {
    return this.angularFirestore
      .doc(`${measurement}/${type.id}`)
      .collection('measurements', ref => ref.orderBy('timestamp', 'desc').limit(360))
      .valueChanges()
      .pipe(map(measurements => {
        return measurements.map(aMeasurement => {
          return new Measurement( (<Timestamp>(aMeasurement['timestamp']).toDate()) , aMeasurement['value']);
        });
      }));
  }
}
