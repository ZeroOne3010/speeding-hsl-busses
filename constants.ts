import { StaticDirectionInfo } from "./types";

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

export const SPEED_LIMIT_THRESHOLDS = {
  30: [
    { maxSpeed: 30, description: (speed: number) => "Ei ylinopeutta. 😊" },
    { maxSpeed: 33, description: (speed: number) => "Pysyi suunnilleen nopeusrajoituksessa. 🙂" },
    {
      maxSpeed: 36,
      description: (speed: number) =>
        `Suurin ylinopeus ${calculateSpeeding(speed, 30)} (${percentageOverSpeedLimit(speed, 30)}) ☹️`
    },
    {
      maxSpeed: 40,
      description: (speed: number) =>
        `Suurin ylinopeus ${calculateSpeeding(speed, 30)} (${percentageOverSpeedLimit(speed, 30)}). 😠`
    },
    {
      maxSpeed: 999,
      description: (speed: number) =>
        `Suurin ylinopeus ${calculateSpeeding(speed, 30)} (${percentageOverSpeedLimit(speed, 30)}). 😡`
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
  { arrow: "↗", description: "koilliseen" },
  { arrow: "→", description: "itään" },
  { arrow: "↘", description: "kaakkoon" },
  { arrow: "↓", description: "etelään" },
  { arrow: "↙", description: "lounaaseen" },
  { arrow: "←", description: "länteen" },
  { arrow: "↖", description: "luoteeseen" },
  { arrow: "↑", description: "pohjoiseen" }
];

/**
 * Operators, from https://digitransit.fi/en/developers/apis/4-realtime-api/vehicle-positions/
 */
export const OPERATORS = {
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
