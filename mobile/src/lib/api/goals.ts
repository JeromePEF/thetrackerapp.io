import { api } from "./client";
import type { GoalsResponse } from "./types";

const ENDPOINTS = ["/api/account/goals"];

export function fetchGoals() {
  return api<GoalsResponse>("/api/account/goals");
}

export function saveGoals(goals: GoalsResponse) {
  return api<GoalsResponse>("/api/account/goals", {
    method: "POST",
    body: goals,
  });
}
