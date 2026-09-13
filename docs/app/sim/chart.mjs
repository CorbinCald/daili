// The cumulative pace chart: axis scale, series geometry and the scrub
// readout, following components/daili/budget/BudgetPacePlot.tsx and
// utils/budgetPaceGeometry.ts.

import { getLastActualIndex } from "./budget.mjs";
import { formatCurrency, formatCurrencyAxisValue } from "./format.mjs";
import { h, sectionCard, svgElement } from "./ui.mjs";

const PLOT_HEIGHT = 168;
const Y_AXIS_WIDTH = 52;
const X_AXIS_HEIGHT = 16;
const X_AXIS_GAP = 6;
const X_AXIS_BOTTOM_GAP = 6;
const X_AXIS_LABEL_WIDTH = 44;
const CHART_HEIGHT = PLOT_HEIGHT + X_AXIS_HEIGHT + X_AXIS_BOTTOM_GAP;
const PLOT_LEFT = Y_AXIS_WIDTH + X_AXIS_GAP;
const PLOT_TOP_INSET = 10;
const PLOT_BOTTOM_INSET = 6;
const TOOLTIP_WIDTH = 168;
const TOOLTIP_TOP_INSET = 2;
const TOOLTIP_BOTTOM_INSET = X_AXIS_HEIGHT + 10;
const POINT_MARKER_LIMIT = 12;
const POINT_MARKER_RADIUS = 3.5;
const CURRENT_MARKER_RADIUS = 5;
const CROSSHAIR_MARKER_RADIUS = 4.5;
const AXIS_STEP_MULTIPLIERS = [1, 2, 2.5, 5, 10];
const MAX_X_AXIS_LABELS = 12;
const AREA_TOP_OPACITY = 0.3;
const AREA_BOTTOM_OPACITY = 0.02;
const OVER_PLAN_OPACITY = 0.22;
/** Card content width inside the 360-point phone: 360 − 2×16 margin − 2×16 padding. */
export const CHART_CONTENT_WIDTH = 296;
const PLOT_WIDTH = CHART_CONTENT_WIDTH - PLOT_LEFT;

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function coordinate(value) {
  return Number(value.toFixed(2)).toString();
}

export function getPaceMaxValue(points) {
  return Math.max(
    1,
    ...points.flatMap((point) => [
      Math.max(0, point.actual ?? 0),
      Math.max(0, point.planned ?? 0),
    ]),
  );
}

export function getPaceAxisScale(maxValue, targetIntervals = 4) {
  const safeMaximum = Number.isFinite(maxValue) && maxValue > 0 ? maxValue : 1;
  const roughStep = safeMaximum / targetIntervals;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const normalized = roughStep / magnitude;
  const multiplier =
    AXIS_STEP_MULTIPLIERS.find((candidate) => normalized <= candidate) ?? 10;
  const step = multiplier * magnitude;
  const intervals = Math.max(1, Math.ceil(safeMaximum / step));
  return {
    maximum: intervals * step,
    ticks: Array.from({ length: intervals + 1 }, (_, index) =>
      Number((index * step).toPrecision(12)),
    ),
  };
}

function pointX(index, geometry) {
  if (geometry.pointCount <= 1) return geometry.width / 2;
  return (index / (geometry.pointCount - 1)) * geometry.width;
}

function valueY(value, geometry) {
  const usable = Math.max(
    0,
    geometry.height - PLOT_TOP_INSET - PLOT_BOTTOM_INSET,
  );
  const ratio =
    geometry.maximum > 0 ? clamp(value / geometry.maximum, 0, 1) : 0;
  return PLOT_TOP_INSET + (1 - ratio) * usable;
}

function seriesRuns(points, series, geometry) {
  const runs = [];
  let run = [];
  points.forEach((point, index) => {
    const value = point[series];
    if (value === null) {
      if (run.length > 0) runs.push(run);
      run = [];
      return;
    }
    run.push({ x: pointX(index, geometry), y: valueY(value, geometry) });
  });
  if (run.length > 0) runs.push(run);
  return runs;
}

