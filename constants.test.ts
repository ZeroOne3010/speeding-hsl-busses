import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { buildLabelsAndValues, dateToHhMmSs, SPEED_LIMIT_THRESHOLDS } from "./constants";

describe("speed", () => {
  it("should be described correctly", () => {
    assert.strictEqual(SPEED_LIMIT_THRESHOLDS[30][0].description(0), "Mittausdataa ei saatu. 🐛");
    assert.strictEqual(SPEED_LIMIT_THRESHOLDS[30][3].description(60), "Suurin ylinopeus 30 km/h (100%). 😡😡😡");
    assert.strictEqual(
      SPEED_LIMIT_THRESHOLDS[30][4].description(60),
      "Suurin ylinopeus 30 km/h (100%), siis 60 km/h kolmenkympin alueella! 😡😡😡"
    );
  });
});

describe("building labels and values", () => {
  const baseTimestamp = Math.floor(new Date(2022, 9, 1, 0, 0, 1).getTime() / 1000);
  it("should not do anything fancy when there are no gaps in an even number of data items", () => {
    const timestamps: number[] = [1664571601, 1664571602, 1664571603, 1664571604];
    const labelsAndValues: [string[], (number | null)[], string[]] = buildLabelsAndValues([
      { speed: 10, timestamp: baseTimestamp, offsetFromSchedule: -181 },
      { speed: 20, timestamp: baseTimestamp + 1, offsetFromSchedule: -180 },
      { speed: 30, timestamp: baseTimestamp + 2, offsetFromSchedule: -59 },
      { speed: 40, timestamp: baseTimestamp + 3, offsetFromSchedule: 60 }
    ]);
    assert.deepStrictEqual(labelsAndValues[0], ["00:00:01", "00:00:02", "00:00:03", "00:00:04"]);
    assert.deepStrictEqual(labelsAndValues[1], [10, 20, 30, 40]);
    assert.deepStrictEqual(labelsAndValues[2], ["red", "orange", "white", "green"]);
  });

  it("should not do anything fancy when there are no gaps in an odd number of data items", () => {
    const timestamps: number[] = [1664571601, 1664571602, 1664571603, 1664571604, 1664571605];
    const labelsAndValues: [string[], (number | null)[], string[]] = buildLabelsAndValues([
      { speed: 10, timestamp: baseTimestamp, offsetFromSchedule: -200 },
      { speed: 20, timestamp: baseTimestamp + 1, offsetFromSchedule: -100 },
      { speed: 30, timestamp: baseTimestamp + 2, offsetFromSchedule: -60 },
      { speed: 40, timestamp: baseTimestamp + 3, offsetFromSchedule: 0 },
      { speed: 50, timestamp: baseTimestamp + 4, offsetFromSchedule: 120 }
    ]);
    assert.deepStrictEqual(labelsAndValues[0], ["00:00:01", "00:00:02", "00:00:03", "00:00:04", "00:00:05"]);
    assert.deepStrictEqual(labelsAndValues[1], [10, 20, 30, 40, 50]);
    assert.deepStrictEqual(labelsAndValues[2], ["red", "orange", "orange", "white", "green"]);
  });

  it("should fill in a single second gap", () => {
    const labelsAndValues: [string[], (number | null)[], string[]] = buildLabelsAndValues([
      { speed: 10, timestamp: baseTimestamp, offsetFromSchedule: -181 },
      //{ speed: 20, timestamp: baseTimestamp + 1  },
      { speed: 30, timestamp: baseTimestamp + 2, offsetFromSchedule: -59 },
      { speed: 40, timestamp: baseTimestamp + 3, offsetFromSchedule: 120 }
    ]);
    assert.deepStrictEqual(labelsAndValues[0], ["00:00:01", "00:00:02", "00:00:03", "00:00:04"]);
    assert.deepStrictEqual(labelsAndValues[1], [10, null, 30, 40]);
    assert.deepStrictEqual(labelsAndValues[2], ["red", "transparent", "white", "green"]);
  });

  it("should fill in a multi-second gap", () => {
    const labelsAndValues: [string[], (number | null)[], string[]] = buildLabelsAndValues([
      { speed: 10, timestamp: baseTimestamp, offsetFromSchedule: -181 },
      // missing five seconds
      { speed: 30, timestamp: baseTimestamp + 6, offsetFromSchedule: -100 },
      { speed: 40, timestamp: baseTimestamp + 7, offsetFromSchedule: 60 }
    ]);
    assert.deepStrictEqual(labelsAndValues[0], [
      "00:00:01",
      "00:00:02",
      "00:00:03",
      "00:00:04",
      "00:00:05",
      "00:00:06",
      "00:00:07",
      "00:00:08"
    ]);
    assert.deepStrictEqual(labelsAndValues[1], [10, null, null, null, null, null, 30, 40]);
    assert.deepStrictEqual(labelsAndValues[2], [
      "red",
      "transparent",
      "transparent",
      "transparent",
      "transparent",
      "transparent",
      "orange",
      "green"
    ]);
  });

  it("should fill in several multi-second gaps", () => {
    const startTimestamp = 1664571601;
    const labelsAndValues: [string[], (number | null)[], string[]] = buildLabelsAndValues([
      { speed: 10, timestamp: startTimestamp, offsetFromSchedule: -181 },
      // missing three seconds
      { speed: 30, timestamp: startTimestamp + 4, offsetFromSchedule: -59 },
      { speed: 40, timestamp: startTimestamp + 5, offsetFromSchedule: 0 },
      // missing two seconds
      { speed: 50, timestamp: startTimestamp + 8, offsetFromSchedule: 60 }
    ]);
    assert.deepStrictEqual(labelsAndValues[0], [
      "00:00:01",
      "00:00:02",
      "00:00:03",
      "00:00:04",
      "00:00:05",
      "00:00:06",
      "00:00:07",
      "00:00:08",
      "00:00:09"
    ]);
    assert.deepStrictEqual(labelsAndValues[1], [10, null, null, null, 30, 40, null, null, 50]);
    assert.deepStrictEqual(labelsAndValues[2], [
      "red",
      "transparent",
      "transparent",
      "transparent",
      "white",
      "white",
      "transparent",
      "transparent",
      "green"
    ]);
  });
});
