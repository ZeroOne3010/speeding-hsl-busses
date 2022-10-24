# Puksun bussit -Twitter-botti

Botti, joka (päällä ollessaan) kertoo Twitteriin [@PuksunBussit](https://twitter.com/PuksunBussit)-käyttäjänä, jos bussit kaahaavat Pukinmäessä kuvan alueella:

```geojson
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "id": 1,
      "properties": {
        "ID": 0
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [
              24.990907,
              60.247617
            ],
            [
              24.990907,
              60.243575
            ],
            [
              24.994711,
              60.243575
            ],
            [
              24.994711,
              60.247617
            ],
            [
              24.990907,
              60.247617
            ]
          ]
        ]
      }
    }
  ]
}
```

## Techy stuff

Ensure `ts-node` is installed: `npm install -g ts-node`. Then build with `npm install` and run with `npm start`. Run tests with `npm test`.
Remember to fill in the Twitter secrets into `secrets.ts`.

Uses the Digitransit API: https://digitransit.fi/en/developers/apis/4-realtime-api/vehicle-positions/

Relies on the following libraries:

* MQTT.js: [GitHub](https://github.com/mqttjs/MQTT.js) / [npm](https://www.npmjs.com/package/mqtt)
* Twitter API v2: [GitHub](https://github.com/PLhery/node-twitter-api-v2) / [npm](https://www.npmjs.com/package/twitter-api-v2)
* chartjs-node-canvas: [GitHub](https://github.com/SeanSobey/ChartjsNodeCanvas) / [npm](https://www.npmjs.com/package/chartjs-node-canvas)