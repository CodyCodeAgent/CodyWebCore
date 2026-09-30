import { defineComponent as Y, ref as F, watch as se, nextTick as de, onMounted as $e, onBeforeUnmount as we, openBlock as r, createElementBlock as d, withModifiers as re, createElementVNode as c, createCommentVNode as M, computed as O, Fragment as I, createVNode as H, reactive as Me, toDisplayString as A, renderList as P, createTextVNode as ue, normalizeClass as ce, withDirectives as De, withKeys as Te, vModelDynamic as Ee, renderSlot as te, unref as V, h as le, useId as Ue, createBlock as pe, shallowRef as Ie, getCurrentScope as Re, onScopeDispose as Oe } from "vue";
import { buildApprovalRiskSummary as _e, toolStatusTone as ge, buildToolOutputPreview as Fe, isToolOutputTruncated as Be, toolOutputToggleLabel as Pe } from "@codycodeagent/cody-web-core/presentation";
import Ce from "dompurify";
import ze from "markdown-it";
import je from "markdown-it-footnote";
import Ve from "markdown-it-task-lists";
import { conversationFeedFromState as We, formatTurnDuration as He, createConversationState as ie } from "@codycodeagent/cody-web-core/conversation";
import { composerHasContent as Ne, removeComposerTrigger as Ke, findComposerTrigger as Ge } from "@codycodeagent/cody-web-core/composer";
import { createConversationController as Qe } from "@codycodeagent/cody-web-core/client";
const J = {
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
}, U = new ze({ breaks: !0, html: !1, linkify: !0, typographer: !1 });
U.use(Ve, { enabled: !1, label: !0, labelAfter: !0 });
U.use(je);
function B(e, a) {
  return `<button type="button" class="markdown-tool-button" data-markdown-action="${e}" aria-label="${a}" title="${a}">${a}</button>`;
}
function Se(e, a = "", o = J) {
  const s = a.toLowerCase();
  if (s === "mermaid" || s === "plantuml" || s === "puml") {
    const b = s === "mermaid" ? "mermaid" : "plantuml";
    return `<div class="markdown-diagram-shell" data-diagram-engine="${b}"><header class="markdown-diagram-toolbar"><span>${b}</span><span class="markdown-diagram-actions">${B("diagram-zoom-out", o.zoomOut)}${B("diagram-fit", o.fit)}${B("diagram-zoom-in", o.zoomIn)}${B("diagram-source", o.source)}${B("diagram-fullscreen", o.fullscreen)}${B("diagram-export-svg", "SVG")}${B("diagram-export-png", "PNG")}</span></header><div class="markdown-diagram-stage" role="img" aria-label="${o.diagramAria(b)}"><p class="markdown-diagram-status">${o.rendering(b)}</p></div><pre class="markdown-diagram-source" hidden><code>${U.utils.escapeHtml(e)}</code></pre></div>
`;
  }
  const t = e.replace(/\n$/u, "").split(`
`), u = t.length <= 2 && t.every((b) => b.length <= 96), k = t.length > 10, g = a || "text", $ = [u ? "is-compact-code" : "", /^[A-Za-z0-9_-]+$/u.test(a) ? `language-${a}` : ""].filter(Boolean).join(" "), p = $ ? ` class="${$}"` : "", m = [u ? "is-compact" : "", k ? "is-collapsible is-collapsed" : ""].filter(Boolean).join(" "), n = k ? `${g} · ${o.lineCount(t.length)}` : g, S = k ? `<button type="button" class="markdown-tool-button markdown-code-collapse" data-markdown-action="toggle-code" aria-label="${o.collapseCode}" title="${o.collapseCode}" aria-expanded="false">${o.collapseCode}</button>` : "", w = k ? `<div class="markdown-code-expand"><button type="button" data-markdown-action="toggle-code" aria-expanded="false">${o.expandCode(t.length)}</button></div>` : "";
  return `<div class="markdown-code-host"><div class="markdown-code-shell${m ? ` ${m}` : ""}" data-language="${g}" data-code-lines="${String(t.length)}"><header class="markdown-code-toolbar"><span>${n}</span><span class="markdown-code-actions">${S}${B("wrap-code", o.wrap)}${B("copy-code", o.copy)}${B("save-code", o.save)}</span></header><pre class="markdown-code-block${u ? " is-compact" : ""}"><code${p}>${U.utils.escapeHtml(e)}</code></pre>${w}</div></div>
`;
}
U.renderer.rules.fence = (e, a, o, s) => {
  const t = e[a];
  return Se(t.content, t.info.trim().split(/\s+/u)[0] ?? "", s.labels);
};
U.renderer.rules.code_block = (e, a, o, s) => Se(e[a].content, "", s.labels);
U.renderer.rules.table_open = (e, a, o, s) => {
  const t = s.labels ?? J;
  return `<section class="markdown-table-shell" role="region" aria-label="${t.dataTable}" tabindex="0"><header class="markdown-table-toolbar">${B("copy-table", t.copyCsv)}</header><div class="markdown-table-scroll"><table>
`;
};
U.renderer.rules.table_close = () => `</table></div></section>
`;
const fe = U.renderer.rules.code_inline;
U.renderer.rules.code_inline = (e, a, o, s, t) => {
  const u = e[a].content, k = u.match(/^(.+?\.[A-Za-z0-9_-]{1,12})(?::(\d+))?$/u);
  if (!k || /\s/u.test(u)) return fe ? fe(e, a, o, s, t) : t.renderToken(e, a, o);
  const g = U.utils.escapeHtml(k[1]), $ = k[2] ?? "", p = s.labels ?? J;
  return `<button type="button" class="markdown-file-link" data-markdown-action="open-file" data-file-path="${g}" data-file-line="${$}" title="${p.openFile(g)}"><code>${U.utils.escapeHtml(u)}</code></button>`;
};
function xe(e) {
  if (!e || /^(?:[A-Za-z][A-Za-z\d+.-]*:|\/\/|#)/u.test(e)) return;
  const a = e.match(/^(.*?)(?:#L?(\d+))?$/u), o = (a == null ? void 0 : a[1]) ?? e, s = (a == null ? void 0 : a[2]) ?? "";
  if (/[?#]/u.test(o)) return;
  const t = o.startsWith("/") || o.startsWith("./") || o.startsWith("../"), u = /(?:^|\/)[^/?#]+\.[A-Za-z\d_-]{1,12}$/u.test(o);
  if (!(!t && !u))
    return { path: o, line: s };
}
function Ze(e, a) {
  let o = 0;
  for (let s = a - 1; s >= 0; s -= 1)
    if (e[s].type === "link_close" && (o += 1), e[s].type === "link_open") {
      if (o === 0) return e[s];
      o -= 1;
    }
}
const ve = U.renderer.rules.link_open;
U.renderer.rules.link_open = (e, a, o, s, t) => {
  const u = e[a], k = u.attrGet("href") ?? "", g = xe(k);
  if (g) {
    const $ = s.labels ?? J, p = U.utils.escapeHtml(g.path);
    return `<button type="button" class="markdown-file-link" data-markdown-action="open-file" data-file-path="${p}" data-file-line="${g.line}" title="${$.openFile(p)}">`;
  }
  return /^https?:\/\//u.test(k) && (u.attrSet("target", "_blank"), u.attrSet("rel", "noopener noreferrer")), ve ? ve(e, a, o, s, t) : t.renderToken(e, a, o);
};
const ye = U.renderer.rules.link_close;
U.renderer.rules.link_close = (e, a, o, s, t) => {
  var k;
  const u = ((k = Ze(e, a)) == null ? void 0 : k.attrGet("href")) ?? "";
  return xe(u) ? "</button>" : ye ? ye(e, a, o, s, t) : t.renderToken(e, a, o);
};
function ke(e, a = J) {
  return Ce.sanitize(U.render(e, { labels: a }), {
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
const Xe = ["aria-label"], Ye = ["src", "alt"], Ae = /* @__PURE__ */ Y({
  __name: "CodyImagePreviewDialog",
  props: {
    src: {},
    alt: { default: "图片预览" }
  },
  emits: ["dismiss"],
  setup(e, { emit: a }) {
    const o = e, s = a, t = F(null);
    se(() => o.src, async (g) => {
      var $;
      g && (await de(), ($ = t.value) == null || $.focus());
    }, { flush: "post" });
    function u() {
      s("dismiss");
    }
    function k(g) {
      g.key === "Escape" && o.src && (g.preventDefault(), u());
    }
    return $e(() => window.addEventListener("keydown", k)), we(() => window.removeEventListener("keydown", k)), (g, $) => e.src ? (r(), d("div", {
      key: 0,
      ref_key: "dialogRef",
      ref: t,
      class: "cody-image-preview-dialog",
      role: "dialog",
      "aria-modal": "true",
      "aria-label": e.alt,
      tabindex: "-1",
      onClick: re(u, ["self"])
    }, [
      c("button", {
        type: "button",
        "aria-label": "关闭图片预览",
        onClick: u
      }, "×"),
      c("img", {
        src: e.src,
        alt: e.alt
      }, null, 8, Ye)
    ], 8, Xe)) : M("", !0);
  }
}), Je = ["innerHTML"], he = /* @__PURE__ */ Y({
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
    const o = e, s = a, t = O(() => o.labels ?? J), u = F(null), k = F(ke(be(o.text), t.value)), g = F(""), $ = /* @__PURE__ */ new Set();
    let p = 0, m = 0;
    const n = {
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
      window.clearTimeout(p), p = window.setTimeout(async () => {
        k.value = ke(be(f), t.value), await de(), w();
      }, o.renderDelay);
    }
    async function w() {
      var L, h, v, q, x, z;
      for (const D of Array.from(((L = u.value) == null ? void 0 : L.querySelectorAll("td")) ?? []))
        /^-?[\d,.]+%?$/u.test(((h = D.textContent) == null ? void 0 : h.trim()) ?? "") && (D.dataset.numeric = "true");
      for (const D of Array.from(((v = u.value) == null ? void 0 : v.querySelectorAll("img")) ?? []))
        D.addEventListener("error", () => {
          D.alt = D.alt || "图片加载失败", D.classList.add("is-load-error");
        }, { once: !0 });
      b();
      for (const [D, T] of Array.from(((q = u.value) == null ? void 0 : q.querySelectorAll(".markdown-code-shell")) ?? []).entries()) {
        T.dataset.codeIndex = String(D), T.classList.contains("is-collapsible") && $.has(D) && T.classList.remove("is-collapsed");
        for (const _ of Array.from(T.querySelectorAll('[data-markdown-action="toggle-code"]')))
          _.setAttribute("aria-expanded", String(!T.classList.contains("is-collapsed")));
        const R = T.querySelector("pre"), E = T.querySelector('[data-markdown-action="wrap-code"]');
        R && E && (E.hidden = R.scrollWidth <= R.clientWidth + 2, E.setAttribute("aria-pressed", String(T.classList.contains("is-wrapped"))));
      }
      await N();
      const f = Array.from(((x = u.value) == null ? void 0 : x.querySelectorAll('pre code[class*="language-"]')) ?? []);
      if (f.length === 0) return;
      const C = (await import("highlight.js/lib/core")).default;
      for (const D of f) {
        const T = ((z = Array.from(D.classList).find((_) => _.startsWith("language-"))) == null ? void 0 : z.slice(9)) ?? "", R = n[T];
        if (!R || D.dataset.highlighted === "yes") continue;
        const E = await R();
        C.getLanguage(T) || C.registerLanguage(T, E.default), D.innerHTML = C.highlight(D.textContent ?? "", { language: T }).value, D.dataset.highlighted = "yes";
      }
    }
    function b() {
      var C;
      if (!o.resolveAssetUrl) return;
      const f = /\.(?:svg|png|jpe?g|gif|webp)(?:[?#].*)?$/iu;
      for (const L of Array.from(((C = u.value) == null ? void 0 : C.querySelectorAll("a[href]")) ?? [])) {
        const h = L.getAttribute("href") ?? "";
        if (!f.test(h) || /^(?:data|blob):/iu.test(h)) continue;
        const v = o.resolveAssetUrl(h);
        v && (L.href = v, L.target = "_blank", L.rel = "noopener noreferrer");
      }
    }
    async function N() {
      var C, L, h, v;
      const f = Array.from(((C = u.value) == null ? void 0 : C.querySelectorAll(".markdown-diagram-shell:not([data-rendered])")) ?? []);
      for (const q of f) {
        q.dataset.rendered = "loading";
        const x = q.dataset.diagramEngine === "plantuml" ? "plantuml" : "mermaid", z = ((L = q.querySelector("code")) == null ? void 0 : L.textContent) ?? "", D = q.querySelector(".markdown-diagram-stage");
        if (D)
          try {
            let T = await ((h = o.renderDiagram) == null ? void 0 : h.call(o, { engine: x, source: z, dark: o.dark }));
            if (!T && x === "mermaid") {
              const { default: R } = await import("mermaid");
              R.initialize({ startOnLoad: !1, securityLevel: "strict", theme: o.dark ? "dark" : "default", htmlLabels: !1, flowchart: { htmlLabels: !1, useMaxWidth: !1 } }), T = (await R.render(`cody-diagram-${String(++m)}`, z)).svg;
            }
            if (!T) throw new Error(x === "plantuml" ? "当前环境未配置 PlantUML 渲染器" : "图表渲染失败");
            D.innerHTML = W(T), K(D), q.dataset.rendered = "yes", q.style.setProperty("--diagram-scale", "1");
          } catch (T) {
            D.textContent = T instanceof Error ? T.message : "图表渲染失败", D.classList.add("markdown-diagram-error"), (v = q.querySelector(".markdown-diagram-source")) == null || v.removeAttribute("hidden"), q.dataset.rendered = "error";
          }
      }
    }
    function W(f) {
      const C = Ce.sanitize(f, { USE_PROFILES: { svg: !0, svgFilters: !0, html: !0 }, ADD_TAGS: ["foreignObject"], ADD_ATTR: ["xmlns"] }), L = C.trimStart().startsWith("<svg") ? C : `<svg xmlns="http://www.w3.org/2000/svg">${C}</svg>`, h = new DOMParser().parseFromString(L, "image/svg+xml");
      if (h.querySelector("parsererror")) return "";
      for (const v of h.querySelectorAll("*")) for (const q of Array.from(v.attributes)) /^on/iu.test(q.name) && v.removeAttribute(q.name);
      return h.querySelectorAll("script").forEach((v) => v.remove()), new XMLSerializer().serializeToString(h.documentElement);
    }
    function K(f) {
      if (f.dataset.panReady === "true") return;
      f.dataset.panReady = "true";
      let C = 0, L = 0, h = 0, v = 0;
      f.addEventListener("pointerdown", (x) => {
        x.button === 0 && (C = x.clientX, L = x.clientY, h = f.scrollLeft, v = f.scrollTop, f.setPointerCapture(x.pointerId), f.classList.add("is-panning"));
      }), f.addEventListener("pointermove", (x) => {
        f.hasPointerCapture(x.pointerId) && (f.scrollLeft = h - (x.clientX - C), f.scrollTop = v - (x.clientY - L));
      });
      const q = (x) => {
        f.hasPointerCapture(x.pointerId) && f.releasePointerCapture(x.pointerId), f.classList.remove("is-panning");
      };
      f.addEventListener("pointerup", q), f.addEventListener("pointercancel", q);
    }
    function G(f, C = 0) {
      const L = Number(f.style.getPropertyValue("--diagram-scale") || "1");
      f.style.setProperty("--diagram-scale", String(C === 0 ? 1 : Math.min(2.5, Math.max(0.4, L + C))));
    }
    function oe(f, C) {
      const L = document.createElement("a");
      L.href = URL.createObjectURL(f), L.download = C, L.click(), URL.revokeObjectURL(L.href);
    }
    async function ee(f, C) {
      const L = C.textContent;
      try {
        await navigator.clipboard.writeText(f), C.textContent = "已复制";
      } catch {
        const h = document.createElement("textarea");
        h.value = f, h.style.position = "fixed", h.style.opacity = "0", document.body.appendChild(h), h.select();
        const v = document.execCommand("copy");
        h.remove(), C.textContent = v ? "已复制" : "复制失败";
      }
      window.setTimeout(() => {
        C.textContent = L;
      }, 1200);
    }
    function ne(f) {
      return Array.from((f == null ? void 0 : f.rows) ?? []).map((C) => Array.from(C.cells).map((L) => {
        var h;
        return `"${((h = L.textContent) == null ? void 0 : h.trim().replace(/"/gu, '""')) ?? ""}"`;
      }).join(",")).join(`
`);
    }
    function ae(f) {
      var z, D, T, R;
      const C = f.target, L = C.closest("img");
      if (L) {
        g.value = L.currentSrc || L.src;
        return;
      }
      const h = C.closest("[data-markdown-action]");
      if (!h) return;
      const v = h.closest(".markdown-code-shell, .markdown-table-shell"), q = h.dataset.markdownAction;
      if (q === "copy-code" && ee(((z = v == null ? void 0 : v.querySelector("code")) == null ? void 0 : z.textContent) ?? "", h), q === "wrap-code") {
        const E = (v == null ? void 0 : v.classList.toggle("is-wrapped")) ?? !1;
        h.textContent = E && t.value.scroll || t.value.wrap, h.setAttribute("aria-pressed", String(E));
      }
      if (q === "save-code" && oe(new Blob([((D = v == null ? void 0 : v.querySelector("code")) == null ? void 0 : D.textContent) ?? ""], { type: "text/plain" }), `snippet.${(v == null ? void 0 : v.dataset.language) || "txt"}`), q === "toggle-code" && (v != null && v.classList.contains("is-collapsible"))) {
        const E = Number(v.dataset.codeIndex ?? -1), _ = !v.classList.toggle("is-collapsed");
        E >= 0 && (_ ? $.add(E) : $.delete(E));
        for (const Q of Array.from(v.querySelectorAll('[data-markdown-action="toggle-code"]'))) Q.setAttribute("aria-expanded", String(_));
      }
      if (q === "copy-table" && ee(ne((v == null ? void 0 : v.querySelector("table")) ?? null), h), q === "open-file") {
        const E = h.dataset.filePath ?? "", _ = ((T = o.cwd) == null ? void 0 : T.replace(/\/$/u, "")) ?? "", Q = E.startsWith("/") && _ && E.startsWith(`${_}/`) ? E.slice(_.length + 1) : E.replace(/^\.\//u, "");
        s("openFile", { path: Q, line: Number(h.dataset.fileLine || 0) || 1 });
      }
      const x = h.closest(".markdown-diagram-shell");
      if (x && q === "diagram-zoom-in" && G(x, 0.2), x && q === "diagram-zoom-out" && G(x, -0.2), x && q === "diagram-fit" && G(x), x && q === "diagram-source") {
        const E = x.querySelector(".markdown-diagram-source");
        E && (E.hidden = !E.hidden);
      }
      if (x && q === "diagram-fullscreen" && ((R = x.requestFullscreen) == null || R.call(x)), x && q === "diagram-export-svg") {
        const E = x.querySelector("svg");
        E && oe(new Blob([new XMLSerializer().serializeToString(E)], { type: "image/svg+xml" }), "diagram.svg");
      }
    }
    return se(() => [o.text, o.labels], ([f]) => {
      S(f);
    }, { deep: !0 }), $e(() => {
      w();
    }), we(() => window.clearTimeout(p)), (f, C) => (r(), d(I, null, [
      c("div", {
        ref_key: "rootRef",
        ref: u,
        class: "cody-markdown cody-markdown-renderer",
        innerHTML: k.value,
        onClick: ae
      }, null, 8, Je),
      H(Ae, {
        src: g.value,
        alt: "Markdown 图片预览",
        onDismiss: C[0] || (C[0] = (L) => g.value = "")
      }, null, 8, ["src"])
    ], 64));
  }
});
function Le(e) {
  if (!e || typeof e != "object") return [];
  const a = e;
  return (Array.isArray(a.questions) ? a.questions : []).flatMap((s, t) => {
    if (!s || typeof s != "object") return [];
    const u = s, k = typeof u.question == "string" ? u.question.trim() : "";
    if (!k) return [];
    const g = Array.isArray(u.options) ? u.options : [];
    return [{
      id: typeof u.id == "string" && u.id.trim() ? u.id.trim() : `question-${String(t + 1)}`,
      header: typeof u.header == "string" ? u.header.trim() : "",
      question: k,
      isOther: u.isOther === !0,
      isSecret: u.isSecret === !0,
      options: g.flatMap(($) => {
        if (!$ || typeof $ != "object") return [];
        const p = $, m = typeof p.label == "string" ? p.label.trim() : "";
        return m ? [{ label: m, description: typeof p.description == "string" ? p.description.trim() : "" }] : [];
      })
    }];
  });
}
function et(e) {
  var s;
  if (!e || typeof e != "object") return "Codex 请求执行一项受保护操作。";
  const a = e, o = a.reason ?? a.question ?? a.command;
  return typeof o == "string" && o.trim() ? o : ((s = Le(e)[0]) == null ? void 0 : s.question) ?? "Codex 请求执行一项受保护操作。";
}
function bo(e) {
  var s;
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
    const u = `file-group:${t.turnId ?? t.id}`, k = a.at(-1);
    if (!k || k.kind !== "tool" || k.id !== u) {
      const p = [...new Set(t.tool.details)], m = {
        id: u,
        kind: "tool",
        tool: {
          ...t.tool,
          title: p.length > 1 ? `文件变更 · ${String(p.length)} 个文件` : "文件变更",
          summary: p.length ? `${String(p.length)} 个文件已更新` : t.tool.summary,
          details: p
        }
      };
      a.push(m);
      return;
    }
    const g = [.../* @__PURE__ */ new Set([...k.tool.details, ...t.tool.details])], $ = [k.tool.output, t.tool.output].filter(Boolean).join(`

`);
    k.tool = {
      ...k.tool,
      status: /fail|error|cancel|reject/iu.test(`${k.tool.status} ${t.tool.status}`) ? "failed" : t.tool.status,
      title: g.length > 1 ? `文件变更 · ${String(g.length)} 个文件` : "文件变更",
      summary: g.length ? `${String(g.length)} 个文件已更新` : t.tool.summary,
      details: g,
      ...$ ? { output: $ } : {}
    };
  };
  for (const t of We(e))
    if (t.kind === "message") a.push({ id: t.id, kind: "message", message: t.message });
    else if (t.kind === "timeline") o(t.entry);
    else if (t.kind === "plan") a.push({ id: t.id, kind: "plan", text: t.plan.text });
    else if (t.kind === "request") a.push({ id: t.id, kind: "request", request: t.request });
    else if (t.kind === "turn" && t.status === "failed") a.push({ id: t.id, kind: "failure", text: t.error });
    else {
      if (t.kind === "turn" && t.status === "interrupted") continue;
      t.kind === "turn" && t.status === "completed" ? a.push({ id: t.id, kind: "worked", label: `Worked for ${He(t.durationMs ?? 0)}` }) : t.kind === "activity" && a.push({
        id: t.id,
        kind: "activity",
        title: t.status === "waiting" ? ((s = e.pendingRequests.find((u) => !u.turnId || u.turnId === t.turnId)) == null ? void 0 : s.kind) === "approval" ? "等待你的审批" : "等待你的回答" : t.label,
        detail: t.status === "waiting" ? "处理后 Codex 会继续本次回复" : t.status === "retrying" ? e.connection.status === "disconnected" ? "连接已中断，等待恢复" : "正在恢复本次回复" : e.connection.status === "connected" ? "实时更新中" : "等待恢复连接",
        tone: t.status
      });
    }
  return a;
}
const tt = ["data-kind"], ot = { class: "cody-request-heading" }, at = { key: 0 }, st = {
  key: 0,
  class: "cody-question-options"
}, nt = ["onClick"], lt = { key: 0 }, it = ["onUpdate:modelValue", "type", "placeholder"], rt = { class: "cody-request-actions" }, dt = ["disabled"], ut = { class: "cody-approval-risk-heading" }, ct = ["data-level"], mt = { class: "cody-approval-risk-subject" }, pt = {
  key: 0,
  class: "cody-approval-risk-labels"
}, gt = {
  key: 1,
  class: "cody-approval-risk-details"
}, ft = { class: "cody-approval-risk-recommendation" }, vt = { key: 1 }, yt = {
  key: 2,
  class: "cody-request-actions"
}, kt = /* @__PURE__ */ Y({
  __name: "CodyRequestCard",
  props: {
    request: {}
  },
  emits: ["resolveApproval", "resolveQuestion"],
  setup(e, { emit: a }) {
    const o = e, s = a, t = Me({}), u = O(() => Le(o.request.params)), k = O(() => et(o.request.params)), g = O(() => o.request.kind === "approval" ? _e({ method: o.request.method, params: o.request.params }) : null), $ = O(() => u.value.length > 0 && u.value.every((m) => {
      var n;
      return !!((n = t[m.id]) != null && n.trim());
    }));
    se(() => o.request.id, () => {
      for (const m of Object.keys(t)) delete t[m];
    });
    function p() {
      $.value && s("resolveQuestion", o.request.id, Object.fromEntries(u.value.map((m) => [m.id, { answers: [t[m.id].trim()] }])));
    }
    return (m, n) => (r(), d("article", {
      class: "cody-request-card",
      "data-kind": e.request.kind
    }, [
      c("div", ot, [
        c("strong", null, A(e.request.kind === "approval" ? "需要你的确认" : "Codex 需要补充信息"), 1),
        n[2] || (n[2] = c("small", null, "Agent 已暂停等待", -1))
      ]),
      e.request.kind === "question" && u.value.length ? (r(), d(I, { key: 0 }, [
        (r(!0), d(I, null, P(u.value, (S) => (r(), d("fieldset", {
          key: S.id,
          class: "cody-question-field"
        }, [
          c("legend", null, [
            S.header ? (r(), d("span", at, A(S.header), 1)) : M("", !0),
            ue(A(S.question), 1)
          ]),
          S.options.length ? (r(), d("div", st, [
            (r(!0), d(I, null, P(S.options, (w) => (r(), d("button", {
              key: w.label,
              type: "button",
              class: ce({ selected: t[S.id] === w.label }),
              onClick: (b) => t[S.id] = w.label
            }, [
              c("strong", null, A(w.label), 1),
              w.description ? (r(), d("small", lt, A(w.description), 1)) : M("", !0)
            ], 10, nt))), 128))
          ])) : M("", !0),
          S.options.length === 0 || S.isOther ? De((r(), d("input", {
            key: 1,
            "onUpdate:modelValue": (w) => t[S.id] = w,
            type: S.isSecret ? "password" : "text",
            placeholder: S.options.length ? "其他回答…" : "输入回答…",
            onKeyup: Te(p, ["enter"])
          }, null, 40, it)), [
            [Ee, t[S.id]]
          ]) : M("", !0)
        ]))), 128)),
        c("div", rt, [
          c("button", {
            type: "button",
            disabled: !$.value,
            onClick: p
          }, "提交回答", 8, dt)
        ])
      ], 64)) : (r(), d(I, { key: 1 }, [
        g.value ? (r(), d(I, { key: 0 }, [
          c("div", ut, [
            c("div", null, [
              c("strong", null, A(g.value.title), 1),
              c("p", null, A(g.value.description), 1)
            ]),
            c("span", {
              class: "cody-approval-risk-level",
              "data-level": g.value.level
            }, A(g.value.level), 9, ct)
          ]),
          c("code", mt, A(g.value.subject), 1),
          g.value.riskLabels.length ? (r(), d("ul", pt, [
            (r(!0), d(I, null, P(g.value.riskLabels, (S) => (r(), d("li", { key: S }, A(S), 1))), 128))
          ])) : M("", !0),
          g.value.impacts.length ? (r(), d("details", gt, [
            n[3] || (n[3] = c("summary", null, "查看影响", -1)),
            c("ul", null, [
              (r(!0), d(I, null, P(g.value.impacts, (S) => (r(), d("li", { key: S }, A(S), 1))), 128))
            ])
          ])) : M("", !0),
          c("p", ft, A(g.value.recommendation), 1)
        ], 64)) : (r(), d("p", vt, A(k.value), 1)),
        e.request.kind === "approval" ? (r(), d("div", yt, [
          c("button", {
            type: "button",
            onClick: n[0] || (n[0] = (S) => s("resolveApproval", e.request.id, "accept"))
          }, "允许一次"),
          c("button", {
            type: "button",
            "data-tone": "danger",
            onClick: n[1] || (n[1] = (S) => s("resolveApproval", e.request.id, "decline"))
          }, "拒绝")
        ])) : M("", !0)
      ], 64))
    ], 8, tt));
  }
}), bt = ["data-variant"], ht = {
  key: 0,
  class: "cody-conversation-loading",
  role: "status"
}, $t = {
  key: 1,
  class: "cody-conversation-empty"
}, wt = {
  key: 0,
  class: "cody-worked-divider"
}, Ct = ["data-role"], St = ["data-role"], xt = { class: "cody-message-stack" }, At = { class: "cody-message-label" }, Lt = {
  key: 0,
  class: "cody-message-skills"
}, qt = {
  key: 1,
  class: "cody-message-body"
}, Mt = {
  key: 2,
  class: "cody-message-images"
}, Dt = ["onClick"], Tt = ["src"], Et = ["onClick"], Ut = ["onClick"], It = ["data-tone", "open"], Rt = { key: 0 }, Ot = ["onClick"], _t = {
  key: 3,
  class: "cody-reasoning-card"
}, Ft = {
  key: 4,
  class: "cody-plan-card",
  open: ""
}, Bt = {
  key: 6,
  class: "cody-failure-card"
}, Pt = {
  key: 7,
  class: "cody-interrupted-card",
  role: "status"
}, zt = ["data-tone"], ho = /* @__PURE__ */ Y({
  __name: "CodyConversation",
  props: {
    entries: {},
    loading: { type: Boolean },
    variant: { default: "standalone" }
  },
  emits: ["copy", "openFile", "retryMessage", "resolveApproval", "resolveQuestion"],
  setup(e, { emit: a }) {
    const o = a, s = F({}), t = F("");
    function u(p, m) {
      return p === "failed" ? `发送失败${m ? `：${m}` : ""}` : p === "queued" ? `已加入发送队列${m ? `：${m}` : ""}` : p === "delivered" ? "已发送给当前任务" : "正在发送…";
    }
    function k(p) {
      s.value = {
        ...s.value,
        [p]: s.value[p] !== !0
      };
    }
    function g(p, m) {
      o("resolveApproval", p, m);
    }
    function $(p, m) {
      o("resolveQuestion", p, m);
    }
    return (p, m) => (r(), d("section", {
      class: "cody-conversation",
      "data-variant": e.variant,
      "data-cody-component": "conversation-surface"
    }, [
      e.loading ? (r(), d("div", ht, "正在同步对话…")) : e.entries.length === 0 ? (r(), d("div", $t, [
        te(p.$slots, "empty", {}, () => [
          m[3] || (m[3] = ue("开始这个需求的开发", -1))
        ])
      ])) : (r(!0), d(I, { key: 2 }, P(e.entries, (n) => {
        var S, w;
        return r(), d(I, {
          key: n.id
        }, [
          n.kind === "worked" ? (r(), d("div", wt, [
            c("span", null, A(n.label), 1)
          ])) : n.kind === "message" ? (r(), d("article", {
            key: 1,
            class: "cody-message",
            "data-role": n.message.role
          }, [
            c("div", {
              class: "cody-message-identity",
              "data-role": n.message.role
            }, A(n.message.role === "user" ? "你" : "CW"), 9, St),
            c("div", xt, [
              c("div", At, A(n.message.role === "user" ? "你" : n.message.role === "assistant" ? "Codex Agent" : "系统"), 1),
              (S = n.message.skills) != null && S.length ? (r(), d("ul", Lt, [
                (r(!0), d(I, null, P(n.message.skills, (b) => (r(), d("li", {
                  key: `${b.name}:${b.path}`
                }, "$" + A(b.displayName || b.name), 1))), 128))
              ])) : M("", !0),
              n.message.text ? (r(), d("div", qt, [
                te(p.$slots, "markdown", {
                  message: n.message
                }, () => [
                  H(he, {
                    text: n.message.text,
                    onOpenFile: m[0] || (m[0] = (b) => o("openFile", b))
                  }, null, 8, ["text"])
                ])
              ])) : M("", !0),
              (w = n.message.images) != null && w.length ? (r(), d("div", Mt, [
                (r(!0), d(I, null, P(n.message.images, (b) => (r(), d("button", {
                  key: b,
                  type: "button",
                  "aria-label": "打开对话图片预览",
                  onClick: (N) => t.value = b
                }, [
                  c("img", {
                    src: b,
                    alt: "对话图片",
                    loading: "lazy"
                  }, null, 8, Tt)
                ], 8, Dt))), 128))
              ])) : M("", !0),
              n.message.outbox ? (r(), d("div", {
                key: 3,
                class: ce(["cody-message-outbox", n.message.outbox.status]),
                role: "status"
              }, [
                c("span", null, A(u(n.message.outbox.status, n.message.outbox.lastError)), 1),
                n.message.outbox.status === "failed" ? (r(), d("button", {
                  key: 0,
                  class: "cody-message-retry",
                  type: "button",
                  onClick: (b) => o("retryMessage", n.message)
                }, "重试此消息", 8, Et)) : M("", !0)
              ], 2)) : M("", !0),
              n.message.text ? (r(), d("button", {
                key: 4,
                class: "cody-copy-button",
                type: "button",
                onClick: (b) => o("copy", n.message.text)
              }, "复制", 8, Ut)) : M("", !0)
            ])
          ], 8, Ct)) : n.kind === "tool" ? (r(), d("details", {
            key: 2,
            class: "cody-tool-card",
            "data-tone": V(ge)(n.tool.status),
            open: V(ge)(n.tool.status) === "working"
          }, [
            c("summary", null, [
              m[4] || (m[4] = c("span", null, "⌁", -1)),
              c("strong", null, A(n.tool.title), 1),
              c("small", null, A(n.tool.status), 1)
            ]),
            c("p", null, A(n.tool.summary), 1),
            n.tool.details.length ? (r(), d("ul", Rt, [
              (r(!0), d(I, null, P(n.tool.details, (b) => (r(), d("li", { key: b }, A(b), 1))), 128))
            ])) : M("", !0),
            n.tool.output ? (r(), d(I, { key: 1 }, [
              c("pre", null, A(s.value[n.id] ? n.tool.output : V(Fe)(n.tool.output)), 1),
              V(Be)(n.tool.output) ? (r(), d("button", {
                key: 0,
                class: "cody-tool-output-toggle",
                type: "button",
                onClick: (b) => k(n.id)
              }, A(V(Pe)(s.value[n.id] === !0)), 9, Ot)) : M("", !0)
            ], 64)) : M("", !0)
          ], 8, It)) : n.kind === "reasoning" ? (r(), d("details", _t, [
            c("summary", null, "✦ " + A(n.title || "推理过程"), 1),
            c("pre", null, A(n.text), 1)
          ])) : n.kind === "plan" ? (r(), d("details", Ft, [
            m[5] || (m[5] = c("summary", null, "计划", -1)),
            H(he, {
              text: n.text,
              onOpenFile: m[1] || (m[1] = (b) => o("openFile", b))
            }, null, 8, ["text"])
          ])) : n.kind === "request" ? te(p.$slots, "request", {
            request: n.request
          }, () => [
            H(kt, {
              request: n.request,
              onResolveApproval: g,
              onResolveQuestion: $
            }, null, 8, ["request"])
          ], void 0, 5) : n.kind === "failure" ? (r(), d("details", Bt, [
            m[6] || (m[6] = c("summary", null, "本次回复失败", -1)),
            c("p", null, A(n.text), 1)
          ])) : n.kind === "interrupted" ? (r(), d("article", Pt, A(n.text), 1)) : n.kind === "activity" ? (r(), d("article", {
            key: 8,
            class: "cody-conversation-activity",
            "data-tone": n.tone,
            role: "status",
            "aria-live": "polite"
          }, [
            m[7] || (m[7] = c("span", {
              class: "cody-activity-pulse",
              "aria-hidden": "true"
            }, null, -1)),
            c("strong", null, A(n.title), 1),
            c("small", null, A(n.detail), 1)
          ], 8, zt)) : M("", !0)
        ], 64);
      }), 128)),
      H(Ae, {
        src: t.value,
        alt: "对话图片预览",
        onDismiss: m[2] || (m[2] = (n) => t.value = "")
      }, null, 8, ["src"])
    ], 8, bt));
  }
}), jt = ["data-variant"], Vt = ["data-image-drag-active"], Wt = {
  key: 0,
  class: "cody-composer-images",
  "aria-label": "已添加图片"
}, Ht = ["src", "alt"], Nt = ["disabled", "aria-label", "onClick"], Kt = {
  key: 1,
  class: "cody-composer-selected",
  "aria-label": "已引用 Skills"
}, Gt = ["disabled", "aria-label", "onClick"], Qt = ["value", "disabled", "placeholder", "aria-expanded", "aria-controls", "aria-activedescendant"], Zt = {
  key: 0,
  class: "cody-composer-skill-status"
}, Xt = ["id", "aria-selected", "onMouseenter", "onMousedown"], Yt = { class: "cody-composer-skill-option-name" }, Jt = {
  key: 0,
  class: "cody-composer-skill-option-description"
}, eo = { class: "cody-composer-controls" }, to = {
  class: "cody-composer-settings",
  "aria-label": "运行设置"
}, oo = ["disabled"], ao = { class: "cody-composer-actions" }, so = ["disabled"], no = ["disabled", "aria-label", "title"], lo = {
  key: 3,
  class: "cody-composer-policy"
}, io = {
  key: 4,
  class: "cody-composer-image-error",
  role: "alert"
}, ro = {
  key: 5,
  class: "cody-composer-image-status",
  role: "status"
}, $o = /* @__PURE__ */ Y({
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
    const o = Y({
      name: "CodyComposerSelect",
      props: { label: { type: String, required: !0 }, modelValue: { type: String, required: !0 }, options: { type: Array, required: !0 }, disabled: Boolean },
      emits: ["update:modelValue"],
      setup(l, { emit: i }) {
        return () => le("label", { class: "cody-composer-compact-control", title: l.label, "data-control": l.label }, [
          le("select", { value: l.modelValue, disabled: l.disabled, "aria-label": l.label, onChange: (y) => i("update:modelValue", y.target.value) }, l.options.map((y) => le("option", { value: y.value }, y.label)))
        ]);
      }
    }), s = e, t = a, u = F(null), k = F(null), g = F(s.draft), $ = F(null), p = F(0), m = F(0), n = Ue(), S = `${n}-skill-menu`, w = O(() => {
      const l = $.value;
      return l ? s.skills.filter((i) => !s.selectedSkills.includes(i.value)).filter((i) => l.query ? `${i.label}
${i.description ?? ""}`.toLowerCase().includes(l.query) : !0).slice(0, 8) : [];
    }), b = O(() => $.value !== null), N = O(() => b.value && w.value.length ? ae(Math.min(p.value, w.value.length - 1)) : void 0), W = O(() => {
      var l;
      return ((l = s.permissionOptions.find((i) => i.value === s.selectedPermission)) == null ? void 0 : l.description) ?? "";
    }), K = O(() => !s.disabled && !s.isUploadingImages && Ne({ text: s.draft, images: s.images, skills: s.selectedSkills })), G = O(() => s.isRunning ? s.selectedSubmitMode === "steer" ? "发送引导" : s.selectedSubmitMode === "append" ? "追加到当前任务" : "加入队列" : "发送"), oe = O(() => s.imageUploadEnabled && m.value > 0);
    se(() => s.draft, (l) => {
      g.value = l;
    });
    function ee(l, i) {
      var y;
      return ((y = l.find((j) => j.value === i)) == null ? void 0 : y.label) ?? i;
    }
    function ne(l) {
      t("update:selected-skills", s.selectedSkills.filter((i) => i !== l));
    }
    function ae(l) {
      return `${n}-skill-option-${String(l)}`;
    }
    function f(l, i) {
      $.value = Ge(l, i, "$"), p.value = 0;
    }
    function C(l) {
      const i = l.target;
      g.value = i.value, t("update:draft", i.value), f(i.value, i.selectionStart);
    }
    function L(l) {
      const i = l.target;
      f(i.value, i.selectionStart);
    }
    function h() {
      window.setTimeout(() => {
        $.value = null;
      }, 0);
    }
    function v(l) {
      return Array.from(l).filter((i) => i.type.startsWith("image/"));
    }
    function q(l) {
      if (!s.imageUploadEnabled || s.disabled || s.isUploadingImages) return;
      const i = v(l);
      i.length && t("attach-images", i);
    }
    function x() {
      var l;
      (l = k.value) == null || l.click();
    }
    function z(l) {
      const i = l.target;
      i.files && q(i.files), i.value = "";
    }
    function D(l) {
      var y;
      const i = (y = l.clipboardData) == null ? void 0 : y.files;
      !(i != null && i.length) || v(i).length === 0 || (l.preventDefault(), q(i));
    }
    function T(l) {
      var i;
      !s.imageUploadEnabled || v(((i = l.dataTransfer) == null ? void 0 : i.files) ?? []).length === 0 || (l.preventDefault(), m.value += 1);
    }
    function R(l) {
      var i;
      !s.imageUploadEnabled || v(((i = l.dataTransfer) == null ? void 0 : i.files) ?? []).length === 0 || (l.preventDefault(), l.dataTransfer && (l.dataTransfer.dropEffect = "copy"));
    }
    function E(l) {
      !s.imageUploadEnabled || m.value === 0 || (l.preventDefault(), m.value = Math.max(0, m.value - 1));
    }
    function _(l) {
      var i;
      !s.imageUploadEnabled || !((i = l.dataTransfer) != null && i.files.length) || v(l.dataTransfer.files).length !== 0 && (l.preventDefault(), m.value = 0, q(l.dataTransfer.files));
    }
    function Q(l) {
      const i = $.value;
      if (!i) return;
      const y = u.value, j = (y == null ? void 0 : y.value) || g.value, Z = Ke(j, i);
      s.selectedSkills.includes(l) || t("update:selected-skills", [...s.selectedSkills, l]), t("update:draft", Z.text), g.value = Z.text, $.value = null, de(() => {
        const X = u.value;
        X == null || X.focus(), X == null || X.setSelectionRange(Z.cursor, Z.cursor);
      });
    }
    function qe(l) {
      if (b.value) {
        if (l.key === "Escape") {
          l.preventDefault(), $.value = null;
          return;
        }
        if (l.key === "ArrowDown" || l.key === "ArrowUp") {
          l.preventDefault();
          const i = w.value.length;
          i && (p.value = (p.value + (l.key === "ArrowDown" ? 1 : -1) + i) % i);
          return;
        }
        if (l.key === "Enter" && !l.ctrlKey && !l.metaKey && w.value.length) {
          l.preventDefault(), Q(w.value[Math.min(p.value, w.value.length - 1)].value);
          return;
        }
      }
      l.key !== "Enter" || l.isComposing || !l.ctrlKey && !l.metaKey || (l.preventDefault(), me());
    }
    function me() {
      K.value && t("send");
    }
    return (l, i) => (r(), d("form", {
      class: "cody-composer",
      "data-variant": e.variant,
      "data-cody-component": "composer-surface",
      onSubmit: re(me, ["prevent"])
    }, [
      c("div", {
        class: "cody-composer-shell",
        "data-image-drag-active": oe.value,
        onDragenter: T,
        onDragover: R,
        onDragleave: E,
        onDrop: _
      }, [
        c("input", {
          ref_key: "imageInputRef",
          ref: k,
          class: "cody-composer-image-input",
          type: "file",
          accept: "image/png,image/jpeg,image/webp,image/gif",
          multiple: "",
          tabindex: "-1",
          "aria-hidden": "true",
          onChange: z
        }, null, 544),
        e.images.length ? (r(), d("ul", Wt, [
          (r(!0), d(I, null, P(e.images, (y) => (r(), d("li", {
            key: y.id,
            class: "cody-composer-image"
          }, [
            c("img", {
              src: y.url,
              alt: y.name || "待发送图片"
            }, null, 8, Ht),
            c("button", {
              type: "button",
              disabled: e.disabled,
              "aria-label": `移除图片 ${y.name || "附件"}`,
              onClick: (j) => t("remove-image", y.id)
            }, "×", 8, Nt)
          ]))), 128))
        ])) : M("", !0),
        e.selectedSkills.length ? (r(), d("div", Kt, [
          (r(!0), d(I, null, P(e.selectedSkills, (y) => (r(), d("span", {
            key: y,
            class: "cody-composer-chip"
          }, [
            ue(" $" + A(ee(e.skills, y)) + " ", 1),
            c("button", {
              type: "button",
              disabled: e.disabled,
              "aria-label": `移除 Skill ${ee(e.skills, y)}`,
              onClick: (j) => ne(y)
            }, "×", 8, Gt)
          ]))), 128))
        ])) : M("", !0),
        c("textarea", {
          ref_key: "draftInputRef",
          ref: u,
          value: e.draft,
          rows: "1",
          disabled: e.disabled,
          placeholder: e.placeholder,
          "aria-expanded": b.value,
          "aria-controls": b.value ? S : void 0,
          "aria-activedescendant": N.value,
          "aria-autocomplete": "list",
          onInput: C,
          onClick: L,
          onKeyup: L,
          onBlur: h,
          onPaste: D,
          onKeydown: qe
        }, null, 40, Qt),
        b.value ? (r(), d("div", {
          key: 2,
          id: S,
          class: "cody-composer-skill-menu",
          role: "listbox",
          "aria-label": "可引用 Skills"
        }, [
          w.value.length === 0 ? (r(), d("p", Zt, "没有匹配的 Skill")) : (r(!0), d(I, { key: 1 }, P(w.value, (y, j) => (r(), d("button", {
            id: ae(j),
            key: y.value,
            class: ce(["cody-composer-skill-option", { active: j === p.value }]),
            type: "button",
            role: "option",
            "aria-selected": j === p.value,
            onMouseenter: (Z) => p.value = j,
            onMousedown: re((Z) => Q(y.value), ["prevent"])
          }, [
            c("span", Yt, "$" + A(y.label), 1),
            y.description ? (r(), d("span", Jt, A(y.description), 1)) : M("", !0)
          ], 42, Xt))), 128))
        ])) : M("", !0),
        c("div", eo, [
          c("div", to, [
            e.imageUploadEnabled ? (r(), d("button", {
              key: 0,
              class: "cody-composer-image-picker",
              type: "button",
              disabled: e.disabled || e.isUploadingImages,
              "aria-label": "添加图片",
              title: "添加图片（也可粘贴或拖拽）",
              onClick: x
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
            ])], 8, oo)) : M("", !0),
            te(l.$slots, "leading"),
            e.collaborationModes.length ? (r(), pe(V(o), {
              key: 1,
              label: "协作模式",
              "model-value": e.selectedCollaborationMode,
              options: e.collaborationModes,
              disabled: e.disabled || e.isRunning,
              "onUpdate:modelValue": i[0] || (i[0] = (y) => t("update:collaboration-mode", y))
            }, null, 8, ["model-value", "options", "disabled"])) : M("", !0),
            H(V(o), {
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
            }, null, 8, ["model-value", "options", "disabled"])) : M("", !0),
            H(V(o), {
              label: "推理强度",
              "model-value": e.selectedReasoning,
              options: e.reasoningOptions,
              disabled: e.disabled || e.isRunning,
              "onUpdate:modelValue": i[3] || (i[3] = (y) => t("update:reasoning", y))
            }, null, 8, ["model-value", "options", "disabled"]),
            H(V(o), {
              label: "权限",
              "model-value": e.selectedPermission,
              options: e.permissionOptions,
              disabled: e.disabled || e.isRunning,
              "onUpdate:modelValue": i[4] || (i[4] = (y) => t("update:permission", y))
            }, null, 8, ["model-value", "options", "disabled"]),
            te(l.$slots, "controls")
          ]),
          c("div", ao, [
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
            ])], 8, so)) : M("", !0),
            c("button", {
              class: "cody-composer-send",
              type: "submit",
              disabled: !K.value,
              "aria-label": G.value,
              title: G.value
            }, [...i[8] || (i[8] = [
              c("svg", {
                viewBox: "0 0 24 24",
                "aria-hidden": "true"
              }, [
                c("path", { d: "M12 19V5m0 0-6 6m6-6 6 6" })
              ], -1)
            ])], 8, no)
          ])
        ]),
        W.value ? (r(), d("p", lo, A(W.value), 1)) : M("", !0),
        e.imageError ? (r(), d("p", io, A(e.imageError), 1)) : e.imageUploadEnabled && e.isUploadingImages ? (r(), d("p", ro, "正在处理图片…")) : M("", !0)
      ], 40, Vt)
    ], 40, jt));
  }
});
function wo() {
  const e = Ie(ie());
  let a = null, o = null, s = 0;
  const t = () => {
    s += 1, o == null || o(), o = null, a == null || a.dispose(), a = null;
  }, u = async (w, b) => {
    t(), e.value = ie(w);
    const N = s, W = Qe(w, b);
    a = W, o = W.subscribe((K) => {
      a === W && s === N && (e.value = K);
    }), await W.start();
  }, k = async () => {
    await (a == null ? void 0 : a.refresh());
  }, g = async (w, b) => {
    if (!a) throw new Error("Conversation controller is not connected.");
    return a.submitUserMessage(w, b);
  }, $ = async (w, b) => {
    if (!a) throw new Error("Conversation controller is not connected.");
    return a.retryFailedUserMessage(w, b);
  }, p = (w) => a == null ? void 0 : a.discardFailedUserMessage(w), m = async () => {
    if (!a) throw new Error("Conversation controller is not connected.");
    await a.interrupt();
  }, n = (w = "") => {
    t(), e.value = ie(w);
  }, S = () => {
    t();
  };
  return Re() && Oe(S), {
    state: O(() => e.value),
    connect: u,
    submitUserMessage: g,
    retryFailedUserMessage: $,
    discardFailedUserMessage: p,
    interrupt: m,
    refresh: k,
    reset: n,
    dispose: S
  };
}
export {
  $o as CodyComposer,
  ho as CodyConversation,
  Ae as CodyImagePreviewDialog,
  he as CodyMarkdown,
  kt as CodyRequestCard,
  J as DEFAULT_CODY_MARKDOWN_LABELS,
  bo as conversationEntriesFromState,
  Le as questionFieldsFromParams,
  ke as renderCodyMarkdown,
  et as requestSummary,
  be as stabilizeStreamingMarkdown,
  wo as useConversationController
};
