import { Component } from '@angular/core';
import { AngularFireAuth } from 'angularfire2/auth';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  user: string;
  password: string;
  invalidCredentials: boolean;

  constructor(public afAuth: AngularFireAuth) { }

  login() {
    this.afAuth.auth.signInWithEmailAndPassword(this.user, this.password)
      .then(response => {
        this.invalidCredentials = false;
      })
      .catch(error => {
        this.invalidCredentials = true;
      });
  }

  logout() {
    this.afAuth.auth.signOut();
  }
}
