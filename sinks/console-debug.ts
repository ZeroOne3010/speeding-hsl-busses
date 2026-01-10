import { DIRECTIONS, OPERATORS, mpsToKph } from "../constants";
import { StaticDirectionInfo, VehiclePositionMessage } from "../types";
import { ObservationSink } from "./types";

const getDirectionForCompassAngle = (angle: number): StaticDirectionInfo => {
  return DIRECTIONS[Math.floor(((angle % 360) + 22.5) / 45)];
};

export const createConsoleDebugSink = (): ObservationSink => {
  return {
    name: "console-debug",
    handleObservation: (event: VehiclePositionMessage) => {
      const directionInfo = getDirectionForCompassAngle(event.hdg);
      const kilometersPerHour = mpsToKph(event.spd);
      const operatorName = OPERATORS[event.oper]?.name || `N/A ("${event.oper}")`;
      const line = event.desi;
      const vehicleNumber = event.veh;
      const timestamp = event.tst ?? new Date(event.tsi * 1000).toISOString();
      console.debug(
        timestamp +
          "  Linja " +
          line.padStart(4, " ") +
          ": " +
          directionInfo.arrow +
          " (" +
          event.hdg +
          "°) " +
          kilometersPerHour +
          " km/h" +
          "; " +
          event.acc +
          " m/s²; " +
          operatorName +
          ", auto " +
          vehicleNumber +
          "; Sijaintitiedon tyyppi: " +
          event.loc +
          "; Aikataulu: " +
          event.dl + " s"
      );
    }
  };
};
