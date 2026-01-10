import { writeFile } from "fs/promises";
import { resolve } from "path";
import { createPngChart } from "./graph";
import { Observation, VehicleData } from "./types";

const outputPath = resolve(process.cwd(), "graph-test-output.png");

const buildObservations = (): Observation[] => {
  const points = 90;
  const baseTimestamp = 1710000000;
  const observations: Observation[] = [];

  for (let i = 0; i < points; i++) {
    let speed = 0;
    if (i < 10) {
      speed = i * 2.2;
    } else if (i < 35) {
      speed = 20 + (i - 10) * 1.1;
    } else if (i < 60) {
      speed = 47.5 - (i - 35) * 0.6;
    } else if (i < 75) {
      speed = 32.5 - (i - 60) * 1.3;
    } else {
      speed = Math.max(0, 12 - (i - 75) * 1.6);
    }

    const offsetFromSchedule = Math.round(180 + (-540 * i) / (points - 1));

    observations.push({
      latitude: 60.2459,
      longitude: 24.992,
      timestamp: baseTimestamp + i,
      speed: Math.round(speed * 10) / 10,
      direction: 90,
      acceleration: 0.6,
      offsetFromSchedule,
      gps: i > 50 && i < 60
    });
  }

  return observations;
};

const graphTestVehicleData: VehicleData = {
  startTime: "12:34",
  operatorCode: 22,
  operatorName: "Testiauto Oy",
  vehicleNumber: 33,
  line: "123",
  observations: buildObservations()
};

const run = async (): Promise<void> => {
  const chartBuffer = await createPngChart(graphTestVehicleData);
  await writeFile(outputPath, chartBuffer);
  console.log(`Graph test image written to ${outputPath}`);
};

run().catch((error) => {
  console.error("Graph test failed:", error);
  process.exitCode = 1;
});
