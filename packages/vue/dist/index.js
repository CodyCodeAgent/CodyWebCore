import { defineComponent as Z, ref as P, watch as ne, nextTick as ce, onMounted as xe, onBeforeUnmount as Ae, openBlock as l, createElementBlock as r, withModifiers as de, createElementVNode as u, createCommentVNode as D, computed as B, Fragment as I, createVNode as N, reactive as Ie, toDisplayString as $, renderList as z, createTextVNode as ae, normalizeClass as ue, withDirectives as _e, withKeys as Re, vModelDynamic as Be, renderSlot as te, unref as R, h as le, useId as Oe, createBlock as fe, shallowRef as Fe, getCurrentScope as Pe, onScopeDispose as ze } from "vue";
import { parseAttachmentText as ie, attachmentDownloadUrl as ge, composerHasContent as je, isImageAttachment as ve, removeComposerTrigger as Ve, findComposerTrigger as We } from "@codycodeagent/cody-web-core/composer";
import { buildApprovalRiskSummary as He, toolStatusTone as ye, buildToolOutputPreview as Ke, isToolOutputTruncated as Ne, toolOutputToggleLabel as Ge } from "@codycodeagent/cody-web-core/presentation";
import Le from "dompurify";
import Qe from "markdown-it";
import Ze from "markdown-it-footnote";
import Xe from "markdown-it-task-lists";
import { conversationFeedFromState as Ye, formatTurnDuration as Je, createConversationState as re } from "@codycodeagent/cody-web-core/conversation";
import { createConversationController as et } from "@codycodeagent/cody-web-core/client";
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
}, _ = new Qe({ breaks: !0, html: !1, linkify: !0, typographer: !1 });
_.use(Xe, { enabled: !1, label: !0, labelAfter: !0 });
_.use(Ze);
function V(e, s) {
  return `<button type="button" class="markdown-tool-button" data-markdown-action="${e}" aria-label="${s}" title="${s}">${s}</button>`;
}
function qe(e, s = "", n = X) {
  const a = s.toLowerCase();
  if (a === "mermaid" || a === "plantuml" || a === "puml") {
    const T = a === "mermaid" ? "mermaid" : "plantuml";
    return `<div class="markdown-diagram-shell" data-diagram-engine="${T}"><header class="markdown-diagram-toolbar"><span>${T}</span><span class="markdown-diagram-actions">${V("diagram-zoom-out", n.zoomOut)}${V("diagram-fit", n.fit)}${V("diagram-zoom-in", n.zoomIn)}${V("diagram-source", n.source)}${V("diagram-fullscreen", n.fullscreen)}${V("diagram-export-svg", "SVG")}${V("diagram-export-png", "PNG")}</span></header><div class="markdown-diagram-stage" role="img" aria-label="${n.diagramAria(T)}" style="color:#111827;background:#fff"><p class="markdown-diagram-status">${n.rendering(T)}</p></div><pre class="markdown-diagram-source" hidden><code>${_.utils.escapeHtml(e)}</code></pre></div>
`;
  }
  const t = e.replace(/\n$/u, "").split(`
`), c = t.length <= 2 && t.every((T) => T.length <= 96), y = t.length > 10, m = s || "text", h = [c ? "is-compact-code" : "", /^[A-Za-z0-9_-]+$/u.test(s) ? `language-${s}` : ""].filter(Boolean).join(" "), w = h ? ` class="${h}"` : "", v = [c ? "is-compact" : "", y ? "is-collapsible is-collapsed" : ""].filter(Boolean).join(" "), f = y ? `${m} · ${n.lineCount(t.length)}` : m, o = y ? `<button type="button" class="markdown-tool-button markdown-code-collapse" data-markdown-action="toggle-code" aria-label="${n.collapseCode}" title="${n.collapseCode}" aria-expanded="false">${n.collapseCode}</button>` : "", x = y ? `<div class="markdown-code-expand"><button type="button" data-markdown-action="toggle-code" aria-expanded="false">${n.expandCode(t.length)}</button></div>` : "";
  return `<div class="markdown-code-host"><div class="markdown-code-shell${v ? ` ${v}` : ""}" data-language="${m}" data-code-lines="${String(t.length)}"><header class="markdown-code-toolbar"><span>${f}</span><span class="markdown-code-actions">${o}${V("wrap-code", n.wrap)}${V("copy-code", n.copy)}${V("save-code", n.save)}</span></header><pre class="markdown-code-block${c ? " is-compact" : ""}"><code${w}>${_.utils.escapeHtml(e)}</code></pre>${x}</div></div>
`;
}
_.renderer.rules.fence = (e, s, n, a) => {
  const t = e[s];
  return qe(t.content, t.info.trim().split(/\s+/u)[0] ?? "", a.labels);
};
_.renderer.rules.code_block = (e, s, n, a) => qe(e[s].content, "", a.labels);
_.renderer.rules.table_open = (e, s, n, a) => {
  const t = a.labels ?? X;
  return `<section class="markdown-table-shell" role="region" aria-label="${t.dataTable}" tabindex="0"><header class="markdown-table-toolbar">${V("copy-table", t.copyCsv)}</header><div class="markdown-table-scroll"><table>
`;
};
_.renderer.rules.table_close = () => `</table></div></section>
`;
const ke = _.renderer.rules.code_inline;
_.renderer.rules.code_inline = (e, s, n, a, t) => {
  const c = e[s].content, y = c.match(/^(.+?\.[A-Za-z0-9_-]{1,12})(?::(\d+))?$/u);
  if (!y || /\s/u.test(c)) return ke ? ke(e, s, n, a, t) : t.renderToken(e, s, n);
  const m = _.utils.escapeHtml(y[1]), h = y[2] ?? "", w = a.labels ?? X;
  return `<button type="button" class="markdown-file-link" data-markdown-action="open-file" data-file-path="${m}" data-file-line="${h}" title="${w.openFile(m)}"><code>${_.utils.escapeHtml(c)}</code></button>`;
};
function Me(e) {
  if (!e || /^(?:[A-Za-z][A-Za-z\d+.-]*:|\/\/|#)/u.test(e)) return;
  const s = e.match(/^(.*?)(?:#L?(\d+))?$/u), n = (s == null ? void 0 : s[1]) ?? e, a = (s == null ? void 0 : s[2]) ?? "";
  if (/[?#]/u.test(n)) return;
  const t = n.startsWith("/") || n.startsWith("./") || n.startsWith("../"), c = /(?:^|\/)[^/?#]+\.[A-Za-z\d_-]{1,12}$/u.test(n);
  if (!(!t && !c))
    return { path: n, line: a };
}
function tt(e, s) {
  let n = 0;
  for (let a = s - 1; a >= 0; a -= 1)
    if (e[a].type === "link_close" && (n += 1), e[a].type === "link_open") {
      if (n === 0) return e[a];
      n -= 1;
    }
}
const be = _.renderer.rules.link_open;
_.renderer.rules.link_open = (e, s, n, a, t) => {
  const c = e[s], y = c.attrGet("href") ?? "", m = Me(y);
  if (m) {
    const h = a.labels ?? X, w = _.utils.escapeHtml(m.path);
    return `<button type="button" class="markdown-file-link" data-markdown-action="open-file" data-file-path="${w}" data-file-line="${m.line}" title="${h.openFile(w)}">`;
  }
  return /^https?:\/\//u.test(y) && (c.attrSet("target", "_blank"), c.attrSet("rel", "noopener noreferrer")), be ? be(e, s, n, a, t) : t.renderToken(e, s, n);
};
const he = _.renderer.rules.link_close;
_.renderer.rules.link_close = (e, s, n, a, t) => {
  var y;
  const c = ((y = tt(e, s)) == null ? void 0 : y.attrGet("href")) ?? "";
  return Me(c) ? "</button>" : he ? he(e, s, n, a, t) : t.renderToken(e, s, n);
};
function $e(e, s = X) {
  return Le.sanitize(_.render(e, { labels: s }), {
    ADD_ATTR: ["target"],
    ADD_TAGS: ["table", "thead", "tbody", "tr", "th", "td", "h1", "h2", "h3", "h4", "h5", "h6"],
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed"]
  });
}
function we(e) {
  var s;
  return (((s = e.match(/^\s*```/gmu)) == null ? void 0 : s.length) ?? 0) % 2 === 1 ? `${e}

\`\`\`` : e;
}
let ot = 0, Ce = Promise.resolve();
const at = async () => import("mermaid");
async function nt(e, s, n = at) {
  const a = `cody-diagram-${String(++ot)}`, t = Ce.then(async () => {
    var c, y, m;
    try {
      const { default: h } = await n();
      return h.initialize({
        startOnLoad: !1,
        securityLevel: "strict",
        suppressErrorRendering: !0,
        theme: "default",
        themeVariables: { background: "#ffffff" },
        htmlLabels: !1,
        flowchart: { htmlLabels: !1, useMaxWidth: !1 }
      }), (await h.render(a, e, s)).svg;
    } finally {
      (c = document.getElementById(a)) == null || c.remove(), (y = document.getElementById(`d${a}`)) == null || y.remove(), (m = document.getElementById(`i${a}`)) == null || m.remove();
    }
  });
  return Ce = t.then(() => {
  }, () => {
  }), t;
}
const st = ["aria-label"], lt = ["src", "alt"], De = /* @__PURE__ */ Z({
  __name: "CodyImagePreviewDialog",
  props: {
    src: {},
    alt: { default: "图片预览" }
  },
  emits: ["dismiss"],
  setup(e, { emit: s }) {
    const n = e, a = s, t = P(null);
    ne(() => n.src, async (m) => {
      var h;
      m && (await ce(), (h = t.value) == null || h.focus());
    }, { flush: "post" });
    function c() {
      a("dismiss");
    }
    function y(m) {
      m.key === "Escape" && n.src && (m.preventDefault(), c());
    }
    return xe(() => window.addEventListener("keydown", y)), Ae(() => window.removeEventListener("keydown", y)), (m, h) => e.src ? (l(), r("div", {
      key: 0,
      ref_key: "dialogRef",
      ref: t,
      class: "cody-image-preview-dialog",
      role: "dialog",
      "aria-modal": "true",
      "aria-label": e.alt,
      tabindex: "-1",
      onClick: de(c, ["self"])
    }, [
      u("button", {
        type: "button",
        "aria-label": "关闭图片预览",
        onClick: c
      }, "×"),
      u("img", {
        src: e.src,
        alt: e.alt
      }, null, 8, lt)
    ], 8, st)) : D("", !0);
  }
}), it = ["innerHTML"], Se = /* @__PURE__ */ Z({
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
  setup(e, { emit: s }) {
    const n = e, a = s, t = B(() => n.labels ?? X), c = P(null), y = P($e(we(n.text), t.value)), m = P(""), h = /* @__PURE__ */ new Set();
    let w = 0;
    const v = {
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
      window.clearTimeout(w), w = window.setTimeout(async () => {
        y.value = $e(we(g), t.value), await ce(), o();
      }, n.renderDelay);
    }
    async function o() {
      var A, b, k, q, S, O;
      for (const M of Array.from(((A = c.value) == null ? void 0 : A.querySelectorAll("td")) ?? []))
        /^-?[\d,.]+%?$/u.test(((b = M.textContent) == null ? void 0 : b.trim()) ?? "") && (M.dataset.numeric = "true");
      for (const M of Array.from(((k = c.value) == null ? void 0 : k.querySelectorAll("img")) ?? []))
        M.addEventListener("error", () => {
          M.alt = M.alt || "图片加载失败", M.classList.add("is-load-error");
        }, { once: !0 });
      x();
      for (const [M, E] of Array.from(((q = c.value) == null ? void 0 : q.querySelectorAll(".markdown-code-shell")) ?? []).entries()) {
        E.dataset.codeIndex = String(M), E.classList.contains("is-collapsible") && h.has(M) && E.classList.remove("is-collapsed");
        for (const F of Array.from(E.querySelectorAll('[data-markdown-action="toggle-code"]')))
          F.setAttribute("aria-expanded", String(!E.classList.contains("is-collapsed")));
        const j = E.querySelector("pre"), U = E.querySelector('[data-markdown-action="wrap-code"]');
        j && U && (U.hidden = j.scrollWidth <= j.clientWidth + 2, U.setAttribute("aria-pressed", String(E.classList.contains("is-wrapped"))));
      }
      await T();
      const g = Array.from(((S = c.value) == null ? void 0 : S.querySelectorAll('pre code[class*="language-"]')) ?? []);
      if (g.length === 0) return;
      const C = (await import("highlight.js/lib/core")).default;
      for (const M of g) {
        const E = ((O = Array.from(M.classList).find((F) => F.startsWith("language-"))) == null ? void 0 : O.slice(9)) ?? "", j = v[E];
        if (!j || M.dataset.highlighted === "yes") continue;
        const U = await j();
        C.getLanguage(E) || C.registerLanguage(E, U.default), M.innerHTML = C.highlight(M.textContent ?? "", { language: E }).value, M.dataset.highlighted = "yes";
      }
    }
    function x() {
      var C;
      if (!n.resolveAssetUrl) return;
      const g = /\.(?:svg|png|jpe?g|gif|webp)(?:[?#].*)?$/iu;
      for (const A of Array.from(((C = c.value) == null ? void 0 : C.querySelectorAll("a[href]")) ?? [])) {
        const b = A.getAttribute("href") ?? "";
        if (!g.test(b) || /^(?:data|blob):/iu.test(b)) continue;
        const k = n.resolveAssetUrl(b);
        k && (A.href = k, A.target = "_blank", A.rel = "noopener noreferrer");
      }
    }
    async function T() {
      var C, A, b, k;
      const g = Array.from(((C = c.value) == null ? void 0 : C.querySelectorAll(".markdown-diagram-shell:not([data-rendered])")) ?? []);
      for (const q of g) {
        q.dataset.rendered = "loading";
        const S = q.dataset.diagramEngine === "plantuml" ? "plantuml" : "mermaid", O = ((A = q.querySelector("code")) == null ? void 0 : A.textContent) ?? "", M = q.querySelector(".markdown-diagram-stage");
        if (M) {
          M.style.setProperty("color", "#111827"), M.style.setProperty("background", "#ffffff");
          try {
            let E = await ((b = n.renderDiagram) == null ? void 0 : b.call(n, { engine: S, source: O, dark: n.dark }));
            if (!E && S === "mermaid" && (E = await nt(O, M)), !E) throw new Error(S === "plantuml" ? "当前环境未配置 PlantUML 渲染器" : "图表渲染失败");
            M.innerHTML = L(E), W(M), q.dataset.rendered = "yes", q.style.setProperty("--diagram-scale", "1");
          } catch (E) {
            M.textContent = E instanceof Error ? E.message : "图表渲染失败", M.classList.add("markdown-diagram-error"), (k = q.querySelector(".markdown-diagram-source")) == null || k.removeAttribute("hidden"), q.dataset.rendered = "error";
          }
        }
      }
    }
    function L(g) {
      const C = Le.sanitize(g, { USE_PROFILES: { svg: !0, svgFilters: !0, html: !0 }, ADD_TAGS: ["foreignObject"], ADD_ATTR: ["xmlns"] }), A = C.trimStart().startsWith("<svg") ? C : `<svg xmlns="http://www.w3.org/2000/svg">${C}</svg>`, b = new DOMParser().parseFromString(A, "image/svg+xml");
      if (b.querySelector("parsererror")) return "";
      for (const k of b.querySelectorAll("*")) for (const q of Array.from(k.attributes)) /^on/iu.test(q.name) && k.removeAttribute(q.name);
      return b.querySelectorAll("script").forEach((k) => k.remove()), new XMLSerializer().serializeToString(b.documentElement);
    }
    function W(g) {
      if (g.dataset.panReady === "true") return;
      g.dataset.panReady = "true";
      let C = 0, A = 0, b = 0, k = 0;
      g.addEventListener("pointerdown", (S) => {
        S.button === 0 && (C = S.clientX, A = S.clientY, b = g.scrollLeft, k = g.scrollTop, g.setPointerCapture(S.pointerId), g.classList.add("is-panning"));
      }), g.addEventListener("pointermove", (S) => {
        g.hasPointerCapture(S.pointerId) && (g.scrollLeft = b - (S.clientX - C), g.scrollTop = k - (S.clientY - A));
      });
      const q = (S) => {
        g.hasPointerCapture(S.pointerId) && g.releasePointerCapture(S.pointerId), g.classList.remove("is-panning");
      };
      g.addEventListener("pointerup", q), g.addEventListener("pointercancel", q);
    }
    function K(g, C = 0) {
      const A = Number(g.style.getPropertyValue("--diagram-scale") || "1");
      g.style.setProperty("--diagram-scale", String(C === 0 ? 1 : Math.min(2.5, Math.max(0.4, A + C))));
    }
    function Y(g, C) {
      const A = document.createElement("a");
      A.href = URL.createObjectURL(g), A.download = C, A.click(), URL.revokeObjectURL(A.href);
    }
    async function J(g, C) {
      const A = C.textContent;
      try {
        await navigator.clipboard.writeText(g), C.textContent = "已复制";
      } catch {
        const b = document.createElement("textarea");
        b.value = g, b.style.position = "fixed", b.style.opacity = "0", document.body.appendChild(b), b.select();
        const k = document.execCommand("copy");
        b.remove(), C.textContent = k ? "已复制" : "复制失败";
      }
      window.setTimeout(() => {
        C.textContent = A;
      }, 1200);
    }
    function se(g) {
      return Array.from((g == null ? void 0 : g.rows) ?? []).map((C) => Array.from(C.cells).map((A) => {
        var b;
        return `"${((b = A.textContent) == null ? void 0 : b.trim().replace(/"/gu, '""')) ?? ""}"`;
      }).join(",")).join(`
`);
    }
    function oe(g) {
      var O, M, E, j;
      const C = g.target, A = C.closest("img");
      if (A) {
        m.value = A.currentSrc || A.src;
        return;
      }
      const b = C.closest("[data-markdown-action]");
      if (!b) return;
      const k = b.closest(".markdown-code-shell, .markdown-table-shell"), q = b.dataset.markdownAction;
      if (q === "copy-code" && J(((O = k == null ? void 0 : k.querySelector("code")) == null ? void 0 : O.textContent) ?? "", b), q === "wrap-code") {
        const U = (k == null ? void 0 : k.classList.toggle("is-wrapped")) ?? !1;
        b.textContent = U && t.value.scroll || t.value.wrap, b.setAttribute("aria-pressed", String(U));
      }
      if (q === "save-code" && Y(new Blob([((M = k == null ? void 0 : k.querySelector("code")) == null ? void 0 : M.textContent) ?? ""], { type: "text/plain" }), `snippet.${(k == null ? void 0 : k.dataset.language) || "txt"}`), q === "toggle-code" && (k != null && k.classList.contains("is-collapsible"))) {
        const U = Number(k.dataset.codeIndex ?? -1), F = !k.classList.toggle("is-collapsed");
        U >= 0 && (F ? h.add(U) : h.delete(U));
        for (const ee of Array.from(k.querySelectorAll('[data-markdown-action="toggle-code"]'))) ee.setAttribute("aria-expanded", String(F));
      }
      if (q === "copy-table" && J(se((k == null ? void 0 : k.querySelector("table")) ?? null), b), q === "open-file") {
        const U = b.dataset.filePath ?? "", F = ((E = n.cwd) == null ? void 0 : E.replace(/\/$/u, "")) ?? "", ee = U.startsWith("/") && F && U.startsWith(`${F}/`) ? U.slice(F.length + 1) : U.replace(/^\.\//u, "");
        a("openFile", { path: ee, line: Number(b.dataset.fileLine || 0) || 1 });
      }
      const S = b.closest(".markdown-diagram-shell");
      if (S && q === "diagram-zoom-in" && K(S, 0.2), S && q === "diagram-zoom-out" && K(S, -0.2), S && q === "diagram-fit" && K(S), S && q === "diagram-source") {
        const U = S.querySelector(".markdown-diagram-source");
        U && (U.hidden = !U.hidden);
      }
      if (S && q === "diagram-fullscreen" && ((j = S.requestFullscreen) == null || j.call(S)), S && q === "diagram-export-svg") {
        const U = S.querySelector("svg");
        U && Y(new Blob([new XMLSerializer().serializeToString(U)], { type: "image/svg+xml" }), "diagram.svg");
      }
    }
    return ne(() => [n.text, n.labels], ([g]) => {
      f(g);
    }, { deep: !0 }), xe(() => {
      o();
    }), Ae(() => window.clearTimeout(w)), (g, C) => (l(), r(I, null, [
      u("div", {
        ref_key: "rootRef",
        ref: c,
        class: "cody-markdown cody-markdown-renderer",
        innerHTML: y.value,
        onClick: oe
      }, null, 8, it),
      N(De, {
        src: m.value,
        alt: "Markdown 图片预览",
        onDismiss: C[0] || (C[0] = (A) => m.value = "")
      }, null, 8, ["src"])
    ], 64));
  }
});
function Ee(e) {
  if (!e || typeof e != "object") return [];
  const s = e;
  return (Array.isArray(s.questions) ? s.questions : []).flatMap((a, t) => {
    if (!a || typeof a != "object") return [];
    const c = a, y = typeof c.question == "string" ? c.question.trim() : "";
    if (!y) return [];
    const m = Array.isArray(c.options) ? c.options : [];
    return [{
      id: typeof c.id == "string" && c.id.trim() ? c.id.trim() : `question-${String(t + 1)}`,
      header: typeof c.header == "string" ? c.header.trim() : "",
      question: y,
      isOther: c.isOther === !0,
      isSecret: c.isSecret === !0,
      options: m.flatMap((h) => {
        if (!h || typeof h != "object") return [];
        const w = h, v = typeof w.label == "string" ? w.label.trim() : "";
        return v ? [{ label: v, description: typeof w.description == "string" ? w.description.trim() : "" }] : [];
      })
    }];
  });
}
function rt(e) {
  var a;
  if (!e || typeof e != "object") return "Codex 请求执行一项受保护操作。";
  const s = e, n = s.reason ?? s.question ?? s.command;
  return typeof n == "string" && n.trim() ? n : ((a = Ee(e)[0]) == null ? void 0 : a.question) ?? "Codex 请求执行一项受保护操作。";
}
function Io(e) {
  var a;
  const s = [], n = (t) => {
    if (t.kind === "reasoning") {
      s.push({ id: t.id, kind: "reasoning", text: t.text });
      return;
    }
    if (!t.tool.summary && t.tool.details.length === 0 && !t.tool.output && t.tool.kind !== "fileChange") return;
    if (t.tool.kind !== "fileChange") {
      s.push({ id: t.id, kind: "tool", tool: t.tool });
      return;
    }
    const c = `file-group:${t.turnId ?? t.id}`, y = s.at(-1);
    if (!y || y.kind !== "tool" || y.id !== c) {
      const w = [...new Set(t.tool.details)], v = {
        id: c,
        kind: "tool",
        tool: {
          ...t.tool,
          title: w.length > 1 ? `文件变更 · ${String(w.length)} 个文件` : "文件变更",
          summary: w.length ? `${String(w.length)} 个文件已更新` : t.tool.summary,
          details: w
        }
      };
      s.push(v);
      return;
    }
    const m = [.../* @__PURE__ */ new Set([...y.tool.details, ...t.tool.details])], h = [y.tool.output, t.tool.output].filter(Boolean).join(`

`);
    y.tool = {
      ...y.tool,
      status: /fail|error|cancel|reject/iu.test(`${y.tool.status} ${t.tool.status}`) ? "failed" : t.tool.status,
      title: m.length > 1 ? `文件变更 · ${String(m.length)} 个文件` : "文件变更",
      summary: m.length ? `${String(m.length)} 个文件已更新` : t.tool.summary,
      details: m,
      ...h ? { output: h } : {}
    };
  };
  for (const t of Ye(e))
    if (t.kind === "message") s.push({ id: t.id, kind: "message", message: t.message });
    else if (t.kind === "timeline") n(t.entry);
    else if (t.kind === "plan") s.push({ id: t.id, kind: "plan", text: t.plan.text });
    else if (t.kind === "request") s.push({ id: t.id, kind: "request", request: t.request });
    else if (t.kind === "turn" && t.status === "failed") s.push({ id: t.id, kind: "failure", text: t.error });
    else {
      if (t.kind === "turn" && t.status === "interrupted") continue;
      t.kind === "turn" && t.status === "completed" ? s.push({ id: t.id, kind: "worked", label: `Worked for ${Je(t.durationMs ?? 0)}` }) : t.kind === "activity" && s.push({
        id: t.id,
        kind: "activity",
        title: t.status === "waiting" ? ((a = e.pendingRequests.find((c) => !c.turnId || c.turnId === t.turnId)) == null ? void 0 : a.kind) === "approval" ? "等待你的审批" : "等待你的回答" : t.label,
        detail: t.status === "waiting" ? "处理后 Codex 会继续本次回复" : t.status === "retrying" ? e.connection.status === "disconnected" ? "连接已中断，等待恢复" : "正在恢复本次回复" : e.connection.status === "connected" ? "实时更新中" : "等待恢复连接",
        tone: t.status
      });
    }
  return s;
}
const dt = ["data-kind"], ct = { class: "cody-request-heading" }, ut = { key: 0 }, mt = {
  key: 0,
  class: "cody-question-options"
}, pt = ["onClick"], ft = { key: 0 }, gt = ["onUpdate:modelValue", "type", "placeholder"], vt = { class: "cody-request-actions" }, yt = ["disabled"], kt = { class: "cody-approval-risk-heading" }, bt = ["data-level"], ht = { class: "cody-approval-risk-subject" }, $t = {
  key: 0,
  class: "cody-approval-risk-labels"
}, wt = {
  key: 1,
  class: "cody-approval-risk-details"
}, Ct = { class: "cody-approval-risk-recommendation" }, St = { key: 1 }, xt = {
  key: 2,
  class: "cody-request-actions"
}, At = /* @__PURE__ */ Z({
  __name: "CodyRequestCard",
  props: {
    request: {}
  },
  emits: ["resolveApproval", "resolveQuestion"],
  setup(e, { emit: s }) {
    const n = e, a = s, t = Ie({}), c = B(() => Ee(n.request.params)), y = B(() => rt(n.request.params)), m = B(() => n.request.kind === "approval" ? He({ method: n.request.method, params: n.request.params }) : null), h = B(() => c.value.length > 0 && c.value.every((v) => {
      var f;
      return !!((f = t[v.id]) != null && f.trim());
    }));
    ne(() => n.request.id, () => {
      for (const v of Object.keys(t)) delete t[v];
    });
    function w() {
      h.value && a("resolveQuestion", n.request.id, Object.fromEntries(c.value.map((v) => [v.id, { answers: [t[v.id].trim()] }])));
    }
    return (v, f) => (l(), r("article", {
      class: "cody-request-card",
      "data-kind": e.request.kind
    }, [
      u("div", ct, [
        u("strong", null, $(e.request.kind === "approval" ? "需要你的确认" : "Codex 需要补充信息"), 1),
        f[2] || (f[2] = u("small", null, "Agent 已暂停等待", -1))
      ]),
      e.request.kind === "question" && c.value.length ? (l(), r(I, { key: 0 }, [
        (l(!0), r(I, null, z(c.value, (o) => (l(), r("fieldset", {
          key: o.id,
          class: "cody-question-field"
        }, [
          u("legend", null, [
            o.header ? (l(), r("span", ut, $(o.header), 1)) : D("", !0),
            ae($(o.question), 1)
          ]),
          o.options.length ? (l(), r("div", mt, [
            (l(!0), r(I, null, z(o.options, (x) => (l(), r("button", {
              key: x.label,
              type: "button",
              class: ue({ selected: t[o.id] === x.label }),
              onClick: (T) => t[o.id] = x.label
            }, [
              u("strong", null, $(x.label), 1),
              x.description ? (l(), r("small", ft, $(x.description), 1)) : D("", !0)
            ], 10, pt))), 128))
          ])) : D("", !0),
          o.options.length === 0 || o.isOther ? _e((l(), r("input", {
            key: 1,
            "onUpdate:modelValue": (x) => t[o.id] = x,
            type: o.isSecret ? "password" : "text",
            placeholder: o.options.length ? "其他回答…" : "输入回答…",
            onKeyup: Re(w, ["enter"])
          }, null, 40, gt)), [
            [Be, t[o.id]]
          ]) : D("", !0)
        ]))), 128)),
        u("div", vt, [
          u("button", {
            type: "button",
            disabled: !h.value,
            onClick: w
          }, "提交回答", 8, yt)
        ])
      ], 64)) : (l(), r(I, { key: 1 }, [
        m.value ? (l(), r(I, { key: 0 }, [
          u("div", kt, [
            u("div", null, [
              u("strong", null, $(m.value.title), 1),
              u("p", null, $(m.value.description), 1)
            ]),
            u("span", {
              class: "cody-approval-risk-level",
              "data-level": m.value.level
            }, $(m.value.level), 9, bt)
          ]),
          u("code", ht, $(m.value.subject), 1),
          m.value.riskLabels.length ? (l(), r("ul", $t, [
            (l(!0), r(I, null, z(m.value.riskLabels, (o) => (l(), r("li", { key: o }, $(o), 1))), 128))
          ])) : D("", !0),
          m.value.impacts.length ? (l(), r("details", wt, [
            f[3] || (f[3] = u("summary", null, "查看影响", -1)),
            u("ul", null, [
              (l(!0), r(I, null, z(m.value.impacts, (o) => (l(), r("li", { key: o }, $(o), 1))), 128))
            ])
          ])) : D("", !0),
          u("p", Ct, $(m.value.recommendation), 1)
        ], 64)) : (l(), r("p", St, $(y.value), 1)),
        e.request.kind === "approval" ? (l(), r("div", xt, [
          u("button", {
            type: "button",
            onClick: f[0] || (f[0] = (o) => a("resolveApproval", e.request.id, "accept"))
          }, "允许一次"),
          u("button", {
            type: "button",
            "data-tone": "danger",
            onClick: f[1] || (f[1] = (o) => a("resolveApproval", e.request.id, "decline"))
          }, "拒绝")
        ])) : D("", !0)
      ], 64))
    ], 8, dt));
  }
}), Lt = ["data-variant"], qt = {
  key: 0,
  class: "cody-conversation-loading",
  role: "status"
}, Mt = {
  key: 1,
  class: "cody-conversation-empty"
}, Dt = {
  key: 0,
  class: "cody-worked-divider"
}, Et = ["data-role"], Ut = ["data-role"], Tt = { class: "cody-message-stack" }, It = { class: "cody-message-label" }, _t = {
  key: 0,
  class: "cody-message-skills"
}, Rt = {
  key: 1,
  class: "cody-message-body"
}, Bt = {
  key: 2,
  class: "cody-message-files",
  "aria-label": "消息附件"
}, Ot = ["href", "download"], Ft = { key: 0 }, Pt = { key: 1 }, zt = {
  key: 3,
  class: "cody-message-images"
}, jt = ["onClick"], Vt = ["src"], Wt = ["onClick"], Ht = ["onClick"], Kt = ["data-tone", "open"], Nt = { key: 0 }, Gt = ["onClick"], Qt = {
  key: 3,
  class: "cody-reasoning-card"
}, Zt = {
  key: 4,
  class: "cody-plan-card",
  open: ""
}, Xt = {
  key: 6,
  class: "cody-failure-card"
}, Yt = {
  key: 7,
  class: "cody-interrupted-card",
  role: "status"
}, Jt = ["data-tone"], _o = /* @__PURE__ */ Z({
  __name: "CodyConversation",
  props: {
    entries: {},
    loading: { type: Boolean },
    variant: { default: "standalone" }
  },
  emits: ["copy", "openFile", "retryMessage", "resolveApproval", "resolveQuestion"],
  setup(e, { emit: s }) {
    const n = s;
    function a(v) {
      return v.role === "user" ? ie(v.text).text : v.text;
    }
    const t = P({}), c = P("");
    function y(v, f) {
      return v === "failed" ? `发送失败${f ? `：${f}` : ""}` : v === "queued" ? `已加入发送队列${f ? `：${f}` : ""}` : v === "delivered" ? "已发送给当前任务" : "正在发送…";
    }
    function m(v) {
      t.value = {
        ...t.value,
        [v]: t.value[v] !== !0
      };
    }
    function h(v, f) {
      n("resolveApproval", v, f);
    }
    function w(v, f) {
      n("resolveQuestion", v, f);
    }
    return (v, f) => (l(), r("section", {
      class: "cody-conversation",
      "data-variant": e.variant,
      "data-cody-component": "conversation-surface"
    }, [
      e.loading ? (l(), r("div", qt, "正在同步对话…")) : e.entries.length === 0 ? (l(), r("div", Mt, [
        te(v.$slots, "empty", {}, () => [
          f[3] || (f[3] = ae("开始这个需求的开发", -1))
        ])
      ])) : (l(!0), r(I, { key: 2 }, z(e.entries, (o) => {
        var x, T;
        return l(), r(I, {
          key: o.id
        }, [
          o.kind === "worked" ? (l(), r("div", Dt, [
            u("span", null, $(o.label), 1)
          ])) : o.kind === "message" ? (l(), r("article", {
            key: 1,
            class: "cody-message",
            "data-role": o.message.role
          }, [
            u("div", {
              class: "cody-message-identity",
              "data-role": o.message.role
            }, $(o.message.role === "user" ? "你" : "CW"), 9, Ut),
            u("div", Tt, [
              u("div", It, $(o.message.role === "user" ? "你" : o.message.role === "assistant" ? "Codex Agent" : "系统"), 1),
              (x = o.message.skills) != null && x.length ? (l(), r("ul", _t, [
                (l(!0), r(I, null, z(o.message.skills, (L) => (l(), r("li", {
                  key: `${L.name}:${L.path}`
                }, "$" + $(L.displayName || L.name), 1))), 128))
              ])) : D("", !0),
              o.message.text ? (l(), r("div", Rt, [
                te(v.$slots, "markdown", {
                  message: { ...o.message, text: a(o.message) }
                }, () => [
                  N(Se, {
                    text: a(o.message),
                    onOpenFile: f[0] || (f[0] = (L) => n("openFile", L))
                  }, null, 8, ["text"])
                ])
              ])) : D("", !0),
              o.message.role === "user" && R(ie)(o.message.text).attachments.length ? (l(), r("ul", Bt, [
                (l(!0), r(I, null, z(R(ie)(o.message.text).attachments, (L) => (l(), r("li", {
                  key: L.id
                }, [
                  R(ge)(L.url) ? (l(), r("a", {
                    key: 0,
                    href: R(ge)(L.url),
                    download: L.name
                  }, [
                    ae($(L.name), 1),
                    L.size !== void 0 ? (l(), r("small", Ft, " · " + $(Math.ceil(L.size / 1024)) + " KB", 1)) : D("", !0)
                  ], 8, Ot)) : (l(), r("span", Pt, $(L.name), 1))
                ]))), 128))
              ])) : D("", !0),
              (T = o.message.images) != null && T.length ? (l(), r("div", zt, [
                (l(!0), r(I, null, z(o.message.images, (L) => (l(), r("button", {
                  key: L,
                  type: "button",
                  "aria-label": "打开对话图片预览",
                  onClick: (W) => c.value = L
                }, [
                  u("img", {
                    src: L,
                    alt: "对话图片",
                    loading: "lazy"
                  }, null, 8, Vt)
                ], 8, jt))), 128))
              ])) : D("", !0),
              o.message.outbox ? (l(), r("div", {
                key: 4,
                class: ue(["cody-message-outbox", o.message.outbox.status]),
                role: "status"
              }, [
                u("span", null, $(y(o.message.outbox.status, o.message.outbox.lastError)), 1),
                o.message.outbox.status === "failed" ? (l(), r("button", {
                  key: 0,
                  class: "cody-message-retry",
                  type: "button",
                  onClick: (L) => n("retryMessage", o.message)
                }, "重试此消息", 8, Wt)) : D("", !0)
              ], 2)) : D("", !0),
              o.message.text ? (l(), r("button", {
                key: 5,
                class: "cody-copy-button",
                type: "button",
                onClick: (L) => n("copy", o.message.text)
              }, "复制", 8, Ht)) : D("", !0)
            ])
          ], 8, Et)) : o.kind === "tool" ? (l(), r("details", {
            key: 2,
            class: "cody-tool-card",
            "data-tone": R(ye)(o.tool.status),
            open: R(ye)(o.tool.status) === "working"
          }, [
            u("summary", null, [
              f[4] || (f[4] = u("span", null, "⌁", -1)),
              u("strong", null, $(o.tool.title), 1),
              u("small", null, $(o.tool.status), 1)
            ]),
            u("p", null, $(o.tool.summary), 1),
            o.tool.details.length ? (l(), r("ul", Nt, [
              (l(!0), r(I, null, z(o.tool.details, (L) => (l(), r("li", { key: L }, $(L), 1))), 128))
            ])) : D("", !0),
            o.tool.output ? (l(), r(I, { key: 1 }, [
              u("pre", null, $(t.value[o.id] ? o.tool.output : R(Ke)(o.tool.output)), 1),
              R(Ne)(o.tool.output) ? (l(), r("button", {
                key: 0,
                class: "cody-tool-output-toggle",
                type: "button",
                onClick: (L) => m(o.id)
              }, $(R(Ge)(t.value[o.id] === !0)), 9, Gt)) : D("", !0)
            ], 64)) : D("", !0)
          ], 8, Kt)) : o.kind === "reasoning" ? (l(), r("details", Qt, [
            u("summary", null, "✦ " + $(o.title || "推理过程"), 1),
            u("pre", null, $(o.text), 1)
          ])) : o.kind === "plan" ? (l(), r("details", Zt, [
            f[5] || (f[5] = u("summary", null, "计划", -1)),
            N(Se, {
              text: o.text,
              onOpenFile: f[1] || (f[1] = (L) => n("openFile", L))
            }, null, 8, ["text"])
          ])) : o.kind === "request" ? te(v.$slots, "request", {
            request: o.request
          }, () => [
            N(At, {
              request: o.request,
              onResolveApproval: h,
              onResolveQuestion: w
            }, null, 8, ["request"])
          ], void 0, 5) : o.kind === "failure" ? (l(), r("details", Xt, [
            f[6] || (f[6] = u("summary", null, "本次回复失败", -1)),
            u("p", null, $(o.text), 1)
          ])) : o.kind === "interrupted" ? (l(), r("article", Yt, $(o.text), 1)) : o.kind === "activity" ? (l(), r("article", {
            key: 8,
            class: "cody-conversation-activity",
            "data-tone": o.tone,
            role: "status",
            "aria-live": "polite"
          }, [
            f[7] || (f[7] = u("span", {
              class: "cody-activity-pulse",
              "aria-hidden": "true"
            }, null, -1)),
            u("strong", null, $(o.title), 1),
            u("small", null, $(o.detail), 1)
          ], 8, Jt)) : D("", !0)
        ], 64);
      }), 128)),
      N(De, {
        src: c.value,
        alt: "对话图片预览",
        onDismiss: f[2] || (f[2] = (o) => c.value = "")
      }, null, 8, ["src"])
    ], 8, Lt));
  }
}), eo = ["data-variant"], to = ["data-image-drag-active"], oo = ["accept"], ao = {
  key: 0,
  class: "cody-composer-images",
  "aria-label": "已添加附件"
}, no = ["data-kind"], so = ["src", "alt"], lo = ["title"], io = ["disabled", "aria-label", "onClick"], ro = {
  key: 1,
  class: "cody-composer-selected",
  "aria-label": "已引用 Skills"
}, co = ["disabled", "aria-label", "onClick"], uo = ["value", "disabled", "placeholder", "aria-expanded", "aria-controls", "aria-activedescendant"], mo = {
  key: 0,
  class: "cody-composer-skill-status"
}, po = ["id", "aria-selected", "onMouseenter", "onMousedown"], fo = { class: "cody-composer-skill-option-name" }, go = {
  key: 0,
  class: "cody-composer-skill-option-description"
}, vo = { class: "cody-composer-controls" }, yo = {
  class: "cody-composer-settings",
  "aria-label": "运行设置"
}, ko = ["disabled", "aria-label", "title"], bo = { class: "cody-composer-actions" }, ho = ["disabled"], $o = ["disabled", "aria-label", "title"], wo = {
  key: 3,
  class: "cody-composer-policy"
}, Co = {
  key: 4,
  class: "cody-composer-image-error",
  role: "alert"
}, So = {
  key: 5,
  class: "cody-composer-image-status",
  role: "status"
}, Ro = /* @__PURE__ */ Z({
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
    attachments: { default: () => [] },
    fileUploadEnabled: { type: Boolean },
    imageUploadEnabled: { type: Boolean },
    isUploadingImages: { type: Boolean },
    imageError: {},
    variant: { default: "standalone" }
  },
  emits: ["update:draft", "update:collaboration-mode", "update:submit-mode", "update:model", "update:reasoning", "update:permission", "update:selected-skills", "attach-files", "remove-attachment", "attach-images", "remove-image", "send", "stop"],
  setup(e, { emit: s }) {
    const n = Z({
      name: "CodyComposerSelect",
      props: { label: { type: String, required: !0 }, modelValue: { type: String, required: !0 }, options: { type: Array, required: !0 }, disabled: Boolean },
      emits: ["update:modelValue"],
      setup(i, { emit: d }) {
        return () => le("label", { class: "cody-composer-compact-control", title: i.label, "data-control": i.label }, [
          le("select", { value: i.modelValue, disabled: i.disabled, "aria-label": i.label, onChange: (p) => d("update:modelValue", p.target.value) }, i.options.map((p) => le("option", { value: p.value }, p.label)))
        ]);
      }
    }), a = e, t = s, c = P(null), y = P(null), m = P(a.draft), h = P(null), w = P(0), v = P(0), f = Oe(), o = `${f}-skill-menu`, x = B(() => {
      const i = h.value;
      return i ? a.skills.filter((d) => !a.selectedSkills.includes(d.value)).filter((d) => i.query ? `${d.label}
${d.description ?? ""}`.toLowerCase().includes(i.query) : !0).slice(0, 8) : [];
    }), T = B(() => h.value !== null), L = B(() => T.value && x.value.length ? C(Math.min(w.value, x.value.length - 1)) : void 0), W = B(() => {
      var i;
      return ((i = a.permissionOptions.find((d) => d.value === a.selectedPermission)) == null ? void 0 : i.description) ?? "";
    }), K = B(() => [...a.images, ...a.attachments]), Y = B(() => !a.disabled && !a.isUploadingImages && je({ text: a.draft, images: K.value, skills: a.selectedSkills })), J = B(() => a.isRunning ? a.selectedSubmitMode === "steer" ? "发送引导" : a.selectedSubmitMode === "append" ? "追加到当前任务" : "加入队列" : "发送"), se = B(() => (a.imageUploadEnabled || a.fileUploadEnabled) && v.value > 0);
    ne(() => a.draft, (i) => {
      m.value = i;
    });
    function oe(i, d) {
      var p;
      return ((p = i.find((H) => H.value === d)) == null ? void 0 : p.label) ?? d;
    }
    function g(i) {
      t("update:selected-skills", a.selectedSkills.filter((d) => d !== i));
    }
    function C(i) {
      return `${f}-skill-option-${String(i)}`;
    }
    function A(i, d) {
      h.value = We(i, d, "$"), w.value = 0;
    }
    function b(i) {
      const d = i.target;
      m.value = d.value, t("update:draft", d.value), A(d.value, d.selectionStart);
    }
    function k(i) {
      const d = i.target;
      A(d.value, d.selectionStart);
    }
    function q() {
      window.setTimeout(() => {
        h.value = null;
      }, 0);
    }
    function S(i) {
      return Array.from(i).filter((d) => a.fileUploadEnabled || d.type.startsWith("image/"));
    }
    function O(i) {
      if (!(a.imageUploadEnabled || a.fileUploadEnabled) || a.disabled || a.isUploadingImages) return;
      const d = S(i);
      d.length && (a.fileUploadEnabled ? t("attach-files", d) : t("attach-images", d));
    }
    function M() {
      var i;
      (i = y.value) == null || i.click();
    }
    function E(i) {
      const d = i.target;
      d.files && O(d.files), d.value = "";
    }
    function j(i) {
      var p;
      const d = (p = i.clipboardData) == null ? void 0 : p.files;
      !(d != null && d.length) || S(d).length === 0 || (i.preventDefault(), O(d));
    }
    function U(i) {
      var d;
      !(a.imageUploadEnabled || a.fileUploadEnabled) || !Array.from(((d = i.dataTransfer) == null ? void 0 : d.types) ?? []).includes("Files") || (i.preventDefault(), v.value += 1);
    }
    function F(i) {
      var d;
      !(a.imageUploadEnabled || a.fileUploadEnabled) || !Array.from(((d = i.dataTransfer) == null ? void 0 : d.types) ?? []).includes("Files") || (i.preventDefault(), i.dataTransfer && (i.dataTransfer.dropEffect = "copy"));
    }
    function ee(i) {
      !(a.imageUploadEnabled || a.fileUploadEnabled) || v.value === 0 || (i.preventDefault(), v.value = Math.max(0, v.value - 1));
    }
    function Ue(i) {
      var d;
      !(a.imageUploadEnabled || a.fileUploadEnabled) || !((d = i.dataTransfer) != null && d.files.length) || S(i.dataTransfer.files).length !== 0 && (i.preventDefault(), v.value = 0, O(i.dataTransfer.files));
    }
    function me(i) {
      const d = h.value;
      if (!d) return;
      const p = c.value, H = (p == null ? void 0 : p.value) || m.value, G = Ve(H, d);
      a.selectedSkills.includes(i) || t("update:selected-skills", [...a.selectedSkills, i]), t("update:draft", G.text), m.value = G.text, h.value = null, ce(() => {
        const Q = c.value;
        Q == null || Q.focus(), Q == null || Q.setSelectionRange(G.cursor, G.cursor);
      });
    }
    function Te(i) {
      if (T.value) {
        if (i.key === "Escape") {
          i.preventDefault(), h.value = null;
          return;
        }
        if (i.key === "ArrowDown" || i.key === "ArrowUp") {
          i.preventDefault();
          const d = x.value.length;
          d && (w.value = (w.value + (i.key === "ArrowDown" ? 1 : -1) + d) % d);
          return;
        }
        if (i.key === "Enter" && !i.ctrlKey && !i.metaKey && x.value.length) {
          i.preventDefault(), me(x.value[Math.min(w.value, x.value.length - 1)].value);
          return;
        }
      }
      i.key !== "Enter" || i.isComposing || !i.ctrlKey && !i.metaKey || (i.preventDefault(), pe());
    }
    function pe() {
      Y.value && t("send");
    }
    return (i, d) => (l(), r("form", {
      class: "cody-composer",
      "data-variant": e.variant,
      "data-cody-component": "composer-surface",
      onSubmit: de(pe, ["prevent"])
    }, [
      u("div", {
        class: "cody-composer-shell",
        "data-image-drag-active": se.value,
        onDragenter: U,
        onDragover: F,
        onDragleave: ee,
        onDrop: Ue
      }, [
        u("input", {
          ref_key: "imageInputRef",
          ref: y,
          class: "cody-composer-image-input",
          type: "file",
          accept: e.fileUploadEnabled ? void 0 : "image/png,image/jpeg,image/webp,image/gif",
          multiple: "",
          tabindex: "-1",
          "aria-hidden": "true",
          onChange: E
        }, null, 40, oo),
        K.value.length ? (l(), r("ul", ao, [
          (l(!0), r(I, null, z(K.value, (p) => (l(), r("li", {
            key: p.id,
            class: "cody-composer-image",
            "data-kind": R(ve)(p) ? "image" : "file"
          }, [
            R(ve)(p) ? (l(), r("img", {
              key: 0,
              src: p.url,
              alt: p.name || "待发送图片"
            }, null, 8, so)) : (l(), r("span", {
              key: 1,
              class: "cody-composer-file-name",
              title: p.name
            }, $(p.name), 9, lo)),
            u("button", {
              type: "button",
              disabled: e.disabled,
              "aria-label": `移除附件 ${p.name || "附件"}`,
              onClick: (H) => e.fileUploadEnabled ? t("remove-attachment", p.id) : t("remove-image", p.id)
            }, "×", 8, io)
          ], 8, no))), 128))
        ])) : D("", !0),
        e.selectedSkills.length ? (l(), r("div", ro, [
          (l(!0), r(I, null, z(e.selectedSkills, (p) => (l(), r("span", {
            key: p,
            class: "cody-composer-chip"
          }, [
            ae(" $" + $(oe(e.skills, p)) + " ", 1),
            u("button", {
              type: "button",
              disabled: e.disabled,
              "aria-label": `移除 Skill ${oe(e.skills, p)}`,
              onClick: (H) => g(p)
            }, "×", 8, co)
          ]))), 128))
        ])) : D("", !0),
        u("textarea", {
          ref_key: "draftInputRef",
          ref: c,
          value: e.draft,
          rows: "1",
          disabled: e.disabled,
          placeholder: e.placeholder,
          "aria-expanded": T.value,
          "aria-controls": T.value ? o : void 0,
          "aria-activedescendant": L.value,
          "aria-autocomplete": "list",
          onInput: b,
          onClick: k,
          onKeyup: k,
          onBlur: q,
          onPaste: j,
          onKeydown: Te
        }, null, 40, uo),
        T.value ? (l(), r("div", {
          key: 2,
          id: o,
          class: "cody-composer-skill-menu",
          role: "listbox",
          "aria-label": "可引用 Skills"
        }, [
          x.value.length === 0 ? (l(), r("p", mo, "没有匹配的 Skill")) : (l(!0), r(I, { key: 1 }, z(x.value, (p, H) => (l(), r("button", {
            id: C(H),
            key: p.value,
            class: ue(["cody-composer-skill-option", { active: H === w.value }]),
            type: "button",
            role: "option",
            "aria-selected": H === w.value,
            onMouseenter: (G) => w.value = H,
            onMousedown: de((G) => me(p.value), ["prevent"])
          }, [
            u("span", fo, "$" + $(p.label), 1),
            p.description ? (l(), r("span", go, $(p.description), 1)) : D("", !0)
          ], 42, po))), 128))
        ])) : D("", !0),
        u("div", vo, [
          u("div", yo, [
            e.imageUploadEnabled || e.fileUploadEnabled ? (l(), r("button", {
              key: 0,
              class: "cody-composer-image-picker",
              type: "button",
              disabled: e.disabled || e.isUploadingImages,
              "aria-label": e.fileUploadEnabled ? "添加附件" : "添加图片",
              title: e.fileUploadEnabled ? "添加附件（任意格式，也可拖拽）" : "添加图片（也可粘贴或拖拽）",
              onClick: M
            }, [...d[6] || (d[6] = [
              u("svg", {
                viewBox: "0 0 24 24",
                "aria-hidden": "true"
              }, [
                u("path", { d: "M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-13Z" }),
                u("circle", {
                  cx: "8.5",
                  cy: "8.5",
                  r: "1.5"
                }),
                u("path", { d: "m5 18 5.1-5.1a1.5 1.5 0 0 1 2.1 0l2.1 2.1 1.1-1.1a1.5 1.5 0 0 1 2.1 0L20 16.4" })
              ], -1)
            ])], 8, ko)) : D("", !0),
            te(i.$slots, "leading"),
            e.collaborationModes.length ? (l(), fe(R(n), {
              key: 1,
              label: "协作模式",
              "model-value": e.selectedCollaborationMode,
              options: e.collaborationModes,
              disabled: e.disabled || e.isRunning,
              "onUpdate:modelValue": d[0] || (d[0] = (p) => t("update:collaboration-mode", p))
            }, null, 8, ["model-value", "options", "disabled"])) : D("", !0),
            N(R(n), {
              label: "提交策略",
              "model-value": e.selectedSubmitMode,
              options: e.submitModes,
              disabled: e.disabled,
              "onUpdate:modelValue": d[1] || (d[1] = (p) => t("update:submit-mode", p))
            }, null, 8, ["model-value", "options", "disabled"]),
            e.models.length ? (l(), fe(R(n), {
              key: 2,
              label: "模型",
              "model-value": e.selectedModel,
              options: e.models,
              disabled: e.disabled || e.isRunning,
              "onUpdate:modelValue": d[2] || (d[2] = (p) => t("update:model", p))
            }, null, 8, ["model-value", "options", "disabled"])) : D("", !0),
            N(R(n), {
              label: "推理强度",
              "model-value": e.selectedReasoning,
              options: e.reasoningOptions,
              disabled: e.disabled || e.isRunning,
              "onUpdate:modelValue": d[3] || (d[3] = (p) => t("update:reasoning", p))
            }, null, 8, ["model-value", "options", "disabled"]),
            N(R(n), {
              label: "权限",
              "model-value": e.selectedPermission,
              options: e.permissionOptions,
              disabled: e.disabled || e.isRunning,
              "onUpdate:modelValue": d[4] || (d[4] = (p) => t("update:permission", p))
            }, null, 8, ["model-value", "options", "disabled"]),
            te(i.$slots, "controls")
          ]),
          u("div", bo, [
            e.isRunning ? (l(), r("button", {
              key: 0,
              class: "cody-composer-stop",
              type: "button",
              disabled: e.disabled,
              "aria-label": "停止当前回复",
              title: "停止当前回复",
              onClick: d[5] || (d[5] = (p) => t("stop"))
            }, [...d[7] || (d[7] = [
              u("span", {
                class: "cody-composer-stop-icon",
                "aria-hidden": "true"
              }, null, -1)
            ])], 8, ho)) : D("", !0),
            u("button", {
              class: "cody-composer-send",
              type: "submit",
              disabled: !Y.value,
              "aria-label": J.value,
              title: J.value
            }, [...d[8] || (d[8] = [
              u("svg", {
                viewBox: "0 0 24 24",
                "aria-hidden": "true"
              }, [
                u("path", { d: "M12 19V5m0 0-6 6m6-6 6 6" })
              ], -1)
            ])], 8, $o)
          ])
        ]),
        W.value ? (l(), r("p", wo, $(W.value), 1)) : D("", !0),
        e.imageError ? (l(), r("p", Co, $(e.imageError), 1)) : e.imageUploadEnabled && e.isUploadingImages ? (l(), r("p", So, "正在上传附件…")) : D("", !0)
      ], 40, to)
    ], 40, eo));
  }
});
function Bo() {
  const e = Fe(re());
  let s = null, n = null, a = 0;
  const t = () => {
    a += 1, n == null || n(), n = null, s == null || s.dispose(), s = null;
  }, c = async (x, T) => {
    t(), e.value = re(x);
    const L = a, W = et(x, T);
    s = W, n = W.subscribe((K) => {
      s === W && a === L && (e.value = K);
    }), await W.start();
  }, y = async () => {
    await (s == null ? void 0 : s.refresh());
  }, m = async (x, T) => {
    if (!s) throw new Error("Conversation controller is not connected.");
    return s.submitUserMessage(x, T);
  }, h = async (x, T) => {
    if (!s) throw new Error("Conversation controller is not connected.");
    return s.retryFailedUserMessage(x, T);
  }, w = (x) => s == null ? void 0 : s.discardFailedUserMessage(x), v = async () => {
    if (!s) throw new Error("Conversation controller is not connected.");
    await s.interrupt();
  }, f = (x = "") => {
    t(), e.value = re(x);
  }, o = () => {
    t();
  };
  return Pe() && ze(o), {
    state: B(() => e.value),
    connect: c,
    submitUserMessage: m,
    retryFailedUserMessage: h,
    discardFailedUserMessage: w,
    interrupt: v,
    refresh: y,
    reset: f,
    dispose: o
  };
}
export {
  Ro as CodyComposer,
  _o as CodyConversation,
  De as CodyImagePreviewDialog,
  Se as CodyMarkdown,
  At as CodyRequestCard,
  X as DEFAULT_CODY_MARKDOWN_LABELS,
  Io as conversationEntriesFromState,
  Ee as questionFieldsFromParams,
  $e as renderCodyMarkdown,
  rt as requestSummary,
  we as stabilizeStreamingMarkdown,
  Bo as useConversationController
};
