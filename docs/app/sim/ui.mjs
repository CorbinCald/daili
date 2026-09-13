// Small DOM toolkit for the simulated phone: an element builder, outline
// icons in the style of the app's Ionicons glyphs, and the shared controls
// (amount field, switch, connected button group, cards, buttons) that the
// screens compose. No framework; every control returns real DOM.

const SVG_NS = "http://www.w3.org/2000/svg";

/** Builds an element: `h("div", { class: "x", onClick }, child, [more])`. */
export function h(tag, props = null, ...children) {
  const element = document.createElement(tag);
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value === undefined || value === null || value === false) continue;
      if (key === "class") element.className = value;
      else if (key === "style" && typeof value === "object")
        applyStyle(element, value);
      else if (key === "dataset") Object.assign(element.dataset, value);
      else if (key.startsWith("on") && typeof value === "function") {
        element.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (key === "text") element.textContent = value;
      else if (key in element && typeof value !== "string" && key !== "type")
        element[key] = value;
      else element.setAttribute(key, value === true ? "" : value);
    }
  }
  append(element, children);
  return element;
}

/** Assigns inline styles, routing custom properties through setProperty. */
export function applyStyle(element, style) {
  for (const [property, value] of Object.entries(style)) {
    if (value === undefined || value === null) continue;
    if (property.startsWith("--"))
      element.style.setProperty(property, String(value));
    else element.style[property] = value;
  }
}

export function append(parent, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    parent.append(
      child instanceof Node ? child : document.createTextNode(String(child)),
    );
  }
  return parent;
}

// ---- icons ----------------------------------------------------------------

function gearPath(teeth = 8, outer = 222, inner = 176) {
  const points = [];
  const step = (Math.PI * 2) / teeth;
  for (let index = 0; index < teeth; index += 1) {
    const angle = index * step;
    const toothHalf = step * 0.22;
    const gapHalf = step * 0.5;
    for (const [radius, offset] of [
      [inner, -gapHalf + toothHalf * 0.6],
      [outer, -toothHalf],
      [outer, toothHalf],
      [inner, gapHalf - toothHalf * 0.6],
    ]) {
      points.push(
        `${(256 + Math.cos(angle + offset) * radius).toFixed(1)} ${(256 + Math.sin(angle + offset) * radius).toFixed(1)}`,
      );
    }
  }
  return `M${points.join("L")}Z`;
}

