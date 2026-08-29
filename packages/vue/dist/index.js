import { defineComponent as N, computed as B, ref as U, watch as de, onMounted as ye, onBeforeUnmount as be, openBlock as n, createElementBlock as l, Fragment as R, createElementVNode as c, nextTick as he, reactive as $e, toDisplayString as w, renderList as P, createCommentVNode as T, createTextVNode as Y, normalizeClass as we, withDirectives as Se, withKeys as ce, vModelDynamic as Ce, renderSlot as V, createVNode as I, unref as z, h as K, withModifiers as te, createBlock as oe, shallowRef as xe, getCurrentScope as Ae, onScopeDispose as qe } from "vue";
import { buildApprovalRiskSummary as Le, toolStatusTone as se, buildToolOutputPreview as Me, isToolOutputTruncated as Te, toolOutputToggleLabel as Re } from "@codycodeagent/cody-web-core/presentation";
import ue from "dompurify";
import De from "markdown-it";
import Oe from "markdown-it-footnote";
import _e from "markdown-it-task-lists";
import { conversationFeedFromState as ze, formatTurnDuration as Be, createConversationState as X } from "@codycodeagent/cody-web-core/conversation";
import { composerHasContent as Pe } from "@codycodeagent/cody-web-core/composer";
import { createConversationController as je } from "@codycodeagent/cody-web-core/client";
const H = {
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
}, D = new De({ breaks: !0, html: !1, linkify: !0, typographer: !1 });
D.use(_e, { enabled: !1, label: !0, labelAfter: !0 });
D.use(Oe);
function _(e, a) {
  return `<button type="button" class="markdown-tool-button" data-markdown-action="${e}" aria-label="${a}" title="${a}">${a}</button>`;
}
function me(e, a = "", s = H) {
  const i = a.toLowerCase();
  if (i === "mermaid" || i === "plantuml" || i === "puml") {
    const g = i === "mermaid" ? "mermaid" : "plantuml";
    return `<div class="markdown-diagram-shell" data-diagram-engine="${g}"><header class="markdown-diagram-toolbar"><span>${g}</span><span class="markdown-diagram-actions">${_("diagram-zoom-out", s.zoomOut)}${_("diagram-fit", s.fit)}${_("diagram-zoom-in", s.zoomIn)}${_("diagram-source", s.source)}${_("diagram-fullscreen", s.fullscreen)}${_("diagram-export-svg", "SVG")}${_("diagram-export-png", "PNG")}</span></header><div class="markdown-diagram-stage" role="img" aria-label="${s.diagramAria(g)}"><p class="markdown-diagram-status">${s.rendering(g)}</p></div><pre class="markdown-diagram-source" hidden><code>${D.utils.escapeHtml(e)}</code></pre></div>
`;
  }
  const t = e.replace(/\n$/u, "").split(`
`), d = t.length <= 2 && t.every((g) => g.length <= 96), y = t.length > 10, m = a || "text", p = [d ? "is-compact-code" : "", /^[A-Za-z0-9_-]+$/u.test(a) ? `language-${a}` : ""].filter(Boolean).join(" "), o = p ? ` class="${p}"` : "", x = [d ? "is-compact" : "", y ? "is-collapsible is-collapsed" : ""].filter(Boolean).join(" "), L = y ? `${m} · ${s.lineCount(t.length)}` : m, r = y ? `<button type="button" class="markdown-tool-button markdown-code-collapse" data-markdown-action="toggle-code" aria-label="${s.collapseCode}" title="${s.collapseCode}" aria-expanded="false">${s.collapseCode}</button>` : "", k = y ? `<div class="markdown-code-expand"><button type="button" data-markdown-action="toggle-code" aria-expanded="false">${s.expandCode(t.length)}</button></div>` : "";
  return `<div class="markdown-code-host"><div class="markdown-code-shell${x ? ` ${x}` : ""}" data-language="${m}" data-code-lines="${String(t.length)}"><header class="markdown-code-toolbar"><span>${L}</span><span class="markdown-code-actions">${r}${_("wrap-code", s.wrap)}${_("copy-code", s.copy)}${_("save-code", s.save)}</span></header><pre class="markdown-code-block${d ? " is-compact" : ""}"><code${o}>${D.utils.escapeHtml(e)}</code></pre>${k}</div></div>
`;
}
D.renderer.rules.fence = (e, a, s, i) => {
  const t = e[a];
  return me(t.content, t.info.trim().split(/\s+/u)[0] ?? "", i.labels);
};
D.renderer.rules.code_block = (e, a, s, i) => me(e[a].content, "", i.labels);
D.renderer.rules.table_open = (e, a, s, i) => {
  const t = i.labels ?? H;
  return `<section class="markdown-table-shell" role="region" aria-label="${t.dataTable}" tabindex="0"><header class="markdown-table-toolbar">${_("copy-table", t.copyCsv)}</header><div class="markdown-table-scroll"><table>
`;
};
D.renderer.rules.table_close = () => `</table></div></section>
`;
const ae = D.renderer.rules.code_inline;
D.renderer.rules.code_inline = (e, a, s, i, t) => {
  const d = e[a].content, y = d.match(/^(.+?\.[A-Za-z0-9_-]{1,12})(?::(\d+))?$/u);
  if (!y || /\s/u.test(d)) return ae ? ae(e, a, s, i, t) : t.renderToken(e, a, s);
  const m = D.utils.escapeHtml(y[1]), p = y[2] ?? "", o = i.labels ?? H;
  return `<button type="button" class="markdown-file-link" data-markdown-action="open-file" data-file-path="${m}" data-file-line="${p}" title="${o.openFile(m)}"><code>${D.utils.escapeHtml(d)}</code></button>`;
};
const ne = D.renderer.rules.link_open;
D.renderer.rules.link_open = (e, a, s, i, t) => {
  const d = e[a];
  return /^https?:\/\//u.test(d.attrGet("href") ?? "") && (d.attrSet("target", "_blank"), d.attrSet("rel", "noopener noreferrer")), ne ? ne(e, a, s, i, t) : t.renderToken(e, a, s);
};
function le(e, a = H) {
  return ue.sanitize(D.render(e, { labels: a }), {
    ADD_ATTR: ["target"],
    ADD_TAGS: ["table", "thead", "tbody", "tr", "th", "td", "h1", "h2", "h3", "h4", "h5", "h6"],
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed"]
  });
}
function ie(e) {
  var a;
  return (((a = e.match(/^\s*```/gmu)) == null ? void 0 : a.length) ?? 0) % 2 === 1 ? `${e}

\`\`\`` : e;
}
const Fe = ["innerHTML"], Ee = ["src"], re = /* @__PURE__ */ N({
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
  setup(e, { emit: a }) {
    const s = e, i = a, t = B(() => s.labels ?? H), d = U(null), y = U(null), m = U(le(ie(s.text), t.value)), p = U(""), o = /* @__PURE__ */ new Set();
    let x = 0, L = 0;
    const r = {
      javascript: () => import("highlight.js/lib/languages/javascript"),
      typescript: () => import("highlight.js/lib/languages/typescript"),
      python: () => import("highlight.js/lib/languages/python"),
      go: () => import("highlight.js/lib/languages/go"),
      rust: () => import("highlight.js/lib/languages/rust"),
      json: () => import("highlight.js/lib/languages/json"),
      bash: () => import("highlight.js/lib/languages/bash"),
      sql: () => import("highlight.js/lib/languages/sql")
    };
    async function k(u) {
      window.clearTimeout(x), x = window.setTimeout(async () => {
        m.value = le(ie(u), t.value), await he(), g();
      }, s.renderDelay);
    }
    async function g() {
      var S, v, f, C, h, j;
      for (const A of Array.from(((S = d.value) == null ? void 0 : S.querySelectorAll("td")) ?? []))
        /^-?[\d,.]+%?$/u.test(((v = A.textContent) == null ? void 0 : v.trim()) ?? "") && (A.dataset.numeric = "true");
      for (const A of Array.from(((f = d.value) == null ? void 0 : f.querySelectorAll("img")) ?? []))
        A.addEventListener("error", () => {
          A.alt = A.alt || "图片加载失败", A.classList.add("is-load-error");
        }, { once: !0 });
      b();
      for (const [A, q] of Array.from(((C = d.value) == null ? void 0 : C.querySelectorAll(".markdown-code-shell")) ?? []).entries()) {
        q.dataset.codeIndex = String(A), q.classList.contains("is-collapsible") && o.has(A) && q.classList.remove("is-collapsed");
        for (const M of Array.from(q.querySelectorAll('[data-markdown-action="toggle-code"]')))
          M.setAttribute("aria-expanded", String(!q.classList.contains("is-collapsed")));
        const O = q.querySelector("pre"), F = q.querySelector('[data-markdown-action="wrap-code"]');
        O && F && (F.hidden = O.scrollWidth <= O.clientWidth + 2, F.setAttribute("aria-pressed", String(q.classList.contains("is-wrapped"))));
      }
      await W();
      const u = Array.from(((h = d.value) == null ? void 0 : h.querySelectorAll('pre code[class*="language-"]')) ?? []);
      if (u.length === 0) return;
      const $ = (await import("highlight.js/lib/core")).default;
      for (const A of u) {
        const q = ((j = Array.from(A.classList).find((M) => M.startsWith("language-"))) == null ? void 0 : j.slice(9)) ?? "", O = r[q];
        if (!O || A.dataset.highlighted === "yes") continue;
        const F = await O();
        $.getLanguage(q) || $.registerLanguage(q, F.default), A.innerHTML = $.highlight(A.textContent ?? "", { language: q }).value, A.dataset.highlighted = "yes";
      }
    }
    function b() {
      var $;
      if (!s.resolveAssetUrl) return;
      const u = /\.(?:svg|png|jpe?g|gif|webp)(?:[?#].*)?$/iu;
      for (const S of Array.from((($ = d.value) == null ? void 0 : $.querySelectorAll("a[href]")) ?? [])) {
        const v = S.getAttribute("href") ?? "";
        if (!u.test(v) || /^(?:data|blob):/iu.test(v)) continue;
        const f = s.resolveAssetUrl(v);
        f && (S.href = f, S.target = "_blank", S.rel = "noopener noreferrer");
      }
    }
    async function W() {
      var $, S, v, f;
      const u = Array.from((($ = d.value) == null ? void 0 : $.querySelectorAll(".markdown-diagram-shell:not([data-rendered])")) ?? []);
      for (const C of u) {
        C.dataset.rendered = "loading";
        const h = C.dataset.diagramEngine === "plantuml" ? "plantuml" : "mermaid", j = ((S = C.querySelector("code")) == null ? void 0 : S.textContent) ?? "", A = C.querySelector(".markdown-diagram-stage");
        if (A)
          try {
            let q = await ((v = s.renderDiagram) == null ? void 0 : v.call(s, { engine: h, source: j, dark: s.dark }));
            if (!q && h === "mermaid") {
              const { default: O } = await import("mermaid");
              O.initialize({ startOnLoad: !1, securityLevel: "strict", theme: s.dark ? "dark" : "default", htmlLabels: !1, flowchart: { htmlLabels: !1, useMaxWidth: !1 } }), q = (await O.render(`cody-diagram-${String(++L)}`, j)).svg;
            }
            if (!q) throw new Error(h === "plantuml" ? "当前环境未配置 PlantUML 渲染器" : "图表渲染失败");
            A.innerHTML = ge(q), fe(A), C.dataset.rendered = "yes", C.style.setProperty("--diagram-scale", "1");
          } catch (q) {
            A.textContent = q instanceof Error ? q.message : "图表渲染失败", A.classList.add("markdown-diagram-error"), (f = C.querySelector(".markdown-diagram-source")) == null || f.removeAttribute("hidden"), C.dataset.rendered = "error";
          }
      }
    }
    function ge(u) {
      const $ = ue.sanitize(u, { USE_PROFILES: { svg: !0, svgFilters: !0, html: !0 }, ADD_TAGS: ["foreignObject"], ADD_ATTR: ["xmlns"] }), S = $.trimStart().startsWith("<svg") ? $ : `<svg xmlns="http://www.w3.org/2000/svg">${$}</svg>`, v = new DOMParser().parseFromString(S, "image/svg+xml");
      if (v.querySelector("parsererror")) return "";
      for (const f of v.querySelectorAll("*")) for (const C of Array.from(f.attributes)) /^on/iu.test(C.name) && f.removeAttribute(C.name);
      return v.querySelectorAll("script").forEach((f) => f.remove()), new XMLSerializer().serializeToString(v.documentElement);
    }
    function fe(u) {
      if (u.dataset.panReady === "true") return;
      u.dataset.panReady = "true";
      let $ = 0, S = 0, v = 0, f = 0;
      u.addEventListener("pointerdown", (h) => {
        h.button === 0 && ($ = h.clientX, S = h.clientY, v = u.scrollLeft, f = u.scrollTop, u.setPointerCapture(h.pointerId), u.classList.add("is-panning"));
      }), u.addEventListener("pointermove", (h) => {
        u.hasPointerCapture(h.pointerId) && (u.scrollLeft = v - (h.clientX - $), u.scrollTop = f - (h.clientY - S));
      });
      const C = (h) => {
        u.hasPointerCapture(h.pointerId) && u.releasePointerCapture(h.pointerId), u.classList.remove("is-panning");
      };
      u.addEventListener("pointerup", C), u.addEventListener("pointercancel", C);
    }
    function G(u, $ = 0) {
      const S = Number(u.style.getPropertyValue("--diagram-scale") || "1");
      u.style.setProperty("--diagram-scale", String($ === 0 ? 1 : Math.min(2.5, Math.max(0.4, S + $))));
    }
    function Z(u, $) {
      const S = document.createElement("a");
      S.href = URL.createObjectURL(u), S.download = $, S.click(), URL.revokeObjectURL(S.href);
    }
    async function J(u, $) {
      const S = $.textContent;
      try {
        await navigator.clipboard.writeText(u), $.textContent = "已复制";
      } catch {
        const v = document.createElement("textarea");
        v.value = u, v.style.position = "fixed", v.style.opacity = "0", document.body.appendChild(v), v.select();
        const f = document.execCommand("copy");
        v.remove(), $.textContent = f ? "已复制" : "复制失败";
      }
      window.setTimeout(() => {
        $.textContent = S;
      }, 1200);
    }
    function ve(u) {
      return Array.from((u == null ? void 0 : u.rows) ?? []).map(($) => Array.from($.cells).map((S) => {
        var v;
        return `"${((v = S.textContent) == null ? void 0 : v.trim().replace(/"/gu, '""')) ?? ""}"`;
      }).join(",")).join(`
`);
    }
    function ke(u) {
      var j, A, q, O, F;
      const $ = u.target, S = $.closest("img");
      if (S) {
        p.value = S.currentSrc || S.src, (j = y.value) == null || j.showModal();
        return;
      }
      const v = $.closest("[data-markdown-action]");
      if (!v) return;
      const f = v.closest(".markdown-code-shell, .markdown-table-shell"), C = v.dataset.markdownAction;
      if (C === "copy-code" && J(((A = f == null ? void 0 : f.querySelector("code")) == null ? void 0 : A.textContent) ?? "", v), C === "wrap-code") {
        const M = (f == null ? void 0 : f.classList.toggle("is-wrapped")) ?? !1;
        v.textContent = M && t.value.scroll || t.value.wrap, v.setAttribute("aria-pressed", String(M));
      }
      if (C === "save-code" && Z(new Blob([((q = f == null ? void 0 : f.querySelector("code")) == null ? void 0 : q.textContent) ?? ""], { type: "text/plain" }), `snippet.${(f == null ? void 0 : f.dataset.language) || "txt"}`), C === "toggle-code" && (f != null && f.classList.contains("is-collapsible"))) {
        const M = Number(f.dataset.codeIndex ?? -1), E = !f.classList.toggle("is-collapsed");
        M >= 0 && (E ? o.add(M) : o.delete(M));
        for (const Q of Array.from(f.querySelectorAll('[data-markdown-action="toggle-code"]'))) Q.setAttribute("aria-expanded", String(E));
      }
      if (C === "copy-table" && J(ve((f == null ? void 0 : f.querySelector("table")) ?? null), v), C === "open-file") {
        const M = v.dataset.filePath ?? "", E = ((O = s.cwd) == null ? void 0 : O.replace(/\/$/u, "")) ?? "", Q = M.startsWith("/") && E && M.startsWith(`${E}/`) ? M.slice(E.length + 1) : M.replace(/^\.\//u, "");
        i("openFile", { path: Q, line: Number(v.dataset.fileLine || 0) || 1 });
      }
      const h = v.closest(".markdown-diagram-shell");
      if (h && C === "diagram-zoom-in" && G(h, 0.2), h && C === "diagram-zoom-out" && G(h, -0.2), h && C === "diagram-fit" && G(h), h && C === "diagram-source") {
        const M = h.querySelector(".markdown-diagram-source");
        M && (M.hidden = !M.hidden);
      }
      if (h && C === "diagram-fullscreen" && ((F = h.requestFullscreen) == null || F.call(h)), h && C === "diagram-export-svg") {
        const M = h.querySelector("svg");
        M && Z(new Blob([new XMLSerializer().serializeToString(M)], { type: "image/svg+xml" }), "diagram.svg");
      }
    }
    function ee() {
      var u;
      (u = y.value) == null || u.close();
    }
    return de(() => [s.text, s.labels], ([u]) => {
      k(u);
    }, { deep: !0 }), ye(() => {
      g();
    }), be(() => window.clearTimeout(x)), (u, $) => (n(), l(R, null, [
      c("div", {
        ref_key: "rootRef",
        ref: d,
        class: "cody-markdown cody-markdown-renderer",
        innerHTML: m.value,
        onClick: ke
      }, null, 8, Fe),
      c("dialog", {
        ref_key: "imageDialogRef",
        ref: y,
        class: "cody-markdown-image-dialog",
        onClick: ee
      }, [
        c("button", {
          type: "button",
          "aria-label": "关闭图片预览",
          onClick: ee
        }, "×"),
        c("img", {
          src: p.value,
          alt: "Markdown 图片预览"
        }, null, 8, Ee)
      ], 512)
    ], 64));
  }
});
function pe(e) {
  if (!e || typeof e != "object") return [];
  const a = e;
  return (Array.isArray(a.questions) ? a.questions : []).flatMap((i, t) => {
    if (!i || typeof i != "object") return [];
    const d = i, y = typeof d.question == "string" ? d.question.trim() : "";
    if (!y) return [];
    const m = Array.isArray(d.options) ? d.options : [];
    return [{
      id: typeof d.id == "string" && d.id.trim() ? d.id.trim() : `question-${String(t + 1)}`,
      header: typeof d.header == "string" ? d.header.trim() : "",
      question: y,
      isOther: d.isOther === !0,
      isSecret: d.isSecret === !0,
      options: m.flatMap((p) => {
        if (!p || typeof p != "object") return [];
        const o = p, x = typeof o.label == "string" ? o.label.trim() : "";
        return x ? [{ label: x, description: typeof o.description == "string" ? o.description.trim() : "" }] : [];
      })
    }];
  });
}
function Ie(e) {
  var i;
  if (!e || typeof e != "object") return "Codex 请求执行一项受保护操作。";
  const a = e, s = a.reason ?? a.question ?? a.command;
  return typeof s == "string" && s.trim() ? s : ((i = pe(e)[0]) == null ? void 0 : i.question) ?? "Codex 请求执行一项受保护操作。";
}
function Kt(e) {
  var i;
  const a = [], s = (t) => {
    if (t.kind === "reasoning") {
      a.push({ id: t.id, kind: "reasoning", text: t.text });
      return;
    }
    if (!t.tool.summary && t.tool.details.length === 0 && !t.tool.output && t.tool.kind !== "fileChange") return;
    if (t.tool.kind !== "fileChange") {
      a.push({ id: t.id, kind: "tool", tool: t.tool });
      return;
    }
    const d = `file-group:${t.turnId ?? t.id}`, y = a.at(-1);
    if (!y || y.kind !== "tool" || y.id !== d) {
      const o = [...new Set(t.tool.details)], x = {
        id: d,
        kind: "tool",
        tool: {
          ...t.tool,
          title: o.length > 1 ? `文件变更 · ${String(o.length)} 个文件` : "文件变更",
          summary: o.length ? `${String(o.length)} 个文件已更新` : t.tool.summary,
          details: o
        }
      };
      a.push(x);
      return;
    }
    const m = [.../* @__PURE__ */ new Set([...y.tool.details, ...t.tool.details])], p = [y.tool.output, t.tool.output].filter(Boolean).join(`

`);
    y.tool = {
      ...y.tool,
      status: /fail|error|cancel|reject/iu.test(`${y.tool.status} ${t.tool.status}`) ? "failed" : t.tool.status,
      title: m.length > 1 ? `文件变更 · ${String(m.length)} 个文件` : "文件变更",
      summary: m.length ? `${String(m.length)} 个文件已更新` : t.tool.summary,
      details: m,
      ...p ? { output: p } : {}
    };
  };
  for (const t of ze(e))
    t.kind === "message" ? a.push({ id: t.id, kind: "message", message: t.message }) : t.kind === "timeline" ? s(t.entry) : t.kind === "plan" ? a.push({ id: t.id, kind: "plan", text: t.plan.text }) : t.kind === "request" ? a.push({ id: t.id, kind: "request", request: t.request }) : t.kind === "turn" && t.status === "failed" ? a.push({ id: t.id, kind: "failure", text: t.error }) : t.kind === "turn" && t.status === "interrupted" ? a.push({ id: t.id, kind: "interrupted", text: "本次回复已停止" }) : t.kind === "turn" && t.status === "completed" ? a.push({ id: t.id, kind: "worked", label: `Worked for ${Be(t.durationMs ?? 0)}` }) : t.kind === "activity" && a.push({
      id: t.id,
      kind: "activity",
      title: t.status === "waiting" ? ((i = e.pendingRequests.find((d) => !d.turnId || d.turnId === t.turnId)) == null ? void 0 : i.kind) === "approval" ? "等待你的审批" : "等待你的回答" : t.label,
      detail: t.status === "waiting" ? "处理后 Codex 会继续本次回复" : t.status === "retrying" ? e.connection.status === "disconnected" ? "连接已中断，等待恢复" : "正在恢复本次回复" : e.connection.status === "connected" ? "实时更新中" : "等待恢复连接",
      tone: t.status
    });
  return a;
}
const Ue = ["data-kind"], Ve = { class: "cody-request-heading" }, Ne = { key: 0 }, He = {
  key: 0,
  class: "cody-question-options"
}, We = ["onClick"], Ge = { key: 0 }, Qe = ["onUpdate:modelValue", "type", "placeholder"], Ke = { class: "cody-request-actions" }, Xe = ["disabled"], Ye = { class: "cody-approval-risk-heading" }, Ze = ["data-level"], Je = { class: "cody-approval-risk-subject" }, et = {
  key: 0,
  class: "cody-approval-risk-labels"
}, tt = {
  key: 1,
  class: "cody-approval-risk-details"
}, ot = { class: "cody-approval-risk-recommendation" }, st = { key: 1 }, at = {
  key: 2,
  class: "cody-request-actions"
}, nt = /* @__PURE__ */ N({
  __name: "CodyRequestCard",
  props: {
    request: {}
  },
  emits: ["resolveApproval", "resolveQuestion"],
  setup(e, { emit: a }) {
    const s = e, i = a, t = $e({}), d = B(() => pe(s.request.params)), y = B(() => Ie(s.request.params)), m = B(() => s.request.kind === "approval" ? Le({ method: s.request.method, params: s.request.params }) : null), p = B(() => d.value.length > 0 && d.value.every((x) => {
      var L;
      return !!((L = t[x.id]) != null && L.trim());
    }));
    de(() => s.request.id, () => {
      for (const x of Object.keys(t)) delete t[x];
    });
    function o() {
      p.value && i("resolveQuestion", s.request.id, Object.fromEntries(d.value.map((x) => [x.id, { answers: [t[x.id].trim()] }])));
    }
    return (x, L) => (n(), l("article", {
      class: "cody-request-card",
      "data-kind": e.request.kind
    }, [
      c("div", Ve, [
        c("strong", null, w(e.request.kind === "approval" ? "需要你的确认" : "Codex 需要补充信息"), 1),
        L[2] || (L[2] = c("small", null, "Agent 已暂停等待", -1))
      ]),
      e.request.kind === "question" && d.value.length ? (n(), l(R, { key: 0 }, [
        (n(!0), l(R, null, P(d.value, (r) => (n(), l("fieldset", {
          key: r.id,
          class: "cody-question-field"
        }, [
          c("legend", null, [
            r.header ? (n(), l("span", Ne, w(r.header), 1)) : T("", !0),
            Y(w(r.question), 1)
          ]),
          r.options.length ? (n(), l("div", He, [
            (n(!0), l(R, null, P(r.options, (k) => (n(), l("button", {
              key: k.label,
              type: "button",
              class: we({ selected: t[r.id] === k.label }),
              onClick: (g) => t[r.id] = k.label
            }, [
              c("strong", null, w(k.label), 1),
              k.description ? (n(), l("small", Ge, w(k.description), 1)) : T("", !0)
            ], 10, We))), 128))
          ])) : T("", !0),
          r.options.length === 0 || r.isOther ? Se((n(), l("input", {
            key: 1,
            "onUpdate:modelValue": (k) => t[r.id] = k,
            type: r.isSecret ? "password" : "text",
            placeholder: r.options.length ? "其他回答…" : "输入回答…",
            onKeyup: ce(o, ["enter"])
          }, null, 40, Qe)), [
            [Ce, t[r.id]]
          ]) : T("", !0)
        ]))), 128)),
        c("div", Ke, [
          c("button", {
            type: "button",
            disabled: !p.value,
            onClick: o
          }, "提交回答", 8, Xe)
        ])
      ], 64)) : (n(), l(R, { key: 1 }, [
        m.value ? (n(), l(R, { key: 0 }, [
          c("div", Ye, [
            c("div", null, [
              c("strong", null, w(m.value.title), 1),
              c("p", null, w(m.value.description), 1)
            ]),
            c("span", {
              class: "cody-approval-risk-level",
              "data-level": m.value.level
            }, w(m.value.level), 9, Ze)
          ]),
          c("code", Je, w(m.value.subject), 1),
          m.value.riskLabels.length ? (n(), l("ul", et, [
            (n(!0), l(R, null, P(m.value.riskLabels, (r) => (n(), l("li", { key: r }, w(r), 1))), 128))
          ])) : T("", !0),
          m.value.impacts.length ? (n(), l("details", tt, [
            L[3] || (L[3] = c("summary", null, "查看影响", -1)),
            c("ul", null, [
              (n(!0), l(R, null, P(m.value.impacts, (r) => (n(), l("li", { key: r }, w(r), 1))), 128))
            ])
          ])) : T("", !0),
          c("p", ot, w(m.value.recommendation), 1)
        ], 64)) : (n(), l("p", st, w(y.value), 1)),
        e.request.kind === "approval" ? (n(), l("div", at, [
          c("button", {
            type: "button",
            onClick: L[0] || (L[0] = (r) => i("resolveApproval", e.request.id, "accept"))
          }, "允许一次"),
          c("button", {
            type: "button",
            "data-tone": "danger",
            onClick: L[1] || (L[1] = (r) => i("resolveApproval", e.request.id, "decline"))
          }, "拒绝")
        ])) : T("", !0)
      ], 64))
    ], 8, Ue));
  }
}), lt = ["data-variant"], it = {
  key: 0,
  class: "cody-conversation-loading",
  role: "status"
}, rt = {
  key: 1,
  class: "cody-conversation-empty"
}, dt = {
  key: 0,
  class: "cody-worked-divider"
}, ct = ["data-role"], ut = ["data-role"], mt = { class: "cody-message-stack" }, pt = { class: "cody-message-label" }, gt = {
  key: 0,
  class: "cody-message-skills"
}, ft = {
  key: 1,
  class: "cody-message-body"
}, vt = {
  key: 2,
  class: "cody-message-images"
}, kt = ["src"], yt = ["onClick"], bt = ["data-tone", "open"], ht = { key: 0 }, $t = ["onClick"], wt = {
  key: 3,
  class: "cody-reasoning-card"
}, St = {
  key: 4,
  class: "cody-plan-card",
  open: ""
}, Ct = {
  key: 6,
  class: "cody-failure-card"
}, xt = {
  key: 7,
  class: "cody-interrupted-card",
  role: "status"
}, At = ["data-tone"], Xt = /* @__PURE__ */ N({
  __name: "CodyConversation",
  props: {
    entries: {},
    loading: { type: Boolean },
    variant: { default: "standalone" }
  },
  emits: ["copy", "openFile", "resolveApproval", "resolveQuestion"],
  setup(e, { emit: a }) {
    const s = a, i = U({});
    function t(m) {
      i.value = {
        ...i.value,
        [m]: i.value[m] !== !0
      };
    }
    function d(m, p) {
      s("resolveApproval", m, p);
    }
    function y(m, p) {
      s("resolveQuestion", m, p);
    }
    return (m, p) => (n(), l("section", {
      class: "cody-conversation",
      "data-variant": e.variant,
      "data-cody-component": "conversation-surface"
    }, [
      e.loading ? (n(), l("div", it, "正在同步对话…")) : e.entries.length === 0 ? (n(), l("div", rt, [
        V(m.$slots, "empty", {}, () => [
          p[2] || (p[2] = Y("开始这个需求的开发", -1))
        ])
      ])) : (n(!0), l(R, { key: 2 }, P(e.entries, (o) => {
        var x, L;
        return n(), l(R, {
          key: o.id
        }, [
          o.kind === "worked" ? (n(), l("div", dt, [
            c("span", null, w(o.label), 1)
          ])) : o.kind === "message" ? (n(), l("article", {
            key: 1,
            class: "cody-message",
            "data-role": o.message.role
          }, [
            c("div", {
              class: "cody-message-identity",
              "data-role": o.message.role
            }, w(o.message.role === "user" ? "你" : "CW"), 9, ut),
            c("div", mt, [
              c("div", pt, w(o.message.role === "user" ? "你" : o.message.role === "assistant" ? "Codex Agent" : "系统"), 1),
              (x = o.message.skills) != null && x.length ? (n(), l("ul", gt, [
                (n(!0), l(R, null, P(o.message.skills, (r) => (n(), l("li", {
                  key: `${r.name}:${r.path}`
                }, "$" + w(r.displayName || r.name), 1))), 128))
              ])) : T("", !0),
              o.message.text ? (n(), l("div", ft, [
                V(m.$slots, "markdown", {
                  message: o.message
                }, () => [
                  I(re, {
                    text: o.message.text,
                    onOpenFile: p[0] || (p[0] = (r) => s("openFile", r))
                  }, null, 8, ["text"])
                ])
              ])) : T("", !0),
              (L = o.message.images) != null && L.length ? (n(), l("div", vt, [
                (n(!0), l(R, null, P(o.message.images, (r) => (n(), l("img", {
                  key: r,
                  src: r,
                  alt: "对话图片",
                  loading: "lazy"
                }, null, 8, kt))), 128))
              ])) : T("", !0),
              o.message.text ? (n(), l("button", {
                key: 3,
                class: "cody-copy-button",
                type: "button",
                onClick: (r) => s("copy", o.message.text)
              }, "复制", 8, yt)) : T("", !0)
            ])
          ], 8, ct)) : o.kind === "tool" ? (n(), l("details", {
            key: 2,
            class: "cody-tool-card",
            "data-tone": z(se)(o.tool.status),
            open: z(se)(o.tool.status) === "working"
          }, [
            c("summary", null, [
              p[3] || (p[3] = c("span", null, "⌁", -1)),
              c("strong", null, w(o.tool.title), 1),
              c("small", null, w(o.tool.status), 1)
            ]),
            c("p", null, w(o.tool.summary), 1),
            o.tool.details.length ? (n(), l("ul", ht, [
              (n(!0), l(R, null, P(o.tool.details, (r) => (n(), l("li", { key: r }, w(r), 1))), 128))
            ])) : T("", !0),
            o.tool.output ? (n(), l(R, { key: 1 }, [
              c("pre", null, w(i.value[o.id] ? o.tool.output : z(Me)(o.tool.output)), 1),
              z(Te)(o.tool.output) ? (n(), l("button", {
                key: 0,
                class: "cody-tool-output-toggle",
                type: "button",
                onClick: (r) => t(o.id)
              }, w(z(Re)(i.value[o.id] === !0)), 9, $t)) : T("", !0)
            ], 64)) : T("", !0)
          ], 8, bt)) : o.kind === "reasoning" ? (n(), l("details", wt, [
            c("summary", null, "✦ " + w(o.title || "推理过程"), 1),
            c("pre", null, w(o.text), 1)
          ])) : o.kind === "plan" ? (n(), l("details", St, [
            p[4] || (p[4] = c("summary", null, "计划", -1)),
            I(re, {
              text: o.text,
              onOpenFile: p[1] || (p[1] = (r) => s("openFile", r))
            }, null, 8, ["text"])
          ])) : o.kind === "request" ? V(m.$slots, "request", {
            request: o.request
          }, () => [
            I(nt, {
              request: o.request,
              onResolveApproval: d,
              onResolveQuestion: y
            }, null, 8, ["request"])
          ], void 0, 5) : o.kind === "failure" ? (n(), l("details", Ct, [
            p[5] || (p[5] = c("summary", null, "本次回复失败", -1)),
            c("p", null, w(o.text), 1)
          ])) : o.kind === "interrupted" ? (n(), l("article", xt, w(o.text), 1)) : o.kind === "activity" ? (n(), l("article", {
            key: 8,
            class: "cody-conversation-activity",
            "data-tone": o.tone,
            role: "status",
            "aria-live": "polite"
          }, [
            p[6] || (p[6] = c("span", {
              class: "cody-activity-pulse",
              "aria-hidden": "true"
            }, null, -1)),
            c("strong", null, w(o.title), 1),
            c("small", null, w(o.detail), 1)
          ], 8, At)) : T("", !0)
        ], 64);
      }), 128))
    ], 8, lt));
  }
}), qt = ["data-variant"], Lt = { class: "cody-composer-shell" }, Mt = {
  key: 0,
  class: "cody-composer-selected",
  "aria-label": "Selected skills"
}, Tt = ["disabled", "aria-label", "onClick"], Rt = ["value", "disabled", "placeholder", "onKeydown"], Dt = { class: "cody-composer-controls" }, Ot = {
  key: 0,
  class: "cody-composer-compact-control cody-composer-skill-control",
  title: "为本轮显式选择 Skill"
}, _t = ["disabled"], zt = ["value"], Bt = { class: "cody-composer-actions" }, Pt = ["disabled"], jt = ["disabled", "aria-label"], Ft = {
  key: 1,
  class: "cody-composer-policy"
}, Yt = /* @__PURE__ */ N({
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
  setup(e, { emit: a }) {
    const s = N({
      name: "CodyComposerSelect",
      props: { label: { type: String, required: !0 }, modelValue: { type: String, required: !0 }, options: { type: Array, required: !0 }, disabled: Boolean },
      emits: ["update:modelValue"],
      setup(k, { emit: g }) {
        return () => K("label", { class: "cody-composer-compact-control", title: k.label }, [
          K("select", { value: k.modelValue, disabled: k.disabled, "aria-label": k.label, onChange: (b) => g("update:modelValue", b.target.value) }, k.options.map((b) => K("option", { value: b.value }, b.label)))
        ]);
      }
    }), i = e, t = a, d = B(() => i.skills.filter((k) => !i.selectedSkills.includes(k.value))), y = B(() => {
      var k;
      return ((k = i.permissionOptions.find((g) => g.value === i.selectedPermission)) == null ? void 0 : k.description) ?? "";
    }), m = B(() => !i.disabled && Pe({ text: i.draft, skills: i.selectedSkills })), p = B(() => i.isRunning && i.selectedSubmitMode === "steer" ? "发送引导" : i.isRunning ? "加入队列" : "发送");
    function o(k, g) {
      var b;
      return ((b = k.find((W) => W.value === g)) == null ? void 0 : b.label) ?? g;
    }
    function x(k) {
      k && !i.selectedSkills.includes(k) && t("update:selected-skills", [...i.selectedSkills, k]);
    }
    function L(k) {
      t("update:selected-skills", i.selectedSkills.filter((g) => g !== k));
    }
    function r() {
      m.value && t("send");
    }
    return (k, g) => (n(), l("form", {
      class: "cody-composer",
      "data-variant": e.variant,
      "data-cody-component": "composer-surface",
      onSubmit: te(r, ["prevent"])
    }, [
      c("div", Lt, [
        e.selectedSkills.length ? (n(), l("div", Mt, [
          (n(!0), l(R, null, P(e.selectedSkills, (b) => (n(), l("span", {
            key: b,
            class: "cody-composer-chip"
          }, [
            Y(" $" + w(o(e.skills, b)) + " ", 1),
            c("button", {
              type: "button",
              disabled: e.disabled,
              "aria-label": `移除 Skill ${o(e.skills, b)}`,
              onClick: (W) => L(b)
            }, "×", 8, Tt)
          ]))), 128))
        ])) : T("", !0),
        c("textarea", {
          value: e.draft,
          rows: "1",
          disabled: e.disabled,
          placeholder: e.placeholder,
          onInput: g[0] || (g[0] = (b) => t("update:draft", b.target.value)),
          onKeydown: ce(te(r, ["exact", "prevent"]), ["enter"])
        }, null, 40, Rt),
        c("div", Dt, [
          V(k.$slots, "leading"),
          e.skills.length ? (n(), l("label", Ot, [
            g[9] || (g[9] = c("span", {
              class: "cody-composer-icon",
              "aria-hidden": "true"
            }, "✦", -1)),
            c("select", {
              value: "",
              disabled: e.disabled,
              "aria-label": "添加 Skill",
              onChange: g[1] || (g[1] = (b) => x(b.target.value))
            }, [
              g[8] || (g[8] = c("option", { value: "" }, "Skills", -1)),
              (n(!0), l(R, null, P(d.value, (b) => (n(), l("option", {
                key: b.value,
                value: b.value
              }, "$" + w(b.label), 9, zt))), 128))
            ], 40, _t)
          ])) : T("", !0),
          e.collaborationModes.length ? (n(), oe(z(s), {
            key: 1,
            label: "协作模式",
            "model-value": e.selectedCollaborationMode,
            options: e.collaborationModes,
            disabled: e.disabled || e.isRunning,
            "onUpdate:modelValue": g[2] || (g[2] = (b) => t("update:collaboration-mode", b))
          }, null, 8, ["model-value", "options", "disabled"])) : T("", !0),
          I(z(s), {
            label: "提交策略",
            "model-value": e.selectedSubmitMode,
            options: e.submitModes,
            disabled: e.disabled,
            "onUpdate:modelValue": g[3] || (g[3] = (b) => t("update:submit-mode", b))
          }, null, 8, ["model-value", "options", "disabled"]),
          e.models.length ? (n(), oe(z(s), {
            key: 2,
            label: "模型",
            "model-value": e.selectedModel,
            options: e.models,
            disabled: e.disabled || e.isRunning,
            "onUpdate:modelValue": g[4] || (g[4] = (b) => t("update:model", b))
          }, null, 8, ["model-value", "options", "disabled"])) : T("", !0),
          I(z(s), {
            label: "推理强度",
            "model-value": e.selectedReasoning,
            options: e.reasoningOptions,
            disabled: e.disabled || e.isRunning,
            "onUpdate:modelValue": g[5] || (g[5] = (b) => t("update:reasoning", b))
          }, null, 8, ["model-value", "options", "disabled"]),
          I(z(s), {
            label: "权限",
            "model-value": e.selectedPermission,
            options: e.permissionOptions,
            disabled: e.disabled || e.isRunning,
            "onUpdate:modelValue": g[6] || (g[6] = (b) => t("update:permission", b))
          }, null, 8, ["model-value", "options", "disabled"]),
          V(k.$slots, "controls"),
          c("div", Bt, [
            e.isRunning ? (n(), l("button", {
              key: 0,
              class: "cody-composer-stop",
              type: "button",
              disabled: e.disabled,
              onClick: g[7] || (g[7] = (b) => t("stop"))
            }, "停止", 8, Pt)) : T("", !0),
            c("button", {
              class: "cody-composer-send",
              type: "submit",
              disabled: !m.value,
              "aria-label": p.value
            }, "↑", 8, jt)
          ])
        ]),
        y.value ? (n(), l("p", Ft, w(y.value), 1)) : T("", !0)
      ])
    ], 40, qt));
  }
});
function Zt() {
  const e = xe(X());
  let a = null, s = null, i = 0;
  const t = () => {
    i += 1, s == null || s(), s = null, a == null || a.dispose(), a = null;
  }, d = async (o, x) => {
    t(), e.value = X(o);
    const L = i, r = je(o, x);
    a = r, s = r.subscribe((k) => {
      a === r && i === L && (e.value = k);
    }), await r.start();
  }, y = async () => {
    await (a == null ? void 0 : a.refresh());
  }, m = (o = "") => {
    t(), e.value = X(o);
  }, p = () => {
    t();
  };
  return Ae() && qe(p), {
    state: B(() => e.value),
    connect: d,
    refresh: y,
    reset: m,
    dispose: p
  };
}
export {
  Yt as CodyComposer,
  Xt as CodyConversation,
  re as CodyMarkdown,
  nt as CodyRequestCard,
  H as DEFAULT_CODY_MARKDOWN_LABELS,
  Kt as conversationEntriesFromState,
  pe as questionFieldsFromParams,
  le as renderCodyMarkdown,
  Ie as requestSummary,
  ie as stabilizeStreamingMarkdown,
  Zt as useConversationController
};
