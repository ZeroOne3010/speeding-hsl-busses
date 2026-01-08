import { VehicleData } from "../types";

export type OutputSink = {
  name: string;
  handle: (payload: { message: string; chartBuffer: Buffer; vehicleData: VehicleData }) => Promise<void>;
  handleChartFailure?: (payload: { message: string; error: unknown }) => Promise<void>;
};