const ICONS = {
  "calendar-outline": [
    ["rect", { x: 48, y: 80, width: 416, height: 384, rx: 48, stroke: true }],
    ["path", { d: "M128 48v32M384 48v32M464 160H48", stroke: true }],
    [
      "path",
      {
        d: "M112 240h32M208 240h32M304 240h32M112 320h32M208 320h32M304 320h32M112 400h32M208 400h32",
        stroke: true,
        strokeWidth: 44,
      },
    ],
  ],
  "today-outline": [
    ["rect", { x: 48, y: 80, width: 416, height: 384, rx: 48, stroke: true }],
    ["path", { d: "M128 48v32M384 48v32M464 160H48", stroke: true }],
    ["rect", { x: 96, y: 208, width: 112, height: 112, rx: 20, fill: true }],
  ],
  "settings-outline": [
    ["path", { d: gearPath(), stroke: true, join: "round" }],
    ["circle", { cx: 256, cy: 256, r: 64, stroke: true }],
  ],
  "chevron-back": [
    ["path", { d: "M328 112 184 256l144 144", stroke: true, strokeWidth: 48 }],
  ],
  "chevron-forward": [
    ["path", { d: "M184 112l144 144-144 144", stroke: true, strokeWidth: 48 }],
  ],
  checkmark: [
    ["path", { d: "M416 128 192 384l-96-96", stroke: true, strokeWidth: 44 }],
  ],
  "checkmark-circle": [
    ["circle", { cx: 256, cy: 256, r: 208, fill: true }],
    ["path", { d: "M352 176 217.6 336 160 272", stroke: true, contrast: true }],
  ],
  "mic-outline": [
    ["rect", { x: 192, y: 32, width: 128, height: 256, rx: 64, stroke: true }],
    [
      "path",
      {
        d: "M368 192v32a112 112 0 0 1-224 0v-32M256 368v80M208 448h96",
        stroke: true,
      },
    ],
  ],
  "receipt-outline": [
    [
      "path",
      {
        d: "M112 464V80a16 16 0 0 1 16-16h256a16 16 0 0 1 16 16v384l-36-24-36 24-36-24-36 24-36-24-36 24-36-24z",
        stroke: true,
        join: "round",
      },
    ],
    ["path", { d: "M176 160h160M176 232h160M176 304h96", stroke: true }],
  ],
  "create-outline": [
    [
      "path",
      {
        d: "M384 224v184a40 40 0 0 1-40 40H104a40 40 0 0 1-40-40V168a40 40 0 0 1 40-40h167.48",
        stroke: true,
      },
    ],
    [
      "path",
      {
        d: "M459.94 53.25a16.06 16.06 0 0 0-23.22-.56L424.35 65a8 8 0 0 0 0 11.31l11.34 11.32a8 8 0 0 0 11.34 0l12.06-12c6.1-6.09 6.67-16.01.85-22.38zM399.34 90 218.82 270.2a9 9 0 0 0-2.31 3.93L208.16 322a3.91 3.91 0 0 0 4.86 4.86l47.87-8.35a9 9 0 0 0 3.93-2.31L445 136.06a5 5 0 0 0 0-7.07l-38.55-38.99a5 5 0 0 0-7.11 0z",
        fill: true,
      },
    ],
  ],
  "open-outline": [
    [
      "path",
      {
        d: "M384 224v184a40 40 0 0 1-40 40H104a40 40 0 0 1-40-40V168a40 40 0 0 1 40-40h167.48M336 64h112v112M224 288 448 64",
        stroke: true,
      },
    ],
  ],
  "wallet-outline": [
    ["rect", { x: 48, y: 112, width: 416, height: 336, rx: 56, stroke: true }],
    ["path", { d: "M464 208H352a64 64 0 0 0 0 128h112", stroke: true }],
    ["circle", { cx: 352, cy: 272, r: 22, fill: true }],
    ["path", { d: "M112 112 320 64", stroke: true }],
  ],
  "notifications-outline": [
    [
      "path",
      {
        d: "M427.68 351.43C402 320 383.87 304 383.87 217.35 383.87 138 343.35 109.73 310 96c-4.43-1.82-8.6-6-9.95-10.55C294.2 65.54 277.8 48 256 48s-38.21 17.55-44 37.47c-1.35 4.6-5.52 8.71-9.95 10.53-33.39 13.75-73.87 41.92-73.87 121.35C128.13 304 110 320 84.32 351.43 73.68 364.45 82.94 384 101.57 384h308.9c18.5 0 27.77-19.61 17.21-32.57zM320 384v16a64 64 0 0 1-128 0v-16",
        stroke: true,
      },
    ],
  ],
  "color-palette-outline": [
    [
      "path",
      {
        d: "M430.11 347.9c-6.64-6.4-16.31-10.9-32.11-10.9-18 0-28-6-40-14-18-13-30-24-30-46 0-20 8-40 35-50 25-9.5 60-9.5 60-9.5S492 218 492 178C492 105 429 48 320 48 172 48 20 148 20 288c0 145 84 200 250 200 88 0 165-39 165-100 0-13-2-31-4.89-40.1z",
        stroke: true,
      },
    ],
    ["circle", { cx: 144, cy: 208, r: 28, fill: true }],
    ["circle", { cx: 232, cy: 144, r: 28, fill: true }],
    ["circle", { cx: 344, cy: 152, r: 28, fill: true }],
    ["circle", { cx: 120, cy: 320, r: 28, fill: true }],
  ],
  "hardware-chip-outline": [
    ["rect", { x: 96, y: 96, width: 320, height: 320, rx: 40, stroke: true }],
    ["rect", { x: 176, y: 176, width: 160, height: 160, rx: 16, stroke: true }],
    [
      "path",
      {
        d: "M160 96V48M224 96V48M288 96V48M352 96V48M160 464v-48M224 464v-48M288 464v-48M352 464v-48M96 160H48M96 224H48M96 288H48M96 352H48M464 160h-48M464 224h-48M464 288h-48M464 352h-48",
        stroke: true,
      },
    ],
  ],
  "shield-checkmark-outline": [
    [
      "path",
      {
        d: "M479.07 111.36a16 16 0 0 0-13.15-14.74C379.89 81.71 300.11 47.12 256 32c-44.11 15.12-123.89 49.71-209.92 64.62a16 16 0 0 0-13.15 14.74c-3.85 61.11 4.36 118.05 24.43 169.19A346.32 346.32 0 0 0 148.7 396.9c39.24 40.92 78.32 63 96.19 73.08a16 16 0 0 0 15.57 0c17.87-10 56.95-32.16 96.19-73.08a346.32 346.32 0 0 0 91.34-116.35c20.06-51.14 28.27-108.08 24.42-169.19z",
        stroke: true,
      },
    ],
    ["path", { d: "M172 256l60 60 108-108", stroke: true }],
  ],
  "information-circle-outline": [
    ["circle", { cx: 256, cy: 256, r: 208, stroke: true }],
    ["path", { d: "M228 228h32v116M216 348h88", stroke: true }],
    ["circle", { cx: 256, cy: 164, r: 26, fill: true }],
  ],
};

