const http = require('http');
const url = require('url');

const assert = require('assert');
const fs = require('fs-extra');
const fetch = require('node-fetch');

const cityRouter = require('./routes/CityRoutes');

const protocol = 'http';
const host = 'localhost';
const port = '8080';
const server = `${protocol}://${host}:${port}`;

const HTTPServer = http.createServer((req,res) => { 
  const reqURL = url.parse(req.url, true)
  const pathName = reqURL.pathname
  const params = reqURL.query
  const reqMethod = req.method
  const reqHeaders = req.headers
  const auth = req.headers.authorization
  if(!auth) {
    res.statusCode = 401;
    res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
    res.end('Unautherized');
  }else {
    const token = auth.split(" ")[1];
    if(token === "dGhlc2VjcmV0dG9rZW4=") {

      const data = {
        'server': server,
        'pathName': pathName,
        'method': reqMethod,
        'params': params,
        'headers': reqHeaders,
        'payload': {}
      }

        const route = typeof(cityRouter[pathName]) !== "undefined" && typeof(cityRouter[pathName][reqMethod]) !== "undefined" ? cityRouter[pathName][reqMethod] : cityRouter['notFound']
        route(data, (HTTPCode, payload) => {
        payload = typeof(payload) === 'object' ? payload : {}
        HTTPCode = typeof(HTTPCode) === 'number' ? HTTPCode : 200
        const payloadString = JSON.stringify(payload)
        res.setHeader('content-type', 'application/json')
        res.writeHead(HTTPCode)
        res.end(payloadString)
      })
    }else{
      res.statusCode = 401;
      res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
      res.end('Unautherized');
    }
  }
})

HTTPServer.listen(port, host, () => {
  console.log(`http server listening on port ${port}`)
});


(async () => {
  // get a city by tag ("excepteurus")
  let result = await fetch(`${server}/cities-by-tag?tag=excepteurus&isActive=true`);

  // oh, authentication is required
  assert.strictEqual(result.status, 401);
  result = await fetch(`${server}/cities-by-tag?tag=excepteurus&isActive=true`, {
    headers: { 'Authorization': 'bearer dGhlc2VjcmV0dG9rZW4=' }
  });
  
  // ah, that's better
  assert.strictEqual(result.status, 200);
  let body = await result.json();
  // we expect only one city to match
  assert.strictEqual(body.cities.length, 1);

  // let's just make sure it's the right one
  const city = body.cities[0];
  assert.strictEqual(city.guid, 'ed354fef-31d3-44a9-b92f-4a3bd7eb0408')
  assert.strictEqual(city.latitude, -1.409358);
  assert.strictEqual(city.longitude, -37.257104);

  // find the distance between two cities
  result = await fetch(`${server}/distance?from=${city.guid}&to=17f4ceee-8270-4119-87c0-9c1ef946695e`, {
    headers: { 'Authorization': 'bearer dGhlc2VjcmV0dG9rZW4=' }
  });
  // we found it
  assert.strictEqual(result.status, 200);
  body = await result.json();

  // let's see if the calculations agree
  assert.strictEqual(body.from.guid, 'ed354fef-31d3-44a9-b92f-4a3bd7eb0408');
  assert.strictEqual(body.to.guid, '17f4ceee-8270-4119-87c0-9c1ef946695e');
  assert.strictEqual(body.unit, 'km');
  assert.strictEqual(body.distance, 13376.38);

  // now it get's a bit more tricky. We want to find all cities within 250 km of the
  // the one we found earlier. That might take a while, so rather than waiting for the
  // result we expect to get a url that can be polled for the final result
  
  result = await fetch(`${server}/area?from=${city.guid}&distance=250`, {
    headers: { 'Authorization': 'bearer dGhlc2VjcmV0dG9rZW4=' },
    timeout: 25
  });

  // so far so good
  assert.strictEqual(result.status, 202);
  body = await result.json();
  assert.strictEqual(body.resultsUrl, `${server}/area-result/2152f96f-50c7-4d76-9e18-f7033bd14428`);

  let status;
  do
  {
    result = await fetch(body.resultsUrl, {
      headers: { 'Authorization': 'bearer dGhlc2VjcmV0dG9rZW4=' }
    });
    status = result.status;
    // return 202 while the result is not yet ready, otherwise 200
    assert.ok(status === 200 || status === 202, 'Unexpected status code');

    // let's wait a bit if the result is not ready yet
    if (status === 202) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  while (status !== 200)

  // so we got a result. let's see if it looks as expected
  body = await result.json();
  let cities = body.cities;
  assert.strictEqual(cities.length, 15);

  // and let's look at a sample
  const filteredByAddress = cities.filter(city => city.address === '859 Cyrus Avenue, Devon, Missouri, 1642');
  assert.strictEqual(filteredByAddress.length, 1);

  // okay, nice we got this far. we are almost there. but let's have an endpoint
  // for downloading all cites.
  // that's quite a bit of data, so make sure to support streaming
  result = await fetch(`${server}/all-cities`, {
    headers: { 'Authorization': 'bearer dGhlc2VjcmV0dG9rZW4=' }
  });

  if (await fs.exists('./all-cities.json')) {
    await fs.remove('./all-cities.json');
  }

  await new Promise((resolve, reject) => {
    const dest = fs.createWriteStream('./all-cities.json');
    result.body.on('error', err => {
      reject(err);
    });
    dest.on('finish', () => {
      resolve();
    });
    dest.on('error', err => {
      reject(err);
    });
    result.body.pipe(dest);
  });

  // are they all there?
  const file = await fs.readFile('./all-cities.json');
  cities = JSON.parse(file);
  assert.strictEqual(cities.length, 100000);

  console.log('You made it! Now make your code available on git and send us a link');
})().catch(err => {
  console.log(err);
});
