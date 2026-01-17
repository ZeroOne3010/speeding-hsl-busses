import { promises as fs } from "fs";
import path from "path";
import { OutputSink } from "./types";
import { VehicleData } from "../types";
import Database from "better-sqlite3";

type SqliteSinkOptions = {
  dbPath: string;
};

export const createSqliteSink = ({ dbPath }: SqliteSinkOptions): OutputSink => {
  let queue: Promise<void> = Promise.resolve();
  let initAttempted = false;
  let initError: unknown = null;
  let db: Database.Database | null = null;
  let insertBus:
      | Database.Statement<{
        line: string;
        operator_code: number;
        operator_name: string;
        vehicle_number: number;
        start_time: string;
        direction: string;
        observation_count: number;
        max_speed_kph: number;
        first_observed_at: number | null;
        last_observed_at: number | null;
      }>
    | null = null;
  let insertObservation:
    | Database.Statement<{
        bus_id: number;
        timestamp: number;
        latitude: number;
        longitude: number;
        speed_kph: number;
        direction: number;
        acceleration: number;
        offset_from_schedule: number;
        gps: number;
        doors_open: number;
      }>
    | null = null;

  const init = async (): Promise<void> => {
    if (initAttempted) {
      return;
    }
    initAttempted = true;
    try {
      await fs.mkdir(path.dirname(dbPath), { recursive: true });
      db = new Database(dbPath);
      db.pragma("journal_mode = DELETE");
      db.pragma("synchronous = NORMAL");
      db.exec(`
        CREATE TABLE IF NOT EXISTS buses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          line TEXT NOT NULL,
          operator_code INTEGER NOT NULL,
          operator_name TEXT NOT NULL,
          vehicle_number INTEGER NOT NULL,
          start_time TEXT,
          direction TEXT,
          observation_count INTEGER NOT NULL,
          max_speed_kph REAL NOT NULL,
          first_observed_at INTEGER,
          last_observed_at INTEGER,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS observations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          bus_id INTEGER NOT NULL,
          timestamp INTEGER NOT NULL,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          speed_kph REAL NOT NULL,
          direction REAL NOT NULL,
          acceleration REAL NOT NULL,
          offset_from_schedule INTEGER NOT NULL,
          gps INTEGER NOT NULL,
          doors_open INTEGER NOT NULL,
          FOREIGN KEY (bus_id) REFERENCES buses(id) ON DELETE CASCADE
        );
      `);
      const busColumns = db.prepare("PRAGMA table_info(buses)").all() as Array<{ name: string }>;
      const hasDirectionColumn = busColumns.some((column) => column.name === "direction");
      if (!hasDirectionColumn) {
        db.exec("ALTER TABLE buses ADD COLUMN direction TEXT");
      }
      insertBus = db.prepare(`
        INSERT INTO buses (
          line,
          operator_code,
          operator_name,
          vehicle_number,
          start_time,
          direction,
          observation_count,
          max_speed_kph,
          first_observed_at,
          last_observed_at
        ) VALUES (
          @line,
          @operator_code,
          @operator_name,
          @vehicle_number,
          @start_time,
          @direction,
          @observation_count,
          @max_speed_kph,
          @first_observed_at,
          @last_observed_at
        )
      `);
      insertObservation = db.prepare(`
        INSERT INTO observations (
          bus_id,
          timestamp,
          latitude,
          longitude,
          speed_kph,
          direction,
          acceleration,
          offset_from_schedule,
          gps,
          doors_open
        ) VALUES (
          @bus_id,
          @timestamp,
          @latitude,
          @longitude,
          @speed_kph,
          @direction,
          @acceleration,
          @offset_from_schedule,
          @gps,
          @doors_open
        )
      `);
    } catch (error) {
      initError = error;
      console.error(`SQLite sink failed to initialize ${dbPath}:`, error);
      try {
        db?.close();
      } catch (closeError) {
        console.error("SQLite sink failed to close database:", closeError);
      } finally {
        db = null;
        insertBus = null;
        insertObservation = null;
      }
    }
  };

  const enqueue = (task: () => Promise<void>): Promise<void> => {
    queue = queue.then(task).catch((error) => {
      console.error("SQLite sink error:", error);
    });
    return queue;
  };

  return {
    name: "sqlite",
    handle: async ({ vehicleData }) => {
      await enqueue(async () => {
        await init();
        if (initError || !db || !insertBus || !insertObservation) {
          return;
        }
        try {
          const observations = vehicleData.observations;
          const observationCount = observations.length;
          const maxSpeed = observations.reduce((max, observation) => Math.max(max, observation.speed), 0);
          const firstObservation = observations[0];
          const lastObservation = observations[observationCount - 1];

          const insertTransaction = db.transaction(() => {
            const busResult = insertBus?.run({
              line: vehicleData.line,
              operator_code: vehicleData.operatorCode,
              operator_name: vehicleData.operatorName,
              vehicle_number: vehicleData.vehicleNumber,
              start_time: vehicleData.startTime,
              direction: vehicleData.direction === "northbound" ? "N" : "S",
              observation_count: observationCount,
              max_speed_kph: maxSpeed,
              first_observed_at: firstObservation?.timestamp ?? null,
              last_observed_at: lastObservation?.timestamp ?? null
            });
            const busId = Number(busResult?.lastInsertRowid);
            if (!Number.isFinite(busId)) {
              throw new Error("SQLite sink failed to obtain bus id.");
            }
            for (const observation of observations) {
              insertObservation?.run({
                bus_id: busId,
                timestamp: observation.timestamp,
                latitude: observation.latitude,
                longitude: observation.longitude,
                speed_kph: observation.speed,
                direction: observation.direction,
                acceleration: observation.acceleration,
                offset_from_schedule: observation.offsetFromSchedule,
                gps: observation.gps ? 1 : 0,
                doors_open: observation.doorsOpen ? 1 : 0
              });
            }
          });
          insertTransaction();
        } catch (error) {
          console.error("SQLite sink failed to persist data:", error);
        }
      });
    }
  };
};
