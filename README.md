# Puksun bussit -Bluesky-botti

Botti, joka kertoo Blueskyhin [@puksunbussit.bluesky.bot](https://bsky.app/profile/puksunbussit.bluesky.bot), jos bussit kaahaavat Pukinmäessä kuvan alueella:

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

Ensure `ts-node` is installed: `npm install -g ts-node`. Then build with `npm install` and run with `npm start` for production or `npm dev` for development. Run tests with `npm test`.
Create an app password for the bot and then fill in the Bluesky secrets into the `.env` file for development mode or environment variables in production mode.

Uses the Digitransit API: https://digitransit.fi/en/developers/apis/5-realtime-api/vehicle-positions/high-frequency-positioning/

Relies on the following libraries:

* MQTT.js: [GitHub](https://github.com/mqttjs/MQTT.js) / [npm](https://www.npmjs.com/package/mqtt)
* AT Protocol API: [GitHub](https://github.com/bluesky-social/atproto) / [npm](https://www.npmjs.com/package/@atproto/api)
* chartjs-node-canvas: [GitHub](https://github.com/SeanSobey/ChartjsNodeCanvas) / [npm](https://www.npmjs.com/package/chartjs-node-canvas)

