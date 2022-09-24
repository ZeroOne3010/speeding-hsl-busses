import { Observation } from "./types";
import { ChartJSNodeCanvas, ChartCallback } from "chartjs-node-canvas";
import { ChartConfiguration } from "chart.js";

const BLUE: string = "rgba(0, 38, 255, 1)";
const RED: string = "rgba(234, 15, 23, 1)";

export const createPngChart = async (observations: Observation[]): Promise<Buffer> => {
  var labels = observations.map((observation) => {
    const date = new Date(observation.timestamp * 1000);
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");
    const time = `${hours}:${minutes}:${seconds}`;
    return time;
  });

  const values = observations.map((observation) => observation.speed);
  const borderColors = observations.map((observation) => (observation.speed > 30 ? RED : BLUE));

  const width = 1024;
  const height = 576;
  const configuration: ChartConfiguration = {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Bussin nopeus (km/h)",
          data: values,
          borderColor: borderColors,
          borderWidth: 1
        }
      ]
    },
    options: {},
    plugins: [
      {
        id: "background-colour",
        beforeDraw: (chart) => {
          const ctx = chart.ctx;
          ctx.save();
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, width, height);
          ctx.restore();
        }
      }
    ]
  };
  const chartCallback: ChartCallback = (ChartJS) => {
    ChartJS.defaults.responsive = true;
    ChartJS.defaults.maintainAspectRatio = false;
  };
  const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, chartCallback });
  return chartJSNodeCanvas.renderToBuffer(configuration);
};