function linePath(coordinates) {
  return coordinates
    .map(
      ({ x, y }, index) =>
        `${index === 0 ? "M" : "L"}${coordinate(x)} ${coordinate(y)}`,
    )
    .join(" ");
}

function areaPath(coordinates, geometry) {
  if (coordinates.length < 2) return "";
  const baseline = coordinate(valueY(0, geometry));
  return `${linePath(coordinates)} L${coordinate(coordinates.at(-1).x)} ${baseline} L${coordinate(coordinates[0].x)} ${baseline} Z`;
}

function isActualOverPlan(point) {
  return (
    point.planned !== null &&
    point.actual !== null &&
    point.actual > point.planned
  );
}

function interpolateCrossing(start, end) {
  const startDelta = start.actual - start.planned;
  const spread = startDelta - (end.actual - end.planned);
  if (spread === 0) return null;
  const ratio = startDelta / spread;
  if (!(ratio > 0 && ratio < 1)) return null;
  const value = start.actual + (end.actual - start.actual) * ratio;
  return {
    actual: value,
    index: start.index + (end.index - start.index) * ratio,
    planned: value,
  };
}

function comparableRuns(points) {
  const runs = [];
  let run = [];
  points.forEach((point, index) => {
    if (point.actual === null || point.planned === null) {
      if (run.length > 0) runs.push(run);
      run = [];
      return;
    }
    run.push({ actual: point.actual, index, planned: point.planned });
  });
  if (run.length > 0) runs.push(run);
  return runs;
}

function overPlanSpans(points) {
  const spans = [];
  for (const run of comparableRuns(points)) {
    let span = [];
    const close = () => {
      if (span.length >= 2) spans.push(span);
      span = [];
    };
    run.forEach((sample, index) => {
      const over = sample.actual > sample.planned;
      const previous = index > 0 ? run[index - 1] : null;
      if (previous && previous.actual > previous.planned !== over) {
        const crossing = interpolateCrossing(previous, sample);
        if (crossing) span.push(crossing);
        else if (over && previous.actual === previous.planned)
          span.push(previous);
        else if (!over && sample.actual === sample.planned) span.push(sample);
      }
      if (over) span.push(sample);
      else close();
    });
    close();
  }
  return spans;
}

function overPlanPath(span, geometry) {
  if (span.length < 2) return "";
  const actualEdge = span.map((sample) => ({
    x: pointX(sample.index, geometry),
    y: valueY(sample.actual, geometry),
  }));
  const plannedEdge = span
    .map((sample) => ({
      x: pointX(sample.index, geometry),
      y: valueY(sample.planned, geometry),
    }))
    .reverse();
  return `${linePath([...actualEdge, ...plannedEdge])} Z`;
}

function actualRunIndexes(points) {
  const runs = [];
  let run = [];
  points.forEach((point, index) => {
    if (point.actual === null) {
      if (run.length > 0) runs.push(run);
      run = [];
      return;
    }
    run.push(index);
  });
  if (run.length > 0) runs.push(run);
  return runs;
}

function actualLineSegments(points, geometry) {
  const segments = [];
  const plot = (index, value) => ({
    x: pointX(index, geometry),
    y: valueY(value, geometry),
  });
  const plotActual = (index) => plot(index, points[index].actual ?? 0);
  for (const indexes of actualRunIndexes(points)) {
    if (indexes.length === 1) {
      segments.push({
        coordinates: [plotActual(indexes[0])],
        isOverPlan: isActualOverPlan(points[indexes[0]]),
      });
      continue;
    }
    let coordinates = [];
    let isOverPlan = false;
    const addEdge = (from, to, edgeOver) => {
      if (coordinates.length > 0 && edgeOver !== isOverPlan) {
        segments.push({ coordinates, isOverPlan });
        coordinates = [];
      }
      if (coordinates.length === 0) {
        coordinates = [from];
        isOverPlan = edgeOver;
      }
      coordinates.push(to);
    };
    for (let step = 1; step < indexes.length; step += 1) {
      const startIndex = indexes[step - 1];
      const endIndex = indexes[step];
      const start = points[startIndex];
      const end = points[endIndex];
      const comparable = start.planned !== null && end.planned !== null;
      const startsOver = isActualOverPlan(start);
      const endsOver = isActualOverPlan(end);
      const crossing =
        comparable && startsOver !== endsOver
          ? interpolateCrossing(
              {
                actual: start.actual ?? 0,
                index: startIndex,
                planned: start.planned ?? 0,
              },
              {
                actual: end.actual ?? 0,
                index: endIndex,
                planned: end.planned ?? 0,
              },
            )
          : null;
      if (crossing) {
        const meeting = plot(crossing.index, crossing.actual);
        addEdge(plotActual(startIndex), meeting, startsOver);
        addEdge(meeting, plotActual(endIndex), endsOver);
        continue;
      }
      addEdge(
        plotActual(startIndex),
        plotActual(endIndex),
        comparable && (startsOver || endsOver),
      );
    }
    if (coordinates.length > 0) segments.push({ coordinates, isOverPlan });
  }
  return segments;
}

