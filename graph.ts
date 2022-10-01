import { Observation, VehicleData } from "./types";
import { ChartJSNodeCanvas, ChartCallback } from "chartjs-node-canvas";
import { ChartConfiguration } from "chart.js";
import { buildLabelsAndValues, SPEED_LIMIT_KPH } from "./constants";

const BLUE: string = "0, 38, 255";
const RED: string = "234, 15, 23";

const width = 1024;
const height = 576;

const chartCallback: ChartCallback = (ChartJS) => {
  ChartJS.defaults.responsive = true;
  ChartJS.defaults.maintainAspectRatio = false;
};
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, chartCallback });

export const createPngChart = async (vehicleData: VehicleData): Promise<Buffer> => {
  const observations: Observation[] = vehicleData.observations;
  const [labels, values]: [string[], number[]] = buildLabelsAndValues(observations);

  const borderColors: string[] = values.map((value: number) =>
    value > SPEED_LIMIT_KPH ? `rgba(${RED}, 1)` : `rgba(${BLUE}, 1)`
  );
  const backgroundColors: string[] = values.map((value: number) =>
    value > SPEED_LIMIT_KPH ? `rgba(${RED}, 0.2)` : `rgba(${BLUE}, 0.2)`
  );

  const lineColor = (ctx): string =>
    ctx.p0.parsed.y > SPEED_LIMIT_KPH || ctx.p1.parsed.y > SPEED_LIMIT_KPH ? `rgba(${RED}, 1)` : `rgba(${BLUE}, 1)`;

  const configuration: ChartConfiguration = {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Bussin nopeus (km/h)",
          data: values,
          spanGaps: true,
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
            lineWidth: (ctx) => (ctx.tick.value === SPEED_LIMIT_KPH ? 4 : 1),
            color: (ctx) => (ctx.tick.value === SPEED_LIMIT_KPH ? "#ffcd56" : "#e5e5e5")
          }
        }
      },
      plugins: {
        title: {
          display: true,
          text: "Linja " + vehicleData.line + " - lähtö " + vehicleData.startTime + "."
        },
        subtitle: {
          display: true,
          text: vehicleData.operatorName + ", auto " + vehicleData.vehicleNumber
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
