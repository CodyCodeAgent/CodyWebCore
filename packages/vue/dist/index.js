import { defineComponent as V, computed as B, ref as H, watch as le, onMounted as ye, onBeforeUnmount as ke, openBlock as u, createElementBlock as m, Fragment as I, createElementVNode as k, nextTick as be, reactive as ve, toDisplayString as q, renderList as z, createCommentVNode as L, createTextVNode as _, normalizeClass as he, withDirectives as $e, withKeys as ie, vModelDynamic as we, renderSlot as U, createVNode as E, h as X, withModifiers as J, createBlock as ee, unref as F } from "vue";
import re from "dompurify";
import Se from "markdown-it";
import Ce from "markdown-it-footnote";
import xe from "markdown-it-task-lists";
const N = {
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
}, T = new Se({ breaks: !0, html: !1, linkify: !0, typographer: !1 });
T.use(xe, { enabled: !1, label: !0, labelAfter: !0 });
T.use(Ce);
function D(e, l) {
  return `<button type="button" class="markdown-tool-button" data-markdown-action="${e}" aria-label="${l}" title="${l}">${l}</button>`;
}
function de(e, l = "", o = N) {
  const d = l.toLowerCase();
  if (d === "mermaid" || d === "plantuml" || d === "puml") {
    const M = d === "mermaid" ? "mermaid" : "plantuml";
    return `<div class="markdown-diagram-shell" data-diagram-engine="${M}"><header class="markdown-diagram-toolbar"><span>${M}</span><span class="markdown-diagram-actions">${D("diagram-zoom-out", o.zoomOut)}${D("diagram-fit", o.fit)}${D("diagram-zoom-in", o.zoomIn)}${D("diagram-source", o.source)}${D("diagram-fullscreen", o.fullscreen)}${D("diagram-export-svg", "SVG")}${D("diagram-export-png", "PNG")}</span></header><div class="markdown-diagram-stage" role="img" aria-label="${o.diagramAria(M)}"><p class="markdown-diagram-status">${o.rendering(M)}</p></div><pre class="markdown-diagram-source" hidden><code>${T.utils.escapeHtml(e)}</code></pre></div>
`;
  }
  const i = e.replace(/\n$/u, "").split(`
`), r = i.length <= 2 && i.every((M) => M.length <= 96), S = i.length > 10, b = l || "text", y = [r ? "is-compact-code" : "", /^[A-Za-z0-9_-]+$/u.test(l) ? `language-${l}` : ""].filter(Boolean).join(" "), a = y ? ` class="${y}"` : "", t = [r ? "is-compact" : "", S ? "is-collapsible is-collapsed" : ""].filter(Boolean).join(" "), s = S ? `${b} · ${o.lineCount(i.length)}` : b, n = S ? `<button type="button" class="markdown-tool-button markdown-code-collapse" data-markdown-action="toggle-code" aria-label="${o.collapseCode}" title="${o.collapseCode}" aria-expanded="false">${o.collapseCode}</button>` : "", p = S ? `<div class="markdown-code-expand"><button type="button" data-markdown-action="toggle-code" aria-expanded="false">${o.expandCode(i.length)}</button></div>` : "";
  return `<div class="markdown-code-host"><div class="markdown-code-shell${t ? ` ${t}` : ""}" data-language="${b}" data-code-lines="${String(i.length)}"><header class="markdown-code-toolbar"><span>${s}</span><span class="markdown-code-actions">${n}${D("wrap-code", o.wrap)}${D("copy-code", o.copy)}${D("save-code", o.save)}</span></header><pre class="markdown-code-block${r ? " is-compact" : ""}"><code${a}>${T.utils.escapeHtml(e)}</code></pre>${p}</div></div>
`;
}
T.renderer.rules.fence = (e, l, o, d) => {
  const i = e[l];
  return de(i.content, i.info.trim().split(/\s+/u)[0] ?? "", d.labels);
};
T.renderer.rules.code_block = (e, l, o, d) => de(e[l].content, "", d.labels);
T.renderer.rules.table_open = (e, l, o, d) => {
  const i = d.labels ?? N;
  return `<section class="markdown-table-shell" role="region" aria-label="${i.dataTable}" tabindex="0"><header class="markdown-table-toolbar">${D("copy-table", i.copyCsv)}</header><div class="markdown-table-scroll"><table>
`;
};
T.renderer.rules.table_close = () => `</table></div></section>
`;
const te = T.renderer.rules.code_inline;
T.renderer.rules.code_inline = (e, l, o, d, i) => {
  const r = e[l].content, S = r.match(/^(.+?\.[A-Za-z0-9_-]{1,12})(?::(\d+))?$/u);
  if (!S || /\s/u.test(r)) return te ? te(e, l, o, d, i) : i.renderToken(e, l, o);
  const b = T.utils.escapeHtml(S[1]), y = S[2] ?? "", a = d.labels ?? N;
  return `<button type="button" class="markdown-file-link" data-markdown-action="open-file" data-file-path="${b}" data-file-line="${y}" title="${a.openFile(b)}"><code>${T.utils.escapeHtml(r)}</code></button>`;
};
const oe = T.renderer.rules.link_open;
T.renderer.rules.link_open = (e, l, o, d, i) => {
  const r = e[l];
  return /^https?:\/\//u.test(r.attrGet("href") ?? "") && (r.attrSet("target", "_blank"), r.attrSet("rel", "noopener noreferrer")), oe ? oe(e, l, o, d, i) : i.renderToken(e, l, o);
};
function ne(e, l = N) {
  return re.sanitize(T.render(e, { labels: l }), {
    ADD_ATTR: ["target"],
    ADD_TAGS: ["table", "thead", "tbody", "tr", "th", "td", "h1", "h2", "h3", "h4", "h5", "h6"],
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed"]
  });
}
function se(e) {
  var l;
  return (((l = e.match(/^\s*```/gmu)) == null ? void 0 : l.length) ?? 0) % 2 === 1 ? `${e}

\`\`\`` : e;
}
const Ae = ["innerHTML"], qe = ["src"], ae = /* @__PURE__ */ V({
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
  setup(e, { emit: l }) {
    const o = e, d = l, i = B(() => o.labels ?? N), r = H(null), S = H(null), b = H(ne(se(o.text), i.value)), y = H(""), a = /* @__PURE__ */ new Set();
    let t = 0, s = 0;
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
    async function p(c) {
      window.clearTimeout(t), t = window.setTimeout(async () => {
        b.value = ne(se(c), i.value), await be(), M();
      }, o.renderDelay);
    }
    async function M() {
      var $, g, f, w, v, O;
      for (const C of Array.from((($ = r.value) == null ? void 0 : $.querySelectorAll("td")) ?? []))
        /^-?[\d,.]+%?$/u.test(((g = C.textContent) == null ? void 0 : g.trim()) ?? "") && (C.dataset.numeric = "true");
      for (const C of Array.from(((f = r.value) == null ? void 0 : f.querySelectorAll("img")) ?? []))
        C.addEventListener("error", () => {
          C.alt = C.alt || "图片加载失败", C.classList.add("is-load-error");
        }, { once: !0 });
      W();
      for (const [C, x] of Array.from(((w = r.value) == null ? void 0 : w.querySelectorAll(".markdown-code-shell")) ?? []).entries()) {
        x.dataset.codeIndex = String(C), x.classList.contains("is-collapsible") && a.has(C) && x.classList.remove("is-collapsed");
        for (const A of Array.from(x.querySelectorAll('[data-markdown-action="toggle-code"]')))
          A.setAttribute("aria-expanded", String(!x.classList.contains("is-collapsed")));
        const R = x.querySelector("pre"), j = x.querySelector('[data-markdown-action="wrap-code"]');
        R && j && (j.hidden = R.scrollWidth <= R.clientWidth + 2, j.setAttribute("aria-pressed", String(x.classList.contains("is-wrapped"))));
      }
      await ue();
      const c = Array.from(((v = r.value) == null ? void 0 : v.querySelectorAll('pre code[class*="language-"]')) ?? []);
      if (c.length === 0) return;
      const h = (await import("highlight.js/lib/core")).default;
      for (const C of c) {
        const x = ((O = Array.from(C.classList).find((A) => A.startsWith("language-"))) == null ? void 0 : O.slice(9)) ?? "", R = n[x];
        if (!R || C.dataset.highlighted === "yes") continue;
        const j = await R();
        h.getLanguage(x) || h.registerLanguage(x, j.default), C.innerHTML = h.highlight(C.textContent ?? "", { language: x }).value, C.dataset.highlighted = "yes";
      }
    }
    function W() {
      var h;
      if (!o.resolveAssetUrl) return;
      const c = /\.(?:svg|png|jpe?g|gif|webp)(?:[?#].*)?$/iu;
      for (const $ of Array.from(((h = r.value) == null ? void 0 : h.querySelectorAll("a[href]")) ?? [])) {
        const g = $.getAttribute("href") ?? "";
        if (!c.test(g) || /^(?:data|blob):/iu.test(g)) continue;
        const f = o.resolveAssetUrl(g);
        f && ($.href = f, $.target = "_blank", $.rel = "noopener noreferrer");
      }
    }
    async function ue() {
      var h, $, g, f;
      const c = Array.from(((h = r.value) == null ? void 0 : h.querySelectorAll(".markdown-diagram-shell:not([data-rendered])")) ?? []);
      for (const w of c) {
        w.dataset.rendered = "loading";
        const v = w.dataset.diagramEngine === "plantuml" ? "plantuml" : "mermaid", O = (($ = w.querySelector("code")) == null ? void 0 : $.textContent) ?? "", C = w.querySelector(".markdown-diagram-stage");
        if (C)
          try {
            let x = await ((g = o.renderDiagram) == null ? void 0 : g.call(o, { engine: v, source: O, dark: o.dark }));
            if (!x && v === "mermaid") {
              const { default: R } = await import("mermaid");
              R.initialize({ startOnLoad: !1, securityLevel: "strict", theme: o.dark ? "dark" : "default", htmlLabels: !1, flowchart: { htmlLabels: !1, useMaxWidth: !1 } }), x = (await R.render(`cody-diagram-${String(++s)}`, O)).svg;
            }
            if (!x) throw new Error(v === "plantuml" ? "当前环境未配置 PlantUML 渲染器" : "图表渲染失败");
            C.innerHTML = me(x), pe(C), w.dataset.rendered = "yes", w.style.setProperty("--diagram-scale", "1");
          } catch (x) {
            C.textContent = x instanceof Error ? x.message : "图表渲染失败", C.classList.add("markdown-diagram-error"), (f = w.querySelector(".markdown-diagram-source")) == null || f.removeAttribute("hidden"), w.dataset.rendered = "error";
          }
      }
    }
    function me(c) {
      const h = re.sanitize(c, { USE_PROFILES: { svg: !0, svgFilters: !0, html: !0 }, ADD_TAGS: ["foreignObject"], ADD_ATTR: ["xmlns"] }), $ = h.trimStart().startsWith("<svg") ? h : `<svg xmlns="http://www.w3.org/2000/svg">${h}</svg>`, g = new DOMParser().parseFromString($, "image/svg+xml");
      if (g.querySelector("parsererror")) return "";
      for (const f of g.querySelectorAll("*")) for (const w of Array.from(f.attributes)) /^on/iu.test(w.name) && f.removeAttribute(w.name);
      return g.querySelectorAll("script").forEach((f) => f.remove()), new XMLSerializer().serializeToString(g.documentElement);
    }
    function pe(c) {
      if (c.dataset.panReady === "true") return;
      c.dataset.panReady = "true";
      let h = 0, $ = 0, g = 0, f = 0;
      c.addEventListener("pointerdown", (v) => {
        v.button === 0 && (h = v.clientX, $ = v.clientY, g = c.scrollLeft, f = c.scrollTop, c.setPointerCapture(v.pointerId), c.classList.add("is-panning"));
      }), c.addEventListener("pointermove", (v) => {
        c.hasPointerCapture(v.pointerId) && (c.scrollLeft = g - (v.clientX - h), c.scrollTop = f - (v.clientY - $));
      });
      const w = (v) => {
        c.hasPointerCapture(v.pointerId) && c.releasePointerCapture(v.pointerId), c.classList.remove("is-panning");
      };
      c.addEventListener("pointerup", w), c.addEventListener("pointercancel", w);
    }
    function Q(c, h = 0) {
      const $ = Number(c.style.getPropertyValue("--diagram-scale") || "1");
      c.style.setProperty("--diagram-scale", String(h === 0 ? 1 : Math.min(2.5, Math.max(0.4, $ + h))));
    }
    function K(c, h) {
      const $ = document.createElement("a");
      $.href = URL.createObjectURL(c), $.download = h, $.click(), URL.revokeObjectURL($.href);
    }
    async function Y(c, h) {
      const $ = h.textContent;
      try {
        await navigator.clipboard.writeText(c), h.textContent = "已复制";
      } catch {
        const g = document.createElement("textarea");
        g.value = c, g.style.position = "fixed", g.style.opacity = "0", document.body.appendChild(g), g.select();
        const f = document.execCommand("copy");
        g.remove(), h.textContent = f ? "已复制" : "复制失败";
      }
      window.setTimeout(() => {
        h.textContent = $;
      }, 1200);
    }
    function fe(c) {
      return Array.from((c == null ? void 0 : c.rows) ?? []).map((h) => Array.from(h.cells).map(($) => {
        var g;
        return `"${((g = $.textContent) == null ? void 0 : g.trim().replace(/"/gu, '""')) ?? ""}"`;
      }).join(",")).join(`
`);
    }
    function ge(c) {
      var O, C, x, R, j;
      const h = c.target, $ = h.closest("img");
      if ($) {
        y.value = $.currentSrc || $.src, (O = S.value) == null || O.showModal();
        return;
      }
      const g = h.closest("[data-markdown-action]");
      if (!g) return;
      const f = g.closest(".markdown-code-shell, .markdown-table-shell"), w = g.dataset.markdownAction;
      if (w === "copy-code" && Y(((C = f == null ? void 0 : f.querySelector("code")) == null ? void 0 : C.textContent) ?? "", g), w === "wrap-code") {
        const A = (f == null ? void 0 : f.classList.toggle("is-wrapped")) ?? !1;
        g.textContent = A && i.value.scroll || i.value.wrap, g.setAttribute("aria-pressed", String(A));
      }
      if (w === "save-code" && K(new Blob([((x = f == null ? void 0 : f.querySelector("code")) == null ? void 0 : x.textContent) ?? ""], { type: "text/plain" }), `snippet.${(f == null ? void 0 : f.dataset.language) || "txt"}`), w === "toggle-code" && (f != null && f.classList.contains("is-collapsible"))) {
        const A = Number(f.dataset.codeIndex ?? -1), P = !f.classList.toggle("is-collapsed");
        A >= 0 && (P ? a.add(A) : a.delete(A));
        for (const G of Array.from(f.querySelectorAll('[data-markdown-action="toggle-code"]'))) G.setAttribute("aria-expanded", String(P));
      }
      if (w === "copy-table" && Y(fe((f == null ? void 0 : f.querySelector("table")) ?? null), g), w === "open-file") {
        const A = g.dataset.filePath ?? "", P = ((R = o.cwd) == null ? void 0 : R.replace(/\/$/u, "")) ?? "", G = A.startsWith("/") && P && A.startsWith(`${P}/`) ? A.slice(P.length + 1) : A.replace(/^\.\//u, "");
        d("openFile", { path: G, line: Number(g.dataset.fileLine || 0) || 1 });
      }
      const v = g.closest(".markdown-diagram-shell");
      if (v && w === "diagram-zoom-in" && Q(v, 0.2), v && w === "diagram-zoom-out" && Q(v, -0.2), v && w === "diagram-fit" && Q(v), v && w === "diagram-source") {
        const A = v.querySelector(".markdown-diagram-source");
        A && (A.hidden = !A.hidden);
      }
      if (v && w === "diagram-fullscreen" && ((j = v.requestFullscreen) == null || j.call(v)), v && w === "diagram-export-svg") {
        const A = v.querySelector("svg");
        A && K(new Blob([new XMLSerializer().serializeToString(A)], { type: "image/svg+xml" }), "diagram.svg");
      }
    }
    function Z() {
      var c;
      (c = S.value) == null || c.close();
    }
    return le(() => [o.text, o.labels], ([c]) => {
      p(c);
    }, { deep: !0 }), ye(() => {
      M();
    }), ke(() => window.clearTimeout(t)), (c, h) => (u(), m(I, null, [
      k("div", {
        ref_key: "rootRef",
        ref: r,
        class: "cody-markdown cody-markdown-renderer",
        innerHTML: b.value,
        onClick: ge
      }, null, 8, Ae),
      k("dialog", {
        ref_key: "imageDialogRef",
        ref: S,
        class: "cody-markdown-image-dialog",
        onClick: Z
      }, [
        k("button", {
          type: "button",
          "aria-label": "关闭图片预览",
          onClick: Z
        }, "×"),
        k("img", {
          src: y.value,
          alt: "Markdown 图片预览"
        }, null, 8, qe)
      ], 512)
    ], 64));
  }
});
function Le(e) {
  if (!Number.isFinite(e) || e <= 0)
    return "<1s";
  const l = Math.max(1, Math.round(e / 1e3)), o = Math.floor(l / 3600), d = Math.floor(l % 3600 / 60), i = l % 60, r = [];
  return o > 0 && r.push(`${String(o)}h`), (d > 0 || o > 0) && r.push(`${String(d)}m`), r.push(`${String(i > 0 || r.length === 0 ? i : 0)}s`), r.join(" ");
}
function ce(e) {
  if (!e || typeof e != "object") return [];
  const l = e;
  return (Array.isArray(l.questions) ? l.questions : []).flatMap((d, i) => {
    if (!d || typeof d != "object") return [];
    const r = d, S = typeof r.question == "string" ? r.question.trim() : "";
    if (!S) return [];
    const b = Array.isArray(r.options) ? r.options : [];
    return [{
      id: typeof r.id == "string" && r.id.trim() ? r.id.trim() : `question-${String(i + 1)}`,
      header: typeof r.header == "string" ? r.header.trim() : "",
      question: S,
      isOther: r.isOther === !0,
      isSecret: r.isSecret === !0,
      options: b.flatMap((y) => {
        if (!y || typeof y != "object") return [];
        const a = y, t = typeof a.label == "string" ? a.label.trim() : "";
        return t ? [{ label: t, description: typeof a.description == "string" ? a.description.trim() : "" }] : [];
      })
    }];
  });
}
function Me(e) {
  var d;
  if (!e || typeof e != "object") return "Codex 请求执行一项受保护操作。";
  const l = e, o = l.reason ?? l.question ?? l.command;
  return typeof o == "string" && o.trim() ? o : ((d = ce(e)[0]) == null ? void 0 : d.question) ?? "Codex 请求执行一项受保护操作。";
}
function Ct(e) {
  var b, y, a;
  const l = [], o = /* @__PURE__ */ new Set(), d = new Map(e.messages.map((t) => [t.id, t])), i = new Map(e.timeline.map((t) => [t.id, t])), r = (t) => {
    if (t.kind === "reasoning") {
      l.push({ id: t.id, kind: "reasoning", text: t.text }), o.add(t.id);
      return;
    }
    if (!t.tool.summary && t.tool.details.length === 0 && !t.tool.output && t.tool.kind !== "fileChange") return;
    if (t.tool.kind !== "fileChange") {
      l.push({ id: t.id, kind: "tool", tool: t.tool }), o.add(t.id);
      return;
    }
    const s = `file-group:${t.turnId ?? t.id}`, n = l.at(-1);
    if (!n || n.kind !== "tool" || n.id !== s) {
      const W = { id: s, kind: "tool", tool: { ...t.tool } };
      l.push(W), o.add(t.id);
      return;
    }
    const p = [.../* @__PURE__ */ new Set([...n.tool.details, ...t.tool.details])], M = [n.tool.output, t.tool.output].filter(Boolean).join(`

`);
    n.tool = {
      ...n.tool,
      status: /fail|error|cancel|reject/iu.test(`${n.tool.status} ${t.tool.status}`) ? "failed" : t.tool.status,
      title: p.length > 1 ? `文件变更 · ${String(p.length)} 个文件` : "文件变更",
      summary: p.length ? `${String(p.length)} 个文件已更新` : t.tool.summary,
      details: p,
      ...M ? { output: M } : {}
    }, o.add(t.id);
  };
  for (const t of e.presentation ?? [])
    if (t.kind === "message") {
      const s = d.get(t.id);
      s && (l.push({ id: s.id, kind: "message", message: s }), o.add(s.id));
    } else if (t.kind === "timeline") {
      const s = i.get(t.id);
      s && r(s);
    } else if (t.kind === "plan")
      (b = e.plan) != null && b.text && (!t.turnId || t.turnId === e.plan.turnId) && (l.push({ id: t.id, kind: "plan", text: e.plan.text }), o.add(t.id));
    else if (t.kind === "request") {
      const s = e.pendingRequests.find((n) => `request:${n.id}` === t.id);
      s && (l.push({ id: t.id, kind: "request", request: s }), o.add(t.id));
    } else if (t.kind === "failure") {
      const s = t.turnId ? e.turns[t.turnId] : void 0;
      s != null && s.error && (l.push({ id: t.id, kind: "failure", text: s.error }), o.add(t.id));
    } else if (t.kind === "worked") {
      const s = t.turnId ? e.turns[t.turnId] : void 0;
      if (s != null && s.completedAtIso) {
        const n = s.startedAtIso ? Date.parse(s.completedAtIso) - Date.parse(s.startedAtIso) : 0;
        l.push({ id: t.id, kind: "worked", label: `Worked for ${Le(n)}` }), o.add(t.id);
      }
    }
  for (const t of e.messages) o.has(t.id) || l.push({ id: t.id, kind: "message", message: t });
  for (const t of e.timeline) o.has(t.id) || r(t);
  const S = `plan:${((y = e.plan) == null ? void 0 : y.turnId) || "current"}`;
  (a = e.plan) != null && a.text && !o.has(S) && l.push({ id: S, kind: "plan", text: e.plan.text });
  for (const t of e.pendingRequests) o.has(`request:${t.id}`) || l.push({ id: `request:${t.id}`, kind: "request", request: t });
  for (const t of Object.values(e.turns))
    t.lifecycle === "failed" && t.error && !o.has(`failure:${t.id}`) && l.push({ id: `failure:${t.id}`, kind: "failure", text: t.error });
  return l;
}
const Te = ["data-kind"], Re = { class: "cody-request-heading" }, Ie = { key: 0 }, De = {
  key: 0,
  class: "cody-question-options"
}, Oe = ["onClick"], je = { key: 0 }, ze = ["onUpdate:modelValue", "type", "placeholder"], Be = { class: "cody-request-actions" }, Pe = ["disabled"], Ee = {
  key: 0,
  class: "cody-request-actions"
}, Fe = /* @__PURE__ */ V({
  __name: "CodyRequestCard",
  props: {
    request: {}
  },
  emits: ["resolveApproval", "resolveQuestion"],
  setup(e, { emit: l }) {
    const o = e, d = l, i = ve({}), r = B(() => ce(o.request.params)), S = B(() => Me(o.request.params)), b = B(() => r.value.length > 0 && r.value.every((a) => {
      var t;
      return !!((t = i[a.id]) != null && t.trim());
    }));
    le(() => o.request.id, () => {
      for (const a of Object.keys(i)) delete i[a];
    });
    function y() {
      b.value && d("resolveQuestion", o.request.id, Object.fromEntries(r.value.map((a) => [a.id, { answers: [i[a.id].trim()] }])));
    }
    return (a, t) => (u(), m("article", {
      class: "cody-request-card",
      "data-kind": e.request.kind
    }, [
      k("div", Re, [
        k("strong", null, q(e.request.kind === "approval" ? "需要你的确认" : "Codex 需要补充信息"), 1),
        t[2] || (t[2] = k("small", null, "Agent 已暂停等待", -1))
      ]),
      e.request.kind === "question" && r.value.length ? (u(), m(I, { key: 0 }, [
        (u(!0), m(I, null, z(r.value, (s) => (u(), m("fieldset", {
          key: s.id,
          class: "cody-question-field"
        }, [
          k("legend", null, [
            s.header ? (u(), m("span", Ie, q(s.header), 1)) : L("", !0),
            _(q(s.question), 1)
          ]),
          s.options.length ? (u(), m("div", De, [
            (u(!0), m(I, null, z(s.options, (n) => (u(), m("button", {
              key: n.label,
              type: "button",
              class: he({ selected: i[s.id] === n.label }),
              onClick: (p) => i[s.id] = n.label
            }, [
              k("strong", null, q(n.label), 1),
              n.description ? (u(), m("small", je, q(n.description), 1)) : L("", !0)
            ], 10, Oe))), 128))
          ])) : L("", !0),
          s.options.length === 0 || s.isOther ? $e((u(), m("input", {
            key: 1,
            "onUpdate:modelValue": (n) => i[s.id] = n,
            type: s.isSecret ? "password" : "text",
            placeholder: s.options.length ? "其他回答…" : "输入回答…",
            onKeyup: ie(y, ["enter"])
          }, null, 40, ze)), [
            [we, i[s.id]]
          ]) : L("", !0)
        ]))), 128)),
        k("div", Be, [
          k("button", {
            type: "button",
            disabled: !b.value,
            onClick: y
          }, "提交回答", 8, Pe)
        ])
      ], 64)) : (u(), m(I, { key: 1 }, [
        k("p", null, q(S.value), 1),
        e.request.kind === "approval" ? (u(), m("div", Ee, [
          k("button", {
            type: "button",
            onClick: t[0] || (t[0] = (s) => d("resolveApproval", e.request.id, "accept"))
          }, "允许一次"),
          k("button", {
            type: "button",
            "data-tone": "danger",
            onClick: t[1] || (t[1] = (s) => d("resolveApproval", e.request.id, "decline"))
          }, "拒绝")
        ])) : L("", !0)
      ], 64))
    ], 8, Te));
  }
}), Ue = ["data-variant"], Ve = {
  key: 0,
  class: "cody-conversation-loading",
  role: "status"
}, Ne = {
  key: 1,
  class: "cody-conversation-empty"
}, He = {
  key: 0,
  class: "cody-worked-divider"
}, We = ["data-role"], Qe = ["data-role"], Ge = { class: "cody-message-stack" }, Xe = { class: "cody-message-label" }, _e = {
  key: 0,
  class: "cody-message-skills"
}, Ke = {
  key: 1,
  class: "cody-message-body"
}, Ye = {
  key: 2,
  class: "cody-message-images"
}, Ze = ["src"], Je = ["onClick"], et = ["data-tone", "open"], tt = { key: 0 }, ot = { key: 1 }, nt = {
  key: 3,
  class: "cody-reasoning-card"
}, st = {
  key: 4,
  class: "cody-plan-card",
  open: ""
}, at = {
  key: 6,
  class: "cody-failure-card"
}, xt = /* @__PURE__ */ V({
  __name: "CodyConversation",
  props: {
    entries: {},
    loading: { type: Boolean },
    variant: { default: "standalone" }
  },
  emits: ["copy", "openFile", "resolveApproval", "resolveQuestion"],
  setup(e, { emit: l }) {
    const o = l;
    function d(b) {
      return /fail|error|cancel|reject/iu.test(b) ? "danger" : /complete|success|done|approved/iu.test(b) ? "success" : /run|start|pending|wait/iu.test(b) ? "running" : "neutral";
    }
    function i(b) {
      return b.length > 12e3 ? `${b.slice(0, 12e3)}
…输出已截断` : b;
    }
    function r(b, y) {
      o("resolveApproval", b, y);
    }
    function S(b, y) {
      o("resolveQuestion", b, y);
    }
    return (b, y) => (u(), m("section", {
      class: "cody-conversation",
      "data-variant": e.variant,
      "data-cody-component": "conversation-surface"
    }, [
      e.loading ? (u(), m("div", Ve, "正在同步对话…")) : e.entries.length === 0 ? (u(), m("div", Ne, [
        U(b.$slots, "empty", {}, () => [
          y[2] || (y[2] = _("开始这个需求的开发", -1))
        ])
      ])) : (u(!0), m(I, { key: 2 }, z(e.entries, (a) => {
        var t, s;
        return u(), m(I, {
          key: a.id
        }, [
          a.kind === "worked" ? (u(), m("div", He, [
            k("span", null, q(a.label), 1)
          ])) : a.kind === "message" ? (u(), m("article", {
            key: 1,
            class: "cody-message",
            "data-role": a.message.role
          }, [
            k("div", {
              class: "cody-message-identity",
              "data-role": a.message.role
            }, q(a.message.role === "user" ? "你" : "CW"), 9, Qe),
            k("div", Ge, [
              k("div", Xe, q(a.message.role === "user" ? "你" : a.message.role === "assistant" ? "Codex Agent" : "系统"), 1),
              (t = a.message.skills) != null && t.length ? (u(), m("ul", _e, [
                (u(!0), m(I, null, z(a.message.skills, (n) => (u(), m("li", {
                  key: `${n.name}:${n.path}`
                }, "$" + q(n.displayName || n.name), 1))), 128))
              ])) : L("", !0),
              a.message.text ? (u(), m("div", Ke, [
                U(b.$slots, "markdown", {
                  message: a.message
                }, () => [
                  E(ae, {
                    text: a.message.text,
                    onOpenFile: y[0] || (y[0] = (n) => o("openFile", n))
                  }, null, 8, ["text"])
                ])
              ])) : L("", !0),
              (s = a.message.images) != null && s.length ? (u(), m("div", Ye, [
                (u(!0), m(I, null, z(a.message.images, (n) => (u(), m("img", {
                  key: n,
                  src: n,
                  alt: "对话图片",
                  loading: "lazy"
                }, null, 8, Ze))), 128))
              ])) : L("", !0),
              a.message.text ? (u(), m("button", {
                key: 3,
                class: "cody-copy-button",
                type: "button",
                onClick: (n) => o("copy", a.message.text)
              }, "复制", 8, Je)) : L("", !0)
            ])
          ], 8, We)) : a.kind === "tool" ? (u(), m("details", {
            key: 2,
            class: "cody-tool-card",
            "data-tone": d(a.tool.status),
            open: d(a.tool.status) === "running"
          }, [
            k("summary", null, [
              y[3] || (y[3] = k("span", null, "⌁", -1)),
              k("strong", null, q(a.tool.title), 1),
              k("small", null, q(a.tool.status), 1)
            ]),
            k("p", null, q(a.tool.summary), 1),
            a.tool.details.length ? (u(), m("ul", tt, [
              (u(!0), m(I, null, z(a.tool.details, (n) => (u(), m("li", { key: n }, q(n), 1))), 128))
            ])) : L("", !0),
            a.tool.output ? (u(), m("pre", ot, q(i(a.tool.output)), 1)) : L("", !0)
          ], 8, et)) : a.kind === "reasoning" ? (u(), m("details", nt, [
            k("summary", null, "✦ " + q(a.title || "推理过程"), 1),
            k("pre", null, q(a.text), 1)
          ])) : a.kind === "plan" ? (u(), m("details", st, [
            y[4] || (y[4] = k("summary", null, "计划", -1)),
            E(ae, {
              text: a.text,
              onOpenFile: y[1] || (y[1] = (n) => o("openFile", n))
            }, null, 8, ["text"])
          ])) : a.kind === "request" ? U(b.$slots, "request", {
            request: a.request
          }, () => [
            E(Fe, {
              request: a.request,
              onResolveApproval: r,
              onResolveQuestion: S
            }, null, 8, ["request"])
          ], void 0, 5) : a.kind === "failure" ? (u(), m("details", at, [
            y[5] || (y[5] = k("summary", null, "本次回复失败", -1)),
            k("p", null, q(a.text), 1)
          ])) : L("", !0)
        ], 64);
      }), 128))
    ], 8, Ue));
  }
}), lt = ["data-variant"], it = { class: "cody-composer-shell" }, rt = {
  key: 0,
  class: "cody-composer-selected",
  "aria-label": "Selected skills"
}, dt = ["disabled", "aria-label", "onClick"], ct = ["value", "disabled", "placeholder"], ut = { class: "cody-composer-controls" }, mt = {
  key: 0,
  class: "cody-composer-compact-control cody-composer-skill-control",
  title: "为本轮显式选择 Skill"
}, pt = ["disabled"], ft = ["value"], gt = { class: "cody-composer-actions" }, yt = ["disabled"], kt = ["disabled", "aria-label"], bt = {
  key: 1,
  class: "cody-composer-policy"
}, At = /* @__PURE__ */ V({
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
  setup(e, { emit: l }) {
    const o = V({
      name: "CodyComposerSelect",
      props: { label: { type: String, required: !0 }, modelValue: { type: String, required: !0 }, options: { type: Array, required: !0 }, disabled: Boolean },
      emits: ["update:modelValue"],
      setup(s, { emit: n }) {
        return () => X("label", { class: "cody-composer-compact-control", title: s.label }, [
          X("select", { value: s.modelValue, disabled: s.disabled, "aria-label": s.label, onChange: (p) => n("update:modelValue", p.target.value) }, s.options.map((p) => X("option", { value: p.value }, p.label)))
        ]);
      }
    }), d = e, i = l, r = B(() => d.skills.filter((s) => !d.selectedSkills.includes(s.value))), S = B(() => {
      var s;
      return ((s = d.permissionOptions.find((n) => n.value === d.selectedPermission)) == null ? void 0 : s.description) ?? "";
    }), b = B(() => d.isRunning && d.selectedSubmitMode === "guide" ? "发送引导" : d.isRunning ? "加入队列" : "发送");
    function y(s, n) {
      var p;
      return ((p = s.find((M) => M.value === n)) == null ? void 0 : p.label) ?? n;
    }
    function a(s) {
      s && !d.selectedSkills.includes(s) && i("update:selected-skills", [...d.selectedSkills, s]);
    }
    function t(s) {
      i("update:selected-skills", d.selectedSkills.filter((n) => n !== s));
    }
    return (s, n) => (u(), m("form", {
      class: "cody-composer",
      "data-variant": e.variant,
      "data-cody-component": "composer-surface",
      onSubmit: n[9] || (n[9] = J((p) => i("send"), ["prevent"]))
    }, [
      k("div", it, [
        e.selectedSkills.length ? (u(), m("div", rt, [
          (u(!0), m(I, null, z(e.selectedSkills, (p) => (u(), m("span", {
            key: p,
            class: "cody-composer-chip"
          }, [
            _(" $" + q(y(e.skills, p)) + " ", 1),
            k("button", {
              type: "button",
              disabled: e.disabled,
              "aria-label": `移除 Skill ${y(e.skills, p)}`,
              onClick: (M) => t(p)
            }, "×", 8, dt)
          ]))), 128))
        ])) : L("", !0),
        k("textarea", {
          value: e.draft,
          rows: "1",
          disabled: e.disabled,
          placeholder: e.placeholder,
          onInput: n[0] || (n[0] = (p) => i("update:draft", p.target.value)),
          onKeydown: n[1] || (n[1] = ie(J((p) => i("send"), ["exact", "prevent"]), ["enter"]))
        }, null, 40, ct),
        k("div", ut, [
          U(s.$slots, "leading"),
          e.skills.length ? (u(), m("label", mt, [
            n[11] || (n[11] = k("span", {
              class: "cody-composer-icon",
              "aria-hidden": "true"
            }, "✦", -1)),
            k("select", {
              value: "",
              disabled: e.disabled,
              "aria-label": "添加 Skill",
              onChange: n[2] || (n[2] = (p) => a(p.target.value))
            }, [
              n[10] || (n[10] = k("option", { value: "" }, "Skills", -1)),
              (u(!0), m(I, null, z(r.value, (p) => (u(), m("option", {
                key: p.value,
                value: p.value
              }, "$" + q(p.label), 9, ft))), 128))
            ], 40, pt)
          ])) : L("", !0),
          e.collaborationModes.length ? (u(), ee(F(o), {
            key: 1,
            label: "协作模式",
            "model-value": e.selectedCollaborationMode,
            options: e.collaborationModes,
            disabled: e.disabled || e.isRunning,
            "onUpdate:modelValue": n[3] || (n[3] = (p) => i("update:collaboration-mode", p))
          }, null, 8, ["model-value", "options", "disabled"])) : L("", !0),
          E(F(o), {
            label: "提交策略",
            "model-value": e.selectedSubmitMode,
            options: e.submitModes,
            disabled: e.disabled,
            "onUpdate:modelValue": n[4] || (n[4] = (p) => i("update:submit-mode", p))
          }, null, 8, ["model-value", "options", "disabled"]),
          e.models.length ? (u(), ee(F(o), {
            key: 2,
            label: "模型",
            "model-value": e.selectedModel,
            options: e.models,
            disabled: e.disabled || e.isRunning,
            "onUpdate:modelValue": n[5] || (n[5] = (p) => i("update:model", p))
          }, null, 8, ["model-value", "options", "disabled"])) : L("", !0),
          E(F(o), {
            label: "推理强度",
            "model-value": e.selectedReasoning,
            options: e.reasoningOptions,
            disabled: e.disabled || e.isRunning,
            "onUpdate:modelValue": n[6] || (n[6] = (p) => i("update:reasoning", p))
          }, null, 8, ["model-value", "options", "disabled"]),
          E(F(o), {
            label: "权限",
            "model-value": e.selectedPermission,
            options: e.permissionOptions,
            disabled: e.disabled || e.isRunning,
            "onUpdate:modelValue": n[7] || (n[7] = (p) => i("update:permission", p))
          }, null, 8, ["model-value", "options", "disabled"]),
          U(s.$slots, "controls"),
          k("div", gt, [
            e.isRunning ? (u(), m("button", {
              key: 0,
              class: "cody-composer-stop",
              type: "button",
              disabled: e.disabled,
              onClick: n[8] || (n[8] = (p) => i("stop"))
            }, "停止", 8, yt)) : L("", !0),
            k("button", {
              class: "cody-composer-send",
              type: "submit",
              disabled: e.disabled || !e.draft.trim(),
              "aria-label": b.value
            }, "↑", 8, kt)
          ])
        ]),
        S.value ? (u(), m("p", bt, q(S.value), 1)) : L("", !0)
      ])
    ], 40, lt));
  }
});
export {
  At as CodyComposer,
  xt as CodyConversation,
  ae as CodyMarkdown,
  Fe as CodyRequestCard,
  N as DEFAULT_CODY_MARKDOWN_LABELS,
  Ct as conversationEntriesFromState,
  ce as questionFieldsFromParams,
  ne as renderCodyMarkdown,
  Me as requestSummary,
  se as stabilizeStreamingMarkdown
};