/** An outline icon drawn in the style of the app's Ionicons glyphs. */
export function icon(
  name,
  {
    size = 24,
    color = "currentColor",
    contrastColor = "#ffffff",
    className = "",
  } = {},
) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 512 512");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  if (className) svg.setAttribute("class", className);
  for (const [tag, attributes] of ICONS[name] ?? []) {
    const shape = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(attributes)) {
      if (["stroke", "fill", "strokeWidth", "join", "contrast"].includes(key))
        continue;
      shape.setAttribute(key, String(value));
    }
    if (attributes.stroke) {
      shape.setAttribute("fill", "none");
      shape.setAttribute("stroke", attributes.contrast ? contrastColor : color);
      shape.setAttribute("stroke-width", String(attributes.strokeWidth ?? 32));
      shape.setAttribute("stroke-linecap", "round");
      shape.setAttribute("stroke-linejoin", attributes.join ?? "round");
    } else {
      shape.setAttribute("fill", color);
    }
    svg.append(shape);
  }
  return svg;
}

export function svgElement(tag, attributes = {}) {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attributes)) {
    if (value !== undefined && value !== null)
      element.setAttribute(key, String(value));
  }
  return element;
}

// ---- pressed feedback --------------------------------------------------------

/** Adds a `.is-pressed` class while a pointer rests on the element. */
export function pressable(element) {
  element.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    element.classList.add("is-pressed");
    const clear = () => {
      element.classList.remove("is-pressed");
      element.removeEventListener("pointerup", clear);
      element.removeEventListener("pointercancel", clear);
      element.removeEventListener("pointerleave", clear);
    };
    element.addEventListener("pointerup", clear);
    element.addEventListener("pointercancel", clear);
    element.addEventListener("pointerleave", clear);
  });
  return element;
}

export function button(props, ...children) {
  return pressable(h("button", { type: "button", ...props }, ...children));
}

// ---- images -----------------------------------------------------------------

export const ASSET_PREFIX = "./assets/sim/";

export function illustratedIcon(file, size) {
  // Inline sizes outrank the landing page's own `.phone img { width: 100% }`.
  return h("img", {
    alt: "",
    class: "s-illustrated",
    draggable: false,
    height: size,
    src: `${ASSET_PREFIX}${file}`,
    style: { height: `${size}px`, width: `${size}px` },
    width: size,
  });
}

export function categoryBadge(
  category,
  { size = 40, iconSize = 32, radius = 12 } = {},
) {
  return h(
    "span",
    {
      class: "s-category-badge",
      style: {
        background: `${category.color}18`,
        borderRadius: `${radius}px`,
        height: `${size}px`,
        width: `${size}px`,
      },
    },
    illustratedIcon(category.icon, iconSize),
  );
}

// ---- controls ---------------------------------------------------------------

/**
 * The app's amount field: currency symbol beside a decimal input, with an
 * optional sign toggle. `onChange` receives the sanitized text.
 */
