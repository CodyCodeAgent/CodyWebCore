import { defineComponent as N, computed as U, ref as V, watch as de, onMounted as be, onBeforeUnmount as he, openBlock as c, createElementBlock as u, Fragment as I, createElementVNode as p, nextTick as $e, reactive as we, toDisplayString as x, renderList as E, createCommentVNode as L, createTextVNode as Y, normalizeClass as Se, withDirectives as Ce, withKeys as ce, vModelDynamic as xe, renderSlot as _, createVNode as F, unref as D, h as K, withModifiers as te, createBlock as oe } from "vue";
import ue from "dompurify";
import Ae from "markdown-it";
import qe from "markdown-it-footnote";
import Le from "markdown-it-task-lists";
function Te(e) {
  return /fail|error|cancel|reject/iu.test(e) ? "danger" : /complete|success|done|approved/iu.test(e) ? "success" : /run|start|pending|wait/iu.test(e) ? "running" : "neutral";
}
function Me(e, s = 80, o = 12e3) {
  const l = e.split(/\r?\n/u), i = l.slice(0, s).join(`
`).slice(0, o);
  return { text: i, truncated: i.length < e.length || l.length > s };
}
function Ie(e) {
  if (!Number.isFinite(e) || e <= 0)
    return "<1s";
  const s = Math.max(1, Math.round(e / 1e3)), o = Math.floor(s / 3600), l = Math.floor(s % 3600 / 60), i = s % 60, d = [];
  return o > 0 && d.push(`${String(o)}h`), (l > 0 || o > 0) && d.push(`${String(l)}m`), d.push(`${String(i > 0 || d.length === 0 ? i : 0)}s`), d.join(" ");
}
const me = 80, pe = 12e3;
function Oe(e) {
  const s = e.trim().toLowerCase();
  return s.includes("fail") || s.includes("error") || s.includes("decline") || s.includes("cancel");
}
function ne(e) {
  const s = Te(e);
  if (s === "running")
    return "working";
  if (s === "success" || s === "danger")
    return s;
  const o = e.trim().toLowerCase();
  return o ? Oe(o) ? "danger" : /running|progress|pending|started/u.test(o) ? "working" : /success|complete|done|applied/u.test(o) ? "success" : "neutral" : "neutral";
}
function Re(e, s = me, o = pe) {
  if (e.length > Math.max(Math.trunc(o), 1))
    return !0;
  const l = Math.max(Math.trunc(s), 1);
  return e.split(/\r\n|\r|\n/u).length > l;
}
function De(e, s = me, o = pe) {
  return Me(e, s, o).text;
}
function Pe(e) {
  return e ? "Show preview" : "Show full output";
}
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
}, M = new Ae({ breaks: !0, html: !1, linkify: !0, typographer: !1 });
M.use(Le, { enabled: !1, label: !0, labelAfter: !0 });
M.use(qe);
function R(e, s) {
  return `<button type="button" class="markdown-tool-button" data-markdown-action="${e}" aria-label="${s}" title="${s}">${s}</button>`;
}
function fe(e, s = "", o = W) {
  const l = s.toLowerCase();
  if (l === "mermaid" || l === "plantuml" || l === "puml") {
    const T = l === "mermaid" ? "mermaid" : "plantuml";
    return `<div class="markdown-diagram-shell" data-diagram-engine="${T}"><header class="markdown-diagram-toolbar"><span>${T}</span><span class="markdown-diagram-actions">${R("diagram-zoom-out", o.zoomOut)}${R("diagram-fit", o.fit)}${R("diagram-zoom-in", o.zoomIn)}${R("diagram-source", o.source)}${R("diagram-fullscreen", o.fullscreen)}${R("diagram-export-svg", "SVG")}${R("diagram-export-png", "PNG")}</span></header><div class="markdown-diagram-stage" role="img" aria-label="${o.diagramAria(T)}"><p class="markdown-diagram-status">${o.rendering(T)}</p></div><pre class="markdown-diagram-source" hidden><code>${M.utils.escapeHtml(e)}</code></pre></div>
`;
  }
  const i = e.replace(/\n$/u, "").split(`
`), d = i.length <= 2 && i.every((T) => T.length <= 96), S = i.length > 10, y = s || "text", g = [d ? "is-compact-code" : "", /^[A-Za-z0-9_-]+$/u.test(s) ? `language-${s}` : ""].filter(Boolean).join(" "), a = g ? ` class="${g}"` : "", w = [d ? "is-compact" : "", S ? "is-collapsible is-collapsed" : ""].filter(Boolean).join(" "), t = S ? `${y} · ${o.lineCount(i.length)}` : y, n = S ? `<button type="button" class="markdown-tool-button markdown-code-collapse" data-markdown-action="toggle-code" aria-label="${o.collapseCode}" title="${o.collapseCode}" aria-expanded="false">${o.collapseCode}</button>` : "", r = S ? `<div class="markdown-code-expand"><button type="button" data-markdown-action="toggle-code" aria-expanded="false">${o.expandCode(i.length)}</button></div>` : "";
  return `<div class="markdown-code-host"><div class="markdown-code-shell${w ? ` ${w}` : ""}" data-language="${y}" data-code-lines="${String(i.length)}"><header class="markdown-code-toolbar"><span>${t}</span><span class="markdown-code-actions">${n}${R("wrap-code", o.wrap)}${R("copy-code", o.copy)}${R("save-code", o.save)}</span></header><pre class="markdown-code-block${d ? " is-compact" : ""}"><code${a}>${M.utils.escapeHtml(e)}</code></pre>${r}</div></div>
`;
}
M.renderer.rules.fence = (e, s, o, l) => {
  const i = e[s];
  return fe(i.content, i.info.trim().split(/\s+/u)[0] ?? "", l.labels);
};
M.renderer.rules.code_block = (e, s, o, l) => fe(e[s].content, "", l.labels);
M.renderer.rules.table_open = (e, s, o, l) => {
  const i = l.labels ?? W;
  return `<section class="markdown-table-shell" role="region" aria-label="${i.dataTable}" tabindex="0"><header class="markdown-table-toolbar">${R("copy-table", i.copyCsv)}</header><div class="markdown-table-scroll"><table>
`;
};
M.renderer.rules.table_close = () => `</table></div></section>
`;
const se = M.renderer.rules.code_inline;
M.renderer.rules.code_inline = (e, s, o, l, i) => {
  const d = e[s].content, S = d.match(/^(.+?\.[A-Za-z0-9_-]{1,12})(?::(\d+))?$/u);
  if (!S || /\s/u.test(d)) return se ? se(e, s, o, l, i) : i.renderToken(e, s, o);
  const y = M.utils.escapeHtml(S[1]), g = S[2] ?? "", a = l.labels ?? W;
  return `<button type="button" class="markdown-file-link" data-markdown-action="open-file" data-file-path="${y}" data-file-line="${g}" title="${a.openFile(y)}"><code>${M.utils.escapeHtml(d)}</code></button>`;
};
const ae = M.renderer.rules.link_open;
M.renderer.rules.link_open = (e, s, o, l, i) => {
  const d = e[s];
  return /^https?:\/\//u.test(d.attrGet("href") ?? "") && (d.attrSet("target", "_blank"), d.attrSet("rel", "noopener noreferrer")), ae ? ae(e, s, o, l, i) : i.renderToken(e, s, o);
};
function ie(e, s = W) {
  return ue.sanitize(M.render(e, { labels: s }), {
    ADD_ATTR: ["target"],
    ADD_TAGS: ["table", "thead", "tbody", "tr", "th", "td", "h1", "h2", "h3", "h4", "h5", "h6"],
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed"]
  });
}
function le(e) {
  var s;
  return (((s = e.match(/^\s*```/gmu)) == null ? void 0 : s.length) ?? 0) % 2 === 1 ? `${e}

\`\`\`` : e;
}
const ze = ["innerHTML"], Ee = ["src"], re = /* @__PURE__ */ N({
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
    const o = e, l = s, i = U(() => o.labels ?? W), d = V(null), S = V(null), y = V(ie(le(o.text), i.value)), g = V(""), a = /* @__PURE__ */ new Set();
    let w = 0, t = 0;
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
    async function r(m) {
      window.clearTimeout(w), w = window.setTimeout(async () => {
        y.value = ie(le(m), i.value), await $e(), T();
      }, o.renderDelay);
    }
    async function T() {
      var h, k, f, $, v, P;
      for (const C of Array.from(((h = d.value) == null ? void 0 : h.querySelectorAll("td")) ?? []))
        /^-?[\d,.]+%?$/u.test(((k = C.textContent) == null ? void 0 : k.trim()) ?? "") && (C.dataset.numeric = "true");
      for (const C of Array.from(((f = d.value) == null ? void 0 : f.querySelectorAll("img")) ?? []))
        C.addEventListener("error", () => {
          C.alt = C.alt || "图片加载失败", C.classList.add("is-load-error");
        }, { once: !0 });
      H();
      for (const [C, A] of Array.from((($ = d.value) == null ? void 0 : $.querySelectorAll(".markdown-code-shell")) ?? []).entries()) {
        A.dataset.codeIndex = String(C), A.classList.contains("is-collapsible") && a.has(C) && A.classList.remove("is-collapsed");
        for (const q of Array.from(A.querySelectorAll('[data-markdown-action="toggle-code"]')))
          q.setAttribute("aria-expanded", String(!A.classList.contains("is-collapsed")));
        const O = A.querySelector("pre"), z = A.querySelector('[data-markdown-action="wrap-code"]');
        O && z && (z.hidden = O.scrollWidth <= O.clientWidth + 2, z.setAttribute("aria-pressed", String(A.classList.contains("is-wrapped"))));
      }
      await j();
      const m = Array.from(((v = d.value) == null ? void 0 : v.querySelectorAll('pre code[class*="language-"]')) ?? []);
      if (m.length === 0) return;
      const b = (await import("highlight.js/lib/core")).default;
      for (const C of m) {
        const A = ((P = Array.from(C.classList).find((q) => q.startsWith("language-"))) == null ? void 0 : P.slice(9)) ?? "", O = n[A];
        if (!O || C.dataset.highlighted === "yes") continue;
        const z = await O();
        b.getLanguage(A) || b.registerLanguage(A, z.default), C.innerHTML = b.highlight(C.textContent ?? "", { language: A }).value, C.dataset.highlighted = "yes";
      }
    }
    function H() {
      var b;
      if (!o.resolveAssetUrl) return;
      const m = /\.(?:svg|png|jpe?g|gif|webp)(?:[?#].*)?$/iu;
      for (const h of Array.from(((b = d.value) == null ? void 0 : b.querySelectorAll("a[href]")) ?? [])) {
        const k = h.getAttribute("href") ?? "";
        if (!m.test(k) || /^(?:data|blob):/iu.test(k)) continue;
        const f = o.resolveAssetUrl(k);
        f && (h.href = f, h.target = "_blank", h.rel = "noopener noreferrer");
      }
    }
    async function j() {
      var b, h, k, f;
      const m = Array.from(((b = d.value) == null ? void 0 : b.querySelectorAll(".markdown-diagram-shell:not([data-rendered])")) ?? []);
      for (const $ of m) {
        $.dataset.rendered = "loading";
        const v = $.dataset.diagramEngine === "plantuml" ? "plantuml" : "mermaid", P = ((h = $.querySelector("code")) == null ? void 0 : h.textContent) ?? "", C = $.querySelector(".markdown-diagram-stage");
        if (C)
          try {
            let A = await ((k = o.renderDiagram) == null ? void 0 : k.call(o, { engine: v, source: P, dark: o.dark }));
            if (!A && v === "mermaid") {
              const { default: O } = await import("mermaid");
              O.initialize({ startOnLoad: !1, securityLevel: "strict", theme: o.dark ? "dark" : "default", htmlLabels: !1, flowchart: { htmlLabels: !1, useMaxWidth: !1 } }), A = (await O.render(`cody-diagram-${String(++t)}`, P)).svg;
            }
            if (!A) throw new Error(v === "plantuml" ? "当前环境未配置 PlantUML 渲染器" : "图表渲染失败");
            C.innerHTML = Q(A), ke(C), $.dataset.rendered = "yes", $.style.setProperty("--diagram-scale", "1");
          } catch (A) {
            C.textContent = A instanceof Error ? A.message : "图表渲染失败", C.classList.add("markdown-diagram-error"), (f = $.querySelector(".markdown-diagram-source")) == null || f.removeAttribute("hidden"), $.dataset.rendered = "error";
          }
      }
    }
    function Q(m) {
      const b = ue.sanitize(m, { USE_PROFILES: { svg: !0, svgFilters: !0, html: !0 }, ADD_TAGS: ["foreignObject"], ADD_ATTR: ["xmlns"] }), h = b.trimStart().startsWith("<svg") ? b : `<svg xmlns="http://www.w3.org/2000/svg">${b}</svg>`, k = new DOMParser().parseFromString(h, "image/svg+xml");
      if (k.querySelector("parsererror")) return "";
      for (const f of k.querySelectorAll("*")) for (const $ of Array.from(f.attributes)) /^on/iu.test($.name) && f.removeAttribute($.name);
      return k.querySelectorAll("script").forEach((f) => f.remove()), new XMLSerializer().serializeToString(k.documentElement);
    }
    function ke(m) {
      if (m.dataset.panReady === "true") return;
      m.dataset.panReady = "true";
      let b = 0, h = 0, k = 0, f = 0;
      m.addEventListener("pointerdown", (v) => {
        v.button === 0 && (b = v.clientX, h = v.clientY, k = m.scrollLeft, f = m.scrollTop, m.setPointerCapture(v.pointerId), m.classList.add("is-panning"));
      }), m.addEventListener("pointermove", (v) => {
        m.hasPointerCapture(v.pointerId) && (m.scrollLeft = k - (v.clientX - b), m.scrollTop = f - (v.clientY - h));
      });
      const $ = (v) => {
        m.hasPointerCapture(v.pointerId) && m.releasePointerCapture(v.pointerId), m.classList.remove("is-panning");
      };
      m.addEventListener("pointerup", $), m.addEventListener("pointercancel", $);
    }
    function G(m, b = 0) {
      const h = Number(m.style.getPropertyValue("--diagram-scale") || "1");
      m.style.setProperty("--diagram-scale", String(b === 0 ? 1 : Math.min(2.5, Math.max(0.4, h + b))));
    }
    function Z(m, b) {
      const h = document.createElement("a");
      h.href = URL.createObjectURL(m), h.download = b, h.click(), URL.revokeObjectURL(h.href);
    }
    async function J(m, b) {
      const h = b.textContent;
      try {
        await navigator.clipboard.writeText(m), b.textContent = "已复制";
      } catch {
        const k = document.createElement("textarea");
        k.value = m, k.style.position = "fixed", k.style.opacity = "0", document.body.appendChild(k), k.select();
        const f = document.execCommand("copy");
        k.remove(), b.textContent = f ? "已复制" : "复制失败";
      }
      window.setTimeout(() => {
        b.textContent = h;
      }, 1200);
    }
    function ye(m) {
      return Array.from((m == null ? void 0 : m.rows) ?? []).map((b) => Array.from(b.cells).map((h) => {
        var k;
        return `"${((k = h.textContent) == null ? void 0 : k.trim().replace(/"/gu, '""')) ?? ""}"`;
      }).join(",")).join(`
`);
    }
    function ve(m) {
      var P, C, A, O, z;
      const b = m.target, h = b.closest("img");
      if (h) {
        g.value = h.currentSrc || h.src, (P = S.value) == null || P.showModal();
        return;
      }
      const k = b.closest("[data-markdown-action]");
      if (!k) return;
      const f = k.closest(".markdown-code-shell, .markdown-table-shell"), $ = k.dataset.markdownAction;
      if ($ === "copy-code" && J(((C = f == null ? void 0 : f.querySelector("code")) == null ? void 0 : C.textContent) ?? "", k), $ === "wrap-code") {
        const q = (f == null ? void 0 : f.classList.toggle("is-wrapped")) ?? !1;
        k.textContent = q && i.value.scroll || i.value.wrap, k.setAttribute("aria-pressed", String(q));
      }
      if ($ === "save-code" && Z(new Blob([((A = f == null ? void 0 : f.querySelector("code")) == null ? void 0 : A.textContent) ?? ""], { type: "text/plain" }), `snippet.${(f == null ? void 0 : f.dataset.language) || "txt"}`), $ === "toggle-code" && (f != null && f.classList.contains("is-collapsible"))) {
        const q = Number(f.dataset.codeIndex ?? -1), B = !f.classList.toggle("is-collapsed");
        q >= 0 && (B ? a.add(q) : a.delete(q));
        for (const X of Array.from(f.querySelectorAll('[data-markdown-action="toggle-code"]'))) X.setAttribute("aria-expanded", String(B));
      }
      if ($ === "copy-table" && J(ye((f == null ? void 0 : f.querySelector("table")) ?? null), k), $ === "open-file") {
        const q = k.dataset.filePath ?? "", B = ((O = o.cwd) == null ? void 0 : O.replace(/\/$/u, "")) ?? "", X = q.startsWith("/") && B && q.startsWith(`${B}/`) ? q.slice(B.length + 1) : q.replace(/^\.\//u, "");
        l("openFile", { path: X, line: Number(k.dataset.fileLine || 0) || 1 });
      }
      const v = k.closest(".markdown-diagram-shell");
      if (v && $ === "diagram-zoom-in" && G(v, 0.2), v && $ === "diagram-zoom-out" && G(v, -0.2), v && $ === "diagram-fit" && G(v), v && $ === "diagram-source") {
        const q = v.querySelector(".markdown-diagram-source");
        q && (q.hidden = !q.hidden);
      }
      if (v && $ === "diagram-fullscreen" && ((z = v.requestFullscreen) == null || z.call(v)), v && $ === "diagram-export-svg") {
        const q = v.querySelector("svg");
        q && Z(new Blob([new XMLSerializer().serializeToString(q)], { type: "image/svg+xml" }), "diagram.svg");
      }
    }
    function ee() {
      var m;
      (m = S.value) == null || m.close();
    }
    return de(() => [o.text, o.labels], ([m]) => {
      r(m);
    }, { deep: !0 }), be(() => {
      T();
    }), he(() => window.clearTimeout(w)), (m, b) => (c(), u(I, null, [
      p("div", {
        ref_key: "rootRef",
        ref: d,
        class: "cody-markdown cody-markdown-renderer",
        innerHTML: y.value,
        onClick: ve
      }, null, 8, ze),
      p("dialog", {
        ref_key: "imageDialogRef",
        ref: S,
        class: "cody-markdown-image-dialog",
        onClick: ee
      }, [
        p("button", {
          type: "button",
          "aria-label": "关闭图片预览",
          onClick: ee
        }, "×"),
        p("img", {
          src: g.value,
          alt: "Markdown 图片预览"
        }, null, 8, Ee)
      ], 512)
    ], 64));
  }
});
function ge(e) {
  if (!e || typeof e != "object") return [];
  const s = e;
  return (Array.isArray(s.questions) ? s.questions : []).flatMap((l, i) => {
    if (!l || typeof l != "object") return [];
    const d = l, S = typeof d.question == "string" ? d.question.trim() : "";
    if (!S) return [];
    const y = Array.isArray(d.options) ? d.options : [];
    return [{
      id: typeof d.id == "string" && d.id.trim() ? d.id.trim() : `question-${String(i + 1)}`,
      header: typeof d.header == "string" ? d.header.trim() : "",
      question: S,
      isOther: d.isOther === !0,
      isSecret: d.isSecret === !0,
      options: y.flatMap((g) => {
        if (!g || typeof g != "object") return [];
        const a = g, w = typeof a.label == "string" ? a.label.trim() : "";
        return w ? [{ label: w, description: typeof a.description == "string" ? a.description.trim() : "" }] : [];
      })
    }];
  });
}
function je(e) {
  var l;
  if (!e || typeof e != "object") return "Codex 请求执行一项受保护操作。";
  const s = e, o = s.reason ?? s.question ?? s.command;
  return typeof o == "string" && o.trim() ? o : ((l = ge(e)[0]) == null ? void 0 : l.question) ?? "Codex 请求执行一项受保护操作。";
}
function Pt(e) {
  var g, a, w;
  const s = [], o = /* @__PURE__ */ new Set(), l = new Map(e.messages.map((t) => [t.id, t])), i = new Map(e.timeline.map((t) => [t.id, t])), d = (t) => {
    if (t.kind === "reasoning") {
      s.push({ id: t.id, kind: "reasoning", text: t.text }), o.add(t.id);
      return;
    }
    if (!t.tool.summary && t.tool.details.length === 0 && !t.tool.output && t.tool.kind !== "fileChange") return;
    if (t.tool.kind !== "fileChange") {
      s.push({ id: t.id, kind: "tool", tool: t.tool }), o.add(t.id);
      return;
    }
    const n = `file-group:${t.turnId ?? t.id}`, r = s.at(-1);
    if (!r || r.kind !== "tool" || r.id !== n) {
      const j = [...new Set(t.tool.details)], Q = {
        id: n,
        kind: "tool",
        tool: {
          ...t.tool,
          title: j.length > 1 ? `文件变更 · ${String(j.length)} 个文件` : "文件变更",
          summary: j.length ? `${String(j.length)} 个文件已更新` : t.tool.summary,
          details: j
        }
      };
      s.push(Q), o.add(t.id);
      return;
    }
    const T = [.../* @__PURE__ */ new Set([...r.tool.details, ...t.tool.details])], H = [r.tool.output, t.tool.output].filter(Boolean).join(`

`);
    r.tool = {
      ...r.tool,
      status: /fail|error|cancel|reject/iu.test(`${r.tool.status} ${t.tool.status}`) ? "failed" : t.tool.status,
      title: T.length > 1 ? `文件变更 · ${String(T.length)} 个文件` : "文件变更",
      summary: T.length ? `${String(T.length)} 个文件已更新` : t.tool.summary,
      details: T,
      ...H ? { output: H } : {}
    }, o.add(t.id);
  };
  for (const t of e.presentation ?? [])
    if (t.kind === "message") {
      const n = l.get(t.id);
      n && (s.push({ id: n.id, kind: "message", message: n }), o.add(n.id));
    } else if (t.kind === "timeline") {
      const n = i.get(t.id);
      n && d(n);
    } else if (t.kind === "plan")
      (g = e.plan) != null && g.text && (!t.turnId || t.turnId === e.plan.turnId) && (s.push({ id: t.id, kind: "plan", text: e.plan.text }), o.add(t.id));
    else if (t.kind === "request") {
      const n = e.pendingRequests.find((r) => `request:${r.id}` === t.id);
      n && (s.push({ id: t.id, kind: "request", request: n }), o.add(t.id));
    } else if (t.kind === "failure") {
      const n = t.turnId ? e.turns[t.turnId] : void 0;
      n != null && n.error && (s.push({ id: t.id, kind: "failure", text: n.error }), o.add(t.id));
    } else if (t.kind === "interrupted")
      s.push({ id: t.id, kind: "interrupted", text: "本次回复已停止" }), o.add(t.id);
    else if (t.kind === "worked") {
      const n = t.turnId ? e.turns[t.turnId] : void 0;
      if (n != null && n.completedAtIso) {
        const r = n.startedAtIso ? Date.parse(n.completedAtIso) - Date.parse(n.startedAtIso) : 0;
        s.push({ id: t.id, kind: "worked", label: `Worked for ${Ie(r)}` }), o.add(t.id);
      }
    }
  for (const t of e.messages) o.has(t.id) || s.push({ id: t.id, kind: "message", message: t });
  for (const t of e.timeline) o.has(t.id) || d(t);
  const S = `plan:${((a = e.plan) == null ? void 0 : a.turnId) || "current"}`;
  (w = e.plan) != null && w.text && !o.has(S) && s.push({ id: S, kind: "plan", text: e.plan.text });
  for (const t of e.pendingRequests) o.has(`request:${t.id}`) || s.push({ id: `request:${t.id}`, kind: "request", request: t });
  for (const t of Object.values(e.turns))
    t.lifecycle === "failed" && t.error && !o.has(`failure:${t.id}`) && s.push({ id: `failure:${t.id}`, kind: "failure", text: t.error }), t.lifecycle === "interrupted" && !o.has(`interrupted:${t.id}`) && s.push({ id: `interrupted:${t.id}`, kind: "interrupted", text: "本次回复已停止" });
  const y = e.activeTurnId ? e.turns[e.activeTurnId] : void 0;
  if (y) {
    const t = e.pendingRequests.find((n) => !n.turnId || n.turnId === y.id);
    t ? s.push({
      id: `activity:${y.id}`,
      kind: "activity",
      title: t.kind === "approval" ? "等待你的审批" : "等待你的回答",
      detail: "处理后 Codex 会继续本次回复",
      tone: "waiting"
    }) : y.lifecycle === "retrying" ? s.push({
      id: `activity:${y.id}`,
      kind: "activity",
      title: y.retryMessage || "Codex 正在重新连接",
      detail: e.connection.status === "disconnected" ? "连接已中断，等待恢复" : "正在恢复本次回复",
      tone: "retrying"
    }) : y.lifecycle === "running" && s.push({
      id: `activity:${y.id}`,
      kind: "activity",
      title: "Codex 正在工作",
      detail: e.connection.status === "connected" ? "实时更新中" : "等待恢复连接",
      tone: "running"
    });
  }
  return s;
}
const Ue = ["data-kind"], Be = { class: "cody-request-heading" }, Fe = { key: 0 }, Ve = {
  key: 0,
  class: "cody-question-options"
}, _e = ["onClick"], Ne = { key: 0 }, We = ["onUpdate:modelValue", "type", "placeholder"], He = { class: "cody-request-actions" }, Qe = ["disabled"], Ge = {
  key: 0,
  class: "cody-request-actions"
}, Xe = /* @__PURE__ */ N({
  __name: "CodyRequestCard",
  props: {
    request: {}
  },
  emits: ["resolveApproval", "resolveQuestion"],
  setup(e, { emit: s }) {
    const o = e, l = s, i = we({}), d = U(() => ge(o.request.params)), S = U(() => je(o.request.params)), y = U(() => d.value.length > 0 && d.value.every((a) => {
      var w;
      return !!((w = i[a.id]) != null && w.trim());
    }));
    de(() => o.request.id, () => {
      for (const a of Object.keys(i)) delete i[a];
    });
    function g() {
      y.value && l("resolveQuestion", o.request.id, Object.fromEntries(d.value.map((a) => [a.id, { answers: [i[a.id].trim()] }])));
    }
    return (a, w) => (c(), u("article", {
      class: "cody-request-card",
      "data-kind": e.request.kind
    }, [
      p("div", Be, [
        p("strong", null, x(e.request.kind === "approval" ? "需要你的确认" : "Codex 需要补充信息"), 1),
        w[2] || (w[2] = p("small", null, "Agent 已暂停等待", -1))
      ]),
      e.request.kind === "question" && d.value.length ? (c(), u(I, { key: 0 }, [
        (c(!0), u(I, null, E(d.value, (t) => (c(), u("fieldset", {
          key: t.id,
          class: "cody-question-field"
        }, [
          p("legend", null, [
            t.header ? (c(), u("span", Fe, x(t.header), 1)) : L("", !0),
            Y(x(t.question), 1)
          ]),
          t.options.length ? (c(), u("div", Ve, [
            (c(!0), u(I, null, E(t.options, (n) => (c(), u("button", {
              key: n.label,
              type: "button",
              class: Se({ selected: i[t.id] === n.label }),
              onClick: (r) => i[t.id] = n.label
            }, [
              p("strong", null, x(n.label), 1),
              n.description ? (c(), u("small", Ne, x(n.description), 1)) : L("", !0)
            ], 10, _e))), 128))
          ])) : L("", !0),
          t.options.length === 0 || t.isOther ? Ce((c(), u("input", {
            key: 1,
            "onUpdate:modelValue": (n) => i[t.id] = n,
            type: t.isSecret ? "password" : "text",
            placeholder: t.options.length ? "其他回答…" : "输入回答…",
            onKeyup: ce(g, ["enter"])
          }, null, 40, We)), [
            [xe, i[t.id]]
          ]) : L("", !0)
        ]))), 128)),
        p("div", He, [
          p("button", {
            type: "button",
            disabled: !y.value,
            onClick: g
          }, "提交回答", 8, Qe)
        ])
      ], 64)) : (c(), u(I, { key: 1 }, [
        p("p", null, x(S.value), 1),
        e.request.kind === "approval" ? (c(), u("div", Ge, [
          p("button", {
            type: "button",
            onClick: w[0] || (w[0] = (t) => l("resolveApproval", e.request.id, "accept"))
          }, "允许一次"),
          p("button", {
            type: "button",
            "data-tone": "danger",
            onClick: w[1] || (w[1] = (t) => l("resolveApproval", e.request.id, "decline"))
          }, "拒绝")
        ])) : L("", !0)
      ], 64))
    ], 8, Ue));
  }
}), Ke = ["data-variant"], Ye = {
  key: 0,
  class: "cody-conversation-loading",
  role: "status"
}, Ze = {
  key: 1,
  class: "cody-conversation-empty"
}, Je = {
  key: 0,
  class: "cody-worked-divider"
}, et = ["data-role"], tt = ["data-role"], ot = { class: "cody-message-stack" }, nt = { class: "cody-message-label" }, st = {
  key: 0,
  class: "cody-message-skills"
}, at = {
  key: 1,
  class: "cody-message-body"
}, it = {
  key: 2,
  class: "cody-message-images"
}, lt = ["src"], rt = ["onClick"], dt = ["data-tone", "open"], ct = { key: 0 }, ut = ["onClick"], mt = {
  key: 3,
  class: "cody-reasoning-card"
}, pt = {
  key: 4,
  class: "cody-plan-card",
  open: ""
}, ft = {
  key: 6,
  class: "cody-failure-card"
}, gt = {
  key: 7,
  class: "cody-interrupted-card",
  role: "status"
}, kt = ["data-tone"], zt = /* @__PURE__ */ N({
  __name: "CodyConversation",
  props: {
    entries: {},
    loading: { type: Boolean },
    variant: { default: "standalone" }
  },
  emits: ["copy", "openFile", "resolveApproval", "resolveQuestion"],
  setup(e, { emit: s }) {
    const o = s, l = V({});
    function i(y) {
      l.value = {
        ...l.value,
        [y]: l.value[y] !== !0
      };
    }
    function d(y, g) {
      o("resolveApproval", y, g);
    }
    function S(y, g) {
      o("resolveQuestion", y, g);
    }
    return (y, g) => (c(), u("section", {
      class: "cody-conversation",
      "data-variant": e.variant,
      "data-cody-component": "conversation-surface"
    }, [
      e.loading ? (c(), u("div", Ye, "正在同步对话…")) : e.entries.length === 0 ? (c(), u("div", Ze, [
        _(y.$slots, "empty", {}, () => [
          g[2] || (g[2] = Y("开始这个需求的开发", -1))
        ])
      ])) : (c(!0), u(I, { key: 2 }, E(e.entries, (a) => {
        var w, t;
        return c(), u(I, {
          key: a.id
        }, [
          a.kind === "worked" ? (c(), u("div", Je, [
            p("span", null, x(a.label), 1)
          ])) : a.kind === "message" ? (c(), u("article", {
            key: 1,
            class: "cody-message",
            "data-role": a.message.role
          }, [
            p("div", {
              class: "cody-message-identity",
              "data-role": a.message.role
            }, x(a.message.role === "user" ? "你" : "CW"), 9, tt),
            p("div", ot, [
              p("div", nt, x(a.message.role === "user" ? "你" : a.message.role === "assistant" ? "Codex Agent" : "系统"), 1),
              (w = a.message.skills) != null && w.length ? (c(), u("ul", st, [
                (c(!0), u(I, null, E(a.message.skills, (n) => (c(), u("li", {
                  key: `${n.name}:${n.path}`
                }, "$" + x(n.displayName || n.name), 1))), 128))
              ])) : L("", !0),
              a.message.text ? (c(), u("div", at, [
                _(y.$slots, "markdown", {
                  message: a.message
                }, () => [
                  F(re, {
                    text: a.message.text,
                    onOpenFile: g[0] || (g[0] = (n) => o("openFile", n))
                  }, null, 8, ["text"])
                ])
              ])) : L("", !0),
              (t = a.message.images) != null && t.length ? (c(), u("div", it, [
                (c(!0), u(I, null, E(a.message.images, (n) => (c(), u("img", {
                  key: n,
                  src: n,
                  alt: "对话图片",
                  loading: "lazy"
                }, null, 8, lt))), 128))
              ])) : L("", !0),
              a.message.text ? (c(), u("button", {
                key: 3,
                class: "cody-copy-button",
                type: "button",
                onClick: (n) => o("copy", a.message.text)
              }, "复制", 8, rt)) : L("", !0)
            ])
          ], 8, et)) : a.kind === "tool" ? (c(), u("details", {
            key: 2,
            class: "cody-tool-card",
            "data-tone": D(ne)(a.tool.status),
            open: D(ne)(a.tool.status) === "working"
          }, [
            p("summary", null, [
              g[3] || (g[3] = p("span", null, "⌁", -1)),
              p("strong", null, x(a.tool.title), 1),
              p("small", null, x(a.tool.status), 1)
            ]),
            p("p", null, x(a.tool.summary), 1),
            a.tool.details.length ? (c(), u("ul", ct, [
              (c(!0), u(I, null, E(a.tool.details, (n) => (c(), u("li", { key: n }, x(n), 1))), 128))
            ])) : L("", !0),
            a.tool.output ? (c(), u(I, { key: 1 }, [
              p("pre", null, x(l.value[a.id] ? a.tool.output : D(De)(a.tool.output)), 1),
              D(Re)(a.tool.output) ? (c(), u("button", {
                key: 0,
                class: "cody-tool-output-toggle",
                type: "button",
                onClick: (n) => i(a.id)
              }, x(D(Pe)(l.value[a.id] === !0)), 9, ut)) : L("", !0)
            ], 64)) : L("", !0)
          ], 8, dt)) : a.kind === "reasoning" ? (c(), u("details", mt, [
            p("summary", null, "✦ " + x(a.title || "推理过程"), 1),
            p("pre", null, x(a.text), 1)
          ])) : a.kind === "plan" ? (c(), u("details", pt, [
            g[4] || (g[4] = p("summary", null, "计划", -1)),
            F(re, {
              text: a.text,
              onOpenFile: g[1] || (g[1] = (n) => o("openFile", n))
            }, null, 8, ["text"])
          ])) : a.kind === "request" ? _(y.$slots, "request", {
            request: a.request
          }, () => [
            F(Xe, {
              request: a.request,
              onResolveApproval: d,
              onResolveQuestion: S
            }, null, 8, ["request"])
          ], void 0, 5) : a.kind === "failure" ? (c(), u("details", ft, [
            g[5] || (g[5] = p("summary", null, "本次回复失败", -1)),
            p("p", null, x(a.text), 1)
          ])) : a.kind === "interrupted" ? (c(), u("article", gt, x(a.text), 1)) : a.kind === "activity" ? (c(), u("article", {
            key: 8,
            class: "cody-conversation-activity",
            "data-tone": a.tone,
            role: "status",
            "aria-live": "polite"
          }, [
            g[6] || (g[6] = p("span", {
              class: "cody-activity-pulse",
              "aria-hidden": "true"
            }, null, -1)),
            p("strong", null, x(a.title), 1),
            p("small", null, x(a.detail), 1)
          ], 8, kt)) : L("", !0)
        ], 64);
      }), 128))
    ], 8, Ke));
  }
}), yt = ["data-variant"], vt = { class: "cody-composer-shell" }, bt = {
  key: 0,
  class: "cody-composer-selected",
  "aria-label": "Selected skills"
}, ht = ["disabled", "aria-label", "onClick"], $t = ["value", "disabled", "placeholder"], wt = { class: "cody-composer-controls" }, St = {
  key: 0,
  class: "cody-composer-compact-control cody-composer-skill-control",
  title: "为本轮显式选择 Skill"
}, Ct = ["disabled"], xt = ["value"], At = { class: "cody-composer-actions" }, qt = ["disabled"], Lt = ["disabled", "aria-label"], Tt = {
  key: 1,
  class: "cody-composer-policy"
}, Et = /* @__PURE__ */ N({
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
  setup(e, { emit: s }) {
    const o = N({
      name: "CodyComposerSelect",
      props: { label: { type: String, required: !0 }, modelValue: { type: String, required: !0 }, options: { type: Array, required: !0 }, disabled: Boolean },
      emits: ["update:modelValue"],
      setup(t, { emit: n }) {
        return () => K("label", { class: "cody-composer-compact-control", title: t.label }, [
          K("select", { value: t.modelValue, disabled: t.disabled, "aria-label": t.label, onChange: (r) => n("update:modelValue", r.target.value) }, t.options.map((r) => K("option", { value: r.value }, r.label)))
        ]);
      }
    }), l = e, i = s, d = U(() => l.skills.filter((t) => !l.selectedSkills.includes(t.value))), S = U(() => {
      var t;
      return ((t = l.permissionOptions.find((n) => n.value === l.selectedPermission)) == null ? void 0 : t.description) ?? "";
    }), y = U(() => l.isRunning && l.selectedSubmitMode === "guide" ? "发送引导" : l.isRunning ? "加入队列" : "发送");
    function g(t, n) {
      var r;
      return ((r = t.find((T) => T.value === n)) == null ? void 0 : r.label) ?? n;
    }
    function a(t) {
      t && !l.selectedSkills.includes(t) && i("update:selected-skills", [...l.selectedSkills, t]);
    }
    function w(t) {
      i("update:selected-skills", l.selectedSkills.filter((n) => n !== t));
    }
    return (t, n) => (c(), u("form", {
      class: "cody-composer",
      "data-variant": e.variant,
      "data-cody-component": "composer-surface",
      onSubmit: n[9] || (n[9] = te((r) => i("send"), ["prevent"]))
    }, [
      p("div", vt, [
        e.selectedSkills.length ? (c(), u("div", bt, [
          (c(!0), u(I, null, E(e.selectedSkills, (r) => (c(), u("span", {
            key: r,
            class: "cody-composer-chip"
          }, [
            Y(" $" + x(g(e.skills, r)) + " ", 1),
            p("button", {
              type: "button",
              disabled: e.disabled,
              "aria-label": `移除 Skill ${g(e.skills, r)}`,
              onClick: (T) => w(r)
            }, "×", 8, ht)
          ]))), 128))
        ])) : L("", !0),
        p("textarea", {
          value: e.draft,
          rows: "1",
          disabled: e.disabled,
          placeholder: e.placeholder,
          onInput: n[0] || (n[0] = (r) => i("update:draft", r.target.value)),
          onKeydown: n[1] || (n[1] = ce(te((r) => i("send"), ["exact", "prevent"]), ["enter"]))
        }, null, 40, $t),
        p("div", wt, [
          _(t.$slots, "leading"),
          e.skills.length ? (c(), u("label", St, [
            n[11] || (n[11] = p("span", {
              class: "cody-composer-icon",
              "aria-hidden": "true"
            }, "✦", -1)),
            p("select", {
              value: "",
              disabled: e.disabled,
              "aria-label": "添加 Skill",
              onChange: n[2] || (n[2] = (r) => a(r.target.value))
            }, [
              n[10] || (n[10] = p("option", { value: "" }, "Skills", -1)),
              (c(!0), u(I, null, E(d.value, (r) => (c(), u("option", {
                key: r.value,
                value: r.value
              }, "$" + x(r.label), 9, xt))), 128))
            ], 40, Ct)
          ])) : L("", !0),
          e.collaborationModes.length ? (c(), oe(D(o), {
            key: 1,
            label: "协作模式",
            "model-value": e.selectedCollaborationMode,
            options: e.collaborationModes,
            disabled: e.disabled || e.isRunning,
            "onUpdate:modelValue": n[3] || (n[3] = (r) => i("update:collaboration-mode", r))
          }, null, 8, ["model-value", "options", "disabled"])) : L("", !0),
          F(D(o), {
            label: "提交策略",
            "model-value": e.selectedSubmitMode,
            options: e.submitModes,
            disabled: e.disabled,
            "onUpdate:modelValue": n[4] || (n[4] = (r) => i("update:submit-mode", r))
          }, null, 8, ["model-value", "options", "disabled"]),
          e.models.length ? (c(), oe(D(o), {
            key: 2,
            label: "模型",
            "model-value": e.selectedModel,
            options: e.models,
            disabled: e.disabled || e.isRunning,
            "onUpdate:modelValue": n[5] || (n[5] = (r) => i("update:model", r))
          }, null, 8, ["model-value", "options", "disabled"])) : L("", !0),
          F(D(o), {
            label: "推理强度",
            "model-value": e.selectedReasoning,
            options: e.reasoningOptions,
            disabled: e.disabled || e.isRunning,
            "onUpdate:modelValue": n[6] || (n[6] = (r) => i("update:reasoning", r))
          }, null, 8, ["model-value", "options", "disabled"]),
          F(D(o), {
            label: "权限",
            "model-value": e.selectedPermission,
            options: e.permissionOptions,
            disabled: e.disabled || e.isRunning,
            "onUpdate:modelValue": n[7] || (n[7] = (r) => i("update:permission", r))
          }, null, 8, ["model-value", "options", "disabled"]),
          _(t.$slots, "controls"),
          p("div", At, [
            e.isRunning ? (c(), u("button", {
              key: 0,
              class: "cody-composer-stop",
              type: "button",
              disabled: e.disabled,
              onClick: n[8] || (n[8] = (r) => i("stop"))
            }, "停止", 8, qt)) : L("", !0),
            p("button", {
              class: "cody-composer-send",
              type: "submit",
              disabled: e.disabled || !e.draft.trim(),
              "aria-label": y.value
            }, "↑", 8, Lt)
          ])
        ]),
        S.value ? (c(), u("p", Tt, x(S.value), 1)) : L("", !0)
      ])
    ], 40, yt));
  }
});
export {
  Et as CodyComposer,
  zt as CodyConversation,
  re as CodyMarkdown,
  Xe as CodyRequestCard,
  W as DEFAULT_CODY_MARKDOWN_LABELS,
  Pt as conversationEntriesFromState,
  ge as questionFieldsFromParams,
  ie as renderCodyMarkdown,
  je as requestSummary,
  le as stabilizeStreamingMarkdown
};
