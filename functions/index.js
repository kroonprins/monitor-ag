const functions = require('firebase-functions');

// google functions is node v6 => no async/await :'(

const admin = require('firebase-admin');
admin.initializeApp();
const firestore = admin.firestore();

let cachedTypeMapping = undefined; // "cached", as in not recalculated if the function's context hasn't been re-initialized (cfr https://firebase.google.com/docs/functions/tips)

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
      const measurementTypeRef = firestore.collection(`${measurementType}/${mappedType}/measurements`);
      promises.push(measurementTypeRef.add({
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

const validateInput = request => {
  if (request.method !== 'POST') {
    return { ok: false, responseCode: 405, message: `Method ${request.method} is not allowed` };
  }

  const contentType = request.header('Content-Type')
  if (!request.header('Content-Type').toLowerCase().startsWith('application/json')) {
    return { ok: false, responseCode: 406, message: `Content-type ${contentType} is not allowed` };
  }

  // very very very basic authentication mechanism :)
  const body = request.body
  if(!body.auth) {
    console.warn('Request with missing auth');
    return { ok: false, responseCode: 401, message: `Auth failed` };
  }
  const password = functions.config().monitoring_ag.the_magic_password
  if(!password) {
    throw new Error('The magic password has not been set. Set it with command: firebase functions:config:set monitoring_ag.the_magic_password="..."')
  }
  if(body.auth !== password) {
    console.warn('Request with wrong auth', body.auth);
    return { ok: false, responseCode: 401, message: `Auth failed` };
  }

  return { ok: true }
}

// TODO investigate batched writes
exports.measurements = functions.https.onRequest((request, response) => {
  const { ok, responseCode, message } = validateInput(request)
  if (!ok) {
    console.log('Input validation failed', message);
    response.status(responseCode)
    response.set('Content-Type', 'application/json')
    return response.send({
      error: message
    })
  }

  let typesMappingPromise;
  if (cachedTypeMapping) {
    typesMappingPromise = Promise.resolve(cachedTypeMapping)
  } else {
    typesMappingPromise = getTypes().then(mapTypes)
  }

  return typesMappingPromise
    .then(typesMapping => {
      cachedTypeMapping = typesMapping
      return addToFirestore(request.body, typesMapping)
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
