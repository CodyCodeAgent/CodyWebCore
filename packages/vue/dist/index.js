import { defineComponent as H, computed as P, ref as V, watch as de, onMounted as ke, onBeforeUnmount as ve, openBlock as n, createElementBlock as l, Fragment as D, createElementVNode as c, nextTick as ye, reactive as be, toDisplayString as $, renderList as j, createCommentVNode as T, createTextVNode as Z, normalizeClass as he, withDirectives as $e, withKeys as we, vModelDynamic as Se, renderSlot as N, createVNode as U, unref as B, h as X, withModifiers as Ce, createBlock as oe, shallowRef as xe, getCurrentScope as Ae, onScopeDispose as qe } from "vue";
import { buildApprovalRiskSummary as Le, toolStatusTone as se, buildToolOutputPreview as Me, isToolOutputTruncated as Te, toolOutputToggleLabel as Re } from "@codycodeagent/cody-web-core/presentation";
import ce from "dompurify";
import De from "markdown-it";
import Oe from "markdown-it-footnote";
import _e from "markdown-it-task-lists";
import { conversationFeedFromState as ze, formatTurnDuration as Be, createConversationState as Y } from "@codycodeagent/cody-web-core/conversation";
import { composerHasContent as Pe } from "@codycodeagent/cody-web-core/composer";
import { createConversationController as je } from "@codycodeagent/cody-web-core/client";
const W = {
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
}, O = new De({ breaks: !0, html: !1, linkify: !0, typographer: !1 });
O.use(_e, { enabled: !1, label: !0, labelAfter: !0 });
O.use(Oe);
function z(e, a) {
  return `<button type="button" class="markdown-tool-button" data-markdown-action="${e}" aria-label="${a}" title="${a}">${a}</button>`;
}
function ue(e, a = "", s = W) {
  const i = a.toLowerCase();
  if (i === "mermaid" || i === "plantuml" || i === "puml") {
    const f = i === "mermaid" ? "mermaid" : "plantuml";
    return `<div class="markdown-diagram-shell" data-diagram-engine="${f}"><header class="markdown-diagram-toolbar"><span>${f}</span><span class="markdown-diagram-actions">${z("diagram-zoom-out", s.zoomOut)}${z("diagram-fit", s.fit)}${z("diagram-zoom-in", s.zoomIn)}${z("diagram-source", s.source)}${z("diagram-fullscreen", s.fullscreen)}${z("diagram-export-svg", "SVG")}${z("diagram-export-png", "PNG")}</span></header><div class="markdown-diagram-stage" role="img" aria-label="${s.diagramAria(f)}"><p class="markdown-diagram-status">${s.rendering(f)}</p></div><pre class="markdown-diagram-source" hidden><code>${O.utils.escapeHtml(e)}</code></pre></div>
`;
  }
  const t = e.replace(/\n$/u, "").split(`
`), d = t.length <= 2 && t.every((f) => f.length <= 96), v = t.length > 10, m = a || "text", p = [d ? "is-compact-code" : "", /^[A-Za-z0-9_-]+$/u.test(a) ? `language-${a}` : ""].filter(Boolean).join(" "), o = p ? ` class="${p}"` : "", x = [d ? "is-compact" : "", v ? "is-collapsible is-collapsed" : ""].filter(Boolean).join(" "), L = v ? `${m} · ${s.lineCount(t.length)}` : m, r = v ? `<button type="button" class="markdown-tool-button markdown-code-collapse" data-markdown-action="toggle-code" aria-label="${s.collapseCode}" title="${s.collapseCode}" aria-expanded="false">${s.collapseCode}</button>` : "", R = v ? `<div class="markdown-code-expand"><button type="button" data-markdown-action="toggle-code" aria-expanded="false">${s.expandCode(t.length)}</button></div>` : "";
  return `<div class="markdown-code-host"><div class="markdown-code-shell${x ? ` ${x}` : ""}" data-language="${m}" data-code-lines="${String(t.length)}"><header class="markdown-code-toolbar"><span>${L}</span><span class="markdown-code-actions">${r}${z("wrap-code", s.wrap)}${z("copy-code", s.copy)}${z("save-code", s.save)}</span></header><pre class="markdown-code-block${d ? " is-compact" : ""}"><code${o}>${O.utils.escapeHtml(e)}</code></pre>${R}</div></div>
`;
}
O.renderer.rules.fence = (e, a, s, i) => {
  const t = e[a];
  return ue(t.content, t.info.trim().split(/\s+/u)[0] ?? "", i.labels);
};
O.renderer.rules.code_block = (e, a, s, i) => ue(e[a].content, "", i.labels);
O.renderer.rules.table_open = (e, a, s, i) => {
  const t = i.labels ?? W;
  return `<section class="markdown-table-shell" role="region" aria-label="${t.dataTable}" tabindex="0"><header class="markdown-table-toolbar">${z("copy-table", t.copyCsv)}</header><div class="markdown-table-scroll"><table>
`;
};
O.renderer.rules.table_close = () => `</table></div></section>
`;
const ae = O.renderer.rules.code_inline;
O.renderer.rules.code_inline = (e, a, s, i, t) => {
  const d = e[a].content, v = d.match(/^(.+?\.[A-Za-z0-9_-]{1,12})(?::(\d+))?$/u);
  if (!v || /\s/u.test(d)) return ae ? ae(e, a, s, i, t) : t.renderToken(e, a, s);
  const m = O.utils.escapeHtml(v[1]), p = v[2] ?? "", o = i.labels ?? W;
  return `<button type="button" class="markdown-file-link" data-markdown-action="open-file" data-file-path="${m}" data-file-line="${p}" title="${o.openFile(m)}"><code>${O.utils.escapeHtml(d)}</code></button>`;
};
const ne = O.renderer.rules.link_open;
O.renderer.rules.link_open = (e, a, s, i, t) => {
  const d = e[a];
  return /^https?:\/\//u.test(d.attrGet("href") ?? "") && (d.attrSet("target", "_blank"), d.attrSet("rel", "noopener noreferrer")), ne ? ne(e, a, s, i, t) : t.renderToken(e, a, s);
};
function le(e, a = W) {
  return ce.sanitize(O.render(e, { labels: a }), {
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
const Ee = ["innerHTML"], Fe = ["src"], re = /* @__PURE__ */ H({
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
    const s = e, i = a, t = P(() => s.labels ?? W), d = V(null), v = V(null), m = V(le(ie(s.text), t.value)), p = V(""), o = /* @__PURE__ */ new Set();
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
    async function R(u) {
      window.clearTimeout(x), x = window.setTimeout(async () => {
        m.value = le(ie(u), t.value), await ye(), f();
      }, s.renderDelay);
    }
    async function f() {
      var S, k, g, C, b, E;
      for (const A of Array.from(((S = d.value) == null ? void 0 : S.querySelectorAll("td")) ?? []))
        /^-?[\d,.]+%?$/u.test(((k = A.textContent) == null ? void 0 : k.trim()) ?? "") && (A.dataset.numeric = "true");
      for (const A of Array.from(((g = d.value) == null ? void 0 : g.querySelectorAll("img")) ?? []))
        A.addEventListener("error", () => {
          A.alt = A.alt || "图片加载失败", A.classList.add("is-load-error");
        }, { once: !0 });
      w();
      for (const [A, q] of Array.from(((C = d.value) == null ? void 0 : C.querySelectorAll(".markdown-code-shell")) ?? []).entries()) {
        q.dataset.codeIndex = String(A), q.classList.contains("is-collapsible") && o.has(A) && q.classList.remove("is-collapsed");
        for (const M of Array.from(q.querySelectorAll('[data-markdown-action="toggle-code"]')))
          M.setAttribute("aria-expanded", String(!q.classList.contains("is-collapsed")));
        const _ = q.querySelector("pre"), F = q.querySelector('[data-markdown-action="wrap-code"]');
        _ && F && (F.hidden = _.scrollWidth <= _.clientWidth + 2, F.setAttribute("aria-pressed", String(q.classList.contains("is-wrapped"))));
      }
      await y();
      const u = Array.from(((b = d.value) == null ? void 0 : b.querySelectorAll('pre code[class*="language-"]')) ?? []);
      if (u.length === 0) return;
      const h = (await import("highlight.js/lib/core")).default;
      for (const A of u) {
        const q = ((E = Array.from(A.classList).find((M) => M.startsWith("language-"))) == null ? void 0 : E.slice(9)) ?? "", _ = r[q];
        if (!_ || A.dataset.highlighted === "yes") continue;
        const F = await _();
        h.getLanguage(q) || h.registerLanguage(q, F.default), A.innerHTML = h.highlight(A.textContent ?? "", { language: q }).value, A.dataset.highlighted = "yes";
      }
    }
    function w() {
      var h;
      if (!s.resolveAssetUrl) return;
      const u = /\.(?:svg|png|jpe?g|gif|webp)(?:[?#].*)?$/iu;
      for (const S of Array.from(((h = d.value) == null ? void 0 : h.querySelectorAll("a[href]")) ?? [])) {
        const k = S.getAttribute("href") ?? "";
        if (!u.test(k) || /^(?:data|blob):/iu.test(k)) continue;
        const g = s.resolveAssetUrl(k);
        g && (S.href = g, S.target = "_blank", S.rel = "noopener noreferrer");
      }
    }
    async function y() {
      var h, S, k, g;
      const u = Array.from(((h = d.value) == null ? void 0 : h.querySelectorAll(".markdown-diagram-shell:not([data-rendered])")) ?? []);
      for (const C of u) {
        C.dataset.rendered = "loading";
        const b = C.dataset.diagramEngine === "plantuml" ? "plantuml" : "mermaid", E = ((S = C.querySelector("code")) == null ? void 0 : S.textContent) ?? "", A = C.querySelector(".markdown-diagram-stage");
        if (A)
          try {
            let q = await ((k = s.renderDiagram) == null ? void 0 : k.call(s, { engine: b, source: E, dark: s.dark }));
            if (!q && b === "mermaid") {
              const { default: _ } = await import("mermaid");
              _.initialize({ startOnLoad: !1, securityLevel: "strict", theme: s.dark ? "dark" : "default", htmlLabels: !1, flowchart: { htmlLabels: !1, useMaxWidth: !1 } }), q = (await _.render(`cody-diagram-${String(++L)}`, E)).svg;
            }
            if (!q) throw new Error(b === "plantuml" ? "当前环境未配置 PlantUML 渲染器" : "图表渲染失败");
            A.innerHTML = G(q), pe(A), C.dataset.rendered = "yes", C.style.setProperty("--diagram-scale", "1");
          } catch (q) {
            A.textContent = q instanceof Error ? q.message : "图表渲染失败", A.classList.add("markdown-diagram-error"), (g = C.querySelector(".markdown-diagram-source")) == null || g.removeAttribute("hidden"), C.dataset.rendered = "error";
          }
      }
    }
    function G(u) {
      const h = ce.sanitize(u, { USE_PROFILES: { svg: !0, svgFilters: !0, html: !0 }, ADD_TAGS: ["foreignObject"], ADD_ATTR: ["xmlns"] }), S = h.trimStart().startsWith("<svg") ? h : `<svg xmlns="http://www.w3.org/2000/svg">${h}</svg>`, k = new DOMParser().parseFromString(S, "image/svg+xml");
      if (k.querySelector("parsererror")) return "";
      for (const g of k.querySelectorAll("*")) for (const C of Array.from(g.attributes)) /^on/iu.test(C.name) && g.removeAttribute(C.name);
      return k.querySelectorAll("script").forEach((g) => g.remove()), new XMLSerializer().serializeToString(k.documentElement);
    }
    function pe(u) {
      if (u.dataset.panReady === "true") return;
      u.dataset.panReady = "true";
      let h = 0, S = 0, k = 0, g = 0;
      u.addEventListener("pointerdown", (b) => {
        b.button === 0 && (h = b.clientX, S = b.clientY, k = u.scrollLeft, g = u.scrollTop, u.setPointerCapture(b.pointerId), u.classList.add("is-panning"));
      }), u.addEventListener("pointermove", (b) => {
        u.hasPointerCapture(b.pointerId) && (u.scrollLeft = k - (b.clientX - h), u.scrollTop = g - (b.clientY - S));
      });
      const C = (b) => {
        u.hasPointerCapture(b.pointerId) && u.releasePointerCapture(b.pointerId), u.classList.remove("is-panning");
      };
      u.addEventListener("pointerup", C), u.addEventListener("pointercancel", C);
    }
    function K(u, h = 0) {
      const S = Number(u.style.getPropertyValue("--diagram-scale") || "1");
      u.style.setProperty("--diagram-scale", String(h === 0 ? 1 : Math.min(2.5, Math.max(0.4, S + h))));
    }
    function J(u, h) {
      const S = document.createElement("a");
      S.href = URL.createObjectURL(u), S.download = h, S.click(), URL.revokeObjectURL(S.href);
    }
    async function ee(u, h) {
      const S = h.textContent;
      try {
        await navigator.clipboard.writeText(u), h.textContent = "已复制";
      } catch {
        const k = document.createElement("textarea");
        k.value = u, k.style.position = "fixed", k.style.opacity = "0", document.body.appendChild(k), k.select();
        const g = document.execCommand("copy");
        k.remove(), h.textContent = g ? "已复制" : "复制失败";
      }
      window.setTimeout(() => {
        h.textContent = S;
      }, 1200);
    }
    function ge(u) {
      return Array.from((u == null ? void 0 : u.rows) ?? []).map((h) => Array.from(h.cells).map((S) => {
        var k;
        return `"${((k = S.textContent) == null ? void 0 : k.trim().replace(/"/gu, '""')) ?? ""}"`;
      }).join(",")).join(`
`);
    }
    function fe(u) {
      var E, A, q, _, F;
      const h = u.target, S = h.closest("img");
      if (S) {
        p.value = S.currentSrc || S.src, (E = v.value) == null || E.showModal();
        return;
      }
      const k = h.closest("[data-markdown-action]");
      if (!k) return;
      const g = k.closest(".markdown-code-shell, .markdown-table-shell"), C = k.dataset.markdownAction;
      if (C === "copy-code" && ee(((A = g == null ? void 0 : g.querySelector("code")) == null ? void 0 : A.textContent) ?? "", k), C === "wrap-code") {
        const M = (g == null ? void 0 : g.classList.toggle("is-wrapped")) ?? !1;
        k.textContent = M && t.value.scroll || t.value.wrap, k.setAttribute("aria-pressed", String(M));
      }
      if (C === "save-code" && J(new Blob([((q = g == null ? void 0 : g.querySelector("code")) == null ? void 0 : q.textContent) ?? ""], { type: "text/plain" }), `snippet.${(g == null ? void 0 : g.dataset.language) || "txt"}`), C === "toggle-code" && (g != null && g.classList.contains("is-collapsible"))) {
        const M = Number(g.dataset.codeIndex ?? -1), I = !g.classList.toggle("is-collapsed");
        M >= 0 && (I ? o.add(M) : o.delete(M));
        for (const Q of Array.from(g.querySelectorAll('[data-markdown-action="toggle-code"]'))) Q.setAttribute("aria-expanded", String(I));
      }
      if (C === "copy-table" && ee(ge((g == null ? void 0 : g.querySelector("table")) ?? null), k), C === "open-file") {
        const M = k.dataset.filePath ?? "", I = ((_ = s.cwd) == null ? void 0 : _.replace(/\/$/u, "")) ?? "", Q = M.startsWith("/") && I && M.startsWith(`${I}/`) ? M.slice(I.length + 1) : M.replace(/^\.\//u, "");
        i("openFile", { path: Q, line: Number(k.dataset.fileLine || 0) || 1 });
      }
      const b = k.closest(".markdown-diagram-shell");
      if (b && C === "diagram-zoom-in" && K(b, 0.2), b && C === "diagram-zoom-out" && K(b, -0.2), b && C === "diagram-fit" && K(b), b && C === "diagram-source") {
        const M = b.querySelector(".markdown-diagram-source");
        M && (M.hidden = !M.hidden);
      }
      if (b && C === "diagram-fullscreen" && ((F = b.requestFullscreen) == null || F.call(b)), b && C === "diagram-export-svg") {
        const M = b.querySelector("svg");
        M && J(new Blob([new XMLSerializer().serializeToString(M)], { type: "image/svg+xml" }), "diagram.svg");
      }
    }
    function te() {
      var u;
      (u = v.value) == null || u.close();
    }
    return de(() => [s.text, s.labels], ([u]) => {
      R(u);
    }, { deep: !0 }), ke(() => {
      f();
    }), ve(() => window.clearTimeout(x)), (u, h) => (n(), l(D, null, [
      c("div", {
        ref_key: "rootRef",
        ref: d,
        class: "cody-markdown cody-markdown-renderer",
        innerHTML: m.value,
        onClick: fe
      }, null, 8, Ee),
      c("dialog", {
        ref_key: "imageDialogRef",
        ref: v,
        class: "cody-markdown-image-dialog",
        onClick: te
      }, [
        c("button", {
          type: "button",
          "aria-label": "关闭图片预览",
          onClick: te
        }, "×"),
        c("img", {
          src: p.value,
          alt: "Markdown 图片预览"
        }, null, 8, Fe)
      ], 512)
    ], 64));
  }
});
function me(e) {
  if (!e || typeof e != "object") return [];
  const a = e;
  return (Array.isArray(a.questions) ? a.questions : []).flatMap((i, t) => {
    if (!i || typeof i != "object") return [];
    const d = i, v = typeof d.question == "string" ? d.question.trim() : "";
    if (!v) return [];
    const m = Array.isArray(d.options) ? d.options : [];
    return [{
      id: typeof d.id == "string" && d.id.trim() ? d.id.trim() : `question-${String(t + 1)}`,
      header: typeof d.header == "string" ? d.header.trim() : "",
      question: v,
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
  return typeof s == "string" && s.trim() ? s : ((i = me(e)[0]) == null ? void 0 : i.question) ?? "Codex 请求执行一项受保护操作。";
}
function Qt(e) {
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
    const d = `file-group:${t.turnId ?? t.id}`, v = a.at(-1);
    if (!v || v.kind !== "tool" || v.id !== d) {
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
    const m = [.../* @__PURE__ */ new Set([...v.tool.details, ...t.tool.details])], p = [v.tool.output, t.tool.output].filter(Boolean).join(`

`);
    v.tool = {
      ...v.tool,
      status: /fail|error|cancel|reject/iu.test(`${v.tool.status} ${t.tool.status}`) ? "failed" : t.tool.status,
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
}, We = ["onClick"], Ge = { key: 0 }, Ke = ["onUpdate:modelValue", "type", "placeholder"], Qe = { class: "cody-request-actions" }, Xe = ["disabled"], Ye = { class: "cody-approval-risk-heading" }, Ze = ["data-level"], Je = { class: "cody-approval-risk-subject" }, et = {
  key: 0,
  class: "cody-approval-risk-labels"
}, tt = {
  key: 1,
  class: "cody-approval-risk-details"
}, ot = { class: "cody-approval-risk-recommendation" }, st = { key: 1 }, at = {
  key: 2,
  class: "cody-request-actions"
}, nt = /* @__PURE__ */ H({
  __name: "CodyRequestCard",
  props: {
    request: {}
  },
  emits: ["resolveApproval", "resolveQuestion"],
  setup(e, { emit: a }) {
    const s = e, i = a, t = be({}), d = P(() => me(s.request.params)), v = P(() => Ie(s.request.params)), m = P(() => s.request.kind === "approval" ? Le({ method: s.request.method, params: s.request.params }) : null), p = P(() => d.value.length > 0 && d.value.every((x) => {
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
        c("strong", null, $(e.request.kind === "approval" ? "需要你的确认" : "Codex 需要补充信息"), 1),
        L[2] || (L[2] = c("small", null, "Agent 已暂停等待", -1))
      ]),
      e.request.kind === "question" && d.value.length ? (n(), l(D, { key: 0 }, [
        (n(!0), l(D, null, j(d.value, (r) => (n(), l("fieldset", {
          key: r.id,
          class: "cody-question-field"
        }, [
          c("legend", null, [
            r.header ? (n(), l("span", Ne, $(r.header), 1)) : T("", !0),
            Z($(r.question), 1)
          ]),
          r.options.length ? (n(), l("div", He, [
            (n(!0), l(D, null, j(r.options, (R) => (n(), l("button", {
              key: R.label,
              type: "button",
              class: he({ selected: t[r.id] === R.label }),
              onClick: (f) => t[r.id] = R.label
            }, [
              c("strong", null, $(R.label), 1),
              R.description ? (n(), l("small", Ge, $(R.description), 1)) : T("", !0)
            ], 10, We))), 128))
          ])) : T("", !0),
          r.options.length === 0 || r.isOther ? $e((n(), l("input", {
            key: 1,
            "onUpdate:modelValue": (R) => t[r.id] = R,
            type: r.isSecret ? "password" : "text",
            placeholder: r.options.length ? "其他回答…" : "输入回答…",
            onKeyup: we(o, ["enter"])
          }, null, 40, Ke)), [
            [Se, t[r.id]]
          ]) : T("", !0)
        ]))), 128)),
        c("div", Qe, [
          c("button", {
            type: "button",
            disabled: !p.value,
            onClick: o
          }, "提交回答", 8, Xe)
        ])
      ], 64)) : (n(), l(D, { key: 1 }, [
        m.value ? (n(), l(D, { key: 0 }, [
          c("div", Ye, [
            c("div", null, [
              c("strong", null, $(m.value.title), 1),
              c("p", null, $(m.value.description), 1)
            ]),
            c("span", {
              class: "cody-approval-risk-level",
              "data-level": m.value.level
            }, $(m.value.level), 9, Ze)
          ]),
          c("code", Je, $(m.value.subject), 1),
          m.value.riskLabels.length ? (n(), l("ul", et, [
            (n(!0), l(D, null, j(m.value.riskLabels, (r) => (n(), l("li", { key: r }, $(r), 1))), 128))
          ])) : T("", !0),
          m.value.impacts.length ? (n(), l("details", tt, [
            L[3] || (L[3] = c("summary", null, "查看影响", -1)),
            c("ul", null, [
              (n(!0), l(D, null, j(m.value.impacts, (r) => (n(), l("li", { key: r }, $(r), 1))), 128))
            ])
          ])) : T("", !0),
          c("p", ot, $(m.value.recommendation), 1)
        ], 64)) : (n(), l("p", st, $(v.value), 1)),
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
}, kt = {
  key: 2,
  class: "cody-message-images"
}, vt = ["src"], yt = ["onClick"], bt = ["data-tone", "open"], ht = { key: 0 }, $t = ["onClick"], wt = {
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
}, At = ["data-tone"], Xt = /* @__PURE__ */ H({
  __name: "CodyConversation",
  props: {
    entries: {},
    loading: { type: Boolean },
    variant: { default: "standalone" }
  },
  emits: ["copy", "openFile", "resolveApproval", "resolveQuestion"],
  setup(e, { emit: a }) {
    const s = a, i = V({});
    function t(m) {
      i.value = {
        ...i.value,
        [m]: i.value[m] !== !0
      };
    }
    function d(m, p) {
      s("resolveApproval", m, p);
    }
    function v(m, p) {
      s("resolveQuestion", m, p);
    }
    return (m, p) => (n(), l("section", {
      class: "cody-conversation",
      "data-variant": e.variant,
      "data-cody-component": "conversation-surface"
    }, [
      e.loading ? (n(), l("div", it, "正在同步对话…")) : e.entries.length === 0 ? (n(), l("div", rt, [
        N(m.$slots, "empty", {}, () => [
          p[2] || (p[2] = Z("开始这个需求的开发", -1))
        ])
      ])) : (n(!0), l(D, { key: 2 }, j(e.entries, (o) => {
        var x, L;
        return n(), l(D, {
          key: o.id
        }, [
          o.kind === "worked" ? (n(), l("div", dt, [
            c("span", null, $(o.label), 1)
          ])) : o.kind === "message" ? (n(), l("article", {
            key: 1,
            class: "cody-message",
            "data-role": o.message.role
          }, [
            c("div", {
              class: "cody-message-identity",
              "data-role": o.message.role
            }, $(o.message.role === "user" ? "你" : "CW"), 9, ut),
            c("div", mt, [
              c("div", pt, $(o.message.role === "user" ? "你" : o.message.role === "assistant" ? "Codex Agent" : "系统"), 1),
              (x = o.message.skills) != null && x.length ? (n(), l("ul", gt, [
                (n(!0), l(D, null, j(o.message.skills, (r) => (n(), l("li", {
                  key: `${r.name}:${r.path}`
                }, "$" + $(r.displayName || r.name), 1))), 128))
              ])) : T("", !0),
              o.message.text ? (n(), l("div", ft, [
                N(m.$slots, "markdown", {
                  message: o.message
                }, () => [
                  U(re, {
                    text: o.message.text,
                    onOpenFile: p[0] || (p[0] = (r) => s("openFile", r))
                  }, null, 8, ["text"])
                ])
              ])) : T("", !0),
              (L = o.message.images) != null && L.length ? (n(), l("div", kt, [
                (n(!0), l(D, null, j(o.message.images, (r) => (n(), l("img", {
                  key: r,
                  src: r,
                  alt: "对话图片",
                  loading: "lazy"
                }, null, 8, vt))), 128))
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
            "data-tone": B(se)(o.tool.status),
            open: B(se)(o.tool.status) === "working"
          }, [
            c("summary", null, [
              p[3] || (p[3] = c("span", null, "⌁", -1)),
              c("strong", null, $(o.tool.title), 1),
              c("small", null, $(o.tool.status), 1)
            ]),
            c("p", null, $(o.tool.summary), 1),
            o.tool.details.length ? (n(), l("ul", ht, [
              (n(!0), l(D, null, j(o.tool.details, (r) => (n(), l("li", { key: r }, $(r), 1))), 128))
            ])) : T("", !0),
            o.tool.output ? (n(), l(D, { key: 1 }, [
              c("pre", null, $(i.value[o.id] ? o.tool.output : B(Me)(o.tool.output)), 1),
              B(Te)(o.tool.output) ? (n(), l("button", {
                key: 0,
                class: "cody-tool-output-toggle",
                type: "button",
                onClick: (r) => t(o.id)
              }, $(B(Re)(i.value[o.id] === !0)), 9, $t)) : T("", !0)
            ], 64)) : T("", !0)
          ], 8, bt)) : o.kind === "reasoning" ? (n(), l("details", wt, [
            c("summary", null, "✦ " + $(o.title || "推理过程"), 1),
            c("pre", null, $(o.text), 1)
          ])) : o.kind === "plan" ? (n(), l("details", St, [
            p[4] || (p[4] = c("summary", null, "计划", -1)),
            U(re, {
              text: o.text,
              onOpenFile: p[1] || (p[1] = (r) => s("openFile", r))
            }, null, 8, ["text"])
          ])) : o.kind === "request" ? N(m.$slots, "request", {
            request: o.request
          }, () => [
            U(nt, {
              request: o.request,
              onResolveApproval: d,
              onResolveQuestion: v
            }, null, 8, ["request"])
          ], void 0, 5) : o.kind === "failure" ? (n(), l("details", Ct, [
            p[5] || (p[5] = c("summary", null, "本次回复失败", -1)),
            c("p", null, $(o.text), 1)
          ])) : o.kind === "interrupted" ? (n(), l("article", xt, $(o.text), 1)) : o.kind === "activity" ? (n(), l("article", {
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
            c("strong", null, $(o.title), 1),
            c("small", null, $(o.detail), 1)
          ], 8, At)) : T("", !0)
        ], 64);
      }), 128))
    ], 8, lt));
  }
}), qt = ["data-variant"], Lt = { class: "cody-composer-shell" }, Mt = {
  key: 0,
  class: "cody-composer-selected",
  "aria-label": "Selected skills"
}, Tt = ["disabled", "aria-label", "onClick"], Rt = ["value", "disabled", "placeholder"], Dt = { class: "cody-composer-controls" }, Ot = {
  key: 0,
  class: "cody-composer-compact-control cody-composer-skill-control",
  title: "为本轮显式选择 Skill"
}, _t = ["disabled"], zt = ["value"], Bt = { class: "cody-composer-actions" }, Pt = ["disabled"], jt = ["disabled", "aria-label"], Et = {
  key: 1,
  class: "cody-composer-policy"
}, Yt = /* @__PURE__ */ H({
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
    const s = H({
      name: "CodyComposerSelect",
      props: { label: { type: String, required: !0 }, modelValue: { type: String, required: !0 }, options: { type: Array, required: !0 }, disabled: Boolean },
      emits: ["update:modelValue"],
      setup(f, { emit: w }) {
        return () => X("label", { class: "cody-composer-compact-control", title: f.label }, [
          X("select", { value: f.modelValue, disabled: f.disabled, "aria-label": f.label, onChange: (y) => w("update:modelValue", y.target.value) }, f.options.map((y) => X("option", { value: y.value }, y.label)))
        ]);
      }
    }), i = e, t = a, d = P(() => i.skills.filter((f) => !i.selectedSkills.includes(f.value))), v = P(() => {
      var f;
      return ((f = i.permissionOptions.find((w) => w.value === i.selectedPermission)) == null ? void 0 : f.description) ?? "";
    }), m = P(() => !i.disabled && Pe({ text: i.draft, skills: i.selectedSkills })), p = P(() => i.isRunning && i.selectedSubmitMode === "steer" ? "发送引导" : i.isRunning ? "加入队列" : "发送");
    function o(f, w) {
      var y;
      return ((y = f.find((G) => G.value === w)) == null ? void 0 : y.label) ?? w;
    }
    function x(f) {
      f && !i.selectedSkills.includes(f) && t("update:selected-skills", [...i.selectedSkills, f]);
    }
    function L(f) {
      t("update:selected-skills", i.selectedSkills.filter((w) => w !== f));
    }
    function r(f) {
      f.key !== "Enter" || f.isComposing || !f.ctrlKey && !f.metaKey || (f.preventDefault(), R());
    }
    function R() {
      m.value && t("send");
    }
    return (f, w) => (n(), l("form", {
      class: "cody-composer",
      "data-variant": e.variant,
      "data-cody-component": "composer-surface",
      onSubmit: Ce(R, ["prevent"])
    }, [
      c("div", Lt, [
        e.selectedSkills.length ? (n(), l("div", Mt, [
          (n(!0), l(D, null, j(e.selectedSkills, (y) => (n(), l("span", {
            key: y,
            class: "cody-composer-chip"
          }, [
            Z(" $" + $(o(e.skills, y)) + " ", 1),
            c("button", {
              type: "button",
              disabled: e.disabled,
              "aria-label": `移除 Skill ${o(e.skills, y)}`,
              onClick: (G) => L(y)
            }, "×", 8, Tt)
          ]))), 128))
        ])) : T("", !0),
        c("textarea", {
          value: e.draft,
          rows: "1",
          disabled: e.disabled,
          placeholder: e.placeholder,
          onInput: w[0] || (w[0] = (y) => t("update:draft", y.target.value)),
          onKeydown: r
        }, null, 40, Rt),
        c("div", Dt, [
          N(f.$slots, "leading"),
          e.skills.length ? (n(), l("label", Ot, [
            w[9] || (w[9] = c("span", {
              class: "cody-composer-icon",
              "aria-hidden": "true"
            }, "✦", -1)),
            c("select", {
              value: "",
              disabled: e.disabled,
              "aria-label": "添加 Skill",
              onChange: w[1] || (w[1] = (y) => x(y.target.value))
            }, [
              w[8] || (w[8] = c("option", { value: "" }, "Skills", -1)),
              (n(!0), l(D, null, j(d.value, (y) => (n(), l("option", {
                key: y.value,
                value: y.value
              }, "$" + $(y.label), 9, zt))), 128))
            ], 40, _t)
          ])) : T("", !0),
          e.collaborationModes.length ? (n(), oe(B(s), {
            key: 1,
            label: "协作模式",
            "model-value": e.selectedCollaborationMode,
            options: e.collaborationModes,
            disabled: e.disabled || e.isRunning,
            "onUpdate:modelValue": w[2] || (w[2] = (y) => t("update:collaboration-mode", y))
          }, null, 8, ["model-value", "options", "disabled"])) : T("", !0),
          U(B(s), {
            label: "提交策略",
            "model-value": e.selectedSubmitMode,
            options: e.submitModes,
            disabled: e.disabled,
            "onUpdate:modelValue": w[3] || (w[3] = (y) => t("update:submit-mode", y))
          }, null, 8, ["model-value", "options", "disabled"]),
          e.models.length ? (n(), oe(B(s), {
            key: 2,
            label: "模型",
            "model-value": e.selectedModel,
            options: e.models,
            disabled: e.disabled || e.isRunning,
            "onUpdate:modelValue": w[4] || (w[4] = (y) => t("update:model", y))
          }, null, 8, ["model-value", "options", "disabled"])) : T("", !0),
          U(B(s), {
            label: "推理强度",
            "model-value": e.selectedReasoning,
            options: e.reasoningOptions,
            disabled: e.disabled || e.isRunning,
            "onUpdate:modelValue": w[5] || (w[5] = (y) => t("update:reasoning", y))
          }, null, 8, ["model-value", "options", "disabled"]),
          U(B(s), {
            label: "权限",
            "model-value": e.selectedPermission,
            options: e.permissionOptions,
            disabled: e.disabled || e.isRunning,
            "onUpdate:modelValue": w[6] || (w[6] = (y) => t("update:permission", y))
          }, null, 8, ["model-value", "options", "disabled"]),
          N(f.$slots, "controls"),
          c("div", Bt, [
            e.isRunning ? (n(), l("button", {
              key: 0,
              class: "cody-composer-stop",
              type: "button",
              disabled: e.disabled,
              onClick: w[7] || (w[7] = (y) => t("stop"))
            }, "停止", 8, Pt)) : T("", !0),
            c("button", {
              class: "cody-composer-send",
              type: "submit",
              disabled: !m.value,
              "aria-label": p.value
            }, "↑", 8, jt)
          ])
        ]),
        v.value ? (n(), l("p", Et, $(v.value), 1)) : T("", !0)
      ])
    ], 40, qt));
  }
});
function Zt() {
  const e = xe(Y());
  let a = null, s = null, i = 0;
  const t = () => {
    i += 1, s == null || s(), s = null, a == null || a.dispose(), a = null;
  }, d = async (o, x) => {
    t(), e.value = Y(o);
    const L = i, r = je(o, x);
    a = r, s = r.subscribe((R) => {
      a === r && i === L && (e.value = R);
    }), await r.start();
  }, v = async () => {
    await (a == null ? void 0 : a.refresh());
  }, m = (o = "") => {
    t(), e.value = Y(o);
  }, p = () => {
    t();
  };
  return Ae() && qe(p), {
    state: P(() => e.value),
    connect: d,
    refresh: v,
    reset: m,
    dispose: p
  };
}
export {
  Yt as CodyComposer,
  Xt as CodyConversation,
  re as CodyMarkdown,
  nt as CodyRequestCard,
  W as DEFAULT_CODY_MARKDOWN_LABELS,
  Qt as conversationEntriesFromState,
  me as questionFieldsFromParams,
  le as renderCodyMarkdown,
  Ie as requestSummary,
  ie as stabilizeStreamingMarkdown,
  Zt as useConversationController
};
