import { VehicleData, VehiclePositionMessage } from "../types";

export type OutputSink = {
  name: string;
  handle: (payload: { message: string; chartBuffer: Buffer; vehicleData: VehicleData }) => Promise<void>;
  handleChartFailure?: (payload: { message: string; error: unknown }) => Promise<void>;
};

export type ObservationSink = {
  name: string;
  handleObservation: (payload: VehiclePositionMessage) => void;
};
