import { defineComponent as Z, ref as _, watch as ae, nextTick as re, onMounted as we, onBeforeUnmount as Ce, openBlock as r, createElementBlock as d, withModifiers as ie, createElementVNode as c, createCommentVNode as D, computed as R, Fragment as U, createVNode as N, reactive as De, toDisplayString as L, renderList as P, createTextVNode as de, normalizeClass as ue, withDirectives as Te, withKeys as Ee, vModelDynamic as Ie, renderSlot as ee, unref as V, h as se, useId as Ue, createBlock as pe, shallowRef as Re, getCurrentScope as Oe, onScopeDispose as _e } from "vue";
import { buildApprovalRiskSummary as Be, toolStatusTone as fe, buildToolOutputPreview as Fe, isToolOutputTruncated as Pe, toolOutputToggleLabel as ze } from "@codycodeagent/cody-web-core/presentation";
import Se from "dompurify";
import je from "markdown-it";
import Ve from "markdown-it-footnote";
import We from "markdown-it-task-lists";
import { conversationFeedFromState as He, formatTurnDuration as Ne, createConversationState as le } from "@codycodeagent/cody-web-core/conversation";
import { composerHasContent as Ke, removeComposerTrigger as Ge, findComposerTrigger as Qe } from "@codycodeagent/cody-web-core/composer";
import { createConversationController as Ze } from "@codycodeagent/cody-web-core/client";
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
}, I = new je({ breaks: !0, html: !1, linkify: !0, typographer: !1 });
I.use(We, { enabled: !1, label: !0, labelAfter: !0 });
I.use(Ve);
function F(e, a) {
  return `<button type="button" class="markdown-tool-button" data-markdown-action="${e}" aria-label="${a}" title="${a}">${a}</button>`;
}
function xe(e, a = "", o = X) {
  const n = a.toLowerCase();
  if (n === "mermaid" || n === "plantuml" || n === "puml") {
    const h = n === "mermaid" ? "mermaid" : "plantuml";
    return `<div class="markdown-diagram-shell" data-diagram-engine="${h}"><header class="markdown-diagram-toolbar"><span>${h}</span><span class="markdown-diagram-actions">${F("diagram-zoom-out", o.zoomOut)}${F("diagram-fit", o.fit)}${F("diagram-zoom-in", o.zoomIn)}${F("diagram-source", o.source)}${F("diagram-fullscreen", o.fullscreen)}${F("diagram-export-svg", "SVG")}${F("diagram-export-png", "PNG")}</span></header><div class="markdown-diagram-stage" role="img" aria-label="${o.diagramAria(h)}" style="color:#111827;background:#fff"><p class="markdown-diagram-status">${o.rendering(h)}</p></div><pre class="markdown-diagram-source" hidden><code>${I.utils.escapeHtml(e)}</code></pre></div>
`;
  }
  const t = e.replace(/\n$/u, "").split(`
`), u = t.length <= 2 && t.every((h) => h.length <= 96), v = t.length > 10, m = a || "text", $ = [u ? "is-compact-code" : "", /^[A-Za-z0-9_-]+$/u.test(a) ? `language-${a}` : ""].filter(Boolean).join(" "), f = $ ? ` class="${$}"` : "", p = [u ? "is-compact" : "", v ? "is-collapsible is-collapsed" : ""].filter(Boolean).join(" "), s = v ? `${m} · ${o.lineCount(t.length)}` : m, S = v ? `<button type="button" class="markdown-tool-button markdown-code-collapse" data-markdown-action="toggle-code" aria-label="${o.collapseCode}" title="${o.collapseCode}" aria-expanded="false">${o.collapseCode}</button>` : "", A = v ? `<div class="markdown-code-expand"><button type="button" data-markdown-action="toggle-code" aria-expanded="false">${o.expandCode(t.length)}</button></div>` : "";
  return `<div class="markdown-code-host"><div class="markdown-code-shell${p ? ` ${p}` : ""}" data-language="${m}" data-code-lines="${String(t.length)}"><header class="markdown-code-toolbar"><span>${s}</span><span class="markdown-code-actions">${S}${F("wrap-code", o.wrap)}${F("copy-code", o.copy)}${F("save-code", o.save)}</span></header><pre class="markdown-code-block${u ? " is-compact" : ""}"><code${f}>${I.utils.escapeHtml(e)}</code></pre>${A}</div></div>
`;
}
I.renderer.rules.fence = (e, a, o, n) => {
  const t = e[a];
  return xe(t.content, t.info.trim().split(/\s+/u)[0] ?? "", n.labels);
};
I.renderer.rules.code_block = (e, a, o, n) => xe(e[a].content, "", n.labels);
I.renderer.rules.table_open = (e, a, o, n) => {
  const t = n.labels ?? X;
  return `<section class="markdown-table-shell" role="region" aria-label="${t.dataTable}" tabindex="0"><header class="markdown-table-toolbar">${F("copy-table", t.copyCsv)}</header><div class="markdown-table-scroll"><table>
`;
};
I.renderer.rules.table_close = () => `</table></div></section>
`;
const ge = I.renderer.rules.code_inline;
I.renderer.rules.code_inline = (e, a, o, n, t) => {
  const u = e[a].content, v = u.match(/^(.+?\.[A-Za-z0-9_-]{1,12})(?::(\d+))?$/u);
  if (!v || /\s/u.test(u)) return ge ? ge(e, a, o, n, t) : t.renderToken(e, a, o);
  const m = I.utils.escapeHtml(v[1]), $ = v[2] ?? "", f = n.labels ?? X;
  return `<button type="button" class="markdown-file-link" data-markdown-action="open-file" data-file-path="${m}" data-file-line="${$}" title="${f.openFile(m)}"><code>${I.utils.escapeHtml(u)}</code></button>`;
};
function Ae(e) {
  if (!e || /^(?:[A-Za-z][A-Za-z\d+.-]*:|\/\/|#)/u.test(e)) return;
  const a = e.match(/^(.*?)(?:#L?(\d+))?$/u), o = (a == null ? void 0 : a[1]) ?? e, n = (a == null ? void 0 : a[2]) ?? "";
  if (/[?#]/u.test(o)) return;
  const t = o.startsWith("/") || o.startsWith("./") || o.startsWith("../"), u = /(?:^|\/)[^/?#]+\.[A-Za-z\d_-]{1,12}$/u.test(o);
  if (!(!t && !u))
    return { path: o, line: n };
}
function Xe(e, a) {
  let o = 0;
  for (let n = a - 1; n >= 0; n -= 1)
    if (e[n].type === "link_close" && (o += 1), e[n].type === "link_open") {
      if (o === 0) return e[n];
      o -= 1;
    }
}
const ve = I.renderer.rules.link_open;
I.renderer.rules.link_open = (e, a, o, n, t) => {
  const u = e[a], v = u.attrGet("href") ?? "", m = Ae(v);
  if (m) {
    const $ = n.labels ?? X, f = I.utils.escapeHtml(m.path);
    return `<button type="button" class="markdown-file-link" data-markdown-action="open-file" data-file-path="${f}" data-file-line="${m.line}" title="${$.openFile(f)}">`;
  }
  return /^https?:\/\//u.test(v) && (u.attrSet("target", "_blank"), u.attrSet("rel", "noopener noreferrer")), ve ? ve(e, a, o, n, t) : t.renderToken(e, a, o);
};
const ye = I.renderer.rules.link_close;
I.renderer.rules.link_close = (e, a, o, n, t) => {
  var v;
  const u = ((v = Xe(e, a)) == null ? void 0 : v.attrGet("href")) ?? "";
  return Ae(u) ? "</button>" : ye ? ye(e, a, o, n, t) : t.renderToken(e, a, o);
};
function ke(e, a = X) {
  return Se.sanitize(I.render(e, { labels: a }), {
    ADD_ATTR: ["target"],
    ADD_TAGS: ["table", "thead", "tbody", "tr", "th", "td", "h1", "h2", "h3", "h4", "h5", "h6"],
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed"]
  });
}
function be(e) {
  var a;
  return (((a = e.match(/^\s*```/gmu)) == null ? void 0 : a.length) ?? 0) % 2 === 1 ? `${e}

\`\`\`` : e;
}
let Ye = 0, he = Promise.resolve();
const Je = async () => import("mermaid");
async function et(e, a, o = Je) {
  const n = `cody-diagram-${String(++Ye)}`, t = he.then(async () => {
    var u, v, m;
    try {
      const { default: $ } = await o();
      return $.initialize({
        startOnLoad: !1,
        securityLevel: "strict",
        suppressErrorRendering: !0,
        theme: "default",
        themeVariables: { background: "#ffffff" },
        htmlLabels: !1,
        flowchart: { htmlLabels: !1, useMaxWidth: !1 }
      }), (await $.render(n, e, a)).svg;
    } finally {
      (u = document.getElementById(n)) == null || u.remove(), (v = document.getElementById(`d${n}`)) == null || v.remove(), (m = document.getElementById(`i${n}`)) == null || m.remove();
    }
  });
  return he = t.then(() => {
  }, () => {
  }), t;
}
const tt = ["aria-label"], ot = ["src", "alt"], Le = /* @__PURE__ */ Z({
  __name: "CodyImagePreviewDialog",
  props: {
    src: {},
    alt: { default: "图片预览" }
  },
  emits: ["dismiss"],
  setup(e, { emit: a }) {
    const o = e, n = a, t = _(null);
    ae(() => o.src, async (m) => {
      var $;
      m && (await re(), ($ = t.value) == null || $.focus());
    }, { flush: "post" });
    function u() {
      n("dismiss");
    }
    function v(m) {
      m.key === "Escape" && o.src && (m.preventDefault(), u());
    }
    return we(() => window.addEventListener("keydown", v)), Ce(() => window.removeEventListener("keydown", v)), (m, $) => e.src ? (r(), d("div", {
      key: 0,
      ref_key: "dialogRef",
      ref: t,
      class: "cody-image-preview-dialog",
      role: "dialog",
      "aria-modal": "true",
      "aria-label": e.alt,
      tabindex: "-1",
      onClick: ie(u, ["self"])
    }, [
      c("button", {
        type: "button",
        "aria-label": "关闭图片预览",
        onClick: u
      }, "×"),
      c("img", {
        src: e.src,
        alt: e.alt
      }, null, 8, ot)
    ], 8, tt)) : D("", !0);
  }
}), at = ["innerHTML"], $e = /* @__PURE__ */ Z({
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
    const o = e, n = a, t = R(() => o.labels ?? X), u = _(null), v = _(ke(be(o.text), t.value)), m = _(""), $ = /* @__PURE__ */ new Set();
    let f = 0;
    const p = {
      javascript: () => import("highlight.js/lib/languages/javascript"),
      typescript: () => import("highlight.js/lib/languages/typescript"),
      python: () => import("highlight.js/lib/languages/python"),
      go: () => import("highlight.js/lib/languages/go"),
      rust: () => import("highlight.js/lib/languages/rust"),
      json: () => import("highlight.js/lib/languages/json"),
      bash: () => import("highlight.js/lib/languages/bash"),
      sql: () => import("highlight.js/lib/languages/sql")
    };
    async function s(g) {
      window.clearTimeout(f), f = window.setTimeout(async () => {
        v.value = ke(be(g), t.value), await re(), S();
      }, o.renderDelay);
    }
    async function S() {
      var q, b, k, x, C, z;
      for (const M of Array.from(((q = u.value) == null ? void 0 : q.querySelectorAll("td")) ?? []))
        /^-?[\d,.]+%?$/u.test(((b = M.textContent) == null ? void 0 : b.trim()) ?? "") && (M.dataset.numeric = "true");
      for (const M of Array.from(((k = u.value) == null ? void 0 : k.querySelectorAll("img")) ?? []))
        M.addEventListener("error", () => {
          M.alt = M.alt || "图片加载失败", M.classList.add("is-load-error");
        }, { once: !0 });
      A();
      for (const [M, T] of Array.from(((x = u.value) == null ? void 0 : x.querySelectorAll(".markdown-code-shell")) ?? []).entries()) {
        T.dataset.codeIndex = String(M), T.classList.contains("is-collapsible") && $.has(M) && T.classList.remove("is-collapsed");
        for (const O of Array.from(T.querySelectorAll('[data-markdown-action="toggle-code"]')))
          O.setAttribute("aria-expanded", String(!T.classList.contains("is-collapsed")));
        const B = T.querySelector("pre"), E = T.querySelector('[data-markdown-action="wrap-code"]');
        B && E && (E.hidden = B.scrollWidth <= B.clientWidth + 2, E.setAttribute("aria-pressed", String(T.classList.contains("is-wrapped"))));
      }
      await h();
      const g = Array.from(((C = u.value) == null ? void 0 : C.querySelectorAll('pre code[class*="language-"]')) ?? []);
      if (g.length === 0) return;
      const w = (await import("highlight.js/lib/core")).default;
      for (const M of g) {
        const T = ((z = Array.from(M.classList).find((O) => O.startsWith("language-"))) == null ? void 0 : z.slice(9)) ?? "", B = p[T];
        if (!B || M.dataset.highlighted === "yes") continue;
        const E = await B();
        w.getLanguage(T) || w.registerLanguage(T, E.default), M.innerHTML = w.highlight(M.textContent ?? "", { language: T }).value, M.dataset.highlighted = "yes";
      }
    }
    function A() {
      var w;
      if (!o.resolveAssetUrl) return;
      const g = /\.(?:svg|png|jpe?g|gif|webp)(?:[?#].*)?$/iu;
      for (const q of Array.from(((w = u.value) == null ? void 0 : w.querySelectorAll("a[href]")) ?? [])) {
        const b = q.getAttribute("href") ?? "";
        if (!g.test(b) || /^(?:data|blob):/iu.test(b)) continue;
        const k = o.resolveAssetUrl(b);
        k && (q.href = k, q.target = "_blank", q.rel = "noopener noreferrer");
      }
    }
    async function h() {
      var w, q, b, k;
      const g = Array.from(((w = u.value) == null ? void 0 : w.querySelectorAll(".markdown-diagram-shell:not([data-rendered])")) ?? []);
      for (const x of g) {
        x.dataset.rendered = "loading";
        const C = x.dataset.diagramEngine === "plantuml" ? "plantuml" : "mermaid", z = ((q = x.querySelector("code")) == null ? void 0 : q.textContent) ?? "", M = x.querySelector(".markdown-diagram-stage");
        if (M) {
          M.style.setProperty("color", "#111827"), M.style.setProperty("background", "#ffffff");
          try {
            let T = await ((b = o.renderDiagram) == null ? void 0 : b.call(o, { engine: C, source: z, dark: o.dark }));
            if (!T && C === "mermaid" && (T = await et(z, M)), !T) throw new Error(C === "plantuml" ? "当前环境未配置 PlantUML 渲染器" : "图表渲染失败");
            M.innerHTML = K(T), W(M), x.dataset.rendered = "yes", x.style.setProperty("--diagram-scale", "1");
          } catch (T) {
            M.textContent = T instanceof Error ? T.message : "图表渲染失败", M.classList.add("markdown-diagram-error"), (k = x.querySelector(".markdown-diagram-source")) == null || k.removeAttribute("hidden"), x.dataset.rendered = "error";
          }
        }
      }
    }
    function K(g) {
      const w = Se.sanitize(g, { USE_PROFILES: { svg: !0, svgFilters: !0, html: !0 }, ADD_TAGS: ["foreignObject"], ADD_ATTR: ["xmlns"] }), q = w.trimStart().startsWith("<svg") ? w : `<svg xmlns="http://www.w3.org/2000/svg">${w}</svg>`, b = new DOMParser().parseFromString(q, "image/svg+xml");
      if (b.querySelector("parsererror")) return "";
      for (const k of b.querySelectorAll("*")) for (const x of Array.from(k.attributes)) /^on/iu.test(x.name) && k.removeAttribute(x.name);
      return b.querySelectorAll("script").forEach((k) => k.remove()), new XMLSerializer().serializeToString(b.documentElement);
    }
    function W(g) {
      if (g.dataset.panReady === "true") return;
      g.dataset.panReady = "true";
      let w = 0, q = 0, b = 0, k = 0;
      g.addEventListener("pointerdown", (C) => {
        C.button === 0 && (w = C.clientX, q = C.clientY, b = g.scrollLeft, k = g.scrollTop, g.setPointerCapture(C.pointerId), g.classList.add("is-panning"));
      }), g.addEventListener("pointermove", (C) => {
        g.hasPointerCapture(C.pointerId) && (g.scrollLeft = b - (C.clientX - w), g.scrollTop = k - (C.clientY - q));
      });
      const x = (C) => {
        g.hasPointerCapture(C.pointerId) && g.releasePointerCapture(C.pointerId), g.classList.remove("is-panning");
      };
      g.addEventListener("pointerup", x), g.addEventListener("pointercancel", x);
    }
    function H(g, w = 0) {
      const q = Number(g.style.getPropertyValue("--diagram-scale") || "1");
      g.style.setProperty("--diagram-scale", String(w === 0 ? 1 : Math.min(2.5, Math.max(0.4, q + w))));
    }
    function Y(g, w) {
      const q = document.createElement("a");
      q.href = URL.createObjectURL(g), q.download = w, q.click(), URL.revokeObjectURL(q.href);
    }
    async function te(g, w) {
      const q = w.textContent;
      try {
        await navigator.clipboard.writeText(g), w.textContent = "已复制";
      } catch {
        const b = document.createElement("textarea");
        b.value = g, b.style.position = "fixed", b.style.opacity = "0", document.body.appendChild(b), b.select();
        const k = document.execCommand("copy");
        b.remove(), w.textContent = k ? "已复制" : "复制失败";
      }
      window.setTimeout(() => {
        w.textContent = q;
      }, 1200);
    }
    function oe(g) {
      return Array.from((g == null ? void 0 : g.rows) ?? []).map((w) => Array.from(w.cells).map((q) => {
        var b;
        return `"${((b = q.textContent) == null ? void 0 : b.trim().replace(/"/gu, '""')) ?? ""}"`;
      }).join(",")).join(`
`);
    }
    function ne(g) {
      var z, M, T, B;
      const w = g.target, q = w.closest("img");
      if (q) {
        m.value = q.currentSrc || q.src;
        return;
      }
      const b = w.closest("[data-markdown-action]");
      if (!b) return;
      const k = b.closest(".markdown-code-shell, .markdown-table-shell"), x = b.dataset.markdownAction;
      if (x === "copy-code" && te(((z = k == null ? void 0 : k.querySelector("code")) == null ? void 0 : z.textContent) ?? "", b), x === "wrap-code") {
        const E = (k == null ? void 0 : k.classList.toggle("is-wrapped")) ?? !1;
        b.textContent = E && t.value.scroll || t.value.wrap, b.setAttribute("aria-pressed", String(E));
      }
      if (x === "save-code" && Y(new Blob([((M = k == null ? void 0 : k.querySelector("code")) == null ? void 0 : M.textContent) ?? ""], { type: "text/plain" }), `snippet.${(k == null ? void 0 : k.dataset.language) || "txt"}`), x === "toggle-code" && (k != null && k.classList.contains("is-collapsible"))) {
        const E = Number(k.dataset.codeIndex ?? -1), O = !k.classList.toggle("is-collapsed");
        E >= 0 && (O ? $.add(E) : $.delete(E));
        for (const J of Array.from(k.querySelectorAll('[data-markdown-action="toggle-code"]'))) J.setAttribute("aria-expanded", String(O));
      }
      if (x === "copy-table" && te(oe((k == null ? void 0 : k.querySelector("table")) ?? null), b), x === "open-file") {
        const E = b.dataset.filePath ?? "", O = ((T = o.cwd) == null ? void 0 : T.replace(/\/$/u, "")) ?? "", J = E.startsWith("/") && O && E.startsWith(`${O}/`) ? E.slice(O.length + 1) : E.replace(/^\.\//u, "");
        n("openFile", { path: J, line: Number(b.dataset.fileLine || 0) || 1 });
      }
      const C = b.closest(".markdown-diagram-shell");
      if (C && x === "diagram-zoom-in" && H(C, 0.2), C && x === "diagram-zoom-out" && H(C, -0.2), C && x === "diagram-fit" && H(C), C && x === "diagram-source") {
        const E = C.querySelector(".markdown-diagram-source");
        E && (E.hidden = !E.hidden);
      }
      if (C && x === "diagram-fullscreen" && ((B = C.requestFullscreen) == null || B.call(C)), C && x === "diagram-export-svg") {
        const E = C.querySelector("svg");
        E && Y(new Blob([new XMLSerializer().serializeToString(E)], { type: "image/svg+xml" }), "diagram.svg");
      }
    }
    return ae(() => [o.text, o.labels], ([g]) => {
      s(g);
    }, { deep: !0 }), we(() => {
      S();
    }), Ce(() => window.clearTimeout(f)), (g, w) => (r(), d(U, null, [
      c("div", {
        ref_key: "rootRef",
        ref: u,
        class: "cody-markdown cody-markdown-renderer",
        innerHTML: v.value,
        onClick: ne
      }, null, 8, at),
      N(Le, {
        src: m.value,
        alt: "Markdown 图片预览",
        onDismiss: w[0] || (w[0] = (q) => m.value = "")
      }, null, 8, ["src"])
    ], 64));
  }
});
function qe(e) {
  if (!e || typeof e != "object") return [];
  const a = e;
  return (Array.isArray(a.questions) ? a.questions : []).flatMap((n, t) => {
    if (!n || typeof n != "object") return [];
    const u = n, v = typeof u.question == "string" ? u.question.trim() : "";
    if (!v) return [];
    const m = Array.isArray(u.options) ? u.options : [];
    return [{
      id: typeof u.id == "string" && u.id.trim() ? u.id.trim() : `question-${String(t + 1)}`,
      header: typeof u.header == "string" ? u.header.trim() : "",
      question: v,
      isOther: u.isOther === !0,
      isSecret: u.isSecret === !0,
      options: m.flatMap(($) => {
        if (!$ || typeof $ != "object") return [];
        const f = $, p = typeof f.label == "string" ? f.label.trim() : "";
        return p ? [{ label: p, description: typeof f.description == "string" ? f.description.trim() : "" }] : [];
      })
    }];
  });
}
function nt(e) {
  var n;
  if (!e || typeof e != "object") return "Codex 请求执行一项受保护操作。";
  const a = e, o = a.reason ?? a.question ?? a.command;
  return typeof o == "string" && o.trim() ? o : ((n = qe(e)[0]) == null ? void 0 : n.question) ?? "Codex 请求执行一项受保护操作。";
}
function Co(e) {
  var n;
  const a = [], o = (t) => {
    if (t.kind === "reasoning") {
      a.push({ id: t.id, kind: "reasoning", text: t.text });
      return;
    }
    if (!t.tool.summary && t.tool.details.length === 0 && !t.tool.output && t.tool.kind !== "fileChange") return;
    if (t.tool.kind !== "fileChange") {
      a.push({ id: t.id, kind: "tool", tool: t.tool });
      return;
    }
    const u = `file-group:${t.turnId ?? t.id}`, v = a.at(-1);
    if (!v || v.kind !== "tool" || v.id !== u) {
      const f = [...new Set(t.tool.details)], p = {
        id: u,
        kind: "tool",
        tool: {
          ...t.tool,
          title: f.length > 1 ? `文件变更 · ${String(f.length)} 个文件` : "文件变更",
          summary: f.length ? `${String(f.length)} 个文件已更新` : t.tool.summary,
          details: f
        }
      };
      a.push(p);
      return;
    }
    const m = [.../* @__PURE__ */ new Set([...v.tool.details, ...t.tool.details])], $ = [v.tool.output, t.tool.output].filter(Boolean).join(`

`);
    v.tool = {
      ...v.tool,
      status: /fail|error|cancel|reject/iu.test(`${v.tool.status} ${t.tool.status}`) ? "failed" : t.tool.status,
      title: m.length > 1 ? `文件变更 · ${String(m.length)} 个文件` : "文件变更",
      summary: m.length ? `${String(m.length)} 个文件已更新` : t.tool.summary,
      details: m,
      ...$ ? { output: $ } : {}
    };
  };
  for (const t of He(e))
    if (t.kind === "message") a.push({ id: t.id, kind: "message", message: t.message });
    else if (t.kind === "timeline") o(t.entry);
    else if (t.kind === "plan") a.push({ id: t.id, kind: "plan", text: t.plan.text });
    else if (t.kind === "request") a.push({ id: t.id, kind: "request", request: t.request });
    else if (t.kind === "turn" && t.status === "failed") a.push({ id: t.id, kind: "failure", text: t.error });
    else {
      if (t.kind === "turn" && t.status === "interrupted") continue;
      t.kind === "turn" && t.status === "completed" ? a.push({ id: t.id, kind: "worked", label: `Worked for ${Ne(t.durationMs ?? 0)}` }) : t.kind === "activity" && a.push({
        id: t.id,
        kind: "activity",
        title: t.status === "waiting" ? ((n = e.pendingRequests.find((u) => !u.turnId || u.turnId === t.turnId)) == null ? void 0 : n.kind) === "approval" ? "等待你的审批" : "等待你的回答" : t.label,
        detail: t.status === "waiting" ? "处理后 Codex 会继续本次回复" : t.status === "retrying" ? e.connection.status === "disconnected" ? "连接已中断，等待恢复" : "正在恢复本次回复" : e.connection.status === "connected" ? "实时更新中" : "等待恢复连接",
        tone: t.status
      });
    }
  return a;
}
const st = ["data-kind"], lt = { class: "cody-request-heading" }, it = { key: 0 }, rt = {
  key: 0,
  class: "cody-question-options"
}, dt = ["onClick"], ut = { key: 0 }, ct = ["onUpdate:modelValue", "type", "placeholder"], mt = { class: "cody-request-actions" }, pt = ["disabled"], ft = { class: "cody-approval-risk-heading" }, gt = ["data-level"], vt = { class: "cody-approval-risk-subject" }, yt = {
  key: 0,
  class: "cody-approval-risk-labels"
}, kt = {
  key: 1,
  class: "cody-approval-risk-details"
}, bt = { class: "cody-approval-risk-recommendation" }, ht = { key: 1 }, $t = {
  key: 2,
  class: "cody-request-actions"
}, wt = /* @__PURE__ */ Z({
  __name: "CodyRequestCard",
  props: {
    request: {}
  },
  emits: ["resolveApproval", "resolveQuestion"],
  setup(e, { emit: a }) {
    const o = e, n = a, t = De({}), u = R(() => qe(o.request.params)), v = R(() => nt(o.request.params)), m = R(() => o.request.kind === "approval" ? Be({ method: o.request.method, params: o.request.params }) : null), $ = R(() => u.value.length > 0 && u.value.every((p) => {
      var s;
      return !!((s = t[p.id]) != null && s.trim());
    }));
    ae(() => o.request.id, () => {
      for (const p of Object.keys(t)) delete t[p];
    });
    function f() {
      $.value && n("resolveQuestion", o.request.id, Object.fromEntries(u.value.map((p) => [p.id, { answers: [t[p.id].trim()] }])));
    }
    return (p, s) => (r(), d("article", {
      class: "cody-request-card",
      "data-kind": e.request.kind
    }, [
      c("div", lt, [
        c("strong", null, L(e.request.kind === "approval" ? "需要你的确认" : "Codex 需要补充信息"), 1),
        s[2] || (s[2] = c("small", null, "Agent 已暂停等待", -1))
      ]),
      e.request.kind === "question" && u.value.length ? (r(), d(U, { key: 0 }, [
        (r(!0), d(U, null, P(u.value, (S) => (r(), d("fieldset", {
          key: S.id,
          class: "cody-question-field"
        }, [
          c("legend", null, [
            S.header ? (r(), d("span", it, L(S.header), 1)) : D("", !0),
            de(L(S.question), 1)
          ]),
          S.options.length ? (r(), d("div", rt, [
            (r(!0), d(U, null, P(S.options, (A) => (r(), d("button", {
              key: A.label,
              type: "button",
              class: ue({ selected: t[S.id] === A.label }),
              onClick: (h) => t[S.id] = A.label
            }, [
              c("strong", null, L(A.label), 1),
              A.description ? (r(), d("small", ut, L(A.description), 1)) : D("", !0)
            ], 10, dt))), 128))
          ])) : D("", !0),
          S.options.length === 0 || S.isOther ? Te((r(), d("input", {
            key: 1,
            "onUpdate:modelValue": (A) => t[S.id] = A,
            type: S.isSecret ? "password" : "text",
            placeholder: S.options.length ? "其他回答…" : "输入回答…",
            onKeyup: Ee(f, ["enter"])
          }, null, 40, ct)), [
            [Ie, t[S.id]]
          ]) : D("", !0)
        ]))), 128)),
        c("div", mt, [
          c("button", {
            type: "button",
            disabled: !$.value,
            onClick: f
          }, "提交回答", 8, pt)
        ])
      ], 64)) : (r(), d(U, { key: 1 }, [
        m.value ? (r(), d(U, { key: 0 }, [
          c("div", ft, [
            c("div", null, [
              c("strong", null, L(m.value.title), 1),
              c("p", null, L(m.value.description), 1)
            ]),
            c("span", {
              class: "cody-approval-risk-level",
              "data-level": m.value.level
            }, L(m.value.level), 9, gt)
          ]),
          c("code", vt, L(m.value.subject), 1),
          m.value.riskLabels.length ? (r(), d("ul", yt, [
            (r(!0), d(U, null, P(m.value.riskLabels, (S) => (r(), d("li", { key: S }, L(S), 1))), 128))
          ])) : D("", !0),
          m.value.impacts.length ? (r(), d("details", kt, [
            s[3] || (s[3] = c("summary", null, "查看影响", -1)),
            c("ul", null, [
              (r(!0), d(U, null, P(m.value.impacts, (S) => (r(), d("li", { key: S }, L(S), 1))), 128))
            ])
          ])) : D("", !0),
          c("p", bt, L(m.value.recommendation), 1)
        ], 64)) : (r(), d("p", ht, L(v.value), 1)),
        e.request.kind === "approval" ? (r(), d("div", $t, [
          c("button", {
            type: "button",
            onClick: s[0] || (s[0] = (S) => n("resolveApproval", e.request.id, "accept"))
          }, "允许一次"),
          c("button", {
            type: "button",
            "data-tone": "danger",
            onClick: s[1] || (s[1] = (S) => n("resolveApproval", e.request.id, "decline"))
          }, "拒绝")
        ])) : D("", !0)
      ], 64))
    ], 8, st));
  }
}), Ct = ["data-variant"], St = {
  key: 0,
  class: "cody-conversation-loading",
  role: "status"
}, xt = {
  key: 1,
  class: "cody-conversation-empty"
}, At = {
  key: 0,
  class: "cody-worked-divider"
}, Lt = ["data-role"], qt = ["data-role"], Mt = { class: "cody-message-stack" }, Dt = { class: "cody-message-label" }, Tt = {
  key: 0,
  class: "cody-message-skills"
}, Et = {
  key: 1,
  class: "cody-message-body"
}, It = {
  key: 2,
  class: "cody-message-images"
}, Ut = ["onClick"], Rt = ["src"], Ot = ["onClick"], _t = ["onClick"], Bt = ["data-tone", "open"], Ft = { key: 0 }, Pt = ["onClick"], zt = {
  key: 3,
  class: "cody-reasoning-card"
}, jt = {
  key: 4,
  class: "cody-plan-card",
  open: ""
}, Vt = {
  key: 6,
  class: "cody-failure-card"
}, Wt = {
  key: 7,
  class: "cody-interrupted-card",
  role: "status"
}, Ht = ["data-tone"], So = /* @__PURE__ */ Z({
  __name: "CodyConversation",
  props: {
    entries: {},
    loading: { type: Boolean },
    variant: { default: "standalone" }
  },
  emits: ["copy", "openFile", "retryMessage", "resolveApproval", "resolveQuestion"],
  setup(e, { emit: a }) {
    const o = a, n = _({}), t = _("");
    function u(f, p) {
      return f === "failed" ? `发送失败${p ? `：${p}` : ""}` : f === "queued" ? `已加入发送队列${p ? `：${p}` : ""}` : f === "delivered" ? "已发送给当前任务" : "正在发送…";
    }
    function v(f) {
      n.value = {
        ...n.value,
        [f]: n.value[f] !== !0
      };
    }
    function m(f, p) {
      o("resolveApproval", f, p);
    }
    function $(f, p) {
      o("resolveQuestion", f, p);
    }
    return (f, p) => (r(), d("section", {
      class: "cody-conversation",
      "data-variant": e.variant,
      "data-cody-component": "conversation-surface"
    }, [
      e.loading ? (r(), d("div", St, "正在同步对话…")) : e.entries.length === 0 ? (r(), d("div", xt, [
        ee(f.$slots, "empty", {}, () => [
          p[3] || (p[3] = de("开始这个需求的开发", -1))
        ])
      ])) : (r(!0), d(U, { key: 2 }, P(e.entries, (s) => {
        var S, A;
        return r(), d(U, {
          key: s.id
        }, [
          s.kind === "worked" ? (r(), d("div", At, [
            c("span", null, L(s.label), 1)
          ])) : s.kind === "message" ? (r(), d("article", {
            key: 1,
            class: "cody-message",
            "data-role": s.message.role
          }, [
            c("div", {
              class: "cody-message-identity",
              "data-role": s.message.role
            }, L(s.message.role === "user" ? "你" : "CW"), 9, qt),
            c("div", Mt, [
              c("div", Dt, L(s.message.role === "user" ? "你" : s.message.role === "assistant" ? "Codex Agent" : "系统"), 1),
              (S = s.message.skills) != null && S.length ? (r(), d("ul", Tt, [
                (r(!0), d(U, null, P(s.message.skills, (h) => (r(), d("li", {
                  key: `${h.name}:${h.path}`
                }, "$" + L(h.displayName || h.name), 1))), 128))
              ])) : D("", !0),
              s.message.text ? (r(), d("div", Et, [
                ee(f.$slots, "markdown", {
                  message: s.message
                }, () => [
                  N($e, {
                    text: s.message.text,
                    onOpenFile: p[0] || (p[0] = (h) => o("openFile", h))
                  }, null, 8, ["text"])
                ])
              ])) : D("", !0),
              (A = s.message.images) != null && A.length ? (r(), d("div", It, [
                (r(!0), d(U, null, P(s.message.images, (h) => (r(), d("button", {
                  key: h,
                  type: "button",
                  "aria-label": "打开对话图片预览",
                  onClick: (K) => t.value = h
                }, [
                  c("img", {
                    src: h,
                    alt: "对话图片",
                    loading: "lazy"
                  }, null, 8, Rt)
                ], 8, Ut))), 128))
              ])) : D("", !0),
              s.message.outbox ? (r(), d("div", {
                key: 3,
                class: ue(["cody-message-outbox", s.message.outbox.status]),
                role: "status"
              }, [
                c("span", null, L(u(s.message.outbox.status, s.message.outbox.lastError)), 1),
                s.message.outbox.status === "failed" ? (r(), d("button", {
                  key: 0,
                  class: "cody-message-retry",
                  type: "button",
                  onClick: (h) => o("retryMessage", s.message)
                }, "重试此消息", 8, Ot)) : D("", !0)
              ], 2)) : D("", !0),
              s.message.text ? (r(), d("button", {
                key: 4,
                class: "cody-copy-button",
                type: "button",
                onClick: (h) => o("copy", s.message.text)
              }, "复制", 8, _t)) : D("", !0)
            ])
          ], 8, Lt)) : s.kind === "tool" ? (r(), d("details", {
            key: 2,
            class: "cody-tool-card",
            "data-tone": V(fe)(s.tool.status),
            open: V(fe)(s.tool.status) === "working"
          }, [
            c("summary", null, [
              p[4] || (p[4] = c("span", null, "⌁", -1)),
              c("strong", null, L(s.tool.title), 1),
              c("small", null, L(s.tool.status), 1)
            ]),
            c("p", null, L(s.tool.summary), 1),
            s.tool.details.length ? (r(), d("ul", Ft, [
              (r(!0), d(U, null, P(s.tool.details, (h) => (r(), d("li", { key: h }, L(h), 1))), 128))
            ])) : D("", !0),
            s.tool.output ? (r(), d(U, { key: 1 }, [
              c("pre", null, L(n.value[s.id] ? s.tool.output : V(Fe)(s.tool.output)), 1),
              V(Pe)(s.tool.output) ? (r(), d("button", {
                key: 0,
                class: "cody-tool-output-toggle",
                type: "button",
                onClick: (h) => v(s.id)
              }, L(V(ze)(n.value[s.id] === !0)), 9, Pt)) : D("", !0)
            ], 64)) : D("", !0)
          ], 8, Bt)) : s.kind === "reasoning" ? (r(), d("details", zt, [
            c("summary", null, "✦ " + L(s.title || "推理过程"), 1),
            c("pre", null, L(s.text), 1)
          ])) : s.kind === "plan" ? (r(), d("details", jt, [
            p[5] || (p[5] = c("summary", null, "计划", -1)),
            N($e, {
              text: s.text,
              onOpenFile: p[1] || (p[1] = (h) => o("openFile", h))
            }, null, 8, ["text"])
          ])) : s.kind === "request" ? ee(f.$slots, "request", {
            request: s.request
          }, () => [
            N(wt, {
              request: s.request,
              onResolveApproval: m,
              onResolveQuestion: $
            }, null, 8, ["request"])
          ], void 0, 5) : s.kind === "failure" ? (r(), d("details", Vt, [
            p[6] || (p[6] = c("summary", null, "本次回复失败", -1)),
            c("p", null, L(s.text), 1)
          ])) : s.kind === "interrupted" ? (r(), d("article", Wt, L(s.text), 1)) : s.kind === "activity" ? (r(), d("article", {
            key: 8,
            class: "cody-conversation-activity",
            "data-tone": s.tone,
            role: "status",
            "aria-live": "polite"
          }, [
            p[7] || (p[7] = c("span", {
              class: "cody-activity-pulse",
              "aria-hidden": "true"
            }, null, -1)),
            c("strong", null, L(s.title), 1),
            c("small", null, L(s.detail), 1)
          ], 8, Ht)) : D("", !0)
        ], 64);
      }), 128)),
      N(Le, {
        src: t.value,
        alt: "对话图片预览",
        onDismiss: p[2] || (p[2] = (s) => t.value = "")
      }, null, 8, ["src"])
    ], 8, Ct));
  }
}), Nt = ["data-variant"], Kt = ["data-image-drag-active"], Gt = {
  key: 0,
  class: "cody-composer-images",
  "aria-label": "已添加图片"
}, Qt = ["src", "alt"], Zt = ["disabled", "aria-label", "onClick"], Xt = {
  key: 1,
  class: "cody-composer-selected",
  "aria-label": "已引用 Skills"
}, Yt = ["disabled", "aria-label", "onClick"], Jt = ["value", "disabled", "placeholder", "aria-expanded", "aria-controls", "aria-activedescendant"], eo = {
  key: 0,
  class: "cody-composer-skill-status"
}, to = ["id", "aria-selected", "onMouseenter", "onMousedown"], oo = { class: "cody-composer-skill-option-name" }, ao = {
  key: 0,
  class: "cody-composer-skill-option-description"
}, no = { class: "cody-composer-controls" }, so = {
  class: "cody-composer-settings",
  "aria-label": "运行设置"
}, lo = ["disabled"], io = { class: "cody-composer-actions" }, ro = ["disabled"], uo = ["disabled", "aria-label", "title"], co = {
  key: 3,
  class: "cody-composer-policy"
}, mo = {
  key: 4,
  class: "cody-composer-image-error",
  role: "alert"
}, po = {
  key: 5,
  class: "cody-composer-image-status",
  role: "status"
}, xo = /* @__PURE__ */ Z({
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
    images: { default: () => [] },
    imageUploadEnabled: { type: Boolean },
    isUploadingImages: { type: Boolean },
    imageError: {},
    variant: { default: "standalone" }
  },
  emits: ["update:draft", "update:collaboration-mode", "update:submit-mode", "update:model", "update:reasoning", "update:permission", "update:selected-skills", "attach-images", "remove-image", "send", "stop"],
  setup(e, { emit: a }) {
    const o = Z({
      name: "CodyComposerSelect",
      props: { label: { type: String, required: !0 }, modelValue: { type: String, required: !0 }, options: { type: Array, required: !0 }, disabled: Boolean },
      emits: ["update:modelValue"],
      setup(l, { emit: i }) {
        return () => se("label", { class: "cody-composer-compact-control", title: l.label, "data-control": l.label }, [
          se("select", { value: l.modelValue, disabled: l.disabled, "aria-label": l.label, onChange: (y) => i("update:modelValue", y.target.value) }, l.options.map((y) => se("option", { value: y.value }, y.label)))
        ]);
      }
    }), n = e, t = a, u = _(null), v = _(null), m = _(n.draft), $ = _(null), f = _(0), p = _(0), s = Ue(), S = `${s}-skill-menu`, A = R(() => {
      const l = $.value;
      return l ? n.skills.filter((i) => !n.selectedSkills.includes(i.value)).filter((i) => l.query ? `${i.label}
${i.description ?? ""}`.toLowerCase().includes(l.query) : !0).slice(0, 8) : [];
    }), h = R(() => $.value !== null), K = R(() => h.value && A.value.length ? g(Math.min(f.value, A.value.length - 1)) : void 0), W = R(() => {
      var l;
      return ((l = n.permissionOptions.find((i) => i.value === n.selectedPermission)) == null ? void 0 : l.description) ?? "";
    }), H = R(() => !n.disabled && !n.isUploadingImages && Ke({ text: n.draft, images: n.images, skills: n.selectedSkills })), Y = R(() => n.isRunning ? n.selectedSubmitMode === "steer" ? "发送引导" : n.selectedSubmitMode === "append" ? "追加到当前任务" : "加入队列" : "发送"), te = R(() => n.imageUploadEnabled && p.value > 0);
    ae(() => n.draft, (l) => {
      m.value = l;
    });
    function oe(l, i) {
      var y;
      return ((y = l.find((j) => j.value === i)) == null ? void 0 : y.label) ?? i;
    }
    function ne(l) {
      t("update:selected-skills", n.selectedSkills.filter((i) => i !== l));
    }
    function g(l) {
      return `${s}-skill-option-${String(l)}`;
    }
    function w(l, i) {
      $.value = Qe(l, i, "$"), f.value = 0;
    }
    function q(l) {
      const i = l.target;
      m.value = i.value, t("update:draft", i.value), w(i.value, i.selectionStart);
    }
    function b(l) {
      const i = l.target;
      w(i.value, i.selectionStart);
    }
    function k() {
      window.setTimeout(() => {
        $.value = null;
      }, 0);
    }
    function x(l) {
      return Array.from(l).filter((i) => i.type.startsWith("image/"));
    }
    function C(l) {
      if (!n.imageUploadEnabled || n.disabled || n.isUploadingImages) return;
      const i = x(l);
      i.length && t("attach-images", i);
    }
    function z() {
      var l;
      (l = v.value) == null || l.click();
    }
    function M(l) {
      const i = l.target;
      i.files && C(i.files), i.value = "";
    }
    function T(l) {
      var y;
      const i = (y = l.clipboardData) == null ? void 0 : y.files;
      !(i != null && i.length) || x(i).length === 0 || (l.preventDefault(), C(i));
    }
    function B(l) {
      var i;
      !n.imageUploadEnabled || x(((i = l.dataTransfer) == null ? void 0 : i.files) ?? []).length === 0 || (l.preventDefault(), p.value += 1);
    }
    function E(l) {
      var i;
      !n.imageUploadEnabled || x(((i = l.dataTransfer) == null ? void 0 : i.files) ?? []).length === 0 || (l.preventDefault(), l.dataTransfer && (l.dataTransfer.dropEffect = "copy"));
    }
    function O(l) {
      !n.imageUploadEnabled || p.value === 0 || (l.preventDefault(), p.value = Math.max(0, p.value - 1));
    }
    function J(l) {
      var i;
      !n.imageUploadEnabled || !((i = l.dataTransfer) != null && i.files.length) || x(l.dataTransfer.files).length !== 0 && (l.preventDefault(), p.value = 0, C(l.dataTransfer.files));
    }
    function ce(l) {
      const i = $.value;
      if (!i) return;
      const y = u.value, j = (y == null ? void 0 : y.value) || m.value, G = Ge(j, i);
      n.selectedSkills.includes(l) || t("update:selected-skills", [...n.selectedSkills, l]), t("update:draft", G.text), m.value = G.text, $.value = null, re(() => {
        const Q = u.value;
        Q == null || Q.focus(), Q == null || Q.setSelectionRange(G.cursor, G.cursor);
      });
    }
    function Me(l) {
      if (h.value) {
        if (l.key === "Escape") {
          l.preventDefault(), $.value = null;
          return;
        }
        if (l.key === "ArrowDown" || l.key === "ArrowUp") {
          l.preventDefault();
          const i = A.value.length;
          i && (f.value = (f.value + (l.key === "ArrowDown" ? 1 : -1) + i) % i);
          return;
        }
        if (l.key === "Enter" && !l.ctrlKey && !l.metaKey && A.value.length) {
          l.preventDefault(), ce(A.value[Math.min(f.value, A.value.length - 1)].value);
          return;
        }
      }
      l.key !== "Enter" || l.isComposing || !l.ctrlKey && !l.metaKey || (l.preventDefault(), me());
    }
    function me() {
      H.value && t("send");
    }
    return (l, i) => (r(), d("form", {
      class: "cody-composer",
      "data-variant": e.variant,
      "data-cody-component": "composer-surface",
      onSubmit: ie(me, ["prevent"])
    }, [
      c("div", {
        class: "cody-composer-shell",
        "data-image-drag-active": te.value,
        onDragenter: B,
        onDragover: E,
        onDragleave: O,
        onDrop: J
      }, [
        c("input", {
          ref_key: "imageInputRef",
          ref: v,
          class: "cody-composer-image-input",
          type: "file",
          accept: "image/png,image/jpeg,image/webp,image/gif",
          multiple: "",
          tabindex: "-1",
          "aria-hidden": "true",
          onChange: M
        }, null, 544),
        e.images.length ? (r(), d("ul", Gt, [
          (r(!0), d(U, null, P(e.images, (y) => (r(), d("li", {
            key: y.id,
            class: "cody-composer-image"
          }, [
            c("img", {
              src: y.url,
              alt: y.name || "待发送图片"
            }, null, 8, Qt),
            c("button", {
              type: "button",
              disabled: e.disabled,
              "aria-label": `移除图片 ${y.name || "附件"}`,
              onClick: (j) => t("remove-image", y.id)
            }, "×", 8, Zt)
          ]))), 128))
        ])) : D("", !0),
        e.selectedSkills.length ? (r(), d("div", Xt, [
          (r(!0), d(U, null, P(e.selectedSkills, (y) => (r(), d("span", {
            key: y,
            class: "cody-composer-chip"
          }, [
            de(" $" + L(oe(e.skills, y)) + " ", 1),
            c("button", {
              type: "button",
              disabled: e.disabled,
              "aria-label": `移除 Skill ${oe(e.skills, y)}`,
              onClick: (j) => ne(y)
            }, "×", 8, Yt)
          ]))), 128))
        ])) : D("", !0),
        c("textarea", {
          ref_key: "draftInputRef",
          ref: u,
          value: e.draft,
          rows: "1",
          disabled: e.disabled,
          placeholder: e.placeholder,
          "aria-expanded": h.value,
          "aria-controls": h.value ? S : void 0,
          "aria-activedescendant": K.value,
          "aria-autocomplete": "list",
          onInput: q,
          onClick: b,
          onKeyup: b,
          onBlur: k,
          onPaste: T,
          onKeydown: Me
        }, null, 40, Jt),
        h.value ? (r(), d("div", {
          key: 2,
          id: S,
          class: "cody-composer-skill-menu",
          role: "listbox",
          "aria-label": "可引用 Skills"
        }, [
          A.value.length === 0 ? (r(), d("p", eo, "没有匹配的 Skill")) : (r(!0), d(U, { key: 1 }, P(A.value, (y, j) => (r(), d("button", {
            id: g(j),
            key: y.value,
            class: ue(["cody-composer-skill-option", { active: j === f.value }]),
            type: "button",
            role: "option",
            "aria-selected": j === f.value,
            onMouseenter: (G) => f.value = j,
            onMousedown: ie((G) => ce(y.value), ["prevent"])
          }, [
            c("span", oo, "$" + L(y.label), 1),
            y.description ? (r(), d("span", ao, L(y.description), 1)) : D("", !0)
          ], 42, to))), 128))
        ])) : D("", !0),
        c("div", no, [
          c("div", so, [
            e.imageUploadEnabled ? (r(), d("button", {
              key: 0,
              class: "cody-composer-image-picker",
              type: "button",
              disabled: e.disabled || e.isUploadingImages,
              "aria-label": "添加图片",
              title: "添加图片（也可粘贴或拖拽）",
              onClick: z
            }, [...i[6] || (i[6] = [
              c("svg", {
                viewBox: "0 0 24 24",
                "aria-hidden": "true"
              }, [
                c("path", { d: "M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-13Z" }),
                c("circle", {
                  cx: "8.5",
                  cy: "8.5",
                  r: "1.5"
                }),
                c("path", { d: "m5 18 5.1-5.1a1.5 1.5 0 0 1 2.1 0l2.1 2.1 1.1-1.1a1.5 1.5 0 0 1 2.1 0L20 16.4" })
              ], -1)
            ])], 8, lo)) : D("", !0),
            ee(l.$slots, "leading"),
            e.collaborationModes.length ? (r(), pe(V(o), {
              key: 1,
              label: "协作模式",
              "model-value": e.selectedCollaborationMode,
              options: e.collaborationModes,
              disabled: e.disabled || e.isRunning,
              "onUpdate:modelValue": i[0] || (i[0] = (y) => t("update:collaboration-mode", y))
            }, null, 8, ["model-value", "options", "disabled"])) : D("", !0),
            N(V(o), {
              label: "提交策略",
              "model-value": e.selectedSubmitMode,
              options: e.submitModes,
              disabled: e.disabled,
              "onUpdate:modelValue": i[1] || (i[1] = (y) => t("update:submit-mode", y))
            }, null, 8, ["model-value", "options", "disabled"]),
            e.models.length ? (r(), pe(V(o), {
              key: 2,
              label: "模型",
              "model-value": e.selectedModel,
              options: e.models,
              disabled: e.disabled || e.isRunning,
              "onUpdate:modelValue": i[2] || (i[2] = (y) => t("update:model", y))
            }, null, 8, ["model-value", "options", "disabled"])) : D("", !0),
            N(V(o), {
              label: "推理强度",
              "model-value": e.selectedReasoning,
              options: e.reasoningOptions,
              disabled: e.disabled || e.isRunning,
              "onUpdate:modelValue": i[3] || (i[3] = (y) => t("update:reasoning", y))
            }, null, 8, ["model-value", "options", "disabled"]),
            N(V(o), {
              label: "权限",
              "model-value": e.selectedPermission,
              options: e.permissionOptions,
              disabled: e.disabled || e.isRunning,
              "onUpdate:modelValue": i[4] || (i[4] = (y) => t("update:permission", y))
            }, null, 8, ["model-value", "options", "disabled"]),
            ee(l.$slots, "controls")
          ]),
          c("div", io, [
            e.isRunning ? (r(), d("button", {
              key: 0,
              class: "cody-composer-stop",
              type: "button",
              disabled: e.disabled,
              "aria-label": "停止当前回复",
              title: "停止当前回复",
              onClick: i[5] || (i[5] = (y) => t("stop"))
            }, [...i[7] || (i[7] = [
              c("span", {
                class: "cody-composer-stop-icon",
                "aria-hidden": "true"
              }, null, -1)
            ])], 8, ro)) : D("", !0),
            c("button", {
              class: "cody-composer-send",
              type: "submit",
              disabled: !H.value,
              "aria-label": Y.value,
              title: Y.value
            }, [...i[8] || (i[8] = [
              c("svg", {
                viewBox: "0 0 24 24",
                "aria-hidden": "true"
              }, [
                c("path", { d: "M12 19V5m0 0-6 6m6-6 6 6" })
              ], -1)
            ])], 8, uo)
          ])
        ]),
        W.value ? (r(), d("p", co, L(W.value), 1)) : D("", !0),
        e.imageError ? (r(), d("p", mo, L(e.imageError), 1)) : e.imageUploadEnabled && e.isUploadingImages ? (r(), d("p", po, "正在处理图片…")) : D("", !0)
      ], 40, Kt)
    ], 40, Nt));
  }
});
function Ao() {
  const e = Re(le());
  let a = null, o = null, n = 0;
  const t = () => {
    n += 1, o == null || o(), o = null, a == null || a.dispose(), a = null;
  }, u = async (A, h) => {
    t(), e.value = le(A);
    const K = n, W = Ze(A, h);
    a = W, o = W.subscribe((H) => {
      a === W && n === K && (e.value = H);
    }), await W.start();
  }, v = async () => {
    await (a == null ? void 0 : a.refresh());
  }, m = async (A, h) => {
    if (!a) throw new Error("Conversation controller is not connected.");
    return a.submitUserMessage(A, h);
  }, $ = async (A, h) => {
    if (!a) throw new Error("Conversation controller is not connected.");
    return a.retryFailedUserMessage(A, h);
  }, f = (A) => a == null ? void 0 : a.discardFailedUserMessage(A), p = async () => {
    if (!a) throw new Error("Conversation controller is not connected.");
    await a.interrupt();
  }, s = (A = "") => {
    t(), e.value = le(A);
  }, S = () => {
    t();
  };
  return Oe() && _e(S), {
    state: R(() => e.value),
    connect: u,
    submitUserMessage: m,
    retryFailedUserMessage: $,
    discardFailedUserMessage: f,
    interrupt: p,
    refresh: v,
    reset: s,
    dispose: S
  };
}
export {
  xo as CodyComposer,
  So as CodyConversation,
  Le as CodyImagePreviewDialog,
  $e as CodyMarkdown,
  wt as CodyRequestCard,
  X as DEFAULT_CODY_MARKDOWN_LABELS,
  Co as conversationEntriesFromState,
  qe as questionFieldsFromParams,
  ke as renderCodyMarkdown,
  nt as requestSummary,
  be as stabilizeStreamingMarkdown,
  Ao as useConversationController
};
