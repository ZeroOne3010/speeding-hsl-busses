import { VehiclePositionMessage, VehicleData, Observation, StaticDirectionInfo } from "./types";
import { BskyAgent } from "@atproto/api";
import { setInterval } from "timers";
import { promises as fs } from "fs";
import path from "path";
import {
  SPEED_LIMIT_KPH,
  BYGONE_VEHICLE_THRESHOLD,
  INTERVAL,
  DIRECTIONS,
  OPERATORS,
  SPEED_LIMIT_THRESHOLDS,
  FINNISH_NUMBER_FORMAT
} from "./constants";
import { createPngChart } from "./graph";

const vehicles: Record<string, VehicleData> = {};
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
 * Returns a descriptive object for the given compass angle.
 * @param angle Any compass angle, between 0 and 360.
 * @returns A direction info object with an arrow and a textual description for the given compass bearing.
 */
const getDirectionForCompassAngle = (angle: number): StaticDirectionInfo => {
  return DIRECTIONS[Math.floor(((angle % 360) + 22.5) / 45)];
};

const user = process.env.BLUESKY_USERNAME;
const password = process.env.BLUESKY_PASSWORD;
const devImageOutputDir = process.env.DEV_IMAGE_OUTPUT_DIR;
const debugEnabled = process.env.DEBUG === 'true' || process.env.DEBUG === '1';
const hasCredentials = Boolean(user && password);

type OutputSink = {
  name: string;
  handle: (payload: { message: string; chartBuffer: Buffer; vehicleData: VehicleData }) => Promise<void>;
  handleChartFailure?: (payload: { message: string; error: unknown }) => Promise<void>;
};

const sinks: OutputSink[] = [];

