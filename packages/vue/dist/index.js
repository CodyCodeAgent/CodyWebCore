import { defineComponent as W, computed as O, ref as z, watch as ae, onMounted as be, onBeforeUnmount as he, openBlock as r, createElementBlock as u, Fragment as M, createElementVNode as p, nextTick as fe, reactive as $e, toDisplayString as $, renderList as U, createCommentVNode as A, createTextVNode as ne, normalizeClass as le, withDirectives as we, withKeys as Se, vModelDynamic as Ce, renderSlot as K, createVNode as N, unref as I, h as oe, useId as xe, withModifiers as ie, createBlock as re, shallowRef as Ae, getCurrentScope as qe, onScopeDispose as Le } from "vue";
import { buildApprovalRiskSummary as Me, toolStatusTone as de, buildToolOutputPreview as Te, isToolOutputTruncated as De, toolOutputToggleLabel as Re } from "@codycodeagent/cody-web-core/presentation";
import ve from "dompurify";
import _e from "markdown-it";
import Oe from "markdown-it-footnote";
import Be from "markdown-it-task-lists";
import { conversationFeedFromState as Ie, formatTurnDuration as Ue, createConversationState as se } from "@codycodeagent/cody-web-core/conversation";
import { composerHasContent as Ee, removeComposerTrigger as ze, findComposerTrigger as Pe } from "@codycodeagent/cody-web-core/composer";
import { createConversationController as je } from "@codycodeagent/cody-web-core/client";
const G = {
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
}, R = new _e({ breaks: !0, html: !1, linkify: !0, typographer: !1 });
R.use(Be, { enabled: !1, label: !0, labelAfter: !0 });
R.use(Oe);
function B(t, l) {
  return `<button type="button" class="markdown-tool-button" data-markdown-action="${t}" aria-label="${l}" title="${l}">${l}</button>`;
}
function ke(t, l = "", i = G) {
  const c = l.toLowerCase();
  if (c === "mermaid" || c === "plantuml" || c === "puml") {
    const T = c === "mermaid" ? "mermaid" : "plantuml";
    return `<div class="markdown-diagram-shell" data-diagram-engine="${T}"><header class="markdown-diagram-toolbar"><span>${T}</span><span class="markdown-diagram-actions">${B("diagram-zoom-out", i.zoomOut)}${B("diagram-fit", i.fit)}${B("diagram-zoom-in", i.zoomIn)}${B("diagram-source", i.source)}${B("diagram-fullscreen", i.fullscreen)}${B("diagram-export-svg", "SVG")}${B("diagram-export-png", "PNG")}</span></header><div class="markdown-diagram-stage" role="img" aria-label="${i.diagramAria(T)}"><p class="markdown-diagram-status">${i.rendering(T)}</p></div><pre class="markdown-diagram-source" hidden><code>${R.utils.escapeHtml(t)}</code></pre></div>
`;
  }
  const e = t.replace(/\n$/u, "").split(`
`), m = e.length <= 2 && e.every((T) => T.length <= 96), b = e.length > 10, g = l || "text", v = [m ? "is-compact-code" : "", /^[A-Za-z0-9_-]+$/u.test(l) ? `language-${l}` : ""].filter(Boolean).join(" "), s = v ? ` class="${v}"` : "", S = [m ? "is-compact" : "", b ? "is-collapsible is-collapsed" : ""].filter(Boolean).join(" "), w = b ? `${g} · ${i.lineCount(e.length)}` : g, d = b ? `<button type="button" class="markdown-tool-button markdown-code-collapse" data-markdown-action="toggle-code" aria-label="${i.collapseCode}" title="${i.collapseCode}" aria-expanded="false">${i.collapseCode}</button>` : "", L = b ? `<div class="markdown-code-expand"><button type="button" data-markdown-action="toggle-code" aria-expanded="false">${i.expandCode(e.length)}</button></div>` : "";
  return `<div class="markdown-code-host"><div class="markdown-code-shell${S ? ` ${S}` : ""}" data-language="${g}" data-code-lines="${String(e.length)}"><header class="markdown-code-toolbar"><span>${w}</span><span class="markdown-code-actions">${d}${B("wrap-code", i.wrap)}${B("copy-code", i.copy)}${B("save-code", i.save)}</span></header><pre class="markdown-code-block${m ? " is-compact" : ""}"><code${s}>${R.utils.escapeHtml(t)}</code></pre>${L}</div></div>
`;
}
R.renderer.rules.fence = (t, l, i, c) => {
  const e = t[l];
  return ke(e.content, e.info.trim().split(/\s+/u)[0] ?? "", c.labels);
};
R.renderer.rules.code_block = (t, l, i, c) => ke(t[l].content, "", c.labels);
R.renderer.rules.table_open = (t, l, i, c) => {
  const e = c.labels ?? G;
  return `<section class="markdown-table-shell" role="region" aria-label="${e.dataTable}" tabindex="0"><header class="markdown-table-toolbar">${B("copy-table", e.copyCsv)}</header><div class="markdown-table-scroll"><table>
`;
};
R.renderer.rules.table_close = () => `</table></div></section>
`;
const ue = R.renderer.rules.code_inline;
R.renderer.rules.code_inline = (t, l, i, c, e) => {
  const m = t[l].content, b = m.match(/^(.+?\.[A-Za-z0-9_-]{1,12})(?::(\d+))?$/u);
  if (!b || /\s/u.test(m)) return ue ? ue(t, l, i, c, e) : e.renderToken(t, l, i);
  const g = R.utils.escapeHtml(b[1]), v = b[2] ?? "", s = c.labels ?? G;
  return `<button type="button" class="markdown-file-link" data-markdown-action="open-file" data-file-path="${g}" data-file-line="${v}" title="${s.openFile(g)}"><code>${R.utils.escapeHtml(m)}</code></button>`;
};
const ce = R.renderer.rules.link_open;
R.renderer.rules.link_open = (t, l, i, c, e) => {
  const m = t[l];
  return /^https?:\/\//u.test(m.attrGet("href") ?? "") && (m.attrSet("target", "_blank"), m.attrSet("rel", "noopener noreferrer")), ce ? ce(t, l, i, c, e) : e.renderToken(t, l, i);
};
function me(t, l = G) {
  return ve.sanitize(R.render(t, { labels: l }), {
    ADD_ATTR: ["target"],
    ADD_TAGS: ["table", "thead", "tbody", "tr", "th", "td", "h1", "h2", "h3", "h4", "h5", "h6"],
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed"]
  });
}
function pe(t) {
  var l;
  return (((l = t.match(/^\s*```/gmu)) == null ? void 0 : l.length) ?? 0) % 2 === 1 ? `${t}

\`\`\`` : t;
}
const Fe = ["innerHTML"], Ve = ["src"], ge = /* @__PURE__ */ W({
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
  setup(t, { emit: l }) {
    const i = t, c = l, e = O(() => i.labels ?? G), m = z(null), b = z(null), g = z(me(pe(i.text), e.value)), v = z(""), s = /* @__PURE__ */ new Set();
    let S = 0, w = 0;
    const d = {
      javascript: () => import("highlight.js/lib/languages/javascript"),
      typescript: () => import("highlight.js/lib/languages/typescript"),
      python: () => import("highlight.js/lib/languages/python"),
      go: () => import("highlight.js/lib/languages/go"),
      rust: () => import("highlight.js/lib/languages/rust"),
      json: () => import("highlight.js/lib/languages/json"),
      bash: () => import("highlight.js/lib/languages/bash"),
      sql: () => import("highlight.js/lib/languages/sql")
    };
    async function L(f) {
      window.clearTimeout(S), S = window.setTimeout(async () => {
        g.value = me(pe(f), e.value), await fe(), T();
      }, i.renderDelay);
    }
    async function T() {
      var a, o, n, k, y, D;
      for (const C of Array.from(((a = m.value) == null ? void 0 : a.querySelectorAll("td")) ?? []))
        /^-?[\d,.]+%?$/u.test(((o = C.textContent) == null ? void 0 : o.trim()) ?? "") && (C.dataset.numeric = "true");
      for (const C of Array.from(((n = m.value) == null ? void 0 : n.querySelectorAll("img")) ?? []))
        C.addEventListener("error", () => {
          C.alt = C.alt || "图片加载失败", C.classList.add("is-load-error");
        }, { once: !0 });
      E();
      for (const [C, x] of Array.from(((k = m.value) == null ? void 0 : k.querySelectorAll(".markdown-code-shell")) ?? []).entries()) {
        x.dataset.codeIndex = String(C), x.classList.contains("is-collapsible") && s.has(C) && x.classList.remove("is-collapsed");
        for (const q of Array.from(x.querySelectorAll('[data-markdown-action="toggle-code"]')))
          q.setAttribute("aria-expanded", String(!x.classList.contains("is-collapsed")));
        const _ = x.querySelector("pre"), P = x.querySelector('[data-markdown-action="wrap-code"]');
        _ && P && (P.hidden = _.scrollWidth <= _.clientWidth + 2, P.setAttribute("aria-pressed", String(x.classList.contains("is-wrapped"))));
      }
      await j();
      const f = Array.from(((y = m.value) == null ? void 0 : y.querySelectorAll('pre code[class*="language-"]')) ?? []);
      if (f.length === 0) return;
      const h = (await import("highlight.js/lib/core")).default;
      for (const C of f) {
        const x = ((D = Array.from(C.classList).find((q) => q.startsWith("language-"))) == null ? void 0 : D.slice(9)) ?? "", _ = d[x];
        if (!_ || C.dataset.highlighted === "yes") continue;
        const P = await _();
        h.getLanguage(x) || h.registerLanguage(x, P.default), C.innerHTML = h.highlight(C.textContent ?? "", { language: x }).value, C.dataset.highlighted = "yes";
      }
    }
    function E() {
      var h;
      if (!i.resolveAssetUrl) return;
      const f = /\.(?:svg|png|jpe?g|gif|webp)(?:[?#].*)?$/iu;
      for (const a of Array.from(((h = m.value) == null ? void 0 : h.querySelectorAll("a[href]")) ?? [])) {
        const o = a.getAttribute("href") ?? "";
        if (!f.test(o) || /^(?:data|blob):/iu.test(o)) continue;
        const n = i.resolveAssetUrl(o);
        n && (a.href = n, a.target = "_blank", a.rel = "noopener noreferrer");
      }
    }
    async function j() {
      var h, a, o, n;
      const f = Array.from(((h = m.value) == null ? void 0 : h.querySelectorAll(".markdown-diagram-shell:not([data-rendered])")) ?? []);
      for (const k of f) {
        k.dataset.rendered = "loading";
        const y = k.dataset.diagramEngine === "plantuml" ? "plantuml" : "mermaid", D = ((a = k.querySelector("code")) == null ? void 0 : a.textContent) ?? "", C = k.querySelector(".markdown-diagram-stage");
        if (C)
          try {
            let x = await ((o = i.renderDiagram) == null ? void 0 : o.call(i, { engine: y, source: D, dark: i.dark }));
            if (!x && y === "mermaid") {
              const { default: _ } = await import("mermaid");
              _.initialize({ startOnLoad: !1, securityLevel: "strict", theme: i.dark ? "dark" : "default", htmlLabels: !1, flowchart: { htmlLabels: !1, useMaxWidth: !1 } }), x = (await _.render(`cody-diagram-${String(++w)}`, D)).svg;
            }
            if (!x) throw new Error(y === "plantuml" ? "当前环境未配置 PlantUML 渲染器" : "图表渲染失败");
            C.innerHTML = X(x), J(C), k.dataset.rendered = "yes", k.style.setProperty("--diagram-scale", "1");
          } catch (x) {
            C.textContent = x instanceof Error ? x.message : "图表渲染失败", C.classList.add("markdown-diagram-error"), (n = k.querySelector(".markdown-diagram-source")) == null || n.removeAttribute("hidden"), k.dataset.rendered = "error";
          }
      }
    }
    function X(f) {
      const h = ve.sanitize(f, { USE_PROFILES: { svg: !0, svgFilters: !0, html: !0 }, ADD_TAGS: ["foreignObject"], ADD_ATTR: ["xmlns"] }), a = h.trimStart().startsWith("<svg") ? h : `<svg xmlns="http://www.w3.org/2000/svg">${h}</svg>`, o = new DOMParser().parseFromString(a, "image/svg+xml");
      if (o.querySelector("parsererror")) return "";
      for (const n of o.querySelectorAll("*")) for (const k of Array.from(n.attributes)) /^on/iu.test(k.name) && n.removeAttribute(k.name);
      return o.querySelectorAll("script").forEach((n) => n.remove()), new XMLSerializer().serializeToString(o.documentElement);
    }
    function J(f) {
      if (f.dataset.panReady === "true") return;
      f.dataset.panReady = "true";
      let h = 0, a = 0, o = 0, n = 0;
      f.addEventListener("pointerdown", (y) => {
        y.button === 0 && (h = y.clientX, a = y.clientY, o = f.scrollLeft, n = f.scrollTop, f.setPointerCapture(y.pointerId), f.classList.add("is-panning"));
      }), f.addEventListener("pointermove", (y) => {
        f.hasPointerCapture(y.pointerId) && (f.scrollLeft = o - (y.clientX - h), f.scrollTop = n - (y.clientY - a));
      });
      const k = (y) => {
        f.hasPointerCapture(y.pointerId) && f.releasePointerCapture(y.pointerId), f.classList.remove("is-panning");
      };
      f.addEventListener("pointerup", k), f.addEventListener("pointercancel", k);
    }
    function F(f, h = 0) {
      const a = Number(f.style.getPropertyValue("--diagram-scale") || "1");
      f.style.setProperty("--diagram-scale", String(h === 0 ? 1 : Math.min(2.5, Math.max(0.4, a + h))));
    }
    function H(f, h) {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(f), a.download = h, a.click(), URL.revokeObjectURL(a.href);
    }
    async function Y(f, h) {
      const a = h.textContent;
      try {
        await navigator.clipboard.writeText(f), h.textContent = "已复制";
      } catch {
        const o = document.createElement("textarea");
        o.value = f, o.style.position = "fixed", o.style.opacity = "0", document.body.appendChild(o), o.select();
        const n = document.execCommand("copy");
        o.remove(), h.textContent = n ? "已复制" : "复制失败";
      }
      window.setTimeout(() => {
        h.textContent = a;
      }, 1200);
    }
    function Z(f) {
      return Array.from((f == null ? void 0 : f.rows) ?? []).map((h) => Array.from(h.cells).map((a) => {
        var o;
        return `"${((o = a.textContent) == null ? void 0 : o.trim().replace(/"/gu, '""')) ?? ""}"`;
      }).join(",")).join(`
`);
    }
    function ee(f) {
      var D, C, x, _, P;
      const h = f.target, a = h.closest("img");
      if (a) {
        v.value = a.currentSrc || a.src, (D = b.value) == null || D.showModal();
        return;
      }
      const o = h.closest("[data-markdown-action]");
      if (!o) return;
      const n = o.closest(".markdown-code-shell, .markdown-table-shell"), k = o.dataset.markdownAction;
      if (k === "copy-code" && Y(((C = n == null ? void 0 : n.querySelector("code")) == null ? void 0 : C.textContent) ?? "", o), k === "wrap-code") {
        const q = (n == null ? void 0 : n.classList.toggle("is-wrapped")) ?? !1;
        o.textContent = q && e.value.scroll || e.value.wrap, o.setAttribute("aria-pressed", String(q));
      }
      if (k === "save-code" && H(new Blob([((x = n == null ? void 0 : n.querySelector("code")) == null ? void 0 : x.textContent) ?? ""], { type: "text/plain" }), `snippet.${(n == null ? void 0 : n.dataset.language) || "txt"}`), k === "toggle-code" && (n != null && n.classList.contains("is-collapsible"))) {
        const q = Number(n.dataset.codeIndex ?? -1), V = !n.classList.toggle("is-collapsed");
        q >= 0 && (V ? s.add(q) : s.delete(q));
        for (const te of Array.from(n.querySelectorAll('[data-markdown-action="toggle-code"]'))) te.setAttribute("aria-expanded", String(V));
      }
      if (k === "copy-table" && Y(Z((n == null ? void 0 : n.querySelector("table")) ?? null), o), k === "open-file") {
        const q = o.dataset.filePath ?? "", V = ((_ = i.cwd) == null ? void 0 : _.replace(/\/$/u, "")) ?? "", te = q.startsWith("/") && V && q.startsWith(`${V}/`) ? q.slice(V.length + 1) : q.replace(/^\.\//u, "");
        c("openFile", { path: te, line: Number(o.dataset.fileLine || 0) || 1 });
      }
      const y = o.closest(".markdown-diagram-shell");
      if (y && k === "diagram-zoom-in" && F(y, 0.2), y && k === "diagram-zoom-out" && F(y, -0.2), y && k === "diagram-fit" && F(y), y && k === "diagram-source") {
        const q = y.querySelector(".markdown-diagram-source");
        q && (q.hidden = !q.hidden);
      }
      if (y && k === "diagram-fullscreen" && ((P = y.requestFullscreen) == null || P.call(y)), y && k === "diagram-export-svg") {
        const q = y.querySelector("svg");
        q && H(new Blob([new XMLSerializer().serializeToString(q)], { type: "image/svg+xml" }), "diagram.svg");
      }
    }
    function Q() {
      var f;
      (f = b.value) == null || f.close();
    }
    return ae(() => [i.text, i.labels], ([f]) => {
      L(f);
    }, { deep: !0 }), be(() => {
      T();
    }), he(() => window.clearTimeout(S)), (f, h) => (r(), u(M, null, [
      p("div", {
        ref_key: "rootRef",
        ref: m,
        class: "cody-markdown cody-markdown-renderer",
        innerHTML: g.value,
        onClick: ee
      }, null, 8, Fe),
      p("dialog", {
        ref_key: "imageDialogRef",
        ref: b,
        class: "cody-markdown-image-dialog",
        onClick: Q
      }, [
        p("button", {
          type: "button",
          "aria-label": "关闭图片预览",
          onClick: Q
        }, "×"),
        p("img", {
          src: v.value,
          alt: "Markdown 图片预览"
        }, null, 8, Ve)
      ], 512)
    ], 64));
  }
});
function ye(t) {
  if (!t || typeof t != "object") return [];
  const l = t;
  return (Array.isArray(l.questions) ? l.questions : []).flatMap((c, e) => {
    if (!c || typeof c != "object") return [];
    const m = c, b = typeof m.question == "string" ? m.question.trim() : "";
    if (!b) return [];
    const g = Array.isArray(m.options) ? m.options : [];
    return [{
      id: typeof m.id == "string" && m.id.trim() ? m.id.trim() : `question-${String(e + 1)}`,
      header: typeof m.header == "string" ? m.header.trim() : "",
      question: b,
      isOther: m.isOther === !0,
      isSecret: m.isSecret === !0,
      options: g.flatMap((v) => {
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
  const l = t, i = l.reason ?? l.question ?? l.command;
  return typeof i == "string" && i.trim() ? i : ((c = ye(t)[0]) == null ? void 0 : c.question) ?? "Codex 请求执行一项受保护操作。";
}
function eo(t) {
  var c;
  const l = [], i = (e) => {
    if (e.kind === "reasoning") {
      l.push({ id: e.id, kind: "reasoning", text: e.text });
      return;
    }
    if (!e.tool.summary && e.tool.details.length === 0 && !e.tool.output && e.tool.kind !== "fileChange") return;
    if (e.tool.kind !== "fileChange") {
      l.push({ id: e.id, kind: "tool", tool: e.tool });
      return;
    }
    const m = `file-group:${e.turnId ?? e.id}`, b = l.at(-1);
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
      l.push(S);
      return;
    }
    const g = [.../* @__PURE__ */ new Set([...b.tool.details, ...e.tool.details])], v = [b.tool.output, e.tool.output].filter(Boolean).join(`

`);
    b.tool = {
      ...b.tool,
      status: /fail|error|cancel|reject/iu.test(`${b.tool.status} ${e.tool.status}`) ? "failed" : e.tool.status,
      title: g.length > 1 ? `文件变更 · ${String(g.length)} 个文件` : "文件变更",
      summary: g.length ? `${String(g.length)} 个文件已更新` : e.tool.summary,
      details: g,
      ...v ? { output: v } : {}
    };
  };
  for (const e of Ie(t))
    e.kind === "message" ? l.push({ id: e.id, kind: "message", message: e.message }) : e.kind === "timeline" ? i(e.entry) : e.kind === "plan" ? l.push({ id: e.id, kind: "plan", text: e.plan.text }) : e.kind === "request" ? l.push({ id: e.id, kind: "request", request: e.request }) : e.kind === "turn" && e.status === "failed" ? l.push({ id: e.id, kind: "failure", text: e.error }) : e.kind === "turn" && e.status === "interrupted" ? l.push({ id: e.id, kind: "interrupted", text: "本次回复已停止" }) : e.kind === "turn" && e.status === "completed" ? l.push({ id: e.id, kind: "worked", label: `Worked for ${Ue(e.durationMs ?? 0)}` }) : e.kind === "activity" && l.push({
      id: e.id,
      kind: "activity",
      title: e.status === "waiting" ? ((c = t.pendingRequests.find((m) => !m.turnId || m.turnId === e.turnId)) == null ? void 0 : c.kind) === "approval" ? "等待你的审批" : "等待你的回答" : e.label,
      detail: e.status === "waiting" ? "处理后 Codex 会继续本次回复" : e.status === "retrying" ? t.connection.status === "disconnected" ? "连接已中断，等待恢复" : "正在恢复本次回复" : t.connection.status === "connected" ? "实时更新中" : "等待恢复连接",
      tone: e.status
    });
  return l;
}
const He = ["data-kind"], Qe = { class: "cody-request-heading" }, Ke = { key: 0 }, We = {
  key: 0,
  class: "cody-question-options"
}, Ge = ["onClick"], Xe = { key: 0 }, Ye = ["onUpdate:modelValue", "type", "placeholder"], Ze = { class: "cody-request-actions" }, Je = ["disabled"], et = { class: "cody-approval-risk-heading" }, tt = ["data-level"], ot = { class: "cody-approval-risk-subject" }, st = {
  key: 0,
  class: "cody-approval-risk-labels"
}, at = {
  key: 1,
  class: "cody-approval-risk-details"
}, nt = { class: "cody-approval-risk-recommendation" }, lt = { key: 1 }, it = {
  key: 2,
  class: "cody-request-actions"
}, rt = /* @__PURE__ */ W({
  __name: "CodyRequestCard",
  props: {
    request: {}
  },
  emits: ["resolveApproval", "resolveQuestion"],
  setup(t, { emit: l }) {
    const i = t, c = l, e = $e({}), m = O(() => ye(i.request.params)), b = O(() => Ne(i.request.params)), g = O(() => i.request.kind === "approval" ? Me({ method: i.request.method, params: i.request.params }) : null), v = O(() => m.value.length > 0 && m.value.every((S) => {
      var w;
      return !!((w = e[S.id]) != null && w.trim());
    }));
    ae(() => i.request.id, () => {
      for (const S of Object.keys(e)) delete e[S];
    });
    function s() {
      v.value && c("resolveQuestion", i.request.id, Object.fromEntries(m.value.map((S) => [S.id, { answers: [e[S.id].trim()] }])));
    }
    return (S, w) => (r(), u("article", {
      class: "cody-request-card",
      "data-kind": t.request.kind
    }, [
      p("div", Qe, [
        p("strong", null, $(t.request.kind === "approval" ? "需要你的确认" : "Codex 需要补充信息"), 1),
        w[2] || (w[2] = p("small", null, "Agent 已暂停等待", -1))
      ]),
      t.request.kind === "question" && m.value.length ? (r(), u(M, { key: 0 }, [
        (r(!0), u(M, null, U(m.value, (d) => (r(), u("fieldset", {
          key: d.id,
          class: "cody-question-field"
        }, [
          p("legend", null, [
            d.header ? (r(), u("span", Ke, $(d.header), 1)) : A("", !0),
            ne($(d.question), 1)
          ]),
          d.options.length ? (r(), u("div", We, [
            (r(!0), u(M, null, U(d.options, (L) => (r(), u("button", {
              key: L.label,
              type: "button",
              class: le({ selected: e[d.id] === L.label }),
              onClick: (T) => e[d.id] = L.label
            }, [
              p("strong", null, $(L.label), 1),
              L.description ? (r(), u("small", Xe, $(L.description), 1)) : A("", !0)
            ], 10, Ge))), 128))
          ])) : A("", !0),
          d.options.length === 0 || d.isOther ? we((r(), u("input", {
            key: 1,
            "onUpdate:modelValue": (L) => e[d.id] = L,
            type: d.isSecret ? "password" : "text",
            placeholder: d.options.length ? "其他回答…" : "输入回答…",
            onKeyup: Se(s, ["enter"])
          }, null, 40, Ye)), [
            [Ce, e[d.id]]
          ]) : A("", !0)
        ]))), 128)),
        p("div", Ze, [
          p("button", {
            type: "button",
            disabled: !v.value,
            onClick: s
          }, "提交回答", 8, Je)
        ])
      ], 64)) : (r(), u(M, { key: 1 }, [
        g.value ? (r(), u(M, { key: 0 }, [
          p("div", et, [
            p("div", null, [
              p("strong", null, $(g.value.title), 1),
              p("p", null, $(g.value.description), 1)
            ]),
            p("span", {
              class: "cody-approval-risk-level",
              "data-level": g.value.level
            }, $(g.value.level), 9, tt)
          ]),
          p("code", ot, $(g.value.subject), 1),
          g.value.riskLabels.length ? (r(), u("ul", st, [
            (r(!0), u(M, null, U(g.value.riskLabels, (d) => (r(), u("li", { key: d }, $(d), 1))), 128))
          ])) : A("", !0),
          g.value.impacts.length ? (r(), u("details", at, [
            w[3] || (w[3] = p("summary", null, "查看影响", -1)),
            p("ul", null, [
              (r(!0), u(M, null, U(g.value.impacts, (d) => (r(), u("li", { key: d }, $(d), 1))), 128))
            ])
          ])) : A("", !0),
          p("p", nt, $(g.value.recommendation), 1)
        ], 64)) : (r(), u("p", lt, $(b.value), 1)),
        t.request.kind === "approval" ? (r(), u("div", it, [
          p("button", {
            type: "button",
            onClick: w[0] || (w[0] = (d) => c("resolveApproval", t.request.id, "accept"))
          }, "允许一次"),
          p("button", {
            type: "button",
            "data-tone": "danger",
            onClick: w[1] || (w[1] = (d) => c("resolveApproval", t.request.id, "decline"))
          }, "拒绝")
        ])) : A("", !0)
      ], 64))
    ], 8, He));
  }
}), dt = ["data-variant"], ut = {
  key: 0,
  class: "cody-conversation-loading",
  role: "status"
}, ct = {
  key: 1,
  class: "cody-conversation-empty"
}, mt = {
  key: 0,
  class: "cody-worked-divider"
}, pt = ["data-role"], gt = ["data-role"], ft = { class: "cody-message-stack" }, vt = { class: "cody-message-label" }, kt = {
  key: 0,
  class: "cody-message-skills"
}, yt = {
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
}, Mt = ["data-tone"], to = /* @__PURE__ */ W({
  __name: "CodyConversation",
  props: {
    entries: {},
    loading: { type: Boolean },
    variant: { default: "standalone" }
  },
  emits: ["copy", "openFile", "resolveApproval", "resolveQuestion"],
  setup(t, { emit: l }) {
    const i = l, c = z({});
    function e(g) {
      c.value = {
        ...c.value,
        [g]: c.value[g] !== !0
      };
    }
    function m(g, v) {
      i("resolveApproval", g, v);
    }
    function b(g, v) {
      i("resolveQuestion", g, v);
    }
    return (g, v) => (r(), u("section", {
      class: "cody-conversation",
      "data-variant": t.variant,
      "data-cody-component": "conversation-surface"
    }, [
      t.loading ? (r(), u("div", ut, "正在同步对话…")) : t.entries.length === 0 ? (r(), u("div", ct, [
        K(g.$slots, "empty", {}, () => [
          v[2] || (v[2] = ne("开始这个需求的开发", -1))
        ])
      ])) : (r(!0), u(M, { key: 2 }, U(t.entries, (s) => {
        var S, w;
        return r(), u(M, {
          key: s.id
        }, [
          s.kind === "worked" ? (r(), u("div", mt, [
            p("span", null, $(s.label), 1)
          ])) : s.kind === "message" ? (r(), u("article", {
            key: 1,
            class: "cody-message",
            "data-role": s.message.role
          }, [
            p("div", {
              class: "cody-message-identity",
              "data-role": s.message.role
            }, $(s.message.role === "user" ? "你" : "CW"), 9, gt),
            p("div", ft, [
              p("div", vt, $(s.message.role === "user" ? "你" : s.message.role === "assistant" ? "Codex Agent" : "系统"), 1),
              (S = s.message.skills) != null && S.length ? (r(), u("ul", kt, [
                (r(!0), u(M, null, U(s.message.skills, (d) => (r(), u("li", {
                  key: `${d.name}:${d.path}`
                }, "$" + $(d.displayName || d.name), 1))), 128))
              ])) : A("", !0),
              s.message.text ? (r(), u("div", yt, [
                K(g.$slots, "markdown", {
                  message: s.message
                }, () => [
                  N(ge, {
                    text: s.message.text,
                    onOpenFile: v[0] || (v[0] = (d) => i("openFile", d))
                  }, null, 8, ["text"])
                ])
              ])) : A("", !0),
              (w = s.message.images) != null && w.length ? (r(), u("div", bt, [
                (r(!0), u(M, null, U(s.message.images, (d) => (r(), u("img", {
                  key: d,
                  src: d,
                  alt: "对话图片",
                  loading: "lazy"
                }, null, 8, ht))), 128))
              ])) : A("", !0),
              s.message.outbox ? (r(), u("p", {
                key: 3,
                class: le(["cody-message-outbox", s.message.outbox.status]),
                role: "status"
              }, $(s.message.outbox.status === "failed" ? `发送失败${s.message.outbox.lastError ? `：${s.message.outbox.lastError}` : ""}` : s.message.outbox.status === "queued" ? "已加入发送队列" : "正在发送…"), 3)) : A("", !0),
              s.message.text ? (r(), u("button", {
                key: 4,
                class: "cody-copy-button",
                type: "button",
                onClick: (d) => i("copy", s.message.text)
              }, "复制", 8, $t)) : A("", !0)
            ])
          ], 8, pt)) : s.kind === "tool" ? (r(), u("details", {
            key: 2,
            class: "cody-tool-card",
            "data-tone": I(de)(s.tool.status),
            open: I(de)(s.tool.status) === "working"
          }, [
            p("summary", null, [
              v[3] || (v[3] = p("span", null, "⌁", -1)),
              p("strong", null, $(s.tool.title), 1),
              p("small", null, $(s.tool.status), 1)
            ]),
            p("p", null, $(s.tool.summary), 1),
            s.tool.details.length ? (r(), u("ul", St, [
              (r(!0), u(M, null, U(s.tool.details, (d) => (r(), u("li", { key: d }, $(d), 1))), 128))
            ])) : A("", !0),
            s.tool.output ? (r(), u(M, { key: 1 }, [
              p("pre", null, $(c.value[s.id] ? s.tool.output : I(Te)(s.tool.output)), 1),
              I(De)(s.tool.output) ? (r(), u("button", {
                key: 0,
                class: "cody-tool-output-toggle",
                type: "button",
                onClick: (d) => e(s.id)
              }, $(I(Re)(c.value[s.id] === !0)), 9, Ct)) : A("", !0)
            ], 64)) : A("", !0)
          ], 8, wt)) : s.kind === "reasoning" ? (r(), u("details", xt, [
            p("summary", null, "✦ " + $(s.title || "推理过程"), 1),
            p("pre", null, $(s.text), 1)
          ])) : s.kind === "plan" ? (r(), u("details", At, [
            v[4] || (v[4] = p("summary", null, "计划", -1)),
            N(ge, {
              text: s.text,
              onOpenFile: v[1] || (v[1] = (d) => i("openFile", d))
            }, null, 8, ["text"])
          ])) : s.kind === "request" ? K(g.$slots, "request", {
            request: s.request
          }, () => [
            N(rt, {
              request: s.request,
              onResolveApproval: m,
              onResolveQuestion: b
            }, null, 8, ["request"])
          ], void 0, 5) : s.kind === "failure" ? (r(), u("details", qt, [
            v[5] || (v[5] = p("summary", null, "本次回复失败", -1)),
            p("p", null, $(s.text), 1)
          ])) : s.kind === "interrupted" ? (r(), u("article", Lt, $(s.text), 1)) : s.kind === "activity" ? (r(), u("article", {
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
          ], 8, Mt)) : A("", !0)
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
}, It = ["id", "aria-selected", "onMouseenter", "onMousedown"], Ut = { class: "cody-composer-skill-option-name" }, Et = {
  key: 0,
  class: "cody-composer-skill-option-description"
}, zt = { class: "cody-composer-controls" }, Pt = {
  class: "cody-composer-settings",
  "aria-label": "运行设置"
}, jt = { class: "cody-composer-actions" }, Ft = ["disabled"], Vt = ["disabled", "aria-label", "title"], Nt = {
  key: 2,
  class: "cody-composer-policy"
}, oo = /* @__PURE__ */ W({
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
  setup(t, { emit: l }) {
    const i = W({
      name: "CodyComposerSelect",
      props: { label: { type: String, required: !0 }, modelValue: { type: String, required: !0 }, options: { type: Array, required: !0 }, disabled: Boolean },
      emits: ["update:modelValue"],
      setup(a, { emit: o }) {
        return () => oe("label", { class: "cody-composer-compact-control", title: a.label, "data-control": a.label }, [
          oe("select", { value: a.modelValue, disabled: a.disabled, "aria-label": a.label, onChange: (n) => o("update:modelValue", n.target.value) }, a.options.map((n) => oe("option", { value: n.value }, n.label)))
        ]);
      }
    }), c = t, e = l, m = z(null), b = z(c.draft), g = z(null), v = z(0), s = xe(), S = `${s}-skill-menu`, w = O(() => {
      const a = g.value;
      return a ? c.skills.filter((o) => !c.selectedSkills.includes(o.value)).filter((o) => a.query ? `${o.label}
${o.description ?? ""}`.toLowerCase().includes(a.query) : !0).slice(0, 8) : [];
    }), d = O(() => g.value !== null), L = O(() => d.value && w.value.length ? F(Math.min(v.value, w.value.length - 1)) : void 0), T = O(() => {
      var a;
      return ((a = c.permissionOptions.find((o) => o.value === c.selectedPermission)) == null ? void 0 : a.description) ?? "";
    }), E = O(() => !c.disabled && Ee({ text: c.draft, skills: c.selectedSkills })), j = O(() => c.isRunning && c.selectedSubmitMode === "steer" ? "发送引导" : c.isRunning ? "加入队列" : "发送");
    ae(() => c.draft, (a) => {
      b.value = a;
    });
    function X(a, o) {
      var n;
      return ((n = a.find((k) => k.value === o)) == null ? void 0 : n.label) ?? o;
    }
    function J(a) {
      e("update:selected-skills", c.selectedSkills.filter((o) => o !== a));
    }
    function F(a) {
      return `${s}-skill-option-${String(a)}`;
    }
    function H(a, o) {
      g.value = Pe(a, o, "$"), v.value = 0;
    }
    function Y(a) {
      const o = a.target;
      b.value = o.value, e("update:draft", o.value), H(o.value, o.selectionStart);
    }
    function Z(a) {
      const o = a.target;
      H(o.value, o.selectionStart);
    }
    function ee() {
      window.setTimeout(() => {
        g.value = null;
      }, 0);
    }
    function Q(a) {
      const o = g.value;
      if (!o) return;
      const n = m.value, k = (n == null ? void 0 : n.value) || b.value, y = ze(k, o);
      c.selectedSkills.includes(a) || e("update:selected-skills", [...c.selectedSkills, a]), e("update:draft", y.text), b.value = y.text, g.value = null, fe(() => {
        const D = m.value;
        D == null || D.focus(), D == null || D.setSelectionRange(y.cursor, y.cursor);
      });
    }
    function f(a) {
      if (d.value) {
        if (a.key === "Escape") {
          a.preventDefault(), g.value = null;
          return;
        }
        if (a.key === "ArrowDown" || a.key === "ArrowUp") {
          a.preventDefault();
          const o = w.value.length;
          o && (v.value = (v.value + (a.key === "ArrowDown" ? 1 : -1) + o) % o);
          return;
        }
        if (a.key === "Enter" && !a.ctrlKey && !a.metaKey && w.value.length) {
          a.preventDefault(), Q(w.value[Math.min(v.value, w.value.length - 1)].value);
          return;
        }
      }
      a.key !== "Enter" || a.isComposing || !a.ctrlKey && !a.metaKey || (a.preventDefault(), h());
    }
    function h() {
      E.value && e("send");
    }
    return (a, o) => (r(), u("form", {
      class: "cody-composer",
      "data-variant": t.variant,
      "data-cody-component": "composer-surface",
      onSubmit: ie(h, ["prevent"])
    }, [
      p("div", Dt, [
        t.selectedSkills.length ? (r(), u("div", Rt, [
          (r(!0), u(M, null, U(t.selectedSkills, (n) => (r(), u("span", {
            key: n,
            class: "cody-composer-chip"
          }, [
            ne(" $" + $(X(t.skills, n)) + " ", 1),
            p("button", {
              type: "button",
              disabled: t.disabled,
              "aria-label": `移除 Skill ${X(t.skills, n)}`,
              onClick: (k) => J(n)
            }, "×", 8, _t)
          ]))), 128))
        ])) : A("", !0),
        p("textarea", {
          ref_key: "draftInputRef",
          ref: m,
          value: t.draft,
          rows: "1",
          disabled: t.disabled,
          placeholder: t.placeholder,
          "aria-expanded": d.value,
          "aria-controls": d.value ? S : void 0,
          "aria-activedescendant": L.value,
          "aria-autocomplete": "list",
          onInput: Y,
          onClick: Z,
          onKeyup: Z,
          onBlur: ee,
          onKeydown: f
        }, null, 40, Ot),
        d.value ? (r(), u("div", {
          key: 1,
          id: S,
          class: "cody-composer-skill-menu",
          role: "listbox",
          "aria-label": "可引用 Skills"
        }, [
          w.value.length === 0 ? (r(), u("p", Bt, "没有匹配的 Skill")) : (r(!0), u(M, { key: 1 }, U(w.value, (n, k) => (r(), u("button", {
            id: F(k),
            key: n.value,
            class: le(["cody-composer-skill-option", { active: k === v.value }]),
            type: "button",
            role: "option",
            "aria-selected": k === v.value,
            onMouseenter: (y) => v.value = k,
            onMousedown: ie((y) => Q(n.value), ["prevent"])
          }, [
            p("span", Ut, "$" + $(n.label), 1),
            n.description ? (r(), u("span", Et, $(n.description), 1)) : A("", !0)
          ], 42, It))), 128))
        ])) : A("", !0),
        p("div", zt, [
          p("div", Pt, [
            K(a.$slots, "leading"),
            t.collaborationModes.length ? (r(), re(I(i), {
              key: 0,
              label: "协作模式",
              "model-value": t.selectedCollaborationMode,
              options: t.collaborationModes,
              disabled: t.disabled || t.isRunning,
              "onUpdate:modelValue": o[0] || (o[0] = (n) => e("update:collaboration-mode", n))
            }, null, 8, ["model-value", "options", "disabled"])) : A("", !0),
            N(I(i), {
              label: "提交策略",
              "model-value": t.selectedSubmitMode,
              options: t.submitModes,
              disabled: t.disabled,
              "onUpdate:modelValue": o[1] || (o[1] = (n) => e("update:submit-mode", n))
            }, null, 8, ["model-value", "options", "disabled"]),
            t.models.length ? (r(), re(I(i), {
              key: 1,
              label: "模型",
              "model-value": t.selectedModel,
              options: t.models,
              disabled: t.disabled || t.isRunning,
              "onUpdate:modelValue": o[2] || (o[2] = (n) => e("update:model", n))
            }, null, 8, ["model-value", "options", "disabled"])) : A("", !0),
            N(I(i), {
              label: "推理强度",
              "model-value": t.selectedReasoning,
              options: t.reasoningOptions,
              disabled: t.disabled || t.isRunning,
              "onUpdate:modelValue": o[3] || (o[3] = (n) => e("update:reasoning", n))
            }, null, 8, ["model-value", "options", "disabled"]),
            N(I(i), {
              label: "权限",
              "model-value": t.selectedPermission,
              options: t.permissionOptions,
              disabled: t.disabled || t.isRunning,
              "onUpdate:modelValue": o[4] || (o[4] = (n) => e("update:permission", n))
            }, null, 8, ["model-value", "options", "disabled"]),
            K(a.$slots, "controls")
          ]),
          p("div", jt, [
            t.isRunning ? (r(), u("button", {
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
            ])], 8, Ft)) : A("", !0),
            p("button", {
              class: "cody-composer-send",
              type: "submit",
              disabled: !E.value,
              "aria-label": j.value,
              title: j.value
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
        T.value ? (r(), u("p", Nt, $(T.value), 1)) : A("", !0)
      ])
    ], 40, Tt));
  }
});
function so() {
  const t = Ae(se());
  let l = null, i = null, c = 0;
  const e = () => {
    c += 1, i == null || i(), i = null, l == null || l.dispose(), l = null;
  }, m = async (d, L) => {
    e(), t.value = se(d);
    const T = c, E = je(d, L);
    l = E, i = E.subscribe((j) => {
      l === E && c === T && (t.value = j);
    }), await E.start();
  }, b = async () => {
    await (l == null ? void 0 : l.refresh());
  }, g = (d) => l == null ? void 0 : l.enqueueUserMessage(d), v = (d, L) => l == null ? void 0 : l.bindQueuedUserMessage(d, L), s = (d, L) => l == null ? void 0 : l.failQueuedUserMessage(d, L), S = (d = "") => {
    e(), t.value = se(d);
  }, w = () => {
    e();
  };
  return qe() && Le(w), {
    state: O(() => t.value),
    connect: m,
    enqueueUserMessage: g,
    bindQueuedUserMessage: v,
    failQueuedUserMessage: s,
    refresh: b,
    reset: S,
    dispose: w
  };
}
export {
  oo as CodyComposer,
  to as CodyConversation,
  ge as CodyMarkdown,
  rt as CodyRequestCard,
  G as DEFAULT_CODY_MARKDOWN_LABELS,
  eo as conversationEntriesFromState,
  ye as questionFieldsFromParams,
  me as renderCodyMarkdown,
  Ne as requestSummary,
  pe as stabilizeStreamingMarkdown,
  so as useConversationController
};
