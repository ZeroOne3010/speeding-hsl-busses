import { Event, VehiclePositionMessage, VehicleData, Observation, StaticDirectionInfo } from "./types";
import { TwitterApi } from "twitter-api-v2";
import {
  bearerToken,
  appKey,
  appSecret,
  accessToken,
  accessSecret,
  consumerToken,
  consumerSecret,
  clientId,
  clientSecret
} from "./secrets";
import { setInterval } from "timers";
import {
  SPEED_LIMIT_KPH,
  BYGONE_VEHICLE_THRESHOLD,
  INTERVAL,
  DIRECTIONS,
  OPERATORS,
  SPEED_LIMIT_THRESHOLDS
} from "./constants";

const vehicles = {};
const boundingBox = {
  topLat: 60.247617,
  leftLong: 24.990907,
  bottomLat: 60.243575,
  rightLong: 24.994711
};

const mqtt = require("mqtt");
const mqttClient = mqtt.connect("mqtts://mqtt.hsl.fi:8883");

/**
 * Converts meters per second to kilometers per hour.
 * @param mps A number, m/s.
 * @returns A number, km/h.
 */
const mpsToKph = (mps: number): number => {
  return Math.round(mps * 3.6 * 10) / 10;
};

/**
 * Visualizes the given angle as an arrow.
 * @param angle Any compass angle, between 0 and 360.
 * @returns An arrow symbol that most closely represents the given angle.
 */
const getDirectionForCompassAngle = (angle: number): StaticDirectionInfo => {
  return DIRECTIONS[Math.floor(((angle % 360) + 22.5) / 45)];
};

mqttClient.on("connect", async function () {
  console.log("Connected");
  const twitterClient = new TwitterApi({
    appKey: appKey,
    appSecret: appSecret,
    accessToken: accessToken,
    accessSecret: accessSecret
  });
  // const tweet = await twitterClient.v2.tweet("Hello, this is a test.");
  // console.log("Tweeted: ", tweet);

  /**
   * Handles the case when a vehicle has left the observed area.
   * @param vehicleData Data of the finished vehicle.
   */
  const handleFinishedVehicle = (vehicleData: VehicleData): void => {
    if (vehicleData.observations.length < 10) {
      // Clearly something went wrong here and we didn't get enough measurements, skip.
      console.error(`Bussi ${vehicleData.line} sai vain ${vehicleData.observations.length} mittausta`);
      return;
    }
    const maxObservedSpeed: Observation = vehicleData.observations.reduce((prev, curr) =>
      curr.speed > prev.speed ? curr : prev
    );
    console.log(`Max observed speed for ${vehicleData.line}: `, maxObservedSpeed);

    const thresholds = SPEED_LIMIT_THRESHOLDS[SPEED_LIMIT_KPH];
    let description: string = "";

    for (let i: number = 0; i < thresholds.length; i++) {
      if (maxObservedSpeed.speed <= thresholds[i].maxSpeed) {
        description = thresholds[i].description(maxObservedSpeed.speed);
        break;
      }
    }

    const dirDesc: string = getDirectionForCompassAngle(maxObservedSpeed.direction).description;
    const date = new Date(maxObservedSpeed.timestamp * 1000);
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const time = `${hours}:${minutes}`;
    const message = `Linja ${vehicleData.line} - lähtö ${vehicleData.startTime}. Eskolantietä ${dirDesc} kello ${time}. ${description}`;
    console.log("Reporting: ", message);
    twitterClient.v2.tweet(message);
  };

  /**
   * Checks the current in-memory list of vehicles for vehicles that haven't been seen in a certain amount of seconds.
   * Triggers a handler function for them and removes them from the list.
   */
  const bygoneVehicleCheck = (): void => {
    Object.keys(vehicles).forEach((key) => {
      const vehicleData: VehicleData = vehicles[key];
      const lastIndex = vehicleData?.observations?.length - 1;
      const lastMeasurement = vehicleData?.observations[lastIndex];
      if (!lastMeasurement) {
        return;
      }
      const currentTimestamp = Math.round(Date.now() / 1000);
      const secondsSinceObservation = currentTimestamp - lastMeasurement.timestamp;
      if (secondsSinceObservation > BYGONE_VEHICLE_THRESHOLD) {
        handleFinishedVehicle(vehicleData);
        delete vehicles[key];
      }
    });
    console.debug(Date.now());
  };

  mqttClient.subscribe(
    [
      "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/31/#",
      "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/32/#",
      "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/33/#",
      "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/34/#",
      "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/35/#",
      "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/41/#",
      "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/42/#",
      "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/43/#",
      "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/44/#",
      "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/45/#",
      "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/51/#",
      "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/52/#",
      "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/53/#",
      "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/54/#",
      "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/55/#",
      "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/61/#",
      "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/62/#",
      "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/63/#",
      "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/64/#",
      "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/65/#",
      "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/71/#",
      "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/72/#",
      "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/73/#",
      "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/74/#",
      "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/75/#"
    ],
    () => {
      console.log("Subscribed to topic(s)");
      const timeout = setInterval(bygoneVehicleCheck, INTERVAL);
    }
  );
});

