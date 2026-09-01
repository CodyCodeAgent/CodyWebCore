import { defineComponent as Q, computed as O, ref as F, watch as ae, onMounted as be, onBeforeUnmount as he, openBlock as i, createElementBlock as d, Fragment as T, createElementVNode as m, nextTick as fe, reactive as $e, toDisplayString as $, renderList as I, createCommentVNode as q, createTextVNode as ne, normalizeClass as le, withDirectives as we, withKeys as Ce, vModelDynamic as Se, renderSlot as G, createVNode as H, unref as B, h as oe, useId as xe, withModifiers as re, createBlock as ie, shallowRef as Ae, getCurrentScope as qe, onScopeDispose as Me } from "vue";
import { buildApprovalRiskSummary as Le, toolStatusTone as de, buildToolOutputPreview as Te, isToolOutputTruncated as De, toolOutputToggleLabel as _e } from "@codycodeagent/cody-web-core/presentation";
import ve from "dompurify";
import Re from "markdown-it";
import Oe from "markdown-it-footnote";
import Ee from "markdown-it-task-lists";
import { conversationFeedFromState as Be, formatTurnDuration as Ie, createConversationState as se } from "@codycodeagent/cody-web-core/conversation";
import { composerHasContent as Ue, removeComposerTrigger as Fe, findComposerTrigger as ze } from "@codycodeagent/cody-web-core/composer";
import { createConversationController as Pe } from "@codycodeagent/cody-web-core/client";
const X = {
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
}, _ = new Re({ breaks: !0, html: !1, linkify: !0, typographer: !1 });
_.use(Ee, { enabled: !1, label: !0, labelAfter: !0 });
_.use(Oe);
function E(t, l) {
  return `<button type="button" class="markdown-tool-button" data-markdown-action="${t}" aria-label="${l}" title="${l}">${l}</button>`;
}
function ye(t, l = "", r = X) {
  const c = l.toLowerCase();
  if (c === "mermaid" || c === "plantuml" || c === "puml") {
    const L = c === "mermaid" ? "mermaid" : "plantuml";
    return `<div class="markdown-diagram-shell" data-diagram-engine="${L}"><header class="markdown-diagram-toolbar"><span>${L}</span><span class="markdown-diagram-actions">${E("diagram-zoom-out", r.zoomOut)}${E("diagram-fit", r.fit)}${E("diagram-zoom-in", r.zoomIn)}${E("diagram-source", r.source)}${E("diagram-fullscreen", r.fullscreen)}${E("diagram-export-svg", "SVG")}${E("diagram-export-png", "PNG")}</span></header><div class="markdown-diagram-stage" role="img" aria-label="${r.diagramAria(L)}"><p class="markdown-diagram-status">${r.rendering(L)}</p></div><pre class="markdown-diagram-source" hidden><code>${_.utils.escapeHtml(t)}</code></pre></div>
`;
  }
  const e = t.replace(/\n$/u, "").split(`
`), p = e.length <= 2 && e.every((L) => L.length <= 96), b = e.length > 10, g = l || "text", v = [p ? "is-compact-code" : "", /^[A-Za-z0-9_-]+$/u.test(l) ? `language-${l}` : ""].filter(Boolean).join(" "), s = v ? ` class="${v}"` : "", C = [p ? "is-compact" : "", b ? "is-collapsible is-collapsed" : ""].filter(Boolean).join(" "), w = b ? `${g} · ${r.lineCount(e.length)}` : g, u = b ? `<button type="button" class="markdown-tool-button markdown-code-collapse" data-markdown-action="toggle-code" aria-label="${r.collapseCode}" title="${r.collapseCode}" aria-expanded="false">${r.collapseCode}</button>` : "", S = b ? `<div class="markdown-code-expand"><button type="button" data-markdown-action="toggle-code" aria-expanded="false">${r.expandCode(e.length)}</button></div>` : "";
  return `<div class="markdown-code-host"><div class="markdown-code-shell${C ? ` ${C}` : ""}" data-language="${g}" data-code-lines="${String(e.length)}"><header class="markdown-code-toolbar"><span>${w}</span><span class="markdown-code-actions">${u}${E("wrap-code", r.wrap)}${E("copy-code", r.copy)}${E("save-code", r.save)}</span></header><pre class="markdown-code-block${p ? " is-compact" : ""}"><code${s}>${_.utils.escapeHtml(t)}</code></pre>${S}</div></div>
`;
}
_.renderer.rules.fence = (t, l, r, c) => {
  const e = t[l];
  return ye(e.content, e.info.trim().split(/\s+/u)[0] ?? "", c.labels);
};
_.renderer.rules.code_block = (t, l, r, c) => ye(t[l].content, "", c.labels);
_.renderer.rules.table_open = (t, l, r, c) => {
  const e = c.labels ?? X;
  return `<section class="markdown-table-shell" role="region" aria-label="${e.dataTable}" tabindex="0"><header class="markdown-table-toolbar">${E("copy-table", e.copyCsv)}</header><div class="markdown-table-scroll"><table>
`;
};
_.renderer.rules.table_close = () => `</table></div></section>
`;
const ce = _.renderer.rules.code_inline;
_.renderer.rules.code_inline = (t, l, r, c, e) => {
  const p = t[l].content, b = p.match(/^(.+?\.[A-Za-z0-9_-]{1,12})(?::(\d+))?$/u);
  if (!b || /\s/u.test(p)) return ce ? ce(t, l, r, c, e) : e.renderToken(t, l, r);
  const g = _.utils.escapeHtml(b[1]), v = b[2] ?? "", s = c.labels ?? X;
  return `<button type="button" class="markdown-file-link" data-markdown-action="open-file" data-file-path="${g}" data-file-line="${v}" title="${s.openFile(g)}"><code>${_.utils.escapeHtml(p)}</code></button>`;
};
const ue = _.renderer.rules.link_open;
_.renderer.rules.link_open = (t, l, r, c, e) => {
  const p = t[l];
  return /^https?:\/\//u.test(p.attrGet("href") ?? "") && (p.attrSet("target", "_blank"), p.attrSet("rel", "noopener noreferrer")), ue ? ue(t, l, r, c, e) : e.renderToken(t, l, r);
};
function me(t, l = X) {
  return ve.sanitize(_.render(t, { labels: l }), {
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
const je = ["innerHTML"], Ve = ["src"], ge = /* @__PURE__ */ Q({
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
    const r = t, c = l, e = O(() => r.labels ?? X), p = F(null), b = F(null), g = F(me(pe(r.text), e.value)), v = F(""), s = /* @__PURE__ */ new Set();
    let C = 0, w = 0;
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
    async function S(f) {
      window.clearTimeout(C), C = window.setTimeout(async () => {
        g.value = me(pe(f), e.value), await fe(), L();
      }, r.renderDelay);
    }
    async function L() {
      var a, o, n, y, k, D;
      for (const x of Array.from(((a = p.value) == null ? void 0 : a.querySelectorAll("td")) ?? []))
        /^-?[\d,.]+%?$/u.test(((o = x.textContent) == null ? void 0 : o.trim()) ?? "") && (x.dataset.numeric = "true");
      for (const x of Array.from(((n = p.value) == null ? void 0 : n.querySelectorAll("img")) ?? []))
        x.addEventListener("error", () => {
          x.alt = x.alt || "图片加载失败", x.classList.add("is-load-error");
        }, { once: !0 });
      P();
      for (const [x, A] of Array.from(((y = p.value) == null ? void 0 : y.querySelectorAll(".markdown-code-shell")) ?? []).entries()) {
        A.dataset.codeIndex = String(x), A.classList.contains("is-collapsible") && s.has(x) && A.classList.remove("is-collapsed");
        for (const M of Array.from(A.querySelectorAll('[data-markdown-action="toggle-code"]')))
          M.setAttribute("aria-expanded", String(!A.classList.contains("is-collapsed")));
        const R = A.querySelector("pre"), z = A.querySelector('[data-markdown-action="wrap-code"]');
        R && z && (z.hidden = R.scrollWidth <= R.clientWidth + 2, z.setAttribute("aria-pressed", String(A.classList.contains("is-wrapped"))));
      }
      await U();
      const f = Array.from(((k = p.value) == null ? void 0 : k.querySelectorAll('pre code[class*="language-"]')) ?? []);
      if (f.length === 0) return;
      const h = (await import("highlight.js/lib/core")).default;
      for (const x of f) {
        const A = ((D = Array.from(x.classList).find((M) => M.startsWith("language-"))) == null ? void 0 : D.slice(9)) ?? "", R = u[A];
        if (!R || x.dataset.highlighted === "yes") continue;
        const z = await R();
        h.getLanguage(A) || h.registerLanguage(A, z.default), x.innerHTML = h.highlight(x.textContent ?? "", { language: A }).value, x.dataset.highlighted = "yes";
      }
    }
    function P() {
      var h;
      if (!r.resolveAssetUrl) return;
      const f = /\.(?:svg|png|jpe?g|gif|webp)(?:[?#].*)?$/iu;
      for (const a of Array.from(((h = p.value) == null ? void 0 : h.querySelectorAll("a[href]")) ?? [])) {
        const o = a.getAttribute("href") ?? "";
        if (!f.test(o) || /^(?:data|blob):/iu.test(o)) continue;
        const n = r.resolveAssetUrl(o);
        n && (a.href = n, a.target = "_blank", a.rel = "noopener noreferrer");
      }
    }
    async function U() {
      var h, a, o, n;
      const f = Array.from(((h = p.value) == null ? void 0 : h.querySelectorAll(".markdown-diagram-shell:not([data-rendered])")) ?? []);
      for (const y of f) {
        y.dataset.rendered = "loading";
        const k = y.dataset.diagramEngine === "plantuml" ? "plantuml" : "mermaid", D = ((a = y.querySelector("code")) == null ? void 0 : a.textContent) ?? "", x = y.querySelector(".markdown-diagram-stage");
        if (x)
          try {
            let A = await ((o = r.renderDiagram) == null ? void 0 : o.call(r, { engine: k, source: D, dark: r.dark }));
            if (!A && k === "mermaid") {
              const { default: R } = await import("mermaid");
              R.initialize({ startOnLoad: !1, securityLevel: "strict", theme: r.dark ? "dark" : "default", htmlLabels: !1, flowchart: { htmlLabels: !1, useMaxWidth: !1 } }), A = (await R.render(`cody-diagram-${String(++w)}`, D)).svg;
            }
            if (!A) throw new Error(k === "plantuml" ? "当前环境未配置 PlantUML 渲染器" : "图表渲染失败");
            x.innerHTML = j(A), J(x), y.dataset.rendered = "yes", y.style.setProperty("--diagram-scale", "1");
          } catch (A) {
            x.textContent = A instanceof Error ? A.message : "图表渲染失败", x.classList.add("markdown-diagram-error"), (n = y.querySelector(".markdown-diagram-source")) == null || n.removeAttribute("hidden"), y.dataset.rendered = "error";
          }
      }
    }
    function j(f) {
      const h = ve.sanitize(f, { USE_PROFILES: { svg: !0, svgFilters: !0, html: !0 }, ADD_TAGS: ["foreignObject"], ADD_ATTR: ["xmlns"] }), a = h.trimStart().startsWith("<svg") ? h : `<svg xmlns="http://www.w3.org/2000/svg">${h}</svg>`, o = new DOMParser().parseFromString(a, "image/svg+xml");
      if (o.querySelector("parsererror")) return "";
      for (const n of o.querySelectorAll("*")) for (const y of Array.from(n.attributes)) /^on/iu.test(y.name) && n.removeAttribute(y.name);
      return o.querySelectorAll("script").forEach((n) => n.remove()), new XMLSerializer().serializeToString(o.documentElement);
    }
    function J(f) {
      if (f.dataset.panReady === "true") return;
      f.dataset.panReady = "true";
      let h = 0, a = 0, o = 0, n = 0;
      f.addEventListener("pointerdown", (k) => {
        k.button === 0 && (h = k.clientX, a = k.clientY, o = f.scrollLeft, n = f.scrollTop, f.setPointerCapture(k.pointerId), f.classList.add("is-panning"));
      }), f.addEventListener("pointermove", (k) => {
        f.hasPointerCapture(k.pointerId) && (f.scrollLeft = o - (k.clientX - h), f.scrollTop = n - (k.clientY - a));
      });
      const y = (k) => {
        f.hasPointerCapture(k.pointerId) && f.releasePointerCapture(k.pointerId), f.classList.remove("is-panning");
      };
      f.addEventListener("pointerup", y), f.addEventListener("pointercancel", y);
    }
    function V(f, h = 0) {
      const a = Number(f.style.getPropertyValue("--diagram-scale") || "1");
      f.style.setProperty("--diagram-scale", String(h === 0 ? 1 : Math.min(2.5, Math.max(0.4, a + h))));
    }
    function K(f, h) {
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
      var D, x, A, R, z;
      const h = f.target, a = h.closest("img");
      if (a) {
        v.value = a.currentSrc || a.src, (D = b.value) == null || D.showModal();
        return;
      }
      const o = h.closest("[data-markdown-action]");
      if (!o) return;
      const n = o.closest(".markdown-code-shell, .markdown-table-shell"), y = o.dataset.markdownAction;
      if (y === "copy-code" && Y(((x = n == null ? void 0 : n.querySelector("code")) == null ? void 0 : x.textContent) ?? "", o), y === "wrap-code") {
        const M = (n == null ? void 0 : n.classList.toggle("is-wrapped")) ?? !1;
        o.textContent = M && e.value.scroll || e.value.wrap, o.setAttribute("aria-pressed", String(M));
      }
      if (y === "save-code" && K(new Blob([((A = n == null ? void 0 : n.querySelector("code")) == null ? void 0 : A.textContent) ?? ""], { type: "text/plain" }), `snippet.${(n == null ? void 0 : n.dataset.language) || "txt"}`), y === "toggle-code" && (n != null && n.classList.contains("is-collapsible"))) {
        const M = Number(n.dataset.codeIndex ?? -1), N = !n.classList.toggle("is-collapsed");
        M >= 0 && (N ? s.add(M) : s.delete(M));
        for (const te of Array.from(n.querySelectorAll('[data-markdown-action="toggle-code"]'))) te.setAttribute("aria-expanded", String(N));
      }
      if (y === "copy-table" && Y(Z((n == null ? void 0 : n.querySelector("table")) ?? null), o), y === "open-file") {
        const M = o.dataset.filePath ?? "", N = ((R = r.cwd) == null ? void 0 : R.replace(/\/$/u, "")) ?? "", te = M.startsWith("/") && N && M.startsWith(`${N}/`) ? M.slice(N.length + 1) : M.replace(/^\.\//u, "");
        c("openFile", { path: te, line: Number(o.dataset.fileLine || 0) || 1 });
      }
      const k = o.closest(".markdown-diagram-shell");
      if (k && y === "diagram-zoom-in" && V(k, 0.2), k && y === "diagram-zoom-out" && V(k, -0.2), k && y === "diagram-fit" && V(k), k && y === "diagram-source") {
        const M = k.querySelector(".markdown-diagram-source");
        M && (M.hidden = !M.hidden);
      }
      if (k && y === "diagram-fullscreen" && ((z = k.requestFullscreen) == null || z.call(k)), k && y === "diagram-export-svg") {
        const M = k.querySelector("svg");
        M && K(new Blob([new XMLSerializer().serializeToString(M)], { type: "image/svg+xml" }), "diagram.svg");
      }
    }
    function W() {
      var f;
      (f = b.value) == null || f.close();
    }
    return ae(() => [r.text, r.labels], ([f]) => {
      S(f);
    }, { deep: !0 }), be(() => {
      L();
    }), he(() => window.clearTimeout(C)), (f, h) => (i(), d(T, null, [
      m("div", {
        ref_key: "rootRef",
        ref: p,
        class: "cody-markdown cody-markdown-renderer",
        innerHTML: g.value,
        onClick: ee
      }, null, 8, je),
      m("dialog", {
        ref_key: "imageDialogRef",
        ref: b,
        class: "cody-markdown-image-dialog",
        onClick: W
      }, [
        m("button", {
          type: "button",
          "aria-label": "关闭图片预览",
          onClick: W
        }, "×"),
        m("img", {
          src: v.value,
          alt: "Markdown 图片预览"
        }, null, 8, Ve)
      ], 512)
    ], 64));
  }
});
function ke(t) {
  if (!t || typeof t != "object") return [];
  const l = t;
  return (Array.isArray(l.questions) ? l.questions : []).flatMap((c, e) => {
    if (!c || typeof c != "object") return [];
    const p = c, b = typeof p.question == "string" ? p.question.trim() : "";
    if (!b) return [];
    const g = Array.isArray(p.options) ? p.options : [];
    return [{
      id: typeof p.id == "string" && p.id.trim() ? p.id.trim() : `question-${String(e + 1)}`,
      header: typeof p.header == "string" ? p.header.trim() : "",
      question: b,
      isOther: p.isOther === !0,
      isSecret: p.isSecret === !0,
      options: g.flatMap((v) => {
        if (!v || typeof v != "object") return [];
        const s = v, C = typeof s.label == "string" ? s.label.trim() : "";
        return C ? [{ label: C, description: typeof s.description == "string" ? s.description.trim() : "" }] : [];
      })
    }];
  });
}
function Ne(t) {
  var c;
  if (!t || typeof t != "object") return "Codex 请求执行一项受保护操作。";
  const l = t, r = l.reason ?? l.question ?? l.command;
  return typeof r == "string" && r.trim() ? r : ((c = ke(t)[0]) == null ? void 0 : c.question) ?? "Codex 请求执行一项受保护操作。";
}
function to(t) {
  var c;
  const l = [], r = (e) => {
    if (e.kind === "reasoning") {
      l.push({ id: e.id, kind: "reasoning", text: e.text });
      return;
    }
    if (!e.tool.summary && e.tool.details.length === 0 && !e.tool.output && e.tool.kind !== "fileChange") return;
    if (e.tool.kind !== "fileChange") {
      l.push({ id: e.id, kind: "tool", tool: e.tool });
      return;
    }
    const p = `file-group:${e.turnId ?? e.id}`, b = l.at(-1);
    if (!b || b.kind !== "tool" || b.id !== p) {
      const s = [...new Set(e.tool.details)], C = {
        id: p,
        kind: "tool",
        tool: {
          ...e.tool,
          title: s.length > 1 ? `文件变更 · ${String(s.length)} 个文件` : "文件变更",
          summary: s.length ? `${String(s.length)} 个文件已更新` : e.tool.summary,
          details: s
        }
      };
      l.push(C);
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
  for (const e of Be(t))
    if (e.kind === "message") l.push({ id: e.id, kind: "message", message: e.message });
    else if (e.kind === "timeline") r(e.entry);
    else if (e.kind === "plan") l.push({ id: e.id, kind: "plan", text: e.plan.text });
    else if (e.kind === "request") l.push({ id: e.id, kind: "request", request: e.request });
    else if (e.kind === "turn" && e.status === "failed") l.push({ id: e.id, kind: "failure", text: e.error });
    else {
      if (e.kind === "turn" && e.status === "interrupted") continue;
      e.kind === "turn" && e.status === "completed" ? l.push({ id: e.id, kind: "worked", label: `Worked for ${Ie(e.durationMs ?? 0)}` }) : e.kind === "activity" && l.push({
        id: e.id,
        kind: "activity",
        title: e.status === "waiting" ? ((c = t.pendingRequests.find((p) => !p.turnId || p.turnId === e.turnId)) == null ? void 0 : c.kind) === "approval" ? "等待你的审批" : "等待你的回答" : e.label,
        detail: e.status === "waiting" ? "处理后 Codex 会继续本次回复" : e.status === "retrying" ? t.connection.status === "disconnected" ? "连接已中断，等待恢复" : "正在恢复本次回复" : t.connection.status === "connected" ? "实时更新中" : "等待恢复连接",
        tone: e.status
      });
    }
  return l;
}
const He = ["data-kind"], Ke = { class: "cody-request-heading" }, We = { key: 0 }, Ge = {
  key: 0,
  class: "cody-question-options"
}, Qe = ["onClick"], Xe = { key: 0 }, Ye = ["onUpdate:modelValue", "type", "placeholder"], Ze = { class: "cody-request-actions" }, Je = ["disabled"], et = { class: "cody-approval-risk-heading" }, tt = ["data-level"], ot = { class: "cody-approval-risk-subject" }, st = {
  key: 0,
  class: "cody-approval-risk-labels"
}, at = {
  key: 1,
  class: "cody-approval-risk-details"
}, nt = { class: "cody-approval-risk-recommendation" }, lt = { key: 1 }, rt = {
  key: 2,
  class: "cody-request-actions"
}, it = /* @__PURE__ */ Q({
  __name: "CodyRequestCard",
  props: {
    request: {}
  },
  emits: ["resolveApproval", "resolveQuestion"],
  setup(t, { emit: l }) {
    const r = t, c = l, e = $e({}), p = O(() => ke(r.request.params)), b = O(() => Ne(r.request.params)), g = O(() => r.request.kind === "approval" ? Le({ method: r.request.method, params: r.request.params }) : null), v = O(() => p.value.length > 0 && p.value.every((C) => {
      var w;
      return !!((w = e[C.id]) != null && w.trim());
    }));
    ae(() => r.request.id, () => {
      for (const C of Object.keys(e)) delete e[C];
    });
    function s() {
      v.value && c("resolveQuestion", r.request.id, Object.fromEntries(p.value.map((C) => [C.id, { answers: [e[C.id].trim()] }])));
    }
    return (C, w) => (i(), d("article", {
      class: "cody-request-card",
      "data-kind": t.request.kind
    }, [
      m("div", Ke, [
        m("strong", null, $(t.request.kind === "approval" ? "需要你的确认" : "Codex 需要补充信息"), 1),
        w[2] || (w[2] = m("small", null, "Agent 已暂停等待", -1))
      ]),
      t.request.kind === "question" && p.value.length ? (i(), d(T, { key: 0 }, [
        (i(!0), d(T, null, I(p.value, (u) => (i(), d("fieldset", {
          key: u.id,
          class: "cody-question-field"
        }, [
          m("legend", null, [
            u.header ? (i(), d("span", We, $(u.header), 1)) : q("", !0),
            ne($(u.question), 1)
          ]),
          u.options.length ? (i(), d("div", Ge, [
            (i(!0), d(T, null, I(u.options, (S) => (i(), d("button", {
              key: S.label,
              type: "button",
              class: le({ selected: e[u.id] === S.label }),
              onClick: (L) => e[u.id] = S.label
            }, [
              m("strong", null, $(S.label), 1),
              S.description ? (i(), d("small", Xe, $(S.description), 1)) : q("", !0)
            ], 10, Qe))), 128))
          ])) : q("", !0),
          u.options.length === 0 || u.isOther ? we((i(), d("input", {
            key: 1,
            "onUpdate:modelValue": (S) => e[u.id] = S,
            type: u.isSecret ? "password" : "text",
            placeholder: u.options.length ? "其他回答…" : "输入回答…",
            onKeyup: Ce(s, ["enter"])
          }, null, 40, Ye)), [
            [Se, e[u.id]]
          ]) : q("", !0)
        ]))), 128)),
        m("div", Ze, [
          m("button", {
            type: "button",
            disabled: !v.value,
            onClick: s
          }, "提交回答", 8, Je)
        ])
      ], 64)) : (i(), d(T, { key: 1 }, [
        g.value ? (i(), d(T, { key: 0 }, [
          m("div", et, [
            m("div", null, [
              m("strong", null, $(g.value.title), 1),
              m("p", null, $(g.value.description), 1)
            ]),
            m("span", {
              class: "cody-approval-risk-level",
              "data-level": g.value.level
            }, $(g.value.level), 9, tt)
          ]),
          m("code", ot, $(g.value.subject), 1),
          g.value.riskLabels.length ? (i(), d("ul", st, [
            (i(!0), d(T, null, I(g.value.riskLabels, (u) => (i(), d("li", { key: u }, $(u), 1))), 128))
          ])) : q("", !0),
          g.value.impacts.length ? (i(), d("details", at, [
            w[3] || (w[3] = m("summary", null, "查看影响", -1)),
            m("ul", null, [
              (i(!0), d(T, null, I(g.value.impacts, (u) => (i(), d("li", { key: u }, $(u), 1))), 128))
            ])
          ])) : q("", !0),
          m("p", nt, $(g.value.recommendation), 1)
        ], 64)) : (i(), d("p", lt, $(b.value), 1)),
        t.request.kind === "approval" ? (i(), d("div", rt, [
          m("button", {
            type: "button",
            onClick: w[0] || (w[0] = (u) => c("resolveApproval", t.request.id, "accept"))
          }, "允许一次"),
          m("button", {
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
}, pt = ["data-role"], gt = ["data-role"], ft = { class: "cody-message-stack" }, vt = { class: "cody-message-label" }, yt = {
  key: 0,
  class: "cody-message-skills"
}, kt = {
  key: 1,
  class: "cody-message-body"
}, bt = {
  key: 2,
  class: "cody-message-images"
}, ht = ["src"], $t = ["onClick"], wt = ["onClick"], Ct = ["data-tone", "open"], St = { key: 0 }, xt = ["onClick"], At = {
  key: 3,
  class: "cody-reasoning-card"
}, qt = {
  key: 4,
  class: "cody-plan-card",
  open: ""
}, Mt = {
  key: 6,
  class: "cody-failure-card"
}, Lt = {
  key: 7,
  class: "cody-interrupted-card",
  role: "status"
}, Tt = ["data-tone"], oo = /* @__PURE__ */ Q({
  __name: "CodyConversation",
  props: {
    entries: {},
    loading: { type: Boolean },
    variant: { default: "standalone" }
  },
  emits: ["copy", "openFile", "retryMessage", "resolveApproval", "resolveQuestion"],
  setup(t, { emit: l }) {
    const r = l, c = F({});
    function e(g) {
      c.value = {
        ...c.value,
        [g]: c.value[g] !== !0
      };
    }
    function p(g, v) {
      r("resolveApproval", g, v);
    }
    function b(g, v) {
      r("resolveQuestion", g, v);
    }
    return (g, v) => (i(), d("section", {
      class: "cody-conversation",
      "data-variant": t.variant,
      "data-cody-component": "conversation-surface"
    }, [
      t.loading ? (i(), d("div", ct, "正在同步对话…")) : t.entries.length === 0 ? (i(), d("div", ut, [
        G(g.$slots, "empty", {}, () => [
          v[2] || (v[2] = ne("开始这个需求的开发", -1))
        ])
      ])) : (i(!0), d(T, { key: 2 }, I(t.entries, (s) => {
        var C, w;
        return i(), d(T, {
          key: s.id
        }, [
          s.kind === "worked" ? (i(), d("div", mt, [
            m("span", null, $(s.label), 1)
          ])) : s.kind === "message" ? (i(), d("article", {
            key: 1,
            class: "cody-message",
            "data-role": s.message.role
          }, [
            m("div", {
              class: "cody-message-identity",
              "data-role": s.message.role
            }, $(s.message.role === "user" ? "你" : "CW"), 9, gt),
            m("div", ft, [
              m("div", vt, $(s.message.role === "user" ? "你" : s.message.role === "assistant" ? "Codex Agent" : "系统"), 1),
              (C = s.message.skills) != null && C.length ? (i(), d("ul", yt, [
                (i(!0), d(T, null, I(s.message.skills, (u) => (i(), d("li", {
                  key: `${u.name}:${u.path}`
                }, "$" + $(u.displayName || u.name), 1))), 128))
              ])) : q("", !0),
              s.message.text ? (i(), d("div", kt, [
                G(g.$slots, "markdown", {
                  message: s.message
                }, () => [
                  H(ge, {
                    text: s.message.text,
                    onOpenFile: v[0] || (v[0] = (u) => r("openFile", u))
                  }, null, 8, ["text"])
                ])
              ])) : q("", !0),
              (w = s.message.images) != null && w.length ? (i(), d("div", bt, [
                (i(!0), d(T, null, I(s.message.images, (u) => (i(), d("img", {
                  key: u,
                  src: u,
                  alt: "对话图片",
                  loading: "lazy"
                }, null, 8, ht))), 128))
              ])) : q("", !0),
              s.message.outbox ? (i(), d("div", {
                key: 3,
                class: le(["cody-message-outbox", s.message.outbox.status]),
                role: "status"
              }, [
                m("span", null, $(s.message.outbox.status === "failed" ? `发送失败${s.message.outbox.lastError ? `：${s.message.outbox.lastError}` : ""}` : s.message.outbox.status === "queued" ? "已加入发送队列" : "正在发送…"), 1),
                s.message.outbox.status === "failed" ? (i(), d("button", {
                  key: 0,
                  class: "cody-message-retry",
                  type: "button",
                  onClick: (u) => r("retryMessage", s.message)
                }, "重试此消息", 8, $t)) : q("", !0)
              ], 2)) : q("", !0),
              s.message.text ? (i(), d("button", {
                key: 4,
                class: "cody-copy-button",
                type: "button",
                onClick: (u) => r("copy", s.message.text)
              }, "复制", 8, wt)) : q("", !0)
            ])
          ], 8, pt)) : s.kind === "tool" ? (i(), d("details", {
            key: 2,
            class: "cody-tool-card",
            "data-tone": B(de)(s.tool.status),
            open: B(de)(s.tool.status) === "working"
          }, [
            m("summary", null, [
              v[3] || (v[3] = m("span", null, "⌁", -1)),
              m("strong", null, $(s.tool.title), 1),
              m("small", null, $(s.tool.status), 1)
            ]),
            m("p", null, $(s.tool.summary), 1),
            s.tool.details.length ? (i(), d("ul", St, [
              (i(!0), d(T, null, I(s.tool.details, (u) => (i(), d("li", { key: u }, $(u), 1))), 128))
            ])) : q("", !0),
            s.tool.output ? (i(), d(T, { key: 1 }, [
              m("pre", null, $(c.value[s.id] ? s.tool.output : B(Te)(s.tool.output)), 1),
              B(De)(s.tool.output) ? (i(), d("button", {
                key: 0,
                class: "cody-tool-output-toggle",
                type: "button",
                onClick: (u) => e(s.id)
              }, $(B(_e)(c.value[s.id] === !0)), 9, xt)) : q("", !0)
            ], 64)) : q("", !0)
          ], 8, Ct)) : s.kind === "reasoning" ? (i(), d("details", At, [
            m("summary", null, "✦ " + $(s.title || "推理过程"), 1),
            m("pre", null, $(s.text), 1)
          ])) : s.kind === "plan" ? (i(), d("details", qt, [
            v[4] || (v[4] = m("summary", null, "计划", -1)),
            H(ge, {
              text: s.text,
              onOpenFile: v[1] || (v[1] = (u) => r("openFile", u))
            }, null, 8, ["text"])
          ])) : s.kind === "request" ? G(g.$slots, "request", {
            request: s.request
          }, () => [
            H(it, {
              request: s.request,
              onResolveApproval: p,
              onResolveQuestion: b
            }, null, 8, ["request"])
          ], void 0, 5) : s.kind === "failure" ? (i(), d("details", Mt, [
            v[5] || (v[5] = m("summary", null, "本次回复失败", -1)),
            m("p", null, $(s.text), 1)
          ])) : s.kind === "interrupted" ? (i(), d("article", Lt, $(s.text), 1)) : s.kind === "activity" ? (i(), d("article", {
            key: 8,
            class: "cody-conversation-activity",
            "data-tone": s.tone,
            role: "status",
            "aria-live": "polite"
          }, [
            v[6] || (v[6] = m("span", {
              class: "cody-activity-pulse",
              "aria-hidden": "true"
            }, null, -1)),
            m("strong", null, $(s.title), 1),
            m("small", null, $(s.detail), 1)
          ], 8, Tt)) : q("", !0)
        ], 64);
      }), 128))
    ], 8, dt));
  }
}), Dt = ["data-variant"], _t = { class: "cody-composer-shell" }, Rt = {
  key: 0,
  class: "cody-composer-selected",
  "aria-label": "已引用 Skills"
}, Ot = ["disabled", "aria-label", "onClick"], Et = ["value", "disabled", "placeholder", "aria-expanded", "aria-controls", "aria-activedescendant"], Bt = {
  key: 0,
  class: "cody-composer-skill-status"
}, It = ["id", "aria-selected", "onMouseenter", "onMousedown"], Ut = { class: "cody-composer-skill-option-name" }, Ft = {
  key: 0,
  class: "cody-composer-skill-option-description"
}, zt = { class: "cody-composer-controls" }, Pt = {
  class: "cody-composer-settings",
  "aria-label": "运行设置"
}, jt = { class: "cody-composer-actions" }, Vt = ["disabled"], Nt = ["disabled", "aria-label", "title"], Ht = {
  key: 2,
  class: "cody-composer-policy"
}, so = /* @__PURE__ */ Q({
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
    const r = Q({
      name: "CodyComposerSelect",
      props: { label: { type: String, required: !0 }, modelValue: { type: String, required: !0 }, options: { type: Array, required: !0 }, disabled: Boolean },
      emits: ["update:modelValue"],
      setup(a, { emit: o }) {
        return () => oe("label", { class: "cody-composer-compact-control", title: a.label, "data-control": a.label }, [
          oe("select", { value: a.modelValue, disabled: a.disabled, "aria-label": a.label, onChange: (n) => o("update:modelValue", n.target.value) }, a.options.map((n) => oe("option", { value: n.value }, n.label)))
        ]);
      }
    }), c = t, e = l, p = F(null), b = F(c.draft), g = F(null), v = F(0), s = xe(), C = `${s}-skill-menu`, w = O(() => {
      const a = g.value;
      return a ? c.skills.filter((o) => !c.selectedSkills.includes(o.value)).filter((o) => a.query ? `${o.label}
${o.description ?? ""}`.toLowerCase().includes(a.query) : !0).slice(0, 8) : [];
    }), u = O(() => g.value !== null), S = O(() => u.value && w.value.length ? V(Math.min(v.value, w.value.length - 1)) : void 0), L = O(() => {
      var a;
      return ((a = c.permissionOptions.find((o) => o.value === c.selectedPermission)) == null ? void 0 : a.description) ?? "";
    }), P = O(() => !c.disabled && Ue({ text: c.draft, skills: c.selectedSkills })), U = O(() => c.isRunning && c.selectedSubmitMode === "steer" ? "发送引导" : c.isRunning ? "加入队列" : "发送");
    ae(() => c.draft, (a) => {
      b.value = a;
    });
    function j(a, o) {
      var n;
      return ((n = a.find((y) => y.value === o)) == null ? void 0 : n.label) ?? o;
    }
    function J(a) {
      e("update:selected-skills", c.selectedSkills.filter((o) => o !== a));
    }
    function V(a) {
      return `${s}-skill-option-${String(a)}`;
    }
    function K(a, o) {
      g.value = ze(a, o, "$"), v.value = 0;
    }
    function Y(a) {
      const o = a.target;
      b.value = o.value, e("update:draft", o.value), K(o.value, o.selectionStart);
    }
    function Z(a) {
      const o = a.target;
      K(o.value, o.selectionStart);
    }
    function ee() {
      window.setTimeout(() => {
        g.value = null;
      }, 0);
    }
    function W(a) {
      const o = g.value;
      if (!o) return;
      const n = p.value, y = (n == null ? void 0 : n.value) || b.value, k = Fe(y, o);
      c.selectedSkills.includes(a) || e("update:selected-skills", [...c.selectedSkills, a]), e("update:draft", k.text), b.value = k.text, g.value = null, fe(() => {
        const D = p.value;
        D == null || D.focus(), D == null || D.setSelectionRange(k.cursor, k.cursor);
      });
    }
    function f(a) {
      if (u.value) {
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
          a.preventDefault(), W(w.value[Math.min(v.value, w.value.length - 1)].value);
          return;
        }
      }
      a.key !== "Enter" || a.isComposing || !a.ctrlKey && !a.metaKey || (a.preventDefault(), h());
    }
    function h() {
      P.value && e("send");
    }
    return (a, o) => (i(), d("form", {
      class: "cody-composer",
      "data-variant": t.variant,
      "data-cody-component": "composer-surface",
      onSubmit: re(h, ["prevent"])
    }, [
      m("div", _t, [
        t.selectedSkills.length ? (i(), d("div", Rt, [
          (i(!0), d(T, null, I(t.selectedSkills, (n) => (i(), d("span", {
            key: n,
            class: "cody-composer-chip"
          }, [
            ne(" $" + $(j(t.skills, n)) + " ", 1),
            m("button", {
              type: "button",
              disabled: t.disabled,
              "aria-label": `移除 Skill ${j(t.skills, n)}`,
              onClick: (y) => J(n)
            }, "×", 8, Ot)
          ]))), 128))
        ])) : q("", !0),
        m("textarea", {
          ref_key: "draftInputRef",
          ref: p,
          value: t.draft,
          rows: "1",
          disabled: t.disabled,
          placeholder: t.placeholder,
          "aria-expanded": u.value,
          "aria-controls": u.value ? C : void 0,
          "aria-activedescendant": S.value,
          "aria-autocomplete": "list",
          onInput: Y,
          onClick: Z,
          onKeyup: Z,
          onBlur: ee,
          onKeydown: f
        }, null, 40, Et),
        u.value ? (i(), d("div", {
          key: 1,
          id: C,
          class: "cody-composer-skill-menu",
          role: "listbox",
          "aria-label": "可引用 Skills"
        }, [
          w.value.length === 0 ? (i(), d("p", Bt, "没有匹配的 Skill")) : (i(!0), d(T, { key: 1 }, I(w.value, (n, y) => (i(), d("button", {
            id: V(y),
            key: n.value,
            class: le(["cody-composer-skill-option", { active: y === v.value }]),
            type: "button",
            role: "option",
            "aria-selected": y === v.value,
            onMouseenter: (k) => v.value = y,
            onMousedown: re((k) => W(n.value), ["prevent"])
          }, [
            m("span", Ut, "$" + $(n.label), 1),
            n.description ? (i(), d("span", Ft, $(n.description), 1)) : q("", !0)
          ], 42, It))), 128))
        ])) : q("", !0),
        m("div", zt, [
          m("div", Pt, [
            G(a.$slots, "leading"),
            t.collaborationModes.length ? (i(), ie(B(r), {
              key: 0,
              label: "协作模式",
              "model-value": t.selectedCollaborationMode,
              options: t.collaborationModes,
              disabled: t.disabled || t.isRunning,
              "onUpdate:modelValue": o[0] || (o[0] = (n) => e("update:collaboration-mode", n))
            }, null, 8, ["model-value", "options", "disabled"])) : q("", !0),
            H(B(r), {
              label: "提交策略",
              "model-value": t.selectedSubmitMode,
              options: t.submitModes,
              disabled: t.disabled,
              "onUpdate:modelValue": o[1] || (o[1] = (n) => e("update:submit-mode", n))
            }, null, 8, ["model-value", "options", "disabled"]),
            t.models.length ? (i(), ie(B(r), {
              key: 1,
              label: "模型",
              "model-value": t.selectedModel,
              options: t.models,
              disabled: t.disabled || t.isRunning,
              "onUpdate:modelValue": o[2] || (o[2] = (n) => e("update:model", n))
            }, null, 8, ["model-value", "options", "disabled"])) : q("", !0),
            H(B(r), {
              label: "推理强度",
              "model-value": t.selectedReasoning,
              options: t.reasoningOptions,
              disabled: t.disabled || t.isRunning,
              "onUpdate:modelValue": o[3] || (o[3] = (n) => e("update:reasoning", n))
            }, null, 8, ["model-value", "options", "disabled"]),
            H(B(r), {
              label: "权限",
              "model-value": t.selectedPermission,
              options: t.permissionOptions,
              disabled: t.disabled || t.isRunning,
              "onUpdate:modelValue": o[4] || (o[4] = (n) => e("update:permission", n))
            }, null, 8, ["model-value", "options", "disabled"]),
            G(a.$slots, "controls")
          ]),
          m("div", jt, [
            t.isRunning ? (i(), d("button", {
              key: 0,
              class: "cody-composer-stop",
              type: "button",
              disabled: t.disabled,
              "aria-label": "停止当前回复",
              title: "停止当前回复",
              onClick: o[5] || (o[5] = (n) => e("stop"))
            }, [...o[6] || (o[6] = [
              m("span", {
                class: "cody-composer-stop-icon",
                "aria-hidden": "true"
              }, null, -1)
            ])], 8, Vt)) : q("", !0),
            m("button", {
              class: "cody-composer-send",
              type: "submit",
              disabled: !P.value,
              "aria-label": U.value,
              title: U.value
            }, [...o[7] || (o[7] = [
              m("svg", {
                viewBox: "0 0 24 24",
                "aria-hidden": "true"
              }, [
                m("path", { d: "M12 19V5m0 0-6 6m6-6 6 6" })
              ], -1)
            ])], 8, Nt)
          ])
        ]),
        L.value ? (i(), d("p", Ht, $(L.value), 1)) : q("", !0)
      ])
    ], 40, Dt));
  }
});
function ao() {
  const t = Ae(se());
  let l = null, r = null, c = 0;
  const e = () => {
    c += 1, r == null || r(), r = null, l == null || l.dispose(), l = null;
  }, p = async (S, L) => {
    e(), t.value = se(S);
    const P = c, U = Pe(S, L);
    l = U, r = U.subscribe((j) => {
      l === U && c === P && (t.value = j);
    }), await U.start();
  }, b = async () => {
    await (l == null ? void 0 : l.refresh());
  }, g = async (S, L) => {
    if (!l) throw new Error("Conversation controller is not connected.");
    return l.submitUserMessage(S, L);
  }, v = async (S, L) => {
    if (!l) throw new Error("Conversation controller is not connected.");
    return l.retryFailedUserMessage(S, L);
  }, s = (S) => l == null ? void 0 : l.discardFailedUserMessage(S), C = async () => {
    if (!l) throw new Error("Conversation controller is not connected.");
    await l.interrupt();
  }, w = (S = "") => {
    e(), t.value = se(S);
  }, u = () => {
    e();
  };
  return qe() && Me(u), {
    state: O(() => t.value),
    connect: p,
    submitUserMessage: g,
    retryFailedUserMessage: v,
    discardFailedUserMessage: s,
    interrupt: C,
    refresh: b,
    reset: w,
    dispose: u
  };
}
export {
  so as CodyComposer,
  oo as CodyConversation,
  ge as CodyMarkdown,
  it as CodyRequestCard,
  X as DEFAULT_CODY_MARKDOWN_LABELS,
  to as conversationEntriesFromState,
  ke as questionFieldsFromParams,
  me as renderCodyMarkdown,
  Ne as requestSummary,
  pe as stabilizeStreamingMarkdown,
  ao as useConversationController
};
