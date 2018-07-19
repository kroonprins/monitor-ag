import firebase from "firebase";

firebase.initializeApp({
  apiKey: "AIzaSyD55zKkQhdy9IHcNkTb8U0ilYAmfXmBlWU",
  authDomain: "monitoring-ag.firebaseapp.com",
  databaseURL: "https://monitoring-ag.firebaseio.com",
  projectId: "monitoring-ag",
  storageBucket: "monitoring-ag.appspot.com",
  messagingSenderId: "630084452643"
});

const firestore = firebase.firestore();
const settings = {
  timestampsInSnapshots: true
};
firestore.settings(settings);

const getTypes = async () => {
  const typesRef = firestore.collection('types');
  const typesQueryResponse = await typesRef.get();
  const types = [];
  typesQueryResponse.forEach(doc => {
    const id = doc.id
    const data = doc.data()
    types.push({ id, ...data })
  });
  return types
}

const addMeasurement = async (measurementType, type, timestamp, value) => {
  const measurementTypeRef = firestore.collection(`${measurementType}/${type}/measurements`);
  await measurementTypeRef.add({
    timestamp: timestamp,
    value: value
  })
}

const wait = async (secs) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve()
    }, secs)
  });
}

const random = (max) => {
  return +((Math.random()*100)%max).toFixed(2)
}

(async () => {
  const types = await getTypes()

  while(true) {
    let timestamp = firebase.firestore.Timestamp.now()
    await addMeasurement('responseTimes', types[0].id, timestamp, random(5))
    await addMeasurement('responseTimes', types[1].id, timestamp, random(5))
    await addMeasurement('responseTimes', types[2].id, timestamp, random(5))
    await wait(1000)
  }

  process.exit(0)
})();
