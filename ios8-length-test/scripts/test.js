define(['scripts/lodash.underscore'], function (_) {

  // Trigger a Mobile Safari 8 JIT bug.
  // See https://github.com/lodash/lodash/issues/799.
  var counter = 0,
    object = { '1': 'foo', '8': 'bar', '50': 'baz' },
    h1 = document.getElementsByTagName('h1')[0],
    h2 = document.getElementsByTagName('h2')[0];

  h2.innerHTML = navigator.userAgent;

  _.times(1000, function() {
    _.filter([]);
  });

  _.filter(object, function() {
      counter++;
      return true;
  });

  if (counter === 3) {
    h1.innerHTML = 'Passed test';
    h1.style.color = 'green';
  } else {
    h1.innerHTML = 'Failed test';
    h1.style.color = 'red';
  }
});