// Design rules checker. Fails the build when the interface drifts from the design system:
// spacing tokens, arbitrary values, fonts, icon libraries, copy rules (hyphens, filler words), debug output.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const espree = require("espree");

const SRC = path.resolve("src");
const issues = [];
const report = (file, line, rule, detail) =>
  issues.push(`${path.relative(process.cwd(), file)}:${line}  [${rule}]  ${detail}`);

// Spacing scale: 0, 2, 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96 px  =  Tailwind units below
const SPACING = new Set(["0", "0.5", "1", "2", "3", "4", "6", "8", "10", "12", "16", "20", "24"]);
const FILLER = [
  "revolutioniz", "supercharge", "cutting edge", "cutting-edge", "effortless",
  "transform your workflow", "next level", "harness the power", "world class", "world-class",
];
const BAD_FONTS = /\b(Inter|Roboto|Arial|Open Sans|Helvetica)\b/;
const BAD_PACKAGES = /from\s+["'](react-icons|bootstrap|react-bootstrap|bootstrap-icons|@mui|@material|@chatscope|react-toastify)/;
const COPY_ATTRS = new Set(["placeholder", "aria-label", "title", "alt", "label", "description"]);
const COPY_KEYS = new Set(["text", "title", "q", "a", "label", "message", "description", "placeholder"]);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

function checkCopy(file, line, value) {
  const text = value.trim();
  if (!text) return;
  if (/[A-Za-z]-[A-Za-z]/.test(text) || / - /.test(text)) report(file, line, "no-hyphens", JSON.stringify(text.slice(0, 70)));
  if (/[—–]/.test(text)) report(file, line, "no-dashes", JSON.stringify(text.slice(0, 70)));
  if (/!/.test(text)) report(file, line, "no-exclamation", JSON.stringify(text.slice(0, 70)));
  const lower = text.toLowerCase();
  FILLER.forEach((word) => lower.includes(word) && report(file, line, "banned-filler-word", word));
}

function visit(node, file, parent, fn) {
  if (!node || typeof node.type !== "string") return;
  fn(node, parent);
  for (const key of Object.keys(node)) {
    if (key === "loc" || key === "range" || key === "parent") continue;
    const child = node[key];
    if (Array.isArray(child)) child.forEach((c) => c && typeof c.type === "string" && visit(c, file, node, fn));
    else if (child && typeof child.type === "string") visit(child, file, node, fn);
  }
}

for (const file of walk(SRC)) {
  if (!/\.(jsx?|css)$/.test(file)) continue;
  const text = fs.readFileSync(file, "utf8");
  const isCss = file.endsWith(".css");

  // ---- class based rules (JS and CSS) ----
  if (!isCss) {
    for (const m of text.matchAll(/(?<![\w-])-?(?:m|p)[trblxyse]?-(\d+(?:\.\d+)?)(?![\w.])/g)) {
      if (!SPACING.has(m[1])) report(file, lineOf(text, m.index), "spacing", `${m[0]} is not in the spacing scale`);
    }
    for (const m of text.matchAll(/(?<![\w-])gap(?:-[xy])?-(\d+(?:\.\d+)?)(?![\w.])/g)) {
      if (!SPACING.has(m[1])) report(file, lineOf(text, m.index), "spacing", `${m[0]} is not in the spacing scale`);
    }
    for (const m of text.matchAll(/(?<![\w-])space-[xy]-(\d+(?:\.\d+)?)(?![\w.])/g)) {
      if (!SPACING.has(m[1])) report(file, lineOf(text, m.index), "spacing", `${m[0]} is not in the spacing scale`);
    }
    for (const m of text.matchAll(/(?<=["'`\s:])[a-z-]+-\[[^\]\s]+\]/g)) {
      if (m[0] !== "max-w-[680px]" && !m[0].startsWith("transition-[")) report(file, lineOf(text, m.index), "arbitrary-value", m[0]);
    }
    for (const m of text.matchAll(/(?<=["'`\s:])(?:text-(?:xs|sm|base|lg|xl|[2-9]xl)|font-(?:medium|semibold|normal|bold|black|extrabold|light|thin))(?![\w-])/g)) {
      report(file, lineOf(text, m.index), "text-style", `${m[0]} used directly. Use a named style (heading-N, title-N, body-N, button-N, caption-N)`);
    }
    for (const m of text.matchAll(/(?<=["'`\s:])(?:italic|bg-gradient-[\w-]+|bg-linear-[\w-]+|(?:from|via|to)-[a-z]+(?:-\d+)?)(?![\w-])/g)) {
      report(file, lineOf(text, m.index), "forbidden-style", m[0]);
    }
    for (const m of text.matchAll(/console\.\w+|window\.(?:alert|confirm)|(?<![\w.])(?:alert|confirm)\(/g)) {
      report(file, lineOf(text, m.index), "debug-or-native-dialog", m[0]);
    }
    const pkg = text.match(BAD_PACKAGES);
    if (pkg) report(file, lineOf(text, pkg.index), "icon-or-ui-library", pkg[1]);
  }
  const font = text.match(BAD_FONTS);
  if (font) report(file, lineOf(text, font.index), "font", `${font[0]} is not allowed`);
  if (/https?:\/\/(?!localhost|www\.w3\.org)/.test(text)) {
    const m = text.match(/https?:\/\/(?!localhost|www\.w3\.org)[^\s"'`)]+/);
    report(file, lineOf(text, m.index), "external-link", m[0]);
  }

  // ---- copy rules, found through the real JSX syntax tree ----
  if (file.endsWith(".jsx")) {
    const ast = espree.parse(text, { ecmaVersion: "latest", sourceType: "module", ecmaFeatures: { jsx: true }, loc: true });
    visit(ast, file, null, (node, parent) => {
      if (node.type === "JSXText") checkCopy(file, node.loc.start.line, node.value);
      if (node.type === "JSXAttribute" && COPY_ATTRS.has(node.name.name) && node.value?.type === "Literal") {
        checkCopy(file, node.loc.start.line, String(node.value.value));
      }
      if (node.type === "Property" && node.key?.name && COPY_KEYS.has(node.key.name) && node.value.type === "Literal" && typeof node.value.value === "string") {
        checkCopy(file, node.loc.start.line, node.value.value);
      }
      if (node.type === "CallExpression" && node.callee.type === "MemberExpression" && node.callee.object.name === "toast") {
        const arg = node.arguments[0];
        if (arg?.type === "Literal") checkCopy(file, node.loc.start.line, String(arg.value));
        if (arg?.type === "TemplateLiteral") arg.quasis.forEach((q) => checkCopy(file, node.loc.start.line, q.value.raw));
      }
      if (node.type === "TemplateElement" && parent?.type === "TemplateLiteral" && node.loc) {
        // template strings used as visible copy, e.g. {`Order ${id} ...`} inside JSX
      }
    });
  }
}

// index.html: no external resources
const html = fs.readFileSync("index.html", "utf8");
if (/(?:src|href)=["']https?:/.test(html)) issues.push("index.html  [external-link]  external script or stylesheet found");

if (issues.length) {
  console.error(`Design check failed with ${issues.length} issue(s):\n`);
  issues.forEach((issue) => console.error("  " + issue));
  process.exit(1);
}
console.log("Design check passed.");
