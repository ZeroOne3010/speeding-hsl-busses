export type Event = {
  VP: VehiclePositionMessage;
};

export type VehiclePositionMessage = {
  desi: string; // designation
  dir: string; // direction
  oper: number; // operatorId
  veh: number; // vehicle
  tst: string; // timestamp
  tsi: number; // Unix seconds timestamp
  spd: number; // speed (meters per second
  hdg: number; // heading
  lat: number; // latitude
  long: number; // longitude
  acc: number; // acceleration (meters per second squared)
  dl: number; // offset from schedule in seconds
  odo: number; // odometer meters
  oday: string; // operating day
  start: string; // start time
  loc: string; // location source
  stop: string; // stop id
  drst: number; // door status
  route: string; // route id
};

export type VehicleData = {
  startTime: string;
  operatorCode: number;
  operatorName: string;
  vehicleNumber: number;
  line: string;
  observations: Observation[];
};

export type Observation = {
  latitude: number;
  longitude: number;
  timestamp: number;
  speed: number;
  direction: number;
};

export type StaticDirectionInfo = {
  arrow: string;
  description: string;
};
