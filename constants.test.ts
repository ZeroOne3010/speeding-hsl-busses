import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { buildLabelsAndValues, dateToHhMmSs, scheduleOffsetColors, SPEED_LIMIT_THRESHOLDS } from "./constants";

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
    const labelsAndValues: [string[], (number | null)[], string[], boolean[]] = buildLabelsAndValues([
      { speed: 10, timestamp: baseTimestamp, offsetFromSchedule: -240, doorsOpen: false },
      { speed: 20, timestamp: baseTimestamp + 1, offsetFromSchedule: -239, doorsOpen: true },
      { speed: 30, timestamp: baseTimestamp + 2, offsetFromSchedule: 119, doorsOpen: true },
      { speed: 40, timestamp: baseTimestamp + 3, offsetFromSchedule: 120, doorsOpen: false }
    ]);
    assert.deepStrictEqual(labelsAndValues[0], ["00:00:01", "00:00:02", "00:00:03", "00:00:04"]);
    assert.deepStrictEqual(labelsAndValues[1], [10, 20, 30, 40]);
    assert.deepStrictEqual(labelsAndValues[2], [
      scheduleOffsetColors["very late"],
      scheduleOffsetColors["late"],
      scheduleOffsetColors["on time"],
      scheduleOffsetColors["early"]]);
    assert.deepStrictEqual(labelsAndValues[3], [false, true, true, false]);
  });

  it("should not do anything fancy when there are no gaps in an odd number of data items", () => {
    const timestamps: number[] = [1664571601, 1664571602, 1664571603, 1664571604, 1664571605];
    const labelsAndValues: [string[], (number | null)[], string[], boolean[]] = buildLabelsAndValues([
      { speed: 10, timestamp: baseTimestamp, offsetFromSchedule: -240, doorsOpen: true },
      { speed: 20, timestamp: baseTimestamp + 1, offsetFromSchedule: -150, doorsOpen: true },
      { speed: 30, timestamp: baseTimestamp + 2, offsetFromSchedule: -120, doorsOpen: false },
      { speed: 40, timestamp: baseTimestamp + 3, offsetFromSchedule: 0, doorsOpen: true },
      { speed: 50, timestamp: baseTimestamp + 4, offsetFromSchedule: 120, doorsOpen: true }
    ]);
    assert.deepStrictEqual(labelsAndValues[0], ["00:00:01", "00:00:02", "00:00:03", "00:00:04", "00:00:05"]);
    assert.deepStrictEqual(labelsAndValues[1], [10, 20, 30, 40, 50]);
    assert.deepStrictEqual(labelsAndValues[2], [
      scheduleOffsetColors["very late"],
      scheduleOffsetColors["late"],
      scheduleOffsetColors["late"],
      scheduleOffsetColors["on time"],
      scheduleOffsetColors["early"]]);
    assert.deepStrictEqual(labelsAndValues[3], [true, true, false, true, true]);
  });

  it("should fill in a single second gap", () => {
    const labelsAndValues: [string[], (number | null)[], string[], boolean[]] = buildLabelsAndValues([
      { speed: 10, timestamp: baseTimestamp, offsetFromSchedule: -181, doorsOpen: false },
      //{ speed: 20, timestamp: baseTimestamp + 1  },
      { speed: 30, timestamp: baseTimestamp + 2, offsetFromSchedule: -59, doorsOpen: false },
      { speed: 40, timestamp: baseTimestamp + 3, offsetFromSchedule: 121, doorsOpen: false }
    ]);
    assert.deepStrictEqual(labelsAndValues[0], ["00:00:01", "00:00:02", "00:00:03", "00:00:04"]);
    assert.deepStrictEqual(labelsAndValues[1], [10, null, 30, 40]);
    assert.deepStrictEqual(labelsAndValues[2], [
      scheduleOffsetColors["late"],
      "transparent",
      scheduleOffsetColors["on time"],
      scheduleOffsetColors["early"]]);
    assert.deepStrictEqual(labelsAndValues[3], [false, false, false, false]);
  });

  it("should fill in a multi-second gap", () => {
    const labelsAndValues: [string[], (number | null)[], string[], boolean[]] = buildLabelsAndValues([
      { speed: 10, timestamp: baseTimestamp, offsetFromSchedule: -281, doorsOpen: false },
      // missing five seconds
      { speed: 30, timestamp: baseTimestamp + 6, offsetFromSchedule: -100, doorsOpen: false },
      { speed: 40, timestamp: baseTimestamp + 7, offsetFromSchedule: 60, doorsOpen: false }
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
      scheduleOffsetColors["very late"],
      "transparent",
      "transparent",
      "transparent",
      "transparent",
      "transparent",
      scheduleOffsetColors["on time"],
      scheduleOffsetColors["on time"]
    ]);
    assert.deepStrictEqual(labelsAndValues[3], [false, false, false, false, false, false, false, false]);
  });

  it("should fill in several multi-second gaps", () => {
    const startTimestamp = 1664571601;
    const labelsAndValues: [string[], (number | null)[], string[], boolean[]] = buildLabelsAndValues([
      { speed: 10, timestamp: startTimestamp, offsetFromSchedule: -240, doorsOpen: false },
      // missing three seconds
      { speed: 30, timestamp: startTimestamp + 4, offsetFromSchedule: -100, doorsOpen: false },
      { speed: 40, timestamp: startTimestamp + 5, offsetFromSchedule: 100, doorsOpen: false },
      // missing two seconds
      { speed: 50, timestamp: startTimestamp + 8, offsetFromSchedule: 120, doorsOpen: false }
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
      scheduleOffsetColors["very late"],
      "transparent",
      "transparent",
      "transparent",
      scheduleOffsetColors["on time"],
      scheduleOffsetColors["on time"],
      "transparent",
      "transparent",
      scheduleOffsetColors["early"]
    ]);
    assert.deepStrictEqual(labelsAndValues[3], [false, false, false, false, false, false, false, false, false]);
  });
});
