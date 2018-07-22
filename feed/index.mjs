import fs from 'fs'
import axios from 'axios'
import xpath from 'xpath'
import xmldom from 'xmldom'
import TIMESTAMPS_LAST_UPLOADED_MEASUREMENT from './last_timestamps'

const fsPromises = fs.promises

// Interval to retrieve and upload new measurements
const INTERVAL = 30000

// Names of the different types in the dynatrace XML report
const TYPES = [
  'Web Page Requests - BB_LIVE_PS',
  'Web Page Requests - KAN-WS-BB_LIVE_DIR',
  'Web Page Requests - KAN-WS-BB_LIVE_SBB'
]

// Different measurement types in the dynatrace XML report.
const AGGREGATIONS = [
  {
    aggregation: 'Count',
    xmlAttribute: 'count',
    firestoreCollectionName: 'requestCounts'
  },
  {
    aggregation: 'Average',
    xmlAttribute: 'avg',
    firestoreCollectionName: 'responseTimes'
  }
]

// Call the Dynatrace REST API running locally to generate an XML report
const generateReport = async (dashboard, reportType = 'xml') => {
  const response = await axios.get(`http://localhost:8030/rest/management/report/${reportType}?dashboardname=${dashboard}`)
  return response.data
}

// Parse the XML report from dynatrace
const parseReport = async (measurementsFile) => {
  const xml = await fsPromises.readFile(measurementsFile, 'utf8');
  return new xmldom.DOMParser().parseFromString(xml)
}

// Retrieve the timestamp of the last uploaded measurement for given type and aggregation
const retrieveTimestampLastUploadedMeasurement = (aggregation, type) => {
  return TIMESTAMPS_LAST_UPLOADED_MEASUREMENT[aggregation.firestoreCollectionName][type]
}

// Update the timestamp of the last uploaded measurement for given type and aggregation
const updateTimestampLastUploadedMeasurement = (aggregation, type, value) => {
  TIMESTAMPS_LAST_UPLOADED_MEASUREMENT[aggregation.firestoreCollectionName][type] = value
}

const flushTimestampLastUploadedMeasurementToDisk = () => {
  return fsPromises.writeFile('last_timestamps.json', JSON.stringify(TIMESTAMPS_LAST_UPLOADED_MEASUREMENT, null, 2))
}

const constructInputBodyForFirebaseFunction = (measurementsXml) => {
  const inputBody = {}
  let measurementsToSend = false
  for (let aggregation of AGGREGATIONS) {
    const inputForAggregation = {}
    for (let type of TYPES) {
      const since = retrieveTimestampLastUploadedMeasurement(aggregation, type)
      // console.log(`Since (${aggregation.firestoreCollectionName}-${type}): ${since}`)
      const nodes = xpath.select(`/dashboardreport/data/chartdashlet/measures/measure/measure[@measure="${type}" and @aggregation="${aggregation.aggregation}"]/measurement[@timestamp>${since}]`, measurementsXml)
      const measurements = nodes.map(node => {
        return {
          timestamp: Number(node.attributes.getNamedItem('timestamp').value),
          value: Number(node.attributes.getNamedItem(aggregation.xmlAttribute).value)
        }
      })
      // Remove last 2 measurements because they are probably still intermediate values
      measurements.pop()
      measurements.pop()
      if(measurements && measurements.length > 0) {
        measurementsToSend = true
        inputForAggregation[type] = measurements

        const lastTimestamp = measurements[measurements.length - 1].timestamp
        updateTimestampLastUploadedMeasurement(aggregation, type, lastTimestamp)
      }
    }
    inputBody[aggregation.firestoreCollectionName] = inputForAggregation
  }
  return { inputBody, measurementsToSend }
}

const callFirebaseFunction = async (inputBody) => {
  return axios.post('https://us-central1-monitoring-ag.cloudfunctions.net/measurements', inputBody)
}

const removeMeasurementsFile = async (measurementsFile) => {
  return fsPromises.unlink(measurementsFile)
}

const wait = async (secs) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve()
    }, secs)
  })
}

const main = async () => {
  console.debug('Start iteration')

  const measurementsFile = await generateReport('PRD_monitoring')
  console.log(`Process report ${measurementsFile}`)

  const measurementsXml = await parseReport(measurementsFile)

  const { inputBody, measurementsToSend } = constructInputBodyForFirebaseFunction(measurementsXml)
  console.debug('Created input body', JSON.stringify(inputBody), measurementsToSend)

  if(measurementsToSend) {
    try {
      await callFirebaseFunction(inputBody)
      console.log(`Measurements for ${measurementsFile} uploaded`)
    } catch (e) {
      console.error('An error occurred calling firebase function to upload measurements')
      throw e
    }

    await flushTimestampLastUploadedMeasurementToDisk() // await not entirely necessary
  }

  await removeMeasurementsFile(measurementsFile) // await not entirely necessary
}

(async () => {
  while (true) {
    const now = new Date()
    try {
      await main()
    } catch (e) {
      console.error('Ending program because exception occurred: ', e.stack)
      break
    }
    const elapsed = (new Date() - now)
    const remaining = INTERVAL - elapsed
    if (remaining > 0) {
      await wait(remaining)
    }
  }
})()
