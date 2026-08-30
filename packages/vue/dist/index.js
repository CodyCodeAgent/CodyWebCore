import { defineComponent as K, computed as O, ref as E, watch as se, onMounted as be, onBeforeUnmount as he, openBlock as r, createElementBlock as d, Fragment as M, createElementVNode as p, nextTick as fe, reactive as $e, toDisplayString as $, renderList as z, createCommentVNode as q, createTextVNode as ne, normalizeClass as ge, withDirectives as we, withKeys as Se, vModelDynamic as Ce, renderSlot as H, createVNode as U, unref as I, h as oe, useId as xe, withModifiers as le, createBlock as ie, shallowRef as Ae, getCurrentScope as qe, onScopeDispose as Le } from "vue";
import { buildApprovalRiskSummary as Me, toolStatusTone as re, buildToolOutputPreview as Te, isToolOutputTruncated as De, toolOutputToggleLabel as Re } from "@codycodeagent/cody-web-core/presentation";
import ve from "dompurify";
import _e from "markdown-it";
import Oe from "markdown-it-footnote";
import Be from "markdown-it-task-lists";
import { conversationFeedFromState as Ie, formatTurnDuration as ze, createConversationState as ae } from "@codycodeagent/cody-web-core/conversation";
import { composerHasContent as Ee, removeComposerTrigger as Pe, findComposerTrigger as je } from "@codycodeagent/cody-web-core/composer";
import { createConversationController as Fe } from "@codycodeagent/cody-web-core/client";
const W = {
  zoomOut: "缩小",
  fit: "适应",
  zoomIn: "放大",
  source: "源码",
  fullscreen: "全屏",
  rendering: (t) => `正在渲染 ${t}…`,
  diagramAria: (t) => `${t} 技术图`,
  wrap: "换行",
  scroll: "滚动",
  copy: "复制",
  save: "保存",
  dataTable: "数据表格",
  copyCsv: "复制 CSV",
  openFile: (t) => `打开 ${t}`,
  lineCount: (t) => `${String(t)} 行`,
  expandCode: (t) => `展开全部 · 共 ${String(t)} 行`,
  collapseCode: "收起代码"
}, D = new _e({ breaks: !0, html: !1, linkify: !0, typographer: !1 });
D.use(Be, { enabled: !1, label: !0, labelAfter: !0 });
D.use(Oe);
function B(t, i) {
  return `<button type="button" class="markdown-tool-button" data-markdown-action="${t}" aria-label="${i}" title="${i}">${i}</button>`;
}
function ye(t, i = "", l = W) {
  const c = i.toLowerCase();
  if (c === "mermaid" || c === "plantuml" || c === "puml") {
    const R = c === "mermaid" ? "mermaid" : "plantuml";
    return `<div class="markdown-diagram-shell" data-diagram-engine="${R}"><header class="markdown-diagram-toolbar"><span>${R}</span><span class="markdown-diagram-actions">${B("diagram-zoom-out", l.zoomOut)}${B("diagram-fit", l.fit)}${B("diagram-zoom-in", l.zoomIn)}${B("diagram-source", l.source)}${B("diagram-fullscreen", l.fullscreen)}${B("diagram-export-svg", "SVG")}${B("diagram-export-png", "PNG")}</span></header><div class="markdown-diagram-stage" role="img" aria-label="${l.diagramAria(R)}"><p class="markdown-diagram-status">${l.rendering(R)}</p></div><pre class="markdown-diagram-source" hidden><code>${D.utils.escapeHtml(t)}</code></pre></div>
`;
  }
  const e = t.replace(/\n$/u, "").split(`
`), m = e.length <= 2 && e.every((R) => R.length <= 96), b = e.length > 10, f = i || "text", v = [m ? "is-compact-code" : "", /^[A-Za-z0-9_-]+$/u.test(i) ? `language-${i}` : ""].filter(Boolean).join(" "), s = v ? ` class="${v}"` : "", S = [m ? "is-compact" : "", b ? "is-collapsible is-collapsed" : ""].filter(Boolean).join(" "), w = b ? `${f} · ${l.lineCount(e.length)}` : f, u = b ? `<button type="button" class="markdown-tool-button markdown-code-collapse" data-markdown-action="toggle-code" aria-label="${l.collapseCode}" title="${l.collapseCode}" aria-expanded="false">${l.collapseCode}</button>` : "", L = b ? `<div class="markdown-code-expand"><button type="button" data-markdown-action="toggle-code" aria-expanded="false">${l.expandCode(e.length)}</button></div>` : "";
  return `<div class="markdown-code-host"><div class="markdown-code-shell${S ? ` ${S}` : ""}" data-language="${f}" data-code-lines="${String(e.length)}"><header class="markdown-code-toolbar"><span>${w}</span><span class="markdown-code-actions">${u}${B("wrap-code", l.wrap)}${B("copy-code", l.copy)}${B("save-code", l.save)}</span></header><pre class="markdown-code-block${m ? " is-compact" : ""}"><code${s}>${D.utils.escapeHtml(t)}</code></pre>${L}</div></div>
`;
}
D.renderer.rules.fence = (t, i, l, c) => {
  const e = t[i];
  return ye(e.content, e.info.trim().split(/\s+/u)[0] ?? "", c.labels);
};
D.renderer.rules.code_block = (t, i, l, c) => ye(t[i].content, "", c.labels);
D.renderer.rules.table_open = (t, i, l, c) => {
  const e = c.labels ?? W;
  return `<section class="markdown-table-shell" role="region" aria-label="${e.dataTable}" tabindex="0"><header class="markdown-table-toolbar">${B("copy-table", e.copyCsv)}</header><div class="markdown-table-scroll"><table>
`;
};
D.renderer.rules.table_close = () => `</table></div></section>
`;
const de = D.renderer.rules.code_inline;
D.renderer.rules.code_inline = (t, i, l, c, e) => {
  const m = t[i].content, b = m.match(/^(.+?\.[A-Za-z0-9_-]{1,12})(?::(\d+))?$/u);
  if (!b || /\s/u.test(m)) return de ? de(t, i, l, c, e) : e.renderToken(t, i, l);
  const f = D.utils.escapeHtml(b[1]), v = b[2] ?? "", s = c.labels ?? W;
  return `<button type="button" class="markdown-file-link" data-markdown-action="open-file" data-file-path="${f}" data-file-line="${v}" title="${s.openFile(f)}"><code>${D.utils.escapeHtml(m)}</code></button>`;
};
const ce = D.renderer.rules.link_open;
D.renderer.rules.link_open = (t, i, l, c, e) => {
  const m = t[i];
  return /^https?:\/\//u.test(m.attrGet("href") ?? "") && (m.attrSet("target", "_blank"), m.attrSet("rel", "noopener noreferrer")), ce ? ce(t, i, l, c, e) : e.renderToken(t, i, l);
};
function ue(t, i = W) {
  return ve.sanitize(D.render(t, { labels: i }), {
    ADD_ATTR: ["target"],
    ADD_TAGS: ["table", "thead", "tbody", "tr", "th", "td", "h1", "h2", "h3", "h4", "h5", "h6"],
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed"]
  });
}
function me(t) {
  var i;
  return (((i = t.match(/^\s*```/gmu)) == null ? void 0 : i.length) ?? 0) % 2 === 1 ? `${t}

\`\`\`` : t;
}
const Ue = ["innerHTML"], Ve = ["src"], pe = /* @__PURE__ */ K({
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
  setup(t, { emit: i }) {
    const l = t, c = i, e = O(() => l.labels ?? W), m = E(null), b = E(null), f = E(ue(me(l.text), e.value)), v = E(""), s = /* @__PURE__ */ new Set();
    let S = 0, w = 0;
    const u = {
      javascript: () => import("highlight.js/lib/languages/javascript"),
      typescript: () => import("highlight.js/lib/languages/typescript"),
      python: () => import("highlight.js/lib/languages/python"),
      go: () => import("highlight.js/lib/languages/go"),
      rust: () => import("highlight.js/lib/languages/rust"),
      json: () => import("highlight.js/lib/languages/json"),
      bash: () => import("highlight.js/lib/languages/bash"),
      sql: () => import("highlight.js/lib/languages/sql")
    };
    async function L(g) {
      window.clearTimeout(S), S = window.setTimeout(async () => {
        f.value = ue(me(g), e.value), await fe(), R();
      }, l.renderDelay);
    }
    async function R() {
      var a, o, n, y, k, T;
      for (const C of Array.from(((a = m.value) == null ? void 0 : a.querySelectorAll("td")) ?? []))
        /^-?[\d,.]+%?$/u.test(((o = C.textContent) == null ? void 0 : o.trim()) ?? "") && (C.dataset.numeric = "true");
      for (const C of Array.from(((n = m.value) == null ? void 0 : n.querySelectorAll("img")) ?? []))
        C.addEventListener("error", () => {
          C.alt = C.alt || "图片加载失败", C.classList.add("is-load-error");
        }, { once: !0 });
      G();
      for (const [C, x] of Array.from(((y = m.value) == null ? void 0 : y.querySelectorAll(".markdown-code-shell")) ?? []).entries()) {
        x.dataset.codeIndex = String(C), x.classList.contains("is-collapsible") && s.has(C) && x.classList.remove("is-collapsed");
        for (const A of Array.from(x.querySelectorAll('[data-markdown-action="toggle-code"]')))
          A.setAttribute("aria-expanded", String(!x.classList.contains("is-collapsed")));
        const _ = x.querySelector("pre"), P = x.querySelector('[data-markdown-action="wrap-code"]');
        _ && P && (P.hidden = _.scrollWidth <= _.clientWidth + 2, P.setAttribute("aria-pressed", String(x.classList.contains("is-wrapped"))));
      }
      await Q();
      const g = Array.from(((k = m.value) == null ? void 0 : k.querySelectorAll('pre code[class*="language-"]')) ?? []);
      if (g.length === 0) return;
      const h = (await import("highlight.js/lib/core")).default;
      for (const C of g) {
        const x = ((T = Array.from(C.classList).find((A) => A.startsWith("language-"))) == null ? void 0 : T.slice(9)) ?? "", _ = u[x];
        if (!_ || C.dataset.highlighted === "yes") continue;
        const P = await _();
        h.getLanguage(x) || h.registerLanguage(x, P.default), C.innerHTML = h.highlight(C.textContent ?? "", { language: x }).value, C.dataset.highlighted = "yes";
      }
    }
    function G() {
      var h;
      if (!l.resolveAssetUrl) return;
      const g = /\.(?:svg|png|jpe?g|gif|webp)(?:[?#].*)?$/iu;
      for (const a of Array.from(((h = m.value) == null ? void 0 : h.querySelectorAll("a[href]")) ?? [])) {
        const o = a.getAttribute("href") ?? "";
        if (!g.test(o) || /^(?:data|blob):/iu.test(o)) continue;
        const n = l.resolveAssetUrl(o);
        n && (a.href = n, a.target = "_blank", a.rel = "noopener noreferrer");
      }
    }
    async function Q() {
      var h, a, o, n;
      const g = Array.from(((h = m.value) == null ? void 0 : h.querySelectorAll(".markdown-diagram-shell:not([data-rendered])")) ?? []);
      for (const y of g) {
        y.dataset.rendered = "loading";
        const k = y.dataset.diagramEngine === "plantuml" ? "plantuml" : "mermaid", T = ((a = y.querySelector("code")) == null ? void 0 : a.textContent) ?? "", C = y.querySelector(".markdown-diagram-stage");
        if (C)
          try {
            let x = await ((o = l.renderDiagram) == null ? void 0 : o.call(l, { engine: k, source: T, dark: l.dark }));
            if (!x && k === "mermaid") {
              const { default: _ } = await import("mermaid");
              _.initialize({ startOnLoad: !1, securityLevel: "strict", theme: l.dark ? "dark" : "default", htmlLabels: !1, flowchart: { htmlLabels: !1, useMaxWidth: !1 } }), x = (await _.render(`cody-diagram-${String(++w)}`, T)).svg;
            }
            if (!x) throw new Error(k === "plantuml" ? "当前环境未配置 PlantUML 渲染器" : "图表渲染失败");
            C.innerHTML = X(x), J(C), y.dataset.rendered = "yes", y.style.setProperty("--diagram-scale", "1");
          } catch (x) {
            C.textContent = x instanceof Error ? x.message : "图表渲染失败", C.classList.add("markdown-diagram-error"), (n = y.querySelector(".markdown-diagram-source")) == null || n.removeAttribute("hidden"), y.dataset.rendered = "error";
          }
      }
    }
    function X(g) {
      const h = ve.sanitize(g, { USE_PROFILES: { svg: !0, svgFilters: !0, html: !0 }, ADD_TAGS: ["foreignObject"], ADD_ATTR: ["xmlns"] }), a = h.trimStart().startsWith("<svg") ? h : `<svg xmlns="http://www.w3.org/2000/svg">${h}</svg>`, o = new DOMParser().parseFromString(a, "image/svg+xml");
      if (o.querySelector("parsererror")) return "";
      for (const n of o.querySelectorAll("*")) for (const y of Array.from(n.attributes)) /^on/iu.test(y.name) && n.removeAttribute(y.name);
      return o.querySelectorAll("script").forEach((n) => n.remove()), new XMLSerializer().serializeToString(o.documentElement);
    }
    function J(g) {
      if (g.dataset.panReady === "true") return;
      g.dataset.panReady = "true";
      let h = 0, a = 0, o = 0, n = 0;
      g.addEventListener("pointerdown", (k) => {
        k.button === 0 && (h = k.clientX, a = k.clientY, o = g.scrollLeft, n = g.scrollTop, g.setPointerCapture(k.pointerId), g.classList.add("is-panning"));
      }), g.addEventListener("pointermove", (k) => {
        g.hasPointerCapture(k.pointerId) && (g.scrollLeft = o - (k.clientX - h), g.scrollTop = n - (k.clientY - a));
      });
      const y = (k) => {
        g.hasPointerCapture(k.pointerId) && g.releasePointerCapture(k.pointerId), g.classList.remove("is-panning");
      };
      g.addEventListener("pointerup", y), g.addEventListener("pointercancel", y);
    }
    function j(g, h = 0) {
      const a = Number(g.style.getPropertyValue("--diagram-scale") || "1");
      g.style.setProperty("--diagram-scale", String(h === 0 ? 1 : Math.min(2.5, Math.max(0.4, a + h))));
    }
    function V(g, h) {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(g), a.download = h, a.click(), URL.revokeObjectURL(a.href);
    }
    async function Y(g, h) {
      const a = h.textContent;
      try {
        await navigator.clipboard.writeText(g), h.textContent = "已复制";
      } catch {
        const o = document.createElement("textarea");
        o.value = g, o.style.position = "fixed", o.style.opacity = "0", document.body.appendChild(o), o.select();
        const n = document.execCommand("copy");
        o.remove(), h.textContent = n ? "已复制" : "复制失败";
      }
      window.setTimeout(() => {
        h.textContent = a;
      }, 1200);
    }
    function Z(g) {
      return Array.from((g == null ? void 0 : g.rows) ?? []).map((h) => Array.from(h.cells).map((a) => {
        var o;
        return `"${((o = a.textContent) == null ? void 0 : o.trim().replace(/"/gu, '""')) ?? ""}"`;
      }).join(",")).join(`
`);
    }
    function ee(g) {
      var T, C, x, _, P;
      const h = g.target, a = h.closest("img");
      if (a) {
        v.value = a.currentSrc || a.src, (T = b.value) == null || T.showModal();
        return;
      }
      const o = h.closest("[data-markdown-action]");
      if (!o) return;
      const n = o.closest(".markdown-code-shell, .markdown-table-shell"), y = o.dataset.markdownAction;
      if (y === "copy-code" && Y(((C = n == null ? void 0 : n.querySelector("code")) == null ? void 0 : C.textContent) ?? "", o), y === "wrap-code") {
        const A = (n == null ? void 0 : n.classList.toggle("is-wrapped")) ?? !1;
        o.textContent = A && e.value.scroll || e.value.wrap, o.setAttribute("aria-pressed", String(A));
      }
      if (y === "save-code" && V(new Blob([((x = n == null ? void 0 : n.querySelector("code")) == null ? void 0 : x.textContent) ?? ""], { type: "text/plain" }), `snippet.${(n == null ? void 0 : n.dataset.language) || "txt"}`), y === "toggle-code" && (n != null && n.classList.contains("is-collapsible"))) {
        const A = Number(n.dataset.codeIndex ?? -1), F = !n.classList.toggle("is-collapsed");
        A >= 0 && (F ? s.add(A) : s.delete(A));
        for (const te of Array.from(n.querySelectorAll('[data-markdown-action="toggle-code"]'))) te.setAttribute("aria-expanded", String(F));
      }
      if (y === "copy-table" && Y(Z((n == null ? void 0 : n.querySelector("table")) ?? null), o), y === "open-file") {
        const A = o.dataset.filePath ?? "", F = ((_ = l.cwd) == null ? void 0 : _.replace(/\/$/u, "")) ?? "", te = A.startsWith("/") && F && A.startsWith(`${F}/`) ? A.slice(F.length + 1) : A.replace(/^\.\//u, "");
        c("openFile", { path: te, line: Number(o.dataset.fileLine || 0) || 1 });
      }
      const k = o.closest(".markdown-diagram-shell");
      if (k && y === "diagram-zoom-in" && j(k, 0.2), k && y === "diagram-zoom-out" && j(k, -0.2), k && y === "diagram-fit" && j(k), k && y === "diagram-source") {
        const A = k.querySelector(".markdown-diagram-source");
        A && (A.hidden = !A.hidden);
      }
      if (k && y === "diagram-fullscreen" && ((P = k.requestFullscreen) == null || P.call(k)), k && y === "diagram-export-svg") {
        const A = k.querySelector("svg");
        A && V(new Blob([new XMLSerializer().serializeToString(A)], { type: "image/svg+xml" }), "diagram.svg");
      }
    }
    function N() {
      var g;
      (g = b.value) == null || g.close();
    }
    return se(() => [l.text, l.labels], ([g]) => {
      L(g);
    }, { deep: !0 }), be(() => {
      R();
    }), he(() => window.clearTimeout(S)), (g, h) => (r(), d(M, null, [
      p("div", {
        ref_key: "rootRef",
        ref: m,
        class: "cody-markdown cody-markdown-renderer",
        innerHTML: f.value,
        onClick: ee
      }, null, 8, Ue),
      p("dialog", {
        ref_key: "imageDialogRef",
        ref: b,
        class: "cody-markdown-image-dialog",
        onClick: N
      }, [
        p("button", {
          type: "button",
          "aria-label": "关闭图片预览",
          onClick: N
        }, "×"),
        p("img", {
          src: v.value,
          alt: "Markdown 图片预览"
        }, null, 8, Ve)
      ], 512)
    ], 64));
  }
});
function ke(t) {
  if (!t || typeof t != "object") return [];
  const i = t;
  return (Array.isArray(i.questions) ? i.questions : []).flatMap((c, e) => {
    if (!c || typeof c != "object") return [];
    const m = c, b = typeof m.question == "string" ? m.question.trim() : "";
    if (!b) return [];
    const f = Array.isArray(m.options) ? m.options : [];
    return [{
      id: typeof m.id == "string" && m.id.trim() ? m.id.trim() : `question-${String(e + 1)}`,
      header: typeof m.header == "string" ? m.header.trim() : "",
      question: b,
      isOther: m.isOther === !0,
      isSecret: m.isSecret === !0,
      options: f.flatMap((v) => {
        if (!v || typeof v != "object") return [];
        const s = v, S = typeof s.label == "string" ? s.label.trim() : "";
        return S ? [{ label: S, description: typeof s.description == "string" ? s.description.trim() : "" }] : [];
      })
    }];
  });
}
function Ne(t) {
  var c;
  if (!t || typeof t != "object") return "Codex 请求执行一项受保护操作。";
  const i = t, l = i.reason ?? i.question ?? i.command;
  return typeof l == "string" && l.trim() ? l : ((c = ke(t)[0]) == null ? void 0 : c.question) ?? "Codex 请求执行一项受保护操作。";
}
function eo(t) {
  var c;
  const i = [], l = (e) => {
    if (e.kind === "reasoning") {
      i.push({ id: e.id, kind: "reasoning", text: e.text });
      return;
    }
    if (!e.tool.summary && e.tool.details.length === 0 && !e.tool.output && e.tool.kind !== "fileChange") return;
    if (e.tool.kind !== "fileChange") {
      i.push({ id: e.id, kind: "tool", tool: e.tool });
      return;
    }
    const m = `file-group:${e.turnId ?? e.id}`, b = i.at(-1);
    if (!b || b.kind !== "tool" || b.id !== m) {
      const s = [...new Set(e.tool.details)], S = {
        id: m,
        kind: "tool",
        tool: {
          ...e.tool,
          title: s.length > 1 ? `文件变更 · ${String(s.length)} 个文件` : "文件变更",
          summary: s.length ? `${String(s.length)} 个文件已更新` : e.tool.summary,
          details: s
        }
      };
      i.push(S);
      return;
    }
    const f = [.../* @__PURE__ */ new Set([...b.tool.details, ...e.tool.details])], v = [b.tool.output, e.tool.output].filter(Boolean).join(`

`);
    b.tool = {
      ...b.tool,
      status: /fail|error|cancel|reject/iu.test(`${b.tool.status} ${e.tool.status}`) ? "failed" : e.tool.status,
      title: f.length > 1 ? `文件变更 · ${String(f.length)} 个文件` : "文件变更",
      summary: f.length ? `${String(f.length)} 个文件已更新` : e.tool.summary,
      details: f,
      ...v ? { output: v } : {}
    };
  };
  for (const e of Ie(t))
    e.kind === "message" ? i.push({ id: e.id, kind: "message", message: e.message }) : e.kind === "timeline" ? l(e.entry) : e.kind === "plan" ? i.push({ id: e.id, kind: "plan", text: e.plan.text }) : e.kind === "request" ? i.push({ id: e.id, kind: "request", request: e.request }) : e.kind === "turn" && e.status === "failed" ? i.push({ id: e.id, kind: "failure", text: e.error }) : e.kind === "turn" && e.status === "interrupted" ? i.push({ id: e.id, kind: "interrupted", text: "本次回复已停止" }) : e.kind === "turn" && e.status === "completed" ? i.push({ id: e.id, kind: "worked", label: `Worked for ${ze(e.durationMs ?? 0)}` }) : e.kind === "activity" && i.push({
      id: e.id,
      kind: "activity",
      title: e.status === "waiting" ? ((c = t.pendingRequests.find((m) => !m.turnId || m.turnId === e.turnId)) == null ? void 0 : c.kind) === "approval" ? "等待你的审批" : "等待你的回答" : e.label,
      detail: e.status === "waiting" ? "处理后 Codex 会继续本次回复" : e.status === "retrying" ? t.connection.status === "disconnected" ? "连接已中断，等待恢复" : "正在恢复本次回复" : t.connection.status === "connected" ? "实时更新中" : "等待恢复连接",
      tone: e.status
    });
  return i;
}
const He = ["data-kind"], Ke = { class: "cody-request-heading" }, We = { key: 0 }, Ge = {
  key: 0,
  class: "cody-question-options"
}, Qe = ["onClick"], Xe = { key: 0 }, Ye = ["onUpdate:modelValue", "type", "placeholder"], Ze = { class: "cody-request-actions" }, Je = ["disabled"], et = { class: "cody-approval-risk-heading" }, tt = ["data-level"], ot = { class: "cody-approval-risk-subject" }, at = {
  key: 0,
  class: "cody-approval-risk-labels"
}, st = {
  key: 1,
  class: "cody-approval-risk-details"
}, nt = { class: "cody-approval-risk-recommendation" }, lt = { key: 1 }, it = {
  key: 2,
  class: "cody-request-actions"
}, rt = /* @__PURE__ */ K({
  __name: "CodyRequestCard",
  props: {
    request: {}
  },
  emits: ["resolveApproval", "resolveQuestion"],
  setup(t, { emit: i }) {
    const l = t, c = i, e = $e({}), m = O(() => ke(l.request.params)), b = O(() => Ne(l.request.params)), f = O(() => l.request.kind === "approval" ? Me({ method: l.request.method, params: l.request.params }) : null), v = O(() => m.value.length > 0 && m.value.every((S) => {
      var w;
      return !!((w = e[S.id]) != null && w.trim());
    }));
    se(() => l.request.id, () => {
      for (const S of Object.keys(e)) delete e[S];
    });
    function s() {
      v.value && c("resolveQuestion", l.request.id, Object.fromEntries(m.value.map((S) => [S.id, { answers: [e[S.id].trim()] }])));
    }
    return (S, w) => (r(), d("article", {
      class: "cody-request-card",
      "data-kind": t.request.kind
    }, [
      p("div", Ke, [
        p("strong", null, $(t.request.kind === "approval" ? "需要你的确认" : "Codex 需要补充信息"), 1),
        w[2] || (w[2] = p("small", null, "Agent 已暂停等待", -1))
      ]),
      t.request.kind === "question" && m.value.length ? (r(), d(M, { key: 0 }, [
        (r(!0), d(M, null, z(m.value, (u) => (r(), d("fieldset", {
          key: u.id,
          class: "cody-question-field"
        }, [
          p("legend", null, [
            u.header ? (r(), d("span", We, $(u.header), 1)) : q("", !0),
            ne($(u.question), 1)
          ]),
          u.options.length ? (r(), d("div", Ge, [
            (r(!0), d(M, null, z(u.options, (L) => (r(), d("button", {
              key: L.label,
              type: "button",
              class: ge({ selected: e[u.id] === L.label }),
              onClick: (R) => e[u.id] = L.label
            }, [
              p("strong", null, $(L.label), 1),
              L.description ? (r(), d("small", Xe, $(L.description), 1)) : q("", !0)
            ], 10, Qe))), 128))
          ])) : q("", !0),
          u.options.length === 0 || u.isOther ? we((r(), d("input", {
            key: 1,
            "onUpdate:modelValue": (L) => e[u.id] = L,
            type: u.isSecret ? "password" : "text",
            placeholder: u.options.length ? "其他回答…" : "输入回答…",
            onKeyup: Se(s, ["enter"])
          }, null, 40, Ye)), [
            [Ce, e[u.id]]
          ]) : q("", !0)
        ]))), 128)),
        p("div", Ze, [
          p("button", {
            type: "button",
            disabled: !v.value,
            onClick: s
          }, "提交回答", 8, Je)
        ])
      ], 64)) : (r(), d(M, { key: 1 }, [
        f.value ? (r(), d(M, { key: 0 }, [
          p("div", et, [
            p("div", null, [
              p("strong", null, $(f.value.title), 1),
              p("p", null, $(f.value.description), 1)
            ]),
            p("span", {
              class: "cody-approval-risk-level",
              "data-level": f.value.level
            }, $(f.value.level), 9, tt)
          ]),
          p("code", ot, $(f.value.subject), 1),
          f.value.riskLabels.length ? (r(), d("ul", at, [
            (r(!0), d(M, null, z(f.value.riskLabels, (u) => (r(), d("li", { key: u }, $(u), 1))), 128))
          ])) : q("", !0),
          f.value.impacts.length ? (r(), d("details", st, [
            w[3] || (w[3] = p("summary", null, "查看影响", -1)),
            p("ul", null, [
              (r(!0), d(M, null, z(f.value.impacts, (u) => (r(), d("li", { key: u }, $(u), 1))), 128))
            ])
          ])) : q("", !0),
          p("p", nt, $(f.value.recommendation), 1)
        ], 64)) : (r(), d("p", lt, $(b.value), 1)),
        t.request.kind === "approval" ? (r(), d("div", it, [
          p("button", {
            type: "button",
            onClick: w[0] || (w[0] = (u) => c("resolveApproval", t.request.id, "accept"))
          }, "允许一次"),
          p("button", {
            type: "button",
            "data-tone": "danger",
            onClick: w[1] || (w[1] = (u) => c("resolveApproval", t.request.id, "decline"))
          }, "拒绝")
        ])) : q("", !0)
      ], 64))
    ], 8, He));
  }
}), dt = ["data-variant"], ct = {
  key: 0,
  class: "cody-conversation-loading",
  role: "status"
}, ut = {
  key: 1,
  class: "cody-conversation-empty"
}, mt = {
  key: 0,
  class: "cody-worked-divider"
}, pt = ["data-role"], ft = ["data-role"], gt = { class: "cody-message-stack" }, vt = { class: "cody-message-label" }, yt = {
  key: 0,
  class: "cody-message-skills"
}, kt = {
  key: 1,
  class: "cody-message-body"
}, bt = {
  key: 2,
  class: "cody-message-images"
}, ht = ["src"], $t = ["onClick"], wt = ["data-tone", "open"], St = { key: 0 }, Ct = ["onClick"], xt = {
  key: 3,
  class: "cody-reasoning-card"
}, At = {
  key: 4,
  class: "cody-plan-card",
  open: ""
}, qt = {
  key: 6,
  class: "cody-failure-card"
}, Lt = {
  key: 7,
  class: "cody-interrupted-card",
  role: "status"
}, Mt = ["data-tone"], to = /* @__PURE__ */ K({
  __name: "CodyConversation",
  props: {
    entries: {},
    loading: { type: Boolean },
    variant: { default: "standalone" }
  },
  emits: ["copy", "openFile", "resolveApproval", "resolveQuestion"],
  setup(t, { emit: i }) {
    const l = i, c = E({});
    function e(f) {
      c.value = {
        ...c.value,
        [f]: c.value[f] !== !0
      };
    }
    function m(f, v) {
      l("resolveApproval", f, v);
    }
    function b(f, v) {
      l("resolveQuestion", f, v);
    }
    return (f, v) => (r(), d("section", {
      class: "cody-conversation",
      "data-variant": t.variant,
      "data-cody-component": "conversation-surface"
    }, [
      t.loading ? (r(), d("div", ct, "正在同步对话…")) : t.entries.length === 0 ? (r(), d("div", ut, [
        H(f.$slots, "empty", {}, () => [
          v[2] || (v[2] = ne("开始这个需求的开发", -1))
        ])
      ])) : (r(!0), d(M, { key: 2 }, z(t.entries, (s) => {
        var S, w;
        return r(), d(M, {
          key: s.id
        }, [
          s.kind === "worked" ? (r(), d("div", mt, [
            p("span", null, $(s.label), 1)
          ])) : s.kind === "message" ? (r(), d("article", {
            key: 1,
            class: "cody-message",
            "data-role": s.message.role
          }, [
            p("div", {
              class: "cody-message-identity",
              "data-role": s.message.role
            }, $(s.message.role === "user" ? "你" : "CW"), 9, ft),
            p("div", gt, [
              p("div", vt, $(s.message.role === "user" ? "你" : s.message.role === "assistant" ? "Codex Agent" : "系统"), 1),
              (S = s.message.skills) != null && S.length ? (r(), d("ul", yt, [
                (r(!0), d(M, null, z(s.message.skills, (u) => (r(), d("li", {
                  key: `${u.name}:${u.path}`
                }, "$" + $(u.displayName || u.name), 1))), 128))
              ])) : q("", !0),
              s.message.text ? (r(), d("div", kt, [
                H(f.$slots, "markdown", {
                  message: s.message
                }, () => [
                  U(pe, {
                    text: s.message.text,
                    onOpenFile: v[0] || (v[0] = (u) => l("openFile", u))
                  }, null, 8, ["text"])
                ])
              ])) : q("", !0),
              (w = s.message.images) != null && w.length ? (r(), d("div", bt, [
                (r(!0), d(M, null, z(s.message.images, (u) => (r(), d("img", {
                  key: u,
                  src: u,
                  alt: "对话图片",
                  loading: "lazy"
                }, null, 8, ht))), 128))
              ])) : q("", !0),
              s.message.text ? (r(), d("button", {
                key: 3,
                class: "cody-copy-button",
                type: "button",
                onClick: (u) => l("copy", s.message.text)
              }, "复制", 8, $t)) : q("", !0)
            ])
          ], 8, pt)) : s.kind === "tool" ? (r(), d("details", {
            key: 2,
            class: "cody-tool-card",
            "data-tone": I(re)(s.tool.status),
            open: I(re)(s.tool.status) === "working"
          }, [
            p("summary", null, [
              v[3] || (v[3] = p("span", null, "⌁", -1)),
              p("strong", null, $(s.tool.title), 1),
              p("small", null, $(s.tool.status), 1)
            ]),
            p("p", null, $(s.tool.summary), 1),
            s.tool.details.length ? (r(), d("ul", St, [
              (r(!0), d(M, null, z(s.tool.details, (u) => (r(), d("li", { key: u }, $(u), 1))), 128))
            ])) : q("", !0),
            s.tool.output ? (r(), d(M, { key: 1 }, [
              p("pre", null, $(c.value[s.id] ? s.tool.output : I(Te)(s.tool.output)), 1),
              I(De)(s.tool.output) ? (r(), d("button", {
                key: 0,
                class: "cody-tool-output-toggle",
                type: "button",
                onClick: (u) => e(s.id)
              }, $(I(Re)(c.value[s.id] === !0)), 9, Ct)) : q("", !0)
            ], 64)) : q("", !0)
          ], 8, wt)) : s.kind === "reasoning" ? (r(), d("details", xt, [
            p("summary", null, "✦ " + $(s.title || "推理过程"), 1),
            p("pre", null, $(s.text), 1)
          ])) : s.kind === "plan" ? (r(), d("details", At, [
            v[4] || (v[4] = p("summary", null, "计划", -1)),
            U(pe, {
              text: s.text,
              onOpenFile: v[1] || (v[1] = (u) => l("openFile", u))
            }, null, 8, ["text"])
          ])) : s.kind === "request" ? H(f.$slots, "request", {
            request: s.request
          }, () => [
            U(rt, {
              request: s.request,
              onResolveApproval: m,
              onResolveQuestion: b
            }, null, 8, ["request"])
          ], void 0, 5) : s.kind === "failure" ? (r(), d("details", qt, [
            v[5] || (v[5] = p("summary", null, "本次回复失败", -1)),
            p("p", null, $(s.text), 1)
          ])) : s.kind === "interrupted" ? (r(), d("article", Lt, $(s.text), 1)) : s.kind === "activity" ? (r(), d("article", {
            key: 8,
            class: "cody-conversation-activity",
            "data-tone": s.tone,
            role: "status",
            "aria-live": "polite"
          }, [
            v[6] || (v[6] = p("span", {
              class: "cody-activity-pulse",
              "aria-hidden": "true"
            }, null, -1)),
            p("strong", null, $(s.title), 1),
            p("small", null, $(s.detail), 1)
          ], 8, Mt)) : q("", !0)
        ], 64);
      }), 128))
    ], 8, dt));
  }
}), Tt = ["data-variant"], Dt = { class: "cody-composer-shell" }, Rt = {
  key: 0,
  class: "cody-composer-selected",
  "aria-label": "已引用 Skills"
}, _t = ["disabled", "aria-label", "onClick"], Ot = ["value", "disabled", "placeholder", "aria-expanded", "aria-controls", "aria-activedescendant"], Bt = {
  key: 0,
  class: "cody-composer-skill-status"
}, It = ["id", "aria-selected", "onMouseenter", "onMousedown"], zt = { class: "cody-composer-skill-option-name" }, Et = {
  key: 0,
  class: "cody-composer-skill-option-description"
}, Pt = { class: "cody-composer-controls" }, jt = {
  class: "cody-composer-settings",
  "aria-label": "运行设置"
}, Ft = { class: "cody-composer-actions" }, Ut = ["disabled"], Vt = ["disabled", "aria-label", "title"], Nt = {
  key: 2,
  class: "cody-composer-policy"
}, oo = /* @__PURE__ */ K({
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
  setup(t, { emit: i }) {
    const l = K({
      name: "CodyComposerSelect",
      props: { label: { type: String, required: !0 }, modelValue: { type: String, required: !0 }, options: { type: Array, required: !0 }, disabled: Boolean },
      emits: ["update:modelValue"],
      setup(a, { emit: o }) {
        return () => oe("label", { class: "cody-composer-compact-control", title: a.label, "data-control": a.label }, [
          oe("select", { value: a.modelValue, disabled: a.disabled, "aria-label": a.label, onChange: (n) => o("update:modelValue", n.target.value) }, a.options.map((n) => oe("option", { value: n.value }, n.label)))
        ]);
      }
    }), c = t, e = i, m = E(null), b = E(c.draft), f = E(null), v = E(0), s = xe(), S = `${s}-skill-menu`, w = O(() => {
      const a = f.value;
      return a ? c.skills.filter((o) => !c.selectedSkills.includes(o.value)).filter((o) => a.query ? `${o.label}
${o.description ?? ""}`.toLowerCase().includes(a.query) : !0).slice(0, 8) : [];
    }), u = O(() => f.value !== null), L = O(() => u.value && w.value.length ? j(Math.min(v.value, w.value.length - 1)) : void 0), R = O(() => {
      var a;
      return ((a = c.permissionOptions.find((o) => o.value === c.selectedPermission)) == null ? void 0 : a.description) ?? "";
    }), G = O(() => !c.disabled && Ee({ text: c.draft, skills: c.selectedSkills })), Q = O(() => c.isRunning && c.selectedSubmitMode === "steer" ? "发送引导" : c.isRunning ? "加入队列" : "发送");
    se(() => c.draft, (a) => {
      b.value = a;
    });
    function X(a, o) {
      var n;
      return ((n = a.find((y) => y.value === o)) == null ? void 0 : n.label) ?? o;
    }
    function J(a) {
      e("update:selected-skills", c.selectedSkills.filter((o) => o !== a));
    }
    function j(a) {
      return `${s}-skill-option-${String(a)}`;
    }
    function V(a, o) {
      f.value = je(a, o, "$"), v.value = 0;
    }
    function Y(a) {
      const o = a.target;
      b.value = o.value, e("update:draft", o.value), V(o.value, o.selectionStart);
    }
    function Z(a) {
      const o = a.target;
      V(o.value, o.selectionStart);
    }
    function ee() {
      window.setTimeout(() => {
        f.value = null;
      }, 0);
    }
    function N(a) {
      const o = f.value;
      if (!o) return;
      const n = m.value, y = (n == null ? void 0 : n.value) || b.value, k = Pe(y, o);
      c.selectedSkills.includes(a) || e("update:selected-skills", [...c.selectedSkills, a]), e("update:draft", k.text), b.value = k.text, f.value = null, fe(() => {
        const T = m.value;
        T == null || T.focus(), T == null || T.setSelectionRange(k.cursor, k.cursor);
      });
    }
    function g(a) {
      if (u.value) {
        if (a.key === "Escape") {
          a.preventDefault(), f.value = null;
          return;
        }
        if (a.key === "ArrowDown" || a.key === "ArrowUp") {
          a.preventDefault();
          const o = w.value.length;
          o && (v.value = (v.value + (a.key === "ArrowDown" ? 1 : -1) + o) % o);
          return;
        }
        if (a.key === "Enter" && !a.ctrlKey && !a.metaKey && w.value.length) {
          a.preventDefault(), N(w.value[Math.min(v.value, w.value.length - 1)].value);
          return;
        }
      }
      a.key !== "Enter" || a.isComposing || !a.ctrlKey && !a.metaKey || (a.preventDefault(), h());
    }
    function h() {
      G.value && e("send");
    }
    return (a, o) => (r(), d("form", {
      class: "cody-composer",
      "data-variant": t.variant,
      "data-cody-component": "composer-surface",
      onSubmit: le(h, ["prevent"])
    }, [
      p("div", Dt, [
        t.selectedSkills.length ? (r(), d("div", Rt, [
          (r(!0), d(M, null, z(t.selectedSkills, (n) => (r(), d("span", {
            key: n,
            class: "cody-composer-chip"
          }, [
            ne(" $" + $(X(t.skills, n)) + " ", 1),
            p("button", {
              type: "button",
              disabled: t.disabled,
              "aria-label": `移除 Skill ${X(t.skills, n)}`,
              onClick: (y) => J(n)
            }, "×", 8, _t)
          ]))), 128))
        ])) : q("", !0),
        p("textarea", {
          ref_key: "draftInputRef",
          ref: m,
          value: t.draft,
          rows: "1",
          disabled: t.disabled,
          placeholder: t.placeholder,
          "aria-expanded": u.value,
          "aria-controls": u.value ? S : void 0,
          "aria-activedescendant": L.value,
          "aria-autocomplete": "list",
          onInput: Y,
          onClick: Z,
          onKeyup: Z,
          onBlur: ee,
          onKeydown: g
        }, null, 40, Ot),
        u.value ? (r(), d("div", {
          key: 1,
          id: S,
          class: "cody-composer-skill-menu",
          role: "listbox",
          "aria-label": "可引用 Skills"
        }, [
          w.value.length === 0 ? (r(), d("p", Bt, "没有匹配的 Skill")) : (r(!0), d(M, { key: 1 }, z(w.value, (n, y) => (r(), d("button", {
            id: j(y),
            key: n.value,
            class: ge(["cody-composer-skill-option", { active: y === v.value }]),
            type: "button",
            role: "option",
            "aria-selected": y === v.value,
            onMouseenter: (k) => v.value = y,
            onMousedown: le((k) => N(n.value), ["prevent"])
          }, [
            p("span", zt, "$" + $(n.label), 1),
            n.description ? (r(), d("span", Et, $(n.description), 1)) : q("", !0)
          ], 42, It))), 128))
        ])) : q("", !0),
        p("div", Pt, [
          p("div", jt, [
            H(a.$slots, "leading"),
            t.collaborationModes.length ? (r(), ie(I(l), {
              key: 0,
              label: "协作模式",
              "model-value": t.selectedCollaborationMode,
              options: t.collaborationModes,
              disabled: t.disabled || t.isRunning,
              "onUpdate:modelValue": o[0] || (o[0] = (n) => e("update:collaboration-mode", n))
            }, null, 8, ["model-value", "options", "disabled"])) : q("", !0),
            U(I(l), {
              label: "提交策略",
              "model-value": t.selectedSubmitMode,
              options: t.submitModes,
              disabled: t.disabled,
              "onUpdate:modelValue": o[1] || (o[1] = (n) => e("update:submit-mode", n))
            }, null, 8, ["model-value", "options", "disabled"]),
            t.models.length ? (r(), ie(I(l), {
              key: 1,
              label: "模型",
              "model-value": t.selectedModel,
              options: t.models,
              disabled: t.disabled || t.isRunning,
              "onUpdate:modelValue": o[2] || (o[2] = (n) => e("update:model", n))
            }, null, 8, ["model-value", "options", "disabled"])) : q("", !0),
            U(I(l), {
              label: "推理强度",
              "model-value": t.selectedReasoning,
              options: t.reasoningOptions,
              disabled: t.disabled || t.isRunning,
              "onUpdate:modelValue": o[3] || (o[3] = (n) => e("update:reasoning", n))
            }, null, 8, ["model-value", "options", "disabled"]),
            U(I(l), {
              label: "权限",
              "model-value": t.selectedPermission,
              options: t.permissionOptions,
              disabled: t.disabled || t.isRunning,
              "onUpdate:modelValue": o[4] || (o[4] = (n) => e("update:permission", n))
            }, null, 8, ["model-value", "options", "disabled"]),
            H(a.$slots, "controls")
          ]),
          p("div", Ft, [
            t.isRunning ? (r(), d("button", {
              key: 0,
              class: "cody-composer-stop",
              type: "button",
              disabled: t.disabled,
              "aria-label": "停止当前回复",
              title: "停止当前回复",
              onClick: o[5] || (o[5] = (n) => e("stop"))
            }, [...o[6] || (o[6] = [
              p("span", {
                class: "cody-composer-stop-icon",
                "aria-hidden": "true"
              }, null, -1)
            ])], 8, Ut)) : q("", !0),
            p("button", {
              class: "cody-composer-send",
              type: "submit",
              disabled: !G.value,
              "aria-label": Q.value,
              title: Q.value
            }, [...o[7] || (o[7] = [
              p("svg", {
                viewBox: "0 0 24 24",
                "aria-hidden": "true"
              }, [
                p("path", { d: "M12 19V5m0 0-6 6m6-6 6 6" })
              ], -1)
            ])], 8, Vt)
          ])
        ]),
        R.value ? (r(), d("p", Nt, $(R.value), 1)) : q("", !0)
      ])
    ], 40, Tt));
  }
});
function ao() {
  const t = Ae(ae());
  let i = null, l = null, c = 0;
  const e = () => {
    c += 1, l == null || l(), l = null, i == null || i.dispose(), i = null;
  }, m = async (s, S) => {
    e(), t.value = ae(s);
    const w = c, u = Fe(s, S);
    i = u, l = u.subscribe((L) => {
      i === u && c === w && (t.value = L);
    }), await u.start();
  }, b = async () => {
    await (i == null ? void 0 : i.refresh());
  }, f = (s = "") => {
    e(), t.value = ae(s);
  }, v = () => {
    e();
  };
  return qe() && Le(v), {
    state: O(() => t.value),
    connect: m,
    refresh: b,
    reset: f,
    dispose: v
  };
}
export {
  oo as CodyComposer,
  to as CodyConversation,
  pe as CodyMarkdown,
  rt as CodyRequestCard,
  W as DEFAULT_CODY_MARKDOWN_LABELS,
  eo as conversationEntriesFromState,
  ke as questionFieldsFromParams,
  ue as renderCodyMarkdown,
  Ne as requestSummary,
  me as stabilizeStreamingMarkdown,
  ao as useConversationController
};
