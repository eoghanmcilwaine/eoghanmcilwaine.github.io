const patternHttp = /^http:\/\//;

export default function httpsRedirect({ href, exclude, enact }) {
  if (href.indexOf(exclude) === -1 && href.match(patternHttp)) {
    enact(href.replace(patternHttp, 'https://'));
  }
}
