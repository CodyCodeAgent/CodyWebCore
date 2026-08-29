import { defineComponent as Q, computed as j, ref as H, watch as ge, onMounted as Se, onBeforeUnmount as xe, openBlock as p, createElementBlock as m, Fragment as L, createElementVNode as f, nextTick as Pe, reactive as Te, toDisplayString as w, renderList as _, createCommentVNode as P, createTextVNode as te, normalizeClass as Le, withDirectives as Me, withKeys as ke, vModelDynamic as qe, renderSlot as G, createVNode as N, unref as E, h as ee, withModifiers as ne, createBlock as le } from "vue";
import ve from "dompurify";
import De from "markdown-it";
import Oe from "markdown-it-footnote";
import Ee from "markdown-it-task-lists";
function _e(e) {
  return /fail|error|cancel|reject/iu.test(e) ? "danger" : /complete|success|done|approved/iu.test(e) ? "success" : /run|start|pending|wait/iu.test(e) ? "running" : "neutral";
}
function Ie(e, t = 80, o = 12e3) {
  const s = e.split(/\r?\n/u), n = s.slice(0, t).join(`
`).slice(0, o);
  return { text: n, truncated: n.length < e.length || s.length > t };
}
function Fe(e) {
  if (!Number.isFinite(e) || e <= 0)
    return "<1s";
  const t = Math.max(1, Math.round(e / 1e3)), o = Math.floor(t / 3600), s = Math.floor(t % 3600 / 60), n = t % 60, r = [];
  return o > 0 && r.push(`${String(o)}h`), (s > 0 || o > 0) && r.push(`${String(s)}m`), r.push(`${String(n > 0 || r.length === 0 ? n : 0)}s`), r.join(" ");
}
const he = 80, ye = 12e3;
function je(e) {
  const t = e.trim().toLowerCase();
  return t.includes("fail") || t.includes("error") || t.includes("decline") || t.includes("cancel");
}
function re(e) {
  const t = _e(e);
  if (t === "running")
    return "working";
  if (t === "success" || t === "danger")
    return t;
  const o = e.trim().toLowerCase();
  return o ? je(o) ? "danger" : /running|progress|pending|started/u.test(o) ? "working" : /success|complete|done|applied/u.test(o) ? "success" : "neutral" : "neutral";
}
function We(e, t = he, o = ye) {
  if (e.length > Math.max(Math.trunc(o), 1))
    return !0;
  const s = Math.max(Math.trunc(t), 1);
  return e.split(/\r\n|\r|\n/u).length > s;
}
function Be(e, t = he, o = ye) {
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
function Xe(e, t = {}) {
  let o = Qe[e] ?? e;
  for (const [s, n] of Object.entries(t))
    o = o.split(`{${s}}`).join(n);
  return o;
}
const Ke = Xe;
function W(e) {
  return Ge(e).trim();
}
function V(e) {
  return Array.from(new Set(e.filter((t) => t.trim().length > 0)));
}
function q(e, t) {
  const o = { low: 0, medium: 1, high: 2 };
  return o[e] >= o[t] ? e : t;
}
function U(e, t) {
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
  let s = o ? "low" : "medium";
  const n = [], r = [];
  return o ? (U(o, [/\brm\s+(-[^\s]*r|--recursive)\b/u, /\brm\s+(-[^\s]*f|--force)\b/u]) && (s = q(s, "high"), n.push(t("approvalRisk.label.deletesFiles")), r.push(t("approvalRisk.impact.deletesFiles"))), U(o, [/\bsudo\b/u, /\bchmod\b/u, /\bchown\b/u]) && (s = q(s, "high"), n.push(t("approvalRisk.label.changesPermissions")), r.push(t("approvalRisk.impact.changesPermissions"))), U(o, [/\b(curl|wget|ssh|scp|rsync|gh|git\s+push)\b/u]) && (s = q(s, "medium"), n.push(t("approvalRisk.label.networkAccess")), r.push(t("approvalRisk.impact.networkAccess"))), U(o, [/\b(npm|pnpm|yarn|bun)\s+(install|add|remove|update)\b/u, /\bpip\s+install\b/u]) && (s = q(s, "medium"), n.push(t("approvalRisk.label.changesDependencies")), r.push(t("approvalRisk.impact.changesDependencies"))), U(o, [/\b(git\s+reset|git\s+clean|git\s+checkout)\b/u]) && (s = q(s, "high"), n.push(t("approvalRisk.label.mayDiscardWork")), r.push(t("approvalRisk.impact.mayDiscardWork"))), U(o, [/\b(auth|token|secret|password|credential|keychain|ssh-keygen)\b/iu]) && (s = q(s, "high"), n.push(t("approvalRisk.label.sensitiveCredentials")), r.push(t("approvalRisk.impact.sensitiveCredentials"))), de(o, [/(^|[\s/])(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?|Cargo\.lock|go\.sum)\b/iu]) && (s = q(s, "medium"), n.push(t("approvalRisk.label.modifiesLockfile")), r.push(t("approvalRisk.impact.modifiesLockfile"))), de(o, [/(^|\/)(auth|authentication|authorization|permission|permissions|rbac|acl|payment|payments|billing|checkout|stripe|paypal)(\/|\.|-|_)/iu]) && (s = q(s, "high"), n.push(t("approvalRisk.label.highRiskCodePath")), r.push(t("approvalRisk.impact.highRiskCodePath"))), {
    level: s,
    riskLabels: V(n.length > 0 ? n : [t("approvalRisk.label.commandExecution")]),
    impacts: V(r.length > 0 ? r : [t("approvalRisk.impact.commandExecution")])
  }) : (n.push(t("approvalRisk.label.unknownCommand")), r.push(t("approvalRisk.impact.commandMissing")), { level: s, riskLabels: n, impacts: r });
}
function be(e, t) {
  return !e || !t || !e.startsWith("/") ? !1 : e !== t && !e.startsWith(`${t.replace(/\/+$/u, "")}/`);
}
function Je(e, t) {
  const o = oe(e.params), s = W(o == null ? void 0 : o.command), n = W(o == null ? void 0 : o.cwd), r = W(o == null ? void 0 : o.reason), b = Array.isArray(o == null ? void 0 : o.proposedExecpolicyAmendment) ? o.proposedExecpolicyAmendment.map(W).filter(Boolean) : [], c = Ze(s, t);
  let u = c.level;
  const l = [...c.riskLabels], h = [...c.impacts], a = Ye(s).filter((i) => be(i, n));
  return b.length > 0 && (u = q(u, "medium"), l.push(t("approvalRisk.label.sessionPolicyChange")), h.push(t("approvalRisk.impact.sessionPolicyChange"))), a.length > 0 && (u = q(u, "high"), l.push(t("approvalRisk.label.outsideWorkspace")), h.push(t("approvalRisk.impact.outsideWorkspacePaths", { paths: a.slice(0, 3).join(", ") }))), e.commandPolicy && (e.commandPolicy.status === "allowed" ? (l.push(t("approvalRisk.label.allowedByPolicy")), h.push(e.commandPolicy.reason)) : e.commandPolicy.status === "not_configured" ? (u = q(u, "medium"), l.push(t("approvalRisk.label.noCommandPolicy")), h.push(t("approvalRisk.impact.noCommandPolicy"))) : e.commandPolicy.status === "not_git_workspace" ? (u = q(u, "medium"), l.push(t("approvalRisk.label.policyUnavailable")), h.push(e.commandPolicy.reason)) : e.commandPolicy.status === "denied" && (u = q(u, "high"), l.push(t("approvalRisk.label.deniedByPolicy")), h.push(e.commandPolicy.reason))), {
    title: t("approvalRisk.title.commandApproval"),
    level: u,
    description: r || t("approvalRisk.description.commandApproval"),
    subject: s || e.method,
    riskLabels: V(l),
    impacts: V(n ? [t("approvalRisk.impact.cwd", { cwd: n }), ...h] : h),
    recommendation: t(u === "high" ? "approvalRisk.recommendation.highCommand" : "approvalRisk.recommendation.normalCommand")
  };
}
function et(e, t) {
  const o = oe(e.params), s = W(o == null ? void 0 : o.grantRoot), n = W(o == null ? void 0 : o.reason), r = W(o == null ? void 0 : o.cwd);
  let b = s ? "medium" : "low";
  const c = [t("approvalRisk.label.fileWriteAccess")], u = [t("approvalRisk.impact.fileWriteAccess")];
  return s && (u.unshift(t("approvalRisk.impact.writeRoot", { path: s })), c.push(t("approvalRisk.label.sessionWriteScope"))), be(s, r) && (b = "high", c.push(t("approvalRisk.label.outsideWorkspace")), u.push(t("approvalRisk.impact.outsideWorkspaceWriteRoot"))), e.fileChangePolicy && (e.fileChangePolicy.status === "allowed" ? (c.push(t("approvalRisk.label.allowedByFilePolicy")), u.push(e.fileChangePolicy.reason)) : (b = "high", c.push(t("approvalRisk.label.deniedByFilePolicy")), u.push(e.fileChangePolicy.reason)), e.fileChangePolicy.category === "sensitive" && c.push(t("approvalRisk.label.sensitivePath")), e.fileChangePolicy.category === "ignored" && c.push(t("approvalRisk.label.ignoredPath")), e.fileChangePolicy.category === "read_only" && c.push(t("approvalRisk.label.readOnlyWorkspace"))), {
    title: t("approvalRisk.title.fileChangeApproval"),
    level: b,
    description: n || t("approvalRisk.description.fileChangeApproval"),
    subject: s || t("approvalRisk.subject.workspaceFileChanges"),
    riskLabels: V(c),
    impacts: V(u),
    recommendation: t(b === "high" ? "approvalRisk.recommendation.highFile" : "approvalRisk.recommendation.normalFile")
  };
}
function tt(e, t) {
  const o = oe(e.params), s = W(o == null ? void 0 : o.reason), n = e.method.trim(), r = /\b(mcp|tool)\b/iu.test(n);
  return {
    title: t(r ? "approvalRisk.title.toolApproval" : "approvalRisk.title.manualApproval"),
    level: r ? "high" : "medium",
    description: s || t("approvalRisk.description.genericDecision"),
    subject: e.method,
    riskLabels: r ? [t("approvalRisk.label.externalTool"), t("approvalRisk.label.manualDecision")] : [t("approvalRisk.label.manualDecision")],
    impacts: r ? [t("approvalRisk.impact.externalTool")] : [t("approvalRisk.impact.manualDecision")],
    recommendation: t(r ? "approvalRisk.recommendation.externalTool" : "approvalRisk.recommendation.manualDecision")
  };
}
function ot(e, t = Ke) {
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
}, M = new De({ breaks: !0, html: !1, linkify: !0, typographer: !1 });
M.use(Ee, { enabled: !1, label: !0, labelAfter: !0 });
M.use(Oe);
function O(e, t) {
  return `<button type="button" class="markdown-tool-button" data-markdown-action="${e}" aria-label="${t}" title="${t}">${t}</button>`;
}
function Re(e, t = "", o = X) {
  const s = t.toLowerCase();
  if (s === "mermaid" || s === "plantuml" || s === "puml") {
    const T = s === "mermaid" ? "mermaid" : "plantuml";
    return `<div class="markdown-diagram-shell" data-diagram-engine="${T}"><header class="markdown-diagram-toolbar"><span>${T}</span><span class="markdown-diagram-actions">${O("diagram-zoom-out", o.zoomOut)}${O("diagram-fit", o.fit)}${O("diagram-zoom-in", o.zoomIn)}${O("diagram-source", o.source)}${O("diagram-fullscreen", o.fullscreen)}${O("diagram-export-svg", "SVG")}${O("diagram-export-png", "PNG")}</span></header><div class="markdown-diagram-stage" role="img" aria-label="${o.diagramAria(T)}"><p class="markdown-diagram-status">${o.rendering(T)}</p></div><pre class="markdown-diagram-source" hidden><code>${M.utils.escapeHtml(e)}</code></pre></div>
`;
  }
  const n = e.replace(/\n$/u, "").split(`
`), r = n.length <= 2 && n.every((T) => T.length <= 96), b = n.length > 10, c = t || "text", u = [r ? "is-compact-code" : "", /^[A-Za-z0-9_-]+$/u.test(t) ? `language-${t}` : ""].filter(Boolean).join(" "), l = u ? ` class="${u}"` : "", h = [r ? "is-compact" : "", b ? "is-collapsible is-collapsed" : ""].filter(Boolean).join(" "), a = b ? `${c} · ${o.lineCount(n.length)}` : c, i = b ? `<button type="button" class="markdown-tool-button markdown-code-collapse" data-markdown-action="toggle-code" aria-label="${o.collapseCode}" title="${o.collapseCode}" aria-expanded="false">${o.collapseCode}</button>` : "", d = b ? `<div class="markdown-code-expand"><button type="button" data-markdown-action="toggle-code" aria-expanded="false">${o.expandCode(n.length)}</button></div>` : "";
  return `<div class="markdown-code-host"><div class="markdown-code-shell${h ? ` ${h}` : ""}" data-language="${c}" data-code-lines="${String(n.length)}"><header class="markdown-code-toolbar"><span>${a}</span><span class="markdown-code-actions">${i}${O("wrap-code", o.wrap)}${O("copy-code", o.copy)}${O("save-code", o.save)}</span></header><pre class="markdown-code-block${r ? " is-compact" : ""}"><code${l}>${M.utils.escapeHtml(e)}</code></pre>${d}</div></div>
`;
}
M.renderer.rules.fence = (e, t, o, s) => {
  const n = e[t];
  return Re(n.content, n.info.trim().split(/\s+/u)[0] ?? "", s.labels);
};
M.renderer.rules.code_block = (e, t, o, s) => Re(e[t].content, "", s.labels);
M.renderer.rules.table_open = (e, t, o, s) => {
  const n = s.labels ?? X;
  return `<section class="markdown-table-shell" role="region" aria-label="${n.dataTable}" tabindex="0"><header class="markdown-table-toolbar">${O("copy-table", n.copyCsv)}</header><div class="markdown-table-scroll"><table>
`;
};
M.renderer.rules.table_close = () => `</table></div></section>
`;
const ce = M.renderer.rules.code_inline;
M.renderer.rules.code_inline = (e, t, o, s, n) => {
  const r = e[t].content, b = r.match(/^(.+?\.[A-Za-z0-9_-]{1,12})(?::(\d+))?$/u);
  if (!b || /\s/u.test(r)) return ce ? ce(e, t, o, s, n) : n.renderToken(e, t, o);
  const c = M.utils.escapeHtml(b[1]), u = b[2] ?? "", l = s.labels ?? X;
  return `<button type="button" class="markdown-file-link" data-markdown-action="open-file" data-file-path="${c}" data-file-line="${u}" title="${l.openFile(c)}"><code>${M.utils.escapeHtml(r)}</code></button>`;
};
const ue = M.renderer.rules.link_open;
M.renderer.rules.link_open = (e, t, o, s, n) => {
  const r = e[t];
  return /^https?:\/\//u.test(r.attrGet("href") ?? "") && (r.attrSet("target", "_blank"), r.attrSet("rel", "noopener noreferrer")), ue ? ue(e, t, o, s, n) : n.renderToken(e, t, o);
};
function pe(e, t = X) {
  return ve.sanitize(M.render(e, { labels: t }), {
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
const at = ["innerHTML"], it = ["src"], fe = /* @__PURE__ */ Q({
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
    const o = e, s = t, n = j(() => o.labels ?? X), r = H(null), b = H(null), c = H(pe(me(o.text), n.value)), u = H(""), l = /* @__PURE__ */ new Set();
    let h = 0, a = 0;
    const i = {
      javascript: () => import("highlight.js/lib/languages/javascript"),
      typescript: () => import("highlight.js/lib/languages/typescript"),
      python: () => import("highlight.js/lib/languages/python"),
      go: () => import("highlight.js/lib/languages/go"),
      rust: () => import("highlight.js/lib/languages/rust"),
      json: () => import("highlight.js/lib/languages/json"),
      bash: () => import("highlight.js/lib/languages/bash"),
      sql: () => import("highlight.js/lib/languages/sql")
    };
    async function d(g) {
      window.clearTimeout(h), h = window.setTimeout(async () => {
        c.value = pe(me(g), n.value), await Pe(), T();
      }, o.renderDelay);
    }
    async function T() {
      var C, v, k, $, y, I;
      for (const A of Array.from(((C = r.value) == null ? void 0 : C.querySelectorAll("td")) ?? []))
        /^-?[\d,.]+%?$/u.test(((v = A.textContent) == null ? void 0 : v.trim()) ?? "") && (A.dataset.numeric = "true");
      for (const A of Array.from(((k = r.value) == null ? void 0 : k.querySelectorAll("img")) ?? []))
        A.addEventListener("error", () => {
          A.alt = A.alt || "图片加载失败", A.classList.add("is-load-error");
        }, { once: !0 });
      K();
      for (const [A, S] of Array.from((($ = r.value) == null ? void 0 : $.querySelectorAll(".markdown-code-shell")) ?? []).entries()) {
        S.dataset.codeIndex = String(A), S.classList.contains("is-collapsible") && l.has(A) && S.classList.remove("is-collapsed");
        for (const x of Array.from(S.querySelectorAll('[data-markdown-action="toggle-code"]')))
          x.setAttribute("aria-expanded", String(!S.classList.contains("is-collapsed")));
        const D = S.querySelector("pre"), F = S.querySelector('[data-markdown-action="wrap-code"]');
        D && F && (F.hidden = D.scrollWidth <= D.clientWidth + 2, F.setAttribute("aria-pressed", String(S.classList.contains("is-wrapped"))));
      }
      await B();
      const g = Array.from(((y = r.value) == null ? void 0 : y.querySelectorAll('pre code[class*="language-"]')) ?? []);
      if (g.length === 0) return;
      const R = (await import("highlight.js/lib/core")).default;
      for (const A of g) {
        const S = ((I = Array.from(A.classList).find((x) => x.startsWith("language-"))) == null ? void 0 : I.slice(9)) ?? "", D = i[S];
        if (!D || A.dataset.highlighted === "yes") continue;
        const F = await D();
        R.getLanguage(S) || R.registerLanguage(S, F.default), A.innerHTML = R.highlight(A.textContent ?? "", { language: S }).value, A.dataset.highlighted = "yes";
      }
    }
    function K() {
      var R;
      if (!o.resolveAssetUrl) return;
      const g = /\.(?:svg|png|jpe?g|gif|webp)(?:[?#].*)?$/iu;
      for (const C of Array.from(((R = r.value) == null ? void 0 : R.querySelectorAll("a[href]")) ?? [])) {
        const v = C.getAttribute("href") ?? "";
        if (!g.test(v) || /^(?:data|blob):/iu.test(v)) continue;
        const k = o.resolveAssetUrl(v);
        k && (C.href = k, C.target = "_blank", C.rel = "noopener noreferrer");
      }
    }
    async function B() {
      var R, C, v, k;
      const g = Array.from(((R = r.value) == null ? void 0 : R.querySelectorAll(".markdown-diagram-shell:not([data-rendered])")) ?? []);
      for (const $ of g) {
        $.dataset.rendered = "loading";
        const y = $.dataset.diagramEngine === "plantuml" ? "plantuml" : "mermaid", I = ((C = $.querySelector("code")) == null ? void 0 : C.textContent) ?? "", A = $.querySelector(".markdown-diagram-stage");
        if (A)
          try {
            let S = await ((v = o.renderDiagram) == null ? void 0 : v.call(o, { engine: y, source: I, dark: o.dark }));
            if (!S && y === "mermaid") {
              const { default: D } = await import("mermaid");
              D.initialize({ startOnLoad: !1, securityLevel: "strict", theme: o.dark ? "dark" : "default", htmlLabels: !1, flowchart: { htmlLabels: !1, useMaxWidth: !1 } }), S = (await D.render(`cody-diagram-${String(++a)}`, I)).svg;
            }
            if (!S) throw new Error(y === "plantuml" ? "当前环境未配置 PlantUML 渲染器" : "图表渲染失败");
            A.innerHTML = Y(S), Ce(A), $.dataset.rendered = "yes", $.style.setProperty("--diagram-scale", "1");
          } catch (S) {
            A.textContent = S instanceof Error ? S.message : "图表渲染失败", A.classList.add("markdown-diagram-error"), (k = $.querySelector(".markdown-diagram-source")) == null || k.removeAttribute("hidden"), $.dataset.rendered = "error";
          }
      }
    }
    function Y(g) {
      const R = ve.sanitize(g, { USE_PROFILES: { svg: !0, svgFilters: !0, html: !0 }, ADD_TAGS: ["foreignObject"], ADD_ATTR: ["xmlns"] }), C = R.trimStart().startsWith("<svg") ? R : `<svg xmlns="http://www.w3.org/2000/svg">${R}</svg>`, v = new DOMParser().parseFromString(C, "image/svg+xml");
      if (v.querySelector("parsererror")) return "";
      for (const k of v.querySelectorAll("*")) for (const $ of Array.from(k.attributes)) /^on/iu.test($.name) && k.removeAttribute($.name);
      return v.querySelectorAll("script").forEach((k) => k.remove()), new XMLSerializer().serializeToString(v.documentElement);
    }
    function Ce(g) {
      if (g.dataset.panReady === "true") return;
      g.dataset.panReady = "true";
      let R = 0, C = 0, v = 0, k = 0;
      g.addEventListener("pointerdown", (y) => {
        y.button === 0 && (R = y.clientX, C = y.clientY, v = g.scrollLeft, k = g.scrollTop, g.setPointerCapture(y.pointerId), g.classList.add("is-panning"));
      }), g.addEventListener("pointermove", (y) => {
        g.hasPointerCapture(y.pointerId) && (g.scrollLeft = v - (y.clientX - R), g.scrollTop = k - (y.clientY - C));
      });
      const $ = (y) => {
        g.hasPointerCapture(y.pointerId) && g.releasePointerCapture(y.pointerId), g.classList.remove("is-panning");
      };
      g.addEventListener("pointerup", $), g.addEventListener("pointercancel", $);
    }
    function Z(g, R = 0) {
      const C = Number(g.style.getPropertyValue("--diagram-scale") || "1");
      g.style.setProperty("--diagram-scale", String(R === 0 ? 1 : Math.min(2.5, Math.max(0.4, C + R))));
    }
    function ae(g, R) {
      const C = document.createElement("a");
      C.href = URL.createObjectURL(g), C.download = R, C.click(), URL.revokeObjectURL(C.href);
    }
    async function ie(g, R) {
      const C = R.textContent;
      try {
        await navigator.clipboard.writeText(g), R.textContent = "已复制";
      } catch {
        const v = document.createElement("textarea");
        v.value = g, v.style.position = "fixed", v.style.opacity = "0", document.body.appendChild(v), v.select();
        const k = document.execCommand("copy");
        v.remove(), R.textContent = k ? "已复制" : "复制失败";
      }
      window.setTimeout(() => {
        R.textContent = C;
      }, 1200);
    }
    function $e(g) {
      return Array.from((g == null ? void 0 : g.rows) ?? []).map((R) => Array.from(R.cells).map((C) => {
        var v;
        return `"${((v = C.textContent) == null ? void 0 : v.trim().replace(/"/gu, '""')) ?? ""}"`;
      }).join(",")).join(`
`);
    }
    function Ae(g) {
      var I, A, S, D, F;
      const R = g.target, C = R.closest("img");
      if (C) {
        u.value = C.currentSrc || C.src, (I = b.value) == null || I.showModal();
        return;
      }
      const v = R.closest("[data-markdown-action]");
      if (!v) return;
      const k = v.closest(".markdown-code-shell, .markdown-table-shell"), $ = v.dataset.markdownAction;
      if ($ === "copy-code" && ie(((A = k == null ? void 0 : k.querySelector("code")) == null ? void 0 : A.textContent) ?? "", v), $ === "wrap-code") {
        const x = (k == null ? void 0 : k.classList.toggle("is-wrapped")) ?? !1;
        v.textContent = x && n.value.scroll || n.value.wrap, v.setAttribute("aria-pressed", String(x));
      }
      if ($ === "save-code" && ae(new Blob([((S = k == null ? void 0 : k.querySelector("code")) == null ? void 0 : S.textContent) ?? ""], { type: "text/plain" }), `snippet.${(k == null ? void 0 : k.dataset.language) || "txt"}`), $ === "toggle-code" && (k != null && k.classList.contains("is-collapsible"))) {
        const x = Number(k.dataset.codeIndex ?? -1), z = !k.classList.toggle("is-collapsed");
        x >= 0 && (z ? l.add(x) : l.delete(x));
        for (const J of Array.from(k.querySelectorAll('[data-markdown-action="toggle-code"]'))) J.setAttribute("aria-expanded", String(z));
      }
      if ($ === "copy-table" && ie($e((k == null ? void 0 : k.querySelector("table")) ?? null), v), $ === "open-file") {
        const x = v.dataset.filePath ?? "", z = ((D = o.cwd) == null ? void 0 : D.replace(/\/$/u, "")) ?? "", J = x.startsWith("/") && z && x.startsWith(`${z}/`) ? x.slice(z.length + 1) : x.replace(/^\.\//u, "");
        s("openFile", { path: J, line: Number(v.dataset.fileLine || 0) || 1 });
      }
      const y = v.closest(".markdown-diagram-shell");
      if (y && $ === "diagram-zoom-in" && Z(y, 0.2), y && $ === "diagram-zoom-out" && Z(y, -0.2), y && $ === "diagram-fit" && Z(y), y && $ === "diagram-source") {
        const x = y.querySelector(".markdown-diagram-source");
        x && (x.hidden = !x.hidden);
      }
      if (y && $ === "diagram-fullscreen" && ((F = y.requestFullscreen) == null || F.call(y)), y && $ === "diagram-export-svg") {
        const x = y.querySelector("svg");
        x && ae(new Blob([new XMLSerializer().serializeToString(x)], { type: "image/svg+xml" }), "diagram.svg");
      }
    }
    function se() {
      var g;
      (g = b.value) == null || g.close();
    }
    return ge(() => [o.text, o.labels], ([g]) => {
      d(g);
    }, { deep: !0 }), Se(() => {
      T();
    }), xe(() => window.clearTimeout(h)), (g, R) => (p(), m(L, null, [
      f("div", {
        ref_key: "rootRef",
        ref: r,
        class: "cody-markdown cody-markdown-renderer",
        innerHTML: c.value,
        onClick: Ae
      }, null, 8, at),
      f("dialog", {
        ref_key: "imageDialogRef",
        ref: b,
        class: "cody-markdown-image-dialog",
        onClick: se
      }, [
        f("button", {
          type: "button",
          "aria-label": "关闭图片预览",
          onClick: se
        }, "×"),
        f("img", {
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
  return (Array.isArray(t.questions) ? t.questions : []).flatMap((s, n) => {
    if (!s || typeof s != "object") return [];
    const r = s, b = typeof r.question == "string" ? r.question.trim() : "";
    if (!b) return [];
    const c = Array.isArray(r.options) ? r.options : [];
    return [{
      id: typeof r.id == "string" && r.id.trim() ? r.id.trim() : `question-${String(n + 1)}`,
      header: typeof r.header == "string" ? r.header.trim() : "",
      question: b,
      isOther: r.isOther === !0,
      isSecret: r.isSecret === !0,
      options: c.flatMap((u) => {
        if (!u || typeof u != "object") return [];
        const l = u, h = typeof l.label == "string" ? l.label.trim() : "";
        return h ? [{ label: h, description: typeof l.description == "string" ? l.description.trim() : "" }] : [];
      })
    }];
  });
}
function st(e) {
  var s;
  if (!e || typeof e != "object") return "Codex 请求执行一项受保护操作。";
  const t = e, o = t.reason ?? t.question ?? t.command;
  return typeof o == "string" && o.trim() ? o : ((s = we(e)[0]) == null ? void 0 : s.question) ?? "Codex 请求执行一项受保护操作。";
}
function co(e) {
  var u, l, h;
  const t = [], o = /* @__PURE__ */ new Set(), s = new Map(e.messages.map((a) => [a.id, a])), n = new Map(e.timeline.map((a) => [a.id, a])), r = (a) => {
    if (a.kind === "reasoning") {
      t.push({ id: a.id, kind: "reasoning", text: a.text }), o.add(a.id);
      return;
    }
    if (!a.tool.summary && a.tool.details.length === 0 && !a.tool.output && a.tool.kind !== "fileChange") return;
    if (a.tool.kind !== "fileChange") {
      t.push({ id: a.id, kind: "tool", tool: a.tool }), o.add(a.id);
      return;
    }
    const i = `file-group:${a.turnId ?? a.id}`, d = t.at(-1);
    if (!d || d.kind !== "tool" || d.id !== i) {
      const B = [...new Set(a.tool.details)], Y = {
        id: i,
        kind: "tool",
        tool: {
          ...a.tool,
          title: B.length > 1 ? `文件变更 · ${String(B.length)} 个文件` : "文件变更",
          summary: B.length ? `${String(B.length)} 个文件已更新` : a.tool.summary,
          details: B
        }
      };
      t.push(Y), o.add(a.id);
      return;
    }
    const T = [.../* @__PURE__ */ new Set([...d.tool.details, ...a.tool.details])], K = [d.tool.output, a.tool.output].filter(Boolean).join(`

`);
    d.tool = {
      ...d.tool,
      status: /fail|error|cancel|reject/iu.test(`${d.tool.status} ${a.tool.status}`) ? "failed" : a.tool.status,
      title: T.length > 1 ? `文件变更 · ${String(T.length)} 个文件` : "文件变更",
      summary: T.length ? `${String(T.length)} 个文件已更新` : a.tool.summary,
      details: T,
      ...K ? { output: K } : {}
    }, o.add(a.id);
  };
  for (const a of e.presentation ?? [])
    if (a.kind === "message") {
      const i = s.get(a.id);
      i && (t.push({ id: i.id, kind: "message", message: i }), o.add(i.id));
    } else if (a.kind === "timeline") {
      const i = n.get(a.id);
      i && r(i);
    } else if (a.kind === "plan")
      (u = e.plan) != null && u.text && (!a.turnId || a.turnId === e.plan.turnId) && (t.push({ id: a.id, kind: "plan", text: e.plan.text }), o.add(a.id));
    else if (a.kind === "request") {
      const i = e.pendingRequests.find((d) => `request:${d.id}` === a.id);
      i && (t.push({ id: a.id, kind: "request", request: i }), o.add(a.id));
    } else if (a.kind === "failure") {
      const i = a.turnId ? e.turns[a.turnId] : void 0;
      i != null && i.error && (t.push({ id: a.id, kind: "failure", text: i.error }), o.add(a.id));
    } else if (a.kind === "interrupted")
      t.push({ id: a.id, kind: "interrupted", text: "本次回复已停止" }), o.add(a.id);
    else if (a.kind === "worked") {
      const i = a.turnId ? e.turns[a.turnId] : void 0;
      if (i != null && i.completedAtIso) {
        const d = i.startedAtIso ? Date.parse(i.completedAtIso) - Date.parse(i.startedAtIso) : 0;
        t.push({ id: a.id, kind: "worked", label: `Worked for ${Fe(d)}` }), o.add(a.id);
      }
    }
  for (const a of e.messages) o.has(a.id) || t.push({ id: a.id, kind: "message", message: a });
  for (const a of e.timeline) o.has(a.id) || r(a);
  const b = `plan:${((l = e.plan) == null ? void 0 : l.turnId) || "current"}`;
  (h = e.plan) != null && h.text && !o.has(b) && t.push({ id: b, kind: "plan", text: e.plan.text });
  for (const a of e.pendingRequests) o.has(`request:${a.id}`) || t.push({ id: `request:${a.id}`, kind: "request", request: a });
  for (const a of Object.values(e.turns))
    a.lifecycle === "failed" && a.error && !o.has(`failure:${a.id}`) && t.push({ id: `failure:${a.id}`, kind: "failure", text: a.error }), a.lifecycle === "interrupted" && !o.has(`interrupted:${a.id}`) && t.push({ id: `interrupted:${a.id}`, kind: "interrupted", text: "本次回复已停止" });
  const c = e.activeTurnId ? e.turns[e.activeTurnId] : void 0;
  if (c) {
    const a = e.pendingRequests.find((i) => !i.turnId || i.turnId === c.id);
    a ? t.push({
      id: `activity:${c.id}`,
      kind: "activity",
      title: a.kind === "approval" ? "等待你的审批" : "等待你的回答",
      detail: "处理后 Codex 会继续本次回复",
      tone: "waiting"
    }) : c.lifecycle === "retrying" ? t.push({
      id: `activity:${c.id}`,
      kind: "activity",
      title: c.retryMessage || "Codex 正在重新连接",
      detail: e.connection.status === "disconnected" ? "连接已中断，等待恢复" : "正在恢复本次回复",
      tone: "retrying"
    }) : c.lifecycle === "running" && t.push({
      id: `activity:${c.id}`,
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
}, ct = ["onClick"], ut = { key: 0 }, pt = ["onUpdate:modelValue", "type", "placeholder"], mt = { class: "cody-request-actions" }, ft = ["disabled"], gt = { class: "cody-approval-risk-heading" }, kt = ["data-level"], vt = { class: "cody-approval-risk-subject" }, ht = {
  key: 0,
  class: "cody-approval-risk-labels"
}, yt = {
  key: 1,
  class: "cody-approval-risk-details"
}, bt = { class: "cody-approval-risk-recommendation" }, Rt = { key: 1 }, wt = {
  key: 2,
  class: "cody-request-actions"
}, Ct = /* @__PURE__ */ Q({
  __name: "CodyRequestCard",
  props: {
    request: {}
  },
  emits: ["resolveApproval", "resolveQuestion"],
  setup(e, { emit: t }) {
    const o = e, s = t, n = Te({}), r = j(() => we(o.request.params)), b = j(() => st(o.request.params)), c = j(() => o.request.kind === "approval" ? ot({ method: o.request.method, params: o.request.params }) : null), u = j(() => r.value.length > 0 && r.value.every((h) => {
      var a;
      return !!((a = n[h.id]) != null && a.trim());
    }));
    ge(() => o.request.id, () => {
      for (const h of Object.keys(n)) delete n[h];
    });
    function l() {
      u.value && s("resolveQuestion", o.request.id, Object.fromEntries(r.value.map((h) => [h.id, { answers: [n[h.id].trim()] }])));
    }
    return (h, a) => (p(), m("article", {
      class: "cody-request-card",
      "data-kind": e.request.kind
    }, [
      f("div", lt, [
        f("strong", null, w(e.request.kind === "approval" ? "需要你的确认" : "Codex 需要补充信息"), 1),
        a[2] || (a[2] = f("small", null, "Agent 已暂停等待", -1))
      ]),
      e.request.kind === "question" && r.value.length ? (p(), m(L, { key: 0 }, [
        (p(!0), m(L, null, _(r.value, (i) => (p(), m("fieldset", {
          key: i.id,
          class: "cody-question-field"
        }, [
          f("legend", null, [
            i.header ? (p(), m("span", rt, w(i.header), 1)) : P("", !0),
            te(w(i.question), 1)
          ]),
          i.options.length ? (p(), m("div", dt, [
            (p(!0), m(L, null, _(i.options, (d) => (p(), m("button", {
              key: d.label,
              type: "button",
              class: Le({ selected: n[i.id] === d.label }),
              onClick: (T) => n[i.id] = d.label
            }, [
              f("strong", null, w(d.label), 1),
              d.description ? (p(), m("small", ut, w(d.description), 1)) : P("", !0)
            ], 10, ct))), 128))
          ])) : P("", !0),
          i.options.length === 0 || i.isOther ? Me((p(), m("input", {
            key: 1,
            "onUpdate:modelValue": (d) => n[i.id] = d,
            type: i.isSecret ? "password" : "text",
            placeholder: i.options.length ? "其他回答…" : "输入回答…",
            onKeyup: ke(l, ["enter"])
          }, null, 40, pt)), [
            [qe, n[i.id]]
          ]) : P("", !0)
        ]))), 128)),
        f("div", mt, [
          f("button", {
            type: "button",
            disabled: !u.value,
            onClick: l
          }, "提交回答", 8, ft)
        ])
      ], 64)) : (p(), m(L, { key: 1 }, [
        c.value ? (p(), m(L, { key: 0 }, [
          f("div", gt, [
            f("div", null, [
              f("strong", null, w(c.value.title), 1),
              f("p", null, w(c.value.description), 1)
            ]),
            f("span", {
              class: "cody-approval-risk-level",
              "data-level": c.value.level
            }, w(c.value.level), 9, kt)
          ]),
          f("code", vt, w(c.value.subject), 1),
          c.value.riskLabels.length ? (p(), m("ul", ht, [
            (p(!0), m(L, null, _(c.value.riskLabels, (i) => (p(), m("li", { key: i }, w(i), 1))), 128))
          ])) : P("", !0),
          c.value.impacts.length ? (p(), m("details", yt, [
            a[3] || (a[3] = f("summary", null, "查看影响", -1)),
            f("ul", null, [
              (p(!0), m(L, null, _(c.value.impacts, (i) => (p(), m("li", { key: i }, w(i), 1))), 128))
            ])
          ])) : P("", !0),
          f("p", bt, w(c.value.recommendation), 1)
        ], 64)) : (p(), m("p", Rt, w(b.value), 1)),
        e.request.kind === "approval" ? (p(), m("div", wt, [
          f("button", {
            type: "button",
            onClick: a[0] || (a[0] = (i) => s("resolveApproval", e.request.id, "accept"))
          }, "允许一次"),
          f("button", {
            type: "button",
            "data-tone": "danger",
            onClick: a[1] || (a[1] = (i) => s("resolveApproval", e.request.id, "decline"))
          }, "拒绝")
        ])) : P("", !0)
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
}, Ot = {
  key: 2,
  class: "cody-message-images"
}, Et = ["src"], _t = ["onClick"], It = ["data-tone", "open"], Ft = { key: 0 }, jt = ["onClick"], Wt = {
  key: 3,
  class: "cody-reasoning-card"
}, Bt = {
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
}, Nt = ["data-tone"], uo = /* @__PURE__ */ Q({
  __name: "CodyConversation",
  props: {
    entries: {},
    loading: { type: Boolean },
    variant: { default: "standalone" }
  },
  emits: ["copy", "openFile", "resolveApproval", "resolveQuestion"],
  setup(e, { emit: t }) {
    const o = t, s = H({});
    function n(c) {
      s.value = {
        ...s.value,
        [c]: s.value[c] !== !0
      };
    }
    function r(c, u) {
      o("resolveApproval", c, u);
    }
    function b(c, u) {
      o("resolveQuestion", c, u);
    }
    return (c, u) => (p(), m("section", {
      class: "cody-conversation",
      "data-variant": e.variant,
      "data-cody-component": "conversation-surface"
    }, [
      e.loading ? (p(), m("div", At, "正在同步对话…")) : e.entries.length === 0 ? (p(), m("div", St, [
        G(c.$slots, "empty", {}, () => [
          u[2] || (u[2] = te("开始这个需求的开发", -1))
        ])
      ])) : (p(!0), m(L, { key: 2 }, _(e.entries, (l) => {
        var h, a;
        return p(), m(L, {
          key: l.id
        }, [
          l.kind === "worked" ? (p(), m("div", xt, [
            f("span", null, w(l.label), 1)
          ])) : l.kind === "message" ? (p(), m("article", {
            key: 1,
            class: "cody-message",
            "data-role": l.message.role
          }, [
            f("div", {
              class: "cody-message-identity",
              "data-role": l.message.role
            }, w(l.message.role === "user" ? "你" : "CW"), 9, Tt),
            f("div", Lt, [
              f("div", Mt, w(l.message.role === "user" ? "你" : l.message.role === "assistant" ? "Codex Agent" : "系统"), 1),
              (h = l.message.skills) != null && h.length ? (p(), m("ul", qt, [
                (p(!0), m(L, null, _(l.message.skills, (i) => (p(), m("li", {
                  key: `${i.name}:${i.path}`
                }, "$" + w(i.displayName || i.name), 1))), 128))
              ])) : P("", !0),
              l.message.text ? (p(), m("div", Dt, [
                G(c.$slots, "markdown", {
                  message: l.message
                }, () => [
                  N(fe, {
                    text: l.message.text,
                    onOpenFile: u[0] || (u[0] = (i) => o("openFile", i))
                  }, null, 8, ["text"])
                ])
              ])) : P("", !0),
              (a = l.message.images) != null && a.length ? (p(), m("div", Ot, [
                (p(!0), m(L, null, _(l.message.images, (i) => (p(), m("img", {
                  key: i,
                  src: i,
                  alt: "对话图片",
                  loading: "lazy"
                }, null, 8, Et))), 128))
              ])) : P("", !0),
              l.message.text ? (p(), m("button", {
                key: 3,
                class: "cody-copy-button",
                type: "button",
                onClick: (i) => o("copy", l.message.text)
              }, "复制", 8, _t)) : P("", !0)
            ])
          ], 8, Pt)) : l.kind === "tool" ? (p(), m("details", {
            key: 2,
            class: "cody-tool-card",
            "data-tone": E(re)(l.tool.status),
            open: E(re)(l.tool.status) === "working"
          }, [
            f("summary", null, [
              u[3] || (u[3] = f("span", null, "⌁", -1)),
              f("strong", null, w(l.tool.title), 1),
              f("small", null, w(l.tool.status), 1)
            ]),
            f("p", null, w(l.tool.summary), 1),
            l.tool.details.length ? (p(), m("ul", Ft, [
              (p(!0), m(L, null, _(l.tool.details, (i) => (p(), m("li", { key: i }, w(i), 1))), 128))
            ])) : P("", !0),
            l.tool.output ? (p(), m(L, { key: 1 }, [
              f("pre", null, w(s.value[l.id] ? l.tool.output : E(Be)(l.tool.output)), 1),
              E(We)(l.tool.output) ? (p(), m("button", {
                key: 0,
                class: "cody-tool-output-toggle",
                type: "button",
                onClick: (i) => n(l.id)
              }, w(E(ze)(s.value[l.id] === !0)), 9, jt)) : P("", !0)
            ], 64)) : P("", !0)
          ], 8, It)) : l.kind === "reasoning" ? (p(), m("details", Wt, [
            f("summary", null, "✦ " + w(l.title || "推理过程"), 1),
            f("pre", null, w(l.text), 1)
          ])) : l.kind === "plan" ? (p(), m("details", Bt, [
            u[4] || (u[4] = f("summary", null, "计划", -1)),
            N(fe, {
              text: l.text,
              onOpenFile: u[1] || (u[1] = (i) => o("openFile", i))
            }, null, 8, ["text"])
          ])) : l.kind === "request" ? G(c.$slots, "request", {
            request: l.request
          }, () => [
            N(Ct, {
              request: l.request,
              onResolveApproval: r,
              onResolveQuestion: b
            }, null, 8, ["request"])
          ], void 0, 5) : l.kind === "failure" ? (p(), m("details", zt, [
            u[5] || (u[5] = f("summary", null, "本次回复失败", -1)),
            f("p", null, w(l.text), 1)
          ])) : l.kind === "interrupted" ? (p(), m("article", Ut, w(l.text), 1)) : l.kind === "activity" ? (p(), m("article", {
            key: 8,
            class: "cody-conversation-activity",
            "data-tone": l.tone,
            role: "status",
            "aria-live": "polite"
          }, [
            u[6] || (u[6] = f("span", {
              class: "cody-activity-pulse",
              "aria-hidden": "true"
            }, null, -1)),
            f("strong", null, w(l.title), 1),
            f("small", null, w(l.detail), 1)
          ], 8, Nt)) : P("", !0)
        ], 64);
      }), 128))
    ], 8, $t));
  }
}), Vt = ["data-variant"], Ht = { class: "cody-composer-shell" }, Gt = {
  key: 0,
  class: "cody-composer-selected",
  "aria-label": "Selected skills"
}, Qt = ["disabled", "aria-label", "onClick"], Xt = ["value", "disabled", "placeholder"], Kt = { class: "cody-composer-controls" }, Yt = {
  key: 0,
  class: "cody-composer-compact-control cody-composer-skill-control",
  title: "为本轮显式选择 Skill"
}, Zt = ["disabled"], Jt = ["value"], eo = { class: "cody-composer-actions" }, to = ["disabled"], oo = ["disabled", "aria-label"], ao = {
  key: 1,
  class: "cody-composer-policy"
}, po = /* @__PURE__ */ Q({
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
    const o = Q({
      name: "CodyComposerSelect",
      props: { label: { type: String, required: !0 }, modelValue: { type: String, required: !0 }, options: { type: Array, required: !0 }, disabled: Boolean },
      emits: ["update:modelValue"],
      setup(a, { emit: i }) {
        return () => ee("label", { class: "cody-composer-compact-control", title: a.label }, [
          ee("select", { value: a.modelValue, disabled: a.disabled, "aria-label": a.label, onChange: (d) => i("update:modelValue", d.target.value) }, a.options.map((d) => ee("option", { value: d.value }, d.label)))
        ]);
      }
    }), s = e, n = t, r = j(() => s.skills.filter((a) => !s.selectedSkills.includes(a.value))), b = j(() => {
      var a;
      return ((a = s.permissionOptions.find((i) => i.value === s.selectedPermission)) == null ? void 0 : a.description) ?? "";
    }), c = j(() => s.isRunning && s.selectedSubmitMode === "guide" ? "发送引导" : s.isRunning ? "加入队列" : "发送");
    function u(a, i) {
      var d;
      return ((d = a.find((T) => T.value === i)) == null ? void 0 : d.label) ?? i;
    }
    function l(a) {
      a && !s.selectedSkills.includes(a) && n("update:selected-skills", [...s.selectedSkills, a]);
    }
    function h(a) {
      n("update:selected-skills", s.selectedSkills.filter((i) => i !== a));
    }
    return (a, i) => (p(), m("form", {
      class: "cody-composer",
      "data-variant": e.variant,
      "data-cody-component": "composer-surface",
      onSubmit: i[9] || (i[9] = ne((d) => n("send"), ["prevent"]))
    }, [
      f("div", Ht, [
        e.selectedSkills.length ? (p(), m("div", Gt, [
          (p(!0), m(L, null, _(e.selectedSkills, (d) => (p(), m("span", {
            key: d,
            class: "cody-composer-chip"
          }, [
            te(" $" + w(u(e.skills, d)) + " ", 1),
            f("button", {
              type: "button",
              disabled: e.disabled,
              "aria-label": `移除 Skill ${u(e.skills, d)}`,
              onClick: (T) => h(d)
            }, "×", 8, Qt)
          ]))), 128))
        ])) : P("", !0),
        f("textarea", {
          value: e.draft,
          rows: "1",
          disabled: e.disabled,
          placeholder: e.placeholder,
          onInput: i[0] || (i[0] = (d) => n("update:draft", d.target.value)),
          onKeydown: i[1] || (i[1] = ke(ne((d) => n("send"), ["exact", "prevent"]), ["enter"]))
        }, null, 40, Xt),
        f("div", Kt, [
          G(a.$slots, "leading"),
          e.skills.length ? (p(), m("label", Yt, [
            i[11] || (i[11] = f("span", {
              class: "cody-composer-icon",
              "aria-hidden": "true"
            }, "✦", -1)),
            f("select", {
              value: "",
              disabled: e.disabled,
              "aria-label": "添加 Skill",
              onChange: i[2] || (i[2] = (d) => l(d.target.value))
            }, [
              i[10] || (i[10] = f("option", { value: "" }, "Skills", -1)),
              (p(!0), m(L, null, _(r.value, (d) => (p(), m("option", {
                key: d.value,
                value: d.value
              }, "$" + w(d.label), 9, Jt))), 128))
            ], 40, Zt)
          ])) : P("", !0),
          e.collaborationModes.length ? (p(), le(E(o), {
            key: 1,
            label: "协作模式",
            "model-value": e.selectedCollaborationMode,
            options: e.collaborationModes,
            disabled: e.disabled || e.isRunning,
            "onUpdate:modelValue": i[3] || (i[3] = (d) => n("update:collaboration-mode", d))
          }, null, 8, ["model-value", "options", "disabled"])) : P("", !0),
          N(E(o), {
            label: "提交策略",
            "model-value": e.selectedSubmitMode,
            options: e.submitModes,
            disabled: e.disabled,
            "onUpdate:modelValue": i[4] || (i[4] = (d) => n("update:submit-mode", d))
          }, null, 8, ["model-value", "options", "disabled"]),
          e.models.length ? (p(), le(E(o), {
            key: 2,
            label: "模型",
            "model-value": e.selectedModel,
            options: e.models,
            disabled: e.disabled || e.isRunning,
            "onUpdate:modelValue": i[5] || (i[5] = (d) => n("update:model", d))
          }, null, 8, ["model-value", "options", "disabled"])) : P("", !0),
          N(E(o), {
            label: "推理强度",
            "model-value": e.selectedReasoning,
            options: e.reasoningOptions,
            disabled: e.disabled || e.isRunning,
            "onUpdate:modelValue": i[6] || (i[6] = (d) => n("update:reasoning", d))
          }, null, 8, ["model-value", "options", "disabled"]),
          N(E(o), {
            label: "权限",
            "model-value": e.selectedPermission,
            options: e.permissionOptions,
            disabled: e.disabled || e.isRunning,
            "onUpdate:modelValue": i[7] || (i[7] = (d) => n("update:permission", d))
          }, null, 8, ["model-value", "options", "disabled"]),
          G(a.$slots, "controls"),
          f("div", eo, [
            e.isRunning ? (p(), m("button", {
              key: 0,
              class: "cody-composer-stop",
              type: "button",
              disabled: e.disabled,
              onClick: i[8] || (i[8] = (d) => n("stop"))
            }, "停止", 8, to)) : P("", !0),
            f("button", {
              class: "cody-composer-send",
              type: "submit",
              disabled: e.disabled || !e.draft.trim(),
              "aria-label": c.value
            }, "↑", 8, oo)
          ])
        ]),
        b.value ? (p(), m("p", ao, w(b.value), 1)) : P("", !0)
      ])
    ], 40, Vt));
  }
});
export {
  po as CodyComposer,
  uo as CodyConversation,
  fe as CodyMarkdown,
  Ct as CodyRequestCard,
  X as DEFAULT_CODY_MARKDOWN_LABELS,
  co as conversationEntriesFromState,
  we as questionFieldsFromParams,
  pe as renderCodyMarkdown,
  st as requestSummary,
  me as stabilizeStreamingMarkdown
};