function maxXLabelCount(width, longestLabelLength) {
  const labelWidth = Math.max(1, longestLabelLength) * 7 + 14;
  return clamp(Math.floor(width / labelWidth), 2, MAX_X_AXIS_LABELS);
}

function visibleXLabelIndexes(pointCount, maxLabels) {
  if (pointCount <= 0) return [];
  const limit = Math.max(2, Math.min(maxLabels, pointCount));
  if (pointCount <= limit)
    return Array.from({ length: pointCount }, (_, index) => index);
  const lastIndex = pointCount - 1;
  const stride = Math.ceil(lastIndex / (limit - 1));
  const indexes = [];
  for (let index = 0; index < lastIndex; index += stride) indexes.push(index);
  if (lastIndex - indexes[indexes.length - 1] <= stride / 2) indexes.pop();
  indexes.push(lastIndex);
  return indexes;
}

function nearestPointIndex(x, geometry) {
  if (geometry.pointCount <= 1 || geometry.width <= 0) return 0;
  return Math.round(
    clamp(x / geometry.width, 0, 1) * (geometry.pointCount - 1),
  );
}

function seriesKey(color, variant) {
  const svg = svgElement("svg", {
    class: "s-series-key",
    height: 10,
    viewBox: "0 0 18 10",
    width: 18,
  });
  if (variant === "region") {
    svg.append(
      svgElement("rect", {
        fill: color,
        "fill-opacity": OVER_PLAN_OPACITY,
        height: 10,
        rx: 2,
        width: 18,
        x: 0,
        y: 0,
      }),
    );
    svg.append(
      svgElement("line", {
        stroke: color,
        "stroke-linecap": "round",
        "stroke-width": 2,
        x1: 1,
        x2: 17,
        y1: 2.5,
        y2: 2.5,
      }),
    );
  } else {
    svg.append(
      svgElement("line", {
        stroke: color,
        "stroke-dasharray": variant === "dashed" ? "4 3" : undefined,
        "stroke-linecap": "round",
        "stroke-width": variant === "dashed" ? 2 : 2.5,
        x1: 1,
        x2: 17,
        y1: 5,
        y2: 5,
      }),
    );
  }
  return svg;
}

/**
 * A pace chart card. `points` carry `{ actual, planned, label, unit, isCurrent }`
 * and the palette comes from the theme's CSS variables on the phone root.
 */
