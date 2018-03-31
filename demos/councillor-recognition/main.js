var recogniser = new CouncillorRecogniser({ key: 'JFAP5K0Qox4OH00Xsc6sU5PQ3WAC6fyy7P4QQgCE' });

/**
 * Handle file upload.
 */
document.getElementById('file-input').addEventListener('change', function (e) {
  output('Uploading and processing file...');
  recogniser.processUploadedFile(e.target.files[0]).then(outputResult);
});

/**
 * Handle click on img element.
 */
document.getElementById('sample').addEventListener('click', function (e) {
  output('Uploading and processing file...');
  recogniser.processImageFile(e.target.src).then(outputResult);
});

/**
 * Write the recognition result out to the textarea
 */
function outputResult(result) {
  output(JSON.stringify(result.matched_names, null, 2));
}

function output(text) {
  document.getElementById('output').innerHTML = text;
}