mqttClient.on("connect", async function () {
  sinks.length = 0;
  const isDevImageMode = !hasCredentials && Boolean(devImageOutputDir);
  if (!hasCredentials && !isDevImageMode) {
    throw new Error(
      "BLUESKY_USERNAME and BLUESKY_PASSWORD must be set, or define DEV_IMAGE_OUTPUT_DIR to enable dev image mode!"
    );
  }

  console.log("Connected as", user || "dev-local-mode");
  const bskyAgent = hasCredentials ? new BskyAgent({ service: "https://bsky.social" }) : null;
  if (bskyAgent) {
    await bskyAgent.login({ identifier: user as string, password: password as string });
    sinks.push({
      name: "bluesky",
      handle: async ({ message, chartBuffer, vehicleData }) => {
        const upload = await bskyAgent.uploadBlob(chartBuffer, { encoding: "image/png" });
        const altText = `Bussin ${vehicleData.line} (${vehicleData.operatorName} auto ${vehicleData.vehicleNumber}) nopeuskäyrä. ${vehicleData.observations.length} mittauspistettä.`;
        await bskyAgent.post({
          text: message,
          embed: {
            $type: "app.bsky.embed.images",
            images: [{ image: upload.data.blob, alt: altText }]
          }
        });
      },
      handleChartFailure: async ({ message }) => {
        await bskyAgent.post({ text: message + " (Nopeuskäyrän muodostus epäonnistui. 🪲)" });
      }
    });
  }

  if (devImageOutputDir) {
    const outputDir = devImageOutputDir;
    sinks.push({
      name: "disk",
      handle: async ({ chartBuffer, vehicleData }) => {
        await fs.mkdir(outputDir, { recursive: true });
        const safeLine = vehicleData.line.replace(/[^\w.-]+/g, "_");
        const lastTimestamp = vehicleData.observations.at(-1)?.timestamp ?? Math.round(Date.now() / 1000);
        const fileName = `${safeLine}_${vehicleData.vehicleNumber}_${lastTimestamp}.png`;
        const outputPath = path.join(outputDir, fileName);
        await fs.writeFile(outputPath, chartBuffer);
        console.log(`Saved dev image to ${outputPath}`);
      }
    });
  }

  if (sinks.length === 0) {
    throw new Error("No output sinks configured. Check BLUESKY_USERNAME/BLUESKY_PASSWORD or DEV_IMAGE_OUTPUT_DIR.");
  }

  /**
   * Handles the case when a vehicle has left the observed area.
   * @param vehicleData Data of the finished vehicle.
   */
  const handleFinishedVehicle = async (vehicleData: VehicleData): Promise<void> => {
    if (vehicleData.observations.length < 10) {
      // Clearly something went wrong here and we didn't get enough measurements, skip.
      console.error(`Bussi ${vehicleData.line} sai vain ${vehicleData.observations.length} mittausta`);
      return;
    }
    const maxObservedSpeed: Observation = vehicleData.observations.reduce((prev, curr) =>
      curr.speed > prev.speed ? curr : prev
    );

    const thresholds = SPEED_LIMIT_THRESHOLDS[SPEED_LIMIT_KPH];
    let description: string = "";

    for (let i: number = 0; i < thresholds.length; i++) {
      if (maxObservedSpeed.speed <= thresholds[i].maxSpeed) {
        description = thresholds[i].description(maxObservedSpeed.speed);
        break;
      }
    }

    const dirDesc: string =
      maxObservedSpeed.speed > 0 ? getDirectionForCompassAngle(maxObservedSpeed.direction).description : "";
    const date = new Date(maxObservedSpeed.timestamp * 1000);
    const time = date.toLocaleString('fi-FI', { timeZone: 'Europe/Helsinki', hour: '2-digit', minute: '2-digit' });
    const message = `Linja ${vehicleData.line} - lähtö ${vehicleData.startTime}. Eskolantietä ${dirDesc} kello ${time}. ${description}`;
    console.log("Reporting: ", message);
    try {
      const chartBuffer: Buffer = await createPngChart(vehicleData);
      for (const sink of sinks) {
        try {
          await sink.handle({ message, chartBuffer, vehicleData });
        } catch (error) {
          console.error(`Error sending to ${sink.name}:`, error);
        }
      }
    } catch (error) {
      console.error("Error creating chart:", error);
      for (const sink of sinks) {
        if (!sink.handleChartFailure) {
          continue;
        }
        sink.handleChartFailure({ message, error }).catch((err) => {
          console.error(`Error in ${sink.name} error recovery: `, err);
        });
      }
    }
  };

  /**
   * Checks the current in-memory list of vehicles for vehicles that haven't been seen in a certain amount of seconds.
   * Triggers a handler function for them and removes them from the list.
   */
  const bygoneVehicleCheck = (): void => {
    const currentTimestamp = Math.round(Date.now() / 1000);
    Object.keys(vehicles).forEach((key) => {
      const vehicleData: VehicleData = vehicles[key];
      const lastIndex = vehicleData?.observations?.length - 1;
      const lastMeasurement = vehicleData?.observations[lastIndex];
      if (!lastMeasurement) {
        return;
      }
      const secondsSinceObservation = currentTimestamp - lastMeasurement.timestamp;
      if (secondsSinceObservation > BYGONE_VEHICLE_THRESHOLD) {
        handleFinishedVehicle(vehicleData);
        delete vehicles[key];
      }
    });

    // Print regular heartbeat messages:
    if (currentTimestamp % 100 === 0 || currentTimestamp % 100 === 99) {
      const memoryUsage = process.memoryUsage();
      console.debug(
        ` <3 Heartbeat: it's ${currentTimestamp}. Mem allocated: ${FINNISH_NUMBER_FORMAT.format(
          memoryUsage.rss
        )} bytes. Heap used/total: ${FINNISH_NUMBER_FORMAT.format(
          memoryUsage.heapUsed
        )} / ${FINNISH_NUMBER_FORMAT.format(memoryUsage.heapTotal)} bytes. Buffers: ${FINNISH_NUMBER_FORMAT.format(
          memoryUsage.arrayBuffers
        )} bytes.`
      );
    }
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

  const vehicle: string = event.oper + "_" + event.veh;
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
  const observation = {
      latitude: event.lat,
      longitude: event.long,
      timestamp: event.tsi,
      speed: kilometersPerHour,
      direction: event.hdg,
      acceleration: event.acc,
      offsetFromSchedule: event.dl
    };
  if(event.acc > 1.5) {
    // This must be a measurement error due to excessive acceleration, skip it.
    console.log("Skipping observation for " + vehicle + " with excessive acceleration:", observation);
  } else {
    vehicles[vehicle].observations.push(observation);
  }

  // Log each received vehicle positioning message to the console:
  if (debugEnabled) {
    console.debug(
      event.tst +
        "  Linja " +
        event.desi.padStart(4, " ") +
        ": " +
        getDirectionForCompassAngle(event.hdg).arrow +
        " (" +
        event.hdg +
        "°) " +
        kilometersPerHour +
        " km/h" +
        "; " +
        event.acc +
        " m/s²; " +
        (OPERATORS[event.oper]?.name || `N/A ("${event.oper}")`) +
        ", auto " +
        event.veh
    );
  }

});

/*

These two stops can be used to monitor the relevant bus traffic north and south:

https://bussitutka.fi/map?mode=stop&stop=H3187
https://bussitutka.fi/map?mode=stop&stop=H3188

About the MQTT topic format:

 1        2         3              4               5            6 
/<prefix>/<version>/<journey_type>/<temporal_type>/<event_type>/<transport_mode>

   7             8                9          10             11         12           13          14              15        
  /<operator_id>/<vehicle_number>/<route_id>/<direction_id>/<headsign>/<start_time>/<next_stop>/<geohash_level>/<geohash>/<sid>/#

Geohash: (60.123, 24.789) becomes 60;24/17/28/39

   1   2  3       4       5  6   7 8 9 0 1 2 3 4 15             
 "/hfp/v2/journey/ongoing/vp/bus/+/+/+/+/+/+/+/+/60;24/29/49/31/#"
 */


