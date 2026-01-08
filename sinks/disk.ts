import { promises as fs } from "fs";
import path from "path";
import { OutputSink } from "./types";

type DiskSinkOptions = {
  outputDir: string;
};

export const createDiskSink = ({ outputDir }: DiskSinkOptions): OutputSink => {
  return {
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
  };
};
