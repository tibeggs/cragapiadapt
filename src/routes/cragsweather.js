/**
 * REST endpoint for /todos
 */

const { PrismaClient, PrismaClientKnownRequestError } = require('@prisma/client');
const moment = require('moment-timezone');
const sanitizeHtml = require('sanitize-html');
const express = require('express');
const router = express.Router();
const sjcl = require('sjcl');
const fetch = require("node-fetch");

const prisma = new PrismaClient();

const asyncMiddleware = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next))
    .catch(next);
};

router.get('/', asyncMiddleware(async (req, res) => {
  const worker_put = "billowing-silence-4201.cwmtb.workers.dev"
  var PassPhrase = process.env.cragpassphrase;
  var putPhrase = process.env.putPhrase;
  var wapikey = sjcl.decrypt(PassPhrase, req.headers.wapikey);
  var putkey = sjcl.encrypt(PassPhrase, putPhrase)
  call_worker(wapikey)
    .then(json => {
      put_json(worker_put, json, putkey)
        .then(data => {
          res.json(json);
        })
    })

}));
async function put_json(url, json, putkey) {
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-type': 'application/json',
      'crageapikey': putkey
    },
    body: JSON.stringify(json)
  });


  // Awaiting response.json()
  const resData = await response.json();
  return resData;
}

async function call_worker(wapikey) {
  return new Promise((resolve, reject) => {
    try {
      console.log("call_worker");
      fetch('https://rapid-poetry-328e.cwmtb.workers.dev/')
        .then(result => {
          // console.log(result);
          // console.log(result.json());
          result.json()
            .then(res => {
              update_dataset(res, wapikey)
                .then(result => {
                  resolve(result)
                })
            })
        })
      // resolve(res);
    }
    catch (err) {
      console.log("error", err);
      resolve(err);
    }
  })
}

async function update_dataset(json, wapikey) {
  // await sleep(1);
  var dd = moment().tz("America/New_York").format("DD")
  var mm = moment().tz("America/New_York").format("MM")
  var yyyy = moment().tz("America/New_York").format("YYYY")
  var dformat = `${yyyy}-${mm}-${dd}`
  // console.log(json);
  console.log(dformat);
  // const start_key = get_start_key(json, dformat);
  const start_key = 0;
  // console.log(start_key)
  // for (crag_key in Object.entries(json)) {
  await Object.entries(json).forEach(crag_key => {
    // await get_weather(crag_key[0], json)
    try {
      console.log(needs_update(crag_key[0], json));
      if (needs_update(crag_key[0], json)) {
        get_weather(crag_key[0], json, wapikey);
      }

    }
    catch (err) {
      console.log(err);
    }

    // if (parseInt(start_key) - 1 < parseInt(crag_key[0]) && parseInt(crag_key[0]) < parseInt(start_key) + 1) {
    //   // console.log(crag_key[0]);
    //   await get_weather(crag_key[0], json,wapikey)
    // }

  }
  )
  // console.log(json);
  return json
}

async function get_weather(crag_key, json, wapikey) {
  return new Promise((resolve, reject) => {
    try {
      // console.log(crag_key);
      var d = new Date();
      d.setDate(d.getDate() - 1);
      var dd = String(d.getDate()).padStart(2, '0');
      var mm = String(d.getMonth() + 1).padStart(2, '0'); //January is 0!
      var yyyy = d.getFullYear();
      var lnglat = json[crag_key].lnglat;

      // console.log(lnglat);
      var lng = lnglat[0];
      var lat = lnglat[1];
      var forecast_url = `https://api.weatherapi.com/v1/forecast.json?key=${wapikey}&q=${lat},${lng}&days=10&aqi=no&alerts=no`;
      var past_url = `https://api.weatherapi.com/v1/history.json?key=${wapikey}&q=${lat},${lng}&dt=${yyyy}-${mm}-${dd}`
      console.log(forecast_url);
      const init = {
        headers: {
          'content-type': 'application/json;charset=UTF-8',
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
          "Access-Control-Max-Age": "86400",
        },
      };
      fetch(forecast_url, init)
        .then(response => {
          gatherResponse(response)
            .then(results => {
              let wfor = JSON.parse(results);
              let forecast = wfor.forecast;
              let newfd = forecast.forecastday
              Object.entries(newfd).forEach((day) => {
                delete day[1]['hour'];
              });
              json[crag_key].forecast = wfor.forecast;
            })
        }
        )
        .then(data => {
          fetch(past_url, init).then(response => {

            gatherResponse(response)
              .then(results => {

                let wfor2 = JSON.parse(results);
                let past = wfor2.forecast;
                let newfd = past.forecastday
                Object.entries(newfd).forEach((day) => {
                  delete day[1]['hour'];
                });
                json[crag_key].history = wfor2.forecast;
                resolve()
              })
          }
          )
        }
        )
        .catch((err) => {
          console.log(err);
          resolve();
        }
        )
    }
    catch (err) {
      console.log(err);
      resolve()
    }

  }
  )
}
async function gatherResponse(response) {
  const { headers } = response;
  const contentType = headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return JSON.stringify(await response.json());
  }
  return response.text();
}

function needs_update(crag_key, json, today) {
  var check = json[crag_key];
  if (check.forecast && check.forecast.forecastday) {
    if (check.forecast.forecastday[0].date != today) {
      return true
    }
  }
  else {
    return false
  }
  return true
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

module.exports = router;
