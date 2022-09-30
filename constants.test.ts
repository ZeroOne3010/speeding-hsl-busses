import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { SPEED_LIMIT_THRESHOLDS } from "./constants";

describe("speed", () => {
  it("should be described correctly", () => {
    assert.strictEqual(SPEED_LIMIT_THRESHOLDS[30][0].description(0), "Mittausdataa ei saatu. 🐛");
    assert.strictEqual(SPEED_LIMIT_THRESHOLDS[30][3].description(60), "Suurin ylinopeus 30 km/h (100%). 😡😡😡");
  });
});
