import { defineComponent as X, ref as P, watch as ae, nextTick as ne, onMounted as ue, onBeforeUnmount as me, openBlock as i, createElementBlock as d, withModifiers as ce, createElementVNode as u, createCommentVNode as D, computed as O, Fragment as I, createVNode as N, reactive as Oe, toDisplayString as $, renderList as _, createTextVNode as se, normalizeClass as pe, withDirectives as Le, withKeys as Fe, vModelDynamic as ze, renderSlot as oe, unref as B, h as ie, useId as Pe, createBlock as ve, vShow as _e, shallowRef as je, getCurrentScope as Ve, onScopeDispose as We } from "vue";
import { parseAttachmentText as re, attachmentDownloadUrl as ye, composerHasContent as He, isImageAttachment as ke, removeComposerTrigger as Ke, findComposerTrigger as Ne } from "@codycodeagent/cody-web-core/composer";
import { buildApprovalRiskSummary as Ge, toolStatusTone as be, buildToolOutputPreview as Qe, isToolOutputTruncated as Ze, toolOutputToggleLabel as Xe } from "@codycodeagent/cody-web-core/presentation";
import qe from "dompurify";
import Ye from "markdown-it";
import Je from "markdown-it-footnote";
import et from "markdown-it-task-lists";
import { conversationFeedFromState as tt, formatTurnDuration as ot, createConversationState as de } from "@codycodeagent/cody-web-core/conversation";
import { createConversationController as at } from "@codycodeagent/cody-web-core/client";
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
}, R = new Ye({ breaks: !0, html: !1, linkify: !0, typographer: !1 });
R.use(et, { enabled: !1, label: !0, labelAfter: !0 });
R.use(Je);
function V(e, s) {
  return `<button type="button" class="markdown-tool-button" data-markdown-action="${e}" aria-label="${s}" title="${s}">${s}</button>`;
}
function Me(e, s = "", n = Y) {
  const o = s.toLowerCase();
  if (o === "mermaid" || o === "plantuml" || o === "puml") {
    const T = o === "mermaid" ? "mermaid" : "plantuml";
    return `<div class="markdown-diagram-shell" data-diagram-engine="${T}"><header class="markdown-diagram-toolbar"><span>${T}</span><span class="markdown-diagram-actions">${V("diagram-zoom-out", n.zoomOut)}${V("diagram-fit", n.fit)}${V("diagram-zoom-in", n.zoomIn)}${V("diagram-source", n.source)}${V("diagram-fullscreen", n.fullscreen)}${V("diagram-export-svg", "SVG")}${V("diagram-export-png", "PNG")}</span></header><div class="markdown-diagram-stage" role="img" aria-label="${n.diagramAria(T)}" style="color:#111827;background:#fff"><p class="markdown-diagram-status">${n.rendering(T)}</p></div><pre class="markdown-diagram-source" hidden><code>${R.utils.escapeHtml(e)}</code></pre></div>
`;
  }
  const t = e.replace(/\n$/u, "").split(`
`), c = t.length <= 2 && t.every((T) => T.length <= 96), y = t.length > 10, m = s || "text", h = [c ? "is-compact-code" : "", /^[A-Za-z0-9_-]+$/u.test(s) ? `language-${s}` : ""].filter(Boolean).join(" "), w = h ? ` class="${h}"` : "", v = [c ? "is-compact" : "", y ? "is-collapsible is-collapsed" : ""].filter(Boolean).join(" "), g = y ? `${m} · ${n.lineCount(t.length)}` : m, a = y ? `<button type="button" class="markdown-tool-button markdown-code-collapse" data-markdown-action="toggle-code" aria-label="${n.collapseCode}" title="${n.collapseCode}" aria-expanded="false">${n.collapseCode}</button>` : "", x = y ? `<div class="markdown-code-expand"><button type="button" data-markdown-action="toggle-code" aria-expanded="false">${n.expandCode(t.length)}</button></div>` : "";
  return `<div class="markdown-code-host"><div class="markdown-code-shell${v ? ` ${v}` : ""}" data-language="${m}" data-code-lines="${String(t.length)}"><header class="markdown-code-toolbar"><span>${g}</span><span class="markdown-code-actions">${a}${V("wrap-code", n.wrap)}${V("copy-code", n.copy)}${V("save-code", n.save)}</span></header><pre class="markdown-code-block${c ? " is-compact" : ""}"><code${w}>${R.utils.escapeHtml(e)}</code></pre>${x}</div></div>
`;
}
R.renderer.rules.fence = (e, s, n, o) => {
  const t = e[s];
  return Me(t.content, t.info.trim().split(/\s+/u)[0] ?? "", o.labels);
};
R.renderer.rules.code_block = (e, s, n, o) => Me(e[s].content, "", o.labels);
R.renderer.rules.table_open = (e, s, n, o) => {
  const t = o.labels ?? Y;
  return `<section class="markdown-table-shell" role="region" aria-label="${t.dataTable}" tabindex="0"><header class="markdown-table-toolbar">${V("copy-table", t.copyCsv)}</header><div class="markdown-table-scroll"><table>
`;
};
R.renderer.rules.table_close = () => `</table></div></section>
`;
const he = R.renderer.rules.code_inline;
R.renderer.rules.code_inline = (e, s, n, o, t) => {
  const c = e[s].content, y = c.match(/^(.+?\.[A-Za-z0-9_-]{1,12})(?::(\d+))?$/u);
  if (!y || /\s/u.test(c)) return he ? he(e, s, n, o, t) : t.renderToken(e, s, n);
  const m = R.utils.escapeHtml(y[1]), h = y[2] ?? "", w = o.labels ?? Y;
  return `<button type="button" class="markdown-file-link" data-markdown-action="open-file" data-file-path="${m}" data-file-line="${h}" title="${w.openFile(m)}"><code>${R.utils.escapeHtml(c)}</code></button>`;
};
function De(e) {
  if (!e || /^(?:[A-Za-z][A-Za-z\d+.-]*:|\/\/|#)/u.test(e)) return;
  const s = e.match(/^(.*?)(?:#L?(\d+))?$/u), n = (s == null ? void 0 : s[1]) ?? e, o = (s == null ? void 0 : s[2]) ?? "";
  if (/[?#]/u.test(n)) return;
  const t = n.startsWith("/") || n.startsWith("./") || n.startsWith("../"), c = /(?:^|\/)[^/?#]+\.[A-Za-z\d_-]{1,12}$/u.test(n);
  if (!(!t && !c))
    return { path: n, line: o };
}
function nt(e, s) {
  let n = 0;
  for (let o = s - 1; o >= 0; o -= 1)
    if (e[o].type === "link_close" && (n += 1), e[o].type === "link_open") {
      if (n === 0) return e[o];
      n -= 1;
    }
}
const $e = R.renderer.rules.link_open;
R.renderer.rules.link_open = (e, s, n, o, t) => {
  const c = e[s], y = c.attrGet("href") ?? "", m = De(y);
  if (m) {
    const h = o.labels ?? Y, w = R.utils.escapeHtml(m.path);
    return `<button type="button" class="markdown-file-link" data-markdown-action="open-file" data-file-path="${w}" data-file-line="${m.line}" title="${h.openFile(w)}">`;
  }
  return /^https?:\/\//u.test(y) && (c.attrSet("target", "_blank"), c.attrSet("rel", "noopener noreferrer")), $e ? $e(e, s, n, o, t) : t.renderToken(e, s, n);
};
const we = R.renderer.rules.link_close;
R.renderer.rules.link_close = (e, s, n, o, t) => {
  var y;
  const c = ((y = nt(e, s)) == null ? void 0 : y.attrGet("href")) ?? "";
  return De(c) ? "</button>" : we ? we(e, s, n, o, t) : t.renderToken(e, s, n);
};
function Ce(e, s = Y) {
  return qe.sanitize(R.render(e, { labels: s }), {
    ADD_ATTR: ["target"],
    ADD_TAGS: ["table", "thead", "tbody", "tr", "th", "td", "h1", "h2", "h3", "h4", "h5", "h6"],
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed"]
  });
}
function Se(e) {
  var s;
  return (((s = e.match(/^\s*```/gmu)) == null ? void 0 : s.length) ?? 0) % 2 === 1 ? `${e}

\`\`\`` : e;
}
let st = 0, xe = Promise.resolve();
const lt = async () => import("mermaid");
async function it(e, s, n = lt) {
  const o = `cody-diagram-${String(++st)}`, t = xe.then(async () => {
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
      }), (await h.render(o, e, s)).svg;
    } finally {
      (c = document.getElementById(o)) == null || c.remove(), (y = document.getElementById(`d${o}`)) == null || y.remove(), (m = document.getElementById(`i${o}`)) == null || m.remove();
    }
  });
  return xe = t.then(() => {
  }, () => {
  }), t;
}
const rt = ["aria-label"], dt = ["src", "alt"], Ee = /* @__PURE__ */ X({
  __name: "CodyImagePreviewDialog",
  props: {
    src: {},
    alt: { default: "图片预览" }
  },
  emits: ["dismiss"],
  setup(e, { emit: s }) {
    const n = e, o = s, t = P(null);
    ae(() => n.src, async (m) => {
      var h;
      m && (await ne(), (h = t.value) == null || h.focus());
    }, { flush: "post" });
    function c() {
      o("dismiss");
    }
    function y(m) {
      m.key === "Escape" && n.src && (m.preventDefault(), c());
    }
    return ue(() => window.addEventListener("keydown", y)), me(() => window.removeEventListener("keydown", y)), (m, h) => e.src ? (i(), d("div", {
      key: 0,
      ref_key: "dialogRef",
      ref: t,
      class: "cody-image-preview-dialog",
      role: "dialog",
      "aria-modal": "true",
      "aria-label": e.alt,
      tabindex: "-1",
      onClick: ce(c, ["self"])
    }, [
      u("button", {
        type: "button",
        "aria-label": "关闭图片预览",
        onClick: c
      }, "×"),
      u("img", {
        src: e.src,
        alt: e.alt
      }, null, 8, dt)
    ], 8, rt)) : D("", !0);
  }
}), ct = ["innerHTML"], Ae = /* @__PURE__ */ X({
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
    const n = e, o = s, t = O(() => n.labels ?? Y), c = P(null), y = P(Ce(Se(n.text), t.value)), m = P(""), h = /* @__PURE__ */ new Set();
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
    async function g(f) {
      window.clearTimeout(w), w = window.setTimeout(async () => {
        y.value = Ce(Se(f), t.value), await ne(), a();
      }, n.renderDelay);
    }
    async function a() {
      var L, b, k, q, S, H;
      for (const M of Array.from(((L = c.value) == null ? void 0 : L.querySelectorAll("td")) ?? []))
        /^-?[\d,.]+%?$/u.test(((b = M.textContent) == null ? void 0 : b.trim()) ?? "") && (M.dataset.numeric = "true");
      for (const M of Array.from(((k = c.value) == null ? void 0 : k.querySelectorAll("img")) ?? []))
        M.addEventListener("error", () => {
          M.alt = M.alt || "图片加载失败", M.classList.add("is-load-error");
        }, { once: !0 });
      x();
      for (const [M, E] of Array.from(((q = c.value) == null ? void 0 : q.querySelectorAll(".markdown-code-shell")) ?? []).entries()) {
        E.dataset.codeIndex = String(M), E.classList.contains("is-collapsible") && h.has(M) && E.classList.remove("is-collapsed");
        for (const z of Array.from(E.querySelectorAll('[data-markdown-action="toggle-code"]')))
          z.setAttribute("aria-expanded", String(!E.classList.contains("is-collapsed")));
        const j = E.querySelector("pre"), U = E.querySelector('[data-markdown-action="wrap-code"]');
        j && U && (U.hidden = j.scrollWidth <= j.clientWidth + 2, U.setAttribute("aria-pressed", String(E.classList.contains("is-wrapped"))));
      }
      await T();
      const f = Array.from(((S = c.value) == null ? void 0 : S.querySelectorAll('pre code[class*="language-"]')) ?? []);
      if (f.length === 0) return;
      const C = (await import("highlight.js/lib/core")).default;
      for (const M of f) {
        const E = ((H = Array.from(M.classList).find((z) => z.startsWith("language-"))) == null ? void 0 : H.slice(9)) ?? "", j = v[E];
        if (!j || M.dataset.highlighted === "yes") continue;
        const U = await j();
        C.getLanguage(E) || C.registerLanguage(E, U.default), M.innerHTML = C.highlight(M.textContent ?? "", { language: E }).value, M.dataset.highlighted = "yes";
      }
    }
    function x() {
      var C;
      if (!n.resolveAssetUrl) return;
      const f = /\.(?:svg|png|jpe?g|gif|webp)(?:[?#].*)?$/iu;
      for (const L of Array.from(((C = c.value) == null ? void 0 : C.querySelectorAll("a[href]")) ?? [])) {
        const b = L.getAttribute("href") ?? "";
        if (!f.test(b) || /^(?:data|blob):/iu.test(b)) continue;
        const k = n.resolveAssetUrl(b);
        k && (L.href = k, L.target = "_blank", L.rel = "noopener noreferrer");
      }
    }
    async function T() {
      var C, L, b, k;
      const f = Array.from(((C = c.value) == null ? void 0 : C.querySelectorAll(".markdown-diagram-shell:not([data-rendered])")) ?? []);
      for (const q of f) {
        q.dataset.rendered = "loading";
        const S = q.dataset.diagramEngine === "plantuml" ? "plantuml" : "mermaid", H = ((L = q.querySelector("code")) == null ? void 0 : L.textContent) ?? "", M = q.querySelector(".markdown-diagram-stage");
        if (M) {
          M.style.setProperty("color", "#111827"), M.style.setProperty("background", "#ffffff");
          try {
            let E = await ((b = n.renderDiagram) == null ? void 0 : b.call(n, { engine: S, source: H, dark: n.dark }));
            if (!E && S === "mermaid" && (E = await it(H, M)), !E) throw new Error(S === "plantuml" ? "当前环境未配置 PlantUML 渲染器" : "图表渲染失败");
            M.innerHTML = A(E), W(M), q.dataset.rendered = "yes", q.style.setProperty("--diagram-scale", "1");
          } catch (E) {
            M.textContent = E instanceof Error ? E.message : "图表渲染失败", M.classList.add("markdown-diagram-error"), (k = q.querySelector(".markdown-diagram-source")) == null || k.removeAttribute("hidden"), q.dataset.rendered = "error";
          }
        }
      }
    }
    function A(f) {
      const C = qe.sanitize(f, { USE_PROFILES: { svg: !0, svgFilters: !0, html: !0 }, ADD_TAGS: ["foreignObject"], ADD_ATTR: ["xmlns"] }), L = C.trimStart().startsWith("<svg") ? C : `<svg xmlns="http://www.w3.org/2000/svg">${C}</svg>`, b = new DOMParser().parseFromString(L, "image/svg+xml");
      if (b.querySelector("parsererror")) return "";
      for (const k of b.querySelectorAll("*")) for (const q of Array.from(k.attributes)) /^on/iu.test(q.name) && k.removeAttribute(q.name);
      return b.querySelectorAll("script").forEach((k) => k.remove()), new XMLSerializer().serializeToString(b.documentElement);
    }
    function W(f) {
      if (f.dataset.panReady === "true") return;
      f.dataset.panReady = "true";
      let C = 0, L = 0, b = 0, k = 0;
      f.addEventListener("pointerdown", (S) => {
        S.button === 0 && (C = S.clientX, L = S.clientY, b = f.scrollLeft, k = f.scrollTop, f.setPointerCapture(S.pointerId), f.classList.add("is-panning"));
      }), f.addEventListener("pointermove", (S) => {
        f.hasPointerCapture(S.pointerId) && (f.scrollLeft = b - (S.clientX - C), f.scrollTop = k - (S.clientY - L));
      });
      const q = (S) => {
        f.hasPointerCapture(S.pointerId) && f.releasePointerCapture(S.pointerId), f.classList.remove("is-panning");
      };
      f.addEventListener("pointerup", q), f.addEventListener("pointercancel", q);
    }
    function K(f, C = 0) {
      const L = Number(f.style.getPropertyValue("--diagram-scale") || "1");
      f.style.setProperty("--diagram-scale", String(C === 0 ? 1 : Math.min(2.5, Math.max(0.4, L + C))));
    }
    function J(f, C) {
      const L = document.createElement("a");
      L.href = URL.createObjectURL(f), L.download = C, L.click(), URL.revokeObjectURL(L.href);
    }
    async function ee(f, C) {
      const L = C.textContent;
      try {
        await navigator.clipboard.writeText(f), C.textContent = "已复制";
      } catch {
        const b = document.createElement("textarea");
        b.value = f, b.style.position = "fixed", b.style.opacity = "0", document.body.appendChild(b), b.select();
        const k = document.execCommand("copy");
        b.remove(), C.textContent = k ? "已复制" : "复制失败";
      }
      window.setTimeout(() => {
        C.textContent = L;
      }, 1200);
    }
    function le(f) {
      return Array.from((f == null ? void 0 : f.rows) ?? []).map((C) => Array.from(C.cells).map((L) => {
        var b;
        return `"${((b = L.textContent) == null ? void 0 : b.trim().replace(/"/gu, '""')) ?? ""}"`;
      }).join(",")).join(`
`);
    }
    function G(f) {
      var H, M, E, j;
      const C = f.target, L = C.closest("img");
      if (L) {
        m.value = L.currentSrc || L.src;
        return;
      }
      const b = C.closest("[data-markdown-action]");
      if (!b) return;
      const k = b.closest(".markdown-code-shell, .markdown-table-shell"), q = b.dataset.markdownAction;
      if (q === "copy-code" && ee(((H = k == null ? void 0 : k.querySelector("code")) == null ? void 0 : H.textContent) ?? "", b), q === "wrap-code") {
        const U = (k == null ? void 0 : k.classList.toggle("is-wrapped")) ?? !1;
        b.textContent = U && t.value.scroll || t.value.wrap, b.setAttribute("aria-pressed", String(U));
      }
      if (q === "save-code" && J(new Blob([((M = k == null ? void 0 : k.querySelector("code")) == null ? void 0 : M.textContent) ?? ""], { type: "text/plain" }), `snippet.${(k == null ? void 0 : k.dataset.language) || "txt"}`), q === "toggle-code" && (k != null && k.classList.contains("is-collapsible"))) {
        const U = Number(k.dataset.codeIndex ?? -1), z = !k.classList.toggle("is-collapsed");
        U >= 0 && (z ? h.add(U) : h.delete(U));
        for (const te of Array.from(k.querySelectorAll('[data-markdown-action="toggle-code"]'))) te.setAttribute("aria-expanded", String(z));
      }
      if (q === "copy-table" && ee(le((k == null ? void 0 : k.querySelector("table")) ?? null), b), q === "open-file") {
        const U = b.dataset.filePath ?? "", z = ((E = n.cwd) == null ? void 0 : E.replace(/\/$/u, "")) ?? "", te = U.startsWith("/") && z && U.startsWith(`${z}/`) ? U.slice(z.length + 1) : U.replace(/^\.\//u, "");
        o("openFile", { path: te, line: Number(b.dataset.fileLine || 0) || 1 });
      }
      const S = b.closest(".markdown-diagram-shell");
      if (S && q === "diagram-zoom-in" && K(S, 0.2), S && q === "diagram-zoom-out" && K(S, -0.2), S && q === "diagram-fit" && K(S), S && q === "diagram-source") {
        const U = S.querySelector(".markdown-diagram-source");
        U && (U.hidden = !U.hidden);
      }
      if (S && q === "diagram-fullscreen" && ((j = S.requestFullscreen) == null || j.call(S)), S && q === "diagram-export-svg") {
        const U = S.querySelector("svg");
        U && J(new Blob([new XMLSerializer().serializeToString(U)], { type: "image/svg+xml" }), "diagram.svg");
      }
    }
    return ae(() => [n.text, n.labels], ([f]) => {
      g(f);
    }, { deep: !0 }), ue(() => {
      a();
    }), me(() => window.clearTimeout(w)), (f, C) => (i(), d(I, null, [
      u("div", {
        ref_key: "rootRef",
        ref: c,
        class: "cody-markdown cody-markdown-renderer",
        innerHTML: y.value,
        onClick: G
      }, null, 8, ct),
      N(Ee, {
        src: m.value,
        alt: "Markdown 图片预览",
        onDismiss: C[0] || (C[0] = (L) => m.value = "")
      }, null, 8, ["src"])
    ], 64));
  }
});
function Ue(e) {
  if (!e || typeof e != "object") return [];
  const s = e;
  return (Array.isArray(s.questions) ? s.questions : []).flatMap((o, t) => {
    if (!o || typeof o != "object") return [];
    const c = o, y = typeof c.question == "string" ? c.question.trim() : "";
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
function ut(e) {
  var o;
  if (!e || typeof e != "object") return "Codex 请求执行一项受保护操作。";
  const s = e, n = s.reason ?? s.question ?? s.command;
  return typeof n == "string" && n.trim() ? n : ((o = Ue(e)[0]) == null ? void 0 : o.question) ?? "Codex 请求执行一项受保护操作。";
}
function Po(e) {
  var o;
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
  for (const t of tt(e))
    if (t.kind === "message") s.push({ id: t.id, kind: "message", message: t.message });
    else if (t.kind === "timeline") n(t.entry);
    else if (t.kind === "plan") s.push({ id: t.id, kind: "plan", text: t.plan.text });
    else if (t.kind === "request") s.push({ id: t.id, kind: "request", request: t.request });
    else if (t.kind === "turn" && t.status === "failed") s.push({ id: t.id, kind: "failure", text: t.error });
    else {
      if (t.kind === "turn" && t.status === "interrupted") continue;
      t.kind === "turn" && t.status === "completed" ? s.push({ id: t.id, kind: "worked", label: `Worked for ${ot(t.durationMs ?? 0)}` }) : t.kind === "activity" && s.push({
        id: t.id,
        kind: "activity",
        title: t.status === "waiting" ? ((o = e.pendingRequests.find((c) => !c.turnId || c.turnId === t.turnId)) == null ? void 0 : o.kind) === "approval" ? "等待你的审批" : "等待你的回答" : t.label,
        detail: t.status === "waiting" ? "处理后 Codex 会继续本次回复" : t.status === "retrying" ? e.connection.status === "disconnected" ? "连接已中断，等待恢复" : "正在恢复本次回复" : e.connection.status === "connected" ? "实时更新中" : "等待恢复连接",
        tone: t.status
      });
    }
  return s;
}
const mt = ["data-kind"], pt = { class: "cody-request-heading" }, ft = { key: 0 }, gt = {
  key: 0,
  class: "cody-question-options"
}, vt = ["onClick"], yt = { key: 0 }, kt = ["onUpdate:modelValue", "type", "placeholder"], bt = { class: "cody-request-actions" }, ht = ["disabled"], $t = { class: "cody-approval-risk-heading" }, wt = ["data-level"], Ct = { class: "cody-approval-risk-subject" }, St = {
  key: 0,
  class: "cody-approval-risk-labels"
}, xt = {
  key: 1,
  class: "cody-approval-risk-details"
}, At = { class: "cody-approval-risk-recommendation" }, Lt = { key: 1 }, qt = {
  key: 2,
  class: "cody-request-actions"
}, Mt = /* @__PURE__ */ X({
  __name: "CodyRequestCard",
  props: {
    request: {}
  },
  emits: ["resolveApproval", "resolveQuestion"],
  setup(e, { emit: s }) {
    const n = e, o = s, t = Oe({}), c = O(() => Ue(n.request.params)), y = O(() => ut(n.request.params)), m = O(() => n.request.kind === "approval" ? Ge({ method: n.request.method, params: n.request.params }) : null), h = O(() => c.value.length > 0 && c.value.every((v) => {
      var g;
      return !!((g = t[v.id]) != null && g.trim());
    }));
    ae(() => n.request.id, () => {
      for (const v of Object.keys(t)) delete t[v];
    });
    function w() {
      h.value && o("resolveQuestion", n.request.id, Object.fromEntries(c.value.map((v) => [v.id, { answers: [t[v.id].trim()] }])));
    }
    return (v, g) => (i(), d("article", {
      class: "cody-request-card",
      "data-kind": e.request.kind
    }, [
      u("div", pt, [
        u("strong", null, $(e.request.kind === "approval" ? "需要你的确认" : "Codex 需要补充信息"), 1),
        g[2] || (g[2] = u("small", null, "Agent 已暂停等待", -1))
      ]),
      e.request.kind === "question" && c.value.length ? (i(), d(I, { key: 0 }, [
        (i(!0), d(I, null, _(c.value, (a) => (i(), d("fieldset", {
          key: a.id,
          class: "cody-question-field"
        }, [
          u("legend", null, [
            a.header ? (i(), d("span", ft, $(a.header), 1)) : D("", !0),
            se($(a.question), 1)
          ]),
          a.options.length ? (i(), d("div", gt, [
            (i(!0), d(I, null, _(a.options, (x) => (i(), d("button", {
              key: x.label,
              type: "button",
              class: pe({ selected: t[a.id] === x.label }),
              onClick: (T) => t[a.id] = x.label
            }, [
              u("strong", null, $(x.label), 1),
              x.description ? (i(), d("small", yt, $(x.description), 1)) : D("", !0)
            ], 10, vt))), 128))
          ])) : D("", !0),
          a.options.length === 0 || a.isOther ? Le((i(), d("input", {
            key: 1,
            "onUpdate:modelValue": (x) => t[a.id] = x,
            type: a.isSecret ? "password" : "text",
            placeholder: a.options.length ? "其他回答…" : "输入回答…",
            onKeyup: Fe(w, ["enter"])
          }, null, 40, kt)), [
            [ze, t[a.id]]
          ]) : D("", !0)
        ]))), 128)),
        u("div", bt, [
          u("button", {
            type: "button",
            disabled: !h.value,
            onClick: w
          }, "提交回答", 8, ht)
        ])
      ], 64)) : (i(), d(I, { key: 1 }, [
        m.value ? (i(), d(I, { key: 0 }, [
          u("div", $t, [
            u("div", null, [
              u("strong", null, $(m.value.title), 1),
              u("p", null, $(m.value.description), 1)
            ]),
            u("span", {
              class: "cody-approval-risk-level",
              "data-level": m.value.level
            }, $(m.value.level), 9, wt)
          ]),
          u("code", Ct, $(m.value.subject), 1),
          m.value.riskLabels.length ? (i(), d("ul", St, [
            (i(!0), d(I, null, _(m.value.riskLabels, (a) => (i(), d("li", { key: a }, $(a), 1))), 128))
          ])) : D("", !0),
          m.value.impacts.length ? (i(), d("details", xt, [
            g[3] || (g[3] = u("summary", null, "查看影响", -1)),
            u("ul", null, [
              (i(!0), d(I, null, _(m.value.impacts, (a) => (i(), d("li", { key: a }, $(a), 1))), 128))
            ])
          ])) : D("", !0),
          u("p", At, $(m.value.recommendation), 1)
        ], 64)) : (i(), d("p", Lt, $(y.value), 1)),
        e.request.kind === "approval" ? (i(), d("div", qt, [
          u("button", {
            type: "button",
            onClick: g[0] || (g[0] = (a) => o("resolveApproval", e.request.id, "accept"))
          }, "允许一次"),
          u("button", {
            type: "button",
            "data-tone": "danger",
            onClick: g[1] || (g[1] = (a) => o("resolveApproval", e.request.id, "decline"))
          }, "拒绝")
        ])) : D("", !0)
      ], 64))
    ], 8, mt));
  }
}), Dt = ["data-variant"], Et = {
  key: 0,
  class: "cody-conversation-loading",
  role: "status"
}, Ut = {
  key: 1,
  class: "cody-conversation-empty"
}, Tt = {
  key: 0,
  class: "cody-worked-divider"
}, It = ["data-role"], Rt = ["data-role"], Bt = { class: "cody-message-stack" }, Ot = { class: "cody-message-label" }, Ft = {
  key: 0,
  class: "cody-message-skills"
}, zt = {
  key: 1,
  class: "cody-message-body"
}, Pt = {
  key: 2,
  class: "cody-message-files",
  "aria-label": "消息附件"
}, _t = ["href", "download"], jt = { key: 0 }, Vt = { key: 1 }, Wt = {
  key: 3,
  class: "cody-message-images"
}, Ht = ["onClick"], Kt = ["src"], Nt = ["onClick"], Gt = ["onClick"], Qt = ["data-tone", "open"], Zt = { key: 0 }, Xt = ["onClick"], Yt = {
  key: 3,
  class: "cody-reasoning-card"
}, Jt = {
  key: 4,
  class: "cody-plan-card",
  open: ""
}, eo = {
  key: 6,
  class: "cody-failure-card"
}, to = {
  key: 7,
  class: "cody-interrupted-card",
  role: "status"
}, oo = ["data-tone"], _o = /* @__PURE__ */ X({
  __name: "CodyConversation",
  props: {
    entries: {},
    loading: { type: Boolean },
    variant: { default: "standalone" }
  },
  emits: ["copy", "openFile", "retryMessage", "resolveApproval", "resolveQuestion"],
  setup(e, { emit: s }) {
    const n = s;
    function o(v) {
      return v.role === "user" ? re(v.text).text : v.text;
    }
    const t = P({}), c = P("");
    function y(v, g) {
      return v === "failed" ? `发送失败${g ? `：${g}` : ""}` : v === "queued" ? `已加入发送队列${g ? `：${g}` : ""}` : v === "delivered" ? "已发送给当前任务" : "正在发送…";
    }
    function m(v) {
      t.value = {
        ...t.value,
        [v]: t.value[v] !== !0
      };
    }
    function h(v, g) {
      n("resolveApproval", v, g);
    }
    function w(v, g) {
      n("resolveQuestion", v, g);
    }
    return (v, g) => (i(), d("section", {
      class: "cody-conversation",
      "data-variant": e.variant,
      "data-cody-component": "conversation-surface"
    }, [
      e.loading ? (i(), d("div", Et, "正在同步对话…")) : e.entries.length === 0 ? (i(), d("div", Ut, [
        oe(v.$slots, "empty", {}, () => [
          g[3] || (g[3] = se("开始这个需求的开发", -1))
        ])
      ])) : (i(!0), d(I, { key: 2 }, _(e.entries, (a) => {
        var x, T;
        return i(), d(I, {
          key: a.id
        }, [
          a.kind === "worked" ? (i(), d("div", Tt, [
            u("span", null, $(a.label), 1)
          ])) : a.kind === "message" ? (i(), d("article", {
            key: 1,
            class: "cody-message",
            "data-role": a.message.role
          }, [
            u("div", {
              class: "cody-message-identity",
              "data-role": a.message.role
            }, $(a.message.role === "user" ? "你" : "CW"), 9, Rt),
            u("div", Bt, [
              u("div", Ot, $(a.message.role === "user" ? "你" : a.message.role === "assistant" ? "Codex Agent" : "系统"), 1),
              (x = a.message.skills) != null && x.length ? (i(), d("ul", Ft, [
                (i(!0), d(I, null, _(a.message.skills, (A) => (i(), d("li", {
                  key: `${A.name}:${A.path}`
                }, "$" + $(A.displayName || A.name), 1))), 128))
              ])) : D("", !0),
              a.message.text ? (i(), d("div", zt, [
                oe(v.$slots, "markdown", {
                  message: { ...a.message, text: o(a.message) }
                }, () => [
                  N(Ae, {
                    text: o(a.message),
                    onOpenFile: g[0] || (g[0] = (A) => n("openFile", A))
                  }, null, 8, ["text"])
                ])
              ])) : D("", !0),
              a.message.role === "user" && B(re)(a.message.text).attachments.length ? (i(), d("ul", Pt, [
                (i(!0), d(I, null, _(B(re)(a.message.text).attachments, (A) => (i(), d("li", {
                  key: A.id
                }, [
                  B(ye)(A.url) ? (i(), d("a", {
                    key: 0,
                    href: B(ye)(A.url),
                    download: A.name
                  }, [
                    se($(A.name), 1),
                    A.size !== void 0 ? (i(), d("small", jt, " · " + $(Math.ceil(A.size / 1024)) + " KB", 1)) : D("", !0)
                  ], 8, _t)) : (i(), d("span", Vt, $(A.name), 1))
                ]))), 128))
              ])) : D("", !0),
              (T = a.message.images) != null && T.length ? (i(), d("div", Wt, [
                (i(!0), d(I, null, _(a.message.images, (A) => (i(), d("button", {
                  key: A,
                  type: "button",
                  "aria-label": "打开对话图片预览",
                  onClick: (W) => c.value = A
                }, [
                  u("img", {
                    src: A,
                    alt: "对话图片",
                    loading: "lazy"
                  }, null, 8, Kt)
                ], 8, Ht))), 128))
              ])) : D("", !0),
              a.message.outbox ? (i(), d("div", {
                key: 4,
                class: pe(["cody-message-outbox", a.message.outbox.status]),
                role: "status"
              }, [
                u("span", null, $(y(a.message.outbox.status, a.message.outbox.lastError)), 1),
                a.message.outbox.status === "failed" ? (i(), d("button", {
                  key: 0,
                  class: "cody-message-retry",
                  type: "button",
                  onClick: (A) => n("retryMessage", a.message)
                }, "重试此消息", 8, Nt)) : D("", !0)
              ], 2)) : D("", !0),
              a.message.text ? (i(), d("button", {
                key: 5,
                class: "cody-copy-button",
                type: "button",
                onClick: (A) => n("copy", a.message.text)
              }, "复制", 8, Gt)) : D("", !0)
            ])
          ], 8, It)) : a.kind === "tool" ? (i(), d("details", {
            key: 2,
            class: "cody-tool-card",
            "data-tone": B(be)(a.tool.status),
            open: B(be)(a.tool.status) === "working"
          }, [
            u("summary", null, [
              g[4] || (g[4] = u("span", null, "⌁", -1)),
              u("strong", null, $(a.tool.title), 1),
              u("small", null, $(a.tool.status), 1)
            ]),
            u("p", null, $(a.tool.summary), 1),
            a.tool.details.length ? (i(), d("ul", Zt, [
              (i(!0), d(I, null, _(a.tool.details, (A) => (i(), d("li", { key: A }, $(A), 1))), 128))
            ])) : D("", !0),
            a.tool.output ? (i(), d(I, { key: 1 }, [
              u("pre", null, $(t.value[a.id] ? a.tool.output : B(Qe)(a.tool.output)), 1),
              B(Ze)(a.tool.output) ? (i(), d("button", {
                key: 0,
                class: "cody-tool-output-toggle",
                type: "button",
                onClick: (A) => m(a.id)
              }, $(B(Xe)(t.value[a.id] === !0)), 9, Xt)) : D("", !0)
            ], 64)) : D("", !0)
          ], 8, Qt)) : a.kind === "reasoning" ? (i(), d("details", Yt, [
            u("summary", null, "✦ " + $(a.title || "推理过程"), 1),
            u("pre", null, $(a.text), 1)
          ])) : a.kind === "plan" ? (i(), d("details", Jt, [
            g[5] || (g[5] = u("summary", null, "计划", -1)),
            N(Ae, {
              text: a.text,
              onOpenFile: g[1] || (g[1] = (A) => n("openFile", A))
            }, null, 8, ["text"])
          ])) : a.kind === "request" ? oe(v.$slots, "request", {
            request: a.request
          }, () => [
            N(Mt, {
              request: a.request,
              onResolveApproval: h,
              onResolveQuestion: w
            }, null, 8, ["request"])
          ], void 0, 5) : a.kind === "failure" ? (i(), d("details", eo, [
            g[6] || (g[6] = u("summary", null, "本次回复失败", -1)),
            u("p", null, $(a.text), 1)
          ])) : a.kind === "interrupted" ? (i(), d("article", to, $(a.text), 1)) : a.kind === "activity" ? (i(), d("article", {
            key: 8,
            class: "cody-conversation-activity",
            "data-tone": a.tone,
            role: "status",
            "aria-live": "polite"
          }, [
            g[7] || (g[7] = u("span", {
              class: "cody-activity-pulse",
              "aria-hidden": "true"
            }, null, -1)),
            u("strong", null, $(a.title), 1),
            u("small", null, $(a.detail), 1)
          ], 8, oo)) : D("", !0)
        ], 64);
      }), 128)),
      N(Ee, {
        src: c.value,
        alt: "对话图片预览",
        onDismiss: g[2] || (g[2] = (a) => c.value = "")
      }, null, 8, ["src"])
    ], 8, Dt));
  }
}), ao = ["data-variant", "data-compact"], no = ["data-image-drag-active"], so = ["accept"], lo = {
  key: 0,
  class: "cody-composer-images",
  "aria-label": "已添加附件"
}, io = ["data-kind"], ro = ["src", "alt"], co = ["title"], uo = ["disabled", "aria-label", "onClick"], mo = {
  key: 1,
  class: "cody-composer-selected",
  "aria-label": "已引用 Skills"
}, po = ["disabled", "aria-label", "onClick"], fo = ["value", "disabled", "placeholder", "aria-expanded", "aria-controls", "aria-activedescendant"], go = {
  key: 0,
  class: "cody-composer-skill-status"
}, vo = ["id", "aria-selected", "onMouseenter", "onMousedown"], yo = { class: "cody-composer-skill-option-name" }, ko = {
  key: 0,
  class: "cody-composer-skill-option-description"
}, bo = { class: "cody-composer-controls" }, ho = {
  class: "cody-composer-settings",
  "aria-label": "运行设置"
}, $o = ["disabled", "aria-label", "title"], wo = { class: "cody-composer-actions" }, Co = ["disabled"], So = ["disabled", "aria-label", "title"], xo = ["aria-expanded", "aria-label", "title"], Ao = {
  viewBox: "0 0 24 24",
  "aria-hidden": "true"
}, Lo = ["d"], qo = {
  key: 3,
  class: "cody-composer-policy"
}, Mo = {
  key: 4,
  class: "cody-composer-image-error",
  role: "alert"
}, Do = {
  key: 5,
  class: "cody-composer-image-status",
  role: "status"
}, jo = /* @__PURE__ */ X({
  __name: "CodyComposer",
  props: {
    draft: {},
    compact: { type: Boolean },
    collapsible: { type: Boolean },
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
  emits: ["update:compact", "update:draft", "update:collaboration-mode", "update:submit-mode", "update:model", "update:reasoning", "update:permission", "update:selected-skills", "attach-files", "remove-attachment", "attach-images", "remove-image", "send", "stop"],
  setup(e, { emit: s }) {
    const n = X({
      name: "CodyComposerSelect",
      props: { label: { type: String, required: !0 }, modelValue: { type: String, required: !0 }, options: { type: Array, required: !0 }, disabled: Boolean },
      emits: ["update:modelValue"],
      setup(l, { emit: r }) {
        return () => ie("label", { class: "cody-composer-compact-control", title: l.label, "data-control": l.label }, [
          ie("select", { value: l.modelValue, disabled: l.disabled, "aria-label": l.label, onChange: (p) => r("update:modelValue", p.target.value) }, l.options.map((p) => ie("option", { value: p.value }, p.label)))
        ]);
      }
    }), o = e, t = s, c = P(null), y = P(null), m = P(o.draft), h = P(null), w = P(0), v = P(0), g = Pe(), a = `${g}-skill-menu`, x = O(() => {
      const l = h.value;
      return l ? o.skills.filter((r) => !o.selectedSkills.includes(r.value)).filter((r) => l.query ? `${r.label}
${r.description ?? ""}`.toLowerCase().includes(l.query) : !0).slice(0, 8) : [];
    }), T = O(() => h.value !== null), A = O(() => T.value && x.value.length ? b(Math.min(w.value, x.value.length - 1)) : void 0), W = O(() => {
      var l;
      return ((l = o.permissionOptions.find((r) => r.value === o.selectedPermission)) == null ? void 0 : l.description) ?? "";
    }), K = O(() => [...o.images, ...o.attachments]), J = O(() => !o.disabled && !o.isUploadingImages && He({ text: o.draft, images: K.value, skills: o.selectedSkills })), ee = O(() => o.isRunning ? o.selectedSubmitMode === "steer" ? "发送引导" : o.selectedSubmitMode === "append" ? "追加到当前任务" : "加入队列" : "发送"), le = O(() => (o.imageUploadEnabled || o.fileUploadEnabled) && v.value > 0);
    ae(() => o.draft, (l) => {
      m.value = l;
    });
    function G() {
      const l = c.value;
      l && (l.style.height = "", o.compact && (l.style.height = "0px", l.style.height = `${Math.min(160, Math.max(40, l.scrollHeight))}px`));
    }
    let f;
    ae(() => [o.draft, o.compact], () => {
      ne(G);
    }, { flush: "post" }), ue(() => {
      G();
      let l = 0;
      typeof ResizeObserver < "u" && c.value && (f = new ResizeObserver((r) => {
        var F;
        const p = ((F = r[0]) == null ? void 0 : F.contentRect.width) ?? 0;
        p !== l && (l = p, G());
      }), f.observe(c.value));
    }), me(() => f == null ? void 0 : f.disconnect());
    function C(l, r) {
      var p;
      return ((p = l.find((F) => F.value === r)) == null ? void 0 : p.label) ?? r;
    }
    function L(l) {
      t("update:selected-skills", o.selectedSkills.filter((r) => r !== l));
    }
    function b(l) {
      return `${g}-skill-option-${String(l)}`;
    }
    function k(l, r) {
      h.value = Ne(l, r, "$"), w.value = 0;
    }
    function q(l) {
      const r = l.target;
      m.value = r.value, G(), t("update:draft", r.value), k(r.value, r.selectionStart);
    }
    function S(l) {
      const r = l.target;
      k(r.value, r.selectionStart);
    }
    function H() {
      window.setTimeout(() => {
        h.value = null;
      }, 0);
    }
    function M(l) {
      return Array.from(l).filter((r) => o.fileUploadEnabled || r.type.startsWith("image/"));
    }
    function E(l) {
      if (!(o.imageUploadEnabled || o.fileUploadEnabled) || o.disabled || o.isUploadingImages) return;
      const r = M(l);
      r.length && (o.fileUploadEnabled ? t("attach-files", r) : t("attach-images", r));
    }
    function j() {
      var l;
      (l = y.value) == null || l.click();
    }
    function U(l) {
      const r = l.target;
      r.files && E(r.files), r.value = "";
    }
    function z(l) {
      var p;
      const r = (p = l.clipboardData) == null ? void 0 : p.files;
      !(r != null && r.length) || M(r).length === 0 || (l.preventDefault(), E(r));
    }
    function te(l) {
      var r;
      !(o.imageUploadEnabled || o.fileUploadEnabled) || !Array.from(((r = l.dataTransfer) == null ? void 0 : r.types) ?? []).includes("Files") || (l.preventDefault(), v.value += 1);
    }
    function Te(l) {
      var r;
      !(o.imageUploadEnabled || o.fileUploadEnabled) || !Array.from(((r = l.dataTransfer) == null ? void 0 : r.types) ?? []).includes("Files") || (l.preventDefault(), l.dataTransfer && (l.dataTransfer.dropEffect = "copy"));
    }
    function Ie(l) {
      !(o.imageUploadEnabled || o.fileUploadEnabled) || v.value === 0 || (l.preventDefault(), v.value = Math.max(0, v.value - 1));
    }
    function Re(l) {
      var r;
      !(o.imageUploadEnabled || o.fileUploadEnabled) || !((r = l.dataTransfer) != null && r.files.length) || M(l.dataTransfer.files).length !== 0 && (l.preventDefault(), v.value = 0, E(l.dataTransfer.files));
    }
    function fe(l) {
      const r = h.value;
      if (!r) return;
      const p = c.value, F = (p == null ? void 0 : p.value) || m.value, Q = Ke(F, r);
      o.selectedSkills.includes(l) || t("update:selected-skills", [...o.selectedSkills, l]), t("update:draft", Q.text), m.value = Q.text, h.value = null, ne(() => {
        const Z = c.value;
        Z == null || Z.focus(), Z == null || Z.setSelectionRange(Q.cursor, Q.cursor);
      });
    }
    function Be(l) {
      if (T.value) {
        if (l.key === "Escape") {
          l.preventDefault(), h.value = null;
          return;
        }
        if (l.key === "ArrowDown" || l.key === "ArrowUp") {
          l.preventDefault();
          const r = x.value.length;
          r && (w.value = (w.value + (l.key === "ArrowDown" ? 1 : -1) + r) % r);
          return;
        }
        if (l.key === "Enter" && !l.ctrlKey && !l.metaKey && x.value.length) {
          l.preventDefault(), fe(x.value[Math.min(w.value, x.value.length - 1)].value);
          return;
        }
      }
      l.key !== "Enter" || l.isComposing || !l.ctrlKey && !l.metaKey || (l.preventDefault(), ge());
    }
    function ge() {
      J.value && t("send");
    }
    return (l, r) => (i(), d("form", {
      class: "cody-composer",
      "data-variant": e.variant,
      "data-compact": e.compact,
      "data-cody-component": "composer-surface",
      onSubmit: ce(ge, ["prevent"])
    }, [
      u("div", {
        class: "cody-composer-shell",
        "data-image-drag-active": le.value,
        onDragenter: te,
        onDragover: Te,
        onDragleave: Ie,
        onDrop: Re
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
          onChange: U
        }, null, 40, so),
        K.value.length ? (i(), d("ul", lo, [
          (i(!0), d(I, null, _(K.value, (p) => (i(), d("li", {
            key: p.id,
            class: "cody-composer-image",
            "data-kind": B(ke)(p) ? "image" : "file"
          }, [
            B(ke)(p) ? (i(), d("img", {
              key: 0,
              src: p.url,
              alt: p.name || "待发送图片"
            }, null, 8, ro)) : (i(), d("span", {
              key: 1,
              class: "cody-composer-file-name",
              title: p.name
            }, $(p.name), 9, co)),
            u("button", {
              type: "button",
              disabled: e.disabled,
              "aria-label": `移除附件 ${p.name || "附件"}`,
              onClick: (F) => e.fileUploadEnabled ? t("remove-attachment", p.id) : t("remove-image", p.id)
            }, "×", 8, uo)
          ], 8, io))), 128))
        ])) : D("", !0),
        e.selectedSkills.length ? (i(), d("div", mo, [
          (i(!0), d(I, null, _(e.selectedSkills, (p) => (i(), d("span", {
            key: p,
            class: "cody-composer-chip"
          }, [
            se(" $" + $(C(e.skills, p)) + " ", 1),
            u("button", {
              type: "button",
              disabled: e.disabled,
              "aria-label": `移除 Skill ${C(e.skills, p)}`,
              onClick: (F) => L(p)
            }, "×", 8, po)
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
          "aria-controls": T.value ? a : void 0,
          "aria-activedescendant": A.value,
          "aria-autocomplete": "list",
          onInput: q,
          onClick: S,
          onKeyup: S,
          onBlur: H,
          onPaste: z,
          onKeydown: Be
        }, null, 40, fo),
        T.value ? (i(), d("div", {
          key: 2,
          id: a,
          class: "cody-composer-skill-menu",
          role: "listbox",
          "aria-label": "可引用 Skills"
        }, [
          x.value.length === 0 ? (i(), d("p", go, "没有匹配的 Skill")) : (i(!0), d(I, { key: 1 }, _(x.value, (p, F) => (i(), d("button", {
            id: b(F),
            key: p.value,
            class: pe(["cody-composer-skill-option", { active: F === w.value }]),
            type: "button",
            role: "option",
            "aria-selected": F === w.value,
            onMouseenter: (Q) => w.value = F,
            onMousedown: ce((Q) => fe(p.value), ["prevent"])
          }, [
            u("span", yo, "$" + $(p.label), 1),
            p.description ? (i(), d("span", ko, $(p.description), 1)) : D("", !0)
          ], 42, vo))), 128))
        ])) : D("", !0),
        u("div", bo, [
          Le(u("div", ho, [
            e.imageUploadEnabled || e.fileUploadEnabled ? (i(), d("button", {
              key: 0,
              class: "cody-composer-image-picker",
              type: "button",
              disabled: e.disabled || e.isUploadingImages,
              "aria-label": e.fileUploadEnabled ? "添加附件" : "添加图片",
              title: e.fileUploadEnabled ? "添加附件（任意格式，也可拖拽）" : "添加图片（也可粘贴或拖拽）",
              onClick: j
            }, [...r[7] || (r[7] = [
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
            ])], 8, $o)) : D("", !0),
            oe(l.$slots, "leading"),
            e.collaborationModes.length ? (i(), ve(B(n), {
              key: 1,
              label: "协作模式",
              "model-value": e.selectedCollaborationMode,
              options: e.collaborationModes,
              disabled: e.disabled || e.isRunning,
              "onUpdate:modelValue": r[0] || (r[0] = (p) => t("update:collaboration-mode", p))
            }, null, 8, ["model-value", "options", "disabled"])) : D("", !0),
            N(B(n), {
              label: "提交策略",
              "model-value": e.selectedSubmitMode,
              options: e.submitModes,
              disabled: e.disabled,
              "onUpdate:modelValue": r[1] || (r[1] = (p) => t("update:submit-mode", p))
            }, null, 8, ["model-value", "options", "disabled"]),
            e.models.length ? (i(), ve(B(n), {
              key: 2,
              label: "模型",
              "model-value": e.selectedModel,
              options: e.models,
              disabled: e.disabled || e.isRunning,
              "onUpdate:modelValue": r[2] || (r[2] = (p) => t("update:model", p))
            }, null, 8, ["model-value", "options", "disabled"])) : D("", !0),
            N(B(n), {
              label: "推理强度",
              "model-value": e.selectedReasoning,
              options: e.reasoningOptions,
              disabled: e.disabled || e.isRunning,
              "onUpdate:modelValue": r[3] || (r[3] = (p) => t("update:reasoning", p))
            }, null, 8, ["model-value", "options", "disabled"]),
            N(B(n), {
              label: "权限",
              "model-value": e.selectedPermission,
              options: e.permissionOptions,
              disabled: e.disabled || e.isRunning,
              "onUpdate:modelValue": r[4] || (r[4] = (p) => t("update:permission", p))
            }, null, 8, ["model-value", "options", "disabled"]),
            oe(l.$slots, "controls")
          ], 512), [
            [_e, !e.compact]
          ]),
          u("div", wo, [
            e.isRunning ? (i(), d("button", {
              key: 0,
              class: "cody-composer-stop",
              type: "button",
              disabled: e.disabled,
              "aria-label": "停止当前回复",
              title: "停止当前回复",
              onClick: r[5] || (r[5] = (p) => t("stop"))
            }, [...r[8] || (r[8] = [
              u("span", {
                class: "cody-composer-stop-icon",
                "aria-hidden": "true"
              }, null, -1)
            ])], 8, Co)) : D("", !0),
            u("button", {
              class: "cody-composer-send",
              type: "submit",
              disabled: !J.value,
              "aria-label": ee.value,
              title: ee.value
            }, [...r[9] || (r[9] = [
              u("svg", {
                viewBox: "0 0 24 24",
                "aria-hidden": "true"
              }, [
                u("path", { d: "M12 19V5m0 0-6 6m6-6 6 6" })
              ], -1)
            ])], 8, So),
            e.collapsible ? (i(), d("button", {
              key: 1,
              class: "cody-composer-layout-toggle",
              type: "button",
              "aria-expanded": !e.compact,
              "aria-label": e.compact ? "展开输入设置" : "收起输入设置",
              title: e.compact ? "展开输入设置" : "收起输入设置",
              onClick: r[6] || (r[6] = (p) => t("update:compact", !e.compact))
            }, [
              (i(), d("svg", Ao, [
                u("path", {
                  d: e.compact ? "m7 14 5-5 5 5" : "m7 10 5 5 5-5"
                }, null, 8, Lo)
              ]))
            ], 8, xo)) : D("", !0)
          ])
        ]),
        !e.compact && W.value ? (i(), d("p", qo, $(W.value), 1)) : D("", !0),
        e.imageError ? (i(), d("p", Mo, $(e.imageError), 1)) : e.imageUploadEnabled && e.isUploadingImages ? (i(), d("p", Do, "正在上传附件…")) : D("", !0)
      ], 40, no)
    ], 40, ao));
  }
});
function Vo() {
  const e = je(de());
  let s = null, n = null, o = 0;
  const t = () => {
    o += 1, n == null || n(), n = null, s == null || s.dispose(), s = null;
  }, c = async (x, T) => {
    t(), e.value = de(x);
    const A = o, W = at(x, T);
    s = W, n = W.subscribe((K) => {
      s === W && o === A && (e.value = K);
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
  }, g = (x = "") => {
    t(), e.value = de(x);
  }, a = () => {
    t();
  };
  return Ve() && We(a), {
    state: O(() => e.value),
    connect: c,
    submitUserMessage: m,
    retryFailedUserMessage: h,
    discardFailedUserMessage: w,
    interrupt: v,
    refresh: y,
    reset: g,
    dispose: a
  };
}
export {
  jo as CodyComposer,
  _o as CodyConversation,
  Ee as CodyImagePreviewDialog,
  Ae as CodyMarkdown,
  Mt as CodyRequestCard,
  Y as DEFAULT_CODY_MARKDOWN_LABELS,
  Po as conversationEntriesFromState,
  Ue as questionFieldsFromParams,
  Ce as renderCodyMarkdown,
  ut as requestSummary,
  Se as stabilizeStreamingMarkdown,
  Vo as useConversationController
};
