'use es6'

import * as moment from 'moment';
import * as Papa from 'papaparse';
import tzlookup from 'tz-lookup';
import flatpickr from "flatpickr";
import unzip from 'unzip-js';


// activitySegment
// placeVisit


// location: {latitudeE7: 531884296, longitudeE7: -64680157, placeId: "ChIJU8knndydZ0gRGRaBXgmtTms", address: "Bellevue↵Threecastles↵Ballyward↵Blessington↵Co. Wicklow↵Ireland", name: "Bellevue", …}
// duration: {startTimestampMs: "1584640900850", endTimestampMs: "1584712281630"}
// placeConfidence: "HIGH_CONFIDENCE"
// centerLatE7: 531881807
// centerLngE7: -64680039
// visitConfidence: 87
// otherCandidateLocations: (2) [{…}, {…}]
// editConfirmationStatus: "NOT_CONFIRMED"


// Fourteen days (in ms)
const DEFAULT_START_MS_AGO = 1000 * 60 * 60 * 24 * 14;


const nrml = (e7) => e7 / 10000000;
const mapLink = (lt, ln) => `https://maps.google.com/maps?q=${nrml(lt)},${nrml(ln)}`;

const getDate = ({ startTimestampMs, endTimestampMs }) => {
  const sta = moment(startTimestampMs, 'x');
  const end = moment(endTimestampMs, 'x');

  return {
    start: sta.format('YYYY-MM-DD HH:mm Z'),
    duration: end.from(sta, true),
    weekday: sta.format('dddd'),
  };
};

const getFileNameMatcher = () => {
  // const tz = document.getElementById('timezone').value;
  const zipPath = document.getElementById('path-in-zip').value;
  const dateStart = moment(document.getElementById('date-range-start').value);
  const dateEnd = moment(document.getElementById('date-range-end').value);
  const monthYears = {};

  let current = dateStart;

  while (current.isBefore(dateEnd)) {
    monthYears[`${current.format('YYYY')}/${current.format('YYYY')}_${current.format('MMMM').toUpperCase()}`] = true;
    current = current.add(1, 'day');
  }
  return name => {
    return name.indexOf(zipPath) > -1 && Object.keys(monthYears).some(pattern => {
      return name.indexOf(pattern) > -1;
    });
  };
};

const isInDateRange = timestamp => {
  const dateStart = moment(document.getElementById('date-range-start').value);
  const dateEnd = moment(document.getElementById('date-range-end').value);
  const stamp = moment(timestamp, 'x');

  return stamp.isBefore(dateEnd.add(1, 'day')) && stamp.isAfter(dateStart);
};

const concatTyped = arrays => {
  const length = arrays.reduce((len, current) => {
    return len + current.length;
  }, 0);
  let position = 0;
  return arrays.reduce((accumulator, current) => {
    accumulator.set(current, position);
    position += current.length;
    return accumulator;
  }, new Uint8Array(length));
};

const processInnerFile = (zipFile, entry, resolve, reject) => {
  console.log(entry.name);

  zipFile.readEntryData(entry, false, function (err, readStream) {
    const arrays = [];
    if (err) {
      reject(err);
    }

    readStream.on('data', function (chunk) {
      arrays.push(chunk);
    });
    readStream.on('error', function (err) {
      reject(err);
    });
    readStream.on('end', function () {
      const total = concatTyped(arrays);
      const json = new TextDecoder("utf-8").decode(total);

      const data = JSON.parse(json);
      const output = processJson(data);

      resolve(output);
    });
  });
};

const processFile = (file) => {
  const matcher = getFileNameMatcher();
  return new Promise((resolve, reject) => {
    unzip(file, function (err, zipFile) {
      if (err) {
        reject(err);
      }

      zipFile.readEntries(function (err, entries) {
        const results = [];
        if (err) {
          reject(err);
        }
        entries.forEach(function (entry) {
          if (matcher(entry.name)) {
            results.push(new Promise((resolve, reject) => {
              processInnerFile(zipFile, entry, resolve, reject);
            }));
          }
        });

        resolve(Promise.all(results).then(values => {
          return [].concat.apply([], values);
        }));
      });
    });
  });
};

const processFiles = files => {
  const promises = files.map(file => processFile(file));

  Promise.all(promises).then(results => {
    const output = [].concat.apply([], results).sort((a, b) => {
      return a.startTimeStampMs - b.startTimeStampMs;
    });

    download(output);
  });
};


// document.getElementById('file-input').addEventListener('change', function (e) {
//   readUploadedFile(e.target.files[0]).then(({ data }) => {
//     console.log(data);
//     const json = JSON.parse(data);
//     const output = processJson(json);
//     download(output);
//   });
// });

const dropArea = document.getElementById('filedrop');

dropArea.addEventListener('dragenter', ev => {
  ev.preventDefault();
  dropArea.classList.add('over');
});
dropArea.addEventListener('dragleave', ev => {
  ev.preventDefault();
  dropArea.classList.remove('over');
});
dropArea.addEventListener('dragover', ev => {
  ev.preventDefault();
});
dropArea.addEventListener('drop', ev => {
  const { files } = ev.dataTransfer;

  // [...files].forEach(processFile);
  processFiles([...files]);
  dropArea.classList.remove('over');
  ev.preventDefault();
});

flatpickr("#date-range-start", {
  defaultDate: new Date() - DEFAULT_START_MS_AGO
});
flatpickr("#date-range-end", {
  defaultDate: new Date()
});

function processJson(json, output = []) {
  const { timelineObjects } = json;

  for (const { placeVisit } of timelineObjects) {
    if (placeVisit && isInDateRange(placeVisit.duration.startTimestampMs)) {
      // console.log(placeVisit);
      const row = {};
      const { latitudeE7, longitudeE7, name, address } = placeVisit.location;

      row.startTimeStampMs = placeVisit.duration.startTimestampMs;
      Object.assign(row, getDate(placeVisit.duration));
      row.latitudeE7 = latitudeE7;
      row.longitudeE7 = longitudeE7;
      row.map = mapLink(latitudeE7, longitudeE7);
      row.name = name;
      row.address = address;
      row.confidence = placeVisit.placeConfidence;
      row.confirmationStatus = placeVisit.editConfirmationStatus;
      row.tz = tzlookup(nrml(latitudeE7), nrml(longitudeE7));

      output.push(row);
    }
  }

  return output;
}

function download(output) {
  const csvStr = Papa.unparse(output);
  const dateStart = document.getElementById('date-range-start').value;
  const dateEnd = document.getElementById('date-range-end').value;

  document.getElementById('output').innerHTML = csvStr;

  const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + csvStr);
  var link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Locations_${dateStart}_to_${dateEnd}.csv`);
  document.body.appendChild(link); // Required for FF

  link.click();
}


function readUploadedFile(file) {
  var reader = new FileReader();

  return new Promise(function (resolve) {
    reader.onloadend = function (e) {
      resolve({
        type: file.type,
        data: e.target.result
      });
    };

    reader.readAsText(file);
  });
}
