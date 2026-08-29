import { defineComponent as K, computed as j, ref as G, watch as ge, onMounted as Se, onBeforeUnmount as xe, openBlock as c, createElementBlock as p, Fragment as M, createElementVNode as m, nextTick as Pe, reactive as Te, toDisplayString as $, renderList as F, createCommentVNode as L, createTextVNode as te, normalizeClass as Le, withDirectives as Me, withKeys as ke, vModelDynamic as qe, renderSlot as Q, createVNode as V, unref as I, h as ee, withModifiers as ne, createBlock as le } from "vue";
import he from "dompurify";
import De from "markdown-it";
import _e from "markdown-it-footnote";
import Oe from "markdown-it-task-lists";
function Ee(e) {
  return /fail|error|cancel|reject/iu.test(e) ? "danger" : /complete|success|done|approved/iu.test(e) ? "success" : /run|start|pending|wait/iu.test(e) ? "running" : "neutral";
}
function Ie(e, t = 80, o = 12e3) {
  const i = e.split(/\r?\n/u), s = i.slice(0, t).join(`
`).slice(0, o);
  return { text: s, truncated: s.length < e.length || i.length > t };
}
function Fe(e) {
  if (!Number.isFinite(e) || e <= 0)
    return "<1s";
  const t = Math.max(1, Math.round(e / 1e3)), o = Math.floor(t / 3600), i = Math.floor(t % 3600 / 60), s = t % 60, r = [];
  return o > 0 && r.push(`${String(o)}h`), (i > 0 || o > 0) && r.push(`${String(i)}m`), r.push(`${String(s > 0 || r.length === 0 ? s : 0)}s`), r.join(" ");
}
const ve = 80, ye = 12e3;
function je(e) {
  const t = e.trim().toLowerCase();
  return t.includes("fail") || t.includes("error") || t.includes("decline") || t.includes("cancel");
}
function re(e) {
  const t = Ee(e);
  if (t === "running")
    return "working";
  if (t === "success" || t === "danger")
    return t;
  const o = e.trim().toLowerCase();
  return o ? je(o) ? "danger" : /running|progress|pending|started/u.test(o) ? "working" : /success|complete|done|applied/u.test(o) ? "success" : "neutral" : "neutral";
}
function Be(e, t = ve, o = ye) {
  if (e.length > Math.max(Math.trunc(o), 1))
    return !0;
  const i = Math.max(Math.trunc(t), 1);
  return e.split(/\r\n|\r|\n/u).length > i;
}
function We(e, t = ve, o = ye) {
  return Ie(e, t, o).text;
}
function ze(e) {
  return e ? "Show preview" : "Show full output";
}
const Ue = "item/commandExecution/requestApproval", Ne = "item/fileChange/requestApproval";
function Ve(e) {
  return e === Ue;
}
function He(e) {
  return e === Ne;
}
function oe(e) {
  return e !== null && typeof e == "object" && !Array.isArray(e) ? e : null;
}
function Ge(e) {
  return typeof e == "string" ? e : "";
}
const Qe = {
  "approvalRisk.title.commandApproval": "Command approval",
  "approvalRisk.title.fileChangeApproval": "File change approval",
  "approvalRisk.title.toolApproval": "Tool approval",
  "approvalRisk.title.manualApproval": "Manual approval",
  "approvalRisk.label.unknownCommand": "Unknown command",
  "approvalRisk.label.deletesFiles": "Deletes files",
  "approvalRisk.label.changesPermissions": "Changes permissions",
  "approvalRisk.label.networkAccess": "Network access",
  "approvalRisk.label.changesDependencies": "Changes dependencies",
  "approvalRisk.label.mayDiscardWork": "May discard work",
  "approvalRisk.label.sensitiveCredentials": "Sensitive credentials",
  "approvalRisk.label.modifiesLockfile": "Modifies lockfile",
  "approvalRisk.label.highRiskCodePath": "High-risk code path",
  "approvalRisk.label.commandExecution": "Command execution",
  "approvalRisk.label.sessionPolicyChange": "Session policy change",
  "approvalRisk.label.outsideWorkspace": "Outside workspace",
  "approvalRisk.label.allowedByPolicy": "Allowed by policy",
  "approvalRisk.label.noCommandPolicy": "No command policy",
  "approvalRisk.label.policyUnavailable": "Policy unavailable",
  "approvalRisk.label.deniedByPolicy": "Denied by policy",
  "approvalRisk.label.fileWriteAccess": "File write access",
  "approvalRisk.label.sessionWriteScope": "Session write scope",
  "approvalRisk.label.allowedByFilePolicy": "Allowed by file policy",
  "approvalRisk.label.deniedByFilePolicy": "Denied by file policy",
  "approvalRisk.label.sensitivePath": "Sensitive path",
  "approvalRisk.label.ignoredPath": "Ignored path",
  "approvalRisk.label.readOnlyWorkspace": "Read-only workspace",
  "approvalRisk.label.externalTool": "External tool",
  "approvalRisk.label.manualDecision": "Manual decision",
  "approvalRisk.impact.commandMissing": "The command text is missing, so the action cannot be inspected before approval.",
  "approvalRisk.impact.deletesFiles": "The command may permanently delete files or directories.",
  "approvalRisk.impact.changesPermissions": "The command may alter system permissions or run with elevated privileges.",
  "approvalRisk.impact.networkAccess": "The command may contact external services or transmit repository data.",
  "approvalRisk.impact.changesDependencies": "The command may modify dependencies, lockfiles, or installed packages.",
  "approvalRisk.impact.mayDiscardWork": "The command can remove or overwrite local changes.",
  "approvalRisk.impact.sensitiveCredentials": "The command references authentication, secrets, credentials, or keys.",
  "approvalRisk.impact.modifiesLockfile": "Lockfile changes can alter installed dependency versions.",
  "approvalRisk.impact.highRiskCodePath": "The command references authentication, payment, billing, or permission-related paths.",
  "approvalRisk.impact.commandExecution": "The command will run on this machine in the selected workspace.",
  "approvalRisk.impact.sessionPolicyChange": "Accepting for session may allow similar commands without asking again.",
  "approvalRisk.impact.outsideWorkspacePaths": "The command references path(s) outside cwd: {paths}",
  "approvalRisk.impact.noCommandPolicy": "No injected command allowlist or denylist is configured for this command.",
  "approvalRisk.impact.cwd": "cwd: {cwd}",
  "approvalRisk.impact.fileWriteAccess": "Codex may write files after this approval.",
  "approvalRisk.impact.writeRoot": "write root: {path}",
  "approvalRisk.impact.outsideWorkspaceWriteRoot": "The requested write root appears to be outside the current workspace.",
  "approvalRisk.impact.externalTool": "This may call an external or connected tool with access to task context.",
  "approvalRisk.impact.manualDecision": "This action may affect the running task or connected tools.",
  "approvalRisk.description.commandApproval": "Codex wants permission to run a local command.",
  "approvalRisk.description.fileChangeApproval": "Codex wants permission to modify files.",
  "approvalRisk.description.genericDecision": "Codex is waiting for a user decision.",
  "approvalRisk.recommendation.highCommand": "Review the command carefully. Prefer declining unless the exact effect is expected.",
  "approvalRisk.recommendation.normalCommand": "Approve only if the command matches the task and workspace you expect.",
  "approvalRisk.recommendation.highFile": "Approve only if writing outside the workspace is intentional.",
  "approvalRisk.recommendation.normalFile": "Review the requested write scope before approving for the session.",
  "approvalRisk.recommendation.externalTool": "Approve only if the destination tool and data being shared are expected.",
  "approvalRisk.recommendation.manualDecision": "Review the request details before returning a result.",
  "approvalRisk.subject.workspaceFileChanges": "Workspace file changes"
};
function Ke(e, t = {}) {
  let o = Qe[e] ?? e;
  for (const [i, s] of Object.entries(t))
    o = o.split(`{${i}}`).join(s);
  return o;
}
const Xe = Ke;
function z(e) {
  return Ge(e).trim();
}
function H(e) {
  return Array.from(new Set(e.filter((t) => t.trim().length > 0)));
}
function D(e, t) {
  const o = { low: 0, medium: 1, high: 2 };
  return o[e] >= o[t] ? e : t;
}
function N(e, t) {
  return t.some((o) => o.test(e));
}
function Ye(e) {
  return (e.match(/(?:^|[\s"'])\/[^\s"'`]+/gu) ?? []).map((o) => o.trim().replace(/^["']/u, "").replace(/["']$/u, ""));
}
function de(e, t) {
  return t.some((o) => o.test(e));
}
function Ze(e, t) {
  const o = e.trim();
  let i = o ? "low" : "medium";
  const s = [], r = [];
  return o ? (N(o, [/\brm\s+(-[^\s]*r|--recursive)\b/u, /\brm\s+(-[^\s]*f|--force)\b/u]) && (i = D(i, "high"), s.push(t("approvalRisk.label.deletesFiles")), r.push(t("approvalRisk.impact.deletesFiles"))), N(o, [/\bsudo\b/u, /\bchmod\b/u, /\bchown\b/u]) && (i = D(i, "high"), s.push(t("approvalRisk.label.changesPermissions")), r.push(t("approvalRisk.impact.changesPermissions"))), N(o, [/\b(curl|wget|ssh|scp|rsync|gh|git\s+push)\b/u]) && (i = D(i, "medium"), s.push(t("approvalRisk.label.networkAccess")), r.push(t("approvalRisk.impact.networkAccess"))), N(o, [/\b(npm|pnpm|yarn|bun)\s+(install|add|remove|update)\b/u, /\bpip\s+install\b/u]) && (i = D(i, "medium"), s.push(t("approvalRisk.label.changesDependencies")), r.push(t("approvalRisk.impact.changesDependencies"))), N(o, [/\b(git\s+reset|git\s+clean|git\s+checkout)\b/u]) && (i = D(i, "high"), s.push(t("approvalRisk.label.mayDiscardWork")), r.push(t("approvalRisk.impact.mayDiscardWork"))), N(o, [/\b(auth|token|secret|password|credential|keychain|ssh-keygen)\b/iu]) && (i = D(i, "high"), s.push(t("approvalRisk.label.sensitiveCredentials")), r.push(t("approvalRisk.impact.sensitiveCredentials"))), de(o, [/(^|[\s/])(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?|Cargo\.lock|go\.sum)\b/iu]) && (i = D(i, "medium"), s.push(t("approvalRisk.label.modifiesLockfile")), r.push(t("approvalRisk.impact.modifiesLockfile"))), de(o, [/(^|\/)(auth|authentication|authorization|permission|permissions|rbac|acl|payment|payments|billing|checkout|stripe|paypal)(\/|\.|-|_)/iu]) && (i = D(i, "high"), s.push(t("approvalRisk.label.highRiskCodePath")), r.push(t("approvalRisk.impact.highRiskCodePath"))), {
    level: i,
    riskLabels: H(s.length > 0 ? s : [t("approvalRisk.label.commandExecution")]),
    impacts: H(r.length > 0 ? r : [t("approvalRisk.impact.commandExecution")])
  }) : (s.push(t("approvalRisk.label.unknownCommand")), r.push(t("approvalRisk.impact.commandMissing")), { level: i, riskLabels: s, impacts: r });
}
function be(e, t) {
  return !e || !t || !e.startsWith("/") ? !1 : e !== t && !e.startsWith(`${t.replace(/\/+$/u, "")}/`);
}
function Je(e, t) {
  const o = oe(e.params), i = z(o == null ? void 0 : o.command), s = z(o == null ? void 0 : o.cwd), r = z(o == null ? void 0 : o.reason), w = Array.isArray(o == null ? void 0 : o.proposedExecpolicyAmendment) ? o.proposedExecpolicyAmendment.map(z).filter(Boolean) : [], d = Ze(i, t);
  let u = d.level;
  const n = [...d.riskLabels], b = [...d.impacts], a = Ye(i).filter((l) => be(l, s));
  return w.length > 0 && (u = D(u, "medium"), n.push(t("approvalRisk.label.sessionPolicyChange")), b.push(t("approvalRisk.impact.sessionPolicyChange"))), a.length > 0 && (u = D(u, "high"), n.push(t("approvalRisk.label.outsideWorkspace")), b.push(t("approvalRisk.impact.outsideWorkspacePaths", { paths: a.slice(0, 3).join(", ") }))), e.commandPolicy && (e.commandPolicy.status === "allowed" ? (n.push(t("approvalRisk.label.allowedByPolicy")), b.push(e.commandPolicy.reason)) : e.commandPolicy.status === "not_configured" ? (u = D(u, "medium"), n.push(t("approvalRisk.label.noCommandPolicy")), b.push(t("approvalRisk.impact.noCommandPolicy"))) : e.commandPolicy.status === "not_git_workspace" ? (u = D(u, "medium"), n.push(t("approvalRisk.label.policyUnavailable")), b.push(e.commandPolicy.reason)) : e.commandPolicy.status === "denied" && (u = D(u, "high"), n.push(t("approvalRisk.label.deniedByPolicy")), b.push(e.commandPolicy.reason))), {
    title: t("approvalRisk.title.commandApproval"),
    level: u,
    description: r || t("approvalRisk.description.commandApproval"),
    subject: i || e.method,
    riskLabels: H(n),
    impacts: H(s ? [t("approvalRisk.impact.cwd", { cwd: s }), ...b] : b),
    recommendation: t(u === "high" ? "approvalRisk.recommendation.highCommand" : "approvalRisk.recommendation.normalCommand")
  };
}
function et(e, t) {
  const o = oe(e.params), i = z(o == null ? void 0 : o.grantRoot), s = z(o == null ? void 0 : o.reason), r = z(o == null ? void 0 : o.cwd);
  let w = i ? "medium" : "low";
  const d = [t("approvalRisk.label.fileWriteAccess")], u = [t("approvalRisk.impact.fileWriteAccess")];
  return i && (u.unshift(t("approvalRisk.impact.writeRoot", { path: i })), d.push(t("approvalRisk.label.sessionWriteScope"))), be(i, r) && (w = "high", d.push(t("approvalRisk.label.outsideWorkspace")), u.push(t("approvalRisk.impact.outsideWorkspaceWriteRoot"))), e.fileChangePolicy && (e.fileChangePolicy.status === "allowed" ? (d.push(t("approvalRisk.label.allowedByFilePolicy")), u.push(e.fileChangePolicy.reason)) : (w = "high", d.push(t("approvalRisk.label.deniedByFilePolicy")), u.push(e.fileChangePolicy.reason)), e.fileChangePolicy.category === "sensitive" && d.push(t("approvalRisk.label.sensitivePath")), e.fileChangePolicy.category === "ignored" && d.push(t("approvalRisk.label.ignoredPath")), e.fileChangePolicy.category === "read_only" && d.push(t("approvalRisk.label.readOnlyWorkspace"))), {
    title: t("approvalRisk.title.fileChangeApproval"),
    level: w,
    description: s || t("approvalRisk.description.fileChangeApproval"),
    subject: i || t("approvalRisk.subject.workspaceFileChanges"),
    riskLabels: H(d),
    impacts: H(u),
    recommendation: t(w === "high" ? "approvalRisk.recommendation.highFile" : "approvalRisk.recommendation.normalFile")
  };
}
function tt(e, t) {
  const o = oe(e.params), i = z(o == null ? void 0 : o.reason), s = e.method.trim(), r = /\b(mcp|tool)\b/iu.test(s);
  return {
    title: t(r ? "approvalRisk.title.toolApproval" : "approvalRisk.title.manualApproval"),
    level: r ? "high" : "medium",
    description: i || t("approvalRisk.description.genericDecision"),
    subject: e.method,
    riskLabels: r ? [t("approvalRisk.label.externalTool"), t("approvalRisk.label.manualDecision")] : [t("approvalRisk.label.manualDecision")],
    impacts: r ? [t("approvalRisk.impact.externalTool")] : [t("approvalRisk.impact.manualDecision")],
    recommendation: t(r ? "approvalRisk.recommendation.externalTool" : "approvalRisk.recommendation.manualDecision")
  };
}
function ot(e, t = Xe) {
  return Ve(e.method) ? Je(e, t) : He(e.method) ? et(e, t) : tt(e, t);
}
const X = {
  zoomOut: "缩小",
  fit: "适应",
  zoomIn: "放大",
  source: "源码",
  fullscreen: "全屏",
  rendering: (e) => `正在渲染 ${e}…`,
  diagramAria: (e) => `${e} 技术图`,
  wrap: "换行",
  scroll: "滚动",
  copy: "复制",
  save: "保存",
  dataTable: "数据表格",
  copyCsv: "复制 CSV",
  openFile: (e) => `打开 ${e}`,
  lineCount: (e) => `${String(e)} 行`,
  expandCode: (e) => `展开全部 · 共 ${String(e)} 行`,
  collapseCode: "收起代码"
}, q = new De({ breaks: !0, html: !1, linkify: !0, typographer: !1 });
q.use(Oe, { enabled: !1, label: !0, labelAfter: !0 });
q.use(_e);
function O(e, t) {
  return `<button type="button" class="markdown-tool-button" data-markdown-action="${e}" aria-label="${t}" title="${t}">${t}</button>`;
}
function Re(e, t = "", o = X) {
  const i = t.toLowerCase();
  if (i === "mermaid" || i === "plantuml" || i === "puml") {
    const k = i === "mermaid" ? "mermaid" : "plantuml";
    return `<div class="markdown-diagram-shell" data-diagram-engine="${k}"><header class="markdown-diagram-toolbar"><span>${k}</span><span class="markdown-diagram-actions">${O("diagram-zoom-out", o.zoomOut)}${O("diagram-fit", o.fit)}${O("diagram-zoom-in", o.zoomIn)}${O("diagram-source", o.source)}${O("diagram-fullscreen", o.fullscreen)}${O("diagram-export-svg", "SVG")}${O("diagram-export-png", "PNG")}</span></header><div class="markdown-diagram-stage" role="img" aria-label="${o.diagramAria(k)}"><p class="markdown-diagram-status">${o.rendering(k)}</p></div><pre class="markdown-diagram-source" hidden><code>${q.utils.escapeHtml(e)}</code></pre></div>
`;
  }
  const s = e.replace(/\n$/u, "").split(`
`), r = s.length <= 2 && s.every((k) => k.length <= 96), w = s.length > 10, d = t || "text", u = [r ? "is-compact-code" : "", /^[A-Za-z0-9_-]+$/u.test(t) ? `language-${t}` : ""].filter(Boolean).join(" "), n = u ? ` class="${u}"` : "", b = [r ? "is-compact" : "", w ? "is-collapsible is-collapsed" : ""].filter(Boolean).join(" "), a = w ? `${d} · ${o.lineCount(s.length)}` : d, l = w ? `<button type="button" class="markdown-tool-button markdown-code-collapse" data-markdown-action="toggle-code" aria-label="${o.collapseCode}" title="${o.collapseCode}" aria-expanded="false">${o.collapseCode}</button>` : "", f = w ? `<div class="markdown-code-expand"><button type="button" data-markdown-action="toggle-code" aria-expanded="false">${o.expandCode(s.length)}</button></div>` : "";
  return `<div class="markdown-code-host"><div class="markdown-code-shell${b ? ` ${b}` : ""}" data-language="${d}" data-code-lines="${String(s.length)}"><header class="markdown-code-toolbar"><span>${a}</span><span class="markdown-code-actions">${l}${O("wrap-code", o.wrap)}${O("copy-code", o.copy)}${O("save-code", o.save)}</span></header><pre class="markdown-code-block${r ? " is-compact" : ""}"><code${n}>${q.utils.escapeHtml(e)}</code></pre>${f}</div></div>
`;
}
q.renderer.rules.fence = (e, t, o, i) => {
  const s = e[t];
  return Re(s.content, s.info.trim().split(/\s+/u)[0] ?? "", i.labels);
};
q.renderer.rules.code_block = (e, t, o, i) => Re(e[t].content, "", i.labels);
q.renderer.rules.table_open = (e, t, o, i) => {
  const s = i.labels ?? X;
  return `<section class="markdown-table-shell" role="region" aria-label="${s.dataTable}" tabindex="0"><header class="markdown-table-toolbar">${O("copy-table", s.copyCsv)}</header><div class="markdown-table-scroll"><table>
`;
};
q.renderer.rules.table_close = () => `</table></div></section>
`;
const ce = q.renderer.rules.code_inline;
q.renderer.rules.code_inline = (e, t, o, i, s) => {
  const r = e[t].content, w = r.match(/^(.+?\.[A-Za-z0-9_-]{1,12})(?::(\d+))?$/u);
  if (!w || /\s/u.test(r)) return ce ? ce(e, t, o, i, s) : s.renderToken(e, t, o);
  const d = q.utils.escapeHtml(w[1]), u = w[2] ?? "", n = i.labels ?? X;
  return `<button type="button" class="markdown-file-link" data-markdown-action="open-file" data-file-path="${d}" data-file-line="${u}" title="${n.openFile(d)}"><code>${q.utils.escapeHtml(r)}</code></button>`;
};
const ue = q.renderer.rules.link_open;
q.renderer.rules.link_open = (e, t, o, i, s) => {
  const r = e[t];
  return /^https?:\/\//u.test(r.attrGet("href") ?? "") && (r.attrSet("target", "_blank"), r.attrSet("rel", "noopener noreferrer")), ue ? ue(e, t, o, i, s) : s.renderToken(e, t, o);
};
function pe(e, t = X) {
  return he.sanitize(q.render(e, { labels: t }), {
    ADD_ATTR: ["target"],
    ADD_TAGS: ["table", "thead", "tbody", "tr", "th", "td", "h1", "h2", "h3", "h4", "h5", "h6"],
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed"]
  });
}
function me(e) {
  var t;
  return (((t = e.match(/^\s*```/gmu)) == null ? void 0 : t.length) ?? 0) % 2 === 1 ? `${e}

\`\`\`` : e;
}
const at = ["innerHTML"], it = ["src"], fe = /* @__PURE__ */ K({
  __name: "CodyMarkdown",
  props: {
    text: {},
    cwd: {},
    labels: {},
    dark: { type: Boolean, default: !1 },
    renderDelay: { default: 75 },
    resolveAssetUrl: {},
    renderDiagram: {}
  },
  emits: ["openFile"],
  setup(e, { emit: t }) {
    const o = e, i = t, s = j(() => o.labels ?? X), r = G(null), w = G(null), d = G(pe(me(o.text), s.value)), u = G(""), n = /* @__PURE__ */ new Set();
    let b = 0, a = 0;
    const l = {
      javascript: () => import("highlight.js/lib/languages/javascript"),
      typescript: () => import("highlight.js/lib/languages/typescript"),
      python: () => import("highlight.js/lib/languages/python"),
      go: () => import("highlight.js/lib/languages/go"),
      rust: () => import("highlight.js/lib/languages/rust"),
      json: () => import("highlight.js/lib/languages/json"),
      bash: () => import("highlight.js/lib/languages/bash"),
      sql: () => import("highlight.js/lib/languages/sql")
    };
    async function f(g) {
      window.clearTimeout(b), b = window.setTimeout(async () => {
        d.value = pe(me(g), s.value), await Pe(), k();
      }, o.renderDelay);
    }
    async function k() {
      var A, v, h, S, R, B;
      for (const x of Array.from(((A = r.value) == null ? void 0 : A.querySelectorAll("td")) ?? []))
        /^-?[\d,.]+%?$/u.test(((v = x.textContent) == null ? void 0 : v.trim()) ?? "") && (x.dataset.numeric = "true");
      for (const x of Array.from(((h = r.value) == null ? void 0 : h.querySelectorAll("img")) ?? []))
        x.addEventListener("error", () => {
          x.alt = x.alt || "图片加载失败", x.classList.add("is-load-error");
        }, { once: !0 });
      y();
      for (const [x, P] of Array.from(((S = r.value) == null ? void 0 : S.querySelectorAll(".markdown-code-shell")) ?? []).entries()) {
        P.dataset.codeIndex = String(x), P.classList.contains("is-collapsible") && n.has(x) && P.classList.remove("is-collapsed");
        for (const T of Array.from(P.querySelectorAll('[data-markdown-action="toggle-code"]')))
          T.setAttribute("aria-expanded", String(!P.classList.contains("is-collapsed")));
        const _ = P.querySelector("pre"), W = P.querySelector('[data-markdown-action="wrap-code"]');
        _ && W && (W.hidden = _.scrollWidth <= _.clientWidth + 2, W.setAttribute("aria-pressed", String(P.classList.contains("is-wrapped"))));
      }
      await E();
      const g = Array.from(((R = r.value) == null ? void 0 : R.querySelectorAll('pre code[class*="language-"]')) ?? []);
      if (g.length === 0) return;
      const C = (await import("highlight.js/lib/core")).default;
      for (const x of g) {
        const P = ((B = Array.from(x.classList).find((T) => T.startsWith("language-"))) == null ? void 0 : B.slice(9)) ?? "", _ = l[P];
        if (!_ || x.dataset.highlighted === "yes") continue;
        const W = await _();
        C.getLanguage(P) || C.registerLanguage(P, W.default), x.innerHTML = C.highlight(x.textContent ?? "", { language: P }).value, x.dataset.highlighted = "yes";
      }
    }
    function y() {
      var C;
      if (!o.resolveAssetUrl) return;
      const g = /\.(?:svg|png|jpe?g|gif|webp)(?:[?#].*)?$/iu;
      for (const A of Array.from(((C = r.value) == null ? void 0 : C.querySelectorAll("a[href]")) ?? [])) {
        const v = A.getAttribute("href") ?? "";
        if (!g.test(v) || /^(?:data|blob):/iu.test(v)) continue;
        const h = o.resolveAssetUrl(v);
        h && (A.href = h, A.target = "_blank", A.rel = "noopener noreferrer");
      }
    }
    async function E() {
      var C, A, v, h;
      const g = Array.from(((C = r.value) == null ? void 0 : C.querySelectorAll(".markdown-diagram-shell:not([data-rendered])")) ?? []);
      for (const S of g) {
        S.dataset.rendered = "loading";
        const R = S.dataset.diagramEngine === "plantuml" ? "plantuml" : "mermaid", B = ((A = S.querySelector("code")) == null ? void 0 : A.textContent) ?? "", x = S.querySelector(".markdown-diagram-stage");
        if (x)
          try {
            let P = await ((v = o.renderDiagram) == null ? void 0 : v.call(o, { engine: R, source: B, dark: o.dark }));
            if (!P && R === "mermaid") {
              const { default: _ } = await import("mermaid");
              _.initialize({ startOnLoad: !1, securityLevel: "strict", theme: o.dark ? "dark" : "default", htmlLabels: !1, flowchart: { htmlLabels: !1, useMaxWidth: !1 } }), P = (await _.render(`cody-diagram-${String(++a)}`, B)).svg;
            }
            if (!P) throw new Error(R === "plantuml" ? "当前环境未配置 PlantUML 渲染器" : "图表渲染失败");
            x.innerHTML = Y(P), Ce(x), S.dataset.rendered = "yes", S.style.setProperty("--diagram-scale", "1");
          } catch (P) {
            x.textContent = P instanceof Error ? P.message : "图表渲染失败", x.classList.add("markdown-diagram-error"), (h = S.querySelector(".markdown-diagram-source")) == null || h.removeAttribute("hidden"), S.dataset.rendered = "error";
          }
      }
    }
    function Y(g) {
      const C = he.sanitize(g, { USE_PROFILES: { svg: !0, svgFilters: !0, html: !0 }, ADD_TAGS: ["foreignObject"], ADD_ATTR: ["xmlns"] }), A = C.trimStart().startsWith("<svg") ? C : `<svg xmlns="http://www.w3.org/2000/svg">${C}</svg>`, v = new DOMParser().parseFromString(A, "image/svg+xml");
      if (v.querySelector("parsererror")) return "";
      for (const h of v.querySelectorAll("*")) for (const S of Array.from(h.attributes)) /^on/iu.test(S.name) && h.removeAttribute(S.name);
      return v.querySelectorAll("script").forEach((h) => h.remove()), new XMLSerializer().serializeToString(v.documentElement);
    }
    function Ce(g) {
      if (g.dataset.panReady === "true") return;
      g.dataset.panReady = "true";
      let C = 0, A = 0, v = 0, h = 0;
      g.addEventListener("pointerdown", (R) => {
        R.button === 0 && (C = R.clientX, A = R.clientY, v = g.scrollLeft, h = g.scrollTop, g.setPointerCapture(R.pointerId), g.classList.add("is-panning"));
      }), g.addEventListener("pointermove", (R) => {
        g.hasPointerCapture(R.pointerId) && (g.scrollLeft = v - (R.clientX - C), g.scrollTop = h - (R.clientY - A));
      });
      const S = (R) => {
        g.hasPointerCapture(R.pointerId) && g.releasePointerCapture(R.pointerId), g.classList.remove("is-panning");
      };
      g.addEventListener("pointerup", S), g.addEventListener("pointercancel", S);
    }
    function Z(g, C = 0) {
      const A = Number(g.style.getPropertyValue("--diagram-scale") || "1");
      g.style.setProperty("--diagram-scale", String(C === 0 ? 1 : Math.min(2.5, Math.max(0.4, A + C))));
    }
    function ae(g, C) {
      const A = document.createElement("a");
      A.href = URL.createObjectURL(g), A.download = C, A.click(), URL.revokeObjectURL(A.href);
    }
    async function ie(g, C) {
      const A = C.textContent;
      try {
        await navigator.clipboard.writeText(g), C.textContent = "已复制";
      } catch {
        const v = document.createElement("textarea");
        v.value = g, v.style.position = "fixed", v.style.opacity = "0", document.body.appendChild(v), v.select();
        const h = document.execCommand("copy");
        v.remove(), C.textContent = h ? "已复制" : "复制失败";
      }
      window.setTimeout(() => {
        C.textContent = A;
      }, 1200);
    }
    function $e(g) {
      return Array.from((g == null ? void 0 : g.rows) ?? []).map((C) => Array.from(C.cells).map((A) => {
        var v;
        return `"${((v = A.textContent) == null ? void 0 : v.trim().replace(/"/gu, '""')) ?? ""}"`;
      }).join(",")).join(`
`);
    }
    function Ae(g) {
      var B, x, P, _, W;
      const C = g.target, A = C.closest("img");
      if (A) {
        u.value = A.currentSrc || A.src, (B = w.value) == null || B.showModal();
        return;
      }
      const v = C.closest("[data-markdown-action]");
      if (!v) return;
      const h = v.closest(".markdown-code-shell, .markdown-table-shell"), S = v.dataset.markdownAction;
      if (S === "copy-code" && ie(((x = h == null ? void 0 : h.querySelector("code")) == null ? void 0 : x.textContent) ?? "", v), S === "wrap-code") {
        const T = (h == null ? void 0 : h.classList.toggle("is-wrapped")) ?? !1;
        v.textContent = T && s.value.scroll || s.value.wrap, v.setAttribute("aria-pressed", String(T));
      }
      if (S === "save-code" && ae(new Blob([((P = h == null ? void 0 : h.querySelector("code")) == null ? void 0 : P.textContent) ?? ""], { type: "text/plain" }), `snippet.${(h == null ? void 0 : h.dataset.language) || "txt"}`), S === "toggle-code" && (h != null && h.classList.contains("is-collapsible"))) {
        const T = Number(h.dataset.codeIndex ?? -1), U = !h.classList.toggle("is-collapsed");
        T >= 0 && (U ? n.add(T) : n.delete(T));
        for (const J of Array.from(h.querySelectorAll('[data-markdown-action="toggle-code"]'))) J.setAttribute("aria-expanded", String(U));
      }
      if (S === "copy-table" && ie($e((h == null ? void 0 : h.querySelector("table")) ?? null), v), S === "open-file") {
        const T = v.dataset.filePath ?? "", U = ((_ = o.cwd) == null ? void 0 : _.replace(/\/$/u, "")) ?? "", J = T.startsWith("/") && U && T.startsWith(`${U}/`) ? T.slice(U.length + 1) : T.replace(/^\.\//u, "");
        i("openFile", { path: J, line: Number(v.dataset.fileLine || 0) || 1 });
      }
      const R = v.closest(".markdown-diagram-shell");
      if (R && S === "diagram-zoom-in" && Z(R, 0.2), R && S === "diagram-zoom-out" && Z(R, -0.2), R && S === "diagram-fit" && Z(R), R && S === "diagram-source") {
        const T = R.querySelector(".markdown-diagram-source");
        T && (T.hidden = !T.hidden);
      }
      if (R && S === "diagram-fullscreen" && ((W = R.requestFullscreen) == null || W.call(R)), R && S === "diagram-export-svg") {
        const T = R.querySelector("svg");
        T && ae(new Blob([new XMLSerializer().serializeToString(T)], { type: "image/svg+xml" }), "diagram.svg");
      }
    }
    function se() {
      var g;
      (g = w.value) == null || g.close();
    }
    return ge(() => [o.text, o.labels], ([g]) => {
      f(g);
    }, { deep: !0 }), Se(() => {
      k();
    }), xe(() => window.clearTimeout(b)), (g, C) => (c(), p(M, null, [
      m("div", {
        ref_key: "rootRef",
        ref: r,
        class: "cody-markdown cody-markdown-renderer",
        innerHTML: d.value,
        onClick: Ae
      }, null, 8, at),
      m("dialog", {
        ref_key: "imageDialogRef",
        ref: w,
        class: "cody-markdown-image-dialog",
        onClick: se
      }, [
        m("button", {
          type: "button",
          "aria-label": "关闭图片预览",
          onClick: se
        }, "×"),
        m("img", {
          src: u.value,
          alt: "Markdown 图片预览"
        }, null, 8, it)
      ], 512)
    ], 64));
  }
});
function we(e) {
  if (!e || typeof e != "object") return [];
  const t = e;
  return (Array.isArray(t.questions) ? t.questions : []).flatMap((i, s) => {
    if (!i || typeof i != "object") return [];
    const r = i, w = typeof r.question == "string" ? r.question.trim() : "";
    if (!w) return [];
    const d = Array.isArray(r.options) ? r.options : [];
    return [{
      id: typeof r.id == "string" && r.id.trim() ? r.id.trim() : `question-${String(s + 1)}`,
      header: typeof r.header == "string" ? r.header.trim() : "",
      question: w,
      isOther: r.isOther === !0,
      isSecret: r.isSecret === !0,
      options: d.flatMap((u) => {
        if (!u || typeof u != "object") return [];
        const n = u, b = typeof n.label == "string" ? n.label.trim() : "";
        return b ? [{ label: b, description: typeof n.description == "string" ? n.description.trim() : "" }] : [];
      })
    }];
  });
}
function st(e) {
  var i;
  if (!e || typeof e != "object") return "Codex 请求执行一项受保护操作。";
  const t = e, o = t.reason ?? t.question ?? t.command;
  return typeof o == "string" && o.trim() ? o : ((i = we(e)[0]) == null ? void 0 : i.question) ?? "Codex 请求执行一项受保护操作。";
}
function uo(e) {
  var u, n, b;
  const t = [], o = /* @__PURE__ */ new Set(), i = new Map(e.messages.map((a) => [a.id, a])), s = new Map(e.timeline.map((a) => [a.id, a])), r = (a) => {
    if (a.kind === "reasoning") {
      t.push({ id: a.id, kind: "reasoning", text: a.text }), o.add(a.id);
      return;
    }
    if (!a.tool.summary && a.tool.details.length === 0 && !a.tool.output && a.tool.kind !== "fileChange") return;
    if (a.tool.kind !== "fileChange") {
      t.push({ id: a.id, kind: "tool", tool: a.tool }), o.add(a.id);
      return;
    }
    const l = `file-group:${a.turnId ?? a.id}`, f = t.at(-1);
    if (!f || f.kind !== "tool" || f.id !== l) {
      const E = [...new Set(a.tool.details)], Y = {
        id: l,
        kind: "tool",
        tool: {
          ...a.tool,
          title: E.length > 1 ? `文件变更 · ${String(E.length)} 个文件` : "文件变更",
          summary: E.length ? `${String(E.length)} 个文件已更新` : a.tool.summary,
          details: E
        }
      };
      t.push(Y), o.add(a.id);
      return;
    }
    const k = [.../* @__PURE__ */ new Set([...f.tool.details, ...a.tool.details])], y = [f.tool.output, a.tool.output].filter(Boolean).join(`

`);
    f.tool = {
      ...f.tool,
      status: /fail|error|cancel|reject/iu.test(`${f.tool.status} ${a.tool.status}`) ? "failed" : a.tool.status,
      title: k.length > 1 ? `文件变更 · ${String(k.length)} 个文件` : "文件变更",
      summary: k.length ? `${String(k.length)} 个文件已更新` : a.tool.summary,
      details: k,
      ...y ? { output: y } : {}
    }, o.add(a.id);
  };
  for (const a of e.presentation ?? [])
    if (a.kind === "message") {
      const l = i.get(a.id);
      l && (t.push({ id: l.id, kind: "message", message: l }), o.add(l.id));
    } else if (a.kind === "timeline") {
      const l = s.get(a.id);
      l && r(l);
    } else if (a.kind === "plan")
      (u = e.plan) != null && u.text && (!a.turnId || a.turnId === e.plan.turnId) && (t.push({ id: a.id, kind: "plan", text: e.plan.text }), o.add(a.id));
    else if (a.kind === "request") {
      const l = e.pendingRequests.find((f) => `request:${f.id}` === a.id);
      l && (t.push({ id: a.id, kind: "request", request: l }), o.add(a.id));
    } else if (a.kind === "failure") {
      const l = a.turnId ? e.turns[a.turnId] : void 0;
      l != null && l.error && (t.push({ id: a.id, kind: "failure", text: l.error }), o.add(a.id));
    } else if (a.kind === "interrupted")
      t.push({ id: a.id, kind: "interrupted", text: "本次回复已停止" }), o.add(a.id);
    else if (a.kind === "worked") {
      const l = a.turnId ? e.turns[a.turnId] : void 0;
      if (l != null && l.completedAtIso) {
        const f = l.startedAtIso ? Date.parse(l.completedAtIso) - Date.parse(l.startedAtIso) : 0;
        t.push({ id: a.id, kind: "worked", label: `Worked for ${Fe(f)}` }), o.add(a.id);
      }
    }
  for (const a of e.messages) o.has(a.id) || t.push({ id: a.id, kind: "message", message: a });
  for (const a of e.timeline) o.has(a.id) || r(a);
  const w = `plan:${((n = e.plan) == null ? void 0 : n.turnId) || "current"}`;
  (b = e.plan) != null && b.text && !o.has(w) && t.push({ id: w, kind: "plan", text: e.plan.text });
  for (const a of e.pendingRequests) o.has(`request:${a.id}`) || t.push({ id: `request:${a.id}`, kind: "request", request: a });
  for (const a of Object.values(e.turns))
    a.lifecycle === "failed" && a.error && !o.has(`failure:${a.id}`) && t.push({ id: `failure:${a.id}`, kind: "failure", text: a.error }), a.lifecycle === "interrupted" && !o.has(`interrupted:${a.id}`) && t.push({ id: `interrupted:${a.id}`, kind: "interrupted", text: "本次回复已停止" });
  const d = e.activeTurnId ? e.turns[e.activeTurnId] : void 0;
  if (d) {
    const a = e.pendingRequests.find((l) => !l.turnId || l.turnId === d.id);
    a ? t.push({
      id: `activity:${d.id}`,
      kind: "activity",
      title: a.kind === "approval" ? "等待你的审批" : "等待你的回答",
      detail: "处理后 Codex 会继续本次回复",
      tone: "waiting"
    }) : d.lifecycle === "retrying" ? t.push({
      id: `activity:${d.id}`,
      kind: "activity",
      title: d.retryMessage || "Codex 正在重新连接",
      detail: e.connection.status === "disconnected" ? "连接已中断，等待恢复" : "正在恢复本次回复",
      tone: "retrying"
    }) : d.lifecycle === "running" && t.push({
      id: `activity:${d.id}`,
      kind: "activity",
      title: "Codex 正在工作",
      detail: e.connection.status === "connected" ? "实时更新中" : "等待恢复连接",
      tone: "running"
    });
  }
  return t;
}
const nt = ["data-kind"], lt = { class: "cody-request-heading" }, rt = { key: 0 }, dt = {
  key: 0,
  class: "cody-question-options"
}, ct = ["onClick"], ut = { key: 0 }, pt = ["onUpdate:modelValue", "type", "placeholder"], mt = { class: "cody-request-actions" }, ft = ["disabled"], gt = { class: "cody-approval-risk-heading" }, kt = ["data-level"], ht = { class: "cody-approval-risk-subject" }, vt = {
  key: 0,
  class: "cody-approval-risk-labels"
}, yt = {
  key: 1,
  class: "cody-approval-risk-details"
}, bt = { class: "cody-approval-risk-recommendation" }, Rt = { key: 1 }, wt = {
  key: 2,
  class: "cody-request-actions"
}, Ct = /* @__PURE__ */ K({
  __name: "CodyRequestCard",
  props: {
    request: {}
  },
  emits: ["resolveApproval", "resolveQuestion"],
  setup(e, { emit: t }) {
    const o = e, i = t, s = Te({}), r = j(() => we(o.request.params)), w = j(() => st(o.request.params)), d = j(() => o.request.kind === "approval" ? ot({ method: o.request.method, params: o.request.params }) : null), u = j(() => r.value.length > 0 && r.value.every((b) => {
      var a;
      return !!((a = s[b.id]) != null && a.trim());
    }));
    ge(() => o.request.id, () => {
      for (const b of Object.keys(s)) delete s[b];
    });
    function n() {
      u.value && i("resolveQuestion", o.request.id, Object.fromEntries(r.value.map((b) => [b.id, { answers: [s[b.id].trim()] }])));
    }
    return (b, a) => (c(), p("article", {
      class: "cody-request-card",
      "data-kind": e.request.kind
    }, [
      m("div", lt, [
        m("strong", null, $(e.request.kind === "approval" ? "需要你的确认" : "Codex 需要补充信息"), 1),
        a[2] || (a[2] = m("small", null, "Agent 已暂停等待", -1))
      ]),
      e.request.kind === "question" && r.value.length ? (c(), p(M, { key: 0 }, [
        (c(!0), p(M, null, F(r.value, (l) => (c(), p("fieldset", {
          key: l.id,
          class: "cody-question-field"
        }, [
          m("legend", null, [
            l.header ? (c(), p("span", rt, $(l.header), 1)) : L("", !0),
            te($(l.question), 1)
          ]),
          l.options.length ? (c(), p("div", dt, [
            (c(!0), p(M, null, F(l.options, (f) => (c(), p("button", {
              key: f.label,
              type: "button",
              class: Le({ selected: s[l.id] === f.label }),
              onClick: (k) => s[l.id] = f.label
            }, [
              m("strong", null, $(f.label), 1),
              f.description ? (c(), p("small", ut, $(f.description), 1)) : L("", !0)
            ], 10, ct))), 128))
          ])) : L("", !0),
          l.options.length === 0 || l.isOther ? Me((c(), p("input", {
            key: 1,
            "onUpdate:modelValue": (f) => s[l.id] = f,
            type: l.isSecret ? "password" : "text",
            placeholder: l.options.length ? "其他回答…" : "输入回答…",
            onKeyup: ke(n, ["enter"])
          }, null, 40, pt)), [
            [qe, s[l.id]]
          ]) : L("", !0)
        ]))), 128)),
        m("div", mt, [
          m("button", {
            type: "button",
            disabled: !u.value,
            onClick: n
          }, "提交回答", 8, ft)
        ])
      ], 64)) : (c(), p(M, { key: 1 }, [
        d.value ? (c(), p(M, { key: 0 }, [
          m("div", gt, [
            m("div", null, [
              m("strong", null, $(d.value.title), 1),
              m("p", null, $(d.value.description), 1)
            ]),
            m("span", {
              class: "cody-approval-risk-level",
              "data-level": d.value.level
            }, $(d.value.level), 9, kt)
          ]),
          m("code", ht, $(d.value.subject), 1),
          d.value.riskLabels.length ? (c(), p("ul", vt, [
            (c(!0), p(M, null, F(d.value.riskLabels, (l) => (c(), p("li", { key: l }, $(l), 1))), 128))
          ])) : L("", !0),
          d.value.impacts.length ? (c(), p("details", yt, [
            a[3] || (a[3] = m("summary", null, "查看影响", -1)),
            m("ul", null, [
              (c(!0), p(M, null, F(d.value.impacts, (l) => (c(), p("li", { key: l }, $(l), 1))), 128))
            ])
          ])) : L("", !0),
          m("p", bt, $(d.value.recommendation), 1)
        ], 64)) : (c(), p("p", Rt, $(w.value), 1)),
        e.request.kind === "approval" ? (c(), p("div", wt, [
          m("button", {
            type: "button",
            onClick: a[0] || (a[0] = (l) => i("resolveApproval", e.request.id, "accept"))
          }, "允许一次"),
          m("button", {
            type: "button",
            "data-tone": "danger",
            onClick: a[1] || (a[1] = (l) => i("resolveApproval", e.request.id, "decline"))
          }, "拒绝")
        ])) : L("", !0)
      ], 64))
    ], 8, nt));
  }
}), $t = ["data-variant"], At = {
  key: 0,
  class: "cody-conversation-loading",
  role: "status"
}, St = {
  key: 1,
  class: "cody-conversation-empty"
}, xt = {
  key: 0,
  class: "cody-worked-divider"
}, Pt = ["data-role"], Tt = ["data-role"], Lt = { class: "cody-message-stack" }, Mt = { class: "cody-message-label" }, qt = {
  key: 0,
  class: "cody-message-skills"
}, Dt = {
  key: 1,
  class: "cody-message-body"
}, _t = {
  key: 2,
  class: "cody-message-images"
}, Ot = ["src"], Et = ["onClick"], It = ["data-tone", "open"], Ft = { key: 0 }, jt = ["onClick"], Bt = {
  key: 3,
  class: "cody-reasoning-card"
}, Wt = {
  key: 4,
  class: "cody-plan-card",
  open: ""
}, zt = {
  key: 6,
  class: "cody-failure-card"
}, Ut = {
  key: 7,
  class: "cody-interrupted-card",
  role: "status"
}, Nt = ["data-tone"], po = /* @__PURE__ */ K({
  __name: "CodyConversation",
  props: {
    entries: {},
    loading: { type: Boolean },
    variant: { default: "standalone" }
  },
  emits: ["copy", "openFile", "resolveApproval", "resolveQuestion"],
  setup(e, { emit: t }) {
    const o = t, i = G({});
    function s(d) {
      i.value = {
        ...i.value,
        [d]: i.value[d] !== !0
      };
    }
    function r(d, u) {
      o("resolveApproval", d, u);
    }
    function w(d, u) {
      o("resolveQuestion", d, u);
    }
    return (d, u) => (c(), p("section", {
      class: "cody-conversation",
      "data-variant": e.variant,
      "data-cody-component": "conversation-surface"
    }, [
      e.loading ? (c(), p("div", At, "正在同步对话…")) : e.entries.length === 0 ? (c(), p("div", St, [
        Q(d.$slots, "empty", {}, () => [
          u[2] || (u[2] = te("开始这个需求的开发", -1))
        ])
      ])) : (c(!0), p(M, { key: 2 }, F(e.entries, (n) => {
        var b, a;
        return c(), p(M, {
          key: n.id
        }, [
          n.kind === "worked" ? (c(), p("div", xt, [
            m("span", null, $(n.label), 1)
          ])) : n.kind === "message" ? (c(), p("article", {
            key: 1,
            class: "cody-message",
            "data-role": n.message.role
          }, [
            m("div", {
              class: "cody-message-identity",
              "data-role": n.message.role
            }, $(n.message.role === "user" ? "你" : "CW"), 9, Tt),
            m("div", Lt, [
              m("div", Mt, $(n.message.role === "user" ? "你" : n.message.role === "assistant" ? "Codex Agent" : "系统"), 1),
              (b = n.message.skills) != null && b.length ? (c(), p("ul", qt, [
                (c(!0), p(M, null, F(n.message.skills, (l) => (c(), p("li", {
                  key: `${l.name}:${l.path}`
                }, "$" + $(l.displayName || l.name), 1))), 128))
              ])) : L("", !0),
              n.message.text ? (c(), p("div", Dt, [
                Q(d.$slots, "markdown", {
                  message: n.message
                }, () => [
                  V(fe, {
                    text: n.message.text,
                    onOpenFile: u[0] || (u[0] = (l) => o("openFile", l))
                  }, null, 8, ["text"])
                ])
              ])) : L("", !0),
              (a = n.message.images) != null && a.length ? (c(), p("div", _t, [
                (c(!0), p(M, null, F(n.message.images, (l) => (c(), p("img", {
                  key: l,
                  src: l,
                  alt: "对话图片",
                  loading: "lazy"
                }, null, 8, Ot))), 128))
              ])) : L("", !0),
              n.message.text ? (c(), p("button", {
                key: 3,
                class: "cody-copy-button",
                type: "button",
                onClick: (l) => o("copy", n.message.text)
              }, "复制", 8, Et)) : L("", !0)
            ])
          ], 8, Pt)) : n.kind === "tool" ? (c(), p("details", {
            key: 2,
            class: "cody-tool-card",
            "data-tone": I(re)(n.tool.status),
            open: I(re)(n.tool.status) === "working"
          }, [
            m("summary", null, [
              u[3] || (u[3] = m("span", null, "⌁", -1)),
              m("strong", null, $(n.tool.title), 1),
              m("small", null, $(n.tool.status), 1)
            ]),
            m("p", null, $(n.tool.summary), 1),
            n.tool.details.length ? (c(), p("ul", Ft, [
              (c(!0), p(M, null, F(n.tool.details, (l) => (c(), p("li", { key: l }, $(l), 1))), 128))
            ])) : L("", !0),
            n.tool.output ? (c(), p(M, { key: 1 }, [
              m("pre", null, $(i.value[n.id] ? n.tool.output : I(We)(n.tool.output)), 1),
              I(Be)(n.tool.output) ? (c(), p("button", {
                key: 0,
                class: "cody-tool-output-toggle",
                type: "button",
                onClick: (l) => s(n.id)
              }, $(I(ze)(i.value[n.id] === !0)), 9, jt)) : L("", !0)
            ], 64)) : L("", !0)
          ], 8, It)) : n.kind === "reasoning" ? (c(), p("details", Bt, [
            m("summary", null, "✦ " + $(n.title || "推理过程"), 1),
            m("pre", null, $(n.text), 1)
          ])) : n.kind === "plan" ? (c(), p("details", Wt, [
            u[4] || (u[4] = m("summary", null, "计划", -1)),
            V(fe, {
              text: n.text,
              onOpenFile: u[1] || (u[1] = (l) => o("openFile", l))
            }, null, 8, ["text"])
          ])) : n.kind === "request" ? Q(d.$slots, "request", {
            request: n.request
          }, () => [
            V(Ct, {
              request: n.request,
              onResolveApproval: r,
              onResolveQuestion: w
            }, null, 8, ["request"])
          ], void 0, 5) : n.kind === "failure" ? (c(), p("details", zt, [
            u[5] || (u[5] = m("summary", null, "本次回复失败", -1)),
            m("p", null, $(n.text), 1)
          ])) : n.kind === "interrupted" ? (c(), p("article", Ut, $(n.text), 1)) : n.kind === "activity" ? (c(), p("article", {
            key: 8,
            class: "cody-conversation-activity",
            "data-tone": n.tone,
            role: "status",
            "aria-live": "polite"
          }, [
            u[6] || (u[6] = m("span", {
              class: "cody-activity-pulse",
              "aria-hidden": "true"
            }, null, -1)),
            m("strong", null, $(n.title), 1),
            m("small", null, $(n.detail), 1)
          ], 8, Nt)) : L("", !0)
        ], 64);
      }), 128))
    ], 8, $t));
  }
});
function Vt(e) {
  var t, o, i, s;
  return !!((t = e.text) != null && t.trim()) || !!((o = e.images) != null && o.length) || !!((i = e.skills) != null && i.length) || !!((s = e.contexts) != null && s.length);
}
const Ht = ["data-variant"], Gt = { class: "cody-composer-shell" }, Qt = {
  key: 0,
  class: "cody-composer-selected",
  "aria-label": "Selected skills"
}, Kt = ["disabled", "aria-label", "onClick"], Xt = ["value", "disabled", "placeholder", "onKeydown"], Yt = { class: "cody-composer-controls" }, Zt = {
  key: 0,
  class: "cody-composer-compact-control cody-composer-skill-control",
  title: "为本轮显式选择 Skill"
}, Jt = ["disabled"], eo = ["value"], to = { class: "cody-composer-actions" }, oo = ["disabled"], ao = ["disabled", "aria-label"], io = {
  key: 1,
  class: "cody-composer-policy"
}, mo = /* @__PURE__ */ K({
  __name: "CodyComposer",
  props: {
    draft: {},
    disabled: { type: Boolean },
    isRunning: { type: Boolean },
    placeholder: { default: "输入消息…" },
    collaborationModes: { default: () => [] },
    selectedCollaborationMode: { default: "" },
    submitModes: { default: () => [] },
    selectedSubmitMode: { default: "" },
    models: { default: () => [] },
    selectedModel: { default: "" },
    reasoningOptions: { default: () => [] },
    selectedReasoning: { default: "" },
    permissionOptions: { default: () => [] },
    selectedPermission: { default: "" },
    skills: { default: () => [] },
    selectedSkills: { default: () => [] },
    variant: { default: "standalone" }
  },
  emits: ["update:draft", "update:collaboration-mode", "update:submit-mode", "update:model", "update:reasoning", "update:permission", "update:selected-skills", "send", "stop"],
  setup(e, { emit: t }) {
    const o = K({
      name: "CodyComposerSelect",
      props: { label: { type: String, required: !0 }, modelValue: { type: String, required: !0 }, options: { type: Array, required: !0 }, disabled: Boolean },
      emits: ["update:modelValue"],
      setup(f, { emit: k }) {
        return () => ee("label", { class: "cody-composer-compact-control", title: f.label }, [
          ee("select", { value: f.modelValue, disabled: f.disabled, "aria-label": f.label, onChange: (y) => k("update:modelValue", y.target.value) }, f.options.map((y) => ee("option", { value: y.value }, y.label)))
        ]);
      }
    }), i = e, s = t, r = j(() => i.skills.filter((f) => !i.selectedSkills.includes(f.value))), w = j(() => {
      var f;
      return ((f = i.permissionOptions.find((k) => k.value === i.selectedPermission)) == null ? void 0 : f.description) ?? "";
    }), d = j(() => !i.disabled && Vt({ text: i.draft, skills: i.selectedSkills })), u = j(() => i.isRunning && i.selectedSubmitMode === "steer" ? "发送引导" : i.isRunning ? "加入队列" : "发送");
    function n(f, k) {
      var y;
      return ((y = f.find((E) => E.value === k)) == null ? void 0 : y.label) ?? k;
    }
    function b(f) {
      f && !i.selectedSkills.includes(f) && s("update:selected-skills", [...i.selectedSkills, f]);
    }
    function a(f) {
      s("update:selected-skills", i.selectedSkills.filter((k) => k !== f));
    }
    function l() {
      d.value && s("send");
    }
    return (f, k) => (c(), p("form", {
      class: "cody-composer",
      "data-variant": e.variant,
      "data-cody-component": "composer-surface",
      onSubmit: ne(l, ["prevent"])
    }, [
      m("div", Gt, [
        e.selectedSkills.length ? (c(), p("div", Qt, [
          (c(!0), p(M, null, F(e.selectedSkills, (y) => (c(), p("span", {
            key: y,
            class: "cody-composer-chip"
          }, [
            te(" $" + $(n(e.skills, y)) + " ", 1),
            m("button", {
              type: "button",
              disabled: e.disabled,
              "aria-label": `移除 Skill ${n(e.skills, y)}`,
              onClick: (E) => a(y)
            }, "×", 8, Kt)
          ]))), 128))
        ])) : L("", !0),
        m("textarea", {
          value: e.draft,
          rows: "1",
          disabled: e.disabled,
          placeholder: e.placeholder,
          onInput: k[0] || (k[0] = (y) => s("update:draft", y.target.value)),
          onKeydown: ke(ne(l, ["exact", "prevent"]), ["enter"])
        }, null, 40, Xt),
        m("div", Yt, [
          Q(f.$slots, "leading"),
          e.skills.length ? (c(), p("label", Zt, [
            k[9] || (k[9] = m("span", {
              class: "cody-composer-icon",
              "aria-hidden": "true"
            }, "✦", -1)),
            m("select", {
              value: "",
              disabled: e.disabled,
              "aria-label": "添加 Skill",
              onChange: k[1] || (k[1] = (y) => b(y.target.value))
            }, [
              k[8] || (k[8] = m("option", { value: "" }, "Skills", -1)),
              (c(!0), p(M, null, F(r.value, (y) => (c(), p("option", {
                key: y.value,
                value: y.value
              }, "$" + $(y.label), 9, eo))), 128))
            ], 40, Jt)
          ])) : L("", !0),
          e.collaborationModes.length ? (c(), le(I(o), {
            key: 1,
            label: "协作模式",
            "model-value": e.selectedCollaborationMode,
            options: e.collaborationModes,
            disabled: e.disabled || e.isRunning,
            "onUpdate:modelValue": k[2] || (k[2] = (y) => s("update:collaboration-mode", y))
          }, null, 8, ["model-value", "options", "disabled"])) : L("", !0),
          V(I(o), {
            label: "提交策略",
            "model-value": e.selectedSubmitMode,
            options: e.submitModes,
            disabled: e.disabled,
            "onUpdate:modelValue": k[3] || (k[3] = (y) => s("update:submit-mode", y))
          }, null, 8, ["model-value", "options", "disabled"]),
          e.models.length ? (c(), le(I(o), {
            key: 2,
            label: "模型",
            "model-value": e.selectedModel,
            options: e.models,
            disabled: e.disabled || e.isRunning,
            "onUpdate:modelValue": k[4] || (k[4] = (y) => s("update:model", y))
          }, null, 8, ["model-value", "options", "disabled"])) : L("", !0),
          V(I(o), {
            label: "推理强度",
            "model-value": e.selectedReasoning,
            options: e.reasoningOptions,
            disabled: e.disabled || e.isRunning,
            "onUpdate:modelValue": k[5] || (k[5] = (y) => s("update:reasoning", y))
          }, null, 8, ["model-value", "options", "disabled"]),
          V(I(o), {
            label: "权限",
            "model-value": e.selectedPermission,
            options: e.permissionOptions,
            disabled: e.disabled || e.isRunning,
            "onUpdate:modelValue": k[6] || (k[6] = (y) => s("update:permission", y))
          }, null, 8, ["model-value", "options", "disabled"]),
          Q(f.$slots, "controls"),
          m("div", to, [
            e.isRunning ? (c(), p("button", {
              key: 0,
              class: "cody-composer-stop",
              type: "button",
              disabled: e.disabled,
              onClick: k[7] || (k[7] = (y) => s("stop"))
            }, "停止", 8, oo)) : L("", !0),
            m("button", {
              class: "cody-composer-send",
              type: "submit",
              disabled: !d.value,
              "aria-label": u.value
            }, "↑", 8, ao)
          ])
        ]),
        w.value ? (c(), p("p", io, $(w.value), 1)) : L("", !0)
      ])
    ], 40, Ht));
  }
});
export {
  mo as CodyComposer,
  po as CodyConversation,
  fe as CodyMarkdown,
  Ct as CodyRequestCard,
  X as DEFAULT_CODY_MARKDOWN_LABELS,
  uo as conversationEntriesFromState,
  we as questionFieldsFromParams,
  pe as renderCodyMarkdown,
  st as requestSummary,
  me as stabilizeStreamingMarkdown
};
