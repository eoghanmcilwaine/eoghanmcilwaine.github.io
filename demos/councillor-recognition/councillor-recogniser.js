(function () {

function CouncillorRecogniser(options) {
  this.key = options.key;
}

Object.assign(CouncillorRecogniser.prototype, {

  ENDPOINT_URL: 'https://swfi2ld5q1.execute-api.eu-west-1.amazonaws.com/prod/authorise-upload',
  WAIT_BEFORE_DOWNLOAD: 6000,
  DOWNLOAD_RETRY_INTERVAL: 2000,

  process: function (payload) {
    return this.authorise.call(this, payload)
      .then(this.upload.call(this, payload))
      .then(this.wait.call(this))
      .then(this.download.bind(this));
  },

  processUploadedFile(file) {
    return readUploadedFile(file).then(this.process.bind(this));
  },

  processImageFile(src) {
    return readImageFile(src).then(this.process.bind(this));
  },

  authorise: function (payload) {
    return sendRequest(this.ENDPOINT_URL, 'POST', JSON.stringify({
      content_type: payload.type
    }), null, this.key);
  },

  upload: function (payload) {
    return function (result) {
      return sendRequest(result.SignedPutUrl, 'PUT', payload.data, payload.type).then(function () {
        return result;
      });
    };
  },

  wait: function () {
    var self = this;

    return function (result) {
      return new Promise(function (resolve) {
        setTimeout(function () {
          resolve(result)
        }, self.WAIT_BEFORE_DOWNLOAD);
      });
    };
  },

  download: function (result) {
    var self = this;

    return new Promise(function (resolve, reject) {
      var count = 0;

      function checkAfterTimeout () {
        if (++count > 5) {
          return reject('Gave up trying to download results');
        }

        setTimeout(function () {
          sendRequest(result.SignedGetUrl, 'GET').then(resolve, checkAfterTimeout);
        }, self.DOWNLOAD_RETRY_INTERVAL);
      };

      checkAfterTimeout();
    });
  }
});

function sendRequest(url, method, data, type, apiKey) {
  var xhr = new XMLHttpRequest();

  return new Promise(function (resolve, reject) {
    xhr.addEventListener('load', function (response) {
      var responseText = response.target.responseText;
      var status = response.target.status;

      if (status === 404) {
        reject({ status: status });
      }

      if (status === 200 && responseText.length) {
        resolve(JSON.parse(responseText));
      } else {
        resolve({});
      }
    });
    xhr.addEventListener('error', reject);
    xhr.open(method, url);
    if (apiKey) {
      xhr.setRequestHeader('x-api-key', apiKey);
    }
    if (type) {
      xhr.setRequestHeader('Content-type', type);
    }
    xhr.send(data);
  });
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

    reader.readAsArrayBuffer(file);
  });
}

function readImageFile(src) {
  return fetch(src).then(function (e) {
    return e.blob();
  }).then(function (blob) {
    return {
      type: blob.type,
      data: blob
    };
  });
}

window.CouncillorRecogniser = CouncillorRecogniser;

})();