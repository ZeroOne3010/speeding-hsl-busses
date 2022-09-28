import { Observation } from "./types";
import { ChartJSNodeCanvas, ChartCallback } from "chartjs-node-canvas";
import { ChartConfiguration } from "chart.js";

const BLUE: string = "0, 38, 255";
const RED: string = "234, 15, 23";

const width = 1024;
const height = 576;

const chartCallback: ChartCallback = (ChartJS) => {
  ChartJS.defaults.responsive = true;
  ChartJS.defaults.maintainAspectRatio = false;
};
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, chartCallback });

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
  const borderColors = observations.map((observation) =>
    observation.speed > 30 ? `rgba(${RED}, 1)` : `rgba(${BLUE}, 1)`
  );
  const backgroundColors = observations.map((observation) =>
    observation.speed > 30 ? `rgba(${RED}, 0.2)` : `rgba(${BLUE}, 0.2)`
  );

  const lineColor = (ctx): string =>
    ctx.p0.parsed.y > 30 || ctx.p1.parsed.y > 30 ? `rgba(${RED}, 1)` : `rgba(${BLUE}, 1)`;

  const configuration: ChartConfiguration = {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Bussin nopeus (km/h)",
          data: values,
          borderColor: borderColors,
          backgroundColor: backgroundColors,
          borderWidth: 1,
          segment: {
            borderColor: lineColor
          }
        }
      ]
    },
    options: {
      scales: {
        y: {
          grid: {
            lineWidth: (ctx) => (ctx.tick.value === 30 ? 4 : 1),
            color: (ctx) => (ctx.tick.value === 30 ? "#ffcd56" : "#e5e5e5")
          }
        }
      }
    },
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
  return chartJSNodeCanvas.renderToBuffer(configuration);
};
