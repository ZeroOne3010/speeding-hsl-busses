import { test } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";
import Database from "better-sqlite3";
import { createSqliteSink } from "./sqlite";
import { VehicleData } from "../types";

const createVehicleData = (): VehicleData => ({
  startTime: "0800",
  operatorCode: 1,
  operatorName: "Test Operator",
  vehicleNumber: 123,
  line: "55",
  observations: [
    {
      latitude: 60.1,
      longitude: 24.9,
      timestamp: 1700000000,
      speed: 35,
      direction: 90,
      acceleration: 0.2,
      offsetFromSchedule: -15,
      gps: true,
      doorsOpen: false
    },
    {
      latitude: 60.2,
      longitude: 24.95,
      timestamp: 1700000060,
      speed: 42,
      direction: 95,
      acceleration: 0.1,
      offsetFromSchedule: -10,
      gps: true,
      doorsOpen: true
    }
  ]
});

test("sqlite sink persists buses and observations", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "hsl-bus-"));
  const dbPath = path.join(tempDir, "buses.db");
  const sink = createSqliteSink({ dbPath });
  const vehicleData = createVehicleData();

  await sink.handle({ message: "ignored", chartBuffer: Buffer.alloc(0), vehicleData });

  const db = new Database(dbPath, { readonly: true });
  const busRow = db.prepare("SELECT * FROM buses").get() as {
    line: string;
    vehicle_number: number;
    observation_count: number;
  };
  const observationRows = db.prepare("SELECT * FROM observations ORDER BY timestamp").all() as Array<{
    speed_kph: number;
    doors_open: number;
  }>;

  assert.equal(busRow.line, "55");
  assert.equal(busRow.vehicle_number, 123);
  assert.equal(busRow.observation_count, 2);
  assert.equal(observationRows.length, 2);
  assert.equal(observationRows[0].speed_kph, 35);
  assert.equal(observationRows[1].doors_open, 1);
  db.close();
});

test("sqlite sink does not throw on invalid paths", async () => {
  const sink = createSqliteSink({ dbPath: "/dev/null/bus-data/buses.db" });
  const vehicleData = createVehicleData();

  await assert.doesNotReject(async () => {
    await sink.handle({ message: "ignored", chartBuffer: Buffer.alloc(0), vehicleData });
  });
});