export function currencyInput({
  allowNegative = false,
  ariaLabel,
  autoFocus = false,
  backgroundClass = "",
  inactiveBorder = "",
  isActive = false,
  onChange,
  onSubmit,
  placeholder,
  profile,
  sanitize,
  size = "medium",
  value = "",
}) {
  let current = value;
  const input = h("input", {
    "aria-label": ariaLabel,
    autocomplete: "off",
    class: "s-currency-input",
    inputmode: "decimal",
    placeholder:
      placeholder ??
      (profile.fractionDigits > 0
        ? `0.${"0".repeat(profile.fractionDigits)}`
        : "0"),
    type: "text",
  });
  const symbol = h("span", { class: "s-currency-symbol" }, profile.symbol);
  const field = h("div", {
    class: `s-currency-field is-${size}${allowNegative ? " is-signed" : ""}${backgroundClass ? ` ${backgroundClass}` : ""}`,
  });
  if (inactiveBorder)
    field.style.setProperty("--inactive-border", inactiveBorder);
  const wrap = h("div", { class: "s-currency-wrap" });
  let signButton = null;
  const isNegative = () => allowNegative && current.startsWith("-");
  const render = () => {
    input.value = isNegative() ? current.slice(1) : current;
    if (signButton) {
      signButton.textContent = isNegative() ? "−" : "±";
      signButton.setAttribute(
        "aria-label",
        isNegative() ? "Make amount positive" : "Make amount negative",
      );
    }
  };
  if (allowNegative) {
    signButton = button({
      class: "s-sign-button",
      onClick: () => {
        const magnitude = current.replace(/^-/, "");
        current = isNegative() ? magnitude : `-${magnitude}`;
        render();
        onChange?.(current);
      },
    });
    wrap.append(signButton);
  }
  if (profile.symbolPosition === "prefix") field.append(symbol);
  field.append(input);
  if (profile.symbolPosition === "suffix") field.append(symbol);
  wrap.append(field);
  input.addEventListener("input", () => {
    const magnitude = sanitize(input.value, profile);
    current = isNegative() ? `-${magnitude}` : magnitude;
    render();
    onChange?.(current);
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onSubmit?.();
    }
  });
  const api = {
    el: wrap,
    focus: () => input.focus(),
    getValue: () => current,
    input,
    setActive: (active) => field.classList.toggle("is-active", Boolean(active)),
    setValue: (next) => {
      current = next;
      render();
    },
  };
  api.setActive(isActive);
  render();
  if (autoFocus) queueMicrotask(() => input.focus({ preventScroll: true }));
  return api;
}

export function textInput({
  ariaLabel,
  className = "",
  onChange,
  onSubmit,
  placeholder,
  value = "",
}) {
  const input = h("input", {
    "aria-label": ariaLabel,
    autocomplete: "off",
    class: `s-text-input${className ? ` ${className}` : ""}`,
    placeholder,
    type: "text",
  });
  input.value = value;
  input.addEventListener("input", () => onChange?.(input.value));
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onSubmit?.();
    }
  });
  return input;
}

/** Material 3 switch: outlined track when off, accent track with a check when on. */
export function toggleSwitch({
  ariaLabel,
  disabled = false,
  label,
  onChange,
  value,
}) {
  let checked = Boolean(value);
  const thumb = h(
    "span",
    { class: "s-switch-thumb" },
    icon("checkmark", { size: 16, className: "s-switch-check" }),
  );
  const track = h("span", { class: "s-switch-track" }, thumb);
  const control = button(
    {
      "aria-checked": String(checked),
      "aria-label": ariaLabel,
      class: "s-switch",
      disabled: disabled || undefined,
      role: "switch",
      onClick: () => {
        onChange?.(!checked);
      },
    },
    label ?? null,
    track,
  );
  const api = {
    el: control,
    setValue: (next) => {
      checked = Boolean(next);
      control.setAttribute("aria-checked", String(checked));
      control.classList.toggle("is-on", checked);
    },
    setDisabled: (next) => {
      control.disabled = Boolean(next);
    },
  };
  api.setValue(checked);
  return api;
}

/** Connected button group: the selected segment is a full accent pill. */
export function buttonGroup({ ariaLabel, onChange, options, value }) {
  let selected = value;
  const group = h("div", {
    "aria-label": ariaLabel,
    class: "s-button-group",
    role: "radiogroup",
  });
  const segments = options.map((option) =>
    button(
      {
        "aria-label": option.label,
        "aria-checked": "false",
        class: "s-button-group-segment",
        role: "radio",
        onClick: () => {
          if (option.value === selected) return;
          selected = option.value;
          paint();
          onChange?.(option.value);
        },
      },
      h("span", { class: "s-button-group-check" }, "✓"),
      h("span", { class: "s-button-group-label" }, option.label),
    ),
  );
  const paint = () => {
    segments.forEach((segment, index) => {
      const active = options[index].value === selected;
      segment.classList.toggle("is-selected", active);
      segment.classList.toggle("is-first", index === 0);
      segment.classList.toggle("is-last", index === options.length - 1);
      segment.setAttribute("aria-checked", String(active));
    });
  };
  paint();
  group.append(...segments);
  return {
    el: group,
    setValue: (next) => {
      selected = next;
      paint();
    },
  };
}

