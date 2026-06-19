import { api } from "./client";
import type { MeasurementsResponse } from "./types";

export function fetchMeasurements() {
  return api<MeasurementsResponse>("/api/user/measurements");
}