export function paceChart({
  detail,
  formatPointLabel,
  headerAccessory,
  headline,
  points,
  profile,
  theme,
  title,
  tone = "neutral",
}) {
  const hasPlanSeries = points.some((point) => point.planned !== null);
  const hasOverPlanDay = points.some(isActualOverPlan);
  const card = sectionCard({ title });
  if (headerAccessory)
    card.append(h("div", { class: "s-chart-accessory" }, headerAccessory));
  card.append(
    h(
      "div",
      { class: `s-pace-summary is-${tone}` },
      h("p", { class: "s-pace-headline" }, headline),
      h("p", { class: "s-pace-detail" }, detail),
    ),
  );
  if (points.length === 0) {
    card.append(
      h("p", { class: "s-chart-empty" }, "No pace data for this period."),
    );
    return card;
  }

  const axisScale = getPaceAxisScale(getPaceMaxValue(points));
  const geometry = {
    height: PLOT_HEIGHT,
    maximum: axisScale.maximum,
    pointCount: points.length,
    width: PLOT_WIDTH,
  };
  const gradientId = `sim-pace-fill-${Math.random().toString(36).slice(2, 8)}`;
  const svg = svgElement("svg", {
    class: "s-plot-svg",
    height: PLOT_HEIGHT,
    viewBox: `0 0 ${PLOT_WIDTH} ${PLOT_HEIGHT}`,
    width: PLOT_WIDTH,
  });
  const defs = svgElement("defs");
  const gradient = svgElement("linearGradient", {
    id: gradientId,
    x1: 0,
    x2: 0,
    y1: 0,
    y2: 1,
  });
  gradient.append(
    svgElement("stop", {
      offset: 0,
      "stop-color": theme.accent,
      "stop-opacity": AREA_TOP_OPACITY,
    }),
    svgElement("stop", {
      offset: 1,
      "stop-color": theme.accent,
      "stop-opacity": AREA_BOTTOM_OPACITY,
    }),
  );
  defs.append(gradient);
  svg.append(defs);
  for (const tick of axisScale.ticks) {
    svg.append(
      svgElement("line", {
        stroke: tick === 0 ? theme.border : theme.track,
        "stroke-width": 1,
        x1: 0,
        x2: PLOT_WIDTH,
        y1: valueY(tick, geometry),
        y2: valueY(tick, geometry),
      }),
    );
  }
  for (const run of seriesRuns(points, "actual", geometry)) {
    const path = areaPath(run, geometry);
    if (path)
      svg.append(svgElement("path", { d: path, fill: `url(#${gradientId})` }));
  }
  for (const span of overPlanSpans(points)) {
    const path = overPlanPath(span, geometry);
    if (path)
      svg.append(
        svgElement("path", {
          d: path,
          fill: theme.danger,
          "fill-opacity": OVER_PLAN_OPACITY,
        }),
      );
  }
  for (const run of seriesRuns(points, "planned", geometry)) {
    svg.append(
      svgElement("path", {
        d: linePath(run),
        fill: "none",
        stroke: theme.muted,
        "stroke-dasharray": "5 4",
        "stroke-linecap": "round",
        "stroke-width": 2,
      }),
    );
  }
  for (const segment of actualLineSegments(points, geometry)) {
    svg.append(
      svgElement("path", {
        d: linePath(segment.coordinates),
        fill: "none",
        stroke: segment.isOverPlan ? theme.danger : theme.accent,
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        "stroke-width": 2.5,
      }),
    );
  }
  const showMarkers = points.length <= POINT_MARKER_LIMIT;
  const lastActualIndex = getLastActualIndex(points);
  const dayColor = (point) =>
    isActualOverPlan(point) ? theme.danger : theme.accent;
  if (showMarkers) {
    points.forEach((point, index) => {
      if (point.planned === null) return;
      svg.append(
        svgElement("circle", {
          cx: pointX(index, geometry),
          cy: valueY(point.planned, geometry),
          fill: theme.surface,
          r: POINT_MARKER_RADIUS,
          stroke: theme.muted,
          "stroke-width": 2,
        }),
      );
    });
    points.forEach((point, index) => {
      if (point.actual === null || index === lastActualIndex) return;
      svg.append(
        svgElement("circle", {
          cx: pointX(index, geometry),
          cy: valueY(point.actual, geometry),
          fill: dayColor(point),
          r: POINT_MARKER_RADIUS,
          stroke: theme.surface,
          "stroke-width": 2,
        }),
      );
    });
  }
  if (lastActualIndex >= 0) {
    const point = points[lastActualIndex];
    const cx = pointX(lastActualIndex, geometry);
    const cy = valueY(point.actual ?? 0, geometry);
    svg.append(
      svgElement("circle", {
        cx,
        cy,
        fill: dayColor(point),
        "fill-opacity": 0.18,
        r: CURRENT_MARKER_RADIUS * 2,
      }),
    );
    svg.append(
      svgElement("circle", {
        cx,
        cy,
        fill: dayColor(point),
        r: CURRENT_MARKER_RADIUS,
        stroke: theme.surface,
        "stroke-width": 2,
      }),
    );
  }
  const crosshair = svgElement("g", { class: "s-plot-crosshair" });
  svg.append(crosshair);

  const yAxis = h("div", { "aria-hidden": "true", class: "s-plot-y-axis" });
  for (const tick of axisScale.ticks) {
    yAxis.append(
      h(
        "span",
        {
          class: "s-plot-y-label",
          style: { top: `${valueY(tick, geometry) - 7}px` },
        },
        formatCurrencyAxisValue(tick, profile, axisScale.maximum),
      ),
    );
  }
  const longestLabel = points.reduce(
    (longest, point) => Math.max(longest, point.label.length),
    1,
  );
  const xAxis = h("div", { class: "s-plot-x-axis" });
  for (const index of visibleXLabelIndexes(
    points.length,
    maxXLabelCount(PLOT_WIDTH, longestLabel),
  )) {
    const point = points[index];
    const isFirst = index === 0;
    const isLast = index === points.length - 1;
    xAxis.append(
      h(
        "span",
        {
          class: `s-plot-x-label${isFirst ? " is-start" : isLast ? " is-end" : ""}`,
          style:
            isFirst || isLast
              ? null
              : {
                  left: `${pointX(index, geometry) - X_AXIS_LABEL_WIDTH / 2}px`,
                },
        },
        point.label,
      ),
    );
  }
  const accessibleList = h(
    "ul",
    { class: "s-plot-a11y" },
    ...points.map((point) => {
      const label =
        point.actual === null
          ? `${point.label}: planned ${point.planned === null ? "N/A" : formatCurrency(point.planned, profile)}; no spending yet`
          : point.planned === null
            ? `${point.label}: ${formatCurrency(point.actual, profile)} actual; historical plan unavailable`
            : `${point.label}: ${formatCurrency(point.actual, profile)} actual, ${isActualOverPlan(point) ? "above" : "within"} the ${formatCurrency(point.planned, profile)} cumulative plan`;
      return h("li", null, label);
    }),
  );

  const tooltipAnchor = h("div", {
    class: "s-plot-tooltip-anchor",
    hidden: true,
  });
  const plot = h(
    "div",
    { class: "s-plot", style: { height: `${PLOT_HEIGHT}px` } },
    svg,
    accessibleList,
  );
  const chart = h(
    "div",
    { class: "s-chart", style: { height: `${CHART_HEIGHT}px` } },
    h("div", { class: "s-plot-row" }, yAxis, plot),
    h(
      "div",
      { class: "s-plot-x-row" },
      h("div", { class: "s-plot-y-spacer" }),
      xAxis,
    ),
    tooltipAnchor,
  );

  const renderTooltip = (point) => {
    const rows = [
      {
        color: dayColor(point),
        label: "Cumulative actual",
        value:
          point.actual === null ? "N/A" : formatCurrency(point.actual, profile),
        variant: "solid",
      },
    ];
    if (point.planned !== null)
      rows.push({
        color: theme.muted,
        label: "Cumulative plan",
        value: formatCurrency(point.planned, profile),
        variant: "dashed",
      });
    const remaining =
      point.actual === null || point.planned === null
        ? null
        : point.planned - point.actual;
    const status =
      remaining === null
        ? null
        : remaining === 0
          ? "Exactly on plan"
          : `${formatCurrency(Math.abs(remaining), profile)} ${remaining > 0 ? "under" : "over"} plan`;
    return h(
      "div",
      { class: "s-plot-tooltip" },
      h(
        "p",
        { class: "s-plot-tooltip-title" },
        formatPointLabel ? formatPointLabel(point) : point.label,
      ),
      ...rows.map((row) =>
        h(
          "div",
          { class: "s-plot-tooltip-row" },
          h(
            "span",
            { class: "s-plot-tooltip-key" },
            seriesKey(row.color, row.variant),
          ),
          h(
            "div",
            null,
            h("p", { class: "s-plot-tooltip-label" }, row.label),
            h("p", { class: "s-plot-tooltip-value" }, row.value),
          ),
        ),
      ),
      status
        ? h(
            "p",
            {
              class: `s-plot-tooltip-status is-${remaining > 0 ? "positive" : remaining < 0 ? "negative" : "neutral"}`,
            },
            status,
          )
        : null,
    );
  };

  let activeIndex = null;
  const setActive = (index) => {
    activeIndex = index;
    crosshair.replaceChildren();
    if (index === null) {
      tooltipAnchor.hidden = true;
      return;
    }
    const point = points[index];
    const x = pointX(index, geometry);
    crosshair.append(
      svgElement("line", {
        stroke: theme.muted,
        "stroke-width": 1,
        x1: x,
        x2: x,
        y1: PLOT_TOP_INSET,
        y2: valueY(0, geometry),
      }),
    );
    if (point.planned !== null)
      crosshair.append(
        svgElement("circle", {
          cx: x,
          cy: valueY(point.planned, geometry),
          fill: theme.surface,
          r: CROSSHAIR_MARKER_RADIUS - 0.5,
          stroke: theme.muted,
          "stroke-width": 2,
        }),
      );
    if (point.actual !== null)
      crosshair.append(
        svgElement("circle", {
          cx: x,
          cy: valueY(point.actual, geometry),
          fill: dayColor(point),
          r: CROSSHAIR_MARKER_RADIUS,
          stroke: theme.surface,
          "stroke-width": 2,
        }),
      );
    const isBelow =
      valueY(point.actual ?? point.planned ?? 0, geometry) < PLOT_HEIGHT / 2;
    const left = Math.min(
      Math.max(PLOT_LEFT + x - TOOLTIP_WIDTH / 2, PLOT_LEFT),
      Math.max(PLOT_LEFT, PLOT_LEFT + PLOT_WIDTH - TOOLTIP_WIDTH),
    );
    tooltipAnchor.style.left = `${left}px`;
    tooltipAnchor.style.top = isBelow ? "" : `${TOOLTIP_TOP_INSET}px`;
    tooltipAnchor.style.bottom = isBelow ? `${TOOLTIP_BOTTOM_INSET}px` : "";
    tooltipAnchor.replaceChildren(renderTooltip(point));
    tooltipAnchor.hidden = false;
  };

  let pointerStart = null;
  const plotX = (event) => {
    const rect = plot.getBoundingClientRect();
    return ((event.clientX - rect.left) / rect.width) * PLOT_WIDTH;
  };
  plot.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
    pointerStart = {
      moved: false,
      wasOpen: activeIndex !== null,
      x: event.clientX,
    };
    plot.setPointerCapture(event.pointerId);
    if (!pointerStart.wasOpen)
      setActive(nearestPointIndex(plotX(event), geometry));
  });
  plot.addEventListener("pointermove", (event) => {
    if (!pointerStart) return;
    if (!pointerStart.moved && Math.abs(event.clientX - pointerStart.x) < 6)
      return;
    pointerStart.moved = true;
    setActive(nearestPointIndex(plotX(event), geometry));
  });
  const endScrub = (event) => {
    if (!pointerStart) return;
    if (!pointerStart.moved && pointerStart.wasOpen) setActive(null);
    pointerStart = null;
    plot.releasePointerCapture?.(event.pointerId);
  };
  plot.addEventListener("pointerup", endScrub);
  plot.addEventListener("pointercancel", endScrub);

  card.append(chart);
  if (hasPlanSeries) {
    const legend = [
      { color: theme.accent, label: "Cumulative actual", variant: "solid" },
      { color: theme.muted, label: "Cumulative plan", variant: "dashed" },
      ...(hasOverPlanDay
        ? [{ color: theme.danger, label: "Over plan", variant: "region" }]
        : []),
    ];
    card.append(
      h(
        "div",
        { class: "s-chart-legend" },
        ...legend.map((item) =>
          h(
            "span",
            { class: "s-chart-legend-item" },
            seriesKey(item.color, item.variant),
            item.label,
          ),
        ),
      ),
    );
  }
  return card;
}