export function primaryButton({
  ariaLabel,
  disabled = false,
  label,
  onClick,
  rightLabel,
  size = "medium",
  className = "",
}) {
  const labelNode = h("span", null, label);
  const element = button(
    {
      "aria-label": ariaLabel,
      class: `s-primary-button is-${size}${className ? ` ${className}` : ""}`,
      disabled: disabled || undefined,
      onClick,
    },
    labelNode,
    rightLabel ? h("span", null, rightLabel) : null,
  );
  return {
    el: element,
    setDisabled: (next) => {
      element.disabled = Boolean(next);
    },
    setLabel: (next) => {
      labelNode.textContent = next;
    },
  };
}

export function inlineActionButton({
  ariaLabel,
  disabled = false,
  label,
  onClick,
  trailingSymbol,
}) {
  const element = button(
    {
      "aria-label": ariaLabel,
      class: "s-inline-action",
      disabled: disabled || undefined,
      onClick,
    },
    h("span", { class: "s-inline-action-label" }, label),
    trailingSymbol
      ? h(
          "span",
          { "aria-hidden": "true", class: "s-inline-action-symbol" },
          trailingSymbol,
        )
      : null,
  );
  return {
    el: element,
    setDisabled: (next) => {
      element.disabled = Boolean(next);
    },
  };
}

/** A glyph button such as the "×" delete and close controls. */
export function iconButton({
  ariaLabel,
  className = "",
  color,
  fontSize = 22,
  glyph,
  lineHeight,
  onClick,
  pressedBackground,
  size = 32,
}) {
  const element = button(
    {
      "aria-label": ariaLabel,
      class: `s-icon-button${className ? ` ${className}` : ""}`,
      onClick,
      style: {
        color,
        fontSize: `${fontSize}px`,
        height: `${size}px`,
        lineHeight: `${lineHeight ?? size}px`,
        width: `${size}px`,
        ...(pressedBackground
          ? { "--pressed-background": pressedBackground }
          : {}),
      },
    },
    glyph instanceof Node ? glyph : h("span", { "aria-hidden": "true" }, glyph),
  );
  return element;
}

export function sectionCard(
  { className = "", headerRight, title, titleAccessory } = {},
  ...children
) {
  const card = h("section", {
    class: `s-section-card${className ? ` ${className}` : ""}`,
  });
  if (title || titleAccessory || headerRight) {
    card.append(
      h(
        "div",
        { class: "s-section-card-header" },
        h(
          "div",
          { class: "s-section-card-title-wrap" },
          titleAccessory ?? null,
          title ? h("h3", { class: "s-section-card-title" }, title) : null,
        ),
        headerRight ?? null,
      ),
    );
  }
  return append(card, children);
}

/** The category chip grid of the expense forms; tapping the selected chip clears it. */
export function categoryGrid({
  categories,
  labelColor,
  onChange,
  selected = "",
}) {
  let current = selected;
  const grid = h("div", { class: "s-category-grid" });
  const chips = categories.map((category) =>
    button(
      {
        "aria-label": `Use ${category.label} category`,
        "aria-pressed": "false",
        class: "s-category-chip",
        onClick: () => {
          current = current === category.id ? "" : category.id;
          paint();
          onChange?.(current);
        },
      },
      illustratedIcon(category.icon, 32),
      h("span", { class: "s-category-chip-label" }, category.label),
    ),
  );
  const paint = () => {
    chips.forEach((chip, index) => {
      const category = categories[index];
      const active = current === category.id;
      chip.classList.toggle("is-active", active);
      chip.setAttribute("aria-pressed", String(active));
      chip.style.borderColor = active ? category.color : "";
      chip.style.background = active ? `${category.color}15` : "";
      chip.style.color = active
        ? labelColor
          ? labelColor(category)
          : category.color
        : "";
    });
  };
  paint();
  grid.append(...chips);
  return {
    el: grid,
    getValue: () => current,
    setValue: (next) => {
      current = next;
      paint();
    },
  };
}
