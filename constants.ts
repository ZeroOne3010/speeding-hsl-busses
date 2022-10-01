import { Observation, StaticDirectionInfo } from "./types";

/**
 * The speed limit on the observed area in kilometers per hour.
 */
export const SPEED_LIMIT_KPH = 30;

const percentageOverSpeedLimit = (speed: number, speedLimit: number): string => {
  return Math.round(100 * (speed / speedLimit - 1)) + "%";
};

const calculateSpeeding = (speed: number, speedLimit: number): string => {
  return Math.round((speed - speedLimit) * 10) / 10 + " km/h";
};

const speedToEmotion = (speed: number): string => {
  if (speed <= 0) return "🐛";
  if (speed <= 30) return "😊";
  if (speed <= 33) return "🙂";
  if (speed <= 34.5) return "🙁";
  if (speed <= 36) return "☹️";
  if (speed <= 40) return "😠";
  if (speed <= 45) return "😡";
  if (speed <= 50) return "😡😡";
  if (speed <= 60) return "😡😡😡";
  return "😡😡😡😡";
};

export const SPEED_LIMIT_THRESHOLDS = {
  30: [
    { maxSpeed: 0, description: (speed: number) => `Mittausdataa ei saatu. ${speedToEmotion(speed)}` },
    { maxSpeed: 30, description: (speed: number) => `Ei ylinopeutta. ${speedToEmotion(speed)}` },
    { maxSpeed: 33, description: (speed: number) => `Pysyi suunnilleen nopeusrajoituksessa. ${speedToEmotion(speed)}` },
    {
      maxSpeed: 999,
      description: (speed: number) =>
        `Suurin ylinopeus ${calculateSpeeding(speed, 30)} (${percentageOverSpeedLimit(speed, 30)}). ${speedToEmotion(
          speed
        )}`
    }
  ]
};

/**
 * Handle vehicle report if more than this many seconds have passed
 * since the last observation was received:
 */
export const BYGONE_VEHICLE_THRESHOLD = 15;

/**
 * Check every this many milliseconds whether some vehicle has passed
 * the observation zone would be ready to report:
 */
export const INTERVAL = 2000;

/**
 * North, North-East, East, South-East, ... arrows and descriptions for visualizing the direction of a vehicle.
 */
export const DIRECTIONS: StaticDirectionInfo[] = [
  { arrow: "↑", description: "pohjoiseen" },
  { arrow: "↗", description: "pohjoiseen" },
  { arrow: "→", description: "itään" },
  { arrow: "↘", description: "etelään" },
  { arrow: "↓", description: "etelään" },
  { arrow: "↙", description: "etelään" },
  { arrow: "←", description: "länteen" },
  { arrow: "↖", description: "pohjoiseen" },
  { arrow: "↑", description: "pohjoiseen" }
];

/**
 * Operators, from https://digitransit.fi/en/developers/apis/4-realtime-api/vehicle-positions/
 */
export const OPERATORS = {
  6: { name: "Oy Pohjolan Liikenne Ab" },
  12: { name: "Helsingin Bussiliikenne Oy" },
  17: { name: "Tammelundin Liikenne Oy" },
  18: { name: "Oy Pohjolan Liikenne Ab" },
  20: { name: "Bus Travel Åbergin Linja Oy" },
  21: { name: "Bus Travel Oy Reissu Ruoti" },
  22: { name: "Nobina Finland Oy" },
  30: { name: "Savonlinja Oy" },
  36: { name: "Nurmijärven Linja Oy" },
  40: { name: "HKL-Raitioliikenne" },
  47: { name: "Taksikuljetus Oy" },
  50: { name: "HKL-Metroliikenne" },
  51: { name: "Korsisaari Oy" },
  54: { name: "V-S Bussipalvelut Oy" },
  58: { name: "Koillisen Liikennepalvelut Oy" },
  60: { name: "Suomenlinnan Liikenne Oy" },
  59: { name: "Tilausliikenne Nikkanen Oy" },
  89: { name: "Metropolia" },
  90: { name: "VR Oy" },
  195: { name: "Siuntio" }
};

export const FINNISH_NUMBER_FORMAT = new Intl.NumberFormat("fi-FI");

export const dateToHhMmSs = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
};

export const buildLabelsAndValues = (
  observations: Pick<Observation, "speed" | "timestamp">[]
): [string[], number[]] => {
  const labelsWithGapsFilled: string[] = [];
  const valuesWithGaps: number[] = [];
  let nextExpectedTime: string = undefined;

  for (let i = 0; i < observations.length; i++) {
    const observation: Pick<Observation, "speed" | "timestamp"> = observations[i];
    const observation2: Pick<Observation, "speed" | "timestamp"> = observations[i + 1];

    const date: Date = new Date(observation.timestamp * 1000);
    const time: string = dateToHhMmSs(date);

    if (!observation2) {
      labelsWithGapsFilled.push(time);
      valuesWithGaps.push(observation.speed);
      break;
    }

    const date2: Date = new Date(observation2.timestamp * 1000);
    const time2: string = dateToHhMmSs(date2);

    const nextExpectedDate: Date = new Date(date);
    nextExpectedDate.setSeconds(date.getSeconds() + 1);
    nextExpectedTime = dateToHhMmSs(nextExpectedDate);

    labelsWithGapsFilled.push(time);
    valuesWithGaps.push(observation.speed);

    if (nextExpectedTime != time2) {
      const datestamp0Normalized: Date = new Date(date);
      const datestamp1Normalized: Date = new Date(date2);
      const missingSeconds: number = (datestamp1Normalized.getTime() - datestamp0Normalized.getTime()) / 1000 - 1;
      for (let gapIndex = 0; gapIndex < missingSeconds; gapIndex++) {
        datestamp0Normalized.setSeconds(datestamp0Normalized.getSeconds() + 1);
        nextExpectedTime = dateToHhMmSs(datestamp0Normalized);

        labelsWithGapsFilled.push(nextExpectedTime);
        valuesWithGaps.push(undefined);
      }
    }
  }
  return [labelsWithGapsFilled, valuesWithGaps];
};
