function toDate(value) {
  return value instanceof Date ? value : new Date(value);
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(date) {
  const clone = startOfDay(date);
  const day = (clone.getDay() + 6) % 7;
  clone.setDate(clone.getDate() - day);
  return clone;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function filterByDateRange(items, from, to = new Date()) {
  return items.filter((item) => {
    const value = toDate(item.date);
    return value >= from && value <= to;
  });
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(toDate(value));
}

function formatShortDate(value) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(toDate(value));
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDuration(seconds) {
  if (!seconds || seconds < 60) {
    return `${seconds || 0}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  if (!remainder) {
    return `${minutes}m`;
  }

  return `${minutes}m ${remainder}s`;
}

function workoutVolume(log) {
  if (log.type === "weighted") {
    return log.sets.reduce((total, set) => total + set.reps * set.weight, 0);
  }

  if (log.type === "count") {
    return log.reps;
  }

  return log.seconds;
}

function workoutMinutes(log) {
  if (log.type === "timed") {
    return log.seconds / 60;
  }

  if (log.type === "weighted") {
    return log.sets.length * 2.2;
  }

  return 1;
}

function totalSetCount(log) {
  if (log.type === "weighted") {
    return log.sets.length;
  }

  return 1;
}

function getMostRecent(items) {
  if (!items.length) {
    return null;
  }

  return [...items].sort((a, b) => toDate(b.date) - toDate(a.date))[0];
}

export function renderFeatureHighlights(features) {
  return features.map((feature) => `<li>${feature}</li>`).join("");
}

export function renderPlanCards(plans, activePlanId) {
  return plans
    .map((plan) => {
      const active = plan.id === activePlanId ? "active" : "";
      return `
        <article class="plan-card ${active}" aria-label="${plan.name} plan">
          <h3>
            <span>${plan.name}</span>
            <span class="plan-price">$${plan.price}/mo</span>
          </h3>
          <p>${plan.description}</p>
        </article>
      `;
    })
    .join("");
}

export function renderSelectablePlanCards(plans, selectedPlanId, inputName) {
  return plans
    .map((plan) => {
      const checked = plan.id === selectedPlanId ? "checked" : "";
      const active = plan.id === selectedPlanId ? "active" : "";
      return `
        <label class="plan-card ${active}" for="${inputName}-${plan.id}">
          <input id="${inputName}-${plan.id}" type="radio" name="${inputName}" value="${plan.id}" ${checked} />
          <h3>
            <span>${plan.name}</span>
            <span class="plan-price">$${plan.price}/mo</span>
          </h3>
          <p>${plan.description}</p>
        </label>
      `;
    })
    .join("");
}

export function renderCheckboxGroup(options, inputName, selectedItems = []) {
  return options
    .map((option) => {
      const key = option.toLowerCase();
      const checked = selectedItems.includes(option) ? "checked" : "";
      return `
        <label for="${inputName}-${key}">
          <input id="${inputName}-${key}" type="checkbox" name="${inputName}" value="${option}" ${checked} />
          <span>${option}</span>
        </label>
      `;
    })
    .join("");
}

export function renderStepper(steps, activeStep) {
  return steps
    .map((step, index) => {
      const active = index === activeStep ? "active" : "";
      return `<li data-index="${index + 1}" class="${active}">${step}</li>`;
    })
    .join("");
}

function buildWorkoutSummary(logs, from, now = new Date()) {
  const scoped = filterByDateRange(logs, from, now);
  const sessions = scoped.length;
  const load = Math.round(scoped.reduce((total, log) => total + workoutVolume(log), 0));
  const minutes = Math.round(scoped.reduce((total, log) => total + workoutMinutes(log), 0));
  return { sessions, load, minutes, logs: scoped };
}

export function summarizeDashboard(workoutLogs, waterLogs, nutritionLogs, bodyMetrics) {
  const now = new Date();
  const today = buildWorkoutSummary(workoutLogs, startOfDay(now), now);
  const week = buildWorkoutSummary(workoutLogs, startOfWeek(now), now);
  const month = buildWorkoutSummary(workoutLogs, startOfMonth(now), now);

  const waterToday = filterByDateRange(waterLogs, startOfDay(now), now).reduce((sum, item) => sum + item.ounces, 0);
  const waterWeek = filterByDateRange(waterLogs, startOfWeek(now), now).reduce((sum, item) => sum + item.ounces, 0);

  const nutritionToday = filterByDateRange(nutritionLogs, startOfDay(now), now);
  const nutritionWeek = filterByDateRange(nutritionLogs, startOfWeek(now), now);

  const caloriesToday = nutritionToday.reduce((sum, item) => sum + item.calories, 0);
  const proteinToday = nutritionToday.reduce((sum, item) => sum + item.protein, 0);
  const caloriesWeek = nutritionWeek.reduce((sum, item) => sum + item.calories, 0);

  const latest = getMostRecent(bodyMetrics);
  const previous = bodyMetrics
    .filter((metric) => metric !== latest)
    .sort((a, b) => toDate(b.date) - toDate(a.date))[0];

  const bodyweightDelta = latest && previous ? (latest.bodyweight - previous.bodyweight).toFixed(1) : null;

  return {
    today,
    week,
    month,
    hydration: {
      today: waterToday,
      week: waterWeek,
    },
    nutrition: {
      caloriesToday,
      proteinToday,
      caloriesWeek,
    },
    body: {
      latest,
      bodyweightDelta,
    },
  };
}

export function renderTimeframeSummary(summary) {
  const cards = [
    {
      label: "Today",
      value: `${summary.today.sessions} sessions`,
      note: `${summary.today.minutes} mins | load ${formatNumber(summary.today.load)}`,
    },
    {
      label: "This Week",
      value: `${summary.week.sessions} sessions`,
      note: `${summary.week.minutes} mins | load ${formatNumber(summary.week.load)}`,
    },
    {
      label: "This Month",
      value: `${summary.month.sessions} sessions`,
      note: `${summary.month.minutes} mins | load ${formatNumber(summary.month.load)}`,
    },
  ];

  return cards
    .map(
      (card) => `
      <article class="metric-card">
        <p class="metric-label">${card.label}</p>
        <p class="metric-value">${card.value}</p>
        <p class="metric-note">${card.note}</p>
      </article>
    `
    )
    .join("");
}

export function renderHealthSummary(summary) {
  const body = summary.body.latest;
  const bodyweightLine = body
    ? `${body.bodyweight} lb (${summary.body.bodyweightDelta && Number(summary.body.bodyweightDelta) > 0 ? "+" : ""}${summary.body.bodyweightDelta || "0.0"} lb)`
    : "No body metric data";

  return `
    <article class="metric-card">
      <p class="metric-label">Hydration</p>
      <p class="metric-value">${summary.hydration.today} oz today</p>
      <p class="metric-note">${summary.hydration.week} oz this week</p>
    </article>
    <article class="metric-card">
      <p class="metric-label">Nutrition</p>
      <p class="metric-value">${formatNumber(summary.nutrition.caloriesToday)} kcal today</p>
      <p class="metric-note">Protein ${summary.nutrition.proteinToday}g today | ${formatNumber(summary.nutrition.caloriesWeek)} kcal week</p>
    </article>
    <article class="metric-card">
      <p class="metric-label">Body Metrics</p>
      <p class="metric-value">${bodyweightLine}</p>
      <p class="metric-note">Body fat ${body?.bodyFat ?? "-"}% | Resting HR ${body?.restingHr ?? "-"}</p>
    </article>
  `;
}

export function renderIntegrationSummary(user, subscription, googleSheets) {
  const planLabel = subscription.currentPlanId.charAt(0).toUpperCase() + subscription.currentPlanId.slice(1);

  const sheetsBlock = googleSheets.enabled
    ? `<p><strong>Google Sheets:</strong> <a href="${googleSheets.url}" target="_blank" rel="noreferrer">Open mirror</a> <span class="muted">(${googleSheets.lastSync})</span></p>`
    : "<p><strong>Google Sheets:</strong> Not enabled</p>";

  return `
    <article class="metric-card">
      <p class="metric-label">Identity</p>
      <p class="metric-note"><strong>${user.provider}</strong> | ${user.identity}</p>
      <p class="metric-note">Chart frequency: ${user.chartFrequency}</p>
    </article>
    <article class="metric-card">
      <p class="metric-label">Subscription</p>
      <p class="metric-note"><strong>${planLabel}</strong> plan | ${subscription.status}</p>
      <p class="metric-note">Stripe: ${subscription.stripeCheckoutStatus} | Renews ${formatDate(subscription.renewalDate)}</p>
    </article>
    <article class="metric-card">
      <p class="metric-label">Mirror State</p>
      ${sheetsBlock}
    </article>
  `;
}

export function renderTutorialPanel(commands, count = 5) {
  return commands
    .slice(0, count)
    .map((entry) => `<code>${entry.cmd}</code>`)
    .join("");
}

export function buildPlanAssessment(workoutLogs) {
  const now = new Date();
  const weekLogs = filterByDateRange(workoutLogs, startOfWeek(now), now);
  const setTotals = weekLogs.reduce((acc, log) => {
    const category = (log.category || "Other").toLowerCase();
    acc[category] = (acc[category] || 0) + totalSetCount(log);
    return acc;
  }, {});

  const pushSets = setTotals.push || 0;
  const pullSets = setTotals.pull || 0;
  const legSets = setTotals.legs || 0;
  const conditioningSessions = weekLogs.filter((log) => log.category === "Conditioning").length;

  const notes = [];

  if (pushSets - legSets >= 4) {
    notes.push(`Add 2-4 lower-body sets this week to reduce push-dominant loading (${pushSets} push vs ${legSets} legs).`);
  } else {
    notes.push("Push and lower-body volume are balanced enough for steady progression this week.");
  }

  if (pullSets < pushSets) {
    notes.push("Add 1 pull movement on the next upper day to keep shoulder balance strong.");
  } else {
    notes.push("Pull volume is keeping pace with pressing volume.");
  }

  if (conditioningSessions < 2) {
    notes.push("Add one 10-15 minute conditioning block to maintain aerobic base.");
  } else {
    notes.push("Conditioning frequency is on target for hybrid strength + fitness goals.");
  }

  if (weekLogs.length >= 7) {
    notes.push("Training density is high; consider one reduced-volume day for recovery quality.");
  }

  return notes;
}

function weightedSessionPeak(log) {
  if (!log || log.type !== "weighted") {
    return null;
  }

  return log.sets.reduce((best, set) => {
    if (!best) {
      return set;
    }

    if (set.weight > best.weight) {
      return set;
    }

    if (set.weight === best.weight && set.reps > best.reps) {
      return set;
    }

    return best;
  }, null);
}

export function buildExerciseReport(workoutLogs, exercise) {
  const filtered = workoutLogs
    .filter((log) => log.exercise === exercise)
    .sort((a, b) => toDate(b.date) - toDate(a.date));

  const last = filtered[0] || null;
  const previous = filtered[1] || null;

  let bestLabel = "No data";
  let suggestion = "Add at least two sessions to unlock overload guidance.";

  if (last?.type === "weighted") {
    const peaks = filtered.map(weightedSessionPeak).filter(Boolean);
    const best = peaks.sort((a, b) => b.weight - a.weight || b.reps - a.reps)[0];
    bestLabel = `${best.weight} x ${best.reps}`;

    const lastPeak = weightedSessionPeak(last);
    const previousPeak = weightedSessionPeak(previous);

    if (lastPeak && previousPeak) {
      if (lastPeak.weight > previousPeak.weight || lastPeak.reps >= previousPeak.reps + 1) {
        suggestion = "Progress is positive. Add 5 lb next session if bar speed remains strong.";
      } else if (lastPeak.weight === previousPeak.weight && lastPeak.reps < previousPeak.reps) {
        suggestion = "Performance dipped. Hold load steady and reduce one accessory set for recovery.";
      } else {
        suggestion = "Keep load stable and target +1 rep across top sets next session.";
      }
    }
  }

  if (last?.type === "count") {
    const bestReps = Math.max(...filtered.map((entry) => entry.reps));
    bestLabel = `${bestReps} reps`;
    suggestion = "Add 2 reps next session or pause at the bottom to increase difficulty.";
  }

  if (last?.type === "timed") {
    const bestSeconds = Math.max(...filtered.map((entry) => entry.seconds));
    bestLabel = formatDuration(bestSeconds);
    suggestion = "Extend next interval by 5-10 seconds while maintaining form quality.";
  }

  return {
    exercise,
    sessions: filtered.length,
    last,
    previous,
    bestLabel,
    suggestion,
    filtered,
  };
}

function logDetail(log) {
  if (log.type === "weighted") {
    const setLine = log.sets.map((set) => `${set.reps}x${set.weight}`).join(", ");
    return `${log.type} | ${setLine}`;
  }

  if (log.type === "count") {
    return `${log.type} | ${log.reps} reps`;
  }

  return `${log.type} | ${formatDuration(log.seconds)}`;
}

export function renderExerciseReport(report) {
  if (!report.sessions) {
    return "<p>No logs available for this exercise.</p>";
  }

  const lastLabel = report.last ? `${formatDate(report.last.date)} (${logDetail(report.last)})` : "No recent log";
  const previousLabel = report.previous ? `${formatDate(report.previous.date)} (${logDetail(report.previous)})` : "No previous log";

  return `
    <article class="metric-card">
      <p class="metric-label">Sessions Logged</p>
      <p class="metric-value">${report.sessions}</p>
      <p class="metric-note">Best effort: ${report.bestLabel}</p>
    </article>
    <article class="metric-card">
      <p class="metric-label">Last Session</p>
      <p class="metric-note">${lastLabel}</p>
      <p class="metric-note">Previous: ${previousLabel}</p>
    </article>
    <article class="metric-card">
      <p class="metric-label">Progressive Overload Suggestion</p>
      <p class="metric-note">${report.suggestion}</p>
    </article>
  `;
}

export function renderLogTypeCounts(workoutLogs) {
  const weightedCount = workoutLogs.filter((log) => log.type === "weighted").length;
  const countCount = workoutLogs.filter((log) => log.type === "count").length;
  const timedCount = workoutLogs.filter((log) => log.type === "timed").length;

  return `
    <article class="metric-card">
      <p class="metric-label">Weighted</p>
      <p class="metric-value">${weightedCount}</p>
    </article>
    <article class="metric-card">
      <p class="metric-label">Count</p>
      <p class="metric-value">${countCount}</p>
    </article>
    <article class="metric-card">
      <p class="metric-label">Timed</p>
      <p class="metric-value">${timedCount}</p>
    </article>
  `;
}

export function renderWorkoutLogs(workoutLogs, selectedExercise = null, limit = 12) {
  const scoped = selectedExercise ? workoutLogs.filter((log) => log.exercise === selectedExercise) : workoutLogs;

  return [...scoped]
    .sort((a, b) => toDate(b.date) - toDate(a.date))
    .slice(0, limit)
    .map((log) => {
      return `
        <article class="log-entry">
          <h4>${log.exercise}</h4>
          <p>${formatShortDate(log.date)} | ${logDetail(log)}</p>
        </article>
      `;
    })
    .join("");
}

export function renderCommandGallery(commands) {
  return commands
    .map(
      (entry) => `
      <article class="command-card">
        <code>${entry.cmd}</code>
        <p>${entry.description}</p>
      </article>
    `
    )
    .join("");
}

export function renderBillingSummary(state, plans) {
  const currentPlan = plans.find((plan) => plan.id === state.subscription.currentPlanId);
  const planLabel = currentPlan ? `${currentPlan.name} ($${currentPlan.price}/mo)` : state.subscription.currentPlanId;

  return `
    <article class="metric-card">
      <p class="metric-label">Current Plan</p>
      <p class="metric-value">${planLabel}</p>
      <p class="metric-note">Status: ${state.subscription.status}</p>
    </article>
    <article class="metric-card">
      <p class="metric-label">Stripe Confirmation</p>
      <p class="metric-note">${state.subscription.stripeCheckoutStatus}</p>
      <p class="metric-note">Last payment: ${formatDate(state.subscription.lastPaymentDate)}</p>
    </article>
  `;
}

export function getExerciseNames(workoutLogs) {
  return [...new Set(workoutLogs.map((log) => log.exercise))].sort();
}

export function renderExerciseOptions(exerciseNames, selectedExercise) {
  return exerciseNames
    .map((exercise) => {
      const selected = exercise === selectedExercise ? "selected" : "";
      return `<option value="${exercise}" ${selected}>${exercise}</option>`;
    })
    .join("");
}

export function logsToCsv(logs) {
  const header = ["date", "exercise", "type", "detail", "category"];
  const rows = logs.map((log) => {
    const detail = logDetail(log).replace(/,/g, " | ");
    return [toDate(log.date).toISOString(), log.exercise, log.type, detail, log.category || ""];
  });

  return [header, ...rows]
    .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
    .join("\n");
}

export function nutritionToCsv(logs) {
  const header = ["date", "item", "calories", "protein"];
  const rows = logs.map((log) => [toDate(log.date).toISOString(), log.item, log.calories, log.protein]);

  return [header, ...rows]
    .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
    .join("\n");
}

export function fullDataToText(state) {
  const goals = state.user.goals;
  const plan = state.subscription.currentPlanId;
  const logs = state.workoutLogs
    .slice(0, 15)
    .map((log) => `${formatDate(log.date)} - ${log.exercise} - ${logDetail(log)}`)
    .join("\n");

  return `FitTrack Export\nIdentity: ${state.user.provider} | ${state.user.identity}\nGoals: ${goals}\nPlan: ${plan}\n\nRecent logs\n${logs}`;
}