mqttClient.on("message", (topic: string, message: string) => {
  const event: VehiclePositionMessage = JSON.parse(message)?.VP;
  if (!event) {
    return;
  }

  // Filter by bounding box, the subscribed topics aren't necessarily that precise.
  if (
    event.lat > boundingBox.topLat ||
    event.long < boundingBox.leftLong ||
    event.lat < boundingBox.bottomLat ||
    event.long > boundingBox.rightLong
  ) {
    return;
  }

  const vehicle = event.oper + "_" + event.veh;
  if (!vehicles[vehicle]) {
    // This is a new vehicle that just appeared
    vehicles[vehicle] = {
      startTime: event.start,
      operatorCode: event.oper,
      operatorName: OPERATORS[event.oper]?.name || "N/A",
      vehicleNumber: event.veh,
      line: event.desi,
      observations: [] as Observation[]
    } as VehicleData;
  }

  const kilometersPerHour: number = mpsToKph(event.spd);
  vehicles[vehicle].observations.push({
    latitude: event.lat,
    longitude: event.long,
    timestamp: event.tsi,
    speed: kilometersPerHour,
    direction: event.dir
  });

  console.log(
    event.tst +
      "  Linja " +
      event.desi.padStart(4, " ") +
      ": " +
      getDirectionForCompassAngle(event.hdg).arrow +
      " " +
      kilometersPerHour +
      " km/h" +
      "; " +
      (OPERATORS[event.oper]?.name || "N/A") +
      " vehicle " +
      event.veh
  );
  //   client.end
});

/*

https://bussitutka.fi/map?mode=route&route=1069
https://bussitutka.fi/map?mode=route&route=1061


 1        2         3              4               5            6 
/<prefix>/<version>/<journey_type>/<temporal_type>/<event_type>/<transport_mode>

   7             8                9          10             11         12           13          14              15        
  /<operator_id>/<vehicle_number>/<route_id>/<direction_id>/<headsign>/<start_time>/<next_stop>/<geohash_level>/<geohash>/<sid>/#

Geohash: (60.123, 24.789) becomes 60;24/17/28/39

   1   2  3       4       5  6   7 8 9 0 1 2 3 4 15             
 "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/31/#"
 "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/32/#"
 "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/33/#"
 "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/34/#"
 "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/35/#"
 "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/41/#"
 "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/42/#"
 "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/43/#"
 "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/44/#"
 "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/45/#"
 "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/51/#"
 "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/52/#"
 "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/53/#"
 "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/54/#"
 "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/55/#"
 "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/61/#"
 "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/62/#"
 "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/63/#"
 "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/64/#"
 "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/65/#"
 "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/71/#"
 "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/72/#"
 "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/73/#"
 "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/74/#"
 "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/75/#"

 */
