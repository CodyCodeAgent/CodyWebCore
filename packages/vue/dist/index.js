import { defineComponent as X, computed as F, ref as Q, watch as ke, onMounted as Se, onBeforeUnmount as xe, openBlock as c, createElementBlock as p, Fragment as M, createElementVNode as f, nextTick as Pe, reactive as Te, toDisplayString as C, renderList as I, createCommentVNode as L, createTextVNode as oe, normalizeClass as Le, withDirectives as Me, withKeys as he, vModelDynamic as qe, renderSlot as K, createVNode as H, unref as E, h as te, withModifiers as le, createBlock as re } from "vue";
import ve from "dompurify";
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
  const t = Math.max(1, Math.round(e / 1e3)), o = Math.floor(t / 3600), i = Math.floor(t % 3600 / 60), s = t % 60, l = [];
  return o > 0 && l.push(`${String(o)}h`), (i > 0 || o > 0) && l.push(`${String(i)}m`), l.push(`${String(s > 0 || l.length === 0 ? s : 0)}s`), l.join(" ");
}
const ye = 80, be = 12e3;
function je(e) {
  const t = e.trim().toLowerCase();
  return t.includes("fail") || t.includes("error") || t.includes("decline") || t.includes("cancel");
}
function de(e) {
  const t = Ee(e);
  if (t === "running")
    return "working";
  if (t === "success" || t === "danger")
    return t;
  const o = e.trim().toLowerCase();
  return o ? je(o) ? "danger" : /running|progress|pending|started/u.test(o) ? "working" : /success|complete|done|applied/u.test(o) ? "success" : "neutral" : "neutral";
}
function Be(e, t = ye, o = be) {
  if (e.length > Math.max(Math.trunc(o), 1))
    return !0;
  const i = Math.max(Math.trunc(t), 1);
  return e.split(/\r\n|\r|\n/u).length > i;
}
function We(e, t = ye, o = be) {
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
function ae(e) {
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
function W(e) {
  return Ge(e).trim();
}
function G(e) {
  return Array.from(new Set(e.filter((t) => t.trim().length > 0)));
}
function D(e, t) {
  const o = { low: 0, medium: 1, high: 2 };
  return o[e] >= o[t] ? e : t;
}
function V(e, t) {
  return t.some((o) => o.test(e));
}
function Ye(e) {
  return (e.match(/(?:^|[\s"'])\/[^\s"'`]+/gu) ?? []).map((o) => o.trim().replace(/^["']/u, "").replace(/["']$/u, ""));
}
function ce(e, t) {
  return t.some((o) => o.test(e));
}
function Ze(e, t) {
  const o = e.trim();
  let i = o ? "low" : "medium";
  const s = [], l = [];
  return o ? (V(o, [/\brm\s+(-[^\s]*r|--recursive)\b/u, /\brm\s+(-[^\s]*f|--force)\b/u]) && (i = D(i, "high"), s.push(t("approvalRisk.label.deletesFiles")), l.push(t("approvalRisk.impact.deletesFiles"))), V(o, [/\bsudo\b/u, /\bchmod\b/u, /\bchown\b/u]) && (i = D(i, "high"), s.push(t("approvalRisk.label.changesPermissions")), l.push(t("approvalRisk.impact.changesPermissions"))), V(o, [/\b(curl|wget|ssh|scp|rsync|gh|git\s+push)\b/u]) && (i = D(i, "medium"), s.push(t("approvalRisk.label.networkAccess")), l.push(t("approvalRisk.impact.networkAccess"))), V(o, [/\b(npm|pnpm|yarn|bun)\s+(install|add|remove|update)\b/u, /\bpip\s+install\b/u]) && (i = D(i, "medium"), s.push(t("approvalRisk.label.changesDependencies")), l.push(t("approvalRisk.impact.changesDependencies"))), V(o, [/\b(git\s+reset|git\s+clean|git\s+checkout)\b/u]) && (i = D(i, "high"), s.push(t("approvalRisk.label.mayDiscardWork")), l.push(t("approvalRisk.impact.mayDiscardWork"))), V(o, [/\b(auth|token|secret|password|credential|keychain|ssh-keygen)\b/iu]) && (i = D(i, "high"), s.push(t("approvalRisk.label.sensitiveCredentials")), l.push(t("approvalRisk.impact.sensitiveCredentials"))), ce(o, [/(^|[\s/])(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?|Cargo\.lock|go\.sum)\b/iu]) && (i = D(i, "medium"), s.push(t("approvalRisk.label.modifiesLockfile")), l.push(t("approvalRisk.impact.modifiesLockfile"))), ce(o, [/(^|\/)(auth|authentication|authorization|permission|permissions|rbac|acl|payment|payments|billing|checkout|stripe|paypal)(\/|\.|-|_)/iu]) && (i = D(i, "high"), s.push(t("approvalRisk.label.highRiskCodePath")), l.push(t("approvalRisk.impact.highRiskCodePath"))), {
    level: i,
    riskLabels: G(s.length > 0 ? s : [t("approvalRisk.label.commandExecution")]),
    impacts: G(l.length > 0 ? l : [t("approvalRisk.impact.commandExecution")])
  }) : (s.push(t("approvalRisk.label.unknownCommand")), l.push(t("approvalRisk.impact.commandMissing")), { level: i, riskLabels: s, impacts: l });
}
function Re(e, t) {
  return !e || !t || !e.startsWith("/") ? !1 : e !== t && !e.startsWith(`${t.replace(/\/+$/u, "")}/`);
}
function Je(e, t) {
  const o = ae(e.params), i = W(o == null ? void 0 : o.command), s = W(o == null ? void 0 : o.cwd), l = W(o == null ? void 0 : o.reason), R = Array.isArray(o == null ? void 0 : o.proposedExecpolicyAmendment) ? o.proposedExecpolicyAmendment.map(W).filter(Boolean) : [], d = Ze(i, t);
  let u = d.level;
  const n = [...d.riskLabels], y = [...d.impacts], S = Ye(i).filter((a) => Re(a, s));
  return R.length > 0 && (u = D(u, "medium"), n.push(t("approvalRisk.label.sessionPolicyChange")), y.push(t("approvalRisk.impact.sessionPolicyChange"))), S.length > 0 && (u = D(u, "high"), n.push(t("approvalRisk.label.outsideWorkspace")), y.push(t("approvalRisk.impact.outsideWorkspacePaths", { paths: S.slice(0, 3).join(", ") }))), e.commandPolicy && (e.commandPolicy.status === "allowed" ? (n.push(t("approvalRisk.label.allowedByPolicy")), y.push(e.commandPolicy.reason)) : e.commandPolicy.status === "not_configured" ? (u = D(u, "medium"), n.push(t("approvalRisk.label.noCommandPolicy")), y.push(t("approvalRisk.impact.noCommandPolicy"))) : e.commandPolicy.status === "not_git_workspace" ? (u = D(u, "medium"), n.push(t("approvalRisk.label.policyUnavailable")), y.push(e.commandPolicy.reason)) : e.commandPolicy.status === "denied" && (u = D(u, "high"), n.push(t("approvalRisk.label.deniedByPolicy")), y.push(e.commandPolicy.reason))), {
    title: t("approvalRisk.title.commandApproval"),
    level: u,
    description: l || t("approvalRisk.description.commandApproval"),
    subject: i || e.method,
    riskLabels: G(n),
    impacts: G(s ? [t("approvalRisk.impact.cwd", { cwd: s }), ...y] : y),
    recommendation: t(u === "high" ? "approvalRisk.recommendation.highCommand" : "approvalRisk.recommendation.normalCommand")
  };
}
function et(e, t) {
  const o = ae(e.params), i = W(o == null ? void 0 : o.grantRoot), s = W(o == null ? void 0 : o.reason), l = W(o == null ? void 0 : o.cwd);
  let R = i ? "medium" : "low";
  const d = [t("approvalRisk.label.fileWriteAccess")], u = [t("approvalRisk.impact.fileWriteAccess")];
  return i && (u.unshift(t("approvalRisk.impact.writeRoot", { path: i })), d.push(t("approvalRisk.label.sessionWriteScope"))), Re(i, l) && (R = "high", d.push(t("approvalRisk.label.outsideWorkspace")), u.push(t("approvalRisk.impact.outsideWorkspaceWriteRoot"))), e.fileChangePolicy && (e.fileChangePolicy.status === "allowed" ? (d.push(t("approvalRisk.label.allowedByFilePolicy")), u.push(e.fileChangePolicy.reason)) : (R = "high", d.push(t("approvalRisk.label.deniedByFilePolicy")), u.push(e.fileChangePolicy.reason)), e.fileChangePolicy.category === "sensitive" && d.push(t("approvalRisk.label.sensitivePath")), e.fileChangePolicy.category === "ignored" && d.push(t("approvalRisk.label.ignoredPath")), e.fileChangePolicy.category === "read_only" && d.push(t("approvalRisk.label.readOnlyWorkspace"))), {
    title: t("approvalRisk.title.fileChangeApproval"),
    level: R,
    description: s || t("approvalRisk.description.fileChangeApproval"),
    subject: i || t("approvalRisk.subject.workspaceFileChanges"),
    riskLabels: G(d),
    impacts: G(u),
    recommendation: t(R === "high" ? "approvalRisk.recommendation.highFile" : "approvalRisk.recommendation.normalFile")
  };
}
function tt(e, t) {
  const o = ae(e.params), i = W(o == null ? void 0 : o.reason), s = e.method.trim(), l = /\b(mcp|tool)\b/iu.test(s);
  return {
    title: t(l ? "approvalRisk.title.toolApproval" : "approvalRisk.title.manualApproval"),
    level: l ? "high" : "medium",
    description: i || t("approvalRisk.description.genericDecision"),
    subject: e.method,
    riskLabels: l ? [t("approvalRisk.label.externalTool"), t("approvalRisk.label.manualDecision")] : [t("approvalRisk.label.manualDecision")],
    impacts: l ? [t("approvalRisk.impact.externalTool")] : [t("approvalRisk.impact.manualDecision")],
    recommendation: t(l ? "approvalRisk.recommendation.externalTool" : "approvalRisk.recommendation.manualDecision")
  };
}
function ot(e, t = Xe) {
  return Ve(e.method) ? Je(e, t) : He(e.method) ? et(e, t) : tt(e, t);
}
const Y = {
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
function we(e, t = "", o = Y) {
  const i = t.toLowerCase();
  if (i === "mermaid" || i === "plantuml" || i === "puml") {
    const m = i === "mermaid" ? "mermaid" : "plantuml";
    return `<div class="markdown-diagram-shell" data-diagram-engine="${m}"><header class="markdown-diagram-toolbar"><span>${m}</span><span class="markdown-diagram-actions">${O("diagram-zoom-out", o.zoomOut)}${O("diagram-fit", o.fit)}${O("diagram-zoom-in", o.zoomIn)}${O("diagram-source", o.source)}${O("diagram-fullscreen", o.fullscreen)}${O("diagram-export-svg", "SVG")}${O("diagram-export-png", "PNG")}</span></header><div class="markdown-diagram-stage" role="img" aria-label="${o.diagramAria(m)}"><p class="markdown-diagram-status">${o.rendering(m)}</p></div><pre class="markdown-diagram-source" hidden><code>${q.utils.escapeHtml(e)}</code></pre></div>
`;
  }
  const s = e.replace(/\n$/u, "").split(`
`), l = s.length <= 2 && s.every((m) => m.length <= 96), R = s.length > 10, d = t || "text", u = [l ? "is-compact-code" : "", /^[A-Za-z0-9_-]+$/u.test(t) ? `language-${t}` : ""].filter(Boolean).join(" "), n = u ? ` class="${u}"` : "", y = [l ? "is-compact" : "", R ? "is-collapsible is-collapsed" : ""].filter(Boolean).join(" "), S = R ? `${d} · ${o.lineCount(s.length)}` : d, a = R ? `<button type="button" class="markdown-tool-button markdown-code-collapse" data-markdown-action="toggle-code" aria-label="${o.collapseCode}" title="${o.collapseCode}" aria-expanded="false">${o.collapseCode}</button>` : "", r = R ? `<div class="markdown-code-expand"><button type="button" data-markdown-action="toggle-code" aria-expanded="false">${o.expandCode(s.length)}</button></div>` : "";
  return `<div class="markdown-code-host"><div class="markdown-code-shell${y ? ` ${y}` : ""}" data-language="${d}" data-code-lines="${String(s.length)}"><header class="markdown-code-toolbar"><span>${S}</span><span class="markdown-code-actions">${a}${O("wrap-code", o.wrap)}${O("copy-code", o.copy)}${O("save-code", o.save)}</span></header><pre class="markdown-code-block${l ? " is-compact" : ""}"><code${n}>${q.utils.escapeHtml(e)}</code></pre>${r}</div></div>
`;
}
q.renderer.rules.fence = (e, t, o, i) => {
  const s = e[t];
  return we(s.content, s.info.trim().split(/\s+/u)[0] ?? "", i.labels);
};
q.renderer.rules.code_block = (e, t, o, i) => we(e[t].content, "", i.labels);
q.renderer.rules.table_open = (e, t, o, i) => {
  const s = i.labels ?? Y;
  return `<section class="markdown-table-shell" role="region" aria-label="${s.dataTable}" tabindex="0"><header class="markdown-table-toolbar">${O("copy-table", s.copyCsv)}</header><div class="markdown-table-scroll"><table>
`;
};
q.renderer.rules.table_close = () => `</table></div></section>
`;
const ue = q.renderer.rules.code_inline;
q.renderer.rules.code_inline = (e, t, o, i, s) => {
  const l = e[t].content, R = l.match(/^(.+?\.[A-Za-z0-9_-]{1,12})(?::(\d+))?$/u);
  if (!R || /\s/u.test(l)) return ue ? ue(e, t, o, i, s) : s.renderToken(e, t, o);
  const d = q.utils.escapeHtml(R[1]), u = R[2] ?? "", n = i.labels ?? Y;
  return `<button type="button" class="markdown-file-link" data-markdown-action="open-file" data-file-path="${d}" data-file-line="${u}" title="${n.openFile(d)}"><code>${q.utils.escapeHtml(l)}</code></button>`;
};
const pe = q.renderer.rules.link_open;
q.renderer.rules.link_open = (e, t, o, i, s) => {
  const l = e[t];
  return /^https?:\/\//u.test(l.attrGet("href") ?? "") && (l.attrSet("target", "_blank"), l.attrSet("rel", "noopener noreferrer")), pe ? pe(e, t, o, i, s) : s.renderToken(e, t, o);
};
function me(e, t = Y) {
  return ve.sanitize(q.render(e, { labels: t }), {
    ADD_ATTR: ["target"],
    ADD_TAGS: ["table", "thead", "tbody", "tr", "th", "td", "h1", "h2", "h3", "h4", "h5", "h6"],
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed"]
  });
}
function fe(e) {
  var t;
  return (((t = e.match(/^\s*```/gmu)) == null ? void 0 : t.length) ?? 0) % 2 === 1 ? `${e}

\`\`\`` : e;
}
const at = ["innerHTML"], it = ["src"], ge = /* @__PURE__ */ X({
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
    const o = e, i = t, s = F(() => o.labels ?? Y), l = Q(null), R = Q(null), d = Q(me(fe(o.text), s.value)), u = Q(""), n = /* @__PURE__ */ new Set();
    let y = 0, S = 0;
    const a = {
      javascript: () => import("highlight.js/lib/languages/javascript"),
      typescript: () => import("highlight.js/lib/languages/typescript"),
      python: () => import("highlight.js/lib/languages/python"),
      go: () => import("highlight.js/lib/languages/go"),
      rust: () => import("highlight.js/lib/languages/rust"),
      json: () => import("highlight.js/lib/languages/json"),
      bash: () => import("highlight.js/lib/languages/bash"),
      sql: () => import("highlight.js/lib/languages/sql")
    };
    async function r(g) {
      window.clearTimeout(y), y = window.setTimeout(async () => {
        d.value = me(fe(g), s.value), await Pe(), m();
      }, o.renderDelay);
    }
    async function m() {
      var $, v, k, A, b, j;
      for (const x of Array.from((($ = l.value) == null ? void 0 : $.querySelectorAll("td")) ?? []))
        /^-?[\d,.]+%?$/u.test(((v = x.textContent) == null ? void 0 : v.trim()) ?? "") && (x.dataset.numeric = "true");
      for (const x of Array.from(((k = l.value) == null ? void 0 : k.querySelectorAll("img")) ?? []))
        x.addEventListener("error", () => {
          x.alt = x.alt || "图片加载失败", x.classList.add("is-load-error");
        }, { once: !0 });
      h();
      for (const [x, P] of Array.from(((A = l.value) == null ? void 0 : A.querySelectorAll(".markdown-code-shell")) ?? []).entries()) {
        P.dataset.codeIndex = String(x), P.classList.contains("is-collapsible") && n.has(x) && P.classList.remove("is-collapsed");
        for (const T of Array.from(P.querySelectorAll('[data-markdown-action="toggle-code"]')))
          T.setAttribute("aria-expanded", String(!P.classList.contains("is-collapsed")));
        const _ = P.querySelector("pre"), B = P.querySelector('[data-markdown-action="wrap-code"]');
        _ && B && (B.hidden = _.scrollWidth <= _.clientWidth + 2, B.setAttribute("aria-pressed", String(P.classList.contains("is-wrapped"))));
      }
      await z();
      const g = Array.from(((b = l.value) == null ? void 0 : b.querySelectorAll('pre code[class*="language-"]')) ?? []);
      if (g.length === 0) return;
      const w = (await import("highlight.js/lib/core")).default;
      for (const x of g) {
        const P = ((j = Array.from(x.classList).find((T) => T.startsWith("language-"))) == null ? void 0 : j.slice(9)) ?? "", _ = a[P];
        if (!_ || x.dataset.highlighted === "yes") continue;
        const B = await _();
        w.getLanguage(P) || w.registerLanguage(P, B.default), x.innerHTML = w.highlight(x.textContent ?? "", { language: P }).value, x.dataset.highlighted = "yes";
      }
    }
    function h() {
      var w;
      if (!o.resolveAssetUrl) return;
      const g = /\.(?:svg|png|jpe?g|gif|webp)(?:[?#].*)?$/iu;
      for (const $ of Array.from(((w = l.value) == null ? void 0 : w.querySelectorAll("a[href]")) ?? [])) {
        const v = $.getAttribute("href") ?? "";
        if (!g.test(v) || /^(?:data|blob):/iu.test(v)) continue;
        const k = o.resolveAssetUrl(v);
        k && ($.href = k, $.target = "_blank", $.rel = "noopener noreferrer");
      }
    }
    async function z() {
      var w, $, v, k;
      const g = Array.from(((w = l.value) == null ? void 0 : w.querySelectorAll(".markdown-diagram-shell:not([data-rendered])")) ?? []);
      for (const A of g) {
        A.dataset.rendered = "loading";
        const b = A.dataset.diagramEngine === "plantuml" ? "plantuml" : "mermaid", j = (($ = A.querySelector("code")) == null ? void 0 : $.textContent) ?? "", x = A.querySelector(".markdown-diagram-stage");
        if (x)
          try {
            let P = await ((v = o.renderDiagram) == null ? void 0 : v.call(o, { engine: b, source: j, dark: o.dark }));
            if (!P && b === "mermaid") {
              const { default: _ } = await import("mermaid");
              _.initialize({ startOnLoad: !1, securityLevel: "strict", theme: o.dark ? "dark" : "default", htmlLabels: !1, flowchart: { htmlLabels: !1, useMaxWidth: !1 } }), P = (await _.render(`cody-diagram-${String(++S)}`, j)).svg;
            }
            if (!P) throw new Error(b === "plantuml" ? "当前环境未配置 PlantUML 渲染器" : "图表渲染失败");
            x.innerHTML = U(P), Z(x), A.dataset.rendered = "yes", A.style.setProperty("--diagram-scale", "1");
          } catch (P) {
            x.textContent = P instanceof Error ? P.message : "图表渲染失败", x.classList.add("markdown-diagram-error"), (k = A.querySelector(".markdown-diagram-source")) == null || k.removeAttribute("hidden"), A.dataset.rendered = "error";
          }
      }
    }
    function U(g) {
      const w = ve.sanitize(g, { USE_PROFILES: { svg: !0, svgFilters: !0, html: !0 }, ADD_TAGS: ["foreignObject"], ADD_ATTR: ["xmlns"] }), $ = w.trimStart().startsWith("<svg") ? w : `<svg xmlns="http://www.w3.org/2000/svg">${w}</svg>`, v = new DOMParser().parseFromString($, "image/svg+xml");
      if (v.querySelector("parsererror")) return "";
      for (const k of v.querySelectorAll("*")) for (const A of Array.from(k.attributes)) /^on/iu.test(A.name) && k.removeAttribute(A.name);
      return v.querySelectorAll("script").forEach((k) => k.remove()), new XMLSerializer().serializeToString(v.documentElement);
    }
    function Z(g) {
      if (g.dataset.panReady === "true") return;
      g.dataset.panReady = "true";
      let w = 0, $ = 0, v = 0, k = 0;
      g.addEventListener("pointerdown", (b) => {
        b.button === 0 && (w = b.clientX, $ = b.clientY, v = g.scrollLeft, k = g.scrollTop, g.setPointerCapture(b.pointerId), g.classList.add("is-panning"));
      }), g.addEventListener("pointermove", (b) => {
        g.hasPointerCapture(b.pointerId) && (g.scrollLeft = v - (b.clientX - w), g.scrollTop = k - (b.clientY - $));
      });
      const A = (b) => {
        g.hasPointerCapture(b.pointerId) && g.releasePointerCapture(b.pointerId), g.classList.remove("is-panning");
      };
      g.addEventListener("pointerup", A), g.addEventListener("pointercancel", A);
    }
    function J(g, w = 0) {
      const $ = Number(g.style.getPropertyValue("--diagram-scale") || "1");
      g.style.setProperty("--diagram-scale", String(w === 0 ? 1 : Math.min(2.5, Math.max(0.4, $ + w))));
    }
    function ie(g, w) {
      const $ = document.createElement("a");
      $.href = URL.createObjectURL(g), $.download = w, $.click(), URL.revokeObjectURL($.href);
    }
    async function se(g, w) {
      const $ = w.textContent;
      try {
        await navigator.clipboard.writeText(g), w.textContent = "已复制";
      } catch {
        const v = document.createElement("textarea");
        v.value = g, v.style.position = "fixed", v.style.opacity = "0", document.body.appendChild(v), v.select();
        const k = document.execCommand("copy");
        v.remove(), w.textContent = k ? "已复制" : "复制失败";
      }
      window.setTimeout(() => {
        w.textContent = $;
      }, 1200);
    }
    function $e(g) {
      return Array.from((g == null ? void 0 : g.rows) ?? []).map((w) => Array.from(w.cells).map(($) => {
        var v;
        return `"${((v = $.textContent) == null ? void 0 : v.trim().replace(/"/gu, '""')) ?? ""}"`;
      }).join(",")).join(`
`);
    }
    function Ae(g) {
      var j, x, P, _, B;
      const w = g.target, $ = w.closest("img");
      if ($) {
        u.value = $.currentSrc || $.src, (j = R.value) == null || j.showModal();
        return;
      }
      const v = w.closest("[data-markdown-action]");
      if (!v) return;
      const k = v.closest(".markdown-code-shell, .markdown-table-shell"), A = v.dataset.markdownAction;
      if (A === "copy-code" && se(((x = k == null ? void 0 : k.querySelector("code")) == null ? void 0 : x.textContent) ?? "", v), A === "wrap-code") {
        const T = (k == null ? void 0 : k.classList.toggle("is-wrapped")) ?? !1;
        v.textContent = T && s.value.scroll || s.value.wrap, v.setAttribute("aria-pressed", String(T));
      }
      if (A === "save-code" && ie(new Blob([((P = k == null ? void 0 : k.querySelector("code")) == null ? void 0 : P.textContent) ?? ""], { type: "text/plain" }), `snippet.${(k == null ? void 0 : k.dataset.language) || "txt"}`), A === "toggle-code" && (k != null && k.classList.contains("is-collapsible"))) {
        const T = Number(k.dataset.codeIndex ?? -1), N = !k.classList.toggle("is-collapsed");
        T >= 0 && (N ? n.add(T) : n.delete(T));
        for (const ee of Array.from(k.querySelectorAll('[data-markdown-action="toggle-code"]'))) ee.setAttribute("aria-expanded", String(N));
      }
      if (A === "copy-table" && se($e((k == null ? void 0 : k.querySelector("table")) ?? null), v), A === "open-file") {
        const T = v.dataset.filePath ?? "", N = ((_ = o.cwd) == null ? void 0 : _.replace(/\/$/u, "")) ?? "", ee = T.startsWith("/") && N && T.startsWith(`${N}/`) ? T.slice(N.length + 1) : T.replace(/^\.\//u, "");
        i("openFile", { path: ee, line: Number(v.dataset.fileLine || 0) || 1 });
      }
      const b = v.closest(".markdown-diagram-shell");
      if (b && A === "diagram-zoom-in" && J(b, 0.2), b && A === "diagram-zoom-out" && J(b, -0.2), b && A === "diagram-fit" && J(b), b && A === "diagram-source") {
        const T = b.querySelector(".markdown-diagram-source");
        T && (T.hidden = !T.hidden);
      }
      if (b && A === "diagram-fullscreen" && ((B = b.requestFullscreen) == null || B.call(b)), b && A === "diagram-export-svg") {
        const T = b.querySelector("svg");
        T && ie(new Blob([new XMLSerializer().serializeToString(T)], { type: "image/svg+xml" }), "diagram.svg");
      }
    }
    function ne() {
      var g;
      (g = R.value) == null || g.close();
    }
    return ke(() => [o.text, o.labels], ([g]) => {
      r(g);
    }, { deep: !0 }), Se(() => {
      m();
    }), xe(() => window.clearTimeout(y)), (g, w) => (c(), p(M, null, [
      f("div", {
        ref_key: "rootRef",
        ref: l,
        class: "cody-markdown cody-markdown-renderer",
        innerHTML: d.value,
        onClick: Ae
      }, null, 8, at),
      f("dialog", {
        ref_key: "imageDialogRef",
        ref: R,
        class: "cody-markdown-image-dialog",
        onClick: ne
      }, [
        f("button", {
          type: "button",
          "aria-label": "关闭图片预览",
          onClick: ne
        }, "×"),
        f("img", {
          src: u.value,
          alt: "Markdown 图片预览"
        }, null, 8, it)
      ], 512)
    ], 64));
  }
});
function Ce(e) {
  if (!e || typeof e != "object") return [];
  const t = e;
  return (Array.isArray(t.questions) ? t.questions : []).flatMap((i, s) => {
    if (!i || typeof i != "object") return [];
    const l = i, R = typeof l.question == "string" ? l.question.trim() : "";
    if (!R) return [];
    const d = Array.isArray(l.options) ? l.options : [];
    return [{
      id: typeof l.id == "string" && l.id.trim() ? l.id.trim() : `question-${String(s + 1)}`,
      header: typeof l.header == "string" ? l.header.trim() : "",
      question: R,
      isOther: l.isOther === !0,
      isSecret: l.isSecret === !0,
      options: d.flatMap((u) => {
        if (!u || typeof u != "object") return [];
        const n = u, y = typeof n.label == "string" ? n.label.trim() : "";
        return y ? [{ label: y, description: typeof n.description == "string" ? n.description.trim() : "" }] : [];
      })
    }];
  });
}
function st(e) {
  var i;
  if (!e || typeof e != "object") return "Codex 请求执行一项受保护操作。";
  const t = e, o = t.reason ?? t.question ?? t.command;
  return typeof o == "string" && o.trim() ? o : ((i = Ce(e)[0]) == null ? void 0 : i.question) ?? "Codex 请求执行一项受保护操作。";
}
function uo(e) {
  var u, n, y, S;
  const t = [], o = /* @__PURE__ */ new Set(), i = new Map(e.messages.map((a) => [a.id, a])), s = new Map(e.timeline.map((a) => [a.id, a])), l = (a) => {
    if (a.kind === "reasoning") {
      t.push({ id: a.id, kind: "reasoning", text: a.text }), o.add(a.id);
      return;
    }
    if (!a.tool.summary && a.tool.details.length === 0 && !a.tool.output && a.tool.kind !== "fileChange") return;
    if (a.tool.kind !== "fileChange") {
      t.push({ id: a.id, kind: "tool", tool: a.tool }), o.add(a.id);
      return;
    }
    const r = `file-group:${a.turnId ?? a.id}`, m = t.at(-1);
    if (!m || m.kind !== "tool" || m.id !== r) {
      const U = [...new Set(a.tool.details)], Z = {
        id: r,
        kind: "tool",
        tool: {
          ...a.tool,
          title: U.length > 1 ? `文件变更 · ${String(U.length)} 个文件` : "文件变更",
          summary: U.length ? `${String(U.length)} 个文件已更新` : a.tool.summary,
          details: U
        }
      };
      t.push(Z), o.add(a.id);
      return;
    }
    const h = [.../* @__PURE__ */ new Set([...m.tool.details, ...a.tool.details])], z = [m.tool.output, a.tool.output].filter(Boolean).join(`

`);
    m.tool = {
      ...m.tool,
      status: /fail|error|cancel|reject/iu.test(`${m.tool.status} ${a.tool.status}`) ? "failed" : a.tool.status,
      title: h.length > 1 ? `文件变更 · ${String(h.length)} 个文件` : "文件变更",
      summary: h.length ? `${String(h.length)} 个文件已更新` : a.tool.summary,
      details: h,
      ...z ? { output: z } : {}
    }, o.add(a.id);
  };
  for (const a of e.presentation ?? [])
    if (a.kind === "message") {
      const r = i.get(a.id);
      r && (t.push({ id: r.id, kind: "message", message: r }), o.add(r.id));
    } else if (a.kind === "timeline") {
      const r = s.get(a.id);
      r && l(r);
    } else if (a.kind === "plan")
      (u = e.plan) != null && u.text && (!a.turnId || a.turnId === e.plan.turnId) && (t.push({ id: a.id, kind: "plan", text: e.plan.text }), o.add(a.id));
    else if (a.kind === "request") {
      const r = e.pendingRequests.find((m) => `request:${m.id}` === a.id);
      r && (t.push({ id: a.id, kind: "request", request: r }), o.add(a.id));
    } else if (a.kind === "failure") {
      const r = a.turnId ? e.turns[a.turnId] : void 0;
      r != null && r.error && (t.push({ id: a.id, kind: "failure", text: r.error }), o.add(a.id));
    } else if (a.kind === "interrupted")
      t.push({ id: a.id, kind: "interrupted", text: "本次回复已停止" }), o.add(a.id);
    else if (a.kind === "worked") {
      const r = a.turnId ? e.turns[a.turnId] : void 0;
      if (r != null && r.completedAtIso) {
        const m = r.startedAtIso ? Date.parse(r.completedAtIso) - Date.parse(r.startedAtIso) : 0;
        t.push({ id: a.id, kind: "worked", label: `Worked for ${Fe(m)}` }), o.add(a.id);
      }
    }
  for (const a of e.messages) o.has(a.id) || t.push({ id: a.id, kind: "message", message: a });
  for (const a of e.timeline) o.has(a.id) || l(a);
  const R = `plan:${((n = e.plan) == null ? void 0 : n.turnId) || "current"}`;
  (y = e.plan) != null && y.text && !o.has(R) && t.push({ id: R, kind: "plan", text: e.plan.text });
  for (const a of e.pendingRequests) o.has(`request:${a.id}`) || t.push({ id: `request:${a.id}`, kind: "request", request: a });
  for (const a of Object.values(e.turns))
    a.lifecycle === "failed" && a.error && !o.has(`failure:${a.id}`) && t.push({ id: `failure:${a.id}`, kind: "failure", text: a.error }), a.lifecycle === "interrupted" && !o.has(`interrupted:${a.id}`) && t.push({ id: `interrupted:${a.id}`, kind: "interrupted", text: "本次回复已停止" });
  const d = e.activeTurnId ? e.turns[e.activeTurnId] : void 0;
  if (d) {
    const a = e.pendingRequests.find((r) => !r.turnId || r.turnId === d.id);
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
      title: ((S = e.activity) == null ? void 0 : S.label) || "Codex 正在工作",
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
}, Ct = /* @__PURE__ */ X({
  __name: "CodyRequestCard",
  props: {
    request: {}
  },
  emits: ["resolveApproval", "resolveQuestion"],
  setup(e, { emit: t }) {
    const o = e, i = t, s = Te({}), l = F(() => Ce(o.request.params)), R = F(() => st(o.request.params)), d = F(() => o.request.kind === "approval" ? ot({ method: o.request.method, params: o.request.params }) : null), u = F(() => l.value.length > 0 && l.value.every((y) => {
      var S;
      return !!((S = s[y.id]) != null && S.trim());
    }));
    ke(() => o.request.id, () => {
      for (const y of Object.keys(s)) delete s[y];
    });
    function n() {
      u.value && i("resolveQuestion", o.request.id, Object.fromEntries(l.value.map((y) => [y.id, { answers: [s[y.id].trim()] }])));
    }
    return (y, S) => (c(), p("article", {
      class: "cody-request-card",
      "data-kind": e.request.kind
    }, [
      f("div", lt, [
        f("strong", null, C(e.request.kind === "approval" ? "需要你的确认" : "Codex 需要补充信息"), 1),
        S[2] || (S[2] = f("small", null, "Agent 已暂停等待", -1))
      ]),
      e.request.kind === "question" && l.value.length ? (c(), p(M, { key: 0 }, [
        (c(!0), p(M, null, I(l.value, (a) => (c(), p("fieldset", {
          key: a.id,
          class: "cody-question-field"
        }, [
          f("legend", null, [
            a.header ? (c(), p("span", rt, C(a.header), 1)) : L("", !0),
            oe(C(a.question), 1)
          ]),
          a.options.length ? (c(), p("div", dt, [
            (c(!0), p(M, null, I(a.options, (r) => (c(), p("button", {
              key: r.label,
              type: "button",
              class: Le({ selected: s[a.id] === r.label }),
              onClick: (m) => s[a.id] = r.label
            }, [
              f("strong", null, C(r.label), 1),
              r.description ? (c(), p("small", ut, C(r.description), 1)) : L("", !0)
            ], 10, ct))), 128))
          ])) : L("", !0),
          a.options.length === 0 || a.isOther ? Me((c(), p("input", {
            key: 1,
            "onUpdate:modelValue": (r) => s[a.id] = r,
            type: a.isSecret ? "password" : "text",
            placeholder: a.options.length ? "其他回答…" : "输入回答…",
            onKeyup: he(n, ["enter"])
          }, null, 40, pt)), [
            [qe, s[a.id]]
          ]) : L("", !0)
        ]))), 128)),
        f("div", mt, [
          f("button", {
            type: "button",
            disabled: !u.value,
            onClick: n
          }, "提交回答", 8, ft)
        ])
      ], 64)) : (c(), p(M, { key: 1 }, [
        d.value ? (c(), p(M, { key: 0 }, [
          f("div", gt, [
            f("div", null, [
              f("strong", null, C(d.value.title), 1),
              f("p", null, C(d.value.description), 1)
            ]),
            f("span", {
              class: "cody-approval-risk-level",
              "data-level": d.value.level
            }, C(d.value.level), 9, kt)
          ]),
          f("code", ht, C(d.value.subject), 1),
          d.value.riskLabels.length ? (c(), p("ul", vt, [
            (c(!0), p(M, null, I(d.value.riskLabels, (a) => (c(), p("li", { key: a }, C(a), 1))), 128))
          ])) : L("", !0),
          d.value.impacts.length ? (c(), p("details", yt, [
            S[3] || (S[3] = f("summary", null, "查看影响", -1)),
            f("ul", null, [
              (c(!0), p(M, null, I(d.value.impacts, (a) => (c(), p("li", { key: a }, C(a), 1))), 128))
            ])
          ])) : L("", !0),
          f("p", bt, C(d.value.recommendation), 1)
        ], 64)) : (c(), p("p", Rt, C(R.value), 1)),
        e.request.kind === "approval" ? (c(), p("div", wt, [
          f("button", {
            type: "button",
            onClick: S[0] || (S[0] = (a) => i("resolveApproval", e.request.id, "accept"))
          }, "允许一次"),
          f("button", {
            type: "button",
            "data-tone": "danger",
            onClick: S[1] || (S[1] = (a) => i("resolveApproval", e.request.id, "decline"))
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
}, Nt = ["data-tone"], po = /* @__PURE__ */ X({
  __name: "CodyConversation",
  props: {
    entries: {},
    loading: { type: Boolean },
    variant: { default: "standalone" }
  },
  emits: ["copy", "openFile", "resolveApproval", "resolveQuestion"],
  setup(e, { emit: t }) {
    const o = t, i = Q({});
    function s(d) {
      i.value = {
        ...i.value,
        [d]: i.value[d] !== !0
      };
    }
    function l(d, u) {
      o("resolveApproval", d, u);
    }
    function R(d, u) {
      o("resolveQuestion", d, u);
    }
    return (d, u) => (c(), p("section", {
      class: "cody-conversation",
      "data-variant": e.variant,
      "data-cody-component": "conversation-surface"
    }, [
      e.loading ? (c(), p("div", At, "正在同步对话…")) : e.entries.length === 0 ? (c(), p("div", St, [
        K(d.$slots, "empty", {}, () => [
          u[2] || (u[2] = oe("开始这个需求的开发", -1))
        ])
      ])) : (c(!0), p(M, { key: 2 }, I(e.entries, (n) => {
        var y, S;
        return c(), p(M, {
          key: n.id
        }, [
          n.kind === "worked" ? (c(), p("div", xt, [
            f("span", null, C(n.label), 1)
          ])) : n.kind === "message" ? (c(), p("article", {
            key: 1,
            class: "cody-message",
            "data-role": n.message.role
          }, [
            f("div", {
              class: "cody-message-identity",
              "data-role": n.message.role
            }, C(n.message.role === "user" ? "你" : "CW"), 9, Tt),
            f("div", Lt, [
              f("div", Mt, C(n.message.role === "user" ? "你" : n.message.role === "assistant" ? "Codex Agent" : "系统"), 1),
              (y = n.message.skills) != null && y.length ? (c(), p("ul", qt, [
                (c(!0), p(M, null, I(n.message.skills, (a) => (c(), p("li", {
                  key: `${a.name}:${a.path}`
                }, "$" + C(a.displayName || a.name), 1))), 128))
              ])) : L("", !0),
              n.message.text ? (c(), p("div", Dt, [
                K(d.$slots, "markdown", {
                  message: n.message
                }, () => [
                  H(ge, {
                    text: n.message.text,
                    onOpenFile: u[0] || (u[0] = (a) => o("openFile", a))
                  }, null, 8, ["text"])
                ])
              ])) : L("", !0),
              (S = n.message.images) != null && S.length ? (c(), p("div", _t, [
                (c(!0), p(M, null, I(n.message.images, (a) => (c(), p("img", {
                  key: a,
                  src: a,
                  alt: "对话图片",
                  loading: "lazy"
                }, null, 8, Ot))), 128))
              ])) : L("", !0),
              n.message.text ? (c(), p("button", {
                key: 3,
                class: "cody-copy-button",
                type: "button",
                onClick: (a) => o("copy", n.message.text)
              }, "复制", 8, Et)) : L("", !0)
            ])
          ], 8, Pt)) : n.kind === "tool" ? (c(), p("details", {
            key: 2,
            class: "cody-tool-card",
            "data-tone": E(de)(n.tool.status),
            open: E(de)(n.tool.status) === "working"
          }, [
            f("summary", null, [
              u[3] || (u[3] = f("span", null, "⌁", -1)),
              f("strong", null, C(n.tool.title), 1),
              f("small", null, C(n.tool.status), 1)
            ]),
            f("p", null, C(n.tool.summary), 1),
            n.tool.details.length ? (c(), p("ul", Ft, [
              (c(!0), p(M, null, I(n.tool.details, (a) => (c(), p("li", { key: a }, C(a), 1))), 128))
            ])) : L("", !0),
            n.tool.output ? (c(), p(M, { key: 1 }, [
              f("pre", null, C(i.value[n.id] ? n.tool.output : E(We)(n.tool.output)), 1),
              E(Be)(n.tool.output) ? (c(), p("button", {
                key: 0,
                class: "cody-tool-output-toggle",
                type: "button",
                onClick: (a) => s(n.id)
              }, C(E(ze)(i.value[n.id] === !0)), 9, jt)) : L("", !0)
            ], 64)) : L("", !0)
          ], 8, It)) : n.kind === "reasoning" ? (c(), p("details", Bt, [
            f("summary", null, "✦ " + C(n.title || "推理过程"), 1),
            f("pre", null, C(n.text), 1)
          ])) : n.kind === "plan" ? (c(), p("details", Wt, [
            u[4] || (u[4] = f("summary", null, "计划", -1)),
            H(ge, {
              text: n.text,
              onOpenFile: u[1] || (u[1] = (a) => o("openFile", a))
            }, null, 8, ["text"])
          ])) : n.kind === "request" ? K(d.$slots, "request", {
            request: n.request
          }, () => [
            H(Ct, {
              request: n.request,
              onResolveApproval: l,
              onResolveQuestion: R
            }, null, 8, ["request"])
          ], void 0, 5) : n.kind === "failure" ? (c(), p("details", zt, [
            u[5] || (u[5] = f("summary", null, "本次回复失败", -1)),
            f("p", null, C(n.text), 1)
          ])) : n.kind === "interrupted" ? (c(), p("article", Ut, C(n.text), 1)) : n.kind === "activity" ? (c(), p("article", {
            key: 8,
            class: "cody-conversation-activity",
            "data-tone": n.tone,
            role: "status",
            "aria-live": "polite"
          }, [
            u[6] || (u[6] = f("span", {
              class: "cody-activity-pulse",
              "aria-hidden": "true"
            }, null, -1)),
            f("strong", null, C(n.title), 1),
            f("small", null, C(n.detail), 1)
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
}, mo = /* @__PURE__ */ X({
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
    const o = X({
      name: "CodyComposerSelect",
      props: { label: { type: String, required: !0 }, modelValue: { type: String, required: !0 }, options: { type: Array, required: !0 }, disabled: Boolean },
      emits: ["update:modelValue"],
      setup(r, { emit: m }) {
        return () => te("label", { class: "cody-composer-compact-control", title: r.label }, [
          te("select", { value: r.modelValue, disabled: r.disabled, "aria-label": r.label, onChange: (h) => m("update:modelValue", h.target.value) }, r.options.map((h) => te("option", { value: h.value }, h.label)))
        ]);
      }
    }), i = e, s = t, l = F(() => i.skills.filter((r) => !i.selectedSkills.includes(r.value))), R = F(() => {
      var r;
      return ((r = i.permissionOptions.find((m) => m.value === i.selectedPermission)) == null ? void 0 : r.description) ?? "";
    }), d = F(() => !i.disabled && Vt({ text: i.draft, skills: i.selectedSkills })), u = F(() => i.isRunning && i.selectedSubmitMode === "steer" ? "发送引导" : i.isRunning ? "加入队列" : "发送");
    function n(r, m) {
      var h;
      return ((h = r.find((z) => z.value === m)) == null ? void 0 : h.label) ?? m;
    }
    function y(r) {
      r && !i.selectedSkills.includes(r) && s("update:selected-skills", [...i.selectedSkills, r]);
    }
    function S(r) {
      s("update:selected-skills", i.selectedSkills.filter((m) => m !== r));
    }
    function a() {
      d.value && s("send");
    }
    return (r, m) => (c(), p("form", {
      class: "cody-composer",
      "data-variant": e.variant,
      "data-cody-component": "composer-surface",
      onSubmit: le(a, ["prevent"])
    }, [
      f("div", Gt, [
        e.selectedSkills.length ? (c(), p("div", Qt, [
          (c(!0), p(M, null, I(e.selectedSkills, (h) => (c(), p("span", {
            key: h,
            class: "cody-composer-chip"
          }, [
            oe(" $" + C(n(e.skills, h)) + " ", 1),
            f("button", {
              type: "button",
              disabled: e.disabled,
              "aria-label": `移除 Skill ${n(e.skills, h)}`,
              onClick: (z) => S(h)
            }, "×", 8, Kt)
          ]))), 128))
        ])) : L("", !0),
        f("textarea", {
          value: e.draft,
          rows: "1",
          disabled: e.disabled,
          placeholder: e.placeholder,
          onInput: m[0] || (m[0] = (h) => s("update:draft", h.target.value)),
          onKeydown: he(le(a, ["exact", "prevent"]), ["enter"])
        }, null, 40, Xt),
        f("div", Yt, [
          K(r.$slots, "leading"),
          e.skills.length ? (c(), p("label", Zt, [
            m[9] || (m[9] = f("span", {
              class: "cody-composer-icon",
              "aria-hidden": "true"
            }, "✦", -1)),
            f("select", {
              value: "",
              disabled: e.disabled,
              "aria-label": "添加 Skill",
              onChange: m[1] || (m[1] = (h) => y(h.target.value))
            }, [
              m[8] || (m[8] = f("option", { value: "" }, "Skills", -1)),
              (c(!0), p(M, null, I(l.value, (h) => (c(), p("option", {
                key: h.value,
                value: h.value
              }, "$" + C(h.label), 9, eo))), 128))
            ], 40, Jt)
          ])) : L("", !0),
          e.collaborationModes.length ? (c(), re(E(o), {
            key: 1,
            label: "协作模式",
            "model-value": e.selectedCollaborationMode,
            options: e.collaborationModes,
            disabled: e.disabled || e.isRunning,
            "onUpdate:modelValue": m[2] || (m[2] = (h) => s("update:collaboration-mode", h))
          }, null, 8, ["model-value", "options", "disabled"])) : L("", !0),
          H(E(o), {
            label: "提交策略",
            "model-value": e.selectedSubmitMode,
            options: e.submitModes,
            disabled: e.disabled,
            "onUpdate:modelValue": m[3] || (m[3] = (h) => s("update:submit-mode", h))
          }, null, 8, ["model-value", "options", "disabled"]),
          e.models.length ? (c(), re(E(o), {
            key: 2,
            label: "模型",
            "model-value": e.selectedModel,
            options: e.models,
            disabled: e.disabled || e.isRunning,
            "onUpdate:modelValue": m[4] || (m[4] = (h) => s("update:model", h))
          }, null, 8, ["model-value", "options", "disabled"])) : L("", !0),
          H(E(o), {
            label: "推理强度",
            "model-value": e.selectedReasoning,
            options: e.reasoningOptions,
            disabled: e.disabled || e.isRunning,
            "onUpdate:modelValue": m[5] || (m[5] = (h) => s("update:reasoning", h))
          }, null, 8, ["model-value", "options", "disabled"]),
          H(E(o), {
            label: "权限",
            "model-value": e.selectedPermission,
            options: e.permissionOptions,
            disabled: e.disabled || e.isRunning,
            "onUpdate:modelValue": m[6] || (m[6] = (h) => s("update:permission", h))
          }, null, 8, ["model-value", "options", "disabled"]),
          K(r.$slots, "controls"),
          f("div", to, [
            e.isRunning ? (c(), p("button", {
              key: 0,
              class: "cody-composer-stop",
              type: "button",
              disabled: e.disabled,
              onClick: m[7] || (m[7] = (h) => s("stop"))
            }, "停止", 8, oo)) : L("", !0),
            f("button", {
              class: "cody-composer-send",
              type: "submit",
              disabled: !d.value,
              "aria-label": u.value
            }, "↑", 8, ao)
          ])
        ]),
        R.value ? (c(), p("p", io, C(R.value), 1)) : L("", !0)
      ])
    ], 40, Ht));
  }
});
export {
  mo as CodyComposer,
  po as CodyConversation,
  ge as CodyMarkdown,
  Ct as CodyRequestCard,
  Y as DEFAULT_CODY_MARKDOWN_LABELS,
  uo as conversationEntriesFromState,
  Ce as questionFieldsFromParams,
  me as renderCodyMarkdown,
  st as requestSummary,
  fe as stabilizeStreamingMarkdown
};
