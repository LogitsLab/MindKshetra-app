import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";

const root = process.cwd();
const appRoot = join(root, "app");
const sourceRoots = [appRoot, join(root, "src")];
const sourceExtensions = new Set([".js", ".jsx", ".ts", ".tsx"]);

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function routeFromFile(file, keepGroups) {
  const extension = extname(file);
  const segments = relative(appRoot, file)
    .slice(0, -extension.length)
    .split(sep)
    .filter((segment) => segment !== "_layout" && segment !== "index")
    .filter((segment) => keepGroups || !/^\(.+\)$/.test(segment));
  return `/${segments.join("/")}`.replace(/\/+$/, "") || "/";
}

const routeTemplates = [
  ...new Set(
    walk(appRoot)
      .filter((file) => sourceExtensions.has(extname(file)))
      .filter((file) => !file.split(sep).some((segment) => segment.startsWith("+")))
      .flatMap((file) => [routeFromFile(file, true), routeFromFile(file, false)])
  ),
];

function routeRegex(template) {
  const escaped = template
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\\\[\\\[\\\.\\\.\\\.[^\]]+\\\]\\\]/g, "(?:.+)?")
    .replace(/\\\[\\\.\\\.\\\.[^\]]+\\\]/g, ".+")
    .replace(/\\\[[^\]]+\\\]/g, "[^/]+");
  return new RegExp(`^${escaped}/?$`);
}

const routeMatchers = routeTemplates.map((route) => ({
  route,
  regex: routeRegex(route),
}));

function normalizedTarget(raw) {
  return raw
    .replace(/\$\{[^}]+\}/g, "__dynamic__")
    .split(/[?#]/, 1)[0]
    .replace(/\/+$/, "") || "/";
}

function targetExists(raw) {
  const target = normalizedTarget(raw);
  return routeMatchers.some(({ regex }) => regex.test(target));
}

function callBodies(source) {
  const bodies = [];
  const call = /router\.(?:push|replace)\s*\(/g;
  let match;
  while ((match = call.exec(source))) {
    let depth = 1;
    let quote = null;
    let escaped = false;
    let index = call.lastIndex;
    for (; index < source.length && depth > 0; index += 1) {
      const char = source[index];
      if (quote) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === quote) quote = null;
        continue;
      }
      if (char === "'" || char === '"' || char === "`") quote = char;
      else if (char === "(") depth += 1;
      else if (char === ")") depth -= 1;
    }
    bodies.push(source.slice(call.lastIndex, Math.max(call.lastIndex, index - 1)));
    call.lastIndex = index;
  }
  return bodies;
}

function routeLiterals(source) {
  const routes = [];
  const literal = /(["'`])(\/(?!\/)(?:\\.|(?!\1).)*)\1/g;
  let match;
  while ((match = literal.exec(source))) routes.push(match[2]);
  return routes;
}

const failures = [];
let checkedRouterTargets = 0;
let unresolvedRouterCalls = 0;

for (const file of sourceRoots.flatMap(walk).filter((path) => sourceExtensions.has(extname(path)))) {
  const source = readFileSync(file, "utf8");
  for (const body of callBodies(source)) {
    const targets = routeLiterals(body);
    if (targets.length === 0) {
      unresolvedRouterCalls += 1;
      continue;
    }
    for (const target of targets) {
      checkedRouterTargets += 1;
      if (!targetExists(target)) {
        failures.push(`${relative(root, file)}: router target ${target}`);
      }
    }
  }
}

const notificationLogic = readFileSync(join(root, "src/notifications/logic.ts"), "utf8");
const notificationBlock =
  notificationLogic.match(
    /NOTIFICATION_ROUTE_TARGETS\s*=\s*\[([\s\S]*?)\]\s*as const/
  )?.[1] ?? "";
const notificationTargets = routeLiterals(notificationBlock);

if (notificationTargets.length === 0) {
  failures.push("src/notifications/logic.ts: no NOTIFICATION_ROUTE_TARGETS found");
}
for (const target of notificationTargets) {
  if (!targetExists(target)) {
    failures.push(`src/notifications/logic.ts: notification target ${target}`);
  }
}

if (failures.length > 0) {
  console.error("Route validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Validated ${checkedRouterTargets} router targets and ${notificationTargets.length} notification targets against ${routeTemplates.length} Expo routes.`
);
if (unresolvedRouterCalls > 0) {
  console.log(
    `${unresolvedRouterCalls} router calls use runtime values; their concrete route literals are validated at their declarations or boundary.`
  );
}
