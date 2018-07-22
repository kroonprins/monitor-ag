const functions = require('firebase-functions');

// google functions is node v6 => no async/await :'(

const admin = require('firebase-admin');
admin.initializeApp();
const firestore = admin.firestore();

/**
 * Retrieve the different types from the firestore so that identifier of the measurement type of dynatrace can be mapped on the firestore id
 */
const getTypes = () => {
  return firestore.collection('types').get().then(typesQueryResponse => {
    const types = [];
    typesQueryResponse.forEach(doc => {
      const id = doc.id
      const data = doc.data()
      types.push(Object.assign({
        id: id,
      }, data));
    });
    return types
  });
}

/**
 * Map types returned from firestore to a map structured as (dynatraceID => id)
 * @param {*} types the types array as returned from firestore
 */
const mapTypes = (types) => {
  const typesMapping = {}
  types.forEach(type => {
    const key = type['dynatraceID'];
    const value = type['id']
    typesMapping[key] = value
  })
  return typesMapping
}

/**
 * Add measurements to firestore for a specific measurements type. Returns a list of promises for each update sent to firestore.
 */
const addMeasurements = (measurementType, input, typesMapping) => {
  const promises = []

  const measurements = input[measurementType]
  for (let type of Object.keys(measurements)) {
    const mappedType = typesMapping[type]
    for (let measurement of measurements[type]) {
      const log = JSON.stringify(measurement)
      const measurementTypeRef = firestore.collection(`${measurementType}/${mappedType}/measurements`);
      promises.push(measurementTypeRef.add({
        // timestamp: firebase.firestore.Timestamp.fromMillis(measurement.timestamp),
        timestamp: new Date(measurement.timestamp),
        value: measurement.value
      }))
    }
  }

  return promises
}

/**
 * Add all received measurements to firestore. Returns a list of promises for each update sent to firestore.
 */
const addToFirestore = (input, typesMapping) => {
  return Promise.all([
    ...(addMeasurements('requestCounts', input, typesMapping)),
    ...(addMeasurements('responseTimes', input, typesMapping))
  ])
}

// TODO investigate batched writes
exports.measurements = functions.https.onRequest((request, response) => {
  const input = request.body

  return getTypes()
    .then(mapTypes)
    .then(typesMapping => {
      return addToFirestore(input, typesMapping)
    })
    .then(() => {
      response.status(201)
      return response.send();
    }).catch(e => {
      console.log('An error occurred.', e.stack)
      response.status(500)
      response.set('Content-Type', 'application/json')
      return response.send({
        error: e.msg
      })
    });
});
