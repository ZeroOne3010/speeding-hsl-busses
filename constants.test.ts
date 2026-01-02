import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { buildLabelsAndValues, SPEED_LIMIT_THRESHOLDS } from "./constants";

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
  it("should not do anything fancy when there are no gaps in an even number of data items", () => {
    const labelsAndValues: [string[], (number | null)[]] = buildLabelsAndValues([
      { speed: 10, timestamp: 1664571601 },
      { speed: 20, timestamp: 1664571602 },
      { speed: 30, timestamp: 1664571603 },
      { speed: 40, timestamp: 1664571604 }
    ]);
    assert.deepStrictEqual(labelsAndValues[0], ["00:00:01", "00:00:02", "00:00:03", "00:00:04"]);
    assert.deepStrictEqual(labelsAndValues[1], [10, 20, 30, 40]);
  });

  it("should not do anything fancy when there are no gaps in an odd number of data items", () => {
    const labelsAndValues: [string[], (number | null)[]] = buildLabelsAndValues([
      { speed: 10, timestamp: 1664571601 },
      { speed: 20, timestamp: 1664571602 },
      { speed: 30, timestamp: 1664571603 },
      { speed: 40, timestamp: 1664571604 },
      { speed: 50, timestamp: 1664571605 }
    ]);
    assert.deepStrictEqual(labelsAndValues[0], ["00:00:01", "00:00:02", "00:00:03", "00:00:04", "00:00:05"]);
    assert.deepStrictEqual(labelsAndValues[1], [10, 20, 30, 40, 50]);
  });

  it("should fill in a single second gap", () => {
    const labelsAndValues: [string[], (number | null)[]] = buildLabelsAndValues([
      { speed: 10, timestamp: 1664571601 },
      //{ speed: 20, timestamp: 1664571602  },
      { speed: 30, timestamp: 1664571603 },
      { speed: 40, timestamp: 1664571604 }
    ]);
    assert.deepStrictEqual(labelsAndValues[0], ["00:00:01", "00:00:02", "00:00:03", "00:00:04"]);
    assert.deepStrictEqual(labelsAndValues[1], [10, null, 30, 40]);
  });

  it("should fill in a multi-second gap", () => {
    const labelsAndValues: [string[], (number | null)[]] = buildLabelsAndValues([
      { speed: 10, timestamp: 1664571601 },
      // missing five seconds
      { speed: 30, timestamp: 1664571607 },
      { speed: 40, timestamp: 1664571608 }
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
  });

  it("should fill in several multi-second gaps", () => {
    const labelsAndValues: [string[], (number | null)[]] = buildLabelsAndValues([
      { speed: 10, timestamp: 1664571601 },
      // missing three seconds
      { speed: 30, timestamp: 1664571605 },
      { speed: 40, timestamp: 1664571606 },
      // missing two seconds
      { speed: 50, timestamp: 1664571609 }
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
  });
});
