import { Observation, VehicleData } from "./types";
import { ChartJSNodeCanvas, ChartCallback } from "chartjs-node-canvas";
import { Chart, ChartConfiguration, ScriptableLineSegmentContext, ScriptableScaleContext } from "chart.js";
import { buildLabelsAndValues, scheduleOffsetColors, SPEED_LIMIT_KPH } from "./constants";

const LINE_COLOR_NOT_SPEEDING: string = "#333333";
const LINE_COLOR_SPEEDING: string = "#810000ff";

const width = 1024;
const height = 576;

const chartCallback: ChartCallback = (ChartJS) => {
  ChartJS.defaults.responsive = true;
  ChartJS.defaults.maintainAspectRatio = false;
  ChartJS.defaults.font.family = "Noto Sans";
};
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, chartCallback });

export const createPngChart = async (vehicleData: VehicleData): Promise<Buffer> => {
  const observations: Observation[] = vehicleData.observations;
  const [labels, values, pointBackgroundColors]: [string[], (number | null)[], string[]] =
    buildLabelsAndValues(observations);

  const borderColors: string = "#333333";
  const lineColor = (ctx: ScriptableLineSegmentContext): string =>
    (ctx.p0.parsed.y != null && ctx.p0.parsed.y > SPEED_LIMIT_KPH) || (ctx.p1.parsed.y != null && ctx.p1.parsed.y > SPEED_LIMIT_KPH) ? LINE_COLOR_SPEEDING : LINE_COLOR_NOT_SPEEDING;

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
          pointBackgroundColor: pointBackgroundColors,
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
            lineWidth: (ctx: ScriptableScaleContext) => (ctx.tick.value === SPEED_LIMIT_KPH ? 4 : 1),
            color: (ctx: ScriptableScaleContext) => (ctx.tick.value === SPEED_LIMIT_KPH ? "#ffcd56" : "#e5e5e5")
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
          text: [
            vehicleData.operatorName + ", auto " + vehicleData.vehicleNumber
          ]
        }
      }
    },
    plugins: [
      {
        id: "background-colour",
        beforeDraw: (chart: Chart) => {
          const ctx = chart.ctx;
          ctx.save();
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, width, height);
          ctx.restore();
        }
      },
      {
        id: "schedule-legend",
        afterDraw: (chart: Chart) => {
          const ctx = chart.ctx;
          const { chartArea } = chart;
          const legendItems = [
            { label: "Myöhässä yli 4 min", color: scheduleOffsetColors["very late"] },
            { label: "Myöhässä 2-4 min", color: scheduleOffsetColors["late"] },
            { label: "Ajallaan (±2 min)", color: scheduleOffsetColors["on time"] },
            { label: "Etuajassa yli 2 min", color: scheduleOffsetColors["early"] }
          ];

          const boxSize = 10;
          const lineHeight = 14;
          const padding = 8;
          const legendWidth = 150;
          const startX = Math.max(chartArea.left + padding, chartArea.right - legendWidth - padding);
          const startY = chartArea.top + padding;

          ctx.save();
          ctx.font = "10px Noto Sans";
          ctx.textBaseline = "middle";
          legendItems.forEach((item, index) => {
            const y = startY + index * lineHeight;
            ctx.fillStyle = item.color;
            ctx.fillRect(startX, y - boxSize / 2, boxSize, boxSize);
            ctx.strokeStyle = "#333333";
            ctx.lineWidth = 1;
            ctx.strokeRect(startX + 0.5, y - boxSize / 2 + 0.5, boxSize - 1, boxSize - 1);
            ctx.fillStyle = "#1a1a1a";
            ctx.fillText(item.label, startX + boxSize + 6, y);
          });
          ctx.restore();
        }
      }
    ]
  };
  return chartJSNodeCanvas.renderToBuffer(configuration);
};
