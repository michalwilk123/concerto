"use client";

type Range = {
  min: number;
  max: number;
};

type Measurement = Range & {
  label: string;
  value: number;
  unit?: "px" | "";
};

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function formatValue(value: number, unit: "px" | "" = "px") {
  return `${round(value)}${unit}`;
}

export function logVisualRange(scope: string, measurement: Measurement, details?: unknown) {
  const unit = measurement.unit ?? "px";
  const pass = measurement.value >= measurement.min && measurement.value <= measurement.max;
  // Value is within the expected range — nothing to report.
  if (pass) return;

  const message = `${formatValue(measurement.value, unit)} expected to be ${formatValue(
    measurement.min,
    unit,
  )} - ${formatValue(measurement.max, unit)}`;

  console.warn(`[visual:${scope}] ${measurement.label}: ${message}`, {
    value: round(measurement.value),
    expectedMin: measurement.min,
    expectedMax: measurement.max,
    details,
  });
}

export function logVisualBoolean(
  scope: string,
  label: string,
  actual: boolean,
  expected: boolean,
  details?: unknown,
) {
  // Matches expectation — stay quiet.
  if (actual === expected) return;

  console.warn(`[visual:${scope}] ${label}: ${String(actual)} expected to be ${String(expected)}`, {
    actual,
    expected,
    details,
  });
}

export function describeElement(element: Element) {
  const rect = element.getBoundingClientRect();
  const styles = window.getComputedStyle(element);

  return {
    tagName: element.tagName.toLowerCase(),
    className: element.getAttribute("class"),
    text: element.textContent?.trim().replace(/\s+/g, " ").slice(0, 80),
    display: styles.display,
    position: styles.position,
    flex: styles.flex,
    flexWrap: styles.flexWrap,
    whiteSpace: styles.whiteSpace,
    overflowX: styles.overflowX,
    overflowY: styles.overflowY,
    width: round(rect.width),
    height: round(rect.height),
    scrollWidth: element.scrollWidth,
    scrollHeight: element.scrollHeight,
    clientWidth: element.clientWidth,
    clientHeight: element.clientHeight,
    x: round(rect.x),
    y: round(rect.y),
  };
}

export function logElementVisuals(
  scope: string,
  label: string,
  element: Element,
  expected: Partial<{
    width: Range;
    height: Range;
    childCount: Range;
    shouldOverflowX: boolean;
    shouldOverflowY: boolean;
    shouldClipText: boolean;
  }>,
) {
  const rect = element.getBoundingClientRect();
  const overflowX = element.scrollWidth > element.clientWidth;
  const overflowY = element.scrollHeight > element.clientHeight;
  const hasClippedText = overflowX || overflowY;
  const children = Array.from(element.children).map(describeElement);
  const details = {
    element: describeElement(element),
    children,
  };

  if (expected.width) {
    logVisualRange(scope, { label: `${label} width`, value: rect.width, ...expected.width }, details);
  }

  if (expected.height) {
    logVisualRange(scope, { label: `${label} height`, value: rect.height, ...expected.height }, details);
  }

  if (expected.childCount) {
    logVisualRange(
      scope,
      {
        label: `${label} child count`,
        value: element.children.length,
        unit: "",
        ...expected.childCount,
      },
      details,
    );
  }

  if (expected.shouldOverflowX !== undefined) {
    logVisualBoolean(scope, `${label} horizontal overflow`, overflowX, expected.shouldOverflowX, details);
  }

  if (expected.shouldOverflowY !== undefined) {
    logVisualBoolean(scope, `${label} vertical overflow`, overflowY, expected.shouldOverflowY, details);
  }

  if (expected.shouldClipText !== undefined) {
    logVisualBoolean(scope, `${label} clipped text`, hasClippedText, expected.shouldClipText, details);
  }
}
